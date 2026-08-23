// ═══ CORE: YEAR-MONTH-STATS ═══
    // renderMonthComparisonBlock() und renderMonthWeeksList() standen hier bis
    // v6.3.5. Beide zeichneten denselben Monatsvergleich ein zweites bzw.
    // drittes Mal; die Monatsansicht baut ihn jetzt einmal (monthcompare.js).

    function parseTime(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }
    function updateYearSelector() {
        const select = document.getElementById('yearSelector');
        if (!select) return;
        
        // Bestimme verfügbare Jahre aus den Daten
        const years = new Set();
        data.entries.forEach(e => {
            const year = new Date(e.date).getFullYear();
            years.add(year);
        });
        
        // Aktuelles Jahr hinzufügen
        years.add(new Date().getFullYear());
        
        // Jahre sortieren (aufsteigend)
        const sortedYears = Array.from(years).sort((a, b) => a - b);
        
        // Select füllen
        let html = '';
        sortedYears.forEach(year => {
            const selected = year === selectedYearForView ? 'selected' : '';
            html += `<option value="${year}" ${selected}>${year}</option>`;
        });
        
        select.innerHTML = html;
    }
    
    function onYearSelectorChange() {
        const select = document.getElementById('yearSelector');
        selectedYearForView = parseInt(select.value);
        renderYearView();
    }
    
    
    function calculateYearlyStats(year = new Date().getFullYear()) {
        const daysByMonth = {};
        let totalWorked = 0;
        let workDays = 0;
        let vacationDays = 0;
        let holidayDays = 0;
        let totalSaldo = 0;
        const weeklyDiffs = {};
        let bestWeek = 0;
        let bestWeekValue = 0;
        
        // Initialisiere Monate
        for (let i = 0; i < 12; i++) {
            daysByMonth[i] = { worked: 0, saldo: 0, count: 0, days: [], vacationDays: 0, holidayDays: 0 };
        }
        
        // Durchlaufe alle Einträge
        data.entries.forEach(e => {
            const entryDate = new Date(e.date);
            if (entryDate.getFullYear() !== year) return;
            
            const month = entryDate.getMonth();
            const week = getWeek(entryDate);
            
            daysByMonth[month].worked += e.worked;
            daysByMonth[month].saldo += e.diff;
            daysByMonth[month].count++;
            daysByMonth[month].days.push({
                date: e.date,
                diff: e.diff,
                worked: e.worked,
                type: e.type
            });
            
            totalWorked += e.worked;
            totalSaldo += e.diff;
            
            if (e.type === 'work') {
                workDays++;
            } else if (e.type === 'vacation') {
                vacationDays++;
                daysByMonth[month].vacationDays++;
            } else if (e.type === 'gleittag') {
                // Gleittag: zählt nicht als Urlaub/Feiertag
            } else if (e.type === 'holiday') {
                holidayDays++;
                daysByMonth[month].holidayDays++;
            }
            
            // Wöchentliche Diffs
            if (!weeklyDiffs[week]) weeklyDiffs[week] = 0;
            weeklyDiffs[week] += e.diff;
        });
        
        // Beste Woche finden
        for (const week in weeklyDiffs) {
            if (weeklyDiffs[week] > bestWeekValue) {
                bestWeek = week;
                bestWeekValue = weeklyDiffs[week];
            }
        }
        
        const avgDaily = workDays > 0 ? totalWorked / workDays : 0;
        
        return {
            totalWorked,
            avgDaily,
            endSaldo: totalSaldo,
            bestWeek,
            bestWeekValue,
            daysByMonth,
            workDays,
            vacationDays,
            holidayDays,
            weeklyDiffs
        };
    }
    
    function renderYearHeatmap(yearStats, year = new Date().getFullYear()) {
        const container = document.getElementById('yearHeatmap');
        const now = new Date();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        
        // Erstelle Map aller Einträge für schnelle Zugriffe
        const entryMap = {};
        data.entries.forEach(e => {
            if (new Date(e.date).getFullYear() === year) {
                entryMap[e.date] = e;
            }
        });
        
        let html = '<div style="display:grid; gap:2rem;">';
        
        // Für jeden Monat
        for (let month = 0; month < 12; month++) {
            const monthDate = new Date(year, month, 1);
            const monthName = monthDate.toLocaleDateString(mwlLocale(), { month: 'long', year: 'numeric' });
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            html += `<div>
                <h4 style="font-size:0.95rem; margin-bottom:1rem; color:var(--text-main);">${monthName}</h4>
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:6px;">`;
            
            // Wochentag-Header (Mo-So)
            const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const startDayOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
            
            // Leere Zellen am Anfang
            for (let i = 0; i < startDayOffset; i++) {
                html += '<div style="width:32px; height:32px;"></div>';
            }
            
            // Tage des Monats
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const entry = entryMap[dateStr];
                const cellDate = new Date(year, month, day);
                const dayOfWeek = cellDate.getDay();
                const isWeekend = (data.settings.hours[dayOfWeek] || 0) <= 0 && (dayOfWeek === 0 || dayOfWeek === 6);
                
                let color = '#475569'; // Grau = kein Eintrag
                let opacity = '0.3';
                
                if (entry) {
                    // PRIORTÄT 1: Prüfe auf Urlaub/Feiertag
                    if (entry.type === 'vacation') {
                        color = '#3b82f6'; // Blau für Urlaub 🌴
                        opacity = '0.85';
                    } else if (entry.type === 'holiday') {
                        color = '#f59e0b'; // Orange für Feiertag 🏖️
                        opacity = '0.85';
                    } else if (entry.type === 'sick') {
                        color = '#ec4899'; // Pink für Krankheit
                        opacity = '0.75';
                    } else if (entry.type === 'gleittag') {
                        color = '#f59e0b'; // Amber für Gleittag ⚡
                        opacity = '0.75';
                    } else {
                        // PRIORITÄT 2: Farbe basierend auf diff (Saldo)
                        const diff = entry.diff;
                        if (diff < -1) {
                            color = '#ef4444'; // Rot = sehr negativ
                            opacity = '0.8';
                        } else if (diff < 0) {
                            color = '#ef4444'; // Rot = negativ
                            opacity = '0.5';
                        } else if (diff < 0.5) {
                            color = '#fbbf24'; // Gelb = leicht positiv
                            opacity = '0.6';
                        } else if (diff < 3) {
                            color = '#10b981'; // Grün = positiv
                            opacity = '0.7';
                        } else {
                            color = 'var(--primary)'; // Lila = sehr positiv
                            opacity = '0.9';
                        }
                    }
                } else if (isWeekend) {
                    opacity = '0.15';
                }
                
                const isToday = cellDate.toDateString() === now.toDateString();
                const border = isToday ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)';
                let typeLabel = '';
                if (entry) {
                    if (entry.type === 'vacation') typeLabel = ' Urlaub';
                    else if (entry.type === 'holiday') typeLabel = ' Feiertag';
                    else if (entry.type === 'sick') typeLabel = ' Krankheit';
                    else if (entry.type === 'school') typeLabel = ' Schule';
                    else if (entry.type === 'gleittag') typeLabel = ' Gleittag';
                    else typeLabel = ' Arbeit';
                }
                const tooltip = entry ? `${entry.worked.toFixed(1)}h (${entry.diff >= 0 ? '+' : ''}${entry.diff.toFixed(1)}h)${typeLabel}` : 'Kein Eintrag';
                
                html += `
                    <div style="width:32px; height:32px; background:${color}; opacity:${opacity}; border-radius:6px; border:${border}; cursor:pointer; transition:all 0.2s;" 
                         title="${dateStr}: ${tooltip}"
                         onmouseover="this.style.transform='scale(1.2)'; this.style.zIndex='10';"
                         onmouseout="this.style.transform='scale(1)'; this.style.zIndex='0';">
                    </div>
                `;
            }
            
            html += '</div></div>';
        }
        
        html += '</div>';
        container.innerHTML = html;
    }
    
    function generateYearInsights(yearStats, year = new Date().getFullYear()) {
        const container = document.getElementById('yearInsights');
        const insights = [];
        
        // Insight 1: Durchschnitt
        const avgMonthly = yearStats.totalWorked / 12;
        insights.push({
            icon: '📊',
            title: 'Durchschnittliche Monatsleistung',
            value: `${avgMonthly.toFixed(1)}h`,
            description: `Du arbeitest durchschnittlich ${avgMonthly.toFixed(1)} Stunden pro Monat.`
        });
        
        // Insight 2: Beste Leistung
        const maxMonth = Math.max(...Object.values(yearStats.daysByMonth).map(m => m.worked));
        const bestMonth = Object.entries(yearStats.daysByMonth).find(([_, m]) => m.worked === maxMonth);
        if (bestMonth) {
            const monthName = new Date(year, parseInt(bestMonth[0]), 1).toLocaleDateString(mwlLocale(), { month: 'long' });
            insights.push({
                icon: '🏆',
                title: 'Dein stärkster Monat',
                value: monthName,
                description: `${bestMonth[1].worked.toFixed(0)}h Arbeit, ${bestMonth[1].count} Arbeitstage.`
            });
        }
        
        // Insight 3: Saldo-Trend
        const saldoTrend = yearStats.endSaldo > 0 ? 'positiv' : (yearStats.endSaldo < 0 ? 'negativ' : 'ausgeglichen');
        const trendEmoji = yearStats.endSaldo > 0 ? '📈' : (yearStats.endSaldo < 0 ? '📉' : '➡️');
        insights.push({
            icon: trendEmoji,
            title: 'Jahres-Saldo Trend',
            value: (yearStats.endSaldo >= 0 ? '+' : '') + yearStats.endSaldo.toFixed(1) + 'h',
            description: `Dein Jahres-Saldo ist ${saldoTrend}. Solltest du mehr arbeiten, um auszugleichen?`,
            color: yearStats.endSaldo > 0 ? 'var(--success)' : (yearStats.endSaldo < 0 ? 'var(--danger)' : 'var(--primary)')
        });
        
        // Insight 4: Konsistenz
        const consistencyScore = (yearStats.workDays / 250) * 100; // 250 Arbeitstage im Jahr
        const consistencyLevel = consistencyScore > 80 ? 'Sehr gut' : (consistencyScore > 60 ? 'Gut' : 'Könnte besser sein');
        insights.push({
            icon: '⭐',
            title: 'Konsistenz-Score',
            value: `${Math.min(100, consistencyScore).toFixed(0)}%`,
            description: `Du warst ${consistencyLevel} dabei. ${consistencyScore < 80 ? 'Versuche, regelmäßiger zu arbeiten!' : 'Großartig!'}`
        });
        
        // Insight 5: Beste Woche
        insights.push({
            icon: '🎯',
            title: 'Deine produktivste Woche',
            value: `KW ${yearStats.bestWeek}`,
            description: `${yearStats.bestWeekValue.toFixed(1)}h Saldo in dieser Woche. Das war ein Spitzenwert!`
        });
        
        // Insight 6: Prognose (nur für aktuelles Jahr)
        if (year === new Date().getFullYear()) {
            const now = new Date();
            const daysLeft = 365 - Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24));
            const avgDaily = yearStats.avgDaily;
            const projectedSaldo = yearStats.endSaldo + (daysLeft * (avgDaily - 8) / 5);
            insights.push({
                icon: '🔮',
                title: 'Jahresende Prognose',
                value: (projectedSaldo >= 0 ? '+' : '') + projectedSaldo.toFixed(1) + 'h',
                description: `Basierend auf deinem aktuellen Tempo wirst du mit einem Saldo von ${projectedSaldo.toFixed(1)}h das Jahr beenden.`
            });
        }
        
        // HTML rendern
        let html = '';
        insights.forEach((insight, i) => {
            const color = insight.color || (i % 3 === 0 ? 'var(--primary)' : (i % 3 === 1 ? 'var(--success)' : '#06b6d4'));
            html += `
                <div class="card" style="border-left: 5px solid ${color}; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -10px; right: -10px; font-size: 3rem; opacity: 0.1;">${mwlIconFromEmoji(insight.icon, 44)}</div>
                    
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">${mwlIconFromEmoji(insight.icon, 13)} ${insight.title}</div>
                    <div style="font-size:2rem; font-weight:800; color:${color}; margin:10px 0; font-family:var(--font-mono);">${insight.value}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">${insight.description}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    function renderMonthlyComparison(yearStats, year = new Date().getFullYear()) {
        const container = document.getElementById('yearMonthlyComparison');
        const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
        
        let html = '';
        for (let i = 0; i < 12; i++) {
            const monthData = yearStats.daysByMonth[i];
            const maxWorked = Math.max(...Object.values(yearStats.daysByMonth).map(m => m.worked)) || 1;
            const barHeight = (monthData.worked / maxWorked) * 100;
            
            const saldoColor = monthData.saldo > 0 ? 'var(--success)' : (monthData.saldo < 0 ? 'var(--danger)' : '#64748b');
            
            html += `
                <div style="display:flex; flex-direction:column; align-items:center; padding:15px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px solid rgba(255,255,255,0.1); transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'; this.style.transform='translateY(-4px)';" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.transform='translateY(0)';">
                    <div style="font-weight:700; color:var(--text-main); margin-bottom:8px;">${monthNames[i]}</div>
                    <div style="width:40px; height:60px; background:var(--primary); border-radius:6px; opacity:0.6; margin-bottom:10px; position:relative;" title="${monthData.worked.toFixed(0)}h">
                        <div style="width:100%; height:${barHeight}%; background:linear-gradient(180deg, var(--primary), rgba(var(--primary-rgb),0.5)); border-radius:6px; position:absolute; bottom:0; transition:all 0.3s;"></div>
                    </div>
                    <div style="font-size:0.85rem; font-weight:600; color:var(--text-main); font-family:var(--font-mono);">${monthData.worked.toFixed(0)}h</div>
                    <div style="font-size:0.75rem; color:${saldoColor}; margin-top:4px; font-family:var(--font-mono);">${monthData.saldo >= 0 ? '+' : ''}${monthData.saldo.toFixed(1)}h</div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    }
