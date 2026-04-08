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

    function supportDonate(amount) {
        // Open real PayPal donation link
        const paypalUrl = `https://www.paypal.com/donate?business=sven9micha37%40gmail.com&amount=${amount}&currency_code=EUR&item_name=MyWorkLog+Unterst%C3%BCtzung`;
        window.open(paypalUrl, '_blank', 'noopener,noreferrer');
    }

    function supportDonateCustom() {
        const amount = prompt('Wie viel möchtest du spenden? (€)');
        if (amount && !isNaN(amount) && Number(amount) > 0) {
            supportDonate(Number(amount));
        }
    }

    function supportRate(rating) {
        const emojis = ['', '😞', '😕', '😐', '😊', '🤩'];
        const labels = ['', 'Schlecht', 'Nicht so gut', 'Okay', 'Gut', 'Fantastisch'];
        data.supportRating = rating;
        save();
        showCustomMessage(`${emojis[rating]} ${labels[rating]}!`, 'Danke für dein Feedback! Du hilfst uns, MyWorkLog besser zu machen.', 'success');
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

    function setFeedbackDataMode(mode) {
        feedbackDataMode = mode;
        const minBtn = document.getElementById('feedbackModeMinimal');
        const fullBtn = document.getElementById('feedbackModeFull');
        const info = document.getElementById('feedbackDataModeInfo');
        if (mode === 'minimal') {
            if (minBtn) { minBtn.style.background = 'rgba(16,185,129,0.15)'; minBtn.style.borderColor = 'rgba(16,185,129,0.3)'; minBtn.style.color = '#10b981'; }
            if (fullBtn) { fullBtn.style.background = 'rgba(255,255,255,0.03)'; fullBtn.style.borderColor = 'rgba(255,255,255,0.08)'; fullBtn.style.color = 'var(--text-muted)'; }
            if (info) info.innerHTML = '🔒 <strong>Minimal:</strong> Nur Rating, Nachricht & Datum werden gesendet. Keine Gerätedaten.';
        } else {
            if (fullBtn) { fullBtn.style.background = 'rgba(var(--primary-rgb),0.15)'; fullBtn.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; fullBtn.style.color = 'var(--primary)'; }
            if (minBtn) { minBtn.style.background = 'rgba(255,255,255,0.03)'; minBtn.style.borderColor = 'rgba(255,255,255,0.08)'; minBtn.style.color = 'var(--text-muted)'; }
            if (info) info.innerHTML = '📊 <strong>Vollständig:</strong> Rating, Nachricht, Nutzungsstatistiken, Einstellungen & Gerätedaten werden gesendet. Hilft uns, MyWorkLog zu verbessern.';
        }
    }

    function buildFeedbackData(message, rating) {
        const emojis = ['—', '😞', '😕', '😐', '😊', '🤩'];
        const userName = data.settings.name || 'Anonym';
        const dateStr = new Date().toLocaleString('de-DE');

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

    function showFeedbackDataPreview() {
        const previewData = buildFeedbackData(
            document.getElementById('supportFeedbackText')?.value?.trim() || '(Deine Nachricht)',
            data.supportRating || 0
        );
        const lines = Object.entries(previewData).map(([k, v]) => {
            const label = {
                email: '📧 Empfänger', message: '💬 Nachricht', rating: '⭐ Bewertung',
                rating_emoji: '😊 Emoji', from_name: '👤 Name', date: '📅 Datum',
                data_mode: '📊 Datenmodus', user_name: '👤 Benutzername',
                total_entries: '📋 Einträge gesamt', total_hours: '⏱️ Stunden gesamt',
                total_saldo: '📈 Saldo gesamt', total_work_days: '💼 Arbeitstage',
                total_school_days: '🎓 Schultage', total_vacation_days: '🏖️ Urlaubstage',
                total_sick_days: '🤒 Krankheitstage', total_holiday_days: '🎉 Feiertage',
                year: '📅 Jahr', year_entries: '📋 Einträge (Jahr)', year_hours: '⏱️ Stunden (Jahr)',
                year_saldo: '📈 Saldo (Jahr)', year_work_days: '💼 Arbeit (Jahr)',
                year_school_days: '🎓 Schule (Jahr)',
                avg_hours: '⌀ Stunden/Tag', weekly_soll: '📐 Wöchentl. Soll',
                best_weekday: '🏆 Produktivster Tag', best_weekday_hours: '🏆 Std. an dem Tag',
                active_months: '📆 Aktive Monate', break_threshold: '⏸️ Pausenschwelle',
                first_entry: '📅 Erster Eintrag', last_entry: '📅 Letzter Eintrag',
                days_using_app: '📆 Tage aktiv', current_streak: '🔥 Streak',
                vacation_total: '🏖️ Urlaub gesamt', vacation_used: '✈️ Urlaub verbraucht',
                vacation_remaining: '✅ Urlaub übrig',
                custom_types_count: '🎨 Eigene Typen', feedback_count: '💬 Feedbacks',
                feature_request_count: '💡 Feature Requests',
                theme_color: '🎨 Theme Farbe', theme_mode: '🌙 Theme Modus',
                screen_size: '🖥️ Bildschirm', viewport: '📐 Viewport',
                platform: '💻 Platform', language: '🌐 Sprache',
                timezone: '🕐 Zeitzone', online: '📶 Online',
                touch_device: '👆 Touch', pixel_ratio: '🔍 Pixel Ratio',
                user_agent: '🌐 User Agent',
            };
            const displayKey = label[k] || k;
            const displayVal = (k === 'message') ? '(Dein Text)' : (k === 'email') ? '(Entwickler)' : v;
            return `<tr><td style="padding:4px 8px; font-size:0.72rem; color:var(--text-muted); white-space:nowrap;">${displayKey}</td><td style="padding:4px 8px; font-size:0.72rem; color:var(--text-main); word-break:break-all; font-family:var(--font-mono);">${displayVal}</td></tr>`;
        }).join('');

        const count = Object.keys(previewData).length;
        const html = `
            <div style="max-height:60vh; overflow-y:auto; margin-top:12px;">
                <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">
                    📊 <strong>${count} Datenfelder</strong> werden im <strong>${feedbackDataMode === 'full' ? 'Vollständig' : 'Minimal'}</strong>-Modus gesendet:
                </div>
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr>
                        <th style="text-align:left; padding:6px 8px; font-size:0.7rem; color:var(--primary); border-bottom:1px solid rgba(var(--primary-rgb),0.2); text-transform:uppercase; letter-spacing:1px;">Feld</th>
                        <th style="text-align:left; padding:6px 8px; font-size:0.7rem; color:var(--primary); border-bottom:1px solid rgba(var(--primary-rgb),0.2); text-transform:uppercase; letter-spacing:1px;">Wert</th>
                    </tr></thead>
                    <tbody>${lines}</tbody>
                </table>
            </div>
            <div style="margin-top:16px; padding:10px 14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:10px; font-size:0.72rem; color:var(--text-muted); line-height:1.5;">
                🔒 Daten werden verschlüsselt über <strong>EmailJS</strong> (HTTPS) an den Entwickler gesendet. Keine Speicherung bei Drittanbietern über die E-Mail-Zustellung hinaus.
                <br>📄 <a href="Pages/DE-Gestz/DSGVO.html" target="_blank" style="color:var(--primary);">Datenschutzerklärung lesen</a>
            </div>
        `;
        showCustomMessage('👁️ Datenvorschau — ' + (feedbackDataMode === 'full' ? 'Vollständig' : 'Minimal'), html, 'info');
    }

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
                <span class="quick-tpl-icon">${t.icon}</span>
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