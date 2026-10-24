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

console.log('2. App fuehrt aus (ki-assistent.js ueber den Import)');
// App-Umgebung: data, save/renderAll als Attrappe, Import + KI-Module in EINEM
// eval (jsdom gibt jedem eval eigenen const/let-Scope, s. ki-briefkasten-Test).
const app = new JSDOM('<!doctype html><html lang="de"><body><div id="kiAppBanner"></div></body></html>',
    { runScripts: 'outside-only', url: 'https://myworklog.de/' }).window;
Object.defineProperty(app, 'crypto', { value: globalThis.crypto });
let saves = 0;
app.eval(
    'var data = { settings: { hours: [0, 8, 8, 8, 8, 6, 0], break: { min: [0, 30, 30, 30, 30, 15, 0], thresh: 6 }, vacation: { total: 30, used: 0, mode: "days" }, name: "", bundesland: "" }, entries: [], trash: [] };\n' +
    'function save() { window.__saves = (window.__saves || 0) + 1; }\nfunction renderAll() {}\n' +
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

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
if (pass < 25) { console.log('Gegenprobe: zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fail ? 1 : 0);
