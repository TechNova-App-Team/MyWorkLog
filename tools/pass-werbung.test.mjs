// Werbeflächen für den Ausbildungs-Pass: mwlPassWerben() steht zweimal (App inline, Standalone in
// ph-init.js) und entscheidet, wer Werbung sieht. Geprüft wird die echte Fassung aus beiden Dateien.
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let fehler = 0, ok = 0;
const pruefe = (b, t) => { if (b) { ok++; console.log('  OK    ' + t); } else { fehler++; console.log('  FEHLER ' + t); } };
const lies = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');

const PH = lies('Assets/js/ph-init.js');
const TPL = lies('index.template.html');
function ausschneiden(q) {
  const a = q.indexOf('window.mwlPassWerben = function');
  if (a < 0) return '';
  const e = q.indexOf('};', q.indexOf('return !app;', a));
  return q.slice(a, e + 2).split('\n').map((z) => z.trim()).join('\n');
}
const fassung = ausschneiden(PH);
pruefe(fassung.length > 100, 'die Funktion steht in ph-init.js');
pruefe(fassung === ausschneiden(TPL), 'beide Fassungen sind identisch');

function lauf({ referrer = '', url = 'https://myworklog.de/rechte-checker/', pass = null, twa = false, standalone = false } = {}) {
  const d = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url, ...(referrer ? { referrer } : {}), runScripts: 'outside-only' });
  const w = d.window;
  w.matchMedia = () => ({ matches: standalone });
  if (pass) w.localStorage.setItem('mwl_pass', JSON.stringify(pass));
  if (twa) w.localStorage.setItem('mwl_twa', '1');
  w.eval(fassung);
  return { w, ja: w.mwlPassWerben() };
}
pruefe(lauf().ja === true, 'normaler Browser ohne Pass: Werbung');
pruefe(lauf({ pass: { token: 't', bis: Date.now() + 1e6 } }).ja === false, 'gültiger Pass: keine Werbung');
pruefe(lauf({ pass: { token: 't', bis: Date.now() - 1e6 } }).ja === true, 'abgelaufener Pass: Werbung');
const app = lauf({ referrer: 'android-app://de.myworklog.app' });
pruefe(app.ja === false, 'Referrer der Play-App: keine Werbung');
pruefe(app.w.localStorage.getItem('mwl_twa') === '1', 'die App merkt sich die Marke für Folgeseiten ohne Referrer');
pruefe(lauf({ url: 'https://myworklog.de/?utm_source=android&utm_medium=twa' }).ja === false, 'Start-URL der App: keine Werbung');
pruefe(lauf({ twa: true, standalone: true }).ja === false, 'Folgeseite in der App: keine Werbung');
pruefe(lauf({ twa: true, standalone: false }).ja === true, 'dieselbe Marke im Chrome-Tab: Werbung (TWA teilt den Speicher mit Chrome)');
pruefe(lauf({ standalone: true }).ja === true, 'aus dem Browser installierte PWA: Werbung');

// Jede Stelle, an der geworben wird, muss die Prüfung und einen Messpunkt haben.
const FUSS = lies('pages/footer/footer.html');
pruefe(/<aside class="footer-pass" id="footerPass"[^>]* hidden>/.test(FUSS), 'Band in der Fußzeile startet versteckt');
pruefe(!FUSS.slice(FUSS.indexOf('</style>')).includes('<script'), 'keine Logik im Fuß-Markup (Skripte aus template.innerHTML laufen nicht)');
pruefe(PH.includes("getElementById('footerPass')") && PH.includes("ort: 'fusszeile'"), 'ph-init schaltet das Band und misst den Klick');
const NAV = lies('components/sidebar/sidebar.html');
pruefe(/id="nav-pass"[^>]*display:none/.test(NAV), 'Seitenleiste startet versteckt (Inline-display schlägt die Klasse)');
const DASH = lies('components/dashboard/dashboard.html');
pruefe(/id="passBanner"[^>]*display:none/.test(DASH), 'Dashboard-Hinweis startet versteckt');
const MARKE = lies('Assets/js/mwl-pass-marke.js');
pruefe(['nav-pass', 'viPass', 'passBanner'].every((i) => MARKE.includes("'" + i + "'")), 'MWLPassMarke schaltet alle drei App-Flächen');
pruefe(/const werben = [^\n]*mwlPassWerben/.test(MARKE), 'und fragt dabei mwlPassWerben');
pruefe(MARKE.indexOf('werbung();\n        document.querySelectorAll') > 0, 'die Flächen werden auch ohne Pass geschaltet (vor dem Ausstieg der Marke)');
const CHAT = lies('Assets/js/berichtsheft/ais-chat.js');
pruefe(CHAT.includes("passLink: grund === 'limit'") && CHAT.includes('n.passLink && passWerben()'), 'Limit-Meldung bietet den Pass an, geprüft');
const alle = [TPL, NAV, DASH, CHAT, PH].join('\n');
pruefe((alle.match(/pass_werbung/g) || []).length >= 5, 'Klicks der Flächen werden gemessen');
pruefe(!/mwlEvent\('pass_werbung',\s*\{[^}]*(email|name|betrag)/i.test(alle), 'Messpunkte tragen nur den Ort');

// Die Kaufrate muss messbar sein und die Flächen führen auf die Pass-Karte.
const KASSE = lies('pages/kaufen/index.html');
const KJS = lies('Assets/js/kaufen.js');
pruefe(KASSE.includes('/Assets/js/ph-init.js'), 'die Kasse lädt die Messung');
pruefe(['kauf_seite', 'kauf_los', 'kauf_fertig', 'kauf_abgebrochen'].every((n) => KJS.includes("ev('" + n + "'")), 'alle vier Schritte der Kasse werden gezählt');
pruefe(!/ev\('kauf_[a-z]+',\s*\{[^}]*(preis|betrag|email)/i.test(KJS), 'Messpunkte tragen weder Betrag noch Adresse');
const PREISE = lies('pages/preise/index.html');
pruefe(/<article[^>]* id="pass"/.test(PREISE), 'die Pass-Karte ist das Sprungziel');
pruefe(FUSS.includes('/preise/#pass') && NAV.includes('/preise/#pass') && DASH.includes('/preise/#pass') && TPL.includes('/preise/#pass'), 'Flächen springen direkt auf die Karte');
pruefe(!(FUSS + NAV + DASH + TPL).includes('/preise/#hefte'), 'Gegenprobe: kein Link mehr auf den Kopf der Liste');
const SIEGEL = lies('Assets/js/berichtsheft/bh-siegel.js');
pruefe(SIEGEL.includes('hfLuecken') && !/Stunden|hours/.test(SIEGEL.slice(SIEGEL.indexOf('function lage'), SIEGEL.indexOf('let offen'))), 'Sperr-Blatt nennt echte fehlende Wochen, keine erfundene Zeitersparnis');

// Der Preis auf den Flächen muss zum Worker passen.
// workers/ ist gitignored: auf dem Runner fehlt die Datei, lokal muss ein Fehlen weiter anschlagen.
if (process.env.CI && !existsSync(new URL('../workers/ai-proxy/worker.js', import.meta.url))) {
  console.log('  --   uebersprungen: workers/ai-proxy/worker.js ist gitignored.');
} else {
  const WORKER = lies('workers/ai-proxy/worker.js');
  pruefe(/PASS_PREISE = \{ 2: 999,/.test(WORKER), 'Worker verkauft ab 9,99 €');
}
pruefe(FUSS.includes('ab 9,99 €') && DASH.includes('ab 9,99 €'), 'Flächen nennen denselben Einstiegspreis');

console.log('\n' + ok + ' ok, ' + fehler + ' fehlgeschlagen');
if (fehler) process.exit(1);
