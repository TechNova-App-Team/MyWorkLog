// ═══ UNTIS MODULE ═══

(function () {
    const ICAL_KEY      = 'untis_ical_url';
    const CACHE_KEY     = 'untis_cache';
    const CACHE_TTL_MS  = 30 * 60 * 1000; // 30 min
    const PROXY_URL     = 'https://untis-proxy.myworklog.workers.dev';

    const SUBJECT_COLORS = [
        { bg: 'rgba(168,85,247,0.2)',  border: 'rgba(168,85,247,0.45)',  text: '#d8b4fe' },
        { bg: 'rgba(34,211,238,0.15)', border: 'rgba(34,211,238,0.4)',   text: '#67e8f9' },
        { bg: 'rgba(251,146,60,0.15)', border: 'rgba(251,146,60,0.4)',   text: '#fdba74' },
        { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)',   text: '#86efac' },
        { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)',   text: '#fde68a' },
        { bg: 'rgba(244,114,182,0.15)',border: 'rgba(244,114,182,0.4)',  text: '#f9a8d4' },
        { bg: 'rgba(129,140,248,0.15)',border: 'rgba(129,140,248,0.4)',  text: '#a5b4fc' },
        { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)',   text: '#6ee7b7' },
    ];

    const DAYS_DE   = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const DAYS_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    let _modal        = null;
    let _countdownInt = null;
    let _refreshInt   = null;
    let _cachedEvents = null;
    let _testSuccess  = false;

    // ── Public entry point ──────────────────────────────────────────────
    window.showUntisImportModal = function () {
        const saved = localStorage.getItem(ICAL_KEY);
        if (saved) {
            _openDashboard();
        } else {
            _openSetup(1);
        }
    };

    // ── Cleanup ─────────────────────────────────────────────────────────
    function _closeAll() {
        if (_modal) { _modal.remove(); _modal = null; }
        if (_countdownInt) { clearInterval(_countdownInt); _countdownInt = null; }
        if (_refreshInt)   { clearInterval(_refreshInt);   _refreshInt   = null; }
        _cachedEvents = null;
        _testSuccess  = false;
    }

    // ── Setup Wizard ────────────────────────────────────────────────────
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
                <div style="position:relative;z-index:1;">
                    <div id="untis-step-content"></div>
                </div>
            </div>`;
        document.body.appendChild(_modal);
        _renderStep(step);
    }

    function _renderStep(step) {
        const el = document.getElementById('untis-step-content');
        if (!el) return;
        const steps = { 1: _step1, 2: _step2, 3: _step3 };
        el.innerHTML = (steps[step] || _step1)();
        el.querySelector('.untis-step-inner').style.opacity = '0';
        requestAnimationFrame(() => {
            el.querySelector('.untis-step-inner').style.opacity = '';
        });
        window._untisGotoStep = _openSetup;
    }

    function _progressHTML(active) {
        return `
            <div class="untis-progress">
                ${[1,2,3].map(i => `
                    <div class="untis-progress-dot ${i < active ? 'done' : i === active ? 'active' : ''}">
                        ${i < active ? svgCheck(12) : i}
                    </div>
                    ${i < 3 ? '<div class="untis-progress-line"></div>' : ''}
                `).join('')}
            </div>`;
    }

    function _step1() {
        return `
        <div class="untis-step-inner">
            ${_progressHTML(1)}
            <div style="text-align:center;margin-bottom:1.5rem;">
                <div style="width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,rgba(168,85,247,0.3),rgba(147,51,234,0.2));border:1px solid rgba(168,85,247,0.4);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
                    ${svgCal(28)}
                </div>
                <h2 class="untis-title">Untis Stundenplan</h2>
                <p class="untis-subtitle">Verbinde deinen WebUntis-Stundenplan<br>direkt mit MyWorkLog — kostenlos &amp; live.</p>
            </div>
            <div class="untis-features">
                <div class="untis-feature">
                    <div class="untis-feature-icon" style="background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.25);">${svgLink(16)}</div>
                    <span class="untis-feature-text"><strong style="color:#d8b4fe">Kein Login nötig</strong> — nur dein persönlicher iCal-Link</span>
                </div>
                <div class="untis-feature">
                    <div class="untis-feature-icon" style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.2);">${svgRefresh(16)}</div>
                    <span class="untis-feature-text"><strong style="color:#67e8f9">Automatische Aktualisierung</strong> alle 30 Minuten</span>
                </div>
                <div class="untis-feature">
                    <div class="untis-feature-icon" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.2);">${svgCheck(16)}</div>
                    <span class="untis-feature-text"><strong style="color:#86efac">Alle Schulen</strong> die WebUntis nutzen</span>
                </div>
            </div>
            <div class="untis-btn-row">
                <button class="untis-btn untis-btn-ghost" onclick="_untisClose()">Schließen</button>
                <button class="untis-btn untis-btn-primary" onclick="_untisGotoStep(2)" style="flex:1">
                    Jetzt einrichten ${svgArrow()}
                </button>
            </div>
        </div>`;
    }

    function _step2() {
        return `
        <div class="untis-step-inner">
            ${_progressHTML(2)}
            <h2 class="untis-title" style="margin-bottom:0.3rem;">Link holen — 3 Schritte</h2>
            <p class="untis-subtitle">So findest du deinen öffentlichen WebUntis-Link:</p>
            <div class="untis-instructions">
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">1</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">WebUntis im Browser öffnen</div>
                        <div class="untis-instruction-desc">Gehe auf die WebUntis-Seite deiner Schule (z.B. <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.73rem">bs-an.webuntis.com</code>) und logge dich ein.</div>
                        <a class="untis-instruction-action" href="https://webuntis.com" target="_blank" rel="noopener">
                            ${svgExternal(12)} webuntis.com öffnen
                        </a>
                    </div>
                </div>
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">2</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">Auf "Mein Stundenplan" klicken</div>
                        <div class="untis-instruction-desc">In der linken Navigation auf <strong style="color:rgba(255,255,255,0.75)">Stundenplan</strong> klicken. Oben erscheint dann der Tab <strong style="color:rgba(255,255,255,0.75)">"Mein Stundenplan"</strong>.</div>
                    </div>
                </div>
                <div class="untis-instruction-item">
                    <div class="untis-instruction-num">3</div>
                    <div class="untis-instruction-body">
                        <div class="untis-instruction-label">"Öffentlichen Link kopieren" klicken</div>
                        <div class="untis-instruction-desc">Rechts oben im Stundenplan gibt es ein <strong style="color:rgba(255,255,255,0.75)">Teilen-Icon</strong> (Kette/Link-Symbol). Klicke darauf → <strong style="color:rgba(255,255,255,0.75)">"Öffentlichen Link kopieren"</strong>. Den kopierten Link direkt im nächsten Schritt einfügen — wir wandeln ihn automatisch um.</div>
                    </div>
                </div>
            </div>
            <div class="untis-note info" style="margin-bottom:1rem;">
                <span style="color:#67e8f9;flex-shrink:0">⚡</span>
                <span>Du bekommst einen langen <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.73rem">webuntis.com/WebUntis?...</code> Link? Kein Problem — wir erkennen ihn automatisch.</span>
            </div>
            <div class="untis-btn-row">
                <button class="untis-btn untis-btn-ghost" onclick="_untisGotoStep(1)">${svgArrowLeft()} Zurück</button>
                <button class="untis-btn untis-btn-primary" onclick="_untisGotoStep(3)" style="flex:1">
                    Link habe ich ${svgArrow()}
                </button>
            </div>
        </div>`;
    }

    function _step3() {
        return `
        <div class="untis-step-inner">
            ${_progressHTML(3)}
            <h2 class="untis-title" style="margin-bottom:0.3rem;">Link einfügen</h2>
            <p class="untis-subtitle">Paste deinen WebUntis iCal-Link hier:</p>
            <div class="untis-url-wrapper" style="margin-bottom:0.5rem;">
                <input
                    id="untis-url-input"
                    class="untis-url-input"
                    type="url"
                    placeholder="https://xxx.webuntis.com/WebUntis?school=…"
                    oninput="_untisOnUrlInput(this)"
                    onpaste="setTimeout(()=>_untisOnUrlInput(this),50)"
                    autocomplete="off"
                    spellcheck="false"
                />
            </div>
            <div id="untis-url-hint" style="display:none;font-size:0.78rem;padding:0.4rem 0.6rem;margin-bottom:0.5rem;background:rgba(34,211,238,0.07);border:1px solid rgba(34,211,238,0.18);border-radius:8px;"></div>
            <div class="untis-note info" style="margin-bottom:0.75rem;">
                <span style="color:#67e8f9;flex-shrink:0">💡</span>
                <span>Kopiere einfach den <strong style="color:rgba(255,255,255,0.7)">"Öffentlichen Link"</strong> aus WebUntis → Stundenplan — wir erkennen ihn automatisch.</span>
            </div>
            <div id="untis-test-status" class="untis-test-status"></div>
            <button id="untis-test-btn" class="untis-btn untis-btn-test" onclick="_untisTest()" disabled>
                ${svgWifi(16)} Verbindung testen
            </button>
            <div class="untis-btn-row">
                <button class="untis-btn untis-btn-ghost" onclick="_untisGotoStep(2)">${svgArrowLeft()} Zurück</button>
                <button id="untis-connect-btn" class="untis-btn untis-btn-primary" onclick="_untisSaveAndOpen()" disabled style="flex:1">
                    Verbinden &amp; öffnen ${svgArrow()}
                </button>
            </div>
        </div>`;
    }

    // ── URL Normalizer — converts WebUntis web-app URLs to iCal URLs ────
    function _normalizeUntisUrl(raw) {
        const url = raw.trim().replace(/^webcal:\/\//i, 'https://');

        // Already looks like an iCal feed
        if (url.includes('/WebUntis/ical') || url.includes('/ical')) return url;

        // WebUntis public timetable URL:
        // https://bs-an.webuntis.com/WebUntis?school=bs-an#/basic/timetablePublic/my-student?date=…&entityId=34037
        try {
            const u = new URL(url);
            if (!u.hostname.endsWith('webuntis.com')) return url;

            const school = u.searchParams.get('school') || u.hostname.split('.')[0];
            const hash   = u.hash || '';                         // #/basic/…?entityId=34037
            const qIdx   = hash.indexOf('?');
            const hashQS = qIdx >= 0 ? hash.slice(qIdx + 1) : '';
            const hp     = new URLSearchParams(hashQS);
            const entityId = hp.get('entityId');

            if (entityId) {
                // elementType=5 = Student
                return `https://${u.hostname}/WebUntis/ical?school=${encodeURIComponent(school)}&elementType=5&elementId=${encodeURIComponent(entityId)}`;
            }
        } catch {}

        return url;
    }

    // ── Input handler ────────────────────────────────────────────────────
    window._untisOnUrlInput = function (el) {
        const val = el.value.trim();
        const valid = val.length > 20 && val.includes('webuntis.com');
        const testBtn = document.getElementById('untis-test-btn');
        const connectBtn = document.getElementById('untis-connect-btn');
        if (testBtn) testBtn.disabled = !valid;
        if (connectBtn) connectBtn.disabled = true;
        _testSuccess = false;
        const st = document.getElementById('untis-test-status');
        if (st) { st.className = 'untis-test-status'; st.innerHTML = ''; }

        // Live hint: detect wrong (web-app) URL and auto-convert preview
        const hint = document.getElementById('untis-url-hint');
        if (hint && val.includes('webuntis.com')) {
            const converted = _normalizeUntisUrl(val);
            if (converted !== val && converted.includes('/ical')) {
                hint.innerHTML = `<span style="color:#67e8f9">⚡ Automatisch erkannt — wird konvertiert zu iCal-URL</span>`;
                hint.style.display = 'block';
            } else if (converted.includes('/ical')) {
                hint.innerHTML = '';
                hint.style.display = 'none';
            } else {
                hint.innerHTML = '';
                hint.style.display = 'none';
            }
        }
    };

    // ── Test connection ──────────────────────────────────────────────────
    window._untisTest = async function () {
        const input = document.getElementById('untis-url-input');
        const statusEl = document.getElementById('untis-test-status');
        const testBtn = document.getElementById('untis-test-btn');
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
            const count = result.length;
            statusEl.className = 'untis-test-status success';
            statusEl.innerHTML = `${svgCheck(16)} Verbunden! ${count} Stunden gefunden.`;
            _testSuccess = true;
            if (connectBtn) connectBtn.disabled = false;
            _cachedEvents = result;
        } catch (err) {
            statusEl.className = 'untis-test-status error';
            statusEl.innerHTML = `${svgX(16)} Fehler: ${esc(String(err.message || err))}`;
        }

        testBtn.disabled = false;
        testBtn.innerHTML = `${svgWifi(16)} Verbindung testen`;
    };

    // ── Save + open dashboard ────────────────────────────────────────────
    window._untisSaveAndOpen = function () {
        const input = document.getElementById('untis-url-input');
        if (!input || !_testSuccess) return;
        // Store the normalized (iCal) URL, not the raw web-app URL
        const url = _normalizeUntisUrl(input.value.trim());
        localStorage.setItem(ICAL_KEY, url);
        if (_cachedEvents) _saveCache(_cachedEvents);
        _openDashboard();
    };

    window._untisClose = _closeAll;

    // ── Dashboard ────────────────────────────────────────────────────────
    function _openDashboard() {
        _closeAll();
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
                            <div class="untis-db-name">Stundenplan</div>
                            <div class="untis-db-meta" id="untis-last-updated">Wird geladen…</div>
                        </div>
                    </div>
                    <div class="untis-db-actions">
                        <button class="untis-icon-btn" title="Aktualisieren" id="untis-refresh-btn" onclick="_untisRefresh()">${svgRefresh(16)}</button>
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
            localStorage.removeItem(CACHE_KEY);
            _openSetup(3);
        };

        _dashboardLoad();

        // Auto-refresh every 30 min
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
                    <div>Fehler beim Laden: ${esc(String(err.message || err))}</div>
                    <button class="untis-btn untis-btn-secondary" style="margin-top:1rem;" onclick="_untisRefresh()">
                        Erneut versuchen
                    </button>
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

        const todayEvents = events
            .filter(e => _dateStr(e.start) === today)
            .sort((a, b) => a.start - b.start);

        const weekEvents = _getWeekEvents(events, now);

        const current  = todayEvents.find(e => now >= e.start && now < e.end) || null;
        const upcoming = todayEvents.find(e => e.start > now) || null;

        // Countdown interval
        if (_countdownInt) clearInterval(_countdownInt);

        let html = '';

        // ── Today Hero ──
        html += `<div>
            <div class="untis-section-header">
                <span class="untis-section-label">Heute — ${DAYS_FULL[now.getDay()]}, ${now.toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}</span>
                <div class="untis-section-line"></div>
            </div>
            <div class="untis-today-hero">
                ${_currentCard(current, now)}
                ${_nextCard(upcoming, now)}
            </div>
        </div>`;

        // ── Today Timeline ──
        if (todayEvents.length) {
            html += `<div>
                <div class="untis-section-header">
                    <span class="untis-section-label">Tagesplan</span>
                    <div class="untis-section-line"></div>
                </div>
                <div class="untis-timeline">
                    ${todayEvents.map(e => _timelineItem(e, now)).join('')}
                </div>
            </div>`;
        }

        // ── Week Grid ──
        html += `<div>
            <div class="untis-section-header">
                <span class="untis-section-label">Diese Woche</span>
                <div class="untis-section-line"></div>
            </div>
            ${_weekGrid(weekEvents, now)}
        </div>`;

        body.innerHTML = html;
        _updateLastUpdated();

        // Live countdown
        if (current || upcoming) {
            _countdownInt = setInterval(() => {
                const n = new Date();
                const c = todayEvents.find(e => n >= e.start && n < e.end) || null;
                const u = todayEvents.find(e => e.start > n) || null;
                const curEl  = document.getElementById('untis-current-card');
                const nextEl = document.getElementById('untis-next-card');
                if (curEl)  curEl.outerHTML  = _currentCard(c, n);
                if (nextEl) nextEl.outerHTML  = _nextCard(u, n);
            }, 30000);
        }
    }

    function _currentCard(ev, now) {
        if (!ev) {
            return `<div class="untis-hero-card current" id="untis-current-card">
                <div class="untis-hero-tag">Jetzt</div>
                <div class="untis-hero-subject" style="opacity:0.4">Keine Stunde</div>
                <div class="untis-hero-time" style="opacity:0.3">—</div>
            </div>`;
        }
        const remaining = Math.max(0, Math.ceil((ev.end - now) / 60000));
        return `<div class="untis-hero-card current" id="untis-current-card">
            <div class="untis-pulse-ring"></div>
            <div class="untis-hero-tag">Jetzt</div>
            <div class="untis-hero-subject" title="${esc(ev.title)}">${esc(ev.title)}</div>
            <div class="untis-hero-time">${_fmt(ev.start)} – ${_fmt(ev.end)}</div>
            ${ev.location ? `<div class="untis-hero-room">📍 ${esc(ev.location)}</div>` : ''}
            <div class="untis-hero-countdown">${remaining}min</div>
        </div>`;
    }

    function _nextCard(ev, now) {
        if (!ev) {
            return `<div class="untis-hero-card next" id="untis-next-card">
                <div class="untis-hero-tag">Nächste</div>
                <div class="untis-hero-subject" style="opacity:0.4">Keine weiteren</div>
                <div class="untis-hero-time" style="opacity:0.3">—</div>
            </div>`;
        }
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
        const cls       = isCurrent ? 'current' : isPast ? 'past' : '';
        const color     = _subjectColor(ev.title);
        return `
            <div class="untis-timeline-item">
                <div class="untis-timeline-time-col">
                    <span class="untis-timeline-time">${_fmt(ev.start)}</span>
                    <div class="untis-timeline-bar" style="${isCurrent ? 'background:rgba(168,85,247,0.3)' : ''}"></div>
                </div>
                <div class="untis-timeline-card ${cls}" style="${isCurrent ? '' : `border-left:2px solid ${color.border}`}">
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
            const ds    = _dateStr(day);
            const isToday = ds === todayStr;
            const evs   = (weekEvents[ds] || []).sort((a,b) => a.start - b.start);
            return `
                <div class="untis-day-col">
                    <div class="untis-day-header ${isToday ? 'today' : ''}">
                        <div class="untis-day-name">${DAYS_DE[day.getDay()]}</div>
                        <div class="untis-day-date">${day.getDate()}.${String(day.getMonth()+1).padStart(2,'0')}</div>
                    </div>
                    ${evs.length
                        ? evs.map(e => _lessonChip(e)).join('')
                        : `<div class="untis-day-empty">—</div>`
                    }
                </div>`;
        });
        return `<div class="untis-week-grid">${cols.join('')}</div>`;
    }

    function _lessonChip(ev) {
        const c = _subjectColor(ev.title);
        return `
            <div class="untis-lesson-chip" style="background:${c.bg};border:1px solid ${c.border};color:${c.text};" title="${esc(ev.title)} · ${_fmt(ev.start)}–${_fmt(ev.end)}${ev.location ? ' · ' + esc(ev.location) : ''}">
                <span class="untis-lesson-name">${esc(ev.title)}</span>
                <span class="untis-lesson-t">${_fmt(ev.start)}</span>
            </div>`;
    }

    function _dashboardSkeleton() {
        return `
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <div class="untis-skeleton" style="height:20px;width:40%;border-radius:6px;"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                    <div class="untis-skeleton" style="height:110px;border-radius:16px;"></div>
                    <div class="untis-skeleton" style="height:110px;border-radius:16px;"></div>
                </div>
                <div class="untis-skeleton" style="height:20px;width:30%;border-radius:6px;"></div>
                ${[1,2,3].map(()=>`<div class="untis-skeleton" style="height:52px;border-radius:12px;"></div>`).join('')}
                <div class="untis-skeleton" style="height:20px;width:35%;border-radius:6px;"></div>
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

    // ── Data fetching ────────────────────────────────────────────────────
    async function _getEvents() {
        const cached = _loadCache();
        if (cached) { _cachedEvents = cached; return cached; }
        const url = localStorage.getItem(ICAL_KEY);
        if (!url) throw new Error('Kein iCal-Link gespeichert');
        const events = await _fetchAndParse(url);
        _saveCache(events);
        _cachedEvents = events;
        return events;
    }

    async function _fetchAndParse(icalUrl) {
        const normalized = _normalizeUntisUrl(icalUrl);
        const fetchUrl = `${PROXY_URL}?url=${encodeURIComponent(normalized)}`;
        const resp = await fetch(fetchUrl, { cache: 'no-store' });
        if (!resp.ok) {
            const body = await resp.text().catch(() => '');
            let msg = `HTTP ${resp.status}`;
            try { const j = JSON.parse(body); msg = j.error || msg; } catch {}
            if (resp.status === 401 || resp.status === 403) {
                throw new Error('WebUntis verweigert Zugriff — iCal-Export ist an deiner Schule möglicherweise deaktiviert (HTTP ' + resp.status + ')');
            }
            throw new Error(msg);
        }
        const text = await resp.text();
        if (!text.includes('BEGIN:VCALENDAR')) {
            throw new Error('Kein Stundenplan-Feed erhalten. Tipp: Kopiere den "Öffentlichen Link" aus deinem WebUntis-Stundenplan.');
        }
        const events = _parseIcal(text);
        if (!events.length) throw new Error('Keine Termine gefunden — der Stundenplan ist möglicherweise leer oder liegt in der Vergangenheit');
        return events;
    }

    // ── iCal Parser ──────────────────────────────────────────────────────
    function _parseIcal(raw) {
        const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = [];
        for (const line of text.split('\n')) {
            if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
                lines[lines.length - 1] += line.slice(1);
            } else {
                lines.push(line);
            }
        }

        const events = [];
        let cur = null;
        for (const line of lines) {
            if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
            if (line === 'END:VEVENT')   { if (cur) { events.push(cur); cur = null; } continue; }
            if (!cur) continue;
            const ci = line.indexOf(':');
            if (ci < 0) continue;
            const rawKey = line.slice(0, ci);
            const val    = line.slice(ci + 1).replace(/\\n/g, ' ').replace(/\\,/g, ',').trim();
            const key    = rawKey.split(';')[0].toUpperCase();
            cur[key] = val;
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
                uid:          e['UID']          || '',
            };
        }).filter(Boolean);
    }

    function _parseDate(str) {
        if (!str) return null;
        // DATE-TIME: 20240115T080000 or 20240115T080000Z
        const m = str.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
        if (m) {
            if (m[7]) {
                return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]));
            }
            return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +m[6]);
        }
        // DATE only: 20240115
        const d = str.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (d) return new Date(+d[1], +d[2]-1, +d[3]);
        return null;
    }

    // ── Cache ────────────────────────────────────────────────────────────
    function _saveCache(events) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                ts: Date.now(),
                events: events.map(e => ({
                    ...e,
                    start: e.start.getTime(),
                    end:   e.end.getTime(),
                })),
            }));
        } catch {}
    }

    function _loadCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const { ts, events } = JSON.parse(raw);
            if (Date.now() - ts > CACHE_TTL_MS) return null;
            return events.map(e => ({
                ...e,
                start: new Date(e.start),
                end:   new Date(e.end),
            }));
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
        const diff = (dow === 0 ? -6 : 1 - dow);
        day.setDate(day.getDate() + diff);
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
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
    }

    function esc(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ── SVG Icons ────────────────────────────────────────────────────────
    function svgCal(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#d8b4fe"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><rect x="8" y="14" width="3" height="3" rx="0.5" fill="currentColor" stroke="none"/></svg>`;
    }
    function svgLink(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
    }
    function svgRefresh(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`;
    }
    function svgCheck(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    function svgX(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    }
    function svgArrow() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
    }
    function svgArrowLeft() {
        return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
    }
    function svgClose(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    }
    function svgSettings(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`;
    }
    function svgWifi(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;
    }
    function svgExternal(s) {
        return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
    }

})();
