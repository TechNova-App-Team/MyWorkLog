// Misst LCP/FCP/DCL im headless Chrome per CDP — der Automations-Tab ist meist
// hidden und malt nicht, deshalb hier ein eigener Browser.
// Aufruf: node lcp-measure.mjs <url> [runs] [throttle:none|4g|3g]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:5001/';
const runs = parseInt(process.argv[3] || '3', 10);
const throttle = process.argv[4] || 'none';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;
const profile = mkdtempSync(join(tmpdir(), 'mwl-lcp-'));

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--window-size=1400,900', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('chrome kam nicht hoch');
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method).forEach(h => h(m.params)); }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
  on(method, h) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(h); }
}

const INIT = `
(function(){
  try { if (!localStorage.getItem('pro_intro_seen')) localStorage.setItem('pro_intro_seen','true'); localStorage.setItem('dismissedLocalhostWarning','1'); } catch(e){}
  window.__perf = { lcp: [], lt: [], tl: [] };
  (function tick(){ var el=document.getElementById('valTotal'); if(el){ var last=window.__perf.tl[window.__perf.tl.length-1]; var cur={t:Math.round(performance.now()),txt:el.textContent.trim(),cls:el.className,w:Math.round(el.getBoundingClientRect().width)}; if(!last||last.txt!==cur.txt||last.cls!==cur.cls||last.w!==cur.w) window.__perf.tl.push(cur);} if(performance.now()<4000) requestAnimationFrame(tick); })();
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lcp.push({ t: Math.round(e.startTime), size: e.size, el: e.element ? (e.element.tagName + '#' + e.element.id + '.' + (e.element.className||'')) : null, url: e.url, text: e.element ? (e.element.textContent||'').trim().slice(0,30) : '' }); }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__perf.lt.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
  } catch(e) { window.__perf.err = String(e); }
})();`;

const REPORT = `
(function(){
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const paint = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, Math.round(p.startTime)]));
  const res = performance.getEntriesByType('resource').map(r => ({ n: r.name.replace(location.origin, ''), s: Math.round(r.startTime), e: Math.round(r.responseEnd), size: r.transferSize, enc: r.encodedBodySize, type: r.initiatorType, rb: r.renderBlockingStatus, sw: r.workerStart > 0 }));
  const scripts = res.filter(r => r.type === 'script');
  return JSON.stringify({
    lcp: window.__perf.lcp, longtasks: window.__perf.lt, paint, tl: window.__perf.tl, fonts: res.filter(r=>/gstatic|googleapis/.test(r.n)).map(r=>[r.n.replace('https://fonts.','').slice(0,40), r.s, r.e]),
    nav: { ttfb: Math.round(nav.responseStart), respEnd: Math.round(nav.responseEnd), domInt: Math.round(nav.domInteractive), dcl: Math.round(nav.domContentLoadedEventStart), dclEnd: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), enc: nav.encodedBodySize, dec: nav.decodedBodySize },
    blockingCssEnd: Math.max(0, ...res.filter(r => r.rb === 'blocking').map(r => r.e)),
    scriptsEnd: Math.max(0, ...scripts.map(r => r.e)), scriptCount: scripts.length, scriptBytes: scripts.reduce((a, r) => a + (r.enc||0), 0),
    lastScripts: scripts.sort((a, b) => b.e - a.e).slice(0, 5).map(r => [r.n.slice(0, 50), r.s, r.e]),
    fromSW: res.filter(r => r.sw).length, resCount: res.length,
    swCtrl: !!navigator.serviceWorker.controller,
    hidden: document.hidden, view: document.querySelector('.view-section.active')?.id
  });
})()`;

await waitPort();
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
const cdp = new CDP(ws);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Network.enable');
if (throttle !== 'none') {
  const cond = throttle === '3g'
    ? { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 }
    : { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 };
  await cdp.send('Network.emulateNetworkConditions', cond);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle === '3g' ? 4 : 2 });
}
if (process.argv[5] === 'nofonts') await cdp.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: INIT });

for (let i = 0; i < runs; i++) {
  const loaded = new Promise(r => { const h = () => r(); cdp.on('Page.loadEventFired', h); });
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(3000);
  const { result } = await cdp.send('Runtime.evaluate', { expression: REPORT, returnByValue: true });
  const rep = JSON.parse(result.value);
  console.log(`\n=== Lauf ${i + 1} (${i === 0 ? 'kalt, ohne SW' : 'warm, SW aktiv'}; throttle=${throttle}) ===`);
  console.log('nav      ', JSON.stringify(rep.nav));
  console.log('paint    ', JSON.stringify(rep.paint), 'blockingCssEnd', rep.blockingCssEnd, 'scriptsEnd', rep.scriptsEnd, `(${rep.scriptCount} Skripte, ${Math.round(rep.scriptBytes/1024)} KB)`);
  console.log('SW-ctrl  ', rep.swCtrl, 'fromSW', rep.fromSW, '/', rep.resCount, 'hidden', rep.hidden, 'view', rep.view);
  console.log('lastScr  ', JSON.stringify(rep.lastScripts));
  console.log('longtasks', JSON.stringify(rep.longtasks));
  console.log('LCP      ', JSON.stringify(rep.lcp, null, 0));
  console.log('fonts    ', JSON.stringify(rep.fonts));
  console.log('valTotal ', JSON.stringify(rep.tl));
}

ws.close();
chrome.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
