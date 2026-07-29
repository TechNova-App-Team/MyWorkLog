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
        { key: 'frequency', label: L('Häufigkeit', 'Frequency'), type: 'select', options: [
            ['once', L('Einmalig', 'One-off')], ['repeated', L('Wiederholt', 'Repeated')], ['ongoing', L('Dauerhaft', 'Ongoing')]
        ] },
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
//  STORAGE — Encrypted Vault in localStorage
// ═════════════════════════════════════════

function getVault() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; } catch(e) { return null; }
}

function isFirstTime() {
    return !getVault();
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
    const key = await deriveKey(password, salt);
    const pwHash = await getPasswordHash(password);
    const emptyData = JSON.stringify([]);
    const encrypted = await encrypt(emptyData, key);

    const vault = {
        v: 1,
        caseId: generateCaseId(),
        salt: u8ToB64(salt),
        pwHash: pwHash,
        entries: encrypted
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(vault));
    derivedKey = key;
    entries = [];
}

async function unlockVault(password) {
    const vault = getVault();
    if (!vault) throw new Error(L('Kein Tresor gefunden', 'No vault found'));

    const salt = b64ToU8(vault.salt);
    const key = await deriveKey(password, salt);

    // Verify password by trying to decrypt
    try {
        const plaintext = await decrypt(vault.entries, key);
        entries = JSON.parse(plaintext);
        derivedKey = key;
    } catch(e) {
        throw new Error(L('Falsches Passwort', 'Wrong password'));
    }

    // Migration: Tresore aus einer Version ohne Aktenzeichen bekommen eins nachgetragen.
    if (!vault.caseId) {
        vault.caseId = generateCaseId();
        localStorage.setItem(STORE_KEY, JSON.stringify(vault));
    }
}

function getCaseId() {
    const vault = getVault();
    return (vault && vault.caseId) || '';
}

async function saveVault() {
    if (!derivedKey) return;
    const vault = getVault();
    if (!vault) return;
    const plaintext = JSON.stringify(entries);
    vault.entries = await encrypt(plaintext, derivedKey);
    // Bewusst KEIN automatisches Kuerzen bei QuotaExceededError (anders als das
    // Backup-Pattern in storage-save.js) — Beweismittel duerfen nie still verloren gehen.
    // Der Aufrufer faengt den Fehler und macht die zuletzt hinzugefuegte Aenderung rueckgaengig.
    localStorage.setItem(STORE_KEY, JSON.stringify(vault));
}

function estimateVaultSize() {
    const vault = getVault();
    if (!vault) return 0;
    return new Blob([JSON.stringify(vault)]).size;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function changePassword(currentPw, newPw) {
    const vault = getVault();
    if (!vault) throw new Error(L('Kein Tresor gefunden', 'No vault found'));
    const currentHash = await getPasswordHash(currentPw);
    if (currentHash !== vault.pwHash) throw new Error(L('Aktuelles Passwort ist falsch', 'Current password is wrong'));

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const newKey = await deriveKey(newPw, salt);
    const newPwHash = await getPasswordHash(newPw);
    const plaintext = JSON.stringify(entries);
    const encrypted = await encrypt(plaintext, newKey);

    const newVault = { v: vault.v, salt: u8ToB64(salt), pwHash: newPwHash, entries: encrypted };
    localStorage.setItem(STORE_KEY, JSON.stringify(newVault));
    derivedKey = newKey;
}

// ═════════════════════════════════════════
//  BACKUP — Export/Import des (bereits verschluesselten) Tresors
// ═════════════════════════════════════════

function exportBackup() {
    const vault = getVault();
    if (!vault) { showToast(L('Kein Tresor zum Exportieren vorhanden', 'No vault to export'), 'warning'); return; }
    const blob = new Blob([JSON.stringify(vault, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schatten-berichtsheft-backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast(L('Backup heruntergeladen — an einem zweiten Ort sicher aufbewahren', 'Backup downloaded — keep it safe in a second location'), 'success');
}

function isValidVaultShape(v) {
    return !!(v && typeof v === 'object' && v.salt && v.pwHash && v.entries && v.entries.iv && v.entries.data);
}

function importBackupFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
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

        localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
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
    }
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

function enterApp() {
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
    if (willOpen) {
        document.getElementById('vaultMenuSize').textContent = formatBytes(estimateVaultSize());
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

const MAX_ATTACHMENTS = 5;
const ATTACHMENT_MAX_DIM = 1600;
const ATTACHMENT_QUALITY = 0.72;

let currentAttachments = [];

function fileToCompressedDataUrl(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const scale = maxDim / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error(L('Bild konnte nicht gelesen werden', 'Could not read image')));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error(L('Datei konnte nicht gelesen werden', 'Could not read file')));
        reader.readAsDataURL(file);
    });
}

async function handleAttachmentSelect(fileList) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    if (currentAttachments.length + files.length > MAX_ATTACHMENTS) {
        showToast(L('Maximal ' + MAX_ATTACHMENTS + ' Beweisfotos pro Eintrag', 'Maximum ' + MAX_ATTACHMENTS + ' evidence photos per entry'), 'warning');
    }
    const room = Math.max(0, MAX_ATTACHMENTS - currentAttachments.length);
    for (const file of files.slice(0, room)) {
        try {
            const dataUrl = await fileToCompressedDataUrl(file, ATTACHMENT_MAX_DIM, ATTACHMENT_QUALITY);
            currentAttachments.push({ id: crypto.randomUUID(), name: file.name, mime: 'image/jpeg', dataUrl, size: dataUrl.length });
        } catch (e) {
            showToast(e.message, 'error');
        }
    }
    renderAttachmentThumbs();
}

function removeAttachment(id) {
    currentAttachments = currentAttachments.filter(a => a.id !== id);
    renderAttachmentThumbs();
}

function renderAttachmentThumbs() {
    const wrap = document.getElementById('attachmentThumbs');
    if (!wrap) return;
    if (!currentAttachments.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = currentAttachments.map(a =>
        '<div class="attach-thumb">' +
            '<img src="' + a.dataUrl + '" alt="' + escapeHtml(a.name) + '">' +
            '<button type="button" class="attach-thumb-remove" onclick="removeAttachment(\'' + a.id + '\')" aria-label="' + L('Entfernen', 'Remove') + '">&times;</button>' +
        '</div>'
    ).join('');
}

function openAttachmentViewer(dataUrl) {
    document.getElementById('attachmentViewerImg').src = dataUrl;
    openModal('attachmentViewerModal');
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
    currentAttachments = (entry.attachments || []).slice();
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
    const attachmentsSnapshot = currentAttachments.slice();
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
        showToast(L('Kein Speicherplatz mehr — alte Beweisfotos entfernen oder zuerst ein Backup exportieren', 'Out of storage space — remove old evidence photos or export a backup first'), 'error');
        return;
    }
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
            '<div class="entry-attach-strip">' + attachments.map(a =>
                '<img class="entry-attach-thumb" src="' + a.dataUrl + '" alt="' + escapeHtml(a.name) + '" onclick="openAttachmentViewer(\'' + a.dataUrl.replace(/'/g, "\\'") + '\')">'
            ).join('') + '</div>' : '';

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
            lines.push(L('  Beweisfotos (siehe PDF-Export): ', '  Evidence photos (see PDF export): ') + e.attachments.map(a => a.name).join(', '));
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
//  Das Papier ist ein anderes Medium als die App: es wird oft schwarzweiss
//  auf einem Bürodrucker ausgegeben. Deshalb traegt hier die FORM den
//  Schweregrad (Fuellung → Rahmen → nackter Text), Farbe ist nur Zugabe.
//  Die Druckfarben sind gegen Weiss gerechnet, nicht vom Bildschirm
//  uebernommen: das dunkle Rot/Amber der App liegt auf Papier bei ΔE 11.3
//  (kaum unterscheidbar), #b3261e/#b8860b/#5f6672 besteht mit ΔE 20.9
//  normal / 14.9 deutan (scripts/validate_palette.js --mode light).
// ═════════════════════════════════════════

// Druckfarben: bewusst NICHT die Bildschirm-Tokens (die sind gegen eine
// dunkle Flaeche gerechnet und auf Weiss zu blass bzw. zu aehnlich).
const PRINT_SEV = {
    critical: { color: '#b3261e', form: 'solid' },   // gefuellt  — sticht auch in s/w heraus
    high:     { color: '#b8860b', form: 'strong' },  // 1.5px Rahmen
    medium:   { color: '#5f6672', form: 'outline' }, // 1px Rahmen
    low:      { color: '#5f6672', form: 'plain' },   // nur Text
    note:     { color: '#8a9099', form: 'plain' }
};

function exportAsPDF() {
    const exportEntries = getExportEntries();
    if (exportEntries.length === 0) { showToast(L('Keine Einträge zum Exportieren', 'No entries to export'), 'warning'); return; }

    const now = new Date();
    const dates = exportEntries.map(e => e.date).sort();
    const caseId = getCaseId();
    const lang = document.documentElement.lang === 'en' ? 'en' : 'de';
    const zeitraum = formatDate(dates[0]) + ' bis ' + formatDate(dates[dates.length - 1]);
    const zeitraumEn = formatDate(dates[0]) + ' to ' + formatDate(dates[dates.length - 1]);

    const sevBadge = (sev) => {
        const p = PRINT_SEV[sev] || PRINT_SEV.note;
        return '<span class="sev sev--' + p.form + '" style="--sev:' + p.color + '">' +
            (SEVERITY_LABELS[sev] || sev) + '</span>';
    };

    let html = '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="UTF-8">';
    html += '<title>' + L('Beschwerde- und Dokumentationsprotokoll', 'Complaint and documentation record') + '</title>';
    html += '<style>';

    // ── Seite ──
    html += '@page{margin:18mm 16mm 20mm}';
    // Hintergruende und Rahmen MUESSEN mitgedruckt werden — ohne das verschwindet
    // die Verteilungs-Grafik und jede gefuellte Kennzeichnung stillschweigend.
    html += '*{print-color-adjust:exact;-webkit-print-color-adjust:exact;box-sizing:border-box}';
    html += 'html,body{margin:0;padding:0}';
    // Kein Webfont verfuegbar (das Druckfenster laedt keine Schriften nach) —
    // deshalb Systemstapel. Serif fuer den Dokumenten-Text, Sans fuer Daten
    // und Beschriftungen: das trennt Aussage von Metadaten.
    html += 'body{font-family:Georgia,"Iowan Old Style","Times New Roman",serif;color:#111;font-size:10.5pt;line-height:1.6}';
    html += '.sans{font-family:"Segoe UI",system-ui,-apple-system,Helvetica,Arial,sans-serif}';
    html += '.mono{font-family:"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace}';

    // ── Laufender Kopf: wiederholt sich in Chrome auf jeder Druckseite ──
    html += '.runhead{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;';
    html += 'font-size:7.5pt;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;';
    html += 'border-bottom:.5pt solid #c9ccd1;padding-bottom:3pt}';
    html += '.page{padding-top:10mm}';
    html += '.break{break-after:page;page-break-after:always}';

    // ── Ueberschriften ──
    html += 'h2{font-size:14pt;font-weight:normal;letter-spacing:-.01em;margin:0 0 2mm;padding-bottom:2mm;border-bottom:1pt solid #111}';
    html += '.lede{font-size:9.5pt;color:#4b5158;margin:0 0 7mm}';

    // ── Deckblatt (keine vh-Einheiten: im Druck unzuverlaessig) ──
    html += '.cover{padding-top:32mm}';
    html += '.cover-tag{display:inline-block;border:1pt solid #b3261e;color:#b3261e;font-size:7.5pt;';
    html += 'font-weight:600;letter-spacing:.16em;padding:2pt 8pt;margin-bottom:14mm}';
    // 20pt statt 28pt: bei 28pt lief der deutsche Titel ueber den Satzspiegel
    // hinaus und wurde am Rand abgeschnitten.
    html += '.cover-title{font-size:20pt;line-height:1.2;font-weight:normal;letter-spacing:-.015em;margin:0 0 3mm;max-width:150mm}';
    html += '.cover-sub{font-size:10pt;color:#4b5158;margin:0 0 16mm;max-width:130mm}';
    html += '.facts{display:grid;grid-template-columns:1fr 1fr;gap:7mm 12mm;border-top:1pt solid #111;padding-top:6mm;margin:0 0 24mm}';
    html += '.facts dt{font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:1mm}';
    html += '.facts dd{margin:0;font-size:11.5pt}';
    html += '.sig{display:grid;grid-template-columns:1fr 1fr;gap:16mm;margin-top:20mm}';
    html += '.sig-line{border-top:.75pt solid #111;padding-top:2mm;font-size:8.5pt;color:#4b5158}';

    // ── Schweregrad-Kennzeichnung: Form zuerst, Farbe als Zugabe ──
    html += '.sev{display:inline-block;font-size:7.5pt;font-weight:600;letter-spacing:.07em;';
    html += 'text-transform:uppercase;padding:1.5pt 6pt;white-space:nowrap;color:var(--sev)}';
    html += '.sev--solid{background:var(--sev);color:#fff}';
    html += '.sev--strong{border:1.5pt solid var(--sev)}';
    html += '.sev--outline{border:.75pt solid var(--sev)}';
    html += '.sev--plain{padding-left:0;padding-right:0}';
    // margin-left: die Stufen ohne Rahmen (.sev--plain) haben keine Polsterung,
    // sonst klebte im Verzeichnis „NOTIZ GELÖST" als ein Wort zusammen.
    html += '.status{font-size:7.5pt;letter-spacing:.05em;text-transform:uppercase;color:#6b7280;white-space:nowrap;margin-left:3mm}';

    // ── Inhaltsverzeichnis (ohne Anker: auf Papier klickt niemand) ──
    html += '.toc{width:100%;border-collapse:collapse;font-size:9.5pt}';
    html += '.toc td{padding:2.5mm 0;border-bottom:.5pt solid #d8dade;vertical-align:baseline}';
    html += '.toc .n{width:9mm;color:#6b7280;font-size:8.5pt}';
    html += '.toc .d{width:24mm;color:#4b5158;font-size:9pt;white-space:nowrap}';
    html += '.toc .s{text-align:right;white-space:nowrap;padding-left:4mm}';
    html += '.hint{margin-top:5mm;font-size:8pt;color:#6b7280;max-width:130mm}';

    // ── Verteilung: eine Zeile pro Stufe. Eine gestapelte Farbleiste war in
    //    s/w ein grauer Balken ohne Information; Balken pro Zeile plus Zahl
    //    liest sich gedruckt immer. ──
    html += '.dist{width:100%;border-collapse:collapse;font-size:9.5pt;margin:0 0 8mm}';
    html += '.dist td{padding:1.8mm 0;vertical-align:middle}';
    html += '.dist .lbl{width:26mm;white-space:nowrap}';
    html += '.dist .bar{width:auto;padding-right:4mm}';
    html += '.dist .bar i{display:block;height:3.2mm;background:var(--sev);min-width:.6mm}';
    html += '.dist .val{width:12mm;text-align:right;font-variant-numeric:tabular-nums}';
    html += 'table.tbl{width:100%;border-collapse:collapse;font-size:9.5pt;margin:0 0 8mm}';
    html += 'table.tbl th{text-align:left;font-weight:600;font-size:7.5pt;letter-spacing:.07em;';
    html += 'text-transform:uppercase;color:#6b7280;border-bottom:1pt solid #111;padding:0 0 2mm}';
    html += 'table.tbl td{padding:2.2mm 0;border-bottom:.5pt solid #d8dade}';
    html += 'table.tbl td+td,table.tbl th+th{text-align:right;width:18mm;font-variant-numeric:tabular-nums}';

    // ── Vorfaelle: gesetzte Abschnitte, keine gerundeten Kaesten ──
    html += '.inc{break-inside:avoid;page-break-inside:avoid;padding:0 0 7mm;margin:0 0 7mm;border-bottom:.5pt solid #d8dade}';
    html += '.inc:last-of-type{border-bottom:none}';
    html += '.inc-head{display:flex;justify-content:space-between;align-items:baseline;gap:4mm;margin-bottom:1.5mm}';
    html += '.inc-no{font-size:8pt;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;white-space:nowrap}';
    html += '.inc-badges{display:flex;align-items:center;gap:4mm;flex-shrink:0}';
    html += '.inc-when{font-size:11pt;margin:0 0 1mm}';
    html += '.inc-cat{font-size:8.5pt;letter-spacing:.04em;text-transform:uppercase;color:#4b5158;margin-bottom:3mm}';
    html += '.inc-text{white-space:pre-wrap;font-size:10.5pt;line-height:1.65;max-width:150mm}';
    html += '.det{margin:4mm 0 0;display:grid;grid-template-columns:auto 1fr;gap:1.2mm 4mm;font-size:9.5pt;max-width:130mm}';
    html += '.det dt{color:#6b7280;font-size:8.5pt;white-space:nowrap}';
    html += '.det dd{margin:0}';
    html += '.wit{margin-top:3mm;font-size:9.5pt}';
    html += '.wit b{font-weight:normal;color:#6b7280;font-size:8.5pt}';
    // Beweisfotos gross genug, um Beweis zu sein — 150px waren auf Papier
    // etwa 4cm und damit unbrauchbar.
    html += '.pics{margin-top:4mm;display:flex;flex-wrap:wrap;gap:3mm}';
    html += '.pics img{width:80mm;max-height:90mm;object-fit:contain;border:.5pt solid #c9ccd1}';
    html += '.trace{margin-top:3mm;font-size:7.5pt;color:#8a9099;letter-spacing:.02em}';
    html += '.foot{margin-top:12mm;padding-top:4mm;border-top:1pt solid #111;font-size:8pt;color:#4b5158;max-width:150mm}';
    html += '</style></head><body>';

    // ── Laufender Kopf ──
    html += '<div class="runhead sans"><span>' + L('Vertraulich', 'Confidential') + '</span>';
    html += '<span>' + (caseId ? escapeHtml(caseId) : L('Schatten-Berichtsheft', 'Shadow report book')) + '</span></div>';

    // ═══ DECKBLATT ═══
    html += '<div class="page cover break">';
    html += '<div class="cover-tag sans">' + L('VERTRAULICH', 'CONFIDENTIAL') + '</div>';
    html += '<h1 class="cover-title">' + L('Beschwerde- und Dokumentationsprotokoll', 'Complaint and documentation record') + '</h1>';
    html += '<p class="cover-sub">' + L('Private Aufzeichnung einer Auszubildenden / eines Auszubildenden, geführt neben dem amtlichen Ausbildungsnachweis nach § 13 BBiG.', 'A private record kept by an apprentice alongside the official training record under § 13 BBiG (German Vocational Training Act).') + '</p>';
    html += '<dl class="facts sans">';
    if (caseId) html += '<div><dt>' + L('Aktenzeichen', 'Case reference') + '</dt><dd class="mono">' + escapeHtml(caseId) + '</dd></div>';
    html += '<div><dt>' + L('Dokumentierter Zeitraum', 'Documented period') + '</dt><dd>' + L(zeitraum, zeitraumEn) + '</dd></div>';
    html += '<div><dt>' + L('Vorfälle', 'Incidents') + '</dt><dd>' + exportEntries.length + '</dd></div>';
    html += '<div><dt>' + L('Ausgefertigt am', 'Issued on') + '</dt><dd>' + now.toLocaleDateString(mwlLocale(), { day: '2-digit', month: 'long', year: 'numeric' }) + '</dd></div>';
    html += '</dl>';
    html += '<div class="sig sans">';
    html += '<div class="sig-line">' + L('Name der Auszubildenden / des Auszubildenden', 'Name of the apprentice') + '</div>';
    html += '<div class="sig-line">' + L('Ausbildungsbetrieb', 'Training company') + '</div>';
    html += '</div>';
    html += '</div>';

    // ═══ INHALTSVERZEICHNIS ═══
    html += '<div class="page break">';
    html += '<h2>' + L('Übersicht der Vorfälle', 'Overview of incidents') + '</h2>';
    html += '<table class="toc">';
    exportEntries.forEach((e, i) => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        const statusMeta = STATUS_META[e.status || 'open'] || STATUS_META.open;
        html += '<tr>';
        html += '<td class="n sans">' + (i + 1) + '</td>';
        html += '<td class="d sans">' + formatDate(e.date) + '</td>';
        html += '<td>' + escapeHtml(cat.label) + '</td>';
        html += '<td class="s sans">' + sevBadge(e.severity) +
                ' <span class="status">' + escapeHtml(statusMeta.label) + '</span></td>';
        html += '</tr>';
    });
    html += '</table>';
    // Bewusst keine erfundenen Seitenzahlen: echte Seitenzahlen kann CSS im
    // Browser nicht liefern, der Druckdialog schon.
    html += '<p class="hint sans">' + L('Seitenzahlen liefert der Druckdialog: dort „Kopf- und Fußzeilen" aktivieren.', 'For page numbers, enable “Headers and footers” in the print dialog.') + '</p>';
    html += '</div>';

    // ═══ ZUSAMMENFASSUNG ═══
    html += '<div class="page break">';
    html += '<h2>' + L('Zusammenfassung', 'Summary') + '</h2>';
    html += '<p class="lede">' + exportEntries.length + L(' dokumentierte Vorfälle im Zeitraum ', ' documented incidents in the period ') + L(zeitraum, zeitraumEn) + '.</p>';

    const sevOrder = ['critical', 'high', 'medium', 'low', 'note'];
    const sevCounts = {};
    sevOrder.forEach(s => { sevCounts[s] = exportEntries.filter(e => e.severity === s).length; });

    // Anteil am Gesamtbestand, nicht am groessten Wert: bei fuenf gleich
    // haeufigen Stufen ergaebe eine Max-Normierung fuenf randvolle Balken —
    // das liest sich wie ein Darstellungsfehler und sagt nichts.
    html += '<table class="dist sans">';
    sevOrder.filter(s => sevCounts[s] > 0).forEach(s => {
        const p = PRINT_SEV[s] || PRINT_SEV.note;
        const pct = sevCounts[s] / exportEntries.length * 100;
        html += '<tr style="--sev:' + p.color + '">';
        html += '<td class="lbl">' + (SEVERITY_LABELS[s] || s) + '</td>';
        html += '<td class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></td>';
        html += '<td class="val">' + sevCounts[s] + '</td>';
        html += '</tr>';
    });
    html += '</table>';

    html += '<table class="tbl sans"><tr><th>' + L('Kategorie', 'Category') + '</th><th>' + L('Anzahl', 'Count') + '</th></tr>';
    Object.keys(CATEGORIES).forEach(k => {
        const c = exportEntries.filter(e => e.category === k).length;
        if (c > 0) html += '<tr><td>' + escapeHtml(CATEGORIES[k].label) + '</td><td>' + c + '</td></tr>';
    });
    html += '</table>';

    html += '<table class="tbl sans"><tr><th>' + L('Bearbeitungsstand', 'Handling status') + '</th><th>' + L('Anzahl', 'Count') + '</th></tr>';
    STATUS_ORDER.forEach(s => {
        const c = exportEntries.filter(e => (e.status || 'open') === s).length;
        if (c > 0) html += '<tr><td>' + escapeHtml(STATUS_META[s].label) + '</td><td>' + c + '</td></tr>';
    });
    html += '</table>';
    html += '</div>';

    // ═══ VORFÄLLE ═══
    html += '<div class="page">';
    html += '<h2>' + L('Die Vorfälle im Einzelnen', 'The incidents in detail') + '</h2>';
    exportEntries.forEach((e, i) => {
        const cat = CATEGORIES[e.category] || CATEGORIES.other;
        const statusMeta = STATUS_META[e.status || 'open'] || STATUS_META.open;
        html += '<div class="inc">';
        html += '<div class="inc-head">';
        html += '<span class="inc-no sans">' + L('Vorfall ', 'Incident ') + (i + 1) + L(' von ', ' of ') + exportEntries.length + '</span>';
        html += '<span class="inc-badges sans">' + sevBadge(e.severity) +
                '<span class="status">' + escapeHtml(statusMeta.label) + '</span></span>';
        html += '</div>';
        html += '<p class="inc-when">' + formatDate(e.date) + (e.time ? ', ' + e.time + L(' Uhr', '') : '') + '</p>';
        html += '<p class="inc-cat sans">' + escapeHtml(cat.label) + '</p>';
        html += '<div class="inc-text">' + escapeHtml(e.text) + '</div>';

        const detailRows = resolveCategoryDetails(e.category, e.details);
        if (detailRows.length) {
            html += '<dl class="det sans">' + detailRows.map(d =>
                '<dt>' + escapeHtml(d.label) + '</dt><dd>' + escapeHtml(d.value) + '</dd>').join('') + '</dl>';
        }
        if (e.witnesses && e.witnesses.length) {
            html += '<p class="wit sans"><b>' + L('Zeugen', 'Witnesses') + '</b> · ' + escapeHtml(e.witnesses.join(', ')) + '</p>';
        }
        if (e.attachments && e.attachments.length) {
            html += '<div class="pics">' + e.attachments.map(a =>
                '<img src="' + a.dataUrl + '" alt="' + escapeHtml(a.name) + '">').join('') + '</div>';
        }
        const trace = [];
        trace.push(L('Erfasst am ', 'Recorded on ') + new Date(e.createdAt).toLocaleString(mwlLocale()));
        if (e.history && e.history.length) trace.push(e.history.length + L('× nachträglich bearbeitet', '× edited afterwards'));
        if (e.contentHash) trace.push(L('Prüfsumme ', 'Checksum ') + e.contentHash);
        html += '<p class="trace sans mono">' + escapeHtml(trace.join('  ·  ')) + '</p>';
        html += '</div>';
    });

    html += '<div class="sig sans">';
    html += '<div class="sig-line">' + L('Ort, Datum', 'Place, date') + '</div>';
    html += '<div class="sig-line">' + L('Unterschrift', 'Signature') + '</div>';
    html += '</div>';

    html += '<p class="foot sans">' + L(
        'Dieses Protokoll wurde aus einem lokal mit AES-256-GCM verschlüsselten Speicher erzeugt. Die Einträge sind jeweils zeitnah zu den beschriebenen Vorfällen entstanden; das Erfassungsdatum steht unter jedem Vorfall. Die Prüfsumme belegt, dass der Text seit der Erfassung unverändert ist, ersetzt aber keinen kryptographischen Manipulationsschutz.',
        'This record was produced from storage encrypted locally with AES-256-GCM. Each entry was written close in time to the incident it describes; the date of entry appears beneath every incident. The checksum shows the text is unchanged since it was recorded, but is not a substitute for cryptographic tamper protection.'
    ) + '</p>';
    html += '</div>';

    // Das Dokument druckt sich selbst, sobald ES fertig ist. Vorher haing der
    // Aufruf an printWin.onload — das Ereignis ist nach document.write()+close()
    // oft schon durch, dann kam der Dialog nie. Ausserdem muessen Beweisfotos
    // (data:-URLs) geladen sein, bevor gedruckt wird.
    html += '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},120);});<\/script>';
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

initLockScreen();
