// ═══ BERICHTSHEFT-VORLAGE MODULE ═══
// Leerer IHK-Vordruck als PDF. Modell und Zeichnung kommen aus
// Assets/js/berichtsheft/ihk-formulare.js — dieselbe Quelle wie der PDF-Export der App,
// damit Vorlage und ausgefuelltes Heft nie auseinanderlaufen.
// jsPDF wird erst beim Klick geladen (~360 KB), der Seitenaufbau braucht es nicht.
(function () {
    'use strict';

    const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    const EN = document.documentElement.lang === 'en';
    const L = (de, en) => (EN ? en : de);
    const $ = (id) => document.getElementById(id);

    let formId = 'dihk-w';

    function pad(n) { return String(n).padStart(2, '0'); }
    function datum(d) { return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); }

    // Montag der Woche, in der das gewaehlte Datum liegt. Lokale Datumsteile:
    // new Date('2026-10-28') waere UTC-Mitternacht und kann auf den Vortag rutschen.
    function montag(wert) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert || '');
        if (!m) return null;
        const d = new Date(+m[1], +m[2] - 1, +m[3]);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return d;
    }

    // ctx fuer Blatt i (0-basiert). Ohne Startdatum bleiben Zeitraum und Nr. leer —
    // lieber ein Feld zum Ausfuellen als ein erfundenes Datum.
    function ctxFuer(i) {
        const ctx = { name: $('bvName').value.trim(), jahr: $('bvJahr').value };
        const mo = montag($('bvStart').value);
        if (mo) {
            const von = new Date(mo); von.setDate(von.getDate() + i * 7);
            const bis = new Date(von); bis.setDate(bis.getDate() + 4);
            ctx.von = datum(von);
            ctx.bis = datum(bis);
            ctx.nr = String(i + 1);
        }
        return ctx;
    }

    function hatDeckblatt() {
        return !!(window.IHK_FORMS && IHK_FORMS[formId] && IHK_FORMS[formId].cover);
    }

    function vorschau() {
        $('bvVorschau').innerHTML = ihkFormToHtml(buildIhkFormModel(formId, ctxFuer(0)));
        $('bvDeck').closest('label').hidden = !hatDeckblatt();
    }

    function hinweis() {
        const k = getIhkKammer($('bvKammer').value);
        $('bvHinweis').textContent = ihkFormHint(formId) + '. ' + (k.verified
            ? L('Feldbeschriftungen wörtlich aus dem Vordruck dieser Kammer.',
                'Field labels taken verbatim from this chamber’s official form.')
            : L('Vordruck dieser Kammer nicht einzeln geprüft: Es gilt das DIHK-Muster, das die meisten Kammern unverändert ausgeben.',
                'This chamber’s own form was not checked individually: the DIHK standard applies, which most chambers hand out unchanged.'));
    }

    function vordruckeZeigen() {
        const k = getIhkKammer($('bvKammer').value);
        if (!k.forms.includes(formId)) formId = k.forms[0];
        const box = $('bvVordruck');
        box.innerHTML = '';
        k.forms.forEach((id) => {
            const lab = document.createElement('label');
            const inp = document.createElement('input');
            inp.type = 'radio'; inp.name = 'bvForm'; inp.value = id; inp.checked = id === formId;
            inp.addEventListener('change', () => { formId = id; hinweis(); vorschau(); });
            lab.append(inp, document.createTextNode(ihkFormLabel(id)));
            box.appendChild(lab);
        });
        hinweis();
        vorschau();
    }

    function jspdfLaden() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
        return new Promise((ok, fehler) => {
            const s = document.createElement('script');
            s.src = JSPDF_URL;
            s.onload = () => (window.jspdf ? ok() : fehler(new Error('jspdf')));
            s.onerror = fehler;
            document.head.appendChild(s);
        });
    }

    async function herunterladen() {
        const knopf = $('bvLaden'), status = $('bvStatus');
        knopf.disabled = true;
        status.textContent = L('PDF wird erstellt …', 'Creating PDF …');
        try {
            await jspdfLaden();
            const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
            const n = parseInt($('bvWochen').value, 10) || 1;
            const deck = hatDeckblatt() && $('bvDeck').checked;
            for (let i = 0; i < n; i++) {
                const model = buildIhkFormModel(formId, ctxFuer(i));
                // Deckblatt nur vor dem ersten Blatt; ihkFormToPdf zeichnet es, solange model.cover gesetzt ist.
                if (!deck || i > 0) model.cover = null;
                if (i > 0) doc.addPage();
                ihkFormToPdf(doc, model);
            }
            doc.save('berichtsheft-vorlage-' + formId + '.pdf');
            status.textContent = L('Fertig. Das PDF liegt in deinen Downloads.', 'Done. The PDF is in your downloads.');
            if (typeof mwlEvent === 'function') mwlEvent('berichtsheft_vorlage', {
                aktion: 'pdf', vordruck: formId, blaetter: n, deckblatt: deck,
                mit_name: !!$('bvName').value.trim(), mit_datum: !!$('bvStart').value
            });
        } catch (e) {
            status.textContent = L('Das PDF ließ sich nicht erstellen. Prüf die Internetverbindung und versuch es noch einmal.',
                'The PDF could not be created. Check your connection and try again.');
            if (typeof mwlEvent === 'function') mwlEvent('problem_vorlage', { aktion: 'pdf_fehler' });
        } finally {
            knopf.disabled = false;
        }
    }

    function start() {
        if (typeof buildIhkFormModel !== 'function') return;
        const sel = $('bvKammer');
        IHK_KAMMERN.forEach((k) => {
            const o = document.createElement('option');
            o.value = k.id;
            o.textContent = k.id === 'andere' ? L(k.name, 'Other / not listed') : k.name;
            sel.appendChild(o);
        });
        sel.addEventListener('change', vordruckeZeigen);
        ['bvName', 'bvJahr', 'bvStart'].forEach((id) => $(id).addEventListener('input', vorschau));
        $('bvLaden').addEventListener('click', herunterladen);
        document.querySelectorAll('a[href$="/berichtsheft/"]').forEach((a) => a.addEventListener('click', () => {
            if (typeof mwlEvent === 'function') mwlEvent('berichtsheft_vorlage', { aktion: 'weiter_berichtsheft', ort: a.id || 'link' }, { transport: 'sendBeacon' });
        }));
        vordruckeZeigen();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
