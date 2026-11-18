// Push-Ziel im Service Worker: nur eigene Seiten (Audit 18.11.2026 + Zweitpruefung).
// Laeuft gegen den ECHTEN Block aus service-worker.js. Aufruf: node tools/sw-push-ziel.test.mjs
import { readFileSync } from 'node:fs';
const sw = readFileSync('service-worker.js', 'utf8').split('\r\n').join('\n');
const a = sw.indexOf("  let ziel = '/';"), b = sw.indexOf('/* ziel bleibt', a);
if (a < 0 || b < 0) { console.log('Block nicht gefunden'); process.exit(1); }
const block = sw.slice(a, sw.indexOf('\n', b) + 1);
const rechne = new Function('data', 'self', block + '\nreturn ziel;');
const self = { location: { origin: 'https://myworklog.de' } };
const faelle = {
  '/berichtsheft/': '/berichtsheft/', '/?klasse=mitteilung': '/?klasse=mitteilung', '/en/': '/en/',
  '//evil.com/x': '/', '/\\evil.com': '/', '/\t/evil.example': '/', '/\n/evil.example': '/',
  'https://evil.com': '/', 'javascript:alert(1)': '/', '': '/', 'https://myworklog.de/x/': '/x/',
};
let fehler = 0;
for (const [u, soll] of Object.entries(faelle)) { const ist = rechne({ url: u }, self); if (ist !== soll) fehler++; console.log(ist === soll ? 'ok  ' : 'FEHL', JSON.stringify(u), '->', ist); }
process.exit(fehler ? 1 : 0);
