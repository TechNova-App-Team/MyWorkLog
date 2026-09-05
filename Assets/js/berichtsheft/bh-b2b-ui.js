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

    function schale(pillOn, pillText, inner) {
        return '' +
            '<div class="b2b-head">' +
            '<svg class="icon"><use href="#i-tie"/></svg>' +
            '<span class="b2b-title">' + b2bL('Betrieb &amp; IHK', 'Company &amp; chamber') + '</span>' +
            '<span class="b2b-pill ' + (pillOn ? 'is-on' : 'is-off') + '">' + esc(pillText) + '</span>' +
            '</div>' + inner;
    }

    function zeigeAnon() {
        el().innerHTML = schale(false, b2bL('Nicht verbunden', 'Not connected'),
            '<div class="b2b-body">' +
            b2bL(
                'Melde dich in MyWorkLog an, um dein Berichtsheft mit deinem Ausbildungsbetrieb zu teilen. Dein Ausbilder zeichnet die Wochen dann direkt ab.',
                'Sign in to MyWorkLog to share your training record with your company. Your trainer then signs off the weeks directly.'
            ) +
            '<span class="b2b-muted">' + b2bL(
                'Ohne Konto bleibt alles wie bisher — der Link- und QR-Weg zum Ausbilder funktioniert weiter.',
                'Without an account nothing changes — the link and QR route to your trainer still works.'
            ) + '</span>' +
            '<div class="b2b-actions" style="margin-top:12px;">' +
            '<a class="btn btn-secondary" href="/">' +
            '<svg class="icon"><use href="#i-refresh"/></svg><span>' +
            b2bL('In MyWorkLog anmelden', 'Sign in to MyWorkLog') + '</span></a>' +
            '</div></div>');
        el().hidden = false;
    }

    let segRolle = 'azubi';

    function zeigeFrei() {
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
            '</div>' + form);
        el().hidden = false;
    }

    function zeigeAzubi(st, offline) {
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

    // ── Aktionen ─────────────────────────────────────────────────────

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
    function freigabenEinspielen(map) {
        if (!map || typeof reports === 'undefined' || !Array.isArray(reports)) return 0;
        let n = 0;
        reports.forEach(function (r) {
            const a = map[String(r.id)];
            if (!a) return;
            const vorher = JSON.stringify(r.approval || null);
            r.approval = a;
            // status spiegeln wie im Link-Weg (bh-freigabe.js)
            if (a.state === 'approved') r.status = 'signed';
            else if (r.status === 'signed') r.status = 'complete';
            if (JSON.stringify(r.approval) !== vorher) n++;
        });
        if (n && typeof saveToStorage === 'function') saveToStorage();
        return n;
    }

    async function berichteHochladen() {
        if (typeof reports === 'undefined' || !Array.isArray(reports) || !reports.length) return;
        try { await BHB2B.berichteHoch(reports); } catch (e) { /* still, Geraet bleibt Wahrheit */ }
    }

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
                zeigeAnon();
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
                    zeigeFrei();
                    return;
                }
            }
            if (!st && netzfehler) {
                const erinnerung = statusErinnerung();
                if (!erinnerung) { zeigeFrei(); return; }
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
            const geaendert = freigabenEinspielen(map);
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
