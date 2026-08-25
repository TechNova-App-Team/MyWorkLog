// ═══ BBIG-SCANNER MODULE ═══

(function() {

// Self-contained HTML escaper — no dependency on global safeHTML/esc
function bbigEsc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ─── Text-Normalisierung ───
// Bringt User-Input in matchbare Form: NBSP→Space, Quotes glätten,
// Whitespace kollabieren, lowercase. Umlaut-Varianten (ae/oe/ue) werden
// in den Patterns direkt mit-ge-or-t — kein Text-Rewriting, das verbiegt Indizes.
function normalizeText(s) {
    return String(s || '')
        .replace(/ /g, ' ')
        .replace(/[‘’ʼ`´]/g, "'")
        .replace(/[“”„]/g, '"')
        .replace(/–|—/g, '-')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        // Umlaut -> ASCII. JS-`\b` greift ohne /u-Flag nicht zwischen Space
        // und Umlaut-Buchstabe — `\b(ü|ue)berfordert` würde sonst auf
        // "überfordert" leerlaufen. Patterns nutzen weiter (ü|ue) / (ä|ae)
        // Alternativen, damit beide Schreibweisen im Quelltext lesbar bleiben.
        .replace(/ü/g, 'ue')
        .replace(/ö/g, 'oe')
        .replace(/ä/g, 'ae')
        .replace(/ß/g, 'ss')
        .trim();
}

// ─── Negations-Detection ───
// Schaut sich die letzten ~30 Zeichen vor dem Match an. Findet einen
// Klausel-Terminator (, . ; ! ?), schneidet alles davor weg. Triggert nur
// auf Negationen IM SELBEN Teilsatz — "kein samstag, aber sonntag rein"
// soll für sonntag NICHT als negiert gelten.
var NEGATION_RE = /\b(kein(e|er|en|es|s)?|nicht|nichts|niemals|nie|ohne|weder|noch\s+nie)\b/;
var TRANSITION_RE = /\b(aber|jedoch|trotzdem|doch|dennoch|allerdings|sondern)\b/;

// Negation nur dann auf das Keyword anwenden, wenn:
//   1. innerhalb desselben Teilsatzes (kein Komma/Punkt dazwischen)
//   2. keine Transition-Wort dazwischen (aber/jedoch/...)
//   3. höchstens 1 Wort zwischen Negation und Keyword
// Sonst bezog sich die Negation wahrscheinlich auf etwas anderes
// ("ohne Pause durchgemacht bis 22:00" → "ohne" gilt für Pause, nicht 22:00).
function isNegated(text, matchIndex) {
    if (matchIndex <= 0) return false;
    var WIN = 30;
    var start = Math.max(0, matchIndex - WIN);
    var ctx = text.slice(start, matchIndex);
    var term = ctx.match(/.*[,.;!?]\s*/);
    if (term) ctx = ctx.slice(term[0].length);
    var negMatch = ctx.match(NEGATION_RE);
    if (!negMatch) return false;
    var afterNeg = ctx.slice(negMatch.index + negMatch[0].length);
    if (TRANSITION_RE.test(afterNeg)) return false;
    var words = afterNeg.match(/\b\w+\b/g) || [];
    return words.length <= 1;
}

// Severity-Reihenfolge: danger zuerst, dann warning, dann info
var SEVERITY_RANK = { danger: 0, warning: 1, info: 2 };

// ─── Rules ───
// IDs sind deckungsgleich mit den Szenarien in /pages/rechte-checker/index.html,
// damit später ein Tiefer-Link sauber andocken kann.
// containsNegation: true → die globale Negations-Prüfung wird übersprungen,
// weil das Pattern selbst eine Negation enthält (z.B. "kein urlaub").
var BBIG_RULES = [
    // ── Arbeitszeit ──
    {
        id: 'ueberstunden',
        patterns: [
            /\b(ü|ue)berstunde[ns]?\b/,
            /\bmehrarbeit\b/,
            /\bmehrstunde[ns]?\b/,
            /\b(ü|ue)[-\s]?std\b/,
            /\bextra[\s-]?stunde[ns]?\b/,
            /\bl(ä|ae)nger\s+(bleiben|geblieben|gearbeitet|arbeiten|machen|gemacht)\b/,
            /\bnicht\s+(raus|weg)\s+(gekommen|gelassen)\b/,
            /\bbis\s+(sp(ä|ae)t|abends|nachts|in\s+die\s+nacht|halb\s*\d|\d{1,2}\s*uhr\s+abends)\b/,
            /\bzwangs(ü|ue)berstunde/,
            /\b(ü|ue)berstunden\s+(angeordnet|verlangt|verordnet|aufgedr(ü|ue)ckt)/,
            /\bnachgearbeitet\b/
        ],
        severity: 'danger',
        law: '§ 17 BBiG',
        icon: '⏰',
        title: 'Überstunden / Mehrarbeit',
        text: 'Überstunden müssen zeitnah durch Freizeit ausgeglichen oder zusätzlich vergütet werden (§ 17 Abs. 3 BBiG). Jugendliche: max. 8 h/Tag (§ 8 JArbSchG), Volljährige max. 8 h, ausnahmsweise 10 h (§ 3 ArbZG).'
    },
    {
        id: 'long_hours',
        patterns: [
            /\b(1[0-9]|2[0-4])\s*(h\b|std\b|stunden\b)/,
            /\b(1[0-9]|2[0-4])h\b/,
            /\bmehr\s+als\s+([89]|10|11|12)\s*(h|std|stunden)\b/,
            /\blange[mnrs]?\s+tag\b/
        ],
        severity: 'danger',
        law: '§ 8 JArbSchG',
        icon: '🕐',
        title: 'Zu lange Arbeitszeit',
        text: 'Jugendliche dürfen max. 8 h täglich / 40 h wöchentlich arbeiten (§ 8 JArbSchG). Volljährige max. 8 h, ausnahmsweise 10 h bei Ausgleich innerhalb 6 Monaten (§ 3 ArbZG).'
    },
    {
        id: 'nachtarbeit',
        patterns: [
            /\bnacht(schicht|arbeit|dienst)\b/,
            /\bsp(ä|ae)tschicht\b/,
            /\babends\s+nach\s+(20|21|22|23)\b/,
            /\b(22|23):[0-5]\d\b/,
            /\b0[0-5]:[0-5]\d\b(?!\s*-\s*(0[6-9]|1\d|2\d))/  // nur als End-Zeit, nicht in Range
        ],
        severity: 'danger',
        law: '§ 14 JArbSchG',
        icon: '🌙',
        title: 'Nachtarbeit',
        text: 'Für Jugendliche unter 18 J. ist Beschäftigung zwischen 20:00 und 06:00 Uhr verboten (§ 14 JArbSchG). Ausnahmen für ältere Jugendliche im Gaststättengewerbe bis 22 Uhr, in mehrschichtigen Betrieben bis 23 Uhr.'
    },

    // ── Wochenende ──
    {
        id: 'sunday',
        patterns: [
            /\bsonntag(s|en)?\b/,
            /\bam\s+sonntag\b/,
            /\bsonntagsarbeit\b/
        ],
        severity: 'danger',
        law: '§ 17 JArbSchG',
        icon: '🚫',
        title: 'Sonntagsarbeit',
        text: 'An Sonntagen dürfen Jugendliche grundsätzlich nicht beschäftigt werden (§ 17 JArbSchG). Ausnahmen nur in bestimmten Branchen (Gaststätten, Krankenhaus, Bäckerei). Ein Ausgleichstag in derselben Woche ist Pflicht.'
    },
    {
        id: 'saturday',
        patterns: [
            /\bsamstag(s|en)?\b/,
            /\bam\s+samstag\b/,
            /\bsamstagsarbeit\b/
        ],
        severity: 'warning',
        law: '§ 16 JArbSchG',
        icon: 'ℹ️',
        title: 'Samstagsarbeit',
        text: 'An Samstagen dürfen Jugendliche nicht beschäftigt werden (§ 16 JArbSchG), Ausnahmen nur in bestimmten Branchen. Volljährige: erlaubt, aber Anspruch auf 2 freie Wochentage in der Woche (§ 15 JArbSchG analog).'
    },
    {
        id: 'feiertag',
        patterns: [
            /\bfeiertag(s|en)?\b/,
            /\b(gr(ü|ue)ndonnerstag|karfreitag|ostermontag|pfingstmontag|fronleichnam|allerheiligen)\b/,
            /\b(weihnachten|heiligabend|silvester|neujahr)\b/
        ],
        severity: 'danger',
        law: '§ 9 ArbZG',
        icon: '🎄',
        title: 'Feiertagsarbeit',
        text: 'An gesetzlichen Feiertagen ist Beschäftigung von 0–24 Uhr verboten (§ 9 ArbZG). Ausnahmen nur für definierte Branchen (Gesundheit, Verkehr, Notdienst). Bei Jugendlichen gilt § 18 JArbSchG.'
    },

    // ── Pausen ──
    {
        id: 'pause',
        patterns: [
            /\b(kein(e)?|ohne)\s+(ruhe)?pause\b/,
            /\bohnepause\b/,
            /\b(durchgemacht|durchgearbeitet|durchgepowert|durchgezogen)\b/,
            /\bdurch\s+(gemacht|gearbeitet|gezogen)\b/,
            /\bpause\s+(verweigert|gestrichen|abgelehnt|nicht\s+gem(ö|oe)glicht|verboten)\b/,
            /\bnicht(\s+mal)?\s+(zur\s+|f(ü|ue)r\s+(die|eine)\s+)?pause\b/,
            /\b(mittag(essen)?|essen)\s+(am\s+(pc|schreibtisch|arbeitsplatz)|vor\s+dem\s+pc)/,
            /\b(pause\s+(am\s+(schreibtisch|pc|arbeitsplatz)|im\s+arbeitsraum))/,
            /\b(raucherpause|zigarettenpause)\s+(abgezogen|gestrichen)/,
            /\bessen\s+w(ä|ae)hrend/,
            /\bkeine\s+zeit\s+(zum\s+)?(essen|trinken|aufstehen)/
        ],
        severity: 'danger',
        law: '§ 11 JArbSchG',
        icon: '☕',
        title: 'Pausenpflicht',
        text: 'Pflicht-Pausen: mind. 30 min bei > 4,5 h (Jugendliche) / > 6 h (Volljährige), mind. 60 min bei > 6 h Jugendliche / 45 min bei > 9 h Volljährige. Pausen dürfen nicht am Anfang oder Ende liegen.',
        containsNegation: true
    },

    // ── Ausbildungspflicht ──
    {
        id: 'putzen',
        patterns: [
            /\b(klo|toilette[n]?|wc)\b[\s\w]{0,15}(putz|geputzt|reinig|gereinigt|s(ä|ae)uber|ges(ä|ae)ubert)/,
            /\blager\b[\s\w]{0,15}(aufr(ä|ae)um|aufger(ä|ae)umt|sortier|sortiert|putz|geputzt|kehren|gekehrt)/,
            /\bm(ü|ue)ll\b[\s\w]{0,15}(raus|wegbring|entsorg)/,
            /\b(b(ö|oe)den?|fenster|fliesen|werkstatt|halle|hof)\b[\s\w]{0,15}(gewischt|geputzt|gefegt|gekehrt|gesaugt|geschrubbt)/,
            /\b(geputzt|gereinigt|ges(ä|ae)ubert|aufger(ä|ae)umt|gefegt|gekehrt|gewischt|geschrubbt|gesaugt|abgewischt|abgewaschen)\b/,
            /\b(reinigungs|grund)?putzen\b/,
            /\b(reinigen|s(ä|ae)ubern|aufr(ä|ae)umen|fegen|kehren|wischen|schrubben|saugen|abwaschen|sp(ü|ue)len)\b/,
            /\b(geschirr|sp(ü|ue)lmaschine)\s+(gemacht|leer|sp(ü|ue)len|ausger(ä|ae)umt)/
        ],
        severity: 'warning',
        law: '§ 14 BBiG',
        icon: '🧹',
        title: 'Ausbildungsfremde Tätigkeit',
        text: 'Tätigkeiten müssen dem Ausbildungszweck dienen (§ 14 Abs. 2 BBiG). Dauerhafte ausbildungsfremde Aufgaben (Putzen, Lager, Müll, Botengänge) sind unzulässig.'
    },
    {
        id: 'privatbesorgungen',
        patterns: [
            /\bkaffee\b[\s\w]{0,20}(holen|geholt|kochen|gekocht|machen|gemacht)\b/,
            /\bkaffee\s+f(ü|ue)r\s+(den\s+|die\s+)?(chef|boss|meister)/,
            /\bw(ä|ae)sche\b[\s\w]{0,15}(holen|geholt|abgeben|abgegeben|abholen|abgeholt|bringen|gebracht)/,
            /\bpostlauf\b/,
            /\beinkauf[en]?\s+(f(ü|ue)r\s+)?(chef|boss|meister|chefin)/,
            /\bprivat(e[ns]?|sache[n]?|besorg)/,
            /\bauto\s+(waschen|gewaschen|polieren|poliert)\s+(vom|f(ü|ue)r)\s+(chef|boss)/,
            /\bbotengang\b/
        ],
        severity: 'warning',
        law: '§ 14 BBiG',
        icon: '🛒',
        title: 'Private Besorgungen für den Chef',
        text: 'Private Besorgungen (Kaffee holen, Wäsche, Einkauf für den Chef) sind keine Ausbildungsinhalte und dürfen nicht regelmäßig angeordnet werden (§ 14 BBiG).'
    },
    {
        id: 'eintoenig',
        patterns: [
            /\bimmer\s+das\s+(gleiche|selbe)\b/,
            /\bmonoton\b/,
            /\bstupide\b/,
            /\bnur\s+(kopier|tipp|datei[ns]?|listen|akten|abheft|sortier)/,
            /\b(eint(ö|oe)nig|langweilig|nichts\s+gelernt|nichts\s+(neues\s+)?dazugelernt)\b/,
            /\b(immer)?\s*nur\s+zuschauen\b/
        ],
        severity: 'info',
        law: '§ 14 BBiG',
        icon: '📋',
        title: 'Einseitige / monotone Aufgaben',
        text: 'Die Ausbildung muss einem sachlich und zeitlich gegliederten Ausbildungsplan folgen (§ 14 Abs. 1 Nr. 1 BBiG). Reine Routinearbeiten ohne Lernfortschritt verletzen das Ausbildungsziel.'
    },
    {
        id: 'ausbilder-fehlt',
        patterns: [
            /\b(kein|ohne)\s+ausbild(er|ungsplan|ungsrahmen)/,
            /\bausbild(er|ungsbeauftragter?)\s+(fehlt|krank|nie\s+da|nicht\s+da|abwesend|in\s+urlaub)/,
            /\b(alleine|allein)\s+(gelassen|geblieben|gearbeitet|im\s+laden|im\s+betrieb|im\s+b(ü|ue)ro)/,
            /\bim\s+stich\s+gelassen\b/,
            /\bohne\s+(anleitung|einweisung|erkl(ä|ae)rung|hilfe|aufsicht|anweisung)/,
            /\bausbildungsplan\s+(fehlt|nicht\s+(eingehalten|umgesetzt|vorhanden|bekannt))/,
            /\bnie\s+(was\s+)?(gezeigt|erkl(ä|ae)rt|beigebracht)\b/,
            /\bniemand\b[\s\w]{0,20}(gezeigt|erkl(ä|ae)rt|beigebracht|geholfen|da|zust(ä|ae)ndig|hilft)\b/,
            /\bdarf\s+nicht\s+(an|bei|mit\s+zur)/
        ],
        severity: 'warning',
        law: '§ 14 Abs. 1 BBiG',
        icon: '🧭',
        title: 'Ausbilder / Anleitung fehlt',
        text: 'Der Ausbildende muss persönlich oder durch einen geeigneten Ausbilder die berufliche Handlungsfähigkeit vermitteln (§ 14 Abs. 1 Nr. 1 + § 28 BBiG). Alleinlassen ohne Anleitung oder ein dauerhaft abwesender Ausbilder verletzt die Ausbildungspflicht.'
    },

    // ── Urlaub ──
    {
        id: 'urlaub-gestrichen',
        patterns: [
            /\burlaub\s+(gestrichen|abgesagt|abgelehnt|verweigert|nicht\s+genehmigt|nicht\s+bekommen|gek(ü|ue)rzt)\b/,
            /\burlaubsantrag\s+(abgelehnt|verweigert|nicht\s+genehmigt)\b/,
            /\b(kein(en|e)?|keinerlei)\s+urlaub\b/,
            /\b(bekomme|kriege|hatte|hab|krieg)\s+(kein(en|e)?)\s+urlaub\b/
        ],
        severity: 'warning',
        law: '§ 19 JArbSchG / § 7 BUrlG',
        icon: '🏖️',
        title: 'Urlaub verweigert / gestrichen',
        text: 'Urlaubswünsche sind zu berücksichtigen, sofern keine dringenden betrieblichen Belange entgegenstehen (§ 7 BUrlG). Mindesturlaub: 24 Werktage (Volljährige), 25–30 Werktage (Jugendliche je nach Alter).',
        containsNegation: true
    },
    {
        id: 'urlaub-bestimmen',
        patterns: [
            /\bbetriebsurlaub\b/,
            /\burlaub\s+(zwangs|gezwungen|aufgezwungen|vorgeschrieben)\b/,
            /\burlaub\s+wann\s+(ich|er|chef|der\s+chef)\s+(will|sage|sagt)\b/,
            /\bmuss\s+urlaub\s+nehmen\b/
        ],
        severity: 'info',
        law: '§ 7 BUrlG',
        icon: '📅',
        title: 'Urlaubszeitpunkt aufgezwungen',
        text: 'Der Arbeitgeber darf den Urlaubszeitpunkt nicht einseitig vorgeben — Urlaubswünsche des Azubis sind zu berücksichtigen, soweit keine dringenden betrieblichen Belange entgegenstehen (§ 7 BUrlG).'
    },

    // ── Berufsschule ──
    {
        id: 'nach-schule-betrieb',
        patterns: [
            /\bnach\s+(der\s+)?(berufs)?schule\s+(noch\s+)?(in\s+den\s+|in\s+|im\s+)?(betrieb|rein|arbeit(en)?|b(ü|ue)ro)/,
            /\b(berufs)?schule\s+und\s+danach\s+(betrieb|arbeit)/,
            /\b(berufs)?schul.{0,15}\+\s*(betrieb|arbeit)/
        ],
        severity: 'warning',
        law: '§ 15 BBiG / § 9 JArbSchG',
        icon: '🎒',
        title: 'Nach der Berufsschule noch in den Betrieb',
        text: 'An einem Berufsschultag mit mehr als 5 Unterrichtsstunden (à 45 min) darf der Jugendliche nicht mehr im Betrieb beschäftigt werden (§ 9 Abs. 1 JArbSchG). Die Berufsschulzeit inkl. Pausen und Schulweg zählt als Arbeitszeit (§ 15 BBiG).'
    },
    {
        id: 'schule-nicht-angerechnet',
        patterns: [
            /\b(berufs)?schul(e|zeit|unterricht|tag).{0,25}(freizeit|nicht\s+angerechnet|nicht\s+gez(ä|ae)hlt|keine\s+arbeitszeit|abgezogen)\b/,
            /\b(berufs)?schule\s+(ist|war)\s+freizeit\b/,
            /\bschule\s+nachholen\b/
        ],
        severity: 'danger',
        law: '§ 15 BBiG',
        icon: '🏫',
        title: 'Berufsschulzeit nicht angerechnet',
        text: 'Berufsschulzeit inkl. Pausen und Schulweg wird vollständig auf die betriebliche Ausbildungszeit angerechnet (§ 15 BBiG). Schule darf nicht als Freizeit oder Urlaub gewertet werden.',
        containsNegation: true
    },
    {
        id: 'pruefungsfreistellung',
        patterns: [
            /\bf(ü|ue)r\s+(die\s+)?pr(ü|ue)fung\s+urlaub\b/,
            /\bpr(ü|ue)fung.{0,20}(urlaub\s+nehmen|nicht\s+frei|freizeit)\b/,
            /\btag\s+vor\s+(der\s+)?(pr(ü|ue)fung|abschlusspr(ü|ue)fung)\s+(arbeit|nicht\s+frei|im\s+betrieb)/
        ],
        severity: 'danger',
        law: '§ 15 Abs. 1+3 BBiG',
        icon: '📝',
        title: 'Prüfungsfreistellung verweigert',
        text: 'Azubis sind für Prüfungen + den Werktag vor der schriftlichen Abschlussprüfung freizustellen (§ 15 Abs. 1, 3 BBiG). Vergütung läuft weiter (§ 19 Abs. 1 BBiG). Urlaubsverzehr ist unzulässig.'
    },

    // ── Vergütung ──
    {
        id: 'verguetung-niedrig',
        patterns: [
            /\b(zu\s+wenig|wenig|niedrig|gering)\s+(lohn|gehalt|verg(ü|ue)tung|geld|bezahl)/,
            /\bnicht\s+(genug|angemessen|fair)\s+(lohn|verg(ü|ue)tung|bezahlt)/,
            /\bmindestausbildungsverg(ü|ue)tung\b/,
            /\bverg(ü|ue)tung\s+(nicht|sp(ä|ae)t)\s+(gezahlt|bekommen|(ü|ue)berwiesen)/,
            /\b(lohn|gehalt)\s+(sp(ä|ae)t|nicht)\s+(da|gekommen|(ü|ue)berwiesen)/,
            /\b(weihnachts|urlaubs)geld\b[\s\w]{0,15}(verweigert|gestrichen|nicht\s+(gezahlt|bekommen)|kein(e)?|wurde\s+(gestrichen|gek(ü|ue)rzt))/,
            /\b(lohnabrechnung|gehaltsabrechnung|abrechnung)\s+(fehlt|nicht\s+bekommen|falsch|stimmt\s+nicht)\b/,
            /\b(sozialversicherung|krankenversicherung)\s+(nicht\s+angemeldet|nicht\s+gezahlt)/,
            /\b(tariflohn|tarif)\s+(unterschritten|nicht\s+eingehalten)/,
            /\bnicht\s+gestiegen\b[\s\w]{0,15}(lohn|verg(ü|ue)tung|gehalt|2\.?\s*lehrjahr|3\.?\s*lehrjahr)/
        ],
        severity: 'warning',
        law: '§ 17 BBiG',
        icon: '💰',
        title: 'Vergütung zu niedrig / verspätet',
        text: 'Die Ausbildungsvergütung muss angemessen sein, mind. jährlich steigen (§ 17 BBiG) und spätestens am letzten Arbeitstag des Monats gezahlt werden (§ 18 BBiG). Mindestvergütung ist gesetzlich festgelegt.'
    },
    {
        id: 'unpaid',
        patterns: [
            /\bunbezahlt\s+(gearbeitet|geblieben|gemacht|stunden?)\b/,
            /\bumsonst\s+(gearbeitet|gemacht)\b/,
            /\bkostenlos\s+(gearbeitet|gemacht)\b/,
            /\bgratis\s+(gearbeitet|gemacht)\b/,
            /\bkein(e|en)?\s+(lohn|verg(ü|ue)tung|gehalt|geld)\s+(bekommen|erhalten|f(ü|ue)r)/
        ],
        severity: 'danger',
        law: '§ 17 BBiG',
        icon: '💸',
        title: 'Unbezahlte Arbeit',
        text: 'Die Ausbildungsvergütung ist gesetzlich vorgeschrieben (§ 17 BBiG) und muss monatlich pünktlich gezahlt werden (§ 18 BBiG). Unbezahlte Arbeitsstunden sind rechtswidrig.',
        containsNegation: true
    },
    {
        id: 'arbeitsmaterial',
        patterns: [
            /\b(selbst|selber)\s+(kaufen|gekauft|bezahlen|gezahlt|besorgen|besorgt)\b.{0,30}(werkzeug|material|arbeitskleidung|fachb(u|ue)cher|literatur|sicherheits)/,
            /\beigene[ms]?\s+werkzeug\b/,
            /\bauf\s+eigene\s+kosten\b/,
            /\barbeitskleidung\s+selbst\b/
        ],
        severity: 'warning',
        law: '§ 14 Abs. 1 Nr. 3 BBiG',
        icon: '🔧',
        title: 'Arbeitsmaterial selbst bezahlt',
        text: 'Werkzeuge, Werkstoffe, Fachliteratur und Schutzkleidung muss der Ausbildungsbetrieb kostenlos stellen (§ 14 Abs. 1 Nr. 3 BBiG). Eine Beteiligung des Azubis ist unzulässig.'
    },

    // ── Krankheit ──
    {
        id: 'krankmeldung',
        patterns: [
            /\bkrank[\s-]?(meldung|gemeldet|geschrieben|schreibung)\b/,
            /\bau[\s-]?bescheinigung\b/,
            /\barbeitsunf(ä|ae)hig(keit)?\b/,
            /\bkrankensch(ein|reibung)\b/,
            /\b(trotz\s+krank|krank\s+(zur|auf\s+)?arbeit|krank\s+(im\s+)?betrieb|krank\s+(arbeiten|gekommen|gegangen))/,
            /\bmusste\s+krank/,
            /\b(durfte\s+nicht\s+krank|kein(en)?\s+krankenstand|krank\s+sein\s+verboten)/,
            /\b(grippe|fieber|magen[\s-]?darm|covid|corona)\b[\s\w]{0,20}(arbeiten|gearbeitet|im\s+betrieb)/
        ],
        severity: 'info',
        law: '§ 5 EntgFG',
        icon: '🏥',
        title: 'Krankmeldung & Attest',
        text: 'Krankheit muss unverzüglich gemeldet werden (§ 5 EntgFG). Ab dem 4. Krankheitstag (oder früher laut Vertrag) ist eine ärztliche AU vorzulegen. Lohnfortzahlung 6 Wochen (§ 3 EntgFG).'
    },
    {
        id: 'krank-kein-geld',
        patterns: [
            /\bkrank.{0,20}(kein\s+geld|nicht\s+bezahlt|kein\s+lohn|abgezogen|nicht\s+gezahlt|kein(e|en)?\s+verg(ü|ue)tung)\b/,
            /\bkrankheit.{0,15}abgezogen\b/,
            /\bbei\s+krankheit\s+kein/
        ],
        severity: 'danger',
        law: '§ 19 BBiG / § 3 EntgFG',
        icon: '🩺',
        title: 'Krank = kein Geld? Falsch.',
        text: 'Azubis haben Anspruch auf Fortzahlung der Vergütung für 6 Wochen Arbeitsunfähigkeit (§ 19 Abs. 1 Nr. 2 BBiG, § 3 EntgFG). Lohnabzüge bei Krankheit sind rechtswidrig.',
        containsNegation: true
    },

    // ── Kündigung ──
    {
        id: 'kuendigung-drohung',
        patterns: [
            /\b(rausgeflogen|raus\s+geflogen|geflogen|kannst\s+gehen|fliegst\s+raus|fliegst)\b/,
            /\b(k(ü|ue)ndigung|k(ü|ue)ndigen).{0,25}(droh|angedroht|gedroht|in\s+aussicht)/,
            /\bjederzeit\s+k(ü|ue)nd(igen|igung)\b/,
            /\b(noch\s+einmal\s+und\s+du|noch\s+ein\s+fehler|n(ä|ae)chstes\s+mal\s+(fliegst|kannst|bist\s+du\s+weg))/,
            /\b(such\s+dir\s+(was|nen?\s+job)|kannst\s+(direkt\s+)?gehen|raus\s+aus\s+dem\s+betrieb)/,
            /\b(jederzeit\s+ersetzen|(bist|bin|seid|sind)\s+ersetzbar|\bersetzbar\b|n(ä|ae)chsten\s+haben\s+wir\s+morgen)/,
            /\b(probezeit\s+nicht\s+(ü|ue)berstehen|ausbildung\s+(beenden|abbrechen)\s+(m(ü|ue)ssen|sollen))/
        ],
        severity: 'warning',
        law: '§ 22 BBiG',
        icon: '⚠️',
        title: 'Kündigungs-Drohung',
        text: 'Nach der Probezeit ist eine fristlose Kündigung durch den Ausbildenden nur aus wichtigem Grund + schriftlich möglich (§ 22 Abs. 2 BBiG). Drohungen sind kein Kündigungsgrund.'
    },
    {
        id: 'probezeit',
        patterns: [
            /\bprobezeit\s+(verl(ä|ae)nger(n|t)?)\b/,
            /\bprobezeit\s+(l(ä|ae)uft\s+l(ä|ae)nger|6\s+monate|5\s+monate)\b/,
            /\bprobezeit\b/
        ],
        severity: 'info',
        law: '§ 20 BBiG',
        icon: '📅',
        title: 'Probezeit',
        text: 'Die Probezeit beträgt mindestens 1, höchstens 4 Monate (§ 20 BBiG). Eine darüber hinausgehende Verlängerung ist unzulässig — Ausnahme: Unterbrechung um mehr als 1/3 (z.B. lange Krankheit).'
    },
    {
        id: 'abmahnung',
        patterns: [
            /\babmahnung\b/,
            /\bverwarnung\s+(bekommen|erhalten|schriftlich|bekam)\b/,
            /\bschriftlich(e)?\s+(r(ü|ue)ge|verwarnung)\b/
        ],
        severity: 'info',
        law: 'Arbeitsrecht',
        icon: '📎',
        title: 'Abmahnung erhalten',
        text: 'Eine wirksame Abmahnung muss konkretes Fehlverhalten benennen, die verletzte Pflicht und Konsequenzen androhen. Du hast das Recht, eine Gegendarstellung in die Personalakte aufnehmen zu lassen.'
    },
    {
        id: 'aufhebungsvertrag',
        patterns: [
            /\baufhebungsvertrag\b/,
            /\baufl(ö|oe)sungsvertrag\b/,
            /\beinvernehm.{0,12}(beend|trenn|aufheb)/
        ],
        severity: 'danger',
        law: '§ 22 BBiG / § 159 SGB III',
        icon: '✍️',
        title: 'Aufhebungsvertrag — VORSICHT',
        text: 'Nichts ohne Bedenkzeit unterschreiben! Aufhebungsverträge können zu einer Sperrzeit beim ALG (bis 12 Wochen, § 159 SGB III) führen. Hol vorher Rat bei IHK/Kammer, Gewerkschaft oder JAV.'
    },

    // ── Persönlichkeitsschutz ──
    {
        id: 'mobbing',
        patterns: [
            /\bmobbing\b/,
            /\b(gemobbt|gemobt)\b/,
            /\bschikan(e|en|iert|ier(en|t))\b/,
            /\b(ausgegrenzt|ausgrenz(en|ung)|isoliert|kalt\s*gestellt|links\s+liegen\s+gelassen|geschnitten)\b/,
            /\b(angeschrien|anschreien|angeschrieen|angebr(ü|ue)llt|anbr(ü|ue)llen|angeraunzt|angefahren)\b/,
            /\b(herabgesetzt|herabgew(ü|ue)rdigt|herabw(ü|ue)rdig|niedergemacht|kleingemacht|klein\s+gemacht)\b/,
            /\b(fertig(ge)?macht|fertig\s+(ge)?macht|kaputt\s*gemacht|nieder\s*gemacht|zerrissen|verheizt)\b/,
            /\b(ausgelacht|auslachen|lustig\s+gemacht|spott|verspottet|verh(ö|oe)hnt|verarscht|veralbert)\b/,
            /\b(blo(ß|ss)gestellt|vorgef(ü|ue)hrt|blamiert|durch\s+den\s+kakao)\b/,
            /\b(gedem(ü|ue)tigt|demut|w(ü|ue)rde\s+verletzt)\b/,
            /\b(beleidigt|beleidigung|besch(i|ie)mpft|angepampt|angepampt)\b/,
            /\b(ignorier(t|en|ung)|stumm\s+behandelt|wie\s+luft\s+behandelt|wird\s+nicht\s+gegr(ü|ue)(ß|ss)t)\b/,
            /\bs(ü|ue)ndenbock\b/,
            /\b(psychoterror|terrorisiert|drangsalier(t|en)|tyrannisier(t|en))\b/,
            /\bstell(\s+dich|\s+euch)?\s+nicht\s+so\s+an\b/,
            /\b(unter\s+druck\s+gesetzt|druck\s+(ausge(ü|ue)bt|gemacht))\b/,
            /\b(bullying|bullyen|gebully)\b/,
            /\b(angemacht|angegangen|nieder\s+gebr(ü|ue)llt)\b/,
            /\b(chef|kollege[n]?|meister)\s+(br(ü|ue)llt|schreit|pampt|rumbr(ü|ue)llt|rumschreit)/
        ],
        severity: 'danger',
        law: '§ 241 Abs. 2 BGB / § 12 AGG',
        icon: '🛡️',
        title: 'Mobbing / Schikane',
        text: 'Der Arbeitgeber hat eine Fürsorgepflicht (§ 241 Abs. 2 BGB) und muss vor Mobbing schützen (§ 12 AGG). Dokumentiere Vorfälle mit Datum + Zeugen. Anlaufstellen: JAV, Betriebsrat, IHK, Gewerkschaft.'
    },
    {
        id: 'diskriminierung',
        patterns: [
            /\bdiskriminier(t|ung|end|enden?)\b/,
            /\brassis(mus|tisch|tische|ten)\b/,
            /\bsexis(mus|tisch|tische|t)\b/,
            /\bhomophob(ie|isch|e)?\b/,
            /\b(transphob|queerfeindlich|fremdenfeindlich)/,
            /\b(altersdiskrim|wegen\s+(meinem|deinem)?\s*alter\b)/,
            /\b(ausl(ä|ae)nder|hautfarbe|akzent|herkunft|religion|kopftuch)\b[\s\w]{0,15}(witz|witze|beleidig|verspott|abgelehnt|nicht\s+genommen|kommentar)/,
            /\b(typisch\s+(mann|frau|frauen|m(ä|ae)nner|deutsch|migrant))\b/,
            /\b(frau(en)?\s+k(ö|oe)nnen\s+(das|sowas)?\s*nicht)\b/,
            /\b(geh\s+zur(ü|ue)ck\s+in\s+dein|verpiss\s+dich)/,
            /\bbel(ä|ae)stig(t|ung|ende|t\s+worden)\b/,
            /\b(beleidigt|beleidigung|herabw(ü|ue)rdig)/,
            /\b(witze\s+(ü|ue)ber\s+(meine|mein|frauen|m(ä|ae)nner|behinder|ausl|religion))/,
            /\b(schwul|lesbisch|trans)\b[\s\w]{0,15}(witz|kommentar|beleidigt|gemobbt|geh(ä|ae)nselt)/
        ],
        severity: 'danger',
        law: '§ 7 AGG',
        icon: '⚖️',
        title: 'Diskriminierung / Belästigung',
        text: 'Diskriminierung wegen Herkunft, Geschlecht, Religion, Behinderung, Alter oder sexueller Identität ist verboten (§ 7 AGG). Beschwerderecht beim Arbeitgeber (§ 13 AGG). Schadensersatz möglich (§ 15 AGG).'
    },
    {
        id: 'sexuelle-belaestigung',
        patterns: [
            /\bsexuelle\s+bel(ä|ae)stigung\b/,
            /\b(angefasst|angegrabscht|begrabscht|grabsch|grapsch|begrapscht)\b/,
            /\b(po|hintern|brust|busen|busens?)\b[\s\w]{0,15}(geklopft|geklatscht|ber(ü|ue)hrt|angefasst|begrapscht)/,
            /\b(anz(ü|ue)glich(e|er|en|es)?|z(ü|ue)nftig)\b[\s\w]{0,20}(bemerkung|witz|kommentar|spruch|spr(ü|ue)che|anspielung|(ü|ue)ber\s+(mein|deinen?)\s+k(ö|oe)rper)/,
            /\b(unsittliche?|unanst(ä|ae)ndige?|schmutzige?)\s+(bemerkung|witz|spruch|spr(ü|ue)che|geste|anmach)/,
            /\b(blick|gestarrt|geglotzt|ang(e)?starrt)\b[\s\w]{0,12}(busen|brust|hintern|k(ö|oe)rper)/,
            /\bsex(uelle?)?\s+(anspielung|angebot|drohung|n(ö|oe)tigung)/,
            /\b(schick\s+mir|hast\s+du\s+nackt|nacktbild|dickpic)/,
            /\b(catcall|catcalling|nachgepfiffen|hinterher\s+gepfiffen)\b/,
            /\b(dr(ü|ue)ck\s+dich|umarmt\s+gegen\s+willen)/
        ],
        severity: 'danger',
        law: '§ 3 Abs. 4 AGG',
        icon: '🚨',
        title: 'Sexuelle Belästigung',
        text: 'Sexuelle Belästigung am Arbeitsplatz ist verboten (§ 3 Abs. 4 AGG). Du hast Anspruch auf Schutz (§ 12 AGG), Beschwerderecht (§ 13 AGG) und kannst Schadensersatz/Schmerzensgeld einfordern (§ 15 AGG). Bei Übergriffen: Polizei + Dokumentation mit Datum/Zeugen.'
    },
    {
        id: 'stress-burnout',
        patterns: [
            /\bburn[\s-]?out\b/,
            /\b(kurz\s+vorm?\s+burnout|am\s+(absoluten\s+)?ende|ausgebrannt|am\s+limit)\b/,
            /\b(psychisch(er|en)?\s+(druck|belastung|fertig|am\s+ende)|seelisch(er)?\s+(druck|belastung))/,
            /\b(zusammenbruch|kollabiert|kollabier)/,
            /\b(panikattacke|angstattacke|panikst(ö|oe)rung|panik\s+(bekommen|gehabt))\b/,
            /\b(weinen\s+m(ü|ue)ssen|geweint|zum\s+heulen|in\s+tr(ä|ae)nen|losgeheult|heulkrampf|geheult|heul(en|st|t)?\s+(im|auf|in|aufm|aufn))/,
            /\b(schlafst(ö|oe)rung|kann\s+nicht\s+(mehr\s+)?schlafen|schlaflos|albtr(ä|ae)um)/,
            /\b(magenschmerz|kopfschmerz|kopfweh|migr(ä|ae)ne)\s+(wegen|durch|seit)/,
            /\b(ich\s+)?(kann|halt|halte|halts?)\s+(es\s+|das\s+)?nicht\s+mehr(\s+(aus|durch))?\b/,
            /\b(total|v(ö|oe)llig|komplett)?\s*(ü|ue)berforder(t|ung)\b/,
            /\b(ü|ue)berforder(t|ung)\b/,
            /\b(depressiv|depression|antidepressiva)\b/
        ],
        severity: 'danger',
        law: '§ 618 BGB / § 3 ArbSchG',
        icon: '💢',
        title: 'Psychische Belastung / Fürsorgepflicht',
        text: 'Der Arbeitgeber muss Leben und Gesundheit schützen (§ 618 BGB, § 3 ArbSchG) — auch psychisch. Bei dauerhaftem Druck: Gespräch mit Ausbilder, JAV/Betriebsrat, Hausarzt. Telefonseelsorge: 0800/111 0 111. Du musst da nicht alleine durch.'
    },
    {
        id: 'arbeitssicherheit',
        patterns: [
            /\bohne\s+(schutz(kleidung|brille|helm|handschuh|maske|schuhe|weste)|helm|handschuh(e|en)?|sicherheits(schuhe?|brille|gurt))\b/,
            /\b(sicherheitsbelehrung|unterweisung)\s+(fehlt|nicht\s+gemacht|nie\s+gehabt|ausgefallen)/,
            /\b(arbeitsunfall|unfall|verletzt|verletzung|verletz)\b/,
            /\b(stromschlag|verbrennung|verbrannt|geschnitten|gequetscht|gestolpert|gefallen)\b/,
            /\b(asbest|gefahrstoff|chemikalie|s(ä|ae)ure|lauge|d(ä|ae)mpfe)\b[\s\w]{0,20}(ohne|kein|ungesch(ü|ue)tzt)/,
            /\b(maschine|s(ä|ae)ge|presse|stapler)\b[\s\w]{0,15}(ohne|kein|nicht\s+eingewiesen|ohne\s+einweisung)/,
            /\b(kein|keine)\s+(erste[\s-]?hilfe|verbandskasten|notausgang|fluchtweg)\b/,
            /\bgef(ä|ae)hrlich(e|er|es)?\s+(arbeit|t(ä|ae)tigkeit|aufgabe)/
        ],
        severity: 'danger',
        law: '§ 3 ArbSchG / § 28 JArbSchG',
        icon: '⛑️',
        title: 'Arbeitssicherheit / Schutzkleidung',
        text: 'Der Ausbildungsbetrieb muss Arbeitsschutz gewährleisten (§ 3 ArbSchG) und Schutzkleidung kostenlos stellen. Jugendliche dürfen keine gefährlichen Arbeiten ausführen (§ 22 JArbSchG). Unterweisungen sind Pflicht (§ 28 JArbSchG). Bei Unfall: D-Arzt + Dokumentation Pflicht.'
    },
    {
        id: 'arbeitszeit-manipulation',
        patterns: [
            /\b(stunden|arbeitszeit)\s+(gestrichen|geklaut|nicht\s+(erfasst|gewertet|gez(ä|ae)hlt)|abgezogen|unterschlagen)/,
            /\b(stechuhr|zeiterfassung|stempeluhr)\b[\s\w]{0,15}(manipuliert|manipulier|kaputt|nicht\s+(funktion|da)|umgangen|frisiert|gel(ö|oe)scht)/,
            /\b(schwarz(arbeit|\s+arbeiten?|\s+gearbeitet)|cash\s+auf\s+die\s+hand)\b/,
            /\b(ohne\s+(anmeldung|vertrag|stempel|aufzeichnung)|nicht\s+angemeldet)\b/,
            /\b(arbeitszeit(konto)?|gleitzeit)\s+(manipulier|frisier|gel(ö|oe)scht|versch(ö|oe)nert)/,
            /\b(minusstunden|stunden\s+abziehen|stunden\s+(unter\s+den\s+tisch|verschwinden))/
        ],
        severity: 'danger',
        law: '§ 16 ArbZG',
        icon: '🕵️',
        title: 'Arbeitszeit-Manipulation',
        text: 'Die Arbeitszeit ist vollständig und nachvollziehbar zu erfassen (§ 16 ArbZG, EuGH C-55/18). Manipulation der Zeiterfassung, Schwarzarbeit oder das Streichen geleisteter Stunden sind rechtswidrig und können strafbar sein (§ 266a StGB bei Sozialversicherung).'
    },

    // ── Sonstiges ──
    {
        id: 'zeugnis',
        patterns: [
            /\b(arbeits|ausbildungs|abschluss)?zeugnis\b/,
            /\bschriftliche\s+beurteilung\b/
        ],
        severity: 'info',
        law: '§ 16 BBiG',
        icon: '📄',
        title: 'Ausbildungszeugnis',
        text: 'Nach Beendigung der Ausbildung hast du Anspruch auf ein schriftliches Zeugnis (§ 16 BBiG) mit Angaben zu Art, Dauer und Ergebnis. Auf Verlangen qualifiziert mit Beurteilung von Verhalten und Leistung.'
    },
    {
        id: 'berichtsheft',
        patterns: [
            /\bberichtsheft\b/,
            /\bausbildungsnachweis\b/,
            /\bberichtsheft.{0,20}(zuhause|zu\s+hause|freizeit|nicht\s+w(ä|ae)hrend)/
        ],
        severity: 'info',
        law: '§ 13 BBiG',
        icon: '📔',
        title: 'Berichtsheft / Ausbildungsnachweis',
        text: 'Das Berichtsheft ist während der Ausbildungszeit zu führen (§ 13 BBiG). Der Ausbildungsbetrieb muss Zeit dafür im Betrieb geben — die Erstellung in der Freizeit ist nicht verpflichtend.'
    }
];

var DISMISSED_ALERTS = new Set();

function createScannerEl(containerId) {
    var el = document.createElement('div');
    el.className = 'bbig-scanner';
    el.id = containerId;
    el.innerHTML = '' +
        '<div class="bbig-scanner__inner">' +
            '<div class="bbig-scanner__header">' +
                '<svg class="bbig-scanner__shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' +
                    '<polyline points="9 12 11 14 15 10"/>' +
                '</svg>' +
                '<span class="bbig-scanner__title">BBiG-Live-Scanner</span>' +
                '<span class="bbig-scanner__badge">§ Legal Guard</span>' +
                '<button class="bbig-scanner__dismiss-all" title="Alle ausblenden" onclick="bbigDismissAll(\'' + containerId + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
            '</div>' +
            '<div class="bbig-scanner__alerts"></div>' +
            '<div class="bbig-scanner__footer">' +
                '<div class="bbig-scanner__status-dot"></div>' +
                '<span class="bbig-scanner__status-text">Echtzeit-Analyse · BBiG / JArbSchG / ArbZG / AGG / BUrlG</span>' +
            '</div>' +
        '</div>';
    return el;
}

function scanText(rawText, scannerId) {
    var container = document.getElementById(scannerId);
    if (!container) return;

    var alertsEl = container.querySelector('.bbig-scanner__alerts');
    if (!alertsEl) return;

    var text = normalizeText(rawText);
    var matches = [];

    for (var i = 0; i < BBIG_RULES.length; i++) {
        var rule = BBIG_RULES[i];
        if (DISMISSED_ALERTS.has(scannerId + ':' + rule.id)) continue;

        var matchedWord = null;
        for (var j = 0; j < rule.patterns.length; j++) {
            var pattern = rule.patterns[j];
            var m = text.match(pattern);
            if (!m) continue;
            if (!rule.containsNegation && isNegated(text, m.index)) continue;
            matchedWord = m[0];
            break;
        }

        if (matchedWord) {
            matches.push({
                id: rule.id,
                severity: rule.severity,
                law: rule.law,
                icon: rule.icon,
                title: rule.title,
                text: rule.text,
                matchedWord: matchedWord
            });
        }
    }

    matches.sort(function(a, b) {
        return (SEVERITY_RANK[a.severity] || 9) - (SEVERITY_RANK[b.severity] || 9);
    });

    var existing = alertsEl.querySelectorAll('.bbig-alert');
    existing.forEach(function(el) {
        var ruleId = el.dataset.ruleId;
        var stillMatching = matches.some(function(m) { return m.id === ruleId; });
        if (!stillMatching) {
            el.style.animation = 'none';
            el.style.opacity = '0';
            el.style.transform = 'translateX(8px)';
            el.style.transition = 'opacity 0.2s, transform 0.2s';
            setTimeout(function() { el.remove(); }, 200);
        }
    });

    for (var k = 0; k < matches.length; k++) {
        var match = matches[k];
        var existingEl = alertsEl.querySelector('[data-rule-id="' + match.id + '"]');
        if (existingEl) {
            var currentOrder = parseInt(existingEl.style.order, 10) || 0;
            if (currentOrder !== k) existingEl.style.order = String(k);
            continue;
        }
        var alertEl = document.createElement('div');
        alertEl.className = 'bbig-alert bbig-alert--' + match.severity;
        alertEl.dataset.ruleId = match.id;
        alertEl.style.order = String(k);
        alertEl.innerHTML = '' +
            '<span class="bbig-alert__icon">' + bbigEsc(match.icon) + '</span>' +
            '<div class="bbig-alert__body">' +
                '<div class="bbig-alert__top">' +
                    '<span class="bbig-alert__law">' + bbigEsc(match.law) + '</span>' +
                    '<span class="bbig-alert__keyword">' + bbigEsc(match.matchedWord) + '</span>' +
                '</div>' +
                '<div class="bbig-alert__text">' + bbigEsc(match.text) + '</div>' +
            '</div>' +
            '<button class="bbig-alert__close" title="Ausblenden" ' +
                'onclick="bbigDismissRule(\'' + bbigEsc(scannerId) + '\',\'' + bbigEsc(match.id) + '\',this.closest(\'.bbig-alert\'))"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>';
        alertsEl.appendChild(alertEl);
    }

    container.classList.toggle('bbig-scanner--active', alertsEl.children.length > 0);
}

function bbigDismissRule(scannerId, ruleId, alertEl) {
    DISMISSED_ALERTS.add(scannerId + ':' + ruleId);
    if (alertEl) {
        alertEl.style.transition = 'opacity 0.2s, transform 0.2s';
        alertEl.style.opacity = '0';
        alertEl.style.transform = 'translateX(8px)';
        setTimeout(function() {
            alertEl.remove();
            var container = document.getElementById(scannerId);
            if (container) {
                var hasAlerts = container.querySelector('.bbig-scanner__alerts').children.length > 0;
                container.classList.toggle('bbig-scanner--active', hasAlerts);
            }
        }, 220);
    }
}

function bbigDismissAll(scannerId) {
    var container = document.getElementById(scannerId);
    if (!container) return;
    container.querySelectorAll('.bbig-alert').forEach(function(el) {
        var ruleId = el.dataset.ruleId;
        if (ruleId) DISMISSED_ALERTS.add(scannerId + ':' + ruleId);
    });
    container.classList.remove('bbig-scanner--active');
    setTimeout(function() {
        var alertsEl = container.querySelector('.bbig-scanner__alerts');
        if (alertsEl) alertsEl.innerHTML = '';
    }, 350);
}

function attachScanner(inputId, scannerId) {
    var input = document.getElementById(inputId);
    if (!input) return;

    if (!document.getElementById(scannerId)) {
        var scanner = createScannerEl(scannerId);
        input.parentNode.insertBefore(scanner, input.nextSibling);
    }

    var debounceTimer;
    // Event-Delegation auf document — überlebt DOM-Swaps
    document.addEventListener('input', function(e) {
        if (e.target.id !== inputId) return;
        clearTimeout(debounceTimer);
        var val = e.target.value;
        if (val.length === 0) {
            [].concat([].slice.call(DISMISSED_ALERTS)).forEach(function(key) {
                if (key.indexOf(scannerId + ':') === 0) DISMISSED_ALERTS.delete(key);
            });
            var el = document.getElementById(scannerId);
            if (el) el.classList.remove('bbig-scanner--active');
            return;
        }
        debounceTimer = setTimeout(function() { scanText(val, scannerId); }, 200);
    });
}

// ── Expose globals (inline-onclick braucht diese im window-Scope) ──
window.bbigDismissRule = bbigDismissRule;
window.bbigDismissAll = bbigDismissAll;

// ── Berichtsheft: Zentraler Scanner ──
// Wird von pages/berichtsheft/index.html nach Laden aufgerufen
window.initBbigBerichtsheft = function() {
    var SCANNER_ID = 'bbigScannerBericht';

    function ensureCentralScanner() {
        if (document.getElementById(SCANNER_ID)) return;
        var anchor = document.getElementById('weeklyFieldGroup')
            || (document.getElementById('reportActivities') && document.getElementById('reportActivities').parentElement)
            || document.querySelector('.form-group');
        if (!anchor) return;
        var scanner = createScannerEl(SCANNER_ID);
        anchor.parentNode.insertBefore(scanner, anchor.nextSibling);
    }

    function collectAllText() {
        var parts = [];
        var weekly = document.getElementById('reportActivities');
        if (weekly && weekly.value.trim()) parts.push(weekly.value);
        document.querySelectorAll('.daily-textarea').forEach(function(ta) {
            if (ta.value.trim()) parts.push(ta.value);
        });
        return parts.join('\n');
    }

    var debounce;
    function onAnyInput() {
        clearTimeout(debounce);
        debounce = setTimeout(function() {
            ensureCentralScanner();
            var text = collectAllText();
            if (!text.trim()) {
                var el = document.getElementById(SCANNER_ID);
                if (el) el.classList.remove('bbig-scanner--active');
                return;
            }
            scanText(text, SCANNER_ID);
        }, 300);
    }

    document.addEventListener('input', function(e) {
        var t = e.target;
        if (t.id === 'reportActivities' || t.classList.contains('daily-textarea')) {
            onAnyInput();
        }
    });
};

// ── Hauptseite: direkt nach DOM-Ready init ──
function initMainApp() {
    attachScanner('inpNotes', 'bbigScannerDash');
    attachScanner('editInpNotes', 'bbigScannerEdit');

    var orig = window.openEditModal;
    if (typeof orig === 'function') {
        window.openEditModal = function(id) {
            orig(id);
            setTimeout(function() { attachScanner('editInpNotes', 'bbigScannerEdit'); }, 60);
        };
    }
}

function onReady(fn) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
    } else {
        fn();
    }
}

onReady(function() {
    if (document.getElementById('inpNotes')) {
        initMainApp();
    }
});

})();
