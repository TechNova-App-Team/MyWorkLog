// ═══ CORE: CUSTOM-TYPES-FIELDS ═══
    // ===== CUSTOM ENTRY TYPES SYSTEM =====
    // Ermöglicht Benutzer, neue Eintrag-Typen zu erstellen (z.B. Fitness, Training, Meetings)

    const DEFAULT_ENTRY_TYPES = [
        { id: 'work', label: '⏱️ Arbeit', emoji: '⏱️', color: '#a855f7', description: 'Normale Arbeitszeit' },
        { id: 'school', label: '📚 Berufsschule', emoji: '📚', color: '#3b82f6', description: 'Berufsschule / Noten' },
        { id: 'vacation', label: '🏖️ Urlaub', emoji: '🏖️', color: '#10b981', description: 'Urlaubstage' },
        { id: 'gleittag', label: '⚡ Gleittag', emoji: '⚡', color: '#f59e0b', description: 'Gleittag (Überstundenabbau)' },
        { id: 'sick', label: '🤒 Krankheit', emoji: '🤒', color: '#ef4444', description: 'Krankheitstage' },
        { id: 'holiday', label: '🎉 Feiertag', emoji: '🎉', color: '#f59e0b', description: 'Offizielle Feiertage' }
    ];

    function getAllEntryTypes() {
        // Kombiniere Standard-Typen mit benutzerdefinierten
        return [...DEFAULT_ENTRY_TYPES, ...(data.customEntryTypes || [])];
    }

    function getEntryTypeInfo(typeId) {
        const allTypes = getAllEntryTypes();
        return allTypes.find(t => t.id === typeId);
    }

    function createCustomType(label, emoji, color, description) {
        if (!label || !emoji || !color) {
            showCustomMessage('❌ Fehler', 'Label, Emoji und Farbe sind erforderlich', 'error');
            return false;
        }

        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newType = {
            id: id,
            label: `${emoji} ${label}`,
            emoji: emoji,
            color: color,
            description: description || '',
            createdAt: new Date().toISOString()
        };

        data.customEntryTypes.push(newType);
        saveData();
        showCustomMessage('✅ Eintrag-Typ erstellt', `"${label}" wurde hinzugefügt!`, 'success');
        renderCustomTypesManager();
        return true;
    }

    function editCustomType(id, updates) {
        const idx = data.customEntryTypes.findIndex(t => t.id === id);
        if (idx === -1) return false;

        data.customEntryTypes[idx] = { ...data.customEntryTypes[idx], ...updates };
        saveData();
        showCustomMessage('✅ Eintrag-Typ aktualisiert', 'Änderungen gespeichert!', 'success');
        renderCustomTypesManager();
        return true;
    }

    function deleteCustomType(id) {
        showCustomConfirm(
            '🗑️ Bestätigung',
            'Diesen Eintrag-Typ wirklich löschen? Bestehende Einträge bleiben erhalten.',
            () => {
                const idx = data.customEntryTypes.findIndex(t => t.id === id);
                if (idx === -1) return;

                const deleted = data.customEntryTypes.splice(idx, 1)[0];
                saveData();
                showCustomMessage('✅ Gelöscht', `"${deleted.label}" wurde entfernt!`, 'success');
                renderCustomTypesManager();
            }
        );
    }

    function showCustomTypeModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 2rem;
            min-width: 400px;
            max-width: 500px;
            z-index: 500;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            backdrop-filter: blur(20px);
        `;

        modal.innerHTML = `
            <h3 style="margin:0 0 1.5rem 0; color:var(--primary);">➕ Neuer Eintrag-Typ</h3>
            
            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Label (z.B. "Fitness")</label>
                <input type="text" id="customTypeLabel" class="glass-input" placeholder="z.B. Fitness, Training, Meetings" style="width:100%;">
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Emoji</label>
                <input type="text" id="customTypeEmoji" class="glass-input" placeholder="z.B. 🏋️, 🎓, 🤝" style="width:100%; font-size:2rem; text-align:center; padding:1rem;">
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Farbe</label>
                <input type="color" id="customTypeColor" class="glass-input" style="width:100%; height:50px; border-radius:10px; cursor:pointer;" value="#a855f7">
            </div>

            <div style="margin-bottom:2rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Beschreibung (optional)</label>
                <textarea id="customTypeDesc" class="glass-input" placeholder="z.B. Mein persönliches Fitness-Training" style="width:100%; height:80px; resize:none;"></textarea>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="btn" onclick="this.parentElement.parentElement.remove();" style="background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.4); color:#fff;">Abbrechen</button>
                <button class="btn btn-primary" onclick="
                    const label = document.getElementById('customTypeLabel').value;
                    const emoji = document.getElementById('customTypeEmoji').value;
                    const color = document.getElementById('customTypeColor').value;
                    const desc = document.getElementById('customTypeDesc').value;
                    
                    if (!label || !emoji || !color) {
                        showCustomMessage('❌ Fehler', 'Bitte fülle alle Felder aus!', 'error');
                        return;
                    }
                    
                    createCustomType(label, emoji, color, desc);
                    this.parentElement.parentElement.remove();
                " style="background:var(--primary); padding:10px 20px; border-radius:8px;">➕ Erstellen</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('customTypeLabel').focus();

        // Schließen bei ESC
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }

    function renderCustomTypesManager() {
        const container = document.getElementById('customTypesContainer');
        if (!container) return;

        container.innerHTML = '';

        // Standard Types (Info)
        const stdSection = document.createElement('div');
        stdSection.style.cssText = 'margin-bottom:2rem;';
        stdSection.innerHTML = `
            <h5 style="color:var(--primary); margin-bottom:1rem; font-weight:600;">📌 Standard-Typen (immer verfügbar)</h5>
            <div style="display:grid; gap:0.75rem;">
                ${DEFAULT_ENTRY_TYPES.map(t => `
                    <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border);">
                        <div style="font-size:1.5rem;">${t.emoji}</div>
                        <div style="flex:1;">
                            <div style="font-weight:600;">${t.label}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${t.description}</div>
                        </div>
                        <div style="width:20px; height:20px; background:${t.color}; border-radius:50%; border:1px solid var(--border);"></div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(stdSection);

        // Custom Types
        if (Array.isArray(data.customEntryTypes) && data.customEntryTypes.length > 0) {
            const customSection = document.createElement('div');
            customSection.style.cssText = 'margin-bottom:2rem;';
            customSection.innerHTML = `<h5 style="color:var(--success); margin-bottom:1rem; font-weight:600;">✨ Deine Custom-Typen</h5>`;
            
            data.customEntryTypes.forEach(type => {
                const typeEl = document.createElement('div');
                typeEl.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border); margin-bottom:0.75rem;';
                typeEl.innerHTML = `
                    <div style="font-size:1.5rem;">${type.emoji}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;">${type.label}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${type.description}</div>
                    </div>
                    <div style="width:20px; height:20px; background:${type.color}; border-radius:50%; border:1px solid var(--border);"></div>
                    <button class="btn btn-ghost" onclick="deleteCustomType('${type.id}')" style="padding:6px 12px; font-size:0.85rem;">🗑️ Löschen</button>
                `;
                customSection.appendChild(typeEl);
            });

            container.appendChild(customSection);
        }

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.style.cssText = 'width:100%; padding:12px; background:linear-gradient(135deg, #10b981, #06b6d4); border-radius:10px; font-size:0.95rem; font-weight:600; margin-top:1rem;';
        addBtn.textContent = '➕ Neuer Eintrag-Typ';
        addBtn.onclick = showCustomTypeModal;
        container.appendChild(addBtn);
    }

    function renderCustomFieldsManager() {
        const container = document.getElementById('customFieldsContainer');
        if (!container) return;

        container.innerHTML = '';

        if (data.customFields && data.customFields.length > 0) {
            const fieldsSection = document.createElement('div');
            fieldsSection.style.cssText = 'margin-bottom:1.5rem;';
            
            data.customFields.forEach(field => {
                const typeInfo = getEntryTypeInfo(field.entryType);
                const typeLabel = field.entryType === 'all' ? 'Alle Typen' : (typeInfo?.label || field.entryType);
                
                const fieldEl = document.createElement('div');
                fieldEl.style.cssText = 'display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border); margin-bottom:0.75rem;';
                fieldEl.innerHTML = `
                    <div style="flex:1;">
                        <div style="font-weight:600;">${field.label}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">
                            ${typeLabel} • ${field.type} ${field.required ? '(erforderlich)' : ''}
                        </div>
                    </div>
                    <button class="btn btn-ghost" onclick="deleteCustomField('${field.id}')" style="padding:6px 12px; font-size:0.85rem;">🗑️ Löschen</button>
                `;
                fieldsSection.appendChild(fieldEl);
            });

            container.appendChild(fieldsSection);
        } else {
            const emptyEl = document.createElement('div');
            emptyEl.style.cssText = 'padding:1.5rem; text-align:center; color:var(--text-muted); font-size:0.9rem;';
            emptyEl.innerHTML = '📋 Noch keine Custom Fields. Klicke "+ Neues Field" um eins zu erstellen!';
            container.appendChild(emptyEl);
        }

        // Add Button
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary';
        addBtn.style.cssText = 'width:100%; padding:12px; background:linear-gradient(135deg, #3b82f6, #06b6d4); border-radius:10px; font-size:0.95rem; font-weight:600; margin-top:1rem;';
        addBtn.textContent = '➕ Neues Custom Field';
        addBtn.onclick = showCustomFieldModal;
        container.appendChild(addBtn);
    }

    function showCustomFieldModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-glass);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 2rem;
            min-width: 400px;
            max-width: 500px;
            z-index: 500;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            backdrop-filter: blur(20px);
            max-height: 90vh;
            overflow-y: auto;
        `;

        modal.innerHTML = `
            <h3 style="margin:0 0 1.5rem 0; color:var(--primary);">➕ Neues Custom Field</h3>
            
            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Gilt für Typ</label>
                <select id="fieldType" class="glass-input" style="width:100%;">
                    <option value="all">Alle Typen</option>
                    ${getAllEntryTypes().map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                </select>
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Field Label (z.B. "Projekt")</label>
                <input type="text" id="fieldLabel" class="glass-input" placeholder="z.B. Projekt, Client, Billable" style="width:100%;">
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">Field Typ</label>
                <select id="fieldFieldType" class="glass-input" style="width:100%;">
                    <option value="text">Text (kurz)</option>
                    <option value="textarea">Text (lang)</option>
                    <option value="number">Zahl</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox (ja/nein)</option>
                    <option value="date">Datum</option>
                </select>
            </div>

            <div style="margin-bottom:1.5rem;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="fieldRequired" style="width:18px; height:18px; cursor:pointer;">
                    <span style="color:var(--text-main);">Dieses Field ist erforderlich</span>
                </label>
            </div>

            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="btn" onclick="this.parentElement.parentElement.remove();" style="background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.4); color:#fff;">Abbrechen</button>
                <button class="btn btn-primary" onclick="
                    const type = document.getElementById('fieldType').value;
                    const label = document.getElementById('fieldLabel').value;
                    const fieldType = document.getElementById('fieldFieldType').value;
                    const required = document.getElementById('fieldRequired').checked;
                    
                    if (!label || !fieldType) {
                        showCustomMessage('❌ Fehler', 'Label und Typ sind erforderlich!', 'error');
                        return;
                    }
                    
                    createCustomField(type, label, fieldType, required, []);
                    this.parentElement.parentElement.remove();
                " style="background:var(--primary); padding:10px 20px; border-radius:8px;">➕ Erstellen</button>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('fieldLabel').focus();

        // Schließen bei ESC
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }

    function populateTypeDropdowns() {
        // Utility: Aktualisiere alle Type-Dropdowns mit allen verfügbaren Types (Standard + Custom)
        const allTypes = getAllEntryTypes();
        
        // Finde alle Dropdowns mit Type-Optionen (z.B. in Entry-Form, iCal Filter, etc.)
        const typeSelects = document.querySelectorAll('[data-type-dropdown]');
        
        typeSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '';
            
            allTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.label;
                select.appendChild(option);
            });
            
            // Restore previous value if it still exists
            select.value = currentValue;
        });
    }

    // ===== CUSTOM FIELDS SYSTEM =====
    // Pro Eintrag-Typ können Benutzer custom Fields definieren (z.B. Projekt, Client, Billable)

    function createCustomField(entryType, label, fieldType, required = false, options = []) {
        // fieldType: 'text', 'number', 'dropdown', 'checkbox', 'date'
        if (!entryType || !label || !fieldType) {
            showCustomMessage('❌ Fehler', 'Alle Felder sind erforderlich', 'error');
            return false;
        }

        const id = `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const newField = {
            id: id,
            entryType: entryType,  // 'work', 'school', or 'all'
            label: label,
            type: fieldType,
            required: required,
            options: options || [],  // For dropdown type
            description: '',
            createdAt: new Date().toISOString()
        };

        data.customFields.push(newField);
        save();
        showCustomMessage('✅ Custom Field erstellt', `"${label}" wurde hinzugefügt!`, 'success');
        return true;
    }

    function deleteCustomField(fieldId) {
        showCustomConfirm(
            '🗑️ Bestätigung',
            'Dieses Custom Field wirklich löschen? Bestehende Daten bleiben erhalten.',
            () => {
                const idx = data.customFields.findIndex(f => f.id === fieldId);
                if (idx === -1) return;

                const deleted = data.customFields.splice(idx, 1)[0];
                save();
                showCustomMessage('✅ Gelöscht', `"${deleted.label}" wurde entfernt!`, 'success');
            }
        );
    }

    function getFieldsForEntryType(entryType) {
        // Gebe alle Fields für einen bestimmten Type zurück (inkl. 'all' Fields)
        return (data.customFields || []).filter(f => f.entryType === 'all' || f.entryType === entryType);
    }

    function validateEntryWithFields(entry, fields) {
        // Validiere ein Entry gegen die Custom Fields Anforderungen
        for (let field of fields) {
            if (field.required && !entry[field.id]) {
                return { valid: false, error: `${field.label} ist erforderlich!` };
            }
        }
        return { valid: true };
    }

    function renderEntryFormWithFields(entryType) {
        // Später: Rendere Entry-Form mit Custom Fields basierend auf entryType
        const fields = getFieldsForEntryType(entryType);
        // TODO: Render HTML für alle Fields
        return fields;
    }

    // ===== WORKFLOW RULES SYSTEM =====
    // Automatisierung: Wenn X, dann Y (z.B. type=work && hours>8 -> require(project))

    function createWorkflowRule(condition, actions) {
        // condition: { entryType, minHours, maxHours, fieldValues }
        // actions: [ { type: 'require'|'show'|'hide'|'auto-fill', field, value } ]
        
        const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const rule = {
            id: id,
            condition: condition,
            actions: actions || [],
            enabled: true,
            createdAt: new Date().toISOString()
        };

        data.workflowRules.push(rule);
        save();
        showCustomMessage('✅ Workflow Rule erstellt', 'Automatisierung hinzugefügt!', 'success');
        return true;
    }

    function deleteWorkflowRule(ruleId) {
        showCustomConfirm(
            '🗑️ Bestätigung',
            'Diese Workflow Rule wirklich löschen?',
            () => {
                const idx = data.workflowRules.findIndex(r => r.id === ruleId);
                if (idx === -1) return;

                data.workflowRules.splice(idx, 1);
                save();
                showCustomMessage('✅ Gelöscht', 'Rule wurde entfernt!', 'success');
            }
        );
    }

    function evaluateRules(entry) {
        // Evaluiere alle Rules für einen Entry und gebe zu applizierende Actions zurück
        const matchedActions = [];

        data.workflowRules.forEach(rule => {
            if (!rule.enabled) return;

            let conditionMet = true;

            // Check entry type condition
            if (rule.condition.entryType && entry.type !== rule.condition.entryType) {
                conditionMet = false;
            }

            // Check min/max hours
            if (rule.condition.minHours && entry.worked < rule.condition.minHours * 60) {
                conditionMet = false;
            }
            if (rule.condition.maxHours && entry.worked > rule.condition.maxHours * 60) {
                conditionMet = false;
            }

            if (conditionMet) {
                matchedActions.push(...rule.actions);
            }
        });

        return matchedActions;
    }

    function applyRuleActions(entry, actions) {
        // Appliziere Rule-Actions auf einen Entry
        actions.forEach(action => {
            switch (action.type) {
                case 'require':
                    // Field wird erforderlich - wird bei Validierung gecheckt
                    entry._requiredFields = entry._requiredFields || [];
                    if (!entry._requiredFields.includes(action.field)) {
                        entry._requiredFields.push(action.field);
                    }
                    break;
                case 'auto-fill':
                    // Auto-fill mit Wert
                    if (!entry[action.field]) {
                        entry[action.field] = action.value;
                    }
                    break;
                case 'show':
                case 'hide':
                    // UI-Logik - wird bei Rendering gecheckt
                    entry._fieldVisibility = entry._fieldVisibility || {};
                    entry._fieldVisibility[action.field] = (action.type === 'show');
                    break;
            }
        });
        return entry;
    }

    // ===== SAVING & PERSISTENCE =====
    // Alias für save() - wird in Custom Type Funktionen verwendet
    const saveData = save;

    // ===== UNTIS INTEGRATION SYSTEM =====
    // Importiere Stundenplan von Untis (WebUntis Export, JSON/CSV Format)
    
    function initializeUntisIntegration() {
        // Initialisiere Untis Daten in der data struktur
        if (!data.untis) {
            data.untis = {
                school: '',
                username: '',
                timetable: [],
                subjects: [],
                teachers: [],
                rooms: [],
                syncedAt: null,
                autoSync: false,
                syncInterval: 3600 // sekunden
            };
            save();
        }
    }

    function showUntisImportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(3,3,5,0.8);
            backdrop-filter: blur(10px);
            z-index: 500;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, rgba(13,11,26,0.95) 0%, rgba(6,5,16,0.95) 100%); border: 1px solid rgba(var(--primary-rgb),0.25); border-radius: 20px; width: 95%; max-width: 500px; padding: 2rem; box-shadow: 0 20px 60px rgba(0,0,0,0.5); position: relative; overflow: hidden;">
                <!-- Gradient orbs background -->
                <div style="position: absolute; top: -30%; right: -20%; width: 250px; height: 250px; background: radial-gradient(circle, rgba(var(--primary-rgb),0.08), transparent); border-radius: 50%; pointer-events: none;"></div>
                <div style="position: absolute; bottom: -20%; left: -15%; width: 200px; height: 200px; background: radial-gradient(circle, rgba(6,182,212,0.07), transparent); border-radius: 50%; pointer-events: none;"></div>

                <div style="position: relative; z-index: 1;">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                        <div>
                            <h2 style="margin: 0 0 8px 0; color: #fff; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px;">📚 Untis Stundenplan</h2>
                            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 0.9rem;">Dein Schul-Stundenplan</p>
                        </div>
                        <button onclick="this.closest('.modal-overlay').remove();" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); font-size: 1.5rem; color: rgba(255,255,255,0.6); cursor: pointer; padding: 6px; width: 40px; height: 40px; border-radius: 12px; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;" onmouseover="this.style.background='rgba(255,255,255,0.12)'; this.style.color='#fff'; this.style.borderColor='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='rgba(255,255,255,0.6)'; this.style.borderColor='rgba(255,255,255,0.12)'">×</button>
                    </div>

                    <!-- Main Content Card -->
                    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 2rem; text-align: center;">
                        <!-- Large Icon -->
                        <div style="font-size: 3rem; margin-bottom: 1rem;">🔗</div>

                        <!-- Title -->
                        <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 1.2rem; font-weight: 700;">Öffentlicher Link</h3>

                        <!-- Status Badge -->
                        <div style="display: inline-block; background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #fca5a5; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.5px;">
                            ❌ NICHT VERFÜGBAR
                        </div>

                        <!-- Warning Message -->
                        <div style="background: rgba(239,68,68,0.08); border-left: 3px solid rgba(239,68,68,0.4); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left;">
                            <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 0.9rem; line-height: 1.6;">
                                <strong>⚠️ WebUntis blockiert API-Zugriffe (CORS)</strong><br>
                                Der direkte Datenimport über öffentliche Links ist nicht möglich, da WebUntis Cross-Origin-Anfragen ablehnt.
                            </p>
                        </div>

                        <!-- Info Tips -->
                        <div style="background: linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.06)); border: 2px solid rgba(251,146,60,0.3); border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem; text-align: left;">
                            <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.8); font-size: 0.9rem; font-weight: 700;">🚧 BAUSTELLE</p>
                            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 0.85rem; line-height: 1.6;">
                                Der Entwickler kümmert sich darum, eine bessere Lösung zur Untis-Integration zu finden. Bald wird's hier was Neues geben! 🔧
                            </p>
                        </div>

                        <!-- Action Button -->
                        <button onclick="this.closest('.modal-overlay').remove();" style="width: 100%; padding: 12px 24px; background: rgba(var(--primary-rgb),0.2); border: 1px solid rgba(var(--primary-rgb),0.4); color: #a78bfa; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(var(--primary-rgb),0.3)'; this.style.borderColor='rgba(var(--primary-rgb),0.6)'; this.style.color='#c4b5fd'" onmouseout="this.style.background='rgba(var(--primary-rgb),0.2)'; this.style.borderColor='rgba(var(--primary-rgb),0.4)'; this.style.color='#a78bfa'">
                            Schließen
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // ===== UNTIS STUNDENPLAN FUNKTIONEN (DEPRECATED) =====
    // 🚧 BAUSTELLE: Der Nutzer kümmert sich darum, eine bessere Lösung zu Untis-Integration zu finden!
    // 
    // Folgende Funktionen wurden gelöscht, da eine neue Strategie entwickelt wird:
    // - importUntisFile() - Datei-Import
    // - importUntisPublicLink() - Öffentlicher Link (CORS-blockiert)
    // - parseWebUntisLink() - Link-Parsing
    // - processWebUntisTimetable() - Stundenplan verarbeiten
    // - formatUntisTime() - Zeit-Formatierung
    // - parseUntisCSV() - CSV-Parsing
    // - loadUntisManually() - Manuelle Konfiguration
    // - viewUntisSchedule() - Stundenplan anzeigen
    // - createEntryFromUntis() - Einträge erstellen
    // - createUntisEntriesForToday() - Tägliche Einträge
    // - getTodayName() - Tages-Namen
    // - syncUntisAuto() - Auto-Sync
    //
    // STATUS: Der Modal wird nun nur noch die CORS-Blockierung anzeigen.
    // Neue Lösung wird später implementiert.
    // ========================================================
