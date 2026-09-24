// Sperren aus dem Sicherheits-Audit 2026-09-24 an ai-proxy und untis-proxy.
// Laedt die echten Worker (gitignored, von Hand deployed) mit einer fetch-Attrappe.
// Aufruf: node tools/proxy-haertung.test.mjs
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const DATEIEN = ['workers/ai-proxy/worker.js', 'workers/untis-proxy/worker.js'];
if (DATEIEN.some(f => !fs.existsSync(f))) {
  if (process.env.CI) { console.log('  --   uebersprungen: workers/ ist gitignored.'); process.exit(2); }
  console.error('✗ Worker-Datei fehlt: ' + DATEIEN.filter(f => !fs.existsSync(f)).join(', '));
  process.exit(1);
}

let ok = 0, fehler = 0;
const ist = (b, n) => { if (b) { ok++; console.log('  OK   ' + n); } else { fehler++; console.log('  FAIL ' + n); } };

let upstream = [];
globalThis.fetch = async (url, init = {}) => {
  upstream.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
  const woche = JSON.stringify([{ day: 'Montag', entries: ['Server aufgesetzt'] }]);
  const body = String(url).includes('openrouter')
    ? JSON.stringify({ choices: [{ message: { content: woche }, finish_reason: 'stop' }], usage: {} })
    : 'BEGIN:VCALENDAR\nEND:VCALENDAR';
  return new Response(body, { status: 200 });
};
const log = console.log; const still = () => { console.log = () => {}; console.warn = () => {}; };
const laut = () => { console.log = log; };

const ai    = (await import(pathToFileURL(DATEIEN[0]).href)).default;
const untis = (await import(pathToFileURL(DATEIEN[1]).href)).default;
const ENV = { OPENROUTER_API_KEY: 'test' };
const anfrage = (origin, body) => new Request('https://ai-proxy.myworklog.de/', {
  method: 'POST', headers: origin ? { Origin: origin } : {}, body,
});
const prompt = (extra = {}) => JSON.stringify({ contents: [{ parts: [{ text: 'Woche' }] }], ...extra });

console.log('\n▶ ai-proxy');
still();
let r = await ai.fetch(anfrage(null, prompt()), ENV);
laut(); ist(r.status === 403, 'ohne Origin (curl) → 403');
still(); r = await ai.fetch(anfrage('https://evil.example', prompt()), ENV);
laut(); ist(r.status === 403, 'fremde Origin → 403');
ist(upstream.length === 0, 'abgelehnte Anfragen erreichen OpenRouter nicht');

upstream = [];
still(); r = await ai.fetch(anfrage('https://myworklog.de', prompt({ generationConfig: { maxOutputTokens: 100000, temperature: 99 } })), ENV);
laut(); ist(r.status === 200, 'Gegenprobe: eigene Origin → 200');
ist(upstream[0]?.body?.max_tokens === 4096, 'maxOutputTokens wird auf 4096 gedeckelt');
ist(upstream[0]?.body?.temperature === 2, 'temperature wird auf 2 gedeckelt');

upstream = [];
still(); r = await ai.fetch(anfrage('https://myworklog.de', prompt({ x: 'a'.repeat(200 * 1024) })), ENV);
laut(); ist(r.status === 413 && upstream.length === 0, 'Body ueber 128 KB → 413, kein Upstream-Aufruf');

const quelle = fs.readFileSync(DATEIEN[0], 'utf8');
ist(!/rawBody\.substring/.test(quelle) && !/bodyText\.substring/.test(quelle), 'kein Nutzertext im Log');

console.log('\n▶ untis-proxy');
const ical = u => new Request('https://untis-proxy.myworklog.workers.dev/?url=' + encodeURIComponent(u));
upstream = [];
for (const u of ['https://evilwebuntis.com/ical', 'https://webuntis.com.evil.example/ical', 'http://nessa.webuntis.com/ical']) {
  r = await untis.fetch(ical(u));
  ist(r.status === 403, 'abgelehnt: ' + u);
}
ist(upstream.length === 0, 'abgelehnte URLs werden nicht abgerufen');
r = await untis.fetch(ical('https://nessa.webuntis.com/WebUntis/Ical.do?school=x'));
ist(r.status === 200 && upstream.length === 1, 'Gegenprobe: echte Subdomain wird abgerufen');

console.log(`\n${ok} OK, ${fehler} FAIL`);
process.exit(fehler ? 1 : 0);
