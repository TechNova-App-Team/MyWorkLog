// ═══ AIS-STUDIO ═══
// AI Studio — Berichtsheft-Generator v3.0. Der Kern: Zustand, die Datenquellen
// (Aufgaben-Pipe, Tracking-Pipe), die LOKALE Engine, die IHK-Pruefung, das
// Rendern der Vorschau, das Fuellen des Formulars und die oeffentliche API, die
// aus den onclick-Attributen gerufen wird.
//
// Drei Nachbarn stehen in eigenen Dateien und muessen VOR dieser geladen sein:
//   ais-berufe.js   — Berufe, Jahreszeiten, Themen-Pools (reine Daten)
//   ais-sprache.js  — Genus, Artikel, Satzmuster, Schreibformen, Wochenplan
//   ais-cloud.js    — Rate-Limit, Prompt, Modell-Antwort, Proxy-Aufruf
//
// 100% lokal ohne Cloud: kein WebGPU, kein Download, kein API-Key. Die lokale
// Engine laeuft, wenn der Nutzer die Cloud abschaltet, das Tageslimit erreicht
// ist oder der Proxy nicht antwortet.
// Herausgeloest aus pages/berichtsheft/index.html.

const AIStudio = (() => {
'use strict';

// Die drei Nachbarmodule werden hier EINMAL ausgepackt. Dadurch heisst jeder
// Aufruf darunter weiter so, wie er hiess: PROFESSIONS[id], pickRandom(...),
// RateLimit.status(). Kein Praefix, kein Suchen-und-Ersetzen ueber 2600 Zeilen.
// Reihenfolge im HTML: berufe → sprache → cloud → studio.
const { PROFESSIONS, getCurrentSeason, SEASONAL_ACTIVITIES, UNIVERSAL_SCHULFAECHER,
    THEME_ACTIVITIES } = window.AIS_BERUFE;
const { pickRandom, pickMultipleUnique, shuffleArray, conjugateVerb,
    UNIVERSAL_ACTIVITIES_EXTENDED, FORM_PATTERNS, partizipDoppelt, alsFliesstext,
    UNIVERSAL_OBJEKTE, FAKT_RAHMEN, SCHUL_FORMATE, LERN_AKTIVITAETEN, UMFANG_COUNT,
    PLAN_TAG_INDEX, _parseWochenplan, _planEintrag } = window.AIS_SPRACHE;
const { RATE_LIMIT_DAILY, RateLimit, generateWithCloud } = window.AIS_CLOUD;


// ═══════════════════════════════════════
// CONFIGURATION & STATE
// ═══════════════════════════════════════

const VERSION = '3.0.0';
const STORAGE_KEYS = {
    profession: 'ais_profession',
    history: 'ais_generation_history',
    usedPhrases: 'ais_used_phrases',
    settings: 'ais_settings',
    useCloud: 'ais_use_cloud',
    profile: 'ais_user_profile_v2',
    useAufgaben: 'ais_use_aufgaben',
    useTracking: 'ais_use_tracking',
    trackingOff: 'ais_tracking_off',
    sundayReminder: 'ais_sunday_reminder',
    lastReminderKW: 'ais_last_reminder_kw',
    aiSettings: 'ais_ai_settings_v1', // Tage + Schultage gebündelt
};

// Aufgaben (mwl_tasks_cats aus /pages/aufgaben/) — Storage-Key dort
const AUFGABEN_STORAGE_KEY = 'mwl_tasks_cats';

const state = {
    isOpen: false,
    selectedProfession: null,
    customProfession: '',
    selectedDays: [0, 1, 2, 3, 4],
    schoolDayIndices: [], // ✦ Multi-Select: leeres Array = kein Schultag, sonst 0-4
    generatedEntries: null,
    generationHistory: [],
    usedPhrases: new Set(),
    isGenerating: false,
    useCloud: false,
    form: 'stichpunkte',      // Schreibform: stichpunkte|saetze|ichform|fliesstext
    umfang: 'mittel',         // Textmenge pro Tag: kurz|mittel|ausfuehrlich
    formHint: '',             // "So will es mein Ausbilder" — Freitext, geht in den Prompt
    activeTheme: null,
    selectedActivities: [],
    dayNotes: {},
    lehrjahr: 2,
    useAufgaben: false,         // ✦ Aufgaben-Pipe: Tasks aus /pages/aufgaben/ in Prompt einspeisen
    useTracking: false,         // ✦ Tracking-Pipe: Projekt/Notizen aus der Zeiterfassung nutzen
    trackingOff: new Set(),     // ✦ abgewählte Tracking-Fundstücke (Key: "dayIdx|kind|text")
    trackingWeek: null,         // ✦ zuletzt geladene Tracking-Woche (Cache für Render + Prompt)
    dayStatus: {},              // ✦ {0: 'krank'|'urlaub'|'feiertag'} pro Wochentag-Index
    sundayReminder: false,      // ✦ Sonntag 18 Uhr Push-Reminder
};

// Status-Labels für Krank/Urlaub/Feiertag — SVG statt Emoji
const DAY_STATUS_LABELS = {
    krank: { svgId: 'i-thermometer', label: 'Krank', short: 'Krankgemeldet' },
    urlaub: { svgId: 'i-palmtree', label: 'Urlaub', short: 'Urlaub' },
    feiertag: { svgId: 'i-party', label: 'Feiertag', short: 'Feiertag' },
};
// Reihenfolge für Cycle-Button: '' → krank → urlaub → feiertag → '' …
const DAY_STATUS_CYCLE = ['', 'krank', 'urlaub', 'feiertag'];





function generateSchoolEntry(profession, yearNum, form = 'stichpunkte') {
    const prof = PROFESSIONS[profession];
    const topic = pickRandom((prof && prof.schoolTopics) || UNIVERSAL_SCHULFAECHER);
    if (!topic) return null;
    return pickRandom((SCHUL_FORMATE[form] || SCHUL_FORMATE.stichpunkte)(topic));
}



// ═══════════════════════════════════════
// ENTRY GENERATION — Core Engine
// ═══════════════════════════════════════


// Human-style sentence wrappers (add personal voice)

// ═══════════════════════════════════════
// AUFGABEN-PIPE: Tasks aus Wochenansicht lesen
// ═══════════════════════════════════════
// Liefert {0:[...names], 1:[...], ..., 4:[...]} — Mo-Fr Tasks aus mwl_tasks_cats.
// Berichtsheft nutzt 0=Mo … 4=Fr. Aufgaben-Modul nutzt JS getDay() (0=So, 1=Mo … 5=Fr),
// also Konvertierung: berichtsheftDay + 1 → aufgabenDay
function _loadAufgabenForWeek() {
    try {
        const raw = localStorage.getItem(AUFGABEN_STORAGE_KEY);
        if (!raw) return { perDay: { 0: [], 1: [], 2: [], 3: [], 4: [] }, total: 0 };
        const categories = JSON.parse(raw);
        if (!Array.isArray(categories)) return { perDay: { 0: [], 1: [], 2: [], 3: [], 4: [] }, total: 0 };

        const perDay = { 0: [], 1: [], 2: [], 3: [], 4: [] };
        const seen = new Set();

        for (let bsDay = 0; bsDay < 5; bsDay++) {
            const auDay = bsDay + 1; // Mo=1 in aufgaben-modul
            categories.forEach(cat => {
                if (!cat || !Array.isArray(cat.tasks)) return;
                // Kategorie auf diesen Tag sichtbar?
                const catVisible = !cat.days || !cat.days.length || cat.days.indexOf(auDay) !== -1;
                if (!catVisible) return;
                cat.tasks.forEach(t => {
                    if (!t || !t.name) return;
                    // Task auf diesen Tag sichtbar?
                    const taskVisible = !t.days || !t.days.length || t.days.indexOf(auDay) !== -1;
                    if (!taskVisible) return;
                    const name = String(t.name).trim();
                    if (!name || name.length > 80) return;
                    const key = bsDay + '|' + name.toLowerCase();
                    if (seen.has(key)) return;
                    seen.add(key);
                    perDay[bsDay].push(name);
                });
            });
        }

        const total = Object.values(perDay).reduce((sum, arr) => sum + arr.length, 0);
        return { perDay, total };
    } catch (e) {
        console.warn('[AIStudio] Aufgaben konnten nicht gelesen werden:', e);
        return { perDay: { 0: [], 1: [], 2: [], 3: [], 4: [] }, total: 0 };
    }
}

// Aufgaben-Karte aktualisieren: Anzahl gefundener Tasks + Zustand des Toggles.
// Gleiche Sub-Zeilen-Logik wie bei den erfassten Zeiten (aus/an), damit beide
// Quellen-Karten identisch lesen.
function _updateAufgabenBadge() {
    const banner = document.getElementById('aisAufgabenBanner');
    const sub = document.getElementById('aisAufgabenSub');
    if (!banner || !sub) return;
    const { total } = _loadAufgabenForWeek();
    if (total === 0) {
        banner.style.display = 'none';
        return;
    }
    banner.style.display = '';
    banner.classList.toggle('active', !!state.useAufgaben);
    sub.innerHTML = `<span id="aisAufgabenBadge">${total}</span> ` + (state.useAufgaben
        ? L('Aufgaben gehen als Grundlage an die KI', 'tasks go to the AI as the basis')
        : L('Aufgaben aus deiner Wochenplanung', 'tasks from your weekly planning'));
}

// ═══════════════════════════════════════
// TRACKING-PIPE: echte Zeiterfassung (tg_pro_data) als Grundlage
// ═══════════════════════════════════════
// Liest die Einträge der Ziel-KW aus der Haupt-App und macht daraus pro Wochentag
// auswählbare Fundstücke: Projekt/Kunde, Notiz (aus e.info geparst), Custom-Fields.
// Damit muss der User der KI nicht nochmal erklären, was er die Woche gemacht hat.

const TRACKING_STORAGE_KEY = 'tg_pro_data';

// Entry-Typ → Tag-Status im Berichtsheft. 'gleittag' bewusst NICHT gemappt:
// ein Gleittag ist kein Berichts-Inhalt, der Tag wird stattdessen abgewählt.
const TRACKING_STATUS_MAP = { vacation: 'urlaub', sick: 'krank', holiday: 'feiertag' };

function _ymdUTC(d) {
    return d.getUTCFullYear() + '-' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(d.getUTCDate()).padStart(2, '0');
}

// Die Notiz des Users steckt nicht in einem eigenen Feld, sondern hinten in e.info:
//   "08:00 - 16:30 (30m Pause) | Bugfix in Modul X | ↪ Zusatzzeit (Soll bereits gezählt)"
// Segment 0 ist immer die generierte Zeit-/Typ-Meta, ↪-Segmente sind System-Marker.
function _extractEntryNote(entry) {
    if (!entry) return '';
    if (typeof entry.notes === 'string' && entry.notes.trim()) return entry.notes.trim();
    const raw = typeof entry.info === 'string' ? entry.info : '';
    if (!raw) return '';
    return raw.split('|')
        .slice(1)
        .map(s => s.trim())
        .filter(s => s && s.charAt(0) !== '↪')
        .join(' · ')
        .trim();
}

function _emptyTrackingWeek(kw, year) {
    const perDay = {};
    for (let i = 0; i < 5; i++) perDay[i] = null;
    return { perDay, total: 0, days: 0, kw, year, hasData: false };
}

// Liefert {perDay: {0..4: dayObj|null}, total, days, kw, year}
// dayObj = {date, dateLabel, items:[{kind,label,text}], hours, status, isSchool, isFrei, typeLabel}
function _loadTrackingForWeek(kw, year) {
    const targetKw = parseInt(kw, 10) || getWeekNumber(new Date());
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const empty = _emptyTrackingWeek(targetKw, targetYear);

    let data;
    try {
        const raw = localStorage.getItem(TRACKING_STORAGE_KEY);
        if (!raw) return empty;
        data = JSON.parse(raw);
    } catch (e) {
        console.warn('[AIStudio] Zeiterfassung konnte nicht gelesen werden:', e);
        return empty;
    }
    if (!data || !Array.isArray(data.entries) || data.entries.length === 0) return empty;

    // Custom-Field-Labels auflösen (data.customFields = [{id,label,type,…}])
    const fieldLabels = {};
    if (Array.isArray(data.customFields)) {
        data.customFields.forEach(f => { if (f && f.id) fieldLabels[f.id] = f.label || ''; });
    }
    // Job-Namen nur bei Multi-Job als Kontext mitgeben
    const jobs = (data.settings && Array.isArray(data.settings.jobs)) ? data.settings.jobs : [];
    const multiJob = jobs.length > 1;
    const jobNames = {};
    jobs.forEach(j => { if (j && j.id) jobNames[j.id] = j.name || ''; });

    // Mo–Fr der Ziel-KW als YYYY-MM-DD
    const monday = isoWeekMonday(targetYear, targetKw);
    const dateOfDay = {};
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        dateOfDay[i] = _ymdUTC(d);
    }

    const perDay = {};
    for (let i = 0; i < 5; i++) perDay[i] = null;
    let total = 0;
    let dayCount = 0;

    for (let i = 0; i < 5; i++) {
        const dateStr = dateOfDay[i];
        const dayEntries = data.entries.filter(e => e && e.date === dateStr);
        if (dayEntries.length === 0) continue;

        const items = [];
        const seen = new Set();
        let hours = 0;
        let status = '';
        let isSchool = false;
        let isFrei = false;
        let typeLabel = '';

        const push = (kind, label, text) => {
            const clean = String(text == null ? '' : text).trim().replace(/\s+/g, ' ');
            if (!clean || clean.length > 200) return;
            const key = kind + '|' + clean.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            items.push({ kind, label, text: clean });
        };

        dayEntries.forEach(e => {
            hours += parseFloat(e.worked) || 0;

            if (TRACKING_STATUS_MAP[e.type]) status = TRACKING_STATUS_MAP[e.type];
            else if (e.type === 'school') isSchool = true;
            else if (e.type === 'gleittag') isFrei = true;

            push('projekt', 'Projekt', e.project);
            push('notiz', 'Notiz', _extractEntryNote(e));

            if (e.customFieldValues && typeof e.customFieldValues === 'object') {
                Object.keys(e.customFieldValues).forEach(fid => {
                    const val = e.customFieldValues[fid];
                    if (val === true) push('feld', fieldLabels[fid] || 'Feld', fieldLabels[fid] || 'Ja');
                    else if (val !== false) push('feld', fieldLabels[fid] || 'Feld', val);
                });
            }

            if (multiJob) {
                const jn = jobNames[e.jobId || 'primary'];
                if (jn) push('job', 'Job', jn);
            }
        });

        // Ein Gleittag ohne echte Arbeit ist ein freier Tag — kein Status, kein Inhalt.
        if (isFrei && items.length === 0 && hours === 0) typeLabel = 'Gleittag';
        else isFrei = false;

        const dObj = new Date(dateStr + 'T00:00:00');
        perDay[i] = {
            date: dateStr,
            dateLabel: isNaN(dObj) ? dateStr : dObj.toLocaleDateString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'), { day: '2-digit', month: '2-digit' }),
            items,
            hours: Math.round(hours * 100) / 100,
            status,
            isSchool,
            isFrei,
            typeLabel,
        };
        total += items.length;
        dayCount++;
    }

    return { perDay, total, days: dayCount, kw: targetKw, year: targetYear, hasData: dayCount > 0 };
}

// Nur die vom User angewählten Fundstücke — state.trackingOff hält die ABGEWÄHLTEN.
function _trackingItemKey(dayIdx, item) {
    return dayIdx + '|' + item.kind + '|' + item.text.toLowerCase();
}

function _selectedTrackingForDay(dayIdx, week) {
    const day = week && week.perDay ? week.perDay[dayIdx] : null;
    if (!day) return [];
    return day.items.filter(it => !state.trackingOff.has(_trackingItemKey(dayIdx, it)));
}

// Für Prompt + lokale Engine: {0: ["Projekt: X", "Notiz: Y"], …}
function _trackingPerDayText(week) {
    const out = { 0: [], 1: [], 2: [], 3: [], 4: [] };
    if (!week || !week.perDay) return out;
    for (let i = 0; i < 5; i++) {
        out[i] = _selectedTrackingForDay(i, week).map(it => it.label + ': ' + it.text);
    }
    return out;
}

// Payload für Cloud-Prompt und lokale Engine — null, wenn nichts angewählt ist.
function _buildTrackingPayload() {
    const week = state.trackingWeek;
    if (!week || !week.hasData) return null;
    const perDay = _trackingPerDayText(week);
    const total = Object.keys(perDay).reduce((n, k) => n + perDay[k].length, 0);
    if (total === 0) return null;
    const hours = {};
    for (let i = 0; i < 5; i++) hours[i] = week.perDay[i] ? week.perDay[i].hours : 0;
    return { perDay, hours, total, kw: week.kw };
}

function generateDayEntries(professionId, options = {}) {
    const {
        yearNum = 2,
        umfang = 'mittel',
        form = 'stichpunkte',
        dayIndex = 0,
        isSchoolDay = false,
        season = getCurrentSeason(),
        excludePhrases = [],
        department = '',
        activeTheme = null,
        customPrompt = '',
        aufgabenForDay = null,  // ✦ Aufgaben-Pipe: ["Switch konfigurieren", ...] für diesen Tag
        trackingForDay = null,  // ✦ Tracking-Pipe: ["Projekt: Alpha", "Notiz: Bugfix …"] für diesen Tag
        planForDay = null,      // ✦ Wochenplan: was der Nutzer FÜR DIESEN TAG geschrieben hat
    } = options;

    // Nur Stichpunkte tragen ein Aufzaehlungszeichen; ein Satz mit "• " davor
    // sieht im Berichtsheft-Feld aus wie ein Formatfehler.
    const bullet = form === 'stichpunkte' ? '• ' : '';
    // Fliesstext entsteht aus Ich-Form-Saetzen, die generateWeek danach
    // zu EINEM Absatz zusammenzieht (alsFliesstext).
    const musterForm = form === 'fliesstext' ? 'ichform' : form;
    const rahmen = FAKT_RAHMEN[form] || FAKT_RAHMEN.stichpunkte;
    // Die fertigen Phrasen-Pools (Lehrjahr, Saison, Wochenthema) stehen alle in
    // Stichpunkt-Form und liessen sich ohne Genus-Wissen nicht sauber in Saetze
    // umbiegen. In den Satzformen bleibt die Engine deshalb beim Musterpfad, wo
    // sie die Grammatik vollstaendig kontrolliert. Lieber weniger Abwechslung
    // als halb falsches Deutsch.
    const nurMuster = form !== 'stichpunkte';

    const prof = PROFESSIONS[professionId];

    // Ein Berufsschultag ist ein Schultag, auch wenn der Beruf ein Freitext ist.
    // Die Abfrage stand frueher NACH `if (!prof) return generateGenericDayEntries()`
    // — eigene Berufe bekamen an ihren Schultagen deshalb Betriebs-Floskeln aus
    // dem Universal-Pool, und der Tag kam mit isSchoolDay:false zurueck.
    if (isSchoolDay) {
        return generateSchoolDayEntries(prof, professionId, yearNum, season, excludePhrases, form, umfang, planForDay);
    }

    if (!prof) return generateGenericDayEntries(options);

    const entryCount = UMFANG_COUNT[umfang] || UMFANG_COUNT.mittel;
    const numEntries = entryCount.min + Math.floor(Math.random() * (entryCount.max - entryCount.min + 1));

    const entries = [];
    const usedVerbs = [];
    const usedObjects = [];

    // ✦ Wochenplan: was der Nutzer selbst für diesen Tag aufgeschrieben hat,
    //   steht ganz oben und kommt WÖRTLICH rein. Keine Stichwortliste davor —
    //   die hat jahrelang alles verworfen, was nicht nach Büro klang.
    if (Array.isArray(planForDay) && planForDay.length > 0) {
        planForDay.forEach(fakt => {
            const txt = _planEintrag(fakt, form, rahmen);
            if (!txt) return;
            if (entries.some(e => e.toLowerCase() === (bullet + txt).toLowerCase())) return;
            entries.push(bullet + txt);
            excludePhrases.push(String(fakt).trim());
        });
    }

    // ✦ Tracking-Pipe: was wirklich erfasst wurde, steht ganz oben und kommt vollständig rein.
    //   Die lokale Engine kann nicht umformulieren — der Original-Wortlaut ist hier
    //   ohnehin die ehrlichere Angabe als eine generierte Floskel.
    if (Array.isArray(trackingForDay) && trackingForDay.length > 0) {
        trackingForDay.slice(0, 4).forEach(fact => {
            const txt = String(fact).replace(/^(Projekt|Notiz|Job):\s*/, '').trim();
            if (!txt) return;
            if (entries.some(e => e.toLowerCase().includes(txt.toLowerCase()))) return;
            entries.push(bullet + rahmen(txt));
            excludePhrases.push(txt);
        });
    }

    // ✦ Aufgaben-Pipe: User-Tasks aus Wochenansicht VORRANG (1-2 pro Tag, random ausgewählt).
    //   Werden 1:1 als Bullet-Eintrag übernommen — User kann inline editieren.
    if (Array.isArray(aufgabenForDay) && aufgabenForDay.length > 0) {
        const shuffled = [...aufgabenForDay].sort(() => Math.random() - 0.5);
        const take = Math.min(2, shuffled.length);
        for (let i = 0; i < take; i++) {
            const t = shuffled[i];
            if (!entries.some(e => e.toLowerCase().includes(t.toLowerCase()))) {
                entries.push(bullet + rahmen(t));
                excludePhrases.push(t);
            }
        }
    }

    // 1. Add year-appropriate task (50% chance)
    if (!nurMuster && Math.random() > 0.5 && prof.yearTasks && prof.yearTasks[yearNum]) {
        const yearTask = pickRandom(prof.yearTasks[yearNum], excludePhrases);
        if (yearTask) {
            entries.push('• ' + yearTask);
            excludePhrases.push(yearTask);
        }
    }

    // 2. Add seasonal activity (30% chance for applicable professions)
    if (!nurMuster && Math.random() > 0.7 && SEASONAL_ACTIVITIES[professionId]) {
        const seasonalActivities = SEASONAL_ACTIVITIES[professionId][season];
        if (seasonalActivities) {
            const seasonal = pickRandom(seasonalActivities, excludePhrases);
            if (seasonal) {
                entries.push('• ' + seasonal);
                excludePhrases.push(seasonal);
            }
        }
    }

    // 3. Generate profession-specific entries
    while (entries.length < numEntries) {
        const verb = pickRandom(prof.verbs, usedVerbs);
        const obj = pickRandom(prof.objects, usedObjects);
        const tool = pickRandom(prof.tools);

        usedVerbs.push(verb);
        usedObjects.push(obj);

        const muster = FORM_PATTERNS[musterForm] || FORM_PATTERNS.stichpunkte;
        const partizip = conjugateVerb(verb);
        let sentence = null;
        // Bis zu drei Muster durchprobieren, bevor eines mit doppeltem
        // Partizip akzeptiert wird — sonst haengt die Schleife bei Verben,
        // die in JEDEM Muster kollidieren.
        for (let versuch = 0; versuch < 3; versuch++) {
            const kandidat = pickRandom(muster)(verb, obj, tool);
            if (!partizipDoppelt(kandidat, partizip)) { sentence = kandidat; break; }
            sentence = sentence || kandidat;
        }

        // Ensure no duplicates
        if (!entries.includes(bullet + sentence) && !excludePhrases.includes(sentence)) {
            entries.push(bullet + sentence);
            excludePhrases.push(sentence);
        }
    }

    // 4. Inject user-defined context (customPrompt / department keywords)
    // Zwei Pfade:
    //  a) generateWeek hat einen pre-picked Eintrag mitgegeben (injectedCustomEntry)
    //     → genau diesen einen Eintrag injizieren (Wochen-Verteilung)
    //  b) Direkter Aufruf (z.B. regenerateDay) → mit Wahrscheinlichkeit ~40% EINEN
    //     zufälligen Eintrag injizieren, sonst nichts. Verhindert dass identische
    //     Notiz in jedem Tag landet.
    if (options.injectedCustomEntry) {
        const ce = options.injectedCustomEntry;
        if (!entries.some(e => e === ce)) {
            entries.unshift(ce);
            excludePhrases.push(ce.replace('• ', ''));
        }
    } else if ((customPrompt || department) && Math.random() < 0.4) {
        const customEntries = _customContextEntries(customPrompt, department);
        if (customEntries.length > 0) {
            const ce = customEntries[Math.floor(Math.random() * customEntries.length)];
            if (!entries.some(e => e === ce)) {
                entries.unshift(ce);
                excludePhrases.push(ce.replace('• ', ''));
            }
        }
    }

    // 5. Add theme activity (if activeTheme set, 60% chance)
    if (!nurMuster && activeTheme && THEME_ACTIVITIES[activeTheme] && Math.random() > 0.4) {
        const themeAct = pickRandom(THEME_ACTIVITIES[activeTheme], excludePhrases);
        if (themeAct && !entries.some(e => e.includes(themeAct.substring(0, 20)))) {
            entries.unshift('• ' + themeAct); // Put theme activity first
            excludePhrases.push(themeAct);
        }
    }

    // 6. Add universal activity (40% chance)
    if (!nurMuster && entries.length < numEntries + 1 && Math.random() > 0.6) {
        const universal = pickRandom(UNIVERSAL_ACTIVITIES_EXTENDED, excludePhrases);
        if (universal) {
            entries.push('• ' + universal);
            excludePhrases.push(universal);
        }
    }

    return {
        entries: entries.slice(0, numEntries),
        hours: isSchoolDay ? 0 : 8,
        isSchoolDay: false,
        excludePhrases
    };
}

function generateSchoolDayEntries(prof, professionId, yearNum, season, excludePhrases, form = 'stichpunkte', umfang = 'mittel', planForDay = null) {
    const bullet = form === 'stichpunkte' ? '• ' : '';
    const entries = [];

    // Hat der Nutzer das Fach selbst genannt ("Fr: Berufsschule, Thema
    // Subnetting und VLAN"), ist das die bessere Angabe als ein gewuerfeltes
    // aus schoolTopics — es ist die, die wirklich dran war.
    //
    // 🔴 Der Wortlaut geht dabei durch SCHUL_FORMATE, nicht durch FAKT_RAHMEN:
    // dessen Rahmen ("Bearbeitet wurde: …", "Ich habe an folgender Aufgabe
    // gearbeitet: …") beschreibt BETRIEBSarbeit und liest sich an einem
    // Schultag falsch. Das Fach des Nutzers steht unveraendert darin.
    const planTexte = Array.isArray(planForDay) ? planForDay.filter(Boolean) : [];
    const schulRahmen = SCHUL_FORMATE[form] || SCHUL_FORMATE.stichpunkte;
    const eigenesFach = planTexte.length > 0
        ? (t => t.charAt(0).toUpperCase() + t.slice(1))(String(planTexte[0]).trim())
        : '';
    planTexte.forEach(fakt => {
        const thema = String(fakt).trim();
        if (!thema) return;
        const satz = pickRandom(schulRahmen(thema.charAt(0).toUpperCase() + thema.slice(1)));
        if (satz && !entries.some(e => e.includes(satz))) entries.push(bullet + satz);
    });

    const schoolEntry = eigenesFach || generateSchoolEntry(professionId, yearNum, form);
    if (!eigenesFach && schoolEntry) entries.push(bullet + schoolEntry);

    // Der Schultag traegt denselben Umfang wie jeder andere Tag. Vorher waren
    // es fest zwei Eintraege — bei "Ausfuehrlich" stach er als duenner Tag
    // heraus und der Validator meldete ihn zu Recht an.
    const lern = LERN_AKTIVITAETEN[form] || LERN_AKTIVITAETEN.stichpunkte;
    const cnt = UMFANG_COUNT[umfang] || UMFANG_COUNT.mittel;
    const ziel = cnt.min + Math.floor(Math.random() * (cnt.max - cnt.min + 1));
    const benutzt = [];
    while (entries.length < ziel && benutzt.length < lern.length) {
        const a = pickRandom(lern, benutzt);
        if (!a) break;
        benutzt.push(a);
        if (!entries.some(e => e.includes(a))) entries.push(bullet + a);
    }
    // Reichen die Lern-Phrasen nicht, fuellt ein weiteres Schulthema auf.
    let schutz = 0;
    while (entries.length < ziel && schutz++ < 8) {
        const w = generateSchoolEntry(professionId, yearNum, form);
        if (w && !entries.some(e => e.includes(w))) entries.push(bullet + w);
    }

    return {
        entries,
        hours: 8,
        isSchoolDay: true,
        schoolTopic: schoolEntry,
        excludePhrases: [...excludePhrases, ...entries.map(e => e.replace('• ', ''))]
    };
}

function generateGenericDayEntries(options) {
    const { umfang = 'mittel', form = 'stichpunkte', excludePhrases = [] } = options;
    const cnt = UMFANG_COUNT[umfang] || UMFANG_COUNT.mittel;
    const numEntries = cnt.min + Math.floor(Math.random() * (cnt.max - cnt.min + 1));

    // Stichpunkte kommen aus dem fertigen Phrasen-Pool. Fuer die Satzformen
    // gibt es dort keinen Artikel, also baut die Engine aus UNIVERSAL_OBJEKTE
    // (mit Genus) und den universellen Verben eigene Saetze.
    let entries;
    if (form === 'stichpunkte') {
        entries = pickMultipleUnique(UNIVERSAL_ACTIVITIES_EXTENDED, numEntries, excludePhrases)
            .map(e => '• ' + e);
    } else {
        const musterForm = form === 'fliesstext' ? 'ichform' : form;
        const muster = FORM_PATTERNS[musterForm] || FORM_PATTERNS.stichpunkte;
        const verben = (typeof AI_BRAIN !== 'undefined' && AI_BRAIN.universalVerbs)
            ? AI_BRAIN.universalVerbs
            : ['durchführen', 'bearbeiten', 'vorbereiten', 'kontrollieren', 'dokumentieren'];
        entries = [];
        const benutzteObjekte = [];
        let schutz = 0;
        while (entries.length < numEntries && schutz++ < 60) {
            const obj = pickRandom(UNIVERSAL_OBJEKTE, benutzteObjekte);
            if (!obj) break;
            benutzteObjekte.push(obj);
            const satz = pickRandom(muster)(pickRandom(verben), obj, 'den üblichen Arbeitsmitteln');
            if (!entries.includes(satz) && !excludePhrases.includes(satz)) entries.push(satz);
        }
    }

    return {
        entries,
        hours: 8,
        isSchoolDay: false,
        excludePhrases: [...excludePhrases, ...entries.map(e => e.replace('• ', ''))]
    };
}



// ═══════════════════════════════════════
// FULL WEEK GENERATION
// ═══════════════════════════════════════

function generateWeek(professionId, options = {}) {
    const {
        yearNum = 2,
        umfang = 'mittel',
        form = 'stichpunkte',
        selectedDays = [0, 1, 2, 3, 4],
        schoolDayIndices: optSchoolDayIndices = [],
        department = '',
        calendarWeek = null,
        activeTheme = null,
        customPrompt = '',
    } = options;

    const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const season = getCurrentSeason();
    // Phrasen frueherer Laeufe fliessen immer in die Sperrliste — sonst
    // wiederholt sich die lokale Engine woechentlich fast wortgleich.
    const allExcludePhrases = [...state.usedPhrases];

    // ✦ Multi-Select Schultage — vom User explizit per UI gewählt, kein Random
    const schoolDaySet = new Set(
        (Array.isArray(optSchoolDayIndices) ? optSchoolDayIndices : [])
            .filter(i => typeof i === 'number' && selectedDays.includes(i))
    );

    const week = {
        profession: professionId,
        professionName: PROFESSIONS[professionId]?.name || professionId,
        professionIcon: PROFESSIONS[professionId]?.icon || bhIcon(''),
        yearNum,
        umfang,
        form,
        calendarWeek: calendarWeek || getCalendarWeek(),
        department: department || (PROFESSIONS[professionId]?.departments ? pickRandom(PROFESSIONS[professionId].departments) : ''),
        season,
        timestamp: Date.now(),
        source: 'local',
        days: [],
        totalHours: 0,
    };

    // ✦ Wochenplan: "Mo: … Di: … Fr: Berufsschule" wird gelesen und Tag für
    //   Tag zugeordnet. Vorher konnte das NUR der Cloud-Prompt; lokal wurden
    //   die Tagesmarken ignoriert und der Text auf zwei Zufallstage gestreut.
    const _plan = _parseWochenplan(customPrompt);

    // Was OHNE Tagesmarke dasteht, gilt weiter für die ganze Woche und wird
    // auf max 2 zufällige Tage verteilt — sonst steht "War kurz im Einkauf"
    // in JEDEM Tag.
    const _rahmenWoche = FAKT_RAHMEN[form] || FAKT_RAHMEN.stichpunkte;
    const _weekCustomEntries = _customContextEntries(_plan.rest.join(', '), week.department)
        .map(e => form === 'stichpunkte' ? e : _rahmenWoche(e.replace(/^•\s*/, '')));
    const _customAssignment = new Map(); // dayIdx → custom entry string
    if (_weekCustomEntries.length > 0 && selectedDays.length > 0) {
        const _shuffledDays = [...selectedDays].sort(() => Math.random() - 0.5);
        const _maxCustomDays = Math.min(_weekCustomEntries.length, 2, _shuffledDays.length);
        for (let i = 0; i < _maxCustomDays; i++) {
            _customAssignment.set(_shuffledDays[i], _weekCustomEntries[i]);
        }
    }

    // ✦ Aufgaben-Pipe: User-Toggle entscheidet ob /pages/aufgaben/ Tasks eingespeist werden
    const aufgabenData = state.useAufgaben ? _loadAufgabenForWeek() : null;
    // ✦ Tracking-Pipe: echte Projekte/Notizen aus der Zeiterfassung
    const trackingData = state.useTracking ? _buildTrackingPayload() : null;

    for (const dayIdx of selectedDays) {
        // ✦ Krank/Urlaub/Feiertag: AI-Generierung überspringen, Tag als Status markieren
        const dayStatus = state.dayStatus[dayIdx];
        if (dayStatus && DAY_STATUS_LABELS[dayStatus]) {
            // Krank/Urlaub/Feiertag = bezahlt. Echte Stunden aus der Zeiterfassung, sonst 8h.
            const statusHours = _trackingHoursForDay(dayIdx) || 8;
            week.days.push({
                index: dayIdx,
                name: DAY_NAMES[dayIdx],
                entries: [],
                hours: statusHours,
                isSchoolDay: false,
                schoolTopic: null,
                dayStatus,
            });
            week.totalHours += statusHours;
            continue;
        }

        const isSchoolDay = schoolDaySet.has(dayIdx);
        const result = generateDayEntries(professionId, {
            yearNum,
            umfang,
            form,
            dayIndex: dayIdx,
            isSchoolDay,
            season,
            excludePhrases: allExcludePhrases,
            department: '',                                  // blockt Re-Injection
            customPrompt: '',                                // im day-fn (Wochenebene erledigt)
            injectedCustomEntry: _customAssignment.get(dayIdx) || null,
            planForDay: _plan.perDay[dayIdx] || null,
            aufgabenForDay: aufgabenData ? aufgabenData.perDay[dayIdx] : null,
            trackingForDay: trackingData ? trackingData.perDay[dayIdx] : null,
            activeTheme,
        });

        // Fliesstext: die Ich-Form-Saetze des Tages werden zu EINEM Absatz.
        // Muss hier passieren und nicht in generateDayEntries, weil erst hier
        // der Tagesname feststeht ("Am Montag habe ich zunaechst …").
        const eintraege = form === 'fliesstext'
            ? alsFliesstext(result.entries, DAY_NAMES[dayIdx])
            : result.entries;

        const day = {
            index: dayIdx,
            name: DAY_NAMES[dayIdx],
            entries: eintraege,
            // Echte erfasste Stunden schlagen den 8h-Default der Engine
            hours: _trackingHoursForDay(dayIdx) || result.hours || 8,
            isSchoolDay: result.isSchoolDay,
            schoolTopic: result.schoolTopic || null,
        };

        week.days.push(day);
        week.totalHours += day.hours;

        // Track used phrases for variation
        if (result.excludePhrases) {
            result.excludePhrases.forEach(p => allExcludePhrases.push(p));
        }
    }

    // Benutzte Phrasen ueber Sitzungen hinweg merken
    allExcludePhrases.forEach(p => state.usedPhrases.add(p));
    // Menge begrenzen — max 500 Eintraege
    if (state.usedPhrases.size > 500) {
        const arr = [...state.usedPhrases];
        state.usedPhrases = new Set(arr.slice(arr.length - 200));
    }
    try { localStorage.setItem(STORAGE_KEYS.usedPhrases, JSON.stringify([...state.usedPhrases])); } catch (e) { }

    return week;
}

function getCalendarWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 604800000;
    return Math.ceil((diff / oneWeek) + (start.getDay() + 6) % 7 / 7);
}

// ═══════════════════════════════════════
// IHK COMPLIANCE VALIDATION
// ═══════════════════════════════════════

function validateIHKCompliance(week) {
    const issues = [];
    let score = 0;
    const maxScore = 100;

    // 1. Genug Inhalt pro Tag. Der Massstab haengt an der Schreibform:
    //    Fliesstext hat bauartbedingt EIN entries-Element, eine Mindestzahl
    //    an Eintraegen waere dort immer rot.
    const istFliess = week.form === 'fliesstext';
    const minProTag = (UMFANG_COUNT[week.umfang] || UMFANG_COUNT.mittel).min;
    let allDaysHaveMin = true;
    for (const day of week.days) {
        if (day.dayStatus) continue;   // krank/Urlaub/Feiertag hat keine Taetigkeiten
        if (istFliess) {
            const laenge = (day.entries[0] || '').length;
            if (laenge < 120) {
                issues.push(`${day.name}: Absatz sehr kurz (${laenge} Zeichen)`);
                allDaysHaveMin = false;
            }
        } else if (day.entries.length < minProTag) {
            issues.push(`${day.name}: ${day.entries.length} statt ${minProTag} Einträge`);
            allDaysHaveMin = false;
        }
    }
    if (allDaysHaveMin) score += 20;
    else score += 10;

    // 2. Check for variety (no duplicate entries)
    const allEntries = week.days.flatMap(d => d.entries.map(e => e.replace('• ', '').toLowerCase()));
    const uniqueEntries = new Set(allEntries);
    const varietyRatio = uniqueEntries.size / Math.max(allEntries.length, 1);
    if (varietyRatio >= 0.9) score += 20;
    else if (varietyRatio >= 0.7) score += 15;
    else { score += 5; issues.push('Zu viele ähnliche Einträge — mehr Variation empfohlen'); }

    // 3. Check hours (should be ~40h/week for 5 days)
    const expectedHours = week.days.length * 8;
    if (Math.abs(week.totalHours - expectedHours) <= 2) score += 15;
    else { score += 5; issues.push(`Stundenzahl (${week.totalHours}h) weicht von ${expectedHours}h ab`); }

    // 4. Berufsschultag. Wer in den Optionen ausdruecklich "Kein" gewaehlt hat,
    //    bekommt dafuer keinen Abzug — die Meldung waere ein Vorwurf fuer eine
    //    bewusste Angabe (Umschueler, Teilzeit, Ferienwoche).
    const hasSchoolDay = week.days.some(d => d.isSchoolDay);
    const schultagGewollt = !Array.isArray(state.schoolDayIndices) || state.schoolDayIndices.length > 0;
    if (hasSchoolDay || !schultagGewollt) score += 15;
    else { score += 5; issues.push('Kein Berufsschultag — IHK empfiehlt Berufsschuleinträge'); }

    // 5. Check entry length (not too short)
    let goodLength = true;
    for (const day of week.days) {
        if (day.dayStatus) continue;
        for (const entry of day.entries) {
            if (entry.replace('• ', '').length < 15) {
                goodLength = false;
                break;
            }
        }
    }
    if (goodLength) score += 15;
    else { score += 5; issues.push('Einige Einträge zu kurz — mindestens 15 Zeichen empfohlen'); }

    // 6. Department mentioned
    if (week.department) score += 5;
    else issues.push('Keine Abteilung angegeben');

    // 7. Profession-specific content
    if (week.profession && PROFESSIONS[week.profession]) score += 10;
    else { score += 5; issues.push('Kein spezifischer Beruf gewählt'); }

    const status = score >= 85 ? 'pass' : score >= 60 ? 'warn' : 'fail';
    const statusText = score >= 85 ? 'IHK-Konform' : score >= 60 ? 'Verbesserung empfohlen' : 'Nicht ausreichend';

    return {
        score: Math.min(score, maxScore),
        maxScore,
        status,
        statusText,
        issues,
    };
}

// ═══════════════════════════════════════
// UI RENDERING
// ═══════════════════════════════════════

function renderProfessionGrid() {
    // Legacy function — new UI uses _renderBerufGrid()
    _renderBerufGrid('');
}

function renderPreview(week) {
    const content = document.getElementById('aisPreviewContent');
    const toolbar = document.getElementById('aisPreviewToolbar');
    const compliance = document.getElementById('aisCompliance');
    if (!content) return;

    if (!week || !week.days || week.days.length === 0) {
        content.innerHTML = `
                    <div class="ais-preview-empty">
                        <div class="empty-icon"><svg class="icon icon-xl"><use href="#i-sparkles"/></svg></div>
                        <h3>Noch keine Einträge generiert</h3>
                        <p>Wähle im Tab "Generieren" deinen Beruf und klicke auf den Button — die AI erstellt dir sofort IHK-konforme Einträge.</p>
                    </div>`;
        if (toolbar) toolbar.style.display = 'none';
        if (compliance) compliance.style.display = 'none';
        return;
    }

    // Show toolbar + source badge
    if (toolbar) {
        toolbar.style.display = 'flex';
        const score = document.getElementById('aisPreviewScore');
        if (score) {
            // Akzeptiert auch alten 'gemini'-Tag aus History vor dem Rename.
            const isCloud = week.source === 'cloud' || week.source === 'gemini';
            score.innerHTML = isCloud
                ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(6,182,212,0.2));border:1px solid rgba(139,92,246,0.4);font-size:0.7rem;font-weight:700;color:#a78bfa;"><svg class="icon"><use href="#i-sparkles"/></svg> Cloud KI</span>`
                : `<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:rgba(255,255,255,0.05);border:1px solid var(--border-light);font-size:0.7rem;font-weight:700;color:var(--text-dim);"><svg class="icon"><use href="#i-zap"/></svg> Lokal</span>`;
        }
    }

    // Render day cards
    content.innerHTML = week.days.map((day, i) => {
        // ✦ Krank/Urlaub/Feiertag → Status-Block statt Entries
        if (day.dayStatus && DAY_STATUS_LABELS[day.dayStatus]) {
            const st = DAY_STATUS_LABELS[day.dayStatus];
            return `
                <div class="ais-day-card" data-day-idx="${day.index}">
                    <div class="ais-day-card-header">
                        <span class="ais-day-name">${day.name}</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="ais-day-hours">${day.hours}h</span>
                        </div>
                    </div>
                    <div class="ais-day-status-block status-${day.dayStatus}">
                        <svg class="ais-status-icon-svg"><use href="#${st.svgId}"/></svg>
                        <span>${st.short} — keine Tätigkeiten erfasst</span>
                    </div>
                </div>`;
        }
        return `
                <div class="ais-day-card" data-day-idx="${day.index}">
                    <div class="ais-day-card-header">
                        <span class="ais-day-name">${day.isSchoolDay ? '<svg class="icon icon-sm" style="display:inline-block;vertical-align:middle;margin-right:3px"><use href="#i-book"/></svg> ' : ''}${day.name}</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span class="ais-day-hours">${day.hours}h</span>
                            <div class="ais-day-card-actions">
                                <button class="ais-day-action" onclick="AIStudio.regenerateDay(${day.index})" title="Lokal neu generieren (frei, kein Limit)"><svg class="icon icon-sm"><use href="#i-zap"/></svg></button>
                                <button class="ais-day-action ais-day-action-cloud" onclick="AIStudio.regenerateDayCloud(${day.index})" title="Mit Cloud-KI neu (zählt 1/20)"><svg class="icon icon-sm"><use href="#i-sparkles"/></svg></button>
                                <button class="ais-day-action" onclick="AIStudio.insertDay(${day.index})" title="Einzeln einfügen"><svg class="icon icon-sm"><use href="#i-download"/></svg></button>
                            </div>
                        </div>
                    </div>
                    ${day.isSchoolDay && day.schoolTopic ? `<div class="ais-day-school"><strong><svg class="icon"><use href="#i-bookopen"/></svg></strong> ${escapeHtml(day.schoolTopic)}</div>` : ''}
                    <ul class="ais-day-entries">
                        ${day.entries.map((entry, j) => `
                            <li>
                                <span class="entry-text" contenteditable="true" onblur="AIStudio.updateEntry(${day.index}, ${j}, this.textContent)">${escapeHtml(entry.replace('• ', ''))}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>`;
    }).join('');

    // IHK Compliance
    const ihk = validateIHKCompliance(week);
    if (compliance) {
        compliance.style.display = 'flex';
        const badge = document.getElementById('aisComplianceBadge');
        const text = document.getElementById('aisComplianceText');
        if (badge) {
            badge.className = `ais-compliance-badge ${ihk.status}`;
            badge.innerHTML = `<span>${ihk.status === 'pass' ? '<svg class="icon"><use href="#i-check"/></svg>' : ihk.status === 'warn' ? '<svg class="icon"><use href="#i-warning"/></svg>' : '<svg class="icon"><use href="#i-x"/></svg>'}</span> ${ihk.statusText}`;
        }
        if (text) {
            text.textContent = ihk.issues.length > 0
                ? ihk.issues.slice(0, 2).join('. ')
                : 'Alle Einträge erfüllen die IHK-Richtlinien.';
        }
    }

    // Score in toolbar
    const scoreEl = document.getElementById('aisPreviewScore');
    if (scoreEl) {
        const color = ihk.score >= 85 ? 'var(--success)' : ihk.score >= 60 ? 'var(--warning)' : 'var(--danger)';
        scoreEl.innerHTML = `
                    <div class="ais-score-ring" style="background:${color}22;color:${color};border:2px solid ${color}">${ihk.score}</div>
                    <span style="color:${color}">IHK Score</span>`;
    }
}

function renderHistory() {
    const container = document.getElementById('aisHistory');
    if (!container) return;

    if (state.generationHistory.length === 0) {
        container.innerHTML = `
                    <div class="ais-preview-empty">
                        <div class="empty-icon"><svg class="icon icon-xl"><use href="#i-scroll"/></svg></div>
                        <h3>Noch kein Verlauf</h3>
                        <p>Generierte Einträge werden hier gespeichert, damit du sie wiederverwenden kannst.</p>
                    </div>`;
        return;
    }

    container.innerHTML = state.generationHistory
        .slice()
        .reverse()
        .slice(0, 30)
        .map((item, i) => {
            const origIdx = state.generationHistory.length - 1 - i;
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleDateString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'), { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + date.toLocaleTimeString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'), { hour: '2-digit', minute: '2-digit' });
            const preview = item.days?.[0]?.entries?.[0]?.replace('• ', '') || 'Kein Inhalt';
            return `
                        <div class="ais-history-item" id="ais-hist-${origIdx}" onclick="AIStudio.loadFromHistory(${origIdx})">
                            <div class="ais-history-item-header">
                                <span class="ais-history-item-prof">${bhIcon(item.professionIcon)} ${escapeHtml(item.professionName || item.profession)}</span>
                                <span class="ais-history-item-date">${dateStr}</span>
                                <button class="ais-del-trigger" onclick="event.stopPropagation(); AIStudio.deleteFromHistory(${origIdx});" title="Löschen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                            </div>
                            <div class="ais-history-item-preview">KW ${item.calendarWeek || '?'} • ${item.days?.length || 0} Tage • ${preview}</div>
                            <div class="ais-del-confirm-strip" onclick="event.stopPropagation()">
                                <span class="ais-del-confirm-label">Löschen?</span>
                                <button class="ais-del-btn-nein" onclick="AIStudio.cancelDeleteHistory(${origIdx})">Nein</button>
                                <button class="ais-del-btn-ja" onclick="AIStudio.confirmDeleteHistory(${origIdx})">Ja</button>
                            </div>
                        </div>`;
        }).join('');
}

// ═══════════════════════════════════════
// FORM AUTO-FILL — Direct Insertion
// ═══════════════════════════════════════

// Helper: wait until daily fields exist in DOM (polls every 50ms, max 2s)
function _waitForDailyFields(callback, maxWait = 2000) {
    const start = Date.now();
    const check = () => {
        if (document.getElementById('daily_0')) {
            callback();
        } else if (Date.now() - start < maxWait) {
            setTimeout(check, 50);
        } else {
            // Fallback: force render and try once more
            if (typeof renderDailyFields === 'function') renderDailyFields();
            setTimeout(callback, 100);
        }
    };
    check();
}

// Helper: ensure modal is open and in daily mode, then call action
// When modal is already open, do NOT reset/restore draft — just fill existing fields
function _ensureModalDailyMode(callback) {
    const modal = document.getElementById('reportModal');
    const dailyFieldsExist = document.getElementById('daily_0') !== null;

    if (!modal.classList.contains('active') || !dailyFieldsExist) {
        // Modal closed OR daily fields don't exist yet: open it normally
        openNewReportModal();
    }
    // Der Name der Funktion war bisher eine Zusage ohne Deckung: die Tagesfelder
    // bleiben nach einem Wechsel auf "Woechentlich" im DOM stehen, also war
    // dailyFieldsExist wahr und der Modus blieb woechentlich. Die AI-Eintraege
    // landeten dann in ausgeblendeten Feldern, waehrend saveReport den leeren
    // Wochentext gespeichert hat.
    if (currentMode !== 'daily') setMode('daily');

    // Wait for daily fields to exist, then fill
    _waitForDailyFields(callback);
}

function fillFormWithGeneratedWeek(week) {
    if (!week || !week.days) return;

    _ensureModalDailyMode(() => _doFillForm(week));
}

function _doFillForm(week) {
    // Set metadata
    const yearSelect = document.getElementById('reportYear');
    if (yearSelect && week.yearNum) yearSelect.value = week.yearNum;

    const weekInput = document.getElementById('reportWeek');
    if (weekInput && week.calendarWeek) {
        weekInput.value = week.calendarWeek;
        weekInput.dispatchEvent(new Event('change'));
        // Re-render daily fields with correct dates after week change
        if (typeof renderDailyFields === 'function') renderDailyFields();
    }

    const deptInput = document.getElementById('reportDepartment');
    if (deptInput && week.department) deptInput.value = week.department;

    // Always use daily mode — we generate per-day entries
    _waitForDailyFields(() => {
        for (const day of week.days) {
            const textarea = document.getElementById(`daily_${day.index}`);
            if (textarea) {
                // ✦ Krank/Urlaub/Feiertag: schreibe Status-Label statt leerer Text
                let text;
                if (day.dayStatus && DAY_STATUS_LABELS[day.dayStatus]) {
                    const st = DAY_STATUS_LABELS[day.dayStatus];
                    text = `${st.short} — keine Tätigkeiten`;
                } else {
                    text = day.entries.join('\n');
                }
                textarea.value = text;
                textarea.dispatchEvent(new Event('input'));
            }
            const hoursInput = document.getElementById(`daily_hours_${day.index}`);
            if (hoursInput) {
                hoursInput.value = day.hours;
                hoursInput.dispatchEvent(new Event('input'));
            }
            // Der Schultag-Schalter des Tages gehoert mit uebertragen. Fehlte er,
            // stand der Berufsschultag im Bericht wie ein normaler Arbeitstag da —
            // und das Schulthema landete stattdessen im WOECHENTLICHEN Feld
            // #reportSchool, das im Tagesmodus ausgeblendet ist. Ergebnis war ein
            // unerreichbarer Block "Berufsschule" mit einem einzelnen Satz unter
            // dem Bericht. Der Schalter traegt die Angabe jetzt am richtigen Tag.
            const schoolCb = document.getElementById(`daily_school_${day.index}`);
            if (schoolCb) {
                schoolCb.checked = !!day.isSchoolDay;
                if (typeof toggleSchoolDay === 'function') toggleSchoolDay(schoolCb);
            }
        }
        if (typeof updateDailyTotalHours === 'function') updateDailyTotalHours();

        // Set hours
        const hoursInput = document.getElementById('reportHours');
        if (hoursInput) {
            hoursInput.value = week.totalHours || (week.days.length * 8);
        }

        showToast('Alle Einträge in Tagesfelder eingefügt', 'success');
    });
}

function fillSingleDay(dayData, dayIndex) {
    _ensureModalDailyMode(() => _fillSingleDay(dayData, dayIndex));
}

function _fillSingleDay(dayData, dayIndex) {
    // Re-render daily fields to make sure they exist
    if (!document.getElementById(`daily_${dayIndex}`) && typeof renderDailyFields === 'function') {
        renderDailyFields();
    }

    _waitForDailyFields(() => {
        const textarea = document.getElementById(`daily_${dayIndex}`);
        if (textarea) {
            // ✦ Status-Tag: schreibe Status-Label statt Tätigkeiten
            if (dayData.dayStatus && DAY_STATUS_LABELS[dayData.dayStatus]) {
                const st = DAY_STATUS_LABELS[dayData.dayStatus];
                textarea.value = `${st.short} — keine Tätigkeiten`;
            } else {
                textarea.value = dayData.entries.join('\n');
            }
            textarea.dispatchEvent(new Event('input'));
        } else {
            console.warn(`[AIStudio] daily_${dayIndex} not found`);
        }
        const hoursInput = document.getElementById(`daily_hours_${dayIndex}`);
        if (hoursInput) {
            hoursInput.value = dayData.hours;
            hoursInput.dispatchEvent(new Event('input'));
        }
        const schoolCb = document.getElementById(`daily_school_${dayIndex}`);
        if (schoolCb) {
            schoolCb.checked = !!dayData.isSchoolDay;
            if (typeof toggleSchoolDay === 'function') toggleSchoolDay(schoolCb);
        }
        if (typeof updateDailyTotalHours === 'function') updateDailyTotalHours();
        showToast(`${dayData.name} in Tagesfeld eingefügt`, 'success');
    });
}

// ═══════════════════════════════════════
// PUBLIC API — Called from HTML/onclick
// ═══════════════════════════════════════

function init() {
    try {
        const savedHistory = localStorage.getItem(STORAGE_KEYS.history);
        if (savedHistory) state.generationHistory = JSON.parse(savedHistory);

        const savedPhrases = localStorage.getItem(STORAGE_KEYS.usedPhrases);
        if (savedPhrases) state.usedPhrases = new Set(JSON.parse(savedPhrases));
    } catch (e) { console.warn('[AIStudio] State restore failed:', e); }

    _loadProfile();
    _restoreApiSettings();

    // ✦ Aufgaben-Pipe + Sonntag-Reminder + AI-Settings Restore
    try {
        state.useAufgaben = localStorage.getItem(STORAGE_KEYS.useAufgaben) === '1';
        state.useTracking = localStorage.getItem(STORAGE_KEYS.useTracking) === '1';
        state.sundayReminder = localStorage.getItem(STORAGE_KEYS.sundayReminder) === '1';
        const offRaw = localStorage.getItem(STORAGE_KEYS.trackingOff);
        if (offRaw) {
            const arr = JSON.parse(offRaw);
            if (Array.isArray(arr)) state.trackingOff = new Set(arr);
        }
    } catch (e) { }
    setTimeout(() => {
        const auChk = document.getElementById('aisUseAufgabenChk');
        if (auChk) auChk.checked = state.useAufgaben;
        const trChk = document.getElementById('aisUseTrackingChk');
        if (trChk) trChk.checked = state.useTracking;
        const srChk = document.getElementById('aisSundayReminderChk');
        if (srChk) srChk.checked = state.sundayReminder;
        _loadAiSettings(); // Tage + Schultage
        _updateAufgabenBadge();
        _refreshTracking();
        _updateReminderHelp();
        if (state.sundayReminder && 'Notification' in window && Notification.permission === 'granted') {
            _scheduleSundayCheck();
        }
    }, 80);

    // Rate-Limit Counter initial befüllen (auch wenn UI noch nicht offen ist —
    // _updateRateLimitUI gettet das DOM defensiv)
    setTimeout(_updateRateLimitUI, 50);
    console.log(`[AI Studio] Berichtsheft-Assistent v${VERSION} — ${Object.keys(PROFESSIONS).length} Berufe geladen.`);
}

function toggle() {
    state.isOpen ? close() : open();
}

function open() {
    state.isOpen = true;
    const panel = document.getElementById('aiStudioPanel');
    const backdrop = document.getElementById('aiStudioBackdrop');
    if (panel) panel.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    _updateRateLimitUI();
    updateSchoolDayChips();
    // ✦ Aufgaben-Badge bei jedem Öffnen aktualisieren (User hat ggf. Tasks geändert)
    _updateAufgabenBadge();
    // ✦ Zeiterfassung neu einlesen — der User hat seit dem letzten Öffnen ggf. gebucht
    _refreshTracking();
    // Beispiel beim Oeffnen fuellen. Ohne das steht der Kasten leer da, bis
    // jemand eine Form anklickt — und gerade beim ERSTEN Blick soll er zeigen,
    // was die Vorgabe bedeutet.
    _renderFormBeispiel();
}

function close() {
    state.isOpen = false;
    const panel = document.getElementById('aiStudioPanel');
    const backdrop = document.getElementById('aiStudioBackdrop');
    if (panel) panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
}

function switchTab(tabName) {
    document.querySelectorAll('.ais-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.querySelectorAll('.ais-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === tabName);
    });
    if (tabName === 'history') renderHistory();
}

function selectProfession(id) {
    state.selectedProfession = id;
    state.customProfession = '';
    const customInput = document.getElementById('aisCustomProf');
    if (customInput) customInput.value = '';
    localStorage.setItem(STORAGE_KEYS.profession, id);
    // Update beruf grid selection
    document.querySelectorAll('.ais-beruf-opt').forEach(c => {
        c.classList.toggle('sel', c.dataset.prof === id);
    });
    // Das Beispiel nutzt das Vokabular des Berufs — nach dem Wechsel neu bauen
    _renderFormBeispiel();
}

function onCustomProf(value) {
    if (value.trim()) {
        state.customProfession = value.trim();
        state.selectedProfession = _detectProfession(value.trim()) || 'custom';
        if (state.selectedProfession !== 'custom') {
            // Show matched profession in display
            const prof = PROFESSIONS[state.selectedProfession];
            if (prof) {
                const displayIcon = document.getElementById('aisBerufIcon');
                const displayName = document.getElementById('aisBerufName');
                const displayEl = document.getElementById('aisBerufDisplay');
                if (displayIcon) displayIcon.innerHTML = prof.icon;
                if (displayName) displayName.textContent = prof.name + ' (erkannt)';
                if (displayEl) displayEl.classList.add('has-prof');
                _renderActivityChips(state.selectedProfession);
            }
        } else {
            const displayEl = document.getElementById('aisBerufDisplay');
            const displayName = document.getElementById('aisBerufName');
            const displayIcon = document.getElementById('aisBerufIcon');
            if (displayEl) displayEl.classList.add('has-prof');
            if (displayIcon) displayIcon.innerHTML = '<svg class="icon"><use href="#i-grad"/></svg>';
            if (displayName) displayName.textContent = value.trim();
        }
        _saveProfile();
        _updateProfileSummary();
    }
}

function _detectProfession(input) {
    const lower = input.toLowerCase();
    for (const [key, prof] of Object.entries(AI_BRAIN.professions)) {
        if (prof.keywords && prof.keywords.some(kw => lower.includes(kw))) {
            // Map AI_BRAIN keys to PROFESSIONS keys
            if (PROFESSIONS[key]) return key;
        }
    }
    // Fallback: check PROFESSIONS directly
    for (const [key, prof] of Object.entries(PROFESSIONS)) {
        const nameLower = prof.name.toLowerCase();
        if (nameLower.includes(lower) || lower.includes(nameLower) || lower.includes(key)) {
            return key;
        }
    }
    return null;
}

function toggleDay(el) {
    const dayIdx = parseInt(el.dataset.day);
    el.classList.toggle('selected');
    if (el.classList.contains('selected')) {
        if (!state.selectedDays.includes(dayIdx)) state.selectedDays.push(dayIdx);
    } else {
        state.selectedDays = state.selectedDays.filter(d => d !== dayIdx);
        // Schultag automatisch zurücksetzen wenn der abgewählte Tag in der Schultag-Liste war
        state.schoolDayIndices = state.schoolDayIndices.filter(i => i !== dayIdx);
    }
    state.selectedDays.sort();
    updateSchoolDayChips();
    _saveAiSettings();
}

// ✦ Multi-Select Berufsschultag: Tag toggeln, -1 = alle abwählen
function setSchoolDay(idx) {
    if (idx === -1) {
        state.schoolDayIndices = [];
    } else if (state.selectedDays.includes(idx)) {
        if (state.schoolDayIndices.includes(idx)) {
            state.schoolDayIndices = state.schoolDayIndices.filter(i => i !== idx);
        } else {
            state.schoolDayIndices.push(idx);
            state.schoolDayIndices.sort();
        }
    } else {
        return; // Tag nicht aktiv → ignorieren
    }
    updateSchoolDayChips();
    _saveAiSettings();
}

function updateSchoolDayChips() {
    const chips = document.querySelectorAll('#aisSchoolSelector .ais-school-chip');
    if (!chips.length) return;
    const empty = state.schoolDayIndices.length === 0;
    chips.forEach(chip => {
        const idx = parseInt(chip.dataset.school);
        if (idx === -1) {
            chip.classList.remove('disabled');
            chip.classList.toggle('selected', empty);
        } else {
            chip.classList.toggle('disabled', !state.selectedDays.includes(idx));
            chip.classList.toggle('selected', state.schoolDayIndices.includes(idx));
        }
    });
}


let _rateLimitTickHandle = null;
function _updateRateLimitUI() {
    const info = document.getElementById('aisRateLimitInfo');
    const btn = document.getElementById('aisGenerateBtn');
    if (!info) return;

    // Lokal-Only-Modus: Rate-Limit ist irrelevant — kein Cooldown, kein /20 Counter.
    if (!state.useCloud) {
        info.textContent = 'Lokal-Modus · kein Limit';
        info.className = 'ais-ratelimit-info';
        if (btn) {
            btn.classList.remove('rl-blocked');
            btn.disabled = state.isGenerating;
        }
        if (_rateLimitTickHandle) {
            clearInterval(_rateLimitTickHandle);
            _rateLimitTickHandle = null;
        }
        return;
    }

    const s = RateLimit.status();
    let txt, cls = '';

    if (s.remaining === 0) {
        txt = `Tageslimit ${s.count}/${RATE_LIMIT_DAILY} — fällt zurück auf lokale Engine`;
        cls = 'limit';
    } else if (s.cooldownMs > 0) {
        txt = `Cooldown ${Math.ceil(s.cooldownMs / 1000)}s · ${s.count}/${RATE_LIMIT_DAILY} heute`;
        cls = 'cooldown';
    } else if (s.remaining <= 3) {
        txt = `Noch ${s.remaining} von ${RATE_LIMIT_DAILY} heute übrig`;
        cls = 'warning';
    } else {
        txt = `${s.count}/${RATE_LIMIT_DAILY} heute`;
    }

    info.textContent = txt;
    info.className = 'ais-ratelimit-info ' + cls;

    if (btn) {
        const block = s.cooldownMs > 0;
        btn.classList.toggle('rl-blocked', block);
        btn.disabled = block || state.isGenerating;
    }

    // Cooldown-Tick: alle 250ms updaten solange aktiv
    if (s.cooldownMs > 0 && !_rateLimitTickHandle) {
        _rateLimitTickHandle = setInterval(() => {
            const ns = RateLimit.status();
            _updateRateLimitUI();
            if (ns.cooldownMs <= 0) {
                clearInterval(_rateLimitTickHandle);
                _rateLimitTickHandle = null;
            }
        }, 250);
    }
}

function toggleLocalOnly(localOnly) {
    state.useCloud = !localOnly;
    localStorage.setItem(STORAGE_KEYS.useCloud, localOnly ? '0' : '1');
    const badge = document.getElementById('aisEngineBadge');
    if (badge) {
        badge.textContent = localOnly ? 'Lokal' : 'Cloud';
        badge.className = 'ais-engine-toggle-badge ' + (localOnly ? 'ais-engine-badge-local' : 'ais-engine-badge-cloud');
    }
    // Rate-Limit-UI sofort umschalten: Cooldown/Counter ausblenden bzw. einblenden
    _updateRateLimitUI();
}

// ─── NEW v2: Azubi-First UX functions ───────────────────────────────────

function selectMood(mood, el) {
    document.querySelectorAll('.ais-mood-card').forEach(c => c.classList.remove('sel'));
    el.classList.add('sel');
    state.activeTheme = mood === 'normal' ? null : mood;
    // Kein Automatismus auf den Berufsschultag: der ist ein Multi-Select in
    // den erweiterten Optionen und gehoert dem Nutzer. Hier stand bis v6.4.14
    // ein Haken `#aisIncludeSchool`, den es seit dem Umbau nicht mehr gibt —
    // `if (cb)` hat das vollstaendig verborgen.
}

// Schreibform waehlen. Ein Regler, eine Groesse — und die Wirkung steht
// direkt darunter als echtes Beispiel, damit niemand raten muss.
function setForm(form, el) {
    if (!FORM_PATTERNS[form]) return;
    document.querySelectorAll('.ais-form-card').forEach(c => c.classList.remove('sel'));
    if (el) el.classList.add('sel');
    state.form = form;
    _saveProfile();
    _renderFormBeispiel();
}

function setUmfang(umfang, el) {
    if (!UMFANG_COUNT[umfang]) return;
    document.querySelectorAll('.ais-umfang-chip').forEach(c => c.classList.remove('sel'));
    if (el) el.classList.add('sel');
    state.umfang = umfang;
    _saveProfile();
    _renderFormBeispiel();
}

function onFormHint(wert) {
    state.formHint = String(wert || '').slice(0, 300);
    _saveProfile();
}

// Das Live-Beispiel laeuft durch DIESELBE Engine wie die echte Generierung.
// Ein handgeschriebenes Musterbeispiel wuerde beim naechsten Umbau abdriften,
// ohne dass es jemand merkt — genau die Falle, die dieses Projekt schon
// einmal mit widgetLibrary hatte.
function _renderFormBeispiel() {
    const box = document.getElementById('aisFormBeispiel');
    if (!box) return;
    const prof = state.selectedProfession && PROFESSIONS[state.selectedProfession]
        ? state.selectedProfession : 'software';
    let zeilen;
    try {
        const res = generateDayEntries(prof, {
            yearNum: state.lehrjahr || 2,
            umfang: state.umfang,
            form: state.form,
            dayIndex: 0,
            excludePhrases: [],
        });
        zeilen = state.form === 'fliesstext'
            ? alsFliesstext(res.entries, 'Montag')
            : res.entries;
    } catch (e) {
        console.warn('[AIStudio] Beispiel fehlgeschlagen:', e);
        box.innerHTML = '';
        return;
    }
    const kurz = zeilen.slice(0, state.form === 'fliesstext' ? 1 : 3);
    box.innerHTML = kurz.map(z => `<p class="ais-form-bsp-zeile">${escapeHtml(z)}</p>`).join('');
}

function toggleCollapse(bodyId, hdrId) {
    const body = document.getElementById(bodyId);
    const hdr = document.getElementById(hdrId);
    if (!body || !hdr) return;
    const isOpen = body.classList.toggle('open');
    hdr.classList.toggle('open', isOpen);
}

function setLehrjahr(lj, el) {
    document.querySelectorAll('.ais-lj-btn').forEach(b => b.classList.remove('sel'));
    el.classList.add('sel');
    state.lehrjahr = lj;
    _saveProfile();
    _updateProfileSummary();
}

function updateDayNote(dayIdx, value) {
    if (value.trim()) {
        state.dayNotes[dayIdx] = value.trim();
    } else {
        delete state.dayNotes[dayIdx];
    }
}

// ✦ AI-Studio Settings persistieren (Tage + Schultage)
function _saveAiSettings() {
    try {
        const settings = {
            selectedDays: state.selectedDays,
            schoolDayIndices: state.schoolDayIndices,
        };
        localStorage.setItem(STORAGE_KEYS.aiSettings, JSON.stringify(settings));
    } catch (e) { }
}

function _loadAiSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.aiSettings);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (Array.isArray(s.selectedDays)) state.selectedDays = s.selectedDays;
        if (Array.isArray(s.schoolDayIndices)) state.schoolDayIndices = s.schoolDayIndices;

        // UI synchronisieren
        document.querySelectorAll('.ais-day-chip[data-day]').forEach(c => {
            c.classList.toggle('selected', state.selectedDays.includes(parseInt(c.dataset.day)));
        });
        updateSchoolDayChips();
    } catch (e) { console.warn('[AIStudio] AI-Settings restore failed:', e); }
}

// ✦ Aufgaben-Pipe: Toggle ein/aus
function toggleAufgaben(checked) {
    state.useAufgaben = !!checked;
    try { localStorage.setItem(STORAGE_KEYS.useAufgaben, state.useAufgaben ? '1' : '0'); } catch (e) { }
    _updateAufgabenBadge();
    if (state.useAufgaben) {
        const { total } = _loadAufgabenForWeek();
        showToast(total > 0
            ? L(`${total} geplante Aufgaben werden bei der nächsten Generierung berücksichtigt`,
                `${total} planned tasks will be used in the next generation`)
            : L('Keine Aufgaben gefunden — Wochenplanung zuerst befüllen',
                'No tasks found — fill in your weekly planning first'),
            total > 0 ? 'success' : 'warning');
    }
}

// ═══════════════════════════════════════
// TRACKING-PIPE: UI (Wochen-Strip + Chip-Auswahl)
// ═══════════════════════════════════════

const TRACK_DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const TRACK_DAY_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

function _trackEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _trackHours(h) {
    return (Math.round(h * 10) / 10).toFixed(1).replace('.', ',') + ' h';
}

// KW, auf die sich die Tracking-Daten beziehen: Feld im AI Studio, sonst aktuelle Woche.
function _currentTrackingKw() {
    const raw = parseInt(document.getElementById('aisCalendarWeek')?.value, 10);
    if (raw >= 1 && raw <= 53) return raw;
    return getWeekNumber(new Date());
}

function _saveTrackingOff() {
    try {
        localStorage.setItem(STORAGE_KEYS.trackingOff, JSON.stringify([...state.trackingOff]));
    } catch (e) { }
}

// Lädt die Woche neu und rendert. reason='kw' → Auswahl zurücksetzen (andere Woche, andere Daten).
function _refreshTracking(reason) {
    const kw = _currentTrackingKw();
    const prev = state.trackingWeek;
    if (reason === 'kw' && prev && prev.kw !== kw) state.trackingOff.clear();
    state.trackingWeek = _loadTrackingForWeek(kw, new Date().getFullYear());
    _renderTrackingCard();
}

function _renderTrackingCard() {
    const card = document.getElementById('aisTrackCard');
    const body = document.getElementById('aisTrackBody');
    const kwEl = document.getElementById('aisTrackKw');
    const subEl = document.getElementById('aisTrackSub');
    if (!card || !body) return;

    const week = state.trackingWeek;
    // Ohne erfasste Tage gibt es nichts zu übernehmen — Karte bleibt weg.
    if (!week || !week.hasData) {
        card.style.display = 'none';
        return;
    }
    card.style.display = '';
    card.classList.toggle('active', !!state.useTracking);
    if (kwEl) kwEl.textContent = L('KW ', 'CW ') + week.kw;

    const selected = [0, 1, 2, 3, 4].reduce((n, i) => n + _selectedTrackingForDay(i, week).length, 0);
    if (subEl) {
        // Aus-Zustand nennt die Quelle, An-Zustand den Anteil — wie bei den Aufgaben.
        subEl.innerHTML = state.useTracking
            ? `<span>${selected}</span> ` + L(`von ${week.total} Angaben gehen an die KI`,
                `of ${week.total} details go to the AI`)
            : `<span>${week.total}</span> ` + L('Angaben aus deiner Zeiterfassung',
                'details from your time tracking');
    }
    if (!state.useTracking) { body.innerHTML = ''; return; }

    const rows = [];
    for (let i = 0; i < 5; i++) {
        const day = week.perDay[i];
        const badge = (() => {
            if (!day) return '';
            if (day.status === 'urlaub') return '<span class="ais-track-day-badge st-urlaub">Urlaub</span>';
            if (day.status === 'krank') return '<span class="ais-track-day-badge st-krank">Krank</span>';
            if (day.status === 'feiertag') return '<span class="ais-track-day-badge st-feiertag">Feiertag</span>';
            if (day.isFrei) return '<span class="ais-track-day-badge st-frei">Gleittag</span>';
            if (day.isSchool) return '<span class="ais-track-day-badge st-schule">Schule</span>';
            return '';
        })();

        let right;
        if (!day) {
            right = `<div class="ais-track-none">${L('Kein Eintrag erfasst', 'Nothing logged')}</div>`;
        } else if (day.items.length === 0) {
            // An Fehl-, Schul- und Gleittagen ist „nichts erfasst" der Normalfall —
            // das Badge sagt bereits alles, ein Hinweis wäre nur Rauschen.
            right = (day.status || day.isSchool || day.isFrei)
                ? ''
                : `<div class="ais-track-none">${L('Zeit erfasst, aber kein Projekt und keine Notiz', 'Time logged, but no project or note')}</div>`;
        } else {
            right = '<div class="ais-track-chips">' + day.items.map((it, idx) => {
                const off = state.trackingOff.has(_trackingItemKey(i, it));
                return `<button type="button" class="ais-track-chip${off ? ' off' : ''}"
                                    onclick="AIStudio.toggleTrackingItem(${i},${idx})"
                                    aria-pressed="${off ? 'false' : 'true'}"
                                    title="${_trackEsc(it.label + ': ' + it.text)}">
                                    <svg class="ais-track-chip-mark"><use href="#${off ? 'i-plus' : 'i-check'}"/></svg>
                                    <span class="ais-track-chip-lbl">${_trackEsc(it.label)}</span>
                                    <span class="ais-track-chip-txt">${_trackEsc(it.text)}</span>
                                </button>`;
            }).join('') + '</div>';
        }

        rows.push(`
                    <div class="ais-track-day${day ? '' : ' is-empty'}">
                        <div class="ais-track-day-meta">
                            <div class="ais-track-day-name">${TRACK_DAY_SHORT[i]}${day ? ` <span class="ais-track-day-date">${_trackEsc(day.dateLabel)}</span>` : ''}</div>
                            ${day && day.hours > 0 ? `<div class="ais-track-day-hours">${_trackHours(day.hours)}</div>` : ''}
                            ${badge}
                        </div>
                        ${right}
                    </div>`);
    }

    const allOff = selected === 0;
    rows.push(`
                <div class="ais-track-foot">
                    <span class="ais-track-foot-txt">${L('Stunden, Schul- und Fehltage werden mit übernommen.', 'Hours, school days and days off are carried over too.')}</span>
                    <button type="button" class="ais-track-foot-btn" onclick="AIStudio.toggleAllTracking()">
                        ${allOff ? L('Alle auswählen', 'Select all') : L('Alle abwählen', 'Deselect all')}
                    </button>
                </div>`);

    body.innerHTML = rows.join('');
}

// ✦ Tracking-Pipe: Toggle ein/aus
function toggleTracking(checked) {
    state.useTracking = !!checked;
    try { localStorage.setItem(STORAGE_KEYS.useTracking, state.useTracking ? '1' : '0'); } catch (e) { }
    _refreshTracking();
    if (state.useTracking) {
        const applied = _applyTrackingPrefill();
        const week = state.trackingWeek;
        const n = week ? week.total : 0;
        const extra = applied ? L(' — Stunden und Tage angepasst', ' — hours and days adjusted') : '';
        showToast(n > 0
            ? L(`${n} Angaben aus deiner Zeiterfassung übernommen${extra}`,
                `${n} details taken from your time tracking${extra}`)
            : L('Zeiten gefunden, aber keine Projekte oder Notizen hinterlegt',
                'Times found, but no projects or notes recorded'),
            n > 0 ? 'success' : 'info');
    }
}

function toggleTrackingItem(dayIdx, itemIdx) {
    const day = state.trackingWeek?.perDay?.[dayIdx];
    const item = day?.items?.[itemIdx];
    if (!item) return;
    const key = _trackingItemKey(dayIdx, item);
    if (state.trackingOff.has(key)) state.trackingOff.delete(key);
    else state.trackingOff.add(key);
    _saveTrackingOff();
    _renderTrackingCard();
}

function toggleAllTracking() {
    const week = state.trackingWeek;
    if (!week) return;
    const selected = [0, 1, 2, 3, 4].reduce((n, i) => n + _selectedTrackingForDay(i, week).length, 0);
    if (selected === 0) {
        // Nur die Keys dieser Woche freigeben — Auswahl anderer Wochen bleibt bestehen.
        for (let i = 0; i < 5; i++) {
            (week.perDay[i]?.items || []).forEach(it => state.trackingOff.delete(_trackingItemKey(i, it)));
        }
    } else {
        for (let i = 0; i < 5; i++) {
            (week.perDay[i]?.items || []).forEach(it => state.trackingOff.add(_trackingItemKey(i, it)));
        }
    }
    _saveTrackingOff();
    _renderTrackingCard();
}

// KW-Feld geändert → andere Woche, andere Daten.
function onWeekChange() {
    _refreshTracking('kw');
    if (state.useTracking) _applyTrackingPrefill();
}

// Übernimmt echte Stunden, Fehltage und Schultage in die Generator-Einstellungen.
// Nur Vorbelegung — der User kann alles danach weiter von Hand ändern.
function _applyTrackingPrefill() {
    const week = state.trackingWeek;
    if (!week || !week.hasData) return false;
    let changed = false;

    const days = [];
    for (let i = 0; i < 5; i++) {
        const day = week.perDay[i];
        if (!day || day.isFrei) continue; // kein Eintrag / Gleittag → nichts zu berichten
        days.push(i);

        if (day.status && DAY_STATUS_LABELS[day.status]) {
            if (state.dayStatus[i] !== day.status) { setDayStatus(i, day.status); changed = true; }
        } else if (state.dayStatus[i]) {
            setDayStatus(i, ''); changed = true;
        }
    }

    if (days.length > 0 && days.join() !== state.selectedDays.join()) {
        state.selectedDays = days;
        changed = true;
    }

    const schoolDays = days.filter(i => week.perDay[i] && week.perDay[i].isSchool);
    if (schoolDays.join() !== state.schoolDayIndices.join()) {
        state.schoolDayIndices = schoolDays;
        changed = true;
    }

    if (changed) {
        document.querySelectorAll('.ais-day-chip[data-day]').forEach(c => {
            c.classList.toggle('selected', state.selectedDays.includes(parseInt(c.dataset.day)));
        });
        updateSchoolDayChips();
        _saveAiSettings();
    }
    return changed;
}

// Echte Stunden eines Tages (0 = nichts erfasst → Aufrufer nimmt seinen Default)
function _trackingHoursForDay(dayIdx) {
    if (!state.useTracking) return 0;
    const day = state.trackingWeek?.perDay?.[dayIdx];
    return day && day.hours > 0 ? day.hours : 0;
}

// ✦ Krank/Urlaub/Feiertag: Status für einen Tag setzen
function setDayStatus(dayIdx, status) {
    const btn = document.querySelector(`.ais-day-status-btn[data-day="${dayIdx}"]`);
    const use = btn?.querySelector('use');
    const inp = document.querySelector(`.ais-day-note-inp[data-day="${dayIdx}"]`);
    if (status && DAY_STATUS_LABELS[status]) {
        state.dayStatus[dayIdx] = status;
        if (btn) {
            btn.classList.remove('status-krank', 'status-urlaub', 'status-feiertag');
            btn.classList.add('status-' + status);
            if (use) use.setAttribute('href', '#' + DAY_STATUS_LABELS[status].svgId);
        }
        if (inp) {
            inp.disabled = true;
            inp.value = '';
            inp.placeholder = `— ${DAY_STATUS_LABELS[status].short} —`;
        }
        delete state.dayNotes[dayIdx];
    } else {
        delete state.dayStatus[dayIdx];
        const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        if (btn) {
            btn.classList.remove('status-krank', 'status-urlaub', 'status-feiertag');
            if (use) use.setAttribute('href', '#i-dash');
        }
        if (inp) {
            inp.disabled = false;
            inp.placeholder = (dayNames[dayIdx] || 'Tag') + '...';
        }
    }
}

// ✦ Cycle-Button: '' → krank → urlaub → feiertag → '' …
function cycleDayStatus(dayIdx) {
    const current = state.dayStatus[dayIdx] || '';
    const idx = DAY_STATUS_CYCLE.indexOf(current);
    const next = DAY_STATUS_CYCLE[(idx + 1) % DAY_STATUS_CYCLE.length];
    setDayStatus(dayIdx, next);
}

// Hilfe-Block zeigen/verstecken je nach Permission-Status
function _updateReminderHelp() {
    const help = document.getElementById('aisReminderHelp');
    if (!help) return;
    const denied = ('Notification' in window) && Notification.permission === 'denied';
    help.style.display = denied ? '' : 'none';
}

// ✦ Sonntag-Reminder: Toggle + Notification-Permission
function toggleSundayReminder(checked) {
    const chk = document.getElementById('aisSundayReminderChk');
    if (checked) {
        if (!('Notification' in window)) {
            showToast('Dein Browser unterstützt keine Benachrichtigungen', 'error');
            if (chk) chk.checked = false;
            return;
        }
        if (Notification.permission === 'denied') {
            showToast('Browser hat Notifications blockiert — siehe Anleitung unter dem Toggle', 'error');
            if (chk) chk.checked = false;
            _updateReminderHelp();
            return;
        }
        const enable = () => {
            state.sundayReminder = true;
            try { localStorage.setItem(STORAGE_KEYS.sundayReminder, '1'); } catch (e) { }
            showToast('Reminder aktiviert — Sonntag 18 Uhr', 'success');
            _scheduleSundayCheck();
            _updateReminderHelp();
        };
        if (Notification.permission === 'granted') {
            enable();
        } else {
            // 'default' → Browser fragen
            Notification.requestPermission().then(p => {
                if (p === 'granted') {
                    enable();
                } else if (p === 'denied') {
                    showToast('Du hast Benachrichtigungen abgelehnt — siehe Anleitung unter dem Toggle', 'warning');
                    if (chk) chk.checked = false;
                    _updateReminderHelp();
                } else {
                    showToast('Ohne Erlaubnis kein Reminder möglich', 'warning');
                    if (chk) chk.checked = false;
                }
            }).catch(err => {
                console.warn('[AIStudio] requestPermission failed:', err);
                showToast('Permission konnte nicht abgefragt werden — siehe Anleitung', 'error');
                if (chk) chk.checked = false;
                _updateReminderHelp();
            });
        }
    } else {
        state.sundayReminder = false;
        try { localStorage.setItem(STORAGE_KEYS.sundayReminder, '0'); } catch (e) { }
        showToast('Reminder deaktiviert', 'success');
    }
}

// Reminder-Check (alle 60s) — feuert Sonntag 18-22 Uhr falls KW noch nicht generiert
let _sundayCheckTimer = null;
function _scheduleSundayCheck() {
    if (_sundayCheckTimer) return; // schon aktiv
    const doCheck = () => {
        if (!state.sundayReminder) return;
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const now = new Date();
        if (now.getDay() !== 0) return;                  // nur Sonntag
        if (now.getHours() < 18 || now.getHours() > 22) return; // 18-22 Uhr
        const currentKW = getCalendarWeek();
        // Spam-Schutz: nur einmal pro KW
        let lastKW = null;
        try { lastKW = localStorage.getItem(STORAGE_KEYS.lastReminderKW); } catch (e) { }
        if (lastKW === String(currentKW)) return;
        // Wurde diese KW schon generiert? → kein Reminder
        const generated = state.generationHistory.some(w => w.calendarWeek === currentKW);
        if (generated) return;
        // Notification feuern
        try {
            new Notification('MyWorkLog — Berichtsheft offen', {
                body: `Sonntag-Reminder: KW ${currentKW} fehlt noch im Berichtsheft.`,
                icon: '/Grafiken/icon-192.png',
                tag: 'mwl-sunday-' + currentKW,
            });
        } catch (e) { console.warn('[AIStudio] Notification failed:', e); }
        try { localStorage.setItem(STORAGE_KEYS.lastReminderKW, String(currentKW)); } catch (e) { }
    };
    _sundayCheckTimer = setInterval(doCheck, 60000);
    doCheck(); // sofort beim Aktivieren prüfen
}

function toggleBerufPicker() {
    const picker = document.getElementById('aisBerufPicker');
    const display = document.getElementById('aisBerufDisplay');
    if (!picker) return;
    const isOpen = picker.classList.toggle('open');
    if (isOpen) {
        _renderBerufGrid('');
        setTimeout(() => document.getElementById('aisBerufSearch')?.focus(), 100);
    }
}

function filterBeruf(query) {
    _renderBerufGrid(query.toLowerCase());
}

function _renderBerufGrid(filter) {
    const grid = document.getElementById('aisBerufGrid');
    if (!grid) return;
    const profs = Object.values(PROFESSIONS).filter(p =>
        !filter || p.name.toLowerCase().includes(filter) || p.id.includes(filter) ||
        (p.category || '').toLowerCase().includes(filter)
    );
    grid.innerHTML = profs.map(p => `
                <div class="ais-beruf-opt${state.selectedProfession === p.id ? ' sel' : ''}"
                     data-prof="${p.id}" onclick="AIStudio._pickBeruf('${p.id}')">
                    <span class="ais-beruf-opt-icon">${p.icon}</span>
                    <span class="ais-beruf-opt-name">${p.name}</span>
                </div>
            `).join('');
}

function _pickBeruf(id) {
    selectProfession(id);
    // Close picker
    const picker = document.getElementById('aisBerufPicker');
    if (picker) picker.classList.remove('open');
    // Update display
    const prof = PROFESSIONS[id];
    const displayIcon = document.getElementById('aisBerufIcon');
    const displayName = document.getElementById('aisBerufName');
    const displayEl = document.getElementById('aisBerufDisplay');
    if (displayIcon) displayIcon.innerHTML = prof.icon;
    if (displayName) displayName.textContent = prof.name;
    if (displayEl) displayEl.classList.add('has-prof');
    _renderActivityChips(id);
    _updateProfileSummary();
    _saveProfile();
}

function _renderActivityChips(professionId) {
    const grid = document.getElementById('aisActivityGrid');
    if (!grid) return;
    const prof = PROFESSIONS[professionId];
    if (!prof) { grid.innerHTML = '<span class="ais-act-none">Kein Beruf gewählt</span>'; return; }

    // Build activity suggestions from yearTasks + objects
    const lj = state.lehrjahr || 2;
    const yearActivities = (prof.yearTasks?.[lj] || []).slice(0, 6);
    const objectActivities = (prof.objects || []).slice(0, 6).map(o => o.split(' ')[0] + (prof.verbs ? ' ' + prof.verbs[0] : ''));
    const allActivities = [...new Set([...yearActivities, ...objectActivities])].slice(0, 12);

    // Reset selected activities when profession changes
    state.selectedActivities = [];

    grid.innerHTML = allActivities.map(act => `
                <div class="ais-act-chip" data-act="${escapeHtml(act)}" onclick="AIStudio.toggleActivity(this)">${escapeHtml(act)}</div>
            `).join('');
}

function toggleActivity(el) {
    el.classList.toggle('sel');
    const act = el.dataset.act;
    if (el.classList.contains('sel')) {
        if (!state.selectedActivities.includes(act)) state.selectedActivities.push(act);
    } else {
        state.selectedActivities = state.selectedActivities.filter(a => a !== act);
    }
}

function _buildEnrichedPrompt() {
    const parts = [];
    const userText = document.getElementById('aisCustomPrompt')?.value?.trim() || '';
    if (userText) parts.push(userText);
    const dept = document.getElementById('aisDepartment')?.value?.trim() || '';
    if (dept) parts.push('Abteilung / Tätigkeiten: ' + dept);
    if (state.selectedActivities.length > 0) {
        parts.push('Aktivitäten: ' + state.selectedActivities.join(', '));
    }
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    Object.entries(state.dayNotes).forEach(([idx, note]) => {
        if (note) parts.push(`${dayNames[idx] || 'Tag'}: ${note}`);
    });
    return parts.join('. ');
}

// Fertige IHK-Formulierung fuer bekannte Begriffe. Das ist eine ZUGABE,
// kein Filter: was hier nicht steht, kommt woertlich durch.
function _kontextTemplate(kw) {
    const lower = String(kw).toLowerCase();
    if (lower.includes('rechnung')) return 'Rechnungen kontrolliert und gebucht';
    if (lower.includes('lieferschein')) return 'Lieferscheine geprüft und abgeheftet';
    if (lower.includes('sendung')) return 'Sendungsverfolgung durchgeführt und nachgehalten';
    if (lower.includes('einkauf')) return 'Einkaufsvorgänge bearbeitet und dokumentiert';
    if (lower.includes('bestellung')) return 'Bestellungen aufgegeben und verfolgt';
    if (lower.includes('lager')) return 'Lagerbestand kontrolliert und aktualisiert';
    if (lower.includes('abrechnung')) return 'Abrechnungen erstellt und geprüft';
    if (lower.includes('meeting') || lower.includes('besprechung')) return 'Teambesprechung vorbereitet und teilgenommen';
    if (lower.includes('kunde')) return 'Kundenkontakt gepflegt und Anfragen bearbeitet';
    if (lower.includes('mail') || lower.includes('e-mail')) return 'E-Mail-Korrespondenz bearbeitet';
    if (lower.includes('doku')) return 'Dokumentation erstellt und aktualisiert';
    if (lower.includes('schulung') || lower.includes('training')) return 'Schulungsunterlagen vorbereitet und Einarbeitung begleitet';
    return null;
}

// Text ohne Tagesmarke ("diese Woche viel Netzwerkkram") gilt fuer die ganze
// Woche. Frueher stand am Ende dieser Funktion ein `return null` fuer alles,
// was nicht auf einer Liste mit zwoelf Buero-Begriffen stand — Rechnung,
// Lieferschein, Lager, Kunde … Fuer einen Fachinformatiker, einen
// Kfz-Mechatroniker oder eine Pflegekraft hiess das: der ganze Text war weg,
// ohne eine einzige Meldung. Der Abschnitt kommt jetzt woertlich durch.
//
// Die ABTEILUNG geht bewusst NUR ueber die Begriffe: "Frontend-Team" ist ein
// Ort, keine Taetigkeit, und stuende als "• Frontend-Team" sinnlos im Heft.
function _customContextEntries(customPrompt, department) {
    const eintraege = [];

    const abschnitte = (txt, woertlich) => {
        String(txt || '').split(/[,\n;]/).forEach(part => {
            const segment = part.replace(/Abteilung\s*\/?\s*Tätigkeiten:\s*/i, '').trim();
            if (segment.length < 3) return;

            const treffer = [];
            segment.split(/\s+und\s+|\s+mit\s+|\s+sowie\s+/i).forEach(sp => {
                const t = _kontextTemplate(sp.trim());
                if (t && !treffer.includes(t) && !eintraege.includes(t)) treffer.push(t);
            });
            if (treffer.length > 0) { treffer.forEach(t => eintraege.push(t)); return; }

            // Der Abschnitt bleibt GANZ, nicht in "und"-Stuecken:
            // "eingerichtet und getestet" gehoert zusammen, sonst steht
            // "getestet" als eigener Eintrag im Berichtsheft.
            if (woertlich && !eintraege.includes(segment)) {
                eintraege.push(segment.charAt(0).toUpperCase() + segment.slice(1));
            }
        });
    };

    abschnitte(department, false);
    abschnitte(customPrompt, true);

    return eintraege.slice(0, 6).map(e => '• ' + e);
}

function _saveProfile() {
    try {
        const profile = {
            profession: state.selectedProfession,
            lehrjahr: state.lehrjahr,
            form: state.form,
            umfang: state.umfang,
            formHint: state.formHint,
            department: document.getElementById('aisDepartment')?.value?.trim() || '',
        };
        localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch (e) { }
}

function _loadProfile() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.profile);
        if (!raw) return;
        const profile = JSON.parse(raw);
        if (profile.profession && PROFESSIONS[profile.profession]) {
            state.selectedProfession = profile.profession;
            const prof = PROFESSIONS[profile.profession];
            const displayIcon = document.getElementById('aisBerufIcon');
            const displayName = document.getElementById('aisBerufName');
            const displayEl = document.getElementById('aisBerufDisplay');
            if (displayIcon) displayIcon.innerHTML = prof.icon;
            if (displayName) displayName.textContent = prof.name;
            if (displayEl) displayEl.classList.add('has-prof');
            _renderActivityChips(profile.profession);
        }
        if (profile.lehrjahr) {
            state.lehrjahr = profile.lehrjahr;
            document.querySelectorAll('.ais-lj-btn').forEach(b => {
                b.classList.toggle('sel', parseInt(b.dataset.lj) === profile.lehrjahr);
            });
        }
        // Bestandsprofile trugen "ausbilderStrenge" (entspannt|normal|streng|
        // sehr_streng). Der Regler steuerte in Wahrheit Form UND Menge; beim
        // Umstieg werden beide daraus abgeleitet, damit niemand seine
        // Einstellung verliert.
        const ALT_STRENGE = {
            entspannt: { form: 'ichform', umfang: 'kurz' },
            normal: { form: 'stichpunkte', umfang: 'mittel' },
            streng: { form: 'stichpunkte', umfang: 'ausfuehrlich' },
            sehr_streng: { form: 'saetze', umfang: 'ausfuehrlich' },
        };
        if (FORM_PATTERNS[profile.form]) state.form = profile.form;
        else if (ALT_STRENGE[profile.ausbilderStrenge]) state.form = ALT_STRENGE[profile.ausbilderStrenge].form;

        if (UMFANG_COUNT[profile.umfang]) state.umfang = profile.umfang;
        else if (ALT_STRENGE[profile.ausbilderStrenge]) state.umfang = ALT_STRENGE[profile.ausbilderStrenge].umfang;

        if (typeof profile.formHint === 'string') state.formHint = profile.formHint.slice(0, 300);

        document.querySelectorAll('.ais-form-card').forEach(c => {
            c.classList.toggle('sel', c.dataset.form === state.form);
        });
        document.querySelectorAll('.ais-umfang-chip').forEach(c => {
            c.classList.toggle('sel', c.dataset.umfang === state.umfang);
        });
        const hintEl = document.getElementById('aisFormHint');
        if (hintEl) hintEl.value = state.formHint;
        _renderFormBeispiel();
        if (profile.department) {
            const depEl = document.getElementById('aisDepartment');
            if (depEl) depEl.value = profile.department;
        }
        _updateProfileSummary();
    } catch (e) { }
}

function _updateProfileSummary() {
    const el = document.getElementById('aisProfileSummary');
    if (!el) return;
    const prof = state.selectedProfession ? PROFESSIONS[state.selectedProfession]?.name : null;
    const lj = state.lehrjahr || 2;
    if (prof) {
        el.innerHTML = `<span class="ais-prof-badge">${bhIcon(PROFESSIONS[state.selectedProfession]?.icon)} ${prof} · ${lj}. Lehrjahr</span>`;
    } else {
        el.textContent = 'Beruf & Lehrjahr einrichten';
    }
}

function _restoreApiSettings() {
    state.useCloud = true;
    const savedLocalOnly = localStorage.getItem(STORAGE_KEYS.useCloud) === '0';

    // Alte API-Keys aus der Direkt-API-Zeit wegräumen. Die Cloud-KI läuft
    // ausschließlich über den Proxy (auch auf localhost), der Key liegt im
    // Worker — auf dem Client gibt es keinen mehr.
    localStorage.removeItem('ais_cloud_api_key');
    localStorage.removeItem('ais_gemini_api_key');
    localStorage.removeItem('ais_use_gemini');

    if (savedLocalOnly) {
        state.useCloud = false;
        const cb = document.getElementById('aisUseLocalOnly');
        if (cb) cb.checked = false; // unchecked = Cloud-KI aus
        toggleLocalOnly(true);
    }
}


// ═══════════════════════════════════════
// GENERATE-BUTTON PROGRESS-UI
// ═══════════════════════════════════════
// Status-Messages werden mit der Zeit "ungeduldiger" und am Ende witzig.
// Erster Eintrag (t=0) ist Default beim Start.
const BTN_STATUS_MESSAGES = [
    { t: 0, msg: 'KI denkt nach…' },
    { t: 3000, msg: 'Tätigkeiten werden ausgewählt…' },
    { t: 6500, msg: 'Verben mit Substantiven verkuppelt…' },
    { t: 10000, msg: 'Berichtsheft formuliert…' },
    { t: 14000, msg: 'Letzter Schliff am Wortlaut…' },
    { t: 18000, msg: 'KI poliert noch ein bisschen…' },
    { t: 23000, msg: 'Hmm, das Modell sucht das perfekte Verb…' },
    { t: 30000, msg: 'KI hat kurz Kaffee geholt…' },
    { t: 40000, msg: 'Jetzt aber wirklich gleich…' },
];

let _btnProgress = { rafId: null, msgTimer: null, startTs: 0, finished: true };

function startBtnProgress() {
    const btn = document.getElementById('aisGenerateBtn');
    if (!btn) return;
    const fill = btn.querySelector('.ais-mega-fill');
    const percentEl = btn.querySelector('.ais-mega-percent');
    const msgEl = btn.querySelector('.ais-mega-message');

    // Reset visueller Zustand
    btn.classList.remove('success-pulse');
    btn.classList.add('loading');
    if (fill) fill.style.width = '0%';
    if (percentEl) percentEl.textContent = '0%';
    if (msgEl) { msgEl.textContent = BTN_STATUS_MESSAGES[0].msg; msgEl.classList.remove('fading'); }

    _btnProgress.startTs = Date.now();
    _btnProgress.finished = false;

    // Ease-out gegen TARGET_MAX (=90) — so dass die Bar nie "voll" wirkt
    // bevor wir tatsächlich fertig sind. Halbwertszeit ~6s.
    const TARGET_MAX = 90;
    const TAU = 6000;
    const tick = () => {
        if (_btnProgress.finished) return;
        const elapsed = Date.now() - _btnProgress.startTs;
        const pct = Math.min(TARGET_MAX, Math.floor(TARGET_MAX * (1 - Math.exp(-elapsed / TAU))));
        if (fill) fill.style.width = pct + '%';
        if (percentEl) percentEl.textContent = pct + '%';
        _btnProgress.rafId = requestAnimationFrame(tick);
    };
    _btnProgress.rafId = requestAnimationFrame(tick);

    // Message-Rotation alle 3.5s prüfen & ggf. wechseln
    const cycleMessage = () => {
        if (_btnProgress.finished) return;
        const elapsed = Date.now() - _btnProgress.startTs;
        let chosen = BTN_STATUS_MESSAGES[0].msg;
        for (const item of BTN_STATUS_MESSAGES) {
            if (elapsed >= item.t) chosen = item.msg;
        }
        if (msgEl && msgEl.textContent !== chosen) {
            msgEl.classList.add('fading');
            setTimeout(() => {
                if (_btnProgress.finished) return;
                msgEl.textContent = chosen;
                msgEl.classList.remove('fading');
            }, 220);
        }
        _btnProgress.msgTimer = setTimeout(cycleMessage, 3500);
    };
    _btnProgress.msgTimer = setTimeout(cycleMessage, 3500);
}

function stopBtnProgress(success) {
    if (_btnProgress.finished) return;
    _btnProgress.finished = true;
    if (_btnProgress.rafId) cancelAnimationFrame(_btnProgress.rafId);
    if (_btnProgress.msgTimer) clearTimeout(_btnProgress.msgTimer);

    const btn = document.getElementById('aisGenerateBtn');
    if (!btn) return;
    const fill = btn.querySelector('.ais-mega-fill');
    const percentEl = btn.querySelector('.ais-mega-percent');
    const msgEl = btn.querySelector('.ais-mega-message');

    if (success) {
        // Schnapp zu 100% + Grün-Pulse für 700ms
        if (fill) fill.style.width = '100%';
        if (percentEl) percentEl.textContent = '100%';
        if (msgEl) { msgEl.classList.remove('fading'); msgEl.textContent = 'Fertig'; }
        btn.classList.add('success-pulse');
        setTimeout(() => {
            btn.classList.remove('loading', 'success-pulse');
            if (fill) fill.style.width = '0%';
            if (percentEl) percentEl.textContent = '0%';
        }, 850);
    } else {
        // Error: ohne Pulse zurück in Ruhe
        btn.classList.remove('loading');
        if (fill) fill.style.width = '0%';
        if (percentEl) percentEl.textContent = '0%';
    }
}

async function generate() {
    if (state.isGenerating) return;
    if (!state.selectedProfession) {
        // Auto-open profile section and hint user
        const profileBody = document.getElementById('profileCollapse');
        const profileHdr = document.getElementById('profileCollapseHdr');
        if (profileBody && !profileBody.classList.contains('open')) {
            profileBody.classList.add('open');
            profileHdr?.classList.add('open');
        }
        showToast('Bitte wähle zuerst deinen Beruf im Profil', 'warning');
        return;
    }
    if (state.selectedDays.length === 0) {
        showToast('Bitte wähle mindestens einen Tag', 'warning');
        return;
    }

    // Rate-Limit: gilt NUR für Cloud-KI-Calls. Lokal-Only Modus
    // hat KEIN Limit — Cooldown/Daily zählen nur wenn der User
    // tatsächlich die Cloud nutzen würde.
    if (state.useCloud) {
        const _rlPre = RateLimit.check();
        if (_rlPre.reason === 'cooldown') {
            showToast(_rlPre.message, 'warning');
            _updateRateLimitUI();
            return;
        }
    }

    state.isGenerating = true;
    startBtnProgress();
    let _genSuccess = false;

    try {
        // Use lehrjahr from state (set via profile), fall back to hidden select if still present
        const yearNum = state.lehrjahr || 2;

        const umfang = UMFANG_COUNT[state.umfang] ? state.umfang : 'mittel';
        const form = FORM_PATTERNS[state.form] ? state.form : 'stichpunkte';

        const calendarWeek = parseInt(document.getElementById('aisCalendarWeek')?.value) || null;
        const department = document.getElementById('aisDepartment')?.value?.trim() || '';

        // Build enriched prompt from user text + activity chips + day notes
        const customPrompt = _buildEnrichedPrompt();

        // 🔴 Steht "Fr: Berufsschule" im Freitext, ist das eine Ansage — der
        // Tag muss auch als Schultag gelten. Zwei Bedienelemente auf denselben
        // Zustand driften garantiert auseinander (der Text sagte Freitag, die
        // Chips standen auf Donnerstag, nichts glich das ab). Der Text schreibt
        // deshalb NICHT am Regler vorbei, sondern SETZT ihn — sichtbar, damit
        // der Nutzer den Zustand am selben Ort sieht wie sonst auch.
        const _planSchule = _parseWochenplan(customPrompt).schoolDays
            .filter(i => state.selectedDays.includes(i));
        if (_planSchule.length > 0 && _planSchule.join() !== state.schoolDayIndices.join()) {
            const DAY_NAMES_P = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
            state.schoolDayIndices = [..._planSchule];
            updateSchoolDayChips();
            _saveAiSettings();
            showToast('Berufsschultag laut deinem Text: ' + _planSchule.map(i => DAY_NAMES_P[i]).join(', '), 'info');
        }

        const genOptions = {
            yearNum,
            umfang,
            form,
            formHint: state.formHint || '',
            selectedDays: state.selectedDays,
            schoolDayIndices: [...state.schoolDayIndices], // ✦ Multi-Select
            department,
            calendarWeek,
            customPrompt,
            activeTheme: state.activeTheme || null,
            // ✦ Aufgaben-Pipe + Tracking-Pipe + Krank/Urlaub: an Cloud + Local weiterreichen
            useAufgaben: !!state.useAufgaben,
            useTracking: !!state.useTracking,
            dayStatus: { ...state.dayStatus },
        };

        let week;
        let usedCloud = false;

        // Cloud-KI laeuft ueber den geteilten Proxy und ist die Vorgabe.
        // Der Schalter "Cloud-KI aktiv" ist der einzige Ausstieg.
        if (state.useCloud) {
            // Tageslimit: weicher Block — Fallback auf lokale Engine
            const _rlNow = RateLimit.check();
            if (_rlNow.reason === 'daily') {
                showToast(_rlNow.message, 'warning');
                _updateRateLimitUI();
                await new Promise(r => setTimeout(r, 300));
                week = generateWeek(state.selectedProfession, genOptions);
            } else {
                // Counter VOR dem Call hochzählen — fehlgeschlagene Versuche zählen mit
                RateLimit.increment();
                _updateRateLimitUI();
                try {
                    week = await generateWithCloud(state.selectedProfession, genOptions);
                    usedCloud = true;
                } catch (apiErr) {
                    console.warn('[AIStudio] Cloud-KI failed, using local engine:', apiErr.message);
                    if (apiErr.message.includes('Tageslimit')) {
                        showToast('Tageslimit erreicht — es läuft die lokale Engine', 'warning');
                    } else if (apiErr.message.includes('Burst-Limit')) {
                        showToast(apiErr.message + ' Nutze solange die lokale Engine.', 'warning');
                    } else if (apiErr.message.includes('Proxy nicht erreichbar')) {
                        showToast('Cloud-KI Proxy offline — es läuft die lokale Engine', 'warning');
                    }
                    await new Promise(r => setTimeout(r, 300));
                    week = generateWeek(state.selectedProfession, genOptions);
                }
            }
        } else {
            // User opted out of Cloud-KI → local engine
            await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
            week = generateWeek(state.selectedProfession, genOptions);
        }

        state.generatedEntries = week;

        // Save to history
        state.generationHistory.push(week);
        if (state.generationHistory.length > 50) {
            state.generationHistory = state.generationHistory.slice(-50);
        }
        try { localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.generationHistory)); } catch (e) { }

        // Switch to preview tab
        switchTab('preview');
        renderPreview(week);

        showToast(usedCloud ? `${week.days.length} Tage mit Cloud KI generiert` : `${week.days.length} Tage lokal generiert`, 'success');
        _genSuccess = true;
    } catch (e) {
        console.error('[AIStudio] Generation error:', e);
        showToast('Fehler bei der Generierung: ' + e.message, 'error');
    } finally {
        state.isGenerating = false;
        stopBtnProgress(_genSuccess);
        _updateRateLimitUI();
    }
}

function regenerateAll() {
    if (!state.selectedProfession) return;
    switchTab('generate');
    setTimeout(() => generate(), 100);
}

function regenerateDay(dayIdx) {
    if (!state.generatedEntries || !state.selectedProfession) return;

    const dayArrayIndex = state.generatedEntries.days.findIndex(d => d.index === dayIdx);
    if (dayArrayIndex === -1) return;

    const day = state.generatedEntries.days[dayArrayIndex];

    const yearNum = state.lehrjahr || 2;
    const umfang = UMFANG_COUNT[state.umfang] ? state.umfang : 'mittel';
    const form = FORM_PATTERNS[state.form] ? state.form : 'stichpunkte';

    const result = generateDayEntries(state.selectedProfession, {
        yearNum,
        umfang,
        form,
        dayIndex: day.index,
        isSchoolDay: day.isSchoolDay,
        excludePhrases: [...state.usedPhrases],
        trackingForDay: state.useTracking ? (_buildTrackingPayload()?.perDay[day.index] || null) : null,
    });

    state.generatedEntries.days[dayArrayIndex].entries = form === 'fliesstext'
        ? alsFliesstext(result.entries, day.name)
        : result.entries;
    if (result.schoolTopic) state.generatedEntries.days[dayArrayIndex].schoolTopic = result.schoolTopic;

    renderPreview(state.generatedEntries);
    showToast(`${day.name} lokal neu generiert`, 'info');
}

// Cloud-Variante: zählt gegen das Rate-Limit (Cooldown + 1/20),
// weil hier wirklich ein API-Call rausgeht.
async function regenerateDayCloud(dayIdx) {
    if (!state.generatedEntries || !state.selectedProfession) return;
    if (state.isGenerating) {
        showToast('Bitte warten — eine Generierung läuft schon.', 'warning');
        return;
    }
    if (!state.useCloud) {
        showToast('Cloud-KI ist aus. Schalte den Lokal-Toggle um oder nutze "Lokal neu".', 'warning');
        return;
    }

    const dayArrayIndex = state.generatedEntries.days.findIndex(d => d.index === dayIdx);
    if (dayArrayIndex === -1) return;
    const day = state.generatedEntries.days[dayArrayIndex];

    // Rate-Limit hart prüfen — Cooldown und Tageslimit BEIDE blocken hier,
    // weil der User explizit Cloud will (kein automatischer Fallback wie bei generate()).
    const _rl = RateLimit.check();
    if (_rl.reason === 'cooldown') {
        showToast(_rl.message, 'warning');
        _updateRateLimitUI();
        return;
    }
    if (_rl.reason === 'daily') {
        showToast(_rl.message + ' Nutze "Lokal neu" für freie Iteration.', 'warning');
        _updateRateLimitUI();
        return;
    }

    const yearNum = state.lehrjahr || 2;
    const umfang = UMFANG_COUNT[state.umfang] ? state.umfang : 'mittel';
    const form = FORM_PATTERNS[state.form] ? state.form : 'stichpunkte';

    state.isGenerating = true;
    _updateRateLimitUI();
    showToast(`${day.name} wird neu generiert…`, 'info');

    try {
        // Counter VOR dem Call hochzählen — Fehlversuche zählen mit (Pool-Schutz)
        RateLimit.increment();
        _updateRateLimitUI();

        const result = await generateWithCloud(state.selectedProfession, {
            yearNum,
            umfang,
            form,
            formHint: state.formHint || '',
            selectedDays: [dayIdx],
            schoolDayIndices: day.isSchoolDay ? [dayIdx] : [],
            department: state.generatedEntries.department || '',
            calendarWeek: state.generatedEntries.calendarWeek,
            customPrompt: _buildEnrichedPrompt(),
            activeTheme: state.activeTheme || null,
            useTracking: !!state.useTracking,
        });

        const newDay = result.days.find(d => d.index === dayIdx) || result.days[0];
        if (!newDay) throw new Error('Cloud-KI lieferte keinen Tag zurück.');

        state.generatedEntries.days[dayArrayIndex] = {
            ...state.generatedEntries.days[dayArrayIndex],
            entries: newDay.entries,
            hours: newDay.hours || state.generatedEntries.days[dayArrayIndex].hours,
            schoolTopic: newDay.schoolTopic ?? state.generatedEntries.days[dayArrayIndex].schoolTopic,
        };
        renderPreview(state.generatedEntries);
        showToast(`${day.name} mit Cloud-KI neu generiert`, 'success');
    } catch (e) {
        console.warn('[AIStudio] regenerateDayCloud failed:', e.message);
        showToast('Cloud-KI Fehler: ' + e.message + ' — versuche "Lokal neu" daneben.', 'error');
    } finally {
        state.isGenerating = false;
        _updateRateLimitUI();
    }
}

function updateEntry(dayIdx, entryIdx, newText) {
    const day = state.generatedEntries?.days?.find(d => d.index === dayIdx);
    if (!day?.entries?.[entryIdx]) return;
    day.entries[entryIdx] = '• ' + newText.trim();
}

function shuffleEntries() {
    if (!state.generatedEntries) return;
    for (const day of state.generatedEntries.days) {
        day.entries = shuffleArray(day.entries);
    }
    renderPreview(state.generatedEntries);
    showToast('Einträge gemischt', 'info');
}

function insertAll() {
    if (!state.generatedEntries) {
        showToast('Keine Einträge zum Einfügen vorhanden', 'warning');
        return;
    }
    fillFormWithGeneratedWeek(state.generatedEntries);
    close();
}

function insertDay(dayIdx) {
    const day = state.generatedEntries?.days?.find(d => d.index === dayIdx);
    if (!day) return;
    fillSingleDay(day, day.index);
}

function loadFromHistory(idx) {
    if (idx < 0 || idx >= state.generationHistory.length) return;
    state.generatedEntries = JSON.parse(JSON.stringify(state.generationHistory[idx]));
    state.selectedProfession = state.generatedEntries.profession;
    switchTab('preview');
    renderPreview(state.generatedEntries);
    renderHistory();
    showToast('Verlaufs-Eintrag geladen', 'info');
}

function deleteFromHistory(idx) {
    const el = document.getElementById('ais-hist-' + idx);
    if (el) el.classList.add('ais-confirming');
}

function cancelDeleteHistory(idx) {
    const el = document.getElementById('ais-hist-' + idx);
    if (el) el.classList.remove('ais-confirming');
}

function confirmDeleteHistory(idx) {
    if (idx < 0 || idx >= state.generationHistory.length) return;
    state.generationHistory.splice(idx, 1);
    try { localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.generationHistory)); } catch (e) { }
    renderHistory();
    showToast('Verlaufs-Eintrag gelöscht', 'info');
}


// Gegenrichtung: der Cloud-Zweig braucht Teile des Kerns. Steht hier unten,
// weil alle Namen erst ab hier feststehen — Funktionsdeklarationen sind zwar
// hochgezogen, `state` als const ist es nicht.
window.AIS_CLOUD.verbinde({
    state, DAY_STATUS_LABELS, generateSchoolEntry, generateDayEntries,
    getCalendarWeek, _loadAufgabenForWeek, _buildTrackingPayload, _trackingHoursForDay,
});

// ═══════════════════════════════════════
// PUBLIC INTERFACE
// ═══════════════════════════════════════

return {
    init,
    toggle,
    open,
    close,
    switchTab,
    selectProfession,
    onCustomProf,
    toggleDay,
    setSchoolDay,
    generate,
    regenerateAll,
    regenerateDay,
    regenerateDayCloud,
    updateEntry,
    shuffleEntries,
    insertAll,
    insertDay,
    loadFromHistory,
    deleteFromHistory,
    cancelDeleteHistory,
    confirmDeleteHistory,
    toggleLocalOnly,
    // v2 Azubi-First API
    selectMood,
    setForm,
    setUmfang,
    onFormHint,
    toggleCollapse,
    setLehrjahr,
    updateDayNote,
    toggleBerufPicker,
    filterBeruf,
    toggleActivity,
    _saveProfile,
    _pickBeruf,
    // ✦ Aufgaben-Pipe + Krank/Urlaub + Sonntag-Reminder + Settings-Persist
    toggleAufgaben,
    // ✦ Tracking-Pipe: echte Zeiterfassung als Grundlage
    toggleTracking,
    toggleTrackingItem,
    toggleAllTracking,
    onWeekChange,
    loadTrackingForWeek: _loadTrackingForWeek, // vom Bericht-Modal genutzt
    setDayStatus,
    cycleDayStatus,
    toggleSundayReminder,
    _saveAiSettings,
    VERSION,

    // Kern der lokalen Engine. Im Browser ruft die niemand von aussen — sie
    // stehen hier, damit tools/berichtsheft-*.test.mjs sie ohne Browser pruefen
    // kann. Frueher schnitten die Tests dafuer Bloecke per Textmarke aus der
    // HTML-Datei; das brach bei jeder Umformatierung und bei CRLF.
    _intern: {
        generateWeek, generateDayEntries, generateSchoolEntry, validateIHKCompliance,
        _customContextEntries, _kontextTemplate, getCalendarWeek,
    },
};

})();
