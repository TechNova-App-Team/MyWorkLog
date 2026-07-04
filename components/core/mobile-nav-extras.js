// ═══ CORE: MOBILE-NAV-EXTRAS ═══
    window._clsBC = 'mobile-nav-extras.js-start';

    // Tabs that live in the "Mehr" sheet (not shown in main nav strip)
    const _MOB_MORE_TABS = ['yearview','goals','school','ihk','monthcompare','weekview','aibot','analytics-pro','berichtsheft'];

    function mobNavSwitch(tabId) {
        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) {
            sidebar.classList.remove('active');
            sidebar.classList.add('hidden');
            isSidebarOpen = false;
        }
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';

        // Switch tab using existing system
        if (typeof switchTab === 'function') switchTab(tabId);

        // Update active states on main nav buttons
        document.querySelectorAll('.mob-nav-btn:not(.mob-nav-hidden-sync)').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`mobNav-${tabId}`);
        if (activeBtn) activeBtn.classList.add('active');

        // If it's a "mehr" tab, highlight the "mehr" button instead
        const moreBtn = document.getElementById('mobNav-more');
        if (moreBtn) {
            if (_MOB_MORE_TABS.includes(tabId)) {
                moreBtn.classList.add('active', 'more-active');
            } else {
                moreBtn.classList.remove('more-active');
            }
        }

        // Animate sliding indicator
        _updateMobNavIndicator(tabId);
    }

    // ── Sliding pill indicator ──
    function _updateMobNavIndicator(activeTabId) {
        const inner = document.getElementById('mobNavInner');
        const indicator = document.getElementById('mobNavIndicator');
        if (!inner || !indicator) return;

        // Find the visible active button (not a hidden sync stub)
        let targetBtn = null;
        if (!_MOB_MORE_TABS.includes(activeTabId)) {
            targetBtn = document.getElementById('mobNav-' + activeTabId);
        }
        if (!targetBtn || targetBtn.classList.contains('mob-nav-hidden-sync')) {
            targetBtn = document.getElementById('mobNav-more');
        }
        if (!targetBtn) { indicator.style.opacity = '0'; return; }

        const innerRect = inner.getBoundingClientRect();
        const btnRect = targetBtn.getBoundingClientRect();
        const left = btnRect.left - innerRect.left;
        const width = btnRect.width;

        indicator.style.left = left + 'px';
        indicator.style.width = width + 'px';
        indicator.style.opacity = '1';
    }

    // ── More sheet ──
    function mobNavShowMore() {
        const overlay = document.getElementById('mobMoreOverlay');
        const sheet = document.getElementById('mobMoreSheet');
        const moreBtn = document.getElementById('mobNav-more');
        if (overlay) overlay.classList.add('open');
        if (sheet) sheet.classList.add('open');
        if (moreBtn) moreBtn.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function mobNavHideMore() {
        const overlay = document.getElementById('mobMoreOverlay');
        const sheet = document.getElementById('mobMoreSheet');
        if (overlay) {
            overlay.classList.remove('open');
            setTimeout(() => { if (overlay && !overlay.classList.contains('open')) overlay.style.display = ''; }, 20);
        }
        if (sheet) sheet.classList.remove('open');
        document.body.style.overflow = '';
        // Re-check active state for more button
        const moreBtn = document.getElementById('mobNav-more');
        if (moreBtn) {
            const activeTab = document.querySelector('.view-section.active');
            const activeId = activeTab ? activeTab.id.replace('view-', '') : '';
            if (!_MOB_MORE_TABS.includes(activeId)) {
                moreBtn.classList.remove('active');
            }
        }
    }

    // ── Nav hide/show ──
    function mobNavToggleHide() {
        const nav = document.getElementById('mobileBottomNav');
        if (!nav) return;
        if (nav.classList.contains('nav-hidden')) {
            mobNavShowNav();
        } else {
            mobNavHideNav();
        }
    }

    function mobNavHideNav() {
        const nav = document.getElementById('mobileBottomNav');
        const restore = document.getElementById('mobNavRestoreBtn');
        if (nav) nav.classList.add('nav-hidden');
        if (restore) restore.classList.add('visible');
        try { sessionStorage.setItem('mob_nav_hidden', '1'); } catch(e) {}
    }

    function mobNavShowNav() {
        const nav = document.getElementById('mobileBottomNav');
        const restore = document.getElementById('mobNavRestoreBtn');
        if (nav) nav.classList.remove('nav-hidden');
        if (restore) restore.classList.remove('visible');
        try { sessionStorage.removeItem('mob_nav_hidden'); } catch(e) {}
    }

    // Init on DOM ready
    (function initMobNav() {
        function _init() {
            // Restore hidden state from sessionStorage
            try {
                if (sessionStorage.getItem('mob_nav_hidden') === '1') mobNavHideNav();
            } catch(e) {}

            // Initial indicator position
            const activeBtn = document.querySelector('.mobile-bottom-nav-inner .mob-nav-btn.active');
            if (activeBtn) {
                const tabId = activeBtn.id ? activeBtn.id.replace('mobNav-', '') : '';
                if (tabId) _updateMobNavIndicator(tabId);
            }

            // Swipe-down to hide the nav
            let touchStartY = 0;
            const nav = document.getElementById('mobileBottomNav');
            if (nav) {
                nav.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
                nav.addEventListener('touchend', e => {
                    const diff = e.changedTouches[0].clientY - touchStartY;
                    if (diff > 40) mobNavHideNav();
                }, { passive: true });
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _init);
        } else {
            _init();
        }
    })();

    // Sync bottom nav with sidebar tab switches
    const _origSwitchTab = typeof switchTab === 'function' ? switchTab : null;

    // ============================================
    // FEATURE: REAL-TIME BREAK WARNING
    // ============================================
    let breakWarningInterval = null;

    function startBreakWarningMonitor() {
        if (breakWarningInterval) clearInterval(breakWarningInterval);

        breakWarningInterval = setInterval(() => {
            // Check if timer is running
            if (!window.timer || !window.timer.running) {
                const banner = document.getElementById('breakWarningBanner');
                if (banner) banner.classList.remove('visible');
                return;
            }

            // Calculate elapsed working time in hours
            const elapsed = window.timer.elapsed || 0;
            const breakTime = window.timer.breakTime || 0;
            const workHours = (elapsed - breakTime) / 3600;

            const banner = document.getElementById('breakWarningBanner');
            const text = document.getElementById('breakWarningText');
            if (!banner || !text) return;

            // German labor law: 30min break after 6h, 45min after 9h
            if (workHours >= 9 && breakTime < 2700) {
                text.textContent = `⏰ ${workHours.toFixed(1)}h Arbeit! Gesetzlich: mind. 45 Min Pause nötig!`;
                banner.classList.add('visible');
            } else if (workHours >= 6 && breakTime < 3600 * 0.5) {
                text.textContent = `Du arbeitest seit ${workHours.toFixed(1)}h – bitte mach eine Pause (mind. 30 Min)!`;
                banner.classList.add('visible');
            } else if (workHours >= 4 && breakTime < 600) {
                text.textContent = `${workHours.toFixed(1)}h ohne Pause – gönn dir eine kurze Auszeit 🧘`;
                banner.classList.add('visible');
            } else {
                banner.classList.remove('visible');
            }
        }, 30000); // Check every 30 seconds
    }

    // ============================================
    // INIT NEW DASHBOARD WIDGETS
    // ============================================
    function initNewDashboardWidgets() {


        try { renderQuickTemplates(); } catch(e) { console.warn('Quick Templates init error:', e); }
        try { startBreakWarningMonitor(); } catch(e) { console.warn('Break Warning init error:', e); }
    }

    // Hook into updateUI to refresh new widgets
    const _origUpdateUI = typeof updateUI === 'function' ? updateUI : null;
    if (_origUpdateUI) {
        // We'll call our widgets from the existing updateUI flow
        // They are already called separately, so just ensure on page load
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initNewDashboardWidgets, 500));
    } else {
        setTimeout(initNewDashboardWidgets, 500);
    }

    // ============================================
    // SMART NOTIFICATION TRIGGERS
    // ============================================

    // Legacy wrapper — routes to unified toast system
    function showSmartNotification(title, message, type = 'info') {
        showToast(title, message, type);
    }

    // Smart Notification Trigger Funktion
    function checkSmartNotifications() {
        // Ensure data is loaded from localStorage
        const stored = localStorage.getItem('tg_pro_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.entries) data.entries = parsed.entries;
            if (parsed.settings) data.settings = parsed.settings;
        }
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const dayIndex = now.getDay(); // 0=So, 1=Mo, ..., 5=Fr, 6=Sa
        const isFriday = dayIndex === 5;
        const todayEntries = data.entries.filter(e => e.date === today);
        let todayWorked = 0;

        // Gearbeitete Stunden aus den Einträgen summieren
        todayEntries.forEach(e => {
            todayWorked += e.worked || 0;
        });

        // Laufenden Timer einrechnen (mit Break-Abzug)
        if (timer && timer.running && timer.start) {
            const timerMs = (timer.paused || 0) + (Date.now() - timer.start) - (timer.breakTime || 0);
            const timerHours = Math.max(0, timerMs / 3.6e6);
            todayWorked += timerHours;
        }

        // Laufende Schicht einrechnen (Start-Zeit aus Draft, noch nicht gespeichert)
        if (todayWorked === 0) {
            try {
                let draftStart = null;
                let draftDate = null;
                // Primär: direkt aus localStorage lesen (zuverlässig, auch wenn DOM-Input leer)
                const draftRaw = localStorage.getItem('mwl_entry_draft');
                if (draftRaw) {
                    const draft = JSON.parse(draftRaw);
                    draftStart = draft.start || null;
                    draftDate = draft.date || draft.dateStr || null;
                }
                // Fallback: DOM-Input (z.B. wenn Draft noch nicht gespeichert)
                if (!draftStart) {
                    const startInput = document.getElementById('inpStart');
                    const dateInput = document.getElementById('inpDate');
                    if (startInput && startInput.value) draftStart = startInput.value;
                    if (dateInput && dateInput.value) draftDate = dateInput.value;
                }
                if (draftStart && draftDate === today) {
                    const [sh, sm] = draftStart.split(':').map(Number);
                    const shiftStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm).getTime();
                    if (shiftStartMs < now.getTime()) {
                        const elapsedHours = (now.getTime() - shiftStartMs) / 3.6e6;
                        todayWorked += Math.max(0, elapsedHours);
                    }
                }
            } catch(e) { /* ignore */ }
        }

        // Erwartete Stunden aus den tatsächlichen Tageseinstellungen auslesen
        let todayExpected = 0;
        if (data.settings && Array.isArray(data.settings.hours)) {
            todayExpected = data.settings.hours[dayIndex] || 0;
        }
        
        // Kein Arbeitstag (Wochenende etc.) → keine Notifications
        if (todayExpected === 0) return;
        
        const deficit = Math.max(0, todayExpected - todayWorked);

        // Nachmittag-Erinnerung (15:00 Uhr)
        if (now.getHours() === 15 && !sessionStorage.getItem('mwl_notif_afternoon')) {
            let message = '';
            if (deficit > 0) {
                message = `Du brauchst noch ${deficit.toFixed(1)}h heute! (Soll: ${todayExpected.toFixed(2)}h, bisher: ${todayWorked.toFixed(2)}h)`;
                showSmartNotification('⏰ Nachmittags-Check', message, 'warning');
                sessionStorage.setItem('mwl_notif_afternoon', 'shown');
            } else {
                showSmartNotification('✅ Tagesgoal erreicht!', `Du hast dein Soll bereits erfüllt! 🎉`, 'success');
                sessionStorage.setItem('mwl_notif_afternoon', 'shown');
            }
        }

        // Feierabend-Erinnerung (17:00 Uhr)
        if (now.getHours() === 17 && !sessionStorage.getItem('mwl_notif_evening')) {
            if (deficit > 0) {
                showSmartNotification('🌆 Feierabend-Reminder', `Noch ${deficit.toFixed(1)}h — möchtest du noch ein bisschen arbeiten?`, 'info');
                sessionStorage.setItem('mwl_notif_evening', 'shown');
            } else if (isFriday) {
                showSmartNotification('✨ Schönes Wochenende!', `Dein Tag ist voll! Genieß die Freizeit! 🏖️`, 'success');
                sessionStorage.setItem('mwl_notif_evening', 'shown');
            } else {
                showSmartNotification('✅ Feierabend!', `Tagesziel erreicht — schönen Feierabend! 🎉`, 'success');
                sessionStorage.setItem('mwl_notif_evening', 'shown');
            }
        }

        // Wochenende-Check (Freitag 16:00 Uhr)
        if (now.getDay() === 5 && now.getHours() === 16 && !sessionStorage.getItem('mwl_notif_friday')) {
            const week = getWeek(now);
            let weekHours = 0;
            data.entries.forEach(e => {
                const d = new Date(e.date);
                if (getWeek(d) === week && d.getFullYear() === now.getFullYear()) {
                    weekHours += e.diff || 0;
                }
            });

            if (weekHours >= 0) {
                showSmartNotification('✨ Starke Woche!', `+${(weekHours).toFixed(1)}h Saldo diese Woche! Wochenende verdient! 🏖️`, 'success');
            } else {
                const needed = Math.abs(weekHours);
                showSmartNotification('📋 Wochenplan', `Nächste Woche ${needed.toFixed(1)}h extra planen?`, 'warning');
            }
            sessionStorage.setItem('mwl_notif_friday', 'shown');
        }

        // Export/Backup Reminder (wenn älter als 7 Tage oder nie exportiert)
        try {
            if (alertSettings.exportReminder) {
                const lastExport = localStorage.getItem('mwl_last_export');
                let needsExport = false;
                if (!lastExport) needsExport = true;
                else {
                    const diffMs = Date.now() - new Date(lastExport).getTime();
                    if (diffMs > (7 * 24 * 60 * 60 * 1000)) needsExport = true;
                }
                const exportReminderKey = 'mwl_export_reminder_shown_' + today;
                if (needsExport && !localStorage.getItem(exportReminderKey)) {
                    const msg = 'Dein letztes Backup ist älter als 7 Tage (oder nicht vorhanden). Bitte exportiere deine Daten!';
                    showSmartNotification('💾 Backup Reminder', msg, 'warning');
                    // Füge auch einen persistenten Alert hinzu, sichtbar im Alerts-Panel
                    try {
                        const a = createAlert('Backup Reminder', msg, 'warning', '💾');
                        alertsHistory.unshift(a);
                        persistAlerts();
                        updateAlertBadge();
                        renderAlertsList();
                    } catch (e) { console.warn('Failed to create persistent backup alert', e); }
                    localStorage.setItem(exportReminderKey, '1');
                }
            }
        } catch (e) { console.warn('Backup reminder check failed', e); }

        // Milestone-Notifications
        const totalDiff = data.entries.reduce((sum, e) => sum + (e.diff || 0), 0);
        
        // 100h Überstunden
        if (totalDiff >= 100 && totalDiff < 101 && !localStorage.getItem('mwl_milestone_100h')) {
            showSmartNotification('🎉 MEGA!', 'Du hast 100h Überstunden erreicht! 🚀', 'success');
            localStorage.setItem('mwl_milestone_100h', 'shown');
        }

        // 50h Überstunden
        if (totalDiff >= 50 && totalDiff < 51 && !localStorage.getItem('mwl_milestone_50h')) {
            showSmartNotification('🎊 Wow!', '50h Überstunden - Das ist beeindruckend! 💪', 'success');
            localStorage.setItem('mwl_milestone_50h', 'shown');
        }
    }

    // Starte periodische Notifications (jede Minute prüfen)
    setInterval(checkSmartNotifications, 60000);

    // Auch sofort einmal prüfen
    checkSmartNotifications();

    // ===== ERROR BOUNDARY / FALLBACK UI =====
    window.addEventListener('error', function(event) {
        console.error('🔴 Global Error:', event.message, event.filename, event.lineno);
        if (document.querySelector('.mwl-error-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'mwl-error-overlay';
        const msg = (event.message || 'Unbekannter Fehler').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const src = ((event.filename || '') + (event.lineno ? ':' + event.lineno : '')).replace(/</g,'&lt;');
        overlay.innerHTML = `
<style>
.mwl-error-overlay{position:fixed;inset:0;z-index:99999;background:rgba(3,3,5,0.88);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);display:flex;align-items:center;justify-content:center;padding:1.5rem;animation:mwlErrFade 0.25s ease}
@keyframes mwlErrFade{from{opacity:0}to{opacity:1}}
.mwl-err-atmos{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.mwl-err-atmos::before{content:'';position:absolute;width:520px;height:520px;border-radius:50%;background:rgba(239,68,68,0.07);filter:blur(100px);top:-15%;right:-10%}
.mwl-err-atmos::after{content:'';position:absolute;width:340px;height:340px;border-radius:50%;background:rgba(168,85,247,0.05);filter:blur(80px);bottom:-10%;left:-8%}
.mwl-err-card{position:relative;background:linear-gradient(160deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01));border:1px solid rgba(239,68,68,0.2);border-top:1px solid rgba(239,68,68,0.45);border-radius:20px;padding:2.25rem 2rem 1.75rem;max-width:440px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,0.55),0 0 0 1px rgba(239,68,68,0.05);animation:mwlErrSlide 0.4s cubic-bezier(0.16,1,0.3,1) 0.08s both;overflow:hidden}
@keyframes mwlErrSlide{from{opacity:0;transform:translateY(18px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.mwl-err-card::before{content:'';position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(239,68,68,0.6),transparent)}
.mwl-err-icon{width:48px;height:48px;border-radius:13px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.22);display:flex;align-items:center;justify-content:center;color:#ef4444;margin-bottom:1.2rem}
.mwl-err-title{font-family:'Inter',-apple-system,sans-serif;font-size:1.2rem;font-weight:700;letter-spacing:-0.025em;color:#f8fafc;margin-bottom:0.55rem;line-height:1.25}
.mwl-err-sub{font-family:'Inter',-apple-system,sans-serif;font-size:0.86rem;color:#94a3b8;line-height:1.65;margin-bottom:1.6rem}
.mwl-err-actions{display:flex;gap:0.6rem;flex-wrap:wrap}
.mwl-err-primary{flex:1;min-width:140px;padding:0.65rem 1.15rem;background:#a855f7;color:#fff;border:none;border-radius:10px;font-family:'Inter',-apple-system,sans-serif;font-size:0.85rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.45rem;transition:all 0.2s ease}
.mwl-err-primary:hover{background:rgba(168,85,247,0.85);transform:translateY(-1px);box-shadow:0 8px 22px rgba(168,85,247,0.28)}
.mwl-err-ghost{padding:0.65rem 1rem;background:rgba(255,255,255,0.03);color:#94a3b8;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-family:'Inter',-apple-system,sans-serif;font-size:0.85rem;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:0.4rem;transition:all 0.2s ease;text-decoration:none}
.mwl-err-ghost:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.14);color:#f8fafc}
.mwl-err-divider{height:1px;background:rgba(255,255,255,0.06);margin:1.25rem 0}
.mwl-err-toggle{background:none;border:none;color:#475569;font-family:'Inter',-apple-system,sans-serif;font-size:0.73rem;cursor:pointer;padding:0;display:flex;align-items:center;gap:0.35rem;transition:color 0.2s}
.mwl-err-toggle:hover{color:#94a3b8}
.mwl-err-code{margin-top:0.7rem;padding:0.75rem 0.9rem;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.05);border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:0.68rem;color:#ef4444;line-height:1.55;word-break:break-all;display:none;white-space:pre-wrap}
</style>
<div class="mwl-err-atmos"></div>
<div class="mwl-err-card">
  <div class="mwl-err-icon">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
  </div>
  <div class="mwl-err-title">Etwas ist schief gelaufen</div>
  <div class="mwl-err-sub">Die App hat einen unerwarteten Fehler entdeckt. Eine Aktualisierung löst das meistens sofort — deine Daten bleiben erhalten.</div>
  <div class="mwl-err-actions">
    <button class="mwl-err-primary" onclick="location.reload()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
      Seite aktualisieren
    </button>
    <a class="mwl-err-ghost" href="mailto:support@myworklog.com">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      Support
    </a>
  </div>
  <div class="mwl-err-divider"></div>
  <button class="mwl-err-toggle" onclick="var c=this.nextElementSibling;c.style.display=c.style.display==='block'?'none':'block';this.querySelector('svg').style.transform=c.style.display==='block'?'rotate(90deg)':''">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="transition:transform 0.2s"><path d="m9 18 6-6-6-6"/></svg>
    Fehlerdetails
  </button>
  <div class="mwl-err-code">${msg}${src ? '\n' + src : ''}</div>
</div>`;
        document.body.appendChild(overlay);
    });

    window.addEventListener('unhandledrejection', function(event) {
        console.error('🔴 Unhandled Promise Rejection:', event.reason);
        event.preventDefault();
    });

    // ===== LOADING SPINNER HELPERS =====
    function showLoadingSpinner(message = 'Lädt...') {
        let overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `<h2 class="shimmer-text">${message}</h2>`;
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        return overlay;
    }

    function hideLoadingSpinner() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Zeige Spinner beim Start
    showLoadingSpinner('MyWorkLog wird geladen...');

    // Verstecke Spinner wenn alles geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(hideLoadingSpinner, 300);
        });
    } else {
        setTimeout(hideLoadingSpinner, 300);
    }

    // Call initialization on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

    // Initialisiere Cloud Sync UI nach dem App-Load
    document.addEventListener('DOMContentLoaded', () => {
        const waitForCloudSync = setInterval(() => {
            if (window.cloudSync) {
                clearInterval(waitForCloudSync);
                // supabase-config.js hat cloudSyncUI bereits initialisiert — hier nur UI-Status aktualisieren
                if (!window.cloudSyncUI && typeof SupabaseCloudSyncUI !== 'undefined') {
                    try {
                        window.cloudSyncUI = new SupabaseCloudSyncUI(window.cloudSync);
                        setupCloudSyncIntegration();
                        console.log('[App] ✅ Cloud Sync UI erfolgreich aktiviert!');
                    } catch (err) {
                        console.warn('[App] ⚠️ Cloud Sync UI Init Fehler:', err.message);
                        setupCloudSyncIntegration();
                    }
                }
                try {
                    const isLoggedIn = window.cloudSync.isLoggedIn();
                    const user = window.cloudSync.getCurrentUser();
                    updateCloudSyncUI(isLoggedIn, user);
                } catch (err) { /* ignore */ }
            }
        }, 100);
        
        // Timeout nach 5s - KEIN FEHLER, nur silent fail
        setTimeout(() => {
            if (!window.cloudSync) {
                console.log('[App] ℹ️ Cloud Sync nicht verfügbar (config/supabase-config.js nicht geladen?)');
                clearInterval(waitForCloudSync);
            }
        }, 5000);
    });
    