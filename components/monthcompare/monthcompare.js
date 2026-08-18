// ═══ MONTHCOMPARE MODULE ═══

    function renderMonthCompareView() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // 1. Fülle Monats-Dropdown (nur wenn leer)
        const select = document.getElementById('monthCompareSelect');
        if (select && select.children.length === 0) {
            for (let m = 0; m < 12; m++) {
                const date = new Date(currentYear, m, 1);
                const option = document.createElement('option');
                option.value = m;
                const monthName = date.toLocaleDateString(mwlLocale(), { month: 'long', year: 'numeric' });
                option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                select.appendChild(option);
            }
            select.value = currentMonth;
        }
        
        // 2. Nutze den gewählten Monat aus dem Dropdown (nicht den aktuellen!)
        const selectedMonth = select ? parseInt(select.value) : currentMonth;
        
        // 3. Berechne Stats für gewählten Monat
        const stats = calculateMonthStats(selectedMonth, currentYear);
        const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
        const prevYear = selectedMonth === 0 ? currentYear - 1 : currentYear;
        const prevStats = calculateMonthStats(prevMonth, prevYear);
        
        // 4. Berechne Jahres-Durchschnitt
        let yearTotal = 0, monthCount = 0;
        for (let m = 0; m < 12; m++) {
            const mStats = calculateMonthStats(m, currentYear);
            if (mStats.worked > 0) {
                yearTotal += mStats.worked;
                monthCount++;
            }
        }
        const yearAvg = monthCount > 0 ? yearTotal / monthCount : 0;
        
        // 5. Update KPIs
        document.getElementById('mcCurrentWorked').innerText = stats.worked.toFixed(1) + 'h';
        document.getElementById('mcCurrentDays').innerText = stats.workDays;
        
        document.getElementById('mcPrevWorked').innerText = prevStats.worked.toFixed(1) + 'h';
        const diff = stats.worked - prevStats.worked;
        const percent = prevStats.worked > 0 ? ((diff / prevStats.worked) * 100).toFixed(0) : 0;
        document.getElementById('mcComparisonDiff').innerText = (diff >= 0 ? '+' : '') + diff.toFixed(1) + 'h';
        document.getElementById('mcComparisonDiff').style.color = diff >= 0 ? 'var(--success)' : 'var(--danger)';
        document.getElementById('mcComparisonPercent').innerText = `(${percent}%)`;
        document.getElementById('mcComparisonPercent').style.color = diff >= 0 ? 'var(--success)' : 'var(--danger)';
        
        document.getElementById('mcYearAvg').innerText = yearAvg.toFixed(1) + 'h';
        
        // Saldo-Trend
        const saldoTrend = stats.saldo;
        document.getElementById('mcSaldoTrend').innerText = (saldoTrend >= 0 ? '+' : '') + saldoTrend.toFixed(1) + 'h';
        document.getElementById('mcSaldoTrend').style.color = saldoTrend >= 0 ? 'var(--success)' : 'var(--danger)';
        const trendLabel = saldoTrend > 10 ? '🚀 Sehr positiv' : (saldoTrend > 5 ? '📈 Gut' : (saldoTrend > 0 ? '✅ Positiv' : (saldoTrend > -5 ? '⚠️ Leicht negativ' : (saldoTrend > -10 ? '📉 Negativ' : '🔴 Kritisch'))));
        document.getElementById('mcSaldoTrendLabel').innerText = trendLabel;
        
        // Sparkline for Saldo-Trend in Monatscontrol
        const sparkContainer = document.getElementById('mcSaldoSparkline');
        if (sparkContainer && stats.dailyDiffs && stats.dailyDiffs.length > 1) {
            const sparkVals = [];
            let sparkRunning = 0;
            stats.dailyDiffs.forEach(d => { sparkRunning += d; sparkVals.push(sparkRunning); });
            const sparkMax = Math.max(...sparkVals);
            const sparkMin = Math.min(...sparkVals);
            const sparkRange = sparkMax - sparkMin || 1;
            const sw = sparkContainer.clientWidth || 180;
            const sh = 40;
            let sparkPath = '';
            sparkVals.forEach((v, i) => {
                const x = (i / (sparkVals.length - 1)) * sw;
                const y = sh - ((v - sparkMin) / sparkRange * (sh - 6)) - 3;
                sparkPath += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)} ${y.toFixed(1)} `;
            });
            const lastColor = sparkVals[sparkVals.length - 1] >= 0 ? '#10b981' : '#ef4444';
            sparkContainer.innerHTML = `<svg viewBox="0 0 ${sw} ${sh}" style="width:100%;height:100%;" preserveAspectRatio="none">
                <path d="${sparkPath} L ${sw} ${sh} L 0 ${sh} Z" fill="${lastColor}" opacity="0.1"/>
                <path d="${sparkPath}" fill="none" stroke="${lastColor}" stroke-width="1.5" stroke-linecap="round"/>
            </svg>`;
            
            document.getElementById('mcSaldoPeak').innerText = 'Hoch: +' + sparkMax.toFixed(1) + 'h';
            document.getElementById('mcSaldoLow').innerText = 'Tief: ' + (sparkMin >= 0 ? '+' : '') + sparkMin.toFixed(1) + 'h';
        }
        
        // 5. Render Monatsvergleich-Block (kompakt)
        renderMonthComparisonBlock(stats, prevStats, selectedMonth, prevMonth);
        
        // 5b. Render Wochenanalyse
        renderMonthWeeksList(stats);
        
        // 6. Update Statistiken
        document.getElementById('mcStats_workDays').innerText = stats.workDays;
        document.getElementById('mcStats_avgPerDay').innerText = stats.workDays > 0 ? (stats.worked / stats.workDays).toFixed(1) + 'h' : '0h';
        document.getElementById('mcStats_schoolDays').innerText = stats.schoolDays;
        document.getElementById('mcStats_vacationDays').innerText = stats.vacationDays;
        document.getElementById('mcStats_sickDays').innerText = stats.sickDays;
        document.getElementById('mcStats_holidayDays').innerText = stats.holidayDays;
        
        // 7. Render Charts
        renderMonthCompareCharts(stats, prevStats);
    }
    function renderMonthCompareCharts(currentStats, prevStats) {
        // Circular Chart für Current
        const maxHours = Math.max(currentStats.worked, prevStats.worked, 200);
        const currentPercent = (currentStats.worked / maxHours) * 100;
        const prevPercent = (prevStats.worked / maxHours) * 100;
        
        const currentDasharray = (currentPercent * 502) / 100;
        const prevDasharray = (prevPercent * 502) / 100;
        
        document.getElementById('mcChartCurrent').setAttribute('stroke-dasharray', `${currentDasharray} 502`);
        document.getElementById('mcChartPrev').setAttribute('stroke-dasharray', `${prevDasharray} 502`);
        
        document.getElementById('mcChartCurrentValue').innerText = currentStats.worked.toFixed(1) + 'h';
        document.getElementById('mcChartPrevValue').innerText = prevStats.worked.toFixed(1) + 'h';
    }

