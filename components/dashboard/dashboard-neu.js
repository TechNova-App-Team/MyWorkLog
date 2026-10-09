// ═══ DASHBOARD-NEU MODULE ═══
// Fuellt das neue Dashboard (#dn) aus `data`, liest nur und schreibt nie in die
// Eintraege. Gerufen von updateUI() (dashboard-ui.js, letzte Zeile) und vom
// Sekundentakt, solange die Stempeluhr laeuft.
// Die bewaehrten Teile bleiben, wo ihre Logik sie erwartet: das Formular samt
// Stempeluhr liegt in #dnDrawer, Kennzahlen, Diagramme und #dashboardContainer
// in #dnSheet. Beide haengt dnBoot() an den <body> (Stapelkontext von .main).

const DN = { wkOff: 0, sel: null, calY: null, calM: null, calDay: null, quickAll: false, booted: false, intro: false, lastKey: '', tick: 0 };
const DN_RM = window.matchMedia('(prefers-reduced-motion: reduce)');

const DN_ICON = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    calcheck: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    chevdown: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
    bolt: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    square: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',
    nfc: '<path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    settings: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'
};
function dnSvg(n) { return '<svg class="dn-i" viewBox="0 0 24 24" aria-hidden="true">' + (DN_ICON[n] || '') + '</svg>'; }
function dnFillIcons(root) {
    root.querySelectorAll('svg[data-dn-i]').forEach(function (s) {
        s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
        s.classList.add('dn-i'); s.innerHTML = DN_ICON[s.getAttribute('data-dn-i')] || '';
    });
}

// ── Sprache und Zahlen ──
function dnEN() { return document.documentElement.lang === 'en'; }
function dnT(de, en) { return dnEN() ? en : de; }
function dnLoc() { return (typeof mwlLocale === 'function') ? mwlLocale() : (dnEN() ? 'en-GB' : 'de-DE'); }
function dnNum(h, d) { return new Intl.NumberFormat(dnLoc(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(h); }
function dnSigned(h, d) { const s = h > 0.004 ? '+' : (h < -0.004 ? '−' : '±'); return s + dnNum(Math.abs(h), d == null ? 2 : d); }
function dnEsc(s) { return (typeof esc === 'function') ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
function dn$(id) { return document.getElementById(id); }

// ── Datum ──
function dnISO(d) { return (typeof toLocalISODate === 'function') ? toLocalISODate(d) : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dnParse(s) { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function dnMonday(off) { const n = new Date(); n.setHours(0, 0, 0, 0); n.setDate(n.getDate() - ((n.getDay() + 6) % 7) + off * 7); return n; }
function dnAdd(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function dnKW(d) { return (typeof getWeek === 'function') ? getWeek(d) : 0; }

// ── Rechnen ──
function dnSoll(date) {
    const wd = date.getDay();
    try {
        if (typeof hasMultipleJobs === 'function' && hasMultipleJobs() && typeof getJobs === 'function' && typeof getJobHours === 'function') {
            return getJobs().reduce(function (a, j) { return a + (parseFloat(getJobHours(j.id, wd)) || 0); }, 0);
        }
    } catch (e) { /* faellt auf das Legacy-Feld zurueck */ }
    return parseFloat(((data.settings || {}).hours || [])[wd]) || 0;
}
// Korrektur zaehlt nur in den Saldo, Schule als voller Arbeitstag (wie updateUI).
function dnEntryH(e) {
    if (!e || e.type === 'korrektur') return 0;
    if (e.type === 'school') return parseFloat(e.expected || e.worked) || 0;
    return parseFloat(e.worked) || 0;
}
function dnCat(type) {
    if (type === 'school') return 'school';
    if (type === 'vacation' || type === 'sick' || type === 'holiday' || type === 'gleittag') return 'other';
    return 'work';
}
function dnTypeLabel(t) { return (typeof getTypeLabel === 'function') ? getTypeLabel(t) : t; }
function dnTypeRgb(t) { return (typeof getTypeRgb === 'function') ? getTypeRgb(t) : '148,163,184'; }
function dnByDate() {
    const m = {};
    (data.entries || []).forEach(function (e) { if (e && e.date) (m[e.date] = m[e.date] || []).push(e); });
    return m;
}
function dnTimerState() {
    if (typeof timer === 'undefined' || !timer) return 'off';
    if (timer.running) return 'run';
    return (Array.isArray(timer.log) && timer.log.length) ? 'pause' : 'off';
}
function dnTimerH() {
    if (dnTimerState() === 'off') return 0;
    let ms = timer.paused || 0;
    if (timer.running && timer.start) ms += Date.now() - timer.start;
    ms -= (timer.breakTime || 0);
    return Math.max(0, ms) / 3.6e6;
}
// Woerter, die in einem Wochentitel nichts sagen, bleiben draussen.
function dnNote(e) {
    if (typeof activityUserNote === 'function') { try { return activityUserNote(e) || ''; } catch (x) { /* weiter */ } }
    const s = String(e.info || '').split('|'); return s.length > 1 ? s.slice(1).join('|').trim() : '';
}
function dnDayLabel(list) {
    if (!list.length) return '';
    const proj = list.map(function (e) { return e.project; }).filter(Boolean);
    if (proj.length) return proj[0];
    const nonWork = list.find(function (e) { return dnCat(e.type) !== 'work'; });
    if (nonWork) return dnTypeLabel(nonWork.type);
    const note = list.map(dnNote).filter(Boolean)[0];
    return note || dnTypeLabel(list[0].type);
}

// ── Kleine Bauteile ──
function dnRing(el, frac, opts) {
    opts = opts || {};
    const size = opts.size || 100, sw = opts.sw || 8, r = (size - sw) / 2 - (opts.pad || 0), c = 2 * Math.PI * r;
    if (!el.querySelector('svg')) {
        el.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
            '<circle class="trk" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw + '"/>' +
            '<circle class="arc" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw + '" stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '"/>' +
            (opts.head ? '<circle class="glow" r="' + (sw * .9) + '"/><circle class="headdot" r="' + (sw * .42) + '" fill="var(--bg-deep)"/>' : '') + '</svg>');
    }
    const f = Math.max(0, Math.min(1, frac || 0));
    el.querySelector('.arc').setAttribute('stroke-dashoffset', String(c * (1 - f)));
    if (opts.head) {
        // Kopf mitfuehren: Kreis ist um -90 Grad gedreht, also ab 3 Uhr gerechnet.
        const a = f * 2 * Math.PI, x = size / 2 + r * Math.cos(a), y = size / 2 + r * Math.sin(a);
        ['.glow', '.headdot'].forEach(function (s) { const n = el.querySelector(s); n.setAttribute('cx', x); n.setAttribute('cy', y); n.style.display = f > 0.005 ? '' : 'none'; });
    }
}
// Zahlen zaehlen zur neuen Stelle hoch statt zu springen.
const dnShown = {};
function dnCount(el, key, to, fmt, ms) {
    if (!el) return;
    const from = (key in dnShown) ? dnShown[key] : 0; dnShown[key] = to;
    if (DN_RM.matches || Math.abs(from - to) < 1e-6 || document.hidden) { el.innerHTML = fmt(to); return; }
    const t0 = performance.now(), D = ms || 900;
    const step = function (t) { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4); el.innerHTML = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
}
function dnAnim(el, frames, opts) { if (!el || DN_RM.matches || !el.animate) return null; try { return el.animate(frames, opts); } catch (e) { return null; } }

// ════════════════ BOOT ════════════════
function dnBoot() {
    if (DN.booted || !dn$('dn')) return;
    DN.booted = true;
    dnFillIcons(dn$('dn'));
    // An den <body>, direkt vor den ersten Dialog: dort liegen sie ueber .main,
    // aber unter jedem Dialog, den man aus ihnen heraus oeffnet.
    const anker = document.querySelector('body > .modal');
    ['dnDrawer', 'dnSheet'].forEach(function (id) { const el = dn$(id); if (el) document.body.insertBefore(el, anker || null); });
    document.addEventListener('click', dnClick);
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || document.querySelector('.modal.active')) return;
        if (dn$('dnDrawer') && !dn$('dnDrawer').hidden) dnCloseEntry();
        else if (dn$('dnSheet') && !dn$('dnSheet').hidden) dnCloseSheet();
    });
    dnDrawerDrag();
    dnWrapHandleEntry();
    new ResizeObserver(function () { if (DN.lastKey) dnRenderWeek(false); }).observe(dn$('dnTl'));
    setInterval(dnTick, 1000);
}

// Nach einem erfolgreichen Speichern geht die Schublade zu. Erkannt am frischen
// Zeitstempel, den handleEntry() an jeden neuen oder geaenderten Eintrag schreibt.
function dnWrapHandleEntry() {
    if (typeof handleEntry !== 'function' || handleEntry.__dn) return;
    const orig = handleEntry;
    const wrapped = function () {
        const t0 = Date.now() - 5;
        const r = orig.apply(this, arguments);
        Promise.resolve(r).then(function () {
            setTimeout(function () {
                const neu = (data.entries || []).some(function (e) { return (e.timestamp || 0) >= t0; });
                if (neu && dn$('dnDrawer') && !dn$('dnDrawer').hidden) dnCloseEntry();
            }, 60);
        });
        return r;
    };
    wrapped.__dn = true;
    window.handleEntry = wrapped;
}

// ════════════════ RENDER ════════════════
function dnRender() {
    if (!dn$('dn')) return;
    if (!DN.booted) dnBoot();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!DN.sel) DN.sel = dnISO(today);
    if (DN.calY == null) { DN.calY = today.getFullYear(); DN.calM = today.getMonth(); }
    dnSetInk();
    const by = dnByDate();
    dnRenderTop();
    dnRenderHero(by, today);
    dnRenderWeek(true, by);
    dnRenderToday(by, today);
    dnRenderRecent(by);
    dnRenderCal(by, false);
    if (DN.calDay) dnRenderDay(DN.calDay, by, false);
    dnRenderQuick();
    dnRenderStatus(by, today);
    if (!DN.intro) { DN.intro = true; dnIntro(); }
}

// Schrift auf dem Akzent: hell oder dunkel, je nachdem was mehr Kontrast hat.
function dnSetInk() {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').split(',').map(function (x) { return parseFloat(x) / 255; });
    if (rgb.length < 3 || rgb.some(isNaN)) return;
    const lin = rgb.map(function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    const ink = ((L + 0.05) / 0.05) > (1.05 / (L + 0.05)) ? 'rgba(7, 9, 14, .92)' : '#fff';
    const v = dn$('view-dashboard'); if (v) v.style.setProperty('--dn-on-primary', ink);
    ['dnDrawer', 'dnSheet'].forEach(function (id) { const el = dn$(id); if (el) el.style.setProperty('--dn-on-primary', ink); });
}

function dnRenderTop() {
    const now = new Date();
    dn$('dnDate').textContent = now.toLocaleDateString(dnLoc(), { weekday: 'short', day: 'numeric', month: 'long' }).replace(/\.,/, ',');
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    dn$('dnTheme').innerHTML = dnSvg(light ? 'moon' : 'sun');
    dn$('dnSearchLbl').textContent = dnT('Suchen …', 'Search …');
    let unread = 0;
    try { if (typeof alertsHistory !== 'undefined' && Array.isArray(alertsHistory)) unread = alertsHistory.filter(function (a) { return !a.isRead; }).length; } catch (e) { /* ohne Meldungen */ }
    dn$('dnBell').hidden = !unread;
    // Wetter nur, wenn es Daten gibt — ein leerer Platzhalter waere eine Behauptung.
    const w = dn$('dnWeather');
    try {
        if (typeof weatherData !== 'undefined' && weatherData && weatherData.current && typeof getWeatherIcon === 'function') {
            const h = now.getHours(), ic = getWeatherIcon(weatherData.current.weather_code, h < 6 || h >= 21);
            const city = (data.settings.weather && (data.settings.weather.city || data.settings.weather.name)) || '';
            w.innerHTML = ((typeof mwlIconFromEmoji === 'function') ? mwlIconFromEmoji(ic.icon, 20) : '') + '<b>' + Math.round(weatherData.current.temperature_2m) + '°</b>' + (city ? '<small>' + dnEsc(city) + '</small>' : '');
            w.hidden = false;
        } else w.hidden = true;
    } catch (e) { w.hidden = true; }
}

const DN_QUOTES = [
    ['Kleine Einträge heute, große Fortschritte morgen.', 'Small entries today, big progress tomorrow.'],
    ['Fortschritt entsteht durch Kontinuität, nicht durch Perfektion.', 'Progress comes from consistency, not perfection.'],
    ['Disziplin heute, mehr Möglichkeiten morgen.', 'Discipline today, more options tomorrow.'],
    ['Ein Tag nach dem anderen.', 'One day at a time.'],
    ['Was du heute festhältst, musst du morgen nicht suchen.', 'What you note today, you won’t have to look for tomorrow.'],
    ['Konstanz bringt mehr als Motivation.', 'Consistency beats motivation.'],
    ['Gut erfasst ist halb erklärt.', 'Well recorded is half explained.']
];
function dnRenderHero(by, today) {
    const h = new Date().getHours();
    const greet = h < 6 ? dnT('Gute Nacht', 'Good night') : h < 11 ? dnT('Guten Morgen', 'Good morning') : h < 17 ? dnT('Guten Tag', 'Good afternoon') : h < 22 ? dnT('Guten Abend', 'Good evening') : dnT('Gute Nacht', 'Good night');
    const name = (typeof mwlAnzeigeName === 'function') ? mwlAnzeigeName() : '';
    if (name) {
        dn$('dnGreet').textContent = greet + ',';
        dn$('dnName').innerHTML = dnEsc(name) + '<span class="dn-dotmark">.</span>';
    } else {
        dn$('dnGreet').textContent = dnT('Willkommen zurück,', 'Welcome back,');
        dn$('dnName').innerHTML = dnEsc(greet) + '<span class="dn-dotmark">.</span>';
    }
    const doy = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 864e5);
    const q = DN_QUOTES[doy % DN_QUOTES.length];
    dn$('dnQuote').textContent = dnT('„' + q[0] + '“', '“' + q[1] + '”');

    // Wochenkarte: Ist gegen Soll der laufenden Woche (echter Nenner).
    const mo = dnMonday(0); let ist = 0, soll = 0;
    for (let i = 0; i < 7; i++) { const d = dnAdd(mo, i), k = dnISO(d); soll += dnSoll(d); (by[k] || []).forEach(function (e) { ist += dnEntryH(e); }); }
    ist += dnTimerH();
    const fr = dnAdd(mo, 4);
    dn$('dnKwTitle').textContent = dnT('Woche ', 'Week ') + dnKW(mo);
    dn$('dnKwRange').textContent = mo.toLocaleDateString(dnLoc(), { day: '2-digit', month: 'short' }).replace('.', '') + ' – ' + fr.toLocaleDateString(dnLoc(), { day: '2-digit', month: 'short' }).replace('.', '');
    const kr = dn$('dnKwRing'), pct = soll > 0 ? ist / soll : 0;
    dnRing(kr, pct, { size: 74, sw: 6 });
    if (!kr.querySelector('b')) kr.insertAdjacentHTML('beforeend', '<b></b>');
    dnCount(kr.querySelector('b'), 'kw', Math.round(pct * 100), function (v) { return Math.round(v) + ' %'; });
    kr.title = dnNum(ist, 1) + ' / ' + dnNum(soll, 1) + ' h';

    // Gleitzeit: Summe aller diff wie updateUI, dazu die Prognose aus #valProjected.
    let total = 0; (data.entries || []).forEach(function (e) { total += parseFloat(e.diff) || 0; });
    dn$('dnFlexLbl').textContent = dnT('Gleitzeit', 'Flexitime');
    dnCount(dn$('dnFlexVal'), 'flex', total, function (v) { return dnSigned(v) + ' h'; });
    const proj = dn$('valProjected'), projL = dn$('valProjectedLabel');
    const vs = data.settings.vacation || {}, vLeft = Math.max(0, (parseFloat(vs.total) || 0) + (parseFloat(vs.carriedOver) || 0) - (parseFloat(vs.used) || 0));
    const vMode = (typeof getVacationMode === 'function') ? getVacationMode() : 'days';
    const vTxt = dnNum(Math.round(vLeft * 10) / 10, vLeft % 1 ? 1 : 0) + (vMode === 'hours' ? ' h' : dnT(' Tage', ' days')) + dnT(' Urlaub', ' leave');
    dn$('dnFlexMeta').textContent = (proj && projL ? projL.textContent.replace(/:$/, '') + ' ' + proj.textContent + ' · ' : '') + vTxt;
    dnSpark(by, today);
}
// Saldo-Verlauf der letzten 30 Tage als Kurve ohne Achse (nur Richtung).
function dnSpark(by, today) {
    const host = dn$('dnSpark');
    let run = 0; const start = dnAdd(today, -29);
    (data.entries || []).forEach(function (e) { if (dnParse(e.date) < start) run += parseFloat(e.diff) || 0; });
    const pts = [];
    for (let i = 0; i < 30; i++) { const k = dnISO(dnAdd(start, i)); (by[k] || []).forEach(function (e) { run += parseFloat(e.diff) || 0; }); pts.push(run); }
    const lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), sp = (hi - lo) || 1;
    const d = pts.map(function (v, i) { return (i ? 'L' : 'M') + (i / 29 * 120).toFixed(1) + ' ' + (28 - (v - lo) / sp * 24).toFixed(1); }).join(' ');
    host.innerHTML = '<svg viewBox="0 0 120 32" preserveAspectRatio="none"><defs><linearGradient id="dnSpG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".28"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + d + ' L120 32 L0 32 Z" fill="url(#dnSpG)"/><path d="' + d + '" fill="none" stroke="var(--primary)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>';
}

// ── Deine Woche ──
// Vor dem allerersten Eintrag fehlt nichts: wer heute anfaengt, hat die Woche
// davor nicht verpasst. Solche Tage sind "offen", nicht rot.
function dnFirstDate() { let f = null; (data.entries || []).forEach(function (e) { if (e.date && (!f || e.date < f)) f = e.date; }); return f; }
function dnWeekDays(by) {
    const mo = dnMonday(DN.wkOff), todayK = dnISO(new Date()), out = [], first = dnFirstDate();
    for (let i = 0; i < 7; i++) {
        const d = dnAdd(mo, i), k = dnISO(d), list = by[k] || [], soll = dnSoll(d);
        let h = list.reduce(function (a, e) { return a + dnEntryH(e); }, 0);
        if (k === todayK) h += dnTimerH();
        // Wochenende nur, wenn dort gearbeitet wird oder ein Soll steht.
        if (i >= 5 && !list.length && !soll) continue;
        const isToday = k === todayK, past = k < todayK;
        let s;
        if (h > 0.004) s = (soll > 0 && h < soll - 0.05) ? 'part' : 'done';
        else if (!soll) s = 'free';
        else s = past ? ((first && k > first) ? 'miss' : 'open') : 'future';
        if (list.some(function (e) { return dnCat(e.type) === 'other'; })) s = 'done';
        out.push({ d: d, k: k, list: list, soll: soll, h: h, s: s, isToday: isToday, label: dnDayLabel(list) });
    }
    return out;
}
function dnRenderWeek(full, by) {
    by = by || dnByDate();
    const days = dnWeekDays(by), tl = dn$('dnTl');
    // Ohne Auswahl: heute, sonst der letzte Tag mit Eintrag, sonst der erste.
    if (!days.some(function (x) { return x.k === DN.sel; })) DN.sel = (days.find(function (x) { return x.isToday; }) || days.filter(function (x) { return x.list.length; }).pop() || days[0]).k;
    const key = days.map(function (x) { return x.k + x.s + x.h.toFixed(2); }).join('|');
    // Die Flaeche fuellt das Panel (es ist so hoch wie "Heute"): Kurve oben, Karten unten.
    const W = tl.clientWidth || 600, H = Math.max(210, tl.clientHeight || 210), n = days.length, col = W / n;
    // Kurve hoechstens 150 px; Kurve und Karten stehen zusammen mittig in der Flaeche.
    const curveH = Math.min(150, H - 92), top0 = Math.max(0, Math.round((H - (curveH + 14 + 66)) / 2));
    const mid = 22 + (curveH - 22) * 0.5, amp = (curveH - 22) * 0.42;
    dn$('dnWeekSub').textContent = DN.wkOff === 0 ? dnT('Ein Eintrag pro Tag. Schritt für Schritt.', 'One entry a day. Step by step.')
        : dnT('KW ', 'Week ') + dnKW(days[0].d) + ', ' + days[0].d.toLocaleDateString(dnLoc(), { day: '2-digit', month: '2-digit' }) + ' – ' + days[n - 1].d.toLocaleDateString(dnLoc(), { day: '2-digit', month: '2-digit' });
    dn$('dnWeekOpen').textContent = dnT('Woche öffnen', 'Open week');
    document.querySelector('[data-dn="wk-next"]').disabled = DN.wkOff >= 4;

    // Linke Tagesleiste
    const dl = dn$('dnDays');
    dl.innerHTML = '<span class="dn-day-pill" id="dnDayPill"></span>' + days.map(function (x) {
        return '<button type="button" class="dn-day" role="tab" data-dn-day="' + x.k + '" aria-selected="' + (x.k === DN.sel) + '">' +
            x.d.toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', '') + '<small>' + x.d.toLocaleDateString(dnLoc(), { day: '2-digit', month: '2-digit' }) + '</small>' + (x.list.length ? '<i></i>' : '') + '</button>';
    }).join('');
    dnMovePill(true);

    // Kurve: Hoehe je Tag aus den Stunden (mehr Stunden = hoeher), Zukunft auf der Grundlinie.
    // Hoehe = Abweichung vom Soll des Tages: ueber der Mitte mehr, darunter weniger.
    // Fehlende Tage liegen unten, geplante und freie auf der Mitte.
    const pts = days.map(function (x, i) {
        let rel = 0;
        if (x.s === 'miss') rel = -1;
        else if (x.s === 'done' || x.s === 'part') rel = x.soll > 0 ? (x.h - x.soll) / Math.max(0.75, x.soll * 0.15) : 0.4;
        return { x: col * (i + 0.5), y: mid - Math.max(-1, Math.min(1, rel)) * amp };
    });
    const path = function (p) {
        if (!p.length) return '';
        let d = 'M' + p[0].x.toFixed(1) + ' ' + p[0].y.toFixed(1);
        for (let i = 0; i < p.length - 1; i++) {
            const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
            d += ' C' + (b.x + (c.x - a.x) / 6).toFixed(1) + ' ' + (b.y + (c.y - a.y) / 6).toFixed(1) + ' ' + (c.x - (e.x - b.x) / 6).toFixed(1) + ' ' + (c.y - (e.y - b.y) / 6).toFixed(1) + ' ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1);
        }
        return d;
    };
    const ext = [{ x: -10, y: pts[0].y }].concat(pts, [{ x: W + 10, y: pts[pts.length - 1].y }]);
    let lastDone = -1; days.forEach(function (x, i) { if (x.s === 'done' || x.s === 'part' || x.isToday) lastDone = i; });
    const solid = lastDone >= 0 ? path([{ x: -10, y: pts[0].y }].concat(pts.slice(0, lastDone + 1))) : '';

    const dim = Math.round(W) + 'x' + Math.round(H);
    const rebuild = full || tl.dataset.key !== key || tl.dataset.w !== dim;
    if (rebuild) {
        tl.dataset.key = key; tl.dataset.w = dim;
        let html = '<div class="dn-tl__track" style="top:' + top0 + 'px"><svg class="dn-tl__svg" style="height:' + curveH + 'px" viewBox="0 0 ' + W + ' ' + curveH + '" preserveAspectRatio="none" aria-hidden="true"><path class="dn-tl__base" d="' + path(ext) + '"/>' +
            (solid ? '<path class="dn-tl__done" id="dnTlDone" d="' + solid + '"/>' : '') + '</svg>';
        days.forEach(function (x, i) {
            const lab = x.isToday ? dnT('Heute', 'Today') : '';
            if (lab) html += '<span class="dn-node__lbl" style="left:' + pts[i].x + 'px;top:' + (pts[i].y - 26) + 'px">' + lab + '</span>';
            html += '<button type="button" class="dn-node' + (x.isToday ? ' is-today' : '') + '" data-s="' + x.s + '" data-dn-day="' + x.k + '" style="left:' + pts[i].x + 'px;top:' + pts[i].y + 'px" aria-label="' + dnEsc(x.d.toLocaleDateString(dnLoc(), { weekday: 'long', day: 'numeric', month: 'long' })) + '">' + (x.s === 'done' ? dnSvg('check') : '') + '</button>';
        });
        html += '<div class="dn-dcards" style="top:' + (curveH + 14) + 'px;grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + days.map(function (x) {
            let t, sub;
            if (x.s === 'future') { t = dnT('Geplant', 'Planned'); sub = dnT('Soll ', 'Target ') + dnNum(x.soll, 1) + ' h'; }
            else if (x.s === 'open') { t = dnT('Offen', 'Open'); sub = dnT('eintragen', 'add'); }
            else if (x.s === 'miss') { t = dnT('Fehlt', 'Missing'); sub = dnT('nachtragen', 'add now'); }
            else if (x.s === 'free') { t = dnT('Frei', 'Off'); sub = '–'; }
            else { t = x.label || dnT('Arbeit', 'Work'); sub = dnNum(x.h, 1) + ' h'; }
            const ic = (x.s === 'future' || x.s === 'open') ? 'clock' : x.s === 'miss' ? 'alert' : 'file';
            return '<button type="button" class="dn-dcard' + (x.k === DN.sel ? ' is-sel' : '') + '" data-s="' + x.s + '" data-dn-day="' + x.k + '">' +
                '<span class="dn-dcard__ic">' + dnSvg(ic) + '</span><span class="dn-dcard__t"><b>' + dnEsc(t) + '</b><small>' + sub + '</small></span></button>';
        }).join('') + '</div></div>';
        const old = tl.firstElementChild;
        tl.innerHTML = html;
        if (old && DN._wkDir) {
            const dir = DN._wkDir; DN._wkDir = 0;
            dnAnim(tl.firstElementChild, [{ transform: 'translateX(' + (dir * 36) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.23,1,.32,1)' });
            dnDrawLine(500);
        }
    } else {
        tl.querySelectorAll('.dn-dcard').forEach(function (b) { b.classList.toggle('is-sel', b.getAttribute('data-dn-day') === DN.sel); });
    }
    DN.lastKey = key;
    dnRenderGoal(days);
}
function dnDrawLine(ms) {
    const p = dn$('dnTlDone'); if (!p || DN_RM.matches) return;
    const L = p.getTotalLength();
    dnAnim(p, [{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: ms || 1200, easing: 'cubic-bezier(.77,0,.175,1)' });
}
function dnMovePill(instant) {
    const pill = dn$('dnDayPill'), b = document.querySelector('.dn-day[aria-selected="true"]');
    if (!pill || !b) return;
    if (instant && DN._pillY != null && !DN_RM.matches) {
        pill.style.transition = 'none'; pill.style.transform = 'translateY(' + DN._pillY + 'px)'; pill.style.height = b.offsetHeight + 'px'; void pill.offsetWidth; pill.style.transition = '';
    }
    pill.style.height = b.offsetHeight + 'px';
    pill.style.transform = 'translateY(' + b.offsetTop + 'px)';
    DN._pillY = b.offsetTop;
}
function dnRenderGoal(days) {
    const x = days.find(function (y) { return y.k === DN.sel; }); if (!x) return;
    const isT = x.isToday;
    dn$('dnGoalLbl').textContent = isT ? dnT('Tagesziel', 'Daily goal') : x.d.toLocaleDateString(dnLoc(), { weekday: 'long' });
    const f = x.soll > 0 ? Math.min(1, x.h / x.soll) : (x.h > 0 ? 1 : 0);
    dn$('dnGoalFill').style.transform = 'scaleX(' + f + ')';
    dn$('dnGoalVal').textContent = x.soll > 0 ? dnNum(x.h, 1) + ' / ' + dnNum(x.soll, 1) + ' h' : (x.h > 0 ? dnNum(x.h, 1) + ' h' : dnT('frei', 'off'));
}
function dnSelectDay(k) {
    DN.sel = k;
    document.querySelectorAll('.dn-day').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-dn-day') === k)); });
    dnMovePill(false);
    dnRenderWeek(false);
}

// ── Heute ──
function dnRenderToday(by, today) {
    const k = dnISO(today), list = by[k] || [], soll = dnSoll(today), ts = dnTimerState(), live = dnTimerH();
    const sum = { work: 0, school: 0, other: 0 };
    list.forEach(function (e) { sum[dnCat(e.type)] += dnEntryH(e); });
    sum.work += live;
    const h = sum.work + sum.school + sum.other;
    dn$('dnTodayTitle').textContent = dnT('Heute', 'Today');
    dn$('dnTodayDate').textContent = today.toLocaleDateString(dnLoc(), { weekday: 'long', day: 'numeric', month: 'long' });
    const ring = dn$('dnTodayRing');
    dnRing(ring, soll > 0 ? h / soll : (h > 0 ? 1 : 0), { size: 200, sw: 12, head: true, pad: 6 });
    if (!ring.querySelector('.dn-ring__c')) ring.insertAdjacentHTML('beforeend', '<div class="dn-ring__c"><b id="dnTodayVal"></b><small id="dnTodayOf"></small></div>');
    const fmt = function (v) { return dnNum(v, 1) + '<small>h</small>'; };
    if (ts === 'run') { dn$('dnTodayVal').innerHTML = fmt(h); dnShown.today = h; } else dnCount(dn$('dnTodayVal'), 'today', h, fmt);
    dn$('dnTodayOf').textContent = soll > 0 ? dnT('von ', 'of ') + dnNum(soll, 1) + ' h' : dnT('kein Soll heute', 'no target today');
    dn$('dnToday').classList.toggle('is-running', ts === 'run');
    const lv = dn$('dnLive'); lv.hidden = ts === 'off'; lv.textContent = ts === 'run' ? dnT('läuft', 'running') : dnT('Pause', 'paused');
    const rows = [['work', dnT('Arbeit', 'Work'), 'var(--primary)'], ['school', dnT('Schule', 'School'), 'var(--school)'], ['other', dnT('Sonstiges', 'Other'), 'var(--text-muted)']];
    dn$('dnTodayLegend').innerHTML = rows.map(function (r) { return '<li><i style="background:' + r[2] + '"></i><span>' + r[1] + '</span><b>' + dnNum(sum[r[0]], 1) + ' h</b></li>'; }).join('');
    // Stempeluhr: dieselben drei Befehle wie im Formular (timerAction).
    const tm = dn$('dnTimer'), tkey = ts;
    if (tm.dataset.k !== tkey) {
        tm.dataset.k = tkey;
        tm.innerHTML =
            (ts === 'run' ? '<button type="button" class="dn-ibtn" data-dn="t-pause" aria-label="' + dnT('Pause', 'Pause') + '" title="' + dnT('Pause', 'Pause') + '">' + dnSvg('pause') + '</button>'
                : '<button type="button" class="dn-ibtn is-go" data-dn="t-start" aria-label="' + dnT('Einstempeln', 'Clock in') + '" title="' + dnT('Einstempeln', 'Clock in') + '">' + dnSvg('play') + '</button>') +
            '<button type="button" class="dn-ibtn" data-dn="t-stop" aria-label="' + dnT('Ausstempeln und buchen', 'Clock out and book') + '" title="' + dnT('Ausstempeln und buchen', 'Clock out and book') + '"' + (ts === 'off' ? ' disabled' : '') + '>' + dnSvg('square') + '</button>';
    }
    dnTimerText(ts, live);
    dn$('dnCtaLbl').textContent = dnT('Eintrag schreiben', 'Write entry');
}
function dnTimerText(ts, live) {
    // Laufende Zeit steht im Chip neben den Knoepfen; aus = kein Chip.
    const el = dn$('dnLive'); if (!el || ts === 'off') return;
    const s = Math.round(live * 3600), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    el.textContent = hh + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + (ts === 'run' ? '' : ' · ' + dnT('Pause', 'paused'));
}
// Sekundentakt: nur wenn die Uhr laeuft und das Dashboard sichtbar ist.
function dnTick() {
    if (!DN.booted || document.hidden) return;
    const v = dn$('view-dashboard'); if (!v || !v.classList.contains('active')) return;
    const ts = dnTimerState();
    if (ts === 'off' && DN._lastTs === 'off') return;
    const changed = ts !== DN._lastTs; DN._lastTs = ts;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const by = dnByDate();
    dnRenderToday(by, today);
    DN.tick++;
    if (changed || DN.tick % 30 === 0) { dnRenderWeek(false, by); dnRenderHero(by, today); }
}

// ── Letzte Eintraege (Wochen) ──
function dnRenderRecent(by) {
    const weeks = {};
    (data.entries || []).forEach(function (e) {
        if (!e.date) return;
        const d = dnParse(e.date), mo = dnAdd(d, -((d.getDay() + 6) % 7)), k = dnISO(mo);
        const w = weeks[k] || (weeks[k] = { mo: mo, list: [] }); w.list.push(e);
    });
    const ks = Object.keys(weeks).sort().reverse().slice(0, 4), box = dn$('dnRecent');
    dn$('dnRecentTitle').textContent = dnT('Letzte Einträge', 'Recent entries');
    dn$('dnRecentSub').textContent = dnT('Deine letzten Wochen im Überblick.', 'Your last weeks at a glance.');
    dn$('dnRecentAll').textContent = dnT('Alle anzeigen', 'Show all');
    if (!ks.length) {
        box.innerHTML = '<div class="dn-empty">' + dnT('Noch keine Einträge. Der erste dauert keine Minute.', 'No entries yet. The first one takes less than a minute.') +
            '<button type="button" class="dn-btn dn-btn--solid dn-btn--sm" data-dn="entry">' + dnSvg('plus') + dnT('Ersten Eintrag schreiben', 'Write first entry') + '</button></div>';
        return;
    }
    const thisMo = dnISO(dnMonday(0));
    box.innerHTML = ks.map(function (k) {
        const w = weeks[k], su = dnAdd(w.mo, 6);
        let h = 0, diff = 0; const cnt = {}, cat = { work: 0, school: 0, other: 0 };
        w.list.forEach(function (e) { const x = dnEntryH(e); h += x; diff += parseFloat(e.diff) || 0; cat[dnCat(e.type)] += x; if (e.project) cnt[e.project] = (cnt[e.project] || 0) + x; });
        const top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
        const title = top || (cat.school > cat.work ? dnT('Berufsschule', 'Vocational school') : cat.other > cat.work ? dnT('Abwesenheit', 'Absence') : dnT('Arbeitszeit', 'Working time'));
        const bar = cat.school > cat.work ? 'var(--school)' : cat.other > cat.work ? 'var(--text-muted)' : 'var(--primary)';
        const sg = diff > 0.004 ? 'pos' : diff < -0.004 ? 'neg' : 'zero';
        const off = Math.round((w.mo - dnMonday(0)) / 6048e5);
        const fmtD = function (d) { return d.toLocaleDateString(dnLoc(), { day: '2-digit', month: '2-digit' }); };
        return '<button type="button" class="dn-row" style="--dn-bar:' + bar + '" data-dn="openweek" data-off="' + off + '">' +
            '<span class="dn-row__kw"><b>' + dnKW(w.mo) + '</b><small>' + (k === thisMo ? dnT('diese Woche', 'this week') : w.mo.toLocaleDateString(dnLoc(), { month: 'short', year: '2-digit' }).replace('.', '')) + '</small></span>' +
            '<span class="dn-row__t"><small>' + fmtD(w.mo) + ' – ' + su.toLocaleDateString(dnLoc(), { day: '2-digit', month: '2-digit', year: 'numeric' }) + '</small><b>' + dnEsc(title) + '</b><small>' + dnNum(h, 2) + dnT(' Std. · ', ' h · ') + w.list.length + (w.list.length === 1 ? dnT(' Eintrag', ' entry') : dnT(' Einträge', ' entries')) + '</small></span>' +
            '<span class="dn-pill" data-s="' + sg + '" title="' + dnT('Saldo der Woche', 'Week balance') + '">' + dnSigned(diff, 1) + ' h</span>' + dnSvg('chevron') + '</button>';
    }).join('');
}

// ── Kalender ──
function dnRenderCal(by, animDir) {
    by = by || dnByDate();
    const y = DN.calY, m = DN.calM, first = new Date(y, m, 1), start = dnAdd(first, -((first.getDay() + 6) % 7));
    const todayK = dnISO(new Date());
    dn$('dnCalTitle').textContent = dnT('Kalender', 'Calendar');
    dn$('dnCalMonthLbl').textContent = first.toLocaleDateString(dnLoc(), { month: 'long', year: 'numeric' });
    const wd = dn$('dnCalWd');
    if (!wd.children.length) { for (let i = 0; i < 7; i++) wd.insertAdjacentHTML('beforeend', '<span>' + dnAdd(new Date(2024, 0, 1), i).toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', '').slice(0, 2) + '</span>'); }
    let hol = {};
    try { if (typeof getGermanHolidays === 'function') [y - (m === 0 ? 1 : 0), y, y + (m === 11 ? 1 : 0)].filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(function (yy) { getGermanHolidays(yy).forEach(function (h) { hol[h.date] = h.name; }); }); } catch (e) { hol = {}; }
    let html = '';
    for (let i = 0; i < 42; i++) {
        const d = dnAdd(start, i), k = dnISO(d), list = by[k] || [];
        const cls = ['dn-cd'];
        if (d.getMonth() !== m) cls.push('is-out');
        if (d.getDay() === 0 || d.getDay() === 6) cls.push('is-we');
        if (k === todayK) cls.push('is-today');
        if (k === DN.calDay) cls.push('is-sel');
        let dot = '';
        if (hol[k] || list.some(function (e) { return e.type === 'holiday'; })) dot = 'holiday';
        else if (list.some(function (e) { return e.type === 'vacation'; })) dot = 'vac';
        else if (list.length) dot = 'entry';
        html += '<button type="button" class="' + cls.join(' ') + '" data-dn-cal="' + k + '" aria-label="' + dnEsc(d.toLocaleDateString(dnLoc(), { weekday: 'long', day: 'numeric', month: 'long' }) + (hol[k] ? ', ' + hol[k] : '') + (list.length ? ', ' + list.length + dnT(' Einträge', ' entries') : '')) + '"><span>' + d.getDate() + '</span>' + (dot ? '<i data-k="' + dot + '"></i>' : '') + '</button>';
        if (i === 34 && dnAdd(start, 35).getMonth() !== m) break;   // keine leere sechste Zeile
    }
    const g = dn$('dnCalGrid');
    g.innerHTML = html;
    if (animDir) dnAnim(g, [{ transform: 'translateX(' + (animDir * 28) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' });
    dn$('dnCalLegend').innerHTML = [['var(--success)', dnT('Eintrag vorhanden', 'Entry')], ['var(--primary)', dnT('Heute', 'Today')], ['var(--danger)', dnT('Feiertag', 'Holiday')], ['var(--text-muted)', dnT('Urlaub', 'Leave')]]
        .map(function (l) { return '<span><i style="background:' + l[0] + '"></i>' + l[1] + '</span>'; }).join('');
    DN._hol = hol;
}
// Tag im Kalender = sein Verlauf: alle Eintraege des Tages, Klick bearbeitet.
function dnRenderDay(k, by, animate) {
    by = by || dnByDate();
    const box = dn$('dnCalDay'), d = dnParse(k), list = (by[k] || []).slice().sort(function (a, b) { return String(a.start || '').localeCompare(String(b.start || '')); });
    const soll = dnSoll(d), h = list.reduce(function (a, e) { return a + dnEntryH(e); }, 0), hol = DN._hol && DN._hol[k];
    const rows = list.map(function (e) {
        const span = (e.start && e.end) ? e.start + ' – ' + e.end : (e.breakMins ? '' : '');
        const sub = [span, e.project, dnNote(e)].filter(Boolean).join(' · ');
        const icon = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(e.type, 16) : '';
        return '<button type="button" class="dn-ent" data-dn-edit="' + dnEsc(e.id) + '" style="--dn-rgb:' + dnTypeRgb(e.type) + '"><span class="dn-ent__ic">' + icon + '</span>' +
            '<span class="dn-ent__t"><b>' + dnEsc(dnTypeLabel(e.type)) + '</b><small>' + dnEsc(sub || dnT('ohne Zeitangabe', 'no times')) + '</small></span><span class="dn-ent__h">' + dnNum(dnEntryH(e), 2) + ' h</span></button>';
    }).join('');
    box.innerHTML = '<div class="dn-dayv__head"><button type="button" class="dn-ibtn dn-ibtn--sm" data-dn="cal-back" aria-label="' + dnT('Zurück zum Monat', 'Back to month') + '">' + dnSvg('back') + '</button>' +
        '<div><h3>' + dnEsc(d.toLocaleDateString(dnLoc(), { weekday: 'long', day: 'numeric', month: 'long' })) + '</h3><p>' + (hol ? dnEsc(hol) : (list.length ? list.length + (list.length === 1 ? dnT(' Eintrag', ' entry') : dnT(' Einträge', ' entries')) : dnT('Kein Eintrag', 'No entry'))) + '</p></div></div>' +
        '<div class="dn-dayv__sum"><span>' + dnT('Erfasst', 'Recorded') + '</span><b>' + dnNum(h, 2) + (soll ? ' / ' + dnNum(soll, 1) : '') + ' h</b></div>' +
        '<div class="dn-dayv__list">' + (rows || '<div class="dn-empty">' + dnT('An diesem Tag steht nichts.', 'Nothing recorded on this day.') + '</div>') + '</div>' +
        '<button type="button" class="dn-btn dn-btn--solid" data-dn="entry-day" data-k="' + k + '" style="width:100%;justify-content:center">' + dnSvg('plus') + dnT('Eintrag für diesen Tag', 'Add entry for this day') + '</button>';
    if (animate) dnAnim(box, [{ transform: 'translateX(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.32,.72,0,1)' });
}
function dnOpenDay(k) {
    DN.calDay = k;
    const dt = dnParse(k);
    if (dt.getMonth() !== DN.calM || dt.getFullYear() !== DN.calY) { DN.calY = dt.getFullYear(); DN.calM = dt.getMonth(); }
    dnRenderCal(null, 0);
    const a = dn$('dnCalMonth'), b = dn$('dnCalDay');
    dnRenderDay(k, null, true);
    b.hidden = false;
    const fade = dnAnim(a, [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-30px)', opacity: 0 }], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' });
    a.style.visibility = 'hidden';
    if (fade) fade.onfinish = function () { fade.cancel(); };
}
function dnCloseDay() {
    DN.calDay = null;
    const a = dn$('dnCalMonth'), b = dn$('dnCalDay');
    b.hidden = true; a.style.visibility = '';
    dnRenderCal(null, 0);
    dnAnim(a, [{ transform: 'translateX(-30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.32,.72,0,1)' });
}

// ── Schnellzugriff ──
function dnQuickItems() {
    const en = dnEN();
    const base = [
        ['book', dnT('Neue Woche', 'New week'), dnT('Mit dem Assistenten', 'With the assistant'), 'href:' + (en ? '/en/berichtsheft/' : '/berichtsheft/')],
        ['pencil', dnT('Eintrag schreiben', 'Write entry'), dnT('Direkt loslegen', 'Start right away'), 'entry'],
        ['file', dnT('Vorlage nutzen', 'Use template'), dnT('Ein Klick für heute', 'One click for today'), 'tpl'],
        ['download', dnT('Importieren', 'Import'), dnT('Excel, CSV, andere Apps', 'Excel, CSV, other apps'), 'import']
    ];
    const more = [
        ['scale', dnT('Saldo anpassen', 'Adjust balance'), dnT('Korrektur buchen', 'Book a correction'), 'saldo'],
        ['flag', dnT('Feiertage', 'Public holidays'), dnT('prüfen und eintragen', 'check and book'), 'holidays'],
        ['chart', dnT('Kennzahlen', 'Key figures'), dnT('Saldo, Urlaub, Verlauf', 'Balance, leave, trend'), 'sheet'],
        ['target', dnT('Ziele', 'Goals'), dnT('Fortschritt ansehen', 'See progress'), 'goals'],
        ['nfc', 'NFC', dnT('Stempeln per Tag', 'Clock in with a tag'), 'nfc'],
        ['download', dnT('Backup', 'Backup'), dnT('Daten sichern', 'Save your data'), 'backup'],
        ['globe', en ? 'Deutsch' : 'English', en ? 'Deutsche Fassung' : 'English version', 'href:' + (en ? '/' : '/en/')],
        ['settings', dnT('Einstellungen', 'Settings'), dnT('Zeiten, Urlaub, Theme', 'Hours, leave, theme'), 'settings']
    ];
    return DN.quickAll ? base.concat(more) : base;
}
function dnRenderQuick() {
    dn$('dnQuickTitle').textContent = dnT('Schnellzugriff', 'Quick access');
    dn$('dnQuickAllLbl').textContent = DN.quickAll ? dnT('Weniger', 'Less') : dnT('Alles anzeigen', 'Show all');
    const tg = document.querySelector('[data-dn="quick-all"]'); tg.setAttribute('aria-expanded', String(DN.quickAll));
    tg.querySelector('svg').style.transform = DN.quickAll ? 'rotate(180deg)' : '';
    dn$('dnQuick').innerHTML = dnQuickItems().map(function (q) {
        const isLink = q[3].indexOf('href:') === 0;
        const inner = '<span class="dn-qt__ic">' + dnSvg(q[0]) + '</span><span class="dn-qt__t"><b>' + q[1] + '</b><small>' + q[2] + '</small></span>';
        return isLink ? '<a class="dn-qt" href="' + q[3].slice(5) + '"' + (q[0] === 'globe' ? ' hreflang="' + (dnEN() ? 'de' : 'en') + '" translate="no"' : '') + '>' + inner + '</a>'
            : '<button type="button" class="dn-qt" data-dn="q-' + q[3] + '">' + inner + '</button>';
    }).join('');
}
// Vorlagen: dieselben sechs wie das alte Widget, gebucht ueber applyQuickTemplate().
function dnTemplates() {
    const now = new Date(), dh = (data.settings && data.settings.hours) ? (data.settings.hours[now.getDay()] || 8) : 8;
    return [
        { icon: '💼', label: dnT('Standard Tag', 'Standard day'), sub: dh + dnT('h Arbeit', 'h work'), type: 'work', hours: dh },
        { icon: '📚', label: dnT('Schultag', 'School day'), sub: dh + dnT('h Schule', 'h school'), type: 'school', hours: dh },
        { icon: '🌴', label: dnT('Urlaub', 'Leave'), sub: dh + dnT('h Urlaub', 'h leave'), type: 'vacation', hours: dh },
        { icon: '💊', label: dnT('Krankentag', 'Sick day'), sub: dh + dnT('h Krank', 'h sick'), type: 'sick', hours: dh },
        { icon: '⏰', label: dnT('Halber Tag', 'Half day'), sub: (dh / 2).toFixed(1) + 'h', type: 'work', hours: dh / 2 },
        { icon: '🔄', label: dnT('Überstunden', 'Overtime'), sub: (dh + 2) + dnT('h Arbeit', 'h work'), type: 'work', hours: dh + 2 }
    ];
}
function dnOpenTpl() {
    const t = dnTemplates(), b = dn$('dnTpl'), a = b.previousElementSibling;
    window._quickTemplates = t;
    b.innerHTML = '<div class="dn-dayv__head"><button type="button" class="dn-ibtn dn-ibtn--sm" data-dn="tpl-back" aria-label="' + dnT('Zurück', 'Back') + '">' + dnSvg('back') + '</button><div><h3>' + dnT('Vorlage für heute', 'Template for today') + '</h3><p>' + dnT('Ein Klick bucht den Tag.', 'One click books the day.') + '</p></div></div>' +
        '<div class="dn-tplv__list">' + t.map(function (x, i) {
            return '<button type="button" class="dn-ent" data-dn-tpl="' + i + '" style="--dn-rgb:' + dnTypeRgb(x.type) + '"><span class="dn-ent__ic">' + ((typeof mwlIconFromEmoji === 'function') ? mwlIconFromEmoji(x.icon, 16) : '') + '</span><span class="dn-ent__t"><b>' + x.label + '</b><small>' + x.sub + '</small></span><span></span></button>';
        }).join('') + '</div>';
    b.hidden = false; a.style.visibility = 'hidden';
    dnAnim(b, [{ transform: 'translateX(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.32,.72,0,1)' });
}
function dnCloseTpl() {
    const b = dn$('dnTpl'), a = b.previousElementSibling;
    b.hidden = true; a.style.visibility = '';
    dnAnim(a, [{ transform: 'translateX(-30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.32,.72,0,1)' });
}

// ── Statuszeile: genau eine Aussage, die stimmt ──
function dnRenderStatus(by, today) {
    const box = dn$('dnStatus');
    const entries = data.entries || [];
    let icon = 'bolt', t, s, btn, act;
    const missing = [];
    const mo = dnMonday(0);
    const first = dnFirstDate();
    for (let i = 0; i < 7; i++) { const d = dnAdd(mo, i); if (d >= today) break; if (first && dnISO(d) > first && dnSoll(d) > 0 && !(by[dnISO(d)] || []).length) missing.push(d); }
    let wk = 0; for (let i = 0; i < 7; i++) (by[dnISO(dnAdd(mo, i))] || []).forEach(function (e) { if (e.type !== 'korrektur') wk += parseFloat(e.diff) || 0; });
    if (!entries.length) {
        t = dnT('Leg los.', 'Get started.'); s = dnT('Trag deinen ersten Tag ein, dann füllen sich Woche, Kalender und Saldo von selbst.', 'Add your first day and the week, calendar and balance fill in by themselves.');
        btn = dnT('Ersten Eintrag schreiben', 'Write first entry'); act = 'entry';
    } else if (missing.length) {
        icon = 'alert';
        const names = missing.map(function (d) { return d.toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', ''); }).join(', ');
        t = missing.length === 1 ? dnT('Ein Tag fehlt noch.', 'One day is missing.') : dnT(missing.length + ' Tage fehlen noch.', missing.length + ' days are missing.');
        s = dnT('Diese Woche ohne Eintrag: ', 'No entry this week: ') + names + '.';
        btn = dnT('Nachtragen', 'Add now'); act = 'entry-day:' + dnISO(missing[0]);
    } else if (wk < -0.25) {
        icon = 'clock';
        t = dnT('Alles eingetragen.', 'All recorded.'); s = dnT('Die Woche steht bei ', 'This week stands at ') + dnSigned(wk, 1) + ' h.';
        btn = dnT('Zur Woche', 'Open week'); act = 'weekview';
    } else {
        t = dnT('Du bist im Plan!', 'You’re on track!'); s = dnT('Deine Einträge sind aktuell und vollständig.', 'Your entries are up to date and complete.') + (wk > 0.25 ? dnT(' Woche: ', ' Week: ') + dnSigned(wk, 1) + ' h.' : '');
        btn = dnT('Zu den Zielen', 'Go to goals'); act = 'goals';
    }
    box.innerHTML = '<span class="dn-status__ic">' + dnSvg(icon) + '</span><div class="dn-status__t"><b>' + t + '</b><span>' + s + '</span></div>' +
        '<button type="button" class="dn-btn" data-dn="status" data-act="' + act + '">' + btn + dnSvg('arrow') + '</button>';
}

// ════════════════ BEWEGUNG BEIM LADEN ════════════════
// Ein orchestrierter Moment, einmal je Seitenaufruf. Text bleibt sichtbar;
// Ringe fahren, die Linie zeichnet sich, Knoten und Karten folgen der Linie.
function dnIntro() {
    if (DN_RM.matches) return;
    const v = dn$('view-dashboard'); if (!v || !v.classList.contains('active')) return;
    const ease = 'cubic-bezier(.23,1,.32,1)';
    document.querySelectorAll('#dn .dn-ring .arc').forEach(function (a) {
        const c = parseFloat(a.getAttribute('stroke-dasharray')), to = parseFloat(a.getAttribute('stroke-dashoffset'));
        dnAnim(a, [{ strokeDashoffset: c }, { strokeDashoffset: to }], { duration: 1400, delay: 150, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'backwards' });
    });
    dnDrawLine(1500);
    document.querySelectorAll('#dnTl .dn-node').forEach(function (n, i, all) {
        dnAnim(n, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 250 + i * (1100 / Math.max(1, all.length)), easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
    });
    document.querySelectorAll('#dnTl .dn-dcard').forEach(function (n, i) {
        dnAnim(n, [{ transform: 'translateY(14px)', opacity: 0 }, { transform: n.classList.contains('is-sel') ? 'translateY(-3px)' : 'none', opacity: 1 }], { duration: 620, delay: 380 + i * 90, easing: ease, fill: 'backwards' });
    });
    dnAnim(dn$('dnGoalFill'), [{ transform: 'scaleX(0)' }, { transform: dn$('dnGoalFill').style.transform || 'scaleX(0)' }], { duration: 1200, delay: 700, easing: ease, fill: 'backwards' });
    ['#dnRecent .dn-row', '#dnQuick .dn-qt'].forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (n, i) { dnAnim(n, [{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, delay: 300 + i * 70, easing: ease, fill: 'backwards' }); });
    });
    document.querySelectorAll('#dnCalGrid .dn-cd i').forEach(function (n, i) { dnAnim(n, [{ transform: 'scale(0)' }, { transform: 'none' }], { duration: 400, delay: 500 + i * 22, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }); });
    const sp = document.querySelector('#dnSpark path:last-child');
    if (sp) { const L = sp.getTotalLength ? sp.getTotalLength() : 0; if (L) dnAnim(sp, [{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: 1300, delay: 300, easing: 'cubic-bezier(.77,0,.175,1)' }); }
}

// ════════════════ SCHUBLADE + KENNZAHLEN ════════════════
function dnOpenEntry(dateStr) {
    const d = dn$('dnDrawer'); if (!d) return;
    if (dateStr) {
        const inp = dn$('inpDate');
        if (inp) { inp.value = dateStr; inp.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    d.hidden = false; document.body.classList.add('dn-locked');
    void d.offsetWidth; d.classList.add('is-open');
    setTimeout(function () { const f = dn$('inpDate'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* ohne Fokus */ } }, DN_RM.matches ? 0 : 420);
}
function dnCloseEntry() {
    const d = dn$('dnDrawer'); if (!d || d.hidden) return;
    d.classList.remove('is-open'); d.querySelector('.dn-drawer__panel').style.transform = '';
    document.body.classList.remove('dn-locked');
    setTimeout(function () { if (!d.classList.contains('is-open')) d.hidden = true; }, DN_RM.matches ? 0 : 460);
}
function dnOpenSheet(from) {
    const s = dn$('dnSheet'); if (!s) return;
    const p = s.querySelector('.dn-sheet__panel');
    // Blaeht sich von der Karte auf, die man gedrueckt hat.
    if (from && from.getBoundingClientRect) { const r = from.getBoundingClientRect(), pr = { left: 24, top: 24 }; p.style.transformOrigin = (r.left + r.width / 2 - pr.left) + 'px ' + (r.top + r.height / 2 - pr.top) + 'px'; }
    s.hidden = false; document.body.classList.add('dn-locked');
    void s.offsetWidth; s.classList.add('is-open');
    // Diagramme messen ihre Breite beim Zeichnen — erst jetzt sind sie sichtbar.
    setTimeout(function () { try { if (typeof updateUI === 'function') updateUI(); } catch (e) { console.warn('Kennzahlen', e); } }, 30);
}
function dnCloseSheet() {
    const s = dn$('dnSheet'); if (!s || s.hidden) return;
    s.classList.remove('is-open'); document.body.classList.remove('dn-locked');
    setTimeout(function () { if (!s.classList.contains('is-open')) s.hidden = true; }, DN_RM.matches ? 0 : 420);
}
// Am Handy laesst sich das Blatt am Griff nach unten wegwischen; ein schneller
// Wisch reicht, auch wenn er kurz ist (Geschwindigkeit statt Schwelle).
function dnDrawerDrag() {
    const d = dn$('dnDrawer'); if (!d) return;
    const grip = d.querySelector('.dn-drawer__grip'), p = d.querySelector('.dn-drawer__panel');
    let y0 = 0, t0 = 0, dy = 0, on = false;
    grip.addEventListener('pointerdown', function (e) { on = true; y0 = e.clientY; t0 = performance.now(); dy = 0; grip.setPointerCapture(e.pointerId); d.classList.add('is-drag'); });
    grip.addEventListener('pointermove', function (e) {
        if (!on) return; dy = e.clientY - y0;
        const v = dy < 0 ? -Math.sqrt(-dy) * 2 : dy;           // nach oben: Gummiband
        p.style.transform = 'translateY(' + v + 'px)';
    });
    const end = function () {
        if (!on) return; on = false; d.classList.remove('is-drag');
        const vel = dy / Math.max(1, performance.now() - t0);
        if (dy > 140 || vel > 0.5) dnCloseEntry(); else p.style.transform = '';
    };
    grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
}

// ════════════════ KLICKS ════════════════
function dnClick(e) {
    const t = e.target.closest('[data-dn],[data-dn-day],[data-dn-cal],[data-dn-edit],[data-dn-tpl]');
    if (!t) return;
    if (t.hasAttribute('data-dn-day')) { dnSelectDay(t.getAttribute('data-dn-day')); const x = t.getAttribute('data-s'); if ((x === 'miss' || x === 'open') && t.classList.contains('dn-dcard')) dnOpenEntry(t.getAttribute('data-dn-day')); return; }
    if (t.hasAttribute('data-dn-cal')) { dnOpenDay(t.getAttribute('data-dn-cal')); return; }
    if (t.hasAttribute('data-dn-edit')) {
        const raw = t.getAttribute('data-dn-edit'), id = isNaN(+raw) ? raw : +raw;
        if (typeof openEditModal === 'function') openEditModal(id);
        return;
    }
    if (t.hasAttribute('data-dn-tpl')) { if (typeof applyQuickTemplate === 'function') applyQuickTemplate(+t.getAttribute('data-dn-tpl')); dnCloseTpl(); return; }
    const a = t.getAttribute('data-dn');
    const run = function (fn) { if (typeof window[fn] === 'function') window[fn](); };
    switch (a) {
        case 'palette': run('openCmdPalette'); break;
        case 'theme': {
            const light = document.documentElement.getAttribute('data-theme') === 'light';
            document.documentElement.classList.add('dn-theme-anim');
            if (typeof setThemeMode === 'function') setThemeMode(light ? 'dark' : 'light');
            setTimeout(function () { document.documentElement.classList.remove('dn-theme-anim'); }, 450);
            dnRenderTop(); dnSetInk(); break;
        }
        case 'alerts': run('toggleAlertsPanel'); setTimeout(dnRenderTop, 300); break;
        case 'weather': run('openWeatherModal'); break;
        case 'today': { const k = dnISO(new Date()); DN.wkOff = 0; dnSelectDay(k); dnOpenDay(k); break; }
        case 'sheet': dnOpenSheet(t); break;
        case 'sheet-close': dnCloseSheet(); break;
        case 'drawer-close': dnCloseEntry(); break;
        case 'entry': case 'q-entry': dnOpenEntry(); break;
        case 'entry-day': dnOpenEntry(t.getAttribute('data-k')); break;
        case 'weekview': dnOpenWeek(DN.wkOff); break;
        case 'openweek': dnOpenWeek(+t.getAttribute('data-off') || 0); break;
        case 'history': if (typeof switchTab === 'function') switchTab('history'); break;
        case 'wk-prev': case 'wk-next': DN.wkOff += a === 'wk-prev' ? -1 : 1; DN._wkDir = a === 'wk-prev' ? -1 : 1; DN.sel = null; dnRenderWeek(true); break;
        case 'cal-prev': case 'cal-next': { const dir = a === 'cal-prev' ? -1 : 1; let m = DN.calM + dir, y = DN.calY; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } DN.calM = m; DN.calY = y; dnRenderCal(null, dir); break; }
        case 'cal-back': dnCloseDay(); break;
        case 'quick-all': DN.quickAll = !DN.quickAll; dnRenderQuick(); if (DN.quickAll) document.querySelectorAll('#dnQuick .dn-qt').forEach(function (n, i) { if (i > 3) dnAnim(n, [{ transform: 'translateY(8px) scale(.98)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, delay: (i - 4) * 40, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'backwards' }); }); break;
        case 'q-tpl': dnOpenTpl(); break;
        case 'tpl-back': dnCloseTpl(); break;
        case 'q-import': run('openImportWizard'); break;
        case 'q-saldo': run('openSaldoAdjust'); break;
        case 'q-holidays': run('checkAndBookHolidays'); break;
        case 'q-sheet': dnOpenSheet(t); break;
        case 'q-goals': case 'goals': if (typeof switchTab === 'function') switchTab('goals'); break;
        case 'q-nfc': run('openNFCModal'); break;
        case 'q-backup': run('openRecoveryModal'); break;
        case 'q-settings': run('openSettings'); break;
        case 't-start': if (typeof timerAction === 'function') timerAction('start'); DN._lastTs = null; dnTick(); break;
        case 't-pause': if (typeof timerAction === 'function') timerAction('pause'); DN._lastTs = null; dnTick(); break;
        case 't-stop': if (typeof timerAction === 'function') timerAction('stop'); break;
        case 'status': {
            const act = t.getAttribute('data-act') || '';
            if (act.indexOf('entry-day:') === 0) dnOpenEntry(act.slice(10));
            else if (act === 'entry') dnOpenEntry();
            else if (act === 'weekview') dnOpenWeek(0);
            else if (act === 'goals' && typeof switchTab === 'function') switchTab('goals');
            break;
        }
        default: break;
    }
}
// Wochenansicht ist eine nachgeladene Ansicht (VIEW_SCRIPTS): erst wechseln,
// dann warten, bis ihre Funktionen da sind, dann die Woche setzen.
function dnOpenWeek(off) {
    if (typeof switchTab !== 'function') return;
    switchTab('weekview');
    let n = 0;
    (function warte() {
        if (typeof renderWeekView === 'function') { try { window.wvOffset = off; if (typeof wvOffset !== 'undefined') wvOffset = off; } catch (e) { /* var im fremden Skript */ } renderWeekView(); return; }
        if (n++ < 60) setTimeout(warte, 50);
    })();
}

if (document.readyState !== 'loading') dnBoot(); else document.addEventListener('DOMContentLoaded', dnBoot);
