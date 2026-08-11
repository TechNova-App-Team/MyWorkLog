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
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>',
    graduation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5z"></path><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"></path></svg>',
    euro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 5.5A7 7 0 0 0 7.2 9m0 6a7 7 0 0 0 11.3 3.5"></path><line x1="3" y1="10" x2="12" y2="10"></line><line x1="3" y1="14" x2="12" y2="14"></line></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="9" x2="10" y2="15"></line><line x1="14" y1="9" x2="14" y2="15"></line></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5"></path><path d="M14 10V4a2 2 0 0 0-4 0v7"></path><path d="M10 10.5V6a2 2 0 0 0-4 0v9"></path><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"></path><line x1="7.5" y1="7.5" x2="7.51" y2="7.5"></line></svg>',
};

// ─── Kategorie-Gruppen ──────────────────────────────────
// Bei ~40 Kategorien ist eine flache Liste nicht mehr lesbar. Die Gruppe ist
// zugleich die Voreinstellung fuer das Symbol: eine Kategorie muss nur dann
// ein eigenes tragen, wenn sie sich innerhalb ihrer Gruppe unterscheiden soll.
// Sonst braeuchte man 40 Symbole, von denen die Haelfte nichts kodiert
// (dieselbe Falle wie bei den 53 ArchFlow-Gruppen auf 21 Farben).
const CATEGORY_GROUPS = {
    training: { label: L('Ausbildungsinhalt & Anleitung', 'Training content & guidance'), icon: CATEGORY_ICONS.book },
    time:     { label: L('Arbeitszeit & Vergütung', 'Working time & pay'), icon: CATEGORY_ICONS.overtime },
    conduct:  { label: L('Umgang & Verhalten', 'Conduct & behaviour'), icon: CATEGORY_ICONS.verbal },
    health:   { label: L('Sicherheit & Gesundheit', 'Safety & health'), icon: CATEGORY_ICONS.safety },
    school:   { label: L('Berufsschule & Prüfung', 'Vocational school & exams'), icon: CATEGORY_ICONS.graduation },
    formal:   { label: L('Organisation & Formales', 'Organisation & formalities'), icon: CATEGORY_ICONS.other },
    misc:     { label: L('Sonstiges', 'Other'), icon: CATEGORY_ICONS.other },
    custom:   { label: L('Eigene Kategorien', 'Your own categories'), icon: CATEGORY_ICONS.tag },
};

// Reihenfolge im Waehler. `custom` steht vorn: wer sich eine eigene Kategorie
// angelegt hat, greift zuerst danach.
const CATEGORY_GROUP_ORDER = ['custom', 'training', 'time', 'conduct', 'health', 'school', 'formal', 'misc'];

// `hint` ist die Fundhilfe beim Auswaehlen — im Waehler und in der Suche
// sichtbar, im Protokoll NICHT. Deshalb ein eigenes Feld statt einer Klammer
// im Label: was nie Teil des Labels ist, kann auch nicht versehentlich in den
// Export geraten (siehe catExportLabel).
const CATEGORIES = {
    // ── Ausbildungsinhalt & Anleitung ──
    neglect: { group: 'training', icon: CATEGORY_ICONS.neglect,
        label: L('Ausbildungspflicht vernachlässigt', 'Training duty neglected'),
        hint: L('zu wenig Anleitung, sich selbst überlassen', 'too little guidance, left on your own') },
    unrelated: { group: 'training', icon: CATEGORY_ICONS.unrelated,
        label: L('Ausbildungsfremde Tätigkeiten', 'Non-training tasks'),
        hint: L('Aufgaben ohne Bezug zum Ausbildungsberuf', 'tasks unrelated to the occupation you train for') },
    noTrainer: { group: 'training',
        label: L('Kein Ausbilder erreichbar', 'No trainer available'),
        hint: L('Ansprechpartner fehlt oder wechselt ständig', 'contact person missing or constantly changing') },
    planDeviation: { group: 'training',
        label: L('Abweichung vom Ausbildungsplan', 'Deviation from the training plan'),
        hint: L('vorgesehene Abteilung oder Inhalte übersprungen', 'planned department or content skipped') },
    overchallenged: { group: 'training',
        label: L('Überforderung ohne Einweisung', 'Out of your depth without instruction'),
        hint: L('Aufgaben deutlich über dem Ausbildungsstand', 'tasks well beyond your current training level') },
    underchallenged: { group: 'training',
        label: L('Unterforderung', 'Under-challenged'),
        hint: L('dauerhaft nur einfachste Tätigkeiten', 'nothing but the simplest tasks, permanently') },
    documentation: { group: 'training', icon: CATEGORY_ICONS.documentation,
        label: L('Fehlende Dokumentation', 'Missing documentation'),
        hint: L('keine Unterlagen, keine Erklärung zum Ablauf', 'no documents, no explanation of the process') },
    reportBook: { group: 'training',
        label: L('Berichtsheft nicht abgezeichnet', 'Training record not signed off'),
        hint: L('Ausbilder prüft oder unterschreibt nicht', 'trainer does not check or sign') },

    // ── Arbeitszeit & Vergütung ──
    overtime: { group: 'time', icon: CATEGORY_ICONS.overtime,
        label: L('Überstunden / Arbeitszeitverstöße', 'Overtime / working-time violations'),
        hint: L('Mehrarbeit, zu lange Schichten', 'extra hours, shifts that run too long') },
    breaks: { group: 'time', icon: CATEGORY_ICONS.pause,
        label: L('Pause nicht gewährt', 'Break not granted'),
        hint: L('Pause gestrichen, verkürzt oder ständig gestört', 'break cancelled, cut short or constantly interrupted') },
    restPeriod: { group: 'time', icon: CATEGORY_ICONS.moon,
        label: L('Ruhezeit unterschritten', 'Rest period too short'),
        hint: L('weniger als elf Stunden zwischen zwei Schichten', 'less than eleven hours between two shifts') },
    youthProtection: { group: 'time',
        label: L('Jugendarbeitsschutz missachtet', 'Youth employment protection ignored'),
        hint: L('unter 18: Nacht-, Wochenend- oder Mehrarbeit', 'under 18: night, weekend or extra work') },
    vacation: { group: 'time',
        label: L('Urlaub verweigert oder gekürzt', 'Leave refused or cut'),
        hint: L('Antrag abgelehnt oder Urlaub zurückgenommen', 'request rejected or leave withdrawn') },
    pay: { group: 'time', icon: CATEGORY_ICONS.euro,
        label: L('Vergütung fehlerhaft', 'Pay incorrect'),
        hint: L('zu spät, zu wenig, Zuschläge fehlen', 'late, too little, supplements missing') },
    timeRecord: { group: 'time',
        label: L('Arbeitszeit falsch erfasst', 'Working time recorded incorrectly'),
        hint: L('Stunden gestrichen oder gar nicht eingetragen', 'hours removed or never entered') },
    sickLeave: { group: 'time',
        label: L('Krankmeldung als Problem behandelt', 'Sick leave treated as a problem'),
        hint: L('Druck trotz Attest, unangenehmes Rückkehrgespräch', 'pressure despite a doctor’s note, uncomfortable return interview') },

    // ── Umgang & Verhalten ──
    verbal: { group: 'conduct', icon: CATEGORY_ICONS.verbal,
        label: L('Verbale Belästigung / Anschreien', 'Verbal harassment / shouting'),
        hint: L('Beleidigung, Anschreien, Herabwürdigung', 'insults, shouting, being belittled') },
    mobbing: { group: 'conduct', icon: CATEGORY_ICONS.mobbing,
        label: L('Mobbing / Ausgrenzung', 'Bullying / exclusion'),
        hint: L('systematisch, wiederholt, oft durch mehrere', 'systematic, repeated, often by several people') },
    discrimination: { group: 'conduct', icon: CATEGORY_ICONS.discrimination,
        label: L('Diskriminierung', 'Discrimination'),
        hint: L('wegen Herkunft, Geschlecht, Religion, Behinderung, Alter, Identität', 'because of origin, gender, religion, disability, age, identity') },
    sexualHarassment: { group: 'conduct', icon: CATEGORY_ICONS.hand,
        label: L('Sexuelle Belästigung', 'Sexual harassment'),
        hint: L('Anzüglichkeiten, Berührungen, Bilder, Nachrichten', 'innuendo, touching, images, messages') },
    threat: { group: 'conduct',
        label: L('Drohung / Einschüchterung', 'Threat / intimidation'),
        hint: L('mit Kündigung, Nachteilen oder körperlich', 'with dismissal, disadvantages, or physically') },
    physical: { group: 'conduct', icon: CATEGORY_ICONS.hand,
        label: L('Körperlicher Übergriff', 'Physical assault'),
        hint: L('Festhalten, Schubsen, Werfen, Schlagen', 'grabbing, shoving, throwing, hitting') },
    blame: { group: 'conduct',
        label: L('Ungerechte Schuldzuweisung', 'Unfair blame'),
        hint: L('Fehler anderer werden dir zugeschrieben', 'other people’s mistakes attributed to you') },
    publicReprimand: { group: 'conduct',
        label: L('Zurechtweisung vor anderen', 'Reprimanded in front of others'),
        hint: L('Kritik vor Kunden, Kollegen oder der Abteilung', 'criticism in front of customers, colleagues or the department') },
    retaliation: { group: 'conduct',
        label: L('Nachteile nach einer Beschwerde', 'Disadvantages after a complaint'),
        hint: L('Reaktion darauf, dass du etwas angesprochen hast', 'a reaction to you having raised something') },

    // ── Sicherheit & Gesundheit ──
    safety: { group: 'health', icon: CATEGORY_ICONS.safety,
        label: L('Arbeitsschutz-Verstoß', 'Occupational-safety violation'),
        hint: L('Schutzausrüstung, ungesicherte Maschine, Gefahrstoff', 'protective equipment, unsecured machine, hazardous substance') },
    instructionMissing: { group: 'health',
        label: L('Sicherheitsunterweisung fehlt', 'Safety briefing missing'),
        hint: L('keine Einweisung vor einer gefährlichen Tätigkeit', 'no briefing before a dangerous task') },
    strain: { group: 'health',
        label: L('Körperliche Überlastung', 'Physical overload'),
        hint: L('schweres Heben, Dauerbelastung, keine Erholung', 'heavy lifting, constant strain, no recovery') },
    psych: { group: 'health', icon: CATEGORY_ICONS.heart,
        label: L('Psychische Belastung', 'Psychological strain'),
        hint: L('Dauerdruck, Schlafprobleme, Angst vor der Arbeit', 'constant pressure, trouble sleeping, dreading work') },
    accident: { group: 'health', icon: CATEGORY_ICONS.alert,
        label: L('Arbeitsunfall / Beinaheunfall', 'Accident / near miss'),
        hint: L('mit oder ohne Verletzung, auch wenn nichts passiert ist', 'with or without injury, including when nothing happened') },

    // ── Berufsschule & Prüfung ──
    schoolBlocked: { group: 'school', icon: CATEGORY_ICONS.graduation,
        label: L('Freistellung für die Berufsschule verweigert', 'Time off for vocational school refused'),
        hint: L('Berufsschultag, Blockunterricht oder Prüfung', 'school day, block teaching or an exam') },
    examPrep: { group: 'school',
        label: L('Prüfungsvorbereitung verhindert', 'Exam preparation prevented'),
        hint: L('keine Freistellung, kein Lernstoff, keine Zeit', 'no time off, no material, no time') },
    schoolPressure: { group: 'school',
        label: L('Druck wegen Schulnoten', 'Pressure over school grades'),
        hint: L('Drohungen oder Strafen wegen der Leistungen', 'threats or penalties over your results') },

    // ── Organisation & Formales ──
    contract: { group: 'formal',
        label: L('Ausbildungsvertrag nicht eingehalten', 'Training contract not honoured'),
        hint: L('Zusagen aus dem Vertrag werden nicht erfüllt', 'commitments from the contract are not met') },
    equipment: { group: 'formal',
        label: L('Arbeitsmittel fehlen', 'Work equipment missing'),
        hint: L('Werkzeug, Kleidung, Zugang oder Material', 'tools, clothing, access or material') },
    dataPrivacy: { group: 'formal', icon: CATEGORY_ICONS.lock,
        label: L('Datenschutz / Überwachung', 'Data protection / surveillance'),
        hint: L('Kontrolle, Kamera, Zugriff auf private Daten', 'monitoring, cameras, access to private data') },
    noResponse: { group: 'formal',
        label: L('Beschwerde ohne Reaktion', 'Complaint with no response'),
        hint: L('gemeldet, und danach ist nichts passiert', 'reported, and then nothing happened') },

    // ── Sonstiges ──
    positive: { group: 'misc', icon: CATEGORY_ICONS.positive,
        label: L('Positiver Fortschritt', 'Positive progress'),
        hint: L('etwas lief gut und soll festgehalten werden', 'something went well and is worth recording') },
    other: { group: 'misc', icon: CATEGORY_ICONS.other,
        label: L('Sonstiges', 'Other'),
        hint: L('passt in keine der Kategorien', 'does not fit any of the categories') },
};

// Eigene Kategorien des Nutzers: [{id, label, hint}]. Liegen verschluesselt
// im Tresor (siehe loadCustomCategories), nicht im Klartext daneben — ein
// selbst vergebener Name kann so verraeterisch sein wie der Eintrag selbst.
let customCategories = [];

function customCategoryMap() {
    const out = {};
    customCategories.forEach(c => {
        out[c.id] = { label: c.label, hint: c.hint || '', icon: CATEGORY_ICONS.tag, group: 'custom', custom: true };
    });
    return out;
}

// EINZIGER Lesezugriff auf eine Kategorie. Faellt auf „Sonstiges" zurueck,
// damit ein Eintrag mit unbekanntem Schluessel (geloeschte eigene Kategorie,
// Backup von einem anderen Stand) nie eine leere Karte rendert.
function getCategory(key) {
    return CATEGORIES[key] || customCategoryMap()[key] || CATEGORIES.other;
}

function categoryExists(key) {
    return !!(CATEGORIES[key] || customCategoryMap()[key]);
}

// Alle Kategorien in Anzeige-Reihenfolge: [{key, cat, group}]
function allCategoryEntries() {
    const custom = customCategoryMap();
    const all = Object.assign({}, CATEGORIES, custom);
    const out = [];
    CATEGORY_GROUP_ORDER.forEach(g => {
        Object.keys(all).forEach(k => {
            if ((all[k].group || 'misc') === g) out.push({ key: k, cat: all[k], group: g });
        });
    });
    return out;
}

// Symbol einer Kategorie — eigenes, sonst das der Gruppe.
function categoryIcon(cat) {
    return cat.icon || (CATEGORY_GROUPS[cat.group] || CATEGORY_GROUPS.misc).icon;
}

// Label fuer Protokoll und Textausgabe. Der `hint` ist hier per Konstruktion
// nicht dabei — er ist ein eigenes Feld und wird nie mitgeschrieben. Die
// Klammer-Entfernung greift fuer EIGENE Kategorien, in die ein Nutzer seine
// Fundhilfe selbst als „Name (Erklaerung)" tippt: im Waehler hilft das, im
// Beschwerdeprotokoll hat es nichts zu suchen.
function catExportLabel(cat) {
    const stripped = String(cat.label || '').replace(/\s*\([^()]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
    return stripped || String(cat.label || '');
}

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

// ═════════════════════════════════════════
//  ZEITBEZUG — Erfassung vs. Ereignis
// ═════════════════════════════════════════
//
//  Ein Eintrag traegt ZWEI Zeitstempel, und sie beantworten verschiedene
//  Fragen:
//
//    createdAt   Wann wurde der Eintrag angelegt? Automatisch, nicht
//                editierbar. Das ist der Wert, der eine Dokumentation
//                „zeitnah" macht — er belegt, dass hier nicht Monate
//                spaeter eine Erinnerung rekonstruiert wurde.
//    date/time   Wann ist der Vorfall passiert? Vom Nutzer eingetragen,
//                also frei rueckdatierbar — dafuer die Angabe, um die es
//                inhaltlich geht.
//
//  Welcher von beiden die Chronologie fuehrt (Kartentitel, Sortierung,
//  Zeitraum-Filter, Statistik, Export), entscheidet der Nutzer: als
//  Standard fuer den ganzen Tresor (`vaultMeta.timeBasis`) und, wo noetig,
//  abweichend fuer einen einzelnen Eintrag (`entry.timeBasis`).
//
//  `entry.timeBasis` wird NUR gesetzt, wenn es vom Tresor-Standard
//  abweicht. Wuerde bei jedem Speichern der gewaehlte Wert mitgeschrieben,
//  bliebe ein spaeteres Umschalten des Standards an allen alten Eintraegen
//  wirkungslos — sie klebten an dem Wert, der beim Speichern zufaellig
//  gerade Standard war.
//
//  Sichtbar sind IMMER beide, jeweils beschriftet. Ein nacktes Datum auf
//  einer Karte ist mehrdeutig, und genau das war der Ausgangspunkt: das
//  Formular fuellte „Datum" mit JETZT vor, verarbeitet wurde der Wert
//  ueberall als Vorfallszeitpunkt.

const TIME_BASIS_DEFAULT = 'created';

const TIME_BASIS = {
    created: {
        short: L('Erfasst', 'Recorded'),
        lead: L('Erfasst am', 'Recorded on'),
        long: L('Erfassungszeitpunkt', 'Time of recording'),
        hint: L('wann der Eintrag angelegt wurde', 'when the entry was created'),
    },
    occurred: {
        short: L('Passiert', 'Happened'),
        lead: L('Passiert am', 'Happened on'),
        long: L('Ereigniszeitpunkt', 'Time of the incident'),
        hint: L('wann der Vorfall stattfand', 'when the incident took place'),
    },
};

function isTimeBasis(v) { return v === 'created' || v === 'occurred'; }

// Standard des Tresors.
function getTimeBasis() {
    return (vaultMeta && isTimeBasis(vaultMeta.timeBasis)) ? vaultMeta.timeBasis : TIME_BASIS_DEFAULT;
}

// Effektiver Bezug eines Eintrags: eigene Abweichung, sonst der Standard.
function entryBasis(e) {
    return isTimeBasis(e && e.timeBasis) ? e.timeBasis : getTimeBasis();
}

// Vergleicht gegen den AKTUELLEN Standard, nicht gegen „Feld gesetzt?" —
// wird der Standard spaeter auf den abweichenden Wert umgestellt, ist der
// Eintrag keine Ausnahme mehr und soll auch nicht mehr so aussehen.
function entryBasisDiffers(e) {
    return entryEffectiveBasis(e) !== getTimeBasis();
}

// createdAt ist ein ISO-String in UTC. Fuer die Anzeige und fuer jeden
// Vergleich mit `date`/`time` (lokal notiert) zaehlen die LOKALEN
// Komponenten — `toISOString().slice(0,10)` laege in MESZ regelmaessig
// einen Tag daneben.
function isoLocalDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function isoLocalTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function basisDate(e, basis) {
    return basis === 'created' ? isoLocalDate(e.createdAt) : (e.date || '');
}

function basisTime(e, basis) {
    return basis === 'created' ? isoLocalTime(e.createdAt) : (e.time || '');
}

// Die Achse, die tatsaechlich einen Wert traegt. Zwei Faelle brauchen den
// Rueckfall: ein Eintrag darf ohne Vorfallsdatum gespeichert werden (wer nur
// „irgendwann letzte Woche" weiss, soll nicht raten muessen), und Eintraege
// aus v1-Sicherungen haben kein `createdAt`. Beschriftet wird immer die
// Achse, die dann wirklich angezeigt wird — sonst steht ein falscher Name
// ueber der Zahl.
function entryEffectiveBasis(e) {
    const want = entryBasis(e);
    if (basisDate(e, want)) return want;
    const other = want === 'created' ? 'occurred' : 'created';
    return basisDate(e, other) ? other : want;
}

function entryLeadDate(e) { return basisDate(e, entryEffectiveBasis(e)); }
function entryLeadTime(e) { return basisTime(e, entryEffectiveBasis(e)); }

function entryAltBasis(e) { return entryEffectiveBasis(e) === 'created' ? 'occurred' : 'created'; }
function entryAltDate(e) { return basisDate(e, entryAltBasis(e)); }
function entryAltTime(e) { return basisTime(e, entryAltBasis(e)); }

// Sortier- und Filterschluessel auf der fuehrenden Achse. Ohne Uhrzeit
// bleibt der Teil hinter dem T leer und sortiert damit an den Tagesanfang —
// dasselbe Verhalten wie vor dem Zeitbezug, als direkt auf `e.time`
// verglichen wurde.
function entrySortKey(e) { return entryLeadDate(e) + 'T' + entryLeadTime(e); }

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
    breaks: [
        { key: 'minutesLost', label: L('Ausgefallene Pause (Minuten)', 'Break time lost (minutes)'), type: 'number', placeholder: L('z.B. 30', 'e.g. 30') },
        { key: 'frequency', label: L('Häufigkeit', 'Frequency'), type: 'select', options: [
            ['once', L('Einmalig', 'One-off')], ['repeated', L('Wiederholt', 'Repeated')], ['ongoing', L('Dauerhaft', 'Ongoing')]
        ] },
    ],
    restPeriod: [
        { key: 'hoursBetween', label: L('Stunden zwischen den Schichten', 'Hours between the shifts'), type: 'number', placeholder: L('z.B. 9', 'e.g. 9') },
        { key: 'shiftEnd', label: L('Schichtende am Vortag', 'End of the previous shift'), type: 'text', placeholder: '22:00' },
    ],
    pay: [
        { key: 'payPeriod', label: L('Betroffener Abrechnungsmonat', 'Pay period affected'), type: 'text', placeholder: L('z.B. Juli 2026', 'e.g. July 2026') },
        { key: 'amount', label: L('Fehlbetrag (Euro, falls bekannt)', 'Amount missing (euro, if known)'), type: 'number' },
    ],
    schoolBlocked: [
        { key: 'schoolDate', label: L('Betroffener Schul- oder Prüfungstag', 'School or exam day affected'), type: 'date' },
        { key: 'refusedBy', label: L('Verweigert von', 'Refused by'), type: 'text' },
    ],
    accident: [
        { key: 'injury', label: L('Verletzung', 'Injury'), type: 'select', options: [
            ['none', L('Keine', 'None')], ['minor', L('Leicht', 'Minor')], ['treated', L('Ärztlich behandelt', 'Medically treated')]
        ] },
        { key: 'reportedTo', label: L('Gemeldet an', 'Reported to'), type: 'text' },
        { key: 'inLogbook', label: L('Im Verbandbuch eingetragen', 'Entered in the first-aid log'), type: 'select', options: [
            ['yes', L('Ja', 'Yes')], ['no', L('Nein', 'No')], ['unknown', L('Weiß ich nicht', 'Do not know')]
        ] },
    ],
};

// Kategorien ohne eigenen Satz bekommen diesen. Ort und Häufigkeit sind die
// zwei Angaben, nach denen bei einer Beschwerde als Erstes gefragt wird —
// „einmal" und „seit Monaten jede Woche" sind zwei verschiedene Sachverhalte.
const CATEGORY_FIELDS_DEFAULT = [
    { key: 'location', label: L('Ort', 'Location'), type: 'text', placeholder: L('z.B. Werkstatt, Büro …', 'e.g. workshop, office …') },
    { key: 'frequency', label: L('Häufigkeit', 'Frequency'), type: 'select', options: [
        ['once', L('Einmalig', 'One-off')], ['repeated', L('Wiederholt', 'Repeated')], ['ongoing', L('Dauerhaft', 'Ongoing')]
    ] },
];

function categoryFields(key) {
    return CATEGORY_FIELDS[key] || CATEGORY_FIELDS_DEFAULT;
}

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
    customCategories = [];
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

    await loadCustomCategories();
    await loadJournal();

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

    // Zeitbezug uebernehmen — aber nur, wenn hier noch gar keiner gesetzt
    // ist. Haben beide Geraete eine Wahl getroffen, gewinnt die des Geraets,
    // an dem man gerade sitzt: eine Anzeige-Konvention hin und her springen
    // zu lassen, waere fuer den Nutzer nicht nachvollziehbar, und es gibt
    // hier nichts zu verlieren wie bei Eintraegen.
    if (!isTimeBasis(vaultMeta.timeBasis) && isTimeBasis(cloud.timeBasis)) {
        vaultMeta.timeBasis = cloud.timeBasis;
        await vsPutMeta(vaultMeta);
        syncTimeBasisControls();
    }

    let cloudEntries;
    let cloudCategories = [];
    try {
        const kek = await deriveKey(password, b64ToU8(cloud.salt));
        const raw = await unwrapMasterKey(cloud.wrappedKey, kek);
        const cloudKey = await importMasterKey(raw);
        raw.fill(0);
        cloudEntries = JSON.parse(await decrypt(cloud.entries, cloudKey));
        // Eigene Kategorien der Gegenseite. Eigener try/catch: ein Stand von
        // vor dieser Version hat den Datensatz gar nicht, und daran darf das
        // Zusammenfuehren der Eintraege nicht scheitern.
        if (cloud.categories) {
            try {
                const parsed = JSON.parse(await decrypt(cloud.categories, cloudKey));
                if (Array.isArray(parsed)) cloudCategories = parsed.filter(c => c && c.id && c.label);
            } catch (e) { /* ohne eigene Kategorien weitermachen */ }
        }
    } catch (e) {
        showToast(L('Cloud-Stand konnte nicht gelesen werden — dein lokaler Stand bleibt unverändert',
                    'Could not read the cloud state — your local state is unchanged'), 'warning');
        return;
    }
    if (!Array.isArray(cloudEntries)) return;

    // Kategorien vereinigen statt ersetzen — dieselbe Regel wie bei den
    // Eintraegen. Bei gleicher ID gewinnt der lokale Name; ihn von der
    // Gegenseite umbenennen zu lassen waere fuer den Nutzer nicht erklaerbar.
    if (cloudCategories.length) {
        const known = new Set(customCategories.map(c => c.id));
        cloudCategories.forEach(c => { if (!known.has(c.id)) customCategories.push(c); });
    }

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
        timeBasis: vaultMeta.timeBasis || null,
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

// Standard-Zeitbezug umstellen. Bewusst mit `updatedAt`: der Wert liegt im
// Tresor-Kopf und reist damit ueber den Cloud-Spiegel zum zweiten Geraet —
// ohne frischen Zeitstempel bliebe die Umstellung dort liegen. Ein
// zusaetzlicher Abgleich kostet nur eine Entschluesselung, das
// Zusammenfuehren selbst ist verlustfrei.
async function setTimeBasis(basis) {
    if (!isTimeBasis(basis) || !vaultMeta) return;
    if (getTimeBasis() === basis) { syncTimeBasisControls(); return; }
    vaultMeta.timeBasis = basis;
    vaultMeta.updatedAt = new Date().toISOString();
    await vsPutMeta(vaultMeta);
    syncCloudMirror();
    syncTimeBasisControls();
    renderEntries();
    updateStats();
    // Wird im Export-Dialog umgeschaltet, zeigen Von/Bis noch Daten der alten
    // Achse — auf der neuen koennen sie den ganzen Bestand ausschliessen.
    // Neu herleiten ist ehrlicher als stehen zu lassen: die alten Zahlen
    // bedeuten nach dem Wechsel schlicht etwas anderes.
    const exportModal = document.getElementById('exportModal');
    if (exportModal && exportModal.classList.contains('active') && entries.length > 0) {
        const dates = entries.map(entryLeadDate).filter(Boolean).sort();
        document.getElementById('exportFrom').value = dates[0];
        document.getElementById('exportTo').value = dates[dates.length - 1];
    }
    showToast(L('Zeitachse: ' + TIME_BASIS[basis].long + ' (' + TIME_BASIS[basis].hint + ')',
                'Timeline: ' + TIME_BASIS[basis].long + ' (' + TIME_BASIS[basis].hint + ')'), 'info');
}

// ─── Eigene Kategorien ──────────────────────────────────
// Liegen verschluesselt neben den Eintraegen. Ein fehlender oder kaputter
// Datensatz darf das Entsperren nie verhindern — dann eben keine eigenen
// Kategorien, die Eintraege selbst sind das Wertvolle.
async function loadCustomCategories() {
    customCategories = [];
    try {
        const rec = await vsGetCategories();
        if (!rec) return;
        const parsed = JSON.parse(await decrypt(rec, derivedKey));
        if (Array.isArray(parsed)) customCategories = parsed.filter(c => c && c.id && c.label);
    } catch (e) {
        console.warn('[Tresor] Eigene Kategorien nicht lesbar:', e && e.name);
    }
}

async function saveCustomCategories() {
    if (!derivedKey) return;
    await vsPutCategories(await encrypt(JSON.stringify(customCategories), derivedKey));
}

// ─── Ereignis-Journal ───────────────────────────────────
// Die Kette (vault-journal.js) liegt verschluesselt neben den Eintraegen.
// Ein fehlendes Journal ist KEIN Fehler: Tresore aus der Zeit vor v5.9.0
// haben keins, und die Pruefung sagt das dann auch so. Ein KAPUTTES Journal
// darf das Entsperren ebenso wenig verhindern wie kaputte Kategorien — die
// Beweismittel sind das Wertvolle, die Kette ist die Zugabe.
let vaultJournal = [];

async function loadJournal() {
    vaultJournal = [];
    try {
        const rec = await vsGetJournal();
        if (!rec) return;
        const parsed = JSON.parse(await decrypt(rec, derivedKey));
        if (Array.isArray(parsed)) vaultJournal = parsed;
    } catch (e) {
        console.warn('[Tresor] Journal nicht lesbar:', e && e.name);
    }
}

async function saveJournal() {
    if (!derivedKey) return;
    await vsPutJournal(await encrypt(JSON.stringify(vaultJournal), derivedKey));
}

// Ereignis anhaengen, OHNE zu speichern — der Aufrufer haelt eine Rollback-
// Kopie und schreibt erst, wenn saveVault() durchgelaufen ist. Faellt das
// Journal aus (alter Browser ohne crypto.subtle), laeuft der Tresor normal
// weiter: eine fehlende Kette ist besser als ein verweigerter Eintrag.
async function journalRecord(action, entry) {
    if (!window.VaultJournal || !VaultJournal.available()) return;
    try {
        vaultJournal = await VaultJournal.append(vaultJournal, action, entry);
    } catch (e) {
        console.warn('[Tresor] Journal-Eintrag fehlgeschlagen:', e && e.name);
    }
}

async function saveVault() {
    if (!derivedKey || !vaultMeta) return;
    // Kein automatisches Kuerzen bei vollem Speicher (anders als das
    // Backup-Pattern in storage-save.js) — Beweismittel duerfen nie still
    // verloren gehen. Der Aufrufer faengt den Fehler und macht die zuletzt
    // hinzugefuegte Aenderung rueckgaengig.
    await vsPutEntries(await encrypt(JSON.stringify(entries), derivedKey));
    await saveCustomCategories();
    await saveJournal();
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
            timeBasis: vaultMeta.timeBasis || null,
            entries: null, categories: null, filesLocalOnly: true
        };
        // Die eigenen Kategorien muessen mitreisen: ohne sie stuenden auf dem
        // zweiten Geraet Eintraege, deren Kategorie es dort nicht gibt — sie
        // fielen ueber getCategory() still auf „Sonstiges" zurueck und die
        // Einordnung waere weg.
        Promise.all([vsGetEntries(), vsGetCategories()]).then(([rec, catRec]) => {
            if (!rec) return;
            mirror.entries = { iv: rec.iv, data: rec.data };
            if (catRec) mirror.categories = { iv: catRec.iv, data: catRec.data };
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
// Baut den Backup-Blob. Eigene Funktion, weil ihn zwei Wege brauchen —
// Download und Google-Drive-Sicherung. Zwei Kopien dieser Logik waeren die
// gefaehrlichste Sorte Doppelung: eine Sicherung, die je nach Weg etwas
// anderes enthaelt, faellt erst beim Wiederherstellen auf.
async function buildBackupBlob(onProgress) {
    const entriesRec = await vsGetEntries();
    // Ohne die eigenen Kategorien waere die Sicherung unvollstaendig: nach
    // dem Einspielen stuenden die betroffenen Vorfaelle unter „Sonstiges",
    // und die selbst gewaehlte Einordnung waere nicht wiederherstellbar.
    const catRec = await vsGetCategories();
    // Ohne das Journal waere die Sicherung zwar inhaltlich vollstaendig, aber
    // die Kette risse beim Einspielen ab — nach einer Wiederherstellung
    // stuende jeder Eintrag als „nicht protokolliert" da, und genau der
    // Nachweis, um den es geht, waere weg.
    const jrnRec = await vsGetJournal();
    const head = {
        format: 'mwl-schatten-backup',
        v: 3,
        exportedAt: new Date().toISOString(),
        caseId: vaultMeta.caseId,
        salt: vaultMeta.salt,
        pwHash: vaultMeta.pwHash,
        wrappedKey: vaultMeta.wrappedKey || null,
        timeBasis: vaultMeta.timeBasis || null,
        entries: entriesRec ? { iv: entriesRec.iv, data: entriesRec.data } : null,
        categories: catRec ? { iv: catRec.iv, data: catRec.data } : null,
        journal: jrnRec ? { iv: jrnRec.iv, data: jrnRec.data } : null
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
        if (onProgress) onProgress(i + 1, metas.length);
    }
    parts.push(']}');

    return { blob: new Blob(parts, { type: 'application/json;charset=utf-8' }), fileCount: metas.length };
}

function backupFileName() {
    return 'schatten-berichtsheft-backup_' + new Date().toISOString().slice(0, 10) + '.json';
}

async function exportBackup() {
    if (!vaultMeta) { showToast(L('Kein Tresor zum Exportieren vorhanden', 'No vault to export'), 'warning'); return; }
    showToast(L('Backup wird zusammengestellt …', 'Assembling backup …'), 'info');

    try {
        const built = await buildBackupBlob();
        const blob = built.blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backupFileName();
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

// Spielt ein bereits geparstes Backup ein. Getrennt von der Datei-Lesung,
// damit die Google-Drive-Wiederherstellung exakt denselben Weg nimmt — ein
// zweiter Import-Pfad waere ein zweiter Ort, an dem etwas schieflaufen kann.
async function applyBackupObject(parsed) {
    if (!isValidVaultShape(parsed)) {
        showToast(L('Datei hat nicht die Struktur eines Schatten-Berichtsheft-Backups', 'File does not have the structure of a shadow-report-book backup'), 'error');
        return false;
    }
    const replacing = !isFirstTime();
    const msg = replacing
        ? L('Dies ersetzt deinen AKTUELLEN Tresor unwiderruflich durch das importierte Backup. Falls nötig, exportiere vorher ein Backup des aktuellen Stands. Fortfahren?', 'This irreversibly replaces your CURRENT vault with the imported backup. If needed, export a backup of the current state first. Continue?')
        : L('Backup importieren und als deinen Tresor einrichten?', 'Import backup and set it up as your vault?');
    if (!window.confirm(msg)) return false;

    try {
        await vsClearAll();
        localStorage.removeItem(STORE_KEY);

        await vsPutMeta({
            v: parsed.wrappedKey ? 2 : 1,
            caseId: parsed.caseId || generateCaseId(),
            salt: parsed.salt,
            pwHash: parsed.pwHash,
            wrappedKey: parsed.wrappedKey || null,
            timeBasis: isTimeBasis(parsed.timeBasis) ? parsed.timeBasis : null,
            // v1-Backups tragen die Eintraege im Kopf; unlockVault() erkennt
            // das am fehlenden wrappedKey und migriert beim Entsperren.
            entries: parsed.wrappedKey ? undefined : parsed.entries
        });
        await vsPutEntries(parsed.entries);
        // Faellt bei Sicherungen aus der Zeit vor den eigenen Kategorien
        // schlicht weg — dann gibt es eben keine.
        if (parsed.categories && parsed.categories.iv && parsed.categories.data) {
            await vsPutCategories(parsed.categories);
        }
        // Ebenso bei Sicherungen aus der Zeit vor dem Journal (Format v2 und
        // aelter): dann gibt es keine Kette, und die Pruefung sagt das auch so,
        // statt einen Bruch zu behaupten, den es nie gab.
        if (parsed.journal && parsed.journal.iv && parsed.journal.data) {
            await vsPutJournal(parsed.journal);
        }

        for (const f of (parsed.files || [])) {
            const meta = { id: f.id, name: f.name, mime: f.mime, size: f.size, createdAt: f.createdAt, thumb: f.thumb || null };
            await vsPutFile(meta, vsB64ToBuf(f.data), b64ToU8(f.iv));
        }
    } catch (e) {
        showToast(L('Backup konnte nicht eingespielt werden', 'Could not import backup'), 'error');
        return false;
    }

    // Reload erzwingt das Entsperren mit dem Passwort des importierten Tresors —
    // das ist gleichzeitig der Validitaets-Check, kein stiller Fehlschlag moeglich.
    location.reload();
    return true;
}

// ═════════════════════════════════════════
//  GOOGLE DRIVE — Sicherung des ganzen Tresors
// ═════════════════════════════════════════
//
// Hochgeladen wird derselbe Blob wie beim Download — also der bereits
// verschluesselte Tresor. Google speichert einen unlesbaren Klumpen; das
// Passwort verlaesst dieses Geraet zu keinem Zeitpunkt.

let driveBusy = false;

function driveEl(id) { return document.getElementById(id); }

function driveSetStatus(text, tone) {
    const el = driveEl('driveStatusLine');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'drive-status' + (tone ? ' tone-' + tone : '');
    el.hidden = !text;
}

function driveSetProgress(done, total) {
    const wrap = driveEl('driveProgress');
    const bar = driveEl('driveProgressBar');
    const label = driveEl('driveProgressLabel');
    if (!wrap) return;
    if (done == null) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
    bar.style.width = pct + '%';
    // Echte Bytes, kein geschaetzter Balken: bei 300 MB ueber Mobilfunk ist
    // der Unterschied zwischen „laeuft noch" und „haengt" die einzige
    // Information, die zaehlt.
    label.textContent = total
        ? formatBytes(done) + ' / ' + formatBytes(total) + ' · ' + pct + '%'
        : L('Wird vorbereitet …', 'Preparing …');
}

function driveRelTime(iso) {
    if (!iso) return null;
    const then = new Date(iso).getTime();
    if (isNaN(then)) return null;
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return L('gerade eben', 'just now');
    if (mins < 60) return L('vor ' + mins + ' Min.', mins + ' min ago');
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return L('vor ' + hrs + ' Std.', hrs + ' h ago');
    const days = Math.round(hrs / 24);
    return L('vor ' + days + ' Tagen', days + ' days ago');
}

async function openDriveModal() {
    document.getElementById('vaultMenu').classList.remove('open');
    openModal('driveModal');
    driveSetProgress(null);
    driveSetStatus('');
    // Zustand beim OEFFNEN herstellen — sonst zeigt der Dialog beim zweiten
    // Aufruf noch das Ergebnis des ersten.
    const btn = driveEl('driveBackupBtn');
    if (btn) btn.disabled = false;
    driveBusy = false;
    driveRenderState();
}

function driveRenderState() {
    const D = window.SchattenDrive;
    const setup = driveEl('driveSetup');
    const connect = driveEl('driveConnect');
    const ready = driveEl('driveReady');
    if (!D || !setup) return;

    setup.hidden = D.isConfigured();
    connect.hidden = !D.isConfigured() || D.isConnected();
    ready.hidden = !D.isConnected();

    if (D.isConnected()) {
        const last = D.lastBackupAt();
        const rel = driveRelTime(last);
        const lastEl = driveEl('driveLastBackup');
        if (lastEl) {
            lastEl.textContent = rel
                ? L('Letzte Sicherung: ' + rel, 'Last backup: ' + rel)
                : L('Noch nichts gesichert', 'Nothing backed up yet');
            lastEl.classList.toggle('is-stale', !rel);
        }
        driveRefreshList();
    }
}

async function driveConnectClick() {
    const D = window.SchattenDrive;
    driveSetStatus(L('Google-Fenster geöffnet — bitte dort bestätigen.', 'Google window opened — please confirm there.'), 'info');
    try {
        await D.connect(true);
        driveSetStatus('');
        driveRenderState();
        showToast(L('Mit Google Drive verbunden', 'Connected to Google Drive'), 'success');
    } catch (e) {
        const msg = String(e && e.message || '');
        if (msg === 'gis-load-failed') {
            driveSetStatus(L('Google konnte nicht geladen werden. Blockiert ein Inhaltsblocker accounts.google.com?',
                             'Google could not be loaded. Is a content blocker blocking accounts.google.com?'), 'error');
        } else if (msg.indexOf('popup') >= 0) {
            driveSetStatus(L('Das Google-Fenster wurde blockiert oder geschlossen. Popups für diese Seite erlauben und erneut versuchen.',
                             'The Google window was blocked or closed. Allow pop-ups for this site and try again.'), 'error');
        } else {
            driveSetStatus(L('Verbindung nicht zustande gekommen: ' + msg, 'Connection failed: ' + msg), 'error');
        }
    }
}

async function driveBackupNow() {
    const D = window.SchattenDrive;
    if (driveBusy) return;
    if (!vaultMeta) { showToast(L('Kein Tresor vorhanden', 'No vault present'), 'warning'); return; }
    driveBusy = true;
    const btn = driveEl('driveBackupBtn');
    if (btn) btn.disabled = true;

    try {
        driveSetStatus(L('Tresor wird zusammengestellt …', 'Assembling vault …'), 'info');
        driveSetProgress(0, 0);
        const built = await buildBackupBlob();
        driveSetStatus(L('Wird hochgeladen — verschlüsselt, Google sieht nur Zufallsdaten.',
                         'Uploading — encrypted, Google only sees random data.'), 'info');
        const file = await D.uploadBlob(backupFileName(), built.blob, driveSetProgress);
        const now = new Date().toISOString();
        D.noteBackup(now);
        driveSetProgress(null);
        driveSetStatus(L('Gesichert: ' + built.fileCount + ' Dateien, ' + formatBytes(built.blob.size) + '.',
                         'Backed up: ' + built.fileCount + ' files, ' + formatBytes(built.blob.size) + '.'), 'success');
        showToast(L('In Google Drive gesichert', 'Backed up to Google Drive'), 'success');
        driveRenderState();
        return file;
    } catch (e) {
        driveSetProgress(null);
        const msg = String(e && e.message || '');
        driveSetStatus(L('Sicherung fehlgeschlagen (' + msg + '). Der Tresor auf diesem Gerät ist unverändert.',
                         'Backup failed (' + msg + '). The vault on this device is unchanged.'), 'error');
        showToast(L('Sicherung fehlgeschlagen', 'Backup failed'), 'error');
    } finally {
        driveBusy = false;
        if (btn) btn.disabled = false;
    }
}

async function driveRefreshList() {
    const D = window.SchattenDrive;
    const list = driveEl('driveList');
    if (!list) return;
    list.innerHTML = '<p class="drive-empty">' + L('Wird geladen …', 'Loading …') + '</p>';
    try {
        const files = await D.listBackups();
        if (!files.length) {
            list.innerHTML = '<p class="drive-empty">' +
                L('Noch keine Sicherung in Drive. „Jetzt alles sichern" legt die erste an.',
                  'No backup in Drive yet. "Back up everything now" creates the first one.') + '</p>';
            return;
        }
        list.innerHTML = files.map(function (f) {
            const when = new Date(f.createdTime);
            const whenTxt = isNaN(when.getTime()) ? f.name : when.toLocaleString(mwlLocale(), {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            return '<div class="drive-item">' +
                '<div class="drive-item-main">' +
                    '<span class="drive-item-when">' + escapeHtml(whenTxt) + '</span>' +
                    '<span class="drive-item-size">' + (f.size ? formatBytes(+f.size) : '—') + '</span>' +
                '</div>' +
                '<div class="drive-item-actions">' +
                    '<button type="button" class="btn btn-sm" onclick="driveRestoreFrom(\'' + escapeHtml(f.id) + '\')">' +
                        L('Wiederherstellen', 'Restore') + '</button>' +
                    '<button type="button" class="btn btn-sm btn-icon drive-del" title="' + L('Löschen', 'Delete') + '" ' +
                        'onclick="driveDeleteFrom(\'' + escapeHtml(f.id) + '\', \'' + escapeHtml(whenTxt) + '\')">' +
                        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    } catch (e) {
        list.innerHTML = '<p class="drive-empty">' +
            L('Liste konnte nicht geladen werden.', 'Could not load the list.') + '</p>';
    }
}

async function driveRestoreFrom(fileId) {
    const D = window.SchattenDrive;
    driveSetStatus(L('Wird geladen …', 'Downloading …'), 'info');
    try {
        const text = await D.downloadBackup(fileId);
        let parsed;
        try { parsed = JSON.parse(text); }
        catch (e) {
            driveSetStatus(L('Die Datei in Drive ist kein lesbares Backup.', 'The file in Drive is not a readable backup.'), 'error');
            return;
        }
        driveSetStatus('');
        // Geht durch denselben Import-Weg wie eine lokale Datei — inklusive
        // der Rueckfrage und des Neuladens zum Entsperren.
        await applyBackupObject(parsed);
    } catch (e) {
        driveSetStatus(L('Wiederherstellen fehlgeschlagen.', 'Restore failed.'), 'error');
    }
}

async function driveDeleteFrom(fileId, label) {
    const D = window.SchattenDrive;
    if (!window.confirm(L('Sicherung vom ' + label + ' endgültig aus Google Drive löschen?',
                          'Permanently delete the backup from ' + label + ' in Google Drive?'))) return;
    try {
        await D.deleteBackup(fileId);
        showToast(L('Sicherung gelöscht', 'Backup deleted'), 'success');
        driveRefreshList();
    } catch (e) {
        showToast(L('Löschen fehlgeschlagen', 'Delete failed'), 'error');
    }
}

async function driveDisconnectClick() {
    const D = window.SchattenDrive;
    await D.disconnect();
    driveSetStatus(L('Verbindung getrennt. Bereits gesicherte Dateien bleiben in deinem Drive liegen.',
                     'Disconnected. Files already backed up remain in your Drive.'), 'info');
    driveRenderState();
}

function driveSaveClientId() {
    const input = driveEl('driveClientIdInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) { showToast(L('Bitte eine Client-ID eintragen', 'Please enter a client ID'), 'warning'); return; }
    if (!/\.apps\.googleusercontent\.com$/.test(val)) {
        showToast(L('Das sieht nicht nach einer Google-Client-ID aus (endet auf .apps.googleusercontent.com)',
                    'That does not look like a Google client ID (ends with .apps.googleusercontent.com)'), 'warning');
        return;
    }
    window.SchattenDrive.setClientId(val);
    showToast(L('Client-ID gespeichert', 'Client ID saved'), 'success');
    driveRenderState();
}

function importBackupFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
        let parsed;
        try { parsed = JSON.parse(reader.result); } catch (e) {
            showToast(L('Datei ist kein gültiges Backup (kein JSON)', 'File is not a valid backup (not JSON)'), 'error');
            return;
        }
        await applyBackupObject(parsed);
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
    customCategories = [];
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
    syncTimeBasisControls();
    renderEntries();
    updateStats();
    // Erst nach dem Entsperren: vorher sind die eigenen Kategorien noch
    // verschluesselt und wuerden in beiden Listen fehlen.
    installCategoryValueMirror();
    populateCategorySelects();
    updateCloudSyncUI();
}

function lockApp() {
    derivedKey = null;
    entries = [];
    // Die eigenen Kategorien sind Tresor-Inhalt und duerfen nach dem
    // Sperren nicht im Speicher stehen bleiben.
    customCategories = [];
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
    if (willOpen) { renderStorageMeter(); updateDriveMenuState(); }
}

// Der Zustand im Menue beantwortet die Frage, die man vor dem Oeffnen hat:
// „Ist da was gesichert, und wie alt?" — nicht bloss „verbunden ja/nein".
// Ein Token ueberlebt das Neuladen ohnehin nicht, „verbunden" waere also
// eine wenig aussagekraeftige Anzeige.
function updateDriveMenuState() {
    const el = document.getElementById('driveMenuState');
    const D = window.SchattenDrive;
    if (!el || !D) return;
    if (!D.isConfigured()) { el.textContent = L('Aus', 'Off'); el.classList.remove('is-on'); return; }
    const rel = driveRelTime(D.lastBackupAt());
    el.textContent = rel || L('Nie', 'Never');
    el.classList.toggle('is-on', !!rel);
}

// ═════════════════════════════════════════
//  CHRONIK-PRUEFUNG (Hash-Kette)
// ═════════════════════════════════════════

let journalLastHead = '';

async function openJournalModal() {
    const menu = document.getElementById('vaultMenu');
    if (menu) menu.classList.remove('open');
    openModal('journalModal');
    const box = document.getElementById('journalResult');
    if (!box) return;
    box.innerHTML = '<p class="viewer-status">' + L('Wird geprüft …', 'Checking …') + '</p>';
    journalLastHead = '';

    if (!window.VaultJournal || !VaultJournal.available()) {
        box.innerHTML = journalVerdict('empty',
            L('Prüfung nicht verfügbar', 'Check not available'),
            L('Dieser Browser stellt die nötigen Krypto-Funktionen nicht bereit.',
              'This browser does not provide the required crypto functions.'));
        return;
    }

    let res;
    try {
        res = await VaultJournal.verify(vaultJournal, entries);
    } catch (e) {
        box.innerHTML = journalVerdict('broken', L('Prüfung fehlgeschlagen', 'Check failed'),
            L('Die Kette liess sich nicht lesen.', 'The chain could not be read.'));
        return;
    }
    journalLastHead = res.head || '';
    box.innerHTML = journalRender(res);
    updateJournalMenuState(res);
}

function journalVerdict(tone, lead, body) {
    const icons = {
        ok:     '<path d="M9 12l2 2 4-4"></path><circle cx="12" cy="12" r="9"></circle>',
        broken: '<path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>',
        empty:  '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path>'
    };
    return '<div class="journal-verdict is-' + tone + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (icons[tone] || icons.empty) + '</svg>' +
        '<div><p class="journal-verdict-lead">' + lead + '</p>' +
        '<p class="journal-verdict-body">' + body + '</p></div></div>';
}

// Der Befund wird ausgesprochen, nicht bepunktet. Reihenfolge nach Schwere:
// ein Kettenbruch macht jede weitere Aussage hinfaellig und steht deshalb
// allein da.
function journalRender(res) {
    if (!res.total) {
        return journalVerdict('empty', L('Noch keine Chronik', 'No chain yet'),
            L('Sobald du den ersten Eintrag anlegst, beginnt die Kette. Für Einträge, die es vorher schon gab, lässt sie sich nicht rückwirkend bilden — das wäre genau die nachträgliche Konstruktion, gegen die sie hilft.',
              'The chain starts with your first entry. It cannot be built retroactively for entries that already existed — that would be exactly the after-the-fact construction it guards against.'));
    }

    if (res.chainBreak) {
        return journalVerdict('broken', L('Die Kette ist unterbrochen', 'The chain is broken'),
            L('Ab Ereignis ' + res.chainBreak.at + ' passt die Verkettung nicht mehr. Das heisst: am Protokoll selbst wurde etwas verändert. Ein Backup von vor diesem Zeitpunkt ist der einzige Weg zurück.',
              'From event ' + res.chainBreak.at + ' onward the chain no longer matches. Something was altered in the log itself. A backup from before that point is the only way back.'));
    }

    const findings = [];
    if (res.changed.length) {
        findings.push(['hard', L(
            res.changed.length + ' Eintrag' + (res.changed.length > 1 ? 'e wurden' : ' wurde') + ' verändert, ohne dass es protokolliert ist.',
            res.changed.length + ' entr' + (res.changed.length > 1 ? 'ies were' : 'y was') + ' changed without being logged.')]);
    }
    if (res.vanished.length) {
        findings.push(['hard', L(
            res.vanished.length + ' protokollierte' + (res.vanished.length > 1 ? ' Einträge sind' : 'r Eintrag ist') + ' verschwunden, ohne gelöscht worden zu sein.',
            res.vanished.length + ' logged entr' + (res.vanished.length > 1 ? 'ies have' : 'y has') + ' vanished without being deleted.')]);
    }
    if (res.unlogged.length) {
        findings.push(['soft', L(
            res.unlogged.length + ' Eintrag' + (res.unlogged.length > 1 ? 'e stehen' : ' steht') + ' ohne Protokoll da. Normal nach dem Einspielen eines Backups oder bei Einträgen aus der Zeit vor der Chronik.',
            res.unlogged.length + ' entr' + (res.unlogged.length > 1 ? 'ies have' : 'y has') + ' no log record. Normal after importing a backup, or for entries predating the chain.')]);
    }

    const head = '<div class="journal-head-box">' +
        '<span class="journal-head-label">' + L('Kettenkopf', 'Chain head') + '</span>' +
        '<span class="journal-head-value">' + escapeHtml(res.headShort) + '</span></div>';

    if (!findings.length) {
        return journalVerdict('ok', L('Kette vollständig', 'Chain complete'),
            L(res.total + ' Ereignisse lückenlos verkettet — jeder Eintrag steht so da, wie er protokolliert wurde.',
              res.total + ' events chained without a gap — every entry matches its log record.')) + head;
    }

    const list = '<ul class="journal-findings">' + findings.map(function (f) {
        return '<li class="journal-finding"><span class="journal-mark is-' + f[0] + '"></span><span>' + f[1] + '</span></li>';
    }).join('') + '</ul>';

    const hard = findings.some(function (f) { return f[0] === 'hard'; });
    return journalVerdict(hard ? 'broken' : 'empty',
        hard ? L('Abweichungen gefunden', 'Discrepancies found') : L('Kette intakt, mit Anmerkungen', 'Chain intact, with notes'),
        hard ? L('Die Verkettung selbst ist unversehrt, aber der aktuelle Bestand passt nicht überall dazu.',
                 'The chain itself is unharmed, but the current contents do not match it everywhere.')
             : L('Die Verkettung ist unversehrt. Die Anmerkungen unten haben in aller Regel eine harmlose Erklärung.',
                 'The chain is unharmed. The notes below usually have a harmless explanation.')) + head + list;
}

function updateJournalMenuState(res) {
    const el = document.getElementById('journalMenuState');
    if (!el) return;
    if (!res) { el.textContent = vaultJournal.length ? String(vaultJournal.length) : '—'; return; }
    el.textContent = res.ok ? L('Intakt', 'Intact') : (res.chainBreak ? L('Bruch', 'Broken') : L('Prüfen', 'Check'));
    el.classList.toggle('is-on', !!res.ok);
}

async function copyJournalHead() {
    if (!journalLastHead) {
        showToast(L('Noch kein Kettenkopf vorhanden', 'No chain head yet'), 'error');
        return;
    }
    // Mit Fall-Nummer und Datum: der Kopf allein sagt einem Dritten nichts,
    // und genau als Beleg gegenueber Dritten ist er gedacht.
    const text = L('MyWorkLog Schatten-Berichtsheft — Kettenkopf\nFall: ', 'MyWorkLog shadow report book — chain head\nCase: ') +
        (getCaseId() || '—') + '\n' +
        L('Stand: ', 'As of: ') + new Date().toLocaleString(mwlLocale()) + '\n' +
        L('Ereignisse: ', 'Events: ') + vaultJournal.length + '\n' +
        journalLastHead;
    try {
        await navigator.clipboard.writeText(text);
        showToast(L('Kettenkopf kopiert — schick ihn dir selbst oder zeig ihn jemandem',
                    'Chain head copied — send it to yourself or show it to someone'), 'success');
    } catch (e) {
        showToast(L('Kopieren nicht möglich', 'Could not copy'), 'error');
    }
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

// Die feine Typ-Erkennung liegt in file-preview.js. Hier bleibt nur die
// grobe Einordnung fuer die Kachel-Symbole — die kennt weiter genau die
// fuenf ATT_ICONS-Schluessel, damit alle bestehenden Aufrufer unveraendert
// funktionieren.
function fileKind(mime, name) {
    if (window.SchattenPreview) {
        return window.SchattenPreview.iconKey(window.SchattenPreview.detectKind(mime, name));
    }
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
    if (!viewerObjectUrl) return;
    // Verzoegert freigeben statt sofort: wer die Datei per „In neuem Tab
    // oeffnen" startet und den Betrachter gleich danach schliesst, haette
    // sonst einen Tab, der ins Leere laedt. Der Speicher wird trotzdem
    // freigegeben, nur eine Minute spaeter.
    const url = viewerObjectUrl;
    viewerObjectUrl = null;
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
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
    // Zustand beim OEFFNEN herstellen, nicht nur im Fehlerfall aufraeumen —
    // sonst behaelt der Rahmen die Dokument-Ausrichtung der vorigen Datei.
    body.classList.remove('viewer-body-doc');
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

    const kind = window.SchattenPreview
        ? window.SchattenPreview.detectKind(meta.mime, meta.name)
        : fileKind(meta.mime, meta.name);

    if (kind === 'image') {
        body.innerHTML = '<img src="' + viewerObjectUrl + '" alt="' + escapeHtml(meta.name) + '" class="viewer-image">';
        return;
    }
    if (kind === 'pdf') {
        body.innerHTML = pdfBlock(meta);
        return;
    }
    if (kind === 'audio') {
        body.innerHTML = '<audio controls src="' + viewerObjectUrl + '" class="viewer-media"></audio>';
        return;
    }
    if (kind === 'video') {
        body.innerHTML = '<video controls src="' + viewerObjectUrl + '" class="viewer-media"></video>';
        return;
    }

    // Ab hier sind es Dokument-Ansichten: der Viewer-Rahmen zentriert nicht
    // mehr mittig, sondern laesst den Inhalt oben beginnen und fliessen.
    body.innerHTML = '<p class="viewer-status">' + L('Wird gelesen …', 'Reading …') + '</p>';
    try {
        const html = await renderTextualPreview(kind, meta, blob);
        body.classList.add('viewer-body-doc');
        body.innerHTML = html;
    } catch (e) {
        body.classList.remove('viewer-body-doc');
        body.innerHTML = noPreviewBlock(meta, L('Die Datei liess sich nicht lesen. Sie liegt unverändert im Tresor.',
                                                'The file could not be read. It is stored unchanged in the vault.'));
    }
}

// Jede abgeleitete Ansicht sagt, WORAUS sie stammt. In einem Beweismittel-
// Archiv ist der Unterschied zwischen „so sieht das Dokument aus" und „das
// steht als Text darin" entscheidend — ein Textauszug enthaelt weder
// Briefkopf noch Unterschrift noch Seitenumbrueche.
function originNote(text) {
    return '<p class="viewer-origin">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>' +
        '<span>' + text + '</span></p>';
}

// Ein Knopf, der die Datei dem Betriebssystem uebergibt. Auf Geraeten ohne
// eingebetteten PDF-Betrachter ist das der einzige Weg, das Dokument
// ueberhaupt zu sehen — er darf deshalb nie fehlen.
function openInTabButton() {
    return '<a class="viewer-open-tab" href="' + viewerObjectUrl + '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>' +
        '<span>' + L('In neuem Tab öffnen', 'Open in new tab') + '</span></a>';
}

// Mobile Browser (Android Chrome, iOS Safari) haben keinen eingebetteten
// PDF-Betrachter. <object> laedt die Datei dort zwar erfolgreich, kann sie
// aber nicht zeichnen — und weil das LADEN geklappt hat, greift der innere
// Fallback des <object> genau dann NICHT. Sichtbar bleibt ein leeres graues
// Rechteck, das von einem Absturz nicht zu unterscheiden ist. Gemessen:
// fallbackRendered = 0px. navigator.pdfViewerEnabled sagt uns das vorher,
// und der Ausweg steht auch dort, wo die Einbettung klappt (aeltere Browser
// kennen das Flag nicht und melden undefined).
function pdfBlock(meta) {
    if (navigator.pdfViewerEnabled === false) {
        return '<div class="viewer-file">' +
            '<span class="viewer-file-ico">' + ATT_ICONS.pdf + '</span>' +
            '<p class="viewer-status">' + escapeHtml(meta.name) + ' · ' + formatBytes(meta.size) + '</p>' +
            '<p class="viewer-status">' + L(
                'Dieser Browser kann PDFs nicht direkt anzeigen. Öffne die Datei in einem neuen Tab — dort übernimmt der PDF-Betrachter des Geräts.',
                'This browser cannot display PDFs inline. Open the file in a new tab, where the device’s PDF viewer takes over.') + '</p>' +
            openInTabButton() +
        '</div>';
    }
    // Eigener Wrapper: .viewer-body ist eine zentrierte Flex-Zeile, zwei
    // Geschwister landeten dort nebeneinander statt untereinander.
    return '<div class="viewer-pdf-wrap">' +
        '<object data="' + viewerObjectUrl + '" type="application/pdf" class="viewer-pdf"></object>' +
        openInTabButton() +
    '</div>';
}

function noPreviewBlock(meta, reason) {
    return '<div class="viewer-file">' +
        '<span class="viewer-file-ico">' + ATT_ICONS.generic + '</span>' +
        '<p class="viewer-status">' + escapeHtml(meta.name) + ' · ' + formatBytes(meta.size) + '</p>' +
        '<p class="viewer-status">' + reason + '</p>' +
    '</div>';
}

function textBlock(text, truncated, totalBytes) {
    let html = '<pre class="viewer-text">' + escapeHtml(text) + '</pre>';
    if (truncated) {
        html += '<p class="viewer-status">' + L(
            'Gekürzt angezeigt — die vollständige Datei (' + formatBytes(totalBytes) + ') bekommst du über „Herunterladen".',
            'Shown shortened — get the complete file (' + formatBytes(totalBytes) + ') via "Download".') + '</p>';
    }
    return html;
}

function tableBlock(rows, note) {
    if (!rows.length) return '<p class="viewer-status">' + L('Die Tabelle ist leer.', 'The table is empty.') + '</p>';
    const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const head = rows[0];
    const bodyRows = rows.slice(1);
    const cells = (arr, tag) => {
        let out = '';
        for (let i = 0; i < width; i++) out += '<' + tag + '>' + escapeHtml(arr[i] == null ? '' : arr[i]) + '</' + tag + '>';
        return out;
    };
    return '<div class="viewer-sheet-wrap"><table class="viewer-sheet">' +
        '<thead><tr>' + cells(head, 'th') + '</tr></thead>' +
        '<tbody>' + bodyRows.map(r => '<tr>' + cells(r, 'td') + '</tr>').join('') + '</tbody>' +
        '</table></div>' + (note || '');
}

async function renderTextualPreview(kind, meta, blob) {
    const P = window.SchattenPreview;
    if (!P) return noPreviewBlock(meta, L('Vorschau nicht verfügbar.', 'Preview not available.'));

    if (kind === 'undecodable') {
        const ext = P.extOf(meta.name).toUpperCase();
        return noPreviewBlock(meta, L(
            'Browser können ' + ext + ' nicht darstellen. Die Datei liegt unverändert im Tresor — lade sie herunter und öffne sie mit einem passenden Programm.',
            'Browsers cannot display ' + ext + '. The file is stored unchanged in the vault — download it and open it with a suitable program.'));
    }
    if (kind === 'legacy-office') {
        const ext = P.extOf(meta.name).toUpperCase();
        return noPreviewBlock(meta, L(
            ext + ' ist ein altes Binärformat, das sich im Browser nicht auslesen lässt. Öffne die Datei nach dem Herunterladen — oder speichere sie einmal als DOCX/XLSX, dann zeigt die Vorschau den Text.',
            ext + ' is a legacy binary format that cannot be read in the browser. Open the file after downloading — or save it once as DOCX/XLSX and the preview will show its text.'));
    }

    const buffer = await blob.arrayBuffer();

    if (kind === 'office') {
        const ext = P.extOf(meta.name);
        const res = await P.extractOffice(buffer, ext);
        if (res.error === 'nodecompress') {
            return noPreviewBlock(meta, L('Dieser Browser kann die Datei nicht entpacken (DecompressionStream fehlt).',
                                          'This browser cannot unpack the file (DecompressionStream missing).'));
        }
        if (res.error) {
            return noPreviewBlock(meta, L('Der Inhalt liess sich nicht auslesen. Die Datei liegt unverändert im Tresor.',
                                          'The content could not be read. The file is stored unchanged in the vault.'));
        }
        const family = P.officeFamily(ext);
        const labels = {
            'word': L('Word-Dokument', 'Word document'),
            'sheet': L('Excel-Tabelle', 'Excel spreadsheet'),
            'slides': L('PowerPoint-Präsentation', 'PowerPoint presentation'),
            'odf-text': L('OpenDocument-Text', 'OpenDocument text'),
            'odf-sheet': L('OpenDocument-Tabelle', 'OpenDocument spreadsheet'),
            'odf-slides': L('OpenDocument-Präsentation', 'OpenDocument presentation'),
        };
        // Label voranstellen statt einbauen: „aus einer Word-Dokument-Datei"
        // waere doppelt gemoppelt, und ein Artikel im Satz muesste sich je
        // nach Geschlecht des Labels aendern (einem Dokument / einer Tabelle).
        const note = originNote(L(
            (labels[family] || ext.toUpperCase()) + ' — Textauszug. Layout, Kopfzeilen, Bilder und Unterschriften fehlen; als Beweis zählt die Originaldatei.',
            (labels[family] || ext.toUpperCase()) + ' — text extract. Layout, headers, images and signatures are missing; the original file is what counts as evidence.'));
        if (res.type === 'table') {
            const capped = res.rows.length >= P.limits.tableRows
                ? '<p class="viewer-status">' + L('Erste ' + P.limits.tableRows + ' Zeilen.', 'First ' + P.limits.tableRows + ' rows.') + '</p>'
                : '';
            return note + tableBlock(res.rows, capped);
        }
        return note + textBlock(res.lines.join('\n'), false, meta.size);
    }

    const dec = P.decodeText(buffer);

    if (kind === 'table') {
        const delim = P.sniffDelimiter(dec.text);
        const rows = P.parseDelimited(dec.text, delim);
        const names = { ';': L('Semikolon', 'semicolon'), ',': L('Komma', 'comma'), '\t': L('Tabulator', 'tab'), '|': L('Strich', 'pipe') };
        const note = originNote(L(
            'Als Tabelle gelesen, Trennzeichen: ' + (names[delim] || delim) + ' · Zeichensatz: ' + dec.encoding,
            'Read as a table, delimiter: ' + (names[delim] || delim) + ' · character set: ' + dec.encoding));
        const capped = (dec.truncated || rows.length >= P.limits.tableRows)
            ? '<p class="viewer-status">' + L('Erste ' + rows.length + ' Zeilen — vollständig über „Herunterladen".',
                                              'First ' + rows.length + ' rows — complete file via "Download".') + '</p>'
            : '';
        return note + tableBlock(rows, capped);
    }

    if (kind === 'mail') {
        const mail = P.parseEml(dec.text);
        const head = mail.meta.map(pair =>
            '<div class="viewer-mail-row"><span class="viewer-mail-key">' + escapeHtml(pair[0]) + '</span>' +
            '<span class="viewer-mail-val">' + escapeHtml(pair[1]) + '</span></div>').join('');
        const note = originNote(L(
            'Kopfzeilen und Textteil einer E-Mail-Datei. Angehängte Dateien und HTML-Formatierung sind nicht dargestellt.',
            'Headers and text part of an email file. Attachments and HTML formatting are not shown.'));
        return note +
            (head ? '<div class="viewer-mail-head">' + head + '</div>' : '') +
            textBlock(mail.body || L('(kein Textteil gefunden)', '(no text part found)'), dec.truncated, dec.totalBytes);
    }

    if (kind === 'json') {
        const pretty = P.prettyJson(dec.text);
        const note = pretty
            ? originNote(L('JSON, zur Lesbarkeit eingerückt.', 'JSON, indented for readability.'))
            : originNote(L('Kein gültiges JSON — als reiner Text angezeigt.', 'Not valid JSON — shown as plain text.'));
        return note + textBlock(pretty || dec.text, dec.truncated, dec.totalBytes);
    }

    if (kind === 'html') {
        return originNote(L(
            'Nur der Text der HTML-Datei. Sie wird bewusst nicht dargestellt, damit aus dem Tresor heraus nichts nachgeladen wird.',
            'Only the text of the HTML file. It is deliberately not rendered so that nothing is loaded from within the vault.')) +
            textBlock(P.stripHtml(dec.text), dec.truncated, dec.totalBytes);
    }

    if (kind === 'rtf') {
        return originNote(L('Textauszug aus einer RTF-Datei — ohne Formatierung.',
                            'Text extracted from an RTF file — without formatting.')) +
            textBlock(P.stripRtf(dec.text), dec.truncated, dec.totalBytes);
    }

    if (kind === 'ical' || kind === 'xml' || kind === 'text') {
        const note = dec.encoding === 'UTF-8' ? '' : originNote(L(
            'Gelesen als ' + dec.encoding + ' — die Datei ist nicht UTF-8 kodiert.',
            'Read as ' + dec.encoding + ' — the file is not UTF-8 encoded.'));
        return note + textBlock(dec.text, dec.truncated, dec.totalBytes);
    }

    // Letzte Stufe: Name und MIME-Typ haben nichts hergegeben, also entscheidet
    // der Inhalt. Eine Datei ohne Endung ("Abmahnung", "protokoll") ist sehr
    // oft schlicht Text — die vorschnelle Absage war der haeufigste Grund
    // dafuer, dass eine Datei sich nicht ansehen liess.
    if (P.looksTextual(buffer)) {
        return originNote(L(
            'Kein bekannter Dateityp — der Inhalt ist lesbarer Text und wird als solcher gezeigt' +
                (dec.encoding === 'UTF-8' ? '.' : ', gelesen als ' + dec.encoding + '.'),
            'Unknown file type — the content is readable text and is shown as such' +
                (dec.encoding === 'UTF-8' ? '.' : ', read as ' + dec.encoding + '.'))) +
            textBlock(dec.text, dec.truncated, dec.totalBytes);
    }

    return noPreviewBlock(meta, L('Für diesen Dateityp gibt es keine Vorschau — die Datei liegt unverändert im Tresor.',
                                  'There is no preview for this file type — the file is stored unchanged in the vault.'));
}

function closeAttachmentViewer() {
    closeModal('attachmentViewerModal');
    const body = document.getElementById('attachmentViewerBody');
    if (body) { body.innerHTML = ''; body.classList.remove('viewer-body-doc'); }   // stoppt laufende Medien und loest den Blob
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
    const fields = categoryFields(category);
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
    const fields = categoryFields(category);
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
    const fields = categoryFields(category);
    const details = {};
    fields.forEach(f => {
        const el = document.getElementById('catfield_' + f.key);
        if (el && el.value) details[f.key] = el.value;
    });
    return details;
}

// ─── Zeitbezug in der Oberflaeche ───────────────────────
// Der Standard steht an zwei Stellen zur Wahl (Werkzeugleiste und
// Export-Dialog) und markiert im Eintrags-Formular, welche der beiden Karten
// die Vorgabe ist. Eine Funktion haelt alle drei am selben Wert — sonst
// zeigt der Export-Dialog noch die alte Auswahl, wenn man sie in der
// Werkzeugleiste geaendert hat.
function syncTimeBasisControls() {
    const basis = getTimeBasis();
    document.querySelectorAll('[data-basis-group]').forEach(group => {
        group.querySelectorAll('[data-basis]').forEach(btn => {
            const on = btn.getAttribute('data-basis') === basis;
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-checked', on ? 'true' : 'false');
        });
    });
    document.querySelectorAll('[data-basis-std]').forEach(chip => {
        chip.hidden = chip.getAttribute('data-basis-std') !== basis;
    });
    const note = document.getElementById('exportBasisNote');
    if (note) note.textContent = TIME_BASIS[basis].long + ' — ' + TIME_BASIS[basis].hint + '.';
    updateEntryBasisHelp();
}

function getFormBasis() {
    const picked = document.querySelector('input[name="entryBasis"]:checked');
    return picked && isTimeBasis(picked.value) ? picked.value : getTimeBasis();
}

// Eine Hilfszeile statt zweier Erklaerkaesten. Sie sagt zwei Dinge, und zwar
// nur ueber die GERADE gewaehlte Achse: was dieser Zeitstempel ist, und wie
// er sich zum Tresor-Standard verhaelt. Vorher stand beides gleichzeitig und
// dauerhaft da — vier Zeilen Erklaerung ueber einem Formular, in dem jedes
// andere Feld aus Beschriftung und Eingabe besteht.
function updateEntryBasisHelp() {
    const help = document.getElementById('entryBasisHelp');
    if (!help) return;
    const std = getTimeBasis();
    const pick = getFormBasis();
    document.querySelectorAll('#entryBasisPick .basis-row').forEach(row => {
        row.classList.toggle('is-on', row.getAttribute('data-basis-card') === pick);
    });

    const what = pick === 'created'
        ? L('Führend ist der Erfassungszeitpunkt — automatisch gesetzt und nicht änderbar.',
            'The time of entry leads — set automatically and not editable.')
        : L('Führend ist der Vorfallszeitpunkt — frei eintragbar, Uhrzeit optional.',
            'The time of the incident leads — freely editable, time optional.');
    const rel = pick === std
        ? L('Folgt dem Standard des Tresors.', 'Follows the vault default.')
        : L('Weicht vom Standard ab (' + TIME_BASIS[std].long + ') und bleibt beim Umschalten unverändert.',
            'Differs from the default (' + TIME_BASIS[std].long + ') and stays unchanged when the default is switched.');
    help.textContent = what + ' ' + rel;
}

function onEntryBasisChange() { updateEntryBasisHelp(); }

// Setzt beide Karten des Formulars. `createdAt` fehlt bei einem neuen
// Eintrag noch — dort steht, was passieren wird, statt eines leeren Feldes.
function fillEntryBasisFields(entry) {
    const stamp = document.getElementById('entryCreatedStamp');
    const hasStamp = !!(entry && entry.createdAt);
    stamp.textContent = hasStamp
        ? formatDate(isoLocalDate(entry.createdAt)) + ', ' + isoLocalTime(entry.createdAt) + L(' Uhr', '')
        : L('wird beim Speichern gesetzt', 'set when you save');
    stamp.classList.toggle('is-pending', !hasStamp);
    const basis = entry ? entryBasis(entry) : getTimeBasis();
    const radio = document.querySelector('input[name="entryBasis"][value="' + basis + '"]');
    if (radio) radio.checked = true;
    updateEntryBasisHelp();
}

function openNewEntry() {
    document.getElementById('entryModalTitle').textContent = L('Neuer Eintrag', 'New entry');
    document.getElementById('entryEditId').value = '';
    // Vorbelegung bleibt „jetzt": die allermeisten Vorfaelle werden noch am
    // selben Tag notiert. Beschriftet ist das Feld jetzt aber eindeutig als
    // Vorfallszeitpunkt, statt nur „Datum" zu heissen.
    document.getElementById('entryDate').value = isoLocalDate(new Date().toISOString());
    document.getElementById('entryTime').value = new Date().toTimeString().slice(0, 5);
    fillEntryBasisFields(null);
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
    document.getElementById('entryDate').value = entry.date || '';
    document.getElementById('entryTime').value = entry.time || '';
    fillEntryBasisFields(entry);
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

    // Das Vorfallsdatum ist nur Pflicht, wenn es die Chronologie dieses
    // Eintrags traegt. Steht er auf Erfassungszeitpunkt, darf es leer
    // bleiben — sonst muesste raten, wer den Tag nicht mehr genau weiss,
    // und ein geratenes Datum ist als Beweismittel schlechter als keines.
    const formBasis = getFormBasis();
    if (!date && formBasis === 'occurred') {
        showToast(L('Datum des Vorfalls fehlt — oder stelle den Eintrag auf „Erfasst am" um',
                    'Date of the incident is missing — or switch this entry to "Recorded on"'), 'warning');
        return;
    }
    if (!text) { showToast(L('Beschreibung fehlt', 'Description missing'), 'warning'); return; }

    // Nur speichern, wenn abweichend: sonst klebte der Eintrag an dem Wert,
    // der beim Speichern zufaellig Standard war, und ein spaeteres Umstellen
    // des Standards bliebe an ihm wirkungslos.
    const basisOverride = formBasis === getTimeBasis() ? undefined : formBasis;

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
    const beforeJournal = vaultJournal.slice();

    if (editId) {
        const idx = entries.findIndex(e => e.id === editId);
        if (idx !== -1) {
            const prev = entries[idx];
            const history = (prev.history || []).slice();
            history.push({ ts: prev.updatedAt || prev.createdAt, date: prev.date, time: prev.time, severity: prev.severity, category: prev.category, text: prev.text, witnesses: prev.witnesses || [], status: prev.status || 'open', details: prev.details || {}, timeBasis: prev.timeBasis });
            const updated = Object.assign({}, prev, {
                date, time, severity: selectedSeverity, category, text,
                witnesses: witnessList,
                attachments: attachmentsSnapshot,
                status, details,
                history,
                updatedAt: new Date().toISOString(),
            });
            // Object.assign traegt `undefined` mit ein — der Schluessel bliebe
            // sonst mit leerem Wert stehen und `isTimeBasis` faenge ihn zwar
            // ab, im Backup-JSON stuende aber Muell.
            if (basisOverride) updated.timeBasis = basisOverride; else delete updated.timeBasis;
            updated.contentHash = await contentFingerprint(updated);
            entries[idx] = updated;
            await journalRecord('update', updated);
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
        if (basisOverride) newEntry.timeBasis = basisOverride;
        newEntry.contentHash = await contentFingerprint(newEntry);
        entries.push(newEntry);
        await journalRecord('create', newEntry);
    }

    try {
        await saveVault();
    } catch (e) {
        entries = beforeEntries;
        vaultJournal = beforeJournal;
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
        // Ereignis VOR dem Entfernen: danach ist der Eintrag aus `entries`
        // raus und es gaebe nichts mehr, worauf sich das Protokoll bezieht.
        // Ein geloeschter Eintrag bleibt so in der Kette nachweisbar — dass
        // etwas da war, laesst sich nicht mehr wegwischen.
        await journalRecord('delete', { id: id });
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

// Zeitstempel einer Karte. Die fuehrende Achse steht in der Kopfzeile, die
// andere als ruhige Zeile darunter — und BEIDE tragen ihre Beschriftung.
// Ohne sie waere das Datum genau so mehrdeutig wie vorher, nur mit mehr
// Zahlen.
function entryStampHtml(e) {
    const lead = TIME_BASIS[entryEffectiveBasis(e)];
    const leadTime = entryLeadTime(e);
    let html = '<span class="entry-stamp-lbl">' + lead.short + '</span>' +
        '<span class="entry-date">' + formatDate(entryLeadDate(e)) + '</span>' +
        (leadTime ? '<span class="entry-time">' + leadTime + L(' Uhr', '') + '</span>' : '');
    if (entryBasisDiffers(e)) {
        // Zwei Gruende, warum eine Karte neben der Achse des Dokuments liegt,
        // und sie verlangen verschiedene Antworten: eine bewusste Ausnahme
        // laesst man stehen, ein fehlendes Vorfallsdatum traegt man nach.
        // Ein gemeinsames „abweichend" haette beides verschluckt.
        const declared = isTimeBasis(e.timeBasis);
        const label = declared ? L('abweichend', 'differs') : L('kein Vorfallsdatum', 'no incident date');
        const tip = declared
            ? L('Für diesen Eintrag gewählt. Folgt nicht dem Standard (' + TIME_BASIS[getTimeBasis()].long + ') und bleibt beim Umschalten unverändert.',
                'Chosen for this entry. Does not follow the default (' + TIME_BASIS[getTimeBasis()].long + ') and stays unchanged when the default is switched.')
            : L('Ohne Vorfallsdatum trägt die Erfassung die Chronologie. Über „Bearbeiten" nachtragbar.',
                'Without a date for the incident, the recording time carries the chronology. You can add it via "Edit".');
        html += '<span class="entry-basis-flag" title="' + escapeHtml(tip) + '">' + label + '</span>';
    }
    return html;
}

function entryAltStampHtml(e) {
    const altDate = entryAltDate(e);
    if (!altDate) return '';
    const altTime = entryAltTime(e);
    return '<div class="entry-stamp-alt">' + TIME_BASIS[entryAltBasis(e)].lead + ' ' +
        formatDate(altDate) + (altTime ? ', ' + altTime + L(' Uhr', '') : '') + '</div>';
}

function renderEntries() {
    const list = document.getElementById('entriesList');
    const search = (document.getElementById('searchInput').value || '').toLowerCase();
    const sevFilter = document.getElementById('filterSeverity').value;
    const catFilter = document.getElementById('filterCategory').value;
    const sort = document.getElementById('sortOrder').value;

    let filtered = entries.filter(e => {
        if (sevFilter !== 'all' && e.severity !== sevFilter) return false;
        if (catFilter !== 'all' && e.category !== catFilter) return false;
        // Gesucht wird auf BEIDEN Zeitachsen: wer „2026-08-04" eintippt, meint
        // den Tag, nicht die gerade eingestellte Konvention.
        if (search && !e.text.toLowerCase().includes(search) &&
            !(e.date || '').includes(search) && !isoLocalDate(e.createdAt).includes(search) &&
            !(e.witnesses || []).join(' ').toLowerCase().includes(search)) return false;
        return true;
    });

    if (sort === 'newest') filtered.sort((a, b) => entrySortKey(b).localeCompare(entrySortKey(a)));
    else if (sort === 'oldest') filtered.sort((a, b) => entrySortKey(a).localeCompare(entrySortKey(b)));
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
        const cat = getCategory(e.category);
        const sevClass = 'sev-' + e.severity;
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
                    '<div class="entry-meta">' + entryStampHtml(e) + '</div>' +
                    '<div class="entry-header-badges"><span class="entry-severity ' + sevClass + '">' + (SEVERITY_LABELS[e.severity] || e.severity) + '</span>' + statusHtml + '</div>' +
                '</div>' +
                entryAltStampHtml(e) +
                '<div class="entry-category"><span class="cat-icon">' + categoryIcon(cat) + '</span>' + escapeHtml(cat.label) + '</div>' +
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
        // Spanne auf der fuehrenden Achse — sonst zeigt die Kachel einen
        // Zeitraum, den keine der sichtbaren Karten belegt.
        const dates = entries.map(entryLeadDate).filter(Boolean).sort();
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

// ═════════════════════════════════════════
//  KATEGORIE-WAEHLER
//  Bei ~40 Kategorien plus eigenen ist eine native Auswahlliste unbrauchbar:
//  sie zeigt keine Fundhilfe, keine Gruppen und laesst sich nicht durchsuchen.
//  Muster wie beim Typ-Picker der Haupt-App: das <select> BLEIBT im DOM und
//  bleibt die Wert-Quelle — jeder bestehende `entryCategory.value`-Zugriff
//  laeuft unveraendert weiter —, darueber liegt eine eigene Listbox, die den
//  Wert nur spiegelt.
// ═════════════════════════════════════════

function categoryOptionHtml(key, cat) {
    return '<option value="' + escapeHtml(key) + '">' + escapeHtml(cat.label) + '</option>';
}

// Beide Auswahllisten aus den Daten bauen, nicht im HTML pflegen: eine fest
// verdrahtete Liste veraltet schweigend, sobald eine Kategorie dazukommt.
function populateCategorySelects() {
    const entrySel = document.getElementById('entryCategory');
    const keep = entrySel ? entrySel.value : '';
    const grouped = {};
    allCategoryEntries().forEach(({ key, cat, group }) => {
        (grouped[group] = grouped[group] || []).push({ key, cat });
    });

    let optionsHtml = '';
    CATEGORY_GROUP_ORDER.forEach(g => {
        if (!grouped[g] || !grouped[g].length) return;
        optionsHtml += '<optgroup label="' + escapeHtml(CATEGORY_GROUPS[g].label) + '">' +
            grouped[g].map(o => categoryOptionHtml(o.key, o.cat)).join('') + '</optgroup>';
    });

    if (entrySel) {
        entrySel.innerHTML = optionsHtml;
        if (keep && categoryExists(keep)) entrySel.value = keep;
    }

    const filterSel = document.getElementById('filterCategory');
    if (filterSel) {
        const keptFilter = filterSel.value;
        filterSel.innerHTML = '<option value="all">' + L('Alle Kategorien', 'All categories') + '</option>' + optionsHtml;
        filterSel.value = (keptFilter && (keptFilter === 'all' || categoryExists(keptFilter))) ? keptFilter : 'all';
    }

    // Dritte Liste: das Eskalations-Modal. Wurde beim Erweitern der
    // Kategorien fast uebersehen — es stand als zweiter fest verdrahteter
    // Optionsblock im HTML und haette dauerhaft die alten zehn gezeigt.
    const escSel = document.getElementById('escalationCategorySelect');
    if (escSel) {
        const keptEsc = escSel.value;
        escSel.innerHTML = optionsHtml;
        if (keptEsc && categoryExists(keptEsc)) escSel.value = keptEsc;
    }

    syncCategoryPickerButton();
}

// Alter Name, damit bestehende Aufrufe weiterlaufen.
function populateCategoryFilter() { populateCategorySelects(); }

let catPickerOpen = false;
let catPickerIndex = -1;   // Index in der aktuell gefilterten Liste

function catPickerEls() {
    return {
        sel: document.getElementById('entryCategory'),
        btn: document.getElementById('catPickerBtn'),
        panel: document.getElementById('catPickerPanel'),
        search: document.getElementById('catPickerSearch'),
        list: document.getElementById('catPickerList'),
    };
}

// Knopfbeschriftung dem <select> nachziehen. Wird auch vom value-Spiegel
// aufgerufen, damit programmatische Zuweisungen sichtbar werden.
function syncCategoryPickerButton() {
    const { sel, btn } = catPickerEls();
    if (!sel || !btn) return;
    const cat = getCategory(sel.value);
    btn.querySelector('.cat-picker-ico').innerHTML = categoryIcon(cat);
    btn.querySelector('.cat-picker-label').textContent = cat.label;
}

// Suchbegriff normalisieren: Umlaute und Grossschreibung duerfen einen
// Treffer nicht verhindern — „uberstunden" muss „Überstunden" finden.
// NFD zerlegt „ü" in u + Diakritikum, die Zeichenklasse wirft Letzteres weg;
// „ß" hat keine Zerlegung und braucht die eigene Zeile.
function catSearchNorm(str) {
    return String(str || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/ß/g, 'ss');
}

function catPickerMatches(query) {
    const q = catSearchNorm(query).trim();
    const all = allCategoryEntries();
    if (!q) return all;
    const terms = q.split(/\s+/);
    return all.filter(({ cat, group }) => {
        const hay = catSearchNorm(cat.label + ' ' + (cat.hint || '') + ' ' + (CATEGORY_GROUPS[group] || {}).label);
        return terms.every(t => hay.indexOf(t) !== -1);
    });
}

function renderCategoryPickerList() {
    const { search, list, sel } = catPickerEls();
    if (!list) return;
    const query = search ? search.value : '';
    const matches = catPickerMatches(query);
    const current = sel ? sel.value : '';

    if (!matches.length) {
        list.innerHTML = '<div class="cat-picker-empty">' +
            '<p>' + L('Keine Kategorie passt zu „', 'No category matches “') + escapeHtml(query.trim()) + L('".', '”.') + '</p>' +
            '<p class="cat-picker-empty-sub">' + L('Leg sie als eigene Kategorie an — sie steht dann bei jedem weiteren Eintrag zur Verfügung.',
                                                   'Create it as your own category — it will be available on every later entry.') + '</p>' +
            '</div>';
        catPickerIndex = -1;
        updateCatPickerCreateLabel(query);
        return;
    }

    let html = '';
    let lastGroup = null;
    matches.forEach(({ key, cat, group }, i) => {
        if (group !== lastGroup) {
            html += '<div class="cat-picker-group">' + escapeHtml(CATEGORY_GROUPS[group].label) + '</div>';
            lastGroup = group;
        }
        const on = key === current;
        html += '<div class="cat-picker-opt' + (on ? ' is-on' : '') + (i === catPickerIndex ? ' is-cursor' : '') + '"' +
            ' role="option" aria-selected="' + (on ? 'true' : 'false') + '"' +
            ' data-cat-key="' + escapeHtml(key) + '" data-cat-idx="' + i + '"' +
            ' onclick="pickCategory(this.getAttribute(\'data-cat-key\'))">' +
            '<span class="cat-picker-opt-ico">' + categoryIcon(cat) + '</span>' +
            '<span class="cat-picker-opt-text">' +
                '<span class="cat-picker-opt-name">' + escapeHtml(cat.label) + '</span>' +
                (cat.hint ? '<span class="cat-picker-opt-hint">' + escapeHtml(cat.hint) + '</span>' : '') +
            '</span>';
        if (cat.custom) {
            // Bewusst IMMER sichtbar statt per :hover eingeblendet — auf
            // Touch gibt es kein :hover, sonst waeren beide Aktionen dort
            // unerreichbar (siehe CLAUDE.md, Touch-Regel).
            html += '<span class="cat-picker-opt-acts">' +
                '<button type="button" class="cat-picker-act" title="' + L('Umbenennen', 'Rename') + '"' +
                    ' aria-label="' + L('Kategorie umbenennen', 'Rename category') + '"' +
                    ' onclick="event.stopPropagation();openCustomCategoryModal(\'' + escapeHtml(key) + '\')">' + UI_ICONS.edit + '</button>' +
                '<button type="button" class="cat-picker-act" title="' + L('Löschen', 'Delete') + '"' +
                    ' aria-label="' + L('Kategorie löschen', 'Delete category') + '"' +
                    ' onclick="event.stopPropagation();deleteCustomCategory(\'' + escapeHtml(key) + '\')">' + UI_ICONS.trash + '</button>' +
                '</span>';
        }
        html += '</div>';
    });
    list.innerHTML = html;
    updateCatPickerCreateLabel(query);
}

// Der Anlegen-Knopf uebernimmt den Suchtext. Wer „Werkstatt zu kalt" tippt
// und nichts findet, soll nicht abtippen muessen.
function updateCatPickerCreateLabel(query) {
    const btn = document.getElementById('catPickerCreate');
    if (!btn) return;
    const q = (query || '').trim();
    btn.querySelector('.cat-picker-create-txt').textContent = q
        ? L('„' + q + '" als eigene Kategorie anlegen', 'Create “' + q + '” as your own category')
        : L('Eigene Kategorie anlegen', 'Create your own category');
}

function openCategoryPicker() {
    const { panel, search, btn } = catPickerEls();
    if (!panel) return;
    catPickerOpen = true;
    catPickerIndex = -1;
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    search.value = '';
    renderCategoryPickerList();
    search.focus();
    // Die gewaehlte Kategorie in den sichtbaren Bereich holen — bei 40
    // Eintraegen liegt sie sonst irgendwo ausserhalb.
    const on = panel.querySelector('.cat-picker-opt.is-on');
    if (on) on.scrollIntoView({ block: 'nearest' });
}

function closeCategoryPicker(refocus) {
    const { panel, btn } = catPickerEls();
    if (!panel || panel.hidden) return;
    catPickerOpen = false;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
}

function toggleCategoryPicker() {
    if (catPickerOpen) closeCategoryPicker(true); else openCategoryPicker();
}

function pickCategory(key) {
    const { sel } = catPickerEls();
    if (!sel || !categoryExists(key)) return;
    sel.value = key;
    // Das <select> selbst feuert bei programmatischer Zuweisung kein
    // `change` — ohne diesen Aufruf laeuft renderCategoryFields() nicht und
    // die kategoriespezifischen Felder blieben die der alten Kategorie.
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    syncCategoryPickerButton();
    closeCategoryPicker(true);
}

// Klick daneben schliesst. `mousedown` statt `click`: bei `click` wuerde ein
// Klick auf ein anderes Formularfeld erst das Panel schliessen und der Fokus
// landete nirgends.
document.addEventListener('mousedown', function (e) {
    if (!catPickerOpen) return;
    const wrap = document.getElementById('catPickerWrap');
    if (wrap && !wrap.contains(e.target)) closeCategoryPicker(false);
});

function onCategoryPickerKey(e) {
    if (!catPickerOpen) return;
    const opts = Array.prototype.slice.call(document.querySelectorAll('#catPickerList .cat-picker-opt'));
    if (e.key === 'Escape') { e.preventDefault(); closeCategoryPicker(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!opts.length) return;
        catPickerIndex = e.key === 'ArrowDown'
            ? Math.min(opts.length - 1, catPickerIndex + 1)
            : Math.max(0, catPickerIndex - 1);
        opts.forEach((el, i) => el.classList.toggle('is-cursor', i === catPickerIndex));
        opts[catPickerIndex].scrollIntoView({ block: 'nearest' });
        return;
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        if (catPickerIndex >= 0 && opts[catPickerIndex]) pickCategory(opts[catPickerIndex].getAttribute('data-cat-key'));
        else if (opts.length === 1) pickCategory(opts[0].getAttribute('data-cat-key'));
        else if (!opts.length) openCustomCategoryModal(null, document.getElementById('catPickerSearch').value.trim());
    }
}

// ─── Eigene Kategorien anlegen / umbenennen / loeschen ───

// Programmatisches `entryCategory.value = …` feuert KEIN change-Ereignis —
// openNewEntry(), openEditEntry() und resetEdit() setzen den Wert genau so.
// Ohne diesen Spiegel bliebe der Knopf auf der zuletzt angeklickten Kategorie
// stehen, waehrend das <select> laengst eine andere fuehrt. Ein Spiegel auf
// dem Setter der Instanz statt einer Anpassung an jeder Aufrufstelle: die
// naechste neue Aufrufstelle wuerde es sonst wieder vergessen.
function installCategoryValueMirror() {
    const sel = document.getElementById('entryCategory');
    if (!sel || sel._mwlMirrored) return;
    const proto = Object.getPrototypeOf(sel);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value') ||
                 Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (!desc || !desc.set) return;
    Object.defineProperty(sel, 'value', {
        configurable: true,
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, v); syncCategoryPickerButton(); }
    });
    sel._mwlMirrored = true;
}

function customCategoryById(id) {
    return customCategories.find(c => c.id === id) || null;
}

function openCustomCategoryModal(editId, presetName) {
    const existing = editId ? customCategoryById(editId) : null;
    document.getElementById('customCatEditId').value = existing ? existing.id : '';
    document.getElementById('customCatName').value = existing ? existing.label : (presetName || '');
    document.getElementById('customCatHint').value = existing ? (existing.hint || '') : '';
    document.getElementById('customCatModalTitle').textContent = existing
        ? L('Kategorie umbenennen', 'Rename category')
        : L('Eigene Kategorie', 'Your own category');
    closeCategoryPicker(false);
    openModal('customCatModal');
    setTimeout(() => document.getElementById('customCatName').focus(), 60);
}

async function saveCustomCategory() {
    const id = document.getElementById('customCatEditId').value;
    const label = document.getElementById('customCatName').value.trim();
    const hint = document.getElementById('customCatHint').value.trim();

    if (!label) {
        showToast(L('Die Kategorie braucht einen Namen', 'The category needs a name'), 'warning');
        return;
    }
    // Gegen Werks- UND eigene Kategorien pruefen: zwei gleichnamige Eintraege
    // in der Liste sind im Protokoll spaeter nicht auseinanderzuhalten.
    const clash = allCategoryEntries().some(({ key, cat }) =>
        key !== id && cat.label.toLowerCase() === label.toLowerCase());
    if (clash) {
        showToast(L('Diese Kategorie gibt es schon', 'That category already exists'), 'warning');
        return;
    }

    let targetId = id;
    if (id) {
        const c = customCategoryById(id);
        if (!c) return;
        c.label = label;
        c.hint = hint;
    } else {
        targetId = 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
        customCategories.push({ id: targetId, label: label, hint: hint, createdAt: new Date().toISOString() });
    }

    try {
        await saveVault();
    } catch (e) {
        showToast(L('Kategorie konnte nicht gespeichert werden', 'Could not save the category'), 'error');
        return;
    }

    populateCategorySelects();
    closeModal('customCatModal');
    // Eine gerade angelegte Kategorie ist so gut wie immer die, die man
    // gleich verwenden will — also direkt setzen statt erneut suchen lassen.
    if (!id && document.getElementById('entryModal').classList.contains('active')) pickCategory(targetId);
    renderEntries();
    showToast(id ? L('Kategorie umbenannt', 'Category renamed') : L('Kategorie angelegt', 'Category created'), 'success');
}

async function deleteCustomCategory(id) {
    const cat = customCategoryById(id);
    if (!cat) return;
    // In Benutzung NICHT loeschen. Sonst fiele jeder betroffene Eintrag ueber
    // getCategory() still auf „Sonstiges" zurueck — die Einordnung waere weg,
    // ohne dass es jemand merkt, und im Protokoll stuende etwas Falsches.
    const used = entries.filter(e => e.category === id).length;
    if (used > 0) {
        showToast(used === 1
            ? L('Ein Eintrag nutzt diese Kategorie — erst dort umstellen, dann löschen',
                'One entry uses this category — change that one first, then delete')
            : L(used + ' Einträge nutzen diese Kategorie — erst dort umstellen, dann löschen',
                used + ' entries use this category — change those first, then delete'), 'warning');
        return;
    }
    if (!window.confirm(L('Kategorie „' + cat.label + '" löschen?', 'Delete the category “' + cat.label + '”?'))) return;

    customCategories = customCategories.filter(c => c.id !== id);
    try {
        await saveVault();
    } catch (e) {
        showToast(L('Kategorie konnte nicht gelöscht werden', 'Could not delete the category'), 'error');
        return;
    }
    populateCategorySelects();
    renderCategoryPickerList();
    showToast(L('Kategorie gelöscht', 'Category deleted'), 'success');
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
            const cat = getCategory(h.category);
            return '<div class="history-entry">' +
                '<div class="history-entry-head">' +
                    '<span>' + L('Fassung ', 'Version ') + (i + 1) + ' · ' + new Date(h.ts).toLocaleString(mwlLocale()) + '</span>' +
                    '<span class="entry-severity sev-' + h.severity + '">' + (SEVERITY_LABELS[h.severity] || h.severity) + '</span>' +
                '</div>' +
                '<div class="entry-category"><span class="cat-icon">' + categoryIcon(cat) + '</span>' + escapeHtml(cat.label) + '</div>' +
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

// Ausgearbeitete Anlaufstellen gibt es nur fuer die urspruenglichen Themen.
// Die neuen Kategorien erben ueber ihre GRUPPE die inhaltlich naechste —
// „Pause nicht gewaehrt" gehoert zu Arbeitszeit, nicht in den Auffangtopf.
// Fuer eigene Kategorien bleibt es bewusst beim allgemeinen Eintrag: welche
// Stelle zustaendig ist, kann niemand aus einem selbst vergebenen Namen ableiten.
const ESCALATION_BY_GROUP = {
    training: 'neglect',
    time: 'overtime',
    conduct: 'verbal',
    health: 'safety',
    school: 'neglect',
    formal: 'other',
    misc: 'other',
    custom: 'other',
};

function resolveEscalation(category) {
    if (ESCALATION[category]) return ESCALATION[category];
    const group = getCategory(category).group || 'misc';
    return ESCALATION[ESCALATION_BY_GROUP[group]] || ESCALATION.other;
}

function openEscalationModal(category) {
    const sel = document.getElementById('escalationCategorySelect');
    if (category && categoryExists(category)) sel.value = category;
    renderEscalationContent();
    openModal('escalationModal');
}

function renderEscalationContent() {
    const category = document.getElementById('escalationCategorySelect').value;
    const data = resolveEscalation(category);
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

    // Gefiltert und sortiert wird auf derselben Achse, die das Dokument
    // spaeter abdruckt — sonst schliesst „Von 01.08." Vorfaelle aus, deren
    // gedrucktes Datum im Zeitraum liegt.
    return entries.filter(e => {
        const d = entryLeadDate(e);
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (sevList && !sevList.includes(e.severity)) return false;
        return true;
    }).sort((a, b) => entrySortKey(a).localeCompare(entrySortKey(b)));
}

// Kopfzeile fuer beide Ausgabeformate: das Dokument muss selbst sagen, was
// seine Datumsangaben bedeuten. Ohne diesen Satz kann ein Leser bei der IHK
// nicht wissen, ob „04.08." der Vorfall oder die Niederschrift war.
function timeBasisNoteLines(exportEntries) {
    const std = TIME_BASIS[getTimeBasis()];
    const abweichend = exportEntries.filter(entryBasisDiffers).length;
    const out = [std.long + ' (' + std.hint + ')'];
    if (abweichend) {
        out.push(L(abweichend + (abweichend === 1 ? ' Vorfall ist' : ' Vorfälle sind') + ' abweichend datiert und unten gekennzeichnet',
                   abweichend + (abweichend === 1 ? ' incident is' : ' incidents are') + ' dated differently and marked below'));
    }
    return out;
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
        const dates = exportEntries.map(entryLeadDate).filter(Boolean).sort();
        lines.push(L('Zeitraum:    ', 'Period:      ') + formatDate(dates[0]) + ' — ' + formatDate(dates[dates.length - 1]));
    }
    timeBasisNoteLines(exportEntries).forEach((t, i) => {
        lines.push((i === 0 ? L('Zeitbezug:   ', 'Time basis:  ') : '             ') + t);
    });
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
        const cat = getCategory(e.category);
        lines.push(L('▸ VORFALL #', '▸ INCIDENT #') + (i + 1));
        // Beide Zeitstempel, jeder mit seinem Namen — der fuehrende zuerst.
        // Frueher stand hier ein unbeschriftetes „Datum:" und weiter unten
        // ein „Erstellt am:"; welcher der beiden die Chronologie des
        // Dokuments traegt, war daraus nicht ablesbar.
        const stamp = (label, d, t) => ('  ' + label + ':').padEnd(15) +
            formatDate(d) + (t ? ', ' + t + L(' Uhr', '') : '');
        lines.push(stamp(TIME_BASIS[entryEffectiveBasis(e)].lead, entryLeadDate(e), entryLeadTime(e)) +
            (entryBasisDiffers(e) ? L('   [abweichend vom Zeitbezug des Protokolls]', '   [differs from the record\'s time basis]') : ''));
        if (entryAltDate(e)) {
            lines.push(stamp(TIME_BASIS[entryAltBasis(e)].lead, entryAltDate(e), entryAltTime(e)));
        }
        lines.push(L('  Schwere:     ', '  Severity:    ') + (SEVERITY_LABELS[e.severity] || e.severity));
        lines.push(L('  Kategorie:   ', '  Category:    ') + catExportLabel(cat));
        lines.push(L('  Status:      ', '  Status:      ') + (STATUS_META[e.status || 'open'] || STATUS_META.open).label);
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

// Die Form des Falls auf einen Blick: dieselben (bereits ΔE-validierten)
// Schweregrad-Farben als Segment-Balken, EINMAL auf dem Deckblatt — das
// Dokument zeigt seine eigene Form, bevor man ein Wort gelesen hat. Nicht
// als Laufkopf wiederholen: der ueberdeckt Fliesstext auf Folgeseiten (siehe
// @page-Kommentar unten). Radius bewusst uniform statt "aeussere Ecken rund": bei
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
    return '<span class="cat-ico">' + categoryIcon(cat) + '</span>';
}

// Anhaenge fuer den Druck vorab entschluesseln.
//
// Bilder muessen als data:-URL im erzeugten Dokument stehen — ein blob:-Verweis
// aus diesem Fenster ist im Druckfenster nicht mehr aufloesbar.
//
// Textartige Beweismittel (Chatprotokoll, Mail-Export, CSV) wurden bis v5.2.0
// nur mit Namen und Groesse erwaehnt, ihr INHALT fiel aus dem Protokoll heraus.
// Genau der ist aber das Beweismittel. Sie werden jetzt woertlich abgedruckt.
//
// Echte Binaerdateien (PDF, Audio, Video, Office) lassen sich in eine Druckseite
// nicht hineinrendern. Sie bekommen einen Eintrag im Anlagenverzeichnis und
// werden separat uebergeben — das steht so im Dokument, statt sie stillschweigend
// wegzulassen.
const ATT_TEXT_LIMIT = 20000;   // Zeichen; darueber wird sichtbar gekuerzt

function attIsTextual(mime, name) {
    const m = (mime || '').toLowerCase();
    if (m.indexOf('text/') === 0) return true;
    if (m === 'application/json' || m === 'application/xml') return true;
    const ext = (name || '').split('.').pop().toLowerCase();
    return /^(txt|md|csv|log|eml|json|xml|vtt|srt)$/.test(ext);
}

async function collectAttachmentContents(list) {
    const map = new Map();
    for (const e of list) {
        for (const a of (e.attachments || [])) {
            const isImg = fileKind(a.mime, a.name) === 'image';
            const isTxt = !isImg && attIsTextual(a.mime, a.name);
            if (!isImg && !isTxt) continue;
            try {
                const loaded = await loadAttachmentBlob(a.id);
                if (!loaded) continue;
                if (isImg) {
                    const url = await new Promise(res => {
                        const fr = new FileReader();
                        fr.onload = () => res(fr.result);
                        fr.onerror = () => res(null);
                        fr.readAsDataURL(loaded.blob);
                    });
                    if (url) map.set(a.id, { type: 'image', url: url });
                } else {
                    const raw = await loaded.blob.text();
                    map.set(a.id, {
                        type: 'text',
                        text: raw.slice(0, ATT_TEXT_LIMIT),
                        truncated: raw.length > ATT_TEXT_LIMIT,
                        fullLength: raw.length
                    });
                }
            } catch (err) { /* einzelner Anhang fehlt: Export laeuft trotzdem durch */ }
        }
    }
    return map;
}

async function exportAsPDF() {
    const exportEntries = getExportEntries();
    if (exportEntries.length === 0) { showToast(L('Keine Einträge zum Exportieren', 'No entries to export'), 'warning'); return; }

    const attachmentUrls = await collectAttachmentContents(exportEntries);

    // Durchgehende Anlagen-Nummern ueber das ganze Dokument. Ohne sie laesst
    // sich aus dem Fliesstext nicht auf ein einzelnes Beweismittel verweisen,
    // und die separat uebergebenen Dateien sind keinem Vorfall zuzuordnen.
    // Nummeriert wird in DARSTELLUNGS-Reihenfolge (Bild, Text, separat), nicht
    // in Speicherreihenfolge — sonst stehen die Anlagen im Dokument als 1, 3, 2.
    const attIndex = new Map();
    const attList = [];
    const modeRank = { image: 0, text: 1, external: 2 };
    exportEntries.forEach(e => {
        const withMode = (e.attachments || []).map(a => {
            const got = attachmentUrls.get(a.id);
            return { att: a, mode: got ? got.type : 'external', content: got || null };
        });
        withMode.sort((x, y) => modeRank[x.mode] - modeRank[y.mode]);
        withMode.forEach(it => {
            const nr = attList.length + 1;
            attIndex.set(it.att.id, nr);
            attList.push({ nr: nr, att: it.att, entry: e, mode: it.mode, content: it.content });
        });
    });

    const now = new Date();
    const dates = exportEntries.map(entryLeadDate).filter(Boolean).sort();
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

    // KEIN laufender Kopf mehr. position:fixed wiederholt sich zwar auf jeder
    // Druckseite, RESERVIERT dort aber keinen Platz: Fliesstext beginnt auf
    // jeder Folgeseite wieder ganz oben und laeuft unter dem Kopf durch.
    // Platz auf allen Seiten reservieren kann nur der @page-Rand — und in den
    // hinein malen kann ein fixed-Element in Chrome nicht zuverlaessig.
    // Vertraulichkeitsvermerk, Aktenzeichen und Schweregrad-Signatur stehen
    // deshalb genau EINMAL: auf dem Deckblatt.
    html += '.break{break-after:page;page-break-after:always}';

    // ── Fingerprint: dieselben validierten Schweregrad-Farben als
    //    Segment-Balken. Steht einmal, auf dem Deckblatt. ──
    html += '.fingerprint{display:flex;gap:.4mm;overflow:hidden;border-radius:1pt}';
    html += '.fingerprint i{display:block;height:100%}';
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
    html += '.toc .d-alt{color:#9096a0;padding-left:.6mm}';
    html += '.toc-note{margin-top:3mm;font-size:8pt;color:#9096a0}';
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

    // ── Anlagenverzeichnis ──────────────────────────────────────────────
    html += '.att-lead{font-size:9.5pt;color:#4b5158;line-height:1.6;margin-bottom:6mm;max-width:150mm}';
    html += 'table.att-tab{width:100%;border-collapse:collapse;font-size:9pt}';
    html += 'table.att-tab th{text-align:left;font-weight:500;font-size:8pt;color:#9096a0;';
    html += 'border-bottom:.75pt solid #14161a;padding-bottom:2mm}';
    html += 'table.att-tab td{padding:2.3mm 2mm 2.3mm 0;border-bottom:.5pt solid #eceef1;color:#4b5158;vertical-align:top}';
    html += 'table.att-tab th:first-child,table.att-tab td:first-child{width:14mm}';
    html += 'table.att-tab th:last-child,table.att-tab td:last-child{width:34mm}';
    // Separat beigefuegte Dateien nicht ueber Farbe kennzeichnen — das Dokument
    // wird oft schwarzweiss ausgedruckt. Fettung traegt die Unterscheidung.
    html += 'table.att-tab tr.att-ext td:last-child{color:#14161a;font-weight:600}';
    html += '.att-note{margin-top:5mm;font-size:8.5pt;color:#9096a0;line-height:1.55;max-width:150mm}';

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
    // Beschriftet die Zahl dahinter. Braucht die .inc-when-Verankerung aus
    // demselben Grund wie .inc-idx — sonst gewinnt die generische span-Regel.
    html += '.inc-when .inc-basis{margin-left:0;margin-right:1.6mm;font-size:7pt;';
    html += 'letter-spacing:.08em;text-transform:uppercase;color:#9096a0;font-weight:500}';
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
    html += '.pic{break-inside:avoid;page-break-inside:avoid}';
    html += '.pics img{width:80mm;max-height:90mm;object-fit:contain;border:.5pt solid #e0e3e7;border-radius:2mm;display:block}';
    // Beschriftung: ein unbeschriftetes Foto belegt nicht, wozu es gehoert.
    html += '.pic figcaption{margin-top:1.2mm;font-size:7.5pt;color:#9096a0}';
    // Textbeweise woertlich — abgesetzt, damit klar ist, wo Zitat anfaengt
    // und aufhoert, und umbruchsicher ueber Seitengrenzen.
    html += '.att-txt{margin-top:3.5mm;border:.5pt solid #e0e3e7;border-radius:2mm;overflow:hidden}';
    html += '.att-txt figcaption{padding:1.8mm 2.5mm;background:#f4f5f7;font-size:8pt;font-weight:600;color:#14161a;border-bottom:.5pt solid #e0e3e7}';
    html += '.att-txt .att-meta{font-weight:400;color:#9096a0}';
    html += '.att-txt pre{padding:2.5mm;font-family:"JetBrains Mono","Cascadia Mono",Consolas,monospace;font-size:7.5pt;line-height:1.55;color:#14161a;white-space:pre-wrap;word-break:break-word}';
    html += '.att-cut{padding:0 2.5mm 2mm;font-size:7pt;color:#9096a0}';
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
    html += '.page{max-width:190mm;margin:0 auto 8mm;background:#fff;padding:16mm 15mm 18mm;';
    html += 'box-shadow:0 1px 2px rgba(20,22,26,.06),0 10px 24px rgba(20,22,26,.10);border-radius:1.5mm}';
    html += '}';
    html += '</style></head><body>';

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
    // Ohne diese Zeile weiss ein Leser bei der IHK nicht, ob das Datum eines
    // Vorfalls der Zeitpunkt des Geschehens oder der Niederschrift ist.
    html += '<div><dt>' + L('Zeitbezug der Daten', 'Basis of the dates') + '</dt><dd>' +
        timeBasisNoteLines(exportEntries).map(escapeHtml).join('<br>') + '</dd></div>';
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
        const cat = getCategory(e.category);
        const statusMeta = STATUS_META[e.status || 'open'] || STATUS_META.open;
        const p = PRINT_SEV[e.severity] || PRINT_SEV.note;
        html += '<tr style="--line:' + p.line + '">';
        html += '<td class="n num">' + (i + 1) + '</td>';
        html += '<td class="d mono">' + formatDate(entryLeadDate(e)) +
                (entryBasisDiffers(e) ? '<span class="d-alt">*</span>' : '') + '</td>';
        html += '<td><span class="icon-label">' + catIconHtml(cat) + escapeHtml(catExportLabel(cat)) + '</span></td>';
        html += '<td class="s">' + sevBadge(e.severity) +
                '<span class="status">' + escapeHtml(statusMeta.label) + '</span></td>';
        html += '</tr>';
    });
    html += '</table>';
    // Die Spalte traegt Daten von zwei verschiedenen Achsen, sobald ein
    // Eintrag abweicht — der Stern muss erklaert werden, sonst ist er Zierrat.
    const tocStd = TIME_BASIS[getTimeBasis()];
    html += '<p class="toc-note">' + escapeHtml(L('Datumsspalte: ', 'Date column: ') +
        tocStd.long + ' (' + tocStd.hint + ').');
    if (exportEntries.some(entryBasisDiffers)) {
        html += ' ' + escapeHtml(L('Mit * gekennzeichnete Zeilen sind abweichend datiert; der jeweils andere Zeitstempel steht bei dem Vorfall in Abschnitt 03.',
                                   'Rows marked * are dated differently; the other timestamp is given with the incident in section 03.'));
    }
    html += '</p>';
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
    // Ueber allCategoryEntries(), nicht ueber CATEGORIES: sonst fehlen die
    // eigenen Kategorien in der Summe und die Zahlen ergeben nicht die
    // Gesamtzahl der Vorfaelle.
    allCategoryEntries().forEach(({ key, cat }) => {
        const c = exportEntries.filter(e => e.category === key).length;
        if (c > 0) html += '<tr><td><span class="icon-label">' + catIconHtml(cat) + escapeHtml(catExportLabel(cat)) + '</span></td><td>' + c + '</td></tr>';
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
        const cat = getCategory(e.category);
        const statusMeta = STATUS_META[e.status || 'open'] || STATUS_META.open;
        const p = PRINT_SEV[e.severity] || PRINT_SEV.note;
        html += '<div class="inc">';
        html += '<span class="inc-dot ' + p.dot + '" style="--line:' + p.line + '"><i></i></span>';
        html += '<div class="inc-head">';
        // #-Nummer identisch zur Übersichtstabelle — Querverweis ohne Seitenzahlen.
        html += '<span class="inc-when mono"><span class="inc-idx">#' + (i + 1) + '</span>' +
                '<span class="inc-basis">' + escapeHtml(TIME_BASIS[entryEffectiveBasis(e)].short) + '</span>' +
                formatDate(entryLeadDate(e)) +
                (entryLeadTime(e) ? '<span>' + entryLeadTime(e) + L(' Uhr', '') + '</span>' : '') + '</span>';
        html += '<span class="inc-badges">' + sevBadge(e.severity) +
                '<span class="status">' + escapeHtml(statusMeta.label) + '</span></span>';
        html += '</div>';
        html += '<p class="inc-cat"><span class="icon-label">' + catIconHtml(cat) + escapeHtml(catExportLabel(cat)) + '</span></p>';
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
            const pics = e.attachments.filter(a => (attachmentUrls.get(a.id) || {}).type === 'image');
            const txts = e.attachments.filter(a => (attachmentUrls.get(a.id) || {}).type === 'text');
            const docs = e.attachments.filter(a => !attachmentUrls.get(a.id));

            if (pics.length) {
                html += '<div class="pics">' + pics.map(a =>
                    '<figure class="pic"><img src="' + attachmentUrls.get(a.id).url + '" alt="' + escapeHtml(a.name) + '">' +
                    '<figcaption>' + L('Anlage ', 'Exhibit ') + attIndex.get(a.id) + ' — ' + escapeHtml(a.name) + '</figcaption></figure>'
                ).join('') + '</div>';
            }

            // Textbeweise woertlich. Der Inhalt IST das Beweismittel; ein
            // Dateiname im Fliesstext belegt gar nichts.
            txts.forEach(a => {
                const c = attachmentUrls.get(a.id);
                html += '<figure class="att-txt">';
                html += '<figcaption>' + L('Anlage ', 'Exhibit ') + attIndex.get(a.id) + ' — ' + escapeHtml(a.name) +
                        ' <span class="att-meta">(' + escapeHtml(formatBytes(a.size)) + ')</span></figcaption>';
                html += '<pre>' + escapeHtml(c.text) + '</pre>';
                if (c.truncated) {
                    html += '<p class="att-cut">' + L(
                        'Gekürzt nach ' + ATT_TEXT_LIMIT.toLocaleString(mwlLocale()) + ' von ' + c.fullLength.toLocaleString(mwlLocale()) + ' Zeichen. Die vollständige Datei liegt im Tresor.',
                        'Truncated after ' + ATT_TEXT_LIMIT.toLocaleString(mwlLocale()) + ' of ' + c.fullLength.toLocaleString(mwlLocale()) + ' characters. The complete file is in the vault.'
                    ) + '</p>';
                }
                html += '</figure>';
            });

            // PDF, Audio, Video, Office: in eine Druckseite nicht darstellbar.
            // Sie stehen mit Anlagennummer hier und im Anlagenverzeichnis, damit
            // die separat uebergebene Datei dem Vorfall zuzuordnen ist.
            if (docs.length) {
                html += '<p class="docs"><b>' + L('Separat beigefügt', 'Supplied separately') + '</b> ' +
                    escapeHtml(docs.map(a => L('Anlage ', 'Exhibit ') + attIndex.get(a.id) + ': ' + a.name + ' (' + formatBytes(a.size) + ')').join(' · ')) + '</p>';
            }
        }
        // Der zweite Zeitstempel gehoert in dieselbe Zeile wie Pruefsumme und
        // Bearbeitungszahl: Angaben ueber den Eintrag, nicht ueber den
        // Vorfall. Beschriftet, weil er je nach Zeitbezug ein anderer ist.
        const trace = [];
        if (entryAltDate(e)) {
            trace.push(TIME_BASIS[entryAltBasis(e)].lead + ' ' + formatDate(entryAltDate(e)) +
                (entryAltTime(e) ? ', ' + entryAltTime(e) + L(' Uhr', '') : ''));
        }
        if (entryBasisDiffers(e)) trace.push(L('abweichender Zeitbezug', 'differing time basis'));
        if (e.history && e.history.length) trace.push(e.history.length + L('× nachträglich bearbeitet', '× edited afterwards'));
        if (e.contentHash) trace.push(L('Prüfsumme ', 'Checksum ') + e.contentHash);
        html += '<p class="trace mono">' + escapeHtml(trace.join('  ·  ')) + '</p>';
        html += '</div>';
    });

    // ─── 04 Anlagenverzeichnis ───────────────────────────────────────────
    // Ohne dieses Verzeichnis ist eine separat uebergebene Datei keinem
    // Vorfall zuzuordnen, und der Empfaenger sieht nicht, ob zu einem
    // Vorfall ueberhaupt Beweismittel existieren.
    if (attList.length) {
        html += '<div class="page break">';
        html += '<div class="sec-head"><span class="sec-idx">04</span><h2>' + L('Anlagenverzeichnis', 'Index of exhibits') + '</h2></div>';

        const nExt = attList.filter(a => a.mode === 'external').length;
        html += '<p class="att-lead">' + L(
            'Zu den oben genannten Vorfällen gehören ' + attList.length + ' Beweismittel. Bilder und Textdokumente sind in diesem Protokoll abgedruckt.' +
                (nExt ? ' ' + nExt + ' Datei(en) lassen sich nicht ausdrucken und werden separat übergeben.' : ''),
            'The incidents above have ' + attList.length + ' items of evidence. Images and text documents are reproduced in this record.' +
                (nExt ? ' ' + nExt + ' file(s) cannot be printed and are supplied separately.' : '')
        ) + '</p>';

        html += '<table class="att-tab"><thead><tr>';
        html += '<th>' + L('Anlage', 'Exhibit') + '</th>';
        html += '<th>' + L('Vorfall vom', 'Incident of') + '</th>';
        html += '<th>' + L('Datei', 'File') + '</th>';
        html += '<th>' + L('Größe', 'Size') + '</th>';
        html += '<th>' + L('Im Protokoll', 'In this record') + '</th>';
        html += '</tr></thead><tbody>';
        attList.forEach(it => {
            const inDoc = it.mode === 'image'
                ? L('abgedruckt (Bild)', 'reproduced (image)')
                : it.mode === 'text'
                    ? L('abgedruckt (Text)', 'reproduced (text)')
                    : L('separat beigefügt', 'supplied separately');
            html += '<tr' + (it.mode === 'external' ? ' class="att-ext"' : '') + '>';
            html += '<td class="mono">' + it.nr + '</td>';
            html += '<td>' + escapeHtml(formatDate(entryLeadDate(it.entry))) + '</td>';
            html += '<td>' + escapeHtml(it.att.name) + '</td>';
            html += '<td class="mono">' + escapeHtml(formatBytes(it.att.size)) + '</td>';
            html += '<td>' + inDoc + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';

        if (nExt) {
            html += '<p class="att-note">' + L(
                'Die separat beigefügten Dateien liegen unverändert im verschlüsselten Tresor. Über „Backup exportieren" lassen sie sich im Original herausgeben.',
                'The separately supplied files are held unchanged in the encrypted vault. Use "Export backup" to hand them over in their original form.'
            ) + '</p>';
        }
        html += '</div>';
    }

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
    // Vorbelegung auf der fuehrenden Achse — die Von/Bis-Felder filtern
    // dieselbe, und ein Zeitraum, der die eigenen Eintraege nicht umschliesst,
    // waere eine unnoetige Falle.
    if (entries.length > 0) {
        const dates = entries.map(entryLeadDate).filter(Boolean).sort();
        document.getElementById('exportFrom').value = dates[0];
        document.getElementById('exportTo').value = dates[dates.length - 1];
    }
    syncTimeBasisControls();
    document.getElementById('exportPreview').textContent = L('Klicke "Vorschau" um das Protokoll zu generieren.', 'Click "Preview" to generate the record.');
    openModal('exportModal');
}

// ═════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════

// textContent→innerHTML escapt < > &, aber NICHT die Anfuehrungszeichen. In
// Attribut-Kontext (alt=, title=, value=, placeholder=) reicht das nicht: ein
// Dateiname wie  x" onerror="…  bricht aus dem Attribut aus und haengt einen
// Event-Handler ans Tag. Im PDF-Export war das nachweisbar — das erzeugte
// <img> trug einen fremden onerror-Handler, und in diesem Dokument stehen die
// entschluesselten Beweismittel. Dateinamen sind Nutzereingabe.
// Quotes werden deshalb immer mit escapt; im Textkontext rendert &quot; bzw.
// &#39; unveraendert als " bzw. ', es gibt also keine Nebenwirkung.
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    // Nur freigeben, wenn wirklich kein Modal mehr offen ist. Seit das
    // Kategorie-Modal AUS dem Eintrags-Modal geoeffnet wird, gab das Schliessen
    // des oberen sonst den Seiten-Scroll frei, waehrend darunter noch ein
    // Modal steht — der Hintergrund scrollt dann unter dem Dialog weg.
    if (!document.querySelector('.modal-overlay.active')) document.body.style.overflow = '';
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
