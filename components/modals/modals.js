// ═══ MODALS MODULE ═══

    function showExportMenu() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;z-index:499;background:rgba(0,0,0,0.35);backdrop-filter:blur(2px);`;
        overlay.addEventListener('click', closeExportMenu);
        document.body.appendChild(overlay);
        window.exportMenuOverlay = overlay;

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 0;
            min-width: 320px;
            max-width: 90vw;
            z-index: 500;
            box-shadow: 0 24px 60px rgba(0,0,0,0.6);
            overflow: hidden;
            backdrop-filter: blur(24px);
        `;

        const iconStyle = `width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;flex-shrink:0;`;
        const btnStyle = `width:100%;padding:0.9rem 1rem;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text-main);text-align:left;cursor:pointer;transition:background 0.15s;font-size:0.95rem;display:flex;align-items:center;gap:12px;`;

        menu.innerHTML = `
            <div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
                <span style="${iconStyle}background:rgba(168,85,247,0.15);color:var(--primary);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                </span>
                <h3 style="margin:0;font-size:1rem;font-weight:700;">Backup exportieren</h3>
            </div>
            <button style="${btnStyle}" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); openExportStatsModal();">
                <span style="${iconStyle}background:rgba(59,130,246,0.15);color:#60a5fa;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </span>
                <div>
                    <div style="font-weight:600;">Export mit Statistik</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">Minimal (JSON) oder MAX Report (HTML mit Diagrammen)</div>
                </div>
            </button>
            <button style="${btnStyle}" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); exportData('json');">
                <span style="${iconStyle}background:rgba(34,197,94,0.15);color:#4ade80;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </span>
                <div>
                    <div style="font-weight:600;">Vollständiges Backup</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">Alle Daten, Settings, Theme, Timer & mehr (JSON)</div>
                </div>
            </button>
            <button style="${btnStyle}" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); document.getElementById('encryptedBackupModal').classList.add('active');">
                <span style="${iconStyle}background:rgba(251,146,60,0.15);color:#fb923c;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <div>
                    <div style="font-weight:600;">Verschlüsseltes Backup</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">Alle Daten, AES-256 verschlüsselt</div>
                </div>
            </button>
            <button style="${btnStyle}border-bottom:none;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); showICalExportModal();">
                <span style="${iconStyle}background:rgba(244,63,94,0.15);color:#fb7185;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
                <div>
                    <div style="font-weight:600;">iCalendar Export</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">Für Google, Outlook, Apple</div>
                </div>
            </button>
        `;

        document.body.appendChild(menu);
        window.exportMenuElement = menu;
    }

    function showBackupMenu() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;z-index:499;background:rgba(0,0,0,0.35);backdrop-filter:blur(2px);`;
        overlay.addEventListener('click', closeBackupMenu);
        document.body.appendChild(overlay);
        window.backupMenuOverlay = overlay;

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 0;
            min-width: 320px;
            max-width: 90vw;
            z-index: 500;
            box-shadow: 0 24px 60px rgba(0,0,0,0.6);
            overflow: hidden;
            backdrop-filter: blur(24px);
        `;

        const iconStyle = `width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;flex-shrink:0;`;
        const btnStyle = `width:100%;padding:0.9rem 1rem;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text-main);text-align:left;cursor:pointer;transition:background 0.15s;font-size:0.95rem;display:flex;align-items:center;gap:12px;`;

        menu.innerHTML = `
            <div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;">
                <span style="${iconStyle}background:rgba(168,85,247,0.15);color:var(--primary);">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </span>
                <h3 style="margin:0;font-size:1rem;font-weight:700;">Backup importieren</h3>
            </div>
            <button style="${btnStyle}" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="closeBackupMenu(); document.getElementById('fileImp').click();">
                <span style="${iconStyle}background:rgba(34,197,94,0.15);color:#4ade80;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </span>
                <div>
                    <div style="font-weight:600;">Vollständiges Backup</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">JSON-Datei (v2 oder Legacy)</div>
                </div>
            </button>
            <button style="${btnStyle}border-bottom:none;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="closeBackupMenu(); document.getElementById('fileImpEncrypted').click();">
                <span style="${iconStyle}background:rgba(251,146,60,0.15);color:#fb923c;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <div>
                    <div style="font-weight:600;">Verschlüsseltes Backup</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">Mit Passwort geschützt</div>
                </div>
            </button>
        `;

        document.body.appendChild(menu);
        window.backupMenuElement = menu;
    }

    function exportData(format) {
        if (format === 'json') {
             const backup = collectFullBackup();
             const a = document.createElement('a');
             a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'}));
             a.download = 'MyWorkLog_Backup_' + new Date().toISOString().split('T')[0] + '.json';
             a.click();
             URL.revokeObjectURL(a.href);
             try { localStorage.setItem('mwl_last_export', new Date().toISOString()); } catch(e) {}
            try { const today = new Date().toISOString().split('T')[0]; localStorage.setItem('mwl_export_reminder_shown_' + today, '1'); } catch(e) {}
            if (typeof updateAlertExportInfo === 'function') setTimeout(updateAlertExportInfo, 300);
             if (typeof showSmartNotification === 'function') showSmartNotification('💾 Vollständiges Backup', `${backup._keyCount} localStorage-Keys exportiert. Alle Einstellungen, Timer, Alerts, Theme & mehr gesichert.`, 'success');
        } else if (format === 'csv') {
            const csv = convertToCSV(data.entries);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
            a.download = 'time_pro_full_export.csv';
            a.click();
            try { localStorage.setItem('mwl_last_export', new Date().toISOString()); } catch(e) {}
            try { const today = new Date().toISOString().split('T')[0]; localStorage.setItem('mwl_export_reminder_shown_' + today, '1'); } catch(e) {}
            if (typeof updateAlertExportInfo === 'function') setTimeout(updateAlertExportInfo, 300);
            if (typeof showSmartNotification === 'function') showSmartNotification('💾 Backup', 'CSV-Export gestartet. Datei wurde heruntergeladen.', 'success');
        }
    }

    function importData(e) {
        const r = new FileReader();
        r.onload = ev => { 
            try { 
                const parsed = JSON.parse(ev.target.result);
                restoreFullBackup(parsed);
                showCustomMessage('✅ Backup wiederhergestellt', 
                    parsed._backupVersion === 2 
                        ? `Vollständiges Backup vom ${parsed._created?.split('T')[0] || '?'} mit ${parsed._keyCount || '?'} Keys wiederhergestellt. Seite wird neu geladen...` 
                        : 'Legacy-Backup importiert. Seite wird neu geladen...', 
                    'success');
                setTimeout(() => location.reload(), 1500);
            } catch(x){
                showCustomMessage('❌ Import-Fehler', 'Fehler: ' + x.message, 'error');
            } 
        };
        r.readAsText(e.target.files[0]);
    }

    function openCmdPalette() {
        const overlay = document.getElementById('cmdPalette');
        const input = document.getElementById('cmdPaletteInput');
        overlay.classList.add('open');
        input.value = '';
        cmdSelectedIdx = 0;
        renderCmdResults('');
        // Use requestAnimationFrame + short delay for reliable mobile focus
        requestAnimationFrame(() => {
            setTimeout(() => {
                input.focus();
                input.click();
            }, 50);
        });
    }

    function closeCmdPalette() {
        document.getElementById('cmdPalette').classList.remove('open');
    }

