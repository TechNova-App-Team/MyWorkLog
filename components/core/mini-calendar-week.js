// ═══ CORE: MINI-CALENDAR-WEEK ═══
    // ============================================
    // FEATURE: MINI CALENDAR WIDGET
    // ============================================
    let miniCalViewMonth = new Date().getMonth();
    let miniCalViewYear = new Date().getFullYear();

    function miniCalNav(dir) {
        miniCalViewMonth += dir;
        if (miniCalViewMonth > 11) { miniCalViewMonth = 0; miniCalViewYear++; }
        if (miniCalViewMonth < 0) { miniCalViewMonth = 11; miniCalViewYear--; }
        renderMiniCalendar();
    }
    function miniCalDayClick(dateStr) {
        // Set entry form date to clicked day
        const inp = document.getElementById('inpDate');
        if (inp) {
            inp.value = dateStr;
            // Scroll to entry form
            const form = document.querySelector('[data-item-id="entry-form"]');
            if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ============================================
    // FEATURE: WOCHENANSICHT TAB (Full Week View)
    // ============================================
    let weekViewOffset = 0; // 0 = current week, -1 = last week, etc.

    function weekViewNavigate(dir) {
        if (dir === 0) weekViewOffset = 0;
        else weekViewOffset += dir;
        renderWeekView();
    }

    function getWeekMonday(offset) {
        const now = new Date();
        const currentDay = now.getDay();
        const mondayDiff = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayDiff + (offset * 7));
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    function getISOWeekNumber(d) {
        const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = date.getUTCDay() || 7;
        date.setUTCDate(date.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    }

    // Lokales Datum als YYYY-MM-DD (OHNE UTC-Konvertierung!)
    function toLocalISODate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Prüft ob ein Wochentag (0=So, 6=Sa) ein Arbeitstag ist (Soll-Stunden > 0)
    function isConfiguredWorkDay(dayOfWeek) {
        return (data.settings && data.settings.hours && data.settings.hours[dayOfWeek] > 0);
    }

    // Normalisiert Datumsstrings in ISO-Format (YYYY-MM-DD)
    function normalizeDate(dateStr) {
        if (!dateStr) return null;
        // Falls bereits ISO-Format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Falls Locale-Format (DD.MM.YYYY)
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
            const parts = dateStr.split('.');
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        // Fallback: versuche zu parsen
        try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return toLocalISODate(d);
            }
        } catch (e) {}
        return null;
    }

    function getWeekEntries(monday) {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        const entries = [];
        (data.entries || []).forEach(e => {
            const normalizedDate = normalizeDate(e.date);
            if (!normalizedDate) return;
            const d = new Date(normalizedDate);
            d.setHours(0, 0, 0, 0);
            if (d >= monday && d <= sunday) {
                // Normalisiere auch das date-Feld beim Zugriff
                entries.push({ ...e, date: normalizedDate });
            }
        });
        return entries;
    }

    function calcWeekStats(entries) {
        let hours = 0, days = 0, saldo = 0, schoolDays = 0, vacDays = 0, sickDays = 0;
        entries.forEach(e => {
            hours += e.worked || 0;
            saldo += e.diff || 0;
            if (e.type === 'work') days++;
            if (e.type === 'school') { days++; schoolDays++; }
            if (e.type === 'vacation') vacDays++;
            if (e.type === 'sick') sickDays++;
        });
        return { hours, days, saldo, schoolDays, vacDays, sickDays };
    }
