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
        edFillTypes(entry.type);
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

        edDateTitle();
        populateProjectOptions();
        editTypeChanged();
        recalcEditWorked();
        // Gespeicherte Stunden zeigen, nicht die aus den Zeiten nachgerechneten: weichen
        // sie ab, hat jemand sie von Hand gesetzt — dann gilt das auch hier weiter.
        const nachgerechnet = parseFloat(document.getElementById('editInpHours').value);
        if (entry.worked !== undefined && entry.worked !== null && !isNaN(nachgerechnet) && Math.abs(nachgerechnet - entry.worked) > 0.009) {
            document.getElementById('editInpHours').value = entry.worked;
            editManualHoursOverride = true;
        }
        edSummary();
        if (typeof renderEditCustomFields === 'function') renderEditCustomFields(entry);

        const modal = document.getElementById('editEntryModal');
        modal.classList.add('active');
        const body = modal.querySelector('.ed__body');
        if (body) body.scrollTop = 0;
        const more = modal.querySelector('.ed__more');
        if (more) more.open = !!entry.mood;   // Soll ist immer befuellt, taugt nicht als Signal
    }

    // ── Darstellung des neuen Dialogs (10.10.2026) ──────────────────────────
    // Typen, die ihre Stunden selbst rechnen (saveEditEntry): dort gibt es weder
    // Zeiten noch Stundenfeld, nur einen Satz, was der Tag zaehlt.
    const ED_FIXED_TYPES = ['school', 'vacation', 'gleittag', 'sick', 'holiday'];
    const ED_DE = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

    function edEN() { return document.documentElement.lang === 'en'; }
    function edH(v) {
        if (v === null || v === undefined || isNaN(v)) return '—';
        return v.toLocaleString(mwlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' h';
    }

    // Bis v8.3.1 kannte das Feld nur die sechs festen Typen. Ein Eintrag mit eigenem
    // Typ fand seinen Wert nicht, .value wurde '' — und Speichern schrieb type: ''.
    function edFillTypes(current) {
        const sel = document.getElementById('editInpType');
        if (!sel) return;
        let types = [];
        try { types = getAllEntryTypes().filter(t => t.id !== 'korrektur' || t.id === current); } catch (e) { types = []; }
        if (types.length) {
            sel.innerHTML = '';
            types.forEach(t => {
                const o = document.createElement('option');
                o.value = t.id;
                o.textContent = (typeof ctCleanLabel === 'function') ? ctCleanLabel(t.label, t.id) : (t.label || t.id);
                sel.appendChild(o);
            });
        }
        if (current && ![...sel.options].some(o => o.value === current)) {
            const o = document.createElement('option');
            o.value = current; o.textContent = current;
            sel.appendChild(o);
        }
        edRenderTypes();
    }

    function edRenderTypes() {
        const box = document.getElementById('edTypes');
        const sel = document.getElementById('editInpType');
        if (!box || !sel) return;
        box.innerHTML = '';
        [...sel.options].forEach(o => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'ed__type';
            b.setAttribute('role', 'radio');
            b.dataset.value = o.value;
            let icon = '';
            try { icon = getTypeIconHTML(o.value, 16); } catch (e) { icon = ''; }
            try { const rgb = getTypeRgb(o.value); if (rgb) b.style.setProperty('--type-rgb', rgb); } catch (e) { /* ohne Typfarbe */ }
            b.innerHTML = '<span class="ed__type-i" aria-hidden="true">' + icon + '</span>';
            const l = document.createElement('span');
            l.textContent = o.textContent;
            b.appendChild(l);
            b.addEventListener('click', () => edPickType(o.value, false));
            b.addEventListener('keydown', edTypeKey);
            box.appendChild(b);
        });
        edSyncTypes();
    }

    function edSyncTypes() {
        const sel = document.getElementById('editInpType');
        document.querySelectorAll('#edTypes .ed__type').forEach(b => {
            const on = b.dataset.value === sel.value;
            b.setAttribute('aria-checked', on ? 'true' : 'false');
            b.tabIndex = on ? 0 : -1;
        });
    }

    function edPickType(v, focus) {
        const sel = document.getElementById('editInpType');
        if (sel.value === v) return;
        sel.value = v;
        sel.dispatchEvent(new Event('change'));
        edSyncTypes();
        if (focus) { const b = document.querySelector('#edTypes .ed__type[aria-checked="true"]'); if (b) b.focus(); }
    }

    // Radiogruppe: Pfeile wandern UND waehlen (WAI-ARIA), Tab verlaesst die Gruppe.
    function edTypeKey(e) {
        const all = [...document.querySelectorAll('#edTypes .ed__type')];
        const i = all.indexOf(e.currentTarget);
        let n = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % all.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + all.length) % all.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = all.length - 1;
        if (n < 0) return;
        e.preventDefault();
        edPickType(all[n].dataset.value, true);
    }

    function edDateTitle() {
        const v = document.getElementById('editInpDate').value;
        const t = document.getElementById('editModalSubtitle');
        if (!t) return;
        if (!v) { t.textContent = edEN() ? 'Pick a date' : 'Datum wählen'; return; }
        const [y, m, d] = v.split('-').map(Number);
        t.textContent = new Date(y, m - 1, d).toLocaleDateString(mwlLocale(), ED_DE);
    }

    function edPickDate() {
        const inp = document.getElementById('editInpDate');
        try { if (typeof inp.showPicker === 'function') { inp.showPicker(); return; } } catch (e) { /* ohne Nutzergeste o. ae. */ }
        inp.focus();
    }

    function edDateChanged() {
        edDateTitle();
        recalcEditWorked();
        edSummary();
    }

    function edSollFor() {
        const manual = parseFloat(document.getElementById('editInpExpected').value);
        if (!isNaN(manual)) return manual;
        const dateVal = document.getElementById('editInpDate').value;
        if (!dateVal) return null;
        const [y, m, d] = dateVal.split('-').map(Number);
        return editJobHoursDefault(new Date(y, m - 1, d).getDay()) || 0;
    }

    function edSummary() {
        const sollEl = document.getElementById('edSoll');
        const saldoEl = document.getElementById('edSaldo');
        if (!sollEl || !saldoEl) return;
        const soll = edSollFor();
        const ist = parseFloat(document.getElementById('editInpHours').value);
        sollEl.textContent = edH(soll);
        saldoEl.classList.remove('is-pos', 'is-neg');
        if (soll === null || isNaN(ist)) { saldoEl.textContent = '—'; }
        else {
            const diff = Math.round((ist - soll) * 100) / 100;
            saldoEl.textContent = (diff > 0 ? '+' : diff < 0 ? '−' : '±') + edH(Math.abs(diff));
            if (diff > 0) saldoEl.classList.add('is-pos');
            if (diff < 0) saldoEl.classList.add('is-neg');
        }
        const ov = document.getElementById('edOverride');
        if (ov) ov.hidden = !editManualHoursOverride;
    }

    // Schichtband: Anwesenheit von Beginn bis Ende auf einer Tagesleiste. Die Pause
    // wird bewusst NICHT eingezeichnet — die App weiss nicht, wann sie war.
    function edBand(startMins, endMins) {
        const ticksEl = document.getElementById('edTicks');
        const shift = document.getElementById('edShift');
        const band = document.getElementById('edBand');
        if (!ticksEl || !shift || !band) return;
        const has = startMins !== null && endMins !== null;
        let lo = 6, hi = 20;
        if (has) {
            lo = Math.min(lo, Math.floor(startMins / 60) - 1);
            hi = Math.max(hi, Math.ceil(endMins / 60) + 1);
            lo = Math.max(0, lo);
        }
        const span = hi - lo;
        const step = span > 18 ? 4 : span > 12 ? 2 : 1;
        let html = '';
        for (let h = Math.ceil(lo / step) * step; h <= hi; h += step) {
            const pct = ((h - lo) / span) * 100;
            html += '<span style="left:' + pct.toFixed(2) + '%">' + String(h % 24).padStart(2, '0') + '</span>';
        }
        ticksEl.innerHTML = html;
        band.classList.toggle('is-empty', !has);
        if (has) {
            const l = ((startMins / 60 - lo) / span) * 100;
            const r = 100 - ((endMins / 60 - lo) / span) * 100;
            shift.style.clipPath = 'inset(0 ' + Math.max(0, r).toFixed(2) + '% 0 ' + Math.max(0, l).toFixed(2) + '% round 7px)';
        } else {
            shift.style.clipPath = 'inset(0 50% 0 50% round 7px)';
        }
    }

    function edHoursFromTimes() {
        editManualHoursOverride = false;
        recalcEditWorked();
        edSummary();
        const h = document.getElementById('editInpHours');
        if (h) h.focus();
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
        const fixed = ED_FIXED_TYPES.includes(type);

        // Zeiten und Stunden nur fuer Typen, deren Stunden saveEditEntry() aus dem
        // Feld uebernimmt (Arbeit und eigene Typen). Vorher hing das an type === 'work':
        // eigene Typen hatten ein Stundenfeld, aber keine Zeiten.
        timeSection.style.display = fixed ? 'none' : '';

        // Saetze spiegeln, was saveEditEntry() fuer den Typ wirklich rechnet.
        const typeLabels = {
            'school': ['Ein Berufsschultag zählt mit den Sollstunden des Tages. Der Saldo bleibt gleich.', 'A vocational school day counts with the target hours of the day. Your balance stays the same.'],
            'vacation': ['Ein Urlaubstag zählt mit den Sollstunden des Tages. Der Saldo bleibt gleich.', 'A vacation day counts with the target hours of the day. Your balance stays the same.'],
            'gleittag': ['Ein Gleittag zieht die Sollstunden des Tages vom Saldo ab.', 'A flex day takes the target hours of the day off your balance.'],
            'sick': ['Ein Krankheitstag zählt mit den Sollstunden des Tages. Der Saldo bleibt gleich.', 'A sick day counts with the target hours of the day. Your balance stays the same.'],
            'holiday': ['Ein Feiertag zählt mit den Sollstunden des Tages. Der Saldo bleibt gleich.', 'A public holiday counts with the target hours of the day. Your balance stays the same.']
        };
        const note = document.getElementById('editFooterInfo');
        const infoText = document.getElementById('editInfoText');
        if (fixed && typeLabels[type]) {
            infoText.textContent = typeLabels[type][edEN() ? 1 : 0];
            note.hidden = false;
        } else {
            infoText.textContent = '';
            note.hidden = true;
        }
        edSyncTypes();
    }

    function recalcEditWorked() {
        const startVal = document.getElementById('editInpStart').value;
        const endVal = document.getElementById('editInpEnd').value;
        const breakVal = parseInt(document.getElementById('editInpBreak').value) || 0;

        const grossEl = document.getElementById('editCalcGross');
        const breakEl = document.getElementById('editCalcBreak');
        const netEl = document.getElementById('editCalcNet');

        if (!startVal || !endVal) {
            grossEl.textContent = '—';
            breakEl.textContent = breakVal ? breakVal + ' min' : '—';
            netEl.textContent = '—';
            edBand(null, null);
            edSummary();
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

        // Band und Rechenzeile folgen den Zeiten immer — auch wenn die Stunden von
        // Hand ueberschrieben sind; nur das Stundenfeld bleibt dann unangetastet.
        edBand(startMins, endMins);
        grossEl.textContent = edH(grossHours);
        breakEl.textContent = breakVal + ' min';
        netEl.textContent = edH(netHours);
        if (editManualHoursOverride) { edSummary(); return; }

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
        edSummary();
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
            showCustomMessage(edEN() ? 'Date missing' : 'Datum fehlt', edEN() ? 'Pick the day this entry belongs to.' : 'Wähle den Tag, zu dem der Eintrag gehört.', 'error');
            return;
        }

        // Update entry
        entry.date = newDate;
        entry.type = newType;
        entry.project = newProject || undefined;
        entry.info = newInfo || undefined;
        entry.mood = newMood || undefined;
        if (typeof collectEditCustomFieldValues === 'function') {
            entry.customFieldValues = collectEditCustomFieldValues();
        }

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
        if (document.getElementById('view-history')?.classList.contains('active') && typeof renderHistoryView === 'function') {
            renderHistoryView();
        }
        try { updateUI(); } catch(e) {}
        try { renderLists(); } catch(e) {}

        showCustomMessage(edEN() ? 'Saved' : 'Gespeichert', edEN() ? 'The entry has been updated.' : 'Der Eintrag ist aktualisiert.', 'success');
    }
