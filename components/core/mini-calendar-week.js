// ═══ CORE: MINI-CALENDAR-WEEK ═══
    // ============================================
    // FEATURE: MINI CALENDAR WIDGET
    // ============================================
    // miniCalNav() + miniCalViewMonth/Year sind mit v6.3.5 entfallen: sie waren
    // ein ZWEITER Monatszustand neben dem Dropdown der Monatsansicht, und die
    // beiden liefen auseinander. Jetzt gibt es dort genau einen (mcNav).
    // Von Monats- und Jahresansicht aus liegt das Erfassen-Formular in einem
    // ausgeblendeten Tab — `scrollIntoView` auf ein `display:none`-Element tut
    // nichts. Deshalb erst den Tab wechseln, dann das Datum setzen.
    function mwlOpenDayInForm(dateStr) {
        if (typeof switchTab === 'function') switchTab('dashboard');
        setTimeout(function () { miniCalDayClick(dateStr); }, 60);
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
    // Der Wochen-Zustand (weekViewOffset/weekViewNavigate) ist mit v6.3.7 nach
    // weekview.js gezogen — dort heisst er wvOffset/wvNav und ist an den
    // Datenbestand gebunden, statt endlos ins Leere zu blaettern.
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

    // calcWeekStats() stand hier bis v6.3.7. Sie zaehlte `days++` je EINTRAG
    // statt je Tag — ein Tag mit geteilter Schicht galt damit als zwei
    // Arbeitstage, und Schultage erhoehten den Zaehler zusaetzlich. Die
    // Wochenansicht aggregiert jetzt ueber calculateMonthStats(), also
    // dieselbe Quelle wie Monats- und Jahresansicht.
