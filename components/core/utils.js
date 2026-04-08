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
        showCustomConfirm(
            '🗑️ Eintrag löschen?',
            'Möchtest du diesen Eintrag löschen? Du kannst ihn kurz rückgängig machen (Ctrl+Z).',
            () => {
                const idx = data.entries.findIndex(e => e.id === id);
                if (idx === -1) return;
                const entry = data.entries[idx];

                // Entferne aus Einträgen und schiebe in den Papierkorb (trash)
                data.entries.splice(idx, 1);
                data.trash = data.trash || [];
                data.trash.push({ entry: entry, originalIndex: idx, deletedAt: Date.now() });

                recalculateVacationUsed(); 
                save();
                if (document.getElementById('view-history').classList.contains('active')) {
                     renderHistoryView();
                }

                // Zeige kurz die Undo-Toast-Nachricht
                showUndoToast();
            },
            null
        );
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
            document.removeEventListener('click', closeBackupMenu);
        }
    }
    function closeExportMenu() {
        if (window.exportMenuElement) {
            window.exportMenuElement.remove();
            window.exportMenuElement = null;
            document.removeEventListener('click', closeExportMenu);
        }
    }
