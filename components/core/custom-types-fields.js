// ═══ CORE: CUSTOM-TYPES-FIELDS ═══
// User-definierte Eintrag-Typen + Custom-Fields.
// UI: inline expandierende Create-Form (KEIN nested Modal).
// Render-Stil: Clean SaaS (kein Inline-CSS-Wirrwarr).

    const DEFAULT_ENTRY_TYPES = [
        { id: 'work',     label: 'Arbeit',       emoji: '💼', color: '#a855f7', description: 'Normale Arbeitszeit' },
        { id: 'school',   label: 'Berufsschule', emoji: '📚', color: '#3b82f6', description: 'Berufsschule / Noten' },
        { id: 'vacation', label: 'Urlaub',       emoji: '🌴', color: '#10b981', description: 'Urlaubstage' },
        { id: 'gleittag', label: 'Gleittag',     emoji: '⚡', color: '#06b6d4', description: 'Gleittag (Überstundenabbau)' },
        { id: 'sick',     label: 'Krankheit',    emoji: '🤒', color: '#ef4444', description: 'Krankheitstage' },
        { id: 'holiday',  label: 'Feiertag',     emoji: '🎉', color: '#f59e0b', description: 'Offizielle Feiertage' },
        { id: 'korrektur',label: 'Korrektur',    emoji: '⚖️', color: '#64748b', description: 'Manuelle Saldo-Korrektur (z.B. Angleichung ans Firmen-System)' }
    ];

    const CT_PRESET_COLORS = ['#a855f7','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#64748b'];

    function isDefaultType(id) {
        return DEFAULT_ENTRY_TYPES.some(t => t.id === id);
    }

    // Nur Hex-Farben durchlassen — verhindert CSS-Break-Out.
    function sanitizeColor(c) {
        return /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '#888';
    }

    function hexToRgbStr(hex) {
        const h = sanitizeColor(hex).replace('#','');
        const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h.slice(0, 6);
        const r = parseInt(full.slice(0,2), 16);
        const g = parseInt(full.slice(2,4), 16);
        const b = parseInt(full.slice(4,6), 16);
        return `${r},${g},${b}`;
    }

    function getAllEntryTypes() {
        const overrides = (data && data.entryTypeOverrides) || {};
        const defaults = DEFAULT_ENTRY_TYPES.map(t => {
            const o = overrides[t.id];
            return o ? { ...t, ...o, id: t.id } : t;
        });
        const customs = Array.isArray(data.customEntryTypes) ? data.customEntryTypes : [];
        return [...defaults, ...customs];
    }

    function getEntryTypeInfo(typeId) {
        return getAllEntryTypes().find(t => t.id === typeId);
    }

    function getTypeEmoji(typeId) {
        const info = getEntryTypeInfo(typeId);
        return (info && info.emoji) || '📋';
    }

    function getTypeColor(typeId) {
        const info = getEntryTypeInfo(typeId);
        return (info && info.color) || '#888';
    }

    // ═══ Override CRUD für Standard-Typen ═══
    function setDefaultTypeOverride(id, updates) {
        if (!isDefaultType(id)) return false;
        if (!data.entryTypeOverrides || typeof data.entryTypeOverrides !== 'object') data.entryTypeOverrides = {};
        const defaults = DEFAULT_ENTRY_TYPES.find(t => t.id === id);
        const current = data.entryTypeOverrides[id] || {};
        const next = { ...current, ...updates };
        // Cleanup: Wenn alle Override-Felder dem Default entsprechen → Override löschen.
        const matches = ['emoji','color','description','label'].every(k => next[k] === undefined || next[k] === defaults[k]);
        if (matches) {
            delete data.entryTypeOverrides[id];
        } else {
            data.entryTypeOverrides[id] = next;
        }
        save();
        showCustomMessage('Aktualisiert', 'Änderungen gespeichert', 'success');
        renderCustomTypesManager();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        return true;
    }

    function resetDefaultTypeOverride(id) {
        if (!data.entryTypeOverrides || !data.entryTypeOverrides[id]) return;
        showCustomConfirm(
            'Auf Standard zurücksetzen?',
            'Emoji, Farbe und Beschreibung werden auf die Werkseinstellung zurückgesetzt.',
            () => {
                delete data.entryTypeOverrides[id];
                save();
                showCustomMessage('Zurückgesetzt', 'Werkseinstellung wiederhergestellt', 'success');
                renderCustomTypesManager();
                if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
                if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
            }
        );
    }

    // ═══ Core CRUD ═══
    function createCustomType(label, emoji, color, description, countsAsWork) {
        if (!label || !emoji || !color) {
            showCustomMessage('Fehler', 'Label, Emoji und Farbe sind erforderlich', 'error');
            return false;
        }
        if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];

        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        data.customEntryTypes.push({
            id,
            label: `${emoji} ${label}`,
            emoji,
            color,
            description: description || '',
            countsAsWork: !!countsAsWork,
            createdAt: new Date().toISOString()
        });
        save();
        showCustomMessage('Eintrag-Typ erstellt', `"${label}" hinzugefügt`, 'success');
        renderCustomTypesManager();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        return true;
    }

    function editCustomType(id, updates) {
        if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];
        const idx = data.customEntryTypes.findIndex(t => t.id === id);
        if (idx === -1) return false;
        data.customEntryTypes[idx] = { ...data.customEntryTypes[idx], ...updates };
        save();
        showCustomMessage('Aktualisiert', 'Änderungen gespeichert', 'success');
        renderCustomTypesManager();
        if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
        return true;
    }

    function deleteCustomType(id) {
        const type = (data.customEntryTypes || []).find(t => t.id === id);
        if (!type) return;
        showCustomConfirm(
            'Typ löschen?',
            `"${type.label}" wird entfernt. Bestehende Einträge bleiben erhalten.`,
            () => {
                if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];
                const idx = data.customEntryTypes.findIndex(t => t.id === id);
                if (idx === -1) return;
                const deleted = data.customEntryTypes.splice(idx, 1)[0];
                save();
                showCustomMessage('Gelöscht', `"${deleted.label}" entfernt`, 'success');
                renderCustomTypesManager();
                if (typeof refreshTypeAffectedUI === 'function') refreshTypeAffectedUI();
            }
        );
    }

    // ═══ Renderer: Eintrag-Typen ═══
    // Form-Singleton: ein DOM-Node, der je nach editingId zwischen Create/Edit-Modus umschaltet.
    let _ctActiveForm = null;
    let _ctEditingId = null;

    function renderCustomTypesManager() {
        const container = document.getElementById('customTypesContainer');
        if (!container) return;

        if (!Array.isArray(data.customEntryTypes)) data.customEntryTypes = [];
        const custom = data.customEntryTypes;
        const allDefaults = getAllEntryTypes().filter(t => isDefaultType(t.id));

        container.innerHTML = '';

        // — Standard-Typen (editierbar via Override) —
        const stdSection = ctEl('div', 'ct-section');
        stdSection.appendChild(ctSectionHead('Standard', allDefaults.length, true));
        const stdGrid = ctEl('div', 'ct-grid');
        allDefaults.forEach(t => stdGrid.appendChild(ctTypeRow(t, 'standard')));
        stdSection.appendChild(stdGrid);
        container.appendChild(stdSection);

        // — Custom-Typen —
        const customSection = ctEl('div', 'ct-section');
        customSection.appendChild(ctSectionHead('Deine Typen', custom.length, false));

        if (custom.length === 0) {
            customSection.appendChild(ctEmptyState(
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
                'Noch keine eigenen Typen',
                'Erstelle z.B. „Fitness", „Coaching" oder „Pendeln" für genauere Tracking-Kategorien.'
            ));
        } else {
            const grid = ctEl('div', 'ct-grid');
            custom.forEach(t => grid.appendChild(ctTypeRow(t, 'custom')));
            customSection.appendChild(grid);
        }

        // — Add Button + Inline Form (re-used für Edit) —
        const addBtn = ctEl('button', 'ct-add-btn');
        addBtn.type = 'button';
        addBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Neuer Eintrag-Typ</span>
        `;
        const form = ctTypeForm();
        _ctActiveForm = form;
        addBtn.onclick = () => {
            if (form.classList.contains('ct-form-open') && _ctEditingId === null) {
                form.classList.remove('ct-form-open');
                return;
            }
            ctFormSetMode('create');
            form.classList.add('ct-form-open');
            setTimeout(() => form.querySelector('.ct-input')?.focus(), 60);
        };
        customSection.appendChild(addBtn);
        customSection.appendChild(form);

        container.appendChild(customSection);

        // Wenn vorher Form offen war → wieder befüllen (state-preserving render).
        if (_ctEditingId) ctFormSetMode('edit', _ctEditingId);
    }

    // ═══ Type Row ═══
    function ctTypeRow(type, kind) {
        const row = ctEl('div', 'ct-row');
        const color = sanitizeColor(type.color);
        const emojiBox = ctEl('div', 'ct-row-emoji');
        emojiBox.dataset.tint = '1';
        emojiBox.style.setProperty('--tint-rgb', hexToRgbStr(color));
        emojiBox.textContent = type.emoji || '•';

        const info = ctEl('div', 'ct-row-info');
        const lbl = ctEl('div', 'ct-row-label');
        lbl.textContent = String(type.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || type.label || '';
        const desc = ctEl('div', 'ct-row-desc');
        desc.textContent = type.description || '';
        info.appendChild(lbl);
        if (type.description) info.appendChild(desc);

        const dot = ctEl('div', 'ct-row-color-dot');
        dot.style.background = color;

        row.appendChild(emojiBox);
        row.appendChild(info);
        row.appendChild(dot);

        const actions = ctEl('div', 'ct-row-actions');

        if (kind === 'standard') {
            const hasOverride = !!(data.entryTypeOverrides && data.entryTypeOverrides[type.id]);

            const editBtn = ctEl('button', 'ct-icon-btn');
            editBtn.type = 'button';
            editBtn.title = 'Bearbeiten';
            editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.onclick = () => {
                _ctEditingId = type.id;
                if (_ctActiveForm) {
                    ctFormSetMode('edit', type.id);
                    _ctActiveForm.classList.add('ct-form-open');
                    _ctActiveForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            };
            actions.appendChild(editBtn);

            if (hasOverride) {
                const resetBtn = ctEl('button', 'ct-icon-btn');
                resetBtn.type = 'button';
                resetBtn.title = 'Auf Standard zurücksetzen';
                resetBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
                resetBtn.onclick = () => resetDefaultTypeOverride(type.id);
                actions.appendChild(resetBtn);
            } else {
                const badge = ctEl('div', 'ct-row-badge');
                badge.textContent = 'System';
                actions.appendChild(badge);
            }
        } else {
            const editBtn = ctEl('button', 'ct-icon-btn');
            editBtn.type = 'button';
            editBtn.title = 'Bearbeiten';
            editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            editBtn.onclick = () => {
                _ctEditingId = type.id;
                if (_ctActiveForm) {
                    ctFormSetMode('edit', type.id);
                    _ctActiveForm.classList.add('ct-form-open');
                    _ctActiveForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            };
            const delBtn = ctEl('button', 'ct-icon-btn ct-icon-btn-danger');
            delBtn.type = 'button';
            delBtn.title = 'Löschen';
            delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
            delBtn.onclick = () => deleteCustomType(type.id);
            actions.appendChild(editBtn);
            actions.appendChild(delBtn);
        }
        row.appendChild(actions);
        return row;
    }

    // ═══ Type Form (Create + Edit) ═══
    function ctTypeForm() {
        const form = ctEl('div', 'ct-form');
        form.innerHTML = `
            <div class="ct-form-head">
                <div class="ct-form-title" data-field="form-title">Neuer Eintrag-Typ</div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Name</label>
                    <input type="text" class="ct-input" data-field="label" placeholder="z.B. Fitness, Coaching, Pendeln" maxlength="40">
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Emoji</label>
                    <button type="button" class="ct-emoji-trigger" data-field="emoji-trigger">
                        <div class="ct-emoji-display ct-emoji-empty" data-field="emoji-display">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        </div>
                        <span class="ct-emoji-hint">Klick zum Auswählen</span>
                        <span class="ct-emoji-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
                    </button>
                </div>
                <div class="ct-field">
                    <label class="ct-field-label">Farbe</label>
                    <div class="ct-color-row" data-field="color-row"></div>
                    <div class="ct-color-custom">
                        <input type="color" class="ct-color-custom-picker" data-field="color-custom" value="#a855f7">
                        <span class="ct-color-custom-label" data-field="color-hex">#A855F7</span>
                    </div>
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Beschreibung (optional)</label>
                    <textarea class="ct-textarea" data-field="desc" placeholder="z.B. Personal Trainer Session" maxlength="120"></textarea>
                </div>
            </div>

            <div class="ct-form-row" data-field="counts-row">
                <div class="ct-field">
                    <label class="ct-toggle-row">
                        <input type="checkbox" data-field="counts" class="ct-toggle-input">
                        <span class="ct-toggle-knob" aria-hidden="true"></span>
                        <div class="ct-toggle-text">
                            <div class="ct-toggle-title">Zählt als Arbeitszeit</div>
                            <div class="ct-toggle-hint">Wenn aktiv, fließen Stunden in die Soll/Ist-Bilanz ein und zeigen +/− Diff. Aus = nur Tracking ohne Bilanz-Effekt.</div>
                        </div>
                    </label>
                </div>
            </div>

            <div class="ct-form-actions">
                <button type="button" class="ct-btn ct-btn-ghost" data-action="cancel">Abbrechen</button>
                <button type="button" class="ct-btn ct-btn-primary" data-action="save">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span data-field="save-label">Speichern</span>
                </button>
            </div>
        `;

        // State im Form-Node selbst speichern, damit ctFormSetMode (Modul-extern) darauf zugreifen kann.
        form._ctState = { emoji: '', color: '#a855f7', editingId: null };

        const labelInp     = form.querySelector('[data-field="label"]');
        const colorRow     = form.querySelector('[data-field="color-row"]');
        const colorPicker  = form.querySelector('[data-field="color-custom"]');
        const colorHexLbl  = form.querySelector('[data-field="color-hex"]');
        const emojiTrig    = form.querySelector('[data-field="emoji-trigger"]');
        const emojiDisp    = form.querySelector('[data-field="emoji-display"]');
        const cancelBtn    = form.querySelector('[data-action="cancel"]');
        const saveBtn      = form.querySelector('[data-action="save"]');

        // Color swatches
        CT_PRESET_COLORS.forEach(c => {
            const sw = ctEl('button', 'ct-color-swatch');
            sw.type = 'button';
            sw.style.background = c;
            sw.title = c;
            sw.dataset.color = c;
            sw.onclick = () => {
                form._ctState.color = c;
                colorPicker.value = c;
                colorHexLbl.textContent = c.toUpperCase();
                colorRow.querySelectorAll('.ct-color-swatch').forEach(x => x.classList.toggle('ct-color-active', x.dataset.color === c));
            };
            colorRow.appendChild(sw);
        });

        colorPicker.oninput = (e) => {
            form._ctState.color = e.target.value;
            colorHexLbl.textContent = e.target.value.toUpperCase();
            colorRow.querySelectorAll('.ct-color-swatch').forEach(x => x.classList.toggle('ct-color-active', x.dataset.color === e.target.value));
        };

        emojiTrig.id = emojiTrig.id || `emojiTrig-${Date.now()}`;
        emojiTrig.onclick = (e) => {
            e.preventDefault();
            if (typeof openEmojiPicker !== 'function') {
                showCustomMessage('Fehler', 'Emoji-Picker nicht geladen', 'error');
                return;
            }
            openEmojiPicker(emojiTrig, (em) => {
                form._ctState.emoji = em;
                emojiDisp.classList.remove('ct-emoji-empty');
                emojiDisp.textContent = em;
                emojiTrig.querySelector('.ct-emoji-hint').textContent = 'Geändert?';
            });
        };

        cancelBtn.onclick = () => {
            form.classList.remove('ct-form-open');
            _ctEditingId = null;
            ctFormReset(form);
        };

        saveBtn.onclick = () => {
            const label = labelInp.value.trim();
            const state = form._ctState;

            if (!label) {
                showCustomMessage('Name fehlt', 'Bitte gib einen Namen ein', 'error');
                labelInp.focus();
                return;
            }
            if (!state.emoji) {
                showCustomMessage('Emoji fehlt', 'Bitte wähle ein Emoji aus', 'error');
                return;
            }

            const desc = form.querySelector('[data-field="desc"]').value.trim();
            const counts = form.querySelector('[data-field="counts"]').checked;
            const editingId = state.editingId;

            // Reset edit state BEFORE CRUD (das löst Re-Render aus → Form-Node wird ersetzt).
            _ctEditingId = null;

            if (editingId === null) {
                createCustomType(label, state.emoji, state.color, desc, counts);
            } else if (isDefaultType(editingId)) {
                setDefaultTypeOverride(editingId, {
                    emoji: state.emoji,
                    color: state.color,
                    description: desc,
                    label: label
                });
            } else {
                editCustomType(editingId, {
                    label: `${state.emoji} ${label}`,
                    emoji: state.emoji,
                    color: state.color,
                    description: desc,
                    countsAsWork: counts
                });
            }

            // Form wurde während CRUD neu erstellt → über _ctActiveForm (jetzt = neuer Node) schließen.
            if (_ctActiveForm) _ctActiveForm.classList.remove('ct-form-open');
        };

        return form;
    }

    function ctFormReset(form) {
        if (!form) return;
        form._ctState = { emoji: '', color: '#a855f7', editingId: null };
        form.querySelector('[data-field="label"]').value = '';
        form.querySelector('[data-field="desc"]').value = '';
        form.querySelector('[data-field="counts"]').checked = false;
        form.querySelector('[data-field="counts-row"]').style.display = '';
        form.querySelector('[data-field="color-custom"]').value = '#a855f7';
        form.querySelector('[data-field="color-hex"]').textContent = '#A855F7';
        const disp = form.querySelector('[data-field="emoji-display"]');
        disp.classList.add('ct-emoji-empty');
        disp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
        form.querySelector('[data-field="emoji-trigger"] .ct-emoji-hint').textContent = 'Klick zum Auswählen';
        form.querySelector('[data-field="form-title"]').textContent = 'Neuer Eintrag-Typ';
        form.querySelector('[data-field="save-label"]').textContent = 'Speichern';
        form.querySelectorAll('.ct-color-swatch').forEach(sw => sw.classList.toggle('ct-color-active', sw.dataset.color === '#a855f7'));
    }

    function ctFormSetMode(mode, typeId) {
        const form = _ctActiveForm;
        if (!form) return;

        if (mode === 'create') {
            _ctEditingId = null;
            ctFormReset(form);
            return;
        }

        // Edit mode
        const info = getEntryTypeInfo(typeId);
        if (!info) return;

        const cleanLabel = String(info.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || info.label || '';

        form._ctState = {
            emoji: info.emoji || '',
            color: sanitizeColor(info.color),
            editingId: typeId
        };

        form.querySelector('[data-field="label"]').value = cleanLabel;
        form.querySelector('[data-field="desc"]').value = info.description || '';

        // counts-Row nur bei Custom-Types relevant — Standards haben hartcodierte Logik.
        const isStd = isDefaultType(typeId);
        form.querySelector('[data-field="counts-row"]').style.display = isStd ? 'none' : '';
        form.querySelector('[data-field="counts"]').checked = info.countsAsWork === true;

        const disp = form.querySelector('[data-field="emoji-display"]');
        if (info.emoji) {
            disp.classList.remove('ct-emoji-empty');
            disp.textContent = info.emoji;
            form.querySelector('[data-field="emoji-trigger"] .ct-emoji-hint').textContent = 'Geändert?';
        } else {
            disp.classList.add('ct-emoji-empty');
        }

        const hexUp = sanitizeColor(info.color).toUpperCase();
        form.querySelector('[data-field="color-custom"]').value = sanitizeColor(info.color);
        form.querySelector('[data-field="color-hex"]').textContent = hexUp;
        form.querySelectorAll('.ct-color-swatch').forEach(sw => sw.classList.toggle('ct-color-active', sw.dataset.color === sanitizeColor(info.color)));

        form.querySelector('[data-field="form-title"]').textContent = isStd ? `„${cleanLabel}" anpassen` : `„${cleanLabel}" bearbeiten`;
        form.querySelector('[data-field="save-label"]').textContent = 'Übernehmen';
    }

    // ═══ Custom Fields ═══
    function createCustomField(label, type, entryType, required, options) {
        if (!label || !type) {
            showCustomMessage('Fehler', 'Label und Typ erforderlich', 'error');
            return false;
        }
        if (!Array.isArray(data.customFields)) data.customFields = [];

        const id = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        data.customFields.push({
            id,
            label,
            type,
            entryType: entryType || 'all',
            required: !!required,
            options: type === 'select' ? (options || '').split(',').map(s => s.trim()).filter(Boolean) : [],
            createdAt: new Date().toISOString()
        });
        save();
        showCustomMessage('Custom Field erstellt', `"${label}" hinzugefügt`, 'success');
        renderCustomFieldsManager();
        if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields();
        return true;
    }

    function deleteCustomField(id) {
        const field = (data.customFields || []).find(f => f.id === id);
        if (!field) return;
        showCustomConfirm(
            'Field löschen?',
            `"${field.label}" wird entfernt.`,
            () => {
                if (!Array.isArray(data.customFields)) data.customFields = [];
                const idx = data.customFields.findIndex(f => f.id === id);
                if (idx === -1) return;
                const deleted = data.customFields.splice(idx, 1)[0];
                save();
                showCustomMessage('Gelöscht', `"${deleted.label}" entfernt`, 'success');
                renderCustomFieldsManager();
                if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields();
            }
        );
    }

    function renderCustomFieldsManager() {
        const container = document.getElementById('customFieldsContainer');
        if (!container) return;

        if (!Array.isArray(data.customFields)) data.customFields = [];
        const fields = data.customFields;

        container.innerHTML = '';

        const section = ctEl('div', 'ct-section');
        section.appendChild(ctSectionHead('Deine Felder', fields.length, false));

        if (fields.length === 0) {
            section.appendChild(ctEmptyState(
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>',
                'Noch keine Custom Fields',
                'Erweitere Einträge um eigene Felder wie „Client", „Billable" oder „Projekt-Code".'
            ));
        } else {
            const grid = ctEl('div', 'ct-grid');
            fields.forEach(f => grid.appendChild(ctFieldRow(f)));
            section.appendChild(grid);
        }

        const addBtn = ctEl('button', 'ct-add-btn');
        addBtn.type = 'button';
        addBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Neues Custom Field</span>
        `;
        const form = ctFieldCreateForm();
        addBtn.onclick = () => {
            const isOpen = form.classList.toggle('ct-form-open');
            if (isOpen) setTimeout(() => form.querySelector('.ct-input')?.focus(), 60);
        };
        section.appendChild(addBtn);
        section.appendChild(form);

        container.appendChild(section);
    }

    function ctFieldRow(field) {
        const row = ctEl('div', 'ct-row');
        const typeInfo = getEntryTypeInfo(field.entryType);
        const scopeLabel = field.entryType === 'all' ? 'Alle Typen' : (typeInfo ? typeInfo.label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() : field.entryType);

        const iconBox = ctEl('div', 'ct-row-emoji');
        iconBox.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;color:var(--text-muted);"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/></svg>';

        const info = ctEl('div', 'ct-row-info');
        const lbl = ctEl('div', 'ct-row-label');
        lbl.textContent = field.label;
        const desc = ctEl('div', 'ct-row-desc');
        desc.textContent = `${scopeLabel} • ${field.type}${field.required ? ' • erforderlich' : ''}`;
        info.appendChild(lbl);
        info.appendChild(desc);

        const actions = ctEl('div', 'ct-row-actions');
        const delBtn = ctEl('button', 'ct-icon-btn ct-icon-btn-danger');
        delBtn.type = 'button';
        delBtn.title = 'Löschen';
        delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
        delBtn.onclick = () => deleteCustomField(field.id);
        actions.appendChild(delBtn);

        row.appendChild(iconBox);
        row.appendChild(info);
        row.appendChild(actions);
        return row;
    }

    function ctFieldCreateForm() {
        const form = ctEl('div', 'ct-form');
        const allTypes = getAllEntryTypes();
        const typeOpts = allTypes.map(t => {
            const lbl = String(t.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || t.label;
            return `<option value="${esc(t.id)}">${esc(lbl)}</option>`;
        }).join('');

        form.innerHTML = `
            <div class="ct-form-head">
                <div class="ct-form-title">Neues Custom Field</div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Bezeichnung</label>
                    <input type="text" class="ct-input" data-field="label" placeholder="z.B. Client, Projekt-Code, Billable" maxlength="40">
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label">Feldtyp</label>
                    <select class="ct-select" data-field="type">
                        <option value="text">Text</option>
                        <option value="number">Zahl</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="select">Auswahl</option>
                    </select>
                </div>
                <div class="ct-field">
                    <label class="ct-field-label">Gilt für</label>
                    <select class="ct-select" data-field="scope">
                        <option value="all">Alle Typen</option>
                        ${typeOpts}
                    </select>
                </div>
            </div>

            <div class="ct-form-row" data-field="options-row" style="display:none;">
                <div class="ct-field">
                    <label class="ct-field-label">Auswahl-Optionen (Komma-getrennt)</label>
                    <input type="text" class="ct-input" data-field="options" placeholder="z.B. Hoch, Mittel, Niedrig">
                </div>
            </div>

            <div class="ct-form-row">
                <div class="ct-field">
                    <label class="ct-field-label" style="display:flex; align-items:center; gap:8px; cursor:pointer; text-transform:none; letter-spacing:0;">
                        <input type="checkbox" data-field="required" style="accent-color: var(--primary); width:14px; height:14px;">
                        <span style="font-size:0.8rem; color:var(--text-main); font-weight:500;">Pflichtfeld</span>
                    </label>
                </div>
            </div>

            <div class="ct-form-actions">
                <button type="button" class="ct-btn ct-btn-ghost" data-action="cancel">Abbrechen</button>
                <button type="button" class="ct-btn ct-btn-primary" data-action="save">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Speichern
                </button>
            </div>
        `;

        const labelInp  = form.querySelector('[data-field="label"]');
        const typeSel   = form.querySelector('[data-field="type"]');
        const scopeSel  = form.querySelector('[data-field="scope"]');
        const optsRow   = form.querySelector('[data-field="options-row"]');
        const optsInp   = form.querySelector('[data-field="options"]');
        const reqChk    = form.querySelector('[data-field="required"]');
        const cancelBtn = form.querySelector('[data-action="cancel"]');
        const saveBtn   = form.querySelector('[data-action="save"]');

        typeSel.onchange = () => {
            optsRow.style.display = typeSel.value === 'select' ? '' : 'none';
        };

        cancelBtn.onclick = () => {
            form.classList.remove('ct-form-open');
            labelInp.value = '';
            typeSel.value = 'text';
            scopeSel.value = 'all';
            optsInp.value = '';
            optsRow.style.display = 'none';
            reqChk.checked = false;
        };

        saveBtn.onclick = () => {
            const label = labelInp.value.trim();
            if (!label) {
                showCustomMessage('Bezeichnung fehlt', 'Bitte gib eine Bezeichnung ein', 'error');
                labelInp.focus();
                return;
            }
            createCustomField(label, typeSel.value, scopeSel.value, reqChk.checked, optsInp.value);
            cancelBtn.onclick();
        };

        return form;
    }

    // ═══ Custom Fields im Eintrags-Formular (Erfassen + Edit) ═══
    // Bis hierher wurden Custom Fields nur in den Settings definiert & gelistet, aber NIRGENDS
    // ins Eintrags-Formular gerendert oder mit einem Eintrag gespeichert. Das passiert jetzt hier.

    // Felder, die für einen Eintragstyp gelten ('all' + typ-spezifische).
    function getCustomFieldsForType(typeId) {
        if (!Array.isArray(data.customFields)) return [];
        return data.customFields.filter(f => f && (f.entryType === 'all' || f.entryType === typeId));
    }

    // Baut die Input-Elemente in einen Container. opts steuert CSS-Klassen (Erfassen vs. Edit-Modal).
    function cfBuildInputs(container, fields, values, opts) {
        opts = opts || {};
        const inputCls  = opts.inputClass  || 'glass-input';
        const selectCls = opts.selectClass || 'glass-select';
        const wrapCls   = opts.wrapClass   || 'entry-form__field';
        const labelCls  = opts.labelClass  || 'entry-form__label';
        const prefix    = opts.prefix      || 'cf';
        values = values || {};
        container.innerHTML = '';

        fields.forEach(f => {
            const wrap = ctEl('div', wrapCls);
            wrap.setAttribute('data-cf-wrap', f.id);
            const inputId = `${prefix}__${f.id}`;
            const val = values[f.id];

            if (f.type === 'checkbox') {
                // Checkbox: Box + Label in einer Zeile
                const row = ctEl('label', labelCls);
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.gap = '8px';
                row.style.cursor = 'pointer';
                const box = document.createElement('input');
                box.type = 'checkbox';
                box.id = inputId;
                box.style.width = '15px';
                box.style.height = '15px';
                box.style.accentColor = 'var(--primary)';
                box.checked = (val === true || val === 'true');
                box.setAttribute('data-cf-id', f.id);
                box.setAttribute('data-cf-type', 'checkbox');
                if (f.required) box.setAttribute('data-cf-required', '1');
                const span = document.createElement('span');
                span.textContent = f.label + (f.required ? ' *' : '');
                row.appendChild(box);
                row.appendChild(span);
                wrap.appendChild(row);
            } else {
                const label = ctEl('label', labelCls);
                label.setAttribute('for', inputId);
                label.textContent = f.label + (f.required ? ' *' : '');
                wrap.appendChild(label);

                let input;
                if (f.type === 'select') {
                    input = document.createElement('select');
                    input.className = selectCls;
                    const empty = document.createElement('option');
                    empty.value = ''; empty.textContent = '—';
                    input.appendChild(empty);
                    (f.options || []).forEach(o => {
                        const op = document.createElement('option');
                        op.value = o; op.textContent = o;
                        if (val === o) op.selected = true;
                        input.appendChild(op);
                    });
                } else {
                    input = document.createElement('input');
                    input.type = (f.type === 'number') ? 'number' : 'text';
                    input.className = inputCls;
                    if (val != null && val !== '') input.value = val;
                }
                input.id = inputId;
                input.setAttribute('data-cf-id', f.id);
                input.setAttribute('data-cf-type', f.type);
                if (f.required) input.setAttribute('data-cf-required', '1');
                wrap.appendChild(input);
            }
            container.appendChild(wrap);
        });
    }

    // Liest die aktuellen Werte + prüft Pflichtfelder. → { ok, values, missing }
    function cfCollect(container) {
        const out = {};
        let missing = null;
        if (!container) return { ok: true, values: out };
        container.querySelectorAll('[data-cf-id]').forEach(el => {
            const fid = el.getAttribute('data-cf-id');
            const t = el.getAttribute('data-cf-type');
            const req = el.getAttribute('data-cf-required') === '1';
            let v;
            if (t === 'checkbox') {
                v = el.checked;
                if (req && v !== true && !missing) missing = cfLabelOf(el, fid);
                if (v) out[fid] = true;
            } else {
                v = (el.value || '').trim();
                if (req && !v && !missing) missing = cfLabelOf(el, fid);
                if (v !== '') out[fid] = (t === 'number') ? v : v;
            }
        });
        return { ok: !missing, values: out, missing };
    }

    function cfLabelOf(el, fallback) {
        const wrap = el.closest('[data-cf-wrap]');
        const lbl = wrap ? wrap.querySelector('label, span') : null;
        return (lbl && lbl.textContent ? lbl.textContent.replace(/\s*\*$/, '') : fallback);
    }

    // — Erfassen-Formular —
    function renderEntryCustomFields(preserve) {
        const c = document.getElementById('entryCustomFields');
        if (!c) return;
        const sel = document.getElementById('inpType');
        const typeId = sel ? sel.value : 'all';
        const fields = getCustomFieldsForType(typeId);
        if (!fields.length) { c.style.display = 'none'; c.innerHTML = ''; return; }
        const vals = (preserve === false) ? {} : cfCollect(c).values;
        cfBuildInputs(c, fields, vals, { prefix: 'cf' });
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.gap = '0.85rem';
    }

    function collectEntryCustomFieldValues() {
        return cfCollect(document.getElementById('entryCustomFields'));
    }

    // — Edit-Modal —
    function renderEditCustomFields(entry) {
        const c = document.getElementById('editCustomFields');
        const row = document.getElementById('editCustomFieldsRow');
        if (!c) return;
        const sel = document.getElementById('editInpType');
        const typeId = sel ? sel.value : (entry ? entry.type : 'all');
        const fields = getCustomFieldsForType(typeId);
        if (!fields.length) {
            c.style.display = 'none'; c.innerHTML = '';
            if (row) row.style.display = 'none';
            return;
        }
        // Gespeicherte Werte des Eintrags + aktuell getippte (bei Typ-Wechsel) mergen.
        const stored = (entry && entry.customFieldValues) || {};
        const current = cfCollect(c).values;
        const vals = Object.assign({}, stored, current);
        cfBuildInputs(c, fields, vals, {
            prefix: 'ecf', inputClass: 'edit-input', selectClass: 'edit-select',
            wrapClass: 'edit-field full', labelClass: 'edit-label'
        });
        c.style.display = 'flex';
        c.style.flexDirection = 'column';
        c.style.gap = '14px';
        if (row) row.style.display = '';
    }

    function collectEditCustomFieldValues() {
        return cfCollect(document.getElementById('editCustomFields')).values;
    }

    // ═══ Helpers ═══
    function ctEl(tag, cls) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        return el;
    }

    function ctSectionHead(title, count, muted) {
        const head = ctEl('div', 'ct-section-head');
        const row = ctEl('div', 'ct-section-title-row');
        const t = ctEl('div', 'ct-section-title');
        t.textContent = title;
        if (muted) t.style.color = 'var(--text-muted)';
        row.appendChild(t);
        const c = ctEl('div', 'ct-section-count');
        c.textContent = count;
        row.appendChild(c);
        head.appendChild(row);
        return head;
    }

    function ctEmptyState(iconSvg, text, hint) {
        const wrap = ctEl('div', 'ct-empty');
        wrap.innerHTML = `
            <div class="ct-empty-icon">${iconSvg}</div>
            <div class="ct-empty-text">${esc(text)}</div>
            <div class="ct-empty-hint">${esc(hint)}</div>
        `;
        return wrap;
    }

    // ═══ Entry-Form-Select Sync ═══
    // Füllt das <select id="inpType"> mit den Standard + Custom Types.
    function refreshEntryTypeSelect() {
        const sel = document.getElementById('inpType');
        if (!sel) return;
        const previousValue = sel.value;
        // 'korrektur' ist kein buchbarer Tages-Typ, sondern wird nur über die
        // Saldo-Anpassung auf dem Gleitzeit-Card erzeugt → aus dem Eintrags-Dropdown raus.
        const types = getAllEntryTypes().filter(t => t.id !== 'korrektur');
        sel.innerHTML = '';
        types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            const cleanLabel = String(t.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || t.label || t.id;
            opt.textContent = `${t.emoji || ''} ${cleanLabel}`.trim();
            sel.appendChild(opt);
        });
        if (types.some(t => t.id === previousValue)) sel.value = previousValue;
    }

    // ═══ Affected UI Refresh ═══
    // Aktualisiert alle Orte mit hardcoded Type-Emojis/Labels, damit Standard-Overrides
    // sofort sichtbar werden (Historie-Pills, Dashboard-Aktivitäten, History-Filter-Select).
    function refreshTypeAffectedUI() {
        // History Pills (index.html: .hl-type-pills) — update inner text.
        const pillMap = { work: 'Arbeit', school: 'Schule', vacation: 'Urlaub', gleittag: 'Gleittag', sick: 'Krank', holiday: 'Feiertag' };
        Object.keys(pillMap).forEach(id => {
            const pill = document.querySelector(`.hl-pill.hl-pill-${id}`);
            if (!pill) return;
            const info = getEntryTypeInfo(id);
            if (!info) return;
            const cleanLabel = String(info.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || pillMap[id];
            pill.textContent = `${info.emoji || ''} ${cleanLabel}`.trim();
        });

        // History Filter Select
        const histSel = document.getElementById('historyFilterType');
        if (histSel) {
            const prev = histSel.value;
            histSel.innerHTML = '<option value="all">Alle</option>';
            getAllEntryTypes().forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                const lbl = String(t.label || '').replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, '').trim() || t.label || t.id;
                opt.textContent = lbl;
                histSel.appendChild(opt);
            });
            histSel.value = prev;
        }

        // Entry-Form select
        refreshEntryTypeSelect();

        // Custom Fields im Erfassen-Formular (Scope hängt am gewählten Typ)
        if (typeof renderEntryCustomFields === 'function') renderEntryCustomFields();

        // Dashboard activity timeline re-render
        if (typeof renderLists === 'function') {
            try { renderLists(); } catch(e) { /* harmless if dashboard not visible */ }
        }
    }

    // Initial nach Daten-Load (init-app.js patcht erst data, danach laufen wir).
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(refreshTypeAffectedUI, 300);
    });
