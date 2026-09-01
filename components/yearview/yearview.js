// ═══ YEARVIEW MODULE ═══
    // Das Jahr als EIN Bild aus 365 Feldern, und alles darunter erklaert dieses
    // Bild. Der Jahresregler ist derselbe wie in der Monatsansicht: ein Zustand,
    // ein Bedienelement, Grenzen aus dem Datenbestand.

    var YV_MODES = ['amount', 'kind', 'balance'];
    var YV_CATS = ['work', 'school', 'vacation', 'gleittag', 'sick', 'holiday'];

    function yvEN() { return document.documentElement.lang === 'en'; }
    function yvLoc() { return typeof mwlLocale === 'function' ? mwlLocale() : 'de-DE'; }
    function yvEsc(s) { return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s); }
    function yvN(v, dec) {
        if (typeof dec !== 'number') dec = 1;
        if (!isFinite(v)) v = 0;
        return Number(v).toLocaleString(yvLoc(), { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    function yvSigned(v, dec) { return (v >= 0 ? '+' : '−') + yvN(Math.abs(v), dec); }
    function yvKey(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function yvToday() { var n = new Date(); return yvKey(n); }
    function yvCat(t) {
        // Eine Quelle fuer Kategoriefarben: getTypeColor() (custom-types-fields.js)
        // beruecksichtigt auch die Farben, die der Nutzer im Typ-Manager gesetzt hat.
        return (typeof getTypeColor === 'function') ? getTypeColor(t) : '#888';
    }
    function yvCatLabel(t) { return (typeof getTypeLabel === 'function') ? getTypeLabel(t) : t; }


    // ── Jahresregler ─────────────────────────────────────────────────────
    function yvBounds() {
        var now = new Date().getFullYear();
        var lo = now, hi = now;
        (data.entries || []).forEach(function (e) {
            var raw = (e && e.date ? String(e.date) : '').split('T')[0];
            if (!raw) return;
            var y = parseInt(raw.slice(0, 4), 10);
            if (!y || isNaN(y)) return;
            if (y < lo) lo = y;
            if (y > hi) hi = y;
        });
        return { lo: lo, hi: hi };
    }

    function yvNav(dir) {
        var b = yvBounds();
        if (dir === 0) {
            selectedYearForView = new Date().getFullYear();
        } else {
            var next = selectedYearForView + dir;
            if (next < b.lo || next > b.hi) return;
            selectedYearForView = next;
        }
        renderYearView();
        if (typeof mwlEvent === 'function') mwlEvent('jahr_gewechselt', { richtung: dir });
    }

    function yvMapMode() {
        var m = (typeof data !== 'undefined' && data && data.settings && data.settings.yearMapMode);
        return YV_MODES.indexOf(m) >= 0 ? m : 'amount';
    }
    function yvSetMapMode(mode) {
        if (YV_MODES.indexOf(mode) < 0) return;
        if (typeof data !== 'undefined' && data && data.settings) {
            data.settings.yearMapMode = mode;
            if (typeof save === 'function') save();
        }
        renderYearView();
        if (typeof mwlEvent === 'function') mwlEvent('jahresraster_modus', { modus: mode });
    }


    // ── Sammeln ──────────────────────────────────────────────────────────
    // 🔴 Bewusst ueber calculateMonthStats() statt einer eigenen Schleife: die
    // Monatsansicht rechnet damit, und zwei Stellen, die dasselbe rechnen,
    // driften. Tagessoll je Job einmal, Nachtschichten, Split-Shift — das
    // steckt dort schon drin.
    function yvCollect(year) {
        var months = [], byDay = {}, weeks = {};
        var t = { worked: 0, expected: 0, workDays: 0, saldo: 0, over: 0, under: 0,
                  school: 0, vacation: 0, sick: 0, holiday: 0, gleittag: 0 };

        for (var m = 0; m < 12; m++) {
            var s = calculateMonthStats(m, year);
            months.push(s);
            Object.keys(s.byDay).forEach(function (k) { byDay[k] = s.byDay[k]; });
            t.worked += s.worked; t.expected += s.expected; t.workDays += s.workDays;
            t.saldo += s.saldo; t.over += s.overDays; t.under += s.underDays;
            t.school += s.schoolDays; t.vacation += s.vacationDays; t.sick += s.sickDays;
            t.holiday += s.holidayDays; t.gleittag += (s.gleittagDays || 0);
        }

        // Wochen ueber den Montag schluesseln, nicht ueber die KW-Nummer: der
        // 29. Dezember liegt in KW 1 des FOLGEjahres — mit der Nummer allein
        // faellt er mit dem 2. Januar in denselben Topf.
        Object.keys(byDay).forEach(function (k) {
            var d = new Date(k + 'T00:00:00');
            var mon = new Date(d); mon.setDate(mon.getDate() - ((mon.getDay() || 7) - 1));
            var mk = yvKey(mon);
            if (!weeks[mk]) weeks[mk] = { monday: mk, num: (typeof getWeek === 'function') ? getWeek(d) : 0, saldo: 0, worked: 0 };
            weeks[mk].saldo += byDay[k].saldo;
            weeks[mk].worked += byDay[k].worked;
        });

        return { year: year, months: months, byDay: byDay,
                 weeks: Object.keys(weeks).map(function (k) { return weeks[k]; }), total: t };
    }

    // Laengste Serie erfasster Arbeitstage. Wochenenden (Soll 0), Urlaub,
    // Feiertage, Schule und Krankheit unterbrechen sie NICHT — nur ein Tag mit
    // Soll, an dem gar nichts steht.
    function yvStreak(y, byDay, lastKey) {
        var best = 0, cur = 0, bestEnd = null, curEnd = null;
        var d = new Date(y, 0, 1), end = new Date(lastKey + 'T00:00:00');
        while (d <= end) {
            var k = yvKey(d);
            var day = byDay[k];
            var soll = (typeof getJobHours === 'function') ? getJobHours('primary', d.getDay())
                     : ((data.settings.hours && data.settings.hours[d.getDay()]) || 0);
            if (day && day.type === 'work') { cur++; curEnd = k; if (cur > best) { best = cur; bestEnd = curEnd; } }
            else if (!day && soll > 0) { cur = 0; }
            d.setDate(d.getDate() + 1);
        }
        return { len: best, end: bestEnd };
    }


    // ══ Zeichnen ═════════════════════════════════════════════════════════
    function renderYearView() {
        var en = yvEN();
        var year = selectedYearForView;
        var c = yvCollect(year);
        var now = new Date();
        var isCurrent = year === now.getFullYear();
        var lastKey = isCurrent ? yvToday() : yvKey(new Date(year, 11, 31));

        var titleEl = document.getElementById('yvTitle');
        if (titleEl) titleEl.textContent = year;

        var nowBtn = document.getElementById('yvNow');
        if (nowBtn) {
            nowBtn.textContent = year;
            nowBtn.title = isCurrent
                ? (en ? 'Current year (' + year + ')' : 'Aktuelles Jahr (' + year + ')')
                : (en ? 'Jump to current year (' + now.getFullYear() + ')' : 'Zum aktuellen Jahr springen (' + now.getFullYear() + ')');
        }

        var b = yvBounds();
        var prev = document.getElementById('yvPrev'), next = document.getElementById('yvNext');
        if (prev) {
            prev.disabled = year - 1 < b.lo;
            if (!prev.firstChild && typeof mwlIcon === 'function') prev.innerHTML = mwlIcon('chevronLeft', 16);
        }
        if (next) {
            next.disabled = year + 1 > b.hi;
            if (!next.firstChild && typeof mwlIcon === 'function') next.innerHTML = mwlIcon('chevronRight', 16);
        }

        yvRenderVerdict(c, isCurrent, lastKey, en);
        yvRenderMap(c, isCurrent, en);
        yvRenderMonths(c, en);
        yvRenderLedger(c, en);
        yvRenderNotes(c, isCurrent, lastKey, en);
    }


    // ── Befund ───────────────────────────────────────────────────────────
    function yvRenderVerdict(c, isCurrent, lastKey, en) {
        var t = c.total;
        var numEl = document.getElementById('yvWorked');
        if (numEl) {
            numEl.innerHTML = t.workDays
                ? yvEsc(yvN(t.worked, 0)) + '<span class="yv-u">h</span>'
                : '—';
        }

        var entryDays = Object.keys(c.byDay).length;
        var subEl = document.getElementById('yvHeadSub');
        if (subEl) {
            subEl.textContent = entryDays
                ? (en ? entryDays + ' days carry an entry · ' + t.workDays + ' of them work days'
                      : entryDays + ' Tage tragen einen Eintrag · davon ' + t.workDays + ' Arbeitstage')
                : (en ? 'Nothing recorded for this year.' : 'Für dieses Jahr ist nichts erfasst.');
        }

        var sayEl = document.getElementById('yvSay');
        if (sayEl) {
            if (!t.workDays) {
                sayEl.textContent = en ? 'The picture below fills itself with your first logged day.'
                                       : 'Das Bild darunter füllt sich mit deinem ersten erfassten Tag.';
            } else if (isCurrent) {
                var pct = Math.round(((new Date() - new Date(c.year, 0, 1)) / (new Date(c.year + 1, 0, 1) - new Date(c.year, 0, 1))) * 100);
                sayEl.textContent = en
                    ? 'The year is ' + pct + '% through. Against target you stand at ' + yvSigned(t.saldo, 1) + ' h.'
                    : 'Das Jahr ist zu ' + pct + '% vorbei. Gegenüber dem Soll stehst du bei ' + yvSigned(t.saldo, 1) + ' h.';
            } else {
                sayEl.textContent = en
                    ? 'A closed year: ' + yvN(t.worked, 0) + ' h against ' + yvN(t.expected, 0) + ' h of target.'
                    : 'Ein abgeschlossenes Jahr: ' + yvN(t.worked, 0) + ' h gegen ' + yvN(t.expected, 0) + ' h Soll.';
            }
        }

        var set = function (id, html, cls) {
            var el = document.getElementById(id);
            if (!el) return;
            el.className = 'yv-fact__v' + (cls ? ' ' + cls : '');
            el.innerHTML = html;
        };
        set('yvSaldo', t.workDays ? yvEsc(yvSigned(t.saldo, 1)) + ' h' : '—',
            !t.workDays || Math.abs(t.saldo) < 0.05 ? '' : (t.saldo > 0 ? 'is-plus' : 'is-minus'));
        set('yvAvgDay', t.workDays ? yvEsc(yvN(t.worked / t.workDays, 1)) + ' h' : '—');
        set('yvDays', Object.keys(c.byDay).length
            ? Object.keys(c.byDay).length + '<small>' + (en ? 'of 365' : 'von 365') + '</small>' : '—');

        var f = yvForecast(c, isCurrent, lastKey);
        set('yvForecast', f.html, f.cls);
    }

    // 🔴 Ehrliche Fortschreibung. Die alte lautete
    //    `endSaldo + (daysLeft * (avgDaily - 8) / 5)` — darin steckten drei
    //    erfundene Konstanten: 365 (kein Schaltjahr), 8 (Tagessoll) und 5
    //    (Wochentage). Jetzt kommt das Soll aus den Einstellungen: gezaehlt
    //    werden die verbleibenden Tage mit Soll > 0, multipliziert mit der
    //    bisher gemessenen Abweichung je Arbeitstag.
    function yvForecast(c, isCurrent, lastKey) {
        var en = yvEN(), t = c.total;
        if (!isCurrent) {
            if (!t.workDays) return { html: '—', cls: '' };
            return { html: yvEsc(yvSigned(t.saldo, 1)) + ' h<small>' + (en ? 'final' : 'endgültig') + '</small>',
                     cls: Math.abs(t.saldo) < 0.05 ? '' : (t.saldo > 0 ? 'is-plus' : 'is-minus') };
        }
        if (!t.workDays) return { html: '—', cls: '' };

        var d = new Date(lastKey + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        var endOfYear = new Date(c.year, 11, 31);
        var remaining = 0;
        while (d <= endOfYear) {
            var soll = (typeof getJobHours === 'function') ? getJobHours('primary', d.getDay())
                     : ((data.settings.hours && data.settings.hours[d.getDay()]) || 0);
            if (soll > 0) remaining++;
            d.setDate(d.getDate() + 1);
        }
        var perDay = t.saldo / t.workDays;
        var proj = t.saldo + remaining * perDay;
        return { html: yvEsc(yvSigned(proj, 1)) + ' h<small>' + (en ? 'projected' : 'fortgeschrieben') + '</small>',
                 cls: Math.abs(proj) < 0.05 ? '' : (proj > 0 ? 'is-plus' : 'is-minus') };
    }


    // ── Das Jahresraster: 7 Zeilen x 53 Wochen ──────────────────────────
    function yvRenderMap(c, isCurrent, en) {
        var grid = document.getElementById('yvMapGrid');
        var daysCol = document.getElementById('yvMapDays');
        var monthsRow = document.getElementById('yvMapMonths');
        if (!grid || !daysCol || !monthsRow) return;

        var mode = yvMapMode();
        document.querySelectorAll('#view-yearview .yv-modes__btn').forEach(function (b) {
            var on = b.dataset.mode === mode;
            b.classList.toggle('is-on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        var sub = document.getElementById('yvMapSub');
        if (sub) {
            sub.textContent = en
                ? 'One field per day, weeks left to right, weekdays top to bottom. The colour shows one thing at a time — pick which.'
                : 'Ein Feld je Tag, Wochen von links nach rechts, Wochentage von oben nach unten. Die Farbe zeigt immer nur eine Sache — welche, wählst du.';
        }

        var loc = yvLoc();
        // Wochentagsspalte: nur Mo/Mi/Fr beschriften, sonst wird es zur Wand.
        var wdHtml = '';
        for (var w = 0; w < 7; w++) {
            var wd = new Date(2024, 0, 8 + w);           // 8.1.2024 war ein Montag
            wdHtml += '<span class="yv-map__wd">' + (w % 2 === 0 ? yvEsc(wd.toLocaleDateString(loc, { weekday: 'short' }).slice(0, 2)) : '') + '</span>';
        }
        daysCol.innerHTML = wdHtml;

        var jan1 = new Date(c.year, 0, 1);
        var lead = (jan1.getDay() || 7) - 1;             // Woche beginnt Montag
        var today = yvToday();
        // 🔴 Stufen als Quartile der erfassten Tage, nicht linear ueber 0..max.
        // Arbeitstage liegen typisch zwischen 6 und 10 Stunden; eine lineare
        // Skala ab null verbraucht die untere Haelfte fuer nichts, und das
        // ganze Jahr faellt in zwei Stufen. Mit Quartilen traegt jede Stufe
        // ein Viertel der Tage — dieselbe Wahl trifft GitHub fuer seinen
        // Beitragskalender, aus demselben Grund.
        var q = yvQuartiles(c.byDay);

        var cells = '';
        for (var i = 0; i < lead; i++) cells += '<span class="yv-cell is-void"></span>';

        var d = new Date(c.year, 0, 1);
        var col = 0;
        while (d.getFullYear() === c.year) {
            var key = yvKey(d);
            var day = c.byDay[key];
            var cls = 'yv-cell', style = '', tip = yvLongDate(key);

            if (isCurrent && key > today) {
                cls += ' is-future';
                tip += ' · ' + (en ? 'still to come' : 'steht noch aus');
                cells += '<span class="' + cls + '" title="' + yvEsc(tip) + '"></span>';
                d.setDate(d.getDate() + 1);
                continue;
            }
            if (key === today) cls += ' is-today';

            if (day) {
                tip += ' · ' + yvCatLabel(day.type);
                if (day.worked > 0) tip += ' · ' + yvN(day.worked, 1) + ' h (' + yvSigned(day.saldo, 1) + ' h)';
                var col = yvCellColor(mode, day, q);
                if (col) style = 'background:' + col + ';';
            } else {
                tip += ' · ' + (en ? 'no entry' : 'kein Eintrag');
            }

            cells += '<button type="button" class="' + cls + '" style="' + style + '" title="' + yvEsc(tip) + '"'
                   + ' onclick="mwlOpenDayInForm(\'' + key + '\')"></button>';
            d.setDate(d.getDate() + 1);
            col++;
        }
        grid.innerHTML = cells;

        // Monatsbeschriftung: jede Marke sitzt auf der Spalte, in der der Monat
        // beginnt — dieselbe Spaltenbreite wie das Raster, deshalb ein eigenes
        // Grid mit 53 Spalten statt absoluter Positionierung.
        var mHtml = '';
        for (var m = 0; m < 12; m++) {
            var first = new Date(c.year, m, 1);
            var offset = Math.floor((lead + Math.round((first - jan1) / 86400000)) / 7);
            mHtml += '<span class="yv-map__month" style="grid-column:' + (offset + 1) + ' / span 5">'
                   + yvEsc(first.toLocaleDateString(loc, { month: 'short' })) + '</span>';
        }
        monthsRow.innerHTML = mHtml;

        yvRenderScale(mode, c, q, en);
    }

    function yvLongDate(key) {
        return new Date(key + 'T00:00:00').toLocaleDateString(yvLoc(), { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    }

    function yvQuartiles(byDay) {
        var v = Object.keys(byDay).map(function (k) { return byDay[k].worked; })
                      .filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
        if (!v.length) return { p25: 0, p50: 0, p75: 0, max: 1, n: 0 };
        var at = function (f) { return v[Math.min(v.length - 1, Math.floor(v.length * f))]; };
        return { p25: at(0.25), p50: at(0.50), p75: at(0.75), max: v[v.length - 1], n: v.length };
    }

    // Ruhige Grundfarbe fuer Arbeitstage im „Art"-Modus.
    var YV_WORK_BASE = 'rgba(var(--primary-rgb), 0.42)';

    // Drei Modi, drei Farbrollen — nie gemischt.
    function yvCellColor(mode, day, q) {
        // 🔴 Arbeit liegt hier bewusst ruhig im Akzentton statt in der Typfarbe.
        // Zwei Gruende, und beide zaehlen:
        //   Gestalterisch — an rund 70 % der Tage wurde gearbeitet. Faerbt man
        //   die alle kraeftig, ist das Bild eine Wand, und die eigentliche
        //   Frage („wann war ich NICHT da") verschwindet darin.
        //   Messbar — Arbeit (#a855f7) und Berufsschule (#2563eb) trennen unter
        //   Protanopie nur ΔE 2,6 (OKLab x100; Ziel ist ≥ 8). Nebeneinander im
        //   Raster sind sie fuer rotblinde Nutzer dieselbe Farbe. Ohne Arbeit
        //   im kategorialen Satz steigt der schlechteste Nachbarabstand auf 8,1.
        //   Gepruefte Restschwaeche: Gleittag (cyan) neben Urlaub (gruen) liegt
        //   bei ΔE 12,5 normalsichtig — unter dem 15er-Boden. Gleittag ist
        //   selten und steht nur dann in der Legende; der Tooltip nennt die Art
        //   ausserdem im Klartext.
        if (mode === 'kind') {
            return day.type === 'work' ? YV_WORK_BASE
                 : 'color-mix(in srgb, ' + yvCat(day.type) + ' 82%, transparent)';
        }

        if (mode === 'balance') {
            if (day.type !== 'work') return null;   // Grundfarbe: hier gibt es keine Abweichung
            var s = day.saldo;
            if (s <= -2)  return 'color-mix(in srgb, var(--danger) 88%, transparent)';
            if (s < -0.05) return 'color-mix(in srgb, var(--danger) 42%, transparent)';
            if (s < 0.05)  return 'var(--expected-color)';
            if (s < 2)     return 'color-mix(in srgb, var(--success) 42%, transparent)';
            return 'color-mix(in srgb, var(--success) 88%, transparent)';
        }

        // amount: eine Hue, fuenf Stufen. Ein erfasster Tag ohne Stunden
        // (Urlaub, Feiertag) bekommt die unterste Stufe — er ist wirklich null.
        var w = day.worked;
        var a = w <= 0 ? 0.14 : (w <= q.p25 ? 0.32 : w <= q.p50 ? 0.52 : w <= q.p75 ? 0.74 : 1);
        return 'rgba(var(--primary-rgb), ' + a + ')';
    }

    function yvRenderScale(mode, c, q, en) {
        var host = document.getElementById('yvMapScale');
        var hint = document.getElementById('yvMapHint');
        if (!host) return;
        var sw = function (color) { return '<span class="yv-scale__sw" style="--sw:' + color + '"></span>'; };

        if (mode === 'kind') {
            var used = {};
            Object.keys(c.byDay).forEach(function (k) { used[c.byDay[k].type] = true; });
            host.innerHTML = YV_CATS.filter(function (t) { return used[t]; }).map(function (t) {
                return '<span class="yv-scale__item">' + sw(t === 'work' ? YV_WORK_BASE : yvCat(t)) + yvEsc(yvCatLabel(t)) + '</span>';
            }).join('') || '<span class="yv-scale__item">' + (en ? 'no entries' : 'keine Einträge') + '</span>';
            if (hint) hint.textContent = en
                ? 'Colour is the kind of day, and says nothing about its length. Work days stay quiet in the background so the days away from work stand out.'
                : 'Die Farbe ist die Art des Tages und sagt nichts über seine Länge. Arbeitstage bleiben ruhig im Hintergrund, damit die Tage abseits der Arbeit hervortreten.';
            return;
        }

        if (mode === 'balance') {
            host.innerHTML =
                '<span class="yv-scale__item">' + (en ? 'under' : 'unter') + '</span>' +
                '<span class="yv-scale__steps">' +
                  sw('color-mix(in srgb, var(--danger) 88%, transparent)') +
                  sw('color-mix(in srgb, var(--danger) 42%, transparent)') +
                  sw('var(--expected-color)') +
                  sw('color-mix(in srgb, var(--success) 42%, transparent)') +
                  sw('color-mix(in srgb, var(--success) 88%, transparent)') +
                '</span>' +
                '<span class="yv-scale__item">' + (en ? 'over' : 'über') + '</span>';
            if (hint) hint.textContent = en
                ? 'Colour is the deviation from that day’s target, grey means on target. Only work days are coloured.'
                : 'Die Farbe ist die Abweichung vom Tagessoll, grau heißt punktgenau. Gefärbt sind nur Arbeitstage.';
            return;
        }

        host.innerHTML =
            '<span class="yv-scale__item">' + (en ? 'less' : 'weniger') + '</span>' +
            '<span class="yv-scale__steps">' +
              sw('rgba(var(--primary-rgb), 0.14)') + sw('rgba(var(--primary-rgb), 0.32)') +
              sw('rgba(var(--primary-rgb), 0.52)') + sw('rgba(var(--primary-rgb), 0.74)') +
              sw('rgba(var(--primary-rgb), 1)') +
            '</span>' +
            '<span class="yv-scale__item">' + (en ? 'more' : 'mehr') + '</span>';
        if (hint) {
            hint.textContent = q.n
                ? (en ? 'Colour is the time worked that day. Each step holds a quarter of your logged days, up to ' + yvN(q.max, 1) + ' h on the longest. Hover a field for the exact figure.'
                      : 'Die Farbe ist die geleistete Zeit des Tages. Jede Stufe fasst ein Viertel deiner erfassten Tage, bis zu ' + yvN(q.max, 1) + ' h am längsten. Der genaue Wert steht im Tooltip.')
                : (en ? 'Colour is the time worked that day.' : 'Die Farbe ist die geleistete Zeit des Tages.');
        }
    }


    // ── Monatszeilen ─────────────────────────────────────────────────────
    function yvRenderMonths(c, en) {
        var host = document.getElementById('yvMonths');
        if (!host) return;
        var sub = document.getElementById('yvMonthsSub');
        var max = Math.max.apply(null, c.months.map(function (m) { return m.worked; }));
        var any = max > 0;
        if (sub) {
            sub.textContent = any
                ? (en ? 'Bar is the time worked, the figure on the right the balance. A click opens that month.'
                      : 'Der Balken ist die geleistete Zeit, die Zahl rechts der Saldo. Ein Klick öffnet den Monat.')
                : (en ? 'Months appear as soon as the year holds entries.' : 'Die Monate erscheinen, sobald das Jahr Einträge trägt.');
        }
        if (!any) {
            host.innerHTML = '<p class="yv-empty">' + (en ? 'Nothing recorded in this year.' : 'In diesem Jahr ist nichts erfasst.') + '</p>';
            return;
        }

        var loc = yvLoc();
        host.innerHTML = c.months.map(function (s, i) {
            var name = new Date(c.year, i, 1).toLocaleDateString(loc, { month: 'short' });
            var empty = s.worked <= 0 && s.workDays === 0;
            var cls = Math.abs(s.saldo) < 0.05 ? '' : (s.saldo > 0 ? 'is-plus' : 'is-minus');
            return '<button type="button" class="yv-month' + (empty ? ' is-empty' : '') + '"'
                 + (empty ? ' disabled' : ' onclick="yvOpenMonth(' + i + ')"')
                 + ' title="' + yvEsc(new Date(c.year, i, 1).toLocaleDateString(loc, { month: 'long', year: 'numeric' })) + '">'
                 + '<span class="yv-month__n">' + yvEsc(name) + '</span>'
                 + '<span class="yv-month__track"><span class="yv-month__fill" style="width:' + ((s.worked / max) * 100).toFixed(2) + '%"></span></span>'
                 + '<span class="yv-month__h">' + yvEsc(yvN(s.worked, 0)) + ' h<small>' + s.workDays + (en ? ' d' : ' T') + '</small></span>'
                 + '<span class="yv-month__s ' + cls + '">' + (empty ? '—' : yvEsc(yvSigned(s.saldo, 1)) + ' h') + '</span>'
                 + '</button>';
        }).join('');
    }

    function yvOpenMonth(month) {
        if (typeof mcPickMonth === 'function') mcPickMonth(selectedYearForView, month);
        if (typeof switchTab === 'function') switchTab('monthcompare');
    }


    // ── Jahreskonto ──────────────────────────────────────────────────────
    // Nur Groessen, die sich wirklich jaehrlich zuruecksetzen. Eine
    // Fortschritts-Schiene bekommt ausschliesslich der Urlaub — er hat als
    // einziger einen echten Nenner (den Anspruch).
    function yvRenderLedger(c, en) {
        var host = document.getElementById('yvLedger');
        if (!host) return;
        var sub = document.getElementById('yvLedgerSub');
        if (sub) {
            sub.textContent = en
                ? 'Yearly quotas and day counts. Only vacation has a real denominator, so only it gets a rail.'
                : 'Jahres-Kontingente und Tageszahlen. Nur der Urlaub hat einen echten Nenner, deshalb hat auch nur er eine Schiene.';
        }

        var t = c.total;
        var carried = parseFloat((data.settings.vacation || {}).carriedOver || 0) || 0;
        var total = (parseFloat((data.settings.vacation || {}).total) || 0) + carried;
        var isThisYear = c.year === new Date().getFullYear();

        var rows = [];
        rows.push({
            cat: 'vacation', icon: 'palmtree',
            name: yvCatLabel('vacation'),
            desc: total > 0
                ? (en ? 'Of ' + yvN(total, 0) + ' days entitlement' + (carried ? ' (incl. ' + yvN(carried, 0) + ' carried over)' : '') + '.'
                      : 'Von ' + yvN(total, 0) + ' Tagen Anspruch' + (carried ? ' (inkl. ' + yvN(carried, 0) + ' Übertrag)' : '') + '.')
                : (en ? 'No entitlement set in the settings.' : 'In den Einstellungen ist kein Anspruch hinterlegt.'),
            value: t.vacation,
            rail: (total > 0 && isThisYear) ? Math.min(100, (t.vacation / total) * 100) : null,
            unit: en ? 'days' : 'Tage'
        });
        rows.push({ cat: 'school', icon: 'graduationCap', name: yvCatLabel('school'),
            desc: en ? 'Days at vocational school.' : 'Tage in der Berufsschule.', value: t.school, unit: en ? 'days' : 'Tage' });
        rows.push({ cat: 'sick', icon: 'thermometer', name: yvCatLabel('sick'),
            desc: en ? 'Days recorded as sick.' : 'Als krank erfasste Tage.', value: t.sick, unit: en ? 'days' : 'Tage' });
        rows.push({ cat: 'holiday', icon: 'partyPopper', name: yvCatLabel('holiday'),
            desc: en ? 'Public holidays that fell on a working day.' : 'Feiertage, die auf einen Arbeitstag fielen.', value: t.holiday, unit: en ? 'days' : 'Tage' });
        if (t.gleittag > 0) {
            rows.push({ cat: 'gleittag', icon: 'zap', name: yvCatLabel('gleittag'),
                desc: en ? 'Days taken off against overtime.' : 'Tage, die gegen Überstunden frei genommen wurden.', value: t.gleittag, unit: en ? 'days' : 'Tage' });
        }

        host.innerHTML = rows.map(function (r) {
            var col = yvCat(r.cat);
            var rgb = (typeof getTypeRgb === 'function') ? getTypeRgb(r.cat) : '148,163,184';
            return '<div class="yv-led" style="--cat:' + col + ';--cat-rgb:' + rgb + '">'
                 + '<span class="yv-led__icon">' + ((typeof mwlIcon === 'function') ? mwlIcon(r.icon, 16) : '') + '</span>'
                 + '<div class="yv-led__body">'
                   + '<div class="yv-led__name">' + yvEsc(r.name) + '</div>'
                   + '<div class="yv-led__desc">' + yvEsc(r.desc) + '</div>'
                   + (r.rail !== null && r.rail !== undefined
                       ? '<div class="yv-led__rail"><div class="yv-led__fill" style="width:' + r.rail.toFixed(2) + '%"></div></div>' : '')
                 + '</div>'
                 + '<div class="yv-led__v">' + r.value + '<small>' + yvEsc(r.unit) + '</small></div>'
                 + '</div>';
        }).join('');
    }


    // ── Auffälligkeiten ──────────────────────────────────────────────────
    // Alles hier ist gerechnet und in einem Satz erklaerbar. Die frueheren
    // „KI-Insights" waren eine if-Kette mit einem Konsistenz-Score aus
    // `workDays / 250` — 250 Arbeitstage hartcodiert, im laufenden Jahr also
    // immer zu niedrig.
    function yvRenderNotes(c, isCurrent, lastKey, en) {
        var host = document.getElementById('yvNotes');
        if (!host) return;
        var t = c.total, loc = yvLoc(), notes = [];

        if (!t.workDays) {
            host.innerHTML = '<p class="yv-empty">' + (en
                ? 'Findings appear once the year holds work days.'
                : 'Auffälligkeiten erscheinen, sobald das Jahr Arbeitstage trägt.') + '</p>';
            return;
        }

        var withData = c.months.map(function (m, i) { return { i: i, worked: m.worked, days: m.workDays }; })
                               .filter(function (m) { return m.worked > 0; });
        var mName = function (i) { return new Date(c.year, i, 1).toLocaleDateString(loc, { month: 'long' }); };

        var strongest = withData.slice().sort(function (a, b) { return b.worked - a.worked; })[0];
        if (strongest) {
            notes.push({ v: yvN(strongest.worked, 0) + ' h', k: en ? 'Strongest month' : 'Stärkster Monat',
                t: en ? mName(strongest.i) + ' — ' + strongest.days + ' work days, ' + yvN(strongest.worked / strongest.days, 1) + ' h on average.'
                      : mName(strongest.i) + ' — ' + strongest.days + ' Arbeitstage, im Schnitt ' + yvN(strongest.worked / strongest.days, 1) + ' h.' });
        }

        // Ø je erfasstem Monat, nicht durch 12. Im August waere „/12" der
        // Schnitt eines Jahres, das noch gar nicht stattgefunden hat.
        if (withData.length) {
            var avg = t.worked / withData.length;
            notes.push({ v: yvN(avg, 0) + ' h', k: en ? 'Average recorded month' : 'Ø je erfasstem Monat',
                t: en ? 'Across ' + withData.length + ' months with entries. Empty months are left out on purpose.'
                      : 'Über ' + withData.length + ' Monate mit Einträgen. Leere Monate bleiben bewusst draußen.' });
        }

        // Beste/schlechteste Woche ueber die tatsaechlich vorhandenen Wochen —
        // die alte Fassung startete bei 0 und zeigte „KW 0", sobald jede Woche
        // im Minus lag.
        var weeks = c.weeks.filter(function (w) { return w.worked > 0; });
        if (weeks.length) {
            var best = weeks.slice().sort(function (a, b) { return b.saldo - a.saldo; })[0];
            var worst = weeks.slice().sort(function (a, b) { return a.saldo - b.saldo; })[0];
            notes.push({ v: yvSigned(best.saldo, 1) + ' h', cls: best.saldo >= 0 ? 'is-plus' : 'is-minus',
                k: en ? 'Best week' : 'Beste Woche',
                t: (en ? 'Calendar week ' : 'Kalenderwoche ') + best.num + ' (' + yvShortRange(best.monday, loc) + '), '
                   + yvN(best.worked, 1) + (en ? ' h worked.' : ' h geleistet.') });
            if (worst.monday !== best.monday) {
                notes.push({ v: yvSigned(worst.saldo, 1) + ' h', cls: worst.saldo >= 0 ? 'is-plus' : 'is-minus',
                    k: en ? 'Weakest week' : 'Schwächste Woche',
                    t: (en ? 'Calendar week ' : 'Kalenderwoche ') + worst.num + ' (' + yvShortRange(worst.monday, loc) + '), '
                       + yvN(worst.worked, 1) + (en ? ' h worked.' : ' h geleistet.') });
            }
        }

        var streak = yvStreak(c.year, c.byDay, lastKey);
        if (streak.len > 1) {
            notes.push({ v: streak.len + (en ? ' days' : ' Tage'), k: en ? 'Longest run' : 'Längste Serie',
                t: (en ? 'Work days in a row without a gap, ending ' : 'Arbeitstage am Stück ohne Lücke, zuletzt am ')
                   + new Date(streak.end + 'T00:00:00').toLocaleDateString(loc, { day: '2-digit', month: 'long' })
                   + (en ? '. Weekends, vacation, holidays and school do not break the run.'
                         : '. Wochenenden, Urlaub, Feiertage und Schule unterbrechen sie nicht.') });
        }

        notes.push({ v: t.over + ' / ' + t.under, k: en ? 'Over and under target' : 'Über und unter dem Soll',
            t: en ? t.over + ' work days ran past their target, ' + t.under + ' stopped short of it, out of ' + t.workDays + ' in total.'
                  : t.over + ' Arbeitstage gingen über ihr Soll hinaus, ' + t.under + ' blieben darunter — von insgesamt ' + t.workDays + '.' });

        host.innerHTML = notes.map(function (n) {
            return '<div class="yv-note">'
                 + '<span class="yv-note__v ' + (n.cls || '') + '">' + yvEsc(n.v) + '</span>'
                 + '<div class="yv-note__body"><div class="yv-note__k">' + yvEsc(n.k) + '</div>'
                 + '<div class="yv-note__t">' + yvEsc(n.t) + '</div></div>'
                 + '</div>';
        }).join('');
    }

    function yvShortRange(mondayKey, loc) {
        var a = new Date(mondayKey + 'T00:00:00');
        var b = new Date(a); b.setDate(b.getDate() + 6);
        var f = { day: '2-digit', month: '2-digit' };
        return a.toLocaleDateString(loc, f) + '–' + b.toLocaleDateString(loc, f);
    }
