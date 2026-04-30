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
        if (!data.trash || !data.trash[trashIndex]) return;
        const entry = data.trash[trashIndex].entry;
        showModernPermanentDeleteConfirm(entry, trashIndex);
    }

    function showModernPermanentDeleteConfirm(entry, trashIndex) {
        const typeLabels = {work:'Arbeit', school:'Schule', vacation:'Urlaub', gleittag:'Gleittag', sick:'Krank', holiday:'Feiertag'};
        const typeIcons  = {work:'💼', school:'📚', vacation:'🌴', gleittag:'⚡', sick:'🤒', holiday:'🎉'};
        const label = typeLabels[entry.type] || entry.type;
        const icon = typeIcons[entry.type] || '📋';
        const dateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'2-digit'});

        const overlay = document.createElement('div');
        overlay.className = 'delete-permanent-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 5999;
            opacity: 0;
            animation: fadeInOverlay 0.3s ease forwards;
        `;

        const sheet = document.createElement('div');
        sheet.className = 'delete-permanent-sheet';
        sheet.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(var(--bg-deep-rgb, 3, 3, 5), 0.98);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px 24px 0 0;
            z-index: 6000;
            padding: 28px 20px 36px;
            max-height: 80vh;
            animation: slideUpSheet 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            max-width: 100%;
            box-sizing: border-box;
            touch-action: none;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOverlay {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUpSheet {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideDownSheet {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(100%); opacity: 0; }
            }
            .delete-permanent-sheet.deleting {
                animation: slideDownSheet 0.3s ease forwards;
            }
        `;
        if (!document.querySelector('style[data-delete-permanent]')) {
            style.setAttribute('data-delete-permanent', '');
            document.head.appendChild(style);
        }

        sheet.innerHTML = `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: rgba(239, 68, 68, 0.2); border-radius: 18px; margin: 0 auto 16px; font-size: 32px;">${icon}</div>
                <h2 style="color: #ef4444; margin: 0 0 8px 0; font-size: 1.4rem; font-weight: 700;">Endgültig löschen?</h2>
                <p style="color: var(--text-muted); margin: 0 0 8px 0; font-size: 0.95rem;">${label} • ${dateStr}</p>
                <p style="color: #ef4444; margin: 0; font-size: 0.85rem; font-weight: 600;">⚠️ Diese Aktion kann nicht rückgängig gemacht werden</p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
                <div style="flex: 1;">
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 4px;">Arbeitszeit</div>
                    <div style="color: var(--text-main); font-size: 1.1rem; font-weight: 600;">${entry.worked.toFixed(1)}h</div>
                </div>
                ${entry.info ? `<div style="flex: 1; border-left: 1px solid rgba(255, 255, 255, 0.06); padding-left: 12;">
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Info</div>
                    <div style="color: var(--text-main); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(entry.info)}</div>
                </div>` : ''}
            </div>

            <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                <button class="btn-perm-cancel" style="flex: 1; padding: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: var(--text-main); border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-size: 1rem;">Abbrechen</button>
                <button class="btn-perm-confirm" style="flex: 1; padding: 14px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95)); border: none; color: white; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span>🗑️ Endgültig löschen</span>
                </button>
            </div>
        `;

        const closeSheet = (confirmed = false) => {
            sheet.classList.add('deleting');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
                sheet.remove();
            }, 300);
            if (confirmed) performDelete();
        };

        const performDelete = () => {
            data.trash.splice(trashIndex, 1);
            save();
            renderTrashModal();
            showModernDeletedToast();
        };

        sheet.querySelector('.btn-perm-cancel').addEventListener('click', () => closeSheet(false));
        sheet.querySelector('.btn-perm-confirm').addEventListener('click', () => closeSheet(true));
        overlay.addEventListener('click', () => closeSheet(false));

        document.body.appendChild(overlay);
        document.body.appendChild(sheet);

        // Swipe-to-dismiss
        let startY = 0, currentY = 0, isDragging = false;
        sheet.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; isDragging = false; sheet.style.transition = 'none'; }, { passive: true });
        sheet.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 10) { isDragging = true; sheet.style.transform = `translateY(${Math.min(diff, window.innerHeight / 2)}px)`; sheet.style.opacity = Math.max(0.3, 1 - diff / 400); }
        }, { passive: true });
        sheet.addEventListener('touchend', () => {
            const diff = currentY - startY;
            if (isDragging && diff > 100) { closeSheet(false); }
            else { sheet.style.transition = 'transform 0.3s ease, opacity 0.2s ease'; sheet.style.transform = 'translateY(0)'; sheet.style.opacity = '1'; }
            isDragging = false;
        });
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
    function showModernDeletedToast() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(var(--bg-sidebar-rgb, 15, 15, 20), 0.95);
            backdrop-filter: blur(20px);
            padding: 16px 24px;
            border-radius: 14px;
            border: 1px solid rgba(239, 68, 68, 0.2);
            z-index: 5000;
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 90%;
            animation: slideUpDeleteToast 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUpDeleteToast {
                from { transform: translateX(-50%) translateY(120px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes slideDownDeleteToast {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(120px); opacity: 0; }
            }
        `;
        if (!document.querySelector('style[data-deleted-toast]')) {
            style.setAttribute('data-deleted-toast', '');
            document.head.appendChild(style);
        }

        toast.innerHTML = `
            <span style="font-size: 1.3rem;">✓</span>
            <span style="color: var(--text-main); font-weight: 600;">Eintrag gelöscht</span>
        `;

        document.body.appendChild(toast);

        const removeToast = () => {
            toast.style.animation = 'slideDownDeleteToast 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        };

        setTimeout(removeToast, 4000);
    }

    function saveTimerState() {
        localStorage.setItem('tg_timer', JSON.stringify({
            id: timer.id, start: timer.start, paused: timer.paused, running: timer.running, breakTime: timer.breakTime // NEU: breakTime gespeichert
        }));
        localStorage.setItem('tg_timer_log', JSON.stringify(timer.log));
    }
