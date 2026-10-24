// KI-Briefkasten des Schatten-Berichtshefts (Assets/js/berichtsheft/ki-briefkasten.js).
//   node tools/ki-briefkasten.test.mjs
// Prueft die Teile, die ohne Server laufen: Schluesselpaar, Auspacken mit dem
// falschen Tresor, den Rundweg im Format des MCP-Workers, das Einfuegen aus
// einem Chat, das Normalisieren und die Hash-Kette mit dem Herkunftsvermerk.
// Den Worker selbst (gitignored) prueft workers/mcp-proxy/mcp.test.mjs — dort
// gegen DIESE Entschluesselung.
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const lies = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');

const dom = new JSDOM('<!doctype html><html lang="de"><body></body></html>', { runScripts: 'outside-only', url: 'https://myworklog.de/schatten-berichtsheft/' });
const w = dom.window;
Object.defineProperty(w, 'crypto', { value: globalThis.crypto });
w.TextEncoder = TextEncoder;
w.TextDecoder = TextDecoder;

// Datenteil des Schatten-Moduls (Kategorien, Felder, getCategory …) bis vor
// den Zustand, dazu die Krypto-Helfer — wie kategorien.mjs fuer den Worker.
const schatten = lies('Assets/js/berichtsheft/schatten-berichtsheft.js');
const schnitt = schatten.indexOf('\nlet derivedKey = null;');
ok(schnitt > 0, 'Schnittmarke im Schatten-Modul gefunden');
function funktion(name) {
    const m = new RegExp('\\n(async )?function ' + name + '\\(').exec(schatten);
    if (!m) throw new Error('Funktion fehlt: ' + name);
    return schatten.slice(m.index, schatten.indexOf('\n}\n', m.index) + 3);
}
// EIN eval fuer alles: jsdoms window.eval gibt jedem Aufruf einen eigenen
// Scope fuer const/let — im Browser teilen sich alle <script> einen. Der
// Zugang __ki ist ein direktes eval IN diesem Scope, damit der Test auch
// let-Zustand (kiStatus, derivedKey) setzen kann.
w.eval(schatten.slice(0, schnitt) + '\nlet derivedKey = null;\nlet entries = [];\nlet vaultJournal = [];\nlet vaultMeta = null;\n' +
    'async function contentFingerprint(e) { return "fp-" + e.id; }\nasync function journalRecord(a, e) { vaultJournal.push([a, e.id]); }\n' +
    'async function saveVault() { window.__saved = (window.__saved || 0) + 1; if (window.__saveFehler) throw new Error("voll"); }\n' +
    'function renderEntries() {}\nfunction updateStats() {}\nfunction populateCategorySelects() {}\n' +
    ['strToU8', 'u8ToB64', 'b64ToU8', 'encrypt', 'decrypt'].map(funktion).join('\n') +
    '\nfunction escapeHtml(s){return String(s);}\nfunction openModal(){}\nfunction closeModal(){}\nfunction showToast(){}\n' +
    lies('Assets/js/ki-krypto.js') + '\n' +
    lies('Assets/js/berichtsheft/ki-briefkasten.js') + '\n' +
    lies('Assets/js/berichtsheft/vault-journal.js') +
    '\nwindow.__ki = function (code) { return eval(code); };\n');
const E = (src) => w.__ki(src);

console.log('1. Dialoge angelegt');
ok(!!w.document.getElementById('kiModal') && !!w.document.getElementById('kiInboxModal') && !!w.document.getElementById('kiPasteModal'), 'drei Dialog-Huellen im DOM');

console.log('2. Schluesselpaar');
const master = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
const p = await E('kiSchluesselpaarErzeugen')(master);
ok(p.publicKey.kty === 'EC' && p.publicKey.crv === 'P-256' && p.publicKey.d === undefined, 'oeffentlicher Teil ohne d');
ok(!JSON.stringify(p.privateKey).includes('"d"') && typeof p.privateKey.data === 'string', 'privater Teil nur verpackt');
const priv = await E('kiPrivatSchluesselAuspacken')(p.privateKey, master);
ok(priv.type === 'private' && priv.extractable === false, 'ausgepackt, nicht exportierbar');
const anderer = await crypto.subtle.importKey('raw', crypto.getRandomValues(new Uint8Array(32)), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
let fremdOffen = true;
try { await E('kiPrivatSchluesselAuspacken')(p.privateKey, anderer); } catch (e) { fremdOffen = false; }
ok(!fremdOffen, 'anderer Tresor packt nicht aus (Fall „fremd")');
// Bis v8.8.0 verpackte das Schatten-Modul den Schluessel mit seinem encrypt();
// seit der gemeinsamen ki-krypto.js packt kiAuspacken aus. Alte Schluessel
// muessen lesbar bleiben, sonst stuende jeder bestehende Briefkasten auf „fremd".
const altPaar = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const altVerpackt = await E('encrypt')(JSON.stringify(await crypto.subtle.exportKey('jwk', altPaar.privateKey)), master);
const altAus = await E('kiPrivatSchluesselAuspacken')(altVerpackt, master).catch(() => null);
ok(altAus && altAus.type === 'private', 'mit dem alten encrypt() verpackter Schluessel bleibt lesbar');

console.log('3. Rundweg im Format des Workers');
// Format v1 wie verschluesseln() in workers/mcp-proxy/worker.js. Hier
// nachgebaut, weil der Worker nicht im Repo liegt; der Worker-Test haelt die
// echte Gegenseite gegen dieselbe Entschluesselung.
async function workerFormat(text, jwk) {
    const b64 = u8 => Buffer.from(u8).toString('base64');
    const pub = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, eph.privateKey, 256);
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: new TextEncoder().encode('mwl-ki-entwurf/1') },
        hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
    const epk = await crypto.subtle.exportKey('jwk', eph.publicKey);
    return { v: 1, epk: { kty: 'EC', crv: 'P-256', x: epk.x, y: epk.y }, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}
const payload = await workerFormat(JSON.stringify({ v: 1, kategorie: 'breaks', schwere: 'high', beschreibung: 'Pause gestrichen, schon wieder. Äöü ß.' }), p.publicKey);
const d = await E('kiEntwurfEntschluesseln')(payload, priv);
ok(d.beschreibung === 'Pause gestrichen, schon wieder. Äöü ß.', 'Entwurf gelesen, Umlaute heil');
let v2 = true;
try { await E('kiEntwurfEntschluesseln')({ ...payload, v: 2 }, priv); } catch (e) { v2 = false; }
ok(!v2, 'unbekannte Formatversion wird abgelehnt');

console.log('4. Aus dem Chat einfuegen');
const block = E('kiBlockAusText');
const chat = 'Klar, hier ist dein Entwurf:\n```json\n{"myworklog_entwurf":1,"kategorie":"verbal","schwere":"high","beschreibung":"Er sagte: \\"Halt die {Klappe}\\" vor allen.","zeugen":["Azubi K."]}\n```\nViel Erfolg!';
const o = block(chat);
ok(o && o.kategorie === 'verbal' && o.beschreibung.includes('{Klappe}'), 'Block mit Zaun, Text drumherum und Klammern im String gefunden');
ok(block('{"a":1} und dann {"beschreibung":"x"}').beschreibung === 'x', 'erster passender Block gewinnt, fremde Objekte uebersprungen');
ok(block('Kein JSON hier {kaputt') === null, 'kein Block → null');

console.log('5. Normalisieren');
const norm = E('kiNormalisieren');
const n1 = norm({ kategorie: 'gibtsnicht', schwere: 'mega', beschreibung: 'Text\x07 mit Steuerzeichen', details: { frequency: 'once' } });
ok(n1.kategorie === 'other' && n1.kategorieUnbekannt === true, 'unbekannte Kategorie → Sonstiges, mit Hinweis');
ok(n1.schwere === 'medium', 'unbekannte Schwere → Mittel');
ok(!/[\x00-\x08]/.test(n1.beschreibung), 'Steuerzeichen entfernt');
const n2 = norm({ kategorie: 'unrelated', schwere: 'low', beschreibung: 'Lager', details: { durationMinutes: '90,5', frequency: 'oft', erfunden: 'x', timesPerWeek: -3 } });
ok(n2.details.durationMinutes === '90.5', 'Komma-Zahl gelesen');
ok(n2.details.frequency === undefined && n2.details.erfunden === undefined && n2.details.timesPerWeek === undefined, 'ungueltige und fremde Felder fallen raus');
ok(Object.keys(n2.details).length === 1, 'Gegenprobe: genau ein Feld uebrig');
const n3 = norm({ kategorie: 'verbal', schwere: 'high', beschreibung: 'x', vorfall_datum: '22.10.2026', vorfall_uhrzeit: '25:00' });
ok(n3.datum === '' && n3.uhrzeit === '', 'falsches Datums- und Zeitformat verworfen');

console.log('5b. Selbst uebernehmen (Agent legt an, liest nie)');
const geloescht = [];
let briefkasten = [];
w.vcKi = {
    entwuerfe: async () => briefkasten,
    entwurfLoeschen: async id => { geloescht.push(id); },
};
const zeile = async (id, inhalt) => ({ id, created_at: '2026-10-24T10:00:00Z', expires_at: '2099-01-01T00:00:00Z', payload: await workerFormat(JSON.stringify(inhalt), p.publicKey) });
briefkasten = [
    await zeile('k1', { v: 1, art: 'kategorie', name: 'Mobbing durch Kollegen', hinweis: 'Sprueche' }),
    await zeile('e1', { v: 1, kategorie: 'Mobbing durch Kollegen', neue_kategorie: 'Mobbing durch Kollegen', schwere: 'high', beschreibung: 'Kollege B. hat mich vor allen ausgelacht.', vorfall_datum: '2026-10-20', zeugen: ['Azubi K.'] }),
    await zeile('e2', { v: 1, kategorie: 'Neue Sache', neue_kategorie: 'Neue Sache', schwere: 'low', beschreibung: 'Ohne Datum erzaehlt, nur dass es war.' }),
    await zeile('e3', { v: 1, kategorie: 'breaks', schwere: 'medium', beschreibung: 'Pause gestrichen.', vorfall_datum: '2026-10-21' }),
];
E('(function (m, k) { derivedKey = m; kiPrivKey = k; })')(master, priv);
await E('kiEntwuerfeHolen')();
const ein = E('entries'), kats = E('customCategories');
ok(kats.filter(c => c.label === 'Mobbing durch Kollegen').length === 1 && kats.some(c => c.label === 'Neue Sache'), 'Kategorien angelegt, doppelte (Kategorie + neue_kategorie) nur einmal');
ok(ein.length === 3 && ein.every(e => e.source === 'ai_assisted' && e.status === 'open'), 'drei Eintraege selbst angelegt, mit Vermerk');
const mob = ein.find(e => e.text.startsWith('Kollege'));
ok(mob.category === kats.find(c => c.label === 'Mobbing durch Kollegen').id && mob.date === '2026-10-20' && mob.witnesses[0] === 'Azubi K.', 'Eintrag in der eigenen Kategorie (per Name aufgeloest)');
ok(ein.find(e => e.category === 'breaks') && ein.find(e => e.text.startsWith('Ohne')).timeBasis === undefined && ein.find(e => e.category === 'breaks').timeBasis === 'occurred', 'mit Datum: Vorfallszeit, ohne Datum: Erfassungszeit (Standard)');
ok(E('vaultJournal').filter(j => j[0] === 'create').length === 3, 'jeder Eintrag steht in der Hash-Kette');
ok(['k1', 'e1', 'e2', 'e3'].every(id => geloescht.includes(id)) && E('kiEntwuerfe').length === 0, 'alle Entwuerfe nach dem Speichern geloescht');
// Gegenprobe: scheitert das Speichern, bleibt alles, wie es war — und die Entwuerfe liegen weiter.
geloescht.length = 0;
briefkasten = [await zeile('e9', { v: 1, kategorie: 'breaks', schwere: 'low', beschreibung: 'Noch ein Vorfall.' })];
w.__saveFehler = true;
await E('kiEntwuerfeHolen')();
w.__saveFehler = false;
ok(E('entries').length === 3 && !geloescht.includes('e9') && E('kiEntwuerfe').length === 1, 'Speicherfehler: nichts angelegt, Entwurf bleibt liegen');
ok(!/entwuerfeLesen|eintraegeLesen|entries\s*=\s*await/.test(lies('Assets/js/berichtsheft/ki-briefkasten.js')), 'kein Weg, Eintraege zum Server zu lesen');

console.log('6. Hash-Kette');
const J = w.VaultJournal;
const alt = { id: 'e1', date: '2026-10-22', severity: 'high', category: 'verbal', text: 'x', createdAt: '2026-10-22T10:00:00Z' };
const kanonAlt = J.canonicalEntry(alt);
ok(!kanonAlt.includes('s:'), 'Eintrag ohne Herkunft: kanonische Form unveraendert (alte Hashes bleiben)');
const mitKi = { ...alt, source: 'ai_assisted' };
ok(await J.entryHash(mitKi) !== await J.entryHash(alt), 'Herkunftsvermerk geht in den Hash ein');

console.log('7. Ein Knopf fuer den Agenten');
const prompt = E('kiAgentPrompt')();
ok(prompt.includes('https://mcp.myworklog.de/setup.md'), 'Agenten-Text verweist auf die Anleitung');
ok(prompt.length < 160 && !prompt.includes('\n'), 'Agenten-Text ist eine Zeile (' + prompt.length + ' Zeichen)');
const kSrc = lies('Assets/js/berichtsheft/ki-briefkasten.js');
const fn = kSrc.slice(kSrc.indexOf('async function kiAgentKopieren'), kSrc.indexOf('\n}\n', kSrc.indexOf('async function kiAgentKopieren')));
ok(fn.length > 100, 'Gegenprobe: kiAgentKopieren gefunden');
ok(fn.indexOf('kiKopieren(kiAgentPrompt())') < fn.indexOf('await'), 'kopiert im Klick, BEVOR irgendetwas abgewartet wird');
ok(fn.indexOf('kiEinschalten({ leise: true })') > fn.indexOf('await kopiert'), 'Briefkasten erst nach dem Kopieren');
const bannerHost = w.document.createElement('div');
bannerHost.id = 'kiConnect'; bannerHost.hidden = true;
w.document.body.appendChild(bannerHost);
E('kiStatus = "aus"; derivedKey = null; kiRenderBanner();');
ok(bannerHost.hidden, 'gesperrter Tresor: kein Hinweis');
E('derivedKey = {}; kiRenderBanner();');
ok(!bannerHost.hidden && !!bannerHost.querySelector('.ki-copy'), 'offener Tresor, nichts verbunden: Hinweis mit Knopf');
bannerHost.classList.add('is-done');
E('kiStatus = "an"; kiRenderBanner();');
ok(!bannerHost.hidden, 'nach dem Kopieren bleibt „Fertig" stehen, auch wenn der Briefkasten angesprungen ist');
bannerHost.classList.remove('is-done');
E('kiRenderBanner();');
ok(bannerHost.hidden, 'verbunden, ohne frischen Klick: Hinweis weg');
E('kiStatus = "aus"; delete document.getElementById("kiConnect").dataset.gebaut; kiBannerWeg(); kiRenderBanner();');
ok(bannerHost.hidden && w.localStorage.getItem('mwl_ki_banner_weg') === '1', 'Ausblenden haelt (localStorage)');
E('derivedKey = null;');

console.log('8. Verdrahtung im Schatten-Modul');
ok(/if \(typeof kiPending !== 'undefined' && kiPending\) newEntry\.source = 'ai_assisted';/.test(schatten), 'neuer Eintrag bekommt den Vermerk');
ok(!/updated\.source|prev\.source =/.test(schatten), 'Bearbeiten setzt keinen Vermerk');
ok(/if \(!editId && typeof kiNachSpeichern === 'function'\) kiNachSpeichern\(\);/.test(schatten), 'Entwurf wird erst nach erfolgreichem Speichern geloescht');
ok(!/originalworte/.test(schatten), 'Originalworte landen nicht im Eintrag');
const html = lies('pages/schatten-berichtsheft/index.html');
const tagKi = html.indexOf('<script src="/Assets/js/berichtsheft/ki-briefkasten.js');
const tagKrypto = html.indexOf('<script src="/Assets/js/ki-krypto.js');
ok(tagKrypto > 0 && tagKrypto < tagKi, 'ki-krypto.js laedt vor ki-briefkasten.js');
ok(tagKi > 0 && tagKi > html.indexOf('<script src="/Assets/js/berichtsheft/schatten-berichtsheft.js'),'ki-briefkasten.js laedt nach dem Schatten-Modul');

console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
if (pass < 20) { console.log('Gegenprobe: zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fail ? 1 : 0);
