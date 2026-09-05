// ═══ BH-BERICHT ═══
// Datums-Helfer, Bericht anlegen/speichern/bearbeiten/ansehen/loeschen,
// Duplikat, Mehrfachauswahl, Qualitaets-Anzeige.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString((window.mwlLocale ? window.mwlLocale() : document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE'), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function populateYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    const years = [...new Set(reports.map(r => r.year))].sort((a, b) => b - a);
    const currentValue = yearFilter.value;

    // Rebuild options
    yearFilter.innerHTML = '<option value="">Alle Jahre</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}. Ausbildungsjahr`;
        yearFilter.appendChild(option);
    });
    yearFilter.value = currentValue;
}

function filterReports() {
    renderReports();
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Montag einer ISO-Kalenderwoche. Muss die exakte Umkehrung von getWeekNumber()
// sein — die alte Jan-1-Rechnung lag je nach Jahr eine Woche daneben (2026:
// KW 30 → 27.07. statt 20.07.), wodurch Berichte unter falschen Daten landeten.
// Durchgehend UTC, weil toISOString() bei lokalen Mitternachts-Daten in MESZ
// sonst auf den Vortag rutscht.
function isoWeekMonday(year, week) {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dow = jan4.getUTCDay() || 7; // Mo=1 … So=7
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (week - 1) * 7);
    return monday;
}

function getWeekDates(weekNum, year) {
    const monday = isoWeekMonday(year || new Date().getFullYear(), weekNum);
    const friday = new Date(monday);
    friday.setUTCDate(monday.getUTCDate() + 4);
    return {
        monday: monday.toISOString().split('T')[0],
        friday: friday.toISOString().split('T')[0]
    };
}

// ═══════════════════════════════════════
// MODAL OPERATIONS
// ═══════════════════════════════════════

function openNewReportModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Neuen Bericht erstellen';
    document.getElementById('reportForm').reset();

    // Set current week
    const now = new Date();
    const week = getWeekNumber(now);
    document.getElementById('reportWeek').value = week;

    // Set current week dates
    const { monday, friday } = getWeekDates(week);
    document.getElementById('reportDateFrom').value = monday;
    document.getElementById('reportDateTo').value = friday;

    // Restore draft if exists
    restoreDraft();

    // Apply saved mode
    setMode(currentMode);

    document.getElementById('reportModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset quality meter
    updateQualityMeter('');

    // Initialize AI suggestions
    aiUsedChips.clear();
    setTimeout(() => renderAISuggestions(currentMode), 150);
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
    document.body.style.overflow = '';
    editingId = null;
    clearDraft();
}

function closeViewModal() {
    document.getElementById('viewModal').classList.remove('active');
    document.body.style.overflow = '';
}

function closeTemplatesModal() {
    document.getElementById('templatesModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════
// SAVE REPORT
// ═══════════════════════════════════════

function saveReport(event) {
    event.preventDefault();

    // Determine activities based on mode
    let activities = '';
    let dailyActivities = null;
    let dailyHours = null;
    let dailySchool = null;

    if (currentMode === 'daily') {
        dailyActivities = getDailyActivitiesFromForm();
        dailyHours = getDailyHoursFromForm();
        dailySchool = getDailySchoolFromForm();
        // Combine daily texts into a single string for backward compat & search
        activities = combineDailyToWeeklyText(dailyActivities);
    } else {
        activities = document.getElementById('reportActivities').value;
    }

    const report = {
        id: editingId || Date.now().toString(),
        year: parseInt(document.getElementById('reportYear').value),
        week: parseInt(document.getElementById('reportWeek').value),
        dateFrom: document.getElementById('reportDateFrom').value,
        dateTo: document.getElementById('reportDateTo').value,
        department: document.getElementById('reportDepartment').value,
        activities: activities,
        mode: currentMode,
        dailyActivities: dailyActivities,
        dailyHours: dailyHours,
        dailySchool: dailySchool,
        instruction: document.getElementById('reportInstruction').value,
        // #reportSchool ist das WOECHENTLICHE Berufsschulfeld und im Tagesmodus per
        // setMode() ausgeblendet. Wer es dort trotzdem ausliest, druckt einen Block
        // "Berufsschule" in Vorschau und PDF, den im Formular niemand sehen oder
        // aendern kann. Im Tagesmodus traegt der Schalter je Tag (dailySchool) die
        // Angabe — ein zweiter Traeger derselben Tatsache waere nur eine Quelle fuer
        // Widersprueche.
        school: currentMode === 'daily' ? '' : document.getElementById('reportSchool').value,
        hours: parseFloat(document.getElementById('reportHours').value) || 0,
        status: document.getElementById('reportStatus').value,
        createdAt: editingId ? (reports.find(r => r.id === editingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingId) {
        const index = reports.findIndex(r => r.id === editingId);
        if (index !== -1) reports[index] = report;
    } else {
        reports.push(report);
    }

    saveToStorage();
    updateUI();
    closeReportModal();
    clearDraft();

    showToast(editingId ? 'Bericht aktualisiert' : 'Bericht erstellt', 'success');

    // B2B: bei einem Azubi den Bericht in die Betriebs-Tabelle spiegeln.
    // Guard, weil bh-b2b-ui.js nur mit geladenem Supabase-Config etwas tut.
    if (typeof b2bOnReportSaved === 'function') b2bOnReportSaved(report);

    // Confetti on new complete report
    if (!editingId && (report.status === 'complete' || report.status === 'signed')) {
        launchConfetti();
    }
}

// ═══════════════════════════════════════
// EDIT / VIEW / DELETE
// ═══════════════════════════════════════

function editReport(id) {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    // Bestaetigte Wochen sind gesperrt.
    if (bhIsLocked(report)) {
        // Eine SERVERSEITIGE Freigabe (Betriebs-Anbindung) liegt nicht in den
        // eigenen Daten — der Azubi kann sie hier nicht aufheben. Zurueckgeben
        // muss der Ausbilder. Das ist der Kern der Revisionssicherheit und
        // bewusst so: sonst waere die Sperre nur ein Vorschlag.
        if (report.approval && report.approval.server) {
            alert('Diese Woche wurde von ' + (report.approval.by || 'deinem Ausbilder') +
                ' abgezeichnet.\n\nZum Ändern muss dein Ausbilder sie zurückgeben.');
            return;
        }
        // Lokale Freigabe (Link-/QR-Weg): die liegt in den eigenen Daten, der
        // Nutzer kann sie aufheben — die Warnung soll ihn nur davor bewahren,
        // das versehentlich zu tun.
        if (!confirm('Diese Woche wurde von ' + (report.approval.by || 'dem Ausbilder') +
            ' bestätigt und ist deshalb gesperrt.\n\n' +
            'Wenn Sie sie jetzt bearbeiten, entfällt die Bestätigung und die Woche muss erneut freigegeben werden.\n\n' +
            'Trotzdem bearbeiten?')) return;
        delete report.approval;
        report.status = 'complete';
        saveToStorage();
        updateUI();
    }

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Bericht bearbeiten';
    document.getElementById('reportYear').value = report.year;
    document.getElementById('reportWeek').value = report.week;
    document.getElementById('reportDateFrom').value = report.dateFrom;
    document.getElementById('reportDateTo').value = report.dateTo;
    document.getElementById('reportDepartment').value = report.department || '';
    document.getElementById('reportInstruction').value = report.instruction || '';
    document.getElementById('reportSchool').value = report.school || '';
    document.getElementById('reportHours').value = report.hours;
    document.getElementById('reportStatus').value = report.status;

    // Restore mode
    const reportMode = report.mode || 'weekly';
    setMode(reportMode);

    if (reportMode === 'daily' && report.dailyActivities) {
        // Small delay to ensure daily fields are rendered
        setTimeout(() => {
            setDailyFieldsFromData(report.dailyActivities, report.dailyHours, report.dailySchool);
            renderAISuggestions('daily');
        }, 50);
        document.getElementById('reportActivities').value = report.activities || '';
    } else {
        document.getElementById('reportActivities').value = report.activities;
        document.getElementById('charCount').textContent = report.activities.length + ' Zeichen';
        updateQualityMeter(report.activities);
        renderAISuggestions('weekly');
    }

    document.getElementById('reportModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function viewReport(id) {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    const statusText = {
        'incomplete': '<span class="badge badge-warning" style="font-size: 0.8rem; padding: 5px 14px;">In Bearbeitung</span>',
        'complete': '<span class="badge badge-success" style="font-size: 0.8rem; padding: 5px 14px;">Vollständig</span>',
        'signed': '<span class="badge badge-signed" style="font-size: 0.8rem; padding: 5px 14px;">&#10003; Unterschrieben</span>'
    }[report.status];

    const wordCount = (report.activities + ' ' + (report.school || '')).split(/\s+/).filter(w => w.length > 0).length;
    const quality = calculateQuality(report.activities);

    const content = `
                <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);">
                    <h2 style="margin-bottom: 0.5rem; font-size: 1.5rem; letter-spacing: -0.5px;">Ausbildungsnachweis</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">KW ${report.week} • ${report.year}. Ausbildungsjahr</p>
                    <div style="margin-top: 0.75rem;">${statusText}</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">Zeitraum</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">Abteilung</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(report.department || '-')}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">Stunden</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${report.hours || 0} Std.</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">Wörter</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${wordCount}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">Qualität</div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: ${quality >= 80 ? 'var(--success)' : quality >= 50 ? 'var(--warning)' : 'var(--danger)'};">${quality}%</div>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 0.75rem; color: var(--primary); display: flex; align-items: center; gap: 8px;">
                        <svg class="icon" style="width:16px;height:16px"><use href="#i-clipboard"/></svg> Ausgeführte Tätigkeiten
                        ${report.mode === 'daily' ? '<span style="font-size:0.68rem;padding:2px 8px;background:rgba(var(--success-rgb),0.15);color:var(--success);border-radius:5px;font-weight:700;">TÄGLICH / IHK</span>' : '<span style="font-size:0.68rem;padding:2px 8px;background:rgba(var(--primary-rgb),0.15);color:var(--primary);border-radius:5px;font-weight:700;">WÖCHENTLICH</span>'}
                    </h3>
                    ${report.mode === 'daily' && report.dailyActivities ? `
                        <div style="display:flex;flex-direction:column;gap:0.75rem;">
                            ${DAYS.map(day => {
        const isSchool = report.dailySchool && report.dailySchool[day.key];
        const text = report.dailyActivities[day.key];
        const hrs = report.dailyHours ? report.dailyHours[day.key] : null;
        if (!text && !isSchool) return '';

        let displayText = text || '';
        if (isSchool && text) displayText = '[Berufsschule] ' + text;
        else if (isSchool) displayText = 'Berufsschule';

        return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${isSchool ? 'rgba(var(--primary-rgb), 0.4)' : 'var(--border)'};border-radius:var(--radius-sm);overflow:hidden;${isSchool ? 'border-left:3px solid var(--primary);' : ''}">
                                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 1rem;background:${isSchool ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(255,255,255,0.02)'};border-bottom:1px solid var(--border);font-size:0.82rem;font-weight:700;">
                                        <span>${day.name}</span>
                                        ${hrs ? `<span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">${hrs} Std.</span>` : ''}
                                    </div>
                                    <div style="padding:0.75rem 1rem;white-space:pre-wrap;line-height:1.7;font-size:0.88rem;">${escapeHtml(displayText)}</div>
                                </div>`;
    }).join('')}
                        </div>
                    ` : `<div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); white-space: pre-wrap; line-height: 1.8; font-size: 0.92rem;">${escapeHtml(report.activities)}</div>`}
                </div>

                ${report.school ? `
                <div style="margin-bottom: 2rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 0.75rem; color: var(--cyan); display: flex; align-items: center; gap: 8px;">
                        <svg class="icon" style="width:16px;height:16px"><use href="#i-book"/></svg> Berufsschule
                    </h3>
                    <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); white-space: pre-wrap; line-height: 1.8; font-size: 0.92rem;">${escapeHtml(report.school)}</div>
                </div>
                ` : ''}

                <div style="display: flex; gap: 0.75rem; margin-top: 2rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="editReport('${report.id}'); closeViewModal();">
                        <svg class="icon"><use href="#i-edit"/></svg> Bearbeiten
                    </button>
                    <button class="btn btn-secondary" onclick="duplicateReport('${report.id}'); closeViewModal();">
                        <svg class="icon"><use href="#i-copy"/></svg> Duplizieren
                    </button>
                    <button class="btn btn-secondary" onclick="exportReportPDF('${report.id}')">
                        <svg class="icon"><use href="#i-file"/></svg> PDF Export
                    </button>
                    <button class="btn btn-secondary" onclick="window.print()">
                        <svg class="icon"><use href="#i-file"/></svg> Drucken
                    </button>
                </div>
            `;

    document.getElementById('viewContent').innerHTML = content;
    document.getElementById('viewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Brücke für den Altbestand: professionIcon wird im Verlauf gespeichert, dort
// stehen bei Bestandsnutzern noch Emojis. Fertiges <svg> geht durch, bekannte
// Zeichen werden übersetzt, alles andere maskiert — der Wert kommt aus
// localStorage und ist damit Fremdeingabe.
const EMOJI_ICONS = {
    '💻': 'i-code', '🖥️': 'i-server', '🖥': 'i-server',
    '📊': 'i-chart', '⚡': 'i-zap', '🚗': 'i-car',
    '👨‍🍳': 'i-chefhat', '🏥': 'i-pulse',
    '🛒': 'i-cart', '🏗️': 'i-wall', '🏗': 'i-wall',
    '🪚': 'i-hammer', '💇': 'i-scissors', '📦': 'i-package',
    '🎨': 'i-palette', '⚙️': 'i-gear', '⚙': 'i-gear',
    '🌿': 'i-leaf', '🧪': 'i-flask', '🩺': 'i-heartpulse',
    '🏨': 'i-hotel', '🏠': 'i-home', '🔧': 'i-wrench',
    '🎓': 'i-grad', '📋': 'i-clipboard', '🤖': 'i-clipboard',
    '💡': 'i-bulb', '✨': 'i-sparkles', '📖': 'i-bookopen',
};
function bhIcon(value, fallback) {
    const v = (value == null ? '' : String(value)).trim();
    if (v.startsWith('<svg')) return v;
    const id = EMOJI_ICONS[v] || (v ? null : (fallback || 'i-bulb'));
    if (id) return `<svg class="icon"><use href="#${id}"/></svg>`;
    return typeof escapeHtml === 'function' ? escapeHtml(v) : '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function deleteReport(id) {
    const el = document.querySelector(`.report-item[data-id="${id}"]`);
    if (el) { el.classList.add('ais-confirming'); return; }
    // fallback if data-id not found
    if (!confirm('Möchtest du diesen Bericht wirklich löschen?')) return;
    reports = reports.filter(r => r.id !== id);
    saveToStorage(); updateUI(); showToast('Bericht gelöscht', 'info');
}

function cancelDeleteReport(id) {
    const el = document.querySelector(`.report-item[data-id="${id}"]`);
    if (el) el.classList.remove('ais-confirming');
}

function confirmDeleteReport(id) {
    reports = reports.filter(r => r.id !== id);
    saveToStorage(); updateUI(); showToast('Bericht gelöscht', 'info');
}

// ═══════════════════════════════════════
// DUPLICATE REPORT
// ═══════════════════════════════════════

function duplicateReport(id) {
    const original = reports.find(r => r.id === id);
    if (!original) return;

    const newReport = {
        ...original,
        id: Date.now().toString(),
        week: original.week + 1 > 52 ? 1 : original.week + 1,
        status: 'incomplete',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Update dates for next week
    const { monday, friday } = getWeekDates(newReport.week);
    newReport.dateFrom = monday;
    newReport.dateTo = friday;

    reports.push(newReport);
    saveToStorage();
    updateUI();
    showToast('Bericht dupliziert (KW ' + newReport.week + ')', 'success');
}

function duplicateLastReport() {
    if (reports.length === 0) {
        showToast('Kein Bericht zum Duplizieren vorhanden.', 'info');
        return;
    }

    // Find the most recent report
    const sorted = [...reports].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.week - a.week;
    });

    duplicateReport(sorted[0].id);
}

// ═══════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════

function toggleBulkMode() {
    bulkMode = !bulkMode;
    selectedIds.clear();

    const bulkBar = document.getElementById('bulkBar');
    bulkBar.style.display = bulkMode ? 'flex' : 'none';
    document.getElementById('bulkCount').textContent = '0';

    const normalUi = document.getElementById('bulkActionsNormal');
    const confirmUi = document.getElementById('bulkDeleteConfirmUi');
    if (normalUi) normalUi.style.display = 'flex';
    if (confirmUi) confirmUi.style.display = 'none';

    renderReports();
}

function toggleSelect(id) {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);

    document.getElementById('bulkCount').textContent = selectedIds.size;
    renderReports();
}

function toggleSelectAll() {
    const items = document.querySelectorAll('.report-item');
    if (items.length === 0) return;

    let allVisibleSelected = true;
    items.forEach(el => {
        if (!selectedIds.has(el.getAttribute('data-id'))) {
            allVisibleSelected = false;
        }
    });

    if (allVisibleSelected) {
        items.forEach(el => selectedIds.delete(el.getAttribute('data-id')));
    } else {
        items.forEach(el => selectedIds.add(el.getAttribute('data-id')));
    }

    document.getElementById('bulkCount').textContent = selectedIds.size;
    renderReports();
}

function showBulkDeleteConfirm() {
    if (selectedIds.size === 0) return;
    document.getElementById('bulkActionsNormal').style.display = 'none';
    document.getElementById('bulkDeleteConfirmUi').style.display = 'flex';
}

function hideBulkDeleteConfirm() {
    document.getElementById('bulkActionsNormal').style.display = 'flex';
    document.getElementById('bulkDeleteConfirmUi').style.display = 'none';
}

function confirmBulkDelete() {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    reports = reports.filter(r => !selectedIds.has(r.id));
    saveToStorage();
    toggleBulkMode();
    updateUI();
    showToast(`${count} Berichte gelöscht`, 'info');
}

function bulkExportPDF() {
    if (selectedIds.size === 0) return;
    // Open modal for first selected, rest will export directly after confirmation
    const ids = [...selectedIds];
    _pdfCurrentId = ids[0];
    openPDFModal(ids[0]);
    // After user clicks export in modal, executePDFExportAll handles the rest
}

// ═══════════════════════════════════════
// QUALITY METER
// ═══════════════════════════════════════

function calculateQuality(text) {
    if (!text) return 0;
    let score = 0;
    const len = text.length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const bullets = (text.match(/^[•\-\*]/gm) || []).length;
    const hasMultipleLines = text.split('\n').filter(l => l.trim().length > 0).length;

    // Length score (max 30)
    if (len >= 300) score += 30;
    else if (len >= 200) score += 25;
    else if (len >= 100) score += 15;
    else if (len >= 50) score += 8;

    // Word count (max 25)
    if (words >= 60) score += 25;
    else if (words >= 40) score += 20;
    else if (words >= 20) score += 12;
    else if (words >= 10) score += 5;

    // Bullet points (max 20)
    if (bullets >= 5) score += 20;
    else if (bullets >= 3) score += 14;
    else if (bullets >= 1) score += 7;

    // Multiple lines (max 15)
    if (hasMultipleLines >= 5) score += 15;
    else if (hasMultipleLines >= 3) score += 10;
    else if (hasMultipleLines >= 2) score += 5;

    // Specificity bonus: numbers, tools, technologies (max 10)
    const hasNumbers = /\d+/.test(text);
    const hasTechTerms = /API|SQL|HTML|CSS|Python|Java|C\+\+|Server|Datenbank|Framework|Docker|Git|Linux|Windows/i.test(text);
    if (hasNumbers) score += 5;
    if (hasTechTerms) score += 5;

    return Math.min(score, 100);
}

function updateQualityMeter(text) {
    const quality = calculateQuality(text);
    const fill = document.getElementById('qualityBarFill');
    const label = document.getElementById('qualityLabel');

    fill.style.width = quality + '%';
    label.textContent = quality + '%';

    if (quality >= 80) {
        fill.style.background = 'linear-gradient(90deg, var(--success), #22d3ee)';
        label.style.color = 'var(--success)';
    } else if (quality >= 50) {
        fill.style.background = 'linear-gradient(90deg, var(--warning), #fbbf24)';
        label.style.color = 'var(--warning)';
    } else {
        fill.style.background = 'linear-gradient(90deg, var(--danger), #f87171)';
        label.style.color = 'var(--danger)';
    }
}

