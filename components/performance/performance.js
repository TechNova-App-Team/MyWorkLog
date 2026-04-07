// ═══ PERFORMANCE MODULE ═══

    function calculatePerformanceData() {
        const now = new Date();
        const oneDay = 86400000;
        const oneWeek = 7 * oneDay;

        const weeklyData = [];
        let weekTotalActual = 0;
        let weekTotalExpected = 0;
        let earliestDate = now.getTime() - (90 * oneDay);

        for (let i = 0; i < 8; i++) {
            const startOfWeek = new Date(now.getTime() - (i * oneWeek));
            startOfWeek.setHours(0, 0, 0, 0);
            startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() || 7) + 1); 

            const weekEntries = data.entries.filter(e => {
                const eDate = new Date(e.date);
                return eDate >= startOfWeek && eDate < new Date(startOfWeek.getTime() + oneWeek);
            });

            let actual = 0;
            let expected = 0;

            weekEntries.forEach(e => {
                // Schultag = voller Arbeitstag (Ausbildung) → expected als actual
                const effectiveWorked = (e.type === 'school') ? (e.expected || e.worked) : e.worked;
                actual += effectiveWorked;
                expected += e.expected;

                const eTime = new Date(e.date).getTime();
                if (eTime >= earliestDate) {
                    weekTotalActual += effectiveWorked;
                    weekTotalExpected += e.expected;
                }
            });
            
            const weekNum = getWeek(startOfWeek);
            weeklyData.unshift({ 
                actual: actual, 
                expected: expected, 
                label: `KW ${weekNum}`, 
                date: startOfWeek.getTime()
            });
        }
        
        const monthlyTrend = {};
        for (let i = 0; i < 12; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
            monthlyTrend[monthKey] = { diff: 0, label: monthDate.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) };
        }
        
        data.entries.forEach(e => {
            const date = new Date(e.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (monthlyTrend[monthKey]) {
                monthlyTrend[monthKey].diff += e.diff;
            }
        });
        
        const monthlyTrendData = Object.values(monthlyTrend).reverse();
        
        const performanceScore = weekTotalExpected > 0 ? (weekTotalActual / weekTotalExpected) * 100 : 0;
        const totalMonthlyDiff = monthlyTrendData.reduce((sum, item) => sum + item.diff, 0);
        const validMonthlyCount = monthlyTrendData.filter(d => d.diff !== 0).length || 1; 
        const avgMonthlyDiff = totalMonthlyDiff / validMonthlyCount;
        
        const projectData = calculateProjectDistribution(); 
        const deepMetrics = calculateDeepPerformanceMetrics(data.entries.filter(e => new Date(e.date).getTime() >= earliestDate)); // Nur die letzten 90 Tage

        return {
            weekly: weeklyData,
            monthly: monthlyTrendData,
            kpiScore: performanceScore,
            kpiExpected90: weekTotalExpected,
            kpiAvgMonthlyDiff: avgMonthlyDiff,
            projectData: projectData, 
            deepMetrics: deepMetrics // NEU: Deep Metrics
        };
    }

    function calculateDeepPerformanceData() {
        // 1. Produktiver Wochentag (0=So, 6=Sa)
        const dayStats = [
            { totalDiff: 0, count: 0, label: 'So' }, // 0
            { totalDiff: 0, count: 0, label: 'Mo' }, // 1
            { totalDiff: 0, count: 0, label: 'Di' }, // 2
            { totalDiff: 0, count: 0, label: 'Mi' }, // 3
            { totalDiff: 0, count: 0, label: 'Do' }, // 4
            { totalDiff: 0, count: 0, label: 'Fr' }, // 5
            { totalDiff: 0, count: 0, label: 'Sa' }  // 6
        ];
        
        // 2. Produktivitäts-Heatmap (Stunden 8 bis 23 Uhr)
        // Index 0 = 8 Uhr, Index 15 = 23 Uhr
        const hourlyStats = new Array(16).fill(null).map(() => ({ totalWorked: 0, count: 0 }));
        
        data.entries.forEach(e => {
            const d = new Date(e.date);
            const dayIndex = d.getDay();
            
            // Wochentag Statistik (nur Arbeitstage mit Soll-Zeit > 0 und Diff != 0)
            if (data.settings.hours[dayIndex] > 0 && e.diff !== 0) {
                 dayStats[dayIndex].totalDiff += e.diff;
                 dayStats[dayIndex].count++;
            }

            // Stunden-Statistik (Nur 'work'-Typ, mit tatsächlicher Zeitangabe)
            if (e.type === 'work' && e.shiftStart) { // Nutze shiftStart als Indikator für Zeitangabe
                try {
                    // Verwende e.shiftStart und e.shiftEnd für die Heatmap-Berechnung
                    const timeStartStr = e.shiftStart;
                    const timeEndStr = e.shiftEnd; // Oder Ende der Schicht + Pause
                    
                    if (!timeStartStr || !timeEndStr) return;

                    let [h1, m1] = timeStartStr.split(':').map(Number);
                    let [h2, m2] = timeEndStr.split(':').map(Number);
                    
                    let netWorkedMinutes = e.worked * 60;
                    
                    let startTimeMins = h1 * 60 + m1;
                    let endTimeMins = h2 * 60 + m2;

                    if (endTimeMins < startTimeMins) endTimeMins += 24 * 60; // Nächster Tag

                    const totalShiftMinutes = endTimeMins - startTimeMins;
                    if (totalShiftMinutes <= 0) return;

                    // Start- und End-Stunde (8:00 = 8)
                    const startHour = Math.floor(startTimeMins / 60);
                    const endHour = Math.ceil(endTimeMins / 60);

                    for (let hour = startHour; hour < endHour; hour++) {
                        const effectiveHour = hour % 24;
                        
                        if (effectiveHour >= 8 && effectiveHour <= 23) {
                            // Index ist Stunde - 8 (8 Uhr = 0, 23 Uhr = 15)
                            const index = effectiveHour - 8;
                            
                            const hourStartMins = hour * 60;
                            const hourEndMins = (hour + 1) * 60;
                            
                            // Berechne die Schnittmenge der Schichtzeit mit der aktuellen Stunde (in Minuten)
                            const segmentStart = Math.max(startTimeMins, hourStartMins);
                            const segmentEnd = Math.min(endTimeMins, hourEndMins);
                            const minutesInHour = Math.max(0, segmentEnd - segmentStart);
                            
                            // Anteil der Bruttoarbeitszeit, die in diese Stunde fällt
                            const workedFraction = minutesInHour / totalShiftMinutes;
                            
                            // Verteile die NETTO-Arbeitszeit basierend auf dem Anteil
                            const workedInThisHour = workedFraction * (e.worked * 60) / 60; // In Stunden
                            
                            if (index >= 0 && index < hourlyStats.length) {
                                hourlyStats[index].totalWorked += workedInThisHour;
                                hourlyStats[index].count++;
                            }
                        }
                    }
                } catch(e) {
                    console.error("Fehler bei Heatmap-Berechnung:", e);
                }
            }
        });
        
        return { dayStats, hourlyStats };
    }

    function renderPerformanceView(perfData, deepData) {
        
        // KPI Render
        const scoreEl = document.getElementById('kpiPerformance');
        scoreEl.innerText = `${perfData.kpiScore.toFixed(0)}%`;
        scoreEl.style.color = perfData.kpiScore >= 100 ? 'var(--success)' : (perfData.kpiScore >= 95 ? '#fbbf24' : 'var(--danger)');

        const avgDiffEl = document.getElementById('kpiAvgMonthlyDiff');
        avgDiffEl.innerText = `${perfData.kpiAvgMonthlyDiff >= 0 ? '+' : ''}${perfData.kpiAvgMonthlyDiff.toFixed(1)}h`;
        avgDiffEl.style.color = perfData.kpiAvgMonthlyDiff >= 0 ? 'var(--primary)' : 'var(--danger)';
        
        // NEU: Deep Metrics
        document.getElementById('kpiAvgStartTime').innerText = perfData.deepMetrics.avgStartTime;
        document.getElementById('kpiAvgFocus').innerText = perfData.deepMetrics.avgFocusHours + 'h';
        
        // **********************************************
        // NEU GESTALTET: Wöchentlicher Soll/Ist Vergleich
        // **********************************************
        const barContainer = document.getElementById('chartWeeklyPerformance');
        const weeklyBars = perfData.weekly;
        
        // Maximalwert für die Skalierung (entweder höchste Sollzeit oder höchste Istzeit)
        const maxScaleValue = Math.max(1, ...weeklyBars.map(d => Math.max(d.expected, d.actual))); 
        
        let stackedBarHTML = '';

        weeklyBars.forEach((d) => {
            const actualPct = (d.actual / maxScaleValue) * 100;
            const expectedPct = (d.expected / maxScaleValue) * 100;
            const diff = d.actual - d.expected;
            
            // Textfarbe basierend auf Saldo-Differenz
            const valueColor = diff >= 0 ? 'var(--success)' : 'var(--danger)';
            const valueLabel = `${d.actual.toFixed(1)}h / ${d.expected.toFixed(1)}h (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}h)`;

            stackedBarHTML += `
                <div class="week-row">
                    <div class="week-label">${d.label}</div>
                    <div class="bar-container-wrapper" title="${valueLabel}">
                        <div class="bar-expected-bg" style="width: ${expectedPct}%; background: var(--expected-color); opacity: 0.2; position: absolute; height: 100%;"></div>
                        
                        <div class="bar-actual-fill" style="width: ${Math.min(actualPct, expectedPct)}%;"></div>
                        
                        ${
                            diff > 0 
                            ? `<div class="bar-actual-fill" style="width: ${actualPct - expectedPct}%; left: ${expectedPct}%; background: var(--success);"></div>` 
                            : ''
                        }
                         ${
                            diff < 0 && actualPct < expectedPct
                            ? `<div style="position: absolute; left: ${actualPct}%; width: ${expectedPct - actualPct}%; height: 100%; background: var(--danger); opacity: 0.5;"></div>`
                            : ''
                        }
                        
                        <div class="bar-target-overlay" style="left: ${expectedPct}%; border-color: ${diff >= 0 ? 'var(--success)' : 'var(--danger)'};"></div>
                    </div>
                    <div class="bar-value-label" style="color: ${valueColor}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}h</div>
                </div>
            `;
        });

        barContainer.innerHTML = stackedBarHTML;
        // **********************************************
        
        // NEU: Projekt-Verteilung (Donut Chart)
        const projectData = perfData.projectData.distribution;
        const totalWork = perfData.projectData.totalWorkHours;
        const projectContainer = document.getElementById('chartProjectDistribution');
        const legendEl = document.getElementById('projectDonutLegend');

        if (totalWork === 0 || projectData.length === 0) {
            projectContainer.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:180px; color:#555;">Keine Projekt-Daten erfasst (Typ: Arbeit).</div>';
            legendEl.innerHTML = '';
        } else {
        
            const c = 251; // Umfang des Kreises (2 * 40 * PI gerundet)
            let currentOffset = 0;
            let donutHTML = '';
            let legendHTML = '';
            const colors = ['#f59e0b', '#06b6d4', '#ec4899', '#3b82f6', '#10b981', '#a855f7']; // Farbpalette

            // Base Ring (Hintergrund)
            donutHTML += `<circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="12"></circle>`;

            projectData.forEach((project, index) => {
                const percentage = project.hours / totalWork;
                const dash = percentage * c;
                const color = colors[index % colors.length];

                donutHTML += `
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="${color}" stroke-width="12"
                        stroke-dasharray="${dash} ${c}" stroke-dashoffset="-${currentOffset}">
                        <title>${project.name}: ${project.hours.toFixed(1)}h (${(percentage * 100).toFixed(1)}%)</title>
                    </circle>`;
                
                legendHTML += `
                    <div class="legend-item"><div class="dot" style="background:${color}"></div> ${project.name} (${(percentage * 100).toFixed(0)}%)</div>`;

                currentOffset += dash;
            });

            projectContainer.innerHTML = `
                 <svg width="150" height="150" viewBox="0 0 100 100" style="transform: rotate(-90deg); margin: 0 auto;">
                    ${donutHTML}
                 </svg>
            `;
            legendEl.innerHTML = legendHTML;
        }

        // Saldo Trend (unverändert)
        const monthlyDiffs = perfData.monthly.map(d => d.diff);
        const monthlyLabels = perfData.monthly.map(d => d.label);
        
        const trendContainer = document.getElementById('chartMonthlyTrend');
        if (monthlyDiffs.length < 2) {
            trendContainer.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#555;">Für den Trend werden mehr Daten benötigt (mind. 2 Monate).</div>';
        } else {

            const h = 200;
            const w = trendContainer.clientWidth;
            
            const max = Math.max(...monthlyDiffs);
            const min = Math.min(...monthlyDiffs);
            const range = max - min || 1;
            
            let path = '';
            monthlyDiffs.forEach((val, i) => {
                const x = (i / (monthlyDiffs.length - 1)) * w;
                const y = h - ((val - min) / range * (h - 40)) - 20;
                path += `${i===0?'M':'L'} ${x} ${y} `;
            });

            const zeroLineY = h - ((0 - min) / range * (h - 40)) - 20;
            
            trendContainer.innerHTML = `
                <svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="overflow: visible;">
                    <line x1="0" y1="${zeroLineY}" x2="${w}" y2="${zeroLineY}" stroke="rgba(148, 163, 184, 0.4)" stroke-dasharray="4" stroke-width="1"/>
                    
                    <path d="${path}" class="trend-line" style="stroke: var(--primary); stroke-width: 3;" />
                    
                    ${monthlyDiffs.map((val, i) => {
                        const x = (i / (monthlyDiffs.length - 1)) * w;
                        const y = h - ((val - min) / range * (h - 40)) - 20;
                        return `
                            <circle cx="${x}" cy="${y}" r="4" fill="var(--primary)"/>
                            <text x="${x}" y="${h + 15}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${monthlyLabels[i]}</text>
                        `;
                    }).join('')}
                </svg>
            `;
        }
        
        // --- DEEP DIVE RENDER ---
        
        // 1. Produktiver Wochentag (Horizontaler Bar Chart)
        const dayChartContainer = document.getElementById('chartProductivityByDay');
        const dayStats = deepData.dayStats.filter(function(d, i) {
            return (data.settings.hours[i] || 0) > 0;
        });
        const dayAverages = dayStats.map(d => ({
            day: d.label,
            avgDiff: d.count > 0 ? d.totalDiff / d.count : 0
        }));
        
        // Findet den Maximalwert (Absolut) über alle positiven und negativen Durchschnitte
        const maxAbsDiff = Math.max(1, ...dayAverages.map(d => Math.abs(d.avgDiff))); 
        const chartScaleFactor = 50 / maxAbsDiff; // Max 50% der Chart-Breite

        let horizontalBarHTML = '';

        dayAverages.forEach((dayData) => {
            const avgDiff = dayData.avgDiff;
            const absWidth = Math.abs(avgDiff) * chartScaleFactor;
            const isPositive = avgDiff >= 0;
            const barColor = isPositive ? 'var(--success)' : 'var(--danger)'; 
            const displayValue = (avgDiff >= 0 ? '+' : '') + avgDiff.toFixed(2) + 'h';
            
            // Die Bar-Chart-Area hat 100% Breite, die Mitte ist 50%.
            
            horizontalBarHTML += `
                <div class="horizontal-bar-row">
                    <div class="bar-label-day">${dayData.day}</div>
                    <div class="bar-chart-area">
                        <div class="bar-zero-line"></div>
                        <div class="bar-value ${isPositive ? 'positive' : 'negative'}"
                             style="width: ${absWidth}%; ${isPositive ? 'left: 50%;' : 'right: 50%; background: ' + barColor};"
                             title="Ø Saldo: ${displayValue}">
                        </div>
                    </div>
                    <div class="bar-text-value" style="color: ${barColor}">${displayValue}</div>
                </div>
            `;
        });
        
        dayChartContainer.innerHTML = horizontalBarHTML;


        // 2. Produktivitäts-Heatmap (FIXED)
        const heatmapContainer = document.getElementById('chartProductivityHeatmap');
        const hourlyStats = deepData.hourlyStats;
        
        // Find Max for scaling colors
        const maxWorked = Math.max(0.1, ...hourlyStats.map(h => h.count > 0 ? h.totalWorked / h.count : 0));
        
        let heatmapHTML = '';
        
        // Render Hour Labels (8:00 - 23:00)
        heatmapHTML += '<div style="display:grid; grid-template-columns: repeat(16, 1fr); gap:5px; margin-bottom:5px; margin-top:20px;">';
        for (let i = 8; i <= 23; i++) {
             // Mobile Optimierung: Bei kleinerem Bildschirm nur jede 2. Stunde anzeigen
             if (window.innerWidth >= 1024 || (i % 2 === 0)) {
                heatmapHTML += `<span class="heatmap-label">${i}:00</span>`;
             }
        }
        heatmapHTML += '</div>';

        // Helper for color
        function getHeatmapColor(ratio) {
             const alpha = 0.15 + ratio * 0.7; // Startet bei 15%, max 85%
             return `rgba(var(--primary-rgb), ${alpha})`; 
        }

        // Render Cells
        heatmapHTML += `<div class="heatmap-grid" style="grid-template-columns: repeat(${window.innerWidth < 1024 ? 8 : 16}, 1fr);">`;
        for (let i = 0; i < 16; i++) {
            const avgWorked = hourlyStats[i].count > 0 ? hourlyStats[i].totalWorked / hourlyStats[i].count : 0;
            const hour = 8 + i;
            
            const ratio = avgWorked / maxWorked;
            
            let color = 'rgba(255,255,255, 0.03)';
            let displayValue = avgWorked > 0 ? avgWorked.toFixed(1) + 'h' : '0.0h';

            if (ratio > 0.05) {
                 color = getHeatmapColor(ratio);
            }
            
            heatmapHTML += `
                <div class="heatmap-cell" style="background-color: ${color};" title="Ø ${displayValue} gearbeitet um ${hour}:00">
                    
                </div>
            `;
        }
        
        heatmapHTML += '</div>';
        heatmapContainer.innerHTML = heatmapHTML;

        // Mood Overview rendern (Stimmungs-Übersicht im Performance Tab)
        renderMoodOverview();
    }

