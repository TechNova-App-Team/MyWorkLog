// ═══ MONTHCOMPARE MODULE ═══
    // Ein Monat, ein Regler. Vorher gab es zwei: ein Dropdown fuer die Analyse
    // und Pfeiltasten fuer den Kalender daneben — beide mit eigenem Zustand.
    // Wer den Kalender auf Maerz blaetterte, las darunter weiter August, und
    // nichts im Bild sagte das. Das Dropdown kannte ausserdem nur das laufende
    // Jahr, ein Dezember/Januar-Vergleich war damit unmoeglich.

    var mcYear = new Date().getFullYear();
    var mcMonth = new Date().getMonth();

    var MC_CATS = ['work', 'school', 'vacation', 'gleittag', 'sick', 'holiday'];
    // Farbe haengt an der Kategorie, nie an der Position — sonst faerbt
    // Sortieren oder Ausblenden die Serien um.
    var MC_COLOR = {
        work:     'var(--primary)',
        school:   'var(--school)',
        vacation: 'var(--success)',
        gleittag: 'var(--audit-warn)',
        sick:     'var(--danger)',
        holiday:  'var(--holiday)',
        none:     'var(--role-neutral, rgba(255,255,255,0.16))'
    };

    // ── Kleinkram ────────────────────────────────────────────────────────
    function mcEN() { return document.documentElement.lang === 'en'; }
    function mcLoc() { return typeof mwlLocale === 'function' ? mwlLocale() : 'de-DE'; }
    function mcEsc(s) { return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s); }
    function mcN(v, dec) {
        if (typeof dec !== 'number') dec = 1;
        if (!isFinite(v)) v = 0;
        return Number(v).toLocaleString(mcLoc(), { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    function mcSigned(v, dec) { return (v >= 0 ? '+' : '−') + mcN(Math.abs(v), dec); }
    function mcDateKey(y, m, d) {
        return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    }
    // 🔴 NICHT toISOString(): das ist UTC. Abends nach 22 Uhr liefert es in
    // Mitteleuropa bereits den Folgetag — „heute" saesse dann im Kalender
    // einen Tag zu weit rechts.
    function mcToday() {
        var n = new Date();
        return mcDateKey(n.getFullYear(), n.getMonth(), n.getDate());
    }
    function mcMonthName(y, m, long) {
        return new Date(y, m, 1).toLocaleDateString(mcLoc(), long ? { month: 'long', year: 'numeric' } : { month: 'short' });
    }
    function mcTypeLabel(t) {
        if (t === 'none') return mcEN() ? 'No entry' : 'Ohne Eintrag';
        return (typeof getTypeLabel === 'function') ? getTypeLabel(t) : t;
    }


    // ── Navigation: ein Regler, an den Datenbestand gebunden ─────────────
    function mcBounds() {
        var now = new Date();
        var lo = new Date(now.getFullYear(), now.getMonth(), 1);
        var hi = new Date(now.getFullYear(), now.getMonth(), 1);
        (data.entries || []).forEach(function (e) {
            var raw = (e && e.date ? String(e.date) : '').split('T')[0];
            if (!raw) return;
            var d = new Date(raw + 'T00:00:00');
            if (isNaN(d.getTime())) return;
            var f = new Date(d.getFullYear(), d.getMonth(), 1);
            if (f < lo) lo = f;
            if (f > hi) hi = f;   // geplante Eintraege duerfen in die Zukunft reichen
        });
        return { lo: lo, hi: hi };
    }

    function mcNav(dir) {
        var b = mcBounds();
        if (dir === 0) {
            var now = new Date();
            mcYear = now.getFullYear(); mcMonth = now.getMonth();
        } else {
            var next = new Date(mcYear, mcMonth + dir, 1);
            if (next < b.lo || next > b.hi) return;
            mcYear = next.getFullYear(); mcMonth = next.getMonth();
        }
        renderMonthCompareView();
        if (typeof mwlEvent === 'function') mwlEvent('monat_gewechselt', { richtung: dir });
    }

    function mcPickMonth(y, m) {
        mcYear = y; mcMonth = m;
        renderMonthCompareView();
        if (typeof mwlEvent === 'function') mwlEvent('monat_gewechselt', { richtung: 0 });
    }


    // ══ Zeichnen ═════════════════════════════════════════════════════════
    function renderMonthCompareView() {
        var en = mcEN();
        var stats = calculateMonthStats(mcMonth, mcYear);
        var daysInMonth = new Date(mcYear, mcMonth + 1, 0).getDate();

        var titleEl = document.getElementById('mcTitle');
        if (titleEl) {
            var name = mcMonthName(mcYear, mcMonth, true);
            titleEl.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        }

        var nowBtn = document.getElementById('mcNow');
        if (nowBtn) {
            var now = new Date();
            var isCurrent = mcYear === now.getFullYear() && mcMonth === now.getMonth();
            var mName = mcMonthName(mcYear, mcMonth, true);
            nowBtn.textContent = mName.charAt(0).toUpperCase() + mName.slice(1);
            nowBtn.title = isCurrent
                ? (en ? 'Current month' : 'Aktueller Monat')
                : (en ? 'Jump to current month' : 'Zum aktuellen Monat springen');
        }

        // Blaettern nur so weit, wie Daten reichen — ein Knopf, der ins Leere
        // fuehrt, ist kein Knopf.
        var b = mcBounds();
        var prevBtn = document.getElementById('mcPrev');
        var nextBtn = document.getElementById('mcNext');
        if (prevBtn) {
            prevBtn.disabled = new Date(mcYear, mcMonth - 1, 1) < b.lo;
            if (!prevBtn.firstChild && typeof mwlIcon === 'function') prevBtn.innerHTML = mwlIcon('chevronLeft', 16);
        }
        if (nextBtn) {
            nextBtn.disabled = new Date(mcYear, mcMonth + 1, 1) > b.hi;
            if (!nextBtn.firstChild && typeof mwlIcon === 'function') nextBtn.innerHTML = mwlIcon('chevronRight', 16);
        }

        var entryDays = Object.keys(stats.byDay || {}).length;
        var subEl = document.getElementById('mcHeadSub');
        if (subEl) {
            subEl.textContent = entryDays
                ? (en ? entryDays + ' of ' + daysInMonth + ' days carry an entry · ' + stats.workDays + ' work days'
                      : entryDays + ' von ' + daysInMonth + ' Tagen tragen einen Eintrag · ' + stats.workDays + ' Arbeitstage')
                : (en ? 'No entry in this month yet.' : 'In diesem Monat ist noch nichts erfasst.');
        }

        mcRenderVerdict(stats, en);
        mcRenderCalendar(stats, daysInMonth, en);
        mcRenderStrip(stats, en);
        mcRenderWeeks(stats, en);
        mcRenderMix(stats, daysInMonth, en);
    }


    // ── Befund ───────────────────────────────────────────────────────────
    function mcRenderVerdict(stats, en) {
        var expected = stats.expected || 0;
        var numEl = document.getElementById('mcSaldo');
        if (numEl) {
            if (!stats.workDays) {
                numEl.className = 'mc-verdict__num';
                numEl.textContent = '—';
            } else {
                numEl.className = 'mc-verdict__num ' + (Math.abs(stats.saldo) < 0.05 ? '' : (stats.saldo > 0 ? 'is-plus' : 'is-minus'));
                numEl.innerHTML = mcEsc(mcSigned(stats.saldo, 1)) + '<span class="mc-u">h</span>';
            }
        }

        var sayEl = document.getElementById('mcSaldoSay');
        if (sayEl) sayEl.textContent = mcVerdictSentence(stats, en);

        var set = function (id, txt, cls) {
            var el = document.getElementById(id);
            if (!el) return;
            el.className = 'mc-fact__v' + (cls ? ' ' + cls : '');
            el.innerHTML = txt;
        };
        set('mcWorked', stats.workDays ? mcEsc(mcN(stats.worked, 1)) + ' h' : '—');
        set('mcExpected', expected > 0 ? mcEsc(mcN(expected, 1)) + ' h' : '—');
        set('mcAvgDay', stats.workDays
            ? mcEsc(mcN(stats.worked / stats.workDays, 1)) + ' h<small>' + stats.workDays + (en ? ' work days' : ' Arbeitstage') + '</small>'
            : '—');
    }

    function mcVerdictSentence(stats, en) {
        if (!stats.workDays) {
            return en ? 'No work day recorded in this month. Everything below fills itself once you log one.'
                      : 'In diesem Monat ist kein Arbeitstag erfasst. Alles darunter füllt sich, sobald einer dazukommt.';
        }
        var abs = Math.abs(stats.saldo);
        var state = abs < 1
            ? (en ? 'The month came out level.' : 'Der Monat geht praktisch auf null auf.')
            : (stats.saldo > 0
                ? (en ? 'You worked ' + mcN(abs, 1) + ' h beyond target this month.' : 'Du hast ' + mcN(abs, 1) + ' h mehr geleistet als gefordert.')
                : (en ? mcN(abs, 1) + ' h are missing against target.' : mcN(abs, 1) + ' h fehlen gegenüber dem Soll.'));

        var over = stats.overDays || 0, under = stats.underDays || 0;
        var shape;
        if (over && under) {
            shape = en ? over + ' days ran long, ' + under + ' fell short.'
                       : over + ' Tage liefen länger, ' + under + ' kürzer.';
        } else if (over) {
            shape = en ? 'Every longer day pushed in the same direction.' : 'Alle Abweichungen zeigten in dieselbe Richtung.';
        } else if (under) {
            shape = en ? 'No single day went beyond its target.' : 'Kein einzelner Tag ging über sein Soll hinaus.';
        } else {
            shape = en ? 'Every day landed on its target.' : 'Jeder Tag traf sein Soll.';
        }
        return state + ' ' + shape;
    }


    // ── Kalenderraster: das Signaturbild ────────────────────────────────
    // Vorher ein farbiges Kaestchen je Tag — es zeigte, DASS etwas erfasst
    // war, nie wie lang der Tag wurde. Jetzt ist die Fuellhoehe die Zeit und
    // die Haarlinie das Tagessoll; der Wochentag bleibt an seiner Spalte.
    function mcRenderCalendar(stats, daysInMonth, en) {
        var grid = document.getElementById('mcCalGrid');
        if (!grid) return;

        var byDay = stats.byDay || {};
        var max = 0;
        Object.keys(byDay).forEach(function (k) {
            var d = byDay[k];
            if (d.worked > max) max = d.worked;
            if (d.expected > max) max = d.expected;
        });
        max = max > 0 ? max * 1.1 : 1;

        var html = '';
        var loc = mcLoc();
        for (var w = 0; w < 7; w++) {
            var wd = new Date(2024, 0, 8 + w); // 8.1.2024 war ein Montag
            html += '<span class="mc-cal__wd">' + mcEsc(wd.toLocaleDateString(loc, { weekday: 'short' })) + '</span>';
        }

        var first = new Date(mcYear, mcMonth, 1).getDay();
        var lead = first === 0 ? 6 : first - 1;      // Woche beginnt Montag
        for (var i = 0; i < lead; i++) html += '<span class="mc-cal__void"></span>';

        var today = mcToday();
        var used = {};
        for (var d = 1; d <= daysInMonth; d++) {
            var key = mcDateKey(mcYear, mcMonth, d);
            var day = byDay[key];
            var dow = new Date(mcYear, mcMonth, d).getDay();
            var soll = (typeof getJobHours === 'function') ? getJobHours('primary', dow)
                     : ((data.settings.hours && data.settings.hours[dow]) || 0);

            var cls = 'mc-day', style = '', title = mcEsc(mcLongDate(key));
            if (key === today) cls += ' is-today';

            if (day) {
                used[day.type] = true;
                style += '--cat:' + MC_COLOR[day.type] + ';';
                if (day.worked > 0) {
                    cls += ' has-hours';
                    style += '--fill:' + Math.min(100, (day.worked / max) * 100).toFixed(2) + '%;';
                    title += ' · ' + mcTypeLabel(day.type) + ' · ' + mcN(day.worked, 1) + ' h';
                    if (day.expected > 0) title += ' / ' + mcN(day.expected, 1) + ' h';
                } else {
                    cls += ' is-flat';
                    title += ' · ' + mcTypeLabel(day.type);
                }
            } else {
                cls += soll > 0 ? ' is-empty' : ' is-off';
                title += ' · ' + (en ? 'no entry' : 'kein Eintrag');
            }

            var sollPct = (day && day.expected > 0) ? day.expected : soll;
            var sollMark = sollPct > 0
                ? '<span class="mc-day__soll" style="--soll:' + Math.min(100, (sollPct / max) * 100).toFixed(2) + '%"></span>'
                : '';

            html += '<button type="button" class="' + cls + '" style="' + style + '" title="' + title + '"'
                  + ' onclick="mwlOpenDayInForm(\'' + key + '\')">'
                  + '<span class="mc-day__n">' + d + '</span>'
                  + '<span class="mc-day__bar"></span>'
                  // Sollmarke NACH dem Balken: beide sind positioniert, ohne
                  // z-index entscheidet die Quelltextreihenfolge — davor lag die
                  // Linie unter der Fuellung und war an langen Tagen unsichtbar.
                  + sollMark
                  + '</button>';
        }
        grid.innerHTML = html;

        // Legende nur fuer Arten, die in diesem Monat wirklich vorkommen.
        var keyEl = document.getElementById('mcCalKey');
        if (keyEl) {
            keyEl.innerHTML = MC_CATS.filter(function (c) { return used[c]; }).map(function (c) {
                return '<span class="mc-key__item"><span class="mc-key__sw" style="--cat:' + MC_COLOR[c] + '"></span>'
                     + mcEsc(mcTypeLabel(c)) + '</span>';
            }).join('');
        }
    }

    function mcLongDate(key) {
        return new Date(key + 'T00:00:00').toLocaleDateString(mcLoc(), { weekday: 'long', day: '2-digit', month: 'long' });
    }



    // ── Zwölf-Monats-Streifen ────────────────────────────────────────────
    function mcRenderStrip(stats, en) {
        var host = document.getElementById('mcStrip');
        if (!host) return;

        var months = [];
        for (var i = 11; i >= 0; i--) {
            var d = new Date(mcYear, mcMonth - i, 1);
            var s = (d.getFullYear() === mcYear && d.getMonth() === mcMonth)
                ? stats : calculateMonthStats(d.getMonth(), d.getFullYear());
            months.push({ y: d.getFullYear(), m: d.getMonth(), worked: s.worked || 0 });
        }

        var withData = months.filter(function (x) { return x.worked > 0; });
        var max = Math.max.apply(null, months.map(function (x) { return x.worked; }));
        max = max > 0 ? max * 1.08 : 1;
        var avg = withData.length ? withData.reduce(function (a, x) { return a + x.worked; }, 0) / withData.length : 0;

        var subEl = document.getElementById('mcRankSub');
        if (subEl) {
            if (!withData.length) {
                subEl.textContent = en ? 'Twelve months at a glance — hours worked per month. Nothing recorded yet.'
                                       : 'Zwölf Monate nebeneinander, geleistete Zeit je Monat. Bisher ist nichts erfasst.';
            } else {
                var rank = withData.filter(function (x) { return x.worked > stats.worked; }).length + 1;
                var own = stats.worked > 0
                    ? (en ? 'This month ranks ' + rank + ' of ' + withData.length + ' recorded months, '
                            + (stats.worked >= avg ? 'above' : 'below') + ' the ' + mcN(avg, 1) + ' h average.'
                          : 'Dieser Monat liegt auf Rang ' + rank + ' von ' + withData.length + ' erfassten Monaten, '
                            + (stats.worked >= avg ? 'über' : 'unter') + ' dem Schnitt von ' + mcN(avg, 1) + ' h.')
                    : (en ? 'Nothing recorded this month. The average of the others is ' + mcN(avg, 1) + ' h.'
                          : 'Dieser Monat ist leer. Der Schnitt der übrigen liegt bei ' + mcN(avg, 1) + ' h.');
                subEl.textContent = own;
            }
        }

        // Die Ø-Linie sitzt in JEDER Saeule auf derselben Hoehe. Ein einzelnes
        // Element ueber dem ganzen Streifen waere falsch positioniert: dessen
        // Unterkante ist die Monatsbeschriftung, nicht die Nulllinie der Saeulen.
        var avgPct = avg > 0 ? ((avg / max) * 100).toFixed(2) + '%' : null;

        host.innerHTML = months.map(function (x) {
            var sel = (x.y === mcYear && x.m === mcMonth);
            var h = (x.worked / max) * 100;
            var lbl = mcMonthName(x.y, x.m, false);
            if (x.m === 0) lbl += ' ' + String(x.y).slice(2);   // Jahreswechsel markieren
            return '<button type="button" class="mc-strip__col' + (sel ? ' is-sel' : '') + '"'
                 + ' onclick="mcPickMonth(' + x.y + ',' + x.m + ')"'
                 + ' aria-pressed="' + (sel ? 'true' : 'false') + '"'
                 + ' title="' + mcEsc(mcMonthName(x.y, x.m, true) + ' · ' + mcN(x.worked, 1) + ' h') + '">'
                 + '<span class="mc-strip__val">' + mcEsc(mcN(x.worked, 0)) + '</span>'
                 + '<span class="mc-strip__plot">'
                   + '<span class="mc-strip__bar" style="--h:' + h.toFixed(2) + '%"></span>'
                   + (avgPct ? '<span class="mc-strip__avg" style="--avg:' + avgPct + '"></span>' : '')
                 + '</span>'
                 + '<span class="mc-strip__lbl">' + mcEsc(lbl) + '</span>'
                 + '</button>';
        }).join('');
    }


    // ── Kalenderwochen ───────────────────────────────────────────────────
    // 🔴 Vorher: `Math.ceil(tag / 7)` — das sind Bloecke von je sieben
    // Monatstagen, keine Wochen. „Woche 1" endete am 7., egal welcher
    // Wochentag das war, und keine Zeile deckte sich mit dem, was in der
    // Wochenansicht steht.
    function mcRenderWeeks(stats, en) {
        var host = document.getElementById('mcWeeks');
        if (!host) return;
        var subEl = document.getElementById('mcWeeksSub');
        var weeks = (stats.weeks || []).filter(function (w) { return w.entries > 0 || w.hours > 0; });

        if (subEl) {
            subEl.textContent = weeks.length
                ? (en ? 'Real calendar weeks, so the rows match the week view. Weeks reaching into the neighbouring month count only their days here.'
                      : 'Echte Kalenderwochen — die Zeilen decken sich mit der Wochenansicht. Wochen, die in den Nachbarmonat reichen, zählen hier nur ihre Tage in diesem Monat.')
                : (en ? 'Weeks appear as soon as the month holds entries.' : 'Die Wochen erscheinen, sobald der Monat Einträge trägt.');
        }
        if (!weeks.length) {
            host.innerHTML = '<p class="mc-empty">' + (en ? 'No entry in this month.' : 'In diesem Monat ist nichts erfasst.') + '</p>';
            return;
        }

        var maxAbs = Math.max.apply(null, weeks.map(function (w) { return Math.abs(w.saldo); }));
        maxAbs = maxAbs > 0 ? maxAbs : 1;

        host.innerHTML =
            '<table class="mc-tbl">' +
              '<thead><tr>' +
                '<th>' + (en ? 'Week' : 'KW') + '</th>' +
                '<th>' + (en ? 'Work days' : 'Arbeitstage') + '</th>' +
                '<th>' + (en ? 'Worked' : 'Geleistet') + '</th>' +
                '<th>' + (en ? 'Target' : 'Soll') + '</th>' +
                '<th>' + (en ? 'Balance' : 'Saldo') + '</th>' +
                '<th class="mc-tbl__plot-h">' + (en ? 'Deviation' : 'Ausschlag') + '</th>' +
              '</tr></thead><tbody>' +
              weeks.map(function (w) {
                  var cls = Math.abs(w.saldo) < 0.05 ? '' : (w.saldo > 0 ? 'is-plus' : 'is-minus');
                  var pct = (Math.abs(w.saldo) / maxAbs) * 50;
                  return '<tr>' +
                      '<td class="mc-tbl__kw">KW ' + w.weekNum + '</td>' +
                      '<td class="mc-tbl__muted">' + w.entries + '</td>' +
                      '<td>' + mcEsc(mcN(w.hours, 1)) + ' h</td>' +
                      '<td class="mc-tbl__muted">' + mcEsc(mcN(w.expected, 1)) + ' h</td>' +
                      '<td class="mc-tbl__saldo ' + cls + '">' + mcEsc(mcSigned(w.saldo, 1)) + ' h</td>' +
                      '<td class="mc-tbl__plot"><span class="mc-bar">' +
                        '<span class="mc-bar__zero"></span>' +
                        (cls ? '<span class="mc-bar__fill ' + cls + '" style="width:' + pct.toFixed(2) + '%"></span>' : '') +
                      '</span></td>' +
                  '</tr>';
              }).join('') +
            '</tbody></table>';
    }


    // ── Zusammensetzung ──────────────────────────────────────────────────
    function mcRenderMix(stats, daysInMonth, en) {
        var bar = document.getElementById('mcMixBar');
        var legend = document.getElementById('mcMixLegend');
        var subEl = document.getElementById('mcMixSub');
        if (!bar || !legend) return;

        var counts = {};
        MC_CATS.forEach(function (c) { counts[c] = 0; });
        var byDay = stats.byDay || {};
        Object.keys(byDay).forEach(function (k) { counts[byDay[k].type] = (counts[byDay[k].type] || 0) + 1; });
        var covered = Object.keys(byDay).length;
        counts.none = Math.max(0, daysInMonth - covered);

        var order = MC_CATS.concat(['none']).filter(function (c) { return counts[c] > 0; });

        if (subEl) {
            subEl.textContent = en
                ? 'All ' + daysInMonth + ' days of the month, by what they were.'
                : 'Alle ' + daysInMonth + ' Tage des Monats, nach ihrer Art.';
        }

        // 🔴 `flex: 0 1 X%` — mit `0 0` kaemen die Fugen ZUSAETZLICH zu den
        // Basen und das letzte Segment fiele hinter `overflow: hidden`.
        bar.innerHTML = order.map(function (c) {
            var pct = (counts[c] / daysInMonth) * 100;
            return '<span class="mc-mix__seg" data-cat="' + c + '" style="flex:0 1 ' + pct.toFixed(4) + '%;--cat:' + MC_COLOR[c] + '"'
                 + ' title="' + mcEsc(mcTypeLabel(c) + ': ' + counts[c] + (en ? ' days' : ' Tage')) + '"></span>';
        }).join('');

        legend.innerHTML = order.map(function (c) {
            return '<span class="mc-mix__row"><span class="mc-mix__dot" style="--cat:' + MC_COLOR[c] + '"></span>'
                 + mcEsc(mcTypeLabel(c)) + ' <span class="mc-mix__n">' + counts[c] + '</span></span>';
        }).join('');

        // Extremwerte
        var longest = null, shortest = null;
        Object.keys(byDay).forEach(function (k) {
            var d = byDay[k];
            if (d.type !== 'work' || d.worked <= 0) return;
            if (!longest || d.worked > longest.worked) longest = { key: k, worked: d.worked };
            if (!shortest || d.worked < shortest.worked) shortest = { key: k, worked: d.worked };
        });
        var put = function (id, txt) { var el = document.getElementById(id); if (el) el.innerHTML = txt; };
        var fmt = function (x) {
            if (!x) return '—';
            return mcEsc(mcN(x.worked, 1)) + ' h<small>'
                 + mcEsc(new Date(x.key + 'T00:00:00').toLocaleDateString(mcLoc(), { weekday: 'short', day: '2-digit', month: '2-digit' }))
                 + '</small>';
        };
        put('mcLongest', fmt(longest));
        put('mcShortest', fmt(shortest));
        put('mcOverDays', stats.workDays ? (stats.overDays + '<small>' + (en ? 'of ' : 'von ') + stats.workDays + '</small>') : '—');
        put('mcUnderDays', stats.workDays ? (stats.underDays + '<small>' + (en ? 'of ' : 'von ') + stats.workDays + '</small>') : '—');
    }
