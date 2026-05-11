// ═══ DASHBOARD MODULE ═══
    window._clsBC = 'dashboard.js-start';

    function shakeInputError(...ids) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('input-error');
            void el.offsetWidth; // reflow to restart animation
            el.classList.add('input-error');
            setTimeout(() => el.classList.remove('input-error'), 600);
        });
    }

    function handleEntry() {
        uEvent('entry-save-attempt');
        const dateStr = document.getElementById('inpDate').value;
        const type = document.getElementById('inpType').value;
        const start = document.getElementById('inpStart').value;
        const end = document.getElementById('inpEnd').value;
        const direct = document.getElementById('inpHours').value;
        
        // NEU: Projekt & Info/Notiz
        const project = document.getElementById('inpProject').value.trim(); 
        const notes = document.getElementById('inpNotes').value.trim();

        if(!dateStr) { shakeInputError('inpDate'); return; }
        
        const date = new Date(dateStr);
        let worked = 0;
        let dayIndex = date.getDay(); 
        let expected = data.settings.hours[dayIndex] || 0;
        let info = notes; // info wird zur Notiz, da Zeit jetzt getrennt ist
        let diff = 0; 
        
        let breakMinutes = 0;
        let shiftStart = ''; // NEU
        let shiftEnd = '';
        let shiftWarning = false;
        let breakLog = []; // NEU: Speichert Pausen-Log, wenn Timer verwendet wurde

        if(type === 'work') {
            if(start && end) {
                shiftStart = start; // NEU
                
                let d1 = new Date(`2000-01-01T${start}`);
                let d2 = new Date(`2000-01-01T${end}`);
                let hoursDiff = (d2 - d1) / 3.6e6;
                if(hoursDiff < 0) hoursDiff += 24;
                
                // Hole Pausenzeit für diesen Wochentag
                const breakMinutesForDay = Array.isArray(data.settings.break.min) 
                    ? data.settings.break.min[dayIndex] 
                    : data.settings.break.min; // Fallback für alte Daten
                
                if(data.settings.break.thresh > 0 && hoursDiff >= data.settings.break.thresh) {
                    breakMinutes = breakMinutesForDay;
                    hoursDiff -= (breakMinutes / 60);
                    info = `${start} - ${end} (${breakMinutes}m Pause) | ${info}`; // Zeitdetails im Info behalten
                } else {
                    info = `${start} - ${end} | ${info}`;
                }
                worked = hoursDiff;
                shiftEnd = end;
                shiftWarning = worked > 10.0;

            } else if (direct) {
                worked = parseFloat(direct);
                info = `Manuell (${worked.toFixed(2)}h) | ${info}`;
            } else if (timer.paused > 0 || timer.running) { // Timer-Daten übernehmen
                 const now = Date.now();
                 let totalMs = timer.paused + (timer.running ? now - timer.start : 0);
                 let h = totalMs / 3.6e6;
                 
                 // Präzise Pausenlogik: Abzug der gemessenen Pausenzeit
                 h -= (timer.breakTime / 3.6e6); // Abzug der im Timer gemessenen Pausenzeit (NEU)

                 // Hole Pausenzeit für diesen Wochentag
                 const breakMinutesForDay = Array.isArray(data.settings.break.min) 
                    ? data.settings.break.min[dayIndex] 
                    : data.settings.break.min; // Fallback für alte Daten
                 
                 // Automatischer Abzug der Mindestpause (falls Timer-Pausen < Mindestpause)
                 const minBreakRequired = breakMinutesForDay;
                 const timerBreakMinutes = timer.breakTime / 60000;

                 if (h * 60 >= data.settings.break.thresh * 60 && timerBreakMinutes < minBreakRequired) {
                    const additionalBreakMs = (minBreakRequired - timerBreakMinutes) * 60000;
                    h -= (additionalBreakMs / 3.6e6);
                    breakMinutes = minBreakRequired;
                    showCustomMessage('ℹ️ Hinweis', `${minBreakRequired} Minuten Mindestpause abgezogen (Timer-Pause war zu kurz).`, 'info');
                 } else {
                    breakMinutes = timerBreakMinutes;
                 }


                 worked = h;
                 info = `Live-Tracker (${h.toFixed(2)}h) | ${info}`;
                 breakLog = timer.log.filter(l => l.action === 'pause'); // Pausen-Log speichern (NEU)
                 
                 // Timer zurücksetzen
                 timer = {id:null, start:0, paused:0, running:false, log:[], breakTime: 0};
                 saveTimerState();
                 displayTimerTime(0);

            } else { shakeInputError('inpStart', 'inpEnd', 'inpHours'); return; }
            
            diff = worked - expected;

        } else if (type === 'school') { 
            const SCHOOL_HOURS = 6.75;
            
            if (dayIndex === 3) {
                // Berufsschultag = voller Arbeitstag (Ausbildung)
                worked = expected; // Zählt als voller Tag
                info = `Berufsschule - Mittwoch (${SCHOOL_HOURS}h Unterricht → ${expected}h angerechnet) | ${info}`;
            } else if (dayIndex === 4 && isOddWeek(date)) {
                worked = expected; // Zählt als voller Tag
                info = `Berufsschule - Do. Ungerade (${SCHOOL_HOURS}h Unterricht → ${expected}h angerechnet) | ${info}`;
            } else if (direct) {
                worked = expected; // Auch manuell eingegebene Schultage = voller Tag
                info = `Berufsschule - Manuell (${parseFloat(direct).toFixed(2)}h Unterricht → ${expected}h angerechnet) | ${info}`;
            } else {
                worked = expected;
                info = `Keine Berufsschule (Regulär) | ${info}`;
            }
            
            // Schultag = voller Arbeitstag → diff immer 0
            diff = 0;

        } else if (type === 'gleittag') {
            // Gleittag: Frei durch Überstundenabbau → zählt als gearbeitet, aber diff = -expected (Überstunden werden abgezogen)
            worked = 0;
            diff = -expected;
            info = `Gleittag (Überstundenabbau: -${expected.toFixed(2)}h) | ${info}`;

        } else if (type === 'vacation' || type === 'sick' || type === 'holiday') {
            worked = expected;
            info = (type === 'vacation' ? 'Urlaubstag' : (type === 'sick' ? 'Krankmeldung' : 'Feiertag')) + ` | ${info}`;
            diff = 0;
        }
        
        // Entferne führende '| ' wenn info leer war
        info = info.replace(/^ \| /, '').trim();

        const entry = {
            id: editId || Date.now(),
            date: dateStr, type, worked, expected, 
            diff: diff, 
            info, 
            isPeriod: false,
            breakMins: breakMinutes,
            shiftStart: shiftStart,
            shiftEnd: shiftEnd,
            start: shiftStart,
            end: shiftEnd,
            endIsRaw: true,
            shiftWarning: shiftWarning,
            project: project, // NEU: Projekt/Kunde
            timestamp: Date.now(), // P2P: Versionskontrolle für Smart Sync
            breakLog: breakLog, // NEU: Detailliertes Pausenlog
            mood: '' // NEU: Mood Tracker
        };

        if(editId) {
            const idx = data.entries.findIndex(e => e.id === editId);
            if(idx > -1) {
                const oldType = data.entries[idx].type;
                console.log('✍️ Updating entry:', entry);
                data.entries[idx] = entry;
                if (oldType !== 'vacation' || type !== 'vacation') recalculateVacationUsed();
            }
            resetEdit();
        } else {
            console.log('➕ Adding entry:', entry);
            data.entries.push(entry);
            if (type === 'vacation') recalculateVacationUsed();
        }
        
        data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
        save();
        uEvent('entry-saved', { type: type, isEdit: !!editId });
        
        // Mood Selector nach Eintrag (nur wenn aktiviert)
        if (!editId && data.settings.moodSelectorEnabled !== false) {
            openMoodSelector(entry.id);
        }
        
        // Formularfelder leeren
        document.getElementById('inpStart').value = '';
        document.getElementById('inpEnd').value = '';
        document.getElementById('inpHours').value = '';
        document.getElementById('inpProject').value = ''; // NEU
        document.getElementById('inpNotes').value = ''; // NEU
        try { if (typeof clearDraft === 'function') clearDraft(); else localStorage.removeItem('tt_entry_draft'); } catch(e) { /* ignore */ }
        
        // Neu laden der Historie, falls gerade aktiv
        if (document.getElementById('view-history').classList.contains('active')) {
             renderHistoryView();
        }
        // Neu laden der Ziele
        renderGoalsView();
    }

    function resetEdit() {
        editId = null;
        document.getElementById('mainBtn').innerText = "Eintrag speichern";
        document.getElementById('cancelBtn').style.display = "none";
        document.getElementById('inpStart').value = '';
        document.getElementById('inpEnd').value = '';
        document.getElementById('inpHours').value = '';
        document.getElementById('inpProject').value = ''; // NEU
        document.getElementById('inpNotes').value = ''; // NEU
    }

    function timerAction(act) {
        uEvent('timer-' + act);
        const now = Date.now();
        if (act === 'start') {
            if (!timer.running) { 
                timer.start = now; 
                timer.running = true; 
                timerRun(); 
                document.getElementById('timerBox').classList.add('timer-active');
                logTimerAction('start', now);
            }
        } else if (act === 'pause') {
            if (timer.running) {
                timer.running = false; 
                timer.paused += now - timer.start;
                document.getElementById('timerBox').classList.remove('timer-active');
                logTimerAction('pause', now);
            }
        } else if (act === 'stop') {
            // Stop leert Timer und bucht den Eintrag
            timer.running = false; 
            document.getElementById('timerBox').classList.remove('timer-active');
            
            // Loggt die Stop-Aktion, um letzte Pause/Laufzeit zu beenden
            logTimerAction('stop', now); 

            let total = timer.paused + (timer.start > 0 ? now - timer.start : 0);
            let h_raw = total / 3.6e6; // Brutto-Stunden
            let h_netto = h_raw - (timer.breakTime / 3.6e6); // Netto-Stunden

            // Manuelle Mindestpausen-Korrektur (wird in handleEntry detailliert durchgeführt)
            showCustomConfirm(
                '⏹️ Zeit stoppen?',
                `Geleistete Zeit: ${h_netto.toFixed(2)}h\nPausenzeit: ${(timer.breakTime / 3.6e6).toFixed(2)}h`,
                () => {
                    // Den Netto-Wert in das Stundenfeld übertragen, damit handleEntry es verarbeitet
                    document.getElementById('inpHours').value = h_netto.toFixed(2);
                    document.getElementById('inpType').value = 'work';
                    document.getElementById('inpDate').valueAsDate = new Date();
                    
                    // Da handleEntry Timer-Daten automatisch übernimmt, rufen wir es auf
                    handleEntry(); 
                    
                    // Timer ist bereits in handleEntry zurückgesetzt
                },
                () => {
                    // Wenn Abbruch, Log und Timer auf Pause-Status zurücksetzen
                    timer.running = false;
                    timer.log.pop(); // Stop-Eintrag entfernen
                    saveTimerState();
                }
            );
        }
    }

    function calculateMonthStats(month, year) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        let stats = {
            worked: 0,
            workDays: 0,
            schoolDays: 0,
            vacationDays: 0,
            sickDays: 0,
            holidayDays: 0,
            saldo: 0,
            weeks: [],
            dailyDiffs: []
        };

        // Sammle alle Einträge für diesen Monat
        const monthEntries = data.entries.filter(e => {
            // Unterstütze sowohl 'YYYY-MM-DD' als auch ISO 'YYYY-MM-DDTHH:MM' Formate
            const dateOnly = (e.date || '').split('T')[0];
            const eDate = new Date(dateOnly + 'T00:00:00');
            return eDate >= firstDay && eDate <= lastDay;
        });

        // Gruppiere Einträge pro Tag, damit mehrere Einträge an einem Tag aggregiert werden
        const byDate = {};
        monthEntries.forEach(e => {
            const dateOnly = (e.date || '').split('T')[0];
            if (!byDate[dateOnly]) byDate[dateOnly] = [];
            byDate[dateOnly].push(e);
        });

        // Iteriere über alle Tage des Monats und berechne Tageswerte
        for (let d = firstDay.getDate(); d <= lastDay.getDate(); d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayEntries = byDate[dateStr] || [];
            if (dayEntries.length === 0) continue;

            let dayWorkedHours = 0;
            let dayHasWork = false;
            let dayHasSchool = false;
            let dayHasVacation = false;
            let dayHasGleittag = false;
            let dayHasSick = false;
            let dayHasHoliday = false;

            dayEntries.forEach(e => {
                const type = e.type;
                if (type === 'work') {
                    // Berechne Stunden: bevorzugt neu gespeicherte 'worked',
                    // sonst 'shiftStart'/'shiftEnd', sonst altes 'start'/'end' oder 'hours'
                    let hours = 0;
                    if (typeof e.worked === 'number' && isFinite(e.worked) && e.worked > 0) {
                        hours = e.worked;
                    } else if (e.shiftStart && e.shiftEnd) {
                        const diff = (parseTime(e.shiftEnd) - parseTime(e.shiftStart)) / 60;
                        if (isFinite(diff) && diff > 0) hours = diff;
                    } else if (e.start && e.end) {
                        const diff = (parseTime(e.end) - parseTime(e.start)) / 60;
                        if (isFinite(diff) && diff > 0) hours = diff;
                    } else if (typeof e.hours === 'number') {
                        hours = e.hours;
                    } else if (e.hours) {
                        hours = Number(e.hours) || 0;
                    }
                    dayWorkedHours += hours;
                    if (hours > 0) dayHasWork = true;
                } else if (type === 'school') {
                    dayHasSchool = true;
                } else if (type === 'vacation') {
                    dayHasVacation = true;
                } else if (type === 'gleittag') {
                    dayHasGleittag = true;
                } else if (type === 'sick') {
                    dayHasSick = true;
                } else if (type === 'holiday') {
                    dayHasHoliday = true;
                }
            });

            // Tageszusammenfassung in die Statistiken einfließen lassen
            if (dayHasWork) {
                stats.worked += dayWorkedHours;
                stats.workDays += 1; // pro Arbeitstag nur einmal zählen
                const dayDiff = dayWorkedHours - 8.75;
                stats.saldo += dayDiff;
                stats.dailyDiffs.push(dayDiff);
            }
            if (dayHasSchool) stats.schoolDays += 1;
            if (dayHasVacation) stats.vacationDays += 1;
            if (dayHasGleittag) stats.gleittagDays = (stats.gleittagDays || 0) + 1;
            if (dayHasSick) stats.sickDays += 1;
            if (dayHasHoliday) stats.holidayDays += 1;

            // Wochen-Statistik (Woche im Monat: 1..5)
            const weekNum = Math.ceil(d / 7);
            let week = stats.weeks.find(w => w.weekNum === weekNum);
            if (!week) {
                week = { weekNum: weekNum, entries: 0, hours: 0 };
                stats.weeks.push(week);
            }
            if (dayHasWork) week.entries += 1; // Arbeitstage pro Woche
            week.hours += dayWorkedHours;
        }

        return stats;
    }

    function setTrendPeriod(days) {
        window._trendPeriod = days;
        document.querySelectorAll('.trend-period-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.period) === days);
        });
        const sub = document.getElementById('trendSubtitle');
        if (sub) sub.textContent = days === 0 ? 'Gesamter Zeitraum' : `Entwicklung der letzten ${days} Tage`;
        if (window._trendDataFull && window._trendDataFull.length > 0) {
            renderTrend(window._trendDataFull, 'trendChart');
        }
    }

    function toggleTimeInputs() {
        const t = document.getElementById('inpType').value;
        const els = [document.getElementById('inpStart'), document.getElementById('inpEnd')];
        const disableTime = (t !== 'work');
        els.forEach(e => e.disabled = disableTime);
        document.getElementById('inpHours').disabled = (t === 'gleittag' || t === 'vacation' || t === 'sick' || t === 'holiday');
    }

    function openCorrection(type) {
        const modal = document.getElementById('corrModal');
        const sel = document.getElementById('corrSelect');
        sel.innerHTML = '';
        const now = new Date();
        if(type === 'week') {
            for(let i=0; i<20; i++) {
                let d = new Date(now); d.setDate(d.getDate() - i*7);
                sel.add(new Option(`KW ${getWeek(d)}`, `KW ${getWeek(d)}`));
            }
        } else {
            for(let i=0; i<12; i++) {
                let d = new Date(now.getFullYear(), now.getMonth()-i, 1);
                sel.add(new Option(d.toLocaleDateString('de-DE',{month:'long', year:'numeric'}), d.toISOString()));
            }
        }
        modal.classList.add('active');
    }

    function checkAndBookHolidays() {
        const bundesland = (data.settings && data.settings.bundesland) || '';
        if (!bundesland) {
            showHolidayNoBundesland();
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        let holidays = getGermanHolidays(year).concat(getGermanHolidays(year + 1));
        const existingDates = data.entries.map(e => e.date);

        // Filter: nur Arbeitstage (mit Sollstunden), nicht bereits gebucht, max 60 Tage Vorausschau
        const pending = holidays.filter(h => {
            if (existingDates.includes(h.date)) return false;
            const dateObj = new Date(h.date);
            const dayIndex = dateObj.getDay();
            const expected = data.settings.hours[dayIndex] || 0;
            return expected > 0 && dateObj.getTime() < now.getTime() + (60 * 86400000);
        });

        if (pending.length === 0) {
            showHolidayNoPending();
            return;
        }

        showHolidayConfirmModal(pending);
    }

    function renderMiniCalendar() {
        const grid = document.getElementById('miniCalGrid');
        const monthEl = document.getElementById('miniCalMonth');
        if (!grid || !monthEl) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const year = miniCalViewYear;
        const month = miniCalViewMonth;

        // Month label
        const monthName = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        monthEl.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

        // Build entry map for this month
        const entryMap = {};
        (data.entries || []).forEach(e => {
            const d = new Date(e.date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                entryMap[e.date] = e.type;
            }
        });

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Monday start

        // Header row
        const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        let html = dayLabels.map(d => `<div class="mini-cal-header">${d}</div>`).join('');

        // Empty cells before first day
        for (let i = 0; i < startOffset; i++) {
            html += '<div class="mini-cal-day empty"></div>';
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const cellDate = new Date(year, month, day);
            const dayOfWeek = cellDate.getDay();
            const isWeekend = (data.settings.hours[dayOfWeek] || 0) <= 0 && (dayOfWeek === 0 || dayOfWeek === 6);
            const isToday = dateStr === todayStr;
            const entryType = entryMap[dateStr];

            let classes = 'mini-cal-day';
            if (entryType) classes += ` has-entry type-${entryType}`;
            if (isToday) classes += ' is-today';
            if (isWeekend && !entryType) classes += ' is-weekend';

            const title = entryType ?
                `${dateStr}: ${entryType === 'work' ? 'Arbeit' : entryType === 'school' ? 'Schule' : entryType === 'vacation' ? 'Urlaub' : entryType === 'gleittag' ? 'Gleittag' : entryType === 'sick' ? 'Krank' : 'Feiertag'}` :
                dateStr;

            html += `<div class="${classes}" title="${title}" onclick="miniCalDayClick('${dateStr}')">${day}</div>`;
        }

        grid.innerHTML = html;
    }

    function openChartStyleModal() {
        const saved = localStorage.getItem('tt_chart_style');
        const currentStyle = saved ? JSON.parse(saved) : {
            type: 'area-smooth',
            color: 'var(--primary)',
            animation: true,
            gradient: true,
            glow: true,
            blur: false,
            dots: false,
            rainbow: false
        };
        
        window.modalChartStyle = JSON.parse(JSON.stringify(currentStyle));
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'chartStyleModal';
        modal.style.zIndex = '5000';
        modal.style.animation = 'fadeIn 0.3s ease';
        
        modal.innerHTML = `
            <div class="modal-box" style="width:580px; max-height:90vh; overflow-y:auto; animation: slideUp 0.3s ease; border-radius:16px; border:1px solid rgba(255,255,255,0.08); box-shadow:0 24px 80px rgba(0,0,0,0.5);">
                <!-- Header -->
                <div style="padding:1.75rem 2rem 1.5rem; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h2 style="margin:0 0 4px 0; font-size:1.2rem; font-weight:700; color:var(--text-main); letter-spacing:-0.02em;">Chart-Konfiguration</h2>
                            <p style="margin:0; font-size:0.78rem; color:var(--text-muted); font-weight:400;">Visualisierung und Darstellung anpassen</p>
                        </div>
                        <button id="closeChartModal" onclick="document.getElementById('chartStyleModal').remove()" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); color:var(--text-muted); width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:10px; cursor:pointer; font-size:1.2rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.color='var(--text-main)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.color='var(--text-muted)'">&times;</button>
                    </div>
                </div>
                
                <div style="padding:1.5rem 2rem 2rem;">
                    <!-- Chart Type -->
                    <div style="margin-bottom:1.75rem;">
                        <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:10px;">Diagramm-Typ</div>
                        <div id="chartTypeButtons" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;"></div>
                    </div>
                    
                    <!-- Color -->
                    <div style="margin-bottom:1.75rem;">
                        <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:10px;">Akzentfarbe</div>
                        <div id="colorButtons" style="display:flex; flex-direction:column;"></div>
                    </div>
                    
                    <!-- Effects -->
                    <div style="margin-bottom:1.75rem;">
                        <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:10px;">Effekte</div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            <label class="csm-toggle" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); transition:all 0.2s; user-select:none;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=this.querySelector('input').checked ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(255,255,255,0.03)'">
                                <input type="checkbox" id="gradientCheck" ${currentStyle.gradient ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary); flex-shrink:0;">
                                <span style="font-size:0.8rem; font-weight:500; white-space:nowrap;">Gradient</span>
                            </label>
                            <label class="csm-toggle" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); transition:all 0.2s; user-select:none;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=this.querySelector('input').checked ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(255,255,255,0.03)'">
                                <input type="checkbox" id="animationCheck" ${currentStyle.animation ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary); flex-shrink:0;">
                                <span style="font-size:0.8rem; font-weight:500; white-space:nowrap;">Animation</span>
                            </label>
                            <label class="csm-toggle" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); transition:all 0.2s; user-select:none;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=this.querySelector('input').checked ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(255,255,255,0.03)'">
                                <input type="checkbox" id="glowCheck" ${currentStyle.glow ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary); flex-shrink:0;">
                                <span style="font-size:0.8rem; font-weight:500; white-space:nowrap;">Glow</span>
                            </label>
                            <label class="csm-toggle" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); transition:all 0.2s; user-select:none;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=this.querySelector('input').checked ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(255,255,255,0.03)'">
                                <input type="checkbox" id="blurCheck" ${currentStyle.blur ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary); flex-shrink:0;">
                                <span style="font-size:0.8rem; font-weight:500; white-space:nowrap;">Blur</span>
                            </label>
                            <label class="csm-toggle" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); transition:all 0.2s; user-select:none;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=this.querySelector('input').checked ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(255,255,255,0.03)'">
                                <input type="checkbox" id="dotsCheck" ${currentStyle.dots ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary); flex-shrink:0;">
                                <span style="font-size:0.8rem; font-weight:500; white-space:nowrap;">Punkte</span>
                            </label>
                            <label class="csm-toggle" style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); transition:all 0.2s; user-select:none;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background=this.querySelector('input').checked ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(255,255,255,0.03)'">
                                <input type="checkbox" id="rainbowCheck" ${currentStyle.rainbow ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; accent-color:var(--primary); flex-shrink:0;">
                                <span style="font-size:0.8rem; font-weight:500; white-space:nowrap; background:linear-gradient(90deg,#ef4444,#f59e0b,#10b981,#06b6d4,#8b5cf6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">Rainbow</span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Preview -->
                    <div style="margin-bottom:1.5rem;">
                        <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:10px;">Vorschau</div>
                        <div style="border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden;">
                            <div id="chartPreview" style="height:150px; background:rgba(0,0,0,0.2); position:relative;"></div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="display:flex; gap:10px; justify-content:flex-end; padding-top:0.75rem; border-top:1px solid rgba(255,255,255,0.06);">
                        <button class="btn" id="chartCancelBtn" style="padding:10px 22px; background:transparent; border:1px solid rgba(255,255,255,0.12); border-radius:10px; cursor:pointer; color:var(--text-muted); font-size:0.82rem; font-weight:500; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'; this.style.color='var(--text-main)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)'">Abbrechen</button>
                        <button class="btn btn-primary" id="chartSaveBtn" style="padding:10px 28px; background:var(--primary); border:none; border-radius:10px; cursor:pointer; color:#fff; font-size:0.82rem; font-weight:600; transition:all 0.2s; box-shadow:0 2px 12px rgba(var(--primary-rgb),0.3);" onmouseover="this.style.filter='brightness(1.15)'; this.style.boxShadow='0 4px 20px rgba(var(--primary-rgb),0.4)'" onmouseout="this.style.filter='brightness(1)'; this.style.boxShadow='0 2px 12px rgba(var(--primary-rgb),0.3)'">Speichern</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        setupChartModalButtons(currentStyle);
        
        // Effect toggle handlers
        const effectIds = ['gradientCheck', 'animationCheck', 'glowCheck', 'blurCheck', 'dotsCheck', 'rainbowCheck'];
        const effectKeys = ['gradient', 'animation', 'glow', 'blur', 'dots', 'rainbow'];
        effectIds.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    window.modalChartStyle[effectKeys[i]] = e.target.checked;
                    // Update toggle visual
                    const label = e.target.closest('.csm-toggle');
                    if (label) label.style.background = e.target.checked ? 'rgba(var(--primary-rgb),0.08)' : 'rgba(255,255,255,0.03)';
                    if (id === 'rainbowCheck' && e.target.checked && typeof createConfetti === 'function') {
                        createConfetti(window.innerWidth / 2, window.innerHeight / 3, 20);
                    }
                    updateChartStylePreview(window.modalChartStyle);
                });
                // Set initial active state
                if (el.checked) {
                    const label = el.closest('.csm-toggle');
                    if (label) label.style.background = 'rgba(var(--primary-rgb),0.08)';
                }
            }
        });
        
        document.getElementById('chartSaveBtn').addEventListener('click', () => {
            saveChartStyle();
            if (typeof createExplosion === 'function') createExplosion(window.innerWidth / 2, window.innerHeight / 2);
            document.getElementById('chartStyleModal').remove();
            updateDashboard();
        });
        
        document.getElementById('chartCancelBtn').addEventListener('click', () => {
            document.getElementById('chartStyleModal').remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        setTimeout(() => updateChartStylePreview(currentStyle), 100);
    }

    // ═══ NEW: Modern Donut Settings Modal ═══
    function openDonutSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'donutSettingsModal';
        modal.style.zIndex = '5000';
        modal.style.animation = 'fadeIn 0.3s ease';

        modal.innerHTML = `
            <div class="modal-box" style="width:480px; max-height:85vh; overflow-y:auto; animation: slideUp 0.3s ease; background:linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, transparent 100%);">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:1.75rem 2rem; border-bottom:1px solid var(--border-subtle); background:linear-gradient(135deg, rgba(var(--primary-rgb), 0.08), rgba(var(--primary-rgb), 0.02));">
                    <div>
                        <h2 style="margin:0; color:var(--text-main); font-size:1.35rem;">🍩 Donut-Einstellungen</h2>
                        <p style="margin:4px 0 0; font-size:0.8rem; color:var(--text-muted);">Passe die Visualisierung deiner Arbeitszeit-Verteilung an</p>
                    </div>
                    <button onclick="document.getElementById('donutSettingsModal').remove()" style="background:none; border:none; color:var(--text-main); font-size:2rem; cursor:pointer; transition:all 0.2s; padding:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:8px;" onmouseover="this.style.background='rgba(255,255,255,0.1)'; this.style.transform='rotate(90deg)'" onmouseout="this.style.background='none'; this.style.transform='rotate(0)'" title="Schließen">×</button>
                </div>

                <div style="padding:2rem; color:var(--text-main);">
                    <!-- Display Mode -->
                    <div style="margin-bottom:2.5rem;">
                        <label style="display:block; font-weight:700; color:var(--primary); margin-bottom:1rem; font-size:1rem; display:flex; align-items:center; gap:8px;">📊 Anzeigemodus</label>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <button class="setting-option-btn active" data-mode="percentage" style="padding:12px; border:2px solid var(--primary); border-radius:10px; background:rgba(var(--primary-rgb), 0.1); color:var(--text-main); font-weight:600; cursor:pointer; transition:all 0.2s;" onclick="toggleDonutDisplayMode('percentage', this)">
                                📈 Prozente
                            </button>
                            <button class="setting-option-btn" data-mode="hours" style="padding:12px; border:2px solid var(--border-default); border-radius:10px; background:transparent; color:var(--text-muted); font-weight:600; cursor:pointer; transition:all 0.2s;" onclick="toggleDonutDisplayMode('hours', this)">
                                ⏱️ Stunden
                            </button>
                        </div>
                    </div>

                    <!-- Animation Setting -->
                    <div style="margin-bottom:2.5rem;">
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px; background:rgba(var(--primary-rgb), 0.05); border-radius:10px; border:1px solid var(--border-subtle); transition:all 0.2s;" onmouseover="this.style.background='rgba(var(--primary-rgb), 0.08)'" onmouseout="this.style.background='rgba(var(--primary-rgb), 0.05)'">
                            <input type="checkbox" id="donutAnimCheck" checked style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary);">
                            <span style="flex:1;">
                                <div style="font-weight:600; color:var(--text-main);">✨ Smooth Animationen</div>
                                <div style="font-size:0.75rem; color:var(--text-muted);">Sanfte Übergänge beim Laden</div>
                            </span>
                        </label>
                    </div>

                    <!-- Glow Effect -->
                    <div style="margin-bottom:2.5rem;">
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px; background:rgba(var(--primary-rgb), 0.05); border-radius:10px; border:1px solid var(--border-subtle); transition:all 0.2s;" onmouseover="this.style.background='rgba(var(--primary-rgb), 0.08)'" onmouseout="this.style.background='rgba(var(--primary-rgb), 0.05)'">
                            <input type="checkbox" id="donutGlowCheck" checked style="width:18px; height:18px; cursor:pointer; accent-color:var(--primary);">
                            <span style="flex:1;">
                                <div style="font-weight:600; color:var(--text-main);">💫 Glow Effekt</div>
                                <div style="font-size:0.75rem; color:var(--text-muted);">Leuchtender Schatten um Segmente</div>
                            </span>
                        </label>
                    </div>

                    <!-- Divider -->
                    <div style="height:1px; background:var(--border-subtle); margin:2rem 0;"></div>

                    <!-- Reset Button -->
                    <button onclick="resetDonutSettings()" style="width:100%; padding:12px; background:rgba(255,255,255,0.04); border:1px solid var(--border-default); border-radius:10px; color:var(--text-main); font-weight:600; cursor:pointer; transition:all 0.2s; margin-bottom:1rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'">
                        🔄 Auf Standard zurücksetzen
                    </button>

                    <!-- Action Buttons -->
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button onclick="document.getElementById('donutSettingsModal').remove()" style="padding:11px 24px; background:rgba(255,255,255,0.06); border:1px solid var(--border-default); border-radius:10px; cursor:pointer; color:var(--text-main); font-weight:600; transition:all 0.2s; border-radius:10px;" onmouseover="this.style.background='rgba(255,255,255,0.10)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.transform='translateY(0)'">Schließen</button>
                        <button onclick="saveDonutSettings(); document.getElementById('donutSettingsModal').remove();" style="padding:11px 28px; background:linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb), 0.8)); border:none; border-radius:10px; cursor:pointer; color:#fff; font-weight:700; transition:all 0.2s; box-shadow:0 4px 15px rgba(var(--primary-rgb), 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(var(--primary-rgb), 0.5)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(var(--primary-rgb), 0.3)'">✓ Speichern</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    function toggleDonutDisplayMode(mode, button) {
        document.querySelectorAll('.setting-option-btn').forEach(b => {
            b.style.borderColor = 'var(--border-default)';
            b.style.background = 'transparent';
            b.style.color = 'var(--text-muted)';
        });
        button.style.borderColor = 'var(--primary)';
        button.style.background = 'rgba(var(--primary-rgb), 0.1)';
        button.style.color = 'var(--text-main)';
        localStorage.setItem('tt_donut_mode', mode);
    }

    function saveDonutSettings() {
        const settings = {
            animated: document.getElementById('donutAnimCheck').checked,
            glow: document.getElementById('donutGlowCheck').checked,
            mode: localStorage.getItem('tt_donut_mode') || 'percentage'
        };
        localStorage.setItem('tt_donut_settings', JSON.stringify(settings));
        updateDashboard();
    }

    function resetDonutSettings() {
        document.getElementById('donutAnimCheck').checked = true;
        document.getElementById('donutGlowCheck').checked = true;
        localStorage.removeItem('tt_donut_settings');
        localStorage.removeItem('tt_donut_mode');
    }

    function openDonutStyleModal() {
        const saved = localStorage.getItem('tt_bar_chart_settings');
        const currentSettings = saved ? JSON.parse(saved) : {
            barHeight: 32,
            showLabels: true,
            showAnimation: true,
            borderRadius: 8
        };

        window.modalBarSettings = { ...currentSettings };

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'donutStyleModal';
        modal.style.zIndex = '5000';
        modal.style.animation = 'fadeIn 0.3s ease';

        modal.innerHTML = `<div class="modal-box" style="width:420px;animation:slideUp .3s;background:linear-gradient(135deg,rgba(var(--primary-rgb),.06) 0%,rgba(var(--primary-rgb),.02) 100%);border:1px solid var(--border-default);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)"><div style="padding:1.5rem 2rem;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(90deg,rgba(var(--primary-rgb),.1) 0%,transparent 100%)"><h2 style="margin:0;font-size:1.3rem;font-weight:900;color:var(--text-main)">📊 Balkendiagramm</h2><button onclick="document.getElementById('donutStyleModal').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.4rem;cursor:pointer;padding:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .2s" onmouseover="this.style.background='rgba(255,255,255,.1)';this.style.color='var(--text-main)'" onmouseout="this.style.background='none';this.style.color='var(--text-muted)'">✕</button></div><div style="padding:2rem;display:flex;flex-direction:column;gap:1.5rem"><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem"><span style="font-weight:700;font-size:.95rem;color:var(--text-main)">📏 Höhe: <span id="barHeightValue" style="color:var(--primary);font-family:var(--font-mono)">${currentSettings.barHeight}px</span></span></div><input type="range" id="barHeightSlider" min="20" max="50" value="${currentSettings.barHeight}" style="width:100%;height:7px;border-radius:4px;background:linear-gradient(to right,rgba(var(--primary-rgb),.2),rgba(var(--primary-rgb),.4));outline:none;-webkit-appearance:none;cursor:pointer" oninput="window.modalBarSettings.barHeight=parseInt(this.value);document.getElementById('barHeightValue').textContent=this.value+'px';applyBarChartSettings()"><style>input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--primary);cursor:pointer;box-shadow:0 0 8px rgba(var(--primary-rgb),.4)}input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--primary);cursor:pointer;border:none;box-shadow:0 0 8px rgba(var(--primary-rgb),.4)}</style></div><label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:13px 14px;background:rgba(var(--primary-rgb),.04);border:1.5px solid rgba(var(--primary-rgb),.12);border-radius:12px;transition:all .2s" onmouseover="this.style.background='rgba(var(--primary-rgb),.08)';this.style.borderColor='rgba(var(--primary-rgb),.25)'" onmouseout="this.style.background='rgba(var(--primary-rgb),.04)';this.style.borderColor='rgba(var(--primary-rgb),.12)'"><span style="font-size:1.6rem">📝</span><div style="flex:1"><div style="font-weight:700;color:var(--text-main);font-size:.95rem">Prozent anzeigen</div><div style="font-size:.7rem;color:var(--text-muted)">Im Balken</div></div><input type="checkbox" id="showLabelsCheck" ${currentSettings.showLabels ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;accent-color:var(--primary)"></label><label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:13px 14px;background:rgba(var(--primary-rgb),.04);border:1.5px solid rgba(var(--primary-rgb),.12);border-radius:12px;transition:all .2s" onmouseover="this.style.background='rgba(var(--primary-rgb),.08)';this.style.borderColor='rgba(var(--primary-rgb),.25)'" onmouseout="this.style.background='rgba(var(--primary-rgb),.04)';this.style.borderColor='rgba(var(--primary-rgb),.12)'"><span style="font-size:1.6rem">⚡</span><div style="flex:1"><div style="font-weight:700;color:var(--text-main);font-size:.95rem">Sanfte Animation</div><div style="font-size:.7rem;color:var(--text-muted)">Beim Laden</div></div><input type="checkbox" id="showAnimationCheck" ${currentSettings.showAnimation ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;accent-color:var(--primary)"></label><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem"><span style="font-weight:700;font-size:.95rem;color:var(--text-main)">🔘 Ecken: <span id="borderRadiusValue" style="color:var(--primary);font-family:var(--font-mono)">${currentSettings.borderRadius}px</span></span></div><input type="range" id="borderRadiusSlider" min="0" max="20" value="${currentSettings.borderRadius}" style="width:100%;height:7px;border-radius:4px;background:linear-gradient(to right,rgba(var(--primary-rgb),.2),rgba(var(--primary-rgb),.4));outline:none;-webkit-appearance:none;cursor:pointer" oninput="window.modalBarSettings.borderRadius=parseInt(this.value);document.getElementById('borderRadiusValue').textContent=this.value+'px';applyBarChartSettings()"></div><div style="display:flex;gap:10px;justify-content:flex-end;padding-top:1.5rem;border-top:1px solid var(--border-subtle);margin-top:.5rem"><button id="donutCancelBtn" onclick="document.getElementById('donutStyleModal').remove()" style="padding:10px 20px;background:rgba(255,255,255,.05);border:1px solid var(--border-default);border-radius:8px;color:var(--text-main);font-weight:600;cursor:pointer;transition:all .2s;font-size:.95rem" onmouseover="this.style.background='rgba(255,255,255,.10)';this.style.transform='translateY(-1px)'" onmouseout="this.style.background='rgba(255,255,255,.05)';this.style.transform='translateY(0)'">Abbrechen</button><button id="donutSaveBtn" style="padding:10px 24px;background:linear-gradient(135deg,var(--primary),rgba(var(--primary-rgb),.8));border:none;border-radius:8px;color:#fff;font-weight:700;cursor:pointer;transition:all .2s;font-size:.95rem;box-shadow:0 4px 12px rgba(var(--primary-rgb),.3)" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(var(--primary-rgb),.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(var(--primary-rgb),.3)'">Speichern</button></div></div>`;

        document.body.appendChild(modal);

        // Setup checkbox handlers
        document.getElementById('showLabelsCheck').addEventListener('change', (e) => {
            window.modalBarSettings.showLabels = e.target.checked;
            applyBarChartSettings();
        });
        document.getElementById('showAnimationCheck').addEventListener('change', (e) => {
            window.modalBarSettings.showAnimation = e.target.checked;
        });

        // Save button handler
        document.getElementById('donutSaveBtn').addEventListener('click', () => {
            localStorage.setItem('tt_bar_chart_settings', JSON.stringify(window.modalBarSettings));
            createExplosion(window.innerWidth / 2, window.innerHeight / 2);
            document.getElementById('donutStyleModal').remove();
            updateDashboard();
        });

        // Cancel button handler
        document.getElementById('donutCancelBtn').addEventListener('click', () => {
            document.getElementById('donutStyleModal').remove();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    function applyBarChartSettings() {
        if (!window.modalBarSettings) return;
        const container = document.getElementById('donutChartContainer');
        if (container) container.style.height = window.modalBarSettings.barHeight + 'px';

        const labels = document.querySelectorAll('.segment-label');
        labels.forEach(label => {
            label.style.display = window.modalBarSettings.showLabels ? 'block' : 'none';
        });
    }

    function cancelDashboardEditMode() {
        const container = document.getElementById('dashboardContainer');
        if (!container || !container.classList.contains('edit-mode')) return;
        
        // Reload layout from localStorage to discard changes
        loadDashboardLayout();
        toggleDashboardEditMode();
    }

    function openSkillCardModal() {
        const modal = document.getElementById('skillCardModal');
        modal.style.display = 'flex';
        modal.classList.add('active');
        // Hide share button if Web Share API not available
        const shareBtn = document.getElementById('skillCardShareBtn');
        if (shareBtn) shareBtn.style.display = navigator.share ? 'block' : 'none';
        renderSkillCard();
    }

    function openQuickHelp(context) {
        try {
            const modal = document.getElementById('quickHelpModal');
            const titleEl = modal.querySelector('h3');
            const bodyEl = modal.querySelector('.modal-box > div:nth-child(2)');

            // Default content
            let title = '❓ Schnell-Hilfe';
            let html = '';

            if (context === 'entry') {
                title = '✍️ Hilfe: Eintrag erfassen';
                html = `
                    <p style="margin:0 0 8px 0;">So erstellst du einen Eintrag:</p>
                    <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                        <li>Wähle das Datum und den Typ (Arbeit / Schule / Urlaub / Krank).</li>
                        <li>Nutze die <strong>Jetzt</strong>-Buttons neben Start/Ende für die aktuelle Uhrzeit.</li>
                        <li>Oder gib Stunden manuell ein (z.B. 7.5).</li>
                        <li>Drücke <strong>Ctrl/Cmd+Enter</strong> zum schnellen Speichern.</li>
                    </ul>
                    <p style="margin:0; color:var(--text-muted);">Entwürfe werden automatisch gespeichert. Mit <em>Wiederherstellen</em> lädst du den Entwurf (danach wird er gelöscht).</p>
                `;
            } else if (context === 'timer') {
                title = '⏱️ Hilfe: Live Timer';
                html = `
                    <p style="margin:0 0 8px 0;">Der Live-Tracker misst deine Arbeitszeit:</p>
                    <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                        <li><strong>Ctrl + Space</strong> Timer starten/pausieren, <strong>Ctrl + Shift + Space</strong> Timer stoppen & speichern</li>
                        <li>Beim Stoppen kannst du die gemessene Zeit als Eintrag speichern.</li>
                        <li>Pausen werden automatisch erfasst und ggf. Mindestpausen abgezogen.</li>
                    </ul>
                    <p style="margin:0; color:var(--text-muted);">Tipp: Nutze den Timer für längere Sessions, und die Start/Ende-Felder für kurze Fix-Buchungen.</p>
                `;
            } else { // global or default - show page-specific help when possible
                const active = document.querySelector('.view-section.active');
                const aid = active ? active.id : null;

                switch(aid) {
                    case 'view-dashboard':
                        title = '📊 Hilfe: Dashboard';
                        html = `
                            <p style="margin:0 0 8px 0;">Das Dashboard zeigt deine wichtigsten Kennzahlen:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li><strong>Saldo & KPI</strong> - Überblick über Soll/Ist und Gleitzeit.</li>
                                <li><strong>Projektverteilung</strong> - Welche Projekte verbrauchen Zeit.</li>
                                <li><strong>Schnellaktionen</strong> - Direkt Timer starten oder Einträge anlegen.</li>
                            </ul>
                        `;
                        break;
                    case 'view-performance':
                        title = '📈 Hilfe: Performance';
                        html = `
                            <p style="margin:0 0 8px 0;">Hier findest du Analysen und Muster:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Trendlinien, Heatmaps und Projektverteilungen.</li>
                                <li>Nutze Filter, um Zeiträume oder Projekte einzugrenzen.</li>
                                <li>Klicke Diagramme für Detailinfos.</li>
                            </ul>
                        `;
                        break;
                    case 'view-prognose':
                        title = '🔮 Hilfe: Prognose & Planung';
                        html = `
                            <p style="margin:0 0 8px 0;">Plane deine nächsten Wochen und simuliere Saldo-Änderungen:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Markiere Tage als Urlaub/Schule/Krank und sieh sofort die Auswirkung.</li>
                                <li>Verwende verschiedene Szenarien, um das Jahresziel zu erreichen.</li>
                            </ul>
                        `;
                        break;
                    case 'view-ihk':
                        title = '🎓 Hilfe: IHK & Ausbildung';
                        html = `
                            <p style="margin:0 0 8px 0;">Alles rund um deine Ausbildung und Prüfungsdaten:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Trage Prüfungsdaten und Noten ein, um Fortschritt zu berechnen.</li>
                                <li>Die Sektion hilft bei Audit- und Nachweiszwecken.</li>
                            </ul>
                        `;
                        break;
                    case 'view-school':
                        title = '🏫 Hilfe: Berufsschule';
                        html = `
                            <p style="margin:0 0 8px 0;">Berufsschul- und Stundenverwaltung:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Automatische Erkennung von Schultagen und Zuordnung von Stunden.</li>
                                <li>Manuelle Einträge möglich für Sonderfälle.</li>
                            </ul>
                        `;
                        break;
                    case 'view-goals':
                        title = '🎯 Hilfe: Ziele';
                        html = `
                            <p style="margin:0 0 8px 0;">Setze persönliche Zeit- und Wochenziele:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Erstelle Zielvorgaben und verfolge den Fortschritt.</li>
                                <li>Nutze Prognosen, um Planabweichungen zu erkennen.</li>
                            </ul>
                        `;
                        break;
                    case 'view-yearview':
                    case 'view-monthcompare':
                        title = '📅 Hilfe: Jahres-/Monatsansicht';
                        html = `
                            <p style="margin:0 0 8px 0;">Zeige deine Leistung über längere Zeiträume:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Heatmaps und Monatsvergleiche für Trendanalyse.</li>
                                <li>Klicke auf Tage für Detailansichten.</li>
                            </ul>
                        `;
                        break;
                    case 'view-history':
                        title = '📜 Hilfe: Historie';
                        html = `
                            <p style="margin:0 0 8px 0;">Alle Einträge und Filteroptionen:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Filtern nach Datum, Projekt oder Typ.</li>
                                <li>Einträge bearbeiten oder exportieren.</li>
                            </ul>
                        `;
                        break;
                    case 'view-support':
                        title = '🛠️ Hilfe & Support';
                        html = `
                            <p style="margin:0 0 8px 0;">Support- und Kontaktoptionen:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li>Fehler melden, Feedback geben oder Dokumentation lesen.</li>
                            </ul>
                        `;
                        break;
                    default:
                        title = '❓ Schnell-Hilfe';
                        html = `
                            <p style="margin:0 0 8px 0;">Kurze Übersicht wichtiger Aktionen:</p>
                            <ul style="margin:0 0 12px 18px; color:var(--text-muted);">
                                <li><strong>S</strong> : Timer starten</li>
                                <li><strong>P</strong> : Timer pausieren</li>
                                <li><strong>E</strong> : Timer stoppen</li>
                                <li><strong>Ctrl/Cmd+Enter</strong> : Formular speichern</li>
                            </ul>
                            <p style="margin:0; color:var(--text-muted);">Klicke 'Tour starten' um die Einführung zu sehen.</p>
                        `;
                }
            }

            // Inject content into modal
            if (titleEl) titleEl.innerText = title;
            // Replace the second child (body) content inside modal-box
            const modalBox = document.querySelector('#quickHelpModal .modal-box');
            if (modalBox) {
                // Keep header and buttons, but replace the content area (which starts at index 1)
                // The structure is: modal-box > [header div, content div]
                const children = modalBox.children;
                if (children.length >= 2) {
                    children[1].innerHTML = html + `
                        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
                            <button class="btn" onclick="startOnboardingTour()">Tour starten</button>
                            <button class="btn btn-primary" onclick="closeQuickHelp()">Schließen</button>
                        </div>`;
                }
            }

            modal.classList.add('active');
        } catch (e) { console.warn('openQuickHelp error', e); }
    }

    function renderWeekDots() {
        const container = document.getElementById('weekDotsContainer');
        if (!container) return;
        
        const now = new Date();
        const currentDay = now.getDay(); // 0=So, 1=Mo, ..., 6=Sa
        const allDayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        
        // Get this week's Monday
        const monday = new Date(now);
        const diff = currentDay === 0 ? -6 : 1 - currentDay;
        monday.setDate(monday.getDate() + diff);
        monday.setHours(0, 0, 0, 0);
        
        // Build list of work days this week (Mo-So, but only those with hours > 0)
        const workDays = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            const dayIndex = day.getDay(); // 0=So..6=Sa
            if ((data.settings.hours[dayIndex] || 0) > 0) {
                workDays.push({ date: day, name: allDayNames[dayIndex] });
            }
        }
        
        let html = '';
        for (let i = 0; i < workDays.length; i++) {
            const dateStr = toLocalISODate(workDays[i].date);
            
            const hasEntry = data.entries.some(e => e.date === dateStr);
            const isToday = dateStr === toLocalISODate(now);
            
            const classes = ['week-dot'];
            if (hasEntry) classes.push('filled');
            if (isToday) classes.push('today');
            
            html += `<div style="text-align:center;">
                <div class="${classes.join(' ')}" title="${workDays[i].name}: ${hasEntry ? 'Eingetragen' : 'Kein Eintrag'}"></div>
                <div class="week-dot-label">${workDays[i].name}</div>
            </div>`;
        }
        container.innerHTML = html;
    }

    function calculateStreak() {
        if (!data.entries || data.entries.length === 0) return { current: 0, best: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Alle Eintrags-Daten (unique) an Arbeitstagen, sortiert newest→oldest
        const entryDates = [...new Set(data.entries.map(e => {
            const d = new Date(e.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }))].filter(ts => {
            const dow = new Date(ts).getDay();
            return dow !== 0 && dow !== 6;
        }).sort((a, b) => b - a).map(ts => new Date(ts));

        if (entryDates.length === 0) return { current: 0, best: 0 };

        // Best Streak (all time): längste Kette aufeinanderfolgender Arbeitstage
        let bestStreak = 1;
        let tempStreak = 1;
        for (let i = 0; i < entryDates.length - 1; i++) {
            if (isConsecutiveWorkDay(entryDates[i], entryDates[i + 1])) {
                tempStreak++;
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                tempStreak = 1;
            }
        }

        // Current Streak: muss von heute oder letztem Arbeitstag starten
        const lastWorkday = getLastWorkday(today);
        const newestEntry = entryDates[0];
        let currentStreak = 0;

        if (newestEntry.getTime() === today.getTime() || newestEntry.getTime() === lastWorkday.getTime()) {
            currentStreak = 1;
            for (let i = 0; i < entryDates.length - 1; i++) {
                if (isConsecutiveWorkDay(entryDates[i], entryDates[i + 1])) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }

        return { current: currentStreak, best: Math.max(bestStreak, currentStreak) };
    }

    function calculatePositiveWeeks() {
        const weeklyDiffs = {};
        data.entries.forEach(e => {
            const date = new Date(e.date);
            const year = date.getFullYear();
            const week = getWeek(date);
            const key = `${year}-${week}`;
            
            if (!weeklyDiffs[key]) {
                weeklyDiffs[key] = 0;
            }
            weeklyDiffs[key] += e.diff;
        });
        
        return Object.values(weeklyDiffs).filter(diff => diff > 0.5).length; // Mehr als 0.5h im Plus zählen
    }

