// ═══ HISTORY MODULE ═══

    function renderHistoryView() {
        const filteredData = filterHistoryData();
        const historyListEl = document.getElementById('entryListFull');
        
        document.getElementById('historyCount').innerText = `${filteredData.length} Einträge`;

        if (filteredData.length === 0) {
            historyListEl.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Keine Einträge gefunden, Filter anpassen.</p>';
            return;
        }

        const createRow = (e) => `
            <div class="entry-row type-${e.type}">
                <div>
                    <div class="entry-date">${new Date(e.date).toLocaleDateString('de-DE')}</div>
                    <div class="entry-meta">${e.isPeriod ? esc(e.label) : esc(e.info)} (${e.worked.toFixed(2)}h) ${e.shiftWarning ? '<span style="color:var(--danger); font-weight:700;">⚠ MAX!</span>' : ''} ${e.mood ? `<span class="mood-display" title="Stimmung: ${getMoodDescription(e.mood)}">${e.mood}</span>` : ''}</div>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span class="tag">${e.type === 'school' ? 'SCHULE' : (e.type === 'holiday' ? 'FEIERTAG' : (e.type === 'gleittag' ? 'GLEITTAG' : e.type.toUpperCase()))}</span>
                    ${e.project ? `<span class="tag project-tag">${esc(e.project)}</span>` : ''}
                    <div style="font-weight:700; width:60px; text-align:right; color:${e.diff>=0?'var(--success)':'var(--danger)'}">
                        ${e.diff>=0?'+':''}${e.diff.toFixed(2)}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-icon" onclick="editEntry(${e.id})" title="Bearbeiten">✏️</button>
                        <button class="btn-icon danger" onclick="delEntry(${e.id})" title="Löschen">🗑️</button>
                    </div>
                </div>
            </div>
        `;

        historyListEl.innerHTML = safeHTML(filteredData.map(createRow).join(''));
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

