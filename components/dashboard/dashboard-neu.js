// ═══ DASHBOARD-NEU MODULE ═══
// Fuellt das Dashboard (#dn) aus `data`, liest nur und schreibt nie in die
// Eintraege. Gerufen von updateUI() (dashboard-ui.js, letzte Zeile) und vom
// Sekundentakt, solange die Stempeluhr laeuft. Das Formular samt Stempeluhr
// liegt unveraendert in #dnDrawer; dnBoot() haengt es an den <body>, weil .main
// ein Stapelkontext ist (z-index 1) und die Schublade sonst unter der Sidebar laege.
// Layout (Reihenfolge, Breite, Sichtbarkeit): data.settings.dashLayout.

const DN = { wkOff: 0, sel: null, calY: null, calM: null, calDay: null, range: 30, ana: 'saldo', booted: false, intro: false, lastKey: '', tick: 0, edit: false, menu: null };
const DN_RM = window.matchMedia('(prefers-reduced-motion: reduce)');

// Module mit ihren erlaubten Breiten. s = 4, m = 6, l = 8, f = 12 Spalten.
// Statistik und Arbeitsverteilung waren bis 10.10.2026 eigene Module; sie sind
// jetzt Analysen IN der Woche. Gespeicherte Layouts mit 'stats'/'dist' filtert
// dnLayout() still heraus.
const DN_MODS = {
    week:  { sizes: ['m', 'l', 'f'], de: 'Woche', en: 'Week' },
    today: { sizes: ['s', 'm'], de: 'Heute', en: 'Today' },
    vac:   { sizes: ['s', 'm'], de: 'Urlaub', en: 'Leave' },
    cal:   { sizes: ['m', 'l', 'f'], de: 'Kalender', en: 'Calendar' }
};
const DN_DEFAULT = { order: ['week', 'today', 'vac', 'cal'], hidden: [], size: { week: 'l', today: 's', vac: 's', cal: 'l' } };

// Optionen je Modul (Menue rechts oben am Modul). [Schluessel, DE, EN, Vorgabe].
// Gespeichert in data.settings.dashLayout.opt[modul][schluessel], nur Booleans.
const DN_OPTS = {
    week:  [['we', 'Wochenende immer zeigen', 'Always show weekend', false], ['curve', 'Verlaufskurve', 'Progress curve', true], ['goal', 'Tagesziel-Leiste', 'Daily goal bar', true]],
    today: [['timer', 'Stempeluhr', 'Time clock', true], ['legend', 'Aufteilung nach Art', 'Breakdown by kind', true], ['pct', 'Ring in Prozent', 'Ring as percentage', false]],
    vac:   [['taken', 'Genommene statt freie Tage', 'Show days taken, not left', false], ['bar', 'Balken mit Jahresmarke', 'Bar with year marker', true], ['rows', 'Tempo und nächster Urlaub', 'Pace and next leave', true]],
    cal:   [['hours', 'Stunden je Tag', 'Hours per day', true], ['legend', 'Legende', 'Legend', true]]
};
// Analysen in der Woche. Reihenfolge = Reihenfolge in der Leiste.
const DN_ANA = [
    ['saldo', 'Saldo', 'Balance', 'Verlauf', 'over time'],
    ['dist', 'Verteilung', 'Breakdown', 'nach Art', 'by kind'],
    ['wd', 'Wochentage', 'Weekdays', 'Ø je Tag', 'avg per day'],
    ['facts', 'Kennzahlen', 'Key figures', 'Rhythmus', 'rhythm']
];

const DN_ICON = {
    dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    calcheck: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    sliders: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    square: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    grip: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
    eyeoff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    width: '<path d="M21 12H3"/><path d="m7 8-4 4 4 4"/><path d="m17 8 4 4-4 4"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'
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
// Auf grossen Bildschirmen ist #view-dashboard per CSS-zoom vergroessert.
// getBoundingClientRect liefert dann gezoomte Pixel, style.top/translate innen
// aber ungezoomte — jede Rechnung von Rect nach Stil teilt durch diesen Faktor.
function dnZ(el) { return (el && el.currentCSSZoom) || 1; }

// ── Datum ──
function dnISO(d) { return (typeof toLocalISODate === 'function') ? toLocalISODate(d) : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dnParse(s) { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function dnMonday(off) { const n = new Date(); n.setHours(0, 0, 0, 0); n.setDate(n.getDate() - ((n.getDay() + 6) % 7) + off * 7); return n; }
function dnAdd(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function dnKW(d) { return (typeof getWeek === 'function') ? getWeek(d) : 0; }
function dnToday() { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }

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
// Korrektur zaehlt nur in den Saldo, Schule als voller Arbeitstag (wie frueher updateUI).
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
// Vor dem allerersten Eintrag fehlt nichts: wer heute anfaengt, hat die Woche
// davor nicht verpasst. Solche Tage sind "offen", nicht rot.
function dnFirstDate() { let f = null; (data.entries || []).forEach(function (e) { if (e.date && (!f || e.date < f)) f = e.date; }); return f; }
function dnTotal() { let t = 0; (data.entries || []).forEach(function (e) { t += parseFloat(e.diff) || 0; }); return t; }

// Gleitzeit-Prognose, wie bis v8.2 in updateUI: gewichteter Schnitt (letzte 60 Tage
// doppelt) mal 30 Arbeitstage. Unter 20 Arbeitstagen gibt es keine Zahl, nur den Stand.
const DN_PROG_MIN = 20;
function dnProjection() {
    const work = (data.entries || []).filter(function (e) { return ['work', 'school', 'vacation', 'sick', 'holiday', 'gleittag'].indexOf(e.type) >= 0; });
    if (work.length < DN_PROG_MIN) return { ok: false, n: work.length };
    const cut = dnAdd(dnToday(), -60); let ws = 0, w = 0;
    work.forEach(function (e) { const k = dnParse(e.date) >= cut ? 2 : 1; ws += (parseFloat(e.diff) || 0) * k; w += k; });
    return { ok: true, n: work.length, value: dnTotal() + (w ? ws / w : 0) * 30 };
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
        // Kreis ist um -90 Grad gedreht, also ab 3 Uhr gerechnet.
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
// Segmentschalter mit gleitendem Daumen.
function dnSeg(host, items, cur, act) {
    if (!host.querySelector('button')) {
        host.insertAdjacentHTML('beforeend', items.map(function (it) { return '<button type="button" data-dn="' + act + '" data-v="' + it[0] + '">' + it[1] + '</button>'; }).join(''));
    } else {
        items.forEach(function (it, i) { host.querySelectorAll('button')[i].textContent = it[1]; });
    }
    host.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(cur))); });
    const on = host.querySelector('[aria-pressed="true"]'), th = host.querySelector('.dn-seg__thumb');
    if (on && th) { th.style.width = on.offsetWidth + 'px'; th.style.transform = 'translateX(' + (on.offsetLeft - 3) + 'px)'; }
}

// ════════════════ BOOT ════════════════
function dnBoot() {
    if (DN.booted || !dn$('dn')) return;
    DN.booted = true;
    dnFillIcons(dn$('dn'));
    const anker = document.querySelector('body > .modal'), dr = dn$('dnDrawer');
    if (dr) { document.body.insertBefore(dr, anker || null); dnFillIcons(dr); }
    document.addEventListener('click', dnClick);
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' || document.querySelector('.modal.active')) return;
        if (DN.menu) dnCloseMenu(true);
        else if (dn$('dnDrawer') && !dn$('dnDrawer').hidden) dnCloseEntry();
        else if (DN.edit) dnSetEdit(false);
    });
    dnDrawerDrag();
    dnWrapHandleEntry();
    dnChartPointer();
    new ResizeObserver(function () { if (DN.lastKey && dnView() === 'week') dnRenderWeek(false); }).observe(dn$('dnTl'));
    new ResizeObserver(function () { if (DN._series) dnDrawChart(DN._series.vals, DN._series.lo, DN._series.hi); }).observe(dn$('dnChartSvg'));
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

// ════════════════ LAYOUT ════════════════
function dnLayout() {
    const s = (data.settings && data.settings.dashLayout) || {};
    const order = (Array.isArray(s.order) ? s.order : []).filter(function (id) { return DN_MODS[id]; });
    DN_DEFAULT.order.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });   // neue Module haengen hinten an
    const hidden = (Array.isArray(s.hidden) ? s.hidden : []).filter(function (id) { return DN_MODS[id]; });
    const size = {};
    order.forEach(function (id) { const v = s.size && s.size[id]; size[id] = DN_MODS[id].sizes.indexOf(v) >= 0 ? v : DN_DEFAULT.size[id]; });
    const opt = (s.opt && typeof s.opt === 'object') ? JSON.parse(JSON.stringify(s.opt)) : {};
    return { order: order, hidden: hidden, size: size, opt: opt };
}
function dnSaveLayout(l) {
    data.settings.dashLayout = { v: 1, order: l.order.slice(), hidden: l.hidden.slice(), size: Object.assign({}, l.size), opt: l.opt || {} };
    if (typeof save === 'function') save();
}
function dnOpt(mod, key) {
    const s = (data.settings && data.settings.dashLayout && data.settings.dashLayout.opt) || {};
    if (s[mod] && key in s[mod]) return s[mod][key];
    const def = (DN_OPTS[mod] || []).find(function (o) { return o[0] === key; });
    return def ? def[3] : undefined;
}
function dnSetOpt(mod, key, val) {
    const l = dnLayout();
    (l.opt[mod] = l.opt[mod] || {})[key] = val;
    dnSaveLayout(l);
}
// Ansicht der Wochenkarte ('week' | 'ana'). Bleibt ueber Seitenaufrufe stehen.
function dnView() { return dnOpt('week', 'view') === 'ana' ? 'ana' : 'week'; }
function dnApplyLayout() {
    if (DN._drag) return;
    const l = dnLayout(), grid = dn$('dnGrid');
    // Nur verschieben, was nicht schon an seinem Platz steht: jedes Umhaengen
    // nimmt dem Element darin den Fokus (Menue, Tastatur).
    l.order.forEach(function (id, i) {
        const m = grid.querySelector('[data-dn-mod="' + id + '"]'); if (!m) return;
        if (grid.children[i] !== m) grid.insertBefore(m, grid.children[i] || null);
        m.setAttribute('data-size', l.size[id]);
        m.hidden = l.hidden.indexOf(id) >= 0;
    });
    dnRenderEditUi(l);
}
function dnResetLayout() {
    dnSaveLayout(Object.assign(JSON.parse(JSON.stringify(DN_DEFAULT)), { opt: {} }));
    dnFlip(dnApplyLayout);
    setTimeout(function () { dnRenderWeek(true); }, 450);
}
function dnSetEdit(on) {
    const v = dn$('view-dashboard');
    if (on && v && !v.classList.contains('active') && typeof switchTab === 'function') switchTab('dashboard');
    DN.edit = !!on;
    dn$('dn').classList.toggle('is-edit', DN.edit);
    dn$('dnEditBar').hidden = !DN.edit;
    dn$('dnEditBtn').setAttribute('aria-pressed', String(DN.edit));
    dnRenderEditUi(dnLayout());
    if (DN.edit) {
        dnAnim(dn$('dnEditBar'), [{ transform: 'translateY(-8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.23,1,.32,1)' });
        dn$('dnEditBar').scrollIntoView({ behavior: DN_RM.matches ? 'auto' : 'smooth', block: 'nearest' });
    }
}
// Werkzeugleiste je Modul + Ablage fuer ausgeblendete Module.
function dnRenderEditUi(l) {
    const names = function (id) { return dnT(DN_MODS[id].de, DN_MODS[id].en); };
    const sizeName = { s: dnT('Schmal', 'Narrow'), m: dnT('Halb', 'Half'), l: dnT('Breit', 'Wide'), f: dnT('Voll', 'Full') };
    document.querySelectorAll('#dnGrid .dn-mod').forEach(function (m) {
        const id = m.getAttribute('data-dn-mod');
        let bar = m.querySelector(':scope > .dn-modbar');
        if (!DN.edit) { if (bar) bar.remove(); return; }
        if (!bar) { m.insertAdjacentHTML('afterbegin', '<div class="dn-modbar"></div>'); bar = m.querySelector(':scope > .dn-modbar'); }
        const many = DN_MODS[id].sizes.length > 1;
        bar.innerHTML = '<button type="button" class="dn-modbar__grip" data-dn-grip="' + id + '" aria-label="' + dnEsc(names(id)) + dnT(' verschieben (Pfeiltasten)', ' move (arrow keys)') + '">' + dnSvg('grip') + '<span>' + dnEsc(names(id)) + '</span></button>' +
            (many ? '<button type="button" class="dn-modbar__btn" data-dn="mod-size" data-id="' + id + '" title="' + dnT('Breite', 'Width') + '">' + dnSvg('width') + '<span>' + sizeName[l.size[id]] + '</span></button>' : '') +
            '<button type="button" class="dn-modbar__btn" data-dn="mod-hide" data-id="' + id + '" title="' + dnT('Ausblenden', 'Hide') + '" aria-label="' + dnT('Ausblenden', 'Hide') + '">' + dnSvg('eyeoff') + '</button>';
    });
    dn$('dnEditHint').textContent = dnT('Ziehen zum Umsortieren, Breite und Sichtbarkeit je Modul.', 'Drag to reorder; set width and visibility per module.');
    dn$('dnResetLbl').textContent = dnT('Standard', 'Default');
    dn$('dnDoneLbl').textContent = dnT('Fertig', 'Done');
    dn$('dnTray').innerHTML = l.hidden.map(function (id) { return '<button type="button" class="dn-traychip" data-dn="mod-show" data-id="' + id + '">' + dnSvg('plus') + dnEsc(names(id)) + '</button>'; }).join('');
}
// FLIP: Lage vorher merken, umbauen, dann von der alten Lage gleiten lassen.
function dnFlip(change) {
    const mods = [...document.querySelectorAll('#dnGrid .dn-mod')];
    const r0 = new Map(mods.map(function (m) { return [m, m.hidden ? null : m.getBoundingClientRect()]; }));
    change();
    if (DN_RM.matches) return;
    mods.forEach(function (m) {
        if (m.hidden || m.classList.contains('is-lift')) return;
        const a = r0.get(m), b = m.getBoundingClientRect();
        if (!a) { dnAnim(m, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.23,1,.32,1)' }); return; }
        const z = dnZ(m), dx = (a.left - b.left) / z, dy = (a.top - b.top) / z;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(a.width - b.width) < 1) return;
        dnAnim(m, [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.32,.72,0,1)' });
    });
}
// Ziehen: das Modul hebt sich an, die anderen weichen live aus (FLIP).
function dnDragStart(e, grip) {
    const id = grip.getAttribute('data-dn-grip'), mod = grip.closest('.dn-mod');
    DN._drag = { id: id, mod: mod };
    try { grip.setPointerCapture(e.pointerId); } catch (x) { /* kuenstlicher Zeiger */ }
    mod.classList.add('is-lift');
    let busy = false;
    const move = function (ev) {
        if (busy) return;
        const others = [...document.querySelectorAll('#dnGrid .dn-mod:not([hidden])')].filter(function (m) { return m !== mod; });
        let target = null;
        for (const m of others) { const r = m.getBoundingClientRect(); if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) { target = m; break; } }
        if (!target) return;
        const list = [...dn$('dnGrid').children], from = list.indexOf(mod), to = list.indexOf(target);
        busy = true;
        dnFlip(function () { dn$('dnGrid').insertBefore(mod, from < to ? target.nextElementSibling : target); });
        setTimeout(function () { busy = false; }, 260);   // nicht waehrend der Ausweichbewegung neu einsortieren
    };
    const up = function () {
        grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up);
        mod.classList.remove('is-lift');
        const l = dnLayout();
        l.order = [...document.querySelectorAll('#dnGrid .dn-mod')].map(function (m) { return m.getAttribute('data-dn-mod'); });
        DN._drag = null;
        dnSaveLayout(l);
    };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
}
function dnMoveBy(id, dir) {
    const l = dnLayout(), i = l.order.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= l.order.length) return;
    l.order.splice(j, 0, l.order.splice(i, 1)[0]);
    dnSaveLayout(l);
    dnFlip(dnApplyLayout);
    const g = document.querySelector('[data-dn-grip="' + id + '"]'); if (g) g.focus();
}

// ════════════════ RENDER ════════════════
function dnRender() {
    if (!dn$('dn')) return;
    if (!DN.booted) dnBoot();
    const today = dnToday();
    if (!DN.sel) DN.sel = dnISO(today);
    if (!DN.calDay) DN.calDay = dnISO(today);
    if (DN.calY == null) { DN.calY = today.getFullYear(); DN.calM = today.getMonth(); }
    dnSetInk();
    dnApplyLayout();
    const by = dnByDate();
    dnRenderTop();
    dnRenderHero(by, today);
    dnRenderWeekCard(by, today);
    dnRenderToday(by, today);
    dnRenderVac(today);
    dnRenderCal(by, 0);
    dnRenderDay(DN.calDay, by, false);
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
    const d = dn$('dnDrawer'); if (d) d.style.setProperty('--dn-on-primary', ink);
}

function dnRenderTop() {
    const now = new Date();
    dn$('dnDate').textContent = now.toLocaleDateString(dnLoc(), { weekday: 'short', day: 'numeric', month: 'long' }).replace(/\.,/, ',');
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    dn$('dnTheme').innerHTML = dnSvg(light ? 'moon' : 'sun');
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

    dnRenderKw(by, today);

    const total = dnTotal(), pr = dnProjection();
    dn$('dnFlexLbl').textContent = dnT('Gleitzeit', 'Flexitime');
    dn$('dnSaldoBtn').title = dnT('Saldo anpassen', 'Adjust balance');
    dn$('dnSaldoBtn').setAttribute('aria-label', dnT('Saldo anpassen', 'Adjust balance'));
    dnCount(dn$('dnFlexVal'), 'flex', total, function (v) { return dnSigned(v) + ' h'; });
    dn$('dnFlexMeta').textContent = pr.ok ? dnT('In 6 Wochen ', 'In 6 weeks ') + dnSigned(pr.value, 1) + ' h'
        : dnT('Prognose ab ' + DN_PROG_MIN + ' Tagen (' + pr.n + ' / ' + DN_PROG_MIN + ')', 'Forecast from ' + DN_PROG_MIN + ' days (' + pr.n + ' / ' + DN_PROG_MIN + ')');
    dnSpark(by, today);
}
// Wochen-Anzeige im Kopf: Ist gegen Soll der LAUFENDEN Woche (echter Nenner),
// ein Balken je Tag ab gemeinsamer Grundlinie mit Soll-Marke, darunter der Rest.
// Wochenende nur, wenn dort ein Soll steht oder gearbeitet wurde.
function dnRenderKw(by, today) {
    const mo = dnMonday(0), todayK = dnISO(today), days = [];
    let ist = 0, soll = 0;
    for (let i = 0; i < 7; i++) {
        const d = dnAdd(mo, i), k = dnISO(d), s = dnSoll(d);
        let h = (by[k] || []).reduce(function (a, e) { return a + dnEntryH(e); }, 0);
        if (k === todayK) h += dnTimerH();
        ist += h; soll += s;
        if (i >= 5 && !s && h <= 0.004) continue;
        days.push({ d: d, k: k, h: h, s: s });
    }
    const last = days[days.length - 1].d, fmt = function (d) { return d.toLocaleDateString(dnLoc(), { day: '2-digit', month: 'short' }).replace('.', ''); };
    dn$('dnKwTitle').textContent = dnT('Woche ', 'Week ') + dnKW(mo);
    dn$('dnKwRange').textContent = fmt(mo) + ' – ' + fmt(last);
    dnCount(dn$('dnKwVal'), 'kwIst', ist, function (v) { return '<b>' + dnNum(v, 1) + '</b><span>' + (soll > 0 ? ' / ' + dnNum(soll, 1) : '') + ' h</span>'; });
    const ref = Math.max(1, Math.max.apply(null, days.map(function (x) { return Math.max(x.h, x.s); })));
    const host = dn$('dnKwBars');
    host.innerHTML = days.map(function (x) {
        const cls = 'dn-kwb' + (x.k === todayK ? ' is-today' : '') + (x.k > todayK && x.h <= 0.004 ? ' is-future' : '') + (x.s > 0 && x.h >= x.s - 0.05 ? ' is-met' : '');
        const name = x.d.toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', '');
        const tip = x.d.toLocaleDateString(dnLoc(), { weekday: 'long' }) + ': ' + dnNum(x.h, 1) + (x.s ? ' / ' + dnNum(x.s, 1) : '') + ' h';
        return '<span class="' + cls + '" title="' + dnEsc(tip) + '"><span class="dn-kwb__t"><i style="height:' + (x.h / ref * 100).toFixed(1) + '%"></i>' +
            (x.s ? '<em style="bottom:' + (x.s / ref * 100).toFixed(1) + '%"></em>' : '') + '</span><small>' + dnEsc(name.slice(0, dnEN() ? 3 : 2)) + '</small></span>';   // EN 3 Buchstaben, sonst dreht die Laufzeit-MAP Mo/Fr um (dashboard.md, Falle 5)
    }).join('');
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', days.map(function (x) { return x.d.toLocaleDateString(dnLoc(), { weekday: 'short' }) + ' ' + dnNum(x.h, 1) + ' h'; }).join(', '));
    const pct = soll > 0 ? Math.round(ist / soll * 100) : 0, rest = soll - ist;
    dn$('dnKwMeta').textContent = soll <= 0 ? dnT('Kein Soll in dieser Woche', 'No target this week')
        : rest > 0.05 ? pct + ' %' + dnT(', noch ', ', ') + dnNum(rest, 1) + dnT(' h bis zum Soll', ' h to go')
        : pct + ' %' + dnT(' erreicht, ', ' reached, ') + dnSigned(-rest, 1) + ' h';
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
// Eine Karte, zwei Ansichten: die Woche als Zeitstrahl und Analysen ueber einen
// Zeitraum. Die Leiste links traegt je nach Ansicht Tage oder Analysen.
function dnRenderWeekCard(by, today, animate) {
    by = by || dnByDate(); today = today || dnToday();
    const view = dnView();
    document.querySelector('.dn-week').classList.toggle('is-ana', view === 'ana');
    dn$('dnWeekTitle').textContent = dnT('Deine Woche', 'Your week');
    dn$('dnViewSeg').setAttribute('aria-label', dnT('Ansicht', 'View'));
    dnSeg(dn$('dnViewSeg'), [['week', dnT('Woche', 'Week')], ['ana', dnT('Analysen', 'Insights')]], view, 'view');
    dn$('dnWkNav').hidden = view !== 'week';
    dn$('dnPaneWeek').hidden = view !== 'week';
    dn$('dnPaneAna').hidden = view !== 'ana';
    if (view === 'week') dnRenderWeek(true, by); else dnRenderAna(by, today, animate);
}
function dnWeekDays(by) {
    const mo = dnMonday(DN.wkOff), todayK = dnISO(new Date()), out = [], first = dnFirstDate(), we = dnOpt('week', 'we');
    for (let i = 0; i < 7; i++) {
        const d = dnAdd(mo, i), k = dnISO(d), list = by[k] || [], soll = dnSoll(d);
        let h = list.reduce(function (a, e) { return a + dnEntryH(e); }, 0);
        if (k === todayK) h += dnTimerH();
        // Wochenende nur, wenn dort gearbeitet wird, ein Soll steht oder der Nutzer es so will.
        if (i >= 5 && !list.length && !soll && !we) continue;
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
    const days = dnWeekDays(by), tl = dn$('dnTl'), curve = dnOpt('week', 'curve');
    // Ohne Auswahl: heute, sonst der letzte Tag mit Eintrag, sonst der erste.
    if (!days.some(function (x) { return x.k === DN.sel; })) DN.sel = (days.find(function (x) { return x.isToday; }) || days.filter(function (x) { return x.list.length; }).pop() || days[0]).k;
    const key = days.map(function (x) { return x.k + x.s + x.h.toFixed(2); }).join('|') + (curve ? 'c' : 'f');
    // Die Flaeche fuellt das Modul: Kurve hoechstens 150 px, Kurve und Karten stehen zusammen mittig.
    tl.classList.toggle('is-flat', !curve);
    const W = tl.clientWidth || 600, H = curve ? Math.max(200, tl.clientHeight || 200) : 0, n = days.length, col = W / n;
    const curveH = curve ? Math.min(150, H - 92) : 0, top0 = curve ? Math.max(0, Math.round((H - (curveH + 14 + 66)) / 2)) : 0;
    const mid = 22 + (curveH - 22) * 0.5, amp = (curveH - 22) * 0.42;
    const fmtD = function (d) { return d.toLocaleDateString(dnLoc(), { day: '2-digit', month: '2-digit' }); };
    dn$('dnWeekSub').textContent = DN.wkOff === 0 ? dnT('Diese Woche, KW ', 'This week, week ') + dnKW(days[0].d)
        : dnT('KW ', 'Week ') + dnKW(days[0].d) + ', ' + fmtD(days[0].d) + ' – ' + fmtD(days[n - 1].d);
    document.querySelector('[data-dn="wk-next"]').disabled = DN.wkOff >= 4;
    dn$('dnGoal').hidden = !dnOpt('week', 'goal');

    const dl = dn$('dnDays');
    dl.setAttribute('aria-label', dnT('Tage', 'Days'));
    dl.innerHTML = '<span class="dn-day-pill" id="dnDayPill"></span>' + days.map(function (x) {
        return '<button type="button" class="dn-day" role="tab" data-dn-day="' + x.k + '" aria-selected="' + (x.k === DN.sel) + '">' +
            x.d.toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', '') + '<small>' + fmtD(x.d) + '</small>' + (x.list.length ? '<i></i>' : '') + '</button>';
    }).join('');
    dnMovePill(true);

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
        let html = '<div class="dn-tl__track" style="top:' + top0 + 'px">';
        if (curve) {
            html += '<svg class="dn-tl__svg" style="height:' + curveH + 'px" viewBox="0 0 ' + W + ' ' + curveH + '" preserveAspectRatio="none" aria-hidden="true"><path class="dn-tl__base" d="' + path(ext) + '"/>' +
                (solid ? '<path class="dn-tl__done" id="dnTlDone" d="' + solid + '"/>' : '') + '</svg>';
            days.forEach(function (x, i) {
                if (x.isToday) html += '<span class="dn-node__lbl" style="left:' + pts[i].x + 'px;top:' + (pts[i].y - 26) + 'px">' + dnT('Heute', 'Today') + '</span>';
                html += '<button type="button" class="dn-node' + (x.isToday ? ' is-today' : '') + '" data-s="' + x.s + '" data-dn-day="' + x.k + '" style="left:' + pts[i].x + 'px;top:' + pts[i].y + 'px" aria-label="' + dnEsc(x.d.toLocaleDateString(dnLoc(), { weekday: 'long', day: 'numeric', month: 'long' })) + '">' + (x.s === 'done' ? dnSvg('check') : '') + '</button>';
            });
        }
        html += '<div class="dn-dcards" style="top:' + (curve ? curveH + 14 : 0) + 'px;grid-template-columns:repeat(' + n + ',minmax(0,1fr))">' + days.map(function (x) {
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
// Die Markierung gleitet zum gewaehlten Eintrag der Leiste. Breit steht die
// Leiste senkrecht, schmal (Analysen) waagerecht, deshalb x, y, Breite und Hoehe.
function dnMovePill(instant) {
    const pill = dn$('dnDayPill'), b = document.querySelector('#dnDays [aria-selected="true"]');
    if (!pill || !b) return;
    const to = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };
    const put = function (p) { pill.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)'; pill.style.width = p.w + 'px'; pill.style.height = p.h + 'px'; };
    if (instant && DN._pill && !DN_RM.matches) { pill.style.transition = 'none'; put(DN._pill); void pill.offsetWidth; pill.style.transition = ''; }
    put(to);
    DN._pill = to;
}
function dnRenderGoal(days) {
    const x = days.find(function (y) { return y.k === DN.sel; }); if (!x) return;
    dn$('dnGoalLbl').textContent = x.isToday ? dnT('Tagesziel', 'Daily goal') : x.d.toLocaleDateString(dnLoc(), { weekday: 'long' });
    const f = x.soll > 0 ? Math.min(1, x.h / x.soll) : (x.h > 0 ? 1 : 0);
    dn$('dnGoalFill').style.transform = 'scaleX(' + f + ')';
    dn$('dnGoalVal').textContent = x.soll > 0 ? dnNum(x.h, 1) + ' / ' + dnNum(x.soll, 1) + ' h' : (x.h > 0 ? dnNum(x.h, 1) + ' h' : dnT('frei', 'off'));
}
function dnSelectDay(k) {
    DN.sel = k;
    document.querySelectorAll('.dn-day').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-dn-day') === k)); });
    dnMovePill(false);
    if (dnView() === 'week') dnRenderWeek(false);
}

// ── Analysen (in der Wochenkarte) ──
// Ein Zeitraum fuer alle vier Analysen. Nenner sind immer echte Groessen aus den
// Eintraegen und Einstellungen; wo es nichts zu rechnen gibt, steht "–".
function dnRanges() { return [[30, dnT('30 T', '30 d')], [90, dnT('90 T', '90 d')], [365, dnT('12 M', '12 mo')], ['all', dnT('Alles', 'All')]]; }
function dnRangeStart(today) {
    if (DN.range === 'all') { const f = dnFirstDate(); return f ? dnParse(f) : dnAdd(today, -29); }
    return dnAdd(today, -(DN.range - 1));
}
function dnInRange(from, today) {
    return (data.entries || []).filter(function (e) { if (!e || !e.date) return false; const d = dnParse(e.date); return d >= from && d <= today; });
}
function dnRenderAnaRail() {
    const dl = dn$('dnDays');
    dl.setAttribute('aria-label', dnT('Analysen', 'Insights'));
    dl.innerHTML = '<span class="dn-day-pill" id="dnDayPill"></span>' + DN_ANA.map(function (a) {
        return '<button type="button" class="dn-day" role="tab" data-dn-ana="' + a[0] + '" aria-selected="' + (a[0] === DN.ana) + '">' + dnT(a[1], a[2]) + '<small>' + dnT(a[3], a[4]) + '</small></button>';
    }).join('');
    dnMovePill(true);
}
function dnRenderAna(by, today, animate) {
    by = by || dnByDate(); today = today || dnToday();
    dnRenderAnaRail();
    dn$('dnRangeSeg').setAttribute('aria-label', dnT('Zeitraum', 'Period'));
    dnSeg(dn$('dnRangeSeg'), dnRanges(), DN.range, 'range');
    document.querySelectorAll('#dnPaneAna .dn-ana__p').forEach(function (p) { p.hidden = p.getAttribute('data-ana') !== DN.ana; });
    const from = dnRangeStart(today), fmt = function (d) { return d.toLocaleDateString(dnLoc(), { day: 'numeric', month: 'short', year: 'numeric' }); };
    dn$('dnWeekSub').textContent = fmt(from) + ' – ' + fmt(today);
    const lead = {
        saldo: dnT('Wie sich dein Gleitzeit-Saldo entwickelt hat.', 'How your flexitime balance developed.'),
        dist: dnT('Wofür deine Stunden draufgegangen sind.', 'Where your hours went.'),
        wd: dnT('Wie lang deine Tage je Wochentag im Schnitt sind, gemessen am Soll.', 'Average day length per weekday, against your target.'),
        facts: dnT('Wann du anfängst, aufhörst und wie oft du über dem Soll liegst.', 'When you start, when you finish, and how often you go over.')
    };
    dn$('dnAnaLead').textContent = lead[DN.ana];
    if (DN.ana === 'saldo') dnRenderSaldo(by, today, from, animate);
    else if (DN.ana === 'dist') dnRenderDist(from, today);
    else if (DN.ana === 'wd') dnRenderWd(from, today);
    else dnRenderFacts(from, today);
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
    // Prozent nur mit echtem Nenner; ohne Soll heute bleibt es bei Stunden.
    const pct = dnOpt('today', 'pct') && soll > 0, key = pct ? 'todayPct' : 'today', val = pct ? h / soll * 100 : h;
    const fmt = pct ? function (v) { return Math.round(v) + '<small>%</small>'; } : function (v) { return dnNum(v, 1) + '<small>h</small>'; };
    if (ts === 'run') { dn$('dnTodayVal').innerHTML = fmt(val); dnShown[key] = val; } else dnCount(dn$('dnTodayVal'), key, val, fmt);
    dn$('dnTodayOf').textContent = soll > 0 ? (pct ? dnNum(h, 1) + ' / ' + dnNum(soll, 1) + ' h' : dnT('von ', 'of ') + dnNum(soll, 1) + ' h') : dnT('kein Soll heute', 'no target today');
    dn$('dnToday').classList.toggle('is-running', ts === 'run');
    const showTimer = dnOpt('today', 'timer');
    dn$('dnLive').hidden = ts === 'off' || !showTimer;
    dn$('dnTimer').hidden = !showTimer;
    dn$('dnTodayLegend').hidden = !dnOpt('today', 'legend');
    const rows = [['work', dnT('Arbeit', 'Work'), 'var(--primary)'], ['school', dnT('Schule', 'School'), 'var(--school)'], ['other', dnT('Sonstiges', 'Other'), 'var(--text-muted)']];
    dn$('dnTodayLegend').innerHTML = rows.map(function (r) { return '<li><i style="background:' + r[2] + '"></i><span>' + r[1] + '</span><b>' + dnNum(sum[r[0]], 1) + ' h</b></li>'; }).join('');
    // Stempeluhr: dieselben drei Befehle wie im Formular (timerAction).
    const tm = dn$('dnTimer');
    if (tm.dataset.k !== ts) {
        tm.dataset.k = ts;
        tm.innerHTML = (ts === 'run' ? '<button type="button" class="dn-ibtn" data-dn="t-pause" aria-label="' + dnT('Pause', 'Pause') + '" title="' + dnT('Pause', 'Pause') + '">' + dnSvg('pause') + '</button>'
                : '<button type="button" class="dn-ibtn is-go" data-dn="t-start" aria-label="' + dnT('Einstempeln', 'Clock in') + '" title="' + dnT('Einstempeln', 'Clock in') + '">' + dnSvg('play') + '</button>') +
            '<button type="button" class="dn-ibtn" data-dn="t-stop" aria-label="' + dnT('Ausstempeln und buchen', 'Clock out and book') + '" title="' + dnT('Ausstempeln und buchen', 'Clock out and book') + '"' + (ts === 'off' ? ' disabled' : '') + '>' + dnSvg('square') + '</button>';
    }
    dnTimerText(ts, live);
    dn$('dnCtaLbl').textContent = dnT('Eintrag schreiben', 'Write entry');
}
// Laufende Zeit steht im Chip neben den Knoepfen; aus = kein Chip.
function dnTimerText(ts, live) {
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
    const today = dnToday(), by = dnByDate();
    dnRenderToday(by, today);
    DN.tick++;
    if (changed || DN.tick % 30 === 0) { dnRenderWeek(false, by); dnRenderHero(by, today); }
}

// ── Analysen: Saldo, Verteilung, Wochentage, Kennzahlen ──
// Saldo-Verlauf: Summe aller diff bis zu jedem Tag. Zwischen den Zeitraeumen
// formt sich die Kurve um (gleich viele Stuetzpunkte), statt neu aufzubauen.
const DN_N = 140;
function dnSeries(by, today, range) {
    const first = dnFirstDate();
    let start = range === 'all' ? (first ? dnParse(first) : dnAdd(today, -29)) : dnAdd(today, -(range - 1));
    if (start > today) start = dnAdd(today, -29);
    let run = 0;
    (data.entries || []).forEach(function (e) { if (e.date && dnParse(e.date) < start) run += parseFloat(e.diff) || 0; });
    const days = [];
    for (let d = new Date(start); d <= today; d = dnAdd(d, 1)) { (by[dnISO(d)] || []).forEach(function (e) { run += parseFloat(e.diff) || 0; }); days.push({ d: new Date(d), v: run }); }
    if (days.length < 2) days.unshift({ d: dnAdd(start, -1), v: days.length ? days[0].v : 0 });
    const vals = [];
    for (let i = 0; i < DN_N; i++) { const f = i / (DN_N - 1) * (days.length - 1), a = Math.floor(f), b = Math.min(days.length - 1, a + 1); vals.push(days[a].v + (days[b].v - days[a].v) * (f - a)); }
    let lo = Math.min(0, Math.min.apply(null, vals)), hi = Math.max(0, Math.max.apply(null, vals));
    const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
    return { days: days, vals: vals, lo: lo, hi: hi };
}
function dnFigs(host, figs) {
    host.innerHTML = figs.map(function (f) {
        const sg = f[2] == null ? 'zero' : (f[2] > 0.004 ? 'pos' : f[2] < -0.004 ? 'neg' : 'zero');
        return '<div class="dn-fig"><span>' + f[0] + '</span><b data-s="' + sg + '">' + f[1] + '</b>' + (f[3] ? '<small>' + dnEsc(f[3]) + '</small>' : '') + '</div>';
    }).join('');
}
function dnRenderSaldo(by, today, from, animate) {
    let sum = 0, wH = 0; const wDays = new Set();
    dnInRange(from, today).forEach(function (e) {
        sum += parseFloat(e.diff) || 0;   // Korrektur gehoert zum Saldo
        if (e.type === 'work' || e.type === 'school') { wH += dnEntryH(e); wDays.add(e.date); }
    });
    const pr = dnProjection();
    dnFigs(dn$('dnSaldoFigs'), [
        [dnT('Im Zeitraum', 'In this period'), dnSigned(sum, 1) + ' h', sum],
        [dnT('Ø je Arbeitstag', 'Avg per workday'), wDays.size ? dnNum(wH / wDays.size, 1) + ' h' : '–', null, wDays.size ? wDays.size + dnT(' Tage', ' days') : ''],
        [dnT('In 6 Wochen', 'In 6 weeks'), pr.ok ? dnSigned(pr.value, 1) + ' h' : '–', pr.ok ? pr.value : null, pr.ok ? dnT('Prognose', 'Forecast') : dnT('ab ', 'from ') + DN_PROG_MIN + dnT(' Tagen', ' days')]
    ]);
    const s = dnSeries(by, today, DN.range);
    const fmtD = function (d) { return d.toLocaleDateString(dnLoc(), { day: 'numeric', month: 'short' }); };
    dn$('dnChartX').innerHTML = '<span>' + fmtD(s.days[0].d) + '</span><span>' + fmtD(s.days[Math.floor(s.days.length / 2)].d) + '</span><span>' + dnT('heute', 'today') + '</span>';
    dn$('dnChartSvg').setAttribute('aria-label', dnT('Saldo-Verlauf', 'Balance over time'));
    DN._days = s.days;
    if (!DN._series || !animate || DN_RM.matches) { DN._series = { vals: s.vals, lo: s.lo, hi: s.hi }; dnDrawChart(s.vals, s.lo, s.hi); return; }
    const from0 = DN._series, t0 = performance.now(), D = 700;
    cancelAnimationFrame(DN._chartAnim);
    const step = function (t) {
        const k = Math.min(1, (t - t0) / D), e = k < .5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2;
        const v = from0.vals.map(function (x, i) { return x + (s.vals[i] - x) * e; });
        DN._series = { vals: v, lo: from0.lo + (s.lo - from0.lo) * e, hi: from0.hi + (s.hi - from0.hi) * e };
        dnDrawChart(DN._series.vals, DN._series.lo, DN._series.hi);
        if (k < 1) DN._chartAnim = requestAnimationFrame(step); else DN._series = { vals: s.vals, lo: s.lo, hi: s.hi };
    };
    DN._chartAnim = requestAnimationFrame(step);
}
function dnDrawChart(vals, lo, hi) {
    const svg = dn$('dnChartSvg'), W = Math.max(200, svg.clientWidth), H = svg.clientHeight || 200;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const x = function (i) { return i / (DN_N - 1) * W; }, y = function (v) { return (hi - v) / (hi - lo) * H; };
    const d = vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' '), z = y(0);
    if (!svg.firstChild) {
        svg.innerHTML = '<defs><linearGradient id="dnChG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".26"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>' +
            '<line id="dnChZ" stroke="var(--dn-line-2)" stroke-dasharray="3 4"/><path id="dnChA" fill="url(#dnChG)"/><path id="dnChL" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
            '<g id="dnChC" style="opacity:0;transition:opacity .15s ease"><line id="dnChCl" y1="0" stroke="var(--text-muted)" stroke-width="1"/><circle id="dnChCd" r="5" fill="var(--primary)" stroke="var(--bg-deep)" stroke-width="2"/></g>';
    }
    const zl = dn$('dnChZ'); zl.setAttribute('x1', 0); zl.setAttribute('x2', W); zl.setAttribute('y1', z); zl.setAttribute('y2', z);
    dn$('dnChL').setAttribute('d', d); dn$('dnChA').setAttribute('d', d + ' L' + W + ' ' + z + ' L0 ' + z + ' Z');
    dn$('dnChCl').setAttribute('y2', H);
    // Beschriftet: Nulllinie und die Raender, aber nur Raender, die nicht an der Null kleben.
    const marks = [[0, '0']], top = hi - (hi - lo) * .1, bot = lo + (hi - lo) * .1;
    if (top > 1) marks.push([top, dnSigned(top, 0)]);
    if (bot < -1) marks.push([bot, dnSigned(bot, 0)]);
    dn$('dnChartY').innerHTML = marks.map(function (m) { return '<span style="top:' + (y(m[0]) / H * 100) + '%">' + m[1] + '</span>'; }).join('');
}
// Fadenkreuz folgt dem Zeiger mit Feder, auf dem Handy beim Wischen.
function dnChartPointer() {
    const svg = dn$('dnChartSvg'), tip = dn$('dnChartTip'), cr = { x: 0, tx: 0, v: 0, on: false, raf: 0 };
    const loop = function () {
        const f = (cr.tx - cr.x) * 0.22 - cr.v * 0.35; cr.v += f; cr.x += cr.v; if (DN_RM.matches) cr.x = cr.tx;
        const S = DN._series; if (!S) { cr.raf = 0; return; }
        const W = +svg.getAttribute('viewBox').split(' ')[2], H = svg.clientHeight || 200;
        const fi = Math.max(0, Math.min(1, cr.x / W)) * (DN_N - 1), i = Math.round(fi), v = S.vals[i], yy = (S.hi - v) / (S.hi - S.lo) * H;
        dn$('dnChCl').setAttribute('x1', cr.x); dn$('dnChCl').setAttribute('x2', cr.x); dn$('dnChCd').setAttribute('cx', cr.x); dn$('dnChCd').setAttribute('cy', yy);
        const days = DN._days || [], day = days[Math.round(fi / (DN_N - 1) * (days.length - 1))];
        tip.innerHTML = '<span>' + (day ? day.d.toLocaleDateString(dnLoc(), { weekday: 'short', day: 'numeric', month: 'short' }) : '') + '</span><b>' + dnSigned(v) + ' h</b>';
        // Ein SVG hat kein offsetLeft (undefined → NaN, der Tooltip klebte links).
        // Lage zum Diagramm-Kasten aus den Rechtecken, durch den Zoom geteilt.
        const host = svg.parentElement, z = dnZ(host), sl = (svg.getBoundingClientRect().left - host.getBoundingClientRect().left) / z;
        const sw = svg.clientWidth, px = sl + cr.x / W * sw;
        tip.style.transform = 'translate(' + Math.max(sl, Math.min(px - tip.offsetWidth / 2, sl + sw - tip.offsetWidth)) + 'px,' + (yy - tip.offsetHeight - 14) + 'px)';
        cr.raf = (Math.abs(cr.tx - cr.x) > .2 || Math.abs(cr.v) > .2) ? requestAnimationFrame(loop) : 0;
    };
    const to = function (cx) {
        const r = svg.getBoundingClientRect(), W = +(svg.getAttribute('viewBox') || '0 0 1 1').split(' ')[2];
        cr.tx = Math.max(0, Math.min(1, (cx - r.left) / r.width)) * W;
        if (!cr.on) { cr.on = true; cr.x = cr.tx; dn$('dnChC').style.opacity = 1; tip.style.opacity = 1; }
        if (!cr.raf) cr.raf = requestAnimationFrame(loop);
    };
    svg.addEventListener('pointermove', function (e) { to(e.clientX); });
    svg.addEventListener('pointerdown', function (e) { to(e.clientX); });
    svg.addEventListener('pointerleave', function () { cr.on = false; const c = dn$('dnChC'); if (c) c.style.opacity = 0; tip.style.opacity = 0; });
}

// Verteilung: je Eintragstyp Stunden im Zeitraum, Farbe aus der Typdefinition
// (getTypeRgb, eine Quelle fuer die ganze App). Korrektur zaehlt nicht.
function dnRenderDist(from, today) {
    const sum = {}, days = {};
    dnInRange(from, today).forEach(function (e) {
        if (e.type === 'korrektur') return;
        sum[e.type] = (sum[e.type] || 0) + dnEntryH(e);
        (days[e.type] = days[e.type] || new Set()).add(e.date);
    });
    const types = Object.keys(sum).filter(function (t) { return sum[t] > 0.004; }).sort(function (a, b) { return sum[b] - sum[a] || a.localeCompare(b); });
    const total = types.reduce(function (a, t) { return a + sum[t]; }, 0);
    dnCount(dn$('dnDistTotal'), 'distTotal', total, function (v) { return '<b>' + dnNum(v, 1) + '</b><span>' + dnT('Stunden gesamt', 'hours in total') + '</span>'; }, 700);
    const bar = dn$('dnDistBar');
    if (!types.length) {
        bar.innerHTML = '';
        dn$('dnDistLeg').innerHTML = '<li class="dn-dist__empty">' + dnT('In diesem Zeitraum gibt es noch keine Einträge.', 'No entries in this period yet.') + '</li>';
        return;
    }
    // Fuge je Segment, ohne dass die Summe die Breite sprengt (auswertungen.md).
    const gap = 0.5, room = 100 - gap * (types.length - 1); let left = 0;
    const known = new Set(types);
    [...bar.children].forEach(function (c) { if (!known.has(c.getAttribute('data-t'))) c.remove(); });
    types.forEach(function (t) {
        let el = bar.querySelector('[data-t="' + t + '"]');
        if (!el) { el = document.createElement('i'); el.setAttribute('data-t', t); el.style.left = '0'; el.style.width = '0'; bar.appendChild(el); }
        el.style.background = 'rgb(' + dnTypeRgb(t) + ')';
        const w = sum[t] / total * room;
        el.style.left = left + '%'; el.style.width = w + '%'; el.title = dnTypeLabel(t) + ': ' + dnNum(sum[t], 1) + ' h';
        left += w + gap;
    });
    dn$('dnDistLeg').innerHTML = types.map(function (t) {
        return '<li><i style="background:rgb(' + dnTypeRgb(t) + ')"></i><span>' + dnEsc(dnTypeLabel(t)) + '</span><small>' + days[t].size + (days[t].size === 1 ? dnT(' Tag', ' day') : dnT(' Tage', ' days')) + '</small><b>' + dnNum(sum[t], 1) + ' h</b><em>' + Math.round(sum[t] / total * 100) + ' %</em></li>';
    }).join('');
}

// Wochentage: Ø Stunden an den Tagen MIT Eintrag (ein leerer Montag zieht den
// Schnitt nicht runter, er steht in "Erfasste Tage"), dagegen das Soll des
// Wochentags als Marke. Wochenende nur, wenn dort Soll oder Eintraege sind.
function dnRenderWd(from, today) {
    const sum = [0, 0, 0, 0, 0, 0, 0], days = [0, 1, 2, 3, 4, 5, 6].map(function () { return new Set(); });
    dnInRange(from, today).forEach(function (e) {
        if (e.type === 'korrektur') return;
        const h = dnEntryH(e); if (h <= 0) return;
        const wd = dnParse(e.date).getDay(); sum[wd] += h; days[wd].add(e.date);
    });
    const mo = dnMonday(0);
    const cols = [1, 2, 3, 4, 5, 6, 0].map(function (wd) {
        const soll = dnSoll(dnAdd(mo, (wd + 6) % 7)), n = days[wd].size;
        return { wd: wd, d: dnAdd(mo, (wd + 6) % 7), n: n, avg: n ? sum[wd] / n : 0, soll: soll };
    }).filter(function (c) { return c.n || c.soll > 0; });
    const host = dn$('dnWd');
    if (!cols.some(function (c) { return c.n; })) { host.innerHTML = '<p class="dn-dist__empty">' + dnT('In diesem Zeitraum gibt es noch keine Einträge.', 'No entries in this period yet.') + '</p>'; return; }
    const max = Math.max.apply(null, cols.map(function (c) { return Math.max(c.avg, c.soll); })) * 1.1 || 1;
    host.innerHTML = '<div class="dn-wd__cols" style="grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))">' + cols.map(function (c) {
        const name = c.d.toLocaleDateString(dnLoc(), { weekday: 'long' });
        const tip = name + ': ' + (c.n ? dnT('Ø ', 'avg ') + dnNum(c.avg, 1) + ' h, ' + c.n + (c.n === 1 ? dnT(' Tag', ' day') : dnT(' Tage', ' days')) : dnT('keine Einträge', 'no entries')) + (c.soll ? ', ' + dnT('Soll ', 'target ') + dnNum(c.soll, 1) + ' h' : '');
        return '<div class="dn-wd__c" title="' + dnEsc(tip) + '" aria-label="' + dnEsc(tip) + '" role="img">' +
            '<b>' + (c.n ? dnNum(c.avg, 1) : '–') + '</b>' +
            '<div class="dn-wd__track"><i class="dn-wd__bar" style="height:' + (c.avg / max * 100) + '%"></i>' + (c.soll ? '<span class="dn-wd__soll" style="bottom:' + (c.soll / max * 100) + '%"></span>' : '') + '</div>' +
            '<span class="dn-wd__d">' + c.d.toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', '') + '</span><small>' + c.n + dnT(' T', ' d') + '</small></div>';
    }).join('') + '</div>' +
        '<p class="dn-wd__key"><span><i class="bar"></i>' + dnT('Ø Stunden an Tagen mit Eintrag', 'Avg hours on recorded days') + '</span><span><i class="soll"></i>' + dnT('Soll', 'Target') + '</span></p>';
}

// Kennzahlen: Rhythmus und Ausreisser. Beginn, Ende und Pause nur aus
// Arbeitseintraegen mit Uhrzeit — ein manueller Stundeneintrag hat keine.
function dnRenderFacts(from, today) {
    const list = dnInRange(from, today).filter(function (e) { return e.type !== 'korrektur'; });
    const hm = /^\d{1,2}:\d{2}$/, mins = function (s) { const p = s.split(':'); return +p[0] * 60 + +p[1]; };
    const clock = function (m) { m = Math.round(m); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
    const timed = list.filter(function (e) { return e.type === 'work' && hm.test(e.start || '') && hm.test(e.end || '') && mins(e.end) > mins(e.start); });
    const mean = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
    const st = mean(timed.map(function (e) { return mins(e.start); })), en = mean(timed.map(function (e) { return mins(e.end); }));
    const br = mean(timed.map(function (e) { return parseFloat(e.breakMins) || 0; }));
    const dayH = {}, dayD = {}, proj = {};
    list.forEach(function (e) {
        dayH[e.date] = (dayH[e.date] || 0) + dnEntryH(e);
        dayD[e.date] = (dayD[e.date] || 0) + (parseFloat(e.diff) || 0);
        if (e.project) proj[e.project] = (proj[e.project] || 0) + dnEntryH(e);
    });
    const dates = Object.keys(dayH);
    let longest = null; dates.forEach(function (k) { if (!longest || dayH[k] > dayH[longest]) longest = k; });
    let overN = 0, overH = 0, underN = 0, underH = 0;
    dates.forEach(function (k) { const v = dayD[k]; if (v > 0.05) { overN++; overH += v; } else if (v < -0.05) { underN++; underH += v; } });
    const topP = Object.keys(proj).sort(function (a, b) { return proj[b] - proj[a]; })[0];
    let sk = { current: 0, best: 0 };
    try { if (typeof calculateStreak === 'function') sk = calculateStreak(); } catch (e) { /* ohne Serie */ }
    const tage = function (n) { return n + (n === 1 ? dnT(' Tag', ' day') : dnT(' Tage', ' days')); };
    const rows = [
        [dnT('Erfasste Tage', 'Recorded days'), String(dates.length)],
        [dnT('Ø Beginn', 'Avg start'), st == null ? '–' : clock(st)],
        [dnT('Ø Feierabend', 'Avg finish'), en == null ? '–' : clock(en)],
        [dnT('Ø Pause', 'Avg break'), br == null ? '–' : Math.round(br) + ' min'],
        [dnT('Längster Tag', 'Longest day'), longest ? dnNum(dayH[longest], 1) + ' h, ' + dnParse(longest).toLocaleDateString(dnLoc(), { weekday: 'short', day: 'numeric', month: 'short' }) : '–'],
        [dnT('Über Soll', 'Over target'), overN ? tage(overN) + ', ' + dnSigned(overH, 1) + ' h' : '–'],
        [dnT('Unter Soll', 'Under target'), underN ? tage(underN) + ', ' + dnSigned(underH, 1) + ' h' : '–'],
        [dnT('Serie (Soll erfüllt)', 'Streak (target met)'), tage(sk.current) + dnT(', Rekord ', ', best ') + sk.best]
    ];
    if (topP) rows.splice(5, 0, [dnT('Größtes Projekt', 'Top project'), topP + ', ' + dnNum(proj[topP], 1) + ' h']);
    dn$('dnFacts').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + dnEsc(r[1]) + '</dd></div>'; }).join('');
}

// ── Urlaub ──
// Kontingent mit echtem Nenner (Anspruch + Uebertrag). Genommen = bis heute,
// geplant = eingetragene Urlaubstage danach. Die Marke zeigt, wo man stuende,
// wenn man gleichmaessig ueber das Jahr verteilt naehme.
function dnRenderVac(today) {
    const vs = data.settings.vacation || {}, hoursMode = (typeof getVacationMode === 'function') && getVacationMode() === 'hours';
    const carried = parseFloat(vs.carriedOver || 0) || 0, total = (parseFloat(vs.total) || 0) + carried, manual = parseFloat(vs.usedManual || 0) || 0;
    const y = today.getFullYear(); let taken = manual, planned = 0; const future = [];
    (data.entries || []).forEach(function (e) {
        if (e.type !== 'vacation' || !e.date) return;
        const d = dnParse(e.date); if (d.getFullYear() !== y) return;
        const amount = hoursMode ? (parseFloat(e.expected) || 0) : 1;
        if (d <= today) taken += amount; else { planned += amount; future.push(d); }
    });
    const left = Math.max(0, total - taken - planned);
    const fmt = function (v) { const r = Math.round(v * 10) / 10; return dnNum(r, r % 1 ? 1 : 0); };
    const unitFor = function (v) { return hoursMode ? ' h' : (Math.round(v * 10) / 10 === 1 ? dnT(' Tag', ' day') : dnT(' Tage', ' days')); };
    dn$('dnVacTitle').textContent = dnT('Urlaub', 'Leave');
    dn$('dnVacSub').textContent = dnT('Anspruch ', 'Allowance ') + y + ': ' + fmt(total) + unitFor(total) + (carried ? dnT(', davon ' + fmt(carried) + ' Übertrag', ', incl. ' + fmt(carried) + ' carried over') : '');
    dn$('dnVacPlan').textContent = dnT('Planen', 'Plan');
    if (dnOpt('vac', 'taken')) {
        dnCount(dn$('dnVacBig'), 'vacTaken', taken, function (v) { return '<b>' + fmt(v) + '</b><span>' + (hoursMode ? dnT('Stunden genommen', 'hours taken') : (Math.round(v) === 1 ? dnT('Tag genommen', 'day taken') : dnT('Tage genommen', 'days taken'))) + '</span>'; });
    } else {
        dnCount(dn$('dnVacBig'), 'vacLeft', left, function (v) { return '<b>' + fmt(v) + '</b><span>' + (hoursMode ? dnT('Stunden frei', 'hours left') : (Math.round(v) === 1 ? dnT('Tag frei', 'day left') : dnT('Tage frei', 'days left'))) + '</span>'; });
    }
    const showBar = dnOpt('vac', 'bar');
    dn$('dnVacBar').hidden = !showBar; dn$('dnVacLegend').hidden = !showBar;
    dn$('dnVacRows').hidden = !dnOpt('vac', 'rows');
    const pT = total > 0 ? Math.min(100, taken / total * 100) : 0, pP = total > 0 ? Math.min(100 - pT, planned / total * 100) : 0;
    const yearP = (today - new Date(y, 0, 1)) / (new Date(y + 1, 0, 1) - new Date(y, 0, 1)) * 100;
    const bar = dn$('dnVacBar');
    // Farbe des Typs Urlaub aus den Einstellungen (getTypeRgb), nicht fest.
    bar.closest('.dn-vac').style.setProperty('--dn-vac', 'rgb(' + dnTypeRgb('vacation') + ')');
    if (!bar.children.length) bar.innerHTML = '<i class="t"></i><i class="p"></i><b class="mark"></b>';
    bar.querySelector('.t').style.width = pT + '%';
    bar.querySelector('.p').style.left = pT + '%'; bar.querySelector('.p').style.width = pP + '%';
    bar.querySelector('.mark').style.left = yearP + '%';
    bar.title = dnT('Marke: Stand des Jahres', 'Marker: how far the year is');
    dn$('dnVacLegend').innerHTML = '<span><i class="t"></i>' + fmt(taken) + dnT(' genommen', ' taken') + '</span><span><i class="p"></i>' + fmt(planned) + dnT(' geplant', ' planned') + '</span><span><i class="m"></i>' + dnT('Jahr ', 'Year ') + Math.round(yearP) + ' %</span>';
    // Tempo wie frueher im Urlaubs-Pacing: Anteil verbraucht gegen Anteil Jahr.
    const used = (taken + planned) / (total || 1), pace = yearP > 2 && total > 0 ? used / (yearP / 100) : null;
    let tempo = dnT('Ausgeglichen', 'On track');
    if (pace !== null) tempo = pace < 0.8 ? dnT('Sparsam', 'Ahead of the year') : pace < 1.2 ? dnT('Ausgeglichen', 'On track') : pace < 1.6 ? dnT('Zügig', 'Running warm') : dnT('Kritisch', 'Running out');
    future.sort(function (a, b) { return a - b; });
    let next = '–';
    if (future.length) {
        let n = 1; while (n < future.length && Math.round((future[n] - future[n - 1]) / 864e5) <= 3) n++;
        next = future[0].toLocaleDateString(dnLoc(), { day: 'numeric', month: 'short' }) + (n > 1 ? ' – ' + future[n - 1].toLocaleDateString(dnLoc(), { day: 'numeric', month: 'short' }) : '');
    }
    const daysLeft = Math.max(0, Math.ceil((new Date(y, 11, 31) - today) / 864e5));
    dn$('dnVacRows').innerHTML = [[dnT('Tempo', 'Pace'), tempo], [dnT('Nächster Urlaub', 'Next leave'), next], [dnT('Noch im Jahr', 'Left in year'), daysLeft + dnT(' Kalendertage', ' calendar days')]]
        .map(function (r) { return '<div><span>' + r[0] + '</span><b>' + dnEsc(r[1]) + '</b></div>'; }).join('');
}

// ── Kalender mit Tagesverlauf ──
function dnRenderCal(by, animDir) {
    by = by || dnByDate();
    const y = DN.calY, m = DN.calM, first = new Date(y, m, 1), start = dnAdd(first, -((first.getDay() + 6) % 7));
    const todayK = dnISO(new Date());
    dn$('dnCalTitle').textContent = dnT('Kalender', 'Calendar');
    dn$('dnCalMonthLbl').textContent = first.toLocaleDateString(dnLoc(), { month: 'long', year: 'numeric' });
    const wd = dn$('dnCalWd');
    if (!wd.children.length) { for (let i = 0; i < 7; i++) wd.insertAdjacentHTML('beforeend', '<span>' + dnAdd(new Date(2024, 0, 1), i).toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', '').slice(0, dnEN() ? 3 : 2) + '</span>'); }
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
        const h = list.reduce(function (a, e) { return a + dnEntryH(e); }, 0);
        let dot = '';
        if (hol[k] || list.some(function (e) { return e.type === 'holiday'; })) dot = 'holiday';
        else if (list.some(function (e) { return e.type === 'vacation'; })) dot = 'vac';
        else if (list.length) dot = 'entry';
        html += '<button type="button" class="' + cls.join(' ') + '" data-dn-cal="' + k + '" aria-label="' + dnEsc(d.toLocaleDateString(dnLoc(), { weekday: 'long', day: 'numeric', month: 'long' }) + (hol[k] ? ', ' + hol[k] : '') + (list.length ? ', ' + dnNum(h, 1) + ' h' : '')) + '"><span>' + d.getDate() + '</span>' +
            (h > 0.004 ? '<small>' + dnNum(h, 1) + '</small>' : '') + (dot ? '<i data-k="' + dot + '"></i>' : '') + '</button>';
        if (i === 34 && dnAdd(start, 35).getMonth() !== m) break;   // keine leere sechste Zeile
    }
    const g = dn$('dnCalGrid');
    g.innerHTML = html;
    g.classList.toggle('no-hours', !dnOpt('cal', 'hours'));
    dn$('dnCalLegend').hidden = !dnOpt('cal', 'legend');
    if (animDir) dnAnim(g, [{ transform: 'translateX(' + (animDir * 28) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' });
    dn$('dnCalLegend').innerHTML = [['var(--success)', dnT('Eintrag', 'Entry')], ['var(--primary)', dnT('Heute', 'Today')], ['var(--danger)', dnT('Feiertag', 'Holiday')], ['var(--text-muted)', dnT('Urlaub', 'Leave')]]
        .map(function (l) { return '<span><i style="background:' + l[0] + '"></i>' + l[1] + '</span>'; }).join('');
    DN._hol = hol;
}
// Der gewaehlte Tag als Verlauf: alle Eintraege, Klick bearbeitet, darunter Nachtragen.
function dnRenderDay(k, by, animate) {
    by = by || dnByDate();
    const box = dn$('dnCalDay'), d = dnParse(k), list = (by[k] || []).slice().sort(function (a, b) { return String(a.start || '').localeCompare(String(b.start || '')); });
    const soll = dnSoll(d), h = list.reduce(function (a, e) { return a + dnEntryH(e); }, 0), hol = DN._hol && DN._hol[k];
    const diff = list.reduce(function (a, e) { return a + (parseFloat(e.diff) || 0); }, 0);
    const rows = list.map(function (e) {
        const span = (e.start && e.end) ? e.start + ' – ' + e.end : '';
        const sub = [span, e.project, dnNote(e)].filter(Boolean).join(' · ');
        const icon = (typeof getTypeIconHTML === 'function') ? getTypeIconHTML(e.type, 16) : '';
        return '<button type="button" class="dn-ent" data-dn-edit="' + dnEsc(e.id) + '" style="--dn-rgb:' + dnTypeRgb(e.type) + '"><span class="dn-ent__ic">' + icon + '</span>' +
            '<span class="dn-ent__t"><b>' + dnEsc(dnTypeLabel(e.type)) + '</b><small>' + dnEsc(sub || dnT('ohne Zeitangabe', 'no times')) + '</small></span><span class="dn-ent__h">' + dnNum(dnEntryH(e), 2) + ' h</span></button>';
    }).join('');
    box.innerHTML = '<div class="dn-dayv__head"><button type="button" class="dn-ibtn dn-ibtn--sm dn-dayv__back" data-dn="cal-back" aria-label="' + dnT('Zurück zum Monat', 'Back to month') + '">' + dnSvg('back') + '</button>' +
        '<div class="dn-dayv__ttl"><h3>' + dnEsc(d.toLocaleDateString(dnLoc(), { weekday: 'long', day: 'numeric', month: 'long' })) + '</h3><p>' + (hol ? dnEsc(hol) : (list.length ? list.length + (list.length === 1 ? dnT(' Eintrag', ' entry') : dnT(' Einträge', ' entries')) : dnT('Kein Eintrag', 'No entry'))) + '</p></div>' +
        '<button type="button" class="dn-btn dn-btn--ghost dn-btn--sm" data-dn="history" title="' + dnT('Verlauf öffnen', 'Open history') + '">' + dnSvg('history') + '<span>' + dnT('Verlauf', 'History') + '</span></button></div>' +
        '<div class="dn-dayv__sum"><span>' + dnT('Erfasst', 'Recorded') + '</span><b>' + dnNum(h, 2) + (soll ? ' / ' + dnNum(soll, 1) : '') + ' h</b>' + (list.length ? '<span class="dn-pill" data-s="' + (diff > 0.004 ? 'pos' : diff < -0.004 ? 'neg' : 'zero') + '">' + dnSigned(diff, 2) + ' h</span>' : '') + '</div>' +
        '<div class="dn-dayv__list">' + (rows || '<div class="dn-empty">' + dnT('An diesem Tag steht nichts.', 'Nothing recorded on this day.') + '</div>') + '</div>' +
        '<button type="button" class="dn-btn dn-btn--solid dn-dayv__add" data-dn="entry-day" data-k="' + k + '">' + dnSvg('plus') + dnT('Eintrag für diesen Tag', 'Add entry for this day') + '</button>';
    if (animate) dnAnim(box, [{ transform: 'translateY(8px)', opacity: 0, filter: 'blur(3px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }], { duration: 360, easing: 'cubic-bezier(.23,1,.32,1)' });
}
function dnOpenDay(k) {
    DN.calDay = k;
    const dt = dnParse(k);
    if (dt.getMonth() !== DN.calM || dt.getFullYear() !== DN.calY) { DN.calY = dt.getFullYear(); DN.calM = dt.getMonth(); }
    dnRenderCal(null, 0);
    dnRenderDay(k, null, true);
    // Schmal liegt der Tag UEBER dem Monat (Klasse steuert das CSS), breit daneben.
    document.querySelector('.dn-cal').classList.add('is-day');
}
function dnCloseDay() {
    document.querySelector('.dn-cal').classList.remove('is-day');
    dnAnim(dn$('dnCalMonth'), [{ transform: 'translateX(-24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.32,.72,0,1)' });
}

// ── Statuszeile: nur, wenn in dieser Woche ein Tag fehlt ──
// Kein Dauer-Lob und kein Leerzustand: den ersten Start fuehrt die Einrichtungs-
// karte oben, und "alles gut" braucht keine eigene Zeile.
function dnRenderStatus(by, today) {
    const box = dn$('dnStatus');
    const missing = [], mo = dnMonday(0), first = dnFirstDate();
    for (let i = 0; i < 7; i++) { const d = dnAdd(mo, i); if (d >= today) break; if (first && dnISO(d) > first && dnSoll(d) > 0 && !(by[dnISO(d)] || []).length) missing.push(d); }
    if (!missing.length) { box.innerHTML = ''; return; }
    const names = missing.map(function (d) { return d.toLocaleDateString(dnLoc(), { weekday: 'short' }).replace('.', ''); }).join(', ');
    const t = missing.length === 1 ? dnT('Ein Tag fehlt noch.', 'One day is missing.') : dnT(missing.length + ' Tage fehlen noch.', missing.length + ' days are missing.');
    const s = dnT('Diese Woche ohne Eintrag: ', 'No entry this week: ') + names + '.';
    box.innerHTML = '<span class="dn-status__ic">' + dnSvg('alert') + '</span><div class="dn-status__t"><b>' + t + '</b><span>' + s + '</span></div>' +
        '<button type="button" class="dn-btn" data-dn="entry-day" data-k="' + dnISO(missing[0]) + '">' + dnT('Nachtragen', 'Add now') + dnSvg('arrow') + '</button>';
}

// ════════════════ BEWEGUNG BEIM LADEN ════════════════
// Ein orchestrierter Moment, einmal je Seitenaufruf. Text bleibt sichtbar (LCP);
// Ringe fahren, Linien zeichnen sich, Knoten, Karten und Balken folgen.
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
    const cl = dn$('dnChL');
    if (cl && cl.getTotalLength) {
        const L = cl.getTotalLength();
        dnAnim(cl, [{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: 1500, delay: 300, easing: 'cubic-bezier(.77,0,.175,1)' });
        dnAnim(dn$('dnChA'), [{ opacity: 0 }, { opacity: 1 }], { duration: 900, delay: 1000, easing: 'ease', fill: 'backwards' });
    }
    document.querySelectorAll('#dnSaldoFigs .dn-fig, #dnDistLeg li, #dnFacts > div, #dnVacRows > div').forEach(function (n, i) { dnAnim(n, [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 300 + (i % 6) * 60, easing: ease, fill: 'backwards' }); });
    document.querySelectorAll('#dnDistBar i, #dnVacBar i').forEach(function (n, i) { dnAnim(n, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, delay: 500 + i * 80, easing: ease, fill: 'backwards' }); });
    document.querySelectorAll('#dnKwBars i').forEach(function (n, i) { n.style.transformOrigin = 'bottom'; dnAnim(n, [{ transform: 'scaleY(0)' }, { transform: 'none' }], { duration: 800, delay: 250 + i * 70, easing: ease, fill: 'backwards' }); });
    document.querySelectorAll('#dnCalGrid .dn-cd i').forEach(function (n, i) { dnAnim(n, [{ transform: 'scale(0)' }, { transform: 'none' }], { duration: 400, delay: 500 + i * 18, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }); });
    const sp = document.querySelector('#dnSpark path:last-child');
    if (sp && sp.getTotalLength) { const L = sp.getTotalLength(); if (L) dnAnim(sp, [{ strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDasharray: L + ' ' + L, strokeDashoffset: 0 }], { duration: 1300, delay: 300, easing: 'cubic-bezier(.77,0,.175,1)' }); }
}

// ════════════════ SCHUBLADE ════════════════
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

// ════════════════ MODUL-MENUE ════════════════
// Je Modul ein kleines Menue: Optionen (DN_OPTS), Breite, Ausblenden, Anordnen.
// Liegt im Modul selbst; das Modul bekommt dafuer .has-menu, weil jedes Modul
// (container-type) einen eigenen Stapelkontext bildet und das naechste Modul
// sonst ueber dem Menue laege.
function dnOpenMenu(btn) {
    const id = btn.getAttribute('data-id'), mod = btn.closest('.dn-mod');
    if (DN.menu && DN.menu.id === id) { dnCloseMenu(true); return; }
    dnCloseMenu(false);
    mod.insertAdjacentHTML('beforeend', '<div class="dn-menu" role="menu"></div>');
    const m = mod.querySelector(':scope > .dn-menu');
    DN.menu = { id: id, el: m, btn: btn };
    mod.classList.add('has-menu');
    btn.setAttribute('aria-expanded', 'true');
    dnFillMenu();
    const r = btn.getBoundingClientRect(), mr = mod.getBoundingClientRect(), z = dnZ(mod);
    m.style.top = Math.round((r.bottom - mr.top) / z + 8) + 'px';
    m.style.right = Math.max(8, Math.round((mr.right - r.right) / z)) + 'px';
    dnAnim(m, [{ opacity: 0, transform: 'translateY(-4px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.23,1,.32,1)' });
    const first = m.querySelector('button'); if (first) first.focus({ preventScroll: true });
}
function dnFillMenu() {
    if (!DN.menu) return;
    const id = DN.menu.id, m = DN.menu.el, l = dnLayout(), name = dnT(DN_MODS[id].de, DN_MODS[id].en);
    const sizeName = { s: dnT('Schmal', 'Narrow'), m: dnT('Halb', 'Half'), l: dnT('Breit', 'Wide'), f: dnT('Voll', 'Full') };
    m.setAttribute('aria-label', name + dnT(' anpassen', ' options'));
    let html = '<p class="dn-menu__t">' + dnT('Anzeigen', 'Show') + '</p>' + (DN_OPTS[id] || []).map(function (o) {
        return '<button type="button" role="menuitemcheckbox" class="dn-menu__it" data-dn="opt" data-id="' + id + '" data-k="' + o[0] + '" aria-checked="' + !!dnOpt(id, o[0]) + '"><span>' + dnT(o[1], o[2]) + '</span><i class="dn-sw" aria-hidden="true"></i></button>';
    }).join('') + '<hr>';
    if (id === 'week') html += '<button type="button" role="menuitem" class="dn-menu__it" data-dn="weekview"><span>' + dnT('Wochenansicht öffnen', 'Open week view') + '</span>' + dnSvg('arrow') + '</button>';
    if (DN_MODS[id].sizes.length > 1) html += '<button type="button" role="menuitem" class="dn-menu__it dn-menu__size" data-dn="mod-size" data-id="' + id + '"><span>' + dnT('Breite', 'Width') + '</span><em>' + sizeName[l.size[id]] + '</em></button>';
    html += '<button type="button" role="menuitem" class="dn-menu__it" data-dn="edit"><span>' + dnT('Module anordnen', 'Arrange modules') + '</span>' + dnSvg('grip') + '</button>' +
        '<button type="button" role="menuitem" class="dn-menu__it" data-dn="mod-hide" data-id="' + id + '"><span>' + dnT('Ausblenden', 'Hide') + '</span>' + dnSvg('eyeoff') + '</button>';
    const f = document.activeElement && m.contains(document.activeElement) ? [...m.querySelectorAll('button')].indexOf(document.activeElement) : -1;
    m.innerHTML = html;
    if (f >= 0) { const b = m.querySelectorAll('button')[f]; if (b) b.focus({ preventScroll: true }); }
}
function dnCloseMenu(focusBtn) {
    if (!DN.menu) return;
    const mm = DN.menu; DN.menu = null;
    mm.btn.setAttribute('aria-expanded', 'false');
    const mod = mm.el.closest('.dn-mod'); if (mod) mod.classList.remove('has-menu');
    mm.el.remove();
    if (focusBtn) mm.btn.focus({ preventScroll: true });
}

// ════════════════ KLICKS ════════════════
function dnClick(e) {
    if (DN.menu && !e.target.closest('.dn-menu') && !e.target.closest('[data-dn="mod-menu"]')) dnCloseMenu(false);
    if (e.target.closest('[data-dn-grip]')) return;   // Ziehen laeuft ueber pointerdown
    const t = e.target.closest('[data-dn],[data-dn-day],[data-dn-ana],[data-dn-cal],[data-dn-edit]');
    if (!t) return;
    if (t.hasAttribute('data-dn-day')) { dnSelectDay(t.getAttribute('data-dn-day')); const x = t.getAttribute('data-s'); if ((x === 'miss' || x === 'open') && t.classList.contains('dn-dcard')) dnOpenEntry(t.getAttribute('data-dn-day')); return; }
    if (t.hasAttribute('data-dn-ana')) {
        DN.ana = t.getAttribute('data-dn-ana');
        dnRenderAna(null, null, true);
        const p = document.querySelector('#dnPaneAna .dn-ana__p:not([hidden])');
        dnAnim(p, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.23,1,.32,1)' });
        return;
    }
    if (t.hasAttribute('data-dn-cal')) { dnOpenDay(t.getAttribute('data-dn-cal')); return; }
    if (t.hasAttribute('data-dn-edit')) {
        const raw = t.getAttribute('data-dn-edit'), id = isNaN(+raw) ? raw : +raw;
        if (typeof openEditModal === 'function') openEditModal(id);
        return;
    }
    const a = t.getAttribute('data-dn');
    const run = function (fn) { if (typeof window[fn] === 'function') window[fn](); };
    const l = dnLayout(), id = t.getAttribute('data-id');
    switch (a) {
        case 'theme': {
            const light = document.documentElement.getAttribute('data-theme') === 'light';
            document.documentElement.classList.add('dn-theme-anim');
            if (typeof setThemeMode === 'function') setThemeMode(light ? 'dark' : 'light');
            setTimeout(function () { document.documentElement.classList.remove('dn-theme-anim'); }, 450);
            dnRenderTop(); dnSetInk(); break;
        }
        case 'alerts': run('toggleAlertsPanel'); setTimeout(dnRenderTop, 300); break;
        case 'weather': run('openWeatherModal'); break;
        case 'today': { const k = dnISO(new Date()); DN.wkOff = 0; dnSelectDay(k); dnOpenDay(k); const c = document.querySelector('.dn-cal'); if (c && !c.hidden) c.scrollIntoView({ behavior: DN_RM.matches ? 'auto' : 'smooth', block: 'center' }); break; }
        case 'saldo': run('openSaldoAdjust'); break;
        case 'mod-menu': dnOpenMenu(t); break;
        case 'opt': {
            const k = t.getAttribute('data-k');
            dnSetOpt(id, k, !dnOpt(id, k));
            dnRender(); dnFillMenu();
            break;
        }
        case 'view': {
            const v = t.getAttribute('data-v'); if (v === dnView()) break;
            dnSetOpt('week', 'view', v);
            dnRenderWeekCard(null, null, true);
            const p = dn$(v === 'ana' ? 'dnPaneAna' : 'dnPaneWeek');
            dnAnim(p, [{ opacity: 0, transform: 'translateX(' + (v === 'ana' ? 14 : -14) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'cubic-bezier(.23,1,.32,1)' });
            if (v === 'week') dnDrawLine(700);
            break;
        }
        case 'range': { const v = t.getAttribute('data-v'); DN.range = v === 'all' ? 'all' : +v; dnRenderAna(null, null, true); break; }
        case 'edit': dnCloseMenu(false); dnSetEdit(!DN.edit); break;
        case 'layout-reset': dnResetLayout(); break;
        case 'mod-hide': dnCloseMenu(false); if (l.hidden.indexOf(id) < 0) l.hidden.push(id); dnSaveLayout(l); dnFlip(dnApplyLayout); break;
        case 'mod-show': l.hidden = l.hidden.filter(function (x) { return x !== id; }); dnSaveLayout(l); dnFlip(dnApplyLayout); setTimeout(function () { dnRenderWeekCard(); }, 30); break;
        case 'mod-size': { const ss = DN_MODS[id].sizes; l.size[id] = ss[(ss.indexOf(l.size[id]) + 1) % ss.length]; dnSaveLayout(l); dnFlip(dnApplyLayout); dnFillMenu(); setTimeout(function () { dnRenderWeekCard(); }, 450); break; }
        case 'drawer-close': dnCloseEntry(); break;
        case 'entry': dnOpenEntry(); break;
        case 'entry-day': dnOpenEntry(t.getAttribute('data-k')); break;
        case 'weekview': dnCloseMenu(false); dnOpenWeek(DN.wkOff); break;
        case 'history': if (typeof switchTab === 'function') switchTab('history'); break;
        case 'vacplan': if (typeof switchTab === 'function') switchTab('urlaubsplaner'); break;
        case 'wk-prev': case 'wk-next': DN.wkOff += a === 'wk-prev' ? -1 : 1; DN._wkDir = a === 'wk-prev' ? -1 : 1; DN.sel = null; dnRenderWeek(true); break;
        case 'cal-prev': case 'cal-next': { const dir = a === 'cal-prev' ? -1 : 1; let m = DN.calM + dir, y = DN.calY; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } DN.calM = m; DN.calY = y; dnRenderCal(null, dir); break; }
        case 'cal-back': dnCloseDay(); break;
        case 't-start': if (typeof timerAction === 'function') timerAction('start'); DN._lastTs = null; dnTick(); break;
        case 't-pause': if (typeof timerAction === 'function') timerAction('pause'); DN._lastTs = null; dnTick(); break;
        case 't-stop': if (typeof timerAction === 'function') timerAction('stop'); break;
        default: break;
    }
}
document.addEventListener('pointerdown', function (e) { const g = e.target.closest && e.target.closest('[data-dn-grip]'); if (g && DN.edit && e.button === 0) { e.preventDefault(); dnDragStart(e, g); } });
document.addEventListener('keydown', function (e) {
    // Im Menue: Pfeiltasten wandern durch die Eintraege.
    if (DN.menu && DN.menu.el.contains(e.target) && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const it = [...DN.menu.el.querySelectorAll('button')], i = it.indexOf(e.target);
        it[(i + (e.key === 'ArrowDown' ? 1 : -1) + it.length) % it.length].focus();
        return;
    }
    const g = e.target.closest && e.target.closest('[data-dn-grip]'); if (!g) return;
    const dir = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : 0;
    if (dir) { e.preventDefault(); dnMoveBy(g.getAttribute('data-dn-grip'), dir); }
});
// Wochenansicht ist eine nachgeladene Ansicht (VIEW_SCRIPTS): erst wechseln,
// dann warten, bis ihre Funktionen da sind, dann die Woche setzen.
function dnOpenWeek(off) {
    if (typeof switchTab !== 'function') return;
    switchTab('weekview');
    let n = 0;
    (function warte() {
        if (typeof renderWeekView === 'function') { try { if (typeof wvOffset !== 'undefined') wvOffset = off; } catch (e) { /* var im fremden Skript */ } renderWeekView(); return; }
        if (n++ < 60) setTimeout(warte, 50);
    })();
}

if (document.readyState !== 'loading') dnBoot(); else document.addEventListener('DOMContentLoaded', dnBoot);
