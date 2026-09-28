// ═══ UNTIS MODULE ═══

(function () {

    // ── Constants ────────────────────────────────────────────────────────
    const ICAL_KEY     = 'untis_ical_url';
    const MANUAL_KEY   = 'untis_manual_grid';
    const CACHE_KEY    = 'untis_cache';
    const CACHE_TTL_MS = 30 * 60 * 1000;
    const PROXY_URL    = 'https://untis-proxy.myworklog.workers.dev';
    const MOCK_URL     = 'dev://mock-untis';

    // Fächerfarben sind Daten, kein Akzent: sie färben nur Randstreifen und
    // Tönung (--subj in untis.css). Text bleibt var(--text-main) — die alten
    // Pastell-Textfarben (#d8b4fe …) waren im Light-Theme unlesbar.
    const SUBJECT_COLORS = ['#a78bfa', '#22d3ee', '#fb923c', '#4ade80', '#fbbf24', '#f472b6', '#818cf8', '#2dd4bf'];

    // Sprache steht beim Laden fest (lang am <html>), die Tabellen also auch.
    function uIsEN() { return document.documentElement.lang === 'en'; }
    function uT(de, en) { return uIsEN() ? en : de; }
    const DAYS_DE   = uIsEN() ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const DAYS_FULL = uIsEN() ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    // ── Module state ─────────────────────────────────────────────────────
    let _modal        = null;
    let _countdownInt = null;
    let _refreshInt   = null;
    let _cachedEvents = null;
    let _testSuccess  = false;

    // Manual builder state
    let _manualSlots     = [];  // [{day:1-5, title, start, end, room}]
    let _manualActiveDay = 1;

    // ── Public entry point ───────────────────────────────────────────────
    window.showUntisImportModal = function () {
        const hasIcal   = !!localStorage.getItem(ICAL_KEY);
        const hasManual = !!localStorage.getItem(MANUAL_KEY);
        if (hasIcal || hasManual) {
            _openDashboard();
        } else {
            _openSetup(1);
        }
    };

    // ── Cleanup ──────────────────────────────────────────────────────────
    function _closeAll() {
        if (_modal)        { _modal.remove();              _modal        = null; }
        if (_countdownInt) { clearInterval(_countdownInt); _countdownInt = null; }
        if (_refreshInt)   { clearInterval(_refreshInt);   _refreshInt   = null; }
        _cachedEvents = null;
        _testSuccess  = false;
    }

    // ════════════════════════════════════════════════════════════════════
    //  SETUP WIZARD
    // ════════════════════════════════════════════════════════════════════

    function _openSetup(step) {
        _closeAll();
        _modal = document.createElement('div');
        _modal.id = 'untis-modal';
        _modal.className = 'untis-overlay';
        _modal.innerHTML = `
            <div class="untis-backdrop" onclick="if(event.target===this)_untisClose()"></div>
            <div class="untis-setup-panel" role="dialog" aria-modal="true" aria-label="Untis">
                <div id="untis-step-content"></div>
            </div>`;
        document.body.appendChild(_modal);
        _renderStep(step);
    }

    function _renderStep(step) {
        const el = document.getElementById('untis-step-content');
        if (!el) return;
        const map = { 1: _step1, 2: _step2, 3: _step3 };
        el.innerHTML = (map[step] || _step1)();
        window._untisGotoStep = _openSetup;
    }

    // ── Step 1: Dual-Choice ──────────────────────────────────────────────
    function _step1() {
        return `
        <div class="untis-step-inner">
            <div class="untis-kicker"><span class="untis-kicker__icon">${svgCal(14)}</span><span>${uT('Stundenplan', 'Timetable')}</span></div>
            <h2 class="untis-title">${uT('Wie willst du ihn einrichten?', 'How do you want to set it up?')}</h2>
            <p class="untis-subtitle">${uT('Wähle, woher dein Stundenplan kommt.', 'Choose where your timetable comes from.')}</p>

            <div class="untis-choice-grid">
                <button type="button" class="untis-choice-card" onclick="_untisGotoStep(2)">
                    <span class="untis-choice-icon">${svgRefresh(18)}</span>
                    <span class="untis-choice-text">
                        <span class="untis-choice-name">${uT('Aus WebUntis laden', 'Load from WebUntis')}</span>
                        <span class="untis-choice-desc">${uT('Per Link, aktualisiert sich von selbst.', 'Via a link, updates by itself.')}</span>
                    </span>
                    <span class="untis-choice-arrow">${svgArrow()}</span>
                </button>

                <button type="button" class="untis-choice-card" onclick="_untisOpenManual()">
                    <span class="untis-choice-icon">${svgGrid(18)}</span>
                    <span class="untis-choice-text">
                        <span class="untis-choice-name">${uT('Selbst eintragen', 'Enter it yourself')}</span>
                        <span class="untis-choice-desc">${uT('Für feste Berufsschultage ohne WebUntis.', 'For fixed vocational school days without WebUntis.')}</span>
                    </span>
                    <span class="untis-choice-arrow">${svgArrow()}</span>
                </button>
            </div>

            <button type="button" class="untis-btn untis-btn-ghost untis-btn--block" onclick="_untisClose()">${uT('Abbrechen', 'Cancel')}</button>
        </div>`;
    }

    // ── Step 2: Instructions ─────────────────────────────────────────────
    function _step2() {
        return `
        <div class="untis-step-inner">
            ${_progressHTML(1, 2)}
            <h2 class="untis-title">${uT('Link aus WebUntis holen', 'Get the link from WebUntis')}</h2>
            <p class="untis-subtitle">${uT('Drei Schritte, dann hast du den Link.', 'Three steps and you have the link.')}</p>
            <div class="untis-instructions">
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">1</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">${uT('WebUntis öffnen', 'Open WebUntis')}</div>
                        <div class="untis-instruction-desc">${uT('Melde dich auf der Seite deiner Schule an.', 'Sign in on your school’s page.')}</div>
                        <a class="untis-instruction-action" href="https://webuntis.com" target="_blank" rel="noopener">${svgExternal(12)} webuntis.com</a>
                    </div>
                </div>
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">2</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">${uT('„Mein Stundenplan“ öffnen', 'Open “My timetable”')}</div>
                        <div class="untis-instruction-desc">${uT('In der linken Navigation auf <strong class="untis-strong">Stundenplan</strong> klicken, dann den Tab <strong class="untis-strong">„Mein Stundenplan“</strong>.', 'Click <strong class="untis-strong">Timetable</strong> in the left navigation, then the <strong class="untis-strong">“My timetable”</strong> tab.')}</div>
                    </div>
                </div>
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">3</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">${uT('Öffentlichen Link kopieren', 'Copy the public link')}</div>
                        <div class="untis-instruction-desc">${uT('Rechts oben auf das <strong class="untis-strong">Teilen-Symbol</strong> (Kette), dann <strong class="untis-strong">„Öffentlichen Link kopieren“</strong>.', 'Top right, click the <strong class="untis-strong">share icon</strong> (chain), then <strong class="untis-strong">“Copy public link”</strong>.')}</div>
                    </div>
                </div>
            </div>
            <div class="untis-note" style="margin-bottom:16px;">
                ${svgInfo(15)}
                <span>${uT('Kein Teilen-Symbol zu sehen? Dann', 'No share icon?')} <button type="button" class="untis-link-btn" onclick="_untisOpenManual()">${uT('trag den Stundenplan selbst ein', 'Enter your timetable yourself')}</button>.</span>
            </div>
            <div class="untis-btn-row">
                <button type="button" class="untis-btn untis-btn-ghost" onclick="_untisGotoStep(1)">${svgArrowLeft()} ${uT('Zurück', 'Back')}</button>
                <button type="button" class="untis-btn untis-btn-primary" onclick="_untisGotoStep(3)">${uT('Weiter', 'Continue')}</button>
            </div>
        </div>`;
    }

    // ── Step 3: URL Input ────────────────────────────────────────────────
    function _step3() {
        return `
        <div class="untis-step-inner">
            ${_progressHTML(2, 2)}
            <h2 class="untis-title">${uT('Link einfügen', 'Paste the link')}</h2>
            <p class="untis-subtitle">${uT('Füge den kopierten WebUntis-Link ein und teste ihn.', 'Paste the copied WebUntis link and test it.')}</p>
            <label class="untis-field-label" for="untis-url-input">${uT('WebUntis-Link', 'WebUntis link')}</label>
            <input id="untis-url-input" class="untis-url-input"
                type="text" inputmode="url"
                placeholder="https://xxx.webuntis.com/WebUntis?school=…"
                oninput="_untisOnUrlInput(this)"
                onpaste="setTimeout(()=>_untisOnUrlInput(this),50)"
                autocomplete="off" spellcheck="false"/>
            <div id="untis-url-hint" class="untis-hint"></div>
            ${_isDevHost() ? `<div class="untis-note" style="margin-top:12px;">
                ${svgInfo(15)}
                <span>${uT('Nur lokal:', 'Local only:')} <code class="untis-code">${MOCK_URL}</code> ${uT('lädt Testdaten.', 'loads test data.')}</span>
            </div>` : ''}
            <div id="untis-test-status" class="untis-test-status"></div>
            <button type="button" id="untis-test-btn" class="untis-btn untis-btn-test" onclick="_untisTest()" disabled>${svgWifi(16)} ${uT('Verbindung testen', 'Test connection')}</button>
            <div class="untis-btn-row">
                <button type="button" class="untis-btn untis-btn-ghost" onclick="_untisGotoStep(2)">${svgArrowLeft()} ${uT('Zurück', 'Back')}</button>
                <button type="button" id="untis-connect-btn" class="untis-btn untis-btn-primary" onclick="_untisSaveAndOpen()" disabled>${uT('Verbinden', 'Connect')}</button>
            </div>
        </div>`;
    }

    function _progressHTML(current, total) {
        return `
        <div class="untis-progress" aria-label="Schritt ${current} von ${total}">
            ${Array.from({length: total}, (_, i) => `
                <div class="untis-progress-dot ${i < current - 1 ? 'done' : i === current - 1 ? 'active' : ''}">
                    ${i < current - 1 ? svgCheck(11) : i + 1}
                </div>
                ${i < total - 1 ? '<div class="untis-progress-line"></div>' : ''}
            `).join('')}
        </div>`;
    }

    // ════════════════════════════════════════════════════════════════════
    //  MANUAL GRID BUILDER
    // ════════════════════════════════════════════════════════════════════

    function _untisOpenManual() {
        // Load existing if any
        try {
            const saved = localStorage.getItem(MANUAL_KEY);
            _manualSlots = saved ? JSON.parse(saved).slots || [] : [];
        } catch { _manualSlots = []; }
        _manualActiveDay = 1;

        _closeAll();
        _modal = document.createElement('div');
        _modal.id = 'untis-modal';
        _modal.className = 'untis-overlay';
        _modal.innerHTML = `
            <div class="untis-backdrop"></div>
            <div class="untis-dashboard-panel" role="dialog" aria-modal="true" aria-label="${uT('Stundenplan erstellen', 'Create timetable')}">
                <div class="untis-db-header">
                    <div class="untis-db-title">
                        <div class="untis-db-icon">${svgGrid(18)}</div>
                        <div>
                            <div class="untis-db-name">${uT('Stundenplan erstellen', 'Create timetable')}</div>
                            <div class="untis-db-meta">${uT('Wiederholt sich jede Woche', 'Repeats every week')}</div>
                        </div>
                    </div>
                    <div class="untis-db-actions">
                        <button type="button" class="untis-icon-btn" title="${uT('Zurück', 'Back')}" aria-label="${uT('Zurück', 'Back')}" onclick="_untisGotoStep(1)">${svgArrowLeft()}</button>
                        <button type="button" class="untis-icon-btn" title="${uT('Schließen', 'Close')}" aria-label="${uT('Schließen', 'Close')}" onclick="_untisClose()">${svgClose(16)}</button>
                    </div>
                </div>
                <div class="untis-db-body" id="untis-manual-body"></div>
                <div class="untis-manual-footer" id="untis-manual-footer"></div>
            </div>`;
        document.body.appendChild(_modal);

        window._untisGotoStep    = _openSetup;
        window._untisOpenManual  = _untisOpenManual;
        _renderManualUI();
    }
    window._untisOpenManual = _untisOpenManual;

    function _renderManualUI() {
        const body   = document.getElementById('untis-manual-body');
        const footer = document.getElementById('untis-manual-footer');
        if (!body || !footer) return;

        const totalSlots = _manualSlots.length;

        // Day tabs
        const tabs = [1,2,3,4,5].map(d => {
            const hasLessons = _manualSlots.some(s => s.day === d);
            return `<button type="button" class="untis-day-tab ${d === _manualActiveDay ? 'active' : ''} ${hasLessons ? 'has-lessons' : ''}"
                aria-pressed="${d === _manualActiveDay}" onclick="_untisManualSetDay(${d})">${DAYS_DE[d]}</button>`;
        }).join('');

        // Lessons for active day
        const daySlots = _manualSlots
            .map((s, i) => ({ ...s, idx: i }))
            .filter(s => s.day === _manualActiveDay)
            .sort((a, b) => a.start.localeCompare(b.start));

        const lessonsHTML = daySlots.length
            ? daySlots.map(s => {
                return `
                <div class="untis-manual-lesson" style="--subj:${_subjectColor(s.title)}">
                    <div class="untis-manual-lesson-title">${esc(s.title)}</div>
                    <div class="untis-manual-lesson-time">${esc(s.start)}–${esc(s.end)}</div>
                    ${s.room ? `<div class="untis-manual-lesson-room">${svgPin(12)} ${esc(s.room)}</div>` : ''}
                    <button type="button" class="untis-manual-lesson-del" onclick="_untisManualRemove(${s.idx})" title="${uT('Entfernen', 'Remove')}" aria-label="${esc(uT(s.title + ' entfernen', 'Remove ' + s.title))}">${svgX(14)}</button>
                </div>`;
            }).join('')
            : `<div class="untis-manual-empty">
                ${svgCal(20)}
                <span>${uT('Für ' + DAYS_FULL[_manualActiveDay] + ' ist noch nichts eingetragen.', 'Nothing entered for ' + DAYS_FULL[_manualActiveDay] + ' yet.')}</span>
               </div>`;

        body.innerHTML = `
            <div class="untis-day-tabs" role="group" aria-label="${uT('Wochentag', 'Weekday')}">${tabs}</div>
            <div>
                <div class="untis-section-header">
                    <span class="untis-section-label">${DAYS_FULL[_manualActiveDay]}</span>
                    <div class="untis-section-line"></div>
                    <button type="button" class="untis-btn-add-lesson" onclick="_untisManualShowForm()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        ${uT('Fach hinzufügen', 'Add subject')}
                    </button>
                </div>
                <div id="untis-lessons-list">${lessonsHTML}</div>
                <div id="untis-add-form"></div>
            </div>`;

        footer.innerHTML = `
            <div class="untis-manual-footer-inner">
                <div class="untis-manual-footer-info">${totalSlots} ${uT(totalSlots === 1 ? 'Fach in der Woche' : 'Fächer in der Woche', totalSlots === 1 ? 'subject per week' : 'subjects per week')}</div>
                <button type="button" class="untis-btn untis-btn-primary" onclick="_untisManualSave()" ${totalSlots === 0 ? 'disabled' : ''}>
                    ${uT('Stundenplan speichern', 'Save timetable')}
                </button>
            </div>`;
    }

    window._untisManualSetDay = function(day) {
        _manualActiveDay = day;
        // Close any open form, re-render
        _renderManualUI();
    };

    window._untisManualRemove = function(idx) {
        _manualSlots.splice(idx, 1);
        _renderManualUI();
    };

    window._untisManualShowForm = function() {
        const container = document.getElementById('untis-add-form');
        if (!container) return;

        container.innerHTML = `
            <div class="untis-manual-add-form">
                <div class="untis-form-title">${uT('Neues Fach am ' + DAYS_FULL[_manualActiveDay], 'New subject on ' + DAYS_FULL[_manualActiveDay])}</div>
                <div class="untis-form-row">
                    <div>
                        <label class="untis-field-label" for="mf-title">${uT('Fach', 'Subject')}</label>
                        <input id="mf-title" class="untis-form-input" oninput="this.classList.remove('is-invalid')" placeholder="${uT('z. B. LF1, WiSo, Mathe', 'e.g. LF1, Economics, Maths')}" maxlength="30" autocomplete="off">
                    </div>
                </div>
                <div class="untis-form-row">
                    <div>
                        <label class="untis-field-label" for="mf-start">${uT('Von', 'From')}</label>
                        <input id="mf-start" type="time" class="untis-form-input" value="08:00">
                    </div>
                    <div>
                        <label class="untis-field-label" for="mf-end">${uT('Bis', 'To')}</label>
                        <input id="mf-end" type="time" class="untis-form-input" oninput="this.classList.remove('is-invalid')" value="09:30">
                    </div>
                    <div>
                        <label class="untis-field-label" for="mf-room">${uT('Raum', 'Room')}</label>
                        <input id="mf-room" class="untis-form-input" placeholder="${uT('optional', 'optional')}">
                    </div>
                </div>
                <div class="untis-form-row untis-form-row--actions">
                    <button type="button" class="untis-btn untis-btn-ghost" onclick="_untisManualCancelForm()">${uT('Abbrechen', 'Cancel')}</button>
                    <button type="button" class="untis-btn untis-btn-primary" onclick="_untisManualConfirmAdd()">${uT('Hinzufügen', 'Add')}</button>
                </div>
            </div>`;

        document.getElementById('mf-title').focus();
    };

    window._untisManualCancelForm = function() {
        const c = document.getElementById('untis-add-form');
        if (c) c.innerHTML = '';
    };

    window._untisManualConfirmAdd = function() {
        const title = (document.getElementById('mf-title')?.value || '').trim();
        const start = document.getElementById('mf-start')?.value || '08:00';
        const end   = document.getElementById('mf-end')?.value   || '09:30';
        const room  = (document.getElementById('mf-room')?.value  || '').trim();

        if (!title) {
            const input = document.getElementById('mf-title');
            if (input) { input.classList.add('is-invalid'); input.focus(); }
            return;
        }
        if (start >= end) {
            const inp = document.getElementById('mf-end');
            if (inp) { inp.classList.add('is-invalid'); inp.focus(); }
            return;
        }

        _manualSlots.push({ day: _manualActiveDay, title, start, end, room });
        _renderManualUI();
    };

    window._untisManualSave = function() {
        if (!_manualSlots.length) return;
        localStorage.setItem(MANUAL_KEY, JSON.stringify({ slots: _manualSlots }));
        localStorage.removeItem(ICAL_KEY);
        localStorage.removeItem(CACHE_KEY);
        _openDashboard();
    };

    // ════════════════════════════════════════════════════════════════════
    //  URL INPUT HANDLER
    // ════════════════════════════════════════════════════════════════════

    window._untisOnUrlInput = function(el) {
        const val = el.value.trim();
        const valid = val === MOCK_URL || (val.length > 20 && val.includes('webuntis.com'));
        const testBtn    = document.getElementById('untis-test-btn');
        const connectBtn = document.getElementById('untis-connect-btn');
        if (testBtn)    testBtn.disabled    = !valid;
        if (connectBtn) connectBtn.disabled = true;
        _testSuccess = false;
        const st = document.getElementById('untis-test-status');
        if (st) { st.className = 'untis-test-status'; st.innerHTML = ''; }

        const hint = document.getElementById('untis-url-hint');
        if (!hint) return;
        if (val === MOCK_URL) {
            hint.innerHTML = `${svgInfo(14)} ${uT('Testdaten werden verwendet.', 'Using test data.')}`;
            hint.style.display = 'flex';
        } else if (val.includes('webuntis.com')) {
            const converted = _normalizeUntisUrl(val);
            if (converted !== val && converted.includes('/ical')) {
                hint.innerHTML = `${svgCheck(14)} ${uT('Link erkannt, er wird automatisch in den Kalender-Link umgewandelt.', 'Link recognised, it will be converted to the calendar link automatically.')}`;
                hint.style.display = 'flex';
            } else {
                hint.style.display = 'none';
            }
        } else {
            hint.style.display = 'none';
        }
    };

    window._untisTest = async function() {
        const input     = document.getElementById('untis-url-input');
        const statusEl  = document.getElementById('untis-test-status');
        const testBtn   = document.getElementById('untis-test-btn');
        const connectBtn = document.getElementById('untis-connect-btn');
        if (!input || !statusEl) return;

        const url = input.value.trim();
        testBtn.disabled = true;
        testBtn.innerHTML = `<span class="untis-spinner-sm"></span> ${uT('Wird getestet …', 'Testing …')}`;
        statusEl.className = 'untis-test-status loading';
        statusEl.innerHTML = `<span class="untis-spinner"></span> ${uT('Verbindung wird geprüft …', 'Checking connection …')}`;
        _testSuccess = false;
        if (connectBtn) connectBtn.disabled = true;

        try {
            const result = await _fetchAndParse(url);
            statusEl.className = 'untis-test-status success';
            statusEl.innerHTML = `${svgCheck(16)} ${uT('Verbunden, ' + result.length + ' Stunden gefunden.', 'Connected, ' + result.length + ' lessons found.')}`;
            _testSuccess = true;
            if (connectBtn) connectBtn.disabled = false;
            _cachedEvents = result;
        } catch (err) {
            statusEl.className = 'untis-test-status error';
            statusEl.innerHTML = `${svgX(16)} ${esc(String(err.message || err))}`;
        }

        testBtn.disabled = false;
        testBtn.innerHTML = `${svgWifi(16)} ${uT('Verbindung testen', 'Test connection')}`;
    };

    window._untisSaveAndOpen = function() {
        const input = document.getElementById('untis-url-input');
        if (!input || !_testSuccess) return;
        const raw = input.value.trim();
        const url = raw === MOCK_URL ? MOCK_URL : _normalizeUntisUrl(raw);
        localStorage.setItem(ICAL_KEY, url);
        localStorage.removeItem(MANUAL_KEY);
        if (_cachedEvents) _saveCache(_cachedEvents);
        _openDashboard();
    };

    window._untisClose = _closeAll;

    // ════════════════════════════════════════════════════════════════════
    //  DASHBOARD
    // ════════════════════════════════════════════════════════════════════

    function _openDashboard() {
        _closeAll();

        const isManual = !!localStorage.getItem(MANUAL_KEY);
        const modeBadge = `<span class="untis-mode-badge">${isManual ? uT('Selbst eingetragen', 'Entered manually') : 'WebUntis'}</span>`;

        _modal = document.createElement('div');
        _modal.id = 'untis-modal';
        _modal.className = 'untis-overlay';
        _modal.innerHTML = `
            <div class="untis-backdrop" onclick="_untisClose()"></div>
            <div class="untis-dashboard-panel" role="dialog" aria-modal="true" aria-label="${uT('Stundenplan', 'Timetable')}">
                <div class="untis-db-header">
                    <div class="untis-db-title">
                        <div class="untis-db-icon">${svgCal(18)}</div>
                        <div>
                            <div class="untis-db-name-row">
                                <div class="untis-db-name">${uT('Stundenplan', 'Timetable')}</div>
                                ${modeBadge}
                            </div>
                            <div class="untis-db-meta" id="untis-last-updated">${uT('Wird geladen …', 'Loading …')}</div>
                        </div>
                    </div>
                    <div class="untis-db-actions">
                        ${isManual ? '' : `<button type="button" class="untis-icon-btn" id="untis-refresh-btn" title="${uT('Aktualisieren', 'Refresh')}" aria-label="${uT('Aktualisieren', 'Refresh')}" onclick="_untisRefresh()">${svgRefresh(16)}</button>`}
                        <button type="button" class="untis-icon-btn" title="${uT('Neu einrichten', 'Set up again')}" aria-label="${uT('Neu einrichten', 'Set up again')}" onclick="_untisReconfigure()">${svgSettings(16)}</button>
                        <button type="button" class="untis-icon-btn" title="${uT('Schließen', 'Close')}" aria-label="${uT('Schließen', 'Close')}" onclick="_untisClose()">${svgClose(16)}</button>
                    </div>
                </div>
                <div class="untis-db-body" id="untis-db-body">
                    ${_dashboardSkeleton()}
                </div>
            </div>`;
        document.body.appendChild(_modal);

        window._untisRefresh = _dashboardRefresh;
        // Nichts löschen: bis v8.0.2 räumte das Zahnrad hier sofort alle drei
        // Schlüssel ab — wer danach „Abbrechen" drückte, hatte seinen selbst
        // eingetragenen Stundenplan verloren. Den alten Modus entfernt erst das
        // Speichern des neuen (_untisManualSave / _untisSaveAndOpen).
        window._untisReconfigure = () => _openSetup(1);

        _dashboardLoad();
        _refreshInt = setInterval(_dashboardRefresh, CACHE_TTL_MS);
    }

    async function _dashboardLoad() {
        try {
            const events = await _getEvents();
            _renderDashboard(events);
        } catch (err) {
            const body = document.getElementById('untis-db-body');
            if (body) body.innerHTML = `
                <div class="untis-empty-state">
                    <span class="untis-empty-icon">${svgX(20)}</span>
                    <span>${esc(String(err.message || err))}</span>
                    <button type="button" class="untis-btn untis-btn-secondary" onclick="_untisRefresh()">${uT('Erneut versuchen', 'Try again')}</button>
                </div>`;
        }
    }

    async function _dashboardRefresh() {
        const btn = document.getElementById('untis-refresh-btn');
        if (btn) btn.classList.add('spinning');
        localStorage.removeItem(CACHE_KEY);
        try {
            const events = await _getEvents();
            _renderDashboard(events);
        } catch (err) {
            if (typeof showToast === 'function') showToast('Untis: ' + String(err.message || err), 'error');
        }
        if (btn) btn.classList.remove('spinning');
    }

    function _renderDashboard(events) {
        const body = document.getElementById('untis-db-body');
        if (!body) return;

        const now   = new Date();
        const today = _dateStr(now);

        const todayEvents = events.filter(e => _dateStr(e.start) === today).sort((a, b) => a.start - b.start);
        const weekEvents  = _getWeekEvents(events, now);
        const current     = todayEvents.find(e => now >= e.start && now < e.end) || null;
        const upcoming    = todayEvents.find(e => e.start > now) || null;

        if (_countdownInt) clearInterval(_countdownInt);

        let html = '';

        html += `<div>
            <div class="untis-section-header">
                <span class="untis-section-label">${uT('Heute', 'Today')}, ${DAYS_FULL[now.getDay()]}, ${now.toLocaleDateString(mwlLocale(),{day:'numeric',month:'long'})}</span>
                <div class="untis-section-line"></div>
            </div>
            <div class="untis-today-hero">${_currentCard(current, now)}${_nextCard(upcoming, now)}</div>
        </div>`;

        if (todayEvents.length) {
            html += `<div>
                <div class="untis-section-header">
                    <span class="untis-section-label">${uT('Tagesplan', 'Today’s lessons')}</span>
                    <div class="untis-section-line"></div>
                </div>
                <div class="untis-timeline">${todayEvents.map(e => _timelineItem(e, now)).join('')}</div>
            </div>`;
        }

        html += `<div>
            <div class="untis-section-header">
                <span class="untis-section-label">${uT('Diese Woche', 'This week')}</span>
                <div class="untis-section-line"></div>
            </div>
            ${_weekGrid(weekEvents, now)}
        </div>`;

        body.innerHTML = html;
        _updateLastUpdated();

        if (current || upcoming) {
            _countdownInt = setInterval(() => {
                const n = new Date();
                const c = todayEvents.find(e => n >= e.start && n < e.end) || null;
                const u = todayEvents.find(e => e.start > n) || null;
                const cEl = document.getElementById('untis-current-card');
                const nEl = document.getElementById('untis-next-card');
                if (cEl) cEl.outerHTML = _currentCard(c, n);
                if (nEl) nEl.outerHTML = _nextCard(u, n);
            }, 30000);
        }
    }

    function _currentCard(ev, now) {
        // Ohne laufende Stunde ist die Karte neutral — der Akzent gehört nur einer echten Stunde.
        if (!ev) return `<div class="untis-hero-card is-empty" id="untis-current-card">
            <div class="untis-hero-tag">${uT('Jetzt', 'Now')}</div>
            <div class="untis-hero-subject">${uT('Gerade keine Stunde', 'No lesson right now')}</div>
        </div>`;
        const rem = Math.max(0, Math.ceil((ev.end - now) / 60000));
        return `<div class="untis-hero-card current" id="untis-current-card">
            <div class="untis-pulse-ring" aria-hidden="true"></div>
            <div class="untis-hero-tag">${uT('Jetzt', 'Now')}</div>
            <div class="untis-hero-subject" title="${esc(ev.title)}">${esc(ev.title)}</div>
            <div class="untis-hero-time">${_fmt(ev.start)}–${_fmt(ev.end)}</div>
            ${ev.location ? `<div class="untis-hero-room">${svgPin(12)} ${esc(ev.location)}</div>` : ''}
            <div class="untis-hero-countdown">${rem}<small>${uT('Min übrig', 'min left')}</small></div>
        </div>`;
    }

    function _nextCard(ev, now) {
        if (!ev) return `<div class="untis-hero-card is-empty" id="untis-next-card">
            <div class="untis-hero-tag">${uT('Danach', 'Next')}</div>
            <div class="untis-hero-subject">${uT('Heute nichts mehr', 'Nothing else today')}</div>
        </div>`;
        const inMin = Math.max(0, Math.ceil((ev.start - now) / 60000));
        return `<div class="untis-hero-card next" id="untis-next-card">
            <div class="untis-hero-tag">${uT('In ' + inMin + ' Min', 'In ' + inMin + ' min')}</div>
            <div class="untis-hero-subject" title="${esc(ev.title)}">${esc(ev.title)}</div>
            <div class="untis-hero-time">${_fmt(ev.start)}–${_fmt(ev.end)}</div>
            ${ev.location ? `<div class="untis-hero-room">${svgPin(12)} ${esc(ev.location)}</div>` : ''}
        </div>`;
    }

    function _timelineItem(ev, now) {
        const isCurrent = now >= ev.start && now < ev.end;
        const isPast    = ev.end < now;
        return `
        <div class="untis-timeline-item">
            <div class="untis-timeline-time-col">
                <span class="untis-timeline-time">${_fmt(ev.start)}</span>
            </div>
            <div class="untis-timeline-card ${isCurrent ? 'current' : isPast ? 'past' : ''}" style="--subj:${_subjectColor(ev.title)}">
                <div class="untis-timeline-subject">${esc(ev.title)}</div>
                <div class="untis-timeline-detail">${_fmt(ev.start)}–${_fmt(ev.end)}${ev.location ? ' · ' + esc(ev.location) : ''}</div>
            </div>
        </div>`;
    }

    function _weekGrid(weekEvents, now) {
        const todayStr = _dateStr(now);
        const mon = _getMondayOf(now);
        const cols = [0,1,2,3,4].map(offset => {
            const day = new Date(mon);
            day.setDate(mon.getDate() + offset);
            const ds      = _dateStr(day);
            const isToday = ds === todayStr;
            const evs     = (weekEvents[ds] || []).sort((a,b) => a.start - b.start);
            return `
            <div class="untis-day-col">
                <div class="untis-day-header ${isToday ? 'today' : ''}">
                    <div class="untis-day-name">${DAYS_DE[day.getDay()]}</div>
                    <div class="untis-day-date">${day.toLocaleDateString(mwlLocale(), { day: '2-digit', month: '2-digit' })}</div>
                </div>
                ${evs.length ? evs.map(e => _lessonChip(e)).join('') : '<div class="untis-day-empty">—</div>'}
            </div>`;
        });
        return `<div class="untis-week-grid">${cols.join('')}</div>`;
    }

    function _lessonChip(ev) {
        return `<div class="untis-lesson-chip" style="--subj:${_subjectColor(ev.title)}"
            title="${esc(ev.title)} · ${_fmt(ev.start)}–${_fmt(ev.end)}${ev.location ? ' · '+esc(ev.location) : ''}">
            <span class="untis-lesson-name">${esc(ev.title)}</span>
            <span class="untis-lesson-t">${_fmt(ev.start)}</span>
        </div>`;
    }

    function _dashboardSkeleton() {
        return `<div style="display:flex;flex-direction:column;gap:1rem;">
            <div class="untis-skeleton" style="height:18px;width:40%;border-radius:6px;"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                <div class="untis-skeleton" style="height:110px;border-radius:16px;"></div>
                <div class="untis-skeleton" style="height:110px;border-radius:16px;"></div>
            </div>
            <div class="untis-skeleton" style="height:18px;width:30%;border-radius:6px;"></div>
            ${[1,2,3].map(()=>`<div class="untis-skeleton" style="height:50px;border-radius:12px;"></div>`).join('')}
            <div class="untis-skeleton" style="height:18px;width:30%;border-radius:6px;"></div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;">
                ${[1,2,3,4,5].map(()=>`<div class="untis-skeleton" style="height:80px;border-radius:12px;"></div>`).join('')}
            </div>
        </div>`;
    }

    function _updateLastUpdated() {
        const el = document.getElementById('untis-last-updated');
        if (!el) return;
        const now = new Date();
        el.textContent = `${uT('Aktualisiert', 'Updated')} ${now.toLocaleTimeString(mwlLocale(),{hour:'2-digit',minute:'2-digit'})}`;
    }

    // ════════════════════════════════════════════════════════════════════
    //  DATA FETCHING
    // ════════════════════════════════════════════════════════════════════

    async function _getEvents() {
        // Manual mode
        const manualRaw = localStorage.getItem(MANUAL_KEY);
        if (manualRaw) {
            try {
                const { slots } = JSON.parse(manualRaw);
                return _expandManualToEvents(slots || []);
            } catch { /* fall through */ }
        }

        // iCal mode (with cache)
        const cached = _loadCache();
        if (cached) { _cachedEvents = cached; return cached; }
        const url = localStorage.getItem(ICAL_KEY);
        if (!url) throw new Error(uT('Kein Stundenplan eingerichtet', 'No timetable set up'));
        const events = await _fetchAndParse(url);
        _saveCache(events);
        _cachedEvents = events;
        return events;
    }

    async function _fetchAndParse(icalUrl) {
        const trimmed = icalUrl.trim();

        // ── Dev mode interceptor ──
        if (trimmed === MOCK_URL) return _generateMockEvents();

        const normalized = _normalizeUntisUrl(trimmed);
        const fetchUrl   = `${PROXY_URL}?url=${encodeURIComponent(normalized)}`;
        const resp       = await fetch(fetchUrl, { cache: 'no-store' });

        if (!resp.ok) {
            const body = await resp.text().catch(() => '');
            let msg = `HTTP ${resp.status}`;
            try { const j = JSON.parse(body); msg = j.error || msg; } catch {}
            if (resp.status === 401 || resp.status === 403)
                throw new Error(uT('WebUntis verweigert den Zugriff. Eventuell hat deine Schule den Kalender-Export abgeschaltet.', 'WebUntis denied access. Your school may have turned off the calendar export.'));
            throw new Error(msg);
        }

        const text = await resp.text();
        if (!text.includes('BEGIN:VCALENDAR'))
            throw new Error(uT('Unter dem Link liegt kein Kalender. Kopiere den „Öffentlichen Link“ aus dem Stundenplan.', 'The link does not lead to a calendar. Copy the “public link” from the timetable.'));

        const events = _parseIcal(text);
        if (!events.length) throw new Error(uT('Keine Stunden gefunden. Der Stundenplan ist eventuell leer.', 'No lessons found. The timetable may be empty.'));
        return events;
    }

    // ── URL Normalizer ───────────────────────────────────────────────────
    function _normalizeUntisUrl(raw) {
        const url = raw.trim().replace(/^webcal:\/\//i, 'https://');
        if (url.includes('/WebUntis/ical') || url.includes('/ical')) return url;
        try {
            const u = new URL(url);
            if (!u.hostname.endsWith('webuntis.com')) return url;
            const school   = u.searchParams.get('school') || u.hostname.split('.')[0];
            const hash     = u.hash || '';
            const qIdx     = hash.indexOf('?');
            const hp       = new URLSearchParams(qIdx >= 0 ? hash.slice(qIdx + 1) : '');
            const entityId = hp.get('entityId');
            if (entityId)
                return `https://${u.hostname}/WebUntis/ical?school=${encodeURIComponent(school)}&elementType=5&elementId=${encodeURIComponent(entityId)}`;
        } catch {}
        return url;
    }

    // ── Mock events (dev mode) ───────────────────────────────────────────
    function _generateMockEvents() {
        const now   = new Date();
        const mon   = _getMondayOf(now);
        const events = [];

        const TIMETABLE = [
            { d: 0, title: 'LF1 — Lernfeld 1',  start: '08:00', end: '09:30', room: 'B204' },
            { d: 0, title: 'LF2 — Lernfeld 2',  start: '09:45', end: '11:15', room: 'B204' },
            { d: 0, title: 'Mathematik',          start: '11:30', end: '13:00', room: 'B112' },
            { d: 1, title: 'WiSo',               start: '08:00', end: '09:30', room: 'A301' },
            { d: 1, title: 'Deutsch / Komm.',    start: '09:45', end: '11:15', room: 'A301' },
            { d: 1, title: 'Sport',              start: '12:00', end: '12:45', room: 'Halle' },
            { d: 2, title: 'Fachtheorie',        start: '08:00', end: '10:00', room: 'B204' },
            { d: 2, title: 'Prüfungsvorbereitung', start: '10:15', end: '12:00', room: 'B204' },
        ];

        for (let w = -1; w <= 3; w++) {
            for (const slot of TIMETABLE) {
                const day = new Date(mon);
                day.setDate(mon.getDate() + slot.d + w * 7);
                const [sh, sm] = slot.start.split(':').map(Number);
                const [eh, em] = slot.end.split(':').map(Number);
                const start = new Date(day); start.setHours(sh, sm, 0, 0);
                const end   = new Date(day); end.setHours(eh, em, 0, 0);
                events.push({ title: slot.title, start, end, location: slot.room, description: 'DEV', uid: `mock-${w}-${slot.d}-${slot.start}` });
            }
        }
        return events;
    }

    // ── Manual → Events ─────────────────────────────────────────────────
    function _expandManualToEvents(slots) {
        const events = [];
        const now = new Date();
        const baseMon = _getMondayOf(now);

        for (let w = -2; w <= 6; w++) {
            for (const slot of slots) {
                const day = new Date(baseMon);
                day.setDate(baseMon.getDate() + (slot.day - 1) + w * 7);
                const [sh, sm] = (slot.start || '08:00').split(':').map(Number);
                const [eh, em] = (slot.end   || '09:30').split(':').map(Number);
                const start = new Date(day); start.setHours(sh, sm, 0, 0);
                const end   = new Date(day); end.setHours(eh, em, 0, 0);
                events.push({ title: slot.title || '?', start, end, location: slot.room || '', description: '', uid: `manual-${slot.day}-${slot.start}-${slot.title}-${w}` });
            }
        }
        return events;
    }

    // ── iCal Parser ──────────────────────────────────────────────────────
    function _parseIcal(raw) {
        const text  = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = [];
        for (const line of text.split('\n')) {
            if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
                lines[lines.length - 1] += line.slice(1);
            } else { lines.push(line); }
        }
        const events = [];
        let cur = null;
        for (const line of lines) {
            if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
            if (line === 'END:VEVENT')   { if (cur) { events.push(cur); cur = null; } continue; }
            if (!cur) continue;
            const ci = line.indexOf(':');
            if (ci < 0) continue;
            const key = line.slice(0, ci).split(';')[0].toUpperCase();
            cur[key]  = line.slice(ci + 1).replace(/\\n/g, ' ').replace(/\\,/g, ',').trim();
        }
        return events.map(e => {
            const start = _parseDate(e['DTSTART'] || '');
            const end   = _parseDate(e['DTEND']   || '');
            if (!start) return null;
            return {
                title:       (e['SUMMARY']     || 'Unbekannt').trim(),
                start,
                end:         end || new Date(start.getTime() + 45 * 60000),
                location:    (e['LOCATION']    || '').replace(/\\,/g, ',').trim(),
                description: (e['DESCRIPTION'] || '').trim(),
                uid:          e['UID'] || '',
            };
        }).filter(Boolean);
    }

    function _parseDate(str) {
        if (!str) return null;
        const m = str.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
        if (m) {
            return m[7]
                ? new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]))
                : new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
        }
        const d = str.match(/^(\d{4})(\d{2})(\d{2})$/);
        return d ? new Date(+d[1], +d[2]-1, +d[3]) : null;
    }

    // ── Cache ────────────────────────────────────────────────────────────
    function _saveCache(events) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                ts: Date.now(),
                events: events.map(e => ({ ...e, start: e.start.getTime(), end: e.end.getTime() })),
            }));
        } catch {}
    }

    function _loadCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, events } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL_MS) return null;
            return events.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }));
        } catch { return null; }
    }

    // ── Helpers ──────────────────────────────────────────────────────────
    function _dateStr(d) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function _fmt(d) {
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    function _getMondayOf(d) {
        const day = new Date(d);
        const dow = day.getDay();
        day.setDate(day.getDate() + (dow === 0 ? -6 : 1 - dow));
        day.setHours(0, 0, 0, 0);
        return day;
    }
    function _getWeekEvents(events, refDate) {
        const mon = _getMondayOf(refDate);
        const fri = new Date(mon); fri.setDate(mon.getDate() + 4); fri.setHours(23,59,59,999);
        const grouped = {};
        for (const e of events) {
            if (e.start < mon || e.start > fri) continue;
            const ds = _dateStr(e.start);
            if (!grouped[ds]) grouped[ds] = [];
            grouped[ds].push(e);
        }
        return grouped;
    }
    function _subjectColor(name) {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
        return SUBJECT_COLORS[Math.abs(h) % SUBJECT_COLORS.length];
    }
    function esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── SVG Icons ────────────────────────────────────────────────────────
    function svgCal(s)      { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`; }
    function svgRefresh(s)  { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`; }
    function svgCheck(s)    { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
    function svgX(s)        { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; }
    function svgArrow()     { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`; }
    function svgArrowLeft() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`; }
    function svgClose(s)    { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; }
    function svgSettings(s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`; }
    function svgWifi(s)     { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`; }
    function svgExternal(s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`; }
    function svgGrid(s)     { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`; }
    function svgInfo(s)     { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`; }
    function svgPin(s)      { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`; }

    // Der Testdaten-Hinweis stand bis v8.0.2 für ALLE Nutzer im Assistenten.
    function _isDevHost() { return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }

})();
