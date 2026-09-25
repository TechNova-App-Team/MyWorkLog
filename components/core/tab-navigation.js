// ═══ CORE: TAB-NAVIGATION ═══

    // ── Ansichts-Skripte erst beim ersten Oeffnen ─────────────────────────
    // Diese Dateien braucht NUR ihre Ansicht. Bis v7.5.7 lud jeder App-Start
    // sie als defer-Skript mit (zusammen ~440 KB roh), und DOMContentLoaded
    // wartete auf jedes davon. Das Markup der Ansichten bleibt in der
    // index.html (i18n rendert /en/ daraus), nur der Code kommt nach.
    //
    // 🔴 Bewusst NICHT hier, weil der Start oder eine andere Datei sie ruft
    // (gemessen per Namens-Abgleich, v7.5.8):
    //   school.js  — init-app.js ruft scNormalizeSchool() (Datenmigration)
    //   ihk.js     — school.js liest ihkLehrjahrHeute() fuers laufende Lehrjahr
    //   goals.js   — handleEntry() in dashboard.js zeichnet die Ziele neu
    // Wer hier eine Datei ergaenzt, muss vorher alle ihre Top-Level-Namen
    // gegen den Rest greppen; jeder Aufruf von aussen braucht einen
    // typeof-Guard, sonst wirft er, solange die Ansicht nie offen war.
    //
    // yearview + monthcompare kommen zusammen: yvOpenMonth() setzt den Monat
    // per mcPickMonth(), BEVOR es auf die Monatsansicht schaltet.
    const VIEW_SCRIPTS = (function () {
        const ym = ['/components/yearview/yearview.js', '/components/monthcompare/monthcompare.js'];
        return {
            'performance':   ['/components/performance/performance.js'],
            'yearview':      ym,
            'monthcompare':  ym,
            'urlaubsplaner': ['/components/urlaubsplaner/urlaubsplaner.js'],
            'weekview':      ['/components/weekview/weekview.js'],
            'history':       ['/components/history/history.js'],
            'analytics-pro': ['/components/core/analytics-pro-engine.js',
                              '/components/core/galaxy-ultra-engine.js',
                              '/components/analytics-pro/analytics-pro.js']
        };
    })();
    // Cache-Buster von dieser Datei selbst uebernehmen: stamp-assets.js stempelt
    // nur src/href-Attribute, keine Zeichenketten in JS.
    const TN_VER = ((document.currentScript && document.currentScript.src) || '').match(/\?v=[^&#]+/);
    const _tnLoads = {};
    function tnL(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    function loadScriptOnce(path) {
        if (_tnLoads[path]) return _tnLoads[path];
        _tnLoads[path] = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = path + (TN_VER ? TN_VER[0] : '');
            s.onload = () => { s.dataset.ready = '1'; resolve(); };
            s.onerror = () => { delete _tnLoads[path]; s.remove(); reject(new Error('Laden fehlgeschlagen: ' + path)); };
            document.head.appendChild(s);
        });
        return _tnLoads[path];
    }
    // Der Reihe nach: galaxy-ultra-engine.js prueft beim Laden auf apGxState
    // aus analytics-pro-engine.js.
    function loadViewScripts(tabId) {
        return (VIEW_SCRIPTS[tabId] || []).reduce((p, path) => p.then(() => loadScriptOnce(path)), Promise.resolve());
    }
    function viewScriptsReady(tabId) {
        return (VIEW_SCRIPTS[tabId] || []).every(path =>
            !!document.querySelector('script[data-ready="1"][src^="' + path + '"]'));
    }

    // Offline muss jede Ansicht auch dann aufgehen, wenn sie nie offen war.
    // Deshalb holt die App die Dateien nach dem Start im Leerlauf einmal ab —
    // nur ins Cache des Service Workers (Cache-First auf ?v=), ohne sie
    // auszufuehren. Kein Parse/Compile, keine Wirkung auf DOMContentLoaded.
    function prefetchViewScripts() {
        const c = navigator.connection;
        if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;
        const all = [...new Set(Object.values(VIEW_SCRIPTS).flat())];
        all.forEach(path => { fetch(path + (TN_VER ? TN_VER[0] : ''), { credentials: 'same-origin' }).catch(() => {}); });
    }
    window.addEventListener('load', () => {
        const go = () => prefetchViewScripts();
        setTimeout(() => ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 8000 }) : go(), 4000);
    });

    // --- TAB LOGIC ---
    // Gibt ein Promise zurueck, das erfuellt ist, sobald die Ansicht gezeichnet
    // ist — wer danach auf ihre Funktionen zugreift, haengt sich daran.
    function switchTab(tabId) {
        // Feature-Nutzung zaehlen — nur der View-Name (Kategorie), nie Inhalte.
        // switchTab wird ausschliesslich durch echte Navigation getriggert (Dashboard
        // ist per HTML default aktiv, kein Auto-Call beim Start) → kein Rausch-Event.
        if (typeof mwlEvent === 'function') mwlEvent('feature_genutzt', { feature: tabId });

        // Schaltet die Einblendung der Ansichten frei (core.css) — beim
        // Seitenaufruf bleibt sie aus, sonst startet das Dashboard bei
        // Deckkraft 0 und der LCP rutscht auf den ersten JS-Repaint.
        document.body.classList.add('mwl-navigated');
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        
        document.getElementById('view-' + tabId).classList.add('active');
        const navEl = document.getElementById('nav-' + tabId);
        if(navEl) navEl.classList.add('active');

        // Sync mobile bottom nav
        document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.remove('active'));
        const mobBtn = document.getElementById('mobNav-' + tabId);
        if (mobBtn) mobBtn.classList.add('active');
        
        // Nur noch fuer document.title — der sichtbare Seitentitel in der
        // Kopfzeile ist weg, jede Ansicht bringt ihren eigenen .view-title mit.
        // Kein querySelector('.page-title') mehr: das Element gibt es nicht,
        // und ein Treffer auf eine gleichnamige neue Klasse wuerde deren Text
        // ueberschreiben.
        const titles = {
            'dashboard': 'Dashboard',
            'history': 'Daten-Analyse & Historie',
            'performance': 'Performance Analyse',
            'ihk': 'IHK / Karriere',
            'school': 'Berufsschule & Noten',
            'goals': 'Ziele & Fokus',
            'yearview': 'Jahresübersicht & Insights',
            'monthcompare': 'Monats-Vergleich & Detailanalyse',
            'weekview': 'Wochenansicht',
            'urlaubsplaner': 'Urlaubsplaner',
            'aibot': 'AI-Bot Assistent',
            'analytics-pro': 'Analytics Pro',
            'aufgaben': 'Aufgaben',
            'aufgaben-tab': 'Aufgaben',
        };
        document.title = 'MyWorkLog | ' + (titles[tabId] || tabId);

        if (window.innerWidth < 1024 && tabId !== 'dashboard') {
             toggleSidebar(); // Sidebar auf Mobile nach Klick ausblenden
        }

        // Die Ansicht steht schon da; ihr Skript kommt beim ersten Oeffnen nach.
        if (!viewScriptsReady(tabId)) {
            return loadViewScripts(tabId)
                .then(() => { if (document.getElementById('view-' + tabId).classList.contains('active')) renderTab(tabId); })
                .catch(err => {
                    console.warn('Ansicht konnte nicht geladen werden:', tabId, err);
                    if (typeof showCustomMessage === 'function') showCustomMessage(
                        tnL('Ansicht nicht geladen', 'View not loaded'),
                        tnL('Diese Ansicht konnte nicht geladen werden. Prüf die Verbindung und öffne sie noch einmal.',
                            'This view could not be loaded. Check your connection and open it again.'), 'warning');
                });
        }
        renderTab(tabId);
        return Promise.resolve();
    }

    function renderTab(tabId) {
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
        }
        if (tabId === 'weekview') {
            renderWeekView();
        }
        if (tabId === 'urlaubsplaner') {
            renderUrlaubsplaner();
        }
        if (tabId === 'aibot') {
            initializeAIBot();
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

        // Filter VOR dem Umschalten leeren: switchTab zeichnet die Historie
        // selbst, beim ersten Oeffnen erst nach dem Nachladen von history.js.
        const dateInput = document.getElementById('historyFilterStart');
        const dateInputEnd = document.getElementById('historyFilterEnd');
        if (dateInput) dateInput.value = '';
        if (dateInputEnd) dateInputEnd.value = '';

        return switchTab('history');
    }
