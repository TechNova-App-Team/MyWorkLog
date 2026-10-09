// ═══ CORE: DASHBOARD-UI ═══
    // updateUI() ist der Nachlauf nach jedem save() und nach jedem Laden. Bis zum
    // neuen Dashboard schrieb er hier vier KPI-Karten, Trend und Verteilung direkt
    // ins Markup; das alles rechnet jetzt dashboard-neu.js (dnRender) selbst.
    // Hier bleibt nur, was ANDERE Ansichten aus den Daten erwarten.
    function updateUI() {
        if (typeof updateGreetingWeather === 'function') updateGreetingWeather();
        // Einrichtungs-Karte: verschwindet mit dem ersten Eintrag, nicht erst beim Neuladen
        if (typeof checkSetupHint === 'function') checkSetupHint();

        const trashBadge = document.getElementById('trashCountBadge');
        if (trashBadge) trashBadge.textContent = (Array.isArray(data.trash) ? data.trash.length : 0);

        // Verbrauchter Urlaub des laufenden Jahres. Urlaubsplaner, Einstellungen und
        // das Dashboard lesen data.settings.vacation.used — gerechnet wird er hier.
        const year = new Date().getFullYear();
        const hoursMode = (typeof getVacationMode === 'function') && getVacationMode() === 'hours';
        let used = 0;
        (data.entries || []).forEach(e => {
            if (e.type === 'vacation' && new Date(e.date).getFullYear() === year) used += hoursMode ? (parseFloat(e.expected) || 0) : 1;
        });
        data.settings.vacation.used = used + parseFloat(data.settings.vacation.usedManual || 0);

        // Meldung bei neuer Bestserie (einmal pro Tag)
        if (typeof updateStreakCounter === 'function') { try { updateStreakCounter(); } catch (e) { console.warn('updateStreakCounter', e); } }

        // Ein Fehler im Dashboard darf das Speichern nicht mitreissen.
        if (typeof dnRender === 'function') { try { dnRender(); } catch (e) { console.warn('dnRender', e); } }
    }

    // Alte Namen, die ueber die ganze App verteilt gerufen werden (Einstellungen,
    // Typen, Import, Bearbeiten): beide heissen jetzt "Dashboard neu zeichnen".
    function updateDashboard() { updateUI(); }
    function renderLists() { if (typeof dnRender === 'function') { try { dnRender(); } catch (e) { console.warn('dnRender', e); } } }
