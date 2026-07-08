// ═══ CORE: ENTRY-EDIT ═══

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
        // Zuverlässigste Quelle für Start/Ende: Info-String ("HH:MM - HH:MM")
        // wurde immer korrekt gesetzt, bevor der shiftEnd-Bug die gespeicherten Felder korrumpierte.
        let displayStart = entry.shiftStart || entry.start || '';
        let displayEnd = entry.endIsRaw ? (entry.end || entry.shiftEnd || '') : '';

        if (!displayEnd) {
            const timeMatch = (entry.info || '').match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (timeMatch) {
                displayStart = displayStart || timeMatch[1];
                displayEnd = timeMatch[2];
            } else if (entry.shiftEnd) {
                // Letzter Fallback: breakMins abziehen
                if (entry.breakMins > 0) {
                    const [h, m] = entry.shiftEnd.split(':').map(Number);
                    const totalMins = h * 60 + m - entry.breakMins;
                    displayEnd = `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
                } else {
                    displayEnd = entry.shiftEnd;
                }
            }
        }

        document.getElementById('editInpStart').value = displayStart;
        document.getElementById('editInpEnd').value = displayEnd;
        document.getElementById('editInpBreak').value = entry.breakMins || '';

        // Job-Auswahl (nur bei mehreren Jobs sichtbar)
        try {
            const editJobRow = document.getElementById('editJobRow');
            const editJobSel = document.getElementById('editInpJob');
            if (editJobSel && typeof getJobs === 'function') {
                const jobs = getJobs();
                editJobSel.innerHTML = jobs.map(function(j){ return '<option value="'+j.id+'">'+(typeof esc==='function'?esc(j.name):j.name)+'</option>'; }).join('');
                editJobSel.value = (typeof getEntryJobId === 'function') ? getEntryJobId(entry) : (entry.jobId || 'primary');
                if (editJobRow) editJobRow.style.display = (jobs.length > 1) ? '' : 'none';
            }
        } catch(e) {}

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
            const expected = parseFloat(document.getElementById('editInpExpected').value) || editJobHoursDefault(dayIndex) || 0;
            const diff = netHours - expected;
            document.getElementById('editInpDiff').value = (diff >= 0 ? '+' : '') + diff.toFixed(2) + 'h';
        }
    }

    // Soll-Default für den im Edit-Modal gewählten Job (fällt auf Legacy zurück)
    function editJobHoursDefault(dayIndex) {
        const sel = document.getElementById('editInpJob');
        const jid = sel && sel.value ? sel.value : 'primary';
        if (typeof getJobHours === 'function') return getJobHours(jid, dayIndex);
        return (data.settings.hours && data.settings.hours[dayIndex]) || 0;
    }

    function editHoursManualChanged() {
        const val = document.getElementById('editInpHours').value;
        if (val && val.trim() !== '') {
            editManualHoursOverride = true;
            // Update diff preview
            const dateVal = document.getElementById('editInpDate').value;
            if (dateVal) {
                const dayIndex = new Date(dateVal).getDay();
                const expected = parseFloat(document.getElementById('editInpExpected').value) || editJobHoursDefault(dayIndex) || 0;
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
        if (newEnd) { entry.shiftEnd = entry.end = newEnd; entry.endIsRaw = true; }
        entry.breakMins = newBreak;

        // Job (falls Auswahl vorhanden)
        const editJobSelSave = document.getElementById('editInpJob');
        if (editJobSelSave && editJobSelSave.value && typeof getJobs === 'function' && getJobs().some(function(j){ return j.id === editJobSelSave.value; })) {
            entry.jobId = editJobSelSave.value;
        }
        const entryJobId = (typeof getEntryJobId === 'function') ? getEntryJobId(entry) : (entry.jobId || 'primary');

        // Calculate expected if not manually set
        const dayIndex = new Date(newDate).getDay();
        const jobDaySoll = (typeof getJobHours === 'function') ? getJobHours(entryJobId, dayIndex) : (data.settings.hours[dayIndex] || 0);
        if (!isNaN(newExpected)) {
            // Manuell gesetzt → exakt übernehmen
            entry.expected = newExpected;
        } else {
            // Auto: Split-Shift/Wiederanmeldung — trägt ein anderer Eintrag am selben Tag & JOB
            // schon das Tagessoll, zählt dieser Eintrag als reine Zusatzzeit (expected 0).
            const dayAlreadyCounted = (Array.isArray(data.entries) ? data.entries : []).some(function(e) {
                const ejob = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary';
                return e && e.id !== entry.id && e.date === newDate && ejob === entryJobId && (parseFloat(e.expected) || 0) > 0;
            });
            entry.expected = dayAlreadyCounted ? 0 : jobDaySoll;
        }

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

        // Split-Shift-Normalisierung: Tagessoll pro Tag nur einmal zählen
        try { if (typeof dedupeDayExpected === 'function') dedupeDayExpected(); } catch(e) {}

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
