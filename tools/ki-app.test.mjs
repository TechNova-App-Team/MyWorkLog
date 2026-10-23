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

console.log('2. Rundweg Entwurf → Import');
const imp = new JSDOM('<!doctype html><html lang="de"><body></body></html>', { runScripts: 'outside-only' }).window;
imp.eval(lies('components/import/import.js') + '\nwindow.__i = function (c) { return eval(c); };');
// kiaZeilen aus dem App-Modul, ohne den Rest des Moduls zu starten
const kiaSrc = lies('components/core/ki-assistent.js');
const a = kiaSrc.indexOf('    function kiaZeilen(');
const zeilenSrc = kiaSrc.slice(a, kiaSrc.indexOf('\n    }\n', a) + 7);
ok(a > 0, 'Gegenprobe: kiaZeilen gefunden');
const kiaZeilen = new Function(zeilenSrc + '\nreturn kiaZeilen;')();
const rows = kiaZeilen([{ daten: { art: 'zeit', eintraege: [
    { datum: '2026-10-19', art: 'arbeit', von: '07:30', bis: '16:15', pause_min: 30, stunden: null, notiz: 'Lager; Netzwerk' },
    { datum: '2026-10-20', art: 'schule', von: '', bis: '', pause_min: 0, stunden: null, notiz: '' },
    { datum: '2026-10-21', art: 'arbeit', von: '', bis: '', pause_min: 0, stunden: 7.5, notiz: '' },
    { datum: '2026-10-22', art: 'urlaub', von: '', bis: '', pause_min: 0, stunden: null, notiz: '' },
] } }]);
const an = imp.__i('mwlAnalyzeRows')(rows);
ok(an.hadHeader && ['date', 'start', 'end', 'hours', 'break', 'type', 'info'].every(k => an.mapping[k] !== undefined), 'Import erkennt alle sieben Spalten am Kopf');
const vorschau = imp.__i('mwlBuildPreview')(an.body, an.mapping, { expectedFor: () => 8 });
const e = vorschau.map(r => r.entry);
ok(vorschau.every(r => r.ok), 'alle Zeilen gueltig');
ok(e[0].type === 'work' && e[0].worked === 8.25 && e[0].breakMins === 30 && e[0].diff === 0.25, 'Arbeit 07:30–16:15, 30 min Pause → 8,25 h, +0,25');
ok(e[0].info === 'Lager; Netzwerk', 'Notiz mit Semikolon bleibt heil');
ok(e[1].type === 'school' && e[1].worked === 8 && e[1].diff === 0, 'Schule traegt das Tagessoll');
ok(e[2].worked === 7.5 && e[2].breakMins === 0 && e[2].diff === -0.5, 'reine Stundenzahl 7,5 ohne Pausenabzug');
ok(e[3].type === 'vacation', 'Urlaub erkannt');

console.log('3. Verdrahtung');
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
const im = lies('components/import/import.js');
const ap = im.indexOf('function mwlImportApply');
ok(im.indexOf('_mwlImport.nachher()', ap) > im.indexOf('save();', ap), 'Import ruft den Nachlauf erst nach save()');

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
if (pass < 25) { console.log('Gegenprobe: zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fail ? 1 : 0);
