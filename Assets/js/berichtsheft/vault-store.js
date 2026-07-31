// ═══════════════════════════════════════════════════════
//  VAULT-STORE MODULE — IndexedDB-Speicher fuer den Schatten-Tresor
// ═══════════════════════════════════════════════════════
//
//  WARUM ES DIESE DATEI GIBT
//  Der Tresor lag komplett in EINEM localStorage-Key: alle Eintraege plus
//  alle Beweisfotos als Base64-Data-URL, zusammen verschluesselt und dann
//  nochmal Base64-kodiert. Ein 300-KB-Foto belegte damit ~530 KB, und bei
//  ~5 MB localStorage-Quota war nach rund acht Fotos Schluss ("Kein
//  Speicherplatz mehr"). Base64 ist hier der eigentliche Schaden: es blaeht
//  jede Datei um 33 % auf, und das gleich zweimal hintereinander.
//
//  IndexedDB speichert ArrayBuffer nativ (structured clone) — kein Base64,
//  keine 5-MB-Grenze, sondern eine plattenbasierte Quota im GB-Bereich.
//  Deshalb liegen die Datei-Bytes jetzt hier.
//
//  STORE-AUFTEILUNG (wichtig, nicht zusammenlegen)
//    meta    (key 'k')  — Tresor-Kopf: Version, Aktenzeichen, Salt, pwHash
//    entries (key 'k')  — verschluesselter Eintrags-Block (nur Text)
//    files   (key 'id') — Datei-METADATEN + Vorschaubild (klein)
//    blobs   (key 'id') — die verschluesselten Datei-BYTES (gross)
//
//  files und blobs sind bewusst getrennt: die Dateiliste und die
//  Speicheranzeige brauchen nur die Metadaten. Laegen die Bytes im selben
//  Record, muesste getAll() fuer eine simple Groessensumme mehrere hundert
//  MB durch den Speicher schaufeln. So bleibt jede Listen-Operation billig
//  und nur das tatsaechlich geoeffnete Beweismittel wird geladen.
//
//  Diese Datei kennt KEINE Kryptographie. Sie bekommt fertig verschluesselte
//  Puffer und gibt sie zurueck — Schluesselableitung und AES-GCM bleiben in
//  schatten-berichtsheft.js. Wer hier etwas entschluesseln will, hat die
//  Trennung verletzt.

const VAULT_DB_NAME = 'mwl_schatten_vault';
const VAULT_DB_VERSION = 1;
const VS_META = 'meta';
const VS_ENTRIES = 'entries';
const VS_FILES = 'files';
const VS_BLOBS = 'blobs';

// Merkposten fuer die Diagnose: steht auf false, wenn IndexedDB nicht
// benutzbar ist (Firefox-Privatmodus, gesperrte Umgebung). Dann laeuft der
// localStorage-Notbetrieb — funktionsfaehig, aber wieder mit 5-MB-Deckel.
let vsUsingFallback = false;
let vsDbPromise = null;

function vsOpen() {
    if (vsDbPromise) return vsDbPromise;
    vsDbPromise = new Promise((resolve, reject) => {
        let req;
        try {
            req = indexedDB.open(VAULT_DB_NAME, VAULT_DB_VERSION);
        } catch (e) {
            reject(e); return;
        }
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(VS_META))    db.createObjectStore(VS_META,    { keyPath: 'k' });
            if (!db.objectStoreNames.contains(VS_ENTRIES)) db.createObjectStore(VS_ENTRIES, { keyPath: 'k' });
            if (!db.objectStoreNames.contains(VS_FILES))   db.createObjectStore(VS_FILES,   { keyPath: 'id' });
            if (!db.objectStoreNames.contains(VS_BLOBS))   db.createObjectStore(VS_BLOBS,   { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB konnte nicht geoeffnet werden'));
        // Ein blockiertes Upgrade (zweiter Tab mit alter Version) haengt sonst ewig.
        req.onblocked = () => reject(new Error('IndexedDB blockiert — anderer Tab offen'));
    });
    return vsDbPromise;
}

// Ein Transaktions-Wrapper statt an jeder Aufrufstelle das gleiche
// onsuccess/onerror-Geruest. `fn` bekommt den Store und gibt einen
// IDBRequest zurueck (oder nichts, wenn nur geschrieben wird).
function vsTx(storeName, mode, fn) {
    return vsOpen().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let out;
        const req = fn(store);
        if (req) req.onsuccess = () => { out = req.result; };
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaktion abgebrochen'));
    }));
}

// ─── localStorage-Notbetrieb ────────────────────────────
// Nur aktiv, wenn IndexedDB gar nicht geht. Haelt die Seite benutzbar statt
// sie mit einem leeren Tresor dastehen zu lassen; die Bytes werden dabei
// wieder Base64 und die alte Enge ist zurueck — deshalb warnt die UI.

const VS_FB_PREFIX = 'schatten_fb_';

function vsFbGet(store, key) {
    try { return JSON.parse(localStorage.getItem(VS_FB_PREFIX + store + '_' + key) || 'null'); }
    catch (e) { return null; }
}
function vsFbPut(store, key, val) {
    localStorage.setItem(VS_FB_PREFIX + store + '_' + key, JSON.stringify(val));
}
function vsFbDelete(store, key) {
    localStorage.removeItem(VS_FB_PREFIX + store + '_' + key);
}
function vsFbAll(store) {
    const out = [];
    const prefix = VS_FB_PREFIX + store + '_';
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) {
            try { out.push(JSON.parse(localStorage.getItem(k))); } catch (e) { /* kaputter Record: ueberspringen */ }
        }
    }
    return out.filter(Boolean);
}

// ArrayBuffer ueberlebt JSON nicht — im Notbetrieb also doch Base64.
// In 32k-Bloecken, weil String.fromCharCode.apply bei ~65k+ den Stack sprengt.
function vsBufToB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 32768) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
    }
    return btoa(bin);
}
function vsB64ToBuf(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
}

// ─── Oeffentliche API ───────────────────────────────────

// Muss einmal vor allen anderen Aufrufen laufen. Schluckt den Fehler
// bewusst: ein nicht oeffenbares IndexedDB darf die Seite nicht toeten,
// es schaltet nur den Notbetrieb ein.
async function vsInit() {
    try {
        await vsOpen();
        vsUsingFallback = false;
    } catch (e) {
        console.warn('[Tresor] IndexedDB nicht verfuegbar, Notbetrieb ueber localStorage:', e && e.message);
        vsUsingFallback = true;
    }
    return !vsUsingFallback;
}

function vsIsFallback() { return vsUsingFallback; }

async function vsGetMeta() {
    if (vsUsingFallback) return vsFbGet(VS_META, 'vault');
    return (await vsTx(VS_META, 'readonly', s => s.get('vault'))) || null;
}

async function vsPutMeta(meta) {
    const rec = Object.assign({}, meta, { k: 'vault' });
    if (vsUsingFallback) return vsFbPut(VS_META, 'vault', rec);
    return vsTx(VS_META, 'readwrite', s => s.put(rec));
}

async function vsGetEntries() {
    if (vsUsingFallback) return vsFbGet(VS_ENTRIES, 'entries');
    return (await vsTx(VS_ENTRIES, 'readonly', s => s.get('entries'))) || null;
}

// `cipher` ist das {iv, data}-Objekt aus encrypt() — Text bleibt Base64,
// das ist bei reinem Text kein Groessenproblem und haelt das Backup-Format
// unveraendert lesbar.
async function vsPutEntries(cipher) {
    const rec = { k: 'entries', iv: cipher.iv, data: cipher.data };
    if (vsUsingFallback) return vsFbPut(VS_ENTRIES, 'entries', rec);
    return vsTx(VS_ENTRIES, 'readwrite', s => s.put(rec));
}

// Datei ablegen. `meta` = {id,name,mime,size,createdAt,thumb?}, `cipherBuf` =
// ArrayBuffer der verschluesselten Bytes, `iv` = Uint8Array.
// Bytes zuerst, Metadaten danach: bricht der grosse Schreibvorgang ab, steht
// die Datei nicht als vorhanden in der Liste. Andersherum haette man einen
// Eintrag, der beim Oeffnen ins Leere greift.
async function vsPutFile(meta, cipherBuf, iv) {
    if (vsUsingFallback) {
        vsFbPut(VS_BLOBS, meta.id, { id: meta.id, iv: vsBufToB64(iv.buffer || iv), data: vsBufToB64(cipherBuf) });
        vsFbPut(VS_FILES, meta.id, meta);
        return;
    }
    await vsTx(VS_BLOBS, 'readwrite', s => s.put({ id: meta.id, iv: iv, data: cipherBuf }));
    await vsTx(VS_FILES, 'readwrite', s => s.put(meta));
}

async function vsGetFileMeta(id) {
    if (vsUsingFallback) return vsFbGet(VS_FILES, id);
    return (await vsTx(VS_FILES, 'readonly', s => s.get(id))) || null;
}

// Liefert {iv, data} — data ist ein ArrayBuffer (im Notbetrieb aus Base64
// zurueckgewandelt, damit der Aufrufer keinen Unterschied merkt).
async function vsGetFileBytes(id) {
    if (vsUsingFallback) {
        const rec = vsFbGet(VS_BLOBS, id);
        if (!rec) return null;
        return { iv: new Uint8Array(vsB64ToBuf(rec.iv)), data: vsB64ToBuf(rec.data) };
    }
    const rec = await vsTx(VS_BLOBS, 'readonly', s => s.get(id));
    if (!rec) return null;
    return { iv: rec.iv, data: rec.data };
}

async function vsAllFileMeta() {
    if (vsUsingFallback) return vsFbAll(VS_FILES);
    return (await vsTx(VS_FILES, 'readonly', s => s.getAll())) || [];
}

async function vsDeleteFile(id) {
    if (vsUsingFallback) { vsFbDelete(VS_FILES, id); vsFbDelete(VS_BLOBS, id); return; }
    await vsTx(VS_FILES, 'readwrite', s => s.delete(id));
    await vsTx(VS_BLOBS, 'readwrite', s => s.delete(id));
}

// Verwaiste Bytes aufraeumen: Dateien, die in keinem Eintrag mehr
// referenziert werden. Laeuft nach dem Loeschen/Bearbeiten von Eintraegen —
// ohne das wuechse der Tresor bei jedem entfernten Anhang weiter.
async function vsPruneOrphans(usedIds) {
    const keep = new Set(usedIds);
    const all = await vsAllFileMeta();
    let removed = 0;
    for (const f of all) {
        if (!keep.has(f.id)) { await vsDeleteFile(f.id); removed++; }
    }
    return removed;
}

// Belegung des Tresors: Summe der Original-Dateigroessen plus der
// verschluesselte Textblock. Kommt aus den Metadaten, nicht aus den Bytes —
// deshalb billig genug, um sie bei jedem Render aufzufrischen.
async function vsUsage() {
    const files = await vsAllFileMeta();
    let bytes = 0;
    for (const f of files) bytes += (f.size || 0);
    const entries = await vsGetEntries();
    if (entries && entries.data) bytes += entries.data.length;
    return { bytes: bytes, count: files.length };
}

// Was der Browser insgesamt zugesteht. `quota` ist eine Schaetzung und
// haengt am freien Plattenplatz — deshalb anzeigen, nicht darauf rechnen.
async function vsQuota() {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            return { usage: est.usage || 0, quota: est.quota || 0 };
        }
    } catch (e) { /* nicht unterstuetzt */ }
    return { usage: 0, quota: 0 };
}

// Ohne das darf der Browser den Tresor bei Speicherdruck einfach raeumen.
// Fuer eine Sammlung von Beweismitteln ist das der schlimmste denkbare
// Ausgang, deshalb wird die Dauerhaftigkeit aktiv angefordert. Chrome
// gewaehrt sie stillschweigend bei installierter PWA / genug Nutzung,
// Firefox fragt nach. Ein `false` ist kein Fehler, nur ein Hinweis wert.
async function vsRequestPersist() {
    try {
        if (!navigator.storage || !navigator.storage.persist) return false;
        if (navigator.storage.persisted && await navigator.storage.persisted()) return true;
        return await navigator.storage.persist();
    } catch (e) { return false; }
}

async function vsIsPersisted() {
    try {
        if (navigator.storage && navigator.storage.persisted) return await navigator.storage.persisted();
    } catch (e) { /* nicht unterstuetzt */ }
    return false;
}

// Kompletter Tresor weg — nur fuer Reset und Backup-Import.
async function vsClearAll() {
    if (vsUsingFallback) {
        const kill = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf(VS_FB_PREFIX) === 0) kill.push(k);
        }
        kill.forEach(k => localStorage.removeItem(k));
        return;
    }
    for (const store of [VS_META, VS_ENTRIES, VS_FILES, VS_BLOBS]) {
        await vsTx(store, 'readwrite', s => s.clear());
    }
}
