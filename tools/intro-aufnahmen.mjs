#!/usr/bin/env node
// ═══ BILDER UND FILME FUER DAS INTRO (#pro-intro) ═══
//
// Nimmt mit den erfundenen Beispieldaten von /about/ (Seed aus
// tools/about-screenshots.mjs, Azubi "Anna Beispiel") auf:
//   Grafiken/intro/blatt-{form,klassisch,klar}.webp  — die drei PDF-Vorlagen als
//       einzelnes Blatt, fuer den Papierstapel im Intro (Textur, Hochformat)
//   Grafiken/intro/handy.mp4    — die App am Handy, scrollt durch das Dashboard
//   Grafiken/intro/vorlagen.mp4 — der PDF-Dialog, wechselt die Vorlagen durch
// Braucht den lokalen Server (Portman, 5001) und ffmpeg im PATH.
//
//   node tools/intro-aufnahmen.mjs            → alles
//   node tools/intro-aufnahmen.mjs blatt      → nur die Blaetter
//   node tools/intro-aufnahmen.mjs handy      → nur einen Film (handy|vorlagen)
//
// Filme werden NICHT in Echtzeit mitgeschnitten, sondern Bild fuer Bild:
// window.__f(t) stellt den Zustand fuer t = 0…1 her, dann ein Screenshot. Nur
// so ist jede Aufnahme gleich und ruckelfrei — ein Screencast liefert headless
// Bilder in unregelmaessigen Abstaenden. Die Filme laufen im Intro als
// Schleife; deshalb faehrt jede Bewegung hin UND zurueck (Anfang = Ende).

import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'Grafiken', 'intro');
const SEED_DATEI = join(HERE, 'about-screenshots.seed.json');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const nur = process.argv[2] || 'alles';

const seedLauf = spawnSync(process.execPath, [join(HERE, 'about-screenshots.mjs'), '--nur-seed'], { cwd: ROOT, encoding: 'utf8' });
if (seedLauf.status !== 0) { console.error(seedLauf.stderr); process.exit(1); }
const SEED = JSON.parse(readFileSync(SEED_DATEI, 'utf8'));
mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method && this.handlers.has(m.method)) this.handlers.get(m.method).forEach(h => h(m.params)); }); }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => this.pending.set(id, { res, rej })); }
  on(method, h) { if (!this.handlers.has(method)) this.handlers.set(method, []); this.handlers.get(method).push(h); }
}

async function browser(w, h, dpr, url, nachLaden) {
  const port = 9400 + Math.floor(Math.random() * 80);
  const profil = mkdtempSync(join(tmpdir(), 'mwl-shot-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`,
    `--window-size=${w},${h}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {} await sleep(100); }
  const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  const cdp = new CDP(ws);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: w < 600 });
  const src = 'try{' + Object.entries(SEED).map(([k, v]) =>
    `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === 'string' ? v : JSON.stringify(v))});`).join('') + '}catch(e){}';
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
  const geladen = new Promise(r => cdp.on('Page.loadEventFired', r));
  await cdp.send('Page.navigate', { url });
  await geladen; await sleep(3500);
  const js = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('js: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  if (nachLaden) console.log('  vorbereitet →', await js(nachLaden));
  return {
    cdp, js,
    async zu() { ws.close(); chrome.kill(); await sleep(300); try { rmSync(profil, { recursive: true, force: true }); } catch {} }
  };
}

// Weg mit allem, was beim ersten Besuch ueber der Seite liegt
// Der schwebende Menueknopf liegt am Handy ueber dem Seitenkopf — im Film
// verdeckte er die Ueberschrift der obersten Karte ("URL" von "Urlaub uebrig").
const AUFRAEUMEN = "var b=document.getElementById('localhostWarningBanner');if(b)b.remove();var mt=document.getElementById('mobileMenuToggle');if(mt)mt.style.display='none';document.querySelectorAll('.toast,.smart-notification').forEach(e=>e.remove());";

async function film(name, w, h, dpr, url, vorbereiten, sekunden) {
  const b = await browser(w, h, dpr, url, vorbereiten);
  const tmp = mkdtempSync(join(tmpdir(), 'mwl-film-'));
  const n = Math.round(sekunden * 30);
  try {
    for (let i = 0; i < n; i++) {
      await b.js(`window.__f(${i / n})`);
      await sleep(40);
      const { data } = await b.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      writeFileSync(join(tmp, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(data, 'base64'));
    }
    const ziel = join(OUT, name + '.mp4');
    const ff = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', join(tmp, 'f%04d.jpg'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-an', ziel], { encoding: 'utf8' });
    if (ff.status !== 0) throw new Error('ffmpeg: ' + ff.stderr);
    console.log(`${ziel}  ${n} Bilder`);
  } finally { await b.zu(); rmSync(tmp, { recursive: true, force: true }); }
}

// Ein Blatt: PDF-Dialog oeffnen, Vorlage waehlen, die Vorschau allein auf die
// Seite stellen und genau ihren Kasten aufnehmen.
async function blatt(stil) {
  const b = await browser(560, 900, 2.4, 'http://localhost:5001/berichtsheft/', `(async()=>{
    const r=reports.filter(x=>x.status==='signed').slice(-1)[0];
    openPDFModal(r.id);
    await new Promise(z=>setTimeout(z,500));
    selectPDFStyle('${stil}', document.querySelector('[data-style=${stil}]'));
    await new Promise(z=>setTimeout(z,400));
    const doc=document.getElementById('pdfDocPreview').cloneNode(true);
    document.body.innerHTML=''; document.body.style.cssText='margin:0;background:#fff;overflow:hidden';
    doc.style.cssText='max-width:none;width:560px;box-shadow:none;border-radius:0;margin:0';
    document.body.appendChild(doc);
    await new Promise(z=>setTimeout(z,300));
    return Math.ceil(doc.getBoundingClientRect().height);
  })()`);
  try {
    const hoehe = await b.js(`Math.ceil(document.body.firstElementChild.getBoundingClientRect().height)`);
    // Blattformat A4 (1:1,414): kuerzer wird unten weiss aufgefuellt, laenger abgeschnitten
    const h = Math.round(560 * 1.414);
    await b.js(`document.body.style.height='${h}px'`);
    const { data } = await b.cdp.send('Page.captureScreenshot', { format: 'webp', quality: 86, clip: { x: 0, y: 0, width: 560, height: h, scale: 1 }, captureBeyondViewport: true });
    const ziel = join(OUT, `blatt-${stil}.webp`);
    writeFileSync(ziel, Buffer.from(data, 'base64'));
    console.log(`${ziel}  Inhalt ${hoehe}px von ${h}px`);
  } finally { await b.zu(); }
}

if (nur === 'alles' || nur === 'blatt') {
  for (const s of ['form', 'klassisch', 'klar']) await blatt(s);
}
if (nur === 'alles' || nur === 'handy') {
  // Handy: das Dashboard hinunter und wieder hinauf, weich (Kosinus), 9 s
  await film('handy', 390, 844, 1.5, 'http://localhost:5001/', `(function(){${AUFRAEUMEN}
    // Am Handy scrollt nicht das Dokument, sondern ein Container der App —
    // den groessten scrollbaren nehmen (gemessen: document.scrollingElement hat 0 px Weg).
    const kand=[document.scrollingElement,...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return e===document.scrollingElement||/(auto|scroll)/.test(c.overflowY);});
    const el=kand.sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight))[0], max=Math.min(el.scrollHeight-el.clientHeight, 1500);
    window.__f=t=>{ const u=(1-Math.cos(t*2*Math.PI))/2; el.scrollTop=Math.round(u*max); return el.scrollTop; };
    return max;})()`, 9);
}
if (nur === 'alles' || nur === 'vorlagen') {
  // Vorlagen: der PDF-Dialog schaltet alle 2 s weiter, 8 s = einmal rundherum
  await film('vorlagen', 1280, 800, 1, 'http://localhost:5001/berichtsheft/', `(async()=>{
    const r=reports.filter(x=>x.status==='signed').slice(-1)[0];
    openPDFModal(r.id); await new Promise(z=>setTimeout(z,600));
    const reihe=['form','klassisch','klar','clean']; let jetzt=-1;
    window.__f=t=>{ const i=Math.floor(t*4)%4; if(i!==jetzt){ jetzt=i; selectPDFStyle(reihe[i], document.querySelector('[data-style='+reihe[i]+']')); } return i; };
    return 'ok';})()`, 8);
}
