// ═══ CORE: WIDGET-SYSTEM ═══
    // ===== WIDGET DRAG & DROP (REORDER) =====
    // Tracks whether the dashboard layout has unsaved changes while in edit mode
    let dashboardLayoutDirty = false;

    function enableWidgetDragDrop() {
        const dashboard = document.getElementById('dashboardContainer');
        if (!dashboard) return;

        dashboard.querySelectorAll('.dashboard-item').forEach(item => {
            item.draggable = true;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/widget-id', item.getAttribute('data-item-id'));
                item.classList.add('dragging');
            });
            item.addEventListener('dragend', () => item.classList.remove('dragging'));
        });

        dashboard.addEventListener('dragover', e => {
            e.preventDefault();
            const afterEl = getDragAfterElementVertical(dashboard, e.clientY);
            const dragging = dashboard.querySelector('.dragging');
            if (!dragging) return;
            if (!afterEl) dashboard.appendChild(dragging);
            else dashboard.insertBefore(dragging, afterEl);
        });

        dashboard.addEventListener('drop', () => {
            // Mark layout as dirty and show a subtle status instead of a toast for every drop
            dashboardLayoutDirty = true;
            const statusEl = document.getElementById('editModeStatus');
            if (statusEl) {
                statusEl.textContent = '📍 Layout geändert (nicht gespeichert)';
                statusEl.style.opacity = '1';
            }
            // Do NOT auto-save here to avoid noisy toasts – saving happens when exiting edit mode
        });
    }

    function saveWidgetLayout(notify = true) {
        const dashboard = document.getElementById('dashboardContainer');
        if (!dashboard) return;
        const order = [];
        dashboard.querySelectorAll('.dashboard-item').forEach(el => {
            const id = el.getAttribute('data-item-id');
            if (id) order.push(id);
        });
        data.settings.widgetLayout = order;
        // Also keep legacy dashboard layout in localStorage for compatibility
        localStorage.setItem('tt_dashboard_layout', JSON.stringify(order));
        save();
        // Clear dirty flag and reset status text
        dashboardLayoutDirty = false;
        const statusEl = document.getElementById('editModeStatus');
        if (statusEl) { statusEl.textContent = '📍 Layout-Bearbeitungsmodus AKTIV'; statusEl.style.opacity = '1'; }
        if (notify) showCustomMessage('✅ Layout gespeichert', 'Widget Reihenfolge gespeichert', 'success');
    }

    function applyWidgetLayout() {
        const dashboard = document.getElementById('dashboardContainer');
        if (!dashboard || !Array.isArray(data.settings.widgetLayout)) return;
        const desired = data.settings.widgetLayout;
        const mapping = {};
        dashboard.querySelectorAll('.dashboard-item').forEach(el => mapping[el.getAttribute('data-item-id')] = el);
        desired.forEach(id => {
            if (mapping[id]) dashboard.appendChild(mapping[id]);
        });
    }

    // Render nav editor inside Settings -> Custom
    function renderNavEditor() {
        const container = document.getElementById('settings-tab-custom');
        if (!container) return;
        const editorRoot = document.createElement('div');
        editorRoot.style.marginTop = '12px';
        editorRoot.innerHTML = `<h4 style="color:var(--primary);">🔧 Navbar anpassen</h4><div id="navEditorList" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div><div style="display:flex; gap:8px; margin-top:12px;"><button class="btn btn-primary" id="saveNavEditor">Speichern</button><button class="btn" id="resetNavEditor">Zurücksetzen</button></div>`;

        // Remove previous editor content if present
        const old = container.querySelector('#navEditorWrapper');
        if (old) old.remove();
        editorRoot.id = 'navEditorWrapper';

        container.prepend(editorRoot);

        const list = editorRoot.querySelector('#navEditorList');
        list.innerHTML = '';
        data.settings.nav.forEach(item => {
            const row = document.createElement('div');
            row.className = 'nav-editor-row';
            row.draggable = true;
            row.dataset.navId = item.id;
            row.style.display = 'flex';
            row.style.gap = '8px';
            row.style.alignItems = 'center';

            row.innerHTML = `<span style="cursor:grab;">☰</span><input style="flex:1;" class="glass-input" value="${item.label}"><label style="display:flex; gap:8px; align-items:center; margin-left:8px;"><input type="checkbox" ${item.visible ? 'checked' : ''}> Sichtbar</label>`;
            list.appendChild(row);

            // drag handlers
            row.addEventListener('dragstart', (e) => row.classList.add('dragging'));
            row.addEventListener('dragend', () => row.classList.remove('dragging'));
        });

        // reorder in editor
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const after = getDragAfterElementVertical(list, e.clientY);
            const dragging = list.querySelector('.dragging');
            if (!dragging) return;
            if (!after) list.appendChild(dragging);
            else list.insertBefore(dragging, after);
        });

        editorRoot.querySelector('#saveNavEditor').onclick = () => {
            const newNav = [];
            list.querySelectorAll('.nav-editor-row').forEach(row => {
                const id = row.dataset.navId;
                const label = row.querySelector('input').value;
                const visible = row.querySelector('input[type="checkbox"]').checked;
                const item = data.settings.nav.find(i=>i.id===id) || {id, icon:'❔'};
                item.label = label; item.visible = visible;
                newNav.push(item);
            });
            data.settings.nav = newNav;
            save();
            renderSidebarNav();
            showCustomMessage('✅ Gespeichert', 'Navbar aktualisiert', 'success');
        };

        editorRoot.querySelector('#resetNavEditor').onclick = () => {
            if (!confirm('Navbar auf Standard zurücksetzen?')) return;
            data.settings.nav = null; // will reset on next render
            save();
            renderSidebarNav();
            renderNavEditor();
            showCustomMessage('🔁 Zurückgesetzt', 'Navbar zurückgesetzt', 'info');
        };
    }

    // Wire init hooks — moved to run after window.onload to avoid overwriting rehydrated data
    // Initialization will be performed as part of the window.onload sequence.

    function addWidget(widgetId) {
        console.log('Adding widget:', widgetId);
        const widget = widgetLibrary[widgetId];
        if (!widget) {
            console.error('Widget not found in library:', widgetId);
            return;
        }

        const dashboardContainer = document.getElementById('dashboardContainer');
        if (!dashboardContainer) {
            console.error('Dashboard container not found');
            return;
        }

        const widgetElement = document.createElement('div');
        widgetElement.className = 'dashboard-item';
        widgetElement.setAttribute('data-item-id', widgetId);
        widgetElement.innerHTML = widget.html;

        dashboardContainer.appendChild(widgetElement);
        console.log('Widget added to DOM');
        
        saveDashboardLayout();
        renderWidgetManager();
        
        // Initialize the specific widget
        initializeWidget(widgetId);
        
        updateDashboard(); // Refresh data
        console.log('Widget addition complete');
    }

    function removeWidget(widgetId) {
        console.log('Removing widget:', widgetId);
        const dashboardContainer = document.getElementById('dashboardContainer');
        if (!dashboardContainer) {
            console.error('Dashboard container not found');
            return;
        }
        
        const widgetElement = dashboardContainer.querySelector(`[data-item-id="${widgetId}"]`);
        if (widgetElement) {
            widgetElement.remove();
            console.log('Widget removed from DOM');
            saveDashboardLayout();
            renderWidgetManager();
            console.log('Widget removal complete');
        } else {
            console.error('Widget element not found for removal:', widgetId);
        }
    }

    function initializeWidget(widgetId) {
        console.log('Initializing widget:', widgetId);
        
        switch(widgetId) {
            case 'charts':
                // Initialize chart widgets
                setTimeout(() => {
                    if (typeof renderTrend === 'function') renderTrend([], 'trendChart');
                    if (typeof renderDonut === 'function') renderDonut(0, 0, 0, 0, 0);
                    updateDashboard(); // This will call renderTrend and renderDonut again with real data
                }, 100);
                break;
                

                
            case 'last-activities':
                if (typeof updateLastActivities === 'function') updateLastActivities();
                break;
                
            case 'mood-tracker':
                if (typeof updateMoodStats === 'function') updateMoodStats();
                break;
                
            case 'productivity-score':
                if (typeof updateProductivityScore === 'function') updateProductivityScore();
                break;
                
            case 'weekly-goals':
                if (typeof updateWeeklyGoals === 'function') updateWeeklyGoals();
                break;
                
            default:
                console.log('No specific initialization needed for widget:', widgetId);
        }
    }

    function initializeAllWidgets() {
        console.log('Initializing all current widgets');
        const dashboardContainer = document.getElementById('dashboardContainer');
        if (!dashboardContainer) return;
        
        const currentWidgets = Array.from(dashboardContainer.querySelectorAll('.dashboard-item')).map(item => 
            item.getAttribute('data-item-id')
        ).filter(Boolean);
        
        currentWidgets.forEach(widgetId => {
            initializeWidget(widgetId);
        });
    }

    function addWidgetToDashboard() {
        // Open a quick add dialog or just show available widgets
        const availableContainer = document.getElementById('availableWidgets') || document.getElementById('newAvailableWidgets') || document.querySelector('#settings-tab-widgets #availableWidgets') || document.querySelector('#settings-tab-widgets #newAvailableWidgets');
        if (!availableContainer || availableContainer.children.length === 0) {
            showCustomMessage('Alle Widgets hinzugefügt', 'Es sind bereits alle verfügbaren Widgets auf dem Dashboard.', 'info');
            return;
        }
        // Scroll to available widgets
        availableContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function resetAllWidgets() {
        showCustomMessage(
            'Widgets zurücksetzen',
            'Möchtest du wirklich alle Widgets auf die Standard-Konfiguration zurücksetzen?',
            'confirm'
        ).then(confirmed => {
            if (confirmed) {
                // Reset to default widgets
                const dashboardContainer = document.getElementById('dashboardContainer');
                dashboardContainer.innerHTML = '';
                
                // Add default widgets
                const defaultWidgets = ['kpi-cards', 'quick-actions', 'charts'];
                defaultWidgets.forEach(widgetId => {
                    const widget = widgetLibrary[widgetId];
                    if (widget) {
                        const widgetElement = document.createElement('div');
                        widgetElement.className = 'dashboard-item';
                        widgetElement.setAttribute('data-item-id', widgetId);
                        widgetElement.innerHTML = widget.html;
                        dashboardContainer.appendChild(widgetElement);
                    }
                });
                
                localStorage.removeItem('tt_dashboard_layout');
                saveDashboardLayout();
                renderWidgetManager();
                updateDashboard();
            }
        });
    }

    // Quick add entry from dashboard widget
    function quickAddEntry(event) {
        event.preventDefault();
        
        const project = document.getElementById('quickProject').value.trim();
        const hours = parseFloat(document.getElementById('quickHours').value);
        
        if (!project) {
            showCustomMessage('❌ Fehler', 'Bitte gib ein Projekt ein.', 'error');
            return;
        }
        
        if (!hours || hours <= 0) {
            showCustomMessage('❌ Fehler', 'Bitte gib gültige Stunden ein.', 'error');
            return;
        }
        
        // Create entry using handleEntry logic
        const date = new Date().toISOString().split('T')[0];
        const entry = {
            id: Date.now(),
            date: date,
            type: 'work',
            start: '',
            end: '',
            worked: hours,
            expected: data.settings.hours[new Date().getDay()] || 0,
            diff: hours - (data.settings.hours[new Date().getDay()] || 0),
            project: project,
            info: `Dashboard-Eingabe: ${hours}h`,
            breakMinutes: 0,
            shiftStart: '',
            shiftEnd: '',
            shiftWarning: false,
            breakLog: [],
            mood: null,
            created: new Date().toISOString()
        };
        
        data.entries.push(entry);
        save();
        updateDashboard();
        
        // Clear form
        document.getElementById('quickProject').value = '';
        document.getElementById('quickHours').value = '';
        
        showCustomMessage('✅ Eintrag hinzugefügt', `${hours}h für "${project}" wurden erfolgreich eingetragen.`, 'success');
    }

    // Update functions for new widgets
    function updateLastActivities() {
        const container = document.getElementById('lastActivitiesList');
        if (!container) return;

        const recentEntries = data.entries
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        container.innerHTML = recentEntries.length === 0
            ? '<div style="color:var(--text-muted); text-align:center; padding:1rem;">Noch keine Einträge</div>'
            : recentEntries.map(entry => {
                const diffHours = entry.diff !== undefined ? entry.diff : (entry.worked - (data.settings?.hours?.[new Date(entry.date).getDay()] || 0));
                const diffSign = diffHours >= 0 ? '+' : '';
                const diffColor = diffHours > 0 ? '#10b981' : (diffHours < 0 ? '#ef4444' : '#6b7280');
                return `
                    <div style="padding:0.5rem; border-bottom:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:600; color:var(--text-main);">${entry.project || 'Kein Projekt'}</div>
                            <div style="font-weight:600; color:${diffColor}; font-size:0.9rem;">${diffSign}${diffHours.toFixed(1)}h</div>
                        </div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">
                            ${new Date(entry.date).toLocaleDateString('de-DE')} • ${entry.worked.toFixed(1)}h • ${entry.type}
                        </div>
                    </div>
                `;
            }).join('');
    }

    function updateMoodStats() {
        const container = document.getElementById('moodStats');
        if (!container) return;
        
        const moodCounts = {};
        data.entries.forEach(entry => {
            if (entry.mood) {
                moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
            }
        });
        
        const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0);
        container.innerHTML = ['😄', '😊', '🙂', '😐', '😕', '😞', '😠', '🤒', '😴', '🤯'].map(mood => {
            const count = moodCounts[mood] || 0;
            const percentage = totalMoods > 0 ? (count / totalMoods * 100).toFixed(0) : 0;
            return `
                <div style="text-align:center;">
                    <div style="font-size:1.5rem;">${mood}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${count}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${percentage}%</div>
                </div>
            `;
        }).join('');
    }

    function updateProductivityScore() {
        const scoreEl = document.getElementById('productivityScoreWidget');
        const descEl = document.getElementById('productivityDescription');
        if (!scoreEl || !descEl) return;
        
        // Calculate productivity score based on various factors
        const recentEntries = data.entries.filter(e => {
            const entryDate = new Date(e.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return entryDate >= weekAgo && e.type === 'work';
        });
        
        if (recentEntries.length === 0) {
            scoreEl.textContent = '--';
            descEl.textContent = 'Nicht genug Daten für Score-Berechnung';
            return;
        }
        
        // Factors: consistency, average hours, streak maintenance
        const avgHours = recentEntries.reduce((sum, e) => sum + e.worked, 0) / recentEntries.length;
        const consistency = 1 - (recentEntries.reduce((sum, e) => sum + Math.abs(e.worked - avgHours), 0) / recentEntries.length) / avgHours;
        const streakBonus = data.entries.filter(e => e.type === 'work').slice(-10).length / 10;
        
        const score = Math.round((consistency * 40 + streakBonus * 30 + Math.min(avgHours / 8, 1) * 30));
        
        scoreEl.textContent = score;
        descEl.textContent = score >= 80 ? 'Ausgezeichnete Produktivität!' : 
                           score >= 60 ? 'Gute Produktivität' : 
                           score >= 40 ? 'Verbesserungspotenzial' : 'Aufholbedarf';
    }
