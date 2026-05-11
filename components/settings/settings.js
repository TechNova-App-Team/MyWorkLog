// ═══ SETTINGS MODULE ═══
    window._clsBC = 'settings.js-start';

    function openSettings() {
        uEvent('settings-open');
        document.getElementById('settingsModal').classList.add('active');
        switchSettingsTab('profile'); // Standardmäßig auf Profile Tab
        
        document.getElementById('confName').value = data.settings.name;
        // Job
        const confJobEl = document.getElementById('confJob');
        if (confJobEl) confJobEl.value = data.settings.job || '';
        // Bundesland
        const confBundeslandEl = document.getElementById('confBundesland');
        if (confBundeslandEl) confBundeslandEl.value = data.settings.bundesland || '';
        // Tab-Tarnung checkbox
        const confTabCamoEl = document.getElementById('confTabCamo');
        if (confTabCamoEl) confTabCamoEl.checked = !!data.settings.tabCamo;
        // Stimmungs-Feedback checkbox
        const confMoodEl = document.getElementById('confMoodSelector');
        if (confMoodEl) confMoodEl.checked = (data.settings.moodSelectorEnabled !== false);
        // Shortcuts checkbox
        const confShortcutsEl = document.getElementById('confShortcuts'); 
        if (confShortcutsEl) {
            confShortcutsEl.checked = (data.settings.shortcutsEnabled !== false);
            // Echtzeit-Update wenn sich das Häkchen ändert
            confShortcutsEl.addEventListener('change', (e) => {
                data.settings.shortcutsEnabled = !!e.target.checked;
                updateShortcutsPanelVisibility();
                save(); // Persistiere nur diese Einstellung ohne Modal zu schließen
            });
            // Initiale Sichtbarkeit setzen
            updateShortcutsPanelVisibility();
        }
        document.getElementById('confBreakThresh').value = data.settings.break.thresh;
        
        // Lade Pausenzeiten pro Wochentag
        const breakMins = data.settings.break.min;
        const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        for(let i=0; i<7; i++) {
            const el = document.getElementById('breakMin_'+i);
            if(el) el.value = Array.isArray(breakMins) ? breakMins[i] : 30;
        }
        
        for(let i=0; i<=6; i++) {
            const el = document.getElementById('h'+i);
            if(el) el.value = data.settings.hours[i];
        }
        
        // Urlaub: Pro-rata Anspruch berechnen und anzeigen
        const proRata = calculateProRataVacation(30); // 30 Tage Basis
        const vacProEl = document.getElementById('vacationProRata');
        if(vacProEl) vacProEl.innerText = proRata;
        // Render backups list for restore/debugging
        try { renderBackupsList(); } catch(e){ /* ignore */ }
        
        // Initialize Custom Types & Fields renderers (wird später aufgerufen wenn Tab gewählt wird)
        // renderCustomTypesManager() & renderCustomFieldsManager() werden in switchSettingsTab() aufgerufen
        
        const confVacTotalEl = document.getElementById('confVacationTotal');
        if(confVacTotalEl) confVacTotalEl.value = data.settings.vacation.total || 30;
        const confVacUsedEl = document.getElementById('confVacationUsedManual');
        if(confVacUsedEl) confVacUsedEl.value = data.settings.vacation.usedManual || 0;
        // Load trashAutoEmptyDays setting
        const confTrashEl = document.getElementById('confTrashAutoEmptyDays');
        if(confTrashEl) confTrashEl.value = data.settings.trashAutoEmptyDays || 30;

        // Theme Mode radio state
        const themeMode = data.settings.themeMode || 'dark';
        const themeRadios = document.querySelectorAll('input[name="themeMode"]');
        themeRadios.forEach(r => r.checked = (r.value === themeMode));

        // Render school rules UI
        try { renderSchoolRules(); } catch(e) { console.warn('renderSchoolRules error', e); }

        // NEU: Custom Color Picker initialisieren
        const currentTheme = data.settings.theme || '#a855f7';
        document.getElementById('customColorPicker').value = currentTheme;
        document.getElementById('customColorHex').value = currentTheme.toUpperCase();
        document.getElementById('colorPreview').style.background = currentTheme;

        // === NEU: Team Features laden ===
        loadTeamSettings();
    }

    function closeSettings() { saveSettings(); }

    function saveSettings() {
        data.settings.name = document.getElementById('confName').value;
        // Job
        const confJobSaveEl = document.getElementById('confJob');
        if (confJobSaveEl) data.settings.job = confJobSaveEl.value;
        // Update sidebar avatar with new name
        try { updateSidebarAvatar(); } catch(e) {}
        // Shortcuts setting
        const confShortcutsEl = document.getElementById('confShortcuts');
        if (confShortcutsEl) data.settings.shortcutsEnabled = !!confShortcutsEl.checked;
        // Bundesland
        const confBLEl = document.getElementById('confBundesland');
        if (confBLEl) data.settings.bundesland = confBLEl.value;
        data.settings.break.thresh = parseFloat(document.getElementById('confBreakThresh').value);
        
        // Speichere Pausenzeiten pro Wochentag
        const breakMinutesArray = [];
        for(let i=0; i<7; i++) {
            const el = document.getElementById('breakMin_'+i);
            breakMinutesArray.push(el ? parseFloat(el.value) : 30);
        }
        data.settings.break.min = breakMinutesArray;
        
        // Sollstunden speichern (alle 7 Wochentage)
        for(let i=0; i<=6; i++) {
            const el = document.getElementById('h'+i);
            if(el) data.settings.hours[i] = parseFloat(el.value) || 0;
        }
        
        // Urlaub: Den eingegebenen Anspruch direkt speichern
        const confVacTotalEl2 = document.getElementById('confVacationTotal');
        const inputVacationTotal = confVacTotalEl2 ? parseFloat(confVacTotalEl2.value) : NaN;
        data.settings.vacation.total = isNaN(inputVacationTotal) ? 30 : inputVacationTotal;
        
        const confVacUsedEl2 = document.getElementById('confVacationUsedManual');
        const inputVacUsed = confVacUsedEl2 ? parseFloat(confVacUsedEl2.value) : 0;
        data.settings.vacation.usedManual = inputVacUsed;
        recalculateVacationUsed();
        // Papierkorb Auto-Leerung Tage
        const trashDaysEl = document.getElementById('confTrashAutoEmptyDays');
        if (trashDaysEl) data.settings.trashAutoEmptyDays = parseInt(trashDaysEl.value, 10) || 0;
        
        // School rules save
        try { saveSchoolSettingsToData(); } catch(e) { console.warn('saveSchoolSettingsToData error', e); }

        // Theme mode (persist selection if present)
        const selectedThemeRadio = document.querySelector('input[name="themeMode"]:checked');
        if (selectedThemeRadio) data.settings.themeMode = selectedThemeRadio.value;

        // === P2P Team Settings speichern ===
        if (!data.settings.team) data.settings.team = {};
        
        const autoSyncEl = document.getElementById('p2pAutoSync');
        const offlineQueueEl = document.getElementById('p2pOfflineQueue');
        
        if (autoSyncEl) data.settings.team.autoSync = autoSyncEl.checked;
        if (offlineQueueEl) data.settings.team.offlineQueue = offlineQueueEl.checked;
        
        save();
        document.getElementById('settingsModal').classList.remove('active');
    }

    function setThemeMode(mode) {
        try {
            data.settings.themeMode = mode;
            if (mode === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            } else if (mode === 'dark') {
                document.documentElement.removeAttribute('data-theme');
            } else if (mode === 'system') {
                // Apply current system preference now
                applySystemTheme();
            }
            // Persist and update manifest/meta color
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme && data.settings.theme) metaTheme.content = data.settings.theme;
            save();

            // Update UI radio selection (if present)
            const radios = document.querySelectorAll('input[name="themeMode"]');
            radios.forEach(r => r.checked = (r.value === mode));
        } catch (e) {
            console.warn('setThemeMode error', e);
        }
    }

    function applyTheme(hex) {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) hex = '#a855f7';
        document.documentElement.style.setProperty('--primary', hex);
        const r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
        document.documentElement.style.setProperty('--primary-rgb', `${r},${g},${b}`);
        document.documentElement.style.setProperty('--primary-dim', `rgba(${r},${g},${b}, 0.15)`);
    }

