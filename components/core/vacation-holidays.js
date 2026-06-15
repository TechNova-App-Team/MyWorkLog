// ═══ CORE: VACATION-HOLIDAYS ═══
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


    function bookPeriod(startStrArg, endStrArg, periodTypeArg, skipWeekendsArg) {
        const startStr = startStrArg || (document.getElementById('periodStart') ? document.getElementById('periodStart').value : '') || '';
        const endStr = endStrArg || (document.getElementById('periodEnd') ? document.getElementById('periodEnd').value : '') || '';
        const periodType = periodTypeArg || (document.getElementById('periodType') ? document.getElementById('periodType').value : 'vacation');
        const skipWeekends = (skipWeekendsArg === undefined) ? true : !!skipWeekendsArg;

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
            const isWeekend = (dayIndex === 0 || dayIndex === 6);
            let expected = data.settings.hours[dayIndex] || 0;

            // Wochenende immer überspringen, wenn Toggle an
            if (skipWeekends && isWeekend) {
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
            }

            // Fallback: Wenn Tag keine Sollstunden hat (z.B. Samstag eingeschlossen), nimm Wochenschnitt
            if (expected <= 0) {
                const wd = [1,2,3,4,5].map(i => data.settings.hours[i] || 0).filter(h => h > 0);
                expected = wd.length ? (wd.reduce((a,b)=>a+b,0) / wd.length) : 8;
            }

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

    // ─── VACATION PICKER (Multi-Range + Day-Picker) ─────────────────
    let _vacPickerState = null;

    function _vpInjectStyles() {
        if (document.getElementById('vacPickerStyles')) return;
        const style = document.createElement('style');
        style.id = 'vacPickerStyles';
        style.textContent = `
            .vp-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.72); backdrop-filter:blur(14px) saturate(1.2); z-index:10002; display:flex; align-items:center; justify-content:center; padding:16px; opacity:0; transition:opacity .22s cubic-bezier(.16,1,.3,1); }
            .vp-overlay.active { opacity:1; }
            .vp-modal { background:linear-gradient(165deg, rgba(22,22,30,0.98), rgba(12,12,18,0.99)); border:1px solid rgba(255,255,255,0.08); border-radius:18px; width:100%; max-width:560px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 24px 80px -12px rgba(0,0,0,0.7); transform:scale(.96) translateY(8px); transition:transform .28s cubic-bezier(.16,1,.3,1); }
            .vp-overlay.active .vp-modal { transform:scale(1) translateY(0); }
            .vp-head { padding:18px 20px 12px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:10px; }
            .vp-head-icon { width:32px; height:32px; border-radius:10px; background:rgba(var(--primary-rgb),0.14); display:flex; align-items:center; justify-content:center; color:var(--primary); flex-shrink:0; }
            .vp-head-title { font-size:1.02rem; font-weight:700; color:var(--text-main); margin:0; }
            .vp-head-sub { font-size:0.74rem; color:var(--text-muted); margin-top:2px; }
            .vp-close { margin-left:auto; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:var(--text-muted); width:32px; height:32px; border-radius:8px; cursor:pointer; font-size:1.1rem; line-height:1; display:flex; align-items:center; justify-content:center; transition:all .15s; }
            .vp-close:hover { background:rgba(255,255,255,0.1); color:var(--text-main); }
            .vp-tabs { display:flex; gap:4px; padding:12px 20px 0; }
            .vp-tab { flex:1; padding:9px 12px; background:transparent; border:1px solid rgba(255,255,255,0.06); color:var(--text-muted); border-radius:10px; font-size:0.8rem; font-weight:600; cursor:pointer; transition:all .15s; font-family:var(--font-main); }
            .vp-tab:hover { background:rgba(255,255,255,0.04); color:var(--text-main); }
            .vp-tab.active { background:rgba(var(--primary-rgb),0.14); border-color:rgba(var(--primary-rgb),0.3); color:var(--primary); }
            .vp-body { padding:16px 20px; overflow-y:auto; flex:1; }
            .vp-pane { display:none; }
            .vp-pane.active { display:block; }
            .vp-range-row { display:flex; gap:8px; align-items:center; margin-bottom:8px; }
            .vp-range-row input[type=date] { flex:1; min-width:0; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:var(--text-main); padding:9px 11px; border-radius:8px; font-size:0.82rem; font-family:var(--font-main); }
            .vp-range-row input[type=date]:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(var(--primary-rgb),0.2); }
            .vp-range-sep { color:var(--text-muted); font-size:0.78rem; padding:0 2px; }
            .vp-range-del { background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.18); color:#ef4444; width:32px; height:36px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
            .vp-range-del:hover { background:rgba(239,68,68,0.18); }
            .vp-range-add { width:100%; padding:9px 12px; background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.12); color:var(--text-muted); border-radius:10px; font-size:0.78rem; font-weight:500; cursor:pointer; transition:all .15s; font-family:var(--font-main); margin-top:4px; }
            .vp-range-add:hover { background:rgba(var(--primary-rgb),0.06); border-color:rgba(var(--primary-rgb),0.25); color:var(--primary); }
            .vp-cal-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
            .vp-cal-nav button { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); color:var(--text-main); width:30px; height:30px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
            .vp-cal-nav button:hover { background:rgba(var(--primary-rgb),0.12); }
            .vp-cal-label { font-size:0.88rem; font-weight:600; color:var(--text-main); }
            .vp-cal-grid { display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; }
            .vp-cal-dow { font-size:0.65rem; color:var(--text-muted); text-align:center; font-weight:600; padding:4px 0; text-transform:uppercase; letter-spacing:0.06em; }
            .vp-cal-cell { aspect-ratio:1; display:flex; align-items:center; justify-content:center; font-size:0.78rem; color:var(--text-main); background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:8px; cursor:pointer; transition:all .12s; user-select:none; position:relative; }
            .vp-cal-cell:hover { background:rgba(var(--primary-rgb),0.1); border-color:rgba(var(--primary-rgb),0.25); }
            .vp-cal-cell.other { color:rgba(255,255,255,0.15); cursor:default; background:transparent; border-color:transparent; }
            .vp-cal-cell.other:hover { background:transparent; border-color:transparent; }
            .vp-cal-cell.weekend { color:var(--text-muted); opacity:0.55; }
            .vp-cal-cell.holiday { color:#f59e0b; }
            .vp-cal-cell.holiday::after { content:''; position:absolute; bottom:3px; left:50%; transform:translateX(-50%); width:4px; height:4px; border-radius:50%; background:#f59e0b; }
            .vp-cal-cell.today { box-shadow:inset 0 0 0 1.5px var(--primary); }
            .vp-cal-cell.selected { background:var(--primary) !important; border-color:var(--primary) !important; color:#fff !important; font-weight:700; }
            .vp-cal-cell.selected.holiday::after { background:#fff; }
            .vp-opts { margin-top:14px; padding:12px; background:rgba(255,255,255,0.025); border:1px solid rgba(255,255,255,0.05); border-radius:12px; display:flex; flex-direction:column; gap:8px; }
            .vp-opt { display:flex; align-items:center; gap:10px; cursor:pointer; font-size:0.8rem; color:var(--text-main); }
            .vp-opt input[type=checkbox] { display:none; }
            .vp-opt-mark { width:18px; height:18px; border-radius:5px; border:1.5px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.03); flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all .15s; }
            .vp-opt input:checked ~ .vp-opt-mark { background:var(--primary); border-color:var(--primary); }
            .vp-opt input:checked ~ .vp-opt-mark::after { content:'✔'; color:#fff; font-size:0.65rem; font-weight:800; }
            .vp-opt-sub { color:var(--text-muted); font-size:0.72rem; }
            .vp-foot { padding:14px 20px 18px; border-top:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
            .vp-count { font-size:0.86rem; color:var(--text-main); flex:1; min-width:140px; }
            .vp-count strong { color:var(--primary); font-size:1.1rem; font-weight:800; }
            .vp-count-sub { font-size:0.7rem; color:var(--text-muted); margin-top:1px; }
            .vp-btn { padding:9px 16px; border-radius:9px; font-size:0.82rem; font-weight:600; font-family:var(--font-main); cursor:pointer; transition:all .15s; border:none; }
            .vp-btn-primary { background:var(--primary); color:#fff; box-shadow:0 4px 16px rgba(var(--primary-rgb),0.3); }
            .vp-btn-primary:hover { filter:brightness(1.1); transform:translateY(-1px); }
            .vp-btn-primary:disabled { opacity:0.4; cursor:not-allowed; transform:none; filter:none; box-shadow:none; }
            .vp-btn-ghost { background:rgba(255,255,255,0.05); color:var(--text-muted); border:1px solid rgba(255,255,255,0.08); }
            .vp-btn-ghost:hover { background:rgba(255,255,255,0.09); color:var(--text-main); }
            [data-theme="light"] .vp-modal { background:linear-gradient(165deg, rgba(255,255,255,0.99), rgba(248,249,251,0.99)); border-color:rgba(0,0,0,0.08); }
            [data-theme="light"] .vp-cal-cell { background:rgba(0,0,0,0.025); border-color:rgba(0,0,0,0.04); }
            [data-theme="light"] .vp-range-row input[type=date] { background:rgba(0,0,0,0.025); border-color:rgba(0,0,0,0.08); }
            @media (max-width: 480px) {
                .vp-modal { max-height:94vh; border-radius:14px; }
                .vp-body { padding:14px; }
                .vp-cal-cell { font-size:0.72rem; }
                .vp-foot { padding:12px 14px 16px; }
                .vp-tabs { padding:10px 14px 0; }
                .vp-head { padding:14px 14px 10px; }
            }
        `;
        document.head.appendChild(style);
    }

    function _vpGetHolidaySet(year) {
        try {
            const list = [].concat(
                (typeof getGermanHolidays === 'function') ? getGermanHolidays(year - 1) : [],
                (typeof getGermanHolidays === 'function') ? getGermanHolidays(year) : [],
                (typeof getGermanHolidays === 'function') ? getGermanHolidays(year + 1) : []
            );
            return new Set(list.map(h => h.date));
        } catch (e) { return new Set(); }
    }

    function _vpCollectDates() {
        const s = _vacPickerState;
        if (!s) return [];
        const holidays = s.skipHolidays ? _vpGetHolidaySet(s.viewYear) : new Set();
        const out = new Set();

        const pushIfOk = (iso) => {
            const d = new Date(iso + 'T00:00:00');
            const dow = d.getDay();
            const isWE = (dow === 0 || dow === 6);
            if (s.skipWeekends && isWE) return;
            if (s.skipHolidays && holidays.has(iso)) return;
            out.add(iso);
        };

        if (s.mode === 'range') {
            s.ranges.forEach(r => {
                if (!r.start || !r.end) return;
                const sd = new Date(r.start + 'T00:00:00');
                const ed = new Date(r.end + 'T00:00:00');
                if (sd > ed) return;
                const cur = new Date(sd);
                while (cur <= ed) {
                    pushIfOk(toLocalISODate(cur));
                    cur.setDate(cur.getDate() + 1);
                }
            });
        } else {
            s.days.forEach(iso => pushIfOk(iso));
        }
        return [...out].sort();
    }

    function _vpRenderRanges() {
        const wrap = document.getElementById('vpRangeList');
        if (!wrap) return;
        const s = _vacPickerState;
        wrap.innerHTML = s.ranges.map((r, i) => `
            <div class="vp-range-row">
                <input type="date" data-vp-range="${i}" data-vp-field="start" value="${r.start || ''}">
                <span class="vp-range-sep">→</span>
                <input type="date" data-vp-range="${i}" data-vp-field="end" value="${r.end || ''}">
                ${s.ranges.length > 1 ? `<button class="vp-range-del" data-vp-del="${i}" title="Bereich entfernen">×</button>` : ''}
            </div>
        `).join('');
        wrap.querySelectorAll('input[type=date]').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.vpRange);
                const field = e.target.dataset.vpField;
                _vacPickerState.ranges[idx][field] = e.target.value;
                _vpUpdateCount();
            });
        });
        wrap.querySelectorAll('[data-vp-del]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.vpDel);
                _vacPickerState.ranges.splice(idx, 1);
                _vpRenderRanges();
                _vpUpdateCount();
            });
        });
    }

    function _vpRenderCalendar() {
        const grid = document.getElementById('vpCalGrid');
        const label = document.getElementById('vpCalLabel');
        if (!grid || !label) return;
        const s = _vacPickerState;
        const y = s.viewYear, m = s.viewMonth;
        const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
        label.textContent = monthNames[m] + ' ' + y;

        const first = new Date(y, m, 1);
        const startDow = (first.getDay() + 6) % 7; // Mo=0..So=6
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const prevMonthDays = new Date(y, m, 0).getDate();
        const todayISO = toLocalISODate(new Date());
        const holidays = _vpGetHolidaySet(y);

        const cells = [];
        ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(d => cells.push(`<div class="vp-cal-dow">${d}</div>`));

        for (let i = 0; i < startDow; i++) {
            const d = prevMonthDays - startDow + 1 + i;
            cells.push(`<div class="vp-cal-cell other">${d}</div>`);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(y, m, d);
            const iso = toLocalISODate(date);
            const dow = date.getDay();
            const isWE = (dow === 0 || dow === 6);
            const isHoliday = holidays.has(iso);
            const isToday = (iso === todayISO);
            const isSel = s.days.has(iso);
            const cls = ['vp-cal-cell'];
            if (isWE) cls.push('weekend');
            if (isHoliday) cls.push('holiday');
            if (isToday) cls.push('today');
            if (isSel) cls.push('selected');
            cells.push(`<div class="${cls.join(' ')}" data-vp-iso="${iso}">${d}</div>`);
        }
        const trail = (7 - ((startDow + daysInMonth) % 7)) % 7;
        for (let i = 1; i <= trail; i++) {
            cells.push(`<div class="vp-cal-cell other">${i}</div>`);
        }
        grid.innerHTML = cells.join('');

        grid.querySelectorAll('[data-vp-iso]').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const iso = e.currentTarget.dataset.vpIso;
                if (_vacPickerState.days.has(iso)) _vacPickerState.days.delete(iso);
                else _vacPickerState.days.add(iso);
                e.currentTarget.classList.toggle('selected');
                _vpUpdateCount();
            });
        });
    }

    function _vpUpdateCount() {
        const dates = _vpCollectDates();
        const countEl = document.getElementById('vpCount');
        const btn = document.getElementById('vpCommit');
        if (countEl) {
            countEl.innerHTML = `<strong>${dates.length}</strong> Tag${dates.length === 1 ? '' : 'e'} werden gebucht <div class="vp-count-sub">${dates.length ? dates[0] + ' – ' + dates[dates.length-1] : 'Noch nichts ausgewählt'}</div>`;
        }
        if (btn) btn.disabled = dates.length === 0;
    }

    function _vpSwitchMode(mode) {
        _vacPickerState.mode = mode;
        document.querySelectorAll('.vp-tab').forEach(t => t.classList.toggle('active', t.dataset.vpMode === mode));
        document.querySelectorAll('.vp-pane').forEach(p => p.classList.toggle('active', p.dataset.vpMode === mode));
        _vpUpdateCount();
    }

    function openVacationPicker(typeArg) {
        _vpInjectStyles();
        const today = new Date();
        const seedDate = (function(){
            const el = document.getElementById('inpDate');
            return (el && el.value) ? el.value : toLocalISODate(today);
        })();

        _vacPickerState = {
            mode: 'range',
            ranges: [{ start: seedDate, end: '' }],
            days: new Set(),
            skipWeekends: true,
            skipHolidays: true,
            type: typeArg || 'vacation',
            viewYear: today.getFullYear(),
            viewMonth: today.getMonth()
        };

        const overlay = document.createElement('div');
        overlay.className = 'vp-overlay';
        overlay.id = 'vpOverlay';
        overlay.innerHTML = `
            <div class="vp-modal" role="dialog" aria-labelledby="vpTitle">
                <div class="vp-head">
                    <div class="vp-head-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <div>
                        <h3 class="vp-head-title" id="vpTitle">Urlaub planen</h3>
                        <div class="vp-head-sub">Mehrere Zeiträume oder einzelne Tage auf einmal buchen</div>
                    </div>
                    <button class="vp-close" id="vpClose" aria-label="Schließen">×</button>
                </div>
                <div class="vp-tabs">
                    <button class="vp-tab active" data-vp-mode="range">Zeitraum</button>
                    <button class="vp-tab" data-vp-mode="days">Einzelne Tage</button>
                </div>
                <div class="vp-body">
                    <div class="vp-pane active" data-vp-mode="range">
                        <div id="vpRangeList"></div>
                        <button class="vp-range-add" id="vpAddRange">+ Weiteren Zeitraum hinzufügen</button>
                    </div>
                    <div class="vp-pane" data-vp-mode="days">
                        <div class="vp-cal-nav">
                            <button id="vpPrevMonth" aria-label="Vorheriger Monat">‹</button>
                            <div class="vp-cal-label" id="vpCalLabel"></div>
                            <button id="vpNextMonth" aria-label="Nächster Monat">›</button>
                        </div>
                        <div class="vp-cal-grid" id="vpCalGrid"></div>
                    </div>
                    <div class="vp-opts">
                        <label class="vp-opt">
                            <input type="checkbox" id="vpSkipWE" checked>
                            <span class="vp-opt-mark"></span>
                            <span>Wochenenden überspringen <span class="vp-opt-sub">(Sa &amp; So nie als Urlaub buchen)</span></span>
                        </label>
                        <label class="vp-opt">
                            <input type="checkbox" id="vpSkipHol" checked>
                            <span class="vp-opt-mark"></span>
                            <span>Feiertage überspringen <span class="vp-opt-sub">(gesetzliche Feiertage werden nicht doppelt gezählt)</span></span>
                        </label>
                    </div>
                </div>
                <div class="vp-foot">
                    <div class="vp-count" id="vpCount"><strong>0</strong> Tage werden gebucht<div class="vp-count-sub">Noch nichts ausgewählt</div></div>
                    <button class="vp-btn vp-btn-ghost" id="vpCancel">Abbrechen</button>
                    <button class="vp-btn vp-btn-primary" id="vpCommit" disabled>Urlaub buchen</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        const close = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 220);
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        document.getElementById('vpClose').addEventListener('click', close);
        document.getElementById('vpCancel').addEventListener('click', close);

        document.querySelectorAll('.vp-tab').forEach(t => {
            t.addEventListener('click', () => _vpSwitchMode(t.dataset.vpMode));
        });

        document.getElementById('vpAddRange').addEventListener('click', () => {
            _vacPickerState.ranges.push({ start: '', end: '' });
            _vpRenderRanges();
        });

        document.getElementById('vpPrevMonth').addEventListener('click', () => {
            const s = _vacPickerState;
            s.viewMonth--;
            if (s.viewMonth < 0) { s.viewMonth = 11; s.viewYear--; }
            _vpRenderCalendar();
        });
        document.getElementById('vpNextMonth').addEventListener('click', () => {
            const s = _vacPickerState;
            s.viewMonth++;
            if (s.viewMonth > 11) { s.viewMonth = 0; s.viewYear++; }
            _vpRenderCalendar();
        });

        document.getElementById('vpSkipWE').addEventListener('change', (e) => {
            _vacPickerState.skipWeekends = e.target.checked;
            _vpUpdateCount();
        });
        document.getElementById('vpSkipHol').addEventListener('change', (e) => {
            _vacPickerState.skipHolidays = e.target.checked;
            _vpUpdateCount();
        });

        document.getElementById('vpCommit').addEventListener('click', () => {
            _vpCommit(close);
        });

        _vpRenderRanges();
        _vpRenderCalendar();
        _vpUpdateCount();
    }

    function _vpCommit(closeFn) {
        const dates = _vpCollectDates();
        if (dates.length === 0) return;
        const s = _vacPickerState;
        const dateSet = new Set(dates);

        // Konflikte mit bestehenden Einträgen (anderer Typ)
        const conflicts = data.entries.filter(e => dateSet.has(e.date) && e.type !== s.type);

        const doCommit = () => {
            // Auto-Feiertage im Bereich entfernen (vermeidet doppelte Zählung)
            data.entries = data.entries.filter(e => !(dateSet.has(e.date) && e.type === 'holiday' && !e.isPeriod));
            // Konflikt-Einträge entfernen
            data.entries = data.entries.filter(e => !(dateSet.has(e.date) && e.type !== s.type));
            // Bestehende vacation-Einträge auf gleichen Tagen entfernen (de-duplizieren)
            data.entries = data.entries.filter(e => !(dateSet.has(e.date) && e.type === s.type));

            const wd = [1,2,3,4,5].map(i => data.settings.hours[i] || 0).filter(h => h > 0);
            const avgWorkHours = wd.length ? (wd.reduce((a,b)=>a+b,0) / wd.length) : 8;

            const infoForType = (t) => (t === 'vacation' ? 'Urlaubstag' : (t === 'sick' ? 'Krankmeldung' : (t === 'holiday' ? 'Feiertag' : t)));
            dates.forEach(iso => {
                const d = new Date(iso + 'T00:00:00');
                const dow = d.getDay();
                let expected = data.settings.hours[dow] || 0;
                if (expected <= 0) expected = avgWorkHours;
                data.entries.push({
                    id: Date.now() + Math.random(),
                    date: iso,
                    type: s.type,
                    worked: expected,
                    expected: expected,
                    diff: 0,
                    info: infoForType(s.type),
                    isPeriod: false,
                    breakMins: 0,
                    shiftStart: '',
                    shiftEnd: '',
                    start: '',
                    end: '',
                    shiftWarning: false,
                    timestamp: Date.now()
                });
            });

            data.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
            recalculateVacationUsed();
            save();
            try { updateUI(); } catch (e) {}
            try { renderLists && renderLists(); } catch (e) {}
            if (typeof closeFn === 'function') closeFn();
            showCustomMessage('✅ Erfolg', `${dates.length} Tage als Urlaub gebucht.`, 'success');
        };

        if (conflicts.length > 0) {
            showCustomConfirm(
                '⚠️ Einträge überschreiben?',
                `${conflicts.length} der gewählten Tage haben bereits andere Einträge (z.B. Arbeit / Schule). Sollen sie überschrieben werden?`,
                doCommit,
                null
            );
        } else {
            doCommit();
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
    