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
    