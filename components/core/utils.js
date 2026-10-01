// ═══ CORE: UTILS ═══
    // --- SPRACHE / LOCALE ---
    // Monats- und Wochentagsnamen, Datums- und Zahlenformate kamen aus ~80
    // hartcodierten Locale-Literalen — auf /en/ stand deshalb ueberall "März"
    // und "24.07.2026". Diese eine Funktion ist jetzt die Quelle; jeder
    // toLocale*-Aufruf, der Text FUER DEN NUTZER erzeugt, ruft sie auf.
    // Ausnahme: Datums-Strings, die als Schluessel dienen (Dedup, Storage),
    // bleiben bewusst hartcodiert — sonst wechselt der Schluessel mit der Sprache.
    var MWL_LOCALE_DE = 'de' + '-DE';
    function mwlLocale() {
        return document.documentElement.lang === 'en' ? 'en-GB' : MWL_LOCALE_DE;
    }
    window.mwlLocale = mwlLocale;

    // --- HILFSFUNKTIONEN (Unverändert) ---
    function isOddWeek(d) { return getWeek(d) % 2 !== 0; }

    function getWeek(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }

    // "HH:MM" → Minuten seit Mitternacht. Stand bis v6.3.6 als einziger
    // verbliebener Inhalt in year-month-stats.js, nachdem die Jahres- und
    // Monatsberechnungen dort ausgezogen sind.
    function parseTime(timeStr) {
        const [h, m] = String(timeStr || '').split(':').map(Number);
        return h * 60 + m;
    }

    // --- ZEIT-RUNDUNG ---
    // Liest die User-Settings für Zeit-Rundung (kaufmännisch / abrunden / Taktung).
    // Default: enabled=false → JS-Standard-Rundung wie zuvor.
    function getRoundingSettings() {
        const r = (typeof data !== 'undefined' && data && data.settings && data.settings.rounding) || {};
        return {
            enabled: !!r.enabled,
            mode: (r.mode === 'down' || r.mode === 'taktung') ? r.mode : 'commercial',
            taktungMinutes: parseInt(r.taktungMinutes, 10) || 15
        };
    }

    // Rundet einen Stunden-Wert gemäß User-Settings. precision = Nachkommastellen für commercial/down.
    function roundHours(h, precision) {
        if (typeof h !== 'number' || !isFinite(h)) return h;
        if (typeof precision !== 'number') precision = 2;
        const r = getRoundingSettings();
        const factor = Math.pow(10, precision);
        if (!r.enabled) return Math.round(h * factor) / factor;
        if (r.mode === 'taktung') {
            const step = r.taktungMinutes / 60;
            if (step <= 0) return Math.round(h * factor) / factor;
            return Math.round(h / step) * step;
        }
        if (r.mode === 'down') {
            // Richtung Null abschneiden — damit auch bei negativen Überstunden-Werten "abrunden = weniger Magnitude"
            return h >= 0 ? Math.floor(h * factor) / factor : Math.ceil(h * factor) / factor;
        }
        return Math.round(h * factor) / factor;
    }

    // Formatiert Stundenwert als String (z.B. "8.25h"). suffix=null/'' lässt das h weg.
    function fmtHours(h, precision, suffix) {
        if (typeof precision !== 'number') precision = 2;
        if (typeof suffix === 'undefined') suffix = 'h';
        const v = roundHours(h, precision);
        return v.toFixed(precision) + suffix;
    }
    function delEntry(id) {
        const entry = data.entries.find(e => e.id === id);
        if (!entry) return;

        showModernDeleteConfirm(entry, id);
    }

    // ═══ DELETE CONFIRM ═══
    // Styles in components/core/misc.css (`.dc-*`). Bis v8.0.1 stand hier ein
    // Sheet mit Inline-Styles, backdrop-filter blur(4px) über den GANZEN
    // Viewport plus blur(20px) auf dem Sheet selbst — die GPU musste beide
    // Unschärfen in jedem Frame der Einblendung neu rechnen, dazu eine
    // Überschwing-Kurve über 400 ms. Das war das „10 fps"-Ruckeln.
    // Jetzt: deckende Flächen, nur transform/opacity, Transitions statt
    // Keyframes (unterbrechbar, wenn man schnell wieder schliesst).
    function dcT(de, en) { return document.documentElement.lang === 'en' ? en : de; }

    function showModernDeleteConfirm(entry, id) {
        if (document.querySelector('.dc-root')) return;   // Doppelklick öffnet nicht zweimal

        const label = (typeof getTypeLabel === 'function') ? getTypeLabel(entry.type) : entry.type;
        const icon  = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(entry.type, 20) : '';
        const dateStr = new Date(entry.date + 'T00:00:00').toLocaleDateString(mwlLocale(), { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
        const hours = roundHours(entry.worked || 0, 2).toLocaleString(mwlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' h';
        const range = (entry.start && entry.end) ? entry.start + '–' + entry.end : '';
        // entry.info ist ein Pipe-String mit generiertem Vorspann — nur die Notiz des Nutzers zeigen.
        const note = (typeof activityUserNote === 'function') ? activityUserNote(entry) : '';

        const root = document.createElement('div');
        root.className = 'dc-root';
        root.innerHTML = `
            <div class="dc-scrim"></div>
            <div class="dc-panel" role="alertdialog" aria-modal="true" aria-labelledby="dcTitle" aria-describedby="dcDesc">
                <div class="dc-grip" aria-hidden="true"></div>
                <div class="dc-head">
                    <span class="dc-icon" aria-hidden="true">${mwlIconFromEmoji(icon, 20)}</span>
                    <div class="dc-head__text">
                        <h2 id="dcTitle" class="dc-title">${esc(dcT('Eintrag löschen?', 'Delete entry?'))}</h2>
                        <p id="dcDesc" class="dc-desc">${esc(dcT('Du kannst das direkt danach rückgängig machen.', 'You can undo this right afterwards.'))}</p>
                    </div>
                </div>
                <dl class="dc-entry">
                    <div class="dc-entry__row"><dt>${esc(label)}</dt><dd>${esc(dateStr)}</dd></div>
                    <div class="dc-entry__row"><dt>${esc(range || dcT('Arbeitszeit', 'Hours'))}</dt><dd class="dc-num">${esc(hours)}</dd></div>
                    ${note ? `<div class="dc-entry__note">${esc(note)}</div>` : ''}
                </dl>
                <div class="dc-actions">
                    <button type="button" class="dc-btn dc-btn--ghost" data-dc="cancel">${esc(dcT('Abbrechen', 'Cancel'))}</button>
                    <button type="button" class="dc-btn dc-btn--danger" data-dc="confirm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>${esc(dcT('Löschen', 'Delete'))}</span>
                    </button>
                </div>
            </div>`;

        const panel = root.querySelector('.dc-panel');
        const prevFocus = document.activeElement;
        let closed = false;

        const performDelete = () => {
            const idx = data.entries.findIndex(e => e.id === id);
            if (idx === -1) return;
            const removed = data.entries[idx];

            data.entries.splice(idx, 1);
            data.trash = data.trash || [];
            data.trash.push({ entry: removed, originalIndex: idx, deletedAt: Date.now() });

            recalculateVacationUsed();
            save();
            if (document.getElementById('view-history')?.classList.contains('active') && typeof renderHistoryView === 'function') {
                renderHistoryView();
            }

            if (typeof mwlEvent === 'function') mwlEvent('eintrag_geloescht', { entry_type: removed.type || 'work' });
            showModernUndoToast();
        };

        const close = (confirmed) => {
            if (closed) return;
            closed = true;
            document.removeEventListener('keydown', onKey, true);
            // Nach einer Wischgeste aus der Fingerposition weiterfahren, nicht zurückspringen.
            panel.style.transition = '';
            if (panel.style.transform) panel.style.transform = 'translate3d(0, 100%, 0)';
            root.dataset.state = 'closed';
            // transitionend feuert nicht bei reduzierter Bewegung/verstecktem Tab — Zeitgeber als Netz.
            setTimeout(() => root.remove(), 260);
            if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
            if (confirmed) performDelete();
        };

        // Capture-Phase: sonst greifen globale Tastenkürzel (Escape schliesst sonst auch den Eintrags-Dialog dahinter).
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); return; }
            if (e.key === 'Tab') {
                const f = [...panel.querySelectorAll('button')];
                const i = f.indexOf(document.activeElement);
                e.preventDefault();
                f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
            }
        };

        root.querySelector('[data-dc="cancel"]').addEventListener('click', () => close(false));
        root.querySelector('[data-dc="confirm"]').addEventListener('click', () => close(true));
        root.querySelector('.dc-scrim').addEventListener('click', () => close(false));
        document.addEventListener('keydown', onKey, true);

        document.body.appendChild(root);
        // Erst nach dem ersten Layout umschalten, sonst startet die Transition nicht.
        root.getBoundingClientRect();
        root.dataset.state = 'open';
        root.querySelector('[data-dc="cancel"]').focus({ preventScroll: true });

        // Wischen zum Schliessen (nur Bottom-Sheet auf schmalen Bildschirmen).
        // Ein kurzer schneller Wisch reicht — Schwelle ODER Geschwindigkeit.
        let y0 = 0, t0 = 0, dy = 0, dragging = false;
        panel.addEventListener('touchstart', (e) => {
            if (!window.matchMedia('(max-width: 639px)').matches) return;
            y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0; dragging = true;
            panel.style.transition = 'none';
        }, { passive: true });
        panel.addEventListener('touchmove', (e) => {
            if (!dragging) return;
            const d = e.touches[0].clientY - y0;
            // Nach oben mit Widerstand statt harter Wand.
            dy = d > 0 ? d : d / 6;
            panel.style.transform = `translate3d(0, ${dy}px, 0)`;
        }, { passive: true });
        panel.addEventListener('touchend', () => {
            if (!dragging) return;
            dragging = false;
            const v = dy / Math.max(1, performance.now() - t0);
            if (dy > 90 || v > 0.5) { close(false); return; }
            panel.style.transition = '';
            panel.style.transform = '';
        });
    }

    function showModernUndoToast() {
        document.querySelectorAll('.dc-undo').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = 'dc-undo';
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
            <span class="dc-undo__icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
            <span class="dc-undo__text">${esc(dcT('Eintrag gelöscht', 'Entry deleted'))}</span>
            <button type="button" class="dc-undo__btn">${esc(dcT('Rückgängig', 'Undo'))}</button>`;

        document.body.appendChild(toast);
        toast.getBoundingClientRect();
        toast.dataset.state = 'open';

        let gone = false;
        const removeToast = () => {
            if (gone) return;
            gone = true;
            toast.style.transition = '';   // gewischt: bleibt, wo der Finger war, und blendet aus
            toast.dataset.state = 'closed';
            setTimeout(() => toast.remove(), 240);
        };

        toast.querySelector('.dc-undo__btn').addEventListener('click', () => {
            undoDelete();
            removeToast();
        });

        let x0 = 0, dx = 0;
        toast.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; dx = 0; toast.style.transition = 'none'; }, { passive: true });
        toast.addEventListener('touchmove', (e) => {
            dx = e.touches[0].clientX - x0;
            toast.style.transform = `translate3d(calc(-50% + ${dx}px), 0, 0)`;
        }, { passive: true });
        toast.addEventListener('touchend', () => {
            if (Math.abs(dx) > 80) { removeToast(); return; }
            toast.style.transition = '';
            toast.style.transform = '';
        });

        setTimeout(removeToast, 7000);
    }

    function undoDelete() {
        data.trash = data.trash || [];
        if (!data.trash.length) {
            showCustomMessage('ℹ️ Nichts zu rückgängig machen', 'Es gibt keine kürzliche Löschung.', 'info');
            return;
        }

        const last = data.trash.pop();
        const restored = last.entry;
        const idx = last.originalIndex != null ? last.originalIndex : data.entries.length;
        // Füge wieder an der ursprünglichen Position ein (oder hinten)
        data.entries.splice(Math.min(idx, data.entries.length), 0, restored);
        recalculateVacationUsed();
        save();
        if (document.getElementById('view-history').classList.contains('active') && typeof renderHistoryView === 'function') {
            renderHistoryView();
        }

        if (typeof mwlEvent === 'function') mwlEvent('eintrag_wiederhergestellt', {});
        showCustomMessage('Wiederhergestellt', 'Eintrag wurde wiederhergestellt.', 'success');
    }
    



    function toggleVacationPanel() {
        const vacationPanel = document.getElementById('vacationPanelCard');
        if (vacationPanel) {
            if (vacationPanel.style.display === 'none') {
                vacationPanel.style.display = 'block';
                // Load vacation data when opening
                const proRata = calculateProRataVacation(data.settings.vacation.total || 30);
                document.getElementById('vacationProRata').innerText = proRata;
                document.getElementById('confVacationTotal').value = data.settings.vacation.total || 30;
                document.getElementById('confVacationUsedManual').value = data.settings.vacation.usedManual || 0;
            } else {
                vacationPanel.style.display = 'none';
            }
        }
    }
    function closeBackupMenu() {
        if (window.backupMenuElement) {
            window.backupMenuElement.remove();
            window.backupMenuElement = null;
        }
        if (window.backupMenuOverlay) {
            window.backupMenuOverlay.remove();
            window.backupMenuOverlay = null;
        }
    }
    function closeExportMenu() {
        if (window.exportMenuElement) {
            window.exportMenuElement.remove();
            window.exportMenuElement = null;
        }
        if (window.exportMenuOverlay) {
            window.exportMenuOverlay.remove();
            window.exportMenuOverlay = null;
        }
    }
