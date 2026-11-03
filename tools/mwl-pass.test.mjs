// Ausbildungs-Pass im Browser (Assets/js/mwl-pass.js): ein am Konto entzogener Pass
// (Erstattung/Rückbuchung) muss vom Gerät verschwinden — im Test vom 03.11.2026 blieb er
// stehen, weil das 7-Tage-Token nur am Ablaufdatum hing. Der Haupt-Code hängt an keinem
// Konto und darf dabei NICHT mit weggeräumt werden.
//   node tools/mwl-pass.test.mjs

import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };

const QUELLE = readFileSync(new URL('../Assets/js/mwl-pass.js', import.meta.url), 'utf8');
const MARKE = readFileSync(new URL('../Assets/js/mwl-pass-marke.js', import.meta.url), 'utf8');
const SB = 'sb-fouucibowmukxvweratn-auth-token';
const STUNDE = 3600000, TAG = 86400000;

// Eine Seite mit gespeichertem Zustand; antwort = Status von /pass/freischalten
async function seite({ pass: gespeichert, geprueft, antwort = 404 }) {
    const dom = new JSDOM('<!doctype html><html><body><div class="profile-card"><div class="st-hero-zeile"></div></div></body></html>',
        { url: 'https://myworklog.de/berichtsheft/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    w.localStorage.setItem(SB, JSON.stringify({ access_token: 'tok', expires_at: Date.now() / 1000 + 3600 }));
    if (gespeichert) w.localStorage.setItem('mwl_pass', JSON.stringify(gespeichert));
    if (geprueft) w.localStorage.setItem('mwl_pass_geprueft', String(geprueft));
    const anfragen = [];
    w.fetch = async (url) => {
        anfragen.push(String(url));
        const body = antwort === 200 ? { token: 'neu.sig', bis: Date.now() + 7 * TAG, passBis: Date.now() + 365 * TAG } : { kein: true };
        // jsdom kennt kein Response — nur das, was mwl-pass.js davon liest
        return { status: antwort, ok: antwort >= 200 && antwort < 300, json: async () => body };
    };
    let weg = 0;
    w.addEventListener('mwl-pass-weg', () => weg++);
    w.eval(QUELLE);
    w.eval(MARKE);
    w.MWLPass.tokenQuelle = async () => 'tok';
    w.MWLPassMarke.einsetzen();
    const markeVorher = w.document.querySelectorAll('.mwl-pass-marke').length;
    w.dispatchEvent(new w.Event('load'));
    await new Promise(r => setTimeout(r, 1400));   // stillErneuern läuft 1200 ms nach load
    await new Promise(r => setTimeout(r, 50));
    return { w, anfragen, weg: () => weg, markeVorher, markeNachher: w.document.querySelectorAll('.mwl-pass-marke').length };
}

const kontoPass = { token: 'alt.sig', bis: Date.now() + 6 * TAG, passBis: Date.now() + 300 * TAG, quelle: 'konto' };
const codePass = { token: 'code.sig', bis: Date.now() + 20 * TAG, passBis: Date.now() + 20 * TAG, quelle: 'code' };

// 1. Konto-Pass, lange nicht geprüft, Server sagt „kein Pass“ → weg
let s = await seite({ pass: kontoPass, geprueft: Date.now() - 2 * STUNDE, antwort: 404 });
ok(s.anfragen.some(u => u.endsWith('/pass/freischalten')), 'Konto-Pass, Prüfung älter als 1 h → fragt beim Konto nach');
ok(s.markeVorher === 1, 'Gegenprobe: vorher steht die Pass-Marke');
ok(s.w.localStorage.getItem('mwl_pass') === null && !s.w.MWLPass.frei(), 'Konto sagt 404 → Freischaltung auf dem Gerät gelöscht');
ok(s.weg() === 1 && s.markeNachher === 0, 'Ereignis mwl-pass-weg, Marke verschwindet ohne Neuladen');

// 2. Konto-Pass, gerade erst geprüft → keine Anfrage (nicht bei jedem Seitenaufruf)
s = await seite({ pass: kontoPass, geprueft: Date.now() - 10 * 60000, antwort: 404 });
ok(s.anfragen.length === 0 && s.w.MWLPass.frei(), 'Prüfung jünger als 1 h → keine Anfrage, Pass bleibt');

// 3. Haupt-Code, Konto ohne Pass → Code bleibt
s = await seite({ pass: codePass, antwort: 404 });
ok(s.anfragen.length === 0, 'Haupt-Code mit langer Restlaufzeit → keine Konto-Anfrage');
ok(s.w.MWLPass.frei() && s.weg() === 0, 'Haupt-Code wird nicht weggeräumt');

// 4. Konto-Pass, Konto hat ihn noch → bleibt, Token erneuert
s = await seite({ pass: kontoPass, geprueft: Date.now() - 2 * STUNDE, antwort: 200 });
const neu = JSON.parse(s.w.localStorage.getItem('mwl_pass') || 'null');
ok(neu && neu.token === 'neu.sig' && neu.quelle === 'konto' && s.weg() === 0, 'Konto hat den Pass noch → Token erneuert, nichts entfernt');
ok(Number(s.w.localStorage.getItem('mwl_pass_geprueft')) > Date.now() - 60000, 'Zeitpunkt der Prüfung gemerkt');

// 5. Server nicht erreichbar → nichts wegräumen
s = await seite({ pass: kontoPass, geprueft: Date.now() - 2 * STUNDE, antwort: 502 });
ok(s.w.MWLPass.frei() && s.weg() === 0, 'Server-Fehler → Pass bleibt (kein Entzug ohne Antwort des Kontos)');

console.log(`\n${pass} ok, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
