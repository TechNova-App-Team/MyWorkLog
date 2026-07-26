// ═══ CORE: APP-STARTUP ═══
    // ===== INITIALIZATION (NEU) =====
    function initializeApp() {
        // Load data from localStorage (resilient: heilt bei Korruption aus Backup)
        const saved = loadPersistedData();
        if (saved) {
            data = saved;
        }
        
        // Initialize Alerts System
        initializeAlerts();
        
        // Load timer state
        const timerSaved = localStorage.getItem('tg_timer');
        if (timerSaved) {
            timer = JSON.parse(timerSaved);
        }
        
        // Draft persistence key
        const DRAFT_KEY = 'mwl_entry_draft';

        // Load draft (if any) and populate inputs
        function loadDraft() {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('inpDate');

                if (!raw) {
                    if (dateInput && !dateInput.value) dateInput.value = today;
                    return;
                }

                const draft = JSON.parse(raw);
                if (dateInput) dateInput.value = draft.date || draft.dateStr || today;
                const type = document.getElementById('inpType'); if (type && draft.type) type.value = draft.type;
                const project = document.getElementById('inpProject'); if (project && draft.project) project.value = draft.project;
                const start = document.getElementById('inpStart'); if (start && draft.start) start.value = draft.start;
                const end = document.getElementById('inpEnd'); if (end && draft.end) end.value = draft.end;
                const hours = document.getElementById('inpHours'); if (hours && draft.hours) hours.value = draft.hours;
                const brk = document.getElementById('inpBreak'); if (brk && draft.breakMins) brk.value = draft.breakMins;
                const notes = document.getElementById('inpNotes'); if (notes && draft.notes) notes.value = draft.notes;
                // Detail-Felder aufklappen, wenn der Entwurf optionale Werte enthält (deferred: dashboard.js lädt evtl. später).
                if (draft.project || draft.notes || draft.hours || draft.breakMins) {
                    setTimeout(function() { if (typeof toggleEntryDetails === 'function') toggleEntryDetails(true); }, 0);
                }
                setTimeout(function() { if (typeof updateEntryDuration === 'function') updateEntryDuration(); }, 0);
            } catch (e) {
                console.warn('Failed to load draft:', e);
            }
        }

        // Save current form as draft
        function saveDraft() {
            try {
                const draft = {
                    date: document.getElementById('inpDate')?.value || '',
                    type: document.getElementById('inpType')?.value || '',
                    project: document.getElementById('inpProject')?.value || '',
                    start: document.getElementById('inpStart')?.value || '',
                    end: document.getElementById('inpEnd')?.value || '',
                    hours: document.getElementById('inpHours')?.value || '',
                    breakMins: document.getElementById('inpBreak')?.value || '',
                    notes: document.getElementById('inpNotes')?.value || ''
                };
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                console.log('Draft saved:', draft);
                if (typeof window.updateDraftUI === 'function') window.updateDraftUI();
            } catch (e) {
                console.warn('Failed to save draft:', e);
            }
        }

        function clearDraft() {
            try { localStorage.removeItem(DRAFT_KEY); } catch(e){}
            if (typeof window.updateDraftUI === 'function') window.updateDraftUI();
        }

        // Update draft indicator UI (shows/hides badge & buttons)
        function updateDraftUI() {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                const badge = document.getElementById('draftBadge');
                const btnRestore = document.getElementById('btnRestoreDraft');
                const btnDelete = document.getElementById('btnDeleteDraft');
                const container = document.getElementById('draftNotice');

                const has = !!raw;
                if (container) container.style.display = has ? 'flex' : 'none';
                if (badge) badge.style.display = has ? 'inline-block' : 'none';
                if (btnRestore) btnRestore.style.display = has ? 'inline-block' : 'none';
                if (btnDelete) btnDelete.style.display = has ? 'inline-block' : 'none';
            } catch (e) { console.warn('updateDraftUI error', e); }
        }

        // Restore draft into fields (keeps draft in storage)
        function restoreDraft() {
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                if (!raw) return;
                const draft = JSON.parse(raw);
                document.getElementById('inpDate').value = draft.date || '';
                document.getElementById('inpType').value = draft.type || 'work';
                document.getElementById('inpProject').value = draft.project || '';
                document.getElementById('inpStart').value = draft.start || '';
                document.getElementById('inpEnd').value = draft.end || '';
                document.getElementById('inpHours').value = draft.hours || '';
                const brkR = document.getElementById('inpBreak'); if (brkR) brkR.value = draft.breakMins || '';
                document.getElementById('inpNotes').value = draft.notes || '';
                if ((draft.project || draft.notes || draft.hours || draft.breakMins) && typeof toggleEntryDetails === 'function') toggleEntryDetails(true);
                if (typeof updateEntryDuration === 'function') updateEntryDuration();
                // After restoring, remove the draft (Wiederherstellen löscht Entwurf)
                clearDraft();
                updateDraftUI();
                showCustomMessage && showCustomMessage('✅ Entwurf wiederhergestellt', 'Der gespeicherte Entwurf wurde in das Formular geladen und entfernt.', 'success');
            } catch(e) { console.warn('restoreDraft', e); }
        }

        // Delete draft from storage and update UI
        function deleteDraft() {
            try { clearDraft(); showCustomMessage && showCustomMessage('✅ Entwurf gelöscht', 'Der gespeicherte Entwurf wurde entfernt.', 'success'); } catch(e) { console.warn(e); }
        }

        // Expose restore/delete/update to global scope so buttons can call them
        window.restoreDraft = restoreDraft;
        window.deleteDraft = deleteDraft;
        window.updateDraftUI = updateDraftUI;

        // Attach listeners to save draft on change/input (using Event Delegation for robustness)
        function attachDraftListeners() {
            const ids = ['inpDate','inpType','inpProject','inpStart','inpEnd','inpHours','inpBreak','inpNotes'];
            document.addEventListener('input', (e) => {
                if (ids.includes(e.target.id)) {
                    saveDraft();
                }
            });
            document.addEventListener('change', (e) => {
                if (ids.includes(e.target.id)) {
                    saveDraft();
                }
            });
            console.log('📝 Draft listeners attached with Event Delegation for: ' + ids.join(', '));
        }

        // Load draft before setting defaults
        loadDraft();
        attachDraftListeners();
        updateDraftUI();

        // Ensure default date if none set by draft
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('inpDate');
        if (dateInput && !dateInput.value) dateInput.value = today;

        // --- Jetzt-Buttons (mit Event Delegation) ---
        function pad2(n){return n<10?('0'+n):n}
        
        // Use event delegation instead of direct listeners (more robust)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'btnNowStart') {
                const now = new Date();
                const v = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
                const el = document.getElementById('inpStart');
                if (el) {
                    el.value = v;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    saveDraft();
                    el.classList.remove('glass-input--time-set');
                    void el.offsetWidth;
                    el.classList.add('glass-input--time-set');
                    el.addEventListener('animationend', () => el.classList.remove('glass-input--time-set'), { once: true });
                }
            }
            if (e.target.id === 'btnNowEnd') {
                const now = new Date();
                const v = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
                const el = document.getElementById('inpEnd');
                if (el) {
                    el.value = v;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    saveDraft();
                    el.classList.remove('glass-input--time-set');
                    void el.offsetWidth;
                    el.classList.add('glass-input--time-set');
                    el.addEventListener('animationend', () => el.classList.remove('glass-input--time-set'), { once: true });
                }
            }
        });

        // --- Keyboard Shortcuts ---
        document.addEventListener('keydown', (e) => {
            // Master-Schalter (shortcuts.js) — Default AUS
            if (typeof shortcutsEnabled !== 'function' || !shortcutsEnabled()) return;
            // Ctrl/Cmd + Enter -> save entry (allow from inputs)
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleEntry();
                return;
            }

            // Avoid interfering while typing in textareas/inputs/selects (except if user explicitly wants shortcuts)
            const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                // Allow single-letter shortcuts only when not typing in a text input of type text/textarea
                const type = e.target.type || '';
                if (tag === 'INPUT' && (type === 'text' || type === 'search' || type === 'email' || type === 'tel' || type === 'password')) return;
            }

            // Global single-key shortcuts — ausschliesslich ohne Modifier.
            // Ohne diese Sperre feuerte jedes Ctrl+S / Ctrl+E / Ctrl+P / Alt+S
            // zusätzlich den Timer (Doppel-Trigger neben dem ShortcutManager).
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
            const key = e.key.toLowerCase();
            if (key === 's') { e.preventDefault(); timerAction('start'); if (typeof showCustomMessage === 'function') showCustomMessage('▶ Timer', 'Start', 'info'); }
            else if (key === 'p') { e.preventDefault(); timerAction('pause'); if (typeof showCustomMessage === 'function') showCustomMessage('II Timer', 'Pause', 'info'); }
            else if (key === 'e') { e.preventDefault(); timerAction('stop'); if (typeof showCustomMessage === 'function') showCustomMessage('■ Timer', 'Stop', 'info'); }
        });

        // Initial UI render
        recalculateVacationUsed();
        updateUI();
        checkSetupHint();
        
        console.log('✅ App initialized with Smart Alerts enabled');
        
        // Initialize dashboard layout
        loadDashboardLayout();
        
        // Initialize all widgets
        setTimeout(() => {
            initializeAllWidgets();
        }, 200);
    }

    function checkSetupHint() {
        const banner = document.getElementById('setupHintBanner');
        if (!banner) return;
        if (localStorage.getItem('mwl_setup_hint_dismissed')) return;
        if (!data || data.entries.length > 0) return;
        banner.style.display = 'flex';
    }

    function dismissSetupHint() {
        localStorage.setItem('mwl_setup_hint_dismissed', '1');
        const banner = document.getElementById('setupHintBanner');
        if (!banner) return;
        banner.classList.add('dismissing');
        setTimeout(() => { banner.style.display = 'none'; banner.classList.remove('dismissing'); }, 290);
    }

    window.checkSetupHint = checkSetupHint;
    window.dismissSetupHint = dismissSetupHint;
