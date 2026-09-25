// ═══ SUPPORT PAGE MODULE (/support/) ═══
// Bis v7.5.4 eine Ansicht in der index.html (components/support +
// Teile von components/core/support-feedback.js). Die App gibt es hier
// nicht: kein `data`, kein save(), kein showCustomMessage(). Gelesen wird
// tg_pro_data direkt, geschrieben NIE (Grund im Kopf von
// pages/support/index.html).
(function () {
    'use strict';

    var isEN = document.documentElement.lang === 'en';
    // JS-erzeugte Texte erfasst die statische i18n-Pipeline nicht.
    function L(de, en) { return isEN ? en : de; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function $(id) { return document.getElementById(id); }

    // EmailJS-Kennungen wie bisher in der App (init-app.js / support-feedback.js).
    var EMAILJS_KEY = 'dLaRbQLynU5R8A0ti', EMAILJS_SERVICE = 'service_22m5bcs', EMAILJS_TEMPLATE = 'template_xe5xc1k';
    var LOG_KEY = 'mwl_feedback_log';

    function readData() {
        try {
            var d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
            if (d && typeof d === 'object') {
                d.entries = Array.isArray(d.entries) ? d.entries : [];
                d.settings = d.settings || {};
                return d;
            }
        } catch (e) {}
        return { entries: [], settings: {} };
    }
    function readLog() {
        try { var l = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); return Array.isArray(l) ? l : []; }
        catch (e) { return []; }
    }
    function appendLog(item) {
        try { var l = readLog(); l.push(item); localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(-50))); } catch (e) {}
    }
    function localDay(iso) { var p = String(iso).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

    // ── Serie: aus support-feedback.js uebernommen (dort nur noch fuer diese Seite gebraucht).
    function currentStreak(entries) {
        var dates = Array.from(new Set(entries.filter(function (e) { return e.type === 'work' || e.type === 'school'; })
            .map(function (e) { return e.date; }))).filter(Boolean).sort().reverse();
        if (!dates.length) return 0;
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var last = new Date(today), dow = last.getDay();
        if (dow === 0) last.setDate(last.getDate() - 2);
        else if (dow === 6) last.setDate(last.getDate() - 1);
        else { last.setDate(last.getDate() - 1); if (last.getDay() === 0) last.setDate(last.getDate() - 2); else if (last.getDay() === 6) last.setDate(last.getDate() - 1); }
        var newest = localDay(dates[0]);
        if (newest.getTime() !== today.getTime() && newest < last) return 0;
        var streak = 1;
        for (var i = 0; i < dates.length - 1; i++) {
            var d1 = localDay(dates[i]), d2 = localDay(dates[i + 1]);
            var diff = Math.round((d1 - d2) / 86400000);
            if (diff === 1 || (diff <= 3 && d2.getDay() === 5)) streak++; else break;
        }
        return streak;
    }

    // ── "Dein Stand": Zeilen statt Kacheln, keine Farbe je Zahl — Zustand, keine Wertung.
    function renderMine() {
        var host = $('spMineRows');
        if (!host) return;
        var data = readData(), entries = data.entries;
        if (!entries.length) {
            host.innerHTML = '<p class="sp-mine-empty">' + L(
                'Noch keine Einträge auf diesem Gerät. Sobald du den ersten Tag erfasst, steht hier dein Stand.',
                'No entries on this device yet. Once you log your first day, your numbers show up here.') + '</p>';
            return;
        }
        var hours = entries.filter(function (e) { return e.type === 'work'; }).reduce(function (s, e) { return s + (parseFloat(e.worked) || 0); }, 0);
        var first = entries.map(function (e) { return e.date; }).filter(Boolean).sort()[0];
        var days = first ? Math.max(0, Math.floor((Date.now() - localDay(first).getTime()) / 86400000)) : 0;
        var streak = currentStreak(entries);
        var nf = new Intl.NumberFormat(isEN ? 'en-GB' : 'de-DE');
        var rows = [
            [L('Einträge', 'Entries'), nf.format(entries.length)],
            [L('Stunden gearbeitet', 'Hours worked'), nf.format(Math.round(hours)) + ' h'],
            [L('Tage seit dem ersten Eintrag', 'Days since first entry'), nf.format(days)],
            [L('Aktuelle Serie', 'Current streak'), nf.format(streak) + ' ' + (streak === 1 ? L('Tag', 'day') : L('Tage', 'days'))]
        ];
        host.innerHTML = rows.map(function (r) {
            return '<div class="sp-mine-row"><span class="sp-mine-key">' + r[0] + '</span><span class="sp-mine-val">' + r[1] + '</span></div>';
        }).join('');
    }

    // ═══ FORMULAR ═══
    var state = { kind: 'feedback', rating: 0, mode: 'minimal' };
    var KIND_PREFIX = { feedback: '', idea: 'IDEE: ', bug: 'FEHLER: ' };
    var PLACEHOLDER = {
        feedback: ['Was fehlt dir, was stört dich, was gefällt dir?', 'What are you missing, what bothers you, what do you like?'],
        idea: ['Was wünschst du dir in MyWorkLog?', 'What would you like to see in MyWorkLog?'],
        bug: ['Was ist passiert, und was hast du davor gemacht?', 'What happened, and what did you do right before?']
    };

    function pressGroup(selector, attr, value) {
        document.querySelectorAll(selector).forEach(function (b) {
            var on = b.getAttribute(attr) === String(value);
            b.classList.toggle(selector === '.sp-rate-btn' ? 'is-picked' : 'is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }
    function setKind(kind) {
        state.kind = kind;
        pressGroup('[data-kind]', 'data-kind', kind);
        var p = PLACEHOLDER[kind] || PLACEHOLDER.feedback;
        $('spText').setAttribute('placeholder', L(p[0], p[1]));
    }
    function setRating(n) {
        state.rating = (state.rating === n) ? 0 : n;   // zweiter Klick nimmt die Wahl zurueck
        pressGroup('.sp-rate-btn', 'data-rate', state.rating);
        if (navigator.vibrate) navigator.vibrate(20);
    }
    function setMode(mode) {
        state.mode = mode;
        pressGroup('[data-mode]', 'data-mode', mode);
        $('spModeInfo').textContent = mode === 'minimal'
            ? L('Nur Nachricht, Bewertung, Zeitpunkt und dein Name werden gesendet. Keine Gerätedaten, keine Statistiken.',
                'Only your message, rating, time and name are sent. No device data, no statistics.')
            : L('Zusätzlich Nutzungsstatistiken, App-Einstellungen und Gerätedaten. Nie einzelne Einträge, Notizen oder das Schatten-Berichtsheft.',
                'Additionally usage statistics, app settings and device data. Never individual entries, notes or the shadow report book.');
    }

    // Feldnamen = Variablen der EmailJS-Vorlage (template_xe5xc1k) — nicht umbenennen.
    function gatherAppStats(data) {
        var entries = data.entries, s = data.settings, now = new Date(), year = String(now.getFullYear());
        var by = function (t) { return entries.filter(function (e) { return e.type === t; }); };
        var sum = function (list, f) { return list.reduce(function (a, e) { return a + (parseFloat(e[f]) || 0); }, 0); };
        var yearEntries = entries.filter(function (e) { return e.date && String(e.date).indexOf(year) === 0; });
        var active = entries.filter(function (e) { return e.type === 'work' || e.type === 'school'; });
        var dates = entries.map(function (e) { return e.date; }).filter(Boolean).sort();
        var firstEntry = dates[0] || '—', lastEntry = dates[dates.length - 1] || '—';
        var totalDiff = sum(entries, 'diff'), yearDiff = sum(yearEntries, 'diff');
        var wdH = [0, 0, 0, 0, 0, 0, 0];
        active.forEach(function (e) { if (e.date) wdH[localDay(e.date).getDay()] += parseFloat(e.worked) || 0; });
        var best = 1; for (var i = 0; i < 7; i++) if (wdH[i] > wdH[best]) best = i;
        var dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        var vac = s.vacation || {};
        var vacTotal = vac.total || 30, vacUsed = vac.used || 0;
        var fb = (data.feedback || []).length + readLog().length;
        var signed = function (n) { return (n >= 0 ? '+' : '') + n.toFixed(1); };
        return {
            user_name: s.name || 'Anonym',
            total_entries: String(entries.length),
            total_work_days: String(by('work').length),
            total_school_days: String(by('school').length),
            total_vacation_days: String(by('vacation').length),
            total_sick_days: String(by('sick').length),
            total_holiday_days: String(by('holiday').length),
            total_hours: sum(entries, 'worked').toFixed(1),
            total_saldo: signed(totalDiff),
            year: year,
            year_entries: String(yearEntries.length),
            year_work_days: String(yearEntries.filter(function (e) { return e.type === 'work'; }).length),
            year_school_days: String(yearEntries.filter(function (e) { return e.type === 'school'; }).length),
            year_hours: sum(yearEntries, 'worked').toFixed(1),
            year_saldo: signed(yearDiff),
            avg_hours: (active.length ? sum(active, 'worked') / active.length : 0).toFixed(1),
            first_entry: firstEntry,
            last_entry: lastEntry,
            days_using_app: String(firstEntry !== '—' ? Math.floor((now - localDay(firstEntry)) / 86400000) : 0),
            current_streak: String(currentStreak(entries)),
            active_months: String(new Set(dates.map(function (d) { return String(d).slice(0, 7); })).size),
            weekly_soll: (s.hours || []).reduce(function (a, h) { return a + (parseFloat(h) || 0); }, 0).toFixed(1),
            break_threshold: String((s.break && s.break.thresh) || 6),
            vacation_total: String(vacTotal),
            vacation_used: String(vacUsed),
            vacation_remaining: String(Math.max(0, vacTotal - vacUsed)),
            best_weekday: dayNames[best],
            best_weekday_hours: wdH[best].toFixed(1),
            custom_types_count: String((s.customTypes || []).length),
            feedback_count: String(fb),
            feature_request_count: String((data.featureRequests || []).length),
            theme_color: s.theme || '—',
            theme_mode: s.themeMode || 'dark',
            screen_size: window.screen.width + 'x' + window.screen.height,
            viewport: window.innerWidth + 'x' + window.innerHeight,
            platform: navigator.platform || '—',
            language: navigator.language || '—',
            online: navigator.onLine ? 'Ja' : 'Nein',
            touch_device: ('ontouchstart' in window) ? 'Ja' : 'Nein',
            pixel_ratio: String(window.devicePixelRatio || 1),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
            user_agent: navigator.userAgent.substring(0, 200)
        };
    }

    // Die Zeichen im Bericht landen nur in der E-Mail an den Entwickler, nie im UI.
    function buildFeedbackData(message, rating) {
        var data = readData();
        var emojis = ['—', '😞', '😕', '😐', '😊', '🤩'];
        var base = {
            email: 'sven9micha37@gmail.com',
            message: message,
            rating: String(rating),
            rating_emoji: emojis[rating] || '—',
            from_name: data.settings.name || 'Anonym',
            date: new Date().toLocaleString(isEN ? 'en-GB' : 'de-DE'),
            data_mode: state.mode
        };
        if (state.mode !== 'full') return base;
        var st = gatherAppStats(data);
        base.message = [
            message, '',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━', '📊 VOLLSTÄNDIGER REPORT', '━━━━━━━━━━━━━━━━━━━━━━━━━━', '',
            '── GESAMTSTATISTIK ──',
            '📋 Einträge: ' + st.total_entries, '⏱️ Stunden: ' + st.total_hours + 'h', '📈 Saldo: ' + st.total_saldo + 'h',
            '💼 Arbeitstage: ' + st.total_work_days, '🎓 Schultage: ' + st.total_school_days, '🏖️ Urlaub: ' + st.total_vacation_days,
            '🤒 Krank: ' + st.total_sick_days, '🎉 Feiertag: ' + st.total_holiday_days, '',
            '── JAHR ' + st.year + ' ──',
            '📋 Einträge: ' + st.year_entries, '⏱️ Stunden: ' + st.year_hours + 'h', '📈 Saldo: ' + st.year_saldo + 'h', '',
            '── PRODUKTIVITÄT ──',
            '⌀ Stunden/Tag: ' + st.avg_hours + 'h', '📐 Wöchentl. Soll: ' + st.weekly_soll + 'h',
            '🏆 Bester Tag: ' + st.best_weekday + ' (' + st.best_weekday_hours + 'h)', '📆 Aktive Monate: ' + st.active_months,
            '🔥 Streak: ' + st.current_streak + ' Tage', '',
            '── URLAUB ──',
            '🏖️ Gesamt: ' + st.vacation_total + ' | ✈️ Verbraucht: ' + st.vacation_used + ' | ✅ Übrig: ' + st.vacation_remaining, '',
            '── APP-ENGAGEMENT ──',
            '📅 Erster Eintrag: ' + st.first_entry, '📅 Letzter Eintrag: ' + st.last_entry, '📆 Tage aktiv: ' + st.days_using_app,
            '💬 Feedbacks: ' + st.feedback_count, '💡 Feature Requests: ' + st.feature_request_count,
            '🎨 Theme: ' + st.theme_color + ' (' + st.theme_mode + ')', '',
            '── GERÄT ──',
            '🖥️ Screen: ' + st.screen_size + ' @ ' + st.pixel_ratio + 'x', '📐 Viewport: ' + st.viewport, '💻 Platform: ' + st.platform,
            '🌐 Sprache: ' + st.language, '🕐 Zeitzone: ' + st.timezone, '📶 Online: ' + st.online, '👆 Touch: ' + st.touch_device
        ].join('\n');
        for (var k in st) base[k] = st[k];
        return base;
    }

    // ── Datenvorschau: jedes Feld, das der Versand mitnimmt, mit echtem Wert.
    var FIELD_LABELS = {
        email: ['Empfänger', 'Recipient'], message: ['Nachricht', 'Message'], rating: ['Bewertung', 'Rating'],
        rating_emoji: ['Bewertung (Symbol)', 'Rating (symbol)'], from_name: ['Name', 'Name'], date: ['Datum & Uhrzeit', 'Date & time'],
        data_mode: ['Datenmodus', 'Data mode'], user_name: ['Name (App-Einstellung)', 'Name (app setting)'],
        total_entries: ['Einträge gesamt', 'Entries total'], total_hours: ['Stunden gesamt', 'Hours total'],
        total_saldo: ['Saldo gesamt', 'Balance total'], total_work_days: ['Arbeitstage', 'Working days'],
        total_school_days: ['Schultage', 'School days'], total_vacation_days: ['Urlaubstage', 'Vacation days'],
        total_sick_days: ['Krankheitstage', 'Sick days'], total_holiday_days: ['Feiertage', 'Public holidays'],
        year: ['Jahr', 'Year'], year_entries: ['Einträge (Jahr)', 'Entries (year)'], year_hours: ['Stunden (Jahr)', 'Hours (year)'],
        year_saldo: ['Saldo (Jahr)', 'Balance (year)'], year_work_days: ['Arbeitstage (Jahr)', 'Working days (year)'],
        year_school_days: ['Schultage (Jahr)', 'School days (year)'],
        avg_hours: ['Stunden pro Tag', 'Hours per day'], weekly_soll: ['Wöchentliches Soll', 'Weekly target'],
        best_weekday: ['Produktivster Wochentag', 'Most productive weekday'], best_weekday_hours: ['Stunden an dem Tag', 'Hours on that day'],
        active_months: ['Aktive Monate', 'Active months'], break_threshold: ['Pausenschwelle', 'Break threshold'],
        first_entry: ['Erster Eintrag', 'First entry'], last_entry: ['Letzter Eintrag', 'Last entry'],
        days_using_app: ['Tage seit erstem Eintrag', 'Days since first entry'], current_streak: ['Serie', 'Streak'],
        vacation_total: ['Urlaub gesamt', 'Vacation total'], vacation_used: ['Urlaub verbraucht', 'Vacation used'],
        vacation_remaining: ['Urlaub übrig', 'Vacation remaining'],
        custom_types_count: ['Eigene Eintragsarten', 'Custom entry types'], feedback_count: ['Bisherige Rückmeldungen', 'Feedback sent so far'],
        feature_request_count: ['Bisherige Feature-Anfragen', 'Feature requests so far'],
        theme_color: ['Theme-Farbe', 'Theme color'], theme_mode: ['Theme-Modus', 'Theme mode'],
        screen_size: ['Bildschirmgröße', 'Screen size'], viewport: ['Viewport', 'Viewport'],
        platform: ['Plattform', 'Platform'], language: ['Sprache', 'Language'],
        timezone: ['Zeitzone', 'Time zone'], online: ['Online', 'Online'],
        touch_device: ['Touch-Gerät', 'Touch device'], pixel_ratio: ['Pixeldichte', 'Pixel density'],
        user_agent: ['Browserkennung (User Agent)', 'Browser identification (user agent)']
    };
    function openPreview() {
        var msg = $('spText').value.trim() || L('(Deine Nachricht)', '(Your message)');
        var d = buildFeedbackData(msg, state.rating);
        var full = state.mode === 'full';
        var modeName = full ? L('Vollständig', 'Full') : 'Minimal';
        var rows = Object.keys(d).map(function (k) {
            var pair = FIELD_LABELS[k];
            var val = k === 'message'
                ? (full ? L('(Deine Nachricht + die Werte aus dieser Tabelle als Text)', '(Your message + the values from this table as text)')
                        : L('(Deine Nachricht)', '(Your message)'))
                : k === 'email' ? L('(Entwickler)', '(Developer)') : d[k];
            return '<tr><td>' + esc(pair ? L(pair[0], pair[1]) : k) + '</td><td>' + esc(val) + '</td></tr>';
        }).join('');
        var n = Object.keys(d).length;
        $('spPreviewMode').textContent = modeName;
        $('spPreviewBody').innerHTML =
            '<p class="fdp-intro">' + L('Im Modus „' + modeName + '“ werden ' + n + ' Felder gesendet — hier mit deinen echten Werten:',
                                        n + ' fields are sent in “' + modeName + '” mode — shown here with your real values:') + '</p>'
            + '<div class="fdp-table-wrap"><table class="fdp-table"><thead><tr><th>' + L('Feld', 'Field') + '</th><th>' + L('Wert', 'Value')
            + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
            + '<p class="fdp-note">' + L('Einzelne Zeiteinträge, Notizen, Projektnamen und das Schatten-Berichtsheft sind nie dabei — auch nicht im Modus „Vollständig“. Die Übertragung läuft verschlüsselt über EmailJS (HTTPS) direkt an den Entwickler.',
                                          'Individual time entries, notes, project names and the shadow report book are never included — not even in “Full” mode. The transfer runs encrypted via EmailJS (HTTPS) straight to the developer.')
            + ' <a href="' + (isEN ? '/en/DSGVO/' : '/DSGVO/') + '" target="_blank" rel="noopener">' + L('Datenschutzerklärung lesen', 'Read the privacy policy') + '</a></p>';
        var dlg = $('spPreview');
        $('spPreviewBody').scrollTop = 0;
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    }

    var ICON_OK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    var ICON_WARN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>';
    function showStatus(kind, text) {
        var el = $('spStatus');
        el.className = 'sp-status ' + (kind === 'ok' ? 'is-ok' : 'is-warn');
        el.innerHTML = (kind === 'ok' ? ICON_OK : ICON_WARN) + '<span>' + esc(text) + '</span>';
        el.hidden = false;
    }
    function setSending(on) {
        var btn = $('spSend');
        btn.classList.toggle('is-busy', on);
        btn.disabled = on;
        btn.querySelector('.sp-send-lbl').textContent = on ? L('Wird gesendet …', 'Sending …') : L('Senden', 'Send');
    }

    var emailjsReady = false;
    function mailer() {
        if (typeof window.emailjs === 'undefined') return null;
        if (!emailjsReady) { try { window.emailjs.init(EMAILJS_KEY); emailjsReady = true; } catch (e) { return null; } }
        return window.emailjs;
    }

    function send(ev) {
        ev.preventDefault();
        var text = $('spText'), consent = $('spConsent');
        if (!text.value.trim()) {
            showStatus('warn', L('Schreib zuerst etwas in das Textfeld.', 'Write something in the text field first.'));
            text.focus();
            return;
        }
        if (!consent.checked) {
            showStatus('warn', L('Setz den Haken bei der Zustimmung — ohne sie wird nichts gesendet.', 'Tick the consent box — nothing is sent without it.'));
            var row = consent.closest('.sp-consent');
            row.classList.add('is-missing');
            consent.addEventListener('change', function () { row.classList.remove('is-missing'); }, { once: true });
            consent.focus();
            return;
        }
        var message = (KIND_PREFIX[state.kind] || '') + text.value.trim();
        var payload = buildFeedbackData(message, state.rating);
        var log = function (sent) {
            appendLog({ date: new Date().toISOString(), kind: state.kind, rating: state.rating, sent: sent, dataMode: state.mode });
        };
        var ej = mailer();
        if (!ej) {
            log(false);
            showStatus('warn', L('Der Mail-Dienst ist gerade nicht erreichbar (offline oder blockiert). Dein Text steht noch im Feld — versuch es später nochmal.',
                                 'The mail service is not reachable right now (offline or blocked). Your text is still in the field — try again later.'));
            return;
        }
        setSending(true);
        ej.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, payload)
            .then(function () {
                log(true);
                text.value = '';
                consent.checked = false;
                state.rating = 0; pressGroup('.sp-rate-btn', 'data-rate', 0);
                showStatus('ok', L('Gesendet. Danke — deine Nachricht ist beim Entwickler angekommen.', 'Sent. Thanks — your message has reached the developer.'));
                if (typeof window.mwlEvent === 'function') window.mwlEvent('feedback_gesendet', { art: state.kind, modus: state.mode, bewertet: payload.rating !== '0' });
            })
            .catch(function (err) {
                console.warn('EmailJS Fehler:', err);
                log(false);
                showStatus('warn', L('Senden hat nicht geklappt. Dein Text steht noch im Feld — versuch es gleich nochmal.',
                                     'Sending failed. Your text is still in the field — please try again.'));
            })
            .then(function () { setSending(false); });
    }

    function share() {
        var url = isEN ? 'https://myworklog.de/en/' : 'https://myworklog.de/';
        var d = { title: 'MyWorkLog', text: L('Zeiterfassung und Berichtsheft für Azubis — kostenlos.', 'Time tracking and report book for apprentices — free.'), url: url };
        if (navigator.share) { navigator.share(d).catch(function () {}); return; }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(function () {
                $('spShareHint').textContent = L('Link kopiert', 'Link copied');
            }).catch(function () {});
        }
    }

    function bindForm() {
        document.querySelectorAll('[data-kind]').forEach(function (b) { b.addEventListener('click', function () { setKind(b.getAttribute('data-kind')); }); });
        document.querySelectorAll('.sp-rate-btn').forEach(function (b) { b.addEventListener('click', function () { setRating(+b.getAttribute('data-rate')); }); });
        document.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); }); });
        $('spForm').addEventListener('submit', send);
        $('spPreviewBtn').addEventListener('click', openPreview);
        $('spPreviewClose').addEventListener('click', function () { $('spPreview').close(); });
        $('spPreview').addEventListener('click', function (e) { if (e.target === this) this.close(); });
        $('spShareBtn').addEventListener('click', share);
        $('spIdeaBtn').addEventListener('click', function () {
            setKind('idea');
            var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
            $('feedback').scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
            setTimeout(function () { $('spText').focus({ preventScroll: true }); }, ruhig ? 0 : 450);
        });
        // Direkt verlinkbar: /support/?art=idee oder ?art=fehler
        var art = new URLSearchParams(location.search).get('art');
        if (art === 'idee' || art === 'idea') setKind('idea');
        else if (art === 'fehler' || art === 'bug') setKind('bug');
    }

    // ═══ CHANGELOG — Release-Ledger aus config/version.json ═══
    // Einzige Quelle: `changelog`, `changelog_en` (wo gepflegt) und
    // `changelogDates` (tools/changelog-dates.mjs). Nichts wird geschaetzt.
    function clCmpVer(a, b) {
        var pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
        for (var i = 0; i < Math.max(pa.length, pb.length); i++) { var d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
        return 0;
    }
    // 🔴 Nie ueber toISOString(): das rechnet nach UTC und macht aus dem 10.02. lokal den 09.02.
    function clIso(d) {
        var m = d.getMonth() + 1, t = d.getDate();
        return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (t < 10 ? '0' : '') + t;
    }
    // Titelzeile + Leerzeile (Konvention seit v6.4.2), sonst erster Satz,
    // zuletzt der Textanfang. tools/readme-stamp.test.mjs spiegelt diese Regel.
    function clSplit(text) {
        var t = String(text == null ? '' : text).replace(/\r\n/g, '\n').trim();
        if (!t) return { title: '', paras: [] };
        var paras = t.split(/\n\s*\n/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
        var first = paras[0] || '';
        var head = t.split('\n')[0].trim();
        if (paras.length > 1 && head === first && head.length <= 90) return { title: head, paras: paras.slice(1) };
        var m = first.match(/^(.{10,}?[.!?])\s+(.*)$/);
        if (m) return { title: m[1], paras: [m[2]].concat(paras.slice(1)) };
        return { title: first, paras: paras.slice(1) };
    }
    function clRegEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    // Hervorhebung erst NACH dem Escapen, und nur ohne HTML-Sonderzeichen in
    // der Suche — sonst zerlegt ein "a" die Entitaet &amp; in &<mark>a</mark>mp;.
    function clMark(escaped, q) {
        if (!q || /[&<>"]/.test(q)) return escaped;
        return escaped.replace(new RegExp(clRegEsc(q), 'gi'), function (hit) { return '<mark>' + hit + '</mark>'; });
    }

    function renderChangelog() {
        var host = $('spChangelog');
        if (!host) return;
        var loc = isEN ? 'en-GB' : 'de-DE';
        var fmtLong = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' });
        var fmtFull = new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
        var fmtMonth = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' });
        var fmtMoAbbr = new Intl.DateTimeFormat(loc, { month: 'short' });
        var fmtWd = new Intl.DateTimeFormat(loc, { weekday: 'short' });
        var fail = function (msg) { host.innerHTML = '<div class="cl-empty-state">' + msg + '</div>'; };
        var ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
        var ICON_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
        var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

        fetch('/config/version.json', { cache: 'no-cache' })
            .then(function (r) { return r.json(); })
            .then(function (cfg) {
                var cl = cfg && cfg.changelog;
                if (!cl || typeof cl !== 'object') { fail(L('Keine Änderungshistorie verfügbar.', 'No change history available.')); return; }
                // Fehlt die Uebersetzung, faellt der EINZELNE Eintrag auf Deutsch zurueck.
                var clEN = (isEN && cfg.changelog_en) || null;
                var dates = cfg.changelogDates || {};
                var current = String(cfg.version || '').trim();
                var versions = Object.keys(cl).sort(function (a, b) { return clCmpVer(b, a); });
                if (!versions.length) { fail(L('Keine Änderungshistorie verfügbar.', 'No change history available.')); return; }

                var releases = versions.map(function (v) {
                    var sp = clSplit((clEN && clEN[v]) || cl[v] || '');
                    return { v: v, date: dates[v] || '', title: sp.title, paras: sp.paras, isCurrent: v === current,
                             hay: (v + ' ' + sp.title + ' ' + sp.paras.join(' ')).toLowerCase() };
                });

                var byDay = {};
                releases.forEach(function (r) { if (r.date) byDay[r.date] = (byDay[r.date] || 0) + 1; });
                var activeDays = Object.keys(byDay).sort();
                var busiest = activeDays.reduce(function (m, d) { return Math.max(m, byDay[d]); }, 0);

                var curRel = releases.filter(function (r) { return r.isCurrent; })[0];
                var headHtml = '<div class="cl-head">'
                    + '<span class="cl-head__tag">' + L('Aktuell', 'Current') + '</span>'
                    + '<span class="cl-head__ver">v' + esc(current || '—') + '</span>'
                    + (curRel && curRel.date ? '<span class="cl-head__date">' + L('veröffentlicht am ', 'released on ') + esc(fmtLong.format(localDay(curRel.date))) + '</span>' : '')
                    + '</div>';

                var calHtml = '';
                if (activeDays.length) {
                    var start = localDay(activeDays[0]);
                    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
                    var end = localDay(activeDays[activeDays.length - 1]);
                    end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
                    var cells = [], cursor = new Date(start);
                    while (cursor <= end) { cells.push(clIso(cursor)); cursor.setDate(cursor.getDate() + 1); }
                    var weeks = Math.ceil(cells.length / 7);
                    var lvl = function (n) { return n >= 7 ? 4 : n >= 4 ? 3 : n >= 2 ? 2 : n >= 1 ? 1 : 0; };
                    var gridHtml = cells.map(function (iso) {
                        var n = byDay[iso] || 0;
                        if (!n) return '<div class="cl-day" aria-hidden="true"></div>';
                        var label = n + ' ' + (n === 1 ? L('Version', 'version') : L('Versionen', 'versions')) + ' — ' + fmtFull.format(localDay(iso));
                        return '<button type="button" class="cl-day" data-lvl="' + lvl(n) + '" data-day="' + iso + '" tabindex="-1" aria-label="' + esc(label) + '"></button>';
                    }).join('');

                    // Monatsmarken nur an der Woche mit dem Monatsersten und nie
                    // dichter als drei Spalten, sonst ueberschreiben sie sich.
                    // Die erste Spalte bekommt ihren Monat selbst — aber nur mit
                    // Abstand zur naechsten Marke, sonst fiele eine weg.
                    var lastLabelCol = -99, moHtml = '', firstOfMonthCol = -1;
                    for (var c0 = 0; c0 < cells.length; c0++) {
                        if (localDay(cells[c0]).getDate() === 1) { firstOfMonthCol = Math.floor(c0 / 7); break; }
                    }
                    if (localDay(cells[0]).getDate() !== 1 && firstOfMonthCol >= 3) {
                        moHtml += '<div class="cl-cal__mo"><span>' + esc(fmtMoAbbr.format(localDay(cells[0]))) + '</span></div>';
                        lastLabelCol = 0;
                    }
                    for (var w = (lastLabelCol === 0 ? 1 : 0); w < weeks; w++) {
                        var txt = '';
                        for (var k = 0; k < 7; k++) {
                            var iso = cells[w * 7 + k];
                            if (!iso) break;
                            var dd = localDay(iso);
                            if (dd.getDate() === 1 && w - lastLabelCol >= 3) { txt = fmtMoAbbr.format(dd); lastLabelCol = w; break; }
                        }
                        moHtml += '<div class="cl-cal__mo">' + (txt ? '<span>' + esc(txt) + '</span>' : '') + '</div>';
                    }
                    var wdRef = localDay('2026-01-05');   // ein Montag
                    var wdHtml = '';
                    for (var i = 0; i < 7; i++) {
                        var wd = new Date(wdRef); wd.setDate(wd.getDate() + i);
                        wdHtml += '<span>' + (i % 2 === 0 ? esc(fmtWd.format(wd).slice(0, 2)) : '') + '</span>';
                    }
                    var facts = '<span><b>' + releases.length + '</b> ' + L('Versionen', 'versions') + '</span>'
                        + '<span><b>' + activeDays.length + '</b> ' + L('Tage mit Veröffentlichung', 'days with a release') + '</span>'
                        + '<span><b>' + busiest + '</b> ' + L('an einem Tag', 'in a single day') + '</span>';
                    calHtml = '<div class="cl-cal-wrap"><div class="cl-cal"><div class="cl-cal__inner">'
                        + '<div class="cl-cal__months" aria-hidden="true">' + moHtml + '</div>'
                        + '<div class="cl-cal__body"><div class="cl-cal__days" aria-hidden="true">' + wdHtml + '</div>'
                        + '<div class="cl-cal__grid" id="clCal" role="group" style="aspect-ratio: ' + weeks + ' / 7" aria-label="'
                        + esc(L('Release-Kalender — Tag auswählen, um die Liste zu filtern', 'Release calendar — pick a day to filter the list')) + '">' + gridHtml + '</div>'
                        + '</div></div></div>'
                        + '<div class="cl-cal__foot"><div class="cl-cal__facts">' + facts + '</div>'
                        + '<div class="cl-legend"><span>' + L('weniger', 'less') + '</span><i></i><i data-lvl="1"></i><i data-lvl="2"></i><i data-lvl="3"></i><i data-lvl="4"></i><span>' + L('mehr', 'more') + '</span></div></div>'
                        + '<div class="cl-tip" id="clTip" role="status" aria-live="polite"></div></div>';
                }

                var filterHtml = '<div class="cl-filter"><label class="cl-search">' + ICON_SEARCH
                    + '<input type="search" id="clSearch" autocomplete="off" spellcheck="false" placeholder="' + esc(L('Version oder Stichwort suchen…', 'Search version or keyword…'))
                    + '" aria-label="' + esc(L('Änderungen durchsuchen', 'Search the changelog')) + '"></label>'
                    + '<span class="cl-count" id="clCount"></span>'
                    + '<button type="button" class="cl-reset" id="clReset" hidden>' + ICON_X + '<span>' + L('Filter zurücksetzen', 'Clear filter') + '</span></button></div>';

                host.innerHTML = headHtml + calHtml + filterHtml + '<div class="cl-list" id="clList"></div>';

                var list = $('clList'), search = $('clSearch'), count = $('clCount'), reset = $('clReset'), cal = $('clCal'), tip = $('clTip');
                var query = '', pickedDay = '', open = {};

                function rowHtml(r) {
                    var id = 'clb-' + r.v.replace(/\./g, '-'), isOpen = !!open[r.v];
                    var dateTxt = r.date ? localDay(r.date).getDate() + '.' + (localDay(r.date).getMonth() + 1) + '.' : '—';
                    var body = r.paras.length
                        ? r.paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('')
                        : '<p>' + esc(L('Kein weiterer Text zu dieser Version.', 'No further text for this version.')) + '</p>';
                    return '<div class="cl-item' + (isOpen ? ' is-open' : '') + '" data-v="' + esc(r.v) + '">'
                        + '<button type="button" class="cl-row" aria-expanded="' + (isOpen ? 'true' : 'false') + '" aria-controls="' + id + '">'
                        + '<span class="cl-row__date">' + esc(dateTxt) + '</span>'
                        + '<span class="cl-row__ver">' + clMark(esc(r.v), query) + '</span>'
                        + '<span class="cl-row__title"><span class="cl-row__lead">' + clMark(esc(r.title), query) + '</span>'
                        + (r.isCurrent ? '<span class="cl-now">' + L('Aktuell', 'Current') + '</span>' : '') + '</span>'
                        + '<span class="cl-row__chev">' + ICON_CHEV + '</span></button>'
                        + '<div class="cl-body" id="' + id + '"><div>' + body + '</div></div></div>';
                }

                function paint() {
                    var q = query.toLowerCase();
                    var hits = releases.filter(function (r) {
                        if (pickedDay && r.date !== pickedDay) return false;
                        return !q || r.hay.indexOf(q) !== -1;
                    });
                    var order = [], groups = {};
                    hits.forEach(function (r) {
                        var key = r.date ? r.date.slice(0, 7) : 'none';
                        if (!groups[key]) { groups[key] = []; order.push(key); }
                        groups[key].push(r);
                    });
                    // Versionen ohne Datum gehoeren ans Ende, nicht zwischen zwei Monate.
                    order = order.filter(function (k) { return k !== 'none'; }).concat(groups.none ? ['none'] : []);
                    list.innerHTML = !hits.length
                        ? '<div class="cl-empty-state">' + L('Keine Version passt zu dieser Suche.', 'No version matches this search.') + '</div>'
                        : order.map(function (key) {
                            var label = key === 'none' ? L('Ohne Datum', 'No date') : fmtMonth.format(localDay(key + '-01'));
                            return '<section class="cl-month"><h3 class="cl-month__head"><span>' + esc(label) + '</span>'
                                + '<span class="cl-month__n">' + groups[key].length + '</span></h3>' + groups[key].map(rowHtml).join('') + '</section>';
                        }).join('');
                    count.textContent = (query || pickedDay)
                        ? L(hits.length + ' von ' + releases.length, hits.length + ' of ' + releases.length)
                        : L(releases.length + ' Versionen', releases.length + ' versions');
                    reset.hidden = !(query || pickedDay);
                    if (cal) cal.classList.toggle('has-pick', !!pickedDay);
                }

                list.addEventListener('click', function (e) {
                    var btn = e.target.closest ? e.target.closest('.cl-row') : null;
                    if (!btn || !list.contains(btn)) return;
                    var item = btn.parentNode, v = item.getAttribute('data-v');
                    var isOpen = !item.classList.contains('is-open');
                    item.classList.toggle('is-open', isOpen);
                    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                    if (isOpen) open[v] = true; else delete open[v];
                });

                var t = null;
                search.addEventListener('input', function () {
                    clearTimeout(t);
                    t = setTimeout(function () { query = search.value.trim(); paint(); list.scrollTop = 0; }, 120);
                });
                reset.addEventListener('click', function () {
                    query = ''; pickedDay = ''; search.value = '';
                    if (cal) { var p = cal.querySelector('.is-picked'); if (p) p.classList.remove('is-picked'); if (tip) tip.classList.remove('is-on'); }
                    paint(); list.scrollTop = 0; search.focus();
                });

                // 🔴 Touch hat kein :hover — der KLICK setzt den Filter, Hover ist Zugabe.
                if (cal) {
                    var days = [].slice.call(cal.querySelectorAll('button.cl-day'));
                    if (days.length) days[days.length - 1].tabIndex = 0;
                    var showTip = function (btn) {
                        if (!tip) return;
                        var box = cal.closest('.cl-cal-wrap').getBoundingClientRect(), b = btn.getBoundingClientRect();
                        tip.textContent = btn.getAttribute('aria-label');
                        tip.classList.add('is-on');
                        // Erst sichtbar, dann messen — unsichtbar ist offsetWidth 0.
                        var tw = tip.offsetWidth, th = tip.offsetHeight;
                        var x = b.left - box.left + b.width / 2;
                        tip.style.left = Math.max(tw / 2 + 2, Math.min(x, box.width - tw / 2 - 2)) + 'px';
                        // Ueber den obersten Zeilen ist kein Platz → unter die Zelle.
                        var above = (b.top - box.top) >= th + 8;
                        tip.style.top = (above ? b.top - box.top - 6 : b.bottom - box.top + 6 + th) + 'px';
                    };
                    var hideTip = function () { if (tip) tip.classList.remove('is-on'); };
                    cal.addEventListener('pointerover', function (e) { var b = e.target.closest && e.target.closest('button.cl-day'); if (b) showTip(b); });
                    cal.addEventListener('pointerleave', hideTip);
                    cal.addEventListener('click', function (e) {
                        var b = e.target.closest && e.target.closest('button.cl-day');
                        if (!b) return;
                        var day = b.getAttribute('data-day'), was = cal.querySelector('.is-picked');
                        if (was) was.classList.remove('is-picked');
                        pickedDay = (pickedDay === day) ? '' : day;
                        if (pickedDay) { b.classList.add('is-picked'); showTip(b); } else hideTip();
                        paint(); list.scrollTop = 0;
                    });
                    // Ein Tabstopp fuer alle Felder: Pfeiltasten wandern zwischen den Tagen mit Release.
                    cal.addEventListener('keydown', function (e) {
                        var i = days.indexOf(document.activeElement);
                        if (i === -1) return;
                        var next = -1;
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(i + 1, days.length - 1);
                        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(i - 1, 0);
                        else if (e.key === 'Home') next = 0;
                        else if (e.key === 'End') next = days.length - 1;
                        if (next === -1) return;
                        e.preventDefault();
                        days[i].tabIndex = -1; days[next].tabIndex = 0; days[next].focus(); showTip(days[next]);
                    });
                    cal.addEventListener('focusout', function (e) { if (!cal.contains(e.relatedTarget)) hideTip(); });
                }
                paint();
            })
            .catch(function () { fail(L('Änderungshistorie konnte nicht geladen werden.', 'Could not load the change history.')); });
    }

    function init() {
        renderMine();
        bindForm();
        renderChangelog();
        window.addEventListener('storage', function (e) { if (e.key === 'tg_pro_data') renderMine(); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
