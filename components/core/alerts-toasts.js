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
        
        // Icons erst hier setzen — mwlIcon steht als globale Funktion bereit,
        // sobald icons.js geladen ist; im Markup waeren es Textzeichen.
        const setIcon = (id, name, size) => {
            const el = document.getElementById(id);
            if (el && typeof mwlIcon === 'function') el.innerHTML = mwlIcon(name, size || 16);
        };
        setIcon('alertsSettingsBtn', 'settings');
        const closeBtn = document.querySelector('#alertsPanel .ap-head__actions .ap-iconbtn:last-child');
        if (closeBtn && typeof mwlIcon === 'function') closeBtn.innerHTML = mwlIcon('x', 16);
        document.querySelectorAll('#alertsPanel .ap-btn__icon[data-icon]').forEach(el => {
            if (typeof mwlIcon === 'function') el.innerHTML = mwlIcon(el.dataset.icon, 14);
        });

        const setBtn = document.getElementById('alertsSettingsBtn');
        if (setBtn && !setBtn.dataset.wired) {
            setBtn.dataset.wired = '1';
            setBtn.addEventListener('click', () => {
                showAlertsView(setBtn.getAttribute('aria-expanded') === 'true' ? 'log' : 'settings');
            });
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
                ? mwlAlertL('Einzelne Meldungen lassen sich in den Einstellungen abschalten.',
                            'Individual notifications can be switched off in the settings.')
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
        const panel   = document.getElementById('alertsPanel');
        const overlay = document.getElementById('alertsOverlay');
        if (!panel) return;
        const open = !panel.classList.contains('active');

        panel.classList.toggle('active', open);
        panel.setAttribute('aria-hidden', String(!open));
        if (overlay) overlay.classList.toggle('is-open', open);

        if (open) {
            // Beim Oeffnen immer im Protokoll landen, nie in den Einstellungen:
            // man oeffnet dieses Schubfach, um zu LESEN.
            showAlertsView('log');
            // 🔴 Reihenfolge ist entscheidend: ERST zeichnen, DANN als gelesen
            // markieren. Andersherum sind beim Zeichnen schon alle gelesen und
            // die Hervorhebung des Neuen war nie zu sehen — der gefuellte Punkt
            // haette nie einen einzigen Moment lang existiert. Bewusst KEIN
            // zweites Rendern danach: die Punkte sollen nicht unter der Hand
            // ausgehen, waehrend man sie liest. Beim naechsten Oeffnen sind sie
            // gelesen.
            renderAlertsList();
            updateAlertExportInfo();
            markAllAlertsAsRead();
            updateAlertBadge();
        }
    }

    // Zwei Ansichten in einem Schubfach. Der Hauptschalter im Kopf bleibt in
    // beiden stehen.
    function showAlertsView(which) {
        const log = document.getElementById('alertsLogView');
        const set = document.getElementById('alertsSettingsView');
        const btn = document.getElementById('alertsSettingsBtn');
        const foot = document.getElementById('alertsFoot');
        if (!log || !set) return;
        const settings = which === 'settings';
        log.hidden = settings;
        set.hidden = !settings;
        if (foot) foot.hidden = settings;
        if (btn) btn.setAttribute('aria-expanded', String(settings));
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
        _toastContainer.className = 'tt-toasts';
        document.body.appendChild(_toastContainer);
        return _toastContainer;
    }

    // Die Farben liegen in alerts.css, damit sie im hellen Theme mitziehen.
    // Hier bleibt nur die Zuordnung Typ → Rolle.
    function _toastRole(type) {
        if (type === 'danger' || type === 'error') return 'danger';
        if (type === 'warning' || type === 'success') return type;
        return 'info';
    }

    function showToast(title, message, type = 'info', icon = null, duration = TOAST_DURATION) {
        const container = _ensureToastContainer();
        const role = _toastRole(type);
        // Aufrufer reichen teils noch Emoji-Zeichen als `icon` durch (auch aus
        // gespeicherten Alerts) — mwlIconFromEmoji uebersetzt sie an der Ausgabe
        // und laesst fertiges SVG unveraendert durch.
        const _fallback = role === 'danger' ? 'xCircle'
                        : role === 'warning' ? 'alert'
                        : role === 'success' ? 'checkCircle' : 'info';
        const autoIcon = (icon ? mwlIconFromEmoji(icon, 18) : '') || mwlIcon(_fallback, 18);

        // Limit: max sichtbare Toasts
        const existing = container.querySelectorAll('.tt-toast');
        if (existing.length >= TOAST_MAX_VISIBLE) {
            _dismissToast(existing[0]);
        }

        const toast = document.createElement('div');
        toast.className = 'tt-toast';
        toast.setAttribute('data-role', role);
        toast.setAttribute('role', role === 'danger' ? 'alert' : 'status');

        toast.innerHTML =
            '<span class="tt-toast__icon" aria-hidden="true">' + autoIcon + '</span>'
          + '<div class="tt-toast__body">'
          +   '<p class="tt-toast__title">' + apEscape(title) + '</p>'
          +   '<p class="tt-toast__msg">' + apEscape(message) + '</p>'
          + '</div>'
          + '<button type="button" class="tt-toast__x" aria-label="'
          +   mwlAlertL('Schließen', 'Close') + '">' + mwlIcon('x', 14) + '</button>'
          + '<span class="tt-toast__track"><i class="tt-toast-progress"></i></span>';

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

        // 🔴 Einblenden NICHT ueber requestAnimationFrame: das steht still,
        // solange `document.hidden` wahr ist (Hintergrundtab, Automation) —
        // der Toast bliebe dann unsichtbar ausserhalb des Bildes stehen. Ein
        // Layout-Lesezugriff erzwingt den Startwert, danach greift der
        // Uebergang aus dem Stylesheet.
        void toast.offsetWidth;
        toast.classList.add('is-in');

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
        // Hinausgehen darf schneller sein als hereinkommen: beim Erscheinen
        // schaut man hin, beim Schliessen will man es weg haben. Die Hoehe
        // muss inline bleiben — sie haengt am Inhalt.
        toast.style.marginTop = '-' + (toast.offsetHeight + 10) + 'px';
        toast.classList.remove('is-in');
        toast.classList.add('is-out');
        setTimeout(() => toast.remove(), 280);
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
        
        if (!badge) return;
        // 🔴 Inline `style.display` schlaegt jede Klassenregel — die Sichtbarkeit
        // MUSS deshalb weiter ueber style.display laufen (CLAUDE.md). Die
        // Dauerpulsation ist raus: ein Abzeichen, das ohne Unterlass blinkt,
        // ist genau die Sorte Unruhe, die diese Ansicht loswerden soll.
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        badge.style.animation = 'none';
    }
    
    // 🔴 EINE Stelle, an der eine Protokollzeile entsteht. Vorher stand
    // dasselbe Markup zweimal im JS — einmal in renderAlertsList, einmal in
    // filterAlerts — und die beiden waren bereits auseinandergelaufen (nur
    // eine Fassung setzte Randbreite und Schriftschnitt fuer Ungelesenes).
    // Die Filterleiste ist ersatzlos entfallen: sie kannte nur "Warnungen"
    // und "Erfolge", waehrend das System vier Typen erzeugt — `info` und
    // `danger` fielen durch beide Raster.
    function apEscape(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function apDayLabel(ts) {
        const d = new Date(ts); d.setHours(0, 0, 0, 0);
        const heute = new Date(); heute.setHours(0, 0, 0, 0);
        const diff = Math.round((heute - d) / 86400000);
        if (diff === 0) return mwlAlertL('Heute', 'Today');
        if (diff === 1) return mwlAlertL('Gestern', 'Yesterday');
        return d.toLocaleDateString(mwlLocale(), { weekday: 'long', day: '2-digit', month: '2-digit' });
    }

    function apEntryHTML(alert) {
        const zeit = new Date(alert.timestamp || Date.now())
            .toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit' });
        const typ = ['warning', 'danger', 'success'].indexOf(alert.type) > -1 ? alert.type : 'info';
        return '<article class="ap-entry" data-type="' + typ + '" data-unread="' + (alert.isRead ? '0' : '1') + '">'
             + '<span class="ap-dot" aria-hidden="true"></span>'
             + '<div class="ap-entry__body">'
             +   '<div class="ap-entry__head">'
             +     '<h3 class="ap-entry__title">' + apEscape(alert.title) + '</h3>'
             +     '<time class="ap-entry__time">' + apEscape(zeit) + '</time>'
             +   '</div>'
             +   '<p class="ap-entry__msg">' + apEscape(alert.message) + '</p>'
             + '</div>'
             + '<button type="button" class="ap-entry__x" data-dismiss="' + apEscape(alert.id) + '" '
             +   'aria-label="' + mwlAlertL('Meldung entfernen', 'Dismiss notification') + '">'
             +   mwlIcon('x', 15) + '</button>'
             + '</article>';
    }

    function renderAlertsList() {
        const container = document.getElementById('alertsList');
        if (!container) return;

        const sub = document.getElementById('alertsHeadSub');
        if (sub) {
            const offen = alertsHistory.filter(a => !a.isRead).length;
            sub.textContent = offen > 0
                ? mwlAlertL(offen + (offen === 1 ? ' neue Meldung' : ' neue Meldungen'),
                            offen + (offen === 1 ? ' new notification' : ' new notifications'))
                : mwlAlertL('Letzte 7 Tage', 'Last 7 days');
        }

        if (alertsHistory.length === 0) {
            container.innerHTML =
                '<div class="ap-empty">'
              + '<span class="ap-empty__icon">' + mwlIcon('checkCircle', 28) + '</span>'
              + '<p class="ap-empty__title">' + mwlAlertL('Keine Meldungen', 'No notifications') + '</p>'
              + '<p class="ap-empty__text">' + mwlAlertL(
                    'Hier steht, was die App von sich aus gemeldet hat. Ältere Einträge als sieben Tage werden entfernt.',
                    'This is what the app reported on its own. Entries older than seven days are removed.') + '</p>'
              + '</div>';
            return;
        }

        // Nach Tagen gruppieren, neueste zuerst. 🔴 Je Tag ein eigener Kasten:
        // die Tagesueberschrift klebt beim Scrollen, und `position: sticky`
        // haelt ein Element in seinem ELTERNkasten fest. Laegen alle Zeilen in
        // einer Liste, stapelten sich die Ueberschriften uebereinander.
        const sortiert = alertsHistory.slice().sort((x, y) => (y.timestamp || 0) - (x.timestamp || 0));
        let html = '', letzterTag = null;
        sortiert.forEach(alert => {
            const tag = apDayLabel(alert.timestamp || Date.now());
            if (tag !== letzterTag) {
                if (letzterTag !== null) html += '</section>';
                html += '<section class="ap-daygroup"><h2 class="ap-day">' + apEscape(tag) + '</h2>';
                letzterTag = tag;
            }
            html += apEntryHTML(alert);
        });
        if (letzterTag !== null) html += '</section>';
        container.innerHTML = html;
    }

    function dismissAlert(id) {
        // 🔴 Die Id kommt aus einem Attribut und ist damit eine ZEICHENKETTE,
        // gespeichert ist sie als Zahl (Date.now() + Math.random()). Ein
        // strikter Vergleich trifft nie — der Knopf haette sich bedienen
        // lassen und nichts getan. Beide Seiten auf Text bringen.
        const gesucht = String(id);
        alertsHistory = alertsHistory.filter(a => String(a.id) !== gesucht);
        persistAlerts();
        updateAlertBadge();
        renderAlertsList();
    }
    
    function clearAllAlerts() {
        // `confirm()` ist ein Systemdialog: andere Schrift, andere Farben,
        // blockiert den Zug. Die App bringt einen eigenen mit.
        const frage = () => {
            alertsHistory = [];
            lastAlertCheck = {};
            persistAlerts();
            updateAlertBadge();
            renderAlertsList();
        };
        if (typeof showCustomConfirm === 'function') {
            showCustomConfirm(
                mwlAlertL('Alle Meldungen löschen?', 'Delete all notifications?'),
                mwlAlertL('Das Protokoll wird geleert. Rückgängig geht das nicht.',
                          'The log will be emptied. This cannot be undone.'),
                frage);
        } else {
            frage();
        }
    }

    // Ein Klick-Empfaenger fuer die ganze Liste statt eines onclick je Zeile:
    // die Zeilen werden bei jedem Rendern neu gebaut, einzelne Handler waeren
    // jedes Mal neu zu binden.
    document.addEventListener('click', function (e) {
        const btn = e.target.closest && e.target.closest('.ap-entry__x[data-dismiss]');
        if (!btn) return;
        e.stopPropagation();
        dismissAlert(btn.getAttribute('data-dismiss'));
    });
