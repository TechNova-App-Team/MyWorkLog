// ═══ CORE: INIT-APP ═══

    // --- INIT ---
    document.addEventListener('DOMContentLoaded', () => {
        // Release the CLS pre-apply lock on #mainContent — CSS classes are now in their final state
        try { var _clsMP = document.getElementById('cls-main-pos'); if (_clsMP) _clsMP.remove(); } catch(e) {}

        // Offline beim Start ist KEIN Grund umzuleiten — die App ist per Service-Worker
        // gecacht und voll offline nutzbar. Der Netzwerk-Status-Indikator zeigt Offline an.
        const _loadedData = loadPersistedData();
        if(_loadedData) data = _loadedData;
        
        if(!data.settings) data.settings = {};
        if(!Array.isArray(data.settings.hours)) data.settings.hours = [0,8.75,8.75,8.75,8.75,4.5,0];
        if(!data.settings.break) data.settings.break = {thresh:6, min:[0, 30, 30, 30, 30, 30, 0]};
        if(!Array.isArray(data.trash)) data.trash = [];
        if(!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];
        if(!Array.isArray(data.customFields)) data.customFields = [];
        if(!Array.isArray(data.workflowRules)) data.workflowRules = [];
        if(!data.entryTypeOverrides || typeof data.entryTypeOverrides !== 'object' || Array.isArray(data.entryTypeOverrides)) data.entryTypeOverrides = {};
        if (!data.settings.trashAutoEmptyDays && data.settings.trashAutoEmptyDays !== 0) data.settings.trashAutoEmptyDays = 30;
        
        if(!Array.isArray(data.settings.break.min)) {
            const oldBreakMin = data.settings.break.min || 30;
            data.settings.break.min = [0, oldBreakMin, oldBreakMin, oldBreakMin, oldBreakMin, 15, 0]; // 15 Min Pause für Freitag
        }
        // Jobs-Migration: mind. Hauptjob anlegen (nutzt Legacy hours/break)
        try { if (typeof migrateJobs === 'function') migrateJobs(); } catch(e) { console.warn('migrateJobs error', e); }
        // Arbeitszeit-Verteilung: Berechnungseinheit (Stunden = Default/Legacy, oder Tage)
        if (data.settings.distributionUnit !== 'days' && data.settings.distributionUnit !== 'hours') data.settings.distributionUnit = 'hours';
        if(!data.settings.vacation) data.settings.vacation = {total:30, used:0, usedManual:0, carriedOver:0, mode:'days', carryOverMax:null, lastRolloverYear:null, yearHistory:{}};
        if(typeof data.settings.vacation.mode === 'undefined') data.settings.vacation.mode = 'days';
        if(typeof data.settings.vacation.carriedOver === 'undefined') data.settings.vacation.carriedOver = 0;
        if(typeof data.settings.vacation.carryOverMax === 'undefined') data.settings.vacation.carryOverMax = null;
        if(typeof data.settings.vacation.lastRolloverYear === 'undefined') data.settings.vacation.lastRolloverYear = null;
        if(typeof data.settings.vacation.yearHistory === 'undefined') data.settings.vacation.yearHistory = {};

        // Zeit-Rundung: Default = aus (Backward-Compat). User schaltet in Settings ein.
        if(!data.settings.rounding) data.settings.rounding = { enabled:false, mode:'commercial', taktungMinutes:15 };
        if(typeof data.settings.rounding.enabled === 'undefined') data.settings.rounding.enabled = false;
        if(typeof data.settings.rounding.mode === 'undefined') data.settings.rounding.mode = 'commercial';
        if(typeof data.settings.rounding.taktungMinutes === 'undefined') data.settings.rounding.taktungMinutes = 15;
        
        // Initialize Untis Integration (optional — Funktion existiert nur wenn Untis-Modul geladen)
        if (typeof initializeUntisIntegration === 'function') initializeUntisIntegration();
        
        // Initialize projects list
        if (!Array.isArray(data.settings.projects)) data.settings.projects = [];
        // Collect unique projects from entries
        const uniqueProjects = [...new Set(data.entries.filter(e => e.project).map(e => e.project))];
        data.settings.projects = [...new Set([...data.settings.projects, ...uniqueProjects])];
        
        if(!data.settings.ihk) {
             data.settings.ihk = {start: '', end: '', exam_zwischen: '', note_zwischen: '', note_abschluss: ''};
        }
        
        // Berufsschule: Struktur je Lehrjahr absichern, Altbestand (flaches
        // `grades`) heben — die Regeln stehen in school.js, nicht hier.
        scNormalizeSchool(data.settings);
        
        if(!data.settings.goals) data.settings.goals = [];
        if (typeof data.settings.shortcutsEnabled === 'undefined') data.settings.shortcutsEnabled = false;
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
        // Remove pre-apply attr — CSS class now takes over
        document.documentElement.removeAttribute('data-pre-fw');

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
        if (!data.settings.themeMode) data.settings.themeMode = 'dark';
        setThemeMode(data.settings.themeMode);
        // Split-Shift-Normalisierung: Altbestand reparieren (Tagessoll pro Tag nur einmal zählen)
        try { if (typeof dedupeDayExpected === 'function' && dedupeDayExpected()) { save(); } } catch(e) { console.warn('dedupeDayExpected error', e); }
        // Job-Auswahl im Erfassen-Formular befüllen
        try { if (typeof populateJobSelect === 'function') populateJobSelect(); } catch(e) {}
        updateUI();
        // Datensicherungs-Hinweis: ausgeblendet, wenn der User ihn weggeklickt hat
        try { if (typeof applyDataNoticeVisibility === 'function') applyDataNoticeVisibility(); } catch(e) {}
        // Re-enable sidebar collapse transition after initial layout settles
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const m = document.getElementById('mainContent');
            if (m) m.style.transition = 'margin-left 0.3s ease-in-out';
        }));

        // Jahreswechsel-Prüfung: Resturlaub automatisch übertragen
        try { checkAndPerformYearRollover(); } catch(e) { console.warn('yearRollover error', e); }

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
            document.getElementById('currentDate').textContent = new Date().toLocaleDateString(mwlLocale(), {weekday:'long', day:'2-digit', month:'long'});
        }
        _updateDate();
        setInterval(_updateDate, 1000);
        document.getElementById('inpDate').valueAsDate = new Date();

        renderLists(); 
        
        // Keine Performance-Ansicht beim Start: sie ist unsichtbar, switchTab()
        // zeichnet sie beim Oeffnen, und performance.js wird erst dann geladen.
        if (document.getElementById('view-history').classList.contains('active') && typeof renderHistoryView === 'function') {
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
        if (typeof hideLoadingSpinner === 'function') hideLoadingSpinner();

        // Warn user if accessing via localhost/127.0.0.1 on mobile devices (helps avoid mobile PWA 404 issue)
        try { detectLocalhostAndWarn(); } catch(e) { console.warn('detectLocalhostAndWarn failed', e); }

        // NFC: URL-Parameter prüfen (?nfc=1 kommt vom NFC-Chip-Scan)
        try { if (typeof checkNFCUrlParam === 'function') checkNFCUrlParam(); } catch(e) { console.warn('NFC init failed', e); }

        // Auto-Recovery-Status an den User melden (loadPersistedData hat evtl. eingegriffen)
        try {
            if (window._mwlRecoveredFromBackup && typeof showCustomMessage === 'function') {
                showCustomMessage('🛟 Daten wiederhergestellt', 'Deine gespeicherten Daten waren beschädigt und wurden automatisch aus einem lokalen Backup wiederhergestellt (Stand: ' + window._mwlRecoveredFromBackup + '). Bitte prüfe, ob alles vollständig ist.', 'warning');
            } else if (window._mwlDataCorrupted && typeof showCustomMessage === 'function') {
                showCustomMessage('⚠️ Daten beschädigt', 'Deine lokal gespeicherten Daten konnten nicht gelesen werden und es war kein lokales Backup verfügbar. Lade deine Daten aus der Cloud, um sie wiederherzustellen.', 'error');
            }
        } catch(e) { console.warn('recovery notice failed', e); }

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
        // Sidebar-Bug-Fix: Stelle sicher, dass die Sidebar nach Modal-Schließen sichtbar ist
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
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
    // Dieselbe Zeile per Tastatur: die Karten tragen role="button" und
    // tabindex="0", also muss auch Enter/Leertaste sie oeffnen — sonst ist
    // der Fokusrahmen eine Zusage, die niemand einloesen kann.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const item = e.target.closest && e.target.closest('.activity-item');
        if (!item) return;
        const entryId = item.getAttribute('data-entry-id');
        if (!entryId) return;
        e.preventDefault();
        window.goToHistoryAndHighlight(entryId);
    });