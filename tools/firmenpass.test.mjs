// Firmenpass (seit 19.11.2026): Preise und AGB-Fassung stehen an mehreren Stellen und duerfen
// nicht auseinanderlaufen — Cockpit (LIZENZ_PREIS), Kasse fuer Azubis (/kaufen/ data-preis),
// Worker (PASS_PREISE, AGB_STAND; workers/ ist gitignored, in CI also uebersprungen) und die AGB
// (Fassung + Anker #betrieb, auf den Stripe-Zustimmung und Rechnung verweisen).
//   node tools/firmenpass.test.mjs
import { readFileSync, existsSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const lies = (p) => readFileSync(p, 'utf8').split('\r\n').join('\n');

const cockpit = lies('pages/ausbilder/index.html');
const m = /var LIZENZ_PREIS = \{ 2: (\d+), 3: (\d+), 4: (\d+) \}/.exec(cockpit);
ok(!!m, 'Cockpit: LIZENZ_PREIS gefunden');
const cockpitPreise = m ? m.slice(1).map(Number) : [];

const kaufen = lies('pages/kaufen/index.html');
const kaufenPreise = [...kaufen.matchAll(/data-preis="(\d+),(\d\d)"/g)].map(x => Number(x[1]) * 100 + Number(x[2]));
ok(kaufenPreise.length === 3, 'Kasse: drei Laufzeiten gefunden (' + kaufenPreise.join(', ') + ')');
ok(JSON.stringify(kaufenPreise) === JSON.stringify(cockpitPreise), 'Betrieb zahlt pro Azubi dasselbe wie ein Azubi (' + cockpitPreise.join(', ') + ')');

const agb = lies('pages/agb/index.html');
const fassung = /<span>Fassung vom (\d\d\.\d\d\.\d{4})<\/span>/.exec(agb);
ok(!!fassung, 'AGB: Fassung gefunden');
ok(/id="betrieb"/.test(agb) && /12\. Kauf durch Ausbildungsbetriebe/.test(agb), 'AGB: Abschnitt 12 mit Anker #betrieb');
ok(/jederzeit entziehen/.test(agb) && /restliche Laufzeit/.test(agb) && /behält er den Pass, bis der Betrieb entscheidet/.test(agb), 'AGB: Entziehen, Restdauer und Austritt stehen drin (wie in der DB)');

const ws = 'workers/ai-proxy/worker.js';
if (existsSync(ws)) {
  const w = lies(ws);
  const pp = /const PASS_PREISE = \{ 2: (\d+), 3: (\d+), 4: (\d+) \}/.exec(w);
  ok(pp && JSON.stringify(pp.slice(1).map(Number)) === JSON.stringify(cockpitPreise), 'Worker: PASS_PREISE = Cockpit');
  const st = /const AGB_STAND = '([^']+)'/.exec(w);
  ok(st && fassung && st[1] === fassung[1], 'Worker: AGB_STAND = Fassung der AGB (' + (st && st[1]) + ')');
  ok(/agb\/#betrieb/.test(w), 'Worker: Betriebs-Kasse verweist auf #betrieb');
} else {
  console.log('  (workers/ fehlt — Worker-Abgleich übersprungen)');
}

console.log(`\nFirmenpass: ${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
