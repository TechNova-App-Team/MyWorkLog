// ═══ CORE: DASHBOARD-EXTRAS ═══

    // Serien-Helfer fuer calculateStreak() (dashboard.js).
    function getLastWorkday(date) {
        const d = new Date(date);
        const dow = d.getDay();
        if (dow === 0) d.setDate(d.getDate() - 2); // Sonntag → Freitag
        else if (dow === 6) d.setDate(d.getDate() - 1); // Samstag → Freitag
        else {
            d.setDate(d.getDate() - 1);
            if (d.getDay() === 0) d.setDate(d.getDate() - 2);
            else if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        }
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function isConsecutiveWorkDay(date1, date2) {
        // date1 = neueres Datum, date2 = älteres Datum (sorted desc)
        const diffDays = Math.round((date1 - date2) / 864e5);
        if (diffDays === 1) return true;
        if (diffDays === 3 && date2.getDay() === 5) return true; // Freitag→Montag
        return false;
    }

    // Meldung bei einer neuen Bestserie, hoechstens einmal je Tag und Stand.
    // Tagesschluessel aus den LOKALEN Datumsteilen: toISOString() waere in MESZ
    // bis 2 Uhr noch der Vortag.
    function updateStreakCounter() {
        if (typeof calculateStreak !== 'function') return;
        const streak = calculateStreak();
        if (!(streak.current > 1 && streak.current === streak.best)) return;
        const n = new Date(), today = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
        const lastDate = localStorage.getItem('mwl_last_streak_notification_date');
        const lastValue = parseInt(localStorage.getItem('mwl_last_streak_notification_value') || '0', 10);
        if (lastDate === today && lastValue >= streak.best) return;
        const en = document.documentElement.lang === 'en';
        showSmartNotification(en ? 'New best streak' : 'Neue Bestserie',
            en ? streak.current + ' days in a row on target.' : streak.current + ' Tage in Folge Soll erfüllt.', 'success');
        localStorage.setItem('mwl_last_streak_notification_date', today);
        localStorage.setItem('mwl_last_streak_notification_value', String(streak.best));
    }
