// ═══ CORE: DASHBOARD-UI ═══
    // --- UI UPDATES (Dashboard) ---
    function updateUI() {
        // Bar-Chart-Layout (Höhe/Radius/Gap/Labels/Glow) zentral anwenden
        if (typeof applyBarChartSettings === 'function') applyBarChartSettings();

        // Weather-based greeting (calls updateGreetingWeather)
        updateGreetingWeather();

        const trashBadge = document.getElementById('trashCountBadge');
        if (trashBadge) trashBadge.textContent = (Array.isArray(data.trash) ? data.trash.length : 0);
        
        const now = new Date();
        const currentYear = now.getFullYear(); // Für Jahr-spezifische Statistiken
        let week=0, month=0, total=0, totalWorked=0, countDays=0;
        let sickSum=0, vacSum=0, workSum=0, schoolSum=0, holidaySum=0;
        // Parallel: distinkte Tage pro Kategorie (für Verteilung im Tage-Modus)
        const sickDaysSet=new Set(), vacDaysSet=new Set(), workDaysSet=new Set(), schoolDaysSet=new Set(), holidayDaysSet=new Set();
        let usedVacationDays = 0;
        let trendData = [];
        let runningTotal = 0;

        let ascEntries = [...data.entries].sort((a,b) => new Date(a.date) - new Date(b.date));
        
        ascEntries.forEach(e => {
            const entryYear = new Date(e.date).getFullYear();
            runningTotal += e.diff;
            trendData.push({ date: e.date, diff: e.diff, total: runningTotal, type: e.type, worked: e.worked });
            // Nur Arbeits-Summen den aktuellen Trend trennen (für alle Jahre)
            if(e.type==='sick') { sickSum += e.worked; sickDaysSet.add(e.date); }
            else if(e.type==='vacation' && entryYear === currentYear) { vacSum += e.worked; vacDaysSet.add(e.date); usedVacationDays += (typeof getVacationMode === 'function' && getVacationMode() === 'hours') ? (parseFloat(e.expected) || 0) : 1; }
            else if(e.type==='gleittag') { /* Gleittag: kein Urlaubstag, Überstunden werden in diff abgezogen */ }
            else if(e.type==='school') { schoolSum += (e.expected || e.worked); schoolDaysSet.add(e.date); } // Schultag = voller Arbeitstag
            else if(e.type==='holiday' && entryYear === currentYear) { holidaySum += e.worked; holidayDaysSet.add(e.date); }
            else if(e.type==='korrektur') { /* neutral: nur e.diff zählt in den Gesamt-Saldo, kein Arbeitstag */ }
            else { workSum += e.worked; workDaysSet.add(e.date); }
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

            // Korrektur zählt NUR in den Gesamt-Saldo (oben), nicht in die Wochen-/Monats-Ringe
            if(e.type !== 'korrektur' && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
                month += e.diff;
                if(getWeek(d) === getWeek(now)) week += e.diff;
            }
        });

        // ─── SALDO-KARTEN (Woche / Monat / gesamt) ───────────────────
        // Alle drei zeigen dieselbe Groesse auf wachsendem Horizont und
        // benutzen denselben Abweichungsbalken. Die Skala kommt aus dem
        // Wochensoll des Nutzers, damit ein Teilzeit-Azubi nicht gegen
        // eine fest verdrahtete 40-Stunden-Woche gemessen wird.
        const weekTarget  = (typeof weeklyTargetHours === 'function') ? weeklyTargetHours() : 40;
        const monthTarget = weekTarget * (52 / 12);          // 4,33 Wochen
        const nf1 = new Intl.NumberFormat(mwlLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

        // Voller Ausschlag ist NICHT mehr die halbe Wochen-/Monatsvorgabe.
        // Die war fuer die meisten Nutzer viel zu gross: Bei ±20 h Skala
        // bewegt sich eine Stunde Abweichung um zweieinhalb Prozent der
        // Spurbreite, also sichtbar gar nicht. Stattdessen waechst die
        // Skala mit dem Nutzer mit (deviationScale in charts.js).
        setDeviation('devWeek',  'valWeek',  week,  deviationScale('week', week), 1);
        setDeviation('devMonth', 'valMonth', month, deviationScale('month', month), 1);

        // Gesamt-Saldo waechst ueber Jahre. Feste Skala wuerde dauerhaft
        // anschlagen, deshalb waechst sie in Wochenschritten mit — immer
        // mindestens eine Woche, damit kleine Salden nicht zappeln.
        const totalScale = Math.max(weekTarget, Math.ceil(Math.abs(total) / weekTarget) * weekTarget);
        setDeviation('devTotal', 'valTotal', total, totalScale, 2);

        const wkTargetEl = document.getElementById('kpiWeekTarget');
        if (wkTargetEl)  wkTargetEl.textContent = nf1.format(weekTarget) + ' h';
        const moTargetEl = document.getElementById('kpiMonthTarget');
        if (moTargetEl)  moTargetEl.textContent = nf1.format(monthTarget) + ' h';

        // Meta rechts oben: welcher Zeitraum ueberhaupt gemeint ist.
        const wkMetaEl = document.getElementById('kpiWeekMeta');
        if (wkMetaEl)  wkMetaEl.textContent = 'KW ' + getWeek(now);
        const moMetaEl = document.getElementById('kpiMonthMeta');
        if (moMetaEl)  moMetaEl.textContent = now.toLocaleDateString(mwlLocale(), { month: 'short' }).replace('.', '');

        const avg = countDays > 0 ? totalWorked/countDays : 0;
        const avgRounded = (typeof roundHours === 'function') ? roundHours(avg, 1) : avg;
        const avgEl = document.getElementById('valAvg');
        if (avgEl) avgEl.textContent = nf1.format(avgRounded) + 'h';

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
            // classList statt className: ein Vollzuweisen wuerde die
            // Layout-Klasse der Fusszeile (kpi-v2__foot-num) mit
            // wegloeschen, und die Zahl faellt aus der Zahlenskala.
            projEl.classList.remove('positive', 'negative');
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
            const projRounded = (typeof roundHours === 'function') ? roundHours(projected, 1) : projected;
            projEl.innerText = (projRounded>=0?'+':'−') + nf1.format(Math.abs(projRounded)) + ' h';
            projEl.classList.toggle('positive', projected >= 0);
            projEl.classList.toggle('negative', projected < 0);

            // Konfidenz-Label basierend auf Datenmenge
            const confidence = totalWorkDays >= 60 ? '●●●' : totalWorkDays >= 40 ? '●●○' : '●○○';
            const confLabel = totalWorkDays >= 60 ? 'Hoch' : totalWorkDays >= 40 ? 'Mittel' : 'Niedrig';
            const endStr = forecastEnd.toLocaleDateString(mwlLocale(), { day: '2-digit', month: 'short' });
            projEl.title = `Prognose bis ${endStr} (30 Arbeitstage)\nGenauigkeit: ${confLabel} ${confidence} (${totalWorkDays} Tage Datenbasis)\nØ ${avgDiffPerWorkDay >= 0 ? '+' : ''}${(avgDiffPerWorkDay * 60).toFixed(0)} min/Tag`;
        }

        const carriedOver    = parseFloat(data.settings.vacation.carriedOver || 0) || 0;
        const totalVacation  = parseFloat(data.settings.vacation.total) + carriedOver;
        const usedVacation   = data.settings.vacation.used;
        const vacMode        = (typeof getVacationMode === 'function') ? getVacationMode() : 'days';
        const unit           = vacMode === 'hours' ? 'h' : 'T';
        const vacEl          = document.getElementById('valVacationUsed');
        const vacLabelEls    = document.querySelectorAll('.kpi-stats__vacation-label');
        if (vacMode === 'hours') {
            const usedH = Math.round(usedVacation * 10) / 10;
            const totH  = Math.round(totalVacation * 10) / 10;
            const refH  = (typeof getVacationRefHours === 'function') ? getVacationRefHours() : 8;
            const eqDays = refH > 0 ? (usedVacation / refH).toFixed(1) : '—';
            const eqTotalDays = refH > 0 ? Math.round(totalVacation / refH) : '—';
            vacEl.innerText = `${usedH}h / ${totH}h`;
            vacEl.title = `≈ ${eqDays} / ${eqTotalDays} Tage (Referenz ${Math.round(refH * 100) / 100}h/Tag)`;
            vacLabelEls.forEach(el => { el.textContent = 'Urlaubsstunden'; });
        } else {
            vacEl.innerText = `${usedVacation} / ${totalVacation}`;
            vacEl.title = carriedOver > 0 ? `inkl. ${carriedOver} Übertrag aus Vorjahr` : '';
            vacLabelEls.forEach(el => { el.textContent = 'Urlaubstage'; });
        }
        const vacPct = totalVacation > 0 ? (usedVacation / totalVacation) * 100 : 0;
        const vacBar = document.getElementById('vacationProgressBar');
        if (vacBar) {
            vacBar.style.width = `${Math.min(vacPct, 100)}%`;
            // Farbe ueber Klassen statt inline: der Balken traegt den
            // Akzent (neutraler Fortschritt) und wechselt erst in eine
            // Warnrolle, wenn das Kontingent knapp wird. Urlaub zu nehmen
            // ist kein Fehler — ihn aufzubrauchen schon eine Info wert.
            vacBar.style.background = '';
            vacBar.classList.toggle('is-crit', vacPct > 90);
            vacBar.classList.toggle('is-warn', vacPct > 70 && vacPct <= 90);
        }

        // Verbleibendes Kontingent — die Zahl, die man auf dem Dashboard
        // sucht ("wie viel Urlaub hab ich noch"). Vorher stand dort nur
        // "verbraucht / gesamt" und man musste selbst subtrahieren.
        const vacLeftEl  = document.getElementById('valVacationLeft');
        const vacUnitEl  = document.getElementById('valVacationLeftUnit');
        if (vacLeftEl) {
            const remaining = Math.max(0, totalVacation - usedVacation);
            const remStr = vacMode === 'hours'
                ? new Intl.NumberFormat(mwlLocale(), { maximumFractionDigits: 1 }).format(remaining)
                : String(Math.round(remaining * 10) / 10);
            // Einheit als eigener Knoten, sonst frisst textContent sie.
            vacLeftEl.textContent = remStr;
            const u = document.createElement('span');
            u.className = 'kpi-v2__unit';
            u.id = 'valVacationLeftUnit';
            u.textContent = vacMode === 'hours' ? 'h' : (remaining === 1 ? 'Tag' : 'Tage');
            vacLeftEl.appendChild(u);
        } else if (vacUnitEl) {
            vacUnitEl.textContent = unit;
        }

        // ─── VACATION PACING ───
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        const yearProgress = (now - startOfYear) / (endOfYear - startOfYear);
        const yearPct      = Math.round(yearProgress * 100);
        const pace = (yearProgress > 0.02 && totalVacation > 0) ? (vacPct / 100) / yearProgress : null;

        const pacingBlock = document.getElementById('vacPacingBlock');
        if (pacingBlock) {
            pacingBlock.style.display = '';

            const paceDot      = document.getElementById('vacPaceDot');
            const paceLabel    = document.getElementById('vacPaceLabel');
            const coHint       = document.getElementById('vacCarriedOverHint');
            const coVal        = document.getElementById('vacCarriedOverVal');
            // Left ring: Urlaub verbraucht %  (circumference 2π×50 ≈ 314)
            const arcFill      = document.getElementById('vacArcFill');
            const arcPctTxt    = document.getElementById('vacArcPct');
            const arcDetail    = document.getElementById('vacArcDetail');
            // Right ring: Jahresverlauf %
            const yearArcFill  = document.getElementById('vacYearArcFill');
            const yearArcPct   = document.getElementById('vacYearArcPct');
            // Footer stats
            const remainEl     = document.getElementById('vacRemainVal');
            const prognoseYrEl = document.getElementById('vacPacePrognoseYear');

            const C = 314; // circumference r=50
            const vacUsedPct = Math.round(vacPct);

            // Left ring: vacation used
            if (arcFill)   arcFill.style.strokeDashoffset   = C - (Math.min(vacUsedPct, 100) / 100) * C;
            if (arcPctTxt) arcPctTxt.textContent = vacUsedPct + '%';
            if (arcDetail) {
                const dashVacEl = document.getElementById('valVacationUsed');
                if (dashVacEl) arcDetail.textContent = dashVacEl.innerText;
            }

            // Right ring: year progress
            if (yearArcFill) yearArcFill.style.strokeDashoffset = C - (yearPct / 100) * C;
            if (yearArcPct)  yearArcPct.textContent = yearPct + '%';

            // Status pill
            let statusText = 'Ausgeglichen', statusColor = 'var(--primary)';
            if (pace !== null) {
                if      (pace < 0.45) { statusText = 'Sehr sparsam';  statusColor = '#06b6d4'; }
                else if (pace < 0.80) { statusText = 'Sparsam';       statusColor = 'var(--success)'; }
                else if (pace < 1.20) { statusText = 'Ausgeglichen';  statusColor = 'var(--primary)'; }
                else if (pace < 1.60) { statusText = 'Entspannt';     statusColor = '#f59e0b'; }
                else                  { statusText = 'Kritisch';      statusColor = 'var(--danger)'; }
            }
            if (paceDot)   { paceDot.style.background = statusColor; paceDot.style.boxShadow = `0 0 8px ${statusColor}`; }
            if (paceLabel) { paceLabel.textContent = statusText; paceLabel.style.color = statusColor; }

            // Footer: aktuell verfügbar
            const actualRemain = Math.round((totalVacation - usedVacation) * 10) / 10;
            const u = vacMode === 'hours' ? 'h' : ' T.';
            if (remainEl) {
                remainEl.textContent = actualRemain + u;
                remainEl.style.color = actualRemain <= 0 ? 'var(--danger)' : 'var(--text-main)';
            }

            // Footer: Jahresende-Prognose
            if (prognoseYrEl && pace !== null && yearProgress > 0.05) {
                const projUsage  = usedVacation / yearProgress;
                const projRemain = Math.round((totalVacation - projUsage) * 10) / 10;
                if (projRemain > 0) {
                    prognoseYrEl.textContent = '+' + projRemain + u + ' ungenutzt';
                    prognoseYrEl.style.color = 'var(--success)';
                } else if (projRemain < 0) {
                    prognoseYrEl.textContent = Math.abs(projRemain) + u + ' fehlen';
                    prognoseYrEl.style.color = 'var(--danger)';
                } else {
                    prognoseYrEl.textContent = 'exakt aufgebraucht';
                    prognoseYrEl.style.color = 'var(--text-muted)';
                }
            }

            // Carry-over hint
            if (coHint && coVal) {
                if (carriedOver > 0) {
                    coHint.style.display = '';
                    coVal.textContent = carriedOver + (vacMode === 'hours' ? 'h' : ' Tage');
                } else {
                    coHint.style.display = 'none';
                }
            }
        }

        // Mini Week Progress Dots (Mo-Fr)
        if (typeof renderWeekDots === 'function') renderWeekDots();

        renderLists();
        renderTrend(trendData, 'trendChart', true, null, ascEntries);
        // Arbeitszeit-Verteilung wahlweise in Stunden (Default) oder distinkten Tagen
        if ((data.settings.distributionUnit || 'hours') === 'days') {
            renderDonutModern(workDaysSet.size, vacDaysSet.size, sickDaysSet.size, schoolDaysSet.size, holidayDaysSet.size);
        } else {
            renderDonutModern(workSum, vacSum, sickSum, schoolSum, holidaySum);
        }
        
        // Update NEW Features
        if (typeof updateDailySummary === 'function') updateDailySummary();
        if (typeof updateWeeklyGoals === 'function') updateWeeklyGoals();
        if (typeof updateLastActivities === 'function') updateLastActivities();
        if (typeof updateMoodStats === 'function') updateMoodStats();
        if (typeof updateProductivityScore === 'function') updateProductivityScore();
        
        // Update Advanced Dashboard Widgets
        if (typeof renderQuickTemplates === 'function') renderQuickTemplates();
    }
    