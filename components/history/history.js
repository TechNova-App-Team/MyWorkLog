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
                        <button class="btn-icon" onclick="editEntry(${e.id})" title="Bearbeiten">✏️</button>
                        <button class="btn-icon danger" onclick="delEntry(${e.id})" title="Löschen">🗑️</button>
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

    function closeTrashModal() {
        const modal = document.getElementById('trashModal');
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 200);
        if (modal._escHandler) { document.removeEventListener('keydown', modal._escHandler); modal._escHandler = null; }
        if (modal._overlayClick) { modal.removeEventListener('click', modal._overlayClick); modal._overlayClick = null; }
    }

