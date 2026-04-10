// ═══ CORE: TAB-NAVIGATION ═══
    // --- TAB LOGIC ---
    function switchTab(tabId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        document.getElementById('view-' + tabId).classList.add('active');
        const navEl = document.getElementById('nav-' + tabId);
        if(navEl) navEl.classList.add('active');

        // Umami SPA Page View
        uPageView('/app/' + tabId, 'MyWorkLog – ' + tabId);
        
        // Sync mobile bottom nav
        document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.remove('active'));
        const mobBtn = document.getElementById('mobNav-' + tabId);
        if (mobBtn) mobBtn.classList.add('active');
        
        const titles = {
            'dashboard': 'Übersicht',
            'history': 'Daten-Analyse & Historie',
            'performance': 'Performance Analyse',
            'ihk': 'IHK / Karriere',
            'school': 'Berufsschule Audit',
            'goals': 'Ziele & Fokus',
            'yearview': 'Jahresübersicht & Insights',
            'monthcompare': 'Monats-Vergleich & Detailanalyse',
            'weekview': 'Wochenansicht',
            'aibot': 'AI-Bot Assistent',
            'support': 'Unterstützung',
            'analytics-pro': 'Analytics Pro',
        };
        document.querySelector('.page-title').textContent = titles[tabId];

        if (window.innerWidth < 1024 && tabId !== 'dashboard') {
             toggleSidebar(); // Sidebar auf Mobile nach Klick ausblenden
        }


        if (tabId === 'performance') {
            const perfData = calculatePerformanceData();
            const deepData = calculateDeepPerformanceData();
            renderPerformanceView(perfData, deepData);
        }
        if (tabId === 'ihk') {
            renderIHKView();
        }
        if (tabId === 'school') {
            renderSchoolView();
        }
        if (tabId === 'goals') {
            renderGoalsView();
        }
        if (tabId === 'history') {
            renderHistoryView();
        }
        if (tabId === 'yearview') {
            renderYearView();
        }
        if (tabId === 'monthcompare') {
            renderMonthCompareView();
            if (typeof renderMiniCalendar === 'function') renderMiniCalendar();
        }
        if (tabId === 'weekview') {
            renderWeekView();
        }
        if (tabId === 'aibot') {
            initializeAIBot();
        }
        if (tabId === 'support') {
            if (typeof renderSupportStats === 'function') renderSupportStats();
        }
        if (tabId === 'analytics-pro') {
            if (typeof renderAnalyticsPro === 'function') renderAnalyticsPro();
        }
    }
    function getGoalUnit(type) {
        switch (type) {
            case 'TOTAL_WORKED_HOURS':
            case 'TOTAL_DIFF_HOURS':
                return 'h';
            case 'POSITIVE_WEEKS':
                return ' Wochen';
            case 'PERFECT_SHIFTS':
                return ' Schichten';
            default:
                return '';
        }
    }
    function addCustomGoal() {
        const title = document.getElementById('goalTitle').value.trim();
        const type = document.getElementById('goalType').value;
        const target = parseFloat(document.getElementById('goalTarget').value);
        
        if (!title || isNaN(target) || target <= 0) {
            return showCustomMessage('❌ Ungültige Eingabe', 'Bitte gib einen gültigen Zielnamen und einen Zielwert (> 0) ein.', 'error');
        }

        const newGoal = {
            id: Date.now(),
            title: title,
            type: type,
            target: target
        };

        data.settings.goals.push(newGoal);
        save();
        document.getElementById('goalTitle').value = '';
        document.getElementById('goalTarget').value = '';
        renderGoalsView();
        showCustomMessage('✅ Erfolg', 'Neues Ziel erfolgreich hinzugefügt!', 'success');
    }
    
    function deleteCustomGoal(id) {
         showCustomConfirm(
             '⚠️ Ziel löschen?',
             'Möchtest du dieses Ziel wirklich unwiderruflich löschen?',
             () => {
                 data.settings.goals = data.settings.goals.filter(goal => goal.id !== id);
                 save();
                 renderGoalsView();
             },
             null
         );
    }