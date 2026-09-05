// ═══ BH-B2B-UI ═══
// Die Karte "Betrieb & IHK" auf der Berichtsheft-Seite und ihre Verdrahtung
// mit dem lokalen Berichtsbestand.
//
// Sprache laeuft wie in bh-freigabe.js ueber b2bL(de, en) — die Karte wird
// komplett in JS gebaut, die i18n-Pipeline fasst sie nicht an. Auf /en/ steht
// document.documentElement.lang === 'en', dann greift der englische Zweig.
//
// Die eigentliche Server-Logik liegt in bh-b2b.js (window.BHB2B). Diese Datei
// rendert nur und ruft dort an.

(function () {
    'use strict';

    function b2bL(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    const STATUS_KEY = 'bh_b2b_status';   // letzter bekannter Stand, gegen Fehlalarm bei Funkloch
    const ZU_KEY = 'bh_b2b_zu';           // Nutzer hat die Nicht-Mitglied-Karte ausgeblendet

    function istZu() { try { return localStorage.getItem(ZU_KEY) === '1'; } catch (e) { return false; } }
    function setZu(v) {
        try { v ? localStorage.setItem(ZU_KEY, '1') : localStorage.removeItem(ZU_KEY); } catch (e) { /* Privatmodus */ }
    }

    // Nur in dieser Sitzung: hat der Nutzer den Teaser aufgeklappt?
    let expandiert = false;
    // Zuletzt bekannter Nicht-Mitglied-Typ (true = nicht angemeldet).
    let nmAnon = true;

    function statusMerken(s) {
        try {
            if (s) localStorage.setItem(STATUS_KEY, JSON.stringify(Object.assign({ at: Date.now() }, s)));
            else localStorage.removeItem(STATUS_KEY);
        } catch (e) { /* Privatmodus */ }
    }
    function statusErinnerung() {
        try { return JSON.parse(localStorage.getItem(STATUS_KEY) || 'null'); }
        catch (e) { return null; }
    }

    function el() { return document.getElementById('b2bCard'); }

    function esc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s); }

    function toast(msg, art) {
        if (typeof showToast === 'function') showToast(msg, art || 'info');
    }

    // ── Rendern ──────────────────────────────────────────────────────

    // Der Schliess-Knopf sitzt in JEDER Nicht-Mitglied-Ansicht: eine
    // Feature-Werbung auf einem Werkzeug, das ohne Konto laeuft, darf man
    // wegklicken koennen. Mitglieder sehen keinen — dort ist es Status.
    const X_BTN =
        '<button type="button" class="b2b-x" onclick="b2bZu()" aria-label="' +
        b2bL('Ausblenden', 'Hide') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';

    function schale(pillOn, pillText, inner, mitX) {
        return '' +
            '<div class="b2b-head">' +
            '<svg class="icon"><use href="#i-tie"/></svg>' +
            '<span class="b2b-title">' + b2bL('Betrieb &amp; IHK', 'Company &amp; chamber') + '</span>' +
            '<span class="b2b-pill ' + (pillOn ? 'is-on' : 'is-off') + '">' + esc(pillText) + '</span>' +
            (mitX ? X_BTN : '') +
            '</div>' + inner;
    }

    // Dismissed → nur noch eine Haarlinie, immer noch anklickbar.
    function zeigeMini() {
        el().className = 'is-mini';
        el().innerHTML =
            '<button type="button" class="b2b-mini-btn" onclick="b2bWieder()">' +
            '<svg class="icon"><use href="#i-tie"/></svg>' +
            '<span>' + b2bL('Berichtsheft mit einem Ausbildungsbetrieb verbinden',
                'Connect this training record to a company') + '</span>' +
            '</button>';
        el().hidden = false;
    }

    // Standard fuer Nicht-Mitglieder: eine kompakte Zeile, kein Kasten.
    function zeigeTeaser() {
        el().className = 'is-teaser';
        el().innerHTML =
            '<button type="button" class="b2b-teaser" onclick="b2bAufklappen()">' +
            '<svg class="icon"><use href="#i-tie"/></svg>' +
            '<span>' + b2bL('Mit dem Ausbildungsbetrieb verbinden', 'Connect to your training company') + '</span>' +
            '<svg class="b2b-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>' +
            '</button>' + X_BTN;
        el().hidden = false;
    }

    function zeigeAnon() {
        el().className = 'b2b-panel is-open';
        el().innerHTML = schale(false, b2bL('Nicht verbunden', 'Not connected'),
            '<div class="b2b-body">' +
            b2bL(
                'Diese Verbindung braucht ein MyWorkLog-Konto. Danach gibst du hier den Einladungscode deines Betriebs ein — oder legst als Ausbilder selbst einen Betrieb an.',
                'This connection needs a MyWorkLog account. After that you enter your company’s invite code here — or, as a trainer, create a company yourself.'
            ) +
            '<span class="b2b-muted">' + b2bL(
                'Ohne Konto bleibt alles wie bisher — der Link- und QR-Weg zum Ausbilder funktioniert weiter.',
                'Without an account nothing changes — the link and QR route to your trainer still works.'
            ) + '</span>' +
            '<div class="b2b-actions" style="margin-top:12px;">' +
            '<a class="btn btn-secondary" href="/?cloud=login">' +
            '<svg class="icon"><use href="#i-refresh"/></svg><span>' +
            b2bL('In MyWorkLog anmelden', 'Sign in to MyWorkLog') + '</span></a>' +
            '</div></div>', true);
        el().hidden = false;
    }

    let segRolle = 'azubi';

    function zeigeFrei() {
        el().className = 'b2b-panel is-open';
        const azubiAktiv = segRolle === 'azubi';
        const form = azubiAktiv
            ? ('<div class="b2b-form" id="b2bForm">' +
                '<input class="form-input" id="b2bCode" autocomplete="off" spellcheck="false" ' +
                'placeholder="' + b2bL('Einladungscode, z. B. ABC-DEF-GHJ', 'Invite code, e.g. ABC-DEF-GHJ') + '">' +
                '<input class="form-input" id="b2bName" autocomplete="name" maxlength="80" ' +
                'placeholder="' + b2bL('Dein Name, wie ihn der Ausbilder sieht', 'Your name as your trainer sees it') + '">' +
                '<div class="b2b-hint">' + b2bL(
                    'Den Einladungscode bekommst du von deinem Ausbilder oder Ausbildungsbetrieb.',
                    'You get the invite code from your trainer or company.') + '</div>' +
                '<div class="b2b-fehler" id="b2bFehler" hidden></div>' +
                '<div class="b2b-actions">' +
                '<button class="btn btn-primary" id="b2bJoinBtn" onclick="b2bBeitreten()">' +
                '<svg class="icon"><use href="#i-check"/></svg><span>' + b2bL('Beitreten', 'Join') + '</span></button>' +
                '</div></div>')
            : ('<div class="b2b-form" id="b2bForm">' +
                '<input class="form-input" id="b2bBetrieb" autocomplete="organization" maxlength="120" ' +
                'placeholder="' + b2bL('Name des Ausbildungsbetriebs', 'Name of the training company') + '">' +
                '<input class="form-input" id="b2bName" autocomplete="name" maxlength="80" ' +
                'placeholder="' + b2bL('Dein Name (Ausbilder)', 'Your name (trainer)') + '">' +
                '<div class="b2b-hint">' + b2bL(
                    'Du wirst der erste Ausbilder. Danach lädst du deine Azubis mit einem Code ein.',
                    'You become the first trainer. Then you invite your apprentices with a code.') + '</div>' +
                '<div class="b2b-fehler" id="b2bFehler" hidden></div>' +
                '<div class="b2b-actions">' +
                '<button class="btn btn-primary" id="b2bFoundBtn" onclick="b2bBetriebAnlegen()">' +
                '<svg class="icon"><use href="#i-plus"/></svg><span>' + b2bL('Betrieb anlegen', 'Create company') + '</span></button>' +
                '</div></div>');

        el().innerHTML = schale(false, b2bL('Nicht verbunden', 'Not connected'),
            '<div class="b2b-body">' +
            b2bL('Verbinde dein Berichtsheft mit deinem Ausbildungsbetrieb.',
                'Connect your training record to your company.') +
            '</div>' +
            '<div class="b2b-seg" role="tablist">' +
            '<button class="' + (azubiAktiv ? 'is-active' : '') + '" onclick="b2bSeg(\'azubi\')">' +
            b2bL('Ich bin Azubi', 'I am an apprentice') + '</button>' +
            '<button class="' + (!azubiAktiv ? 'is-active' : '') + '" onclick="b2bSeg(\'ausbilder\')">' +
            b2bL('Ich bin Ausbilder', 'I am a trainer') + '</button>' +
            '</div>' + form, true);
        el().hidden = false;
    }

    function zeigeAzubi(st, offline) {
        el().className = 'b2b-panel';
        el().innerHTML = schale(true, b2bL('Verbunden', 'Connected'),
            '<div class="b2b-body">' +
            b2bL('Deine Berichte werden mit ', 'Your reports are shared with ') +
            '<strong>' + esc(st.name || b2bL('deinem Betrieb', 'your company')) + '</strong>' +
            b2bL(' geteilt und dort abgezeichnet. Eine abgezeichnete Woche ist hier gesperrt, bis der Ausbilder sie wieder freigibt.',
                ' and signed off there. A signed-off week is locked here until your trainer releases it again.') +
            '<span class="b2b-muted">' + (offline
                ? b2bL('Offline — Stand vom letzten Abgleich.', 'Offline — last synced state.')
                : b2bL('Abgleich läuft bei jedem Öffnen automatisch.', 'Syncs automatically each time you open the page.')) +
            '</span>' +
            '<div class="b2b-actions" style="margin-top:12px;">' +
            '<button class="btn btn-ghost" onclick="b2bVerbindungLoesen()">' +
            b2bL('Verbindung lösen', 'Disconnect') + '</button>' +
            '</div></div>');
        el().hidden = false;
    }

    function datumKurz(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE',
            { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function zeigeAusbilder(st, einladungen, azubiN) {
        const liste = (einladungen || []).map(function (e) {
            const zustand = e.benutzt
                ? b2bL('benutzt', 'used')
                : e.abgelaufen
                    ? b2bL('abgelaufen', 'expired')
                    : b2bL('offen bis ', 'valid until ') + datumKurz(e.laeuftAb);
            return '<div class="b2b-code ' + (e.benutzt || e.abgelaufen ? 'is-used' : '') + '">' +
                '<code>' + esc(e.code) + '</code>' +
                (e.benutzt || e.abgelaufen ? ''
                    : '<button class="b2b-copy" onclick="b2bCodeKopieren(\'' + esc(e.code) + '\')">' +
                      b2bL('Kopieren', 'Copy') + '</button>') +
                '<span class="b2b-code-state">' + esc(zustand) + '</span>' +
                '</div>';
        }).join('');

        el().className = 'b2b-panel';
        el().innerHTML = schale(true, b2bL('Verbunden', 'Connected'),
            '<div class="b2b-body">' +
            '<strong>' + esc(st.name) + '</strong> · ' + b2bL('Ausbilder', 'Trainer') +
            (azubiN != null ? ' · ' + azubiN + ' ' + (azubiN === 1 ? b2bL('Azubi', 'apprentice') : b2bL('Azubis', 'apprentices')) : '') +
            '<span class="b2b-muted">' + b2bL(
                'Die Sammelansicht deiner Azubis und die offenen Freigaben liegen in der Ausbilder-Ansicht.',
                'The overview of your apprentices and the open approvals are in the trainer view.') + '</span>' +
            '</div>' +
            (liste ? '<div class="b2b-codes">' + liste + '</div>' : '') +
            '<div class="b2b-actions" style="margin-top:12px;">' +
            '<a class="btn btn-primary" href="' + b2bL('/ausbilder/', '/en/ausbilder/') + '">' +
            '<svg class="icon"><use href="#i-tie"/></svg><span>' + b2bL('Zur Ausbilder-Ansicht', 'Open trainer view') + '</span></a>' +
            '<button class="btn btn-secondary" id="b2bCodeBtn" onclick="b2bNeuerCode()">' +
            '<svg class="icon"><use href="#i-plus"/></svg><span>' + b2bL('Neuer Einladungscode', 'New invite code') + '</span></button>' +
            '</div>');
        el().hidden = false;
    }

    function fehlerZeigen(msg) {
        const f = document.getElementById('b2bFehler');
        if (f) { f.textContent = msg; f.hidden = false; }
        else toast(msg, 'error');
    }

    // Nicht-Mitglied: welche der drei Ansichten (mini / teaser / offen)?
    function nichtMitglied(anon) {
        nmAnon = anon;
        if (istZu() && !expandiert) { zeigeMini(); return; }
        if (!expandiert) { zeigeTeaser(); return; }
        anon ? zeigeAnon() : zeigeFrei();
    }

    // ── Aktionen ─────────────────────────────────────────────────────

    window.b2bAufklappen = function () { expandiert = true; nmAnon ? zeigeAnon() : zeigeFrei(); };
    window.b2bZu = function () { setZu(true); expandiert = false; zeigeMini(); };
    window.b2bWieder = function () { setZu(false); expandiert = true; nmAnon ? zeigeAnon() : zeigeFrei(); };

    window.b2bSeg = function (rolle) {
        segRolle = rolle;
        zeigeFrei();
    };

    window.b2bBeitreten = async function () {
        const code = (document.getElementById('b2bCode') || {}).value || '';
        const name = (document.getElementById('b2bName') || {}).value || '';
        if (!code.trim()) { fehlerZeigen(b2bL('Bitte den Einladungscode eingeben.', 'Please enter the invite code.')); return; }
        const btn = document.getElementById('b2bJoinBtn');
        if (btn) btn.disabled = true;
        try {
            await BHB2B.einladungEinloesen(code, name);
            toast(b2bL('Mit dem Betrieb verbunden.', 'Connected to the company.'), 'success');
            await aktualisieren(true);
        } catch (e) {
            fehlerZeigen(e && e.message || b2bL('Beitritt fehlgeschlagen.', 'Could not join.'));
            if (btn) btn.disabled = false;
        }
    };

    window.b2bBetriebAnlegen = async function () {
        const bt = (document.getElementById('b2bBetrieb') || {}).value || '';
        const name = (document.getElementById('b2bName') || {}).value || '';
        if (!bt.trim()) { fehlerZeigen(b2bL('Bitte den Namen des Betriebs eingeben.', 'Please enter the company name.')); return; }
        const btn = document.getElementById('b2bFoundBtn');
        if (btn) btn.disabled = true;
        try {
            await BHB2B.betriebGruenden(bt, name);
            toast(b2bL('Betrieb angelegt.', 'Company created.'), 'success');
            await aktualisieren(true);
        } catch (e) {
            fehlerZeigen(e && e.message || b2bL('Anlegen fehlgeschlagen.', 'Could not create.'));
            if (btn) btn.disabled = false;
        }
    };

    window.b2bNeuerCode = async function () {
        const btn = document.getElementById('b2bCodeBtn');
        if (btn) btn.disabled = true;
        try {
            const code = await BHB2B.einladungErstellen(14);
            try { await navigator.clipboard.writeText(code); } catch (e) { /* ok */ }
            toast(b2bL('Neuer Code: ', 'New code: ') + code + b2bL(' (kopiert)', ' (copied)'), 'success');
            await aktualisieren(true);
        } catch (e) {
            toast(e && e.message || b2bL('Code konnte nicht erstellt werden.', 'Could not create a code.'), 'error');
            if (btn) btn.disabled = false;
        }
    };

    window.b2bCodeKopieren = async function (code) {
        try {
            await navigator.clipboard.writeText(code);
            toast(b2bL('Code kopiert', 'Code copied'), 'success');
        } catch (e) {
            toast(b2bL('Bitte von Hand kopieren: ', 'Please copy manually: ') + code, 'info');
        }
    };

    window.b2bVerbindungLoesen = async function () {
        if (!confirm(b2bL(
            'Verbindung zum Betrieb lösen? Deine Berichte bleiben hier erhalten. Bereits abgezeichnete Wochen behalten ihre Bestätigung.',
            'Disconnect from the company? Your reports stay here. Weeks already signed off keep their approval.'))) return;
        try {
            await BHB2B.austreten();
            toast(b2bL('Verbindung gelöst.', 'Disconnected.'), 'info');
            await aktualisieren(true);
        } catch (e) {
            toast(e && e.message || b2bL('Konnte nicht gelöst werden.', 'Could not disconnect.'), 'error');
        }
    };

    // ── Abgleich Berichte <-> Server ─────────────────────────────────

    // Serverseitige Freigaben in den lokalen Bestand ziehen. Der Server
    // gewinnt: nur Berichte anfassen, zu denen es wirklich eine Freigabe
    // gibt — eine lokale Link-Freigabe ohne Server-Gegenstueck bleibt.
    //
    // Weicht der lokale Inhalt von der Pruefsumme der Freigabe ab (die Woche
    // wurde nach dem Abzeichnen doch noch geaendert — anderes Geraet, Import),
    // wird `approval.stale` gesetzt: die Freigabe bleibt sichtbar, aber der
    // Eintrag wird NICHT gesperrt und nicht auf „signed" gestellt. Der Rest
    // der Seite (bhIsLocked, Badge) liest `stale`.
    async function freigabenEinspielen(map) {
        if (!map || typeof reports === 'undefined' || !Array.isArray(reports)) return 0;
        let n = 0;
        for (const r of reports) {
            const a = map[String(r.id)];
            if (!a) continue;
            if (a.state === 'approved' && a.pruefsumme && BHB2B.berichtVeraendert) {
                try {
                    a.stale = await BHB2B.berichtVeraendert(Object.assign({}, r, { approval: a }));
                } catch (e) { a.stale = false; }
            }
            // Signatur des Ausbilder-Geraets pruefen (falls vorhanden) + TOFU.
            if (a.state === 'approved' && BHB2B.freigabePruefen) {
                try {
                    const p = await BHB2B.freigabePruefen(Object.assign({}, r, { approval: a }));
                    if (p) { a.sigStatus = p.sig; a.sigTrust = p.trust; }
                } catch (e) { /* ohne Pruefung */ }
            }
            const vorher = JSON.stringify(r.approval || null);
            r.approval = a;
            // status spiegeln wie im Link-Weg (bh-freigabe.js). Eine ungueltige
            // Signatur ist der staerkste Manipulationshinweis — dann NICHT sperren.
            if (a.state === 'approved' && !a.stale && a.sigStatus !== 'ungueltig') r.status = 'signed';
            else if (r.status === 'signed') r.status = 'complete';
            if (JSON.stringify(r.approval) !== vorher) n++;
        }
        if (n && typeof saveToStorage === 'function') saveToStorage();
        return n;
    }

    async function berichteHochladen() {
        if (typeof reports === 'undefined' || !Array.isArray(reports) || !reports.length) return;
        try { await BHB2B.berichteHoch(reports); } catch (e) { /* still, Geraet bleibt Wahrheit */ }
    }

    // Von viewReport() gerufen: den Freigabe-Verlauf vom Server in die
    // Detailansicht nachladen. Zeigt nichts, wenn kein Betrieb verbunden ist
    // oder es keine Freigaben gibt.
    window.b2bFuelleFreigabeVerlauf = async function (report) {
        const box = document.getElementById('viewFreigabeVerlauf');
        if (!box || typeof BHB2B === 'undefined' || !BHB2B || !BHB2B.angemeldet() || !BHB2B.freigabeVerlauf) return;
        let d;
        try { d = await BHB2B.freigabeVerlauf(report.id); } catch (e) { return; }
        if (!d || !d.eintraege || !d.eintraege.length) return;

        const zeilen = d.eintraege.map(function (f) {
            const wann = new Date(f.erstellt_at).toLocaleDateString(mwlLocaleSafe(),
                { day: '2-digit', month: '2-digit', year: 'numeric' });
            const was = f.entscheidung === 'approved'
                ? b2bL('bestätigt', 'approved') : b2bL('zurückgegeben', 'sent back');
            const wer = f.ausbilder_name ? ' · ' + esc(f.ausbilder_name) : '';
            const note = f.anmerkung ? ': ' + esc(f.anmerkung) : '';
            return '<li style="margin-bottom:4px;">' + esc(wann) + ' — ' + was + wer + note + '</li>';
        }).join('');

        const p = report.approval && BHB2B.freigabePruefen
            ? await BHB2B.freigabePruefen(report).catch(function () { return null; })
            : null;
        let sigZeile = '';
        if (p && p.sig === 'gueltig') {
            sigZeile = '<p style="margin-top:8px;font-size:0.78rem;color:var(--success);">' +
                b2bL('Signatur des Ausbilder-Geräts gültig.', 'Trainer device signature valid.') +
                (p.trust === 'other-device'
                    ? ' ' + b2bL('(anderes Gerät als beim ersten Mal)', '(different device than the first time)') : '') +
                '</p>';
        } else if (p && p.sig === 'ungueltig') {
            sigZeile = '<p style="margin-top:8px;font-size:0.78rem;color:var(--danger);font-weight:600;">' +
                b2bL('Die Signatur dieser Freigabe stimmt nicht.', 'The signature of this approval does not match.') + '</p>';
        }

        box.innerHTML = '<div style="margin-bottom:2rem;">' +
            '<h3 style="font-size:1rem;margin-bottom:0.75rem;color:var(--primary);display:flex;align-items:center;gap:8px;">' +
            '<svg class="icon" style="width:16px;height:16px"><use href="#i-shield"/></svg> ' +
            b2bL('Freigabe-Verlauf', 'Approval history') + '</h3>' +
            '<div style="background:rgba(255,255,255,0.03);padding:1.25rem 1.5rem;border-radius:var(--radius-sm);border:1px solid var(--border);font-size:0.88rem;line-height:1.6;">' +
            '<ul style="margin:0;padding-left:18px;">' + zeilen + '</ul>' +
            (d.ketteOk
                ? '<p style="margin-top:8px;font-size:0.78rem;color:var(--text-muted);">' +
                  b2bL('Reihenfolge über Prüfsummen verkettet und stimmig.', 'Order is checksum-linked and consistent.') + '</p>'
                : '<p style="margin-top:8px;font-size:0.78rem;color:var(--danger);font-weight:600;">' +
                  b2bL('Die verkettete Reihenfolge stimmt nicht.', 'The linked order does not hold.') + '</p>') +
            sigZeile +
            '</div></div>';
    };

    // Von saveReport() gerufen (bh-bericht.js). Einzelner Bericht, sofort.
    window.b2bOnReportSaved = async function (report) {
        if (typeof BHB2B === 'undefined' || !BHB2B || !BHB2B.angemeldet()) return;
        try {
            const st = await BHB2B.status();
            if (st && st.rolle === 'azubi') await BHB2B.berichtHoch(report);
        } catch (e) { /* egal */ }
    };

    // ── Zustand bestimmen und rendern ───────────────────────────────

    let laeuft = false;

    async function aktualisieren(frisch) {
        if (laeuft) return;
        laeuft = true;
        try {
            if (typeof BHB2B === 'undefined' || !BHB2B || !BHB2B.angemeldet()) {
                statusMerken(null);
                nichtMitglied(true);
                return;
            }

            let st = null, netzfehler = false;
            try { st = await BHB2B.status(frisch); }
            catch (e) { netzfehler = true; }

            if (!st && !netzfehler) {
                // sicher keine Mitgliedschaft — aber nur glauben, wenn wir
                // gerade online sind; sonst koennte es ein stiller Fehler sein
                const erinnerung = statusErinnerung();
                if (erinnerung && navigator.onLine === false) {
                    st = erinnerung; netzfehler = true;
                } else {
                    statusMerken(null);
                    nichtMitglied(false);
                    return;
                }
            }
            if (!st && netzfehler) {
                const erinnerung = statusErinnerung();
                if (!erinnerung) { nichtMitglied(false); return; }
                st = erinnerung;
            }

            statusMerken(st);

            if (st.rolle === 'ausbilder') {
                zeigeAusbilder(st, [], null);
                if (!netzfehler) {
                    const [einl, azubis] = await Promise.all([
                        BHB2B.einladungenListe().catch(function () { return []; }),
                        BHB2B.azubiListe().catch(function () { return []; })
                    ]);
                    zeigeAusbilder(st, einl, azubis.length);
                }
                return;
            }

            // Azubi
            zeigeAzubi(st, netzfehler);
            if (netzfehler) return;
            await berichteHochladen();
            const map = await BHB2B.freigabenRunter();
            const geaendert = await freigabenEinspielen(map);
            if (geaendert) {
                if (typeof loadReports === 'function') loadReports();
                else if (typeof updateUI === 'function') updateUI();
            }
        } finally {
            laeuft = false;
        }
    }

    window.b2bUiInit = function () {
        if (!el()) return;
        aktualisieren(false);
    };

    // Bei Rueckkehr auf den Tab neu abgleichen (der Ausbilder hat evtl.
    // in der Zwischenzeit abgezeichnet).
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && el() && !el().hidden) {
            const st = statusErinnerung();
            if (st && st.rolle === 'azubi') aktualisieren(true);
        }
    });
})();
