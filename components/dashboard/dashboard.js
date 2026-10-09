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
        if (document.getElementById('view-history').classList.contains('active') && typeof renderHistoryView === 'function') {
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
        if (typeof mwlEvent === 'function') mwlEvent('timer_action', { aktion: act });
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
                'Zeit stoppen und buchen?',
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
            expected: 0,
            workDays: 0,
            schoolDays: 0,
            vacationDays: 0,
            sickDays: 0,
            holidayDays: 0,
            overDays: 0,
            underDays: 0,
            saldo: 0,
            weeks: [],
            // Tageswerte fuer die Monatsansicht: das Kalenderraster braucht je
            // Tag Hoehe (worked), Sollmarke (expected) und Art (type). Die
            // Werte fallen in der Schleife unten ohnehin an — sie zweimal zu
            // rechnen waere die Stelle, an der zwei Zahlen auseinanderlaufen.
            byDay: {}
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
            let dayExpectedByJob = {};
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
                        daySaldo += (typeof e.diff === 'number' ? e.diff : (hours - (e.expected ?? (data.settings.hours[new Date(dateStr + 'T00:00:00').getDay()] || 0))));
                    }
                    // Tagessoll zaehlt je Job einmal am Tag — bei Split-Shift
                    // traegt jeder Eintrag dasselbe `expected`, summiert waere
                    // es doppelt.
                    const jid = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary';
                    const exp = parseFloat(e.expected) || 0;
                    if (exp > (dayExpectedByJob[jid] || 0)) dayExpectedByJob[jid] = exp;
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

            const dayExpected = Object.keys(dayExpectedByJob)
                .reduce((sum, k) => sum + dayExpectedByJob[k], 0);

            // Tageszusammenfassung in die Statistiken einfließen lassen
            if (dayHasWork) {
                stats.worked += dayWorkedHours;
                stats.expected += dayExpected;
                stats.workDays += 1; // pro Arbeitstag nur einmal zählen
                stats.saldo += daySaldo;
                if (daySaldo > 0.05) stats.overDays += 1;
                else if (daySaldo < -0.05) stats.underDays += 1;
            }
            if (dayHasSchool) stats.schoolDays += 1;
            if (dayHasVacation) stats.vacationDays += 1;
            if (dayHasGleittag) stats.gleittagDays = (stats.gleittagDays || 0) + 1;
            if (dayHasSick) stats.sickDays += 1;
            if (dayHasHoliday) stats.holidayDays += 1;

            // Ein Tag traegt genau eine Art im Kalenderbild. Arbeit gewinnt,
            // sonst die naechste vorhandene — ein Feiertag, an dem gearbeitet
            // wurde, ist im Bild ein Arbeitstag.
            const dayType = dayHasWork ? 'work'
                : dayHasSchool ? 'school'
                : dayHasVacation ? 'vacation'
                : dayHasGleittag ? 'gleittag'
                : dayHasSick ? 'sick'
                : dayHasHoliday ? 'holiday' : null;
            if (dayType) {
                stats.byDay[dateStr] = {
                    worked: dayWorkedHours,
                    expected: dayExpected,
                    saldo: daySaldo,
                    type: dayType
                };
            }

            // 🔴 Echte Kalenderwoche. Vorher stand hier `Math.ceil(d / 7)` —
            // das sind Bloecke von sieben Monatstagen: „Woche 1" endete immer
            // am 7., egal welcher Wochentag das war, und keine Zeile deckte
            // sich mit der Wochenansicht.
            const weekNum = (typeof getWeek === 'function')
                ? getWeek(new Date(year, month, d))
                : Math.ceil(d / 7);
            let week = stats.weeks.find(w => w.weekNum === weekNum);
            if (!week) {
                week = { weekNum: weekNum, days: 0, entries: 0, hours: 0, expected: 0, saldo: 0 };
                stats.weeks.push(week);
            }
            week.days += 1;
            if (dayHasWork) { week.entries += 1; week.saldo += daySaldo; week.expected += dayExpected; }
            week.hours += dayWorkedHours;
        }

        return stats;
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

    // ═══ LIVE-VERDIENST MODULE ═══
    // Tickender Live-Verdienst im Eintragsformular (opt-in, data.settings.wage). Startet, sobald
    // "Beginn" befüllt ist, und zeigt bewusst NUR eine Einheit — den laufenden Netto-Betrag in EUR,
    // kein Sekunden/Minuten-Umschalter gleichzeitig. "Einheit" (data.settings.wage.unit) wählt
    // stattdessen, wie fein/schnell er tickt (Sekunde = 4 Nachkommastellen alle 100ms, Stunde = ruhiger).
    //
    // Wichtig: die verstrichene Zeit wird bei JEDEM Tick frisch aus Datum+Start-Feld gegen die
    // aktuelle Systemzeit berechnet (kein performance.now()-Anker seit Aktivierung) — sonst zeigt
    // der Zähler nach einem Reload wieder 0 (Anker weg) und ignoriert beim nachträglichen Aktivieren
    // (Wage-Setting erst NACH dem Ausfüllen von Start eingeschaltet), was zwischen Start und jetzt
    // bereits verdient wurde. Nur "heute" gilt als live — ein rückwirkend gebuchter Tag tickt nicht.
    let _liveEarningsTimer = null;

    function wageNetPerSecond() {
        const w = data.settings && data.settings.wage;
        if (!w || !w.enabled) return 0;
        const netMonthly = parseFloat(w.netMonthly) || 0;
        if (netMonthly <= 0) return 0;
        const weeklyHours = (data.settings.hours || []).reduce((s, h) => s + (parseFloat(h) || 0), 0);
        if (weeklyHours <= 0) return 0;
        const monthlyHours = weeklyHours * (52 / 12); // Ø Wochen/Monat
        return netMonthly / monthlyHours / 3600;
    }

    function wageDisplayConfig() {
        const w = data.settings && data.settings.wage;
        const unit = (w && (w.unit === 'minute' || w.unit === 'hour')) ? w.unit : 'second';
        if (unit === 'minute') return { decimals: 2, intervalMs: 1000 };
        if (unit === 'hour') return { decimals: 2, intervalMs: 5000 };
        return { decimals: 4, intervalMs: 100 };
    }

    function _localDateStr(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // Liefert den echten Start-Zeitpunkt (heutiges Datum + Uhrzeit aus inpStart) als Date,
    // oder null wenn Start leer ist / das Eintragsdatum nicht heute ist (dann ist "live" sinnlos).
    function liveEarningsStartDate() {
        const startEl = document.getElementById('inpStart');
        const start = startEl ? startEl.value : '';
        const m = /^(\d{2}):(\d{2})$/.exec(start);
        if (!m) return null;
        const today = new Date();
        const dateEl = document.getElementById('inpDate');
        const dateStr = (dateEl && dateEl.value) ? dateEl.value : _localDateStr(today);
        if (dateStr !== _localDateStr(today)) return null;
        const d = new Date();
        d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
        return d;
    }

    function tickLiveEarnings() {
        const el = document.getElementById('entryEarningsValue');
        if (!el) return;
        const startDate = liveEarningsStartDate();
        if (!startDate) return;
        const elapsedSec = Math.max(0, (Date.now() - startDate.getTime()) / 1000);
        const amount = elapsedSec * wageNetPerSecond();
        const decimals = wageDisplayConfig().decimals;
        el.textContent = amount.toLocaleString(mwlLocale(), { style: 'currency', currency: 'EUR', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function stopLiveEarnings() {
        if (_liveEarningsTimer) { clearInterval(_liveEarningsTimer); _liveEarningsTimer = null; }
    }

    // Einziger Einstiegspunkt — wird von updateEntryDuration() bei jeder relevanten Formularänderung
    // aufgerufen (Start/Ende/Pause/Typ/Datum/Reset/Draft-Restore laufen alle darüber).
    function updateLiveEarnings() {
        const wrap = document.getElementById('entryEarnings');
        if (!wrap) return;
        const rate = wageNetPerSecond();
        const typeEl = document.getElementById('inpType');
        const type = typeEl ? typeEl.value : '';
        const isCustom = String(type).startsWith('custom-');
        const active = rate > 0 && (type === 'work' || isCustom) && !!liveEarningsStartDate();

        if (!active) {
            stopLiveEarnings();
            wrap.style.display = 'none';
            return;
        }
        wrap.style.display = 'flex';
        tickLiveEarnings(); // sofort den echten (ggf. bereits aufgelaufenen) Stand zeigen
        if (!_liveEarningsTimer) {
            _liveEarningsTimer = setInterval(tickLiveEarnings, wageDisplayConfig().intervalMs);
        }
    }

    // Live-Vorschau der Netto-Arbeitszeit (Start→Ende minus Pause), spiegelt exakt
    // die Buchungslogik aus handleEntry(). Nur bei Zeit-Typen (Arbeit/Custom).
    function updateEntryDuration() {
        if (typeof updateLiveEarnings === 'function') updateLiveEarnings();
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

    // renderMiniCalendar() zeichnete bis v6.3.5 ein farbiges Kaestchen je Tag in
    // #miniCalGrid. Das Raster gab es nur in der Monatsansicht; dort steht jetzt
    // mcRenderCalendar() (monthcompare.js), das zusaetzlich die Tageslaenge zeigt.


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
                    { kind: 'keys', label: qhL('Kürzel', 'Shortcuts'), items: [
                        { keys: ['Enter'], text: qhL('Eintrag speichern — aus jedem Feld', 'Save entry — from any field') },
                        { keys: ['Ctrl', 'Enter'], text: qhL('Speichern von überall auf der Seite (Kürzel aktiviert)', 'Save from anywhere on the page (shortcuts enabled)') }
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
                return { icon: 'performance', title: qhL('Bilanz', 'Summary'),
                    sub: qhL('Was in einem Zeitraum herauskam', 'What a period added up to'),
                    groups: [{ kind: 'list', label: qhL('Inhalt', 'Contents'), items: [
                        { text: qhL('Saldo, Soll und Ist, Rhythmus und Aufteilung der Stunden.', 'Balance, target vs. actual, rhythm and how the hours split.') },
                        { text: qhL('Urlaub gegen das Kalenderjahr und die Prüfung nach Arbeitszeitgesetz.', 'Vacation against the calendar year and the Working Hours Act check.') },
                        { text: qhL('Heatmaps, Histogramme und Projekte stehen unter „Diagramme“.', 'Heatmaps, histograms and projects live under “Charts”.') }
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


    function calculateStreak() {
        if (!data.entries || data.entries.length === 0) return { current: 0, best: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Alle Eintrags-Daten bis heute (unique) an Arbeitstagen, sortiert newest→oldest.
        // Zukunftseinträge — z. B. geplante Urlaubstage — dürfen weder die aktuelle
        // Serie starten noch die persönliche Bestmarke vorzeitig erhöhen.
        const entryDates = [...new Set(data.entries.map(e => {
            const parts = String(e.date || '').slice(0, 10).split('-').map(Number);
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            d.setHours(0, 0, 0, 0);
            return Number.isFinite(d.getTime()) ? d.getTime() : null;
        }).filter(ts => ts !== null))].filter(ts => {
            const dow = new Date(ts).getDay();
            return ts <= today.getTime() && dow !== 0 && dow !== 6;
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
            rec.lang = mwlLocale();
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
