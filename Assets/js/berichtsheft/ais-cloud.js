// ═══ AIS-CLOUD ═══
// Der Cloud-Zweig des Generators: Rate-Limit, Prompt-Bau je Schreibform, die
// Reparatur der Modell-Antwort und der Aufruf beim Proxy.
//
// Die lokale Engine steht bewusst woanders (ais-studio.js). Beide bauen dieselbe
// Wochenstruktur, koennen aber Grundverschiedenes: das Sprachmodell formuliert
// frei, der Generator kombiniert nur. Was hier fehlt, fehlt im PROMPT — nicht im
// Code. Siehe .claude/notes/berichtsheft.md.
// Herausgeloest aus pages/berichtsheft/index.html.

window.AIS_CLOUD = (function () {
'use strict';

// Aus den Nachbarmodulen; beide stehen im HTML VOR dieser Datei.
const { PROFESSIONS, getCurrentSeason, UNIVERSAL_SCHULFAECHER } = window.AIS_BERUFE;
const { pickRandom, alsFliesstext, PLAN_TAG_INDEX } = window.AIS_SPRACHE;

// Aus dem Kern (ais-studio.js). Der reicht sie EINMAL herein, statt dass diese
// Datei sie holt: der Kern braucht seinerseits generateWithCloud, und zwei
// Dateien, die einander importieren, haben keine aufloesbare Ladereihenfolge.
//
// Bewusst `let` mit den GLEICHEN Namen wie im Kern. Dadurch steht jede Zeile
// darunter unveraendert so da wie vorher — `state.form`, `generateDayEntries(…)`.
// Ein Praefix (K.state) haette rund dreissig Stellen angefasst, von denen jede
// einzelne stumm haette danebengehen koennen.
let state, DAY_STATUS_LABELS, generateSchoolEntry, generateDayEntries,
    getCalendarWeek, _loadAufgabenForWeek, _buildTrackingPayload, _trackingHoursForDay;

const GEBRAUCHT = ['state', 'DAY_STATUS_LABELS', 'generateSchoolEntry', 'generateDayEntries',
    'getCalendarWeek', '_loadAufgabenForWeek', '_buildTrackingPayload', '_trackingHoursForDay'];

// Wirft statt still `undefined` zu behalten: ein fehlendes Stueck faellt sonst
// erst mitten in einer Generierung auf, und dann sieht es nach einem Fehler des
// Modells aus. tools/berichtsheft-module.test.mjs haelt die Liste gegen den Kern.
function verbinde(kern) {
    const fehlt = GEBRAUCHT.filter((n) => kern[n] === undefined);
    if (fehlt.length) throw new Error('[AIS_CLOUD] Kern unvollstaendig: ' + fehlt.join(', '));
    ({ state, DAY_STATUS_LABELS, generateSchoolEntry, generateDayEntries,
        getCalendarWeek, _loadAufgabenForWeek, _buildTrackingPayload, _trackingHoursForDay } = kern);
}

// ═══════════════════════════════════════
// CLOUD KI API INTEGRATION
// ═══════════════════════════════════════

// Worker-URL direkt (kein /api/* — Cloudflare Pages/Workers Routing-Konflikt).
// Localhost + Production gehen beide hier durch.
const CLOUD_PROXY = 'https://ai-proxy.myworklog.de';

// ═══════════════════════════════════════
// CLIENT-SIDE RATE LIMIT
// ═══════════════════════════════════════
// Schützt den geteilten OpenRouter Free-Tier Pool (1000 Credits/Tag,
// 13 Modelle geteilt). Limit gilt für ALLE Endpoints (auch localhost),
// damit Production-Bedingungen reproduzierbar sind.
// Tweak hier wenn nötig:
const RATE_LIMIT_DAILY = 20;     // Generationen pro User pro Tag
const RATE_LIMIT_COOLDOWN_MS = 10000;  // Pause zwischen zwei Calls
const RATE_LIMIT_STORAGE_KEY = 'tg_ai_rl';

const RateLimit = {
    _todayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    _read() {
        try {
            const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (data.date !== this._todayKey()) return null; // stale day → reset
            return data;
        } catch (e) { return null; }
    },
    _write(data) {
        try { localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(data)); } catch (e) { }
    },
    status() {
        const data = this._read() || { date: this._todayKey(), count: 0, lastTs: 0 };
        const now = Date.now();
        const cooldownMs = Math.max(0, (data.lastTs + RATE_LIMIT_COOLDOWN_MS) - now);
        return {
            count: data.count,
            remaining: Math.max(0, RATE_LIMIT_DAILY - data.count),
            cooldownMs,
        };
    },
    check() {
        const s = this.status();
        if (s.remaining <= 0) return {
            ok: false, reason: 'daily',
            message: `Tageslimit erreicht (${RATE_LIMIT_DAILY} Generationen). Morgen geht's weiter — nutze solange die lokale Engine.`,
        };
        if (s.cooldownMs > 0) return {
            ok: false, reason: 'cooldown',
            message: `Bitte noch ${Math.ceil(s.cooldownMs / 1000)}s warten, dann wieder generieren.`,
            cooldownMs: s.cooldownMs,
        };
        return { ok: true };
    },
    increment() {
        const today = this._todayKey();
        const data = this._read() || { date: today, count: 0, lastTs: 0 };
        data.date = today;
        data.count += 1;
        data.lastTs = Date.now();
        this._write(data);
    },
};

// Regelwerk je Schreibform fuer den Cloud-Prompt.
// stil      = die harten Formregeln (ersetzen den frueher fest verdrahteten
//             Block "max 10 Woerter / Partizip / keine Ich-Form")
// beispiel  = ein JSON-Beispiel IN DIESER FORM. Das Beispiel wiegt beim Modell
//             schwerer als jede Regel — stand dort ein Stichpunkt, kamen
//             Stichpunkte zurueck, egal was daneben steht.
// proTag    = wie viele entries-Elemente ein Tag hat
const CLOUD_FORM = {
    stichpunkte: {
        name: 'STICHPUNKTE (IHK-Standard)',
        stil: [
            'Jeder Eintrag startet DIREKT mit der Tätigkeit. Max 10 Wörter. EINE Tätigkeit, keine "und"-Verkettung.',
            'Form: "<Substantiv/Objekt> <Partizip>" — z.B. "<Komponente> konfiguriert", "<Dokument> erstellt".',
            'KEIN Satzzeichen am Ende. Keine Ich-Form. Keine Artikel am Satzanfang nötig.',
            '✗ Verboten: "Ich habe…", "Heute war ich…", ganze Sätze, Bewertungen ("viel gelernt").',
        ],
        beispiel: '["Wartungsprotokolle der Vorwoche gesichtet","Defekte Baugruppe ausgetauscht","Ergebnisse im Prüfbericht dokumentiert"]',
        schulBeispiel: '["Rechtsformen von Unternehmen im Unterricht behandelt","Übungsaufgaben zur Kaufvertragsstörung bearbeitet","Zusammenfassung für die Klassenarbeit erstellt"]',
        proTag: '3-5 Stichpunkte',
    },
    saetze: {
        name: 'GANZE SÄTZE (3. Person, Passiv)',
        stil: [
            'Jeder Eintrag ist EIN vollständiger Satz mit Punkt am Ende (Sprache siehe [SPRACHE]).',
            'Passiv oder unpersönlich, 3. Person: "Die Baugruppe wurde ausgetauscht." — Artikel gehören dazu.',
            'Max 20 Wörter pro Satz. Eine Tätigkeit pro Satz.',
            '✗ Verboten: Ich-Form ("Ich habe…"), Stichpunkte ohne Verb, Bewertungen.',
        ],
        beispiel: '["Die Wartungsprotokolle der Vorwoche wurden gesichtet und ausgewertet.","Die defekte Baugruppe wurde ausgetauscht.","Die Ergebnisse wurden im Prüfbericht dokumentiert."]',
        schulBeispiel: '["Im Unterricht wurden die Rechtsformen von Unternehmen behandelt.","Übungsaufgaben zur Kaufvertragsstörung wurden bearbeitet.","Für die Klassenarbeit wurde eine Zusammenfassung erstellt."]',
        proTag: '3-5 Sätze',
    },
    ichform: {
        name: 'ICH-FORM',
        stil: [
            'Jeder Eintrag ist EIN vollständiger Satz in der Ich-Form mit Punkt am Ende.',
            'Perfekt: "Ich habe … <Partizip>." Artikel gehören dazu ("die Baugruppe", nicht "Baugruppe").',
            'Max 20 Wörter pro Satz. Eine Tätigkeit pro Satz.',
            '✗ Verboten: Passiv, Stichpunkte ohne Verb, Bewertungen ("hat Spaß gemacht"), "Wir haben…".',
        ],
        beispiel: '["Ich habe die Wartungsprotokolle der Vorwoche gesichtet.","Ich habe die defekte Baugruppe ausgetauscht.","Ich habe die Ergebnisse im Prüfbericht dokumentiert."]',
        schulBeispiel: '["Ich habe im Unterricht die Rechtsformen von Unternehmen behandelt.","Ich habe Übungsaufgaben zur Kaufvertragsstörung bearbeitet.","Ich habe für die Klassenarbeit eine Zusammenfassung erstellt."]',
        proTag: '3-5 Sätze',
    },
    fliesstext: {
        name: 'FLIESSTEXT',
        stil: [
            'entries enthält GENAU EIN Element: einen zusammenhängenden Absatz für den ganzen Tag.',
            'Ich-Form, Perfekt, 3-5 Sätze, durch Bindewörter verbunden ("zunächst", "anschließend", "zum Abschluss").',
            'Der Absatz nennt den Wochentag am Anfang. Artikel gehören dazu.',
            '✗ Verboten: Aufzählungen, Zeilenumbrüche, Spiegelstriche, mehr als ein Array-Element.',
        ],
        beispiel: '["Am Montag habe ich zunächst die Wartungsprotokolle der Vorwoche gesichtet und ausgewertet. Anschließend habe ich die defekte Baugruppe ausgetauscht und einen Funktionstest durchgeführt. Zum Abschluss habe ich die Ergebnisse im Prüfbericht dokumentiert."]',
        schulBeispiel: '["Am Donnerstag habe ich in der Berufsschule zunächst die Rechtsformen von Unternehmen behandelt. Anschließend habe ich Übungsaufgaben zur Kaufvertragsstörung bearbeitet. Zum Abschluss habe ich für die Klassenarbeit eine Zusammenfassung erstellt."]',
        proTag: 'GENAU 1 Absatz (ein Array-Element)',
    },
};

const CLOUD_UMFANG = {
    kurz: { stichpunkte: '3 Einträge pro Tag', fliesstext: '2-3 Sätze im Absatz' },
    mittel: { stichpunkte: '4-5 Einträge pro Tag', fliesstext: '3-4 Sätze im Absatz' },
    ausfuehrlich: { stichpunkte: '6-7 Einträge pro Tag', fliesstext: '5-6 Sätze im Absatz' },
};

function _buildCloudPrompt(professionId, options) {
    const prof = PROFESSIONS[professionId];
    const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const daysList = options.selectedDays.map(d => DAY_NAMES[d]).join(', ');
    const profName = prof?.name || state.customProfession || professionId;
    const formId = CLOUD_FORM[options.form] ? options.form : 'stichpunkte';
    const F = CLOUD_FORM[formId];
    const umfangId = CLOUD_UMFANG[options.umfang] ? options.umfang : 'mittel';
    const mengeText = formId === 'fliesstext'
        ? CLOUD_UMFANG[umfangId].fliesstext
        : CLOUD_UMFANG[umfangId].stichpunkte;

    const ljHint = options.yearNum === 1
        ? '· 1. LJ: Grundlagen, unter Anleitung, einfache Routine-Aufgaben'
        : options.yearNum === 2
            ? '· 2. LJ: eigenständige Routine-Aufgaben, beginnende Verantwortung'
            : '· 3. LJ: komplexe/eigenverantwortliche Aufgaben, Anleitung von Jüngeren';

    // Eigene Berufe haben keine Faecherliste — dann die universellen Faecher
    // nennen statt "Rahmenlehrplan", sonst erfindet das Modell sich eines.
    const schoolTopicsHint = ((prof?.schoolTopics?.length ? prof.schoolTopics : UNIVERSAL_SCHULFAECHER) || []).slice(0, 5).join(', ');

    // Wochen-Stimmung (UI: Mood-Cards Normal/Projekt/Schule/Support/Prüfung)
    const themeMap = {
        projekt: 'Aktive Projekt-Phase: Sprint-Meetings, Konzeption, Implementierung, Code-Reviews als roter Faden durch die Woche.',
        kunde: 'Kunden-orientierte Woche: Kundengespräche, Anforderungsaufnahme, Präsentationen, Auftragsbearbeitung.',
        einarbeitung: 'Einarbeitungsphase: Neue Technologien studieren, Dokumentation lesen, Tutorials, Onboarding-Gespräche.',
        messe: 'Messe-Woche: Standvorbereitung, Produktvorstellungen, Networking, Nachbereitung.',
        wartung: 'Support/Wartung-Woche: Routinechecks, Tickets bearbeiten, Fehleranalyse, Updates einspielen.',
        schule: 'Schul-fokussierte Woche: viel Lern-Aktivität, Mitschriften, Gruppenarbeit, Prüfungsvorbereitung.',
        pruefung: 'Prüfungsvorbereitung: Wiederholung, Karteikarten, Übungsaufgaben, Lerngruppen.',
    };
    const themeBlock = (options.activeTheme && themeMap[options.activeTheme])
        ? `\n[WOCHEN-THEMA] ${themeMap[options.activeTheme]} — mindestens 2-3 Einträge in diese Richtung über die Woche verteilen.`
        : '';

    // Eigene Vorgabe ("So will es mein Ausbilder"). Steht bewusst NACH den
    // Formregeln und darf sie ueberschreiben — der Nutzer kennt seine Kammer.
    const formHintBlock = (options.formHint || '').trim()
        ? `\n- ⚠️ VORRANG vor allen Formregeln oben — eigene Vorgabe des Nutzers: ${String(options.formHint).trim()}`
        : '';

    const retryPrefix = options._retryHint
        ? `[ACHTUNG — VORHERIGER VERSUCH FALSCH] ${options._retryHint}\n\n`
        : '';

    // ✦ Tracking-Pipe: was der User laut Zeiterfassung wirklich gemacht hat.
    //   Steht über der Aufgaben-Pipe: Aufgaben sind geplant, das hier ist passiert.
    let trackingBlock = '';
    if (options.trackingData && options.trackingData.total > 0) {
        const per = options.trackingData.perDay || {};
        const lines = [];
        options.selectedDays.forEach(d => {
            const facts = per[d] || [];
            if (facts.length === 0) return;
            const hrs = options.trackingData.hours && options.trackingData.hours[d];
            const hrsTxt = hrs > 0 ? ` [${hrs} h erfasst]` : '';
            lines.push(`  · ${DAY_NAMES[d]}${hrsTxt}: ${facts.join(' | ')}`);
        });
        if (lines.length > 0) {
            trackingBlock = `

[ECHTE ZEITERFASSUNG — HÖCHSTE PRIORITÄT, noch vor allen anderen Inhalts-Regeln]
Das hat der User laut seiner eigenen Zeiterfassung tatsächlich getan. Diese Angaben sind KEINE Erfindung und müssen im Bericht ankommen:
- Jede genannte Angabe des Tages MUSS in den entries dieses Tages auftauchen — umformuliert in IHK-Partizip-Form, aber inhaltlich unverändert.
- Projekt- und Kundennamen aus diesem Block wörtlich übernehmen. Sie sind echt und von der [ANTI-HALLUZINATION]-Regel ausgenommen.
- Danach mit passenden Tätigkeiten zum Beruf auffüllen, bis der Tag 3-5 Einträge hat.
- Nichts hinzuerfinden, was den echten Angaben widerspricht.

${lines.join('\n')}
`;
        }
    }

    // ✦ Aufgaben-Pipe: Real-Tasks aus /pages/aufgaben/ als Anchor in den Prompt einspeisen
    let aufgabenBlock = '';
    if (options.aufgabenData && options.aufgabenData.total > 0) {
        const per = options.aufgabenData.perDay || {};
        const lines = [];
        options.selectedDays.forEach(d => {
            const tasks = (per[d] || []).slice(0, 4); // max 4 pro Tag, sonst zu viel
            if (tasks.length === 0) return;
            lines.push(`  · ${DAY_NAMES[d]}: ${tasks.join(' | ')}`);
        });
        if (lines.length > 0) {
            aufgabenBlock = `

[ECHTE AUFGABEN aus Wochenplanung — HOHE PRIORITÄT]
Der User hat folgende konkrete Aufgaben pro Tag eingetragen. Baue mindestens 1-2 davon pro Tag in die entries ein, formuliere sie IHK-konform um (Partizip-Form). Erweitere mit passenden Tätigkeiten zum Beruf, damit jeder Tag 3-5 Einträge hat. NIEMALS Aufgaben erfinden die nichts mit den Vorgaben zu tun haben.

${lines.join('\n')}
`;
        }
    }

    // 🔴 Der Bericht ist in der Sprache der Seite. Ohne diese Angabe
    // entscheidet das Modell selbst — und ein freies Modell hat einen
    // deutschen Wochenplan wortweise ins Englische uebersetzt und einen
    // englischen Ausbildungsnachweis geliefert. Der Prompt war komplett auf
    // Deutsch; das allein reicht nachweislich nicht.
    const _zielSprache = (typeof document !== 'undefined' && document.documentElement.lang === 'en')
        ? 'ENGLISCH' : 'DEUTSCH';

    // 🔴 Ein Schultag-Beispiel im Formatblock wiegt schwerer als jede Regel
    // weiter unten (siehe .claude/notes/berichtsheft.md). Ohne es hat das Modell
    // die Schultage regelmaessig mit Betriebs-Taetigkeiten gefuellt: im Beispiel
    // stand nur ein Tag mit isSchoolDay:false, und danach richtet es sich.
    const _schulIdxs = (Array.isArray(options.schoolDayIndices) ? options.schoolDayIndices : [])
        .filter(i => options.selectedDays.includes(i));
    const _hatSchule = _schulIdxs.length > 0;
    const _schulTagName = _hatSchule ? DAY_NAMES[_schulIdxs[0]] : '';
    const _schulBeispielZeile = _hatSchule
        ? `,
  {"day":"${_schulTagName}","entries":${F.schulBeispiel || F.beispiel},"hours":8,"isSchoolDay":true,"schoolTopic":"Wirtschafts- und Sozialkunde"}`
        : '';

    const systemPrompt = `${retryPrefix}Du bist Auszubildender zum ${profName} im ${options.yearNum}. Lehrjahr und schreibst deinen wöchentlichen IHK-Berichtsheft.

[KRITISCH — ANTWORT-FORMAT]
Antwort = JSON-ARRAY mit GENAU ${options.selectedDays.length} VOLLSTÄNDIGEN Tag-Objekten. Jedes Element MUSS alle 5 Felder enthalten: day, entries, hours, isSchoolDay, schoolTopic.

✓ RICHTIG — Schreibform ${F.name}. Nur die STRUKTUR UND DIE FORM nachbauen; der Inhalt ist ein Beispiel eines anderen Berufs und wird NIEMALS wörtlich übernommen:
[
  {"day":"Montag","entries":${F.beispiel},"hours":8,"isSchoolDay":false,"schoolTopic":null}${_schulBeispielZeile}
]
(Insgesamt ${options.selectedDays.length} Tage — jeder Tag mit EIGENEN, konkreten Tätigkeiten, jeder Tag ${F.proTag}.)

✗ VERBOTEN: Platzhalter als Inhalt. Kein "…", kein "...", kein "Tätigkeit 1", kein "TODO", kein leerer String.
   Jeder entries-Eintrag ist ein vollständiger, konkreter Satz in Partizip-Form.

✗ FALSCH:  {"day":"Montag",...}                ← einzelnes Objekt
✗ FALSCH:  {"days":[…]}                        ← verschachtelt
✗ FALSCH:  ["Montag: …","Dienstag: …"]        ← Strings statt Objekten
✗ FALSCH:  [["Tätigkeit 1","Tätigkeit 2"]]    ← nur entries ohne day-Feld

Kein Markdown. Kein Text drumherum. Antwort beginnt mit [ und endet mit ].

[SPRACHE — NICHT VERHANDELBAR]
- Jeder entries-Eintrag und jedes schoolTopic ist auf ${_zielSprache}. Kein einziger Eintrag in einer anderen Sprache.
- Der Wert von "day" bleibt trotzdem der deutsche Wochentagsname aus der Liste unten — das ist ein Schlüssel, keine Anzeige.
- 🔴 Was in [VORGABEN] steht, hat der User selbst geschrieben. Übersetze es NIEMALS und tausche seine Fachbegriffe nicht aus ("Active Directory" bleibt "Active Directory"). Seine Wortwahl bleibt erhalten; sie wird höchstens in die geforderte Schreibform gebracht.

[SCHREIBFORM — ${F.name}]
${F.stil.map(r => '- ' + r).join('\n')}
- ⚠️ Die Beispiele oben sind PLATZHALTER — übernimm sie NIEMALS wörtlich. Generiere für jeden Tag KONKRETE, UNTERSCHIEDLICHE Tätigkeiten passend zum Beruf "${profName}".
- Korrekte Fachbegriffe. Keine Einleitung, kein Fazit, keine Bewertung.${formHintBlock}

[ANTI-HALLUZINATION] Niemals erfinden: IP-Adressen, Personennamen (Herr/Frau X), Firmennamen (XY GmbH), Geldbeträge, Ticket-Nummern, konkrete Versions-/Modellnummern. Ausnahme: was unten in [VORGABEN] oder [ECHTE ZEITERFASSUNG] steht — das sind echte Angaben des Users und darf wörtlich übernommen werden.

[INHALT]
- ${mengeText}, immer hours=8 (Schultag: 8h Schule oder 6h+2h Betrieb).
- ${options.yearNum}. Lehrjahr. ${ljHint}
- Kein Tag wiederholt sich. Bleibe an Betriebstagen strikt im Beruf "${profName}" — kein bereichsfremder Inhalt. An Schultagen zählt stattdessen der Unterrichtsstoff (siehe [SCHULE]).
- Saison: ${getCurrentSeason()}${options.department ? `. Abteilung: ${options.department}` : ''}${themeBlock}

[SCHULE] ${_hatSchule
            ? `Schultage sind EXAKT: ${_schulIdxs.map(i => DAY_NAMES[i]).join(', ')} — keine anderen Tage. Der User hat das selbst eingestellt; es ist keine Empfehlung.
- An diesen Schultagen: isSchoolDay=true (boolean), schoolTopic="<EIN konkretes Fach aus dieser Liste: ${schoolTopicsHint}>", pro Schultag ein ANDERES Fach.
- entries eines Schultages beschreiben ausschließlich UNTERRICHT: behandelter Lernstoff, Lernfelder, Übungsaufgaben, Fachrechnen, Gruppenarbeit, Referat, Klassenarbeitsvorbereitung, Nachbereitung im Berufsschulheft. Dieselbe Schreibform ${F.name} wie oben.
- ✗ An einem Schultag verboten: Betrieb, Abteilung, Kunden, Aufträge, Werkstatt, Werkzeuge, Maschinen, Tickets, Kollegen, betriebliche Dokumentation. Wer im Betrieb war, war nicht in der Schule.
- Alle anderen Tage: isSchoolDay=false (IMMER boolean, NIEMALS null), schoolTopic=null, entries=[normale Betriebs-Tätigkeiten]`
            : `Kein Schultag diese Woche. Alle Tage: isSchoolDay=false (IMMER boolean, NIEMALS null), schoolTopic=null.`}
${options.customPrompt ? `
[VORGABEN — HÖCHSTE PRIORITÄT, überschreibt INHALT]
${options.customPrompt}

Tag-spezifische Stichpunkte (Pattern "Montag: X" / "Dienstag: Y") MÜSSEN in die entries des entsprechenden Tages eingebaut werden — nicht über die Woche verstreut.
"nur X" = wirklich nur X. "kein X" = wirklich kein X. Stichworte → IHK-Einträge im Stil oben.
` : ''}
[FACHVOKABULAR] ${prof ? `${profName} — Tools (wenn passend): ${(prof.tools || []).slice(0, 14).join(', ')}` : profName}
${trackingBlock}${aufgabenBlock}
[AUFTRAG] Genau ${options.selectedDays.length} Array-Elemente für: ${daysList}. KW ${options.calendarWeek || 'beliebig'}.`;

    return systemPrompt;
}

function _repairJSON(str) {
    // Fix literal control chars (newline, tab, CR) inside quoted strings
    let fixed = '';
    let inStr = false;
    let escaped = false;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (escaped) { fixed += ch; escaped = false; continue; }
        if (ch === '\\' && inStr) { fixed += ch; escaped = true; continue; }
        if (ch === '"') { inStr = !inStr; fixed += ch; continue; }
        if (inStr) {
            if (ch === '\n') { fixed += '\\n'; continue; }
            if (ch === '\r') { fixed += '\\r'; continue; }
            if (ch === '\t') { fixed += '\\t'; continue; }
        }
        fixed += ch;
    }
    str = fixed;

    // Remove trailing commas before ] or }
    str = str.replace(/,(\s*[}\]])/g, '$1');

    // Complete truncated JSON: track unclosed brackets/braces
    const opens = [];
    inStr = false;
    escaped = false;
    for (const ch of str) {
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (!inStr) {
            if (ch === '[' || ch === '{') opens.push(ch);
            else if (ch === ']' || ch === '}') opens.pop();
        }
    }
    if (inStr) str += '"';
    for (let i = opens.length - 1; i >= 0; i--) {
        str += opens[i] === '[' ? ']' : '}';
    }

    return str;
}

// Schneidet den Root-Wert exakt aus: vom ersten [ oder { bis zur PASSENDEN
// Schlussklammer. Nötig weil Modelle gern ein zweites Array oder Prosa
// anhängen — ein naives lastIndexOf(']') klebt beides zu "[A][B]" zusammen
// und JSON.parse stirbt mit "non-whitespace character after JSON".
// Bleibt die Klammer offen (echte Truncation), gibt's den Rest zurück —
// _repairJSON schließt dann auf.
function _sliceRootJSON(str) {
    const a = str.indexOf('['), o = str.indexOf('{');
    const start = a === -1 ? o : (o === -1 ? a : Math.min(a, o));
    if (start === -1) return str;

    const open = str[start], close = open === '[' ? ']' : '}';
    let depth = 0, inStr = false, escaped = false;
    for (let i = start; i < str.length; i++) {
        const ch = str[i];
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { if (inStr) escaped = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === open) depth++;
        else if (ch === close && --depth === 0) return str.slice(start, i + 1);
    }
    return str.slice(start);
}

// Schwache Free-Modelle escapen die STRUKTUR-Quotes (\" wo " hingehört), lassen
// dabei einzelne Quotes ganz weg (`entries\:` statt `"entries":`) und hängen
// Envelope-Reste an (`"}]"}`). Das Ergebnis ist unparsebar und desynct jeden
// String-bewussten Scanner.
// NUR als Fallback benutzen (siehe Parse-Kaskade): die Normalisierung opfert
// legitime Escapes im Fließtext zugunsten einer intakten Struktur.
// Der Key-Fix ist absichtlich auf die bekannten Schema-Keys begrenzt — ein
// generisches /"(\w+):/ würde Werte wie "Thema: Netzwerk" zerlegen.
function _deEscapeStructural(str) {
    return str
        .replace(/\\(?=["':,\[\]{}])/g, '')
        .replace(/"(day|entries|hours|isSchoolDay|schoolTopic)\s*:/g, '"$1":');
}

async function generateWithCloud(professionId, options) {
    // ✦ Krank/Urlaub/Feiertag-Tage NICHT von Cloud generieren lassen — werden später injiziert.
    const _origSelectedDays = options.selectedDays || [];
    const _dayStatus = options.dayStatus || {};
    const _statusDays = _origSelectedDays.filter(d => _dayStatus[d] && DAY_STATUS_LABELS[_dayStatus[d]]);
    const _normalDays = _origSelectedDays.filter(d => !_statusDays.includes(d));

    // Alle Tage Krank/Urlaub → keine KI nötig
    if (_normalDays.length === 0 && _statusDays.length > 0) {
        const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
        const prof = PROFESSIONS[professionId];
        const week = {
            profession: professionId,
            professionName: prof?.name || state.customProfession || professionId,
            professionIcon: prof?.icon || bhIcon(''),
            yearNum: options.yearNum,
            umfang: options.umfang,
            form: options.form,
            calendarWeek: options.calendarWeek || getCalendarWeek(),
            department: options.department || '',
            season: getCurrentSeason(),
            timestamp: Date.now(),
            source: 'status-only',
            days: _statusDays.map(d => ({
                index: d, name: DAY_NAMES[d], entries: [], hours: _trackingHoursForDay(d) || 8,
                isSchoolDay: false, schoolTopic: null, dayStatus: _dayStatus[d],
            })),
            totalHours: _statusDays.reduce((n, d) => n + (_trackingHoursForDay(d) || 8), 0),
        };
        return week;
    }

    // Aufgaben-Daten laden falls Toggle on
    const aufgabenData = options.useAufgaben ? _loadAufgabenForWeek() : null;
    // ✦ Tracking-Daten (echte Projekte/Notizen) falls Toggle on
    const trackingData = options.useTracking ? _buildTrackingPayload() : null;

    // Cloud-Call nur mit Normal-Tagen + Aufgaben-Block.
    // Schultage rausfiltern die gleichzeitig Status-Tage sind.
    const _origSchoolIdxs = Array.isArray(options.schoolDayIndices) ? options.schoolDayIndices : [];
    const _validSchoolIdxs = _origSchoolIdxs.filter(i => _normalDays.includes(i));
    const cloudOptions = {
        ...options,
        selectedDays: _normalDays,
        schoolDayIndices: _validSchoolIdxs,
        aufgabenData,
        trackingData,
    };
    const prompt = _buildCloudPrompt(professionId, cloudOptions);
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
        },
    };

    // Localhost UND Production gehen über den Cloudflare Worker (ai-proxy).
    // Der Worker hat CORS für localhost/127.0.0.1 erlaubt und kümmert sich
    // um OpenRouter-Übersetzung. Kein API-Key im Browser nötig.
    const fetchHeaders = {
        'Content-Type': 'application/json',
        'X-MyWorkLog-Token': 'FISI-Berichtsheft-2026',
    };

    const response = await fetch(CLOUD_PROXY, {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const rawText = await response.text().catch(() => '(kein Body)');
        console.error(`[AIStudio] Worker ${response.status} – Raw response:`, rawText);
        let errMsg = response.statusText || String(response.status);
        try {
            const errData = JSON.parse(rawText);
            errMsg = errData?.error?.message || errData?.message || errMsg;
        } catch (_) { }
        if (response.status === 429) {
            // Retry-After (in s) unterscheidet Burst-Limit (10-Min-Window) von Tageslimit.
            const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10);
            if (retryAfter > 0 && retryAfter < 900) {
                throw new Error(`Burst-Limit erreicht — in ca. ${Math.ceil(retryAfter / 60)} Min wieder verfügbar.`);
            }
            // Tageslimit: Client-Counter auf MAX synchronisieren, damit UI das Limit zeigt.
            try {
                const _td = new Date();
                localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify({
                    date: `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`,
                    count: RATE_LIMIT_DAILY,
                    lastTs: Date.now(),
                }));
            } catch (e) { }
            throw new Error('Tageslimit erreicht — morgen geht\'s weiter, nutze solange die lokale Engine.');
        }
        if (response.status === 403) throw new Error('Proxy nicht erreichbar (403). Worker-URL oder CORS prüfen.');
        throw new Error(`Cloud-KI Fehler (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) throw new Error('Leere Antwort von Cloud-KI.');

    // Welches Modell hat geantwortet? (Worker setzt modelVersion + X-MWL-Model.)
    // X-MWL-Salvage=1 heißt: KEIN Modell lieferte sauberes JSON, der Worker gibt
    // die am wenigsten kaputte Antwort zur Client-Reparatur zurück.
    if (response.headers.get('X-MWL-Salvage') === '1') {
        console.warn(`[AIStudio] Worker-Salvage: kein Modell lieferte valides JSON (zuletzt ${data.modelVersion || '?'}) — Repair-Kaskade übernimmt.`);
    } else if (data.modelVersion) {
        console.log(`[AIStudio] Antwort von Modell: ${data.modelVersion}`);
    }

    // Parse JSON from response (may be wrapped in markdown code block)
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    // Root-Wert exakt ausschneiden (erstes [ oder { → passende Schlussklammer).
    jsonStr = _sliceRootJSON(jsonStr);

    // Pre-Fix bekannte Modell-Bugs VOR JSON.parse:
    // 1. Multi-day in einem Objekt — dup-keys werden von JSON.parse stillschweigend
    //    auf den letzten reduziert → wir verlieren 4/5 Tage. Erkennen am Pattern
    //    {"day":"Mo",…,"day":"Di",…} und in Array splitten.
    if (jsonStr.trim().startsWith('{') && (jsonStr.match(/"day"\s*:/g) || []).length > 1) {
        jsonStr = '[' + jsonStr.replace(/,\s*("day"\s*:\s*")/g, '},{$1') + ']';
        console.warn('[AIStudio] Pre-Fix: multi-day-object → array');
    }
    // (Der frühere Pre-Fix für Struktur-Quotes ist raus: er ersetzte nur \": und :\",
    //  ließ Reste wie `entries\:` stehen und erzeugte damit "Bad escaped character".
    //  Ersetzt durch die de-escape-Stufe der Parse-Kaskade unten.)

    // Parse-Kaskade — jede Stufe ein härterer Reparatur-Versuch.
    // Die de-escape-Stufen setzen bewusst auf textContent auf (nicht auf jsonStr):
    // bei kaputtem Escaping desynct der Klammer-Scanner, also erst normalisieren,
    // dann neu schneiden.
    let daysData, _parseErr = null;
    const _attempts = [
        ['direkt', () => jsonStr],
        ['repair', () => _repairJSON(jsonStr)],
        ['de-escape', () => _sliceRootJSON(_deEscapeStructural(textContent))],
        ['de-escape+repair', () => _repairJSON(_sliceRootJSON(_deEscapeStructural(textContent)))],
    ];
    for (const [_stage, _build] of _attempts) {
        try {
            daysData = JSON.parse(_build());
            if (_stage !== 'direkt') console.warn(`[AIStudio] JSON gerettet via Stufe "${_stage}".`);
            _parseErr = null;
            break;
        } catch (e) { _parseErr = e; }
    }
    if (_parseErr) {
        console.error('[AIStudio] JSON nicht reparierbar:', _parseErr.message);
        console.error('[AIStudio] Roh-Antwort des Modells (vollständig):\n' + textContent);
        throw new Error('Cloud-KI hat ungültiges JSON zurückgegeben. Bitte nochmals versuchen.');
    }

    // Tolerantes Parsing: kleine Modelle liefern oft EIN Objekt statt Array,
    // oder wrappen in {days:[...]}. Nur entwrappen wenn Items Day-shaped sind
    // (sonst nehmen wir Strings für Day-Objekte → "Tag X: kein Objekt"-Fehler).
    const _looksLikeDay = (x) => x && typeof x === 'object' && typeof x.day === 'string';

    // Deep-Search: durchsucht verschachtelte Objekte/Arrays nach Day-Items.
    // Hilft bei Modellen, die das Array unter unerwarteten Keys verstecken
    // (z.B. {"berichtsheft":{"woche":[...]}} oder verschachtelte JSON-Schichten).
    const _deepFindDays = (node, depth) => {
        if (depth > 4 || node == null) return [];
        if (Array.isArray(node)) {
            const direct = node.filter(_looksLikeDay);
            if (direct.length) return direct;
            for (const item of node) {
                const found = _deepFindDays(item, depth + 1);
                if (found.length) return found;
            }
            return [];
        }
        if (typeof node === 'object') {
            // Day-keyed Pattern: {"Montag":{entries:[…]}, "Dienstag":{…}}
            const dayKeyRx = /^(montag|dienstag|mittwoch|donnerstag|freitag)$/i;
            const dayKeys = Object.keys(node).filter(k => dayKeyRx.test(k));
            if (dayKeys.length >= 2) {
                console.warn('[AIStudio] Deep-Extract: day-keyed Objekt-Pattern erkannt');
                return dayKeys.map(k => {
                    const v = node[k] || {};
                    const entries = Array.isArray(v.entries) ? v.entries
                        : Array.isArray(v.eintraege) ? v.eintraege
                            : Array.isArray(v) ? v
                                : (typeof v === 'string' ? [v] : []);
                    return {
                        day: k.charAt(0).toUpperCase() + k.slice(1).toLowerCase(),
                        entries,
                        hours: typeof v.hours === 'number' ? v.hours : 8,
                        isSchoolDay: !!v.isSchoolDay,
                        schoolTopic: v.schoolTopic || null,
                    };
                });
            }
            for (const v of Object.values(node)) {
                const found = _deepFindDays(v, depth + 1);
                if (found.length) return found;
            }
        }
        return [];
    };

    if (!Array.isArray(daysData)) {
        if (daysData && typeof daysData === 'object') {
            if (Array.isArray(daysData.days) && daysData.days.length && daysData.days.every(_looksLikeDay)) daysData = daysData.days;
            else if (Array.isArray(daysData.week) && daysData.week.length && daysData.week.every(_looksLikeDay)) daysData = daysData.week;
            else if (Array.isArray(daysData.tage) && daysData.tage.length && daysData.tage.every(_looksLikeDay)) daysData = daysData.tage;
            else if (typeof daysData.day === 'string') {
                console.warn('[AIStudio] Modell lieferte EIN Objekt statt Array — wrappe');
                daysData = [daysData];
            } else {
                // Letzter Versuch: Deep-Search durch beliebig verschachtelte Struktur
                const found = _deepFindDays(daysData, 0);
                if (found.length) {
                    console.warn(`[AIStudio] Deep-Extract: ${found.length} Day-Items aus verschachtelter Struktur extrahiert`);
                    daysData = found;
                }
            }
        }
    }
    if (!Array.isArray(daysData) || daysData.length === 0) {
        // Format komplett unerkannt → Raw-Response loggen für Debug
        console.error('[AIStudio] Unbekanntes Format. Raw (500Z):', textContent.slice(0, 500));
        // Statt sofort werfen: Retry triggern (nur einmal) — vielleicht klappt der nächste Versuch
        if (!options._isRetry) {
            console.warn('[AIStudio] Retry mit explizitem Array-Hinweis');
            return generateWithCloud(professionId, {
                ...options,
                _isRetry: true,
                _retryHint: `Die letzte Antwort war kein JSON-Array sondern ein anderes Format. Die nächste Antwort MUSS exakt ein JSON-ARRAY mit ${options.selectedDays.length} Tag-Objekten sein. Format: [{"day":"Montag","entries":["…","…","…"],"hours":8,"isSchoolDay":false,"schoolTopic":null}, …]. KEIN Wrapper-Objekt, KEIN day-keyed Objekt, KEINE Erklärung — NUR das Array beginnend mit [ und endend mit ].`,
            });
        }
        throw new Error('Unerwartetes Antwort-Format von Cloud-KI.');
    }

    // Auto-Retry (genau 1x): Anzahl ODER Struktur kaputt → erneut anfragen mit explizitem Hinweis.
    // Zählt NICHT als 2. Klick im User-Rate-Limit (Pool-Schutz durch CF WAF).
    const expectedDays = _normalDays.length;
    const _isDayShaped = (x) => x && typeof x === 'object' && typeof x.day === 'string';
    const _validItems = daysData.filter(_isDayShaped).length;
    const _tooFew = daysData.length < expectedDays;
    const _wrongShape = _validItems < daysData.length;

    // Schwache Free-Modelle schreiben gern die Format-Vorlage ab statt Inhalte zu
    // liefern ("…", "...", "Tätigkeit 1"). Als Woche wertlos → wie Struktur-Fehler
    // behandeln und den Retry mit explizitem Hinweis fahren.
    const _isPlaceholder = (s) => typeof s !== 'string' ||
        s.replace(/[.…\s]/g, '') === '' ||
        /^(t[äa]tigkeit|aufgabe|eintrag|todo|tbd)\s*\d*$/i.test(s.trim());
    const _hasPlaceholders = daysData.some(d =>
        d && Array.isArray(d.entries) && d.entries.some(_isPlaceholder));

    if ((_tooFew || _wrongShape || _hasPlaceholders) && !options._isRetry) {
        const _reason = _hasPlaceholders
            ? `Die entries enthielten Platzhalter (z.B. "…" oder "Tätigkeit 1") statt echter Tätigkeiten.`
            : _wrongShape
                ? `Items im Array waren keine vollständigen Tag-Objekte (es fehlte "day").`
                : `Antwort enthielt nur ${daysData.length} statt ${expectedDays} Tage.`;
        console.warn(`[AIStudio] Retry — ${_reason}`);
        return generateWithCloud(professionId, {
            ...options,
            _isRetry: true,
            _retryHint: `${_reason} Diesmal MUSS die Antwort ein JSON-ARRAY mit GENAU ${expectedDays} VOLLSTÄNDIGEN Tag-Objekten sein — jedes Element mit den Feldern day, entries, hours, isSchoolDay, schoolTopic. Jeder entries-Eintrag ist ein AUSGESCHRIEBENER, konkreter Satz in Partizip-Form (z.B. "Kundenanfragen im Ticketsystem erfasst und priorisiert") — NIEMALS Platzhalter wie "…", "..." oder "Tätigkeit 1".`,
        });
    }

    const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    const prof = PROFESSIONS[professionId];

    // Build the same week structure as generateWeek()
    const week = {
        profession: professionId,
        professionName: prof?.name || state.customProfession || professionId,
        professionIcon: prof?.icon || bhIcon(''),
        yearNum: options.yearNum,
        umfang: options.umfang,
        form: options.form,
        calendarWeek: options.calendarWeek || getCalendarWeek(),
        department: options.department || (prof?.departments ? pickRandom(prof.departments) : ''),
        season: getCurrentSeason(),
        timestamp: Date.now(),
        source: 'cloud',
        days: [],
        totalHours: 0,
    };

    // 🔴 Welche Tage Berufsschule sind, hat der Nutzer in den Einstellungen
    // festgelegt — das ist keine Frage, die das Modell beantwortet. Es hielt
    // sich aber nicht zuverlaessig daran: mal kam isSchoolDay=false auf einem
    // gewaehlten Tag samt Betriebs-Taetigkeiten, mal ein Schultag auf einem Tag,
    // den niemand gewaehlt hatte. Beides sah in der Vorschau plausibel aus.
    // Die Wahl des Nutzers gewinnt; passt der gelieferte Text nicht dazu, baut
    // die lokale Engine den Tag neu — lieber weniger Sprachwitz als ein Tag,
    // der das Gegenteil der Einstellung behauptet.
    const _schulGewollt = new Set(_validSchoolIdxs);
    let _schulKorrigiert = 0;

    for (const dayData of daysData) {
        const dayName = dayData.day || '';
        // Das Modell soll den deutschen Namen liefern, tut es aber nicht
        // immer — auf /en/ kommt schon mal "Monday" zurueck. Ein -1 hier
        // haette den Tag stillschweigend fallen lassen.
        const _direkt = DAY_NAMES.indexOf(dayName);
        const dayIdx = _direkt >= 0
            ? _direkt
            : (PLAN_TAG_INDEX[String(dayName).trim().toLowerCase()] ?? -1);
        if (dayIdx === -1) continue;

        // Fliesstext ist EIN Absatz. Liefert das Modell trotz Prompt mehrere
        // Elemente, werden sie zusammengezogen statt als Liste durchgereicht —
        // sonst steht im Berichtsheft eine Aufzaehlung, wo Fliesstext gewaehlt war.
        let cloudEntries = Array.isArray(dayData.entries) ? dayData.entries.map(e => String(e).trim()).filter(Boolean) : [];
        if (options.form === 'fliesstext' && cloudEntries.length > 1) {
            cloudEntries = [cloudEntries.map(e => /[.!?]$/.test(e) ? e : e + '.').join(' ')];
        }

        const _sollSchule = _schulGewollt.has(dayIdx);
        const _cloudTopic = String(dayData.schoolTopic || '').trim();
        // Hat das Modell den Tag ueberhaupt als Schultag verstanden? Eines der
        // beiden Felder reicht — wer schoolTopic setzt, hat Schulstoff geschrieben,
        // auch wenn das Flag fehlt. Nur wenn BEIDE fehlen, ist der Text Betrieb.
        const _cloudSchule = !!dayData.isSchoolDay || !!_cloudTopic;
        let schoolTopic = _sollSchule ? (_cloudTopic || null) : null;

        if (_sollSchule !== _cloudSchule) {
            const _ersatz = generateDayEntries(professionId, {
                yearNum: options.yearNum,
                umfang: options.umfang,
                form: options.form,
                dayIndex: dayIdx,
                isSchoolDay: _sollSchule,
                season: getCurrentSeason(),
                excludePhrases: [],
                department: week.department,
                activeTheme: options.activeTheme || null,
                customPrompt: options.customPrompt || '',
            });
            cloudEntries = options.form === 'fliesstext'
                ? alsFliesstext(_ersatz.entries, dayName)
                : _ersatz.entries;
            schoolTopic = _ersatz.schoolTopic || null;
            _schulKorrigiert++;
        } else if (_sollSchule && !schoolTopic) {
            // Schulstoff kam, nur die Fachbezeichnung fehlt — die traegt die
            // Vorschau und das Wochenfeld, also lokal nachziehen statt leer lassen.
            schoolTopic = generateSchoolEntry(professionId, options.yearNum, options.form) || null;
        }

        const day = {
            index: dayIdx,
            name: dayName,
            entries: cloudEntries,
            // Echte erfasste Stunden schlagen den Schätzwert der KI
            hours: _trackingHoursForDay(dayIdx) || dayData.hours || 8,
            isSchoolDay: _sollSchule,
            schoolTopic,
        };
        week.days.push(day);
        week.totalHours += day.hours;
    }

    if (_schulKorrigiert > 0) {
        console.warn(`[AIStudio] ${_schulKorrigiert} Tag(e) wichen von der Schultag-Einstellung ab — lokal neu gebaut`);
    }

    if (week.days.length === 0) {
        throw new Error('Keine gültigen Tage in der Cloud-KI-Antwort.');
    }

    // Hybrid-Fallback: fehlt die KI noch Tage (z.B. Modell hat trotz Retry
    // nur 1 statt 5 Tage geliefert) → mit lokaler Engine auffüllen.
    // User bekommt dann immer eine vollständige Woche.
    const expectedDayIndices = _normalDays;
    const haveDayIndices = new Set(week.days.map(d => d.index));
    const missingDayIndices = expectedDayIndices.filter(idx => !haveDayIndices.has(idx));

    if (missingDayIndices.length > 0) {
        console.warn(`[AIStudio] KI lieferte nur ${week.days.length}/${expectedDayIndices.length} Tage — fülle ${missingDayIndices.length} Tag(e) lokal nach`);
        const season = getCurrentSeason();
        const usedSchoolSet = new Set(Array.isArray(options.schoolDayIndices) ? options.schoolDayIndices : []);

        for (const dayIdx of missingDayIndices) {
            try {
                const result = generateDayEntries(professionId, {
                    yearNum: options.yearNum,
                    umfang: options.umfang,
                    form: options.form,
                    dayIndex: dayIdx,
                    isSchoolDay: usedSchoolSet.has(dayIdx),
                    season,
                    excludePhrases: [],
                    department: week.department,
                    activeTheme: options.activeTheme || null,
                    customPrompt: options.customPrompt || '',
                });
                week.days.push({
                    index: dayIdx,
                    name: DAY_NAMES[dayIdx],
                    entries: options.form === 'fliesstext'
                        ? alsFliesstext(result.entries, DAY_NAMES[dayIdx])
                        : result.entries,
                    hours: result.hours || 8,
                    isSchoolDay: result.isSchoolDay,
                    schoolTopic: result.schoolTopic || null,
                });
                week.totalHours += result.hours || 8;
            } catch (synthErr) {
                console.error(`[AIStudio] Lokales Auffüllen für Tag ${dayIdx} fehlgeschlagen:`, synthErr);
            }
        }
        // Tage nach Wochentags-Index sortieren damit Reihenfolge stimmt
        week.days.sort((a, b) => a.index - b.index);
        // Quellen-Tag: Hybrid statt rein cloud
        week.source = 'cloud+local';
        week.partialAI = { aiDays: week.days.length - missingDayIndices.length, localDays: missingDayIndices.length };
    }

    // Lokal neu gebaute Schultage zaehlen genauso wie nachgefuellte Tage: die
    // Quellenangabe soll nicht "Cloud KI" behaupten, wo lokaler Text steht.
    if (_schulKorrigiert > 0) {
        week.source = 'cloud+local';
        const _lokal = (week.partialAI?.localDays || 0) + _schulKorrigiert;
        week.partialAI = { aiDays: Math.max(0, week.days.length - _lokal), localDays: _lokal };
    }

    // ✦ Status-Tage (Krank/Urlaub/Feiertag) am Ende injizieren + Woche sortieren
    const DAY_NAMES_2 = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    if (_statusDays.length > 0) {
        _statusDays.forEach(d => {
            const statusHours = _trackingHoursForDay(d) || 8;
            week.days.push({
                index: d,
                name: DAY_NAMES_2[d],
                entries: [],
                hours: statusHours,
                isSchoolDay: false,
                schoolTopic: null,
                dayStatus: _dayStatus[d],
            });
            week.totalHours += statusHours;
        });
        week.days.sort((a, b) => a.index - b.index);
    }

    return week;
}

return {
    verbinde, GEBRAUCHT,
    CLOUD_PROXY, RATE_LIMIT_DAILY, RATE_LIMIT_COOLDOWN_MS, RateLimit,
    CLOUD_FORM, CLOUD_UMFANG, _buildCloudPrompt,
    _repairJSON, _sliceRootJSON, _deEscapeStructural,
    generateWithCloud,
};
})();
