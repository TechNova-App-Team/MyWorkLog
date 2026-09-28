// ═══ GOALS MODULE ═══
//
// Speicher: data.settings.goals = [{ id, title, type, target }] — unverändert
// seit dem ersten Entwurf, damit bestehende Ziele weiterlaufen.
//
// Ehrlichkeitsregeln (siehe .claude/notes/auswertungen.md):
// - Jede Fortschrittsform hat einen benennbaren Nenner: den Zielwert des
//   Nutzers. Keine /1500-Balken, kein festes 40-h-Wochensoll mehr.
// - Das Wochensoll kommt aus getJobHours() über alle Jobs, nicht aus einer Zahl.
// - Die Hochrechnung sagt, woraus sie rechnet (letzte 8 Wochen) und schweigt,
//   wenn der Verlauf dafür zu kurz ist oder das Tempo nicht in Richtung Ziel geht.
// - Meilensteine werden aus den Daten berechnet, mit dem Tag, an dem sie
//   erreicht wurden. Bis v8.0.5 stand ein fest freigeschalteter Erfolg im Markup.

    var GL_PACE_DAYS = 56;          // Fenster der Hochrechnung: 8 Wochen
    var GL_POS_WEEK_MIN = 0.5;      // eine Woche zählt ab +0,5 h als „im Plus" (wie bisher)
    var GL_PERFECT_TOL = 0.1;       // punktgenau: Abweichung unter 6 Minuten
    var glEditingId = null;

    function glIsEN() { return document.documentElement.lang === 'en'; }
    function glT(de, en) { return glIsEN() ? en : de; }
    function glLocale() { return (typeof mwlLocale === 'function') ? mwlLocale() : 'de-DE'; }
    function glEsc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function glIcon(name, size) {
        return (typeof mwlIcon === 'function') ? mwlIcon(name, size || 16) : '';
    }

    // Datumsstrings sind lokale Kalendertage. new Date('2026-09-28') wäre UTC-
    // Mitternacht und verschiebt in Europa die Wochengrenze — das war der alte Fehler.
    function glParse(iso) { return new Date(iso + 'T00:00:00'); }
    function glISO(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function glAddDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function glMonday(d) {
        var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
        return x;
    }
    // ISO-Woche mit ISO-JAHR: der 29.12.2025 gehört zu KW 1/2026. Ein Schlüssel aus
    // getFullYear() + getWeek() hätte diese Woche in zwei Hälften gespalten.
    function glWeekKey(d) {
        var thu = glAddDays(glMonday(d), 3);
        var wk = (typeof getWeek === 'function') ? getWeek(d) : 0;
        return thu.getFullYear() + '-W' + String(wk).padStart(2, '0');
    }

    function glNum(v, digits) {
        var dgt = typeof digits === 'number' ? digits : 1;
        return Number(v || 0).toLocaleString(glLocale(), { minimumFractionDigits: dgt, maximumFractionDigits: dgt });
    }
    function glDate(iso, withYear) {
        var opts = withYear === false ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' };
        return glParse(iso).toLocaleDateString(glLocale(), opts);
    }

    function glEntries() {
        return (typeof data !== 'undefined' && data && Array.isArray(data.entries)) ? data.entries : [];
    }
    function glGoals() {
        if (typeof data === 'undefined' || !data || !data.settings) return [];
        if (!Array.isArray(data.settings.goals)) data.settings.goals = [];
        return data.settings.goals;
    }

    // ── Zieltypen ──────────────────────────────────────────────────────
    var GL_TYPES = {
        TOTAL_WORKED_HOURS: {
            icon: 'clock', hours: true,
            name: function () { return glT('Stunden erfassen', 'Log hours'); },
            desc: function () { return glT('Alle erfassten Stunden zusammen', 'All logged hours combined'); },
            unit: function (v) { return 'h'; },
            title: function (t) { return glT(glNum(t, 0) + ' Stunden erfassen', 'Log ' + glNum(t, 0) + ' hours'); }
        },
        TOTAL_DIFF_HOURS: {
            icon: 'trendingUp', hours: true, signed: true,
            name: function () { return glT('Saldo aufbauen', 'Build up balance'); },
            desc: function () { return glT('Überstunden minus Minusstunden', 'Overtime minus undertime'); },
            unit: function (v) { return 'h'; },
            title: function (t) { return glT('+' + glNum(t, 0) + ' h Saldo', '+' + glNum(t, 0) + ' h balance'); }
        },
        POSITIVE_WEEKS: {
            icon: 'calendarCheck',
            name: function () { return glT('Wochen im Plus', 'Weeks in the plus'); },
            desc: function () { return glT('Wochen mit mehr als 0,5 h über Soll', 'Weeks more than 0.5 h above target'); },
            unit: function (v) { return v === 1 ? glT('Woche', 'week') : glT('Wochen', 'weeks'); },
            title: function (t) { return glT(glNum(t, 0) + ' Wochen im Plus', glNum(t, 0) + ' weeks in the plus'); }
        },
        PERFECT_SHIFTS: {
            icon: 'target',
            name: function () { return glT('Punktgenaue Tage', 'Spot-on days'); },
            desc: function () { return glT('Arbeitstage auf 6 Minuten genau am Soll', 'Work days within 6 minutes of target'); },
            unit: function (v) { return v === 1 ? glT('Tag', 'day') : glT('Tage', 'days'); },
            title: function (t) { return glT(glNum(t, 0) + ' punktgenaue Tage', glNum(t, 0) + ' spot-on days'); }
        }
    };
    function glType(type) { return GL_TYPES[type] || GL_TYPES.TOTAL_WORKED_HOURS; }

    // Verlauf einer Kennzahl als Punkte [Datum, kumulierter Wert], chronologisch.
    // Aus EINER Reihe kommen aktueller Wert, Erreicht-Datum und Tempo — damit
    // können die drei nicht auseinanderlaufen.
    function glSeries(type) {
        var entries = glEntries().filter(function (e) { return e && e.date; })
            .slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
        var pts = [], acc = 0;
        if (type === 'POSITIVE_WEEKS') {
            var weeks = {}, order = [];
            entries.forEach(function (e) {
                var k = glWeekKey(glParse(e.date));
                if (!weeks[k]) { weeks[k] = { diff: 0, last: e.date }; order.push(k); }
                weeks[k].diff += Number(e.diff) || 0;
                weeks[k].last = e.date;
            });
            order.sort().forEach(function (k) {
                if (weeks[k].diff > GL_POS_WEEK_MIN) { acc += 1; pts.push([weeks[k].last, acc]); }
            });
            return pts;
        }
        entries.forEach(function (e) {
            var add = 0;
            if (type === 'TOTAL_WORKED_HOURS') add = Number(e.worked) || 0;
            else if (type === 'TOTAL_DIFF_HOURS') add = Number(e.diff) || 0;
            else if (type === 'PERFECT_SHIFTS') add = (e.type === 'work' && Math.abs(Number(e.diff) || 0) < GL_PERFECT_TOL) ? 1 : 0;
            if (!add) return;
            acc += add;
            // Mehrere Einträge am selben Tag zu einem Punkt zusammenfassen.
            if (pts.length && pts[pts.length - 1][0] === e.date) pts[pts.length - 1][1] = acc;
            else pts.push([e.date, acc]);
        });
        return pts;
    }
    function glValueAt(pts, iso) {
        var v = 0;
        for (var i = 0; i < pts.length && pts[i][0] <= iso; i++) v = pts[i][1];
        return v;
    }
    function glCurrent(pts) { return pts.length ? pts[pts.length - 1][1] : 0; }

    // Tag, an dem der Wert zuletzt von unter auf über das Ziel ging. Beim Saldo
    // kann er wieder fallen — dann gilt das Ziel nicht als erreicht.
    function glReachedOn(pts, target) {
        var day = null, prev = 0;
        for (var i = 0; i < pts.length; i++) {
            if (pts[i][1] >= target && prev < target) day = pts[i][0];
            prev = pts[i][1];
        }
        return glCurrent(pts) >= target ? day : null;
    }

    // Tempo je Woche aus den letzten 8 Wochen; kürzerer Verlauf wird anteilig
    // gerechnet, unter 14 Tagen gibt es keine Aussage.
    function glPace(pts) {
        var entries = glEntries();
        if (!entries.length) return null;
        var first = entries.reduce(function (m, e) { return e.date && e.date < m ? e.date : m; }, '9999');
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var spanDays = Math.round((today - glParse(first)) / 86400000);
        if (spanDays < 14) return null;
        var days = Math.min(GL_PACE_DAYS, spanDays);
        var from = glISO(glAddDays(today, -days));
        var gained = glCurrent(pts) - glValueAt(pts, from);
        return { perWeek: gained / (days / 7), days: days };
    }

    function glProgress(goal) {
        var pts = glSeries(goal.type);
        var cur = glCurrent(pts);
        var target = Number(goal.target) || 0;
        var pct = target > 0 ? Math.max(0, Math.min(1, cur / target)) : 0;
        return { pts: pts, cur: cur, target: target, pct: pct, reachedOn: target > 0 ? glReachedOn(pts, target) : null };
    }

    function glFmtValue(type, v) {
        var t = glType(type);
        if (t.hours) return (t.signed && v > 0 ? '+' : '') + glNum(v, 1);
        return glNum(v, 0);
    }

    // ── Diese Woche ────────────────────────────────────────────────────
    function glDaySoll(d) {
        var dow = d.getDay();
        if (typeof getJobs === 'function' && typeof getJobHours === 'function') {
            return getJobs().reduce(function (s, j) { return s + (Number(getJobHours(j.id, dow)) || 0); }, 0);
        }
        var h = (data.settings && data.settings.hours) || [];
        return Number(h[dow]) || 0;
    }

    function glRenderWeek() {
        var box = document.getElementById('glWeek');
        if (!box) return;
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var mon = glMonday(today);
        var todayIso = glISO(today);
        var byDay = {};
        glEntries().forEach(function (e) { if (e && e.date) byDay[e.date] = (byDay[e.date] || 0) + (Number(e.worked) || 0); });

        var days = [], sumW = 0, sumS = 0, plan = 0, done = 0, max = 0;
        for (var i = 0; i < 7; i++) {
            var d = glAddDays(mon, i), iso = glISO(d);
            var w = byDay[iso] || 0, s = glDaySoll(d);
            days.push({ d: d, iso: iso, w: w, s: s });
            sumW += w; sumS += s;
            if (s > 0) { plan++; if (w > 0) done++; }
            max = Math.max(max, w, s);
        }
        max = max || 1;

        var diff = sumW - sumS;
        var wd = glIsEN() ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        var cols = days.map(function (x, i) {
            var hBar = Math.round((x.w / max) * 1000) / 10;
            var hSoll = Math.round((x.s / max) * 1000) / 10;
            var cls = 'gl-day' + (x.iso === todayIso ? ' is-today' : '') + (x.iso > todayIso ? ' is-future' : '') + (x.s === 0 ? ' is-off' : '');
            var tip = glDate(x.iso, false) + ': ' + glNum(x.w, 1) + ' h' + (x.s ? glT(' von ', ' of ') + glNum(x.s, 1) + ' h Soll' : glT(', kein Soll', ', no target'));
            // Soll-Linie steht im Markup HINTER dem Balken, sonst liegt sie an
            // langen Tagen unter der Füllung (auswertungen.md, Referenzlinien).
            return '<li class="' + cls + '" title="' + glEsc(tip) + '">'
                + '<span class="gl-day__val">' + (x.w ? glNum(x.w, 1) : '') + '</span>'
                + '<span class="gl-day__plot">'
                +   '<span class="gl-day__bar" style="height:' + hBar + '%"></span>'
                +   (x.s ? '<span class="gl-day__soll" style="bottom:' + hSoll + '%"></span>' : '')
                + '</span>'
                + '<span class="gl-day__name">' + wd[i] + '</span>'
                + '</li>';
        }).join('');

        var kw = (typeof getWeek === 'function') ? getWeek(today) : '';
        var range = glDate(glISO(mon), false) + ' – ' + glDate(glISO(glAddDays(mon, 6)), false);
        var deltaTxt = sumS > 0
            ? (diff >= 0 ? glT('+' + glNum(diff, 1) + ' h über Soll', '+' + glNum(diff, 1) + ' h over target')
                         : glT(glNum(-diff, 1) + ' h fehlen noch', glNum(-diff, 1) + ' h still to go'))
            : glT('Für diese Woche ist kein Soll eingestellt', 'No target set for this week');

        box.innerHTML = ''
            + '<div class="gl-week__head">'
            +   '<h3 class="gl-section-title" id="glWeekTitle">' + glT('Diese Woche', 'This week') + '</h3>'
            +   '<span class="gl-week__range">' + glT('KW ', 'Week ') + kw + ', ' + range + '</span>'
            + '</div>'
            + '<div class="gl-week__body">'
            +   '<div class="gl-week__stats">'
            +     '<div class="gl-stat">'
            +       '<div class="gl-stat__value">' + glNum(sumW, 1) + '<small> h</small></div>'
            +       '<div class="gl-stat__label">' + (sumS > 0 ? glT('von ' + glNum(sumS, 1) + ' h Soll', 'of ' + glNum(sumS, 1) + ' h target') : glT('erfasst', 'logged')) + '</div>'
            +       '<div class="gl-stat__delta ' + (sumS > 0 ? (diff >= 0 ? 'is-pos' : 'is-open') : '') + '">' + deltaTxt + '</div>'
            +     '</div>'
            +     '<div class="gl-stat">'
            +       '<div class="gl-stat__value">' + done + '<small> / ' + plan + '</small></div>'
            +       '<div class="gl-stat__label">' + glT('Arbeitstage erfasst', 'work days logged') + '</div>'
            +     '</div>'
            +   '</div>'
            +   '<ol class="gl-days" aria-label="' + glT('Stunden je Tag, Linie = Tagessoll', 'Hours per day, line = daily target') + '">' + cols + '</ol>'
            + '</div>'
            + '<p class="gl-week__legend"><span class="gl-key gl-key--bar"></span>' + glT('erfasst', 'logged')
            + '<span class="gl-key gl-key--soll"></span>' + glT('Soll laut Einstellungen', 'target from settings') + '</p>';
    }

    // ── Zielkarten ─────────────────────────────────────────────────────
    function glPaceText(goal, p) {
        var t = glType(goal.type);
        var pace = glPace(p.pts);
        if (!pace) return glT('Für eine Hochrechnung ist der Verlauf noch zu kurz.', 'Not enough history for a forecast yet.');
        var rate = pace.perWeek;
        var rateTxt = glFmtValue(goal.type, rate) + (t.hours ? ' h' : '') + glT(' pro Woche', ' per week');
        if (rate <= 0.0001) {
            return glT('Zuletzt kein Fortschritt (' + rateTxt + ' in den letzten ' + Math.round(pace.days / 7) + ' Wochen).',
                       'No recent progress (' + rateTxt + ' over the last ' + Math.round(pace.days / 7) + ' weeks).');
        }
        var weeks = (p.target - p.cur) / rate;
        if (weeks > 260) return glT('Bei ' + rateTxt + ' dauert es noch über fünf Jahre.', 'At ' + rateTxt + ' this takes more than five years.');
        var when = glAddDays(new Date(), Math.ceil(weeks * 7));
        var month = when.toLocaleDateString(glLocale(), { month: 'long', year: 'numeric' });
        var wTxt = weeks < 1 ? glT('unter einer Woche', 'less than a week') : glT('ca. ' + Math.ceil(weeks) + ' Wochen', 'about ' + Math.ceil(weeks) + ' weeks');
        return glT('Bei ' + rateTxt + ' erreicht in ' + wTxt + ' (' + month + ').', 'At ' + rateTxt + ', reached in ' + wTxt + ' (' + month + ').');
    }

    function glCard(goal, p) {
        var t = glType(goal.type);
        var achieved = !!p.reachedOn;
        var unit = t.hours ? ' h' : ' ' + t.unit(p.target);
        var pctTxt = Math.floor(p.pct * 100) + ' %';
        var rest = p.target - p.cur;
        var foot;
        if (achieved) {
            foot = '<p class="gl-card__foot is-done">' + glIcon('checkCircle', 14) + '<span>' + glT('Erreicht am ', 'Reached on ') + glDate(p.reachedOn) + '</span></p>';
        } else {
            var restTxt = (t.hours ? glNum(rest, 1) + ' h' : glNum(Math.ceil(rest), 0) + ' ' + t.unit(Math.ceil(rest))) + glT(' fehlen', ' to go');
            foot = '<p class="gl-card__foot"><strong>' + restTxt + '.</strong> ' + glEsc(glPaceText(goal, p)) + '</p>';
        }
        var title = goal.title ? String(goal.title) : t.title(p.target);
        return '<article class="gl-card' + (achieved ? ' is-done' : '') + '" data-goal="' + glEsc(goal.id) + '">'
            + '<header class="gl-card__head">'
            +   '<span class="gl-card__icon" aria-hidden="true">' + glIcon(t.icon, 16) + '</span>'
            +   '<div class="gl-card__titles">'
            +     '<h4 class="gl-card__title">' + glEsc(title) + '</h4>'
            +     '<span class="gl-card__type">' + glEsc(t.name()) + '</span>'
            +   '</div>'
            +   '<div class="gl-card__actions">'
            +     '<button type="button" class="gl-icon-btn" onclick="glOpenComposer(' + Number(goal.id) + ')" aria-label="' + glEsc(glT('Ziel bearbeiten', 'Edit goal')) + '" title="' + glEsc(glT('Bearbeiten', 'Edit')) + '">'
            +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>'
            +     '</button>'
            +     '<button type="button" class="gl-icon-btn gl-icon-btn--danger" onclick="glDeleteGoal(' + Number(goal.id) + ')" aria-label="' + glEsc(glT('Ziel löschen', 'Delete goal')) + '" title="' + glEsc(glT('Löschen', 'Delete')) + '">'
            +       glIcon('trash', 16)
            +     '</button>'
            +   '</div>'
            + '</header>'
            + '<div class="gl-card__numbers">'
            +   '<span class="gl-card__value">' + glFmtValue(goal.type, p.cur) + '</span>'
            +   '<span class="gl-card__target">' + glT('von ', 'of ') + glFmtValue(goal.type, p.target) + unit + '</span>'
            +   '<span class="gl-card__pct">' + pctTxt + '</span>'
            + '</div>'
            + '<div class="gl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.floor(p.pct * 100) + '" aria-label="' + glEsc(title) + '">'
            +   '<span class="gl-bar__fill" style="width:' + (Math.round(p.pct * 1000) / 10) + '%"></span>'
            + '</div>'
            + foot
            + '</article>';
    }

    function glRenderGoals() {
        var list = document.getElementById('goalsList');
        var doneBox = document.getElementById('glDone');
        if (!list) return { active: 0, done: 0, next: null };
        var rows = glGoals().map(function (g) { return { g: g, p: glProgress(g) }; });
        var active = rows.filter(function (r) { return !r.p.reachedOn; }).sort(function (a, b) { return b.p.pct - a.p.pct; });
        var done = rows.filter(function (r) { return r.p.reachedOn; }).sort(function (a, b) { return a.p.reachedOn < b.p.reachedOn ? 1 : -1; });

        if (!rows.length) {
            list.innerHTML = glEmptyState();
        } else if (!active.length) {
            list.innerHTML = '<div class="gl-empty gl-empty--slim"><p>' + glT('Alle Ziele erreicht. Zeit für ein neues?', 'All goals reached. Time for a new one?') + '</p>'
                + '<button type="button" class="gl-btn" onclick="glOpenComposer()">' + glIcon('plus', 16) + '<span>' + glT('Neues Ziel', 'New goal') + '</span></button></div>';
        } else {
            list.innerHTML = active.map(function (r) { return glCard(r.g, r.p); }).join('');
        }
        if (doneBox) {
            doneBox.innerHTML = done.length
                ? '<h4 class="gl-subhead">' + glT('Erreicht', 'Reached') + ' <span>' + done.length + '</span></h4>'
                  + '<div class="gl-grid">' + done.map(function (r) { return glCard(r.g, r.p); }).join('') + '</div>'
                : '';
        }
        return { active: active.length, done: done.length, next: active[0] || null, total: rows.length };
    }

    // Leerer Zustand mit Vorschlägen, die vom eigenen Stand aus gerechnet sind —
    // „500 Stunden" für jemanden mit 470 h, nicht für jemanden mit 12 h.
    function glSuggestions() {
        var out = [];
        var worked = glCurrent(glSeries('TOTAL_WORKED_HOURS'));
        var steps = [100, 250, 500, 1000, 1500, 2000, 3000, 5000];
        var nextH = steps.filter(function (s) { return s > worked + 5; })[0] || Math.ceil((worked + 500) / 500) * 500;
        out.push({ type: 'TOTAL_WORKED_HOURS', target: nextH });
        var weeks = glCurrent(glSeries('POSITIVE_WEEKS'));
        out.push({ type: 'POSITIVE_WEEKS', target: [4, 10, 25, 50, 100].filter(function (s) { return s > weeks; })[0] || weeks + 25 });
        var perfect = glCurrent(glSeries('PERFECT_SHIFTS'));
        out.push({ type: 'PERFECT_SHIFTS', target: [10, 25, 50, 100, 250].filter(function (s) { return s > perfect; })[0] || perfect + 50 });
        return out;
    }

    function glEmptyState() {
        var sug = glSuggestions().map(function (s) {
            var t = glType(s.type);
            return '<button type="button" class="gl-suggest" onclick="glQuickAdd(\'' + s.type + '\',' + s.target + ')">'
                + '<span class="gl-card__icon" aria-hidden="true">' + glIcon(t.icon, 16) + '</span>'
                + '<span class="gl-suggest__text"><strong>' + glEsc(t.title(s.target)) + '</strong><small>' + glEsc(t.desc()) + '</small></span>'
                + '<span class="gl-suggest__add">' + glIcon('plus', 16) + '</span>'
                + '</button>';
        }).join('');
        return '<div class="gl-empty">'
            + '<p class="gl-empty__lead">' + glT('Noch kein Ziel. Übernimm einen Vorschlag mit einem Klick oder leg ein eigenes an.', 'No goal yet. Take a suggestion with one click or create your own.') + '</p>'
            + '<div class="gl-suggest-list">' + sug + '</div>'
            + '</div>';
    }

    // ── Meilensteine ───────────────────────────────────────────────────
    var GL_MILESTONES = [
        { type: 'TOTAL_WORKED_HOURS', target: 1,    icon: 'flame', de: 'Erste Stunde erfasst',  en: 'First hour logged' },
        { type: 'TOTAL_WORKED_HOURS', target: 100,  icon: 'clock', de: '100 Stunden',           en: '100 hours' },
        { type: 'TOTAL_WORKED_HOURS', target: 500,  icon: 'medal', de: '500 Stunden',           en: '500 hours' },
        { type: 'TOTAL_WORKED_HOURS', target: 1000, icon: 'award', de: '1.000 Stunden',         en: '1,000 hours' },
        { type: 'POSITIVE_WEEKS',     target: 4,    icon: 'calendarCheck', de: '4 Wochen im Plus',  en: '4 weeks in the plus' },
        { type: 'POSITIVE_WEEKS',     target: 12,   icon: 'trendingUp',    de: '12 Wochen im Plus', en: '12 weeks in the plus' },
        { type: 'PERFECT_SHIFTS',     target: 10,   icon: 'target', de: '10 punktgenaue Tage',  en: '10 spot-on days' },
        { type: 'PERFECT_SHIFTS',     target: 50,   icon: 'crown',  de: '50 punktgenaue Tage',  en: '50 spot-on days' }
    ];

    function glRenderMilestones() {
        var box = document.getElementById('trophiesList');
        if (!box) return;
        var cache = {};
        var got = 0;
        var html = GL_MILESTONES.map(function (m) {
            var pts = cache[m.type] || (cache[m.type] = glSeries(m.type));
            var cur = glCurrent(pts);
            var on = glReachedOn(pts, m.target);
            if (on) got++;
            var t = glType(m.type);
            var sub = on
                ? glT('am ', 'on ') + glDate(on)
                : glNum(Math.floor(Math.min(cur, m.target)), 0) + ' / ' + glNum(m.target, 0) + (t.hours ? ' h' : '');
            var pct = Math.max(0, Math.min(1, cur / m.target));
            return '<li class="gl-mile' + (on ? ' is-got' : '') + '">'
                + '<span class="gl-mile__icon" aria-hidden="true">' + glIcon(on ? m.icon : 'lock', 18) + '</span>'
                + '<span class="gl-mile__name">' + glT(m.de, m.en) + '</span>'
                + '<span class="gl-mile__sub">' + sub + '</span>'
                + (on ? '' : '<span class="gl-mile__track" aria-hidden="true"><span style="width:' + (Math.round(pct * 1000) / 10) + '%"></span></span>')
                + '</li>';
        }).join('');
        box.innerHTML = html;
        var note = document.getElementById('glMilesNote');
        if (note) note.textContent = glT(got + ' von ' + GL_MILESTONES.length + ' erreicht', got + ' of ' + GL_MILESTONES.length + ' reached');
    }

    // ── Einstieg ───────────────────────────────────────────────────────
    function renderGoalsView() {
        if (!document.getElementById('view-goals')) return;
        glRenderWeek();
        var s = glRenderGoals();
        glRenderMilestones();
        var sub = document.getElementById('glSubtitle');
        if (sub) {
            if (!s.total) sub.textContent = glT('Setz dir ein Ziel und sieh, wann du es bei deinem Tempo erreichst.', 'Set a goal and see when you will reach it at your pace.');
            else sub.textContent = glT(
                s.done + ' von ' + s.total + (s.total === 1 ? ' Ziel' : ' Zielen') + ' erreicht',
                s.done + ' of ' + s.total + (s.total === 1 ? ' goal' : ' goals') + ' reached');
        }
        var composer = document.getElementById('glComposer');
        if (composer && !composer.hidden) glRenderComposer();
    }

    // ── Anlegen und Bearbeiten ─────────────────────────────────────────
    var glDraft = { type: 'TOTAL_WORKED_HOURS', target: '', title: '' };

    function glOpenComposer(id) {
        var box = document.getElementById('glComposer');
        if (!box) return;
        var goal = (id != null) ? glGoals().filter(function (g) { return g.id === id; })[0] : null;
        glEditingId = goal ? goal.id : null;
        glDraft = goal
            ? { type: goal.type, target: String(goal.target), title: goal.title || '' }
            : { type: 'TOTAL_WORKED_HOURS', target: '', title: '' };
        box.hidden = false;
        glRenderComposer();
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var focusEl = document.getElementById('glTarget');
        if (focusEl) setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 60);
    }

    function glCloseComposer() {
        var box = document.getElementById('glComposer');
        if (box) { box.hidden = true; box.innerHTML = ''; }
        glEditingId = null;
        var btn = document.getElementById('glNewBtn');
        if (btn) btn.focus({ preventScroll: true });
    }

    function glRenderComposer() {
        var box = document.getElementById('glComposer');
        if (!box) return;
        var types = Object.keys(GL_TYPES).map(function (k) {
            var t = GL_TYPES[k];
            var cur = glCurrent(glSeries(k));
            return '<label class="gl-type' + (glDraft.type === k ? ' is-on' : '') + '">'
                + '<input type="radio" name="glType" value="' + k + '"' + (glDraft.type === k ? ' checked' : '') + ' onchange="glSetType(this.value)">'
                + '<span class="gl-card__icon" aria-hidden="true">' + glIcon(t.icon, 16) + '</span>'
                + '<span class="gl-type__text"><strong>' + glEsc(t.name()) + '</strong><small>' + glEsc(t.desc()) + '</small></span>'
                + '<span class="gl-type__now">' + glT('jetzt ', 'now ') + glFmtValue(k, cur) + (t.hours ? ' h' : '') + '</span>'
                + '</label>';
        }).join('');

        var t = glType(glDraft.type);
        var cur = glCurrent(glSeries(glDraft.type));
        var base = t.hours ? [100, 250, 500, 1000, 1500, 2000] : [5, 10, 25, 50, 100, 200];
        if (glDraft.type === 'TOTAL_DIFF_HOURS') base = [10, 20, 40, 80, 120];
        var chips = base.filter(function (v) { return v > cur; }).slice(0, 4).map(function (v) {
            return '<button type="button" class="gl-chip' + (String(v) === String(glDraft.target) ? ' is-on' : '') + '" onclick="glSetTarget(' + v + ')">' + glNum(v, 0) + (t.hours ? ' h' : '') + '</button>';
        }).join('');
        var editing = glEditingId != null;
        var ph = Number(glDraft.target) > 0 ? t.title(Number(glDraft.target)) : t.name();

        box.innerHTML = ''
            + '<div class="gl-composer__head">'
            +   '<h3 class="gl-section-title" id="glComposerTitle">' + (editing ? glT('Ziel bearbeiten', 'Edit goal') : glT('Neues Ziel', 'New goal')) + '</h3>'
            +   '<button type="button" class="gl-icon-btn" onclick="glCloseComposer()" aria-label="' + glEsc(glT('Schließen', 'Close')) + '">' + glIcon('x', 16) + '</button>'
            + '</div>'
            + '<fieldset class="gl-types"><legend class="gl-label">' + glT('Was willst du erreichen?', 'What do you want to reach?') + '</legend><div class="gl-types__grid">' + types + '</div></fieldset>'
            + '<div class="gl-fields">'
            +   '<div class="gl-field">'
            +     '<label class="gl-label" for="glTarget">' + glT('Zielwert', 'Target') + '</label>'
            +     '<div class="gl-input-wrap"><input id="glTarget" class="gl-input" type="number" inputmode="decimal" min="0" step="' + (t.hours ? '0.5' : '1') + '" value="' + glEsc(glDraft.target) + '" oninput="glDraft.target=this.value;glValidate(false)"><span class="gl-input-unit">' + (t.hours ? 'h' : t.unit(2)) + '</span></div>'
            +     (chips ? '<div class="gl-chips">' + chips + '</div>' : '')
            +     '<p class="gl-error" id="glTargetErr" hidden></p>'
            +   '</div>'
            +   '<div class="gl-field">'
            +     '<label class="gl-label" for="glTitle">' + glT('Name', 'Name') + ' <span class="gl-optional">' + glT('optional', 'optional') + '</span></label>'
            +     '<input id="glTitle" class="gl-input" type="text" maxlength="60" placeholder="' + glEsc(ph) + '" value="' + glEsc(glDraft.title) + '" oninput="glDraft.title=this.value">'
            +   '</div>'
            + '</div>'
            + '<div class="gl-composer__foot">'
            +   '<button type="button" class="gl-btn gl-btn--ghost" onclick="glCloseComposer()">' + glT('Abbrechen', 'Cancel') + '</button>'
            +   '<button type="button" class="gl-btn gl-btn--primary" onclick="glSaveGoal()">' + (editing ? glT('Speichern', 'Save') : glT('Ziel anlegen', 'Create goal')) + '</button>'
            + '</div>';
    }

    function glSetType(type) {
        if (!GL_TYPES[type]) return;
        if (glDraft.type !== type) glDraft.target = '';
        glDraft.type = type;
        glRenderComposer();
    }
    function glSetTarget(v) {
        glDraft.target = String(v);
        glRenderComposer();
    }

    function glValidate(show) {
        var err = document.getElementById('glTargetErr');
        var input = document.getElementById('glTarget');
        var v = parseFloat(String(glDraft.target).replace(',', '.'));
        var msg = '';
        if (!(v > 0)) msg = glT('Gib einen Zielwert über 0 ein.', 'Enter a target above 0.');
        else if (!glType(glDraft.type).hours && Math.floor(v) !== v) msg = glT('Hier zählen ganze Zahlen.', 'Whole numbers only here.');
        if (err) {
            if (msg && show) { err.textContent = msg; err.hidden = false; if (input) input.setAttribute('aria-invalid', 'true'); }
            else if (!msg) { err.hidden = true; if (input) input.removeAttribute('aria-invalid'); }
        }
        return msg ? null : v;
    }

    function glSaveGoal() {
        var v = glValidate(true);
        if (v == null) { var i = document.getElementById('glTarget'); if (i) i.focus(); return; }
        var title = String(glDraft.title || '').trim();
        var goals = glGoals();
        if (glEditingId != null) {
            goals.forEach(function (g) {
                if (g.id === glEditingId) { g.type = glDraft.type; g.target = v; g.title = title; }
            });
        } else {
            goals.push({ id: Date.now(), title: title, type: glDraft.type, target: v });
            if (typeof mwlEvent === 'function') mwlEvent('ziel_angelegt', { typ: glDraft.type });
        }
        if (typeof save === 'function') save();
        glCloseComposer();
        renderGoalsView();
    }

    function glQuickAdd(type, target) {
        if (!GL_TYPES[type] || !(target > 0)) return;
        glGoals().push({ id: Date.now(), title: '', type: type, target: target });
        if (typeof mwlEvent === 'function') mwlEvent('ziel_angelegt', { typ: type, vorschlag: true });
        if (typeof save === 'function') save();
        renderGoalsView();
    }

    function glDeleteGoal(id) {
        var goal = glGoals().filter(function (g) { return g.id === id; })[0];
        if (!goal) return;
        var name = goal.title || glType(goal.type).title(goal.target);
        var run = function () {
            data.settings.goals = glGoals().filter(function (g) { return g.id !== id; });
            if (typeof save === 'function') save();
            if (glEditingId === id) glCloseComposer();
            renderGoalsView();
        };
        if (typeof showCustomConfirm === 'function') {
            showCustomConfirm(glT('Ziel löschen?', 'Delete goal?'),
                glT('„' + name + '“ wird entfernt. Deine Einträge bleiben unverändert.', '“' + name + '” will be removed. Your entries stay unchanged.'),
                run, null);
        } else run();
    }

    // Name bleibt: dashboard.js, init-app.js, settings-panel.js und die
    // Tab-Navigation rufen ihn.
    window.renderGoalsView = renderGoalsView;
