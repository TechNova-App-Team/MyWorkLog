// ═══ CORE: DASHBOARD-POWER MODULE ═══
// Layout-Presets, Export/Import, Widget-Pin, Verlauf
// Daten leben unter data.settings.dashboard.* — laeuft durch normalen Cloud-Sync.

(function() {
    'use strict';

    var MAX_HISTORY = 5;
    var INIT_DELAY = 600;

    // ──────────────────────────────────────────────
    // STATE
    // ──────────────────────────────────────────────
    function dash() {
        if (typeof data === 'undefined' || !data || !data.settings) return null;
        if (!data.settings.dashboard) data.settings.dashboard = {};
        var d = data.settings.dashboard;
        if (!Array.isArray(d.presets)) d.presets = [];
        if (typeof d.activePresetId !== 'string') d.activePresetId = '';
        if (!Array.isArray(d.history)) d.history = [];
        if (!Array.isArray(d.pinned)) d.pinned = [];
        return d;
    }

    function currentLayout() {
        return Array.isArray(data.settings.widgetLayout) ? data.settings.widgetLayout.slice() : [];
    }

    function readDomLayout() {
        var c = document.getElementById('dashboardContainer');
        if (!c) return [];
        var items = Array.from(c.querySelectorAll('.dashboard-item'));
        items.sort(function(a, b) { return (parseInt(a.style.order) || 0) - (parseInt(b.style.order) || 0); });
        return items.map(function(el) { return el.getAttribute('data-item-id'); }).filter(Boolean);
    }

    function currentPreset() {
        var d = dash(); if (!d) return null;
        return d.presets.find(function(p) { return p.id === d.activePresetId; }) || null;
    }

    function presetById(id) {
        var d = dash(); if (!d) return null;
        return d.presets.find(function(p) { return p.id === id; }) || null;
    }

    function safeSave() {
        try { if (typeof save === 'function') save(); }
        catch (e) { console.warn('[dashboard-power] save() failed:', e); }
    }

    // ──────────────────────────────────────────────
    // PRESETS
    // ──────────────────────────────────────────────
    function ensureDefaultPreset() {
        var d = dash(); if (!d) return;
        if (d.presets.length === 0) {
            var layout = currentLayout();
            if (!layout.length) layout = readDomLayout();
            var preset = {
                id: 'preset-' + Date.now(),
                name: 'Mein Layout',
                icon: '⭐',
                layout: layout,
                pinned: d.pinned.slice(),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            d.presets.push(preset);
            d.activePresetId = preset.id;
            safeSave();
        } else if (!d.activePresetId || !presetById(d.activePresetId)) {
            d.activePresetId = d.presets[0].id;
            safeSave();
        }
    }

    function createPreset(name, icon, layout, pinned) {
        var d = dash(); if (!d) return null;
        var preset = {
            id: 'preset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            name: (name || 'Neues Layout').toString().slice(0, 40),
            icon: icon || '📐',
            layout: Array.isArray(layout) ? layout.slice() : currentLayout(),
            pinned: Array.isArray(pinned) ? pinned.slice() : d.pinned.slice(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        d.presets.push(preset);
        safeSave();
        return preset;
    }

    function renamePreset(id, name) {
        var p = presetById(id); if (!p) return false;
        p.name = (name || p.name).toString().slice(0, 40);
        p.updatedAt = Date.now();
        safeSave();
        return true;
    }

    function deletePreset(id) {
        var d = dash(); if (!d) return false;
        if (d.presets.length <= 1) {
            toast('Nicht möglich', 'Mindestens ein Preset muss vorhanden bleiben.', 'warning');
            return false;
        }
        var idx = d.presets.findIndex(function(p) { return p.id === id; });
        if (idx < 0) return false;
        d.presets.splice(idx, 1);
        if (d.activePresetId === id) {
            switchPreset(d.presets[0].id, true);
        } else {
            safeSave();
        }
        return true;
    }

    function syncCurrentToActivePreset() {
        var p = currentPreset();
        var d = dash();
        if (!p || !d) return;
        p.layout = currentLayout();
        p.pinned = d.pinned.slice();
        p.updatedAt = Date.now();
        safeSave();
    }

    function switchPreset(id, skipHistory) {
        var d = dash(); if (!d) return false;
        var p = presetById(id); if (!p) return false;
        if (!skipHistory) pushHistory('vor Preset-Wechsel');

        d.activePresetId = id;
        d.pinned = (p.pinned || []).slice();
        data.settings.widgetLayout = (p.layout || []).slice();
        try { localStorage.setItem('mwl_dashboard_layout', JSON.stringify(data.settings.widgetLayout)); } catch (e) {}

        applyPresetToDashboard(p);
        safeSave();
        return true;
    }

    function applyPresetToDashboard(preset) {
        var container = document.getElementById('dashboardContainer');
        if (!container) return;
        var desired = Array.isArray(preset.layout) ? preset.layout : [];

        var existing = Array.from(container.querySelectorAll('.dashboard-item'));
        var existingIds = existing.map(function(el) { return el.getAttribute('data-item-id'); }).filter(Boolean);

        // Remove widgets not in preset
        existing.forEach(function(el) {
            var id = el.getAttribute('data-item-id');
            if (id && desired.indexOf(id) < 0) el.remove();
        });

        // Add missing widgets
        desired.forEach(function(id) {
            if (existingIds.indexOf(id) >= 0) return;
            if (typeof widgetLibrary === 'undefined' || !widgetLibrary[id]) return;
            var w = widgetLibrary[id];
            var el = document.createElement('div');
            el.className = 'dashboard-item';
            el.setAttribute('data-item-id', id);
            el.innerHTML = w.html;
            container.appendChild(el);
            if (typeof initializeWidget === 'function') {
                try { initializeWidget(id); } catch (e) { console.warn('initializeWidget failed', id, e); }
            }
        });

        // Apply CSS order
        container.querySelectorAll('.dashboard-item').forEach(function(el) {
            var idx = desired.indexOf(el.getAttribute('data-item-id'));
            el.style.order = idx >= 0 ? idx : 999;
        });

        renderPinBadges();
        if (typeof updateDashboard === 'function') {
            setTimeout(function() { try { updateDashboard(); } catch (e) {} }, 80);
        }
    }

    // ──────────────────────────────────────────────
    // PIN
    // ──────────────────────────────────────────────
    function isWidgetPinned(id) {
        var d = dash(); if (!d) return false;
        return d.pinned.indexOf(id) >= 0;
    }

    function togglePinWidget(id) {
        var d = dash(); if (!d) return;
        var i = d.pinned.indexOf(id);
        if (i >= 0) d.pinned.splice(i, 1);
        else d.pinned.push(id);
        syncCurrentToActivePreset();
        renderPinBadges();
        // Sofort drag-Status updaten (sonst koennen Items trotz Pin verschoben werden)
        blockDragForPinned();
        // Re-render edit-mode controls if active
        var container = document.getElementById('dashboardContainer');
        if (container && container.classList.contains('edit-mode')) renderPinButtons();
    }

    function renderPinBadges() {
        var container = document.getElementById('dashboardContainer');
        if (!container) return;
        var d = dash(); if (!d) return;
        container.querySelectorAll('.dashboard-item').forEach(function(item) {
            var existing = item.querySelector('.dashboard-pin-badge');
            if (existing) existing.remove();
            var id = item.getAttribute('data-item-id');
            if (d.pinned.indexOf(id) < 0) return;

            var badge = document.createElement('div');
            badge.className = 'dashboard-pin-badge';
            badge.title = 'Gepinnt — vor versehentlichem Verschieben geschützt';
            badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-1.5-3.5a2 2 0 0 1-.5-1.3V8a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4.2a2 2 0 0 1-.5 1.3L5 17z"/></svg>';
            if (getComputedStyle(item).position === 'static') item.style.position = 'relative';
            item.appendChild(badge);
        });
    }

    function renderPinButtons() {
        var container = document.getElementById('dashboardContainer');
        if (!container || !container.classList.contains('edit-mode')) return;
        container.querySelectorAll('.dashboard-item').forEach(function(item) {
            var existing = item.querySelector('.dashboard-item-pin-btn');
            if (existing) existing.remove();
            var id = item.getAttribute('data-item-id');
            var pinned = isWidgetPinned(id);

            var btn = document.createElement('button');
            btn.className = 'dashboard-item-pin-btn' + (pinned ? ' is-pinned' : '');
            btn.title = pinned ? 'Pin lösen' : 'Widget anpinnen';
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-1.5-3.5a2 2 0 0 1-.5-1.3V8a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4.2a2 2 0 0 1-.5 1.3L5 17z"/></svg>';
            btn.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                togglePinWidget(id);
            };
            if (getComputedStyle(item).position === 'static') item.style.position = 'relative';
            item.appendChild(btn);
        });
    }

    function blockDragForPinned() {
        var container = document.getElementById('dashboardContainer');
        if (!container) return;
        container.querySelectorAll('.dashboard-item').forEach(function(item) {
            var id = item.getAttribute('data-item-id');
            if (isWidgetPinned(id)) {
                item.draggable = false;
                item.setAttribute('data-pinned', '1');
            } else {
                item.removeAttribute('data-pinned');
            }
        });
    }

    // ──────────────────────────────────────────────
    // HISTORY
    // ──────────────────────────────────────────────
    function pushHistory(label) {
        var d = dash(); if (!d) return;
        var snap = {
            ts: Date.now(),
            label: label || 'Layout-Änderung',
            layout: currentLayout(),
            pinned: d.pinned.slice(),
            presetName: currentPreset() ? currentPreset().name : ''
        };
        if (!snap.layout.length) return; // skip empty snapshots
        if (d.history.length > 0) {
            var last = d.history[0];
            if (JSON.stringify(last.layout) === JSON.stringify(snap.layout) &&
                JSON.stringify(last.pinned) === JSON.stringify(snap.pinned)) return;
        }
        d.history.unshift(snap);
        if (d.history.length > MAX_HISTORY) d.history.length = MAX_HISTORY;
        safeSave();
    }

    function restoreHistory(ts) {
        var d = dash(); if (!d) return false;
        var snap = d.history.find(function(s) { return s.ts === ts; });
        if (!snap) return false;

        pushHistory('vor Wiederherstellung');
        data.settings.widgetLayout = (snap.layout || []).slice();
        d.pinned = (snap.pinned || []).slice();
        try { localStorage.setItem('mwl_dashboard_layout', JSON.stringify(data.settings.widgetLayout)); } catch (e) {}

        var p = currentPreset();
        applyPresetToDashboard({ layout: data.settings.widgetLayout, pinned: d.pinned });
        if (p) { p.layout = data.settings.widgetLayout.slice(); p.pinned = d.pinned.slice(); p.updatedAt = Date.now(); }
        safeSave();
        toast('↺ Wiederhergestellt', 'Layout-Stand zurückgesetzt.', 'success');
        return true;
    }

    // ──────────────────────────────────────────────
    // EXPORT / IMPORT
    // ──────────────────────────────────────────────
    function exportLayoutJSON() {
        var p = currentPreset();
        var d = dash();
        var payload = {
            type: 'mwl-dashboard-layout',
            version: 1,
            exportedAt: new Date().toISOString(),
            app: 'MyWorkLog',
            preset: {
                name: p ? p.name : 'Layout',
                icon: p ? p.icon : '📐',
                layout: currentLayout(),
                pinned: d ? d.pinned.slice() : []
            }
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var safeName = (p ? p.name : 'layout').toString().replace(/[^a-z0-9-_]/gi, '_').slice(0, 30) || 'layout';
        var date = new Date().toISOString().slice(0, 10);
        a.download = 'mwl-dashboard-' + safeName + '-' + date + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 100);
        toast('Exportiert', 'Layout als JSON heruntergeladen.', 'success');
    }

    function importLayoutFile(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var payload = JSON.parse(e.target.result);
                    if (payload.type !== 'mwl-dashboard-layout') throw new Error('Falsches Datei-Format');
                    if (!payload.preset || !Array.isArray(payload.preset.layout)) throw new Error('Keine Layout-Daten gefunden');

                    var valid = payload.preset.layout.filter(function(id) {
                        return typeof widgetLibrary !== 'undefined' && widgetLibrary[id];
                    });
                    if (valid.length === 0) throw new Error('Keine bekannten Widgets im Import');

                    var pinned = (payload.preset.pinned || []).filter(function(id) { return valid.indexOf(id) >= 0; });
                    var preset = createPreset('↓ ' + (payload.preset.name || 'Importiert'), payload.preset.icon || '📥', valid, pinned);
                    switchPreset(preset.id);
                    resolve(preset);
                } catch (err) { reject(err); }
            };
            reader.onerror = function() { reject(new Error('Datei konnte nicht gelesen werden')); };
            reader.readAsText(file);
        });
    }

    function pickAndImportLayout() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            importLayoutFile(file).then(function(preset) {
                toast('Importiert', 'Layout "' + preset.name + '" aktiviert.', 'success');
                renderLayoutManager();
            }).catch(function(err) {
                toast('Import fehlgeschlagen', err.message || String(err), 'error');
            });
        };
        input.click();
    }

    // ──────────────────────────────────────────────
    // UI
    // ──────────────────────────────────────────────
    function openLayoutManager() {
        var d = dash();
        if (!d) { toast('Noch nicht bereit', 'App-Daten werden geladen.', 'warning'); return; }
        ensureDefaultPreset();
        var modal = document.getElementById('layoutManagerModal') || createLayoutManagerModal();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderLayoutManager();
    }

    function closeLayoutManager() {
        var modal = document.getElementById('layoutManagerModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function createLayoutManagerModal() {
        var modal = document.createElement('div');
        modal.id = 'layoutManagerModal';
        modal.className = 'lm-modal';
        modal.innerHTML =
            '<div class="lm-backdrop" data-close-lm></div>' +
            '<div class="lm-sheet" role="dialog" aria-modal="true" aria-label="Layout-Manager">' +
                '<div class="lm-head">' +
                    '<div class="lm-title">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>' +
                        '<span>Layout-Manager</span>' +
                    '</div>' +
                    '<button class="lm-close" data-close-lm aria-label="Schließen">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                    '</button>' +
                '</div>' +
                '<div class="lm-body" id="lmBody"></div>' +
            '</div>';
        modal.addEventListener('click', function(e) {
            if (e.target.closest('[data-close-lm]')) closeLayoutManager();
        });
        document.body.appendChild(modal);
        // Escape to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeLayoutManager();
        });
        return modal;
    }

    function renderLayoutManager() {
        var body = document.getElementById('lmBody');
        if (!body) return;
        var d = dash(); if (!d) return;

        var presetsHtml = d.presets.map(function(p) {
            var isActive = p.id === d.activePresetId;
            var count = (p.layout || []).length;
            var pinCount = (p.pinned || []).length;
            return (
                '<div class="lm-preset' + (isActive ? ' active' : '') + '" data-preset-id="' + esc(p.id) + '">' +
                    '<button class="lm-preset-main" data-action="switch" data-id="' + esc(p.id) + '">' +
                        '<span class="lm-preset-icon">' + mwlIconFromEmoji(p.icon || '📐', 15) + '</span>' +
                        '<span class="lm-preset-info">' +
                            '<span class="lm-preset-name">' + esc(p.name) + '</span>' +
                            '<span class="lm-preset-meta">' + count + ' Widget' + (count === 1 ? '' : 's') +
                                (pinCount ? ' · ' + pinCount + ' gepinnt' : '') + '</span>' +
                        '</span>' +
                        (isActive ? '<span class="lm-preset-active">aktiv</span>' : '') +
                    '</button>' +
                    '<div class="lm-preset-actions">' +
                        '<button class="lm-icon-btn" title="Aktuelles Layout speichern" data-action="sync" data-id="' + esc(p.id) + '">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' +
                        '</button>' +
                        '<button class="lm-icon-btn" title="Umbenennen" data-action="rename" data-id="' + esc(p.id) + '">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                        '</button>' +
                        (d.presets.length > 1 ?
                            '<button class="lm-icon-btn lm-danger" title="Löschen" data-action="delete" data-id="' + esc(p.id) + '">' +
                                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>' +
                            '</button>' : '') +
                    '</div>' +
                '</div>'
            );
        }).join('');

        var historyHtml = d.history.length === 0
            ? '<div class="lm-empty">Noch keine Änderungen aufgezeichnet.</div>'
            : d.history.map(function(h) {
                var preview = (h.layout || []).slice(0, 3).map(function(id) {
                    return (typeof widgetLibrary !== 'undefined' && widgetLibrary[id]) ? widgetLibrary[id].name : id;
                }).join(', ');
                if ((h.layout || []).length > 3) preview += ' …';
                return (
                    '<div class="lm-history-item">' +
                        '<div class="lm-history-info">' +
                            '<span class="lm-history-time">' + fmtRelative(h.ts) + ' · ' + esc(h.label) + '</span>' +
                            '<span class="lm-history-label">' + esc(preview) + '</span>' +
                        '</div>' +
                        '<button class="lm-restore-btn" data-action="restore" data-ts="' + h.ts + '">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/></svg>' +
                            '<span>Wiederherstellen</span>' +
                        '</button>' +
                    '</div>'
                );
            }).join('');

        var p = currentPreset();
        var pinCount = (d.pinned || []).length;
        var hint = p
            ? 'Aktiv: <strong>' + esc(p.name) + '</strong> · ' + (p.layout || []).length + ' Widgets' +
              (pinCount ? ' · ' + pinCount + ' gepinnt' : '')
            : '';

        body.innerHTML =
            (hint ? '<div class="lm-hint">' + hint + '</div>' : '') +
            '<div class="lm-section">' +
                '<div class="lm-section-head">' +
                    '<span class="lm-section-title">Presets</span>' +
                    '<button class="lm-add-btn" data-action="create">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
                        '<span>Neuer Preset</span>' +
                    '</button>' +
                '</div>' +
                '<div class="lm-presets">' + presetsHtml + '</div>' +
            '</div>' +
            '<div class="lm-section">' +
                '<div class="lm-section-head">' +
                    '<span class="lm-section-title">Verlauf</span>' +
                    '<span class="lm-section-meta">Letzte ' + MAX_HISTORY + '</span>' +
                '</div>' +
                '<div class="lm-history">' + historyHtml + '</div>' +
            '</div>' +
            '<div class="lm-section">' +
                '<div class="lm-section-head">' +
                    '<span class="lm-section-title">Backup</span>' +
                '</div>' +
                '<div class="lm-actions-row">' +
                    '<button class="lm-action-btn" data-action="export">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
                        '<span>Exportieren</span>' +
                    '</button>' +
                    '<button class="lm-action-btn" data-action="import">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
                        '<span>Importieren</span>' +
                    '</button>' +
                '</div>' +
            '</div>';

        // Wire actions
        body.querySelectorAll('[data-action]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var action = btn.getAttribute('data-action');
                var id = btn.getAttribute('data-id');
                var ts = btn.getAttribute('data-ts');
                handleAction(action, id, ts);
            });
        });
    }

    function handleAction(action, id, ts) {
        if (action === 'switch') {
            if (switchPreset(id)) {
                renderLayoutManager();
                toast('Geladen', 'Preset aktiviert.', 'success');
            }
        } else if (action === 'sync') {
            var p = presetById(id); if (!p) return;
            p.layout = currentLayout();
            p.pinned = (dash().pinned || []).slice();
            p.updatedAt = Date.now();
            safeSave();
            renderLayoutManager();
            toast('Gespeichert', 'Aktuelles Layout in Preset übernommen.', 'success');
        } else if (action === 'rename') {
            var pr = presetById(id); if (!pr) return;
            var name = prompt('Neuer Name:', pr.name);
            if (name && name.trim()) { renamePreset(id, name.trim()); renderLayoutManager(); }
        } else if (action === 'delete') {
            var pd = presetById(id); if (!pd) return;
            if (confirm('Preset "' + pd.name + '" wirklich löschen?')) {
                deletePreset(id);
                renderLayoutManager();
            }
        } else if (action === 'restore') {
            restoreHistory(parseInt(ts, 10));
            renderLayoutManager();
            closeLayoutManager();
        } else if (action === 'create') {
            var name = prompt('Name für neuen Preset:');
            if (!name || !name.trim()) return;
            var preset = createPreset(name.trim());
            switchPreset(preset.id);
            renderLayoutManager();
            toast('Erstellt', '"' + preset.name + '" aktiviert.', 'success');
        } else if (action === 'export') {
            exportLayoutJSON();
        } else if (action === 'import') {
            pickAndImportLayout();
        }
    }

    // ──────────────────────────────────────────────
    // CSS INJECTION
    // ──────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('dashboard-power-styles')) return;
        var css =
            '.lm-modal{display:none;position:fixed;inset:0;z-index:99999;align-items:center;justify-content:center;padding:16px;}' +
            '.lm-modal.active{display:flex;}' +
            '.lm-backdrop{position:absolute;inset:0;background:rgba(3,3,5,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}' +
            '.lm-sheet{position:relative;width:100%;max-width:540px;max-height:88vh;overflow-y:auto;background:#0a0a12;border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 24px 56px -12px rgba(0,0,0,.6);color:var(--text-main,#f8fafc);font-family:var(--font-main,Inter,sans-serif);animation:lmIn .26s cubic-bezier(.22,1,.36,1);}' +
            '@keyframes lmIn{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);}}' +
            '.lm-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;background:#0a0a12;z-index:1;}' +
            '.lm-title{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:600;letter-spacing:-.01em;}' +
            '.lm-title svg{color:var(--primary,#a855f7);}' +
            '.lm-close{appearance:none;border:none;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;padding:6px;border-radius:6px;transition:all .18s;display:flex;}' +
            '.lm-close:hover{background:rgba(255,255,255,.06);color:var(--text-main,#f8fafc);}' +
            '.lm-body{padding:16px 20px 24px;display:flex;flex-direction:column;gap:22px;}' +
            '.lm-hint{font-size:12px;color:var(--text-muted,#94a3b8);padding:10px 12px;background:rgba(var(--primary-rgb,168,85,247),.06);border:1px solid rgba(var(--primary-rgb,168,85,247),.15);border-radius:8px;}' +
            '.lm-hint strong{color:var(--text-main,#f8fafc);font-weight:600;}' +
            '.lm-section{display:flex;flex-direction:column;gap:10px;}' +
            '.lm-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;}' +
            '.lm-section-title{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted,#94a3b8);font-weight:500;}' +
            '.lm-section-meta{font-size:11px;color:var(--text-dim,#64748b);font-family:var(--font-mono,monospace);}' +
            '.lm-add-btn{appearance:none;border:1px solid rgba(var(--primary-rgb,168,85,247),.3);background:rgba(var(--primary-rgb,168,85,247),.1);color:var(--primary,#a855f7);font-family:inherit;font-size:12px;font-weight:500;padding:6px 11px;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .18s;}' +
            '.lm-add-btn:hover{background:rgba(var(--primary-rgb,168,85,247),.18);}' +
            '.lm-add-btn svg{width:12px;height:12px;}' +
            '.lm-presets{display:flex;flex-direction:column;gap:6px;}' +
            '.lm-preset{display:flex;align-items:stretch;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden;transition:all .18s;}' +
            '.lm-preset:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);}' +
            '.lm-preset.active{border-color:rgba(var(--primary-rgb,168,85,247),.4);background:rgba(var(--primary-rgb,168,85,247),.06);}' +
            '.lm-preset-main{flex:1;appearance:none;background:transparent;border:none;color:inherit;font-family:inherit;text-align:left;cursor:pointer;padding:12px 14px;display:flex;align-items:center;gap:12px;min-width:0;}' +
            '.lm-preset-icon{font-size:18px;flex-shrink:0;line-height:1;}' +
            '.lm-preset-info{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;}' +
            '.lm-preset-name{font-size:14px;font-weight:500;color:var(--text-main,#f8fafc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lm-preset-meta{font-size:11px;color:var(--text-muted,#94a3b8);font-family:var(--font-mono,monospace);letter-spacing:.01em;}' +
            '.lm-preset-active{font-size:9.5px;text-transform:uppercase;letter-spacing:.12em;color:var(--primary,#a855f7);background:rgba(var(--primary-rgb,168,85,247),.18);padding:3px 8px;border-radius:999px;font-weight:600;flex-shrink:0;}' +
            '.lm-preset-actions{display:flex;align-items:center;gap:2px;padding-right:8px;}' +
            '.lm-icon-btn{appearance:none;border:none;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;padding:7px;border-radius:6px;transition:all .18s;display:flex;align-items:center;justify-content:center;}' +
            '.lm-icon-btn svg{width:14px;height:14px;}' +
            '.lm-icon-btn:hover{background:rgba(255,255,255,.06);color:var(--text-main,#f8fafc);}' +
            '.lm-icon-btn.lm-danger:hover{background:rgba(239,68,68,.12);color:#ef4444;}' +
            '.lm-empty{font-size:12px;color:var(--text-dim,#64748b);text-align:center;padding:18px;background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.06);border-radius:8px;}' +
            '.lm-history{display:flex;flex-direction:column;gap:6px;}' +
            '.lm-history-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:8px;}' +
            '.lm-history-info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1;}' +
            '.lm-history-time{font-size:11px;color:var(--text-muted,#94a3b8);font-family:var(--font-mono,monospace);letter-spacing:.01em;}' +
            '.lm-history-label{font-size:12.5px;color:var(--text-main,#f8fafc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
            '.lm-restore-btn{appearance:none;border:1px solid rgba(255,255,255,.1);background:transparent;color:var(--text-main,#f8fafc);font-family:inherit;font-size:11.5px;font-weight:500;padding:6px 10px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .18s;flex-shrink:0;}' +
            '.lm-restore-btn:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.15);}' +
            '.lm-restore-btn svg{width:12px;height:12px;opacity:.7;}' +
            '.lm-actions-row{display:flex;gap:8px;}' +
            '.lm-action-btn{flex:1;appearance:none;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);color:var(--text-main,#f8fafc);font-family:inherit;font-size:13px;font-weight:500;padding:10px 14px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .18s;}' +
            '.lm-action-btn:hover{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.15);transform:translateY(-1px);}' +
            '.lm-action-btn svg{width:13px;height:13px;opacity:.7;}' +
            '@media(max-width:480px){.lm-modal{padding:0;}.lm-sheet{max-height:100vh;height:100vh;border-radius:0;}}' +
            /* WIDGET MANAGER MODAL (z-index 100000 — UEBER settings) */
            '#newWidgetManagerModal.wm-modal{display:none;position:fixed;inset:0;z-index:100000;align-items:center;justify-content:center;padding:16px;}' +
            '#newWidgetManagerModal.wm-modal.active{display:flex;}' +
            '.wm-backdrop{position:absolute;inset:0;background:rgba(3,3,5,.7);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}' +
            '.wm-sheet{position:relative;width:100%;max-width:620px;max-height:88vh;overflow-y:auto;background:#0a0a12;border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 24px 56px -12px rgba(0,0,0,.6);color:var(--text-main,#f8fafc);font-family:var(--font-main,Inter,sans-serif);animation:wmIn .26s cubic-bezier(.22,1,.36,1);}' +
            '@keyframes wmIn{from{opacity:0;transform:translateY(10px) scale(.98);}to{opacity:1;transform:translateY(0) scale(1);}}' +
            '.wm-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;background:#0a0a12;z-index:1;}' +
            '.wm-title{display:inline-flex;align-items:center;gap:10px;font-size:14px;font-weight:600;letter-spacing:-.01em;}' +
            '.wm-title svg{color:var(--primary,#a855f7);}' +
            '.wm-close{appearance:none;border:none;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;padding:6px;border-radius:6px;transition:all .18s;display:flex;align-items:center;}' +
            '.wm-close:hover{background:rgba(255,255,255,.06);color:var(--text-main,#f8fafc);}' +
            '.wm-body{padding:16px 20px 24px;display:flex;flex-direction:column;gap:22px;}' +
            '.wm-section{display:flex;flex-direction:column;gap:10px;}' +
            '.wm-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;}' +
            '.wm-section-title{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-muted,#94a3b8);font-weight:500;}' +
            '.wm-section-meta{font-size:11px;color:var(--text-dim,#64748b);font-family:var(--font-mono,monospace);}' +
            '.wm-list{display:flex;flex-direction:column;gap:6px;}' +
            '.wm-item{display:flex;align-items:center;gap:14px;padding:12px 14px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:10px;transition:all .18s;}' +
            '.wm-item:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);}' +
            '.wm-item-pinned{border-color:rgba(var(--primary-rgb,168,85,247),.25);background:rgba(var(--primary-rgb,168,85,247),.04);}' +
            '.wm-item-icon{width:40px;height:40px;border-radius:9px;background:rgba(var(--primary-rgb,168,85,247),.1);color:var(--primary,#a855f7);display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
            '.wm-item-icon svg{width:18px;height:18px;}' +
            '.wm-item-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}' +
            '.wm-item-name{font-size:14px;font-weight:500;color:var(--text-main,#f8fafc);display:flex;align-items:center;gap:6px;}' +
            '.wm-item-desc{font-size:12px;color:var(--text-muted,#94a3b8);line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}' +
            '.wm-pin-tag{display:inline-flex;align-items:center;color:var(--primary,#a855f7);}' +
            '.wm-pin-tag svg{width:11px;height:11px;}' +
            '.wm-item-actions{display:flex;align-items:center;gap:2px;flex-shrink:0;}' +
            '.wm-icon-btn{appearance:none;border:none;background:transparent;color:var(--text-muted,#94a3b8);cursor:pointer;padding:7px;border-radius:6px;transition:all .18s;display:flex;align-items:center;justify-content:center;}' +
            '.wm-icon-btn svg{width:14px;height:14px;}' +
            '.wm-icon-btn:hover:not(:disabled){background:rgba(255,255,255,.06);color:var(--text-main,#f8fafc);}' +
            '.wm-icon-btn:disabled{opacity:.3;cursor:not-allowed;}' +
            '.wm-icon-btn.wm-pin-active{color:var(--primary,#a855f7);background:rgba(var(--primary-rgb,168,85,247),.12);}' +
            '.wm-icon-btn.wm-danger:hover:not(:disabled){background:rgba(239,68,68,.12);color:#ef4444;}' +
            '.wm-add-btn{appearance:none;border:1px solid rgba(var(--primary-rgb,168,85,247),.3);background:rgba(var(--primary-rgb,168,85,247),.12);color:var(--primary,#a855f7);font-family:inherit;font-size:12.5px;font-weight:500;padding:7px 12px;border-radius:7px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .18s;}' +
            '.wm-add-btn:hover{background:rgba(var(--primary-rgb,168,85,247),.2);}' +
            '.wm-add-btn svg{width:13px;height:13px;}' +
            '.wm-empty{font-size:12.5px;color:var(--text-dim,#64748b);text-align:center;padding:18px;background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.06);border-radius:8px;}' +
            '@media(max-width:480px){#newWidgetManagerModal.wm-modal{padding:0;}.wm-sheet{max-height:100vh;height:100vh;border-radius:0;}.wm-item{padding:10px 12px;}.wm-item-icon{width:36px;height:36px;}.wm-item-desc{display:none;}}' +
            /* Pin badge (normal view) */
            '.dashboard-pin-badge{position:absolute;top:8px;left:8px;width:22px;height:22px;border-radius:50%;background:rgba(var(--primary-rgb,168,85,247),.15);border:1px solid rgba(var(--primary-rgb,168,85,247),.35);color:var(--primary,#a855f7);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);z-index:10;pointer-events:none;}' +
            '.dashboard-pin-badge svg{width:11px;height:11px;}' +
            /* Pin button (edit mode) */
            '.dashboard-item-pin-btn{position:absolute;top:8px;right:48px;width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.85);color:#0a0a12;border:2px solid white;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:100;opacity:.9;transition:all .18s;box-shadow:0 2px 4px rgba(0,0,0,.2);}' +
            '.dashboard-item-pin-btn svg{width:14px;height:14px;}' +
            '.dashboard-item-pin-btn:hover{opacity:1;transform:scale(1.1);}' +
            '.dashboard-item-pin-btn.is-pinned{background:rgba(var(--primary-rgb,168,85,247),.95);color:white;border-color:white;}' +
            '.dashboard-item[data-pinned="1"]{opacity:.92;}' +
            '.dashboard-item[data-pinned="1"]::after{content:"";position:absolute;inset:0;border-radius:inherit;border:1px dashed rgba(var(--primary-rgb,168,85,247),.35);pointer-events:none;}' +
            '';

        var style = document.createElement('style');
        style.id = 'dashboard-power-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ──────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────
    function esc(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function fmtRelative(ts) {
        if (!ts) return '—';
        var diff = Date.now() - ts;
        if (diff < 0) diff = 0;
        var s = Math.floor(diff / 1000);
        if (s < 10) return 'gerade eben';
        if (s < 60) return 'vor ' + s + 's';
        var m = Math.floor(s / 60);
        if (m < 60) return 'vor ' + m + ' Min';
        var h = Math.floor(m / 60);
        if (h < 24) return 'vor ' + h + ' Std';
        var d = Math.floor(h / 24);
        return 'vor ' + d + ' Tag' + (d === 1 ? '' : 'en');
    }

    function toast(title, msg, type) {
        if (typeof showCustomMessage === 'function') {
            try { showCustomMessage(title, msg, type || 'info'); return; } catch (e) {}
        }
        console.log('[dashboard-power]', title, '—', msg);
    }

    // ──────────────────────────────────────────────
    // WIDGET-ICON-MAP (Emojis → SVG)
    // ──────────────────────────────────────────────
    var ICON_MAP = {
        'kpi-cards':         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
        'quick-actions':     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        'charts':            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
        'entry-form':        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
        'last-activities':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        'mood-tracker':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
        'productivity-score':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        'quick-templates':   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
        'weekly-goals':      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    };
    var FALLBACK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';

    function getWidgetIconSvg(widgetId) {
        return ICON_MAP[widgetId] || FALLBACK_ICON;
    }

    // ──────────────────────────────────────────────
    // MOVE WIDGET (Up/Down — click-Reorder als Alternative zum Drag)
    // ──────────────────────────────────────────────
    function moveDashboardWidget(widgetId, direction) {
        var container = document.getElementById('dashboardContainer');
        if (!container) return false;
        var items = Array.from(container.querySelectorAll('.dashboard-item'));
        items.sort(function(a, b) { return (parseInt(a.style.order) || 0) - (parseInt(b.style.order) || 0); });
        var idx = items.findIndex(function(el) { return el.getAttribute('data-item-id') === widgetId; });
        if (idx < 0) return false;
        var newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= items.length) return false;
        var tmp = items[idx]; items[idx] = items[newIdx]; items[newIdx] = tmp;
        items.forEach(function(el, i) { el.style.order = i; });
        // Save via direct flow (saveWidgetLayout pushed history + sync zum Preset)
        if (typeof saveWidgetLayout === 'function') {
            saveWidgetLayout(false);
        } else {
            var order = items.map(function(el){return el.getAttribute('data-item-id');}).filter(Boolean);
            data.settings.widgetLayout = order;
            try { localStorage.setItem('mwl_dashboard_layout', JSON.stringify(order)); } catch (e) {}
            safeSave();
        }
        return true;
    }

    // ──────────────────────────────────────────────
    // ResizeObserver-Loop-Warning silencen (Browser-Quirk, harmlos)
    // Tritt auf wenn Layout-Saves Chart-Resizes triggern → loop notification
    // ──────────────────────────────────────────────
    function silenceResizeObserverError() {
        var pattern = /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/;
        window.addEventListener('error', function(e) {
            if (e.message && pattern.test(e.message)) {
                e.stopImmediatePropagation();
                e.preventDefault();
                return false;
            }
        }, true);
        // Auch fuer onerror-style
        var oldOnError = window.onerror;
        window.onerror = function(msg) {
            if (typeof msg === 'string' && pattern.test(msg)) return true;
            if (oldOnError) return oldOnError.apply(this, arguments);
            return false;
        };
    }

    // ──────────────────────────────────────────────
    // EXPOSE GLOBALS
    // ──────────────────────────────────────────────
    window.getWidgetIconSvg = getWidgetIconSvg;
    window.moveDashboardWidget = moveDashboardWidget;
    window.openLayoutManager = openLayoutManager;
    window.closeLayoutManager = closeLayoutManager;
    window.renderLayoutManager = renderLayoutManager;
    window.switchPreset = switchPreset;
    window.createPreset = createPreset;
    window.deletePreset = deletePreset;
    window.renamePreset = renamePreset;
    window.exportLayoutJSON = exportLayoutJSON;
    window.pickAndImportLayout = pickAndImportLayout;
    window.togglePinWidget = togglePinWidget;
    window.isWidgetPinned = isWidgetPinned;
    window.renderPinBadges = renderPinBadges;
    window.renderPinButtons = renderPinButtons;
    window.blockDragForPinned = blockDragForPinned;
    window.restoreHistory = restoreHistory;
    window.pushDashboardHistory = pushHistory;
    window.ensureDefaultPreset = ensureDefaultPreset;
    window.syncCurrentToActivePreset = syncCurrentToActivePreset;

    // ──────────────────────────────────────────────
    // INIT
    // ──────────────────────────────────────────────
    function init() {
        // Suppressor SOFORT registrieren (auch ohne data) — sonst spammt es Console waehrend Load
        silenceResizeObserverError();
        if (typeof data === 'undefined' || !data || !data.settings) {
            setTimeout(init, 250);
            return;
        }
        injectStyles();
        ensureDefaultPreset();
        renderPinBadges();
        // Hook into edit-mode toggle: when edit-mode activates, add pin-buttons too
        var container = document.getElementById('dashboardContainer');
        if (container) {
            var mo = new MutationObserver(function() {
                if (container.classList.contains('edit-mode')) {
                    setTimeout(function() { renderPinButtons(); blockDragForPinned(); }, 100);
                }
            });
            mo.observe(container, { attributes: true, attributeFilter: ['class'] });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(init, INIT_DELAY); });
    } else {
        setTimeout(init, INIT_DELAY);
    }
})();
