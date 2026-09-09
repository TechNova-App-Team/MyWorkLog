// Testet die Papierkorb- und Aufbewahrungs-Logik fuer Berichtshefte:
// - Soft-Delete in den Papierkorb (bh-basis.js)
// - Wiederherstellung von Berichten
// - 30-Tage Auto-Cleanup abgelaufener Papierkorb-Eintraege
// - B2B-Synchronisation: Soft-Delete (geloescht_at), Wiederherstellen (geloescht_at: null)
// - B2B-Hard-Delete: Vollstaendiges SQL DELETE wenn ohne Freigabe; Schutz/Tombstone wenn freigegeben

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { webcrypto } from 'node:crypto';

let bestanden = 0, fehlgeschlagen = 0;
const gruppe = (t) => console.log('\n▶ ' + t);
const ok = (bed, name, detail) => {
    if (bed) { bestanden++; console.log('  ok    ' + name); }
    else { fehlgeschlagen++; console.log('  FEHL  ' + name + (detail ? '\n        ' + detail : '')); }
};

// ── 1. Basis-Funktionen aus bh-basis.js ─────────────────────────────────────
gruppe('Papierkorb Basis-Funktionen (bh-basis.js)');

const SRC_BASIS = readFileSync(
    new URL('../Assets/js/berichtsheft/bh-basis.js', import.meta.url), 'utf8'
).split('\r\n').join('\n');

const lsStore = new Map();
const sandbox = {
    console,
    URL,
    localStorage: {
        getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
        setItem: (k, v) => lsStore.set(k, String(v)),
        removeItem: (k) => lsStore.delete(k),
        clear: () => lsStore.clear()
    },
    document: { documentElement: { lang: 'de' } },
    window: {},
    L: (de, en) => de
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
createContext(sandbox);
runInContext(SRC_BASIS, sandbox, { filename: 'bh-basis.js' });

const { loadTrash, saveTrash, getTrashCount, cleanupExpiredTrash, TRASH_MAX_DAYS } = sandbox.window;

ok(typeof loadTrash === 'function', 'loadTrash existiert');
ok(typeof saveTrash === 'function', 'saveTrash existiert');
ok(typeof getTrashCount === 'function', 'getTrashCount existiert');
ok(typeof cleanupExpiredTrash === 'function', 'cleanupExpiredTrash existiert');
ok(TRASH_MAX_DAYS === 30, 'Standardaufbewahrungsfrist ist 30 Tage');

// Test: Initial leer
ok(loadTrash().length === 0, 'Papierkorb initial leer');
ok(getTrashCount() === 0, 'Trash-Count initial 0');

// Test: Speichern und Laden
const jetzt = Date.now();
const testEintraege = [
    { report: { id: 'rep-1', week: 35, year: 2 }, deletedAt: new Date(jetzt - 2 * 86400000).toISOString() }, // 2 Tage alt
    { report: { id: 'rep-2', week: 36, year: 2 }, deletedAt: new Date(jetzt - 15 * 86400000).toISOString() }, // 15 Tage alt
    { report: { id: 'rep-old', week: 10, year: 1 }, deletedAt: new Date(jetzt - 35 * 86400000).toISOString() } // 35 Tage alt (abgelaufen)
];

saveTrash(testEintraege);
ok(getTrashCount() === 3, 'getTrashCount liefert 3 gespeicherte Eintraege');
const geladen = loadTrash();
ok(geladen.length === 3 && geladen[0].report.id === 'rep-1', 'loadTrash liefert die gespeicherten Objekte korrekt');

// Test: Automatische Bereinigung abgelaufener Eintraege (> 30 Tage)
const { kept, expired } = cleanupExpiredTrash(30);
ok(expired.length === 1 && expired[0].report.id === 'rep-old', 'cleanupExpiredTrash identifiziert rep-old als abgelaufen', JSON.stringify(expired));
const nachBereinigung = loadTrash();
ok(nachBereinigung.length === 2, 'Nach Bereinigung verbleiben genau 2 Eintraege');
ok(!nachBereinigung.some(t => t.report.id === 'rep-old'), 'Abgelaufener Eintrag wurde aus localStorage entfernt');
ok(nachBereinigung.some(t => t.report.id === 'rep-1') && nachBereinigung.some(t => t.report.id === 'rep-2'), 'Gueltige Eintraege bleiben erhalten');


// ── 2. B2B Synchronisation (bh-b2b.js) ──────────────────────────────────────
gruppe('B2B Synchronisation & Revisionssicherheit (bh-b2b.js)');

const SRC_B2B = readFileSync(
    new URL('../Assets/js/berichtsheft/bh-b2b.js', import.meta.url), 'utf8'
).split('\r\n').join('\n');

let dbMockQueries = [];
let mockFreigabenCount = 0;

lsStore.set('sb-test-auth-token', 'dummy-token');

const mockClient = {
    auth: {
        getUser: async () => ({ data: { user: { id: 'usr-123' } }, error: null })
    },
    from: (tabelle) => {
        let currentTable = tabelle;
        let operation = '';
        let payload = null;
        let filters = {};

        const chain = {
            select: (cols, opts) => {
                operation = 'select';
                if (opts && opts.count) filters._count = opts.count;
                return chain;
            },
            update: (data) => {
                operation = 'update';
                payload = data;
                return chain;
            },
            delete: () => {
                operation = 'delete';
                return chain;
            },
            eq: (col, val) => {
                filters[col] = val;
                return chain;
            },
            is: (col, val) => {
                filters[col + '_is'] = val;
                return chain;
            },
            not: (col, op, val) => {
                filters[col + '_not'] = { op, val };
                return chain;
            },
            or: (cond) => {
                filters['or'] = cond;
                return chain;
            },
            order: () => chain,
            limit: () => chain,
            maybeSingle: async () => {
                dbMockQueries.push({ table: currentTable, op: 'maybeSingle', payload, filters: { ...filters } });
                if (currentTable === 'betriebe') {
                    return { data: { name: 'Musterbetrieb GmbH' }, error: null };
                }
                return { data: null, error: null };
            },
            then: (resolve) => {
                dbMockQueries.push({ table: currentTable, op: operation, payload, filters: { ...filters } });
                if (currentTable === 'betrieb_mitglieder') {
                    resolve({
                        data: [{ betrieb_id: 'b-1', rolle: 'azubi', anzeige_name: 'Max Mustermann' }],
                        error: null
                    });
                } else if (currentTable === 'betriebe') {
                    resolve({
                        data: [{ name: 'Musterbetrieb GmbH' }],
                        error: null
                    });
                } else if (currentTable === 'freigaben') {
                    resolve({ count: mockFreigabenCount, error: null });
                } else if (currentTable === 'berichte') {
                    if (operation === 'select') {
                        if (filters.client_id) {
                            resolve({
                                data: [{ id: 'cloud-uuid-' + filters.client_id, client_id: filters.client_id }],
                                error: null
                            });
                        } else {
                            resolve({
                                data: [
                                    { id: 'cloud-orphan-1', client_id: 'cloud-orphan-1', kw: 12, jahr: 1, geloescht_at: null },
                                    { id: 'cloud-active-1', client_id: 'cloud-active-1', kw: 13, jahr: 1, geloescht_at: null }
                                ],
                                error: null
                            });
                        }
                    } else {
                        resolve({ error: null });
                    }
                } else {
                    resolve({ error: null });
                }
            }
        };
        return chain;
    }
};

const b2bSandbox = {
    console,
    URL,
    SUPABASE_CONFIG: { URL: 'https://test.supabase.co', ANON_KEY: 'test-key' },
    crypto: {
        getRandomValues: (a) => a,
        subtle: webcrypto.subtle,
    },
    TextEncoder,
    localStorage: {
        getItem: (k) => (lsStore.has(k) ? lsStore.get(k) : null),
        setItem: (k, v) => lsStore.set(k, String(v)),
        removeItem: (k) => lsStore.delete(k),
    },
    document: { createElement: () => ({}), head: { appendChild: () => {} } },
    window: {
        supabase: {
            createClient: () => mockClient
        }
    },
};
b2bSandbox.window.window = b2bSandbox.window;
b2bSandbox.window.localStorage = b2bSandbox.localStorage;
b2bSandbox.window.SUPABASE_CONFIG = b2bSandbox.SUPABASE_CONFIG;
b2bSandbox.window.crypto = b2bSandbox.crypto;
b2bSandbox.window.document = b2bSandbox.document;
b2bSandbox.window.URL = URL;
b2bSandbox.globalThis = b2bSandbox.window;

createContext(b2bSandbox.window);
runInContext('var SUPABASE_CONFIG = window.SUPABASE_CONFIG;\n' + SRC_B2B, b2bSandbox.window, { filename: 'bh-b2b.js' });

const B2B = b2bSandbox.window.BHB2B;
ok(typeof B2B.berichtLoeschen === 'function', 'BHB2B.berichtLoeschen existiert');
ok(typeof B2B.berichteLoeschen === 'function', 'BHB2B.berichteLoeschen existiert');
ok(typeof B2B.berichtWiederherstellen === 'function', 'BHB2B.berichtWiederherstellen existiert');
ok(typeof B2B.berichteWiederherstellen === 'function', 'BHB2B.berichteWiederherstellen existiert');
ok(typeof B2B.papierkorbLeeren === 'function', 'BHB2B.papierkorbLeeren existiert');
ok(typeof B2B.verwaisteCloudBerichte === 'function', 'BHB2B.verwaisteCloudBerichte existiert');

// Test: Soft-Delete (Papierkorb) setzt geloescht_at
dbMockQueries = [];
const softOk = await B2B.berichtLoeschen('client-rep-1', false);
ok(softOk === true, 'B2B.berichtLoeschen liefert true fuer Soft-Delete');
const softDelQuery = dbMockQueries.find(q => q.table === 'berichte' && q.op === 'update');
ok(!!softDelQuery, 'Soft-Delete ruft update auf tabelle berichte auf');
ok(softDelQuery && typeof softDelQuery.payload.geloescht_at === 'string', 'Soft-Delete setzt geloescht_at Timestamp');

// Test: Wiederherstellen setzt geloescht_at auf null
dbMockQueries = [];
const restoreOk = await B2B.berichtWiederherstellen('client-rep-1');
ok(restoreOk === true, 'B2B.berichtWiederherstellen liefert true');
const restoreQuery = dbMockQueries.find(q => q.table === 'berichte' && q.op === 'update');
ok(!!restoreQuery, 'Wiederherstellen ruft update auf berichte auf');
ok(restoreQuery && restoreQuery.payload.geloescht_at === null, 'Wiederherstellen setzt geloescht_at auf null zurueck');

// Test: Hard-Delete ohne Freigaben fuehrt vollstaendiges DELETE aus (kein Datenmuell)
dbMockQueries = [];
mockFreigabenCount = 0;
const hardOk = await B2B.berichtLoeschen('client-rep-draft', true);
ok(hardOk === true, 'B2B.berichtLoeschen liefert true fuer Hard-Delete');
const hardDelQuery = dbMockQueries.find(q => q.table === 'berichte' && q.op === 'delete');
ok(!!hardDelQuery, 'Hard-Delete fuer Bericht ohne Freigaben fuehrt SQL DELETE aus');
ok(hardDelQuery && hardDelQuery.filters.id === 'cloud-uuid-client-rep-draft', 'DELETE filtert auf Bericht-ID');

// Test: Hard-Delete MIT Freigaben schuetzt die Signaturkette (Revisionssicherheit BBiG)
dbMockQueries = [];
mockFreigabenCount = 1; // z.B. Ausbilder hat bereits unterzeichnet
const protectedOk = await B2B.berichtLoeschen('client-rep-approved', true);
ok(protectedOk === true, 'B2B.berichtLoeschen liefert true fuer schutzwuerdigen Bericht');
const protectedQuery = dbMockQueries.find(q => q.table === 'berichte' && q.op === 'update');
ok(!!protectedQuery, 'Freigegebener Bericht wird nicht hart geloescht, sondern erhaelt Tombstone');
ok(protectedQuery && typeof protectedQuery.payload.geloescht_at === 'string', 'Tombstone setzt geloescht_at');
ok(protectedQuery && typeof protectedQuery.payload.inhalt === 'object' && Object.keys(protectedQuery.payload.inhalt).length === 0, 'Inhalt wird geleert um DB-Platz zu sparen');

// Test: Verwaiste Cloud-Berichte finden
dbMockQueries = [];
const verwaiste = await B2B.verwaisteCloudBerichte(['cloud-active-1']);
ok(verwaiste.length === 1 && verwaiste[0].id === 'cloud-orphan-1', 'verwaisteCloudBerichte filtert aktive Berichte heraus und liefert verwaiste');

// ── Abschlussbericht ────────────────────────────────────────────────────────
console.log('');
if (fehlgeschlagen === 0) {
    console.log(`✓ Alle ${bestanden} Tests fuer Papierkorb & Datenhaltung bestanden.`);
    process.exit(0);
} else {
    console.error(`✗ ${fehlgeschlagen} von ${bestanden + fehlgeschlagen} Tests fehlgeschlagen.`);
    process.exit(1);
}
