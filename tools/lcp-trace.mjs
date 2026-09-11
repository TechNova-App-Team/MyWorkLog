// Zeichnet einen Chrome-Trace des zweiten (warmen) Ladens auf und listet, was
// den Hauptthread bis zum LCP beschaeftigt: Skripte nach Auswertungszeit, die
// Bloecke zwischen firstPaint und FCP, und — mit Stack — jeden erzwungenen
// Style-/Layout-Durchlauf (UpdateLayoutTree/Layout) samt Aufrufer. Genau so
// fielen die zwei 12-ms-Durchlaeufe in touch-mobile-optimizations.js auf.
// Der rohe Trace landet als lcp-trace-last.json im Temp-Ordner (chrome://tracing
// oder DevTools > Performance > Load).
// Aufruf: node tools/lcp-trace.mjs <url> [none|4g]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://localhost:5001/';
const throttle = process.argv[3] || 'none';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9334;
const profile = mkdtempSync(join(tmpdir(), 'mwl-trace-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--window-size=1400,900', '--no-first-run', '--disable-extensions', '--disable-background-networking', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await sleep(100); }

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method).forEach(h => h(m.params)); }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
  on(method, h) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(h); }
}
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Network.enable');
if (throttle === '4g') {
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10e6 / 8, uploadThroughput: 5e6 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });
}
await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: "try{if(!localStorage.getItem('pro_intro_seen'))localStorage.setItem('pro_intro_seen','true');localStorage.setItem('dismissedLocalhostWarning','1')}catch(e){}" });

// Lauf 1 nur zum Aufwaermen (SW installieren)
let loaded = new Promise(r => cdp.on('Page.loadEventFired', r));
await cdp.send('Page.navigate', { url }); await loaded; await sleep(2500);

const events = [];
cdp.on('Tracing.dataCollected', p => events.push(...p.value));
const done = new Promise(r => cdp.on('Tracing.tracingComplete', r));
await cdp.send('Tracing.start', { categories: 'devtools.timeline,loading,blink.user_timing,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.stack,disabled-by-default-devtools.timeline.invalidationTracking', transferMode: 'ReportEvents' });
loaded = new Promise(r => cdp.on('Page.loadEventFired', r));
await cdp.send('Page.navigate', { url }); await loaded; await sleep(2500);
await cdp.send('Tracing.end'); await done;
ws.close(); chrome.kill(); await sleep(300);
try { rmSync(profile, { recursive: true, force: true }); } catch {}

// Auswertung
const navStart = events.find(e => e.name === 'navigationStart' && e.args?.data?.isLoadingMainFrame !== false && e.args?.data?.documentLoaderURL === url) || events.filter(e => e.name === 'navigationStart').pop();
const t0 = navStart.ts;
const pid = navStart.pid, tid = navStart.tid;
const ms = ts => Math.round((ts - t0) / 100) / 10;
const marks = {};
for (const e of events) {
  if (e.pid !== pid) continue;
  if (['firstPaint', 'firstContentfulPaint', 'largestContentfulPaint::Candidate', 'domContentLoadedEventEnd', 'loadEventEnd', 'firstMeaningfulPaint'].includes(e.name) && e.ts >= t0) {
    const key = e.name === 'largestContentfulPaint::Candidate' ? `LCP(${e.args?.data?.size})` : e.name;
    marks[key] = ms(e.ts);
  }
}
console.log('Marken (ms ab navigationStart):', JSON.stringify(marks));

const lcpTs = Object.entries(marks).filter(([k]) => k.startsWith('LCP')).map(([, v]) => v).pop() || 9999;
const fcp = marks.firstContentfulPaint;
const compl = events.filter(e => e.pid === pid && e.tid === tid && e.ph === 'X' && e.ts >= t0 && (e.ts - t0) / 1000 <= lcpTs + 5 && e.dur);
const byName = {};
const scripts = {};
for (const e of compl) {
  const d = e.dur / 1000;
  const n = e.name;
  if (['EvaluateScript', 'v8.compile', 'FunctionCall', 'ParseHTML', 'UpdateLayoutTree', 'Layout', 'Paint', 'PrePaint', 'Layerize', 'ParseAuthorStyleSheet', 'CompileScript', 'v8.evaluateModule', 'RunTask', 'EventDispatch', 'TimerFire', 'ResourceReceivedData', 'UpdateLayerTree', 'HitTest', 'Commit'].includes(n)) {
    if (n === 'RunTask') continue;
    byName[n] = (byName[n] || 0) + d;
    if (n === 'EvaluateScript' || n === 'v8.compile' || n === 'FunctionCall') {
      const u = (e.args?.data?.url || e.args?.data?.fileName || '(inline)').replace(/^https?:\/\/[^/]+/, '').replace(/\?v=.*/, '');
      scripts[u] = (scripts[u] || 0) + d;
    }
  }
}
console.log(`\nHauptthread bis LCP (${lcpTs} ms), Selbstzeiten grob (verschachtelt, daher nicht additiv):`);
for (const [k, v] of Object.entries(byName).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(22)} ${v.toFixed(1)} ms`);
console.log('\nSkripte bis LCP (Auswertung + Aufrufe):');
for (const [k, v] of Object.entries(scripts).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${v.toFixed(1).padStart(7)} ms  ${k}`);

// Was passiert zwischen firstPaint und FCP?
const between = compl.filter(e => (e.ts - t0) / 1000 >= (marks.firstPaint || 0) && (e.ts - t0) / 1000 <= (fcp || 0) && e.dur > 2000 && !['RunTask'].includes(e.name));
console.log(`\nZwischen firstPaint (${marks.firstPaint}) und FCP (${fcp}) — Bloecke > 2 ms:`);
for (const e of between.sort((a, b) => a.ts - b.ts).slice(0, 25)) console.log(`  ${ms(e.ts).toString().padStart(7)}  ${(e.dur / 1000).toFixed(1).padStart(6)} ms  ${e.name}  ${(e.args?.data?.url || e.args?.data?.fileName || '').replace(/^https?:\/\/[^/]+/, '').replace(/\?v=.*/, '').slice(0, 60)}`);

// Erzwungene Style-/Layout-Durchlaeufe mit Aufrufer — braucht die Kategorie
// disabled-by-default-devtools.timeline.stack (oben gesetzt), sonst fehlt der Stack.
const u = s => (s.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/\?v=.*/, '');
console.log('\nErzwungene Style/Layout-Durchlaeufe >= 2,5 ms (mit Aufrufer):');
for (const e of events) {
  if (!['UpdateLayoutTree', 'Layout'].includes(e.name) || e.ph !== 'X' || e.dur < 2500 || e.ts < t0 || e.ts > t0 + 1e6) continue;
  const st = e.args?.beginData?.stackTrace || [];
  const wer = st.length ? st.slice(0, 3).map(f => `${u(f)}:${f.lineNumber} ${f.functionName}`).join('  <-  ') : '(Parser/Stylesheet)';
  console.log(`  ${String(ms(e.ts)).padStart(7)}  ${(e.dur / 1000).toFixed(1).padStart(6)} ms  ${e.name.padEnd(16)}  ${wer}`);
}

const tracePath = join(tmpdir(), 'lcp-trace-last.json');
writeFileSync(tracePath, JSON.stringify(events));
console.log('\nTrace gespeichert:', tracePath);
