// ═══ CORE: ANALYTICS-PRO-ENGINE ═══
    // ════════════════════════════════════════════════════════════════
    // ██  ANALYTICS PRO — Premium Data Visualization Engine        ██
    // ██  Chart.js powered, real-time data from MyWorkLog          ██
    // ════════════════════════════════════════════════════════════════

    // Chart.js lazy-loader (only loaded when Analytics Pro is opened)
    var _chartJSLoading = false;
    var _chartJSCallbacks = [];
    function _loadChartJS(callback) {
        if (typeof Chart !== 'undefined') { callback(); return; }
        _chartJSCallbacks.push(callback);
        if (_chartJSLoading) return;
        _chartJSLoading = true;
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1';
        s.onload = function() {
            _chartJSLoading = false;
            var cbs = _chartJSCallbacks.splice(0);
            cbs.forEach(function(cb) { cb(); });
        };
        s.onerror = function() { console.error('[AnalyticsPro] Chart.js konnte nicht geladen werden'); };
        document.head.appendChild(s);
    }

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
        // Only 3D and Galaxy use Three.js — all other tabs need Chart.js
        var needsChart = tabId !== '3d' && tabId !== 'galaxy';
        if (needsChart && typeof Chart === 'undefined') {
            _loadChartJS(function() { apRenderPanel(tabId); });
            return;
        }
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
                    labels: last30.map(function(e){ var dt = new Date(e.date); return dt.toLocaleDateString(mwlLocale(), {day:'2-digit', month:'short'}); }),
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
                html += '<div class="ap-heatmap-cell" data-level="' + level + '" title="' + date.toLocaleDateString(mwlLocale()) + ': ' + h.toFixed(1) + 'h"></div>';
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
                    labels: sliced.map(function(e){ return new Date(e.date).toLocaleDateString(mwlLocale(), {day:'2-digit',month:'short'}); }),
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
                    labels: sliced.map(function(e){ return new Date(e.date).toLocaleDateString(mwlLocale(), {day:'2-digit',month:'short'}); }),
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
                    monthHtml += '<div style="font-size:0.6rem;color:' + d.textColor + ';text-align:center;">' + mdate.toLocaleDateString(mwlLocale(),{month:'short'}) + '</div>';
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
                    html += '<div class="ap-heatmap-cell" data-level="' + level + '" title="' + date.toLocaleDateString(mwlLocale()) + ': ' + h.toFixed(1) + 'h"></div>';
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
                    labels: last60.map(function(e){ return new Date(e.date).toLocaleDateString(mwlLocale(), {day:'2-digit',month:'short'}); }),
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
                '<div class="ap-kpi"><div class="ap-kpi-value">' + maxStreak + '</div><div class="ap-kpi-label">Längster Streak</div><div class="ap-kpi-sub">' + (longestStart ? new Date(longestStart).toLocaleDateString(mwlLocale(),{day:'2-digit',month:'short'}) + ' – ' + new Date(longestEnd).toLocaleDateString(mwlLocale(),{day:'2-digit',month:'short'}) : '—') + '</div></div>' +
                '<div class="ap-kpi"><div class="ap-kpi-value">' + maxHours.toFixed(1) + 'h</div><div class="ap-kpi-label">Rekord-Tag</div><div class="ap-kpi-sub">' + (maxEntry ? new Date(maxEntry.date).toLocaleDateString(mwlLocale()) : '—') + '</div></div>' +
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
            return new Date(parseInt(parts[0]), parseInt(parts[1])-1).toLocaleDateString(mwlLocale(), {month:'short', year:'2-digit'});
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
                        return new Date(parseInt(parts[0]), parseInt(parts[1])-1).toLocaleDateString(mwlLocale(), {month:'short', year:'2-digit'});
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
                            info.innerHTML = '<b>' + ud.dayName + ', ' + new Date(ud.date).toLocaleDateString(mwlLocale()) + '</b> &nbsp;|&nbsp; ' +
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
    //  10. GALAXY VISUALIZATION — PHOTOREALISTIC ENGINE
    //  Custom GLSL shaders, volumetric nebula, differential
    //  rotation, cosmic dust lanes, cinematic post-processing
    // ════════════════════════════════════════════
    (function() {
        var _s = {}; try { _s = JSON.parse(localStorage.getItem('tg_galaxy_settings') || '{}'); } catch(e){}
        window._apGxInitSettings = { range: _s.range || 90, bloom: _s.bloom !== false, orbit: !!_s.orbit };
    })();
    var apGxState = { scene:null, camera:null, renderer:null, controls:null, composer:null, animId:null, range:window._apGxInitSettings.range, stars:[], raycaster:null, mouse:null, hoveredStar:null, bloomEnabled:window._apGxInitSettings.bloom, nebulaPlanes:[], coreMeshes:[], dustLanes:[] };

    function apGxSaveSettings() {
        try { localStorage.setItem('tg_galaxy_settings', JSON.stringify({ range: apGxState.range, bloom: apGxState.bloomEnabled, orbit: !!(apGxState.controls && apGxState.controls.autoRotate) })); } catch(e){}
    }
    function apGxRestoreButtonStates() {
        var s = window._apGxInitSettings;
        document.querySelectorAll('.apgx-controls .ap-period-btn').forEach(function(b) {
            if (b.id === 'apGxBloomBtn') { b.classList.toggle('active', s.bloom !== false); }
            else if (b.id === 'apGxAutoRotBtn') { b.classList.toggle('active', !!s.orbit); }
            else {
                var d = parseInt(b.getAttribute('onclick').match(/apGxSetRange\((\d+)/)?.[1] || '-1');
                b.classList.toggle('active', d === s.range || (d === -1 && s.range === 0));
            }
        });
    }
    function apGxSetRange(days, btn) {
        apGxState.range = days;
        var btns = document.querySelectorAll('.apgx-controls .ap-period-btn');
        btns.forEach(function(b){ if(b.id!=='apGxBloomBtn'&&b.id!=='apGxAutoRotBtn') b.classList.remove('active'); });
        if(btn&&btn.id!=='apGxBloomBtn'&&btn.id!=='apGxAutoRotBtn') btn.classList.add('active');
        apGxSaveSettings();
        apRenderGalaxy();
    }
    function apGxToggleAutoRotate(btn) {
        if(apGxState.controls){ apGxState.controls.autoRotate=!apGxState.controls.autoRotate; btn.classList.toggle('active'); apGxSaveSettings(); }
    }
    function apGxToggleBloom(btn) {
        apGxState.bloomEnabled = !apGxState.bloomEnabled;
        btn.classList.toggle('active');
        apGxSaveSettings();
    }
    function apGxCleanup() {
        if(apGxState.animId){ cancelAnimationFrame(apGxState.animId); apGxState.animId=null; }
        if(apGxState.composer){ apGxState.composer=null; }
        if(apGxState.renderer){ apGxState.renderer.dispose(); apGxState.renderer=null; }
        if(apGxState.controls){ apGxState.controls.dispose(); apGxState.controls=null; }
        apGxState.scene=null; apGxState.camera=null; apGxState.stars=[]; apGxState.hoveredStar=null;
        apGxState.nebulaPlanes=[]; apGxState.coreMeshes=[]; apGxState.dustLanes=[];
        var c=document.getElementById('apGxContainer'); if(c) c.innerHTML='';
    }

    // ── GLSL: Simplex 3D noise (Ashima Arts) ──
    var apGxNoiseGLSL = [
        'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}',
        'vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}',
        'vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}',
        'float snoise(vec3 v){',
        '  const vec2 C=vec2(1.0/6.0,1.0/3.0);',
        '  const vec4 D=vec4(0.0,0.5,1.0,2.0);',
        '  vec3 i=floor(v+dot(v,C.yyy));',
        '  vec3 x0=v-i+dot(i,C.xxx);',
        '  vec3 g=step(x0.yzx,x0.xyz);',
        '  vec3 l=1.0-g;',
        '  vec3 i1=min(g.xyz,l.zxy);',
        '  vec3 i2=max(g.xyz,l.zxy);',
        '  vec3 x1=x0-i1+C.xxx;',
        '  vec3 x2=x0-i2+C.yyy;',
        '  vec3 x3=x0-D.yyy;',
        '  i=mod289(i);',
        '  vec4 p=permute(permute(permute(',
        '    i.z+vec4(0.0,i1.z,i2.z,1.0))',
        '    +i.y+vec4(0.0,i1.y,i2.y,1.0))',
        '    +i.x+vec4(0.0,i1.x,i2.x,1.0));',
        '  float n_=0.142857142857;',
        '  vec3 ns=n_*D.wyz-D.xzx;',
        '  vec4 j=p-49.0*floor(p*ns.z*ns.z);',
        '  vec4 x_=floor(j*ns.z);',
        '  vec4 y_=floor(j-7.0*x_);',
        '  vec4 x=x_*ns.x+ns.yyyy;',
        '  vec4 y=y_*ns.x+ns.yyyy;',
        '  vec4 h=1.0-abs(x)-abs(y);',
        '  vec4 b0=vec4(x.xy,y.xy);',
        '  vec4 b1=vec4(x.zw,y.zw);',
        '  vec4 s0=floor(b0)*2.0+1.0;',
        '  vec4 s1=floor(b1)*2.0+1.0;',
        '  vec4 sh=-step(h,vec4(0.0));',
        '  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;',
        '  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;',
        '  vec3 p0=vec3(a0.xy,h.x);',
        '  vec3 p1=vec3(a0.zw,h.y);',
        '  vec3 p2=vec3(a1.xy,h.z);',
        '  vec3 p3=vec3(a1.zw,h.w);',
        '  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));',
        '  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;',
        '  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);',
        '  m=m*m;',
        '  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));',
        '}'
    ].join('\n');

    // ── GLSL: Fractal Brownian Motion ──
    var apGxFbmGLSL = [
        'float fbm(vec3 p, int octaves){',
        '  float v=0.0; float a=0.5; vec3 shift=vec3(100.0);',
        '  for(int i=0;i<8;i++){',
        '    if(i>=octaves) break;',
        '    v+=a*snoise(p);',
        '    p=p*2.0+shift;',
        '    a*=0.5;',
        '  }',
        '  return v;',
        '}'
    ].join('\n');

    // ── Enhanced star texture with realistic diffraction ──
    function apGxCreateStarTexture(color, size, spikeCount) {
        spikeCount = spikeCount || 6;
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var half = size / 2;

        // Parse color for manipulation
        var m = color.match(/[\d.]+/g);
        var cr = parseInt(m[0]), cg = parseInt(m[1]), cb = parseInt(m[2]);

        // 1) Soft outer halo (large, dim)
        var halo = ctx.createRadialGradient(half, half, 0, half, half, half);
        halo.addColorStop(0, 'rgba('+cr+','+cg+','+cb+',0.8)');
        halo.addColorStop(0.08, 'rgba('+cr+','+cg+','+cb+',0.6)');
        halo.addColorStop(0.15, 'rgba('+cr+','+cg+','+cb+',0.25)');
        halo.addColorStop(0.35, 'rgba('+cr+','+cg+','+cb+',0.06)');
        halo.addColorStop(0.6, 'rgba('+cr+','+cg+','+cb+',0.015)');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, size, size);

        // 2) Bright white-hot core (Airy disk simulation)
        ctx.globalCompositeOperation = 'lighter';
        var coreGrad = ctx.createRadialGradient(half, half, 0, half, half, half * 0.2);
        coreGrad.addColorStop(0, 'rgba(255,255,255,1)');
        coreGrad.addColorStop(0.3, 'rgba(255,255,255,0.9)');
        coreGrad.addColorStop(0.6, 'rgba('+Math.min(255,cr+80)+','+Math.min(255,cg+80)+','+Math.min(255,cb+80)+',0.5)');
        coreGrad.addColorStop(1, 'rgba('+cr+','+cg+','+cb+',0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, size, size);

        // 3) Diffraction spikes (realistic 6-point or 4-point)
        for (var s = 0; s < spikeCount; s++) {
            var angle = (s / spikeCount) * Math.PI;
            ctx.save();
            ctx.translate(half, half);
            ctx.rotate(angle);

            // Main spike
            var spikeGrad = ctx.createLinearGradient(-half, 0, half, 0);
            spikeGrad.addColorStop(0, 'rgba(0,0,0,0)');
            spikeGrad.addColorStop(0.2, 'rgba('+cr+','+cg+','+cb+',0.02)');
            spikeGrad.addColorStop(0.35, 'rgba('+cr+','+cg+','+cb+',0.12)');
            spikeGrad.addColorStop(0.48, 'rgba(255,255,255,0.5)');
            spikeGrad.addColorStop(0.5, 'rgba(255,255,255,0.7)');
            spikeGrad.addColorStop(0.52, 'rgba(255,255,255,0.5)');
            spikeGrad.addColorStop(0.65, 'rgba('+cr+','+cg+','+cb+',0.12)');
            spikeGrad.addColorStop(0.8, 'rgba('+cr+','+cg+','+cb+',0.02)');
            spikeGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = spikeGrad;
            ctx.fillRect(-half, -0.8, size, 1.6);

            // Secondary thinner spike alongside
            var thinGrad = ctx.createLinearGradient(-half*0.7, 0, half*0.7, 0);
            thinGrad.addColorStop(0, 'rgba(0,0,0,0)');
            thinGrad.addColorStop(0.4, 'rgba('+cr+','+cg+','+cb+',0.06)');
            thinGrad.addColorStop(0.5, 'rgba('+cr+','+cg+','+cb+',0.2)');
            thinGrad.addColorStop(0.6, 'rgba('+cr+','+cg+','+cb+',0.06)');
            thinGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = thinGrad;
            ctx.fillRect(-half*0.7, -0.4, size*0.7, 0.8);

            ctx.restore();
        }

        // 4) First Airy ring (faint ring around core)
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(half, half, half * 0.22, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba('+cr+','+cg+','+cb+',0.08)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        return new THREE.CanvasTexture(canvas);
    }

    // ── Nebula cloud texture via canvas noise ──
    function apGxCreateNebulaTexture(baseR, baseG, baseB, size) {
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var imgData = ctx.createImageData(size, size);
        var data = imgData.data;

        for (var y = 0; y < size; y++) {
            for (var x = 0; x < size; x++) {
                var idx = (y * size + x) * 4;
                var nx = x / size - 0.5;
                var ny = y / size - 0.5;
                var dist = Math.sqrt(nx*nx + ny*ny) * 2;

                // Multi-octave noise simulation via sine combinations
                var n = 0;
                n += Math.sin(nx*12.9898 + ny*78.233) * 0.5;
                n += Math.sin(nx*39.346 + ny*11.135 + 3.0) * 0.25;
                n += Math.sin(nx*73.156 + ny*52.235 + 7.0) * 0.125;
                n += Math.cos(nx*21.0 - ny*45.0 + 2.5) * 0.3;
                n += Math.sin((nx*nx+ny*ny)*20.0) * 0.15;
                n = (n + 1.0) * 0.5;
                n = Math.max(0, Math.min(1, n));

                // Spiral arm shape
                var angle = Math.atan2(ny, nx);
                var spiral = Math.sin(angle * 2.0 + dist * 8.0) * 0.5 + 0.5;
                spiral *= Math.sin(angle * 3.0 - dist * 5.0 + 1.5) * 0.5 + 0.5;
                n *= spiral;

                // Radial falloff
                var falloff = Math.max(0, 1.0 - dist * 1.3);
                falloff = falloff * falloff * falloff;
                var alpha = n * falloff * 0.6;

                // Color variation: warm center, cool edges
                var tempShift = dist;
                var r = baseR * (1.0 - tempShift * 0.3) + 40 * tempShift;
                var g = baseG * (1.0 - tempShift * 0.2);
                var b = baseB * (1.0 + tempShift * 0.4);

                data[idx]     = Math.min(255, Math.max(0, r));
                data[idx + 1] = Math.min(255, Math.max(0, g));
                data[idx + 2] = Math.min(255, Math.max(0, b));
                data[idx + 3] = Math.min(255, alpha * 255);
            }
        }

        ctx.putImageData(imgData, 0, 0);
        // Gaussian-like blur via multiple scaled redraws
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = size; tmpCanvas.height = size;
        var tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.filter = 'blur(4px)';
        tmpCtx.drawImage(canvas, 0, 0);
        ctx.globalAlpha = 0.7;
        ctx.drawImage(tmpCanvas, 0, 0);
        ctx.globalAlpha = 1;

        return new THREE.CanvasTexture(canvas);
    }

    function apRenderGalaxy() {
        if(typeof THREE==='undefined'){ var c=document.getElementById('apGxContainer'); if(c) c.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⏳</div>Three.js wird geladen…</div>'; return; }
        apGxRestoreButtonStates();
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
        // Deep space fog for depth
        scene.fog = new THREE.FogExp2(isLight ? 0xf0f0f5 : 0x010008, 0.0015);

        // ── Camera ──
        var camera = new THREE.PerspectiveCamera(55, w/h, 0.1, 3000);
        camera.position.set(0, 40, 65);
        camera.lookAt(0, 0, 0);

        // ── Renderer ──
        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, powerPreference:'high-performance' });
        } catch(e) {
            console.warn('[Galaxy] WebGL init failed:', e.message);
        }
        if(!renderer) {
            container.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">⚠️</div>WebGL nicht verfügbar.<br>Hardware-Beschleunigung aktivieren.</div>';
            return;
        }
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.setClearColor(isLight ? 0xf0f0f5 : 0x010008, 1);
        container.appendChild(renderer.domElement);

        // ── OrbitControls ──
        var OC = THREE.OrbitControls || (window.THREE && window.THREE.OrbitControls);
        if(!OC){ container.innerHTML='<div class="ap-empty" style="padding:4rem"><div class="ap-empty-icon">🔄</div>Controls laden… Bitte F5</div>'; renderer.dispose(); return; }
        var controls = new OC(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.04;
        controls.minDistance = 8;
        controls.maxDistance = 200;
        controls.autoRotate = !!window._apGxInitSettings.orbit;
        controls.autoRotateSpeed = 0.3;
        controls.maxPolarAngle = Math.PI * 0.85;
        controls.minPolarAngle = Math.PI * 0.15;

        // ════════════════════════════════════
        // POST-PROCESSING PIPELINE
        // ════════════════════════════════════
        var composer = null;
        var hasPost = typeof THREE.EffectComposer !== 'undefined' && typeof THREE.RenderPass !== 'undefined' && typeof THREE.UnrealBloomPass !== 'undefined' && typeof THREE.ShaderPass !== 'undefined';
        if(hasPost) {
            composer = new THREE.EffectComposer(renderer);
            composer.addPass(new THREE.RenderPass(scene, camera));

            // 1) Bloom — soft, cinematic glow
            var bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 2.2, 0.8, 0.12);
            bloomPass.threshold = 0.08;
            bloomPass.strength = 2.2;
            bloomPass.radius = 0.8;
            composer.addPass(bloomPass);

            // 2) Chromatic Aberration — subtle RGB split at edges
            var chromaticShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uIntensity: { value: 0.003 },
                    uResolution: { value: new THREE.Vector2(w, h) }
                },
                vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
                fragmentShader: [
                    'uniform sampler2D tDiffuse;',
                    'uniform float uIntensity;',
                    'uniform vec2 uResolution;',
                    'varying vec2 vUv;',
                    'void main(){',
                    '  vec2 dir = vUv - vec2(0.5);',
                    '  float dist = length(dir);',
                    '  float aberration = uIntensity * dist * dist;',
                    '  vec2 offset = dir * aberration;',
                    '  float r = texture2D(tDiffuse, vUv + offset).r;',
                    '  float g = texture2D(tDiffuse, vUv).g;',
                    '  float b = texture2D(tDiffuse, vUv - offset).b;',
                    '  float a = texture2D(tDiffuse, vUv).a;',
                    '  gl_FragColor = vec4(r, g, b, a);',
                    '}'
                ].join('\n')
            };
            var chromaticPass = new THREE.ShaderPass(chromaticShader);
            composer.addPass(chromaticPass);

            // 3) Vignette — dark edges for cinematic depth
            var vignetteShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uDarkness: { value: 1.6 },
                    uOffset: { value: 0.9 }
                },
                vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
                fragmentShader: [
                    'uniform sampler2D tDiffuse;',
                    'uniform float uDarkness;',
                    'uniform float uOffset;',
                    'varying vec2 vUv;',
                    'void main(){',
                    '  vec4 color = texture2D(tDiffuse, vUv);',
                    '  vec2 uv = (vUv - vec2(0.5)) * vec2(uOffset);',
                    '  float vignette = 1.0 - dot(uv, uv);',
                    '  vignette = clamp(pow(vignette, uDarkness), 0.0, 1.0);',
                    '  color.rgb *= mix(0.15, 1.0, vignette);',
                    '  gl_FragColor = color;',
                    '}'
                ].join('\n')
            };
            var vignettePass = new THREE.ShaderPass(vignetteShader);
            composer.addPass(vignettePass);

            // 4) Film grain — subtle analog texture
            var grainShader = {
                uniforms: {
                    tDiffuse: { value: null },
                    uTime: { value: 0 },
                    uIntensity: { value: 0.04 }
                },
                vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
                fragmentShader: [
                    'uniform sampler2D tDiffuse;',
                    'uniform float uTime;',
                    'uniform float uIntensity;',
                    'varying vec2 vUv;',
                    'float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }',
                    'void main(){',
                    '  vec4 color = texture2D(tDiffuse, vUv);',
                    '  float noise = rand(vUv + vec2(uTime)) * 2.0 - 1.0;',
                    '  // Apply grain more to dark areas (photographic behavior)',
                    '  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));',
                    '  float grainAmount = uIntensity * (1.0 - luminance * 0.5);',
                    '  color.rgb += vec3(noise * grainAmount);',
                    '  gl_FragColor = color;',
                    '}'
                ].join('\n')
            };
            var grainPass = new THREE.ShaderPass(grainShader);
            composer.addPass(grainPass);

            apGxState.grainPass = grainPass;
            apGxState.bloomPass = bloomPass;
        }

        // ════════════════════════════════════
        // BACKGROUND — DEEP STAR FIELD (custom shader)
        // 6000 stars with color temperature variation
        // ════════════════════════════════════
        var bgCount = 6000;
        var bgGeo = new THREE.BufferGeometry();
        var bgPositions = new Float32Array(bgCount * 3);
        var bgColors = new Float32Array(bgCount * 3);
        var bgSizes = new Float32Array(bgCount);
        var bgPhases = new Float32Array(bgCount);

        for (var i = 0; i < bgCount; i++) {
            // Distribute in a sphere, denser toward galactic plane
            var theta = Math.random() * Math.PI * 2;
            var phi = Math.acos(2 * Math.random() - 1);
            var radius = 100 + Math.random() * 600;
            bgPositions[i*3]   = radius * Math.sin(phi) * Math.cos(theta);
            bgPositions[i*3+1] = radius * Math.sin(phi) * Math.sin(theta) * (0.3 + Math.random() * 0.7);
            bgPositions[i*3+2] = radius * Math.cos(phi);

            // Color temperature: blue-white to warm yellow-red
            var temp = Math.random();
            if (temp < 0.1) { // Hot blue
                bgColors[i*3]=0.6; bgColors[i*3+1]=0.7; bgColors[i*3+2]=1.0;
            } else if (temp < 0.4) { // White
                bgColors[i*3]=0.95; bgColors[i*3+1]=0.95; bgColors[i*3+2]=1.0;
            } else if (temp < 0.7) { // Yellow-white
                bgColors[i*3]=1.0; bgColors[i*3+1]=0.93; bgColors[i*3+2]=0.8;
            } else if (temp < 0.9) { // Orange
                bgColors[i*3]=1.0; bgColors[i*3+1]=0.75; bgColors[i*3+2]=0.5;
            } else { // Red dwarf
                bgColors[i*3]=1.0; bgColors[i*3+1]=0.5; bgColors[i*3+2]=0.3;
            }

            bgSizes[i] = 0.3 + Math.pow(Math.random(), 3) * 2.5; // Power law: few bright, many dim
            bgPhases[i] = Math.random() * Math.PI * 2;
        }

        bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
        bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
        bgGeo.setAttribute('aSize', new THREE.BufferAttribute(bgSizes, 1));
        bgGeo.setAttribute('aPhase', new THREE.BufferAttribute(bgPhases, 1));

        var bgStarMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'attribute float aPhase;',
                'varying vec3 vColor;',
                'varying float vBrightness;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'void main(){',
                '  vColor = color;',
                '  // Realistic twinkle: atmospheric scintillation simulation',
                '  float twinkle = sin(uTime * 1.5 + aPhase) * sin(uTime * 2.7 + aPhase * 1.3) * 0.3 + 0.7;',
                '  twinkle *= sin(uTime * 0.5 + aPhase * 0.7) * 0.15 + 0.85;',
                '  vBrightness = twinkle;',
                '  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPos.z) * twinkle;',
                '  gl_PointSize = max(gl_PointSize, 0.5);',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vBrightness;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  // Airy disk approximation: bright core + dim halo',
                '  float core = exp(-dist * dist * 80.0);',
                '  float halo = exp(-dist * dist * 8.0) * 0.3;',
                '  float brightness = (core + halo) * vBrightness;',
                '  vec3 col = vColor * brightness;',
                '  // Add subtle white-hot center',
                '  col += vec3(1.0) * core * core * 0.5;',
                '  gl_FragColor = vec4(col, brightness);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        scene.add(new THREE.Points(bgGeo, bgStarMat));

        // ════════════════════════════════════
        // GALACTIC CORE — Volumetric glowing nucleus
        // Multi-layered with animated pulse and color shift
        // ════════════════════════════════════
        var coreGroup = new THREE.Group();

        // Inner white-hot core
        var coreInnerGeo = new THREE.SphereGeometry(1.8, 64, 64);
        var coreInnerMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: [
                'varying vec3 vNormal;',
                'varying vec3 vPos;',
                'uniform float uTime;',
                'void main(){',
                '  vNormal = normalize(normalMatrix * normal);',
                '  vPos = position;',
                '  vec3 pos = position;',
                '  // Subtle surface turbulence',
                '  pos += normal * sin(pos.x * 3.0 + uTime * 2.0) * sin(pos.y * 4.0 + uTime * 1.5) * 0.08;',
                '  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vNormal;',
                'varying vec3 vPos;',
                'uniform float uTime;',
                'void main(){',
                '  float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));',
                '  // White-hot center fading to purple at edges',
                '  vec3 hotWhite = vec3(1.0, 0.98, 0.95);',
                '  vec3 purple = vec3(0.66, 0.33, 0.97);',
                '  vec3 col = mix(hotWhite, purple, fresnel * fresnel);',
                '  // Animated surface detail',
                '  float detail = sin(vPos.x * 8.0 + uTime * 3.0) * sin(vPos.y * 8.0 + uTime * 2.5) * sin(vPos.z * 8.0 + uTime * 2.0);',
                '  col += vec3(0.3, 0.15, 0.5) * detail * 0.15;',
                '  float alpha = 0.95 - fresnel * 0.3;',
                '  gl_FragColor = vec4(col, alpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false
        });
        var coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
        coreGroup.add(coreInner);
        apGxState.coreMeshes.push(coreInnerMat);

        // Multiple glow shells with decreasing opacity
        var glowColors = [
            { r:0.66, g:0.33, b:0.97, size:3.5, opacity:0.12 },
            { r:0.55, g:0.20, b:0.95, size:5.0, opacity:0.06 },
            { r:0.45, g:0.10, b:0.90, size:7.5, opacity:0.025 },
            { r:0.35, g:0.05, b:0.85, size:11.0, opacity:0.012 },
            { r:0.30, g:0.02, b:0.80, size:16.0, opacity:0.005 }
        ];
        glowColors.forEach(function(gc) {
            var gGeo = new THREE.SphereGeometry(gc.size, 32, 32);
            var gMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(gc.r, gc.g, gc.b),
                transparent: true, opacity: gc.opacity,
                side: THREE.BackSide, depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            coreGroup.add(new THREE.Mesh(gGeo, gMat));
        });

        // Core light source
        var coreLight = new THREE.PointLight(0xa855f7, 2.5, 80, 2);
        coreLight.position.set(0, 0, 0);
        coreGroup.add(coreLight);

        scene.add(coreGroup);

        // ════════════════════════════════════
        // VOLUMETRIC NEBULA CLOUDS
        // Layered transparent planes with noise-based textures
        // ════════════════════════════════════
        var nebulaConfigs = [
            { r:120, g:50, b:200, scale:55, y:0, rotX:0, rotZ:0, opacity:0.22 },
            { r:80, g:30, b:180, scale:70, y:-1, rotX:0.1, rotZ:0.3, opacity:0.14 },
            { r:140, g:60, b:220, scale:50, y:1, rotX:-0.1, rotZ:-0.2, opacity:0.18 },
            { r:60, g:100, b:200, scale:65, y:0.5, rotX:0.05, rotZ:0.5, opacity:0.10 },
            { r:180, g:80, b:160, scale:45, y:-0.5, rotX:-0.05, rotZ:0.8, opacity:0.12 },
            { r:100, g:40, b:240, scale:80, y:0, rotX:0, rotZ:1.2, opacity:0.06 }
        ];
        nebulaConfigs.forEach(function(nc) {
            var nebTex = apGxCreateNebulaTexture(nc.r, nc.g, nc.b, 512);
            nebTex.wrapS = THREE.ClampToEdgeWrapping;
            nebTex.wrapT = THREE.ClampToEdgeWrapping;
            var nebGeo = new THREE.PlaneGeometry(nc.scale, nc.scale);
            var nebMat = new THREE.MeshBasicMaterial({
                map: nebTex, transparent: true, opacity: nc.opacity,
                side: THREE.DoubleSide, depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            var nebPlane = new THREE.Mesh(nebGeo, nebMat);
            nebPlane.rotation.x = -Math.PI/2 + nc.rotX;
            nebPlane.rotation.z = nc.rotZ;
            nebPlane.position.y = nc.y;
            scene.add(nebPlane);
            apGxState.nebulaPlanes.push(nebPlane);
        });

        // ════════════════════════════════════
        // SPIRAL ARM PARTICLES — Custom shader with
        // differential rotation + density wave theory
        // ════════════════════════════════════
        var spiralCount = 5000;
        var spiralGeo = new THREE.BufferGeometry();
        var spiralPositions = new Float32Array(spiralCount * 3);
        var spiralColors = new Float32Array(spiralCount * 3);
        var spiralSizes = new Float32Array(spiralCount);
        var spiralVelocities = new Float32Array(spiralCount); // For differential rotation
        var spiralPhases = new Float32Array(spiralCount);

        for (var sp = 0; sp < spiralCount; sp++) {
            var arm = sp % 4; // 4 spiral arms
            var t = Math.pow(sp / spiralCount, 0.7) * Math.PI * 5;
            var baseRadius = 3 + t * 2.2;
            var armOffset = arm * (Math.PI * 2 / 4);
            // Scatter: tighter near core, wider at edges
            var scatter = (Math.random() - 0.5) * (1.5 + t * 0.4) * (0.5 + Math.random());
            var yScatter = (Math.random() - 0.5) * (0.8 + baseRadius * 0.02);

            spiralPositions[sp*3]   = Math.cos(t + armOffset) * baseRadius + scatter;
            spiralPositions[sp*3+1] = yScatter;
            spiralPositions[sp*3+2] = Math.sin(t + armOffset) * baseRadius + scatter;

            // Color: warm near core (HII regions), cool blue at edges
            var distFromCenter = baseRadius / 50;
            var colorNoise = Math.random() * 0.2;
            if (distFromCenter < 0.3) {
                // Warm yellow-white core region
                spiralColors[sp*3]   = 1.0 - colorNoise;
                spiralColors[sp*3+1] = 0.85 - colorNoise;
                spiralColors[sp*3+2] = 0.6;
            } else if (distFromCenter < 0.6) {
                // Purple-pink mid region
                spiralColors[sp*3]   = 0.6 + colorNoise;
                spiralColors[sp*3+1] = 0.25;
                spiralColors[sp*3+2] = 0.85 + colorNoise * 0.5;
            } else {
                // Cool blue outer region
                spiralColors[sp*3]   = 0.3 + colorNoise;
                spiralColors[sp*3+1] = 0.4 + colorNoise;
                spiralColors[sp*3+2] = 0.9 + colorNoise * 0.5;
            }

            spiralSizes[sp] = 0.3 + Math.random() * 0.8 + (distFromCenter < 0.3 ? 0.4 : 0);
            // Keplerian: inner rotates faster
            spiralVelocities[sp] = 1.0 / Math.sqrt(Math.max(baseRadius, 3)) * 0.15;
            spiralPhases[sp] = Math.random() * Math.PI * 2;
        }

        spiralGeo.setAttribute('position', new THREE.BufferAttribute(spiralPositions, 3));
        spiralGeo.setAttribute('color', new THREE.BufferAttribute(spiralColors, 3));
        spiralGeo.setAttribute('aSize', new THREE.BufferAttribute(spiralSizes, 1));
        spiralGeo.setAttribute('aVelocity', new THREE.BufferAttribute(spiralVelocities, 1));
        spiralGeo.setAttribute('aPhase', new THREE.BufferAttribute(spiralPhases, 1));

        var spiralMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'attribute float aVelocity;',
                'attribute float aPhase;',
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'void main(){',
                '  vColor = color;',
                '  // Differential rotation around Y axis',
                '  float angle = aVelocity * uTime;',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(',
                '    position.x * cosA - position.z * sinA,',
                '    position.y,',
                '    position.x * sinA + position.z * cosA',
                '  );',
                '  // Subtle bobbing',
                '  rotated.y += sin(uTime * 0.5 + aPhase) * 0.15;',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (180.0 / -mvPos.z);',
                '  gl_PointSize = max(gl_PointSize, 0.3);',
                '  // Fade based on distance for depth',
                '  float dist = length(rotated.xz);',
                '  vAlpha = 0.5 * (1.0 - smoothstep(0.0, 60.0, dist)) + 0.1;',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float glow = exp(-dist * dist * 18.0);',
                '  float softEdge = 1.0 - smoothstep(0.0, 0.5, dist);',
                '  float brightness = glow * 0.8 + softEdge * 0.2;',
                '  gl_FragColor = vec4(vColor * brightness, brightness * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        var spiralSystem = new THREE.Points(spiralGeo, spiralMat);
        scene.add(spiralSystem);

        // ════════════════════════════════════
        // COSMIC DUST LANES — Dark absorption bands
        // ════════════════════════════════════
        var dustLaneCount = 2000;
        var dustGeo = new THREE.BufferGeometry();
        var dustPositions = new Float32Array(dustLaneCount * 3);
        var dustSizes = new Float32Array(dustLaneCount);

        for (var dl = 0; dl < dustLaneCount; dl++) {
            var arm2 = dl % 4;
            var t2 = Math.pow(dl / dustLaneCount, 0.6) * Math.PI * 5;
            var r2 = 5 + t2 * 2.0;
            var armOff2 = arm2 * (Math.PI / 2) + 0.3; // Offset from bright arms
            var scatter2 = (Math.random() - 0.5) * (1.0 + t2 * 0.2);

            dustPositions[dl*3]   = Math.cos(t2 + armOff2) * r2 + scatter2;
            dustPositions[dl*3+1] = (Math.random() - 0.5) * 0.6;
            dustPositions[dl*3+2] = Math.sin(t2 + armOff2) * r2 + scatter2;
            dustSizes[dl] = 1.0 + Math.random() * 3.0;
        }

        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeo.setAttribute('aSize', new THREE.BufferAttribute(dustSizes, 1));

        var dustLaneMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'varying float vAlpha;',
                'void main(){',
                '  float angle = 0.02 * uTime / max(length(position.xz), 3.0);',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(',
                '    position.x * cosA - position.z * sinA,',
                '    position.y,',
                '    position.x * sinA + position.z * cosA',
                '  );',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPos.z);',
                '  float dist = length(rotated.xz);',
                '  vAlpha = 0.25 * (1.0 - smoothstep(5.0, 55.0, dist));',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float soft = 1.0 - smoothstep(0.0, 0.5, dist);',
                '  // Dark absorption — subtract light',
                '  gl_FragColor = vec4(0.0, 0.0, 0.02, soft * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.NormalBlending
        });
        var dustLaneSystem = new THREE.Points(dustGeo, dustLaneMat);
        scene.add(dustLaneSystem);

        // ════════════════════════════════════
        // HOT GAS / EMISSION NEBULA — Scattered bright patches
        // ════════════════════════════════════
        var emissionCount = 800;
        var emGeo = new THREE.BufferGeometry();
        var emPositions = new Float32Array(emissionCount * 3);
        var emColors = new Float32Array(emissionCount * 3);
        var emSizes = new Float32Array(emissionCount);

        for (var em = 0; em < emissionCount; em++) {
            var emArm = em % 4;
            var emT = Math.pow(em / emissionCount, 0.8) * Math.PI * 4.5;
            var emR = 6 + emT * 1.8;
            var emOff = emArm * (Math.PI / 2);
            var emScatter = (Math.random() - 0.5) * (2.0 + emT * 0.3);

            emPositions[em*3]   = Math.cos(emT + emOff) * emR + emScatter;
            emPositions[em*3+1] = (Math.random() - 0.5) * 1.2;
            emPositions[em*3+2] = Math.sin(emT + emOff) * emR + emScatter;

            // Emission colors: hydrogen-alpha pink, OIII teal, SII red
            var emType = Math.random();
            if (emType < 0.45) { // H-alpha pink
                emColors[em*3]=1.0; emColors[em*3+1]=0.3; emColors[em*3+2]=0.5;
            } else if (emType < 0.75) { // OIII teal
                emColors[em*3]=0.1; emColors[em*3+1]=0.8; emColors[em*3+2]=0.7;
            } else { // SII deep red
                emColors[em*3]=0.9; emColors[em*3+1]=0.15; emColors[em*3+2]=0.15;
            }

            emSizes[em] = 2.0 + Math.random() * 5.0;
        }

        emGeo.setAttribute('position', new THREE.BufferAttribute(emPositions, 3));
        emGeo.setAttribute('color', new THREE.BufferAttribute(emColors, 3));
        emGeo.setAttribute('aSize', new THREE.BufferAttribute(emSizes, 1));

        var emMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'void main(){',
                '  vColor = color;',
                '  float angle = 0.03 * uTime / max(length(position.xz), 4.0);',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(',
                '    position.x * cosA - position.z * sinA,',
                '    position.y + sin(uTime * 0.3 + position.x * 0.5) * 0.2,',
                '    position.x * sinA + position.z * cosA',
                '  );',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (140.0 / -mvPos.z);',
                '  float dist = length(rotated.xz);',
                '  vAlpha = 0.08 * (1.0 - smoothstep(5.0, 50.0, dist));',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float glow = exp(-dist * dist * 6.0);',
                '  gl_FragColor = vec4(vColor * glow, glow * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        // emission nebula removed (too visually noisy)

        // ════════════════════════════════════
        // FINE INTERSTELLAR DUST — Soft ambient haze
        // ════════════════════════════════════
        var hazeCount = 3000;
        var hazeGeo = new THREE.BufferGeometry();
        var hazePositions = new Float32Array(hazeCount * 3);
        var hazeColors = new Float32Array(hazeCount * 3);
        var hazeSizes = new Float32Array(hazeCount);

        for (var hz = 0; hz < hazeCount; hz++) {
            var hAngle = Math.random() * Math.PI * 2;
            var hRadius = 2 + Math.random() * 48;
            hazePositions[hz*3]   = Math.cos(hAngle) * hRadius + (Math.random()-0.5) * 5;
            hazePositions[hz*3+1] = (Math.random()-0.5) * 3;
            hazePositions[hz*3+2] = Math.sin(hAngle) * hRadius + (Math.random()-0.5) * 5;

            var hDist = hRadius / 48;
            hazeColors[hz*3]   = 0.5 + hDist * 0.2;
            hazeColors[hz*3+1] = 0.2 + hDist * 0.15;
            hazeColors[hz*3+2] = 0.8 + hDist * 0.2;
            hazeSizes[hz] = 0.5 + Math.random() * 1.5;
        }

        hazeGeo.setAttribute('position', new THREE.BufferAttribute(hazePositions, 3));
        hazeGeo.setAttribute('color', new THREE.BufferAttribute(hazeColors, 3));
        hazeGeo.setAttribute('aSize', new THREE.BufferAttribute(hazeSizes, 1));

        var hazeMat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
            vertexShader: [
                'attribute float aSize;',
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'uniform float uTime;',
                'uniform float uPixelRatio;',
                'void main(){',
                '  vColor = color;',
                '  float speed = 0.015 / max(length(position.xz), 2.0);',
                '  float angle = speed * uTime;',
                '  float cosA = cos(angle); float sinA = sin(angle);',
                '  vec3 rotated = vec3(position.x*cosA - position.z*sinA, position.y, position.x*sinA + position.z*cosA);',
                '  vec4 mvPos = modelViewMatrix * vec4(rotated, 1.0);',
                '  gl_PointSize = aSize * uPixelRatio * (120.0 / -mvPos.z);',
                '  float dist = length(rotated.xz);',
                '  vAlpha = 0.12 * (1.0 - smoothstep(0.0, 50.0, dist));',
                '  gl_Position = projectionMatrix * mvPos;',
                '}'
            ].join('\n'),
            fragmentShader: [
                'varying vec3 vColor;',
                'varying float vAlpha;',
                'void main(){',
                '  float dist = length(gl_PointCoord - vec2(0.5));',
                '  if(dist > 0.5) discard;',
                '  float soft = exp(-dist * dist * 10.0);',
                '  gl_FragColor = vec4(vColor * soft * 0.6, soft * vAlpha);',
                '}'
            ].join('\n'),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });
        var hazeSystem = new THREE.Points(hazeGeo, hazeMat);
        scene.add(hazeSystem);

        // ════════════════════════════════════
        // DATA STARS — Photorealistic interactive stars
        // ════════════════════════════════════
        var stars = [];
        var colorMap = {
            'superstar': { hex:0x22c55e, rgba:'rgba(34,197,94,1)', spikes:6 },
            'normal':    { hex:0xa855f7, rgba:'rgba(168,85,247,1)', spikes:4 },
            'low':       { hex:0xf59e0b, rgba:'rgba(245,158,11,1)', spikes:4 },
            'red':       { hex:0xef4444, rgba:'rgba(239,68,68,1)', spikes:4 },
            'school':    { hex:0x06b6d4, rgba:'rgba(6,182,212,1)', spikes:4 },
            'special':   { hex:0x3b82f6, rgba:'rgba(59,130,246,1)', spikes:4 }
        };

        var monthGroups = {};
        filtered.forEach(function(e){
            var key = e.date.substring(0,7);
            if(!monthGroups[key]) monthGroups[key]=[];
            monthGroups[key].push(e);
        });
        var monthKeys = Object.keys(monthGroups).sort();

        monthKeys.forEach(function(monthKey, monthIdx){
            var group = monthGroups[monthKey];
            var armAngleBase = (monthIdx / Math.max(monthKeys.length,1)) * Math.PI * 4;
            var armRadius = 8 + monthIdx * (38 / Math.max(monthKeys.length,1));

            group.forEach(function(entry, dayIdx){
                var hours = entry.worked || 0;
                var expected = entry.expected || 8;
                var ratio = expected > 0 ? hours / expected : 0;
                var type = entry.type || 'work';

                var category;
                if(type==='school') category='school';
                else if(type==='vacation'||type==='holiday'||type==='gleittag') category='special';
                else if(type==='sick') category='red';
                else if(ratio>=1.0) category='superstar';
                else if(ratio>=0.7) category='normal';
                else if(ratio>=0.4) category='low';
                else category='red';

                var cm = colorMap[category];

                var dayAngle = armAngleBase + (dayIdx / Math.max(group.length,1)) * (Math.PI * 2 / Math.max(monthKeys.length,1)) * 0.8;
                var rJitter = (Math.random()-0.5)*3;
                var yJitter = (Math.random()-0.5)*2.0;
                var px = Math.cos(dayAngle) * (armRadius + rJitter);
                var py = yJitter;
                var pz = Math.sin(dayAngle) * (armRadius + rJitter);

                var starSize = 0.4 + (hours / 12) * 1.4;
                if(category==='superstar') starSize *= 1.5;

                // High-res star texture with diffraction spikes
                var tex = apGxCreateStarTexture(cm.rgba, 256, cm.spikes);
                var spriteMat = new THREE.SpriteMaterial({
                    map: tex, transparent: true, opacity: 0.95,
                    blending: THREE.AdditiveBlending, depthWrite: false
                });
                var sprite = new THREE.Sprite(spriteMat);
                sprite.scale.set(starSize*2.8, starSize*2.8, 1);
                sprite.position.set(px, py, pz);

                sprite.userData = {
                    date: entry.date, hours: hours, expected: expected,
                    type: type, diff: entry.diff || 0, project: entry.project || '',
                    ratio: ratio, category: category, baseScale: starSize*2.8,
                    dayName: ['So','Mo','Di','Mi','Do','Fr','Sa'][new Date(entry.date).getDay()]
                };

                scene.add(sprite);
                stars.push(sprite);

                // Superstar: orbiting ring + companion particles
                if(category==='superstar'){
                    var orbitGeo = new THREE.RingGeometry(starSize*2.0, starSize*2.2, 64);
                    var orbitMat = new THREE.MeshBasicMaterial({ color:cm.hex, transparent:true, opacity:0.12, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false });
                    var orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
                    orbitRing.position.copy(sprite.position);
                    orbitRing.rotation.x = Math.random()*Math.PI;
                    orbitRing.rotation.z = Math.random()*Math.PI;
                    scene.add(orbitRing);

                    // Companion particles orbiting
                    for (var cp = 0; cp < 3; cp++) {
                        var cpAngle = cp * (Math.PI * 2 / 3);
                        var cpDist = starSize * 2.5;
                        var cpSprite = new THREE.Sprite(new THREE.SpriteMaterial({
                            map: apGxCreateStarTexture(cm.rgba, 64, 4),
                            transparent: true, opacity: 0.6,
                            blending: THREE.AdditiveBlending, depthWrite: false
                        }));
                        cpSprite.scale.set(starSize*0.4, starSize*0.4, 1);
                        cpSprite.position.set(
                            px + Math.cos(cpAngle)*cpDist,
                            py + (Math.random()-0.5)*0.5,
                            pz + Math.sin(cpAngle)*cpDist
                        );
                        scene.add(cpSprite);
                    }
                }
            });
        });

        // ── Month label sprites ──
        var monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        monthKeys.forEach(function(key, mi){
            var angle = (mi / Math.max(monthKeys.length,1)) * Math.PI * 4;
            var r = 10 + mi * (38 / Math.max(monthKeys.length,1));
            var parts = key.split('-');
            var label = monthNames[parseInt(parts[1],10)-1] + ' ' + parts[0].substring(2);
            var lCanvas = document.createElement('canvas');
            lCanvas.width = 256; lCanvas.height = 64;
            var lCtx = lCanvas.getContext('2d');

            // Subtle background pill
            lCtx.fillStyle = 'rgba(168,85,247,0.06)';
            var pillW = 200, pillH = 36, pillX = 28, pillY = 14;
            lCtx.beginPath();
            lCtx.roundRect(pillX, pillY, pillW, pillH, 18);
            lCtx.fill();

            lCtx.fillStyle = isLight ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.5)';
            lCtx.font = '600 22px "JetBrains Mono", monospace';
            lCtx.textAlign = 'center';
            lCtx.fillText(label, 128, 38);
            var lTex = new THREE.CanvasTexture(lCanvas);
            var lSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:lTex, transparent:true, depthWrite:false }));
            lSprite.scale.set(6, 1.5, 1);
            lSprite.position.set(Math.cos(angle)*(r+5), 4.5, Math.sin(angle)*(r+5));
            scene.add(lSprite);
        });

        // ── Constellation lines (streak connections) ──
        for(var si=1; si<stars.length; si++){
            var prev = stars[si-1], curr = stars[si];
            if(prev.userData.type==='work' && curr.userData.type==='work'){
                var d1 = new Date(prev.userData.date), d2 = new Date(curr.userData.date);
                var dayDiff = Math.abs(d2-d1)/86400000;
                if(dayDiff<=3){
                    var lineGeo = new THREE.BufferGeometry().setFromPoints([prev.position, curr.position]);
                    var lineMat = new THREE.LineBasicMaterial({ color:0xa855f7, transparent:true, opacity:0.04, blending:THREE.AdditiveBlending, depthWrite:false });
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
        apGxState.bgStarMat = bgStarMat;
        apGxState.spiralMat = spiralMat;
        apGxState.dustLaneMat = dustLaneMat;
        apGxState.emMat = emMat;
        apGxState.hazeMat = hazeMat;
        apGxState.coreLight = coreLight;
        apGxState.raycaster = new THREE.Raycaster();
        apGxState.raycaster.params.Points = { threshold: 1 };
        apGxState.mouse = new THREE.Vector2();

        // ── Mouse move ──
        renderer.domElement.addEventListener('mousemove', function(ev){
            var rect = renderer.domElement.getBoundingClientRect();
            apGxState.mouse.x = ((ev.clientX-rect.left)/rect.width)*2-1;
            apGxState.mouse.y = -((ev.clientY-rect.top)/rect.height)*2+1;
        });

        // ════════════════════════════════════
        // ANIMATION LOOP — Cinematic 60fps
        // ════════════════════════════════════
        var clock = new THREE.Clock();
        function animate(){
            apGxState.animId = requestAnimationFrame(animate);
            var elapsed = clock.getElapsedTime();
            controls.update();

            // Update all shader uniforms
            bgStarMat.uniforms.uTime.value = elapsed;
            spiralMat.uniforms.uTime.value = elapsed;
            dustLaneMat.uniforms.uTime.value = elapsed;
            emMat.uniforms.uTime.value = elapsed;
            hazeMat.uniforms.uTime.value = elapsed;
            coreInnerMat.uniforms.uTime.value = elapsed;

            // Film grain time
            if(apGxState.grainPass) apGxState.grainPass.uniforms.uTime.value = elapsed;

            // Core pulsing — organic breathing
            var pulse = 1 + Math.sin(elapsed*1.2)*0.06 + Math.sin(elapsed*2.8)*0.03;
            coreGroup.scale.set(pulse, pulse, pulse);

            // Core light intensity fluctuation
            coreLight.intensity = 2.5 + Math.sin(elapsed*1.5)*0.5 + Math.sin(elapsed*3.7)*0.2;

            // Nebula slow drift
            for(var ni=0; ni<apGxState.nebulaPlanes.length; ni++){
                apGxState.nebulaPlanes[ni].rotation.z += 0.00008 * (ni % 2 === 0 ? 1 : -1);
                apGxState.nebulaPlanes[ni].material.opacity = nebulaConfigs[ni].opacity * (0.85 + Math.sin(elapsed * 0.2 + ni) * 0.15);
            }

            // Star twinkle with more organic variation
            for(var sti=0; sti<stars.length; sti++){
                var s = stars[sti];
                var twk = 1 + Math.sin(elapsed*2.0 + sti*0.9) * Math.sin(elapsed*3.1 + sti*1.3) * 0.12;
                var bs = s.userData.baseScale;
                s.scale.set(bs*twk, bs*twk, 1);
            }

            // Hover detection
            apGxState.raycaster.setFromCamera(apGxState.mouse, camera);
            var hits = apGxState.raycaster.intersectObjects(stars);
            var infoEl = document.getElementById('apGxInfoOverlay');

            if(apGxState.hoveredStar && apGxState.hoveredStar !== (hits.length>0 ? hits[0].object : null)){
                var hbs = apGxState.hoveredStar.userData.baseScale;
                apGxState.hoveredStar.scale.set(hbs, hbs, 1);
                apGxState.hoveredStar.material.opacity = 0.95;
            }

            if(hits.length>0){
                var hit = hits[0].object;
                if(hit.userData.date){
                    hit.material.opacity = 1;
                    var hs = hit.userData.baseScale * 1.8;
                    hit.scale.set(hs, hs, 1);
                    apGxState.hoveredStar = hit;
                    var ud = hit.userData;
                    var typeLabels = {work:'Arbeit',school:'Schule',vacation:'Urlaub',sick:'Krank',holiday:'Feiertag',gleittag:'Gleittag'};
                    if(infoEl){
                        infoEl.innerHTML = '<div class="apgx-info-row"><span class="apgx-info-date">' + ud.dayName + ', ' + new Date(ud.date).toLocaleDateString(mwlLocale()) + '</span><span class="apgx-info-type">' + (typeLabels[ud.type]||ud.type) + '</span></div>' +
                            '<div class="apgx-info-row"><span class="apgx-info-hours">' + ud.hours.toFixed(2)+'h / '+ud.expected.toFixed(2)+'h</span>' +
                            '<span class="apgx-info-diff" style="color:'+(ud.diff>=0?'#22c55e':'#ef4444')+'">'+(ud.diff>=0?'+':'')+ud.diff.toFixed(2)+'h</span>' +
                            (ud.project ? '<span class="apgx-info-project">'+safeHTML(ud.project)+'</span>' : '') +
                            '</div>' +
                            '<div class="apgx-info-category" style="color:'+(colorMap[ud.category]||colorMap.normal).rgba.replace('1)','0.9)')+'">'+({superstar:'Superstar',normal:'Nebula',low:'Dwarf',red:'Red Giant',school:'Schule',special:'Spezial'}[ud.category]||'')+'</div>';
                        infoEl.classList.add('visible');
                    }
                }
            } else {
                apGxState.hoveredStar = null;
                if(infoEl) infoEl.classList.remove('visible');
            }

            // Render
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
            '<div class="ap-kpi"><div class="ap-kpi-value">'+total+'</div><div class="ap-kpi-label">Sterne im Universum</div><div class="ap-kpi-sub">'+superstars+' Superstars</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">'+avgH.toFixed(1)+'h</div><div class="ap-kpi-label">⌀ Leuchtkraft</div><div class="ap-kpi-sub">'+totalHrs.toFixed(0)+'h Gesamtenergie</div></div>' +
            '<div class="ap-kpi"><div class="ap-kpi-value">'+maxStreak+'</div><div class="ap-kpi-label">Längste Supernova</div><div class="ap-kpi-sub">Tage in Serie ≥ Soll</div></div>';
    }