// ═══ BERICHTSHEFT-ASSISTENT (CHAT) MODULE ═══
//
// Vollbild-Ansicht im Stil eines Chats. Der Azubi erzaehlt in eigenen Worten,
// der Assistent schreibt es SOFORT in einen Wochenentwurf, der als eine Karte
// im Gespraech mitwaechst. "In den Bericht uebernehmen" fuellt das Formular.
//
// 🔴 Aufbau seit v8.0.0 — EIN Aufruf je Nachricht, der gleich schreibt.
// Bis v7.9.3 durfte das Modell nur Einstellungen setzen und einen Schalter
// "jetzt ganze Woche erzeugen" umlegen; ein ZWEITER Aufruf, der das Gespraech
// nicht kannte, schrieb dann blind eine volle Woche. "Schreib mir fuer Mi
// einen Schuleintrag" oder "sonst nur PCs ausgepustet" liessen sich damit gar
// nicht ausdruecken — der Assistent konnte nur nachfragen und fragte in einer
// Schleife "Was hast du sonst noch gemacht?" (gemeldet 27.09.2026).
// Jetzt bekommt das Modell Gespraech, Einstellungen und den AKTUELLEN Entwurf
// und gibt den geaenderten Entwurf zurueck. Das laeuft ueber den Wochen-Pfad
// des Proxys ("/", looksLikeWeek nimmt { days: [...] } an, 4096 Tokens) —
// /verstehen ist auf 900 Tokens gedeckelt und fuer eine Woche zu kurz.
//
// Was bewusst NICHT passiert: Tage, zu denen nichts erzaehlt wurde, fuellt
// niemand ungefragt (Entscheidung des Nutzers, 27.09.2026 — ein erfundener
// Tag im Ausbildungsnachweis ist schlimmer als ein leerer). Auffuellen nur auf
// Wunsch ("fuell den Rest", Knopf "Leere Tage fuellen").
//
// Faellt die KI aus (offline, Tageslimit, alle Modelle weg), rechnet der Chat
// NICHT still weiter. Er sagt es und bietet "Ohne KI schreiben" an — das ist
// die lokale Engine, die die ganze Woche auffuellt, also nur auf Klick.

window.AISChat = (function () {
'use strict';

const SPEICHER = 'bh_chat_v1';
const LIMIT_KEY = 'bh_chat_rl';
// Eigener Zaehler neben dem der Wochen (20/Tag): alle Nutzer teilen sich das
// Tagesbudget von OpenRouter.
const LIMIT_TAG = 60;
const MAX_NACHRICHTEN = 60;
const KONTEXT_RUNDEN = 6;
const STATUS = ['krank', 'urlaub', 'feiertag'];

let offen = false;
let beschaeftigt = false;
// Welche Tage die letzte Antwort geaendert hat — nur fuer die Markierung in
// der Karte, deshalb nicht gespeichert und beim naechsten Senden geleert.
let zuletztGeaendert = [];
let gespraech = null;               // unten gesetzt: leeresGespraech() braucht TAG_DE

const $ = (id) => document.getElementById(id);
// AIStudio ist ein const auf oberster Ebene (ais-studio.js) und haengt damit
// NICHT an window — window.AIStudio ist immer undefined (dieselbe Falle wie
// window.data, CLAUDE.md). Deshalb typeof.
const studioDa = () => typeof AIStudio !== 'undefined';
const Lx = (de, en) => (typeof L === 'function' ? L(de, en) : de);
const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const istEn = () => document.documentElement.lang === 'en';

// Die Tagesnamen im Entwurf und im Prompt sind SCHLUESSEL, immer deutsch
// (vgl. "day ist ein Schluessel" in der Notiz). Angezeigt wird TAGE().
const TAG_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const TAGE = () => Lx('Montag Dienstag Mittwoch Donnerstag Freitag', 'Monday Tuesday Wednesday Thursday Friday').split(' ');
const FORM_NAME = {
    stichpunkte: ['Stichpunkte', 'Bullet points'],
    saetze: ['Ganze Sätze', 'Full sentences'],
    ichform: ['Ich-Form', 'First person'],
    fliesstext: ['Fließtext', 'Continuous text'],
};
const UMFANG_NAME = { kurz: ['kurz', 'short'], mittel: ['mittel', 'medium'], ausfuehrlich: ['ausführlich', 'detailed'] };
gespraech = leeresGespraech();

// ── Entwurf ──────────────────────────────────────────────────────────
function leererTag(i) {
    return { index: i, name: TAG_DE[i], entries: [], isSchoolDay: false, schoolTopic: '', dayStatus: '' };
}
function leererEntwurf() {
    return { kw: 0, tage: [0, 1, 2, 3, 4].map(leererTag) };
}
function leeresGespraech() {
    return { nachrichten: [], woche: '', erledigt: false, entwurf: leererEntwurf() };
}
// Ein neues Gespraech beginnt in der LAUFENDEN Woche. Das Wochenfeld der
// Einstellungen behielt sonst die KW der zuletzt uebernommenen Woche (gemessen:
// nach der Uebernahme von KW 38 landete die naechste Woche wieder in KW 38).
// Nennt der Azubi ein Datum, stellt senden() die KW danach ohnehin um.
function frischAnfangen() {
    gespraech = leeresGespraech();
    zuletztGeaendert = [];
    if (studioDa()) AIStudio.konfigSetzen({ kw: kwVon(new Date()) });
}
const tagHatInhalt = (t) => !!(t && (t.entries.length || t.dayStatus));
const entwurfHatInhalt = (e) => !!(e && e.tage.some(tagHatInhalt));

function tagIndex(name) {
    const k = String(name || '').trim().toLowerCase();
    const P = (window.AIS_SPRACHE && window.AIS_SPRACHE.PLAN_TAG_INDEX) || {};
    if (k in P) return P[k];
    const i = TAG_DE.findIndex(t => t.toLowerCase() === k);
    return i;
}

// Nimmt die Tage aus der Modell-Antwort und legt sie ueber den alten Entwurf.
// Ein Tag, den das Modell weglaesst, bleibt wie er war — "Tage, die du nicht
// aenderst, kopierst du" haelt sich nicht jedes Modell dran, und ein still
// verschwundener Tag waere Datenverlust.
// Liefert { entwurf, geaendert: [Index …] }.
function entwurfZusammenfuehren(alt, tage, form, erlaubt) {
    const neu = JSON.parse(JSON.stringify(alt || leererEntwurf()));
    const geaendert = [];
    if (!Array.isArray(tage)) return { entwurf: neu, geaendert };
    for (const d of tage) {
        if (!d || typeof d !== 'object') continue;
        const i = tagIndex(d.day);
        if (!(i >= 0 && i <= 4)) continue;
        if (erlaubt && !erlaubt.includes(i)) continue;
        const vorher = JSON.stringify(neu.tage[i]);
        const status = STATUS.includes(d.status) ? d.status : '';
        let entries = Array.isArray(d.entries) ? d.entries : [];
        entries = entries
            .filter(x => typeof x === 'string')
            .map(x => x.replace(/^\s*(?:[-–•*]|\d+[.)])\s+/, '').trim())
            .filter(x => x && x.replace(/[.…\s]/g, ''))
            .map(x => x.slice(0, 600))
            .slice(0, 10);
        if (form === 'fliesstext' && entries.length > 1) entries = [entries.join(' ')];
        const tag = neu.tage[i];
        tag.dayStatus = status;
        tag.entries = status ? [] : entries;
        tag.isSchoolDay = !status && !!d.schule;
        tag.schoolTopic = tag.isSchoolDay ? String(d.thema || '').trim().slice(0, 120) : '';
        if (JSON.stringify(tag) !== vorher) geaendert.push(i);
    }
    return { entwurf: neu, geaendert };
}

// 🔴 Welche Tage eine Nachricht ueberhaupt aendern darf. Gemessen 27.09.2026:
// auf "Donnerstag war doch Feiertag" schrieb Santé alle fuenf Tage neu und
// blaehte sie von drei auf sechs Saetze auf. Nennt die Nachricht Tage, gelten
// nur diese (plus der Wochentag eines genannten Datums). Keine Einschraenkung
// bei Worten fuer "alle/den Rest", bei einer Form-/Umfang-Aenderung (die
// schreibt alles neu) und wenn gar kein Tag genannt ist.
// Rueckgabe: Liste der erlaubten Indizes oder null (= alle).
const TAG_WORT = {
    montag: 0, monday: 0, mon: 0, mo: 0, dienstag: 1, tuesday: 1, tue: 1, di: 1,
    mittwoch: 2, wednesday: 2, wed: 2, mi: 2, donnerstag: 3, thursday: 3, thu: 3, do: 3,
    freitag: 4, friday: 4, fri: 4, fr: 4,
};
const ALLE_WORTE = /\b(rest|sonst|ansonsten|andere[nm]?|übrige[nm]?|uebrige[nm]?|restliche[nm]?|ganze[nm]? woche|alle[nm]?|jeden tag|täglich|taeglich|leere[nm]?|voll|auffüll|auffuell|füll|fuell|every day|whole week|all days|other days|remaining|fill)/i;
function erlaubteTage(nachricht, datum, geaenderteEinstellungen) {
    const s = String(nachricht || '').toLowerCase();
    if (ALLE_WORTE.test(s)) return null;
    if ((geaenderteEinstellungen || []).some(f => f === 'form' || f === 'umfang' || f === 'vorgabe')) return null;
    const tage = new Set();
    // "Montag bis Mittwoch", "mo-mi": der ganze Bereich.
    const bereich = /\b(montag|dienstag|mittwoch|donnerstag|freitag|mo|di|mi|do|fr)s?\.?\s*(?:bis|-|–)\s*(montag|dienstag|mittwoch|donnerstag|freitag|mo|di|mi|do|fr)s?\b/g;
    let m;
    while ((m = bereich.exec(s)) !== null) {
        const a = TAG_WORT[m[1]], b = TAG_WORT[m[2]];
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) tage.add(i);
    }
    // Englisches "do" ist ein Verb, kein Donnerstag — auf /en/ nur die langen Formen.
    const kurz = istEn() ? '' : '|mo|di|mi|do|fr';
    const wort = new RegExp('\\b(montag|dienstag|mittwoch|donnerstag|freitag|monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|fri' + kurz + ')(?:s|en|s)?\\b', 'g');
    while ((m = wort.exec(s)) !== null) tage.add(TAG_WORT[m[1]]);
    if (datum && datum.getDay() >= 1 && datum.getDay() <= 5) tage.add(datum.getDay() - 1);
    return tage.size ? [...tage].sort() : null;
}

// Aus dem Entwurf die Woche im Format von generate() — damit Formular,
// Vorschau, Verlauf und PDF sie genau so nehmen wie jede andere.
function entwurfAlsWoche(e, k) {
    const stunden = (i) => (studioDa() && AIStudio.stundenFuer) ? AIStudio.stundenFuer(i)
        : (typeof bhSollStunden === 'function' ? bhSollStunden(i) : 8);
    const days = e.tage
        .filter(t => tagHatInhalt(t) || k.tage.includes(t.index))
        .map(t => ({
            index: t.index, name: TAGE()[t.index], entries: [...t.entries],
            hours: tagHatInhalt(t) ? stunden(t.index) : 0,
            isSchoolDay: t.isSchoolDay, schoolTopic: t.schoolTopic || null,
            ...(t.dayStatus ? { dayStatus: t.dayStatus } : {}),
        }));
    const jetzt = Date.now();
    return {
        profession: k.beruf, professionName: k.berufName, yearNum: k.lehrjahr,
        umfang: k.umfang, form: k.form, calendarWeek: e.kw || k.kw,
        department: k.abteilung, source: 'cloud', timestamp: jetzt, generatedAt: jetzt,
        days, totalHours: days.reduce((n, d) => n + (Number(d.hours) || 0), 0),
    };
}

// ── Speicher ─────────────────────────────────────────────────────────
// Ein Gespraech gehoert zu EINER Kalenderwoche. Bis v7.9.1 war es ein einziger
// Stand ohne Ende: wer im September "bin Koch" schrieb, fand das im Oktober
// noch vor, und die letzten Runden liefen als Kontext in jede neue Deutung
// (der Assistent fragte einen Fachinformatiker "bist du Koch/in?").
// Die uebernommenen Wochen gehen dabei nicht verloren — die stehen im Verlauf
// (AIStudio.verlauf(), linke Leiste). Weg ist nur das Hin und Her davor.
function wochenSchluessel(d) {
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));        // Donnerstag der ISO-Woche
    const jan4 = new Date(t.getFullYear(), 0, 4);
    const kw = 1 + Math.round(((t - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
    return t.getFullYear() + '-W' + String(kw).padStart(2, '0');
}
const kwVon = (d) => parseInt(wochenSchluessel(d).split('-W')[1], 10);
// Neu anfangen, wenn die Woche gewechselt hat, die Woche schon in den Bericht
// uebernommen wurde, oder der Stand von vor v7.9.1 stammt (ohne Woche).
function istAbgelaufen(g, jetzt) {
    if (!g || !g.nachrichten || !g.nachrichten.length) return false;
    if (g.erledigt) return true;
    return g.woche !== wochenSchluessel(jetzt);
}
function entwurfLesen(roh) {
    const e = leererEntwurf();
    if (!roh || !Array.isArray(roh.tage)) return e;
    e.kw = parseInt(roh.kw) || 0;
    for (const t of roh.tage) {
        const i = t && t.index;
        if (!(i >= 0 && i <= 4)) continue;
        e.tage[i] = {
            index: i, name: TAG_DE[i],
            entries: Array.isArray(t.entries) ? t.entries.filter(x => typeof x === 'string') : [],
            isSchoolDay: !!t.isSchoolDay, schoolTopic: String(t.schoolTopic || ''),
            dayStatus: STATUS.includes(t.dayStatus) ? t.dayStatus : '',
        };
    }
    return e;
}
function laden() {
    try {
        const roh = localStorage.getItem(SPEICHER);
        if (!roh) return;
        const g = JSON.parse(roh);
        if (g && Array.isArray(g.nachrichten)) {
            gespraech = {
                // Karten-Nachrichten aus v7.9.x (Woche je Runde) gibt es nicht
                // mehr; der Entwurf ersetzt sie.
                nachrichten: g.nachrichten.filter(n => n && (n.rolle === 'nutzer' || n.text || n.woche)).slice(-MAX_NACHRICHTEN),
                woche: typeof g.woche === 'string' ? g.woche : '', erledigt: !!g.erledigt,
                entwurf: entwurfLesen(g.entwurf),
            };
        }
    } catch (e) { /* kaputter Stand → leeres Gespraech */ }
}
function speichern() {
    try {
        gespraech.nachrichten = gespraech.nachrichten.slice(-MAX_NACHRICHTEN);
        if (gespraech.nachrichten.length && !gespraech.woche) gespraech.woche = wochenSchluessel(new Date());
        localStorage.setItem(SPEICHER, JSON.stringify(gespraech));
    } catch (e) { /* Speicher voll/Privatmodus: Gespraech lebt nur bis zum Neuladen */ }
}

function limitHeute() {
    const tag = new Date().toISOString().slice(0, 10);
    try {
        const d = JSON.parse(localStorage.getItem(LIMIT_KEY) || 'null');
        return d && d.tag === tag ? d : { tag, n: 0 };
    } catch (e) { return { tag, n: 0 }; }
}
function limitZaehlen() {
    const d = limitHeute(); d.n++;
    try { localStorage.setItem(LIMIT_KEY, JSON.stringify(d)); } catch (e) { }
}

// ── Profilzeile ueber dem Eingabefeld ────────────────────────────────
function profilTeile(k) {
    const t = [];
    if (k.berufName) t.push(k.berufName);
    if (k.bereit) t.push(Lx(k.lehrjahr + '. Lehrjahr', 'Year ' + k.lehrjahr));
    t.push(Lx(...FORM_NAME[k.form] || FORM_NAME.stichpunkte));
    t.push(Lx(...UMFANG_NAME[k.umfang] || UMFANG_NAME.mittel));
    if (k.schultage.length) t.push(Lx('Schule ', 'School ') + k.schultage.map(i => TAGE()[i].slice(0, 2)).join('/'));
    return t;
}
function profilZeichnen() {
    const el = $('aicProfil');
    if (!el || !studioDa()) return;
    const k = AIStudio.konfig();
    const teile = profilTeile(k);
    const feld = $('aicText');
    if (feld) feld.placeholder = entwurfHatInhalt(gespraech.entwurf)
        ? Lx('Noch was? Oder etwas ändern …', 'Anything else, or a change …')
        : Lx('Erzähl, was diese Woche los war …', 'Tell me what happened this week …');
    el.innerHTML = (k.bereit ? '' : '<span class="aic-profil-fehlt">' + Lx('Noch kein Beruf', 'No occupation yet') + '</span>') +
        teile.map(t => '<span class="aic-profil-teil">' + esc(t) + '</span>').join('') +
        '<button type="button" class="aic-profil-knopf" onclick="AISChat.einstellungen()">' +
        Lx('Anpassen', 'Adjust') + '</button>';
}

// ── Verlauf links ────────────────────────────────────────────────────
function verlaufZeichnen() {
    const box = $('aicVerlauf');
    if (!box || !studioDa()) return;
    const liste = (AIStudio.verlauf() || []).map((w, i) => ({ w, i })).reverse().slice(0, 30);
    if (!liste.length) {
        box.innerHTML = '<p class="aic-verlauf-leer">' + Lx('Deine Wochen erscheinen hier.', 'Your weeks show up here.') + '</p>';
        return;
    }
    box.innerHTML = liste.map(({ w, i }) => {
        const kw = w.calendarWeek ? Lx('KW ', 'Week ') + w.calendarWeek : Lx('Woche', 'Week');
        const wann = w.generatedAt || w.timestamp;
        const datum = wann ? new Date(wann).toLocaleDateString(istEn() ? 'en-GB' : 'de-DE', { day: 'numeric', month: 'short' }) : '';
        const erste = (w.days || []).find(d => d.entries && d.entries.length);
        return '<button type="button" class="aic-verlauf-eintrag" onclick="AISChat.ausVerlauf(' + i + ')">' +
            '<span class="aic-verlauf-kw">' + esc(kw) + (datum ? '<span>' + esc(datum) + '</span>' : '') + '</span>' +
            '<span class="aic-verlauf-vor">' + esc(erste ? erste.entries[0] : '') + '</span></button>';
    }).join('');
}

// ── Nachrichten ──────────────────────────────────────────────────────
const MARKE = '<svg class="icon" aria-hidden="true"><use href="#i-sparkles"/></svg>';

// Dezimaltrennzeichen der Sprache: "8,75 h", auf /en/ "8.75 h".
function stunden(h) {
    const n = Number(h);
    return Number.isFinite(n) ? n.toLocaleString(istEn() ? 'en-GB' : 'de-DE', { maximumFractionDigits: 2 }) : String(h);
}
const statusText = (s) => s === 'krank' ? Lx('Krank', 'Sick') : s === 'urlaub' ? Lx('Urlaub', 'Holiday') : Lx('Feiertag', 'Public holiday');

function tagHTML(t, opt) {
    const hatInhalt = tagHatInhalt(t);
    const kopf = '<div class="aic-tag-kopf"><span class="aic-tag-name">' + esc(TAGE()[t.index] || t.name) + '</span>' +
        (t.isSchoolDay ? '<span class="aic-tag-marke">' + Lx('Schule', 'School') + '</span>' : '') +
        (opt.stunden && hatInhalt ? '<span class="aic-tag-h">' + esc(stunden(opt.stunden(t.index))) + ' h</span>' : '') + '</div>';
    let rumpf;
    if (t.dayStatus) rumpf = '<p class="aic-tag-status">' + esc(statusText(t.dayStatus)) + '</p>';
    else if (!t.entries.length) rumpf = '<p class="aic-tag-leer">' + Lx('Noch nichts eingetragen', 'Nothing entered yet') + '</p>';
    else rumpf = (t.isSchoolDay && t.schoolTopic ? '<p class="aic-tag-thema">' + esc(t.schoolTopic) + '</p>' : '') +
        '<ul class="aic-tag-liste">' + t.entries.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
    const kl = 'aic-tag' + (hatInhalt ? '' : ' is-leer') + (opt.neu && opt.neu.includes(t.index) ? ' is-neu' : '');
    return '<div class="' + kl + '">' + kopf + '<div class="aic-tag-rumpf">' + rumpf + '</div></div>';
}

// Die EINE Karte, die mitwaechst. Sichtbar sind die Arbeitstage aus den
// Einstellungen plus jeder Tag, der Inhalt hat.
function entwurfHTML() {
    const e = gespraech.entwurf;
    const k = studioDa() ? AIStudio.konfig() : { tage: [0, 1, 2, 3, 4], kw: 0 };
    const tage = e.tage.filter(t => tagHatInhalt(t) || k.tage.includes(t.index));
    const gefuellt = tage.filter(tagHatInhalt).length;
    const leer = tage.length - gefuellt;
    const sf = (studioDa() && AIStudio.stundenFuer) ? AIStudio.stundenFuer : null;
    return '<article class="aic-woche is-entwurf" aria-label="' + esc(Lx('Wochenentwurf', 'Week draft')) + '">' +
        '<header class="aic-woche-kopf"><span>' + esc(Lx('KW ', 'Week ') + (e.kw || k.kw)) + '</span>' +
        '<span class="aic-woche-meta">' + esc(Lx(gefuellt + ' von ' + tage.length + ' Tagen eingetragen', gefuellt + ' of ' + tage.length + ' days filled in')) + '</span></header>' +
        '<div class="aic-woche-tage">' + tage.map(t => tagHTML(t, { stunden: sf, neu: zuletztGeaendert })).join('') + '</div>' +
        '<footer class="aic-woche-fuss">' +
        '<button type="button" class="aic-knopf is-haupt" onclick="AISChat.entwurfUebernehmen()"' + (gefuellt ? '' : ' disabled') + '>' +
        '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>' + Lx('In den Bericht übernehmen', 'Add to report') + '</button>' +
        (leer ? '<button type="button" class="aic-knopf" onclick="AISChat.fuellen()">' +
            esc(leer === 1 ? Lx('Leeren Tag füllen', 'Fill the empty day') : Lx(leer + ' leere Tage füllen', 'Fill ' + leer + ' empty days')) + '</button>' : '') +
        '<button type="button" class="aic-knopf" onclick="AISChat.entwurfBearbeiten()"' + (gefuellt ? '' : ' disabled') + '>' + Lx('Bearbeiten', 'Edit') + '</button>' +
        '</footer></article>';
}

// Karte einer frueheren Woche aus dem Verlauf — fest, nicht der Entwurf.
function wocheHTML(w, nr) {
    if (!w || !Array.isArray(w.days) || !w.days.length) return '';
    const kw = w.calendarWeek ? Lx('KW ', 'Week ') + w.calendarWeek : '';
    const tage = w.days.map(d => tagHTML({
        index: d.index, name: d.name, entries: d.entries || [], isSchoolDay: !!d.isSchoolDay,
        schoolTopic: d.schoolTopic || '', dayStatus: d.dayStatus || '',
    }, { stunden: () => d.hours })).join('');
    return '<article class="aic-woche">' +
        '<header class="aic-woche-kopf"><span>' + esc(kw || Lx('Woche', 'Week')) + '</span>' +
        '<span class="aic-woche-meta">' + esc(Lx(w.days.length + ' Tage', w.days.length + ' days')) + '</span></header>' +
        '<div class="aic-woche-tage">' + tage + '</div>' +
        '<footer class="aic-woche-fuss">' +
        '<button type="button" class="aic-knopf is-haupt" onclick="AISChat.uebernehmen(' + nr + ')">' +
        '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>' + Lx('In den Bericht übernehmen', 'Add to report') + '</button>' +
        '<button type="button" class="aic-knopf" onclick="AISChat.bearbeiten(' + nr + ')">' + Lx('Bearbeiten', 'Edit') + '</button>' +
        '</footer></article>';
}

function nachrichtHTML(n, nr) {
    if (n.rolle === 'nutzer') {
        return '<div class="aic-n is-nutzer"><p class="aic-blase">' + esc(n.text) + '</p></div>';
    }
    const chips = (n.chips || []).length
        ? '<div class="aic-chips">' + n.chips.map(c => '<span class="aic-chip">' + esc(c) + '</span>').join('') + '</div>' : '';
    const knoepfe = [];
    if (n.knopf === 'ohneKi' || n.knopf === 'ohneKi+einstellungen')
        knoepfe.push('<button type="button" class="aic-knopf" onclick="AISChat.ohneKi()">' + Lx('Ohne KI schreiben', 'Write without AI') + '</button>');
    if (n.knopf === 'einstellungen' || n.knopf === 'ohneKi+einstellungen')
        knoepfe.push('<button type="button" class="aic-knopf" onclick="AISChat.einstellungen()">' + Lx('Einstellungen öffnen', 'Open settings') + '</button>');
    return '<div class="aic-n is-assistent"><span class="aic-avatar">' + MARKE + '</span><div class="aic-inhalt">' +
        (n.text ? '<p class="aic-text">' + esc(n.text) + '</p>' : '') + chips +
        (knoepfe.length ? '<div class="aic-knoepfe">' + knoepfe.join('') + '</div>' : '') +
        (n.woche ? wocheHTML(n.woche, nr) : '') + '</div></div>';
}

function leerHTML() {
    const k = studioDa() ? AIStudio.konfig() : { bereit: false };
    const titel = k.bereit
        ? Lx('Was hast du diese Woche gemacht?', 'What did you do this week?')
        : Lx('Erzähl kurz, was du lernst.', 'Tell me briefly what you are training as.');
    const text = k.bereit
        ? Lx('Schreib es so, wie du es einem Kollegen erzählen würdest. Ich trage es sofort in die Woche ein, Tag für Tag.',
             'Write it the way you would tell a colleague. I add it to the week straight away, day by day.')
        : Lx('Beruf, Lehrjahr und wie dein Ausbilder die Berichte haben will. Danach erzählst du nur noch, was los war.',
             'Occupation, year and how your trainer wants the reports. After that you only tell me what happened.');
    const vorschlaege = k.bereit
        ? [Lx('Mittwoch war Berufsschule, sonst habe ich die ganze Woche Rechner aufgesetzt', 'Wednesday was vocational school, the rest of the week I set up computers'),
           Lx('Montag und Dienstag Kundentermine, Donnerstag Inventur', 'Monday and Tuesday customer appointments, Thursday stocktaking'),
           Lx('Freitag war ich krank', 'I was sick on Friday')]
        : [Lx('Ich bin Bäcker im 1. Lehrjahr, mein Ausbilder ist streng, nur Stichpunkte', 'I am a baker in year 1, my trainer is strict, bullet points only'),
           Lx('Fachinformatiker Systemintegration, 2. Lehrjahr, ganze Sätze', 'IT specialist for system integration, year 2, full sentences'),
           Lx('Kauffrau für Büromanagement, 3. Jahr, kurz und in Ich-Form', 'Office management clerk, year 3, short and in first person')];
    return '<div class="aic-leer">' +
        '<span class="aic-leer-marke">' + MARKE + '</span>' +
        '<h3 class="aic-leer-t">' + esc(titel) + '</h3>' +
        '<p class="aic-leer-s">' + esc(text) + '</p>' +
        '<div class="aic-vorschlaege">' + vorschlaege.map(v =>
            '<button type="button" class="aic-vorschlag" data-text="' + esc(v) + '" onclick="AISChat.vorschlag(this)">' + esc(v) + '</button>').join('') +
        '</div></div>';
}

// Der Entwurf steht hinter der LETZTEN Antwort des Assistenten — dort, wo er
// zuletzt geaendert wurde. Eine neue Frage des Nutzers steht darunter.
function zeichnen() {
    const box = $('aicNachrichten');
    if (!box) return;
    const n = gespraech.nachrichten;
    if (!n.length && !entwurfHatInhalt(gespraech.entwurf)) {
        box.innerHTML = leerHTML();
    } else {
        let letzte = -1;
        n.forEach((x, i) => { if (x.rolle === 'assistent' && !x.woche) letzte = i; });
        const karte = entwurfHatInhalt(gespraech.entwurf) && !gespraech.erledigt ? entwurfHTML() : '';
        let html = '';
        n.forEach((x, i) => {
            html += nachrichtHTML(x, i);
            if (i === letzte && karte) html += '<div class="aic-n is-karte">' + karte + '</div>';
        });
        if (letzte === -1 && karte) html += '<div class="aic-n is-karte">' + karte + '</div>';
        box.innerHTML = html + (beschaeftigt ? tippenHTML() : '');
    }
    profilZeichnen();
    nachUnten();
}
function tippenHTML() {
    return '<div class="aic-n is-assistent is-tippt" role="status"><span class="aic-avatar">' + MARKE + '</span>' +
        '<div class="aic-inhalt"><p class="aic-tippt"><span></span><span></span><span></span>' +
        '<em>' + esc(beschaeftigt === 'lokal' ? Lx('Schreibe deine Woche …', 'Writing your week …') : Lx('Schreibt …', 'Writing …')) + '</em></p></div></div>';
}
function nachUnten() {
    const s = $('aicScroll');
    if (s) requestAnimationFrame(() => { s.scrollTop = s.scrollHeight; });
}
function sagen(n) {
    gespraech.nachrichten.push(n);
    speichern();
    zeichnen();
}

// ── Datum und Kalenderwoche ──────────────────────────────────────────
// Das Modell rechnet Kalenderwochen falsch (16.09.2026 → KW 39, richtig 38).
// Nachschlagen statt rechnen: die Wochen um heute mit Montag–Sonntag.
function kwTabelle(heute) {
    const mo = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
    mo.setDate(mo.getDate() - ((mo.getDay() + 6) % 7));
    const fmt = (d) => d.getDate() + '.' + (d.getMonth() + 1) + '.';
    const zeilen = [];
    for (let w = -4; w <= 1; w++) {
        const a = new Date(mo); a.setDate(a.getDate() + w * 7);
        const b = new Date(a); b.setDate(b.getDate() + 6);
        zeilen.push('KW ' + kwVon(a) + ' = ' + fmt(a) + '–' + fmt(b) + (w === 0 ? ' (diese Woche)' : ''));
    }
    return zeilen.join('; ');
}

// 🔴 Auch mit der Tabelle im Prompt trifft die Kette die KW nicht verlaesslich
// (27.09.2026, viermal "16. Mi": KW 38, fehlt, fehlt, KW 40 — und einmal
// schultage [0] statt [2]). Steht in der Nachricht ein EINDEUTIGES Datum,
// rechnet der Client die Woche selbst und ueberstimmt das Modell; den
// Wochentag schreibt er dem Modell als Hinweis an die Nachricht.
// Eindeutig heisst: "16.9." / "16.09.2026", "16. September", oder "16." mit
// Wochentag daneben ("16. Mi", "Mi 16."). Ein nacktes "2." bleibt liegen —
// das ist fast immer "2. Lehrjahr", nie ein Datum.
const MONATE = ['jan', 'feb', 'mär', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];
const WT_KURZ = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 0 };
function datumAusText(text, heute) {
    const s = String(text || '').toLowerCase();
    const h = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate());
    const gueltig = (d, t, m, j) => d.getFullYear() === j && d.getMonth() === m && d.getDate() === t;

    let m = s.match(/(?:^|[^\d])(\d{1,2})\.\s*(\d{1,2})\.(\d{2,4})?/);
    let tag, monat, jahr;
    if (m) { tag = +m[1]; monat = +m[2] - 1; jahr = m[3] ? +m[3] : null; }
    if (!m) {
        m = s.match(/(?:^|[^\d])(\d{1,2})\.?\s*(jan|feb|mär|maer|apr|mai|jun|jul|aug|sep|okt|nov|dez)/);
        if (m) { tag = +m[1]; monat = MONATE.indexOf(m[2] === 'maer' ? 'mär' : m[2]); jahr = null; }
    }
    if (m) {
        if (jahr != null && jahr < 100) jahr += 2000;
        let j = jahr != null ? jahr : h.getFullYear();
        let d = new Date(j, monat, tag);
        // Ohne Jahr: ein Datum weit in der Zukunft meint das Vorjahr ("28.12." im Januar).
        if (jahr == null && d - h > 60 * 864e5) { j--; d = new Date(j, monat, tag); }
        return gueltig(d, tag, monat, j) ? d : null;
    }

    // "16. Mi" oder "Mi 16." / "Mittwoch, den 16." — Tag nur mit Wochentag daneben.
    m = s.match(/(?:^|[^\d])(\d{1,2})\.\s*(mo|di|mi|do|fr|sa|so)[a-z]*\b/) ||
        s.match(/\b(mo|di|mi|do|fr|sa|so)[a-z]*\.?,?\s*(?:den\s+)?(\d{1,2})\./);
    if (!m) return null;
    const zahl = /^\d/.test(m[1]) ? +m[1] : +m[2];
    const wt = WT_KURZ[/^\d/.test(m[1]) ? m[2] : m[1]];
    // Im Fenster der KW-Tabelle suchen: fuenf Wochen zurueck, eine vor.
    for (let i = -35; i <= 13; i++) {
        const d = new Date(h); d.setDate(d.getDate() + i);
        if (d.getDate() === zahl && d.getDay() === wt) return d;
    }
    return null;
}
function datumHinweis(d) {
    const wt = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][d.getDay()];
    return '[Hinweis der App: das genannte Datum ist ' + wt + ', ' + d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear() + ', KW ' + kwVon(d) + ']';
}

// ── Das Gehirn: ein Aufruf, der den Entwurf schreibt ─────────────────
function berufsliste() {
    const P = (window.AIS_BERUFE && window.AIS_BERUFE.PROFESSIONS) || {};
    return Object.keys(P).map(id => id + '=' + P[id].name).join('; ');
}
function entwurfFuerPrompt(e) {
    return JSON.stringify(e.tage.map(t => ({
        day: t.name, entries: t.entries, schule: t.isSchoolDay, thema: t.schoolTopic, status: t.dayStatus,
    })));
}

function systemPrompt() {
    const k = AIStudio.konfig();
    const heute = new Date();
    const C = window.AIS_CLOUD || {};
    const F = (C.CLOUD_FORM && (C.CLOUD_FORM[k.form] || C.CLOUD_FORM.stichpunkte)) || { name: k.form, stil: [], beispiel: '[]', schulBeispiel: '[]' };
    const U = (C.CLOUD_UMFANG && C.CLOUD_UMFANG[k.umfang]) || {};
    const umfang = k.form === 'fliesstext' ? U.fliesstext : U.stichpunkte;
    const tage = k.tage.map(i => TAG_DE[i]).join(', ');
    return [
        'Du bist der Assistent im digitalen Berichtsheft (Ausbildungsnachweis) von MyWorkLog. Ein Azubi erzählt dir, was er gemacht hat, und du SCHREIBST es sofort in seinen Wochenbericht. Du handelst, statt nachzufragen.',
        '',
        'Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Text davor oder danach:',
        '{"antwort":"...","einstellungen":{},"days":[{"day":"Montag","entries":[],"schule":false,"thema":"","status":""}, … alle fünf Tage Montag bis Freitag]}',
        '',
        '[DAYS] Der KOMPLETTE Wochenentwurf NACH dieser Nachricht, immer alle fünf Tage Montag bis Freitag in dieser Reihenfolge. "day" ist ein fester Schlüssel und bleibt deutsch.',
        '- Tage, die sich nicht ändern, übernimmst du wörtlich aus dem AKTUELLEN ENTWURF unten — auch wenn sie dir zu kurz erscheinen. Ein Tag wird nur neu geschrieben, wenn die Nachricht ihn betrifft.',
        '- Was der Azubi erzählt, trägst du beim passenden Tag ein. Nennt er einen Tag oder ein Datum, nur dort. Nennt er keinen Tag ("diese Woche habe ich X gemacht"), verteile es auf die Arbeitstage, die noch leer sind.',
        '- "nur X", "sonst nur X", "den Rest der Woche X", "ansonsten X", "die anderen Tage X": X gilt für ALLE Arbeitstage, die im Entwurf noch leer sind. Sofort eintragen, NICHT zurückfragen. Beispiel: im Entwurf steht nur Mittwoch (Schule), der Azubi schreibt "nur PCs ausgepustet" → Montag, Dienstag, Donnerstag und Freitag bekommen das Reinigen der PCs.',
        '- Im Zweifel trägst du ein, statt zu fragen. Ändern kann er es danach mit einem Satz.',
        '- ERFINDE NICHTS. Keine Tätigkeit, die der Azubi nicht genannt hat. Eine genannte Tätigkeit darfst du in ihre üblichen Teilschritte zerlegen (z. B. "PCs ausgepustet" → Gehäuse geöffnet, Staub mit Druckluft entfernt, Lüfter geprüft). Ein Tag ohne Angabe bleibt leer: "entries": [].',
        '- Steht dieselbe Tätigkeit an mehreren Tagen, schreib NICHT jeden Tag denselben Satz: formuliere je Tag anders und nimm je Tag andere Teilschritte derselben Tätigkeit.',
        '- AUSNAHME: bittet er ausdrücklich ums Auffüllen ("füll den Rest", "denk dir was aus", "mach die Woche voll", "die leeren Tage füllen"), füllst du NUR die leeren Arbeitstage mit typischen Tätigkeiten für seinen Beruf und sein Lehrjahr. Gefüllte Tage bleiben unverändert. Ein leerer REGELMÄSSIGER Schultag (siehe unten) wird dabei als Schultag gefüllt: "schule": true, ein typisches Thema seines Lehrjahrs in "thema".',
        '- Änderungswünsche ("Mittwoch ausführlicher", "Dienstag in Ich-Form", "Donnerstag löschen", "das mit dem Server war Freitag") betreffen nur die genannten Tage.',
        '- Berufsschule: "schule": true und in "thema" das Fach oder worum es ging (kurz, z. B. "Erster Schultag, Kennenlernen"). Die entries beschreiben den Schultag.',
        '- Krank/Urlaub/Feiertag: "status": "krank" | "urlaub" | "feiertag" und "entries": []. "status": "" heißt normaler Tag.',
        '- Umgangssprache wird zu sachlicher Berichtssprache, der Inhalt bleibt ("den ganzen Kack durchgegangen" → "Organisatorisches besprochen"). Fachbegriffe bleiben, wie sie sind.',
        '- Arbeitstage laut Einstellung: ' + (tage || 'Montag bis Freitag') + '.',
        '',
        '[SCHREIBFORM der entries: ' + F.name + ']',
        ...F.stil.map(s => '- ' + s),
        '- Umfang: ' + (umfang || 'wie im Beispiel') + ', aber nur so viel, wie sich aus seinen Angaben ohne Erfinden ergibt.',
        k.vorgabe ? '- Vorgabe des Ausbilders: ' + k.vorgabe : '',
        'Beispiel für entries eines Arbeitstags: ' + F.beispiel,
        'Beispiel für entries eines Schultags: ' + F.schulBeispiel,
        '[SPRACHE] entries auf ' + (istEn() ? 'Englisch' : 'Deutsch') + '.',
        '',
        '[EINSTELLUNGEN] einstellungen: NUR Felder, die der Azubi in DIESER Nachricht nennt oder ändert. Erlaubt:',
        '- beruf: eine ID aus der Berufsliste unten, wenn der Beruf dort passt; berufFrei: Berufsbezeichnung als Text, wenn nicht. Nie beides.',
        '- lehrjahr: 1 bis 4',
        '- form: "stichpunkte" | "saetze" (ganze Sätze, sachlich, 3. Person) | "ichform" | "fliesstext"',
        '- umfang: "kurz" | "mittel" | "ausfuehrlich"   ("Ausbilder streng" → "ausfuehrlich", "locker" → "kurz")',
        '- vorgabe: besondere Wünsche des Ausbilders als kurzer Satz',
        '- abteilung: Text',
        '- tage: REGELMÄSSIGE Arbeitstage als Liste 0=Montag bis 4=Freitag, nur wenn er sagt, dass er z. B. nie freitags arbeitet',
        '- schultage: REGELMÄSSIGE Berufsschultage 0 bis 4, nur bei "immer"/"jeden" ("Mittwoch ist immer Schule"). Ein einzelner Schultag gehört NUR in days.',
        '- kw: Kalenderwoche aus der Tabelle unten, wenn er ein Datum oder "letzte Woche" nennt. Nicht selbst rechnen.',
        'Ändert er Schreibform oder Umfang, schreibst du die schon gefüllten Tage in der neuen Form neu.',
        '',
        '[ANTWORT] antwort: deine Rückmeldung an den Azubi, 1 bis 2 kurze Sätze, Du-Form, ' + (istEn() ? 'Englisch' : 'Deutsch') + ', kein Markdown, keine Aufzählung.',
        '- Sag konkret, was du eingetragen oder geändert hast ("Mittwoch steht drin: erster Schultag in der 11c.").',
        '- HÖCHSTENS eine Frage, und nur, wenn noch Arbeitstage leer sind UND du in deiner letzten Antwort nicht schon gefragt hast. Dann nenne die leeren Tage und biete an, sie zu füllen.',
        '- KEINE Frage, wenn er signalisiert, dass das alles war ("nur", "sonst nichts", "das wars", "passt") oder alle Arbeitstage gefüllt sind. Dann sag, dass er die Woche übernehmen kann.',
        '- Fehlt der Beruf, schreib trotzdem ein, was er erzählt hat, und frag nebenbei nach dem Beruf.',
        'Beispiele (nur der Ton):',
        '  "Mittwoch steht drin: erster Schultag in der 11c mit den neuen Lehrern. Montag, Dienstag, Donnerstag und Freitag sind noch leer – was war da, oder soll ich sie füllen?"',
        '  "Erledigt: Montag, Dienstag, Donnerstag und Freitag stehen jetzt mit PCs reinigen drin. Die Woche ist komplett, du kannst sie übernehmen."',
        '  "Freitag ist als krank eingetragen."',
        '',
        'Stand der Einstellungen: ' + JSON.stringify({
            beruf: k.beruf, berufName: k.berufName, lehrjahr: k.bereit ? k.lehrjahr : null, form: k.form, umfang: k.umfang,
            vorgabe: k.vorgabe, abteilung: k.abteilung, tage: k.tage, schultage: k.schultage, kw: gespraech.entwurf.kw || k.kw,
        }),
        'Regelmäßige Schultage (' + (k.schultage.length ? k.schultage.map(i => TAG_DE[i]).join(', ') : 'keine') + ') sind nur ein Hinweis: ist dort noch nichts erzählt, bleibt der Tag leer.',
        'AKTUELLER ENTWURF (KW ' + (gespraech.entwurf.kw || k.kw) + '): ' + entwurfFuerPrompt(gespraech.entwurf),
        'Berufsliste: ' + berufsliste(),
        'Heute ist ' + heute.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.',
        'Kalenderwochen: ' + kwTabelle(heute),
    ].filter(z => z !== '').join('\n');
}

function ersterJsonWert(text) {
    const s = String(text || '').trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const start = s.indexOf('{');
    if (start === -1) return null;
    let tiefe = 0, inStr = false, esc_ = false;
    for (let i = start; i < s.length; i++) {
        const ch = s[i];
        if (esc_) { esc_ = false; continue; }
        if (ch === '\\') { if (inStr) esc_ = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') tiefe++;
        else if (ch === '}' && --tiefe === 0) {
            try { return JSON.parse(s.slice(start, i + 1)); } catch (e) { return null; }
        }
    }
    return null;
}

async function denken(nachricht, hinweis) {
    if (limitHeute().n >= LIMIT_TAG) throw new Error('limit');
    const proxy = (window.AIS_CLOUD && window.AIS_CLOUD.CLOUD_PROXY) || 'https://ai-proxy.myworklog.de';
    // Die letzten Runden als Gespraech mitgeben, damit "mach es ausfuehrlicher"
    // weiss, worauf es sich bezieht. Der Entwurf selbst steht im System-Prompt.
    const runden = gespraech.nachrichten.slice(-KONTEXT_RUNDEN * 2)
        .filter(n => n.text)
        .map(n => ({ role: n.rolle === 'nutzer' ? 'user' : 'model', parts: [{ text: n.text }] }));
    // Die gerade gesendete Nachricht steht schon im Gespraech — nicht doppelt.
    const letzte = runden[runden.length - 1];
    if (letzte && letzte.role === 'user' && letzte.parts[0].text === nachricht) runden.pop();
    runden.push({ role: 'user', parts: [{ text: nachricht + (hinweis ? '\n\n' + hinweis : '') }] });
    limitZaehlen();
    const ctrl = new AbortController();
    const uhr = setTimeout(() => ctrl.abort(), 95000);
    try {
        const res = await fetch(proxy.replace(/\/$/, '') + '/', {
            method: 'POST',
            signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt() }] },
                contents: runden,
                generationConfig: { temperature: 0.3, topP: 0.9, maxOutputTokens: 3000 },
            }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        const obj = ersterJsonWert(text);
        if (!obj || typeof obj.antwort !== 'string' || !obj.antwort.trim()) throw new Error('unlesbar');
        return obj;
    } finally {
        clearTimeout(uhr);
    }
}

// Was umgestellt wurde, als kurze Marken unter der Antwort — aus dem STAND
// nach dem Setzen gelesen, nicht aus dem, was das Modell behauptet hat.
function chipsFuer(geaendert) {
    const k = AIStudio.konfig();
    const c = [];
    geaendert.forEach(f => {
        if (f === 'beruf') c.push(k.berufName);
        else if (f === 'lehrjahr') c.push(Lx(k.lehrjahr + '. Lehrjahr', 'Year ' + k.lehrjahr));
        else if (f === 'form') c.push(Lx(...FORM_NAME[k.form]));
        else if (f === 'umfang') c.push(Lx('Umfang: ', 'Length: ') + Lx(...UMFANG_NAME[k.umfang]));
        else if (f === 'vorgabe') c.push(Lx('Vorgabe: ', 'Rule: ') + k.vorgabe);
        else if (f === 'abteilung') c.push(Lx('Abteilung: ', 'Department: ') + k.abteilung);
        else if (f === 'schultage') c.push(k.schultage.length ? Lx('Schule immer: ', 'School always: ') + k.schultage.map(i => TAGE()[i]).join(', ') : Lx('Kein fester Schultag', 'No fixed school day'));
        else if (f === 'tage') c.push(Lx('Tage: ', 'Days: ') + k.tage.map(i => TAGE()[i].slice(0, 2)).join(' '));
        else if (f === 'kw') c.push(Lx('KW ', 'Week ') + k.kw);
        else if (f === 'stimmung') c.push(Lx('Woche: ', 'Week: ') + k.stimmung);
    });
    return c.filter(Boolean);
}

// Die Einstellungen aus der Antwort. tagStatus kommt nicht mehr ueber die
// Einstellungen, sondern steht am Tag im Entwurf — sonst gaelte "Freitag
// krank" auch fuer die naechste Woche.
//
// 🔴 Modelle spiegeln gern den ganzen "Stand der Einstellungen" zurueck
// (gemessen 27.09.2026, Fin: "sonst nur PCs ausgepustet" → einstellungen mit
// allen neun Feldern). Gleiche Werte aendern nichts, aber ein gespiegeltes
// schultage: [] hat einen festen Schultag geloescht. Tage und Schultage gelten
// deshalb nur, wenn die Nachricht ueberhaupt von Wochentagen, Schule oder
// Arbeitstagen spricht.
const SPRICHT_VON_TAGEN = /\b(mo|di|mi|do|fr|montag|dienstag|mittwoch|donnerstag|freitag|mon|tue|wed|thu|fri|monday|tuesday|wednesday|thursday|friday|schule|berufsschule|school|arbeitstag|arbeite|teilzeit)\w*/i;
function einstellungenAus(ergebnis, datum, nachricht) {
    const e = Object.assign({}, (ergebnis && ergebnis.einstellungen) || {});
    delete e.tagStatus;
    if (!SPRICHT_VON_TAGEN.test(String(nachricht || ''))) { delete e.tage; delete e.schultage; }
    if (datum) e.kw = kwVon(datum);
    return e;
}

// ── Senden ───────────────────────────────────────────────────────────
async function senden(e, vorgabeText) {
    if (e) e.preventDefault();
    const feld = $('aicText');
    const text = (vorgabeText || (feld && feld.value) || '').trim();
    if (!text || beschaeftigt) return;
    if (feld && !vorgabeText) { feld.value = ''; feldGroesse(); }
    // Die Woche war schon uebernommen und die Seite stand offen: frisch anfangen.
    if (gespraech.erledigt) frischAnfangen();
    zuletztGeaendert = [];
    gespraech.nachrichten.push({ rolle: 'nutzer', text });
    beschaeftigt = 'denken';
    speichern();
    zeichnen();
    knopfZustand();

    const datum = datumAusText(text, new Date());
    let ergebnis = null, grund = '';
    // "Cloud-KI aktiv" ist der einzige Ausstieg (Notiz). Bis v7.9.3 schickte
    // der Chat jede Nachricht trotzdem an /verstehen — wer die Cloud bewusst
    // abgeschaltet hatte, wurde nicht gefragt.
    if (!AIStudio.konfig().cloud) grund = 'aus';
    else {
        try { ergebnis = await denken(text, datum ? datumHinweis(datum) : ''); }
        catch (err) { grund = err && err.message; }
    }
    beschaeftigt = false;

    if (!ergebnis) { ohneAntwort(grund); return; }

    const geaendert = AIStudio.konfigSetzen(einstellungenAus(ergebnis, datum, text));
    const k = AIStudio.konfig();
    const zus = entwurfZusammenfuehren(gespraech.entwurf, ergebnis.days, k.form,
        erlaubteTage(text, datum, geaendert));
    zus.entwurf.kw = datum ? kwVon(datum) : (geaendert.includes('kw') ? k.kw : (gespraech.entwurf.kw || k.kw));
    gespraech.entwurf = zus.entwurf;
    zuletztGeaendert = zus.geaendert;
    sagen({ rolle: 'assistent', text: ergebnis.antwort.trim().slice(0, 600), chips: chipsFuer(geaendert) });
    knopfZustand();
}

// Ohne KI: nichts erfinden, nichts still weiterrechnen. Die Nachricht bleibt
// im Gespraech; "Ohne KI schreiben" ist ein ausdruecklicher Klick.
function ohneAntwort(grund) {
    const k = AIStudio.konfig();
    if (grund === 'aus') {
        sagen({ rolle: 'assistent', knopf: k.bereit ? 'ohneKi+einstellungen' : 'einstellungen',
            text: Lx('Die Cloud-KI ist in deinen Einstellungen ausgeschaltet, deshalb schicke ich nichts weg. Zum Verstehen deiner Nachrichten brauche ich sie: schalte sie unter „Einstellungen“ ein. Oder lass die Woche ohne KI aus einer Vorlage schreiben.',
                     'Cloud AI is switched off in your settings, so nothing is sent. I need it to understand your messages: switch it on under “Settings”. Or write the week from a template without AI.') });
        knopfZustand();
        return;
    }
    const warum = grund === 'limit'
        ? Lx('Für heute habe ich genug Nachrichten beantwortet.', 'I have answered enough messages for today.')
        : Lx('Ich erreiche die KI gerade nicht.', 'I cannot reach the AI right now.');
    const weiter = k.bereit
        ? Lx(' Schick die Nachricht gleich noch einmal, oder lass die Woche ohne KI schreiben. Dann füllt eine Vorlage alle Tage auf, deine Angaben kommen wörtlich hinein.',
             ' Send the message again in a moment, or write the week without AI. A template then fills every day, with your details included word for word.')
        : Lx(' Stell deinen Beruf und dein Lehrjahr kurz per Hand ein, dann geht es weiter.', ' Set your occupation and year by hand, then we can continue.');
    sagen({ rolle: 'assistent', text: warum + weiter, knopf: k.bereit ? 'ohneKi' : 'einstellungen' });
    knopfZustand();
}

// Die lokale Engine auf alles, was der Azubi in diesem Gespraech erzaehlt hat.
// Sie fuellt jeden Tag (sie kann nur ganze Wochen) — deshalb nur auf Klick.
async function ohneKi() {
    if (beschaeftigt || !studioDa()) return;
    const text = gespraech.nachrichten.filter(n => n.rolle === 'nutzer').map(n => n.text).join('\n');
    if (!text) return;
    beschaeftigt = 'lokal';
    zeichnen();
    knopfZustand();
    let ok = false;
    const vorher = AIStudio.woche();
    try { ok = await AIStudio.erzeugeAusText(text); } catch (e) { ok = false; }
    beschaeftigt = false;
    const w = AIStudio.woche();
    if (ok && w && w !== vorher) {
        const tage = (w.days || []).map(d => ({
            day: TAG_DE[d.index], entries: d.entries, schule: d.isSchoolDay, thema: d.schoolTopic, status: d.dayStatus || '',
        }));
        // Die Engine schreibt "• " vor Stichpunkte; der Entwurf fuehrt Eintraege ohne.
        const zus = entwurfZusammenfuehren(leererEntwurf(), tage, AIStudio.konfig().form);
        zus.entwurf.kw = w.calendarWeek || AIStudio.konfig().kw;
        gespraech.entwurf = zus.entwurf;
        zuletztGeaendert = zus.geaendert;
        sagen({ rolle: 'assistent', text: Lx('Hier ist die Woche aus der Vorlage. Lies sie durch, bevor du sie übernimmst.', 'Here is the week from the template. Read it before you add it.') });
    } else {
        sagen({ rolle: 'assistent', knopf: 'einstellungen',
            text: Lx('Auch ohne KI ließ sich die Woche nicht schreiben. Prüf die Einstellungen.', 'The week could not be written without AI either. Check the settings.') });
    }
    knopfZustand();
}

// ── Oeffnen, Schliessen, Aktionen ────────────────────────────────────
function knopfZustand() {
    const b = $('aicSenden');
    if (b) b.disabled = !!beschaeftigt || !($('aicText').value || '').trim();
}
function feldGroesse() {
    const f = $('aicText');
    if (!f) return;
    f.style.height = 'auto';
    f.style.height = Math.min(f.scrollHeight, 200) + 'px';
}

function oeffnen() {
    const v = $('aicView');
    if (!v || !studioDa()) return;
    offen = true;
    v.hidden = false;
    // Die Seite kann tagelang offen stehen — deshalb hier pruefen, nicht nur beim Laden.
    if (istAbgelaufen(gespraech, new Date())) { frischAnfangen(); speichern(); }
    document.body.classList.add('aic-offen');
    zeichnen();
    verlaufZeichnen();
    knopfZustand();
    setTimeout(() => { const f = $('aicText'); if (f) f.focus(); }, 60);
}
function schliessen() {
    const v = $('aicView');
    if (!v) return;
    offen = false;
    v.hidden = true;
    v.classList.remove('rail-auf');
    document.body.classList.remove('aic-offen');
}

// Die alten Regler als Sheet UEBER dem Chat. Das Textfeld "Was ist diese
// Woche passiert?" und der Generier-Knopf sind dort ausgeblendet
// (.ais-als-einstellungen): das ist hier das Eingabefeld unten.
function einstellungen(tab) {
    const p = $('aiStudioPanel');
    if (p) p.classList.add('ais-als-einstellungen');
    AIStudio.open();
    AIStudio.switchTab(tab || 'generate');
}

function entwurfUebernehmen() {
    if (!entwurfHatInhalt(gespraech.entwurf)) return;
    AIStudio.wocheSetzen(entwurfAlsWoche(gespraech.entwurf, AIStudio.konfig()));
    // Uebernommen = diese Woche ist fertig; beim naechsten Oeffnen geht es frisch los.
    gespraech.erledigt = true;
    speichern();
    schliessen();
    AIStudio.insertAll();
    verlaufZeichnen();
}
function entwurfBearbeiten() {
    if (!entwurfHatInhalt(gespraech.entwurf)) return;
    AIStudio.wocheSetzen(entwurfAlsWoche(gespraech.entwurf, AIStudio.konfig()));
    verlaufZeichnen();
    einstellungen('preview');
}
// Leere Tage fuellen = eine Bitte im Gespraech, sichtbar als Nachricht. Der
// Azubi sieht, was gefragt wurde, und das Modell hat dieselbe Regel dafuer.
function fuellen() {
    senden(null, Lx('Füll die leeren Tage mit passenden Tätigkeiten für meinen Beruf auf.', 'Fill the empty days with suitable activities for my occupation.'));
}

// Eine Karte aus dem Verlauf: insertAll() und die Vorschau lesen
// state.generatedEntries — sie muss dafuer erst wieder die aktuelle Woche
// werden. Ist sie es schon, NICHT neu laden (loadFromHistory meldet sich mit
// einem Toast).
function alsAktuell(woche) {
    const jetzt = JSON.stringify(AIStudio.woche() || null);
    const soll = JSON.stringify(woche);
    if (jetzt === soll) return true;
    const idx = (AIStudio.verlauf() || []).findIndex(w => JSON.stringify(w) === soll);
    if (idx === -1) return false;
    AIStudio.loadFromHistory(idx);
    return true;
}
function uebernehmen(nr) {
    const n = gespraech.nachrichten[nr];
    if (!n || !n.woche || !alsAktuell(n.woche)) return;
    schliessen();
    AIStudio.insertAll();
}
function bearbeiten(nr) {
    const n = gespraech.nachrichten[nr];
    if (n && n.woche) alsAktuell(n.woche);
    einstellungen('preview');
}
function ausVerlauf(i) {
    const w = (AIStudio.verlauf() || [])[i];
    if (!w) return;
    const v = $('aicView');
    if (v) v.classList.remove('rail-auf');
    sagen({ rolle: 'assistent', text: Lx('Diese Woche hattest du schon:', 'You had this week before:'), woche: JSON.parse(JSON.stringify(w)) });
}
function neueWoche() {
    frischAnfangen();
    zuletztGeaendert = [];
    speichern();
    const v = $('aicView');
    if (v) v.classList.remove('rail-auf');
    zeichnen();
    const f = $('aicText'); if (f) f.focus();
}
function vorschlag(btn) {
    const f = $('aicText');
    if (!f) return;
    f.value = btn.getAttribute('data-text') || '';
    feldGroesse();
    knopfZustand();
    f.focus();
}
function rail() {
    const v = $('aicView');
    if (v) v.classList.toggle('rail-auf');
}

function init() {
    laden();
    const f = $('aicText');
    if (f) {
        f.addEventListener('input', () => { feldGroesse(); knopfZustand(); });
        // Enter schickt, Umschalt+Enter macht eine neue Zeile — wie in jedem Chat.
        f.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); senden(); }
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !offen) return;
        // Liegt das Einstellungs-Sheet darueber, schliesst Escape zuerst das.
        const p = $('aiStudioPanel');
        if (p && p.classList.contains('open')) { AIStudio.close(); return; }
        schliessen();
    });
    // Beim Schliessen des Sheets den Stand neu zeichnen: dort wurde ggf. etwas
    // von Hand umgestellt (Arbeitstage!), und Profilzeile und Karte muessen es zeigen.
    if (studioDa() && typeof AIStudio.close === 'function') {
        const zu = AIStudio.close;
        AIStudio.close = function () { zu.apply(this, arguments); if (offen) zeichnen(); };
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

return {
    oeffnen, schliessen, senden, einstellungen, uebernehmen, bearbeiten,
    entwurfUebernehmen, entwurfBearbeiten, fuellen, ohneKi,
    ausVerlauf, neueWoche, vorschlag, rail, profilZeichnen,
    // Fuer tools/ais-chat.test.mjs: die reinen Teile ohne DOM.
    _intern: {
        ersterJsonWert, systemPrompt, chipsFuer, profilTeile, wochenSchluessel, istAbgelaufen,
        kwTabelle, datumAusText, datumHinweis, entwurfZusammenfuehren, entwurfAlsWoche, einstellungenAus, erlaubteTage,
        leererEntwurf, entwurfLesen,
        gespraech: () => gespraech, setzeEntwurf: (e) => { gespraech.entwurf = e; },
    },
};
})();
