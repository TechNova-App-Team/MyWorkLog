// ═══ MODALS MODULE ═══

    function showExportMenu() {
        uEvent('backup-export-menu');
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 0;
            min-width: 300px;
            z-index: 500;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            overflow: hidden;
            backdrop-filter: blur(20px);
        `;
        
        menu.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border);">
                <h3 style="margin:0; font-size:1.1rem; font-weight:700;">💾 Backup exportieren</h3>
            </div>
            <button style="
                width: 100%;
                padding: 1rem;
                background: transparent;
                border: none;
                border-bottom: 1px solid var(--border);
                color: var(--text-main);
                text-align: left;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 0.95rem;
                display: flex;
                align-items: center;
                gap: 12px;
            " onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); openExportStatsModal();">
                <span style="font-size:1.3rem;">📊</span>
                <div>
                    <div style="font-weight:600;">Export mit Statistik</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Minimal (JSON) oder MAX Report (HTML mit Diagrammen)</div>
                </div>
            </button>
            <button style="
                width: 100%;
                padding: 1rem;
                background: transparent;
                border: none;
                border-bottom: 1px solid var(--border);
                color: var(--text-main);
                text-align: left;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 0.95rem;
                display: flex;
                align-items: center;
                gap: 12px;
            " onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); exportData('json');">
                <span style="font-size:1.3rem;">📄</span>
                <div>
                    <div style="font-weight:600;">Vollständiges Backup</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Alle Daten, Settings, Theme, Timer & mehr (JSON)</div>
                </div>
            </button>
            <button style="
                width: 100%;
                padding: 1rem;
                background: transparent;
                border: none;
                border-bottom: 1px solid var(--border);
                color: var(--text-main);
                text-align: left;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 0.95rem;
                display: flex;
                align-items: center;
                gap: 12px;
            " onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); document.getElementById('encryptedBackupModal').classList.add('active');">
                <span style="font-size:1.3rem;">🔒</span>
                <div>
                    <div style="font-weight:600;">Verschlüsseltes Backup</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Alle Daten, AES-256 verschlüsselt</div>
                </div>
            </button>
            <button style="
                width: 100%;
                padding: 1rem;
                background: transparent;
                border: none;
                color: var(--text-main);
                text-align: left;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 0.95rem;
                display: flex;
                align-items: center;
                gap: 12px;
            " onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'" onclick="closeExportMenu(); showICalExportModal();">
                <span style="font-size:1.3rem;">🗓️</span>
                <div>
                    <div style="font-weight:600;">iCalendar Export</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Für Google, Outlook, Apple</div>
                </div>
            </button>
        `;
        
        document.body.appendChild(menu);
        window.exportMenuElement = menu;
        
        // Schließen bei Click außerhalb
        setTimeout(() => {
            document.addEventListener('click', closeExportMenu);
        }, 100);
    }

    function showBackupMenu() {
        uEvent('backup-import-menu');
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 0;
            min-width: 300px;
            z-index: 500;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            overflow: hidden;
            backdrop-filter: blur(20px);
        `;
        
        menu.innerHTML = `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--border);">
                <h3 style="margin:0; font-size:1.1rem; font-weight:700;">📂 Backup importieren</h3>
            </div>
            <button style="
                width: 100%;
                padding: 1rem;
                background: transparent;
                border: none;
                border-bottom: 1px solid var(--border);
                color: var(--text-main);
                text-align: left;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 0.95rem;
                display: flex;
                align-items: center;
                gap: 12px;
            " onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'" onclick="closeBackupMenu(); document.getElementById('fileImp').click();">
                <span style="font-size:1.3rem;">📄</span>
                <div>
                    <div style="font-weight:600;">Vollständiges Backup</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">JSON-Datei (v2 oder Legacy)</div>
                </div>
            </button>
            <button style="
                width: 100%;
                padding: 1rem;
                background: transparent;
                border: none;
                color: var(--text-main);
                text-align: left;
                cursor: pointer;
                transition: background 0.2s;
                font-size: 0.95rem;
                display: flex;
                align-items: center;
                gap: 12px;
            " onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'" onclick="closeBackupMenu(); document.getElementById('fileImpEncrypted').click();">
                <span style="font-size:1.3rem;">🔒</span>
                <div>
                    <div style="font-weight:600;">Verschlüsseltes Backup</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Mit Passwort geschützt</div>
                </div>
            </button>
        `;
        
        document.body.appendChild(menu);
        window.backupMenuElement = menu;
        
        // Schließen bei Click außerhalb
        setTimeout(() => {
            document.addEventListener('click', closeBackupMenu);
        }, 100);
    }

    function exportData(format) {
        uEvent('backup-export', { format: format });
        if (format === 'json') {
             const backup = collectFullBackup();
             const a = document.createElement('a');
             a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'}));
             a.download = 'MyWorkLog_Backup_' + new Date().toISOString().split('T')[0] + '.json';
             a.click();
             URL.revokeObjectURL(a.href);
             try { localStorage.setItem('tt_last_export', new Date().toISOString()); } catch(e) {}
            try { const today = new Date().toISOString().split('T')[0]; localStorage.setItem('tt_export_reminder_shown_' + today, '1'); } catch(e) {}
            if (typeof updateAlertExportInfo === 'function') setTimeout(updateAlertExportInfo, 300);
             if (typeof showSmartNotification === 'function') showSmartNotification('💾 Vollständiges Backup', `${backup._keyCount} localStorage-Keys exportiert. Alle Einstellungen, Timer, Alerts, Theme & mehr gesichert.`, 'success');
        } else if (format === 'csv') {
            const csv = convertToCSV(data.entries);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
            a.download = 'time_pro_full_export.csv';
            a.click();
            try { localStorage.setItem('tt_last_export', new Date().toISOString()); } catch(e) {}
            try { const today = new Date().toISOString().split('T')[0]; localStorage.setItem('tt_export_reminder_shown_' + today, '1'); } catch(e) {}
            if (typeof updateAlertExportInfo === 'function') setTimeout(updateAlertExportInfo, 300);
            if (typeof showSmartNotification === 'function') showSmartNotification('💾 Backup', 'CSV-Export gestartet. Datei wurde heruntergeladen.', 'success');
        }
    }

    function importData(e) {
        uEvent('backup-import');
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

