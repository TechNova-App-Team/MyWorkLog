#!/usr/bin/env node
/**
 * Screenshot einer Seite im eigenen headless Chrome (CDP), wahlweise mit
 * vorbelegtem localStorage — fuer Gegenpruefungen, wenn die Chrome-Erweiterung
 * nicht verbunden ist oder ein definierter Datenstand gebraucht wird.
 *
 *   node tools/screenshot.mjs <url> <ausgabe.png> [--w 1280] [--h 900] [--full]
 *        [--seed datei.json] [--pre datei.js] [--dark|--light] [--js "code"] [--wait 800] [--dpr 1] [--quality 85]
 *
 * --seed  JSON-Objekt {schluessel: wert}; Werte, die keine Strings sind, werden
 *         per JSON.stringify abgelegt. Gesetzt VOR dem ersten Skript der Seite
 *         (Page.addScriptToEvaluateOnNewDocument), damit die Seite mit den
 *         Daten startet statt sie nachzuladen.
 * --pre   JS-Datei, die ebenfalls VOR dem ersten Skript der Seite laeuft —
 *         fuer Aufnahmen, die eine Datenquelle durch Beispieldaten ersetzen
 *         muessen (tools/ausbilder-screenshots.mjs haengt so einen Setter an
 *         window.BHB2B, damit das Cockpit ohne echtes Konto zeichnet).
 * --js    wird nach dem Laden ausgefuehrt (z. B. einen Dialog oeffnen).
 * --full  ganze Seite statt Viewport.
 *
 * Der Automations-Tab der Erweiterung ist meist hidden und malt nicht; hier
 * ist der Browser sichtbar (fuer Chrome), Transitions und rAF laufen also.
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = { w: 1280, h: 900, full: false, seed: null, pre: null, theme: null, js: null, wait: 800, dpr: 1, format: null, quality: 85 };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--w') opt.w = +argv[++i];
  else if (a === '--h') opt.h = +argv[++i];
  else if (a === '--full') opt.full = true;
  else if (a === '--seed') opt.seed = JSON.parse(readFileSync(argv[++i], 'utf8'));
  else if (a === '--pre') opt.pre = readFileSync(argv[++i], 'utf8');
  else if (a === '--dark') opt.theme = 'dark';
  else if (a === '--light') opt.theme = 'light';
  else if (a === '--js') opt.js = argv[++i];
  else if (a === '--wait') opt.wait = +argv[++i];
  else if (a === '--dpr') opt.dpr = +argv[++i];   // 2 fuer scharfe Bilder auf Retina-Anzeigen (Seiten-Screenshots)
  else if (a === '--quality') opt.quality = +argv[++i];   // nur fuer jpeg/webp (Endung der Ausgabedatei entscheidet)
  else pos.push(a);
}
const [url, out] = pos;
if (!url || !out) { console.error('Aufruf: node tools/screenshot.mjs <url> <ausgabe.png> [--w] [--h] [--full] [--seed x.json]'); process.exit(2); }

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9340 + Math.floor(Math.random() * 50);
const profile = mkdtempSync(join(tmpdir(), 'mwl-shot-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${opt.w},${opt.h}`, '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--disable-background-networking', '--hide-scrollbars', 'about:blank'
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 60; i++) {
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

try {
  await waitPort();
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  const cdp = new CDP(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: opt.w, height: opt.h, deviceScaleFactor: opt.dpr, mobile: opt.w < 600 });

  const seed = Object.assign({}, opt.seed || {});
  if (opt.theme) seed.mwl_tasks_theme = opt.theme;
  if (Object.keys(seed).length) {
    const src = 'try{' + Object.entries(seed).map(([k, v]) =>
      `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))});`).join('') + '}catch(e){}';
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
  }
  if (opt.pre) await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: opt.pre });

  const loaded = new Promise(r => cdp.on('Page.loadEventFired', r));
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(opt.wait);
  if (opt.js) {
    const r = await cdp.send('Runtime.evaluate', { expression: opt.js, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) console.error('js:', r.exceptionDetails.text);
    else if (r.result && r.result.value !== undefined) console.log('js →', JSON.stringify(r.result.value));
    await sleep(400);
  }

  // Format aus der Dateiendung: .webp/.jpg fuer Seitenbilder (ein Viertel der PNG-Groesse), sonst PNG.
  const ext = (out.match(/\.(webp|jpe?g)$/i) || [])[1];
  const shot = ext ? { format: ext.toLowerCase().startsWith('jp') ? 'jpeg' : 'webp', quality: opt.quality } : { format: 'png' };
  if (opt.full) {
    const { cssContentSize } = await cdp.send('Page.getLayoutMetrics');
    const h = Math.min(Math.ceil(cssContentSize.height), 8000);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: opt.w, height: h, deviceScaleFactor: opt.dpr, mobile: opt.w < 600 });
    await sleep(200);
    shot.captureBeyondViewport = true;
    shot.clip = { x: 0, y: 0, width: opt.w, height: h, scale: opt.dpr };
  }
  const { data } = await cdp.send('Page.captureScreenshot', shot);
  writeFileSync(out, Buffer.from(data, 'base64'));

  // Fehlende Ressourcen und Konsolenfehler gleich mitmelden — die sieht man im Bild nicht.
  const probe = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `
    JSON.stringify({
      res404: performance.getEntriesByType('resource').filter(r => r.responseStatus >= 400).map(r => r.name.replace(location.origin,'') + ' ' + r.responseStatus),
      scrollX: document.documentElement.scrollWidth - window.innerWidth,
      title: document.title
    })` });
  const p = JSON.parse(probe.result.value);
  console.log(`${out}  ${opt.w}x${opt.full ? 'voll' : opt.h}  „${p.title}"`);
  if (p.res404.length) console.log('  FEHLENDE RESSOURCEN: ' + p.res404.join(', '));
  if (p.scrollX > 0) console.log(`  HORIZONTAL SCROLLBAR: ${p.scrollX}px zu breit`);
  ws.close();
} catch (e) {
  console.error('FEHLER:', e.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
