    // --- STATE & CONFIG ---
    let data = { 
        entries: [], 
        trash: [],
        customEntryTypes: [],  // NEW: User-defined entry types
        customFields: [],       // NEW: User-defined fields per type
        workflowRules: [],      // NEW: Conditional rules & automation
        untis: null,            // NEW: Untis integration data
        settings: { 
            name:'User', 
            theme:'#a855f7',
            themeMode: 'dark',
            hours:[0,8.75,8.75,8.75,8.75,4.5,0], 
            break:{thresh:6, min:[0, 15, 30, 30, 30, 30, 0]},
            vacation:{total:30, used:0, usedManual:0},
            ihk: {
                start: '',
                end: '',
                exam_zwischen: '',
                note_zwischen: '',
                note_abschluss: ''
            },
            school: {
                grades: {
                    'Kernprozesse': [],
                    'Wirtschaftslehre': [],
                    'IT-Systeme': [],
                    'Deutsch/Kommunikation': [],
                }
            },
            goals: [],
            prognosePlan: {}
        } 
    };
    let timer = { id:null, start:0, paused:0, running:false, log:[], breakTime: 0 };
    let editId = null;
    let isSidebarOpen = true;
    let selectedYearForView = new Date().getFullYear(); // Jahr für Jahresansicht

    let customModalCallback = null;
    let customModalResolve = null;

    function showCustomMessage(title, message, type = 'info') {
        const modal = document.getElementById('customMessageModal');
        const titleEl = document.getElementById('customMessageTitle');
        const contentEl = document.getElementById('customMessageContent');
        const confirmBtn = document.getElementById('customMessageBtnConfirm');
        const cancelBtn = document.getElementById('customMessageBtnCancel');

        titleEl.innerText = title;
        contentEl.innerText = message;
        
        if (type === 'error') {
            titleEl.style.color = 'var(--danger)';
            confirmBtn.style.background = 'var(--danger)';
        } else if (type === 'success') {
            titleEl.style.color = 'var(--success)';
            confirmBtn.style.background = 'var(--success)';
        } else {
            titleEl.style.color = 'var(--primary)';
            confirmBtn.style.background = 'var(--primary)';
        }
        
        cancelBtn.style.display = 'none';
        modal.classList.add('active');
        customModalResolve = null;
    }

    function showCustomConfirm(title, message, onConfirm, onCancel) {
        const modal = document.getElementById('customMessageModal');
        const titleEl = document.getElementById('customMessageTitle');
        const contentEl = document.getElementById('customMessageContent');
        const confirmBtn = document.getElementById('customMessageBtnConfirm');
        const cancelBtn = document.getElementById('customMessageBtnCancel');

        titleEl.innerText = title;
        contentEl.innerText = message;
        titleEl.style.color = 'var(--primary)';
        confirmBtn.style.background = 'var(--primary)';
        
        customModalCallback = { onConfirm, onCancel };
        
        cancelBtn.style.display = 'block';
        modal.classList.add('active');
    }

    function closeCustomModal(confirmed) {
        const modal = document.getElementById('customMessageModal');
        modal.classList.remove('active');
        
        if (customModalCallback) {
            if (confirmed && customModalCallback.onConfirm) {
                customModalCallback.onConfirm();
            } else if (!confirmed && customModalCallback.onCancel) {
                customModalCallback.onCancel();
            }
            customModalCallback = null;
        }
    }

    // --- ADVANCED EDIT ENTRY MODAL FUNCTIONS ---
    let editingEntryId = null;
    let editManualHoursOverride = false;

    function openEditModal(id) {
        const entry = data.entries.find(x => x.id === id);
        if (!entry) return;

        editingEntryId = id;
        editManualHoursOverride = false;

        // Basic fields
        document.getElementById('editInpDate').value = entry.date;
        document.getElementById('editInpType').value = entry.type;
        document.getElementById('editInpHours').value = entry.worked || '';
        document.getElementById('editInpProject').value = entry.project || '';
        document.getElementById('editInpNotes').value = entry.info || '';

        // Time fields
        document.getElementById('editInpStart').value = entry.shiftStart || entry.start || '';
        document.getElementById('editInpEnd').value = entry.shiftEnd || entry.end || '';
        document.getElementById('editInpBreak').value = entry.breakMins || '';

        // Advanced fields
        document.getElementById('editInpExpected').value = entry.expected || '';
        document.getElementById('editInpDiff').value = entry.diff !== undefined ? (entry.diff >= 0 ? '+' : '') + entry.diff.toFixed(2) + 'h' : '';
        const moodSelect = document.getElementById('editInpMood');
        if (moodSelect) moodSelect.value = entry.mood || '';

        // Update subtitle with entry date
        const dateObj = new Date(entry.date);
        const dateStr = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        document.getElementById('editModalSubtitle').textContent = dateStr;

        populateProjectOptions();
        editTypeChanged();
        recalcEditWorked();

        document.getElementById('editEntryModal').classList.add('active');
    }

    function populateProjectOptions() {
        const datalist = document.getElementById('editProjectList');
        datalist.innerHTML = '';
        if (data.settings.projects && data.settings.projects.length > 0) {
            data.settings.projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                datalist.appendChild(option);
            });
        }
    }

    function editTypeChanged() {
        const type = document.getElementById('editInpType').value;
        const timeSection = document.getElementById('editTimeSection');

        // Show time section only for work type
        if (type === 'work') {
            timeSection.style.display = 'block';
        } else {
            timeSection.style.display = 'none';
        }

        // Update info text
        const infoText = document.getElementById('editInfoText');
        const typeLabels = {
            'work': 'Arbeitszeit mit Start/Ende/Pause bearbeiten',
            'school': 'Berufsschultag = volle Sollstunden',
            'vacation': 'Urlaubstag wird automatisch berechnet',
            'gleittag': 'Gleittag: Überstundenabbau',
            'sick': 'Kranktag ohne Auswirkung auf Saldo',
            'holiday': 'Feiertag ohne Auswirkung auf Saldo'
        };
        infoText.textContent = typeLabels[type] || 'Änderungen werden sofort gespeichert';
    }

    function recalcEditWorked() {
        if (editManualHoursOverride) return;

        const startVal = document.getElementById('editInpStart').value;
        const endVal = document.getElementById('editInpEnd').value;
        const breakVal = parseInt(document.getElementById('editInpBreak').value) || 0;

        const grossEl = document.getElementById('editCalcGross');
        const breakEl = document.getElementById('editCalcBreak');
        const netEl = document.getElementById('editCalcNet');

        if (!startVal || !endVal) {
            grossEl.textContent = '—';
            breakEl.textContent = '—';
            netEl.textContent = '—';
            return;
        }

        const [h1, m1] = startVal.split(':').map(Number);
        const [h2, m2] = endVal.split(':').map(Number);

        let startMins = h1 * 60 + m1;
        let endMins = h2 * 60 + m2;

        // Handle overnight shifts
        if (endMins < startMins) endMins += 24 * 60;

        const grossMins = endMins - startMins;
        const netMins = grossMins - breakVal;

        const grossHours = grossMins / 60;
        const netHours = netMins / 60;

        grossEl.textContent = grossHours.toFixed(2) + 'h';
        breakEl.textContent = breakVal + ' min';
        netEl.textContent = netHours.toFixed(2) + 'h';

        // Auto-fill hours field
        if (netHours >= 0) {
            document.getElementById('editInpHours').value = netHours.toFixed(2);
        }

        // Update diff preview
        const dateVal = document.getElementById('editInpDate').value;
        if (dateVal) {
            const dayIndex = new Date(dateVal).getDay();
            const expected = parseFloat(document.getElementById('editInpExpected').value) || data.settings.hours[dayIndex] || 0;
            const diff = netHours - expected;
            document.getElementById('editInpDiff').value = (diff >= 0 ? '+' : '') + diff.toFixed(2) + 'h';
        }
    }

    function editHoursManualChanged() {
        const val = document.getElementById('editInpHours').value;
        if (val && val.trim() !== '') {
            editManualHoursOverride = true;
            // Update diff preview
            const dateVal = document.getElementById('editInpDate').value;
            if (dateVal) {
                const dayIndex = new Date(dateVal).getDay();
                const expected = parseFloat(document.getElementById('editInpExpected').value) || data.settings.hours[dayIndex] || 0;
                const diff = parseFloat(val) - expected;
                document.getElementById('editInpDiff').value = (diff >= 0 ? '+' : '') + diff.toFixed(2) + 'h';
            }
        }
    }

    function closeEditModal() {
        document.getElementById('editEntryModal').classList.remove('active');
        editingEntryId = null;
        editManualHoursOverride = false;
    }

    function saveEditEntry() {
        uEvent('entry-edit-saved');
        if (!editingEntryId) return;

        const entry = data.entries.find(x => x.id === editingEntryId);
        if (!entry) return;

        const newDate = document.getElementById('editInpDate').value;
        const newType = document.getElementById('editInpType').value;
        const newWorked = parseFloat(document.getElementById('editInpHours').value);
        const newProject = document.getElementById('editInpProject').value.trim();
        const newInfo = document.getElementById('editInpNotes').value.trim();

        // Time fields
        const newStart = document.getElementById('editInpStart').value;
        const newEnd = document.getElementById('editInpEnd').value;
        const newBreak = parseInt(document.getElementById('editInpBreak').value) || 0;

        // Advanced fields
        const newExpected = parseFloat(document.getElementById('editInpExpected').value);
        const newMood = document.getElementById('editInpMood')?.value || '';

        if (!newDate) {
            showCustomMessage('❌ Validierungsfehler', 'Bitte gib ein Datum ein.', 'error');
            return;
        }

        // Update entry
        entry.date = newDate;
        entry.type = newType;
        entry.project = newProject || undefined;
        entry.info = newInfo || undefined;
        entry.mood = newMood || undefined;

        // Time data
        if (newStart) entry.shiftStart = entry.start = newStart;
        if (newEnd) entry.shiftEnd = entry.end = newEnd;
        entry.breakMins = newBreak;

        // Calculate expected if not manually set
        const dayIndex = new Date(newDate).getDay();
        entry.expected = !isNaN(newExpected) ? newExpected : (data.settings.hours[dayIndex] || 0);

        // Type-specific logic
        if (newType === 'school') {
            entry.worked = entry.expected;
            entry.diff = 0;
        } else if (newType === 'vacation' || newType === 'sick' || newType === 'holiday') {
            entry.worked = entry.expected;
            entry.diff = 0;
        } else if (newType === 'gleittag') {
            entry.worked = 0;
            entry.diff = -entry.expected;
        } else {
            // Work type
            if (!isNaN(newWorked)) {
                entry.worked = newWorked;
            }
            entry.diff = entry.worked - entry.expected;
        }

        // Update timestamp for sync
        entry.timestamp = Date.now();

        save();
        closeEditModal();

        // Refresh views
        if (document.getElementById('view-history')?.classList.contains('active')) {
            renderHistoryView();
        }
        try { updateUI(); } catch(e) {}
        try { renderLists(); } catch(e) {}

        showCustomMessage('✅ Gespeichert', 'Eintrag erfolgreich aktualisiert!', 'success');
    }

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
        if(!data.settings.prognosePlan) data.settings.prognosePlan = {};
        if (typeof data.settings.shortcutsEnabled === 'undefined') data.settings.shortcutsEnabled = true;
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
        if (document.getElementById('view-prognose').classList.contains('active')) {
             renderPrognoseView();
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
    function cleanupLocalStorage() {
        // Lösche alte tt_export_reminder_shown_* Keys - behalte nur den heutigen
        const today = new Date().toISOString().split('T')[0];
        const currentKey = 'tt_export_reminder_shown_' + today;
        
        let deletedCount = 0;
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tt_export_reminder_shown_') && key !== currentKey) {
                localStorage.removeItem(key);
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} alte Export-Reminder Keys`);
        }
    }

    function save() { 
        // Cleanup alte LocalStorage Keys
        try {
            cleanupLocalStorage();
        } catch (e) {
            console.warn('⚠️ LocalStorage Cleanup fehlgeschlagen:', e);
        }

        try {
            // Backup snapshot (keep last 10) - lightweight safety net for debugging
            const backupsStr = localStorage.getItem('tg_pro_data_backups');
            const backups = backupsStr ? JSON.parse(backupsStr) : [];
            const snapshot = { ts: Date.now(), data: JSON.parse(JSON.stringify(data)) };
            backups.push(snapshot);
            while (backups.length > 10) backups.shift();
            localStorage.setItem('tg_pro_data_backups', JSON.stringify(backups));
        } catch (e) {
            console.warn('⚠️ Backup snapshot failed:', e);
        }

        localStorage.setItem('tg_pro_data', JSON.stringify(data)); 
        localStorage.setItem('tg_last_save', Date.now());
        checkAlertsThresholds();
        checkOvertimeAlert();
        updateUI(); 
    }

    function checkOvertimeAlert() {
        const workEntries = data.entries.filter(e => e.type === 'work' && e.worked > 0);
        const thisWeek = workEntries.filter(e => {
            const entryDate = new Date(e.date);
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
            return entryDate >= weekStart;
        });
        const totalHours = thisWeek.reduce((sum, e) => sum + e.worked, 0);
        const overtimeThreshold = data.settings.overtimeAlert || 40; // Default 40h

        if (totalHours >= overtimeThreshold) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⚠️ Überstunden-Alarm', {
                    body: `Du hast diese Woche bereits ${totalHours.toFixed(1)}h gearbeitet. Überstunden-Threshold: ${overtimeThreshold}h`,
                    icon: '/favicon.ico'
                });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('⚠️ Überstunden-Alarm', {
                            body: `Du hast diese Woche bereits ${totalHours.toFixed(1)}h gearbeitet. Überstunden-Threshold: ${overtimeThreshold}h`,
                            icon: '/favicon.ico'
                        });
                    }
                });
            }
            // Fallback: In-App Message
            showCustomMessage('⚠️ Überstunden', `Diese Woche: ${totalHours.toFixed(1)}h (Threshold: ${overtimeThreshold}h)`, 'warning');
        }
    }

    function checkAchievements() {
        const workEntries = data.entries.filter(e => e.type === 'work' && e.worked > 0);
        const totalHours = workEntries.reduce((sum, e) => sum + e.worked, 0);
        const achievements = data.achievements || [];

        const milestones = [10, 50, 100, 500, 1000];
        milestones.forEach(milestone => {
            if (totalHours >= milestone && !achievements.includes(`total_${milestone}`)) {
                achievements.push(`total_${milestone}`);
                showCustomMessage('🏆 Achievement!', `Du hast ${milestone} Arbeitsstunden erreicht!`, 'success');
            }
        });

        // Wöchentliche Meilensteine
        const thisWeek = workEntries.filter(e => {
            const entryDate = new Date(e.date);
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
            return entryDate >= weekStart;
        });
        const weekHours = thisWeek.reduce((sum, e) => sum + e.worked, 0);
        if (weekHours >= 40 && !achievements.includes('week_40')) {
            achievements.push('week_40');
            showCustomMessage('🏆 Wöchentliches Achievement!', '40h in einer Woche gearbeitet!', 'success');
        }

    }
    
    // --- Trash Functions ---
    function openTrashModal() {
        const modal = document.getElementById('trashModal');
        if (!modal) return;
        modal.classList.add('active');
        modal.style.display = 'flex';
        renderTrashModal();
        // Accessibility: set role and aria
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) modalBox.setAttribute('tabindex', '-1');
        // Close on click outside content
        modal._overlayClick = function overlayClick(e) { if (e.target === modal) { closeTrashModal(); } };
        modal.addEventListener('click', modal._overlayClick);
        // focus first actionable element (close button)
        const closeBtn = modal.querySelector('.modal-close-x');
        if (closeBtn) closeBtn.focus();
        // Add escape listener to close
        modal._escHandler = (e) => { if (e.key === 'Escape') closeTrashModal(); };
        document.addEventListener('keydown', modal._escHandler);
    }
    function renderTrashModal() {
        const list = document.getElementById('trashList');
        if (!list) return;
        list.innerHTML = '';

        if (!Array.isArray(data.trash) || data.trash.length === 0) {
            list.innerHTML = `
                <div class="trash-empty">
                    <div style="font-size:2.25rem;">🧹</div>
                    <h4>Papierkorb ist leer</h4>
                    <p>Keine kürzlichen Löschungen. Gelöschte Einträge erscheinen hier und können wiederhergestellt werden.</p>
                    <div style="display:flex; gap:10px; margin-top:8px;">
                        <button class="btn" onclick="closeTrashModal()">Schließen</button>
                        <button class="btn btn-ghost" onclick="switchTab('history'); closeTrashModal();">Zur Chronik</button>
                    </div>
                </div>
            `;
            document.getElementById('trashCountBadge').textContent = '0';
            const hdr = document.getElementById('trashCountHeader'); if (hdr) hdr.textContent = '0';
            return;
        }

        document.getElementById('trashCountBadge').textContent = data.trash.length;
        const hdr = document.getElementById('trashCountHeader'); if (hdr) hdr.textContent = data.trash.length;
        const autoInput = document.getElementById('trashAutoDaysInput');
        if (autoInput) autoInput.value = data.settings.trashAutoEmptyDays || 0;

        data.trash.slice().reverse().forEach((t, idx) => {
            const deletedAt = new Date(t.deletedAt || Date.now());
            const ageDays = Math.floor((Date.now() - deletedAt.getTime()) / 86400000);
            const entry = t.entry;
            const row = document.createElement('div');
            row.className = 'trash-item';
            row.style.cssText = 'display:flex; gap:12px; align-items:center; background:transparent; padding:8px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.02);';

            const typeIcon = document.createElement('div');
            typeIcon.style.cssText = 'width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.25rem; background:linear-gradient(135deg, rgba(var(--primary-rgb),0.06), rgba(var(--primary-rgb),0.03)); border:1px solid rgba(var(--primary-rgb),0.12);';
            typeIcon.innerText = getTypeEmoji(entry.type || 'work');

            const body = document.createElement('div');
            body.style.flex = '1';
            body.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div style="font-weight:700; color:var(--text-main);">${entry.date} · ${entry.type} · ${entry.worked}h</div>
                    <div style="color:var(--text-muted); font-size:0.9rem;">${ageDays}d</div>
                </div>
                <div style="color:var(--text-muted); font-size:0.85rem; margin-top:6px;">${entry.project ? '<strong style="color:var(--primary);">' + entry.project + '</strong> · ' : ''}${entry.info ? entry.info : ''}</div>
            `;

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            actions.style.alignItems = 'center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.trashIndex = (data.trash.length - 1 - idx);

            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'btn btn-ghost';
            restoreBtn.textContent = '↩️';
            restoreBtn.title = 'Wiederherstellen';
            restoreBtn.onclick = () => { restoreSingleTrash(parseInt(checkbox.dataset.trashIndex)); };

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger';
            delBtn.textContent = '🗑️';
            delBtn.title = 'Löschen';
            delBtn.onclick = () => { trashDeleteConfirm(parseInt(checkbox.dataset.trashIndex)); };

            actions.appendChild(checkbox);
            actions.appendChild(restoreBtn);
            actions.appendChild(delBtn);

            row.appendChild(typeIcon);
            row.appendChild(body);
            row.appendChild(actions);
            list.appendChild(row);
        });
    }

    function restoreSingleTrash(trashIndex) {
        uEvent('trash-restore');
        if (!data.trash || data.trash.length === 0) return;
        const t = data.trash[trashIndex];
        if (!t) return;
        const restored = t.entry;
        const idx = (t.originalIndex != null) ? Math.min(t.originalIndex, data.entries.length) : data.entries.length;
        data.entries.splice(idx, 0, restored);
        // Remove from trash
        data.trash.splice(trashIndex, 1);
        save();
        renderTrashModal();
        if (document.getElementById('view-history').classList.contains('active')) renderHistoryView();
        showCustomMessage('↩️ Wiederhergestellt', 'Eintrag wurde wiederhergestellt.', 'success');
    }

    function trashDeleteConfirm(trashIndex) {
        showCustomConfirm('🗑️ Eintrag endgültig löschen?', 'Dieser Eintrag wird unwiderruflich gelöscht. Fortfahren?', () => {
            data.trash.splice(trashIndex, 1);
            save();
            renderTrashModal();
            showCustomMessage('✅ Gelöscht', 'Eintrag wurde dauerhaft entfernt.', 'success');
        }, null);
    }

    function trashSelectAll(el) {
        const list = document.getElementById('trashList');
        if (!list) return;
        const checkboxes = list.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = el.checked);
    }

    function trashBulkRestore() {
        const list = document.getElementById('trashList');
        if (!list) return;
        const checkboxes = Array.from(list.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked);
        if (!checkboxes.length) { showCustomMessage('ℹ️ Keine Auswahl', 'Bitte markiere Einträge zum Wiederherstellen.', 'info'); return; }
        // Sort by index ascending to restore correctly (smallest index first)
        const indexes = checkboxes.map(cb => parseInt(cb.dataset.trashIndex)).sort((a,b)=>a-b);
        for (const i of indexes) {
            const t = data.trash[i];
            if (!t) continue;
            const restored = t.entry; const idx = (t.originalIndex != null) ? Math.min(t.originalIndex, data.entries.length) : data.entries.length;
            data.entries.splice(idx, 0, restored);
        }
        // Remove restored indexes from trash (reverse order to avoid index shift)
        for (const i of indexes.sort((a,b)=>b-a)) { data.trash.splice(i,1); }
        save(); renderTrashModal(); if (document.getElementById('view-history').classList.contains('active')) renderHistoryView(); showCustomMessage('✅ Wiederherstellt', 'Markierte Einträge wiederhergestellt.', 'success');
    }

    function trashBulkDeleteConfirm() {
        showCustomConfirm('🗑️ Markierte Einträge löschen?', 'Markierte Einträge werden unwiderruflich gelöscht. Fortfahren?', () => {
            const list = document.getElementById('trashList'); if (!list) return; const checkboxes = Array.from(list.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked);
            const indexes = checkboxes.map(cb => parseInt(cb.dataset.trashIndex)).sort((a,b)=>b-a);
            for (const i of indexes) data.trash.splice(i,1);
            save(); renderTrashModal(); showCustomMessage('✅ Gelöscht', 'Markierte Einträge wurden gelöscht.', 'success');
        }, null);
    }

    function emptyTrashConfirm() {
        showCustomConfirm('🧹 Papierkorb jetzt leeren?', 'Alle Einträge im Papierkorb werden dauerhaft gelöscht. Fortfahren?', () => {
            data.trash = [];
            save(); renderTrashModal(); showCustomMessage('✅ Papierkorb geleert', 'Alle Einträge wurden gelöscht.', 'success');
        }, null);
    }

    function saveTrashAutoDays() {
        const v = parseInt(document.getElementById('trashAutoDaysInput').value,10) || 0;
        data.settings.trashAutoEmptyDays = v; save(); showCustomMessage('✅ Gespeichert', `Auto-Leerung nach ${v} Tagen eingestellt.`, 'success');
    }

    function autoEmptyTrash() {
        const days = data.settings.trashAutoEmptyDays || 0;
        if (!days || days <= 0) return;
        const now = Date.now(); const ms = days * 86400000;
        const before = data.trash.length;
        data.trash = data.trash.filter(t => (now - (t.deletedAt || 0)) <= ms);
        if (data.trash.length !== before) { save(); }
    }
    function saveTimerState() { 
        localStorage.setItem('tg_timer', JSON.stringify({
            id: timer.id, start: timer.start, paused: timer.paused, running: timer.running, breakTime: timer.breakTime // NEU: breakTime gespeichert
        })); 
        localStorage.setItem('tg_timer_log', JSON.stringify(timer.log));
    }

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
            'prognose': 'Saldo Prognose & Zukunftsplanung',
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
        if (tabId === 'prognose') { // NEU
            renderPrognoseView();
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
    // --- SCHOOL LOGIC (NEU GESTALTET) ---
    
    const getNoteColor = (note) => {
         const n = parseFloat(note);
         if (isNaN(n) || n === 0) return 'var(--text-muted)';
         if (n <= 2.0) return 'var(--note-good)';
         if (n <= 3.0) return 'var(--note-mid)';
         return 'var(--note-bad)';
    };
    
    // Hilfsfunktion zur Umrechnung der Schulnote in einen Radial-Wert (0% bis 100%)
    function mapNoteToRadial(note) {
         const n = parseFloat(note);
         if (isNaN(n) || n <= 0) return 0;
         
         // Note 1.0 = 100% (bestes Ergebnis), Note 6.0 = 0% (schlechtestes Ergebnis)
         const maxNote = 6.0;
         const minNote = 1.0;
         
         // Lineare Interpolation: (max - n) / (max - min) * 100
         const progress = ((maxNote - n) / (maxNote - minNote)) * 100;
         
         return Math.max(0, Math.min(100, progress));
    }
    function addSchoolSubjectInput() {
        const subject = prompt('Fachname eingeben (z.B. "Mathematik", "Englisch"):');
        if (subject && subject.trim()) {
            const cleanSubject = subject.trim();
            if (!data.settings.school.grades[cleanSubject]) {
                data.settings.school.grades[cleanSubject] = [''];
                renderSchoolGradesInputs();
                showCustomMessage('✅ Fach hinzugefügt', `Das Fach "${cleanSubject}" wurde hinzugefügt. Gib jetzt Noten ein!`, 'success');
            } else {
                showCustomMessage('⚠️ Fach existiert', `Das Fach "${cleanSubject}" existiert bereits!`, 'warning');
            }
        }
    }

    function deleteSchoolSubject(subject) {
        if (confirm(`Möchtest du das Fach "${subject}" wirklich löschen? Alle Noten in diesem Fach werden gelöscht.`)) {
            delete data.settings.school.grades[subject];
            save();
            renderSchoolGradesInputs();
            showCustomMessage('✅ Fach gelöscht', `Das Fach "${subject}" wurde gelöscht.`, 'success');
        }
    }

    function renameSchoolSubject(oldSubject) {
        const newSubject = prompt(`Neuer Name für "${oldSubject}":`, oldSubject);
        if (newSubject && newSubject.trim()) {
            const cleanNewSubject = newSubject.trim();
            if (cleanNewSubject === oldSubject) {
                return; // Keine Änderung
            }
            if (data.settings.school.grades[cleanNewSubject]) {
                showCustomMessage('⚠️ Fach existiert bereits', `Das Fach "${cleanNewSubject}" existiert bereits!`, 'warning');
                return;
            }
            // Alte Grades zu neue Subject kopieren
            data.settings.school.grades[cleanNewSubject] = data.settings.school.grades[oldSubject];
            delete data.settings.school.grades[oldSubject];
            save();
            renderSchoolGradesInputs();
            showCustomMessage('✅ Fach umbenannt', `"${oldSubject}" wurde in "${cleanNewSubject}" umbenannt.`, 'success');
        }
    }
    
    function saveSchoolGrades() {
        const inputs = document.querySelectorAll('.school-grade-input');
        const newGrades = {};
        
        for (const subject in data.settings.school.grades) {
            newGrades[subject] = [];
        }

        inputs.forEach(input => {
            const subject = input.getAttribute('data-subject');
            const grade = parseFloat(input.value);

            if (!isNaN(grade) && grade >= 1.0 && grade <= 6.0) {
                 newGrades[subject].push(grade);
            }
            // Leere oder ungültige Einträge werden nicht gespeichert, aber der Subject-Array bleibt bestehen.
        });
        
        data.settings.school.grades = newGrades;
        save();
        renderSchoolGradesInputs(); 
        showCustomMessage('✅ Erfolg', 'Berufsschulnoten erfolgreich gespeichert!', 'success');
    }
    
    function calculateSchoolKPIs() {
        let totalSum = 0;
        let totalCount = 0;
        let bestNote = 6.1; 
        let worstNote = 0.9; 
        let bestSubject = '---';
        let worstSubject = '---';
        
        let gradeListHTML = '';
        
        for (const subject in data.settings.school.grades) {
            const grades = data.settings.school.grades[subject];
            
            if (grades.length > 0) {
                let subjectSum = 0;
                grades.forEach(grade => {
                    const n = parseFloat(grade);
                    if (!isNaN(n) && n >= 1.0 && n <= 6.0) {
                        totalSum += n;
                        totalCount++;
                        subjectSum += n;

                        if (n < bestNote) {
                            bestNote = n;
                            bestSubject = subject;
                        }
                        if (n > worstNote) {
                            worstNote = n;
                            worstSubject = subject;
                        }
                    }
                });
                
                if (grades.filter(n => !isNaN(parseFloat(n))).length > 0) {
                    const validCount = grades.filter(n => !isNaN(parseFloat(n))).length;
                    const subjectAvg = subjectSum / validCount;
                    const avgColor = getNoteColor(subjectAvg);
                    const pct = mapNoteToRadial(subjectAvg);
                    const emoji = subjectAvg <= 1.5 ? '🌟' : subjectAvg <= 2.5 ? '✅' : subjectAvg <= 3.5 ? '📘' : subjectAvg <= 4.5 ? '⚠️' : '🔴';

                    // Premium Fächerkarte
                    gradeListHTML += `
                        <div class="school-subject-card">
                            <div class="subject-bar" style="background:linear-gradient(90deg,${avgColor},${avgColor}80);"></div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                                <span style="font-size:1.4rem;">${emoji}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:700;color:#fff;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${subject}</div>
                                    <div style="font-size:.72rem;color:rgba(255,255,255,0.35);">${validCount} Note${validCount > 1 ? 'n' : ''} erfasst</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:1.6rem;font-weight:800;color:${avgColor};font-family:var(--font-mono);line-height:1;">${subjectAvg.toFixed(1)}</div>
                                </div>
                            </div>
                            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${avgColor},${avgColor}aa);border-radius:4px;transition:width 1s cubic-bezier(.4,0,.2,1);"></div>
                            </div>
                            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:.72rem;color:rgba(255,255,255,0.3);">
                                <span>Einzelnoten: ${grades.filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6).map(n => parseFloat(n).toFixed(1)).join(', ')}</span>
                                <span>${pct.toFixed(0)}%</span>
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        const overallAvg = totalCount > 0 ? totalSum / totalCount : 0;
        
        // Anpassung falls keine Noten existieren
        if (totalCount === 0) {
            bestNote = 0;
            worstNote = 0;
        } else if (bestNote === 6.1) {
             bestNote = worstNote;
             bestSubject = worstSubject;
        } else if (worstNote === 0.9) {
             worstNote = bestNote;
             worstSubject = bestSubject;
        }
        
        return {
            overallAvg: overallAvg,
            bestNote: bestNote, 
            worstNote: worstNote, 
            bestSubject,
            worstSubject,
            gradeListHTML
        };
    }
    function saveIHKSettings() {
        // **IHK FIX: Sicherstellung, dass alle Daten ins data-Objekt gespeichert werden**
        data.settings.ihk.start = document.getElementById('confIHKStart').value;
        data.settings.ihk.end = document.getElementById('confIHKEnd').value;
        data.settings.ihk.exam_zwischen = document.getElementById('confIHKExamZwischen').value;
        data.settings.ihk.note_zwischen = document.getElementById('confIHKNoteZwischen').value;
        data.settings.ihk.note_abschluss = document.getElementById('confIHKNoteAbschluss').value;
        
        save();
        renderIHKView();
        showCustomMessage('✅ Erfolg', 'IHK Daten (inkl. Noten) erfolgreich gespeichert und berechnet.', 'success');
    }


    // --- LOGIC (handleEntry remains unchanged for core functionality) ---
    function calculateProjectDistribution() {
        const projectHours = {};
        let totalWorkHours = 0;

        data.entries.forEach(e => {
            if (e.type === 'work' && e.worked > 0) {
                const projectName = e.project || 'Unbekannt'; 
                
                if (projectName !== 'Manuell' && projectName !== '') {
                     projectHours[projectName] = (projectHours[projectName] || 0) + e.worked;
                     totalWorkHours += e.worked;
                }
            }
        });

        // Sortieren und Top 5 behalten (Rest als 'Sonstige')
        const sortedProjects = Object.entries(projectHours)
            .sort(([, a], [, b]) => b - a);

        let topProjects = sortedProjects.slice(0, 5);
        let otherHours = sortedProjects.slice(5).reduce((sum, [, hours]) => sum + hours, 0);

        const distribution = topProjects.map(([name, hours]) => ({ name, hours }));

        if (otherHours > 0) {
            distribution.push({ name: 'Sonstige Projekte', hours: otherHours });
        }
        
        return { distribution, totalWorkHours };
    }
    // --- TIMER LOGIC (Mit Korrektur) ---
    
    function logTimerAction(action, time = Date.now()) {
        const lastAction = timer.log.at(-1);
        
        const today = new Date().toISOString().split('T')[0];
        
        // Pausenzeit messen
        if (action === 'start' && lastAction && lastAction.action === 'pause') {
            // Pause beendet: Zeit seit letzter Pause-Aktion messen
            timer.breakTime += time - lastAction.time;
        }

        if (action === 'start') {
            if (timer.running && lastAction && lastAction.action === 'start') return;
            timer.log.push({ action: 'start', time, date: today });
        } else if (action === 'pause') {
            // Pausen-Aktion speichert nur den Startpunkt der Pause
            timer.log.push({ action: 'pause', time, date: today });
        } else if (action === 'stop') {
            // Wenn gestoppt wird, während der Timer läuft, muss die Zeit bis jetzt noch zu paused addiert werden
            if (timer.running) {
                timer.paused += time - timer.start;
            }
            
            // Wenn gestoppt wird, während Pause aktiv ist, muss die Pausenzeit noch gemessen werden
            if (lastAction && lastAction.action === 'pause') {
                timer.breakTime += time - lastAction.time;
            }

            timer.log.push({ action: 'stop', time, date: today });
            timer.log = []; // Log leeren nach Stop
        }
        
        saveTimerState();
        renderTimerLogBar();
    }
    function timerRun() {
        if (!timer.running) return;
        requestAnimationFrame(timerRun);
        
        const now = Date.now();
        const rawRunningTimeMs = now - timer.start;
        const totalWorkedMs_raw = rawRunningTimeMs + timer.paused;
        
        // Netto-Arbeitszeit anzeigen
        const totalWorkedMs_netto = totalWorkedMs_raw - timer.breakTime;
        
        displayTimerTime(totalWorkedMs_netto);
        renderTimerLogBar();
    }
    
    function displayTimerTime(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        document.getElementById('timerDisplay').innerText = `${h<10?'0'+h:h}:${m<10?'0'+m:m}:${s<10?'0'+s:s}`;
    }
    
    function renderTimerLogBar() {
        const logBar = document.getElementById('timerLogBar');
        const statusEl = document.getElementById('timerStatus');
        logBar.innerHTML = '';
        
        // Sicherheitscheck: Falls timer.log undefined ist
        if (!timer.log) {
            statusEl.innerText = 'STOP';
            statusEl.classList.remove('running', 'paused', 'max');
            return;
        }
        
        // Filtere Log, um nur Start/Pause zu behalten (Stop ist der Endpunkt)
        const relevantLog = timer.log.filter(l => l.action !== 'stop');
        
        if (relevantLog.length === 0 && !timer.running) {
            statusEl.innerText = 'STOP';
            statusEl.classList.remove('running', 'paused', 'max');
            return;
        }

        const firstStart = relevantLog.find(l => l.action === 'start')?.time || timer.start || Date.now();
        const totalTimeMs = (timer.running ? Date.now() : relevantLog.at(-1)?.time || firstStart) - firstStart;
        
        if (totalTimeMs <= 0) return;

        let cumulativeTime = 0;
        let lastTime = firstStart;
        let breakMsTotal = 0;
        
        // Status-Anzeige (Berücksichtigt die Gesamt-Pause)
        const totalWorkedHours = (timer.paused + (timer.running ? Date.now() - timer.start : 0)) / 3.6e6;
        const minBreakRequired = data.settings.break.min / 60;
        const netTimeAfterBreak = totalWorkedHours - (timer.breakTime / 3.6e6);
        const requiredBreak = totalWorkedHours >= data.settings.break.thresh ? minBreakRequired : 0;
        const breakDeficit = Math.max(0, requiredBreak - (timer.breakTime / 3.6e6));

        if (timer.running) {
             statusEl.innerText = 'LÄUFT';
             statusEl.classList.add('running');
             statusEl.classList.remove('paused');
             if (breakDeficit > 0.1) statusEl.innerText = `LÄUFT (PAUSEN-DEFIZIT)`;
        } else {
             statusEl.innerText = 'PAUSIERT';
             statusEl.classList.add('paused');
             statusEl.classList.remove('running');
        }

        for (let i = 0; i < relevantLog.length; i++) {
            const logEntry = relevantLog[i];
            const nextEntry = relevantLog[i + 1];

            if (logEntry.action === 'start') {
                const segmentEnd = nextEntry ? nextEntry.time : (timer.running ? Date.now() : logEntry.time);
                const segmentDuration = segmentEnd - lastTime;
                
                if (segmentDuration > 0) {
                    const widthPercent = (segmentDuration / totalTimeMs) * 100;
                    const leftPercent = (cumulativeTime / totalTimeMs) * 100;
                    
                    const runningSegment = document.createElement('div');
                    runningSegment.className = 'timer-log-segment';
                    runningSegment.style.background = 'var(--primary)';
                    runningSegment.style.width = `${widthPercent}%`;
                    runningSegment.style.left = `${leftPercent}%`;
                    logBar.appendChild(runningSegment);
                    
                    cumulativeTime += segmentDuration;
                }
                lastTime = segmentEnd;

            } else if (logEntry.action === 'pause') {
                const segmentEnd = nextEntry ? nextEntry.time : (timer.running ? Date.now() : logEntry.time); // Bis zum nächsten Start oder jetzt
                const segmentDuration = segmentEnd - logEntry.time; // Dauer der Pause selbst
                
                if (segmentDuration > 0) {
                    const widthPercent = (segmentDuration / totalTimeMs) * 100;
                    const leftPercent = (logEntry.time - firstStart) / totalTimeMs * 100; // Startpunkt der Pause
                    
                    const pauseSegment = document.createElement('div');
                    pauseSegment.className = 'timer-log-segment';
                    pauseSegment.style.background = 'var(--audit-warn)';
                    pauseSegment.style.width = `${widthPercent}%`;
                    pauseSegment.style.left = `${leftPercent}%`;
                    logBar.appendChild(pauseSegment);
                    
                    cumulativeTime += segmentDuration;
                }
                lastTime = segmentEnd;
            }
        }
    }


    // --- VACATION & FEIERTAGS MANAGEMENT ---
    
    function calculateProRataVacation(totalAnnualDays = 30) {
        const startStr = data.settings.ihk.start;
        const now = new Date();
        
        if (!startStr) {
            return totalAnnualDays; 
        }

        const startDate = new Date(startStr);
        const startYear = startDate.getFullYear();
        const currentYear = now.getFullYear();

        if (currentYear > startYear) {
            // Nach dem ersten Jahr oder wenn das Startdatum vor dem 1. Januar des aktuellen Jahres liegt
            return totalAnnualDays;
        }

        // Berechnung für das Eintrittsjahr (Annahme: Anspruch ab dem 1. des Eintrittsmonats)
        const entryMonth = startDate.getMonth(); // 0 = Januar
        const remainingMonths = 12 - entryMonth;
        
        // Formel: (Jahresanspruch / 12) * verbleibende Monate
        const proRata = (totalAnnualDays / 12) * remainingMonths;
        // Aufrunden auf den nächsten vollen Tag
        return Math.ceil(proRata); 
    }

    function recalculateVacationUsed() {
        // Gleittage zählen NICHT als Urlaubstage (nur echte vacation-Einträge)
        const vacationEntries = data.entries.filter(e => e.type === 'vacation' && e.expected > 0);
        const autoUsedDays = vacationEntries.length;
        data.settings.vacation.used = autoUsedDays + parseFloat(data.settings.vacation.usedManual || 0);
    }
    
    function deletePeriod(startStrArg, endStrArg) {
        const startStr = startStrArg || (document.getElementById('periodStart') ? document.getElementById('periodStart').value : '') || '';
        const endStr = endStrArg || (document.getElementById('periodEnd') ? document.getElementById('periodEnd').value : '') || '';
        
        if (!startStr || !endStr) return showCustomMessage('❌ Fehler', 'Bitte wähle Start- und Enddatum für die zu löschende Periode.', 'error');

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        
        if (startDate > endDate) return showCustomMessage('❌ Fehler', 'Startdatum muss vor Enddatum liegen.', 'error');
        
        showCustomConfirm(
            '⚠️ Periodenbuchungen löschen?',
            `Alle Periodenbuchungen (Urlaub/Feiertag) zwischen ${startStr} und ${endStr} werden unwiderruflich gelöscht!`,
            () => {
                let deletedCount = 0;

                // Nur Einträge löschen, die vom Typ vacation oder holiday sind UND die in der Periode liegen
                data.entries = data.entries.filter(e => {
                    const eDate = new Date(e.date);
                    
                    const isTargetType = (e.type === 'vacation' || e.type === 'holiday');
                    const isWithinPeriod = eDate >= startDate && eDate <= endDate;
                    
                    if (isTargetType && isWithinPeriod) {
                        deletedCount++;
                        return false; // Eintrag löschen (nicht behalten)
                    }
                    return true; // Eintrag behalten
                });
                
                recalculateVacationUsed();
                
                showCustomMessage('✅ Erfolg', `${deletedCount} Perioden-Buchungen wurden gelöscht.`, 'success');
                save();
                document.getElementById('settingsModal').classList.remove('active');
            },
            null
        );
        return;
    }


    function bookPeriod(startStrArg, endStrArg, periodTypeArg) {
        const startStr = startStrArg || (document.getElementById('periodStart') ? document.getElementById('periodStart').value : '') || '';
        const endStr = endStrArg || (document.getElementById('periodEnd') ? document.getElementById('periodEnd').value : '') || '';
        const periodType = periodTypeArg || (document.getElementById('periodType') ? document.getElementById('periodType').value : 'vacation');
        
        if (!startStr || !endStr) return showCustomMessage('❌ Fehler', 'Bitte wähle Start- und Enddatum.', 'error');

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        if (startDate > endDate) return showCustomMessage('❌ Fehler', 'Startdatum muss vor Enddatum liegen.', 'error');
        
        const tempEntries = [];
        const daysToOverride = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateKey = toLocalISODate(currentDate);
            const dayIndex = currentDate.getDay(); 
            const expected = data.settings.hours[dayIndex] || 0;
            
            if (expected > 0) { 
                
                const existingEntry = data.entries.find(e => e.date === dateKey);

                if (existingEntry) {
                     daysToOverride.push(dateKey);
                }
                
                tempEntries.push({
                    id: Date.now() + Math.random(),
                    date: dateKey,
                    type: periodType,
                    worked: expected,
                    expected: expected,
                    diff: 0,
                    info: periodType === 'vacation' ? 'Urlaub (Block)' : 'Firmen-Frei/Feiertag (Block)',
                    isPeriod: true,
                    breakMins: 0, shiftEnd: '', shiftWarning: false
                });
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (daysToOverride.length > 0) {
            showCustomConfirm(
                '⚠️ Einträge überschreiben?',
                `Achtung! ${daysToOverride.length} Tage haben bereits Einträge (z.B. Arbeit oder Schule).\nSollen diese überschrieben/gelöscht werden?`,
                () => {
                    data.entries = data.entries.filter(e => !daysToOverride.includes(e.date));
                    
                    // Automatisch generierte Feiertage im Zeitraum löschen, um doppelte Zählung zu vermeiden
                    data.entries = data.entries.filter(e => {
                        const eDate = new Date(e.date);
                        return !(e.type === 'holiday' && !e.isPeriod && eDate >= startDate && eDate <= endDate);
                    });

                    data.entries.push(...tempEntries);
                    recalculateVacationUsed();
                    
                    showCustomMessage('✅ Erfolg', `${tempEntries.length} Tage vom Typ "${periodType}" erfolgreich gebucht!`, 'success');
                    save();
                    document.getElementById('settingsModal').classList.remove('active');
                },
                null
            );
        } else {
            // Automatisch generierte Feiertage im Zeitraum löschen, um doppelte Zählung zu vermeiden
            data.entries = data.entries.filter(e => {
                const eDate = new Date(e.date);
                return !(e.type === 'holiday' && !e.isPeriod && eDate >= startDate && eDate <= endDate);
            });

            data.entries.push(...tempEntries);
            recalculateVacationUsed();
            
            showCustomMessage('✅ Erfolg', `${tempEntries.length} Tage vom Typ "${periodType}" erfolgreich gebucht!`, 'success');
            save();
            document.getElementById('settingsModal').classList.remove('active');
        }
    }
    
    function getGermanHolidays(year) {
        const holidays = [];
        const pad = n => (n < 10 ? '0' : '') + n;
        const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const bundesland = (data.settings && data.settings.bundesland) || '';

        const getEasterSunday = (Y) => {
            const a = Y % 19; const b = Y % 4; const c = Y % 7;
            const k = Math.floor(Y / 100); const p = Math.floor((13 * k + 8) / 25);
            const q = Math.floor(k / 4);
            const M = (15 - p + k - q) % 30;
            const N = (4 + k - q) % 7;
            const d = (19 * a + M) % 30;
            const e = (2 * b + 4 * c + 6 * d + N) % 7;
            let days = (22 + d + e);
            let month = 3;
            if (days > 31) { month = 4; days -= 31; }
            if (days === 26 && month === 4) days = 19;
            if (days === 25 && month === 4 && d === 28 && e === 6 && a > 10) days = 18;
            return new Date(Y, month - 1, days);
        };

        const easter = getEasterSunday(year);
        const addDays = (d, days) => { const r = new Date(d); r.setDate(r.getDate() + days); return r; };
        const add = (date, name) => holidays.push({ date: toKey(date), name, type: 'holiday' });

        // Bundesweite Feiertage (gelten in allen Bundesländern)
        add(new Date(year, 0, 1), "Neujahr");
        add(addDays(easter, -2), "Karfreitag");
        add(addDays(easter, 1), "Ostermontag");
        add(new Date(year, 4, 1), "Tag der Arbeit");
        add(addDays(easter, 39), "Christi Himmelfahrt");
        add(addDays(easter, 50), "Pfingstmontag");
        add(new Date(year, 9, 3), "Tag der Deutschen Einheit");
        add(new Date(year, 11, 25), "1. Weihnachtstag");
        add(new Date(year, 11, 26), "2. Weihnachtstag");

        // Regionale Feiertage nur wenn Bundesland gesetzt
        if (bundesland) {
            const dreiKoenige = ['BW','BY','ST'];
            const fronleichnam = ['BW','BY','HE','NW','RP','SL','SN','TH'];
            const mariaeHimmelfahrt = ['BY','SL'];
            const reformationstag = ['BB','HB','HH','MV','NI','SN','ST','SH','TH'];
            const allerheiligen = ['BW','BY','NW','RP','SL'];
            const bussUndBettag = ['SN'];
            const weltKindertag = ['TH'];
            const frauentag = ['BE','MV'];

            if (dreiKoenige.includes(bundesland)) add(new Date(year, 0, 6), "Heilige Drei Könige");
            if (frauentag.includes(bundesland)) add(new Date(year, 2, 8), "Internationaler Frauentag");
            if (fronleichnam.includes(bundesland)) add(addDays(easter, 60), "Fronleichnam");
            if (mariaeHimmelfahrt.includes(bundesland)) add(new Date(year, 7, 15), "Mariä Himmelfahrt");
            if (weltKindertag.includes(bundesland)) add(new Date(year, 8, 20), "Weltkindertag");
            if (reformationstag.includes(bundesland)) add(new Date(year, 9, 31), "Reformationstag");
            if (allerheiligen.includes(bundesland)) add(new Date(year, 10, 1), "Allerheiligen");
            if (bussUndBettag.includes(bundesland)) {
                // Buß- und Bettag: Mittwoch vor dem 23. November
                let nov23 = new Date(year, 10, 23);
                let dayOfWeek = nov23.getDay();
                let diff = (dayOfWeek >= 3) ? (dayOfWeek - 3) : (dayOfWeek + 4);
                add(new Date(year, 10, 23 - diff), "Buß- und Bettag");
            }
        }

        return holidays.filter((h, i, a) => a.findIndex(h2 => h2.date === h.date) === i);
    }
    function showHolidayNoBundesland() {
        const overlay = document.createElement('div');
        overlay.className = 'holiday-modal-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="holiday-modal">
                <div class="holiday-modal-icon">📍</div>
                <h3 class="holiday-modal-title">Bundesland nicht gesetzt</h3>
                <p class="holiday-modal-desc">Bitte wähle zuerst dein Bundesland in den Einstellungen aus, damit nur die für dich relevanten Feiertage angezeigt werden.</p>
                <div class="holiday-modal-actions">
                    <button class="holiday-btn holiday-btn-primary" onclick="this.closest('.holiday-modal-overlay').remove(); openSettings();">⚙️ Einstellungen öffnen</button>
                    <button class="holiday-btn holiday-btn-ghost" onclick="this.closest('.holiday-modal-overlay').remove();">Abbrechen</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
    }

    function showHolidayNoPending() {
        const overlay = document.createElement('div');
        overlay.className = 'holiday-modal-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="holiday-modal">
                <div class="holiday-modal-icon">✅</div>
                <h3 class="holiday-modal-title">Alles aktuell!</h3>
                <p class="holiday-modal-desc">Keine neuen Feiertage zum Eintragen. Alle relevanten Feiertage sind bereits erfasst.</p>
                <div class="holiday-modal-actions">
                    <button class="holiday-btn holiday-btn-ghost" onclick="this.closest('.holiday-modal-overlay').remove();">Schließen</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));
    }

    function showHolidayConfirmModal(pendingHolidays) {
        const overlay = document.createElement('div');
        overlay.className = 'holiday-modal-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

        const bundeslandNames = {BW:'Baden-Württemberg',BY:'Bayern',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hessen',MV:'Mecklenburg-Vorpommern',NI:'Niedersachsen',NW:'Nordrhein-Westfalen',RP:'Rheinland-Pfalz',SL:'Saarland',SN:'Sachsen',ST:'Sachsen-Anhalt',SH:'Schleswig-Holstein',TH:'Thüringen'};
        const bl = bundeslandNames[data.settings.bundesland] || data.settings.bundesland;

        const listHtml = pendingHolidays.map((h, i) => {
            const d = new Date(h.date);
            const dayName = d.toLocaleDateString('de-DE', { weekday: 'short' });
            const dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            return `<label class="holiday-check-item">
                <input type="checkbox" checked data-holiday-idx="${i}">
                <span class="holiday-check-mark"></span>
                <span class="holiday-check-info">
                    <span class="holiday-check-name">${h.name}</span>
                    <span class="holiday-check-date">${dayName}, ${dateStr}</span>
                </span>
            </label>`;
        }).join('');

        overlay.innerHTML = `
            <div class="holiday-modal holiday-modal-lg">
                <div class="holiday-modal-icon">🗓️</div>
                <h3 class="holiday-modal-title">Feiertage eintragen</h3>
                <p class="holiday-modal-desc">${pendingHolidays.length} Feiertag${pendingHolidays.length > 1 ? 'e' : ''} für <strong>${bl}</strong> gefunden. Wähle aus, welche als Arbeitstag gebucht werden sollen:</p>
                <div class="holiday-check-list" id="holidayCheckList">
                    ${listHtml}
                </div>
                <div class="holiday-modal-actions">
                    <button class="holiday-btn holiday-btn-primary" id="holidayConfirmBtn">✓ Ausgewählte eintragen</button>
                    <button class="holiday-btn holiday-btn-ghost" onclick="this.closest('.holiday-modal-overlay').remove();">Abbrechen</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        document.getElementById('holidayConfirmBtn').onclick = () => {
            const checkboxes = overlay.querySelectorAll('input[data-holiday-idx]');
            let booked = 0;
            checkboxes.forEach(cb => {
                if (!cb.checked) return;
                const idx = parseInt(cb.dataset.holidayIdx);
                const h = pendingHolidays[idx];
                const dateObj = new Date(h.date);
                const dayIndex = dateObj.getDay();
                const expected = data.settings.hours[dayIndex] || 0;
                data.entries.push({
                    id: Date.now() + Math.random(),
                    date: h.date,
                    type: 'holiday',
                    worked: expected,
                    expected: expected,
                    diff: 0,
                    info: h.name,
                    isPeriod: false,
                    breakMins: 0, shiftEnd: '', shiftWarning: false
                });
                booked++;
            });
            if (booked > 0) {
                data.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
                save();
                updateUI();
            }
            overlay.remove();
        };
    }
    
    // --- DASHBOARD HELPER FUNCTIONS (Premium Enhancements) ---
    
    // Smooth value animation for dashboard numbers
    function animateDashboardValue(el, newText) {
        if (!el) return;
        if (el.innerText === newText) return;
        el.style.opacity = '0.5';
        el.style.transform = 'translateY(-2px)';
        setTimeout(() => {
            el.innerText = newText;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 150);
    }
    // --- WEATHER INTEGRATION (Open-Meteo API - Free, No API Key) ---
    let weatherData = null;
    let weatherLastFetch = 0;
    let weatherAutoRefreshInterval = null;
    const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 Minuten Cache
    const WEATHER_REFRESH_INTERVAL = 30 * 60 * 1000; // Aktualisiere Wetter alle 30 Min

    // Weather Code Mapping (WMO Standard)
    const weatherCodeMap = {
        0: { icon: '☀️', desc: 'Klar' },
        1: { icon: '🌤️', desc: 'Überwiegend klar' },
        2: { icon: '⛅', desc: 'Teilweise bewölkt' },
        3: { icon: '☁️', desc: 'Bewölkt' },
        45: { icon: '🌫️', desc: 'Nebel' },
        48: { icon: '🌫️', desc: 'Reifnebel' },
        51: { icon: '🌧️', desc: 'Leichter Nieselregen' },
        53: { icon: '🌧️', desc: 'Nieselregen' },
        55: { icon: '🌧️', desc: 'Starker Nieselregen' },
        56: { icon: '🌨️', desc: 'Gefrierender Nieselregen' },
        57: { icon: '🌨️', desc: 'Starker gefrierender Nieselregen' },
        61: { icon: '🌧️', desc: 'Leichter Regen' },
        63: { icon: '🌧️', desc: 'Regen' },
        65: { icon: '🌧️', desc: 'Starker Regen' },
        66: { icon: '🌨️', desc: 'Gefrierender Regen' },
        67: { icon: '🌨️', desc: 'Starker gefrierender Regen' },
        71: { icon: '❄️', desc: 'Leichter Schneefall' },
        73: { icon: '❄️', desc: 'Schneefall' },
        75: { icon: '❄️', desc: 'Starker Schneefall' },
        77: { icon: '🌨️', desc: 'Schneekörner' },
        80: { icon: '🌦️', desc: 'Leichte Regenschauer' },
        81: { icon: '🌦️', desc: 'Regenschauer' },
        82: { icon: '⛈️', desc: 'Starke Regenschauer' },
        85: { icon: '🌨️', desc: 'Leichte Schneeschauer' },
        86: { icon: '🌨️', desc: 'Schneeschauer' },
        95: { icon: '⛈️', desc: 'Gewitter' },
        96: { icon: '⛈️', desc: 'Gewitter mit leichtem Hagel' },
        99: { icon: '⛈️', desc: 'Gewitter mit Hagel' }
    };

    function getWeatherIcon(code, isNight = false) {
        const weather = weatherCodeMap[code] || { icon: '🌡️', desc: 'Unbekannt' };
        // Nacht-Varianten für klare Tage
        if (isNight && (code === 0 || code === 1)) {
            return { icon: '🌙', desc: weather.desc };
        }
        return weather;
    }

    async function fetchWeather(lat, lon) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin&forecast_days=6`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Weather API Fehler');
            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Weather fetch error:', err);
            return null;
        }
    }

    async function getLocationAndWeather() {
        // Check cache first
        const cached = localStorage.getItem('myworklog_weather');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < WEATHER_CACHE_DURATION) {
                weatherData = parsed.data;
                weatherLastFetch = parsed.timestamp;
                updateWeatherUI();
                updateGreetingWeather();
                return;
            }
        }

        // Check if we have saved coordinates
        const savedLat = localStorage.getItem('myworklog_weather_lat');
        const savedLon = localStorage.getItem('myworklog_weather_lon');
        const savedCity = localStorage.getItem('myworklog_weather_city');

        if (savedLat && savedLon) {
            const data = await fetchWeather(savedLat, savedLon);
            if (data) {
                weatherData = { ...data, cityName: savedCity || 'Standort' };
                localStorage.setItem('myworklog_weather', JSON.stringify({
                    data: weatherData,
                    timestamp: Date.now()
                }));
                weatherLastFetch = Date.now();
                updateWeatherUI();
                updateGreetingWeather();
            }
        } else {
            // Show location setup prompt in modal
            updateWeatherUINoLocation();
        }
    }

    function startWeatherAutoRefresh() {
        // Stoppe existierendes Interval wenn vorhanden
        if (weatherAutoRefreshInterval) {
            clearInterval(weatherAutoRefreshInterval);
        }
        
        // Starte neues Interval: Wetter alle 30 Minuten aktualisieren
        weatherAutoRefreshInterval = setInterval(async () => {
            const savedLat = localStorage.getItem('myworklog_weather_lat');
            const savedLon = localStorage.getItem('myworklog_weather_lon');
            const savedCity = localStorage.getItem('myworklog_weather_city');

            if (savedLat && savedLon) {
                console.log('🔄 Auto-Aktualisiere Wetter für:', savedCity);
                // Force refresh (ignoriere Cache)
                const data = await fetchWeather(savedLat, savedLon);
                if (data) {
                    weatherData = { ...data, cityName: savedCity };
                    localStorage.setItem('myworklog_weather', JSON.stringify({
                        data: weatherData,
                        timestamp: Date.now()
                    }));
                    weatherLastFetch = Date.now();
                    updateWeatherUI();
                    updateGreetingWeather();
                    console.log('✅ Wetter aktualisiert');
                }
            }
        }, WEATHER_REFRESH_INTERVAL);
        
        console.log('⏰ Wetter Auto-Refresh gestartet (alle 30 Min)');
    }

    function requestLocationPermission() {
        if (!navigator.geolocation) {
            showCustomMessage('❌ Fehler', 'Geolocation wird nicht unterstützt.', 'error');
            return;
        }

        showCustomMessage('📍 Standort wird ermittelt...', 'Bitte warten...', 'info');

        // Erst schnell mit niedrigerer Genauigkeit versuchen, dann ggf. mit GPS
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                localStorage.setItem('myworklog_weather_lat', latitude);
                localStorage.setItem('myworklog_weather_lon', longitude);
                
                // Try to get city name via reverse geocoding
                try {
                    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                    const geoRes = await fetch(geoUrl);
                    const geoData = await geoRes.json();
                    const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Dein Standort';
                    localStorage.setItem('myworklog_weather_city', cityName);
                } catch (e) {
                    localStorage.setItem('myworklog_weather_city', 'Dein Standort');
                }

                // Fetch weather
                const data = await fetchWeather(latitude, longitude);
                if (data) {
                    const cityName = localStorage.getItem('myworklog_weather_city') || 'Dein Standort';
                    weatherData = { ...data, cityName };
                    localStorage.setItem('myworklog_weather', JSON.stringify({
                        data: weatherData,
                        timestamp: Date.now()
                    }));
                    weatherLastFetch = Date.now();
                    updateWeatherUI();
                    updateGreetingWeather();
                    startWeatherAutoRefresh(); // Auto-Refresh für GPS-Standort
                    showCustomMessage('✅ Wetter aktiviert', `Standort: ${cityName}`, 'success');
                }
            },
            (error) => {
                console.warn('Geolocation Versuch 1 (schnell) fehlgeschlagen:', error.code, error.message);
                // Fallback: Zweiter Versuch mit enableHighAccuracy: false und längerem Timeout
                if (error.code === 3 /* TIMEOUT */ || error.code === 2 /* POSITION_UNAVAILABLE */) {
                    console.log('🔄 Zweiter Versuch mit niedrigerer Genauigkeit...');
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const { latitude, longitude } = position.coords;
                            localStorage.setItem('myworklog_weather_lat', latitude);
                            localStorage.setItem('myworklog_weather_lon', longitude);
                            try {
                                const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                                const geoRes = await fetch(geoUrl);
                                const geoData = await geoRes.json();
                                const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Dein Standort';
                                localStorage.setItem('myworklog_weather_city', cityName);
                            } catch (e) {
                                localStorage.setItem('myworklog_weather_city', 'Dein Standort');
                            }
                            const data = await fetchWeather(latitude, longitude);
                            if (data) {
                                const cityName = localStorage.getItem('myworklog_weather_city') || 'Dein Standort';
                                weatherData = { ...data, cityName };
                                localStorage.setItem('myworklog_weather', JSON.stringify({ data: weatherData, timestamp: Date.now() }));
                                weatherLastFetch = Date.now();
                                updateWeatherUI();
                                updateGreetingWeather();
                                startWeatherAutoRefresh(); // Auto-Refresh für GPS-Fallback
                                showCustomMessage('✅ Wetter aktiviert', `Standort: ${cityName}`, 'success');
                            }
                        },
                        (error2) => {
                            console.error('Geolocation Versuch 2 ebenfalls fehlgeschlagen:', error2);
                            weatherShowCityInput('Automatische Standort-Erkennung fehlgeschlagen. Gib deine Stadt manuell ein:');
                        },
                        { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 }
                    );
                } else {
                    // Fehlercode 1 = PERMISSION_DENIED
                    showCustomMessage('❌ Standort-Zugriff verweigert', 
                        'Bitte erlaube den Standortzugriff in deinem Browser:\n\n' +
                        '• Klicke auf das 🔒 Symbol in der Adressleiste\n' +
                        '• Setze "Standort" auf "Erlauben"\n' +
                        '• Seite neu laden', 'error');
                }
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        );
    }

    function updateWeatherUI() {
        if (!weatherData || !weatherData.current) return;

        const hour = new Date().getHours();
        const isNight = hour < 6 || hour >= 21;
        const currentWeather = getWeatherIcon(weatherData.current.weather_code, isNight);
        
        // Update modal header
        document.getElementById('weatherHeaderIcon').textContent = currentWeather.icon;
        document.getElementById('weatherLocation').textContent = weatherData.cityName || 'Dein Standort';
        document.getElementById('weatherDate').textContent = new Date().toLocaleDateString('de-DE', { 
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        });

        // Build weather content
        const temp = Math.round(weatherData.current.temperature_2m);
        const feelsLike = Math.round(weatherData.current.apparent_temperature);
        const humidity = weatherData.current.relative_humidity_2m;
        const windSpeed = Math.round(weatherData.current.wind_speed_10m);

        // Build forecast HTML
        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        let forecastHtml = '';
        for (let i = 1; i <= 5 && i < weatherData.daily.time.length; i++) {
            const date = new Date(weatherData.daily.time[i]);
            const dayName = dayNames[date.getDay()];
            const dayWeather = getWeatherIcon(weatherData.daily.weather_code[i]);
            const maxTemp = Math.round(weatherData.daily.temperature_2m_max[i]);
            const minTemp = Math.round(weatherData.daily.temperature_2m_min[i]);
            
            forecastHtml += `
                <div class="weather-forecast-day">
                    <div class="weather-forecast-day-name">${dayName}</div>
                    <div class="weather-forecast-day-icon">${dayWeather.icon}</div>
                    <div class="weather-forecast-day-temp">${maxTemp}°</div>
                    <div class="weather-forecast-day-low">${minTemp}°</div>
                </div>
            `;
        }

        document.getElementById('weatherContent').innerHTML = `
            <div class="weather-current">
                <div class="weather-current-icon">${currentWeather.icon}</div>
                <div class="weather-current-temp">${temp}°C</div>
                <div class="weather-current-desc">${currentWeather.desc}</div>
            </div>
            <div class="weather-details">
                <div class="weather-detail-item">
                    <div class="weather-detail-icon">🌡️</div>
                    <div class="weather-detail-value">${feelsLike}°C</div>
                    <div class="weather-detail-label">Gefühlt</div>
                </div>
                <div class="weather-detail-item">
                    <div class="weather-detail-icon">💧</div>
                    <div class="weather-detail-value">${humidity}%</div>
                    <div class="weather-detail-label">Luftfeuchtigkeit</div>
                </div>
                <div class="weather-detail-item">
                    <div class="weather-detail-icon">💨</div>
                    <div class="weather-detail-value">${windSpeed} km/h</div>
                    <div class="weather-detail-label">Wind</div>
                </div>
            </div>
            <div class="weather-forecast">
                <div class="weather-forecast-title">5-Tage Vorhersage</div>
                <div class="weather-forecast-grid">
                    ${forecastHtml}
                </div>
            </div>
            <div style="margin-top:20px; text-align:center;">
                <button onclick="weatherShowCityInput('Wähle eine andere Stadt:')" style="padding:10px 16px; background:linear-gradient(135deg,#8b5cf6,#7c3aed); border:none; color:#fff; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.85rem; white-space:nowrap;">
                    📍 Stadt ändern
                </button>
            </div>
        `;
    }

    function updateWeatherUINoLocation() {
        document.getElementById('weatherContent').innerHTML = `
            <div class="weather-location-setup">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📍</div>
                <h3 style="color: var(--text-main); margin: 0 0 0.5rem 0;">Standort benötigt</h3>
                <p style="color: var(--text-muted); margin: 0 0 1rem 0; font-size: 0.9rem;">
                    Um das aktuelle Wetter anzuzeigen, benötigen wir deinen Standort.
                    Deine Daten werden nur lokal gespeichert.
                </p>
                <button class="weather-location-btn" onclick="requestLocationPermission()">
                    📍 Standort freigeben
                </button>
                <div style="margin-top: 0.75rem; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:0.78rem;">
                    <span>──────</span><span>oder</span><span>──────</span>
                </div>
                <div style="margin-top: 0.75rem; display:flex; gap:8px;">
                    <input id="weatherCityInput" type="text" placeholder="z.B. Berlin, München, Wien..." 
                        style="flex:1; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:var(--text-main); font-size:0.85rem; outline:none;" 
                        onkeydown="if(event.key==='Enter') weatherSearchCity()" />
                    <button onclick="weatherSearchCity()" style="padding:10px 16px; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; color:#fff; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.85rem; white-space:nowrap;">🔍 Suchen</button>
                </div>
            </div>
        `;
    }

    // === MANUELLER STADT-FALLBACK ===
    function weatherShowCityInput(message) {
        document.getElementById('weatherContent').innerHTML = `
            <div class="weather-location-setup">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🏙️</div>
                <h3 style="color: var(--text-main); margin: 0 0 0.5rem 0;">Stadt eingeben</h3>
                <p style="color: var(--text-muted); margin: 0 0 1rem 0; font-size: 0.85rem;">${message || 'Gib deine Stadt ein um das Wetter zu sehen:'}</p>
                <div style="display:flex; gap:8px;">
                    <input id="weatherCityInput" type="text" placeholder="z.B. Berlin, München, Wien..." 
                        style="flex:1; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:var(--text-main); font-size:0.85rem; outline:none;" 
                        onkeydown="if(event.key==='Enter') weatherSearchCity()" autofocus />
                    <button onclick="weatherSearchCity()" style="padding:10px 16px; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; color:#fff; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.85rem; white-space:nowrap;">🔍 Suchen</button>
                </div>
                <button onclick="requestLocationPermission()" style="margin-top:0.75rem; width:100%; padding:8px; background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); border-radius:10px; cursor:pointer; font-size:0.8rem;">📍 Nochmal automatisch versuchen</button>
            </div>
        `;
        setTimeout(() => document.getElementById('weatherCityInput')?.focus(), 100);
    }

    async function weatherSearchCity() {
        const input = document.getElementById('weatherCityInput');
        if (!input) return;
        const city = input.value.trim();
        if (!city) {
            showCustomMessage('⚠️ Bitte Stadt eingeben', 'Gib eine Stadt ein, z.B. "Berlin" oder "München"', 'warning');
            return;
        }

        input.disabled = true;
        input.style.opacity = '0.5';

        try {
            // Nominatim Geocoding: Stadt → Koordinaten
            const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=de`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (!geoData || geoData.length === 0) {
                showCustomMessage('❌ Stadt nicht gefunden', `"${city}" konnte nicht gefunden werden. Prüfe die Schreibweise.`, 'error');
                input.disabled = false;
                input.style.opacity = '1';
                return;
            }

            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            const cityName = geoData[0].display_name.split(',')[0];

            localStorage.setItem('myworklog_weather_lat', lat);
            localStorage.setItem('myworklog_weather_lon', lon);
            localStorage.setItem('myworklog_weather_city', cityName);

            const data = await fetchWeather(lat, lon);
            if (data) {
                weatherData = { ...data, cityName };
                localStorage.setItem('myworklog_weather', JSON.stringify({ data: weatherData, timestamp: Date.now() }));
                weatherLastFetch = Date.now();
                updateWeatherUI();
                updateGreetingWeather();
                startWeatherAutoRefresh(); // Starte Auto-Refresh für neue Stadt
                showCustomMessage('✅ Wetter aktiviert', `Standort: ${cityName}`, 'success');
            }
        } catch (e) {
            console.error('Stadt-Suche fehlgeschlagen:', e);
            showCustomMessage('❌ Fehler', 'Stadt-Suche fehlgeschlagen. Prüfe deine Internetverbindung.', 'error');
            input.disabled = false;
            input.style.opacity = '1';
        }
    }

    function updateGreetingWeather() {
        const greetEl = document.getElementById('userGreeting');
        if (!greetEl) return;

        const greetHour = new Date().getHours();
        let greetText;
        if (greetHour < 6) { greetText = 'Gute Nacht'; }
        else if (greetHour < 10) { greetText = 'Guten Morgen'; }
        else if (greetHour < 13) { greetText = 'Guten Vormittag'; }
        else if (greetHour < 17) { greetText = 'Guten Nachmittag'; }
        else if (greetHour < 21) { greetText = 'Guten Abend'; }
        else { greetText = 'Gute Nacht'; }

        let weatherIcon = '🌡️';
        let weatherTemp = '';
        
        if (weatherData && weatherData.current) {
            const isNight = greetHour < 6 || greetHour >= 21;
            const weather = getWeatherIcon(weatherData.current.weather_code, isNight);
            weatherIcon = weather.icon;
            weatherTemp = Math.round(weatherData.current.temperature_2m) + '°';
        } else {
            // Fallback to time-based emoji if no weather data
            if (greetHour < 6) { weatherIcon = '🌙'; }
            else if (greetHour < 10) { weatherIcon = '☀️'; }
            else if (greetHour < 13) { weatherIcon = '🌤️'; }
            else if (greetHour < 17) { weatherIcon = '⛅'; }
            else if (greetHour < 21) { weatherIcon = '🌅'; }
            else { weatherIcon = '🌙'; }
        }

        greetEl.innerHTML = `
            <span class="greeting-enhanced">
                <span class="weather-trigger" onclick="openWeatherModal()" title="Wetter anzeigen">
                    <span class="weather-icon">${weatherIcon}</span>
                    ${weatherTemp ? `<span class="weather-temp">${weatherTemp}</span>` : ''}
                </span>
                ${greetText}, ${esc(data.settings.name)}
            </span>
        `;
    }

    function openWeatherModal() {
        document.getElementById('weatherModal').classList.add('active');
        if (!weatherData) {
            updateWeatherUINoLocation();
        } else {
            updateWeatherUI();
        }
    }

    function closeWeatherModal() {
        document.getElementById('weatherModal').classList.remove('active');
    }

    // Initialize weather on load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            getLocationAndWeather();
            startWeatherAutoRefresh(); // Starte Auto-Refresh alle 30 Min
        }, 1000); // Delayed to prioritize UI loading
    });

    // --- UI UPDATES (Dashboard) ---
    function updateUI() {
        // Weather-based greeting (calls updateGreetingWeather)
        updateGreetingWeather();
        
        const trashBadge = document.getElementById('trashCountBadge');
        if (trashBadge) trashBadge.textContent = (Array.isArray(data.trash) ? data.trash.length : 0);
        
        const now = new Date();
        const currentYear = now.getFullYear(); // Für Jahr-spezifische Statistiken
        let week=0, month=0, total=0, totalWorked=0, countDays=0;
        let sickSum=0, vacSum=0, workSum=0, schoolSum=0, holidaySum=0; 
        let usedVacationDays = 0; 
        let trendData = [];
        let runningTotal = 0;

        let ascEntries = [...data.entries].sort((a,b) => new Date(a.date) - new Date(b.date));
        
        ascEntries.forEach(e => {
            const entryYear = new Date(e.date).getFullYear();
            runningTotal += e.diff;
            trendData.push({ date: e.date, diff: e.diff, total: runningTotal, type: e.type, worked: e.worked });
            // Nur Arbeits-Summen den aktuellen Trend trennen (für alle Jahre)
            if(e.type==='sick') sickSum += e.worked;
            else if(e.type==='vacation' && entryYear === currentYear) { vacSum += e.worked; usedVacationDays++; }
            else if(e.type==='gleittag') { /* Gleittag: kein Urlaubstag, Überstunden werden in diff abgezogen */ }
            else if(e.type==='school') schoolSum += (e.expected || e.worked); // Schultag = voller Arbeitstag
            else if(e.type==='holiday' && entryYear === currentYear) holidaySum += e.worked;
            else workSum += e.worked;
        });
        
        data.settings.vacation.used = usedVacationDays + parseFloat(data.settings.vacation.usedManual || 0);

        data.entries.forEach(e => {
            const d = new Date(e.date);
            total += e.diff;
            if(e.type === 'work' || e.type === 'school' || e.type === 'vacation' || e.type === 'sick' || e.type === 'holiday' || e.type === 'gleittag') { 
                // Schultag = voller Arbeitstag → expected statt worked für Durchschnitt
                // Gleittag = zählt als Tag, worked=0
                totalWorked += (e.type === 'school' ? (e.expected || e.worked) : e.worked); 
                countDays++; 
            }

            if(d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
                month += e.diff;
                if(getWeek(d) === getWeek(now)) week += e.diff;
            }
        });

        setRadial('ringWeek', 'valWeek', week);
        setRadial('ringMonth', 'valMonth', month);
        
        const totEl = document.getElementById('valTotal');
        const totalStr = (total>=0?'+':'') + total.toFixed(2) + 'h';
        animateDashboardValue(totEl, totalStr);
        totEl.style.color = total>=0 ? 'var(--primary)' : 'var(--danger)';
        totEl.className = 'counter-animate ' + (total >= 0 ? 'kpi-value-positive' : 'kpi-value-negative');
        
        const avg = countDays > 0 ? totalWorked/countDays : 0;
        document.getElementById('valAvg').innerText = avg.toFixed(1) + 'h';

        // Gleitzeit-Prognose: Trend-basiert mit Mindestdatenmenge
        // Nutzt alle verfügbaren Daten (mehr Daten = präzisere Prognose)
        const allWorkEntries = data.entries.filter(e => 
            e.type === 'work' || e.type === 'school' || e.type === 'vacation' || 
            e.type === 'sick' || e.type === 'holiday' || e.type === 'gleittag'
        );
        const totalWorkDays = allWorkEntries.length;
        const projEl = document.getElementById('valProjected');

        // Mindestens 20 Arbeitstage (~1 Monat) für eine sinnvolle Prognose
        if (totalWorkDays < 20) {
            projEl.innerText = '—';
            projEl.className = 'projection-badge';
            projEl.title = `Zu wenig Daten (${totalWorkDays} Tage). Mind. 20 Arbeitstage nötig für eine Prognose.`;
        } else {
            // Gewichteter Durchschnitt: letzte 60 Tage zählen doppelt (aktueller Trend wichtiger)
            const cutoff60 = new Date(now); cutoff60.setDate(cutoff60.getDate() - 60);
            let weightedDiffSum = 0, weightSum = 0;
            allWorkEntries.forEach(e => {
                const d = new Date(e.date);
                const weight = d >= cutoff60 ? 2 : 1;
                weightedDiffSum += e.diff * weight;
                weightSum += weight;
            });
            const avgDiffPerWorkDay = weightSum > 0 ? weightedDiffSum / weightSum : 0;

            // Prognose-Zeitraum: nächste 30 Arbeitstage (~6 Wochen)
            let forecastDays = 0;
            const forecastEnd = new Date(now);
            {
                const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() + 1);
                while (forecastDays < 30) {
                    if ((data.settings.hours[d.getDay()] || 0) > 0) { forecastDays++; forecastEnd.setTime(d.getTime()); }
                    d.setDate(d.getDate() + 1);
                }
            }
            const projected = total + (avgDiffPerWorkDay * 30);
            projEl.innerText = (projected>=0?'+':'') + projected.toFixed(1) + 'h';
            projEl.className = 'projection-badge ' + (projected >= 0 ? 'positive' : 'negative');

            // Konfidenz-Label basierend auf Datenmenge
            const confidence = totalWorkDays >= 60 ? '●●●' : totalWorkDays >= 40 ? '●●○' : '●○○';
            const confLabel = totalWorkDays >= 60 ? 'Hoch' : totalWorkDays >= 40 ? 'Mittel' : 'Niedrig';
            const endStr = forecastEnd.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
            projEl.title = `Prognose bis ${endStr} (30 Arbeitstage)\nGenauigkeit: ${confLabel} ${confidence} (${totalWorkDays} Tage Datenbasis)\nØ ${avgDiffPerWorkDay >= 0 ? '+' : ''}${(avgDiffPerWorkDay * 60).toFixed(0)} min/Tag`;
        }

        const totalVacation = parseFloat(data.settings.vacation.total);
        const usedVacation = data.settings.vacation.used;
        document.getElementById('valVacationUsed').innerText = `${usedVacation} / ${totalVacation}`;
        const vacPct = (usedVacation / totalVacation) * 100;
        const vacBar = document.getElementById('vacationProgressBar');
        vacBar.style.width = `${Math.min(vacPct, 100)}%`;
        // Smart color: green → yellow → red based on usage
        if (vacPct > 90) vacBar.style.background = 'var(--danger)';
        else if (vacPct > 70) vacBar.style.background = '#f59e0b';
        else vacBar.style.background = 'var(--success)';

        // Mini Week Progress Dots (Mo-Fr)
        renderWeekDots();

        renderLists();
        renderTrend(trendData, 'trendChart', true, null, ascEntries);
        renderDonut(workSum, vacSum, sickSum, schoolSum, holidaySum);
        
        // Update NEW Features
        if (typeof updateDailySummary === 'function') updateDailySummary();
        if (typeof updateWeeklyGoals === 'function') updateWeeklyGoals();
        if (typeof updateLastActivities === 'function') updateLastActivities();
        if (typeof updateMoodStats === 'function') updateMoodStats();
        if (typeof updateProductivityScore === 'function') updateProductivityScore();
        
        // Update Advanced Dashboard Widgets
        if (typeof renderQuickTemplates === 'function') renderQuickTemplates();
    }
    
    // --- CHARTS & PERFORMANCE ---

    function setRadial(ringId, txtId, val) {
        const el = document.getElementById(ringId);
        const txt = document.getElementById(txtId);

        if (!el) {
            console.warn('setRadial: element not found for', ringId);
            return;
        }

        if (!txt) {
            console.warn('setRadial: text element not found for', txtId);
        }

        let pct = 0.5 + (val / 40);
        if (pct > 1) pct = 1; if (pct < 0) pct = 0;
        const offset = 276 - (pct * 276);

        try {
            el.style.strokeDashoffset = offset;
            el.style.stroke = (val < 0) ? 'var(--danger)' : 'var(--primary)';
        } catch (e) {
            console.warn('setRadial: failed to set style for', ringId, e);
        }

        if (txt) txt.innerText = (val >= 0 ? '+' : '') + val.toFixed(1) + 'h';
    }

    function getRelativeTime(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const todayStr = toLocalISODate(now);
        const yesterdayDate = new Date(now); yesterdayDate.setDate(now.getDate() - 1);
        const yesterdayStr = toLocalISODate(yesterdayDate);
        if (dateStr === todayStr) return 'heute';
        if (dateStr === yesterdayStr) return 'gestern';
        const diffDays = Math.round((now - d) / (1000*60*60*24));
        if (diffDays > 0 && diffDays <= 7) return `vor ${diffDays}d`;
        if (diffDays > 7 && diffDays <= 14) return 'letzte Woche';
        return d.toLocaleDateString('de-DE');
    }

    function renderLists() {
        const typeEmoji = {work:'💼', school:'📚', vacation:'🌴', gleittag:'⚡', sick:'💊', holiday:'🏖️'};
        const createRow = (e) => `
            <div class="entry-row type-${e.type}">
                <div>
                    <div class="entry-date">${typeEmoji[e.type] || '📋'} ${new Date(e.date).toLocaleDateString('de-DE')}</div>
                    <div class="entry-meta">${e.isPeriod ? esc(e.label) : esc(e.info)} (${e.worked.toFixed(2)}h) ${e.shiftWarning ? '<span style="color:var(--danger); font-weight:700;">⚠ SCHICHT MAX!</span>' : ''}</div>
                    <div class="entry-relative-time">${getRelativeTime(e.date)}</div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="tag">${e.type === 'school' ? 'SCHULE' : (e.type === 'holiday' ? 'FEIERTAG' : e.type.toUpperCase())}</span>
                    ${e.project ? `<span class="tag project-tag">${esc(e.project)}</span>` : ''}
                    <div style="font-weight:700; width:60px; text-align:right; color:${e.diff>=0?'var(--success)':'var(--danger)'}">
                        ${e.diff>=0?'+':''}${e.diff.toFixed(2)}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-icon" onclick="editEntry(${e.id})" title="Bearbeiten">✏️</button>
                        <button class="btn-icon danger" onclick="delEntry(${e.id})" title="Löschen">🗑️</button>
                    </div>
                </div>
            </div>
        `;

        const entryListEl = document.getElementById('entryListShort');
        if (!entryListEl) {
            console.warn('renderLists: #entryListShort element not found, skipping render');
            return;
        }

        const entries = Array.isArray(data.entries) ? data.entries : [];
        if (!entries.length) {
            entryListEl.innerHTML = '<div style="color:#555; padding:12px;">Noch keine Einträge</div>';
        } else {
            entryListEl.innerHTML = safeHTML(entries.slice(0, 5).map(createRow).join(''));
        }
    }
    
    // --- GLOBAL TREND STATE ---
    window._trendPeriod = 30;
    window._trendDataFull = [];
    function renderTrend(dataPoints, elementId, areaFill = true, chartStyle = null, allEntries = null) {
        const c = document.getElementById(elementId);
        if(!c) return;
        
        // Support legacy numeric arrays (from chart preview etc.)
        const isRichData = dataPoints.length > 0 && typeof dataPoints[0] === 'object';
        
        if (isRichData) {
            window._trendDataFull = dataPoints;
        }
        
        if(dataPoints.length < 2) { 
            c.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#555;">Noch keine Daten</div>'; 
            return; 
        }
        
        // Lade oder nutze Default-Style
        if (!chartStyle) {
            const saved = localStorage.getItem('tt_chart_style');
            chartStyle = saved ? JSON.parse(saved) : {
                type: 'area-smooth',
                color: 'var(--primary)',
                animation: true,
                gradient: true,
                glow: true,
                blur: false,
                dots: false,
                rainbow: false
            };
        }
        
        // Slice by period for rich data, else last 30
        let subset;
        if (isRichData) {
            const period = (window._trendPeriod !== undefined && window._trendPeriod !== null) ? window._trendPeriod : 30;
            if (period === 0) {
                // "Alle" — use all data points, but thin out if too many for readability
                if (dataPoints.length > 120) {
                    // Aggregate: keep every Nth point + always first & last
                    const step = Math.ceil(dataPoints.length / 120);
                    subset = dataPoints.filter((_, i) => i === 0 || i === dataPoints.length - 1 || i % step === 0);
                } else {
                    subset = dataPoints;
                }
            } else {
                subset = dataPoints.slice(-period);
            }
        } else {
            subset = dataPoints.slice(-30);
        }
        
        const vals = isRichData ? subset.map(d => d.total) : subset;
        const diffs = isRichData ? subset.map(d => d.diff) : [];
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        const range = max - min || 1;
        
        // ============ STATS BAR ============
        if (isRichData && elementId === 'trendChart') {
            const current = vals[vals.length - 1];
            const highest = max;
            const lowest = min;
            const avgDaily = diffs.length > 0 ? diffs.reduce((s,v) => s+v, 0) / diffs.length : 0;
            
            // Trend direction: compare last 7 vs previous 7
            let direction = '↔️';
            if (vals.length >= 14) {
                const recent7 = vals.slice(-7);
                const prev7 = vals.slice(-14, -7);
                const recentAvg = recent7.reduce((s,v)=>s+v,0)/7;
                const prevAvg = prev7.reduce((s,v)=>s+v,0)/7;
                const delta = recentAvg - prevAvg;
                if (delta > 1) direction = '🚀 Steigend';
                else if (delta > 0.2) direction = '📈 Leicht ↑';
                else if (delta < -1) direction = '📉 Fallend';
                else if (delta < -0.2) direction = '📉 Leicht ↓';
                else direction = '↔️ Stabil';
            } else if (vals.length >= 2) {
                direction = vals[vals.length-1] > vals[0] ? '📈 Positiv' : '📉 Negativ';
            }
            
            // Volatility (standard deviation of daily diffs)
            let volatility = '—';
            if (diffs.length > 1) {
                const mean = diffs.reduce((s,v)=>s+v,0)/diffs.length;
                const variance = diffs.reduce((s,v)=>s+(v-mean)**2,0)/diffs.length;
                const stdDev = Math.sqrt(variance);
                if (stdDev < 0.3) volatility = '🟢 Niedrig';
                else if (stdDev < 0.8) volatility = '🟡 Mittel';
                else volatility = '🔴 Hoch';
            }
            
            const statEl = (id, text, colorClass) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = text;
                    el.className = 'trend-stat-value' + (colorClass ? ' ' + colorClass : '');
                }
            };
            statEl('trendStatCurrent', (current >= 0 ? '+' : '') + current.toFixed(1) + 'h', current >= 0 ? 'trend-stat-positive' : 'trend-stat-negative');
            statEl('trendStatHigh', '+' + highest.toFixed(1) + 'h', 'trend-stat-positive');
            statEl('trendStatLow', (lowest >= 0 ? '+' : '') + lowest.toFixed(1) + 'h', lowest < 0 ? 'trend-stat-negative' : '');
            statEl('trendStatAvgDaily', (avgDaily >= 0 ? '+' : '') + avgDaily.toFixed(2) + 'h', avgDaily >= 0 ? 'trend-stat-positive' : 'trend-stat-negative');
            statEl('trendStatDirection', direction, '');
            statEl('trendStatVolatility', volatility, '');
        }
        
        const w = c.clientWidth || 400;
        const h = 220;
        const padTop = 15, padBot = 15, padLeft = 0, padRight = 0;
        const chartH = h - padTop - padBot;
        const chartW = w - padLeft - padRight;
        
        // ============ Y-AXIS LABELS ============
        if (elementId === 'trendChart') {
            const yAxis = document.getElementById('trendYAxis');
            if (yAxis) {
                const steps = 5;
                let yHtml = '';
                for (let i = 0; i <= steps; i++) {
                    const val = max - (i / steps) * range;
                    const color = val >= 0 ? 'var(--success)' : 'var(--danger)';
                    yHtml += `<span style="color:${color}; white-space:nowrap;">${val >= 0 ? '+' : ''}${val.toFixed(1)}</span>`;
                }
                yAxis.innerHTML = yHtml;
                yAxis.style.height = h + 'px';
            }
        }
        
        // ============ X-AXIS LABELS ============
        if (isRichData && elementId === 'trendChart') {
            const xAxis = document.getElementById('trendXAxis');
            if (xAxis) {
                const firstDate = new Date(subset[0].date);
                const lastDate = new Date(subset[subset.length - 1].date);
                const spanDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
                
                // Adaptive format based on time span
                let dateFormat;
                if (spanDays > 365) {
                    dateFormat = { month: 'short', year: '2-digit' }; // "Jan 25"
                } else if (spanDays > 90) {
                    dateFormat = { day: '2-digit', month: 'short' }; // "14. Jan"
                } else {
                    dateFormat = { day: '2-digit', month: '2-digit' }; // "14.01"
                }
                
                const maxLabels = Math.min(subset.length, spanDays > 180 ? 6 : 8);
                const step = Math.max(1, Math.floor(subset.length / maxLabels));
                let xHtml = '';
                let lastLabel = '';
                for (let i = 0; i < subset.length; i += step) {
                    const d = new Date(subset[i].date);
                    const label = d.toLocaleDateString('de-DE', dateFormat);
                    if (label !== lastLabel) {
                        xHtml += `<span>${label}</span>`;
                        lastLabel = label;
                    }
                }
                // Always show last date
                const lastLabel2 = lastDate.toLocaleDateString('de-DE', dateFormat);
                if (lastLabel !== lastLabel2) {
                    xHtml += `<span>${lastLabel2}</span>`;
                }
                xAxis.innerHTML = xHtml;
            }
        }
        
        // ============ BUILD SVG ============
        const getX = (i) => padLeft + (i / (vals.length - 1)) * chartW;
        const getY = (val) => padTop + (1 - (val - min) / range) * chartH;
        
        // Zero line
        let zeroLineY = null;
        let zeroLineHtml = '';
        if (min < 0 && max > 0) {
            zeroLineY = getY(0);
            zeroLineHtml = `<line x1="0" y1="${zeroLineY}" x2="${w}" y2="${zeroLineY}" class="trend-zero-line" />
                <text x="${w - 4}" y="${zeroLineY - 4}" fill="rgba(255,255,255,0.25)" font-size="9" text-anchor="end" font-family="var(--font-mono)">0h</text>`;
        }
        
        // Grid lines (horizontal)
        let gridHtml = '';
        const gridSteps = 5;
        for (let i = 0; i <= gridSteps; i++) {
            const gy = padTop + (i / gridSteps) * chartH;
            gridHtml += `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />`;
        }
        
        // Build path
        let path = '';
        vals.forEach((val, i) => {
            const x = getX(i);
            const y = getY(val);
            path += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
        });
        
        // Smooth path (bezier curves)
        let smoothPath = '';
        const isSmooth = chartStyle.type.includes('smooth');
        if (isSmooth) {
            for (let i = 0; i < vals.length; i++) {
                const x = getX(i);
                const y = getY(vals[i]);
                if (i === 0) {
                    smoothPath += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
                } else {
                    const x0 = getX(i - 1);
                    const y0 = getY(vals[i - 1]);
                    const cp1x = (x0 + x) / 2;
                    const cp1y = y0;
                    const cp2x = (x0 + x) / 2;
                    const cp2y = y;
                    smoothPath += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)} `;
                }
            }
        }
        
        const linePath = smoothPath || path;
        // Resolve actual hex color (read computed --primary if using theme color)
        let colorHex;
        if (chartStyle.color.includes('var')) {
            const computedPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';
            const hex = computedPrimary.startsWith('#') ? computedPrimary : '#a855f7';
            const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
            colorHex = `rgb(${r}, ${g}, ${b})`;
        } else {
            colorHex = chartStyle.color;
        }
        const strokeColor = chartStyle.color.includes('var') ? 'var(--primary)' : chartStyle.color;
        
        // Positive/negative gradient area fill (only for area/area-smooth types)
        let areaHtml = '';
        let defs = '';
        const isAreaType = chartStyle.type.includes('area');
        
        if (isAreaType) {
            // Dual gradient: green above zero, red below
            if (zeroLineY !== null && isRichData) {
                defs = `<defs>
                    <linearGradient id="gradPos" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.25" />
                        <stop offset="100%" style="stop-color:#10b981;stop-opacity:0.02" />
                    </linearGradient>
                    <linearGradient id="gradNeg" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.02" />
                        <stop offset="100%" style="stop-color:#ef4444;stop-opacity:0.25" />
                    </linearGradient>
                    <clipPath id="clipAbove"><rect x="0" y="0" width="${w}" height="${zeroLineY}" /></clipPath>
                    <clipPath id="clipBelow"><rect x="0" y="${zeroLineY}" width="${w}" height="${h - zeroLineY}" /></clipPath>
                    ${chartStyle.glow ? `<filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
                </defs>`;
                const closedPath = linePath + `L ${getX(vals.length - 1).toFixed(1)} ${h} L ${getX(0).toFixed(1)} ${h} Z`;
                areaHtml = `<path d="${closedPath}" fill="url(#gradPos)" clip-path="url(#clipAbove)" />
                    <path d="${closedPath}" fill="url(#gradNeg)" clip-path="url(#clipBelow)" />`;
            } else {
                defs = `<defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${colorHex};stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:${colorHex};stop-opacity:0" />
                    </linearGradient>
                    ${chartStyle.glow ? `<filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
                </defs>`;
                const closedPath = linePath + `L ${getX(vals.length - 1).toFixed(1)} ${h} L ${getX(0).toFixed(1)} ${h} Z`;
                areaHtml = `<path d="${closedPath}" fill="url(#grad)" />`;
            }
        }
        
        // Glow filter defs for non-area types (line, bar)
        if (!defs && chartStyle.glow) {
            defs = `<defs>${`<filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`}</defs>`;
        }
        
        // Dots (interactive hit areas)
        let dotsHtml = '';
        const typeEmojis = { work: '💼', school: '📚', vacation: '🌴', gleittag: '⚡', sick: '💊', holiday: '🏖️' };
        vals.forEach((val, i) => {
            const x = getX(i);
            const y = getY(val);
            const dotColor = val >= 0 ? 'var(--success)' : 'var(--danger)';
            // Visible dot (small, colored by +/-)
            dotsHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${dotColor}" opacity="0.7" class="trend-dot-hover" data-idx="${i}" style="transition: all 0.15s ease;" />`;
            // Invisible larger hit area
            dotsHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="transparent" data-idx="${i}" style="cursor:pointer;" />`;
        });
        
        // Animated line drawing
        const animStyle = chartStyle.animation ? 'animation: drawLine 2s ease-in-out forwards;' : '';
        const glowFilter = chartStyle.glow ? `filter: drop-shadow(0 0 6px ${colorHex}) drop-shadow(0 0 3px ${colorHex});` : '';
        
        // Multi-colored line path (green when positive, red when negative)
        let multiColorLine = '';
        if (isRichData && vals.some(v => v < 0) && vals.some(v => v >= 0)) {
            if (isSmooth) {
                // Smooth multi-color: draw bezier curve segments per section
                for (let i = 1; i < vals.length; i++) {
                    const x0 = getX(i - 1), y0 = getY(vals[i - 1]);
                    const x1 = getX(i), y1 = getY(vals[i]);
                    const cp1x = (x0 + x1) / 2, cp1y = y0;
                    const cp2x = (x0 + x1) / 2, cp2y = y1;
                    const segColor = (vals[i] >= 0 && vals[i - 1] >= 0) ? 'var(--success)' : 
                                     (vals[i] < 0 && vals[i - 1] < 0) ? 'var(--danger)' : 'var(--primary)';
                    const segGlow = chartStyle.glow ? `filter: drop-shadow(0 0 4px ${segColor === 'var(--success)' ? '#10b981' : segColor === 'var(--danger)' ? '#ef4444' : colorHex});` : '';
                    multiColorLine += `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${segColor}" stroke-width="2.5" stroke-linecap="round" style="${segGlow}" />`;
                }
            } else {
                // Straight multi-color: line segments
                for (let i = 1; i < vals.length; i++) {
                    const x1 = getX(i - 1), y1 = getY(vals[i - 1]);
                    const x2 = getX(i), y2 = getY(vals[i]);
                    const segColor = (vals[i] >= 0 && vals[i - 1] >= 0) ? 'var(--success)' : 
                                     (vals[i] < 0 && vals[i - 1] < 0) ? 'var(--danger)' : 'var(--primary)';
                    const segGlow = chartStyle.glow ? `filter: drop-shadow(0 0 4px ${segColor === 'var(--success)' ? '#10b981' : segColor === 'var(--danger)' ? '#ef4444' : colorHex});` : '';
                    multiColorLine += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${segColor}" stroke-width="2.5" stroke-linecap="round" style="${segGlow}" />`;
                }
            }
        }
        
        // ============ BAR CHART MODE ============
        let barHtml = '';
        if (chartStyle.type === 'bar') {
            const barGap = 2;
            const barWidth = Math.max(2, (chartW / vals.length) - barGap);
            const baseY = zeroLineY !== null ? zeroLineY : (padTop + chartH);
            vals.forEach((val, i) => {
                const x = padLeft + (i / vals.length) * chartW + barGap / 2;
                const y = getY(val);
                const barColor = colorHex;
                const barTop = Math.min(y, baseY);
                const barH = Math.max(1, Math.abs(y - baseY));
                const glowStyle = chartStyle.glow ? `filter: drop-shadow(0 0 3px ${barColor});` : '';
                barHtml += `<rect x="${x.toFixed(1)}" y="${barTop.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${barColor}" opacity="0.85" rx="2" style="${glowStyle} transform-origin: ${x.toFixed(1)}px ${baseY.toFixed(1)}px; animation: barGrow 0.4s ease-out both; animation-delay: ${i * 12}ms;" data-idx="${i}" />`;
            });
        }

        // Final line or multi-color
        const lineWidth = chartStyle.type === 'line' ? '3' : '2.5';
        const mainLine = chartStyle.type === 'bar' ? '' : (multiColorLine || `<path d="${linePath}" class="trend-line" stroke="${strokeColor}" stroke-width="${lineWidth}" fill="none" stroke-linecap="round" style="${animStyle} ${glowFilter}" />`);
        
        // Crosshair elements (updated on hover via JS)
        const crosshairHtml = `<line id="trendCrossV" class="trend-crosshair" x1="0" y1="0" x2="0" y2="${h}" style="display:none;" />
            <line id="trendCrossH" class="trend-crosshair" x1="0" y1="0" x2="${w}" y2="0" style="display:none;" />`;
        
        // Current position marker (pulsing dot on last point)
        const lastX = getX(vals.length - 1);
        const lastY = getY(vals[vals.length - 1]);
        const lastColor = vals[vals.length - 1] >= 0 ? '#10b981' : '#ef4444';
        const currentMarker = chartStyle.type === 'bar' ? '' : `
            <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="5" fill="${lastColor}" opacity="0.9" style="animation: trendPulse 2s ease-in-out infinite;" />
            <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="10" fill="${lastColor}" opacity="0.15" style="animation: trendPulse 2s ease-in-out infinite;" />`;
        
        const svgOverflow = chartStyle.type === 'bar' ? 'overflow:hidden;' : '';
        c.innerHTML = `
            <svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:100%; ${svgOverflow}" id="trendSvgMain">
                ${defs}
                ${gridHtml}
                ${zeroLineHtml}
                ${chartStyle.type === 'bar' ? '' : areaHtml}
                ${barHtml}
                ${mainLine}
                ${chartStyle.type === 'bar' ? '' : dotsHtml}
                ${crosshairHtml}
                ${currentMarker}
            </svg>
        `;
        
        // ============ HOVER TOOLTIP INTERACTION ============
        if (isRichData && elementId === 'trendChart') {
            const svg = document.getElementById('trendSvgMain');
            const tooltip = document.getElementById('trendTooltip');
            const crossV = document.getElementById('trendCrossV');
            const crossH = document.getElementById('trendCrossH');
            
            if (svg && tooltip) {
                const showTooltip = (idx) => {
                    if (idx < 0 || idx >= subset.length) return;
                    const dp = subset[idx];
                    const val = vals[idx];
                    const x = getX(idx);
                    const y = getY(val);
                    
                    const d = new Date(dp.date);
                    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                    const dateStr = dayNames[d.getDay()] + ', ' + d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
                    const typeLabel = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', gleittag: 'Gleittag', sick: 'Krank', holiday: 'Feiertag' };
                    const emoji = typeEmojis[dp.type] || '📋';
                    
                    // Streak info
                    let streak = 0;
                    const isPos = dp.diff >= 0;
                    for (let j = idx; j >= 0; j--) {
                        if ((subset[j].diff >= 0) === isPos) streak++;
                        else break;
                    }
                    
                    tooltip.innerHTML = `
                        <div class="tt-date">${dateStr}</div>
                        <div class="tt-row"><span class="tt-label">Saldo</span><span class="tt-val ${val >= 0 ? 'tt-positive' : 'tt-negative'}">${val >= 0 ? '+' : ''}${val.toFixed(2)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Tages-Diff</span><span class="tt-val ${dp.diff >= 0 ? 'tt-positive' : 'tt-negative'}">${dp.diff >= 0 ? '+' : ''}${dp.diff.toFixed(2)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Gearbeitet</span><span class="tt-val">${dp.worked.toFixed(1)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Streak</span><span class="tt-val">${streak}× ${isPos ? '✅' : '⚠️'}</span></div>
                        <div style="margin-top:4px;"><span class="tt-type-badge">${emoji} ${typeLabel[dp.type] || dp.type}</span></div>
                    `;
                    
                    // Position tooltip
                    const chartRect = c.getBoundingClientRect();
                    const tooltipW = 200;
                    let left = (x / w) * chartRect.width;
                    if (left + tooltipW > chartRect.width) left = left - tooltipW - 10;
                    else left += 15;
                    let top = (y / h) * chartRect.height - 80;
                    if (top < 0) top = 10;
                    
                    tooltip.style.display = 'block';
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    
                    // Crosshair
                    if (crossV) { crossV.style.display = 'block'; crossV.setAttribute('x1', x); crossV.setAttribute('x2', x); }
                    if (crossH) { crossH.style.display = 'block'; crossH.setAttribute('y1', y); crossH.setAttribute('y2', y); }
                    
                    // Highlight dot
                    svg.querySelectorAll('.trend-dot-hover').forEach(dot => {
                        if (parseInt(dot.dataset.idx) === idx) {
                            dot.setAttribute('r', '6');
                            dot.setAttribute('opacity', '1');
                        } else {
                            dot.setAttribute('r', '3');
                            dot.setAttribute('opacity', '0.7');
                        }
                    });
                };
                
                const hideTooltip = () => {
                    tooltip.style.display = 'none';
                    if (crossV) crossV.style.display = 'none';
                    if (crossH) crossH.style.display = 'none';
                    svg.querySelectorAll('.trend-dot-hover').forEach(dot => {
                        dot.setAttribute('r', '3');
                        dot.setAttribute('opacity', '0.7');
                    });
                };
                
                svg.addEventListener('mousemove', (e) => {
                    const rect = svg.getBoundingClientRect();
                    const mouseX = (e.clientX - rect.left) / rect.width * w;
                    // find nearest data point
                    let nearest = 0;
                    let nearestDist = Infinity;
                    for (let i = 0; i < vals.length; i++) {
                        const dist = Math.abs(getX(i) - mouseX);
                        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
                    }
                    showTooltip(nearest);
                });
                
                svg.addEventListener('mouseleave', hideTooltip);
                
                // Touch support
                svg.addEventListener('touchstart', (e) => {
                    const touch = e.touches[0];
                    const rect = svg.getBoundingClientRect();
                    const mouseX = (touch.clientX - rect.left) / rect.width * w;
                    let nearest = 0;
                    let nearestDist = Infinity;
                    for (let i = 0; i < vals.length; i++) {
                        const dist = Math.abs(getX(i) - mouseX);
                        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
                    }
                    showTooltip(nearest);
                }, { passive: true });
                svg.addEventListener('touchend', () => setTimeout(hideTooltip, 2000), { passive: true });
            }
        }
    }
    
    function generateSmoothPath(dataPoints, subset, min, range, w, h) {
        let path = '';
        for (let i = 0; i < subset.length; i++) {
            const x = (i / (subset.length - 1)) * w;
            const y = h - ((subset[i] - min) / range * (h - 40)) - 20;
            
            if (i === 0) {
                path += `M ${x} ${y} `;
            } else {
                const x0 = ((i - 1) / (subset.length - 1)) * w;
                const y0 = h - ((subset[i - 1] - min) / range * (h - 40)) - 20;
                const cp1x = (x0 + x) / 2;
                const cp1y = y0;
                const cp2x = (x0 + x) / 2;
                const cp2y = y;
                path += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y} `;
            }
        }
        return path;
    }
    
    function generateBarChart(subset, min, range, w, h, color) {
        const barWidth = Math.max(2, w / subset.length - 1);
        let bars = '';
        subset.forEach((val, i) => {
            const x = (i / subset.length) * w;
            const barHeight = ((val - min) / range * (h - 40));
            const y = h - barHeight - 20;
            bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" opacity="0.8" style="animation: barGrow 0.6s ease-out both; animation-delay: ${i * 20}ms;" rx="2" />`;
        });
        return bars;
    }
    function setupChartModalButtons(currentStyle) {
        const chartTypes = [
            {id: 'line', label: 'Linie', icon: '📈'},
            {id: 'area', label: 'Fläche', icon: '📊'},
            {id: 'area-smooth', label: 'Smooth', icon: '🌊'},
            {id: 'bar', label: 'Balken', icon: '📦'}
        ];
        
        // Get current website accent color hex
        const computedPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';
        
        const colors = [
            {value: 'var(--primary)', hex: computedPrimary, label: 'Website-Farbe (' + computedPrimary + ')', isTheme: true},
            {value: '#a78bfa', hex: '#a78bfa', label: 'Lila-Hell'},
            {value: '#a855f7', hex: '#a855f7', label: 'Lila'},
            {value: '#8b5cf6', hex: '#8b5cf6', label: 'Indigo'},
            {value: '#7c3aed', hex: '#7c3aed', label: 'Violett'},
            {value: '#6366f1', hex: '#6366f1', label: 'Indigo-Hell'},
            {value: '#4f46e5', hex: '#4f46e5', label: 'Deep Indigo'},
            {value: '#0ea5e9', hex: '#0ea5e9', label: 'Sky Blue'},
            {value: '#00b4d8', hex: '#00b4d8', label: 'Steel Blue'},
            {value: '#60a5fa', hex: '#60a5fa', label: 'Blau-Hell'},
            {value: '#3b82f6', hex: '#3b82f6', label: 'Blau'},
            {value: '#06b6d4', hex: '#06b6d4', label: 'Cyan'},
            {value: '#22d3ee', hex: '#22d3ee', label: 'Cyan-Hell'},
            {value: '#00d9ff', hex: '#00d9ff', label: 'Aqua'},
            {value: '#10b981', hex: '#10b981', label: 'Grün'},
            {value: '#34d399', hex: '#34d399', label: 'Grün-Hell'},
            {value: '#06d6a0', hex: '#06d6a0', label: 'Mint'},
            {value: '#84cc16', hex: '#84cc16', label: 'Limette'},
            {value: '#fbbf24', hex: '#fbbf24', label: 'Gelb'},
            {value: '#eab308', hex: '#eab308', label: 'Gelb-Hell'},
            {value: '#f59e0b', hex: '#f59e0b', label: 'Gelb-Orange'},
            {value: '#fb923c', hex: '#fb923c', label: 'Orange'},
            {value: '#f97316', hex: '#f97316', label: 'Orange-Hell'},
            {value: '#ef4444', hex: '#ef4444', label: 'Rot'},
            {value: '#f43f5e', hex: '#f43f5e', label: 'Rose'},
            {value: '#ec4899', hex: '#ec4899', label: 'Pink'},
            {value: '#d946ef', hex: '#d946ef', label: 'Fuchsia'},
            {value: '#db2777', hex: '#db2777', label: 'Crimson'},
            {value: '#be185d', hex: '#be185d', label: 'Magenta-Dunkel'},
            {value: '#94a3b8', hex: '#94a3b8', label: 'Grau'},
            {value: '#cbd5e1', hex: '#cbd5e1', label: 'Grau-Hell'},
            {value: '#64748b', hex: '#64748b', label: 'Grau-Dunkel'},
            {value: '#475569', hex: '#475569', label: 'Slate'},
            {value: '#ffffff', hex: '#ffffff', label: 'Weiß'},
        ];
        
        const chartTypeContainer = document.getElementById('chartTypeButtons');
        if (!chartTypeContainer) return;
        
        chartTypeContainer.innerHTML = chartTypes.map(type => {
            const isActive = currentStyle.type === type.id;
            return `<button class="chart-type-btn" data-type="${type.id}" style="display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px 8px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; background:${isActive ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,255,255,0.03)'}; border-radius:10px; cursor:pointer; color:${isActive ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:${isActive ? '600' : '500'}; transition:all 0.2s; font-size:0.78rem;" onmouseover="if(!this.classList.contains('active-type'))this.style.background='rgba(255,255,255,0.06)'" onmouseout="if(!this.classList.contains('active-type'))this.style.background='rgba(255,255,255,0.03)'">
                <span style="font-size:1.3rem; line-height:1;">${type.icon}</span>
                <span>${type.label}</span>
            </button>`;
        }).join('');
        
        const colorContainer = document.getElementById('colorButtons');
        if (!colorContainer) return;
        
        // Render theme color button first, then grid of all colors
        const themeColor = colors[0];
        const isThemeActive = currentStyle.color === 'var(--primary)';
        const otherColors = colors.slice(1);
        
        colorContainer.innerHTML = `
            <button style="display:flex; align-items:center; gap:8px; padding:8px 14px; background:${isThemeActive ? 'rgba(var(--primary-rgb),0.12)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isThemeActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; border-radius:10px; cursor:pointer; transition:all 0.2s; margin-bottom:10px; width:100%;" title="${themeColor.label}" onclick="updateChartStyleFromModal('color', 'var(--primary)'); setupChartModalButtons(window.modalChartStyle);" onmouseover="this.style.background='${isThemeActive ? 'rgba(var(--primary-rgb),0.15)' : 'rgba(255,255,255,0.06)'}'" onmouseout="this.style.background='${isThemeActive ? 'rgba(var(--primary-rgb),0.12)' : 'rgba(255,255,255,0.03)'}'">
                <span style="width:28px; height:28px; border-radius:8px; background:${themeColor.hex}; border:2px solid ${isThemeActive ? '#fff' : 'transparent'}; flex-shrink:0;"></span>
                <span style="font-size:0.8rem; font-weight:${isThemeActive ? '600' : '500'}; color:${isThemeActive ? 'var(--text-main)' : 'var(--text-muted)'};">🎨 Website-Farbe verwenden</span>
                ${isThemeActive ? '<span style="margin-left:auto; font-size:0.7rem; color:var(--primary); font-weight:600;">✓ Aktiv</span>' : ''}
            </button>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap:6px;">
                ${otherColors.map(color => {
                    const isActive = currentStyle.color === color.value;
                    return `<button style="width:32px; height:32px; background:${color.hex}; border:2px solid ${isActive ? '#fff' : 'transparent'}; border-radius:8px; cursor:pointer; transition:all 0.2s; opacity:${isActive ? '1' : '0.7'}; outline:${isActive ? '2px solid ' + color.hex : 'none'}; outline-offset:2px;" title="${color.label}" onclick="updateChartStyleFromModal('color', '${color.value}'); setupChartModalButtons(window.modalChartStyle);" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)'" onmouseout="this.style.opacity='${isActive ? '1' : '0.7'}'; this.style.transform='scale(1)'"></button>`;
                }).join('')}
            </div>
        `;
        
        // Chart type click handlers
        const modal = document.getElementById('chartStyleModal');
        if (!modal) return;
        modal.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                updateChartStyleFromModal('type', type);
                setupChartModalButtons(window.modalChartStyle);
            });
        });
    }
    
    function saveChartStyle() {
        if (window.modalChartStyle) {
            localStorage.setItem('tt_chart_style', JSON.stringify(window.modalChartStyle));
        }
    }
    
    function updateChartStyleFromModal(prop, value) {
        window.modalChartStyle[prop] = value;
        updateChartStylePreview(window.modalChartStyle);
    }
    
    function updateChartStylePreview(style) {
        const preview = document.getElementById('chartPreview');
        if (!preview) return;
        
        // Generiere Beispieldaten
        const exampleData = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 2.9, 2.8, 2.7, 2.6];
        
        // Store globally for saving
        window.modalChartStyle = style;
        renderTrend(exampleData, 'chartPreview', style.type.includes('area'), style);
    }
    function updateDonutStylePreview(style) {
        const preview = document.getElementById('donutPreview');
        if (!preview) return;
        
        // Render a demo donut with 40% work, 30% school, 20% vac, 10% sick
        renderDonutPreview(40, 30, 20, 10, 0, style);
    }
    
    function renderDonutPreview(work, school, vac, sick, holiday, donutStyle = null) {
        if (!donutStyle) {
            const saved = localStorage.getItem('tt_donut_style');
            donutStyle = saved ? JSON.parse(saved) : {
                strokeWidth: 12,
                glow: true,
                gradient: false,
                rainbow: false,
                animated: true
            };
        }
        
        const total = work + school + vac + sick + holiday || 1;
        const c = 251;
        
        const makeCircle = (val, color) => {
            const dash = (val / total) * c;
            return `<circle cx="50" cy="50" r="40" fill="transparent" stroke="${color}" stroke-width="${donutStyle.strokeWidth}" stroke-dasharray="${dash} ${c}" style="${donutStyle.animated ? 'animation: expandPulse 1.2s ease-out' : ''};${donutStyle.glow ? 'filter: drop-shadow(0 0 6px ' + color + ')' : ''};${donutStyle.rainbow ? 'animation: rainbowShift 3s linear infinite' : ''}"></circle>`;
        };
        
        const previewHtml = `
            <svg width="120" height="120" viewBox="0 0 100 100" style="transform: rotate(-90deg);${donutStyle.rainbow ? 'animation: rainbowShift 3s linear infinite' : ''}">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="${donutStyle.strokeWidth}"></circle>
                ${makeCircle(sick, 'var(--danger)')}
                ${makeCircle(vac, 'var(--success)')}
                ${makeCircle(school, 'var(--school)')}
                ${makeCircle(holiday, 'var(--holiday)')}
                ${makeCircle(work, 'var(--primary)')}
            </svg>
        `;
        
        const previewContainer = document.getElementById('donutPreview');
        if (previewContainer) previewContainer.innerHTML = previewHtml;
    }
    
    function saveDonutStyle() {
        if (window.modalDonutStyle) {
            localStorage.setItem('tt_donut_style', JSON.stringify(window.modalDonutStyle));
            console.log('✅ Donut style saved!', window.modalDonutStyle);
        }
    }
    
    function renderDonut(work, vac, sick, school, holiday) {
        // Load donut style from localStorage
        const saved = localStorage.getItem('tt_donut_style');
        const donutStyle = saved ? JSON.parse(saved) : {
            strokeWidth: 12,
            glow: true,
            gradient: false,
            rainbow: false,
            animated: true
        };
        
        const total = work + vac + sick + school + holiday || 1;
        const c = 251;
        
        // Order for clockwise fill: Work -> School -> Vac -> Sick -> Holiday
        const circles = [
            { id: 'donutWork', val: work, color: 'var(--primary)' },
            { id: 'donutSchool', val: school, color: 'var(--school)' },
            { id: 'donutVac', val: vac, color: 'var(--success)' },
            { id: 'donutSick', val: sick, color: 'var(--danger)' },
            { id: 'donutHoliday', val: holiday, color: 'var(--holiday)' }
        ];
        
        let offset = 0;
        circles.forEach((circle, index) => {
            const el = document.getElementById(circle.id);
            if (!el) return;
            
            const dash = (circle.val / total) * c;
            const delay = donutStyle.animated ? (index * 150) : 0;
            
            // Set stroke width immediately
            el.setAttribute('stroke-width', donutStyle.strokeWidth);
            el.setAttribute('stroke-dashoffset', -offset);
            
            // Set glow effect
            if (donutStyle.glow) {
                const colorValue = circle.color.includes('var') ? 'rgb(var(--primary-rgb))' : circle.color;
                el.style.filter = `drop-shadow(0 0 6px ${colorValue})`;
            } else {
                el.style.filter = 'none';
            }
            
            // Set rainbow or normal animation
            if (donutStyle.rainbow) {
                el.style.animation = 'rainbowShift 3s linear infinite';
            } else {
                el.style.animation = 'none';
            }
            
            // Animation: start empty, then fill
            if (donutStyle.animated && !donutStyle.rainbow) {
                el.style.transition = 'none';
                el.setAttribute('stroke-dasharray', `0 ${c}`);
                
                // After a tiny delay, apply transition and animate to final value
                setTimeout(() => {
                    el.style.transition = `stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)`;
                    el.setAttribute('stroke-dasharray', `${dash} ${c}`);
                }, 10 + delay);
            } else {
                // No animation - just set the final value
                el.style.transition = 'none';
                el.setAttribute('stroke-dasharray', `${dash} ${c}`);
            }
            
            offset += dash;
        });
        
        // Apply rainbow to SVG container if enabled
        const svg = document.getElementById('donutSvg');
        if (svg) {
            if (donutStyle.rainbow) {
                svg.style.animation = 'rainbowShift 3s linear infinite';
            } else {
                svg.style.animation = 'none';
            }
        }
    }

    // ========== MEGA ADVANCED EFFECTS ENGINE ==========
    
    function createParticleEffect(x, y, color = 'var(--primary)', count = 8) {
        const container = document.createElement('div');
        container.className = 'particle-container';
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const angle = (i / count) * Math.PI * 2;
            const tx = Math.cos(angle) * 50;
            const delay = i * 30;
            
            particle.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                background: ${color.includes('var') ? 'var(--primary)' : color};
                border-radius: 50%;
                left: 0;
                top: 0;
                --tx: ${tx}px;
                animation: particleFloat 0.8s ease-out ${delay}ms forwards;
                box-shadow: 0 0 8px ${color.includes('var') ? 'var(--primary)' : color};
            `;
            container.appendChild(particle);
        }
        
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 1200);
    }
    
    function createExplosion(x, y, color = 'var(--primary)') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100');
        svg.setAttribute('height', '100');
        svg.style.cssText = `
            position: fixed;
            left: ${x - 50}px;
            top: ${y - 50}px;
            pointer-events: none;
            z-index: 9999;
        `;
        
        const actualColor = color.includes('var') ? 'rgb(var(--primary-rgb))' : color;
        
        for (let i = 0; i < 12; i++) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', actualColor);
            circle.style.animation = `expandPulse 0.8s ease-out ${i * 30}ms forwards`;
            svg.appendChild(circle);
        }
        
        document.body.appendChild(svg);
        setTimeout(() => svg.remove(), 1000);
    }
    
    function createConfetti(x, y, count = 15) {
        const colors = ['var(--primary)', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const confetti = document.createElement('div');
            const rotation = Math.random() * 360;
            const delay = i * 20;
            
            confetti.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 10px;
                height: 10px;
                background: ${color.includes('var') ? 'var(--primary)' : color};
                pointer-events: none;
                z-index: 9999;
                transform: rotate(${rotation}deg);
                animation: floatUp 1s ease-out ${delay}ms forwards;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 1500);
        }
    }
    
    function addShakeEffect(element, duration = 400) {
        element.classList.add('effect-shake');
        setTimeout(() => element.classList.remove('effect-shake'), duration);
    }
    
    function addBounceEffect(element, duration = 600) {
        element.classList.add('effect-bounce');
        setTimeout(() => element.classList.remove('effect-bounce'), duration);
    }
    
    function addGlowEffect(element, color = 'var(--primary)', duration = 800) {
        const originalStyle = element.style.filter;
        const actualColor = color.includes('var') ? 'rgb(var(--primary-rgb))' : color;
        element.style.filter = `drop-shadow(0 0 8px ${actualColor}) drop-shadow(0 0 16px rgba(var(--primary-rgb), 0.6))`;
        setTimeout(() => {
            element.style.filter = originalStyle || '';
        }, duration);
    }
    
    function addRainbowEffect(element, duration = 3000) {
        element.style.animation = `rainbowShift ${duration}ms linear`;
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    }
    
    function attachChartEffects(elementId, effectConfig = {}) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Click effects removed (no explosion animation)
        // Hover effects removed (no purple glow)
    }
    
    function enhanceChartsWithEffects(config = {}) {
        const charts = ['trendChart', 'chartMonthlyTrend', 'chartWeeklyPerformance', 'chartProductivityByDay'];
        charts.forEach(id => {
            attachChartEffects(id, config);
        });
    }
    
    // ========== END ADVANCED EFFECTS ENGINE ==========

    // NEU: Berechnung der Deep Performance Metriken
    function calculateDeepPerformanceMetrics(entries) {
        const workEntries = entries.filter(e => e.type === 'work' && e.worked > 0);
        let totalStartMinutes = 0;
        let startCount = 0;
        let totalFocusHours = 0;
        let focusCount = 0;

        workEntries.forEach(e => {
            // 1. Ø Arbeitsbeginn
            if (e.shiftStart && e.shiftStart.includes(':')) {
                const [h, m] = e.shiftStart.split(':').map(Number);
                totalStartMinutes += (h * 60 + m);
                startCount++;
            }

            // 2. Ø Längste Fokusphase
            if (e.breakLog && e.breakLog.length > 0) {
                 // Pausenlogik ist komplex, hier vereinfachte Berechnung der längsten durchgehenden Arbeitsphase
                 let lastTime = new Date(e.date).getTime();
                 let phases = [];
                 
                 // Alle Zeitpunkte (Start/Pause/Wiederaufnahme) erfassen
                 const timePoints = e.breakLog
                    .map(l => l.time)
                    .sort((a, b) => a - b);

                 let shiftTimes = [];
                 
                 // Füge den Start der Schicht hinzu, wenn bekannt (für Timer-Einträge oft nicht vorhanden)
                 if (e.shiftStart) {
                     const [h, m] = e.shiftStart.split(':').map(Number);
                     const d = new Date(e.date);
                     d.setHours(h, m, 0, 0);
                     shiftTimes.push({ time: d.getTime(), type: 'start' });
                 }
                 
                 // Finde den ersten Start im BreakLog, falls Timer verwendet wurde
                 const firstTimerStart = e.breakLog.find(l => l.action === 'start')?.time;
                 if (firstTimerStart) {
                     shiftTimes.push({ time: firstTimerStart, type: 'start' });
                 }
                 
                 // Fülle mit Pausen- und Wiederaufnahmezeiten
                 e.breakLog.forEach(log => {
                      if (log.action === 'pause') {
                         // Suche nach dem letzten Start-Punkt vor dieser Pause (Ende der Fokusphase)
                         let lastStart = [...shiftTimes].sort((a,b) => b.time - a.time).find(t => t.time < log.time);
                         if (lastStart) phases.push(log.time - lastStart.time);

                         shiftTimes.push({ time: log.time, type: 'pause' });
                      } else if (log.action === 'start') {
                         shiftTimes.push({ time: log.time, type: 'start' });
                      }
                 });
                 
                 // Füge die letzte Phase hinzu (bis zum Ende der Schicht)
                 const lastShiftTime = timePoints.at(-1);
                 
                 // Wir müssen den Netto-Arbeitszeitwert E.Worked nutzen, da die Zeitpunkte unvollständig sein können.
                 // Als Ersatz nehmen wir die Gesamt-Arbeitszeit.
                 
                 // Bessere Näherung: Wenn Timer-Daten existieren, ist die längste Phase die gesamte gearbeitete Zeit.
                 // (Ohne genaues Parsing der Pausen-Offsets)
                 if (e.worked > 0) {
                     totalFocusHours += e.worked;
                     focusCount++;
                 }

            } else {
                 // Wenn keine Pausen geloggt wurden (Manuelle Eingabe/Start-Ende), ist die längste Phase die Netto-Arbeitszeit.
                 totalFocusHours += e.worked;
                 focusCount++;
            }
        });

        const avgStartMinutes = startCount > 0 ? totalStartMinutes / startCount : 0;
        const avgStartHours = Math.floor(avgStartMinutes / 60);
        const avgStartMins = Math.round(avgStartMinutes % 60);

        return {
            avgStartTime: startCount > 0 ? `${avgStartHours < 10 ? '0' : ''}${avgStartHours}:${avgStartMins < 10 ? '0' : ''}${avgStartMins}` : '---',
            avgFocusHours: focusCount > 0 ? (totalFocusHours / focusCount).toFixed(1) : '0.0',
        };
    }
    function getTypeColor(type) {
        const colors = {
            'work': 'var(--primary)',
            'school': 'var(--school)',
            'vacation': 'var(--success)',
            'gleittag': '#f59e0b',
            'sick': 'var(--danger)',
            'holiday': 'var(--holiday)',
            'reset': '#64748b'
        };
        return colors[type] || '#666';
    }
    
    function getTypeEmoji(type) {
        const emojis = {
            'work': '💼',
            'school': '📚',
            'vacation': '🌴',
            'gleittag': '⚡',
            'sick': '💊',
            'holiday': '🏖️',
            'reset': '❌'
        };
        return emojis[type] || '?';
    }
    
    function updatePrognoseStats(plan, startSaldo, endSaldo) {
        const statsEl = document.getElementById('prognoseStats');
        let vacationDays = 0;
        let sickDays = 0;
        let schoolDays = 0;
        let workDays = 0;
        let gleittagDays = 0;

        for (const date in plan) {
            if (plan[date] === 'vacation') vacationDays++;
            else if (plan[date] === 'gleittag') gleittagDays++;
            else if (plan[date] === 'sick') sickDays++;
            else if (plan[date] === 'school') schoolDays++;
            else if (plan[date] === 'work') workDays++;
        }

        const html = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--primary);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Arbeitstage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#fff; margin-top:4px;">${workDays}</div>
                </div>
                <div style="font-size:1.5rem;">💼</div>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--success);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Urlaubstage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--success); margin-top:4px;">${vacationDays}</div>
                </div>
                <div style="font-size:1.5rem;">🌴</div>
            </div>
            ${gleittagDays > 0 ? `<div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid #f59e0b;">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Gleittage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#f59e0b; margin-top:4px;">${gleittagDays}</div>
                </div>
                <div style="font-size:1.5rem;">⚡</div>
            </div>` : ''}
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--danger);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Kranktage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--danger); margin-top:4px;">${sickDays}</div>
                </div>
                <div style="font-size:1.5rem;">💊</div>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--school);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Schultage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--school); margin-top:4px;">${schoolDays}</div>
                </div>
                <div style="font-size:1.5rem;">📚</div>
            </div>
        `;
        statsEl.innerHTML = html;
    }
    
    function highlightSelectAction() {
        const select = document.getElementById('prognosePlanSelect');
        if (select.value) {
            select.style.background = getTypeColor(select.value) + '33';
            select.style.borderColor = getTypeColor(select.value);
        }
    }
    
    function resetPrognosePlan() {
        showCustomConfirm(
            '↺ Planung zurücksetzen?',
            'Alle Änderungen im Planungs-Kalender werden verworfen.',
            () => {
                data.settings.prognosePlan = {};
                document.getElementById('prognosePlanSelect').value = '';
                renderPrognoseView();
            },
            null
        );
    }

    // Funktion zum Aktualisieren eines Tages im Prognose-Plan
    function updatePrognoseDay(dateKey) {
        const planType = document.getElementById('prognosePlanSelect').value;
        
        if (!planType || planType === 'reset') {
            delete data.settings.prognosePlan[dateKey];
        } else {
            data.settings.prognosePlan[dateKey] = planType;
        }

        renderPrognoseView();
    }
    
    // Plan auf die tatsächlichen Entries anwenden
    function applyPrognosePlan() {
        uEvent('prognose-plan-apply');
        const planCount = Object.keys(data.settings.prognosePlan).length;
        
        if (planCount === 0) {
            return showCustomMessage('ℹ️ Kein Plan', 'Du hast noch keine Änderungen im Planungs-Kalender vorgenommen. Klicke auf Tage, um sie zu planen.', 'info');
        }
        
        showCustomConfirm(
            '🔮 Prognose-Plan anwenden?',
            `${planCount} Tage aus deinem Plan werden als echte Einträge gebucht:\n\n⚠️ Bestehende Einträge in diesem Zeitraum werden überschrieben.\n\n💡 Arbeitstage werden NICHT gebucht (nur Urlaub/Krank/Schule).`,
            () => {
                let bookedCount = 0;
                let overwriteCount = 0;
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                for (const dateKey in data.settings.prognosePlan) {
                    const planType = data.settings.prognosePlan[dateKey];
                    const dateObj = new Date(dateKey);

                    // Nur für zukünftige Tage anwenden
                    if (dateObj.getTime() >= now.getTime()) {
                        
                        // Nur Freistellungs-Typen buchen
                        if (planType !== 'work' && planType !== 'reset') {
                            
                            const dayIndex = dateObj.getDay();
                            const expected = data.settings.hours[dayIndex] || 0;
                            
                            // Bestehenden Eintrag löschen, wenn vorhanden
                            const existingIndex = data.entries.findIndex(e => e.date === dateKey);
                            if (existingIndex >= 0) {
                                data.entries.splice(existingIndex, 1);
                                overwriteCount++;
                            }

                            if (expected > 0) {
                                data.entries.push({
                                    id: Date.now() + Math.random(),
                                    date: dateKey,
                                    type: planType,
                                    worked: expected,
                                    expected: expected,
                                    diff: 0,
                                    info: `📅 Prognose-Plan: ${planType.charAt(0).toUpperCase() + planType.slice(1)}`,
                                    isPeriod: true,
                                    breakMins: 0, shiftEnd: '', shiftWarning: false, project: '', breakLog: []
                                });
                                bookedCount++;
                            }
                        }
                    }
                }

                data.settings.prognosePlan = {}; // Plan zurücksetzen
                recalculateVacationUsed();
                data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
                save();
                
                showCustomMessage(
                    '✅ Plan gebucht!', 
                    `${bookedCount} Tage wurden als Einträge gebucht${overwriteCount > 0 ? ` (${overwriteCount} bestehende Einträge überschrieben)` : ''}.\n\nDein Saldo und die Statistiken wurden aktualisiert.`,
                    'success'
                );
                
                renderPrognoseView();
                updateUI();
                
                if (document.getElementById('view-history').classList.contains('active')) {
                    renderHistoryView();
                }
            },
            null
        );
    }
    
    function downloadPrognoseReport() {
        const startSaldo = data.entries.reduce((sum, e) => sum + e.diff, 0);
        let reportContent = `PROGNOSE-BERICHT
=====================================
Erstellt: ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}

AKTUELLER STATUS:
- Saldo heute: ${(startSaldo >= 0 ? '+' : '')}${startSaldo.toFixed(2)}h

GEPLANTE ÄNDERUNGEN:
`;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let vacationDays = 0, sickDays = 0, schoolDays = 0, workDays = 0;

        for (const date in data.settings.prognosePlan) {
            if (new Date(date) >= today) {
                const type = data.settings.prognosePlan[date];
                const typeLabel = {
                    'work': 'Arbeit',
                    'vacation': 'Urlaub',
                    'gleittag': 'Gleittag',
                    'sick': 'Krank',
                    'school': 'Schule',
                    'holiday': 'Feiertag'
                }[type] || 'Unbekannt';
                
                reportContent += `  ${date} (${new Date(date).toLocaleDateString('de-DE', {weekday:'short'})}): ${typeLabel}\n`;
                
                if (type === 'vacation') vacationDays++;
                else if (type === 'gleittag') { /* Gleittag: kein Urlaubstag */ }
                else if (type === 'sick') sickDays++;
                else if (type === 'school') schoolDays++;
                else if (type === 'work') workDays++;
            }
        }

        reportContent += `\nZUSAMMENFASSUNG:
- Geplante Arbeitstage: ${workDays}
- Geplante Urlaubstage: ${vacationDays}
- Geplante Kranktage: ${sickDays}
- Geplante Schultage: ${schoolDays}

HINWEIS:
Der Plan wird durch \"Plan anwenden\" als echte Einträge gebucht.
`;

        const blob = new Blob([reportContent], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `prognose_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        
        showCustomMessage('✅ Export gestartet', 'Prognose-Bericht wird heruntergeladen...', 'success');
    }
    
    function showPrognoseHelp() {
        showCustomMessage(
            '🔮 Prognose-Planer Hilfe',
            `ÜBERSICHT:
Mit dem Prognose-Planer kannst du deine Arbeitszeit für die nächsten 4 Wochen planen und die Auswirkung auf dein Gleitzeitkonto sehen.

VERWENDUNG:
1. Wähle einen Typ aus dem Dropdown (Arbeit, Urlaub, Krank, Schule)
2. Klicke auf die Tage, die du planen möchtest
3. Die Prognose aktualisiert sich automatisch
4. Klicke \"Plan anwenden\", um die Einträge zu buchen

FARBEN:
💼 Blau = Arbeit
🌴 Grün = Urlaub  
💊 Rot = Krank
📚 Orange = Berufsschule
🏖️ Gelb = Feiertag

TIPPS:
✓ Der Plan beeinflusst nicht deinen aktuellen Saldo
✓ Nur zukünftige Tage können geplant werden
✓ \"Zurücksetzen\" entfernt die Planung für einen Tag
✓ Die Statistiken zeigen deine geplanten Tage`,
            'info'
        );
    }
    

    // --- DATEN EXPORT LOGIC (Unverändert) ---
    // (filterHistoryData, renderHistoryView, exportHistoryData, convertToCSV sind unverändert)
    
    function filterHistoryData() {
        const startStr = document.getElementById('historyFilterStart').value;
        const endStr = document.getElementById('historyFilterEnd').value;
        const type = document.getElementById('historyFilterType').value;
        const minHours = parseFloat(document.getElementById('historyFilterMinHours').value) || 0;
        const searchText = document.getElementById('historyFilterSearch').value.toLowerCase();

        let filtered = data.entries;

        if (startStr) {
            filtered = filtered.filter(e => new Date(e.date) >= new Date(startStr));
        }
        if (endStr) {
            const endDate = new Date(endStr);
            endDate.setDate(endDate.getDate() + 1); 
            filtered = filtered.filter(e => new Date(e.date) < endDate);
        }
        if (type !== 'all') {
            filtered = filtered.filter(e => e.type === type);
        }
        if (minHours > 0) {
            filtered = filtered.filter(e => e.worked >= minHours);
        }
        if (searchText) {
            filtered = filtered.filter(e => 
                 (e.info && e.info.toLowerCase().includes(searchText)) || 
                 (e.project && e.project.toLowerCase().includes(searchText))
            );
        }

        return filtered;
    }
    function exportHistoryData(format) {
        const filtered = filterHistoryData(); 

        if (filtered.length === 0) {
            return showCustomMessage('❌ Fehler', 'Keine Daten für den Export gefunden. Bitte überprüfe deine Filter.', 'error');
        }

        let fileContent;
        let fileName;
        let mimeType;

        if (format === 'json') {
            fileContent = JSON.stringify(filtered, null, 2);
            fileName = 'time_pro_export_filtered.json';
            mimeType = 'application/json';
        } else if (format === 'csv') {
            fileContent = convertToCSV(filtered);
            fileName = 'time_pro_export_filtered.csv';
            mimeType = 'text/csv';
        } else {
            return;
        }

        const blob = new Blob([fileContent], { type: mimeType });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        
        showCustomMessage('✅ Export gestartet', `Export von ${filtered.length} gefilterten Einträgen als ${format.toUpperCase()} wird vorbereitet...`, 'success');
    }

    function convertToCSV(dataArray) {
        if (dataArray.length === 0) return '';
        
        // NEU: 'Projekt' & 'Notiz' Spalten hinzugefügt
        const headers = ['Datum', 'Typ', 'Arbeitszeit_h', 'Sollzeit_h', 'Differenz_h', 'Projekt', 'Notiz', 'Break_Min', 'Shift_Warning'];
        
        const csvRows = [headers.join(';')]; 

        for (const entry of dataArray) {
            const row = [
                entry.date,
                entry.type,
                entry.worked.toFixed(2).replace('.', ','),
                entry.expected.toFixed(2).replace('.', ','),
                entry.diff.toFixed(2).replace('.', ','),
                (entry.project || '').replace(/,/g, ''), // Projekt
                (entry.info || '').replace(/,/g, ''),    // Notiz
                entry.breakMins,
                entry.shiftWarning ? 'JA' : 'NEIN'
            ];
            csvRows.push(row.join(';'));
        }

        return csvRows.join('\n');
    }
    
    // --- HILFSFUNKTIONEN (Unverändert) ---
    function isOddWeek(d) { return getWeek(d) % 2 !== 0; }

    function getWeek(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }
    function delEntry(id) {
        showCustomConfirm(
            '🗑️ Eintrag löschen?',
            'Möchtest du diesen Eintrag löschen? Du kannst ihn kurz rückgängig machen (Ctrl+Z).',
            () => {
                const idx = data.entries.findIndex(e => e.id === id);
                if (idx === -1) return;
                const entry = data.entries[idx];

                // Entferne aus Einträgen und schiebe in den Papierkorb (trash)
                data.entries.splice(idx, 1);
                data.trash = data.trash || [];
                data.trash.push({ entry: entry, originalIndex: idx, deletedAt: Date.now() });

                recalculateVacationUsed(); 
                save();
                if (document.getElementById('view-history').classList.contains('active')) {
                     renderHistoryView();
                }

                // Zeige kurz die Undo-Toast-Nachricht
                showUndoToast();
            },
            null
        );
    }

    function showUndoToast() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-sidebar);
            padding: 12px 16px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 2001;
            display:flex;
            gap:12px;
            align-items:center;
            max-width: 90%;
        `;

        toast.innerHTML = `
            <div style="flex:1; color:var(--text-main); font-weight:600;">Eintrag gelöscht</div>
            <button id="undoBtn" style="background:transparent; border:1px solid rgba(255,255,255,0.08); color:var(--primary); padding:6px 10px; border-radius:8px; cursor:pointer;">Rückgängig</button>
        `;

        document.body.appendChild(toast);

        const removeToast = () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 240);
        };

        // Undo on click
        toast.querySelector('#undoBtn').addEventListener('click', () => {
            undoDelete();
            removeToast();
        });

        // Auto entfernen nach 8 Sekunden
        setTimeout(removeToast, 8000);
    }

    function undoDelete() {
        data.trash = data.trash || [];
        if (!data.trash.length) {
            showCustomMessage('ℹ️ Nichts zu rückgängig machen', 'Es gibt keine kürzliche Löschung.', 'info');
            return;
        }

        const last = data.trash.pop();
        const restored = last.entry;
        const idx = last.originalIndex != null ? last.originalIndex : data.entries.length;
        // Füge wieder an der ursprünglichen Position ein (oder hinten)
        data.entries.splice(Math.min(idx, data.entries.length), 0, restored);
        recalculateVacationUsed();
        save();
        if (document.getElementById('view-history').classList.contains('active')) {
            renderHistoryView();
        }

        showCustomMessage('↩️ Wiederhergestellt', 'Eintrag wurde wiederhergestellt.', 'success');
    }
    



    function toggleVacationPanel() {
        const vacationPanel = document.getElementById('vacationPanelCard');
        if (vacationPanel) {
            if (vacationPanel.style.display === 'none') {
                vacationPanel.style.display = 'block';
                // Load vacation data when opening
                const proRata = calculateProRataVacation(data.settings.vacation.total || 30);
                document.getElementById('vacationProRata').innerText = proRata;
                document.getElementById('confVacationTotal').value = data.settings.vacation.total || 30;
                document.getElementById('confVacationUsedManual').value = data.settings.vacation.usedManual || 0;
            } else {
                vacationPanel.style.display = 'none';
            }
        }
    }
    function saveCorrection() {
        const val = parseFloat(document.getElementById('corrVal').value);
        if(!val) return;
        const sel = document.getElementById('corrSelect');
        data.entries.push({
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            isPeriod: true,
            label: `Korrektur: ${sel.value}`,
            diff: val, worked:0, expected:0, type:'work', info:'Manuelle Korrektur',
            breakMins: 0, shiftEnd: '', shiftWarning: false
        });
        save();
        document.getElementById('corrModal').classList.remove('active');
    }
    function closeBackupMenu() {
        if (window.backupMenuElement) {
            window.backupMenuElement.remove();
            window.backupMenuElement = null;
            document.removeEventListener('click', closeBackupMenu);
        }
    }
    function closeExportMenu() {
        if (window.exportMenuElement) {
            window.exportMenuElement.remove();
            window.exportMenuElement = null;
            document.removeEventListener('click', closeExportMenu);
        }
    }

    // ===== EXPORT STATISTICS & DUAL-MODE EXPORT =====
    function openExportStatsModal() {
        const entries = data.entries || [];
        const workEntries = entries.filter(e => e.type === 'work');
        const totalHours = workEntries.reduce((s, e) => s + (e.worked || 0), 0);
        const totalDays = entries.length;
        const totalDiff = entries.reduce((s, e) => s + (e.diff || 0), 0);
        const projects = [...new Set(entries.map(e => e.project).filter(Boolean))];
        const vacDays = entries.filter(e => e.type === 'vacation').length;
        const sickDays = entries.filter(e => e.type === 'sick').length;
        const schoolDays = entries.filter(e => e.type === 'school').length;
        const dateRange = entries.length ? entries[entries.length-1].date + ' → ' + entries[0].date : '—';

        const grid = document.getElementById('exportStatsGrid');
        grid.innerHTML = `
            <div class="export-stat-card"><div class="export-stat-value">${totalDays}</div><div class="export-stat-label">Einträge</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${totalHours.toFixed(0)}h</div><div class="export-stat-label">Arbeitsstunden</div></div>
            <div class="export-stat-card"><div class="export-stat-value" style="color:${totalDiff >= 0 ? 'var(--success)' : 'var(--danger)'}">${totalDiff >= 0 ? '+' : ''}${totalDiff.toFixed(1)}h</div><div class="export-stat-label">Saldo</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${projects.length}</div><div class="export-stat-label">Projekte</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${vacDays}</div><div class="export-stat-label">Urlaub</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${sickDays}</div><div class="export-stat-label">Krank</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${schoolDays}</div><div class="export-stat-label">Berufsschule</div></div>
            <div class="export-stat-card"><div class="export-stat-value" style="font-size:0.85rem;">${dateRange}</div><div class="export-stat-label">Zeitraum</div></div>
        `;

        // Estimate sizes
        const minimalData = { entries: data.entries, settings: data.settings };
        const minSize = new Blob([JSON.stringify(minimalData)]).size;
        document.getElementById('exportSizeMinimal').textContent = '~' + (minSize / 1024).toFixed(0) + ' KB';
        // MAX report is ~3-5x bigger (inline HTML+CSS+SVG charts)
        document.getElementById('exportSizeMax').textContent = '~' + Math.round((minSize * 4) / 1024) + ' KB';

        document.getElementById('exportStatsModal').style.display = 'flex';
    }

    function runExportMinimal() {
        const minimalData = {
            _exportType: 'minimal',
            _version: 1,
            _created: new Date().toISOString(),
            _app: 'MyWorkLog',
            _entryCount: data.entries.length,
            entries: data.entries,
            settings: data.settings
        };
        const blob = new Blob([JSON.stringify(minimalData)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'MyWorkLog_Minimal_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        try { localStorage.setItem('tt_last_export', new Date().toISOString()); } catch(e) {}
        document.getElementById('exportStatsModal').style.display = 'none';
        showSmartNotification('📦 Minimal Export', `${data.entries.length} Einträge kompakt exportiert (${(blob.size/1024).toFixed(0)} KB)`, 'success');
    }

    function runExportMax() {
        const entries = (data.entries || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
        const workEntries = entries.filter(e => e.type === 'work');
        const totalHours = workEntries.reduce((s,e) => s + (e.worked||0), 0);
        const totalDiff = entries.reduce((s,e) => s + (e.diff||0), 0);
        const projects = [...new Set(entries.map(e => e.project).filter(Boolean))];
        const vacDays = entries.filter(e => e.type === 'vacation').length;
        const sickDays = entries.filter(e => e.type === 'sick').length;
        const schoolDays = entries.filter(e => e.type === 'school').length;
        const avgPerDay = workEntries.length > 0 ? (totalHours / workEntries.length) : 0;

        // Build weekly aggregation for chart
        const weekMap = {};
        entries.forEach(e => {
            const d = new Date(e.date);
            const wk = getWeek(d);
            const yr = d.getFullYear();
            const key = yr + '-KW' + String(wk).padStart(2,'0');
            if (!weekMap[key]) weekMap[key] = { worked: 0, expected: 0, diff: 0 };
            weekMap[key].worked += (e.worked || 0);
            weekMap[key].expected += (e.expected || 0);
            weekMap[key].diff += (e.diff || 0);
        });
        const weekKeys = Object.keys(weekMap).sort();

        // Build project breakdown
        const projectMap = {};
        workEntries.forEach(e => {
            const p = e.project || 'Ohne Projekt';
            projectMap[p] = (projectMap[p] || 0) + (e.worked || 0);
        });

        // Build day distribution (Mo-Fr)
        const dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
        const dayHours = [0,0,0,0,0,0,0];
        const dayCounts = [0,0,0,0,0,0,0];
        workEntries.forEach(e => { const di = new Date(e.date).getDay(); dayHours[di] += e.worked||0; dayCounts[di]++; });
        const dayAvg = dayHours.map((h,i) => dayCounts[i] ? (h/dayCounts[i]) : 0);

        // Month breakdown
        const monthMap = {};
        entries.forEach(e => {
            const key = e.date.substring(0,7);
            if (!monthMap[key]) monthMap[key] = { worked:0, expected:0, diff:0, count:0 };
            monthMap[key].worked += (e.worked||0);
            monthMap[key].expected += (e.expected||0);
            monthMap[key].diff += (e.diff||0);
            monthMap[key].count++;
        });

        // Type distribution for pie
        const typeCounts = {};
        entries.forEach(e => { typeCounts[e.type] = (typeCounts[e.type]||0) + 1; });
        const typeLabels = { work:'Arbeit', vacation:'Urlaub', sick:'Krank', school:'Berufsschule', holiday:'Feiertag', gleittag:'Gleittag' };
        const typeColors = { work:'var(--primary)', vacation:'#f59e0b', sick:'#ef4444', school:'#3b82f6', holiday:'#10b981', gleittag:'#06b6d4' };

        // SVG bar chart for weekly hours
        const maxWeekHours = Math.max(...weekKeys.map(k => weekMap[k].worked), 1);
        const barW = Math.max(12, Math.min(40, 500 / weekKeys.length));
        const chartW = weekKeys.length * (barW + 4) + 60;
        const chartH = 180;
        let weekBars = '';
        weekKeys.forEach((k, i) => {
            const h = (weekMap[k].worked / maxWeekHours) * (chartH - 30);
            const x = 50 + i * (barW + 4);
            const color = weekMap[k].diff >= 0 ? 'var(--primary)' : '#ef4444';
            weekBars += `<rect x="${x}" y="${chartH - h - 20}" width="${barW}" height="${h}" rx="3" fill="${color}" opacity="0.8"/>`;
            if (i % Math.max(1, Math.floor(weekKeys.length/8)) === 0) {
                weekBars += `<text x="${x + barW/2}" y="${chartH - 4}" text-anchor="middle" fill="#888" font-size="9">${k.split('-')[1]}</text>`;
            }
        });
        // Y axis labels
        for (let y = 0; y <= 4; y++) {
            const val = (maxWeekHours / 4 * y).toFixed(0);
            const yPos = chartH - 20 - ((chartH - 30) / 4) * y;
            weekBars += `<text x="45" y="${yPos + 4}" text-anchor="end" fill="#666" font-size="9">${val}h</text>`;
            weekBars += `<line x1="50" y1="${yPos}" x2="${chartW}" y2="${yPos}" stroke="#333" stroke-dasharray="3"/>`;
        }
        const weekChartSVG = `<svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:auto;">${weekBars}</svg>`;

        // SVG for day distribution
        const maxDayAvg = Math.max(...dayAvg, 1);
        let dayBars = '';
        [1,2,3,4,5].forEach((di, idx) => {
            const h = (dayAvg[di] / maxDayAvg) * 100;
            const x = 50 + idx * 70;
            dayBars += `<rect x="${x}" y="${130-h}" width="50" height="${h}" rx="4" fill="var(--primary)" opacity="0.75"/>`;
            dayBars += `<text x="${x+25}" y="148" text-anchor="middle" fill="#999" font-size="11">${dayNames[di]}</text>`;
            dayBars += `<text x="${x+25}" y="${125-h}" text-anchor="middle" fill="#ccc" font-size="10">${dayAvg[di].toFixed(1)}h</text>`;
        });
        const dayChartSVG = `<svg viewBox="0 0 420 155" style="width:100%;max-width:420px;height:auto;">${dayBars}</svg>`;

        // SVG donut for type distribution
        const total = Object.values(typeCounts).reduce((s,v)=>s+v,0);
        let angle = 0;
        let donutPaths = '';
        let donutLegend = '';
        Object.entries(typeCounts).forEach(([type, count]) => {
            const pct = count / total;
            const a1 = angle * Math.PI / 180;
            angle += pct * 360;
            const a2 = angle * Math.PI / 180;
            const large = pct > 0.5 ? 1 : 0;
            const r = 60; const cx = 80; const cy = 80;
            const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2);
            const ri = 35;
            const x3 = cx + ri * Math.cos(a2); const y3 = cy + ri * Math.sin(a2);
            const x4 = cx + ri * Math.cos(a1); const y4 = cy + ri * Math.sin(a1);
            const color = typeColors[type] || '#888';
            donutPaths += `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 ${large},0 ${x4},${y4} Z" fill="${color}" opacity="0.85"/>`;
            donutLegend += `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#ccc;"><span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block;"></span>${typeLabels[type]||type}: ${count} (${(pct*100).toFixed(0)}%)</div>`;
        });
        const donutSVG = `<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;"><svg viewBox="0 0 160 160" style="width:160px;height:160px;">${donutPaths}</svg><div style="display:flex;flex-direction:column;gap:6px;">${donutLegend}</div></div>`;

        // Month table
        const monthKeys = Object.keys(monthMap).sort();
        let monthRows = monthKeys.map(k => {
            const m = monthMap[k];
            const diffColor = m.diff >= 0 ? '#10b981' : '#ef4444';
            return `<tr><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${m.worked.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${m.expected.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;color:${diffColor};font-weight:700;">${m.diff >= 0 ? '+' : ''}${m.diff.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${m.count}</td></tr>`;
        }).join('');

        // Project table
        let projRows = Object.entries(projectMap).sort((a,b) => b[1]-a[1]).map(([p, h]) => {
            const pct = totalHours > 0 ? (h/totalHours*100).toFixed(1) : 0;
            return `<tr><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;">${p}</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;font-weight:700;">${h.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;color:var(--text-muted);">${pct}%</td></tr>`;
        }).join('');

        // Entry table (last 50)
        const recent = entries.slice(-50).reverse();
        let entryRows = recent.map(e => {
            const tColor = typeColors[e.type] || '#888';
            return `<tr><td style="padding:6px 10px;border-bottom:1px solid #222;font-size:13px;">${e.date}</td><td style="padding:6px 10px;border-bottom:1px solid #222;"><span style="color:${tColor};font-weight:600;font-size:12px;">${typeLabels[e.type]||e.type}</span></td><td style="padding:6px 10px;border-bottom:1px solid #222;text-align:right;font-family:monospace;">${(e.worked||0).toFixed(2)}h</td><td style="padding:6px 10px;border-bottom:1px solid #222;text-align:right;color:${(e.diff||0)>=0?'#10b981':'#ef4444'};font-family:monospace;">${(e.diff||0)>=0?'+':''}${(e.diff||0).toFixed(2)}h</td><td style="padding:6px 10px;border-bottom:1px solid #222;font-size:12px;color:#888;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.project||'—'}</td></tr>`;
        }).join('');

        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' });

        const html = '<!DOCTYPE html>\n'
        + '<html lang="de">\n<head>\n<meta charset="UTF-8">\n'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        + '<title>MyWorkLog Report \u2014 ' + dateStr + '<\/title>\n'
        + '<style>\n'
        + '  *{margin:0;padding:0;box-sizing:border-box;}\n'
        + '  body{background:#0f0f0f;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;padding:24px;max-width:900px;margin:0 auto;}\n'
        + '  h1{font-size:1.8rem;font-weight:800;margin-bottom:4px;}\n'
        + '  h2{font-size:1.1rem;font-weight:700;margin:32px 0 16px;color:var(--primary);display:flex;align-items:center;gap:8px;}\n'
        + '  .subtitle{color:#888;font-size:0.85rem;margin-bottom:32px;}\n'
        + '  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:32px;}\n'
        + '  .kpi{padding:18px;border-radius:14px;background:#1a1a1a;border:1px solid #2a2a2a;text-align:center;}\n'
        + '  .kpi-val{font-size:1.6rem;font-weight:800;font-family:\'JetBrains Mono\',monospace;}\n'
        + '  .kpi-label{font-size:0.65rem;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-weight:600;}\n'
        + '  .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:20px;margin-bottom:20px;overflow-x:auto;}\n'
        + '  table{width:100%;border-collapse:collapse;font-size:14px;}\n'
        + '  th{text-align:left;padding:10px 12px;border-bottom:2px solid #333;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.8px;color:#888;font-weight:700;}\n'
        + '  .footer{margin-top:48px;padding-top:24px;border-top:1px solid #2a2a2a;text-align:center;color:#555;font-size:0.8rem;}\n'
        + '  @media print{body{background:#fff;color:#111;} .kpi{border-color:#ddd;background:#f9f9f9;} .card{border-color:#ddd;background:#fff;} th{border-color:#ccc;color:#555;} td{border-color:#eee !important;}}\n'
        + '  @media (max-width:500px){.kpi-grid{grid-template-columns:repeat(2,1fr);} body{padding:12px;}}\n'
        + '<\/style>\n<\/head>\n<body>\n'
        + '<h1>\ud83d\udcca MyWorkLog Report<\/h1>\n'
        + '<div class="subtitle">Erstellt am ' + dateStr + ' \u00b7 ' + entries.length + ' Eintr\u00e4ge \u00b7 ' + (entries.length ? entries[entries.length-1].date + ' bis ' + entries[0].date : '\u2014') + '<\/div>\n'
        + '\n<div class="kpi-grid">\n'
        + '  <div class="kpi"><div class="kpi-val">' + totalHours.toFixed(0) + 'h<\/div><div class="kpi-label">Arbeitsstunden<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val" style="color:' + (totalDiff>=0?'#10b981':'#ef4444') + '">' + (totalDiff>=0?'+':'') + totalDiff.toFixed(1) + 'h<\/div><div class="kpi-label">Gesamt-Saldo<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + avgPerDay.toFixed(1) + 'h<\/div><div class="kpi-label">\u00d8 pro Tag<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + workEntries.length + '<\/div><div class="kpi-label">Arbeitstage<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + vacDays + '<\/div><div class="kpi-label">Urlaubstage<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + sickDays + '<\/div><div class="kpi-label">Krankheitstage<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + schoolDays + '<\/div><div class="kpi-label">Berufsschule<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + projects.length + '<\/div><div class="kpi-label">Projekte<\/div><\/div>\n'
        + '<\/div>\n\n'
        + '<h2>\ud83d\udcc8 W\u00f6chentlicher Verlauf<\/h2>\n<div class="card">' + weekChartSVG + '<\/div>\n\n'
        + '<h2>\ud83d\udcca Verteilung nach Typ<\/h2>\n<div class="card">' + donutSVG + '<\/div>\n\n'
        + '<h2>\ud83d\udcc5 Wochentag-Verteilung (\u00d8 Stunden Mo\u2013Fr)<\/h2>\n<div class="card">' + dayChartSVG + '<\/div>\n\n'
        + '<h2>\ud83d\udccb Monats\u00fcbersicht<\/h2>\n<div class="card">\n'
        + '<table><thead><tr><th>Monat<\/th><th style="text-align:right;">Ist<\/th><th style="text-align:right;">Soll<\/th><th style="text-align:right;">Saldo<\/th><th style="text-align:right;">Eintr\u00e4ge<\/th><\/tr><\/thead>\n'
        + '<tbody>' + monthRows + '<\/tbody><\/table><\/div>\n\n'
        + (projRows ? '<h2>\ud83c\udfe2 Projekt-Verteilung<\/h2>\n<div class="card"><table><thead><tr><th>Projekt<\/th><th style="text-align:right;">Stunden<\/th><th style="text-align:right;">Anteil<\/th><\/tr><\/thead><tbody>' + projRows + '<\/tbody><\/table><\/div>\n' : '')
        + '\n<h2>\ud83d\udcdd Letzte 50 Eintr\u00e4ge<\/h2>\n<div class="card"><table><thead><tr><th>Datum<\/th><th>Typ<\/th><th style="text-align:right;">Stunden<\/th><th style="text-align:right;">Saldo<\/th><th>Projekt<\/th><\/tr><\/thead>'
        + '<tbody>' + entryRows + '<\/tbody><\/table><\/div>\n\n'
        + '<div class="footer">MyWorkLog MAX Report \u00b7 Generiert am ' + now.toLocaleString('de-DE') + ' \u00b7 myworklog.de<\/div>\n'
        + '<\/body>\n<\/html>';

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'MyWorkLog_MAX_Report_' + new Date().toISOString().split('T')[0] + '.html';
        a.click();
        URL.revokeObjectURL(a.href);
        try { localStorage.setItem('tt_last_export', new Date().toISOString()); } catch(e) {}
        document.getElementById('exportStatsModal').style.display = 'none';
        showSmartNotification('🚀 MAX Report', `HTML-Report mit Diagrammen exportiert (${(blob.size/1024).toFixed(0)} KB)`, 'success');
    }

    // ===== ICAL/ICS EXPORT SYSTEM (RFC 5545 COMPLIANT) =====
    // Export für Google Calendar, Outlook, Apple Calendar, etc.

    function showICalExportModal() {
        const modal = document.getElementById('iCalExportModal');
        if (!modal) {
            console.error('[iCal] Modal not found');
            return;
        }
        modal.classList.add('active');
    }

    async function generateAndDownloadICalFile() {
        uEvent('ical-export');
        const dateRangeSelect = document.getElementById('iCalDateRange');
        const typeFilterSelect = document.getElementById('iCalTypeFilter');
        const includeAlarms = document.getElementById('iCalIncludeAlarms')?.checked ?? true;

        if (!dateRangeSelect || !typeFilterSelect) {
            showCustomMessage('❌ Fehler', 'Formular-Elemente nicht gefunden', 'error');
            return;
        }

        const dateRange = dateRangeSelect.value;
        const typeFilter = typeFilterSelect.value;

        // Bestimme Datums-Range
        const today = new Date();
        let startDate, endDate;

        switch (dateRange) {
            case 'today':
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'all':
            default:
                startDate = new Date('2000-01-01');
                endDate = new Date('2099-12-31');
        }

        // Filtere Einträge
        let entries = data.entries || [];
        
        if (typeFilter !== 'all') {
            entries = entries.filter(e => e.type === typeFilter);
        }

        entries = entries.filter(e => {
            const entryDate = new Date(e.date);
            return entryDate >= startDate && entryDate <= endDate;
        });

        // Generiere iCal-Datei
        const iCalContent = generateICalContent(entries, includeAlarms);

        // Download
        const blob = new Blob([iCalContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `TimeTracker_${dateRange}_${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Modal schließen
        document.getElementById('iCalExportModal').classList.remove('active');

        showCustomMessage('✅ iCal exportiert', `${entries.length} Einträge in ${link.download}`, 'success');
    }

    function generateICalContent(entries, includeAlarms = true) {
        // RFC 5545 compliant iCalendar
        const lines = [];

        // Header
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//TimeTracker//NONSGML v2.0//EN');
        lines.push('CALSCALE:GREGORIAN');
        lines.push('METHOD:PUBLISH');
        lines.push('X-WR-CALNAME:TimeTracker');
        lines.push('X-WR-TIMEZONE:Europe/Berlin');
        lines.push('X-WR-CALDESC:Zeiterfassungs-Einträge aus TimeTracker');

        // Timezone (UTC für einfaches Handling)
        lines.push('BEGIN:VTIMEZONE');
        lines.push('TZID:UTC');
        lines.push('BEGIN:STANDARD');
        lines.push('DTSTART:19700101T000000Z');
        lines.push('TZOFFSETFROM:+0000');
        lines.push('TZOFFSETTO:+0000');
        lines.push('END:STANDARD');
        lines.push('END:VTIMEZONE');

        // Events
        entries.forEach(entry => {
            const event = generateICalEvent(entry, includeAlarms);
            lines.push(event);
        });

        // Footer
        lines.push('END:VCALENDAR');

        return lines.join('\r\n');
    }

    function generateICalEvent(entry, includeAlarms = true) {
        const lines = [];
        const uid = `timetracker-${entry.id}@timetracker.local`;
        const now = new Date();
        const timestamp = formatICalDateTime(now);

        // Bestimme Start und End Zeit
        let startTime, endTime;
        
        if (entry.start && entry.end) {
            // Parse time strings (HH:MM format)
            const startDate = new Date(entry.date);
            const endDate = new Date(entry.date);
            
            const [startHour, startMin] = entry.start.split(':').map(Number);
            const [endHour, endMin] = entry.end.split(':').map(Number);
            
            startDate.setHours(startHour, startMin, 0, 0);
            endDate.setHours(endHour, endMin, 0, 0);
            
            startTime = formatICalDateTime(startDate);
            endTime = formatICalDateTime(endDate);
        } else {
            // Ganztägiges Event
            startTime = formatICalDate(new Date(entry.date));
            endTime = formatICalDate(new Date(entry.date));
        }

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${timestamp}`);
        lines.push(`DTSTART${entry.start ? '' : ';VALUE=DATE'}:${startTime}`);
        lines.push(`DTEND${entry.start ? '' : ';VALUE=DATE'}:${endTime}`);
        
        // Summary (Titel)
        const typeLabel = {
            'work': '⏱️ Arbeit',
            'school': '🎓 Schule',
            'vacation': '🏖️ Urlaub',
            'gleittag': '⚡ Gleittag',
            'sick': '🤒 Krankheit',
            'holiday': '🎉 Feiertag'
        }[entry.type] || entry.type;

        lines.push(`SUMMARY:${escapeICalText(typeLabel)} - ${entry.info ? escapeICalText(entry.info) : 'Zeiteintrag'}`);

        // Description mit Details
        let description = '';
        if (entry.worked !== undefined) {
            description += `Gearbeitet: ${(entry.worked / 60).toFixed(1)}h\n`;
        }
        if (entry.expected !== undefined) {
            description += `Erwartet: ${(entry.expected / 60).toFixed(1)}h\n`;
        }
        if (entry.diff !== undefined) {
            description += `Saldo: ${(entry.diff / 60).toFixed(1)}h\n`;
        }
        if (entry.info) {
            description += `Notiz: ${entry.info}\n`;
        }

        if (description) {
            lines.push(`DESCRIPTION:${escapeICalText(description.trim())}`);
        }

        // Location (falls vorhanden)
        if (entry.location) {
            lines.push(`LOCATION:${escapeICalText(entry.location)}`);
        }

        // Color (für Kalender-Apps die Farben unterstützen)
        const _icalPrimary = data.settings.theme || '#a855f7';
        const colorMap = {
            'work': _icalPrimary,
            'school': '#3b82f6',
            'vacation': '#10b981',
            'gleittag': '#f59e0b',
            'sick': '#ef4444',
            'holiday': '#f59e0b'
        };
        lines.push(`COLOR:${colorMap[entry.type] || _icalPrimary}`);

        // Status
        lines.push('STATUS:CONFIRMED');

        // Alarm/Reminder (15 Minuten vorher)
        if (includeAlarms && entry.start) {
            lines.push('BEGIN:VALARM');
            lines.push('TRIGGER:-PT15M');
            lines.push('ACTION:DISPLAY');
            lines.push('DESCRIPTION:Zeiteintrag in 15 Minuten');
            lines.push('END:VALARM');
        }

        // Categories
        lines.push(`CATEGORIES:${entry.type}`);

        // Sequence & LastModified
        lines.push('SEQUENCE:0');
        lines.push(`LAST-MODIFIED:${timestamp}`);

        lines.push('END:VEVENT');

        return lines.join('\r\n');
    }

    function formatICalDateTime(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    function formatICalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}${month}${day}`;
    }

    function escapeICalText(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;')
            .replace(/\n/g, '\\n');
    }

    // ===== CUSTOM ENTRY TYPES SYSTEM =====
    // Ermöglicht Benutzer, neue Eintrag-Typen zu erstellen (z.B. Fitness, Training, Meetings)

    const DEFAULT_ENTRY_TYPES = [
        { id: 'work', label: '⏱️ Arbeit', emoji: '⏱️', color: '#a855f7', description: 'Normale Arbeitszeit' },
        { id: 'school', label: '📚 Berufsschule', emoji: '📚', color: '#3b82f6', description: 'Berufsschule / Noten' },
        { id: 'vacation', label: '🏖️ Urlaub', emoji: '🏖️', color: '#10b981', description: 'Urlaubstage' },
        { id: 'gleittag', label: '⚡ Gleittag', emoji: '⚡', color: '#f59e0b', description: 'Gleittag (Überstundenabbau)' },
        { id: 'sick', label: '🤒 Krankheit', emoji: '🤒', color: '#ef4444', description: 'Krankheitstage' },
        { id: 'holiday', label: '🎉 Feiertag', emoji: '🎉', color: '#f59e0b', description: 'Offizielle Feiertage' }
    ];

    function getAllEntryTypes() {
        // Kombiniere Standard-Typen mit benutzerdefinierten
        return [...DEFAULT_ENTRY_TYPES, ...(data.customEntryTypes || [])];
    }

    function getEntryTypeInfo(typeId) {
        const allTypes = getAllEntryTypes();
        return allTypes.find(t => t.id === typeId);
    }

    function createCustomType(label, emoji, color, description) {
        if (!label || !emoji || !color) {
            showCustomMessage('❌ Fehler', 'Label, Emoji und Farbe sind erforderlich', 'error');
            return false;
        }

        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newType = {
            id: id,
            label: `${emoji} ${label}`,
            emoji: emoji,
            color: color,
            description: description || '',
            createdAt: new Date().toISOString()
        };

        data.customEntryTypes.push(newType);
        saveData();
        showCustomMessage('✅ Eintrag-Typ erstellt', `"${label}" wurde hinzugefügt!`, 'success');
        renderCustomTypesManager();
        return true;
    }

    function editCustomType(id, updates) {
        const idx = data.customEntryTypes.findIndex(t => t.id === id);
        if (idx === -1) return false;

        data.customEntryTypes[idx] = { ...data.customEntryTypes[idx], ...updates };
        saveData();
        showCustomMessage('✅ Eintrag-Typ aktualisiert', 'Änderungen gespeichert!', 'success');
        renderCustomTypesManager();
        return true;
    }

    function deleteCustomType(id) {
        showCustomConfirm(
            '🗑️ Bestätigung',
            'Diesen Eintrag-Typ wirklich löschen? Bestehende Einträge bleiben erhalten.',
            () => {
                const idx = data.customEntryTypes.findIndex(t => t.id === id);
                if (idx === -1) return;

                const deleted = data.customEntryTypes.splice(idx, 1)[0];
                saveData();
                showCustomMessage('✅ Gelöscht', `"${deleted.label}" wurde entfernt!`, 'success');
                renderCustomTypesManager();
            }
        );
    }

    function showCustomTypeModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 2rem;
            min-width: 400px;
            max-width: 500px;
            z-index: 500;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            backdrop-filter: blur(20px);
        `;

        modal.innerHTML = `
            <h3 style="margin:0 0 1.5rem 0; color:var(--primary);">➕ Neuer Eintrag-Typ</h3>
            
            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Label (z.B. "Fitness")</label>
                <input type="text" id="customTypeLabel" class="glass-input" placeholder="z.B. Fitness, Training, Meetings" style="width:100%;">
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Emoji</label>
                <input type="text" id="customTypeEmoji" class="glass-input" placeholder="z.B. 🏋️, 🎓, 🤝" style="width:100%; font-size:2rem; text-align:center; padding:1rem;">
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Farbe</label>
                <input type="color" id="customTypeColor" class="glass-input" style="width:100%; height:50px; border-radius:10px; cursor:pointer;" value="#a855f7">
            </div>

            <div style="margin-bottom:2rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Beschreibung (optional)</label>
                <textarea id="customTypeDesc" class="glass-input" placeholder="z.B. Mein persönliches Fitness-Training" style="width:100%; height:80px; resize:none;"></textarea>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="btn" onclick="this.parentElement.parentElement.remove();" style="background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.4); color:#fff;">Abbrechen</button>
                <button class="btn btn-primary" onclick="
                    const label = document.getElementById('customTypeLabel').value;
                    const emoji = document.getElementById('customTypeEmoji').value;
                    const color = document.getElementById('customTypeColor').value;
                    const desc = document.getElementById('customTypeDesc').value;
                    
                    if (!label || !emoji || !color) {
                        showCustomMessage('❌ Fehler', 'Bitte fülle alle Felder aus!', 'error');
                        return;
                    }
                    
                    createCustomType(label, emoji, color, desc);
                    this.parentElement.parentElement.remove();
                " style="background:var(--primary); padding:10px 20px; border-radius:8px;">➕ Erstellen</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('customTypeLabel').focus();

        // Schließen bei ESC
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }

    function renderCustomTypesManager() {
        const container = document.getElementById('customTypesContainer');
        if (!container) return;

        container.innerHTML = '';

        // Standard Types (Info)
        const stdSection = document.createElement('div');
        stdSection.style.cssText = 'margin-bottom:2rem;';
        stdSection.innerHTML = `
            <h5 style="color:var(--primary); margin-bottom:1rem; font-weight:600;">📌 Standard-Typen (immer verfügbar)</h5>
            <div style="display:grid; gap:0.75rem;">
                ${DEFAULT_ENTRY_TYPES.map(t => `
                    <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border);">
                        <div style="font-size:1.5rem;">${t.emoji}</div>
                        <div style="flex:1;">
                            <div style="font-weight:600;">${t.label}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${t.description}</div>
                        </div>
                        <div style="width:20px; height:20px; background:${t.color}; border-radius:50%; border:1px solid var(--border);"></div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(stdSection);

        // Custom Types
        if (Array.isArray(data.customEntryTypes) && data.customEntryTypes.length > 0) {
            const customSection = document.createElement('div');
            customSection.style.cssText = 'margin-bottom:2rem;';
            customSection.innerHTML = `<h5 style="color:var(--success); margin-bottom:1rem; font-weight:600;">✨ Deine Custom-Typen</h5>`;
            
            data.customEntryTypes.forEach(type => {
                const typeEl = document.createElement('div');
                typeEl.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border); margin-bottom:0.75rem;';
                typeEl.innerHTML = `
                    <div style="font-size:1.5rem;">${type.emoji}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;">${type.label}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${type.description}</div>
                    </div>
                    <div style="width:20px; height:20px; background:${type.color}; border-radius:50%; border:1px solid var(--border);"></div>
                    <button class="btn btn-ghost" onclick="deleteCustomType('${type.id}')" style="padding:6px 12px; font-size:0.85rem;">🗑️ Löschen</button>
                `;
                customSection.appendChild(typeEl);
            });

            container.appendChild(customSection);
        }

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.style.cssText = 'width:100%; padding:12px; background:linear-gradient(135deg, #10b981, #06b6d4); border-radius:10px; font-size:0.95rem; font-weight:600; margin-top:1rem;';
        addBtn.textContent = '➕ Neuer Eintrag-Typ';
        addBtn.onclick = showCustomTypeModal;
        container.appendChild(addBtn);
    }

    function renderCustomFieldsManager() {
        const container = document.getElementById('customFieldsContainer');
        if (!container) return;

        container.innerHTML = '';

        if (data.customFields && data.customFields.length > 0) {
            const fieldsSection = document.createElement('div');
            fieldsSection.style.cssText = 'margin-bottom:1.5rem;';
            
            data.customFields.forEach(field => {
                const typeInfo = getEntryTypeInfo(field.entryType);
                const typeLabel = field.entryType === 'all' ? 'Alle Typen' : (typeInfo?.label || field.entryType);
                
                const fieldEl = document.createElement('div');
                fieldEl.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border); margin-bottom:0.75rem;';
                fieldEl.innerHTML = `
                    <div style="flex:1;">
                        <div style="font-weight:600;">${field.label}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">
                            ${typeLabel} • ${field.type} ${field.required ? '(erforderlich)' : ''}
                        </div>
                    </div>
                    <button class="btn btn-ghost" onclick="deleteCustomField('${field.id}')" style="padding:6px 12px; font-size:0.85rem;">🗑️ Löschen</button>
                `;
                fieldsSection.appendChild(fieldEl);
            });

            container.appendChild(fieldsSection);
        } else {
            const emptyEl = document.createElement('div');
            emptyEl.style.cssText = 'padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.9rem;';
            emptyEl.innerHTML = '📋 Noch keine Custom Fields. Klicke "+ Neues Field" um eins zu erstellen!';
            container.appendChild(emptyEl);
        }

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.style.cssText = 'width:100%; padding:12px; background:linear-gradient(135deg, #3b82f6, #06b6d4); border-radius:10px; font-size:0.95rem; font-weight:600; margin-top:1rem;';
        addBtn.textContent = '➕ Neues Custom Field';
        addBtn.onclick = showCustomFieldModal;
        container.appendChild(addBtn);
    }

    function showCustomFieldModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 2rem;
            min-width: 400px;
            max-width: 500px;
            z-index: 500;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            backdrop-filter: blur(20px);
            max-height: 90vh;
            overflow-y: auto;
        `;

        modal.innerHTML = `
            <h3 style="margin:0 0 1.5rem 0; color:var(--primary);">➕ Neues Custom Field</h3>
            
            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Gilt für Typ</label>
                <select id="fieldType" class="glass-input" style="width:100%;">
                    <option value="all">Alle Typen</option>
                    ${getAllEntryTypes().map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                </select>
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Field Label (z.B. "Projekt")</label>
                <input type="text" id="fieldLabel" class="glass-input" placeholder="z.B. Projekt, Client, Billable" style="width:100%;">
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Field Typ</label>
                <select id="fieldFieldType" class="glass-input" style="width:100%;">
                    <option value="text">Text (kurz)</option>
                    <option value="textarea">Text (lang)</option>
                    <option value="number">Zahl</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox (ja/nein)</option>
                    <option value="date">Datum</option>
                </select>
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="fieldRequired" style="width:18px; height:18px; cursor:pointer;">
                    <span style="color:var(--text-main);">Dieses Field ist erforderlich</span>
                </label>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="btn" onclick="this.parentElement.parentElement.remove();" style="background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.4); color:#fff;">Abbrechen</button>
                <button class="btn btn-primary" onclick="
                    const type = document.getElementById('fieldType').value;
                    const label = document.getElementById('fieldLabel').value;
                    const fieldType = document.getElementById('fieldFieldType').value;
                    const required = document.getElementById('fieldRequired').checked;
                    
                    if (!label || !fieldType) {
                        showCustomMessage('❌ Fehler', 'Label und Typ sind erforderlich!', 'error');
                        return;
                    }
                    
                    createCustomField(type, label, fieldType, required, []);
                    this.parentElement.parentElement.remove();
                " style="background:var(--primary); padding:10px 20px; border-radius:8px;">➕ Erstellen</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('fieldLabel').focus();

        // Schließen bei ESC
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }

    function populateTypeDropdowns() {
        // Utility: Aktualisiere alle Type-Dropdowns mit allen verfügbaren Types (Standard + Custom)
        const allTypes = getAllEntryTypes();
        
        // Finde alle Dropdowns mit Type-Optionen (z.B. in Entry-Form, iCal Filter, etc.)
        const typeSelects = document.querySelectorAll('[data-type-dropdown]');
        
        typeSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '';
            
            allTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.label;
                select.appendChild(option);
            });
            
            // Restore previous value if it still exists
            select.value = currentValue;
        });
    }

    // ===== CUSTOM FIELDS SYSTEM =====
    // Pro Eintrag-Typ können Benutzer custom Fields definieren (z.B. Projekt, Client, Billable)

    function createCustomField(entryType, label, fieldType, required = false, options = []) {
        // fieldType: 'text', 'number', 'dropdown', 'checkbox', 'date'
        if (!entryType || !label || !fieldType) {
            showCustomMessage('❌ Fehler', 'Alle Felder sind erforderlich', 'error');
            return false;
        }

        const id = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newField = {
            id: id,
            entryType: entryType,  // 'work', 'school', or 'all'
            label: label,
            type: fieldType,
            required: required,
            options: options || [],  // For dropdown type
            description: '',
            createdAt: new Date().toISOString()
        };

        data.customFields.push(newField);
        save();
        showCustomMessage('✅ Custom Field erstellt', `"${label}" wurde hinzugefügt!`, 'success');
        return true;
    }

    function deleteCustomField(fieldId) {
        showCustomConfirm(
            '🗑️ Bestätigung',
            'Dieses Custom Field wirklich löschen? Bestehende Daten bleiben erhalten.',
            () => {
                const idx = data.customFields.findIndex(f => f.id === fieldId);
                if (idx === -1) return;

                const deleted = data.customFields.splice(idx, 1)[0];
                save();
                showCustomMessage('✅ Gelöscht', `"${deleted.label}" wurde entfernt!`, 'success');
            }
        );
    }

    function getFieldsForEntryType(entryType) {
        // Gebe alle Fields für einen bestimmten Type zurück (inkl. 'all' Fields)
        return (data.customFields || []).filter(f => f.entryType === 'all' || f.entryType === entryType);
    }

    function validateEntryWithFields(entry, fields) {
        // Validiere ein Entry gegen die Custom Fields Anforderungen
        for (let field of fields) {
            if (field.required && !entry[field.id]) {
                return { valid: false, error: `${field.label} ist erforderlich!` };
            }
        }
        return { valid: true };
    }

    function renderEntryFormWithFields(entryType) {
        // Später: Rendere Entry-Form mit Custom Fields basierend auf entryType
        const fields = getFieldsForEntryType(entryType);
        // TODO: Render HTML für alle Fields
        return fields;
    }

    // ===== WORKFLOW RULES SYSTEM =====
    // Automatisierung: Wenn X, dann Y (z.B. type=work && hours>8 -> require(project))

    function createWorkflowRule(condition, actions) {
        // condition: { entryType, minHours, maxHours, fieldValues }
        // actions: [ { type: 'require'|'show'|'hide'|'auto-fill', field, value } ]
        
        const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const rule = {
            id: id,
            condition: condition,
            actions: actions || [],
            enabled: true,
            createdAt: new Date().toISOString()
        };

        data.workflowRules.push(rule);
        save();
        showCustomMessage('✅ Workflow Rule erstellt', 'Automatisierung hinzugefügt!', 'success');
        return true;
    }

    function deleteWorkflowRule(ruleId) {
        showCustomConfirm(
            '🗑️ Bestätigung',
            'Diese Workflow Rule wirklich löschen?',
            () => {
                const idx = data.workflowRules.findIndex(r => r.id === ruleId);
                if (idx === -1) return;

                data.workflowRules.splice(idx, 1);
                save();
                showCustomMessage('✅ Gelöscht', 'Rule wurde entfernt!', 'success');
            }
        );
    }

    function evaluateRules(entry) {
        // Evaluiere alle Rules für einen Entry und gebe zu applizierende Actions zurück
        const matchedActions = [];

        data.workflowRules.forEach(rule => {
            if (!rule.enabled) return;

            let conditionMet = true;

            // Check entry type condition
            if (rule.condition.entryType && entry.type !== rule.condition.entryType) {
                conditionMet = false;
            }

            // Check min/max hours
            if (rule.condition.minHours && entry.worked < rule.condition.minHours * 60) {
                conditionMet = false;
            }
            if (rule.condition.maxHours && entry.worked > rule.condition.maxHours * 60) {
                conditionMet = false;
            }

            if (conditionMet) {
                matchedActions.push(...rule.actions);
            }
        });

        return matchedActions;
    }

    function applyRuleActions(entry, actions) {
        // Appliziere Rule-Actions auf einen Entry
        actions.forEach(action => {
            switch (action.type) {
                case 'require':
                    // Field wird erforderlich - wird bei Validierung gecheckt
                    entry._requiredFields = entry._requiredFields || [];
                    if (!entry._requiredFields.includes(action.field)) {
                        entry._requiredFields.push(action.field);
                    }
                    break;
                case 'auto-fill':
                    // Auto-fill mit Wert
                    if (!entry[action.field]) {
                        entry[action.field] = action.value;
                    }
                    break;
                case 'show':
                case 'hide':
                    // UI-Logik - wird bei Rendering gecheckt
                    entry._fieldVisibility = entry._fieldVisibility || {};
                    entry._fieldVisibility[action.field] = (action.type === 'show');
                    break;
            }
        });
        return entry;
    }

    // ===== SAVING & PERSISTENCE =====
    // Alias für save() - wird in Custom Type Funktionen verwendet
    const saveData = save;

    // ===== UNTIS INTEGRATION SYSTEM =====
    // Importiere Stundenplan von Untis (WebUntis Export, JSON/CSV Format)
    
    function initializeUntisIntegration() {
        // Initialisiere Untis Daten in der data struktur
        if (!data.untis) {
            data.untis = {
                school: '',
                username: '',
                timetable: [],
                subjects: [],
                teachers: [],
                rooms: [],
                syncedAt: null,
                autoSync: false,
                syncInterval: 3600 // sekunden
            };
            save();
        }
    }

    function showUntisImportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(3,3,5,0.8);
            backdrop-filter: blur(10px);
            z-index: 500;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(13,11,26,0.95) 0%, rgba(6,5,16,0.95) 100%); border: 1px solid rgba(var(--primary-rgb),0.25); border-radius: 20px; width: 95%; max-width: 500px; padding: 2rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5); position: relative; overflow: hidden;">
                <!-- Gradient orbs background -->
                <div style="position: absolute; top: -30%; right: -20%; width: 250px; height: 250px; background: radial-gradient(circle, rgba(var(--primary-rgb),0.08), transparent); border-radius: 50%; pointer-events: none;"></div>
                <div style="position: absolute; bottom: -20%; left: -15%; width: 200px; height: 200px; background: radial-gradient(circle, rgba(6,182,212,0.07), transparent); border-radius: 50%; pointer-events: none;"></div>

                <div style="position: relative; z-index: 1;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                        <div>
                            <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">📚 Untis Stundenplan</h2>
                            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 0.9rem;">Dein Schul-Stundenplan</p>
                        </div>
                        <button onclick="this.closest('.modal-overlay').remove();" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); font-size: 1.5rem; color: rgba(255,255,255,0.6); cursor: pointer; padding: 6px; width: 40px; height: 40px; border-radius: 12px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='rgba(255,255,255,0.12)'; this.style.color='#fff'; this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='rgba(255,255,255,0.6)'; this.style.borderColor='rgba(255,255,255,0.12)'">×</button>
                    </div>

                    <!-- Main Content Card -->
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; text-align: center;">
                        <!-- Large Icon -->
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🔗</div>

                        <!-- Title -->
                        <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 1.2rem; font-weight: 700;">Öffentlicher Link</h3>

                        <!-- Status Badge -->
                        <div style="display: inline-block; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.5px;">
                            ❌ NICHT VERFÜGBAR
                        </div>

                        <!-- Warning Message -->
                        <div style="background: rgba(239,68,68,0.08); border-left: 3px solid rgba(239,68,68,0.4); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left;">
                            <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 0.9rem; line-height: 1.6;">
                                <strong>⚠️ WebUntis blockiert API-Zugriffe (CORS)</strong><br>
                                Der direkte Datenimport über öffentliche Links ist nicht möglich, da WebUntis Cross-Origin-Anfragen ablehnt.
                            </p>
                        </div>

                        <!-- Info Tips -->
                        <div style="background: linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.06)); border: 2px solid rgba(251,146,60,0.3); border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem; text-align: left;">
                            <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.8); font-size: 0.9rem; font-weight: 700;">🚧 BAUSTELLE</p>
                            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; line-height: 1.6;">
                                Der Entwickler kümmert sich darum, eine bessere Lösung zur Untis-Integration zu finden. Bald wird's hier was Neues geben! 🔧
                            </p>
                        </div>

                        <!-- Action Button -->
                        <button onclick="this.closest('.modal-overlay').remove();" style="width: 100%; padding: 12px 24px; background: rgba(var(--primary-rgb),0.2); border: 1px solid rgba(var(--primary-rgb),0.4); color: #a78bfa; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(var(--primary-rgb),0.3)'; this.style.borderColor='rgba(var(--primary-rgb),0.6)'; this.style.color='#c4b5fd'" onmouseout="this.style.background='rgba(var(--primary-rgb),0.2)'; this.style.borderColor='rgba(var(--primary-rgb),0.4)'; this.style.color='#a78bfa'">
                            Schließen
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // ===== UNTIS STUNDENPLAN FUNKTIONEN (DEPRECATED) =====
    // 🚧 BAUSTELLE: Der Nutzer kümmert sich darum, eine bessere Lösung zu Untis-Integration zu finden!
    // 
    // Folgende Funktionen wurden gelöscht, da eine neue Strategie entwickelt wird:
    // - importUntisFile() - Datei-Import
    // - importUntisPublicLink() - Öffentlicher Link (CORS-blockiert)
    // - parseWebUntisLink() - Link-Parsing
    // - processWebUntisTimetable() - Stundenplan verarbeiten
    // - formatUntisTime() - Zeit-Formatierung
    // - parseUntisCSV() - CSV-Parsing
    // - loadUntisManually() - Manuelle Konfiguration
    // - viewUntisSchedule() - Stundenplan anzeigen
    // - createEntryFromUntis() - Einträge erstellen
    // - createUntisEntriesForToday() - Tägliche Einträge
    // - getTodayName() - Tages-Namen
    // - syncUntisAuto() - Auto-Sync
    //
    // STATUS: Der Modal wird nun nur noch die CORS-Blockierung anzeigen.
    // Neue Lösung wird später implementiert.
    // ========================================================

    // ===== ENCRYPTED BACKUP SYSTEM (KRASS SICHER!) =====
    // AES-256-GCM mit PBKDF2 Key-Derivation, Salts, IVs, Authentifizierung
    
    const ENCRYPTION_VERSION = 1;
    const PBKDF2_ITERATIONS = 600000; // Modern standard (OWASP 2023)
    const AES_KEY_LENGTH = 256;
    const GCM_TAG_LENGTH = 128;
    const SALT_LENGTH = 32;
    const IV_LENGTH = 12;
    
    // Hilfsfunktion: String -> Uint8Array
    function stringToUint8Array(str) {
        return new TextEncoder().encode(str);
    }
    
    // Hilfsfunktion: Uint8Array -> Base64
    function uint8ArrayToBase64(arr) {
        return btoa(String.fromCharCode.apply(null, arr));
    }
    
    // Hilfsfunktion: Base64 -> Uint8Array
    function base64ToUint8Array(b64) {
        const bstr = atob(b64);
        const arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            arr[i] = bstr.charCodeAt(i);
        }
        return arr;
    }
    
    // Derive Encryption Key from Password using PBKDF2
    async function deriveKeyFromPassword(password, salt) {
        const key = await crypto.subtle.importKey(
            'raw',
            stringToUint8Array(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            key,
            AES_KEY_LENGTH
        );
        
        return crypto.subtle.importKey(
            'raw',
            derivedBits,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    // Encrypt Backup Data
    async function encryptBackupData(jsonData, password) {
        try {
            const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
            const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
            
            const key = await deriveKeyFromPassword(password, salt);
            
            const plaintext = stringToUint8Array(jsonData);
            
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: GCM_TAG_LENGTH
                },
                key,
                plaintext
            );
            
            // Struktur: version(1) + salt(32) + iv(12) + ciphertext + tag
            const encryptedData = {
                v: ENCRYPTION_VERSION,
                salt: uint8ArrayToBase64(salt),
                iv: uint8ArrayToBase64(iv),
                data: uint8ArrayToBase64(new Uint8Array(ciphertext))
            };
            
            return JSON.stringify(encryptedData);
        } catch (e) {
            console.error('Encryption Error:', e);
            throw new Error('Verschlüsselung fehlgeschlagen: ' + e.message);
        }
    }
    
    // Decrypt Backup Data
    async function decryptBackupData(encryptedJson, password) {
        try {
            const encryptedData = JSON.parse(encryptedJson);
            
            if (encryptedData.v !== ENCRYPTION_VERSION) {
                throw new Error('Unbekannte Verschlüsselungsversion');
            }
            
            const salt = base64ToUint8Array(encryptedData.salt);
            const iv = base64ToUint8Array(encryptedData.iv);
            const ciphertext = base64ToUint8Array(encryptedData.data);
            
            const key = await deriveKeyFromPassword(password, salt);
            
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: GCM_TAG_LENGTH
                },
                key,
                ciphertext
            );
            
            return new TextDecoder().decode(plaintext);
        } catch (e) {
            console.error('Decryption Error:', e);
            if (e.message.includes('Decryption failed')) {
                throw new Error('Falsches Passwort oder beschädigte Datei!');
            }
            throw new Error('Entschlüsselung fehlgeschlagen: ' + e.message);
        }
    }
    
    // Export mit Verschlüsselung
    async function exportEncryptedBackup() {
        uEvent('backup-export-encrypted');
        console.log('[DEBUG] exportEncryptedBackup called');
        
        const modal = document.getElementById('encryptedBackupModal');
        if (!modal) {
            console.error('[ERROR] Modal nicht gefunden');
            showCustomMessage('❌ Fehler', 'Modal nicht gefunden', 'error');
            return;
        }
        
        const passwordInput = document.getElementById('encryptPasswordInput');
        const confirmInput = document.getElementById('encryptPasswordConfirmInput');
        
        if (!passwordInput || !confirmInput) {
            console.error('[ERROR] Password inputs nicht gefunden');
            showCustomMessage('❌ Fehler', 'Passwort-Felder nicht gefunden', 'error');
            return;
        }
        
        const password = passwordInput.value.trim();
        const confirmPassword = confirmInput.value.trim();
        
        console.log('[DEBUG] Password validation:', { hasPassword: !!password, match: password === confirmPassword, length: password.length });
        
        // Validierungen
        if (!password) {
            showCustomMessage('⚠️ Passwort erforderlich', 'Bitte ein Passwort eingeben', 'warning');
            return;
        }
        
        if (password !== confirmPassword) {
            showCustomMessage('⚠️ Passwörter stimmen nicht überein', 'Passwort-Bestätigung prüfen', 'warning');
            return;
        }
        
        if (password.length < 8) {
            showCustomMessage('⚠️ Passwort zu kurz', 'Mindestens 8 Zeichen erforderlich', 'warning');
            return;
        }
        
        // Passwort-Stärke prüfen
        const strength = calculatePasswordStrength(password);
        console.log('[DEBUG] Password strength:', strength);
        
        if (strength < 2) {
            showCustomMessage('⚠️ Schwaches Passwort', 'Bitte Großbuchstaben, Zahlen & Symbole verwenden', 'warning');
            return;
        }
        
        // Loading-State
        const exportBtn = document.getElementById('encryptExportBtn');
        const originalText = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = '🔒 Verschlüssele...';
        
        try {
            console.log('[DEBUG] Starting encryption...');
            console.log('[DEBUG] Data object size:', JSON.stringify(data).length, 'bytes');
            
            const jsonData = JSON.stringify(collectFullBackup());
            const encryptedData = await encryptBackupData(jsonData, password);
            
            console.log('[DEBUG] Encryption successful, encrypted size:', encryptedData.length, 'bytes');
            
            // Download
            const a = document.createElement('a');
            const blob = new Blob([encryptedData], {type:'application/json'});
            a.href = URL.createObjectURL(blob);
            a.download = 'time_pro_encrypted_backup_' + new Date().toISOString().split('T')[0] + '.encrypted.json';
            
            console.log('[DEBUG] Triggering download:', a.download);
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            
            console.log('[DEBUG] Download triggered successfully');
            
            // Cleanup
            passwordInput.value = '';
            confirmInput.value = '';
            modal.classList.remove('active');
            
            showCustomMessage('✅ Sicher verschlüsselt', 'Backup wurde mit AES-256-GCM verschlüsselt & heruntergeladen', 'success');
            try { localStorage.setItem('tt_last_export', new Date().toISOString()); } catch(e) {}
        } catch (e) {
            console.error('[ERROR] Export failed:', e);
            showCustomMessage('❌ Verschlüsselung fehlgeschlagen', e.message, 'error');
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = originalText;
        }
    }
    
    // Import & Decrypt
    async function importEncryptedBackup(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const modal = document.getElementById('importEncryptedBackupModal');
        if (!modal) return;
        
        modal.classList.add('active');
        document.getElementById('importEncryptedFileName').textContent = file.name;
        document.getElementById('importEncryptedFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
        
        // Speichere Datei für später
        window.pendingEncryptedBackupFile = file;
    }
    
    // Finalize Import mit Passwort
    async function finalizeImportEncryptedBackup() {
        const file = window.pendingEncryptedBackupFile;
        if (!file) {
            showCustomMessage('❌ Fehler', 'Keine Datei ausgewählt', 'error');
            return;
        }
        
        const passwordInput = document.getElementById('importEncryptPasswordInput');
        const password = passwordInput.value.trim();
        
        if (!password) {
            showCustomMessage('⚠️ Passwort erforderlich', 'Bitte Passwort eingeben', 'warning');
            return;
        }
        
        const modal = document.getElementById('importEncryptedBackupModal');
        const decryptBtn = document.getElementById('importEncryptDecryptBtn');
        const originalText = decryptBtn.textContent;
        decryptBtn.disabled = true;
        decryptBtn.textContent = '🔓 Entschlüssele...';
        
        try {
            const encryptedJson = await file.text();
            const plainJson = await decryptBackupData(encryptedJson, password);
            const parsed = JSON.parse(plainJson);
            
            // Unterstützt v2 (full) und v1 (legacy)
            restoreFullBackup(parsed);
            
            passwordInput.value = '';
            modal.classList.remove('active');
            window.pendingEncryptedBackupFile = null;
            
            showCustomMessage('✅ Daten wiederhergestellt', 
                parsed._backupVersion === 2 
                    ? `Vollständiges verschlüsseltes Backup (${parsed._keyCount || '?'} Keys) wiederhergestellt. Seite wird aktualisiert...`
                    : 'Legacy-Backup entschlüsselt & importiert. Seite wird aktualisiert...', 
                'success');
            setTimeout(() => location.reload(), 1500);
        } catch (e) {
            showCustomMessage('❌ Import fehlgeschlagen', e.message, 'error');
        } finally {
            decryptBtn.disabled = false;
            decryptBtn.textContent = originalText;
        }
    }
    
    // Passwort-Stärke berechnen
    function calculatePasswordStrength(password) {
        let strength = 0;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        if (password.length >= 12) strength++;
        return strength;
    }
    
    // Passwort-Stärke-Indikator
    function updatePasswordStrengthIndicator(inputId, indicatorId) {
        const input = document.getElementById(inputId);
        const indicator = document.getElementById(indicatorId);
        if (!input || !indicator) return;
        
        const strength = calculatePasswordStrength(input.value);
        const strengthLevels = [
            { label: 'Sehr schwach', color: '#ef4444', width: '20%' },
            { label: 'Schwach', color: '#f97316', width: '40%' },
            { label: 'Mittel', color: '#f59e0b', width: '60%' },
            { label: 'Stark', color: '#10b981', width: '80%' },
            { label: 'Sehr stark', color: '#06b6d4', width: '100%' }
        ];
        
        const level = strengthLevels[Math.min(strength, strengthLevels.length - 1)];
        indicator.style.width = level.width;
        indicator.style.backgroundColor = level.color;
        
        const labelEl = document.getElementById(indicatorId + 'Label');
        if (labelEl) labelEl.textContent = level.label;
    }
    
    // ========== FULL LOCALSTORAGE BACKUP HELPERS ==========
    // Sammelt ALLE relevanten localStorage-Schlüssel für ein vollständiges Backup
    function collectFullBackup() {
        const snapshot = {};
        const skipPrefixes = ['p2p_deviceId', 'p2p_lastSync'];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // P2P-Signaling ist transient → nicht sichern
            if (skipPrefixes.some(p => key.startsWith(p))) continue;
            try { snapshot[key] = localStorage.getItem(key); } catch(e) {}
        }
        return {
            _backupVersion: 2,
            _created: new Date().toISOString(),
            _appName: 'MyWorkLog',
            _keyCount: Object.keys(snapshot).length,
            _localStorage: snapshot
        };
    }

    // Stellt ein Backup wieder her – unterstützt v2 (full) und v1 (legacy data-only)
    function restoreFullBackup(parsed) {
        if (parsed._backupVersion === 2 && parsed._localStorage) {
            // V2: Komplettes localStorage-Backup
            // Alle bestehenden App-Keys entfernen
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) keysToRemove.push(localStorage.key(i));
            keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
            // Alle gesicherten Keys wiederherstellen
            for (const [key, value] of Object.entries(parsed._localStorage)) {
                try { localStorage.setItem(key, value); } catch(e) {}
            }
            // Aktuelles data-Objekt aus wiederhergestelltem Storage laden
            const restored = localStorage.getItem('tg_pro_data');
            if (restored) data = JSON.parse(restored);
        } else if (parsed.entries && parsed.settings) {
            // V1 Legacy: nur data-Objekt
            data = parsed;
            save();
        } else {
            throw new Error('Ungültige Backup-Datei: weder v2-Format noch gültiges Legacy-Format erkannt.');
        }
        // Import = gültiges Backup vorhanden → Reminder zurücksetzen
        try {
            localStorage.setItem('tt_last_export', new Date().toISOString());
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem('tt_export_reminder_shown_' + today, '1');
        } catch(e) {}
    }
    function updateShortcutsPanelVisibility() {
        const panel = document.getElementById('shortcutsPanel');
        const isEnabled = data.settings.shortcutsEnabled !== false;
        
        if (panel) {
            if (isEnabled) {
                panel.style.display = 'block';
                panel.style.opacity = '1';
                panel.style.pointerEvents = 'auto';
                // Render shortcuts wenn Panel sichtbar wird
                renderShortcutsPanel();
            } else {
                panel.style.display = 'none';
                panel.style.opacity = '0';
                panel.style.pointerEvents = 'none';
            }
        }
    }
    
    // ============================================
    // SHORTCUT MANAGEMENT FUNCTIONS
    // ============================================
    
    function renderShortcutsPanel() {
        if (!shortcutManager) return;
        
        const container = document.getElementById('shortcutsContainer');
        const shortcuts = shortcutManager.shortcuts;
        
        // Gruppiere nach Kategorien
        const categories = {};
        for (const [id, sc] of Object.entries(shortcuts)) {
            const cat = sc.category || 'Sonstiges';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ id, shortcut: sc });
        }
        
        // Render jede Kategorie
        let html = '';
        for (const [category, items] of Object.entries(categories).sort()) {
            html += `<div style="margin-bottom:2rem;">
                <h5 style="color:var(--primary); margin:0 0 12px 0; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.5px;">${category}</h5>
                <div style="display:grid; gap:8px;">`;
            
            for (const { id, shortcut } of items) {
                const displayKeys = shortcutManager.getShortcutDisplay(shortcut.keys);
                html += `
                    <div class="shortcut-item" style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:10px; padding:12px 15px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:0.2s;" data-shortcut-id="${id}">
                        <div style="flex:1;">
                            <div style="color:var(--text-main); font-weight:500; font-size:0.95rem;">${shortcut.name}</div>
                            <div style="color:var(--text-muted); font-size:0.8rem; margin-top:4px;">${shortcut.action}${shortcut.args ? ' (' + shortcut.args.join(', ') + ')' : ''}</div>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <div class="shortcut-keys" style="background:rgba(var(--primary-rgb),0.15); border:1px solid rgba(var(--primary-rgb),0.3); border-radius:8px; padding:8px 12px; font-family:var(--font-mono); font-size:0.85rem; font-weight:600; color:var(--primary); white-space:nowrap; cursor:pointer;" onclick="editShortcut('${id}', event)">
                                ${displayKeys}
                            </div>
                            <div style="font-size:0.72rem; color:var(--text-muted); padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.03);">${shortcut.allowInInput ? 'In Eingabefeldern' : 'nicht in Eingaben'}</div>
                        </div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
        }
        
        container.innerHTML = html;
        
        // Prüfe auf Konflikte
        const conflicts = shortcutManager.checkConflicts();
        const warningEl = document.getElementById('shortcutConflictWarning');
        if (conflicts.length > 0) {
            warningEl.style.display = 'block';
            const conflictDesc = conflicts.map(c => {
                const sc1 = shortcuts[c.shortcuts[0]];
                const sc2 = shortcuts[c.shortcuts[1]];
                return `"${sc1.name}" und "${sc2.name}"`;
            }).join(', ');
            document.getElementById('conflictMessage').textContent = `Es gibt Konflikte zwischen: ${conflictDesc}`;
        } else {
            warningEl.style.display = 'none';
        }
    }
    
    function editShortcut(id, event) {
        event.stopPropagation();
        
        if (!shortcutManager) return;
        const shortcut = shortcutManager.shortcuts[id];
        if (!shortcut) return;
        
        // Modal für Shortcut-Bearbeitung
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const box = document.createElement('div');
        box.style.cssText = `
            background: var(--bg-glass);
            backdrop-filter: blur(24px);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
        `;
        
        const currentDisplay = shortcutManager.getShortcutDisplay(shortcut.keys);
        
        box.innerHTML = `
            <h3 style="color:var(--primary); margin:0 0 1rem 0;">${shortcut.name}</h3>
            <p style="color:var(--text-muted); margin:0 0 1.5rem 0; font-size:0.9rem;">Aktuelle Tastenkombination: <strong>${currentDisplay}</strong></p>
            
            <div style="background:rgba(var(--primary-rgb),0.1); border:1px solid rgba(var(--primary-rgb),0.3); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem; text-align:center; min-height:80px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:8px;">Drücke die gewünschte Tastenkombination:</div>
                <div id="recordedKeys" style="color:var(--primary); font-size:1.3rem; font-weight:600; font-family:var(--font-mono); min-height:30px;">...</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; color:var(--text-main);">
                    <input type="checkbox" id="allowInInputCheckbox" style="width:16px; height:16px;" ${shortcut.allowInInput ? 'checked' : ''} />
                    Shortcut in Eingabefeldern erlauben
                </label>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text-main); padding:10px; border-radius:8px; cursor:pointer; font-weight:500;">Abbrechen</button>
                <button onclick="saveEditedShortcut('${id}')" style="background:var(--primary); border:none; color:#fff; padding:10px; border-radius:8px; cursor:pointer; font-weight:500;">Speichern</button>
            </div>
        `;
        
        modal.appendChild(box);
        document.body.appendChild(modal);
        
        // Shortcut Recorder
        let recordedKeys = [];
        window.currentShortcutId = id;
        window.recordedKeys = recordedKeys;
        
        const keydownHandler = (e) => {
            e.preventDefault();
            recordedKeys.length = 0; // clear existing array to keep reference
            
            if (e.ctrlKey) recordedKeys.push('ctrl');
            if (e.altKey) recordedKeys.push('alt');
            if (e.shiftKey) recordedKeys.push('shift');
            
            const specialKeys = {
                ' ': 'space', 'Delete': 'delete', 'Enter': 'enter', 'Escape': 'escape', 'Tab': 'tab'
            };
            const lastKey = specialKeys[e.key] || e.key.toLowerCase();
            if (lastKey !== 'ctrl' && lastKey !== 'alt' && lastKey !== 'shift') {
                recordedKeys.push(lastKey);
            }
            
            if (recordedKeys.length > 0) {
                const display = shortcutManager.getShortcutDisplay(recordedKeys);
                document.getElementById('recordedKeys').textContent = display;
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
        window.currentKeydownHandler = keydownHandler;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.removeEventListener('keydown', keydownHandler);
                modal.remove();
            }
        });
    }
    
    function saveEditedShortcut(id) {
        let recordedKeys = window.recordedKeys;
        if (!recordedKeys || recordedKeys.length === 0) {
            // Wenn keine neue Kombination eingegeben wurde, behalte die bestehende
            if (shortcutManager && shortcutManager.shortcuts[id] && Array.isArray(shortcutManager.shortcuts[id].keys)) {
                recordedKeys = shortcutManager.shortcuts[id].keys;
            } else {
                alert('Bitte drücke eine Tastenkombination');
                return;
            }
        }
        
        // Entferne Keydown Listener
        if (window.currentKeydownHandler) {
            document.removeEventListener('keydown', window.currentKeydownHandler);
        }
        
        // Speichere den neuen Shortcut
        const result = shortcutManager.updateShortcut(id, recordedKeys);

        // Speichere auch die "allowInInput" Einstellung aus dem Modal
        try {
            const chk = document.getElementById('allowInInputCheckbox');
            if (chk && shortcutManager && shortcutManager.shortcuts[id]) {
                shortcutManager.shortcuts[id].allowInInput = !!chk.checked;
                shortcutManager.saveShortcuts();
            }
        } catch (e) { console.warn('Fehler beim Speichern von allowInInput', e); }
        
        if (result.conflicts && result.conflicts.length > 0) {
            alert('⚠️ Warnung: Diese Tastenkombination ist bereits belegt!');
        }
        
        // Schließe Modal
        const modal = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
        if (modal) modal.remove();
        
        // Aktualisiere Panel
        renderShortcutsPanel();
    }
    
    function saveAllShortcuts() {
        if (shortcutManager) {
            shortcutManager.saveShortcuts();
            showCustomMessage('✅ Erfolg', 'Alle Shortcuts wurden gespeichert.', 'success');
        }
    }
    
    function resetShortcutsToDefaults() {
        if (confirm('⚠️ Alle Shortcuts auf Standard zurücksetzen?')) {
            if (shortcutManager) {
                shortcutManager.resetToDefaults();
                renderShortcutsPanel();
                showCustomMessage('✅ Erfolg', 'Shortcuts wurden zurückgesetzt.', 'success');
            }
        }
    }
    
    // ============================================
    
    
    function switchSettingsTab(tabName) {
        uPageView('/app/settings/' + tabName, 'Settings – ' + tabName);
        // Alle Tab-Contents verstecken
        document.querySelectorAll('.settings-tab-content').forEach(el => el.style.display = 'none');
        // Alle Tab-Buttons deaktivieren
        document.querySelectorAll('.settings-tab').forEach(el => el.classList.remove('active'));
        
        // Aktiven Tab zeigen
        const contentEl = document.getElementById('settings-tab-' + tabName);
        if (contentEl) {
            contentEl.style.display = 'block';
        }
        
        // Aktiven Button markieren
        event.target.classList.add('active');
        
        // Spezielle Rendering für bestimmte Tabs
        if (tabName === 'shortcuts') {
            renderShortcutsPanel();
        }
        if (tabName === 'custom') {
            renderCustomTypesManager();
        }
    }
    
    // Lightbox Modal für Grafiken (optimiert für Performance)
    function openGraphicModal(imageSrc, imageTitle) {
        // Konvertiere PNG zu WebP wenn verfügbar
        const webpSrc = imageSrc.replace(/\.png$/i, '.webp');
        const pngSrc = imageSrc;
        
        const modal = document.createElement('div');
        modal.id = 'graphicModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(3, 3, 5, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="position: relative; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column;">
                <button onclick="document.getElementById('graphicModal').remove()" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: var(--text-main); font-size: 2rem; cursor: pointer; padding: 0;">&times;</button>
                <picture>
                    <source srcset="${webpSrc}" type="image/webp">
                    <img src="${pngSrc}" alt="${imageTitle}" decoding="async" style="max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 12px; border: 1px solid var(--border);">
                </picture>
                <h3 style="color: var(--primary); text-align: center; margin-top: 1rem; margin-bottom: 0;">${imageTitle}</h3>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Schließen bei Klick außerhalb des Bildes
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // ESC zum Schließen
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }
    // ===== Account / LocalStorage Löschung (Danger Zone) =====
    function clearAppLocalData() {
        // Vollständiges Leeren des LocalStorage (alle keys)
        try {
            localStorage.clear();
        } catch (e) {
            console.error('localStorage.clear() failed', e);
            // Fallback: iterative removal
            Object.keys(localStorage).forEach(k => localStorage.removeItem(k));
        }
    }

    function confirmAndClearLocalData() {
        // First confirmation
        const ok = confirm('Achtung — alle lokalen Daten werden gelöscht. Diese Aktion ist unwiderruflich. Fortfahren?');
        if (!ok) return;

        // Second explicit confirmation: require the user to type LÖSCHEN
        const txt = prompt('Gib zur Bestätigung LÖSCHEN ein (Großschreibung erforderlich):');
        if (txt !== 'LÖSCHEN') {
            showCustomMessage('Abgebrochen', 'Löschvorgang wurde abgebrochen. Die Eingabe stimmte nicht überein.', 'info');
            return;
        }

        // perform deletion
        try {
            clearAppLocalData();
            showCustomMessage('✅ Lokal gelöscht', 'Alle lokalen App-Daten wurden entfernt. Die Seite wird neu geladen.', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (e) {
            console.error('clear local data error', e);
            showCustomMessage('❌ Fehler', 'Beim Löschen der lokalen Daten ist ein Fehler aufgetreten.', 'error');
        }
    }
    
    /* ===== Backups helper functions (for debugging & restore) ===== */
    function renderBackupsList() {
        const container = document.getElementById('backupsList');
        const container2 = document.getElementById('recoveryBackupsList');
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]').slice().reverse();

        // Update stat cards
        const countEl = document.getElementById('recoveryBackupCount');
        const lastEl = document.getElementById('recoveryLastBackup');
        const entryEl = document.getElementById('recoveryEntryCount');
        const badgeEl = document.getElementById('recoveryBadgeCount');
        if (countEl) countEl.textContent = backups.length;
        if (badgeEl) badgeEl.textContent = backups.length;
        if (lastEl) {
            if (backups.length > 0) {
                const d = new Date(backups[0].ts);
                lastEl.textContent = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
            } else {
                lastEl.textContent = '—';
            }
        }
        if (entryEl) {
            const total = (data && data.entries) ? data.entries.length : 0;
            entryEl.textContent = total;
        }

        if(backups.length === 0) {
            const emptyHtml = `<div style="text-align:center; padding:28px 16px; color:rgba(255,255,255,0.35);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3; margin-bottom:8px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <div style="font-size:0.85rem; font-weight:500;">Keine Backups vorhanden</div>
                <div style="font-size:0.72rem; margin-top:4px; opacity:0.6;">Backups werden automatisch erstellt</div>
            </div>`;
            if(container) container.innerHTML = emptyHtml;
            if(container2) container2.innerHTML = emptyHtml;
            return;
        }

        // Legacy list for old backupsList container
        const legacyHtml = backups.map(b => {
            const dt = new Date(b.ts).toLocaleString();
            return `<div style="display:flex; gap:8px; align-items:center; justify-content:space-between; padding:6px 8px; border-radius:8px; background:rgba(255,255,255,0.02); margin-bottom:8px;">
                        <div style="flex:1; font-size:0.9rem; color:var(--text-main);">${dt}</div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn" onclick="restoreBackup(${b.ts})">↺ Restore</button>
                            <button class="btn" onclick="mergeBackup(${b.ts})">🔀 Merge</button>
                            <button class="btn btn-secondary" onclick="downloadBackup(${b.ts})">⬇️ JSON</button>
                        </div>
                    </div>`;
        }).join('');
        if(container) container.innerHTML = legacyHtml;

        // Modern card layout for recovery modal
        const modernHtml = backups.map(b => {
            const dt = new Date(b.ts);
            const dateStr = dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const entries = (b.data && b.data.entries) ? b.data.entries.length : '?';
            return `<div class="recovery-backup-item">
                <div class="recovery-backup-dot"></div>
                <div class="recovery-backup-date">${dateStr} <span style="color:rgba(255,255,255,0.35); font-weight:400;">${timeStr}</span> <span style="font-size:0.7rem; color:rgba(var(--primary-rgb),0.7); margin-left:4px;">${entries} Einträge</span></div>
                <div class="recovery-backup-actions">
                    <button class="recovery-backup-btn restore" onclick="restoreBackup(${b.ts})" title="Wiederherstellen">↺ Restore</button>
                    <button class="recovery-backup-btn merge" onclick="mergeBackup(${b.ts})" title="Non-destructive Merge">⇄ Merge</button>
                    <button class="recovery-backup-btn" onclick="downloadBackup(${b.ts})" title="Als JSON herunterladen">↓ JSON</button>
                </div>
            </div>`;
        }).join('');
        if(container2) container2.innerHTML = modernHtml;
    }

    function restoreBackup(ts) {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        const b = backups.find(x => x.ts === ts);
        if(!b) return showCustomMessage('❌ Fehler', 'Backup nicht gefunden.', 'error');
        localStorage.setItem('tg_pro_data', JSON.stringify(b.data));
        localStorage.setItem('tg_last_save', b.ts);
        showCustomMessage('✅ Wiederhergestellt', 'Backup wurde auf diese Sitzung angewendet. Die Seite wird neu geladen.', 'success');
        setTimeout(() => location.reload(), 800);
    }

    function mergeBackup(ts) {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        const b = backups.find(x => x.ts === ts);
        if(!b) return showCustomMessage('❌ Fehler', 'Backup nicht gefunden.', 'error');

        const incoming = b.data.entries || [];
        let added = 0;
        incoming.forEach(entry => {
            if(!data.entries.some(e => e.id === entry.id)) {
                data.entries.push(entry);
                added++;
            }
        });
        if(added > 0) {
            data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
            save();
            renderLists();
            showCustomMessage('✅ Merge abgeschlossen', `${added} Einträge hinzugefügt.`, 'success');
        } else {
            showCustomMessage('ℹ️ Kein Merge nötig', 'Alle Einträge waren bereits vorhanden.', 'info');
        }
    }

    function openRecoveryModal() {
        uEvent('recovery-modal-open');
        const modal = document.getElementById('recoveryModal');
        if(!modal) return;
        modal.classList.add('active');
        renderBackupsList();
        initRecoveryDragDrop();
    }

    function closeRecoveryModal() {
        const modal = document.getElementById('recoveryModal');
        if(!modal) return;
        modal.classList.remove('active');
    }

    // Drag & Drop for Recovery import zone
    function initRecoveryDragDrop() {
        const zone = document.getElementById('recoveryDropZone');
        if (!zone || zone._dragInited) return;
        zone._dragInited = true;
        ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => {
            e.preventDefault(); e.stopPropagation();
            zone.classList.add('drag-over');
        }));
        ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => {
            e.preventDefault(); e.stopPropagation();
            zone.classList.remove('drag-over');
        }));
        zone.addEventListener('drop', e => {
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file && file.name.endsWith('.json')) {
                // Reuse existing import handler
                const fakeEvent = { target: { files: [file] } };
                handleRecoveryImport(fakeEvent);
            } else {
                showCustomMessage('❌ Fehler', 'Bitte nur .json Dateien.', 'error');
            }
        });
    }

    // File import handlers for Recovery modal
    function handleRecoveryImport(event) {
        const file = event.target.files && event.target.files[0];
        if(!file) return showCustomMessage('❌ Fehler', 'Keine Datei ausgewählt.', 'error');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                window.pendingRecoveryImport = parsed;
                const actionsEl = document.getElementById('recoveryImportActions');
                const infoEl = document.getElementById('recoveryImportInfo');
                if (parsed._backupVersion === 2 && parsed._localStorage) {
                    const count = parsed._localStorage['tg_pro_data'] ? (JSON.parse(parsed._localStorage['tg_pro_data']).entries || []).length : 0;
                    if (actionsEl) actionsEl.style.display = 'flex';
                    if (infoEl) infoEl.textContent = `V2-Backup · ${parsed._keyCount} Keys · ${count} Einträge`;
                    showCustomMessage('📥 Full-Backup bereit', `V2-Backup vom ${parsed._created?.split('T')[0] || '?'} mit ${parsed._keyCount} Keys & ${count} Einträgen. Klicke 'Import & Apply'.`, 'success');
                } else {
                    const count = (parsed.entries || []).length;
                    if (actionsEl) actionsEl.style.display = 'flex';
                    if (infoEl) infoEl.textContent = `Legacy-Import · ${count} Einträge`;
                    showCustomMessage('📥 Legacy-Import bereit', `${count} Einträge geladen. Klicke 'Import & Apply' um anzuwenden.`, 'success');
                }
            } catch (err) {
                console.error('Import parse error', err);
                showCustomMessage('❌ Fehler', 'Ungültiges JSON.', 'error');
                window.pendingRecoveryImport = null;
            }
        };
        reader.readAsText(file);
    }

    function finalizeRecoveryImport() {
        if(!window.pendingRecoveryImport) return showCustomMessage('ℹ️ Kein Import', 'Bitte zuerst eine Datei auswählen (Import Backup).', 'info');
        try {
            restoreFullBackup(window.pendingRecoveryImport);
            showCustomMessage('✅ Import angewendet', 'Backup wiederhergestellt. Die Seite lädt neu.', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (e) {
            console.error('Finalize import failed', e);
            showCustomMessage('❌ Fehler', 'Import fehlgeschlagen: ' + e.message, 'error');
        }
    }

    function downloadBackup(ts) {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        const b = backups.find(x => x.ts === ts);
        if(!b) return showCustomMessage('❌ Fehler', 'Backup nicht gefunden.', 'error');
        const blob = new Blob([JSON.stringify(b.data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tg_pro_data_backup_${ts}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }

    function downloadAllBackups() {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        if(backups.length === 0) return showCustomMessage('ℹ️ Keine Backups', 'Es wurden noch keine Backups erstellt.', 'info');
        const blob = new Blob([JSON.stringify(backups, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tg_pro_data_backups_${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }

    function clearOldBackups() {
        if(!confirm('Alle lokalen Backups löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
        localStorage.removeItem('tg_pro_data_backups');
        renderBackupsList();
        showCustomMessage('🧹 Gelöscht', 'Alle Backups wurden entfernt.', 'success');
    }

    // Load data from tg_pro_data in localStorage and apply to current session
    function loadLocalData() {
        const raw = localStorage.getItem('tg_pro_data');
        if(!raw) return showCustomMessage('ℹ️ Keine Daten', 'Kein `tg_pro_data` im localStorage gefunden.', 'info');

        if(!confirm('Daten aus localStorage laden? Aktuelle Sitzung wird überschrieben.')) return;

        try {
            const parsed = JSON.parse(raw);
            if(!parsed || typeof parsed !== 'object') throw new Error('Ungültiges Format');

            // Apply defaults similar to startup rehydration
            applyDataDefaults(parsed);

            // Replace runtime data
            data = parsed;
            // Recompute any derived values
            data.entries = data.entries || [];
            data.trash = data.trash || [];
            data.settings = data.settings || {};

            // Ensure order and indices
            data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));

            // Refresh UI
            updateUI();
            renderLists();
            try { renderSidebarNav(); } catch(e) {}
            try { renderWidgetManager(); } catch(e) {}
            try { enableWidgetDragDrop(); applyWidgetLayout(); } catch(e) {}
            try { renderPerformanceView(calculatePerformanceData(), calculateDeepPerformanceData()); } catch(e) {}
            try { if (document.getElementById('view-history').classList.contains('active')) renderHistoryView(); } catch(e) {}
            try { if (document.getElementById('view-goals').classList.contains('active')) renderGoalsView(); } catch(e) {}

            showCustomMessage('✅ Geladen', 'Daten aus localStorage wurden geladen und angezeigt.', 'success');
        } catch (e) {
            console.error('Load local data failed', e);
            showCustomMessage('❌ Fehler', 'Fehler beim Laden der Daten. Siehe Konsole.', 'error');
        }
    }

    function applyDataDefaults(d) {
        if(!d.settings) d.settings = {};
        if(!Array.isArray(d.settings.hours)) d.settings.hours = [0,8.75,8.75,8.75,8.75,4.5,0];
        if(!d.settings.break) d.settings.break = {thresh:6, min:[0, 15, 30, 30, 30, 30, 0]};
        if(!Array.isArray(d.trash)) d.trash = [];
        if (typeof d.settings.trashAutoEmptyDays === 'undefined') d.settings.trashAutoEmptyDays = 30;
        if(!Array.isArray(d.settings.break.min)) {
            const oldBreakMin = d.settings.break.min || 30;
            d.settings.break.min = [0, oldBreakMin, oldBreakMin, oldBreakMin, oldBreakMin, 15, 0];
        }
        if(!d.settings.vacation) d.settings.vacation = {total:30, used:0, usedManual:0};
        if(!Array.isArray(d.settings.projects)) d.settings.projects = [];
        if(!d.settings.ihk) d.settings.ihk = {start: '', end: '', exam_zwischen: '', note_zwischen: '', note_abschluss: ''};
        if(!d.settings.school) d.settings.school = { grades: { 'Kernprozesse': [], 'Wirtschaftslehre': [], 'IT-Systeme': [], 'Deutsch/Kommunikation': [] } };
        if(!d.settings.goals) d.settings.goals = [];
        if(!d.settings.prognosePlan) d.settings.prognosePlan = {};
        if (typeof d.settings.shortcutsEnabled === 'undefined') d.settings.shortcutsEnabled = true;
        if(!Array.isArray(d.entries)) d.entries = [];
        if(!Array.isArray(d.customEntryTypes)) d.customEntryTypes = [];
        if(!Array.isArray(d.customFields)) d.customFields = [];
    }
    function setThemeColor(hex) {
        data.settings.theme = hex;
        applyTheme(hex);
        // Update meta theme-color for the browser (affects address bar color on mobile)
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.content = hex;
        save();
    }
    function applySystemTheme() {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
    }

    // Listen to system changes if user selected 'system'
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener && mq.addEventListener('change', (e) => {
            if (data && data.settings && data.settings.themeMode === 'system') applySystemTheme();
        });
    }

    // --- CUSTOM COLOR PICKER FUNCTIONS (CLEAN & MODERN) ---
    function updateColorFromPicker() {
        const color = document.getElementById('customColorPicker').value;
        document.getElementById('customColorHex').value = color.slice(1).toUpperCase();
        document.getElementById('colorPreview').style.background = color;
        // Sofort anwenden
        setThemeColor(color);
    }

    function updateColorPickerFromHex() {
        let hex = document.getElementById('customColorHex').value.trim();
        
        if (hex.length === 0) return;
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
        
        document.getElementById('customColorPicker').value = hex;
        document.getElementById('colorPreview').style.background = hex;
    }

    function resetColorPicker() {
        const defaultColor = '#a855f7';
        document.getElementById('customColorPicker').value = defaultColor;
        document.getElementById('customColorHex').value = 'A855F7';
        document.getElementById('colorPreview').style.background = defaultColor;
        showCustomMessage('↺ Zurückgesetzt', 'Farbe auf Standard zurückgesetzt.', 'info');
    }

    function applyCustomColor() {
        let hex = document.getElementById('customColorHex').value.trim();
        
        if (!hex) {
            showCustomMessage('❌ Fehler', 'Bitte gib einen Farbcode ein.', 'error');
            return;
        }

        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            showCustomMessage('❌ Ungültig', 'Bitte gib einen gültigen Hex-Code ein (z.B. a855f7).', 'error');
            return;
        }

        setThemeColor(hex);
        showCustomMessage('✅ Gespeichert', `Farbe: ${hex.toUpperCase()}`, 'success');
    }

    // === NEUE FUNKTIONEN: TEAM FEATURES ===

    /**
     * Lädt Team-Settings aus data.settings.team und füllt die UI
     */
    function loadTeamSettings() {
        if (!data.settings.team) {
            data.settings.team = {
                enabled: false,
                name: '',
                teamId: '',
                features: {
                    sharedDashboard: false,
                    notifications: false,
                    timeSheetSync: false,
                    workloadAnalytics: false,
                    teamAlerts: false
                },
                privacy: {
                    profileVisibility: 'private',
                    shareWorkHours: false,
                    shareTimeOff: false
                }
            };
        }

        const team = data.settings.team;
        
        // P2P Sync Settings (nur diese existieren noch)
        const autoSyncEl = document.getElementById('p2pAutoSync');
        const offlineQueueEl = document.getElementById('p2pOfflineQueue');
        const encryptionEl = document.getElementById('p2pEncryption');
        
        if (autoSyncEl) autoSyncEl.checked = team.autoSync !== false;
        if (offlineQueueEl) offlineQueueEl.checked = team.offlineQueue !== false;
        if (encryptionEl) encryptionEl.checked = team.encryption !== false;
    }

    // ========== === P2P WebRTC SYNC SYSTEM v2.0 === ==========
    // Vollständig serverless, 3-Schritt Handshake mit gzip-komprimierten Codes
    // Chunked Transfer, Delta Sync, Heartbeat, Conflict Resolution

    // Global P2P State
    let p2pSync = {
        peer: null,
        role: null, // 'host' | 'client'
        connected: false,
        syncStats: { sent: 0, received: 0, merged: 0 },
        heartbeatInterval: null,
        lastSyncTime: null,
        deviceId: localStorage.getItem('p2p_deviceId') || (() => {
            const id = 'dev_' + crypto.randomUUID().substring(0, 8);
            localStorage.setItem('p2p_deviceId', id);
            return id;
        })()
    };

    // === COMPRESSION UTILITIES ===
    async function p2pCompress(obj) {
        try {
            const json = JSON.stringify(obj);
            const blob = new Blob([json]);
            const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
            const compressed = await new Response(stream).arrayBuffer();
            const bytes = new Uint8Array(compressed);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (e) {
            console.warn('Compression failed, using raw base64:', e);
            return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
        }
    }

    async function p2pDecompress(str) {
        try {
            const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
            const binary = atob(padded);
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            const blob = new Blob([bytes]);
            const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
            const text = await new Response(stream).text();
            return JSON.parse(text);
        } catch (e) {
            console.warn('Decompression failed, trying raw base64:', e);
            try {
                return JSON.parse(decodeURIComponent(escape(atob(str))));
            } catch (e2) {
                return JSON.parse(atob(str));
            }
        }
    }

    // === WIZARD UI CONTROL ===
    function openP2PWizard() {
        // Schließe Settings Modal zuerst, damit P2P Modal oben ist
        closeSettings();
        const modal = document.getElementById('p2pWizardModal');
        modal.classList.add('active');
        p2pWizardReset();
    }

    function closeP2PWizard() {
        document.getElementById('p2pWizardModal').classList.remove('active');
    }

    function p2pWizardReset() {
        document.getElementById('p2pWizStep1').style.display = '';
        document.getElementById('p2pWizStep2Host').style.display = 'none';
        document.getElementById('p2pWizStep2Client').style.display = 'none';
        document.getElementById('p2pWizStep3').style.display = 'none';
        document.getElementById('p2pStep1Dot').className = 'p2p-step-dot active';
        document.getElementById('p2pStep2Dot').className = 'p2p-step-dot';
        document.getElementById('p2pStep3Dot').className = 'p2p-step-dot';
        document.getElementById('p2pWizardSubtitle').textContent = 'Wähle eine Rolle';
    }

    function p2pShowStep(step) {
        document.getElementById('p2pWizStep1').style.display = 'none';
        document.getElementById('p2pWizStep2Host').style.display = 'none';
        document.getElementById('p2pWizStep2Client').style.display = 'none';
        document.getElementById('p2pWizStep3').style.display = 'none';

        const dots = ['p2pStep1Dot', 'p2pStep2Dot', 'p2pStep3Dot'];
        dots.forEach((d, i) => {
            const el = document.getElementById(d);
            if (i < step - 1) el.className = 'p2p-step-dot done';
            else if (i === step - 1) el.className = 'p2p-step-dot active';
            else el.className = 'p2p-step-dot';
        });
    }

    function p2pLog(msg) {
        const logEl = document.getElementById('p2pLogContent');
        if (!logEl) return;
        const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const line = document.createElement('div');
        line.style.marginBottom = '3px';
        line.textContent = `[${time}] ${msg}`;
        logEl.appendChild(line);
        const container = document.getElementById('p2pSyncLog');
        if (container) container.scrollTop = container.scrollHeight;
    }

    function p2pUpdateProgress(percent, status) {
        const bar = document.getElementById('p2pSyncBar');
        const pct = document.getElementById('p2pSyncPercent');
        const stat = document.getElementById('p2pSyncStatus');
        if (bar) bar.style.width = percent + '%';
        if (pct) pct.textContent = Math.round(percent) + '%';
        if (stat) stat.textContent = status;
    }

    function p2pUpdateStats() {
        const els = {
            sent: document.getElementById('p2pStatSent'),
            received: document.getElementById('p2pStatReceived'),
            merged: document.getElementById('p2pStatMerged')
        };
        if (els.sent) els.sent.textContent = p2pSync.syncStats.sent;
        if (els.received) els.received.textContent = p2pSync.syncStats.received;
        if (els.merged) els.merged.textContent = p2pSync.syncStats.merged;
    }

    function p2pUpdateConnectionUI(connected) {
        const statusEl = document.getElementById('p2pStatus');
        const dotEl = document.getElementById('p2pStatusDot');
        const peersEl = document.getElementById('connectedPeers');
        const quickEl = document.getElementById('p2pQuickActions');
        const lastSyncEl = document.getElementById('p2pLastSync');

        if (connected) {
            if (statusEl) statusEl.textContent = 'Verbunden';
            if (statusEl) statusEl.style.color = '#10b981';
            if (dotEl) { dotEl.style.background = '#10b981'; dotEl.style.boxShadow = '0 0 8px rgba(16,185,129,0.5)'; }
            if (peersEl) { peersEl.textContent = '1 Peer'; peersEl.style.color = '#10b981'; }
            if (quickEl) quickEl.style.display = 'grid';
        } else {
            if (statusEl) statusEl.textContent = 'Nicht verbunden';
            if (statusEl) statusEl.style.color = 'var(--text-muted)';
            if (dotEl) { dotEl.style.background = '#6b7280'; dotEl.style.boxShadow = 'none'; }
            if (peersEl) { peersEl.textContent = 'Offline'; peersEl.style.color = 'var(--text-muted)'; }
            if (quickEl) quickEl.style.display = 'none';
        }

        if (p2pSync.lastSyncTime && lastSyncEl) {
            lastSyncEl.style.display = '';
            const timeEl = document.getElementById('p2pLastSyncTime');
            if (timeEl) timeEl.textContent = new Date(p2pSync.lastSyncTime).toLocaleString('de-DE');
        }
    }

    // === ICE CONFIG (shared) ===
    function p2pGetIceConfig() {
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:freeturn.net:5349' },
                { urls: 'stun:stun.relay.metered.ca:80' },
                {
                    urls: 'turn:freeturn.net:5349',
                    username: 'free',
                    credential: 'free'
                },
                {
                    urls: 'turns:freeturn.net:5349',
                    username: 'free',
                    credential: 'free'
                },
                {
                    urls: 'turn:global.relay.metered.ca:80',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                },
                {
                    urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                },
                {
                    urls: 'turn:global.relay.metered.ca:443',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                },
                {
                    urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                    username: 'e8dd65b92a0d1172e8810b28',
                    credential: 'zHCzO/N6+Ogv7jnq'
                }
            ],
            iceCandidatePoolSize: 2
        };
    }

    // === ICE DIAGNOSTICS ===
    function p2pAnalyzeSDP(sdp) {
        if (!sdp) return { host: 0, srflx: 0, relay: 0, total: 0 };
        const candidates = sdp.match(/a=candidate:.+/g) || [];
        const types = { host: 0, srflx: 0, relay: 0, total: candidates.length };
        candidates.forEach(c => {
            if (c.includes('typ relay')) types.relay++;
            else if (c.includes('typ srflx')) types.srflx++;
            else if (c.includes('typ host')) types.host++;
        });
        return types;
    }

    async function p2pTestTURN() {
        console.log('🧪 TURN Server Test gestartet...');
        p2pLog('🧪 Teste TURN Server...');
        const config = p2pGetIceConfig();
        const pc = new RTCPeerConnection(config);
        pc.createDataChannel('turntest');

        const candidates = { host: 0, srflx: 0, relay: 0 };
        const relayDetails = [];

        return new Promise(async (resolve) => {
            const timeout = setTimeout(() => {
                pc.close();
                const result = { ...candidates, working: candidates.relay > 0, details: relayDetails };
                console.log('🧪 TURN Test Ergebnis:', result);
                p2pLog(result.working
                    ? `✅ TURN OK: ${candidates.relay} Relay, ${candidates.srflx} STUN, ${candidates.host} Host`
                    : `⚠️ TURN fehlgeschlagen: nur ${candidates.srflx} STUN, ${candidates.host} Host (kein Relay)`);
                resolve(result);
            }, 8000);

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    const c = event.candidate.candidate;
                    if (c.includes('typ relay')) { candidates.relay++; relayDetails.push(c); }
                    else if (c.includes('typ srflx')) candidates.srflx++;
                    else if (c.includes('typ host')) candidates.host++;
                    console.log(`🧊 [TEST] ${c.includes('typ relay') ? '🔄 RELAY' : c.includes('typ srflx') ? '📡 STUN' : '🏠 HOST'}: ${c.substring(0, 80)}...`);
                }
                if (!event.candidate) {
                    clearTimeout(timeout);
                    pc.close();
                    const result = { ...candidates, working: candidates.relay > 0, details: relayDetails };
                    console.log('🧪 TURN Test Ergebnis:', result);
                    p2pLog(result.working
                        ? `✅ TURN OK: ${candidates.relay} Relay, ${candidates.srflx} STUN, ${candidates.host} Host`
                        : `⚠️ Kein TURN Relay: ${candidates.srflx} STUN, ${candidates.host} Host`);
                    resolve(result);
                }
            };

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
            } catch (e) {
                clearTimeout(timeout);
                pc.close();
                console.error('🧪 TURN Test Error:', e);
                p2pLog('❌ TURN Test fehlgeschlagen: ' + e.message);
                resolve({ ...candidates, working: false, error: e.message });
            }
        });
    }

    // === STEP 1: HOST - Create Offer ===
    async function p2pStartHost() {
        p2pSync.role = 'host';
        p2pSync.offerGenerated = false;
        p2pSync.answerApplied = false;
        p2pSync.iceDiag = { host: 0, srflx: 0, relay: 0 };
        p2pShowStep(2);
        document.getElementById('p2pWizStep2Host').style.display = '';
        document.getElementById('p2pWizardSubtitle').textContent = 'Schritt 1/2 — Einladungscode';

        // Destroy old peer if exists
        if (p2pSync.peer) { try { p2pSync.peer.destroy(); } catch(e){} p2pSync.peer = null; }

        console.log('🏗️ P2P Host: Erstelle Offer mit trickle:false...');

        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            config: p2pGetIceConfig()
        });

        // WICHTIG: Erst Events registrieren, DANN peer zuweisen
        p2pSetupPeerEvents(peer);

        peer.on('signal', async (signalData) => {
            // trickle:false → nur 1 Signal mit allen ICE Candidates
            if (p2pSync.offerGenerated) {
                console.log('⏭️ Host: Doppeltes Signal ignoriert (Offer bereits generiert)');
                return;
            }
            p2pSync.offerGenerated = true;

            // ICE Diagnostik: SDP auf Relay-Kandidaten prüfen
            const sdpDiag = p2pAnalyzeSDP(signalData.sdp);
            console.log(`📡 Host: Offer-Signal generiert. SDP type: ${signalData.type}`);
            console.log(`🧊 ICE Candidates im SDP: ${sdpDiag.total} total → Host: ${sdpDiag.host}, STUN: ${sdpDiag.srflx}, RELAY: ${sdpDiag.relay}`);
            if (sdpDiag.relay === 0) {
                console.warn('⚠️ KEIN RELAY Candidate im Offer! TURN-Server funktionieren möglicherweise nicht.');
                p2pLog('⚠️ Kein TURN-Relay — nur direkte Verbindung möglich');
            } else {
                p2pLog(`✅ ${sdpDiag.relay} TURN-Relay Candidate(s) gefunden`);
            }
            p2pSync.iceDiag = sdpDiag;

            try {
                const payload = {
                    v: 2,
                    t: 'offer',
                    s: signalData,
                    d: p2pSync.deviceId,
                    n: data.settings?.name || 'Gerät',
                    ts: Date.now()
                };
                const compressed = await p2pCompress(payload);
                console.log(`📦 Offer komprimiert: ${JSON.stringify(signalData).length} → ${compressed.length} Zeichen`);

                document.getElementById('p2pHostSpinner').style.display = 'none';
                document.getElementById('p2pHostReady').style.display = '';
                document.getElementById('p2pOfferCodeBox').style.display = '';
                document.getElementById('p2pOfferCode').value = compressed;
            } catch (e) {
                console.error('❌ Offer-Kompression fehlgeschlagen:', e);
                showCustomMessage('❌ Fehler', 'Konnte Einladungscode nicht erstellen: ' + e.message, 'error');
            }
        });

        p2pSync.peer = peer;
    }

    // === STEP 1: CLIENT - Paste Offer ===
    function p2pStartClient() {
        p2pSync.role = 'client';
        p2pShowStep(2);
        document.getElementById('p2pWizStep2Client').style.display = '';
        document.getElementById('p2pWizardSubtitle').textContent = 'Schritt 1/2 — Code eingeben';
    }

    // === STEP 2: CLIENT - Process Offer & Generate Answer ===
    async function p2pClientProcessOffer() {
        const input = document.getElementById('p2pOfferInput').value.trim();
        if (!input) {
            showCustomMessage('❌ Fehler', 'Bitte füge den Einladungscode ein.', 'error');
            return;
        }

        const btn = document.getElementById('p2pClientConnectBtn');
        btn.textContent = '⏳ Verarbeite...';
        btn.disabled = true;

        try {
            const offerPayload = await p2pDecompress(input);
            console.log('📥 Client: Offer dekomprimiert. Version:', offerPayload.v, 'Type:', offerPayload.t);

            if (!offerPayload || !offerPayload.s || offerPayload.t !== 'offer') {
                throw new Error('Ungültiger Einladungscode (kein offer)');
            }

            if (!offerPayload.s.type || offerPayload.s.type !== 'offer') {
                throw new Error('SDP-Signal ist kein offer (type: ' + (offerPayload.s.type || 'undefined') + ')');
            }

            // Destroy old peer
            if (p2pSync.peer) { try { p2pSync.peer.destroy(); } catch(e){} p2pSync.peer = null; }

            p2pSync.answerGenerated = false;

            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                config: p2pGetIceConfig()
            });

            // WICHTIG: Events zuerst registrieren
            p2pSetupPeerEvents(peer);

            peer.on('signal', async (signalData) => {
                // trickle:false → nur 1 answer Signal
                if (p2pSync.answerGenerated) {
                    console.log('⏭️ Client: Doppeltes Signal ignoriert (Answer bereits generiert)');
                    return;
                }
                p2pSync.answerGenerated = true;

                // ICE Diagnostik: SDP auf Relay-Kandidaten prüfen
                const sdpDiag = p2pAnalyzeSDP(signalData.sdp);
                console.log(`📡 Client: Answer-Signal generiert. SDP type: ${signalData.type}`);
                console.log(`🧊 ICE Candidates im SDP: ${sdpDiag.total} total → Host: ${sdpDiag.host}, STUN: ${sdpDiag.srflx}, RELAY: ${sdpDiag.relay}`);
                if (sdpDiag.relay === 0) {
                    console.warn('⚠️ KEIN RELAY Candidate im Answer! TURN-Server funktionieren möglicherweise nicht.');
                    p2pLog('⚠️ Kein TURN-Relay — nur direkte Verbindung möglich');
                } else {
                    p2pLog(`✅ ${sdpDiag.relay} TURN-Relay Candidate(s) gefunden`);
                }
                p2pSync.iceDiag = sdpDiag;

                try {
                    const payload = {
                        v: 2,
                        t: 'answer',
                        s: signalData,
                        d: p2pSync.deviceId,
                        n: data.settings?.name || 'Gerät',
                        ts: Date.now()
                    };
                    const compressed = await p2pCompress(payload);
                    console.log(`📦 Answer komprimiert: ${compressed.length} Zeichen`);

                    // Show answer code
                    document.getElementById('p2pAnswerCodeBox').style.display = '';
                    document.getElementById('p2pAnswerCode').value = compressed;
                    btn.textContent = '✅ Answer generiert';
                } catch (e) {
                    console.error('❌ Answer-Kompression fehlgeschlagen:', e);
                    showCustomMessage('❌ Fehler', 'Answer-Code konnte nicht erstellt werden.', 'error');
                }
            });

            p2pSync.peer = peer;

            // Signal the offer to our peer NACH setup (this triggers answer generation)
            console.log('📡 Client: Signalisiere Offer an Peer...');
            peer.signal(offerPayload.s);

            const devInfo = document.getElementById('p2pDeviceInfo');
            if (devInfo) {
                devInfo.textContent = `Verbunden mit: ${offerPayload.n || 'Unbekannt'} (${offerPayload.d || '?'})`;
                devInfo.style.display = '';
            }

        } catch (e) {
            console.error('❌ Offer-Verarbeitung fehlgeschlagen:', e);
            showCustomMessage('❌ Ungültiger Code', 'Der Einladungscode konnte nicht verarbeitet werden: ' + e.message, 'error');
            btn.textContent = '🔗 Code verarbeiten';
            btn.disabled = false;
        }
    }

    // === STEP 2: HOST - Process Answer ===
    async function p2pHostProcessAnswer() {
        const input = document.getElementById('p2pAnswerInput').value.trim();
        if (!input) {
            showCustomMessage('❌ Fehler', 'Bitte füge den Antwort-Code ein.', 'error');
            return;
        }

        if (p2pSync.answerApplied) {
            showCustomMessage('⚠️ Bereits verarbeitet', 'Der Antwort-Code wurde bereits eingegeben. Starte neu falls nötig.', 'warning');
            return;
        }

        try {
            const answerPayload = await p2pDecompress(input);
            console.log('📥 Host: Answer dekomprimiert. Version:', answerPayload.v, 'Type:', answerPayload.t);

            if (!answerPayload || !answerPayload.s || answerPayload.t !== 'answer') {
                throw new Error('Ungültiger Antwort-Code (kein answer)');
            }

            if (!answerPayload.s.type || answerPayload.s.type !== 'answer') {
                throw new Error('SDP-Signal ist kein answer (type: ' + (answerPayload.s.type || 'undefined') + ')');
            }

            if (!p2pSync.peer) {
                throw new Error('Kein aktiver Peer. Bitte starte den Vorgang neu.');
            }

            // Check RTCPeerConnection state
            const pc = p2pSync.peer._pc;
            if (pc) {
                console.log('📊 Host RTCPeerConnection State:', pc.signalingState, '| ICE:', pc.iceConnectionState);
                if (pc.signalingState !== 'have-local-offer') {
                    console.error('❌ Falsche Signaling-State:', pc.signalingState, '(erwartet: have-local-offer)');
                    throw new Error('Verbindung ist in falschem Zustand (' + pc.signalingState + '). Bitte klicke "Daten senden" erneut und generiere einen neuen Code.');
                }
            }

            p2pSync.answerApplied = true;

            // Show loading UI
            const connectBtn = document.getElementById('p2pHostConnectBtn');
            const connectingDiv = document.getElementById('p2pHostConnecting');
            if (connectBtn) { connectBtn.disabled = true; connectBtn.textContent = '⏳ Verbinde...'; connectBtn.style.opacity = '0.6'; connectBtn.style.cursor = 'not-allowed'; }
            if (connectingDiv) connectingDiv.style.display = '';

            // Animate progress bar
            p2pSync._connectBarInterval = setInterval(() => {
                const bar = document.getElementById('p2pHostConnectBar');
                const status = document.getElementById('p2pHostConnectStatus');
                if (!bar) return;
                const current = parseFloat(bar.style.width) || 0;
                if (current < 90) {
                    bar.style.width = (current + 2) + '%';
                }
                // Show ICE state if available
                if (p2pSync.peer && p2pSync.peer._pc && status) {
                    const iceState = p2pSync.peer._pc.iceConnectionState;
                    const stateLabels = { 'new': 'Initialisiere...', 'checking': 'Suche Route...', 'connected': 'Verbunden!', 'completed': 'Verbunden!', 'failed': 'Fehlgeschlagen', 'disconnected': 'Getrennt', 'closed': 'Geschlossen' };
                    status.textContent = stateLabels[iceState] || 'Verbinde...';
                    if (iceState === 'failed') { status.style.color = '#f87171'; bar.style.background = '#ef4444'; }
                }
            }, 300);

            const devInfo = document.getElementById('p2pDeviceInfo');
            if (devInfo) {
                devInfo.textContent = `Verbunden mit: ${answerPayload.n || 'Unbekannt'} (${answerPayload.d || '?'})`;
                devInfo.style.display = '';
            }

            // Signal the answer to our peer (this completes the handshake!)
            console.log('📡 Host: Signalisiere Answer an Peer...');
            p2pSync.peer.signal(answerPayload.s);
            console.log('✅ Host: Answer signalisiert. Warte auf connect...');

        } catch (e) {
            console.error('❌ Answer-Verarbeitung fehlgeschlagen:', e);
            showCustomMessage('❌ Fehler', e.message, 'error');
            p2pSync.answerApplied = false; // allow retry
        }
    }

    // === SHARED PEER EVENT HANDLERS ===
    function p2pSetupPeerEvents(peer) {
        // ICE Diagnostik: Verbindungszustand überwachen
        try {
            if (peer._pc) {
                peer._pc.addEventListener('iceconnectionstatechange', () => {
                    console.log(`🧊 ICE Connection: ${peer._pc.iceConnectionState}`);
                    p2pLog(`🧊 ICE: ${peer._pc.iceConnectionState}`);
                });
                peer._pc.addEventListener('icegatheringstatechange', () => {
                    console.log(`🧊 ICE Gathering: ${peer._pc.iceGatheringState}`);
                });
                peer._pc.addEventListener('connectionstatechange', () => {
                    console.log(`🧊 Connection State: ${peer._pc.connectionState}`);
                });
                peer._pc.addEventListener('icecandidate', (event) => {
                    if (event.candidate) {
                        const c = event.candidate.candidate;
                        const type = c.includes('typ relay') ? '🔄 RELAY' : c.includes('typ srflx') ? '📡 STUN' : '🏠 HOST';
                        console.log(`🧊 ICE Candidate: ${type} | ${c.substring(0, 100)}`);
                    }
                });
            }
        } catch(e) { console.warn('ICE Diagnostik konnte nicht initialisiert werden:', e); }

        peer.on('connect', () => {
            console.log('✅ P2P VERBUNDEN! Rolle:', p2pSync.role);
            p2pSync.connected = true;
            p2pSync.syncStats = { sent: 0, received: 0, merged: 0 };

            // Clear connecting animation
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }

            // Show step 3
            p2pShowStep(3);
            document.getElementById('p2pWizStep3').style.display = '';
            document.getElementById('p2pWizardSubtitle').textContent = 'Verbunden!';

            // Update settings UI
            p2pUpdateConnectionUI(true);

            showCustomMessage('✅ P2P Verbunden!', 'Direkte Verbindung hergestellt. Daten werden synchronisiert...', 'success');

            // Start heartbeat
            p2pStartHeartbeat();

            // Auto-sync if enabled
            if (document.getElementById('p2pAutoSync')?.checked) {
                setTimeout(() => p2pExecuteSync(), 500);
            }

            p2pLog('✅ Verbindung hergestellt');
        });

        peer.on('data', (rawData) => {
            try {
                const msg = JSON.parse(rawData.toString());
                p2pHandleMessage(msg);
            } catch (e) {
                console.error('❌ P2P Message Parse Error:', e);
            }
        });

        peer.on('error', (err) => {
            console.error('❌ P2P Peer Error:', err);
            p2pLog('❌ Fehler: ' + err.message);
            // Clear connecting animation
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }
            // Reset connect button
            const connectBtn = document.getElementById('p2pHostConnectBtn');
            if (connectBtn) { connectBtn.disabled = false; connectBtn.textContent = '🔗 Verbindung herstellen'; connectBtn.style.opacity = '1'; connectBtn.style.cursor = 'pointer'; }
            const connectingDiv = document.getElementById('p2pHostConnecting');
            if (connectingDiv) connectingDiv.style.display = 'none';
            // Allow retry
            p2pSync.answerApplied = false;

            if (err.message === 'Connection failed.' || err.code === 'ERR_ICE_CONNECTION_FAILURE') {
                const diag = p2pSync.iceDiag || { host: '?', srflx: '?', relay: '?' };
                const hasRelay = diag.relay > 0;
                const diagText = `\n\n📊 Diagnostik: Host=${diag.host}, STUN=${diag.srflx}, RELAY=${diag.relay}`;
                const turnHint = hasRelay
                    ? '\n• TURN-Relay war verfügbar, aber Verbindung schlug trotzdem fehl'
                    : '\n• ⚠️ KEIN TURN-Relay verfügbar — TURN-Server antwortet nicht';

                showCustomMessage('❌ Verbindung fehlgeschlagen',
                    'Die P2P-Verbindung konnte nicht hergestellt werden.' + turnHint + '\n' +
                    '• Firewall oder striktes NAT blockiert die Verbindung\n' +
                    '• VPN aktiv? Bitte deaktivieren\n' +
                    '• Beide Geräte im selben WLAN? Dann sollte es direkt gehen\n\n' +
                    'Tipp: Öffne die Konsole (F12) → teste mit p2pTestTURN()' + diagText, 'error');
                console.error('🔍 P2P Diagnostik:', diag);
            }
        });

        peer.on('close', () => {
            console.log('🔴 P2P Verbindung geschlossen');
            p2pSync.connected = false;
            p2pStopHeartbeat();
            if (p2pSync._connectBarInterval) { clearInterval(p2pSync._connectBarInterval); p2pSync._connectBarInterval = null; }
            p2pUpdateConnectionUI(false);
            p2pLog('🔴 Verbindung getrennt');
        });
    }

    // === HEARTBEAT (Connection Health) ===
    function p2pStartHeartbeat() {
        p2pStopHeartbeat();
        p2pSync.heartbeatInterval = setInterval(() => {
            if (p2pSync.peer && p2pSync.connected) {
                try {
                    p2pSync.peer.send(JSON.stringify({ type: 'heartbeat', ts: Date.now(), d: p2pSync.deviceId }));
                } catch (e) {
                    console.warn('Heartbeat failed:', e);
                    p2pSync.connected = false;
                    p2pUpdateConnectionUI(false);
                    p2pStopHeartbeat();
                }
            }
        }, 5000);
    }

    function p2pStopHeartbeat() {
        if (p2pSync.heartbeatInterval) {
            clearInterval(p2pSync.heartbeatInterval);
            p2pSync.heartbeatInterval = null;
        }
    }

    // === DATA SYNC ENGINE ===
    function p2pExecuteSync() {
        if (!p2pSync.peer || !p2pSync.connected) {
            console.warn('P2P: Nicht verbunden, Sync nicht möglich');
            return;
        }

        p2pLog('📤 Starte Sync...');
        p2pUpdateProgress(10, 'Bereite Daten vor...');

        // Prepare sync package
        const entries = data.entries || [];
        const totalEntries = entries.length;

        // Calculate checksum for conflict detection
        const checksum = entries.reduce((sum, e) => sum + (e.timestamp || 0), 0).toString(36);

        // Send handshake first
        const handshake = {
            type: 'sync-handshake',
            deviceId: p2pSync.deviceId,
            deviceName: data.settings?.name || 'Gerät',
            entryCount: totalEntries,
            checksum: checksum,
            timestamp: Date.now(),
            settings: {
                name: data.settings?.name,
                weeklyHours: data.settings?.weeklyHours,
                expectedDaily: data.settings?.expectedDaily
            }
        };

        p2pSendMessage(handshake);
        p2pUpdateProgress(20, 'Handshake gesendet...');

        // Chunk entries for reliable transfer
        const CHUNK_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
            chunks.push(entries.slice(i, i + CHUNK_SIZE));
        }

        // Send chunks with delay for reliability
        chunks.forEach((chunk, idx) => {
            setTimeout(() => {
                p2pSendMessage({
                    type: 'sync-chunk',
                    chunkIndex: idx,
                    totalChunks: chunks.length,
                    entries: chunk,
                    timestamp: Date.now()
                });

                const progress = 20 + ((idx + 1) / chunks.length) * 70;
                p2pUpdateProgress(progress, `Sende Chunk ${idx + 1}/${chunks.length}...`);
                p2pSync.syncStats.sent += chunk.length;
                p2pUpdateStats();
                p2pLog(`📦 Chunk ${idx + 1}/${chunks.length} gesendet (${chunk.length} Einträge)`);

                if (idx === chunks.length - 1) {
                    // Final chunk sent
                    setTimeout(() => {
                        p2pSendMessage({ type: 'sync-complete', timestamp: Date.now() });
                        p2pUpdateProgress(95, 'Warte auf Bestätigung...');
                        p2pLog('📤 Alle Daten gesendet, warte auf ACK...');
                    }, 100);
                }
            }, idx * 150); // 150ms delay between chunks
        });

        // Handle empty data
        if (entries.length === 0) {
            p2pSendMessage({ type: 'sync-complete', timestamp: Date.now(), empty: true });
            p2pUpdateProgress(95, 'Keine Einträge zum Senden');
            p2pLog('ℹ️ Keine Einträge vorhanden');
        }
    }

    function p2pSendMessage(msg) {
        if (!p2pSync.peer || !p2pSync.connected) return;
        try {
            p2pSync.peer.send(JSON.stringify(msg));
        } catch (e) {
            console.error('P2P Send Error:', e);
        }
    }

    // === MESSAGE HANDLER ===
    let p2pReceivedChunks = [];
    let p2pExpectedChunks = 0;

    function p2pHandleMessage(msg) {
        switch (msg.type) {
            case 'heartbeat':
                // Peer is alive
                break;

            case 'sync-handshake':
                console.log('🤝 Sync-Handshake empfangen:', msg);
                p2pLog(`🤝 Handshake von "${msg.deviceName}" (${msg.entryCount} Einträge)`);
                p2pReceivedChunks = [];
                p2pExpectedChunks = 0;
                p2pUpdateProgress(15, 'Handshake empfangen...');
                break;

            case 'sync-chunk':
                console.log(`📦 Chunk ${msg.chunkIndex + 1}/${msg.totalChunks} empfangen (${msg.entries.length} Einträge)`);
                p2pReceivedChunks.push(...msg.entries);
                p2pExpectedChunks = msg.totalChunks;
                p2pSync.syncStats.received += msg.entries.length;
                p2pUpdateStats();

                const progress = 20 + ((msg.chunkIndex + 1) / msg.totalChunks) * 60;
                p2pUpdateProgress(progress, `Empfange ${msg.chunkIndex + 1}/${msg.totalChunks}...`);
                p2pLog(`📥 Chunk ${msg.chunkIndex + 1}/${msg.totalChunks} empfangen`);
                break;

            case 'sync-complete':
                console.log('✅ Sync-Complete empfangen. Merging', p2pReceivedChunks.length, 'Einträge...');
                p2pUpdateProgress(85, 'Merge läuft...');
                p2pLog('🔄 Starte Smart-Merge...');

                const mergeResult = p2pSmartMerge(p2pReceivedChunks);
                p2pSync.syncStats.merged = mergeResult.new + mergeResult.updated;
                p2pUpdateStats();

                p2pLog(`✅ Merge: ${mergeResult.new} neu, ${mergeResult.updated} aktualisiert, ${mergeResult.skipped} übersprungen`);

                // Send ACK
                p2pSendMessage({
                    type: 'sync-ack',
                    received: p2pReceivedChunks.length,
                    merged: mergeResult.new + mergeResult.updated,
                    timestamp: Date.now()
                });

                p2pReceivedChunks = [];
                p2pSync.lastSyncTime = Date.now();
                localStorage.setItem('p2p_lastSync', p2pSync.lastSyncTime);

                p2pUpdateProgress(100, 'Sync abgeschlossen!');
                p2pLog('🎉 Synchronisation erfolgreich abgeschlossen!');

                showCustomMessage('✅ Sync erfolgreich!',
                    `${mergeResult.new} neue & ${mergeResult.updated} aktualisierte Einträge empfangen.`, 'success');

                // Update all UI
                if (typeof renderEntries === 'function') renderEntries();
                if (typeof computeAll === 'function') computeAll();
                p2pUpdateConnectionUI(true);
                break;

            case 'sync-ack':
                console.log('✅ Sync-ACK empfangen:', msg);
                p2pUpdateProgress(100, 'Bestätigt!');
                p2pLog(`✅ Empfänger bestätigt: ${msg.received} empfangen, ${msg.merged} gemergt`);
                p2pSync.lastSyncTime = Date.now();
                localStorage.setItem('p2p_lastSync', p2pSync.lastSyncTime);
                p2pUpdateConnectionUI(true);

                showCustomMessage('✅ Sync bestätigt!',
                    `${msg.received} Einträge erfolgreich übertragen. ${msg.merged} gemergt.`, 'success');
                break;

            default:
                console.log('P2P: Unbekannter Message-Typ:', msg.type);
        }
    }

    // === SMART MERGE ENGINE ===
    function p2pSmartMerge(remoteEntries) {
        let newCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        if (!remoteEntries || !Array.isArray(remoteEntries)) {
            return { new: 0, updated: 0, skipped: 0 };
        }

        remoteEntries.forEach(remoteEntry => {
            if (!remoteEntry || !remoteEntry.id) {
                skippedCount++;
                return;
            }

            const localEntry = data.entries.find(e => e.id === remoteEntry.id);

            if (!localEntry) {
                // Neuer Eintrag → hinzufügen
                data.entries.push({ ...remoteEntry });
                newCount++;
            } else {
                const remoteTs = remoteEntry.timestamp || 0;
                const localTs = localEntry.timestamp || 0;

                if (remoteTs > localTs) {
                    // Remote ist neuer → überschreiben (Last-Write-Wins)
                    Object.assign(localEntry, remoteEntry);
                    updatedCount++;
                } else {
                    // Lokal ist neuer oder gleich → nichts tun
                    skippedCount++;
                }
            }
        });

        // Sort entries by date after merge
        data.entries.sort((a, b) => {
            const da = a.date || '';
            const db = b.date || '';
            return da.localeCompare(db);
        });

        save();
        console.log(`✅ Smart-Merge: ${newCount} neu, ${updatedCount} aktualisiert, ${skippedCount} übersprungen`);
        return { new: newCount, updated: updatedCount, skipped: skippedCount };
    }

    // === USER ACTIONS ===
    function p2pManualSync() {
        if (!p2pSync.connected) {
            showCustomMessage('⚠️ Nicht verbunden', 'Stelle zuerst eine P2P-Verbindung her.', 'warning');
            return;
        }
        p2pSync.syncStats = { sent: 0, received: 0, merged: 0 };
        p2pUpdateStats();
        p2pExecuteSync();
    }

    function p2pDisconnect() {
        if (p2pSync.peer) {
            try { p2pSync.peer.destroy(); } catch(e) {}
            p2pSync.peer = null;
        }
        p2pSync.connected = false;
        p2pSync.role = null;
        p2pStopHeartbeat();
        p2pUpdateConnectionUI(false);

        // Reset wizard to step 1 if open
        const modal = document.getElementById('p2pWizardModal');
        if (modal && modal.classList.contains('active')) {
            p2pWizardReset();
        }

        showCustomMessage('🔴 Getrennt', 'P2P-Verbindung wurde beendet.', 'info');
    }

    function p2pCopyOffer() {
        const code = document.getElementById('p2pOfferCode').value;
        navigator.clipboard.writeText(code).then(() => {
            showCustomMessage('📋 Kopiert!', 'Einladungscode in die Zwischenablage kopiert.', 'success');
        }).catch(() => {
            // Fallback
            const el = document.getElementById('p2pOfferCode');
            el.select();
            document.execCommand('copy');
            showCustomMessage('📋 Kopiert!', 'Einladungscode kopiert (Fallback).', 'success');
        });
    }

    function p2pCopyAnswer() {
        const code = document.getElementById('p2pAnswerCode').value;
        navigator.clipboard.writeText(code).then(() => {
            showCustomMessage('📋 Kopiert!', 'Antwort-Code in die Zwischenablage kopiert.', 'success');
        }).catch(() => {
            const el = document.getElementById('p2pAnswerCode');
            el.select();
            document.execCommand('copy');
            showCustomMessage('📋 Kopiert!', 'Antwort-Code kopiert (Fallback).', 'success');
        });
    }

    // === LEGACY COMPAT (alte Button-Handler redirigieren) ===
    function initiateP2PShare() { openP2PWizard(); }
    function showJoinModal() { openP2PWizard(); }
    function closeJoinModal() { closeP2PWizard(); }
    function joinP2PTeam() { openP2PWizard(); }
    function stopP2PShare() { p2pDisconnect(); }
    function copyConnectionCode() { p2pCopyOffer(); }

    // Load last sync time on startup
    (() => {
        const lastSync = localStorage.getItem('p2p_lastSync');
        if (lastSync) {
            p2pSync.lastSyncTime = parseInt(lastSync);
            p2pUpdateConnectionUI(false);
        }
    })();
    function addBiweeklyRule() {
        const container = document.getElementById('biweeklyRulesList');
        const el = document.createElement('div');
        el.className = 'bi-rule';
        const todayISO = new Date().toISOString().slice(0,10);
        el.innerHTML = `
            <select class="glass-select bi-weekday">
                <option value="0">So</option>
                <option value="1">Mo</option>
                <option value="2">Di</option>
                <option value="3">Mi</option>
                <option value="4">Do</option>
                <option value="5">Fr</option>
                <option value="6">Sa</option>
            </select>
            <input class="glass-input bi-interval" type="number" min="1" value="2" title="Intervall (Wochen)">
            <input class="glass-input bi-start" type="date" value="${todayISO}">
            <button class="btn btn-ghost" onclick="this.parentElement.remove();">✕</button>
        `;
        container.appendChild(el);
    }

    function saveSchoolSettingsToData() {
        if(!data.settings.schoolRules) data.settings.schoolRules = { weeklyDays: [], biweekly: [] };
        const weekly = [];
        for(let i=0;i<7;i++) {
            const cb = document.getElementById('sch_week_'+i);
            if(cb && cb.checked) weekly.push(i);
        }
        const rules = [];
        const container = document.getElementById('biweeklyRulesList');
        if(container) {
            const rows = Array.from(container.querySelectorAll('.bi-rule'));
            rows.forEach(rEl => {
                const weekday = parseInt(rEl.querySelector('.bi-weekday').value);
                const interval = parseInt(rEl.querySelector('.bi-interval').value) || 2;
                const startDate = rEl.querySelector('.bi-start').value || '';
                if(!isNaN(weekday)) rules.push({ weekday, interval, startDate });
            });
        }
        data.settings.schoolRules.weeklyDays = weekly;
        data.settings.schoolRules.biweekly = rules;
    }

    function checkDateVocFromInput() {
        const d = document.getElementById('checkVocDate').value;
        if(!d) return showCustomMessage('❌ Fehler', 'Bitte ein Datum auswählen.', 'error');
        const res = isVocSchoolForDate(new Date(d));
        if(res.isVocSchool) showCustomMessage('✅ Berufsschultag', `Der ${d} ist Berufsschule (${res.reason}).`, 'success');
        else showCustomMessage('ℹ️ Kein Berufsschultag', `Der ${d} ist keine Berufsschule (${res.reason}).`, 'info');
    }

    function isVocSchoolForDate(date) {
        // Ensure rules exist
        const rules = (data.settings.schoolRules && data.settings.schoolRules) || { weeklyDays: [], biweekly: [] };
        const dateISO = date.toISOString().slice(0,10);
        const dayIndex = date.getDay();

        // 1) Check booked vacations (explicit entries)
        if(data.entries.some(e => e.date === dateISO && e.type === 'vacation')) return { isVocSchool:false, reason:'vacation' };

        // 2) Check public holidays via existing function getGermanHolidays
        const year = date.getFullYear();
        const holidays = getGermanHolidays(year).concat(getGermanHolidays(year+1));
        if(holidays.find(h => h.date === dateISO)) return { isVocSchool:false, reason:'public-holiday' };

        // 3) First check Biweekly / multi-week rules (they take priority!)
        for(const r of (rules.biweekly||[])) {
            const wd = parseInt(r.weekday);
            if(wd !== dayIndex) continue;
            
            const interval = parseInt(r.interval) || 2;
            if(!r.startDate) continue;
            
            // Parse startDate as local time (not UTC)
            const [year, month, day] = r.startDate.split('-').map(Number);
            const start = new Date(year, month - 1, day);
            // normalize both dates to midnight
            const dateNorm = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const daysDiff = Math.floor((dateNorm - start) / 86400000);
            
            if(daysDiff < 0) continue; // before start date
            
            const weeks = Math.floor(daysDiff / 7);
            if((weeks % interval) === 0) {
                const expected = data.settings.hours[dayIndex] || 0;
                if(expected > 0) return { isVocSchool:true, reason:'biweekly', matchedRule: r };
            } else {
                // This day matches the weekday but NOT the week pattern
                // So even if it's in weeklyDays, we should skip it
                return { isVocSchool:false, reason:'not-in-biweekly-cycle' };
            }
        }

        // 4) Only check weekly rules if there are no biweekly rules for this weekday
        const hasBiweeklyForDay = rules.biweekly && rules.biweekly.some(r => parseInt(r.weekday) === dayIndex);
        if(!hasBiweeklyForDay && Array.isArray(rules.weeklyDays) && rules.weeklyDays.includes(dayIndex)) {
            // Only consider weekdays with expected hours > 0
            const expected = data.settings.hours[dayIndex] || 0;
            if(expected > 0) return { isVocSchool:true, reason:'weekly' };
        }

        return { isVocSchool:false, reason:'none' };
    }

    function checkTodayVocSchool() {
        try {
            const today = new Date();
            const iso = today.toISOString().slice(0,10);
            const res = isVocSchoolForDate(today);
            if(res.isVocSchool) {
                const exists = data.entries.some(e => e.date === iso && e.type === 'school');
                // Check if user already dismissed this date
                const dismissed = JSON.parse(localStorage.getItem('tg_school_dismissed') || '[]');
                if(!exists && !dismissed.includes(iso)) {
                    showCustomConfirm('🏫 Berufsschule heute?', `Heute (${iso}) sieht nach Berufsschule aus (${res.reason}). Soll ein Eintrag für heute angelegt werden?`, () => {
                        createSchoolEntryForDate(today);
                    }, () => {
                        // Store dismissed date so it won't be suggested again
                        const list = JSON.parse(localStorage.getItem('tg_school_dismissed') || '[]');
                        list.push(iso);
                        // Keep only last 90 days of dismissed dates to avoid unbounded growth
                        const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0,10);
                        const pruned = list.filter(d => d >= cutoff);
                        localStorage.setItem('tg_school_dismissed', JSON.stringify(pruned));
                    });
                }
            }
        } catch(e) { console.warn('checkTodayVocSchool error', e); }
    }

    function createSchoolEntryForDate(d) {
        const dateISO = d.toISOString().slice(0,10);
        const dayIndex = d.getDay();
        const SCHOOL_HOURS = 6.75; // default used elsewhere
        const expected = data.settings.hours[dayIndex] || 0;
        const worked = SCHOOL_HOURS > 0 ? SCHOOL_HOURS : expected;

        const entry = {
            id: Date.now() + Math.random(),
            date: dateISO,
            type: 'school',
            worked: worked,
            expected: expected,
            diff: 0,
            info: 'Berufsschule (automatisch vorgeschlagen)',
            isPeriod: false,
            breakMins: 0, shiftEnd: '', shiftWarning: false
        };
        data.entries.push(entry);
        data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
        save();
        showCustomMessage('✅ Eingetragen', `Berufsschule für ${dateISO} wurde hinzugefügt.`, 'success');
    }

    // === PROFESSIONAL STEP-BY-STEP TOUR ===
    
    let onboardingStep = 0;
    let onboardingActive = false;
    let tourTouchStart = null;
    let _tourResizeHandler = null;

    function _isMobile() { return window.innerWidth < 1024; }

    // Desktop steps (original — unchanged)
    const desktopSteps = [
        {
            icon: '👋',
            title: 'Willkommen bei MyWorkLog',
            text: 'Diese Tour führt dich Schritt für Schritt durch die App. Du lernst alle wichtigen Bereiche und Funktionen kennen.',
            target: null,
            tab: null,
            position: 'center'
        },
        {
            icon: '📊',
            title: 'Dein Dashboard',
            text: 'Hier siehst du deine wichtigsten Kennzahlen auf einen Blick — Wochensaldo, Monatssaldo, Gleitzeitkonto und Tagesdurchschnitt.',
            target: '#dashboardGrid',
            tab: 'dashboard',
            position: 'bottom'
        },
        {
            icon: '📈',
            title: 'Trend & Verteilung',
            text: 'Der Wochenverlauf zeigt dir, wie sich dein Saldo entwickelt. Das Donut-Diagramm zeigt die Verteilung deiner Eintragstypen.',
            target: '[data-item-id="charts"]',
            tab: 'dashboard',
            position: 'top'
        },
        {
            icon: '✍️',
            title: 'Eintrag erfassen',
            text: 'Wähle Datum, Typ und gib Start/Ende oder Stunden ein. Die „Jetzt"-Buttons setzen die aktuelle Uhrzeit. Entwürfe werden automatisch gespeichert.',
            target: '[data-item-id="entry-form"]',
            tab: 'dashboard',
            position: 'top'
        },
        {
            icon: '📈',
            title: 'Performance Analyse',
            text: 'Hier findest du detaillierte Auswertungen: Soll-Ist-Vergleich, Projektverteilung, Wochentag-Analyse und Produktivitäts-Heatmap.',
            target: '#view-performance',
            tab: 'performance',
            position: 'bottom'
        },
        {
            icon: '🔮',
            title: 'Prognose & Planung',
            text: 'Plane die nächsten 4 Wochen. Klicke auf einen Tag, um ihn als Urlaub, Schule oder Krank zu markieren — der Saldo aktualisiert sich live.',
            target: '#view-prognose',
            tab: 'prognose',
            position: 'bottom'
        },
        {
            icon: '📆',
            title: 'Jahresübersicht',
            text: 'Die Heatmap zeigt dir das ganze Jahr. Grün = produktive Tage, Rot = weniger produktive Tage. Dazu gibt es KI-Insights über deine Muster.',
            target: '#view-yearview',
            tab: 'yearview',
            position: 'bottom'
        },
        {
            icon: '🎓',
            title: 'IHK & Ausbildung',
            text: 'Verwalte deine Ausbildungsdaten, Prüfungstermine und Noten. Der Compliance-Check prüft Ruhezeiten und Arbeitszeitgrenzen.',
            target: '#view-ihk',
            tab: 'ihk',
            position: 'bottom'
        },
        {
            icon: '🏆',
            title: 'Ziele & Fokus',
            text: 'Setze persönliche Ziele wie „100h Überstunden" oder „50 positive Wochen". Jedes erreichte Ziel bringt dir ein Achievement-Badge.',
            target: '#view-goals',
            tab: 'goals',
            position: 'bottom'
        },
        {
            icon: '🔍',
            title: 'Daten & Historie',
            text: 'Alle deine Einträge — filterbar nach Datum, Typ und Projekt. Exportiere als CSV oder JSON für Excel, Audits oder Backups.',
            target: '#view-history',
            tab: 'history',
            position: 'bottom'
        },
        {
            icon: '⚙️',
            title: 'Sidebar — Dein Menü',
            text: 'Über die Sidebar erreichst du alle Bereiche, Einstellungen, Export, Backup und externe Tools wie Berichtsheft.',
            target: '#sidebar',
            tab: null,
            position: 'right'
        },
        {
            icon: '🎉',
            title: 'Du bist startklar!',
            text: 'Du kennst jetzt alle wichtigen Bereiche. Starte mit dem Dashboard und erfasse deinen ersten Eintrag. Viel Erfolg!',
            target: null,
            tab: 'dashboard',
            position: 'center'
        }
    ];

    // Mobile steps — optimiert für Handy-Layout
    const mobileSteps = [
        {
            icon: '👋',
            title: 'Willkommen!',
            text: 'Swipe links/rechts oder tippe auf "Weiter" um durch die Tour zu gehen. Du lernst alle wichtigen Bereiche deiner App kennen.',
            target: null,
            tab: null,
            position: 'center'
        },
        {
            icon: '📊',
            title: 'Dashboard — Deine Übersicht',
            text: 'Hier siehst du Wochensaldo, Monatssaldo, Gleitzeitkonto und mehr. Scrolle runter für Diagramme und das Eintragsformular.',
            target: '#dashboardGrid',
            tab: 'dashboard',
            position: 'bottom-sheet'
        },
        {
            icon: '✍️',
            title: 'Eintrag erfassen',
            text: 'Scrolle im Dashboard runter zum Formular. Wähle Datum & Typ, gib Start- und Endzeit ein. Die „Jetzt"-Buttons setzen die aktuelle Uhrzeit.',
            target: '[data-item-id="entry-form"]',
            tab: 'dashboard',
            position: 'bottom-sheet'
        },
        {
            icon: '📈',
            title: 'Analyse',
            text: 'Tippe in der unteren Leiste auf „Analyse" für Soll-Ist-Vergleiche, Projektverteilung und Produktivitäts-Heatmap.',
            target: '#mobNav-performance',
            tab: 'performance',
            position: 'above-nav'
        },
        {
            icon: '📋',
            title: 'Historie',
            text: 'Alle deine Einträge — filterbar nach Datum, Typ und Projekt. Hier kannst du auch einzelne Einträge bearbeiten oder löschen.',
            target: '#mobNav-history',
            tab: 'history',
            position: 'above-nav'
        },
        {
            icon: '📆',
            title: 'Jahresübersicht',
            text: 'Die Heatmap zeigt dir das ganze Jahr auf einen Blick. Grün = produktive Tage, Rot = weniger. Dazu KI-Insights.',
            target: '#mobNav-yearview',
            tab: 'yearview',
            position: 'above-nav'
        },
        {
            icon: '🎯',
            title: 'Ziele & Achievements',
            text: 'Setze persönliche Ziele wie „100h Überstunden". Jedes erreichte Ziel bringt dir ein Badge!',
            target: '#mobNav-goals',
            tab: 'goals',
            position: 'above-nav'
        },
        {
            icon: '☰',
            title: 'Menü & Einstellungen',
            text: 'Tippe oben links auf das Menü-Icon (☰) für weitere Bereiche: Prognose, IHK, Berichtsheft, Export, Backup und Einstellungen.',
            target: null,
            tab: 'dashboard',
            position: 'center',
            action: 'show-menu-hint'
        },
        {
            icon: '🎉',
            title: 'Du bist startklar!',
            text: 'Du kennst jetzt alle Bereiche! Starte auf dem Dashboard und erfasse deinen ersten Eintrag. Viel Erfolg! 🚀',
            target: null,
            tab: 'dashboard',
            position: 'center'
        }
    ];

    function _getSteps() { return _isMobile() ? mobileSteps : desktopSteps; }
    // Keep old name for compat
    const onboardingSteps = desktopSteps;

    // --- Tour Keyboard ---
    function tourKeyHandler(e) {
        if (!onboardingActive) return;
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextOnboardingStep(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); previousOnboardingStep(); }
        else if (e.key === 'Escape') { e.preventDefault(); endOnboardingTour(); }
    }

    // --- Tour Touch/Swipe ---
    function tourTouchStartHandler(e) { tourTouchStart = e.touches[0].clientX; }
    function tourTouchEndHandler(e) {
        if (tourTouchStart === null || !onboardingActive) return;
        const diff = tourTouchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? nextOnboardingStep() : previousOnboardingStep(); }
        tourTouchStart = null;
    }

    // --- Confetti ---
    function launchTourConfetti() {
        const c = document.getElementById('tourConfetti');
        if (!c) return;
        const colors = ['#a855f7','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#fff'];
        const shapes = ['■','●','▲','★','♦','◆'];
        for (let i = 0; i < 120; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.cssText = 'left:' + (Math.random()*100) + '%;color:' + colors[Math.floor(Math.random()*colors.length)] + ';font-size:' + (Math.random()*14+6) + 'px;--fall-dur:' + (Math.random()*2.5+2) + 's;--fall-del:' + (Math.random()*.8) + 's;';
            p.textContent = shapes[Math.floor(Math.random()*shapes.length)];
            c.appendChild(p);
        }
        setTimeout(() => { c.innerHTML = ''; }, 5500);
    }
    function renderOnboardingStep() {
        const steps = _getSteps();
        const step = steps[onboardingStep];
        const total = steps.length;
        const isMob = _isMobile();

        // Navigate to correct tab
        if (step.tab) {
            if (isMob && typeof mobNavSwitch === 'function') {
                mobNavSwitch(step.tab);
            } else if (typeof switchTab === 'function') {
                switchTab(step.tab);
            }
        }

        // Show sidebar for sidebar step (desktop only)
        if (step.target === '#sidebar' && !isMob) {
            // Sidebar already visible on desktop
        } else if (step.target === '#sidebar' && isMob) {
            const sb = document.querySelector('.sidebar');
            if (sb) sb.classList.add('active');
        }

        // Remove old elements
        const oldOverlay = document.getElementById('tourSpotlightOverlay');
        const oldTooltip = document.getElementById('tourTooltip');
        if (oldOverlay) oldOverlay.remove();
        if (oldTooltip) oldTooltip.remove();

        // Scroll target into view
        let targetEl = step.target ? document.querySelector(step.target) : null;
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Small delay for scroll to settle
        setTimeout(() => {
            targetEl = step.target ? document.querySelector(step.target) : null;
            const rect = targetEl ? targetEl.getBoundingClientRect() : null;

            // --- Spotlight Overlay with cutout ---
            const overlay = document.createElement('div');
            overlay.id = 'tourSpotlightOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;transition:opacity .3s;';

            if (rect && step.position !== 'center') {
                const pad = 12;
                const r = 16;
                const x = rect.left - pad, y = rect.top - pad, w = rect.width + pad*2, h = rect.height + pad*2;
                const svgNS = 'http://www.w3.org/2000/svg';
                const svg = document.createElementNS(svgNS, 'svg');
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.cssText = 'position:absolute;inset:0;';

                const defs = document.createElementNS(svgNS, 'defs');
                const mask = document.createElementNS(svgNS, 'mask');
                mask.id = 'tourCutout';
                const maskBg = document.createElementNS(svgNS, 'rect');
                maskBg.setAttribute('width', '100%'); maskBg.setAttribute('height', '100%'); maskBg.setAttribute('fill', 'white');
                const maskHole = document.createElementNS(svgNS, 'rect');
                maskHole.setAttribute('x', x); maskHole.setAttribute('y', y);
                maskHole.setAttribute('width', Math.max(0, w)); maskHole.setAttribute('height', Math.max(0, h));
                maskHole.setAttribute('rx', r); maskHole.setAttribute('fill', 'black');
                mask.appendChild(maskBg); mask.appendChild(maskHole);
                defs.appendChild(mask); svg.appendChild(defs);

                const bgRect = document.createElementNS(svgNS, 'rect');
                bgRect.setAttribute('width', '100%'); bgRect.setAttribute('height', '100%');
                bgRect.setAttribute('fill', 'rgba(0,0,0,0.65)'); bgRect.setAttribute('mask', 'url(#tourCutout)');
                svg.appendChild(bgRect);

                // Glow ring around cutout
                const glowRect = document.createElementNS(svgNS, 'rect');
                glowRect.setAttribute('x', x-1); glowRect.setAttribute('y', y-1);
                glowRect.setAttribute('width', Math.max(0, w+2)); glowRect.setAttribute('height', Math.max(0, h+2));
                glowRect.setAttribute('rx', r+1); glowRect.setAttribute('fill', 'none');
                glowRect.setAttribute('stroke', 'rgba(var(--primary-rgb),0.5)'); glowRect.setAttribute('stroke-width', '2');
                svg.appendChild(glowRect);

                overlay.appendChild(svg);
            } else {
                overlay.style.background = 'rgba(0,0,0,0.7)';
                overlay.style.backdropFilter = 'blur(4px)';
            }

            overlay.onclick = (e) => { if (e.target === overlay || e.target.tagName === 'svg' || e.target.tagName === 'rect') nextOnboardingStep(); };
            document.body.appendChild(overlay);

            // --- Tooltip ---
            const tooltip = document.createElement('div');
            tooltip.id = 'tourTooltip';
            const isBSheet = isMob && (step.position === 'bottom-sheet' || step.position === 'above-nav');
            tooltip.style.cssText = `
                position:fixed;z-index:10001;
                width:${isBSheet ? '100vw' : '380px'};max-width:${isBSheet ? '100vw' : '90vw'};
                background:rgba(15,15,25,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
                border:1px solid rgba(255,255,255,0.1);border-radius:${isBSheet ? '18px 18px 0 0' : '16px'};
                box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(var(--primary-rgb),0.08);
                padding:0;overflow:hidden;opacity:0;transition:opacity .3s,transform .3s;
                transform:translateY(${isBSheet ? '20px' : '10px'});font-family:inherit;
            `;

            // Progress bar
            const progressPerc = ((onboardingStep + 1) / total * 100);
            const progressBar = '<div style="height:3px;background:rgba(255,255,255,0.05);"><div style="height:100%;width:' + progressPerc + '%;background:linear-gradient(90deg,var(--primary),#06b6d4);border-radius:0 3px 3px 0;transition:width .5s;"></div></div>';

            // Dots
            let dots = '';
            for (let i = 0; i < total; i++) {
                const cls = i === onboardingStep ? 'background:var(--primary);box-shadow:0 0 8px var(--primary);transform:scale(1.3);' : (i < onboardingStep ? 'background:#10b981;' : 'background:rgba(255,255,255,0.15);');
                dots += '<button onclick="jumpToStep(' + i + ')" style="width:7px;height:7px;border-radius:50%;border:none;cursor:pointer;padding:0;transition:all .3s;' + cls + '"></button>';
            }

            // Back button
            const backBtn = onboardingStep > 0 ? '<button onclick="previousOnboardingStep()" style="padding:8px 16px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:.85rem;font-weight:600;cursor:pointer;transition:.2s;font-family:inherit;" onmouseover="this.style.background=\'rgba(255,255,255,.12)\'" onmouseout="this.style.background=\'rgba(255,255,255,.06)\'">←</button>' : '';

            // Next/Finish button
            const nextBtn = onboardingStep < total - 1 ?
                '<button onclick="nextOnboardingStep()" style="padding:8px 20px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#06b6d4);border:none;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit;box-shadow:0 4px 15px rgba(var(--primary-rgb),0.3);" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">Weiter →</button>' :
                '<button onclick="endOnboardingTour()" style="padding:8px 20px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit;box-shadow:0 4px 15px rgba(16,185,129,0.3);" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">✓ Fertig!</button>';

            tooltip.innerHTML = progressBar +
                '<div style="padding:1.5rem 1.5rem 1.25rem;">' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:.75rem;">' +
                        '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(var(--primary-rgb),0.15),rgba(6,182,212,0.15));border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">' + step.icon + '</div>' +
                        '<div>' +
                            '<h3 style="margin:0;font-size:1.05rem;font-weight:700;color:#fff;">' + step.title + '</h3>' +
                            '<span style="font-size:.75rem;color:rgba(255,255,255,0.35);">Schritt ' + (onboardingStep + 1) + ' von ' + total + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<p style="margin:0 0 1.25rem;font-size:.9rem;line-height:1.65;color:rgba(255,255,255,0.6);">' + step.text + '</p>' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
                        '<div style="display:flex;gap:5px;align-items:center;">' + dots + '</div>' +
                        '<div style="display:flex;gap:8px;">' + backBtn + nextBtn + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="padding:0 1.5rem .75rem;display:flex;justify-content:space-between;align-items:center;">' +
                    '<span style="font-size:.72rem;color:rgba(255,255,255,0.2);">' + (isMob ? '← Swipe → · Tippe zum Überspringen' : '← → Pfeiltasten · Esc zum Beenden') + '</span>' +
                    '<button onclick="endOnboardingTour()" style="background:none;border:none;color:rgba(255,255,255,0.25);font-size:.72rem;cursor:pointer;font-family:inherit;padding:2px 4px;" onmouseover="this.style.color=\'rgba(255,255,255,.5)\'" onmouseout="this.style.color=\'rgba(255,255,255,.25)\'">Überspringen</button>' +
                '</div>';

            document.body.appendChild(tooltip);

            // Position the tooltip
            positionTourTooltip(tooltip, rect, step.position);

            // Animate in
            requestAnimationFrame(() => {
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(0)';
            });
        }, 350);
    }

    function positionTourTooltip(tooltip, rect, position) {
        const gap = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // --- Mobile bottom-sheet: full-width sheet pinned above bottom nav ---
        if (position === 'bottom-sheet') {
            const navH = 64; // mobile bottom nav height
            tooltip.style.left = '0';
            tooltip.style.bottom = navH + 'px';
            tooltip.style.top = 'auto';
            tooltip.style.transform = 'none';
            tooltip.style.width = '100vw';
            tooltip.style.maxWidth = '100vw';
            return;
        }

        // --- Mobile above-nav: tooltip floating just above mobile bottom nav ---
        if (position === 'above-nav') {
            const navH = 64;
            tooltip.style.left = '50%';
            tooltip.style.bottom = (navH + gap) + 'px';
            tooltip.style.top = 'auto';
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.style.width = 'calc(100vw - 24px)';
            tooltip.style.maxWidth = '420px';
            return;
        }

        if (!rect || position === 'center') {
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const tw = Math.min(380, vw * 0.9);
        const th = tooltip.offsetHeight || 220;

        let left, top;
        const cx = rect.left + rect.width / 2;

        if (position === 'bottom') {
            top = rect.bottom + gap;
            left = cx - tw / 2;
        } else if (position === 'top') {
            top = rect.top - th - gap;
            left = cx - tw / 2;
        } else if (position === 'right') {
            left = rect.right + gap;
            top = rect.top + rect.height / 2 - th / 2;
        } else if (position === 'left') {
            left = rect.left - tw - gap;
            top = rect.top + rect.height / 2 - th / 2;
        }

        // Clamp to viewport
        if (left < 10) left = 10;
        if (left + tw > vw - 10) left = vw - tw - 10;
        if (top < 10) top = 10;
        if (top + th > vh - 10) {
            // Flip to top if we're below viewport
            if (position === 'bottom' && rect.top - th - gap > 10) {
                top = rect.top - th - gap;
            } else {
                top = vh - th - 10;
            }
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.transform = 'none';
    }

    function nextOnboardingStep() {
        if (onboardingStep < _getSteps().length - 1) {
            onboardingStep++;
            renderOnboardingStep();
        } else {
            endOnboardingTour();
        }
    }

    function previousOnboardingStep() {
        if (onboardingStep > 0) {
            onboardingStep--;
            renderOnboardingStep();
        }
    }

    function jumpToStep(step) {
        onboardingStep = step;
        renderOnboardingStep();
    }

    function endOnboardingTour() {
        onboardingActive = false;
        document.removeEventListener('keydown', tourKeyHandler);
        document.removeEventListener('touchstart', tourTouchStartHandler);
        document.removeEventListener('touchend', tourTouchEndHandler);
        if (_tourResizeHandler) { window.removeEventListener('resize', _tourResizeHandler); _tourResizeHandler = null; }
        const overlay = document.getElementById('tourSpotlightOverlay');
        const tooltip = document.getElementById('tourTooltip');
        if (overlay) overlay.remove();
        if (tooltip) tooltip.remove();
        // Close sidebar on mobile if open
        if (window.innerWidth < 1024) {
            const sb = document.querySelector('.sidebar');
            if (sb) sb.classList.remove('active');
        }
        // Switch back to dashboard
        if (typeof switchTab === 'function') switchTab('dashboard');
        if (onboardingStep >= _getSteps().length - 1) launchTourConfetti();
        showCustomMessage('✅ Tour abgeschlossen', 'Du kennst jetzt alle Features! Viel Erfolg beim Tracken! 🚀', 'success');
    }

    function highlightElement(selector) {
        // Legacy - handled by renderOnboardingStep now
    }
    function closeQuickHelp() {
        const modal = document.getElementById('quickHelpModal');
        if (modal) modal.classList.remove('active');
    }
    
    
    // ===== SMART ALERTS SYSTEM (IMPROVED) =====
    let alertsHistory = [];
    let alertSettings = {
        saldoPositive: true,
        saldoNegative: true,
        shiftMax: true,
        vacationLow: true,
        exportReminder: true
    };
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
        
        // Restore UI state
        document.getElementById('alertSaldoPositive').checked = alertSettings.saldoPositive;
        document.getElementById('alertSaldoNegative').checked = alertSettings.saldoNegative;
        document.getElementById('alertShiftMax').checked = alertSettings.shiftMax;
        document.getElementById('alertVacationLow').checked = alertSettings.vacationLow;
        // neues Feld: Export/Backup Reminder
        try {
            const el = document.getElementById('alertExportReminder');
            if (el) el.checked = alertSettings.exportReminder;
        } catch (e) { /* ignore if element not yet present */ }
        
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
        alertSettings.saldoPositive = document.getElementById('alertSaldoPositive').checked;
        alertSettings.saldoNegative = document.getElementById('alertSaldoNegative').checked;
        alertSettings.shiftMax = document.getElementById('alertShiftMax').checked;
        alertSettings.vacationLow = document.getElementById('alertVacationLow').checked;
        // Export reminder setting
        try {
            alertSettings.exportReminder = document.getElementById('alertExportReminder').checked;
        } catch (e) { /* element might not exist in older builds */ }
        try {
            localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(alertSettings));
        } catch (e) {
            console.error('Failed to save alert settings:', e);
        }
    }

    function updateAlertExportInfo() {
        try {
            const last = localStorage.getItem('tt_last_export');
            const el = document.getElementById('lastExportInfo');
            if (!el) return;
            if (!last) {
                el.textContent = 'Noch kein Backup erstellt';
            } else {
                const d = new Date(last);
                el.textContent = d.toLocaleString('de-DE');
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
        const now = new Date();
        const today = now.toLocaleDateString('de-DE');
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
            const todayEntries = data.entries.filter(e => e.date === today && e.type === 'work');
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
        const autoIcon = icon || (type === 'danger' || type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️');

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
                <div style="font-size:1.35rem; flex-shrink:0; margin-top:1px;">${autoIcon}</div>
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:650; font-size:0.9rem; color:#fafafa; margin-bottom:3px; line-height:1.3;">${title}</div>
                    <div style="font-size:0.825rem; color:#a1a1aa; line-height:1.45;">${message}</div>
                </div>
                <button style="background:none; border:none; color:#52525b; cursor:pointer; font-size:18px; line-height:1; padding:0 0 0 4px; margin:-2px -4px 0 0; transition:color 0.15s;" onmouseover="this.style.color='#d4d4d8'" onmouseout="this.style.color='#52525b'">&times;</button>
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
            date: new Date().toLocaleDateString('de-DE'),
            time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
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
                <div class="alert-item-icon">${alert.icon}</div>
                <div class="alert-item-content">
                    <div class="alert-item-title" style="font-weight: ${alert.isRead ? '400' : '700'};">${alert.title}</div>
                    <div style="font-size:0.9rem; margin-bottom:4px; color:var(--text-main);">${alert.message}</div>
                    <div class="alert-item-time">${alert.date} · ${alert.time}</div>
                </div>
                <button class="alert-item-dismiss" onclick="dismissAlert(${alert.id})">×</button>
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
                        <div class="alert-item-icon">${alert.icon}</div>
                        <div class="alert-item-content">
                            <div class="alert-item-title">${alert.title}</div>
                            <div style="font-size:0.9rem; margin-bottom:4px;">${alert.message}</div>
                            <div class="alert-item-time">${alert.date} · ${alert.time}</div>
                        </div>
                        <button class="alert-item-dismiss" onclick="dismissAlert(${alert.id})">×</button>
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
    function renderMonthComparisonBlock(stats, prevStats, selectedMonth, prevMonth) {
        const container = document.getElementById('mcMonthComparisonBlock');
        if (!container) return;

        const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        const delta = prevStats.worked > 0 ? ((stats.worked - prevStats.worked) / prevStats.worked * 100) : (stats.worked > 0 ? 100 : 0);
        const deltaColor = delta >= 0 ? 'var(--success)' : 'var(--danger)';
        const deltaArrow = delta > 0 ? '↑' : (delta < 0 ? '↓' : '→');
        const deltaBg = delta >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
        const diffH = stats.worked - prevStats.worked;

        container.innerHTML = `
            <div class="week-cmp-block">
                <div class="week-cmp-label">${monthNames[prevMonth]} (Vormonat)</div>
                <div class="week-cmp-hours">${prevStats.worked.toFixed(1)}h</div>
                <div class="week-cmp-days">${prevStats.workDays} Tage | ${prevStats.saldo >= 0 ? '+' : ''}${prevStats.saldo.toFixed(1)}h Saldo</div>
            </div>
            <div class="week-cmp-delta">
                <div class="week-cmp-arrow" style="color:${deltaColor}">${deltaArrow}</div>
                <div class="week-cmp-pct" style="color:${deltaColor}; background:${deltaBg}">
                    ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%
                </div>
                <div style="font-size:0.72rem; color:${deltaColor}; font-family:var(--font-mono); margin-top:2px;">${diffH >= 0 ? '+' : ''}${diffH.toFixed(1)}h</div>
            </div>
            <div class="week-cmp-block" style="border-left:2px solid var(--primary-dim);">
                <div class="week-cmp-label">${monthNames[selectedMonth]} (Aktuell)</div>
                <div class="week-cmp-hours" style="color:var(--primary);">${stats.worked.toFixed(1)}h</div>
                <div class="week-cmp-days">${stats.workDays} Tage | ${stats.saldo >= 0 ? '+' : ''}${stats.saldo.toFixed(1)}h Saldo</div>
            </div>
        `;
    }
    function renderMonthWeeksList(stats) {
        const container = document.getElementById('mcWeeksList');
        container.innerHTML = '';
        
        if (stats.weeks.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">Keine Einträge in diesem Monat</div>';
            return;
        }
        
        stats.weeks.forEach(week => {
            const avgDay = week.entries > 0 ? week.hours / week.entries : 0;
            const saldo = week.hours - (week.entries * 8.75);
            const saldoColor = saldo >= 0 ? 'var(--success)' : 'var(--danger)';
            
            const card = document.createElement('div');
            card.className = 'card';
            card.style.borderLeft = `5px solid ${saldoColor}`;
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <div style="font-weight:600; font-size:1.1rem;">📅 Woche ${week.weekNum}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">${week.entries} Tage</div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Gesamt</div>
                        <div style="font-size:1.5rem; font-weight:700; font-family:var(--font-mono);" id="week-${week.weekNum}-total">${week.hours.toFixed(1)}h</div>
                    </div>
                    <div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">Ø pro Tag</div>
                        <div style="font-size:1.5rem; font-weight:700; font-family:var(--font-mono);">${avgDay.toFixed(1)}h</div>
                    </div>
                </div>
                <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:8px; border-left:3px solid ${saldoColor};">
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">⚖️ Saldo</div>
                    <div style="font-size:1.2rem; font-weight:700; color:${saldoColor}; font-family:var(--font-mono);">${saldo >= 0 ? '+' : ''}${saldo.toFixed(1)}h</div>
                </div>
            `;
            container.appendChild(card);
        });
    }
    function parseTime(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }
    function updateYearSelector() {
        const select = document.getElementById('yearSelector');
        if (!select) return;
        
        // Bestimme verfügbare Jahre aus den Daten
        const years = new Set();
        data.entries.forEach(e => {
            const year = new Date(e.date).getFullYear();
            years.add(year);
        });
        
        // Aktuelles Jahr hinzufügen
        years.add(new Date().getFullYear());
        
        // Jahre sortieren (aufsteigend)
        const sortedYears = Array.from(years).sort((a, b) => a - b);
        
        // Select füllen
        let html = '';
        sortedYears.forEach(year => {
            const selected = year === selectedYearForView ? 'selected' : '';
            html += `<option value="${year}" ${selected}>${year}</option>`;
        });
        
        select.innerHTML = html;
    }
    
    function onYearSelectorChange() {
        const select = document.getElementById('yearSelector');
        selectedYearForView = parseInt(select.value);
        renderYearView();
    }
    
    
    function calculateYearlyStats(year = new Date().getFullYear()) {
        const daysByMonth = {};
        let totalWorked = 0;
        let workDays = 0;
        let vacationDays = 0;
        let holidayDays = 0;
        let totalSaldo = 0;
        const weeklyDiffs = {};
        let bestWeek = 0;
        let bestWeekValue = 0;
        
        // Initialisiere Monate
        for (let i = 0; i < 12; i++) {
            daysByMonth[i] = { worked: 0, saldo: 0, count: 0, days: [], vacationDays: 0, holidayDays: 0 };
        }
        
        // Durchlaufe alle Einträge
        data.entries.forEach(e => {
            const entryDate = new Date(e.date);
            if (entryDate.getFullYear() !== year) return;
            
            const month = entryDate.getMonth();
            const week = getWeek(entryDate);
            
            daysByMonth[month].worked += e.worked;
            daysByMonth[month].saldo += e.diff;
            daysByMonth[month].count++;
            daysByMonth[month].days.push({
                date: e.date,
                diff: e.diff,
                worked: e.worked,
                type: e.type
            });
            
            totalWorked += e.worked;
            totalSaldo += e.diff;
            
            if (e.type === 'work') {
                workDays++;
            } else if (e.type === 'vacation') {
                vacationDays++;
                daysByMonth[month].vacationDays++;
            } else if (e.type === 'gleittag') {
                // Gleittag: zählt nicht als Urlaub/Feiertag
            } else if (e.type === 'holiday') {
                holidayDays++;
                daysByMonth[month].holidayDays++;
            }
            
            // Wöchentliche Diffs
            if (!weeklyDiffs[week]) weeklyDiffs[week] = 0;
            weeklyDiffs[week] += e.diff;
        });
        
        // Beste Woche finden
        for (const week in weeklyDiffs) {
            if (weeklyDiffs[week] > bestWeekValue) {
                bestWeek = week;
                bestWeekValue = weeklyDiffs[week];
            }
        }
        
        const avgDaily = workDays > 0 ? totalWorked / workDays : 0;
        
        return {
            totalWorked,
            avgDaily,
            endSaldo: totalSaldo,
            bestWeek,
            bestWeekValue,
            daysByMonth,
            workDays,
            vacationDays,
            holidayDays,
            weeklyDiffs
        };
    }
    
    function renderYearHeatmap(yearStats, year = new Date().getFullYear()) {
        const container = document.getElementById('yearHeatmap');
        const now = new Date();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        // Erstelle Map aller Einträge für schnelle Zugriffe
        const entryMap = {};
        data.entries.forEach(e => {
            if (new Date(e.date).getFullYear() === year) {
                entryMap[e.date] = e;
            }
        });
        
        let html = '<div style="display:grid; gap:2rem;">';
        
        // Für jeden Monat
        for (let month = 0; month < 12; month++) {
            const monthDate = new Date(year, month, 1);
            const monthName = monthDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            html += `<div>
                <h4 style="font-size:0.95rem; margin-bottom:1rem; color:var(--text-main);">${monthName}</h4>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px;">`;
            
            // Wochentag-Header (Mo-So)
            const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const startDayOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
            
            // Leere Zellen am Anfang
            for (let i = 0; i < startDayOffset; i++) {
                html += '<div style="width:32px; height:32px;"></div>';
            }
            
            // Tage des Monats
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const entry = entryMap[dateStr];
                const cellDate = new Date(year, month, day);
                const dayOfWeek = cellDate.getDay();
                const isWeekend = (data.settings.hours[dayOfWeek] || 0) <= 0 && (dayOfWeek === 0 || dayOfWeek === 6);
                
                let color = '#475569'; // Grau = kein Eintrag
                let opacity = '0.3';
                
                if (entry) {
                    // PRIORTÄT 1: Prüfe auf Urlaub/Feiertag
                    if (entry.type === 'vacation') {
                        color = '#3b82f6'; // Blau für Urlaub 🌴
                        opacity = '0.85';
                    } else if (entry.type === 'holiday') {
                        color = '#f59e0b'; // Orange für Feiertag 🏖️
                        opacity = '0.85';
                    } else if (entry.type === 'sick') {
                        color = '#ec4899'; // Pink für Krankheit
                        opacity = '0.75';
                    } else if (entry.type === 'gleittag') {
                        color = '#f59e0b'; // Amber für Gleittag ⚡
                        opacity = '0.75';
                    } else {
                        // PRIORITÄT 2: Farbe basierend auf diff (Saldo)
                        const diff = entry.diff;
                        if (diff < -1) {
                            color = '#ef4444'; // Rot = sehr negativ
                            opacity = '0.8';
                        } else if (diff < 0) {
                            color = '#ef4444'; // Rot = negativ
                            opacity = '0.5';
                        } else if (diff < 0.5) {
                            color = '#fbbf24'; // Gelb = leicht positiv
                            opacity = '0.6';
                        } else if (diff < 3) {
                            color = '#10b981'; // Grün = positiv
                            opacity = '0.7';
                        } else {
                            color = 'var(--primary)'; // Lila = sehr positiv
                            opacity = '0.9';
                        }
                    }
                } else if (isWeekend) {
                    opacity = '0.15';
                }
                
                const isToday = cellDate.toDateString() === now.toDateString();
                const border = isToday ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)';
                let typeLabel = '';
                if (entry) {
                    if (entry.type === 'vacation') typeLabel = ' 🌴 Urlaub';
                    else if (entry.type === 'holiday') typeLabel = ' 🏖️ Feiertag';
                    else if (entry.type === 'sick') typeLabel = ' 🤒 Krankheit';
                    else if (entry.type === 'school') typeLabel = ' 📚 Schule';
                    else if (entry.type === 'gleittag') typeLabel = ' ⚡ Gleittag';
                    else typeLabel = ' 💼 Arbeit';
                }
                const tooltip = entry ? `${entry.worked.toFixed(1)}h (${entry.diff >= 0 ? '+' : ''}${entry.diff.toFixed(1)}h)${typeLabel}` : 'Kein Eintrag';
                
                html += `
                    <div style="width:32px; height:32px; background:${color}; opacity:${opacity}; border-radius:6px; border:${border}; cursor:pointer; transition:all 0.2s;" 
                         title="${dateStr}: ${tooltip}"
                         onmouseover="this.style.transform='scale(1.2)'; this.style.zIndex='10';"
                         onmouseout="this.style.transform='scale(1)'; this.style.zIndex='0';">
                    </div>
                `;
            }
            
            html += '</div></div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    function generateYearInsights(yearStats, year = new Date().getFullYear()) {
        const container = document.getElementById('yearInsights');
        const insights = [];
        
        // Insight 1: Durchschnitt
        const avgMonthly = yearStats.totalWorked / 12;
        insights.push({
            icon: '📊',
            title: 'Durchschnittliche Monatsleistung',
            value: `${avgMonthly.toFixed(1)}h`,
            description: `Du arbeitest durchschnittlich ${avgMonthly.toFixed(1)} Stunden pro Monat.`
        });
        
        // Insight 2: Beste Leistung
        const maxMonth = Math.max(...Object.values(yearStats.daysByMonth).map(m => m.worked));
        const bestMonth = Object.entries(yearStats.daysByMonth).find(([_, m]) => m.worked === maxMonth);
        if (bestMonth) {
            const monthName = new Date(year, parseInt(bestMonth[0]), 1).toLocaleDateString('de-DE', { month: 'long' });
            insights.push({
                icon: '🏆',
                title: 'Dein stärkster Monat',
                value: monthName,
                description: `${bestMonth[1].worked.toFixed(0)}h Arbeit, ${bestMonth[1].count} Arbeitstage.`
            });
        }
        
        // Insight 3: Saldo-Trend
        const saldoTrend = yearStats.endSaldo > 0 ? 'positiv' : (yearStats.endSaldo < 0 ? 'negativ' : 'ausgeglichen');
        const trendEmoji = yearStats.endSaldo > 0 ? '📈' : (yearStats.endSaldo < 0 ? '📉' : '➡️');
        insights.push({
            icon: trendEmoji,
            title: 'Jahres-Saldo Trend',
            value: (yearStats.endSaldo >= 0 ? '+' : '') + yearStats.endSaldo.toFixed(1) + 'h',
            description: `Dein Jahres-Saldo ist ${saldoTrend}. Solltest du mehr arbeiten, um auszugleichen?`,
            color: yearStats.endSaldo > 0 ? 'var(--success)' : (yearStats.endSaldo < 0 ? 'var(--danger)' : 'var(--primary)')
        });
        
        // Insight 4: Konsistenz
        const consistencyScore = (yearStats.workDays / 250) * 100; // 250 Arbeitstage im Jahr
        const consistencyLevel = consistencyScore > 80 ? 'Sehr gut' : (consistencyScore > 60 ? 'Gut' : 'Könnte besser sein');
        insights.push({
            icon: '⭐',
            title: 'Konsistenz-Score',
            value: `${Math.min(100, consistencyScore).toFixed(0)}%`,
            description: `Du warst ${consistencyLevel} dabei. ${consistencyScore < 80 ? 'Versuche, regelmäßiger zu arbeiten!' : 'Großartig!'}`
        });
        
        // Insight 5: Beste Woche
        insights.push({
            icon: '🎯',
            title: 'Deine produktivste Woche',
            value: `KW ${yearStats.bestWeek}`,
            description: `${yearStats.bestWeekValue.toFixed(1)}h Saldo in dieser Woche. Das war ein Spitzenwert!`
        });
        
        // Insight 6: Prognose (nur für aktuelles Jahr)
        if (year === new Date().getFullYear()) {
            const now = new Date();
            const daysLeft = 365 - Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24));
            const avgDaily = yearStats.avgDaily;
            const projectedSaldo = yearStats.endSaldo + (daysLeft * (avgDaily - 8) / 5);
            insights.push({
                icon: '🔮',
                title: 'Jahresende Prognose',
                value: (projectedSaldo >= 0 ? '+' : '') + projectedSaldo.toFixed(1) + 'h',
                description: `Basierend auf deinem aktuellen Tempo wirst du mit einem Saldo von ${projectedSaldo.toFixed(1)}h das Jahr beenden.`
            });
        }
        
        // HTML rendern
        let html = '';
        insights.forEach((insight, i) => {
            const color = insight.color || (i % 3 === 0 ? 'var(--primary)' : (i % 3 === 1 ? 'var(--success)' : '#06b6d4'));
            html += `
                <div class="card" style="border-left: 5px solid ${color}; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 3rem; opacity: 0.1;">${insight.icon}</div>
                    
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">${insight.icon} ${insight.title}</div>
                    <div style="font-size:2rem; font-weight:800; color:${color}; margin:10px 0; font-family:var(--font-mono);">${insight.value}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">${insight.description}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    function renderMonthlyComparison(yearStats, year = new Date().getFullYear()) {
        const container = document.getElementById('yearMonthlyComparison');
        const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        
        let html = '';
        for (let i = 0; i < 12; i++) {
            const monthData = yearStats.daysByMonth[i];
            const maxWorked = Math.max(...Object.values(yearStats.daysByMonth).map(m => m.worked)) || 1;
            const barHeight = (monthData.worked / maxWorked) * 100;
            
            const saldoColor = monthData.saldo > 0 ? 'var(--success)' : (monthData.saldo < 0 ? 'var(--danger)' : '#64748b');
            
            html += `
                <div style="display:flex; flex-direction:column; align-items:center; padding:15px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.1); transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.transform='translateY(-4px)';" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.transform='translateY(0)';">
                    <div style="font-weight:700; color:var(--text-main); margin-bottom:8px;">${monthNames[i]}</div>
                    <div style="width:40px; height:60px; background:var(--primary); border-radius:6px; opacity:0.6; margin-bottom:10px; position:relative;" title="${monthData.worked.toFixed(0)}h">
                        <div style="width:100%; height:${barHeight}%; background:linear-gradient(180deg, var(--primary), rgba(var(--primary-rgb),0.5)); border-radius:6px; position:absolute; bottom:0; transition:all 0.3s;"></div>
                    </div>
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-main); font-family:var(--font-mono);">${monthData.worked.toFixed(0)}h</div>
                    <div style="font-size:0.75rem; color:${saldoColor}; margin-top:4px; font-family:var(--font-mono);">${monthData.saldo >= 0 ? '+' : ''}${monthData.saldo.toFixed(1)}h</div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }

    // ===== INITIALIZATION (NEU) =====
    function initializeApp() {
        // Load data from localStorage
        const saved = localStorage.getItem('tg_pro_data');
        if (saved) {
            data = JSON.parse(saved);
        }
        
        // Initialize Alerts System
        initializeAlerts();
        
        // Load timer state
        const timerSaved = localStorage.getItem('tg_timer');
        if (timerSaved) {
            timer = JSON.parse(timerSaved);
        }
        
        // Draft persistence key
        const DRAFT_KEY = 'tt_entry_draft';

        // Load draft (if any) and populate inputs
        function loadDraft() {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('inpDate');

                if (!raw) {
                    if (dateInput && !dateInput.value) dateInput.value = today;
                    return;
                }

                const draft = JSON.parse(raw);
                if (dateInput) dateInput.value = draft.date || draft.dateStr || today;
                const type = document.getElementById('inpType'); if (type && draft.type) type.value = draft.type;
                const project = document.getElementById('inpProject'); if (project && draft.project) project.value = draft.project;
                const start = document.getElementById('inpStart'); if (start && draft.start) start.value = draft.start;
                const end = document.getElementById('inpEnd'); if (end && draft.end) end.value = draft.end;
                const hours = document.getElementById('inpHours'); if (hours && draft.hours) hours.value = draft.hours;
                const notes = document.getElementById('inpNotes'); if (notes && draft.notes) notes.value = draft.notes;
            } catch (e) {
                console.warn('Failed to load draft:', e);
            }
        }

        // Save current form as draft
        function saveDraft() {
            try {
                const draft = {
                    date: document.getElementById('inpDate')?.value || '',
                    type: document.getElementById('inpType')?.value || '',
                    project: document.getElementById('inpProject')?.value || '',
                    start: document.getElementById('inpStart')?.value || '',
                    end: document.getElementById('inpEnd')?.value || '',
                    hours: document.getElementById('inpHours')?.value || '',
                    notes: document.getElementById('inpNotes')?.value || ''
                };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                console.log('Draft saved:', draft);
                if (typeof window.updateDraftUI === 'function') window.updateDraftUI();
            } catch (e) {
                console.warn('Failed to save draft:', e);
            }
        }

        function clearDraft() {
            try { localStorage.removeItem(DRAFT_KEY); } catch(e){}
            if (typeof window.updateDraftUI === 'function') window.updateDraftUI();
        }

        // Update draft indicator UI (shows/hides badge & buttons)
        function updateDraftUI() {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                const badge = document.getElementById('draftBadge');
                const btnRestore = document.getElementById('btnRestoreDraft');
                const btnDelete = document.getElementById('btnDeleteDraft');
                const container = document.getElementById('draftNotice');

                const has = !!raw;
                if (container) container.style.display = has ? 'flex' : 'none';
                if (badge) badge.style.display = has ? 'inline-block' : 'none';
                if (btnRestore) btnRestore.style.display = has ? 'inline-block' : 'none';
                if (btnDelete) btnDelete.style.display = has ? 'inline-block' : 'none';
            } catch (e) { console.warn('updateDraftUI error', e); }
        }

        // Restore draft into fields (keeps draft in storage)
        function restoreDraft() {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                if (!raw) return;
                const draft = JSON.parse(raw);
                document.getElementById('inpDate').value = draft.date || '';
                document.getElementById('inpType').value = draft.type || 'work';
                document.getElementById('inpProject').value = draft.project || '';
                document.getElementById('inpStart').value = draft.start || '';
                document.getElementById('inpEnd').value = draft.end || '';
                document.getElementById('inpHours').value = draft.hours || '';
                document.getElementById('inpNotes').value = draft.notes || '';
                // After restoring, remove the draft (Wiederherstellen löscht Entwurf)
                clearDraft();
                updateDraftUI();
                showCustomMessage && showCustomMessage('✅ Entwurf wiederhergestellt', 'Der gespeicherte Entwurf wurde in das Formular geladen und entfernt.', 'success');
            } catch(e) { console.warn('restoreDraft', e); }
        }

        // Delete draft from storage and update UI
        function deleteDraft() {
            try { clearDraft(); showCustomMessage && showCustomMessage('✅ Entwurf gelöscht', 'Der gespeicherte Entwurf wurde entfernt.', 'success'); } catch(e) { console.warn(e); }
        }

        // Expose restore/delete/update to global scope so buttons can call them
        window.restoreDraft = restoreDraft;
        window.deleteDraft = deleteDraft;
        window.updateDraftUI = updateDraftUI;

        // Attach listeners to save draft on change/input (using Event Delegation for robustness)
        function attachDraftListeners() {
            const ids = ['inpDate','inpType','inpProject','inpStart','inpEnd','inpHours','inpNotes'];
            document.addEventListener('input', (e) => {
                if (ids.includes(e.target.id)) {
                    saveDraft();
                }
            });
            document.addEventListener('change', (e) => {
                if (ids.includes(e.target.id)) {
                    saveDraft();
                }
            });
            console.log('📝 Draft listeners attached with Event Delegation for: ' + ids.join(', '));
        }

        // Load draft before setting defaults
        loadDraft();
        attachDraftListeners();
        updateDraftUI();

        // Ensure default date if none set by draft
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('inpDate');
        if (dateInput && !dateInput.value) dateInput.value = today;

        // --- Jetzt-Buttons (mit Event Delegation) ---
        function pad2(n){return n<10?('0'+n):n}
        
        // Use event delegation instead of direct listeners (more robust)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btnNowStart') {
                const now = new Date();
                const v = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
                const el = document.getElementById('inpStart'); 
                if (el) {
                    el.value = v;
                    el.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event
                    saveDraft();
                    if (typeof showCustomMessage === 'function') showCustomMessage('✅ Start gesetzt', `Start: ${v}`, 'success');
                }
            }
            if (e.target.id === 'btnNowEnd') {
                const now = new Date();
                const v = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
                const el = document.getElementById('inpEnd'); 
                if (el) {
                    el.value = v;
                    el.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event
                    saveDraft();
                    if (typeof showCustomMessage === 'function') showCustomMessage('✅ Ende gesetzt', `Ende: ${v}`, 'success');
                }
            }
        });

        // --- Keyboard Shortcuts ---
        document.addEventListener('keydown', (e) => {
            // Allow disabling shortcuts via settings
            if (data && data.settings && data.settings.shortcutsEnabled === false) return;
            // Ctrl/Cmd + Enter -> save entry (allow from inputs)
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleEntry();
                return;
            }

            // Avoid interfering while typing in textareas/inputs/selects (except if user explicitly wants shortcuts)
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                // Allow single-letter shortcuts only when not typing in a text input of type text/textarea
                const type = e.target.type || '';
                if (tag === 'INPUT' && (type === 'text' || type === 'search' || type === 'email' || type === 'tel' || type === 'password')) return;
            }

            // Global single-key shortcuts
            const key = e.key.toLowerCase();
            if (key === 's') { e.preventDefault(); timerAction('start'); if (typeof showCustomMessage === 'function') showCustomMessage('▶ Timer', 'Start', 'info'); }
            else if (key === 'p') { e.preventDefault(); timerAction('pause'); if (typeof showCustomMessage === 'function') showCustomMessage('II Timer', 'Pause', 'info'); }
            else if (key === 'e') { e.preventDefault(); timerAction('stop'); if (typeof showCustomMessage === 'function') showCustomMessage('■ Timer', 'Stop', 'info'); }
        });

        // Initial UI render
        recalculateVacationUsed();
        updateUI();
        
        console.log('✅ App initialized with Smart Alerts enabled');
        
        // Initialize dashboard layout
        loadDashboardLayout();
        
        // Initialize all widgets
        setTimeout(() => {
            initializeAllWidgets();
        }, 200);
    }

    // ============================================
    // DASHBOARD LAYOUT MANAGEMENT (FULL REDESIGN)
    // ============================================
    
    function toggleDashboardEditMode() {
        const container = document.getElementById('dashboardContainer');
        const btnEdit = document.getElementById('btnEditLayout');
        const btnReset = document.getElementById('btnResetLayout');
        const btnCancel = document.getElementById('dashboardCancelBtn');
        const editControls = document.getElementById('dashboardEditControls');
        const statusEl = document.getElementById('editModeStatus');
        
        if (!container) return;
        
        container.classList.toggle('edit-mode');
        
        if (container.classList.contains('edit-mode')) {
            btnEdit.textContent = '✓ Layout speichern';
            btnEdit.classList.add('btn-success');
            btnEdit.classList.remove('btn-primary');
            btnReset.style.display = 'inline-block';
            if (btnCancel) btnCancel.style.display = 'inline-block';
            if (editControls) editControls.style.opacity = '1';
            if (editControls) editControls.style.pointerEvents = 'auto';
            if (statusEl) statusEl.style.opacity = '1';
            console.log('Entering edit mode, setting up drag drop');
            setupDashboardDragDrop();
        } else {
            btnEdit.textContent = '🔧 Layout editieren';
            btnEdit.classList.add('btn-primary');
            btnEdit.classList.remove('btn-success');
            btnReset.style.display = 'none';
            if (btnCancel) btnCancel.style.display = 'none';
            if (editControls) editControls.style.opacity = '0';
            if (editControls) editControls.style.pointerEvents = 'none';
            if (statusEl) statusEl.style.opacity = '0';
            
            // Disable all drag drop handlers
            console.log('Exiting edit mode, disabling drag drop');
            disableDashboardDragDrop();
            
            // Remove all remove buttons when exiting edit mode
            console.log('Exiting edit mode, removing remove buttons');
            container.querySelectorAll('.dashboard-item-remove-btn').forEach(btn => {
                console.log('Removing remove button');
                btn.remove();
            });
            
            // If layout was modified while editing, save the final order now (quietly)
            if (dashboardLayoutDirty) {
                saveWidgetLayout(true); // notify user once
            } else {
                saveDashboardLayout();
            }
        }
    }
    function resetDashboardLayout() {
        localStorage.removeItem('tt_dashboard_layout');
        // Also clear the widgetLayout stored in settings so applyWidgetLayout does not re-apply a saved custom layout
        if (data && data.settings) {
            delete data.settings.widgetLayout;
            try { save(); } catch(e) { console.warn('Failed to save data on resetDashboardLayout', e); }
        }
        // Reload the page to reset layout
        location.reload();
    }
    
    function setupDashboardDragDrop() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        // NUR wenn im Edit-Mode aktiv!
        if (!container.classList.contains('edit-mode')) {
            console.log('Not in edit mode, skipping drag setup');
            return;
        }
        
        const items = container.querySelectorAll('.dashboard-item');
        let draggedItem = null;
        
        // Remove existing remove buttons FIRST
        console.log('Removing existing remove buttons');
        container.querySelectorAll('.dashboard-item-remove-btn').forEach(btn => {
            console.log('Removing existing button');
            btn.remove();
        });

        // Add remove buttons if in edit mode
        if (container.classList.contains('edit-mode')) {
            console.log('Adding remove buttons for', items.length, 'items');
            items.forEach((item, index) => {
                console.log('Adding remove button to item', index, item.getAttribute('data-item-id'));
                const removeBtn = document.createElement('button');
                removeBtn.className = 'dashboard-item-remove-btn';
                removeBtn.innerHTML = '🗑️';
                removeBtn.title = 'Widget entfernen';
                removeBtn.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(239, 68, 68, 0.95);
                    color: white;
                    border: 2px solid white;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                    cursor: pointer;
                    z-index: 100;
                    opacity: 0.9;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                `;
                removeBtn.onmouseover = () => {
                    removeBtn.style.opacity = '1';
                    removeBtn.style.transform = 'scale(1.1)';
                };
                removeBtn.onmouseout = () => {
                    removeBtn.style.opacity = '0.9';
                    removeBtn.style.transform = 'scale(1)';
                };
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    const widgetId = item.getAttribute('data-item-id');
                    console.log('Remove button clicked for widget:', widgetId);
                    removeWidget(widgetId);
                };
                item.style.position = 'relative';
                item.appendChild(removeBtn);
                console.log('Remove button added to item', index);
            });
        }
        
        items.forEach(item => {
            // WICHTIG: Nur im Edit-Mode draggable machen!
            item.draggable = true;
            
            // Benutzerdefinierten Handler setzen (nicht addEventListener, um Duplikate zu vermeiden)
            item.ondragstart = (e) => {
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.getAttribute('data-item-id'));
            };
            
            item.ondragend = () => {
                draggedItem = null;
                item.classList.remove('dragging');
            };
            
            item.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (!draggedItem) return;
                
                const afterElement = getDragAfterElement(container, e.clientY);
                if (afterElement == null) {
                    container.appendChild(draggedItem);
                } else {
                    container.insertBefore(draggedItem, afterElement);
                }
            };
        });
        
        // Drop handler
        container.ondrop = (e) => {
            e.preventDefault();
        };
    }
    
    function disableDashboardDragDrop() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        const items = container.querySelectorAll('.dashboard-item');
        items.forEach(item => {
            // Alle Drag-Handler entfernen
            item.draggable = false;
            item.ondragstart = null;
            item.ondragend = null;
            item.ondragover = null;
        });
        
        // Container drop handler entfernen
        container.ondrop = null;
    }
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.dashboard-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    function saveDashboardLayout() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        const order = Array.from(container.querySelectorAll('.dashboard-item')).map(item => {
            return item.getAttribute('data-item-id');
        }).filter(Boolean);
        
        if (order.length > 0) {
            localStorage.setItem('tt_dashboard_layout', JSON.stringify(order));
            console.log('✅ Dashboard layout saved:', order);
        }
    }
    
    function loadDashboardLayout() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        disableDashboardDragDrop();
        
        // Wait a tick for DOM to be ready
        setTimeout(() => {
            const savedOrder = localStorage.getItem('tt_dashboard_layout');
            if (savedOrder) {
                try {
                    const order = JSON.parse(savedOrder);
                    const items = Array.from(container.querySelectorAll('.dashboard-item'));
                    
                    // WICHTIG: Clone alle Items um alte Event Listener zu entfernen!
                    const clonedItems = items.map(item => {
                        const clone = item.cloneNode(true);
                        clone.draggable = false;
                        clone.ondragstart = null;
                        clone.ondragend = null;
                        clone.ondragover = null;
                        return clone;
                    });
                    
                    // Reorder geclonte Items basierend auf saved order
                    const cloneMap = new Map(clonedItems.map(clone => [
                        clone.getAttribute('data-item-id'),
                        clone
                    ]));
                    
                    // Ersetze alte Items mit geclonten Versionen in der richtigen Reihenfolge
                    order.forEach(itemId => {
                        if (cloneMap.has(itemId)) {
                            const clone = cloneMap.get(itemId);
                            const oldItem = items.find(el => el.getAttribute('data-item-id') === itemId);
                            if (oldItem && oldItem.parentNode) {
                                oldItem.parentNode.replaceChild(clone, oldItem);
                                container.appendChild(clone);  // Append to end in correct order
                            }
                        }
                    });
                    
                    console.log('✅ Dashboard layout loaded with fresh items (no event listeners)');
                } catch (e) {
                    console.error('Failed to load dashboard layout:', e);
                }
            }
        }, 100);
    }

    // ============================================
    // WIDGET MANAGER SYSTEM
    // ============================================

    // Widget Library
    const widgetLibrary = {
        'kpi-cards': {
            name: 'KPI Karten',
            description: 'Wochen-, Monats- und Gleitzeit-Übersicht',
            icon: '📊',
            defaultEnabled: true,
            html: `
                <div class="kpi-grid" id="dashboardGrid">
                    <div class="card kpi-card" onclick="openCorrection('week')">
                        <div class="progress-ring">
                            <svg width="100" height="100">
                                <circle class="ring-bg" cx="50" cy="50" r="44"></circle>
                                <circle id="ringWeek" class="ring-val" cx="50" cy="50" r="44" stroke-dasharray="276" stroke-dashoffset="276"></circle>
                            </svg>
                            <div class="ring-center">
                                <div class="ring-num" id="valWeek">0</div>
                                <div class="ring-lbl">Woche</div>
                            </div>
                        </div>
                    </div>
                    <div class="card kpi-card" onclick="openCorrection('month')">
                        <div class="progress-ring">
                            <svg width="100" height="100">
                                <circle class="ring-bg" cx="50" cy="50" r="44"></circle>
                                <circle id="ringMonth" class="ring-val" cx="50" cy="50" r="44" stroke-dasharray="276" stroke-dashoffset="276"></circle>
                            </svg>
                            <div class="ring-center">
                                <div class="ring-num" id="valMonth">0</div>
                                <div class="ring-lbl">Monat</div>
                            </div>
                        </div>
                    </div>
                    <div class="card" style="display:flex; flex-direction:column; justify-content:center;">
                        <div class="ring-lbl">GLEITZEIT KONTO</div>
                        <div style="font-size:2.8rem; font-weight:800; color:var(--primary); margin:10px 0; font-family:var(--font-mono); letter-spacing:-2px;" id="valTotal">+0.0h</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Prognose: <span id="valProjected" style="color:var(--text-main)">0h</span></div>
                        <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:6px; font-size:0.8rem;">
                            <span id="streakEmoji" class="streak-active" style="font-size:1rem;">🔥</span>
                            <span style="color:var(--text-muted);">Streak:</span>
                            <span id="streakCount" style="color:var(--success); font-weight:800;">0</span>
                            <span style="font-size:0.7rem; color:var(--text-muted);" id="streakBest">Best: 0</span>
                        </div>
                    </div>
                    <div class="card" style="display:flex; flex-direction:column; justify-content:center;">
                        <div class="ring-lbl">Ø TÄGLICH</div>
                        <div style="font-size:2rem; font-weight:800; color:var(--text-main); margin:5px 0; font-family:var(--font-mono);" id="valAvg">0.0h</div>
                        <div style="margin-top:auto; width:100%;">
                            <div class="ring-lbl" style="margin-bottom:5px; display:flex; justify-content:space-between;">
                                <span>Urlaubstage</span>
                                <span id="valVacationUsed">0 / 30</span>
                            </div>
                            <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div id="vacationProgressBar" style="width:0%; background:var(--success); height:100%;"></div></div>
                        </div>
                    </div>
                </div>
            `
        },
        'quick-actions': {
            name: 'Schnellaktionen',
            description: 'Direkter Zugriff auf häufige Aktionen',
            icon: '⚡',
            defaultEnabled: true,
            html: `
                <div class="quick-actions" id="cmdBar">
                    <button onclick="openCorrection('month')">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M3 6h18M3 18h18"/></svg></span>
                        <span class="cmd-label">Saldo</span>
                    </button>
                    <div class="cmd-sep"></div>
                    <button onclick="checkAndBookHolidays()" id="cmdHolidayCheck">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M14.5 2c1.4 0 2.5 1.1 2.5 2.5S15.9 7 14.5 7 12 5.9 12 4.5 13.1 2 14.5 2z"/><path d="M18 14l-4-4-4 4"/><path d="M6 22V9"/><path d="M18 22V9"/><path d="M2 22h20"/></svg></span>
                        <span class="cmd-label">Feiertage</span>
                    </button>
                    <button disabled>
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 018 4"/><path d="M5 19.5C5.5 18 6 15 6 12"/><path d="M21 12c0 1.5-.5 3-1.5 4.5"/><path d="M12 2c2 2 3 5 3 10"/><path d="M12 2c-2 2-3 5-3 10"/><path d="M18 22l4-4-4-4"/><path d="M22 18h-7"/></svg></span>
                        <span class="cmd-label">NFC</span>
                    </button>
                    <button onclick="window.location.href='Pages/App/berichtsheft.html'">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                        <span class="cmd-label">Berichtsheft</span>
                    </button>
                    <button onclick="openSkillCardModal()">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7v1"/><path d="M12 7v1"/><path d="M16 7v1"/><path d="M8 15h8"/><path d="M8 11h4"/></svg></span>
                        <span class="cmd-label">Skill-Card</span>
                    </button>
                    <button onclick="startFocusMode()">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
                        <span class="cmd-label">Focus</span>
                    </button>
                    <div class="cmd-sep"></div>
                    <button onclick="openSettings()">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>
                        <span class="cmd-label">Settings</span>
                    </button>
                    <button onclick="openMoreActionsModal()">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></span>
                        <span class="cmd-label">Mehr</span>
                    </button>
                </div>
            `
        },

        'charts': {
            name: 'Diagramme',
            description: 'Saldo-Trend und Arbeitszeit-Verteilung',
            icon: '📈',
            defaultEnabled: true,
            html: `
                <div class="charts-row">
                    <div class="card">
                        <div class="chart-header">
                            <div>
                                <div class="chart-title">Saldo Trend</div>
                                <div class="chart-sub">Entwicklung der letzten 30 Tage</div>
                            </div>
                        </div>
                        <div class="trend-container" id="trendChart"></div>
                    </div>
                    <div class="card">
                        <div class="chart-header">
                            <div class="chart-title">Verteilung</div>
                        </div>
                        <div class="donut-container">
                            <svg width="150" height="150" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="12"></circle>
                                <circle id="donutSick" cx="50" cy="50" r="40" fill="transparent" stroke="var(--danger)" stroke-width="12" stroke-dasharray="0 251"></circle>
                                <circle id="donutVac" cx="50" cy="50" r="40" fill="transparent" stroke="var(--success)" stroke-width="12" stroke-dasharray="0 251"></circle>
                                <circle id="donutSchool" cx="50" cy="50" r="40" fill="transparent" stroke="var(--school)" stroke-width="12" stroke-dasharray="0 251"></circle>
                            </svg>
                        </div>
                    </div>
                </div>
            `
        },
        'entry-form': {
            name: 'Eingabeformular',
            description: 'Schnelle Zeiteingabe direkt im Dashboard',
            icon: '✏️',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem;">
                    <h4 style="margin:0 0 1rem 0; color:var(--primary); font-size:1rem;">⏱️ Schnelle Eingabe</h4>
                    <form onsubmit="quickAddEntry(event)" style="display:flex; gap:12px; align-items:flex-end;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">Projekt</label>
                            <input type="text" id="quickProject" class="glass-input" placeholder="Projekt..." style="width:100%;" required>
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">Stunden</label>
                            <input type="number" id="quickHours" class="glass-input" placeholder="0.0" step="0.25" min="0" style="width:100%;" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="padding:10px 16px;">➕ Hinzufügen</button>
                    </form>
                </div>
            `
        },
        'last-activities': {
            name: 'Letzte Aktivitäten',
            description: 'Übersicht der letzten Arbeitszeiteinträge',
            icon: '📋',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem;">
                    <h4 style="margin:0 0 1rem 0; color:var(--primary); font-size:1rem;">📋 Letzte Aktivitäten</h4>
                    <div id="lastActivitiesList" style="max-height:200px; overflow-y:auto;">
                        <!-- Wird per JS gefüllt -->
                    </div>
                </div>
            `
        },
        'mood-tracker': {
            name: 'Stimmungs-Tracker',
            description: 'Verfolge deine Stimmung nach Arbeitstagen',
            icon: '😊',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem;">
                    <h4 style="margin:0 0 1rem 0; color:var(--primary); font-size:1rem;">😊 Stimmungs-Tracker</h4>
                    <div id="moodStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap:8px; margin-bottom:1rem;">
                        <!-- Wird per JS gefüllt -->
                    </div>
                    <button onclick="openMoodSelector()" class="btn btn-secondary" style="width:100%;">Stimmung hinzufügen</button>
                </div>
            `
        },
        'productivity-score': {
            name: 'Produktivitäts-Score',
            description: 'Persönlicher Produktivitäts-Score basierend auf Mustern',
            icon: '🎯',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem; background:linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 100%); border:1px solid rgba(245,158,11,0.2);">
                    <h4 style="margin:0 0 1rem 0; color:#f59e0b; font-size:1rem;">🎯 Produktivitäts-Score</h4>
                    <div style="text-align:center;">
                        <div style="font-size:3rem; font-weight:800; color:#f59e0b; margin:1rem 0;" id="productivityScoreWidget">--</div>
                        <div style="font-size:0.9rem; color:var(--text-muted);" id="productivityDescription">Berechne deinen Score...</div>
                    </div>
                </div>
            `
        },
        'quick-templates': {
            name: 'Schnelleintrag',
            description: '⚡ 1-Klick Vorlagen für Arbeitstag, Schultag, etc.',
            icon: '⚡',
            defaultEnabled: true,
            html: `
                <div class="card" style="padding:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                        <div class="chart-title">⚡ Schnelleintrag</div>
                        <span style="font-size:0.7rem; color:var(--text-muted);">1-Klick Vorlagen</span>
                    </div>
                    <div id="quickTemplatesGrid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
                        <!-- filled by JS -->
                    </div>
                </div>
            `
        }
    };

    function openWidgetManager() {
        console.log('Opening widget manager - EXTREME MODE');
        const modal = document.getElementById('widgetManagerModal');
        console.log('Modal element:', modal);

        if (modal) {
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0px !important;
                left: 0px !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(255, 0, 0, 0.95) !important;
                z-index: 2147483647 !important;
                justify-content: center !important;
                align-items: center !important;
                backdrop-filter: blur(10px) !important;
                pointer-events: auto !important;
            `;

            const modalBox = modal.querySelector('.modal-box');
            if (modalBox) {
                modalBox.style.cssText = `
                    display: block !important;
                    position: relative !important;
                    background: white !important;
                    border: 10px solid black !important;
                    border-radius: 20px !important;
                    padding: 50px !important;
                    max-width: 800px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    color: black !important;
                    font-size: 18px !important;
                    z-index: 2147483647 !important;
                    box-shadow: 0 0 100px rgba(0,0,0,1) !important;
                    margin: 20px auto !important;
                    width: 90% !important;
                `;
                console.log('Modal box EXTREME styled');
            }

            modal.classList.add('active');
            console.log('Modal classes:', modal.className);
            console.log('Modal computed display:', window.getComputedStyle(modal).display);

            // Force render after a delay
            setTimeout(() => {
                renderWidgetManager();
                console.log('Widget manager rendered with delay');
                
                // Force scroll to top in case modal is outside viewport
                window.scrollTo(0, 0);
                
                // Additional visibility check
                setTimeout(() => {
                    const modalRect = modal.getBoundingClientRect();
                    console.log('Modal position:', modalRect);
                    if (modalRect.top < 0 || modalRect.left < 0) {
                        console.log('Modal is outside viewport, adjusting...');
                        modal.style.top = '10px !important';
                        modal.style.left = '10px !important';
                    }
                }, 200);
            }, 100);

        } else {
            console.error('Widget manager modal not found');
        }
    }

    function closeWidgetManager() {
        const modal = document.getElementById('widgetManagerModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // NEUE FUNKTIONEN FÜR DEN NEUEN WIDGET MANAGER
    function openNewWidgetManager() {
        console.log('Opening NEW widget manager');
        const modal = document.getElementById('newWidgetManagerModal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('New widget manager opened');
            renderNewWidgetManager();
        } else {
            console.error('New widget manager modal not found');
        }
    }

    function closeNewWidgetManager() {
        console.log('Closing NEW widget manager');
        const modal = document.getElementById('newWidgetManagerModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('New widget manager closed');
        }
    }

    function renderNewWidgetManager() {
        console.log('Rendering NEW widget manager');
        const availableContainer = document.getElementById('newAvailableWidgets');
        const currentContainer = document.getElementById('newCurrentWidgets');
        
        if (!availableContainer || !currentContainer) {
            console.error('New widget manager containers not found');
            return;
        }
        
        const dashboardContainer = document.getElementById('dashboardContainer');
        const currentWidgets = dashboardContainer ? Array.from(dashboardContainer.querySelectorAll('.dashboard-item')).map(item => 
            item.getAttribute('data-item-id')
        ).filter(Boolean) : [];

        // Verfügbare Widgets anzeigen
        availableContainer.innerHTML = '';
        Object.keys(widgetLibrary).forEach(widgetId => {
            if (!currentWidgets.includes(widgetId)) {
                const widget = widgetLibrary[widgetId];
                const widgetCard = document.createElement('div');
                widgetCard.className = 'card';
                widgetCard.style.cssText = `
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid var(--border);
                    background: var(--bg-glass);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                `;
                widgetCard.onmouseover = () => widgetCard.style.transform = 'translateY(-2px)';
                widgetCard.onmouseout = () => widgetCard.style.transform = 'translateY(0)';
                widgetCard.onclick = () => addWidget(widgetId);
                
                widgetCard.innerHTML = `
                    <div style="font-size: 2rem;">${widget.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--text-main); margin-bottom: 5px;">${widget.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">${widget.description}</div>
                    </div>
                    <button class="btn btn-ghost" style="padding: 8px 12px; font-size: 0.8rem;" onclick="event.stopPropagation(); addWidget('${widgetId}')">➕ Hinzufügen</button>
                `;
                availableContainer.appendChild(widgetCard);
            }
        });
        
        // Aktuelle Widgets anzeigen
        currentContainer.innerHTML = '';
        currentWidgets.forEach(widgetId => {
            const widget = widgetLibrary[widgetId];
            if (widget) {
                const widgetCard = document.createElement('div');
                widgetCard.className = 'card';
                widgetCard.style.cssText = `
                    padding: 20px;
                    border: 1px solid var(--border);
                    background: var(--bg-glass);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                `;
                
                widgetCard.innerHTML = `
                    <div style="font-size: 2rem;">${widget.icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--text-main); margin-bottom: 5px;">${widget.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">${widget.description}</div>
                    </div>
                    <button class="btn btn-ghost" style="padding: 8px 12px; font-size: 0.8rem; color: var(--danger);" onclick="removeWidget('${widgetId}')">✕ Entfernen</button>
                `;
                currentContainer.appendChild(widgetCard);
            }
        });
    }

    function addRandomWidget() {
        const widgets = Object.keys(widgetLibrary);
        const randomWidget = widgets[Math.floor(Math.random() * widgets.length)];
        addWidget(randomWidget);
        renderNewWidgetManager();
        alert(`Zufälliges Widget hinzugefügt: ${randomWidget}`);
    }

    function getCurrentDashboardWidgets() {
        const dashboardContainer = document.getElementById('dashboardContainer');
        const currentWidgets = [];
        if (dashboardContainer) {
            const widgetElements = dashboardContainer.querySelectorAll('.dashboard-item');
            widgetElements.forEach(el => {
                const widgetId = el.getAttribute('data-item-id');
                if (widgetId && widgetLibrary[widgetId]) {
                    currentWidgets.push({
                        id: widgetId,
                        name: widgetLibrary[widgetId].name,
                        icon: widgetLibrary[widgetId].icon || '📦'
                    });
                }
            });
        }
        return currentWidgets;
    }

    // Alias for updateDashboard calls
    function updateDashboard() {
        updateUI();
        // Initialize advanced chart effects
        setTimeout(() => {
            enhanceChartsWithEffects();
            updateCommandBarBadges();
        }, 300);
    }
    
    // Update Command Bar badges with dynamic info
    function updateCommandBarBadges() {
        // === Holiday badge ===
        const holidayBtn = document.getElementById('cmdHolidayCheck');
        if (holidayBtn) {
            const existingBadge = holidayBtn.querySelector('.cmd-badge');
            if (existingBadge) existingBadge.remove();
            
            const bundesland = (data.settings && data.settings.bundesland) || '';
            if (bundesland) {
                const now = new Date();
                const year = now.getFullYear();
                let holidays = getGermanHolidays(year).concat(getGermanHolidays(year + 1));
                const existingDates = data.entries.map(e => e.date);
                const pending = holidays.filter(h => {
                    if (existingDates.includes(h.date)) return false;
                    const dateObj = new Date(h.date);
                    const dayIndex = dateObj.getDay();
                    const expected = data.settings.hours[dayIndex] || 0;
                    return expected > 0 && dateObj.getTime() < now.getTime() + (60 * 86400000);
                });
                if (pending.length > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'cmd-badge';
                    badge.textContent = pending.length;
                    holidayBtn.appendChild(badge);
                }
            }
        }
        
        // === Today badge (worked hours or "offen") ===
        const todayBtn = document.getElementById('cmdToday');
        if (todayBtn) {
            const oldBadge = todayBtn.querySelector('.cmd-badge');
            if (oldBadge) oldBadge.remove();
            
            const todayStr = new Date().toISOString().split('T')[0];
            const todayEntry = data.entries.find(e => e.date === todayStr);
            const badge = document.createElement('span');
            badge.className = 'cmd-badge';
            if (todayEntry && todayEntry.worked > 0) {
                badge.textContent = todayEntry.worked.toFixed(1) + 'h';
                badge.style.background = 'rgba(16, 185, 129, 0.2)';
                badge.style.color = '#10b981';
                todayBtn.onclick = () => openCorrection('week');
            } else {
                badge.textContent = 'offen';
                badge.style.background = 'rgba(245, 158, 11, 0.2)';
                badge.style.color = '#f59e0b';
                todayBtn.onclick = () => quickAddEntry(new Event('click'));
            }
            todayBtn.appendChild(badge);
        }
        
        // === Streak badge ===
        const streakBtn = document.getElementById('cmdStreak');
        if (streakBtn) {
            const oldBadge = streakBtn.querySelector('.cmd-badge');
            if (oldBadge) oldBadge.remove();
            
            // Calculate current streak
            let streak = 0;
            const now = new Date();
            for (let i = 0; i < 365; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayIdx = d.getDay();
                const expected = (data.settings.hours && data.settings.hours[dayIdx]) || 0;
                if (expected === 0) continue; // Skip non-work days
                const entry = data.entries.find(e => e.date === dateStr);
                if (entry && entry.worked > 0) {
                    streak++;
                } else {
                    break;
                }
            }
            
            if (streak > 0) {
                const badge = document.createElement('span');
                badge.className = 'cmd-badge';
                badge.textContent = streak + 'd';
                badge.style.background = streak >= 7 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(var(--primary-rgb), 0.18)';
                badge.style.color = streak >= 7 ? '#ef4444' : 'var(--primary)';
                streakBtn.appendChild(badge);
            }
            streakBtn.onclick = () => { /* scroll to streak info or show toast */ 
                const streakEl = document.getElementById('streakCount');
                if (streakEl) streakEl.closest('.card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
        }
    }

    // ===== NAVBAR CUSTOMIZATION: render based on settings and allow drag/drop =====
    function renderNavbar() {
        const nav = document.getElementById('mainNav');
        if (!nav) return;

        // Ensure settings.nav exists
        if (!Array.isArray(data.settings.nav)) {
            // Default nav items (id, label, icon, visible)
            data.settings.nav = [
                {id:'dashboard', label:'Dashboard', icon:'🏠', visible:true},
                {id:'newEntry', label:'Neu', icon:'➕', visible:true},
                {id:'widgets', label:'Widgets', icon:'📦', visible:true},
                {id:'settings', label:'Einstellungen', icon:'⚙️', visible:true}
            ];
            save();
        }

        nav.innerHTML = '';
        data.settings.nav.forEach(item => {
            if (!item.visible) return;
            const a = document.createElement('a');
            a.className = 'nav-item';
            a.setAttribute('draggable', 'true');
            a.dataset.navId = item.id;
            a.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;

            // Drag handlers
            a.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/nav-id', item.id);
                a.classList.add('dragging');
            });
            a.addEventListener('dragend', () => {
                a.classList.remove('dragging');
            });

            // Click behavior (map known ids to actions)
            a.onclick = () => {
                if (item.id === 'settings') openSettings();
                else if (item.id === 'dashboard') updateDashboard();
                else if (item.id === 'newEntry') openNewEntryModal && openNewEntryModal();
                else console.log('Nav click:', item);
            };

            nav.appendChild(a);
        });

        // Allow drop reordering on nav container
        nav.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterEl = getDragAfterElement(nav, e.clientX);
            const dragging = nav.querySelector('.dragging');
            if (!dragging) return;
            if (!afterEl) nav.appendChild(dragging);
            else nav.insertBefore(dragging, afterEl);
        });

        nav.addEventListener('drop', (e) => {
            e.preventDefault();
            // Reconstruct data.settings.nav order from DOM
            const newOrder = [];
            nav.querySelectorAll('.nav-item').forEach(el => {
                const id = el.dataset.navId;
                const item = data.settings.nav.find(i => i.id === id);
                if (item) newOrder.push(item);
            });
            data.settings.nav = newOrder.concat(data.settings.nav.filter(i => !newOrder.find(n => n.id === i.id)));
            save();
            renderNavbar();
        });
    }

    function getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.nav-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function renderWidgetManager() {
        console.log('Rendering widget manager');

        try {
            const availableContainer = document.getElementById('availableWidgets') || document.getElementById('newAvailableWidgets') || document.querySelector('#settings-tab-widgets #availableWidgets') || document.querySelector('#settings-tab-widgets #newAvailableWidgets');
            const currentContainer = document.getElementById('currentWidgets') || document.getElementById('newCurrentWidgets') || document.querySelector('#settings-tab-widgets #currentWidgets') || document.querySelector('#settings-tab-widgets #newCurrentWidgets');

            console.log('Containers:', availableContainer, currentContainer);

            if (!availableContainer || !currentContainer) {
                console.error('Widget manager containers not found');
                return;
            }

            // Get current dashboard widgets
            const dashboardContainer = document.getElementById('dashboardContainer');
            const currentWidgets = dashboardContainer ? Array.from(dashboardContainer.querySelectorAll('.dashboard-item')).map(item =>
                item.getAttribute('data-item-id')
            ).filter(Boolean) : [];

            console.log('Current widgets:', currentWidgets);

            // Available widgets (not currently on dashboard)
            availableContainer.innerHTML = '';
            availableContainer.style.cssText = '';
            Object.keys(widgetLibrary).forEach(widgetId => {
                if (!currentWidgets.includes(widgetId)) {
                    const widget = widgetLibrary[widgetId];
                    console.log('Adding available widget:', widgetId);
                    const widgetCard = document.createElement('div');
                    widgetCard.className = 'card';
                    widgetCard.style.cssText = 'padding:16px; cursor:pointer; transition: all 0.2s;';
                    widgetCard.onclick = () => addWidget(widgetId);
                    widgetCard.innerHTML = `
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                            <span style="font-size:1.5rem;">${widget.icon}</span>
                            <div>
                                <div style="font-weight:600; color:var(--text-main);">${widget.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${widget.description}</div>
                            </div>
                        </div>
                        <button class="btn btn-ghost" style="width:100%; padding:8px;" onclick="console.log('Add widget clicked:', '${widgetId}'); event.stopPropagation(); addWidget('${widgetId}')">➕ Hinzufügen</button>
                    `;
                    availableContainer.appendChild(widgetCard);
                }
            });

            // Current widgets
            currentContainer.innerHTML = '';
            currentWidgets.forEach(widgetId => {
                const widget = widgetLibrary[widgetId];
                if (widget) {
                    console.log('Adding current widget:', widgetId);
                    const widgetCard = document.createElement('div');
                    widgetCard.className = 'card';
                    widgetCard.style.cssText = 'padding:16px; border:1px solid rgba(255,255,255,0.02);';
                    widgetCard.innerHTML = `
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                            <span style="font-size:1.5rem;">${widget.icon}</span>
                            <div style="flex:1;">
                                <div style="font-weight:600; color:var(--text-main);">${widget.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${widget.description}</div>
                            </div>
                            <button class="btn btn-ghost" style="padding:6px;" onclick="removeWidget('${widgetId}')" title="Entfernen">🗑️</button>
                        </div>
                    `;
                    currentContainer.appendChild(widgetCard);
                }
            });

            console.log('Widget manager rendered successfully');
        } catch (e) {
            console.error('Error rendering widget manager:', e);
        }
    }

    // ===== SIDEBAR NAV & CUSTOMIZATION =====
    function renderSidebarNav() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const navList = document.getElementById('sidebarNavList');
        if (!navList) return;

        // Default nav items - RICHTIG SORTIERT nach Benutzervorgabe
        const defaultNavItems = [
            {id:'dashboard', label:'Dashboard', icon:'📈', visible:true},
            {id:'performance', label:'Performance', icon:'📊', visible:true},
            {id:'history', label:'Verlauf', icon:'📉', visible:true},
            {id:'fahrtkosten', label:'Fahrtkosten', icon:'🚗', visible:true, external:'./Pages/App/fahrtkosten.html'},
            {id:'yearview', label:'Jahresansicht', icon:'📅', visible:true},
            {id:'monthcompare', label:'Monatsansicht', icon:'📊', visible:true},
            {id:'weekview', label:'Wochenansicht', icon:'📆', visible:true},
            {id:'school', label:'Berufsschule', icon:'🏫', visible:true},
            {id:'ihk', label:'IHK', icon:'🎓', visible:true},
            {id:'prognose', label:'Prognose', icon:'🔮', visible:true},
            {id:'goals', label:'Ziele', icon:'🎯', visible:true},
            {id:'analytics-pro', label:'Analytics Pro', icon:'📊', visible:true},
        ];

        // Nav-Version: bei Änderung der Reihenfolge/Items hochzählen → erzwingt Reset
        const NAV_VERSION = 3;
        const navNeedsReset = !Array.isArray(data.settings.nav) || data.settings.navVersion !== NAV_VERSION;
        if (navNeedsReset) {
            // Bestehende visibility-Einstellungen übernehmen, aber neue Reihenfolge erzwingen
            const oldNav = Array.isArray(data.settings.nav) ? data.settings.nav : [];
            data.settings.nav = defaultNavItems.map(item => {
                const existing = oldNav.find(o => o.id === item.id);
                return existing ? { ...item, visible: existing.visible } : item;
            });
            data.settings.navVersion = NAV_VERSION;
            save();
        } else {
            // Fehlende neue Items hinzufügen
            let changed = false;
            defaultNavItems.forEach(defaultItem => {
                if (!data.settings.nav.find(item => item.id === defaultItem.id)) {
                    data.settings.nav.push(defaultItem);
                    changed = true;
                }
            });
            if (changed) save();
        }

        navList.innerHTML = '';
        data.settings.nav.forEach(item => {
            const el = document.createElement('div');
            el.className = 'nav-item';
            el.draggable = true;
            el.dataset.navId = item.id;
            el.innerHTML = `<span class="nav-icon">${item.icon}</span> <span class="nav-label">${item.label}</span>`;
            if (!item.visible) el.style.opacity = '0.4';

            el.addEventListener('click', () => {
                if (item.external) { window.location.href = item.external; return; }
                switchTab(item.id);
            });

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/nav-id', item.id);
                el.classList.add('dragging');
            });
            el.addEventListener('dragend', () => el.classList.remove('dragging'));

            navList.appendChild(el);
        });

        // Allow reordering
        navList.addEventListener('dragover', e => {
            e.preventDefault();
            const afterEl = getDragAfterElementVertical(navList, e.clientY);
            const dragging = navList.querySelector('.dragging');
            if (!dragging) return;
            if (!afterEl) navList.appendChild(dragging);
            else navList.insertBefore(dragging, afterEl);
        });

        navList.addEventListener('drop', () => {
            // Save new order
            const newOrder = [];
            navList.querySelectorAll('.nav-item').forEach(node => {
                const id = node.dataset.navId;
                const item = data.settings.nav.find(i => i.id === id);
                if (item) newOrder.push(item);
            });
            data.settings.nav = newOrder.concat(data.settings.nav.filter(i => !newOrder.find(n=>n.id===i.id)));
            save();
            renderSidebarNav();
        });
    }

    function getDragAfterElementVertical(container, y) {
        // Generic: use direct children and ignore the one being dragged
        const draggableElements = Array.from(container.children).filter(child => !child.classList.contains('dragging'));
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // ===== SIDEBAR COLLAPSIBLE SECTIONS =====
    function toggleNavSection(sectionEl) {
        const sectionName = sectionEl.dataset.section;
        if (!sectionName) return;
        const group = document.querySelector(`.nav-section-group[data-group="${sectionName}"]`);
        if (!group) return;
        
        const isCollapsed = sectionEl.classList.toggle('collapsed');
        group.classList.toggle('collapsed', isCollapsed);
        
        // Save state
        try {
            const states = JSON.parse(localStorage.getItem('sidebar_sections') || '{}');
            states[sectionName] = !isCollapsed;
            localStorage.setItem('sidebar_sections', JSON.stringify(states));
        } catch(e) {}
    }

    // Restore collapsed states on load
    (function restoreSidebarSections() {
        try {
            const states = JSON.parse(localStorage.getItem('sidebar_sections') || '{}');
            Object.keys(states).forEach(name => {
                if (!states[name]) {
                    const sec = document.querySelector(`.nav-section[data-section="${name}"]`);
                    const grp = document.querySelector(`.nav-section-group[data-group="${name}"]`);
                    if (sec) sec.classList.add('collapsed');
                    if (grp) grp.classList.add('collapsed');
                }
            });
        } catch(e) {}
    })();

    // ===== SIDEBAR INTERACTIONS — Hover beam + Scroll fade =====
    (function initSidebarInteractions() {
        const sidebar = document.getElementById('sidebar');
        const beam = document.getElementById('sidebarHoverBeam');
        const scrollEl = document.querySelector('.sidebar-scroll');
        const wrapper = document.querySelector('.sidebar-scroll-wrapper');
        
        // Mouse-tracking hover beam
        if (sidebar && beam) {
            sidebar.addEventListener('mousemove', (e) => {
                const rect = sidebar.getBoundingClientRect();
                beam.style.top = (e.clientY - rect.top - 22) + 'px';
            });
            sidebar.addEventListener('mouseleave', () => {
                beam.style.opacity = '0';
            });
        }
        
        // Top scroll fade
        if (scrollEl && wrapper) {
            scrollEl.addEventListener('scroll', () => {
                if (scrollEl.scrollTop > 8) {
                    wrapper.classList.add('scrolled-top');
                } else {
                    wrapper.classList.remove('scrolled-top');
                }
            }, { passive: true });
        }

        // Initial avatar set (will be updated again after data loads)
        updateSidebarAvatar();

        // Sync sidebar footer with network status
        const sidebarNetLabel = document.getElementById('sidebarNetLabel');
        const avatarDot = document.getElementById('sidebarAvatar');
        if (sidebarNetLabel) {
            function updateSidebarNet() {
                const online = navigator.onLine;
                sidebarNetLabel.textContent = online ? '© MyWorkLog — Online' : '© MyWorkLog — Offline';
                if (avatarDot) {
                    const dot = avatarDot.querySelector('::after') || avatarDot;
                    avatarDot.style.setProperty('--avatar-dot-color', online ? '#22c55e' : '#ef4444');
                }
            }
            updateSidebarNet();
            window.addEventListener('online', updateSidebarNet);
            window.addEventListener('offline', updateSidebarNet);
        }
    })();

    // ===== SIDEBAR AVATAR HELPER =====
    function updateSidebarAvatar() {
        try {
            const avatarEl = document.getElementById('sidebarAvatar');
            if (!avatarEl) return;
            const name = (typeof data !== 'undefined' && data.settings && data.settings.name) ? data.settings.name : '';
            if (name) {
                const parts = name.trim().split(/\s+/);
                const initials = parts.length >= 2 
                    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
                    : name.substring(0, 2).toUpperCase();
                avatarEl.textContent = initials;
            }
        } catch(e) {}
    }
    // Close popover when clicking outside
    document.addEventListener('click', function(e) {
        const popover = document.getElementById('profilePopover');
        const footer = document.getElementById('sidebarFooter');
        if (popover && popover.classList.contains('active')) {
            if (!footer || !footer.contains(e.target)) {
                closeProfilePopover();
            }
        }
    });

    // Close popover on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeProfilePopover();
    });

    // ===== COMMAND PALETTE (Ctrl+K / ⌘K) =====
    const CMD_PALETTE_ITEMS = [
        // Navigation
        { id: 'dashboard',    label: 'Dashboard',         icon: '📈', group: 'Navigation', action: () => switchTab('dashboard') },
        { id: 'performance',  label: 'Performance',       icon: '📊', group: 'Navigation', action: () => switchTab('performance') },
        { id: 'history',      label: 'Verlauf',           icon: '📉', group: 'Navigation', action: () => switchTab('history') },
        { id: 'yearview',     label: 'Jahresansicht',     icon: '📅', group: 'Navigation', action: () => switchTab('yearview') },
        { id: 'monthcompare', label: 'Monatvergleich',    icon: '📊', group: 'Navigation', action: () => switchTab('monthcompare') },
        { id: 'weekview',     label: 'Wochenansicht',     icon: '📆', group: 'Navigation', action: () => switchTab('weekview') },
        { id: 'prognose',     label: 'Prognose',          icon: '🔮', group: 'Navigation', action: () => switchTab('prognose') },
        { id: 'school',       label: 'Berufsschule',      icon: '🏫', group: 'Navigation', action: () => switchTab('school') },
        { id: 'aibot',        label: 'AI-Bot',            icon: '🤖', group: 'Navigation', action: () => switchTab('aibot') },
        { id: 'support',      label: 'Unterstützung',     icon: '☕', group: 'Navigation', action: () => switchTab('support') },
        { id: 'analytics-pro', label: 'Analytics Pro',     icon: '📊', group: 'Navigation', action: () => switchTab('analytics-pro') },
        // Tools
        { id: 'settings',     label: 'Einstellungen',     icon: '⚙️', group: 'Tools',      action: () => openSettings() },
        { id: 'alerts',       label: 'Alerts',            icon: '🔔', group: 'Tools',      action: () => toggleAlertsPanel() },
        { id: 'backup',       label: 'Backup / Export',   icon: '💾', group: 'Tools',      action: () => showExportMenu() },
        { id: 'import',       label: 'Import',            icon: '📥', group: 'Tools',      action: () => showBackupMenu() },
        { id: 'onboarding',   label: 'Anleitung / Tour',  icon: '🧭', group: 'Tools',      action: () => startOnboardingTour() },
        { id: 'untis',        label: 'Untis Import',      icon: '📚', group: 'Tools',      action: () => showUntisImportModal() },
        // Extern
        { id: 'berichtsheft', label: 'Berichtsheft',      icon: '📋', group: 'Extern',     action: () => { window.location.href = './Pages/App/berichtsheft.html'; } },
        { id: 'aufgaben',     label: 'Aufgaben Manager', icon: '✅', group: 'Extern',     action: () => { window.location.href = './Pages/App/Tasks/aufgaben.html'; } },
        { id: 'skilltree',    label: 'Skill-Baum',       icon: '🌳', group: 'Extern',     action: () => { window.location.href = './Pages/App/SkillTree/skill-tree.html'; } },
        { id: 'ausbildung',   label: 'Ausbildungshilfe',  icon: '🎓', group: 'Extern',     action: () => { window.location.href = './Pages/App/Ausbilungs_Hilfe/index.html'; } },
        { id: 'vertrag',      label: 'Vertrags-Manager',  icon: '💼', group: 'Extern',     action: () => { window.location.href = './Pages/App/vertrags-manager.html'; } },
        { id: 'repo',         label: 'Repo-Analyse',      icon: '🔥', group: 'Extern',     action: () => window.open('Pages/Info/repo-report.html', '_blank') },
        { id: 'analytics',    label: 'Analytics',         icon: '📊', group: 'Extern',     action: () => window.open('./Pages/Info/analytics.html', '_blank') },
        { id: 'impressum',    label: 'Impressum',         icon: '📄', group: 'Extern',     action: () => window.open('./Pages/DE-Gestz/Impressum.html', '_blank') },
        { id: 'dsgvo',        label: 'DSGVO',             icon: '🔒', group: 'Extern',     action: () => window.open('./Pages/DE-Gestz/DSGVO.html', '_blank') },
        { id: 'about',        label: 'About',             icon: '💡', group: 'Extern',     action: () => window.open('./Pages/Info/about.html', '_blank') },
        // Ghost Mode
        { id: 'ghost',        label: 'Ghost Mode 👻',     icon: '👻', group: 'Tools',      action: () => toggleGhostMode() },
    ];

    let cmdSelectedIdx = 0;
    let cmdFilteredItems = [...CMD_PALETTE_ITEMS];
    function renderCmdResults(query) {
        const container = document.getElementById('cmdPaletteResults');
        const q = query.toLowerCase().trim();

        cmdFilteredItems = q
            ? CMD_PALETTE_ITEMS.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.group.toLowerCase().includes(q) ||
                item.id.toLowerCase().includes(q))
            : [...CMD_PALETTE_ITEMS];

        if (cmdSelectedIdx >= cmdFilteredItems.length) cmdSelectedIdx = Math.max(0, cmdFilteredItems.length - 1);

        if (!cmdFilteredItems.length) {
            container.innerHTML = '<div class="cmd-palette-empty">Keine Treffer gefunden</div>';
            return;
        }

        let html = '';
        let lastGroup = '';
        cmdFilteredItems.forEach((item, i) => {
            if (item.group !== lastGroup) {
                html += `<div class="cmd-palette-group-label">${item.group}</div>`;
                lastGroup = item.group;
            }
            html += `<div class="cmd-palette-item${i === cmdSelectedIdx ? ' selected' : ''}" data-idx="${i}" onmouseenter="cmdHover(${i})" onclick="cmdSelect(${i})">
                <div class="cpi-icon">${item.icon}</div>
                <span>${item.label}</span>
            </div>`;
        });
        container.innerHTML = html;

        // Scroll selected item into view
        const sel = container.querySelector('.cmd-palette-item.selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function cmdHover(idx) {
        cmdSelectedIdx = idx;
        const items = document.querySelectorAll('.cmd-palette-item');
        items.forEach((el, i) => el.classList.toggle('selected', i === idx));
    }

    function cmdSelect(idx) {
        const item = cmdFilteredItems[idx];
        if (item && item.action) {
            closeCmdPalette();
            item.action();
        }
    }

    // Input handler — attach directly (DOM elements already exist above this script)
    (function initCmdPaletteHandlers() {
        const input = document.getElementById('cmdPaletteInput');
        if (input) {
            input.addEventListener('input', () => renderCmdResults(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    cmdSelectedIdx = Math.min(cmdSelectedIdx + 1, cmdFilteredItems.length - 1);
                    renderCmdResults(input.value);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    cmdSelectedIdx = Math.max(cmdSelectedIdx - 1, 0);
                    renderCmdResults(input.value);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    cmdSelect(cmdSelectedIdx);
                } else if (e.key === 'Escape') {
                    closeCmdPalette();
                }
            });
        }

        // Click overlay to close
        const overlay = document.getElementById('cmdPalette');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeCmdPalette();
            });
        }
    })();

    // Global Ctrl+K / ⌘K shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const overlay = document.getElementById('cmdPalette');
            if (overlay.classList.contains('open')) {
                closeCmdPalette();
            } else {
                openCmdPalette();
            }
        }
    });

    // ===== WIDGET DRAG & DROP (REORDER) =====
    // Tracks whether the dashboard layout has unsaved changes while in edit mode
    let dashboardLayoutDirty = false;

    function enableWidgetDragDrop() {
        const dashboard = document.getElementById('dashboardContainer');
        if (!dashboard) return;

        dashboard.querySelectorAll('.dashboard-item').forEach(item => {
            item.draggable = true;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/widget-id', item.getAttribute('data-item-id'));
                item.classList.add('dragging');
            });
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
        });

        dashboard.addEventListener('dragover', e => {
            e.preventDefault();
            const afterEl = getDragAfterElementVertical(dashboard, e.clientY);
            const dragging = dashboard.querySelector('.dragging');
            if (!dragging) return;
            if (!afterEl) dashboard.appendChild(dragging);
            else dashboard.insertBefore(dragging, afterEl);
        });

        dashboard.addEventListener('drop', () => {
            // Mark layout as dirty and show a subtle status instead of a toast for every drop
            dashboardLayoutDirty = true;
            const statusEl = document.getElementById('editModeStatus');
            if (statusEl) {
                statusEl.textContent = '📍 Layout geändert (nicht gespeichert)';
                statusEl.style.opacity = '1';
            }
            // Do NOT auto-save here to avoid noisy toasts – saving happens when exiting edit mode
        });
    }

    function saveWidgetLayout(notify = true) {
        const dashboard = document.getElementById('dashboardContainer');
        if (!dashboard) return;
        const order = [];
        dashboard.querySelectorAll('.dashboard-item').forEach(el => {
            const id = el.getAttribute('data-item-id');
            if (id) order.push(id);
        });
        data.settings.widgetLayout = order;
        // Also keep legacy dashboard layout in localStorage for compatibility
        localStorage.setItem('tt_dashboard_layout', JSON.stringify(order));
        save();
        // Clear dirty flag and reset status text
        dashboardLayoutDirty = false;
        const statusEl = document.getElementById('editModeStatus');
        if (statusEl) { statusEl.textContent = '📍 Layout-Bearbeitungsmodus AKTIV'; statusEl.style.opacity = '1'; }
        if (notify) showCustomMessage('✅ Layout gespeichert', 'Widget Reihenfolge gespeichert', 'success');
    }

    function applyWidgetLayout() {
        const dashboard = document.getElementById('dashboardContainer');
        if (!dashboard || !Array.isArray(data.settings.widgetLayout)) return;
        const desired = data.settings.widgetLayout;
        const mapping = {};
        dashboard.querySelectorAll('.dashboard-item').forEach(el => mapping[el.getAttribute('data-item-id')] = el);
        desired.forEach(id => {
            if (mapping[id]) dashboard.appendChild(mapping[id]);
        });
    }

    // Render nav editor inside Settings -> Custom
    function renderNavEditor() {
        const container = document.getElementById('settings-tab-custom');
        if (!container) return;
        const editorRoot = document.createElement('div');
        editorRoot.style.marginTop = '12px';
        editorRoot.innerHTML = `<h4 style="color:var(--primary);">🔧 Navbar anpassen</h4><div id="navEditorList" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div><div style="display:flex; gap:8px; margin-top:12px;"><button class="btn btn-primary" id="saveNavEditor">Speichern</button><button class="btn" id="resetNavEditor">Zurücksetzen</button></div>`;

        // Remove previous editor content if present
        const old = container.querySelector('#navEditorWrapper');
        if (old) old.remove();
        editorRoot.id = 'navEditorWrapper';

        container.prepend(editorRoot);

        const list = editorRoot.querySelector('#navEditorList');
        list.innerHTML = '';
        data.settings.nav.forEach(item => {
            const row = document.createElement('div');
            row.className = 'nav-editor-row';
            row.draggable = true;
            row.dataset.navId = item.id;
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.alignItems = 'center';

            row.innerHTML = `<span style="cursor:grab;">☰</span><input style="flex:1;" class="glass-input" value="${item.label}"><label style="display:flex; gap:8px; align-items:center; margin-left:8px;"><input type="checkbox" ${item.visible ? 'checked' : ''}> Sichtbar</label>`;
            list.appendChild(row);

            // drag handlers
            row.addEventListener('dragstart', (e) => row.classList.add('dragging'));
            row.addEventListener('dragend', () => row.classList.remove('dragging'));
        });

        // reorder in editor
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const after = getDragAfterElementVertical(list, e.clientY);
            const dragging = list.querySelector('.dragging');
            if (!dragging) return;
            if (!after) list.appendChild(dragging);
            else list.insertBefore(dragging, after);
        });

        editorRoot.querySelector('#saveNavEditor').onclick = () => {
            const newNav = [];
            list.querySelectorAll('.nav-editor-row').forEach(row => {
                const id = row.dataset.navId;
                const label = row.querySelector('input').value;
                const visible = row.querySelector('input[type="checkbox"]').checked;
                const item = data.settings.nav.find(i=>i.id===id) || {id, icon:'❔'};
                item.label = label; item.visible = visible;
                newNav.push(item);
            });
            data.settings.nav = newNav;
            save();
            renderSidebarNav();
            showCustomMessage('✅ Gespeichert', 'Navbar aktualisiert', 'success');
        };

        editorRoot.querySelector('#resetNavEditor').onclick = () => {
            if (!confirm('Navbar auf Standard zurücksetzen?')) return;
            data.settings.nav = null; // will reset on next render
            save();
            renderSidebarNav();
            renderNavEditor();
            showCustomMessage('🔁 Zurückgesetzt', 'Navbar zurückgesetzt', 'info');
        };
    }

    // Wire init hooks — moved to run after window.onload to avoid overwriting rehydrated data
    // Initialization will be performed as part of the window.onload sequence.

    function addWidget(widgetId) {
        console.log('Adding widget:', widgetId);
        const widget = widgetLibrary[widgetId];
        if (!widget) {
            console.error('Widget not found in library:', widgetId);
            return;
        }

        const dashboardContainer = document.getElementById('dashboardContainer');
        if (!dashboardContainer) {
            console.error('Dashboard container not found');
            return;
        }

        const widgetElement = document.createElement('div');
        widgetElement.className = 'dashboard-item';
        widgetElement.setAttribute('data-item-id', widgetId);
        widgetElement.innerHTML = widget.html;

        dashboardContainer.appendChild(widgetElement);
        console.log('Widget added to DOM');
        
        saveDashboardLayout();
        renderWidgetManager();
        
        // Initialize the specific widget
        initializeWidget(widgetId);
        
        updateDashboard(); // Refresh data
        console.log('Widget addition complete');
    }

    function removeWidget(widgetId) {
        console.log('Removing widget:', widgetId);
        const dashboardContainer = document.getElementById('dashboardContainer');
        if (!dashboardContainer) {
            console.error('Dashboard container not found');
            return;
        }
        
        const widgetElement = dashboardContainer.querySelector(`[data-item-id="${widgetId}"]`);
        if (widgetElement) {
            widgetElement.remove();
            console.log('Widget removed from DOM');
            saveDashboardLayout();
            renderWidgetManager();
            console.log('Widget removal complete');
        } else {
            console.error('Widget element not found for removal:', widgetId);
        }
    }

    function initializeWidget(widgetId) {
        console.log('Initializing widget:', widgetId);
        
        switch(widgetId) {
            case 'charts':
                // Initialize chart widgets
                setTimeout(() => {
                    if (typeof renderTrend === 'function') renderTrend([], 'trendChart');
                    if (typeof renderDonut === 'function') renderDonut(0, 0, 0, 0, 0);
                    updateDashboard(); // This will call renderTrend and renderDonut again with real data
                }, 100);
                break;
                

                
            case 'last-activities':
                if (typeof updateLastActivities === 'function') updateLastActivities();
                break;
                
            case 'mood-tracker':
                if (typeof updateMoodStats === 'function') updateMoodStats();
                break;
                
            case 'productivity-score':
                if (typeof updateProductivityScore === 'function') updateProductivityScore();
                break;
                
            case 'weekly-goals':
                if (typeof updateWeeklyGoals === 'function') updateWeeklyGoals();
                break;
                
            default:
                console.log('No specific initialization needed for widget:', widgetId);
        }
    }

    function initializeAllWidgets() {
        console.log('Initializing all current widgets');
        const dashboardContainer = document.getElementById('dashboardContainer');
        if (!dashboardContainer) return;
        
        const currentWidgets = Array.from(dashboardContainer.querySelectorAll('.dashboard-item')).map(item => 
            item.getAttribute('data-item-id')
        ).filter(Boolean);
        
        currentWidgets.forEach(widgetId => {
            initializeWidget(widgetId);
        });
    }

    function addWidgetToDashboard() {
        // Open a quick add dialog or just show available widgets
        const availableContainer = document.getElementById('availableWidgets') || document.getElementById('newAvailableWidgets') || document.querySelector('#settings-tab-widgets #availableWidgets') || document.querySelector('#settings-tab-widgets #newAvailableWidgets');
        if (!availableContainer || availableContainer.children.length === 0) {
            showCustomMessage('Alle Widgets hinzugefügt', 'Es sind bereits alle verfügbaren Widgets auf dem Dashboard.', 'info');
            return;
        }
        // Scroll to available widgets
        availableContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function resetAllWidgets() {
        showCustomMessage(
            'Widgets zurücksetzen',
            'Möchtest du wirklich alle Widgets auf die Standard-Konfiguration zurücksetzen?',
            'confirm'
        ).then(confirmed => {
            if (confirmed) {
                // Reset to default widgets
                const dashboardContainer = document.getElementById('dashboardContainer');
                dashboardContainer.innerHTML = '';
                
                // Add default widgets
                const defaultWidgets = ['kpi-cards', 'quick-actions', 'charts'];
                defaultWidgets.forEach(widgetId => {
                    const widget = widgetLibrary[widgetId];
                    if (widget) {
                        const widgetElement = document.createElement('div');
                        widgetElement.className = 'dashboard-item';
                        widgetElement.setAttribute('data-item-id', widgetId);
                        widgetElement.innerHTML = widget.html;
                        dashboardContainer.appendChild(widgetElement);
                    }
                });
                
                localStorage.removeItem('tt_dashboard_layout');
                saveDashboardLayout();
                renderWidgetManager();
                updateDashboard();
            }
        });
    }

    // Quick add entry from dashboard widget
    function quickAddEntry(event) {
        event.preventDefault();
        
        const project = document.getElementById('quickProject').value.trim();
        const hours = parseFloat(document.getElementById('quickHours').value);
        
        if (!project) {
            showCustomMessage('❌ Fehler', 'Bitte gib ein Projekt ein.', 'error');
            return;
        }
        
        if (!hours || hours <= 0) {
            showCustomMessage('❌ Fehler', 'Bitte gib gültige Stunden ein.', 'error');
            return;
        }
        
        // Create entry using handleEntry logic
        const date = new Date().toISOString().split('T')[0];
        const entry = {
            id: Date.now(),
            date: date,
            type: 'work',
            start: '',
            end: '',
            worked: hours,
            expected: data.settings.hours[new Date().getDay()] || 0,
            diff: hours - (data.settings.hours[new Date().getDay()] || 0),
            project: project,
            info: `Dashboard-Eingabe: ${hours}h`,
            breakMinutes: 0,
            shiftStart: '',
            shiftEnd: '',
            shiftWarning: false,
            breakLog: [],
            mood: null,
            created: new Date().toISOString()
        };
        
        data.entries.push(entry);
        save();
        updateDashboard();
        
        // Clear form
        document.getElementById('quickProject').value = '';
        document.getElementById('quickHours').value = '';
        
        showCustomMessage('✅ Eintrag hinzugefügt', `${hours}h für "${project}" wurden erfolgreich eingetragen.`, 'success');
    }

    // Update functions for new widgets
    function updateLastActivities() {
        const container = document.getElementById('lastActivitiesList');
        if (!container) return;
        
        const recentEntries = data.entries
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        container.innerHTML = recentEntries.length === 0 
            ? '<div style="color:var(--text-muted); text-align:center; padding:1rem;">Noch keine Einträge</div>'
            : recentEntries.map(entry => `
                <div style="padding:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="font-weight:600; color:var(--text-main);">${entry.project || 'Kein Projekt'}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">
                        ${new Date(entry.date).toLocaleDateString('de-DE')} • ${entry.worked.toFixed(1)}h • ${entry.type}
                    </div>
                </div>
            `).join('');
    }

    function updateMoodStats() {
        const container = document.getElementById('moodStats');
        if (!container) return;
        
        const moodCounts = {};
        data.entries.forEach(entry => {
            if (entry.mood) {
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
            }
        });
        
        const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0);
        container.innerHTML = ['😄', '😊', '🙂', '😐', '😕', '😞', '😠', '🤒', '😴', '🤯'].map(mood => {
            const count = moodCounts[mood] || 0;
            const percentage = totalMoods > 0 ? (count / totalMoods * 100).toFixed(0) : 0;
            return `
                <div style="text-align:center;">
                    <div style="font-size:1.5rem;">${mood}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${count}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${percentage}%</div>
                </div>
            `;
        }).join('');
    }

    function updateProductivityScore() {
        const scoreEl = document.getElementById('productivityScoreWidget');
        const descEl = document.getElementById('productivityDescription');
        if (!scoreEl || !descEl) return;
        
        // Calculate productivity score based on various factors
        const recentEntries = data.entries.filter(e => {
            const entryDate = new Date(e.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return entryDate >= weekAgo && e.type === 'work';
        });
        
        if (recentEntries.length === 0) {
            scoreEl.textContent = '--';
            descEl.textContent = 'Nicht genug Daten für Score-Berechnung';
            return;
        }
        
        // Factors: consistency, average hours, streak maintenance
        const avgHours = recentEntries.reduce((sum, e) => sum + e.worked, 0) / recentEntries.length;
        const consistency = 1 - (recentEntries.reduce((sum, e) => sum + Math.abs(e.worked - avgHours), 0) / recentEntries.length) / avgHours;
        const streakBonus = data.entries.filter(e => e.type === 'work').slice(-10).length / 10;
        
        const score = Math.round((consistency * 40 + streakBonus * 30 + Math.min(avgHours / 8, 1) * 30));
        
        scoreEl.textContent = score;
        descEl.textContent = score >= 80 ? 'Ausgezeichnete Produktivität!' : 
                           score >= 60 ? 'Gute Produktivität' : 
                           score >= 40 ? 'Verbesserungspotenzial' : 'Aufholbedarf';
    }

    // ============================================
    // NEW FEATURES
    // ============================================

    // FEATURE 1: Daily Summary (Streak only)
    function updateDailySummary() {
        if (typeof updateStreakCounter === 'function') updateStreakCounter();
    }

    // FEATURE 2: Pomodoro Timer Mode
    let pomodoroState = {
        enabled: false,
        isWorkPhase: true,
        timeLeft: 25 * 60,
        intervalId: null
    };

    function togglePomodoroMode() {
        if (!pomodoroState.enabled) {
            pomodoroState.enabled = true;
            pomodoroState.timeLeft = 25 * 60;
            pomodoroState.isWorkPhase = true;
            startPomodoroTimer();
            showCustomMessage('🍅 Pomodoro', 'Arbeitsphase gestartet!', 'success');
        } else {
            stopPomodoroTimer();
            pomodoroState.enabled = false;
            showCustomMessage('🍅 Pomodoro', 'Beendet', 'info');
        }
    }

    function startPomodoroTimer() {
        uEvent('pomodoro-start');
        if (pomodoroState.intervalId) clearInterval(pomodoroState.intervalId);
        
        pomodoroState.intervalId = setInterval(() => {
            pomodoroState.timeLeft--;
            
            const mins = Math.floor(pomodoroState.timeLeft / 60);
            const secs = pomodoroState.timeLeft % 60;
            const display = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            
            const card = document.getElementById('pomodoroCard');
            if (card) {
                const title = pomodoroState.isWorkPhase ? '🍅 Arbeitsphase' : '☕ Pausenphase';
                card.querySelector('h4').innerText = title + ` - ${display}`;
            }
            
            if (pomodoroState.timeLeft === 0) {
                pomodoroState.isWorkPhase = !pomodoroState.isWorkPhase;
                pomodoroState.timeLeft = pomodoroState.isWorkPhase ? 25 * 60 : 5 * 60;
                
                const sound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==');
                sound.play().catch(() => {});
                
                showCustomMessage('🔔', pomodoroState.isWorkPhase ? 'Pause vorbei! Arbeitsphase!' : 'Arbeitszeit vorbei! Pause!', 'warning');
            }
        }, 1000);
    }

    function stopPomodoroTimer() {
        if (pomodoroState.intervalId) {
            clearInterval(pomodoroState.intervalId);
            pomodoroState.intervalId = null;
        }
    }

    // FEATURE 3: Weekly Goals Progress
    function updateWeeklyGoals() {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        
        let weekHours = 0, workDays = new Set();
        data.entries.forEach(e => {
            const d = new Date(e.date);
            if (d >= weekStart && d <= now) {
                weekHours += e.diff;
                if (e.type === 'work' || e.type === 'school') {
                    workDays.add(e.date);
                }
            }
        });

        const targetHours = 40;
        const targetDays = 5;
        const hoursPercent = Math.min((weekHours / 3600 / targetHours) * 100, 100);
        const daysPercent = Math.min((workDays.size / targetDays) * 100, 100);

        document.getElementById('weeklyHoursTarget').innerText = (weekHours / 3600).toFixed(1) + ' / ' + targetHours + 'h';
        document.getElementById('weeklyDaysTarget').innerText = workDays.size + ' / ' + targetDays + ' Tage';
        document.getElementById('weeklyHoursBar').style.width = hoursPercent + '%';
        document.getElementById('weeklyDaysBar').style.width = daysPercent + '%';
    }

    // FEATURE 4: Dark/Light Mode Theme
    function setTheme(theme) {
        uEvent('theme-switch', { theme: theme });
        if (theme === 'light') {
            document.documentElement.style.setProperty('--bg-deep', '#f5f5f7');
            document.documentElement.style.setProperty('--bg-glass', 'rgba(245, 245, 247, 0.8)');
            document.documentElement.style.setProperty('--text-main', '#1a1a1a');
            document.documentElement.style.setProperty('--text-muted', '#666666');
            document.documentElement.style.setProperty('--border', 'rgba(0, 0, 0, 0.1)');
            document.body.style.backgroundImage = 'radial-gradient(circle at 15% 15%, rgba(var(--primary-rgb), 0.05), transparent 40%), radial-gradient(circle at 85% 85%, rgba(var(--primary-rgb), 0.03), transparent 40%)';
            showCustomMessage('☀️ Light Mode', 'Aktiviert', 'info');
        } else {
            document.documentElement.style.setProperty('--bg-deep', '#030305');
            document.documentElement.style.setProperty('--bg-glass', 'rgba(22, 22, 26, 0.65)');
            document.documentElement.style.setProperty('--text-main', '#f8fafc');
            document.documentElement.style.setProperty('--text-muted', '#94a3b8');
            document.documentElement.style.setProperty('--border', 'rgba(255, 255, 255, 0.06)');
            document.body.style.backgroundImage = 'radial-gradient(circle at 15% 15%, rgba(var(--primary-rgb), 0.08), transparent 40%), radial-gradient(circle at 85% 85%, rgba(var(--primary-rgb), 0.05), transparent 40%)';
            showCustomMessage('🌙 Dark Mode', 'Aktiviert', 'info');
        }
        localStorage.setItem('tt_theme', theme);
    }

    // Load theme on init
    const savedTheme = localStorage.getItem('tt_theme') || 'dark';
    if (savedTheme === 'light') {
        setTheme('light');
    }
    function getLastWorkday(date) {
        const d = new Date(date);
        const dow = d.getDay();
        if (dow === 0) d.setDate(d.getDate() - 2); // Sonntag → Freitag
        else if (dow === 6) d.setDate(d.getDate() - 1); // Samstag → Freitag
        // Wenn heute ein Arbeitstag ist, dann ist der letzte Arbeitstag gestern (oder Freitag)
        else {
            d.setDate(d.getDate() - 1);
            if (d.getDay() === 0) d.setDate(d.getDate() - 2);
            else if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        }
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function isConsecutiveWorkDay(date1, date2) {
        // date1 = neueres Datum, date2 = älteres Datum (sorted desc)
        const oneDayMs = 1000 * 60 * 60 * 24;
        const diffDays = Math.round((date1 - date2) / oneDayMs);
        if (diffDays === 1) return true; // normaler aufeinanderfolgender Tag
        if (diffDays === 3 && date2.getDay() === 5) return true; // Freitag→Montag
        return false;
    }

    // ── BASIS: Streak-Länge ─────────────────────────────────────────────
    function getStreakEmoji(streak) {
      if (streak === 0)         return '❄️';   // Eingefroren
      if (streak === 1)         return '🌱';   // Keim
      if (streak === 2)         return '🕯️';   // Erste Flamme
      if (streak === 3)         return '⚡';   // Blitz
      if (streak === 4)         return '💧';   // Tropfen
      if (streak < 10)          return '🔥';   // Feuer
      if (streak < 15)          return '✨';   // Funken
      if (streak < 21)          return '💫';   // Wirbel
      if (streak < 30)          return '🌟';   // Stern
      if (streak < 50)          return '🏆';   // Pokal
      if (streak < 75)          return '💎';   // Diamant
      if (streak < 100)         return '🌊';   // Welle
      if (streak < 150)         return '🚀';   // Rakete
      if (streak < 200)         return '⚔️';   // Schwert
      if (streak < 365)         return '👑';   // Krone
      return '🌞';                              // Ein ganzes Jahr
    }

    // ── ZUFALLSVARIATION: Pool je Level ────────────────────────────────
    const emojiPools = {
      none:   ['❄️','🧊','☃️','🌨️','🥶'],
      start:  ['🌱','🐣','🌿','🌾','🍀'],
      fire:   ['🔥','🌶️','♨️','🧨','💥'],
      star:   ['🌟','⭐','✨','💫','🌠'],
      trophy: ['🏆','🥇','🎖️','👑','💎'],
      rocket: ['🚀','🛸','☄️','🌌','🌠'],
    };

        // Deterministic daily emoji from the pool for the current streak level.
        // This way the emoji changes each day (based on the date) but remains
        // stable during the same day until midnight.
        function getDailyEmoji(streak, date = new Date()) {
            let pool;
            if (streak === 0)      pool = emojiPools.none;
            else if (streak < 5)   pool = emojiPools.start;
            else if (streak < 30)  pool = emojiPools.fire;
            else if (streak < 75)  pool = emojiPools.star;
            else if (streak < 150) pool = emojiPools.trophy;
            else                   pool = emojiPools.rocket;

            // Use ISO date (YYYY-MM-DD) so the index changes once per day.
            const dayKey = date.toISOString().slice(0, 10);
            // simple string hash (32-bit) -> deterministic per day
            let h = 0;
            for (let i = 0; i < dayKey.length; i++) {
                h = ((h << 5) - h) + dayKey.charCodeAt(i);
                h |= 0;
            }
            const idx = Math.abs(h) % pool.length;
            return pool[idx];
        }

    function updateStreakCounter() {
        const streak = calculateStreak();
        const elCount = document.getElementById('streakCount');
        const elBest = document.getElementById('streakBest');
        const elEmoji = document.getElementById('streakEmoji');

        if (elCount) {
            try { elCount.innerText = streak.current; } catch (e) { console.warn('updateStreakCounter: failed to set streakCount', e); }
        } else {
            console.warn('updateStreakCounter: #streakCount not found');
        }

        if (elBest) {
            try { elBest.innerText = `Best: ${streak.best} 🏆`; } catch (e) { console.warn('updateStreakCounter: failed to set streakBest', e); }
        } else {
            console.warn('updateStreakCounter: #streakBest not found');
        }

        // Emoji basiert auf aktueller Streak — wähle eine tägliche Variation
        let emoji = getDailyEmoji(streak.current);

        if (elEmoji) {
            try { 
                elEmoji.innerText = emoji; 
                // Add pulse animation when streak is active
                if (streak.current > 0) {
                    elEmoji.classList.add('streak-active');
                } else {
                    elEmoji.classList.remove('streak-active');
                }
            } catch (e) { console.warn('updateStreakCounter: failed to set streakEmoji', e); }
        } else {
            console.warn('updateStreakCounter: #streakEmoji not found');
        }

        // Trigger Notification bei neuer Best-Streak (EINMALIG PRO TAG)
        if (streak.current > 0 && streak.current === streak.best && streak.current > 1) {
            const today = new Date().toISOString().split('T')[0];
            const lastNotificationDate = localStorage.getItem('tt_last_streak_notification_date');
            const lastNotificationValue = localStorage.getItem('tt_last_streak_notification_value');
            
            // Nur anzeigen, wenn es heute noch nicht angezeigt wurde oder der Streak höher ist
            if (lastNotificationDate !== today || parseInt(lastNotificationValue || '0') < streak.best) {
                showSmartNotification('🔥 Neue Best-Streak!', `${streak.current} Tage in Folge mit Soll erfüllt!`, 'success');
                localStorage.setItem('tt_last_streak_notification_date', today);
                localStorage.setItem('tt_last_streak_notification_value', streak.best.toString());
            }
        }
    }


    // ============================================
    // FEATURE: AZUBI SKILL-CARD (Shareable Canvas)
    // ============================================

    function closeSkillCardModal() {
        const modal = document.getElementById('skillCardModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
    }

    function getSkillCardData() {
        const streak = calculateStreak();
        const name = data.settings.name || 'Azubi';
        const ihk = data.settings.ihk || {};

        // Ausbildungsjahr berechnen
        let ausbildungsjahr = 1;
        if (ihk.start) {
            const startDate = new Date(ihk.start);
            const now = new Date();
            const diffYears = (now - startDate) / (1000 * 60 * 60 * 24 * 365.25);
            ausbildungsjahr = Math.max(1, Math.min(4, Math.ceil(diffYears)));
        }

        // Gesamtstunden & Tage berechnen
        let totalHours = 0, totalDays = 0, totalDiff = 0;
        (data.entries || []).forEach(e => {
            if (e.type === 'work' || e.type === 'school') {
                totalHours += e.worked || 0;
                totalDays++;
            }
            totalDiff += e.diff || 0;
        });

        // Notenschnitt berechnen
        let gradeAvg = 0;
        const grades = data.settings.school?.grades || {};
        const allGrades = Object.values(grades).flat().filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6).map(Number);
        if (allGrades.length > 0) {
            gradeAvg = allGrades.reduce((a, b) => a + b, 0) / allGrades.length;
        }

        // Titel bestimmen
        let title = 'Rookie';
        const s = streak.current;
        const d = totalDays;
        if (d >= 500 && s >= 20) title = 'Legende';
        else if (d >= 300 && s >= 15) title = 'Elite Worker';
        else if (d >= 200 && gradeAvg > 0 && gradeAvg <= 1.5) title = 'Streber-Maschine';
        else if (s >= 30) title = 'Streak-Monster';
        else if (d >= 200) title = 'Veteran';
        else if (s >= 10) title = 'Streak-König';
        else if (d >= 100 && gradeAvg > 0 && gradeAvg <= 2.0) title = 'Code-Ninja';
        else if (d >= 100) title = 'Pro Azubi';
        else if (d >= 50) title = 'Fleißig';
        else if (d >= 20) title = 'Aufsteiger';

        // OVR (Overall Rating) — 0-99 wie FIFA
        let ovr = 40; // Basis
        ovr += Math.min(d / 10, 20); // Max +20 für Tage
        ovr += Math.min(s * 0.8, 15); // Max +15 für Streak
        ovr += Math.min(totalHours / 100, 10); // Max +10 für Stunden
        if (gradeAvg > 0) ovr += Math.max(0, (4 - gradeAvg) * 5); // Max +15 für gute Noten
        ovr = Math.min(99, Math.round(ovr));

        return { name, title, ausbildungsjahr, streak, totalHours, totalDays, totalDiff, gradeAvg, ovr };
    }

    function renderSkillCard() {
        const canvas = document.getElementById('skillCardCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const d = getSkillCardData();
        const _prgb = getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').trim() || '168,85,247';
        const _phex = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';

        // === BACKGROUND ===
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#0c0c10');
        bgGrad.addColorStop(0.5, '#12101a');
        bgGrad.addColorStop(1, '#0a0a12');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        roundRect(ctx, 0, 0, W, H, 16);
        ctx.fill();

        // Subtle noise texture overlay
        for (let i = 0; i < 800; i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.012})`;
            ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
        }

        // Top gradient accent line
        const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, _phex);
        lineGrad.addColorStop(0.5, '#06b6d4');
        lineGrad.addColorStop(0.7, _phex);
        lineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(0, 0, W, 2);

        // Faint glow top-left
        const glowGrad = ctx.createRadialGradient(60, 80, 0, 60, 80, 180);
        glowGrad.addColorStop(0, `rgba(${_prgb}, 0.08)`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, W, H);

        // === HEADER: OVR + Position ===
        ctx.fillStyle = _phex;
        ctx.font = '800 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(d.ovr.toString(), 28, 68);

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText('LJ ' + d.ausbildungsjahr, 30, 86);

        // === AVATAR AREA ===
        const avatarCx = W / 2, avatarCy = 170, avatarR = 52;
        // Ring
        ctx.beginPath();
        ctx.arc(avatarCx, avatarCy, avatarR + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${_prgb}, 0.3)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Circled initial
        const initGrad = ctx.createLinearGradient(avatarCx - avatarR, avatarCy - avatarR, avatarCx + avatarR, avatarCy + avatarR);
        initGrad.addColorStop(0, `rgba(${_prgb}, 0.15)`);
        initGrad.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
        ctx.beginPath();
        ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
        ctx.fillStyle = initGrad;
        ctx.fill();

        const initials = d.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        ctx.fillStyle = _phex;
        ctx.font = '700 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(initials, avatarCx, avatarCy + 13);

        // === NAME + TITLE ===
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.name, W / 2, 255);

        ctx.fillStyle = _phex;
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(d.title.toUpperCase(), W / 2, 275);

        // === DIVIDER ===
        const divGrad = ctx.createLinearGradient(40, 0, W - 40, 0);
        divGrad.addColorStop(0, 'transparent');
        divGrad.addColorStop(0.5, `rgba(${_prgb}, 0.2)`);
        divGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divGrad;
        ctx.fillRect(40, 292, W - 80, 1);

        // === STAT BARS (FIFA-Style) ===
        const stats = [
            { label: 'STR', val: Math.min(99, d.streak.current * 3 + 20), desc: 'Streak' },
            { label: 'BST', val: Math.min(99, d.streak.best * 2 + 15), desc: 'Best Streak' },
            { label: 'HRS', val: Math.min(99, Math.round(d.totalHours / 20) + 20), desc: 'Stunden' },
            { label: 'DAY', val: Math.min(99, Math.round(d.totalDays / 5) + 15), desc: 'Tage' },
            { label: 'GRD', val: d.gradeAvg > 0 ? Math.min(99, Math.round((6 - d.gradeAvg) * 18)) : 0, desc: 'Noten' },
            { label: 'OVT', val: Math.min(99, Math.round(Math.abs(d.totalDiff) * 2) + 30), desc: 'Overtime' },
        ];

        const statStartY = 314;
        const statH = 28;
        const barX = 100, barW = 180, barH = 5;

        stats.forEach((s, i) => {
            const y = statStartY + i * statH;

            // Label
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(s.label, 30, y + 4);

            // Value
            ctx.fillStyle = s.val >= 80 ? '#10b981' : s.val >= 50 ? '#f8fafc' : 'rgba(255,255,255,0.5)';
            ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(s.val.toString(), 68, y + 4);

            // Bar bg
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath();
            roundRect(ctx, barX, y - 2, barW, barH, 2);
            ctx.fill();

            // Bar fill
            const fillW = (s.val / 99) * barW;
            const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
            if (s.val >= 80) {
                barGrad.addColorStop(0, '#10b981');
                barGrad.addColorStop(1, '#06b6d4');
            } else if (s.val >= 50) {
                barGrad.addColorStop(0, _phex);
                barGrad.addColorStop(1, '#06b6d4');
            } else {
                barGrad.addColorStop(0, `rgba(${_prgb},0.4)`);
                barGrad.addColorStop(1, `rgba(${_prgb},0.2)`);
            }
            ctx.fillStyle = barGrad;
            ctx.beginPath();
            roundRect(ctx, barX, y - 2, fillW, barH, 2);
            ctx.fill();

            // Stat description (right side)
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(s.desc, W - 30, y + 4);
        });

        // === BOTTOM SECTION ===
        // Separator
        const div2Grad = ctx.createLinearGradient(40, 0, W - 40, 0);
        div2Grad.addColorStop(0, 'transparent');
        div2Grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
        div2Grad.addColorStop(1, 'transparent');
        ctx.fillStyle = div2Grad;
        ctx.fillRect(40, 488, W - 80, 1);

        // Branding
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MyWorkLog  ·  myworklog.de', W / 2, 510);

        // Date stamp
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '500 8px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(dateStr, W - 20, 510);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function downloadSkillCard() {
        const canvas = document.getElementById('skillCardCanvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'MyWorkLog-SkillCard.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showCustomMessage('📥 Gespeichert', 'Skill-Card als PNG heruntergeladen!', 'success');
    }

    async function shareSkillCard() {
        const canvas = document.getElementById('skillCardCanvas');
        if (!canvas || !navigator.share) return;
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'MyWorkLog-SkillCard.png', { type: 'image/png' });
            await navigator.share({
                title: '🃏 Meine Azubi Skill-Card',
                text: 'Check meine MyWorkLog Skill-Card! 💪',
                files: [file]
            });
        } catch (e) {
            if (e.name !== 'AbortError') {
                showCustomMessage('⚠️ Teilen fehlgeschlagen', 'Nutze den Download-Button stattdessen.', 'warning');
            }
        }
    }


    // ============================================
    // FEATURE: MINI CALENDAR WIDGET
    // ============================================
    let miniCalViewMonth = new Date().getMonth();
    let miniCalViewYear = new Date().getFullYear();

    function miniCalNav(dir) {
        miniCalViewMonth += dir;
        if (miniCalViewMonth > 11) { miniCalViewMonth = 0; miniCalViewYear++; }
        if (miniCalViewMonth < 0) { miniCalViewMonth = 11; miniCalViewYear--; }
        renderMiniCalendar();
    }
    function miniCalDayClick(dateStr) {
        // Set entry form date to clicked day
        const inp = document.getElementById('inpDate');
        if (inp) {
            inp.value = dateStr;
            // Scroll to entry form
            const form = document.querySelector('[data-item-id="entry-form"]');
            if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ============================================
    // FEATURE: WOCHENANSICHT TAB (Full Week View)
    // ============================================
    let weekViewOffset = 0; // 0 = current week, -1 = last week, etc.

    function weekViewNavigate(dir) {
        if (dir === 0) weekViewOffset = 0;
        else weekViewOffset += dir;
        renderWeekView();
    }

    function getWeekMonday(offset) {
        const now = new Date();
        const currentDay = now.getDay();
        const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayDiff + (offset * 7));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    function getISOWeekNumber(d) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    }

    // Lokales Datum als YYYY-MM-DD (OHNE UTC-Konvertierung!)
    function toLocalISODate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Prüft ob ein Wochentag (0=So, 6=Sa) ein Arbeitstag ist (Soll-Stunden > 0)
    function isConfiguredWorkDay(dayOfWeek) {
        return (data.settings && data.settings.hours && data.settings.hours[dayOfWeek] > 0);
    }

    // Normalisiert Datumsstrings in ISO-Format (YYYY-MM-DD)
    function normalizeDate(dateStr) {
        if (!dateStr) return null;
        // Falls bereits ISO-Format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Falls Locale-Format (DD.MM.YYYY)
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            const parts = dateStr.split('.');
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        // Fallback: versuche zu parsen
        try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return toLocalISODate(d);
            }
        } catch (e) {}
        return null;
    }

    function getWeekEntries(monday) {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        const entries = [];
        (data.entries || []).forEach(e => {
            const normalizedDate = normalizeDate(e.date);
            if (!normalizedDate) return;
            const d = new Date(normalizedDate);
            d.setHours(0, 0, 0, 0);
            if (d >= monday && d <= sunday) {
                // Normalisiere auch das date-Feld beim Zugriff
                entries.push({ ...e, date: normalizedDate });
            }
        });
        return entries;
    }

    function calcWeekStats(entries) {
        let hours = 0, days = 0, saldo = 0, schoolDays = 0, vacDays = 0, sickDays = 0;
        entries.forEach(e => {
            hours += e.worked || 0;
            saldo += e.diff || 0;
            if (e.type === 'work') days++;
            if (e.type === 'school') { days++; schoolDays++; }
            if (e.type === 'vacation') vacDays++;
            if (e.type === 'sick') sickDays++;
        });
        return { hours, days, saldo, schoolDays, vacDays, sickDays };
    }
    // ════════════════════════════════════════════════════════════════
    // ██  ANALYTICS PRO — Premium Data Visualization Engine        ██
    // ██  Chart.js powered, real-time data from MyWorkLog          ██
    // ════════════════════════════════════════════════════════════════

    // Chart instance registry (destroy before recreate)
    const apCharts = {};

    function apDestroy(id) {
        if (apCharts[id]) { apCharts[id].destroy(); delete apCharts[id]; }
    }

    // Global Chart.js defaults for Analytics Pro
    function apChartDefaults() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        return {
            gridColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
            textColor: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
            primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7',
            primaryRgb: getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').trim() || '168,85,247',
            cyan: '#06b6d4',
            green: '#22c55e',
            amber: '#f59e0b',
            red: '#ef4444',
            blue: '#3b82f6',
            pink: '#ec4899',
            indigo: '#6366f1',
            fontFamily: "'Inter', sans-serif",
            monoFamily: "'JetBrains Mono', monospace",
            isLight
        };
    }
    let apCurrentPeriod = { saldo: 90, weekly: 12 };

    function apRenderPanel(tabId) {
        switch (tabId) {
            case 'overview':   apRenderOverview(); break;
            case 'saldo':      apRenderSaldo(); break;
            case 'heatmap':    apRenderHeatmap(); break;
            case 'weekly':     apRenderWeekly(); break;
            case 'monthly':    apRenderMonthly(); break;
            case 'projects':   apRenderProjects(); break;
            case 'weekday':    apRenderWeekday(); break;
            case 'distribution': apRenderDistribution(); break;
            case '3d':         apRender3D(); break;
            case 'galaxy':     apRenderGalaxy(); break;
        }
    }
    // ── Helper: Get entries sorted by date ──
    function apEntries() {
        return (data.entries || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    }

    // ── Helper: Running saldo array ──
    function apRunningSaldo(entries) {
        let sum = 0;
        return entries.map(e => { sum += (e.diff || 0); return { date: e.date, saldo: sum, diff: e.diff, worked: e.worked, type: e.type }; });
    }

    // ── Helper: Group entries by key ──
    function apGroupBy(entries, keyFn) {
        const map = {};
        entries.forEach(e => {
            const k = keyFn(e);
            if (!map[k]) map[k] = [];
            map[k].push(e);
        });
        return map;
    }

    // ── Helper: Format hours ──
    function apFmtH(h) { return (h >= 0 ? '+' : '') + h.toFixed(2) + 'h'; }

    // ── Helper: Common chart options ──
    function apBaseOpts(cfg) {
        cfg = cfg || {};
        var d = apChartDefaults();
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeInOutQuart' },
            plugins: {
                legend: {
                    display: cfg.legend !== false,
                    labels: { color: d.textColor, font: { family: d.fontFamily, size: 11, weight: '600' }, padding: 16, usePointStyle: true, pointStyleWidth: 8 }
                },
                tooltip: {
                    backgroundColor: d.isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,18,0.95)',
                    titleColor: d.isLight ? '#1a1a2e' : '#fff',
                    bodyColor: d.isLight ? '#333' : 'rgba(255,255,255,0.8)',
                    borderColor: 'rgba(' + d.primaryRgb + ',0.2)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                    titleFont: { family: d.fontFamily, size: 12, weight: '700' },
                    bodyFont: { family: d.monoFamily, size: 11 },
                    displayColors: true,
                    boxPadding: 4
                }
            },
            scales: cfg.noScales ? undefined : {
                x: {
                    grid: { color: d.gridColor, drawBorder: false },
                    ticks: { color: d.textColor, font: { family: d.fontFamily, size: 10 }, maxRotation: 45 }
                },
                y: {
                    grid: { color: d.gridColor, drawBorder: false },
                    ticks: { color: d.textColor, font: { family: d.monoFamily, size: 10 } }
                }
            }
        };
    }

    // ════════════════════════════════════════
    //  1. OVERVIEW PANEL
    // ════════════════════════════════════════
    function apRenderOverview() {
        var entries = apEntries();
        if (!entries.length) {
            document.getElementById('apKpiRow').innerHTML = '<div class="ap-empty"><div class="ap-empty-icon">📊</div>Noch keine Einträge vorhanden</div>';
            return;
        }
        var d = apChartDefaults();

        // KPIs
        var workE = entries.filter(function(e){ return e.type === 'work'; });
        var totalWorked = entries.reduce(function(s, e){ return s + (e.worked || 0); }, 0);
        var totalSaldo = entries.reduce(function(s, e){ return s + (e.diff || 0); }, 0);
        var avgDaily = workE.length ? (workE.reduce(function(s, e){ return s + (e.worked || 0); }, 0) / workE.length) : 0;
        var vacDays = entries.filter(function(e){ return e.type === 'vacation'; }).length;
        var sickDays = entries.filter(function(e){ return e.type === 'sick'; }).length;
        var uniqueMonths = new Set(entries.map(function(e){ return e.date.substring(0, 7); })).size;
        var streak = apCalcStreak(entries);

        document.getElementById('apKpiRow').innerHTML =
            '<div class="ap-kpi"><div class="ap-kpi-value">' + totalWorked.toFixed(1) + '</div><div class="ap-kpi-label">Stunden gesamt</div><div class="ap-kpi-sub">' + entries.length + ' Einträge</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value" style="' + (totalSaldo >= 0 ? '' : '-webkit-text-fill-color:#ef4444;') + '">' + apFmtH(totalSaldo) + '</div><div class="ap-kpi-label">Gleitzeit-Saldo</div><div class="ap-kpi-sub">' + (totalSaldo >= 0 ? 'Überstunden' : 'Minus') + '</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + avgDaily.toFixed(2) + '</div><div class="ap-kpi-label">⌀ Stunden/Tag</div><div class="ap-kpi-sub">Arbeitstage</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + vacDays + '</div><div class="ap-kpi-label">Urlaubstage</div><div class="ap-kpi-sub">' + sickDays + ' Krankheitstage</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + streak + '</div><div class="ap-kpi-label">Tage-Streak</div><div class="ap-kpi-sub">' + uniqueMonths + ' Monate aktiv</div></div>';

        // Overview Saldo (last 30 entries)
        var last30 = apRunningSaldo(entries).slice(-30);
        apDestroy('overviewSaldo');
        var ctx1 = document.getElementById('apChartOverviewSaldo');
        if (ctx1) {
            apCharts.overviewSaldo = new Chart(ctx1.getContext('2d'), {
                type: 'line',
                data: {
                    labels: last30.map(function(e){ var dt = new Date(e.date); return dt.toLocaleDateString('de-DE', {day:'2-digit', month:'short'}); }),
                    datasets: [{
                        label: 'Saldo',
                        data: last30.map(function(e){ return parseFloat(e.saldo.toFixed(2)); }),
                        borderColor: d.primary,
                        backgroundColor: 'rgba(' + d.primaryRgb + ',0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }

        // Overview Types Doughnut
        var typeCounts = {};
        entries.forEach(function(e) {
            var t = e.type || 'other';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        var typeLabels = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', sick: 'Krank', holiday: 'Feiertag', gleittag: 'Gleittag' };
        var typeColors = { work: d.primary, school: d.cyan, vacation: d.green, sick: d.red, holiday: d.amber, gleittag: d.indigo };

        apDestroy('overviewTypes');
        var ctx2 = document.getElementById('apChartOverviewTypes');
        if (ctx2) {
            apCharts.overviewTypes = new Chart(ctx2.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeCounts).map(function(k){ return typeLabels[k] || k; }),
                    datasets: [{
                        data: Object.values(typeCounts),
                        backgroundColor: Object.keys(typeCounts).map(function(k){ return typeColors[k] || '#666'; }),
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'right', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 12, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Mini heatmap
        apRenderMiniHeatmap(entries);
    }

    function apCalcStreak(entries) {
        var dates = new Set(entries.filter(function(e){ return e.type === 'work'; }).map(function(e){ return e.date; }));
        var streak = 0;
        var today = new Date();
        for (var i = 0; i < 365; i++) {
            var dd = new Date(today);
            dd.setDate(dd.getDate() - i);
            var dow = dd.getDay();
            if ((data.settings.hours[dow] || 0) <= 0) continue;
            var iso = dd.toISOString().split('T')[0];
            if (dates.has(iso)) streak++;
            else break;
        }
        return streak;
    }

    function apRenderMiniHeatmap(entries) {
        var container = document.getElementById('apMiniHeatmap');
        if (!container) return;
        var hoursMap = {};
        entries.forEach(function(e) { hoursMap[e.date] = (hoursMap[e.date] || 0) + (e.worked || 0); });

        var today = new Date();
        var oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        var dayLabels = ['', 'Mo', '', 'Mi', '', 'Fr', ''];
        var html = '';
        dayLabels.forEach(function(l) { html += '<div class="ap-heatmap-label">' + l + '</div>'; });

        var startDate = new Date(oneYearAgo);
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

        for (var w = 0; w < 53; w++) {
            for (var dd = 0; dd < 7; dd++) {
                var date = new Date(startDate);
                date.setDate(date.getDate() + w * 7 + dd);
                if (date > today) { html += '<div></div>'; continue; }
                var iso = date.toISOString().split('T')[0];
                var h = hoursMap[iso] || 0;
                var level = h === 0 ? 0 : h < 4 ? 1 : h < 7 ? 2 : h < 9 ? 3 : 4;
                html += '<div class="ap-heatmap-cell" data-level="' + level + '" title="' + date.toLocaleDateString('de-DE') + ': ' + h.toFixed(1) + 'h"></div>';
            }
        }

        html += '<div class="ap-heatmap-legend" style="grid-column: 1/-1;">Weniger ';
        [0,1,2,3,4].forEach(function(l) {
            var bg = l===0?'rgba(var(--primary-rgb),0.06)':l===1?'rgba(var(--primary-rgb),0.2)':l===2?'rgba(var(--primary-rgb),0.4)':l===3?'rgba(var(--primary-rgb),0.6)':'var(--primary)';
            html += '<span style="background:' + bg + '"></span>';
        });
        html += ' Mehr</div>';

        container.innerHTML = '<div class="ap-heatmap" style="grid-template-columns:30px repeat(53,1fr);">' + html + '</div>';
    }

    // ════════════════════════════════════════
    //  2. SALDO TREND PANEL
    // ════════════════════════════════════════
    function apRenderSaldo() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();
        var days = apCurrentPeriod.saldo;

        // Period selector
        var periodEl = document.getElementById('apSaldoPeriod');
        if (periodEl) {
            periodEl.innerHTML = [30,60,90,180,365,0].map(function(n) {
                return '<button class="ap-period-btn ' + (days===n?'active':'') + '" onclick="apCurrentPeriod.saldo=' + n + ';apRenderSaldo();">' + (n===0?'Alle':n+'d') + '</button>';
            }).join('');
        }

        var all = apRunningSaldo(entries);
        var sliced = days > 0 ? all.slice(-days) : all;

        // Cumulative saldo line
        apDestroy('saldo');
        var ctx = document.getElementById('apChartSaldo');
        if (ctx) {
            var saldoData = sliced.map(function(e){ return parseFloat(e.saldo.toFixed(2)); });
            var gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 350);
            gradient.addColorStop(0, 'rgba(' + d.primaryRgb + ',0.25)');
            gradient.addColorStop(1, 'rgba(' + d.primaryRgb + ',0.01)');

            apCharts.saldo = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: sliced.map(function(e){ return new Date(e.date).toLocaleDateString('de-DE', {day:'2-digit',month:'short'}); }),
                    datasets: [{
                        label: 'Kumulierter Saldo',
                        data: saldoData,
                        borderColor: d.primary,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.35,
                        pointRadius: sliced.length > 60 ? 0 : 3,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    }, {
                        label: 'Nulllinie',
                        data: saldoData.map(function(){ return 0; }),
                        borderColor: 'rgba(255,255,255,0.15)',
                        borderDash: [5,5],
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    }]
                },
                options: apBaseOpts()
            });
        }

        // Daily diff bar chart
        apDestroy('dailyDiff');
        var ctx2 = document.getElementById('apChartDailyDiff');
        if (ctx2) {
            apCharts.dailyDiff = new Chart(ctx2.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sliced.map(function(e){ return new Date(e.date).toLocaleDateString('de-DE', {day:'2-digit',month:'short'}); }),
                    datasets: [{
                        label: 'Tages-Diff',
                        data: sliced.map(function(e){ return parseFloat((e.diff||0).toFixed(2)); }),
                        backgroundColor: sliced.map(function(e){ return (e.diff||0) >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'; }),
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }

        // Saldo histogram
        apDestroy('saldoHist');
        var ctx3 = document.getElementById('apChartSaldoHist');
        if (ctx3) {
            var diffs = sliced.map(function(e){ return e.diff || 0; });
            var bins = {};
            diffs.forEach(function(df) {
                var bin = (Math.round(df * 2) / 2).toFixed(1);
                bins[bin] = (bins[bin] || 0) + 1;
            });
            var sortedKeys = Object.keys(bins).sort(function(a,b){ return parseFloat(a) - parseFloat(b); });

            apCharts.saldoHist = new Chart(ctx3.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedKeys.map(function(k){ return k + 'h'; }),
                    datasets: [{
                        label: 'Häufigkeit',
                        data: sortedKeys.map(function(k){ return bins[k]; }),
                        backgroundColor: sortedKeys.map(function(k){ return parseFloat(k) >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'; }),
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }
    }

    // ════════════════════════════════════════
    //  3. HEATMAP PANEL
    // ════════════════════════════════════════
    function apRenderHeatmap() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        // Full year heatmap
        var container = document.getElementById('apHeatmapFull');
        if (container) {
            var hoursMap = {};
            entries.forEach(function(e) { hoursMap[e.date] = (hoursMap[e.date] || 0) + (e.worked || 0); });
            var today = new Date();
            var oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            var dayLabels = ['', 'Mo', '', 'Mi', '', 'Fr', ''];
            var html = '';
            dayLabels.forEach(function(l) { html += '<div class="ap-heatmap-label">' + l + '</div>'; });

            var startDate = new Date(oneYearAgo);
            startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

            // Month labels row
            var monthHtml = '<div></div>';
            var lastMonth = -1;
            for (var w = 0; w < 53; w++) {
                var mdate = new Date(startDate);
                mdate.setDate(mdate.getDate() + w * 7);
                var m = mdate.getMonth();
                if (m !== lastMonth) {
                    monthHtml += '<div style="font-size:0.6rem;color:' + d.textColor + ';text-align:center;">' + mdate.toLocaleDateString('de-DE',{month:'short'}) + '</div>';
                    lastMonth = m;
                } else {
                    monthHtml += '<div></div>';
                }
            }

            for (var w2 = 0; w2 < 53; w2++) {
                for (var dd = 0; dd < 7; dd++) {
                    var date = new Date(startDate);
                    date.setDate(date.getDate() + w2 * 7 + dd);
                    if (date > today) { html += '<div></div>'; continue; }
                    var iso = date.toISOString().split('T')[0];
                    var h = hoursMap[iso] || 0;
                    var level = h === 0 ? 0 : h < 4 ? 1 : h < 7 ? 2 : h < 9 ? 3 : 4;
                    html += '<div class="ap-heatmap-cell" data-level="' + level + '" title="' + date.toLocaleDateString('de-DE') + ': ' + h.toFixed(1) + 'h"></div>';
                }
            }
            html += '<div class="ap-heatmap-legend" style="grid-column: 1/-1;">Weniger ';
            [0,1,2,3,4].forEach(function(l) {
                var bg = l===0?'rgba(var(--primary-rgb),0.06)':l===1?'rgba(var(--primary-rgb),0.2)':l===2?'rgba(var(--primary-rgb),0.4)':l===3?'rgba(var(--primary-rgb),0.6)':'var(--primary)';
                html += '<span style="background:' + bg + '"></span>';
            });
            html += ' Mehr</div>';

            container.innerHTML = '<div style="font-size:0;display:grid;grid-template-columns:30px repeat(53,1fr);gap:2px;margin-bottom:4px;">' + monthHtml + '</div><div class="ap-heatmap" style="grid-template-columns:30px repeat(53,1fr);">' + html + '</div>';
        }

        // Hours per day bar chart (last 60 days)
        apDestroy('hoursPerDay');
        var ctx = document.getElementById('apChartHoursPerDay');
        if (ctx) {
            var last60 = entries.slice(-60);
            apCharts.hoursPerDay = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: last60.map(function(e){ return new Date(e.date).toLocaleDateString('de-DE', {day:'2-digit',month:'short'}); }),
                    datasets: [{
                        label: 'Stunden',
                        data: last60.map(function(e){ return parseFloat((e.worked||0).toFixed(2)); }),
                        backgroundColor: last60.map(function(e) {
                            var hh = e.worked || 0;
                            return hh >= (e.expected||8) ? 'rgba(34,197,94,0.5)' : hh > 0 ? 'rgba(var(--primary-rgb),0.5)' : 'rgba(239,68,68,0.3)';
                        }),
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }

        // Streak stats
        var statsEl = document.getElementById('apStreakStats');
        if (statsEl) {
            var workDates = entries.filter(function(e){ return e.type === 'work' && e.worked > 0; }).map(function(e){ return e.date; });
            var uniqueDates = [];
            var seen = {};
            workDates.forEach(function(d){ if(!seen[d]){seen[d]=true;uniqueDates.push(d);} });
            uniqueDates.sort();
            var maxStreak = 0, curStreak = 0;
            var longestStart = '', longestEnd = '';
            var sStart = '';
            for (var i = 0; i < uniqueDates.length; i++) {
                var cur = new Date(uniqueDates[i]);
                var prev = i > 0 ? new Date(uniqueDates[i-1]) : null;
                var diffDays = prev ? Math.round((cur - prev) / 86400000) : 999;
                if (diffDays <= 3) {
                    curStreak++;
                } else {
                    curStreak = 1;
                    sStart = uniqueDates[i];
                }
                if (curStreak > maxStreak) {
                    maxStreak = curStreak;
                    longestStart = sStart;
                    longestEnd = uniqueDates[i];
                }
            }
            var maxHours = entries.reduce(function(mx, e){ return Math.max(mx, e.worked || 0); }, 0);
            var maxEntry = entries.find(function(e){ return (e.worked || 0) === maxHours; });
            var totalDays = new Set(entries.map(function(e){ return e.date; })).size;

            statsEl.innerHTML =
                '<div class="ap-kpi-row" style="margin:0;">' +
                '<div class="ap-kpi"><div class="ap-kpi-value">' + maxStreak + '</div><div class="ap-kpi-label">Längster Streak</div><div class="ap-kpi-sub">' + (longestStart ? new Date(longestStart).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}) + ' – ' + new Date(longestEnd).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}) : '—') + '</div></div>' +
                '<div class="ap-kpi"><div class="ap-kpi-value">' + maxHours.toFixed(1) + 'h</div><div class="ap-kpi-label">Rekord-Tag</div><div class="ap-kpi-sub">' + (maxEntry ? new Date(maxEntry.date).toLocaleDateString('de-DE') : '—') + '</div></div>' +
                '<div class="ap-kpi"><div class="ap-kpi-value">' + totalDays + '</div><div class="ap-kpi-label">Aktive Tage</div><div class="ap-kpi-sub">Einzigartige Tage</div></div>' +
                '</div>';
        }
    }

    // ════════════════════════════════════════
    //  4. WEEKLY PANEL
    // ════════════════════════════════════════
    function apRenderWeekly() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();
        var weeks = apCurrentPeriod.weekly;

        var periodEl = document.getElementById('apWeeklyPeriod');
        if (periodEl) {
            periodEl.innerHTML = [8,12,20,52,0].map(function(n) {
                return '<button class="ap-period-btn ' + (weeks===n?'active':'') + '" onclick="apCurrentPeriod.weekly=' + n + ';apRenderWeekly();">' + (n===0?'Alle':n+'W') + '</button>';
            }).join('');
        }

        // Group by ISO week
        var weekMap = {};
        entries.forEach(function(e) {
            var date = new Date(e.date);
            var wk = apGetISOWeek(date);
            var yr = date.getFullYear();
            var key = yr + '-KW' + String(wk).padStart(2,'0');
            if (!weekMap[key]) weekMap[key] = { worked: 0, expected: 0, saldo: 0 };
            weekMap[key].worked += (e.worked || 0);
            weekMap[key].expected += (e.expected || 0);
            weekMap[key].saldo += (e.diff || 0);
        });

        var weekKeys = Object.keys(weekMap).sort();
        if (weeks > 0) weekKeys = weekKeys.slice(-weeks);

        // Grouped bar chart
        apDestroy('weekly');
        var ctx = document.getElementById('apChartWeekly');
        if (ctx) {
            apCharts.weekly = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: weekKeys,
                    datasets: [{
                        label: 'Soll',
                        data: weekKeys.map(function(k){ return parseFloat(weekMap[k].expected.toFixed(2)); }),
                        backgroundColor: 'rgba(' + d.primaryRgb + ',0.2)',
                        borderColor: d.primary,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false
                    }, {
                        label: 'Ist',
                        data: weekKeys.map(function(k){ return parseFloat(weekMap[k].worked.toFixed(2)); }),
                        backgroundColor: 'rgba(6,182,212,0.5)',
                        borderColor: d.cyan,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: apBaseOpts()
            });
        }

        // Weekly saldo line
        apDestroy('weeklySaldo');
        var ctx2 = document.getElementById('apChartWeeklySaldo');
        if (ctx2) {
            var runSum = 0;
            var weekSaldoData = weekKeys.map(function(k){ runSum += weekMap[k].saldo; return parseFloat(runSum.toFixed(2)); });

            var grad = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, 'rgba(' + d.primaryRgb + ',0.2)');
            grad.addColorStop(1, 'rgba(' + d.primaryRgb + ',0.01)');

            apCharts.weeklySaldo = new Chart(ctx2.getContext('2d'), {
                type: 'line',
                data: {
                    labels: weekKeys,
                    datasets: [{
                        label: 'Kum. Wochen-Saldo',
                        data: weekSaldoData,
                        borderColor: d.primary,
                        backgroundColor: grad,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        borderWidth: 2.5,
                        pointBackgroundColor: d.primary
                    }]
                },
                options: apBaseOpts({ legend: false })
            });
        }
    }

    function apGetISOWeek(date) {
        var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // ════════════════════════════════════════
    //  5. MONTHLY PANEL
    // ════════════════════════════════════════
    function apRenderMonthly() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        // Group by month and type
        var monthMap = {};
        entries.forEach(function(e) {
            var m = e.date.substring(0, 7);
            if (!monthMap[m]) monthMap[m] = { work: 0, school: 0, vacation: 0, sick: 0, holiday: 0, gleittag: 0, total: 0, count: 0 };
            var t = e.type || 'work';
            if (monthMap[m][t] !== undefined) monthMap[m][t] += (e.worked || 0);
            monthMap[m].total += (e.worked || 0);
            monthMap[m].count++;
        });
        var monthKeys = Object.keys(monthMap).sort();
        var monthLabels = monthKeys.map(function(k) {
            var parts = k.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1])-1).toLocaleDateString('de-DE', {month:'short', year:'2-digit'});
        });

        // Stacked bar chart
        apDestroy('monthlyStack');
        var ctx = document.getElementById('apChartMonthlyStack');
        if (ctx) {
            var baseOpts = apBaseOpts();
            apCharts.monthlyStack = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [
                        { label: 'Arbeit',    data: monthKeys.map(function(k){ return parseFloat(monthMap[k].work.toFixed(1)); }),     backgroundColor: 'rgba(' + d.primaryRgb + ',0.6)', borderRadius: 4, borderSkipped: false },
                        { label: 'Schule',    data: monthKeys.map(function(k){ return parseFloat(monthMap[k].school.toFixed(1)); }),   backgroundColor: 'rgba(6,182,212,0.6)',       borderRadius: 4, borderSkipped: false },
                        { label: 'Urlaub',    data: monthKeys.map(function(k){ return parseFloat(monthMap[k].vacation.toFixed(1)); }), backgroundColor: 'rgba(34,197,94,0.6)',       borderRadius: 4, borderSkipped: false },
                        { label: 'Krank',     data: monthKeys.map(function(k){ return parseFloat(monthMap[k].sick.toFixed(1)); }),     backgroundColor: 'rgba(239,68,68,0.5)',       borderRadius: 4, borderSkipped: false },
                        { label: 'Feiertag',  data: monthKeys.map(function(k){ return parseFloat(monthMap[k].holiday.toFixed(1)); }),  backgroundColor: 'rgba(245,158,11,0.5)',      borderRadius: 4, borderSkipped: false },
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: baseOpts.animation,
                    plugins: baseOpts.plugins,
                    scales: {
                        x: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.fontFamily, size: 10 }, maxRotation: 45 } },
                        y: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.monoFamily, size: 10 } } }
                    }
                }
            });
        }

        // Monthly avg daily hours line
        apDestroy('monthlyAvg');
        var ctx2 = document.getElementById('apChartMonthlyAvg');
        if (ctx2) {
            var avgData = monthKeys.map(function(k) {
                var workDays = entries.filter(function(e){ return e.date.startsWith(k) && e.type === 'work'; }).length;
                return workDays ? parseFloat((monthMap[k].work / workDays).toFixed(2)) : 0;
            });
            var grad = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, 'rgba(6,182,212,0.2)');
            grad.addColorStop(1, 'rgba(6,182,212,0.01)');

            apCharts.monthlyAvg = new Chart(ctx2.getContext('2d'), {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: '⌀ Stunden/Arbeitstag',
                        data: avgData,
                        borderColor: d.cyan,
                        backgroundColor: grad,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderWidth: 2.5,
                        pointBackgroundColor: d.cyan
                    }]
                },
                options: apBaseOpts({ legend: false })
            });
        }
    }

    // ════════════════════════════════════════
    //  6. PROJECTS PANEL
    // ════════════════════════════════════════
    function apRenderProjects() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        var projMap = {};
        entries.forEach(function(e) {
            var p = e.project || 'Kein Projekt';
            if (!projMap[p]) projMap[p] = { hours: 0, count: 0, months: {} };
            projMap[p].hours += (e.worked || 0);
            projMap[p].count++;
            var m = e.date.substring(0, 7);
            projMap[p].months[m] = (projMap[p].months[m] || 0) + (e.worked || 0);
        });

        var sorted = Object.entries(projMap).sort(function(a,b){ return b[1].hours - a[1].hours; });
        var top = sorted.slice(0, 8);
        var projColors = [d.primary, d.cyan, d.green, d.amber, d.blue, d.pink, d.indigo, d.red];

        // Doughnut
        apDestroy('projects');
        var ctx = document.getElementById('apChartProjects');
        if (ctx) {
            apCharts.projects = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: top.map(function(t){ var name = t[0]; return name.length > 20 ? name.substring(0,18)+'…' : name; }),
                    datasets: [{
                        data: top.map(function(t){ return parseFloat(t[1].hours.toFixed(1)); }),
                        backgroundColor: projColors,
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '60%',
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { position: 'right', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 10, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Horizontal bar
        apDestroy('projectBar');
        var ctx2 = document.getElementById('apChartProjectBar');
        if (ctx2) {
            apCharts.projectBar = new Chart(ctx2.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: top.map(function(t){ var name = t[0]; return name.length > 18 ? name.substring(0,16)+'…' : name; }),
                    datasets: [{
                        label: 'Stunden',
                        data: top.map(function(t){ return parseFloat(t[1].hours.toFixed(1)); }),
                        backgroundColor: projColors.map(function(c){ return c + '99'; }),
                        borderColor: projColors,
                        borderWidth: 1.5,
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; o.indexAxis = 'y'; return o; })()
            });
        }

        // Project timeline (top 5 projects over months)
        apDestroy('projectTimeline');
        var ctx3 = document.getElementById('apChartProjectTimeline');
        if (ctx3) {
            var allMonthsSet = {};
            entries.forEach(function(e){ allMonthsSet[e.date.substring(0,7)] = true; });
            var allMonths = Object.keys(allMonthsSet).sort();
            var top5 = sorted.slice(0, 5);

            apCharts.projectTimeline = new Chart(ctx3.getContext('2d'), {
                type: 'line',
                data: {
                    labels: allMonths.map(function(m) {
                        var parts = m.split('-');
                        return new Date(parseInt(parts[0]), parseInt(parts[1])-1).toLocaleDateString('de-DE', {month:'short', year:'2-digit'});
                    }),
                    datasets: top5.map(function(item, i) {
                        var name = item[0];
                        var val = item[1];
                        return {
                            label: name.length > 15 ? name.substring(0,13)+'…' : name,
                            data: allMonths.map(function(m){ return parseFloat((val.months[m] || 0).toFixed(1)); }),
                            borderColor: projColors[i],
                            backgroundColor: projColors[i] + '20',
                            fill: false,
                            tension: 0.3,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            borderWidth: 2
                        };
                    })
                },
                options: apBaseOpts()
            });
        }
    }

    // ════════════════════════════════════════
    //  7. WEEKDAY RADAR PANEL
    // ════════════════════════════════════════
    function apRenderWeekday() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();
        var dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        var dayData = [];
        for (var i = 0; i < 7; i++) dayData.push({ hours: 0, count: 0, diffs: 0, moods: {} });

        entries.forEach(function(e) {
            var dow = new Date(e.date).getDay();
            dayData[dow].hours += (e.worked || 0);
            dayData[dow].count++;
            dayData[dow].diffs += (e.diff || 0);
            if (e.mood) dayData[dow].moods[e.mood] = (dayData[dow].moods[e.mood] || 0) + 1;
        });

        var avgByDay = dayData.map(function(dd){ return dd.count ? dd.hours / dd.count : 0; });

        // Radar chart
        apDestroy('radar');
        var ctx = document.getElementById('apChartRadar');
        if (ctx) {
            apCharts.radar = new Chart(ctx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: dayNames,
                    datasets: [{
                        label: '⌀ Stunden',
                        data: avgByDay.map(function(v){ return parseFloat(v.toFixed(2)); }),
                        borderColor: d.primary,
                        backgroundColor: 'rgba(' + d.primaryRgb + ',0.15)',
                        borderWidth: 2.5,
                        pointBackgroundColor: d.primary,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    }, {
                        label: '⌀ Saldo',
                        data: dayData.map(function(dd){ return dd.count ? parseFloat((dd.diffs / dd.count).toFixed(2)) : 0; }),
                        borderColor: d.cyan,
                        backgroundColor: 'rgba(6,182,212,0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: d.cyan,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    scales: {
                        r: {
                            grid: { color: d.gridColor },
                            angleLines: { color: d.gridColor },
                            pointLabels: { color: d.textColor, font: { family: d.fontFamily, size: 11, weight: '600' } },
                            ticks: { display: false }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: d.textColor, font: { family: d.fontFamily, size: 11, weight: '600' }, padding: 16, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Weekday bar (Mon-Fri)
        apDestroy('weekdayBar');
        var ctx2 = document.getElementById('apChartWeekdayBar');
        if (ctx2) {
            var workDays = [1,2,3,4,5];
            apCharts.weekdayBar = new Chart(ctx2.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: workDays.map(function(i){ return dayNames[i]; }),
                    datasets: [{
                        label: '⌀ Stunden',
                        data: workDays.map(function(i){ return parseFloat(avgByDay[i].toFixed(2)); }),
                        backgroundColor: workDays.map(function(i) {
                            var avg = avgByDay[i];
                            return avg >= 8 ? 'rgba(34,197,94,0.5)' : avg >= 4 ? 'rgba(var(--primary-rgb),0.5)' : 'rgba(245,158,11,0.5)';
                        }),
                        borderRadius: 8,
                        borderSkipped: false
                    }, {
                        label: '⌀ Saldo',
                        data: workDays.map(function(i){ return dayData[i].count ? parseFloat((dayData[i].diffs / dayData[i].count).toFixed(2)) : 0; }),
                        backgroundColor: workDays.map(function(i) {
                            var avg = dayData[i].count ? dayData[i].diffs / dayData[i].count : 0;
                            return avg >= 0 ? 'rgba(6,182,212,0.5)' : 'rgba(239,68,68,0.5)';
                        }),
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: apBaseOpts()
            });
        }

        // Mood by weekday
        apDestroy('moodWeekday');
        var ctx3 = document.getElementById('apChartMoodWeekday');
        if (ctx3) {
            var allMoods = {};
            dayData.forEach(function(dd){ Object.keys(dd.moods).forEach(function(m){ allMoods[m] = true; }); });
            var moodArr = Object.keys(allMoods);
            var moodColors = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#ec4899', '#a855f7', '#06b6d4'];

            if (moodArr.length > 0) {
                var mBaseOpts = apBaseOpts();
                apCharts.moodWeekday = new Chart(ctx3.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: dayNames.slice(1, 6),
                        datasets: moodArr.map(function(mood, i) {
                            return {
                                label: mood,
                                data: [1,2,3,4,5].map(function(dow){ return dayData[dow].moods[mood] || 0; }),
                                backgroundColor: (moodColors[i % moodColors.length]) + '80',
                                borderRadius: 4,
                                borderSkipped: false
                            };
                        })
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        animation: mBaseOpts.animation,
                        plugins: mBaseOpts.plugins,
                        scales: {
                            x: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.fontFamily, size: 10 } } },
                            y: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.monoFamily, size: 10 } } }
                        }
                    }
                });
            } else {
                ctx3.parentElement.innerHTML = '<div class="ap-empty"><div class="ap-empty-icon">😊</div>Noch keine Stimmungs-Daten erfasst</div>';
            }
        }
    }

    // ════════════════════════════════════════
    //  8. DISTRIBUTION PANEL
    // ════════════════════════════════════════
    function apRenderDistribution() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        var typeCounts = {};
        var typeHours = {};
        entries.forEach(function(e) {
            var t = e.type || 'work';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
            typeHours[t] = (typeHours[t] || 0) + (e.worked || 0);
        });
        var typeLabels = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', sick: 'Krank', holiday: 'Feiertag', gleittag: 'Gleittag' };
        var typeColors = { work: d.primary, school: d.cyan, vacation: d.green, sick: d.red, holiday: d.amber, gleittag: d.indigo };

        // Type Doughnut
        apDestroy('typeDoughnut');
        var ctx = document.getElementById('apChartTypeDoughnut');
        if (ctx) {
            var totalTypeHours = Object.values(typeHours).reduce(function(s,v){ return s+v; }, 0);
            apCharts.typeDoughnut = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeHours).map(function(k){ return typeLabels[k] || k; }),
                    datasets: [{
                        data: Object.values(typeHours).map(function(v){ return parseFloat(v.toFixed(1)); }),
                        backgroundColor: Object.keys(typeHours).map(function(k){ return typeColors[k] || '#666'; }),
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '60%',
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { position: 'bottom', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 14, usePointStyle: true } },
                        tooltip: {
                            backgroundColor: d.isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,18,0.95)',
                            titleColor: d.isLight ? '#1a1a2e' : '#fff',
                            bodyColor: d.isLight ? '#333' : 'rgba(255,255,255,0.8)',
                            borderColor: 'rgba(' + d.primaryRgb + ',0.2)',
                            borderWidth: 1, cornerRadius: 10, padding: 12,
                            callbacks: { label: function(c) { return ' ' + c.label + ': ' + c.parsed.toFixed(1) + 'h (' + (totalTypeHours > 0 ? ((c.parsed / totalTypeHours)*100).toFixed(1) : 0) + '%)'; } }
                        }
                    }
                }
            });
        }

        // Polar area
        apDestroy('typePolar');
        var ctx2 = document.getElementById('apChartTypePolar');
        if (ctx2) {
            apCharts.typePolar = new Chart(ctx2.getContext('2d'), {
                type: 'polarArea',
                data: {
                    labels: Object.keys(typeCounts).map(function(k){ return typeLabels[k] || k; }),
                    datasets: [{
                        data: Object.values(typeCounts),
                        backgroundColor: Object.keys(typeCounts).map(function(k){ return (typeColors[k] || '#666') + '80'; }),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    scales: { r: { grid: { color: d.gridColor }, ticks: { display: false } } },
                    plugins: {
                        legend: { position: 'bottom', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 14, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Hours histogram
        apDestroy('hoursHist');
        var ctx3 = document.getElementById('apChartHoursHist');
        if (ctx3) {
            var workEntries = entries.filter(function(e){ return e.type === 'work' && e.worked > 0; });
            var bins = {};
            workEntries.forEach(function(e) {
                var bin = Math.floor(e.worked);
                var label = bin + '-' + (bin+1) + 'h';
                bins[label] = (bins[label] || 0) + 1;
            });
            var sortedBins = Object.entries(bins).sort(function(a,b){ return parseInt(a[0]) - parseInt(b[0]); });

            apCharts.hoursHist = new Chart(ctx3.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedBins.map(function(b){ return b[0]; }),
                    datasets: [{
                        label: 'Tage',
                        data: sortedBins.map(function(b){ return b[1]; }),
                        backgroundColor: sortedBins.map(function(b) {
                            var h = parseInt(b[0]);
                            return h >= 8 ? 'rgba(34,197,94,0.5)' : h >= 6 ? 'rgba(var(--primary-rgb),0.5)' : h >= 4 ? 'rgba(245,158,11,0.5)' : 'rgba(239,68,68,0.5)';
                        }),
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }
    }

    // ════════════════════════════════════════
    //  9. 3D CITY VISUALIZATION (Three.js)
    // ════════════════════════════════════════
    var ap3dState = { scene: null, camera: null, renderer: null, controls: null, animId: null, range: 90, buildings: [], raycaster: null, mouse: null, hoveredBar: null };

    function ap3dSetRange(days, btn) {
        ap3dState.range = days;
        var btns = document.querySelectorAll('.ap3d-controls .ap-period-btn');
        btns.forEach(function(b) { if (b.id !== 'ap3dAutoRotBtn') b.classList.remove('active'); });
        if (btn && btn.id !== 'ap3dAutoRotBtn') btn.classList.add('active');
        apRender3D();
    }

    function ap3dToggleAutoRotate(btn) {
        if (ap3dState.controls) {
            ap3dState.controls.autoRotate = !ap3dState.controls.autoRotate;
            btn.classList.toggle('active');
        }
    }

    function ap3dCleanup() {
        if (ap3dState.animId) { cancelAnimationFrame(ap3dState.animId); ap3dState.animId = null; }
        if (ap3dState.renderer) { ap3dState.renderer.dispose(); ap3dState.renderer = null; }
        if (ap3dState.controls) { ap3dState.controls.dispose(); ap3dState.controls = null; }
        ap3dState.scene = null;
        ap3dState.camera = null;
        ap3dState.buildings = [];
        ap3dState.hoveredBar = null;
        var container = document.getElementById('ap3dContainer');
        if (container) container.innerHTML = '';
    }

    function apRender3D() {
        if (typeof THREE === 'undefined') {
            var container = document.getElementById('ap3dContainer');
            if (container) container.innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">⏳</div>Three.js wird geladen... Bitte Seite neu laden.</div>';
            return;
        }

        ap3dCleanup();

        var entries = apEntries();
        if (!entries.length) {
            document.getElementById('ap3dContainer').innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">🏗️</div>Noch keine Daten für 3D-Ansicht</div>';
            return;
        }

        var range = ap3dState.range;
        var filtered = range > 0 ? entries.slice(-range) : entries;
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';

        // Container setup
        var container = document.getElementById('ap3dContainer');
        var w = container.clientWidth;
        var h = container.clientHeight;

        // Scene
        var scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(isLight ? 0xf8f9fb : 0x030305, 0.012);

        // Camera
        var camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
        camera.position.set(25, 20, 25);
        camera.lookAt(0, 0, 0);

        // Renderer
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false });
        } catch (e) {
            console.warn('[3D] WebGL init failed:', e.message);
        }
        if (!renderer) {
            container.innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">⚠️</div>WebGL nicht verfügbar.<br>Bitte Hardware-Beschleunigung im Browser aktivieren:<br><small>chrome://settings → System → "Hardwarebeschleunigung verwenden"</small><br><br><small>Oder starte Chrome mit: --use-gl=angle --use-angle=d3d11</small></div>';
            return;
        }
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Controls
        var OrbitControlsCtor = THREE.OrbitControls || (window.THREE && window.THREE.OrbitControls);
        if (!OrbitControlsCtor) {
            container.innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">🔄</div>3D-Steuerung wird geladen…<br>Bitte Seite neu laden (F5).</div>';
            renderer.dispose();
            return;
        }
        var controls = new OrbitControlsCtor(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 8;
        controls.maxDistance = 80;
        controls.maxPolarAngle = Math.PI / 2.15;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 1.2;

        // Lighting
        var ambientLight = new THREE.AmbientLight(isLight ? 0x666666 : 0x222233, 1);
        scene.add(ambientLight);

        var dirLight = new THREE.DirectionalLight(isLight ? 0xffffff : 0xddc8ff, 1.5);
        dirLight.position.set(15, 25, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 80;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -30;
        scene.add(dirLight);

        var pointLight = new THREE.PointLight(0xa855f7, 0.6, 50);
        pointLight.position.set(-8, 15, -8);
        scene.add(pointLight);

        var pointLight2 = new THREE.PointLight(0x06b6d4, 0.4, 50);
        pointLight2.position.set(8, 10, 8);
        scene.add(pointLight2);

        // Ground plane
        var groundGeo = new THREE.PlaneGeometry(80, 80);
        var groundMat = new THREE.MeshStandardMaterial({
            color: isLight ? 0xe8e8ee : 0x0a0a12,
            roughness: 0.9,
            metalness: 0.1
        });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid helper
        var grid = new THREE.GridHelper(60, 60, isLight ? 0xccccdd : 0x1a1a2e, isLight ? 0xddddee : 0x12121e);
        grid.position.y = 0;
        scene.add(grid);

        // Build the city
        var buildings = [];
        var maxHours = 12;
        var dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

        // Group by week
        var weekGroups = [];
        var currentWeek = [];
        var lastWeekNum = -1;
        filtered.forEach(function(e) {
            var d = new Date(e.date);
            var wk = apGetISOWeek(d);
            if (wk !== lastWeekNum && currentWeek.length > 0) {
                weekGroups.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(e);
            lastWeekNum = wk;
        });
        if (currentWeek.length > 0) weekGroups.push(currentWeek);

        var gridSpacing = 1.6;
        var barWidth = 1.1;
        var offsetX = -(Math.min(weekGroups.length, 20) * gridSpacing) / 2;
        var offsetZ = -(7 * gridSpacing) / 2;

        // Limit to last N weeks for reasonable rendering
        var maxWeeks = Math.min(weekGroups.length, 52);
        var startWeek = weekGroups.length - maxWeeks;

        for (var wi = startWeek; wi < weekGroups.length; wi++) {
            var week = weekGroups[wi];
            var weekIdx = wi - startWeek;

            for (var di = 0; di < week.length; di++) {
                var entry = week[di];
                var dow = new Date(entry.date).getDay();
                var hours = entry.worked || 0;
                var expected = entry.expected || 8;
                var ratio = expected > 0 ? hours / expected : 0;
                var h = Math.max(0.15, (hours / maxHours) * 10);
                var type = entry.type || 'work';

                // Color based on type and performance
                var color;
                if (type === 'school') color = 0x06b6d4;
                else if (type === 'vacation' || type === 'holiday' || type === 'gleittag') color = 0x3b82f6;
                else if (type === 'sick') color = 0xef4444;
                else if (ratio >= 1.0) color = 0x22c55e;
                else if (ratio >= 0.7) color = 0xa855f7;
                else if (ratio >= 0.4) color = 0xf59e0b;
                else color = 0xef4444;

                // Building geometry with beveled top
                var geo = new THREE.BoxGeometry(barWidth, h, barWidth);
                var mat = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.35,
                    metalness: 0.3,
                    transparent: true,
                    opacity: 0.88
                });
                var mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(
                    offsetX + weekIdx * gridSpacing,
                    h / 2,
                    offsetZ + dow * gridSpacing
                );
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                // Store metadata
                mesh.userData = {
                    date: entry.date,
                    dayName: dayNames[dow],
                    hours: hours,
                    expected: expected,
                    type: type,
                    diff: entry.diff || 0,
                    project: entry.project || '',
                    ratio: ratio
                };

                scene.add(mesh);
                buildings.push(mesh);

                // Top glow for high performers
                if (ratio >= 1.0 && type === 'work') {
                    var glowGeo = new THREE.BoxGeometry(barWidth * 1.15, 0.08, barWidth * 1.15);
                    var glowMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.5 });
                    var glow = new THREE.Mesh(glowGeo, glowMat);
                    glow.position.set(mesh.position.x, h + 0.04, mesh.position.z);
                    scene.add(glow);
                }
            }
        }

        // Day labels on Z axis
        if (typeof THREE.FontLoader === 'undefined') {
            // Use sprites for day labels instead
            dayNames.forEach(function(name, i) {
                var canvas = document.createElement('canvas');
                canvas.width = 64; canvas.height = 32;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
                ctx.font = 'bold 18px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(name, 32, 22);
                var tex = new THREE.CanvasTexture(canvas);
                var spMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                var sprite = new THREE.Sprite(spMat);
                sprite.scale.set(2.5, 1.2, 1);
                sprite.position.set(offsetX - 2.5, 0.5, offsetZ + i * gridSpacing);
                scene.add(sprite);
            });
        }

        // Save state
        ap3dState.scene = scene;
        ap3dState.camera = camera;
        ap3dState.renderer = renderer;
        ap3dState.controls = controls;
        ap3dState.buildings = buildings;

        // Raycaster for hover
        ap3dState.raycaster = new THREE.Raycaster();
        ap3dState.mouse = new THREE.Vector2();

        // Info overlay
        var infoOverlay = document.createElement('div');
        infoOverlay.className = 'ap3d-info-overlay';
        infoOverlay.id = 'ap3dInfo';
        container.appendChild(infoOverlay);

        // Mouse move for hover
        renderer.domElement.addEventListener('mousemove', function(event) {
            var rect = renderer.domElement.getBoundingClientRect();
            ap3dState.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            ap3dState.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });

        // Animate
        var clock = new THREE.Clock();
        function animate() {
            ap3dState.animId = requestAnimationFrame(animate);
            controls.update();

            // Hover detection
            if (ap3dState.raycaster && ap3dState.buildings.length > 0) {
                ap3dState.raycaster.setFromCamera(ap3dState.mouse, camera);
                var intersects = ap3dState.raycaster.intersectObjects(ap3dState.buildings);
                var info = document.getElementById('ap3dInfo');

                if (ap3dState.hoveredBar && ap3dState.hoveredBar !== (intersects.length > 0 ? intersects[0].object : null)) {
                    ap3dState.hoveredBar.material.opacity = 0.88;
                    ap3dState.hoveredBar.material.emissive.setHex(0x000000);
                }

                if (intersects.length > 0) {
                    var obj = intersects[0].object;
                    if (obj.userData.date) {
                        obj.material.opacity = 1.0;
                        obj.material.emissive.setHex(0x222222);
                        ap3dState.hoveredBar = obj;
                        var ud = obj.userData;
                        var typeLabels = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', sick: 'Krank', holiday: 'Feiertag', gleittag: 'Gleittag' };
                        if (info) {
                            info.innerHTML = '<b>' + ud.dayName + ', ' + new Date(ud.date).toLocaleDateString('de-DE') + '</b> &nbsp;|&nbsp; ' +
                                (typeLabels[ud.type] || ud.type) + ' &nbsp;|&nbsp; ' +
                                ud.hours.toFixed(2) + 'h / ' + ud.expected.toFixed(2) + 'h &nbsp;|&nbsp; ' +
                                '<span style="color:' + (ud.diff >= 0 ? '#22c55e' : '#ef4444') + ';">' + (ud.diff >= 0 ? '+' : '') + ud.diff.toFixed(2) + 'h</span>' +
                                (ud.project ? ' &nbsp;|&nbsp; ' + ud.project : '');
                            info.classList.add('visible');
                        }
                    }
                } else {
                    ap3dState.hoveredBar = null;
                    if (info) info.classList.remove('visible');
                }
            }

            // Subtle floating animation for buildings
            var time = clock.getElapsedTime();
            ap3dState.buildings.forEach(function(b, i) {
                b.position.y = (b.geometry.parameters.height / 2) + Math.sin(time * 0.8 + i * 0.15) * 0.03;
            });

            renderer.render(scene, camera);
        }
        animate();

        // Resize handler
        var resizeHandler = function() {
            if (!ap3dState.renderer) return;
            var c = document.getElementById('ap3dContainer');
            if (!c) return;
            var nw = c.clientWidth;
            var nh = c.clientHeight;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        window.addEventListener('resize', resizeHandler);

        // Stats cards
        ap3dRenderStats(filtered);
    }

    function ap3dRenderStats(entries) {
        var statsEl = document.getElementById('ap3dStats');
        if (!statsEl) return;
        var totalDays = entries.length;
        var workDays = entries.filter(function(e){ return e.type === 'work'; });
        var overTarget = workDays.filter(function(e){ return (e.expected||8) > 0 && (e.worked||0) >= (e.expected||8); }).length;
        var avgHours = workDays.length ? (workDays.reduce(function(s,e){ return s + (e.worked||0); }, 0) / workDays.length) : 0;
        var maxH = entries.reduce(function(m,e){ return Math.max(m, e.worked||0); }, 0);
        var buildings = entries.filter(function(e){ return (e.worked||0) > 0; }).length;
        var pctOver = workDays.length ? ((overTarget / workDays.length) * 100).toFixed(1) : 0;

        statsEl.innerHTML =
            '<div class="ap-kpi"><div class="ap-kpi-value">' + buildings + '</div><div class="ap-kpi-label">Gebäude in City</div><div class="ap-kpi-sub">' + totalDays + ' Tage insgesamt</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + pctOver + '%</div><div class="ap-kpi-label">Ziel erreicht</div><div class="ap-kpi-sub">' + overTarget + ' von ' + workDays.length + ' Arbeitstagen</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + avgHours.toFixed(1) + 'h</div><div class="ap-kpi-label">⌀ pro Tag</div><div class="ap-kpi-sub">Rekord: ' + maxH.toFixed(1) + 'h</div></div>';
    }

    // ════════════════════════════════════════════
    //  10. GALAXY VISUALIZATION (Three.js + Bloom)
    // ════════════════════════════════════════════
    var apGxState = { scene:null, camera:null, renderer:null, controls:null, composer:null, animId:null, range:90, stars:[], raycaster:null, mouse:null, hoveredStar:null, bloomEnabled:true };

    function apGxSetRange(days, btn) {
        apGxState.range = days;
        var btns = document.querySelectorAll('.apgx-controls .ap-period-btn');
        btns.forEach(function(b){ if(b.id!=='apGxBloomBtn'&&b.id!=='apGxAutoRotBtn') b.classList.remove('active'); });
        if(btn&&btn.id!=='apGxBloomBtn'&&btn.id!=='apGxAutoRotBtn') btn.classList.add('active');
        apRenderGalaxy();
    }
    function apGxToggleAutoRotate(btn) {
        if(apGxState.controls){ apGxState.controls.autoRotate=!apGxState.controls.autoRotate; btn.classList.toggle('active'); }
    }
    function apGxToggleBloom(btn) {
        apGxState.bloomEnabled = !apGxState.bloomEnabled;
        btn.classList.toggle('active');
    }
    function apGxCleanup() {
        if(apGxState.animId){ cancelAnimationFrame(apGxState.animId); apGxState.animId=null; }
        if(apGxState.composer){ apGxState.composer=null; }
        if(apGxState.renderer){ apGxState.renderer.dispose(); apGxState.renderer=null; }
        if(apGxState.controls){ apGxState.controls.dispose(); apGxState.controls=null; }
        apGxState.scene=null; apGxState.camera=null; apGxState.stars=[]; apGxState.hoveredStar=null;
        var c=document.getElementById('apGxContainer'); if(c) c.innerHTML='';
    }

    function apGxCreateStarTexture(color, size) {
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var half = size / 2;
        // Outer glow
        var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0, color);
        grad.addColorStop(0.15, color);
        grad.addColorStop(0.4, color.replace('1)', '0.3)'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        // Cross flare
        ctx.globalCompositeOperation = 'lighter';
        var flareGrad = ctx.createLinearGradient(0, half, size, half);
        flareGrad.addColorStop(0, 'rgba(255,255,255,0)');
        flareGrad.addColorStop(0.4, color.replace('1)', '0.15)'));
        flareGrad.addColorStop(0.5, color.replace('1)', '0.5)'));
        flareGrad.addColorStop(0.6, color.replace('1)', '0.15)'));
        flareGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, half - 1, size, 3);
        var flareGrad2 = ctx.createLinearGradient(half, 0, half, size);
        flareGrad2.addColorStop(0, 'rgba(255,255,255,0)');
        flareGrad2.addColorStop(0.4, color.replace('1)', '0.1)'));
        flareGrad2.addColorStop(0.5, color.replace('1)', '0.35)'));
        flareGrad2.addColorStop(0.6, color.replace('1)', '0.1)'));
        flareGrad2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = flareGrad2;
        ctx.fillRect(half - 1, 0, 3, size);
        return new THREE.CanvasTexture(canvas);
    }

    function apRenderGalaxy() {
        if(typeof THREE==='undefined'){ var c=document.getElementById('apGxContainer'); if(c) c.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⏳</div>Three.js wird geladen…</div>'; return; }
        apGxCleanup();

        var entries = apEntries();
        if(!entries.length){ document.getElementById('apGxContainer').innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🌌</div>Noch keine Daten für Galaxy</div>'; return; }

        var range = apGxState.range;
        var filtered = range > 0 ? entries.slice(-range) : entries;
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';

        var container = document.getElementById('apGxContainer');
        var w = container.clientWidth, h = container.clientHeight;

        // ── Scene ──
        var scene = new THREE.Scene();

        // ── Camera ──
        var camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 2000);
        camera.position.set(0, 35, 60);
        camera.lookAt(0, 0, 0);

        // ── Renderer ──
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
        } catch(e) {
            console.warn('[Galaxy] WebGL init failed:', e.message);
        }
        if(!renderer) {
            container.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⚠️</div>WebGL nicht verfügbar.<br>Hardware-Beschleunigung aktivieren oder Chrome mit --use-gl=angle --use-angle=d3d11 starten.</div>';
            return;
        }
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // ── OrbitControls ──
        var OC = THREE.OrbitControls || (window.THREE && window.THREE.OrbitControls);
        if(!OC){ container.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🔄</div>Controls laden… Bitte F5</div>'; renderer.dispose(); return; }
        var controls = new OC(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 10;
        controls.maxDistance = 150;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0.6;

        // ── Bloom Postprocessing ──
        var composer = null;
        var hasBloom = typeof THREE.EffectComposer !== 'undefined' && typeof THREE.RenderPass !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined';
        if(hasBloom) {
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, camera));
            var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 1.8, 0.6, 0.2);
            bloomPass.threshold = 0.15;
            bloomPass.strength = 1.8;
            bloomPass.radius = 0.6;
            composer.addPass(bloomPass);
        }

        // ── Lighting ──
        scene.add(new THREE.AmbientLight(isLight ? 0x444444 : 0x111122, 0.3));

        // ── Background starfield (3000 particles) ──
        var bgStarCount = 3000;
        var bgGeo = new THREE.BufferGeometry();
        var bgPos = new Float32Array(bgStarCount * 3);
        var bgSizes = new Float32Array(bgStarCount);
        for(var i=0; i<bgStarCount; i++){
            bgPos[i*3]   = (Math.random()-0.5)*800;
            bgPos[i*3+1] = (Math.random()-0.5)*800;
            bgPos[i*3+2] = (Math.random()-0.5)*800;
            bgSizes[i]   = Math.random()*1.5+0.3;
        }
        bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
        bgGeo.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));
        var bgMat = new THREE.PointsMaterial({ color: isLight ? 0x8888aa : 0xffffff, size:0.8, transparent:true, opacity:0.5, sizeAttenuation:true });
        scene.add(new THREE.Points(bgGeo, bgMat));

        // ── Central core (glowing sun) ──
        var coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
        var coreMat = new THREE.MeshBasicMaterial({ color:0xa855f7, transparent:true, opacity:0.9 });
        var core = new THREE.Mesh(coreGeo, coreMat);
        scene.add(core);

        // Core glow layers
        for(var g=0; g<3; g++){
            var glowGeo = new THREE.SphereGeometry(3+g*1.5, 24, 24);
            var glowMat = new THREE.MeshBasicMaterial({ color:0xa855f7, transparent:true, opacity:0.08-g*0.02, side:THREE.BackSide });
            scene.add(new THREE.Mesh(glowGeo, glowMat));
        }

        // ── Nebula dust ring (subtle ring of particles) ──
        var dustCount = 1200;
        var dustGeo = new THREE.BufferGeometry();
        var dustPos = new Float32Array(dustCount * 3);
        var dustColors = new Float32Array(dustCount * 3);
        for(var d=0; d<dustCount; d++){
            var dAngle = Math.random() * Math.PI * 2;
            var dRadius = 5 + Math.random() * 40;
            var dSpread = (Math.random()-0.5) * 4;
            dustPos[d*3]   = Math.cos(dAngle)*dRadius + (Math.random()-0.5)*3;
            dustPos[d*3+1] = dSpread;
            dustPos[d*3+2] = Math.sin(dAngle)*dRadius + (Math.random()-0.5)*3;
            var dc = Math.random();
            if(dc<0.33){ dustColors[d*3]=0.66; dustColors[d*3+1]=0.33; dustColors[d*3+2]=0.97; }
            else if(dc<0.66){ dustColors[d*3]=0.02; dustColors[d*3+1]=0.71; dustColors[d*3+2]=0.83; }
            else{ dustColors[d*3]=0.13; dustColors[d*3+1]=0.77; dustColors[d*3+2]=0.37; }
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
        var dustMat = new THREE.PointsMaterial({ size:0.4, transparent:true, opacity:0.15, vertexColors:true, sizeAttenuation:true, blending:THREE.AdditiveBlending });
        var dustSystem = new THREE.Points(dustGeo, dustMat);
        scene.add(dustSystem);

        // ── Spiral galaxy ring (dense particles forming spiral arms) ──
        var spiralCount = 2000;
        var spiralGeo = new THREE.BufferGeometry();
        var spiralPos = new Float32Array(spiralCount * 3);
        var spiralColors = new Float32Array(spiralCount * 3);
        for(var sp=0; sp<spiralCount; sp++){
            var arm = sp % 3; // 3 spiral arms
            var t = (sp / spiralCount) * Math.PI * 6;
            var r = 4 + t * 1.5;
            var armOffset = arm * (Math.PI * 2 / 3);
            var scatter = (Math.random()-0.5) * (2 + t*0.3);
            spiralPos[sp*3]   = Math.cos(t + armOffset)*r + scatter;
            spiralPos[sp*3+1] = (Math.random()-0.5)*1.5;
            spiralPos[sp*3+2] = Math.sin(t + armOffset)*r + scatter;
            var brightness = 0.3 + Math.random()*0.4;
            spiralColors[sp*3]   = 0.5*brightness + 0.3;
            spiralColors[sp*3+1] = 0.2*brightness + 0.1;
            spiralColors[sp*3+2] = brightness;
        }
        spiralGeo.setAttribute('position', new THREE.BufferAttribute(spiralPos, 3));
        spiralGeo.setAttribute('color', new THREE.BufferAttribute(spiralColors, 3));
        var spiralMat = new THREE.PointsMaterial({ size:0.5, transparent:true, opacity:0.3, vertexColors:true, sizeAttenuation:true, blending:THREE.AdditiveBlending });
        var spiralSystem = new THREE.Points(spiralGeo, spiralMat);
        scene.add(spiralSystem);

        // ── Data stars (each entry = one star) ──
        var stars = [];
        var totalEntries = filtered.length;
        var colorMap = {
            'superstar': { hex:0x22c55e, rgba:'rgba(34,197,94,1)' },
            'normal':    { hex:0xa855f7, rgba:'rgba(168,85,247,1)' },
            'low':       { hex:0xf59e0b, rgba:'rgba(245,158,11,1)' },
            'red':       { hex:0xef4444, rgba:'rgba(239,68,68,1)' },
            'school':    { hex:0x06b6d4, rgba:'rgba(6,182,212,1)' },
            'special':   { hex:0x3b82f6, rgba:'rgba(59,130,246,1)' }
        };

        // Group by month for spiral arm placement
        var monthGroups = {};
        filtered.forEach(function(e){
            var key = e.date.substring(0,7);
            if(!monthGroups[key]) monthGroups[key]=[];
            monthGroups[key].push(e);
        });
        var monthKeys = Object.keys(monthGroups).sort();

        monthKeys.forEach(function(monthKey, monthIdx){
            var group = monthGroups[monthKey];
            var armAngleBase = (monthIdx / Math.max(monthKeys.length,1)) * Math.PI * 4; // spiral angle per month
            var armRadius = 8 + monthIdx * (35 / Math.max(monthKeys.length,1)); // increasing radius

            group.forEach(function(entry, dayIdx){
                var hours = entry.worked || 0;
                var expected = entry.expected || 8;
                var ratio = expected > 0 ? hours / expected : 0;
                var type = entry.type || 'work';

                // Determine category
                var category;
                if(type==='school') category='school';
                else if(type==='vacation'||type==='holiday'||type==='gleittag') category='special';
                else if(type==='sick') category='red';
                else if(ratio>=1.0) category='superstar';
                else if(ratio>=0.7) category='normal';
                else if(ratio>=0.4) category='low';
                else category='red';

                var cm = colorMap[category];

                // Position in spiral
                var dayAngle = armAngleBase + (dayIdx / Math.max(group.length,1)) * (Math.PI * 2 / Math.max(monthKeys.length,1)) * 0.8;
                var rJitter = (Math.random()-0.5)*3;
                var yJitter = (Math.random()-0.5)*2.5;
                var px = Math.cos(dayAngle) * (armRadius + rJitter);
                var py = yJitter;
                var pz = Math.sin(dayAngle) * (armRadius + rJitter);

                // Star size based on hours
                var starSize = 0.3 + (hours / 12) * 1.2;
                if(category==='superstar') starSize *= 1.4;

                // Create star sprite with glow texture
                var tex = apGxCreateStarTexture(cm.rgba, 128);
                var spriteMat = new THREE.SpriteMaterial({
                    map: tex,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                var sprite = new THREE.Sprite(spriteMat);
                sprite.scale.set(starSize*2.5, starSize*2.5, 1);
                sprite.position.set(px, py, pz);

                // Store metadata
                sprite.userData = {
                    date: entry.date,
                    hours: hours,
                    expected: expected,
                    type: type,
                    diff: entry.diff || 0,
                    project: entry.project || '',
                    ratio: ratio,
                    category: category,
                    baseScale: starSize*2.5,
                    dayName: ['So','Mo','Di','Mi','Do','Fr','Sa'][new Date(entry.date).getDay()]
                };

                scene.add(sprite);
                stars.push(sprite);

                // Extra orbiting particle for superstars
                if(category==='superstar'){
                    var orbitGeo = new THREE.RingGeometry(starSize*1.8, starSize*2.0, 32);
                    var orbitMat = new THREE.MeshBasicMaterial({ color:cm.hex, transparent:true, opacity:0.15, side:THREE.DoubleSide });
                    var orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
                    orbitRing.position.copy(sprite.position);
                    orbitRing.rotation.x = Math.random()*Math.PI;
                    orbitRing.rotation.z = Math.random()*Math.PI;
                    scene.add(orbitRing);
                }
            });
        });

        // ── Month label sprites on outer edge ──
        var monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        monthKeys.forEach(function(key, mi){
            var angle = (mi / Math.max(monthKeys.length,1)) * Math.PI * 4;
            var r = 10 + mi * (35 / Math.max(monthKeys.length,1));
            var parts = key.split('-');
            var label = monthNames[parseInt(parts[1],10)-1] + ' ' + parts[0].substring(2);
            var lCanvas = document.createElement('canvas');
            lCanvas.width = 128; lCanvas.height = 48;
            var lCtx = lCanvas.getContext('2d');
            lCtx.fillStyle = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
            lCtx.font = 'bold 20px Inter, sans-serif';
            lCtx.textAlign = 'center';
            lCtx.fillText(label, 64, 30);
            var lTex = new THREE.CanvasTexture(lCanvas);
            var lSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:lTex, transparent:true }));
            lSprite.scale.set(5,2,1);
            lSprite.position.set(Math.cos(angle)*(r+4), 4, Math.sin(angle)*(r+4));
            scene.add(lSprite);
        });

        // ── Constellation lines connecting streak days ──
        var streakLines = [];
        for(var si=1; si<stars.length; si++){
            var prev = stars[si-1], curr = stars[si];
            if(prev.userData.type==='work' && curr.userData.type==='work'){
                var d1 = new Date(prev.userData.date), d2 = new Date(curr.userData.date);
                var dayDiff = Math.abs(d2-d1)/86400000;
                if(dayDiff<=3){
                    var lineGeo = new THREE.BufferGeometry().setFromPoints([prev.position, curr.position]);
                    var lineMat = new THREE.LineBasicMaterial({ color:0xa855f7, transparent:true, opacity:0.06 });
                    scene.add(new THREE.Line(lineGeo, lineMat));
                }
            }
        }

        // ── Save state ──
        apGxState.scene = scene;
        apGxState.camera = camera;
        apGxState.renderer = renderer;
        apGxState.controls = controls;
        apGxState.composer = composer;
        apGxState.stars = stars;
        apGxState.raycaster = new THREE.Raycaster();
        apGxState.raycaster.params.Points = { threshold: 1 };
        apGxState.mouse = new THREE.Vector2();

        // ── Mouse move ──
        renderer.domElement.addEventListener('mousemove', function(ev){
            var rect = renderer.domElement.getBoundingClientRect();
            apGxState.mouse.x = ((ev.clientX-rect.left)/rect.width)*2-1;
            apGxState.mouse.y = -((ev.clientY-rect.top)/rect.height)*2+1;
        });

        // ── Animation loop ──
        var clock = new THREE.Clock();
        function animate(){
            apGxState.animId = requestAnimationFrame(animate);
            var elapsed = clock.getElapsedTime();
            controls.update();

            // Core pulsing
            var pulse = 1 + Math.sin(elapsed*2)*0.08;
            core.scale.set(pulse, pulse, pulse);

            // Dust rotation
            dustSystem.rotation.y += 0.0003;
            spiralSystem.rotation.y += 0.00015;

            // Star twinkle
            for(var si=0; si<stars.length; si++){
                var s = stars[si];
                var twinkle = 1 + Math.sin(elapsed*3 + si*0.7) * 0.12;
                var bs = s.userData.baseScale;
                s.scale.set(bs*twinkle, bs*twinkle, 1);
            }

            // Hover detection (raycaster against sprites)
            apGxState.raycaster.setFromCamera(apGxState.mouse, camera);
            var hits = apGxState.raycaster.intersectObjects(stars);
            var infoEl = document.getElementById('apGxInfoOverlay');

            if(apGxState.hoveredStar && apGxState.hoveredStar !== (hits.length>0 ? hits[0].object : null)){
                var hbs = apGxState.hoveredStar.userData.baseScale;
                apGxState.hoveredStar.scale.set(hbs, hbs, 1);
                apGxState.hoveredStar.material.opacity = 0.9;
            }

            if(hits.length>0){
                var hit = hits[0].object;
                if(hit.userData.date){
                    hit.material.opacity = 1;
                    var hs = hit.userData.baseScale * 1.6;
                    hit.scale.set(hs, hs, 1);
                    apGxState.hoveredStar = hit;
                    var ud = hit.userData;
                    var typeLabels = {work:'Arbeit',school:'Schule',vacation:'Urlaub',sick:'Krank',holiday:'Feiertag',gleittag:'Gleittag'};
                    if(infoEl){
                        infoEl.innerHTML = '<b>⭐ ' + ud.dayName + ', ' + new Date(ud.date).toLocaleDateString('de-DE') + '</b> &nbsp;|&nbsp; ' +
                            (typeLabels[ud.type]||ud.type) + ' &nbsp;|&nbsp; ' +
                            ud.hours.toFixed(2)+'h / '+ud.expected.toFixed(2)+'h &nbsp;|&nbsp; ' +
                            '<span style="color:'+(ud.diff>=0?'#22c55e':'#ef4444')+'">'+(ud.diff>=0?'+':'')+ud.diff.toFixed(2)+'h</span>' +
                            (ud.project ? ' &nbsp;|&nbsp; '+ud.project : '') +
                            ' &nbsp;|&nbsp; <span style="color:'+(colorMap[ud.category]||colorMap.normal).rgba.replace('1)','0.9)')+'">'+({superstar:'⭐ Superstar',normal:'🟣 Normal',low:'🟡 Dwarf',red:'🔴 Red Giant',school:'🔵 Schule',special:'💙 Spezial'}[ud.category]||'')+'</span>';
                        infoEl.classList.add('visible');
                    }
                }
            } else {
                apGxState.hoveredStar = null;
                if(infoEl) infoEl.classList.remove('visible');
            }

            // Render with or without bloom
            if(apGxState.bloomEnabled && composer){
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }
        animate();

        // ── Resize ──
        window.addEventListener('resize', function(){
            if(!apGxState.renderer) return;
            var c = document.getElementById('apGxContainer');
            if(!c) return;
            var nw=c.clientWidth, nh=c.clientHeight;
            camera.aspect = nw/nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
            if(composer) composer.setSize(nw, nh);
        });

        // ── Stats ──
        apGxRenderStats(filtered);
    }

    function apGxRenderStats(entries){
        var el = document.getElementById('apGxStats');
        if(!el) return;
        var total = entries.length;
        var work = entries.filter(function(e){return e.type==='work';});
        var superstars = work.filter(function(e){return (e.expected||8)>0&&(e.worked||0)>=(e.expected||8);}).length;
        var totalHrs = work.reduce(function(s,e){return s+(e.worked||0);},0);
        var avgH = work.length ? totalHrs/work.length : 0;
        var maxStreak = 0, curStreak = 0;
        for(var i=0;i<entries.length;i++){
            if(entries[i].type==='work'&&(entries[i].worked||0)>=(entries[i].expected||8)){curStreak++;if(curStreak>maxStreak)maxStreak=curStreak;}else{curStreak=0;}
        }
        el.innerHTML =
            '<div class="ap-kpi"><div class="ap-kpi-value">'+total+'</div><div class="ap-kpi-label">⭐ Sterne im Universum</div><div class="ap-kpi-sub">'+superstars+' Superstars</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">'+avgH.toFixed(1)+'h</div><div class="ap-kpi-label">⌀ Leuchtkraft</div><div class="ap-kpi-sub">'+totalHrs.toFixed(0)+'h Gesamtenergie</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">'+maxStreak+'</div><div class="ap-kpi-label">🔥 Längste Supernova</div><div class="ap-kpi-sub">Tage in Serie ≥ Soll</div></div>';
    }
    function calculateCurrentStreak() {
        const entries = data.entries || [];
        if (entries.length === 0) return 0;
        const dates = [...new Set(entries.filter(e => e.type === 'work' || e.type === 'school').map(e => e.date))].sort().reverse();
        if (dates.length === 0) return 0;

        // Prüfe ob der neueste Eintrag aktuell ist (heute oder letzter Arbeitstag)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastWorkday = typeof getLastWorkday === 'function' ? getLastWorkday(today) : (function() {
            const d = new Date(today);
            const dow = d.getDay();
            if (dow === 0) d.setDate(d.getDate() - 2);
            else if (dow === 6) d.setDate(d.getDate() - 1);
            else { d.setDate(d.getDate() - 1); if (d.getDay() === 0) d.setDate(d.getDate() - 2); else if (d.getDay() === 6) d.setDate(d.getDate() - 1); }
            d.setHours(0, 0, 0, 0);
            return d;
        })();

        const newestDate = new Date(dates[0]);
        newestDate.setHours(0, 0, 0, 0);
        // Streak nur zählen wenn der letzte Eintrag von heute oder dem letzten Arbeitstag ist
        if (newestDate.getTime() !== today.getTime() && newestDate < lastWorkday) return 0;

        let streak = 1;
        for (let i = 0; i < dates.length - 1; i++) {
            const d1 = new Date(dates[i]);
            const d2 = new Date(dates[i + 1]);
            const diffDays = Math.floor((d1 - d2) / 86400000);
            if (diffDays === 1 || (diffDays <= 3 && d2.getDay() === 5)) {
                streak++;
            } else break;
        }
        return streak;
    }

    function supportDonate(amount) {
        // Open real PayPal donation link
        const paypalUrl = `https://www.paypal.com/donate?business=sven9micha37%40gmail.com&amount=${amount}&currency_code=EUR&item_name=MyWorkLog+Unterst%C3%BCtzung`;
        window.open(paypalUrl, '_blank', 'noopener,noreferrer');
    }

    function supportDonateCustom() {
        const amount = prompt('Wie viel möchtest du spenden? (€)');
        if (amount && !isNaN(amount) && Number(amount) > 0) {
            supportDonate(Number(amount));
        }
    }

    function supportRate(rating) {
        const emojis = ['', '😞', '😕', '😐', '😊', '🤩'];
        const labels = ['', 'Schlecht', 'Nicht so gut', 'Okay', 'Gut', 'Fantastisch'];
        data.supportRating = rating;
        save();
        showCustomMessage(`${emojis[rating]} ${labels[rating]}!`, 'Danke für dein Feedback! Du hilfst uns, MyWorkLog besser zu machen.', 'success');
    }

    function gatherAppStats() {
        const entries = data.entries || [];
        const now = new Date();
        const currentYear = now.getFullYear();
        
        // Entry type counts
        const workEntries = entries.filter(e => e.type === 'work');
        const schoolEntries = entries.filter(e => e.type === 'school');
        const vacationEntries = entries.filter(e => e.type === 'vacation');
        const gleittagEntries = entries.filter(e => e.type === 'gleittag');
        const sickEntries = entries.filter(e => e.type === 'sick');
        const holidayEntries = entries.filter(e => e.type === 'holiday');
        
        // This year entries
        const thisYearEntries = entries.filter(e => e.date && e.date.startsWith(currentYear.toString()));
        const thisYearWork = thisYearEntries.filter(e => e.type === 'work');
        const thisYearSchool = thisYearEntries.filter(e => e.type === 'school');
        
        // Total hours
        const totalWorked = entries.reduce((s, e) => s + (parseFloat(e.worked) || 0), 0);
        const totalDiff = entries.reduce((s, e) => s + (parseFloat(e.diff) || 0), 0);
        const thisYearWorked = thisYearEntries.reduce((s, e) => s + (parseFloat(e.worked) || 0), 0);
        const thisYearDiff = thisYearEntries.reduce((s, e) => s + (parseFloat(e.diff) || 0), 0);
        
        // Average hours per work/school day
        const activeDays = entries.filter(e => e.type === 'work' || e.type === 'school');
        const avgHoursPerDay = activeDays.length > 0 ? (activeDays.reduce((s, e) => s + (parseFloat(e.worked) || 0), 0) / activeDays.length) : 0;
        
        // First & last entry
        const sortedDates = entries.map(e => e.date).filter(Boolean).sort();
        const firstEntry = sortedDates[0] || '—';
        const lastEntry = sortedDates[sortedDates.length - 1] || '—';
        
        // Days using app
        const daysUsingApp = firstEntry !== '—' ? Math.floor((now - new Date(firstEntry)) / 86400000) : 0;
        
        // Streak
        const streak = calculateCurrentStreak();
        
        // Weekly Soll hours
        const sollHours = (data.settings.hours || []).reduce((s, h) => s + (parseFloat(h) || 0), 0);
        
        // Vacation stats
        const vacTotal = data.settings.vacation?.total || 30;
        const vacUsed = data.settings.vacation?.used || 0;
        const vacRemaining = Math.max(0, vacTotal - vacUsed);
        
        // Break settings
        const breakThresh = data.settings.break?.thresh || 6;
        
        // Unique months with entries
        const uniqueMonths = new Set(entries.map(e => e.date?.substring(0, 7)).filter(Boolean));
        
        // Most productive weekday
        const weekdayHours = [0, 0, 0, 0, 0, 0, 0];
        const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
        const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        entries.forEach(e => {
            if (e.date && (e.type === 'work' || e.type === 'school')) {
                const d = new Date(e.date).getDay();
                weekdayHours[d] += parseFloat(e.worked) || 0;
                weekdayCounts[d]++;
            }
        });
        let bestDay = 1;
        for (let i = 0; i < 7; i++) {
            if (weekdayHours[i] > weekdayHours[bestDay]) bestDay = i;
        }
        
        // Local feedback count
        const feedbackCount = (data.feedback || []).length;
        const featureCount = (data.featureRequests || []).length;
        
        // Theme
        const theme = data.settings.theme || '#a855f7';
        const themeMode = data.settings.themeMode || 'dark';
        
        // Custom types
        const customTypes = data.settings.customTypes || [];
        
        return {
            // User
            user_name: data.settings.name || 'Anonym',
            
            // Totals (all time)
            total_entries: entries.length.toString(),
            total_work_days: workEntries.length.toString(),
            total_school_days: schoolEntries.length.toString(),
            total_vacation_days: vacationEntries.length.toString(),
            total_sick_days: sickEntries.length.toString(),
            total_holiday_days: holidayEntries.length.toString(),
            total_hours: totalWorked.toFixed(1),
            total_saldo: (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(1),
            
            // This year
            year: currentYear.toString(),
            year_entries: thisYearEntries.length.toString(),
            year_work_days: thisYearWork.length.toString(),
            year_school_days: thisYearSchool.length.toString(),
            year_hours: thisYearWorked.toFixed(1),
            year_saldo: (thisYearDiff >= 0 ? '+' : '') + thisYearDiff.toFixed(1),
            
            // Averages
            avg_hours: avgHoursPerDay.toFixed(1),
            
            // Dates & streak
            first_entry: firstEntry,
            last_entry: lastEntry,
            days_using_app: daysUsingApp.toString(),
            current_streak: streak.toString(),
            active_months: uniqueMonths.size.toString(),
            
            // Settings
            weekly_soll: sollHours.toFixed(1),
            break_threshold: breakThresh.toString(),
            vacation_total: vacTotal.toString(),
            vacation_used: vacUsed.toString(),
            vacation_remaining: vacRemaining.toString(),
            
            // Productivity
            best_weekday: dayNames[bestDay],
            best_weekday_hours: weekdayHours[bestDay].toFixed(1),
            
            // App meta
            custom_types_count: customTypes.length.toString(),
            feedback_count: feedbackCount.toString(),
            feature_request_count: featureCount.toString(),
            theme_color: theme,
            theme_mode: themeMode,
            
            // Device & browser
            screen_size: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            platform: navigator.platform || '—',
            language: navigator.language || '—',
            online: navigator.onLine ? 'Ja' : 'Nein',
            touch_device: ('ontouchstart' in window) ? 'Ja' : 'Nein',
            pixel_ratio: (window.devicePixelRatio || 1).toString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
            user_agent: navigator.userAgent.substring(0, 200),
        };
    }

    // ===== DSGVO: Feedback Data Mode =====
    let feedbackDataMode = 'minimal'; // 'minimal' or 'full'

    function setFeedbackDataMode(mode) {
        feedbackDataMode = mode;
        const minBtn = document.getElementById('feedbackModeMinimal');
        const fullBtn = document.getElementById('feedbackModeFull');
        const info = document.getElementById('feedbackDataModeInfo');
        if (mode === 'minimal') {
            if (minBtn) { minBtn.style.background = 'rgba(16,185,129,0.15)'; minBtn.style.borderColor = 'rgba(16,185,129,0.3)'; minBtn.style.color = '#10b981'; }
            if (fullBtn) { fullBtn.style.background = 'rgba(255,255,255,0.03)'; fullBtn.style.borderColor = 'rgba(255,255,255,0.08)'; fullBtn.style.color = 'var(--text-muted)'; }
            if (info) info.innerHTML = '🔒 <strong>Minimal:</strong> Nur Rating, Nachricht & Datum werden gesendet. Keine Gerätedaten.';
        } else {
            if (fullBtn) { fullBtn.style.background = 'rgba(var(--primary-rgb),0.15)'; fullBtn.style.borderColor = 'rgba(var(--primary-rgb),0.3)'; fullBtn.style.color = 'var(--primary)'; }
            if (minBtn) { minBtn.style.background = 'rgba(255,255,255,0.03)'; minBtn.style.borderColor = 'rgba(255,255,255,0.08)'; minBtn.style.color = 'var(--text-muted)'; }
            if (info) info.innerHTML = '📊 <strong>Vollständig:</strong> Rating, Nachricht, Nutzungsstatistiken, Einstellungen & Gerätedaten werden gesendet. Hilft uns, MyWorkLog zu verbessern.';
        }
    }

    function buildFeedbackData(message, rating) {
        const emojis = ['—', '😞', '😕', '😐', '😊', '🤩'];
        const userName = data.settings.name || 'Anonym';
        const dateStr = new Date().toLocaleString('de-DE');

        if (feedbackDataMode === 'full') {
            const stats = gatherAppStats();
            const reportLines = [
                message,
                '',
                '━━━━━━━━━━━━━━━━━━━━━━━━━━',
                '📊 VOLLSTÄNDIGER REPORT',
                '━━━━━━━━━━━━━━━━━━━━━━━━━━',
                '',
                '── GESAMTSTATISTIK ──',
                '📋 Einträge: ' + stats.total_entries,
                '⏱️ Stunden: ' + stats.total_hours + 'h',
                '📈 Saldo: ' + stats.total_saldo + 'h',
                '💼 Arbeitstage: ' + stats.total_work_days,
                '🎓 Schultage: ' + stats.total_school_days,
                '🏖️ Urlaub: ' + stats.total_vacation_days,
                '🤒 Krank: ' + stats.total_sick_days,
                '🎉 Feiertag: ' + stats.total_holiday_days,
                '',
                '── JAHR ' + stats.year + ' ──',
                '📋 Einträge: ' + stats.year_entries,
                '⏱️ Stunden: ' + stats.year_hours + 'h',
                '📈 Saldo: ' + stats.year_saldo + 'h',
                '',
                '── PRODUKTIVITÄT ──',
                '⌀ Stunden/Tag: ' + stats.avg_hours + 'h',
                '📐 Wöchentl. Soll: ' + stats.weekly_soll + 'h',
                '🏆 Bester Tag: ' + stats.best_weekday + ' (' + stats.best_weekday_hours + 'h)',
                '📆 Aktive Monate: ' + stats.active_months,
                '🔥 Streak: ' + stats.current_streak + ' Tage',
                '',
                '── URLAUB ──',
                '🏖️ Gesamt: ' + stats.vacation_total + ' | ✈️ Verbraucht: ' + stats.vacation_used + ' | ✅ Übrig: ' + stats.vacation_remaining,
                '',
                '── APP-ENGAGEMENT ──',
                '📅 Erster Eintrag: ' + stats.first_entry,
                '📅 Letzter Eintrag: ' + stats.last_entry,
                '📆 Tage aktiv: ' + stats.days_using_app,
                '💬 Feedbacks: ' + stats.feedback_count,
                '💡 Feature Requests: ' + stats.feature_request_count,
                '🎨 Theme: ' + stats.theme_color + ' (' + stats.theme_mode + ')',
                '',
                '── GERÄT ──',
                '🖥️ Screen: ' + stats.screen_size + ' @ ' + stats.pixel_ratio + 'x',
                '📐 Viewport: ' + stats.viewport,
                '💻 Platform: ' + stats.platform,
                '🌐 Sprache: ' + stats.language,
                '🕐 Zeitzone: ' + stats.timezone,
                '📶 Online: ' + stats.online,
                '👆 Touch: ' + stats.touch_device,
            ];
            return {
                email: 'sven9micha37@gmail.com',
                message: reportLines.join('\n'),
                rating: rating.toString(),
                rating_emoji: emojis[rating],
                from_name: userName,
                date: dateStr,
                data_mode: 'full',
                ...stats,
            };
        }
        // Minimal: only rating, message, date, name — no device/stats
        return {
            email: 'sven9micha37@gmail.com',
            message: message,
            rating: rating.toString(),
            rating_emoji: emojis[rating],
            from_name: userName,
            date: dateStr,
            data_mode: 'minimal',
        };
    }

    function showFeedbackDataPreview() {
        const previewData = buildFeedbackData(
            document.getElementById('supportFeedbackText')?.value?.trim() || '(Deine Nachricht)',
            data.supportRating || 0
        );
        const lines = Object.entries(previewData).map(([k, v]) => {
            const label = {
                email: '📧 Empfänger', message: '💬 Nachricht', rating: '⭐ Bewertung',
                rating_emoji: '😊 Emoji', from_name: '👤 Name', date: '📅 Datum',
                data_mode: '📊 Datenmodus', user_name: '👤 Benutzername',
                total_entries: '📋 Einträge gesamt', total_hours: '⏱️ Stunden gesamt',
                total_saldo: '📈 Saldo gesamt', total_work_days: '💼 Arbeitstage',
                total_school_days: '🎓 Schultage', total_vacation_days: '🏖️ Urlaubstage',
                total_sick_days: '🤒 Krankheitstage', total_holiday_days: '🎉 Feiertage',
                year: '📅 Jahr', year_entries: '📋 Einträge (Jahr)', year_hours: '⏱️ Stunden (Jahr)',
                year_saldo: '📈 Saldo (Jahr)', year_work_days: '💼 Arbeit (Jahr)',
                year_school_days: '🎓 Schule (Jahr)',
                avg_hours: '⌀ Stunden/Tag', weekly_soll: '📐 Wöchentl. Soll',
                best_weekday: '🏆 Produktivster Tag', best_weekday_hours: '🏆 Std. an dem Tag',
                active_months: '📆 Aktive Monate', break_threshold: '⏸️ Pausenschwelle',
                first_entry: '📅 Erster Eintrag', last_entry: '📅 Letzter Eintrag',
                days_using_app: '📆 Tage aktiv', current_streak: '🔥 Streak',
                vacation_total: '🏖️ Urlaub gesamt', vacation_used: '✈️ Urlaub verbraucht',
                vacation_remaining: '✅ Urlaub übrig',
                custom_types_count: '🎨 Eigene Typen', feedback_count: '💬 Feedbacks',
                feature_request_count: '💡 Feature Requests',
                theme_color: '🎨 Theme Farbe', theme_mode: '🌙 Theme Modus',
                screen_size: '🖥️ Bildschirm', viewport: '📐 Viewport',
                platform: '💻 Platform', language: '🌐 Sprache',
                timezone: '🕐 Zeitzone', online: '📶 Online',
                touch_device: '👆 Touch', pixel_ratio: '🔍 Pixel Ratio',
                user_agent: '🌐 User Agent',
            };
            const displayKey = label[k] || k;
            const displayVal = (k === 'message') ? '(Dein Text)' : (k === 'email') ? '(Entwickler)' : v;
            return `<tr><td style="padding:4px 8px; font-size:0.72rem; color:var(--text-muted); white-space:nowrap;">${displayKey}</td><td style="padding:4px 8px; font-size:0.72rem; color:var(--text-main); word-break:break-all; font-family:var(--font-mono);">${displayVal}</td></tr>`;
        }).join('');

        const count = Object.keys(previewData).length;
        const html = `
            <div style="max-height:60vh; overflow-y:auto; margin-top:12px;">
                <div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:12px;">
                    📊 <strong>${count} Datenfelder</strong> werden im <strong>${feedbackDataMode === 'full' ? 'Vollständig' : 'Minimal'}</strong>-Modus gesendet:
                </div>
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr>
                        <th style="text-align:left; padding:6px 8px; font-size:0.7rem; color:var(--primary); border-bottom:1px solid rgba(var(--primary-rgb),0.2); text-transform:uppercase; letter-spacing:1px;">Feld</th>
                        <th style="text-align:left; padding:6px 8px; font-size:0.7rem; color:var(--primary); border-bottom:1px solid rgba(var(--primary-rgb),0.2); text-transform:uppercase; letter-spacing:1px;">Wert</th>
                    </tr></thead>
                    <tbody>${lines}</tbody>
                </table>
            </div>
            <div style="margin-top:16px; padding:10px 14px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:10px; font-size:0.72rem; color:var(--text-muted); line-height:1.5;">
                🔒 Daten werden verschlüsselt über <strong>EmailJS</strong> (HTTPS) an den Entwickler gesendet. Keine Speicherung bei Drittanbietern über die E-Mail-Zustellung hinaus.
                <br>📄 <a href="Pages/DE-Gestz/DSGVO.html" target="_blank" style="color:var(--primary);">Datenschutzerklärung lesen</a>
            </div>
        `;
        showCustomMessage('👁️ Datenvorschau — ' + (feedbackDataMode === 'full' ? 'Vollständig' : 'Minimal'), html, 'info');
    }

    function supportSendFeedback() {
        const text = document.getElementById('supportFeedbackText');
        if (!text || !text.value.trim()) {
            showCustomMessage('💬 Feedback', 'Bitte schreibe etwas in das Textfeld.', 'warning');
            return;
        }

        // DSGVO: Check consent
        const consent = document.getElementById('feedbackDSGVOConsent');
        if (!consent || !consent.checked) {
            showCustomMessage('🔒 Datenschutz', 'Bitte stimme der Datenschutzerklärung zu, bevor du dein Feedback sendest.', 'warning');
            if (consent) { consent.parentElement.style.animation = 'shake 0.4s ease'; setTimeout(() => consent.parentElement.style.animation = '', 500); }
            return;
        }

        const rating = data.supportRating || 0;
        const feedbackData = buildFeedbackData(text.value.trim(), rating);

        // Send via EmailJS
        if (typeof emailjs !== 'undefined') {
            const sendBtn = document.querySelector('#view-support .btn-primary[onclick*="supportSendFeedback"]');
            if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳ Sende...'; }

            emailjs.send('service_22m5bcs', 'template_xe5xc1k', feedbackData)
                .then(() => {
                    // Also store locally
                    if (!data.feedback) data.feedback = [];
                    data.feedback.push({ date: new Date().toISOString(), text: text.value.trim(), rating: rating, sent: true, dataMode: feedbackDataMode, consent: true });
                    save();
                    text.value = '';
                    data.supportRating = 0;
                    if (consent) consent.checked = false;
                    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '📨 Feedback senden'; }
                    showCustomMessage('📨 Gesendet!', 'Dein Feedback wurde erfolgreich zugestellt. Vielen Dank!', 'success');
                })
                .catch((err) => {
                    console.warn('EmailJS Fehler:', err);
                    // Fallback: store locally
                    if (!data.feedback) data.feedback = [];
                    data.feedback.push({ date: new Date().toISOString(), text: text.value.trim(), rating: rating, sent: false, dataMode: feedbackDataMode, consent: true });
                    save();
                    text.value = '';
                    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '📨 Feedback senden'; }
                    showCustomMessage('📨 Gespeichert', 'Feedback lokal gespeichert (Senden fehlgeschlagen). Wir arbeiten dran!', 'warning');
                });
        } else {
            // No EmailJS — store locally only
            if (!data.feedback) data.feedback = [];
            data.feedback.push({ date: new Date().toISOString(), text: text.value.trim(), rating: rating, sent: false, dataMode: feedbackDataMode, consent: true });
            save();
            text.value = '';
            showCustomMessage('📨 Gespeichert!', 'Dein Feedback wurde lokal gespeichert.', 'success');
        }
    }

    function supportFeatureRequest() {
        const idea = prompt('💡 Was wünschst du dir in MyWorkLog?');
        if (idea && idea.trim()) {
            // DSGVO: Feature requests send minimal data only (just the idea text)
            if (typeof emailjs !== 'undefined') {
                const minimalData = buildFeedbackData('💡 FEATURE REQUEST: ' + idea.trim(), 0);
                emailjs.send('service_22m5bcs', 'template_xe5xc1k', minimalData
                ).catch(e => console.warn('EmailJS Feature-Request Fehler:', e));
            }
            if (!data.featureRequests) data.featureRequests = [];
            data.featureRequests.push({ date: new Date().toISOString(), text: idea.trim() });
            save();
            showCustomMessage('💡 Notiert!', 'Dein Feature-Wunsch wurde gesendet. Danke für die Idee!', 'success');
        }
    }

    function supportShare() {
        const shareData = { title: 'MyWorkLog', text: 'Schau dir MyWorkLog an – die beste Zeiterfassung für Azubis!', url: window.location.href };
        if (navigator.share) {
            navigator.share(shareData).catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showCustomMessage('📣 Link kopiert!', 'Der Link wurde in die Zwischenablage kopiert. Teile ihn mit deinen Freunden!', 'success');
            });
        }
    }

    // ============================================
    // FEATURE: QUICK ENTRY TEMPLATES
    // ============================================
    function renderQuickTemplates() {
        const grid = document.getElementById('quickTemplatesGrid');
        if (!grid) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const dayIndex = now.getDay();
        const defaultHours = (data.settings && data.settings.hours) ? (data.settings.hours[dayIndex] || 8) : 8;

        // Check if today already has an entry
        const hasTodayEntry = (data.entries || []).some(e => e.date === todayStr);

        const templates = [
            { icon: '💼', label: 'Standard Tag', sub: `${defaultHours}h Arbeit`, type: 'work', hours: defaultHours },
            { icon: '📚', label: 'Schultag', sub: `${defaultHours}h Schule`, type: 'school', hours: defaultHours },
            { icon: '🌴', label: 'Urlaub', sub: `${defaultHours}h Urlaub`, type: 'vacation', hours: defaultHours },
            { icon: '💊', label: 'Krankentag', sub: `${defaultHours}h Krank`, type: 'sick', hours: defaultHours },
            { icon: '⏰', label: 'Halber Tag', sub: `${(defaultHours / 2).toFixed(1)}h`, type: 'work', hours: defaultHours / 2 },
            { icon: '🔄', label: 'Überstunden', sub: `${(defaultHours + 2)}h Arbeit`, type: 'work', hours: defaultHours + 2 }
        ];

        grid.innerHTML = templates.map((t, i) => `
            <button class="quick-tpl-btn" onclick="applyQuickTemplate(${i})" ${hasTodayEntry ? 'title="Heute ist bereits ein Eintrag vorhanden"' : ''}>
                <span class="quick-tpl-icon">${t.icon}</span>
                <span class="quick-tpl-label">${t.label}</span>
                <span class="quick-tpl-sub">${t.sub}</span>
            </button>
        `).join('');

        // Store templates for use
        window._quickTemplates = templates;
    }

    function applyQuickTemplate(index) {
        const t = window._quickTemplates[index];
        if (!t) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Check for duplicate
        const existing = (data.entries || []).find(e => e.date === todayStr && e.type === t.type);
        if (existing) {
            if (!confirm(`Heute gibt es bereits einen ${t.type}-Eintrag. Trotzdem hinzufügen?`)) return;
        }

        const expected = (data.settings && data.settings.hours) ? (data.settings.hours[now.getDay()] || 8) : 8;
        const entry = {
            id: Date.now(),
            date: todayStr,
            type: t.type,
            worked: t.hours,
            diff: t.hours - expected,
            info: `Schnelleintrag: ${t.label}`,
            start: '',
            end: '',
            project: '',
            notes: `Per 1-Klick Vorlage erstellt`
        };

        data.entries.unshift(entry);
        if (t.type === 'vacation') {
            recalculateVacationUsed();
        }

        showSmartNotification('⚡ Schnelleintrag', `${t.icon} ${t.label} (${t.hours}h) für heute gebucht!`, 'success');
        save();
    }

    // ============================================
    // FEATURE: MOBILE BOTTOM NAVIGATION
    // ============================================
    function mobNavSwitch(tabId) {
        // Close sidebar if open
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            toggleSidebar();
        }

        // Switch tab using existing system
        if (typeof switchTab === 'function') {
            switchTab(tabId);
        }

        // Update active states
        document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`mobNav-${tabId}`);
        if (activeBtn) activeBtn.classList.add('active');
    }

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

        // Laufende Schicht einrechnen (Start-Zeit eingegeben aber noch nicht gespeichert)
        if (todayWorked === 0) {
            try {
                const startInput = document.getElementById('inpStart');
                const dateInput = document.getElementById('inpDate');
                if (startInput && startInput.value && dateInput && dateInput.value === today) {
                    const [sh, sm] = startInput.value.split(':').map(Number);
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
        if (now.getHours() === 15 && !sessionStorage.getItem('tt_notif_afternoon')) {
            let message = '';
            if (deficit > 0) {
                message = `Du brauchst noch ${deficit.toFixed(1)}h heute! (Soll: ${todayExpected.toFixed(2)}h, bisher: ${todayWorked.toFixed(2)}h)`;
                showSmartNotification('⏰ Nachmittags-Check', message, 'warning');
                sessionStorage.setItem('tt_notif_afternoon', 'shown');
            } else {
                showSmartNotification('✅ Tagesgoal erreicht!', `Du hast dein Soll bereits erfüllt! 🎉`, 'success');
                sessionStorage.setItem('tt_notif_afternoon', 'shown');
            }
        }

        // Feierabend-Erinnerung (17:00 Uhr)
        if (now.getHours() === 17 && !sessionStorage.getItem('tt_notif_evening')) {
            if (deficit > 0) {
                showSmartNotification('🌆 Feierabend-Reminder', `Noch ${deficit.toFixed(1)}h — möchtest du noch ein bisschen arbeiten?`, 'info');
                sessionStorage.setItem('tt_notif_evening', 'shown');
            } else if (isFriday) {
                showSmartNotification('✨ Schönes Wochenende!', `Dein Tag ist voll! Genieß die Freizeit! 🏖️`, 'success');
                sessionStorage.setItem('tt_notif_evening', 'shown');
            } else {
                showSmartNotification('✅ Feierabend!', `Tagesziel erreicht — schönen Feierabend! 🎉`, 'success');
                sessionStorage.setItem('tt_notif_evening', 'shown');
            }
        }

        // Wochenende-Check (Freitag 16:00 Uhr)
        if (now.getDay() === 5 && now.getHours() === 16 && !sessionStorage.getItem('tt_notif_friday')) {
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
            sessionStorage.setItem('tt_notif_friday', 'shown');
        }

        // Export/Backup Reminder (wenn älter als 7 Tage oder nie exportiert)
        try {
            if (alertSettings.exportReminder) {
                const lastExport = localStorage.getItem('tt_last_export');
                let needsExport = false;
                if (!lastExport) needsExport = true;
                else {
                    const diffMs = Date.now() - new Date(lastExport).getTime();
                    if (diffMs > (7 * 24 * 60 * 60 * 1000)) needsExport = true;
                }
                const exportReminderKey = 'tt_export_reminder_shown_' + today;
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
        if (totalDiff >= 100 && totalDiff < 101 && !localStorage.getItem('tt_milestone_100h')) {
            showSmartNotification('🎉 MEGA!', 'Du hast 100h Überstunden erreicht! 🚀', 'success');
            localStorage.setItem('tt_milestone_100h', 'shown');
        }

        // 50h Überstunden
        if (totalDiff >= 50 && totalDiff < 51 && !localStorage.getItem('tt_milestone_50h')) {
            showSmartNotification('🎊 Wow!', '50h Überstunden - Das ist beeindruckend! 💪', 'success');
            localStorage.setItem('tt_milestone_50h', 'shown');
        }
    }

    // Starte periodische Notifications (jede Minute prüfen)
    setInterval(checkSmartNotifications, 60000);

    // Auch sofort einmal prüfen
    checkSmartNotifications();

    // ===== ERROR BOUNDARY / FALLBACK UI =====
    window.addEventListener('error', function(event) {
        console.error('🔴 Global Error:', event.message, event.filename, event.lineno);
        const mainDiv = document.querySelector('.main') || document.body;
        if (!mainDiv.querySelector('.error-fallback')) {
            const errorUI = document.createElement('div');
            errorUI.className = 'error-fallback';
            errorUI.innerHTML = `
                <div style="background: var(--bg-glass); border: 1px solid var(--danger); border-radius: var(--radius); padding: 2rem; margin: 2rem 0; text-align: center;">
                    <h2 style="color: var(--danger); margin-bottom: 1rem;">⚠️ Oops! Etwas ist schief gelaufen</h2>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Die App hat einen Fehler entdeckt. Bitte versuche die Seite zu aktualisieren. Oder Wende dich an den Support (support@myworklog.com).</p>
                    <button onclick="location.reload()" style="background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600;">🔄 Seite aktualisieren</button>
                </div>
            `;
            mainDiv.insertBefore(errorUI, mainDiv.firstChild);
        }
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
            overlay.innerHTML = `
                <div class="loading-spinner-container">
                    <div class="loading-spinner"></div>
                    <h2>${message}</h2>
                </div>
            `;
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
    showLoadingSpinner('⏳ TimeTracker wird geladen...');

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
                try {
                    window.cloudSyncUI = new SupabaseCloudSyncUI(window.cloudSync);
                    console.log('[App] ✅ Cloud Sync UI erfolgreich aktiviert!');
                    setupCloudSyncIntegration();
                    
                    // Aktualisiere UI sofort mit aktuellem Status
                    const isLoggedIn = window.cloudSync.isLoggedIn();
                    const user = window.cloudSync.getCurrentUser();
                    updateCloudSyncUI(isLoggedIn, user);
                } catch (err) {
                    console.warn('[App] ⚠️ Cloud Sync UI Init Fehler:', err.message);
                    // Trotzdem Cloud Sync Integration versuchen
                    setupCloudSyncIntegration();
                }
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
    
    // ============================================
    // API STATUS MONITOR (Edge Logs Style)
    // ============================================
    
    const apiStatusMonitor = {
        logs: JSON.parse(localStorage.getItem('api_status_logs') || '[]'),
        currentRange: '24h',
        
        // Record an API call result
        record(method, path, status, timestamp) {
            const entry = {
                method: (method || 'GET').toUpperCase(),
                path: path || '/',
                status: parseInt(status) || 0,
                ts: timestamp || Date.now()
            };
            this.logs.push(entry);
            // Keep max 2000 entries (roughly 30 days of moderate usage)
            if (this.logs.length > 2000) this.logs = this.logs.slice(-2000);
            this.save();
        },
        
        save() {
            try { localStorage.setItem('api_status_logs', JSON.stringify(this.logs)); } catch(e) {}
        },
        
        getFilteredLogs(range) {
            const now = Date.now();
            const ranges = {
                '1h': 3600000,
                '24h': 86400000,
                '7d': 604800000,
                '30d': 2592000000
            };
            const cutoff = now - (ranges[range] || ranges['24h']);
            return this.logs.filter(l => l.ts >= cutoff).sort((a, b) => b.ts - a.ts);
        },
        
        render() {
            const range = this.currentRange;
            const logs = this.getFilteredLogs(range);
            const now = Date.now();
            
            // --- Uptime bar (segments representing time buckets) ---
            const barEl = document.getElementById('apiUptimeBar');
            const totalSegments = 45;
            const ranges = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
            const totalMs = ranges[range] || ranges['24h'];
            const segmentMs = totalMs / totalSegments;
            
            let uptimeSegments = '';
            let totalOk = 0, totalErr = 0;
            
            for (let i = 0; i < totalSegments; i++) {
                const segStart = now - totalMs + (i * segmentMs);
                const segEnd = segStart + segmentMs;
                const segLogs = this.logs.filter(l => l.ts >= segStart && l.ts < segEnd);
                
                let color = 'rgba(255,255,255,0.04)'; // No data
                let tooltip = 'Keine Daten';
                
                if (segLogs.length > 0) {
                    const errors = segLogs.filter(l => l.status >= 500);
                    const warnings = segLogs.filter(l => l.status >= 400 && l.status < 500);
                    totalOk += segLogs.length - errors.length;
                    totalErr += errors.length;
                    
                    if (errors.length > 0) {
                        color = '#ef4444';
                        tooltip = `${errors.length} Fehler / ${segLogs.length} Requests`;
                    } else if (warnings.length > segLogs.length * 0.5) {
                        color = '#f59e0b';
                        tooltip = `${warnings.length} Warnings / ${segLogs.length} Requests`;
                    } else {
                        color = '#10b981';
                        tooltip = `${segLogs.length} Requests — alles OK`;
                    }
                }
                
                uptimeSegments += `<div title="${tooltip}" style="flex:1; height:100%; background:${color}; border-radius:2px; transition:opacity 0.15s; cursor:pointer;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'"></div>`;
            }
            barEl.innerHTML = uptimeSegments;
            
            // Uptime percentage
            const totalAll = totalOk + totalErr;
            const uptime = totalAll > 0 ? ((totalOk / totalAll) * 100) : 100;
            const uptimeEl = document.getElementById('apiUptimePercent');
            uptimeEl.textContent = uptime.toFixed(uptime >= 99.9 ? 2 : 1) + '%';
            uptimeEl.style.color = uptime >= 99 ? '#10b981' : uptime >= 95 ? '#f59e0b' : '#ef4444';
            
            // Range labels
            const rangeLabels = { '1h': 'Vor 1 Stunde', '24h': 'Vor 24h', '7d': 'Vor 7 Tagen', '30d': 'Vor 30 Tagen' };
            document.getElementById('apiRangeStart').textContent = rangeLabels[range] || '—';
            
            // Overall status
            const statusDot = document.getElementById('apiStatusDot');
            const statusText = document.getElementById('apiStatusText');
            const recentLogs = this.getFilteredLogs('1h');
            const recent5xx = recentLogs.filter(l => l.status >= 500).length;
            const recent4xx = recentLogs.filter(l => l.status >= 400 && l.status < 500).length;
            
            if (recent5xx > 0) {
                statusDot.style.background = '#ef4444';
                statusDot.style.boxShadow = '0 0 8px rgba(239,68,68,0.5)';
                statusText.textContent = `${recent5xx} Server-Fehler in der letzten Stunde`;
                statusText.style.color = '#ef4444';
            } else if (recent4xx > 2) {
                statusDot.style.background = '#f59e0b';
                statusDot.style.boxShadow = '0 0 8px rgba(245,158,11,0.5)';
                statusText.textContent = `${recent4xx} Client-Fehler — prüfen`;
                statusText.style.color = '#f59e0b';
            } else if (logs.length === 0) {
                statusDot.style.background = 'rgba(255,255,255,0.15)';
                statusDot.style.boxShadow = 'none';
                statusText.textContent = 'Keine Daten im Zeitraum';
                statusText.style.color = 'rgba(255,255,255,0.4)';
            } else {
                statusDot.style.background = '#10b981';
                statusDot.style.boxShadow = '0 0 8px rgba(16,185,129,0.5)';
                statusText.textContent = 'Alle Systeme operational';
                statusText.style.color = 'rgba(255,255,255,0.4)';
            }
            
            // --- Status Code Breakdown ---
            const codesEl = document.getElementById('apiStatusCodes');
            const codeCounts = {};
            logs.forEach(l => {
                const code = l.status || 0;
                codeCounts[code] = (codeCounts[code] || 0) + 1;
            });
            
            if (Object.keys(codeCounts).length === 0) {
                codesEl.innerHTML = '<span style="font-size:0.72rem; color:rgba(255,255,255,0.2);">Noch keine Requests aufgezeichnet</span>';
            } else {
                // Sort: 5xx first, then 4xx, 3xx, 2xx
                const sorted = Object.entries(codeCounts).sort((a, b) => {
                    const ca = Math.floor(parseInt(a[0]) / 100);
                    const cb = Math.floor(parseInt(b[0]) / 100);
                    if (cb !== ca) return cb - ca; // 5xx > 4xx > 3xx > 2xx
                    return parseInt(b[0]) - parseInt(a[0]);
                });
                
                codesEl.innerHTML = sorted.map(([code, count]) => {
                    const cat = Math.floor(parseInt(code) / 100);
                    const cls = cat >= 5 ? 's5xx' : cat >= 4 ? 's4xx' : cat >= 3 ? 's3xx' : 's2xx';
                    return `<span class="api-status-pill ${cls}">${code} <span style="opacity:0.7; font-weight:500;">×${count}</span></span>`;
                }).join('');
            }
            
            // --- Endpoint Health ---
            const endpointEl = document.getElementById('apiEndpointList');
            const endpoints = {};
            logs.forEach(l => {
                const key = l.path;
                if (!endpoints[key]) endpoints[key] = { path: key, methods: new Set(), total: 0, errors: 0, lastStatus: 0 };
                endpoints[key].methods.add(l.method);
                endpoints[key].total++;
                if (l.status >= 400) endpoints[key].errors++;
                endpoints[key].lastStatus = l.status;
            });
            
            const endpointArr = Object.values(endpoints).sort((a, b) => b.total - a.total).slice(0, 8);
            
            if (endpointArr.length === 0) {
                endpointEl.innerHTML = '<div style="padding:12px; text-align:center; color:rgba(255,255,255,0.2); font-size:0.72rem;">Keine Endpoints erfasst</div>';
            } else {
                endpointEl.innerHTML = endpointArr.map(ep => {
                    const errorRate = ep.total > 0 ? (ep.errors / ep.total * 100) : 0;
                    const healthColor = errorRate > 20 ? '#ef4444' : errorRate > 5 ? '#f59e0b' : '#10b981';
                    const methodArr = [...ep.methods];
                    const methodBadges = methodArr.map(m => {
                        const cls = m === 'GET' ? 'get' : m === 'POST' ? 'post' : m === 'HEAD' ? 'head' : m === 'PUT' ? 'put' : m === 'DELETE' ? 'del' : 'opt';
                        return `<span class="api-method-badge ${cls}">${m}</span>`;
                    }).join('');
                    
                    return `<div class="api-endpoint-row">
                        <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
                            <div style="width:6px; height:6px; border-radius:50%; background:${healthColor}; flex-shrink:0;"></div>
                            ${methodBadges}
                            <span style="font-family:var(--font-mono); font-size:0.7rem; color:rgba(255,255,255,0.55); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${ep.path}</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:0.65rem; color:rgba(255,255,255,0.25); font-family:var(--font-mono);">${ep.total}×</span>
                            ${ep.errors > 0 ? `<span style="font-size:0.62rem; color:#ef4444; font-family:var(--font-mono);">${ep.errors} err</span>` : ''}
                        </div>
                    </div>`;
                }).join('');
            }
            
            // --- Request Log ---
            const logEl = document.getElementById('apiRequestLog');
            const totalEl = document.getElementById('apiTotalRequests');
            totalEl.textContent = `${logs.length} total`;
            
            if (logs.length === 0) {
                logEl.innerHTML = '<div style="padding:20px; text-align:center; color:rgba(255,255,255,0.15); font-size:0.75rem;">Noch keine API Requests aufgezeichnet.<br><span style="font-size:0.68rem;">Requests werden automatisch beim Sync erfasst.</span></div>';
            } else {
                const displayLogs = logs.slice(0, 50); // Show last 50
                logEl.innerHTML = displayLogs.map(l => {
                    const cat = Math.floor(l.status / 100);
                    const statusCls = cat >= 5 ? 'c5' : cat >= 4 ? 'c4' : cat >= 3 ? 'c3' : 'c2';
                    const methodCls = l.method === 'GET' ? 'get' : l.method === 'POST' ? 'post' : l.method === 'HEAD' ? 'head' : l.method === 'PUT' ? 'put' : l.method === 'DELETE' ? 'del' : 'opt';
                    const timeAgo = formatTimeAgo(l.ts);
                    
                    return `<div class="api-log-row">
                        <span class="api-log-status ${statusCls}">${l.status}</span>
                        <span class="api-method-badge ${methodCls}">${l.method}</span>
                        <span class="api-log-path" title="${l.path}">${l.path}</span>
                        <span class="api-log-time">${timeAgo}</span>
                    </div>`;
                }).join('');
            }
            
            // Last checked
            document.getElementById('apiLastChecked').textContent = 'Zuletzt geprüft: ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        }
    };
    
    function formatTimeAgo(ts) {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'gerade eben';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'min';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
        return Math.floor(diff / 86400000) + 'd';
    }
    
    function setApiRange(range, btn) {
        apiStatusMonitor.currentRange = range;
        document.querySelectorAll('.api-range-tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        apiStatusMonitor.render();
    }
    
    function refreshApiStatus() {
        // Ping Supabase health endpoints and record results
        const baseUrl = typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.URL : null;
        if (!baseUrl) {
            apiStatusMonitor.render();
            return;
        }
        
        const healthChecks = [
            { method: 'GET', path: '/auth/v1/health', url: baseUrl + '/auth/v1/health' },
            { method: 'HEAD', path: '/rest-admin/v1/ready', url: baseUrl + '/rest/v1/' }
        ];
        
        healthChecks.forEach(check => {
            const startTime = Date.now();
            fetch(check.url, { method: check.method === 'HEAD' ? 'HEAD' : 'GET', mode: 'cors', headers: { 'apikey': typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.ANON_KEY : '' } })
                .then(resp => {
                    apiStatusMonitor.record(check.method, check.path, resp.status, startTime);
                    apiStatusMonitor.render();
                })
                .catch(() => {
                    apiStatusMonitor.record(check.method, check.path, 0, startTime);
                    apiStatusMonitor.render();
                });
        });
    }
    
    // Intercept Supabase fetch calls to auto-log
    (function patchSupabaseFetch() {
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const input = args[0];
            const init = args[1] || {};
            let url = '';
            let method = (init.method || 'GET').toUpperCase();
            
            if (typeof input === 'string') url = input;
            else if (input instanceof Request) { url = input.url; method = (input.method || method).toUpperCase(); }
            else if (input && input.href) url = input.href;
            
            // Only track Supabase API calls  
            const isSupabase = typeof SUPABASE_CONFIG !== 'undefined' && url.includes(SUPABASE_CONFIG.URL);
            
            if (isSupabase) {
                const ts = Date.now();
                try {
                    const urlObj = new URL(url);
                    const path = urlObj.pathname;
                    
                    return originalFetch.apply(this, args).then(resp => {
                        apiStatusMonitor.record(method, path, resp.status, ts);
                        // Debounce render to avoid flooding
                        clearTimeout(apiStatusMonitor._renderTimer);
                        apiStatusMonitor._renderTimer = setTimeout(() => apiStatusMonitor.render(), 500);
                        return resp;
                    }).catch(err => {
                        apiStatusMonitor.record(method, path, 0, ts);
                        clearTimeout(apiStatusMonitor._renderTimer);
                        apiStatusMonitor._renderTimer = setTimeout(() => apiStatusMonitor.render(), 500);
                        throw err;
                    });
                } catch(e) {
                    // URL parsing failed, proceed normally
                }
            }
            
            return originalFetch.apply(this, args);
        };
    })();
    
    // Render on cloud tab open
    const _origSwitchTabCloud = window.switchSettingsTab;
    if (typeof _origSwitchTabCloud === 'function') {
        window.switchSettingsTab = function(tab) {
            _origSwitchTabCloud.call(this, tab);
            if (tab === 'cloud') {
                apiStatusMonitor.render();
            }
        };
    }
    
    // Initial render if cloud tab visible
    setTimeout(() => { try { apiStatusMonitor.render(); } catch(e){} }, 2000);

    // ============================================
    // CLOUD SYNC INTEGRATION (ECHTE PRODUKTIVE INTEGRATION!)
    // ============================================
    
    function setupCloudSyncIntegration() {
        // Registriere Auth-State Callbacks
        if (window.cloudSync && window.cloudSync.onAuthStateChanged) {
            const originalCallback = window.cloudSync.onAuthStateChanged;
            window.cloudSync.onAuthStateChanged = function(isLoggedIn, user) {
                if (typeof originalCallback === 'function') {
                    originalCallback.call(this, isLoggedIn, user);
                }
                updateCloudSyncUI(isLoggedIn, user);
            };
        }
        
        // Initialisiere UI sofort mit aktuellem Status
        if (window.cloudSync) {
            const isLoggedIn = window.cloudSync.isLoggedIn ? window.cloudSync.isLoggedIn() : false;
            const user = window.cloudSync.getCurrentUser ? window.cloudSync.getCurrentUser() : null;
            updateCloudSyncUI(isLoggedIn, user);
        }
        
        // Auto-Sync beim Speichern aktivieren
        setupAutoSync();
    }
    
    function updateCloudSyncUI(isLoggedIn, user) {
        // Update Cloud Sync Buttons in Settings
        const loginBtn = document.getElementById('cloudSyncLoginBtn');
        const logoutBtn = document.getElementById('cloudSyncLogoutBtn');
        const uploadBtn = document.getElementById('cloudSyncUploadBtn');
        const downloadBtn = document.getElementById('cloudSyncDownloadBtn');
        const statusDiv = document.getElementById('cloudSyncStatus');
        
        if (isLoggedIn && user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.style.opacity = '1';
            }
            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.style.opacity = '1';
            }
            if (statusDiv) {
                statusDiv.innerHTML = `<p>🟢 <strong>Angemeldet als:</strong> ${user.email}</p><p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Nutze die Buttons um manuell hoch- oder runterzuladen.</p>`;
            }
            console.log('[Cloud Sync] User angemeldet:', user.email);
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (uploadBtn) {
                uploadBtn.disabled = true;
                uploadBtn.style.opacity = '0.5';
            }
            if (downloadBtn) {
                downloadBtn.disabled = true;
                downloadBtn.style.opacity = '0.5';
            }
            if (statusDiv) {
                statusDiv.innerHTML = `<p>🔴 <strong>Nicht angemeldet</strong></p><p style="font-size:0.85rem; color:var(--text-muted); margin-top:8px;">Klick auf "Cloud Login" um dich anzumelden.</p>`;
            }
            console.log('[Cloud Sync] User abgemeldet');
        }
    }
    
    function createCloudSyncButtons() {
        // DEPRECATED - Cloud Sync Buttons sind jetzt FEST im Settings Modal
        // Diese Funktion wird nicht mehr verwendet
    }
    
    function openCloudLoginModal() {
        if (window.cloudSyncUI && typeof window.cloudSyncUI.openLoginModal === 'function') {
            window.cloudSyncUI.openLoginModal();
        } else {
            showCustomMessage('⚠️ Cloud Sync nicht bereit', 'Bitte lade die Seite neu!', 'warning');
        }
    }
    
    async function handleCloudLogout() {
        if (!window.cloudSync) return;
        
        showCustomConfirm('🚪 Logout?', 'Du wirst von der Cloud abgemeldet. Deine lokalen Daten bleiben erhalten.', 
            async () => {
                try {
                    await window.cloudSync.logout();
                    showCustomMessage('✅ Abgemeldet', 'Du bist jetzt von der Cloud getrennt.', 'success');
                } catch (error) {
                    showCustomMessage('❌ Fehler', 'Logout fehlgeschlagen: ' + error.message, 'error');
                }
            }
        );
    }
    
    async function handleCloudUpload() {
        const uploadBtn = document.getElementById('cloudSyncUploadBtn');
        if (!uploadBtn || !window.cloudSync) {
            console.warn('[Upload] Button oder cloudSync nicht verfügbar');
            return;
        }
        
        const originalText = uploadBtn.textContent;
        uploadBtn.disabled = true;
        uploadBtn.textContent = '⏳ Lädt...';
        
        try {
            console.log('[Upload] Starte Upload...');
            await window.cloudSync.uploadToCloud();
            showCustomMessage('✅ Hochgeladen', 'Deine Daten wurden erfolgreich in die Cloud synchronisiert!', 'success');
        } catch (error) {
            console.error('[Upload] Fehler:', error);
            showCustomMessage('❌ Upload Fehler', error.message, 'error');
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.textContent = originalText;
        }
    }
    
    async function handleCloudDownload() {
        const downloadBtn = document.getElementById('cloudSyncDownloadBtn');
        if (!downloadBtn || !window.cloudSync) {
            console.warn('[Download] Button oder cloudSync nicht verfügbar');
            return;
        }
        
        const originalText = downloadBtn.textContent;
        downloadBtn.disabled = true;
        downloadBtn.textContent = '⏳ Lädt...';
        
        try {
            console.log('[Download] Starte Download...');
            const result = await window.cloudSync.downloadFromCloud();
            showCustomMessage('✅ Restored', `${result.itemsLoaded} Einträge von der Cloud geladen!`, 'success');
            // Reload der Seite um neue Daten anzuzeigen
            setTimeout(() => location.reload(), 1500);
        } catch (error) {
            console.error('[Download] Fehler:', error);
            showCustomMessage('❌ Download Fehler', error.message, 'error');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
        }
    }
    
    function setupAutoSync() {
        // Auto-Sync DEAKTIVIERT — User steuert manuell über Upload/Download Buttons
        console.log('[Cloud Sync] Manueller Modus — kein Auto-Sync');
    }

    function updateAchievements() {
        const achievements = data.achievements || [];
        const display = document.getElementById('achievementsDisplay');
        if (!display) return;

        const achievementLabels = {
            'total_10': '10h Total',
            'total_50': '50h Total',
            'total_100': '100h Total',
            'total_500': '500h Total',
            'total_1000': '1000h Total',
            'week_40': '40h/Woche'
        };

    }



