// ═══ CORE: THEME-COLORS ═══
    function setThemeColor(hex) {
        data.settings.theme = hex;
        applyTheme(hex);
        // Update meta theme-color for the browser (affects address bar color on mobile)
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.content = hex;
        save();
    }
    function applySystemTheme() {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', 'light');
    }

    // Listen to system changes if user selected 'system'
    if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener && mq.addEventListener('change', (e) => {
            if (data && data.settings && data.settings.themeMode === 'system') applySystemTheme();
        });
    }

    // --- CUSTOM COLOR PICKER FUNCTIONS (CLEAN & MODERN) ---
    // Live-Preview während Drag: nur CSS-Variablen + Hex-Input updaten, KEIN save()/updateUI().
    // Sonst triggert jeder `input`-Tick (60/sec) einen full LocalStorage-Write + Dashboard-Rebuild → Lag.
    function updateColorFromPicker() {
        const color = document.getElementById('customColorPicker').value;
        const hexEl = document.getElementById('customColorHex');
        if (hexEl) hexEl.value = color.slice(1).toUpperCase();
        const prev = document.getElementById('colorPreview');
        if (prev) prev.style.background = color;
        applyTheme(color);
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.content = color;
    }
    // Auf `change` (Drag-Ende) richtig persistieren.
    function commitColorFromPicker() {
        const color = document.getElementById('customColorPicker').value;
        setThemeColor(color);
    }

    function updateColorPickerFromHex() {
        let hex = document.getElementById('customColorHex').value.trim();
        
        if (hex.length === 0) return;
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
        
        document.getElementById('customColorPicker').value = hex;
        document.getElementById('colorPreview').style.background = hex;
    }

    // Inline button-morph feedback: temporär Icon+Text+Farbe ändern, dann zurück
    function showSettingsBtnFeedback(btn, kind, label) {
        if (!btn) return;
        if (!btn.dataset._originalHtml) btn.dataset._originalHtml = btn.innerHTML;
        btn.classList.remove('cloud-btn-success', 'cloud-btn-error');
        // reflow erzwingt Re-Trigger der CSS-Animation
        void btn.offsetWidth;
        btn.classList.add(kind === 'success' ? 'cloud-btn-success' : 'cloud-btn-error');
        const icon = kind === 'success'
            ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>'
            : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        btn.innerHTML = icon + '<span>' + label + '</span>';
        clearTimeout(btn._feedbackTimer);
        btn._feedbackTimer = setTimeout(() => {
            btn.classList.remove('cloud-btn-success', 'cloud-btn-error');
            btn.innerHTML = btn.dataset._originalHtml;
            delete btn.dataset._originalHtml;
        }, kind === 'success' ? 1700 : 2400);
    }

    function resetColorPicker() {
        const defaultColor = '#a855f7';
        document.getElementById('customColorPicker').value = defaultColor;
        document.getElementById('customColorHex').value = 'A855F7';
        document.getElementById('colorPreview').style.background = defaultColor;
        setThemeColor(defaultColor);
        showSettingsBtnFeedback(document.getElementById('btnResetCustomColor'), 'success', 'Zurückgesetzt');
    }

    function applyCustomColor() {
        const btn = document.getElementById('btnApplyCustomColor');
        let hex = document.getElementById('customColorHex').value.trim();

        if (!hex) {
            showSettingsBtnFeedback(btn, 'error', 'Hex fehlt');
            return;
        }
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            showSettingsBtnFeedback(btn, 'error', 'Ungültiger Hex');
            return;
        }

        setThemeColor(hex);
        showSettingsBtnFeedback(btn, 'success', 'Gespeichert');
    }
