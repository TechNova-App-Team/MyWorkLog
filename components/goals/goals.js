// ═══ GOALS MODULE ═══

    function renderGoalsView() {
        var goalsListEl = document.getElementById('goalsList');
        if (!goalsListEl) return;

        var totalWorked = calculateGoalValue('TOTAL_WORKED_HOURS');
        var totalDiff = calculateGoalValue('TOTAL_DIFF_HOURS');
        var positiveWeeks = calculateGoalValue('POSITIVE_WEEKS');

        // ── KPI Values ──
        var diffEl = document.getElementById('goalKpiTotalDiff');
        if (diffEl) {
            diffEl.innerText = (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(1) + 'h';
            diffEl.style.color = totalDiff >= 0 ? '#10b981' : '#f43f5e';
        }
        var workedEl = document.getElementById('goalKpiTotalWorked');
        if (workedEl) workedEl.innerText = totalWorked.toFixed(1) + 'h';
        var weeksEl = document.getElementById('goalKpiPositiveWeeks');
        if (weeksEl) weeksEl.innerText = positiveWeeks;

        // ── KPI Bars ──
        var barSaldo = document.getElementById('gcBarSaldo');
        if (barSaldo) {
            var saldoPct = Math.max(0, Math.min(100, 50 + (totalDiff / Math.max(totalWorked, 100)) * 50));
            barSaldo.style.width = saldoPct + '%';
        }
        var barWorked = document.getElementById('gcBarWorked');
        if (barWorked) barWorked.style.width = Math.min((totalWorked / 1500) * 100, 100) + '%';

        // ── Header Progress Ring ──
        var goals = (data.settings && data.settings.goals) ? data.settings.goals : [];
        var totalGoals = goals.length;
        var achievedGoals = 0;
        for (var i = 0; i < goals.length; i++) {
            var cur = calculateGoalValue(goals[i].type);
            if (cur / goals[i].target >= 1) achievedGoals++;
        }
        var goalPct = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;

        var ringEl = document.getElementById('ringGoalsProgress');
        if (ringEl) {
            var circumference = 326.7;
            ringEl.style.strokeDashoffset = circumference - (goalPct / 100) * circumference;
        }
        var pctTextEl = document.getElementById('goalsProgress');
        if (pctTextEl) pctTextEl.textContent = Math.round(goalPct) + '%';

        // ── Weekly Goals ──
        renderWeeklyGoals();

        // ── Goal Cards ──
        var html = '';
        for (var g = 0; g < goals.length; g++) {
            var goal = goals[g];
            var current = calculateGoalValue(goal.type);
            var progress = Math.min((current / goal.target) * 100, 100);
            var achieved = progress >= 100;
            var color = getGoalColor(goal.type);
            var unit = getGoalUnit(goal.type);

            var currentDisplay = current.toFixed(1);
            if (goal.type === 'TOTAL_DIFF_HOURS') {
                currentDisplay = (current >= 0 ? '+' : '') + current.toFixed(1);
            }

            var circ = 251.2;
            var radius = 40;
            var dashOff = achieved ? 0 : circ - (progress / 100) * circ;

            html += '<div class="goal-card' + (achieved ? ' achieved' : '') + '" style="border-left-color:' + color + '">'
                + '<button class="goal-delete-btn" onclick="deleteCustomGoal(' + goal.id + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'
                + '<div class="progress-ring-goal" style="position:relative;">'
                +   '<svg width="60" height="60" viewBox="0 0 100 100">'
                +     '<circle cx="50" cy="50" r="' + radius + '" stroke="rgba(255,255,255,0.04)" stroke-width="4"></circle>'
                +     '<circle cx="50" cy="50" r="' + radius + '" stroke="' + color + '" stroke-width="4" stroke-dasharray="' + circ + '" stroke-dashoffset="' + dashOff + '" stroke-linecap="round" fill="none" style="filter:drop-shadow(0 0 6px ' + color + '40)"></circle>'
                +   '</svg>'
                +   '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--gc-mono);font-size:0.9rem;font-weight:700;color:' + color + '">' + progress.toFixed(0) + '%</div>'
                + '</div>'
                + '<div class="goal-title">' + safeHTML(goal.title) + '</div>'
                + '<div class="goal-status">' + currentDisplay + unit + ' / ' + goal.target.toFixed(1) + unit + '</div>'
                + '<div class="goal-status" style="color:' + (achieved ? '#10b981' : color) + ';margin-top:8px;font-weight:600">'
                +   (achieved ? mwlIcon('checkCircle', 13) + ' Ziel erreicht!' : '● Aktiv')
                + '</div>'
                + '</div>';
        }
        goalsListEl.innerHTML = html;
    }

    function renderWeeklyGoals() {
        var now = new Date();
        var dayOfWeek = now.getDay();
        var monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);
        var sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        var weeklyHours = 0;
        var weeklyDaysSet = {};
        for (var i = 0; i < data.entries.length; i++) {
            var e = data.entries[i];
            var d = new Date(e.date);
            if (d >= monday && d <= sunday) {
                weeklyHours += e.worked;
                if (e.type === 'work') weeklyDaysSet[e.date] = true;
            }
        }
        var weeklyDays = Object.keys(weeklyDaysSet).length;

        var hPct = Math.min((weeklyHours / 40) * 100, 100);
        var dPct = Math.min((weeklyDays / 5) * 100, 100);

        var el;
        el = document.getElementById('weeklyHoursTarget');
        if (el) el.innerText = weeklyHours.toFixed(1) + ' / 40h';
        el = document.getElementById('weeklyHoursPct');
        if (el) el.innerText = Math.round(hPct) + '%';
        el = document.getElementById('weeklyHoursBar');
        if (el) el.style.width = hPct + '%';

        el = document.getElementById('weeklyDaysTarget');
        if (el) el.innerText = weeklyDays + ' / 5 Tage';
        el = document.getElementById('weeklyDaysPct');
        if (el) el.innerText = Math.round(dPct) + '%';
        el = document.getElementById('weeklyDaysBar');
        if (el) el.style.width = dPct + '%';
    }

    function getGoalColor(type) {
        var themePrimary = (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#a855f7').trim();
        switch (type) {
            case 'TOTAL_WORKED_HOURS': return '#f59e0b';
            case 'TOTAL_DIFF_HOURS':   return themePrimary;
            case 'POSITIVE_WEEKS':     return '#10b981';
            case 'PERFECT_SHIFTS':     return '#06b6d4';
            default:                   return themePrimary;
        }
    }

    function calculateGoalValue(type) {
        if (!data || !data.entries) return 0;
        switch (type) {
            case 'TOTAL_WORKED_HOURS':
                return data.entries.reduce(function(s, e) { return s + e.worked; }, 0);
            case 'TOTAL_DIFF_HOURS':
                return data.entries.reduce(function(s, e) { return s + e.diff; }, 0);
            case 'POSITIVE_WEEKS':
                return (typeof calculatePositiveWeeks === 'function') ? calculatePositiveWeeks() : 0;
            case 'PERFECT_SHIFTS':
                return data.entries.filter(function(e) { return e.type === 'work' && Math.abs(e.diff) < 0.1; }).length;
            default:
                return 0;
        }
    }
