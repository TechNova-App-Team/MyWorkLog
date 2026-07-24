// ═══ WEEKVIEW MODULE ═══

    function renderWeekView() {
        const monday = getWeekMonday(weekViewOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const kwNum = getISOWeekNumber(monday);

        const lbl = document.getElementById('wvWeekLabel');
        const rng = document.getElementById('wvDateRange');
        if (lbl) lbl.textContent = `KW ${kwNum} · ${monday.getFullYear()}`;
        if (rng) rng.textContent = `${monday.toLocaleDateString(mwlLocale(), {day:'2-digit',month:'short'})} – ${sunday.toLocaleDateString(mwlLocale(), {day:'2-digit',month:'short',year:'numeric'})}`;

        const entries = getWeekEntries(monday);
        const tw = calcWeekStats(entries);

        const prevMonday = getWeekMonday(weekViewOffset - 1);
        const prevEntries = getWeekEntries(prevMonday);
        const lw = calcWeekStats(prevEntries);

        const sollHours = (data.settings && data.settings.hours) ? data.settings.hours.reduce((a,b) => a + b, 0) : 40;

        // ── KPI GRID ──────────────────────────────────────────────────
        const kpiGrid = document.getElementById('wvKPIGrid');
        if (kpiGrid) {
            const pctDone = sollHours > 0 ? (tw.hours / sollHours * 100) : 0;
            const saldoColor = tw.saldo >= 0 ? '#10b981' : '#f43f5e';
            const saldoAccent = tw.saldo >= 0 ? '#10b981' : '#f43f5e';

            kpiGrid.innerHTML = `
                <div class="wv-kpi-tile" style="--wv-tile-accent:#a855f7;">
                    <div class="wv-kpi-label">Gearbeitet</div>
                    <div class="wv-kpi-value">${tw.hours.toFixed(1)}h</div>
                    <div class="wv-kpi-sub">von ${sollHours}h Soll</div>
                </div>
                <div class="wv-kpi-tile" style="--wv-tile-accent:${saldoAccent};">
                    <div class="wv-kpi-label">Saldo</div>
                    <div class="wv-kpi-value">${tw.saldo >= 0 ? '+' : ''}${tw.saldo.toFixed(1)}h</div>
                    <div class="wv-kpi-sub">Über/Unterstunden</div>
                </div>
                <div class="wv-kpi-tile" style="--wv-tile-accent:#22d3ee;">
                    <div class="wv-kpi-label">Arbeitstage</div>
                    <div class="wv-kpi-value">${tw.days}</div>
                    <div class="wv-kpi-sub">${[tw.schoolDays > 0 ? tw.schoolDays+' Schule' : '', tw.vacDays > 0 ? tw.vacDays+' Urlaub' : '', tw.sickDays > 0 ? tw.sickDays+' Krank' : ''].filter(Boolean).join(' · ') || 'Tage erfasst'}</div>
                </div>
                <div class="wv-kpi-tile" style="--wv-tile-accent:#f59e0b;">
                    <div class="wv-kpi-label">Fortschritt</div>
                    <div class="wv-kpi-value">${Math.min(pctDone, 100).toFixed(0)}%</div>
                    <div class="wv-kpi-progress"><div class="wv-kpi-progress-bar" style="--wv-tile-accent:#f59e0b; width:${Math.min(pctDone, 100)}%;"></div></div>
                </div>
            `;
        }

        // ── WEEK COMPARISON ───────────────────────────────────────────
        const cmpContainer = document.getElementById('wvComparisonContent');
        if (cmpContainer) {
            const delta = lw.hours > 0 ? ((tw.hours - lw.hours) / lw.hours * 100) : (tw.hours > 0 ? 100 : 0);
            const deltaColor = delta >= 0 ? '#10b981' : '#f43f5e';
            const deltaArrow = delta > 2 ? '↑' : (delta < -2 ? '↓' : '→');
            const deltaBg = delta >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
            const prevKW = getISOWeekNumber(prevMonday);

            cmpContainer.innerHTML = `
                <div class="wv-cmp-side">
                    <div class="wv-cmp-label">KW ${prevKW} · Vorwoche</div>
                    <div class="wv-cmp-hours" style="color:var(--text-muted);">${lw.hours.toFixed(1)}h</div>
                    <div class="wv-cmp-meta">${lw.days} Tage &nbsp;·&nbsp; ${lw.saldo >= 0 ? '+' : ''}${lw.saldo.toFixed(1)}h Saldo</div>
                </div>
                <div class="wv-cmp-delta-col">
                    <div class="wv-delta-arrow" style="color:${deltaColor};">${deltaArrow}</div>
                    <div class="wv-delta-pct" style="color:${deltaColor}; background:${deltaBg};">${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%</div>
                </div>
                <div class="wv-cmp-side is-current">
                    <div class="wv-cmp-label" style="color:rgba(168,85,247,0.7);">KW ${kwNum} · Aktuell</div>
                    <div class="wv-cmp-hours" style="color:#a855f7;">${tw.hours.toFixed(1)}h</div>
                    <div class="wv-cmp-meta">${tw.days} Tage &nbsp;·&nbsp; ${tw.saldo >= 0 ? '+' : ''}${tw.saldo.toFixed(1)}h Saldo</div>
                </div>
            `;
        }

        // ── DAILY BREAKDOWN ───────────────────────────────────────────
        const dayNames = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
        const dayShort = ['Mo','Di','Mi','Do','Fr','Sa','So'];
        const typeColors = {
            work:     '#a855f7',
            school:   '#818cf8',
            vacation: '#3b82f6',
            gleittag: '#f59e0b',
            sick:     '#f472b6',
            holiday:  '#f59e0b'
        };
        const typeLabels = {
            work:     'Arbeit',
            school:   'Schule',
            vacation: 'Urlaub',
            gleittag: 'Gleittag',
            sick:     'Krank',
            holiday:  'Feiertag'
        };

        const dailyContainer = document.getElementById('wvDailyBreakdown');
        if (dailyContainer) {
            let html = '';
            const todayStr = toLocalISODate(new Date());

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + i);
                const dateStr = toLocalISODate(dayDate);
                const isToday = dateStr === todayStr;
                const entry = entries.find(e => e.date === dateStr);
                const sollDay = (data.settings && data.settings.hours) ? (data.settings.hours[(i + 1) % 7] || 0) : (i < 5 ? 8 : 0);

                html += `<div class="wv-day-card${isToday ? ' is-today' : ''}">`;

                // Left: day label
                html += `<div>
                    <div class="wv-day-name">${dayNames[i]}</div>
                    <div class="wv-day-date">${dayDate.toLocaleDateString(mwlLocale(), {day:'2-digit', month:'2-digit'})}</div>
                </div>`;

                if (entry) {
                    const color = typeColors[entry.type] || '#a855f7';
                    const label = typeLabels[entry.type] || entry.type;
                    const workedH = (entry.worked || 0).toFixed(1);
                    const diffH = (entry.diff || 0);
                    const diffSign = diffH >= 0 ? '+' : '';
                    const diffColor = diffH >= 0 ? '#10b981' : '#f43f5e';
                    const diffBg   = diffH >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
                    const pct = sollDay > 0 ? Math.min((entry.worked || 0) / sollDay * 100, 100) : 0;

                    html += `<div class="wv-day-content">
                        <div class="wv-day-meta">
                            <span class="wv-day-badge" style="background:${color}18; color:${color}; border:1px solid ${color}30;">${label}</span>
                            <span class="wv-day-hours-val" style="color:${color};">${workedH}h</span>
                            <span class="wv-day-soll">/ ${sollDay}h</span>
                            <span class="wv-day-diff" style="color:${diffColor}; background:${diffBg};">${diffSign}${diffH.toFixed(1)}h</span>
                        </div>
                        <div class="wv-day-bar-wrap">
                            <div class="wv-day-bar-fill" style="width:${pct}%; background:${color};"></div>
                        </div>
                    </div>`;

                    html += `<div class="wv-day-times">
                        ${entry.start || '--:--'} – ${entry.end || '--:--'}
                        ${entry.breakTime ? '<br><span style="opacity:0.6;">☕ ' + entry.breakTime + 'min</span>' : ''}
                    </div>`;
                } else {
                    const isPast = dayDate < new Date() && !isToday;
                    const isWeekend = i >= 5;
                    html += `<div class="wv-day-content">
                        <div class="wv-day-empty">
                            ${isWeekend ? 'Wochenende' : (isPast ? 'Kein Eintrag' : (isToday ? 'Noch offen…' : '—'))}
                        </div>
                        ${sollDay > 0 ? `<div class="wv-day-bar-wrap"><div class="wv-day-bar-fill" style="width:0%; background:rgba(255,255,255,0.08);"></div></div>` : ''}
                    </div>`;
                    html += `<div class="wv-day-times" style="color:rgba(255,255,255,0.2);">${sollDay > 0 ? sollDay + 'h Soll' : '—'}</div>`;
                }

                html += '</div>';
            }

            dailyContainer.innerHTML = html;
        }

        // ── DAY BARS ──────────────────────────────────────────────────
        const barsContainer = document.getElementById('wvDayBars');
        if (barsContainer) {
            const shortDays = ['Mo','Di','Mi','Do','Fr','Sa','So'];
            const maxH = Math.max(10, ...entries.map(e => e.worked || 0));
            let html = '';

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + i);
                const dateStr = toLocalISODate(dayDate);
                const entry = entries.find(e => e.date === dateStr);
                const h = entry ? (entry.worked || 0) : 0;
                const pctH = maxH > 0 ? (h / maxH * 100) : 0;
                const color = entry ? (typeColors[entry.type] || '#a855f7') : 'rgba(255,255,255,0.05)';
                const isToday = dateStr === toLocalISODate(new Date());

                html += `<div class="wv-bar-col">
                    <div class="wv-bar-value" style="${h > 0 ? 'color:#fff;' : ''}">${h > 0 ? h.toFixed(1) : ''}</div>
                    <div class="wv-bar-fill-wrap">
                        <div class="wv-bar-fill${isToday ? ' is-today' : ''}" style="height:${Math.max(pctH, 4)}%; background:${color};"></div>
                    </div>
                    <div class="wv-bar-day-label${isToday ? ' is-today' : ''}">${shortDays[i]}</div>
                </div>`;
            }

            barsContainer.innerHTML = html;
        }

        // ── TREND CHART ───────────────────────────────────────────────
        const trendContainer = document.getElementById('wvTrendChart');
        const trendLabels   = document.getElementById('wvTrendLabels');
        if (trendContainer && trendLabels) {
            const weeksData = [];
            for (let w = -7; w <= 0; w++) {
                const wOffset  = weekViewOffset + w;
                const wMonday  = getWeekMonday(wOffset);
                const wEntries = getWeekEntries(wMonday);
                const wStats   = calcWeekStats(wEntries);
                const wKW      = getISOWeekNumber(wMonday);
                weeksData.push({ kw: wKW, hours: wStats.hours, saldo: wStats.saldo, isCurrent: (w === 0) });
            }

            const maxTH = Math.max(10, ...weeksData.map(w => w.hours));
            let tHtml = '';
            let lHtml = '';

            weeksData.forEach(w => {
                const pct = maxTH > 0 ? (w.hours / maxTH * 100) : 0;
                const barColor = w.isCurrent ? '#a855f7' : (w.saldo >= 0 ? '#10b981' : 'rgba(255,255,255,0.1)');
                const glow = w.isCurrent ? 'box-shadow:0 0 14px rgba(168,85,247,0.5);' : '';

                tHtml += `<div class="wv-trend-col" title="KW ${w.kw}: ${w.hours.toFixed(1)}h">
                    <div class="wv-trend-val" style="${w.isCurrent ? 'color:#a855f7;' : ''}">${w.hours > 0 ? w.hours.toFixed(0) : ''}</div>
                    <div class="wv-trend-fill-wrap">
                        <div class="wv-trend-bar" style="height:${Math.max(pct, 4)}%; background:${barColor}; ${glow}"></div>
                    </div>
                </div>`;

                lHtml += `<div class="wv-trend-kw${w.isCurrent ? ' is-current' : ''}" style="flex:1; text-align:center;">KW${w.kw}</div>`;
            });

            trendContainer.innerHTML = tHtml;
            trendLabels.innerHTML    = lHtml;
        }
    }
