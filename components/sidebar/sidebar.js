// ═══ SIDEBAR MODULE ═══

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

