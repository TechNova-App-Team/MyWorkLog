// ═══ CORE: NAVBAR-SIDEBAR ═══
    // ===== NAVBAR CUSTOMIZATION: render based on settings and allow drag/drop =====
    function renderNavbar() {
        const nav = document.getElementById('mainNav');
        if (!nav) return;

        // Ensure settings.nav exists
        if (!Array.isArray(data.settings.nav)) {
            // Default nav items (id, label, icon, visible)
            data.settings.nav = [
                {id:'dashboard', label:'Dashboard', icon:'🏠', visible:true},
                {id:'newEntry', label:'Neu', icon:'➕', visible:true},
                {id:'widgets', label:'Widgets', icon:'📦', visible:true},
                {id:'settings', label:'Einstellungen', icon:'⚙️', visible:true}
            ];
            save();
        }

        nav.innerHTML = '';
        data.settings.nav.forEach(item => {
            if (!item.visible) return;
            const a = document.createElement('a');
            a.className = 'nav-item';
            a.setAttribute('draggable', 'true');
            a.dataset.navId = item.id;
            a.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;

            // Drag handlers
            a.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/nav-id', item.id);
                a.classList.add('dragging');
            });
            a.addEventListener('dragend', () => {
                a.classList.remove('dragging');
            });

            // Click behavior (map known ids to actions)
            a.onclick = () => {
                if (item.id === 'settings') openSettings();
                else if (item.id === 'dashboard') updateDashboard();
                else if (item.id === 'newEntry') openNewEntryModal && openNewEntryModal();
                else console.log('Nav click:', item);
            };

            nav.appendChild(a);
        });

        // Allow drop reordering on nav container
        nav.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterEl = getDragAfterElement(nav, e.clientX);
            const dragging = nav.querySelector('.dragging');
            if (!dragging) return;
            if (!afterEl) nav.appendChild(dragging);
            else nav.insertBefore(dragging, afterEl);
        });

        nav.addEventListener('drop', (e) => {
            e.preventDefault();
            // Reconstruct data.settings.nav order from DOM
            const newOrder = [];
            nav.querySelectorAll('.nav-item').forEach(el => {
                const id = el.dataset.navId;
                const item = data.settings.nav.find(i => i.id === id);
                if (item) newOrder.push(item);
            });
            data.settings.nav = newOrder.concat(data.settings.nav.filter(i => !newOrder.find(n => n.id === i.id)));
            save();
            renderNavbar();
        });
    }

    function getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.nav-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function renderWidgetManager() {
        console.log('Rendering widget manager');

        try {
            const availableContainer = document.getElementById('availableWidgets') || document.getElementById('newAvailableWidgets') || document.querySelector('#settings-tab-widgets #availableWidgets') || document.querySelector('#settings-tab-widgets #newAvailableWidgets');
            const currentContainer = document.getElementById('currentWidgets') || document.getElementById('newCurrentWidgets') || document.querySelector('#settings-tab-widgets #currentWidgets') || document.querySelector('#settings-tab-widgets #newCurrentWidgets');

            console.log('Containers:', availableContainer, currentContainer);

            if (!availableContainer || !currentContainer) {
                console.error('Widget manager containers not found');
                return;
            }

            // Get current dashboard widgets
            const dashboardContainer = document.getElementById('dashboardContainer');
            const currentWidgets = dashboardContainer ? Array.from(dashboardContainer.querySelectorAll('.dashboard-item')).map(item =>
                item.getAttribute('data-item-id')
            ).filter(Boolean) : [];

            console.log('Current widgets:', currentWidgets);

            // Available widgets (not currently on dashboard)
            availableContainer.innerHTML = '';
            availableContainer.style.cssText = '';
            Object.keys(widgetLibrary).forEach(widgetId => {
                if (!currentWidgets.includes(widgetId)) {
                    const widget = widgetLibrary[widgetId];
                    console.log('Adding available widget:', widgetId);
                    const widgetCard = document.createElement('div');
                    widgetCard.className = 'card';
                    widgetCard.style.cssText = 'padding:16px; cursor:pointer; transition: all 0.2s;';
                    widgetCard.onclick = () => addWidget(widgetId);
                    widgetCard.innerHTML = `
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                            <span style="font-size:1.5rem;">${widget.icon}</span>
                            <div>
                                <div style="font-weight:600; color:var(--text-main);">${widget.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${widget.description}</div>
                            </div>
                        </div>
                        <button class="btn btn-ghost" style="width:100%; padding:8px;" onclick="console.log('Add widget clicked:', '${widgetId}'); event.stopPropagation(); addWidget('${widgetId}')">➕ Hinzufügen</button>
                    `;
                    availableContainer.appendChild(widgetCard);
                }
            });

            // Current widgets
            currentContainer.innerHTML = '';
            currentWidgets.forEach(widgetId => {
                const widget = widgetLibrary[widgetId];
                if (widget) {
                    console.log('Adding current widget:', widgetId);
                    const widgetCard = document.createElement('div');
                    widgetCard.className = 'card';
                    widgetCard.style.cssText = 'padding:16px; border:1px solid rgba(255,255,255,0.02);';
                    widgetCard.innerHTML = `
                        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                            <span style="font-size:1.5rem;">${widget.icon}</span>
                            <div style="flex:1;">
                                <div style="font-weight:600; color:var(--text-main);">${widget.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${widget.description}</div>
                            </div>
                            <button class="btn btn-ghost" style="padding:6px;" onclick="removeWidget('${widgetId}')" title="Entfernen">🗑️</button>
                        </div>
                    `;
                    currentContainer.appendChild(widgetCard);
                }
            });

            console.log('Widget manager rendered successfully');
        } catch (e) {
            console.error('Error rendering widget manager:', e);
        }
    }

    // ===== SIDEBAR NAV & CUSTOMIZATION =====
    function renderSidebarNav() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const navList = document.getElementById('sidebarNavList');
        if (!navList) return;

        // Default nav items - RICHTIG SORTIERT nach Benutzervorgabe
        const defaultNavItems = [
            {id:'dashboard', label:'Dashboard', icon:'📈', visible:true},
            {id:'performance', label:'Performance', icon:'📊', visible:true},
            {id:'history', label:'Verlauf', icon:'📉', visible:true},
            {id:'fahrtkosten', label:'Fahrtkosten', icon:'🚗', visible:true, external:'./Pages/App/fahrtkosten.html'},
            {id:'yearview', label:'Jahresansicht', icon:'📅', visible:true},
            {id:'monthcompare', label:'Monatsansicht', icon:'📊', visible:true},
            {id:'weekview', label:'Wochenansicht', icon:'📆', visible:true},
            {id:'school', label:'Berufsschule', icon:'🏫', visible:true},
            {id:'ihk', label:'IHK', icon:'🎓', visible:true},
            {id:'goals', label:'Ziele', icon:'🎯', visible:true},
            {id:'analytics-pro', label:'Analytics Pro', icon:'📊', visible:true},
        ];

        // Nav-Version: bei Änderung der Reihenfolge/Items hochzählen → erzwingt Reset
        const NAV_VERSION = 3;
        const navNeedsReset = !Array.isArray(data.settings.nav) || data.settings.navVersion !== NAV_VERSION;
        if (navNeedsReset) {
            // Bestehende visibility-Einstellungen übernehmen, aber neue Reihenfolge erzwingen
            const oldNav = Array.isArray(data.settings.nav) ? data.settings.nav : [];
            data.settings.nav = defaultNavItems.map(item => {
                const existing = oldNav.find(o => o.id === item.id);
                return existing ? { ...item, visible: existing.visible } : item;
            });
            data.settings.navVersion = NAV_VERSION;
            save();
        } else {
            // Entferne alte/entfernte Nav-Einträge und füge fehlende hinzu
            const allowedNavIds = defaultNavItems.map(item => item.id);
            const filteredNav = data.settings.nav.filter(item => allowedNavIds.includes(item.id));
            let changed = filteredNav.length !== data.settings.nav.length;
            data.settings.nav = filteredNav;
            defaultNavItems.forEach(defaultItem => {
                if (!data.settings.nav.find(item => item.id === defaultItem.id)) {
                    data.settings.nav.push(defaultItem);
                    changed = true;
                }
            });
            if (changed) {
                data.settings.navVersion = NAV_VERSION;
                save();
            }
        }

        navList.innerHTML = '';
        data.settings.nav.forEach(item => {
            const el = document.createElement('div');
            el.className = 'nav-item';
            el.draggable = true;
            el.dataset.navId = item.id;
            el.innerHTML = `<span class="nav-icon">${item.icon}</span> <span class="nav-label">${item.label}</span>`;
            if (!item.visible) el.style.opacity = '0.4';

            el.addEventListener('click', () => {
                if (item.external) { window.location.href = item.external; return; }
                switchTab(item.id);
            });

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/nav-id', item.id);
                el.classList.add('dragging');
            });
            el.addEventListener('dragend', () => el.classList.remove('dragging'));

            navList.appendChild(el);
        });

        // Allow reordering
        navList.addEventListener('dragover', e => {
            e.preventDefault();
            const afterEl = getDragAfterElementVertical(navList, e.clientY);
            const dragging = navList.querySelector('.dragging');
            if (!dragging) return;
            if (!afterEl) navList.appendChild(dragging);
            else navList.insertBefore(dragging, afterEl);
        });

        navList.addEventListener('drop', () => {
            // Save new order
            const newOrder = [];
            navList.querySelectorAll('.nav-item').forEach(node => {
                const id = node.dataset.navId;
                const item = data.settings.nav.find(i => i.id === id);
                if (item) newOrder.push(item);
            });
            data.settings.nav = newOrder.concat(data.settings.nav.filter(i => !newOrder.find(n=>n.id===i.id)));
            save();
            renderSidebarNav();
        });
    }

    function getDragAfterElementVertical(container, y) {
        // Generic: use direct children and ignore the one being dragged
        const draggableElements = Array.from(container.children).filter(child => !child.classList.contains('dragging'));
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

    // ===== SIDEBAR COLLAPSIBLE SECTIONS =====
    function toggleNavSection(sectionEl) {
        const sectionName = sectionEl.dataset.section;
        if (!sectionName) return;
        const group = document.querySelector(`.nav-section-group[data-group="${sectionName}"]`);
        if (!group) return;
        
        const isCollapsed = sectionEl.classList.toggle('collapsed');
        group.classList.toggle('collapsed', isCollapsed);
        
        // Save state
        try {
            const states = JSON.parse(localStorage.getItem('sidebar_sections') || '{}');
            states[sectionName] = !isCollapsed;
            localStorage.setItem('sidebar_sections', JSON.stringify(states));
        } catch(e) {}
    }

    // Restore collapsed states on load
    (function restoreSidebarSections() {
        try {
            const states = JSON.parse(localStorage.getItem('sidebar_sections') || '{}');
            Object.keys(states).forEach(name => {
                if (!states[name]) {
                    const sec = document.querySelector(`.nav-section[data-section="${name}"]`);
                    const grp = document.querySelector(`.nav-section-group[data-group="${name}"]`);
                    if (sec) sec.classList.add('collapsed');
                    if (grp) grp.classList.add('collapsed');
                }
            });
        } catch(e) {}
    })();

    // ===== SIDEBAR INTERACTIONS — Hover beam + Scroll fade =====
    (function initSidebarInteractions() {
        const sidebar = document.getElementById('sidebar');
        const beam = document.getElementById('sidebarHoverBeam');
        const scrollEl = document.querySelector('.sidebar-scroll');
        const wrapper = document.querySelector('.sidebar-scroll-wrapper');
        
        // Mouse-tracking hover beam
        if (sidebar && beam) {
            sidebar.addEventListener('mousemove', (e) => {
                const rect = sidebar.getBoundingClientRect();
                beam.style.top = (e.clientY - rect.top - 22) + 'px';
            });
            sidebar.addEventListener('mouseleave', () => {
                beam.style.opacity = '0';
            });
        }
        
        // Top scroll fade
        if (scrollEl && wrapper) {
            scrollEl.addEventListener('scroll', () => {
                if (scrollEl.scrollTop > 8) {
                    wrapper.classList.add('scrolled-top');
                } else {
                    wrapper.classList.remove('scrolled-top');
                }
            }, { passive: true });
        }

        // Initial avatar set (will be updated again after data loads)
        updateSidebarAvatar();

        // Sync sidebar footer with network status
        const sidebarNetLabel = document.getElementById('sidebarNetLabel');
        const avatarDot = document.getElementById('sidebarAvatar');
        if (sidebarNetLabel) {
            function updateSidebarNet() {
                const online = navigator.onLine;
                sidebarNetLabel.textContent = online ? '© MyWorkLog — Online' : '© MyWorkLog — Offline';
                if (avatarDot) {
                    const dot = avatarDot.querySelector('::after') || avatarDot;
                    avatarDot.style.setProperty('--avatar-dot-color', online ? '#22c55e' : '#ef4444');
                }
            }
            updateSidebarNet();
            window.addEventListener('online', updateSidebarNet);
            window.addEventListener('offline', updateSidebarNet);
        }
    })();

    // ===== SIDEBAR AVATAR HELPER =====
    function updateSidebarAvatar() {
        try {
            const avatarEl = document.getElementById('sidebarAvatar');
            if (!avatarEl) return;
            const name = (typeof data !== 'undefined' && data.settings && data.settings.name) ? data.settings.name : '';
            if (name) {
                const parts = name.trim().split(/\s+/);
                const initials = parts.length >= 2 
                    ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
                    : name.substring(0, 2).toUpperCase();
                avatarEl.textContent = initials;
            }
        } catch(e) {}
    }
    // Close popover when clicking outside
    document.addEventListener('click', function(e) {
        const popover = document.getElementById('profilePopover');
        const footer = document.getElementById('sidebarFooter');
        if (popover && popover.classList.contains('active')) {
            if (!footer || !footer.contains(e.target)) {
                closeProfilePopover();
            }
        }
    });

    // Close popover on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeProfilePopover();
    });

    // ===== COMMAND PALETTE (Ctrl+K / ⌘K) =====
    const CMD_PALETTE_ITEMS = [
        // Navigation
        { id: 'dashboard',    label: 'Dashboard',         icon: '📈', group: 'Navigation', action: () => switchTab('dashboard') },
        { id: 'performance',  label: 'Performance',       icon: '📊', group: 'Navigation', action: () => switchTab('performance') },
        { id: 'history',      label: 'Verlauf',           icon: '📉', group: 'Navigation', action: () => switchTab('history') },
        { id: 'yearview',     label: 'Jahresansicht',     icon: '📅', group: 'Navigation', action: () => switchTab('yearview') },
        { id: 'monthcompare', label: 'Monatvergleich',    icon: '📊', group: 'Navigation', action: () => switchTab('monthcompare') },
        { id: 'weekview',     label: 'Wochenansicht',     icon: '📆', group: 'Navigation', action: () => switchTab('weekview') },
        { id: 'school',       label: 'Berufsschule',      icon: '🏫', group: 'Navigation', action: () => switchTab('school') },
        { id: 'aibot',        label: 'AI-Bot',            icon: '🤖', group: 'Navigation', action: () => switchTab('aibot') },
        { id: 'support',      label: 'Unterstützung',     icon: '☕', group: 'Navigation', action: () => switchTab('support') },
        { id: 'analytics-pro', label: 'Analytics Pro',     icon: '📊', group: 'Navigation', action: () => switchTab('analytics-pro') },
        // Tools
        { id: 'settings',     label: 'Einstellungen',     icon: '⚙️', group: 'Tools',      action: () => openSettings() },
        { id: 'alerts',       label: 'Alerts',            icon: '🔔', group: 'Tools',      action: () => toggleAlertsPanel() },
        { id: 'backup',       label: 'Backup / Export',   icon: '💾', group: 'Tools',      action: () => showExportMenu() },
        { id: 'import',       label: 'Import',            icon: '📥', group: 'Tools',      action: () => showBackupMenu() },
        { id: 'onboarding',   label: 'Anleitung / Tour',  icon: '🧭', group: 'Tools',      action: () => startOnboardingTour() },
        { id: 'untis',        label: 'Untis Import',      icon: '📚', group: 'Tools',      action: () => showUntisImportModal() },
        // Extern
        { id: 'berichtsheft', label: 'Berichtsheft',      icon: '📋', group: 'Extern',     action: () => { window.location.href = './Pages/App/berichtsheft.html'; } },
        { id: 'aufgaben',     label: 'Aufgaben Manager', icon: '✅', group: 'Extern',     action: () => { window.location.href = './Pages/App/Tasks/aufgaben.html'; } },
        { id: 'skilltree',    label: 'Skill-Baum',       icon: '🌳', group: 'Extern',     action: () => { window.location.href = './Pages/App/SkillTree/skill-tree.html'; } },
        { id: 'ausbildung',   label: 'Ausbildungshilfe',  icon: '🎓', group: 'Extern',     action: () => { window.location.href = './Pages/App/Ausbilungs_Hilfe/index.html'; } },
        { id: 'vertrag',      label: 'Vertrags-Manager',  icon: '💼', group: 'Extern',     action: () => { window.location.href = './Pages/App/vertrags-manager.html'; } },
        { id: 'repo',         label: 'Repo-Analyse',      icon: '🔥', group: 'Extern',     action: () => window.open('Pages/Info/repo-report.html', '_blank') },
        { id: 'analytics',    label: 'Analytics',         icon: '📊', group: 'Extern',     action: () => window.open('./Pages/Info/analytics.html', '_blank') },
        { id: 'impressum',    label: 'Impressum',         icon: '📄', group: 'Extern',     action: () => window.open('./Pages/DE-Gestz/Impressum.html', '_blank') },
        { id: 'dsgvo',        label: 'DSGVO',             icon: '🔒', group: 'Extern',     action: () => window.open('./Pages/DE-Gestz/DSGVO.html', '_blank') },
        { id: 'about',        label: 'About',             icon: '💡', group: 'Extern',     action: () => window.open('./Pages/Info/about.html', '_blank') },
        // Ghost Mode
        { id: 'ghost',        label: 'Ghost Mode 👻',     icon: '👻', group: 'Tools',      action: () => toggleGhostMode() },
    ];

    let cmdSelectedIdx = 0;
    let cmdFilteredItems = [...CMD_PALETTE_ITEMS];
    function renderCmdResults(query) {
        const container = document.getElementById('cmdPaletteResults');
        const q = query.toLowerCase().trim();

        cmdFilteredItems = q
            ? CMD_PALETTE_ITEMS.filter(item =>
                item.label.toLowerCase().includes(q) ||
                item.group.toLowerCase().includes(q) ||
                item.id.toLowerCase().includes(q))
            : [...CMD_PALETTE_ITEMS];

        if (cmdSelectedIdx >= cmdFilteredItems.length) cmdSelectedIdx = Math.max(0, cmdFilteredItems.length - 1);

        if (!cmdFilteredItems.length) {
            container.innerHTML = '<div class="cmd-palette-empty">Keine Treffer gefunden</div>';
            return;
        }

        let html = '';
        let lastGroup = '';
        cmdFilteredItems.forEach((item, i) => {
            if (item.group !== lastGroup) {
                html += `<div class="cmd-palette-group-label">${item.group}</div>`;
                lastGroup = item.group;
            }
            html += `<div class="cmd-palette-item${i === cmdSelectedIdx ? ' selected' : ''}" data-idx="${i}" onmouseenter="cmdHover(${i})" onclick="cmdSelect(${i})">
                <div class="cpi-icon">${item.icon}</div>
                <span>${item.label}</span>
            </div>`;
        });
        container.innerHTML = html;

        // Scroll selected item into view
        const sel = container.querySelector('.cmd-palette-item.selected');
        if (sel) sel.scrollIntoView({ block: 'nearest' });
    }

    function cmdHover(idx) {
        cmdSelectedIdx = idx;
        const items = document.querySelectorAll('.cmd-palette-item');
        items.forEach((el, i) => el.classList.toggle('selected', i === idx));
    }

    function cmdSelect(idx) {
        const item = cmdFilteredItems[idx];
        if (item && item.action) {
            closeCmdPalette();
            item.action();
        }
    }

    // Input handler — attach directly (DOM elements already exist above this script)
    (function initCmdPaletteHandlers() {
        const input = document.getElementById('cmdPaletteInput');
        if (input) {
            input.addEventListener('input', () => renderCmdResults(input.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    cmdSelectedIdx = Math.min(cmdSelectedIdx + 1, cmdFilteredItems.length - 1);
                    renderCmdResults(input.value);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    cmdSelectedIdx = Math.max(cmdSelectedIdx - 1, 0);
                    renderCmdResults(input.value);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    cmdSelect(cmdSelectedIdx);
                } else if (e.key === 'Escape') {
                    closeCmdPalette();
                }
            });
        }

        // Click overlay to close
        const overlay = document.getElementById('cmdPalette');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeCmdPalette();
            });
        }
    })();

    // Global Ctrl+K / ⌘K shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const overlay = document.getElementById('cmdPalette');
            if (overlay.classList.contains('open')) {
                closeCmdPalette();
            } else {
                openCmdPalette();
            }
        }
    });
