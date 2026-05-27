// ═══ CORE: UTILS ═══
    // --- HILFSFUNKTIONEN (Unverändert) ---
    function isOddWeek(d) { return getWeek(d) % 2 !== 0; }

    function getWeek(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }
    function delEntry(id) {
        const entry = data.entries.find(e => e.id === id);
        if (!entry) return;

        showModernDeleteConfirm(entry, id);
    }

    function showModernDeleteConfirm(entry, id) {
        const typeLabels = {work:'Arbeit', school:'Schule', vacation:'Urlaub', gleittag:'Gleittag', sick:'Krank', holiday:'Feiertag'};
        const typeIcons  = {work:'💼', school:'📚', vacation:'🌴', gleittag:'⚡', sick:'🤒', holiday:'🎉'};
        const label = typeLabels[entry.type] || entry.type;
        const icon = typeIcons[entry.type] || '📋';
        const dateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit', year:'2-digit'});

        const overlay = document.createElement('div');
        overlay.className = 'delete-confirm-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            z-index: 3999;
            opacity: 0;
            animation: fadeInOverlay 0.3s ease forwards;
        `;

        const sheet = document.createElement('div');
        sheet.className = 'delete-confirm-sheet';
        sheet.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(var(--bg-deep-rgb, 3, 3, 5), 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px 24px 0 0;
            z-index: 4000;
            padding: 24px 20px 32px;
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
            @keyframes pulseDelete {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            @keyframes fadeOutEntry {
                0% { opacity: 1; transform: translateX(0); }
                100% { opacity: 0; transform: translateX(100%); }
            }
            .delete-confirm-sheet.deleting {
                animation: slideDownSheet 0.3s ease forwards;
            }
        `;
        if (!document.querySelector('style[data-delete-confirm]')) {
            style.setAttribute('data-delete-confirm', '');
            document.head.appendChild(style);
        }

        sheet.innerHTML = `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; background: rgba(239, 68, 68, 0.15); border-radius: 16px; margin: 0 auto 16px; font-size: 28px;">${icon}</div>
                <h2 style="color: #ef4444; margin: 0 0 8px 0; font-size: 1.3rem; font-weight: 700;">Eintrag löschen?</h2>
                <p style="color: var(--text-muted); margin: 0; font-size: 0.95rem;">${label} • ${dateStr}</p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
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
                <button class="btn-delete-cancel" style="flex: 1; padding: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: var(--text-main); border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-size: 1rem;">Abbrechen</button>
                <button class="btn-delete-confirm" style="flex: 1; padding: 14px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9)); border: none; color: white; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span>🗑️ Löschen</span>
                </button>
            </div>

            <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px; background: rgba(168, 85, 247, 0.08); border-radius: 10px;">
                ↩️ Du kannst den Eintrag danach noch wiederherstellen
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
            const idx = data.entries.findIndex(e => e.id === id);
            if (idx === -1) return;
            const entry = data.entries[idx];

            data.entries.splice(idx, 1);
            data.trash = data.trash || [];
            data.trash.push({ entry: entry, originalIndex: idx, deletedAt: Date.now() });

            recalculateVacationUsed();
            save();
            if (document.getElementById('view-history')?.classList.contains('active')) {
                 renderHistoryView();
            }

            showModernUndoToast();
        };

        sheet.querySelector('.btn-delete-cancel').addEventListener('click', () => closeSheet(false));
        sheet.querySelector('.btn-delete-confirm').addEventListener('click', () => closeSheet(true));
        overlay.addEventListener('click', () => closeSheet(false));

        document.body.appendChild(overlay);
        document.body.appendChild(sheet);

        // Swipe-to-delete on mobile
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

    function showModernUndoToast() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(var(--bg-sidebar-rgb, 15, 15, 20), 0.95);
            backdrop-filter: blur(20px);
            padding: 16px 20px;
            border-radius: 14px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            z-index: 5000;
            display: flex;
            gap: 12px;
            align-items: center;
            max-width: 90%;
            animation: slideUpUndo 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUpUndo {
                from { transform: translateX(-50%) translateY(120px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes slideDownUndo {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(120px); opacity: 0; }
            }
        `;
        if (!document.querySelector('style[data-undo-toast]')) {
            style.setAttribute('data-undo-toast', '');
            document.head.appendChild(style);
        }

        toast.innerHTML = `
            <div style="flex: 1; color: var(--text-main); font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2rem;">✓</span>
                <span>Eintrag gelöscht</span>
            </div>
            <button id="undoBtn" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(168, 85, 247, 0.15)); border: 1px solid rgba(168, 85, 247, 0.3); color: var(--primary); padding: 8px 14px; border-radius: 10px; cursor: pointer; font-weight: 700; transition: all 0.2s ease; white-space: nowrap;">↩️ Rückgängig</button>
        `;

        document.body.appendChild(toast);

        const removeToast = () => {
            toast.style.animation = 'slideDownUndo 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('#undoBtn').addEventListener('click', () => {
            undoDelete();
            removeToast();
        });

        // Swipe-to-dismiss
        let startX = 0, currentX = 0;
        toast.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; currentX = 0; toast.style.transition = 'none'; }, { passive: true });
        toast.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX - startX;
            if (Math.abs(currentX) > 10) { toast.style.transform = `translateX(calc(-50% + ${currentX}px))`; toast.style.opacity = Math.max(0.2, 1 - Math.abs(currentX) / 300); }
        }, { passive: true });
        toast.addEventListener('touchend', () => {
            if (Math.abs(currentX) > 100) { removeToast(); }
            else { toast.style.transition = 'all 0.3s ease'; toast.style.transform = 'translateX(-50%)'; toast.style.opacity = '1'; }
        });

        setTimeout(removeToast, 7000);
    }

    function showUndoToast() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-sidebar);
            padding: 12px 16px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 2001;
            display:flex;
            gap:12px;
            align-items:center;
            max-width: 90%;
        `;

        toast.innerHTML = `
            <div style="flex:1; color:var(--text-main); font-weight:600;">Eintrag gelöscht</div>
            <button id="undoBtn" style="background:transparent; border:1px solid rgba(255,255,255,0.08); color:var(--primary); padding:6px 10px; border-radius:8px; cursor:pointer;">Rückgängig</button>
        `;

        document.body.appendChild(toast);

        const removeToast = () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 240);
        };

        // Swipe-to-dismiss (touch)
        let _uSwX = 0, _uSwD = 0, _uSwActive = false;
        toast.addEventListener('touchstart', (e) => { _uSwX = e.touches[0].clientX; _uSwD = 0; _uSwActive = false; toast.style.transition = 'none'; }, { passive: true });
        toast.addEventListener('touchmove', (e) => {
            const dx = e.touches[0].clientX - _uSwX;
            if (!_uSwActive && Math.abs(dx) > 8) _uSwActive = true;
            if (_uSwActive) { _uSwD = dx; toast.style.transform = `translateX(calc(-50% + ${dx}px))`; toast.style.opacity = Math.max(0.2, 1 - Math.abs(dx) / 250); }
        }, { passive: true });
        toast.addEventListener('touchend', () => {
            if (_uSwActive && Math.abs(_uSwD) > 80) { removeToast(); }
            else { toast.style.transition = 'transform 0.3s ease, opacity 0.2s ease'; toast.style.transform = 'translateX(-50%)'; toast.style.opacity = '1'; }
            _uSwActive = false;
        });

        // Undo on click
        toast.querySelector('#undoBtn').addEventListener('click', () => {
            undoDelete();
            removeToast();
        });

        // Auto entfernen nach 8 Sekunden
        setTimeout(removeToast, 8000);
    }

    function undoDelete() {
        data.trash = data.trash || [];
        if (!data.trash.length) {
            showCustomMessage('ℹ️ Nichts zu rückgängig machen', 'Es gibt keine kürzliche Löschung.', 'info');
            return;
        }

        const last = data.trash.pop();
        const restored = last.entry;
        const idx = last.originalIndex != null ? last.originalIndex : data.entries.length;
        // Füge wieder an der ursprünglichen Position ein (oder hinten)
        data.entries.splice(Math.min(idx, data.entries.length), 0, restored);
        recalculateVacationUsed();
        save();
        if (document.getElementById('view-history').classList.contains('active')) {
            renderHistoryView();
        }

        showCustomMessage('↩️ Wiederhergestellt', 'Eintrag wurde wiederhergestellt.', 'success');
    }
    



    function toggleVacationPanel() {
        const vacationPanel = document.getElementById('vacationPanelCard');
        if (vacationPanel) {
            if (vacationPanel.style.display === 'none') {
                vacationPanel.style.display = 'block';
                // Load vacation data when opening
                const proRata = calculateProRataVacation(data.settings.vacation.total || 30);
                document.getElementById('vacationProRata').innerText = proRata;
                document.getElementById('confVacationTotal').value = data.settings.vacation.total || 30;
                document.getElementById('confVacationUsedManual').value = data.settings.vacation.usedManual || 0;
            } else {
                vacationPanel.style.display = 'none';
            }
        }
    }
    function saveCorrection() {
        const val = parseFloat(document.getElementById('corrVal').value);
        if(!val) return;
        const sel = document.getElementById('corrSelect');
        data.entries.push({
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            isPeriod: true,
            label: `Korrektur: ${sel.value}`,
            diff: val, worked:0, expected:0, type:'work', info:'Manuelle Korrektur',
            breakMins: 0, shiftEnd: '', shiftWarning: false
        });
        save();
        document.getElementById('corrModal').classList.remove('active');
    }
    function closeBackupMenu() {
        if (window.backupMenuElement) {
            window.backupMenuElement.remove();
            window.backupMenuElement = null;
        }
        if (window.backupMenuOverlay) {
            window.backupMenuOverlay.remove();
            window.backupMenuOverlay = null;
        }
    }
    function closeExportMenu() {
        if (window.exportMenuElement) {
            window.exportMenuElement.remove();
            window.exportMenuElement = null;
        }
        if (window.exportMenuOverlay) {
            window.exportMenuOverlay.remove();
            window.exportMenuOverlay = null;
        }
    }
