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
    document.getElementById('modalTitle').textContent = L('Neuen Bericht erstellen', 'Create new report');
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

    showToast(editingId ? L('Bericht aktualisiert', 'Report updated') : L('Bericht erstellt', 'Report created'), 'success');

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

async function editReport(id) {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    // Bestaetigte Wochen sind gesperrt.
    if (bhIsLocked(report)) {
        // Eine SERVERSEITIGE Freigabe (Betriebs-Anbindung) liegt nicht in den
        // eigenen Daten — der Azubi kann sie hier nicht aufheben. Zurueckgeben
        // muss der Ausbilder. Das ist der Kern der Revisionssicherheit und
        // bewusst so: sonst waere die Sperre nur ein Vorschlag.
        if (report.approval && report.approval.server) {
            await bhAlert(L('Diese Woche ist abgezeichnet', 'This week has been signed off'),
                (report.approval.by || L('Dein Ausbilder', 'Your trainer'))
                + L(' hat die Woche bestätigt. Zum Ändern muss dein Ausbilder sie erst zurückgeben.',
                    ' has approved this week. To change it, your trainer has to return it first.'));
            return;
        }
        // Lokale Freigabe (Link-/QR-Weg): die liegt in den eigenen Daten, der
        // Nutzer kann sie aufheben — die Warnung soll ihn nur davor bewahren,
        // das versehentlich zu tun.
        const weiter = await bhConfirm({
            title: L('Bestätigte Woche bearbeiten?', 'Edit an approved week?'),
            text: (report.approval.by || L('Der Ausbilder', 'The trainer'))
                + L(' hat diese Woche bestätigt. Beim Bearbeiten entfällt die Bestätigung, und die Woche muss erneut freigegeben werden.',
                    ' has approved this week. Editing removes the approval, and the week has to be approved again.'),
            confirmText: L('Trotzdem bearbeiten', 'Edit anyway')
        });
        if (!weiter) return;
        delete report.approval;
        report.status = 'complete';
        saveToStorage();
        updateUI();
    }

    editingId = id;
    document.getElementById('modalTitle').textContent = L('Bericht bearbeiten', 'Edit report');
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
        const dailyText = Object.values(report.dailyActivities).join('\n').trim();
        updateQualityMeter(dailyText);
    } else {
        document.getElementById('reportActivities').value = report.activities;
        document.getElementById('charCount').textContent = report.activities.length + L(' Zeichen', ' characters');
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
        'incomplete': `<span class="badge badge-warning" style="font-size: 0.8rem; padding: 5px 14px;">${L('In Bearbeitung', 'In progress')}</span>`,
        'complete': `<span class="badge badge-success" style="font-size: 0.8rem; padding: 5px 14px;">${L('Vollständig', 'Complete')}</span>`,
        'signed': `<span class="badge badge-signed" style="font-size: 0.8rem; padding: 5px 14px;">&#10003; ${L('Unterschrieben', 'Signed')}</span>`
    }[report.status];

    const textForStats = report.mode === 'daily' 
        ? Object.values(report.dailyActivities || {}).join('\n').trim() 
        : report.activities;
        
    const wordCount = (textForStats + ' ' + (report.school || '')).split(/\s+/).filter(w => w.length > 0).length;
    const quality = calculateQuality(textForStats);

    const content = `
                <div style="text-align: center; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border);">
                    <h2 style="margin-bottom: 0.5rem; font-size: 1.5rem; letter-spacing: -0.5px;">${L('Ausbildungsnachweis', 'Training record')}</h2>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">${L(`KW ${report.week} • ${report.year}. Ausbildungsjahr`, `CW ${report.week} • Training year ${report.year}`)}</p>
                    <div style="margin-top: 0.75rem;">${statusText}</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; padding: 1.5rem; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm); border: 1px solid var(--border);">
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">${L('Zeitraum', 'Period')}</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">${L('Abteilung', 'Department')}</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(report.department || '-')}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">${L('Stunden', 'Hours')}</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${report.hours || 0} ${L('Std.', 'hrs')}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">${L('Wörter', 'Words')}</div>
                        <div style="font-weight: 600; font-size: 0.95rem;">${wordCount}</div>
                    </div>
                    <div>
                        <div style="color: var(--text-muted); font-size: 0.78rem; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.3px;">${L('Qualität', 'Quality')}</div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: ${quality >= 80 ? 'var(--success)' : quality >= 50 ? 'var(--warning)' : 'var(--danger)'};">${quality}%</div>
                    </div>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h3 style="font-size: 1rem; margin-bottom: 0.75rem; color: var(--primary); display: flex; align-items: center; gap: 8px;">
                        <svg class="icon" style="width:16px;height:16px"><use href="#i-clipboard"/></svg> ${L('Ausgeführte Tätigkeiten', 'Activities carried out')}
                        ${report.mode === 'daily' ? `<span style="font-size:0.68rem;padding:2px 8px;background:rgba(var(--success-rgb),0.15);color:var(--success);border-radius:5px;font-weight:700;">${L('TÄGLICH / IHK', 'DAILY / IHK')}</span>` : `<span style="font-size:0.68rem;padding:2px 8px;background:rgba(var(--primary-rgb),0.15);color:var(--primary);border-radius:5px;font-weight:700;">${L('WÖCHENTLICH', 'WEEKLY')}</span>`}
                    </h3>
                    ${report.mode === 'daily' && report.dailyActivities ? `
                        <div style="display:flex;flex-direction:column;gap:0.75rem;">
                            ${DAYS.map(day => {
        const isSchool = report.dailySchool && report.dailySchool[day.key];
        const text = report.dailyActivities[day.key];
        const hrs = report.dailyHours ? report.dailyHours[day.key] : null;
        if (!text && !isSchool) return '';

        let displayText = text || '';
        if (isSchool && text) displayText = L('[Berufsschule] ', '[Vocational school] ') + text;
        else if (isSchool) displayText = L('Berufsschule', 'Vocational school');

        return `<div style="background:rgba(255,255,255,0.03);border:1px solid ${isSchool ? 'rgba(var(--primary-rgb), 0.4)' : 'var(--border)'};border-radius:var(--radius-sm);overflow:hidden;${isSchool ? 'border-left:3px solid var(--primary);' : ''}">
                                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 1rem;background:${isSchool ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(255,255,255,0.02)'};border-bottom:1px solid var(--border);font-size:0.82rem;font-weight:700;">
                                        <span>${day.name}</span>
                                        ${hrs ? `<span style="font-size:0.75rem;color:var(--text-muted);font-family:var(--font-mono);">${hrs} ${L('Std.', 'hrs')}</span>` : ''}
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
                        <svg class="icon" style="width:16px;height:16px"><use href="#i-book"/></svg> ${L('Berufsschule', 'Vocational school')}
                    </h3>
                    <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border); white-space: pre-wrap; line-height: 1.8; font-size: 0.92rem;">${escapeHtml(report.school)}</div>
                </div>
                ` : ''}

                <div id="viewFreigabeVerlauf"></div>

                <div style="display: flex; gap: 0.75rem; margin-top: 2rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="editReport('${report.id}'); closeViewModal();">
                        <svg class="icon"><use href="#i-edit"/></svg> ${L('Bearbeiten', 'Edit')}
                    </button>
                    <button class="btn btn-secondary" onclick="duplicateReport('${report.id}'); closeViewModal();">
                        <svg class="icon"><use href="#i-copy"/></svg> ${L('Duplizieren', 'Duplicate')}
                    </button>
                    <button class="btn btn-secondary" onclick="exportReportPDF('${report.id}')">
                        <svg class="icon"><use href="#i-file"/></svg> ${L('PDF Export', 'PDF export')}
                    </button>
                    <button class="btn btn-secondary" onclick="window.print()">
                        <svg class="icon"><use href="#i-file"/></svg> ${L('Drucken', 'Print')}
                    </button>
                </div>
            `;

    document.getElementById('viewContent').innerHTML = content;
    document.getElementById('viewModal').classList.add('active');
    document.body.style.overflow = 'hidden';

    // B2B: Freigabe-Verlauf vom Server nachladen (nur wenn mit einem Betrieb
    // verbunden). Guard, weil bh-b2b-ui.js nur mit Supabase-Config laeuft.
    if (typeof b2bFuelleFreigabeVerlauf === 'function') b2bFuelleFreigabeVerlauf(report);
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

async function deleteReport(id) {
    const el = document.querySelector(`.report-item[data-id="${id}"]`);
    if (el) { el.classList.add('ais-confirming'); return; }
    // fallback if data-id not found
    const ok = await bhConfirm({
        title: L('Bericht löschen?', 'Delete report?'),
        text: L('Der Eintrag wird in den Papierkorb verschoben und nach 30 Tagen endgültig gelöscht.',
            'The entry is moved to the trash and permanently deleted after 30 days.'),
        confirmText: L('In Papierkorb verschieben', 'Move to trash')
    });
    if (!ok) return;
    entferneBericht(id);
}

function cancelDeleteReport(id) {
    const el = document.querySelector(`.report-item[data-id="${id}"]`);
    if (el) el.classList.remove('ais-confirming');
}

function confirmDeleteReport(id) {
    entferneBericht(id);
}

// Beide Loeschwege laufen hier zusammen.
// Verschiebt den Bericht in den Papierkorb (Soft-Delete) und benachrichtigt die Cloud.
function entferneBericht(id) {
    const reportToDelete = reports.find(r => r.id === id);
    if (!reportToDelete) return;

    // 1. In Papierkorb schieben
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    trash.push({
        report: reportToDelete,
        deletedAt: new Date().toISOString()
    });
    if (typeof saveTrash === 'function') saveTrash(trash);

    // 2. Aus aktiver Liste entfernen
    reports = reports.filter(r => r.id !== id);
    saveToStorage();
    updateUI();
    if (typeof updateTrashBadge === 'function') updateTrashBadge();

    // 3. Toast mit Undo-Option
    showToast(L('Bericht in den Papierkorb verschoben', 'Report moved to trash'), 'info', {
        label: L('Rückgängig', 'Undo'),
        onClick: () => restoreReport(id)
    });

    // 4. Cloud benachrichtigen (Soft-Delete)
    if (typeof b2bOnReportDeleted === 'function') b2bOnReportDeleted(id);
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
    showToast(L('Bericht dupliziert (KW ', 'Report duplicated (CW ') + newReport.week + ')', 'success');
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
    const toDelete = reports.filter(r => selectedIds.has(r.id));
    const deletedIds = toDelete.map(r => r.id);

    // 1. In Papierkorb schieben
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    const nowIso = new Date().toISOString();
    for (const r of toDelete) {
        trash.push({ report: r, deletedAt: nowIso });
    }
    if (typeof saveTrash === 'function') saveTrash(trash);

    // 2. Aus aktiver Liste entfernen
    reports = reports.filter(r => !selectedIds.has(r.id));
    saveToStorage();
    toggleBulkMode();
    updateUI();
    if (typeof updateTrashBadge === 'function') updateTrashBadge();

    // 3. Toast mit Undo-Option
    showToast(
        count === 1
            ? L('1 Bericht in den Papierkorb verschoben', '1 report moved to trash')
            : L(`${count} Berichte in den Papierkorb verschoben`, `${count} reports moved to trash`),
        'info',
        {
            label: L('Rückgängig', 'Undo'),
            onClick: () => restoreReports(deletedIds)
        }
    );

    // 4. Cloud benachrichtigen (Soft-Delete)
    if (typeof b2bOnReportsDeleted === 'function') b2bOnReportsDeleted(deletedIds);
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

// ═══════════════════════════════════════
// PAPIERKORB WIEDERHERSTELLUNG & LEEREN
// ═══════════════════════════════════════

function updateTrashBadge() {
    const btn = document.getElementById('trashToggle');
    const badge = document.getElementById('trashBadge');
    if (!badge) return;
    const count = typeof getTrashCount === 'function' ? getTrashCount() : 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function restoreReport(id) {
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    const idx = trash.findIndex(t => t.report && String(t.report.id) === String(id));
    if (idx === -1) return;

    const item = trash[idx];
    trash.splice(idx, 1);
    if (typeof saveTrash === 'function') saveTrash(trash);

    // Nicht doppelt einfuegen
    if (!reports.some(r => String(r.id) === String(item.report.id))) {
        reports.push(item.report);
        reports.sort((a, b) => {
            const yA = Number(a.year || a.jahr || 1), yB = Number(b.year || b.jahr || 1);
            if (yA !== yB) return yB - yA;
            return Number(b.week || b.kw || 0) - Number(a.week || a.kw || 0);
        });
    }

    saveToStorage();
    updateUI();
    if (typeof updateTrashBadge === 'function') updateTrashBadge();
    showToast(L('Bericht wiederhergestellt', 'Report restored'), 'success');

    if (typeof b2bOnReportRestored === 'function') b2bOnReportRestored(item.report);
}

function restoreReports(ids) {
    if (!Array.isArray(ids) || !ids.length) return;
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    const restored = [];
    const idSet = new Set(ids.map(String));

    const remaining = [];
    for (const item of trash) {
        if (item.report && idSet.has(String(item.report.id))) {
            restored.push(item.report);
            if (!reports.some(r => String(r.id) === String(item.report.id))) {
                reports.push(item.report);
            }
        } else {
            remaining.push(item);
        }
    }

    if (typeof saveTrash === 'function') saveTrash(remaining);

    reports.sort((a, b) => {
        const yA = Number(a.year || a.jahr || 1), yB = Number(b.year || b.jahr || 1);
        if (yA !== yB) return yB - yA;
        return Number(b.week || b.kw || 0) - Number(a.week || a.kw || 0);
    });

    saveToStorage();
    updateUI();
    if (typeof updateTrashBadge === 'function') updateTrashBadge();
    showToast(
        restored.length === 1
            ? L('1 Bericht wiederhergestellt', '1 report restored')
            : L(`${restored.length} Berichte wiederhergestellt`, `${restored.length} reports restored`),
        'success'
    );

    if (typeof b2bOnReportsRestored === 'function') b2bOnReportsRestored(restored);
}

async function permanentDeleteReport(id) {
    const ok = await bhConfirm({
        title: L('Endgültig löschen?', 'Delete permanently?'),
        text: L('Dieser Bericht wird dauerhaft gelöscht und kann nicht wiederhergestellt werden.',
            'This report will be permanently deleted and cannot be restored.'),
        confirmText: L('Endgültig löschen', 'Delete permanently')
    });
    if (!ok) return;

    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    const updated = trash.filter(t => !t.report || String(t.report.id) !== String(id));
    if (typeof saveTrash === 'function') saveTrash(updated);
    if (typeof updateTrashBadge === 'function') updateTrashBadge();
    renderTrashModal();
    showToast(L('Bericht endgültig gelöscht', 'Report permanently deleted'), 'info');

    if (typeof b2bOnReportHardDeleted === 'function') b2bOnReportHardDeleted(id);
}

async function emptyTrashConfirm() {
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    if (!trash.length) return;

    const ok = await bhConfirm({
        title: L('Papierkorb leeren?', 'Empty trash?'),
        text: L(`Alle ${trash.length} Berichte im Papierkorb werden dauerhaft und unwiderruflich gelöscht.`,
            `All ${trash.length} reports in the trash will be permanently and irreversibly deleted.`),
        confirmText: L('Papierkorb leeren', 'Empty trash')
    });
    if (!ok) return;

    const allIds = trash.map(t => t.report && (t.report.client_id || t.report.id)).filter(Boolean);
    if (typeof saveTrash === 'function') saveTrash([]);
    if (typeof updateTrashBadge === 'function') updateTrashBadge();
    renderTrashModal();
    showToast(L('Papierkorb geleert', 'Trash emptied'), 'info');

    if (typeof b2bOnTrashEmptied === 'function') b2bOnTrashEmptied(allIds);
}

function restoreAllTrashConfirm() {
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];
    if (!trash.length) return;
    const allIds = trash.map(t => t.report && t.report.id).filter(Boolean);
    restoreReports(allIds);
    renderTrashModal();
}

async function openTrashModal() {
    const m = document.getElementById('trashModal');
    if (!m) return;
    m.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Cloud-Abgleich: Prüfen ob verwaiste Zeilen in Supabase existieren, die lokal fehlen
    if (typeof BHB2B !== 'undefined' && BHB2B && BHB2B.angemeldet && BHB2B.angemeldet() && BHB2B.verwaisteCloudBerichte) {
        try {
            const aktiveIds = reports.map(r => String(r.id));
            const verwaist = await BHB2B.verwaisteCloudBerichte(aktiveIds);
            if (verwaist && verwaist.length > 0) {
                const trash = typeof loadTrash === 'function' ? loadTrash() : [];
                const trashIdSet = new Set(trash.map(t => t.report && String(t.report.id)));
                let hinzugefuegt = false;
                for (const row of verwaist) {
                    const cid = String(row.client_id || row.id);
                    if (!trashIdSet.has(cid) && !aktiveIds.includes(cid)) {
                        const reconstructed = {
                            id: cid,
                            week: row.kw,
                            year: row.jahr,
                            dateFrom: row.datum_von,
                            dateTo: row.datum_bis,
                            status: row.status || 'incomplete',
                            ...(row.inhalt || {})
                        };
                        trash.push({
                            report: reconstructed,
                            deletedAt: row.geloescht_at || row.updated_at || new Date().toISOString(),
                            fromCloud: true
                        });
                        trashIdSet.add(cid);
                        hingezufuegt = true;
                    }
                }
                if (hingezufuegt && typeof saveTrash === 'function') {
                    saveTrash(trash);
                    if (typeof updateTrashBadge === 'function') updateTrashBadge();
                }
            }
        } catch (e) {
            console.warn('[Trash] Cloud-Abgleich:', e);
        }
    }

    renderTrashModal();
}

function closeTrashModal() {
    const m = document.getElementById('trashModal');
    if (m) {
        m.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function renderTrashModal() {
    const listEl = document.getElementById('trashList');
    if (!listEl) return;
    const trash = typeof loadTrash === 'function' ? loadTrash() : [];

    const btnEmpty = document.getElementById('btnEmptyTrash');
    const btnRestoreAll = document.getElementById('btnRestoreAllTrash');
    if (btnEmpty) btnEmpty.style.display = trash.length > 0 ? 'inline-flex' : 'none';
    if (btnRestoreAll) btnRestoreAll.style.display = trash.length > 0 ? 'inline-flex' : 'none';

    if (trash.length === 0) {
        listEl.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <div style="width: 48px; height: 48px; margin: 0 auto 12px; opacity: 0.3;">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                </div>
                <h4 style="font-size: 1rem; margin-bottom: 0.25rem; color: var(--text-primary); font-weight: 600;">${L('Papierkorb ist leer', 'Trash is empty')}</h4>
                <p style="font-size: 0.82rem; margin: 0;">${L('Gelöschte Berichte werden hier für 30 Tage aufbewahrt.', 'Deleted reports are stored here for 30 days.')}</p>
            </div>
        `;
        return;
    }

    const now = Date.now();
    listEl.innerHTML = trash.slice().reverse().map(item => {
        const r = item.report || {};
        const d = item.deletedAt ? new Date(item.deletedAt) : new Date();
        const tageAlt = Math.floor((now - d.getTime()) / 86400000);
        const verbleibTage = Math.max(0, TRASH_MAX_DAYS - tageAlt);

        const dStr = d.toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'de-DE',
            { day: '2-digit', month: '2-digit', year: 'numeric' });

        const kwStr = `KW ${r.week || r.kw || '?'}`;
        const jahrStr = `${r.year || r.jahr || 1}. ${L('Ausbildungsjahr', 'Year')}`;
        const dateSpan = (r.dateFrom && r.dateTo) ? `${r.dateFrom} – ${r.dateTo}` : '';

        return `
            <div class="trash-card" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.85rem 1rem; gap: 1rem; flex-wrap: wrap;">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-weight: 700; font-size: 0.92rem; color: var(--primary);">${kwStr}</span>
                        <span style="font-size: 0.78rem; padding: 2px 6px; border-radius: 4px; background: rgba(var(--primary-rgb), 0.12); color: var(--primary); font-weight: 500;">${jahrStr}</span>
                        ${item.fromCloud ? `<span style="font-size: 0.72rem; padding: 1px 5px; border-radius: 3px; background: rgba(59,130,246,0.15); color: #60a5fa;">Cloud</span>` : ''}
                    </div>
                    <div style="font-size: 0.78rem; color: var(--text-muted);">
                        ${dateSpan ? `<span>${dateSpan} · </span>` : ''}
                        <span>${L('Gelöscht am ', 'Deleted on ')}${dStr}</span>
                        <span style="color: var(--warning); margin-left: 6px;">(${L(`noch ${verbleibTage} Tage`, `${verbleibTage} days left`)})</span>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn btn-secondary" onclick="restoreReport('${r.id}'); renderTrashModal();" style="padding: 5px 10px; font-size: 0.78rem;">
                        <svg class="icon icon-sm"><use href="#i-refresh"/></svg>
                        <span>${L('Wiederherstellen', 'Restore')}</span>
                    </button>
                    <button class="btn btn-danger" onclick="permanentDeleteReport('${r.id}')" style="padding: 5px 10px; font-size: 0.78rem;" title="${L('Endgültig löschen', 'Delete permanently')}">
                        <svg class="icon icon-sm"><use href="#i-trash"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

if (typeof window !== 'undefined') {
    window.openTrashModal = openTrashModal;
    window.closeTrashModal = closeTrashModal;
    window.renderTrashModal = renderTrashModal;
    window.updateTrashBadge = updateTrashBadge;
    window.restoreReport = restoreReport;
    window.restoreReports = restoreReports;
    window.permanentDeleteReport = permanentDeleteReport;
    window.emptyTrashConfirm = emptyTrashConfirm;
    window.restoreAllTrashConfirm = restoreAllTrashConfirm;
}



