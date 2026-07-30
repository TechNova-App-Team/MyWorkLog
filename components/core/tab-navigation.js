// ═══ CORE: TAB-NAVIGATION ═══
    // --- TAB LOGIC ---
    function switchTab(tabId) {
        // Feature-Nutzung zaehlen — nur der View-Name (Kategorie), nie Inhalte.
        // switchTab wird ausschliesslich durch echte Navigation getriggert (Dashboard
        // ist per HTML default aktiv, kein Auto-Call beim Start) → kein Rausch-Event.
        if (typeof mwlEvent === 'function') mwlEvent('feature_genutzt', { feature: tabId });

        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        document.getElementById('view-' + tabId).classList.add('active');
        const navEl = document.getElementById('nav-' + tabId);
        if(navEl) navEl.classList.add('active');

        // Sync mobile bottom nav
        document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.remove('active'));
        const mobBtn = document.getElementById('mobNav-' + tabId);
        if (mobBtn) mobBtn.classList.add('active');
        
        const titles = {
            'dashboard': 'Übersicht',
            'history': 'Daten-Analyse & Historie',
            'performance': 'Performance Analyse',
            'ihk': 'IHK / Karriere',
            'school': 'Berufsschule & Noten',
            'goals': 'Ziele & Fokus',
            'yearview': 'Jahresübersicht & Insights',
            'monthcompare': 'Monats-Vergleich & Detailanalyse',
            'weekview': 'Wochenansicht',
            'aibot': 'AI-Bot Assistent',
            'support': 'Support',
            'analytics-pro': 'Analytics Pro',
            'aufgaben': 'Aufgaben',
            'aufgaben-tab': 'Aufgaben',
        };
        document.querySelector('.page-title').textContent = titles[tabId];
        document.title = 'MyWorkLog | ' + (titles[tabId] || tabId);

        if (window.innerWidth < 1024 && tabId !== 'dashboard') {
             toggleSidebar(); // Sidebar auf Mobile nach Klick ausblenden
        }


        if (tabId === 'performance') {
            const perfData = calculatePerformanceData();
            const deepData = calculateDeepPerformanceData();
            renderPerformanceView(perfData, deepData);
            try { updateUI(); } catch(e) {}
        }
        if (tabId === 'ihk') {
            renderIHKView();
        }
        if (tabId === 'school') {
            renderSchoolGradesInputs();
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

    // Navigate to history view and highlight a specific entry
    window.goToHistoryAndHighlight = function(entryId) {
        // Set the ID to highlight
        window.pendingHighlightId = entryId;

        switchTab('history');

        // Clear any date filters to show ALL entries
        const dateInput = document.getElementById('historyFilterStart');
        const dateInputEnd = document.getElementById('historyFilterEnd');

        if (dateInput && dateInputEnd) {
            dateInput.value = '';
            dateInputEnd.value = '';
            renderHistoryView();
        } else {
            setTimeout(renderHistoryView, 100);
        }
    }