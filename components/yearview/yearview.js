// ═══ YEARVIEW MODULE ═══

    function renderYearView() {
        // 1. Jahr-Selector aktualisieren
        updateYearSelector();
        
        // 2. Jahres-Statistiken berechnen
        const yearStats = calculateYearlyStats(selectedYearForView);
        
        // 3. KPIs aktualisieren
        document.getElementById('yearTotalWorked').innerText = yearStats.totalWorked.toFixed(1) + 'h';
        document.getElementById('yearAvgDaily').innerText = yearStats.avgDaily.toFixed(1) + 'h';
        document.getElementById('yearEndSaldo').innerText = (yearStats.endSaldo >= 0 ? '+' : '') + yearStats.endSaldo.toFixed(1) + 'h';
        document.getElementById('yearEndSaldo').style.color = yearStats.endSaldo >= 0 ? '#06b6d4' : 'var(--danger)';
        document.getElementById('yearBestWeek').innerText = `KW ${yearStats.bestWeek}`;
        document.getElementById('yearBestWeekValue').innerText = (yearStats.bestWeekValue >= 0 ? '+' : '') + yearStats.bestWeekValue.toFixed(1) + 'h';
        document.getElementById('yearVacationDays').innerText = yearStats.vacationDays;
        document.getElementById('yearHolidayDays').innerText = yearStats.holidayDays;
        
        // 4. Heatmap rendern
        renderYearHeatmap(yearStats, selectedYearForView);
        
        // 5. Insights generieren
        generateYearInsights(yearStats, selectedYearForView);
        
        // 6. Monats-Vergleich rendern
        renderMonthlyComparison(yearStats, selectedYearForView);
    }

