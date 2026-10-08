// ═══ BH-BASIS ═══
// Sprach-Helfer L(), Speicher-Schluessel, gemeinsamer Zustand,
// Stichworte zur Berufserkennung (AI_BRAIN) und die Vorlagen.
// Muss ZUERST laden: reports/editingId/currentMode sind let-Bindungen im
// Skript-Scope, die alle folgenden Dateien lesen.
// Herausgeloest aus pages/berichtsheft/index.html.

/* ═══════════════════════════════════════════════════════════
           BERICHTSHEFT ENGINE v2.0 — Premium JavaScript
           ═══════════════════════════════════════════════════════════ */

// Sprach-Helper für JS-generierten Text. Die statische i18n-Pipeline erfasst nur
// Text, der im HTML steht — zur Laufzeit gebaute Sätze (mit Zahlen drin) muss der
// Code selbst umschalten. i18n-runtime.js matcht nur exakte, feste Strings.
function L(de, en) { return document.documentElement.lang === 'en' ? en : de; }

// Stundenzahl in der Schreibweise der Seite (8,75 auf Deutsch, 8.75 auf Englisch).
// Native Zahlenfelder zeigen das Dezimalkomma von selbst — alles, was JS daneben
// schreibt, muss es nachziehen, sonst stehen „8,75" und „39.5" nebeneinander.
function bhStunden(n) {
    const v = Number(n) || 0;
    return v.toLocaleString(window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE');
}

// ===== CONSTANTS & STATE =====
const STORAGE_KEY = 'berichtsheft_reports';
const TRASH_KEY = 'berichtsheft_trash';
const THEME_KEY = 'berichtsheft_theme';
const AUTOSAVE_KEY = 'berichtsheft_draft';
const MODE_KEY = 'berichtsheft_mode';
let reports = [];
let editingId = null;
let bulkMode = false;
let selectedIds = new Set();
let autoSaveTimer = null;
let currentMode = localStorage.getItem(MODE_KEY) || 'daily'; // IHK default

// ===== AI_BRAIN =====
// Nur noch zwei Leser, beide in ais-studio.js: die Berufserkennung aus dem
// Freitext (professions[].keywords) und universalVerbs. Verben, Objekte,
// Werkzeuge, Satzvorlagen und Detail-Pools hingen an den "AI Vorschlaege"-
// Chips im Formular (bh-vorschlaege.js) und sind mit ihnen am 08.10.2026
// entfernt worden — auf Wunsch des Nutzers ("braucht man nicht").
const AI_BRAIN = {
    professions: {
        'software': { keywords: ['it', 'entwickl', 'programm', 'software', 'web', 'dev', 'coder', 'fullstack', 'frontend', 'backend', 'app', 'fachinformatik', 'anwendung'] },
        'sysadmin': { keywords: ['system', 'admin', 'netzwerk', 'infrastruktur', 'server', 'support', 'helpdesk', 'systemintegr'] },
        'kaufmann': { keywords: ['kaufm', 'buch', 'büro', 'verwalt', 'office', 'personal', 'handel', 'bank', 'versicher', 'finanz', 'steuer', 'industrie', 'logistik', 'einkauf', 'vertrieb', 'lager', 'spedition'] },
        'handwerk_bau': { keywords: ['mauer', 'bau', 'beton', 'hochbau', 'tiefbau', 'zimmerer', 'zimmermann', 'dachdecker', 'gerüstbau', 'straßenbau', 'pflaster', 'fliesenleger', 'fliesen', 'estrich', 'trockenbau', 'stuckateur'] },
        'handwerk_holz': { keywords: ['tischler', 'schreiner', 'holz', 'möbel', 'zimmerei'] },
        'elektro': { keywords: ['elektr', 'elektronik', 'mechatronik', 'strom', 'energie', 'anlagenmechanik'] },
        'gastronomie': { keywords: ['koch', 'bäck', 'konditor', 'gastro', 'küche', 'restaurant', 'hotel', 'catering', 'fleisch', 'metzger', 'fachverkäufer'] },
        'pflege': { keywords: ['pflege', 'kranken', 'alten', 'gesundheit', 'arzthelf', 'medizin', 'mfa', 'zahnmedizin', 'zfa', 'labor', 'pharma', 'apothek', 'therapeut', 'ergo', 'physio'] },
        'kfz': { keywords: ['kfz', 'auto', 'fahrzeug', 'werkstatt', 'mechatronik', 'karosserie', 'lackier', 'zweirad', 'motorrad'] },
        'friseur': { keywords: ['friseur', 'frisör', 'hair', 'salon', 'kosmetik', 'beauty', 'coiffeur'] },
        'einzelhandel': { keywords: ['einzelhandel', 'verkauf', 'drogist', 'buchhändl', 'florist', 'augenoptik', 'uhrmacher', 'juwelier', 'textil', 'schuh', 'sport', 'lebensmittel', 'discounter'] },
        'lager': { keywords: ['lager', 'fachlager', 'logistik', 'spedition', 'kommission', 'versand', 'fachkraft lager'] },
        'medien': { keywords: ['medien', 'design', 'grafik', 'kreativ', 'druck', 'foto', 'video', 'film', 'veranstaltungstechnik'] },
        'garten': { keywords: ['garten', 'gärtner', 'landschaft', 'grünpflege', 'friedhof', 'florist', 'blumen', 'baumschul'] },
        'metall': { keywords: ['metall', 'industrie mechanik', 'zerspanung', 'werkzeugmech', 'konstruktion', 'schlosser', 'stahlbau', 'maschinen', 'cnc', 'dreh'] },
        'chemie': { keywords: ['chemie', 'labor', 'chemikant', 'pharmakant', 'lack', 'farbe', 'verfahrensmech', 'kunststoff', 'biologie'] },
    },
    universalVerbs: ['durchführen', 'erledigen', 'bearbeiten', 'vorbereiten', 'nachbereiten', 'organisieren', 'kontrollieren', 'dokumentieren', 'besprechen', 'unterstützen', 'überprüfen', 'koordinieren', 'planen', 'fertigstellen', 'optimieren'],
};

// ===== TEMPLATES =====
const templates = [
    {
        id: 'it-dev',
        name: 'IT-Entwicklung',
        icon: '<svg class="icon"><use href="#i-wrench" /></svg>',
        description: 'Für Fachinformatiker Anwendungsentwicklung',
        content: `• Entwicklung und Implementierung von Software-Komponenten
• Code-Review und Qualitätssicherung
• Debugging und Fehlerbehebung
• Dokumentation der Entwicklungsprozesse
• Teilnahme an Team-Meetings und Planungen
• Unit-Tests erstellt und durchgeführt`
    },
    {
        id: 'it-admin',
        name: 'IT-Systemadministration',
        icon: '<svg class="icon"><use href="#i-gear" /></svg>',
        description: 'Für Fachinformatiker Systemintegration',
        content: `• Wartung und Administration von IT-Systemen
• Benutzer- und Rechteverwaltung
• Installation und Konfiguration von Software
• Netzwerk-Monitoring und Troubleshooting
• Erstellung von technischen Dokumentationen
• Backup-Systeme überprüft und gewartet`
    },
    {
        id: 'business',
        name: 'Kaufmännisch',
        icon: '<svg class="icon"><use href="#i-chart" /></svg>',
        description: 'Für kaufmännische Berufe',
        content: `• Bearbeitung von Geschäftsvorfällen
• Kundenkommunikation und -betreuung
• Erstellung von Angeboten und Rechnungen
• Büroorganisation und Verwaltung
• Mitarbeit an Projekten und Präsentationen
• Datenerfassung und Pflege im ERP-System`
    },
    {
        id: 'design',
        name: 'Mediengestaltung',
        icon: '<svg class="icon"><use href="#i-pen" /></svg>',
        description: 'Für Mediengestalter',
        content: `• Konzeption und Gestaltung von Medienprodukten
• Bildbearbeitung und Layout-Erstellung
• Abstimmung mit Kunden und Kollegen
• Qualitätsprüfung und Korrekturschleifen
• Recherche und Trend-Analyse
• Reinzeichnung und Druckvorbereitung`
    },
    {
        id: 'data',
        name: 'Daten & KI',
        icon: '<svg class="icon"><use href="#i-sparkles" /></svg>',
        description: 'Für Fachinformatiker Daten & Prozesse',
        content: `• Analyse und Aufbereitung von Datensätzen
• Entwicklung und Training von ML-Modellen
• Datenbankabfragen und -optimierung
• Prozessanalyse und Automatisierung
• Erstellung von Dashboards und Reportings
• Qualitätssicherung der Datenbestände`
    }
];

// ═══════════════════════════════════════
// AUSBILDUNGSJAHR-BERECHNUNG
// ═══════════════════════════════════════
// Bestimmt das exakte Ausbildungsjahr (1–4) stichtagsgenau anhand des
// Ausbildungsbeginns. Als Stichtag der Woche gilt der Donnerstag (ISO-Regel
// der 4-Tage-Mehrheit einer Arbeitswoche).
function ihkCalculateAusbildungsjahr(dRef, sDate, baseYearFallback) {
    if (sDate && !isNaN(sDate.getTime()) && dRef && !isNaN(dRef.getTime())) {
        if (dRef < sDate) return 1;
        let yr = 1;
        for (let y = 1; y <= 4; y++) {
            const anniv = new Date(sDate.getFullYear() + y, sDate.getMonth(), sDate.getDate());
            if (dRef >= anniv) {
                yr = y + 1;
            } else {
                break;
            }
        }
        return Math.min(Math.max(yr, 1), 4);
    }
    if (baseYearFallback && dRef && !isNaN(dRef.getTime())) {
        const yearDiff = dRef.getFullYear() - baseYearFallback;
        // Standard in Deutschland: Ausbildungsbeginn meist 1. September (Monat 8 im 0-basierten Date)
        const yr = yearDiff + (dRef.getMonth() >= 8 ? 1 : 0);
        return Math.min(Math.max(yr, 1), 4);
    }
    return 1;
}

// ═══════════════════════════════════════
// ANGABEN AUS DER HAUPT-APP UND DEM PDF-DECKBLATT
// ═══════════════════════════════════════
// Soll-Stunden je Wochentag und Ausbildungsbeginn/-ende sind an zwei Orten
// eingestellt: im Deckblatt des PDF-Dialogs (pdf_personal_cfg) und in der
// Haupt-App (tg_pro_data.settings.hours / .ihk). Hier wird nur GELESEN — wer
// etwas aendern will, tut das dort, wo es eingestellt wird. Vorher stand im
// Formular fuer jeden Azubi „8 Std." und „1. Ausbildungsjahr", egal was er
// in der App eingetragen hatte.

function bhHauptAppSettings() {
    try {
        const d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
        return (d && d.settings) || null;
    } catch (e) { return null; }
}

// "TT.MM.JJJJ" (Deckblatt) oder "JJJJ-MM-TT" (Haupt-App, <input type=date>).
function bhParseDatum(str) {
    if (!str) return null;
    const s = String(str).trim();
    let y, m, d;
    if (s.includes('.')) [d, m, y] = s.split('.').map(Number);
    else if (s.includes('-')) [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
}

// Tag i: 0 = Montag … 4 = Freitag. settings.hours ist Sonntag-basiert
// (Index 0 = So), deshalb i + 1. Ohne Angabe bleibt es bei 8.
function bhSollStunden(i) {
    const s = bhHauptAppSettings();
    const h = s && Array.isArray(s.hours) ? s.hours[i + 1] : null;
    return (typeof h === 'number' && h > 0) ? h : 8;
}

function bhAusbildungsZeitraum() {
    let beginn = null, ende = null;
    try {
        const p = JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}') || {};
        beginn = bhParseDatum(p.beginn);
        ende = bhParseDatum(p.ende);
    } catch (e) {}
    const s = bhHauptAppSettings();
    if (s && s.ihk) {
        if (!beginn) beginn = bhParseDatum(s.ihk.start);
        if (!ende) ende = bhParseDatum(s.ihk.end);
    }
    return { beginn, ende };
}

// ═══════════════════════════════════════
// PAPIERKORB / TRASH MANAGEMENT
// ═══════════════════════════════════════
// Hält gelöschte Berichte für max. 30 Tage vor. Nach Ablauf werden sie
// automatisch endgültig gelöscht, um den Speicher und die Datenbank schlank zu halten.
const TRASH_MAX_DAYS = 30;
if (typeof window !== 'undefined') {
    window.TRASH_KEY = TRASH_KEY;
    window.TRASH_MAX_DAYS = TRASH_MAX_DAYS;
}

function loadTrash() {
    try {
        const raw = localStorage.getItem(TRASH_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn('[Trash] Fehler beim Laden:', e);
        return [];
    }
}

function saveTrash(list) {
    try {
        localStorage.setItem(TRASH_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) {
        console.warn('[Trash] Fehler beim Speichern:', e);
    }
}

function getTrashCount() {
    return loadTrash().length;
}

function cleanupExpiredTrash(maxDays = TRASH_MAX_DAYS) {
    const list = loadTrash();
    if (!list.length) return { kept: [], expired: [] };
    const cutoff = Date.now() - (maxDays * 86400000);
    const kept = [];
    const expired = [];
    for (const item of list) {
        const d = item.deletedAt ? new Date(item.deletedAt).getTime() : 0;
        if (d && d < cutoff) {
            expired.push(item);
        } else {
            kept.push(item);
        }
    }
    if (expired.length > 0) {
        saveTrash(kept);
    }
    return { kept, expired };
}

if (typeof window !== 'undefined') {
    window.TRASH_KEY = TRASH_KEY;
    window.TRASH_MAX_DAYS = TRASH_MAX_DAYS;
    window.loadTrash = loadTrash;
    window.saveTrash = saveTrash;
    window.getTrashCount = getTrashCount;
    window.cleanupExpiredTrash = cleanupExpiredTrash;
}

