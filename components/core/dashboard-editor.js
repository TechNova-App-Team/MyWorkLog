// ═══ CORE: DASHBOARD-EDITOR ═══
    // ============================================
    // DASHBOARD LAYOUT MANAGEMENT (FULL REDESIGN)
    // ============================================
    
    function toggleDashboardEditMode() {
        const container = document.getElementById('dashboardContainer');
        const btnEdit = document.getElementById('btnEditLayout');
        const btnReset = document.getElementById('btnResetLayout');
        const btnCancel = document.getElementById('dashboardCancelBtn');
        const editControls = document.getElementById('dashboardEditControls');
        const statusEl = document.getElementById('editModeStatus');
        
        if (!container) return;
        
        container.classList.toggle('edit-mode');
        
        if (container.classList.contains('edit-mode')) {
            btnEdit.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>Layout speichern</span>';
            btnEdit.classList.add('btn-success');
            btnEdit.classList.remove('btn-primary');
            btnReset.style.display = 'inline-block';
            if (btnCancel) btnCancel.style.display = 'inline-block';
            if (editControls) editControls.style.opacity = '1';
            if (editControls) editControls.style.pointerEvents = 'auto';
            if (statusEl) statusEl.style.opacity = '1';
            // Settings-Modal schließen, falls von dort getriggert — User soll Dashboard direkt sehen
            const settingsModal = document.getElementById('settingsModal');
            if (settingsModal && settingsModal.classList.contains('active')) {
                if (typeof saveSettings === 'function') {
                    try { saveSettings(); } catch (e) { settingsModal.classList.remove('active'); }
                } else {
                    settingsModal.classList.remove('active');
                }
            }
            console.log('Entering edit mode, setting up drag drop');
            setupDashboardDragDrop();
        } else {
            btnEdit.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg><span>Layout editieren</span>';
            btnEdit.classList.add('btn-primary');
            btnEdit.classList.remove('btn-success');
            btnReset.style.display = 'none';
            if (btnCancel) btnCancel.style.display = 'none';
            if (editControls) editControls.style.opacity = '0';
            if (editControls) editControls.style.pointerEvents = 'none';
            if (statusEl) statusEl.style.opacity = '0';
            
            // Disable all drag drop handlers
            console.log('Exiting edit mode, disabling drag drop');
            disableDashboardDragDrop();
            
            // Remove all remove buttons when exiting edit mode
            console.log('Exiting edit mode, removing remove buttons');
            container.querySelectorAll('.dashboard-item-remove-btn').forEach(btn => {
                console.log('Removing remove button');
                btn.remove();
            });

            // Auch die Pin-Stecknadel-Buttons entfernen (werden von renderPinButtons beim Betreten gesetzt)
            container.querySelectorAll('.dashboard-item-pin-btn').forEach(btn => btn.remove());
            
            // If layout was modified while editing, save the final order now (quietly)
            if (dashboardLayoutDirty) {
                saveWidgetLayout(true); // notify user once
            } else {
                saveDashboardLayout();
            }
        }
    }
    function resetDashboardLayout() {
        localStorage.removeItem('mwl_dashboard_layout');
        // Also clear the widgetLayout stored in settings so applyWidgetLayout does not re-apply a saved custom layout
        if (data && data.settings) {
            delete data.settings.widgetLayout;
            try { save(); } catch(e) { console.warn('Failed to save data on resetDashboardLayout', e); }
        }
        // Reload the page to reset layout
        location.reload();
    }
    
    function setupDashboardDragDrop() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        // NUR wenn im Edit-Mode aktiv!
        if (!container.classList.contains('edit-mode')) {
            console.log('Not in edit mode, skipping drag setup');
            return;
        }
        
        const items = container.querySelectorAll('.dashboard-item');
        let draggedItem = null;
        
        // Remove existing remove buttons FIRST
        console.log('Removing existing remove buttons');
        container.querySelectorAll('.dashboard-item-remove-btn').forEach(btn => {
            console.log('Removing existing button');
            btn.remove();
        });

        // Add remove buttons if in edit mode
        if (container.classList.contains('edit-mode')) {
            console.log('Adding remove buttons for', items.length, 'items');
            items.forEach((item, index) => {
                console.log('Adding remove button to item', index, item.getAttribute('data-item-id'));
                const removeBtn = document.createElement('button');
                removeBtn.className = 'dashboard-item-remove-btn';
                removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
                removeBtn.title = 'Widget entfernen';
                removeBtn.style.cssText = `
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(239, 68, 68, 0.95);
                    color: white;
                    border: 2px solid white;
                    border-radius: 50%;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 100;
                    opacity: 0.9;
                    transition: all 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                `;
                removeBtn.onmouseover = () => {
                    removeBtn.style.opacity = '1';
                    removeBtn.style.transform = 'scale(1.1)';
                };
                removeBtn.onmouseout = () => {
                    removeBtn.style.opacity = '0.9';
                    removeBtn.style.transform = 'scale(1)';
                };
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    const widgetId = item.getAttribute('data-item-id');
                    console.log('Remove button clicked for widget:', widgetId);
                    removeWidget(widgetId);
                };
                item.style.position = 'relative';
                item.appendChild(removeBtn);
                console.log('Remove button added to item', index);
            });
        }
        
        items.forEach(item => {
            const widgetId = item.getAttribute('data-item-id');
            const pinned = (typeof isWidgetPinned === 'function') && isWidgetPinned(widgetId);
            // Gepinnte Widgets: kein Drag erlauben
            item.draggable = !pinned;
            if (pinned) item.setAttribute('data-pinned', '1');
            else item.removeAttribute('data-pinned');

            // Benutzerdefinierten Handler setzen (nicht addEventListener, um Duplikate zu vermeiden)
            item.ondragstart = (e) => {
                if (item.getAttribute('data-pinned') === '1') {
                    e.preventDefault();
                    return false;
                }
                draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.getAttribute('data-item-id'));
            };
            
            item.ondragend = () => {
                draggedItem = null;
                item.classList.remove('dragging');
            };
            
            item.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (!draggedItem) return;
                
                const afterElement = getDragAfterElement(container, e.clientY);
                if (afterElement == null) {
                    container.appendChild(draggedItem);
                } else {
                    container.insertBefore(draggedItem, afterElement);
                }
            };
        });
        
        // Drop handler
        container.ondrop = (e) => {
            e.preventDefault();
        };
    }
    
    function disableDashboardDragDrop() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        const items = container.querySelectorAll('.dashboard-item');
        items.forEach(item => {
            // Alle Drag-Handler entfernen
            item.draggable = false;
            item.ondragstart = null;
            item.ondragend = null;
            item.ondragover = null;
        });
        
        // Container drop handler entfernen
        container.ondrop = null;
    }
    
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.dashboard-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    function saveDashboardLayout() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        const order = Array.from(container.querySelectorAll('.dashboard-item')).map(item => {
            return item.getAttribute('data-item-id');
        }).filter(Boolean);
        
        if (order.length > 0) {
            localStorage.setItem('mwl_dashboard_layout', JSON.stringify(order));
            console.log('✅ Dashboard layout saved:', order);
        }
    }
    
    function loadDashboardLayout() {
        const container = document.getElementById('dashboardContainer');
        if (!container) return;
        
        disableDashboardDragDrop();
        
        // Wait a tick for DOM to be ready
        setTimeout(() => {
            const savedOrder = localStorage.getItem('mwl_dashboard_layout');
            if (savedOrder) {
                try {
                    const order = JSON.parse(savedOrder);
                    const items = Array.from(container.querySelectorAll('.dashboard-item'));
                    
                    // WICHTIG: Clone alle Items um alte Event Listener zu entfernen!
                    const clonedItems = items.map(item => {
                        const clone = item.cloneNode(true);
                        clone.draggable = false;
                        clone.ondragstart = null;
                        clone.ondragend = null;
                        clone.ondragover = null;
                        return clone;
                    });
                    
                    // Reorder geclonte Items basierend auf saved order
                    const cloneMap = new Map(clonedItems.map(clone => [
                        clone.getAttribute('data-item-id'),
                        clone
                    ]));
                    
                    // Ersetze alte Items mit geclonten Versionen in der richtigen Reihenfolge
                    order.forEach(itemId => {
                        if (cloneMap.has(itemId)) {
                            const clone = cloneMap.get(itemId);
                            const oldItem = items.find(el => el.getAttribute('data-item-id') === itemId);
                            if (oldItem && oldItem.parentNode) {
                                oldItem.parentNode.replaceChild(clone, oldItem);
                                container.appendChild(clone);  // Append to end in correct order
                            }
                        }
                    });
                    
                    console.log('✅ Dashboard layout loaded with fresh items (no event listeners)');
                } catch (e) {
                    console.error('Failed to load dashboard layout:', e);
                }
            }
        }, 100);
    }

    // ============================================
    // WIDGET MANAGER SYSTEM
    // ============================================

    // Widget Library
    const widgetLibrary = {
        'kpi-cards': {
            name: 'KPI Karten',
            description: 'Wochen-, Monats- und Gleitzeit-Übersicht',
            icon: '📊',
            defaultEnabled: true,
            html: `
                <div class="kpi-grid" id="dashboardGrid">
                    <div class="card kpi-card">
                        <div class="progress-ring">
                            <svg width="100" height="100">
                                <circle class="ring-bg" cx="50" cy="50" r="44"></circle>
                                <circle id="ringWeek" class="ring-val" cx="50" cy="50" r="44" stroke-dasharray="276" stroke-dashoffset="276"></circle>
                            </svg>
                            <div class="ring-center">
                                <div class="ring-num" id="valWeek">0</div>
                                <div class="ring-lbl">Woche</div>
                            </div>
                        </div>
                    </div>
                    <div class="card kpi-card">
                        <div class="progress-ring">
                            <svg width="100" height="100">
                                <circle class="ring-bg" cx="50" cy="50" r="44"></circle>
                                <circle id="ringMonth" class="ring-val" cx="50" cy="50" r="44" stroke-dasharray="276" stroke-dashoffset="276"></circle>
                            </svg>
                            <div class="ring-center">
                                <div class="ring-num" id="valMonth">0</div>
                                <div class="ring-lbl">Monat</div>
                            </div>
                        </div>
                    </div>
                    <div class="card" style="display:flex; flex-direction:column; justify-content:center;">
                        <div class="ring-lbl">GLEITZEIT KONTO</div>
                        <div style="font-size:2.8rem; font-weight:800; color:var(--primary); margin:10px 0; font-family:var(--font-mono); letter-spacing:-2px;" id="valTotal">+0.0h</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Prognose: <span id="valProjected" style="color:var(--text-main)">0h</span></div>
                        <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:6px; font-size:0.8rem;">
                            <span id="streakEmoji" class="streak-active" style="font-size:1rem;">🔥</span>
                            <span style="color:var(--text-muted);">Streak:</span>
                            <span id="streakCount" style="color:var(--success); font-weight:800;">0</span>
                            <span style="font-size:0.7rem; color:var(--text-muted);" id="streakBest">Best: 0</span>
                        </div>
                    </div>
                    <div class="card" style="display:flex; flex-direction:column; justify-content:center;">
                        <div class="ring-lbl">Ø TÄGLICH</div>
                        <div style="font-size:2rem; font-weight:800; color:var(--text-main); margin:5px 0; font-family:var(--font-mono);" id="valAvg">0.0h</div>
                        <div style="margin-top:auto; width:100%;">
                            <div class="ring-lbl" style="margin-bottom:5px; display:flex; justify-content:space-between;">
                                <span>Urlaubstage</span>
                                <span id="valVacationUsed">0 / 30</span>
                            </div>
                            <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px;"><div id="vacationProgressBar" style="width:0%; background:var(--success); height:100%;"></div></div>
                        </div>
                    </div>
                </div>
            `
        },
        'quick-actions': {
            name: 'Schnellaktionen',
            description: 'Direkter Zugriff auf häufige Aktionen',
            icon: '⚡',
            defaultEnabled: true,
            html: `
                <div class="quick-actions" id="cmdBar">
                    <button onclick="openSaldoAdjust()">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M3 6h18M3 18h18"/></svg></span>
                        <span class="cmd-label">Saldo</span>
                    </button>
                    <div class="cmd-sep"></div>
                    <button onclick="checkAndBookHolidays()" id="cmdHolidayCheck">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M14.5 2c1.4 0 2.5 1.1 2.5 2.5S15.9 7 14.5 7 12 5.9 12 4.5 13.1 2 14.5 2z"/><path d="M18 14l-4-4-4 4"/><path d="M6 22V9"/><path d="M18 22V9"/><path d="M2 22h20"/></svg></span>
                        <span class="cmd-label">Feiertage</span>
                    </button>
                    <button class="nfc-cmd-btn" disabled>
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 018 4"/><path d="M5 19.5C5.5 18 6 15 6 12"/><path d="M21 12c0 1.5-.5 3-1.5 4.5"/><path d="M12 2c2 2 3 5 3 10"/><path d="M12 2c-2 2-3 5-3 10"/><path d="M18 22l4-4-4-4"/><path d="M22 18h-7"/></svg></span>
                        <span class="cmd-label">NFC</span>
                        <span class="nfc-new-badge">NEU</span>
                    </button>
                    <button onclick="window.location.href='/berichtsheft/'">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                        <span class="cmd-label">Berichtsheft</span>
                    </button>
                    <div class="cmd-sep"></div>
                    <button onclick="openSettings()">
                        <span class="cmd-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></span>
                        <span class="cmd-label">Settings</span>
                    </button>
                </div>
            `
        },

        'charts': {
            name: 'Diagramme',
            description: 'Saldo-Trend und Arbeitszeit-Verteilung',
            icon: '📈',
            defaultEnabled: true,
            html: `
                <div class="charts-row">
                    <div class="card">
                        <div class="chart-header">
                            <div>
                                <div class="chart-title">Saldo Trend</div>
                                <div class="chart-sub">Entwicklung der letzten 30 Tage</div>
                            </div>
                        </div>
                        <div class="trend-container" id="trendChart"></div>
                    </div>
                    <div class="card">
                        <div class="chart-header">
                            <div class="chart-title">Verteilung</div>
                        </div>
                        <div class="donut-container">
                            <svg width="150" height="150" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="12"></circle>
                                <circle id="donutSick" cx="50" cy="50" r="40" fill="transparent" stroke="var(--danger)" stroke-width="12" stroke-dasharray="0 251"></circle>
                                <circle id="donutVac" cx="50" cy="50" r="40" fill="transparent" stroke="var(--success)" stroke-width="12" stroke-dasharray="0 251"></circle>
                                <circle id="donutSchool" cx="50" cy="50" r="40" fill="transparent" stroke="var(--school)" stroke-width="12" stroke-dasharray="0 251"></circle>
                            </svg>
                        </div>
                    </div>
                </div>
            `
        },
        'entry-form': {
            name: 'Eingabeformular',
            description: 'Schnelle Zeiteingabe direkt im Dashboard',
            icon: '✏️',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem;">
                    <h4 style="margin:0 0 1rem 0; color:var(--primary); font-size:1rem;">⏱️ Schnelle Eingabe</h4>
                    <form onsubmit="quickAddEntry(event)" style="display:flex; gap:12px; align-items:flex-end;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">Projekt</label>
                            <input type="text" id="quickProject" class="glass-input" placeholder="Projekt..." style="width:100%;" required>
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:0.8rem; color:var(--text-muted); margin-bottom:4px;">Stunden</label>
                            <input type="number" id="quickHours" class="glass-input" placeholder="0.0" step="0.25" min="0" style="width:100%;" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="padding:10px 16px;">➕ Hinzufügen</button>
                    </form>
                </div>
            `
        },
        'last-activities': {
            name: 'Letzte Aktivitäten',
            description: 'Übersicht der letzten Arbeitszeiteinträge',
            icon: '📋',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem;">
                    <h4 style="margin:0 0 1rem 0; color:var(--primary); font-size:1rem;">📋 Letzte Aktivitäten</h4>
                    <div id="lastActivitiesList" style="max-height:200px; overflow-y:auto;">
                        <!-- Wird per JS gefüllt -->
                    </div>
                </div>
            `
        },
        'mood-tracker': {
            name: 'Stimmungs-Tracker',
            description: 'Verfolge deine Stimmung nach Arbeitstagen',
            icon: '😊',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem;">
                    <h4 style="margin:0 0 1rem 0; color:var(--primary); font-size:1rem;">😊 Stimmungs-Tracker</h4>
                    <div id="moodStats" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap:8px; margin-bottom:1rem;">
                        <!-- Wird per JS gefüllt -->
                    </div>
                    <button onclick="openMoodSelector()" class="btn btn-secondary" style="width:100%;">Stimmung hinzufügen</button>
                </div>
            `
        },
        'productivity-score': {
            name: 'Produktivitäts-Score',
            description: 'Persönlicher Produktivitäts-Score basierend auf Mustern',
            icon: '🎯',
            defaultEnabled: false,
            html: `
                <div class="card" style="padding:1.5rem; background:linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 100%); border:1px solid rgba(245,158,11,0.2);">
                    <h4 style="margin:0 0 1rem 0; color:#f59e0b; font-size:1rem;">🎯 Produktivitäts-Score</h4>
                    <div style="text-align:center;">
                        <div style="font-size:3rem; font-weight:800; color:#f59e0b; margin:1rem 0;" id="productivityScoreWidget">--</div>
                        <div style="font-size:0.9rem; color:var(--text-muted);" id="productivityDescription">Berechne deinen Score...</div>
                    </div>
                </div>
            `
        },
        'quick-templates': {
            name: 'Schnelleintrag',
            description: '⚡ 1-Klick Vorlagen für Arbeitstag, Schultag, etc.',
            icon: '⚡',
            defaultEnabled: true,
            html: `
                <div class="card" style="padding:1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                        <div class="chart-title">⚡ Schnelleintrag</div>
                        <span style="font-size:0.7rem; color:var(--text-muted);">1-Klick Vorlagen</span>
                    </div>
                    <div id="quickTemplatesGrid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px;">
                        <!-- filled by JS -->
                    </div>
                </div>
            `
        }
    };

    function openWidgetManager() {
        console.log('Opening widget manager - EXTREME MODE');
        const modal = document.getElementById('widgetManagerModal');
        console.log('Modal element:', modal);

        if (modal) {
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0px !important;
                left: 0px !important;
                width: 100vw !important;
                height: 100vh !important;
                background: rgba(255, 0, 0, 0.95) !important;
                z-index: 2147483647 !important;
                justify-content: center !important;
                align-items: center !important;
                backdrop-filter: blur(10px) !important;
                pointer-events: auto !important;
            `;

            const modalBox = modal.querySelector('.modal-box');
            if (modalBox) {
                modalBox.style.cssText = `
                    display: block !important;
                    position: relative !important;
                    background: white !important;
                    border: 10px solid black !important;
                    border-radius: 20px !important;
                    padding: 50px !important;
                    max-width: 800px !important;
                    max-height: 90vh !important;
                    overflow-y: auto !important;
                    color: black !important;
                    font-size: 18px !important;
                    z-index: 2147483647 !important;
                    box-shadow: 0 0 100px rgba(0,0,0,1) !important;
                    margin: 20px auto !important;
                    width: 90% !important;
                `;
                console.log('Modal box EXTREME styled');
            }

            modal.classList.add('active');
            console.log('Modal classes:', modal.className);
            console.log('Modal computed display:', window.getComputedStyle(modal).display);

            // Force render after a delay
            setTimeout(() => {
                renderWidgetManager();
                console.log('Widget manager rendered with delay');
                
                // Force scroll to top in case modal is outside viewport
                window.scrollTo(0, 0);
                
                // Additional visibility check
                setTimeout(() => {
                    const modalRect = modal.getBoundingClientRect();
                    console.log('Modal position:', modalRect);
                    if (modalRect.top < 0 || modalRect.left < 0) {
                        console.log('Modal is outside viewport, adjusting...');
                        modal.style.top = '10px !important';
                        modal.style.left = '10px !important';
                    }
                }, 200);
            }, 100);

        } else {
            console.error('Widget manager modal not found');
        }
    }

    function closeWidgetManager() {
        const modal = document.getElementById('widgetManagerModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // ============================================
    // WIDGET MANAGER — class-based modal (z-Index ueber Settings)
    // ============================================
    function openNewWidgetManager() {
        const modal = document.getElementById('newWidgetManagerModal');
        if (!modal) { console.error('New widget manager modal not found'); return; }
        modal.classList.add('active');
        // Inline-Style display:none aus dem HTML schlägt die .active-Regel — hier explizit ueberschreiben
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        renderNewWidgetManager();
        // ESC to close
        if (!modal._escHooked) {
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.classList.contains('active')) closeNewWidgetManager();
            });
            modal._escHooked = true;
        }
    }

    function closeNewWidgetManager() {
        const modal = document.getElementById('newWidgetManagerModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function renderNewWidgetManager() {
        const availableContainer = document.getElementById('newAvailableWidgets');
        const currentContainer = document.getElementById('newCurrentWidgets');
        const currentCountEl = document.getElementById('wmCurrentCount');
        const availCountEl = document.getElementById('wmAvailCount');
        if (!availableContainer || !currentContainer) return;

        const dashboardContainer = document.getElementById('dashboardContainer');
        const items = dashboardContainer ? Array.from(dashboardContainer.querySelectorAll('.dashboard-item')) : [];
        items.sort((a, b) => (parseInt(a.style.order) || 0) - (parseInt(b.style.order) || 0));
        const currentWidgets = items.map(el => el.getAttribute('data-item-id')).filter(Boolean);
        const isPinned = (id) => (typeof isWidgetPinned === 'function') ? isWidgetPinned(id) : false;
        const iconFor = (id) => (typeof getWidgetIconSvg === 'function') ? getWidgetIconSvg(id) : '';

        // Aktive Widgets
        currentContainer.innerHTML = '';
        if (currentWidgets.length === 0) {
            currentContainer.innerHTML = '<div class="wm-empty">Kein Widget aktiv — fuege unten eines hinzu.</div>';
        }
        currentWidgets.forEach((widgetId, idx) => {
            const widget = widgetLibrary[widgetId];
            if (!widget) return;
            const card = document.createElement('div');
            card.className = 'wm-item' + (isPinned(widgetId) ? ' wm-item-pinned' : '');
            const upDisabled = idx === 0 ? ' disabled' : '';
            const downDisabled = idx === currentWidgets.length - 1 ? ' disabled' : '';
            card.innerHTML = `
                <div class="wm-item-icon">${iconFor(widgetId)}</div>
                <div class="wm-item-info">
                    <div class="wm-item-name">${widget.name}${isPinned(widgetId) ? ' <span class="wm-pin-tag" title="gepinnt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-1.5-3.5a2 2 0 0 1-.5-1.3V8a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4.2a2 2 0 0 1-.5 1.3L5 17z"/></svg></span>' : ''}</div>
                    <div class="wm-item-desc">${widget.description}</div>
                </div>
                <div class="wm-item-actions">
                    <button class="wm-icon-btn" title="Hoch" data-wm-up="${widgetId}"${upDisabled}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button class="wm-icon-btn" title="Runter" data-wm-down="${widgetId}"${downDisabled}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button class="wm-icon-btn ${isPinned(widgetId) ? 'wm-pin-active' : ''}" title="${isPinned(widgetId) ? 'Pin lösen' : 'Anpinnen'}" data-wm-pin="${widgetId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-1.5-3.5a2 2 0 0 1-.5-1.3V8a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4.2a2 2 0 0 1-.5 1.3L5 17z"/></svg>
                    </button>
                    <button class="wm-icon-btn wm-danger" title="Entfernen" data-wm-remove="${widgetId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                </div>
            `;
            currentContainer.appendChild(card);
        });

        // Verfuegbare Widgets
        availableContainer.innerHTML = '';
        const available = Object.keys(widgetLibrary).filter(id => !currentWidgets.includes(id));
        if (available.length === 0) {
            availableContainer.innerHTML = '<div class="wm-empty">Alle verfuegbaren Widgets sind bereits aktiv.</div>';
        }
        available.forEach(widgetId => {
            const widget = widgetLibrary[widgetId];
            const card = document.createElement('div');
            card.className = 'wm-item wm-item-available';
            card.innerHTML = `
                <div class="wm-item-icon">${iconFor(widgetId)}</div>
                <div class="wm-item-info">
                    <div class="wm-item-name">${widget.name}</div>
                    <div class="wm-item-desc">${widget.description}</div>
                </div>
                <div class="wm-item-actions">
                    <button class="wm-add-btn" data-wm-add="${widgetId}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>Hinzufügen</span>
                    </button>
                </div>
            `;
            availableContainer.appendChild(card);
        });

        // Counts
        if (currentCountEl) currentCountEl.textContent = currentWidgets.length;
        if (availCountEl) availCountEl.textContent = available.length;

        // Wire actions via delegation
        const wireBtn = (selector, handler) => {
            (currentContainer.querySelectorAll(selector) || []).forEach(btn => {
                btn.onclick = (e) => { e.stopPropagation(); handler(btn.getAttribute(selector.match(/data-wm-\w+/)[0].slice(1))); };
            });
            (availableContainer.querySelectorAll(selector) || []).forEach(btn => {
                btn.onclick = (e) => { e.stopPropagation(); handler(btn.getAttribute(selector.match(/data-wm-\w+/)[0].slice(1))); };
            });
        };
        currentContainer.querySelectorAll('[data-wm-up]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); if (!btn.disabled) { moveDashboardWidget(btn.getAttribute('data-wm-up'), 'up'); renderNewWidgetManager(); } };
        });
        currentContainer.querySelectorAll('[data-wm-down]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); if (!btn.disabled) { moveDashboardWidget(btn.getAttribute('data-wm-down'), 'down'); renderNewWidgetManager(); } };
        });
        currentContainer.querySelectorAll('[data-wm-pin]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); if (typeof togglePinWidget === 'function') { togglePinWidget(btn.getAttribute('data-wm-pin')); renderNewWidgetManager(); } };
        });
        currentContainer.querySelectorAll('[data-wm-remove]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); removeWidget(btn.getAttribute('data-wm-remove')); renderNewWidgetManager(); };
        });
        availableContainer.querySelectorAll('[data-wm-add]').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); addWidget(btn.getAttribute('data-wm-add')); renderNewWidgetManager(); };
        });
    }

    function addRandomWidget() {
        const available = Object.keys(widgetLibrary).filter(id => {
            const dc = document.getElementById('dashboardContainer');
            if (!dc) return true;
            return !dc.querySelector(`[data-item-id="${id}"]`);
        });
        if (available.length === 0) {
            if (typeof showCustomMessage === 'function') showCustomMessage('Alles aktiv', 'Alle Widgets sind schon im Dashboard.', 'info');
            return;
        }
        const pick = available[Math.floor(Math.random() * available.length)];
        addWidget(pick);
        renderNewWidgetManager();
    }

    function getCurrentDashboardWidgets() {
        const dashboardContainer = document.getElementById('dashboardContainer');
        const currentWidgets = [];
        if (dashboardContainer) {
            const widgetElements = dashboardContainer.querySelectorAll('.dashboard-item');
            widgetElements.forEach(el => {
                const widgetId = el.getAttribute('data-item-id');
                if (widgetId && widgetLibrary[widgetId]) {
                    currentWidgets.push({
                        id: widgetId,
                        name: widgetLibrary[widgetId].name,
                        icon: widgetLibrary[widgetId].icon || '📦'
                    });
                }
            });
        }
        return currentWidgets;
    }

    // Alias for updateDashboard calls
    function updateDashboard() {
        updateUI();
        // Initialize advanced chart effects
        setTimeout(() => {
            enhanceChartsWithEffects();
            updateCommandBarBadges();
        }, 300);
    }
    
    // Update Command Bar badges with dynamic info
    function updateCommandBarBadges() {
        // === Holiday badge ===
        const holidayBtn = document.getElementById('cmdHolidayCheck');
        if (holidayBtn) {
            const existingBadge = holidayBtn.querySelector('.cmd-badge');
            if (existingBadge) existingBadge.remove();
            
            const bundesland = (data.settings && data.settings.bundesland) || '';
            if (bundesland) {
                const now = new Date();
                const year = now.getFullYear();
                let holidays = getGermanHolidays(year).concat(getGermanHolidays(year + 1));
                const existingDates = data.entries.map(e => e.date);
                const pending = holidays.filter(h => {
                    if (existingDates.includes(h.date)) return false;
                    const dateObj = new Date(h.date);
                    const dayIndex = dateObj.getDay();
                    const expected = data.settings.hours[dayIndex] || 0;
                    return expected > 0 && dateObj.getTime() < now.getTime() + (60 * 86400000);
                });
                if (pending.length > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'cmd-badge';
                    badge.textContent = pending.length;
                    holidayBtn.appendChild(badge);
                }
            }
        }
        
        // === Today badge (worked hours or "offen") ===
        const todayBtn = document.getElementById('cmdToday');
        if (todayBtn) {
            const oldBadge = todayBtn.querySelector('.cmd-badge');
            if (oldBadge) oldBadge.remove();
            
            const todayStr = new Date().toISOString().split('T')[0];
            const todayEntry = data.entries.find(e => e.date === todayStr);
            const badge = document.createElement('span');
            badge.className = 'cmd-badge';
            if (todayEntry && todayEntry.worked > 0) {
                badge.textContent = todayEntry.worked.toFixed(1) + 'h';
                badge.style.background = 'rgba(16, 185, 129, 0.2)';
                badge.style.color = '#10b981';
                todayBtn.onclick = () => quickAddEntry(new Event('click'));
            } else {
                badge.textContent = 'offen';
                badge.style.background = 'rgba(245, 158, 11, 0.2)';
                badge.style.color = '#f59e0b';
                todayBtn.onclick = () => quickAddEntry(new Event('click'));
            }
            todayBtn.appendChild(badge);
        }
        
        // === Streak badge ===
        const streakBtn = document.getElementById('cmdStreak');
        if (streakBtn) {
            const oldBadge = streakBtn.querySelector('.cmd-badge');
            if (oldBadge) oldBadge.remove();
            
            // Calculate current streak
            let streak = 0;
            const now = new Date();
            for (let i = 0; i < 365; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                const dayIdx = d.getDay();
                const expected = (data.settings.hours && data.settings.hours[dayIdx]) || 0;
                if (expected === 0) continue; // Skip non-work days
                const entry = data.entries.find(e => e.date === dateStr);
                if (entry && entry.worked > 0) {
                    streak++;
                } else {
                    break;
                }
            }
            
            if (streak > 0) {
                const badge = document.createElement('span');
                badge.className = 'cmd-badge';
                badge.textContent = streak + 'd';
                badge.style.background = streak >= 7 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(var(--primary-rgb), 0.18)';
                badge.style.color = streak >= 7 ? '#ef4444' : 'var(--primary)';
                streakBtn.appendChild(badge);
            }
            streakBtn.onclick = () => { /* scroll to streak info or show toast */ 
                const streakEl = document.getElementById('streakCount');
                if (streakEl) streakEl.closest('.card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
        }
    }
