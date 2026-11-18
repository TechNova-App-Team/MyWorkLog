// Lese-Freigabe der KI (ki_app_spiegel) ueber mehrere Geraete — Audit 18.11.2026.
// Bis dahin: Geraet A schaltet Lesen aus (Zeile geloescht), Geraet B hat noch
// mwl_ki_lesen='1' und laedt beim naechsten save() die lesbare Kopie wieder hoch.
// Zwei jsdom-Fenster = zwei Geraete, ein gemeinsamer Tabellen-Speicher = Supabase.
//   node tools/ki-lesen-geraete.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const quelle = readFileSync(new URL('../Assets/js/ki-app-briefkasten.js', import.meta.url), 'utf8');

// Supabase-Attrappe fuer genau die Aufrufe der Lese-Freigabe
const tabelle = new Map();   // user_id -> { daten }
const USER = { id: '11111111-2222-4333-8444-555555555555' };
let schreibAufrufe = 0;
function client() {
    const abfrage = (name) => {
        const q = { _op: 'select', _werte: null, _eq: null, _select: false };
        const ausfuehren = async () => {
            if (name !== 'ki_app_spiegel') return { data: null, error: null };
            const id = q._eq;
            if (q._op === 'upsert') { schreibAufrufe++; tabelle.set(q._werte.user_id, { daten: q._werte.daten }); return { data: null, error: null }; }
            if (q._op === 'update') { schreibAufrufe++; if (!tabelle.has(id)) return { data: [], error: null }; tabelle.get(id).daten = q._werte.daten; return { data: [{ user_id: id }], error: null }; }
            if (q._op === 'delete') { tabelle.delete(id); return { data: null, error: null }; }
            return { data: tabelle.has(id) ? { daten: structuredClone(tabelle.get(id).daten) } : null, error: null };
        };
        Object.assign(q, {
            upsert(w) { q._op = 'upsert'; q._werte = w; return q; },
            update(w) { q._op = 'update'; q._werte = w; return q; },
            delete() { q._op = 'delete'; return q; },
            select() { return q; },
            eq(_k, v) { q._eq = v; return q; },
            maybeSingle() { return ausfuehren(); },
            then(a, b) { return ausfuehren().then(a, b); },
        });
        return q;
    };
    return { from: abfrage, auth: { getSession: async () => ({ data: { session: { user: USER } } }) } };
}

function geraet(name) {
    const dom = new JSDOM('<!doctype html><html lang="de"><body></body></html>', { runScripts: 'outside-only', url: 'https://myworklog.de/' });
    dom.window.eval(quelle);
    const api = dom.window.MWLKiApp;
    api.init({ client: async () => client() });
    return { name, api, ls: dom.window.localStorage };
}

const A = geraet('A'), B = geraet('B');
ok(typeof A.api.lesenSetzen === 'function' && typeof A.api.spiegelSchreiben === 'function', 'Gegenprobe: Bibliothek geladen');

// 1. Einschalten auf A legt die Kopie an
await A.api.lesenSetzen(true, { stand: 'A1' });
ok(tabelle.has(USER.id) && tabelle.get(USER.id).daten.stand === 'A1', 'A schaltet ein: Kopie liegt auf dem Server');
ok(A.ls.getItem('mwl_ki_lesen') === '1', 'nach dem Anlegen steht A auf "1"');

// 2. B war frueher schon eingeschaltet (Altbestand '1') und aktualisiert normal
B.ls.setItem('mwl_ki_lesen', '1');
await B.api.spiegelSchreiben({ stand: 'B1' });
ok(tabelle.get(USER.id).daten.stand === 'B1', 'B aktualisiert die vorhandene Kopie');

// 3. A schaltet aus → Zeile weg
await A.api.lesenSetzen(false);
ok(!tabelle.has(USER.id), 'A schaltet aus: Kopie geloescht');

// 4. Der eigentliche Fund: B speichert danach weiter
await B.api.spiegelSchreiben({ stand: 'B2-geheim' });
ok(!tabelle.has(USER.id), 'B legt die Kopie NICHT wieder an (vorher: lesbare Kopie wieder da)');
ok(!B.api.lesenAn() && B.ls.getItem('mwl_ki_lesen') === null, 'B schaltet sich selbst mit aus');
const vorher = schreibAufrufe;
// so wie ki-assistent.js: nur wenn lesenAn()
if (B.api.lesenAn()) await B.api.spiegelSchreiben({ stand: 'B3' });
ok(schreibAufrufe === vorher, 'danach versucht B gar nicht mehr zu schreiben');

// 5. Zustimmungsseite setzt 'neu:<konto>:<ms>' → darf die Kopie wieder ANLEGEN
B.ls.setItem('mwl_ki_lesen', 'neu:' + USER.id + ':' + Date.now());
ok(B.api.lesenAn(), '"neu" zaehlt als eingeschaltet');
await B.api.spiegelSchreiben({ stand: 'B4' });
ok(tabelle.has(USER.id) && tabelle.get(USER.id).daten.stand === 'B4' && B.ls.getItem('mwl_ki_lesen') === '1', 'ausdrueckliches Einschalten (neu) legt an und steht danach auf "1"');

// 5b. Zweitpruefung: liegengebliebenes 'neu' (alt / fremdes Konto / alte Form) legt NICHT an
for (const [name, wert] of [
    ['aelter als 24 h', 'neu:' + USER.id + ':' + (Date.now() - 25 * 3600 * 1000)],
    ['fuer ein anderes Konto', 'neu:99999999-2222-4333-8444-555555555555:' + Date.now()],
    ['alte Form ohne Konto', 'neu'],
]) {
    tabelle.delete(USER.id);
    B.ls.setItem('mwl_ki_lesen', wert);
    await B.api.spiegelSchreiben({ stand: 'liegengeblieben' });
    ok(!tabelle.has(USER.id) && B.ls.getItem('mwl_ki_lesen') === null, '"neu" ' + name + ': keine Kopie angelegt, Merker geloescht');
}

// 5c. Einschalten in der App schreibt die Konto-Form
tabelle.delete(USER.id);
await A.api.lesenSetzen(true, null);
ok(/^neu:11111111-2222-4333-8444-555555555555:[0-9]+$/.test(A.ls.getItem('mwl_ki_lesen') || ''), 'lesenSetzen(true) merkt Konto und Zeitpunkt');
await A.api.spiegelSchreiben({ stand: 'A9' });
ok(tabelle.has(USER.id) && A.ls.getItem('mwl_ki_lesen') === '1', '... und legt damit an');

// 6. Teil-Aktualisierung (Berichtsheft-Seite) nach Ausschalten woanders
await A.api.lesenSetzen(false);
await B.api.spiegelTeileAktualisieren({ berichte: [] });
ok(!tabelle.has(USER.id) && !B.api.lesenAn(), 'Teil-Aktualisierung legt nichts an und schaltet B aus');

// 7. Quelle der Zustimmungsseite setzt 'neu', nicht '1'
const seite = readFileSync(new URL('../pages/ki-verbinden/index.html', import.meta.url), 'utf8');
ok(seite.includes("localStorage.setItem('mwl_ki_lesen', 'neu:' + user.id + ':' + Date.now())") && !seite.includes("localStorage.setItem('mwl_ki_lesen', '1')"), '/ki-verbinden/ setzt "neu" mit Konto und Zeitpunkt');

console.log(`\nki-lesen-geraete: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
