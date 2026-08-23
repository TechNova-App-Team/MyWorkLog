// ═══ CORE: SUPPORT-FEEDBACK ═══
    function calculateCurrentStreak() {
        const entries = data.entries || [];
        if (entries.length === 0) return 0;
        const dates = [...new Set(entries.filter(e => e.type === 'work' || e.type === 'school').map(e => e.date))].sort().reverse();
        if (dates.length === 0) return 0;

        // Prüfe ob der neueste Eintrag aktuell ist (heute oder letzter Arbeitstag)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastWorkday = typeof getLastWorkday === 'function' ? getLastWorkday(today) : (function() {
            const d = new Date(today);
            const dow = d.getDay();
            if (dow === 0) d.setDate(d.getDate() - 2);
            else if (dow === 6) d.setDate(d.getDate() - 1);
            else { d.setDate(d.getDate() - 1); if (d.getDay() === 0) d.setDate(d.getDate() - 2); else if (d.getDay() === 6) d.setDate(d.getDate() - 1); }
            d.setHours(0, 0, 0, 0);
            return d;
        })();

        const newestDate = new Date(dates[0]);
        newestDate.setHours(0, 0, 0, 0);
        // Streak nur zählen wenn der letzte Eintrag von heute oder dem letzten Arbeitstag ist
        if (newestDate.getTime() !== today.getTime() && newestDate < lastWorkday) return 0;

        let streak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const d1 = new Date(dates[i]);
            const d2 = new Date(dates[i + 1]);
            const diffDays = Math.floor((d1 - d2) / 86400000);
            if (diffDays === 1 || (diffDays <= 3 && d2.getDay() === 5)) {
                streak++;
            } else break;
        }
        return streak;
    }

    function supportRate(rating) {
        const emojis = ['', '😞', '😕', '😐', '😊', '🤩'];
        const labels = ['', 'Schlecht', 'Nicht so gut', 'Okay', 'Gut', 'Fantastisch'];
        data.supportRating = rating;
        save();

        // Haptic feedback (vibration)
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }

        // Find and animate the clicked button
        const btn = document.querySelector(`[onclick="supportRate(${rating})"]`);
        if (btn) {
            btn.style.transition = 'none';
            btn.style.transform = 'scale(1.2)';
            btn.style.filter = 'drop-shadow(0 0 16px rgba(16, 185, 129, 0.8))';
            setTimeout(() => {
                btn.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                btn.style.transform = 'scale(1)';
                btn.style.filter = 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))';
                setTimeout(() => {
                    btn.style.transition = 'filter 1.5s ease';
                    btn.style.filter = 'drop-shadow(0 0 0px rgba(16, 185, 129, 0))';
                }, 400);
            }, 0);
        }

        // Show modern feedback toast
        showFeedbackToast(emojis[rating], labels[rating]);
    }

    function showFeedbackToast(emoji, label) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(var(--bg-sidebar-rgb, 15, 15, 20), 0.95);
            backdrop-filter: blur(20px);
            padding: 16px 24px;
            border-radius: 14px;
            border: 1px solid rgba(16, 185, 129, 0.2);
            z-index: 5000;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 90%;
            animation: slideUpFeedback 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUpFeedback {
                from { transform: translateX(-50%) translateY(120px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes slideDownFeedback {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(120px); opacity: 0; }
            }
        `;
        if (!document.querySelector('style[data-feedback-toast]')) {
            style.setAttribute('data-feedback-toast', '');
            document.head.appendChild(style);
        }

        toast.innerHTML = `
            <span style="font-size: 1.4rem; display: inline-block;">${emoji}</span>
            <div style="flex: 1;">
                <div style="color: var(--text-main); font-weight: 600; font-size: 0.95rem;">${label}!</div>
                <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 2px;">Bewertung gespeichert • Jetzt senden</div>
            </div>
        `;

        document.body.appendChild(toast);

        const removeToast = () => {
            toast.style.animation = 'slideDownFeedback 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        };

        setTimeout(removeToast, 3500);
    }

    function gatherAppStats() {
        const entries = data.entries || [];
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // Entry type counts
        const workEntries = entries.filter(e => e.type === 'work');
        const schoolEntries = entries.filter(e => e.type === 'school');
        const vacationEntries = entries.filter(e => e.type === 'vacation');
        const gleittagEntries = entries.filter(e => e.type === 'gleittag');
        const sickEntries = entries.filter(e => e.type === 'sick');
        const holidayEntries = entries.filter(e => e.type === 'holiday');
        
        // This year entries
        const thisYearEntries = entries.filter(e => e.date && e.date.startsWith(currentYear.toString()));
        const thisYearWork = thisYearEntries.filter(e => e.type === 'work');
        const thisYearSchool = thisYearEntries.filter(e => e.type === 'school');
        
        // Total hours
        const totalWorked = entries.reduce((s, e) => s + (parseFloat(e.worked) || 0), 0);
        const totalDiff = entries.reduce((s, e) => s + (parseFloat(e.diff) || 0), 0);
        const thisYearWorked = thisYearEntries.reduce((s, e) => s + (parseFloat(e.worked) || 0), 0);
        const thisYearDiff = thisYearEntries.reduce((s, e) => s + (parseFloat(e.diff) || 0), 0);
        
        // Average hours per work/school day
        const activeDays = entries.filter(e => e.type === 'work' || e.type === 'school');
        const avgHoursPerDay = activeDays.length > 0 ? (activeDays.reduce((s, e) => s + (parseFloat(e.worked) || 0), 0) / activeDays.length) : 0;
        
        // First & last entry
        const sortedDates = entries.map(e => e.date).filter(Boolean).sort();
        const firstEntry = sortedDates[0] || '—';
        const lastEntry = sortedDates[sortedDates.length - 1] || '—';
        
        // Days using app
        const daysUsingApp = firstEntry !== '—' ? Math.floor((now - new Date(firstEntry)) / 86400000) : 0;
        
        // Streak
        const streak = calculateCurrentStreak();
        
        // Weekly Soll hours
        const sollHours = (data.settings.hours || []).reduce((s, h) => s + (parseFloat(h) || 0), 0);
        
        // Vacation stats
        const vacTotal = data.settings.vacation?.total || 30;
        const vacUsed = data.settings.vacation?.used || 0;
        const vacRemaining = Math.max(0, vacTotal - vacUsed);
        
        // Break settings
        const breakThresh = data.settings.break?.thresh || 6;
        
        // Unique months with entries
        const uniqueMonths = new Set(entries.map(e => e.date?.substring(0, 7)).filter(Boolean));
        
        // Most productive weekday
        const weekdayHours = [0, 0, 0, 0, 0, 0, 0];
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
        const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        entries.forEach(e => {
            if (e.date && (e.type === 'work' || e.type === 'school')) {
                const d = new Date(e.date).getDay();
                weekdayHours[d] += parseFloat(e.worked) || 0;
                weekdayCounts[d]++;
            }
        });
        let bestDay = 1;
        for (let i = 0; i < 7; i++) {
            if (weekdayHours[i] > weekdayHours[bestDay]) bestDay = i;
        }
        
        // Local feedback count
        const feedbackCount = (data.feedback || []).length;
        const featureCount = (data.featureRequests || []).length;
        
        // Theme
        const theme = data.settings.theme || '#a855f7';
        const themeMode = data.settings.themeMode || 'dark';
        
        // Custom types
        const customTypes = data.settings.customTypes || [];
        
        return {
            // User
            user_name: data.settings.name || 'Anonym',
            
            // Totals (all time)
            total_entries: entries.length.toString(),
            total_work_days: workEntries.length.toString(),
            total_school_days: schoolEntries.length.toString(),
            total_vacation_days: vacationEntries.length.toString(),
            total_sick_days: sickEntries.length.toString(),
            total_holiday_days: holidayEntries.length.toString(),
            total_hours: totalWorked.toFixed(1),
            total_saldo: (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(1),
            
            // This year
            year: currentYear.toString(),
            year_entries: thisYearEntries.length.toString(),
            year_work_days: thisYearWork.length.toString(),
            year_school_days: thisYearSchool.length.toString(),
            year_hours: thisYearWorked.toFixed(1),
            year_saldo: (thisYearDiff >= 0 ? '+' : '') + thisYearDiff.toFixed(1),
            
            // Averages
            avg_hours: avgHoursPerDay.toFixed(1),
            
            // Dates & streak
            first_entry: firstEntry,
            last_entry: lastEntry,
            days_using_app: daysUsingApp.toString(),
            current_streak: streak.toString(),
            active_months: uniqueMonths.size.toString(),
            
            // Settings
            weekly_soll: sollHours.toFixed(1),
            break_threshold: breakThresh.toString(),
            vacation_total: vacTotal.toString(),
            vacation_used: vacUsed.toString(),
            vacation_remaining: vacRemaining.toString(),
            
            // Productivity
            best_weekday: dayNames[bestDay],
            best_weekday_hours: weekdayHours[bestDay].toFixed(1),
            
            // App meta
            custom_types_count: customTypes.length.toString(),
            feedback_count: feedbackCount.toString(),
            feature_request_count: featureCount.toString(),
            theme_color: theme,
            theme_mode: themeMode,
            
            // Device & browser
            screen_size: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform || '—',
            language: navigator.language || '—',
            online: navigator.onLine ? 'Ja' : 'Nein',
            touch_device: ('ontouchstart' in window) ? 'Ja' : 'Nein',
            pixel_ratio: (window.devicePixelRatio || 1).toString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
            user_agent: navigator.userAgent.substring(0, 200),
        };
    }

    // ===== DSGVO: Feedback Data Mode =====
    let feedbackDataMode = 'minimal'; // 'minimal' or 'full'

    // JS-generierte Texte erreicht die statische i18n-Pipeline nicht → lokaler Helfer
    function sfL(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // Lucide-Style Icons für die Modus-Zeile (kein Emoji im UI)
    const FEEDBACK_MODE_ICONS = {
        minimal: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        full: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'
    };

    function feedbackModeInfoHTML(mode, text) {
        return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0; margin-top:2px;">'
            + FEEDBACK_MODE_ICONS[mode] + '</svg><span>' + text + '</span>';
    }

    function setFeedbackDataMode(mode) {
        feedbackDataMode = mode;
        const minBtn = document.getElementById('feedbackModeMinimal');
        const fullBtn = document.getElementById('feedbackModeFull');
        const info = document.getElementById('feedbackDataModeInfo');
        if (mode === 'minimal') {
            if (minBtn) { minBtn.style.background = 'rgba(16,185,129,0.15)'; minBtn.style.borderColor = 'rgba(16,185,129,0.3)'; minBtn.style.color = '#10b981'; }
            if (fullBtn) { fullBtn.style.background = 'rgba(255,255,255,0.03)'; fullBtn.style.borderColor = 'rgba(255,255,255,0.08)'; fullBtn.style.color = 'var(--text-muted)'; }
            if (info) info.innerHTML = feedbackModeInfoHTML('minimal', sfL(
                'Minimal: Nur Nachricht, Bewertung, Zeitpunkt und dein Name werden gesendet. Keine Gerätedaten, keine Statistiken.',
                'Minimal: only your message, rating, time and name are sent. No device data, no statistics.'));
        } else {
            if (fullBtn) { fullBtn.style.background = 'rgba(var(--primary-rgb),0.15)'; fullBtn.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; fullBtn.style.color = 'var(--primary)'; }
            if (minBtn) { minBtn.style.background = 'rgba(255,255,255,0.03)'; minBtn.style.borderColor = 'rgba(255,255,255,0.08)'; minBtn.style.color = 'var(--text-muted)'; }
            if (info) info.innerHTML = feedbackModeInfoHTML('full', sfL(
                'Vollständig: Zusätzlich Nutzungsstatistiken, App-Einstellungen und Gerätedaten. Nie einzelne Einträge, Notizen oder das Schatten-Berichtsheft.',
                'Full: additionally usage statistics, app settings and device data. Never individual entries, notes or the shadow report book.'));
        }
    }

    function buildFeedbackData(message, rating) {
        const emojis = ['—', '😞', '😕', '😐', '😊', '🤩'];
        const userName = data.settings.name || 'Anonym';
        const dateStr = new Date().toLocaleString(mwlLocale());

        if (feedbackDataMode === 'full') {
            const stats = gatherAppStats();
            const reportLines = [
                message,
                '',
                '━━━━━━━━━━━━━━━━━━━━━━━━━━',
                '📊 VOLLSTÄNDIGER REPORT',
                '━━━━━━━━━━━━━━━━━━━━━━━━━━',
                '',
                '── GESAMTSTATISTIK ──',
                '📋 Einträge: ' + stats.total_entries,
                '⏱️ Stunden: ' + stats.total_hours + 'h',
                '📈 Saldo: ' + stats.total_saldo + 'h',
                '💼 Arbeitstage: ' + stats.total_work_days,
                '🎓 Schultage: ' + stats.total_school_days,
                '🏖️ Urlaub: ' + stats.total_vacation_days,
                '🤒 Krank: ' + stats.total_sick_days,
                '🎉 Feiertag: ' + stats.total_holiday_days,
                '',
                '── JAHR ' + stats.year + ' ──',
                '📋 Einträge: ' + stats.year_entries,
                '⏱️ Stunden: ' + stats.year_hours + 'h',
                '📈 Saldo: ' + stats.year_saldo + 'h',
                '',
                '── PRODUKTIVITÄT ──',
                '⌀ Stunden/Tag: ' + stats.avg_hours + 'h',
                '📐 Wöchentl. Soll: ' + stats.weekly_soll + 'h',
                '🏆 Bester Tag: ' + stats.best_weekday + ' (' + stats.best_weekday_hours + 'h)',
                '📆 Aktive Monate: ' + stats.active_months,
                '🔥 Streak: ' + stats.current_streak + ' Tage',
                '',
                '── URLAUB ──',
                '🏖️ Gesamt: ' + stats.vacation_total + ' | ✈️ Verbraucht: ' + stats.vacation_used + ' | ✅ Übrig: ' + stats.vacation_remaining,
                '',
                '── APP-ENGAGEMENT ──',
                '📅 Erster Eintrag: ' + stats.first_entry,
                '📅 Letzter Eintrag: ' + stats.last_entry,
                '📆 Tage aktiv: ' + stats.days_using_app,
                '💬 Feedbacks: ' + stats.feedback_count,
                '💡 Feature Requests: ' + stats.feature_request_count,
                '🎨 Theme: ' + stats.theme_color + ' (' + stats.theme_mode + ')',
                '',
                '── GERÄT ──',
                '🖥️ Screen: ' + stats.screen_size + ' @ ' + stats.pixel_ratio + 'x',
                '📐 Viewport: ' + stats.viewport,
                '💻 Platform: ' + stats.platform,
                '🌐 Sprache: ' + stats.language,
                '🕐 Zeitzone: ' + stats.timezone,
                '📶 Online: ' + stats.online,
                '👆 Touch: ' + stats.touch_device,
            ];
            return {
                email: 'sven9micha37@gmail.com',
                message: reportLines.join('\n'),
                rating: rating.toString(),
                rating_emoji: emojis[rating],
                from_name: userName,
                date: dateStr,
                data_mode: 'full',
                ...stats,
            };
        }
        // Minimal: only rating, message, date, name — no device/stats
        return {
            email: 'sven9micha37@gmail.com',
            message: message,
            rating: rating.toString(),
            rating_emoji: emojis[rating],
            from_name: userName,
            date: dateStr,
            data_mode: 'minimal',
        };
    }

    // Klarnamen für die Datenvorschau — Schlüssel = Feldname in buildFeedbackData(), Wert = [DE, EN]
    const FEEDBACK_FIELD_LABELS = {
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
        days_using_app: ['Tage seit erstem Eintrag', 'Days since first entry'], current_streak: ['Streak', 'Streak'],
        vacation_total: ['Urlaub gesamt', 'Vacation total'], vacation_used: ['Urlaub verbraucht', 'Vacation used'],
        vacation_remaining: ['Urlaub übrig', 'Vacation remaining'],
        custom_types_count: ['Eigene Eintragsarten', 'Custom entry types'], feedback_count: ['Bisherige Feedbacks', 'Feedback sent so far'],
        feature_request_count: ['Bisherige Feature-Anfragen', 'Feature requests so far'],
        theme_color: ['Theme-Farbe', 'Theme color'], theme_mode: ['Theme-Modus', 'Theme mode'],
        screen_size: ['Bildschirmgröße', 'Screen size'], viewport: ['Viewport', 'Viewport'],
        platform: ['Plattform', 'Platform'], language: ['Sprache', 'Language'],
        timezone: ['Zeitzone', 'Time zone'], online: ['Online', 'Online'],
        touch_device: ['Touch-Gerät', 'Touch device'], pixel_ratio: ['Pixeldichte', 'Pixel density'],
        user_agent: ['Browserkennung (User Agent)', 'Browser identification (user agent)'],
    };

    function showFeedbackDataPreview() {
        const previewData = buildFeedbackData(
            document.getElementById('supportFeedbackText')?.value?.trim() || '(Deine Nachricht)',
            data.supportRating || 0
        );
        const isFull = feedbackDataMode === 'full';
        const modeName = isFull ? sfL('Vollständig', 'Full') : sfL('Minimal', 'Minimal');
        const escVal = (typeof esc === 'function') ? esc : (s => String(s));
        const lines = Object.entries(previewData).map(([k, v]) => {
            const pair = FEEDBACK_FIELD_LABELS[k];
            const displayKey = pair ? sfL(pair[0], pair[1]) : k;
            const displayVal = (k === 'message')
                ? (isFull
                    ? sfL('(Deine Nachricht + die Werte aus dieser Tabelle als Text)', '(Your message + the values from this table as text)')
                    : sfL('(Deine Nachricht)', '(Your message)'))
                : (k === 'email') ? sfL('(Entwickler)', '(Developer)') : escVal(v);
            return '<tr><td>' + escVal(displayKey) + '</td><td>' + displayVal + '</td></tr>';
        }).join('');

        const count = Object.keys(previewData).length;
        const html = `
            <div class="fdp-intro">
                ${sfL('Im Modus <strong>' + modeName + '</strong> werden <strong>' + count + ' Felder</strong> gesendet — hier mit deinen echten Werten:',
                      '<strong>' + count + ' fields</strong> are sent in <strong>' + modeName + '</strong> mode — shown here with your real values:')}
            </div>
            <div class="fdp-table-wrap">
                <table class="fdp-table">
                    <thead><tr><th>${sfL('Feld', 'Field')}</th><th>${sfL('Wert', 'Value')}</th></tr></thead>
                    <tbody>${lines}</tbody>
                </table>
            </div>
            <div class="fdp-note">
                ${sfL('Einzelne Zeiteinträge, Notizen, Projektnamen und das Schatten-Berichtsheft sind nie dabei — auch nicht im Modus „Vollständig“.',
                      'Individual time entries, notes, project names and the shadow report book are never included — not even in “Full” mode.')}
                <br>${sfL('Die Übertragung läuft verschlüsselt über EmailJS (HTTPS) direkt an den Entwickler.',
                          'The transfer runs encrypted via EmailJS (HTTPS) straight to the developer.')}
                <br><a href="/DSGVO/" target="_blank">${sfL('Datenschutzerklärung lesen', 'Read the privacy policy')}</a>
            </div>
        `;

        const modal = document.getElementById('feedbackDataPreviewModal');
        if (!modal) return;
        const modeEl = document.getElementById('fdpMode');
        const bodyEl = document.getElementById('fdpBody');
        if (modeEl) modeEl.textContent = modeName;
        if (bodyEl) { bodyEl.innerHTML = html; bodyEl.scrollTop = 0; }
        // Inline-display schlägt jede .active-Klasse → beides setzen
        modal.style.display = 'flex';
        modal.classList.add('active');
    }

    function closeFeedbackDataPreview() {
        const modal = document.getElementById('feedbackDataPreviewModal');
        if (!modal) return;
        modal.style.display = 'none';
        modal.classList.remove('active');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const modal = document.getElementById('feedbackDataPreviewModal');
        if (modal && modal.style.display !== 'none') closeFeedbackDataPreview();
    });

    function supportSendFeedback() {
        const text = document.getElementById('supportFeedbackText');
        if (!text || !text.value.trim()) {
            showCustomMessage('💬 Feedback', 'Bitte schreibe etwas in das Textfeld.', 'warning');
            return;
        }

        // DSGVO: Check consent
        const consent = document.getElementById('feedbackDSGVOConsent');
        if (!consent || !consent.checked) {
            showCustomMessage('🔒 Datenschutz', 'Bitte stimme der Datenschutzerklärung zu, bevor du dein Feedback sendest.', 'warning');
            if (consent) { consent.parentElement.style.animation = 'shake 0.4s ease'; setTimeout(() => consent.parentElement.style.animation = '', 500); }
            return;
        }

        const rating = data.supportRating || 0;
        const feedbackData = buildFeedbackData(text.value.trim(), rating);

        // Send via EmailJS
        if (typeof emailjs !== 'undefined') {
            const sendBtn = document.querySelector('#view-support .btn-primary[onclick*="supportSendFeedback"]');
            if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳ Sende...'; }

            emailjs.send('service_22m5bcs', 'template_xe5xc1k', feedbackData)
                .then(() => {
                    // Also store locally
                    if (!data.feedback) data.feedback = [];
                    data.feedback.push({ date: new Date().toISOString(), text: text.value.trim(), rating: rating, sent: true, dataMode: feedbackDataMode, consent: true });
                    save();
                    text.value = '';
                    data.supportRating = 0;
                    if (consent) consent.checked = false;
                    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '📨 Feedback senden'; }
                    showCustomMessage('📨 Gesendet!', 'Dein Feedback wurde erfolgreich zugestellt. Vielen Dank!', 'success');
                })
                .catch((err) => {
                    console.warn('EmailJS Fehler:', err);
                    // Fallback: store locally
                    if (!data.feedback) data.feedback = [];
                    data.feedback.push({ date: new Date().toISOString(), text: text.value.trim(), rating: rating, sent: false, dataMode: feedbackDataMode, consent: true });
                    save();
                    text.value = '';
                    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '📨 Feedback senden'; }
                    showCustomMessage('📨 Gespeichert', 'Feedback lokal gespeichert (Senden fehlgeschlagen). Wir arbeiten dran!', 'warning');
                });
        } else {
            // No EmailJS — store locally only
            if (!data.feedback) data.feedback = [];
            data.feedback.push({ date: new Date().toISOString(), text: text.value.trim(), rating: rating, sent: false, dataMode: feedbackDataMode, consent: true });
            save();
            text.value = '';
            showCustomMessage('📨 Gespeichert!', 'Dein Feedback wurde lokal gespeichert.', 'success');
        }
    }

    function supportFeatureRequest() {
        const idea = prompt('💡 Was wünschst du dir in MyWorkLog?');
        if (idea && idea.trim()) {
            // DSGVO: Feature requests send minimal data only (just the idea text)
            if (typeof emailjs !== 'undefined') {
                const minimalData = buildFeedbackData('💡 FEATURE REQUEST: ' + idea.trim(), 0);
                emailjs.send('service_22m5bcs', 'template_xe5xc1k', minimalData
                ).catch(e => console.warn('EmailJS Feature-Request Fehler:', e));
            }
            if (!data.featureRequests) data.featureRequests = [];
            data.featureRequests.push({ date: new Date().toISOString(), text: idea.trim() });
            save();
            showCustomMessage('💡 Notiert!', 'Dein Feature-Wunsch wurde gesendet. Danke für die Idee!', 'success');
        }
    }

    function supportShare() {
        const shareData = { title: 'MyWorkLog', text: 'Schau dir MyWorkLog an – die beste Zeiterfassung für Azubis!', url: window.location.href };
        if (navigator.share) {
            navigator.share(shareData).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showCustomMessage('📣 Link kopiert!', 'Der Link wurde in die Zwischenablage kopiert. Teile ihn mit deinen Freunden!', 'success');
            });
        }
    }

    // ============================================
    // FEATURE: QUICK ENTRY TEMPLATES
    // ============================================
    function renderQuickTemplates() {
        const grid = document.getElementById('quickTemplatesGrid');
        if (!grid) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const dayIndex = now.getDay();
        const defaultHours = (data.settings && data.settings.hours) ? (data.settings.hours[dayIndex] || 8) : 8;

        // Check if today already has an entry
        const hasTodayEntry = (data.entries || []).some(e => e.date === todayStr);

        const templates = [
            { icon: '💼', label: 'Standard Tag', sub: `${defaultHours}h Arbeit`, type: 'work', hours: defaultHours },
            { icon: '📚', label: 'Schultag', sub: `${defaultHours}h Schule`, type: 'school', hours: defaultHours },
            { icon: '🌴', label: 'Urlaub', sub: `${defaultHours}h Urlaub`, type: 'vacation', hours: defaultHours },
            { icon: '💊', label: 'Krankentag', sub: `${defaultHours}h Krank`, type: 'sick', hours: defaultHours },
            { icon: '⏰', label: 'Halber Tag', sub: `${(defaultHours / 2).toFixed(1)}h`, type: 'work', hours: defaultHours / 2 },
            { icon: '🔄', label: 'Überstunden', sub: `${(defaultHours + 2)}h Arbeit`, type: 'work', hours: defaultHours + 2 }
        ];

        grid.innerHTML = templates.map((t, i) => `
            <button class="quick-tpl-btn" onclick="applyQuickTemplate(${i})" ${hasTodayEntry ? 'title="Heute ist bereits ein Eintrag vorhanden"' : ''}>
                <span class="quick-tpl-icon">${mwlIconFromEmoji(t.icon, 20)}</span>
                <span class="quick-tpl-label">${t.label}</span>
                <span class="quick-tpl-sub">${t.sub}</span>
            </button>
        `).join('');

        // Store templates for use
        window._quickTemplates = templates;
    }

    function applyQuickTemplate(index) {
        const t = window._quickTemplates[index];
        if (!t) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Check for duplicate
        const existing = (data.entries || []).find(e => e.date === todayStr && e.type === t.type);
        if (existing) {
            if (!confirm(`Heute gibt es bereits einen ${t.type}-Eintrag. Trotzdem hinzufügen?`)) return;
        }

        const expected = (data.settings && data.settings.hours) ? (data.settings.hours[now.getDay()] || 8) : 8;
        const entry = {
            id: Date.now(),
            date: todayStr,
            type: t.type,
            worked: t.hours,
            diff: t.hours - expected,
            info: `Schnelleintrag: ${t.label}`,
            start: '',
            end: '',
            project: '',
            notes: `Per 1-Klick Vorlage erstellt`
        };

        data.entries.unshift(entry);
        if (t.type === 'vacation') {
            recalculateVacationUsed();
        }

        showSmartNotification('⚡ Schnelleintrag', `${t.icon} ${t.label} (${t.hours}h) für heute gebucht!`, 'success');
        save();
    }

    // ============================================
    // FEATURE: MOBILE BOTTOM NAVIGATION
    // ============================================