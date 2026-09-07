// ═══ BH-ZEITERFASSUNG ═══
// Uebernahme erfasster Zeiten aus der Haupt-App (tg_pro_data) in die Tagesfelder.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════
// AUTO-FILL FROM TIMETRACKER
// ═══════════════════════════════════════

// Eine erfasste Woche → Text pro Wochentag. Nutzt die Tracking-Pipe des AI Studios,
// damit Bulk-Import und Modal-Button exakt dasselbe Ergebnis liefern.
// Liefert {texts:{monday:'…'}, hours:{monday:7.5}, total, found}
function _trackingToDailyText(kw, year) {
    const empty = { texts: {}, hours: {}, total: 0, found: 0 };

    // AIStudio ist ein const weiter unten im selben Script — beim Aufruf längst
    // initialisiert, aber der TDZ-Zugriff soll nie den ganzen Import reißen.
    let week = null;
    try { week = AIStudio.loadTrackingForWeek(kw, year); } catch (e) { return empty; }
    if (!week || !week.hasData) return empty;

    const STATUS_TEXT = {
        urlaub: L('URLAUB', 'VACATION'),
        krank: L('KRANK', 'SICK'),
        feiertag: L('FEIERTAG', 'PUBLIC HOLIDAY'),
    };
    const texts = {}, hours = {};
    let total = 0;

    DAYS.forEach((d, i) => {
        const day = week.perDay[i];
        if (!day) { texts[d.key] = ''; hours[d.key] = 0; return; }

        hours[d.key] = day.hours;
        total += day.hours;

        const noActivity = L('keine Tätigkeiten', 'no activities');
        if (day.status && STATUS_TEXT[day.status]) {
            texts[d.key] = `— ${STATUS_TEXT[day.status]} — ${noActivity}`;
            return;
        }
        if (day.isFrei) { texts[d.key] = `— ${L('GLEITTAG', 'FLEX DAY')} — ${noActivity}`; return; }

        const lines = day.items.map(it =>
            it.kind === 'notiz' ? '• ' + it.text : `• ${it.label}: ${it.text}`
        );
        if (lines.length === 0 && day.isSchool) {
            lines.push(L('• Berufsschule besucht', '• Attended vocational school'));
        }
        texts[d.key] = lines.join('\n');
    });

    return { texts, hours, total: Math.round(total * 100) / 100, found: week.total, days: week.days };
}

// Modal-Button „Aus Zeiterfassung füllen" — füllt die Tagesfelder der eingestellten KW.
function fillDailyFromTracking() {
    const kw = parseInt(document.getElementById('reportWeek')?.value, 10) || getWeekNumber(new Date());
    const year = new Date().getFullYear();
    const { texts, hours, total, found, days } = _trackingToDailyText(kw, year);

    if (!days) {
        showToast(L(`Für KW ${kw} sind keine Zeiten erfasst.`, `No times logged for week ${kw}.`), 'info');
        return;
    }

    let filled = 0;
    DAYS.forEach((d, i) => {
        const ta = document.getElementById(`daily_${i}`);
        if (ta && texts[d.key]) {
            // Bestehenden Text nicht überschreiben, sondern ergänzen
            ta.value = ta.value.trim() ? ta.value.trim() + '\n' + texts[d.key] : texts[d.key];
            ta.dispatchEvent(new Event('input'));
            filled++;
        }
        const inp = document.getElementById(`daily_hours_${i}`);
        if (inp && hours[d.key] > 0) inp.value = hours[d.key];
    });

    if (typeof updateDailyTotalHours === 'function') updateDailyTotalHours();

    showToast(found > 0
        ? L(`KW ${kw}: ${found} Angaben aus ${days} Tagen übernommen`,
            `Week ${kw}: ${found} details from ${days} days taken over`)
        : L(`KW ${kw}: ${total} Std. übernommen — keine Projekte oder Notizen hinterlegt`,
            `Week ${kw}: ${total} hrs taken over — no projects or notes recorded`),
        found > 0 ? 'success' : 'info');
}

function autoFillFromTimeTracker() {
    const timeTrackerData = localStorage.getItem('tg_pro_data');
    if (!timeTrackerData) {
        showToast('Keine TimeTracker-Daten gefunden.', 'error');
        return;
    }

    let data;
    try {
        data = JSON.parse(timeTrackerData);
    } catch (e) {
        showToast('Fehler beim Lesen der TimeTracker-Daten.', 'error');
        return;
    }
    const entries = data.entries || [];

    if (entries.length === 0) {
        showToast('Keine Einträge im TimeTracker.', 'info');
        return;
    }

    // Group entries by week
    const weekGroups = {};
    entries.forEach(entry => {
        const date = new Date(entry.date);
        const week = getWeekNumber(date);
        const key = `${date.getFullYear()}-${week}`;

        if (!weekGroups[key]) {
            weekGroups[key] = { week, year: date.getFullYear(), entries: [], totalHours: 0 };
        }
        weekGroups[key].entries.push(entry);
        weekGroups[key].totalHours += entry.worked || 0;
    });

    let imported = 0;
    Object.values(weekGroups).forEach(group => {
        const exists = reports.some(r => r.week === group.week);
        if (exists) return;

        const { monday, friday } = getWeekDates(group.week, group.year);

        // Projekte, Notizen und Custom-Fields pro Tag statt „• Arbeitszeit erfasst".
        const daily = _trackingToDailyText(group.week, group.year);
        const hasContent = daily.found > 0;
        const activities = hasContent
            ? combineDailyToWeeklyText(daily.texts)
            : '• Arbeitszeiten wurden erfasst';

        reports.push({
            id: Date.now().toString() + imported,
            year: 1,
            week: group.week,
            dateFrom: monday,
            dateTo: friday,
            department: '',
            activities: activities,
            // Im Tagesmodus anlegen, wenn echte Tagesinhalte da sind — sonst bleibt
            // der Bericht ein Textblock und die Tagesfelder wären beim Öffnen leer.
            mode: hasContent ? 'daily' : 'weekly',
            dailyActivities: hasContent ? daily.texts : null,
            dailyHours: hasContent ? daily.hours : null,
            school: '',
            hours: hasContent ? daily.total : group.totalHours,
            status: 'incomplete',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        imported++;
    });

    if (imported > 0) {
        saveToStorage();
        updateUI();
        showToast(`${imported} Berichte importiert`, 'success');
        launchConfetti();
    } else {
        showToast('Alle Wochen bereits dokumentiert.', 'info');
    }
}

