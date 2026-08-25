// ═══ CORE: NAVBAR-SIDEBAR ====
    window._clsBC = 'navbar-sidebar.js-start';
    function getIconSvgById(id) {
        const icons = {
            dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h6v8H3z"/><path d="M9 8h6v13H9z"/><path d="M15 3h6v18h-6z"/></svg>',
            performance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h3v4H3z"/><path d="M10 12h3v9h-3z"/><path d="M17 7h3v14h-3z"/></svg>',
            history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
            newEntry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
            widgets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>',
            fahrtkosten: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="9" rx="2"/><path d="M6 16v3"/><path d="M18 16v3"/><path d="M3 11h18"/></svg>',
            yearview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16"/><path d="M10 3v4"/><path d="M14 3v4"/></svg>',
            monthcompare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 5v4"/><path d="M15 5v4"/></svg>',
            weekview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 5v4"/><path d="M16 5v4"/></svg>',
            urlaubsplaner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 21a9 9 0 00-9-9 9 9 0 019-9 9 9 0 019 9 9 9 0 00-9 9z"/><path d="M13 21v-9"/></svg>',
            school: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M4 9v7a8 8 0 0016 0V9"/></svg>',
            ihk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L3 7l9 4 9-4-9-4z"/><path d="M3 7v6c0 5 4 9 9 9s9-4 9-9V7"/></svg>',
            goals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 5v2"/><path d="M12 17v2"/><path d="M5 12h2"/><path d="M17 12h2"/></svg>',
            'analytics-pro': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M8 15v4"/><path d="M12 11v8"/><path d="M16 7v12"/></svg>',
            settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
            alerts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
            onboarding: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M16 8l-8 4 4 4 8-4-4-4z"/></svg>',
            import: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 19h16"/></svg>',
            backup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v6h6"/></svg>',
            untis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V5H6.5A2.5 2.5 0 004 7.5z"/><path d="M20 5v14"/></svg>',
            support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0116 0v3"/><path d="M4 15h1a3 3 0 003 3v-5"/><path d="M20 15h-1a3 3 0 01-3 3v-5"/></svg>',
            'repo-analysis': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M8 15v4"/><path d="M12 11v8"/><path d="M16 7v12"/></svg>',
            report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M9 7h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>',
            archflow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l-4-4 4-4"/><path d="M17 7l4 4-4 4"/><path d="M3 13h18"/></svg>',
            analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19h16"/><path d="M8 15v4"/><path d="M12 10v9"/><path d="M16 6v13"/></svg>',
            impressum: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>',
            dsgvo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 9.74-7 11-3.5-1.26-7-6-7-11V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
            about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
            berichtsheft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h-1.5a2 2 0 00-4 0H8a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2z"/><path d="M9 4h6"/></svg>',
            aufgaben: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>',
            skilltree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v7"/><path d="M7 10l5 5 5-5"/><path d="M12 20v-6"/></svg>',
            vertrag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
            rights: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 9.74-7 11-3.5-1.26-7-6-7-11V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
            'schatten-berichtsheft': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>',
            'fi-academy': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 6 2 12 8 18"/><polyline points="16 6 22 12 16 18"/></svg>',
            'it-hub': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/><path d="M9.5 10.5L5.7 7.3M14.5 10.5l3.8-3.2M9.5 13.5l-3.8 3.2M14.5 13.5l3.8 3.2"/></svg>',
            ghost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20V11a6 6 0 0112 0v9l-2.5-2-2 2-1.5-2-1.5 2-2-2z"/><path d="M9.5 10h.01M14.5 10h.01"/></svg>'
        };
        return icons[id] || '';
    }    // ===== NAVBAR CUSTOMIZATION: render based on settings and allow drag/drop =====
    function renderNavbar() {
        const nav = document.getElementById('mainNav');
        if (!nav) return;

        // Ensure settings.nav exists
        if (!Array.isArray(data.settings.nav)) {
            // Default nav items (id, label, icon, visible)
            data.settings.nav = [
                {id:'dashboard', label:'Dashboard', icon:getIconSvgById('dashboard'), visible:true},
                {id:'newEntry', label:'Neu', icon:getIconSvgById('newEntry'), visible:true},
                {id:'widgets', label:'Widgets', icon:getIconSvgById('widgets'), visible:true},
                {id:'settings', label:'Einstellungen', icon:getIconSvgById('settings'), visible:true}
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
            const navIconHtml = item.icon && item.icon.trim().startsWith('<svg') ? item.icon : getIconSvgById(item.id) || item.icon;
            a.innerHTML = `<span class="nav-icon">${navIconHtml}</span><span class="nav-label">${item.label}</span>`;

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
                            <span>${mwlIconFromEmoji(widget.icon, 22)}</span>
                            <div>
                                <div style="font-weight:600; color:var(--text-main);">${widget.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${widget.description}</div>
                            </div>
                        </div>
                        <button class="btn btn-ghost" style="width:100%; padding:8px;" onclick="console.log('Add widget clicked:', '${widgetId}'); event.stopPropagation(); addWidget('${widgetId}')">${mwlIcon('plus', 14)}<span>Hinzufügen</span></button>
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
                            <span>${mwlIconFromEmoji(widget.icon, 22)}</span>
                            <div style="flex:1;">
                                <div style="font-weight:600; color:var(--text-main);">${widget.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${widget.description}</div>
                            </div>
                            <button class="btn btn-ghost" style="padding:6px;" onclick="removeWidget('${widgetId}')" title="Entfernen" aria-label="Entfernen">${mwlIcon('trash', 15)}</button>
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
            {id:'dashboard', label:'Dashboard', icon:getIconSvgById('dashboard'), visible:true},
            {id:'performance', label:'Performance', icon:getIconSvgById('performance'), visible:true},
            {id:'history', label:'Verlauf', icon:getIconSvgById('history'), visible:true},
            {id:'yearview', label:'Jahresansicht', icon:getIconSvgById('yearview'), visible:true},
            {id:'monthcompare', label:'Monatsansicht', icon:getIconSvgById('monthcompare'), visible:true},
            {id:'weekview', label:'Wochenansicht', icon:getIconSvgById('weekview'), visible:true},
            {id:'urlaubsplaner', label:'Urlaubsplaner', icon:getIconSvgById('urlaubsplaner'), visible:true},
            {id:'school', label:'Berufsschule', icon:getIconSvgById('school'), visible:true},
            {id:'ihk', label:'IHK', icon:getIconSvgById('ihk'), visible:true},
            {id:'goals', label:'Ziele', icon:getIconSvgById('goals'), visible:true},
            {id:'analytics-pro', label:'Analytics Pro', icon:getIconSvgById('analytics-pro'), visible:true},
            {id:'aufgaben', label:'Aufgaben', icon:getIconSvgById('aufgaben'), visible:true, external:'/aufgaben/'},
        ];

        // Nav-Version: bei Änderung der Reihenfolge/Items hochzählen → erzwingt Reset
        // 6: Urlaubsplaner ergaenzt. Ohne Bump landet er bei Bestandsnutzern
        // per Append ganz unten statt bei den Zeitraum-Ansichten — die
        // Sidebar-Reihenfolge steckt in den Nutzerdaten (data.settings.nav).
        // 7: Fahrtkosten ist jetzt fest in Ausbildung & Lernen.
        // Nur hochzaehlen, wenn sich die Liste oben wirklich aendert: ein Bump
        // ueberschreibt jedem Bestandsnutzer seine selbst sortierte Sidebar.
        const NAV_VERSION = 7;
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
                const existing = data.settings.nav.find(item => item.id === defaultItem.id);
                if (!existing) {
                    data.settings.nav.push(defaultItem);
                    changed = true;
                } else if (defaultItem.external && existing.external !== defaultItem.external) {
                    existing.external = defaultItem.external;
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
            // Fix aufgaben to be external
            if (item.id === 'aufgaben' && !item.external) {
                item.external = '/aufgaben/';
            }

            const el = document.createElement('div');
            el.className = 'nav-item';
            el.draggable = true;
            el.dataset.navId = item.id;
            const sidebarIconHtml = item.icon && item.icon.trim().startsWith('<svg') ? item.icon : getIconSvgById(item.id) || item.icon;
            el.innerHTML = `<span class="nav-icon">${sidebarIconHtml}</span> <span class="nav-label">${item.label}</span>`;
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
        navList.style.minHeight = '';

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
        window._clsBC = 'restoreSidebarSections-start';
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
        window._clsBC = 'restoreSidebarSections-removeAttr';
        // Remove CLS pre-apply so sections can expand/collapse normally
        document.documentElement.removeAttribute('data-sb-pre-sec');
        window._clsBC = 'restoreSidebarSections-done';
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
        { id: 'dashboard',    label: 'Dashboard',         icon: getIconSvgById('dashboard'), group: 'Navigation', action: () => switchTab('dashboard') },
        { id: 'performance',  label: 'Performance',       icon: getIconSvgById('performance'), group: 'Navigation', action: () => switchTab('performance') },
        { id: 'history',      label: 'Verlauf',           icon: getIconSvgById('history'), group: 'Navigation', action: () => switchTab('history') },
        { id: 'yearview',     label: 'Jahresansicht',     icon: getIconSvgById('yearview'), group: 'Navigation', action: () => switchTab('yearview') },
        { id: 'monthcompare', label: 'Monatsansicht',     icon: getIconSvgById('monthcompare'), group: 'Navigation', action: () => switchTab('monthcompare') },
        { id: 'weekview',     label: 'Wochenansicht',     icon: getIconSvgById('weekview'), group: 'Navigation', action: () => switchTab('weekview') },
        { id: 'urlaubsplaner', label: 'Urlaubsplaner',    icon: getIconSvgById('urlaubsplaner'), group: 'Navigation', action: () => switchTab('urlaubsplaner') },
        { id: 'school',       label: 'Berufsschule',      icon: getIconSvgById('school'), group: 'Navigation', action: () => switchTab('school') },
        { id: 'ihk',          label: 'IHK',               icon: getIconSvgById('ihk'), group: 'Navigation', action: () => switchTab('ihk') },
        { id: 'goals',        label: 'Ziele',             icon: getIconSvgById('goals'), group: 'Navigation', action: () => switchTab('goals') },
        { id: 'support',      label: 'Support',           icon: getIconSvgById('support'), group: 'Navigation', action: () => switchTab('support') },
        { id: 'analytics-pro', label: 'Analytics Pro',     icon: getIconSvgById('analytics-pro'), group: 'Navigation', action: () => switchTab('analytics-pro') },
        // Tools
        { id: 'settings',     label: 'Einstellungen',     icon: getIconSvgById('settings'), group: 'Tools',      action: () => openSettings() },
        { id: 'alerts',       label: 'Alerts',            icon: getIconSvgById('alerts'), group: 'Tools',      action: () => toggleAlertsPanel() },
        { id: 'backup',       label: 'Backup / Export',   icon: getIconSvgById('backup'), group: 'Tools',      action: () => showExportMenu() },
        { id: 'import',       label: 'Import',            icon: getIconSvgById('import'), group: 'Tools',      action: () => showBackupMenu() },
        { id: 'onboarding',   label: 'Anleitung / Tour',  icon: getIconSvgById('onboarding'), group: 'Tools',      action: () => startOnboardingTour() },
        { id: 'untis',        label: 'Untis Import',      icon: getIconSvgById('untis'), group: 'Tools',      action: () => showUntisImportModal() },
        // Extern
        { id: 'berichtsheft', label: 'Berichtsheft',      icon: getIconSvgById('berichtsheft'), group: 'Extern',     action: () => { window.location.href = './berichtsheft/'; } },
        { id: 'schatten-berichtsheft', label: 'Schatten-Berichtsheft', icon: getIconSvgById('schatten-berichtsheft'), group: 'Extern', action: () => { window.location.href = './schatten-berichtsheft/'; } },
        { id: 'fahrtkosten',  label: 'Fahrtkosten',       icon: getIconSvgById('fahrtkosten'), group: 'Extern',     action: () => { window.location.href = './fahrtkosten/'; } },
        { id: 'aufgaben',     label: 'Aufgaben Manager', icon: getIconSvgById('aufgaben'), group: 'Extern',     action: () => { window.location.href = './aufgaben/'; } },
        { id: 'skilltree',    label: 'Skill-Baum',       icon: getIconSvgById('skilltree'), group: 'Extern',     action: () => { window.location.href = './skill-tree/'; } },
        { id: 'fi-academy',   label: 'FI Academy',        icon: getIconSvgById('fi-academy'), group: 'Extern',     action: () => { window.location.href = './Fachinformatiker/'; } },
        { id: 'it-hub',       label: 'IT Professional Hub', icon: getIconSvgById('it-hub'), group: 'Extern',     action: () => { window.location.href = './it-landing/'; } },
        { id: 'rechte-checker', label: 'Rechte-Checker',  icon: getIconSvgById('rights'), group: 'Extern',     action: () => { window.location.href = './rechte-checker/'; } },
        { id: 'vertrag',      label: 'Vertrags-Manager',  icon: getIconSvgById('vertrag'), group: 'Extern',     action: () => { window.location.href = './vertrags-manager/'; } },
        { id: 'archflow',     label: 'Graphify',           icon: getIconSvgById('archflow'), group: 'Extern',     action: () => window.open('/archflow/', '_blank') },
        { id: 'repo',         label: 'Repo-Analyse',      icon: getIconSvgById('analytics'), group: 'Extern',     action: () => window.open('/repo-report/', '_blank') },
        { id: 'analytics',    label: 'Analytics',         icon: getIconSvgById('analytics'), group: 'Extern',     action: () => window.open('./analytics/', '_blank') },
        { id: 'impressum',    label: 'Impressum',         icon: getIconSvgById('impressum'), group: 'Extern',     action: () => window.open('./Impressum/', '_blank') },
        { id: 'dsgvo',        label: 'DSGVO',             icon: getIconSvgById('dsgvo'), group: 'Extern',     action: () => window.open('./DSGVO/', '_blank') },
        { id: 'about',        label: 'About',             icon: getIconSvgById('about'), group: 'Extern',     action: () => window.open('./about/', '_blank') },
        // Ghost Mode
        { id: 'ghost',        label: 'Ghost Mode',        icon: getIconSvgById('ghost'), group: 'Tools',      action: () => toggleGhostMode() },
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
                <div class="cpi-icon">${mwlIconFromEmoji(item.icon, 16)}</div>
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
    // Keep the generated shell compatible with the current Graphify naming.
    // Update the already-rendered link without touching generated HTML files.
    function applyGraphifySidebarLabel() {
        document.querySelectorAll('a[href="/archflow/"]').forEach((link) => {
            link.setAttribute('aria-label', 'Graphify');
            link.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('ArchFlow')) {
                    node.textContent = node.textContent.replace('ArchFlow', 'Graphify');
                }
            });
            if (!link.querySelector('.nav-badge') && !link.querySelector('.nav-badge-new')) {
                const badge = document.createElement('span');
                badge.className = 'nav-badge-new';
                badge.textContent = 'NEU';
                link.appendChild(badge);
            }
        });
    }
    applyGraphifySidebarLabel();

    document.addEventListener('keydown', (e) => {
        // Master-Schalter (shortcuts.js) — Default AUS. Palette bleibt per
        // Sidebar-Button / Mobile-Nav erreichbar, kein Lockout.
        if (typeof shortcutsEnabled !== 'function' || !shortcutsEnabled()) return;
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
