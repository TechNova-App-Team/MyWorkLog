// ═══ CORE: UTILS ═══
    // --- SPRACHE / LOCALE ---
    // Monats- und Wochentagsnamen, Datums- und Zahlenformate kamen aus ~80
    // hartcodierten Locale-Literalen — auf /en/ stand deshalb ueberall "März"
    // und "24.07.2026". Diese eine Funktion ist jetzt die Quelle; jeder
    // toLocale*-Aufruf, der Text FUER DEN NUTZER erzeugt, ruft sie auf.
    // Ausnahme: Datums-Strings, die als Schluessel dienen (Dedup, Storage),
    // bleiben bewusst hartcodiert — sonst wechselt der Schluessel mit der Sprache.
    var MWL_LOCALE_DE = 'de' + '-DE';
    function mwlLocale() {
        return document.documentElement.lang === 'en' ? 'en-GB' : MWL_LOCALE_DE;
    }
    window.mwlLocale = mwlLocale;

    // --- HILFSFUNKTIONEN (Unverändert) ---
    function isOddWeek(d) { return getWeek(d) % 2 !== 0; }

    function getWeek(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }

    // --- ZEIT-RUNDUNG ---
    // Liest die User-Settings für Zeit-Rundung (kaufmännisch / abrunden / Taktung).
    // Default: enabled=false → JS-Standard-Rundung wie zuvor.
    function getRoundingSettings() {
        const r = (typeof data !== 'undefined' && data && data.settings && data.settings.rounding) || {};
        return {
            enabled: !!r.enabled,
            mode: (r.mode === 'down' || r.mode === 'taktung') ? r.mode : 'commercial',
            taktungMinutes: parseInt(r.taktungMinutes, 10) || 15
        };
    }

    // Rundet einen Stunden-Wert gemäß User-Settings. precision = Nachkommastellen für commercial/down.
    function roundHours(h, precision) {
        if (typeof h !== 'number' || !isFinite(h)) return h;
        if (typeof precision !== 'number') precision = 2;
        const r = getRoundingSettings();
        const factor = Math.pow(10, precision);
        if (!r.enabled) return Math.round(h * factor) / factor;
        if (r.mode === 'taktung') {
            const step = r.taktungMinutes / 60;
            if (step <= 0) return Math.round(h * factor) / factor;
            return Math.round(h / step) * step;
        }
        if (r.mode === 'down') {
            // Richtung Null abschneiden — damit auch bei negativen Überstunden-Werten "abrunden = weniger Magnitude"
            return h >= 0 ? Math.floor(h * factor) / factor : Math.ceil(h * factor) / factor;
        }
        return Math.round(h * factor) / factor;
    }

    // Formatiert Stundenwert als String (z.B. "8.25h"). suffix=null/'' lässt das h weg.
    function fmtHours(h, precision, suffix) {
        if (typeof precision !== 'number') precision = 2;
        if (typeof suffix === 'undefined') suffix = 'h';
        const v = roundHours(h, precision);
        return v.toFixed(precision) + suffix;
    }
    function delEntry(id) {
        const entry = data.entries.find(e => e.id === id);
        if (!entry) return;

        showModernDeleteConfirm(entry, id);
    }

    function showModernDeleteConfirm(entry, id) {
        const label = (typeof getTypeLabel === 'function') ? getTypeLabel(entry.type) : entry.type;
        // Typ-Icon im Danger-Ton — die rote Kachel sagt „wird gelöscht", das Icon sagt „was".
        const icon  = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(entry.type, 28) : '';
        const dateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString(mwlLocale(), {day:'2-digit', month:'2-digit', year:'2-digit'});

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
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; background: rgba(239, 68, 68, 0.15); border-radius: 16px; margin: 0 auto 16px; color: #ef4444;">${mwlIconFromEmoji(icon, 26)}</div>
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
                    <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Löschen</span>
                </button>
            </div>

            <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px; background: rgba(168, 85, 247, 0.08); border-radius: 10px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg> Du kannst den Eintrag danach noch wiederherstellen
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
                <span style="display:inline-grid;place-items:center;color:#10b981;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg></span>
                <span>Eintrag gelöscht</span>
            </div>
            <button id="undoBtn" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(168, 85, 247, 0.15)); border: 1px solid rgba(168, 85, 247, 0.3); color: var(--primary); padding: 8px 14px; border-radius: 10px; cursor: pointer; font-weight: 700; transition: all 0.2s ease; white-space: nowrap;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg> Rückgängig</button>
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

        showCustomMessage('Wiederhergestellt', 'Eintrag wurde wiederhergestellt.', 'success');
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
