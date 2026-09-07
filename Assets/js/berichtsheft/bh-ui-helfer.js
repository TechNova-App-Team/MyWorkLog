// ═══ BH-UI-HELFER ═══
// Vorlagen, Entwurfs-Autospeicher, Abteilungs-Vorschlaege, Konfetti,
// Theme-Umschalter, Toasts, Speicher-Anzeige.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════

function showTemplates() {
    const grid = document.getElementById('templateGrid');
    grid.innerHTML = templates.map(t => `
                <div class="template-card" onclick="applyTemplate('${t.id}')">
                    <div class="template-icon">${t.icon}</div>
                    <div class="template-name">${t.name}</div>
                    <div class="template-desc">${t.description}</div>
                </div>
            `).join('');

    document.getElementById('templatesModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function applyTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    closeTemplatesModal();
    openNewReportModal();

    // Slight delay so modal is visible
    setTimeout(() => {
        document.getElementById('reportActivities').value = template.content;
        document.getElementById('charCount').textContent = template.content.length + ' Zeichen';
        updateQualityMeter(template.content);
    }, 100);

    showToast(`Vorlage "${template.name}" geladen`, 'success');
}

// ═══════════════════════════════════════
// AUTO-SAVE DRAFTS
// ═══════════════════════════════════════

function saveDraft() {
    const draft = {
        year: document.getElementById('reportYear').value,
        week: document.getElementById('reportWeek').value,
        dateFrom: document.getElementById('reportDateFrom').value,
        dateTo: document.getElementById('reportDateTo').value,
        department: document.getElementById('reportDepartment').value,
        activities: document.getElementById('reportActivities').value,
        instruction: document.getElementById('reportInstruction').value,
        school: document.getElementById('reportSchool').value,
        hours: document.getElementById('reportHours').value,
        status: document.getElementById('reportStatus').value,
        mode: currentMode,
        dailyActivities: currentMode === 'daily' ? getDailyActivitiesFromForm() : null,
        dailyHours: currentMode === 'daily' ? getDailyHoursFromForm() : null,
        dailySchool: currentMode === 'daily' ? getDailySchoolFromForm() : null,
        savedAt: Date.now()
    };

    if (draft.activities.length > 10 || draft.department.length > 0) {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
    }
}

function restoreDraft() {
    if (editingId) return; // Don't restore draft when editing
    try {
        const draft = JSON.parse(localStorage.getItem(AUTOSAVE_KEY));
        if (!draft) return;
        // Only restore if less than 24 hours old
        if (Date.now() - draft.savedAt > 86400000) { clearDraft(); return; }

        const hasContent = (draft.activities && draft.activities.length > 10) ||
            (draft.dailyActivities && Object.values(draft.dailyActivities).some(t => t && t.length > 5));

        if (hasContent) {
            if (confirm('Es gibt einen ungespeicherten Entwurf. Möchtest du ihn wiederherstellen?')) {
                document.getElementById('reportYear').value = draft.year || 1;
                document.getElementById('reportWeek').value = draft.week || '';
                document.getElementById('reportDateFrom').value = draft.dateFrom || '';
                document.getElementById('reportDateTo').value = draft.dateTo || '';
                document.getElementById('reportDepartment').value = draft.department || '';
                document.getElementById('reportActivities').value = draft.activities || '';
                document.getElementById('reportInstruction').value = draft.instruction || '';
                document.getElementById('reportSchool').value = draft.school || '';
                document.getElementById('reportHours').value = draft.hours || '';
                document.getElementById('reportStatus').value = draft.status || 'incomplete';
                document.getElementById('charCount').textContent = (draft.activities || '').length + ' Zeichen';
                updateQualityMeter(draft.activities || '');

                // Restore mode
                if (draft.mode) {
                    setMode(draft.mode);
                    if (draft.mode === 'daily' && draft.dailyActivities) {
                        setTimeout(() => setDailyFieldsFromData(draft.dailyActivities, draft.dailyHours, draft.dailySchool), 50);
                    }
                }
            }
        }
    } catch (e) { /* ignore */ }
}

function clearDraft() {
    localStorage.removeItem(AUTOSAVE_KEY);
}

// ═══════════════════════════════════════
// DEPARTMENT SUGGESTIONS
// ═══════════════════════════════════════

function updateDepartmentSuggestions() {
    const departments = [...new Set(reports.map(r => r.department).filter(Boolean))];
    const datalist = document.getElementById('departmentList');
    if (!datalist) return;
    datalist.innerHTML = departments.map(d => `<option value="${escapeHtml(d)}">`).join('');
}

// ═══════════════════════════════════════
// CONFETTI
// ═══════════════════════════════════════

function launchConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#a855f7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#fff'];
    const shapes = ['square', 'circle'];

    for (let i = 0; i < 80; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const rotation = Math.random() * 360;
        const size = 6 + Math.random() * 8;

        piece.style.cssText = `
                    left: ${left}%;
                    top: -10px;
                    width: ${size}px;
                    height: ${shape === 'circle' ? size : size * 1.6}px;
                    background: ${color};
                    border-radius: ${shape === 'circle' ? '50%' : '2px'};
                    animation-delay: ${delay}s;
                    transform: rotate(${rotation}deg);
                `;
        container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 3500);
}

// ═══════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? '' : 'light';

    if (next) {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem(THEME_KEY, 'light');
        document.getElementById('themeToggle').innerHTML = '<svg class="icon"><use href="#i-sun"/></svg>';
    } else {
        html.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'dark');
        document.getElementById('themeToggle').innerHTML = '<svg class="icon"><use href="#i-moon"/></svg>';
    }
}

function restoreTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('themeToggle').innerHTML = '<svg class="icon"><use href="#i-sun"/></svg>';
    }
}

// ═══════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════

function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ═══════════════════════════════════════
// AUTO-SAVE INDICATOR
// ═══════════════════════════════════════

function showAutoSave() {
    const indicator = document.getElementById('autosaveIndicator');
    if (!indicator) return;
    indicator.classList.add('visible');
    setTimeout(() => indicator.classList.remove('visible'), 2500);
}

// For backwards compatibility
function showNotification(message, type) {
    showToast(message, type);
}

