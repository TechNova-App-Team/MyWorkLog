// ═══ CORE: CHARTS ═══
    // --- CHARTS & PERFORMANCE ---

    function setRadial(ringId, txtId, val) {
        const el = document.getElementById(ringId);
        const txt = document.getElementById(txtId);

        if (!el) {
            console.warn('setRadial: element not found for', ringId);
            return;
        }

        if (!txt) {
            console.warn('setRadial: text element not found for', txtId);
        }

        let pct = 0.5 + (val / 40);
        if (pct > 1) pct = 1; if (pct < 0) pct = 0;
        const offset = 276 - (pct * 276);

        try {
            el.style.strokeDashoffset = offset;
            el.style.stroke = (val < 0) ? 'var(--danger)' : 'var(--primary)';
        } catch (e) {
            console.warn('setRadial: failed to set style for', ringId, e);
        }

        if (txt) txt.innerText = (val >= 0 ? '+' : '') + val.toFixed(1) + 'h';
    }

    function getRelativeTime(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const todayStr = toLocalISODate(now);
        const yesterdayDate = new Date(now); yesterdayDate.setDate(now.getDate() - 1);
        const yesterdayStr = toLocalISODate(yesterdayDate);
        if (dateStr === todayStr) return 'heute';
        if (dateStr === yesterdayStr) return 'gestern';
        const diffDays = Math.round((now - d) / (1000*60*60*24));
        if (diffDays > 0 && diffDays <= 7) return `vor ${diffDays}d`;
        if (diffDays > 7 && diffDays <= 14) return 'letzte Woche';
        return d.toLocaleDateString('de-DE');
    }

    // ═══ ACTIVITY DAY TABS STATE ═══
    window.activityDayTabs = {
        selectedDate: null,
        allDates: [],
        entriesByDate: {}
    };

    function renderLists() {
        const typeIcons = {work:'💼', school:'📚', vacation:'🌴', gleittag:'⚡', sick:'🤒', holiday:'🎉'};
        const typeLabels = {work:'Arbeit', school:'Schule', vacation:'Urlaub', gleittag:'Gleittag', sick:'Krank', holiday:'Feiertag'};

        function formatRelativeTime(dateStr) {
            const d = new Date(dateStr + 'T00:00:00');
            const now = new Date();
            const diffMs = now - d;
            const diffHours = Math.floor(diffMs / (1000*60*60));
            const diffDays = Math.floor(diffMs / (1000*60*60*24));
            if (diffHours < 1) return 'gerade eben';
            if (diffHours < 24) return `vor ${diffHours}h`;
            if (diffDays === 0) return 'heute';
            if (diffDays === 1) return 'gestern';
            if (diffDays < 7) return `vor ${diffDays}d`;
            return d.toLocaleDateString('de-DE', {month:'short', day:'numeric'});
        }

        const createActivityCard = (e) => {
            const icon = typeIcons[e.type] || '📋';
            const label = typeLabels[e.type] || e.type;
            const relTime = formatRelativeTime(e.date);
            const notes = e.isPeriod ? (e.label || '') : (e.info || '');

            return `
                <div class="activity-item type-${e.type}" data-entry-id="${e.id}">
                    <div class="activity-card-header">
                        <span class="activity-icon">${icon}</span>
                        <div class="activity-header-info">
                            <span class="activity-type-label">${label}</span>
                            <span class="activity-time">${relTime}</span>
                        </div>
                    </div>
                    <div class="activity-content">
                        <div class="activity-main">${e.isPeriod ? esc(e.label || 'Periode') : esc(e.info || 'Arbeitszeit')}</div>
                        <div class="activity-details">
                            <span class="activity-hours">⏱️ ${e.worked.toFixed(2)}h</span>
                            ${e.project ? `<span class="activity-project">📌 ${esc(e.project)}</span>` : ''}
                            ${notes && !e.isPeriod ? `<div class="activity-note">"${esc(notes)}"</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        };

        const trackEl = document.getElementById('entryListShort');
        const emptyEl = document.getElementById('activitiesEmpty');
        const dayTabsEl = document.getElementById('dayTabsList');

        if (!trackEl || !dayTabsEl) return console.warn('renderLists: required elements not found');

        const entries = Array.isArray(data.entries) ? data.entries.slice(0, 30) : [];

        if (!entries.length) {
            trackEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'flex';
            dayTabsEl.innerHTML = '';
            return;
        }

        // Group entries by date
        const entriesByDate = {};
        const uniqueDates = [];
        entries.forEach(e => {
            if (!entriesByDate[e.date]) {
                entriesByDate[e.date] = [];
                uniqueDates.push(e.date);
            }
            entriesByDate[e.date].push(e);
        });

        window.activityDayTabs.allDates = uniqueDates;
        window.activityDayTabs.entriesByDate = entriesByDate;
        window.activityDayTabs.selectedDate = uniqueDates[0] || null;

        if (emptyEl) emptyEl.style.display = 'none';
        trackEl.style.display = 'flex';

        // Render day tabs
        const dayTabsHtml = uniqueDates.map((date, idx) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('de-DE', {weekday:'short'}).toUpperCase();
            const dayNum = dateObj.getDate();
            const isActive = idx === 0 ? 'active' : '';
            return `
                <div class="day-tab ${isActive}" onclick="switchActivityDay('${date}')">
                    <div class="day-tab-label">${dayName}</div>
                    <div class="day-tab-date">${dayNum}</div>
                </div>
            `;
        }).join('');
        dayTabsEl.innerHTML = dayTabsHtml;

        // Render activities for first date
        const firstDateActivities = entriesByDate[uniqueDates[0]] || [];
        trackEl.innerHTML = safeHTML(firstDateActivities.map(createActivityCard).join(''));
    }

    function switchActivityDay(date) {
        window.activityDayTabs.selectedDate = date;
        const trackEl = document.getElementById('entryListShort');
        const dayTabsEl = document.getElementById('dayTabsList');

        if (!trackEl || !dayTabsEl) return;

        // Update active tab
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.innerText.toLowerCase().includes(new Date(date + 'T00:00:00').getDate())) {
                // Find the correct tab
                const dateObj = new Date(date + 'T00:00:00');
                const dayNum = dateObj.getDate();
                if (tab.querySelector('.day-tab-date').innerText == dayNum) {
                    tab.classList.add('active');
                }
            }
        });

        // Update activities
        const typeIcons = {work:'💼', school:'📚', vacation:'🌴', gleittag:'⚡', sick:'🤒', holiday:'🎉'};
        const typeLabels = {work:'Arbeit', school:'Schule', vacation:'Urlaub', gleittag:'Gleittag', sick:'Krank', holiday:'Feiertag'};

        const createActivityCard = (e) => {
            const icon = typeIcons[e.type] || '📋';
            const label = typeLabels[e.type] || e.type;
            const formatRelativeTime = (dateStr) => {
                const d = new Date(dateStr + 'T00:00:00');
                const now = new Date();
                const diffDays = Math.floor((now - d) / (1000*60*60*24));
                if (diffDays === 0) return 'heute';
                if (diffDays === 1) return 'gestern';
                return d.toLocaleDateString('de-DE', {month:'short', day:'numeric'});
            };
            const relTime = formatRelativeTime(e.date);
            const notes = e.isPeriod ? (e.label || '') : (e.info || '');

            return `
                <div class="activity-item type-${e.type}" data-entry-id="${e.id}">
                    <div class="activity-card-header">
                        <span class="activity-icon">${icon}</span>
                        <div class="activity-header-info">
                            <span class="activity-type-label">${label}</span>
                            <span class="activity-time">${relTime}</span>
                        </div>
                    </div>
                    <div class="activity-content">
                        <div class="activity-main">${e.isPeriod ? esc(e.label || 'Periode') : esc(e.info || 'Arbeitszeit')}</div>
                        <div class="activity-details">
                            <span class="activity-hours">⏱️ ${e.worked.toFixed(2)}h</span>
                            ${e.project ? `<span class="activity-project">📌 ${esc(e.project)}</span>` : ''}
                            ${notes && !e.isPeriod ? `<div class="activity-note">"${esc(notes)}"</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        };

        const activities = window.activityDayTabs.entriesByDate[date] || [];
        trackEl.innerHTML = safeHTML(activities.map(createActivityCard).join(''));

        // Initialize swipe & wheel listeners
        setTimeout(() => {
            initActivityScrollListeners();
        }, 50);
    }

    // ═══ SWIPE & WHEEL SUPPORT ═══
    window.activitySwipeState = {
        touchStartY: 0,
        touchStartX: 0,
        isSwiping: false
    };

    function initActivityScrollListeners() {
        const trackEl = document.getElementById('entryListShort');
        const dayTabsEl = document.getElementById('dayTabsList');
        if (!trackEl || !dayTabsEl) return;

        // Wheel scroll support - smooth mouse wheel scrolling
        trackEl.addEventListener('wheel', (e) => {
            if (trackEl.scrollHeight > trackEl.clientHeight) {
                e.preventDefault();
                trackEl.scrollBy({
                    top: e.deltaY * 0.8,
                    behavior: 'smooth'
                });
            }
        }, { passive: false });

        // Day tabs wheel scroll
        dayTabsEl.addEventListener('wheel', (e) => {
            if (dayTabsEl.scrollWidth > dayTabsEl.clientWidth) {
                e.preventDefault();
                dayTabsEl.scrollBy({
                    left: e.deltaY * 0.6,
                    behavior: 'smooth'
                });
            }
        }, { passive: false });

        // Touch swipe support for day tabs (horizontal)
        dayTabsEl.addEventListener('touchstart', (e) => {
            window.activitySwipeState.touchStartX = e.touches[0].clientX;
            window.activitySwipeState.touchStartY = e.touches[0].clientY;
            window.activitySwipeState.isSwiping = true;
            dayTabsEl.classList.add('grabbing');
        }, { passive: true });

        dayTabsEl.addEventListener('touchmove', (e) => {
            if (!window.activitySwipeState.isSwiping) return;
            const diffX = window.activitySwipeState.touchStartX - e.touches[0].clientX;
            if (Math.abs(diffX) > 5) {
                dayTabsEl.scrollBy({
                    left: diffX * 0.3,
                    behavior: 'auto'
                });
            }
        }, { passive: true });

        dayTabsEl.addEventListener('touchend', () => {
            window.activitySwipeState.isSwiping = false;
            dayTabsEl.classList.remove('grabbing');
        }, { passive: true });

        // Touch swipe support for activities (vertical scroll)
        trackEl.addEventListener('touchstart', (e) => {
            window.activitySwipeState.touchStartY = e.touches[0].clientY;
            window.activitySwipeState.touchStartX = e.touches[0].clientX;
            trackEl.classList.add('grabbing');
        }, { passive: true });

        trackEl.addEventListener('touchmove', (e) => {
            const diffY = window.activitySwipeState.touchStartY - e.touches[0].clientY;
            const diffX = window.activitySwipeState.touchStartX - e.touches[0].clientX;
            if (Math.abs(diffY) > Math.abs(diffX)) {
                trackEl.scrollBy({
                    top: diffY * 0.5,
                    behavior: 'auto'
                });
            }
        }, { passive: true });

        trackEl.addEventListener('touchend', () => {
            trackEl.classList.remove('grabbing');
        }, { passive: true });
    }

    // --- GLOBAL TREND STATE ---
    window._trendPeriod = 30;
    window._trendDataFull = [];
    function renderTrend(dataPoints, elementId, areaFill = true, chartStyle = null, allEntries = null) {
        const c = document.getElementById(elementId);
        if(!c) return;
        
        // Support legacy numeric arrays (from chart preview etc.)
        const isRichData = dataPoints.length > 0 && typeof dataPoints[0] === 'object';
        
        if (isRichData) {
            window._trendDataFull = dataPoints;
        }
        
        if(dataPoints.length < 2) { 
            c.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#555;">Noch keine Daten</div>'; 
            return; 
        }
        
        // Lade oder nutze Default-Style
        if (!chartStyle) {
            const saved = localStorage.getItem('tt_chart_style');
            chartStyle = saved ? JSON.parse(saved) : {
                type: 'area-smooth',
                color: 'var(--primary)',
                animation: true,
                gradient: true,
                glow: true,
                blur: false,
                dots: false,
                rainbow: false
            };
        }
        
        // Slice by period for rich data, else last 30
        let subset;
        if (isRichData) {
            const period = (window._trendPeriod !== undefined && window._trendPeriod !== null) ? window._trendPeriod : 30;
            if (period === 0) {
                // "Alle" — use all data points, but thin out if too many for readability
                if (dataPoints.length > 120) {
                    // Aggregate: keep every Nth point + always first & last
                    const step = Math.ceil(dataPoints.length / 120);
                    subset = dataPoints.filter((_, i) => i === 0 || i === dataPoints.length - 1 || i % step === 0);
                } else {
                    subset = dataPoints;
                }
            } else {
                subset = dataPoints.slice(-period);
            }
        } else {
            subset = dataPoints.slice(-30);
        }
        
        const vals = isRichData ? subset.map(d => d.total) : subset;
        const diffs = isRichData ? subset.map(d => d.diff) : [];
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        const range = max - min || 1;
        
        // ============ STATS BAR ============
        if (isRichData && elementId === 'trendChart') {
            const current = vals[vals.length - 1];
            const highest = max;
            const lowest = min;
            const avgDaily = diffs.length > 0 ? diffs.reduce((s,v) => s+v, 0) / diffs.length : 0;
            
            // Trend direction: compare last 7 vs previous 7
            let direction = '↔️';
            if (vals.length >= 14) {
                const recent7 = vals.slice(-7);
                const prev7 = vals.slice(-14, -7);
                const recentAvg = recent7.reduce((s,v)=>s+v,0)/7;
                const prevAvg = prev7.reduce((s,v)=>s+v,0)/7;
                const delta = recentAvg - prevAvg;
                if (delta > 1) direction = '🚀 Steigend';
                else if (delta > 0.2) direction = '📈 Leicht ↑';
                else if (delta < -1) direction = '📉 Fallend';
                else if (delta < -0.2) direction = '📉 Leicht ↓';
                else direction = '↔️ Stabil';
            } else if (vals.length >= 2) {
                direction = vals[vals.length-1] > vals[0] ? '📈 Positiv' : '📉 Negativ';
            }
            
            // Volatility (standard deviation of daily diffs)
            let volatility = '—';
            if (diffs.length > 1) {
                const mean = diffs.reduce((s,v)=>s+v,0)/diffs.length;
                const variance = diffs.reduce((s,v)=>s+(v-mean)**2,0)/diffs.length;
                const stdDev = Math.sqrt(variance);
                if (stdDev < 0.3) volatility = '🟢 Niedrig';
                else if (stdDev < 0.8) volatility = '🟡 Mittel';
                else volatility = '🔴 Hoch';
            }
            
            const statEl = (id, text, colorClass) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = text;
                    el.className = 'trend-stat-value' + (colorClass ? ' ' + colorClass : '');
                }
            };
            statEl('trendStatCurrent', (current >= 0 ? '+' : '') + current.toFixed(1) + 'h', current >= 0 ? 'trend-stat-positive' : 'trend-stat-negative');
            statEl('trendStatHigh', '+' + highest.toFixed(1) + 'h', 'trend-stat-positive');
            statEl('trendStatLow', (lowest >= 0 ? '+' : '') + lowest.toFixed(1) + 'h', lowest < 0 ? 'trend-stat-negative' : '');
            statEl('trendStatAvgDaily', (avgDaily >= 0 ? '+' : '') + avgDaily.toFixed(2) + 'h', avgDaily >= 0 ? 'trend-stat-positive' : 'trend-stat-negative');
            statEl('trendStatDirection', direction, '');
            statEl('trendStatVolatility', volatility, '');
        }
        
        const w = c.clientWidth || 400;
        const h = 220;
        const padTop = 15, padBot = 15, padLeft = 0, padRight = 0;
        const chartH = h - padTop - padBot;
        const chartW = w - padLeft - padRight;
        
        // ============ Y-AXIS LABELS ============
        if (elementId === 'trendChart') {
            const yAxis = document.getElementById('trendYAxis');
            if (yAxis) {
                const steps = 5;
                let yHtml = '';
                for (let i = 0; i <= steps; i++) {
                    const val = max - (i / steps) * range;
                    const color = val >= 0 ? 'var(--success)' : 'var(--danger)';
                    yHtml += `<span style="color:${color}; white-space:nowrap;">${val >= 0 ? '+' : ''}${val.toFixed(1)}</span>`;
                }
                yAxis.innerHTML = yHtml;
                yAxis.style.height = h + 'px';
            }
        }
        
        // ============ X-AXIS LABELS ============
        if (isRichData && elementId === 'trendChart') {
            const xAxis = document.getElementById('trendXAxis');
            if (xAxis) {
                const firstDate = new Date(subset[0].date);
                const lastDate = new Date(subset[subset.length - 1].date);
                const spanDays = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
                
                // Adaptive format based on time span
                let dateFormat;
                if (spanDays > 365) {
                    dateFormat = { month: 'short', year: '2-digit' }; // "Jan 25"
                } else if (spanDays > 90) {
                    dateFormat = { day: '2-digit', month: 'short' }; // "14. Jan"
                } else {
                    dateFormat = { day: '2-digit', month: '2-digit' }; // "14.01"
                }
                
                const maxLabels = Math.min(subset.length, spanDays > 180 ? 6 : 8);
                const step = Math.max(1, Math.floor(subset.length / maxLabels));
                let xHtml = '';
                let lastLabel = '';
                for (let i = 0; i < subset.length; i += step) {
                    const d = new Date(subset[i].date);
                    const label = d.toLocaleDateString('de-DE', dateFormat);
                    if (label !== lastLabel) {
                        xHtml += `<span>${label}</span>`;
                        lastLabel = label;
                    }
                }
                // Always show last date
                const lastLabel2 = lastDate.toLocaleDateString('de-DE', dateFormat);
                if (lastLabel !== lastLabel2) {
                    xHtml += `<span>${lastLabel2}</span>`;
                }
                xAxis.innerHTML = xHtml;
            }
        }
        
        // ============ BUILD SVG ============
        const getX = (i) => padLeft + (i / (vals.length - 1)) * chartW;
        const getY = (val) => padTop + (1 - (val - min) / range) * chartH;
        
        // Zero line
        let zeroLineY = null;
        let zeroLineHtml = '';
        if (min < 0 && max > 0) {
            zeroLineY = getY(0);
            zeroLineHtml = `<line x1="0" y1="${zeroLineY}" x2="${w}" y2="${zeroLineY}" class="trend-zero-line" />
                <text x="${w - 4}" y="${zeroLineY - 4}" fill="rgba(255,255,255,0.25)" font-size="9" text-anchor="end" font-family="var(--font-mono)">0h</text>`;
        }
        
        // Grid lines (horizontal)
        let gridHtml = '';
        const gridSteps = 5;
        for (let i = 0; i <= gridSteps; i++) {
            const gy = padTop + (i / gridSteps) * chartH;
            gridHtml += `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="1" />`;
        }
        
        // Build path
        let path = '';
        vals.forEach((val, i) => {
            const x = getX(i);
            const y = getY(val);
            path += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
        });
        
        // Smooth path (bezier curves)
        let smoothPath = '';
        const isSmooth = chartStyle.type.includes('smooth');
        if (isSmooth) {
            for (let i = 0; i < vals.length; i++) {
                const x = getX(i);
                const y = getY(vals[i]);
                if (i === 0) {
                    smoothPath += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
                } else {
                    const x0 = getX(i - 1);
                    const y0 = getY(vals[i - 1]);
                    const cp1x = (x0 + x) / 2;
                    const cp1y = y0;
                    const cp2x = (x0 + x) / 2;
                    const cp2y = y;
                    smoothPath += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)} `;
                }
            }
        }
        
        const linePath = smoothPath || path;
        // Resolve actual hex color (read computed --primary if using theme color)
        let colorHex;
        if (chartStyle.color.includes('var')) {
            const computedPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';
            const hex = computedPrimary.startsWith('#') ? computedPrimary : '#a855f7';
            const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
            colorHex = `rgb(${r}, ${g}, ${b})`;
        } else {
            colorHex = chartStyle.color;
        }
        const strokeColor = chartStyle.color.includes('var') ? 'var(--primary)' : chartStyle.color;
        
        // Positive/negative gradient area fill (only for area/area-smooth types)
        let areaHtml = '';
        let defs = '';
        const isAreaType = chartStyle.type.includes('area');
        
        if (isAreaType) {
            // Dual gradient: green above zero, red below
            if (zeroLineY !== null && isRichData) {
                defs = `<defs>
                    <linearGradient id="gradPos" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.25" />
                        <stop offset="100%" style="stop-color:#10b981;stop-opacity:0.02" />
                    </linearGradient>
                    <linearGradient id="gradNeg" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#ef4444;stop-opacity:0.02" />
                        <stop offset="100%" style="stop-color:#ef4444;stop-opacity:0.25" />
                    </linearGradient>
                    <clipPath id="clipAbove"><rect x="0" y="0" width="${w}" height="${zeroLineY}" /></clipPath>
                    <clipPath id="clipBelow"><rect x="0" y="${zeroLineY}" width="${w}" height="${h - zeroLineY}" /></clipPath>
                    ${chartStyle.glow ? `<filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
                </defs>`;
                const closedPath = linePath + `L ${getX(vals.length - 1).toFixed(1)} ${h} L ${getX(0).toFixed(1)} ${h} Z`;
                areaHtml = `<path d="${closedPath}" fill="url(#gradPos)" clip-path="url(#clipAbove)" />
                    <path d="${closedPath}" fill="url(#gradNeg)" clip-path="url(#clipBelow)" />`;
            } else {
                defs = `<defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${colorHex};stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:${colorHex};stop-opacity:0" />
                    </linearGradient>
                    ${chartStyle.glow ? `<filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : ''}
                </defs>`;
                const closedPath = linePath + `L ${getX(vals.length - 1).toFixed(1)} ${h} L ${getX(0).toFixed(1)} ${h} Z`;
                areaHtml = `<path d="${closedPath}" fill="url(#grad)" />`;
            }
        }
        
        // Glow filter defs for non-area types (line, bar)
        if (!defs && chartStyle.glow) {
            defs = `<defs>${`<filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`}</defs>`;
        }
        
        // Dots (interactive hit areas)
        let dotsHtml = '';
        const typeEmojis = { work: '💼', school: '📚', vacation: '🌴', gleittag: '⚡', sick: '💊', holiday: '🏖️' };
        vals.forEach((val, i) => {
            const x = getX(i);
            const y = getY(val);
            const dotColor = val >= 0 ? 'var(--success)' : 'var(--danger)';
            // Visible dot (small, colored by +/-)
            dotsHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${dotColor}" opacity="0.7" class="trend-dot-hover" data-idx="${i}" style="transition: all 0.15s ease;" />`;
            // Invisible larger hit area
            dotsHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="transparent" data-idx="${i}" style="cursor:pointer;" />`;
        });
        
        // Animated line drawing
        const animStyle = chartStyle.animation ? 'animation: drawLine 2s ease-in-out forwards;' : '';
        const glowFilter = chartStyle.glow ? `filter: drop-shadow(0 0 6px ${colorHex}) drop-shadow(0 0 3px ${colorHex});` : '';
        
        // Multi-colored line path (green when positive, red when negative)
        let multiColorLine = '';
        if (isRichData && vals.some(v => v < 0) && vals.some(v => v >= 0)) {
            if (isSmooth) {
                // Smooth multi-color: draw bezier curve segments per section
                for (let i = 1; i < vals.length; i++) {
                    const x0 = getX(i - 1), y0 = getY(vals[i - 1]);
                    const x1 = getX(i), y1 = getY(vals[i]);
                    const cp1x = (x0 + x1) / 2, cp1y = y0;
                    const cp2x = (x0 + x1) / 2, cp2y = y1;
                    const segColor = (vals[i] >= 0 && vals[i - 1] >= 0) ? 'var(--success)' : 
                                     (vals[i] < 0 && vals[i - 1] < 0) ? 'var(--danger)' : 'var(--primary)';
                    const segGlow = chartStyle.glow ? `filter: drop-shadow(0 0 4px ${segColor === 'var(--success)' ? '#10b981' : segColor === 'var(--danger)' ? '#ef4444' : colorHex});` : '';
                    multiColorLine += `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${segColor}" stroke-width="2.5" stroke-linecap="round" style="${segGlow}" />`;
                }
            } else {
                // Straight multi-color: line segments
                for (let i = 1; i < vals.length; i++) {
                    const x1 = getX(i - 1), y1 = getY(vals[i - 1]);
                    const x2 = getX(i), y2 = getY(vals[i]);
                    const segColor = (vals[i] >= 0 && vals[i - 1] >= 0) ? 'var(--success)' : 
                                     (vals[i] < 0 && vals[i - 1] < 0) ? 'var(--danger)' : 'var(--primary)';
                    const segGlow = chartStyle.glow ? `filter: drop-shadow(0 0 4px ${segColor === 'var(--success)' ? '#10b981' : segColor === 'var(--danger)' ? '#ef4444' : colorHex});` : '';
                    multiColorLine += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${segColor}" stroke-width="2.5" stroke-linecap="round" style="${segGlow}" />`;
                }
            }
        }
        
        // ============ BAR CHART MODE ============
        let barHtml = '';
        if (chartStyle.type === 'bar') {
            const barGap = 2;
            const barWidth = Math.max(2, (chartW / vals.length) - barGap);
            const baseY = zeroLineY !== null ? zeroLineY : (padTop + chartH);
            vals.forEach((val, i) => {
                const x = padLeft + (i / vals.length) * chartW + barGap / 2;
                const y = getY(val);
                const barColor = colorHex;
                const barTop = Math.min(y, baseY);
                const barH = Math.max(1, Math.abs(y - baseY));
                const glowStyle = chartStyle.glow ? `filter: drop-shadow(0 0 3px ${barColor});` : '';
                barHtml += `<rect x="${x.toFixed(1)}" y="${barTop.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" fill="${barColor}" opacity="0.85" rx="2" style="${glowStyle} transform-origin: ${x.toFixed(1)}px ${baseY.toFixed(1)}px; animation: barGrow 0.4s ease-out both; animation-delay: ${i * 12}ms;" data-idx="${i}" />`;
            });
        }

        // Final line or multi-color
        const lineWidth = chartStyle.type === 'line' ? '3' : '2.5';
        const mainLine = chartStyle.type === 'bar' ? '' : (multiColorLine || `<path d="${linePath}" class="trend-line" stroke="${strokeColor}" stroke-width="${lineWidth}" fill="none" stroke-linecap="round" style="${animStyle} ${glowFilter}" />`);
        
        // Crosshair elements (updated on hover via JS)
        const crosshairHtml = `<line id="trendCrossV" class="trend-crosshair" x1="0" y1="0" x2="0" y2="${h}" style="display:none;" />
            <line id="trendCrossH" class="trend-crosshair" x1="0" y1="0" x2="${w}" y2="0" style="display:none;" />`;
        
        // Current position marker (pulsing dot on last point)
        const lastX = getX(vals.length - 1);
        const lastY = getY(vals[vals.length - 1]);
        const lastColor = vals[vals.length - 1] >= 0 ? '#10b981' : '#ef4444';
        const currentMarker = chartStyle.type === 'bar' ? '' : `
            <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="5" fill="${lastColor}" opacity="0.9" style="animation: trendPulse 2s ease-in-out infinite;" />
            <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="10" fill="${lastColor}" opacity="0.15" style="animation: trendPulse 2s ease-in-out infinite;" />`;
        
        const svgOverflow = chartStyle.type === 'bar' ? 'overflow:hidden;' : '';
        c.innerHTML = `
            <svg class="trend-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:100%; ${svgOverflow}" id="trendSvgMain">
                ${defs}
                ${gridHtml}
                ${zeroLineHtml}
                ${chartStyle.type === 'bar' ? '' : areaHtml}
                ${barHtml}
                ${mainLine}
                ${chartStyle.type === 'bar' ? '' : dotsHtml}
                ${crosshairHtml}
                ${currentMarker}
            </svg>
        `;
        
        // ============ HOVER TOOLTIP INTERACTION ============
        if (isRichData && elementId === 'trendChart') {
            const svg = document.getElementById('trendSvgMain');
            const tooltip = document.getElementById('trendTooltip');
            const crossV = document.getElementById('trendCrossV');
            const crossH = document.getElementById('trendCrossH');
            
            if (svg && tooltip) {
                const showTooltip = (idx) => {
                    if (idx < 0 || idx >= subset.length) return;
                    const dp = subset[idx];
                    const val = vals[idx];
                    const x = getX(idx);
                    const y = getY(val);
                    
                    const d = new Date(dp.date);
                    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
                    const dateStr = dayNames[d.getDay()] + ', ' + d.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
                    const typeLabel = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', gleittag: 'Gleittag', sick: 'Krank', holiday: 'Feiertag' };
                    const emoji = typeEmojis[dp.type] || '📋';
                    
                    // Streak info
                    let streak = 0;
                    const isPos = dp.diff >= 0;
                    for (let j = idx; j >= 0; j--) {
                        if ((subset[j].diff >= 0) === isPos) streak++;
                        else break;
                    }
                    
                    tooltip.innerHTML = `
                        <div class="tt-date">${dateStr}</div>
                        <div class="tt-row"><span class="tt-label">Saldo</span><span class="tt-val ${val >= 0 ? 'tt-positive' : 'tt-negative'}">${val >= 0 ? '+' : ''}${val.toFixed(2)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Tages-Diff</span><span class="tt-val ${dp.diff >= 0 ? 'tt-positive' : 'tt-negative'}">${dp.diff >= 0 ? '+' : ''}${dp.diff.toFixed(2)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Gearbeitet</span><span class="tt-val">${dp.worked.toFixed(1)}h</span></div>
                        <div class="tt-row"><span class="tt-label">Streak</span><span class="tt-val">${streak}× ${isPos ? '✅' : '⚠️'}</span></div>
                        <div style="margin-top:4px;"><span class="tt-type-badge">${emoji} ${typeLabel[dp.type] || dp.type}</span></div>
                    `;
                    
                    // Position tooltip
                    const chartRect = c.getBoundingClientRect();
                    const tooltipW = 200;
                    let left = (x / w) * chartRect.width;
                    if (left + tooltipW > chartRect.width) left = left - tooltipW - 10;
                    else left += 15;
                    let top = (y / h) * chartRect.height - 80;
                    if (top < 0) top = 10;
                    
                    tooltip.style.display = 'block';
                    tooltip.style.left = left + 'px';
                    tooltip.style.top = top + 'px';
                    
                    // Crosshair
                    if (crossV) { crossV.style.display = 'block'; crossV.setAttribute('x1', x); crossV.setAttribute('x2', x); }
                    if (crossH) { crossH.style.display = 'block'; crossH.setAttribute('y1', y); crossH.setAttribute('y2', y); }
                    
                    // Highlight dot
                    svg.querySelectorAll('.trend-dot-hover').forEach(dot => {
                        if (parseInt(dot.dataset.idx) === idx) {
                            dot.setAttribute('r', '6');
                            dot.setAttribute('opacity', '1');
                        } else {
                            dot.setAttribute('r', '3');
                            dot.setAttribute('opacity', '0.7');
                        }
                    });
                };
                
                const hideTooltip = () => {
                    tooltip.style.display = 'none';
                    if (crossV) crossV.style.display = 'none';
                    if (crossH) crossH.style.display = 'none';
                    svg.querySelectorAll('.trend-dot-hover').forEach(dot => {
                        dot.setAttribute('r', '3');
                        dot.setAttribute('opacity', '0.7');
                    });
                };
                
                svg.addEventListener('mousemove', (e) => {
                    const rect = svg.getBoundingClientRect();
                    const mouseX = (e.clientX - rect.left) / rect.width * w;
                    // find nearest data point
                    let nearest = 0;
                    let nearestDist = Infinity;
                    for (let i = 0; i < vals.length; i++) {
                        const dist = Math.abs(getX(i) - mouseX);
                        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
                    }
                    showTooltip(nearest);
                });
                
                svg.addEventListener('mouseleave', hideTooltip);
                
                // Touch support
                svg.addEventListener('touchstart', (e) => {
                    const touch = e.touches[0];
                    const rect = svg.getBoundingClientRect();
                    const mouseX = (touch.clientX - rect.left) / rect.width * w;
                    let nearest = 0;
                    let nearestDist = Infinity;
                    for (let i = 0; i < vals.length; i++) {
                        const dist = Math.abs(getX(i) - mouseX);
                        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
                    }
                    showTooltip(nearest);
                }, { passive: true });
                svg.addEventListener('touchend', () => setTimeout(hideTooltip, 2000), { passive: true });
            }
        }
    }
    
    function generateSmoothPath(dataPoints, subset, min, range, w, h) {
        let path = '';
        for (let i = 0; i < subset.length; i++) {
            const x = (i / (subset.length - 1)) * w;
            const y = h - ((subset[i] - min) / range * (h - 40)) - 20;
            
            if (i === 0) {
                path += `M ${x} ${y} `;
            } else {
                const x0 = ((i - 1) / (subset.length - 1)) * w;
                const y0 = h - ((subset[i - 1] - min) / range * (h - 40)) - 20;
                const cp1x = (x0 + x) / 2;
                const cp1y = y0;
                const cp2x = (x0 + x) / 2;
                const cp2y = y;
                path += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y} `;
            }
        }
        return path;
    }
    
    function generateBarChart(subset, min, range, w, h, color) {
        const barWidth = Math.max(2, w / subset.length - 1);
        let bars = '';
        subset.forEach((val, i) => {
            const x = (i / subset.length) * w;
            const barHeight = ((val - min) / range * (h - 40));
            const y = h - barHeight - 20;
            bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" opacity="0.8" style="animation: barGrow 0.6s ease-out both; animation-delay: ${i * 20}ms;" rx="2" />`;
        });
        return bars;
    }
    function setupChartModalButtons(currentStyle) {
        const chartTypes = [
            {id: 'line', label: 'Linie', icon: '📈'},
            {id: 'area', label: 'Fläche', icon: '📊'},
            {id: 'area-smooth', label: 'Smooth', icon: '🌊'},
            {id: 'bar', label: 'Balken', icon: '📦'}
        ];
        
        // Get current website accent color hex
        const computedPrimary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';
        
        const colors = [
            {value: 'var(--primary)', hex: computedPrimary, label: 'Website-Farbe (' + computedPrimary + ')', isTheme: true},
            {value: '#a78bfa', hex: '#a78bfa', label: 'Lila-Hell'},
            {value: '#a855f7', hex: '#a855f7', label: 'Lila'},
            {value: '#8b5cf6', hex: '#8b5cf6', label: 'Indigo'},
            {value: '#7c3aed', hex: '#7c3aed', label: 'Violett'},
            {value: '#6366f1', hex: '#6366f1', label: 'Indigo-Hell'},
            {value: '#4f46e5', hex: '#4f46e5', label: 'Deep Indigo'},
            {value: '#0ea5e9', hex: '#0ea5e9', label: 'Sky Blue'},
            {value: '#00b4d8', hex: '#00b4d8', label: 'Steel Blue'},
            {value: '#60a5fa', hex: '#60a5fa', label: 'Blau-Hell'},
            {value: '#3b82f6', hex: '#3b82f6', label: 'Blau'},
            {value: '#06b6d4', hex: '#06b6d4', label: 'Cyan'},
            {value: '#22d3ee', hex: '#22d3ee', label: 'Cyan-Hell'},
            {value: '#00d9ff', hex: '#00d9ff', label: 'Aqua'},
            {value: '#10b981', hex: '#10b981', label: 'Grün'},
            {value: '#34d399', hex: '#34d399', label: 'Grün-Hell'},
            {value: '#06d6a0', hex: '#06d6a0', label: 'Mint'},
            {value: '#84cc16', hex: '#84cc16', label: 'Limette'},
            {value: '#fbbf24', hex: '#fbbf24', label: 'Gelb'},
            {value: '#eab308', hex: '#eab308', label: 'Gelb-Hell'},
            {value: '#f59e0b', hex: '#f59e0b', label: 'Gelb-Orange'},
            {value: '#fb923c', hex: '#fb923c', label: 'Orange'},
            {value: '#f97316', hex: '#f97316', label: 'Orange-Hell'},
            {value: '#ef4444', hex: '#ef4444', label: 'Rot'},
            {value: '#f43f5e', hex: '#f43f5e', label: 'Rose'},
            {value: '#ec4899', hex: '#ec4899', label: 'Pink'},
            {value: '#d946ef', hex: '#d946ef', label: 'Fuchsia'},
            {value: '#db2777', hex: '#db2777', label: 'Crimson'},
            {value: '#be185d', hex: '#be185d', label: 'Magenta-Dunkel'},
            {value: '#94a3b8', hex: '#94a3b8', label: 'Grau'},
            {value: '#cbd5e1', hex: '#cbd5e1', label: 'Grau-Hell'},
            {value: '#64748b', hex: '#64748b', label: 'Grau-Dunkel'},
            {value: '#475569', hex: '#475569', label: 'Slate'},
            {value: '#ffffff', hex: '#ffffff', label: 'Weiß'},
        ];
        
        const chartTypeContainer = document.getElementById('chartTypeButtons');
        if (!chartTypeContainer) return;
        
        chartTypeContainer.innerHTML = chartTypes.map(type => {
            const isActive = currentStyle.type === type.id;
            return `<button class="chart-type-btn" data-type="${type.id}" style="display:flex; flex-direction:column; align-items:center; gap:4px; padding:12px 8px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; background:${isActive ? 'rgba(var(--primary-rgb),0.1)' : 'rgba(255,255,255,0.03)'}; border-radius:10px; cursor:pointer; color:${isActive ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:${isActive ? '600' : '500'}; transition:all 0.2s; font-size:0.78rem;" onmouseover="if(!this.classList.contains('active-type'))this.style.background='rgba(255,255,255,0.06)'" onmouseout="if(!this.classList.contains('active-type'))this.style.background='rgba(255,255,255,0.03)'">
                <span style="font-size:1.3rem; line-height:1;">${type.icon}</span>
                <span>${type.label}</span>
            </button>`;
        }).join('');
        
        const colorContainer = document.getElementById('colorButtons');
        if (!colorContainer) return;
        
        // Render theme color button first, then grid of all colors
        const themeColor = colors[0];
        const isThemeActive = currentStyle.color === 'var(--primary)';
        const otherColors = colors.slice(1);
        
        colorContainer.innerHTML = `
            <button style="display:flex; align-items:center; gap:8px; padding:8px 14px; background:${isThemeActive ? 'rgba(var(--primary-rgb),0.12)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isThemeActive ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}; border-radius:10px; cursor:pointer; transition:all 0.2s; margin-bottom:10px; width:100%;" title="${themeColor.label}" onclick="updateChartStyleFromModal('color', 'var(--primary)'); setupChartModalButtons(window.modalChartStyle);" onmouseover="this.style.background='${isThemeActive ? 'rgba(var(--primary-rgb),0.15)' : 'rgba(255,255,255,0.06)'}'" onmouseout="this.style.background='${isThemeActive ? 'rgba(var(--primary-rgb),0.12)' : 'rgba(255,255,255,0.03)'}'">
                <span style="width:28px; height:28px; border-radius:8px; background:${themeColor.hex}; border:2px solid ${isThemeActive ? '#fff' : 'transparent'}; flex-shrink:0;"></span>
                <span style="font-size:0.8rem; font-weight:${isThemeActive ? '600' : '500'}; color:${isThemeActive ? 'var(--text-main)' : 'var(--text-muted)'};">🎨 Website-Farbe verwenden</span>
                ${isThemeActive ? '<span style="margin-left:auto; font-size:0.7rem; color:var(--primary); font-weight:600;">✓ Aktiv</span>' : ''}
            </button>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(32px, 1fr)); gap:6px;">
                ${otherColors.map(color => {
                    const isActive = currentStyle.color === color.value;
                    return `<button style="width:32px; height:32px; background:${color.hex}; border:2px solid ${isActive ? '#fff' : 'transparent'}; border-radius:8px; cursor:pointer; transition:all 0.2s; opacity:${isActive ? '1' : '0.7'}; outline:${isActive ? '2px solid ' + color.hex : 'none'}; outline-offset:2px;" title="${color.label}" onclick="updateChartStyleFromModal('color', '${color.value}'); setupChartModalButtons(window.modalChartStyle);" onmouseover="this.style.opacity='1'; this.style.transform='scale(1.15)'" onmouseout="this.style.opacity='${isActive ? '1' : '0.7'}'; this.style.transform='scale(1)'"></button>`;
                }).join('')}
            </div>
        `;
        
        // Chart type click handlers
        const modal = document.getElementById('chartStyleModal');
        if (!modal) return;
        modal.querySelectorAll('.chart-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                updateChartStyleFromModal('type', type);
                setupChartModalButtons(window.modalChartStyle);
            });
        });
    }
    
    function saveChartStyle() {
        if (window.modalChartStyle) {
            localStorage.setItem('tt_chart_style', JSON.stringify(window.modalChartStyle));
        }
    }
    
    function updateChartStyleFromModal(prop, value) {
        window.modalChartStyle[prop] = value;
        updateChartStylePreview(window.modalChartStyle);
    }
    
    function updateChartStylePreview(style) {
        const preview = document.getElementById('chartPreview');
        if (!preview) return;
        
        // Generiere Beispieldaten
        const exampleData = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0, 2.9, 2.8, 2.7, 2.6];
        
        // Store globally for saving
        window.modalChartStyle = style;
        renderTrend(exampleData, 'chartPreview', style.type.includes('area'), style);
    }
    function updateDonutStylePreview(style) {
        const preview = document.getElementById('donutPreview');
        if (!preview) return;
        
        // Render a demo donut with 40% work, 30% school, 20% vac, 10% sick
        renderDonutPreview(40, 30, 20, 10, 0, style);
    }
    
    function renderDonutPreview(work, school, vac, sick, holiday, donutStyle = null) {
        if (!donutStyle) {
            const saved = localStorage.getItem('tt_donut_style');
            donutStyle = saved ? JSON.parse(saved) : {
                strokeWidth: 12,
                glow: true,
                gradient: false,
                rainbow: false,
                animated: true
            };
        }
        
        const total = work + school + vac + sick + holiday || 1;
        const c = 251;
        
        const makeCircle = (val, color) => {
            const dash = (val / total) * c;
            return `<circle cx="50" cy="50" r="40" fill="transparent" stroke="${color}" stroke-width="${donutStyle.strokeWidth}" stroke-dasharray="${dash} ${c}" style="${donutStyle.animated ? 'animation: expandPulse 1.2s ease-out' : ''};${donutStyle.glow ? 'filter: drop-shadow(0 0 6px ' + color + ')' : ''};${donutStyle.rainbow ? 'animation: rainbowShift 3s linear infinite' : ''}"></circle>`;
        };
        
        const previewHtml = `
            <svg width="120" height="120" viewBox="0 0 100 100" style="transform: rotate(-90deg);${donutStyle.rainbow ? 'animation: rainbowShift 3s linear infinite' : ''}">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="${donutStyle.strokeWidth}"></circle>
                ${makeCircle(sick, 'var(--danger)')}
                ${makeCircle(vac, 'var(--success)')}
                ${makeCircle(school, 'var(--school)')}
                ${makeCircle(holiday, 'var(--holiday)')}
                ${makeCircle(work, 'var(--primary)')}
            </svg>
        `;
        
        const previewContainer = document.getElementById('donutPreview');
        if (previewContainer) previewContainer.innerHTML = previewHtml;
    }
    
    function saveDonutStyle() {
        if (window.modalDonutStyle) {
            localStorage.setItem('tt_donut_style', JSON.stringify(window.modalDonutStyle));
            console.log('✅ Donut style saved!', window.modalDonutStyle);
        }
    }
    
    function renderDonut(work, vac, sick, school, holiday) {
        // Load donut style from localStorage
        const saved = localStorage.getItem('tt_donut_style');
        const donutStyle = saved ? JSON.parse(saved) : {
            strokeWidth: 12,
            glow: true,
            gradient: false,
            rainbow: false,
            animated: true
        };
        
        const total = work + vac + sick + school + holiday || 1;
        const c = 251;
        
        // Order for clockwise fill: Work -> School -> Vac -> Sick -> Holiday
        const circles = [
            { id: 'donutWork', val: work, color: 'var(--primary)' },
            { id: 'donutSchool', val: school, color: 'var(--school)' },
            { id: 'donutVac', val: vac, color: 'var(--success)' },
            { id: 'donutSick', val: sick, color: 'var(--danger)' },
            { id: 'donutHoliday', val: holiday, color: 'var(--holiday)' }
        ];
        
        let offset = 0;
        circles.forEach((circle, index) => {
            const el = document.getElementById(circle.id);
            if (!el) return;
            
            const dash = (circle.val / total) * c;
            const delay = donutStyle.animated ? (index * 150) : 0;
            
            // Set stroke width immediately
            el.setAttribute('stroke-width', donutStyle.strokeWidth);
            el.setAttribute('stroke-dashoffset', -offset);
            
            // Set glow effect
            if (donutStyle.glow) {
                const colorValue = circle.color.includes('var') ? 'rgb(var(--primary-rgb))' : circle.color;
                el.style.filter = `drop-shadow(0 0 6px ${colorValue})`;
            } else {
                el.style.filter = 'none';
            }
            
            // Set rainbow or normal animation
            if (donutStyle.rainbow) {
                el.style.animation = 'rainbowShift 3s linear infinite';
            } else {
                el.style.animation = 'none';
            }
            
            // Animation: start empty, then fill
            if (donutStyle.animated && !donutStyle.rainbow) {
                el.style.transition = 'none';
                el.setAttribute('stroke-dasharray', `0 ${c}`);
                
                // After a tiny delay, apply transition and animate to final value
                setTimeout(() => {
                    el.style.transition = `stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)`;
                    el.setAttribute('stroke-dasharray', `${dash} ${c}`);
                }, 10 + delay);
            } else {
                // No animation - just set the final value
                el.style.transition = 'none';
                el.setAttribute('stroke-dasharray', `${dash} ${c}`);
            }
            
            offset += dash;
        });
        
        // Apply rainbow to SVG container if enabled
        const svg = document.getElementById('donutSvg');
        if (svg) {
            if (donutStyle.rainbow) {
                svg.style.animation = 'rainbowShift 3s linear infinite';
            } else {
                svg.style.animation = 'none';
            }
        }
    }

    // ========== MEGA ADVANCED EFFECTS ENGINE ==========
    
    function createParticleEffect(x, y, color = 'var(--primary)', count = 8) {
        const container = document.createElement('div');
        container.className = 'particle-container';
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            const angle = (i / count) * Math.PI * 2;
            const tx = Math.cos(angle) * 50;
            const delay = i * 30;
            
            particle.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                background: ${color.includes('var') ? 'var(--primary)' : color};
                border-radius: 50%;
                left: 0;
                top: 0;
                --tx: ${tx}px;
                animation: particleFloat 0.8s ease-out ${delay}ms forwards;
                box-shadow: 0 0 8px ${color.includes('var') ? 'var(--primary)' : color};
            `;
            container.appendChild(particle);
        }
        
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 1200);
    }
    
    function createExplosion(x, y, color = 'var(--primary)') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100');
        svg.setAttribute('height', '100');
        svg.style.cssText = `
            position: fixed;
            left: ${x - 50}px;
            top: ${y - 50}px;
            pointer-events: none;
            z-index: 9999;
        `;
        
        const actualColor = color.includes('var') ? 'rgb(var(--primary-rgb))' : color;
        
        for (let i = 0; i < 12; i++) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', actualColor);
            circle.style.animation = `expandPulse 0.8s ease-out ${i * 30}ms forwards`;
            svg.appendChild(circle);
        }
        
        document.body.appendChild(svg);
        setTimeout(() => svg.remove(), 1000);
    }
    
    function createConfetti(x, y, count = 15) {
        const colors = ['var(--primary)', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const confetti = document.createElement('div');
            const rotation = Math.random() * 360;
            const delay = i * 20;
            
            confetti.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 10px;
                height: 10px;
                background: ${color.includes('var') ? 'var(--primary)' : color};
                pointer-events: none;
                z-index: 9999;
                transform: rotate(${rotation}deg);
                animation: floatUp 1s ease-out ${delay}ms forwards;
            `;
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 1500);
        }
    }
    
    function addShakeEffect(element, duration = 400) {
        element.classList.add('effect-shake');
        setTimeout(() => element.classList.remove('effect-shake'), duration);
    }
    
    function addBounceEffect(element, duration = 600) {
        element.classList.add('effect-bounce');
        setTimeout(() => element.classList.remove('effect-bounce'), duration);
    }
    
    function addGlowEffect(element, color = 'var(--primary)', duration = 800) {
        const originalStyle = element.style.filter;
        const actualColor = color.includes('var') ? 'rgb(var(--primary-rgb))' : color;
        element.style.filter = `drop-shadow(0 0 8px ${actualColor}) drop-shadow(0 0 16px rgba(var(--primary-rgb), 0.6))`;
        setTimeout(() => {
            element.style.filter = originalStyle || '';
        }, duration);
    }
    
    function addRainbowEffect(element, duration = 3000) {
        element.style.animation = `rainbowShift ${duration}ms linear`;
        setTimeout(() => {
            element.style.animation = '';
        }, duration);
    }
    
    function attachChartEffects(elementId, effectConfig = {}) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Click effects removed (no explosion animation)
        // Hover effects removed (no purple glow)
    }
    
    function enhanceChartsWithEffects(config = {}) {
        const charts = ['trendChart', 'chartMonthlyTrend', 'chartWeeklyPerformance', 'chartProductivityByDay'];
        charts.forEach(id => {
            attachChartEffects(id, config);
        });
    }
    
    // ========== END ADVANCED EFFECTS ENGINE ==========

    // NEU: Berechnung der Deep Performance Metriken
    function calculateDeepPerformanceMetrics(entries) {
        const workEntries = entries.filter(e => e.type === 'work' && e.worked > 0);
        let totalStartMinutes = 0;
        let startCount = 0;
        let totalFocusHours = 0;
        let focusCount = 0;

        workEntries.forEach(e => {
            // 1. Ø Arbeitsbeginn
            if (e.shiftStart && e.shiftStart.includes(':')) {
                const [h, m] = e.shiftStart.split(':').map(Number);
                totalStartMinutes += (h * 60 + m);
                startCount++;
            }

            // 2. Ø Längste Fokusphase
            if (e.breakLog && e.breakLog.length > 0) {
                 // Pausenlogik ist komplex, hier vereinfachte Berechnung der längsten durchgehenden Arbeitsphase
                 let lastTime = new Date(e.date).getTime();
                 let phases = [];
                 
                 // Alle Zeitpunkte (Start/Pause/Wiederaufnahme) erfassen
                 const timePoints = e.breakLog
                    .map(l => l.time)
                    .sort((a, b) => a - b);

                 let shiftTimes = [];
                 
                 // Füge den Start der Schicht hinzu, wenn bekannt (für Timer-Einträge oft nicht vorhanden)
                 if (e.shiftStart) {
                     const [h, m] = e.shiftStart.split(':').map(Number);
                     const d = new Date(e.date);
                     d.setHours(h, m, 0, 0);
                     shiftTimes.push({ time: d.getTime(), type: 'start' });
                 }
                 
                 // Finde den ersten Start im BreakLog, falls Timer verwendet wurde
                 const firstTimerStart = e.breakLog.find(l => l.action === 'start')?.time;
                 if (firstTimerStart) {
                     shiftTimes.push({ time: firstTimerStart, type: 'start' });
                 }
                 
                 // Fülle mit Pausen- und Wiederaufnahmezeiten
                 e.breakLog.forEach(log => {
                      if (log.action === 'pause') {
                         // Suche nach dem letzten Start-Punkt vor dieser Pause (Ende der Fokusphase)
                         let lastStart = [...shiftTimes].sort((a,b) => b.time - a.time).find(t => t.time < log.time);
                         if (lastStart) phases.push(log.time - lastStart.time);

                         shiftTimes.push({ time: log.time, type: 'pause' });
                      } else if (log.action === 'start') {
                         shiftTimes.push({ time: log.time, type: 'start' });
                      }
                 });
                 
                 // Füge die letzte Phase hinzu (bis zum Ende der Schicht)
                 const lastShiftTime = timePoints.at(-1);
                 
                 // Wir müssen den Netto-Arbeitszeitwert E.Worked nutzen, da die Zeitpunkte unvollständig sein können.
                 // Als Ersatz nehmen wir die Gesamt-Arbeitszeit.
                 
                 // Bessere Näherung: Wenn Timer-Daten existieren, ist die längste Phase die gesamte gearbeitete Zeit.
                 // (Ohne genaues Parsing der Pausen-Offsets)
                 if (e.worked > 0) {
                     totalFocusHours += e.worked;
                     focusCount++;
                 }

            } else {
                 // Wenn keine Pausen geloggt wurden (Manuelle Eingabe/Start-Ende), ist die längste Phase die Netto-Arbeitszeit.
                 totalFocusHours += e.worked;
                 focusCount++;
            }
        });

        const avgStartMinutes = startCount > 0 ? totalStartMinutes / startCount : 0;
        const avgStartHours = Math.floor(avgStartMinutes / 60);
        const avgStartMins = Math.round(avgStartMinutes % 60);

        return {
            avgStartTime: startCount > 0 ? `${avgStartHours < 10 ? '0' : ''}${avgStartHours}:${avgStartMins < 10 ? '0' : ''}${avgStartMins}` : '---',
            avgFocusHours: focusCount > 0 ? (totalFocusHours / focusCount).toFixed(1) : '0.0',
        };
    }
    function getTypeColor(type) {
        const colors = {
            'work': 'var(--primary)',
            'school': 'var(--school)',
            'vacation': 'var(--success)',
            'gleittag': '#f59e0b',
            'sick': 'var(--danger)',
            'holiday': 'var(--holiday)',
            'reset': '#64748b'
        };
        return colors[type] || '#666';
    }
    
    function getTypeEmoji(type) {
        const emojis = {
            'work': '💼',
            'school': '📚',
            'vacation': '🌴',
            'gleittag': '⚡',
            'sick': '💊',
            'holiday': '🏖️',
            'reset': '❌'
        };
        return emojis[type] || '?';
    }
    