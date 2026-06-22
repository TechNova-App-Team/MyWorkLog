// ═══ CORE: DASHBOARD-UI ═══
    // --- UI UPDATES (Dashboard) ---
    function updateUI() {
        // Load bar chart settings
        const barSettings = JSON.parse(localStorage.getItem('tt_bar_chart_settings') || '{"barHeight":32,"showLabels":true,"showAnimation":true,"borderRadius":8}');
        const chartContainer = document.getElementById('donutChartContainer');
        if (chartContainer) {
            chartContainer.style.height = barSettings.barHeight + 'px';
            chartContainer.style.borderRadius = barSettings.borderRadius + 'px';
        }
        const labels = document.querySelectorAll('.segment-label');
        labels.forEach(label => {
            label.style.display = barSettings.showLabels ? 'block' : 'none';
        });

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
            else if(e.type==='vacation' && entryYear === currentYear) { vacSum += e.worked; usedVacationDays += (typeof getVacationMode === 'function' && getVacationMode() === 'hours') ? (parseFloat(e.expected) || 0) : 1; }
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
        const totalRounded = (typeof roundHours === 'function') ? roundHours(total, 2) : total;
        const totalStr = (totalRounded>=0?'+':'') + totalRounded.toFixed(2) + 'h';
        animateDashboardValue(totEl, totalStr);
        totEl.style.color = total>=0 ? 'var(--primary)' : 'var(--danger)';
        totEl.className = 'counter-animate ' + (total >= 0 ? 'kpi-value-positive' : 'kpi-value-negative');

        const avg = countDays > 0 ? totalWorked/countDays : 0;
        const avgRounded = (typeof roundHours === 'function') ? roundHours(avg, 1) : avg;
        document.getElementById('valAvg').innerText = avgRounded.toFixed(1) + 'h';

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
            const projRounded = (typeof roundHours === 'function') ? roundHours(projected, 1) : projected;
            projEl.innerText = (projRounded>=0?'+':'') + projRounded.toFixed(1) + 'h';
            projEl.className = 'projection-badge ' + (projected >= 0 ? 'positive' : 'negative');

            // Konfidenz-Label basierend auf Datenmenge
            const confidence = totalWorkDays >= 60 ? '●●●' : totalWorkDays >= 40 ? '●●○' : '●○○';
            const confLabel = totalWorkDays >= 60 ? 'Hoch' : totalWorkDays >= 40 ? 'Mittel' : 'Niedrig';
            const endStr = forecastEnd.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
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
        vacBar.style.width = `${Math.min(vacPct, 100)}%`;
        if (vacPct > 90) vacBar.style.background = 'var(--danger)';
        else if (vacPct > 70) vacBar.style.background = '#f59e0b';
        else vacBar.style.background = 'var(--success)';

        // ─── VACATION PACING ───
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        const yearProgress = (now - startOfYear) / (endOfYear - startOfYear);
        const yearPct      = Math.round(yearProgress * 100);
        const pace = (yearProgress > 0.02 && totalVacation > 0) ? (vacPct / 100) / yearProgress : null;

        const pacingBlock = document.getElementById('vacPacingBlock');
        if (pacingBlock) {
            pacingBlock.style.display = '';

            const yearBar    = document.getElementById('vacYearBar');
            const yearPctEl  = document.getElementById('vacYearPct');
            const paceDot    = document.getElementById('vacPaceDot');
            const paceLabel  = document.getElementById('vacPaceLabel');
            const prognoseEl = document.getElementById('vacPacePrognose');
            const coHint     = document.getElementById('vacCarriedOverHint');
            const coVal      = document.getElementById('vacCarriedOverVal');
            const arcFill    = document.getElementById('vacArcFill');
            const arcPctTxt  = document.getElementById('vacArcPct');

            if (yearBar) yearBar.style.width = yearPct + '%';
            if (yearPctEl) yearPctEl.textContent = yearPct + '%';
            // Arc: circumference = 2π×32 ≈ 201
            if (arcFill) { const offset = 201 - (yearPct / 100) * 201; arcFill.style.strokeDashoffset = offset; }
            if (arcPctTxt) arcPctTxt.textContent = yearPct + '%';

            // Status
            let statusText = 'Ausgeglichen', statusColor = 'var(--primary)';
            if (pace !== null) {
                if      (pace < 0.45) { statusText = 'Sehr sparsam';  statusColor = '#06b6d4'; }
                else if (pace < 0.80) { statusText = 'Sparsam';       statusColor = 'var(--success)'; }
                else if (pace < 1.20) { statusText = 'Ausgeglichen';  statusColor = 'var(--primary)'; }
                else if (pace < 1.60) { statusText = 'Entspannt';     statusColor = '#f59e0b'; }
                else                  { statusText = 'Kritisch';      statusColor = 'var(--danger)'; }
            }
            if (paceDot)   { paceDot.style.background = statusColor; paceDot.style.boxShadow = `0 0 5px ${statusColor}`; }
            if (paceLabel) { paceLabel.textContent = statusText; paceLabel.style.color = statusColor; }

            // Prognose
            if (prognoseEl && pace !== null && yearProgress > 0.05) {
                const projUsage   = usedVacation / yearProgress;
                const projRemain  = Math.round((totalVacation - projUsage) * 10) / 10;
                const u           = vacMode === 'hours' ? 'h' : 'T.';
                if (projRemain > 0) {
                    prognoseEl.textContent = `≈ +${projRemain}${u} übrig`;
                    prognoseEl.style.color = 'var(--success)';
                } else if (projRemain < 0) {
                    prognoseEl.textContent = `≈ ${Math.abs(projRemain)}${u} fehlen`;
                    prognoseEl.style.color = 'var(--danger)';
                } else {
                    prognoseEl.textContent = 'exakt aufgebraucht';
                    prognoseEl.style.color = 'var(--text-faint)';
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

            // History-view "Verbraucht" bar (different IDs to avoid duplicate-ID clash)
            const histBar  = document.getElementById('vacHistBar');
            const histUsed = document.getElementById('vacHistUsed');
            if (histBar) {
                histBar.style.width = Math.min(vacPct, 100) + '%';
                histBar.style.background = vacPct > 90 ? 'var(--danger)' : vacPct > 70 ? '#f59e0b' : 'var(--primary)';
            }
            if (histUsed) {
                const dashVacEl = document.getElementById('valVacationUsed');
                if (dashVacEl) histUsed.textContent = dashVacEl.innerText;
            }
        }

        // Mini Week Progress Dots (Mo-Fr)
        if (typeof renderWeekDots === 'function') renderWeekDots();

        renderLists();
        renderTrend(trendData, 'trendChart', true, null, ascEntries);
        renderDonutModern(workSum, vacSum, sickSum, schoolSum, holidaySum);
        
        // Update NEW Features
        if (typeof updateDailySummary === 'function') updateDailySummary();
        if (typeof updateWeeklyGoals === 'function') updateWeeklyGoals();
        if (typeof updateLastActivities === 'function') updateLastActivities();
        if (typeof updateMoodStats === 'function') updateMoodStats();
        if (typeof updateProductivityScore === 'function') updateProductivityScore();
        
        // Update Advanced Dashboard Widgets
        if (typeof renderQuickTemplates === 'function') renderQuickTemplates();
    }
    