// Locale-Helfer: diese Datei laeuft auf einer Standalone-Seite ohne utils.js.
// Faellt auf die globale Funktion zurueck, wenn sie doch vorhanden ist.
var mwlLocale = window.mwlLocale || function () {
    return document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE';
};

// i18n-Helfer: gibt auf /en/ (<html lang="en">) den englischen Text zurueck,
// sonst den deutschen. Diese Datei laeuft auf DE- und EN-Seite.
function L(de, en) { return document.documentElement.lang === 'en' ? en : de; }

// ═══════════════════════════════════════════════════════
//  SCHATTEN-BERICHTSHEFT — AES-256-GCM ENCRYPTED VAULT
// ═══════════════════════════════════════════════════════

const STORE_KEY = 'schatten_vault';
const PBKDF2_ITERATIONS = 600000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;

// Lucide-Style Inline-SVGs, currentColor — Vorbild INSIGHT_ICONS-Pattern (insights.js).
const CATEGORY_ICONS = {
    verbal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    neglect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><line x1="9" y1="7" x2="15" y2="13"></line><line x1="15" y1="7" x2="9" y2="13"></line></svg>',
    unrelated: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>',
    overtime: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
    mobbing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" y1="8" x2="22" y2="13"></line><line x1="22" y1="8" x2="17" y2="13"></line></svg>',
    safety: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    discrimination: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"></line><path d="M5 7l-3 7a4 4 0 0 0 8 0z"></path><path d="M19 7l-3 7a4 4 0 0 0 8 0z"></path><line x1="5" y1="7" x2="19" y2="7"></line></svg>',
    documentation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><line x1="9.5" y1="13" x2="14.5" y2="18"></line><line x1="14.5" y1="13" x2="9.5" y2="18"></line></svg>',
    positive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
};

const CATEGORIES = {
    verbal: { label: L('Verbale Belästigung', 'Verbal harassment'), icon: CATEGORY_ICONS.verbal },
    neglect: { label: L('Ausbildungspflicht vernachlässigt (zu wenig Anleitung)', 'Training duty neglected (too little guidance)'), icon: CATEGORY_ICONS.neglect },
    unrelated: { label: L('Ausbildungsfremde Tätigkeiten (falsche Aufgaben)', 'Non-training tasks (work unrelated to training)'), icon: CATEGORY_ICONS.unrelated },
    overtime: { label: L('Überstunden / Arbeitszeitverstöße', 'Overtime / working-time violations'), icon: CATEGORY_ICONS.overtime },
    mobbing: { label: L('Mobbing / Ausgrenzung', 'Bullying / exclusion'), icon: CATEGORY_ICONS.mobbing },
    safety: { label: L('Arbeitsschutz-Verstoß', 'Occupational-safety violation'), icon: CATEGORY_ICONS.safety },
    discrimination: { label: L('Diskriminierung', 'Discrimination'), icon: CATEGORY_ICONS.discrimination },
    documentation: { label: L('Fehlende Dokumentation', 'Missing documentation'), icon: CATEGORY_ICONS.documentation },
    positive: { label: L('Positiver Fortschritt', 'Positive progress'), icon: CATEGORY_ICONS.positive },
    other: { label: L('Sonstiges', 'Other'), icon: CATEGORY_ICONS.other },
};

const SEVERITY_LABELS = {
    critical: L('Kritisch', 'Critical'),
    high: L('Hoch', 'High'),
    medium: L('Mittel', 'Medium'),
    low: L('Niedrig', 'Low'),
    note: L('Notiz', 'Note')
};

// Schweregrad ist eine geordnete Skala, kein Satz gleichrangiger Kategorien —
// fuenf Farbtoene waren deshalb sachlich falsch UND auf dunklem Grund nicht
// sicher unterscheidbar (validate_palette: warme 5er-Rampe ΔE 10.6 → FAIL).
// Jetzt: zwei Status-Farben fuer die zwei Stufen, die auffallen MUESSEN, ein
// Neutral fuer die Mitte, und die unteren beiden tragen Form statt Farbe
// (Ring statt Fuellung, siehe .entry-dot in index.html). Das Label steht
// immer daneben, Farbe traegt nie allein die Bedeutung.
const SEVERITY_COLORS = {
    critical: 'var(--sev-critical)',
    high: 'var(--sev-high)',
    medium: 'var(--sev-medium)',
    low: 'rgba(var(--sev-medium-rgb), 0.45)',
    note: 'var(--text-3)'
};

const UI_ICONS = {
    edit: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"></path></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    history: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><polyline points="3 3 3 8 8 8"></polyline><polyline points="12 7 12 12 16 14"></polyline></svg>',
    users: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    folderEmpty: '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>',
};

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, note: 4 };

// Status ist eine Bearbeitungs-Stufe, kein Alarm — deshalb neutral bis auf
// „eskaliert". Vorher lag hier eine zweite, unabhaengige Farbskala
// (blau/amber/teal) neben der Schweregrad-Skala; zwei Farbsysteme
// nebeneinander sind auf einer Karte nicht mehr lesbar.
const STATUS_META = {
    open: { label: L('Offen', 'Open'), color: 'var(--text-3)' },
    raised: { label: L('Angesprochen', 'Raised'), color: 'var(--text-1)' },
    escalated: { label: L('Eskaliert', 'Escalated'), color: 'var(--sev-high)' },
    resolved: { label: L('Gelöst', 'Resolved'), color: 'var(--sev-medium)' },
};
const STATUS_ORDER = ['open', 'raised', 'escalated', 'resolved'];

// Kategoriespezifische Detailfelder — datengetrieben statt neun handgebauter
// UI-Bloecke: renderCategoryFields() baut den Container aus dieser Map neu auf.
const CATEGORY_FIELDS = {
    verbal: [
        { key: 'location', label: L('Ort', 'Location'), type: 'text', placeholder: L('z.B. Werkstatt, Büro …', 'e.g. workshop, office …') },
        { key: 'frequency', label: L('Häufigkeit', 'Frequency'), type: 'select', options: [
            ['once', L('Einmalig', 'One-off')], ['repeated', L('Wiederholt', 'Repeated')], ['ongoing', L('Dauerhaft', 'Ongoing')]
        ] },
    ],
    neglect: [
        { key: 'missingSince', label: L('Anleitung fehlt seit', 'Guidance missing since'), type: 'date' },
        { key: 'affectedArea', label: L('Betroffener Ausbildungsbereich', 'Affected training area'), type: 'text' },
    ],
    unrelated: [
        { key: 'taskType', label: L('Welche Tätigkeit?', 'Which task?'), type: 'text', placeholder: L('z.B. Lager, Botengänge, Reinigung …', 'e.g. warehouse, errands, cleaning …') },
        { key: 'durationMinutes', label: L('Dauer pro Mal (Minuten)', 'Duration per time (minutes)'), type: 'number', placeholder: L('z.B. 90', 'e.g. 90') },
        { key: 'frequency', label: L('Häufigkeit', 'Frequency'), type: 'select', options: [
            ['once', L('Einmalig', 'One-off')], ['repeated', L('Wiederholt', 'Repeated')], ['ongoing', L('Dauerhaft', 'Ongoing')]
        ] },
        { key: 'timesPerWeek', label: L('Wie oft pro Woche? (bei wiederholt/dauerhaft)', 'How many times per week? (if repeated/ongoing)'), type: 'number', placeholder: L('z.B. 1', 'e.g. 1') },
    ],
    overtime: [
        { key: 'hours', label: L('Anzahl Stunden', 'Number of hours'), type: 'number', placeholder: '2.5' },
        { key: 'orderedBy', label: L('Angeordnet von', 'Ordered by'), type: 'text' },
        { key: 'compensationPromised', label: L('Ausgleich zugesagt', 'Compensation promised'), type: 'select', options: [
            ['yes', L('Ja', 'Yes')], ['no', L('Nein', 'No')], ['unclear', L('Unklar', 'Unclear')]
        ] },
        { key: 'compensationType', label: L('Ausgleichsart', 'Compensation type'), type: 'select', options: [
            ['time', L('Freizeit', 'Time off')], ['money', L('Geld', 'Pay')], ['none', L('Keine', 'None')]
        ] },
    ],
    mobbing: [
        { key: 'location', label: L('Ort', 'Location'), type: 'text' },
        { key: 'frequency', label: L('Häufigkeit', 'Frequency'), type: 'select', options: [
            ['once', L('Einmalig', 'One-off')], ['repeated', L('Wiederholt', 'Repeated')], ['ongoing', L('Dauerhaft', 'Ongoing')]
        ] },
    ],
    safety: [
        { key: 'hazardType', label: L('Gefährdungsart', 'Hazard type'), type: 'select', options: [
            ['ppe', L('Fehlende Schutzausrüstung', 'Missing protective equipment')],
            ['machine', L('Ungesicherte Maschine', 'Unsecured machine')],
            ['hazmat', L('Gefahrstoff', 'Hazardous substance')],
            ['overload', L('Überlastung', 'Overload')],
            ['other', L('Sonstiges', 'Other')],
        ] },
        { key: 'reportedTo', label: L('Gemeldet an', 'Reported to'), type: 'text' },
    ],
    discrimination: [
        { key: 'characteristic', label: L('Merkmal nach AGG', 'Characteristic under AGG'), type: 'select', options: [
            ['origin', L('Herkunft', 'Origin')], ['gender', L('Geschlecht', 'Gender')], ['religion', L('Religion/Weltanschauung', 'Religion/belief')],
            ['disability', L('Behinderung', 'Disability')], ['age', L('Alter', 'Age')], ['identity', L('Sexuelle Identität', 'Sexual identity')],
            ['other', L('Sonstiges', 'Other')],
        ] },
        { key: 'location', label: L('Ort', 'Location'), type: 'text' },
    ],
    documentation: [
        { key: 'missingSince', label: L('Dokumentation fehlt seit', 'Documentation missing since'), type: 'date' },
        { key: 'impact', label: L('Auswirkung', 'Impact'), type: 'text' },
    ],
    positive: [
        { key: 'contributedBy', label: L('Beigetragen von', 'Contributed by'), type: 'text' },
    ],
    other: [
        { key: 'location', label: L('Ort', 'Location'), type: 'text' },
    ],
};

let derivedKey = null;
let entries = [];
let sessionStart = null;
let sessionInterval = null;
let autoLockTimer = null;
const AUTO_LOCK_MS = 10 * 60 * 1000; // 10 minutes inactivity

// ═════════════════════════════════════════
//  CRYPTO — AES-256-GCM + PBKDF2
// ═════════════════════════════════════════

function strToU8(str) { return new TextEncoder().encode(str); }
function u8ToB64(arr) { return btoa(String.fromCharCode.apply(null, arr)); }
function b64ToU8(b64) {
    const bs = atob(b64);
    const arr = new Uint8Array(bs.length);
    for (let i = 0; i < bs.length; i++) arr[i] = bs.charCodeAt(i);
    return arr;
}

async function deriveKey(password, salt) {
    const raw = await crypto.subtle.importKey('raw', strToU8(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, raw, 256);
    return crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encrypt(plaintext, key) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, strToU8(plaintext));
    return { iv: u8ToB64(iv), data: u8ToB64(new Uint8Array(ct)) };
}

async function decrypt(envelope, key) {
    const iv = b64ToU8(envelope.iv);
    const ct = b64ToU8(envelope.data);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ct);
    return new TextDecoder().decode(pt);
}

function getPasswordHash(password) {
    // Simple hash for password verification (NOT the encryption key)
    return crypto.subtle.digest('SHA-256', strToU8(password)).then(buf => u8ToB64(new Uint8Array(buf)));
}

function u8ToHex(arr) {
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fingerprint eines Eintrags — kein Manipulationsschutz (wer das Passwort hat, kann ihn neu
// berechnen), sondern ein greifbarer, extern notierbarer Abdruck des aktuellen Inhalts.
async function contentFingerprint(entry) {
    const canonical = JSON.stringify({
        date: entry.date, time: entry.time || '', severity: entry.severity,
        category: entry.category, text: entry.text, witnesses: entry.witnesses || [],
        status: entry.status || 'open', details: entry.details || {}
    });
    const buf = await crypto.subtle.digest('SHA-256', strToU8(canonical));
    return u8ToHex(new Uint8Array(buf)).slice(0, 16);
}

function calcPwStrength(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;
    return s; // 0-5
}

function updateStrengthBar(pw, barId) {
    const bar = document.getElementById(barId);
    if (!bar) return;
    const s = calcPwStrength(pw);
    const pct = (s / 5) * 100;
    const colors = ['#ef4444', '#f59e0b', '#f59e0b', '#10b981', '#10b981', '#06b6d4'];
    bar.style.width = pct + '%';
    bar.style.background = colors[s] || '#ef4444';
}

// ═════════════════════════════════════════
//  STORAGE — Verschluesselter Tresor in IndexedDB
// ═════════════════════════════════════════
//
//  SCHLUESSEL-ARCHITEKTUR (Format v2): Umschlag-Verschluesselung.
//  Ein zufaelliger Haupt-Schluessel verschluesselt Eintraege UND Dateien.
//  Er liegt selbst verschluesselt im Tresor-Kopf (`wrappedKey`), gesichert
//  mit dem aus dem Passwort abgeleiteten Schluessel.
//
//  Warum nicht direkt mit dem Passwort-Schluessel wie in v1: Dann muesste
//  eine Passwortaenderung JEDE Datei neu verschluesseln. Bei einem Tresor
//  mit hunderten MB Beweismitteln waeren das Minuten Rechenzeit im Browser
//  — und ein Abbruch mittendrin liesse den Tresor halb verschluesselt
//  zurueck. Jetzt wird nur der Umschlag neu verpackt (Millisekunden), die
//  Dateien bleiben unberuehrt. Das Passwort wird weiterhin nirgends
//  gespeichert und verlaesst das Geraet nicht.

let vaultMeta = null;         // Tresor-Kopf: {v, caseId, salt, pwHash, wrappedKey, updatedAt}
let legacyVault = null;       // v1-Tresor aus localStorage, wartet auf Migration beim Entsperren
let pendingCloudVault = null; // Neuerer Stand aus der Cloud-Freigabe, wartet aufs Zusammenfuehren

function getVault() { return vaultMeta; }
function isFirstTime() { return !vaultMeta; }

// Haupt-Schluessel erzeugen/ein- und auspacken. Bewusst ueber
// encrypt/decrypt der rohen 32 Bytes statt ueber wrapKey/unwrapKey: so
// bleibt der importierte Schluessel `extractable:false` und kann aus dem
// laufenden Code nicht wieder ausgelesen werden.
function importMasterKey(rawBytes) {
    return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function wrapMasterKey(rawBytes, kek) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, kek, rawBytes);
    return { iv: u8ToB64(iv), data: u8ToB64(new Uint8Array(ct)) };
}

async function unwrapMasterKey(wrapped, kek) {
    const raw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToU8(wrapped.iv), tagLength: 128 }, kek, b64ToU8(wrapped.data));
    return new Uint8Array(raw);
}

// Binaer-Varianten von encrypt/decrypt: iv als Uint8Array, Nutzlast als
// ArrayBuffer. Beides speichert IndexedDB nativ — kein Base64, kein
// 33-%-Aufschlag. Genau das war die Ursache des Speicherproblems.
async function encryptBytes(buf, key) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, buf);
    return { iv, data };
}

function decryptBytes(iv, data, key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data);
}

// Aktenzeichen: rein ein Referenz-Code (Erstelldatum + Zufalls-Suffix), keine
// sensiblen Daten — darf unverschluesselt im Vault-Root stehen, macht die Seite
// aber wie ein echtes Dokument identifizierbar statt nur "der Tresor".
function generateCaseId() {
    const d = new Date();
    const datePart = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const suffix = u8ToHex(crypto.getRandomValues(new Uint8Array(2))).toUpperCase();
    return 'SB-' + datePart + '-' + suffix;
}

async function createVault(password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const kek = await deriveKey(password, salt);
    const pwHash = await getPasswordHash(password);

    const masterRaw = crypto.getRandomValues(new Uint8Array(32));
    derivedKey = await importMasterKey(masterRaw);

    vaultMeta = {
        v: 2,
        caseId: generateCaseId(),
        salt: u8ToB64(salt),
        pwHash: pwHash,
        wrappedKey: await wrapMasterKey(masterRaw, kek),
        updatedAt: new Date().toISOString()
    };
    masterRaw.fill(0);   // Rohschluessel nicht laenger als noetig im Speicher lassen

    await vsPutMeta(vaultMeta);
    entries = [];
    await saveVault();
    // Dauerhaftigkeit gleich beim Anlegen anfordern: ohne sie darf der Browser
    // den Tresor bei Speicherdruck raeumen — bei Beweismitteln der schlimmste Fall.
    await vsRequestPersist();
}

async function unlockVault(password) {
    if (!vaultMeta) throw new Error(L('Kein Tresor gefunden', 'No vault found'));

    const kek = await deriveKey(password, b64ToU8(vaultMeta.salt));

    if (vaultMeta.wrappedKey) {
        // Format v2: Haupt-Schluessel auspacken, damit Eintraege UND Dateien lesbar werden.
        let masterRaw;
        try {
            masterRaw = await unwrapMasterKey(vaultMeta.wrappedKey, kek);
        } catch (e) {
            throw new Error(L('Falsches Passwort', 'Wrong password'));
        }
        derivedKey = await importMasterKey(masterRaw);
        masterRaw.fill(0);
        const rec = await vsGetEntries();
        entries = rec ? JSON.parse(await decrypt(rec, derivedKey)) : [];
    } else {
        // Format v1: Eintraege haengen direkt am Passwort-Schluessel.
        try {
            entries = JSON.parse(await decrypt(vaultMeta.entries, kek));
        } catch (e) {
            throw new Error(L('Falsches Passwort', 'Wrong password'));
        }
        await migrateLegacyVault(kek);
    }

    if (!vaultMeta.caseId) {
        vaultMeta.caseId = generateCaseId();
        await vsPutMeta(vaultMeta);
    }
    if (pendingCloudVault) await mergeCloudVault(password);
    await vsRequestPersist();
}

// ─── Abgleich mit der Cloud-Freigabe ────────────────────
// Wird ein neuerer Stand aus der Freigabe gefunden, werden die Eintraege
// ZUSAMMENGEFUEHRT, nicht ersetzt. Ersetzen waere hier der falsche Reflex:
// Beide Geraete koennen zwischen zwei Synchronisationen Eintraege bekommen
// haben, und ein verworfener Vorfall ist bei Beweismitteln nicht wieder
// herstellbar. Vereinigt wird ueber die Eintrags-ID; kollidiert dieselbe ID,
// gewinnt der neuere `updatedAt` und die unterlegene Fassung wandert in
// dessen Aenderungsverlauf, statt verloren zu gehen.
async function mergeCloudVault(password) {
    const cloud = pendingCloudVault;
    pendingCloudVault = null;
    if (!cloud) return;

    // Anderer Passwort-Stamm: dann gehoert die Kopie zu einem anderen Tresor
    // (oder das Passwort wurde auf dem anderen Geraet geaendert). Hier NICHTS
    // anfassen — lieber nichts tun als den falschen Tresor ueberschreiben.
    if (cloud.pwHash !== vaultMeta.pwHash) {
        showToast(L('In der Cloud liegt ein Tresor mit anderem Passwort — dein lokaler Stand bleibt unverändert',
                    'The cloud holds a vault with a different password — your local state is unchanged'), 'warning');
        return;
    }

    let cloudEntries;
    try {
        const kek = await deriveKey(password, b64ToU8(cloud.salt));
        const raw = await unwrapMasterKey(cloud.wrappedKey, kek);
        const cloudKey = await importMasterKey(raw);
        raw.fill(0);
        cloudEntries = JSON.parse(await decrypt(cloud.entries, cloudKey));
    } catch (e) {
        showToast(L('Cloud-Stand konnte nicht gelesen werden — dein lokaler Stand bleibt unverändert',
                    'Could not read the cloud state — your local state is unchanged'), 'warning');
        return;
    }
    if (!Array.isArray(cloudEntries)) return;

    const byId = new Map(entries.map(e => [e.id, e]));
    let neu = 0, aktualisiert = 0;

    for (const remote of cloudEntries) {
        const local = byId.get(remote.id);
        if (!local) { byId.set(remote.id, remote); neu++; continue; }

        const tLocal = Date.parse(local.updatedAt || local.createdAt || '') || 0;
        const tRemote = Date.parse(remote.updatedAt || remote.createdAt || '') || 0;
        if (tRemote <= tLocal) continue;

        // Die lokale Fassung ist die aeltere — sie wird nicht weggeworfen,
        // sondern als Zwischenstand in den Verlauf des Gewinners gelegt.
        const winner = Object.assign({}, remote);
        winner.history = (remote.history || []).slice();
        winner.history.push({
            ts: local.updatedAt || local.createdAt, date: local.date, time: local.time,
            severity: local.severity, category: local.category, text: local.text,
            witnesses: local.witnesses || [], status: local.status || 'open',
            details: local.details || {}
        });
        byId.set(remote.id, winner);
        aktualisiert++;
    }

    if (!neu && !aktualisiert) return;

    entries = Array.from(byId.values());
    await saveVault();
    await refreshFileMetaCache();

    const teile = [];
    if (neu) teile.push(neu + L(neu === 1 ? ' neuer Eintrag' : ' neue Einträge', neu === 1 ? ' new entry' : ' new entries'));
    if (aktualisiert) teile.push(aktualisiert + L(' aktualisiert', ' updated'));
    showToast(L('Stand von einem anderen Gerät übernommen: ', 'Adopted state from another device: ') + teile.join(', '), 'success');

    // Beweismittel reisen nicht mit — wer auf dem anderen Geraet Dateien
    // angehaengt hat, findet hier nur die Referenz. Das ehrlich sagen,
    // statt den Nutzer eine leere Vorschau suchen zu lassen.
    const fehlend = entries.reduce((n, e) => n + (e.attachments || []).filter(a => !fileMetaCache.has(a.id)).length, 0);
    if (fehlend) {
        showToast(L(fehlend + ' Beweismittel liegen auf dem anderen Gerät — dort ein Backup exportieren und hier einspielen',
                    fehlend + ' evidence files are on the other device — export a backup there and import it here'), 'warning');
    }
}

// ─── Migration v1 → v2 ──────────────────────────────────
// Der alte Tresor trug seine Beweisfotos als Base64-Data-URL INNERHALB des
// Eintrags-Blocks. Diese Funktion loest sie heraus, legt sie als echte Bytes
// in IndexedDB ab und laesst im Eintrag nur noch die Referenz stehen.
//
// Reihenfolge ist hier alles: Der alte localStorage-Key wird erst geloescht,
// nachdem der neue Stand zurueckgelesen und geprueft wurde. Ein Abbruch
// mittendrin kostet damit nichts — beim naechsten Entsperren laeuft die
// Migration einfach erneut. Beweismittel duerfen nie zwischen zwei Formaten
// verschwinden.
async function migrateLegacyVault(kek) {
    const masterRaw = crypto.getRandomValues(new Uint8Array(32));
    const masterKey = await importMasterKey(masterRaw);

    let moved = 0;
    for (const entry of entries) {
        if (!entry.attachments || !entry.attachments.length) continue;
        const rebuilt = [];
        for (const att of entry.attachments) {
            if (!att.dataUrl) { rebuilt.push(att); continue; }   // schon migriert
            const bytes = dataUrlToBytes(att.dataUrl);
            const enc = await encryptBytes(bytes.buffer, masterKey);
            const meta = {
                id: att.id || crypto.randomUUID(),
                name: att.name || 'Beweisfoto.jpg',
                mime: att.mime || bytes.mime || 'image/jpeg',
                size: bytes.length,
                createdAt: entry.createdAt || new Date().toISOString(),
                thumb: att.dataUrl.length < 120000 ? att.dataUrl : null
            };
            await vsPutFile(meta, enc.data, enc.iv);
            rebuilt.push({ id: meta.id, name: meta.name, mime: meta.mime, size: meta.size });
            moved++;
        }
        entry.attachments = rebuilt;
    }

    const newMeta = {
        v: 2,
        caseId: vaultMeta.caseId || generateCaseId(),
        salt: vaultMeta.salt,
        pwHash: vaultMeta.pwHash,
        wrappedKey: await wrapMasterKey(masterRaw, kek),
        updatedAt: new Date().toISOString()
    };
    masterRaw.fill(0);

    await vsPutEntries(await encrypt(JSON.stringify(entries), masterKey));
    await vsPutMeta(newMeta);

    // Rueckleseprobe: erst wenn der neue Tresor nachweislich lesbar ist,
    // darf die alte Kopie weg.
    const check = await vsGetEntries();
    const verified = JSON.parse(await decrypt(check, masterKey));
    if (!Array.isArray(verified) || verified.length !== entries.length) {
        throw new Error(L('Migration fehlgeschlagen — der alte Tresor bleibt unangetastet',
                          'Migration failed — the old vault remains untouched'));
    }

    vaultMeta = newMeta;
    derivedKey = masterKey;
    legacyVault = null;
    localStorage.removeItem(STORE_KEY);
    syncCloudMirror();
    console.info('[Tresor] Auf IndexedDB migriert, ' + moved + ' Anhang/Anhaenge ausgelagert.');
}

// Data-URL zurueck in Bytes — nur fuer die Migration der Alt-Anhaenge.
function dataUrlToBytes(dataUrl) {
    const comma = dataUrl.indexOf(',');
    const header = dataUrl.slice(0, comma);
    const bin = atob(dataUrl.slice(comma + 1));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    const m = header.match(/^data:([^;,]+)/);
    out.mime = m ? m[1] : 'application/octet-stream';
    return out;
}

function getCaseId() {
    return (vaultMeta && vaultMeta.caseId) || '';
}

async function saveVault() {
    if (!derivedKey || !vaultMeta) return;
    // Kein automatisches Kuerzen bei vollem Speicher (anders als das
    // Backup-Pattern in storage-save.js) — Beweismittel duerfen nie still
    // verloren gehen. Der Aufrufer faengt den Fehler und macht die zuletzt
    // hinzugefuegte Aenderung rueckgaengig.
    await vsPutEntries(await encrypt(JSON.stringify(entries), derivedKey));
    // Zeitstempel entscheidet beim naechsten Start, welche Seite neuer ist
    // (Geraet oder Cloud-Kopie) — ohne ihn kann der Abgleich nur raten.
    vaultMeta.updatedAt = new Date().toISOString();
    await vsPutMeta(vaultMeta);
    syncCloudMirror();
}

// Spiegel fuer die bestehende Cloud-Freigabe: die synchronisiert
// localStorage-Keys (supabase-integration.js, CLOUD_OPT_IN_KEYS), sieht also
// von IndexedDB nichts. Hier landet deshalb weiterhin der TEXT-Teil des
// Tresors unter dem alten Key — klein genug fuer localStorage, und damit
// bleibt die Freigabe ohne Backend-Umbau funktionsfaehig. Die Dateien
// bleiben bewusst lokal; sie wuerden jede JSONB-Zeile sprengen.
//
// Schlaegt der Spiegel fehl (localStorage voll), ist das kein Fehler des
// Speicherns: IndexedDB ist ab jetzt die Wahrheit.
function syncCloudMirror() {
    try {
        if (!vaultMeta) return;
        const mirror = {
            v: vaultMeta.v, caseId: vaultMeta.caseId, salt: vaultMeta.salt,
            pwHash: vaultMeta.pwHash, wrappedKey: vaultMeta.wrappedKey,
            updatedAt: vaultMeta.updatedAt || new Date().toISOString(),
            entries: null, filesLocalOnly: true
        };
        vsGetEntries().then(rec => {
            if (!rec) return;
            mirror.entries = { iv: rec.iv, data: rec.data };
            try { localStorage.setItem(STORE_KEY, JSON.stringify(mirror)); }
            catch (e) { console.warn('[Tresor] Cloud-Spiegel konnte nicht geschrieben werden:', e && e.name); }
        });
    } catch (e) { /* Spiegel ist optional */ }
}

// Belegung in Bytes — jetzt asynchron, weil die Groesse aus den
// Datei-Metadaten in IndexedDB kommt statt aus einem localStorage-String.
async function estimateVaultSize() {
    const usage = await vsUsage();
    return usage.bytes;
}

// Reicht bis TB: Seit die Anhaenge in IndexedDB liegen, sind Browser-Quoten
// im zweistelligen GB-Bereich der Normalfall — bei MB als groesster Einheit
// stand dort "10252.02 MB", was niemand als "10 GB" liest.
// Dezimaltrennzeichen folgt der Seitensprache (DE Komma, EN Punkt).
function formatBytes(bytes) {
    const num = (val, digits) => val.toLocaleString(mwlLocale(), {
        minimumFractionDigits: digits, maximumFractionDigits: digits
    });
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return num(bytes / 1024, 0) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return num(bytes / (1024 * 1024), 2) + ' MB';
    if (bytes < 1024 * 1024 * 1024 * 1024) return num(bytes / (1024 * 1024 * 1024), 2) + ' GB';
    return num(bytes / Math.pow(1024, 4), 2) + ' TB';
}

// Dank Umschlag-Verschluesselung wird hier nur der Haupt-Schluessel neu
// verpackt. Eintraege und Dateien bleiben unangetastet — bei einem Tresor
// mit vielen hundert MB Beweismitteln ist das der Unterschied zwischen
// Millisekunden und Minuten.
async function changePassword(currentPw, newPw) {
    if (!vaultMeta) throw new Error(L('Kein Tresor gefunden', 'No vault found'));
    const currentHash = await getPasswordHash(currentPw);
    if (currentHash !== vaultMeta.pwHash) throw new Error(L('Aktuelles Passwort ist falsch', 'Current password is wrong'));

    const oldKek = await deriveKey(currentPw, b64ToU8(vaultMeta.salt));
    const masterRaw = await unwrapMasterKey(vaultMeta.wrappedKey, oldKek);

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const newKek = await deriveKey(newPw, salt);

    vaultMeta = Object.assign({}, vaultMeta, {
        salt: u8ToB64(salt),
        pwHash: await getPasswordHash(newPw),
        wrappedKey: await wrapMasterKey(masterRaw, newKek)
    });
    masterRaw.fill(0);

    await vsPutMeta(vaultMeta);
    syncCloudMirror();
}

// ═════════════════════════════════════════
//  BACKUP — Export/Import des (bereits verschluesselten) Tresors
// ═════════════════════════════════════════

// Das Backup enthaelt jetzt auch die Anhaenge. Vorher exportierte es nur den
// localStorage-Block; seit die Dateien in IndexedDB liegen, waere das ein
// Backup ohne Beweismittel gewesen — die gefaehrlichste Sorte Sicherung,
// weil sie sich vollstaendig anfuehlt.
//
// Zusammengesetzt aus Blob-Teilen statt einem grossen String: Bei einem
// Tresor mit hunderten MB wuerde JSON.stringify ueber alles den Tab
// zuverlaessig abschiessen. So liegt immer nur eine Datei gleichzeitig als
// Base64 im Speicher.
async function exportBackup() {
    if (!vaultMeta) { showToast(L('Kein Tresor zum Exportieren vorhanden', 'No vault to export'), 'warning'); return; }
    showToast(L('Backup wird zusammengestellt …', 'Assembling backup …'), 'info');

    try {
        const entriesRec = await vsGetEntries();
        const head = {
            format: 'mwl-schatten-backup',
            v: 2,
            exportedAt: new Date().toISOString(),
            caseId: vaultMeta.caseId,
            salt: vaultMeta.salt,
            pwHash: vaultMeta.pwHash,
            wrappedKey: vaultMeta.wrappedKey || null,
            entries: entriesRec ? { iv: entriesRec.iv, data: entriesRec.data } : null
        };
        const parts = [JSON.stringify(head).slice(0, -1) + ',"files":['];

        const metas = await vsAllFileMeta();
        for (let i = 0; i < metas.length; i++) {
            const rec = await vsGetFileBytes(metas[i].id);
            if (!rec) continue;
            const ivBytes = rec.iv instanceof Uint8Array ? rec.iv : new Uint8Array(rec.iv);
            parts.push((i ? ',' : '') + JSON.stringify(Object.assign({}, metas[i], {
                iv: u8ToB64(ivBytes),
                data: vsBufToB64(rec.data)
            })));
        }
        parts.push(']}');

        const blob = new Blob(parts, { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schatten-berichtsheft-backup_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        showToast(L('Backup heruntergeladen (' + formatBytes(blob.size) + ') — an einem zweiten Ort sicher aufbewahren',
                    'Backup downloaded (' + formatBytes(blob.size) + ') — keep it safe in a second location'), 'success');
    } catch (e) {
        showToast(L('Backup konnte nicht erstellt werden', 'Could not create backup'), 'error');
    }
}

// v2 = neues Format mit Dateien, v1 = der alte localStorage-Block.
// Beide bleiben importierbar; wer eine alte Sicherung herumliegen hat, soll
// sie nicht wegwerfen muessen.
function isValidVaultShape(v) {
    return !!(v && typeof v === 'object' && v.salt && v.pwHash && v.entries && v.entries.iv && v.entries.data);
}

function importBackupFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
        let parsed;
        try { parsed = JSON.parse(reader.result); } catch (e) {
            showToast(L('Datei ist kein gültiges Backup (kein JSON)', 'File is not a valid backup (not JSON)'), 'error');
            return;
        }
        if (!isValidVaultShape(parsed)) {
            showToast(L('Datei hat nicht die Struktur eines Schatten-Berichtsheft-Backups', 'File does not have the structure of a shadow-report-book backup'), 'error');
            return;
        }
        const replacing = !isFirstTime();
        const msg = replacing
            ? L('Dies ersetzt deinen AKTUELLEN Tresor unwiderruflich durch das importierte Backup. Falls nötig, exportiere vorher ein Backup des aktuellen Stands. Fortfahren?', 'This irreversibly replaces your CURRENT vault with the imported backup. If needed, export a backup of the current state first. Continue?')
            : L('Backup importieren und als deinen Tresor einrichten?', 'Import backup and set it up as your vault?');
        if (!window.confirm(msg)) return;

        try {
            await vsClearAll();
            localStorage.removeItem(STORE_KEY);

            await vsPutMeta({
                v: parsed.wrappedKey ? 2 : 1,
                caseId: parsed.caseId || generateCaseId(),
                salt: parsed.salt,
                pwHash: parsed.pwHash,
                wrappedKey: parsed.wrappedKey || null,
                // v1-Backups tragen die Eintraege im Kopf; unlockVault() erkennt
                // das am fehlenden wrappedKey und migriert beim Entsperren.
                entries: parsed.wrappedKey ? undefined : parsed.entries
            });
            await vsPutEntries(parsed.entries);

            for (const f of (parsed.files || [])) {
                const meta = { id: f.id, name: f.name, mime: f.mime, size: f.size, createdAt: f.createdAt, thumb: f.thumb || null };
                await vsPutFile(meta, vsB64ToBuf(f.data), b64ToU8(f.iv));
            }
        } catch (e) {
            showToast(L('Backup konnte nicht eingespielt werden', 'Could not import backup'), 'error');
            return;
        }

        // Reload erzwingt das Entsperren mit dem Passwort des importierten Tresors —
        // das ist gleichzeitig der Validitaets-Check, kein stiller Fehlschlag moeglich.
        location.reload();
    };
    reader.onerror = () => showToast(L('Datei konnte nicht gelesen werden', 'Could not read file'), 'error');
    reader.readAsText(file);
}

// ═════════════════════════════════════════
//  UI — Lock Screen
// ═════════════════════════════════════════

function initLockScreen() {
    const badge = document.getElementById('caseIdBadge');
    if (isFirstTime()) {
        document.getElementById('unlockSection').style.display = 'none';
        document.getElementById('setupSection').style.display = 'block';
        badge.style.display = 'none';
    } else {
        document.getElementById('unlockSection').style.display = 'block';
        document.getElementById('setupSection').style.display = 'none';
        const caseId = getCaseId();
        if (caseId) {
            document.getElementById('caseIdValue').textContent = caseId;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    // Auto-focus
    setTimeout(() => {
        const inp = isFirstTime() ? document.getElementById('newPwInput') : document.getElementById('pwInput');
        if (inp) inp.focus();
    }, 300);
}

async function handleUnlock() {
    const pw = document.getElementById('pwInput').value;
    const errEl = document.getElementById('lockError');
    const btn = document.getElementById('unlockBtn');
    const btnText = document.getElementById('unlockBtnText');
    if (!pw) { errEl.textContent = L('Bitte Passwort eingeben', 'Please enter a password'); return; }
    btn.disabled = true; btnText.textContent = L('Entschlüssle …', 'Decrypting …');
    try {
        await unlockVault(pw);
        document.getElementById('pwInput').value = '';
        enterApp();
    } catch (e) {
        errEl.textContent = e.message;
        btn.disabled = false; btnText.textContent = L('ZUGANG GEWÄHREN', 'GRANT ACCESS');
        // Erst nach einem tatsaechlich falschen Passwort zeigen — sonst waere
        // es eine Einladung, den eigenen Tresor grundlos zu loeschen.
        document.getElementById('forgotPasswordLink').style.display = 'block';
    }
}

// ═════════════════════════════════════════
//  TRESOR ZURÜCKSETZEN — es gibt keine Passwort-Wiederherstellung (der
//  Schluessel wird aus dem Passwort abgeleitet, verlaesst nie das Geraet),
//  also bleibt bei einem vergessenen Passwort nur: alten, unzugaenglichen
//  Tresor loeschen und neu anlegen. Tippbestaetigung statt Klick, weil das
//  ALLE Eintraege + Beweisfotos unwiderruflich vernichtet.
// ═════════════════════════════════════════

const RESET_VAULT_CONFIRM_PHRASE = L('TRESOR LÖSCHEN', 'DELETE VAULT');

function openResetVaultModal() {
    document.getElementById('resetVaultConfirmInput').value = '';
    document.getElementById('confirmResetVaultBtn').disabled = true;
    openModal('resetVaultModal');
}

function closeResetVaultModal() {
    closeModal('resetVaultModal');
}

function updateResetVaultButton() {
    const val = document.getElementById('resetVaultConfirmInput').value.trim();
    document.getElementById('confirmResetVaultBtn').disabled = val !== RESET_VAULT_CONFIRM_PHRASE;
}

async function confirmResetVault() {
    const val = document.getElementById('resetVaultConfirmInput').value.trim();
    if (val !== RESET_VAULT_CONFIRM_PHRASE) return;
    localStorage.removeItem(STORE_KEY);
    await vsClearAll();          // sonst blieben die Dateien in IndexedDB liegen
    vaultMeta = null;
    legacyVault = null;
    entries = [];
    derivedKey = null;
    closeResetVaultModal();
    document.getElementById('pwInput').value = '';
    document.getElementById('lockError').textContent = '';
    document.getElementById('forgotPasswordLink').style.display = 'none';
    initLockScreen();
    showToast(L('Tresor gelöscht — leg einen neuen mit einem neuen Passwort an', 'Vault deleted — set up a new one with a new password'), 'info');
}

async function handleSetup() {
    const pw = document.getElementById('newPwInput').value;
    const confirm = document.getElementById('confirmPwInput').value;
    const errEl = document.getElementById('setupError');
    if (pw.length < 8) { errEl.textContent = L('Mindestens 8 Zeichen', 'At least 8 characters'); return; }
    if (calcPwStrength(pw) < 2) { errEl.textContent = L('Passwort zu schwach — verwende Groß/Kleinbuchstaben, Zahlen und Sonderzeichen', 'Password too weak — use upper/lowercase letters, numbers and special characters'); return; }
    if (pw !== confirm) { errEl.textContent = L('Passwörter stimmen nicht überein', 'Passwords do not match'); return; }
    try {
        await createVault(pw);
        document.getElementById('newPwInput').value = '';
        document.getElementById('confirmPwInput').value = '';
        enterApp();
        showToast(L('Tresor erstellt — dein Schatten-Berichtsheft ist bereit', 'Vault created — your shadow report book is ready'), 'success');
    } catch (e) {
        errEl.textContent = e.message;
    }
}

async function enterApp() {
    // Datei-Metadaten VOR dem ersten Rendern laden, sonst zeigt die Liste
    // beim Entsperren kurz Typ-Symbole statt der Vorschaubilder.
    await refreshFileMetaCache();
    const lockBody = document.getElementById('lockSvgBody');
    if (lockBody) {
        lockBody.classList.add('pulse-once');
        setTimeout(() => lockBody.classList.remove('pulse-once'), 750);
    }
    document.getElementById('lockScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('visible');
    document.getElementById('sessionTimer').style.display = 'flex';
    // Aktenzeichen UND die Vertraulichkeits-Aussage — der frueher dauerhaft
    // eingeblendete VERTRAULICH-Banner ist entfallen, seine eine echte
    // Information steht jetzt hier in der Kopfzeile.
    const caseId = getCaseId();
    document.getElementById('headerCaseId').textContent = caseId
        ? caseId + L(' · lokal verschlüsselt', ' · encrypted locally')
        : L('Lokal verschlüsselt · AES-256-GCM', 'Encrypted locally · AES-256-GCM');
    sessionStart = Date.now();
    startSessionTimer();
    resetAutoLock();
    renderEntries();
    updateStats();
    populateCategoryFilter();
    updateCloudSyncUI();
}

function lockApp() {
    derivedKey = null;
    entries = [];
    document.getElementById('mainApp').classList.remove('visible');
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('sessionTimer').style.display = 'none';
    document.getElementById('lockScreen').classList.remove('hidden');
    if (sessionInterval) clearInterval(sessionInterval);
    if (autoLockTimer) clearTimeout(autoLockTimer);
    setTimeout(() => {
        document.getElementById('mainApp').style.display = '';
        initLockScreen();
    }, 600);
    showToast(L('Tresor gesperrt', 'Vault locked'), 'info');
}

const ICON_EYE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const ICON_EYE_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.4 18.4 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

function togglePwVis(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (inp.type === 'password') { inp.type = 'text'; btn.innerHTML = ICON_EYE_OFF; }
    else { inp.type = 'password'; btn.innerHTML = ICON_EYE; }
}

// ═════════════════════════════════════════
//  TRESOR-MENÜ — Passwort ändern, Backup export/import, Speicheranzeige
// ═════════════════════════════════════════

function toggleVaultMenu() {
    const menu = document.getElementById('vaultMenu');
    const willOpen = !menu.classList.contains('open');
    menu.classList.toggle('open', willOpen);
    if (willOpen) renderStorageMeter();
}

// Speicheranzeige. Zeigt bewusst BEIDE Zahlen: was der Tresor belegt und
// was der Browser insgesamt zugesteht. Es gibt keine kuenstliche Grenze —
// wie der Platz auf Fotos, PDFs und Videos verteilt wird, entscheidet der
// Fall. Die Anzeige ist Information, keine Schranke.
//
// `quota` ist eine Schaetzung des Browsers und haengt am freien Plattenplatz.
// Sie wird deshalb angezeigt, aber nie als Bedingung ausgewertet.
async function renderStorageMeter() {
    const sizeEl = document.getElementById('vaultMenuSize');
    const barEl = document.getElementById('vaultStorageBar');
    const noteEl = document.getElementById('vaultStorageNote');
    if (!sizeEl) return;

    const usage = await vsUsage();
    const quota = await vsQuota();
    const persisted = await vsIsPersisted();

    sizeEl.textContent = formatBytes(usage.bytes) +
        (usage.count ? ' · ' + usage.count + ' ' + (usage.count === 1 ? L('Datei', 'file') : L('Dateien', 'files')) : '');

    if (barEl) {
        const pct = quota.quota ? Math.min(100, (quota.usage / quota.quota) * 100) : 0;
        // Unter 1,5 % waere der Balken unsichtbar und saehe nach "kaputt" aus.
        barEl.style.width = (pct > 0 && pct < 1.5 ? 1.5 : pct) + '%';
        barEl.classList.toggle('is-tight', pct > 85);
    }

    if (noteEl) {
        const parts = [];
        if (quota.quota) parts.push(L('Verfügbar: ', 'Available: ') + formatBytes(quota.quota - quota.usage));
        if (vsIsFallback()) {
            parts.push(L('Notbetrieb — enges Limit', 'Fallback mode — tight limit'));
        } else if (!persisted) {
            // Ehrlich benennen: ohne Dauerhaftigkeit darf der Browser den
            // Tresor bei Speicherdruck raeumen. Der Nutzer soll wissen,
            // dass das Backup dann seine einzige Absicherung ist.
            parts.push(L('Nicht dauerhaft geschützt — Backup exportieren', 'Not marked persistent — export a backup'));
        }
        noteEl.textContent = parts.join(' · ');
        noteEl.classList.toggle('is-warn', vsIsFallback() || !persisted);
    }
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('vaultMenu');
    const trigger = document.getElementById('vaultMenuTrigger');
    if (!menu || !menu.classList.contains('open')) return;
    if (!menu.contains(e.target) && e.target !== trigger && !trigger.contains(e.target)) {
        menu.classList.remove('open');
    }
});

function openChangePasswordModal() {
    document.getElementById('vaultMenu').classList.remove('open');
    document.getElementById('currentPwInput').value = '';
    document.getElementById('newPwInput2').value = '';
    document.getElementById('confirmPwInput2').value = '';
    document.getElementById('changePwError').textContent = '';
    openModal('changePasswordModal');
}

async function handleChangePassword() {
    const currentPw = document.getElementById('currentPwInput').value;
    const newPw = document.getElementById('newPwInput2').value;
    const confirmPw = document.getElementById('confirmPwInput2').value;
    const errEl = document.getElementById('changePwError');

    if (newPw.length < 8) { errEl.textContent = L('Mindestens 8 Zeichen', 'At least 8 characters'); return; }
    if (calcPwStrength(newPw) < 2) { errEl.textContent = L('Passwort zu schwach', 'Password too weak'); return; }
    if (newPw !== confirmPw) { errEl.textContent = L('Passwörter stimmen nicht überein', 'Passwords do not match'); return; }

    try {
        await changePassword(currentPw, newPw);
        closeModal('changePasswordModal');
        showToast(L('Passwort geändert', 'Password changed'), 'success');
    } catch (e) {
        errEl.textContent = e.message;
    }
}

// ═════════════════════════════════════════
//  CLOUD-FREIGABE
//  Der Tresor bleibt standardmaessig auf diesem Geraet. Wer ihn mitnehmen will,
//  gibt ihn hier ausdruecklich frei — bestaetigt mit dem Tresor-Passwort, damit
//  das nicht jemand nebenbei an einem offenen Geraet umlegt.
//  Hochgeladen wird ausschliesslich der verschluesselte Block: der Schluessel
//  wird aus dem Passwort abgeleitet und existiert nirgendwo sonst. Wer die Datei
//  auf dem Server liest, sieht Zufallszahlen. Ohne Passwort auch fuer uns.
//  Die eigentliche Sperre sitzt in Assets/js/Cloud/supabase-integration.js
//  (cloudKeyAllowed) — sie greift fuer Upload UND Download.
// ═════════════════════════════════════════

const CLOUD_FLAG_KEY = 'schatten_cloud_sync';

function isVaultCloudSyncOn() {
    try { return localStorage.getItem(CLOUD_FLAG_KEY) === '1'; } catch (e) { return false; }
}

// Prueft ein Passwort, ohne den Zustand anzufassen: Schluessel neu ableiten und
// einen Entschluesselungsversuch machen. Der pwHash im Tresor waere billiger,
// aber ein echter Entschluesselungsversuch ist der Beweis, nicht nur ein Indiz.
async function verifyVaultPassword(password) {
    const vault = getVault();
    if (!vault || !password) return false;
    try {
        const key = await deriveKey(password, b64ToU8(vault.salt));
        await decrypt(vault.entries, key);
        return true;
    } catch (e) {
        return false;
    }
}

function updateCloudSyncUI() {
    const on = isVaultCloudSyncOn();
    const state = document.getElementById('cloudSyncState');
    if (state) {
        state.textContent = on ? L('An', 'On') : L('Aus', 'Off');
        state.classList.toggle('is-on', on);
    }
    const modal = document.getElementById('vaultCloudModal');
    if (modal) modal.classList.toggle('is-on', on);
    // `hidden` statt Klasse: das Attribut haelt den Hinweis auch aus dem
    // Vorlese-Baum heraus, solange die Freigabe aus ist.
    const hint = document.getElementById('cloudSyncHint');
    if (hint) hint.hidden = !on;
    const btn = document.getElementById('vaultCloudConfirmBtn');
    if (btn) {
        btn.textContent = on ? L('Freigabe aufheben', 'Turn sharing off') : L('Freigeben', 'Turn sharing on');
        btn.classList.toggle('btn-danger', on);
        btn.classList.toggle('btn-cta', !on);
    }
}

function openVaultCloudModal() {
    document.getElementById('vaultMenu').classList.remove('open');
    const pw = document.getElementById('vaultCloudPwInput');
    if (pw) pw.value = '';
    const err = document.getElementById('vaultCloudError');
    if (err) err.textContent = '';
    updateCloudSyncUI();
    openModal('vaultCloudModal');
    setTimeout(() => { if (pw) pw.focus(); }, 250);
}

async function confirmVaultCloudToggle() {
    const btn = document.getElementById('vaultCloudConfirmBtn');
    const errEl = document.getElementById('vaultCloudError');
    const pw = document.getElementById('vaultCloudPwInput').value;
    errEl.textContent = '';
    if (!pw) { errEl.textContent = L('Bitte Tresor-Passwort eingeben', 'Please enter the vault password'); return; }

    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = L('Prüfe …', 'Checking …');
    const ok = await verifyVaultPassword(pw);
    btn.disabled = false;
    btn.textContent = label;
    if (!ok) { errEl.textContent = L('Falsches Passwort', 'Wrong password'); return; }

    const turningOn = !isVaultCloudSyncOn();
    try {
        if (turningOn) localStorage.setItem(CLOUD_FLAG_KEY, '1');
        else localStorage.removeItem(CLOUD_FLAG_KEY);
    } catch (e) {
        errEl.textContent = L('Einstellung konnte nicht gespeichert werden', 'Could not save the setting');
        return;
    }
    document.getElementById('vaultCloudPwInput').value = '';
    updateCloudSyncUI();
    closeModal('vaultCloudModal');
    showToast(turningOn
        ? L('Tresor fährt ab jetzt mit der Cloud-Synchronisation mit', 'The vault now travels with cloud sync')
        : L('Tresor bleibt wieder auf diesem Gerät', 'The vault stays on this device again'),
        turningOn ? 'success' : 'info');
}

function triggerBackupExport() {
    document.getElementById('vaultMenu').classList.remove('open');
    exportBackup();
}

function triggerBackupImportPicker() {
    document.getElementById('vaultMenu').classList.remove('open');
    document.getElementById('backupFileInput').click();
}

function triggerBackupImportPickerFromLock() {
    document.getElementById('backupFileInputLock').click();
}

// Auto-lock after inactivity
function resetAutoLock() {
    if (autoLockTimer) clearTimeout(autoLockTimer);
    autoLockTimer = setTimeout(() => {
        if (derivedKey) lockApp();
    }, AUTO_LOCK_MS);
}

['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev => {
    document.addEventListener(ev, () => { if (derivedKey) resetAutoLock(); }, { passive: true });
});

// Session timer
function startSessionTimer() {
    const el = document.getElementById('sessionTimerText');
    sessionInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        el.textContent = L('Sitzung: ', 'Session: ') + m + ':' + String(s).padStart(2, '0');
    }, 1000);
}

// ═════════════════════════════════════════
//  BEWEISMITTEL — Bild-Anhaenge (komprimiert, im Entry mitverschluesselt)
// ═════════════════════════════════════════

// KEINE Stueckzahl- und keine Groessengrenze: Was als Beweismittel taugt,
// entscheidet der Fall, nicht der Speicher. Der Tresor zeigt stattdessen
// seine Belegung an (siehe renderStorageMeter) und der Nutzer teilt sie
// selbst ein. Die frueheren `MAX_ATTACHMENTS = 5` waren eine Folge des
// 5-MB-localStorage-Deckels — der ist mit IndexedDB weg.

// Vorschaubilder werden klein gerechnet, weil sie im Metadaten-Record
// mitreisen und die Dateiliste sonst wieder teuer zu laden waere.
const THUMB_MAX_DIM = 320;
const THUMB_QUALITY = 0.7;

let currentAttachments = [];

// Vorschaubilder und Groessen fuer die Eintragsliste. Ohne diesen Zwischen-
// speicher braeuchte jedes Rendern einen IndexedDB-Zugriff pro Anhang;
// renderEntries() ist aber synchron und laeuft bei jedem Tastendruck in der
// Suche. Der Cache haelt nur Metadaten (inkl. kleinem Thumbnail), nie Bytes.
let fileMetaCache = new Map();

async function refreshFileMetaCache() {
    const all = await vsAllFileMeta();
    fileMetaCache = new Map(all.map(f => [f.id, f]));
}

// Bytes wegraeumen, auf die kein Eintrag mehr zeigt: abgebrochene
// Eintraege, entfernte Anhaenge, geloeschte Eintraege. Laeuft erst NACH
// einem erfolgreichen Speichern — vorher waere die Zuordnung nicht
// verlaesslich und ein Beweismittel koennte verschwinden, obwohl der
// Eintrag es noch braucht.
async function cleanupUnusedFiles() {
    const used = [];
    for (const e of entries) {
        for (const a of (e.attachments || [])) used.push(a.id);
    }
    await vsPruneOrphans(used);
    await refreshFileMetaCache();
}

// Beweismittel werden BIT-IDENTISCH abgelegt — kein Umkodieren, kein
// Neukomprimieren, auch nicht bei Fotos. Ein nachtraeglich durch einen
// Canvas gelaufenes Bild hat andere Pruefsummen als das Original, verliert
// seine EXIF-Daten (Aufnahmezeit!) und ist als Beweis angreifbar. Die
// Verkleinerung passiert ausschliesslich fuer die Vorschau.
const ATT_ICONS = {
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15h1.5a1.5 1.5 0 0 0 0-3H9v6"></path><path d="M14 18v-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2z"></path></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-4.35-4.35a2 2 0 0 0-2.83 0L3 21"></path></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="13" y2="17"></line></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect x="2" y="6" width="14" height="12" rx="2"></rect></svg>',
    generic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
};

function fileKind(mime, name) {
    const m = (mime || '').toLowerCase();
    const ext = (name || '').split('.').pop().toLowerCase();
    if (m.indexOf('image/') === 0) return 'image';
    if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (m.indexOf('audio/') === 0) return 'audio';
    if (m.indexOf('video/') === 0) return 'video';
    if (/^(doc|docx|odt|rtf|txt|md|eml|msg|xls|xlsx|ods|csv)$/.test(ext)) return 'doc';
    return 'generic';
}

// Vorschau NUR fuer Bilder. Scheitert das (defektes Bild, exotisches
// Format), gibt es kein Thumbnail und die Kachel zeigt das Typ-Symbol —
// die Datei selbst bleibt davon unberuehrt gespeichert.
function makeThumbnail(file) {
    return new Promise(resolve => {
        if (!(file.type || '').startsWith('image/')) { resolve(null); return; }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            try {
                let { width, height } = img;
                const scale = Math.min(1, THUMB_MAX_DIM / Math.max(width, height));
                width = Math.max(1, Math.round(width * scale));
                height = Math.max(1, Math.round(height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', THUMB_QUALITY));
            } catch (e) { resolve(null); }
            URL.revokeObjectURL(url);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

// Dateien wandern SOFORT verschluesselt nach IndexedDB, nicht erst beim
// Speichern des Eintrags. Sonst laege eine 200-MB-Videodatei bis zum Klick
// auf "Speichern" komplett im Arbeitsspeicher. Bricht der Nutzer den
// Eintrag ab, raeumt vsPruneOrphans() die verwaisten Bytes wieder weg.
async function handleAttachmentSelect(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (!derivedKey) { showToast(L('Tresor ist gesperrt', 'Vault is locked'), 'error'); return; }

    for (const file of files) {
        const pendingId = crypto.randomUUID();
        currentAttachments.push({ id: pendingId, name: file.name, mime: file.type || 'application/octet-stream', size: file.size, pending: true });
        renderAttachmentThumbs();
        try {
            const buf = await file.arrayBuffer();
            const thumb = await makeThumbnail(file);
            const enc = await encryptBytes(buf, derivedKey);
            const meta = {
                id: pendingId,
                name: file.name,
                mime: file.type || 'application/octet-stream',
                size: file.size,
                createdAt: new Date().toISOString(),
                thumb: thumb
            };
            await vsPutFile(meta, enc.data, enc.iv);
            const idx = currentAttachments.findIndex(a => a.id === pendingId);
            if (idx !== -1) currentAttachments[idx] = { id: meta.id, name: meta.name, mime: meta.mime, size: meta.size, thumb: thumb };
        } catch (e) {
            currentAttachments = currentAttachments.filter(a => a.id !== pendingId);
            const full = e && (e.name === 'QuotaExceededError' || e.name === 'NotEnoughSpace');
            showToast(full
                ? L('Speicher des Browsers voll — Platz schaffen oder ein Backup exportieren',
                    'Browser storage full — free up space or export a backup')
                : L('„' + file.name + '" konnte nicht gespeichert werden', '"' + file.name + '" could not be saved'), 'error');
        }
        renderAttachmentThumbs();
    }
    renderStorageMeter();
}

async function removeAttachment(id) {
    currentAttachments = currentAttachments.filter(a => a.id !== id);
    renderAttachmentThumbs();
    // Bytes bleiben vorerst liegen: Der Nutzer koennte den Eintrag noch
    // abbrechen, dann waere der Anhang der GESPEICHERTEN Fassung sonst weg.
    // Aufgeraeumt wird nach dem Speichern ueber vsPruneOrphans().
}

function renderAttachmentThumbs() {
    const wrap = document.getElementById('attachmentThumbs');
    if (!wrap) return;
    if (!currentAttachments.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = currentAttachments.map(a => {
        const kind = fileKind(a.mime, a.name);
        const face = a.pending
            ? '<span class="attach-tile-spin" aria-hidden="true"></span>'
            : (a.thumb
                ? '<img src="' + a.thumb + '" alt="">'
                : '<span class="attach-tile-ico" aria-hidden="true">' + ATT_ICONS[kind] + '</span>');
        return '<div class="attach-tile' + (a.pending ? ' is-pending' : '') + '" data-kind="' + kind + '">' +
            '<div class="attach-tile-face">' + face + '</div>' +
            '<div class="attach-tile-meta">' +
                '<span class="attach-tile-name" title="' + escapeHtml(a.name) + '">' + escapeHtml(a.name) + '</span>' +
                '<span class="attach-tile-size">' + (a.pending ? L('wird verschlüsselt …', 'encrypting …') : formatBytes(a.size)) + '</span>' +
            '</div>' +
            (a.pending ? '' :
            '<button type="button" class="attach-tile-remove" onclick="removeAttachment(\'' + a.id + '\')" aria-label="' +
                L('Anhang entfernen', 'Remove attachment') + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
            '</button>') +
        '</div>';
    }).join('');
}

// Der Betrachter bekommt nur noch die Datei-ID. Bytes werden erst beim
// Oeffnen aus IndexedDB geholt und entschluesselt — so haengt nicht der
// ganze Tresor im Arbeitsspeicher, sobald eine Liste gerendert wird.
let viewerObjectUrl = null;

function releaseViewerUrl() {
    if (viewerObjectUrl) { URL.revokeObjectURL(viewerObjectUrl); viewerObjectUrl = null; }
}

async function loadAttachmentBlob(id) {
    const meta = await vsGetFileMeta(id);
    const rec = await vsGetFileBytes(id);
    if (!meta || !rec) return null;
    const plain = await decryptBytes(rec.iv, rec.data, derivedKey);
    return { meta, blob: new Blob([plain], { type: meta.mime || 'application/octet-stream' }) };
}

async function openAttachmentViewer(id) {
    const body = document.getElementById('attachmentViewerBody');
    const title = document.getElementById('attachmentViewerTitle');
    const dl = document.getElementById('attachmentViewerDownload');
    releaseViewerUrl();
    body.innerHTML = '<p class="viewer-status">' + L('Wird entschlüsselt …', 'Decrypting …') + '</p>';
    openModal('attachmentViewerModal');

    let loaded;
    try {
        loaded = await loadAttachmentBlob(id);
    } catch (e) {
        body.innerHTML = '<p class="viewer-status">' + L('Datei konnte nicht entschlüsselt werden', 'Could not decrypt file') + '</p>';
        return;
    }
    if (!loaded) {
        // Kann auftreten, wenn ein Tresor aus der Cloud kam: dort reisen die
        // Eintraege mit, die Dateien bleiben auf dem Ursprungsgeraet.
        body.innerHTML = '<p class="viewer-status">' +
            L('Diese Datei liegt nicht auf diesem Gerät. Anhänge bleiben lokal — spiel ein Backup vom Ursprungsgerät ein.',
              'This file is not on this device. Attachments stay local — import a backup from the original device.') + '</p>';
        return;
    }

    const { meta, blob } = loaded;
    viewerObjectUrl = URL.createObjectURL(blob);
    title.textContent = meta.name;
    dl.href = viewerObjectUrl;
    dl.download = meta.name;
    dl.style.display = 'inline-flex';

    const kind = fileKind(meta.mime, meta.name);
    if (kind === 'image') {
        body.innerHTML = '<img src="' + viewerObjectUrl + '" alt="' + escapeHtml(meta.name) + '" class="viewer-image">';
    } else if (kind === 'pdf') {
        // <object> statt <iframe>: faellt bei fehlendem PDF-Betrachter auf
        // den inneren Inhalt zurueck, statt ein leeres Rechteck zu zeigen.
        body.innerHTML = '<object data="' + viewerObjectUrl + '" type="application/pdf" class="viewer-pdf">' +
            '<p class="viewer-status">' + L('Dieser Browser zeigt keine PDFs an — nutze „Herunterladen".',
                                            'This browser cannot display PDFs — use "Download".') + '</p></object>';
    } else if (kind === 'audio') {
        body.innerHTML = '<audio controls src="' + viewerObjectUrl + '" class="viewer-media"></audio>';
    } else if (kind === 'video') {
        body.innerHTML = '<video controls src="' + viewerObjectUrl + '" class="viewer-media"></video>';
    } else {
        body.innerHTML = '<div class="viewer-file">' +
            '<span class="viewer-file-ico">' + ATT_ICONS[kind] + '</span>' +
            '<p class="viewer-status">' + escapeHtml(meta.name) + ' · ' + formatBytes(meta.size) + '</p>' +
            '<p class="viewer-status">' + L('Vorschau nicht möglich — die Datei liegt unverändert im Tresor.',
                                            'No preview available — the file is stored unchanged in the vault.') + '</p>' +
        '</div>';
    }
}

function closeAttachmentViewer() {
    closeModal('attachmentViewerModal');
    const body = document.getElementById('attachmentViewerBody');
    if (body) body.innerHTML = '';   // stoppt laufende Medien und loest den Blob
    releaseViewerUrl();
}

// ═════════════════════════════════════════
//  ENTRIES — CRUD
// ═════════════════════════════════════════

let selectedSeverity = 'medium';

function selectSeverity(sev) {
    selectedSeverity = sev;
    document.querySelectorAll('.severity-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.sev === sev);
    });
}

// Baut den Detailfelder-Container fuer die gewaehlte Kategorie neu auf.
// values (optional) fuellt vorhandene entry.details beim Bearbeiten vor.
function renderCategoryFields(category, values) {
    values = values || {};
    const container = document.getElementById('categoryFieldsContainer');
    const fields = CATEGORY_FIELDS[category] || [];
    if (!fields.length) { container.innerHTML = ''; return; }
    container.innerHTML = fields.map(f => {
        const val = values[f.key] || '';
        const id = 'catfield_' + f.key;
        if (f.type === 'select') {
            const opts = f.options.map(([v, label]) =>
                '<option value="' + v + '"' + (v === val ? ' selected' : '') + '>' + label + '</option>'
            ).join('');
            return '<div class="form-group"><label class="form-label">' + f.label + '</label>' +
                '<select class="form-select" id="' + id + '"><option value="">—</option>' + opts + '</select></div>';
        }
        return '<div class="form-group"><label class="form-label">' + f.label + '</label>' +
            '<input type="' + f.type + '" class="form-input" id="' + id + '" value="' + escapeHtml(val) + '"' +
            (f.placeholder ? ' placeholder="' + escapeHtml(f.placeholder) + '"' : '') + '></div>';
    }).join('');
}

// Liefert [{label, value}] mit aufgeloesten Select-Labels — gemeinsame Quelle
// fuer Entry-Card, PDF- und TXT-Export, damit die drei nie auseinanderlaufen.
function resolveCategoryDetails(category, details) {
    if (!details) return [];
    const fields = CATEGORY_FIELDS[category] || [];
    const out = [];
    fields.forEach(f => {
        const raw = details[f.key];
        if (!raw) return;
        let value = raw;
        if (f.type === 'select') {
            const opt = f.options.find(([v]) => v === raw);
            if (opt) value = opt[1];
        }
        out.push({ label: f.label, value: value });
    });
    return out;
}

function collectCategoryFieldValues(category) {
    const fields = CATEGORY_FIELDS[category] || [];
    const details = {};
    fields.forEach(f => {
        const el = document.getElementById('catfield_' + f.key);
        if (el && el.value) details[f.key] = el.value;
    });
    return details;
}

function openNewEntry() {
    document.getElementById('entryModalTitle').textContent = L('Neuer Eintrag', 'New entry');
    document.getElementById('entryEditId').value = '';
    document.getElementById('entryDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('entryTime').value = new Date().toTimeString().slice(0, 5);
    selectedSeverity = 'medium';
    selectSeverity('medium');
    document.getElementById('entryCategory').value = 'verbal';
    document.getElementById('entryStatus').value = 'open';
    document.getElementById('entryText').value = '';
    document.getElementById('entryWitnesses').value = '';
    currentAttachments = [];
    renderAttachmentThumbs();
    renderCategoryFields('verbal');
    openModal('entryModal');
}

function openEditEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    document.getElementById('entryModalTitle').textContent = L('Eintrag bearbeiten', 'Edit entry');
    document.getElementById('entryEditId').value = id;
    document.getElementById('entryDate').value = entry.date;
    document.getElementById('entryTime').value = entry.time || '';
    selectedSeverity = entry.severity;
    selectSeverity(entry.severity);
    document.getElementById('entryCategory').value = entry.category;
    document.getElementById('entryStatus').value = entry.status || 'open';
    document.getElementById('entryText').value = entry.text;
    document.getElementById('entryWitnesses').value = (entry.witnesses || []).join(', ');
    // Vorschaubild aus dem Cache anreichern — im Eintrag steht nur die Referenz.
    currentAttachments = (entry.attachments || []).map(a => {
        const cached = fileMetaCache.get(a.id);
        return Object.assign({}, a, { thumb: cached ? cached.thumb : null });
    });
    renderAttachmentThumbs();
    renderCategoryFields(entry.category, entry.details || {});
    openModal('entryModal');
}

async function saveEntry() {
    const date = document.getElementById('entryDate').value;
    const time = document.getElementById('entryTime').value;
    const category = document.getElementById('entryCategory').value;
    const text = document.getElementById('entryText').value.trim();
    const witnesses = document.getElementById('entryWitnesses').value.trim();

    if (!date) { showToast(L('Datum fehlt', 'Date missing'), 'warning'); return; }
    if (!text) { showToast(L('Beschreibung fehlt', 'Description missing'), 'warning'); return; }

    const editId = document.getElementById('entryEditId').value;
    const witnessList = witnesses ? witnesses.split(',').map(w => w.trim()).filter(Boolean) : [];
    // Nur die Referenz wandert in den Eintrag. Vorschaubild und Bytes liegen
    // in IndexedDB — laege das Thumbnail hier mit drin, waere der
    // Eintrags-Block wieder so gross wie frueher der ganze Tresor.
    const attachmentsSnapshot = currentAttachments
        .filter(a => !a.pending)
        .map(a => ({ id: a.id, name: a.name, mime: a.mime, size: a.size }));
    const status = document.getElementById('entryStatus').value || 'open';
    const details = collectCategoryFieldValues(category);

    // Rollback-Kopie fuer den Fall, dass saveVault() an der Speicher-Quota scheitert —
    // Beweismittel duerfen dann nicht still verschwinden (siehe Plan: kein automatisches Kuerzen).
    const beforeEntries = entries.map(e => Object.assign({}, e));

    if (editId) {
        const idx = entries.findIndex(e => e.id === editId);
        if (idx !== -1) {
            const prev = entries[idx];
            const history = (prev.history || []).slice();
            history.push({ ts: prev.updatedAt || prev.createdAt, date: prev.date, time: prev.time, severity: prev.severity, category: prev.category, text: prev.text, witnesses: prev.witnesses || [], status: prev.status || 'open', details: prev.details || {} });
            const updated = Object.assign({}, prev, {
                date, time, severity: selectedSeverity, category, text,
                witnesses: witnessList,
                attachments: attachmentsSnapshot,
                status, details,
                history,
                updatedAt: new Date().toISOString(),
            });
            updated.contentHash = await contentFingerprint(updated);
            entries[idx] = updated;
        }
    } else {
        const newEntry = {
            id: crypto.randomUUID(),
            date, time,
            severity: selectedSeverity,
            category, text,
            witnesses: witnessList,
            attachments: attachmentsSnapshot,
            status, details,
            history: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        newEntry.contentHash = await contentFingerprint(newEntry);
        entries.push(newEntry);
    }

    try {
        await saveVault();
    } catch (e) {
        entries = beforeEntries;
        showToast(L('Speichern fehlgeschlagen — exportiere zur Sicherheit ein Backup',
                    'Saving failed — export a backup to be safe'), 'error');
        return;
    }
    await cleanupUnusedFiles();
    closeModal('entryModal');
    renderEntries();
    updateStats();
    showToast(editId ? L('Eintrag aktualisiert & verschlüsselt', 'Entry updated & encrypted') : L('Eintrag verschlüsselt gespeichert', 'Entry saved encrypted'), 'success');
}

function confirmDelete(id) {
    openModal('deleteModal');
    document.getElementById('confirmDeleteBtn').onclick = async () => {
        entries = entries.filter(e => e.id !== id);
        await saveVault();
        await cleanupUnusedFiles();   // Anhaenge des Eintrags mit entfernen
        closeModal('deleteModal');
        renderEntries();
        updateStats();
        showToast(L('Eintrag gelöscht', 'Entry deleted'), 'success');
    };
}

// ═════════════════════════════════════════
//  RENDER
// ═════════════════════════════════════════

function renderEntries() {
    const list = document.getElementById('entriesList');
    const search = (document.getElementById('searchInput').value || '').toLowerCase();
    const sevFilter = document.getElementById('filterSeverity').value;
    const catFilter = document.getElementById('filterCategory').value;
    const sort = document.getElementById('sortOrder').value;

    let filtered = entries.filter(e => {
        if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
        if (catFilter !== 'all' && e.category !== catFilter) return false;
        if (search && !e.text.toLowerCase().includes(search) && !e.date.includes(search) && !(e.witnesses || []).join(' ').toLowerCase().includes(search)) return false;
        return true;
    });

    if (sort === 'newest') filtered.sort((a, b) => b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''));
    else if (sort === 'oldest') filtered.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    else if (sort === 'severity') filtered.sort((a, b) => (SEVERITY_ORDER[a.severity] || 9) - (SEVERITY_ORDER[b.severity] || 9));

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">' + UI_ICONS.folderEmpty + '</div><h3>' +
            (entries.length === 0 ? L('Noch keine Einträge', 'No entries yet') : L('Keine Treffer', 'No matches')) +
            '</h3><p>' +
            (entries.length === 0 ? L('Erstelle deinen ersten vertraulichen Eintrag mit dem Button oben.', 'Create your first confidential entry with the button above.') : L('Ändere die Filter oder den Suchbegriff.', 'Change the filters or the search term.')) +
            '</p></div>';
        return;
    }

    list.innerHTML = filtered.map(e => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        const sevClass = 'sev-' + e.severity;
        const dateStr = formatDate(e.date);
        const witnessHtml = (e.witnesses && e.witnesses.length) ?
            '<div class="entry-witnesses"><span class="inline-icon">' + UI_ICONS.users + '</span>' + L('Zeugen: ', 'Witnesses: ') + escapeHtml(e.witnesses.join(', ')) + '</div>' : '';

        const attachments = e.attachments || [];
        const attachHtml = attachments.length ?
            '<div class="entry-attach-strip">' + attachments.map(a => {
                // Vorschaubild kommt aus dem Metadaten-Cache, nicht aus dem
                // Eintrag — der traegt nur noch die Referenz.
                const cached = fileMetaCache.get(a.id);
                const kind = fileKind(a.mime, a.name);
                const face = (cached && cached.thumb)
                    ? '<img src="' + cached.thumb + '" alt="">'
                    : '<span class="entry-attach-ico" aria-hidden="true">' + ATT_ICONS[kind] + '</span>';
                return '<button type="button" class="entry-attach-chip" data-kind="' + kind + '" ' +
                    'onclick="openAttachmentViewer(\'' + a.id + '\')" title="' + escapeHtml(a.name) + '">' +
                    face + '<span class="entry-attach-label">' + escapeHtml(a.name) + '</span>' +
                '</button>';
            }).join('') + '</div>' : '';

        const history = e.history || [];
        const revisionHtml = history.length ?
            '<button class="entry-revision-badge" onclick="openHistoryModal(\'' + e.id + '\')" title="' + L('Änderungsverlauf ansehen', 'View change history') + '">' +
                '<span class="inline-icon">' + UI_ICONS.history + '</span>' + history.length + '× ' + L('bearbeitet', 'edited') +
            '</button>' : '';

        const status = e.status || 'open';
        const statusMeta = STATUS_META[status] || STATUS_META.open;
        const statusHtml = '<span class="status-badge" style="--status-color:' + statusMeta.color + '">' +
            '<span class="status-dot"></span>' + statusMeta.label + '</span>';

        const detailRows = resolveCategoryDetails(e.category, e.details);
        const detailsHtml = detailRows.length ?
            '<dl class="entry-details">' + detailRows.map(d =>
                '<div class="entry-details-row"><dt>' + escapeHtml(d.label) + '</dt><dd>' + escapeHtml(d.value) + '</dd></div>'
            ).join('') + '</dl>' : '';

        // Zeitleiste statt loser Kartenliste: der Punkt traegt den Schweregrad,
        // die Linie dahinter die Chronologie. Der Punkt liegt als Geschwister
        // NEBEN .entry-body, nicht darin — sonst schnitte das Karten-Padding
        // ihn von der Linie ab.
        return '<div class="entry-card" data-severity="' + e.severity + '">' +
            '<span class="entry-dot" aria-hidden="true"></span>' +
            '<div class="entry-body">' +
                '<div class="entry-header">' +
                    '<div class="entry-meta"><span class="entry-date">' + dateStr + '</span>' +
                    (e.time ? '<span class="entry-time">' + e.time + L(' Uhr', '') + '</span>' : '') +
                    '</div>' +
                    '<div class="entry-header-badges"><span class="entry-severity ' + sevClass + '">' + (SEVERITY_LABELS[e.severity] || e.severity) + '</span>' + statusHtml + '</div>' +
                '</div>' +
                '<div class="entry-category"><span class="cat-icon">' + cat.icon + '</span>' + cat.label + '</div>' +
                '<div class="entry-text">' + escapeHtml(e.text) + '</div>' +
                detailsHtml +
                attachHtml +
                witnessHtml +
                '<div class="entry-actions">' +
                    '<button class="btn btn-sm" onclick="openEditEntry(\'' + e.id + '\')">' + UI_ICONS.edit + ' ' + L('Bearbeiten', 'Edit') + '</button>' +
                    '<button class="btn btn-sm btn-icon" onclick="openEscalationModal(\'' + e.category + '\')" title="' + L('Was tun? Anlaufstellen', 'What to do? Contacts') + '" aria-label="' + L('Was tun? Anlaufstellen', 'What to do? Contacts') + '">' + UI_ICONS.info + '</button>' +
                    revisionHtml +
                    '<button class="btn btn-sm btn-icon btn-danger" onclick="confirmDelete(\'' + e.id + '\')" title="' + L('Löschen', 'Delete') + '" aria-label="' + L('Eintrag löschen', 'Delete entry') + '">' + UI_ICONS.trash + '</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');
}

function updateStats() {
    const critical = entries.filter(e => e.severity === 'critical').length;
    const high = entries.filter(e => e.severity === 'high').length;

    document.getElementById('statTotal').textContent = entries.length;
    document.getElementById('statCritical').textContent = critical;
    document.getElementById('statHigh').textContent = high;

    // Eine rote 0 behauptet einen Alarm, den es nicht gibt — bei Null faellt
    // die Status-Farbe auf neutral zurueck (CSS: .stat-num[data-zero]).
    document.getElementById('statCritical').toggleAttribute('data-zero', critical === 0);
    document.getElementById('statHigh').toggleAttribute('data-zero', high === 0);

    if (entries.length > 0) {
        const dates = entries.map(e => e.date).sort();
        const first = dates[0];
        const last = dates[dates.length - 1];
        const days = Math.ceil((new Date(last) - new Date(first)) / 86400000) + 1;
        document.getElementById('statSpan').textContent = days + 'd';
    } else {
        document.getElementById('statSpan').textContent = '—';
    }

    renderSeverityBar();
    renderLostTimePanel();
}

// ═════════════════════════════════════════
//  VERLORENE AUSBILDUNGSZEIT — was fuer die IHK zaehlt, ist nicht die Zahl der
//  Vorfaelle, sondern die Zeit, die dabei nicht zum Ausbildungsinhalt wurde.
//  Nur "unrelated" (ausbildungsfremde Taetigkeiten) traegt eine Dauer;
//  einmalige Vorfaelle werden addiert, wiederkehrende (repeated/ongoing +
//  timesPerWeek) auf Woche/Monat/Jahr hochgerechnet (Monat = Woche * 52/12,
//  Jahr = Woche * 52 + die einmaligen Minuten separat).
// ═════════════════════════════════════════

function computeLostTrainingTime(list) {
    let onceMinutes = 0;
    let weeklyMinutes = 0;
    list.forEach(e => {
        if (e.category !== 'unrelated') return;
        const d = e.details || {};
        const dur = parseFloat(d.durationMinutes);
        if (!dur || dur <= 0) return;
        const timesPerWeek = parseFloat(d.timesPerWeek);
        if ((d.frequency === 'repeated' || d.frequency === 'ongoing') && timesPerWeek > 0) {
            weeklyMinutes += dur * timesPerWeek;
        } else {
            onceMinutes += dur;
        }
    });
    return {
        onceMinutes,
        weeklyMinutes,
        monthlyMinutes: weeklyMinutes * (52 / 12),
        yearlyMinutes: weeklyMinutes * 52,
    };
}

// "1 Std 30 Min" statt Dezimalstunden — die IHK-Zielgruppe rechnet in
// Stunden/Minuten, keine Nachkommastellen erfinden, die es nicht gibt.
function fmtDuration(minutes) {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return m + ' ' + L('Min', 'min');
    if (m === 0) return h + ' ' + L('Std', 'h');
    return h + ' ' + L('Std', 'h') + ' ' + m + ' ' + L('Min', 'min');
}

function renderLostTimePanel() {
    const wrap = document.getElementById('lostTimeWrap');
    if (!wrap) return;
    const t = computeLostTrainingTime(entries);
    if (t.onceMinutes <= 0 && t.weeklyMinutes <= 0) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    const rows = [];
    if (t.weeklyMinutes > 0) {
        rows.push({ label: L('pro Woche', 'per week'), value: fmtDuration(t.weeklyMinutes) });
        rows.push({ label: L('pro Monat', 'per month'), value: fmtDuration(t.monthlyMinutes) });
        rows.push({ label: L('pro Jahr', 'per year'), value: fmtDuration(t.yearlyMinutes) });
    }
    if (t.onceMinutes > 0) {
        rows.push({ label: L('einmalig erfasst', 'recorded one-off'), value: fmtDuration(t.onceMinutes) });
    }

    wrap.innerHTML =
        '<div class="lost-time-head">' + L('Verlorene Ausbildungszeit durch ausbildungsfremde Tätigkeiten', 'Training time lost to non-training tasks') + '</div>' +
        '<div class="lost-time-rows">' + rows.map(r =>
            '<div class="lost-time-row"><span class="lost-time-val">' + r.value + '</span><span class="lost-time-lbl">' + r.label + '</span></div>'
        ).join('') + '</div>' +
        '<p class="lost-time-hint">' + L('Hochgerechnet aus der bei „Ausbildungsfremde Tätigkeiten" hinterlegten Dauer und Häufigkeit — trag sie bei jedem Eintrag ein, damit die Rechnung stimmt.', 'Extrapolated from the duration and frequency recorded under “non-training tasks” — fill them in on every entry so the math holds up.') + '</p>';
}

// ═════════════════════════════════════════
//  SEVERITY-VERTEILUNG — gestapelte Leiste, Status-Farben, nie Farbe allein
//  (dataviz: duenne Marks, gerundete Aussenkanten, 2px Segment-Luecke, Legende)
// ═════════════════════════════════════════

function renderSeverityBar() {
    const barEl = document.getElementById('severityBar');
    const legendEl = document.getElementById('severityLegend');
    const wrapEl = document.getElementById('severityBarWrap');
    if (!barEl) return;

    if (entries.length === 0) { wrapEl.style.display = 'none'; return; }
    wrapEl.style.display = 'block';

    const order = ['critical', 'high', 'medium', 'low', 'note'];
    const counts = {};
    order.forEach(s => { counts[s] = entries.filter(e => e.severity === s).length; });
    const present = order.filter(s => counts[s] > 0);

    barEl.innerHTML = present.map((s, i) => {
        const pct = (counts[s] / entries.length * 100).toFixed(1);
        let radius = '0';
        if (present.length === 1) radius = '4px';
        else if (i === 0) radius = '4px 0 0 4px';
        else if (i === present.length - 1) radius = '0 4px 4px 0';
        return '<div class="severity-bar-seg" style="width:' + pct + '%;background:' + SEVERITY_COLORS[s] + ';border-radius:' + radius + ';" title="' + (SEVERITY_LABELS[s] || s) + ': ' + counts[s] + '"></div>';
    }).join('');

    legendEl.innerHTML = present.map(s =>
        '<span class="severity-legend-item">' +
            '<span class="severity-legend-dot" style="background:' + SEVERITY_COLORS[s] + '"></span>' +
            (SEVERITY_LABELS[s] || s) + ' <span class="severity-legend-count">' + counts[s] + '</span>' +
        '</span>'
    ).join('');
}

function populateCategoryFilter() {
    const sel = document.getElementById('filterCategory');
    sel.innerHTML = '<option value="all">' + L('Alle Kategorien', 'All categories') + '</option>';
    Object.entries(CATEGORIES).forEach(([k, v]) => {
        sel.innerHTML += '<option value="' + k + '">' + v.label + '</option>';
    });
}

// ═════════════════════════════════════════
//  ÄNDERUNGSVERLAUF
// ═════════════════════════════════════════

function openHistoryModal(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const history = entry.history || [];
    const body = document.getElementById('historyModalBody');
    if (!history.length) {
        body.innerHTML = '<p style="color:var(--text-2);font-size:0.85rem;">' + L('Keine früheren Fassungen vorhanden.', 'No earlier versions available.') + '</p>';
    } else {
        body.innerHTML = history.map((h, i) => {
            const cat = CATEGORIES[h.category] || CATEGORIES.other;
            return '<div class="history-entry">' +
                '<div class="history-entry-head">' +
                    '<span>' + L('Fassung ', 'Version ') + (i + 1) + ' · ' + new Date(h.ts).toLocaleString(mwlLocale()) + '</span>' +
                    '<span class="entry-severity sev-' + h.severity + '">' + (SEVERITY_LABELS[h.severity] || h.severity) + '</span>' +
                '</div>' +
                '<div class="entry-category"><span class="cat-icon">' + cat.icon + '</span>' + cat.label + '</div>' +
                '<div class="entry-text">' + escapeHtml(h.text) + '</div>' +
            '</div>';
        }).join('') + '<div class="history-entry history-entry--current">' +
            '<div class="history-entry-head"><span>' + L('Aktuelle Fassung · ', 'Current version · ') + new Date(entry.updatedAt).toLocaleString(mwlLocale()) + '</span></div>' +
            '<div class="entry-text">' + escapeHtml(entry.text) + '</div>' +
        '</div>';
    }
    openModal('historyModal');
}

// ═════════════════════════════════════════
//  VORLAGEN — gefuehrtes Formulieren im Stress-Moment
// ═════════════════════════════════════════

const TEMPLATES = {
    verbal: L(
        'Was genau wurde gesagt?\n___\n\nVon wem?\n___\n\nWo und in welcher Situation?\n___\n\nWer war noch anwesend?\n___',
        'What exactly was said?\n___\n\nBy whom?\n___\n\nWhere and in what situation?\n___\n\nWho else was present?\n___'
    ),
    neglect: L(
        'Welche Ausbildungsinhalte fehlten in diesem Zeitraum?\n___\n\nSeit wann?\n___\n\nWurde das angesprochen? Bei wem, mit welcher Reaktion?\n___',
        'Which training content was missing in this period?\n___\n\nSince when?\n___\n\nWas this raised? With whom, what reaction?\n___'
    ),
    unrelated: L(
        'Welche Tätigkeit wurde dir aufgetragen?\n___\n\nWas hat sie mit deinem Ausbildungsrahmenplan zu tun (falls nichts: das notieren)?\n___\n\nWie lange / wie oft?\n___\n\nWurde das angesprochen? Bei wem, mit welcher Reaktion?\n___',
        'Which task were you given?\n___\n\nHow does it relate to your training curriculum (if not at all: note that)?\n___\n\nHow long / how often?\n___\n\nWas this raised? With whom, what reaction?\n___'
    ),
    overtime: L(
        'Angeordnet von wem?\n___\n\nDauer der Überstunden (von/bis)?\n___\n\nAusgleich zugesagt (Freizeit/Geld)? Ja/Nein\n___\n\nWar es Ausnahme oder Muster?\n___',
        'Ordered by whom?\n___\n\nDuration of overtime (from/to)?\n___\n\nCompensation promised (time off/pay)? Yes/No\n___\n\nWas it an exception or a pattern?\n___'
    ),
    mobbing: L(
        'Was ist konkret passiert?\n___\n\nVon wem, wie oft?\n___\n\nZeugen?\n___\n\nWie hast du reagiert / wie wurde reagiert, als du es angesprochen hast?\n___',
        'What exactly happened?\n___\n\nBy whom, how often?\n___\n\nWitnesses?\n___\n\nHow did you react / how was it received when you raised it?\n___'
    ),
    safety: L(
        'Welche Arbeitsschutz-Vorgabe wurde nicht eingehalten?\n___\n\nWelche Gefahr bestand konkret?\n___\n\nWurde Schutzausrüstung gestellt/genutzt?\n___\n\nWurde es gemeldet? An wen?\n___',
        'Which safety requirement was not met?\n___\n\nWhat was the concrete danger?\n___\n\nWas protective equipment provided/used?\n___\n\nWas it reported? To whom?\n___'
    ),
    discrimination: L(
        'Worauf bezog sich die Ungleichbehandlung (z.B. Herkunft, Geschlecht, Religion)?\n___\n\nWas genau ist passiert?\n___\n\nVon wem, in welcher Situation?\n___\n\nZeugen?\n___',
        'What was the unequal treatment about (e.g. origin, gender, religion)?\n___\n\nWhat exactly happened?\n___\n\nBy whom, in what situation?\n___\n\nWitnesses?\n___'
    ),
    documentation: L(
        'Welche Anleitung/Einweisung fehlte?\n___\n\nSeit wann fehlt sie?\n___\n\nWelche Auswirkung hatte das (z.B. auf Sicherheit, Lernfortschritt)?\n___',
        'Which instruction/briefing was missing?\n___\n\nSince when has it been missing?\n___\n\nWhat effect did this have (e.g. on safety, learning progress)?\n___'
    ),
    positive: L(
        'Was ist gut gelaufen?\n___\n\nWer hat dazu beigetragen?\n___\n\nWarum ist das erwähnenswert?\n___',
        'What went well?\n___\n\nWho contributed to it?\n___\n\nWhy is it worth noting?\n___'
    ),
    other: L(
        'Was ist passiert?\n___\n\nWer war beteiligt?\n___\n\nWann und wo?\n___\n\nZeugen oder Beweise?\n___',
        'What happened?\n___\n\nWho was involved?\n___\n\nWhen and where?\n___\n\nWitnesses or evidence?\n___'
    ),
};

function insertTemplate() {
    const category = document.getElementById('entryCategory').value;
    const textarea = document.getElementById('entryText');
    const skeleton = TEMPLATES[category] || TEMPLATES.other;
    if (textarea.value.trim() && !window.confirm(L('Vorhandenen Text durch die Vorlage ersetzen?', 'Replace existing text with the template?'))) return;
    textarea.value = skeleton;
    textarea.focus();
}

// ═════════════════════════════════════════
//  ESKALATION — Anlaufstellen & naechste Schritte
//  Kein Anspruch auf Rechtsberatung, keine Bundesland-spezifischen Links
//  (siehe Plan: Risiko toter/erfundener URLs). Namen + Schritte, kein Ranking.
// ═════════════════════════════════════════

const ESCALATION = {
    verbal: {
        contacts: [L('Jugend- und Auszubildendenvertretung (JAV)', 'Youth and trainee representation (JAV)'), L('Betriebsrat', 'Works council'), L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory')],
        steps: [
            L('Vorfall zeitnah mit Datum, Wortlaut und Zeugen festhalten — genau dafür ist dieses Protokoll da.', 'Record the incident promptly with date, exact wording and witnesses — that is exactly what this record is for.'),
            L('Wenn möglich, das Gespräch mit dem Ausbilder suchen und den Vorfall ansprechen.', 'If possible, seek a conversation with the trainer and address the incident.'),
            L('Bleibt es ohne Wirkung: JAV oder Betriebsrat einschalten, bei kleineren Betrieben ohne JAV direkt die IHK-Ausbildungsberatung.', 'If nothing changes: involve the JAV or works council; at smaller companies without a JAV, contact the chamber of commerce training advisory directly.'),
        ],
    },
    neglect: {
        contacts: [L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory'), L('Berufsschule (Klassenlehrer)', 'Vocational school (class teacher)'), L('JAV / Betriebsrat', 'JAV / works council')],
        steps: [
            L('Fehlende Ausbildungsinhalte mit Zeitraum dokumentieren — der Ausbildungsrahmenplan der IHK zeigt, was in diesem Ausbildungsjahr vorgesehen wäre.', 'Document the missing training content with the time period — the IHK training framework shows what should be covered in this training year.'),
            L('Das Thema im nächsten Berichtsheft-Gespräch mit dem Ausbilder ansprechen.', 'Raise the topic in the next training-record discussion with the trainer.'),
            L('Bei anhaltender Vernachlässigung die IHK-Ausbildungsberatung kontaktieren — sie kann vermitteln oder prüfen.', 'If neglect continues, contact the chamber of commerce training advisory — they can mediate or investigate.'),
        ],
    },
    unrelated: {
        contacts: [L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory'), L('JAV / Betriebsrat', 'JAV / works council')],
        steps: [
            L('Die Tätigkeit mit Zeitraum und Häufigkeit dokumentieren — und ob sie im Ausbildungsrahmenplan vorkommt.', 'Document the task with time period and frequency — and whether it appears in the training curriculum.'),
            L('Das Thema im nächsten Ausbildungsgespräch ansprechen: Ausbildungsfremde Aufgaben dürfen nur in engem Rahmen anfallen.', 'Raise the topic in the next training discussion: non-training tasks may only make up a small part of the work.'),
            L('Hält es an, die IHK-Ausbildungsberatung informieren — sie prüft, ob der Ausbildungsrahmenplan eingehalten wird.', 'If it continues, inform the chamber of commerce training advisory — they check whether the training curriculum is being followed.'),
        ],
    },
    overtime: {
        contacts: [L('JAV / Betriebsrat', 'JAV / works council'), L('Gewerkschaft', 'Trade union'), L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory')],
        steps: [
            L('Überstunden mit Datum, Dauer und anordnender Person festhalten.', 'Record overtime with date, duration and who ordered it.'),
            L('Prüfen, ob ein Ausgleich (Freizeit oder Bezahlung) zugesagt und eingehalten wurde.', 'Check whether compensation (time off or pay) was promised and honoured.'),
            L('Bei wiederholten Verstößen: JAV/Betriebsrat oder Gewerkschaft ansprechen — Jugendliche unter 18 unterliegen zusätzlich dem Jugendarbeitsschutzgesetz.', 'For repeated violations: contact the JAV/works council or a union — under-18s are additionally protected by the Youth Employment Protection Act.'),
        ],
    },
    mobbing: {
        contacts: [L('JAV / Betriebsrat', 'JAV / works council'), L('Jugendberatung/Beratungsstelle vor Ort', 'Local youth counselling service'), L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory')],
        steps: [
            L('Vorfälle einzeln mit Datum, Beteiligten und Zeugen dokumentieren — ein Muster über Zeit ist glaubwürdiger als ein Einzelfall.', 'Document incidents individually with date, people involved and witnesses — a pattern over time is more credible than a single case.'),
            L('Falls belastend: eine Beratungsstelle oder Vertrauensperson außerhalb des Betriebs einbeziehen, nicht alles alleine tragen.', 'If it feels overwhelming: involve a counselling service or trusted person outside the company — don\'t carry it alone.'),
            L('JAV/Betriebsrat einschalten; bei anhaltendem Mobbing kann die IHK-Ausbildungsberatung vermitteln.', 'Involve the JAV/works council; for persistent bullying, the chamber of commerce training advisory can mediate.'),
        ],
    },
    safety: {
        contacts: [L('Gewerbeaufsicht / Arbeitsschutzbehörde', 'Trade supervisory / occupational safety authority'), L('Sicherheitsbeauftragter im Betrieb', 'Company safety officer'), L('JAV / Betriebsrat', 'JAV / works council')],
        steps: [
            L('Die konkrete Gefährdung und die fehlende/mangelhafte Schutzmaßnahme dokumentieren.', 'Document the concrete hazard and the missing/inadequate protective measure.'),
            L('Den Vorfall dem Sicherheitsbeauftragten oder der Ausbildungsleitung melden.', 'Report the incident to the safety officer or training management.'),
            L('Bei akuter Gefahr oder Untätigkeit: die zuständige Gewerbeaufsicht/Arbeitsschutzbehörde einschalten.', 'For acute danger or inaction: contact the responsible trade supervisory / occupational safety authority.'),
        ],
    },
    discrimination: {
        contacts: [L('Antidiskriminierungsstelle des Bundes', 'Federal Anti-Discrimination Agency'), L('JAV / Betriebsrat', 'JAV / works council'), L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory')],
        steps: [
            L('Vorfall mit Wortlaut, Datum und Zeugen festhalten — wichtig für eine spätere Einschätzung nach dem Allgemeinen Gleichbehandlungsgesetz (AGG).', 'Record the incident with exact wording, date and witnesses — important for a later assessment under the General Equal Treatment Act (AGG).'),
            L('AGG-Ansprüche müssen meist innerhalb von zwei Monaten schriftlich geltend gemacht werden — die Frist im Blick behalten.', 'AGG claims usually have to be asserted in writing within two months — keep the deadline in mind.'),
            L('Die Antidiskriminierungsstelle des Bundes berät kostenlos und unabhängig vom Betrieb.', 'The Federal Anti-Discrimination Agency provides free advice independent of the employer.'),
        ],
    },
    documentation: {
        contacts: [L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory'), L('Berufsschule', 'Vocational school')],
        steps: [
            L('Fehlende Einweisung/Anleitung mit Datum und Auswirkung dokumentieren.', 'Document the missing briefing/instruction with date and impact.'),
            L('Im nächsten Ausbildungsgespräch konkret einfordern.', 'Explicitly request it in the next training discussion.'),
            L('Bei Dauerzustand die IHK-Ausbildungsberatung informieren.', 'If it persists, inform the chamber of commerce training advisory.'),
        ],
    },
    positive: {
        contacts: [],
        steps: [L('Kein Handlungsbedarf — positive Einträge sind vor allem für das eigene Berichtsheft und Bewerbungsgespräche wertvoll.', 'No action needed — positive entries are mainly valuable for your own training record and job interviews.')],
    },
    other: {
        contacts: [L('JAV / Betriebsrat', 'JAV / works council'), L('IHK-Ausbildungsberatung', 'Chamber of commerce training advisory')],
        steps: [L('Vorfall mit allen verfügbaren Details dokumentieren und im Zweifel mit einer der genannten Stellen besprechen.', 'Document the incident with all available details and discuss it with one of the listed contacts if unsure.')],
    },
};

function openEscalationModal(category) {
    const sel = document.getElementById('escalationCategorySelect');
    if (category && CATEGORIES[category]) sel.value = category;
    renderEscalationContent();
    openModal('escalationModal');
}

function renderEscalationContent() {
    const category = document.getElementById('escalationCategorySelect').value;
    const data = ESCALATION[category] || ESCALATION.other;
    const body = document.getElementById('escalationModalBody');
    const contactsHtml = data.contacts.length ?
        '<div class="esc-contacts">' + data.contacts.map(c => '<span class="esc-contact-pill">' + escapeHtml(c) + '</span>').join('') + '</div>' :
        '';
    body.innerHTML =
        contactsHtml +
        '<ol class="esc-steps">' + data.steps.map(s => '<li>' + escapeHtml(s) + '</li>').join('') + '</ol>' +
        '<p class="esc-disclaimer">' + L('Diese Übersicht ersetzt keine Rechtsberatung. Ausführlichere Einschätzungen zu konkreten Situationen liefert der ', 'This overview does not replace legal advice. For more detailed assessments of concrete situations, see the ') +
        '<a class="sb-inline-link" href="/rechte-checker/" target="_blank" rel="noopener">' + L('Rechte-Checker', 'Rights Checker') + '</a>.</p>';
}

// ═════════════════════════════════════════
//  EXPORT — IHK-BESCHWERDE-PROTOKOLL
// ═════════════════════════════════════════

function getExportEntries() {
    const from = document.getElementById('exportFrom').value;
    const to = document.getElementById('exportTo').value;
    const sevFilter = document.getElementById('exportSeverity').value;
    const sevList = sevFilter === 'all' ? null : sevFilter.split(',');

    return entries.filter(e => {
        if (from && e.date < from) return false;
        if (to && e.date > to) return false;
        if (sevList && !sevList.includes(e.severity)) return false;
        return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
}

function buildProtocol(exportEntries) {
    const now = new Date();
    const lines = [];
    lines.push('═══════════════════════════════════════════════');
    lines.push(L('  IHK-BESCHWERDE-PROTOKOLL', '  IHK COMPLAINT RECORD'));
    lines.push(L('  Vertrauliches Dokumentationsprotokoll', '  Confidential documentation record'));
    lines.push('═══════════════════════════════════════════════');
    lines.push('');
    const caseId = getCaseId();
    if (caseId) lines.push(L('Aktenzeichen:', 'Case ref.:   ') + ' ' + caseId);
    lines.push(L('Erstellt am: ', 'Created on:  ') + now.toLocaleDateString(mwlLocale(), { day: '2-digit', month: 'long', year: 'numeric' }));
    lines.push(L('Uhrzeit:     ', 'Time:        ') + now.toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit' }));
    lines.push(L('Einträge:    ', 'Entries:     ') + exportEntries.length);
    if (exportEntries.length > 0) {
        const dates = exportEntries.map(e => e.date).sort();
        lines.push(L('Zeitraum:    ', 'Period:      ') + formatDate(dates[0]) + ' — ' + formatDate(dates[dates.length - 1]));
    }
    lines.push('');
    lines.push(L('Schweregrad-Zusammenfassung:', 'Severity summary:'));
    ['critical', 'high', 'medium', 'low', 'note'].forEach(sev => {
        const c = exportEntries.filter(e => e.severity === sev).length;
        if (c > 0) lines.push('  ' + SEVERITY_LABELS[sev] + ': ' + c + L(' Einträge', c === 1 ? ' entry' : ' entries'));
    });
    lines.push('');
    lines.push(L('Status-Zusammenfassung:', 'Status summary:'));
    STATUS_ORDER.forEach(s => {
        const c = exportEntries.filter(e => (e.status || 'open') === s).length;
        if (c > 0) lines.push('  ' + STATUS_META[s].label + ': ' + c + L(' Einträge', c === 1 ? ' entry' : ' entries'));
    });

    const lostTime = computeLostTrainingTime(exportEntries);
    if (lostTime.onceMinutes > 0 || lostTime.weeklyMinutes > 0) {
        lines.push('');
        lines.push(L('Verlorene Ausbildungszeit (ausbildungsfremde Tätigkeiten):', 'Training time lost (non-training tasks):'));
        if (lostTime.weeklyMinutes > 0) {
            lines.push('  ' + L('pro Woche: ', 'per week: ') + fmtDuration(lostTime.weeklyMinutes));
            lines.push('  ' + L('pro Monat: ', 'per month: ') + fmtDuration(lostTime.monthlyMinutes));
            lines.push('  ' + L('pro Jahr:  ', 'per year:  ') + fmtDuration(lostTime.yearlyMinutes));
        }
        if (lostTime.onceMinutes > 0) {
            lines.push('  ' + L('einmalig erfasst: ', 'recorded one-off: ') + fmtDuration(lostTime.onceMinutes));
        }
    }
    lines.push('');
    lines.push('───────────────────────────────────────────────');
    lines.push('');

    exportEntries.forEach((e, i) => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        lines.push(L('▸ VORFALL #', '▸ INCIDENT #') + (i + 1));
        lines.push(L('  Datum:       ', '  Date:        ') + formatDate(e.date) + (e.time ? ', ' + e.time + L(' Uhr', '') : ''));
        lines.push(L('  Schwere:     ', '  Severity:    ') + (SEVERITY_LABELS[e.severity] || e.severity));
        lines.push(L('  Kategorie:   ', '  Category:    ') + cat.label);
        lines.push(L('  Status:      ', '  Status:      ') + (STATUS_META[e.status || 'open'] || STATUS_META.open).label);
        lines.push(L('  Erstellt am: ', '  Created:     ') + new Date(e.createdAt).toLocaleString(mwlLocale()));
        if (e.contentHash) lines.push(L('  Fingerprint: ', '  Fingerprint: ') + e.contentHash);
        if (e.history && e.history.length) lines.push(L('  Änderungen:  ', '  Revisions:   ') + e.history.length + L(' × bearbeitet, zuletzt am ', ' × edited, last on ') + new Date(e.updatedAt).toLocaleString(mwlLocale()));
        const detailRows = resolveCategoryDetails(e.category, e.details);
        if (detailRows.length) {
            lines.push('');
            detailRows.forEach(d => lines.push('  ' + d.label + ': ' + d.value));
        }
        lines.push('');
        lines.push(L('  Beschreibung:', '  Description:'));
        e.text.split('\n').forEach(line => lines.push('    ' + line));
        if (e.witnesses && e.witnesses.length) {
            lines.push('');
            lines.push(L('  Zeugen: ', '  Witnesses: ') + e.witnesses.join(', '));
        }
        if (e.attachments && e.attachments.length) {
            lines.push('');
            lines.push(L('  Beweismittel im Tresor: ', '  Evidence in the vault: ') +
                e.attachments.map(a => a.name + ' (' + formatBytes(a.size) + ')').join(', '));
        }
        lines.push('');
        lines.push('───────────────────────────────────────────────');
        lines.push('');
    });

    lines.push('');
    lines.push(L('HINWEIS: Dieses Protokoll wurde automatisch aus einem', 'NOTE: This record was generated automatically from an'));
    lines.push(L('AES-256 verschlüsselten lokalen Speicher generiert.', 'AES-256 encrypted local storage.'));
    lines.push(L('Die Einträge wurden zeitnah zu den dokumentierten', 'The entries were created close in time to the documented'));
    lines.push(L('Vorfällen erstellt (Erstelldatum in Metadaten vorhanden).', 'incidents (creation date available in the metadata).'));
    lines.push('');
    lines.push('═══════════════════════════════════════════════');
    lines.push(L('  Generiert von MyWorkLog · Schatten-Berichtsheft', '  Generated by MyWorkLog · Shadow Report Book'));
    lines.push('═══════════════════════════════════════════════');

    return lines.join('\n');
}

function generatePreview() {
    const exportEntries = getExportEntries();
    if (exportEntries.length === 0) {
        document.getElementById('exportPreview').textContent = L('Keine Einträge im gewählten Zeitraum/Filter gefunden.', 'No entries found in the selected period/filter.');
        return;
    }
    document.getElementById('exportPreview').textContent = buildProtocol(exportEntries);
}

function exportAsText() {
    const exportEntries = getExportEntries();
    if (exportEntries.length === 0) { showToast(L('Keine Einträge zum Exportieren', 'No entries to export'), 'warning'); return; }
    const text = buildProtocol(exportEntries);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = L('IHK-Beschwerde-Protokoll_', 'IHK-Complaint-Record_') + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast(L('Protokoll als TXT heruntergeladen', 'Record downloaded as TXT'), 'success');
}

// ═════════════════════════════════════════
//  PDF-/DRUCK-EXPORT
//  Gleiche Sprache wie die App, nur auf Weiss: Inter, Haarlinien, viel Luft,
//  dieselbe Schweregrad-Kennzeichnung, dieselbe Zeitleiste. KEINE
//  Serifen-Amtsoptik — das Dokument soll erkennbar aus dieser App stammen.
//
//  Was vom Papier trotzdem verlangt wird und deshalb bleibt:
//  · print-color-adjust (Chrome druckt Hintergruende sonst nicht mit)
//  · Form als zweite Ebene neben der Farbe (viele drucken schwarzweiss)
//  · das Dokument druckt sich selbst, wenn Schrift und Bilder geladen sind
// ═════════════════════════════════════════

// Farbtoene der App. Auf Weiss geprueft (validate_palette --mode light):
// ΔE 18.1 normal / 10.4 deutan — sie halten sich auch auf Papier auseinander.
// Der Kontrast-WARN fuer Amber ist der Grund, warum die Beschriftung NICHT
// in der Akzentfarbe steht, sondern dunkel auf getoentem Grund.
const PRINT_SEV = {
    critical: { line: '#f2384f', tint: '#fdecef', ink: '#c11530', dot: 'fill' },
    high:     { line: '#e8912f', tint: '#fdf4e8', ink: '#95590a', dot: 'fill' },
    medium:   { line: '#8e97a8', tint: 'transparent', ink: '#5f6672', dot: 'fill' },
    low:      { line: '#c3c8d0', tint: 'transparent', ink: '#6b7280', dot: 'ring' },
    note:     { line: '#d7dade', tint: 'transparent', ink: '#8a9099', dot: 'ring' }
};

// Laufendes Motiv statt Deko: dieselben (bereits ΔE-validierten) Schwere-
// grad-Farben, als schmaler Balken auf jeder Druckseite UND gross auf dem
// Deckblatt — das Dokument zeigt seine eigene Form, bevor man ein Wort
// gelesen hat. Radius bewusst uniform statt "aeussere Ecken rund": bei
// 1.4mm Hoehe faellt der Unterschied nicht auf, dafuer bricht nichts, wenn
// nur ein oder zwei Stufen vorkommen.
function sevFingerprintHtml(list, sizeClass) {
    if (!list.length) return '';
    const order = ['critical', 'high', 'medium', 'low', 'note'];
    const counts = {};
    order.forEach(s => { counts[s] = list.filter(e => e.severity === s).length; });
    const present = order.filter(s => counts[s] > 0);
    const segs = present.map(s => {
        const p = PRINT_SEV[s] || PRINT_SEV.note;
        const pct = (counts[s] / list.length * 100).toFixed(2);
        return '<i style="width:' + pct + '%;background:' + p.line + '"></i>';
    }).join('');
    return '<div class="fingerprint ' + sizeClass + '">' + segs + '</div>';
}

// Kategorie-Icon aus derselben Quelle wie die App (CATEGORY_ICONS) — vorher
// stand im Druck nur Fliesstext, wo die App ein Icon zeigt.
function catIconHtml(cat) {
    return '<span class="cat-ico">' + cat.icon + '</span>';
}

// Bilder fuer den Druck vorab entschluesseln. Sie muessen als data:-URL im
// erzeugten Dokument stehen — ein blob:-Verweis aus diesem Fenster ist im
// Druckfenster nicht mehr aufloesbar. Nicht-Bilder werden nur namentlich
// aufgefuehrt; ein PDF laesst sich nicht in eine Druckseite einbetten.
async function collectAttachmentDataUrls(list) {
    const map = new Map();
    for (const e of list) {
        for (const a of (e.attachments || [])) {
            if (fileKind(a.mime, a.name) !== 'image') continue;
            try {
                const loaded = await loadAttachmentBlob(a.id);
                if (!loaded) continue;
                map.set(a.id, await new Promise(res => {
                    const fr = new FileReader();
                    fr.onload = () => res(fr.result);
                    fr.onerror = () => res(null);
                    fr.readAsDataURL(loaded.blob);
                }));
            } catch (err) { /* einzelnes Bild fehlt: Export laeuft trotzdem durch */ }
        }
    }
    return map;
}

async function exportAsPDF() {
    const exportEntries = getExportEntries();
    if (exportEntries.length === 0) { showToast(L('Keine Einträge zum Exportieren', 'No entries to export'), 'warning'); return; }

    const attachmentUrls = await collectAttachmentDataUrls(exportEntries);

    const now = new Date();
    const dates = exportEntries.map(e => e.date).sort();
    const caseId = getCaseId();
    const lang = document.documentElement.lang === 'en' ? 'en' : 'de';
    const zeitraum = formatDate(dates[0]) + L(' bis ', ' to ') + formatDate(dates[dates.length - 1]);

    const sevBadge = (sev) => {
        const p = PRINT_SEV[sev] || PRINT_SEV.note;
        return '<span class="sev" style="--line:' + p.line + ';--tint:' + p.tint + ';--ink:' + p.ink + '">' +
            (SEVERITY_LABELS[sev] || sev) + '</span>';
    };

    let html = '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="UTF-8">';
    html += '<title>' + L('Beschwerde- und Dokumentationsprotokoll', 'Complaint and documentation record') + '</title>';
    // Projekt-Schriften auch im Druckfenster — sonst faellt das Dokument auf
    // die System-UI-Schrift zurueck und sieht aus wie von einer anderen App.
    // Faellt die Verbindung aus, greift der Systemstapel; gedruckt wird erst,
    // wenn document.fonts.ready aufgeloest ist.
    html += '<link rel="preconnect" href="https://fonts.googleapis.com">';
    html += '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    html += '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';
    html += '<style>';

    html += '@page{margin:16mm 15mm 18mm}';
    // Ohne das druckt Chrome keine Flaechen — die Verteilungs-Grafik und jede
    // getoente Kennzeichnung kaemen weiss heraus.
    html += '*{print-color-adjust:exact;-webkit-print-color-adjust:exact;box-sizing:border-box;margin:0;padding:0}';
    html += 'body{font-family:Inter,-apple-system,"Segoe UI",system-ui,sans-serif;color:#14161a;';
    html += 'font-size:10pt;line-height:1.6;font-feature-settings:"cv11","ss01"}';
    html += '.mono{font-family:"JetBrains Mono","Cascadia Mono",Consolas,monospace;font-variant-numeric:tabular-nums}';
    html += '.num{font-variant-numeric:tabular-nums}';

    // Laufender Kopf — Chrome wiederholt position:fixed auf jeder Druckseite.
    // Zweizeilig seit dem Fingerprint-Balken: Zeile 1 Vertraulich/Aktenzeichen,
    // Zeile 2 die Schweregrad-Signatur (siehe sevFingerprintHtml).
    html += '.runhead{position:fixed;top:0;left:0;right:0;border-bottom:.5pt solid #e6e8eb;padding-bottom:2mm}';
    html += '.runhead-row{display:flex;justify-content:space-between;';
    html += 'font-size:7pt;letter-spacing:.08em;text-transform:uppercase;color:#9096a0;margin-bottom:1.8mm}';
    html += '.page{padding-top:12mm}';
    html += '.break{break-after:page;page-break-after:always}';

    // ── Fingerprint: dieselben validierten Schweregrad-Farben als
    //    Segment-Balken. Klein im Laufkopf, gross auf dem Deckblatt. ──
    html += '.fingerprint{display:flex;gap:.4mm;overflow:hidden;border-radius:1pt}';
    html += '.fingerprint i{display:block;height:100%}';
    html += '.fp-run{height:1.3mm}';
    html += '.fp-cover{height:2.8mm;border-radius:1.4pt;margin-bottom:3mm}';
    html += '.cover-fp-label{font-size:7.5pt;color:#9096a0;letter-spacing:.04em;margin-bottom:2.2mm}';

    // Typo wie in der App: Gewicht und Laufweite statt Zierschrift. Eyebrow-
    // Index (01/02/03) ist eine echte Sequenz — drei feste Abschnitte, kein
    // Deko-Zaehler — und ersetzt Seitenzahlen, die CSS im Browser nicht liefern kann.
    html += '.sec-head{display:flex;align-items:baseline;gap:3mm;margin-bottom:5mm}';
    html += '.sec-idx{font-family:"JetBrains Mono",monospace;font-size:8pt;color:#c3c8d0;font-weight:500}';
    html += 'h2{font-size:13pt;font-weight:600;letter-spacing:-.02em}';
    html += '.lede{font-size:9.5pt;color:#6b7280;margin-bottom:8mm}';

    // ── Kategorie-Icon: dieselbe Quelle wie die App (CATEGORY_ICONS). ──
    html += '.cat-ico{width:8.5pt;height:8.5pt;flex-shrink:0;color:#8a9099}';
    html += '.cat-ico svg{width:100%;height:100%;display:block}';
    html += '.icon-label{display:inline-flex;align-items:center;gap:2mm}';

    // ── Deckblatt ──
    html += '.cover{padding-top:26mm}';
    html += '.cover-tag{display:inline-block;border:.75pt solid #f2384f;color:#c11530;font-size:7pt;';
    html += 'font-weight:600;letter-spacing:.16em;padding:2pt 8pt;border-radius:3pt;margin-bottom:13mm}';
    html += '.cover-title{font-size:21pt;font-weight:600;letter-spacing:-.03em;line-height:1.15;margin-bottom:3mm;max-width:150mm}';
    html += '.cover-sub{font-size:10pt;color:#6b7280;margin-bottom:15mm;max-width:125mm;line-height:1.6}';
    html += '.facts{display:grid;grid-template-columns:1fr 1fr;gap:7mm 12mm;border-top:.75pt solid #14161a;padding-top:6mm;margin-bottom:9mm}';
    html += '.facts dt{font-size:7.5pt;color:#9096a0;margin-bottom:1mm}';
    html += '.facts dd{font-size:12pt;font-weight:500;letter-spacing:-.01em}';
    html += '.cover-fp-block{margin-bottom:20mm}';
    html += '.sig{display:grid;grid-template-columns:1fr 1fr;gap:16mm;margin-top:18mm}';
    html += '.sig-line{border-top:.5pt solid #c3c8d0;padding-top:2mm;font-size:8.5pt;color:#6b7280}';

    // ── Schweregrad: getoentes Feld + Rahmen wie in der App. Der Rahmen ist
    //    zugleich die Schwarzweiss-Stufe (kraeftig → duenn → keiner). ──
    html += '.sev{display:inline-block;font-size:7.5pt;font-weight:600;letter-spacing:.04em;';
    html += 'padding:1.5pt 6pt;border-radius:3pt;white-space:nowrap;';
    html += 'background:var(--tint);border:.75pt solid var(--line);color:var(--ink)}';
    html += '.status{font-size:7.5pt;color:#9096a0;white-space:nowrap;margin-left:3mm}';

    // ── Übersicht: Farbschiene links (--line kommt von der <tr>, kaskadiert
    //    auf das erste td) statt Border-Trick auf <tr> — der wird von
    //    Tabellen-Layouts uneinheitlich gerendert. ──
    html += '.toc{width:100%;border-collapse:collapse;font-size:9.5pt}';
    html += '.toc td{padding:2.6mm 0;border-bottom:.5pt solid #eceef1;vertical-align:middle}';
    html += '.toc td:first-child{border-left:2pt solid var(--line);padding-left:2.5mm}';
    html += '.toc .n{width:9mm;color:#b6bbc3;font-size:8.5pt}';
    html += '.toc .d{width:23mm;color:#6b7280;font-size:9pt;white-space:nowrap}';
    html += '.toc .s{text-align:right;white-space:nowrap;padding-left:4mm}';

    // ── Verteilung: Balken auf einer sichtbaren Schiene — ohne Schiene
    //    verschwindet eine 5%-Stufe spurlos, es fehlt der Bezugsrahmen. ──
    html += '.dist{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:9mm}';
    html += '.dist td{padding:1.9mm 0;vertical-align:middle}';
    html += '.dist .lbl{width:25mm;white-space:nowrap;color:#4b5158}';
    html += '.dist .bar{padding-right:4mm}';
    html += '.dist .bar-track{display:block;height:2.6mm;border-radius:1.3mm;background:#eef0f2}';
    html += '.dist .bar-track i{display:block;height:100%;border-radius:1.3mm;background:var(--line);min-width:1mm}';
    html += '.dist .val{width:11mm;text-align:right;font-weight:600}';
    html += 'table.tbl{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:9mm}';
    html += 'table.tbl th{text-align:left;font-weight:500;font-size:8pt;color:#9096a0;';
    html += 'border-bottom:.75pt solid #14161a;padding-bottom:2mm}';
    html += 'table.tbl td{padding:2.3mm 0;border-bottom:.5pt solid #eceef1;color:#4b5158}';
    html += 'table.tbl td+td,table.tbl th+th{text-align:right;width:18mm;font-variant-numeric:tabular-nums;color:#14161a;font-weight:500}';

    // ── Verlorene Ausbildungszeit: eigene getoente Karte statt Fliesstext —
    //    das ist die eine Zahl, die dem Betrieb wehtut, auf der Farbe der
    //    Stufe, die dafuer bereits validiert ist (amber/high). ──
    html += '.lost-card{background:#fdf4e8;border:.75pt solid rgba(232,145,47,.32);border-radius:2.5mm;padding:6mm 7mm;margin-bottom:9mm}';
    html += '.lost-card-head{display:flex;align-items:center;gap:2.5mm;font-size:8pt;font-weight:600;';
    html += 'color:#95590a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5mm}';
    html += '.lost-card-head .cat-ico{width:11pt;height:11pt;color:#95590a}';
    html += '.lost{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}';
    html += '.lost dt{font-size:7.5pt;color:#a9752f;margin-bottom:1mm}';
    html += '.lost dd{font-size:13pt;font-weight:600;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:#14161a}';
    html += '.lost-hint{font-size:8pt;color:#8a5a1c;margin-top:5mm;max-width:150mm;line-height:1.5}';

    // ── Vorfaelle: dieselbe Zeitleiste wie in der App ──
    html += '.inc{position:relative;padding:0 0 8mm 9mm;break-inside:avoid;page-break-inside:avoid}';
    html += '.inc::before{content:"";position:absolute;left:1.6mm;top:2.6mm;bottom:0;width:.5pt;background:#e0e3e7}';
    html += '.inc:last-of-type::before{display:none}';
    html += '.inc-dot{position:absolute;left:0;top:1.5mm;width:3.2mm;height:3.2mm;border-radius:50%;background:#fff}';
    html += '.inc-dot i{position:absolute;inset:.35mm;border-radius:50%}';
    html += '.inc-dot.fill i{background:var(--line)}';
    html += '.inc-dot.ring i{box-shadow:inset 0 0 0 .55mm var(--line)}';
    html += '.inc-head{display:flex;justify-content:space-between;align-items:center;gap:4mm;margin-bottom:1.6mm}';
    // Index-Nummer vor dem Datum — dieselbe Zahl wie in der Übersichtstabelle,
    // damit sich beide Seiten ohne Seitenzahlen gegenseitig zitieren lassen.
    html += '.inc-when{font-size:9.5pt;font-weight:500;letter-spacing:-.01em}';
    // .inc-when .inc-idx statt .inc-idx allein: sonst gewinnt die generische
    // ".inc-when span"-Regel (hoehere Spezifitaet) und ueberschreibt Farbe/
    // Abstand der Index-Nummer lautlos (siehe CLAUDE.md: Selektor-Kollisionen).
    html += '.inc-when span{color:#9096a0;font-weight:400;margin-left:2mm}';
    html += '.inc-when .inc-idx{color:#c3c8d0;font-weight:500;margin-left:0;margin-right:2mm}';
    html += '.inc-badges{display:flex;align-items:center;flex-shrink:0}';
    html += '.inc-cat{font-size:8.5pt;color:#6b7280;margin-bottom:2.5mm}';
    html += '.inc-text{white-space:pre-wrap;font-size:10pt;line-height:1.65;max-width:150mm}';
    html += '.det{margin-top:3.5mm;padding-top:3mm;border-top:.5pt solid #eceef1;';
    html += 'display:flex;flex-wrap:wrap;gap:1.5mm 8mm;font-size:9pt}';
    html += '.det dt{color:#9096a0;margin-right:2mm;display:inline}';
    html += '.det dd{display:inline;font-weight:500}';
    html += '.det>div{white-space:nowrap}';
    html += '.wit{margin-top:2.5mm;display:flex;align-items:flex-start;gap:2mm;font-size:9pt;color:#4b5158}';
    html += '.docs{margin-top:2.5mm;font-size:8.5pt;color:#4b5158;line-height:1.5}';
    html += '.docs b{font-weight:600;color:#14161a}';
    html += '.wit .cat-ico{width:9pt;height:9pt;margin-top:.4mm;color:#9096a0}';
    html += '.wit b{font-weight:400;color:#9096a0}';
    // Beweisfotos gross genug, um Beweis zu sein.
    html += '.pics{margin-top:3.5mm;display:flex;flex-wrap:wrap;gap:3mm}';
    html += '.pics img{width:80mm;max-height:90mm;object-fit:contain;border:.5pt solid #e0e3e7;border-radius:2mm}';
    html += '.trace{margin-top:2.5mm;font-size:7.5pt;color:#b6bbc3}';
    html += '.foot{margin-top:12mm;padding-top:4mm;border-top:.75pt solid #14161a;font-size:8pt;color:#6b7280;max-width:150mm;line-height:1.6}';
    html += '.foot p+p{margin-top:2mm}';

    // ── Bildschirm vs. Papier: @page limitiert die Breite NUR beim echten
    //    Drucken/in der Druckvorschau. Der neue Tab selbst ist eine ganz
    //    normale Webseite ohne diese Grenze — ohne Gegenmassnahme zieht sich
    //    jede volle-Breite-Tabelle über den kompletten (breiten) Monitor,
    //    bevor ueberhaupt gedruckt wird. Deshalb: auf dem Bildschirm jede
    //    .page als eigenes A4-breites "Blatt" zentriert auf grauem Grund,
    //    beim Drucken unveraendert randlos nach @page. ──
    html += '@media screen {';
    html += 'body{background:#e4e5e9;padding:24px 0 48px}';
    html += '.runhead{position:sticky;max-width:190mm;margin:0 auto;padding-left:15mm;padding-right:15mm;background:#fff}';
    html += '.page{max-width:190mm;margin:0 auto 8mm;background:#fff;padding:16mm 15mm 18mm;';
    html += 'box-shadow:0 1px 2px rgba(20,22,26,.06),0 10px 24px rgba(20,22,26,.10);border-radius:1.5mm}';
    html += '}';
    html += '</style></head><body>';

    html += '<div class="runhead">';
    html += '<div class="runhead-row"><span>' + L('Vertraulich', 'Confidential') + '</span>';
    html += '<span class="mono">' + (caseId ? escapeHtml(caseId) : 'MyWorkLog') + '</span></div>';
    html += sevFingerprintHtml(exportEntries, 'fp-run');
    html += '</div>';

    // ═══ DECKBLATT ═══
    html += '<div class="page cover break">';
    html += '<div class="cover-tag">' + L('VERTRAULICH', 'CONFIDENTIAL') + '</div>';
    html += '<h1 class="cover-title">' + L('Beschwerde- und Dokumentationsprotokoll', 'Complaint and documentation record') + '</h1>';
    html += '<p class="cover-sub">' + L('Private Aufzeichnung einer Auszubildenden / eines Auszubildenden, geführt neben dem amtlichen Ausbildungsnachweis nach § 13 BBiG.', 'A private record kept by an apprentice alongside the official training record under § 13 BBiG (German Vocational Training Act).') + '</p>';
    html += '<dl class="facts">';
    if (caseId) html += '<div><dt>' + L('Aktenzeichen', 'Case reference') + '</dt><dd class="mono">' + escapeHtml(caseId) + '</dd></div>';
    html += '<div><dt>' + L('Dokumentierter Zeitraum', 'Documented period') + '</dt><dd>' + zeitraum + '</dd></div>';
    html += '<div><dt>' + L('Vorfälle', 'Incidents') + '</dt><dd class="num">' + exportEntries.length + '</dd></div>';
    html += '<div><dt>' + L('Ausgefertigt am', 'Issued on') + '</dt><dd>' + now.toLocaleDateString(mwlLocale(), { day: '2-digit', month: 'long', year: 'numeric' }) + '</dd></div>';
    html += '</dl>';
    // Fingerprint gross: die Form des Falls auf einen Blick, bevor ein
    // einziges Wort gelesen ist — dieselbe Signatur wie im Laufkopf.
    html += '<div class="cover-fp-block">';
    html += '<div class="cover-fp-label">' + L('Schweregrad auf einen Blick', 'Severity at a glance') + '</div>';
    html += sevFingerprintHtml(exportEntries, 'fp-cover');
    html += '</div>';
    html += '<div class="sig">';
    html += '<div class="sig-line">' + L('Name der Auszubildenden / des Auszubildenden', 'Name of the apprentice') + '</div>';
    html += '<div class="sig-line">' + L('Ausbildungsbetrieb', 'Training company') + '</div>';
    html += '</div>';
    html += '</div>';

    // ═══ ÜBERSICHT ═══
    html += '<div class="page break">';
    html += '<div class="sec-head"><span class="sec-idx">01</span><h2>' + L('Übersicht der Vorfälle', 'Overview of incidents') + '</h2></div>';
    html += '<table class="toc">';
    exportEntries.forEach((e, i) => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        const statusMeta = STATUS_META[e.status || 'open'] || STATUS_META.open;
        const p = PRINT_SEV[e.severity] || PRINT_SEV.note;
        html += '<tr style="--line:' + p.line + '">';
        html += '<td class="n num">' + (i + 1) + '</td>';
        html += '<td class="d mono">' + formatDate(e.date) + '</td>';
        html += '<td><span class="icon-label">' + catIconHtml(cat) + escapeHtml(cat.label) + '</span></td>';
        html += '<td class="s">' + sevBadge(e.severity) +
                '<span class="status">' + escapeHtml(statusMeta.label) + '</span></td>';
        html += '</tr>';
    });
    html += '</table>';
    html += '</div>';

    // ═══ ZUSAMMENFASSUNG ═══
    html += '<div class="page break">';
    html += '<div class="sec-head"><span class="sec-idx">02</span><h2>' + L('Zusammenfassung', 'Summary') + '</h2></div>';
    html += '<p class="lede">' + exportEntries.length + L(' dokumentierte Vorfälle im Zeitraum ', ' documented incidents in the period ') + zeitraum + '.</p>';

    const sevOrder = ['critical', 'high', 'medium', 'low', 'note'];
    const sevCounts = {};
    sevOrder.forEach(s => { sevCounts[s] = exportEntries.filter(e => e.severity === s).length; });

    // Anteil am Gesamtbestand, nicht am groessten Wert: bei gleich haeufigen
    // Stufen ergaebe eine Max-Normierung lauter randvolle Balken. Schiene
    // (bar-track) gibt jeder Stufe einen Bezugsrahmen, auch einer 5%-Stufe.
    html += '<table class="dist">';
    sevOrder.filter(s => sevCounts[s] > 0).forEach(s => {
        const p = PRINT_SEV[s] || PRINT_SEV.note;
        const pct = sevCounts[s] / exportEntries.length * 100;
        html += '<tr style="--line:' + p.line + '">';
        html += '<td class="lbl">' + (SEVERITY_LABELS[s] || s) + '</td>';
        html += '<td class="bar"><span class="bar-track"><i style="width:' + pct.toFixed(1) + '%"></i></span></td>';
        html += '<td class="val num">' + sevCounts[s] + '</td>';
        html += '</tr>';
    });
    html += '</table>';

    html += '<table class="tbl"><tr><th>' + L('Kategorie', 'Category') + '</th><th>' + L('Anzahl', 'Count') + '</th></tr>';
    Object.keys(CATEGORIES).forEach(k => {
        const c = exportEntries.filter(e => e.category === k).length;
        if (c > 0) html += '<tr><td><span class="icon-label">' + catIconHtml(CATEGORIES[k]) + escapeHtml(CATEGORIES[k].label) + '</span></td><td>' + c + '</td></tr>';
    });
    html += '</table>';

    const lostTime = computeLostTrainingTime(exportEntries);
    if (lostTime.onceMinutes > 0 || lostTime.weeklyMinutes > 0) {
        html += '<div class="lost-card">';
        html += '<div class="lost-card-head">' + catIconHtml(CATEGORIES.overtime) + '<span>' + L('Verlorene Ausbildungszeit', 'Training time lost') + '</span></div>';
        html += '<dl class="lost">';
        if (lostTime.weeklyMinutes > 0) {
            html += '<div><dt>' + L('pro Woche', 'per week') + '</dt><dd>' + fmtDuration(lostTime.weeklyMinutes) + '</dd></div>';
            html += '<div><dt>' + L('pro Monat', 'per month') + '</dt><dd>' + fmtDuration(lostTime.monthlyMinutes) + '</dd></div>';
            html += '<div><dt>' + L('pro Jahr', 'per year') + '</dt><dd>' + fmtDuration(lostTime.yearlyMinutes) + '</dd></div>';
        }
        if (lostTime.onceMinutes > 0) {
            html += '<div><dt>' + L('einmalig erfasst', 'recorded one-off') + '</dt><dd>' + fmtDuration(lostTime.onceMinutes) + '</dd></div>';
        }
        html += '</dl>';
        html += '<p class="lost-hint">' + L('Durch ausbildungsfremde Tätigkeiten — hochgerechnet aus Dauer und Häufigkeit der einzelnen Vorfälle.', 'From non-training tasks — extrapolated from the duration and frequency recorded on the individual incidents.') + '</p>';
        html += '</div>';
    }

    html += '<table class="tbl"><tr><th>' + L('Bearbeitungsstand', 'Handling status') + '</th><th>' + L('Anzahl', 'Count') + '</th></tr>';
    STATUS_ORDER.forEach(s => {
        const c = exportEntries.filter(e => (e.status || 'open') === s).length;
        if (c > 0) html += '<tr><td>' + escapeHtml(STATUS_META[s].label) + '</td><td>' + c + '</td></tr>';
    });
    html += '</table>';
    html += '</div>';

    // ═══ VORFÄLLE ═══
    html += '<div class="page">';
    html += '<div class="sec-head"><span class="sec-idx">03</span><h2>' + L('Die Vorfälle im Einzelnen', 'The incidents in detail') + '</h2></div>';
    exportEntries.forEach((e, i) => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        const statusMeta = STATUS_META[e.status || 'open'] || STATUS_META.open;
        const p = PRINT_SEV[e.severity] || PRINT_SEV.note;
        html += '<div class="inc">';
        html += '<span class="inc-dot ' + p.dot + '" style="--line:' + p.line + '"><i></i></span>';
        html += '<div class="inc-head">';
        // #-Nummer identisch zur Übersichtstabelle — Querverweis ohne Seitenzahlen.
        html += '<span class="inc-when mono"><span class="inc-idx">#' + (i + 1) + '</span>' + formatDate(e.date) +
                (e.time ? '<span>' + e.time + L(' Uhr', '') + '</span>' : '') + '</span>';
        html += '<span class="inc-badges">' + sevBadge(e.severity) +
                '<span class="status">' + escapeHtml(statusMeta.label) + '</span></span>';
        html += '</div>';
        html += '<p class="inc-cat"><span class="icon-label">' + catIconHtml(cat) + escapeHtml(cat.label) + '</span></p>';
        html += '<div class="inc-text">' + escapeHtml(e.text) + '</div>';

        const detailRows = resolveCategoryDetails(e.category, e.details);
        if (detailRows.length) {
            html += '<dl class="det">' + detailRows.map(d =>
                '<div><dt>' + escapeHtml(d.label) + '</dt><dd>' + escapeHtml(d.value) + '</dd></div>').join('') + '</dl>';
        }
        if (e.witnesses && e.witnesses.length) {
            html += '<p class="wit"><span class="cat-ico">' + UI_ICONS.users + '</span><b>' + L('Zeugen', 'Witnesses') + '</b> ' + escapeHtml(e.witnesses.join(', ')) + '</p>';
        }
        if (e.attachments && e.attachments.length) {
            const pics = e.attachments.filter(a => attachmentUrls.get(a.id));
            const docs = e.attachments.filter(a => !attachmentUrls.get(a.id));
            if (pics.length) {
                html += '<div class="pics">' + pics.map(a =>
                    '<img src="' + attachmentUrls.get(a.id) + '" alt="' + escapeHtml(a.name) + '">').join('') + '</div>';
            }
            // Dokumente lassen sich nicht in die Druckseite legen — sie werden
            // benannt, damit die gedruckte Akte vollstaendig auflistet, was im
            // Tresor liegt.
            if (docs.length) {
                html += '<p class="docs"><b>' + L('Weitere Beweismittel im Tresor', 'Further evidence in the vault') + '</b> ' +
                    escapeHtml(docs.map(a => a.name + ' (' + formatBytes(a.size) + ')').join(' · ')) + '</p>';
            }
        }
        const trace = [];
        trace.push(L('Erfasst am ', 'Recorded on ') + new Date(e.createdAt).toLocaleString(mwlLocale()));
        if (e.history && e.history.length) trace.push(e.history.length + L('× nachträglich bearbeitet', '× edited afterwards'));
        if (e.contentHash) trace.push(L('Prüfsumme ', 'Checksum ') + e.contentHash);
        html += '<p class="trace mono">' + escapeHtml(trace.join('  ·  ')) + '</p>';
        html += '</div>';
    });

    html += '<div class="sig">';
    html += '<div class="sig-line">' + L('Ort, Datum', 'Place, date') + '</div>';
    html += '<div class="sig-line">' + L('Unterschrift', 'Signature') + '</div>';
    html += '</div>';

    html += '<div class="foot">';
    html += '<p>' + L(
        'Dieses Protokoll wurde aus einem lokal mit AES-256-GCM verschlüsselten Speicher erzeugt. Die Einträge sind jeweils zeitnah zu den beschriebenen Vorfällen entstanden; das Erfassungsdatum steht unter jedem Vorfall. Die Prüfsumme belegt, dass der Text seit der Erfassung unverändert ist, ersetzt aber keinen kryptographischen Manipulationsschutz.',
        'This record was produced from storage encrypted locally with AES-256-GCM. Each entry was written close in time to the incident it describes; the date of entry appears beneath every incident. The checksum shows the text is unchanged since it was recorded, but is not a substitute for cryptographic tamper protection.'
    ) + '</p>';
    // Bewusst keine erfundenen Seitenzahlen: CSS kann sie im Browser nicht
    // liefern, der Druckdialog schon.
    html += '<p>' + L('Seitenzahlen liefert der Druckdialog: dort „Kopf- und Fußzeilen" aktivieren.', 'For page numbers, enable “Headers and footers” in the print dialog.') + '</p>';
    html += '</div>';
    html += '</div>';

    // Das Dokument druckt sich selbst, sobald ES fertig ist — printWin.onload
    // ist nach document.write()+close() oft schon durch, dann kam der Dialog
    // nie. Zusaetzlich auf die Schriften warten, sonst druckt Chrome die
    // Fallback-Schrift und das Layout springt.
    html += '<script>window.addEventListener("load",function(){';
    html += 'var go=function(){setTimeout(function(){window.print();},120);};';
    html += 'if(document.fonts&&document.fonts.ready){document.fonts.ready.then(go,go);}else{go();}';
    html += '});<\/script>';
    html += '</body></html>';

    const printWin = window.open('', '_blank');
    if (!printWin) {
        showToast(L('Popup blockiert — bitte Popups für diese Seite erlauben', 'Popup blocked — please allow popups for this page'), 'error');
        return;
    }
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    showToast(L('Protokoll im neuen Tab — der Druckdialog öffnet sich selbst', 'Record opened in a new tab — the print dialog opens by itself'), 'info');
}

function openExportModal() {
    // Set default dates
    if (entries.length > 0) {
        const dates = entries.map(e => e.date).sort();
        document.getElementById('exportFrom').value = dates[0];
        document.getElementById('exportTo').value = dates[dates.length - 1];
    }
    document.getElementById('exportPreview').textContent = L('Klicke "Vorschau" um das Protokoll zu generieren.', 'Click "Preview" to generate the record.');
    openModal('exportModal');
}

// ═════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString(mwlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch(e) { return dateStr; }
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

const TOAST_ICONS = {
    success: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
};

function showToast(text, type) {
    type = TOAST_ICONS[type] ? type : 'info';
    const toast = document.getElementById('toast');
    document.getElementById('toastIcon').innerHTML = TOAST_ICONS[type];
    document.getElementById('toastText').textContent = text;
    toast.className = 'toast tone-' + type;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
}

// ═════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═════════════════════════════════════════

document.addEventListener('keydown', (e) => {
    // Enter on lock screen
    if (!derivedKey) {
        if (e.key === 'Enter') {
            if (isFirstTime()) handleSetup();
            else handleUnlock();
        }
        return;
    }

    // Escape closes modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
        document.getElementById('vaultMenu').classList.remove('open');
    }

    // Ctrl+N = new entry
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); openNewEntry(); }
    // Ctrl+E = export
    if (e.ctrlKey && e.key === 'e') { e.preventDefault(); openExportModal(); }
    // Ctrl+L = lock
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); lockApp(); }
    // Ctrl+F = focus search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

// ═════════════════════════════════════════
//  PASSWORD STRENGTH LIVE UPDATE
// ═════════════════════════════════════════

document.getElementById('pwInput').addEventListener('input', function() { updateStrengthBar(this.value, 'pwStrength'); });
document.getElementById('newPwInput').addEventListener('input', function() { updateStrengthBar(this.value, 'newPwStrength'); });
document.getElementById('newPwInput2').addEventListener('input', function() { updateStrengthBar(this.value, 'newPwStrength2'); });

// ═════════════════════════════════════════
//  DATEI-INPUTS — Beweisfotos & Backup
// ═════════════════════════════════════════

document.getElementById('attachmentInput').addEventListener('change', function() {
    handleAttachmentSelect(this.files);
    this.value = '';
});

// Ablage-Zone: Klick, Tastatur und Ziehen fuehren zum selben Ergebnis.
// Ohne den Tastaturpfad waere das Hinzufuegen von Beweismitteln nur mit
// Maus moeglich — die Zone ist die einzige Stelle dafuer.
(function wireAttachmentDrop() {
    const zone = document.getElementById('attachmentDrop');
    const input = document.getElementById('attachmentInput');
    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });

    // dragenter/dragover MUESSEN abgefangen werden, sonst oeffnet der Browser
    // die Datei einfach im Tab und der Eintrag ist weg.
    ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        zone.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, (e) => {
        e.preventDefault(); e.stopPropagation();
        zone.classList.remove('is-over');
    }));
    zone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            handleAttachmentSelect(e.dataTransfer.files);
        }
    });
})();
document.getElementById('backupFileInput').addEventListener('change', function() {
    if (this.files[0]) importBackupFile(this.files[0]);
    this.value = '';
});
document.getElementById('backupFileInputLock').addEventListener('change', function() {
    if (this.files[0]) importBackupFile(this.files[0]);
    this.value = '';
});
document.getElementById('escalationCategorySelect').addEventListener('change', renderEscalationContent);

// ═════════════════════════════════════════
//  INIT
// ═════════════════════════════════════════

// Theme from parent app
try {
    const parentData = JSON.parse(localStorage.getItem('tg_pro_data') || '{}');
    if (parentData.settings && parentData.settings.themeMode === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
} catch(e) {}

// Der Tresor-Kopf liegt jetzt in IndexedDB und damit hinter einem
// asynchronen Zugriff — der Sperrbildschirm darf erst danach entscheiden,
// ob er "anlegen" oder "entsperren" zeigt. Bis dahin bleibt das Formular
// verborgen, sonst blitzt fuer einen Moment die falsche Ansicht auf.
async function bootVault() {
    await vsInit();

    vaultMeta = await vsGetMeta();

    let mirror = null;
    try {
        const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (raw && raw.salt && raw.pwHash && raw.entries) mirror = raw;
    } catch (e) { /* kaputter Key: wie kein Tresor behandeln */ }

    if (!vaultMeta) {
        // Kein Tresor in IndexedDB — steht noch einer im localStorage?
        // Entweder ein alter v1-Tresor oder der Spiegel aus der Cloud-Freigabe.
        // Beide koennen hier nur gelesen, nicht ausgepackt werden: die Inhalte
        // stecken im verschluesselten Block, dafuer braucht es das Passwort.
        // Migration bzw. Uebernahme laeuft in unlockVault().
        if (mirror) {
            legacyVault = mirror;
            vaultMeta = mirror;
        }
    } else if (mirror) {
        // WICHTIG: Hier lag der Fehler, an dem der Stand von einem zweiten
        // Geraet nicht ankam. Der Cloud-Sync schreibt seine Kopie in den
        // localStorage-Spiegel; der Tresor selbst liegt aber in IndexedDB.
        // Weil dieser Zweig frueher gar nicht existierte, wurde ein frisch
        // heruntergeladener Stand schlicht ignoriert, sobald lokal schon ein
        // Tresor lag — und beim naechsten Speichern hat der lokale, aeltere
        // Stand den neueren in der Cloud auch noch ueberschrieben.
        const mine = Date.parse(vaultMeta.updatedAt || '') || 0;
        const theirs = Date.parse(mirror.updatedAt || '') || 0;
        // Im Zweifel zusammenfuehren: Das Zusammenfuehren ist verlustfrei
        // (Vereinigung ueber die Eintrags-IDs), ein ueberfluessiger Durchlauf
        // kostet also nur eine Entschluesselung. Ein ausgelassener Durchlauf
        // kostet dagegen den Stand eines Geraets — Tresore aus der Zeit vor
        // diesem Zeitstempel haben `mine === 0` und werden deshalb geprueft.
        if (!mine || theirs > mine) pendingCloudVault = mirror;
    }

    if (vsIsFallback()) {
        showToast(L('Dieser Browser erlaubt keinen grossen Speicher — der Tresor läuft im Notbetrieb mit engem Limit',
                    'This browser does not allow large storage — the vault runs in fallback mode with a tight limit'), 'warning');
    }

    initLockScreen();
}

bootVault();
