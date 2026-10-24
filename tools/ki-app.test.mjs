// KI-Briefkasten der App (Zeiterfassung + Berichtsheft).
//   node tools/ki-app.test.mjs
// 1. Datenschicht (Assets/js/ki-app-briefkasten.js) gegen eine Supabase-Attrappe
//    und eine IndexedDB-Attrappe: einschalten, laden, entschluesseln, loeschen —
//    und dass `bereich` ueberall greift (Ausschalten der App darf den
//    Schatten-Briefkasten nicht mitnehmen).
// 2. Rundweg Entwurf → Tabellenzeilen (kiaZeilen) → Import (mwlAnalyzeRows,
//    mwlBuildPreview): ein Tag vom Assistenten muss genauso rechnen wie ein
//    importierter Tag.
// 3. Verdrahtung: Reihenfolge der Skripte, Haken in bh-bericht.js und import.js.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const lies = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');

const dom = new JSDOM('<!doctype html><html lang="de"><body><div id="kiAppBanner" style="display:none"></div></body></html>',
    { runScripts: 'outside-only', url: 'https://myworklog.de/' });
const w = dom.window;
Object.defineProperty(w, 'crypto', { value: globalThis.crypto });
w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;

// ── IndexedDB-Attrappe: nur das, was e2eSchluessel() braucht ─────────────
const e2eKey = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
let idbInhalt = { u1: { uid: 'u1', key: e2eKey } };
w.indexedDB = {
    open() {
        const r = {};
        setTimeout(() => {
            r.result = { transaction: () => ({ objectStore: () => ({ get(uid) {
                const q = {}; setTimeout(() => { q.result = idbInhalt[uid]; q.onsuccess && q.onsuccess(); }); return q;
            } }) }) };
            r.onsuccess && r.onsuccess();
        });
        return r;
    },
};

// ── Supabase-Attrappe: Tabellen im Speicher, Filter wie PostgREST ─────────
const db = { schatten_ki_schluessel: [], schatten_ki_entwuerfe: [] };
let neueId = 1;
function anfrage(tabelle) {
    const f = [];
    let art = 'select', werte = null;
    const treffer = () => db[tabelle].filter(z => f.every(([k, v]) => z[k] === v));
    const b = {
        select() { return b; },
        eq(k, v) { f.push([k, v]); return b; },
        order() { return b; },
        delete() { art = 'delete'; return b; },
        upsert(z) { art = 'upsert'; werte = z; return b; },
        maybeSingle() { art = 'single'; return b; },
        then(ok) {
            let data = null;
            if (art === 'select') data = treffer();
            else if (art === 'single') data = treffer()[0] || null;
            else if (art === 'delete') { const weg = new Set(treffer()); db[tabelle] = db[tabelle].filter(z => !weg.has(z)); }
            else if (art === 'upsert') {
                db[tabelle] = db[tabelle].filter(z => !(z.user_id === werte.user_id && z.bereich === werte.bereich));
                db[tabelle].push({ ...werte });
            }
            return Promise.resolve({ data, error: null }).then(ok);
        },
    };
    return b;
}
const fakeClient = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }), oauth: { getUserGrants: async () => ({ data: [{ client_id: 'c1', client_name: 'Claude' }] }) } },
    from: anfrage,
};

w.eval(lies('Assets/js/ki-krypto.js') + '\n' + lies('Assets/js/ki-app-briefkasten.js') +
    '\nwindow.__k = function (c) { return eval(c); };\n');
const K = w.MWLKiApp;
K.init({ client: async () => fakeClient });

// Entwurf im Format des Workers (verschluesseln() in workers/mcp-proxy/worker.js)
async function workerFormat(obj, jwk) {
    const b64 = u8 => Buffer.from(u8).toString('base64');
    const pub = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, eph.privateKey, 256);
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('mwl-ki-entwurf/1') },
        hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ v: 1, ...obj })));
    const epk = await crypto.subtle.exportKey('jwk', eph.publicKey);
    return { v: 1, epk: { kty: 'EC', crv: 'P-256', x: epk.x, y: epk.y }, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

console.log('1. Datenschicht');
ok(!K.gemerkt(), 'frisches Geraet: kein Merker, also kein Abruf beim Start');
// Schatten-Briefkasten liegt schon da — er darf nie angefasst werden.
db.schatten_ki_schluessel.push({ user_id: 'u1', bereich: 'schatten', public_key: { kty: 'EC' }, private_key: { iv: 'x', data: 'y' } });
db.schatten_ki_entwuerfe.push({ id: 's1', user_id: 'u1', bereich: 'schatten', payload: { v: 1 }, created_at: '2026-10-20T10:00:00Z', expires_at: '2099-01-01T00:00:00Z' });
await K.laden(false);
ok(K.status === 'aus', 'Schatten-Schluessel zaehlt nicht als App-Briefkasten (Status aus)');
await K.einschalten();
const appZeile = db.schatten_ki_schluessel.find(z => z.bereich === 'app');
ok(appZeile && appZeile.public_key.d === undefined && typeof appZeile.private_key.data === 'string', 'App-Paar abgelegt, privat nur verpackt');
ok(K.gemerkt(), 'Merker gesetzt');
const p1 = await workerFormat({ art: 'zeit', eintraege: [{ datum: '2026-10-22', art: 'arbeit', von: '07:30', bis: '16:15', pause_min: 30, stunden: null, notiz: 'Lager' }] }, appZeile.public_key);
db.schatten_ki_entwuerfe.push({ id: 'a1', user_id: 'u1', bereich: 'app', payload: p1, created_at: '2026-10-22T18:00:00Z', expires_at: '2099-01-01T00:00:00Z' });
const p2 = await workerFormat({ art: 'bericht', jahr: 2026, kw: 43, taetigkeiten: '- Switch konfiguriert', tage: {} }, appZeile.public_key);
db.schatten_ki_entwuerfe.push({ id: 'a2', user_id: 'u1', bereich: 'app', payload: p2, created_at: '2026-10-22T18:01:00Z', expires_at: '2099-01-01T00:00:00Z' });
db.schatten_ki_entwuerfe.push({ id: 'alt', user_id: 'u1', bereich: 'app', payload: p1, created_at: '2026-09-01T00:00:00Z', expires_at: '2026-10-01T00:00:00Z' });
await K.laden(true);
ok(K.status === 'an', 'Status an');
ok(K.entwuerfe('zeit').length === 1 && K.entwuerfe('zeit')[0].daten.eintraege[0].von === '07:30', 'Zeit-Entwurf entschluesselt');
ok(K.entwuerfe('bericht').length === 1 && K.entwuerfe('bericht')[0].daten.kw === 43, 'Bericht-Entwurf entschluesselt');
ok(!K.alle.some(e => e.id === 's1'), 'Schatten-Entwurf taucht in der App nicht auf');
ok(!K.alle.some(e => e.id === 'alt'), 'abgelaufener Entwurf wird uebersprungen');
ok(K.verbunden.length === 1 && K.verbunden[0].client_name === 'Claude', 'verbundene Assistenten');
await K.loeschen('a1');
ok(!db.schatten_ki_entwuerfe.some(z => z.id === 'a1') && K.entwuerfe('zeit').length === 0, 'Loeschen eines Entwurfs');
// Anderer Wiederherstellungs-Code → Schluessel passt nicht mehr
const anderer = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
idbInhalt = { u1: { uid: 'u1', key: anderer } };
await K.laden(false);
ok(K.status === 'fremd', 'neuer Code: Status fremd');
idbInhalt = {};
await K.laden(false);
ok(K.status === 'code', 'ohne Code auf dem Geraet: Status code');
idbInhalt = { u1: { uid: 'u1', key: e2eKey } };
await K.ausschalten();
ok(!db.schatten_ki_schluessel.some(z => z.bereich === 'app') && !db.schatten_ki_entwuerfe.some(z => z.bereich === 'app'), 'Ausschalten raeumt den App-Bereich');
ok(db.schatten_ki_schluessel.some(z => z.bereich === 'schatten') && db.schatten_ki_entwuerfe.some(z => z.id === 's1'), 'Schatten-Briefkasten bleibt beim Ausschalten der App unberuehrt');
ok(!K.gemerkt(), 'Merker weg');

// Wochenjahr der Lese-Kopie: KW 1 ab 29.12.2025 gehoert zu 2026, KW 53 ab
// 28.12.2026 zu 2026. year im Bericht ist das Ausbildungsjahr, darf nicht zaehlen.
w.localStorage.setItem('berichtsheft_reports', JSON.stringify([
    { week: 1, year: 1, dateFrom: '2025-12-29' },
    { week: 53, year: 2, dateFrom: '2026-12-28' },
    { week: 43, year: 2, dateFrom: '2026-10-19' },
]));
const ueb = K.berichteUeberblick();
ok(ueb.length === 3, 'Gegenprobe: drei Wochen im Ueberblick');
ok(ueb[0].jahr === 2026 && ueb[1].jahr === 2026 && ueb[2].jahr === 2026, 'Wochenjahr nach Donnerstag, nicht nach Montag oder Ausbildungsjahr');
w.localStorage.removeItem('berichtsheft_reports');

console.log('2. App fuehrt aus (ki-assistent.js ueber den Import)');
// App-Umgebung: data, save/renderAll als Attrappe, Import + KI-Module in EINEM
// eval (jsdom gibt jedem eval eigenen const/let-Scope, s. ki-briefkasten-Test).
const app = new JSDOM('<!doctype html><html lang="de"><body><div id="kiAppBanner"></div><div id="timerBox"></div>' +
    '<input type="checkbox" id="alertMaster" checked><input type="checkbox" id="alertDailyReminders" checked></body></html>',
    { runScripts: 'outside-only', url: 'https://myworklog.de/' }).window;
Object.defineProperty(app, 'crypto', { value: globalThis.crypto });
let saves = 0;
// Stempeluhr: die ECHTE logTimerAction aus timer.js (sie fuehrt breakTime),
// der Rest als Attrappe. Ausgeschnitten bis zur ersten Zeile, die nur "    }" ist.
const timerSrc = lies('components/core/timer.js').split('\r\n').join('\n');
const lt0 = timerSrc.indexOf('    function logTimerAction');
const logTimerAction = timerSrc.slice(lt0, timerSrc.indexOf('\n    }\n', lt0) + 6);
ok(lt0 > 0 && logTimerAction.includes('timer.breakTime +='), 'Gegenprobe: logTimerAction aus timer.js ausgeschnitten');
app.eval(
    'var data = { settings: { hours: [0, 8, 8, 8, 8, 6, 0], break: { min: [0, 30, 30, 30, 30, 15, 0], thresh: 6 }, vacation: { total: 30, used: 0, mode: "days" }, name: "", bundesland: "" }, entries: [], trash: [] };\n' +
    'function save() { window.__saves = (window.__saves || 0) + 1; }\nfunction renderAll() {}\n' +
    'var timer = { id: null, start: 0, paused: 0, running: false, log: [], breakTime: 0 };\n' +
    'function saveTimerState() { localStorage.setItem("tg_timer", JSON.stringify(timer)); }\nfunction renderTimerLogBar() {}\nfunction timerRun() {}\nfunction displayTimerTime() {}\n' +
    logTimerAction + '\n' +
    lies('components/import/import.js') + '\n' + lies('Assets/js/ki-krypto.js') + '\n' + lies('Assets/js/ki-app-briefkasten.js') + '\n' +
    lies('components/core/ki-assistent.js') + '\nwindow.__a = function (c) { return eval(c); };');
const A = app.__kia;
ok(!!A && typeof A.ausfuehren === 'function', 'Gegenprobe: App-Modul geladen');
const auftrag = (art, rest) => ({ id: art + Math.random(), daten: Object.assign({ v: 1, art }, rest) });
// Mo 19.10. 07:30–16:15 ohne genannte Pause → Standard 30 min (≥ 6 h), Fr 23.10. → 15 min
let r = A.ausfuehren([auftrag('zeit', { eintraege: [
    { datum: '2026-10-19', art: 'arbeit', von: '07:30', bis: '16:15', pause_min: null, stunden: null, notiz: 'Lager; Netzwerk' },
    { datum: '2026-10-20', art: 'schule', von: '', bis: '', pause_min: null, stunden: null, notiz: 'LF 4' },
    { datum: '2026-10-21', art: 'arbeit', von: '', bis: '', pause_min: null, stunden: 7.5, notiz: '' },
    { datum: '2026-10-23', art: 'arbeit', von: '08:00', bis: '14:30', pause_min: null, stunden: null, notiz: '' },
    { datum: '2026-10-22', art: 'urlaub', von: '', bis: '', pause_min: null, stunden: null, notiz: '' },
] })]);
const E = d => app.__a('data').entries.find(x => x.date === d);
ok(r.z.neu === 5, 'fuenf Tage eingetragen');
ok(E('2026-10-19').worked === 8.25 && E('2026-10-19').breakMins === 30 && E('2026-10-19').diff === 0.25, 'Mo: Standardpause 30 min ab 6 h → 8,25 h, +0,25');
ok(E('2026-10-23').breakMins === 15 && E('2026-10-23').worked === 6.25, 'Fr: Pause des Wochentags (15 min) → 6,25 h');
ok(E('2026-10-20').type === 'school' && E('2026-10-20').worked === 8 && E('2026-10-20').diff === 0, 'Schule ohne Zeiten traegt das Tagessoll');
ok(E('2026-10-21').worked === 7.5 && E('2026-10-21').breakMins === 0, 'reine Stundenzahl ohne Pausenabzug');
ok(E('2026-10-19').info === '07:30 - 16:15 (30m Pause) | Lager; Netzwerk' && A.nutzerNotiz(E('2026-10-19').info) === 'Lager; Netzwerk', 'Notiz wie handleEntry, Nutzertext wieder lesbar');
ok(A.nutzerNotiz(E('2026-10-20').info) === 'LF 4', 'Notiz eines Schultags bleibt erhalten');
ok(E('2026-10-19').quelle === 'ki', 'Herkunft vermerkt');
r = A.ausfuehren([auftrag('zeit', { eintraege: [{ datum: '2026-10-19', art: 'arbeit', von: '09:00', bis: '17:00', pause_min: null, stunden: null, notiz: '' }] })]);
ok(r.z.neu === 0 && r.z.doppelt === 1 && app.__a('data').entries.length === 5, 'vorhandener Tag wird nicht doppelt angelegt');
const mo = E('2026-10-19');
r = A.ausfuehren([auftrag('zeit_aendern', { aenderungen: [{ id: String(mo.id), bis: '17:15' }, { id: 'gibtsnicht', bis: '10:00' }] })]);
ok(r.z.geaendert === 1 && r.z.unbekannt === 1, 'Aenderung angewandt, unbekannte id uebersprungen');
ok(E('2026-10-19').id === mo.id && E('2026-10-19').worked === 9.25 && E('2026-10-19').breakMins === 30, 'neues Ende, Standardpause erneut, gleiche id');
ok(A.nutzerNotiz(E('2026-10-19').info) === 'Lager; Netzwerk', 'Notiz uebersteht die Aenderung');
const fr = E('2026-10-23');
r = A.ausfuehren([auftrag('zeit_loeschen', { ids: [String(fr.id)] })]);
ok(r.z.geloescht === 1 && !E('2026-10-23') && app.__a('data').trash.some(t => t.entry.id === fr.id), 'Loeschen schiebt in den Papierkorb');
const undoLoeschen = r.undo;
r = A.ausfuehren([auftrag('einstellungen', { patch: { name: 'Anna', beruf: 'Koch', bundesland: 'BY', sollstunden: { freitag: 7 }, pausen: { montag: 45 }, pause_ab_stunden: 6, urlaubstage: 28 } })]);
const S = app.__a('data').settings;
ok(S.name === 'Anna' && S.bundesland === 'BY' && S.hours[5] === 7 && S.break.min[1] === 45 && S.vacation.total === 28, 'Einstellungen gesetzt (Index 0 = Sonntag)');
ok(S.job === 'sonstige' && S.jobCustom === 'Koch', 'unbekannter Beruf als Freitext');
r.undo.forEach(f => f());
ok(S.name === '' && S.hours[5] === 6 && S.break.min[1] === 30, 'Rueckgaengig stellt die Einstellungen wieder her');
r = A.ausfuehren([auftrag('einstellungen', { patch: { name: 'Anna', betrieb: 'Zahn Pinsel GmbH', ausbildung_beginn: '2025-08-01' } })]);
const cfg = JSON.parse(app.localStorage.getItem('pdf_personal_cfg') || '{}');
ok(cfg.betrieb === 'Zahn Pinsel GmbH' && cfg.name === 'Anna' && cfg.beginn === '01.08.2025', 'Deckblatt landet in pdf_personal_cfg (Datum wie im Formular)');
r.undo.forEach(f => f());
ok(app.localStorage.getItem('pdf_personal_cfg') === null, 'Rueckgaengig nimmt das Deckblatt zurueck');
undoLoeschen.forEach(f => f());
ok(!!E('2026-10-23') && !app.__a('data').trash.some(t => t.entry.id === fr.id), 'Rueckgaengig holt den geloeschten Tag zurueck');

console.log('2b. Alles aendern (freie Pfade, eigene Typen)');
app.__a('data.settings.weather = { apiKey: "GEHEIM", ort: "Ulm" }; data.settings.goals = [{ t: "a" }, { t: "b" }]');
r = A.ausfuehren([auftrag('daten', { operationen: [
    { op: 'setzen', pfad: 'settings.break.thresh', wert: 4 },
    { op: 'setzen', pfad: 'settings.hours', wert: 'kaputt' },                 // Typwechsel → uebersprungen
    { op: 'setzen', pfad: 'entries.0.worked', wert: 99 },                    // gesperrt
    { op: 'setzen', pfad: 'settings.weather.apiKey', wert: 'X' },            // gesperrt
    { op: 'loeschen', pfad: 'settings.goals.0' },
    { op: 'zusammenfuehren', pfad: 'settings.ihk', wert: { exam_zwischen: '2027-03-10' } },
    { op: 'anhaengen', pfad: 'customEntryTypes', wert: { id: 'custom-ki-homeoffice', label: 'Homeoffice', color: 'rot', countsAsWork: false } },
] })]);
const D = app.__a('data');
ok(r.z.unbekannt === 3 && D.settings.break.thresh === 4 && Array.isArray(D.settings.hours), 'vier Operationen angewandt, Typwechsel und gesperrte Pfade uebersprungen');
ok(D.entries.every(x => x.worked !== 99) && D.settings.weather.apiKey === 'GEHEIM', 'entries und Schluessel unberuehrt');
ok(D.settings.goals.length === 1 && D.settings.goals[0].t === 'b' && D.settings.ihk.exam_zwischen === '2027-03-10', 'loeschen per Index und zusammenfuehren');
ok(D.customEntryTypes[0].color === '#64748b' && D.customEntryTypes[0].iconMode === 'svg', 'eigener Typ in Form gebracht (Farbe, Felder wie createCustomType)');
ok(!JSON.stringify(A.appDaten()).includes('GEHEIM') && A.appDaten().settings.weather.ort === 'Ulm' && !('entries' in A.appDaten()), 'Lese-Kopie ohne Schluessel und ohne entries');
const undoDaten = r.undo;
app.__a('function getEntryTypeInfo(id) { return (data.customEntryTypes || []).find(t => t.id === id); }');
r = A.ausfuehren([auftrag('zeit', { eintraege: [{ datum: '2026-10-16', art: 'custom-ki-homeoffice', von: '08:00', bis: '16:00', pause_min: null, stunden: null, notiz: 'Tickets' }] })]);
const ho = E('2026-10-16');
ok(r.z.neu === 1 && ho.type === 'custom-ki-homeoffice' && ho.worked === 8 && ho.breakMins === 0 && ho.diff === 0, 'eigener Typ: keine Standardpause, neutral ohne countsAsWork');
r = A.ausfuehren([auftrag('zeit_aendern', { aenderungen: [{ id: String(ho.id), bis: '15:00' }] })]);
ok(E('2026-10-16').type === 'custom-ki-homeoffice' && E('2026-10-16').worked === 7, 'Aendern behaelt den eigenen Typ');
undoDaten.forEach(f => f());
ok(app.__a('data').settings.break.thresh === 6 && app.__a('data').settings.goals.length === 2 && app.__a('data').settings.weather.apiKey === 'GEHEIM', 'Rueckgaengig stellt den Schnappschuss wieder her, Schluessel bleiben');

console.log('2c. Vermerke der App sind keine Notizen');
ok(A.infoTeile('Keine Berufsschule (Regulär) | ').notiz === '' && A.infoTeile('Keine Berufsschule (Regulär) | ').vermerk === 'Keine Berufsschule (Regulär)', 'Schul-Etikett ohne Notiz → leere Notiz');
ok(A.infoTeile('Berufsschule (automatisch vorgeschlagen)').notiz === '', 'Schulregel-Etikett → leere Notiz');
ok(A.infoTeile('07:00 - 12:15 (15m Pause) | putzen').notiz === 'putzen', 'echte Notiz bleibt');
ok(A.infoTeile('Urlaubstag | Mallorca').notiz === 'Mallorca' && A.infoTeile('LF 4').notiz === 'LF 4', 'Gegenprobe: Notizen ohne und mit Vermerk');

console.log('2d. Stempeluhr');
// Fester Tag in der Vergangenheit: Zeitpunkte nach "jetzt" kappt die App.
const T = (art, uhrzeit, notiz) => auftrag('timer', { aktion: art, datum: '2026-09-01', uhrzeit, notiz: notiz || '' });
const tm = () => app.__a('timer');
r = A.ausfuehren([T('stop', '10:00')]);
ok(r.z.neu === 0 && /NICHT gebucht/.test(app.__a('MWLKiApp.protokoll()[0].text')), 'Stop ohne laufende Uhr bucht nichts und sagt es');
const vorTimer = app.__a('data').entries.length;
A.ausfuehren([T('start', '07:30')]);
ok(tm().running && new Date(tm().start).getHours() === 7 && new Date(tm().start).getMinutes() === 30, 'Start mit der Uhrzeit aus dem Auftrag, nicht jetzt');
A.ausfuehren([T('pause', '12:00')]);
ok(!tm().running && tm().paused === 4.5 * 36e5, 'Pause: 4,5 h Laufzeit festgehalten');
A.ausfuehren([T('weiter', '12:30')]);
ok(tm().running && tm().breakTime === 30 * 6e4, 'Weiter: 30 min Pause gemessen');
r = A.ausfuehren([T('stop', '16:00', 'Server')]);
const ste = app.__a('data').entries.find(x => x.date === '2026-09-01');
// 🔴 7:30–16:00 mit 30 min Pause sind 8,0 h. handleEntry() zoege die gemessene
// Pause ein zweites Mal ab (7,5 h) — genau das darf hier nicht passieren.
ok(r.z.neu === 1 && app.__a('data').entries.length === vorTimer + 1 && ste.start === '07:30' && ste.end === '16:00' && ste.breakMins === 30 && ste.worked === 8,
    'Stop bucht 07:30–16:00, 30 min Pause, 8,0 h');
ok(/^Live-Tracker \(8\.00h\)/.test(ste.info) && A.nutzerNotiz(ste.info) === 'Server', 'Vermerk wie der Tracker, Notiz bleibt');
ok(!tm().running && tm().paused === 0 && tm().log.length === 0, 'Uhr nach dem Stop zurueckgesetzt');
r.undo.forEach(f => f());
ok(!app.__a('data').entries.some(x => x.date === '2026-09-01') && tm().running, 'Rueckgaengig: Eintrag weg, Uhr laeuft wieder');
app.__a('Object.assign(timer, { start: 0, paused: 0, running: false, log: [], breakTime: 0 })');
A.ausfuehren([T('start', '06:00')]);
r = A.ausfuehren([T('stop', '14:00')]);
ok(app.__a('data').entries.find(x => x.date === '2026-09-01').breakMins === 30, 'ohne gemessene Pause gilt die Mindestpause des Wochentags');
app.__a('data.entries = data.entries.filter(x => x.date !== "2026-09-01")');

console.log('2e. Aufgaben und Meldungen');
r = A.ausfuehren([auftrag('aufgaben', { operationen: [
    { aktion: 'anlegen', name: 'Bericht KW 44', liste: 'Schule', faellig: '2026-10-30', prioritaet: 'high', unteraufgaben: ['Montag', 'Dienstag'] },
    { aktion: 'anlegen', name: 'Kabel bestellen' },
    { aktion: 'notiz_anlegen', text: 'Schluessel beim Pfoertner' },
    { aktion: 'loeschen', id: 'tk_gibtsnicht' },
] })]);
const cats = JSON.parse(app.localStorage.getItem('mwl_tasks_cats'));
const schule = cats.find(c => c.name === 'Schule'), inbox = cats.find(c => c.id === 'cat_inbox');
ok(r.z.aufgaben === 3 && schule && schule.tasks[0].due === '2026-10-30' && schule.tasks[0].priority === 'high' && schule.tasks[0].subtasks.length === 2, 'Aufgabe in neuer Liste mit Datum, Prioritaet, Unteraufgaben');
ok(inbox && inbox.tasks[0].name === 'Kabel bestellen' && inbox.tasks[0].recurring === 'none', 'ohne Liste in den Eingang, Felder wie aufgaben.js');
ok(JSON.parse(app.localStorage.getItem('mwl_tasks_notes'))[0].text === 'Schluessel beim Pfoertner', 'Notiz angelegt');
ok(app.__a('MWLKiApp.protokoll()').some(p => /NICHT loeschen: Aufgabe tk_gibtsnicht/.test(p.text)), 'unbekannte id steht im Protokoll');
const tid = schule.tasks[0].id;
A.ausfuehren([auftrag('aufgaben', { operationen: [{ aktion: 'erledigt', id: tid }, { aktion: 'aendern', id: inbox.tasks[0].id, liste: 'Schule', name: 'Kabel Cat6 bestellen' }] })]);
const cats2 = JSON.parse(app.localStorage.getItem('mwl_tasks_cats')), st2 = JSON.parse(app.localStorage.getItem('mwl_tasks_states'));
ok(st2[tid] === true && cats2.find(c => c.name === 'Schule').tasks[0].doneAt && JSON.parse(app.localStorage.getItem('mwl_tasks_stats')).done === 1, 'erledigt: Haken, Zeitpunkt, Zaehler');
ok(cats2.find(c => c.name === 'Schule').tasks.some(t => t.name === 'Kabel Cat6 bestellen') && cats2.find(c => c.id === 'cat_inbox').tasks.length === 0, 'aendern verschiebt in andere Liste und benennt um');
const agK = A.kiaSpiegel().aufgaben;
ok(agK.listen.find(l => l.name === 'Schule').aufgaben.find(a => a.id === tid).erledigt === true && agK.notizen.length === 1, 'Lese-Kopie zeigt Aufgaben mit erledigt und Notizen');
r = A.ausfuehren([auftrag('aufgaben', { operationen: [{ aktion: 'loeschen', id: tid }] })]);
r.undo.forEach(f => f());
ok(JSON.parse(app.localStorage.getItem('mwl_tasks_cats')).find(c => c.name === 'Schule').tasks.some(t => t.id === tid), 'Rueckgaengig holt die geloeschte Aufgabe zurueck');
r = A.ausfuehren([auftrag('meldungen', { schalter: { dailyReminders: false } })]);
ok(JSON.parse(app.localStorage.getItem('timetracker_alert_settings_v2')).dailyReminders === false && !app.document.getElementById('alertDailyReminders').checked, 'Meldung aus: Haken und Speicher');
ok(A.kiaSpiegel().meldungen.dailyReminders === false && A.kiaSpiegel().meldungen.master === true, 'Lese-Kopie: Schalter mit Vorgabe an');
r.undo.forEach(f => f());
ok(app.localStorage.getItem('timetracker_alert_settings_v2') === null, 'Rueckgaengig stellt die Meldungen zurueck');

console.log('2f. Klasse');
const kl = { beigetreten: 0, vorgemerkt: null, abgleich: 0, z: null };
app.MWLKlasse = {
    codeNorm: c => /^[A-HJKMNP-Z2-9]{8}$/.test(String(c).replace(/-/g, '')) ? String(c).replace(/-/g, '') : null,
    codeFmt: c => c.slice(0, 4) + '-' + c.slice(4),
    laden: async c => c === 'TESTKX22' ? { code: c, name: 'FISI 25a', version: 3, schultage: [3], faecher: ['LF5'] } : null,
    zustand: () => kl.z,
    planen: () => [{ id: 'schultage', gleich: false }, { id: 'faecher', gleich: false }, { id: 'bundesland', gleich: true }],
    beitreten: async () => { kl.beigetreten++; },
    vormerken: (p, auswahl) => { kl.vorgemerkt = auswahl; kl.z = { code: p.code, name: p.name, profil: p, beigetreten: Date.parse('2026-10-24T10:00:00') }; },
    appAbgleich: async () => { kl.abgleich++; },
    austreten: () => { kl.z = null; },
};
let kz = { einstellungen: [] };
await A.klasseAuftrag({ aktion: 'beitreten', code: 'ZZZZZZ22' }, kz);
ok(kl.beigetreten === 0 && /gehört zu keiner Klasse/.test(app.__a('MWLKiApp.protokoll()[0].text')), 'unbekannter Code: kein Beitritt, Grund im Protokoll');
await A.klasseAuftrag({ aktion: 'beitreten', code: 'TESTKX22', bereiche: ['faecher', 'bundesland'] }, kz);
ok(kl.beigetreten === 1 && JSON.stringify(kl.vorgemerkt) === '["faecher"]' && kl.abgleich === 1, 'Beitritt wie auf /klasse/: nur gewaehlte, abweichende Bereiche, dann Abgleich');
ok(A.kiaSpiegel().klasse.name === 'FISI 25a' && A.kiaSpiegel().klasse.faecher[0] === 'LF5' && !('push' in A.kiaSpiegel().klasse), 'Lese-Kopie zeigt die Klasse ohne Geraete-Daten');
await A.klasseAuftrag({ aktion: 'beitreten', code: 'TESTKX22' }, kz);
ok(kl.beigetreten === 1, 'schon Mitglied: kein zweiter Beitritt, nur aktualisieren');
await A.klasseAuftrag({ aktion: 'austreten' }, kz);
ok(kl.z === null && A.kiaSpiegel().klasse === null && /ausgetreten aus FISI 25a/.test(app.__a('MWLKiApp.protokoll()[0].text')), 'Austreten');

console.log('3. Lese-Kopie');
const sp = A.kiaSpiegel();
ok(sp.einstellungen.sollstunden.montag === 8 && sp.einstellungen.sollstunden.sonntag === 0, 'Sollstunden je Wochentag benannt');
ok(sp.eintraege.every(x => typeof x.id === 'string') && sp.eintraege.some(x => x.art === 'schule'), 'Eintraege mit id als Text und Art auf Deutsch');
ok(!JSON.stringify(sp).includes('schatten'), 'kein Schatten-Inhalt in der Kopie');
ok(Array.isArray(sp.offene_tage) && sp.offene_tage.every(d => [1, 2, 3, 4, 5].includes(new Date(d + 'T12:00:00').getDay())), 'fehlende Tage nur an Tagen mit Soll');
// Gegenprobe: einen Arbeitstag herausnehmen — er muss als fehlend erscheinen
// (sonst waere die Pruefung darueber mit einer leeren Liste gruen).
app.__a('data.entries = data.entries.filter(x => x.date !== "2026-10-21")');
ok(A.kiaSpiegel().offene_tage.includes('2026-10-21'), 'Gegenprobe: herausgenommener Arbeitstag steht als fehlend da');

console.log('4. Verdrahtung');
const tpl = lies('index.template.html');
const pos = n => tpl.indexOf('src="/' + n);
ok(pos('components/import/import.js') > 0 && pos('Assets/js/ki-krypto.js') > pos('components/import/import.js') &&
    pos('Assets/js/ki-app-briefkasten.js') > pos('Assets/js/ki-krypto.js') && pos('components/core/ki-assistent.js') > pos('Assets/js/ki-app-briefkasten.js'),
    'App: import → ki-krypto → ki-app-briefkasten → ki-assistent');
const bh = lies('pages/berichtsheft/index.html');
const bpos = n => bh.indexOf('src="/' + n);
ok(bpos('Assets/js/berichtsheft/bh-b2b.js') > 0 && bpos('Assets/js/berichtsheft/bh-ki.js') > bpos('Assets/js/ki-app-briefkasten.js') &&
    bpos('Assets/js/ki-app-briefkasten.js') > bpos('Assets/js/berichtsheft/bh-b2b.js'), 'Berichtsheft: bh-b2b → ki-app-briefkasten → bh-ki');
const save = lies('Assets/js/berichtsheft/bh-bericht.js');
const s0 = save.indexOf('async function saveReport');
ok(save.indexOf('bhKiNachSpeichern()', s0) > save.indexOf('saveToStorage();', s0) &&
    save.indexOf('bhKiNachSpeichern()', s0) < save.indexOf('closeReportModal();', s0), 'Entwurf erst nach dem Speichern und vor dem Schliessen geloescht');
const kia = lies('components/core/ki-assistent.js');
const ka = kia.indexOf('async function kiaAusfuehren');
ok(ka > 0 && kia.indexOf('MWLKiApp.loeschen', ka) > kia.indexOf('nachAenderung()', ka), 'Auftraege erst nach dem Speichern aus dem Briefkasten');

console.log('5. Berichtsheft: Wochen aendern (bh-ki.js)');
const bhw = new JSDOM('<!doctype html><html lang="de"><body></body></html>', { runScripts: 'outside-only', url: 'https://myworklog.de/berichtsheft/' }).window;
Object.defineProperty(bhw, 'crypto', { value: globalThis.crypto });
bhw.eval(
    'function L(de, en) { return de; }\n' +
    'var reports = [' +
    ' { id: "w1", week: 1, year: 1, dateFrom: "2025-12-29", dateTo: "2026-01-02", mode: "weekly", activities: "Alt", school: "LF2", status: "incomplete", hours: 38 },' +
    ' { id: "w2", week: 43, year: 2, dateFrom: "2026-10-19", dateTo: "2026-10-23", mode: "daily", dailyActivities: { monday: "Mo alt", tuesday: "Di alt" }, activities: "", status: "complete" },' +
    ' { id: "w3", week: 42, year: 2, dateFrom: "2026-10-12", dateTo: "2026-10-16", mode: "weekly", activities: "x", status: "signed", approval: { state: "approved", server: true } },' +
    ' { id: "w4", week: 41, year: 2, dateFrom: "2026-10-05", dateTo: "2026-10-09", mode: "weekly", activities: "y", status: "signed", approval: { state: "approved", by: "Herr M." } } ];\n' +
    'function saveToStorage() { localStorage.setItem("berichtsheft_reports", JSON.stringify(reports)); }\nfunction updateUI() {}\n' +
    'var BHB2B = { client: async () => null, angemeldet: () => false };\n' +
    lies('Assets/js/berichtsheft/bh-tagesmodus.js').replace(/^document\.addEventListener[\s\S]*$/m, '') + '\n' +
    lies('Assets/js/berichtsheft/bh-freigabe.js') + '\n' +
    lies('Assets/js/ki-krypto.js') + '\n' + lies('Assets/js/ki-app-briefkasten.js') + '\n' + lies('Assets/js/berichtsheft/bh-ki.js') +
    '\nwindow.__b = function (c) { return eval(c); };');
const BK = bhw.__bhki;
ok(!!BK && typeof bhw.__b('combineDailyToWeeklyText') === 'function' && typeof bhw.__b('bhIsLocked') === 'function', 'Gegenprobe: bh-ki, Tagesmodus und Freigabe geladen');
ok(BK.berichtZurWoche(2026, 1) && BK.berichtZurWoche(2026, 1).id === 'w1' && !BK.berichtZurWoche(2025, 1), 'KW 1 ab 29.12.2025 ist KW 1/2026 (ISO-Wochenjahr)');
let be = BK.aendern({ jahr: 2026, kw: 43, felder: { tage: { montag: 'Mo neu', dienstag: '' }, status: 'complete' } });
const w2 = bhw.__b('reports').find(x => x.id === 'w2');
ok(!be.fehler && w2.dailyActivities.monday === 'Mo neu' && !('tuesday' in w2.dailyActivities) && /Montag:\nMo neu/.test(w2.activities), 'Tagestext ersetzt, leerer Tag entfernt, Wochentext neu zusammengesetzt');
be = BK.aendern({ jahr: 2026, kw: 43, felder: { berufsschule: 'LF5' } });
ok(be.fehler && /Tagesbericht/.test(be.fehler), 'Tagesbericht: Berufsschul-Feld abgelehnt (ausgeblendet im Formular)');
be = BK.aendern({ jahr: 2026, kw: 1, felder: { taetigkeiten: 'Neu', abteilung: 'IT', stunden: 40 } });
const w1 = bhw.__b('reports').find(x => x.id === 'w1');
ok(!be.fehler && w1.activities === 'Neu' && w1.department === 'IT' && w1.hours === 40 && w1.school === 'LF2', 'Wochentext und Felder geaendert, Rest bleibt');
ok(be.vorher.activities === 'Alt', 'Vorher-Stand fuer Rueckgaengig');
be = BK.aendern({ jahr: 2026, kw: 42, felder: { status: 'incomplete' }, freigabe_aufheben: true });
ok(be.fehler && /Betrieb/.test(be.fehler) && bhw.__b('reports').find(x => x.id === 'w3').status === 'signed', 'Betriebs-Freigabe: nie aenderbar, auch nicht mit freigabe_aufheben');
be = BK.aendern({ jahr: 2026, kw: 41, felder: { taetigkeiten: 'z' } });
ok(be.fehler && /bestätigt/.test(be.fehler), 'lokale Bestaetigung: ohne freigabe_aufheben abgelehnt');
be = BK.aendern({ jahr: 2026, kw: 41, felder: { taetigkeiten: 'z' }, freigabe_aufheben: true });
const w4 = bhw.__b('reports').find(x => x.id === 'w4');
ok(!be.fehler && !w4.approval && w4.status === 'complete' && w4.activities === 'z', 'mit freigabe_aufheben: Bestaetigung entfaellt wie in editReport()');
ok(BK.aendern({ jahr: 2026, kw: 30, felder: { status: 'complete' } }).fehler, 'unbekannte Woche → Fehler');
bhw.__b('saveToStorage()');
const ueb5 = bhw.__b('MWLKiApp.berichteUeberblick()');
ok(ueb5.find(b => b.kw === 42).freigabe === 'abgezeichnet (Betrieb)' && ueb5.find(b => b.kw === 43).tage.monday === 'Mo neu' && ueb5.find(b => b.kw === 1).berufsschule === 'LF2', 'Kopie: volle Texte und Freigabe-Wort, wie der Worker es erwartet');
bhw.__b('saveToStorage()');
ok(bhw.__b('window.saveToStorage._kiKopie') === true, 'Speichern im Berichtsheft frischt die Kopie auf (Haken an saveToStorage)');

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
if (pass < 25) { console.log('Gegenprobe: zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fail ? 1 : 0);
