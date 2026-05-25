// ═══ CORE: EXPORT-ADVANCED ═══
    // ===== EXPORT STATISTICS & DUAL-MODE EXPORT =====
    function openExportStatsModal() {
        const entries = data.entries || [];
        const workEntries = entries.filter(e => e.type === 'work');
        const totalHours = workEntries.reduce((s, e) => s + (e.worked || 0), 0);
        const totalDays = entries.length;
        const totalDiff = entries.reduce((s, e) => s + (e.diff || 0), 0);
        const projects = [...new Set(entries.map(e => e.project).filter(Boolean))];
        const vacDays = entries.filter(e => e.type === 'vacation').length;
        const sickDays = entries.filter(e => e.type === 'sick').length;
        const schoolDays = entries.filter(e => e.type === 'school').length;
        const dateRange = entries.length ? entries[entries.length-1].date + ' → ' + entries[0].date : '—';

        const grid = document.getElementById('exportStatsGrid');
        grid.innerHTML = `
            <div class="export-stat-card"><div class="export-stat-value">${totalDays}</div><div class="export-stat-label">Einträge</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${totalHours.toFixed(0)}h</div><div class="export-stat-label">Arbeitsstunden</div></div>
            <div class="export-stat-card"><div class="export-stat-value" style="color:${totalDiff >= 0 ? 'var(--success)' : 'var(--danger)'}">${totalDiff >= 0 ? '+' : ''}${totalDiff.toFixed(1)}h</div><div class="export-stat-label">Saldo</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${projects.length}</div><div class="export-stat-label">Projekte</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${vacDays}</div><div class="export-stat-label">Urlaub</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${sickDays}</div><div class="export-stat-label">Krank</div></div>
            <div class="export-stat-card"><div class="export-stat-value">${schoolDays}</div><div class="export-stat-label">Berufsschule</div></div>
            <div class="export-stat-card"><div class="export-stat-value" style="font-size:0.85rem;">${dateRange}</div><div class="export-stat-label">Zeitraum</div></div>
        `;

        // Estimate sizes
        const minimalData = { entries: data.entries, settings: data.settings };
        const minSize = new Blob([JSON.stringify(minimalData)]).size;
        document.getElementById('exportSizeMinimal').textContent = '~' + (minSize / 1024).toFixed(0) + ' KB';
        // MAX report is ~3-5x bigger (inline HTML+CSS+SVG charts)
        document.getElementById('exportSizeMax').textContent = '~' + Math.round((minSize * 4) / 1024) + ' KB';

        document.getElementById('exportStatsModal').style.display = 'flex';
    }

    function runExportMinimal() {
        const minimalData = {
            _exportType: 'minimal',
            _version: 1,
            _created: new Date().toISOString(),
            _app: 'MyWorkLog',
            _entryCount: data.entries.length,
            entries: data.entries,
            settings: data.settings
        };
        const blob = new Blob([JSON.stringify(minimalData)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'MyWorkLog_Minimal_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        try { localStorage.setItem('mwl_last_export', new Date().toISOString()); } catch(e) {}
        document.getElementById('exportStatsModal').style.display = 'none';
        showSmartNotification('📦 Minimal Export', `${data.entries.length} Einträge kompakt exportiert (${(blob.size/1024).toFixed(0)} KB)`, 'success');
    }

    function runExportMax() {
        const entries = (data.entries || []).slice().sort((a,b) => new Date(a.date) - new Date(b.date));
        const workEntries = entries.filter(e => e.type === 'work');
        const totalHours = workEntries.reduce((s,e) => s + (e.worked||0), 0);
        const totalDiff = entries.reduce((s,e) => s + (e.diff||0), 0);
        const projects = [...new Set(entries.map(e => e.project).filter(Boolean))];
        const vacDays = entries.filter(e => e.type === 'vacation').length;
        const sickDays = entries.filter(e => e.type === 'sick').length;
        const schoolDays = entries.filter(e => e.type === 'school').length;
        const avgPerDay = workEntries.length > 0 ? (totalHours / workEntries.length) : 0;

        // Build weekly aggregation for chart
        const weekMap = {};
        entries.forEach(e => {
            const d = new Date(e.date);
            const wk = getWeek(d);
            const yr = d.getFullYear();
            const key = yr + '-KW' + String(wk).padStart(2,'0');
            if (!weekMap[key]) weekMap[key] = { worked: 0, expected: 0, diff: 0 };
            weekMap[key].worked += (e.worked || 0);
            weekMap[key].expected += (e.expected || 0);
            weekMap[key].diff += (e.diff || 0);
        });
        const weekKeys = Object.keys(weekMap).sort();

        // Build project breakdown
        const projectMap = {};
        workEntries.forEach(e => {
            const p = e.project || 'Ohne Projekt';
            projectMap[p] = (projectMap[p] || 0) + (e.worked || 0);
        });

        // Build day distribution (Mo-Fr)
        const dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
        const dayHours = [0,0,0,0,0,0,0];
        const dayCounts = [0,0,0,0,0,0,0];
        workEntries.forEach(e => { const di = new Date(e.date).getDay(); dayHours[di] += e.worked||0; dayCounts[di]++; });
        const dayAvg = dayHours.map((h,i) => dayCounts[i] ? (h/dayCounts[i]) : 0);

        // Month breakdown
        const monthMap = {};
        entries.forEach(e => {
            const key = e.date.substring(0,7);
            if (!monthMap[key]) monthMap[key] = { worked:0, expected:0, diff:0, count:0 };
            monthMap[key].worked += (e.worked||0);
            monthMap[key].expected += (e.expected||0);
            monthMap[key].diff += (e.diff||0);
            monthMap[key].count++;
        });

        // Type distribution for pie
        const typeCounts = {};
        entries.forEach(e => { typeCounts[e.type] = (typeCounts[e.type]||0) + 1; });
        const typeLabels = { work:'Arbeit', vacation:'Urlaub', sick:'Krank', school:'Berufsschule', holiday:'Feiertag', gleittag:'Gleittag' };
        const typeColors = { work:'var(--primary)', vacation:'#f59e0b', sick:'#ef4444', school:'#3b82f6', holiday:'#10b981', gleittag:'#06b6d4' };

        // SVG bar chart for weekly hours
        const maxWeekHours = Math.max(...weekKeys.map(k => weekMap[k].worked), 1);
        const barW = Math.max(12, Math.min(40, 500 / weekKeys.length));
        const chartW = weekKeys.length * (barW + 4) + 60;
        const chartH = 180;
        let weekBars = '';
        weekKeys.forEach((k, i) => {
            const h = (weekMap[k].worked / maxWeekHours) * (chartH - 30);
            const x = 50 + i * (barW + 4);
            const color = weekMap[k].diff >= 0 ? 'var(--primary)' : '#ef4444';
            weekBars += `<rect x="${x}" y="${chartH - h - 20}" width="${barW}" height="${h}" rx="3" fill="${color}" opacity="0.8"/>`;
            if (i % Math.max(1, Math.floor(weekKeys.length/8)) === 0) {
                weekBars += `<text x="${x + barW/2}" y="${chartH - 4}" text-anchor="middle" fill="#888" font-size="9">${k.split('-')[1]}</text>`;
            }
        });
        // Y axis labels
        for (let y = 0; y <= 4; y++) {
            const val = (maxWeekHours / 4 * y).toFixed(0);
            const yPos = chartH - 20 - ((chartH - 30) / 4) * y;
            weekBars += `<text x="45" y="${yPos + 4}" text-anchor="end" fill="#666" font-size="9">${val}h</text>`;
            weekBars += `<line x1="50" y1="${yPos}" x2="${chartW}" y2="${yPos}" stroke="#333" stroke-dasharray="3"/>`;
        }
        const weekChartSVG = `<svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:auto;">${weekBars}</svg>`;

        // SVG for day distribution
        const maxDayAvg = Math.max(...dayAvg, 1);
        let dayBars = '';
        [1,2,3,4,5].forEach((di, idx) => {
            const h = (dayAvg[di] / maxDayAvg) * 100;
            const x = 50 + idx * 70;
            dayBars += `<rect x="${x}" y="${130-h}" width="50" height="${h}" rx="4" fill="var(--primary)" opacity="0.75"/>`;
            dayBars += `<text x="${x+25}" y="148" text-anchor="middle" fill="#999" font-size="11">${dayNames[di]}</text>`;
            dayBars += `<text x="${x+25}" y="${125-h}" text-anchor="middle" fill="#ccc" font-size="10">${dayAvg[di].toFixed(1)}h</text>`;
        });
        const dayChartSVG = `<svg viewBox="0 0 420 155" style="width:100%;max-width:420px;height:auto;">${dayBars}</svg>`;

        // SVG donut for type distribution
        const total = Object.values(typeCounts).reduce((s,v)=>s+v,0);
        let angle = 0;
        let donutPaths = '';
        let donutLegend = '';
        Object.entries(typeCounts).forEach(([type, count]) => {
            const pct = count / total;
            const a1 = angle * Math.PI / 180;
            angle += pct * 360;
            const a2 = angle * Math.PI / 180;
            const large = pct > 0.5 ? 1 : 0;
            const r = 60; const cx = 80; const cy = 80;
            const x1 = cx + r * Math.cos(a1); const y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2); const y2 = cy + r * Math.sin(a2);
            const ri = 35;
            const x3 = cx + ri * Math.cos(a2); const y3 = cy + ri * Math.sin(a2);
            const x4 = cx + ri * Math.cos(a1); const y4 = cy + ri * Math.sin(a1);
            const color = typeColors[type] || '#888';
            donutPaths += `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${ri},${ri} 0 ${large},0 ${x4},${y4} Z" fill="${color}" opacity="0.85"/>`;
            donutLegend += `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#ccc;"><span style="width:12px;height:12px;border-radius:3px;background:${color};display:inline-block;"></span>${typeLabels[type]||type}: ${count} (${(pct*100).toFixed(0)}%)</div>`;
        });
        const donutSVG = `<div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;"><svg viewBox="0 0 160 160" style="width:160px;height:160px;">${donutPaths}</svg><div style="display:flex;flex-direction:column;gap:6px;">${donutLegend}</div></div>`;

        // Month table
        const monthKeys = Object.keys(monthMap).sort();
        let monthRows = monthKeys.map(k => {
            const m = monthMap[k];
            const diffColor = m.diff >= 0 ? '#10b981' : '#ef4444';
            return `<tr><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${m.worked.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${m.expected.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;color:${diffColor};font-weight:700;">${m.diff >= 0 ? '+' : ''}${m.diff.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;">${m.count}</td></tr>`;
        }).join('');

        // Project table
        let projRows = Object.entries(projectMap).sort((a,b) => b[1]-a[1]).map(([p, h]) => {
            const pct = totalHours > 0 ? (h/totalHours*100).toFixed(1) : 0;
            return `<tr><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;">${p}</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;font-weight:700;">${h.toFixed(1)}h</td><td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;text-align:right;color:var(--text-muted);">${pct}%</td></tr>`;
        }).join('');

        // Entry table (last 50)
        const recent = entries.slice(-50).reverse();
        let entryRows = recent.map(e => {
            const tColor = typeColors[e.type] || '#888';
            return `<tr><td style="padding:6px 10px;border-bottom:1px solid #222;font-size:13px;">${e.date}</td><td style="padding:6px 10px;border-bottom:1px solid #222;"><span style="color:${tColor};font-weight:600;font-size:12px;">${typeLabels[e.type]||e.type}</span></td><td style="padding:6px 10px;border-bottom:1px solid #222;text-align:right;font-family:monospace;">${(e.worked||0).toFixed(2)}h</td><td style="padding:6px 10px;border-bottom:1px solid #222;text-align:right;color:${(e.diff||0)>=0?'#10b981':'#ef4444'};font-family:monospace;">${(e.diff||0)>=0?'+':''}${(e.diff||0).toFixed(2)}h</td><td style="padding:6px 10px;border-bottom:1px solid #222;font-size:12px;color:#888;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.project||'—'}</td></tr>`;
        }).join('');

        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE', { day:'2-digit', month:'long', year:'numeric' });

        const html = '<!DOCTYPE html>\n'
        + '<html lang="de">\n<head>\n<meta charset="UTF-8">\n'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        + '<title>MyWorkLog Report \u2014 ' + dateStr + '<\/title>\n'
        + '<style>\n'
        + '  *{margin:0;padding:0;box-sizing:border-box;}\n'
        + '  body{background:#0f0f0f;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;padding:24px;max-width:900px;margin:0 auto;}\n'
        + '  h1{font-size:1.8rem;font-weight:800;margin-bottom:4px;}\n'
        + '  h2{font-size:1.1rem;font-weight:700;margin:32px 0 16px;color:var(--primary);display:flex;align-items:center;gap:8px;}\n'
        + '  .subtitle{color:#888;font-size:0.85rem;margin-bottom:32px;}\n'
        + '  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:32px;}\n'
        + '  .kpi{padding:18px;border-radius:14px;background:#1a1a1a;border:1px solid #2a2a2a;text-align:center;}\n'
        + '  .kpi-val{font-size:1.6rem;font-weight:800;font-family:\'JetBrains Mono\',monospace;}\n'
        + '  .kpi-label{font-size:0.65rem;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-weight:600;}\n'
        + '  .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:20px;margin-bottom:20px;overflow-x:auto;}\n'
        + '  table{width:100%;border-collapse:collapse;font-size:14px;}\n'
        + '  th{text-align:left;padding:10px 12px;border-bottom:2px solid #333;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.8px;color:#888;font-weight:700;}\n'
        + '  .footer{margin-top:48px;padding-top:24px;border-top:1px solid #2a2a2a;text-align:center;color:#555;font-size:0.8rem;}\n'
        + '  @media print{body{background:#fff;color:#111;} .kpi{border-color:#ddd;background:#f9f9f9;} .card{border-color:#ddd;background:#fff;} th{border-color:#ccc;color:#555;} td{border-color:#eee !important;}}\n'
        + '  @media (max-width:500px){.kpi-grid{grid-template-columns:repeat(2,1fr);} body{padding:12px;}}\n'
        + '<\/style>\n<\/head>\n<body>\n'
        + '<h1>\ud83d\udcca MyWorkLog Report<\/h1>\n'
        + '<div class="subtitle">Erstellt am ' + dateStr + ' \u00b7 ' + entries.length + ' Eintr\u00e4ge \u00b7 ' + (entries.length ? entries[entries.length-1].date + ' bis ' + entries[0].date : '\u2014') + '<\/div>\n'
        + '\n<div class="kpi-grid">\n'
        + '  <div class="kpi"><div class="kpi-val">' + totalHours.toFixed(0) + 'h<\/div><div class="kpi-label">Arbeitsstunden<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val" style="color:' + (totalDiff>=0?'#10b981':'#ef4444') + '">' + (totalDiff>=0?'+':'') + totalDiff.toFixed(1) + 'h<\/div><div class="kpi-label">Gesamt-Saldo<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + avgPerDay.toFixed(1) + 'h<\/div><div class="kpi-label">\u00d8 pro Tag<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + workEntries.length + '<\/div><div class="kpi-label">Arbeitstage<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + vacDays + '<\/div><div class="kpi-label">Urlaubstage<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + sickDays + '<\/div><div class="kpi-label">Krankheitstage<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + schoolDays + '<\/div><div class="kpi-label">Berufsschule<\/div><\/div>\n'
        + '  <div class="kpi"><div class="kpi-val">' + projects.length + '<\/div><div class="kpi-label">Projekte<\/div><\/div>\n'
        + '<\/div>\n\n'
        + '<h2>\ud83d\udcc8 W\u00f6chentlicher Verlauf<\/h2>\n<div class="card">' + weekChartSVG + '<\/div>\n\n'
        + '<h2>\ud83d\udcca Verteilung nach Typ<\/h2>\n<div class="card">' + donutSVG + '<\/div>\n\n'
        + '<h2>\ud83d\udcc5 Wochentag-Verteilung (\u00d8 Stunden Mo\u2013Fr)<\/h2>\n<div class="card">' + dayChartSVG + '<\/div>\n\n'
        + '<h2>\ud83d\udccb Monats\u00fcbersicht<\/h2>\n<div class="card">\n'
        + '<table><thead><tr><th>Monat<\/th><th style="text-align:right;">Ist<\/th><th style="text-align:right;">Soll<\/th><th style="text-align:right;">Saldo<\/th><th style="text-align:right;">Eintr\u00e4ge<\/th><\/tr><\/thead>\n'
        + '<tbody>' + monthRows + '<\/tbody><\/table><\/div>\n\n'
        + (projRows ? '<h2>\ud83c\udfe2 Projekt-Verteilung<\/h2>\n<div class="card"><table><thead><tr><th>Projekt<\/th><th style="text-align:right;">Stunden<\/th><th style="text-align:right;">Anteil<\/th><\/tr><\/thead><tbody>' + projRows + '<\/tbody><\/table><\/div>\n' : '')
        + '\n<h2>\ud83d\udcdd Letzte 50 Eintr\u00e4ge<\/h2>\n<div class="card"><table><thead><tr><th>Datum<\/th><th>Typ<\/th><th style="text-align:right;">Stunden<\/th><th style="text-align:right;">Saldo<\/th><th>Projekt<\/th><\/tr><\/thead>'
        + '<tbody>' + entryRows + '<\/tbody><\/table><\/div>\n\n'
        + '<div class="footer">MyWorkLog MAX Report \u00b7 Generiert am ' + now.toLocaleString('de-DE') + ' \u00b7 myworklog.de<\/div>\n'
        + '<\/body>\n<\/html>';

        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'MyWorkLog_MAX_Report_' + new Date().toISOString().split('T')[0] + '.html';
        a.click();
        URL.revokeObjectURL(a.href);
        try { localStorage.setItem('mwl_last_export', new Date().toISOString()); } catch(e) {}
        document.getElementById('exportStatsModal').style.display = 'none';
        showSmartNotification('🚀 MAX Report', `HTML-Report mit Diagrammen exportiert (${(blob.size/1024).toFixed(0)} KB)`, 'success');
    }

    // ===== ICAL/ICS EXPORT SYSTEM (RFC 5545 COMPLIANT) =====
    // Export für Google Calendar, Outlook, Apple Calendar, etc.

    function showICalExportModal() {
        const modal = document.getElementById('iCalExportModal');
        if (!modal) {
            console.error('[iCal] Modal not found');
            return;
        }
        modal.classList.add('active');
    }

    async function generateAndDownloadICalFile() {
        uEvent('ical-export');
        const dateRangeSelect = document.getElementById('iCalDateRange');
        const typeFilterSelect = document.getElementById('iCalTypeFilter');
        const includeAlarms = document.getElementById('iCalIncludeAlarms')?.checked ?? true;

        if (!dateRangeSelect || !typeFilterSelect) {
            showCustomMessage('❌ Fehler', 'Formular-Elemente nicht gefunden', 'error');
            return;
        }

        const dateRange = dateRangeSelect.value;
        const typeFilter = typeFilterSelect.value;

        // Bestimme Datums-Range
        const today = new Date();
        let startDate, endDate;

        switch (dateRange) {
            case 'today':
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - today.getDay());
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'all':
            default:
                startDate = new Date('2000-01-01');
                endDate = new Date('2099-12-31');
        }

        // Filtere Einträge
        let entries = data.entries || [];
        
        if (typeFilter !== 'all') {
            entries = entries.filter(e => e.type === typeFilter);
        }

        entries = entries.filter(e => {
            const entryDate = new Date(e.date);
            return entryDate >= startDate && entryDate <= endDate;
        });

        // Generiere iCal-Datei
        const iCalContent = generateICalContent(entries, includeAlarms);

        // Download
        const blob = new Blob([iCalContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `TimeTracker_${dateRange}_${new Date().toISOString().split('T')[0]}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Modal schließen
        document.getElementById('iCalExportModal').classList.remove('active');

        showCustomMessage('✅ iCal exportiert', `${entries.length} Einträge in ${link.download}`, 'success');
    }

    function generateICalContent(entries, includeAlarms = true) {
        // RFC 5545 compliant iCalendar
        const lines = [];

        // Header
        lines.push('BEGIN:VCALENDAR');
        lines.push('VERSION:2.0');
        lines.push('PRODID:-//TimeTracker//NONSGML v2.0//EN');
        lines.push('CALSCALE:GREGORIAN');
        lines.push('METHOD:PUBLISH');
        lines.push('X-WR-CALNAME:TimeTracker');
        lines.push('X-WR-TIMEZONE:Europe/Berlin');
        lines.push('X-WR-CALDESC:Zeiterfassungs-Einträge aus TimeTracker');

        // Timezone (UTC für einfaches Handling)
        lines.push('BEGIN:VTIMEZONE');
        lines.push('TZID:UTC');
        lines.push('BEGIN:STANDARD');
        lines.push('DTSTART:19700101T000000Z');
        lines.push('TZOFFSETFROM:+0000');
        lines.push('TZOFFSETTO:+0000');
        lines.push('END:STANDARD');
        lines.push('END:VTIMEZONE');

        // Events
        entries.forEach(entry => {
            const event = generateICalEvent(entry, includeAlarms);
            lines.push(event);
        });

        // Footer
        lines.push('END:VCALENDAR');

        return lines.join('\r\n');
    }

    function generateICalEvent(entry, includeAlarms = true) {
        const lines = [];
        const uid = `timetracker-${entry.id}@timetracker.local`;
        const now = new Date();
        const timestamp = formatICalDateTime(now);

        // Bestimme Start und End Zeit
        let startTime, endTime;
        
        if (entry.start && entry.end) {
            // Parse time strings (HH:MM format)
            const startDate = new Date(entry.date);
            const endDate = new Date(entry.date);
            
            const [startHour, startMin] = entry.start.split(':').map(Number);
            const [endHour, endMin] = entry.end.split(':').map(Number);
            
            startDate.setHours(startHour, startMin, 0, 0);
            endDate.setHours(endHour, endMin, 0, 0);
            
            startTime = formatICalDateTime(startDate);
            endTime = formatICalDateTime(endDate);
        } else {
            // Ganztägiges Event
            startTime = formatICalDate(new Date(entry.date));
            endTime = formatICalDate(new Date(entry.date));
        }

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTAMP:${timestamp}`);
        lines.push(`DTSTART${entry.start ? '' : ';VALUE=DATE'}:${startTime}`);
        lines.push(`DTEND${entry.start ? '' : ';VALUE=DATE'}:${endTime}`);
        
        // Summary (Titel)
        const typeLabel = {
            'work': '⏱️ Arbeit',
            'school': '🎓 Schule',
            'vacation': '🏖️ Urlaub',
            'gleittag': '⚡ Gleittag',
            'sick': '🤒 Krankheit',
            'holiday': '🎉 Feiertag'
        }[entry.type] || entry.type;

        lines.push(`SUMMARY:${escapeICalText(typeLabel)} - ${entry.info ? escapeICalText(entry.info) : 'Zeiteintrag'}`);

        // Description mit Details
        let description = '';
        if (entry.worked !== undefined) {
            description += `Gearbeitet: ${(entry.worked / 60).toFixed(1)}h\n`;
        }
        if (entry.expected !== undefined) {
            description += `Erwartet: ${(entry.expected / 60).toFixed(1)}h\n`;
        }
        if (entry.diff !== undefined) {
            description += `Saldo: ${(entry.diff / 60).toFixed(1)}h\n`;
        }
        if (entry.info) {
            description += `Notiz: ${entry.info}\n`;
        }

        if (description) {
            lines.push(`DESCRIPTION:${escapeICalText(description.trim())}`);
        }

        // Location (falls vorhanden)
        if (entry.location) {
            lines.push(`LOCATION:${escapeICalText(entry.location)}`);
        }

        // Color (für Kalender-Apps die Farben unterstützen)
        const _icalPrimary = data.settings.theme || '#a855f7';
        const colorMap = {
            'work': _icalPrimary,
            'school': '#3b82f6',
            'vacation': '#10b981',
            'gleittag': '#f59e0b',
            'sick': '#ef4444',
            'holiday': '#f59e0b'
        };
        lines.push(`COLOR:${colorMap[entry.type] || _icalPrimary}`);

        // Status
        lines.push('STATUS:CONFIRMED');

        // Alarm/Reminder (15 Minuten vorher)
        if (includeAlarms && entry.start) {
            lines.push('BEGIN:VALARM');
            lines.push('TRIGGER:-PT15M');
            lines.push('ACTION:DISPLAY');
            lines.push('DESCRIPTION:Zeiteintrag in 15 Minuten');
            lines.push('END:VALARM');
        }

        // Categories
        lines.push(`CATEGORIES:${entry.type}`);

        // Sequence & LastModified
        lines.push('SEQUENCE:0');
        lines.push(`LAST-MODIFIED:${timestamp}`);

        lines.push('END:VEVENT');

        return lines.join('\r\n');
    }

    function formatICalDateTime(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    function formatICalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}${month}${day}`;
    }

    function escapeICalText(text) {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;')
            .replace(/\n/g, '\\n');
    }
