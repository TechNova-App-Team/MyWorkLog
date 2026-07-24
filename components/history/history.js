// ═══ HISTORY MODULE ═══
    window.pendingHighlightId = null;

    function hlSetType(type, btn) {
        document.querySelectorAll('.hl-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const sel = document.getElementById('historyFilterType');
        if (sel) { sel.value = type; renderHistoryView(); }
    }
    window.hlSetType = hlSetType;

    function renderHistoryView() {
        const filteredData = filterHistoryData();
        const historyListEl = document.getElementById('entryListFull');

        document.getElementById('historyCount').innerText = filteredData.length;

        // Update live stats
        const totalH = filteredData.reduce((s, e) => s + (e.worked || 0), 0);
        const totalDiff = filteredData.reduce((s, e) => s + (e.diff || 0), 0);
        const avgH = filteredData.length ? totalH / filteredData.length : 0;
        const saldoEl = document.getElementById('hlStatSaldo');
        if (document.getElementById('hlStatHours')) document.getElementById('hlStatHours').innerText = totalH.toFixed(1) + 'h';
        if (saldoEl) {
            saldoEl.innerText = (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(1) + 'h';
            saldoEl.style.color = totalDiff >= 0 ? 'var(--success)' : 'var(--danger)';
        }
        if (document.getElementById('hlStatAvg')) document.getElementById('hlStatAvg').innerText = avgH.toFixed(1) + 'h';

        if (filteredData.length === 0) {
            historyListEl.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Keine Einträge gefunden, Filter anpassen.</p>';
            return;
        }

        // Dynamic lookup — Custom-Types + Overrides + Orphan-Fallback.
        const lookupIcon = (id) => (typeof getTypeIconTile === 'function') ? getTypeIconTile(id, 18, 'er-icon-wrap') : '';
        const lookupLabel = (id) => {
            if (typeof getEntryTypeInfo === 'function') {
                const i = getEntryTypeInfo(id);
                if (i) {
                    const clean = String(i.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim();
                    if (clean) return clean;
                }
            }
            if (String(id).startsWith('custom-')) return 'Eigener Typ';
            return ({work:'Arbeit', school:'Schule', vacation:'Urlaub', gleittag:'Gleittag', sick:'Krank', holiday:'Feiertag'}[id]) || id;
        };
        const countsAsWork = (id) => {
            if (typeof getEntryTypeInfo === 'function') {
                const i = getEntryTypeInfo(id);
                if (i && String(id).startsWith('custom-')) return i.countsAsWork === true;
            }
            return !String(id).startsWith('custom-');
        };
        const isEN = document.documentElement.lang === 'en';

        // Job-Badge nur zeigen, wenn mehrere Jobs existieren
        const showJobBadge = (typeof hasMultipleJobs === 'function') && hasMultipleJobs();
        const jobNameOf = (e) => (typeof getJobName === 'function') ? getJobName((typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary') : '';
        const jobColorOf = (e) => (typeof getJobColor === 'function') ? getJobColor((typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary') : '#a855f7';

        // Zusatzzeit-Erkennung: arbeits-artige Einträge mit expected 0, deren Tagessoll
        // bereits ein anderer Eintrag desselben Tages trägt (Split-Shift). Aus VOLLEN Daten
        // abgeleitet (nicht nur gefiltert), damit der Badge auch bei aktivem Filter stimmt.
        const additionalIds = new Set();
        const allByDate = {};
        (Array.isArray(data.entries) ? data.entries : []).forEach((e) => {
            if (e && e.date) { (allByDate[e.date] = allByDate[e.date] || []).push(e); }
        });
        Object.keys(allByDate).forEach((d) => {
            const list = allByDate[d];
            const hasCarrier = list.some((e) => countsAsWork(e.type) && (parseFloat(e.expected) || 0) > 0);
            if (!hasCarrier) return;
            list.forEach((e) => {
                if (countsAsWork(e.type) && (parseFloat(e.expected) || 0) === 0 && (parseFloat(e.worked) || 0) > 0) {
                    additionalIds.add(e.id);
                }
            });
        });

        // Tages-Summen (nur sichtbare/gefilterte Einträge) — für die Tages-Header-Zeile
        const dayAgg = {};
        filteredData.forEach((e) => {
            const g = dayAgg[e.date] || (dayAgg[e.date] = { count: 0, sumDiff: 0 });
            g.count++;
            if (countsAsWork(e.type)) g.sumDiff += (parseFloat(e.diff) || 0);
        });

        const dayHeaderRow = (dateISO, sumDiff) => {
            const dt = new Date(dateISO + 'T00:00:00');
            const wd = dt.toLocaleDateString(mwlLocale(), { weekday: 'long' });
            const ds = dt.toLocaleDateString(mwlLocale(), { day: '2-digit', month: '2-digit', year: '2-digit' });
            const pos = sumDiff >= 0;
            const col = pos ? 'var(--success)' : 'var(--danger)';
            const sign = pos ? '+' : '';
            const lbl = isEN ? 'Day balance' : 'Tages-Saldo';
            return `
            <div class="entry-day-header">
                <span class="edh-date">${esc(wd)}, ${ds}</span>
                <span class="edh-sum" style="color:${col}">${lbl} ${sign}${sumDiff.toFixed(2)}h</span>
            </div>`;
        };

        const createRow = (e) => {
            const isWorkRel = countsAsWork(e.type);
            const diffColor = isWorkRel ? (e.diff >= 0 ? '#10b981' : '#ef4444') : '#64748b';
            const diffBg    = isWorkRel ? (e.diff >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') : 'rgba(100,116,139,0.08)';
            const diffStr   = isWorkRel ? ((e.diff >= 0 ? '+' : '') + e.diff.toFixed(2) + 'h') : '—';
            const info      = e.isPeriod ? esc(e.label) : esc(e.info || '');
            const label     = lookupLabel(e.type);
            const icon      = lookupIcon(e.type);
            const weekday   = new Date(e.date + 'T00:00:00').toLocaleDateString(mwlLocale(), {weekday:'short'});
            const dateShort = new Date(e.date + 'T00:00:00').toLocaleDateString(mwlLocale(), {day:'2-digit', month:'2-digit', year:'2-digit'});
            return `
            <div class="entry-row type-${e.type}" data-entry-id="${e.id}" style="--type-rgb:${(typeof getTypeRgb === 'function') ? getTypeRgb(e.type) : '148,163,184'}" onclick="openEntryDetail(${e.id})">
                <div class="er-left">
                    ${icon}
                    <div class="er-date-col">
                        <span class="er-weekday">${weekday}</span>
                        <span class="er-date">${dateShort}</span>
                    </div>
                </div>
                <div class="er-mid">
                    <span class="er-info">${info || '—'}</span>
                    <div class="er-tags">
                        <span class="er-badge type-${e.type}">${label}</span>
                        ${showJobBadge ? `<span class="er-badge er-badge--job" style="background:${jobColorOf(e)}22;color:${jobColorOf(e)}">${esc(jobNameOf(e))}</span>` : ''}
                        ${additionalIds.has(e.id) ? `<span class="er-badge er-badge--additional" title="${isEN ? 'Daily target already counted on the main entry of this day' : 'Tagessoll bereits beim Haupt-Eintrag dieses Tages gezählt'}">↪ ${isEN ? 'Additional time' : 'Zusatzzeit'}</span>` : ''}
                        ${e.project ? `<span class="er-project">${esc(e.project)}</span>` : ''}
                        ${e.mood ? `<span class="er-mood">${e.mood}</span>` : ''}
                        ${e.shiftWarning ? '<span class="er-warn">⚠ MAX</span>' : ''}
                    </div>
                </div>
                <div class="er-right">
                    <div class="er-hours">${e.worked.toFixed(1)}<span class="er-h-unit">h</span></div>
                    <div class="er-diff" style="color:${diffColor};background:${diffBg}">${diffStr}</div>
                    <div class="er-actions">
                        <button class="btn-icon" onclick="event.stopPropagation();openEntryDetail(${e.id})" title="Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation();editEntry(${e.id})" title="Bearbeiten">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-icon danger" onclick="event.stopPropagation();delEntry(${e.id})" title="Löschen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                    <span class="er-chevron" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </span>
                </div>
            </div>`;
        };

        // Entrance-Animation NUR bei Erst-Befüllung, nicht bei jedem Filter-Rerender
        // (sonst faded die ganze Liste bei jeder Interaktion neu ein → wirkt wie Lag).
        const hadRows = historyListEl.querySelector('.entry-row') !== null;
        // Rendern mit Tages-Header VOR dem ersten Eintrag eines Tages — aber nur, wenn der Tag
        // mehr als einen Eintrag hat (Split-Shift). Einzel-Tage bleiben wie gehabt.
        let html = '';
        let lastDate = null;
        filteredData.forEach((e) => {
            if (e.date !== lastDate) {
                lastDate = e.date;
                const agg = dayAgg[e.date];
                if (agg && agg.count >= 2) html += dayHeaderRow(e.date, agg.sumDiff);
            }
            html += createRow(e);
        });
        historyListEl.innerHTML = html;
        if (!hadRows) {
            historyListEl.classList.add('entry-list-animate-in');
            setTimeout(() => historyListEl.classList.remove('entry-list-animate-in'), 500);
        }

        // Highlight entry if one is pending
        if (window.pendingHighlightId) {
            setTimeout(() => {
                const entryEl = document.querySelector(`[data-entry-id="${window.pendingHighlightId}"]`);
                if (entryEl) {
                    entryEl.classList.add('entry-highlight');
                    entryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => {
                        entryEl.classList.remove('entry-highlight');
                        window.pendingHighlightId = null;
                    }, 3000);
                } else {
                    window.pendingHighlightId = null;
                }
            }, 50);
        }
    }

    function editEntry(id) {
        openEditModal(id);
    }

    function openEntryDetail(id) {
        const e = data.entries.find(x => x.id === id);
        if (!e) return;

        // Dynamic lookup — Custom-Types + Overrides + Orphan-Fallback.
        const lkInfo = (typeof getEntryTypeInfo === 'function') ? getEntryTypeInfo(e.type) : null;
        const isCustom = String(e.type).startsWith('custom-');
        const cleanLabel = (typeof getTypeLabel === 'function') ? getTypeLabel(e.type) : e.type;
        const isWorkRel = !isCustom || (lkInfo && lkInfo.countsAsWork === true);

        const weekday  = new Date(e.date + 'T00:00:00').toLocaleDateString(mwlLocale(), {weekday:'long'});
        const dateStr  = new Date(e.date + 'T00:00:00').toLocaleDateString(mwlLocale(), {day:'2-digit', month:'2-digit', year:'numeric'});
        const diffStr  = isWorkRel ? ((e.diff >= 0 ? '+' : '') + e.diff.toFixed(2) + 'h') : '—';
        const diffColor= isWorkRel ? (e.diff >= 0 ? '#34d399' : '#f87171') : '#94a3b8';

        const icon = document.getElementById('edTypeIcon');
        icon.innerHTML = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(e.type, 26) : '';
        icon.style.setProperty('--type-rgb', (typeof getTypeRgb === 'function') ? getTypeRgb(e.type) : '148,163,184');
        document.getElementById('edTypeLabel').textContent = cleanLabel;
        document.getElementById('edDateLine').textContent  = weekday + ' · ' + dateStr;
        document.getElementById('edHours').textContent = e.worked.toFixed(1) + 'h';
        const diffEl = document.getElementById('edDiff');
        diffEl.textContent = diffStr;
        diffEl.style.color = diffColor;

        const rows = [];
        if (e.info)    rows.push(['Notiz', esc(e.info)]);
        if (e.project) rows.push(['Projekt', esc(e.project)]);
        if (e.mood)    rows.push(['Stimmung', e.mood]);
        // Custom Fields (user-definiert)
        if (e.customFieldValues && typeof e.customFieldValues === 'object') {
            const defs = Array.isArray(data.customFields) ? data.customFields : [];
            Object.keys(e.customFieldValues).forEach(fid => {
                const def = defs.find(f => f.id === fid);
                const label = def ? def.label : fid;
                let val = e.customFieldValues[fid];
                if (val === true) val = '✓';
                else if (val === false || val === '' || val == null) return;
                rows.push([esc(String(label)), esc(String(val))]);
            });
        }
        if (e.shiftWarning) rows.push(['Warnung', '⚠️ Über 10h']);

        document.getElementById('edRows').innerHTML = rows.length
            ? rows.map(([k,v]) => `<div class="ed-row"><span class="ed-row-key">${k}</span><span class="ed-row-val">${v}</span></div>`).join('')
            : '<div class="ed-row"><span class="ed-row-key" style="color:var(--text-muted)">Keine weiteren Infos</span></div>';

        document.getElementById('edEditBtn').onclick   = () => { closeEntryDetail(); editEntry(id); };
        document.getElementById('edDeleteBtn').onclick = () => { closeEntryDetail(); delEntry(id); };

        document.getElementById('entryDetailBackdrop').classList.add('active');
        document.getElementById('entryDetailSheet').classList.add('active');
    }

    function closeEntryDetail() {
        document.getElementById('entryDetailBackdrop').classList.remove('active');
        document.getElementById('entryDetailSheet').classList.remove('active');
    }
    window.openEntryDetail  = openEntryDetail;
    window.closeEntryDetail = closeEntryDetail;

    function closeTrashModal() {
        const modal = document.getElementById('trashModal');
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 200);
        if (modal._escHandler) { document.removeEventListener('keydown', modal._escHandler); modal._escHandler = null; }
        if (modal._overlayClick) { modal.removeEventListener('click', modal._overlayClick); modal._overlayClick = null; }
    }

