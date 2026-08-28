// ═══ CORE: ALERTS-TOASTS ═══
    // ===== SMART ALERTS SYSTEM (IMPROVED) =====
    let alertsHistory = [];

    // 🔴 EINE Liste, drei Verwendungen: Vorgabe, Haken wiederherstellen,
    // Haken speichern. Vorher standen die Namen an drei Stellen einzeln
    // ausgeschrieben — der fuenfte Schalter (exportReminder) war deshalb in
    // zwei davon nur nachtraeglich per try/catch angeflickt. Wer hier eine
    // Zeile ergaenzt, bekommt Vorgabe, Laden und Speichern geschenkt.
    //
    // `master` ist der Hauptschalter: steht er auf false, schweigt das ganze
    // System. Vorher liess sich genau EINE der zehn automatischen Meldungen
    // abschalten (die Backup-Erinnerung); die uebrigen neun — Nachmittags-
    // Check, Feierabend, Freitag, Wochenplan, zwei Meilensteine — feuerten
    // ohne jede Einstellung und waren nirgends abstellbar.
    const ALERT_TOGGLES = [
        { key: 'master',         id: 'alertMaster' },
        { key: 'saldoPositive',  id: 'alertSaldoPositive' },
        { key: 'saldoNegative',  id: 'alertSaldoNegative' },
        { key: 'shiftMax',       id: 'alertShiftMax' },
        { key: 'vacationLow',    id: 'alertVacationLow' },
        { key: 'dailyReminders', id: 'alertDailyReminders' },
        { key: 'milestones',     id: 'alertMilestones' },
        { key: 'exportReminder', id: 'alertExportReminder' }
    ];

    let alertSettings = {};
    ALERT_TOGGLES.forEach(t => { alertSettings[t.key] = true; });

    // Der eine Torwaechter. Ohne Kategorie: fragt nur den Hauptschalter.
    // Wird auch aus mobile-nav-extras.js gerufen (laedt spaeter, sieht die
    // Funktion also); der Test haelt beide Seiten zusammen.
    function mwlAlertsOn(category) {
        if (alertSettings.master === false) return false;
        return category ? alertSettings[category] !== false : true;
    }
    let lastAlertCheck = {};
    const ALERT_STORAGE_KEY = 'timetracker_alerts_v2';
    const ALERT_SETTINGS_KEY = 'timetracker_alert_settings_v2';
    const ALERT_CHECK_KEY = 'timetracker_alert_check';
    const ALERT_WELCOME_SHOWN = 'timetracker_alert_welcome_shown';
    const ALERT_RETENTION_DAYS = 7; // Alerts nach 7 Tagen löschen
    
    function initializeAlerts() {
        // Lade komplettes Alert-System aus localStorage
        const savedAlerts = localStorage.getItem(ALERT_STORAGE_KEY);
        if (savedAlerts) {
            try {
                alertsHistory = JSON.parse(savedAlerts);
                // Cleanup: Alte Alerts entfernen (älter als 7 Tage)
                const cutoffTime = Date.now() - (ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
                alertsHistory = alertsHistory.filter(a => a.timestamp > cutoffTime);
            } catch (e) {
                console.warn('Alert history corrupt, resetting');
                alertsHistory = [];
            }
        }
        
        const savedSettings = localStorage.getItem(ALERT_SETTINGS_KEY);
        if (savedSettings) {
            try {
                alertSettings = { ...alertSettings, ...JSON.parse(savedSettings) };
            } catch (e) {
                console.warn('Alert settings corrupt');
            }
        }
        
        const savedCheck = localStorage.getItem(ALERT_CHECK_KEY);
        if (savedCheck) {
            try {
                lastAlertCheck = JSON.parse(savedCheck);
            } catch (e) {
                console.warn('Alert check data corrupt');
            }
        }
        
        // Haken aus den Einstellungen zurueckschreiben
        ALERT_TOGGLES.forEach(t => {
            const el = document.getElementById(t.id);
            if (el) el.checked = alertSettings[t.key] !== false;
        });
        syncAlertMasterUi();
        
        // Zeige Willkommens-Alert nur beim ERSTEN Start (nie wieder danach)
        const welcomeShown = localStorage.getItem(ALERT_WELCOME_SHOWN);
        if (!welcomeShown && alertsHistory.length === 0) {
            const welcomeAlert = createAlert('Willkommen! 👋', 'Dein Alert-System ist aktiv. Wichtige Meldungen werden hier angezeigt und bleiben gespeichert.', 'success', '✨');
            welcomeAlert.isRead = false;
            alertsHistory.push(welcomeAlert);
            localStorage.setItem(ALERT_WELCOME_SHOWN, 'true');
            persistAlerts();
        }
        
        // Initiales Rendern
        checkAlertsThresholds();
        updateAlertBadge();
        renderAlertsList();
        // Aktualisiere Export-Info im Alerts-Panel
        try { updateAlertExportInfo(); } catch(e) {}
        
        console.log('✅ Alert System initialized', { alerts: alertsHistory.length });
    }
    
    function persistAlerts() {
        // Speichere mit Error-Handling
        try {
            localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alertsHistory));
            localStorage.setItem(ALERT_CHECK_KEY, JSON.stringify(lastAlertCheck));
        } catch (e) {
            console.error('Failed to persist alerts:', e);
        }
    }
    
    function saveAlertSettings() {
        ALERT_TOGGLES.forEach(t => {
            const el = document.getElementById(t.id);
            if (el) alertSettings[t.key] = el.checked;
        });
        try {
            localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(alertSettings));
        } catch (e) {
            console.error('Failed to save alert settings:', e);
        }
        syncAlertMasterUi();
    }

    // Bei ausgeschaltetem Hauptschalter werden die Kategorie-Haken wirklich
    // gesperrt, nicht nur blass gemalt: ein bedienbarer Schalter ohne Wirkung
    // ist eine Zusage ohne Deckung.
    function syncAlertMasterUi() {
        const on = alertSettings.master !== false;
        const group = document.getElementById('alertCategoryGroup');
        if (group) {
            group.classList.toggle('is-muted', !on);
            group.querySelectorAll('input[type="checkbox"]').forEach(el => { el.disabled = !on; });
        }
        const hint = document.getElementById('alertMasterHint');
        if (hint) {
            hint.textContent = on
                ? mwlAlertL('Einzelne Meldungen lassen sich unten abschalten.',
                            'Individual notifications can be switched off below.')
                : mwlAlertL('Aus. Es erscheinen keine automatischen Meldungen mehr.',
                            'Off. No automatic notifications will appear.');
        }
    }

    // JS-erzeugter Text; kurze Begriffe wie "Aus" gehoeren nicht ins globale
    // MAP in i18n-runtime.js, das sie ueberall sonst mituebersetzen wuerde.
    function mwlAlertL(de, en) {
        return (document.documentElement.lang === 'en') ? en : de;
    }

    function updateAlertExportInfo() {
        try {
            const last = localStorage.getItem('mwl_last_export');
            const el = document.getElementById('lastExportInfo');
            if (!el) return;
            if (!last) {
                el.textContent = mwlAlertL('Noch kein Backup erstellt', 'No backup yet');
            } else {
                // Wohin gesichert wurde, gehoert dazu: sonst steht bei einem
                // reinen Cloud-Nutzer ein Zeitstempel neben zwei
                // Datei-Export-Knoepfen und legt nahe, er haette exportiert.
                const kind = localStorage.getItem('mwl_last_backup_kind');
                const wohin = kind === 'cloud'     ? mwlAlertL('Cloud', 'Cloud')
                            : kind === 'encrypted' ? mwlAlertL('Datei, verschlüsselt', 'File, encrypted')
                            : kind === 'file'      ? mwlAlertL('Datei', 'File')
                            : '';
                el.textContent = new Date(last).toLocaleString(mwlLocale()) + (wohin ? ' · ' + wohin : '');
            }
        } catch (e) { console.warn('updateAlertExportInfo failed', e); }
    }
    
    function toggleAlertsPanel() {
        const panel = document.getElementById('alertsPanel');
        const overlay = document.getElementById('alertsOverlay');
        const badge = document.getElementById('alertBadge');
        
        if (panel.classList.contains('active')) {
            panel.classList.remove('active');
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
        } else {
            panel.classList.add('active');
            overlay.style.display = 'block';
            overlay.style.opacity = '1';
            // Markiere alle als gelesen wenn Panel öffnet
            markAllAlertsAsRead();
            renderAlertsList();
            // Aktualisiere Export-Info wenn Panel geöffnet wird
            updateAlertExportInfo();
        }
    }
    
    function checkAlertsThresholds() {
        if (!mwlAlertsOn()) return;
        const now = new Date();
        const today = now.toLocaleDateString('de-DE');  // bewusst fix: dient als Dedup-Schluessel, darf nicht mit der Sprache wechseln
        let newAlertsCreated = false;
        
        // 1. Prüfe positives Saldo
        if (alertSettings.saldoPositive && data.saldo >= 20) {
            const checkKey = `saldoPositive_${today}`;
            if (!lastAlertCheck[checkKey]) {
                const alert = createAlert('🏆 Saldo überschritten', `Glückwunsch! Dein Saldo hat +20h erreicht!`, 'warning', '🏆');
                alert.isRead = false;
                alertsHistory.unshift(alert);
                lastAlertCheck[checkKey] = true;
                newAlertsCreated = true;
                showToastNotification(alert);
            }
        }
        
        // 2. Prüfe negatives Saldo
        if (alertSettings.saldoNegative && data.saldo <= -5) {
            const checkKey = `saldoNegative_${today}`;
            if (!lastAlertCheck[checkKey]) {
                const alert = createAlert('⚠️ Saldo kritisch', `Dein Saldo ist unter -5h gefallen. Mehr arbeiten empfohlen!`, 'danger', '⚠️');
                alert.isRead = false;
                alertsHistory.unshift(alert);
                lastAlertCheck[checkKey] = true;
                newAlertsCreated = true;
                showToastNotification(alert);
            }
        }
        
        // 3. Prüfe heute's Schichten-Länge
        if (alertSettings.shiftMax) {
            // 🔴 `today` ist der Dedup-Schluessel im Format "28.8.2026" und darf
            // NICHT gegen e.date gehalten werden — das steht als "2026-08-28"
            // da. Der Vergleich ging nie auf, die Schicht-Warnung hat seit
            // jeher kein einziges Mal ausgeloest. Zwei Bedeutungen, zwei
            // Variablen.
            const todayIso = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
                           + '-' + String(now.getDate()).padStart(2, '0');
            const todayEntries = data.entries.filter(e => e.date === todayIso && e.type === 'work');
            let totalToday = 0;
            todayEntries.forEach(e => {
                const start = parseTime(e.start);
                const end = parseTime(e.end);
                totalToday += (end - start) / 60;
            });
            
            if (totalToday > 10) {
                const checkKey = `shiftMax_${today}`;
                if (!lastAlertCheck[checkKey]) {
                    const alert = createAlert('⏰ Lange Schicht heute', `Du hast bereits ${totalToday.toFixed(1)}h gearbeitet. Passe auf deine Gesundheit auf!`, 'warning', '⏰');
                    alert.isRead = false;
                    alertsHistory.unshift(alert);
                    lastAlertCheck[checkKey] = true;
                    newAlertsCreated = true;
                    showToastNotification(alert);
                }
            }
        }
        
        // 4. Prüfe Urlaub
        if (alertSettings.vacationLow && data.vacationUsed > data.vacationMax * 0.8) {
            const checkKey = `vacationLow_${today}`;
            if (!lastAlertCheck[checkKey]) {
                const remaining = data.vacationMax - data.vacationUsed;
                const alert = createAlert('📅 Urlaub läuft aus', `Nur noch ${remaining.toFixed(1)} Urlaubstage übrig. Planen Sie rechtzeitig!`, 'warning', '📅');
                alert.isRead = false;
                alertsHistory.unshift(alert);
                lastAlertCheck[checkKey] = true;
                newAlertsCreated = true;
                showToastNotification(alert);
            }
        }
        
        // Speichern und UI update
        if (newAlertsCreated) {
            persistAlerts();
            updateAlertBadge();
        }
    }
    
    // ============================================
    // UNIFIED TOAST NOTIFICATION SYSTEM
    // ============================================
    const _toastQueue = [];
    let _toastContainer = null;
    const TOAST_MAX_VISIBLE = 4;
    const TOAST_DURATION = 5000;

    function _ensureToastContainer() {
        if (_toastContainer && document.body.contains(_toastContainer)) return _toastContainer;
        _toastContainer = document.createElement('div');
        _toastContainer.id = 'toastContainer';
        _toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-height: calc(100dvh - 40px);
            overflow: hidden;
            pointer-events: none;
        `;
        document.body.appendChild(_toastContainer);
        return _toastContainer;
    }

    function _getToastColors(type) {
        switch (type) {
            case 'danger': case 'error':
                return { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', icon: '#ef4444', bar: '#ef4444' };
            case 'warning':
                return { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', icon: '#f59e0b', bar: '#f59e0b' };
            case 'success':
                return { bg: 'rgba(16,185,129,0.12)', border: '#10b981', icon: '#10b981', bar: '#10b981' };
            default:
                return { bg: 'rgba(var(--primary-rgb),0.12)', border: 'var(--primary)', icon: 'var(--primary)', bar: 'var(--primary)' };
        }
    }

    function showToast(title, message, type = 'info', icon = null, duration = TOAST_DURATION) {
        const container = _ensureToastContainer();
        const colors = _getToastColors(type);
        // Aufrufer reichen teils noch Emoji-Zeichen als `icon` durch (auch aus
        // gespeicherten Alerts) — mwlIconFromEmoji uebersetzt sie an der Ausgabe
        // und laesst fertiges SVG unveraendert durch.
        const _fallback = (type === 'danger' || type === 'error') ? 'xCircle'
                        : type === 'warning' ? 'alert'
                        : type === 'success' ? 'checkCircle' : 'info';
        const autoIcon = (icon ? mwlIconFromEmoji(icon, 20) : '') || mwlIcon(_fallback, 20);

        // Limit: max sichtbare Toasts
        const existing = container.querySelectorAll('.tt-toast');
        if (existing.length >= TOAST_MAX_VISIBLE) {
            _dismissToast(existing[0]);
        }

        const toast = document.createElement('div');
        toast.className = 'tt-toast';
        toast.style.cssText = `
            pointer-events: auto;
            background: #18181b;
            border: 1px solid ${colors.border}33;
            border-left: 4px solid ${colors.border};
            border-radius: 14px;
            padding: 14px 16px 10px;
            max-width: 380px;
            min-width: 300px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.04) inset;
            backdrop-filter: blur(24px);
            font-family: var(--font-main, -apple-system, BlinkMacSystemFont, sans-serif);
            cursor: pointer;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.32,0.72,0,1), opacity 0.35s ease;
            position: relative;
            overflow: hidden;
        `;

        toast.innerHTML = `
            <div style="display:flex; gap:12px; align-items:flex-start;">
                <div style="flex-shrink:0; margin-top:1px; line-height:0; color:${colors.border};">${autoIcon}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:650; font-size:0.9rem; color:#fafafa; margin-bottom:3px; line-height:1.3;">${title}</div>
                    <div style="font-size:0.825rem; color:#a1a1aa; line-height:1.45;">${message}</div>
                </div>
                <button style="background:none; border:none; color:#52525b; cursor:pointer; font-size:18px; line-height:1; padding:0 0 0 4px; margin:-2px -4px 0 0; transition:color 0.15s;" onmouseover="this.style.color='#d4d4d8'" onmouseout="this.style.color='#52525b'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            </div>
            <div style="position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(255,255,255,0.04);">
                <div class="tt-toast-progress" style="height:100%; width:100%; background:${colors.bar}; border-radius:0 0 0 14px; transition:width linear;"></div>
            </div>
        `;

        // Click-to-dismiss (close button or whole toast)
        toast.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            _dismissToast(toast);
        });
        toast.addEventListener('click', () => _dismissToast(toast));

        // Swipe-to-dismiss (touch)
        let _swStartX = 0, _swStartY = 0, _swDeltaX = 0, _swSwiping = false;
        toast.addEventListener('touchstart', (e) => {
            _swStartX = e.touches[0].clientX;
            _swStartY = e.touches[0].clientY;
            _swDeltaX = 0;
            _swSwiping = false;
            toast.style.transition = 'none';
        }, { passive: true });
        toast.addEventListener('touchmove', (e) => {
            const dx = e.touches[0].clientX - _swStartX;
            const dy = e.touches[0].clientY - _swStartY;
            if (!_swSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) _swSwiping = true;
            if (_swSwiping) {
                _swDeltaX = dx;
                toast.style.transform = `translateX(${dx}px)`;
                toast.style.opacity = Math.max(0.2, 1 - Math.abs(dx) / 250);
            }
        }, { passive: true });
        toast.addEventListener('touchend', () => {
            if (_swSwiping && Math.abs(_swDeltaX) > 80) {
                const dir = _swDeltaX > 0 ? '120%' : '-120%';
                toast.style.transition = 'transform 0.3s ease, opacity 0.25s ease';
                toast.style.transform = `translateX(${dir})`;
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
                toast._dismissing = true;
            } else {
                toast.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1), opacity 0.2s ease';
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            }
            _swSwiping = false;
        });

        // Pause progress on hover
        let paused = false;
        toast.addEventListener('mouseenter', () => { paused = true; });
        toast.addEventListener('mouseleave', () => { paused = false; });

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            });
        });

        // Progress bar countdown
        const progressBar = toast.querySelector('.tt-toast-progress');
        const startTime = performance.now();
        let elapsed = 0;
        function tickProgress(now) {
            if (!document.body.contains(toast)) return;
            if (!paused) elapsed += (now - (tickProgress._last || now));
            tickProgress._last = now;
            const pct = Math.max(0, 1 - elapsed / duration);
            progressBar.style.width = (pct * 100) + '%';
            if (pct <= 0) {
                _dismissToast(toast);
                return;
            }
            requestAnimationFrame(tickProgress);
        }
        requestAnimationFrame(tickProgress);

        return toast;
    }

    function _dismissToast(toast) {
        if (!toast || toast._dismissing) return;
        toast._dismissing = true;
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        toast.style.marginTop = `-${toast.offsetHeight + 10}px`;
        toast.style.transition = 'transform 0.35s ease, opacity 0.3s ease, margin-top 0.3s ease 0.1s';
        setTimeout(() => toast.remove(), 400);
    }

    // Legacy wrapper for old code
    function showToastNotification(alert) {
        showToast(alert.title, alert.message, alert.type, alert.icon);
    }
    
    function createAlert(title, message, severity = 'info', icon = 'ℹ️') {
        return {
            id: Date.now() + Math.random(),
            title: title,
            message: message,
            type: severity,
            icon: icon,
            date: new Date().toLocaleDateString(mwlLocale()),
            time: new Date().toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit' }),
            timestamp: Date.now(),
            isRead: false
        };
    }
    
    function markAllAlertsAsRead() {
        alertsHistory.forEach(alert => alert.isRead = true);
        persistAlerts();
    }
    
    function updateAlertBadge() {
        const badge = document.getElementById('alertBadge');
        const unreadCount = alertsHistory.filter(a => !a.isRead).length;
        
        if (unreadCount > 0) {
            badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.opacity = '1';
            badge.style.display = 'flex';
            badge.style.animation = 'pulse 2s infinite';
        } else {
            badge.style.display = 'none';
            badge.style.animation = 'none';
        }
    }
    
    function renderAlertsList() {
        const container = document.getElementById('alertsList');
        container.innerHTML = '';
        
        if (alertsHistory.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">✨<br>Keine Alerts – alles läuft perfekt!</div>';
            return;
        }
        
        alertsHistory.forEach(alert => {
            const alertEl = document.createElement('div');
            alertEl.className = `alert-item ${alert.type}`;
            alertEl.style.opacity = alert.isRead ? '0.6' : '1';
            alertEl.style.borderLeftWidth = alert.isRead ? '2px' : '4px';
            alertEl.innerHTML = `
                <div class="alert-item-icon">${mwlIconFromEmoji(alert.icon, 18)}</div>
                <div class="alert-item-content">
                    <div class="alert-item-title" style="font-weight: ${alert.isRead ? '400' : '700'};">${alert.title}</div>
                    <div style="font-size:0.9rem; margin-bottom:4px; color:var(--text-main);">${alert.message}</div>
                    <div class="alert-item-time">${alert.date} · ${alert.time}</div>
                </div>
                <button class="alert-item-dismiss" onclick="dismissAlert(${alert.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            `;
            container.appendChild(alertEl);
        });
    }
    
    function filterAlerts(type) {
        // Update button states
        document.querySelectorAll('.alert-filter-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        const container = document.getElementById('alertsList');
        if (type === 'all') {
            renderAlertsList();
        } else {
            const filtered = alertsHistory.filter(a => a.type === type);
            container.innerHTML = '';
            if (filtered.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Keine ${type === 'warning' ? 'Warnungen' : 'Erfolge'} gefunden.</div>`;
            } else {
                filtered.forEach(alert => {
                    const alertEl = document.createElement('div');
                    alertEl.className = `alert-item ${alert.type}`;
                    alertEl.style.opacity = alert.isRead ? '0.6' : '1';
                    alertEl.innerHTML = `
                        <div class="alert-item-icon">${mwlIconFromEmoji(alert.icon, 18)}</div>
                        <div class="alert-item-content">
                            <div class="alert-item-title">${alert.title}</div>
                            <div style="font-size:0.9rem; margin-bottom:4px;">${alert.message}</div>
                            <div class="alert-item-time">${alert.date} · ${alert.time}</div>
                        </div>
                        <button class="alert-item-dismiss" onclick="dismissAlert(${alert.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                    `;
                    container.appendChild(alertEl);
                });
            }
        }
    }
    
    function dismissAlert(id) {
        alertsHistory = alertsHistory.filter(a => a.id !== id);
        persistAlerts();
        updateAlertBadge();
        renderAlertsList();
    }
    
    function clearAllAlerts() {
        if (confirm('Alle Alerts wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) {
            alertsHistory = [];
            lastAlertCheck = {};
            persistAlerts();
            updateAlertBadge();
            renderAlertsList();
            showCustomMessage('✅ Alle Alerts gelöscht', 'Dein Alert-Verlauf wurde zurückgesetzt.', 'success');
        }
    }