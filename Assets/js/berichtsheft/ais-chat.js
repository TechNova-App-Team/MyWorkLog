// ═══ BERICHTSHEFT-ASSISTENT (CHAT) MODULE ═══
//
// Vollbild-Ansicht im Stil eines Chats. Der Azubi erzaehlt in eigenen Worten
// ("Bin Baecker im 1. Lehrjahr, mein Ausbilder ist streng, nur Stichpunkte"),
// die Cloud-KI macht daraus Einstellungen, und sobald er schreibt, was er
// gemacht hat, entsteht die Woche als Karte im Gespraech.
//
// Aufbau — bewusst KEIN zweiter Generator:
//   verstehen()  → POST <Proxy>/verstehen, Antwort { antwort, einstellungen,
//                  wochenText, erzeugen }. Nur Deutung, keine Woche.
//   einstellen   → AIStudio.konfigSetzen(): dieselben Setter wie die Regler.
//                  Die alten Regler bleiben als Sheet "Einstellungen" erhalten
//                  und zeigen denselben Stand (ein Zustand, ein Regler).
//   erzeugen     → AIStudio.erzeugeAusText(): der bestehende Weg mit Prompt,
//                  Reparatur-Kaskade, Rate-Limit und lokaler Engine als Netz.
//
// Faellt /verstehen aus (offline, Tageslimit, alle Modelle weg), rechnet der
// Chat NICHT still weiter: steht ein Beruf fest, wird die Nachricht als
// Wochentext genommen; sonst sagt er, dass er gerade nicht versteht, und
// bietet die Regler an.

window.AISChat = (function () {
'use strict';

const SPEICHER = 'bh_chat_v1';
const LIMIT_KEY = 'bh_chat_rl';
// Eigener Zaehler neben dem der Wochen (20/Tag): eine Chat-Nachricht ist ein
// kurzer Aufruf, aber alle Nutzer teilen sich das Tagesbudget von OpenRouter.
const LIMIT_TAG = 60;
const MAX_NACHRICHTEN = 60;
const KONTEXT_RUNDEN = 6;

let offen = false;
let beschaeftigt = false;
let gespraech = { nachrichten: [], wocheText: '' };

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

const TAGE = () => Lx('Montag Dienstag Mittwoch Donnerstag Freitag', 'Monday Tuesday Wednesday Thursday Friday').split(' ');
const FORM_NAME = {
    stichpunkte: ['Stichpunkte', 'Bullet points'],
    saetze: ['Ganze Sätze', 'Full sentences'],
    ichform: ['Ich-Form', 'First person'],
    fliesstext: ['Fließtext', 'Continuous text'],
};
const UMFANG_NAME = { kurz: ['kurz', 'short'], mittel: ['mittel', 'medium'], ausfuehrlich: ['ausführlich', 'detailed'] };

// ── Speicher ─────────────────────────────────────────────────────────
function laden() {
    try {
        const roh = localStorage.getItem(SPEICHER);
        if (!roh) return;
        const g = JSON.parse(roh);
        if (g && Array.isArray(g.nachrichten)) {
            gespraech = { nachrichten: g.nachrichten.slice(-MAX_NACHRICHTEN), wocheText: String(g.wocheText || '') };
        }
    } catch (e) { /* kaputter Stand → leeres Gespraech */ }
}
function speichern() {
    try {
        gespraech.nachrichten = gespraech.nachrichten.slice(-MAX_NACHRICHTEN);
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
    // Der Platzhalter fragt nach dem, was als Naechstes fehlt.
    const feld = $('aicText');
    if (feld) feld.placeholder = k.bereit
        ? Lx('Erzähl, was diese Woche los war …', 'Tell me what happened this week …')
        : Lx('Beruf, Lehrjahr, wie will es dein Ausbilder …', 'Occupation, year, what your trainer wants …');
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
        box.innerHTML = '<p class="aic-verlauf-leer">' + Lx('Erzeugte Wochen erscheinen hier.', 'Generated weeks show up here.') + '</p>';
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

function wocheHTML(w, nr) {
    if (!w || !Array.isArray(w.days) || !w.days.length) return '';
    const kw = w.calendarWeek ? Lx('KW ', 'Week ') + w.calendarWeek : '';
    const quelle = (w.source === 'cloud' || w.source === 'gemini') ? 'Cloud-KI' : Lx('lokal', 'local');
    const tage = w.days.map(d => {
        const kopf = '<div class="aic-tag-kopf"><span class="aic-tag-name">' + esc(d.name) + '</span>' +
            (d.isSchoolDay ? '<span class="aic-tag-marke">' + Lx('Schule', 'School') + '</span>' : '') +
            (d.hours ? '<span class="aic-tag-h">' + esc(stunden(d.hours)) + ' h</span>' : '') + '</div>';
        if (d.dayStatus) {
            return '<div class="aic-tag">' + kopf + '<p class="aic-tag-status">' + esc(d.dayStatus === 'krank' ? Lx('Krank', 'Sick')
                : d.dayStatus === 'urlaub' ? Lx('Urlaub', 'Holiday') : Lx('Feiertag', 'Public holiday')) + '</p></div>';
        }
        const eintraege = (d.entries || []).map(e => '<li>' + esc(e) + '</li>').join('');
        return '<div class="aic-tag">' + kopf +
            (d.isSchoolDay && d.schoolTopic ? '<p class="aic-tag-thema">' + esc(d.schoolTopic) + '</p>' : '') +
            '<ul class="aic-tag-liste">' + eintraege + '</ul></div>';
    }).join('');
    return '<article class="aic-woche">' +
        '<header class="aic-woche-kopf"><span>' + esc(kw || Lx('Deine Woche', 'Your week')) + '</span>' +
        '<span class="aic-woche-meta">' + w.days.length + Lx(' Tage · ', ' days · ') + esc(quelle) + '</span></header>' +
        '<div class="aic-woche-tage">' + tage + '</div>' +
        '<footer class="aic-woche-fuss">' +
        '<button type="button" class="aic-knopf is-haupt" onclick="AISChat.uebernehmen(' + nr + ')">' +
        '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>' + Lx('In den Bericht übernehmen', 'Add to report') + '</button>' +
        '<button type="button" class="aic-knopf" onclick="AISChat.bearbeiten(' + nr + ')">' + Lx('Bearbeiten', 'Edit') + '</button>' +
        '<button type="button" class="aic-knopf" onclick="AISChat.nochmal()">' + Lx('Neu schreiben', 'Rewrite') + '</button>' +
        '</footer></article>';
}

function nachrichtHTML(n, nr) {
    if (n.rolle === 'nutzer') {
        return '<div class="aic-n is-nutzer"><p class="aic-blase">' + esc(n.text) + '</p></div>';
    }
    const chips = (n.chips || []).length
        ? '<div class="aic-chips">' + n.chips.map(c => '<span class="aic-chip">' + esc(c) + '</span>').join('') + '</div>' : '';
    const knopf = n.knopf === 'einstellungen'
        ? '<button type="button" class="aic-knopf" onclick="AISChat.einstellungen()">' + Lx('Einstellungen öffnen', 'Open settings') + '</button>' : '';
    return '<div class="aic-n is-assistent"><span class="aic-avatar">' + MARKE + '</span><div class="aic-inhalt">' +
        (n.text ? '<p class="aic-text">' + esc(n.text) + '</p>' : '') + chips + knopf +
        (n.woche ? wocheHTML(n.woche, nr) : '') + '</div></div>';
}

function leerHTML() {
    const k = studioDa() ? AIStudio.konfig() : { bereit: false };
    const titel = k.bereit
        ? Lx('Was hast du diese Woche gemacht?', 'What did you do this week?')
        : Lx('Erzähl kurz, was du lernst.', 'Tell me briefly what you are training as.');
    const text = k.bereit
        ? Lx('Schreib es so, wie du es einem Kollegen erzählen würdest. Stichworte reichen, Tage darfst du nennen.',
             'Write it the way you would tell a colleague. Keywords are fine, you can name the days.')
        : Lx('Beruf, Lehrjahr und wie dein Ausbilder die Berichte haben will. Ich stelle alles ein, danach schreibst du nur noch, was los war.',
             'Occupation, year and how your trainer wants the reports. I set everything up, after that you only write what happened.');
    const vorschlaege = k.bereit
        ? [Lx('Mo und Di Kasse, Mi Berufsschule, Do Inventur, Fr Regale eingeräumt', 'Mon and Tue checkout, Wed vocational school, Thu stocktaking, Fri shelves stocked'),
           Lx('Mittwoch ist Berufsschule', 'Wednesday is vocational school'),
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

function zeichnen() {
    const box = $('aicNachrichten');
    if (!box) return;
    box.innerHTML = gespraech.nachrichten.length
        ? gespraech.nachrichten.map(nachrichtHTML).join('') + (beschaeftigt ? tippenHTML() : '')
        : leerHTML();
    profilZeichnen();
    nachUnten();
}
function tippenHTML() {
    return '<div class="aic-n is-assistent is-tippt" role="status"><span class="aic-avatar">' + MARKE + '</span>' +
        '<div class="aic-inhalt"><p class="aic-tippt"><span></span><span></span><span></span>' +
        '<em>' + esc(beschaeftigt === 'woche' ? Lx('Schreibe deine Woche …', 'Writing your week …') : Lx('Denkt nach …', 'Thinking …')) + '</em></p></div></div>';
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

// ── Verstehen (Cloud) ────────────────────────────────────────────────
function berufsliste() {
    const P = (window.AIS_BERUFE && window.AIS_BERUFE.PROFESSIONS) || {};
    return Object.keys(P).map(id => id + '=' + P[id].name).join('; ');
}

function systemPrompt() {
    const k = AIStudio.konfig();
    const heute = new Date();
    return [
        'Du bist der Assistent im digitalen Berichtsheft (Ausbildungsnachweis) von MyWorkLog. Ein Azubi schreibt dir.',
        'Du stellst seine Einstellungen ein und sammelst, was er in dieser Woche gemacht hat. Den Bericht selbst schreibst du NICHT, das macht ein anderer Schritt.',
        '',
        'Antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Text davor oder danach:',
        '{"antwort": "...", "einstellungen": {}, "wochenText": "...", "erzeugen": false}',
        '',
        'einstellungen: NUR Felder, die der Azubi in DIESER Nachricht nennt oder ändert. Erlaubt:',
        '- beruf: eine ID aus der Berufsliste unten, wenn der Beruf dort passt',
        '- berufFrei: Berufsbezeichnung als Text, wenn er NICHT in der Liste steht (z. B. "Bäcker/in"). Nie beides.',
        '- lehrjahr: 1 bis 4',
        '- form: "stichpunkte" | "saetze" (ganze Sätze, sachlich, 3. Person) | "ichform" (ich habe ...) | "fliesstext" (ein Absatz je Tag)',
        '- umfang: "kurz" | "mittel" | "ausfuehrlich"',
        '- vorgabe: besondere Wünsche des Ausbilders als kurzer Satz, z. B. "Präsens statt Perfekt"',
        '- abteilung: Text',
        '- tage: gearbeitete Wochentage als Liste, 0=Montag bis 4=Freitag',
        '- schultage: Berufsschultage als Liste 0 bis 4, [] = keiner',
        '- tagStatus: Objekt Tag→Status, z. B. {"4":"krank"}; Status "krank" | "urlaub" | "feiertag" | "" (= wieder normal)',
        '- kw: Kalenderwoche 1 bis 53',
        'Deutung: "Ausbilder streng" ohne weitere Angabe → umfang "ausfuehrlich". "locker", "entspannt", "kurz" → umfang "kurz". "nur Stichpunkte" → form "stichpunkte". "ganze Sätze" → form "saetze". Ein Wochentag mit Schule oder Berufsschule gehört in schultage.',
        '',
        'wochenText: Wenn der Azubi beschreibt, was er gemacht hat, schreib ALLE Tätigkeiten dieser Woche hier zusammen — die bisherigen (siehe unten) plus die neuen, in seinen Worten, mit Tagen, wenn er sie nennt. Sonst "".',
        'erzeugen: true, wenn ein Beruf feststeht (Stand oder diese Nachricht) UND wochenText Tätigkeiten enthält; ebenfalls true, wenn er um eine neue oder geänderte Fassung bittet ("nochmal", "ausführlicher", "in Ich-Form"). Sonst false.',
        // 🔴 Ohne das Beispiel schrieb das Modell (gemessen, Santé) die Antwort
        // IM Stil der Einstellung — als Stichpunkte, aus Sicht des Azubis
        // ("- Ich lerne im 1. Lehrjahr …"). Die Schreibform gilt dem Bericht,
        // nicht dem Gespraech.
        'antwort: DEINE Rückmeldung an den Azubi — nicht sein Bericht, keine Aufzählung, kein Markdown. Ein bis zwei kurze, normale Sätze in Du-Form auf ' + (istEn() ? 'Englisch' : 'Deutsch') + '. Sag, was du eingestellt hast. Fehlt der Beruf, frag danach. Fehlen die Tätigkeiten, frag, was diese Woche los war. Wird erzeugt, sag, dass du die Woche jetzt schreibst.',
        // Zwei Beispiele, nach Lage getrennt: mit nur einem kopierte das Modell
        // dessen Schlussfrage auch dann, wenn es gerade neu schrieb.
        'Beispiele für antwort — nicht wörtlich übernehmen, nur den Ton:',
        '  Einstellungen gesetzt, noch keine Tätigkeiten: "Alles klar: Bäcker/in im 1. Lehrjahr, Stichpunkte und eher ausführlich, weil dein Ausbilder streng ist. Was hast du diese Woche gemacht?"',
        '  Änderung an einer schon geschriebenen Woche: "Verstanden, Freitag trage ich als krank ein und fasse mich kürzer. Ich schreibe die Woche neu."',
        '  Tätigkeiten erzählt: "Danke, ich schreibe deine Woche jetzt."',
        '',
        'Aktueller Stand: ' + JSON.stringify({
            beruf: k.beruf, berufName: k.berufName, lehrjahr: k.bereit ? k.lehrjahr : null, form: k.form, umfang: k.umfang,
            vorgabe: k.vorgabe, abteilung: k.abteilung, tage: k.tage, schultage: k.schultage, tagStatus: k.tagStatus, kw: k.kw,
        }),
        'Bisherige Tätigkeiten dieser Woche: ' + (gespraech.wocheText || '(noch keine)'),
        'Berufsliste: ' + berufsliste(),
        'Heute ist ' + heute.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.',
    ].join('\n');
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

async function verstehen(nachricht) {
    if (limitHeute().n >= LIMIT_TAG) throw new Error('limit');
    const proxy = (window.AIS_CLOUD && window.AIS_CLOUD.CLOUD_PROXY) || 'https://ai-proxy.myworklog.de';
    // Die letzten Runden als Gespraech mitgeben, damit "mach es ausfuehrlicher"
    // weiss, worauf es sich bezieht. Wochen-Karten gehen nicht mit — ihr
    // Inhalt steht als wochenText im System-Prompt.
    const runden = gespraech.nachrichten.slice(-KONTEXT_RUNDEN * 2)
        .filter(n => n.text)
        .map(n => ({ role: n.rolle === 'nutzer' ? 'user' : 'model', parts: [{ text: n.text }] }));
    runden.push({ role: 'user', parts: [{ text: nachricht }] });
    limitZaehlen();
    const ctrl = new AbortController();
    const uhr = setTimeout(() => ctrl.abort(), 70000);
    try {
        const res = await fetch(proxy.replace(/\/$/, '') + '/verstehen', {
            method: 'POST',
            signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt() }] },
                contents: runden,
                generationConfig: { temperature: 0.2, topP: 0.9, maxOutputTokens: 900 },
            }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        const obj = ersterJsonWert(text);
        if (!obj || typeof obj.antwort !== 'string') throw new Error('unlesbar');
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
        else if (f === 'schultage') c.push(k.schultage.length ? Lx('Schule: ', 'School: ') + k.schultage.map(i => TAGE()[i]).join(', ') : Lx('Kein Schultag', 'No school day'));
        else if (f === 'tage') c.push(Lx('Tage: ', 'Days: ') + k.tage.map(i => TAGE()[i].slice(0, 2)).join(' '));
        else if (f === 'tagStatus') Object.entries(k.tagStatus).forEach(([i, s]) =>
            c.push(TAGE()[i] + ': ' + (s === 'krank' ? Lx('krank', 'sick') : s === 'urlaub' ? Lx('Urlaub', 'holiday') : Lx('Feiertag', 'holiday'))));
        else if (f === 'kw') c.push(Lx('KW ', 'Week ') + k.kw);
        else if (f === 'stimmung') c.push(Lx('Woche: ', 'Week: ') + k.stimmung);
    });
    return c.filter(Boolean);
}

// ── Senden ───────────────────────────────────────────────────────────
async function senden(e) {
    if (e) e.preventDefault();
    const feld = $('aicText');
    const text = (feld.value || '').trim();
    if (!text || beschaeftigt) return;
    feld.value = '';
    feldGroesse();
    gespraech.nachrichten.push({ rolle: 'nutzer', text });
    beschaeftigt = 'denken';
    speichern();
    zeichnen();
    knopfZustand();

    let ergebnis = null, grund = '';
    try { ergebnis = await verstehen(text); }
    catch (err) { grund = err && err.message; }

    if (!ergebnis) {
        beschaeftigt = false;
        await ohneVerstehen(text, grund);
        return;
    }

    const geaendert = AIStudio.konfigSetzen(ergebnis.einstellungen || {});
    if (typeof ergebnis.wochenText === 'string' && ergebnis.wochenText.trim()) {
        gespraech.wocheText = ergebnis.wochenText.trim().slice(0, 2000);
    }
    const k = AIStudio.konfig();
    const erzeugen = !!ergebnis.erzeugen && k.bereit && !!gespraech.wocheText;

    beschaeftigt = false;
    sagen({ rolle: 'assistent', text: ergebnis.antwort.trim().slice(0, 600), chips: chipsFuer(geaendert) });
    verlaufZeichnen();
    if (erzeugen) await wocheErzeugen();
    knopfZustand();
}

// Ohne Cloud-Deutung: nichts erfinden. Mit Beruf wird die Nachricht als
// Wochentext genommen (der Generator hat selbst eine lokale Engine als Netz).
async function ohneVerstehen(text, grund) {
    const k = AIStudio.konfig();
    const warum = grund === 'limit'
        ? Lx('Für heute habe ich genug Nachrichten gedeutet.', 'I have interpreted enough messages for today.')
        : Lx('Ich erreiche die KI gerade nicht.', 'I cannot reach the AI right now.');
    if (k.bereit) {
        gespraech.wocheText = (gespraech.wocheText ? gespraech.wocheText + '\n' : '') + text;
        sagen({ rolle: 'assistent', text: warum + ' ' + Lx('Ich nehme deine Nachricht als Beschreibung der Woche und schreibe los.', 'I will take your message as the description of the week and start writing.') });
        await wocheErzeugen();
    } else {
        sagen({ rolle: 'assistent', knopf: 'einstellungen',
            text: warum + ' ' + Lx('Stell deinen Beruf und dein Lehrjahr kurz per Hand ein, dann geht es weiter.', 'Set your occupation and year by hand, then we can continue.') });
    }
    knopfZustand();
}

async function wocheErzeugen() {
    // Die Wochen-Erzeugung hat eine Pause von 10 s zwischen zwei Cloud-Aufrufen.
    // Statt sie mit einem Hinweis abbrechen zu lassen, wartet der Chat sie ab.
    const rl = window.AIS_CLOUD && window.AIS_CLOUD.RateLimit;
    if (rl && AIStudio.konfig().cloud) {
        const st = rl.status();
        if (st.remaining > 0 && st.cooldownMs > 0) await new Promise(r => setTimeout(r, st.cooldownMs + 150));
    }
    beschaeftigt = 'woche';
    zeichnen();
    knopfZustand();
    const vorher = AIStudio.woche();
    let ok = false;
    try { ok = await AIStudio.erzeugeAusText(gespraech.wocheText); } catch (e) { ok = false; }
    beschaeftigt = false;
    const w = AIStudio.woche();
    if (ok && w && w !== vorher) {
        sagen({ rolle: 'assistent', text: '', woche: JSON.parse(JSON.stringify(w)) });
    } else {
        sagen({ rolle: 'assistent', knopf: 'einstellungen',
            text: Lx('Die Woche ließ sich gerade nicht schreiben. Versuch es gleich noch einmal oder prüf die Einstellungen.',
                     'The week could not be written just now. Try again shortly or check the settings.') });
    }
    verlaufZeichnen();
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

// insertAll() und die Vorschau lesen state.generatedEntries — eine aeltere
// Karte im Gespraech muss dafuer erst wieder die aktuelle Woche werden. Ist
// sie es schon, NICHT neu laden (loadFromHistory meldet sich mit einem Toast).
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
async function nochmal() {
    if (beschaeftigt || !gespraech.wocheText) return;
    await wocheErzeugen();
}
function ausVerlauf(i) {
    const w = (AIStudio.verlauf() || [])[i];
    if (!w) return;
    const v = $('aicView');
    if (v) v.classList.remove('rail-auf');
    sagen({ rolle: 'assistent', text: Lx('Diese Woche hattest du schon erzeugt:', 'You generated this week before:'), woche: JSON.parse(JSON.stringify(w)) });
}
function neueWoche() {
    gespraech = { nachrichten: [], wocheText: '' };
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
    // von Hand umgestellt, und die Profilzeile muss es zeigen.
    // Das Sheet schliesst ueber seinen eigenen Knopf (onclick="AIStudio.close()")
    // oder den Hintergrund — beide gehen ueber die oeffentliche Methode.
    if (studioDa() && typeof AIStudio.close === 'function') {
        const zu = AIStudio.close;
        AIStudio.close = function () { zu.apply(this, arguments); if (offen) profilZeichnen(); };
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

return {
    oeffnen, schliessen, senden, einstellungen, uebernehmen, bearbeiten, nochmal,
    ausVerlauf, neueWoche, vorschlag, rail, profilZeichnen,
    // Fuer tools/ais-chat.test.mjs: die reinen Teile ohne DOM.
    _intern: { ersterJsonWert, systemPrompt, chipsFuer, profilTeile },
};
})();
