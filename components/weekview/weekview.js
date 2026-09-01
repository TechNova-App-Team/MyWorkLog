// ═══ WEEKVIEW MODULE ═══
    // Die Woche ist die einzige Ebene, auf der UHRZEITEN noch hinpassen. Monat
    // und Jahr zeigen Mengen; hier sieht man, wann der Tag begann, wann er
    // endete und wie die sieben Tage gegeneinander verschoben sind.
    //
    // 🔴 Die alte Fassung nahm je Tag `entries.find(...)`, also den ERSTEN
    // Eintrag. Geteilte Schichten und Mehrfach-Eintraege — ein beworbenes
    // Feature — fielen damit still unter den Tisch, samt ihrer Stunden. Hier
    // traegt jede Zeile so viele Balken, wie der Tag Eintraege hat.

    var wvOffset = 0;              // 0 = laufende Woche, -1 = Vorwoche …
    var _wvMonths = null;          // Monats-Statistiken je Renderlauf

    function wvEN() { return document.documentElement.lang === 'en'; }
    function wvLoc() { return typeof mwlLocale === 'function' ? mwlLocale() : 'de-DE'; }
    function wvEsc(s) { return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s); }
    function wvN(v, dec) {
        if (typeof dec !== 'number') dec = 1;
        if (!isFinite(v)) v = 0;
        return Number(v).toLocaleString(wvLoc(), { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    function wvSigned(v, dec) { return (v >= 0 ? '+' : '−') + wvN(Math.abs(v), dec); }
    function wvCat(t) { return (typeof getTypeColor === 'function') ? getTypeColor(t) : '#888'; }
    function wvCatLabel(t) { return (typeof getTypeLabel === 'function') ? getTypeLabel(t) : t; }
    function wvClock(mins) {
        var m = ((Math.round(mins) % 1440) + 1440) % 1440;
        return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    }
    function wvToMin(s) {
        var p = String(s || '').split(':').map(Number);
        return (p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1])) ? p[0] * 60 + p[1] : null;
    }

    // Alle Zahlen kommen aus calculateMonthStats() — derselben Quelle wie
    // Monats- und Jahresansicht. Eine Woche kann zwei Monate beruehren, der
    // Cache haelt beide fuer den Renderlauf.
    function wvMonthStats(year, month) {
        if (!_wvMonths) _wvMonths = {};
        var k = year + '-' + month;
        if (!_wvMonths[k]) _wvMonths[k] = calculateMonthStats(month, year);
        return _wvMonths[k];
    }
    function wvDayStats(d) {
        var s = wvMonthStats(d.getFullYear(), d.getMonth());
        return (s.byDay || {})[toLocalISODate(d)] || null;
    }
    function wvWeekSaldo(monday) {
        var sum = 0, worked = 0, has = false;
        for (var i = 0; i < 7; i++) {
            var d = new Date(monday); d.setDate(d.getDate() + i);
            var s = wvDayStats(d);
            if (s) { sum += s.saldo; worked += s.worked; has = true; }
        }
        return { saldo: sum, worked: worked, has: has };
    }


    // ── Wochenregler, an den Datenbestand gebunden ──────────────────────
    function wvBounds() {
        var thisMonday = getWeekMonday(0).getTime();
        var lo = 0, hi = 0;
        (data.entries || []).forEach(function (e) {
            var raw = (e && e.date ? String(e.date) : '').split('T')[0];
            if (!raw) return;
            var d = new Date(raw + 'T00:00:00');
            if (isNaN(d.getTime())) return;
            d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
            d.setHours(0, 0, 0, 0);
            var off = Math.round((d.getTime() - thisMonday) / 604800000);
            if (off < lo) lo = off;
            if (off > hi) hi = off;
        });
        return { lo: lo, hi: hi };
    }

    function wvNav(dir) {
        var b = wvBounds();
        if (dir === 0) wvOffset = 0;
        else {
            var next = wvOffset + dir;
            if (next < b.lo || next > b.hi) return;
            wvOffset = next;
        }
        renderWeekView();
        if (typeof mwlEvent === 'function') mwlEvent('woche_gewechselt', { richtung: dir });
    }
    function wvPickWeek(offset) {
        wvOffset = offset;
        renderWeekView();
        if (typeof mwlEvent === 'function') mwlEvent('woche_gewechselt', { richtung: 0 });
    }


    // ══ Zeichnen ═════════════════════════════════════════════════════════
    function renderWeekView() {
        _wvMonths = null;                       // Cache je Renderlauf frisch
        var en = wvEN();
        var monday = getWeekMonday(wvOffset);
        var sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
        var loc = wvLoc();

        var titleEl = document.getElementById('wvTitle');
        if (titleEl) {
            titleEl.textContent = 'KW ' + getISOWeekNumber(monday) + ' · '
                + monday.toLocaleDateString(loc, { day: '2-digit', month: 'short' }) + ' – '
                + sunday.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' });
        }

        var nowBtn = document.getElementById('wvNow');
        if (nowBtn) {
            var kwNum = getISOWeekNumber(monday);
            var kwStr = (en ? 'Week ' : 'KW ') + kwNum;
            var now = new Date();
            if (monday.getFullYear() !== now.getFullYear()) {
                kwStr += ' \'' + String(monday.getFullYear()).slice(-2);
            }
            nowBtn.textContent = kwStr;
            nowBtn.title = wvOffset === 0
                ? (en ? 'Current week' : 'Aktuelle Woche')
                : (en ? 'Jump to current week' : 'Zur aktuellen Woche springen');
        }

        var b = wvBounds();
        var prev = document.getElementById('wvPrev'), next = document.getElementById('wvNext');
        if (prev) {
            prev.disabled = wvOffset - 1 < b.lo;
            if (!prev.firstChild && typeof mwlIcon === 'function') prev.innerHTML = mwlIcon('chevronLeft', 16);
        }
        if (next) {
            next.disabled = wvOffset + 1 > b.hi;
            if (!next.firstChild && typeof mwlIcon === 'function') next.innerHTML = mwlIcon('chevronRight', 16);
        }

        // Tage der Woche: Aggregate aus calculateMonthStats, Rohdaten fuer die Balken
        var raw = getWeekEntries(monday);
        var days = [];
        for (var i = 0; i < 7; i++) {
            var d = new Date(monday); d.setDate(d.getDate() + i);
            var key = toLocalISODate(d);
            var soll = (typeof getJobHours === 'function') ? getJobHours('primary', d.getDay())
                     : ((data.settings.hours && data.settings.hours[d.getDay()]) || 0);
            days.push({
                date: d, key: key, soll: soll,
                stats: wvDayStats(d),
                entries: raw.filter(function (e) { return e.date === key; })
            });
        }

        wvRenderVerdict(days, en);
        wvRenderPlan(days, en);
        wvRenderTrend(monday, en);
    }


    // ── Befund ───────────────────────────────────────────────────────────
    function wvRenderVerdict(days, en) {
        var worked = 0, expected = 0, workDays = 0, saldo = 0, breaks = 0, breakDays = 0;
        var starts = [], ends = [];
        days.forEach(function (d) {
            if (d.stats) {
                worked += d.stats.worked;
                expected += d.stats.expected;
                saldo += d.stats.saldo;
                if (d.stats.type === 'work') workDays++;
            }
            d.entries.forEach(function (e) {
                if (e.type !== 'work') return;
                var bm = parseFloat(e.breakMins) || 0;
                if (bm > 0) { breaks += bm; }
                var s = wvToMin(e.shiftStart), t = wvToMin(e.shiftEnd);
                if (s !== null && t !== null) { starts.push(s); ends.push(t <= s ? t + 1440 : t); }
            });
            if (d.entries.some(function (e) { return e.type === 'work' && (parseFloat(e.breakMins) || 0) > 0; })) breakDays++;
        });

        var numEl = document.getElementById('wvSaldo');
        if (numEl) {
            if (!days.some(function (d) { return d.stats; })) {
                numEl.className = 'wv-verdict__num';
                numEl.textContent = '—';
            } else {
                numEl.className = 'wv-verdict__num ' + (Math.abs(saldo) < 0.05 ? '' : (saldo > 0 ? 'is-plus' : 'is-minus'));
                numEl.innerHTML = wvEsc(wvSigned(saldo, 1)) + '<span class="wv-u">h</span>';
            }
        }

        var subEl = document.getElementById('wvHeadSub');
        var filled = days.filter(function (d) { return d.stats; }).length;
        if (subEl) {
            subEl.textContent = filled
                ? (en ? filled + ' of 7 days carry an entry · ' + days.filter(function (d) { return d.soll > 0; }).length + ' of them have a target'
                      : filled + ' von 7 Tagen tragen einen Eintrag · ' + days.filter(function (d) { return d.soll > 0; }).length + ' davon haben ein Soll')
                : (en ? 'Nothing recorded in this week yet.' : 'In dieser Woche ist noch nichts erfasst.');
        }

        var sayEl = document.getElementById('wvSay');
        if (sayEl) sayEl.textContent = wvSentence(days, saldo, workDays, en);

        var set = function (id, html, cls) {
            var el = document.getElementById(id);
            if (!el) return;
            el.className = 'wv-fact__v' + (cls ? ' ' + cls : '');
            el.innerHTML = html;
        };
        set('wvWorked', filled
            ? wvEsc(wvN(worked, 1)) + ' h<small>' + (en ? 'of ' : 'von ') + wvEsc(wvN(expected, 1)) + ' h ' + (en ? 'target' : 'Soll') + '</small>'
            : '—');
        set('wvDays', filled ? workDays + '<small>' + (en ? 'work days' : 'Arbeitstage') + '</small>' : '—');

        // Ø Anwesenheit: der Schnitt der Schichtfenster, nicht die Netto-Zeit.
        if (starts.length) {
            var avgS = starts.reduce(function (a, x) { return a + x; }, 0) / starts.length;
            var avgE = ends.reduce(function (a, x) { return a + x; }, 0) / ends.length;
            var n = starts.length;
            set('wvWindow', wvClock(avgS) + '–' + wvClock(avgE) + '<small>' + n
                + (en ? (n === 1 ? ' shift with times' : ' shifts with times')
                      : (n === 1 ? ' Schicht mit Uhrzeit' : ' Schichten mit Uhrzeit')) + '</small>');
        } else {
            set('wvWindow', '—<small>' + (en ? 'no clock times logged' : 'keine Uhrzeiten erfasst') + '</small>');
        }

        set('wvBreaks', breaks > 0
            ? wvEsc(wvN(breaks / 60, 1)) + ' h<small>' + (en ? 'across ' : 'auf ') + breakDays + (en ? ' days' : ' Tagen') + '</small>'
            : '—<small>' + (en ? 'no break logged' : 'keine Pause erfasst') + '</small>');
    }

    function wvSentence(days, saldo, workDays, en) {
        if (!days.some(function (d) { return d.stats; })) {
            return en ? 'The week fills itself with your first logged day.'
                      : 'Die Woche füllt sich mit deinem ersten erfassten Tag.';
        }
        var open = days.filter(function (d) { return d.soll > 0 && !d.stats && d.date <= new Date(); }).length;
        var abs = Math.abs(saldo);
        var state = abs < 0.5
            ? (en ? 'The week comes out level.' : 'Die Woche geht auf null auf.')
            : (saldo > 0
                ? (en ? 'You are ' + wvN(abs, 1) + ' h above target this week.' : 'Du liegst diese Woche ' + wvN(abs, 1) + ' h über dem Soll.')
                : (en ? wvN(abs, 1) + ' h are missing against target.' : 'Dir fehlen ' + wvN(abs, 1) + ' h auf das Soll.'));
        var tail = open
            ? (en ? ' ' + open + (open === 1 ? ' day with a target is still unlogged.' : ' days with a target are still unlogged.')
                  : ' ' + open + (open === 1 ? ' Tag mit Soll ist noch nicht erfasst.' : ' Tage mit Soll sind noch nicht erfasst.'))
            : (workDays ? (en ? ' All ' + workDays + ' work days are logged.' : ' Alle ' + workDays + ' Arbeitstage sind erfasst.') : '');
        return state + tail;
    }


    // ── Der Tagesablauf auf einer Uhrzeit-Achse ─────────────────────────
    function wvRenderPlan(days, en) {
        var host = document.getElementById('wvPlan');
        if (!host) return;
        var loc = wvLoc();

        // Achse aus den tatsaechlichen Schichten. Ohne Uhrzeiten in der Woche
        // waere jede feste Spanne geraten — dann steht die Spur leer und die
        // Zeilen sagen es im Klartext.
        var lo = Infinity, hi = -Infinity, timed = 0;
        days.forEach(function (d) {
            d.entries.forEach(function (e) {
                if (e.type !== 'work') return;
                var s = wvToMin(e.shiftStart), t = wvToMin(e.shiftEnd);
                if (s === null || t === null) return;
                if (t <= s) t += 1440;
                timed++;
                if (s < lo) lo = s;
                if (t > hi) hi = t;
            });
        });
        if (!timed) { lo = 6 * 60; hi = 20 * 60; }
        lo = Math.max(0, Math.floor(lo / 60) * 60 - 30);
        hi = Math.ceil(hi / 60) * 60 + 30;
        if (hi - lo < 6 * 60) hi = lo + 6 * 60;
        var span = hi - lo;
        var pos = function (m) { return ((m - lo) / span) * 100; };

        // Stundenmarken: bei langen Spannen nur jede zweite beschriften.
        var hours = Math.round(span / 60);
        var everyN = hours > 14 ? 2 : 1;
        var firstHour = Math.ceil(lo / 60);
        var lastHour = Math.floor(hi / 60);
        var marks = '';
        for (var h = firstHour; h <= lastHour; h++) {
            if ((h - firstHour) % everyN !== 0) continue;
            marks += '<span class="wv-plan__hour" style="left:' + pos(h * 60).toFixed(2) + '%">' + (h % 24) + '</span>';
        }
        var hstep = (100 / hours).toFixed(4) + '%';

        var todayKey = toLocalISODate(new Date());
        var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        var used = {};

        var rows = days.map(function (d) {
            var st = d.stats;
            var cls = 'wv-plan__row';
            if (d.key === todayKey) cls += ' is-today';
            if (!st && d.soll <= 0) cls += ' is-off';

            var bars = '';
            if (st) {
                used[st.type] = true;
                if (st.type === 'work') {
                    var drawn = 0;
                    d.entries.forEach(function (e) {
                        if (e.type !== 'work') return;
                        var s = wvToMin(e.shiftStart), t = wvToMin(e.shiftEnd);
                        if (s === null || t === null) return;
                        if (t <= s) t += 1440;
                        drawn++;
                        var bm = parseFloat(e.breakMins) || 0;
                        var tip = wvClock(s) + '–' + wvClock(t)
                                + ' · ' + wvN((parseFloat(e.worked) || 0), 1) + ' h'
                                + (bm > 0 ? ' · ' + Math.round(bm) + ' min ' + (en ? 'break' : 'Pause') : '');
                        bars += '<span class="wv-bar" style="left:' + pos(s).toFixed(2) + '%;width:'
                              + Math.max(0.6, pos(t) - pos(s)).toFixed(2) + '%;--cat:var(--primary)"'
                              + ' title="' + wvEsc(tip) + '"></span>';
                    });
                    if (!drawn) {
                        bars += '<span class="wv-bar is-untimed" style="--cat:var(--primary)" title="'
                              + wvEsc(en ? 'Logged as an hour count, without clock times' : 'Als Stundenzahl erfasst, ohne Uhrzeit') + '"></span>';
                    }
                } else {
                    bars += '<span class="wv-bar is-band" style="--cat:' + wvCat(st.type) + '" title="'
                          + wvEsc(wvCatLabel(st.type)) + '"></span>';
                }
            }
            if (d.key === todayKey && nowMin >= lo && nowMin <= hi) {
                bars += '<span class="wv-now" style="left:' + pos(nowMin).toFixed(2) + '%"></span>';
            }

            var sCls = (!st || Math.abs(st.saldo) < 0.05) ? '' : (st.saldo > 0 ? 'is-plus' : 'is-minus');
            var hours;
            if (st && st.type === 'work') {
                hours = wvEsc(wvN(st.worked, 1)) + ' h<small>/ ' + wvEsc(wvN(st.expected || d.soll, 1)) + '</small>';
            } else if (st) {
                hours = '<small>' + wvEsc(wvCatLabel(st.type)) + '</small>';
            } else {
                hours = d.soll > 0 ? '<small>' + wvEsc(wvN(d.soll, 1)) + ' h ' + (en ? 'target' : 'Soll') + '</small>' : '—';
            }

            return '<div class="' + cls + '">'
                 + '<div class="wv-plan__day">'
                   + '<div class="wv-plan__wd">' + wvEsc(d.date.toLocaleDateString(loc, { weekday: 'long' })) + '</div>'
                   + '<div class="wv-plan__date">' + wvEsc(d.date.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' })) + '</div>'
                 + '</div>'
                 + '<div class="wv-plan__track" style="--hstep:' + hstep + '">' + bars + '</div>'
                 + '<div class="wv-plan__h">' + hours + '</div>'
                 + '<div class="wv-plan__s ' + sCls + '">' + (st ? wvEsc(wvSigned(st.saldo, 1)) + ' h' : '—') + '</div>'
                 + '</div>';
        }).join('');

        host.innerHTML =
            '<div class="wv-plan__inner">'
            + '<div class="wv-plan__head">'
              + '<span></span>'
              + '<div class="wv-plan__hours">' + marks + '</div>'
              + '<span class="wv-plan__head-r">' + (en ? 'Worked / target' : 'Ist / Soll') + '</span>'
              + '<span class="wv-plan__head-r">' + (en ? 'Balance' : 'Saldo') + '</span>'
            + '</div>'
            + rows
            + '</div>'
            + '<p class="wv-plan__foot">' + wvEsc(en
                ? 'The bar spans presence from start to end of shift, so it is longer than the hours worked whenever a break was logged — the exact figures are in the tooltip. A day split into two shifts gets two bars.'
                : 'Der Balken ist die Anwesenheit von Schichtbeginn bis Schichtende und damit länger als die geleistete Zeit, sobald eine Pause erfasst ist — die genauen Werte stehen im Tooltip. Ein Tag mit zwei Schichten bekommt zwei Balken.') + '</p>';

        var subEl = document.getElementById('wvPlanSub');
        if (subEl) {
            subEl.textContent = timed
                ? (en ? 'All seven days on one clock axis, ' + wvClock(lo) + ' to ' + wvClock(hi) + '.'
                      : 'Alle sieben Tage auf einer Uhrzeit-Achse, ' + wvClock(lo) + ' bis ' + wvClock(hi) + '.')
                : (en ? 'No clock times in this week — log a start and end time and the days line up here.'
                      : 'Keine Uhrzeiten in dieser Woche. Erfasse Beginn und Ende, dann ordnen sich die Tage hier ein.');
        }

        var keyEl = document.getElementById('wvPlanKey');
        if (keyEl) {
            var cats = Object.keys(used).filter(function (t) { return t !== 'work'; });
            keyEl.innerHTML = (used.work ? '<span class="wv-key__item"><span class="wv-key__sw" style="--cat:var(--primary)"></span>'
                                          + wvEsc(en ? 'Presence' : 'Anwesenheit') + '</span>' : '')
                + cats.map(function (t) {
                    return '<span class="wv-key__item"><span class="wv-key__sw" style="--cat:' + wvCat(t) + ';opacity:.5"></span>'
                         + wvEsc(wvCatLabel(t)) + '</span>';
                  }).join('');
        }
    }


    // ── Acht Wochen ──────────────────────────────────────────────────────
    function wvRenderTrend(monday, en) {
        var host = document.getElementById('wvTrend');
        if (!host) return;

        var weeks = [];
        for (var i = -5; i <= 2; i++) {
            var m = new Date(monday); m.setDate(m.getDate() + i * 7);
            var w = wvWeekSaldo(m);
            weeks.push({ offset: wvOffset + i, monday: m, num: getISOWeekNumber(m),
                         saldo: w.saldo, worked: w.worked, has: w.has });
        }

        var withData = weeks.filter(function (w) { return w.has; });
        var maxAbs = withData.length ? Math.max.apply(null, withData.map(function (w) { return Math.abs(w.saldo); })) : 0;
        maxAbs = maxAbs > 0 ? maxAbs : 1;

        var subEl = document.getElementById('wvTrendSub');
        if (subEl) {
            subEl.textContent = withData.length
                ? (en ? 'Balance per week around a zero line — up is above target, down is below. A click opens that week.'
                      : 'Saldo je Woche um eine Nulllinie — nach oben über dem Soll, nach unten darunter. Ein Klick öffnet die Woche.')
                : (en ? 'Weeks appear here as soon as there are entries around this one.'
                      : 'Hier erscheinen die Wochen, sobald rund um diese Einträge liegen.');
        }

        var b = wvBounds();
        host.innerHTML = weeks.map(function (w) {
            var sel = w.offset === wvOffset;
            var cls = Math.abs(w.saldo) < 0.05 ? '' : (w.saldo > 0 ? 'is-plus' : 'is-minus');
            var h = (Math.abs(w.saldo) / maxAbs) * 50;
            var reach = w.offset >= b.lo && w.offset <= b.hi;
            return '<button type="button" class="wv-week' + (sel ? ' is-sel' : '') + '"'
                 + (reach ? ' onclick="wvPickWeek(' + w.offset + ')"' : ' disabled')
                 + ' aria-pressed="' + (sel ? 'true' : 'false') + '"'
                 + ' title="' + wvEsc('KW ' + w.num + ' · ' + wvN(w.worked, 1) + ' h · ' + wvSigned(w.saldo, 1) + ' h') + '">'
                 + '<span class="wv-week__val">' + wvEsc(w.has ? wvSigned(w.saldo, 1) : '—') + '</span>'
                 + '<span class="wv-week__plot">'
                   + '<span class="wv-week__zero"></span>'
                   + (cls ? '<span class="wv-week__bar ' + cls + '" style="--h:' + h.toFixed(2) + '%"></span>' : '')
                 + '</span>'
                 + '<span class="wv-week__lbl">KW ' + w.num + '</span>'
                 + '</button>';
        }).join('');
    }
