// „Kein Pass“ gilt nur für das Konto, das gefragt hat (Assets/js/mwl-pass.js, 21.11.2026).
// Nachgestellt: Zweitkonto ohne Pass fragt → 404 wird gemerkt → Wechsel aufs Hauptkonto →
// die Seite MUSS neu fragen. Vorher blieb sie 12 h stumm und der Pass fehlte.
// Aufruf: node tools/mwl-pass-kein.test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const QUELLE = readFileSync(new URL('../Assets/js/mwl-pass.js', import.meta.url), 'utf8');
const SB = 'sb-fouucibowmukxvweratn-auth-token';
let ok = 0, fehler = 0;
const pruefe = (b, t) => { if (b) { ok++; console.log('  ok    ' + t); } else { fehler++; console.log('  FEHLER ' + t); } };

function umgebung(speicher) {
  const lade = [];
  const rufe = [];
  const ls = {
    getItem: (k) => (k in speicher ? speicher[k] : null),
    setItem: (k, v) => { speicher[k] = String(v); },
    removeItem: (k) => { delete speicher[k]; },
  };
  const window = {
    addEventListener: (typ, f) => { if (typ === 'load') lade.push(f); },
    dispatchEvent: () => true,
  };
  const ctx = {
    window, localStorage: ls, console,
    document: { currentScript: null, readyState: 'complete', documentElement: { lang: 'de' }, addEventListener() {} },
    location: { hostname: 'myworklog.de' },
    CustomEvent: function () {},
    setTimeout: (f) => f(),   // stillErneuern sofort
    fetch: async (url) => { rufe.push(url); return { status: 404, ok: false, json: async () => ({}) }; },
  };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(QUELLE, ctx);
  return { lade, rufe, speicher };
}
const sitzung = (id) => JSON.stringify({ access_token: 'x.' + id, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id } });
const warte = () => new Promise((r) => setTimeout(r, 20));

// 1) Merkung vom Zweitkonto, jetzt Hauptkonto angemeldet → muss fragen
{
  const u = umgebung({ [SB]: sitzung('haupt'), mwl_pass_kein: 'zweit:' + Date.now() });
  u.lade.forEach((f) => f()); await warte();
  pruefe(u.rufe.some((x) => String(x).includes('/pass/freischalten')), 'Kontowechsel: fragt beim neuen Konto nach');
}
// 2) Merkung vom selben Konto, frisch → fragt NICHT (12-h-Bremse bleibt)
{
  const u = umgebung({ [SB]: sitzung('haupt'), mwl_pass_kein: 'haupt:' + Date.now() });
  u.lade.forEach((f) => f()); await warte();
  pruefe(u.rufe.length === 0, 'gleiches Konto, frische Merkung: keine Anfrage');
}
// 3) Alter reiner Zeitstempel (vor dem Fix gespeichert) → einmal neu fragen
{
  const u = umgebung({ [SB]: sitzung('haupt'), mwl_pass_kein: String(Date.now()) });
  u.lade.forEach((f) => f()); await warte();
  pruefe(u.rufe.length > 0, 'Altwert ohne Konto: fragt einmal neu');
}
// 4) 404 schreibt die Merkung MIT Konto
{
  const u = umgebung({ [SB]: sitzung('haupt') });
  u.lade.forEach((f) => f()); await warte();
  pruefe(/^haupt:\d+$/.test(u.speicher.mwl_pass_kein || ''), '404 merkt "<konto>:<zeit>"');
}

console.log(`\nmwl-pass-kein: ${ok} ok, ${fehler} fehlgeschlagen`);
if (ok === 0 || fehler) process.exit(1);
