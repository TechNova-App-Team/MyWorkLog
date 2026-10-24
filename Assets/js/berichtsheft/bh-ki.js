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
    async function pruefen(sofort) {
        if (!BHB2B.angemeldet() || !(MWLKiApp.gemerkt() || MWLKiApp.gewuenscht())) return;
        if (!sofort && Date.now() - letzter < 20000) return;
        letzter = Date.now();
        await MWLKiApp.laden(false);
        deckblattUebernehmen();
        await selbstAnlegen();
        await aendernUndLoeschen();
        render();
        pille();
    }

    // ── Aendern / Loeschen vorhandener Wochen (seit 9.3.0) ───────────────
    // Direkt am Bericht, nicht ueber das Formular: das Formular ist fuer
    // NEUE Wochen der Weg (Ausbildungsjahr, Doppelte-Woche-Pruefung). Beim
    // Aendern bleibt alles andere stehen, und die Folgen laufen wie beim
    // Speichern von Hand: saveToStorage, Betriebs-Spiegel (b2bOnReportSaved).
    // 🔴 Sperre wie editReport(): Betriebs-Freigabe nie, lokale Bestaetigung
    // nur mit freigabe_aufheben (der Worker fragt das vorher beim Agenten ab).
    function berichtZurWoche(jahr, kw) {
        return (typeof reports !== 'undefined' ? reports : []).find(r =>
            r.week === kw && MWLKiApp.wochenjahr(r.dateFrom) === jahr) || null;
    }
    const TAG_KEY = { montag: 'monday', dienstag: 'tuesday', mittwoch: 'wednesday', donnerstag: 'thursday', freitag: 'friday' };

    function aendern(d) {
        const r = berichtZurWoche(d.jahr, d.kw), w = 'KW ' + d.kw + '/' + d.jahr;
        if (!r) return { fehler: w + ' gibt es nicht' };
        if (typeof bhIsLocked === 'function' && bhIsLocked(r)) {
            if (r.approval.server) return { fehler: w + ' ist über den Betrieb abgezeichnet — gesperrt' };
            if (!d.freigabe_aufheben) return { fehler: w + ' ist bestätigt — ohne freigabe_aufheben nicht geändert' };
        }
        const f = d.felder || {};
        const neuModus = f.tage ? 'daily' : ('taetigkeiten' in f ? 'weekly' : (r.mode || 'weekly'));
        if ('berufsschule' in f && neuModus === 'daily') return { fehler: w + ': Tagesbericht hat kein Berufsschul-Feld — Schultag als eigenen Tag beschreiben' };
        const vorher = JSON.parse(JSON.stringify(r));
        if (r.approval && d.freigabe_aufheben) { delete r.approval; if (!('status' in f) && r.status === 'signed') r.status = 'complete'; }
        if (f.tage) {
            const tage = Object.assign({}, r.mode === 'daily' ? (r.dailyActivities || {}) : {});
            Object.keys(f.tage).forEach(k => { if (f.tage[k]) tage[TAG_KEY[k]] = f.tage[k]; else delete tage[TAG_KEY[k]]; });
            r.mode = 'daily';
            r.dailyActivities = tage;
            r.activities = typeof combineDailyToWeeklyText === 'function' ? combineDailyToWeeklyText(tage) : Object.values(tage).join('\n\n');
            r.school = '';   // wie saveReport(): im Tagesmodus traegt dailySchool die Angabe
        }
        if ('taetigkeiten' in f) { r.mode = 'weekly'; r.activities = f.taetigkeiten; r.dailyActivities = null; r.dailyHours = null; r.dailySchool = null; }
        if ('berufsschule' in f) r.school = f.berufsschule;
        if ('abteilung' in f) r.department = f.abteilung;
        if ('unterweisungen' in f) r.instruction = f.unterweisungen;
        if ('stunden' in f) r.hours = f.stunden;
        if ('status' in f) r.status = f.status;
        r.updatedAt = new Date().toISOString();
        return { ok: w + ' geändert (' + Object.keys(f).join(', ') + ')', r, vorher };
    }

    async function aendernUndLoeschen() {
        if (MWLKiApp.status !== 'an' || typeof saveToStorage !== 'function') return;
        const auftraege = MWLKiApp.alle.filter(a => !a.fehler && a.daten && (a.daten.art === 'bericht_aendern' || a.daten.art === 'bericht_loeschen'));
        if (!auftraege.length) return;
        const undo = [], getan = [];
        for (const a of auftraege) {
            const d = a.daten, w = 'KW ' + d.kw + '/' + d.jahr;
            if (d.art === 'bericht_aendern') {
                const e = aendern(d);
                if (e.fehler) { MWLKiApp.protokollieren('Berichtsheft', 'NICHT geändert: ' + e.fehler); }
                else {
                    MWLKiApp.protokollieren('Berichtsheft', e.ok);
                    getan.push(w);
                    undo.push(() => { const i = reports.findIndex(x => x.id === e.r.id); if (i >= 0) reports[i] = e.vorher; });
                    if (typeof b2bOnReportSaved === 'function') { try { b2bOnReportSaved(e.r); } catch (x) { /* Spiegel holt es beim naechsten Speichern */ } }
                }
            } else {
                const r = berichtZurWoche(d.jahr, d.kw);
                if (!r) MWLKiApp.protokollieren('Berichtsheft', 'NICHT gelöscht: ' + w + ' gibt es nicht');
                else if (typeof bhIsLocked === 'function' && bhIsLocked(r)) MWLKiApp.protokollieren('Berichtsheft', 'NICHT gelöscht: ' + w + ' ist abgezeichnet');
                else {
                    // Gleicher Weg wie der Papierkorb-Knopf (Papierkorb, Betriebs-Spiegel, eigener Toast mit Rueckgaengig)
                    entferneBericht(r.id);
                    MWLKiApp.protokollieren('Berichtsheft', w + ' in den Papierkorb');
                }
            }
            try { await MWLKiApp.loeschen(a.id); } catch (x) { /* naechstes Mal; Aendern ist idempotent */ }
        }
        if (getan.length) {
            saveToStorage();
            if (typeof updateUI === 'function') updateUI();
            if (typeof showToast === 'function') {
                showToast(L('Dein KI-Assistent hat ' + getan.join(', ') + ' geändert', 'Your AI assistant changed ' + getan.join(', ')), 'success', {
                    label: L('Rückgängig', 'Undo'),
                    onClick: () => { undo.forEach(f => f()); saveToStorage(); if (typeof updateUI === 'function') updateUI(); MWLKiApp.protokollieren('Berichtsheft', 'Nutzer hat Änderung an ' + getan.join(', ') + ' rückgängig gemacht'); spiegelBald(); },
                });
            }
        }
        spiegelBald();
    }

    // Kopie nach JEDEM Speichern im Berichtsheft auffrischen (nur mit
    // Lese-Freigabe, entprellt) — sonst liest der Agent den Stand von gestern.
    let spiegelTimer = null;
    function spiegelBald() {
        if (!MWLKiApp.lesenAn() || !BHB2B.angemeldet()) return;
        clearTimeout(spiegelTimer);
        spiegelTimer = setTimeout(() => { MWLKiApp.spiegelBerichteAktualisieren().catch(() => {}); }, 4000);
    }
    if (typeof window.saveToStorage === 'function' && !window.saveToStorage._kiKopie) {
        const orig = window.saveToStorage;
        window.saveToStorage = function () { const r = orig.apply(this, arguments); spiegelBald(); return r; };
        window.saveToStorage._kiKopie = true;
    }

    // Link aus berichtsheft_freigabe_link: /berichtsheft/#freigabe=2026-43,2026-44
    function freigabeAusAnker() {
        const m = /^#freigabe=([\d,-]+)$/.exec(location.hash);
        if (!m) return;
        history.replaceState(null, '', location.pathname + location.search);
        const ids = m[1].split(',').map(t => { const [j, k] = t.split('-').map(Number); const r = berichtZurWoche(j, k); return r && r.id; }).filter(Boolean);
        if (!ids.length) {
            if (typeof showToast === 'function') showToast(L('Diese Wochen gibt es im Berichtsheft nicht', 'These weeks do not exist in the report book'), 'warning');
            return;
        }
        if (typeof openFreigabeModalFuer === 'function') openFreigabeModalFuer(ids);
    }

    // Deckblatt-Teil wartender Einstellungen gleich hier setzen — wer ueber den
    // PDF-Link direkt ins Berichtsheft kommt, haette sonst ein PDF ohne Betrieb.
    // Den Auftrag selbst loescht erst die App (sie setzt auch den Rest);
    // das Setzen hier ist idempotent, ein zweites Mal schadet nicht.
    function deckblattUebernehmen() {
        const auftraege = MWLKiApp.alle.filter(a => !a.fehler && a.daten && a.daten.art === 'einstellungen');
        if (!auftraege.length) return;
        let cfg = {};
        try { cfg = JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}') || {}; } catch (e) { cfg = {}; }
        const tt = iso => String(iso).split('-').reverse().join('.');
        auftraege.forEach(a => {
            const p = a.daten.patch || {};
            if ('name' in p) cfg.name = p.name;
            if ('beruf' in p) cfg.beruf = p.beruf;
            if ('betrieb' in p) cfg.betrieb = p.betrieb;
            if ('ausbilder' in p) cfg.ausbilder = p.ausbilder;
            if ('ausbildung_beginn' in p) cfg.beginn = tt(p.ausbildung_beginn);
            if ('ausbildung_ende' in p) cfg.ende = tt(p.ausbildung_ende);
        });
        try { localStorage.setItem('pdf_personal_cfg', JSON.stringify(cfg)); } catch (e) { /* Speicher voll */ }
    }

    // Link aus dem Werkzeug berichtsheft_pdf: /berichtsheft/#pdf=JJJJ-KW.
    // Erst wartende Wochen anlegen, dann das PDF genau so erzeugen wie der
    // Knopf im Dialog (openPDFModal → executePDFExport), damit Vorlage, Kammer
    // und Deckblatt aus den gespeicherten Einstellungen kommen.
    async function pdfAusAnker() {
        const m = /^#pdf=(\d{4})-(\d{1,2})$/.exec(location.hash);
        if (!m) return;
        history.replaceState(null, '', location.pathname + location.search);
        const jahr = +m[1], kw = +m[2];
        try { await pruefen(true); } catch (e) { /* ohne Briefkasten weiter */ }
        const r = berichtZurWoche(jahr, kw);
        if (!r) {
            if (typeof showToast === 'function') showToast(L('KW ' + kw + '/' + jahr + ' gibt es im Berichtsheft noch nicht', 'CW ' + kw + '/' + jahr + ' does not exist in the report book yet'), 'warning');
            return;
        }
        openPDFModal(r.id);
        await new Promise(res => setTimeout(res, 300));
        executePDFExport();
        if (typeof closePDFModal === 'function') closePDFModal();
    }

    // Neue Wochen legt die Seite SELBST an (Entscheidung des Nutzers 24.10.:
    // „der Agent macht alles") — ueber das echte Formular und saveReport(),
    // damit Ausbildungsjahr, B2B-Spiegel und Messung genauso laufen wie von
    // Hand. Gibt es die Woche schon, bleibt der Vorschlag in der Leiste: ein
    // vorhandener Bericht wird nie still ueberschrieben.
    function wocheGibtEs(d) { return !!berichtZurWoche(d.jahr, d.kw); }
    async function selbstAnlegen() {
        if (MWLKiApp.status !== 'an' || typeof saveReport !== 'function') return;
        const neu = MWLKiApp.entwuerfe('bericht').filter(e => !wocheGibtEs(e.daten));
        const kw = [];
        for (const e of neu) {
            bhKiOeffnen(e.id, true);
            try { await saveReport({ preventDefault() {} }); kw.push(e.daten.kw); }
            catch (x) { console.warn('[KI-Berichtsheft]', x && x.message); bhKiAbbrechen(); }
        }
        MWLKiApp.entwuerfe('bericht').filter(e => wocheGibtEs(e.daten) && !neu.includes(e))
            .forEach(e => {
                // Der Vorschlag bleibt in der Leiste und kaeme bei jedem Blick wieder — nur einmal vermerken.
                const t = 'KW ' + e.daten.kw + '/' + e.daten.jahr + ' gibt es schon — nicht angelegt; zum Ändern berichtsheft_woche_aendern';
                if (!MWLKiApp.protokoll().some(p => p.text === t)) MWLKiApp.protokollieren('Berichtsheft', t);
            });
        if (!kw.length) return;
        kw.forEach(k => MWLKiApp.protokollieren('Berichtsheft', 'KW ' + k + ' angelegt'));
        if (typeof showToast === 'function') {
            showToast(L('Dein KI-Assistent hat KW ' + kw.join(', ') + ' angelegt', 'Your AI assistant created CW ' + kw.join(', ')), 'success');
        }
        MWLKiApp.spiegelBerichteAktualisieren().catch(() => {});
    }
    function pille() { MWLKiApp.pille(document.getElementById('kiPilleBh'), 'berichtsheft', () => BHB2B.angemeldet()); }
    pille();
    if (/^#pdf=/.test(location.hash)) setTimeout(pdfAusAnker, 800);
    else if (/^#freigabe=/.test(location.hash)) setTimeout(async () => { try { await pruefen(true); } catch (e) { /* weiter */ } freigabeAusAnker(); }, 800);
    else setTimeout(pruefen, 1500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pruefen(); });

    window.bhKiOeffnen = bhKiOeffnen;
    window.bhKiVerwerfen = bhKiVerwerfen;
    window.bhKiNachSpeichern = bhKiNachSpeichern;
    window.bhKiAbbrechen = bhKiAbbrechen;
    // fuer tools/ki-app.test.mjs
    window.__bhki = { aendern, berichtZurWoche };
})();
