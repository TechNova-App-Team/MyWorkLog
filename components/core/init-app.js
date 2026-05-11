// ═══ CORE: INIT-APP ═══
    if (!window._clsBC) window._clsBC = 'pre-init-unknown';

    // ── CLS Monitor — Full Spectrum ──
    (function initCLSMonitor() {
        if (!('PerformanceObserver' in window)) return;
        let clsTotal = 0;
        let shiftIndex = 0;
        const vw = window.innerWidth, vh = window.innerHeight;

        function rating(v) {
            if (v <= 0.1)  return { label: '✅ GOOD',         color: '#10b981', bg: '#052e16' };
            if (v <= 0.25) return { label: '⚠️  NEEDS WORK',  color: '#f59e0b', bg: '#422006' };
            return             { label: '❌ POOR',             color: '#ef4444', bg: '#450a0a' };
        }

        function pct(px, axis) { return ((px / (axis === 'x' ? vw : vh)) * 100).toFixed(1) + '%'; }

        function elPath(node) {
            if (!node || node === document.body) return 'body';
            const parts = [];
            let cur = node;
            let depth = 0;
            while (cur && cur !== document.documentElement && depth < 6) {
                const t = (cur.tagName || '?').toLowerCase();
                const i = cur.id ? `#${cur.id}` : '';
                const c = cur.classList && cur.classList.length
                    ? '.' + [...cur.classList].join('.') : '';
                parts.unshift(`${t}${i}${c}`);
                cur = cur.parentElement;
                depth++;
            }
            return parts.join(' > ');
        }

        function computedKey(el, prop) {
            try { return window.getComputedStyle(el).getPropertyValue(prop).trim(); }
            catch(e) { return '?'; }
        }

        try {
            const po = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    if (entry.hadRecentInput) continue;
                    shiftIndex++;
                    clsTotal += entry.value;
                    const sr = rating(entry.value);
                    const cr = rating(clsTotal);
                    const sources = entry.sources || [];

                    // ── HEADER ──────────────────────────────────────────────
                    console.group(
                        `%c ◈ CLS #${shiftIndex} %c+${entry.value.toFixed(6)}%c ${sr.label} %c∑${clsTotal.toFixed(6)} ${cr.label} %c @${Math.round(entry.startTime)}ms`,
                        'background:#1e1b4b;color:#a855f7;font-weight:800;padding:3px 8px;border-radius:6px 0 0 6px;font-size:11px;',
                        `background:${sr.bg};color:${sr.color};font-weight:700;padding:3px 10px;font-size:12px;`,
                        `background:${sr.bg};color:${sr.color};font-weight:700;padding:3px 8px;`,
                        `background:${cr.bg};color:${cr.color};font-weight:700;padding:3px 10px;font-size:11px;`,
                        'background:#0f172a;color:#64748b;padding:3px 8px;border-radius:0 6px 6px 0;font-size:11px;'
                    );

                    // ── TIMING ──────────────────────────────────────────────
                    console.groupCollapsed('%c⏱  TIMING', 'color:#818cf8;font-weight:700;font-size:11px;');
                    console.table({
                        startTime:    { value: `${Math.round(entry.startTime)} ms`,   note: 'when shift occurred' },
                        duration:     { value: `${Math.round(entry.duration)} ms`,    note: 'shift window length' },
                        triggerPhase: { value: window._clsBC || '?',                  note: 'last JS breadcrumb' },
                        hadRecentInput:{ value: String(entry.hadRecentInput),          note: 'excluded from CLS if true' },
                    });
                    console.groupEnd();

                    // ── SCORE MATH ──────────────────────────────────────────
                    console.groupCollapsed('%c📐 SCORE MATH', 'color:#818cf8;font-weight:700;font-size:11px;');
                    sources.forEach((s, i) => {
                        const pr = s.previousRect || {}, curr = s.currentRect || {};
                        const impactW = Math.max(pr.right||0, curr.right||0) - Math.min(pr.left||0, curr.left||0);
                        const impactH = Math.max(pr.bottom||0, curr.bottom||0) - Math.min(pr.top||0, curr.top||0);
                        const impactFrac = (impactW * impactH) / (vw * vh);
                        const dx = Math.abs((curr.left||0) - (pr.left||0));
                        const dy = Math.abs((curr.top||0)  - (pr.top||0));
                        const distFrac = Math.max(dx, dy) / Math.max(vw, vh);
                        console.log(
                            `%c [${i+1}] impactFraction: ${impactFrac.toFixed(4)}  ×  distanceFraction: ${distFrac.toFixed(4)}  =  ${(impactFrac * distFrac).toFixed(6)}`,
                            'color:#a78bfa;font-size:11px;font-family:monospace;'
                        );
                    });
                    console.log('%c viewport:', 'color:#64748b;font-size:11px;', `${vw}×${vh}px`);
                    console.groupEnd();

                    // ── SHIFTED ELEMENTS ────────────────────────────────────
                    sources.forEach((s, i) => {
                        const el   = s.node;
                        const pr   = s.previousRect || {};
                        const curr = s.currentRect  || {};
                        const dx   = Math.round((curr.left||0) - (pr.left||0));
                        const dy   = Math.round((curr.top||0)  - (pr.top||0));
                        const dw   = Math.round((curr.width||0) - (pr.width||0));
                        const dh   = Math.round((curr.height||0)- (pr.height||0));

                        console.groupCollapsed(
                            `%c📦 ELEMENT [${i+1}/${sources.length}]%c  Δx:${dx>0?'+':''}${dx}px  Δy:${dy>0?'+':''}${dy}px  Δw:${dw>0?'+':''}${dw}px  Δh:${dh>0?'+':''}${dh}px`,
                            'color:#c084fc;font-weight:700;font-size:11px;',
                            'color:#94a3b8;font-size:11px;font-family:monospace;'
                        );

                        // DOM path
                        console.log('%c DOM PATH', 'color:#6366f1;font-weight:700;font-size:10px;',
                            '\n' + elPath(el));

                        // All classes
                        if (el && el.classList && el.classList.length) {
                            console.log('%c ALL CLASSES', 'color:#6366f1;font-weight:700;font-size:10px;',
                                '\n' + [...el.classList].map(c => '.' + c).join('\n'));
                        }

                        // Rect table
                        console.table({
                            left:   { before: Math.round(pr.left||0),   after: Math.round(curr.left||0),   delta: `${dx>0?'+':''}${dx}px`, viewport: pct(Math.abs(dx),'x') },
                            top:    { before: Math.round(pr.top||0),    after: Math.round(curr.top||0),    delta: `${dy>0?'+':''}${dy}px`, viewport: pct(Math.abs(dy),'y') },
                            right:  { before: Math.round(pr.right||0),  after: Math.round(curr.right||0),  delta: `${Math.round((curr.right||0)-(pr.right||0))>0?'+':''}${Math.round((curr.right||0)-(pr.right||0))}px`, viewport: '' },
                            bottom: { before: Math.round(pr.bottom||0), after: Math.round(curr.bottom||0), delta: `${Math.round((curr.bottom||0)-(pr.bottom||0))>0?'+':''}${Math.round((curr.bottom||0)-(pr.bottom||0))}px`, viewport: '' },
                            width:  { before: Math.round(pr.width||0),  after: Math.round(curr.width||0),  delta: `${dw>0?'+':''}${dw}px`, viewport: pct(Math.abs(dw),'x') },
                            height: { before: Math.round(pr.height||0), after: Math.round(curr.height||0), delta: `${dh>0?'+':''}${dh}px`, viewport: pct(Math.abs(dh),'y') },
                        });

                        // Computed CSS that typically causes shifts
                        if (el) {
                            console.groupCollapsed('%c🎨 COMPUTED CSS (shift-relevant)', 'color:#6366f1;font-weight:700;font-size:10px;');
                            const props = ['position','display','margin-left','margin-top','margin-right','margin-bottom',
                                           'padding-left','padding-top','width','height','transform','top','left',
                                           'flex-direction','align-items','justify-content','grid-template-columns',
                                           'transition','animation','overflow','visibility','opacity','z-index'];
                            const cssData = {};
                            props.forEach(p => { cssData[p] = { value: computedKey(el, p) }; });
                            console.table(cssData);
                            console.groupEnd();

                            // Inline style
                            if (el.style && el.style.cssText) {
                                console.log('%c INLINE STYLE', 'color:#6366f1;font-weight:700;font-size:10px;',
                                    '\n' + el.style.cssText);
                            }

                            // Parent info
                            if (el.parentElement) {
                                const p = el.parentElement;
                                console.log('%c PARENT', 'color:#6366f1;font-weight:700;font-size:10px;',
                                    `${(p.tagName||'').toLowerCase()}${p.id?'#'+p.id:''}  display:${computedKey(p,'display')}  position:${computedKey(p,'position')}`);
                            }

                            // DOM node reference
                            console.log('%c DOM NODE', 'color:#6366f1;font-weight:700;font-size:10px;', el);
                        }
                        console.groupEnd();
                    });

                    // ── RAW ENTRY ───────────────────────────────────────────
                    console.groupCollapsed('%c🔬 RAW PerformanceEntry', 'color:#475569;font-weight:700;font-size:10px;');
                    console.log(entry);
                    console.groupEnd();

                    console.groupEnd(); // main group
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