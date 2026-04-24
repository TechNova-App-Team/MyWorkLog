// ═══ CORE: SETTINGS-PANEL ═══
    // ============================================
    // SHORTCUT MANAGEMENT FUNCTIONS
    // ============================================
    
    function renderShortcutsPanel() {
        if (!shortcutManager) return;
        
        const container = document.getElementById('shortcutsContainer');
        const shortcuts = shortcutManager.shortcuts;
        
        // Gruppiere nach Kategorien
        const categories = {};
        for (const [id, sc] of Object.entries(shortcuts)) {
            const cat = sc.category || 'Sonstiges';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ id, shortcut: sc });
        }
        
        // Render jede Kategorie
        let html = '';
        for (const [category, items] of Object.entries(categories).sort()) {
            html += `<div style="margin-bottom:2rem;">
                <h5 style="color:var(--primary); margin:0 0 12px 0; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.5px;">${category}</h5>
                <div style="display:grid; gap:8px;">`;
            
            for (const { id, shortcut } of items) {
                const displayKeys = shortcutManager.getShortcutDisplay(shortcut.keys);
                html += `
                    <div class="shortcut-item" style="background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:10px; padding:12px 15px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:0.2s;" data-shortcut-id="${id}">
                        <div style="flex:1;">
                            <div style="color:var(--text-main); font-weight:500; font-size:0.95rem;">${shortcut.name}</div>
                            <div style="color:var(--text-muted); font-size:0.8rem; margin-top:4px;">${shortcut.action}${shortcut.args ? ' (' + shortcut.args.join(', ') + ')' : ''}</div>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <div class="shortcut-keys" style="background:rgba(var(--primary-rgb),0.15); border:1px solid rgba(var(--primary-rgb),0.3); border-radius:8px; padding:8px 12px; font-family:var(--font-mono); font-size:0.85rem; font-weight:600; color:var(--primary); white-space:nowrap; cursor:pointer;" onclick="editShortcut('${id}', event)">
                                ${displayKeys}
                            </div>
                            <div style="font-size:0.72rem; color:var(--text-muted); padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.03);">${shortcut.allowInInput ? 'In Eingabefeldern' : 'nicht in Eingaben'}</div>
                        </div>
                    </div>
                `;
            }
            
            html += `</div></div>`;
        }
        
        container.innerHTML = html;
        
        // Prüfe auf Konflikte
        const conflicts = shortcutManager.checkConflicts();
        const warningEl = document.getElementById('shortcutConflictWarning');
        if (conflicts.length > 0) {
            warningEl.style.display = 'block';
            const conflictDesc = conflicts.map(c => {
                const sc1 = shortcuts[c.shortcuts[0]];
                const sc2 = shortcuts[c.shortcuts[1]];
                return `"${sc1.name}" und "${sc2.name}"`;
            }).join(', ');
            document.getElementById('conflictMessage').textContent = `Es gibt Konflikte zwischen: ${conflictDesc}`;
        } else {
            warningEl.style.display = 'none';
        }
    }
    
    function editShortcut(id, event) {
        event.stopPropagation();
        
        if (!shortcutManager) return;
        const shortcut = shortcutManager.shortcuts[id];
        if (!shortcut) return;
        
        // Modal für Shortcut-Bearbeitung
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const box = document.createElement('div');
        box.style.cssText = `
            background: var(--bg-glass);
            backdrop-filter: blur(24px);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
        `;
        
        const currentDisplay = shortcutManager.getShortcutDisplay(shortcut.keys);
        
        box.innerHTML = `
            <h3 style="color:var(--primary); margin:0 0 1rem 0;">${shortcut.name}</h3>
            <p style="color:var(--text-muted); margin:0 0 1.5rem 0; font-size:0.9rem;">Aktuelle Tastenkombination: <strong>${currentDisplay}</strong></p>
            
            <div style="background:rgba(var(--primary-rgb),0.1); border:1px solid rgba(var(--primary-rgb),0.3); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem; text-align:center; min-height:80px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <div style="color:var(--text-muted); font-size:0.85rem; margin-bottom:8px;">Drücke die gewünschte Tastenkombination:</div>
                <div id="recordedKeys" style="color:var(--primary); font-size:1.3rem; font-weight:600; font-family:var(--font-mono); min-height:30px;">...</div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:12px;">
                <label style="display:flex; align-items:center; gap:8px; font-size:0.9rem; color:var(--text-main);">
                    <input type="checkbox" id="allowInInputCheckbox" style="width:16px; height:16px;" ${shortcut.allowInInput ? 'checked' : ''} />
                    Shortcut in Eingabefeldern erlauben
                </label>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background:rgba(255,255,255,0.05); border:1px solid var(--border); color:var(--text-main); padding:10px; border-radius:8px; cursor:pointer; font-weight:500;">Abbrechen</button>
                <button onclick="saveEditedShortcut('${id}')" style="background:var(--primary); border:none; color:#fff; padding:10px; border-radius:8px; cursor:pointer; font-weight:500;">Speichern</button>
            </div>
        `;
        
        modal.appendChild(box);
        document.body.appendChild(modal);
        
        // Shortcut Recorder
        let recordedKeys = [];
        window.currentShortcutId = id;
        window.recordedKeys = recordedKeys;
        
        const keydownHandler = (e) => {
            e.preventDefault();
            recordedKeys.length = 0; // clear existing array to keep reference
            
            if (e.ctrlKey) recordedKeys.push('ctrl');
            if (e.altKey) recordedKeys.push('alt');
            if (e.shiftKey) recordedKeys.push('shift');
            
            const specialKeys = {
                ' ': 'space', 'Delete': 'delete', 'Enter': 'enter', 'Escape': 'escape', 'Tab': 'tab'
            };
            const lastKey = specialKeys[e.key] || e.key.toLowerCase();
            if (lastKey !== 'ctrl' && lastKey !== 'alt' && lastKey !== 'shift') {
                recordedKeys.push(lastKey);
            }
            
            if (recordedKeys.length > 0) {
                const display = shortcutManager.getShortcutDisplay(recordedKeys);
                document.getElementById('recordedKeys').textContent = display;
            }
        };
        
        document.addEventListener('keydown', keydownHandler);
        window.currentKeydownHandler = keydownHandler;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.removeEventListener('keydown', keydownHandler);
                modal.remove();
            }
        });
    }
    
    function saveEditedShortcut(id) {
        let recordedKeys = window.recordedKeys;
        if (!recordedKeys || recordedKeys.length === 0) {
            // Wenn keine neue Kombination eingegeben wurde, behalte die bestehende
            if (shortcutManager && shortcutManager.shortcuts[id] && Array.isArray(shortcutManager.shortcuts[id].keys)) {
                recordedKeys = shortcutManager.shortcuts[id].keys;
            } else {
                alert('Bitte drücke eine Tastenkombination');
                return;
            }
        }
        
        // Entferne Keydown Listener
        if (window.currentKeydownHandler) {
            document.removeEventListener('keydown', window.currentKeydownHandler);
        }
        
        // Speichere den neuen Shortcut
        const result = shortcutManager.updateShortcut(id, recordedKeys);

        // Speichere auch die "allowInInput" Einstellung aus dem Modal
        try {
            const chk = document.getElementById('allowInInputCheckbox');
            if (chk && shortcutManager && shortcutManager.shortcuts[id]) {
                shortcutManager.shortcuts[id].allowInInput = !!chk.checked;
                shortcutManager.saveShortcuts();
            }
        } catch (e) { console.warn('Fehler beim Speichern von allowInInput', e); }
        
        if (result.conflicts && result.conflicts.length > 0) {
            alert('⚠️ Warnung: Diese Tastenkombination ist bereits belegt!');
        }
        
        // Schließe Modal
        const modal = document.querySelector('[style*="position: fixed"][style*="top: 0"]');
        if (modal) modal.remove();
        
        // Aktualisiere Panel
        renderShortcutsPanel();
    }
    
    function saveAllShortcuts() {
        if (shortcutManager) {
            shortcutManager.saveShortcuts();
            showCustomMessage('✅ Erfolg', 'Alle Shortcuts wurden gespeichert.', 'success');
        }
    }
    
    function resetShortcutsToDefaults() {
        if (confirm('⚠️ Alle Shortcuts auf Standard zurücksetzen?')) {
            if (shortcutManager) {
                shortcutManager.resetToDefaults();
                renderShortcutsPanel();
                showCustomMessage('✅ Erfolg', 'Shortcuts wurden zurückgesetzt.', 'success');
            }
        }
    }
    
    // ============================================
    
    
    function switchSettingsTab(tabName) {
        uPageView('/app/settings/' + tabName, 'Settings – ' + tabName);
        // Alle Tab-Contents verstecken
        document.querySelectorAll('.settings-tab-content').forEach(el => el.style.display = 'none');
        // Alle Tab-Buttons deaktivieren
        document.querySelectorAll('.settings-tab').forEach(el => el.classList.remove('active'));

        // Aktiven Tab zeigen
        const contentEl = document.getElementById('settings-tab-' + tabName);
        if (contentEl) {
            contentEl.style.display = 'block';
        }

        // Aktiven Button markieren - finde Button mit onclick für diesen Tab
        const tabBtn = document.querySelector(`.settings-tab[onclick*="'${tabName}'"]`);
        if (tabBtn) {
            tabBtn.classList.add('active');
        } else if (event && event.target) {
            // Fallback für Event-basierte Aufrufe
            event.target.classList.add('active');
        }

        // Spezielle Rendering für bestimmte Tabs
        if (tabName === 'shortcuts') {
            renderShortcutsPanel();
        }
        if (tabName === 'custom') {
            renderCustomTypesManager();
        }
    }
    
    // Lightbox Modal für Grafiken (optimiert für Performance)
    function openGraphicModal(imageSrc, imageTitle) {
        // Konvertiere PNG zu WebP wenn verfügbar
        const webpSrc = imageSrc.replace(/\.png$/i, '.webp');
        const pngSrc = imageSrc;
        
        const modal = document.createElement('div');
        modal.id = 'graphicModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(3, 3, 5, 0.95);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="position: relative; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column;">
                <button onclick="document.getElementById('graphicModal').remove()" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: var(--text-main); font-size: 2rem; cursor: pointer; padding: 0;">&times;</button>
                <picture>
                    <source srcset="${webpSrc}" type="image/webp">
                    <img src="${pngSrc}" alt="${imageTitle}" decoding="async" style="max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 12px; border: 1px solid var(--border);">
                </picture>
                <h3 style="color: var(--primary); text-align: center; margin-top: 1rem; margin-bottom: 0;">${imageTitle}</h3>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Schließen bei Klick außerhalb des Bildes
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // ESC zum Schließen
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }
    // ===== Account / LocalStorage Löschung (Danger Zone) =====
    function clearAppLocalData() {
        // Vollständiges Leeren des LocalStorage (alle keys)
        try {
            localStorage.clear();
        } catch (e) {
            console.error('localStorage.clear() failed', e);
            // Fallback: iterative removal
            Object.keys(localStorage).forEach(k => localStorage.removeItem(k));
        }
    }

    function confirmAndClearLocalData() {
        // First confirmation
        const ok = confirm('Achtung — alle lokalen Daten werden gelöscht. Diese Aktion ist unwiderruflich. Fortfahren?');
        if (!ok) return;

        // Second explicit confirmation: require the user to type LÖSCHEN
        const txt = prompt('Gib zur Bestätigung LÖSCHEN ein (Großschreibung erforderlich):');
        if (txt !== 'LÖSCHEN') {
            showCustomMessage('Abgebrochen', 'Löschvorgang wurde abgebrochen. Die Eingabe stimmte nicht überein.', 'info');
            return;
        }

        // perform deletion
        try {
            clearAppLocalData();
            showCustomMessage('✅ Lokal gelöscht', 'Alle lokalen App-Daten wurden entfernt. Die Seite wird neu geladen.', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (e) {
            console.error('clear local data error', e);
            showCustomMessage('❌ Fehler', 'Beim Löschen der lokalen Daten ist ein Fehler aufgetreten.', 'error');
        }
    }
    
    /* ===== Backups helper functions (for debugging & restore) ===== */
    function renderBackupsList() {
        const container = document.getElementById('backupsList');
        const container2 = document.getElementById('recoveryBackupsList');
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]').slice().reverse();

        // Update stat cards
        const countEl = document.getElementById('recoveryBackupCount');
        const lastEl = document.getElementById('recoveryLastBackup');
        const entryEl = document.getElementById('recoveryEntryCount');
        const badgeEl = document.getElementById('recoveryBadgeCount');
        if (countEl) countEl.textContent = backups.length;
        if (badgeEl) badgeEl.textContent = backups.length;
        if (lastEl) {
            if (backups.length > 0) {
                const d = new Date(backups[0].ts);
                lastEl.textContent = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
            } else {
                lastEl.textContent = '—';
            }
        }
        if (entryEl) {
            const total = (data && data.entries) ? data.entries.length : 0;
            entryEl.textContent = total;
        }

        if(backups.length === 0) {
            const emptyHtml = `<div style="text-align:center; padding:28px 16px; color:rgba(255,255,255,0.35);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3; margin-bottom:8px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <div style="font-size:0.85rem; font-weight:500;">Keine Backups vorhanden</div>
                <div style="font-size:0.72rem; margin-top:4px; opacity:0.6;">Backups werden automatisch erstellt</div>
            </div>`;
            if(container) container.innerHTML = emptyHtml;
            if(container2) container2.innerHTML = emptyHtml;
            return;
        }

        // Legacy list for old backupsList container
        const legacyHtml = backups.map(b => {
            const dt = new Date(b.ts).toLocaleString();
            return `<div style="display:flex; gap:8px; align-items:center; justify-content:space-between; padding:6px 8px; border-radius:8px; background:rgba(255,255,255,0.02); margin-bottom:8px;">
                        <div style="flex:1; font-size:0.9rem; color:var(--text-main);">${dt}</div>
                        <div style="display:flex; gap:6px;">
                            <button class="btn" onclick="restoreBackup(${b.ts})">↺ Restore</button>
                            <button class="btn" onclick="mergeBackup(${b.ts})">🔀 Merge</button>
                            <button class="btn btn-secondary" onclick="downloadBackup(${b.ts})">⬇️ JSON</button>
                        </div>
                    </div>`;
        }).join('');
        if(container) container.innerHTML = legacyHtml;

        // Modern card layout for recovery modal
        const modernHtml = backups.map(b => {
            const dt = new Date(b.ts);
            const dateStr = dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = dt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
            const entries = (b.data && b.data.entries) ? b.data.entries.length : '?';
            return `<div class="recovery-backup-item">
                <div class="recovery-backup-dot"></div>
                <div class="recovery-backup-date">${dateStr} <span style="color:rgba(255,255,255,0.35); font-weight:400;">${timeStr}</span> <span style="font-size:0.7rem; color:rgba(var(--primary-rgb),0.7); margin-left:4px;">${entries} Einträge</span></div>
                <div class="recovery-backup-actions">
                    <button class="recovery-backup-btn restore" onclick="restoreBackup(${b.ts})" title="Wiederherstellen">↺ Restore</button>
                    <button class="recovery-backup-btn merge" onclick="mergeBackup(${b.ts})" title="Non-destructive Merge">⇄ Merge</button>
                    <button class="recovery-backup-btn" onclick="downloadBackup(${b.ts})" title="Als JSON herunterladen">↓ JSON</button>
                </div>
            </div>`;
        }).join('');
        if(container2) container2.innerHTML = modernHtml;
    }

    function restoreBackup(ts) {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        const b = backups.find(x => x.ts === ts);
        if(!b) return showCustomMessage('❌ Fehler', 'Backup nicht gefunden.', 'error');
        localStorage.setItem('tg_pro_data', JSON.stringify(b.data));
        localStorage.setItem('tg_last_save', b.ts);
        showCustomMessage('✅ Wiederhergestellt', 'Backup wurde auf diese Sitzung angewendet. Die Seite wird neu geladen.', 'success');
        setTimeout(() => location.reload(), 800);
    }

    function mergeBackup(ts) {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        const b = backups.find(x => x.ts === ts);
        if(!b) return showCustomMessage('❌ Fehler', 'Backup nicht gefunden.', 'error');

        const incoming = b.data.entries || [];
        let added = 0;
        incoming.forEach(entry => {
            if(!data.entries.some(e => e.id === entry.id)) {
                data.entries.push(entry);
                added++;
            }
        });
        if(added > 0) {
            data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
            save();
            renderLists();
            showCustomMessage('✅ Merge abgeschlossen', `${added} Einträge hinzugefügt.`, 'success');
        } else {
            showCustomMessage('ℹ️ Kein Merge nötig', 'Alle Einträge waren bereits vorhanden.', 'info');
        }
    }

    function openRecoveryModal() {
        uEvent('recovery-modal-open');
        const modal = document.getElementById('recoveryModal');
        if(!modal) return;
        modal.classList.add('active');
        renderBackupsList();
        initRecoveryDragDrop();
    }

    function closeRecoveryModal() {
        const modal = document.getElementById('recoveryModal');
        if(!modal) return;
        modal.classList.remove('active');
    }

    // Drag & Drop for Recovery import zone
    function initRecoveryDragDrop() {
        const zone = document.getElementById('recoveryDropZone');
        if (!zone || zone._dragInited) return;
        zone._dragInited = true;
        ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => {
            e.preventDefault(); e.stopPropagation();
            zone.classList.add('drag-over');
        }));
        ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => {
            e.preventDefault(); e.stopPropagation();
            zone.classList.remove('drag-over');
        }));
        zone.addEventListener('drop', e => {
            const file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file && file.name.endsWith('.json')) {
                // Reuse existing import handler
                const fakeEvent = { target: { files: [file] } };
                handleRecoveryImport(fakeEvent);
            } else {
                showCustomMessage('❌ Fehler', 'Bitte nur .json Dateien.', 'error');
            }
        });
    }

    // File import handlers for Recovery modal
    function handleRecoveryImport(event) {
        const file = event.target.files && event.target.files[0];
        if(!file) return showCustomMessage('❌ Fehler', 'Keine Datei ausgewählt.', 'error');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                window.pendingRecoveryImport = parsed;
                const actionsEl = document.getElementById('recoveryImportActions');
                const infoEl = document.getElementById('recoveryImportInfo');
                if (parsed._backupVersion === 2 && parsed._localStorage) {
                    const count = parsed._localStorage['tg_pro_data'] ? (JSON.parse(parsed._localStorage['tg_pro_data']).entries || []).length : 0;
                    if (actionsEl) actionsEl.style.display = 'flex';
                    if (infoEl) infoEl.textContent = `V2-Backup · ${parsed._keyCount} Keys · ${count} Einträge`;
                    showCustomMessage('📥 Full-Backup bereit', `V2-Backup vom ${parsed._created?.split('T')[0] || '?'} mit ${parsed._keyCount} Keys & ${count} Einträgen. Klicke 'Import & Apply'.`, 'success');
                } else {
                    const count = (parsed.entries || []).length;
                    if (actionsEl) actionsEl.style.display = 'flex';
                    if (infoEl) infoEl.textContent = `Legacy-Import · ${count} Einträge`;
                    showCustomMessage('📥 Legacy-Import bereit', `${count} Einträge geladen. Klicke 'Import & Apply' um anzuwenden.`, 'success');
                }
            } catch (err) {
                console.error('Import parse error', err);
                showCustomMessage('❌ Fehler', 'Ungültiges JSON.', 'error');
                window.pendingRecoveryImport = null;
            }
        };
        reader.readAsText(file);
    }

    function finalizeRecoveryImport() {
        if(!window.pendingRecoveryImport) return showCustomMessage('ℹ️ Kein Import', 'Bitte zuerst eine Datei auswählen (Import Backup).', 'info');
        try {
            restoreFullBackup(window.pendingRecoveryImport);
            showCustomMessage('✅ Import angewendet', 'Backup wiederhergestellt. Die Seite lädt neu.', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (e) {
            console.error('Finalize import failed', e);
            showCustomMessage('❌ Fehler', 'Import fehlgeschlagen: ' + e.message, 'error');
        }
    }

    function downloadBackup(ts) {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        const b = backups.find(x => x.ts === ts);
        if(!b) return showCustomMessage('❌ Fehler', 'Backup nicht gefunden.', 'error');
        const blob = new Blob([JSON.stringify(b.data, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tg_pro_data_backup_${ts}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }

    function downloadAllBackups() {
        const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
        if(backups.length === 0) return showCustomMessage('ℹ️ Keine Backups', 'Es wurden noch keine Backups erstellt.', 'info');
        const blob = new Blob([JSON.stringify(backups, null, 2)], {type: 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `tg_pro_data_backups_${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    }

    function clearOldBackups() {
        if(!confirm('Alle lokalen Backups löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
        localStorage.removeItem('tg_pro_data_backups');
        renderBackupsList();
        showCustomMessage('🧹 Gelöscht', 'Alle Backups wurden entfernt.', 'success');
    }

    // Load data from tg_pro_data in localStorage and apply to current session
    function loadLocalData() {
        const raw = localStorage.getItem('tg_pro_data');
        if(!raw) return showCustomMessage('ℹ️ Keine Daten', 'Kein `tg_pro_data` im localStorage gefunden.', 'info');

        if(!confirm('Daten aus localStorage laden? Aktuelle Sitzung wird überschrieben.')) return;

        try {
            const parsed = JSON.parse(raw);
            if(!parsed || typeof parsed !== 'object') throw new Error('Ungültiges Format');

            // Apply defaults similar to startup rehydration
            applyDataDefaults(parsed);

            // Replace runtime data
            data = parsed;
            // Recompute any derived values
            data.entries = data.entries || [];
            data.trash = data.trash || [];
            data.settings = data.settings || {};

            // Ensure order and indices
            data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));

            // Refresh UI
            updateUI();
            renderLists();
            try { renderSidebarNav(); } catch(e) {}
            try { renderWidgetManager(); } catch(e) {}
            try { enableWidgetDragDrop(); applyWidgetLayout(); } catch(e) {}
            try { renderPerformanceView(calculatePerformanceData(), calculateDeepPerformanceData()); } catch(e) {}
            try { if (document.getElementById('view-history').classList.contains('active')) renderHistoryView(); } catch(e) {}
            try { if (document.getElementById('view-goals').classList.contains('active')) renderGoalsView(); } catch(e) {}

            showCustomMessage('✅ Geladen', 'Daten aus localStorage wurden geladen und angezeigt.', 'success');
        } catch (e) {
            console.error('Load local data failed', e);
            showCustomMessage('❌ Fehler', 'Fehler beim Laden der Daten. Siehe Konsole.', 'error');
        }
    }

    function applyDataDefaults(d) {
        if(!d.settings) d.settings = {};
        if(!Array.isArray(d.settings.hours)) d.settings.hours = [0,8.75,8.75,8.75,8.75,4.5,0];
        if(!d.settings.break) d.settings.break = {thresh:6, min:[0, 15, 30, 30, 30, 30, 0]};
        if(!Array.isArray(d.trash)) d.trash = [];
        if (typeof d.settings.trashAutoEmptyDays === 'undefined') d.settings.trashAutoEmptyDays = 30;
        if(!Array.isArray(d.settings.break.min)) {
            const oldBreakMin = d.settings.break.min || 30;
            d.settings.break.min = [0, oldBreakMin, oldBreakMin, oldBreakMin, oldBreakMin, 15, 0];
        }
        if(!d.settings.vacation) d.settings.vacation = {total:30, used:0, usedManual:0};
        if(!Array.isArray(d.settings.projects)) d.settings.projects = [];
        if(!d.settings.ihk) d.settings.ihk = {start: '', end: '', exam_zwischen: '', note_zwischen: '', note_abschluss: ''};
        if(!d.settings.school) d.settings.school = { grades: { 'Kernprozesse': [], 'Wirtschaftslehre': [], 'IT-Systeme': [], 'Deutsch/Kommunikation': [] } };
        if(!d.settings.goals) d.settings.goals = [];
        if (typeof d.settings.shortcutsEnabled === 'undefined') d.settings.shortcutsEnabled = true;
        if(!Array.isArray(d.entries)) d.entries = [];
        if(!Array.isArray(d.customEntryTypes)) d.customEntryTypes = [];
        if(!Array.isArray(d.customFields)) d.customFields = [];
    }