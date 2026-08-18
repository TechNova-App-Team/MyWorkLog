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
        return (typeof getVacationMode === 'function') ? getVacationMode() : 'days';
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

        // Pro-rata gilt nur fuer das laufende Jahr (Eintritt mitten im Jahr).
        var entitlement = total;
        if (!isFuture && typeof calculateProRataVacation === 'function') {
            try { entitlement = calculateProRataVacation(total); } catch (e) { entitlement = total; }
        }

        var used = isFuture ? 0 : (parseFloat(v.used) || 0);
        var remaining = Math.max(0, entitlement - used);

        var ref = upRefHours();
        var toDays = function (x) { return upVacationMode() === 'hours' ? (ref > 0 ? x / ref : 0) : x; };

        return {
            mode: upVacationMode(),
            refHours: ref,
            isFuture: isFuture,
            entitlement: entitlement,
            used: used,
            remaining: remaining,
            remainingDays: Math.floor(toDays(remaining) + 1e-9)
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

    function upBookedSet() {
        var set = {};
        (data.entries || []).forEach(function (e) {
            if (e && e.type === 'vacation' && e.date) set[e.date] = true;
        });
        return set;
    }

    // Tagesraster fuer das Jahr plus je 31 Tage Rand — sonst faende der Planer
    // die Weihnachts-/Neujahrs-Bruecke ueber die Jahresgrenze nicht.
    function upBuildDays(year, holidayMap, bookedSet) {
        var days = [];
        var d = new Date(year - 1, 11, 1);
        var end = new Date(year + 1, 0, 31);
        var hours = (data.settings && data.settings.hours) || {};

        while (d <= end) {
            var key = upKey(d);
            var dow = d.getDay();
            var hol = holidayMap[key] || null;
            var booked = !!bookedSet[key];
            var noDuty = !((hours[dow] || 0) > 0);

            days.push({
                key: key,
                date: new Date(d),
                year: d.getFullYear(),
                dow: dow,
                holiday: hol,
                booked: booked,
                // Feiertag, der auf einen Arbeitstag faellt — nur DER spart
                // wirklich einen Urlaubstag. Faellt er auf Samstag/Sonntag,
                // bringt er null und darf keine Empfehlung begruenden.
                holGain: !!hol && !noDuty,
                // "kostet keinen weiteren Urlaubstag": Feiertag, dienstfreier
                // Wochentag oder bereits gebuchter Urlaub.
                free: !!hol || noDuty || booked
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

                // Nur Feiertage zaehlen, die auf einen Arbeitstag fallen.
                // Ohne einen solchen ist das kein Brueckentag, sondern schlicht
                // "nimm eine Woche frei" — das gilt fuer jede Woche im Jahr und
                // waere als Empfehlung nur vorgetaeuschte Erkenntnis. Ohne die
                // Regel schlug der Planer vier beliebige August-Wochen vor;
                // mit blosser "Feiertag in der Naehe"-Pruefung immer noch
                // Wochen neben dem 3.10.2026 (Samstag) und 1.11.2026 (Sonntag).
                var names = [];
                for (var h = a; h <= b; h++) {
                    var hn = upHolidayName(days[h].holiday);
                    if (days[h].holGain && names.indexOf(hn) === -1) names.push(hn);
                }
                if (!names.length) continue;

                cands.push({
                    from: days[a], to: days[b],
                    cost: cost, gain: gain,
                    ratio: gain / cost,
                    holidays: names,
                    gapDays: gapDays.slice(),
                    gapRanges: (function () {
                        var r = [];
                        for (var q = 0; q <= m; q++) r.push({ s: days[gaps[g + q].start].key, e: days[gaps[g + q].end].key });
                        return r;
                    })()
                });
            }
        }

        cands.sort(function (x, y) { return (y.ratio - x.ratio) || (y.gain - x.gain) || (x.cost - y.cost); });

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
        var days = upBuildDays(year, holidayMap, upBookedSet());
        var suggestions = upFindSuggestions(days, budget.remainingDays, year);

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
        set('upStatTotal', upFmtBalance(budget.entitlement, budget));

        var unit = document.getElementById('upStatUnit');
        if (unit) unit.textContent = budget.mode === 'hours' ? upL('Stunden', 'hours') : upL('Tage', 'days');

        var note = document.getElementById('upBudgetNote');
        if (note) {
            if (budget.isFuture) {
                note.textContent = upL(
                    'Voller Jahresanspruch — im nächsten Jahr ist noch nichts verbraucht.',
                    'Full annual entitlement. Nothing used yet next year.'
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

        if (budget.remainingDays < 1) {
            host.appendChild(upEmptyState(
                upL('Kein Resturlaub', 'No leave remaining'),
                upL('Für ' + year + ' ist nichts mehr übrig. Prüfe den Jahresanspruch in den Einstellungen oder plane für das nächste Jahr.',
                    'Nothing left for ' + year + '. Check your annual entitlement in settings or plan for next year.'),
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
                '<button type="button" class="up-sug__book" onclick="upBookSuggestion(' + idx + ')">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' +
                    esc(upL('Eintragen', 'Book')) +
                '</button>' +
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

    function upBookSuggestion(idx) {
        var s = upState.suggestions[idx];
        if (!s) return;

        var keys = s.gapDays.map(function (d) { return d.key; });
        var existing = (data.entries || []).filter(function (e) { return keys.indexOf(e.date) !== -1; });

        var doBook = function () {
            var hours = (data.settings && data.settings.hours) || {};
            var ref = upRefHours();

            // Bestehende Eintraege an diesen Tagen weichen dem Urlaub —
            // gleiches Verhalten wie bookPeriod().
            if (existing.length) {
                data.entries = data.entries.filter(function (e) { return keys.indexOf(e.date) === -1; });
            }

            s.gapDays.forEach(function (d) {
                var expected = (hours[d.dow] || 0) > 0 ? hours[d.dow] : ref;
                data.entries.push({
                    id: Date.now() + Math.random(),
                    date: d.key,
                    type: 'vacation',
                    worked: expected,
                    expected: expected,
                    diff: 0,
                    info: 'Urlaub (Brückentag)',
                    isPeriod: true,
                    breakMins: 0,
                    shiftEnd: '',
                    shiftWarning: false
                });
            });

            if (typeof recalculateVacationUsed === 'function') recalculateVacationUsed();
            if (typeof save === 'function') save();
            if (typeof mwlEvent === 'function') mwlEvent('urlaubsplaner_gebucht', { tage: s.cost });

            renderUrlaubsplaner();
            showCustomMessage(
                upL('Eingetragen', 'Booked'),
                upL(s.cost + ' Urlaubstag(e) eingetragen — ' + s.gain + ' Tage am Stück frei.',
                    s.cost + ' vacation day(s) booked. ' + s.gain + ' days off in a row.'),
                'success'
            );
        };

        if (existing.length) {
            showCustomConfirm(
                upL('Vorhandene Einträge überschreiben?', 'Overwrite existing entries?'),
                upL(existing.length + ' vorhandene Einträge in diesem Zeitraum werden durch Urlaub ersetzt.',
                    existing.length + ' existing entries in this range will be replaced by leave.'),
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
