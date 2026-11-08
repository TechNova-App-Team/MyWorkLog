// ═══ KARTEIKASTEN · KARTEN PRUEFEN ═══
// Validator fuer KI-Karten (Plan .claude/notes/karteikasten.md, Abschnitt 5).
// Laeuft ZWEIMAL: im Worker (kaputte Antworten nicht bezahlt durchreichen) und im
// Client (dem Worker vertrauen hiesse, einem fremden Modell zu vertrauen). Der
// Worker bekommt eine Kopie dieser Datei; derselbe Test prueft beide.
//
// Ergebnis ist nie die Karte des Modells, sondern eine NEU gebaute Karte aus den
// erlaubten Feldern. Was nicht im Schema steht, kommt nicht durch — das haelt den
// Kasten dicht gegen „Chatbot durch die Hintertuer“.
//
// Bewusst ohne Backslash-Regexe (CLAUDE.md, Heredoc-Falle): Zeichenklassen mit
// [0-9] und Listen als Daten.
(function (wurzel) {
    'use strict';

    var TYPEN = ['wahl', 'aufdecken', 'reihe'];
    var QUELLEN = ['heft', 'stoff', 'rahmenplan'];

    // Banalfragen („Was hast du am Montag gemacht?“) pruefen Erinnerung statt Wissen.
    var WOCHENTAGE = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    var DU = ['du', 'dich', 'dir', 'you'];
    var VERGANGEN = ['hast', 'hattest', 'warst', 'bist', 'did', 'were', 'have'];
    var AUSZEICHNUNG = ['<', '](', '**', '`'];

    function norm(s) {
        return String(s == null ? '' : s).normalize('NFC').toLowerCase()
            .replace(/[„“”«»]/g, '"').replace(/[‚‘’`´]/g, "'")
            .replace(/[ \t\r\n\xa0]+/g, ' ').trim();
    }
    function woerter(s) { return norm(s).split(/[^a-zäöüß0-9]+/).filter(Boolean); }
    function txt(v, min, max) { return typeof v === 'string' && v.trim().length >= min && v.trim().length <= max; }
    function ganz(v, min, max) { return typeof v === 'number' && Math.floor(v) === v && v >= min && v <= max; }

    // Gibt den Grund des Verwerfens zurueck, oder '' wenn die Karte gilt.
    function grund(k, ctx) {
        if (!k || typeof k !== 'object' || Array.isArray(k)) return 'keine_karte';
        if (TYPEN.indexOf(k.typ) === -1) return 'typ';
        if (!txt(k.frage, 15, 220)) return 'frage_laenge';
        var ende = k.frage.trim().slice(-1);
        if (ende !== '?' && ende !== '.') return 'frage_ende';
        if (!txt(k.erklaerung, 30, 400)) return 'erklaerung_laenge';
        if (!txt(k.kurz, 3, 40)) return 'kurz_laenge';
        if (!ganz(k.schwierigkeit, 1, 3)) return 'schwierigkeit';

        if (k.typ === 'wahl') {
            if (!Array.isArray(k.wahlen) || k.wahlen.length !== 4) return 'wahlen_anzahl';
            if (!k.wahlen.every(function (w) { return txt(w, 1, 90); })) return 'wahlen_laenge';
            if (!ganz(k.richtig, 0, 3)) return 'richtig';
            var n = k.wahlen.map(norm);
            for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) if (n[i] === n[j]) return 'wahlen_doppelt';
            // Klassischer Testfehler: die richtige Antwort ist auffaellig die laengste
            var andere = k.wahlen.filter(function (_, x) { return x !== k.richtig; });
            var schnitt = andere.reduce(function (s, w) { return s + w.trim().length; }, 0) / andere.length;
            if (k.wahlen[k.richtig].trim().length > 1.8 * schnitt) return 'richtige_am_laengsten';
            if (n[k.richtig].length >= 4 && norm(k.frage).indexOf(n[k.richtig]) !== -1) return 'antwort_in_frage';
        } else if (k.typ === 'aufdecken') {
            if (!txt(k.antwort, 20, 400)) return 'antwort_laenge';
            if (norm(k.frage).indexOf(norm(k.antwort)) !== -1) return 'antwort_in_frage';
        } else {
            if (!Array.isArray(k.teile) || k.teile.length < 3 || k.teile.length > 6) return 'teile_anzahl';
            if (!k.teile.every(function (t) { return txt(t, 2, 60); })) return 'teile_laenge';
            var nt = k.teile.map(norm);
            if (nt.some(function (t, x) { return nt.indexOf(t) !== x; })) return 'teile_doppelt';
        }

        var texte = sichtbar(k);
        if (texte.some(function (t) { return AUSZEICHNUNG.some(function (a) { return t.indexOf(a) !== -1; }); })) return 'auszeichnung';

        var w = woerter(k.frage);
        var hat = function (liste) { return w.some(function (x) { return liste.indexOf(x) !== -1; }); };
        if (hat(WOCHENTAGE) && hat(DU) && hat(VERGANGEN)) return 'banal';

        // Halluzinations-Bremse: ohne nachweisbare Herkunft keine Karte
        if (ctx.quelle === 'rahmenplan') {
            if ((ctx.lernziele || []).indexOf(k.beleg) === -1) return 'beleg_fremd';
            var quelle = norm(ctx.text);
            var alles = norm(texte.join(' '));
            if (alles.indexOf('§') !== -1 && quelle.indexOf('§') === -1) return 'erfunden_paragraph';
            if (alles.indexOf('%') !== -1 && quelle.indexOf('%') === -1) return 'erfunden_prozent';
            var jahre = alles.match(/(^|[^0-9])(1[89]|20)[0-9]{2}(?![0-9])/g) || [];
            if (jahre.some(function (j) { return quelle.indexOf(j.replace(/^[^0-9]/, '')) === -1; })) return 'erfunden_jahr';
        } else {
            if (!txt(k.beleg, 10, 160)) return 'beleg_laenge';
            if (norm(ctx.text).indexOf(norm(k.beleg)) === -1) return 'beleg_fehlt';
        }

        var f = norm(k.frage);
        if ((ctx.vorhandeneFragen || []).some(function (v) { return norm(v) === f; })) return 'doppelt';
        return '';
    }

    function sichtbar(k) {
        return [k.frage, k.erklaerung, k.kurz, k.antwort].concat(k.wahlen || [], k.teile || [])
            .filter(function (t) { return typeof t === 'string'; });
    }

    // Nur erlaubte Felder, getrimmt. Kein Spread der Modell-Antwort.
    function sauber(k, ctx) {
        var c = { typ: k.typ, frage: k.frage.trim(), erklaerung: k.erklaerung.trim(), kurz: k.kurz.trim(),
            beleg: String(k.beleg).trim(), schwierigkeit: k.schwierigkeit, quelle: ctx.quelle };
        if (k.typ === 'wahl') { c.wahlen = k.wahlen.map(function (w) { return w.trim(); }); c.richtig = k.richtig; }
        if (k.typ === 'aufdecken') c.antwort = k.antwort.trim();
        if (k.typ === 'reihe') c.teile = k.teile.map(function (t) { return t.trim(); });
        return c;
    }

    // ctx = { quelle, text, lernziele?: [ids], vorhandeneFragen?: [string] }
    // → { karten: [saubere Karten], verworfen: n, gruende: { grund: anzahl } }
    function pruefeAntwort(antwort, ctx) {
        var aus = { karten: [], verworfen: 0, gruende: {} };
        if (!ctx || QUELLEN.indexOf(ctx.quelle) === -1) throw new Error('karten-pruefen: unbekannte quelle');
        var liste = antwort && antwort.v === 1 && Array.isArray(antwort.karten) ? antwort.karten : null;
        if (!liste) { aus.gruende.format = 1; return aus; }
        var schon = (ctx.vorhandeneFragen || []).slice();
        liste.slice(0, 8).forEach(function (k) {
            var g = grund(k, { quelle: ctx.quelle, text: ctx.text, lernziele: ctx.lernziele, vorhandeneFragen: schon });
            if (g) { aus.verworfen++; aus.gruende[g] = (aus.gruende[g] || 0) + 1; return; }
            aus.karten.push(sauber(k, ctx));
            schon.push(k.frage);
        });
        if (liste.length > 8) { aus.verworfen += liste.length - 8; aus.gruende.zu_viele = liste.length - 8; }
        return aus;
    }

    var api = { pruefeAntwort: pruefeAntwort, grund: grund };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else wurzel.KKKartenPruefen = api;
})(typeof window !== 'undefined' ? window : globalThis);
