// ═══ BH-UEBERSICHT ═══
// Laden und Speichern der Berichte, Kennzahlen, Streak, Fortschritt,
// Kalender-Heatmap und die Berichtsliste.
// Herausgeloest aus pages/berichtsheft/index.html.


// ═══════════════════════════════════════
// CORE DATA OPERATIONS
// ═══════════════════════════════════════

function loadReports() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        reports = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Fehler beim Laden:', e);
        reports = [];
    }
    updateUI();
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
        showAutoSave();
        // Der Umfrage-Banner erscheint erst ab dem ersten Bericht und wird
        // sonst nur beim Laden ausgewertet — hier nachziehen, damit er nicht
        // bis zum naechsten Aufruf wartet. Name gegengeprueft:
        // components/umfrage/umfrage.js setzt window.umfApplyBanner.
        if (typeof umfApplyBanner === 'function') umfApplyBanner();
    } catch (e) {
        console.error('Fehler beim Speichern:', e);
        showToast('Speichern fehlgeschlagen', 'error');
    }
}

function updateUI() {
    updateStats();
    renderReports();
    populateYearFilter();
    updateStreak();
    updateProgress();
    renderCalendarHeatmap();
    updateDepartmentSuggestions();
    // Show bulk toggle if there are reports
    const bulkToggle = document.getElementById('bulkToggle');
    if (bulkToggle) bulkToggle.style.display = reports.length > 1 ? 'block' : 'none';
}

// ═══════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════

function animateCounter(el, target, suffix = '') {
    const start = parseInt(el.textContent) || 0;
    const duration = 600;
    const startTime = performance.now();

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ═══════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════

function updateStats() {
    const totalReports = reports.length;
    const uniqueWeeks = new Set(reports.map(r => `${r.year}-${r.week}`)).size;
    const completeReports = reports.filter(r => r.status === 'complete' || r.status === 'signed').length;
    const completionRate = totalReports > 0 ? Math.round((completeReports / totalReports) * 100) : 0;

    const totalWords = reports.reduce((sum, r) => {
        const words = (r.activities + ' ' + (r.school || '')).split(/\s+/).filter(w => w.length > 0).length;
        return sum + words;
    }, 0);
    // Die Karte heißt "Ø Wörter/Woche" — also durch Wochen teilen, nicht durch
    // Berichte. Bei zwei Berichten für dieselbe Woche wich das vorher ab.
    const avgWords = uniqueWeeks > 0 ? Math.round(totalWords / uniqueWeeks) : 0;
    const signedReports = reports.filter(r => r.status === 'signed').length;

    // Animate counters
    animateCounter(document.getElementById('signedReports'), signedReports);
    animateCounter(document.getElementById('totalWeeks'), uniqueWeeks);
    animateCounter(document.getElementById('completionRate'), completionRate, '%');
    animateCounter(document.getElementById('avgWordsPerWeek'), avgWords);
}

// ═══════════════════════════════════════
// STREAK CALCULATION
// ═══════════════════════════════════════

function updateStreak() {
    if (reports.length === 0) {
        document.getElementById('streakNum').textContent = '0';
        return;
    }

    // Find all documented weeks as "year-week" keys, sorted descending
    const weekKeys = [...new Set(reports.map(r => {
        const y = new Date().getFullYear(); // Simplify: use current year context
        return r.year * 100 + r.week;
    }))].sort((a, b) => b - a);

    // Current week
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    let streak = 0;
    let checkWeek = currentWeek;

    // Count consecutive weeks backwards
    for (let i = 0; i < 200; i++) {
        const found = reports.some(r => r.week === checkWeek);
        if (found) {
            streak++;
            checkWeek--;
            if (checkWeek <= 0) checkWeek = 52; // wrap around
        } else {
            break;
        }
    }

    const el = document.getElementById('streakNum');
    animateCounter(el, streak);

    // Fire animation intensity based on streak
    const fire = document.querySelector('.streak-fire');
    if (streak >= 10) fire.style.fontSize = '2.5rem';
    else if (streak >= 5) fire.style.fontSize = '2.2rem';
}

// ═══════════════════════════════════════
// PROGRESS TRACKING
// ═══════════════════════════════════════

function updateProgress() {
    // 3-year apprenticeship = ~156 weeks, 2-year = ~104
    const maxWeeks = 156;
    const documentedWeeks = new Set(reports.map(r => `${r.year}-${r.week}`)).size;
    const percent = Math.min(Math.round((documentedWeeks / maxWeeks) * 100), 100);

    // Progress ring
    const ring = document.getElementById('progressRing');
    const circumference = 2 * Math.PI * 22; // r=22
    const offset = circumference - (percent / 100) * circumference;
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;

    // Progress text
    document.getElementById('progressPercent').textContent = percent + '%';

    // Progress bar
    document.getElementById('progressBarFill').style.width = percent + '%';

    // Sub text
    document.getElementById('progressSub').textContent = `${documentedWeeks} von ${maxWeeks} Wochen dokumentiert`;
}

// ═══════════════════════════════════════
// CALENDAR HEATMAP
// ═══════════════════════════════════════

// Ein Jahr hat 52 ODER 53 ISO-Wochen: 53, wenn der 1. Januar ein Donnerstag ist
// oder in einem Schaltjahr ein Mittwoch. 2026 hat 53 — mit der festen 52 fiel
// die letzte Woche des Jahres aus dem Streifen.
function isoWeeksInYear(year) {
    const jan1 = new Date(year, 0, 1).getDay();
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return (jan1 === 4 || (leap && jan1 === 3)) ? 53 : 52;
}

// report.year ist das AUSBILDUNGSjahr (1/2/3), nicht das Kalenderjahr — der
// Streifen muss das Kalenderjahr aus dateFrom lesen, sonst leuchtet KW 35 aus 2025
// im Jahr 2026 mit.
function reportCalendarYear(r) {
    const y = parseInt(String(r.dateFrom || '').slice(0, 4), 10);
    return Number.isFinite(y) ? y : null;
}

function renderCalendarHeatmap() {
    const grid = document.getElementById('calendarGrid');
    const nowYear = new Date().getFullYear();

    // Standard ist das laufende Jahr. Liegt darin nichts, aber in einem früheren,
    // wird das jüngste Jahr mit Berichten gezeigt — die Überschrift nennt es.
    const years = [...new Set(reports.map(reportCalendarYear).filter(Boolean))];
    const year = (years.includes(nowYear) || !years.length) ? nowYear : Math.max(...years);
    document.getElementById('calendarYear').textContent = year;

    const weekMap = {};
    reports.forEach(r => {
        const ry = reportCalendarYear(r);
        if (ry !== null && ry !== year) return;
        const existing = weekMap[r.week];
        if (!existing || statusPriority(r.status) > statusPriority(existing)) {
            weekMap[r.week] = r.status;
        }
    });

    const STATUS_TEXT = { signed: 'Unterschrieben', complete: 'Vollständig', incomplete: 'Entwurf' };
    const STATUS_CLASS = { signed: 'signed', complete: 'complete', incomplete: 'draft' };
    const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const totalWeeks = isoWeeksInYear(year);
    const currentWeek = year === nowYear ? getWeekNumber(new Date()) : -1;

    // Jede Woche gehört zu dem Monat, in dem ihr Donnerstag liegt (ISO-Regel).
    // isoWeekMonday() (bh-bericht.js) liefert UTC-Mitternacht, also wird hier auch
    // in UTC gerechnet. Mit getDate()/getMonth() stimmte es nur östlich von
    // Greenwich zufällig; westlich davon wäre jede Woche einen Tag zu früh.
    const buckets = MONTHS.map(() => []);
    for (let w = 1; w <= totalWeeks; w++) {
        const thursday = isoWeekMonday(year, w);
        thursday.setUTCDate(thursday.getUTCDate() + 3);
        buckets[thursday.getUTCMonth()].push(w);
    }

    grid.innerHTML = buckets.map((weeks, m) => {
        if (!weeks.length) return '';
        const cells = weeks.map(w => {
            const status = weekMap[w] || null;
            const mon = isoWeekMonday(year, w);
            const label = `KW ${w} (ab ${mon.getUTCDate()}.${mon.getUTCMonth() + 1}.) — ${status ? STATUS_TEXT[status] : 'kein Bericht'}`;
            return `<button type="button" class="cal-cell${status ? ' ' + STATUS_CLASS[status] : ''}${w === currentWeek ? ' is-now' : ''}" data-week="${w}" tabindex="-1" aria-label="${label}" onclick="openWeek(${w})"><span class="cal-cell-tooltip">${label}</span></button>`;
        }).join('');
        return `<div class="cal-month" style="flex-grow:${weeks.length}"><span class="cal-month-label">${MONTHS[m]}</span><div class="cal-month-weeks">${cells}</div></div>`;
    }).join('');

    // Rollender Fokus: nur EINE Zelle liegt in der Tab-Reihenfolge, innerhalb wird
    // mit den Pfeiltasten gewandert. 53 Tabstopps vor dem ersten Knopf wären
    // sonst für Tastaturnutzer eine Zumutung.
    const cells = [...grid.querySelectorAll('.cal-cell')];
    const start = cells.find(c => c.classList.contains('is-now')) || cells[0];
    if (start) start.tabIndex = 0;
    grid.onkeydown = (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
        if (step === undefined) return;
        const i = cells.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        const next = cells[Math.max(0, Math.min(cells.length - 1, i + step))];
        cells.forEach(c => { c.tabIndex = -1; });
        next.tabIndex = 0;
        next.focus();
    };
}

function statusPriority(status) {
    return { 'incomplete': 1, 'complete': 2, 'signed': 3 }[status] || 0;
}

// Hieß filterByWeek und filterte nichts: die Funktion öffnete einen Bericht
// und leerte dabei Suchfeld, Jahr- und Status-Filter des Nutzers als Nebenwirkung.
function openWeek(week) {
    const filtered = reports.filter(r => r.week === week);
    if (filtered.length > 0) {
        viewReport(filtered[0].id);
    } else {
        // Open new report for this week
        openNewReportModal();
        document.getElementById('reportWeek').value = week;
        const { monday, friday } = getWeekDates(week);
        document.getElementById('reportDateFrom').value = monday;
        document.getElementById('reportDateTo').value = friday;
    }
}

// ═══════════════════════════════════════
// RENDER REPORTS
// ═══════════════════════════════════════

function renderReports() {
    const list = document.getElementById('reportList');
    const emptyState = document.getElementById('emptyState');
    const reportCount = document.getElementById('reportCount');

    // Filters
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const yearFilter = document.getElementById('yearFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const sortOrder = document.getElementById('sortOrder')?.value || 'newest';

    let filtered = reports.filter(r => {
        // Search in activities AND dailyActivities
        let searchableText = (r.activities || '').toLowerCase();
        if (r.dailyActivities) {
            Object.values(r.dailyActivities).forEach(t => searchableText += ' ' + (t || '').toLowerCase());
        }
        const matchesSearch = searchableText.includes(searchTerm) ||
            (r.department && r.department.toLowerCase().includes(searchTerm)) ||
            `kw ${r.week}`.includes(searchTerm);
        const matchesYear = !yearFilter || r.year.toString() === yearFilter;
        const matchesStatus = !statusFilter || r.status === statusFilter;
        return matchesSearch && matchesYear && matchesStatus;
    });

    // Sort
    switch (sortOrder) {
        case 'newest':
            filtered.sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.week - a.week;
            });
            break;
        case 'oldest':
            filtered.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.week - b.week;
            });
            break;
        case 'week-asc':
            filtered.sort((a, b) => a.week - b.week);
            break;
        case 'week-desc':
            filtered.sort((a, b) => b.week - a.week);
            break;
    }

    if (filtered.length === 0) {
        list.innerHTML = '';
        emptyState.style.display = 'block';
        reportCount.textContent = '0 Berichte';
        return;
    }

    emptyState.style.display = 'none';
    reportCount.textContent = `${filtered.length} Bericht${filtered.length !== 1 ? 'e' : ''}`;

    list.innerHTML = filtered.map((report, index) => {
        const statusBadge = {
            'incomplete': '<span class="badge badge-warning">In Bearbeitung</span>',
            'complete': '<span class="badge badge-success">Vollständig</span>',
            'signed': '<span class="badge badge-signed">&#10003; Unterschrieben</span>'
        }[report.status];

        const wordCount = (report.activities + ' ' + (report.school || '')).split(/\s+/).filter(w => w.length > 0).length;
        const isSelected = selectedIds.has(report.id);
        const modeBadge = report.mode === 'daily'
            ? '<span style="font-size:0.6rem;padding:1px 5px;background:rgba(var(--success-rgb),0.15);color:var(--success);border-radius:4px;font-weight:700;">TÄGLICH</span>'
            : '<span style="font-size:0.6rem;padding:1px 5px;background:rgba(var(--primary-rgb),0.15);color:var(--primary);border-radius:4px;font-weight:700;">WÖCHENTL.</span>';

        return `
                    <div class="report-item visible" data-id="${report.id}"
                         onclick="${bulkMode ? `toggleSelect('${report.id}')` : `viewReport('${report.id}')`}"
                         ${isSelected ? 'style="border-color: var(--primary); background: rgba(var(--primary-rgb), 0.08);"' : ''}>
                        ${bulkMode ? `<div style="display:flex;align-items:center;"><input type="checkbox" ${isSelected ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--primary);cursor:pointer;"></div>` : ''}
                        <div class="report-week">
                            KW ${report.week}<br>
                            <small style="font-size: 0.65rem; opacity: 0.8;">${report.year}. Jahr</small>
                        </div>
                        <div class="report-content">
                            <div class="report-title">
                                ${escapeHtml(report.department || 'Ausbildungsnachweis')}
                            </div>
                            <div class="report-meta">
                                <span><svg class="icon" style="width:12px;height:12px"><use href="#i-calendar"/></svg> ${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}</span>
                                <span><svg class="icon" style="width:12px;height:12px"><use href="#i-clock"/></svg> ${report.hours || 0} Std.</span>
                                <span><svg class="icon" style="width:12px;height:12px"><use href="#i-edit"/></svg> ${wordCount} Wörter</span>
                                ${modeBadge}
                                ${statusBadge}
                                ${bhApprovalBadge(report)}
                            </div>
                            ${bhApprovalNote(report)}
                        </div>
                        ${!bulkMode ? `
                        <div class="report-actions" onclick="event.stopPropagation()">
                            <button class="btn-icon" onclick="openFreigabeModal('${report.id}')" title="Freigabe durch Ausbilder"><svg class="icon"><use href="#i-tie"/></svg></button>
                            <button class="btn-icon" onclick="editReport('${report.id}')" title="Bearbeiten"><svg class="icon"><use href="#i-edit"/></svg></button>
                            <button class="btn-icon success" onclick="duplicateReport('${report.id}')" title="Duplizieren"><svg class="icon"><use href="#i-copy"/></svg></button>
                            <button class="btn-icon" onclick="exportReportPDF('${report.id}')" title="Als PDF exportieren"><svg class="icon"><use href="#i-file"/></svg></button>
                            <button class="btn-icon danger" onclick="deleteReport('${report.id}')" title="Löschen"><svg class="icon"><use href="#i-trash"/></svg></button>
                        </div>
                        <div class="ais-del-confirm-strip" onclick="event.stopPropagation()">
                            <span class="ais-del-confirm-label">Löschen?</span>
                            <button class="ais-del-btn-nein" onclick="cancelDeleteReport('${report.id}')">Nein</button>
                            <button class="ais-del-btn-ja" onclick="confirmDeleteReport('${report.id}')">Ja</button>
                        </div>` : ''}
                    </div>
                `;
    }).join('');

}

