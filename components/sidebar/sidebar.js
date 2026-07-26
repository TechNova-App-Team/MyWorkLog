// ═══ SIDEBAR MODULE ═══
    window._clsBC = 'sidebar.js-start';

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const main = document.getElementById('mainContent');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (window.innerWidth < 1024) {
             // On mobile the sidebar CSS uses .active to slide in/out
             isSidebarOpen = !isSidebarOpen;
             sidebar.classList.toggle('active', isSidebarOpen);
             // Ensure .hidden is removed to avoid conflicting transforms
             sidebar.classList.toggle('hidden', false);
             overlay.classList.toggle('active', isSidebarOpen);
        } else {
             isSidebarOpen = !isSidebarOpen;
             sidebar.classList.toggle('hidden', !isSidebarOpen);
             main.classList.toggle('full-width', !isSidebarOpen);
        }
    }

    function toggleProfilePopover(e) {
        e.stopPropagation();
        const popover = document.getElementById('profilePopover');
        if (!popover) return;
        const isOpen = popover.classList.contains('active');
        if (isOpen) {
            closeProfilePopover();
        } else {
            // Update popover content before showing
            try {
                const name = (typeof data !== 'undefined' && data.settings && data.settings.name) ? data.settings.name : 'Benutzer';
                const popName = document.getElementById('popoverName');
                const popAvatar = document.getElementById('popoverAvatar');
                const popStatus = document.getElementById('popoverStatus');
                if (popName) popName.textContent = name || 'Benutzer';
                if (popAvatar) {
                    const parts = (name || '').trim().split(/\s+/);
                    popAvatar.textContent = parts.length >= 2 
                        ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
                        : (name || 'U').substring(0, 2).toUpperCase();
                }
                if (popStatus) popStatus.textContent = navigator.onLine ? 'Online' : 'Offline';
                updatePopoverThemeBtns();
            } catch(err) {}
            popover.classList.add('active');
        }
    }

    function closeProfilePopover() {
        const popover = document.getElementById('profilePopover');
        if (popover) popover.classList.remove('active');
    }

    function updatePopoverThemeBtns() {
        const mode = (typeof data !== 'undefined' && data.settings) ? (data.settings.themeMode || 'dark') : 'dark';
        const btnDark = document.getElementById('ppThemeDark');
        const btnLight = document.getElementById('ppThemeLight');
        const btnSystem = document.getElementById('ppThemeSystem');
        [btnDark, btnLight, btnSystem].forEach(b => { if(b) b.classList.remove('active-theme'); });
        if (mode === 'dark' && btnDark) btnDark.classList.add('active-theme');
        else if (mode === 'light' && btnLight) btnLight.classList.add('active-theme');
        else if (mode === 'system' && btnSystem) btnSystem.classList.add('active-theme');
    }

    function startOnboardingTour() {
        onboardingStep = 0;
        onboardingActive = true;
        // Close sidebar on mobile
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && _isMobile()) sidebar.classList.remove('active');
        document.addEventListener('keydown', tourKeyHandler);
        document.addEventListener('touchstart', tourTouchStartHandler, { passive: true });
        document.addEventListener('touchend', tourTouchEndHandler);
        _tourResizeHandler = () => { if (onboardingActive) renderOnboardingStep(); };
        window.addEventListener('resize', _tourResizeHandler);
        renderOnboardingStep();
    }

    // ═══ SIDEBAR COLLAPSE — Icon-Only Mode ═══
    (function initSidebarCollapse() {
        window._clsBC = 'sidebar-initSidebarCollapse';
        try {
            const collapsed = localStorage.getItem('sidebar_collapsed') === 'true';
            if (collapsed && window.innerWidth >= 1024) {
                window._clsBC = 'sidebar-applySidebarCollapse-before';
                _applySidebarCollapse(true, false);
                window._clsBC = 'sidebar-applySidebarCollapse-after';
            }
        } catch(e) {}
        // Ctrl+B shortcut
        document.addEventListener('keydown', function(e) {
            // Master-Schalter (shortcuts.js) — Default AUS
            if (typeof shortcutsEnabled !== 'function' || !shortcutsEnabled()) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'b' && window.innerWidth >= 1024) {
                e.preventDefault();
                toggleSidebarCollapse();
            }
        });
        // Reset on resize below 1024
        window.addEventListener('resize', function() {
            if (window.innerWidth < 1024) {
                const s = document.getElementById('sidebar');
                const m = document.getElementById('mainContent');
                if (s) s.classList.remove('collapsed');
                if (m) m.classList.remove('sidebar-icon-only');
                document.body.classList.remove('sidebar-collapsed');
            }
        });
    })();

    function toggleSidebarCollapse() {
        if (window.innerWidth < 1024) return;
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.contains('collapsed');
        _applySidebarCollapse(!isCollapsed, true);
    }

    function _applySidebarCollapse(collapse, save) {
        const sidebar = document.getElementById('sidebar');
        const main = document.getElementById('mainContent');
        const floatBtn = document.getElementById('sidebarExpandFloat');
        if (!sidebar) return;

        if (collapse) {
            sidebar.classList.add('collapsed');
            if (main) main.classList.add('sidebar-icon-only');
            if (floatBtn) { floatBtn.style.cssText = 'display:flex;opacity:1;pointer-events:auto;'; }
            document.body.classList.add('sidebar-collapsed');
            // Add title attrs for tooltips
            document.querySelectorAll('#sidebarNavList .nav-item').forEach(el => {
                const label = el.querySelector('.nav-label');
                if (label && !el.getAttribute('title')) el.setAttribute('title', label.textContent.trim());
            });
        } else {
            sidebar.classList.remove('collapsed');
            if (main) main.classList.remove('sidebar-icon-only');
            if (floatBtn) { floatBtn.style.cssText = ''; }
            document.body.classList.remove('sidebar-collapsed');
        }
        if (save) {
            try { localStorage.setItem('sidebar_collapsed', collapse ? 'true' : 'false'); } catch(e) {}
        }
    }

    // ─── Flyout-Dropdown im Collapsed-Mode (position:fixed um overflow-clip zu umgehen) ───
    (function initCollapsedFlyouts() {
        function isCollapsed() {
            return document.getElementById('sidebar')?.classList.contains('collapsed');
        }
        function activateFlyout(triggerEl, dropdown) {
            if (!isCollapsed()) return;
            const rect = triggerEl.getBoundingClientRect();
            dropdown.style.setProperty('--flyout-top', rect.top + 'px');
            dropdown.style.setProperty('--flyout-left', (rect.right + 8) + 'px');
            dropdown.classList.add('flyout-active');
        }
        function deactivateFlyout(dropdown) {
            dropdown.classList.remove('flyout-active');
            dropdown.style.removeProperty('--flyout-top');
            dropdown.style.removeProperty('--flyout-left');
        }
        function hideAllFlyouts() {
            document.querySelectorAll('.nav-dropdown.flyout-active').forEach(deactivateFlyout);
        }
        function bind() {
            document.querySelectorAll('.nav-item-dropdown').forEach(function(wrap) {
                if (wrap.dataset.flyoutBound) return;
                wrap.dataset.flyoutBound = '1';
                const dropdown = wrap.querySelector('.nav-dropdown');
                if (!dropdown) return;
                let hideTimer = null;
                const show = function() {
                    clearTimeout(hideTimer);
                    activateFlyout(wrap, dropdown);
                };
                const hide = function() {
                    clearTimeout(hideTimer);
                    hideTimer = setTimeout(function() { deactivateFlyout(dropdown); }, 80);
                };
                wrap.addEventListener('mouseenter', show);
                wrap.addEventListener('mouseleave', hide);
                dropdown.addEventListener('mouseenter', show);
                dropdown.addEventListener('mouseleave', hide);
            });
            // Andere nav-items (nicht im Dropdown-Wrap) → Flyout sofort schließen
            document.querySelectorAll('.sidebar .nav-item').forEach(function(item) {
                if (item.closest('.nav-item-dropdown')) return;
                if (item.dataset.flyoutClose) return;
                item.dataset.flyoutClose = '1';
                item.addEventListener('mouseenter', hideAllFlyouts);
            });
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bind);
        } else {
            bind();
        }
    })();

