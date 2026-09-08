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

// ═══════════════════════════════════════
// BESTAETIGUNGS-DIALOG
// ═══════════════════════════════════════
//
// Ersatz fuer window.confirm: gleiche Semantik (Promise<boolean>), aber in
// der Gestaltung der Seite. Der Dialog traegt die Klasse `modal active` —
// damit greift der Torwaechter in bh-start.js, und die Buchstaben-Kuerzel
// (N/E/T) legen keinen zweiten Dialog darueber.
//
// Escape und Enter werden in der CAPTURE-Phase abgefangen und gestoppt:
// sonst faehrt der globale Escape-Zweig durch und schliesst den Dialog
// darunter gleich mit (das Berichtsformular samt ungespeichertem Text).
function bhConfirm(opts) {
    const o = typeof opts === 'string' ? { text: opts } : (opts || {});
    const en = document.documentElement.lang === 'en';
    const titel = o.title || (en ? 'Are you sure?' : 'Sicher?');
    const jaText = o.confirmText || (en ? 'Confirm' : 'Bestätigen');
    const neinText = o.cancelText || (en ? 'Cancel' : 'Abbrechen');
    const gefahr = o.danger !== false;   // Rueckfragen sind hier fast immer Loeschungen

    return new Promise(resolve => {
        const vorherFokus = document.activeElement;

        const overlay = document.createElement('div');
        overlay.className = 'modal';
        overlay.id = 'bhConfirmModal';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const box = document.createElement('div');
        box.className = 'modal-content bhc-box' + (gefahr ? ' is-danger' : '');

        const head = document.createElement('div');
        head.className = 'bhc-head';
        head.innerHTML =
            '<div class="bhc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            (gefahr
                ? '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>') +
            '</svg></div>';

        const textBox = document.createElement('div');
        const h = document.createElement('h3');
        h.className = 'bhc-title';
        h.textContent = titel;
        const p = document.createElement('p');
        p.className = 'bhc-text';
        // Der Text kommt aus dem Aufrufer, nie aus fremden Daten — trotzdem
        // ueber textContent, damit ein Code oder Name nichts aufmachen kann.
        p.textContent = o.text || '';
        textBox.appendChild(h);
        textBox.appendChild(p);
        if (o.code) {
            const c = document.createElement('p');
            c.className = 'bhc-text bhc-code';
            c.textContent = o.code;
            c.style.marginTop = '8px';
            textBox.appendChild(c);
        }
        head.appendChild(textBox);

        const actions = document.createElement('div');
        actions.className = 'bhc-actions';
        const nein = document.createElement('button');
        nein.type = 'button';
        nein.className = 'btn btn-secondary';
        nein.textContent = neinText;
        const ja = document.createElement('button');
        ja.type = 'button';
        ja.className = 'btn ' + (gefahr ? 'btn-danger' : 'btn-primary');
        ja.textContent = jaText;
        actions.appendChild(nein);
        actions.appendChild(ja);

        box.appendChild(head);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        // Erst im naechsten Frame, sonst gibt es keinen Zustandswechsel und
        // damit keine Einblendung.
        requestAnimationFrame(() => overlay.classList.add('active'));
        document.body.style.overflow = 'hidden';
        ja.focus();

        function schliessen(antwort) {
            document.removeEventListener('keydown', taste, true);
            overlay.remove();
            // Nur freigeben, wenn kein anderer Dialog mehr offen ist —
            // dieser hier wird oft AUS einem heraus gestellt.
            if (!document.querySelector('.modal.active')) document.body.style.overflow = '';
            if (vorherFokus && typeof vorherFokus.focus === 'function') {
                try { vorherFokus.focus(); } catch (e) { /* Element ist weg */ }
            }
            resolve(antwort);
        }

        function taste(e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); schliessen(false); }
            else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); schliessen(true); }
            else if (e.key === 'Tab') {
                // Fokus im Dialog halten: es gibt genau zwei Ziele.
                e.preventDefault();
                (document.activeElement === ja ? nein : ja).focus();
            }
        }

        document.addEventListener('keydown', taste, true);
        nein.onclick = () => schliessen(false);
        ja.onclick = () => schliessen(true);
        overlay.onclick = (e) => { if (e.target === overlay) schliessen(false); };
    });
}

