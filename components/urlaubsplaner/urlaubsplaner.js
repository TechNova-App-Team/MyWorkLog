// ═══ URLAUBSPLANER MODULE ═══
// Findet Brueckentage: Fenster, in denen wenige Urlaubstage eine lange
// zusammenhaengende Freizeit ergeben. Rechnet ausschliesslich mit echten
// Daten — Feiertage des eingestellten Bundeslands (getGermanHolidays) und
// dem Wochenplan aus data.settings.hours. Keine externen Quellen.

    // Hoechstens so viele Arbeits-Luecken werden zu EINEM Vorschlag verbunden.
    // Daraus folgt die maximale Vorschlagsgroesse; 3 deckt Ostern und
    // Weihnachten/Neujahr ab, ohne absurde Monatsbloecke zu erzeugen.
    var UP_MAX_MERGE = 3;
    var UP_MAX_RESULTS = 6;

    var upState = { year: new Date().getFullYear(), suggestions: [], days: [] };

    // i18n: JS-generierter Text wird von der statischen Pipeline nicht erfasst.
    // Lokal definiert, damit keine Ladereihenfolge-Abhaengigkeit entsteht.
    function upL(de, en) {
        try { return document.documentElement.lang === 'en' ? en : de; } catch (e) { return de; }
    }
    // Feiertagsnamen werden in laengere Strings eingesetzt ("Weihnachten,
    // Neujahr") — als MAP-Eintrag im i18n-Runtime greift das nicht, weil der
    // dort immer den GANZEN Textknoten braucht. Deshalb hier uebersetzen.
    var UP_HOLIDAY_EN = {
        'Neujahr': "New Year's Day",
        'Heilige Drei Könige': 'Epiphany',
        'Internationaler Frauentag': "International Women's Day",
        'Karfreitag': 'Good Friday',
        'Ostermontag': 'Easter Monday',
        'Tag der Arbeit': 'Labour Day',
        'Christi Himmelfahrt': 'Ascension Day',
        'Pfingstmontag': 'Whit Monday',
        'Fronleichnam': 'Corpus Christi',
        'Mariä Himmelfahrt': 'Assumption Day',
        'Weltkindertag': "World Children's Day",
        'Tag der Deutschen Einheit': 'German Unity Day',
        'Reformationstag': 'Reformation Day',
        'Allerheiligen': "All Saints' Day",
        'Buß- und Bettag': 'Day of Repentance and Prayer',
        '1. Weihnachtstag': 'Christmas Day',
        '2. Weihnachtstag': 'Boxing Day'
    };

    function upHolidayName(de) {
        try {
            if (document.documentElement.lang !== 'en') return de;
        } catch (e) { return de; }
        return UP_HOLIDAY_EN[de] || de;
    }

    function upPad(n) { return (n < 10 ? '0' : '') + n; }
    function upKey(d) { return d.getFullYear() + '-' + upPad(d.getMonth() + 1) + '-' + upPad(d.getDate()); }
    function upLocale() { return (typeof mwlLocale === 'function') ? mwlLocale() : 'de-DE'; }

    // ── Datenbasis ──────────────────────────────────────────────────────────

    function upVacationMode() {
        if (typeof getVacationMode === 'function') return getVacationMode();
        return (data.settings && data.settings.vacation && data.settings.vacation.mode) || 'days';
    }

    function upRefHours() {
        if (typeof getVacationRefHours === 'function') return getVacationRefHours();
        var wd = [1, 2, 3, 4, 5].map(function (i) {
            return (data.settings.hours && data.settings.hours[i]) || 0;
        }).filter(function (h) { return h > 0; });
        return wd.length ? (wd.reduce(function (a, b) { return a + b; }, 0) / wd.length) : 8;
    }

    // Budget IMMER in Tagen — im Stundenmodus wird ueber den Wochenschnitt
    // umgerechnet, damit die Brueckentag-Logik nur eine Einheit kennt.
    function upBudget(year) {
        var v = (data.settings && data.settings.vacation) || {};
        var total = parseFloat(v.total);
        if (isNaN(total)) total = 0;

        var currentYear = new Date().getFullYear();
        var isFuture = year > currentYear;

        // Entitlement and carried-over vacation:
        // Match Dashboard logic: total vacation = v.total + carriedOver.
        // Live dashboard and yearview do not prorate mid-year, so we use
        // total directly to keep all counters 100% consistent across views.
        var carriedOver = isFuture ? 0 : (parseFloat(v.carriedOver || 0) || 0);
        var totalBudget = total + carriedOver;

        var used = isFuture ? 0 : (parseFloat(v.used) || 0);
        var remaining = Math.max(0, totalBudget - used);

        var ref = upRefHours();
        var toDays = function (x) { return upVacationMode() === 'hours' ? (ref > 0 ? x / ref : 0) : x; };

        // Überstundensaldo (Gleitzeit-Saldo) ermitteln wie auf dem Dashboard
        var overtimeHours = 0;
        if (typeof getRawSaldo === 'function') {
            overtimeHours = getRawSaldo();
        } else {
            (Array.isArray(data.entries) ? data.entries : []).forEach(function (e) {
                if (e) overtimeHours += (parseFloat(e.diff) || 0);
            });
        }
        overtimeHours = Math.round(overtimeHours * 100) / 100;
        var overtimeDays = overtimeHours > 0 ? Math.floor(toDays(overtimeHours) + 1e-9) : 0;
        var remainingDays = Math.floor(toDays(remaining) + 1e-9);

        return {
            mode: upVacationMode(),
            refHours: ref,
            isFuture: isFuture,
            entitlement: total,
            carriedOver: carriedOver,
            totalBudget: totalBudget,
            used: used,
            remaining: remaining,
            remainingDays: remainingDays,
            overtimeHours: overtimeHours,
            overtimeDays: overtimeDays,
            totalPlanableDays: remainingDays + overtimeDays
        };
    }

    function upHolidayMap(year) {
        var map = {};
        if (typeof getGermanHolidays !== 'function') return map;
        [year - 1, year, year + 1].forEach(function (y) {
            try {
                getGermanHolidays(y).forEach(function (h) { map[h.date] = h.name; });
            } catch (e) { /* Jahr ueberspringen, Rest bleibt nutzbar */ }
        });
        return map;
    }

    function upIsOvertimeEntry(e) {
        if (!e) return false;
        var t = (e.type || '').toLowerCase();
        if (t === 'gleittag' || t === 'overtime' || t === 'zeitausgleich') return true;
        if (t.indexOf('überstund') !== -1 || t.indexOf('ueberstund') !== -1) return true;
        if (e.info && typeof e.info === 'string') {
            var info = e.info.toLowerCase();
            if (t !== 'vacation' && (info.indexOf('überstundenabbau') !== -1 || info.indexOf('gleittag') !== -1)) return true;
        }
        return false;
    }

    function upIsVacationEntry(e) {
        return !!(e && e.type === 'vacation' && !upIsOvertimeEntry(e));
    }

    function upEntryMaps() {
        var vac = {}, ot = {};
        (data.entries || []).forEach(function (e) {
            if (!e || !e.date) return;
            if (upIsVacationEntry(e)) {
                vac[e.date] = true;
            } else if (upIsOvertimeEntry(e)) {
                ot[e.date] = true;
            }
        });
        return { vacation: vac, overtime: ot };
    }

    // Tagesraster fuer das Jahr plus je 31 Tage Rand — sonst faende der Planer
    // die Weihnachts-/Neujahrs-Bruecke ueber die Jahresgrenze nicht.
    function upBuildDays(year, holidayMap, entryMaps) {
        var days = [];
        var d = new Date(year - 1, 11, 1);
        var end = new Date(year + 1, 0, 31);
        var hours = (data.settings && data.settings.hours) || {};
        var vacMap = (entryMaps && entryMaps.vacation) || {};
        var otMap = (entryMaps && entryMaps.overtime) || {};

        while (d <= end) {
            var key = upKey(d);
            var dow = d.getDay();
            var hol = holidayMap[key] || null;
            var booked = !!vacMap[key];
            var overtime = !!otMap[key];
            var noDuty = !((hours[dow] || 0) > 0);

            days.push({
                key: key,
                date: new Date(d),
                year: d.getFullYear(),
                dow: dow,
                holiday: hol,
                booked: booked,
                overtime: overtime,
                // Feiertag, der auf einen Arbeitstag faellt — nur DER spart
                // wirklich einen Urlaubstag. Faellt er auf Samstag/Sonntag,
                // bringt er null und darf keine Empfehlung begruenden.
                holGain: !!hol && !noDuty,
                // "kostet keinen weiteren Urlaubstag": Feiertag, dienstfreier
                // Wochentag, bereits gebuchter Urlaub oder Überstundenabbau.
                free: !!hol || noDuty || booked || overtime
            });
            d.setDate(d.getDate() + 1);
        }
        return days;
    }

    // ── Brueckentag-Suche ───────────────────────────────────────────────────

    function upFindSuggestions(days, budgetDays, year) {
        var todayKey = upKey(new Date());

        // Luecken = zusammenhaengende Tage, die echten Urlaub kosten wuerden.
        var gaps = [], i = 0;
        while (i < days.length) {
            if (days[i].free) { i++; continue; }
            var s = i;
            while (i < days.length && !days[i].free) i++;
            gaps.push({ start: s, end: i - 1, len: i - s });
        }

        var cands = [];

        function addCand(startDayIdx, endDayIdx, why, isHolidayBridge) {
            var gapDays = [];
            var valid = true;
            for (var x = startDayIdx; x <= endDayIdx; x++) {
                if (days[x].free) continue;
                if (days[x].key < todayKey || days[x].year !== year) { valid = false; break; }
                gapDays.push(days[x]);
            }
            if (!valid || !gapDays.length) return;
            var cost = gapDays.length;
            if (cost < 1 || cost > budgetDays) return;

            var a = startDayIdx - 1; while (a >= 0 && days[a].free) a--; a++;
            var b = endDayIdx + 1; while (b < days.length && days[b].free) b++; b--;
            if (a < 0 || b >= days.length || b <= a) return;

            var gain = b - a + 1;
            if (gain <= cost) return;

            cands.push({
                from: days[a], to: days[b],
                cost: cost, gain: gain,
                ratio: gain / cost,
                holidays: why ? [why] : [],
                isHolidayBridge: !!isHolidayBridge,
                gapDays: gapDays.slice(),
                gapRanges: [{ s: days[startDayIdx].key, e: days[endDayIdx].key }]
            });
        }

        // 1. Reguläre Brücken (ganze Gaps & Multi-Gap Merges)
        for (var g = 0; g < gaps.length; g++) {
            var cost = 0;
            for (var m = 0; m < UP_MAX_MERGE && g + m < gaps.length; m++) {
                var first = gaps[g], last = gaps[g + m];
                cost += last.len;
                if (cost < 1 || cost > budgetDays) break;

                // Urlaubstage muessen in der Zukunft und im Zieljahr liegen —
                // das Kontingent ist ein Kalenderjahres-Anspruch.
                var valid = true, gapDays = [];
                for (var q = 0; q <= m; q++) {
                    for (var x = gaps[g + q].start; x <= gaps[g + q].end; x++) {
                        if (days[x].key < todayKey || days[x].year !== year) { valid = false; break; }
                        gapDays.push(days[x]);
                    }
                    if (!valid) break;
                }
                if (!valid) continue;

                // Freizeit-Strecke nach aussen bis zum Ende der freien Bloecke.
                var a = first.start - 1; while (a >= 0 && days[a].free) a--; a++;
                var b = last.end + 1; while (b < days.length && days[b].free) b++; b--;
                if (a < 0 || b >= days.length || b <= a) continue;

                var gain = b - a + 1;
                if (gain <= cost) continue;

                var holNames = [];
                var weekendHolNames = [];
                for (var h = a; h <= b; h++) {
                    var hn = upHolidayName(days[h].holiday);
                    if (days[h].holiday) {
                        if (days[h].holGain && holNames.indexOf(hn) === -1) holNames.push(hn);
                        else if (!days[h].holGain && weekendHolNames.indexOf(hn) === -1) weekendHolNames.push(hn);
                    }
                }

                if (holNames.length > 0) {
                    // Echter Brückentag
                    cands.push({
                        from: days[a], to: days[b],
                        cost: cost, gain: gain,
                        ratio: gain / cost,
                        holidays: holNames,
                        isHolidayBridge: true,
                        gapDays: gapDays.slice(),
                        gapRanges: (function () {
                            var r = [];
                            for (var q = 0; q <= m; q++) r.push({ s: days[gaps[g + q].start].key, e: days[gaps[g + q].end].key });
                            return r;
                        })()
                    });
                } else if (weekendHolNames.length > 0 && cost <= 5) {
                    // Brücke zu Wochenend-Feiertag (z.B. Tag der Deutschen Einheit)
                    cands.push({
                        from: days[a], to: days[b],
                        cost: cost, gain: gain,
                        ratio: gain / cost,
                        holidays: [weekendHolNames.join(', ') + ' (' + upL('Wochenende', 'Weekend') + ')'],
                        isHolidayBridge: false,
                        gapDays: gapDays.slice(),
                        gapRanges: (function () {
                            var r = [];
                            for (var q = 0; q <= m; q++) r.push({ s: days[gaps[g + q].start].key, e: days[gaps[g + q].end].key });
                            return r;
                        })()
                    });
                } else if (m === 0 && cost <= 5 && gain / cost >= 1.5) {
                    // Zusammenhängende Urlaubswoche (z.B. 5 Tage für 9 Tage frei)
                    cands.push({
                        from: days[a], to: days[b],
                        cost: cost, gain: gain,
                        ratio: gain / cost,
                        holidays: [cost >= 4 ? upL('Urlaubswoche', 'Vacation week') : upL('Verlängertes Wochenende', 'Long weekend')],
                        isHolidayBridge: false,
                        gapDays: gapDays.slice(),
                        gapRanges: [{ s: days[gaps[g].start].key, e: days[gaps[g].end].key }]
                    });
                }
            }
        }

        // 2. Verlängerte Wochenenden innerhalb eines Gaps (Freitag frei ODER Montag frei)
        for (var g = 0; g < gaps.length; g++) {
            var gap = gaps[g];
            if (gap.len >= 3) {
                // Freitag (letzter Tag des Gaps):
                var friIdx = gap.end;
                if (days[friIdx].dow === 5) {
                    var satSunHol = null;
                    for (var hf = friIdx + 1; hf <= Math.min(days.length - 1, friIdx + 2); hf++) {
                        if (days[hf].holiday) satSunHol = upHolidayName(days[hf].holiday);
                    }
                    var whyFri = satSunHol ? satSunHol + ' (' + upL('Brückentag', 'Bridge day') + ')' : upL('Verlängertes Wochenende (Freitag)', 'Long weekend (Friday)');
                    addCand(friIdx, friIdx, whyFri, !!satSunHol);
                }
                // Montag (erster Tag des Gaps):
                var monIdx = gap.start;
                if (days[monIdx].dow === 1) {
                    var monSatSunHol = null;
                    for (var hm = Math.max(0, monIdx - 2); hm < monIdx; hm++) {
                        if (days[hm].holiday) monSatSunHol = upHolidayName(days[hm].holiday);
                    }
                    var whyMon = monSatSunHol ? monSatSunHol + ' (' + upL('Brückentag', 'Bridge day') + ')' : upL('Verlängertes Wochenende (Montag)', 'Long weekend (Monday)');
                    addCand(monIdx, monIdx, whyMon, !!monSatSunHol);
                }
            }
        }

        cands.sort(function (x, y) {
            if (x.isHolidayBridge !== y.isHolidayBridge) return x.isHolidayBridge ? -1 : 1;
            return (y.ratio - x.ratio) || (y.gain - x.gain) || (x.cost - y.cost);
        });

        // Nur ueberschneidungsfreie Vorschlaege — sonst schlagen wir Tage
        // mehrfach vor und die Kostensumme waere gelogen.
        var taken = {}, out = [], spent = 0;
        for (var c = 0; c < cands.length && out.length < UP_MAX_RESULTS; c++) {
            var cd = cands[c], clash = false;
            for (var k = 0; k < cd.gapDays.length; k++) {
                if (taken[cd.gapDays[k].key]) { clash = true; break; }
            }
            if (clash) continue;
            if (spent + cd.cost > budgetDays) continue;
            cd.gapDays.forEach(function (dd) { taken[dd.key] = true; });
            spent += cd.cost;
            out.push(cd);
        }
        return out;
    }

    // ── Formatierung ────────────────────────────────────────────────────────

    function upFmtDate(d) {
        return d.toLocaleDateString(upLocale(), { day: 'numeric', month: 'long' });
    }

    function upFmtRange(a, b) {
        var sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
        if (sameMonth) {
            // Der Ordinalpunkt ist deutsch ("6. – 9. Mai"); auf Englisch waere
            // "6. – 9 May" falsch.
            return a.getDate() + upL('. – ', ' – ') + b.toLocaleDateString(upLocale(), { day: 'numeric', month: 'long' });
        }
        return upFmtDate(a) + ' – ' + upFmtDate(b);
    }

    function upFmtCost(costDays, budget) {
        if (budget.mode === 'hours') {
            var h = costDays * budget.refHours;
            return (Math.round(h * 10) / 10).toLocaleString(upLocale()) + ' h';
        }
        return costDays + ' ' + (costDays === 1 ? upL('Urlaubstag', 'vacation day') : upL('Urlaubstage', 'vacation days'));
    }

    function upFmtBalance(val, budget) {
        if (budget.mode === 'hours') return (Math.round(val * 10) / 10).toLocaleString(upLocale()) + ' h';
        return (Math.round(val * 10) / 10).toLocaleString(upLocale());
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    function renderUrlaubsplaner() {
        var host = document.getElementById('view-urlaubsplaner');
        if (!host) return;

        var yearSel = document.getElementById('upYear');
        if (yearSel && yearSel.options.length === 0) {
            var cy = new Date().getFullYear();
            [cy, cy + 1].forEach(function (y) {
                var o = document.createElement('option');
                o.value = String(y); o.textContent = String(y);
                yearSel.appendChild(o);
            });
            yearSel.value = String(upState.year);
        }

        var year = upState.year;
        var budget = upBudget(year);
        var holidayMap = upHolidayMap(year);
        var entryMaps = upEntryMaps();
        var days = upBuildDays(year, holidayMap, entryMaps);
        var planableDays = Math.max(budget.remainingDays + (budget.overtimeDays || 0), 1);
        var suggestions = upFindSuggestions(days, planableDays, year);

        upState.days = days;
        upState.suggestions = suggestions;

        upRenderBudget(budget, year);
        upRenderSuggestions(suggestions, budget, year);
        upRenderCalendar(days, year, suggestions);
    }

    function upRenderBudget(budget, year) {
        var set = function (id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; };
        set('upStatRemaining', upFmtBalance(budget.remaining, budget));
        set('upStatUsed', upFmtBalance(budget.used, budget));
        set('upStatTotal', upFmtBalance(budget.totalBudget, budget));

        var totalEl = document.getElementById('upStatTotal');
        if (totalEl) {
            totalEl.title = budget.carriedOver > 0
                ? upL('Inkl. ' + upFmtBalance(budget.carriedOver, budget) + ' Resturlaub aus dem Vorjahr',
                       'Incl. ' + upFmtBalance(budget.carriedOver, budget) + ' carried-over leave from previous year')
                : '';
        }

        var otEl = document.getElementById('upStatOvertime');
        if (otEl) {
            var otSign = budget.overtimeHours > 0 ? '+' : (budget.overtimeHours < 0 ? '−' : '');
            var nf = new Intl.NumberFormat(upLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            otEl.textContent = otSign + nf.format(Math.abs(budget.overtimeHours));
        }

        var unit = document.getElementById('upStatUnit');
        if (unit) unit.textContent = budget.mode === 'hours' ? upL('Stunden', 'hours') : upL('Tage', 'days');

        var note = document.getElementById('upBudgetNote');
        if (note) {
            if (budget.isFuture) {
                note.textContent = upL(
                    'Voller Jahresanspruch — im nächsten Jahr ist noch nichts verbraucht.',
                    'Full annual entitlement. Nothing used yet next year.'
                );
            } else if (budget.carriedOver > 0) {
                note.textContent = upL(
                    'Inkl. ' + upFmtBalance(budget.carriedOver, budget) + ' Resturlaub aus dem Vorjahr. Resturlaub verfällt in der Regel zum 31. Dezember ' + year + '.',
                    'Incl. ' + upFmtBalance(budget.carriedOver, budget) + ' carried-over leave from previous year. Remaining leave usually expires on 31 December ' + year + '.'
                );
            } else {
                note.textContent = upL(
                    'Resturlaub verfällt in der Regel zum 31. Dezember ' + year + '.',
                    'Remaining leave usually expires on 31 December ' + year + '.'
                );
            }
        }
    }

    function upRenderSuggestions(list, budget, year) {
        var host = document.getElementById('upSuggestions');
        if (!host) return;
        host.innerHTML = '';

        var bl = (data.settings && data.settings.bundesland) || '';
        if (!bl) {
            host.appendChild(upEmptyState(
                upL('Bundesland fehlt', 'Federal state missing'),
                upL('Ohne Bundesland kennt der Planer nur die neun bundesweiten Feiertage. Regionale Feiertage — und damit die meisten Brückentage — fehlen.',
                    'Without a federal state the planner only knows the nine nationwide holidays. Regional holidays, and with them most bridge days, are missing.'),
                upL('Bundesland wählen', 'Choose federal state'),
                'openSettings()'
            ));
            return;
        }

        if (budget.remainingDays < 1 && budget.overtimeDays < 1) {
            host.appendChild(upEmptyState(
                upL('Kein Kontingent verfügbar', 'No quota available'),
                upL('Für ' + year + ' ist weder Resturlaub noch ein Überstundenguthaben vorhanden.',
                    'For ' + year + ' neither remaining leave nor flextime overtime is available.'),
                upL('Urlaubsanspruch prüfen', 'Check entitlement'),
                'openSettings()'
            ));
            return;
        }

        if (!list.length) {
            host.appendChild(upEmptyState(
                upL('Keine Brückentage gefunden', 'No bridge days found'),
                upL('Für den Rest von ' + year + ' liegt kein Feiertag so, dass sich mit deinem Wochenplan eine lohnende Brücke ergibt.',
                    'For the rest of ' + year + ' no holiday falls in a way that creates a worthwhile bridge with your weekly schedule.'),
                '', ''
            ));
            return;
        }

        list.forEach(function (s, idx) {
            host.appendChild(upSuggestionCard(s, idx, budget));
        });
    }

    function upSuggestionCard(s, idx, budget) {
        var card = document.createElement('article');
        card.className = 'up-sug';

        var ratio = (Math.round(s.ratio * 10) / 10).toLocaleString(upLocale());
        var why = s.holidays.length
            ? s.holidays.join(', ')
            : upL('Verlängertes Wochenende', 'Long weekend');

        var canBookOvertime = budget.overtimeHours >= (s.cost * budget.refHours);
        var bookButtons = '';
        if (canBookOvertime && budget.mode === 'hours') {
            bookButtons =
                '<div class="up-sug__btns">' +
                    '<button type="button" class="up-sug__book" onclick="upBookSuggestion(' + idx + ', \'vacation\')" title="' + esc(upL('Als Urlaub buchen', 'Book as leave')) + '">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' +
                        esc(upL('Urlaub', 'Leave')) +
                    '</button>' +
                    '<button type="button" class="up-sug__book up-sug__book--ot" onclick="upBookSuggestion(' + idx + ', \'gleittag\')" title="' + esc(upL('Als Gleittag (Überstundenabbau) buchen', 'Book as flextime (overtime reduction)')) + '">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                        esc(upL('Gleittag', 'Flextime')) +
                    '</button>' +
                '</div>';
        } else {
            bookButtons =
                '<button type="button" class="up-sug__book" onclick="upBookSuggestion(' + idx + ', \'vacation\')">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' +
                    esc(upL('Eintragen', 'Book')) +
                '</button>';
        }

        card.innerHTML =
            '<div class="up-sug__rank" aria-hidden="true">' + (idx + 1) + '</div>' +
            '<div class="up-sug__main">' +
                '<h3 class="up-sug__range">' + esc(upFmtRange(s.from.date, s.to.date)) + '</h3>' +
                '<p class="up-sug__why">' + esc(why) + '</p>' +
                '<div class="up-sug__math">' +
                    '<span class="up-sug__cost">' + esc(upFmtCost(s.cost, budget)) + '</span>' +
                    '<svg class="up-sug__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>' +
                    '<span class="up-sug__gain">' + s.gain + ' ' + esc(upL('Tage frei', 'days off')) + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="up-sug__side">' +
                '<div class="up-sug__ratio"><span class="up-sug__ratio-num">' + esc(ratio) + '×</span>' +
                '<span class="up-sug__ratio-lbl">' + esc(upL('Ausbeute', 'return')) + '</span></div>' +
                bookButtons +
            '</div>';
        return card;
    }

    function upEmptyState(title, body, btnLabel, btnAction) {
        var el = document.createElement('div');
        el.className = 'up-empty';
        el.innerHTML =
            '<svg class="up-empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/></svg>' +
            '<h3 class="up-empty__title">' + esc(title) + '</h3>' +
            '<p class="up-empty__body">' + esc(body) + '</p>' +
            (btnLabel ? '<button type="button" class="up-empty__btn" onclick="' + btnAction + '">' + esc(btnLabel) + '</button>' : '');
        return el;
    }

    function upRenderCalendar(days, year, suggestions) {
        var host = document.getElementById('upCalendar');
        if (!host) return;
        host.innerHTML = '';

        var sug = {};
        suggestions.forEach(function (s, i) {
            s.gapDays.forEach(function (d) { sug[d.key] = i + 1; });
        });

        var byKey = {};
        days.forEach(function (d) { byKey[d.key] = d; });

        var todayKey = upKey(new Date());
        var frag = document.createDocumentFragment();

        for (var m = 0; m < 12; m++) {
            var monthEl = document.createElement('section');
            monthEl.className = 'up-m';

            var name = new Date(year, m, 1).toLocaleDateString(upLocale(), { month: 'long' });
            var head = document.createElement('h3');
            head.className = 'up-m__name';
            head.textContent = name;
            monthEl.appendChild(head);

            var grid = document.createElement('div');
            grid.className = 'up-m__grid';

            // Wochentagskopf, Montag zuerst (ISO)
            for (var w = 0; w < 7; w++) {
                var wd = document.createElement('span');
                wd.className = 'up-m__wd';
                var ref = new Date(2024, 0, 1 + w); // 1.1.2024 war ein Montag
                wd.textContent = ref.toLocaleDateString(upLocale(), { weekday: 'short' }).slice(0, 2);
                grid.appendChild(wd);
            }

            var firstDow = new Date(year, m, 1).getDay();
            var lead = (firstDow + 6) % 7; // Montag = 0
            for (var l = 0; l < lead; l++) {
                var sp = document.createElement('span');
                sp.className = 'up-d up-d--pad';
                grid.appendChild(sp);
            }

            var dim = new Date(year, m + 1, 0).getDate();
            for (var dnum = 1; dnum <= dim; dnum++) {
                var key = year + '-' + upPad(m + 1) + '-' + upPad(dnum);
                var info = byKey[key];
                var cell = document.createElement('span');
                cell.className = 'up-d';
                cell.textContent = String(dnum);

                var label = key;
                if (info) {
                    if (key < todayKey) cell.classList.add('up-d--past');
                    if (sug[key]) {
                        cell.classList.add('up-d--sug');
                        label = upL('Vorschlag ', 'Suggestion ') + sug[key] + ' — ' + upL('Urlaubstag', 'vacation day');
                    } else if (info.overtime) {
                        cell.classList.add('up-d--overtime');
                        label = upL('Überstunden', 'Overtime');
                    } else if (info.booked) {
                        cell.classList.add('up-d--vac');
                        label = upL('Gebuchter Urlaub', 'Booked leave');
                    } else if (info.holiday) {
                        cell.classList.add('up-d--hol');
                        label = upHolidayName(info.holiday);
                    } else if (info.free) {
                        cell.classList.add('up-d--free');
                        label = upL('Dienstfrei', 'Non-working day');
                    }
                }
                cell.title = label;
                grid.appendChild(cell);
            }

            monthEl.appendChild(grid);
            frag.appendChild(monthEl);
        }
        host.appendChild(frag);
    }

    // ── Aktionen ────────────────────────────────────────────────────────────

    function upBookSuggestion(idx, bookingType) {
        var s = upState.suggestions[idx];
        if (!s) return;

        var isOvertime = bookingType === 'gleittag';
        var isMix = bookingType === 'mix';
        var keys = s.gapDays.map(function (d) { return d.key; });
        var existing = (data.entries || []).filter(function (e) { return keys.indexOf(e.date) !== -1; });

        var doBook = function () {
            var hours = (data.settings && data.settings.hours) || {};
            var ref = upRefHours();
            var remVac = upBudget(upState.year).remainingDays;

            // Bestehende Eintraege an diesen Tagen weichen dem gebuchten Tag —
            // gleiches Verhalten wie bookPeriod().
            if (existing.length) {
                data.entries = data.entries.filter(function (e) { return keys.indexOf(e.date) === -1; });
            }

            s.gapDays.forEach(function (d) {
                var expected = (hours[d.dow] || 0) > 0 ? hours[d.dow] : ref;
                var currentType = isOvertime ? 'gleittag' : 'vacation';
                
                if (isMix) {
                    if (remVac > 0) {
                        currentType = 'vacation';
                        remVac--;
                    } else {
                        currentType = 'gleittag';
                    }
                }
                
                var isOt = currentType === 'gleittag';

                data.entries.push({
                    id: Date.now() + Math.random(),
                    date: d.key,
                    type: isOt ? 'gleittag' : 'vacation',
                    worked: isOt ? 0 : expected,
                    expected: expected,
                    diff: isOt ? -expected : 0,
                    info: isOt ? 'Gleittag (Überstundenabbau)' : 'Urlaub (Brückentag)',
                    isPeriod: true,
                    breakMins: 0,
                    shiftEnd: '',
                    shiftWarning: false
                });
            });

            if (typeof recalculateVacationUsed === 'function') recalculateVacationUsed();
            if (typeof save === 'function') save();
            if (typeof updateUI === 'function') updateUI();
            if (typeof mwlEvent === 'function') mwlEvent(isMix ? 'urlaubsplaner_mix_gebucht' : (isOvertime ? 'urlaubsplaner_gleittag_gebucht' : 'urlaubsplaner_gebucht'), { tage: s.cost });

            renderUrlaubsplaner();
            var successTitle = isMix ? upL('Urlaub & Gleitzeit eingetragen', 'Leave & Flextime booked') : (isOvertime ? upL('Gleittag eingetragen', 'Flextime booked') : upL('Urlaub eingetragen', 'Leave booked'));
            var successMsg = isMix
                ? upL(s.cost + ' Tage kombiniert eingetragen — ' + s.gain + ' Tage am Stück frei.',
                      s.cost + ' mixed days booked. ' + s.gain + ' days off in a row.')
                : (isOvertime
                    ? upL(s.cost + ' Gleittag(e) eingetragen — ' + s.gain + ' Tage am Stück frei.',
                          s.cost + ' flextime day(s) booked. ' + s.gain + ' days off in a row.')
                    : upL(s.cost + ' Urlaubstag(e) eingetragen — ' + s.gain + ' Tage am Stück frei.',
                          s.cost + ' vacation day(s) booked. ' + s.gain + ' days off in a row.'));

            showCustomMessage(successTitle, successMsg, 'success');
        };

        if (existing.length) {
            var confirmMsg = isMix
                ? upL(existing.length + ' vorhandene Einträge in diesem Zeitraum werden überschrieben.',
                      existing.length + ' existing entries in this range will be overwritten.')
                : (isOvertime
                    ? upL(existing.length + ' vorhandene Einträge in diesem Zeitraum werden durch Gleittage ersetzt.',
                          existing.length + ' existing entries in this range will be replaced by flextime.')
                    : upL(existing.length + ' vorhandene Einträge in diesem Zeitraum werden durch Urlaub ersetzt.',
                          existing.length + ' existing entries in this range will be replaced by leave.'));
            showCustomConfirm(
                upL('Vorhandene Einträge überschreiben?', 'Overwrite existing entries?'),
                confirmMsg,
                doBook, null
            );
        } else {
            doBook();
        }
    }

    function upChangeYear(val) {
        upState.year = parseInt(val, 10) || new Date().getFullYear();
        renderUrlaubsplaner();
    }
