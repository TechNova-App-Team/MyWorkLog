// ═══ BH-START ═══
// Tastenkuerzel, globale Ereignis-Anmeldungen und der Start beim DOMContentLoaded.
// Laedt vor ais-studio.js; AIStudio.init() steht im DOMContentLoaded-Rueckruf
// und laeuft damit erst, wenn alle Dateien da sind.
// Herausgeloest aus pages/berichtsheft/index.html.

// ═══════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════

document.addEventListener('keydown', (e) => {
    // Don't trigger in inputs/textareas
    const tag = e.target.tagName;
    const inModal = document.querySelector('.modal.active');

    if (e.key === 'Escape') {
        if (document.getElementById('pdfModal')?.classList.contains('active')) {
            closePDFModal();
            return;
        }
        if (inModal) {
            closeReportModal();
            closeViewModal();
            closeTemplatesModal();
        }
        if (bulkMode) toggleBulkMode();
        return;
    }

    // Ctrl+S to save when in modal
    if (e.ctrlKey && e.key === 's' && inModal) {
        e.preventDefault();
        const form = document.getElementById('reportForm');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
        return;
    }

    // Don't trigger letter shortcuts in inputs
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

    // Ein Kürzel darf keinen zweiten Dialog über den offenen legen.
    if (inModal
        || document.getElementById('pdfModal')?.classList.contains('active')
        || document.getElementById('aiStudioPanel')?.classList.contains('open')
        || document.getElementById('fotoImport')?.classList.contains('active')) return;

    switch (e.key.toLowerCase()) {
        case 'n':
            e.preventDefault();
            openNewReportModal();
            break;
        case 'e':
            e.preventDefault();
            openPDFModal(null);
            break;
        case 't':
            e.preventDefault();
            showTemplates();
            break;
        case 'f':
            if (e.ctrlKey) {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            break;
    }
});

// ═══════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════

// Close PDF modal on overlay click
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('pdfModal');
    if (overlay && e.target === overlay) closePDFModal();
});

document.addEventListener('DOMContentLoaded', () => {
    // Character counter + quality meter
    const textarea = document.getElementById('reportActivities');
    const counter = document.getElementById('charCount');

    textarea.addEventListener('input', () => {
        counter.textContent = textarea.value.length + ' Zeichen';
        updateQualityMeter(textarea.value);

        // Auto-save draft (debounced)
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveDraft();
            renderAISuggestions('weekly');
        }, 1500);
    });

    // Auto-set dates when week changes
    document.getElementById('reportWeek').addEventListener('change', (e) => {
        const week = parseInt(e.target.value);
        if (week >= 1 && week <= 53) {
            const { monday, friday } = getWeekDates(week);
            document.getElementById('reportDateFrom').value = monday;
            document.getElementById('reportDateTo').value = friday;
            // Re-render daily fields with correct dates
            if (currentMode === 'daily') renderDailyFields();
        }
    });

    // Re-render AI when department changes
    const deptInput = document.getElementById('reportDepartment');
    if (deptInput) {
        deptInput.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => renderAISuggestions(currentMode), 600);
        });
    }

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Initialize mode toggle UI
    setMode(currentMode);

    // Restore theme
    restoreTheme();

    // Load reports
    loadReports();

    // Freigabe-Antwort aus dem Link uebernehmen (#fb=...) — erst NACH
    // loadReports(), sonst gibt es die Woche noch nicht, der die
    // Entscheidung zugeordnet werden soll.
    bhHandleHash();

    // Initialize AI Studio
    AIStudio.init();
});
