// ═══ WEEKVIEW MODULE ═══

    function renderWeekView() {
        const monday = getWeekMonday(weekViewOffset);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const kwNum = getISOWeekNumber(monday);

        // Week label
        const lbl = document.getElementById('wvWeekLabel');
        const rng = document.getElementById('wvDateRange');
        if (lbl) lbl.textContent = `KW ${kwNum} – ${monday.getFullYear()}`;
        if (rng) rng.textContent = `${monday.toLocaleDateString('de-DE', {day:'2-digit',month:'short'})} – ${sunday.toLocaleDateString('de-DE', {day:'2-digit',month:'short',year:'numeric'})}`;

        const entries = getWeekEntries(monday);
        const tw = calcWeekStats(entries);

        // Previous week for comparison
        const prevMonday = getWeekMonday(weekViewOffset - 1);
        const prevEntries = getWeekEntries(prevMonday);
        const lw = calcWeekStats(prevEntries);

        // Soll hours for this week
        const sollHours = (data.settings && data.settings.hours) ? data.settings.hours.reduce((a,b) => a + b, 0) : 40;

        // ========== KPI GRID ==========
        const kpiGrid = document.getElementById('wvKPIGrid');
        if (kpiGrid) {
            const pctDone = sollHours > 0 ? (tw.hours / sollHours * 100) : 0;
            kpiGrid.innerHTML = `
                <div class="card" style="border-left:4px solid var(--primary); text-align:center; padding:1.2rem;">
                    <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Gearbeitet</div>
                    <div style="font-size:1.8rem; font-weight:800; color:var(--primary); font-family:var(--font-mono); margin:6px 0;">${tw.hours.toFixed(1)}h</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">von ${sollHours}h Soll</div>
                </div>
                <div class="card" style="border-left:4px solid ${tw.saldo >= 0 ? 'var(--success)' : 'var(--danger)'}; text-align:center; padding:1.2rem;">
                    <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Saldo</div>
                    <div style="font-size:1.8rem; font-weight:800; color:${tw.saldo >= 0 ? 'var(--success)' : 'var(--danger)'}; font-family:var(--font-mono); margin:6px 0;">${tw.saldo >= 0 ? '+' : ''}${tw.saldo.toFixed(1)}h</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">Über/Unterstunden</div>
                </div>
                <div class="card" style="border-left:4px solid #06b6d4; text-align:center; padding:1.2rem;">
                    <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Arbeitstage</div>
                    <div style="font-size:1.8rem; font-weight:800; color:#06b6d4; font-family:var(--font-mono); margin:6px 0;">${tw.days}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${tw.schoolDays > 0 ? tw.schoolDays + ' Schule' : ''} ${tw.vacDays > 0 ? tw.vacDays + ' Urlaub' : ''} ${tw.sickDays > 0 ? tw.sickDays + ' Krank' : ''}</div>
                </div>
                <div class="card" style="border-left:4px solid #fbbf24; text-align:center; padding:1.2rem;">
                    <div style="font-size:0.72rem; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">Fortschritt</div>
                    <div style="font-size:1.8rem; font-weight:800; color:#fbbf24; font-family:var(--font-mono); margin:6px 0;">${Math.min(pctDone, 100).toFixed(0)}%</div>
                    <div style="height:4px; border-radius:4px; background:rgba(255,255,255,0.06); margin-top:6px; overflow:hidden;">
                        <div style="height:100%; width:${Math.min(pctDone, 100)}%; background:linear-gradient(90deg,#fbbf24,var(--success)); border-radius:4px; transition:width 0.5s;"></div>
                    </div>
                </div>
            `;
        }

        // ========== WEEK COMPARISON ==========
        const cmpContainer = document.getElementById('wvComparisonContent');
        if (cmpContainer) {
            const delta = lw.hours > 0 ? ((tw.hours - lw.hours) / lw.hours * 100) : (tw.hours > 0 ? 100 : 0);
            const deltaColor = delta >= 0 ? 'var(--success)' : 'var(--danger)';
            const deltaArrow = delta > 0 ? '↑' : (delta < 0 ? '↓' : '→');
            const deltaBg = delta >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
            const prevKW = getISOWeekNumber(prevMonday);

            cmpContainer.innerHTML = `
                <div class="week-cmp-block">
                    <div class="week-cmp-label">KW ${prevKW} (Vorwoche)</div>
                    <div class="week-cmp-hours">${lw.hours.toFixed(1)}h</div>
                    <div class="week-cmp-days">${lw.days} Tage | ${lw.saldo >= 0 ? '+' : ''}${lw.saldo.toFixed(1)}h Saldo</div>
                </div>
                <div class="week-cmp-delta">
                    <div class="week-cmp-arrow" style="color:${deltaColor}">${deltaArrow}</div>
                    <div class="week-cmp-pct" style="color:${deltaColor}; background:${deltaBg}">
                        ${delta >= 0 ? '+' : ''}${delta.toFixed(0)}%
                    </div>
                </div>
                <div class="week-cmp-block" style="border-left:2px solid var(--primary-dim);">
                    <div class="week-cmp-label">KW ${kwNum} (Aktuell)</div>
                    <div class="week-cmp-hours" style="color:var(--primary);">${tw.hours.toFixed(1)}h</div>
                    <div class="week-cmp-days">${tw.days} Tage | ${tw.saldo >= 0 ? '+' : ''}${tw.saldo.toFixed(1)}h Saldo</div>
                </div>
            `;
        }

        // ========== DAILY BREAKDOWN ==========
        const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
        const dayEmojis = { work: '💼', school: '🎓', vacation: '🏖️', gleittag: '⚡', sick: '🤒', holiday: '🎉' };
        const dayColors = { work: 'var(--primary)', school: 'var(--school)', vacation: '#3b82f6', gleittag: '#f59e0b', sick: '#f472b6', holiday: '#f59e0b' };
        const dailyContainer = document.getElementById('wvDailyBreakdown');
        if (dailyContainer) {
            let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
            const todayStr = toLocalISODate(new Date());

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + i);
                const dateStr = toLocalISODate(dayDate);
                const isToday = dateStr === todayStr;
                const entry = entries.find(e => e.date === dateStr);
                const sollDay = (data.settings && data.settings.hours) ? (data.settings.hours[(i + 1) % 7] || 0) : (i < 5 ? 8 : 0);

                const bgHighlight = isToday ? 'background:rgba(var(--primary-rgb),0.08); border:1px solid rgba(var(--primary-rgb),0.2);' : 'background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04);';

                html += `<div class="wv-day-row" style="display:grid; grid-template-columns:140px 1fr auto; gap:12px; align-items:center; padding:12px 16px; border-radius:12px; ${bgHighlight}">`;

                // Day label
                html += `<div>
                    <div style="font-weight:600; font-size:0.9rem; ${isToday ? 'color:var(--primary);' : ''}">${isToday ? '▸ ' : ''}${dayNames[i]}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${dayDate.toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</div>
                </div>`;

                if (entry) {
                    const emoji = dayEmojis[entry.type] || '📄';
                    const color = dayColors[entry.type] || 'var(--text-muted)';
                    const workedH = (entry.worked || 0).toFixed(1);
                    const diffH = (entry.diff || 0);
                    const diffSign = diffH >= 0 ? '+' : '';
                    const diffColor = diffH >= 0 ? 'var(--success)' : 'var(--danger)';

                    // Progress bar
                    const pct = sollDay > 0 ? Math.min((entry.worked || 0) / sollDay * 100, 120) : 0;
                    html += `<div>
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span>${emoji}</span>
                            <span style="font-weight:700; font-family:var(--font-mono); color:${color};">${workedH}h</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);">/ ${sollDay}h Soll</span>
                            <span style="font-size:0.75rem; font-weight:600; color:${diffColor}; font-family:var(--font-mono);">${diffSign}${diffH.toFixed(1)}h</span>
                        </div>
                        <div style="height:4px; border-radius:4px; background:rgba(255,255,255,0.06); overflow:hidden;">
                            <div style="height:100%; width:${Math.min(pct, 100)}%; background:${color}; border-radius:4px; transition:width 0.4s;"></div>
                        </div>
                    </div>`;
                    // Times
                    html += `<div style="text-align:right; font-size:0.78rem; color:var(--text-muted); font-family:var(--font-mono);">
                        ${entry.start || '--:--'} – ${entry.end || '--:--'}
                        ${entry.breakTime ? '<br>☕ ' + entry.breakTime + ' min' : ''}
                    </div>`;
                } else {
                    // No entry
                    const isPast = dayDate < new Date() && !isToday;
                    html += `<div style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">
                        ${(i >= 5) ? '🟡 Wochenende' : (isPast ? '⊘ Kein Eintrag' : (isToday ? '⏳ Noch offen...' : '·'))}
                    </div>`;
                    html += `<div style="text-align:right; font-size:0.78rem; color:var(--text-muted);">${sollDay > 0 ? sollDay + 'h Soll' : '—'}</div>`;
                }

                html += '</div>';
            }
            html += '</div>';
            dailyContainer.innerHTML = html;
        }

        // ========== DAY BARS (Stunden pro Tag) ==========
        const barsContainer = document.getElementById('wvDayBars');
        if (barsContainer) {
            const shortDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            const maxH = Math.max(10, ...entries.map(e => e.worked || 0));
            let barsHtml = '';

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(monday);
                dayDate.setDate(monday.getDate() + i);
                const dateStr = toLocalISODate(dayDate);
                const entry = entries.find(e => e.date === dateStr);
                const h = entry ? (entry.worked || 0) : 0;
                const pct = maxH > 0 ? (h / maxH * 100) : 0;
                const color = entry ? (dayColors[entry.type] || 'var(--primary)') : 'rgba(255,255,255,0.06)';
                const isToday = dateStr === toLocalISODate(new Date());

                barsHtml += `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;">
                    <div style="font-size:0.72rem; font-weight:700; font-family:var(--font-mono); color:${h > 0 ? '#fff' : 'var(--text-muted)'};">${h > 0 ? h.toFixed(1) : '—'}</div>
                    <div style="width:100%; height:${Math.max(pct, 3)}%; min-height:4px; background:${h > 0 ? color : 'rgba(255,255,255,0.04)'}; border-radius:8px 8px 4px 4px; transition:height 0.4s; ${isToday ? 'box-shadow:0 0 8px rgba(var(--primary-rgb),0.4);' : ''}"></div>
                    <div style="font-size:0.7rem; font-weight:${isToday ? '700' : '500'}; color:${isToday ? 'var(--primary)' : 'var(--text-muted)'};">${shortDays[i]}</div>
                </div>`;
            }
            barsContainer.innerHTML = barsHtml;
        }

        // ========== TREND CHART (last 8 weeks) ==========
        const trendContainer = document.getElementById('wvTrendChart');
        const trendLabels = document.getElementById('wvTrendLabels');
        if (trendContainer && trendLabels) {
            const weeksData = [];
            for (let w = -7; w <= 0; w++) {
                const wOffset = weekViewOffset + w;
                const wMonday = getWeekMonday(wOffset);
                const wEntries = getWeekEntries(wMonday);
                const wStats = calcWeekStats(wEntries);
                const wKW = getISOWeekNumber(wMonday);
                weeksData.push({ kw: wKW, hours: wStats.hours, saldo: wStats.saldo, isCurrent: (w === 0) });
            }

            const maxTH = Math.max(10, ...weeksData.map(w => w.hours));
            let trendHtml = '';
            let labelsHtml = '';

            weeksData.forEach(w => {
                const pct = maxTH > 0 ? (w.hours / maxTH * 100) : 0;
                const barColor = w.isCurrent ? 'var(--primary)' : (w.saldo >= 0 ? 'var(--success)' : 'rgba(255,255,255,0.12)');
                const glow = w.isCurrent ? 'box-shadow:0 0 12px rgba(var(--primary-rgb),0.4);' : '';
                trendHtml += `<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:4px;" title="KW ${w.kw}: ${w.hours.toFixed(1)}h">
                    <div style="font-size:0.65rem; font-family:var(--font-mono); color:${w.isCurrent ? 'var(--primary)' : 'var(--text-muted)'};">${w.hours > 0 ? w.hours.toFixed(0) : ''}</div>
                    <div style="width:100%; height:${Math.max(pct, 3)}%; min-height:4px; background:${barColor}; border-radius:6px 6px 2px 2px; transition:height 0.4s; ${glow}"></div>
                </div>`;
                labelsHtml += `<div style="flex:1; text-align:center; font-size:0.65rem; color:${w.isCurrent ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:${w.isCurrent ? '700' : '400'};">KW${w.kw}</div>`;
            });

            trendContainer.innerHTML = trendHtml;
            trendLabels.innerHTML = labelsHtml;
        }
    }

