// ═══ CORE: INIT-APP ═══
    // --- INIT ---
    window.onload = () => {
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

        if (window.innerWidth < 1024) {
             isSidebarOpen = false;
             document.getElementById('sidebar').classList.add('hidden');
             document.getElementById('mainContent').classList.add('full-width');
        }

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


        applyTheme(data.settings.theme);
        // Apply stored theme mode (dark / light / system)
        if (!data.settings.themeMode) data.settings.themeMode = 'dark';
        setThemeMode(data.settings.themeMode);
        updateUI();

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

        setInterval(() => {
            const now = new Date();
            document.getElementById('currentDate').textContent = now.toLocaleDateString('de-DE', {weekday:'long', day:'2-digit', month:'long'});
        }, 1000);
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
        try { renderSidebarNav(); } catch(e) { console.warn('renderSidebarNav failed', e); }
        try { updateSidebarAvatar(); } catch(e) { console.warn('updateSidebarAvatar failed', e); }
        try { enableWidgetDragDrop(); applyWidgetLayout(); } catch(e) { console.warn('widget drag init failed', e); }
        try { renderWidgetManager(); } catch(e) { console.error('Error rendering widget manager:', e); }

        // Warn user if accessing via localhost/127.0.0.1 on mobile devices (helps avoid mobile PWA 404 issue)
        try { detectLocalhostAndWarn(); } catch(e) { console.warn('detectLocalhostAndWarn failed', e); }
    };

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