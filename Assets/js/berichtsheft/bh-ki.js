// ═══ BH-KI MODULE ═══
//
// Berichtsheft-Wochen, die ein KI-Assistent ueber mcp.myworklog.de vorgeschrieben
// hat (Werkzeug berichtsheft_woche_anlegen). Datenschicht und Krypto teilt die
// Seite mit der App (Assets/js/ki-app-briefkasten.js, Assets/js/ki-krypto.js),
// Supabase-Client ist der EINE der Seite (BHB2B.client).
//
// „Pruefen" fuellt das normale Formular einer NEUEN Woche — gespeichert wird nur
// ueber saveReport(), mit dessen Doppelte-Woche-Pruefung. Erst danach wird der
// Entwurf geloescht (bhKiNachSpeichern, Aufruf in bh-bericht.js). Wer das
// Formular schliesst, behaelt den Entwurf (bhKiAbbrechen).
(function () {
    'use strict';
    if (!window.MWLKiApp || !window.BHB2B) return;
    MWLKiApp.init({ client: () => BHB2B.client() });

    // Wochentag im Werkzeug → data-day im Tagesmodus (bh-tagesmodus.js)
    const TAGE = { montag: 'monday', dienstag: 'tuesday', mittwoch: 'wednesday', donnerstag: 'thursday', freitag: 'friday' };
    let pending = null;

    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Per Code gesetzte Werte feuern kein `input` — Zeichenzaehler und
    // Qualitaetsbalken standen sonst bei „0 Zeichen" (im Screenshot gefunden).
    const melden = el => el.dispatchEvent(new Event('input', { bubbles: true }));
    const setze = (id, wert) => {
        const el = document.getElementById(id);
        if (!el || wert === undefined || wert === null || wert === '') return;
        el.value = wert;
        melden(el);
    };

    function render() {
        const el = document.getElementById('bhKiLeiste');
        if (!el) return;
        const liste = MWLKiApp.status === 'an' ? MWLKiApp.entwuerfe('bericht') : [];
        if (!liste.length) { el.hidden = true; el.innerHTML = ''; return; }
        el.hidden = false;
        el.innerHTML = liste.map(e => {
            const d = e.daten;
            return '<div class="bh-ki-zeile">' +
                '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-sparkles" /></svg>' +
                // In der Leiste stehen nur noch Wochen, die es schon gibt — die
                // neuen hat selbstAnlegen() erledigt.
                '<span class="bh-ki-text">' + L('KW ' + d.kw + '/' + d.jahr + ' gibt es schon — dein KI-Assistent hat eine neue Fassung vorgeschlagen', 'CW ' + d.kw + '/' + d.jahr + ' already exists — your AI assistant suggested a new version') +
                    (d.client ? ' <small>(' + L('laut Client: ', 'client says: ') + esc(d.client) + ')</small>' : '') + '</span>' +
                '<button type="button" class="hf-chip" onclick="bhKiOeffnen(\'' + e.id + '\')">' + L('Prüfen', 'Review') + '</button>' +
                '<button type="button" class="hf-chip" onclick="bhKiVerwerfen(\'' + e.id + '\')">' + L('Verwerfen', 'Discard') + '</button>' +
            '</div>';
        }).join('');
    }

    function bhKiOeffnen(id, still) {
        const e = MWLKiApp.entwuerfe('bericht').find(x => x.id === id);
        if (!e) return;
        const d = e.daten;
        openNewReportModal();
        // wie openWeek() fuer eine neue Woche
        setze('reportWeek', d.kw);
        const { monday, friday } = getWeekDates(d.kw, d.jahr);
        setze('reportDateFrom', monday);
        setze('reportDateTo', friday);
        if (typeof bhAusbildungsjahrVorbelegen === 'function') bhAusbildungsjahrVorbelegen(monday, true);
        const tage = d.tage && Object.keys(d.tage).length ? d.tage : null;
        if (tage) {
            setMode('daily');
            if (typeof renderDailyFields === 'function') renderDailyFields();
            Object.keys(tage).forEach(k => {
                const ta = document.querySelector('.daily-textarea[data-day="' + TAGE[k] + '"]');
                if (ta) { ta.value = tage[k]; melden(ta); }
            });
        } else {
            setMode('weekly');
            setze('reportActivities', d.taetigkeiten);
            setze('reportSchool', d.berufsschule);
        }
        setze('reportDepartment', d.abteilung);
        setze('reportInstruction', d.unterweisungen);
        setze('reportHours', d.stunden);
        pending = id;
        if (!still && typeof showToast === 'function') {
            showToast(L('Entwurf eingefügt — prüfen und speichern', 'Draft filled in — review and save'), 'info');
        }
    }

    async function bhKiVerwerfen(id) {
        const ok = typeof bhConfirm === 'function'
            ? await bhConfirm({ title: L('Entwurf verwerfen?', 'Discard draft?'), text: L('Der Vorschlag des Assistenten wird gelöscht.', 'The assistant\'s suggestion will be deleted.'), confirmText: L('Verwerfen', 'Discard') })
            : true;
        if (!ok) return;
        try { await MWLKiApp.loeschen(id); } catch (e) { /* bleibt liegen, naechster Aufruf zeigt ihn wieder */ }
        render();
    }

    // Aus saveReport(), nur bei einer NEUEN Woche, nach dem Speichern.
    async function bhKiNachSpeichern() {
        const id = pending;
        pending = null;
        if (!id) return;
        if (typeof bhMess === 'function') bhMess('ki_entwurf_uebernommen');
        try { await MWLKiApp.loeschen(id); } catch (e) { /* bleibt liegen */ }
        render();
    }

    function bhKiAbbrechen() { pending = null; }

    // Netz nur, wenn dieses Geraet den Briefkasten schon kennt (Merker der
    // Datenschicht) und eine Sitzung da ist — sonst kein einziger Abruf.
    let letzter = 0;
    async function pruefen() {
        if (!BHB2B.angemeldet() || !(MWLKiApp.gemerkt() || MWLKiApp.gewuenscht())) return;
        if (Date.now() - letzter < 20000) return;
        letzter = Date.now();
        await MWLKiApp.laden(false);
        await selbstAnlegen();
        render();
        pille();
    }

    // Neue Wochen legt die Seite SELBST an (Entscheidung des Nutzers 24.10.:
    // „der Agent macht alles") — ueber das echte Formular und saveReport(),
    // damit Ausbildungsjahr, B2B-Spiegel und Messung genauso laufen wie von
    // Hand. Gibt es die Woche schon, bleibt der Vorschlag in der Leiste: ein
    // vorhandener Bericht wird nie still ueberschrieben.
    function wocheGibtEs(d) {
        return (typeof reports !== 'undefined' ? reports : []).some(r =>
            r.week === d.kw && parseInt(String(r.dateFrom || '').slice(0, 4), 10) === d.jahr);
    }
    async function selbstAnlegen() {
        if (MWLKiApp.status !== 'an' || typeof saveReport !== 'function') return;
        const neu = MWLKiApp.entwuerfe('bericht').filter(e => !wocheGibtEs(e.daten));
        const kw = [];
        for (const e of neu) {
            bhKiOeffnen(e.id, true);
            try { await saveReport({ preventDefault() {} }); kw.push(e.daten.kw); }
            catch (x) { console.warn('[KI-Berichtsheft]', x && x.message); bhKiAbbrechen(); }
        }
        if (!kw.length) return;
        if (typeof showToast === 'function') {
            showToast(L('Dein KI-Assistent hat KW ' + kw.join(', ') + ' angelegt', 'Your AI assistant created CW ' + kw.join(', ')), 'success');
        }
        MWLKiApp.spiegelBerichteAktualisieren().catch(() => {});
    }
    function pille() { MWLKiApp.pille(document.getElementById('kiPilleBh'), 'berichtsheft', () => BHB2B.angemeldet()); }
    pille();
    setTimeout(pruefen, 1500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pruefen(); });

    window.bhKiOeffnen = bhKiOeffnen;
    window.bhKiVerwerfen = bhKiVerwerfen;
    window.bhKiNachSpeichern = bhKiNachSpeichern;
    window.bhKiAbbrechen = bhKiAbbrechen;
})();
