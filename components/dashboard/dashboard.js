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
        const dateStr = document.getElementById('inpDate').value;
        const type = document.getElementById('inpType').value;
        const start = document.getElementById('inpStart').value;
        const end = document.getElementById('inpEnd').value;
        const direct = document.getElementById('inpHours').value;

        // Pausen-Override: leer = Auto (Wochentag-Einstellung), Zahl (auch 0) = exakt diese Pause für diesen Eintrag
        const breakOverrideEl = document.getElementById('inpBreak');
        const breakOverrideRaw = breakOverrideEl ? breakOverrideEl.value.trim() : '';
        const hasBreakOverride = breakOverrideRaw !== '' && !isNaN(parseFloat(breakOverrideRaw));
        const breakOverride = hasBreakOverride ? Math.max(0, parseFloat(breakOverrideRaw)) : null;

        // NEU: Projekt & Info/Notiz
        const project = document.getElementById('inpProject').value.trim(); 
        const notes = document.getElementById('inpNotes').value.trim();

        if(!dateStr) { shakeInputError('inpDate'); return; }

        // Custom Fields einsammeln + Pflichtfelder prüfen (bevor irgendetwas gespeichert wird)
        const cfResult = (typeof collectEntryCustomFieldValues === 'function')
            ? collectEntryCustomFieldValues() : { ok: true, values: {} };
        if (!cfResult.ok) {
            showCustomMessage('Pflichtfeld fehlt', `„${cfResult.missing}" muss ausgefüllt werden`, 'error');
            return;
        }

        const date = new Date(dateStr);
        let worked = 0;
        let dayIndex = date.getDay();
        // Job für diesen Eintrag (Dropdown; default 'primary'). Soll/Pause kommen vom Job.
        const entryJobId = (typeof getFormJobId === 'function') ? getFormJobId() : 'primary';
        let expected = (typeof getJobHours === 'function') ? getJobHours(entryJobId, dayIndex) : (data.settings.hours[dayIndex] || 0);

        // Split-Shift / Wiederanmeldung: Wenn der Tag für DIESEN JOB schon einen Eintrag hat,
        // der das Tagessoll trägt (expected > 0), darf ein WEITERER Arbeits-Eintrag NICHT nochmal
        // das volle Soll abziehen — sonst kippt der Saldo (z.B. -8,3h für 30 Min "Nacharbeit").
        // Der zweite Block zählt dann als reine Zusatz-Arbeitszeit (expected 0 → diff = worked).
        const dayAlreadyCounted = (Array.isArray(data.entries) ? data.entries : []).some(function(e) {
            const ejob = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary';
            return e && e.date === dateStr && e.id !== editId && ejob === entryJobId && (parseFloat(e.expected) || 0) > 0;
        });

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
                
                // Hole Pausenzeit für diesen Wochentag (aus dem gewählten Job)
                const jobBreak = (typeof getJobBreak === 'function') ? getJobBreak(entryJobId) : data.settings.break;
                const breakMinutesForDay = Array.isArray(jobBreak.min)
                    ? jobBreak.min[dayIndex]
                    : jobBreak.min; // Fallback für alte Daten

                if(hasBreakOverride) {
                    // User hat die tatsächliche Pause manuell gesetzt → exakt abziehen, Schwelle ignorieren
                    breakMinutes = breakOverride;
                    hoursDiff -= (breakMinutes / 60);
                    info = breakMinutes > 0
                        ? `${start} - ${end} (${breakMinutes}m Pause) | ${info}`
                        : `${start} - ${end} (keine Pause) | ${info}`;
                } else if(jobBreak.thresh > 0 && hoursDiff >= jobBreak.thresh) {
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

                 // Hole Pausenzeit für diesen Wochentag (aus dem gewählten Job)
                 const jobBreakT = (typeof getJobBreak === 'function') ? getJobBreak(entryJobId) : data.settings.break;
                 const breakMinutesForDay = Array.isArray(jobBreakT.min)
                    ? jobBreakT.min[dayIndex]
                    : jobBreakT.min; // Fallback für alte Daten

                 // Automatischer Abzug der Mindestpause (falls Timer-Pausen < Mindestpause)
                 const minBreakRequired = breakMinutesForDay;
                 const timerBreakMinutes = timer.breakTime / 60000;

                 if (h * 60 >= jobBreakT.thresh * 60 && timerBreakMinutes < minBreakRequired) {
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

            // Zusatz-Block am selben Tag → Soll nur einmal zählen (siehe dayAlreadyCounted oben)
            if (dayAlreadyCounted) {
                expected = 0;
                info = `${info} | ↪ Zusatzzeit (Soll bereits gezählt)`.replace(/^ \| /, '');
                const enMsg = document.documentElement.lang === 'en';
                showCustomMessage(
                    enMsg ? 'ℹ️ Additional time' : 'ℹ️ Zusatzzeit',
                    enMsg
                        ? 'The daily target for this day is already covered by another entry. This entry counts as pure additional working time.'
                        : 'Für diesen Tag ist das Tagessoll bereits durch einen anderen Eintrag gezählt. Dieser Eintrag zählt als reine Zusatz-Arbeitszeit.',
                    'info'
                );
            }
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
        } else {
            // Custom-Type (user-definiert).
            // Akzeptiert: start+end (Zeitraum), manuelle Stunden, oder leer (worked=0 als Tag-Marker).
            const cInfo = (typeof getEntryTypeInfo === 'function') ? getEntryTypeInfo(type) : null;
            const cName = cInfo ? String(cInfo.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() : type;
            if (start && end) {
                shiftStart = start;
                shiftEnd = end;
                let d1 = new Date(`2000-01-01T${start}`);
                let d2 = new Date(`2000-01-01T${end}`);
                let hoursDiff = (d2 - d1) / 3.6e6;
                if (hoursDiff < 0) hoursDiff += 24;
                if (hasBreakOverride) { breakMinutes = breakOverride; hoursDiff -= (breakMinutes / 60); }
                worked = hoursDiff;
                info = `${cName} ${start}-${end} (${worked.toFixed(2)}h) | ${info}`;
            } else if (direct) {
                worked = parseFloat(direct) || 0;
                info = `${cName} (${worked.toFixed(2)}h) | ${info}`;
            } else {
                worked = 0;
                info = `${cName} | ${info}`;
            }
            // Wenn countsAsWork → wie Arbeit: diff = worked - expected. Sonst neutral (diff=0).
            if (cInfo && cInfo.countsAsWork === true && dayAlreadyCounted) {
                expected = 0; // Zusatz-Block am selben Tag → Soll nur einmal zählen
                info = `${info} | ↪ Zusatzzeit (Soll bereits gezählt)`.replace(/^ \| /, '');
            }
            diff = (cInfo && cInfo.countsAsWork === true) ? (worked - expected) : 0;
        }
        
        // Entferne führende '| ' wenn info leer war
        info = info.replace(/^ \| /, '').trim();

        const entry = {
            id: editId || Date.now(),
            date: dateStr, type, worked, expected,
            diff: diff,
            info,
            isPeriod: false,
            jobId: entryJobId,
            breakMins: breakMinutes,
            shiftStart: shiftStart,
            shiftEnd: shiftEnd,
            start: shiftStart,
            end: shiftEnd,
            endIsRaw: true,
            shiftWarning: shiftWarning,
            project: project, // NEU: Projekt/Kunde
            customFieldValues: cfResult.values, // NEU: User-definierte Custom Fields
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
        try { dedupeDayExpected(); } catch(e) {}
        save();

        // Nur Kategorien zaehlen — nie Zeiten, Projekte oder Notizen
        if (typeof mwlEvent === 'function') {
            mwlEvent(editId ? 'entry_updated' : 'entry_created', {
                entry_type: type,
                source: start && end ? 'zeitspanne' : (direct ? 'manuell' : 'timer'),
            });
        }

        // Mood Selector nach Eintrag (nur wenn aktiviert)
        if (!editId && data.settings.moodSelectorEnabled !== false) {
            openMoodSelector(entry.id);
        }
        
        // Formularfelder leeren
        document.getElementById('inpStart').value = '';
        document.getElementById('inpEnd').value = '';
        document.getElementById('inpHours').value = '';
        const inpBreakClr = document.getElementById('inpBreak'); if (inpBreakClr) inpBreakClr.value = '';
        document.getElementById('inpProject').value = ''; // NEU
        document.getElementById('inpNotes').value = ''; // NEU
        if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields(false); // Custom Fields leeren
        if (typeof toggleEntryDetails === 'function') toggleEntryDetails(false);
        if (typeof updateEntryDuration === 'function') updateEntryDuration();
        try { if (typeof clearDraft === 'function') clearDraft(); else localStorage.removeItem('mwl_entry_draft'); } catch(e) { /* ignore */ }
        
        // Neu laden der Historie, falls gerade aktiv
        if (document.getElementById('view-history').classList.contains('active')) {
             renderHistoryView();
        }
        // Neu laden der Ziele
        renderGoalsView();
    }

    function resetEdit() {
        editId = null;
        const mainBtnLbl = document.getElementById('mainBtnLabel');
        if (mainBtnLbl) mainBtnLbl.innerText = (document.documentElement.lang === 'en') ? 'Save entry' : 'Eintrag speichern';
        else document.getElementById('mainBtn').innerText = "Eintrag speichern";
        document.getElementById('cancelBtn').style.display = "none";
        document.getElementById('inpStart').value = '';
        document.getElementById('inpEnd').value = '';
        document.getElementById('inpHours').value = '';
        const inpBreakReset = document.getElementById('inpBreak'); if (inpBreakReset) inpBreakReset.value = '';
        try { if (typeof resetJobSelection === 'function') resetJobSelection(); } catch(e) {}
        document.getElementById('inpProject').value = ''; // NEU
        document.getElementById('inpNotes').value = ''; // NEU
        if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields(false); // Custom Fields leeren
        if (typeof toggleEntryDetails === 'function') toggleEntryDetails(false);
        if (typeof updateEntryDuration === 'function') updateEntryDuration();
    }

    // Trägt ein Eintrag das Tagessoll wie ein Arbeitstag? (Arbeit + Custom-Types mit countsAsWork)
    function entryCarriesDaySoll(e) {
        if (!e) return false;
        if (e.type === 'work') return true;
        if (typeof e.type === 'string' && e.type.indexOf('custom-') === 0) {
            const ci = (typeof getEntryTypeInfo === 'function') ? getEntryTypeInfo(e.type) : null;
            return !!(ci && ci.countsAsWork === true);
        }
        return false;
    }

    // Split-Shift-Normalisierung: Pro Kalendertag darf das Tagessoll (expected) NUR EINMAL
    // abgezogen werden. Hat ein Tag mehrere Arbeits-Einträge, die alle das volle Soll tragen
    // (z.B. Hauptschicht + kurzer Nacharbeits-Block nach Wiederanmeldung), behält der Haupt-
    // Eintrag (frühester Start, sonst größte Ist-Zeit) das Soll — die übrigen zählen als reine
    // Zusatzzeit (expected 0 → diff = worked). Repariert auch ALTBESTAND beim App-Start.
    // Rein subtraktiv & idempotent: fügt nie ein Soll hinzu, ändert keine Urlaub/Krank/Feiertag-Einträge.
    function dedupeDayExpected() {
        if (!Array.isArray(data.entries)) return false;
        // Gruppierung pro (Tag + Job): jeder Job zählt sein Tagessoll einmal pro Tag.
        const byDate = {};
        data.entries.forEach(function(e) {
            if (e && e.date) {
                const jid = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary';
                const key = e.date + '|' + jid;
                (byDate[key] = byDate[key] || []).push(e);
            }
        });
        let changed = false;
        Object.keys(byDate).forEach(function(d) {
            const carriers = byDate[d].filter(function(e) { return (parseFloat(e.expected) || 0) > 0; });
            if (carriers.length < 2) return;
            // Nur automatisch dedupen, wenn ALLE Soll-Träger arbeits-artig sind
            // (Urlaub/Krank/Feiertag/Gleittag-Logik nicht anfassen).
            if (!carriers.every(entryCarriesDaySoll)) return;
            carriers.sort(function(a, b) {
                const sa = a.shiftStart || a.start || '99:99';
                const sb = b.shiftStart || b.start || '99:99';
                if (sa !== sb) return sa < sb ? -1 : 1;
                return (parseFloat(b.worked) || 0) - (parseFloat(a.worked) || 0);
            });
            for (let i = 1; i < carriers.length; i++) {
                const e = carriers[i];
                e.expected = 0;
                e.diff = (parseFloat(e.worked) || 0);
                e.timestamp = Date.now();
                changed = true;
            }
        });
        return changed;
    }

    function timerAction(act) {
        const now = Date.now();
        if (typeof mwlEvent === 'function') mwlEvent('timer_action', { action: act });
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
            let daySaldo = 0;
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
                    if (hours > 0) {
                        dayHasWork = true;
                        daySaldo += (typeof e.diff === 'number' ? e.diff : (hours - (e.expected ?? (data.settings.hours[new Date(dateStr).getDay()] || 0))));
                    }
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
                stats.saldo += daySaldo;
                stats.dailyDiffs.push(daySaldo);
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
                week = { weekNum: weekNum, entries: 0, hours: 0, saldo: 0 };
                stats.weeks.push(week);
            }
            if (dayHasWork) { week.entries += 1; week.saldo += daySaldo; }
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

    // Optionale Detail-Felder (Pause/Stunden/Projekt/Notiz) ein-/ausklappen.
    // force===true/false erzwingt Zustand; ohne Argument wird umgeschaltet.
    function toggleEntryDetails(force) {
        const details = document.getElementById('entryDetails');
        const toggle = document.getElementById('entryMoreToggle');
        if (!details) return;
        const willOpen = (typeof force === 'boolean') ? force : !details.classList.contains('is-open');
        details.classList.toggle('is-open', willOpen);
        if (toggle) toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }

    // Live-Vorschau der Netto-Arbeitszeit (Start→Ende minus Pause), spiegelt exakt
    // die Buchungslogik aus handleEntry(). Nur bei Zeit-Typen (Arbeit/Custom).
    function updateEntryDuration() {
        const badge = document.getElementById('entryDurationBadge');
        if (!badge) return;
        function setEmpty() { badge.textContent = '–'; badge.classList.add('is-empty'); }
        try {
            const type = document.getElementById('inpType').value;
            const isCustom = String(type).startsWith('custom-');
            if (!(type === 'work' || isCustom)) { setEmpty(); return; }
            const start = document.getElementById('inpStart').value;
            const end = document.getElementById('inpEnd').value;
            if (!start || !end) { setEmpty(); return; }
            let h = (new Date('2000-01-01T' + end) - new Date('2000-01-01T' + start)) / 3.6e6;
            if (isNaN(h)) { setEmpty(); return; }
            if (h < 0) h += 24;
            const dateStr = document.getElementById('inpDate').value;
            const dayIndex = dateStr ? new Date(dateStr).getDay() : new Date().getDay();
            const jid = (typeof getFormJobId === 'function') ? getFormJobId() : 'primary';
            const brk = (typeof getJobBreak === 'function') ? getJobBreak(jid) : (data.settings && data.settings.break);
            const brkOvEl = document.getElementById('inpBreak');
            const brkOvRaw = brkOvEl ? brkOvEl.value.trim() : '';
            let breakMin = 0;
            if (brkOvRaw !== '' && !isNaN(parseFloat(brkOvRaw))) {
                breakMin = Math.max(0, parseFloat(brkOvRaw));
            } else if (brk && brk.thresh > 0 && h >= brk.thresh) {
                breakMin = Array.isArray(brk.min) ? (brk.min[dayIndex] || 0) : (brk.min || 0);
            }
            let net = h - breakMin / 60;
            if (net < 0) net = 0;
            let hh = Math.floor(net);
            let mm = Math.round((net - hh) * 60);
            if (mm === 60) { hh++; mm = 0; }
            if (hh === 0 && mm === 0) { setEmpty(); return; }
            badge.textContent = (mm === 0) ? (hh + 'h') : (hh + 'h ' + (mm < 10 ? '0' + mm : mm) + 'm');
            badge.classList.remove('is-empty');
        } catch (e) { setEmpty(); }
    }

    function toggleTimeInputs() {
        const t = document.getElementById('inpType').value;
        const els = [document.getElementById('inpStart'), document.getElementById('inpEnd')];
        // Time-Inputs aktiv für 'work' UND für Custom-Types (User trackt z.B. 17:00–18:00 Fitness).
        const isCustom = String(t).startsWith('custom-');
        const disableTime = !(t === 'work' || isCustom);
        els.forEach(e => e.disabled = disableTime);
        // Manuelle Stunden für alles außer Tages-Pauschalen (Urlaub/Krank/Gleittag/Feiertag).
        document.getElementById('inpHours').disabled = (t === 'gleittag' || t === 'vacation' || t === 'sick' || t === 'holiday');

        // Pausen-Override nur bei Zeit-Typen (Arbeit/Custom) sinnvoll
        const inpBreakEl = document.getElementById('inpBreak');
        if (inpBreakEl) {
            inpBreakEl.disabled = disableTime;
            // Ganzes Feld (Label + Input) ein-/ausblenden, damit kein Waisen-Label bleibt.
            const breakWrap = document.getElementById('breakFieldWrap');
            (breakWrap || inpBreakEl).style.display = disableTime ? 'none' : '';
        }
        // Job-Auswahl nur bei Zeit-Typen (und nur wenn mehrere Jobs existieren)
        try {
            if (typeof populateJobSelect === 'function') populateJobSelect();
            const jobRow = document.getElementById('jobSelectRow');
            if (jobRow) {
                const multi = (typeof hasMultipleJobs === 'function') && hasMultipleJobs();
                jobRow.style.display = (!disableTime && multi) ? '' : 'none';
            }
        } catch (e) {}
        updateBreakPlaceholder();

        // Hint-Banner für Multi-Day-Buchung nur bei Urlaub anzeigen
        const hint = document.getElementById('vacationMultiHint');
        if (hint) hint.style.display = (t === 'vacation') ? 'flex' : 'none';
    }

    // Placeholder des Pausen-Felds zeigt die automatische Pause für den gewählten Wochentag,
    // damit klar ist, was passiert, wenn man das Feld leer lässt.
    function updateBreakPlaceholder() {
        const inpBreakEl = document.getElementById('inpBreak');
        if (!inpBreakEl) return;
        try {
            const dateStr = document.getElementById('inpDate').value;
            const dayIndex = dateStr ? new Date(dateStr).getDay() : new Date().getDay();
            const jid = (typeof getFormJobId === 'function') ? getFormJobId() : 'primary';
            const brk = (typeof getJobBreak === 'function') ? getJobBreak(jid) : (data.settings && data.settings.break);
            const autoMin = brk ? (Array.isArray(brk.min) ? brk.min[dayIndex] : brk.min) : 0;
            const thresh = brk ? brk.thresh : 0;
            const en = document.documentElement.lang === 'en';
            if (autoMin > 0 && thresh > 0) {
                inpBreakEl.placeholder = en
                    ? `Break automatic: ${autoMin} min (from ${thresh}h)`
                    : `Pause automatisch: ${autoMin} Min (ab ${thresh}h)`;
            } else {
                inpBreakEl.placeholder = en ? 'Break automatic: none' : 'Pause automatisch: keine';
            }
        } catch (e) {
            inpBreakEl.placeholder = document.documentElement.lang === 'en' ? 'Break automatic (min)' : 'Pause automatisch (Min)';
        }
        if (typeof updateEntryDuration === 'function') updateEntryDuration();
    }

    // ═══ NEW: Saldo-Korrektur (Gleitzeit manuell anpassen) ═══
    // Roher Gesamt-Saldo = Summe aller e.diff (ohne Rundung – für exakte Korrektur-Mathematik)
    function getRawSaldo() {
        return (Array.isArray(data.entries) ? data.entries : []).reduce(function (s, e) { return s + (parseFloat(e.diff) || 0); }, 0);
    }

    function fmtSaldoHM(h) {
        var sign = h < 0 ? '−' : '+';
        var a = Math.abs(h);
        var hh = Math.floor(a);
        var mm = Math.round((a - hh) * 60);
        if (mm === 60) { hh++; mm = 0; }
        return sign + hh + 'h ' + mm + 'm';
    }

    function openSaldoAdjust() {
        var raw = getRawSaldo();
        var today = new Date().toISOString().split('T')[0];

        var modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'saldoAdjustModal';
        modal.style.zIndex = '100000';

        modal.innerHTML =
        '<style>' +
        '.sadj-box{width:460px;max-width:calc(100vw - 32px);max-height:92vh;overflow-y:auto;background:#111118;border:1px solid var(--border-default,rgba(255,255,255,.08));border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.55);animation:bcsUp .28s cubic-bezier(.16,1,.3,1)}' +
        '@keyframes bcsUp{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
        '.sadj-head{position:relative;padding:20px 22px;border-bottom:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.sadj-head h2{margin:0;font-size:1.05rem;font-weight:700;color:var(--text-main)}' +
        '.sadj-head p{margin:3px 0 0;font-size:.78rem;color:var(--text-muted)}' +
        '.sadj-x{position:absolute;top:16px;right:16px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid var(--border-subtle,rgba(255,255,255,.06));border-radius:8px;color:var(--text-muted);cursor:pointer;transition:all .2s}' +
        '.sadj-x:hover{background:rgba(255,255,255,.09);color:var(--text-main)}' +
        '.sadj-body{padding:20px 22px;display:flex;flex-direction:column;gap:18px}' +
        '.sadj-current{text-align:center;padding:16px;border-radius:12px;background:rgba(var(--primary-rgb),.06);border:1px solid rgba(var(--primary-rgb),.14)}' +
        '.sadj-current small{display:block;font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:5px}' +
        '.sadj-current b{font-size:1.7rem;font-weight:800;font-family:var(--font-mono,monospace);color:var(--text-main)}' +
        '.sadj-label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:9px;display:block}' +
        '.sadj-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:7px}' +
        '.sadj-seg button{padding:10px;border:1px solid var(--border-subtle,rgba(255,255,255,.07));background:rgba(255,255,255,.02);border-radius:10px;color:var(--text-muted);font-size:.82rem;font-weight:600;cursor:pointer;transition:all .18s}' +
        '.sadj-seg button:hover{background:rgba(255,255,255,.05);color:var(--text-main)}' +
        '.sadj-seg button.on{border-color:var(--primary);background:rgba(var(--primary-rgb),.12);color:var(--text-main)}' +
        '.sadj-seg button.on.neg{border-color:var(--danger);background:rgba(239,68,68,.14);color:#fca5a5}' +
        '.sadj-seg button.on.pos{border-color:var(--success);background:rgba(16,185,129,.14);color:#6ee7b7}' +
        '.sadj-field label{display:block;font-size:.78rem;font-weight:600;color:var(--text-main);margin-bottom:6px}' +
        '.sadj-inp{width:100%;padding:11px 13px;border-radius:10px;border:1px solid var(--border-default,rgba(255,255,255,.1));background:rgba(255,255,255,.03);color:var(--text-main);font-size:.95rem;font-family:var(--font-mono,monospace);outline:none;transition:box-shadow .18s,border-color .18s}' +
        '.sadj-inp:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(var(--primary-rgb),.2)}' +
        '.sadj-inp::-webkit-inner-spin-button{opacity:.5}' +
        '.sadj-hm{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
        '.sadj-note{font-family:var(--font-main,inherit)}' +
        '.sadj-result{padding:14px 16px;border-radius:12px;background:rgba(255,255,255,.02);border:1px dashed var(--border-default,rgba(255,255,255,.12));display:flex;flex-direction:column;gap:6px}' +
        '.sadj-result .r1{display:flex;justify-content:space-between;align-items:center;font-size:.82rem;color:var(--text-muted)}' +
        '.sadj-result .r1 b{font-family:var(--font-mono,monospace);font-size:.95rem}' +
        '.sadj-result .rnew{display:flex;justify-content:space-between;align-items:center;font-size:.9rem;font-weight:700;color:var(--text-main);padding-top:6px;border-top:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.sadj-result .rnew b{font-family:var(--font-mono,monospace);font-size:1.15rem}' +
        '.sadj-foot{display:flex;gap:10px;align-items:center;padding:15px 22px;border-top:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.sadj-btn{padding:10px 18px;border-radius:9px;font-size:.86rem;font-weight:600;cursor:pointer;transition:all .18s;border:1px solid transparent}' +
        '.sadj-btn.ghost{background:rgba(255,255,255,.05);border-color:var(--border-default,rgba(255,255,255,.1));color:var(--text-main)}.sadj-btn.ghost:hover{background:rgba(255,255,255,.1)}' +
        '.sadj-btn.primary{background:var(--primary);color:#fff;box-shadow:0 4px 14px rgba(var(--primary-rgb),.32)}.sadj-btn.primary:hover{filter:brightness(1.08)}' +
        '.sadj-btn.primary:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}' +
        '.sadj-hide{display:none}' +
        '[data-theme="light"] .sadj-box{background:#fff;border-color:rgba(0,0,0,.08)}' +
        '[data-theme="light"] .sadj-head,[data-theme="light"] .sadj-foot{border-color:rgba(0,0,0,.07)}' +
        '[data-theme="light"] .sadj-x,[data-theme="light"] .sadj-seg button,[data-theme="light"] .sadj-inp,[data-theme="light"] .sadj-result{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.1)}' +
        '[data-theme="light"] .sadj-btn.ghost{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.12)}' +
        '</style>' +
        '<div class="sadj-box">' +
            '<div class="sadj-head"><h2>Saldo anpassen</h2><p>Manuelle Korrektur, z.B. Angleichung ans Firmen-System</p>' +
                '<button class="sadj-x" onclick="document.getElementById(\'saldoAdjustModal\').remove()" title="Schließen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
            '</div>' +
            '<div class="sadj-body">' +
                '<div class="sadj-current"><small>Aktueller Saldo</small><b id="sadjCurrent">' + (raw >= 0 ? '+' : '') + raw.toFixed(2) + 'h</b></div>' +
                '<div><span class="sadj-label">Methode</span><div class="sadj-seg" id="sadjMode">' +
                    '<button data-mode="diff" class="on">Differenz</button><button data-mode="target">Ziel-Saldo</button>' +
                '</div></div>' +
                // Differenz-Panel
                '<div id="sadjDiffPanel">' +
                    '<div class="sadj-seg" id="sadjSign" style="margin-bottom:12px">' +
                        '<button data-sign="-1" class="on neg">− Abziehen</button><button data-sign="1">+ Hinzufügen</button>' +
                    '</div>' +
                    '<div class="sadj-hm">' +
                        '<div class="sadj-field"><label>Stunden</label><input type="number" class="sadj-inp" id="sadjHours" min="0" step="1" placeholder="0" inputmode="numeric"></div>' +
                        '<div class="sadj-field"><label>Minuten</label><input type="number" class="sadj-inp" id="sadjMins" min="0" max="59" step="1" placeholder="0" inputmode="numeric"></div>' +
                    '</div>' +
                '</div>' +
                // Ziel-Panel
                '<div id="sadjTargetPanel" class="sadj-hide"><div class="sadj-field"><label>Neuer Soll-Saldo (Stunden)</label><input type="number" class="sadj-inp" id="sadjTarget" step="0.01" placeholder="z.B. 22.47" inputmode="decimal"></div></div>' +
                // Ergebnis
                '<div class="sadj-result">' +
                    '<div class="r1"><span>Korrektur-Buchung</span><b id="sadjCorr" style="color:var(--text-muted)">±0h 0m</b></div>' +
                    '<div class="rnew"><span>Neuer Saldo</span><b id="sadjNew">' + (raw >= 0 ? '+' : '') + raw.toFixed(2) + 'h</b></div>' +
                '</div>' +
                // Notiz + Datum
                '<div class="sadj-hm">' +
                    '<div class="sadj-field"><label>Notiz</label><input type="text" class="sadj-inp sadj-note" id="sadjNote" placeholder="Grund" value="Angleichung Firmen-System"></div>' +
                    '<div class="sadj-field"><label>Datum</label><input type="date" class="sadj-inp sadj-note" id="sadjDate" value="' + today + '"></div>' +
                '</div>' +
            '</div>' +
            '<div class="sadj-foot"><div style="flex:1"></div>' +
                '<button class="sadj-btn ghost" id="sadjCancel">Abbrechen</button>' +
                '<button class="sadj-btn primary" id="sadjSave" disabled>Buchen</button>' +
            '</div>' +
        '</div>';

        document.body.appendChild(modal);
        setupSaldoAdjust(modal, raw);
    }

    function setupSaldoAdjust(modal, raw) {
        var $ = function (id) { return modal.querySelector('#' + id); };
        var state = { mode: 'diff', sign: -1 };

        function correctionValue() {
            if (state.mode === 'target') {
                var t = parseFloat($('sadjTarget').value);
                if (isNaN(t)) return null;
                return t - raw;
            }
            var h = parseInt($('sadjHours').value, 10) || 0;
            var m = parseInt($('sadjMins').value, 10) || 0;
            var mag = h + m / 60;
            if (mag <= 0) return null;
            return state.sign * mag;
        }

        function refresh() {
            var corr = correctionValue();
            var corrEl = $('sadjCorr'), newEl = $('sadjNew'), saveBtn = $('sadjSave');
            if (corr === null || Math.abs(corr) < 0.0001) {
                corrEl.textContent = '±0h 0m';
                corrEl.style.color = 'var(--text-muted)';
                newEl.textContent = (raw >= 0 ? '+' : '') + raw.toFixed(2) + 'h';
                newEl.style.color = 'var(--text-main)';
                saveBtn.disabled = true;
                return;
            }
            var next = raw + corr;
            corrEl.textContent = fmtSaldoHM(corr) + '  (' + (corr >= 0 ? '+' : '') + corr.toFixed(2) + 'h)';
            corrEl.style.color = corr >= 0 ? 'var(--success)' : 'var(--danger)';
            newEl.textContent = (next >= 0 ? '+' : '') + next.toFixed(2) + 'h';
            newEl.style.color = next >= 0 ? 'var(--success)' : 'var(--danger)';
            saveBtn.disabled = false;
        }

        // Methode umschalten
        $('sadjMode').querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () {
                state.mode = b.getAttribute('data-mode');
                $('sadjMode').querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
                $('sadjDiffPanel').classList.toggle('sadj-hide', state.mode !== 'diff');
                $('sadjTargetPanel').classList.toggle('sadj-hide', state.mode !== 'target');
                refresh();
            });
        });
        // Vorzeichen
        $('sadjSign').querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () {
                state.sign = parseInt(b.getAttribute('data-sign'), 10);
                $('sadjSign').querySelectorAll('button').forEach(function (x) {
                    var on = x === b;
                    x.classList.toggle('on', on);
                    x.classList.toggle('neg', on && state.sign === -1);
                    x.classList.toggle('pos', on && state.sign === 1);
                });
                refresh();
            });
        });
        ['sadjHours', 'sadjMins', 'sadjTarget'].forEach(function (id) { $(id).addEventListener('input', refresh); });

        var close = function () { modal.remove(); };
        $('sadjCancel').addEventListener('click', close);
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        $('sadjSave').addEventListener('click', function () {
            var corr = correctionValue();
            if (corr === null || Math.abs(corr) < 0.0001) return;
            var note = ($('sadjNote').value || '').trim() || 'Saldo-Korrektur';
            var date = $('sadjDate').value || new Date().toISOString().split('T')[0];
            data.entries.push({
                id: Date.now(),
                date: date,
                type: 'korrektur',
                diff: Math.round(corr * 100) / 100,
                worked: 0,
                expected: 0,
                isPeriod: true,
                label: 'Korrektur: ' + note,
                info: note,
                breakMins: 0,
                shiftEnd: '',
                shiftWarning: false
            });
            save();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof createExplosion === 'function') createExplosion(window.innerWidth / 2, window.innerHeight / 2);
            if (typeof showCustomMessage === 'function') showCustomMessage('Gebucht', 'Saldo-Korrektur ' + fmtSaldoHM(corr) + ' verbucht.', 'success');
            modal.remove();
        });

        refresh();
        setTimeout(function () { $('sadjHours').focus(); }, 60);
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

    // ═══ Saldo-Trend: zentrale Defaults (spiegelt TREND_CHART_DEFAULTS aus charts.js) ═══
    function getTrendChartDefaults() {
        if (typeof TREND_CHART_DEFAULTS !== 'undefined') return Object.assign({}, TREND_CHART_DEFAULTS);
        return { type:'area-smooth', color:'var(--primary)', animation:true, animSpeed:2000, gradient:true, glow:true, glowIntensity:6, rainbow:false, blur:false, dots:false, marker:true, grid:true, zeroLine:true, lineWidth:2.5, lineStyle:'solid' };
    }
    function getTrendChartStyle() {
        var s = {};
        try { var raw = localStorage.getItem('mwl_chart_style'); if (raw) s = JSON.parse(raw) || {}; } catch (e) { s = {}; }
        return Object.assign(getTrendChartDefaults(), s);
    }

    // ═══ NEW: Modern Saldo-Trend Konfigurations-Modal ═══
    // seed (optional): Style zum Vorbelegen (z.B. Defaults beim Zurücksetzen) statt der
    // gespeicherten Settings. Wird NICHT persistiert bis der User „Speichern" klickt.
    function openChartStyleModal(seed) {
        var current = seed ? Object.assign(getTrendChartDefaults(), seed) : getTrendChartStyle();
        window.modalChartStyle = Object.assign({}, current);

        var typeMeta = [
            { id: 'line',        label: 'Linie',  svg: '<path d="M3 15l4-5 4 3 6-8"/>' },
            { id: 'area',        label: 'Fläche', svg: '<path d="M3 15l4-5 4 3 6-8"/><path d="M3 15l4-5 4 3 6-8V19H3Z" fill="currentColor" stroke="none" opacity=".22"/>' },
            { id: 'area-smooth', label: 'Smooth', svg: '<path d="M3 13c3 0 3-6 6-6s3 8 6 8 3-5 6-5"/>' },
            { id: 'bar',         label: 'Balken', svg: '<rect x="3" y="10" width="3.5" height="9" rx="1"/><rect x="10" y="5" width="3.5" height="14" rx="1"/><rect x="17" y="13" width="3.5" height="6" rx="1"/>' }
        ];
        var lineStyleMeta = [
            { id: 'solid',  label: 'Voll',       dash: '' },
            { id: 'dashed', label: 'Gestrichelt', dash: '6 5' },
            { id: 'dotted', label: 'Gepunktet',   dash: '1 6' }
        ];
        var colors = ['#a78bfa','#a855f7','#8b5cf6','#7c3aed','#6366f1','#4f46e5','#0ea5e9','#3b82f6','#06b6d4','#22d3ee','#10b981','#34d399','#06d6a0','#84cc16','#fbbf24','#f59e0b','#fb923c','#f97316','#ef4444','#f43f5e','#ec4899','#d946ef','#94a3b8','#ffffff'];

        var seg = function (metaArr, activeId, cls, extra) {
            return metaArr.map(function (m) {
                var on = activeId === m.id;
                return '<button type="button" class="tcs-seg' + (on ? ' on' : '') + '" data-' + cls + '="' + m.id + '">' + (extra ? extra(m) : m.label) + '</button>';
            }).join('');
        };

        var modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'chartStyleModal';
        modal.style.zIndex = '100000';

        modal.innerHTML =
        '<style>' +
        '.tcs-box{width:520px;max-width:calc(100vw - 32px);max-height:92vh;overflow-y:auto;background:#111118;border:1px solid var(--border-default,rgba(255,255,255,.08));border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.55);animation:bcsUp .28s cubic-bezier(.16,1,.3,1)}' +
        '@keyframes bcsUp{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
        '.tcs-head{position:relative;padding:20px 22px;border-bottom:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.tcs-head h2{margin:0;font-size:1.05rem;font-weight:700;color:var(--text-main);letter-spacing:-.01em}' +
        '.tcs-head p{margin:3px 0 0;font-size:.78rem;color:var(--text-muted)}' +
        '.tcs-x{position:absolute;top:16px;right:16px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid var(--border-subtle,rgba(255,255,255,.06));border-radius:8px;color:var(--text-muted);cursor:pointer;transition:all .2s}' +
        '.tcs-x:hover{background:rgba(255,255,255,.09);color:var(--text-main)}' +
        '.tcs-body{padding:18px 22px;display:flex;flex-direction:column;gap:20px}' +
        '.tcs-preview{border-radius:12px;overflow:hidden;border:1px solid var(--border-subtle,rgba(255,255,255,.06));background:rgba(0,0,0,.22)}' +
        '.tcs-preview #chartPreview{height:150px;position:relative}' +
        '.tcs-group-label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:11px;display:block}' +
        '.tcs-segrow{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:7px}' +
        '.tcs-seg{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:10px 6px;border:1px solid var(--border-subtle,rgba(255,255,255,.07));background:rgba(255,255,255,.02);border-radius:10px;color:var(--text-muted);font-size:.76rem;font-weight:600;cursor:pointer;transition:all .18s}' +
        '.tcs-seg:hover{background:rgba(255,255,255,.05);color:var(--text-main)}' +
        '.tcs-seg.on{border-color:var(--primary);background:rgba(var(--primary-rgb),.12);color:var(--text-main)}' +
        '.tcs-seg svg{width:22px;height:22px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}' +
        '.tcs-swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(30px,1fr));gap:7px}' +
        '.tcs-sw{aspect-ratio:1;border-radius:8px;cursor:pointer;border:2px solid transparent;transition:transform .15s,box-shadow .15s;position:relative}' +
        '.tcs-sw:hover{transform:scale(1.12)}' +
        '.tcs-sw.on{border-color:#fff;box-shadow:0 0 0 2px rgba(var(--primary-rgb),.5)}' +
        '.tcs-theme{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border-subtle,rgba(255,255,255,.07));background:rgba(255,255,255,.02);cursor:pointer;margin-bottom:9px;transition:all .18s}' +
        '.tcs-theme:hover{background:rgba(255,255,255,.05)}' +
        '.tcs-theme.on{border-color:var(--primary);background:rgba(var(--primary-rgb),.1)}' +
        '.tcs-theme .dot{width:24px;height:24px;border-radius:7px;background:var(--primary);flex:0 0 24px}' +
        '.tcs-theme b{font-size:.84rem;font-weight:600;color:var(--text-main)}' +
        '.tcs-theme small{display:block;font-size:.7rem;color:var(--text-muted)}' +
        '.tcs-row{display:flex;flex-direction:column;gap:9px}.tcs-row+.tcs-row{margin-top:14px}' +
        '.tcs-rowhead{display:flex;justify-content:space-between;align-items:center}' +
        '.tcs-rowhead label{font-size:.86rem;font-weight:600;color:var(--text-main)}' +
        '.tcs-val{font-size:.8rem;font-weight:700;color:var(--primary);font-family:var(--font-mono,monospace)}' +
        '.tcs-slider{width:100%;height:6px;border-radius:4px;background:rgba(var(--primary-rgb),.18);outline:none;-webkit-appearance:none;cursor:pointer}' +
        '.tcs-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--primary);cursor:pointer;border:3px solid #111118;box-shadow:0 0 0 1px rgba(var(--primary-rgb),.5)}' +
        '.tcs-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--primary);cursor:pointer;border:3px solid #111118}' +
        '.tcs-slider:disabled{opacity:.4;cursor:not-allowed}' +
        '.tcs-toggle{display:flex;align-items:center;gap:12px;padding:11px 13px;background:rgba(255,255,255,.02);border:1px solid var(--border-subtle,rgba(255,255,255,.06));border-radius:11px;cursor:pointer;transition:all .18s}' +
        '.tcs-toggle:hover{background:rgba(255,255,255,.045)}' +
        '.tcs-toggle+.tcs-toggle{margin-top:8px}' +
        '.tcs-toggle .ic{width:32px;height:32px;flex:0 0 32px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:rgba(var(--primary-rgb),.1);color:var(--primary)}' +
        '.tcs-toggle .ic svg{width:16px;height:16px;stroke:currentColor;stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round}' +
        '.tcs-toggle .txt{flex:1}.tcs-toggle .txt b{display:block;font-size:.86rem;font-weight:600;color:var(--text-main)}.tcs-toggle .txt small{font-size:.71rem;color:var(--text-muted)}' +
        '.tcs-switch{position:relative;width:42px;height:24px;flex:0 0 42px;border-radius:999px;background:rgba(255,255,255,.12);transition:background .2s}' +
        '.tcs-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.16,1,.3,1)}' +
        '.tcs-toggle input{position:absolute;opacity:0;width:0;height:0}' +
        '.tcs-toggle input:checked~.tcs-switch{background:var(--primary)}.tcs-toggle input:checked~.tcs-switch::after{transform:translateX(18px)}' +
        '.tcs-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
        '.tcs-foot{display:flex;gap:10px;align-items:center;padding:15px 22px;border-top:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.tcs-reset{font-size:.8rem;font-weight:600;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:8px 4px}.tcs-reset:hover{color:var(--text-main)}' +
        '.tcs-btn{padding:10px 18px;border-radius:9px;font-size:.86rem;font-weight:600;cursor:pointer;transition:all .18s;border:1px solid transparent}' +
        '.tcs-btn.ghost{background:rgba(255,255,255,.05);border-color:var(--border-default,rgba(255,255,255,.1));color:var(--text-main)}.tcs-btn.ghost:hover{background:rgba(255,255,255,.1)}' +
        '.tcs-btn.primary{background:var(--primary);color:#fff;box-shadow:0 4px 14px rgba(var(--primary-rgb),.32)}.tcs-btn.primary:hover{filter:brightness(1.08)}' +
        '.tcs-dim{transition:opacity .2s}' +
        // Desktop: breiteres Modal + 2-Spalten-Layout (Preview über volle Breite)
        '@media(min-width:760px){' +
          '.tcs-box{width:840px}' +
          '.tcs-body{display:grid;grid-template-columns:1fr 1fr;gap:22px 28px;align-items:start}' +
          '.tcs-preview{grid-column:1 / -1}' +
          '.tcs-preview #chartPreview{height:180px}' +
        '}' +
        '[data-theme="light"] .tcs-box{background:#fff;border-color:rgba(0,0,0,.08)}' +
        '[data-theme="light"] .tcs-head,[data-theme="light"] .tcs-foot{border-color:rgba(0,0,0,.07)}' +
        '[data-theme="light"] .tcs-x,[data-theme="light"] .tcs-seg,[data-theme="light"] .tcs-theme,[data-theme="light"] .tcs-toggle{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.08)}' +
        '[data-theme="light"] .tcs-preview{background:rgba(0,0,0,.03)}' +
        '[data-theme="light"] .tcs-switch{background:rgba(0,0,0,.18)}' +
        '[data-theme="light"] .tcs-slider::-webkit-slider-thumb,[data-theme="light"] .tcs-slider::-moz-range-thumb{border-color:#fff}' +
        '[data-theme="light"] .tcs-btn.ghost{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.12)}' +
        '</style>' +
        '<div class="tcs-box">' +
            '<div class="tcs-head">' +
                '<h2>Saldo Trend</h2><p>Diagramm-Stil, Effekte &amp; Animation anpassen</p>' +
                '<button class="tcs-x" onclick="document.getElementById(\'chartStyleModal\').remove()" title="Schließen"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
            '</div>' +
            '<div class="tcs-body">' +
                '<div class="tcs-preview"><div id="chartPreview"></div></div>' +
                '<div><span class="tcs-group-label">Diagramm-Typ</span><div class="tcs-segrow" id="tcsTypeRow">' +
                    seg(typeMeta, current.type, 'type', function (m) { return '<svg viewBox="0 0 24 24">' + m.svg + '</svg>' + m.label; }) +
                '</div></div>' +
                '<div><span class="tcs-group-label">Farbe</span>' +
                    '<button type="button" class="tcs-theme' + (current.color === 'var(--primary)' ? ' on' : '') + '" id="tcsThemeColor"><span class="dot"></span><span><b>Website-Farbe</b><small>Nutzt deinen Akzent aus den Einstellungen</small></span></button>' +
                    '<div class="tcs-swatches" id="tcsSwatches">' +
                        colors.map(function (c) { return '<button type="button" class="tcs-sw' + (current.color === c ? ' on' : '') + '" data-color="' + c + '" style="background:' + c + '" title="' + c + '"></button>'; }).join('') +
                    '</div>' +
                '</div>' +
                '<div><span class="tcs-group-label">Linie</span>' +
                    '<div class="tcs-row"><div class="tcs-rowhead"><label>Linienstärke</label><span class="tcs-val" id="tcsLwVal">' + current.lineWidth + 'px</span></div><input type="range" class="tcs-slider" id="tcsLw" min="1" max="5" step="0.5" value="' + current.lineWidth + '"></div>' +
                    '<div class="tcs-row"><div class="tcs-rowhead"><label>Linienstil</label></div><div class="tcs-segrow" id="tcsLineStyleRow">' +
                        seg(lineStyleMeta, current.lineStyle, 'linestyle', function (m) { return '<svg viewBox="0 0 40 12" style="width:40px;height:12px"><line x1="2" y1="6" x2="38" y2="6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"' + (m.dash ? ' stroke-dasharray="' + m.dash + '"' : '') + '/></svg>' + m.label; }) +
                    '</div></div>' +
                    '<div style="margin-top:14px"></div>' +
                    '<label class="tcs-toggle"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="8" r="1.6"/><circle cx="19" cy="14" r="1.6"/></svg></span><span class="txt"><b>Datenpunkte</b><small>Punkt an jedem Messwert</small></span><input type="checkbox" id="tcsDots"' + (current.dots ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                    '<label class="tcs-toggle"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="9" opacity=".4"/></svg></span><span class="txt"><b>Aktueller-Wert-Puls</b><small>Pulsierender Punkt am letzten Wert</small></span><input type="checkbox" id="tcsMarker"' + (current.marker !== false ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                '</div>' +
                '<div><span class="tcs-group-label">Effekte</span>' +
                    '<label class="tcs-toggle"><span class="ic"><svg viewBox="0 0 24 24"><path d="M3 18l6-7 4 3 8-9"/><path d="M3 18h18" opacity=".4"/></svg></span><span class="txt"><b>Flächen-Gradient</b><small>Farbverlauf unter der Linie (Fläche/Smooth)</small></span><input type="checkbox" id="tcsGradient"' + (current.gradient !== false ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                    '<label class="tcs-toggle"><span class="ic"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg></span><span class="txt"><b>Glow / Neon</b><small>Leuchtender Schein um die Linie</small></span><input type="checkbox" id="tcsGlow"' + (current.glow !== false ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                    '<div class="tcs-row tcs-dim" id="tcsGlowRow" style="margin-top:12px"><div class="tcs-rowhead"><label>Glow-Intensität</label><span class="tcs-val" id="tcsGiVal">' + current.glowIntensity + '</span></div><input type="range" class="tcs-slider" id="tcsGi" min="2" max="16" step="1" value="' + current.glowIntensity + '"></div>' +
                    '<label class="tcs-toggle" style="margin-top:12px"><span class="ic" style="background:linear-gradient(90deg,#ef4444,#f59e0b,#10b981,#06b6d4,#a855f7);color:#fff"><svg viewBox="0 0 24 24"><path d="M3 16a9 9 0 0118 0"/></svg></span><span class="txt"><b>Regenbogen</b><small>Animierter Farbverlauf auf der Linie</small></span><input type="checkbox" id="tcsRainbow"' + (current.rainbow ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                    '<label class="tcs-toggle"><span class="ic"><svg viewBox="0 0 24 24"><path d="M5 12h14M7 8h10M8 16h8" opacity=".7"/></svg></span><span class="txt"><b>Weichzeichnen</b><small>Verträumte, weiche Flächenfüllung</small></span><input type="checkbox" id="tcsBlur"' + (current.blur ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                '</div>' +
                '<div><span class="tcs-group-label">Raster &amp; Achsen</span><div class="tcs-grid2">' +
                    '<label class="tcs-toggle" style="margin:0"><span class="txt"><b>Gitternetz</b></span><input type="checkbox" id="tcsGrid"' + (current.grid !== false ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                    '<label class="tcs-toggle" style="margin:0"><span class="txt"><b>Nulllinie</b></span><input type="checkbox" id="tcsZero"' + (current.zeroLine !== false ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                '</div></div>' +
                '<div><span class="tcs-group-label">Animation</span>' +
                    '<label class="tcs-toggle"><span class="ic"><svg viewBox="0 0 24 24"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg></span><span class="txt"><b>Animation</b><small>Linie/Balken beim Laden aufbauen</small></span><input type="checkbox" id="tcsAnim"' + (current.animation !== false ? ' checked' : '') + '><span class="tcs-switch"></span></label>' +
                    '<div class="tcs-row tcs-dim" id="tcsSpeedRow" style="margin-top:12px"><div class="tcs-rowhead"><label>Tempo</label><span class="tcs-val" id="tcsSpVal"></span></div><input type="range" class="tcs-slider" id="tcsSp" min="600" max="4000" step="100" value="' + current.animSpeed + '"></div>' +
                '</div>' +
            '</div>' +
            '<div class="tcs-foot">' +
                '<button class="tcs-reset" id="tcsReset">Zurücksetzen</button><div style="flex:1"></div>' +
                '<button class="tcs-btn ghost" id="tcsCancel">Abbrechen</button>' +
                '<button class="tcs-btn primary" id="tcsSave">Speichern</button>' +
            '</div>' +
        '</div>';

        document.body.appendChild(modal);
        setupTrendChartModal(modal);
    }

    function setupTrendChartModal(modal) {
        var $ = function (id) { return modal.querySelector('#' + id); };
        var s = window.modalChartStyle;

        var speedLabel = function (ms) { return (ms <= 1000 ? 'Schnell' : ms >= 3000 ? 'Langsam' : 'Normal') + ' · ' + ms + 'ms'; };
        var preview = function () { if (typeof updateChartStylePreview === 'function') updateChartStylePreview(window.modalChartStyle); };

        function refreshDim() {
            $('tcsGlowRow').style.opacity = s.glow ? '1' : '.4'; $('tcsGi').disabled = !s.glow;
            $('tcsSpeedRow').style.opacity = s.animation ? '1' : '.4'; $('tcsSp').disabled = !s.animation;
            $('tcsSpVal').textContent = speedLabel(s.animSpeed);
        }

        // Diagramm-Typ (segmented)
        $('tcsTypeRow').querySelectorAll('[data-type]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                s.type = btn.getAttribute('data-type');
                $('tcsTypeRow').querySelectorAll('.tcs-seg').forEach(function (b) { b.classList.toggle('on', b === btn); });
                preview();
            });
        });
        // Linienstil (segmented)
        $('tcsLineStyleRow').querySelectorAll('[data-linestyle]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                s.lineStyle = btn.getAttribute('data-linestyle');
                $('tcsLineStyleRow').querySelectorAll('.tcs-seg').forEach(function (b) { b.classList.toggle('on', b === btn); });
                preview();
            });
        });
        // Farbe – Website-Farbe + Swatches
        var paintColor = function () {
            $('tcsThemeColor').classList.toggle('on', s.color === 'var(--primary)');
            $('tcsSwatches').querySelectorAll('.tcs-sw').forEach(function (sw) { sw.classList.toggle('on', sw.getAttribute('data-color') === s.color); });
        };
        $('tcsThemeColor').addEventListener('click', function () { s.color = 'var(--primary)'; paintColor(); preview(); });
        $('tcsSwatches').querySelectorAll('.tcs-sw').forEach(function (sw) {
            sw.addEventListener('click', function () { s.color = sw.getAttribute('data-color'); paintColor(); preview(); });
        });

        // Slider: Linienstärke / Glow-Intensität / Tempo
        $('tcsLw').addEventListener('input', function () { s.lineWidth = parseFloat(this.value); $('tcsLwVal').textContent = this.value + 'px'; preview(); });
        $('tcsGi').addEventListener('input', function () { s.glowIntensity = parseInt(this.value, 10); $('tcsGiVal').textContent = this.value; preview(); });
        $('tcsSp').addEventListener('input', function () { s.animSpeed = parseInt(this.value, 10); $('tcsSpVal').textContent = speedLabel(s.animSpeed); preview(); });

        // Toggles
        var wireToggle = function (id, key, onChange) {
            $(id).addEventListener('change', function () {
                s[key] = this.checked;
                if (onChange) onChange(this.checked);
                preview();
            });
        };
        wireToggle('tcsDots', 'dots');
        wireToggle('tcsMarker', 'marker');
        wireToggle('tcsGradient', 'gradient');
        wireToggle('tcsGlow', 'glow', refreshDim);
        wireToggle('tcsBlur', 'blur');
        wireToggle('tcsGrid', 'grid');
        wireToggle('tcsZero', 'zeroLine');
        wireToggle('tcsAnim', 'animation', refreshDim);
        $('tcsRainbow').addEventListener('change', function () {
            s.rainbow = this.checked;
            if (this.checked && typeof createConfetti === 'function') createConfetti(window.innerWidth / 2, window.innerHeight / 3, 18);
            preview();
        });

        // Reset: Modal mit Defaults neu aufbauen (noch nicht gespeichert)
        $('tcsReset').addEventListener('click', function () {
            modal.remove();
            openChartStyleModal(getTrendChartDefaults());
        });

        // Abbrechen / Backdrop
        var close = function () { modal.remove(); };
        $('tcsCancel').addEventListener('click', close);
        modal.addEventListener('click', function (e) { if (e.target === modal) close(); });

        // Speichern
        $('tcsSave').addEventListener('click', function () {
            localStorage.setItem('mwl_chart_style', JSON.stringify(window.modalChartStyle));
            if (typeof createExplosion === 'function') createExplosion(window.innerWidth / 2, window.innerHeight / 2);
            modal.remove();
            updateDashboard();
        });

        refreshDim();
        // Preview initial rendern (nach Layout, damit clientWidth stimmt)
        setTimeout(preview, 60);
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
        localStorage.setItem('mwl_donut_mode', mode);
    }

    function saveDonutSettings() {
        const settings = {
            animated: document.getElementById('donutAnimCheck').checked,
            glow: document.getElementById('donutGlowCheck').checked,
            mode: localStorage.getItem('mwl_donut_mode') || 'percentage'
        };
        localStorage.setItem('mwl_donut_settings', JSON.stringify(settings));
        updateDashboard();
    }

    function resetDonutSettings() {
        document.getElementById('donutAnimCheck').checked = true;
        document.getElementById('donutGlowCheck').checked = true;
        localStorage.removeItem('mwl_donut_settings');
        localStorage.removeItem('mwl_donut_mode');
    }

    // ═══ Balkendiagramm-Einstellungen: zentrale Defaults + Loader ═══
    var BAR_CHART_DEFAULTS = {
        barHeight: 32,
        borderRadius: 8,
        segmentGap: 0,
        showLabels: true,
        showAnimation: true,
        animSpeed: 800,   // ms – Dauer der Fill-Animation
        glow: false
    };

    function getBarChartSettings() {
        var s = {};
        try {
            var saved = localStorage.getItem('mwl_bar_chart_settings');
            if (saved) s = JSON.parse(saved) || {};
        } catch (e) { s = {}; }
        return Object.assign({}, BAR_CHART_DEFAULTS, s);
    }

    // Wendet Layout-Settings (Höhe, Radius, Gap, Labels, Glow) direkt auf den echten Chart an.
    // Wird sowohl live im Modal als auch bei jedem updateUI() aufgerufen.
    function applyBarChartSettings(settings) {
        // Ohne Argument: immer die GESPEICHERTEN Settings (nie window.modalBarSettings –
        // das enthält u.U. noch nicht committete Live-Edits eines offenen Modals).
        var s = settings || getBarChartSettings();
        var container = document.getElementById('donutChartContainer');
        if (container) {
            container.style.height = s.barHeight + 'px';
            container.style.borderRadius = s.borderRadius + 'px';
            container.style.gap = (s.segmentGap || 0) + 'px';
            // Glow als Schein um den ganzen Balken (per-Segment würde vom overflow:hidden
            // des Containers weggeschnitten).
            var baseShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
            container.style.boxShadow = s.glow
                ? baseShadow + ', 0 0 22px rgba(var(--primary-rgb),0.42)'
                : baseShadow;
        }
        document.querySelectorAll('.segment-label').forEach(function (label) {
            label.style.display = s.showLabels ? 'block' : 'none';
        });
        // Bei Segment-Abstand bekommen die Segmente eigene abgerundete Ecken.
        document.querySelectorAll('#donutChartContainer .donut-segment').forEach(function (seg) {
            seg.style.borderRadius = (s.segmentGap > 0 ? Math.min(s.borderRadius, 6) : 0) + 'px';
        });
    }

    // ═══ NEW: Modern Balkendiagramm-Einstellungen Modal ═══
    function openDonutStyleModal() {
        var current = getBarChartSettings();
        var enD = document.documentElement.lang === 'en';
        var curUnit = (data.settings && data.settings.distributionUnit === 'days') ? 'days' : 'hours';
        window.modalBarSettings = Object.assign({}, current);
        window._barSettingsSnapshot = Object.assign({}, current); // für Abbrechen-Restore

        var modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'donutStyleModal';
        modal.style.zIndex = '100000';

        modal.innerHTML =
        '<style>' +
        '.bcs-box{width:460px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto;background:#111118;border:1px solid var(--border-default,rgba(255,255,255,.08));border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.55);animation:bcsUp .28s cubic-bezier(.16,1,.3,1)}' +
        '@keyframes bcsUp{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}' +
        '.bcs-head{position:relative;padding:20px 22px;border-bottom:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.bcs-head h2{margin:0;font-size:1.05rem;font-weight:700;color:var(--text-main);letter-spacing:-.01em}' +
        '.bcs-head p{margin:3px 0 0;font-size:.78rem;color:var(--text-muted)}' +
        '.bcs-x{position:absolute;top:16px;right:16px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid var(--border-subtle,rgba(255,255,255,.06));border-radius:8px;color:var(--text-muted);cursor:pointer;transition:all .2s}' +
        '.bcs-x:hover{background:rgba(255,255,255,.09);color:var(--text-main)}' +
        '.bcs-body{padding:20px 22px;display:flex;flex-direction:column;gap:22px}' +
        '.bcs-preview{padding:16px;border-radius:12px;background:rgba(255,255,255,.02);border:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.bcs-preview-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
        '.bcs-preview-top span{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted)}' +
        '.bcs-replay{display:inline-flex;align-items:center;gap:5px;font-size:.72rem;font-weight:600;color:var(--primary);background:rgba(var(--primary-rgb),.1);border:1px solid rgba(var(--primary-rgb),.22);border-radius:7px;padding:4px 9px;cursor:pointer;transition:all .18s}' +
        '.bcs-replay:hover{background:rgba(var(--primary-rgb),.18)}' +
        '.bcs-replay svg{width:12px;height:12px}' +
        '.bcs-bar{width:100%;display:flex;overflow:hidden;background:rgba(255,255,255,.04);box-shadow:inset 0 2px 4px rgba(0,0,0,.2)}' +
        '.bcs-seg{height:100%;flex:0 0 0%;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;color:rgba(255,255,255,.92)}' +
        '.bcs-group-label{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-bottom:12px;display:block}' +
        '.bcs-row{display:flex;flex-direction:column;gap:9px}' +
        '.bcs-row+.bcs-row{margin-top:16px}' +
        '.bcs-rowhead{display:flex;justify-content:space-between;align-items:center}' +
        '.bcs-rowhead label{font-size:.86rem;font-weight:600;color:var(--text-main)}' +
        '.bcs-val{font-size:.8rem;font-weight:700;color:var(--primary);font-family:var(--font-mono,monospace)}' +
        '.bcs-slider{width:100%;height:6px;border-radius:4px;background:rgba(var(--primary-rgb),.18);outline:none;-webkit-appearance:none;cursor:pointer}' +
        '.bcs-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--primary);cursor:pointer;border:3px solid #111118;box-shadow:0 0 0 1px rgba(var(--primary-rgb),.5)}' +
        '.bcs-slider::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:var(--primary);cursor:pointer;border:3px solid #111118}' +
        '.bcs-slider:disabled{opacity:.4;cursor:not-allowed}' +
        '.bcs-toggle{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,.02);border:1px solid var(--border-subtle,rgba(255,255,255,.06));border-radius:11px;cursor:pointer;transition:all .18s}' +
        '.bcs-toggle:hover{background:rgba(255,255,255,.045);border-color:var(--border-default,rgba(255,255,255,.1))}' +
        '.bcs-toggle+.bcs-toggle{margin-top:9px}' +
        '.bcs-toggle .bcs-ic{width:34px;height:34px;flex:0 0 34px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:rgba(var(--primary-rgb),.1);color:var(--primary)}' +
        '.bcs-toggle .bcs-ic svg{width:17px;height:17px}' +
        '.bcs-toggle .bcs-txt{flex:1}' +
        '.bcs-toggle .bcs-txt b{display:block;font-size:.87rem;font-weight:600;color:var(--text-main)}' +
        '.bcs-toggle .bcs-txt small{font-size:.72rem;color:var(--text-muted)}' +
        '.bcs-switch{position:relative;width:42px;height:24px;flex:0 0 42px;border-radius:999px;background:rgba(255,255,255,.12);transition:background .2s}' +
        '.bcs-switch::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.16,1,.3,1)}' +
        '.bcs-toggle input{position:absolute;opacity:0;width:0;height:0}' +
        '.bcs-toggle input:checked~.bcs-switch{background:var(--primary)}' +
        '.bcs-toggle input:checked~.bcs-switch::after{transform:translateX(18px)}' +
        '.bcs-foot{display:flex;gap:10px;align-items:center;padding:16px 22px;border-top:1px solid var(--border-subtle,rgba(255,255,255,.06))}' +
        '.bcs-reset{font-size:.8rem;font-weight:600;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:8px 4px;transition:color .18s}' +
        '.bcs-reset:hover{color:var(--text-main)}' +
        '.bcs-btn{padding:10px 18px;border-radius:9px;font-size:.86rem;font-weight:600;cursor:pointer;transition:all .18s;border:1px solid transparent}' +
        '.bcs-btn.ghost{background:rgba(255,255,255,.05);border-color:var(--border-default,rgba(255,255,255,.1));color:var(--text-main)}' +
        '.bcs-btn.ghost:hover{background:rgba(255,255,255,.1)}' +
        '.bcs-btn.primary{background:var(--primary);color:#fff;box-shadow:0 4px 14px rgba(var(--primary-rgb),.32)}' +
        '.bcs-btn.primary:hover{filter:brightness(1.08);box-shadow:0 6px 20px rgba(var(--primary-rgb),.42)}' +
        '.bcs-unit-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}' +
        '.bcs-unit-btn.active:hover{filter:brightness(1.08);background:var(--primary)}' +
        '.bcs-animrow{transition:opacity .2s}' +
        // Desktop: breiteres Modal + 2-Spalten-Layout (Vorschau über volle Breite)
        '@media(min-width:640px){' +
          '.bcs-box{width:680px}' +
          '.bcs-body{display:grid;grid-template-columns:1fr 1fr;gap:22px 28px;align-items:start}' +
          '.bcs-preview{grid-column:1 / -1}' +
        '}' +
        // Light-Theme-Overrides (SPA unterstützt [data-theme="light"])
        '[data-theme="light"] .bcs-box{background:#fff;border-color:rgba(0,0,0,.08)}' +
        '[data-theme="light"] .bcs-head,[data-theme="light"] .bcs-foot{border-color:rgba(0,0,0,.07)}' +
        '[data-theme="light"] .bcs-x,[data-theme="light"] .bcs-preview,[data-theme="light"] .bcs-toggle{background:rgba(0,0,0,.02);border-color:rgba(0,0,0,.08)}' +
        '[data-theme="light"] .bcs-toggle:hover{background:rgba(0,0,0,.04)}' +
        '[data-theme="light"] .bcs-bar{background:rgba(0,0,0,.05)}' +
        '[data-theme="light"] .bcs-switch{background:rgba(0,0,0,.18)}' +
        '[data-theme="light"] .bcs-slider::-webkit-slider-thumb,[data-theme="light"] .bcs-slider::-moz-range-thumb{border-color:#fff}' +
        '[data-theme="light"] .bcs-btn.ghost{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.12)}' +
        '[data-theme="light"] .bcs-btn.ghost:hover{background:rgba(0,0,0,.08)}' +
        '[data-theme="light"] .bcs-seg{color:#fff}' +
        '</style>' +
        '<div class="bcs-box">' +
            '<div class="bcs-head">' +
                '<h2>Arbeitszeit-Verteilung</h2>' +
                '<p>Darstellung des Balkendiagramms anpassen</p>' +
                '<button class="bcs-x" onclick="document.getElementById(\'donutStyleModal\').remove()" title="Schließen">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="bcs-body">' +
                // Live-Vorschau
                '<div class="bcs-preview">' +
                    '<div class="bcs-preview-top">' +
                        '<span>Vorschau</span>' +
                        '<button class="bcs-replay" id="bcsReplay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Abspielen</button>' +
                    '</div>' +
                    '<div class="bcs-bar" id="bcsPreviewBar"></div>' +
                '</div>' +
                // Darstellung
                '<div>' +
                    '<span class="bcs-group-label">Darstellung</span>' +
                    '<div class="bcs-row">' +
                        '<div class="bcs-rowhead"><label>Balkenhöhe</label><span class="bcs-val" id="bcsHeightVal">' + current.barHeight + 'px</span></div>' +
                        '<input type="range" class="bcs-slider" id="bcsHeight" min="16" max="56" value="' + current.barHeight + '">' +
                    '</div>' +
                    '<div class="bcs-row">' +
                        '<div class="bcs-rowhead"><label>Eckenradius</label><span class="bcs-val" id="bcsRadiusVal">' + current.borderRadius + 'px</span></div>' +
                        '<input type="range" class="bcs-slider" id="bcsRadius" min="0" max="24" value="' + current.borderRadius + '">' +
                    '</div>' +
                    '<div class="bcs-row">' +
                        '<div class="bcs-rowhead"><label>Segment-Abstand</label><span class="bcs-val" id="bcsGapVal">' + current.segmentGap + 'px</span></div>' +
                        '<input type="range" class="bcs-slider" id="bcsGap" min="0" max="10" value="' + current.segmentGap + '">' +
                    '</div>' +
                '</div>' +
                // Optionen
                '<div>' +
                    '<span class="bcs-group-label">Optionen</span>' +
                    '<label class="bcs-toggle">' +
                        '<span class="bcs-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6M12 4v16"/></svg></span>' +
                        '<span class="bcs-txt"><b>Prozente im Balken</b><small>Zahl direkt im Segment anzeigen</small></span>' +
                        '<input type="checkbox" id="bcsLabels"' + (current.showLabels ? ' checked' : '') + '><span class="bcs-switch"></span>' +
                    '</label>' +
                    '<label class="bcs-toggle">' +
                        '<span class="bcs-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg></span>' +
                        '<span class="bcs-txt"><b>Sanfte Animation</b><small>Balken füllen sich beim Laden</small></span>' +
                        '<input type="checkbox" id="bcsAnim"' + (current.showAnimation ? ' checked' : '') + '><span class="bcs-switch"></span>' +
                    '</label>' +
                    '<label class="bcs-toggle">' +
                        '<span class="bcs-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg></span>' +
                        '<span class="bcs-txt"><b>Glow-Effekt</b><small>Leuchtender Schein um die Segmente</small></span>' +
                        '<input type="checkbox" id="bcsGlow"' + (current.glow ? ' checked' : '') + '><span class="bcs-switch"></span>' +
                    '</label>' +
                '</div>' +
                // Berechnungs-Einheit (Stunden vs. Tage)
                '<div>' +
                    '<span class="bcs-group-label">' + (enD ? 'Distribution basis' : 'Berechnung der Verteilung') + '</span>' +
                    '<div id="bcsUnitSeg" style="display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;">' +
                        '<button type="button" class="bcs-btn ghost bcs-unit-btn' + (curUnit === 'hours' ? ' active' : '') + '" data-unit="hours">' + (enD ? 'Hours' : 'Stunden') + '</button>' +
                        '<button type="button" class="bcs-btn ghost bcs-unit-btn' + (curUnit === 'days' ? ' active' : '') + '" data-unit="days">' + (enD ? 'Days' : 'Tage') + '</button>' +
                    '</div>' +
                    '<p style="font-size:.72rem;color:var(--text-muted);margin:8px 0 0;line-height:1.5;">' + (enD ? 'Hours: share of logged hours. Days: share of recorded days — closer to the IHK absence-days logic.' : 'Stunden: Anteil an geloggten Stunden. Tage: Anteil an erfassten Tagen — näher an der IHK-Fehltage-Logik.') + '</p>' +
                '</div>' +
                // Animationstempo (nur relevant wenn Animation an)
                '<div class="bcs-animrow" id="bcsAnimRow">' +
                    '<span class="bcs-group-label">Animation</span>' +
                    '<div class="bcs-row">' +
                        '<div class="bcs-rowhead"><label>Tempo</label><span class="bcs-val" id="bcsSpeedVal"></span></div>' +
                        '<input type="range" class="bcs-slider" id="bcsSpeed" min="300" max="1600" step="50" value="' + current.animSpeed + '">' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="bcs-foot">' +
                '<button class="bcs-reset" id="bcsReset">Zurücksetzen</button>' +
                '<div style="flex:1"></div>' +
                '<button class="bcs-btn ghost" id="bcsCancel">Abbrechen</button>' +
                '<button class="bcs-btn primary" id="bcsSave">Speichern</button>' +
            '</div>' +
        '</div>';

        document.body.appendChild(modal);
        setupDonutStyleModal(modal);
    }

    function setupDonutStyleModal(modal) {
        var speedLabel = function (ms) {
            if (ms <= 500) return 'Schnell';
            if (ms >= 1300) return 'Langsam';
            return 'Normal';
        };
        var $ = function (id) { return modal.querySelector('#' + id); };

        // Berechnungs-Einheit (Stunden/Tage): sofort anwenden (eigenständige Einstellung,
        // unabhängig vom Speichern der visuellen Balken-Settings)
        modal.querySelectorAll('.bcs-unit-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var unit = btn.getAttribute('data-unit') === 'days' ? 'days' : 'hours';
                if (!data.settings) data.settings = {};
                data.settings.distributionUnit = unit;
                modal.querySelectorAll('.bcs-unit-btn').forEach(function (b) {
                    b.classList.toggle('active', b.getAttribute('data-unit') === unit);
                });
                try { save(); } catch (e) {}
                try { updateUI(); } catch (e) {}
            });
        });

        function refreshAnimRow() {
            var on = window.modalBarSettings.showAnimation;
            var row = $('bcsAnimRow');
            row.style.opacity = on ? '1' : '.45';
            $('bcsSpeed').disabled = !on;
            $('bcsSpeedVal').textContent = speedLabel(window.modalBarSettings.animSpeed) + ' · ' + window.modalBarSettings.animSpeed + 'ms';
        }

        function renderPreview(animate) {
            var bar = $('bcsPreviewBar');
            if (!bar) return;
            var s = window.modalBarSettings;
            bar.style.height = s.barHeight + 'px';
            bar.style.borderRadius = s.borderRadius + 'px';
            bar.style.gap = s.segmentGap + 'px';
            var baseShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)';
            bar.style.boxShadow = s.glow ? baseShadow + ', 0 0 22px rgba(var(--primary-rgb),0.42)' : baseShadow;
            var sample = [
                { pct: 58, color: 'var(--primary)' },
                { pct: 20, color: 'var(--school)' },
                { pct: 12, color: 'var(--success)' },
                { pct: 6, color: 'var(--danger)' },
                { pct: 4, color: 'var(--holiday)' }
            ];
            bar.innerHTML = '';
            var segEls = [];
            sample.forEach(function (seg) {
                var el = document.createElement('div');
                el.className = 'bcs-seg';
                el.style.background = seg.color;
                el.style.borderRadius = (s.segmentGap > 0 ? Math.min(s.borderRadius, 6) : 0) + 'px';
                el.style.transition = s.showAnimation ? ('flex ' + s.animSpeed + 'ms cubic-bezier(.34,1.56,.64,1)') : 'none';
                el.textContent = (s.showLabels && seg.pct > 8) ? seg.pct + '%' : '';
                el.style.flex = '0 0 0%';
                bar.appendChild(el);
                segEls.push({ el: el, pct: seg.pct });
            });
            var fill = function () {
                segEls.forEach(function (o) { o.el.style.flex = '0 0 ' + o.pct + '%'; });
            };
            if (animate && s.showAnimation) {
                requestAnimationFrame(function () { requestAnimationFrame(fill); });
            } else {
                segEls.forEach(function (o) { o.el.style.transition = 'none'; o.el.style.flex = '0 0 ' + o.pct + '%'; });
            }
        }

        // Slider: Höhe / Radius / Gap  → live auf echten Chart + Vorschau
        var wire = function (id, valId, key, unit) {
            $(id).addEventListener('input', function () {
                window.modalBarSettings[key] = parseInt(this.value, 10);
                $(valId).textContent = this.value + (unit || '');
                applyBarChartSettings(window.modalBarSettings);
                renderPreview(false);
            });
        };
        wire('bcsHeight', 'bcsHeightVal', 'barHeight', 'px');
        wire('bcsRadius', 'bcsRadiusVal', 'borderRadius', 'px');
        wire('bcsGap', 'bcsGapVal', 'segmentGap', 'px');

        $('bcsSpeed').addEventListener('input', function () {
            window.modalBarSettings.animSpeed = parseInt(this.value, 10);
            $('bcsSpeedVal').textContent = speedLabel(window.modalBarSettings.animSpeed) + ' · ' + this.value + 'ms';
            renderPreview(false);
        });

        // Toggles
        $('bcsLabels').addEventListener('change', function () {
            window.modalBarSettings.showLabels = this.checked;
            applyBarChartSettings(window.modalBarSettings);
            renderPreview(false);
        });
        $('bcsAnim').addEventListener('change', function () {
            window.modalBarSettings.showAnimation = this.checked;
            refreshAnimRow();
            renderPreview(this.checked);
        });
        $('bcsGlow').addEventListener('change', function () {
            window.modalBarSettings.glow = this.checked;
            applyBarChartSettings(window.modalBarSettings);
            renderPreview(false);
        });

        // Replay-Button
        $('bcsReplay').addEventListener('click', function () { renderPreview(true); });

        // Reset
        $('bcsReset').addEventListener('click', function () {
            window.modalBarSettings = Object.assign({}, BAR_CHART_DEFAULTS);
            var s = window.modalBarSettings;
            $('bcsHeight').value = s.barHeight; $('bcsHeightVal').textContent = s.barHeight + 'px';
            $('bcsRadius').value = s.borderRadius; $('bcsRadiusVal').textContent = s.borderRadius + 'px';
            $('bcsGap').value = s.segmentGap; $('bcsGapVal').textContent = s.segmentGap + 'px';
            $('bcsSpeed').value = s.animSpeed;
            $('bcsLabels').checked = s.showLabels;
            $('bcsAnim').checked = s.showAnimation;
            $('bcsGlow').checked = s.glow;
            refreshAnimRow();
            applyBarChartSettings(s);
            renderPreview(true);
        });

        // Abbrechen: Snapshot wiederherstellen (live-Änderungen verwerfen)
        var revert = function () {
            applyBarChartSettings(window._barSettingsSnapshot);
            modal.remove();
        };
        $('bcsCancel').addEventListener('click', revert);
        modal.addEventListener('click', function (e) { if (e.target === modal) revert(); });

        // Speichern
        $('bcsSave').addEventListener('click', function () {
            localStorage.setItem('mwl_bar_chart_settings', JSON.stringify(window.modalBarSettings));
            if (typeof createExplosion === 'function') createExplosion(window.innerWidth / 2, window.innerHeight / 2);
            modal.remove();
            updateDashboard();
        });

        refreshAnimRow();
        renderPreview(true);
    }

    function cancelDashboardEditMode() {
        const container = document.getElementById('dashboardContainer');
        if (!container || !container.classList.contains('edit-mode')) return;
        
        // Reload layout from localStorage to discard changes
        loadDashboardLayout();
        toggleDashboardEditMode();
    }

    // Sprachbewusst: das Hilfe-Panel wird komplett per JS gebaut, die statische
    // i18n-Pipeline erfasst JS nicht → Texte hier direkt zweisprachig halten.
    function qhL(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    // Lucide-Style Icons (Stroke 1.5, currentColor) pro Hilfe-Kontext — keine Emojis.
    var QH_ICONS = {
        dashboard:   '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
        performance: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
        entry:       '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        timer:       '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="12" y1="14" y2="9"/><circle cx="12" cy="14" r="8"/>',
        ihk:         '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/>',
        school:      '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
        goals:       '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
        calendar:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
        history:     '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
        support:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><line x1="5.6" y1="5.6" x2="9.5" y2="9.5"/><line x1="14.5" y1="14.5" x2="18.4" y2="18.4"/><line x1="14.5" y1="9.5" x2="18.4" y2="5.6"/><line x1="5.6" y1="18.4" x2="9.5" y2="14.5"/>',
        help:        '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 1.9-2.8 2.8-2.8 2.8"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
    };

    // Content-Modell pro Kontext. group.kind: 'list' (Punkte) | 'keys' (Tastenkürzel).
    function buildQuickHelpContent(context) {
        if (context === 'entry') {
            return {
                icon: 'entry',
                title: qhL('Eintrag erfassen', 'Log an entry'),
                sub: qhL('Zeiten in wenigen Sekunden buchen', 'Book your time in seconds'),
                groups: [
                    { kind: 'list', label: qhL('So geht\'s', 'How it works'), items: [
                        { lead: qhL('Datum & Typ', 'Date & type'), text: qhL('Arbeit, Schule, Urlaub oder Krank wählen.', 'Pick work, school, vacation or sick.') },
                        { lead: qhL('Zeitraum', 'Time span'), text: qhL('Start/Ende eintragen oder Stunden direkt (z.B. 7.5).', 'Enter start/end or hours directly (e.g. 7.5).') },
                        { text: qhL('Die „Jetzt“-Buttons setzen die aktuelle Uhrzeit ein.', 'The “Now” buttons insert the current time.') },
                        { text: qhL('Entwürfe werden automatisch gesichert und lassen sich wiederherstellen.', 'Drafts are saved automatically and can be restored.') }
                    ]},
                    { kind: 'keys', label: qhL('Kürzel', 'Shortcut'), items: [
                        { keys: ['Ctrl', 'Enter'], text: qhL('Eintrag sofort speichern', 'Save entry instantly') }
                    ]}
                ]
            };
        }
        if (context === 'timer') {
            return {
                icon: 'timer',
                title: qhL('Live-Timer', 'Live timer'),
                sub: qhL('Laufende Sessions automatisch messen', 'Track running sessions automatically'),
                groups: [
                    { kind: 'list', label: qhL('Gut zu wissen', 'Good to know'), items: [
                        { text: qhL('Beim Stoppen wird die gemessene Zeit als Eintrag übernommen.', 'On stop, the measured time becomes an entry.') },
                        { text: qhL('Pausen werden erfasst und Mindestpausen bei Bedarf abgezogen.', 'Breaks are tracked and minimum breaks deducted when needed.') },
                        { text: qhL('Timer für lange Sessions, Start/Ende-Felder für kurze Fixbuchungen.', 'Timer for long sessions, start/end fields for quick fixes.') }
                    ]},
                    { kind: 'keys', label: qhL('Kürzel', 'Shortcuts'), items: [
                        { keys: ['Ctrl', 'Space'], text: qhL('Starten / pausieren', 'Start / pause') },
                        { keys: ['Ctrl', 'Shift', 'Space'], text: qhL('Stoppen & speichern', 'Stop & save') }
                    ]}
                ]
            };
        }

        // Kontext 'global' → View-spezifische Hilfe
        var active = document.querySelector('.view-section.active');
        var aid = active ? active.id : null;
        switch (aid) {
            case 'view-dashboard':
                return { icon: 'dashboard', title: qhL('Dashboard', 'Dashboard'),
                    sub: qhL('Deine wichtigsten Kennzahlen auf einen Blick', 'Your key metrics at a glance'),
                    groups: [{ kind: 'list', label: qhL('Was du hier siehst', 'What you see here'), items: [
                        { lead: qhL('Saldo & KPI', 'Balance & KPI'), text: qhL('Überblick über Soll, Ist und Gleitzeit.', 'Target, actual and flextime overview.') },
                        { lead: qhL('Projektverteilung', 'Project split'), text: qhL('Welche Projekte deine Zeit verbrauchen.', 'Which projects consume your time.') },
                        { lead: qhL('Schnellaktionen', 'Quick actions'), text: qhL('Timer starten oder direkt einen Eintrag anlegen.', 'Start the timer or add an entry directly.') }
                    ]}]};
            case 'view-performance':
                return { icon: 'performance', title: qhL('Performance', 'Performance'),
                    sub: qhL('Trends und Muster in deinen Zeiten', 'Trends and patterns in your hours'),
                    groups: [{ kind: 'list', label: qhL('Analysen', 'Analytics'), items: [
                        { text: qhL('Trendlinien, Heatmaps und Projektverteilungen.', 'Trend lines, heatmaps and project splits.') },
                        { text: qhL('Zeiträume oder Projekte über Filter eingrenzen.', 'Narrow by time range or project using filters.') },
                        { text: qhL('Diagramme antippen für Detailinfos.', 'Tap charts for detailed info.') }
                    ]}]};
            case 'view-ihk':
                return { icon: 'ihk', title: qhL('IHK & Ausbildung', 'IHK & training'),
                    sub: qhL('Prüfungsdaten und Ausbildungsfortschritt', 'Exam data and training progress'),
                    groups: [{ kind: 'list', label: qhL('Wofür', 'What for'), items: [
                        { text: qhL('Prüfungstermine und Noten eintragen, Fortschritt berechnen.', 'Enter exam dates and grades, track progress.') },
                        { text: qhL('Hilft bei Audit- und Nachweiszwecken.', 'Useful for audits and documentation.') }
                    ]}]};
            case 'view-school':
                return { icon: 'school', title: qhL('Berufsschule', 'Vocational school'),
                    sub: qhL('Schultage und Stunden verwalten', 'Manage school days and hours'),
                    groups: [{ kind: 'list', label: qhL('Funktionen', 'Features'), items: [
                        { text: qhL('Schultage werden erkannt und Stunden automatisch zugeordnet.', 'School days are detected and hours assigned automatically.') },
                        { text: qhL('Manuelle Einträge für Sonderfälle möglich.', 'Manual entries possible for special cases.') }
                    ]}]};
            case 'view-goals':
                return { icon: 'goals', title: qhL('Ziele', 'Goals'),
                    sub: qhL('Persönliche Zeit- und Wochenziele', 'Personal time and weekly goals'),
                    groups: [{ kind: 'list', label: qhL('Funktionen', 'Features'), items: [
                        { text: qhL('Zielvorgaben erstellen und Fortschritt verfolgen.', 'Set targets and track progress.') },
                        { text: qhL('Prognosen zeigen Planabweichungen früh.', 'Forecasts surface deviations early.') }
                    ]}]};
            case 'view-yearview':
            case 'view-monthcompare':
                return { icon: 'calendar', title: qhL('Jahres- & Monatsansicht', 'Year & month view'),
                    sub: qhL('Leistung über längere Zeiträume', 'Performance over longer periods'),
                    groups: [{ kind: 'list', label: qhL('Was du hier siehst', 'What you see here'), items: [
                        { text: qhL('Heatmaps und Monatsvergleiche für Trends.', 'Heatmaps and month comparisons for trends.') },
                        { text: qhL('Auf einen Tag tippen für die Detailansicht.', 'Tap a day for the detail view.') }
                    ]}]};
            case 'view-history':
                return { icon: 'history', title: qhL('Historie', 'History'),
                    sub: qhL('Alle Einträge durchsuchen und pflegen', 'Browse and manage all entries'),
                    groups: [{ kind: 'list', label: qhL('Funktionen', 'Features'), items: [
                        { text: qhL('Nach Datum, Projekt oder Typ filtern.', 'Filter by date, project or type.') },
                        { text: qhL('Einträge bearbeiten oder exportieren.', 'Edit or export entries.') }
                    ]}]};
            case 'view-support':
                return { icon: 'support', title: qhL('Support', 'Support'),
                    sub: qhL('Hilfe, Feedback und Kontakt', 'Help, feedback and contact'),
                    groups: [{ kind: 'list', label: qhL('Optionen', 'Options'), items: [
                        { text: qhL('Fehler melden, Feedback geben oder die Doku lesen.', 'Report bugs, send feedback or read the docs.') }
                    ]}]};
            default:
                return { icon: 'help', title: qhL('Schnell-Hilfe', 'Quick help'),
                    sub: qhL('Die wichtigsten Aktionen', 'The most important actions'),
                    groups: [{ kind: 'keys', label: qhL('Tastenkürzel', 'Keyboard shortcuts'), items: [
                        { keys: ['Ctrl', 'Space'], text: qhL('Timer starten / pausieren', 'Start / pause timer') },
                        { keys: ['Ctrl', 'Shift', 'Space'], text: qhL('Timer stoppen & speichern', 'Stop & save timer') },
                        { keys: ['Ctrl', 'Enter'], text: qhL('Formular speichern', 'Save form') }
                    ]}]};
        }
    }

    function renderQuickHelpGroup(g) {
        var label = '<div class="qh-group-label">' + esc(g.label) + '</div>';
        if (g.kind === 'keys') {
            var rows = g.items.map(function (it) {
                var caps = it.keys.map(function (k, i) {
                    return (i ? '<span class="qh-plus">+</span>' : '') + '<kbd class="qh-kbd">' + esc(k) + '</kbd>';
                }).join('');
                return '<div class="qh-key-row"><span class="qh-caps">' + caps + '</span>' +
                       '<span class="qh-key-desc">' + esc(it.text) + '</span></div>';
            }).join('');
            return '<div class="qh-group">' + label + '<div class="qh-keys">' + rows + '</div></div>';
        }
        var lis = g.items.map(function (it) {
            var lead = it.lead ? '<strong>' + esc(it.lead) + '</strong> ' : '';
            return '<li class="qh-item"><span>' + lead + esc(it.text) + '</span></li>';
        }).join('');
        return '<div class="qh-group">' + label + '<ul class="qh-list">' + lis + '</ul></div>';
    }

    function openQuickHelp(context) {
        try {
            var modal = document.getElementById('quickHelpModal');
            var host = modal ? modal.querySelector('.qh-render') : null;
            if (!modal || !host) return;

            var c = buildQuickHelpContent(context);
            var svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
                      'stroke-linecap="round" stroke-linejoin="round">' + (QH_ICONS[c.icon] || QH_ICONS.help) + '</svg>';

            host.innerHTML =
                '<button class="qh-close" onclick="closeQuickHelp()" aria-label="' + qhL('Schließen', 'Close') + '">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
                '<div class="qh-head">' +
                    '<div class="qh-icon">' + svg + '</div>' +
                    '<div class="qh-head-text">' +
                        '<div class="qh-title">' + esc(c.title) + '</div>' +
                        '<div class="qh-sub">' + esc(c.sub) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="qh-body">' + c.groups.map(renderQuickHelpGroup).join('') + '</div>' +
                '<div class="qh-foot">' +
                    '<button class="qh-btn qh-btn-ghost" onclick="startOnboardingTour()">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>' +
                        qhL('Tour starten', 'Start tour') +
                    '</button>' +
                    '<button class="qh-btn qh-btn-primary" onclick="closeQuickHelp()">' + qhL('Verstanden', 'Got it') + '</button>' +
                '</div>';

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

    // ═══ VOICE INPUT MODULE ═══
    window._voiceRawText = '';
    window._voiceListening = false;
    window._voiceRecognition = null;

    window.showVoiceFeedback = function(msg, type, chips) {
        try {
            type = type || 'info';
            var fb = document.getElementById('voiceFeedback');
            if (!fb) {
                fb = document.createElement('div');
                fb.id = 'voiceFeedback';
                var actions = document.querySelector('.entry-form__actions');
                if (actions && actions.parentNode) {
                    actions.parentNode.insertBefore(fb, actions.nextSibling);
                }
            }
            clearTimeout(fb._t);

            var inner = '<div class="vfc-bar vfc-bar--' + type + '"></div><div class="vfc-body">';

            if (type === 'info') {
                inner += '<div class="vfc-wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>';
                inner += '<div class="vfc-live-text">' + (msg || '').replace(/^[🎤📝]\s*/, '') + '</div>';
            } else if (type === 'success' && chips) {
                inner += '<div class="vfc-chips">';
                if (chips.time)    inner += '<span class="vfc-chip vfc-chip--time">⏰ ' + chips.time + '</span>';
                if (chips.date)    inner += '<span class="vfc-chip vfc-chip--date">📅 ' + chips.date + '</span>';
                if (chips.project) inner += '<span class="vfc-chip vfc-chip--project">📁 ' + chips.project + '</span>';
                if (chips.note)    inner += '<span class="vfc-chip vfc-chip--note">📝 ' + chips.note + '</span>';
                inner += '</div>';
            } else {
                var icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
                inner += '<div class="vfc-msg">' + icon + ' <span>' + msg + '</span></div>';
            }

            inner += '</div>';
            fb.className = 'voice-feedback-card';
            fb.style.display = 'block';
            fb.innerHTML = inner;

            if (type !== 'info') {
                fb._t = setTimeout(function() { fb.style.display = 'none'; }, type === 'success' ? 6000 : 4000);
            }
        } catch (e) {}
    }

    window.startVoiceInput = function() {
        try {
            var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) { showVoiceFeedback('❌ Kein Browser-Support (Chrome/Edge nutzen)', 'error'); return; }

            if (window._voiceRecognition) {
                try { window._voiceRecognition.abort(); } catch (e) {}
                window._voiceRecognition = null;
            }

            var rec = new SR();
            window._voiceRecognition = rec;
            rec.lang = 'de-DE';
            rec.interimResults = true;
            rec.continuous = true;
            rec.maxAlternatives = 1;

            var btn = document.getElementById('voiceBtn');
            if (btn) btn.classList.add('voice-active');
            window._voiceListening = true;
            window._voiceRawText = '';

            showVoiceFeedback('🎤 Höre zu... (sprich jetzt)', 'info');

            rec.onresult = function(event) {
                var t = '';
                for (var i = 0; i < event.results.length; i++) {
                    t += event.results[i][0].transcript + ' ';
                }
                window._voiceRawText = t.trim();
                showVoiceFeedback('📝 ' + window._voiceRawText.substring(0, 120), 'info');
            };

            rec.onerror = function(event) {
                if (event.error === 'not-allowed') {
                    showVoiceFeedback('❌ Mikrofon gesperrt – Browser-Einstellungen prüfen', 'error');
                } else if (event.error !== 'no-speech') {
                    showVoiceFeedback('❌ Fehler: ' + event.error, 'error');
                }
                var b = document.getElementById('voiceBtn');
                if (b) b.classList.remove('voice-active');
                window._voiceListening = false;
                window._voiceRecognition = null;
            };

            rec.onend = function() {
                var b = document.getElementById('voiceBtn');
                if (b) b.classList.remove('voice-active');
                window._voiceListening = false;
                if (window._voiceRawText.trim()) {
                    parseVoiceInput(window._voiceRawText.trim());
                } else {
                    showVoiceFeedback('⚠️ Nichts erkannt – nochmal versuchen', 'warning');
                }
                window._voiceRecognition = null;
            };

            rec.start();

            // 10s Timeout
            setTimeout(function() {
                if (window._voiceRecognition && window._voiceListening) {
                    window._voiceRecognition.stop();
                }
            }, 10000);

        } catch (e) {
            showVoiceFeedback('❌ Spracherkennung konnte nicht starten', 'error');
            window._voiceListening = false;
            window._voiceRecognition = null;
        }
    };

    function parseVoiceInput(rawText) { // called by window.startVoiceInput
        try {
            if (!rawText || typeof rawText !== 'string') return;
            var text = rawText.toLowerCase().trim();

            // ── Spoken numbers → Ziffern (DE) ──
            var nums = {
                'null':0,'ein':1,'eins':1,'eine':1,'zwei':2,'zwo':2,'drei':3,'vier':4,
                'fünf':5,'sechs':6,'sieben':7,'acht':8,'neun':9,'zehn':10,
                'elf':11,'zwölf':12,'dreizehn':13,'vierzehn':14,'fünfzehn':15,
                'sechzehn':16,'siebzehn':17,'achtzehn':18,'neunzehn':19,
                'zwanzig':20,'einundzwanzig':21,'zweiundzwanzig':22,'dreiundzwanzig':23
            };
            text = text.replace(/\b(sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|einundzwanzig|zweiundzwanzig|dreiundzwanzig|dreizehn|vierzehn|fünfzehn|zwölf|elf|zehn|neun|acht|sieben|sechs|fünf|vier|drei|zwo|zwei|eine|eins|ein|null)\b/g, function(m) {
                return nums[m] !== undefined ? nums[m] : m;
            });

            var startTime = null, endTime = null, hours = null, project = '', notes = '';

            // ── Datum ──
            var today = new Date();
            var dateStr = today.toISOString().split('T')[0];
            var months = {
                'januar':1,'februar':2,'märz':3,'maerz':3,'april':4,'mai':5,'juni':6,
                'juli':7,'august':8,'september':9,'oktober':10,'november':11,'dezember':12
            };

            if (/gestern/.test(text)) {
                var d = new Date(today); d.setDate(d.getDate() - 1);
                dateStr = d.toISOString().split('T')[0];
            } else if (/vorgestern/.test(text)) {
                var d = new Date(today); d.setDate(d.getDate() - 2);
                dateStr = d.toISOString().split('T')[0];
            } else {
                // "18.5.2026" oder "18.5." oder "18. Mai 2026" oder "18 mai"
                var dm = text.match(/(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{4})/);
                if (!dm) dm = text.match(/(\d{1,2})[.\s]+(\d{1,2})/);
                var dmWord = text.match(/(\d{1,2})[.\s]+(januar|februar|m[äa]rz|april|mai|juni|juli|august|september|oktober|november|dezember)(?:[.\s]+(\d{4}))?/i);

                if (dmWord) {
                    var day = parseInt(dmWord[1]);
                    var mon = months[dmWord[2].toLowerCase()];
                    var yr  = dmWord[3] ? parseInt(dmWord[3]) : today.getFullYear();
                    if (day >= 1 && day <= 31 && mon) {
                        dateStr = yr + '-' + (mon < 10 ? '0' : '') + mon + '-' + (day < 10 ? '0' : '') + day;
                    }
                } else if (dm) {
                    var day = parseInt(dm[1]);
                    var mon = parseInt(dm[2]);
                    var yr  = dm[3] ? parseInt(dm[3]) : today.getFullYear();
                    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
                        dateStr = yr + '-' + (mon < 10 ? '0' : '') + mon + '-' + (day < 10 ? '0' : '') + day;
                    }
                }
            }

            // Datum aus Text entfernen bevor Zeit gesucht wird (sonst matched Datum als Zeit)
            var textNoDate = text
                .replace(/\d{1,2}[.\s]+\d{1,2}[.\s]+\d{4}/g, '')
                .replace(/\d{1,2}[.\s]+(januar|februar|m[äa]rz|april|mai|juni|juli|august|september|oktober|november|dezember)[.\s]+\d{4}/gi, '')
                .replace(/\d{1,2}[.\s]+(januar|februar|m[äa]rz|april|mai|juni|juli|august|september|oktober|november|dezember)/gi, '');

            // ── Zeiten: "6 bis 16", "6-16", "6 uhr bis 16 uhr" ──
            var tm = textNoDate.match(/(\d{1,2})\s*(?:uhr)?\s*(?:bis|-)\s*(\d{1,2})\s*(?:uhr)?/);
            if (tm) {
                var s = parseInt(tm[1]), e = parseInt(tm[2]);
                if (s >= 0 && s <= 23 && e > s && e <= 23) {
                    startTime = (s < 10 ? '0' : '') + s + ':00';
                    endTime   = (e < 10 ? '0' : '') + e + ':00';
                    hours = e - s;
                }
            }

            // ── Fallback: Stunden-Dauer ──
            if (!hours) {
                var hm = text.match(/(\d+[.,]\d+|\d+)\s*(?:stunden?|std\b)/);
                if (hm) {
                    hours = parseFloat(hm[1].replace(',', '.'));
                    if (!isFinite(hours) || hours <= 0 || hours > 16) hours = null;
                }
            }

            // ── Projekt ──
            var pText = text;
            if (tm) pText = pText.replace(tm[0], '');
            pText = pText.replace(/\d+[.,]?\d*\s*(?:stunden?|std\b)/g, '');
            pText = pText.replace(/\b(?:notiz|info|anmerkung|bugfix|fehler)\b.*/i, '');
            pText = pText.replace(/\b(?:gestern|vorgestern|heute|von|bis|uhr|habe|bin|und|oder|mit|im|am|ich)\b/g, '').trim();

            var pw = pText.split(/\s+/).filter(function(w) { return w.length >= 2; });
            if (pw.length) {
                project = pw.slice(0, 4).map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ').substring(0, 50);
            }

            // ── Notizen ──
            var nm = text.match(/(?:notiz|info|anmerkung|bugfix|fehler)\s+(.+)/i);
            if (nm) notes = nm[1].trim().substring(0, 100);

            // ── Formular füllen ──
            var el;
            el = document.getElementById('inpDate'); if (el) el.value = dateStr;
            el = document.getElementById('inpStart'); if (el) el.value = startTime || '';
            el = document.getElementById('inpEnd');   if (el) el.value = endTime || '';
            el = document.getElementById('inpHours'); if (el) el.value = (hours && !startTime) ? hours.toFixed(2) : '';
            el = document.getElementById('inpType');  if (el) el.value = 'work';
            el = document.getElementById('inpProject'); if (el) el.value = project;
            el = document.getElementById('inpNotes');   if (el) el.value = notes;
            if (typeof toggleTimeInputs === 'function') toggleTimeInputs();
            // Detail-Felder aufklappen, wenn die Spracheingabe Projekt/Notiz/Stunden gefüllt hat.
            if ((project || notes || (hours && !startTime)) && typeof toggleEntryDetails === 'function') toggleEntryDetails(true);

            // ── Feedback als Chips ──
            var chips = {};
            if (startTime && endTime) chips.time = startTime + '–' + endTime + ' · ' + (hours || 0) + 'h';
            else if (hours)           chips.time = hours + 'h';
            var todayStr = today.toISOString().split('T')[0];
            if (dateStr !== todayStr) chips.date = dateStr;
            if (project) chips.project = project;
            if (notes)   chips.note = notes.substring(0, 28);

            if (Object.keys(chips).length) {
                showVoiceFeedback('', 'success', chips);
            } else {
                showVoiceFeedback('Nichts erkannt – sag z.B. "6 bis 16 IT Server"', 'warning');
            }

        } catch (e) {
            console.error('parseVoiceInput:', e);
            showVoiceFeedback('❌ Fehler beim Verarbeiten', 'error');
        }
    }
