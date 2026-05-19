// ═══ UNTIS MODULE ═══

(function () {

    // ── Constants ────────────────────────────────────────────────────────
    const ICAL_KEY     = 'untis_ical_url';
    const MANUAL_KEY   = 'untis_manual_grid';
    const CACHE_KEY    = 'untis_cache';
    const CACHE_TTL_MS = 30 * 60 * 1000;
    const PROXY_URL    = 'https://untis-proxy.myworklog.workers.dev';
    const MOCK_URL     = 'dev://mock-untis';

    const SUBJECT_COLORS = [
        { bg: 'rgba(168,85,247,0.18)',  border: 'rgba(168,85,247,0.45)',  text: '#d8b4fe' },
        { bg: 'rgba(34,211,238,0.14)',  border: 'rgba(34,211,238,0.4)',   text: '#67e8f9' },
        { bg: 'rgba(251,146,60,0.14)',  border: 'rgba(251,146,60,0.4)',   text: '#fdba74' },
        { bg: 'rgba(74,222,128,0.14)',  border: 'rgba(74,222,128,0.4)',   text: '#86efac' },
        { bg: 'rgba(251,191,36,0.14)',  border: 'rgba(251,191,36,0.4)',   text: '#fde68a' },
        { bg: 'rgba(244,114,182,0.14)', border: 'rgba(244,114,182,0.4)',  text: '#f9a8d4' },
        { bg: 'rgba(129,140,248,0.14)', border: 'rgba(129,140,248,0.4)',  text: '#a5b4fc' },
        { bg: 'rgba(52,211,153,0.14)',  border: 'rgba(52,211,153,0.4)',   text: '#6ee7b7' },
    ];

    const DAYS_DE   = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const DAYS_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

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
            <div class="untis-setup-panel">
                <div class="untis-orb untis-orb-1"></div>
                <div class="untis-orb untis-orb-2"></div>
                <div style="position:relative;z-index:1;"><div id="untis-step-content"></div></div>
            </div>`;
        document.body.appendChild(_modal);
        _renderStep(step);
    }

    function _renderStep(step) {
        const el = document.getElementById('untis-step-content');
        if (!el) return;
        const map = { 1: _step1, 2: _step2, 3: _step3 };
        el.innerHTML = (map[step] || _step1)();
        const inner = el.querySelector('.untis-step-inner');
        if (inner) { inner.style.opacity = '0'; requestAnimationFrame(() => { inner.style.opacity = ''; }); }
        window._untisGotoStep = _openSetup;
    }

    // ── Step 1: Dual-Choice ──────────────────────────────────────────────
    function _step1() {
        return `
        <div class="untis-step-inner">
            <div style="margin-bottom:1.5rem;">
                <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.35rem;">
                    <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,rgba(168,85,247,0.35),rgba(147,51,234,0.2));border:1px solid rgba(168,85,247,0.4);display:flex;align-items:center;justify-content:center;">${svgCal(14)}</div>
                    <span style="font-size:0.7rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.3);">Untis Stundenplan</span>
                </div>
                <h2 class="untis-title">Wie willst du einrichten?</h2>
                <p class="untis-subtitle" style="margin-bottom:0;">Wähle die passende Methode für deine Schule.</p>
            </div>

            <div class="untis-choice-grid">
                <button class="untis-choice-card untis-choice-ical" onclick="_untisGotoStep(2)">
                    <div class="untis-choice-glow"></div>
                    <div class="untis-choice-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                    </div>
                    <div class="untis-choice-label">Auto-Sync</div>
                    <div class="untis-choice-name">WebUntis iCal</div>
                    <div class="untis-choice-desc">Direkt aus WebUntis — immer aktuell.</div>
                    <div class="untis-choice-badge untis-badge-purple">Live · Automatisch</div>
                    <div class="untis-choice-arrow">${svgArrow()}</div>
                </button>

                <button class="untis-choice-card untis-choice-manual" onclick="_untisOpenManual()">
                    <div class="untis-choice-glow"></div>
                    <div class="untis-choice-icon" style="background:rgba(34,211,238,0.12);border-color:rgba(34,211,238,0.25);color:#67e8f9;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                    </div>
                    <div class="untis-choice-label" style="color:#67e8f9;">Manuell</div>
                    <div class="untis-choice-name">Eigener Stundenplan</div>
                    <div class="untis-choice-desc">Perfekt für feste Berufsschultage.</div>
                    <div class="untis-choice-badge untis-badge-cyan">Immer verfügbar</div>
                    <div class="untis-choice-arrow">${svgArrow()}</div>
                </button>
            </div>

            <button class="untis-btn untis-btn-ghost" style="width:100%;" onclick="_untisClose()">Abbrechen</button>
        </div>`;
    }

    // ── Step 2: Instructions ─────────────────────────────────────────────
    function _step2() {
        return `
        <div class="untis-step-inner">
            ${_progressHTML(1, 2)}
            <h2 class="untis-title" style="margin-bottom:0.3rem;">Link aus WebUntis holen</h2>
            <p class="untis-subtitle">Folge diesen 3 Schritten:</p>
            <div class="untis-instructions">
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">1</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">WebUntis öffnen</div>
                        <div class="untis-instruction-desc">Melde dich auf der Seite deiner Schule an.</div>
                        <a class="untis-instruction-action" href="https://webuntis.com" target="_blank" rel="noopener">${svgExternal(12)} webuntis.com</a>
                    </div>
                </div>
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">2</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">Zu "Mein Stundenplan" navigieren</div>
                        <div class="untis-instruction-desc">In der linken Navigation auf <strong style="color:rgba(255,255,255,0.75)">Stundenplan</strong> klicken → Tab <strong style="color:rgba(255,255,255,0.75)">"Mein Stundenplan"</strong>.</div>
                    </div>
                </div>
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">3</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">"Öffentlichen Link kopieren"</div>
                        <div class="untis-instruction-desc">Rechts oben das <strong style="color:rgba(255,255,255,0.75)">Teilen-Icon</strong> (Kette) → <strong style="color:rgba(255,255,255,0.75)">"Öffentlichen Link kopieren"</strong>. Den Link direkt im nächsten Schritt einfügen.</div>
                    </div>
                </div>
            </div>
            <div class="untis-note info" style="margin-bottom:1rem;">
                <span style="color:#67e8f9;flex-shrink:0">⚡</span>
                <span>Kein Teilen-Icon sichtbar? → Wähle stattdessen <button onclick="_untisOpenManual()" style="background:none;border:none;color:#67e8f9;cursor:pointer;font-size:inherit;text-decoration:underline;padding:0;">Manuellen Stundenplan</button>.</span>
            </div>
            <div class="untis-btn-row">
                <button class="untis-btn untis-btn-ghost" onclick="_untisGotoStep(1)">${svgArrowLeft()} Zurück</button>
                <button class="untis-btn untis-btn-primary" onclick="_untisGotoStep(3)" style="flex:1">Link habe ich ${svgArrow()}</button>
            </div>
        </div>`;
    }

    // ── Step 3: URL Input ────────────────────────────────────────────────
    function _step3() {
        return `
        <div class="untis-step-inner">
            ${_progressHTML(2, 2)}
            <h2 class="untis-title" style="margin-bottom:0.3rem;">Link einfügen</h2>
            <p class="untis-subtitle">Füge deinen WebUntis-Link ein:</p>
            <div style="margin-bottom:0.5rem;">
                <input id="untis-url-input" class="untis-url-input"
                    type="text"
                    placeholder="https://xxx.webuntis.com/WebUntis?school=…"
                    oninput="_untisOnUrlInput(this)"
                    onpaste="setTimeout(()=>_untisOnUrlInput(this),50)"
                    autocomplete="off" spellcheck="false"/>
            </div>
            <div id="untis-url-hint" style="display:none;font-size:0.78rem;padding:0.4rem 0.7rem;margin-bottom:0.5rem;background:rgba(34,211,238,0.07);border:1px solid rgba(34,211,238,0.18);border-radius:8px;color:#67e8f9;"></div>
            <div class="untis-note info" style="margin-bottom:0.75rem;">
                <span style="color:#67e8f9;flex-shrink:0;">💡</span>
                <span>Dev-Modus: gib <code style="background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:4px;font-family:'JetBrains Mono',monospace;">dev://mock-untis</code> ein um mit Testdaten zu arbeiten.</span>
            </div>
            <div id="untis-test-status" class="untis-test-status"></div>
            <button id="untis-test-btn" class="untis-btn untis-btn-test" onclick="_untisTest()" disabled>${svgWifi(16)} Verbindung testen</button>
            <div class="untis-btn-row">
                <button class="untis-btn untis-btn-ghost" onclick="_untisGotoStep(2)">${svgArrowLeft()} Zurück</button>
                <button id="untis-connect-btn" class="untis-btn untis-btn-primary" onclick="_untisSaveAndOpen()" disabled style="flex:1">Verbinden &amp; öffnen ${svgArrow()}</button>
            </div>
        </div>`;
    }

    function _progressHTML(current, total) {
        return `
        <div class="untis-progress" style="margin-bottom:1.5rem;">
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
            <div class="untis-dashboard-panel">
                <div class="untis-orb untis-orb-1"></div>
                <div class="untis-orb untis-orb-2" style="background:radial-gradient(circle,rgba(34,211,238,0.07),transparent);"></div>
                <div class="untis-db-header" style="position:relative;z-index:1;">
                    <div class="untis-db-title">
                        <div class="untis-db-icon" style="background:rgba(34,211,238,0.12);border-color:rgba(34,211,238,0.3);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                        </div>
                        <div>
                            <div class="untis-db-name">Stundenplan erstellen</div>
                            <div class="untis-db-meta">Wöchentlich wiederkehrend</div>
                        </div>
                    </div>
                    <div class="untis-db-actions">
                        <button class="untis-icon-btn" title="Zurück" onclick="_untisGotoStep(1)">${svgArrowLeft()}</button>
                        <button class="untis-icon-btn" title="Schließen" onclick="_untisClose()">${svgClose(16)}</button>
                    </div>
                </div>
                <div class="untis-db-body" id="untis-manual-body" style="position:relative;z-index:1;"></div>
                <div class="untis-manual-footer" id="untis-manual-footer" style="position:relative;z-index:1;"></div>
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
            return `<button class="untis-day-tab ${d === _manualActiveDay ? 'active' : ''} ${hasLessons ? 'has-lessons' : ''}"
                onclick="_untisManualSetDay(${d})">${DAYS_DE[d]}</button>`;
        }).join('');

        // Lessons for active day
        const daySlots = _manualSlots
            .map((s, i) => ({ ...s, idx: i }))
            .filter(s => s.day === _manualActiveDay)
            .sort((a, b) => a.start.localeCompare(b.start));

        const lessonsHTML = daySlots.length
            ? daySlots.map(s => {
                const c = _subjectColor(s.title);
                return `
                <div class="untis-manual-lesson" style="border-left:2px solid ${c.border};">
                    <div class="untis-manual-lesson-color" style="background:${c.bg};border:1px solid ${c.border};color:${c.text};padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;white-space:nowrap;">${esc(s.title)}</div>
                    <div class="untis-manual-lesson-time">${esc(s.start)}–${esc(s.end)}</div>
                    ${s.room ? `<div class="untis-manual-lesson-room">📍 ${esc(s.room)}</div>` : ''}
                    <button class="untis-manual-lesson-del" onclick="_untisManualRemove(${s.idx})" title="Entfernen">${svgX(12)}</button>
                </div>`;
            }).join('')
            : `<div class="untis-manual-empty">
                <div style="font-size:1.5rem;opacity:0.3;margin-bottom:0.5rem;">📅</div>
                <div style="color:rgba(255,255,255,0.2);font-size:0.8rem;">Noch keine Fächer für ${DAYS_FULL[_manualActiveDay]}<br>Klicke "+ Fach" um zu beginnen</div>
               </div>`;

        body.innerHTML = `
            <div>
                <div class="untis-section-header" style="margin-bottom:0.75rem;">
                    <span class="untis-section-label">Wochentage</span>
                    <div class="untis-section-line"></div>
                </div>
                <div class="untis-day-tabs">${tabs}</div>
            </div>
            <div>
                <div class="untis-section-header" style="margin-bottom:0.75rem;">
                    <span class="untis-section-label">${DAYS_FULL[_manualActiveDay]}</span>
                    <div class="untis-section-line"></div>
                    <button class="untis-btn-add-lesson" onclick="_untisManualShowForm()" title="Fach hinzufügen">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Fach
                    </button>
                </div>
                <div id="untis-lessons-list">${lessonsHTML}</div>
                <div id="untis-add-form"></div>
            </div>`;

        // Footer
        footer.innerHTML = `
            <div class="untis-manual-footer-inner">
                <div class="untis-manual-footer-info">
                    <span style="font-size:0.8rem;color:rgba(255,255,255,0.35);">${totalSlots} Fach${totalSlots !== 1 ? 'er' : ''} gespeichert</span>
                </div>
                <button class="untis-btn untis-btn-primary" onclick="_untisManualSave()" ${totalSlots === 0 ? 'disabled' : ''}>
                    Stundenplan speichern ${svgArrow()}
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
                <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:0.75rem;">Neues Fach — ${DAYS_FULL[_manualActiveDay]}</div>
                <div class="untis-form-row">
                    <input id="mf-title" class="untis-form-input" placeholder="Fachname (z.B. LF1, WiSo, Mathe)" maxlength="30" autocomplete="off">
                </div>
                <div class="untis-form-row">
                    <div style="flex:1;">
                        <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);margin-bottom:4px;">Von</div>
                        <input id="mf-start" type="time" class="untis-form-input" value="08:00">
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);margin-bottom:4px;">Bis</div>
                        <input id="mf-end" type="time" class="untis-form-input" value="09:30">
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:0.7rem;color:rgba(255,255,255,0.3);margin-bottom:4px;">Raum</div>
                        <input id="mf-room" class="untis-form-input" placeholder="optional">
                    </div>
                </div>
                <div class="untis-form-row" style="margin-bottom:0;">
                    <button class="untis-btn untis-btn-ghost" style="flex:0 0 auto;" onclick="_untisManualCancelForm()">Abbrechen</button>
                    <button class="untis-btn untis-btn-primary" style="flex:1;" onclick="_untisManualConfirmAdd()">
                        Hinzufügen ${svgArrow()}
                    </button>
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
            if (input) { input.style.borderColor = 'rgba(248,113,113,0.6)'; input.focus(); }
            return;
        }
        if (start >= end) {
            const inp = document.getElementById('mf-end');
            if (inp) { inp.style.borderColor = 'rgba(248,113,113,0.6)'; inp.focus(); }
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
            hint.innerHTML = '🧪 Dev-Modus aktiv — Testdaten werden verwendet';
            hint.style.display = 'block';
        } else if (val.includes('webuntis.com')) {
            const converted = _normalizeUntisUrl(val);
            if (converted !== val && converted.includes('/ical')) {
                hint.innerHTML = '⚡ Automatisch erkannt — wird zu iCal-URL konvertiert';
                hint.style.display = 'block';
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
        testBtn.innerHTML = `<span class="untis-spinner-sm"></span> Teste…`;
        statusEl.className = 'untis-test-status loading';
        statusEl.innerHTML = `<div class="untis-spinner"></div> Verbindung wird geprüft…`;
        _testSuccess = false;
        if (connectBtn) connectBtn.disabled = true;

        try {
            const result = await _fetchAndParse(url);
            statusEl.className = 'untis-test-status success';
            statusEl.innerHTML = `${svgCheck(16)} Verbunden! ${result.length} Stunden gefunden.`;
            _testSuccess = true;
            if (connectBtn) connectBtn.disabled = false;
            _cachedEvents = result;
        } catch (err) {
            statusEl.className = 'untis-test-status error';
            statusEl.innerHTML = `${svgX(16)} ${esc(String(err.message || err))}`;
        }

        testBtn.disabled = false;
        testBtn.innerHTML = `${svgWifi(16)} Verbindung testen`;
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
        const modeBadge = isManual
            ? `<span style="font-size:0.65rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:rgba(34,211,238,0.12);border:1px solid rgba(34,211,238,0.25);color:#67e8f9;padding:2px 7px;border-radius:6px;">Manuell</span>`
            : `<span style="font-size:0.65rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.25);color:#d8b4fe;padding:2px 7px;border-radius:6px;">Auto-Sync</span>`;

        _modal = document.createElement('div');
        _modal.id = 'untis-modal';
        _modal.className = 'untis-overlay';
        _modal.innerHTML = `
            <div class="untis-backdrop"></div>
            <div class="untis-dashboard-panel">
                <div class="untis-orb untis-orb-1"></div>
                <div class="untis-orb untis-orb-2"></div>
                <div class="untis-orb untis-orb-3"></div>
                <div class="untis-db-header" style="position:relative;z-index:1;">
                    <div class="untis-db-title">
                        <div class="untis-db-icon">${svgCal(18)}</div>
                        <div>
                            <div style="display:flex;align-items:center;gap:0.5rem;">
                                <div class="untis-db-name">Stundenplan</div>
                                ${modeBadge}
                            </div>
                            <div class="untis-db-meta" id="untis-last-updated">Wird geladen…</div>
                        </div>
                    </div>
                    <div class="untis-db-actions">
                        <button class="untis-icon-btn" id="untis-refresh-btn" title="Aktualisieren" onclick="_untisRefresh()">${svgRefresh(16)}</button>
                        <button class="untis-icon-btn" title="Einstellungen" onclick="_untisReconfigure()">${svgSettings(16)}</button>
                        <button class="untis-icon-btn" title="Schließen" onclick="_untisClose()">${svgClose(16)}</button>
                    </div>
                </div>
                <div class="untis-db-body" id="untis-db-body" style="position:relative;z-index:1;">
                    ${_dashboardSkeleton()}
                </div>
            </div>`;
        document.body.appendChild(_modal);

        window._untisRefresh = _dashboardRefresh;
        window._untisReconfigure = () => {
            localStorage.removeItem(ICAL_KEY);
            localStorage.removeItem(MANUAL_KEY);
            localStorage.removeItem(CACHE_KEY);
            _openSetup(1);
        };

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
                    <div class="untis-empty-icon">⚡</div>
                    <div style="margin-bottom:1rem;">${esc(String(err.message || err))}</div>
                    <button class="untis-btn untis-btn-secondary" onclick="_untisRefresh()">Erneut versuchen</button>
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
                <span class="untis-section-label">Heute — ${DAYS_FULL[now.getDay()]}, ${now.toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}</span>
                <div class="untis-section-line"></div>
            </div>
            <div class="untis-today-hero">${_currentCard(current, now)}${_nextCard(upcoming, now)}</div>
        </div>`;

        if (todayEvents.length) {
            html += `<div>
                <div class="untis-section-header">
                    <span class="untis-section-label">Tagesplan</span>
                    <div class="untis-section-line"></div>
                </div>
                <div class="untis-timeline">${todayEvents.map(e => _timelineItem(e, now)).join('')}</div>
            </div>`;
        }

        html += `<div>
            <div class="untis-section-header">
                <span class="untis-section-label">Diese Woche</span>
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
        if (!ev) return `<div class="untis-hero-card current" id="untis-current-card">
            <div class="untis-hero-tag">Jetzt</div>
            <div class="untis-hero-subject" style="opacity:0.35">Keine Stunde</div>
            <div class="untis-hero-time" style="opacity:0.2">—</div>
        </div>`;
        const rem = Math.max(0, Math.ceil((ev.end - now) / 60000));
        return `<div class="untis-hero-card current" id="untis-current-card">
            <div class="untis-pulse-ring"></div>
            <div class="untis-hero-tag">Jetzt</div>
            <div class="untis-hero-subject" title="${esc(ev.title)}">${esc(ev.title)}</div>
            <div class="untis-hero-time">${_fmt(ev.start)} – ${_fmt(ev.end)}</div>
            ${ev.location ? `<div class="untis-hero-room">📍 ${esc(ev.location)}</div>` : ''}
            <div class="untis-hero-countdown">${rem}min</div>
        </div>`;
    }

    function _nextCard(ev, now) {
        if (!ev) return `<div class="untis-hero-card next" id="untis-next-card">
            <div class="untis-hero-tag">Nächste</div>
            <div class="untis-hero-subject" style="opacity:0.35">Keine weiteren</div>
            <div class="untis-hero-time" style="opacity:0.2">—</div>
        </div>`;
        const inMin = Math.max(0, Math.ceil((ev.start - now) / 60000));
        return `<div class="untis-hero-card next" id="untis-next-card">
            <div class="untis-hero-tag">in ${inMin} Min</div>
            <div class="untis-hero-subject" title="${esc(ev.title)}">${esc(ev.title)}</div>
            <div class="untis-hero-time">${_fmt(ev.start)} – ${_fmt(ev.end)}</div>
            ${ev.location ? `<div class="untis-hero-room">📍 ${esc(ev.location)}</div>` : ''}
        </div>`;
    }

    function _timelineItem(ev, now) {
        const isCurrent = now >= ev.start && now < ev.end;
        const isPast    = ev.end < now;
        const color     = _subjectColor(ev.title);
        return `
        <div class="untis-timeline-item">
            <div class="untis-timeline-time-col">
                <span class="untis-timeline-time">${_fmt(ev.start)}</span>
                <div class="untis-timeline-bar" style="${isCurrent ? 'background:rgba(168,85,247,0.3)' : ''}"></div>
            </div>
            <div class="untis-timeline-card ${isCurrent ? 'current' : isPast ? 'past' : ''}"
                 style="${isCurrent ? '' : `border-left:2px solid ${color.border}`}">
                <div class="untis-timeline-subject" style="${isCurrent ? '' : `color:${color.text}`}">${esc(ev.title)}</div>
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
                    <div class="untis-day-date">${day.getDate()}.${String(day.getMonth()+1).padStart(2,'0')}</div>
                </div>
                ${evs.length ? evs.map(e => _lessonChip(e)).join('') : '<div class="untis-day-empty">—</div>'}
            </div>`;
        });
        return `<div class="untis-week-grid">${cols.join('')}</div>`;
    }

    function _lessonChip(ev) {
        const c = _subjectColor(ev.title);
        return `<div class="untis-lesson-chip" style="background:${c.bg};border:1px solid ${c.border};color:${c.text};"
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
        el.textContent = `Aktualisiert ${now.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`;
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
        if (!url) throw new Error('Kein Stundenplan konfiguriert');
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
                throw new Error('WebUntis verweigert Zugriff — iCal-Export möglicherweise deaktiviert');
            throw new Error(msg);
        }

        const text = await resp.text();
        if (!text.includes('BEGIN:VCALENDAR'))
            throw new Error('Kein iCal-Feed erhalten. Tipp: "Öffentlichen Link" aus dem Stundenplan kopieren.');

        const events = _parseIcal(text);
        if (!events.length) throw new Error('Keine Termine gefunden — der Stundenplan ist eventuell leer');
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
    function svgCal(s)      { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#d8b4fe"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`; }
    function svgLink(s)     { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`; }
    function svgRefresh(s)  { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`; }
    function svgCheck(s)    { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
    function svgX(s)        { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; }
    function svgArrow()     { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`; }
    function svgArrowLeft() { return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`; }
    function svgClose(s)    { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; }
    function svgSettings(s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`; }
    function svgWifi(s)     { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`; }
    function svgExternal(s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`; }

})();
