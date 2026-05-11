// ═══ CORE: INIT-APP ═══
    if (!window._clsBC) window._clsBC = 'pre-init-unknown';

    // ── CLS Monitor: logs every layout shift with last breadcrumb ──
    // Note: _clsBC already set by whichever script ran before this one
    (function initCLSMonitor() {
        if (!('PerformanceObserver' in window)) return;
        let clsTotal = 0;
        try {
            const po = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (entry.hadRecentInput) continue;
                    clsTotal += entry.value;
                    const sources = (entry.sources || []).map(s => {
                        const el = s.node;
                        if (!el) return '(unknown)';
                        const tag = el.tagName ? el.tagName.toLowerCase() : '?';
                        const id = el.id ? `#${el.id}` : '';
                        const cls = el.classList && el.classList.length ? `.${[...el.classList].join('.')}` : '';
                        const r = s.previousRect;
                        const prev = r ? `(${Math.round(r.left)},${Math.round(r.top)})` : '';
                        const c = s.currentRect;
                        const curr = c ? `→(${Math.round(c.left)},${Math.round(c.top)})` : '';
                        return `${tag}${id}${cls} ${prev}${curr}`;
                    }).join(' | ');
                    console.groupCollapsed(`%c[CLS] +${entry.value.toFixed(4)} (total: ${clsTotal.toFixed(4)}) @ ${Math.round(entry.startTime)}ms | nach: ${window._clsBC}`, 'color:#a855f7;font-weight:bold');
                    console.log('Quellen:', sources || '(keine)');
                    console.log('Entry:', entry);
                    console.groupEnd();
                }
            });
            po.observe({ type: 'layout-shift', buffered: true });
        } catch(e) {}
    })();

    // --- INIT ---
    document.addEventListener('DOMContentLoaded', () => {
        window._clsBC = 'DOMContentLoaded-start';
        // Release the CLS pre-apply lock on #mainContent — CSS classes are now in their final state
        try { var _clsMP = document.getElementById('cls-main-pos'); if (_clsMP) _clsMP.remove(); } catch(e) {}
        window._clsBC = 'cls-main-pos-removed';

        // EmailJS init (deferred SDK ist jetzt geladen)
        try { if (typeof emailjs !== 'undefined') emailjs.init('dLaRbQLynU5R8A0ti'); } catch(e) {}

        // Check offline on startup
        if (!navigator.onLine && !window.location.pathname.includes('offline.html')) {
            window.location.href = '/offline/';
            return;
        }
        window._clsBC = 'data-loaded';
        if(localStorage.getItem('tg_pro_data')) data = JSON.parse(localStorage.getItem('tg_pro_data'));
        
        if(!data.settings) data.settings = {};
        if(!Array.isArray(data.settings.hours)) data.settings.hours = [0,8.75,8.75,8.75,8.75,4.5,0];
        if(!data.settings.break) data.settings.break = {thresh:6, min:[0, 30, 30, 30, 30, 30, 0]};
        if(!Array.isArray(data.trash)) data.trash = [];
        if (!data.settings.trashAutoEmptyDays && data.settings.trashAutoEmptyDays !== 0) data.settings.trashAutoEmptyDays = 30;
        
        if(!Array.isArray(data.settings.break.min)) {
            const oldBreakMin = data.settings.break.min || 30;
            data.settings.break.min = [0, oldBreakMin, oldBreakMin, oldBreakMin, oldBreakMin, 15, 0]; // 15 Min Pause für Freitag
        }
        if(!data.settings.vacation) data.settings.vacation = {total:30, used:0, usedManual:0};
        
        // Initialize Untis Integration
        initializeUntisIntegration();
        
        // Initialize projects list
        if (!Array.isArray(data.settings.projects)) data.settings.projects = [];
        // Collect unique projects from entries
        const uniqueProjects = [...new Set(data.entries.filter(e => e.project).map(e => e.project))];
        data.settings.projects = [...new Set([...data.settings.projects, ...uniqueProjects])];
        
        if(!data.settings.ihk) {
             data.settings.ihk = {start: '', end: '', exam_zwischen: '', note_zwischen: '', note_abschluss: ''};
        }
        
        if(!data.settings.school) {
             data.settings.school = {
                grades: {
                    'Kernprozesse': [],
                    'Wirtschaftslehre': [],
                    'IT-Systeme': [],
                    'Deutsch/Kommunikation': [],
                }
             };
        } else if(!data.settings.school.grades) {
             data.settings.school.grades = {
                'Kernprozesse': [],
                'Wirtschaftslehre': [],
                'IT-Systeme': [],
                'Deutsch/Kommunikation': [],
             };
        }
        
        if(!data.settings.goals) data.settings.goals = [];
        if (typeof data.settings.shortcutsEnabled === 'undefined') data.settings.shortcutsEnabled = true;
        if (typeof data.settings.moodSelectorEnabled === 'undefined') data.settings.moodSelectorEnabled = true;
        if(!data.settings.job) data.settings.job = '';
        
        if (data.settings.ihk.exam) { 
             data.settings.ihk.end = data.settings.ihk.exam;
             delete data.settings.ihk.exam;
        }

        window._clsBC = 'before-mobile-layout';
        if (window.innerWidth < 1024) {
             isSidebarOpen = false;
             document.getElementById('sidebar').classList.add('hidden');
             document.getElementById('mainContent').classList.add('full-width');
        }
        // Remove pre-apply attr — CSS class now takes over
        document.documentElement.removeAttribute('data-pre-fw');
        window._clsBC = 'after-mobile-layout';

        // Respect explicit request to keep sidebar closed when navigating from other pages
        try {
            const keepClosed = localStorage.getItem('sidebar_keep_closed');
            if (keepClosed === 'true') {
                isSidebarOpen = false;
                const sb = document.getElementById('sidebar');
                const main = document.getElementById('mainContent');
                if (sb) sb.classList.add('hidden');
                if (main) main.classList.add('full-width');
                localStorage.removeItem('sidebar_keep_closed');
            }
        } catch (e) { /* ignore storage errors */ }


        window._clsBC = 'before-applyTheme';
        applyTheme(data.settings.theme);
        window._clsBC = 'before-setThemeMode';
        if (!data.settings.themeMode) data.settings.themeMode = 'dark';
        setThemeMode(data.settings.themeMode);
        window._clsBC = 'before-updateUI';
        updateUI();
        window._clsBC = 'after-updateUI';
        // Re-enable sidebar collapse transition after initial layout settles
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const m = document.getElementById('mainContent');
            if (m) m.style.transition = 'margin-left 0.3s ease-in-out';
        }));

        // Auto-Leerung des Papierkorbs beim Start und einmal täglich
        try { autoEmptyTrash(); } catch(e) { console.warn('autoEmptyTrash error', e); }
        setInterval(() => { try { autoEmptyTrash(); } catch(e) {} }, 24*3600*1000);
        
        // Feiertage werden nicht mehr automatisch gebucht — Nutzer muss "Feiertage prüfen" klicken
        try { renderSchoolRules(); checkTodayVocSchool(); } catch(e) { console.warn('School check init error', e); }

        const savedTimer = localStorage.getItem('tg_timer');
        if(savedTimer) {
            const t = JSON.parse(savedTimer);
            Object.assign(timer, t); 
            
            if (timer.running) {
                timerRun();
                document.getElementById('timerBox').classList.add('timer-active');
            } else if (timer.paused > 0) {
                displayTimerTime(timer.paused);
            }
        }
        
        const savedLog = localStorage.getItem('tg_timer_log');
        if (savedLog) timer.log = JSON.parse(savedLog);
        renderTimerLogBar(); 

        function _updateDate() {
            document.getElementById('currentDate').textContent = new Date().toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'long'});
        }
        _updateDate();
        setInterval(_updateDate, 1000);
        document.getElementById('inpDate').valueAsDate = new Date();

        if (document.getElementById('schoolGradesInputGrid')) {
             renderSchoolGradesInputs();
        }

        renderLists(); 
        
        const perfData = calculatePerformanceData();
        const deepData = calculateDeepPerformanceData();
        renderPerformanceView(perfData, deepData);
        
        if (document.getElementById('view-history').classList.contains('active')) {
             renderHistoryView();
        }
        if (document.getElementById('view-goals').classList.contains('active')) {
             renderGoalsView();
        }
        if (document.getElementById('view-ihk').classList.contains('active')) {
             renderIHKView();
        }

        if (!localStorage.getItem('privacy_acknowledged')) {
            // Nur auf Desktop anzeigen, nicht auf Mobile
            const isMobile = window.innerWidth < 768;
            if (!isMobile) {
                showPrivacyModal();
            } else {
                // Auf Mobile direkt als acknowledged markieren
                localStorage.setItem('privacy_acknowledged', 'true');
            }
        }

        // Run post-load initializations that previously ran at parse time
        window._clsBC = 'before-renderSidebarNav';
        try { renderSidebarNav(); } catch(e) { console.warn('renderSidebarNav failed', e); }
        window._clsBC = 'before-updateSidebarAvatar';
        try { updateSidebarAvatar(); } catch(e) { console.warn('updateSidebarAvatar failed', e); }
        window._clsBC = 'before-applyWidgetLayout';
        try { enableWidgetDragDrop(); applyWidgetLayout(); } catch(e) { console.warn('widget drag init failed', e); }
        window._clsBC = 'before-renderWidgetManager';
        try { renderWidgetManager(); } catch(e) { console.error('Error rendering widget manager:', e); }
        window._clsBC = 'init-complete';

        // Warn user if accessing via localhost/127.0.0.1 on mobile devices (helps avoid mobile PWA 404 issue)
        try { detectLocalhostAndWarn(); } catch(e) { console.warn('detectLocalhostAndWarn failed', e); }

        // NFC: URL-Parameter prüfen (?nfc=1 kommt vom NFC-Chip-Scan)
        try { if (typeof checkNFCUrlParam === 'function') checkNFCUrlParam(); } catch(e) { console.warn('NFC init failed', e); }

    });

    function showPrivacyModal() {
        const modal = document.getElementById('privacyModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease forwards';
        }
    }

    function closePrivacyModal() {
        const modal = document.getElementById('privacyModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        localStorage.setItem('privacy_acknowledged', 'true');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const privacyModal = document.getElementById('privacyModal');
            if (privacyModal && privacyModal.style.display !== 'none') {
                closePrivacyModal();
            }
        }
    });

    // Activity item click → navigate to history and highlight
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.activity-item');
        if (item) {
            const entryId = item.getAttribute('data-entry-id');
            if (entryId) {
                e.stopPropagation();
                window.goToHistoryAndHighlight(entryId);
            }
        }
    });