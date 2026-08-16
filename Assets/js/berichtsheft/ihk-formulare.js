// ═══ IHK-FORMULARE MODULE ═══
//
// Amtliche Ausbildungsnachweis-Vordrucke als Daten, nicht als Code.
//
// Warum ueberhaupt: Der haeufigste Grund, ein digitales Berichtsheft NICHT zu
// nehmen, ist "mein Ausbilder will das offizielle Formular". Also erzeugt der
// PDF-Export genau dieses Formular — Feldbeschriftungen woertlich wie im
// Vordruck der jeweiligen Kammer.
//
// Recherche-Ergebnis (Stand 08/2026, Volltext aus den amtlichen PDFs gezogen):
// Es gibt nicht "pro IHK ein eigenes Blatt", sondern drei Familien.
//
//   A) DIHK-Muster, Anlagen 2a/3a — Kopffeld "Ausbildungsbereich",
//      VIER Unterschriftsfelder (inkl. gesetzliche/r Vertreter/in und weitere
//      Sichtvermerke), Fussnote "* Wie lange wurde welche Taetigkeit ausgeuebt?".
//      Das ist der Vordruck, den die meisten Kammern unveraendert weiterreichen.
//   B) Neufassung (u. a. IHK Koeln, IHK Frankfurt am Main) — Kopffeld
//      "Ggf. ausbildende Abteilung", Bestaetigungssatz ueber den Unterschriften,
//      nur ZWEI Unterschriftsfelder. Taeglich zusaetzlich als Variante mit
//      Bezug zum Ausbildungsrahmenplan (Lfd. Nr. / Einzel- / Gesamtstunden).
//   C) IHK fuer Muenchen und Oberbayern — eigener Kopf (Name /
//      Ausbildungsabteilung, darunter Streifen Nr. | vom | bis | Ausbildungsjahr),
//      Block "Berufsschule (Unterrichtsthemen)" statt "Themen des
//      Berufsschulunterrichts", KEINE Stunden-Spalte, drei datierte
//      Unterschriften.
//
// Ehrlichkeit gegenueber dem Nutzer: `verified: true` steht nur an Kammern,
// deren Vordruck tatsaechlich gelesen wurde. Alle uebrigen bekommen das
// DIHK-Muster und sagen das in der Oberflaeche auch.
//
// Aufbau: Vorlage (Daten) → buildIhkFormModel() (Werte einsetzen) → ein Modell,
// aus dem BEIDE Ausgaben entstehen: ihkFormToHtml() fuer die Live-Vorschau und
// ihkFormToPdf() fuer das Papier. Ein Modell, damit Vorschau und Druck nicht
// auseinanderlaufen koennen.

(function () {
    'use strict';

    // ── Textbausteine, die mehrfach woertlich vorkommen ──────────────────────
    const T = {
        blockBetrieb:   'Betriebliche Tätigkeiten',
        blockBetriebFn: 'Betriebliche Tätigkeiten*',
        blockUnterw:    'Unterweisungen, betrieblicher Unterricht, sonstige Schulungen',
        blockUnterwFn:  'Unterweisungen, betrieblicher Unterricht, sonstige Schulungen*',
        blockUnterwHwk: 'Unterweisungen bzw. überbetriebliche Unterweisungen (z. B. im Handwerk), betrieblicher Unterricht, sonstige Schulungen',
        blockUnterwMuc: 'Unterweisungen, Lehrgespräche, betrieblicher Unterricht, sonstige Schulungen',
        blockSchule:    'Themen des Berufsschulunterrichts',
        blockSchuleMuc: 'Berufsschule (Unterrichtsthemen)',
        stunden:        'Stunden',
        fussnote:       '*  Wie lange wurde welche Tätigkeit ausgeübt?',
        bestaetigung1:  'Durch die nachfolgende Unterschrift wird die Richtigkeit und Vollständigkeit der obigen Angaben bestätigt.',
        bestaetigung3:  'Durch die nachfolgenden Unterschriften wird die Richtigkeit und Vollständigkeit der obigen Angaben bestätigt.',
        sigAzubi:       'Datum, Unterschrift Auszubildende/r',
        sigAusbilder:   'Datum, Unterschrift Ausbildende/r oder Ausbilder/in',
        sigVertreter:   'Datum, Unterschrift gesetzliche/r Vertreter/in',
        sigWeitere:     'Datum, weitere Sichtvermerke (z. B. Lehrer/in)',
        fortsetzung:    'Raum für zusätzliche Berichte'
    };

    const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    // ── Kopfzeilen-Bauteile ──────────────────────────────────────────────────
    // Jede Zeile ist ein Array von Zellen. `w` = Anteil an der Zeilenbreite.
    const KOPF_DIHK = [
        [{ label: 'Name des/der Auszubildenden:', key: 'name', w: 1 }],
        [{ label: 'Ausbildungsjahr:', key: 'jahr', w: 1 }],
        [{ label: 'Ausbildungsbereich:', key: 'bereich', w: 1 }],
        [{ label: 'Ausbildungswoche vom:', key: 'von', w: 0.5 },
         { label: 'bis:', key: 'bis', w: 0.5 }]
    ];
    const KOPF_NEU = [
        [{ label: 'Name des/der Auszubildenden:', key: 'name', w: 1 }],
        [{ label: 'Ausbildungsjahr:', key: 'jahr', w: 1 }],
        [{ label: 'Ggf. ausbildende Abteilung:', key: 'bereich', w: 1 }],
        [{ label: 'Ausbildungswoche vom:', key: 'von', w: 0.5 },
         { label: 'bis:', key: 'bis', w: 0.5 }]
    ];
    const KOPF_MUC = [
        [{ label: 'Name:', key: 'name', w: 1 }],
        [{ label: 'Ausbildungsabteilung:', key: 'bereich', w: 1 }],
        [{ label: 'Nr.', key: 'nr', w: 0.16, capBelow: true },
         { label: 'Ausbildungswoche vom', key: 'von', w: 0.28, capBelow: true },
         { label: 'bis', key: 'bis', w: 0.28, capBelow: true },
         { label: 'Ausbildungsjahr', key: 'jahr', w: 0.28, capBelow: true }]
    ];

    // ── Die Vorlagen ─────────────────────────────────────────────────────────
    // minH = Mindesthoehe des Textkastens in mm. So sieht ein duenn gefuellter
    // Bericht aus wie das leere Formular und nicht wie eine geschrumpfte Notiz.
    const IHK_FORMS = {

        'dihk-w': {
            label: 'DIHK-Muster — wöchentlich',
            labelEn: 'DIHK standard — weekly',
            hint: 'Anlage 3a, vier Unterschriftsfelder',
            hintEn: 'Annex 3a, four signature fields',
            title: 'Ausbildungsnachweis (wöchentlich)',
            cadence: 'weekly',
            kopf: KOPF_DIHK,
            hoursCol: true,
            cover: 'dihk',
            blocks: [
                { title: T.blockBetriebFn, src: 'activities',  minH: 78 },
                { title: T.blockUnterwFn,  src: 'instruction', minH: 42 },
                { title: T.blockSchule,    src: 'school',      minH: 42 }
            ],
            footnote: T.fussnote,
            signatures: [T.sigAzubi, T.sigAusbilder, T.sigVertreter, T.sigWeitere]
        },

        'dihk-t': {
            label: 'DIHK-Muster — täglich',
            labelEn: 'DIHK standard — daily',
            hint: 'Anlage 2a, Montag bis Samstag',
            hintEn: 'Annex 2a, Monday to Saturday',
            title: 'Ausbildungsnachweis (täglich)',
            cadence: 'daily',
            kopf: KOPF_DIHK,
            hoursCol: true,
            cover: 'dihk',
            dayHead: 'Betriebliche Tätigkeiten, Unterweisungen, betrieblicher Unterricht, sonstige Schulungen, Themen des Berufsschulunterrichts',
            dayRowH: 20,
            signatures: [T.sigAzubi, T.sigAusbilder, T.sigVertreter, T.sigWeitere]
        },

        'neu-w': {
            label: 'Neufassung — wöchentlich',
            labelEn: 'Revised version — weekly',
            hint: '„Ggf. ausbildende Abteilung", zwei Unterschriften',
            hintEn: '„Ggf. ausbildende Abteilung“ field, two signatures',
            title: 'Ausbildungsnachweis (wöchentlich)',
            cadence: 'weekly',
            kopf: KOPF_NEU,
            hoursCol: true,
            cover: 'dihk',
            blocks: [
                { title: T.blockBetrieb,   src: 'activities',  minH: 78 },
                { title: T.blockUnterwHwk, src: 'instruction', minH: 42 },
                { title: T.blockSchule,    src: 'school',      minH: 42 }
            ],
            confirmLine: T.bestaetigung1,
            signatures: [T.sigAzubi, T.sigAusbilder]
        },

        'neu-t': {
            label: 'Neufassung — täglich',
            labelEn: 'Revised version — daily',
            hint: '„Ggf. ausbildende Abteilung", zwei Unterschriften',
            hintEn: '„Ggf. ausbildende Abteilung“ field, two signatures',
            title: 'Ausbildungsnachweis (täglich)',
            cadence: 'daily',
            kopf: KOPF_NEU,
            hoursCol: true,
            cover: 'dihk',
            dayHead: 'Betriebliche Tätigkeiten, Unterweisungen, betrieblicher Unterricht, sonstige Schulungen, Themen des Berufsschulunterrichts',
            dayRowH: 20,
            confirmLine: T.bestaetigung1,
            signatures: [T.sigAzubi, T.sigAusbilder]
        },

        'neu-t-arp': {
            label: 'Neufassung — täglich mit ARP-Bezug',
            labelEn: 'Revised version — daily, with training-plan reference',
            hint: 'Zusatzspalten Lfd. Nr., Einzel- und Gesamtstunden',
            hintEn: 'Extra columns for item no., individual and total hours',
            title: 'Ausbildungsnachweis (täglich)',
            subtitle: 'Ausbildungsnachweis mit freiwilligem Bezug zum Ausbildungsrahmenplan (ARP)',
            cadence: 'daily',
            kopf: KOPF_NEU,
            hoursCol: false,
            cover: 'dihk',
            dayHead: 'Ausgeführte Arbeiten, Unterricht usw.',
            dayCols: [
                { head: 'Lfd. Nr.:\nBezug zum ARP', w: 20, key: 'arp' },
                { head: 'Einzel-\nstunden',         w: 16, key: 'hours' },
                { head: 'Gesamt-\nstunden',         w: 16, key: 'total' },
                { head: 'Abtei-\nlung',             w: 16, key: 'dept' }
            ],
            dayRowH: 19,
            sumRow: 'Gesamtstunden',
            confirmLine: T.bestaetigung1,
            signatures: [T.sigAzubi, T.sigAusbilder]
        },

        'muc-w': {
            label: 'IHK München — wöchentlich',
            labelEn: 'IHK Munich — weekly',
            hint: 'Eigener Kopfstreifen, drei datierte Unterschriften',
            hintEn: 'Own header strip, three dated signatures',
            title: 'Ausbildungsnachweis',
            cadence: 'weekly',
            kopf: KOPF_MUC,
            hoursCol: false,
            cover: null,
            blocks: [
                { title: T.blockBetrieb,    src: 'activities',  minH: 80 },
                { title: T.blockUnterwMuc,  src: 'instruction', minH: 44 },
                { title: T.blockSchuleMuc,  src: 'school',      minH: 44 }
            ],
            confirmLine: T.bestaetigung3,
            sigStyle: 'dated',
            signatures: ['Auszubildende/-r', 'Ausbilder/-in', 'Gesetzliche/-r Vertreter/-in']
        }
    };

    // ── Kammern ──────────────────────────────────────────────────────────────
    // verified: Vordruck der Kammer wurde gelesen. Sonst: DIHK-Muster als
    // begruendete Annahme — und die Oberflaeche sagt das auch so.
    const IHK_KAMMERN = [
        { id: 'dihk',       name: 'DIHK-Muster (Standard)',            forms: ['dihk-w', 'dihk-t'],                       verified: true },
        { id: 'muenchen',   name: 'IHK für München und Oberbayern',    forms: ['muc-w', 'dihk-t'],                        verified: true },
        { id: 'koeln',      name: 'IHK Köln',                          forms: ['neu-w', 'neu-t', 'neu-t-arp'],            verified: true },
        { id: 'frankfurt',  name: 'IHK Frankfurt am Main',             forms: ['neu-w', 'neu-t'],                         verified: true },
        { id: 'nuernberg',  name: 'IHK Nürnberg für Mittelfranken',    forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'berlin',     name: 'IHK Berlin',                        forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'hamburg',    name: 'Handelskammer Hamburg',             forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'stuttgart',  name: 'IHK Region Stuttgart',              forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'duesseldorf',name: 'IHK Düsseldorf',                    forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'dortmund',   name: 'IHK zu Dortmund',                   forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'essen',      name: 'IHK zu Essen',                      forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'hannover',   name: 'IHK Hannover',                      forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'bremen',     name: 'Handelskammer Bremen',              forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'leipzig',    name: 'IHK zu Leipzig',                    forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'dresden',    name: 'IHK Dresden',                       forms: ['dihk-w', 'dihk-t'],                       verified: false },
        { id: 'andere',     name: 'Andere / nicht aufgeführt',         forms: ['dihk-w', 'dihk-t', 'neu-w', 'neu-t', 'neu-t-arp', 'muc-w'], verified: false }
    ];

    function getKammer(id) {
        return IHK_KAMMERN.find(k => k.id === id) || IHK_KAMMERN[0];
    }

    // Die Namen der Vordrucke sind Oberflaeche, nicht Formularinhalt — die
    // muessen auf /en/ englisch sein. Der Vordruck selbst bleibt deutsch: er
    // ist ein deutsches Behoerdenformular und wird auf Deutsch eingereicht.
    function isEnglish() {
        return typeof document !== 'undefined' && document.documentElement.lang === 'en';
    }
    function ihkFormLabel(id) {
        const f = IHK_FORMS[id];
        if (!f) return '';
        return (isEnglish() && f.labelEn) ? f.labelEn : f.label;
    }
    function ihkFormHint(id) {
        const f = IHK_FORMS[id];
        if (!f) return '';
        return (isEnglish() && f.hintEn) ? f.hintEn : f.hint;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODELL BAUEN
    // ═══════════════════════════════════════════════════════════════════════
    // ctx: { name, jahr, bereich, von, bis, nr, activities, instruction, school,
    //        days:[{label,text,hours}], gesamtStunden,
    //        adresse, beruf, fachrichtung, betrieb, ausbilder, heftNr, beginn, ende }

    // Leerzeilen INNERHALB des Textes bleiben stehen (sie sind Gliederung),
    // fuehrende und abschliessende fliegen raus.
    function toLines(text) {
        if (!text) return [];
        const out = String(text).split('\n').map(l => l.replace(/\s+$/, ''));
        while (out.length && out[0] === '') out.shift();
        while (out.length && out[out.length - 1] === '') out.pop();
        return out;
    }

    function buildIhkFormModel(formId, ctx) {
        const tpl = IHK_FORMS[formId] || IHK_FORMS['dihk-w'];
        const val = k => (ctx && ctx[k] != null && ctx[k] !== '') ? String(ctx[k]) : '';

        const kopfRows = tpl.kopf.map(row => row.map(cell => ({
            label: cell.label,
            value: val(cell.key),
            w: cell.w,
            capBelow: !!cell.capBelow
        })));

        const model = {
            formId: formId,
            label: tpl.label,
            title: tpl.title,
            subtitle: tpl.subtitle || null,
            cadence: tpl.cadence,
            kopfRows: kopfRows,
            hoursCol: !!tpl.hoursCol,
            hoursHead: T.stunden,
            footnote: tpl.footnote || null,
            confirmLine: tpl.confirmLine || null,
            sigStyle: tpl.sigStyle || 'line',
            signatures: tpl.signatures.slice(),
            continueTitle: T.fortsetzung,
            sections: []
        };

        if (tpl.cadence === 'weekly') {
            tpl.blocks.forEach((b, i) => {
                model.sections.push({
                    kind: 'text',
                    title: b.title,
                    lines: toLines(ctx && ctx[b.src]),
                    // Stunden gehoeren nur an den Taetigkeits-Block: fuer die
                    // beiden anderen liegt in den Daten schlicht keine Zahl vor,
                    // und eine erfundene waere schlimmer als ein leeres Feld.
                    hours: (i === 0 && tpl.hoursCol) ? val('gesamtStunden') : '',
                    minH: b.minH
                });
            });
        } else {
            const days = (ctx && ctx.days) || [];
            const rows = TAGE.map(tag => {
                const d = days.find(x => x.label === tag);
                return {
                    label: tag,
                    lines: toLines(d && d.text),
                    hours: d && d.hours ? String(d.hours) : '',
                    arp: '', total: '', dept: ''
                };
            });
            model.sections.push({
                kind: 'days',
                head: tpl.dayHead,
                cols: tpl.dayCols || null,
                rows: rows,
                rowH: tpl.dayRowH,
                sumRow: tpl.sumRow || null,
                sumValue: val('gesamtStunden')
            });
        }

        model.cover = tpl.cover === 'dihk' ? {
            title: tpl.title,
            fields: [
                ['Heft-Nr.:', val('heftNr')],
                ['Name, Vorname:', val('name')],
                ['Adresse:', val('adresse')],
                ['Ausbildungsberuf:', val('beruf')],
                ['Fachrichtung/Schwerpunkt:', val('fachrichtung')],
                ['Ausbildungsbetrieb:', val('betrieb')],
                ['Verantwortliche/r Ausbilder/in:', val('ausbilder')],
                ['Beginn der Ausbildung:', val('beginn')],
                ['Ende der Ausbildung:', val('ende')]
            ]
        } : null;

        return model;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AUSGABE 1 — HTML fuer die Live-Vorschau
    // ═══════════════════════════════════════════════════════════════════════

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function linesHtml(lines) {
        if (!lines || !lines.length) return '';
        return lines.map(l => esc(l) || '&nbsp;').join('<br>');
    }

    function kopfHtml(model) {
        return model.kopfRows.map(row => {
            const cells = row.map(c => {
                const pct = (c.w * 100).toFixed(4) + '%';
                if (c.capBelow) {
                    return '<div class="fm-cell fm-cell-cap" style="width:' + pct + '">' +
                           '<div class="fm-val">' + (esc(c.value) || '&nbsp;') + '</div>' +
                           '<div class="fm-lab">' + esc(c.label) + '</div></div>';
                }
                return '<div class="fm-cell" style="width:' + pct + '">' +
                       '<span class="fm-lab">' + esc(c.label) + '</span>' +
                       '<span class="fm-val">' + esc(c.value) + '</span></div>';
            }).join('');
            return '<div class="fm-row">' + cells + '</div>';
        }).join('');
    }

    function ihkFormToHtml(model) {
        let h = '<div class="fm-page">';
        h += '<div class="fm-title">' + esc(model.title) + '</div>';
        if (model.subtitle) h += '<div class="fm-subtitle">' + esc(model.subtitle) + '</div>';
        h += '<div class="fm-head">' + kopfHtml(model) + '</div>';

        model.sections.forEach(sec => {
            if (sec.kind === 'text') {
                h += '<div class="fm-block">' +
                     '<div class="fm-block-head">' +
                       '<span class="fm-block-title">' + esc(sec.title) + '</span>' +
                       (model.hoursCol ? '<span class="fm-block-hours">' + esc(model.hoursHead) + '</span>' : '') +
                     '</div>' +
                     '<div class="fm-block-body" style="min-height:' + (sec.minH * 0.9).toFixed(0) + 'px">' +
                       '<div class="fm-block-text">' + linesHtml(sec.lines) + '</div>' +
                       (model.hoursCol ? '<div class="fm-block-hval">' + esc(sec.hours) + '</div>' : '') +
                     '</div></div>';
            } else {
                const extra = sec.cols || [];
                h += '<div class="fm-block"><table class="fm-days"><thead><tr>' +
                     '<th class="fm-d-day"></th>' +
                     '<th class="fm-d-main">' + esc(sec.head) + '</th>' +
                     (model.hoursCol ? '<th class="fm-d-h">' + esc(model.hoursHead) + '</th>' : '') +
                     extra.map(c => '<th class="fm-d-x">' + esc(c.head).replace(/\n/g, '<br>') + '</th>').join('') +
                     '</tr></thead><tbody>' +
                     sec.rows.map(r =>
                        '<tr><td class="fm-d-day">' + esc(r.label) + '</td>' +
                        '<td class="fm-d-main">' + linesHtml(r.lines) + '</td>' +
                        (model.hoursCol ? '<td class="fm-d-h">' + esc(r.hours) + '</td>' : '') +
                        extra.map(c => '<td class="fm-d-x">' + esc(r[c.key] || '') + '</td>').join('') +
                        '</tr>').join('') +
                     (sec.sumRow ? '<tr class="fm-d-sum"><td class="fm-d-day"></td>' +
                        '<td class="fm-d-main">' + esc(sec.sumRow) + '</td>' +
                        (model.hoursCol ? '<td class="fm-d-h"></td>' : '') +
                        extra.map((c, i) => '<td class="fm-d-x">' + (i === extra.length - 2 ? esc(sec.sumValue) : '') + '</td>').join('') +
                        '</tr>' : '') +
                     '</tbody></table></div>';
            }
        });

        if (model.footnote)    h += '<div class="fm-foot">' + esc(model.footnote) + '</div>';
        if (model.confirmLine) h += '<div class="fm-confirm">' + esc(model.confirmLine) + '</div>';

        const per = model.sigStyle === 'dated' ? model.signatures.length : 2;
        const wPct = (100 / per).toFixed(4) + '%';
        h += '<div class="fm-sigs' + (model.sigStyle === 'dated' ? ' fm-sigs-dated' : '') + '">' +
             model.signatures.map(s =>
                '<div class="fm-sig" style="width:' + wPct + '">' +
                (model.sigStyle === 'dated' ? '<div class="fm-sig-date">Datum:</div>' : '') +
                '<div class="fm-sig-line"></div>' +
                '<div class="fm-sig-lab">' + esc(s) + '</div></div>').join('') +
             '</div>';

        h += '</div>';
        return h;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AUSGABE 2 — jsPDF
    // ═══════════════════════════════════════════════════════════════════════
    // Reines Schwarzweiss mit Haarlinien: ein amtlicher Vordruck lebt von
    // Kaesten, nicht von Farbe. Dadurch braucht dieser Pfad auch kein
    // print-color-adjust — es gibt schlicht keine Flaechen ausser dem hellen
    // Grau der Blockkoepfe, und das ist im PDF eine echte Fuellung.

    const PDF = {
        ML: 20, MR: 15, MT: 16, MB: 14,     // Rand links breiter: Lochung/Heftung
        HOURS_W: 22,                         // Breite der Stunden-Spalte
        DAY_W: 24,                           // Breite der Wochentag-Spalte
        LH: 4.2,                             // Zeilenhoehe im Fliesstext
        HEAD_H: 11,                          // Hoehe einer Kopf-Zelle
        BAR_H: 7                             // Hoehe eines Blockkopfs
    };

    function ihkFormToPdf(doc, model) {
        const PW = doc.internal.pageSize.getWidth();
        const PH = doc.internal.pageSize.getHeight();
        const CW = PW - PDF.ML - PDF.MR;
        const BOTTOM = PH - PDF.MB;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);

        if (model.cover) drawCover(doc, model, PW, CW);

        let y = model.cover ? (doc.addPage(), PDF.MT) : PDF.MT;
        y = drawTitleAndHead(doc, model, y, CW);

        // Platzbedarf der Unterschriften am Seitenende freihalten
        const sigH = sigBlockHeight(model);
        const contentBottom = BOTTOM - sigH - (model.confirmLine ? 8 : 0) - (model.footnote ? 6 : 0);

        const nextPage = () => {
            doc.addPage();
            let ny = PDF.MT;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
            doc.text(model.title, PDF.ML, ny + 4);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text(model.continueTitle, PDF.ML + CW, ny + 4, { align: 'right' });
            ny += 9;
            return drawHeadRows(doc, model, ny, CW);
        };

        // Der amtliche Vordruck ist EIN Blatt pro Woche. Feste Millimeter-
        // Hoehen erfuellen das nur zufaellig: sobald der Kopf eine Zeile mehr
        // hat, rutscht der letzte Block auf Seite 2 und darunter bleibt eine
        // halbe leere Seite. Deshalb wird der verfuegbare Platz verteilt —
        // im Verhaeltnis der Sollhoehen, und nur was wirklich nicht passt,
        // laeuft ueber.
        allocateBlocks(doc, model, y, CW, contentBottom);

        model.sections.forEach((sec, i) => {
            if (sec.kind === 'text') {
                y = drawTextBlock(doc, model, sec, y, CW, contentBottom, nextPage);
            } else {
                y = drawDayTable(doc, model, sec, y, CW, contentBottom, nextPage);
            }
            if (i < model.sections.length - 1) y += SECTION_GAP;
        });

        // Fussnote / Bestaetigung / Unterschriften immer unten auf der letzten Seite
        let fy = Math.max(y + 4, BOTTOM - sigH - (model.confirmLine ? 9 : 0) - (model.footnote ? 7 : 0));
        if (model.footnote) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
            doc.text(model.footnote, PDF.ML, fy);
            fy += 7;
        }
        if (model.confirmLine) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const cl = doc.splitTextToSize(model.confirmLine, CW);
            cl.forEach((ln, i) => doc.text(ln, PDF.ML, fy + i * 4));
            fy += cl.length * 4 + 5;
        }
        drawSignatures(doc, model, Math.max(fy, BOTTOM - sigH), CW);
    }

    const SECTION_GAP = 3;
    const SUM_ROW_H = 8;        // Hoehe der Summenzeile im Tagesvordruck
    const BLOCK_FLOOR = 16;     // kleiner darf ein Kasten nicht werden

    // Bricht den Text eines Blocks auf die Kastenbreite um. Einzige Stelle
    // dafuer — Messung und Zeichnung duerfen nicht auseinanderlaufen.
    function wrapBlock(doc, model, sec, CW) {
        const hw = model.hoursCol ? PDF.HOURS_W : 0;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const out = [];
        sec.lines.forEach(l => {
            if (!l) { out.push(''); return; }
            doc.splitTextToSize(l, CW - hw - 5).forEach(w => out.push(w));
        });
        return out;
    }

    // Verteilt die Resthoehe der Seite auf die Textbloecke. Wer mehr Text hat
    // als sein Anteil, bekommt was er braucht; der Rest wird unter den
    // uebrigen im Verhaeltnis ihrer Sollhoehen aufgeteilt.
    function allocateBlocks(doc, model, y, CW, contentBottom) {
        // Tagesvordruck: die sechs Zeilen teilen sich das Blatt. Feste 20 mm
        // liessen unten ein Drittel frei — der gedruckte Bogen hat dort
        // Schreibraum, kein Loch.
        const tage = model.sections.find(s => s.kind === 'days');
        if (tage) {
            const headH = (tage.cols && tage.cols.length) ? 10 : 9;
            // 1 mm Luft, sonst schiebt der Rundungsrest die Summenzeile
            // auf ein zweites Blatt.
            const pool = contentBottom - y - headH - (tage.sumRow ? SUM_ROW_H : 0) - 1;
            if (pool > 0 && tage.rows.length) {
                tage.rowAlloc = Math.max(tage.rowH, pool / tage.rows.length);
            }
        }

        const blocks = model.sections.filter(s => s.kind === 'text');
        if (!blocks.length) return;

        const pool = contentBottom - y
            - blocks.length * PDF.BAR_H
            - (model.sections.length - 1) * SECTION_GAP;
        const sumMin = blocks.reduce((s, b) => s + b.minH, 0);
        if (pool <= 0 || !sumMin) return;

        const need = blocks.map(b => wrapBlock(doc, model, b, CW).length * PDF.LH + 5);
        const share = blocks.map(b => pool * (b.minH / sumMin));

        // Bloecke, deren Text ueber den Anteil hinausgeht, zuerst bedienen.
        let restPool = pool, restWeight = 0;
        blocks.forEach((b, i) => {
            if (need[i] > share[i]) restPool -= need[i]; else restWeight += b.minH;
        });
        blocks.forEach((b, i) => {
            if (need[i] > share[i]) {
                b.alloc = need[i];
            } else {
                const w = restWeight ? (b.minH / restWeight) : 0;
                b.alloc = Math.max(BLOCK_FLOOR, restPool * w);
            }
        });
    }

    function drawTitleAndHead(doc, model, y, CW) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        doc.text(model.title, PDF.ML, y + 5);
        y += 9;
        if (model.subtitle) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
            doc.text(model.subtitle, PDF.ML, y + 3);
            y += 6;
        }
        return drawHeadRows(doc, model, y, CW);
    }

    function drawHeadRows(doc, model, y, CW) {
        doc.setLineWidth(0.2);
        model.kopfRows.forEach(row => {
            let x = PDF.ML;
            const h = row.some(c => c.capBelow) ? PDF.HEAD_H + 3 : PDF.HEAD_H;
            row.forEach(c => {
                const w = CW * c.w;
                doc.rect(x, y, w, h, 'S');
                if (c.capBelow) {
                    // Muenchner Streifen: Wert oben gross, Beschriftung darunter klein
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
                    doc.text(fit(doc, c.value, w - 4), x + 2, y + 6);
                    doc.setFontSize(6.8);
                    doc.text(fit(doc, c.label, w - 4), x + 2, y + h - 2.2);
                } else {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
                    doc.text(c.label, x + 2, y + 3.6);
                    doc.setFontSize(9.5);
                    doc.text(fit(doc, c.value, w - 4), x + 2, y + 8.8);
                }
                x += w;
            });
            y += h;
        });
        return y + 4;
    }

    // Kuerzt einen Wert so, dass er in die Zelle passt — lieber Auslassungs-
    // zeichen als Text, der ueber den Kastenrand hinauslaeuft.
    function fit(doc, text, maxW) {
        let s = String(text || '');
        if (!s) return '';
        if (doc.getTextWidth(s) <= maxW) return s;
        while (s.length > 1 && doc.getTextWidth(s + '…') > maxW) s = s.slice(0, -1);
        return s + '…';
    }

    function blockHeadBar(doc, model, title, y, CW) {
        doc.setFillColor(238, 238, 238);
        doc.rect(PDF.ML, y, CW, PDF.BAR_H, 'FD');
        const hw = model.hoursCol ? PDF.HOURS_W : 0;
        if (hw) {
            doc.line(PDF.ML + CW - hw, y, PDF.ML + CW - hw, y + PDF.BAR_H);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text(model.hoursHead, PDF.ML + CW - hw / 2, y + 4.8, { align: 'center' });
        }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
        const t = doc.splitTextToSize(title, CW - hw - 4);
        doc.text(t[0], PDF.ML + 2, y + (t.length > 1 ? 3.4 : 4.8));
        if (t.length > 1) {
            doc.setFontSize(7.2);
            doc.text(t.slice(1).join(' '), PDF.ML + 2, y + 6.2);
        }
        return y + PDF.BAR_H;
    }

    function drawTextBlock(doc, model, sec, y, CW, contentBottom, nextPage) {
        const hw = model.hoursCol ? PDF.HOURS_W : 0;
        const lines = wrapBlock(doc, model, sec, CW);

        // Der Block laeuft ueber Seiten weiter, statt Zeilen abzuschneiden.
        // Ein Bericht, dem im PDF still das Ende fehlt, waere schlimmer als
        // ein zweites Blatt.
        let rest = lines.slice();
        let first = true;
        while (true) {
            let avail = contentBottom - y - PDF.BAR_H;
            if (avail < 24) { y = nextPage(); avail = contentBottom - y - PDF.BAR_H; }

            const soll = first ? (sec.alloc || sec.minH) : 20;
            const wanted = Math.max(soll, rest.length * PDF.LH + 5);
            const boxH = Math.min(wanted, avail);
            const capacity = Math.max(1, Math.floor((boxH - 5) / PDF.LH));
            const chunk = rest.slice(0, capacity);
            rest = rest.slice(capacity);

            doc.setLineWidth(0.2);
            y = blockHeadBar(doc, model, first ? sec.title : sec.title + ' (Fortsetzung)', y, CW);
            doc.rect(PDF.ML, y, CW, boxH, 'S');
            if (hw) doc.line(PDF.ML + CW - hw, y, PDF.ML + CW - hw, y + boxH);

            doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            chunk.forEach((ln, i) => doc.text(ln, PDF.ML + 2.5, y + 4.6 + i * PDF.LH));
            if (first && hw && sec.hours) {
                doc.text(String(sec.hours), PDF.ML + CW - hw / 2, y + 5.5, { align: 'center' });
            }
            y += boxH;
            first = false;
            if (!rest.length) break;
            y = nextPage();
        }
        return y;
    }

    function drawDayTable(doc, model, sec, y, CW, contentBottom, nextPage) {
        const extra = sec.cols || [];
        const extraW = extra.reduce((s, c) => s + c.w, 0);
        const hw = model.hoursCol ? PDF.HOURS_W : 0;
        const mainW = CW - PDF.DAY_W - hw - extraW;

        // Spaltenkopf. Wird auf jeder Folgeseite wiederholt — ohne ihn stuenden
        // dort nackte Kaesten ohne Angabe, was in welcher Spalte steht.
        const headH = extra.length ? 10 : 9;
        const drawColHead = (hy) => {
            doc.setLineWidth(0.2);
            doc.setFillColor(238, 238, 238);
            doc.rect(PDF.ML, hy, CW, headH, 'FD');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6);
            doc.splitTextToSize(sec.head, mainW - 3).slice(0, 3)
               .forEach((ln, i) => doc.text(ln, PDF.ML + PDF.DAY_W + 1.5, hy + 3.4 + i * 3.1));
            let cx = PDF.ML + PDF.DAY_W;
            doc.line(cx, hy, cx, hy + headH);
            cx += mainW;
            if (hw) {
                doc.line(cx, hy, cx, hy + headH);
                doc.setFontSize(7.6);
                doc.text(model.hoursHead, cx + hw / 2, hy + headH / 2 + 1, { align: 'center' });
                cx += hw;
            }
            extra.forEach(c => {
                doc.line(cx, hy, cx, hy + headH);
                doc.setFontSize(6.6);
                c.head.split('\n').forEach((ln, i) => doc.text(ln, cx + c.w / 2, hy + 3.6 + i * 3, { align: 'center' }));
                cx += c.w;
            });
            return hy + headH;
        };
        const breakPage = () => drawColHead(nextPage());
        y = drawColHead(y);

        // Zeichnet EINEN Kasten und gibt die Zeilen zurueck, die nicht
        // hineingepasst haben — so laeuft ein langer Tag auf dem naechsten
        // Blatt weiter, statt abgeschnitten zu werden.
        const drawRow = (label, txt, hours, isSum, row) => {
            const avail = contentBottom - y;
            const wanted = isSum ? SUM_ROW_H : Math.max(sec.rowAlloc || sec.rowH, txt.length * PDF.LH + 3);
            const h = Math.min(wanted, avail);
            const capacity = Math.max(1, Math.floor((h - 3) / PDF.LH));
            const chunk = isSum ? [] : txt.slice(0, capacity);

            doc.setLineWidth(0.2);
            doc.rect(PDF.ML, y, CW, h, 'S');
            let x = PDF.ML + PDF.DAY_W;
            doc.line(x, y, x, y + h);
            x += mainW;
            if (hw) { doc.line(x, y, x, y + h); x += hw; }
            extra.forEach(c => { doc.line(x, y, x, y + h); x += c.w; });

            doc.setFont('helvetica', 'bold'); doc.setFontSize(8.6);
            if (label) doc.text(label, PDF.ML + 1.8, y + 5);
            if (isSum) {
                doc.text(sec.sumRow, PDF.ML + PDF.DAY_W + 1.8, y + 5.2);
            }
            doc.setFont('helvetica', 'normal');
            chunk.forEach((ln, i) => doc.text(ln, PDF.ML + PDF.DAY_W + 1.8, y + 4.6 + i * PDF.LH));
            if (hw && hours) doc.text(String(hours), PDF.ML + PDF.DAY_W + mainW + hw / 2, y + 5, { align: 'center' });
            // Zusatzspalten (ARP-Variante). Ohne diese Schleife stuenden die
            // Einzelstunden in der Vorschau, aber nicht auf dem Papier.
            if (!isSum && row) {
                let ex = PDF.ML + PDF.DAY_W + mainW + hw;
                extra.forEach(c => {
                    const v = row[c.key];
                    if (v) doc.text(String(v), ex + c.w / 2, y + 5, { align: 'center' });
                    ex += c.w;
                });
            }
            if (isSum && extra.length >= 2 && sec.sumValue) {
                // Die Summe gehoert in die Spalte "Gesamtstunden"
                let sx = PDF.ML + PDF.DAY_W + mainW + hw;
                extra.forEach((c, i) => {
                    if (i === extra.length - 2) {
                        doc.setFont('helvetica', 'bold');
                        doc.text(String(sec.sumValue), sx + c.w / 2, y + 5.2, { align: 'center' });
                        doc.setFont('helvetica', 'normal');
                    }
                    sx += c.w;
                });
            }
            y += h;
            return isSum ? [] : txt.slice(capacity);
        };

        sec.rows.forEach(r => {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6);
            let txt = [];
            r.lines.forEach(l => {
                if (!l) { txt.push(''); return; }
                doc.splitTextToSize(l, mainW - 3).forEach(w => txt.push(w));
            });
            let label = r.label;
            while (true) {
                if (contentBottom - y < 12) y = breakPage();
                // Stunden und Zusatzspalten nur im ersten Kasten des Tages —
                // auf der Fortsetzung stuenden sie sonst ein zweites Mal.
                txt = drawRow(label, txt, label === r.label ? r.hours : '', false, label === r.label ? r : null);
                if (!txt.length) break;
                label = '';           // Fortsetzung traegt den Tagesnamen nicht erneut
                y = breakPage();
            }
        });
        if (sec.sumRow) {
            if (contentBottom - y < SUM_ROW_H) y = breakPage();
            drawRow('', [], '', true, null);
        }
        return y;
    }

    function sigBlockHeight(model) {
        if (model.sigStyle === 'dated') return 26;
        return Math.ceil(model.signatures.length / 2) * 17;
    }

    function drawSignatures(doc, model, y, CW) {
        doc.setLineWidth(0.3);
        doc.setFont('helvetica', 'normal');
        if (model.sigStyle === 'dated') {
            const n = model.signatures.length;
            const w = CW / n;
            model.signatures.forEach((s, i) => {
                const x = PDF.ML + i * w;
                doc.setFontSize(8);
                doc.text('Datum:', x, y + 4);
                doc.line(x, y + 16, x + w - 6, y + 16);
                doc.setFontSize(7.5);
                doc.text(s, x, y + 20);
            });
        } else {
            const w = CW / 2;
            model.signatures.forEach((s, i) => {
                const x = PDF.ML + (i % 2) * w;
                const ry = y + Math.floor(i / 2) * 17;
                doc.line(x, ry + 10, x + w - 8, ry + 10);
                doc.setFontSize(7.5);
                doc.text(s, x, ry + 13.6);
            });
        }
    }

    function drawCover(doc, model, PW, CW) {
        let y = PDF.MT + 6;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
        doc.text(model.cover.title, PDF.ML, y);
        y += 4;
        doc.setLineWidth(0.4);
        doc.line(PDF.ML, y, PDF.ML + CW, y);
        y += 12;

        doc.setLineWidth(0.2);
        model.cover.fields.forEach(([label, value]) => {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            doc.text(label, PDF.ML, y);
            doc.rect(PDF.ML + 58, y - 5, CW - 58, 8, 'S');
            doc.setFontSize(9.5);
            doc.text(fit(doc, value, CW - 62), PDF.ML + 60, y);
            y += 12;
        });

        y += 6;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text('Hinweise:', PDF.ML, y);
        y += 5;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        COVER_HINTS.forEach((t, i) => {
            const lines = doc.splitTextToSize((i + 1) + '. ' + t, CW);
            lines.forEach(ln => { doc.text(ln, PDF.ML, y); y += 3.9; });
            y += 1.6;
        });
    }

    // Woertlich aus dem DIHK-Vordruck (Anlage 2a/3a, Deckblatt).
    const COVER_HINTS = [
        'Der ordnungsgemäß geführte Ausbildungsnachweis ist Zulassungsvoraussetzung zur Abschlussprüfung gemäß § 43 Abs. 1 Nr. 2 BBiG.',
        'Der Ausbildungsnachweis ist von dem Auszubildenden mindestens wöchentlich zu führen. Jedes Blatt ist mit dem Namen des/der Auszubildenden, dem Ausbildungsjahr und dem Berichtszeitraum zu versehen.',
        'Der Ausbildungsnachweis muss mindestens stichwortartig den Inhalt der betrieblichen Ausbildung wiedergeben. Dabei sind betriebliche Tätigkeiten einerseits sowie Unterweisungen, betrieblicher Unterricht und sonstige Schulungen andererseits zu dokumentieren. Darüber hinaus müssen die Themen des Berufsschulunterrichts aufgenommen werden.',
        'Ausbildende oder Ausbilder/innen müssen die Eintragungen im Ausbildungsnachweis mindestens monatlich (§ 14 Abs. 1 Nr. 4 BBiG) prüfen und die Richtigkeit und Vollständigkeit der Eintragungen mit Datum und Unterschrift bestätigen.',
        'Bei Bedarf können weitere an der Ausbildung Beteiligte, z. B. die Berufsschule, vom Ausbildungsnachweis Kenntnis nehmen und dies unterschriftlich bestätigen.'
    ];

    // ── Export ins globale Fenster (Projekt-Idiom: keine Module) ─────────────
    window.IHK_FORMS = IHK_FORMS;
    window.IHK_KAMMERN = IHK_KAMMERN;
    window.getIhkKammer = getKammer;
    window.ihkFormLabel = ihkFormLabel;
    window.ihkFormHint = ihkFormHint;
    window.ihkIsEnglish = isEnglish;
    window.buildIhkFormModel = buildIhkFormModel;
    window.ihkFormToHtml = ihkFormToHtml;
    window.ihkFormToPdf = ihkFormToPdf;
})();
