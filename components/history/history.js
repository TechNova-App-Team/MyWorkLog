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

        const typeLabels  = {work:'Arbeit', school:'Schule', vacation:'Urlaub', gleittag:'Gleittag', sick:'Krank', holiday:'Feiertag'};
        const typeIcons   = {work:'💼', school:'📚', vacation:'🌴', gleittag:'⚡', sick:'🤒', holiday:'🎉'};
        const createRow = (e) => {
            const diffColor = e.diff >= 0 ? '#10b981' : '#ef4444';
            const diffBg    = e.diff >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
            const diffStr   = (e.diff >= 0 ? '+' : '') + e.diff.toFixed(2) + 'h';
            const info      = e.isPeriod ? esc(e.label) : esc(e.info || '');
            const label     = typeLabels[e.type] || e.type;
            const icon      = typeIcons[e.type]  || '📋';
            const weekday   = new Date(e.date + 'T00:00:00').toLocaleDateString('de-DE', {weekday:'short'});
            const dateShort = new Date(e.date + 'T00:00:00').toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'2-digit'});
            return `
            <div class="entry-row type-${e.type}" data-entry-id="${e.id}">
                <div class="er-left">
                    <div class="er-icon-wrap type-${e.type}">${icon}</div>
                    <div class="er-date-col">
                        <span class="er-weekday">${weekday}</span>
                        <span class="er-date">${dateShort}</span>
                    </div>
                </div>
                <div class="er-mid">
                    <span class="er-info">${info || '—'}</span>
                    <div class="er-tags">
                        <span class="er-badge type-${e.type}">${label}</span>
                        ${e.project ? `<span class="er-project">${esc(e.project)}</span>` : ''}
                        ${e.mood ? `<span class="er-mood">${e.mood}</span>` : ''}
                        ${e.shiftWarning ? '<span class="er-warn">⚠ MAX</span>' : ''}
                    </div>
                </div>
                <div class="er-right">
                    <div class="er-hours">${e.worked.toFixed(1)}<span class="er-h-unit">h</span></div>
                    <div class="er-diff" style="color:${diffColor};background:${diffBg}">${diffStr}</div>
                    <div class="er-actions">
                        <button class="btn-icon" onclick="openEntryDetail(${e.id})" title="Details">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </button>
                        <button class="btn-icon" onclick="editEntry(${e.id})" title="Bearbeiten">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-icon danger" onclick="delEntry(${e.id})" title="Löschen">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            </div>`;
        };

        historyListEl.innerHTML = filteredData.map(createRow).join('');

        // Highlight entry if one is pending
        if (window.pendingHighlightId) {
            console.log('⭐ PENDING HIGHLIGHT ID:', window.pendingHighlightId);
            setTimeout(() => {
                const selector = `[data-entry-id="${window.pendingHighlightId}"]`;
                console.log('🔍 SEARCHING FOR:', selector);
                const entryEl = document.querySelector(selector);
                console.log('🔍 FOUND:', entryEl ? 'YES!' : 'NO');
                if (entryEl) {
                    console.log('✨ ADDING HIGHLIGHT CLASS');
                    entryEl.classList.add('entry-highlight');
                    console.log('✨ CLASS ADDED:', entryEl.classList.toString());
                    entryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        console.log('✨ REMOVING HIGHLIGHT AFTER 3S');
                        entryEl.classList.remove('entry-highlight');
                        window.pendingHighlightId = null;
                    }, 3000);
                } else {
                    console.warn('❌ ELEMENT NOT FOUND!');
                    console.log('📋 ALL data-entry-id VALUES:', Array.from(document.querySelectorAll('[data-entry-id]')).map(el => el.getAttribute('data-entry-id')));
                }
            }, 50);
        } else {
            console.log('⭐ NO PENDING HIGHLIGHT');
        }
    }

    function editEntry(id) {
        openEditModal(id);
    }

    function openEntryDetail(id) {
        const e = data.entries.find(x => x.id === id);
        if (!e) return;

        const typeLabels = {work:'Arbeit', school:'Berufsschule', vacation:'Urlaub', gleittag:'Gleittag', sick:'Krank', holiday:'Feiertag'};
        const typeIcons  = {work:'💼', school:'📚', vacation:'🌴', gleittag:'⚡', sick:'🤒', holiday:'🎉'};
        const typeBg     = {work:'rgba(168,85,247,0.15)', school:'rgba(6,182,212,0.15)', vacation:'rgba(16,185,129,0.15)', gleittag:'rgba(245,158,11,0.15)', sick:'rgba(239,68,68,0.15)', holiday:'rgba(236,72,153,0.15)'};

        const weekday  = new Date(e.date + 'T00:00:00').toLocaleDateString('de-DE', {weekday:'long'});
        const dateStr  = new Date(e.date + 'T00:00:00').toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'});
        const diffStr  = (e.diff >= 0 ? '+' : '') + e.diff.toFixed(2) + 'h';
        const diffColor= e.diff >= 0 ? '#34d399' : '#f87171';

        const icon = document.getElementById('edTypeIcon');
        icon.textContent = typeIcons[e.type] || '📋';
        icon.style.background = typeBg[e.type] || 'rgba(255,255,255,0.08)';
        document.getElementById('edTypeLabel').textContent = typeLabels[e.type] || e.type;
        document.getElementById('edDateLine').textContent  = weekday + ' · ' + dateStr;
        document.getElementById('edHours').textContent = e.worked.toFixed(1) + 'h';
        const diffEl = document.getElementById('edDiff');
        diffEl.textContent = diffStr;
        diffEl.style.color = diffColor;

        const rows = [];
        if (e.info)    rows.push(['Notiz', esc(e.info)]);
        if (e.project) rows.push(['Projekt', esc(e.project)]);
        if (e.mood)    rows.push(['Stimmung', e.mood]);
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

