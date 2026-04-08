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
    function updateColorFromPicker() {
        const color = document.getElementById('customColorPicker').value;
        document.getElementById('customColorHex').value = color.slice(1).toUpperCase();
        document.getElementById('colorPreview').style.background = color;
        // Sofort anwenden
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

    function resetColorPicker() {
        const defaultColor = '#a855f7';
        document.getElementById('customColorPicker').value = defaultColor;
        document.getElementById('customColorHex').value = 'A855F7';
        document.getElementById('colorPreview').style.background = defaultColor;
        showCustomMessage('↺ Zurückgesetzt', 'Farbe auf Standard zurückgesetzt.', 'info');
    }

    function applyCustomColor() {
        let hex = document.getElementById('customColorHex').value.trim();
        
        if (!hex) {
            showCustomMessage('❌ Fehler', 'Bitte gib einen Farbcode ein.', 'error');
            return;
        }

        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            showCustomMessage('❌ Ungültig', 'Bitte gib einen gültigen Hex-Code ein (z.B. a855f7).', 'error');
            return;
        }

        setThemeColor(hex);
        showCustomMessage('✅ Gespeichert', `Farbe: ${hex.toUpperCase()}`, 'success');
    }
