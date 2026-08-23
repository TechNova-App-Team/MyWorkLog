// ═══ PERFORMANCE MODULE ═══
    // Die Ansicht ist ein Befund, kein Kachelbrett: ein Zeitraum gilt fuer ALLE
    // Abschnitte. Vorher rechnete jeder Block seinen eigenen Ausschnitt (8 Wochen,
    // 12 Monate, alles) waehrend oben "Letzte 90 Tage" stand — der Chip war Deko.

    var PF_RANGES = [30, 90, 365];

    function pfRange() {
        var r = parseInt((typeof data !== 'undefined' && data && data.settings && data.settings.perfRange), 10);
        return PF_RANGES.indexOf(r) >= 0 ? r : 90;
    }

    function setPerfRange(days) {
        days = parseInt(days, 10);
        if (PF_RANGES.indexOf(days) < 0) return;
        if (typeof data !== 'undefined' && data && data.settings) {
            data.settings.perfRange = days;
            if (typeof save === 'function') save();
        }
        renderPerformanceView(calculatePerformanceData(), calculateDeepPerformanceData());
        if (typeof mwlEvent === 'function') mwlEvent('performance_zeitraum', { tage: days });
    }

    // ── Kleinkram ────────────────────────────────────────────────────────
    function pfEN() { return document.documentElement.lang === 'en'; }

    function pfN(v, dec) {
        if (typeof dec !== 'number') dec = 1;
        if (!isFinite(v)) v = 0;
        return Number(v).toLocaleString(typeof mwlLocale === 'function' ? mwlLocale() : 'de-DE',
            { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    // Echtes Minuszeichen (U+2212): der Bindestrich sitzt in der Anzeigegroesse
    // sichtbar zu tief und zu kurz neben einer 3,7-rem-Ziffer.
    function pfSigned(v, dec) { return (v >= 0 ? '+' : '−') + pfN(Math.abs(v), dec); }

    function pfDay(dateStr, opts) {
        var d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString(typeof mwlLocale === 'function' ? mwlLocale() : 'de-DE',
            opts || { day: '2-digit', month: 'short' });
    }
    function pfKey(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function pfEsc(s) { return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s); }

    function pfEntryDate(e) { return new Date(e.date + 'T00:00:00'); }

    // Schultage zaehlen als voller Arbeitstag (Ausbildung): Soll gilt als geleistet.
    function pfEffectiveWorked(e) {
        return e.type === 'school' ? (parseFloat(e.expected) || parseFloat(e.worked) || 0) : (parseFloat(e.worked) || 0);
    }

    function pfRangeStart(days) {
        var from = new Date();
        from.setHours(0, 0, 0, 0);
        from.setDate(from.getDate() - (days - 1));
        return from;
    }


    // ══ 1 · Kennzahlen, Band und Bilanz ══════════════════════════════════
    function calculatePerformanceData() {
        var days = pfRange();
        var from = pfRangeStart(days);
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var fromT = from.getTime();

        var entries = (data.entries || []).filter(function (e) {
            if (!e || !e.date) return false;
            var t = pfEntryDate(e).getTime();
            return !isNaN(t) && t >= fromT && t <= today.getTime();
        });

        // Saldo und Soll-Erfuellung
        var saldo = 0, actualSum = 0, expectedSum = 0;
        var diffByDate = {};
        entries.forEach(function (e) {
            var d = parseFloat(e.diff) || 0;
            saldo += d;
            diffByDate[e.date] = (diffByDate[e.date] || 0) + d;
            actualSum += pfEffectiveWorked(e);
            expectedSum += parseFloat(e.expected) || 0;
        });
        var sollPct = expectedSum > 0 ? (actualSum / expectedSum) * 100 : null;

        // Das Band: kumulierter Saldo, Tag fuer Tag ueber den ganzen Zeitraum.
        var band = [];
        var cum = 0;
        for (var d = new Date(from); d <= today; d.setDate(d.getDate() + 1)) {
            var key = pfKey(d);
            cum += (diffByDate[key] || 0);
            band.push({ date: key, cum: cum });
        }

        // Bilanz-Eimer: bis 90 Tage in Wochen, darueber in Monaten.
        var buckets = days <= 90 ? pfWeekBuckets(from, today, entries) : pfMonthBuckets(from, today, entries);

        var projects = (typeof calculateProjectDistribution === 'function')
            ? calculateProjectDistribution(entries)
            : { distribution: [], totalWorkHours: 0 };

        var deep = (typeof calculateDeepPerformanceMetrics === 'function')
            ? calculateDeepPerformanceMetrics(entries)
            : { avgStartTime: '---', avgFocusHours: '0.0' };

        return {
            days: days, from: from, to: today, entries: entries,
            saldo: saldo, sollPct: sollPct, workedSum: actualSum, expectedSum: expectedSum,
            band: band, buckets: buckets, projects: projects, deepMetrics: deep
        };
    }

    function pfBucketAdd(bucket, e) {
        bucket.actual += pfEffectiveWorked(e);
        bucket.expected += parseFloat(e.expected) || 0;
    }

    function pfWeekBuckets(from, to, entries) {
        var rows = [], index = {};
        var cur = new Date(from);
        cur.setDate(cur.getDate() - ((cur.getDay() || 7) - 1)); // auf Montag zurueck
        while (cur <= to) {
            var end = new Date(cur); end.setDate(end.getDate() + 6);
            var b = {
                key: pfKey(cur),
                label: 'KW ' + (typeof getWeek === 'function' ? getWeek(cur) : ''),
                title: pfDay(pfKey(cur)) + ' – ' + pfDay(pfKey(end)),
                actual: 0, expected: 0
            };
            rows.push(b); index[b.key] = b;
            cur.setDate(cur.getDate() + 7);
        }
        entries.forEach(function (e) {
            var d = pfEntryDate(e);
            d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
            var b = index[pfKey(d)];
            if (b) pfBucketAdd(b, e);
        });
        return { unit: 'week', rows: rows };
    }

    function pfMonthBuckets(from, to, entries) {
        var rows = [], index = {};
        var cur = new Date(from.getFullYear(), from.getMonth(), 1);
        var loc = typeof mwlLocale === 'function' ? mwlLocale() : 'de-DE';
        while (cur <= to) {
            var b = {
                key: cur.getFullYear() + '-' + cur.getMonth(),
                label: cur.toLocaleDateString(loc, { month: 'short' }),
                title: cur.toLocaleDateString(loc, { month: 'long', year: 'numeric' }),
                actual: 0, expected: 0
            };
            rows.push(b); index[b.key] = b;
            cur.setMonth(cur.getMonth() + 1);
        }
        entries.forEach(function (e) {
            var d = pfEntryDate(e);
            var b = index[d.getFullYear() + '-' + d.getMonth()];
            if (b) pfBucketAdd(b, e);
        });
        return { unit: 'month', rows: rows };
    }


    // ══ 2 · Rhythmus, Gesetzespruefung, Stimmung ═════════════════════════
    function calculateDeepPerformanceData() {
        var perfEntries = calculatePerformanceData().entries;
        return {
            rhythm: pfRhythmGrid(perfEntries),
            law: pfLawAudit(perfEntries),
            mood: pfMoodStats(perfEntries)
        };
    }

    // Wochentag x Stunde. Vorher gab es zwei Diagramme fuer dieselbe Frage
    // (Balken je Wochentag + ein 1D-Stundenband); beide zusammen sagen weniger
    // als dieses Raster, weil erst die Kreuzung "Dienstag um 10" etwas zeigt.
    function pfRhythmGrid(entries) {
        var grid = [];       // grid[weekday 0..6][hour 0..23]
        for (var i = 0; i < 7; i++) grid.push(new Array(24).fill(0));
        var daysSeen = [{}, {}, {}, {}, {}, {}, {}];
        var minH = 24, maxH = -1, peak = null;

        entries.forEach(function (e) {
            if (e.type !== 'work' || !e.shiftStart || !e.shiftEnd) return;
            var s = String(e.shiftStart).split(':').map(Number);
            var t = String(e.shiftEnd).split(':').map(Number);
            if (s.length < 2 || t.length < 2 || isNaN(s[0]) || isNaN(t[0])) return;

            var startM = s[0] * 60 + s[1];
            var endM = t[0] * 60 + t[1];
            if (endM <= startM) endM += 24 * 60;         // ueber Mitternacht
            var span = endM - startM;
            if (span <= 0) return;

            var net = parseFloat(e.worked) || 0;
            var wd = pfEntryDate(e).getDay();
            daysSeen[wd][e.date] = true;

            for (var m = Math.floor(startM / 60) * 60; m < endM; m += 60) {
                var segStart = Math.max(startM, m);
                var segEnd = Math.min(endM, m + 60);
                var mins = segEnd - segStart;
                if (mins <= 0) continue;
                var h = Math.floor(m / 60) % 24;
                grid[wd][h] += net * (mins / span);
            }
        });

        // Auf einen Durchschnitt je Wochentag normieren, sonst gewinnt der
        // Wochentag, der im Zeitraum haeufiger vorkam.
        var order = [1, 2, 3, 4, 5, 6, 0];  // Mo … So
        var avg = [];
        order.forEach(function (wd) {
            var n = Object.keys(daysSeen[wd]).length || 1;
            var row = grid[wd].map(function (v) { return v / n; });
            avg.push({ wd: wd, values: row, days: Object.keys(daysSeen[wd]).length });
            row.forEach(function (v, h) {
                if (v <= 0.001) return;
                if (h < minH) minH = h;
                if (h > maxH) maxH = h;
                if (!peak || v > peak.value) peak = { wd: wd, hour: h, value: v };
            });
        });

        if (maxH < 0) { minH = 6; maxH = 20; }
        else { minH = Math.max(0, minH - 1); maxH = Math.min(23, maxH + 1); }

        var max = 0;
        avg.forEach(function (r) { for (var h = minH; h <= maxH; h++) if (r.values[h] > max) max = r.values[h]; });

        return { rows: avg, from: minH, to: maxH, max: max, peak: peak, hasData: !!peak };
    }

    // Arbeitszeitgesetz. Die drei Karten hier waren bis v6.3.3 fest auf "OK"
    // verdrahtet — kein JS hat sie je angefasst. Eine Zusage ohne Deckung ist
    // schlimmer als keine Zusage; jetzt wird wirklich gerechnet.
    function pfLawAudit(entries) {
        var toMin = function (s) {
            var p = String(s || '').split(':').map(Number);
            return (p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1])) ? p[0] * 60 + p[1] : null;
        };
        var byDate = {};
        entries.forEach(function (e) {
            if (e.type !== 'work') return;
            var d = byDate[e.date] || (byDate[e.date] = { worked: 0, brk: 0, startM: null, endM: null });
            d.worked += parseFloat(e.worked) || 0;
            d.brk += parseFloat(e.breakMins) || 0;
            var sM = toMin(e.shiftStart), eM = toMin(e.shiftEnd);
            if (sM !== null && (d.startM === null || sM < d.startM)) d.startM = sM;
            if (sM !== null && eM !== null) {
                // Nachtschicht: das Ende liegt am Folgetag. Ohne diese Korrektur
                // ist "22:00 – 02:00" ein Vier-Stunden-Tag mit Ende VOR dem Start,
                // und die Ruhezeit rechnet sich ins Positive.
                if (eM <= sM) eM += 24 * 60;
                if (d.endM === null || eM > d.endM) d.endM = eM;
            }
        });
        var dates = Object.keys(byDate).sort();

        // § 3 — hoechstens 10 h werktaeglich (netto, ohne Pausen)
        var overMax = dates.filter(function (k) { return byDate[k].worked > 10.001; });

        // § 4 — 30 min ab mehr als 6 h, 45 min ab mehr als 9 h.
        // Nur Tage mit echter Schichtzeit sind pruefbar; ein reiner Stundenwert
        // traegt keine Pauseninformation und wuerde sonst falsch anschlagen.
        var breakBad = [], breakChecked = 0, breakSkipped = 0;
        dates.forEach(function (k) {
            var d = byDate[k];
            var need = d.worked > 9.001 ? 45 : (d.worked > 6.001 ? 30 : 0);
            if (need === 0) return;
            if (d.startM === null || d.endM === null) { breakSkipped++; return; }
            breakChecked++;
            if (d.brk + 0.5 < need) breakBad.push(k);
        });

        // § 5 — 11 h Ruhezeit zwischen Schichtende und naechstem Schichtbeginn
        var restBad = [], restChecked = 0;
        for (var i = 1; i < dates.length; i++) {
            var prev = byDate[dates[i - 1]], next = byDate[dates[i]];
            if (prev.endM === null || next.startM === null) continue;
            var gapDays = Math.round((new Date(dates[i] + 'T00:00:00') - new Date(dates[i - 1] + 'T00:00:00')) / 86400000);
            if (gapDays !== 1) continue;
            restChecked++;
            var rest = (24 * 60 - prev.endM + next.startM) / 60;
            if (rest + 0.01 < 11) restBad.push({ date: dates[i], rest: Math.max(0, rest) });
        }

        return {
            days: dates.length,
            maxHours: { bad: overMax, checked: dates.length },
            breaks: { bad: breakBad, checked: breakChecked, skipped: breakSkipped },
            rest: { bad: restBad, checked: restChecked }
        };
    }

    function pfMoodStats(entries) {
        var by = {};
        entries.forEach(function (e) {
            if (!e.mood) return;
            var m = by[e.mood] || (by[e.mood] = { mood: e.mood, count: 0, worked: 0 });
            m.count++;
            // Schultage tragen `worked = 0`; mit dem Rohwert stuende neben einer
            // Stimmung, die nur an Schultagen vergeben wurde, „0,0 h".
            m.worked += pfEffectiveWorked(e);
        });
        var rows = Object.keys(by).map(function (k) { return by[k]; })
            .sort(function (a, b) { return b.count - a.count || (a.mood < b.mood ? -1 : 1); });
        var total = rows.reduce(function (s, r) { return s + r.count; }, 0);
        return { rows: rows, total: total };
    }


    // ══ 3 · Zeichnen ═════════════════════════════════════════════════════
    function renderPerformanceView(perfData, deepData) {
        var en = pfEN();

        // Zeitraum-Schalter
        document.querySelectorAll('#view-performance .pf-range__btn').forEach(function (b) {
            var on = parseInt(b.dataset.range, 10) === perfData.days;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        var sub = document.getElementById('pfHeadSub');
        if (sub) {
            sub.textContent = (en ? 'All figures below cover ' : 'Alle Zahlen unten gelten für ')
                + pfDay(pfKey(perfData.from), { day: '2-digit', month: 'long', year: 'numeric' })
                + (en ? ' to today · ' : ' bis heute · ')
                + perfData.entries.length + (en ? ' entries' : ' Einträge');
        }

        pfRenderVerdict(perfData, en);
        pfRenderBalance(perfData, en);
        pfRenderRhythm(deepData.rhythm, en);
        pfRenderProjects(perfData, en);
        pfRenderLaw(deepData.law, perfData, en);
        pfRenderMood(deepData.mood, perfData, en);

        try { if (typeof renderJobBreakdown === 'function') renderJobBreakdown(); } catch (err) { console.warn('renderJobBreakdown error', err); }
    }


    // ── Befund + Band ────────────────────────────────────────────────────
    function pfRenderVerdict(p, en) {
        var numEl = document.getElementById('pfSaldoNum');
        if (numEl) {
            // Ohne einen einzigen Eintrag ist „+0,0 h" keine Aussage, sondern eine
            // Behauptung ueber Daten, die es nicht gibt.
            if (!p.entries.length) {
                numEl.className = 'pf-verdict__num';
                numEl.textContent = '—';
            } else {
                numEl.className = 'pf-verdict__num ' + (Math.abs(p.saldo) < 0.05 ? '' : (p.saldo > 0 ? 'is-plus' : 'is-minus'));
                numEl.innerHTML = pfEsc(pfSigned(p.saldo, 1)) + '<span class="pf-u">h</span>';
            }
        }

        var sayEl = document.getElementById('pfSaldoSay');
        if (sayEl) sayEl.textContent = pfVerdictSentence(p, en);

        var pctEl = document.getElementById('kpiPerformance');
        if (pctEl) {
            if (p.sollPct === null) { pctEl.textContent = '—'; pctEl.className = 'pf-fact__v'; }
            else {
                pctEl.textContent = Math.round(p.sollPct) + '%';
                pctEl.className = 'pf-fact__v ' + (p.sollPct >= 99.5 ? 'is-plus' : (p.sollPct >= 95 ? 'is-warn' : 'is-minus'));
            }
        }
        var startEl = document.getElementById('kpiAvgStartTime');
        if (startEl) startEl.textContent = p.deepMetrics.avgStartTime === '---' ? '—' : p.deepMetrics.avgStartTime;
        var focusEl = document.getElementById('kpiAvgFocus');
        if (focusEl) focusEl.textContent = parseFloat(p.deepMetrics.avgFocusHours) > 0 ? (pfN(p.deepMetrics.avgFocusHours, 1) + ' h') : '—';

        pfRenderBand(p, en);
    }

    function pfVerdictSentence(p, en) {
        if (!p.entries.length) {
            return en ? 'No entries in this period yet. Log a day and the report fills itself.'
                      : 'Noch keine Einträge in diesem Zeitraum. Erfasse einen Tag, dann füllt sich der Befund von selbst.';
        }
        var half = Math.floor(p.band.length / 2);
        var mid = half > 0 ? p.band[half - 1].cum : 0;
        var recent = p.saldo - mid;
        var abs = Math.abs(p.saldo);

        var state = abs < 1
            ? (en ? 'Your balance is level.' : 'Dein Saldo steht praktisch auf null.')
            : (p.saldo > 0
                ? (en ? 'You are ' + pfN(abs, 1) + ' h above target.' : 'Du liegst ' + pfN(abs, 1) + ' h über dem Soll.')
                : (en ? 'You are ' + pfN(abs, 1) + ' h below target.' : 'Dir fehlen ' + pfN(abs, 1) + ' h auf das Soll.'));

        var trend;
        if (Math.abs(recent) < 0.5) trend = en ? 'The second half of the period barely moved it.' : 'In der zweiten Hälfte des Zeitraums hat sich daran kaum etwas geändert.';
        else if (recent > 0) trend = en ? 'The second half added ' + pfN(recent, 1) + ' h.' : 'In der zweiten Hälfte sind ' + pfN(recent, 1) + ' h dazugekommen.';
        else trend = en ? 'The second half gave back ' + pfN(Math.abs(recent), 1) + ' h.' : 'In der zweiten Hälfte sind ' + pfN(Math.abs(recent), 1) + ' h abgebaut worden.';

        return state + ' ' + trend;
    }

    // Das Band ist das Signaturbild der Seite: eine Flaeche, die an einer
    // sichtbaren Nulllinie haengt. Bewusst KEIN Ring — ein Ring hat einen
    // Nenner und faengt bei null an; ein Saldo hat ein Vorzeichen.
    function pfRenderBand(p, en) {
        var host = document.getElementById('pfBandPlot');
        if (!host) return;
        var fromEl = document.getElementById('pfBandFrom');
        var toEl = document.getElementById('pfBandTo');
        if (fromEl) fromEl.textContent = pfDay(p.band.length ? p.band[0].date : pfKey(p.from));
        if (toEl) toEl.textContent = pfDay(p.band.length ? p.band[p.band.length - 1].date : pfKey(p.to));

        if (!p.entries.length || p.band.length < 2) {
            host.innerHTML = '<div class="pf-band__empty">' +
                (en ? 'The curve appears as soon as this period holds entries.'
                    : 'Die Kurve erscheint, sobald in diesem Zeitraum Einträge liegen.') + '</div>';
            pfBandHover(null);
            return;
        }

        // Feste viewBox statt clientWidth: die Ansicht kann beim Rendern
        // ausgeblendet sein, dann ist jede gemessene Breite 0.
        var W = 1000, H = 172;
        var vals = p.band.map(function (b) { return b.cum; });
        var hi = Math.max(0, Math.max.apply(null, vals));
        var lo = Math.min(0, Math.min.apply(null, vals));
        var pad = (hi - lo) * 0.14 || 1;
        var top = hi + pad, bot = lo - pad;
        var yOf = function (v) { return H - ((v - bot) / (top - bot)) * H; };
        var xOf = function (i) { return (i / (p.band.length - 1)) * W; };
        var zero = yOf(0);

        var line = vals.map(function (v, i) { return (i ? 'L' : 'M') + xOf(i).toFixed(2) + ' ' + yOf(v).toFixed(2); }).join(' ');
        var area = line + ' L' + W + ' ' + zero.toFixed(2) + ' L0 ' + zero.toFixed(2) + ' Z';

        host.innerHTML =
            '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
              '<defs>' +
                '<clipPath id="pfClipUp"><rect x="0" y="0" width="' + W + '" height="' + Math.max(0, zero).toFixed(2) + '"/></clipPath>' +
                '<clipPath id="pfClipDown"><rect x="0" y="' + zero.toFixed(2) + '" width="' + W + '" height="' + Math.max(0, H - zero).toFixed(2) + '"/></clipPath>' +
                // var() gehoert in eine CSS-Eigenschaft, nicht in ein
                // Praesentationsattribut — `stop-color="var(--success)"` bleibt
                // in Safari schwarz. Deshalb ueberall style="".
                '<linearGradient id="pfGradUp" x1="0" y1="0" x2="0" y2="1">' +
                  '<stop offset="0%" style="stop-color:var(--success);stop-opacity:.30"/>' +
                  '<stop offset="100%" style="stop-color:var(--success);stop-opacity:.02"/>' +
                '</linearGradient>' +
                '<linearGradient id="pfGradDown" x1="0" y1="1" x2="0" y2="0">' +
                  '<stop offset="0%" style="stop-color:var(--danger);stop-opacity:.30"/>' +
                  '<stop offset="100%" style="stop-color:var(--danger);stop-opacity:.02"/>' +
                '</linearGradient>' +
              '</defs>' +
              '<path d="' + area + '" clip-path="url(#pfClipUp)" style="fill:url(#pfGradUp)"/>' +
              '<path d="' + area + '" clip-path="url(#pfClipDown)" style="fill:url(#pfGradDown)"/>' +
              '<line x1="0" y1="' + zero.toFixed(2) + '" x2="' + W + '" y2="' + zero.toFixed(2) + '" ' +
                    'vector-effect="non-scaling-stroke" style="stroke:var(--expected-color);stroke-width:1;stroke-dasharray:3 4"/>' +
              '<path d="' + line + '" clip-path="url(#pfClipUp)" vector-effect="non-scaling-stroke" ' +
                    'style="fill:none;stroke:var(--success);stroke-width:2;stroke-linejoin:round"/>' +
              '<path d="' + line + '" clip-path="url(#pfClipDown)" vector-effect="non-scaling-stroke" ' +
                    'style="fill:none;stroke:var(--danger);stroke-width:2;stroke-linejoin:round"/>' +
            '</svg>';

        pfBandHover({ band: p.band, yOf: yOf, H: H, en: en });
    }

    function pfBandHover(ctx) {
        var fig = document.getElementById('pfBand');
        var plot = document.getElementById('pfBandPlot');
        var cursor = document.getElementById('pfBandCursor');
        var tip = document.getElementById('pfBandTip');
        if (!fig || !plot || !cursor || !tip) return;

        if (fig._pfMove) {
            fig.removeEventListener('pointermove', fig._pfMove);
            fig.removeEventListener('pointerleave', fig._pfLeave);
        }
        cursor.hidden = true; tip.hidden = true;
        if (!ctx) return;

        fig._pfMove = function (ev) {
            var r = plot.getBoundingClientRect();
            if (!r.width) return;
            var frac = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
            var i = Math.round(frac * (ctx.band.length - 1));
            var pt = ctx.band[i];
            var xPct = (i / (ctx.band.length - 1)) * 100;

            cursor.hidden = false;
            cursor.style.left = xPct + '%';
            cursor.style.setProperty('--dot-y', (ctx.yOf(pt.cum) / ctx.H * 100).toFixed(2) + '%');

            tip.hidden = false;
            tip.innerHTML = '<b>' + pfEsc(pfSigned(pt.cum, 1)) + ' h</b><br>' + pfEsc(pfDay(pt.date, { day: '2-digit', month: 'short', year: '2-digit' }));
            var tw = tip.offsetWidth || 110;
            var x = Math.min(Math.max(r.width * (xPct / 100) - tw / 2, 0), Math.max(0, r.width - tw));
            tip.style.left = x + 'px';
        };
        fig._pfLeave = function () { cursor.hidden = true; tip.hidden = true; };
        fig.addEventListener('pointermove', fig._pfMove);
        fig.addEventListener('pointerleave', fig._pfLeave);
    }


    // ── Bilanz: Hantel statt gestapeltem Balken ──────────────────────────
    // Ein Balken kann nur eine Laenge zeigen; Soll UND Ist auf einer Achse
    // brauchen zwei Marken. Die Strecke dazwischen IST der Saldo.
    function pfRenderBalance(p, en) {
        var host = document.getElementById('pfBalance');
        if (!host) return;
        var subEl = document.getElementById('pfBalanceSub');
        var rows = p.buckets.rows;
        var isWeek = p.buckets.unit === 'week';

        var withData = rows.filter(function (r) { return r.actual > 0 || r.expected > 0; });

        if (subEl) {
            var lead = en ? 'Target as a tick, actual as a dot — the gap between them is the balance.'
                          : 'Soll als Strich, Ist als Punkt — der Abstand dazwischen ist der Saldo.';
            subEl.textContent = withData.length
                ? lead + ' ' + rows.length + (isWeek ? (en ? ' weeks.' : ' Wochen.') : (en ? ' months.' : ' Monate.'))
                : lead;
        }

        if (!withData.length) {
            host.innerHTML = '<p class="pf-empty">' + (en ? 'No target or actual hours recorded in this period.'
                : 'In diesem Zeitraum sind weder Soll- noch Ist-Stunden erfasst.') + '</p>';
            return;
        }

        var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.actual, r.expected); }));
        max = max > 0 ? max * 1.06 : 1;

        host.innerHTML = rows.map(function (r) {
            // Eine Woche ohne jeden Eintrag bekommt keine Marken: Soll 0 und Ist 0
            // saehen sonst wie „punktgenau erfuellt" aus, obwohl gar nichts da ist.
            if (r.actual <= 0 && r.expected <= 0) {
                return '<div class="pf-dumb__row is-void">' +
                         '<span class="pf-dumb__lbl">' + pfEsc(r.label) + '</span>' +
                         '<span class="pf-dumb__track"></span>' +
                         '<span class="pf-dumb__val">—</span>' +
                       '</div>';
            }
            var diff = r.actual - r.expected;
            var cls = Math.abs(diff) < 0.05 ? '' : (diff > 0 ? 'is-plus' : 'is-minus');
            var aPct = (r.actual / max) * 100;
            var ePct = (r.expected / max) * 100;
            var left = Math.min(aPct, ePct), width = Math.abs(aPct - ePct);
            var title = r.title + ' · ' + (en ? 'actual ' : 'Ist ') + pfN(r.actual, 1) + ' h · '
                      + (en ? 'target ' : 'Soll ') + pfN(r.expected, 1) + ' h';
            return '<div class="pf-dumb__row" title="' + pfEsc(title) + '">' +
                     '<span class="pf-dumb__lbl">' + pfEsc(r.label) + '</span>' +
                     '<span class="pf-dumb__track">' +
                       (width > 0.2 ? '<span class="pf-dumb__span ' + cls + '" style="left:' + left.toFixed(2) + '%;width:' + width.toFixed(2) + '%"></span>' : '') +
                       '<span class="pf-dumb__tick" style="left:' + ePct.toFixed(2) + '%"></span>' +
                       '<span class="pf-dumb__dot" style="left:' + aPct.toFixed(2) + '%"></span>' +
                     '</span>' +
                     '<span class="pf-dumb__val ' + cls + '">' + pfEsc(pfSigned(diff, 1)) + ' h</span>' +
                   '</div>';
        }).join('');
    }


    // ── Rhythmus: Wochentag x Stunde ─────────────────────────────────────
    function pfRenderRhythm(rh, en) {
        var host = document.getElementById('pfRhythm');
        if (!host) return;
        var subEl = document.getElementById('pfRhythmSub');
        if (subEl) {
            subEl.textContent = en
                ? 'Average hours worked per weekday and clock hour. Darker means denser.'
                : 'Ø geleistete Zeit je Wochentag und Uhrzeit. Je dichter, desto dunkler die Fläche.';
        }

        if (!rh.hasData) {
            host.innerHTML = '<p class="pf-empty">' + (en
                ? 'This grid needs entries with a start and end time. Days logged as a plain hour count carry no clock times.'
                : 'Für dieses Raster braucht es Einträge mit Start- und Endzeit. Tage, die nur als Stundenzahl erfasst sind, tragen keine Uhrzeit.') + '</p>';
            return;
        }

        var loc = typeof mwlLocale === 'function' ? mwlLocale() : 'de-DE';
        var cols = rh.to - rh.from + 1;
        var html = '<div class="pf-rhythm__grid" style="grid-template-columns:auto repeat(' + cols + ',minmax(16px,1fr))">';
        html += '<span class="pf-rhythm__corner"></span>';
        for (var h = rh.from; h <= rh.to; h++) {
            var show = cols <= 10 || (h % 2 === 0);
            html += '<span class="pf-rhythm__hour">' + (show ? h : '') + '</span>';
        }

        rh.rows.forEach(function (row) {
            var d = new Date(2024, 0, 7 + row.wd); // 7.1.2024 war ein Sonntag
            html += '<span class="pf-rhythm__day">' + pfEsc(d.toLocaleDateString(loc, { weekday: 'short' })) + '</span>';
            for (var hh = rh.from; hh <= rh.to; hh++) {
                var v = row.values[hh];
                if (v <= 0.001) { html += '<span class="pf-rhythm__cell"></span>'; continue; }
                var a = 0.14 + (v / rh.max) * 0.86;
                var t = d.toLocaleDateString(loc, { weekday: 'long' }) + ' ' + hh + ':00 — Ø ' + pfN(v, 2) + ' h';
                html += '<span class="pf-rhythm__cell" data-v="1" title="' + pfEsc(t) + '" ' +
                        'style="background:rgba(var(--primary-rgb),' + a.toFixed(3) + ')"></span>';
            }
        });
        html += '</div>';

        if (rh.peak) {
            var pd = new Date(2024, 0, 7 + rh.peak.wd);
            var name = pd.toLocaleDateString(loc, { weekday: 'long' });
            html += '<p class="pf-rhythm__peak">' +
                    (typeof mwlIcon === 'function' ? mwlIcon('flame', 16) : '') +
                    '<span>' + (en ? 'Densest slot: ' : 'Dichteste Stunde: ') +
                    '<b>' + pfEsc(name) + ', ' + rh.peak.hour + ':00</b> ' +
                    (en ? 'with Ø ' : 'mit Ø ') + pfEsc(pfN(rh.peak.value, 2)) + ' h.</span></p>';
        }
        host.innerHTML = html;
    }


    // ── Projekte: Rangliste statt Donut ──────────────────────────────────
    // Ein Donut laesst benachbarte Segmente vergleichen und sonst nichts;
    // sortierte Balken beantworten "wer ist groesser" auf einen Blick.
    function pfRenderProjects(p, en) {
        var host = document.getElementById('pfProjects');
        if (!host) return;
        var subEl = document.getElementById('pfProjectSub');
        var rows = p.projects.distribution || [];
        var total = p.projects.totalWorkHours || 0;

        if (subEl) {
            subEl.textContent = total > 0
                ? (en ? pfN(total, 1) + ' h across ' + rows.length + ' projects, largest first.'
                      : pfN(total, 1) + ' h auf ' + rows.length + ' Projekte, größtes zuerst.')
                : (en ? 'Assign a project when logging a day to see the split.'
                      : 'Trage beim Erfassen ein Projekt ein, dann steht hier die Aufteilung.');
        }
        if (!rows.length || total <= 0) {
            host.innerHTML = '<p class="pf-empty">' + (en
                ? 'No project assigned on any work entry in this period.'
                : 'In diesem Zeitraum trägt kein Arbeitseintrag ein Projekt.') + '</p>';
            return;
        }

        var max = rows[0].hours || 1;
        host.innerHTML = rows.map(function (r) {
            var pct = (r.hours / total) * 100;
            return '<div class="pf-rank__row">' +
                     '<div class="pf-rank__head">' +
                       '<span class="pf-rank__name">' + pfEsc(r.name) + '</span>' +
                       '<span class="pf-rank__val"><em>' + pfEsc(pfN(r.hours, 1)) + ' h</em> · ' + Math.round(pct) + '%</span>' +
                     '</div>' +
                     '<div class="pf-rank__track"><div class="pf-rank__fill" style="width:' + ((r.hours / max) * 100).toFixed(2) + '%"></div></div>' +
                   '</div>';
        }).join('');
    }


    // ── Arbeitszeitgesetz ────────────────────────────────────────────────
    function pfRenderLaw(law, p, en) {
        var host = document.getElementById('pfLaw');
        if (!host) return;
        var subEl = document.getElementById('pfLawSub');
        if (subEl) {
            subEl.textContent = en
                ? law.days + ' work days in this period were checked against three limits.'
                : law.days + ' Arbeitstage in diesem Zeitraum wurden gegen drei Grenzwerte geprüft.';
        }
        if (!law.days) {
            host.innerHTML = '<p class="pf-empty">' + (en
                ? 'No work days in this period, so there is nothing to check.'
                : 'In diesem Zeitraum liegen keine Arbeitstage, also gibt es nichts zu prüfen.') + '</p>';
            return;
        }

        var checks = [];

        // § 3
        var n1 = law.maxHours.bad.length;
        checks.push({
            icon: 'hourglass',
            state: n1 ? 'bad' : 'ok',
            name: en ? 'Maximum working time · § 3' : 'Höchstarbeitszeit · § 3',
            desc: en ? 'At most 10 hours of actual working time per day, breaks excluded.'
                     : 'Höchstens 10 Stunden tatsächliche Arbeitszeit am Tag, Pausen zählen nicht mit.',
            verdict: n1 ? (n1 + (en ? (n1 === 1 ? ' day over' : ' days over') : (n1 === 1 ? ' Tag drüber' : ' Tage drüber')))
                        : (en ? 'Clear' : 'Eingehalten'),
            dates: law.maxHours.bad.slice(0, 4).map(function (d) { return pfDay(d); })
        });

        // § 4
        var n2 = law.breaks.bad.length;
        checks.push({
            icon: 'coffee',
            state: n2 ? 'warn' : 'ok',
            name: en ? 'Rest breaks · § 4' : 'Ruhepausen · § 4',
            desc: en ? 'At least 30 minutes beyond 6 hours, 45 minutes beyond 9 hours.'
                     : 'Mindestens 30 Minuten ab mehr als 6 Stunden, 45 Minuten ab mehr als 9 Stunden.',
            verdict: n2 ? (n2 + (en ? (n2 === 1 ? ' day short' : ' days short') : (n2 === 1 ? ' Tag zu kurz' : ' Tage zu kurz')))
                        : (law.breaks.checked ? (en ? 'Clear' : 'Eingehalten') : (en ? 'Not checkable' : 'Nicht prüfbar')),
            dates: n2 ? law.breaks.bad.slice(0, 4).map(function (d) { return pfDay(d); }) : [],
            note: law.breaks.skipped
                ? (en ? law.breaks.skipped + ' days without clock times were skipped — they carry no break data.'
                      : law.breaks.skipped + ' Tage ohne Uhrzeit blieben außen vor — sie tragen keine Pausenangabe.')
                : ''
        });

        // § 5
        var n3 = law.rest.bad.length;
        checks.push({
            icon: 'moon',
            state: n3 ? 'bad' : 'ok',
            name: en ? 'Rest period · § 5' : 'Ruhezeit · § 5',
            desc: en ? 'At least 11 uninterrupted hours between the end of one shift and the start of the next.'
                     : 'Mindestens 11 ununterbrochene Stunden zwischen Schichtende und dem nächsten Schichtbeginn.',
            verdict: n3 ? (n3 + (en ? (n3 === 1 ? ' gap too short' : ' gaps too short') : (n3 === 1 ? ' Lücke zu kurz' : ' Lücken zu kurz')))
                        : (law.rest.checked ? (en ? 'Clear' : 'Eingehalten') : (en ? 'Not checkable' : 'Nicht prüfbar')),
            dates: law.rest.bad.slice(0, 4).map(function (r) { return pfDay(r.date) + ' (' + pfN(r.rest, 1) + ' h)'; })
        });

        host.innerHTML = checks.map(function (c) {
            return '<div class="pf-law__row" data-state="' + c.state + '">' +
                     '<span class="pf-law__icon">' + (typeof mwlIcon === 'function' ? mwlIcon(c.icon, 17) : '') + '</span>' +
                     '<div class="pf-law__body">' +
                       '<div class="pf-law__name">' + pfEsc(c.name) + '</div>' +
                       '<div class="pf-law__desc">' + pfEsc(c.desc) + '</div>' +
                       (c.dates && c.dates.length
                         ? '<div class="pf-law__dates">' + pfEsc((en ? 'Affected: ' : 'Betroffen: ') + c.dates.join(' · ')) + '</div>' : '') +
                       (c.note ? '<div class="pf-law__dates">' + pfEsc(c.note) + '</div>' : '') +
                     '</div>' +
                     '<span class="pf-law__verdict">' + pfEsc(c.verdict) + '</span>' +
                   '</div>';
        }).join('');
    }


    // ── Stimmung: was die Tage gekostet haben, nicht 30 bunte Kaestchen ──
    function pfRenderMood(mood, p, en) {
        var host = document.getElementById('moodOverview');
        if (!host) return;
        var subEl = document.getElementById('pfMoodSub');
        if (subEl) {
            subEl.textContent = mood.total
                ? (en ? mood.total + ' entries carry a mood — beside each one, the hours those days actually took.'
                      : mood.total + ' Einträge tragen eine Stimmung — daneben steht, wie lang diese Tage wirklich waren.')
                : (en ? 'Pick a mood when saving an entry to build this up.'
                      : 'Wähle beim Speichern eines Eintrags eine Stimmung, dann entsteht hier ein Bild.');
        }
        if (!mood.rows.length) {
            host.innerHTML = '<p class="pf-empty">' + (en
                ? 'No mood recorded in this period yet.'
                : 'In diesem Zeitraum ist noch keine Stimmung erfasst.') + '</p>';
            return;
        }

        var max = mood.rows[0].count || 1;
        host.innerHTML = mood.rows.map(function (r) {
            var label = (typeof getMoodDescription === 'function') ? getMoodDescription(r.mood) : '';
            var avg = r.count > 0 ? r.worked / r.count : 0;
            return '<div class="pf-mood__row">' +
                     '<span class="pf-mood__icon">' +
                       (typeof mwlMoodIcon === 'function' ? mwlMoodIcon(r.mood, 15) : pfEsc(r.mood)) +
                     '</span>' +
                     '<div class="pf-mood__bar">' +
                       '<div class="pf-mood__name"><span>' + pfEsc(label) + '</span>' +
                         '<span class="pf-mood__count">' + r.count + (en ? (r.count === 1 ? ' day' : ' days') : (r.count === 1 ? ' Tag' : ' Tage')) + '</span></div>' +
                       '<div class="pf-mood__track"><div class="pf-mood__fill" style="width:' + ((r.count / max) * 100).toFixed(2) + '%"></div></div>' +
                     '</div>' +
                     '<span class="pf-mood__avg" title="' + pfEsc(en ? 'average hours worked on those days' : 'Ø geleistete Zeit an diesen Tagen') + '">' +
                       pfEsc(pfN(avg, 1)) + ' h</span>' +
                   '</div>';
        }).join('');
    }
