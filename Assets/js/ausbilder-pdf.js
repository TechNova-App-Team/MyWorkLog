// ═══ AUSBILDER-PDF MODULE ═══
// /ausbilder/: alle eingereichten Wochen EINES Azubis in einem PDF — der
// Ausbildungsnachweis fuer die Zulassung zur Abschlusspruefung (seit 14.11.2026).
//
// Gezeichnet wird mit DEMSELBEN Vordruck wie im Berichtsheft (ihk-formulare.js,
// ihkCtxAusBericht + buildIhkFormModel + ihkFormToPdf), damit Azubi und Ausbilder
// nie zwei verschiedene Blaetter fuer dieselbe Woche drucken.
//
// Was hinein kommt und warum:
//  - nur eingereichte Wochen (status complete/signed) — ein Entwurf ist kein
//    Nachweis; die Zahl der weggelassenen steht in der Rueckmeldung.
//  - die Unterschrift nur bei einer gueltigen Freigabe: 'approved' UND seitdem
//    unveraendert (`veraendert` → stale, dieselbe Regel wie beim Azubi).
//  - Vordruck: DIHK-Muster, Tagesform fuer Wochen im Tagesmodus, sonst Wochenform.
//    Die Kammer des Azubis kennt der Server nicht — das DIHK-Muster ist der
//    Vordruck, den die meisten Kammern unveraendert nehmen (ihk-formulare.js Kopf).
//  - Deckblatt einmal vorn: Name, Betrieb, Ausbilder. Beruf, Beginn, Ende stehen
//    nirgends auf dem Server und bleiben leer statt erfunden.
//
// Nachgeladen erst beim Klick (jsPDF ~360 KB). Die ?v=-Literale stempelt
// tools/stamp-assets.js (JS_RE) — keine Adresse ohne ?v= hier eintragen.

(function () {
    'use strict';

    var SKRIPTE = [
        '/Assets/js/vendor/jspdf-2.5.1.umd.min.js?v=98ccf17aa1',
        '/Assets/js/berichtsheft/bh-text.js?v=c09de7652e',
        '/Assets/js/berichtsheft/ihk-formulare.js?v=bc0d94652b'
    ];

    function eins(src) {
        return new Promise(function (ok, fehler) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = function () { ok(); };
            s.onerror = function () { fehler(new Error('Laden fehlgeschlagen: ' + src)); };
            document.head.appendChild(s);
        });
    }

    var laden = null;
    function bibliotheken() {
        if (window.jspdf && window.jspdf.jsPDF && window.ihkFormToPdf && window.ihkCtxAusBericht && window.BHText) {
            return Promise.resolve();
        }
        if (!laden) {
            // Nacheinander: ihk-formulare.js prueft BHText erst beim Zeichnen,
            // aber die Reihenfolge haelt es wie im Berichtsheft.
            laden = SKRIPTE.reduce(function (p, src) { return p.then(function () { return eins(src); }); }, Promise.resolve())
                .catch(function (e) { laden = null; throw e; });
        }
        return laden;
    }

    function eingereicht(b) { return b && (b.status === 'complete' || b.status === 'signed'); }

    // Server-Zeile → das Bericht-Objekt, das ihkCtxAusBericht erwartet
    // (Felder wie im Berichtsheft, Inhalt aus `inhalt`).
    function zeileZuBericht(b) {
        var r = Object.assign({}, b.inhalt || {}, {
            id: b.client_id,
            year: b.jahr, week: b.kw,
            dateFrom: b.datum_von, dateTo: b.datum_bis,
            status: b.status
        });
        var f = b.freigabe;
        if (f && f.entscheidung === 'approved' && !f.widerruft && window.BHB2B && BHB2B._intern && BHB2B._intern.zeileZuApproval) {
            r.approval = BHB2B._intern.zeileZuApproval(f, b.client_id);
            if (b.veraendert) r.approval.stale = true;
        }
        return r;
    }

    /** Reine Auswahl + Zaehlung, ohne PDF — pruefbar (tools/ausbilder-pdf.test.mjs). */
    function auswahl(berichte) {
        var drin = (berichte || []).filter(eingereicht)
            .slice().sort(function (a, b) { return String(a.datum_von || '').localeCompare(String(b.datum_von || '')); });
        var abgezeichnet = drin.filter(function (b) {
            return b.freigabe && b.freigabe.entscheidung === 'approved' && !b.freigabe.widerruft && !b.veraendert;
        }).length;
        return {
            berichte: drin,
            abgezeichnet: abgezeichnet,
            entwuerfe: (berichte || []).filter(function (b) { return b && b.status === 'incomplete'; }).length
        };
    }

    function dateiname(name) {
        var s = String(name || 'Azubi').normalize('NFD').replace(/\p{M}/gu, '')
            .replace(/ß/g, 'ss').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        return 'Ausbildungsnachweise_' + (s || 'Azubi') + '.pdf';
    }

    /**
     * az = { name, berichte } (aus BHB2B.azubiBerichte), kopf = { betrieb, ausbilder }.
     * → { wochen, abgezeichnet, entwuerfe } nach dem Speichern; wirft bei Ladefehlern.
     */
    async function gesamtPdf(az, kopf) {
        var a = auswahl(az.berichte);
        if (!a.berichte.length) return { wochen: 0, abgezeichnet: 0, entwuerfe: a.entwuerfe };
        await bibliotheken();
        var doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
        var k = { name: az.name || '', betrieb: (kopf && kopf.betrieb) || '', ausbilder: (kopf && kopf.ausbilder) || '' };
        a.berichte.forEach(function (b, i) {
            var r = zeileZuBericht(b);
            var form = r.mode === 'daily' && r.dailyActivities ? 'dihk-t' : 'dihk-w';
            var model = window.buildIhkFormModel(form, window.ihkCtxAusBericht(r, k));
            if (i > 0) { model.cover = null; doc.addPage(); }
            window.ihkFormToPdf(doc, model);
        });
        doc.save(dateiname(az.name));
        return { wochen: a.berichte.length, abgezeichnet: a.abgezeichnet, entwuerfe: a.entwuerfe };
    }

    window.AusbilderPdf = { gesamtPdf: gesamtPdf, _intern: { auswahl: auswahl, zeileZuBericht: zeileZuBericht, dateiname: dateiname } };
})();
