// ═══ VAULT-CLOUD TEST ═══
//
// Prueft den eigenen Sync-Weg des Schatten-Tresors
// (Assets/js/berichtsheft/vault-cloud.js) gegen eine Supabase-Attrappe.
//
// Warum ueberhaupt: die Spalten heissen snake_case, der Spiegel im JS
// camelCase. Eine vertippte Zuordnung faellt NIRGENDS auf — der Upload meldet
// Erfolg, die Zeile steht da, und erst auf dem zweiten Geraet fehlt still das
// Aktenzeichen oder der Zeitbezug. Genau deshalb wird hier Feld fuer Feld
// gegengeprueft, in beide Richtungen.
//
// Aufruf:  node tools/vault-cloud.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const lies = p => fs.readFileSync(path.join(ROOT, p), 'utf8').split('\r\n').join('\n');

let fehler = 0, geprueft = 0;
const ok = (name, bedingung, detail = '') => {
    geprueft++;
    if (!bedingung) fehler++;
    console.log(`  ${bedingung ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
};

const REF = 'fouucibowmukxvweratn';
const SPIEGEL = {
    v: 2,
    caseId: 'SB-2026-0042',
    salt: 'c2FsdA==',
    pwHash: 'hash123',
    wrappedKey: { iv: 'aXY=', data: 'ZGF0YQ==' },
    updatedAt: '2026-09-04T10:00:00.000Z',
    timeBasis: { mode: 'utc' },
    entries: { iv: 'ZWl2', data: 'ZWRhdGE=' },
    categories: { iv: 'Y2l2', data: 'Y2RhdGE=' },
    filesLocalOnly: true
};

/** Baut eine Seite mit vault-cloud.js und einer Supabase-Attrappe. */
function baue({ sitzung = true, zeile = null, userFehlt = false, fehlerBeim = null } = {}) {
    const dom = new JSDOM('<!doctype html><body>', { runScripts: 'outside-only', url: 'https://myworklog.de/' });
    const w = dom.window;

    const mitschrift = { upserts: [], selects: 0, cdnGeladen: 0 };

    if (sitzung) w.localStorage.setItem('sb-' + REF + '-auth-token', '{"access_token":"x"}');

    // Die Bibliothek wird per <script> nachgeladen. jsdom fuehrt das nicht aus,
    // also legen wir sie vorher hin und zaehlen mit, ob ueberhaupt geladen wird.
    const bauer = () => ({
        auth: { getUser: async () => userFehlt ? { data: null, error: 'kein User' }
                                               : { data: { user: { id: 'user-1' } }, error: null } },
        from(t) {
            mitschrift.tabelle = t;
            return {
                select() { return this; },
                eq(feld, wert) { mitschrift.filter = [feld, wert]; return this; },
                async maybeSingle() {
                    mitschrift.selects++;
                    if (fehlerBeim === 'select') return { data: null, error: { message: 'kaputt' } };
                    return { data: zeile, error: null };
                },
                async upsert(row, opt) {
                    mitschrift.upserts.push({ row, opt });
                    if (fehlerBeim === 'upsert') return { error: { message: 'kaputt' } };
                    return { error: null };
                }
            };
        }
    });
    w.supabase = { createClient: (url, key) => { mitschrift.url = url; mitschrift.key = key; return bauer(); } };

    // Ein <script> auf die CDN-URL zaehlen, ohne es auszufuehren.
    const echtesAppend = w.document.head.appendChild.bind(w.document.head);
    w.document.head.appendChild = el => {
        if (el.tagName === 'SCRIPT' && /supabase-js/.test(el.src || '')) {
            mitschrift.cdnGeladen++;
            setTimeout(() => el.onload && el.onload(), 0);
            return el;
        }
        return echtesAppend(el);
    };

    w.eval(`var SUPABASE_CONFIG = { URL: 'https://${REF}.supabase.co', ANON_KEY: 'anon-key-xyz' };`);
    w.eval(lies('Assets/js/berichtsheft/vault-cloud.js'));
    return { w, mitschrift };
}

// ── 1. Ohne Sitzung passiert nichts ──────────────────────────────────────────
console.log('\n1. Ohne Anmeldung');
{
    const { w, mitschrift } = baue({ sitzung: false });
    ok('vcAngemeldet meldet false', w.vcAngemeldet() === false);
    ok('vcPull liefert null', (await w.vcPull()) === null);
    ok('vcPush liefert false', (await w.vcPush(SPIEGEL)) === false);
    ok('die CDN-Bibliothek wird gar nicht erst geladen', mitschrift.cdnGeladen === 0,
       'Ladevorgaenge: ' + mitschrift.cdnGeladen);
}

// ── 2. Hochladen: jede Spalte einzeln ────────────────────────────────────────
console.log('\n2. Hochladen');
{
    const { w, mitschrift } = baue();
    ok('vcAngemeldet meldet true', w.vcAngemeldet() === true);
    const erfolg = await w.vcPush(SPIEGEL);
    ok('vcPush meldet Erfolg', erfolg === true);
    ok('richtige Tabelle', mitschrift.tabelle === 'schatten_vault', String(mitschrift.tabelle));
    ok('Konflikt auf user_id', mitschrift.upserts[0]?.opt?.onConflict === 'user_id');

    const r = mitschrift.upserts[0]?.row || {};
    const erwartet = {
        user_id: 'user-1', v: 2, case_id: 'SB-2026-0042', salt: 'c2FsdA==',
        pw_hash: 'hash123', updated_at: '2026-09-04T10:00:00.000Z'
    };
    for (const [feld, wert] of Object.entries(erwartet)) {
        ok('Spalte ' + feld, r[feld] === wert, JSON.stringify(r[feld]));
    }
    ok('Spalte wrapped_key', JSON.stringify(r.wrapped_key) === JSON.stringify(SPIEGEL.wrappedKey));
    ok('Spalte entries', JSON.stringify(r.entries) === JSON.stringify(SPIEGEL.entries));
    ok('Spalte categories', JSON.stringify(r.categories) === JSON.stringify(SPIEGEL.categories));
    ok('Spalte time_basis', JSON.stringify(r.time_basis) === JSON.stringify(SPIEGEL.timeBasis));

    // 🔴 Der eigentliche Zweck der Trennung: Anhaenge duerfen NIE mitfahren.
    ok('keine Anhaenge in der Zeile',
       !('files' in r) && !('blobs' in r) && !('files_local_only' in r),
       Object.keys(r).join(','));
    // Und der Server darf nie einen Klartext-Schluessel sehen.
    ok('kein Klartext-Passwort in der Zeile',
       !JSON.stringify(r).includes('password') && !('master_key' in r));
}

// ── 3. Herunterladen: Rueckabbildung ─────────────────────────────────────────
console.log('\n3. Herunterladen');
{
    const zeile = {
        user_id: 'user-1', v: 2, case_id: 'SB-2026-0042', salt: 'c2FsdA==',
        pw_hash: 'hash123', wrapped_key: SPIEGEL.wrappedKey, entries: SPIEGEL.entries,
        categories: SPIEGEL.categories, time_basis: SPIEGEL.timeBasis,
        updated_at: '2026-09-04T10:00:00.000Z', synced_at: '2026-09-04T10:00:01.000Z'
    };
    const { w, mitschrift } = baue({ zeile });
    const s = await w.vcPull();
    ok('vcPull liefert einen Spiegel', !!s);
    ok('gefiltert auf den eigenen Nutzer',
       mitschrift.filter?.[0] === 'user_id' && mitschrift.filter?.[1] === 'user-1',
       JSON.stringify(mitschrift.filter));
    for (const feld of ['v', 'caseId', 'salt', 'pwHash', 'updatedAt']) {
        ok('Feld ' + feld, s[feld] === SPIEGEL[feld], JSON.stringify(s[feld]));
    }
    ok('Feld wrappedKey', JSON.stringify(s.wrappedKey) === JSON.stringify(SPIEGEL.wrappedKey));
    ok('Feld entries', JSON.stringify(s.entries) === JSON.stringify(SPIEGEL.entries));
    ok('Feld timeBasis', JSON.stringify(s.timeBasis) === JSON.stringify(SPIEGEL.timeBasis));
    ok('filesLocalOnly bleibt gesetzt', s.filesLocalOnly === true);

    // Hin und zurueck muss dasselbe ergeben — sonst verliert ein Feld pro Runde.
    const { w: w2, mitschrift: m2 } = baue();
    await w2.vcPush(s);
    const zurueck = m2.upserts[0].row;
    for (const feld of ['v', 'case_id', 'salt', 'pw_hash', 'updated_at']) {
        ok('Rundreise ' + feld, zurueck[feld] === zeile[feld], JSON.stringify(zurueck[feld]));
    }
}

// ── 4. Nichts kaputtmachen, wenn etwas schiefgeht ────────────────────────────
console.log('\n4. Fehlerfaelle');
{
    const { w } = baue({ zeile: null });
    ok('leere Tabelle → null (nicht "loesch deinen Tresor")', (await w.vcPull()) === null);
}
{
    const { w } = baue({ fehlerBeim: 'select' });
    ok('Lesefehler → null statt Ausnahme', (await w.vcPull()) === null);
}
{
    const { w } = baue({ fehlerBeim: 'upsert' });
    ok('Schreibfehler → false statt Ausnahme', (await w.vcPush(SPIEGEL)) === false);
}
{
    const { w } = baue({ userFehlt: true });
    ok('ohne gueltigen Nutzer kein Lesen', (await w.vcPull()) === null);
    ok('ohne gueltigen Nutzer kein Schreiben', (await w.vcPush(SPIEGEL)) === false);
}
{
    const { w, mitschrift } = baue();
    ok('unvollstaendiger Spiegel wird nicht hochgeladen',
       (await w.vcPush({ salt: 'x' })) === false && mitschrift.upserts.length === 0);
    ok('null wird nicht hochgeladen', (await w.vcPush(null)) === false);
}

// ── 5. Der Blob-Sync fasst den Tresor nicht mehr an ──────────────────────────
console.log('\n5. Abgeklemmter Blob-Weg');
{
    const quelle = lies('Assets/js/Cloud/supabase-integration.js');
    // url MUSS gesetzt sein: ohne sie hat das Dokument einen undurchsichtigen
    // Origin, und jeder Zugriff auf localStorage wirft eine DOMException.
    const dom = new JSDOM('<!doctype html><body>', { runScripts: 'outside-only', url: 'https://myworklog.de/' });
    // Nur den Kopf bis zur Klasse auswerten: die Klasse braucht Browser-Dinge,
    // die hier fehlen. cloudKeyAllowed steht davor.
    const kopf = quelle.slice(0, quelle.indexOf('class SupabaseCloudSync'));
    dom.window.eval(kopf);
    const erlaubt = dom.window.eval('cloudKeyAllowed');

    dom.window.localStorage.setItem('schatten_cloud_sync', '1');
    ok('schatten_vault ist gesperrt — auch mit gesetztem Freigabe-Flag',
       erlaubt('schatten_vault') === false);
    ok('gewoehnliche Schluessel laufen weiter', erlaubt('tg_pro_data') === true);

    // Gegenprobe: die Sperre wird auch beim HERUNTERLADEN gelesen. Ohne sie
    // schriebe eine alte Cloud-Zeile den Spiegel zurueck.
    ok('Download-Zweig kennt die Sperre',
       /CLOUD_BLOCKED_KEYS\.has\(key\)\) continue;/.test(quelle),
       'Muster im Download-Zweig');
    ok('es gibt ueberhaupt einen Download-Zweig zu pruefen',
       quelle.includes('downloadFromCloud'));
}

console.log(`\n${geprueft - fehler}/${geprueft} bestanden`);
if (geprueft < 40) { console.log('ZU WENIG PRUEFUNGEN — der Lauf hat nichts getan'); process.exit(1); }
process.exit(fehler ? 1 : 0);
