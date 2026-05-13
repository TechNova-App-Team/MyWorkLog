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
    