// ═══ SCHOOL MODULE ═══
//
// Speicher: data.settings.school = {
//   years: { '1': { grades: { Fach: ['2.5', '3.0'] } }, '2': { grades: {…} } }
// }
// Die Lehrjahr-Nummer ist der Schluessel und fachlich gemeint (das 3. Lehrjahr
// bleibt das 3., auch wenn das 2. geloescht wurde) — deshalb wird nie umnummeriert.
//
// 🔴 `school.grades` auf oberster Ebene ist der Altbestand bis v7.0.2 (ein Jahr,
// ohne Dimension). scNormalizeSchool() hebt ihn nach years['1'] und LOESCHT ihn.
// Es darf keine zweite Schreibstelle darauf geben — zwei Ablagen fuer dieselben
// Noten driften (CLAUDE.md: „ein Zustand, ein Regler"). Wer die Noten braucht,
// geht ueber scGradesOf() / schoolAllGrades(); die IHK-Ansicht macht das so.
//
// Das gewaehlte Lehrjahr ist eine Ansichts-Einstellung und liegt in
// localStorage.mwl_school_year, NICHT in data.settings: save() legt bei jedem
// Aufruf einen Voll-Backup-Schnappschuss an (10 Stueck), und ein Tab-Klick
// wuerde echte Sicherungen aus der Liste schieben.

    // Lucide-Style Icons (Stroke 1.8, currentColor) — eine Quelle, keine Emojis.
    const SC_ICONS = {
        trendUp:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/></svg>',
        trendDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 17 13.5 8.5 8.5 13.5 2 7"/><path d="M16 17h6v-6"/></svg>',
        trendFlat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
        pencil:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        trash:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        plus:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
        award:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/></svg>',
        check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
        alert:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        move:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>',
        copy:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
        layers:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>'
    };

    // Vorgabe-Faecher fuer einen frischen Speicher — nur fuers erste Lehrjahr.
    // Weitere Lehrjahre starten leer; wer dieselben Faecher will, uebernimmt sie
    // mit einem Klick aus dem Vorjahr (copySchoolSubjects).
    const SC_DEFAULT_SUBJECTS = ['Kernprozesse', 'Wirtschaftslehre', 'IT-Systeme', 'Deutsch/Kommunikation'];
    const SC_YEAR_KEY = 'mwl_school_year';

    // JS-generierte Texte uebersetzen sich lokal, NICHT ueber das globale MAP in
    // i18n-runtime.js: Kurzlabels wie 'Gut'/'Sehr gut' kommen auch anderswo vor
    // und wuerden dort halb uebersetzt landen.
    function scL(de, en) {
        return (document.documentElement.lang === 'en') ? en : de;
    }

    // Deutsche Zahlenschreibweise, folgt der App-Sprache (siehe mwlLocale()).
    function scFmt(num, digits) {
        const n = Number(num);
        if (!isFinite(n)) return '–';
        const loc = (typeof mwlLocale === 'function') ? mwlLocale() : 'de-DE';
        return n.toLocaleString(loc, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }

    function scYearLabel(year) {
        return scL(year + '. Lehrjahr', 'Year ' + year);
    }

    function scIsValidGrade(n) {
        const v = parseFloat(n);
        return !isNaN(v) && v >= 1 && v <= 6;
    }

    function scValidGrades(list) {
        return (list || []).filter(scIsValidGrade).map(parseFloat);
    }

    function scAvg(list) {
        return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    }

    // Notenskala: eine Stufe pro Bereich, benutzt ueberall dieselben Klassen.
    function getSchoolNoteTone(note) {
        const n = parseFloat(note);
        if (isNaN(n) || n === 0) return 'neutral';
        if (n <= 2.0) return 'good';
        if (n <= 3.0) return 'mid';
        return 'bad';
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SPEICHER — Struktur absichern, Altbestand heben
    // ═══════════════════════════════════════════════════════════════════

    // Idempotent und billig; init-app.js ruft sie beim Start, applyDataDefaults()
    // beim Import, scSchool() bei jedem Zugriff. Gibt data.settings.school zurueck.
    function scNormalizeSchool(settings) {
        if (!settings.school || typeof settings.school !== 'object') settings.school = {};
        const s = settings.school;
        if (!s.years || typeof s.years !== 'object' || Array.isArray(s.years)) s.years = {};

        // Altbestand (flach, bis v7.0.2) → 1. Lehrjahr. Liegt dort schon etwas
        // (ein aelterer Client hat nach der Umstellung noch flach geschrieben),
        // gewinnt je Fach die Liste mit Noten; Fach fuer Fach zu mischen waere bei
        // doppelten Werten (zweimal 2,0) nicht entscheidbar.
        if (s.grades && typeof s.grades === 'object') {
            if (!s.years['1'] || typeof s.years['1'] !== 'object') s.years['1'] = { grades: {} };
            const ziel = s.years['1'];
            if (!ziel.grades || typeof ziel.grades !== 'object') ziel.grades = {};
            for (const fach in s.grades) {
                const alt = Array.isArray(s.grades[fach]) ? s.grades[fach].slice() : [];
                if (!ziel.grades[fach]) { ziel.grades[fach] = alt; continue; }
                if (scValidGrades(ziel.grades[fach]).length === 0 && scValidGrades(alt).length > 0) ziel.grades[fach] = alt;
            }
            delete s.grades;
        }

        for (const y of Object.keys(s.years)) {
            if (!/^[1-9]\d*$/.test(y) || !s.years[y] || typeof s.years[y] !== 'object') { delete s.years[y]; continue; }
            if (!s.years[y].grades || typeof s.years[y].grades !== 'object') s.years[y].grades = {};
            for (const fach in s.years[y].grades) {
                if (!Array.isArray(s.years[y].grades[fach])) s.years[y].grades[fach] = [];
            }
        }

        if (Object.keys(s.years).length === 0) {
            s.years['1'] = { grades: {} };
            SC_DEFAULT_SUBJECTS.forEach(f => { s.years['1'].grades[f] = []; });
        }
        return s;
    }

    function scSchool() {
        return scNormalizeSchool(data.settings);
    }

    // Vorhandene Lehrjahre, aufsteigend.
    function scYears() {
        return Object.keys(scSchool().years).map(Number).sort((a, b) => a - b);
    }

    // Kleinste freie Nummer — fuellt eine Luecke (1, 3 → 2), sonst haengt sie an.
    function scNextYear() {
        const have = new Set(scYears());
        let n = 1;
        while (have.has(n)) n++;
        return n;
    }

    function scGradesOf(year) {
        const y = scSchool().years[String(year)];
        return y ? y.grades : {};
    }

    // Alle gueltigen Noten ueber alle Lehrjahre — Querverweis fuer die IHK-Ansicht.
    function schoolAllGrades() {
        const out = [];
        scYears().forEach(y => {
            const g = scGradesOf(y);
            for (const fach in g) scValidGrades(g[fach]).forEach(v => out.push(v));
        });
        return out;
    }

    function schoolYearsWithGrades() {
        return scYears().filter(y => {
            const g = scGradesOf(y);
            return Object.keys(g).some(f => scValidGrades(g[f]).length > 0);
        }).length;
    }

    // Zusammenfassung eines Lehrjahrs fuer die Leiste und die Jahresliste.
    function scYearSummary(year) {
        const g = scGradesOf(year);
        let all = [];
        for (const fach in g) all = all.concat(scValidGrades(g[fach]));
        return { year, count: all.length, subjects: Object.keys(g).length, avg: scAvg(all) };
    }

    // Laufendes Lehrjahr laut IHK-Daten (ihk.js), sonst null.
    function scCurrentYear() {
        if (typeof ihkLehrjahrHeute !== 'function') return null;
        const lj = ihkLehrjahrHeute();
        return lj ? lj.lehrjahr : null;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ANSICHT — gewaehltes Lehrjahr ('all' = alle zusammen)
    // ═══════════════════════════════════════════════════════════════════

    let scScopeCache = null;

    function scScope() {
        const years = scYears();
        if (scScopeCache === null) {
            let stored = null;
            try { stored = localStorage.getItem(SC_YEAR_KEY); } catch (e) {}
            if (stored === 'all') scScopeCache = 'all';
            else if (stored && years.includes(parseInt(stored, 10))) scScopeCache = parseInt(stored, 10);
        }
        if (scScopeCache === 'all' && years.length > 1) return 'all';
        if (typeof scScopeCache === 'number' && years.includes(scScopeCache)) return scScopeCache;
        // Voreinstellung: das laufende Lehrjahr, wenn es angelegt ist — sonst das
        // hoechste, denn dort traegt man heute ein.
        const cur = scCurrentYear();
        scScopeCache = (cur && years.includes(cur)) ? cur : years[years.length - 1];
        return scScopeCache;
    }

    function setSchoolScope(scope) {
        scCollectInputs();
        scScopeCache = scope === 'all' ? 'all' : parseInt(scope, 10);
        try { localStorage.setItem(SC_YEAR_KEY, String(scScopeCache)); } catch (e) {}
        renderSchoolGradesInputs();
    }

    // Noten des gewaehlten Bereichs je Fach: ein Jahr direkt, „alle" als Verkettung
    // in Jahresreihenfolge — so bleibt calculateTrend() (erste Haelfte gegen zweite)
    // auch ueber Jahre hinweg sinnvoll.
    function scScopeGrades(scope) {
        if (scope !== 'all') return scGradesOf(scope);
        const merged = {};
        scYears().forEach(y => {
            const g = scGradesOf(y);
            for (const fach in g) merged[fach] = (merged[fach] || []).concat(g[fach] || []);
        });
        return merged;
    }

    function renderSchoolYearBar() {
        const bar = document.getElementById('schoolYearBar');
        if (!bar) return;
        const years = scYears();
        const scope = scScope();
        const cur = scCurrentYear();
        bar.setAttribute('aria-label', scL('Lehrjahr wählen', 'Choose training year'));

        let html = '';
        years.forEach(y => {
            const s = scYearSummary(y);
            const active = scope === y;
            const isCur = cur === y;
            const sub = s.count > 0
                ? `<span class="sc-year-chip__avg">Ø ${scFmt(s.avg, 2)}</span><span>${s.count} ${s.count === 1 ? scL('Note', 'grade') : scL('Noten', 'grades')}</span>`
                : `<span>${scL('keine Noten', 'no grades')}</span>`;
            html += `
                <button type="button" role="tab" class="sc-year-chip${active ? ' is-active' : ''}${isCur ? ' is-current' : ''}"
                    aria-selected="${active}" data-scope="${y}"
                    ${isCur ? `title="${scL('Laufendes Lehrjahr laut deinen Ausbildungsdaten', 'Current year according to your training data')}"` : ''}>
                    <span class="sc-year-chip__label">${esc(scYearLabel(y))}</span>
                    <span class="sc-year-chip__sub">${sub}</span>
                </button>`;
        });

        html += `
                <button type="button" class="sc-year-add" data-action="add"
                    title="${scL('Weiteres Lehrjahr anlegen', 'Add another training year')}">
                    ${SC_ICONS.plus}<span>${esc(scL('Lehrjahr', 'Year'))}</span>
                </button>`;

        // Entfernen steht NEBEN dem Anlegen, nicht am Ende der Seite: in v7.0.3
        // sass der Knopf in der Fusszeile von „Faecher verwalten" und wurde dort
        // nicht gefunden („ich kann keine Lehrjahre mehr loeschen"). Er gilt fuer
        // den aktiven Reiter; mit einem einzigen Jahr gibt es nichts zu entfernen.
        if (scope !== 'all' && years.length > 1) {
            html += `
                <button type="button" class="sc-year-add is-danger" data-action="remove"
                    title="${esc(scL('Das ' + scope + '. Lehrjahr samt Fächern und Noten entfernen', 'Remove year ' + scope + ' with its subjects and grades'))}">
                    ${SC_ICONS.trash}<span>${esc(scL(scope + '. Lehrjahr entfernen', 'Remove year ' + scope))}</span>
                </button>`;
        }

        // „Alle" erst ab zwei Jahren — mit einem waere es derselbe Reiter zweimal.
        if (years.length > 1) {
            const all = schoolAllGrades();
            html += `
                <span class="sc-yearbar__spacer" aria-hidden="true"></span>
                <button type="button" role="tab" class="sc-year-chip sc-year-chip--all${scope === 'all' ? ' is-active' : ''}"
                    aria-selected="${scope === 'all'}" data-scope="all">
                    <span class="sc-year-chip__label">${SC_ICONS.layers}${esc(scL('Alle Lehrjahre', 'All years'))}</span>
                    <span class="sc-year-chip__sub">${all.length
                        ? `<span class="sc-year-chip__avg">Ø ${scFmt(scAvg(all), 2)}</span><span>${all.length} ${all.length === 1 ? scL('Note', 'grade') : scL('Noten', 'grades')}</span>`
                        : `<span>${scL('keine Noten', 'no grades')}</span>`}</span>
                </button>`;
        }

        bar.innerHTML = html;
        bar.querySelectorAll('[data-scope]').forEach(btn => {
            btn.addEventListener('click', () => setSchoolScope(btn.dataset.scope));
        });
        const add = bar.querySelector('[data-action="add"]');
        if (add) add.addEventListener('click', () => addSchoolYear());
        const rem = bar.querySelector('[data-action="remove"]');
        if (rem) rem.addEventListener('click', () => removeSchoolYear());
    }

    function renderSchoolView() {
        const scope = scScope();
        const kpis = calculateSchoolKPIs(scope);
        const overallAvg = kpis.overallAvg;

        // ── Durchschnitts-Ring ──
        const avgEl   = document.getElementById('schoolOverallAvg');
        const ringEl  = document.getElementById('ringSchoolAvg');
        const badgeEl = document.getElementById('schoolGradeBadge');

        if (overallAvg > 0) {
            const tone = getSchoolNoteTone(overallAvg);
            if (avgEl) avgEl.textContent = scFmt(overallAvg, 2);

            if (ringEl) {
                const circumference = 326.7;
                const pct = mapNoteToRadial(overallAvg);
                ringEl.style.strokeDashoffset = circumference - (pct / 100) * circumference;
                ringEl.style.stroke = 'var(--sc-' + tone + ')';
            }

            if (badgeEl) {
                let icon = SC_ICONS.check, label = scL('Gut', 'Good');
                if (overallAvg <= 1.5)      { icon = SC_ICONS.award; label = scL('Sehr gut', 'Very good'); }
                else if (overallAvg <= 2.5) { icon = SC_ICONS.check; label = scL('Gut', 'Good'); }
                else if (overallAvg <= 3.5) { icon = SC_ICONS.check; label = scL('Befriedigend', 'Satisfactory'); }
                else if (overallAvg <= 4.5) { icon = SC_ICONS.alert; label = scL('Ausreichend', 'Sufficient'); }
                else                        { icon = SC_ICONS.alert; label = scL('Mangelhaft', 'Poor'); }
                badgeEl.innerHTML = icon + '<span>' + esc(label) + '</span>';
            }
        } else {
            if (avgEl) avgEl.textContent = '–';
            if (ringEl) {
                ringEl.style.strokeDashoffset = 326.7;
                ringEl.style.stroke = '';
            }
            if (badgeEl) badgeEl.textContent = scL('Keine Daten', 'No data');
        }

        // ── Kennzahlen ──
        const bestNoteEl     = document.getElementById('schoolBestNote');
        const bestSubjectEl  = document.getElementById('schoolBestSubject');
        const worstNoteEl    = document.getElementById('schoolWorstNote');
        const worstSubjectEl = document.getElementById('schoolWorstSubject');
        const subjectCountEl = document.getElementById('schoolSubjectCount');
        const subjectTotalEl = document.getElementById('schoolSubjectTotal');

        if (bestNoteEl) {
            if (kpis.bestNote > 0) {
                bestNoteEl.textContent = scFmt(kpis.bestNote, 1);
                bestNoteEl.style.color = 'var(--sc-' + getSchoolNoteTone(kpis.bestNote) + ')';
                bestSubjectEl.textContent = kpis.bestSubject;
            } else {
                bestNoteEl.textContent = '–';
                bestNoteEl.style.color = '';
                bestSubjectEl.textContent = scL('Noch kein Fach', 'No subject yet');
            }
        }

        if (worstNoteEl) {
            if (kpis.worstNote > 0) {
                worstNoteEl.textContent = scFmt(kpis.worstNote, 1);
                worstNoteEl.style.color = 'var(--sc-' + getSchoolNoteTone(kpis.worstNote) + ')';
                worstSubjectEl.textContent = kpis.worstSubject;
            } else {
                worstNoteEl.textContent = '–';
                worstNoteEl.style.color = '';
                worstSubjectEl.textContent = scL('Noch kein Fach', 'No subject yet');
            }
        }

        const totalCount   = kpis.allGrades.length;
        const subjectCount = Object.keys(scScopeGrades(scope)).length;
        if (subjectCountEl) subjectCountEl.textContent = totalCount;
        if (subjectTotalEl) {
            const unit = subjectCount === 1
                ? scL('Fach', 'subject')
                : scL('Fächern', 'subjects');
            subjectTotalEl.textContent = `${scL('in', 'across')} ${subjectCount} ${unit}`;
        }

        // ── Entwicklung ──
        const trendIcon  = document.getElementById('schoolTrendArrow');
        const trendText  = document.getElementById('schoolTrendText');
        const trendValue = document.getElementById('schoolTrendValue');
        const volatility = document.getElementById('schoolVolatility');

        if (trendIcon && trendText) {
            trendIcon.classList.remove('is-good', 'is-bad');
            if (totalCount === 0) {
                trendIcon.innerHTML = SC_ICONS.trendFlat;
                trendText.textContent = scL('Keine Daten', 'No data');
            } else if (overallAvg < 2.0) {
                trendIcon.innerHTML = SC_ICONS.trendUp;
                trendIcon.classList.add('is-good');
                trendText.textContent = scL('Sehr guter Schnitt', 'Very good average');
            } else if (overallAvg < 3.5) {
                trendIcon.innerHTML = SC_ICONS.trendFlat;
                trendText.textContent = scL('Im Plan', 'On track');
            } else {
                trendIcon.innerHTML = SC_ICONS.trendDown;
                trendIcon.classList.add('is-bad');
                trendText.textContent = scL('Verbesserung nötig', 'Needs improvement');
            }
        }

        if (trendValue) trendValue.textContent = totalCount > 0 ? scFmt(overallAvg, 2) : '–';
        if (volatility) volatility.textContent = totalCount > 1 ? scFmt(calculateVolatility(kpis.allGrades), 2) : '–';

        renderSchoolYearList(scope);

        // ── Verteilung ──
        const dist = kpis.distribution;
        const setW = (id, val) => { const el = document.getElementById(id); if (el) el.style.width = val + '%'; };
        const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        setW('distGood', dist.good);
        setW('distOk', dist.ok);
        setW('distMedium', dist.medium);
        setW('distPoor', dist.poor);

        setT('countGood', dist.goodCount);
        setT('countOk', dist.okCount);
        setT('countMedium', dist.mediumCount);
        setT('countPoor', dist.poorCount);

        // ── Fächer-Tabelle ──
        renderSchoolTableHead(scope);
        const oldBody = document.getElementById('schoolSubjectsBody');
        if (oldBody && kpis.gradeRowsHTML) {
            const tbody = document.createElement('tbody');
            tbody.id = 'schoolSubjectsBody';
            tbody.innerHTML = kpis.gradeRowsHTML;
            oldBody.parentNode.replaceChild(tbody, oldBody);
        }
    }

    // Der Tabellenkopf fuer EIN Jahr steht im Markup (i18n-Schluessel dort);
    // die Gesamtansicht braucht eine Spalte je Lehrjahr und baut ihn selbst.
    // Beim ersten Aufruf wird das Original gesichert, um zurueckwechseln zu koennen.
    let scTheadYear = null;
    function renderSchoolTableHead(scope) {
        const table = document.getElementById('schoolGradesList');
        const thead = table && table.querySelector('thead');
        if (!thead) return;
        if (scTheadYear === null) scTheadYear = thead.innerHTML;
        if (scope !== 'all') {
            if (thead.innerHTML !== scTheadYear) thead.innerHTML = scTheadYear;
            return;
        }
        const years = scYears();
        thead.innerHTML = `
                            <tr>
                                <th class="sc-col-subject">${esc(scL('Fach', 'Subject'))}</th>
                                ${years.map(y => `<th class="sc-col-year">${esc(scL(y + '. LJ', 'Y' + y))}</th>`).join('')}
                                <th class="sc-col-grade">${esc(scL('Gesamt', 'Overall'))}</th>
                                <th class="sc-col-trend">${esc(scL('Trend', 'Trend'))}</th>
                            </tr>`;
    }

    // Schnitt je Lehrjahr mit Veraenderung zum Vorjahr — nur in der Gesamtansicht.
    function renderSchoolYearList(scope) {
        const list = document.getElementById('schoolYearList');
        if (!list) return;
        if (scope !== 'all') { list.hidden = true; list.innerHTML = ''; return; }

        let prev = null, html = '';
        scYears().forEach(y => {
            const s = scYearSummary(y);
            let delta = '';
            if (s.count > 0 && prev !== null) {
                // Dieselbe Lesart wie die Trend-Spalte der Tabelle: positiv = besser
                // (Note gesunken), mit demselben Pfeil — zwei Vorzeichen-Regeln auf
                // einer Seite waeren eine zu viel.
                const d = prev - s.avg;
                const cls = d > 0.05 ? ' is-up' : d < -0.05 ? ' is-down' : '';
                const sign = Math.abs(d) <= 0.05 ? '±' : (d > 0 ? '+' : '−');
                const icon = d > 0.05 ? SC_ICONS.trendUp : d < -0.05 ? SC_ICONS.trendDown : SC_ICONS.trendFlat;
                delta = `<span class="sc-year-row__delta${cls}">${mwlIconFromEmoji(icon, 12)}${sign}${scFmt(Math.abs(d), 2)}</span>`;
            }
            html += `
                <div class="sc-year-row">
                    <span class="sc-year-row__label">${esc(scYearLabel(y))}</span>
                    <span class="sc-year-row__n">${s.count} ${s.count === 1 ? scL('Note', 'grade') : scL('Noten', 'grades')}</span>
                    ${delta}
                    <span class="sc-year-row__avg"${s.count ? ` style="color:var(--sc-${getSchoolNoteTone(s.avg)})"` : ''}>${s.count ? scFmt(s.avg, 2) : '–'}</span>
                </div>`;
            if (s.count > 0) prev = s.avg;
        });
        list.innerHTML = html;
        list.hidden = false;
    }

    // Was in den Eingabefeldern steht, ins Datenmodell — OHNE zu speichern.
    // Vor jedem Neuzeichnen der Karten aufrufen, sonst gehen getippte, noch
    // nicht gespeicherte Noten verloren (so war es bis v7.0.2 beim „+ Note").
    function scCollectInputs() {
        const scope = scScope();
        if (scope === 'all') return;
        const grades = scGradesOf(scope);
        document.querySelectorAll('.school-grade-input').forEach(input => {
            const subject = input.dataset.subject;
            const index = parseInt(input.dataset.index, 10);
            if (!grades[subject] || isNaN(index)) return;
            const value = parseFloat(input.value);
            grades[subject][index] = isNaN(value) ? '' : value.toString();
        });
    }

    function renderSchoolGradesInputs() {
        renderSchoolYearBar();

        const scope = scScope();
        const configPanel = document.querySelector('#view-school .sc-config-panel');
        const allHint = document.getElementById('schoolAllHint');
        if (configPanel) configPanel.hidden = scope === 'all';
        if (allHint) allHint.hidden = scope !== 'all';

        const inputGrid = document.getElementById('schoolSubjectsInputGrid');
        if (!inputGrid) return;
        if (scope === 'all') { inputGrid.innerHTML = ''; renderSchoolView(); return; }

        const gradesMap = scGradesOf(scope);
        const subjects = Object.keys(gradesMap);
        const others = scYears().filter(y => y !== scope);
        let html = '';

        if (subjects.length === 0) {
            // Vorjahr mit Faechern anbieten — das naechstliegende darunter, sonst darueber.
            const source = others.filter(y => y < scope && Object.keys(scGradesOf(y)).length).pop()
                        || others.find(y => y > scope && Object.keys(scGradesOf(y)).length);
            html = `<div class="sc-subjects-empty">
                        <div>${esc(scL('Noch keine Fächer im ' + scope + '. Lehrjahr.', 'No subjects in year ' + scope + ' yet.'))}</div>
                        ${source ? `<button type="button" class="sc-ghost-btn school-copy-btn" data-from="${source}">${SC_ICONS.copy}${esc(scL('Fächer aus dem ' + source + '. Lehrjahr übernehmen', 'Take over subjects from year ' + source))}</button>` : ''}
                    </div>`;
        }

        subjects.forEach(subject => {
            const grades = gradesMap[subject] || [];
            const avg = scAvg(scValidGrades(grades));
            const subjectEsc = esc(subject);

            const avgBadge = avg > 0
                ? `<span class="sc-subject-avg is-${getSchoolNoteTone(avg)}">Ø ${scFmt(avg, 1)}</span>`
                : '';

            const gradeWord = scL('Note', 'Grade');
            const chips = grades.map((grade, index) => `
                            <input type="number" step="0.1" min="1.0" max="6.0"
                                class="sc-grade-input school-grade-input"
                                data-subject="${subjectEsc}" data-index="${index}"
                                value="${esc(grade)}"
                                aria-label="${subjectEsc}, ${gradeWord} ${index + 1}">
            `).join('');

            // Verschieben: natives <select> als unsichtbare Schicht ueber dem Symbol
            // (CLAUDE.md: opacity 0, nie display none; 16px gegen iOS-Zoom).
            const moveOptions = others.map(y => `<option value="${y}">${esc(scYearLabel(y))}</option>`).join('')
                + `<option value="new">${esc(scL('Neues Lehrjahr (' + scNextYear() + '.)', 'New year (' + scNextYear() + ')'))}</option>`;
            const moveLabel = scL('Fach in ein anderes Lehrjahr verschieben', 'Move subject to another year');

            html += `
                <div class="sc-subject-card">
                    <div class="sc-subject-top">
                        <h5 class="sc-subject-name" title="${subjectEsc}">${subjectEsc}</h5>
                        ${avgBadge}
                        <div class="sc-subject-actions">
                            <span class="sc-move-wrap" title="${moveLabel}">
                                <span class="sc-icon-btn" aria-hidden="true">${SC_ICONS.move}</span>
                                <select class="sc-move-select school-move-select" data-subject="${subjectEsc}"
                                    aria-label="${subjectEsc}: ${moveLabel}">
                                    <option value="" selected disabled>${esc(scL('Verschieben nach…', 'Move to…'))}</option>
                                    ${moveOptions}
                                </select>
                            </span>
                            <button type="button" class="sc-icon-btn school-rename-btn" data-subject="${subjectEsc}"
                                title="${scL('Fach umbenennen', 'Rename subject')}"
                                aria-label="${scL('Fach', 'Subject')} ${subjectEsc} ${scL('umbenennen', 'rename')}">${SC_ICONS.pencil}</button>
                            <button type="button" class="sc-icon-btn is-danger school-delete-btn" data-subject="${subjectEsc}"
                                title="${scL('Fach löschen', 'Delete subject')}"
                                aria-label="${scL('Fach', 'Subject')} ${subjectEsc} ${scL('löschen', 'delete')}">${SC_ICONS.trash}</button>
                        </div>
                    </div>
                    <div class="sc-grade-chips">
                        ${chips}
                        <button type="button" class="sc-chip-add school-addgrade-btn" data-subject="${subjectEsc}"
                            aria-label="${scL('Note hinzufügen zu', 'Add grade to')} ${subjectEsc}">${SC_ICONS.plus}${gradeWord}</button>
                    </div>
                </div>
            `;
        });

        inputGrid.innerHTML = html;

        inputGrid.querySelectorAll('.school-rename-btn').forEach(btn => {
            btn.addEventListener('click', () => renameSchoolSubject(btn.dataset.subject));
        });
        inputGrid.querySelectorAll('.school-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteSchoolSubject(btn.dataset.subject));
        });
        inputGrid.querySelectorAll('.school-addgrade-btn').forEach(btn => {
            btn.addEventListener('click', () => addSchoolGrade(btn.dataset.subject));
        });
        inputGrid.querySelectorAll('.school-move-select').forEach(sel => {
            sel.addEventListener('change', () => { if (sel.value) moveSchoolSubject(sel.dataset.subject, sel.value); });
        });
        inputGrid.querySelectorAll('.school-copy-btn').forEach(btn => {
            btn.addEventListener('click', () => copySchoolSubjects(parseInt(btn.dataset.from, 10), scope));
        });

        renderSchoolView();
    }

    function renderSchoolRules() {
        if(!data.settings.schoolRules) data.settings.schoolRules = { weeklyDays: [], biweekly: [] };

        // weekly
        for(let i=0;i<7;i++) {
            const cb = document.getElementById('sch_week_'+i);
            if(cb) cb.checked = (data.settings.schoolRules.weeklyDays || []).includes(i);
        }

        // biweekly rules
        const container = document.getElementById('biweeklyRulesList');
        if(!container) return;
        container.innerHTML = '';
        const rules = data.settings.schoolRules.biweekly || [];
        rules.forEach((r, idx) => {
            const el = document.createElement('div');
            el.className = 'bi-rule';
            el.innerHTML = `
                <select class="glass-select bi-weekday">
                    <option value="0">So</option>
                    <option value="1">Mo</option>
                    <option value="2">Di</option>
                    <option value="3">Mi</option>
                    <option value="4">Do</option>
                    <option value="5">Fr</option>
                    <option value="6">Sa</option>
                </select>
                <input class="glass-input bi-interval" type="number" min="1" value="${r.interval||2}" title="Intervall (Wochen)">
                <input class="glass-input bi-start" type="date" value="${r.startDate||''}">
                <button class="btn btn-ghost" onclick="this.parentElement.remove();"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            `;
            container.appendChild(el);
            const sel = el.querySelector('.bi-weekday'); if(sel) sel.value = String(r.weekday||0);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  KENNZAHLEN — fuer ein Lehrjahr oder alle zusammen ('all')
    // ═══════════════════════════════════════════════════════════════════
    function calculateSchoolKPIs(scope) {
        if (scope === undefined) scope = scScope();
        const grades = scScopeGrades(scope);
        const years = scope === 'all' ? scYears() : [];
        let allGrades = [];
        let gradesBySubject = {};
        let bestNote = 6.0, bestSubject = '—';
        let worstNote = 1.0, worstSubject = '—';

        for (const subject in grades) {
            const validGrades = scValidGrades(grades[subject]);

            if (validGrades.length > 0) {
                const avg = scAvg(validGrades);
                gradesBySubject[subject] = avg;
                allGrades = allGrades.concat(validGrades);

                if (avg < bestNote) {
                    bestNote = avg;
                    bestSubject = subject;
                }
                if (avg > worstNote) {
                    worstNote = avg;
                    worstSubject = subject;
                }
            }
        }

        const overallAvg = scAvg(allGrades);

        // Tabellenzeilen
        let gradeRowsHTML = '';
        for (const subject in gradesBySubject) {
            const avg = gradesBySubject[subject];
            const count = scValidGrades(grades[subject]).length;
            const tone = getSchoolNoteTone(avg);

            // Trend: im Jahr erste gegen zweite Haelfte der Noten; ueber alle
            // Jahre der Schnitt des ersten Jahres mit Noten gegen den des letzten.
            let trend;
            if (scope === 'all') {
                const yearAvgs = years.map(y => scAvg(scValidGrades(scGradesOf(y)[subject]))).filter(v => v > 0);
                const change = yearAvgs.length >= 2 ? yearAvgs[0] - yearAvgs[yearAvgs.length - 1] : 0;
                trend = { change, direction: change > 0.2 ? 'up' : change < -0.2 ? 'down' : 'stable' };
            } else {
                trend = calculateTrend(grades[subject] || []);
            }

            const trendIcon = trend.direction === 'up' ? SC_ICONS.trendUp
                            : trend.direction === 'down' ? SC_ICONS.trendDown
                            : SC_ICONS.trendFlat;
            const trendClass = trend.direction === 'up' ? ' is-up'
                             : trend.direction === 'down' ? ' is-down' : '';
            // Vorzeichen getrennt setzen, die Zahl immer ueber scFmt — sonst steht
            // auf /en/ ein deutsches Komma im sonst englischen Text.
            const trendSign = trend.change === 0 ? '±' : (trend.change > 0 ? '+' : '−');
            const trendLabel = trendSign + scFmt(Math.abs(trend.change), 2);

            const statusLabel = avg <= 2 ? scL('Sehr gut', 'Very good')
                              : avg <= 3 ? scL('Gut', 'Good')
                              : scL('Verbesserung', 'Needs work');

            if (scope === 'all') {
                const yearCells = years.map(y => {
                    const a = scAvg(scValidGrades(scGradesOf(y)[subject]));
                    return a > 0
                        ? `<td class="sc-col-year"><span class="sc-grade-val" style="color:var(--sc-${getSchoolNoteTone(a)})">${scFmt(a, 1)}</span></td>`
                        : `<td class="sc-col-year"><span class="sc-year-none">–</span></td>`;
                }).join('');
                gradeRowsHTML += `
                <tr>
                    <td class="sc-col-subject">${esc(subject)}</td>
                    ${yearCells}
                    <td class="sc-col-grade"><span class="sc-grade-val" style="color:var(--sc-${tone})">${scFmt(avg, 1)}</span></td>
                    <td class="sc-col-trend"><span class="sc-trend-cell${trendClass}">${mwlIconFromEmoji(trendIcon, 13)}${trendLabel}</span></td>
                </tr>
            `;
            } else {
                gradeRowsHTML += `
                <tr>
                    <td class="sc-col-subject">${esc(subject)}</td>
                    <td class="sc-col-grade"><span class="sc-grade-val" style="color:var(--sc-${tone})">${scFmt(avg, 1)}</span></td>
                    <td class="sc-col-trend"><span class="sc-trend-cell${trendClass}">${mwlIconFromEmoji(trendIcon, 13)}${trendLabel}</span></td>
                    <td class="sc-col-count">${count}</td>
                    <td class="sc-col-status"><span class="sc-status-pill sc-status-${tone}">${statusLabel}</span></td>
                </tr>
            `;
            }
        }

        const distribution = calculateGradeDistribution(allGrades);

        return {
            overallAvg,
            bestNote: bestNote === 6.0 ? 0 : bestNote,
            bestSubject,
            worstNote: worstNote === 1.0 ? 0 : worstNote,
            worstSubject,
            allGrades,
            gradeRowsHTML,
            distribution
        };
    }

    function calculateTrend(grades) {
        const validGrades = scValidGrades(grades);

        if (validGrades.length < 2) return { direction: 'stable', change: 0 };

        const recent = validGrades.slice(-Math.ceil(validGrades.length / 2));
        const older = validGrades.slice(0, Math.floor(validGrades.length / 2));

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        const change = olderAvg - recentAvg; // Positive = Verbesserung (Noten gesunken)
        let direction = 'stable';
        if (change > 0.2) direction = 'up';
        else if (change < -0.2) direction = 'down';

        return { direction, change };
    }

    function calculateGradeDistribution(allGrades) {
        const dist = {
            good: 0,      // 1.0-2.0
            ok: 0,        // 2.0-3.0
            medium: 0,    // 3.0-4.0
            poor: 0       // 4.0-6.0
        };

        allGrades.forEach(grade => {
            if (grade <= 2.0) dist.good++;
            else if (grade <= 3.0) dist.ok++;
            else if (grade <= 4.0) dist.medium++;
            else dist.poor++;
        });

        const total = allGrades.length || 1;
        return {
            good: (dist.good / total) * 100,
            ok: (dist.ok / total) * 100,
            medium: (dist.medium / total) * 100,
            poor: (dist.poor / total) * 100,
            goodCount: dist.good,
            okCount: dist.ok,
            mediumCount: dist.medium,
            poorCount: dist.poor
        };
    }

    function calculateVolatility(grades) {
        if (grades.length < 2) return 0;
        const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
        const variance = grades.reduce((sum, grade) => sum + Math.pow(grade - mean, 2), 0) / grades.length;
        return Math.sqrt(variance);
    }

    function mapNoteToRadial(note) {
        const n = parseFloat(note);
        if (isNaN(n) || n === 0) return 0;
        // Note 1.0 (beste) = 100%, Note 6.0 (schlechteste) = 0%
        return Math.max(0, Math.min(100, ((6.0 - n) / 5.0) * 100));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  AKTIONEN
    // ═══════════════════════════════════════════════════════════════════

    function addSchoolGrade(subject) {
        const scope = scScope();
        if (scope === 'all') return;
        scCollectInputs();
        const grades = scGradesOf(scope);
        if (!grades[subject]) grades[subject] = [];
        grades[subject].push('');
        renderSchoolGradesInputs();
        // Fokus auf das neue, leere Feld
        const fields = document.querySelectorAll(`.school-grade-input[data-subject="${CSS.escape(subject)}"]`);
        if (fields.length) fields[fields.length - 1].focus();
    }

    function addNewSchoolSubject() {
        const scope = scScope();
        if (scope === 'all') return;
        const nameEl = document.getElementById('newSubjectName');
        const gradeEl = document.getElementById('newSubjectGrade');

        const name = (nameEl?.value || '').trim();
        const grade = parseFloat(gradeEl?.value || '');

        if (!name) {
            showCustomMessage(
                scL('Fachname fehlt', 'Subject name missing'),
                scL('Gib einen Namen für das Fach ein.', 'Enter a name for the subject.'),
                'warning');
            nameEl?.focus();
            return;
        }

        if (isNaN(grade) || grade < 1.0 || grade > 6.0) {
            showCustomMessage(
                scL('Note prüfen', 'Check the grade'),
                scL('Die Note muss zwischen 1,0 und 6,0 liegen.', 'The grade must be between 1.0 and 6.0.'),
                'warning');
            gradeEl?.focus();
            return;
        }

        scCollectInputs();
        const grades = scGradesOf(scope);
        if (!grades[name]) grades[name] = [];
        grades[name].push(grade.toString());
        nameEl.value = '';
        gradeEl.value = '';

        save();
        renderSchoolGradesInputs();
    }

    function saveSchoolGrades() {
        scCollectInputs();
        save();
        renderSchoolView();
        renderSchoolYearBar();
    }

    function deleteSchoolSubject(subject) {
        const scope = scScope();
        if (scope === 'all') return;
        showCustomConfirm(
            scL('Fach löschen?', 'Delete subject?'),
            scL(`Alle Noten im Fach „${subject}" im ${scope}. Lehrjahr werden mitgelöscht. Das lässt sich nicht rückgängig machen.`,
                `All grades in "${subject}" in year ${scope} will be deleted as well. This cannot be undone.`),
            () => {
                scCollectInputs();
                delete scGradesOf(scope)[subject];
                save();
                renderSchoolGradesInputs();
            }, null,
            { danger: true, confirmText: scL('Fach löschen', 'Delete subject'), cancelText: scL('Abbrechen', 'Cancel') });
    }

    async function renameSchoolSubject(oldName) {
        const scope = scScope();
        if (scope === 'all') return;
        const label = scL(`Neuer Name für „${oldName}"`, `New name for "${oldName}"`);
        const newName = await showCustomPrompt(scL('Fach umbenennen', 'Rename subject'), label, oldName,
            { confirmText: scL('Umbenennen', 'Rename'), cancelText: scL('Abbrechen', 'Cancel') });
        const clean = (newName || '').trim();
        if (!clean || clean === oldName) return;
        scCollectInputs();
        const grades = scGradesOf(scope);
        if (grades[clean]) {
            showCustomMessage(scL('Fach existiert bereits', 'Subject already exists'),
                scL(`„${clean}" gibt es im ${scope}. Lehrjahr schon.`, `"${clean}" already exists in year ${scope}.`), 'warning');
            return;
        }
        grades[clean] = grades[oldName];
        delete grades[oldName];
        save();
        renderSchoolGradesInputs();
    }

    // Fach samt Noten in ein anderes Lehrjahr. Gibt es das Fach dort schon,
    // werden die Noten angehaengt — nichts geht verloren.
    function moveSchoolSubject(subject, target) {
        const scope = scScope();
        if (scope === 'all') return;
        scCollectInputs();
        const to = target === 'new' ? scNextYear() : parseInt(target, 10);
        if (!to || to === scope) return;
        const school = scSchool();
        if (!school.years[String(to)]) school.years[String(to)] = { grades: {} };
        const from = scGradesOf(scope);
        const dest = school.years[String(to)].grades;
        dest[subject] = (dest[subject] || []).concat(from[subject] || []);
        delete from[subject];
        save();
        renderSchoolGradesInputs();
        if (typeof showToast === 'function') {
            showToast(scL('Fach verschoben', 'Subject moved'),
                      scL(`„${subject}" liegt jetzt im ${to}. Lehrjahr.`, `"${subject}" is now in year ${to}.`), 'success');
        }
    }

    // Fachnamen (ohne Noten) aus einem anderen Lehrjahr uebernehmen.
    function copySchoolSubjects(fromYear, toYear) {
        scCollectInputs();
        const school = scSchool();
        if (!school.years[String(toYear)]) school.years[String(toYear)] = { grades: {} };
        const src = scGradesOf(fromYear), dest = school.years[String(toYear)].grades;
        Object.keys(src).forEach(f => { if (!dest[f]) dest[f] = []; });
        save();
        renderSchoolGradesInputs();
    }

    function addSchoolYear() {
        scCollectInputs();
        const y = scNextYear();
        scSchool().years[String(y)] = { grades: {} };
        save();
        setSchoolScope(y);
    }

    function removeSchoolYear() {
        const scope = scScope();
        if (scope === 'all' || scYears().length < 2) return;
        scCollectInputs();
        const s = scYearSummary(scope);
        const doRemove = () => {
            delete scSchool().years[String(scope)];
            save();
            scScopeCache = null;
            try { localStorage.removeItem(SC_YEAR_KEY); } catch (e) {}
            renderSchoolGradesInputs();
        };
        if (s.subjects === 0) { doRemove(); return; }
        showCustomConfirm(
            scL(scope + '. Lehrjahr entfernen?', 'Remove year ' + scope + '?'),
            scL(`${s.subjects} ${s.subjects === 1 ? 'Fach' : 'Fächer'} und ${s.count} ${s.count === 1 ? 'Note' : 'Noten'} werden mitgelöscht. Das lässt sich nicht rückgängig machen.`,
                `${s.subjects} ${s.subjects === 1 ? 'subject' : 'subjects'} and ${s.count} ${s.count === 1 ? 'grade' : 'grades'} will be deleted as well. This cannot be undone.`),
            doRemove, null,
            { danger: true, confirmText: scL('Lehrjahr entfernen', 'Remove year'), cancelText: scL('Abbrechen', 'Cancel') });
    }
