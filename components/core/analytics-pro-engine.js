// ═══ CORE: ANALYTICS-PRO-ENGINE ═══
    // ════════════════════════════════════════════════════════════════
    // ██  ANALYTICS PRO — Premium Data Visualization Engine        ██
    // ██  Chart.js powered, real-time data from MyWorkLog          ██
    // ════════════════════════════════════════════════════════════════

    // Chart instance registry (destroy before recreate)
    const apCharts = {};

    function apDestroy(id) {
        if (apCharts[id]) { apCharts[id].destroy(); delete apCharts[id]; }
    }

    // Global Chart.js defaults for Analytics Pro
    function apChartDefaults() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        return {
            gridColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)',
            textColor: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
            primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7',
            primaryRgb: getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').trim() || '168,85,247',
            cyan: '#06b6d4',
            green: '#22c55e',
            amber: '#f59e0b',
            red: '#ef4444',
            blue: '#3b82f6',
            pink: '#ec4899',
            indigo: '#6366f1',
            fontFamily: "'Inter', sans-serif",
            monoFamily: "'JetBrains Mono', monospace",
            isLight
        };
    }
    let apCurrentPeriod = { saldo: 90, weekly: 12 };

    function apRenderPanel(tabId) {
        switch (tabId) {
            case 'overview':   apRenderOverview(); break;
            case 'saldo':      apRenderSaldo(); break;
            case 'heatmap':    apRenderHeatmap(); break;
            case 'weekly':     apRenderWeekly(); break;
            case 'monthly':    apRenderMonthly(); break;
            case 'projects':   apRenderProjects(); break;
            case 'weekday':    apRenderWeekday(); break;
            case 'distribution': apRenderDistribution(); break;
            case '3d':         apRender3D(); break;
            case 'galaxy':     apRenderGalaxy(); break;
        }
    }
    // ── Helper: Get entries sorted by date ──
    function apEntries() {
        return (data.entries || []).slice().sort((a, b) => a.date.localeCompare(b.date));
    }

    // ── Helper: Running saldo array ──
    function apRunningSaldo(entries) {
        let sum = 0;
        return entries.map(e => { sum += (e.diff || 0); return { date: e.date, saldo: sum, diff: e.diff, worked: e.worked, type: e.type }; });
    }

    // ── Helper: Group entries by key ──
    function apGroupBy(entries, keyFn) {
        const map = {};
        entries.forEach(e => {
            const k = keyFn(e);
            if (!map[k]) map[k] = [];
            map[k].push(e);
        });
        return map;
    }

    // ── Helper: Format hours ──
    function apFmtH(h) { return (h >= 0 ? '+' : '') + h.toFixed(2) + 'h'; }

    // ── Helper: Common chart options ──
    function apBaseOpts(cfg) {
        cfg = cfg || {};
        var d = apChartDefaults();
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: 'easeInOutQuart' },
            plugins: {
                legend: {
                    display: cfg.legend !== false,
                    labels: { color: d.textColor, font: { family: d.fontFamily, size: 11, weight: '600' }, padding: 16, usePointStyle: true, pointStyleWidth: 8 }
                },
                tooltip: {
                    backgroundColor: d.isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,18,0.95)',
                    titleColor: d.isLight ? '#1a1a2e' : '#fff',
                    bodyColor: d.isLight ? '#333' : 'rgba(255,255,255,0.8)',
                    borderColor: 'rgba(' + d.primaryRgb + ',0.2)',
                    borderWidth: 1,
                    cornerRadius: 10,
                    padding: 12,
                    titleFont: { family: d.fontFamily, size: 12, weight: '700' },
                    bodyFont: { family: d.monoFamily, size: 11 },
                    displayColors: true,
                    boxPadding: 4
                }
            },
            scales: cfg.noScales ? undefined : {
                x: {
                    grid: { color: d.gridColor, drawBorder: false },
                    ticks: { color: d.textColor, font: { family: d.fontFamily, size: 10 }, maxRotation: 45 }
                },
                y: {
                    grid: { color: d.gridColor, drawBorder: false },
                    ticks: { color: d.textColor, font: { family: d.monoFamily, size: 10 } }
                }
            }
        };
    }

    // ════════════════════════════════════════
    //  1. OVERVIEW PANEL
    // ════════════════════════════════════════
    function apRenderOverview() {
        var entries = apEntries();
        if (!entries.length) {
            document.getElementById('apKpiRow').innerHTML = '<div class="ap-empty"><div class="ap-empty-icon">📊</div>Noch keine Einträge vorhanden</div>';
            return;
        }
        var d = apChartDefaults();

        // KPIs
        var workE = entries.filter(function(e){ return e.type === 'work'; });
        var totalWorked = entries.reduce(function(s, e){ return s + (e.worked || 0); }, 0);
        var totalSaldo = entries.reduce(function(s, e){ return s + (e.diff || 0); }, 0);
        var avgDaily = workE.length ? (workE.reduce(function(s, e){ return s + (e.worked || 0); }, 0) / workE.length) : 0;
        var vacDays = entries.filter(function(e){ return e.type === 'vacation'; }).length;
        var sickDays = entries.filter(function(e){ return e.type === 'sick'; }).length;
        var uniqueMonths = new Set(entries.map(function(e){ return e.date.substring(0, 7); })).size;
        var streak = apCalcStreak(entries);

        document.getElementById('apKpiRow').innerHTML =
            '<div class="ap-kpi"><div class="ap-kpi-value">' + totalWorked.toFixed(1) + '</div><div class="ap-kpi-label">Stunden gesamt</div><div class="ap-kpi-sub">' + entries.length + ' Einträge</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value" style="' + (totalSaldo >= 0 ? '' : '-webkit-text-fill-color:#ef4444;') + '">' + apFmtH(totalSaldo) + '</div><div class="ap-kpi-label">Gleitzeit-Saldo</div><div class="ap-kpi-sub">' + (totalSaldo >= 0 ? 'Überstunden' : 'Minus') + '</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + avgDaily.toFixed(2) + '</div><div class="ap-kpi-label">⌀ Stunden/Tag</div><div class="ap-kpi-sub">Arbeitstage</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + vacDays + '</div><div class="ap-kpi-label">Urlaubstage</div><div class="ap-kpi-sub">' + sickDays + ' Krankheitstage</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + streak + '</div><div class="ap-kpi-label">Tage-Streak</div><div class="ap-kpi-sub">' + uniqueMonths + ' Monate aktiv</div></div>';

        // Overview Saldo (last 30 entries)
        var last30 = apRunningSaldo(entries).slice(-30);
        apDestroy('overviewSaldo');
        var ctx1 = document.getElementById('apChartOverviewSaldo');
        if (ctx1) {
            apCharts.overviewSaldo = new Chart(ctx1.getContext('2d'), {
                type: 'line',
                data: {
                    labels: last30.map(function(e){ var dt = new Date(e.date); return dt.toLocaleDateString('de-DE', {day:'2-digit', month:'short'}); }),
                    datasets: [{
                        label: 'Saldo',
                        data: last30.map(function(e){ return parseFloat(e.saldo.toFixed(2)); }),
                        borderColor: d.primary,
                        backgroundColor: 'rgba(' + d.primaryRgb + ',0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }

        // Overview Types Doughnut
        var typeCounts = {};
        entries.forEach(function(e) {
            var t = e.type || 'other';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        var typeLabels = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', sick: 'Krank', holiday: 'Feiertag', gleittag: 'Gleittag' };
        var typeColors = { work: d.primary, school: d.cyan, vacation: d.green, sick: d.red, holiday: d.amber, gleittag: d.indigo };

        apDestroy('overviewTypes');
        var ctx2 = document.getElementById('apChartOverviewTypes');
        if (ctx2) {
            apCharts.overviewTypes = new Chart(ctx2.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeCounts).map(function(k){ return typeLabels[k] || k; }),
                    datasets: [{
                        data: Object.values(typeCounts),
                        backgroundColor: Object.keys(typeCounts).map(function(k){ return typeColors[k] || '#666'; }),
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'right', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 12, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Mini heatmap
        apRenderMiniHeatmap(entries);
    }

    function apCalcStreak(entries) {
        var dates = new Set(entries.filter(function(e){ return e.type === 'work'; }).map(function(e){ return e.date; }));
        var streak = 0;
        var today = new Date();
        for (var i = 0; i < 365; i++) {
            var dd = new Date(today);
            dd.setDate(dd.getDate() - i);
            var dow = dd.getDay();
            if ((data.settings.hours[dow] || 0) <= 0) continue;
            var iso = dd.toISOString().split('T')[0];
            if (dates.has(iso)) streak++;
            else break;
        }
        return streak;
    }

    function apRenderMiniHeatmap(entries) {
        var container = document.getElementById('apMiniHeatmap');
        if (!container) return;
        var hoursMap = {};
        entries.forEach(function(e) { hoursMap[e.date] = (hoursMap[e.date] || 0) + (e.worked || 0); });

        var today = new Date();
        var oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        var dayLabels = ['', 'Mo', '', 'Mi', '', 'Fr', ''];
        var html = '';
        dayLabels.forEach(function(l) { html += '<div class="ap-heatmap-label">' + l + '</div>'; });

        var startDate = new Date(oneYearAgo);
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

        for (var w = 0; w < 53; w++) {
            for (var dd = 0; dd < 7; dd++) {
                var date = new Date(startDate);
                date.setDate(date.getDate() + w * 7 + dd);
                if (date > today) { html += '<div></div>'; continue; }
                var iso = date.toISOString().split('T')[0];
                var h = hoursMap[iso] || 0;
                var level = h === 0 ? 0 : h < 4 ? 1 : h < 7 ? 2 : h < 9 ? 3 : 4;
                html += '<div class="ap-heatmap-cell" data-level="' + level + '" title="' + date.toLocaleDateString('de-DE') + ': ' + h.toFixed(1) + 'h"></div>';
            }
        }

        html += '<div class="ap-heatmap-legend" style="grid-column: 1/-1;">Weniger ';
        [0,1,2,3,4].forEach(function(l) {
            var bg = l===0?'rgba(var(--primary-rgb),0.06)':l===1?'rgba(var(--primary-rgb),0.2)':l===2?'rgba(var(--primary-rgb),0.4)':l===3?'rgba(var(--primary-rgb),0.6)':'var(--primary)';
            html += '<span style="background:' + bg + '"></span>';
        });
        html += ' Mehr</div>';

        container.innerHTML = '<div class="ap-heatmap" style="grid-template-columns:30px repeat(53,1fr);">' + html + '</div>';
    }

    // ════════════════════════════════════════
    //  2. SALDO TREND PANEL
    // ════════════════════════════════════════
    function apRenderSaldo() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();
        var days = apCurrentPeriod.saldo;

        // Period selector
        var periodEl = document.getElementById('apSaldoPeriod');
        if (periodEl) {
            periodEl.innerHTML = [30,60,90,180,365,0].map(function(n) {
                return '<button class="ap-period-btn ' + (days===n?'active':'') + '" onclick="apCurrentPeriod.saldo=' + n + ';apRenderSaldo();">' + (n===0?'Alle':n+'d') + '</button>';
            }).join('');
        }

        var all = apRunningSaldo(entries);
        var sliced = days > 0 ? all.slice(-days) : all;

        // Cumulative saldo line
        apDestroy('saldo');
        var ctx = document.getElementById('apChartSaldo');
        if (ctx) {
            var saldoData = sliced.map(function(e){ return parseFloat(e.saldo.toFixed(2)); });
            var gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 350);
            gradient.addColorStop(0, 'rgba(' + d.primaryRgb + ',0.25)');
            gradient.addColorStop(1, 'rgba(' + d.primaryRgb + ',0.01)');

            apCharts.saldo = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: sliced.map(function(e){ return new Date(e.date).toLocaleDateString('de-DE', {day:'2-digit',month:'short'}); }),
                    datasets: [{
                        label: 'Kumulierter Saldo',
                        data: saldoData,
                        borderColor: d.primary,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.35,
                        pointRadius: sliced.length > 60 ? 0 : 3,
                        pointHoverRadius: 6,
                        borderWidth: 2.5
                    }, {
                        label: 'Nulllinie',
                        data: saldoData.map(function(){ return 0; }),
                        borderColor: 'rgba(255,255,255,0.15)',
                        borderDash: [5,5],
                        borderWidth: 1,
                        pointRadius: 0,
                        fill: false
                    }]
                },
                options: apBaseOpts()
            });
        }

        // Daily diff bar chart
        apDestroy('dailyDiff');
        var ctx2 = document.getElementById('apChartDailyDiff');
        if (ctx2) {
            apCharts.dailyDiff = new Chart(ctx2.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sliced.map(function(e){ return new Date(e.date).toLocaleDateString('de-DE', {day:'2-digit',month:'short'}); }),
                    datasets: [{
                        label: 'Tages-Diff',
                        data: sliced.map(function(e){ return parseFloat((e.diff||0).toFixed(2)); }),
                        backgroundColor: sliced.map(function(e){ return (e.diff||0) >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'; }),
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }

        // Saldo histogram
        apDestroy('saldoHist');
        var ctx3 = document.getElementById('apChartSaldoHist');
        if (ctx3) {
            var diffs = sliced.map(function(e){ return e.diff || 0; });
            var bins = {};
            diffs.forEach(function(df) {
                var bin = (Math.round(df * 2) / 2).toFixed(1);
                bins[bin] = (bins[bin] || 0) + 1;
            });
            var sortedKeys = Object.keys(bins).sort(function(a,b){ return parseFloat(a) - parseFloat(b); });

            apCharts.saldoHist = new Chart(ctx3.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedKeys.map(function(k){ return k + 'h'; }),
                    datasets: [{
                        label: 'Häufigkeit',
                        data: sortedKeys.map(function(k){ return bins[k]; }),
                        backgroundColor: sortedKeys.map(function(k){ return parseFloat(k) >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'; }),
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }
    }

    // ════════════════════════════════════════
    //  3. HEATMAP PANEL
    // ════════════════════════════════════════
    function apRenderHeatmap() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        // Full year heatmap
        var container = document.getElementById('apHeatmapFull');
        if (container) {
            var hoursMap = {};
            entries.forEach(function(e) { hoursMap[e.date] = (hoursMap[e.date] || 0) + (e.worked || 0); });
            var today = new Date();
            var oneYearAgo = new Date(today);
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            var dayLabels = ['', 'Mo', '', 'Mi', '', 'Fr', ''];
            var html = '';
            dayLabels.forEach(function(l) { html += '<div class="ap-heatmap-label">' + l + '</div>'; });

            var startDate = new Date(oneYearAgo);
            startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

            // Month labels row
            var monthHtml = '<div></div>';
            var lastMonth = -1;
            for (var w = 0; w < 53; w++) {
                var mdate = new Date(startDate);
                mdate.setDate(mdate.getDate() + w * 7);
                var m = mdate.getMonth();
                if (m !== lastMonth) {
                    monthHtml += '<div style="font-size:0.6rem;color:' + d.textColor + ';text-align:center;">' + mdate.toLocaleDateString('de-DE',{month:'short'}) + '</div>';
                    lastMonth = m;
                } else {
                    monthHtml += '<div></div>';
                }
            }

            for (var w2 = 0; w2 < 53; w2++) {
                for (var dd = 0; dd < 7; dd++) {
                    var date = new Date(startDate);
                    date.setDate(date.getDate() + w2 * 7 + dd);
                    if (date > today) { html += '<div></div>'; continue; }
                    var iso = date.toISOString().split('T')[0];
                    var h = hoursMap[iso] || 0;
                    var level = h === 0 ? 0 : h < 4 ? 1 : h < 7 ? 2 : h < 9 ? 3 : 4;
                    html += '<div class="ap-heatmap-cell" data-level="' + level + '" title="' + date.toLocaleDateString('de-DE') + ': ' + h.toFixed(1) + 'h"></div>';
                }
            }
            html += '<div class="ap-heatmap-legend" style="grid-column: 1/-1;">Weniger ';
            [0,1,2,3,4].forEach(function(l) {
                var bg = l===0?'rgba(var(--primary-rgb),0.06)':l===1?'rgba(var(--primary-rgb),0.2)':l===2?'rgba(var(--primary-rgb),0.4)':l===3?'rgba(var(--primary-rgb),0.6)':'var(--primary)';
                html += '<span style="background:' + bg + '"></span>';
            });
            html += ' Mehr</div>';

            container.innerHTML = '<div style="font-size:0;display:grid;grid-template-columns:30px repeat(53,1fr);gap:2px;margin-bottom:4px;">' + monthHtml + '</div><div class="ap-heatmap" style="grid-template-columns:30px repeat(53,1fr);">' + html + '</div>';
        }

        // Hours per day bar chart (last 60 days)
        apDestroy('hoursPerDay');
        var ctx = document.getElementById('apChartHoursPerDay');
        if (ctx) {
            var last60 = entries.slice(-60);
            apCharts.hoursPerDay = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: last60.map(function(e){ return new Date(e.date).toLocaleDateString('de-DE', {day:'2-digit',month:'short'}); }),
                    datasets: [{
                        label: 'Stunden',
                        data: last60.map(function(e){ return parseFloat((e.worked||0).toFixed(2)); }),
                        backgroundColor: last60.map(function(e) {
                            var hh = e.worked || 0;
                            return hh >= (e.expected||8) ? 'rgba(34,197,94,0.5)' : hh > 0 ? 'rgba(var(--primary-rgb),0.5)' : 'rgba(239,68,68,0.3)';
                        }),
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }

        // Streak stats
        var statsEl = document.getElementById('apStreakStats');
        if (statsEl) {
            var workDates = entries.filter(function(e){ return e.type === 'work' && e.worked > 0; }).map(function(e){ return e.date; });
            var uniqueDates = [];
            var seen = {};
            workDates.forEach(function(d){ if(!seen[d]){seen[d]=true;uniqueDates.push(d);} });
            uniqueDates.sort();
            var maxStreak = 0, curStreak = 0;
            var longestStart = '', longestEnd = '';
            var sStart = '';
            for (var i = 0; i < uniqueDates.length; i++) {
                var cur = new Date(uniqueDates[i]);
                var prev = i > 0 ? new Date(uniqueDates[i-1]) : null;
                var diffDays = prev ? Math.round((cur - prev) / 86400000) : 999;
                if (diffDays <= 3) {
                    curStreak++;
                } else {
                    curStreak = 1;
                    sStart = uniqueDates[i];
                }
                if (curStreak > maxStreak) {
                    maxStreak = curStreak;
                    longestStart = sStart;
                    longestEnd = uniqueDates[i];
                }
            }
            var maxHours = entries.reduce(function(mx, e){ return Math.max(mx, e.worked || 0); }, 0);
            var maxEntry = entries.find(function(e){ return (e.worked || 0) === maxHours; });
            var totalDays = new Set(entries.map(function(e){ return e.date; })).size;

            statsEl.innerHTML =
                '<div class="ap-kpi-row" style="margin:0;">' +
                '<div class="ap-kpi"><div class="ap-kpi-value">' + maxStreak + '</div><div class="ap-kpi-label">Längster Streak</div><div class="ap-kpi-sub">' + (longestStart ? new Date(longestStart).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}) + ' – ' + new Date(longestEnd).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}) : '—') + '</div></div>' +
                '<div class="ap-kpi"><div class="ap-kpi-value">' + maxHours.toFixed(1) + 'h</div><div class="ap-kpi-label">Rekord-Tag</div><div class="ap-kpi-sub">' + (maxEntry ? new Date(maxEntry.date).toLocaleDateString('de-DE') : '—') + '</div></div>' +
                '<div class="ap-kpi"><div class="ap-kpi-value">' + totalDays + '</div><div class="ap-kpi-label">Aktive Tage</div><div class="ap-kpi-sub">Einzigartige Tage</div></div>' +
                '</div>';
        }
    }

    // ════════════════════════════════════════
    //  4. WEEKLY PANEL
    // ════════════════════════════════════════
    function apRenderWeekly() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();
        var weeks = apCurrentPeriod.weekly;

        var periodEl = document.getElementById('apWeeklyPeriod');
        if (periodEl) {
            periodEl.innerHTML = [8,12,20,52,0].map(function(n) {
                return '<button class="ap-period-btn ' + (weeks===n?'active':'') + '" onclick="apCurrentPeriod.weekly=' + n + ';apRenderWeekly();">' + (n===0?'Alle':n+'W') + '</button>';
            }).join('');
        }

        // Group by ISO week
        var weekMap = {};
        entries.forEach(function(e) {
            var date = new Date(e.date);
            var wk = apGetISOWeek(date);
            var yr = date.getFullYear();
            var key = yr + '-KW' + String(wk).padStart(2,'0');
            if (!weekMap[key]) weekMap[key] = { worked: 0, expected: 0, saldo: 0 };
            weekMap[key].worked += (e.worked || 0);
            weekMap[key].expected += (e.expected || 0);
            weekMap[key].saldo += (e.diff || 0);
        });

        var weekKeys = Object.keys(weekMap).sort();
        if (weeks > 0) weekKeys = weekKeys.slice(-weeks);

        // Grouped bar chart
        apDestroy('weekly');
        var ctx = document.getElementById('apChartWeekly');
        if (ctx) {
            apCharts.weekly = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: weekKeys,
                    datasets: [{
                        label: 'Soll',
                        data: weekKeys.map(function(k){ return parseFloat(weekMap[k].expected.toFixed(2)); }),
                        backgroundColor: 'rgba(' + d.primaryRgb + ',0.2)',
                        borderColor: d.primary,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false
                    }, {
                        label: 'Ist',
                        data: weekKeys.map(function(k){ return parseFloat(weekMap[k].worked.toFixed(2)); }),
                        backgroundColor: 'rgba(6,182,212,0.5)',
                        borderColor: d.cyan,
                        borderWidth: 1.5,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: apBaseOpts()
            });
        }

        // Weekly saldo line
        apDestroy('weeklySaldo');
        var ctx2 = document.getElementById('apChartWeeklySaldo');
        if (ctx2) {
            var runSum = 0;
            var weekSaldoData = weekKeys.map(function(k){ runSum += weekMap[k].saldo; return parseFloat(runSum.toFixed(2)); });

            var grad = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, 'rgba(' + d.primaryRgb + ',0.2)');
            grad.addColorStop(1, 'rgba(' + d.primaryRgb + ',0.01)');

            apCharts.weeklySaldo = new Chart(ctx2.getContext('2d'), {
                type: 'line',
                data: {
                    labels: weekKeys,
                    datasets: [{
                        label: 'Kum. Wochen-Saldo',
                        data: weekSaldoData,
                        borderColor: d.primary,
                        backgroundColor: grad,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        borderWidth: 2.5,
                        pointBackgroundColor: d.primary
                    }]
                },
                options: apBaseOpts({ legend: false })
            });
        }
    }

    function apGetISOWeek(date) {
        var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        var dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    // ════════════════════════════════════════
    //  5. MONTHLY PANEL
    // ════════════════════════════════════════
    function apRenderMonthly() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        // Group by month and type
        var monthMap = {};
        entries.forEach(function(e) {
            var m = e.date.substring(0, 7);
            if (!monthMap[m]) monthMap[m] = { work: 0, school: 0, vacation: 0, sick: 0, holiday: 0, gleittag: 0, total: 0, count: 0 };
            var t = e.type || 'work';
            if (monthMap[m][t] !== undefined) monthMap[m][t] += (e.worked || 0);
            monthMap[m].total += (e.worked || 0);
            monthMap[m].count++;
        });
        var monthKeys = Object.keys(monthMap).sort();
        var monthLabels = monthKeys.map(function(k) {
            var parts = k.split('-');
            return new Date(parseInt(parts[0]), parseInt(parts[1])-1).toLocaleDateString('de-DE', {month:'short', year:'2-digit'});
        });

        // Stacked bar chart
        apDestroy('monthlyStack');
        var ctx = document.getElementById('apChartMonthlyStack');
        if (ctx) {
            var baseOpts = apBaseOpts();
            apCharts.monthlyStack = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [
                        { label: 'Arbeit',    data: monthKeys.map(function(k){ return parseFloat(monthMap[k].work.toFixed(1)); }),     backgroundColor: 'rgba(' + d.primaryRgb + ',0.6)', borderRadius: 4, borderSkipped: false },
                        { label: 'Schule',    data: monthKeys.map(function(k){ return parseFloat(monthMap[k].school.toFixed(1)); }),   backgroundColor: 'rgba(6,182,212,0.6)',       borderRadius: 4, borderSkipped: false },
                        { label: 'Urlaub',    data: monthKeys.map(function(k){ return parseFloat(monthMap[k].vacation.toFixed(1)); }), backgroundColor: 'rgba(34,197,94,0.6)',       borderRadius: 4, borderSkipped: false },
                        { label: 'Krank',     data: monthKeys.map(function(k){ return parseFloat(monthMap[k].sick.toFixed(1)); }),     backgroundColor: 'rgba(239,68,68,0.5)',       borderRadius: 4, borderSkipped: false },
                        { label: 'Feiertag',  data: monthKeys.map(function(k){ return parseFloat(monthMap[k].holiday.toFixed(1)); }),  backgroundColor: 'rgba(245,158,11,0.5)',      borderRadius: 4, borderSkipped: false },
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: baseOpts.animation,
                    plugins: baseOpts.plugins,
                    scales: {
                        x: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.fontFamily, size: 10 }, maxRotation: 45 } },
                        y: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.monoFamily, size: 10 } } }
                    }
                }
            });
        }

        // Monthly avg daily hours line
        apDestroy('monthlyAvg');
        var ctx2 = document.getElementById('apChartMonthlyAvg');
        if (ctx2) {
            var avgData = monthKeys.map(function(k) {
                var workDays = entries.filter(function(e){ return e.date.startsWith(k) && e.type === 'work'; }).length;
                return workDays ? parseFloat((monthMap[k].work / workDays).toFixed(2)) : 0;
            });
            var grad = ctx2.getContext('2d').createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, 'rgba(6,182,212,0.2)');
            grad.addColorStop(1, 'rgba(6,182,212,0.01)');

            apCharts.monthlyAvg = new Chart(ctx2.getContext('2d'), {
                type: 'line',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: '⌀ Stunden/Arbeitstag',
                        data: avgData,
                        borderColor: d.cyan,
                        backgroundColor: grad,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        borderWidth: 2.5,
                        pointBackgroundColor: d.cyan
                    }]
                },
                options: apBaseOpts({ legend: false })
            });
        }
    }

    // ════════════════════════════════════════
    //  6. PROJECTS PANEL
    // ════════════════════════════════════════
    function apRenderProjects() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        var projMap = {};
        entries.forEach(function(e) {
            var p = e.project || 'Kein Projekt';
            if (!projMap[p]) projMap[p] = { hours: 0, count: 0, months: {} };
            projMap[p].hours += (e.worked || 0);
            projMap[p].count++;
            var m = e.date.substring(0, 7);
            projMap[p].months[m] = (projMap[p].months[m] || 0) + (e.worked || 0);
        });

        var sorted = Object.entries(projMap).sort(function(a,b){ return b[1].hours - a[1].hours; });
        var top = sorted.slice(0, 8);
        var projColors = [d.primary, d.cyan, d.green, d.amber, d.blue, d.pink, d.indigo, d.red];

        // Doughnut
        apDestroy('projects');
        var ctx = document.getElementById('apChartProjects');
        if (ctx) {
            apCharts.projects = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: top.map(function(t){ var name = t[0]; return name.length > 20 ? name.substring(0,18)+'…' : name; }),
                    datasets: [{
                        data: top.map(function(t){ return parseFloat(t[1].hours.toFixed(1)); }),
                        backgroundColor: projColors,
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '60%',
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { position: 'right', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 10, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Horizontal bar
        apDestroy('projectBar');
        var ctx2 = document.getElementById('apChartProjectBar');
        if (ctx2) {
            apCharts.projectBar = new Chart(ctx2.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: top.map(function(t){ var name = t[0]; return name.length > 18 ? name.substring(0,16)+'…' : name; }),
                    datasets: [{
                        label: 'Stunden',
                        data: top.map(function(t){ return parseFloat(t[1].hours.toFixed(1)); }),
                        backgroundColor: projColors.map(function(c){ return c + '99'; }),
                        borderColor: projColors,
                        borderWidth: 1.5,
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; o.indexAxis = 'y'; return o; })()
            });
        }

        // Project timeline (top 5 projects over months)
        apDestroy('projectTimeline');
        var ctx3 = document.getElementById('apChartProjectTimeline');
        if (ctx3) {
            var allMonthsSet = {};
            entries.forEach(function(e){ allMonthsSet[e.date.substring(0,7)] = true; });
            var allMonths = Object.keys(allMonthsSet).sort();
            var top5 = sorted.slice(0, 5);

            apCharts.projectTimeline = new Chart(ctx3.getContext('2d'), {
                type: 'line',
                data: {
                    labels: allMonths.map(function(m) {
                        var parts = m.split('-');
                        return new Date(parseInt(parts[0]), parseInt(parts[1])-1).toLocaleDateString('de-DE', {month:'short', year:'2-digit'});
                    }),
                    datasets: top5.map(function(item, i) {
                        var name = item[0];
                        var val = item[1];
                        return {
                            label: name.length > 15 ? name.substring(0,13)+'…' : name,
                            data: allMonths.map(function(m){ return parseFloat((val.months[m] || 0).toFixed(1)); }),
                            borderColor: projColors[i],
                            backgroundColor: projColors[i] + '20',
                            fill: false,
                            tension: 0.3,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            borderWidth: 2
                        };
                    })
                },
                options: apBaseOpts()
            });
        }
    }

    // ════════════════════════════════════════
    //  7. WEEKDAY RADAR PANEL
    // ════════════════════════════════════════
    function apRenderWeekday() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();
        var dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        var dayData = [];
        for (var i = 0; i < 7; i++) dayData.push({ hours: 0, count: 0, diffs: 0, moods: {} });

        entries.forEach(function(e) {
            var dow = new Date(e.date).getDay();
            dayData[dow].hours += (e.worked || 0);
            dayData[dow].count++;
            dayData[dow].diffs += (e.diff || 0);
            if (e.mood) dayData[dow].moods[e.mood] = (dayData[dow].moods[e.mood] || 0) + 1;
        });

        var avgByDay = dayData.map(function(dd){ return dd.count ? dd.hours / dd.count : 0; });

        // Radar chart
        apDestroy('radar');
        var ctx = document.getElementById('apChartRadar');
        if (ctx) {
            apCharts.radar = new Chart(ctx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: dayNames,
                    datasets: [{
                        label: '⌀ Stunden',
                        data: avgByDay.map(function(v){ return parseFloat(v.toFixed(2)); }),
                        borderColor: d.primary,
                        backgroundColor: 'rgba(' + d.primaryRgb + ',0.15)',
                        borderWidth: 2.5,
                        pointBackgroundColor: d.primary,
                        pointRadius: 4,
                        pointHoverRadius: 7
                    }, {
                        label: '⌀ Saldo',
                        data: dayData.map(function(dd){ return dd.count ? parseFloat((dd.diffs / dd.count).toFixed(2)) : 0; }),
                        borderColor: d.cyan,
                        backgroundColor: 'rgba(6,182,212,0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: d.cyan,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    scales: {
                        r: {
                            grid: { color: d.gridColor },
                            angleLines: { color: d.gridColor },
                            pointLabels: { color: d.textColor, font: { family: d.fontFamily, size: 11, weight: '600' } },
                            ticks: { display: false }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: d.textColor, font: { family: d.fontFamily, size: 11, weight: '600' }, padding: 16, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Weekday bar (Mon-Fri)
        apDestroy('weekdayBar');
        var ctx2 = document.getElementById('apChartWeekdayBar');
        if (ctx2) {
            var workDays = [1,2,3,4,5];
            apCharts.weekdayBar = new Chart(ctx2.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: workDays.map(function(i){ return dayNames[i]; }),
                    datasets: [{
                        label: '⌀ Stunden',
                        data: workDays.map(function(i){ return parseFloat(avgByDay[i].toFixed(2)); }),
                        backgroundColor: workDays.map(function(i) {
                            var avg = avgByDay[i];
                            return avg >= 8 ? 'rgba(34,197,94,0.5)' : avg >= 4 ? 'rgba(var(--primary-rgb),0.5)' : 'rgba(245,158,11,0.5)';
                        }),
                        borderRadius: 8,
                        borderSkipped: false
                    }, {
                        label: '⌀ Saldo',
                        data: workDays.map(function(i){ return dayData[i].count ? parseFloat((dayData[i].diffs / dayData[i].count).toFixed(2)) : 0; }),
                        backgroundColor: workDays.map(function(i) {
                            var avg = dayData[i].count ? dayData[i].diffs / dayData[i].count : 0;
                            return avg >= 0 ? 'rgba(6,182,212,0.5)' : 'rgba(239,68,68,0.5)';
                        }),
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: apBaseOpts()
            });
        }

        // Mood by weekday
        apDestroy('moodWeekday');
        var ctx3 = document.getElementById('apChartMoodWeekday');
        if (ctx3) {
            var allMoods = {};
            dayData.forEach(function(dd){ Object.keys(dd.moods).forEach(function(m){ allMoods[m] = true; }); });
            var moodArr = Object.keys(allMoods);
            var moodColors = ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#ec4899', '#a855f7', '#06b6d4'];

            if (moodArr.length > 0) {
                var mBaseOpts = apBaseOpts();
                apCharts.moodWeekday = new Chart(ctx3.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: dayNames.slice(1, 6),
                        datasets: moodArr.map(function(mood, i) {
                            return {
                                label: mood,
                                data: [1,2,3,4,5].map(function(dow){ return dayData[dow].moods[mood] || 0; }),
                                backgroundColor: (moodColors[i % moodColors.length]) + '80',
                                borderRadius: 4,
                                borderSkipped: false
                            };
                        })
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        animation: mBaseOpts.animation,
                        plugins: mBaseOpts.plugins,
                        scales: {
                            x: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.fontFamily, size: 10 } } },
                            y: { stacked: true, grid: { color: d.gridColor, drawBorder: false }, ticks: { color: d.textColor, font: { family: d.monoFamily, size: 10 } } }
                        }
                    }
                });
            } else {
                ctx3.parentElement.innerHTML = '<div class="ap-empty"><div class="ap-empty-icon">😊</div>Noch keine Stimmungs-Daten erfasst</div>';
            }
        }
    }

    // ════════════════════════════════════════
    //  8. DISTRIBUTION PANEL
    // ════════════════════════════════════════
    function apRenderDistribution() {
        var entries = apEntries();
        if (!entries.length) return;
        var d = apChartDefaults();

        var typeCounts = {};
        var typeHours = {};
        entries.forEach(function(e) {
            var t = e.type || 'work';
            typeCounts[t] = (typeCounts[t] || 0) + 1;
            typeHours[t] = (typeHours[t] || 0) + (e.worked || 0);
        });
        var typeLabels = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', sick: 'Krank', holiday: 'Feiertag', gleittag: 'Gleittag' };
        var typeColors = { work: d.primary, school: d.cyan, vacation: d.green, sick: d.red, holiday: d.amber, gleittag: d.indigo };

        // Type Doughnut
        apDestroy('typeDoughnut');
        var ctx = document.getElementById('apChartTypeDoughnut');
        if (ctx) {
            var totalTypeHours = Object.values(typeHours).reduce(function(s,v){ return s+v; }, 0);
            apCharts.typeDoughnut = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: Object.keys(typeHours).map(function(k){ return typeLabels[k] || k; }),
                    datasets: [{
                        data: Object.values(typeHours).map(function(v){ return parseFloat(v.toFixed(1)); }),
                        backgroundColor: Object.keys(typeHours).map(function(k){ return typeColors[k] || '#666'; }),
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    cutout: '60%',
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    plugins: {
                        legend: { position: 'bottom', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 14, usePointStyle: true } },
                        tooltip: {
                            backgroundColor: d.isLight ? 'rgba(255,255,255,0.95)' : 'rgba(10,10,18,0.95)',
                            titleColor: d.isLight ? '#1a1a2e' : '#fff',
                            bodyColor: d.isLight ? '#333' : 'rgba(255,255,255,0.8)',
                            borderColor: 'rgba(' + d.primaryRgb + ',0.2)',
                            borderWidth: 1, cornerRadius: 10, padding: 12,
                            callbacks: { label: function(c) { return ' ' + c.label + ': ' + c.parsed.toFixed(1) + 'h (' + (totalTypeHours > 0 ? ((c.parsed / totalTypeHours)*100).toFixed(1) : 0) + '%)'; } }
                        }
                    }
                }
            });
        }

        // Polar area
        apDestroy('typePolar');
        var ctx2 = document.getElementById('apChartTypePolar');
        if (ctx2) {
            apCharts.typePolar = new Chart(ctx2.getContext('2d'), {
                type: 'polarArea',
                data: {
                    labels: Object.keys(typeCounts).map(function(k){ return typeLabels[k] || k; }),
                    datasets: [{
                        data: Object.values(typeCounts),
                        backgroundColor: Object.keys(typeCounts).map(function(k){ return (typeColors[k] || '#666') + '80'; }),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 700, easing: 'easeInOutQuart' },
                    scales: { r: { grid: { color: d.gridColor }, ticks: { display: false } } },
                    plugins: {
                        legend: { position: 'bottom', labels: { color: d.textColor, font: { family: d.fontFamily, size: 11 }, padding: 14, usePointStyle: true } },
                        tooltip: apBaseOpts({noScales:true}).plugins.tooltip
                    }
                }
            });
        }

        // Hours histogram
        apDestroy('hoursHist');
        var ctx3 = document.getElementById('apChartHoursHist');
        if (ctx3) {
            var workEntries = entries.filter(function(e){ return e.type === 'work' && e.worked > 0; });
            var bins = {};
            workEntries.forEach(function(e) {
                var bin = Math.floor(e.worked);
                var label = bin + '-' + (bin+1) + 'h';
                bins[label] = (bins[label] || 0) + 1;
            });
            var sortedBins = Object.entries(bins).sort(function(a,b){ return parseInt(a[0]) - parseInt(b[0]); });

            apCharts.hoursHist = new Chart(ctx3.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedBins.map(function(b){ return b[0]; }),
                    datasets: [{
                        label: 'Tage',
                        data: sortedBins.map(function(b){ return b[1]; }),
                        backgroundColor: sortedBins.map(function(b) {
                            var h = parseInt(b[0]);
                            return h >= 8 ? 'rgba(34,197,94,0.5)' : h >= 6 ? 'rgba(var(--primary-rgb),0.5)' : h >= 4 ? 'rgba(245,158,11,0.5)' : 'rgba(239,68,68,0.5)';
                        }),
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: (function(){ var o = apBaseOpts({legend: false}); o.plugins.legend = {display:false}; return o; })()
            });
        }
    }

    // ════════════════════════════════════════
    //  9. 3D CITY VISUALIZATION (Three.js)
    // ════════════════════════════════════════
    var ap3dState = { scene: null, camera: null, renderer: null, controls: null, animId: null, range: 90, buildings: [], raycaster: null, mouse: null, hoveredBar: null };

    function ap3dSetRange(days, btn) {
        ap3dState.range = days;
        var btns = document.querySelectorAll('.ap3d-controls .ap-period-btn');
        btns.forEach(function(b) { if (b.id !== 'ap3dAutoRotBtn') b.classList.remove('active'); });
        if (btn && btn.id !== 'ap3dAutoRotBtn') btn.classList.add('active');
        apRender3D();
    }

    function ap3dToggleAutoRotate(btn) {
        if (ap3dState.controls) {
            ap3dState.controls.autoRotate = !ap3dState.controls.autoRotate;
            btn.classList.toggle('active');
        }
    }

    function ap3dCleanup() {
        if (ap3dState.animId) { cancelAnimationFrame(ap3dState.animId); ap3dState.animId = null; }
        if (ap3dState.renderer) { ap3dState.renderer.dispose(); ap3dState.renderer = null; }
        if (ap3dState.controls) { ap3dState.controls.dispose(); ap3dState.controls = null; }
        ap3dState.scene = null;
        ap3dState.camera = null;
        ap3dState.buildings = [];
        ap3dState.hoveredBar = null;
        var container = document.getElementById('ap3dContainer');
        if (container) container.innerHTML = '';
    }

    function apRender3D() {
        if (typeof THREE === 'undefined') {
            var container = document.getElementById('ap3dContainer');
            if (container) container.innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">⏳</div>Three.js wird geladen... Bitte Seite neu laden.</div>';
            return;
        }

        ap3dCleanup();

        var entries = apEntries();
        if (!entries.length) {
            document.getElementById('ap3dContainer').innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">🏗️</div>Noch keine Daten für 3D-Ansicht</div>';
            return;
        }

        var range = ap3dState.range;
        var filtered = range > 0 ? entries.slice(-range) : entries;
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';

        // Container setup
        var container = document.getElementById('ap3dContainer');
        var w = container.clientWidth;
        var h = container.clientHeight;

        // Scene
        var scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(isLight ? 0xf8f9fb : 0x030305, 0.012);

        // Camera
        var camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
        camera.position.set(25, 20, 25);
        camera.lookAt(0, 0, 0);

        // Renderer
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false });
        } catch (e) {
            console.warn('[3D] WebGL init failed:', e.message);
        }
        if (!renderer) {
            container.innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">⚠️</div>WebGL nicht verfügbar.<br>Bitte Hardware-Beschleunigung im Browser aktivieren:<br><small>chrome://settings → System → "Hardwarebeschleunigung verwenden"</small><br><br><small>Oder starte Chrome mit: --use-gl=angle --use-angle=d3d11</small></div>';
            return;
        }
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Controls
        var OrbitControlsCtor = THREE.OrbitControls || (window.THREE && window.THREE.OrbitControls);
        if (!OrbitControlsCtor) {
            container.innerHTML = '<div class="ap-empty" style="padding:4rem;"><div class="ap-empty-icon">🔄</div>3D-Steuerung wird geladen…<br>Bitte Seite neu laden (F5).</div>';
            renderer.dispose();
            return;
        }
        var controls = new OrbitControlsCtor(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = 8;
        controls.maxDistance = 80;
        controls.maxPolarAngle = Math.PI / 2.15;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 1.2;

        // Lighting
        var ambientLight = new THREE.AmbientLight(isLight ? 0x666666 : 0x222233, 1);
        scene.add(ambientLight);

        var dirLight = new THREE.DirectionalLight(isLight ? 0xffffff : 0xddc8ff, 1.5);
        dirLight.position.set(15, 25, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 80;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -30;
        scene.add(dirLight);

        var pointLight = new THREE.PointLight(0xa855f7, 0.6, 50);
        pointLight.position.set(-8, 15, -8);
        scene.add(pointLight);

        var pointLight2 = new THREE.PointLight(0x06b6d4, 0.4, 50);
        pointLight2.position.set(8, 10, 8);
        scene.add(pointLight2);

        // Ground plane
        var groundGeo = new THREE.PlaneGeometry(80, 80);
        var groundMat = new THREE.MeshStandardMaterial({
            color: isLight ? 0xe8e8ee : 0x0a0a12,
            roughness: 0.9,
            metalness: 0.1
        });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid helper
        var grid = new THREE.GridHelper(60, 60, isLight ? 0xccccdd : 0x1a1a2e, isLight ? 0xddddee : 0x12121e);
        grid.position.y = 0;
        scene.add(grid);

        // Build the city
        var buildings = [];
        var maxHours = 12;
        var dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

        // Group by week
        var weekGroups = [];
        var currentWeek = [];
        var lastWeekNum = -1;
        filtered.forEach(function(e) {
            var d = new Date(e.date);
            var wk = apGetISOWeek(d);
            if (wk !== lastWeekNum && currentWeek.length > 0) {
                weekGroups.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(e);
            lastWeekNum = wk;
        });
        if (currentWeek.length > 0) weekGroups.push(currentWeek);

        var gridSpacing = 1.6;
        var barWidth = 1.1;
        var offsetX = -(Math.min(weekGroups.length, 20) * gridSpacing) / 2;
        var offsetZ = -(7 * gridSpacing) / 2;

        // Limit to last N weeks for reasonable rendering
        var maxWeeks = Math.min(weekGroups.length, 52);
        var startWeek = weekGroups.length - maxWeeks;

        for (var wi = startWeek; wi < weekGroups.length; wi++) {
            var week = weekGroups[wi];
            var weekIdx = wi - startWeek;

            for (var di = 0; di < week.length; di++) {
                var entry = week[di];
                var dow = new Date(entry.date).getDay();
                var hours = entry.worked || 0;
                var expected = entry.expected || 8;
                var ratio = expected > 0 ? hours / expected : 0;
                var h = Math.max(0.15, (hours / maxHours) * 10);
                var type = entry.type || 'work';

                // Color based on type and performance
                var color;
                if (type === 'school') color = 0x06b6d4;
                else if (type === 'vacation' || type === 'holiday' || type === 'gleittag') color = 0x3b82f6;
                else if (type === 'sick') color = 0xef4444;
                else if (ratio >= 1.0) color = 0x22c55e;
                else if (ratio >= 0.7) color = 0xa855f7;
                else if (ratio >= 0.4) color = 0xf59e0b;
                else color = 0xef4444;

                // Building geometry with beveled top
                var geo = new THREE.BoxGeometry(barWidth, h, barWidth);
                var mat = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.35,
                    metalness: 0.3,
                    transparent: true,
                    opacity: 0.88
                });
                var mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(
                    offsetX + weekIdx * gridSpacing,
                    h / 2,
                    offsetZ + dow * gridSpacing
                );
                mesh.castShadow = true;
                mesh.receiveShadow = true;

                // Store metadata
                mesh.userData = {
                    date: entry.date,
                    dayName: dayNames[dow],
                    hours: hours,
                    expected: expected,
                    type: type,
                    diff: entry.diff || 0,
                    project: entry.project || '',
                    ratio: ratio
                };

                scene.add(mesh);
                buildings.push(mesh);

                // Top glow for high performers
                if (ratio >= 1.0 && type === 'work') {
                    var glowGeo = new THREE.BoxGeometry(barWidth * 1.15, 0.08, barWidth * 1.15);
                    var glowMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.5 });
                    var glow = new THREE.Mesh(glowGeo, glowMat);
                    glow.position.set(mesh.position.x, h + 0.04, mesh.position.z);
                    scene.add(glow);
                }
            }
        }

        // Day labels on Z axis
        if (typeof THREE.FontLoader === 'undefined') {
            // Use sprites for day labels instead
            dayNames.forEach(function(name, i) {
                var canvas = document.createElement('canvas');
                canvas.width = 64; canvas.height = 32;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
                ctx.font = 'bold 18px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(name, 32, 22);
                var tex = new THREE.CanvasTexture(canvas);
                var spMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                var sprite = new THREE.Sprite(spMat);
                sprite.scale.set(2.5, 1.2, 1);
                sprite.position.set(offsetX - 2.5, 0.5, offsetZ + i * gridSpacing);
                scene.add(sprite);
            });
        }

        // Save state
        ap3dState.scene = scene;
        ap3dState.camera = camera;
        ap3dState.renderer = renderer;
        ap3dState.controls = controls;
        ap3dState.buildings = buildings;

        // Raycaster for hover
        ap3dState.raycaster = new THREE.Raycaster();
        ap3dState.mouse = new THREE.Vector2();

        // Info overlay
        var infoOverlay = document.createElement('div');
        infoOverlay.className = 'ap3d-info-overlay';
        infoOverlay.id = 'ap3dInfo';
        container.appendChild(infoOverlay);

        // Mouse move for hover
        renderer.domElement.addEventListener('mousemove', function(event) {
            var rect = renderer.domElement.getBoundingClientRect();
            ap3dState.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            ap3dState.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        });

        // Animate
        var clock = new THREE.Clock();
        function animate() {
            ap3dState.animId = requestAnimationFrame(animate);
            controls.update();

            // Hover detection
            if (ap3dState.raycaster && ap3dState.buildings.length > 0) {
                ap3dState.raycaster.setFromCamera(ap3dState.mouse, camera);
                var intersects = ap3dState.raycaster.intersectObjects(ap3dState.buildings);
                var info = document.getElementById('ap3dInfo');

                if (ap3dState.hoveredBar && ap3dState.hoveredBar !== (intersects.length > 0 ? intersects[0].object : null)) {
                    ap3dState.hoveredBar.material.opacity = 0.88;
                    ap3dState.hoveredBar.material.emissive.setHex(0x000000);
                }

                if (intersects.length > 0) {
                    var obj = intersects[0].object;
                    if (obj.userData.date) {
                        obj.material.opacity = 1.0;
                        obj.material.emissive.setHex(0x222222);
                        ap3dState.hoveredBar = obj;
                        var ud = obj.userData;
                        var typeLabels = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', sick: 'Krank', holiday: 'Feiertag', gleittag: 'Gleittag' };
                        if (info) {
                            info.innerHTML = '<b>' + ud.dayName + ', ' + new Date(ud.date).toLocaleDateString('de-DE') + '</b> &nbsp;|&nbsp; ' +
                                (typeLabels[ud.type] || ud.type) + ' &nbsp;|&nbsp; ' +
                                ud.hours.toFixed(2) + 'h / ' + ud.expected.toFixed(2) + 'h &nbsp;|&nbsp; ' +
                                '<span style="color:' + (ud.diff >= 0 ? '#22c55e' : '#ef4444') + ';">' + (ud.diff >= 0 ? '+' : '') + ud.diff.toFixed(2) + 'h</span>' +
                                (ud.project ? ' &nbsp;|&nbsp; ' + ud.project : '');
                            info.classList.add('visible');
                        }
                    }
                } else {
                    ap3dState.hoveredBar = null;
                    if (info) info.classList.remove('visible');
                }
            }

            // Subtle floating animation for buildings
            var time = clock.getElapsedTime();
            ap3dState.buildings.forEach(function(b, i) {
                b.position.y = (b.geometry.parameters.height / 2) + Math.sin(time * 0.8 + i * 0.15) * 0.03;
            });

            renderer.render(scene, camera);
        }
        animate();

        // Resize handler
        var resizeHandler = function() {
            if (!ap3dState.renderer) return;
            var c = document.getElementById('ap3dContainer');
            if (!c) return;
            var nw = c.clientWidth;
            var nh = c.clientHeight;
            camera.aspect = nw / nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
        };
        window.addEventListener('resize', resizeHandler);

        // Stats cards
        ap3dRenderStats(filtered);
    }

    function ap3dRenderStats(entries) {
        var statsEl = document.getElementById('ap3dStats');
        if (!statsEl) return;
        var totalDays = entries.length;
        var workDays = entries.filter(function(e){ return e.type === 'work'; });
        var overTarget = workDays.filter(function(e){ return (e.expected||8) > 0 && (e.worked||0) >= (e.expected||8); }).length;
        var avgHours = workDays.length ? (workDays.reduce(function(s,e){ return s + (e.worked||0); }, 0) / workDays.length) : 0;
        var maxH = entries.reduce(function(m,e){ return Math.max(m, e.worked||0); }, 0);
        var buildings = entries.filter(function(e){ return (e.worked||0) > 0; }).length;
        var pctOver = workDays.length ? ((overTarget / workDays.length) * 100).toFixed(1) : 0;

        statsEl.innerHTML =
            '<div class="ap-kpi"><div class="ap-kpi-value">' + buildings + '</div><div class="ap-kpi-label">Gebäude in City</div><div class="ap-kpi-sub">' + totalDays + ' Tage insgesamt</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + pctOver + '%</div><div class="ap-kpi-label">Ziel erreicht</div><div class="ap-kpi-sub">' + overTarget + ' von ' + workDays.length + ' Arbeitstagen</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">' + avgHours.toFixed(1) + 'h</div><div class="ap-kpi-label">⌀ pro Tag</div><div class="ap-kpi-sub">Rekord: ' + maxH.toFixed(1) + 'h</div></div>';
    }

    // ════════════════════════════════════════════
    //  10. GALAXY VISUALIZATION (Three.js + Bloom)
    // ════════════════════════════════════════════
    var apGxState = { scene:null, camera:null, renderer:null, controls:null, composer:null, animId:null, range:90, stars:[], raycaster:null, mouse:null, hoveredStar:null, bloomEnabled:true };

    function apGxSetRange(days, btn) {
        apGxState.range = days;
        var btns = document.querySelectorAll('.apgx-controls .ap-period-btn');
        btns.forEach(function(b){ if(b.id!=='apGxBloomBtn'&&b.id!=='apGxAutoRotBtn') b.classList.remove('active'); });
        if(btn&&btn.id!=='apGxBloomBtn'&&btn.id!=='apGxAutoRotBtn') btn.classList.add('active');
        apRenderGalaxy();
    }
    function apGxToggleAutoRotate(btn) {
        if(apGxState.controls){ apGxState.controls.autoRotate=!apGxState.controls.autoRotate; btn.classList.toggle('active'); }
    }
    function apGxToggleBloom(btn) {
        apGxState.bloomEnabled = !apGxState.bloomEnabled;
        btn.classList.toggle('active');
    }
    function apGxCleanup() {
        if(apGxState.animId){ cancelAnimationFrame(apGxState.animId); apGxState.animId=null; }
        if(apGxState.composer){ apGxState.composer=null; }
        if(apGxState.renderer){ apGxState.renderer.dispose(); apGxState.renderer=null; }
        if(apGxState.controls){ apGxState.controls.dispose(); apGxState.controls=null; }
        apGxState.scene=null; apGxState.camera=null; apGxState.stars=[]; apGxState.hoveredStar=null;
        var c=document.getElementById('apGxContainer'); if(c) c.innerHTML='';
    }

    function apGxCreateStarTexture(color, size) {
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var half = size / 2;
        // Outer glow
        var grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0, color);
        grad.addColorStop(0.15, color);
        grad.addColorStop(0.4, color.replace('1)', '0.3)'));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        // Cross flare
        ctx.globalCompositeOperation = 'lighter';
        var flareGrad = ctx.createLinearGradient(0, half, size, half);
        flareGrad.addColorStop(0, 'rgba(255,255,255,0)');
        flareGrad.addColorStop(0.4, color.replace('1)', '0.15)'));
        flareGrad.addColorStop(0.5, color.replace('1)', '0.5)'));
        flareGrad.addColorStop(0.6, color.replace('1)', '0.15)'));
        flareGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = flareGrad;
        ctx.fillRect(0, half - 1, size, 3);
        var flareGrad2 = ctx.createLinearGradient(half, 0, half, size);
        flareGrad2.addColorStop(0, 'rgba(255,255,255,0)');
        flareGrad2.addColorStop(0.4, color.replace('1)', '0.1)'));
        flareGrad2.addColorStop(0.5, color.replace('1)', '0.35)'));
        flareGrad2.addColorStop(0.6, color.replace('1)', '0.1)'));
        flareGrad2.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = flareGrad2;
        ctx.fillRect(half - 1, 0, 3, size);
        return new THREE.CanvasTexture(canvas);
    }

    function apRenderGalaxy() {
        if(typeof THREE==='undefined'){ var c=document.getElementById('apGxContainer'); if(c) c.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⏳</div>Three.js wird geladen…</div>'; return; }
        apGxCleanup();

        var entries = apEntries();
        if(!entries.length){ document.getElementById('apGxContainer').innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🌌</div>Noch keine Daten für Galaxy</div>'; return; }

        var range = apGxState.range;
        var filtered = range > 0 ? entries.slice(-range) : entries;
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';

        var container = document.getElementById('apGxContainer');
        var w = container.clientWidth, h = container.clientHeight;

        // ── Scene ──
        var scene = new THREE.Scene();

        // ── Camera ──
        var camera = new THREE.PerspectiveCamera(60, w/h, 0.1, 2000);
        camera.position.set(0, 35, 60);
        camera.lookAt(0, 0, 0);

        // ── Renderer ──
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
        } catch(e) {
            console.warn('[Galaxy] WebGL init failed:', e.message);
        }
        if(!renderer) {
            container.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⚠️</div>WebGL nicht verfügbar.<br>Hardware-Beschleunigung aktivieren oder Chrome mit --use-gl=angle --use-angle=d3d11 starten.</div>';
            return;
        }
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);

        // ── OrbitControls ──
        var OC = THREE.OrbitControls || (window.THREE && window.THREE.OrbitControls);
        if(!OC){ container.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🔄</div>Controls laden… Bitte F5</div>'; renderer.dispose(); return; }
        var controls = new OC(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 10;
        controls.maxDistance = 150;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0.6;

        // ── Bloom Postprocessing ──
        var composer = null;
        var hasBloom = typeof THREE.EffectComposer !== 'undefined' && typeof THREE.RenderPass !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined';
        if(hasBloom) {
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, camera));
            var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 1.8, 0.6, 0.2);
            bloomPass.threshold = 0.15;
            bloomPass.strength = 1.8;
            bloomPass.radius = 0.6;
            composer.addPass(bloomPass);
        }

        // ── Lighting ──
        scene.add(new THREE.AmbientLight(isLight ? 0x444444 : 0x111122, 0.3));

        // ── Background starfield (3000 particles) ──
        var bgStarCount = 3000;
        var bgGeo = new THREE.BufferGeometry();
        var bgPos = new Float32Array(bgStarCount * 3);
        var bgSizes = new Float32Array(bgStarCount);
        for(var i=0; i<bgStarCount; i++){
            bgPos[i*3]   = (Math.random()-0.5)*800;
            bgPos[i*3+1] = (Math.random()-0.5)*800;
            bgPos[i*3+2] = (Math.random()-0.5)*800;
            bgSizes[i]   = Math.random()*1.5+0.3;
        }
        bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
        bgGeo.setAttribute('size', new THREE.BufferAttribute(bgSizes, 1));
        var bgMat = new THREE.PointsMaterial({ color: isLight ? 0x8888aa : 0xffffff, size:0.8, transparent:true, opacity:0.5, sizeAttenuation:true });
        scene.add(new THREE.Points(bgGeo, bgMat));

        // ── Central core (glowing sun) ──
        var coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
        var coreMat = new THREE.MeshBasicMaterial({ color:0xa855f7, transparent:true, opacity:0.9 });
        var core = new THREE.Mesh(coreGeo, coreMat);
        scene.add(core);

        // Core glow layers
        for(var g=0; g<3; g++){
            var glowGeo = new THREE.SphereGeometry(3+g*1.5, 24, 24);
            var glowMat = new THREE.MeshBasicMaterial({ color:0xa855f7, transparent:true, opacity:0.08-g*0.02, side:THREE.BackSide });
            scene.add(new THREE.Mesh(glowGeo, glowMat));
        }

        // ── Nebula dust ring (subtle ring of particles) ──
        var dustCount = 1200;
        var dustGeo = new THREE.BufferGeometry();
        var dustPos = new Float32Array(dustCount * 3);
        var dustColors = new Float32Array(dustCount * 3);
        for(var d=0; d<dustCount; d++){
            var dAngle = Math.random() * Math.PI * 2;
            var dRadius = 5 + Math.random() * 40;
            var dSpread = (Math.random()-0.5) * 4;
            dustPos[d*3]   = Math.cos(dAngle)*dRadius + (Math.random()-0.5)*3;
            dustPos[d*3+1] = dSpread;
            dustPos[d*3+2] = Math.sin(dAngle)*dRadius + (Math.random()-0.5)*3;
            var dc = Math.random();
            if(dc<0.33){ dustColors[d*3]=0.66; dustColors[d*3+1]=0.33; dustColors[d*3+2]=0.97; }
            else if(dc<0.66){ dustColors[d*3]=0.02; dustColors[d*3+1]=0.71; dustColors[d*3+2]=0.83; }
            else{ dustColors[d*3]=0.13; dustColors[d*3+1]=0.77; dustColors[d*3+2]=0.37; }
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
        var dustMat = new THREE.PointsMaterial({ size:0.4, transparent:true, opacity:0.15, vertexColors:true, sizeAttenuation:true, blending:THREE.AdditiveBlending });
        var dustSystem = new THREE.Points(dustGeo, dustMat);
        scene.add(dustSystem);

        // ── Spiral galaxy ring (dense particles forming spiral arms) ──
        var spiralCount = 2000;
        var spiralGeo = new THREE.BufferGeometry();
        var spiralPos = new Float32Array(spiralCount * 3);
        var spiralColors = new Float32Array(spiralCount * 3);
        for(var sp=0; sp<spiralCount; sp++){
            var arm = sp % 3; // 3 spiral arms
            var t = (sp / spiralCount) * Math.PI * 6;
            var r = 4 + t * 1.5;
            var armOffset = arm * (Math.PI * 2 / 3);
            var scatter = (Math.random()-0.5) * (2 + t*0.3);
            spiralPos[sp*3]   = Math.cos(t + armOffset)*r + scatter;
            spiralPos[sp*3+1] = (Math.random()-0.5)*1.5;
            spiralPos[sp*3+2] = Math.sin(t + armOffset)*r + scatter;
            var brightness = 0.3 + Math.random()*0.4;
            spiralColors[sp*3]   = 0.5*brightness + 0.3;
            spiralColors[sp*3+1] = 0.2*brightness + 0.1;
            spiralColors[sp*3+2] = brightness;
        }
        spiralGeo.setAttribute('position', new THREE.BufferAttribute(spiralPos, 3));
        spiralGeo.setAttribute('color', new THREE.BufferAttribute(spiralColors, 3));
        var spiralMat = new THREE.PointsMaterial({ size:0.5, transparent:true, opacity:0.3, vertexColors:true, sizeAttenuation:true, blending:THREE.AdditiveBlending });
        var spiralSystem = new THREE.Points(spiralGeo, spiralMat);
        scene.add(spiralSystem);

        // ── Data stars (each entry = one star) ──
        var stars = [];
        var totalEntries = filtered.length;
        var colorMap = {
            'superstar': { hex:0x22c55e, rgba:'rgba(34,197,94,1)' },
            'normal':    { hex:0xa855f7, rgba:'rgba(168,85,247,1)' },
            'low':       { hex:0xf59e0b, rgba:'rgba(245,158,11,1)' },
            'red':       { hex:0xef4444, rgba:'rgba(239,68,68,1)' },
            'school':    { hex:0x06b6d4, rgba:'rgba(6,182,212,1)' },
            'special':   { hex:0x3b82f6, rgba:'rgba(59,130,246,1)' }
        };

        // Group by month for spiral arm placement
        var monthGroups = {};
        filtered.forEach(function(e){
            var key = e.date.substring(0,7);
            if(!monthGroups[key]) monthGroups[key]=[];
            monthGroups[key].push(e);
        });
        var monthKeys = Object.keys(monthGroups).sort();

        monthKeys.forEach(function(monthKey, monthIdx){
            var group = monthGroups[monthKey];
            var armAngleBase = (monthIdx / Math.max(monthKeys.length,1)) * Math.PI * 4; // spiral angle per month
            var armRadius = 8 + monthIdx * (35 / Math.max(monthKeys.length,1)); // increasing radius

            group.forEach(function(entry, dayIdx){
                var hours = entry.worked || 0;
                var expected = entry.expected || 8;
                var ratio = expected > 0 ? hours / expected : 0;
                var type = entry.type || 'work';

                // Determine category
                var category;
                if(type==='school') category='school';
                else if(type==='vacation'||type==='holiday'||type==='gleittag') category='special';
                else if(type==='sick') category='red';
                else if(ratio>=1.0) category='superstar';
                else if(ratio>=0.7) category='normal';
                else if(ratio>=0.4) category='low';
                else category='red';

                var cm = colorMap[category];

                // Position in spiral
                var dayAngle = armAngleBase + (dayIdx / Math.max(group.length,1)) * (Math.PI * 2 / Math.max(monthKeys.length,1)) * 0.8;
                var rJitter = (Math.random()-0.5)*3;
                var yJitter = (Math.random()-0.5)*2.5;
                var px = Math.cos(dayAngle) * (armRadius + rJitter);
                var py = yJitter;
                var pz = Math.sin(dayAngle) * (armRadius + rJitter);

                // Star size based on hours
                var starSize = 0.3 + (hours / 12) * 1.2;
                if(category==='superstar') starSize *= 1.4;

                // Create star sprite with glow texture
                var tex = apGxCreateStarTexture(cm.rgba, 128);
                var spriteMat = new THREE.SpriteMaterial({
                    map: tex,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                var sprite = new THREE.Sprite(spriteMat);
                sprite.scale.set(starSize*2.5, starSize*2.5, 1);
                sprite.position.set(px, py, pz);

                // Store metadata
                sprite.userData = {
                    date: entry.date,
                    hours: hours,
                    expected: expected,
                    type: type,
                    diff: entry.diff || 0,
                    project: entry.project || '',
                    ratio: ratio,
                    category: category,
                    baseScale: starSize*2.5,
                    dayName: ['So','Mo','Di','Mi','Do','Fr','Sa'][new Date(entry.date).getDay()]
                };

                scene.add(sprite);
                stars.push(sprite);

                // Extra orbiting particle for superstars
                if(category==='superstar'){
                    var orbitGeo = new THREE.RingGeometry(starSize*1.8, starSize*2.0, 32);
                    var orbitMat = new THREE.MeshBasicMaterial({ color:cm.hex, transparent:true, opacity:0.15, side:THREE.DoubleSide });
                    var orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
                    orbitRing.position.copy(sprite.position);
                    orbitRing.rotation.x = Math.random()*Math.PI;
                    orbitRing.rotation.z = Math.random()*Math.PI;
                    scene.add(orbitRing);
                }
            });
        });

        // ── Month label sprites on outer edge ──
        var monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        monthKeys.forEach(function(key, mi){
            var angle = (mi / Math.max(monthKeys.length,1)) * Math.PI * 4;
            var r = 10 + mi * (35 / Math.max(monthKeys.length,1));
            var parts = key.split('-');
            var label = monthNames[parseInt(parts[1],10)-1] + ' ' + parts[0].substring(2);
            var lCanvas = document.createElement('canvas');
            lCanvas.width = 128; lCanvas.height = 48;
            var lCtx = lCanvas.getContext('2d');
            lCtx.fillStyle = isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';
            lCtx.font = 'bold 20px Inter, sans-serif';
            lCtx.textAlign = 'center';
            lCtx.fillText(label, 64, 30);
            var lTex = new THREE.CanvasTexture(lCanvas);
            var lSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:lTex, transparent:true }));
            lSprite.scale.set(5,2,1);
            lSprite.position.set(Math.cos(angle)*(r+4), 4, Math.sin(angle)*(r+4));
            scene.add(lSprite);
        });

        // ── Constellation lines connecting streak days ──
        var streakLines = [];
        for(var si=1; si<stars.length; si++){
            var prev = stars[si-1], curr = stars[si];
            if(prev.userData.type==='work' && curr.userData.type==='work'){
                var d1 = new Date(prev.userData.date), d2 = new Date(curr.userData.date);
                var dayDiff = Math.abs(d2-d1)/86400000;
                if(dayDiff<=3){
                    var lineGeo = new THREE.BufferGeometry().setFromPoints([prev.position, curr.position]);
                    var lineMat = new THREE.LineBasicMaterial({ color:0xa855f7, transparent:true, opacity:0.06 });
                    scene.add(new THREE.Line(lineGeo, lineMat));
                }
            }
        }

        // ── Save state ──
        apGxState.scene = scene;
        apGxState.camera = camera;
        apGxState.renderer = renderer;
        apGxState.controls = controls;
        apGxState.composer = composer;
        apGxState.stars = stars;
        apGxState.raycaster = new THREE.Raycaster();
        apGxState.raycaster.params.Points = { threshold: 1 };
        apGxState.mouse = new THREE.Vector2();

        // ── Mouse move ──
        renderer.domElement.addEventListener('mousemove', function(ev){
            var rect = renderer.domElement.getBoundingClientRect();
            apGxState.mouse.x = ((ev.clientX-rect.left)/rect.width)*2-1;
            apGxState.mouse.y = -((ev.clientY-rect.top)/rect.height)*2+1;
        });

        // ── Animation loop ──
        var clock = new THREE.Clock();
        function animate(){
            apGxState.animId = requestAnimationFrame(animate);
            var elapsed = clock.getElapsedTime();
            controls.update();

            // Core pulsing
            var pulse = 1 + Math.sin(elapsed*2)*0.08;
            core.scale.set(pulse, pulse, pulse);

            // Dust rotation
            dustSystem.rotation.y += 0.0003;
            spiralSystem.rotation.y += 0.00015;

            // Star twinkle
            for(var si=0; si<stars.length; si++){
                var s = stars[si];
                var twinkle = 1 + Math.sin(elapsed*3 + si*0.7) * 0.12;
                var bs = s.userData.baseScale;
                s.scale.set(bs*twinkle, bs*twinkle, 1);
            }

            // Hover detection (raycaster against sprites)
            apGxState.raycaster.setFromCamera(apGxState.mouse, camera);
            var hits = apGxState.raycaster.intersectObjects(stars);
            var infoEl = document.getElementById('apGxInfoOverlay');

            if(apGxState.hoveredStar && apGxState.hoveredStar !== (hits.length>0 ? hits[0].object : null)){
                var hbs = apGxState.hoveredStar.userData.baseScale;
                apGxState.hoveredStar.scale.set(hbs, hbs, 1);
                apGxState.hoveredStar.material.opacity = 0.9;
            }

            if(hits.length>0){
                var hit = hits[0].object;
                if(hit.userData.date){
                    hit.material.opacity = 1;
                    var hs = hit.userData.baseScale * 1.6;
                    hit.scale.set(hs, hs, 1);
                    apGxState.hoveredStar = hit;
                    var ud = hit.userData;
                    var typeLabels = {work:'Arbeit',school:'Schule',vacation:'Urlaub',sick:'Krank',holiday:'Feiertag',gleittag:'Gleittag'};
                    if(infoEl){
                        infoEl.innerHTML = '<b>⭐ ' + ud.dayName + ', ' + new Date(ud.date).toLocaleDateString('de-DE') + '</b> &nbsp;|&nbsp; ' +
                            (typeLabels[ud.type]||ud.type) + ' &nbsp;|&nbsp; ' +
                            ud.hours.toFixed(2)+'h / '+ud.expected.toFixed(2)+'h &nbsp;|&nbsp; ' +
                            '<span style="color:'+(ud.diff>=0?'#22c55e':'#ef4444')+'">'+(ud.diff>=0?'+':'')+ud.diff.toFixed(2)+'h</span>' +
                            (ud.project ? ' &nbsp;|&nbsp; '+ud.project : '') +
                            ' &nbsp;|&nbsp; <span style="color:'+(colorMap[ud.category]||colorMap.normal).rgba.replace('1)','0.9)')+'">'+({superstar:'⭐ Superstar',normal:'🟣 Normal',low:'🟡 Dwarf',red:'🔴 Red Giant',school:'🔵 Schule',special:'💙 Spezial'}[ud.category]||'')+'</span>';
                        infoEl.classList.add('visible');
                    }
                }
            } else {
                apGxState.hoveredStar = null;
                if(infoEl) infoEl.classList.remove('visible');
            }

            // Render with or without bloom
            if(apGxState.bloomEnabled && composer){
                composer.render();
            } else {
                renderer.render(scene, camera);
            }
        }
        animate();

        // ── Resize ──
        window.addEventListener('resize', function(){
            if(!apGxState.renderer) return;
            var c = document.getElementById('apGxContainer');
            if(!c) return;
            var nw=c.clientWidth, nh=c.clientHeight;
            camera.aspect = nw/nh;
            camera.updateProjectionMatrix();
            renderer.setSize(nw, nh);
            if(composer) composer.setSize(nw, nh);
        });

        // ── Stats ──
        apGxRenderStats(filtered);
    }

    function apGxRenderStats(entries){
        var el = document.getElementById('apGxStats');
        if(!el) return;
        var total = entries.length;
        var work = entries.filter(function(e){return e.type==='work';});
        var superstars = work.filter(function(e){return (e.expected||8)>0&&(e.worked||0)>=(e.expected||8);}).length;
        var totalHrs = work.reduce(function(s,e){return s+(e.worked||0);},0);
        var avgH = work.length ? totalHrs/work.length : 0;
        var maxStreak = 0, curStreak = 0;
        for(var i=0;i<entries.length;i++){
            if(entries[i].type==='work'&&(entries[i].worked||0)>=(entries[i].expected||8)){curStreak++;if(curStreak>maxStreak)maxStreak=curStreak;}else{curStreak=0;}
        }
        el.innerHTML =
            '<div class="ap-kpi"><div class="ap-kpi-value">'+total+'</div><div class="ap-kpi-label">⭐ Sterne im Universum</div><div class="ap-kpi-sub">'+superstars+' Superstars</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">'+avgH.toFixed(1)+'h</div><div class="ap-kpi-label">⌀ Leuchtkraft</div><div class="ap-kpi-sub">'+totalHrs.toFixed(0)+'h Gesamtenergie</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">'+maxStreak+'</div><div class="ap-kpi-label">🔥 Längste Supernova</div><div class="ap-kpi-sub">Tage in Serie ≥ Soll</div></div>';
    }