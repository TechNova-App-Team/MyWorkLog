// ═══ SETTINGS MODULE ═══
    window._clsBC = 'settings.js-start';

    function openSettings() {
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
            // Default AUS: nur ein explizites true hakt an (siehe shortcutsEnabled())
            confShortcutsEl.checked = (data.settings.shortcutsEnabled === true);
            // Echtzeit-Update wenn sich das Häkchen ändert — nur EINMAL verdrahten,
            // openSettings() läuft bei jedem Öffnen erneut (sonst n× save() pro Klick)
            if (!confShortcutsEl.dataset.wired) {
                confShortcutsEl.dataset.wired = '1';
                confShortcutsEl.addEventListener('change', (e) => {
                    data.settings.shortcutsEnabled = !!e.target.checked;
                    updateShortcutsPanelVisibility();
                    save(); // Persistiere nur diese Einstellung ohne Modal zu schließen
                });
            }
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
        
        // Render backups list for restore/debugging
        try { renderBackupsList(); } catch(e){ /* ignore */ }

        // Initialize Custom Types & Fields renderers (wird später aufgerufen wenn Tab gewählt wird)
        // renderCustomTypesManager() & renderCustomFieldsManager() werden in switchSettingsTab() aufgerufen

        // Urlaub: Mode + Total + Manual laden, Labels passend rendern
        const vacMode = (data.settings.vacation && data.settings.vacation.mode === 'hours') ? 'hours' : 'days';
        const modeDaysRadio = document.getElementById('vacModeDays');
        const modeHoursRadio = document.getElementById('vacModeHours');
        if (modeDaysRadio) modeDaysRadio.checked = (vacMode === 'days');
        if (modeHoursRadio) modeHoursRadio.checked = (vacMode === 'hours');

        const confVacTotalEl = document.getElementById('confVacationTotal');
        if(confVacTotalEl) confVacTotalEl.value = (typeof data.settings.vacation.total !== 'undefined') ? data.settings.vacation.total : 30;
        const confVacUsedEl = document.getElementById('confVacationUsedManual');
        if(confVacUsedEl) confVacUsedEl.value = data.settings.vacation.usedManual || 0;
        const confVacCarriedEl = document.getElementById('confVacationCarriedOver');
        if(confVacCarriedEl) confVacCarriedEl.value = data.settings.vacation.carriedOver || 0;
        const confVacCarryMaxEl = document.getElementById('confVacationCarryOverMax');
        if(confVacCarryMaxEl) confVacCarryMaxEl.value = data.settings.vacation.carryOverMax !== null && data.settings.vacation.carryOverMax !== undefined ? data.settings.vacation.carryOverMax : '';

        // Labels + Hint + Pro-Rata + Ref-Hours-Display refreshen (Listener sind inline im HTML)
        if (typeof refreshVacationModeUI === 'function') refreshVacationModeUI();
        // Jahreshistorie rendern
        if (typeof renderVacationYearHistory === 'function') renderVacationYearHistory();

        // Zeit-Rundung: Werte ins Form
        const r = (data.settings.rounding) || {};
        const roundEnabledEl = document.getElementById('confRoundingEnabled');
        if (roundEnabledEl) roundEnabledEl.checked = !!r.enabled;
        const rMode = (r.mode === 'down' || r.mode === 'taktung') ? r.mode : 'commercial';
        ['Commercial','Down','Taktung'].forEach(suf => {
            const el = document.getElementById('roundMode' + suf);
            if (el) el.checked = (el.value === rMode);
        });
        const taktVal = String(parseInt(r.taktungMinutes, 10) || 15);
        document.querySelectorAll('input[name="roundingTaktung"]').forEach(el => { el.checked = (el.value === taktVal); });
        if (typeof refreshRoundingUI === 'function') refreshRoundingUI();

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

        // Job-Manager rendern
        try { if (typeof renderJobManager === 'function') renderJobManager(); } catch(e) { console.warn('renderJobManager error', e); }
    }

    function closeSettings() { saveSettings(); }

    function saveSettings() {
        data.settings.name = document.getElementById('confName').value;
        // Job
        const confJobSaveEl = document.getElementById('confJob');
        if (confJobSaveEl) data.settings.job = confJobSaveEl.value;
        // Jobs aus dem Job-Manager einlesen + Formular-Auswahl aktualisieren
        try { if (typeof collectJobManager === 'function') collectJobManager(); } catch(e) { console.warn('collectJobManager error', e); }
        try { if (typeof populateJobSelect === 'function') populateJobSelect(); } catch(e) {}
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
        
        // Urlaub: Mode + Anspruch + Manual speichern
        if (!data.settings.vacation) data.settings.vacation = {total:30, used:0, usedManual:0, mode:'days'};
        const modeRadio = document.querySelector('input[name="vacationMode"]:checked');
        const newMode = modeRadio ? modeRadio.value : data.settings.vacation.mode || 'days';
        data.settings.vacation.mode = (newMode === 'hours') ? 'hours' : 'days';

        const confVacTotalEl2 = document.getElementById('confVacationTotal');
        const inputVacationTotal = confVacTotalEl2 ? parseFloat(confVacTotalEl2.value) : NaN;
        if (isNaN(inputVacationTotal)) {
            data.settings.vacation.total = (data.settings.vacation.mode === 'hours') ? (30 * getVacationRefHours()) : 30;
        } else {
            data.settings.vacation.total = inputVacationTotal;
        }

        const confVacUsedEl2 = document.getElementById('confVacationUsedManual');
        const inputVacUsed = confVacUsedEl2 ? parseFloat(confVacUsedEl2.value) : 0;
        data.settings.vacation.usedManual = isNaN(inputVacUsed) ? 0 : inputVacUsed;

        const confVacCarriedEl2 = document.getElementById('confVacationCarriedOver');
        const inputCarried = confVacCarriedEl2 ? parseFloat(confVacCarriedEl2.value) : 0;
        data.settings.vacation.carriedOver = isNaN(inputCarried) ? 0 : Math.max(0, inputCarried);

        const confVacCarryMaxEl2 = document.getElementById('confVacationCarryOverMax');
        const rawMax = confVacCarryMaxEl2 ? confVacCarryMaxEl2.value.trim() : '';
        data.settings.vacation.carryOverMax = (rawMax === '' || isNaN(parseFloat(rawMax))) ? null : Math.max(0, parseFloat(rawMax));

        recalculateVacationUsed();

        // Zeit-Rundung speichern
        if (!data.settings.rounding) data.settings.rounding = { enabled:false, mode:'commercial', taktungMinutes:15 };
        const roundEnabledSaveEl = document.getElementById('confRoundingEnabled');
        if (roundEnabledSaveEl) data.settings.rounding.enabled = !!roundEnabledSaveEl.checked;
        const roundModeRadio = document.querySelector('input[name="roundingMode"]:checked');
        if (roundModeRadio) data.settings.rounding.mode = roundModeRadio.value;
        const roundTaktRadio = document.querySelector('input[name="roundingTaktung"]:checked');
        if (roundTaktRadio) data.settings.rounding.taktungMinutes = parseInt(roundTaktRadio.value, 10) || 15;

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

    // --- Zeit-Rundung UI ---
    function refreshRoundingUI() {
        const enabledEl = document.getElementById('confRoundingEnabled');
        const modeBlock = document.getElementById('roundingModeBlock');
        const taktBlock = document.getElementById('roundingTaktungBlock');
        if (!modeBlock) return;
        const isOn = !!(enabledEl && enabledEl.checked);
        modeBlock.style.display = isOn ? 'block' : 'none';
        const modeRadio = document.querySelector('input[name="roundingMode"]:checked');
        const mode = modeRadio ? modeRadio.value : 'commercial';
        if (taktBlock) taktBlock.style.display = (isOn && mode === 'taktung') ? 'block' : 'none';
    }
    function onRoundingEnabledChange() { refreshRoundingUI(); }
    function onRoundingModeChange() { refreshRoundingUI(); }

