// ═══ CORE: TRASH ═══
    // --- Trash Functions ---
    function openTrashModal() {
        const modal = document.getElementById('trashModal');
        if (!modal) return;
        modal.classList.add('active');
        modal.style.display = 'flex';
        renderTrashModal();
        // Accessibility: set role and aria
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) modalBox.setAttribute('tabindex', '-1');
        // Close on click outside content
        modal._overlayClick = function overlayClick(e) { if (e.target === modal) { closeTrashModal(); } };
        modal.addEventListener('click', modal._overlayClick);
        // focus first actionable element (close button)
        const closeBtn = modal.querySelector('.modal-close-x');
        if (closeBtn) closeBtn.focus();
        // Add escape listener to close
        modal._escHandler = (e) => { if (e.key === 'Escape') closeTrashModal(); };
        document.addEventListener('keydown', modal._escHandler);
    }
    function renderTrashModal() {
        const list = document.getElementById('trashList');
        if (!list) return;
        list.innerHTML = '';

        if (!Array.isArray(data.trash) || data.trash.length === 0) {
            list.innerHTML = `
                <div class="trash-empty">
                    <div style="font-size:2.25rem;">🧹</div>
                    <h4>Papierkorb ist leer</h4>
                    <p>Keine kürzlichen Löschungen. Gelöschte Einträge erscheinen hier und können wiederhergestellt werden.</p>
                    <div style="display:flex; gap:10px; margin-top:8px;">
                        <button class="btn" onclick="closeTrashModal()">Schließen</button>
                        <button class="btn btn-ghost" onclick="switchTab('history'); closeTrashModal();">Zur Chronik</button>
                    </div>
                </div>
            `;
            document.getElementById('trashCountBadge').textContent = '0';
            const hdr = document.getElementById('trashCountHeader'); if (hdr) hdr.textContent = '0';
            return;
        }

        document.getElementById('trashCountBadge').textContent = data.trash.length;
        const hdr = document.getElementById('trashCountHeader'); if (hdr) hdr.textContent = data.trash.length;
        const autoInput = document.getElementById('trashAutoDaysInput');
        if (autoInput) autoInput.value = data.settings.trashAutoEmptyDays || 0;

        data.trash.slice().reverse().forEach((t, idx) => {
            const deletedAt = new Date(t.deletedAt || Date.now());
            const ageDays = Math.floor((Date.now() - deletedAt.getTime()) / 86400000);
            const entry = t.entry;
            const row = document.createElement('div');
            row.className = 'trash-item';
            row.style.cssText = 'display:flex; gap:12px; align-items:center; background:transparent; padding:8px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.02);';

            const typeIcon = document.createElement('div');
            typeIcon.style.cssText = 'width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.25rem; background:linear-gradient(135deg, rgba(var(--primary-rgb),0.06), rgba(var(--primary-rgb),0.03)); border:1px solid rgba(var(--primary-rgb),0.12);';
            typeIcon.innerText = getTypeEmoji(entry.type || 'work');

            const body = document.createElement('div');
            body.style.flex = '1';
            body.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div style="font-weight:700; color:var(--text-main);">${entry.date} · ${entry.type} · ${entry.worked}h</div>
                    <div style="color:var(--text-muted); font-size:0.9rem;">${ageDays}d</div>
                </div>
                <div style="color:var(--text-muted); font-size:0.85rem; margin-top:6px;">${entry.project ? '<strong style="color:var(--primary);">' + entry.project + '</strong> · ' : ''}${entry.info ? entry.info : ''}</div>
            `;

            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            actions.style.alignItems = 'center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.trashIndex = (data.trash.length - 1 - idx);

            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'btn btn-ghost';
            restoreBtn.textContent = '↩️';
            restoreBtn.title = 'Wiederherstellen';
            restoreBtn.onclick = () => { restoreSingleTrash(parseInt(checkbox.dataset.trashIndex)); };

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-danger';
            delBtn.textContent = '🗑️';
            delBtn.title = 'Löschen';
            delBtn.onclick = () => { trashDeleteConfirm(parseInt(checkbox.dataset.trashIndex)); };

            actions.appendChild(checkbox);
            actions.appendChild(restoreBtn);
            actions.appendChild(delBtn);

            row.appendChild(typeIcon);
            row.appendChild(body);
            row.appendChild(actions);
            list.appendChild(row);
        });
    }

    function restoreSingleTrash(trashIndex) {
        uEvent('trash-restore');
        if (!data.trash || data.trash.length === 0) return;
        const t = data.trash[trashIndex];
        if (!t) return;
        const restored = t.entry;
        const idx = (t.originalIndex != null) ? Math.min(t.originalIndex, data.entries.length) : data.entries.length;
        data.entries.splice(idx, 0, restored);
        // Remove from trash
        data.trash.splice(trashIndex, 1);
        save();
        renderTrashModal();
        if (document.getElementById('view-history').classList.contains('active')) renderHistoryView();
        showCustomMessage('↩️ Wiederhergestellt', 'Eintrag wurde wiederhergestellt.', 'success');
    }

    function trashDeleteConfirm(trashIndex) {
        showCustomConfirm('🗑️ Eintrag endgültig löschen?', 'Dieser Eintrag wird unwiderruflich gelöscht. Fortfahren?', () => {
            data.trash.splice(trashIndex, 1);
            save();
            renderTrashModal();
            showCustomMessage('✅ Gelöscht', 'Eintrag wurde dauerhaft entfernt.', 'success');
        }, null);
    }

    function trashSelectAll(el) {
        const list = document.getElementById('trashList');
        if (!list) return;
        const checkboxes = list.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = el.checked);
    }

    function trashBulkRestore() {
        const list = document.getElementById('trashList');
        if (!list) return;
        const checkboxes = Array.from(list.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked);
        if (!checkboxes.length) { showCustomMessage('ℹ️ Keine Auswahl', 'Bitte markiere Einträge zum Wiederherstellen.', 'info'); return; }
        // Sort by index ascending to restore correctly (smallest index first)
        const indexes = checkboxes.map(cb => parseInt(cb.dataset.trashIndex)).sort((a,b)=>a-b);
        for (const i of indexes) {
            const t = data.trash[i];
            if (!t) continue;
            const restored = t.entry; const idx = (t.originalIndex != null) ? Math.min(t.originalIndex, data.entries.length) : data.entries.length;
            data.entries.splice(idx, 0, restored);
        }
        // Remove restored indexes from trash (reverse order to avoid index shift)
        for (const i of indexes.sort((a,b)=>b-a)) { data.trash.splice(i,1); }
        save(); renderTrashModal(); if (document.getElementById('view-history').classList.contains('active')) renderHistoryView(); showCustomMessage('✅ Wiederherstellt', 'Markierte Einträge wiederhergestellt.', 'success');
    }

    function trashBulkDeleteConfirm() {
        showCustomConfirm('🗑️ Markierte Einträge löschen?', 'Markierte Einträge werden unwiderruflich gelöscht. Fortfahren?', () => {
            const list = document.getElementById('trashList'); if (!list) return; const checkboxes = Array.from(list.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked);
            const indexes = checkboxes.map(cb => parseInt(cb.dataset.trashIndex)).sort((a,b)=>b-a);
            for (const i of indexes) data.trash.splice(i,1);
            save(); renderTrashModal(); showCustomMessage('✅ Gelöscht', 'Markierte Einträge wurden gelöscht.', 'success');
        }, null);
    }

    function emptyTrashConfirm() {
        showCustomConfirm('🧹 Papierkorb jetzt leeren?', 'Alle Einträge im Papierkorb werden dauerhaft gelöscht. Fortfahren?', () => {
            data.trash = [];
            save(); renderTrashModal(); showCustomMessage('✅ Papierkorb geleert', 'Alle Einträge wurden gelöscht.', 'success');
        }, null);
    }

    function saveTrashAutoDays() {
        const v = parseInt(document.getElementById('trashAutoDaysInput').value,10) || 0;
        data.settings.trashAutoEmptyDays = v; save(); showCustomMessage('✅ Gespeichert', `Auto-Leerung nach ${v} Tagen eingestellt.`, 'success');
    }

    function autoEmptyTrash() {
        const days = data.settings.trashAutoEmptyDays || 0;
        if (!days || days <= 0) return;
        const now = Date.now(); const ms = days * 86400000;
        const before = data.trash.length;
        data.trash = data.trash.filter(t => (now - (t.deletedAt || 0)) <= ms);
        if (data.trash.length !== before) { save(); }
    }
    function saveTimerState() { 
        localStorage.setItem('tg_timer', JSON.stringify({
            id: timer.id, start: timer.start, paused: timer.paused, running: timer.running, breakTime: timer.breakTime // NEU: breakTime gespeichert
        })); 
        localStorage.setItem('tg_timer_log', JSON.stringify(timer.log));
    }
