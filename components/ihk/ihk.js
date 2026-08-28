// ═══ IHK MODULE ═══
//
// WARUM DIESE ANSICHT SO GEBAUT IST
// Die Vorgaengerfassung zeigte fuenf Zahlen (Fortschritt, zwei Countdowns,
// Soll-Stunden gesamt, zwei Noten) und darunter ein Formular. Die Frage, die
// ein Azubi an diese Seite hat, beantwortete keine davon: "Komme ich zur
// Pruefung — und was fehlt mir noch?". Deshalb ist die Nutzlast jetzt die
// Zulassungspruefung nach § 43 Abs. 1 BBiG, und jede Behauptung traegt
// sichtbar ihre Herkunft (Gesetz / Richtwert der Kammern / eigene Daten).
//
// 🔴 DREI DINGE, DIE HIER NICHT PASSIEREN DUERFEN
// 1. Kein Wert ohne Herleitung. `ihk-src`-Marken sind Pflicht, und was nicht
//    messbar ist (Eintragung ins Verzeichnis), wird als "nicht messbar"
//    ausgewiesen statt gruen vorbelegt. Ein Anzeigefeld mit eingebautem
//    Ergebnis faellt nie auf — siehe CLAUDE.md, Audit-Karten.
// 2. Vertragsende und Pruefungstermin sind ZWEI Daten. Die alte Fassung hatte
//    `confIHKExamAbschluss` deaktiviert und aus dem Enddatum gespiegelt. Bei
//    den meisten Kammern liegt die Abschlusspruefung aber Monate vor dem
//    Vertragsende — der Countdown zeigte damit den falschen Tag, und § 43
//    Abs. 1 Nr. 1 (Ende hoechstens zwei Monate nach der Pruefung) war gar
//    nicht pruefbar.
// 3. Der Beruf bekommt hier KEIN Eingabefeld. Er steht im Deckblatt des
//    Berichtshefts (`pdf_personal_cfg`) und wird von dort gelesen. Zwei
//    Regler auf denselben Zustand driften garantiert auseinander.

    // JS-erzeugte Texte uebersetzen sich lokal statt ueber das globale MAP in
    // i18n-runtime.js: Kurzformen wie 'Heute' oder 'offen' kommen anderswo in
    // anderer Bedeutung vor und wuerden dort falsch mituebersetzt.
    function ihkL(de, en) {
        return (document.documentElement.lang === 'en') ? en : de;
    }

    function ihkLocale() {
        return (typeof mwlLocale === 'function') ? mwlLocale() : 'de-DE';
    }

    function ihkNum(n, digits) {
        const v = Number(n);
        if (!isFinite(v)) return '—';
        return v.toLocaleString(ihkLocale(), {
            minimumFractionDigits: digits || 0,
            maximumFractionDigits: digits || 0
        });
    }

    // 'YYYY-MM-DD' → Date. Ohne die Zeitangabe legt der Browser das Datum als
    // UTC-Mitternacht aus und verschiebt es in westlichen Zonen auf den Vortag.
    function ihkDate(iso) {
        if (!iso || typeof iso !== 'string') return null;
        const d = new Date(iso + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
    }

    function ihkToday() {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function ihkIso(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
             + '-' + String(d.getDate()).padStart(2, '0');
    }

    function ihkDayDiff(a, b) {
        return Math.round((b - a) / 86400000);
    }

    // Monatssprung mit Ueberlauf-Klemme: 31.01. + 1 Monat ergibt sonst den
    // 03.03., weil der Februar keinen 31. hat.
    function ihkAddMonths(d, months) {
        const x = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
        if (x.getDate() !== d.getDate()) x.setDate(0);
        return x;
    }

    function ihkFmtDate(d) {
        if (!d) return '—';
        return d.toLocaleDateString(ihkLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // Relativangabe ueber Intl — das kennt die Sprachregeln beider Fassungen
    // ("in 3 Monaten" / "in 3 months") und muss nicht von Hand uebersetzt werden.
    function ihkRel(days) {
        if (days === 0) return ihkL('heute', 'today');
        let rtf;
        try { rtf = new Intl.RelativeTimeFormat(ihkLocale(), { numeric: 'auto' }); }
        catch (e) { return (days > 0 ? '+' : '') + days + ' d'; }
        const abs = Math.abs(days);
        if (abs < 45)  return rtf.format(days, 'day');
        // Bis 21 Monate in Monaten: "vor 2 Jahren" fuer 20 Monate rundet zwar
        // richtig, liest sich neben dem exakten Datum daneben aber falsch.
        if (abs < 640) return rtf.format(Math.round(days / 30.44), 'month');
        return rtf.format(Math.round(days / 365.25), 'year');
    }

    function ihkMonday(d) {
        const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
        return x;
    }

    function ihkIsoWeek(d) {
        const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
        const jan1 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
        return { week: Math.ceil(((t - jan1) / 86400000 + 1) / 7), year: t.getUTCFullYear() };
    }

    function ihkSettings() {
        // Projekt-Idiom: `data` ist ein let-Global und landet nie auf `window`.
        if (typeof data === 'undefined' || !data || !data.settings) return null;
        if (!data.settings.ihk) data.settings.ihk = {};
        return data.settings.ihk;
    }

    // Deckblatt-Angaben des Berichtshefts. Einzige Quelle fuer Beruf und
    // Fachrichtung — hier wird nur gelesen.
    function ihkPersonal() {
        try { return JSON.parse(localStorage.getItem('pdf_personal_cfg') || '{}') || {}; }
        catch (e) { return {}; }
    }

    function ihkDaySoll(dayIndex) {
        if (typeof getJobHours === 'function') return getJobHours('primary', dayIndex) || 0;
        const h = (typeof data !== 'undefined' && data && data.settings && data.settings.hours) || [];
        return h[dayIndex] || 0;
    }

    function ihkIcon(name, size) {
        return (typeof mwlIcon === 'function') ? mwlIcon(name, size || 14) : '';
    }

    function ihkEsc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function $ihk(id) { return document.getElementById(id); }

    function ihkSetText(id, text) {
        const el = $ihk(id);
        if (el) el.textContent = text;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  KENNZAHLEN — eine Funktion, ein Rueckgabeobjekt. Die Render-Teile
    //  darunter rechnen nichts mehr selbst, damit zwei Stellen nicht
    //  auseinanderlaufen koennen.
    // ═══════════════════════════════════════════════════════════════════
    function ihkComputeFacts() {
        const cfg   = ihkSettings() || {};
        const today = ihkToday();

        const start   = ihkDate(cfg.start);
        const end     = ihkDate(cfg.end);
        const examZ   = ihkDate(cfg.exam_zwischen);
        // Altbestand: bis v6.3.17 gab es nur `end`. Wer damals gespeichert hat,
        // bekommt das Vertragsende als Pruefungstermin — dieselbe Anzeige wie
        // vorher, bis er den echten Termin eintraegt.
        const examA   = ihkDate(cfg.exam_abschluss) || end;
        const anmeld  = ihkDate(cfg.anmeldung);
        const probeM  = Math.min(4, Math.max(1, parseInt(cfg.probeMonths, 10) || 4));
        const probeEnd = start ? new Date(ihkAddMonths(start, probeM).getTime() - 86400000) : null;

        const f = {
            cfg, today, start, end, examZ, examA, anmeld, probeM, probeEnd,
            configured: !!(start && end),
            pct: 0, lehrjahr: 1, years: 3,
            daysToExam: null, daysDone: 0, daysTotal: 0,
            sickDays: 0, ausbTage: 0, absPct: 0, absZone: 'green',
            byType: [], workedSum: 0, expectedSum: 0, diffSum: 0,
            weeksTotal: 0, gaps: [],
            schoolAvg: 0, schoolCount: 0
        };
        if (!f.configured) return f;

        // ── Fortschritt & Lehrjahr ──
        f.daysTotal = Math.max(1, ihkDayDiff(start, end));
        f.daysDone  = Math.min(f.daysTotal, Math.max(0, ihkDayDiff(start, today)));
        f.pct       = Math.min(100, Math.max(0, (f.daysDone / f.daysTotal) * 100));
        f.years     = Math.max(1, Math.round(f.daysTotal / 365.25));
        f.lehrjahr  = Math.min(f.years, Math.max(1, Math.floor(f.daysDone / 365.25) + 1));
        if (examA) f.daysToExam = ihkDayDiff(today, examA);

        // ── Fehlzeiten ───────────────────────────────────────────────────
        // 🔴 Der Nenner sind AUSBILDUNGSTAGE, nicht Kalendertage. Die alte
        // Fassung teilte durch die vergangenen Kalendertage und wies damit bei
        // einer Fuenf-Tage-Woche rund 40 % zu wenig aus — die Quote sah
        // harmlos aus, wo sie es nicht war. Feiertage und Urlaub zaehlen nicht
        // als Ausbildungstag und gehen deshalb ab.
        const rangeEnd = today < end ? today : end;
        const byDate = new Map();
        const entries = (typeof data !== 'undefined' && data && Array.isArray(data.entries)) ? data.entries : [];
        entries.forEach(e => { if (e && e.date && !byDate.has(e.date)) byDate.set(e.date, e.type); });

        let ausbTage = 0;
        for (let cur = new Date(start); cur <= rangeEnd; cur.setDate(cur.getDate() + 1)) {
            if (ihkDaySoll(cur.getDay()) <= 0) continue;
            const t = byDate.get(ihkIso(cur));
            if (t === 'holiday' || t === 'vacation') continue;
            ausbTage++;
        }
        const startIso = ihkIso(start), endIso = ihkIso(rangeEnd);
        const inRange = entries.filter(e => e && e.date >= startIso && e.date <= endIso);
        // Zaehler und Nenner muessen dieselbe Menge meinen: ein Krankheitstag an
        // einem Tag ohne Sollzeit (Samstag im Fuenf-Tage-Plan) steht nicht im
        // Nenner und darf deshalb auch nicht im Zaehler stehen — sonst kann die
        // Quote ueber 100 % laufen.
        f.sickDays = inRange.filter(e => {
            if (e.type !== 'sick') return false;
            const d = ihkDate(e.date);
            return !!d && ihkDaySoll(d.getDay()) > 0;
        }).length;
        f.ausbTage = ausbTage;
        f.absPct   = ausbTage > 0 ? (f.sickDays / ausbTage) * 100 : 0;
        f.absZone  = f.absPct >= 10 ? 'red' : f.absPct >= 6.9 ? 'amber' : 'green';

        // ── Zeitverteilung & Bilanz ──
        const sums = new Map();
        inRange.forEach(e => {
            const w = Number(e.worked) || 0;
            f.workedSum   += w;
            f.expectedSum += Number(e.expected) || 0;
            f.diffSum     += Number(e.diff) || 0;
            if (w > 0) sums.set(e.type, (sums.get(e.type) || 0) + w);
        });
        f.byType = [...sums.entries()]
            .map(([type, hours]) => ({ type, hours }))
            .sort((a, b) => b.hours - a.hours);

        // ── Nachweis-Luecken ─────────────────────────────────────────────
        // Die laufende Woche bleibt aussen vor: sie ist noch nicht vorbei und
        // waere sonst jeden Montag eine frische "Luecke".
        const covered = new Set();
        inRange.forEach(e => {
            const d = ihkDate(e.date);
            if (d) covered.add(ihkIso(ihkMonday(d)));
        });
        const lastMonday = ihkMonday(today);
        for (let w = ihkMonday(start); w < lastMonday && w <= rangeEnd; w.setDate(w.getDate() + 7)) {
            // Woche ohne einen einzigen Ausbildungstag im Zeitraum ueberspringen.
            // Sonst zaehlt die angebrochene erste Woche mit: beginnt die
            // Ausbildung an einem Sonntag, liegt der Montag davor noch VOR dem
            // ersten Tag — die Woche kann gar keinen Eintrag haben und stand
            // trotzdem als Luecke da.
            let hasSoll = false;
            for (let i = 0; i < 7; i++) {
                const d = new Date(w.getFullYear(), w.getMonth(), w.getDate() + i);
                if (d < start || d > rangeEnd) continue;
                if (ihkDaySoll(d.getDay()) > 0) { hasSoll = true; break; }
            }
            if (!hasSoll) continue;

            f.weeksTotal++;
            if (!covered.has(ihkIso(w))) {
                const iw = ihkIsoWeek(w);
                f.gaps.push({ label: 'KW ' + iw.week + '/' + String(iw.year).slice(2), date: new Date(w) });
            }
        }

        // ── Berufsschule (Querverweis, nicht zweite Quelle) ──
        const grades = (data.settings.school && data.settings.school.grades) || {};
        let all = [];
        Object.keys(grades).forEach(s => {
            (grades[s] || []).forEach(n => {
                const v = parseFloat(n);
                if (!isNaN(v) && v >= 1 && v <= 6) all.push(v);
            });
        });
        f.schoolCount = all.length;
        f.schoolAvg   = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;

        return f;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ZULASSUNG — § 43 Abs. 1 BBiG
    //  Die Nummerierung ist nicht dekorativ: das Gesetz zaehlt selbst 1. bis
    //  3. durch, und Nummer 2 enthaelt zwei Bedingungen (Zwischenpruefung
    //  UND Ausbildungsnachweis). Deshalb vier Zeilen bei drei Nummern.
    // ═══════════════════════════════════════════════════════════════════
    function ihkCriteria(f) {
        const cfg = f.cfg;
        const out = [];

        // Nr. 1 — Ausbildungszeit zurueckgelegt
        if (!f.end || !f.examA) {
            out.push({ id: 'ihkCrit1', state: 'open', icon: 'helpCircle',
                       text: ihkL('Prüfungstermin oder Vertragsende fehlt',
                                  'Exam date or contract end is missing') });
        } else if (f.today >= f.end) {
            out.push({ id: 'ihkCrit1', state: 'ok', icon: 'checkCircle',
                       text: ihkL('Ausbildungszeit ist abgeschlossen',
                                  'Training period is complete') });
        } else {
            const grace = ihkAddMonths(f.examA, 2);
            const ok = f.end <= grace;
            out.push({
                id: 'ihkCrit1', state: ok ? 'ok' : 'warn', icon: ok ? 'checkCircle' : 'alert',
                text: ok
                    ? ihkL('Vertrag endet am ' + ihkFmtDate(f.end) + ' — innerhalb der Zwei-Monats-Frist',
                           'Contract ends on ' + ihkFmtDate(f.end) + ' — within the two-month window')
                    : ihkL('Vertrag endet mehr als zwei Monate nach dem Prüfungstermin',
                           'Contract ends more than two months after the exam date')
            });
        }

        // Nr. 2, erste Bedingung — Teilnahme an der Zwischenpruefung
        const noteZ = parseFloat(cfg.note_zwischen);
        const hasNoteZ = !isNaN(noteZ) && noteZ > 0;
        const zpDone = cfg.zpTeilgenommen === true || hasNoteZ;
        if (!f.examZ) {
            out.push({ id: 'ihkCrit2a', state: 'open', icon: 'helpCircle', confirm: false,
                       text: ihkL('Kein Termin eingetragen', 'No date entered') });
        } else if (zpDone) {
            out.push({ id: 'ihkCrit2a', state: 'ok', icon: 'checkCircle', confirm: !hasNoteZ,
                       text: hasNoteZ
                           ? ihkL('Note liegt vor — Teilnahme belegt', 'Grade on file — participation on record')
                           : ihkL('Von dir bestätigt', 'Confirmed by you') });
        } else if (f.examZ < f.today) {
            out.push({ id: 'ihkCrit2a', state: 'open', icon: 'clock', confirm: true,
                       text: ihkL('Termin war am ' + ihkFmtDate(f.examZ) + ' — bitte bestätigen',
                                  'Date was ' + ihkFmtDate(f.examZ) + ' — please confirm') });
        } else {
            out.push({ id: 'ihkCrit2a', state: 'open', icon: 'clock', confirm: false,
                       text: ihkL('Termin am ' + ihkFmtDate(f.examZ) + ' — ' + ihkRel(ihkDayDiff(f.today, f.examZ)),
                                  'Scheduled for ' + ihkFmtDate(f.examZ) + ' — ' + ihkRel(ihkDayDiff(f.today, f.examZ))) });
        }

        // Nr. 2, zweite Bedingung — Ausbildungsnachweis
        const g = f.gaps.length;
        if (f.weeksTotal === 0) {
            out.push({ id: 'ihkCrit2b', state: 'open', icon: 'helpCircle',
                       text: ihkL('Noch keine abgeschlossene Woche', 'No completed week yet') });
        } else if (g === 0) {
            out.push({ id: 'ihkCrit2b', state: 'ok', icon: 'checkCircle',
                       text: ihkL('Alle ' + f.weeksTotal + ' Wochen haben Einträge',
                                  'All ' + f.weeksTotal + ' weeks have entries') });
        } else {
            out.push({ id: 'ihkCrit2b', state: 'warn', icon: 'alert',
                       text: ihkL(g + ' von ' + f.weeksTotal + ' Wochen ohne Eintrag',
                                  g + ' of ' + f.weeksTotal + ' weeks without an entry') });
        }

        // Nr. 3 — Eintragung ins Verzeichnis. Nicht messbar, also auch nicht
        // gemessen: der Haken ist die einzige Quelle, und das steht dabei.
        out.push(cfg.eingetragen === true
            ? { id: 'ihkCrit3', state: 'ok',   icon: 'checkCircle',
                text: ihkL('Von dir bestätigt', 'Confirmed by you') }
            : { id: 'ihkCrit3', state: 'open', icon: 'helpCircle',
                text: ihkL('Nicht messbar — frag deinen Betrieb',
                           'Not measurable — ask your employer') });

        return out;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STATIONEN — was auf dem Zeitband und in der Liste steht
    // ═══════════════════════════════════════════════════════════════════
    function ihkStations(f) {
        const st = [];
        const add = (key, name, date) => { if (date) st.push({ key, name, date }); };

        add('start',  ihkL('Ausbildungsbeginn', 'Training starts'), f.start);
        add('probe',  ihkL('Ende der Probezeit', 'End of probation'), f.probeEnd);
        add('zp',     ihkL('Zwischenprüfung', 'Interim exam'), f.examZ);
        add('anm',    ihkL('Anmeldeschluss', 'Registration deadline'), f.anmeld);
        add('ap',     ihkL('Abschlussprüfung', 'Final exam'), f.examA);
        add('end',    ihkL('Vertragsende', 'Contract ends'), f.end);

        st.sort((a, b) => a.date - b.date);

        // Faellt der Pruefungstermin auf das Vertragsende, waeren es zwei
        // Marken an derselben Stelle — sie werden zu einer zusammengelegt.
        for (let i = st.length - 1; i > 0; i--) {
            if (+st[i].date === +st[i - 1].date) {
                st[i - 1].name = st[i - 1].name + ' · ' + st[i].name;
                st.splice(i, 1);
            }
        }

        let nextMarked = false;
        st.forEach(s => {
            const dd = ihkDayDiff(f.today, s.date);
            s.days = dd;
            if (dd < 0) { s.state = 'done'; }
            else if (!nextMarked) { s.state = 'next'; nextMarked = true; }
            else { s.state = 'upcoming'; }
            s.pct = Math.min(100, Math.max(0, (ihkDayDiff(f.start, s.date) / f.daysTotal) * 100));
        });
        return st;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════════
    function renderIHKView() {
        const view = $ihk('view-ihk');
        if (!view) return;
        const f   = ihkComputeFacts();
        const cfg = f.cfg;

        ihkFillConfigInputs(f);
        view.setAttribute('data-ihk-state', f.configured ? 'ready' : 'empty');
        const stack = $ihk('ihkStack');
        const aside = $ihk('ihkHeadAside');
        if (stack) stack.hidden = !f.configured;
        if (aside) aside.hidden = !f.configured;

        ihkRenderHead(f);
        if (!f.configured) {
            ihkSetText('ihkConfSummary', ihkL('Noch nichts eingetragen', 'Nothing entered yet'));
            return;
        }

        ihkRenderBand(f);
        ihkRenderAdmission(f);
        ihkRenderAbsence(f);
        ihkRenderSplit(f);
        ihkRenderGrades(f);

        ihkSetText('ihkConfSummary',
            ihkFmtDate(f.start) + ' – ' + ihkFmtDate(f.end)
            + (cfg.exam_abschluss ? ' · ' + ihkL('Prüfung', 'Exam') + ' ' + ihkFmtDate(f.examA) : ''));
    }

    function ihkRenderHead(f) {
        const p = ihkPersonal();
        const beruf = [p.beruf, p.fachrichtung].filter(Boolean).join(' · ').trim();
        ihkSetText('ihkHeadEyebrow', beruf
            ? ihkL('Ausbildung', 'Apprenticeship') + ' · ' + beruf
            : ihkL('Ausbildung', 'Apprenticeship'));

        if (!f.configured) {
            ihkSetText('ihkHeadLede', ihkL('Ausbildungsdaten fehlen', 'Training data is missing'));
            ihkSetText('ihkHeadMeta', ihkL(
                'Trag unten Beginn und Prüfungstermin ein — den Rest liest diese Seite aus deinen Einträgen.',
                'Enter your start date and exam date below — this page reads the rest from your entries.'));
            return;
        }

        let lede, meta;
        const dte = f.daysToExam;
        if (dte === null) {
            lede = ihkL('Prüfungstermin fehlt', 'Exam date is missing');
            meta = ihkL('Ohne ihn lässt sich die Zulassung nach § 43 BBiG nicht prüfen.',
                        'Without it, admission under § 43 BBiG cannot be checked.');
        } else if (dte > 0) {
            lede = ihkL('Noch ' + ihkNum(dte) + (dte === 1 ? ' Tag' : ' Tage') + ' bis zur Abschlussprüfung.',
                        ihkNum(dte) + (dte === 1 ? ' day' : ' days') + ' until the final exam.');
            meta = ihkFmtDate(f.examA) + ' · ' + ihkL(
                ihkNum(f.pct) + ' % der Ausbildungszeit liegen hinter dir',
                ihkNum(f.pct) + ' % of the training period is behind you');
        } else if (dte === 0) {
            lede = ihkL('Heute ist Prüfungstag.', 'Exam day is today.');
            meta = ihkFmtDate(f.examA);
        } else {
            lede = ihkL('Die Abschlussprüfung liegt hinter dir.', 'The final exam is behind you.');
            meta = ihkFmtDate(f.examA) + ' · ' + ihkRel(dte);
        }
        ihkSetText('ihkHeadLede', lede);
        ihkSetText('ihkHeadMeta', meta);

        ihkSetText('ihkYearChip', ihkL(f.lehrjahr + '. Lehrjahr', 'Year ' + f.lehrjahr));
        ihkSetText('ihkYearSub', ihkL('von ' + f.years, 'of ' + f.years));
    }

    function ihkRenderBand(f) {
        const stations = ihkStations(f);

        // Lehrjahr-Abschnitte ueber dem Band
        const yearsEl = $ihk('ihkBandYears');
        if (yearsEl) {
            const w = 100 / f.years;
            let html = '';
            for (let i = 0; i < f.years; i++) {
                html += '<span class="ihk-band__year" style="left:' + (i * w).toFixed(3)
                      + '%;width:' + w.toFixed(3) + '%">'
                      + ihkEsc(ihkL((i + 1) + '. Lehrjahr', 'Year ' + (i + 1))) + '</span>';
            }
            yearsEl.innerHTML = html;
        }

        const ticksEl = $ihk('ihkBandTicks');
        if (ticksEl) {
            ticksEl.innerHTML = stations.map(s =>
                '<span class="ihk-band__tick" data-state="' + s.state
                + '" style="left:' + s.pct.toFixed(3) + '%"></span>').join('');
        }

        const fill = $ihk('ihkBandFill');
        const now  = $ihk('ihkBandNow');
        // 🔴 NICHT ueber requestAnimationFrame setzen. Der Block wird direkt
        // davor aus `hidden` geholt; ein rAF davor waere naheliegend, laeuft
        // aber in jeder Umgebung mit `document.hidden === true` (Automation,
        // Hintergrundtab) nie — das Band bliebe dann dauerhaft leer, ohne
        // Fehler und ohne Log. Stattdessen erzwingt ein Layout-Lesezugriff den
        // Startwert, danach greift der Uebergang aus dem Stylesheet.
        if (fill) {
            void fill.offsetWidth;
            fill.style.width = f.pct.toFixed(2) + '%';
        }
        if (now) {
            now.style.left = f.pct.toFixed(2) + '%';
            now.setAttribute('data-edge', f.pct < 9 ? 'start' : f.pct > 91 ? 'end' : 'mid');
        }
        ihkSetText('ihkBandNowLabel', ihkL('Heute', 'Today') + ' · ' + ihkNum(f.pct) + ' %');
        ihkSetText('ihkBandStart', ihkFmtDate(f.start));
        ihkSetText('ihkBandEnd', ihkFmtDate(f.end));

        const list = $ihk('ihkStations');
        if (list) {
            list.innerHTML = stations.map(s =>
                '<li class="ihk-station" data-state="' + s.state + '">'
              + '<p class="ihk-station__name">' + ihkEsc(s.name) + '</p>'
              + '<p class="ihk-station__date">' + ihkEsc(ihkFmtDate(s.date)) + '</p>'
              + '<p class="ihk-station__rel">' + ihkEsc(ihkRel(s.days)) + '</p>'
              + '</li>').join('');
        }
    }

    function ihkRenderAdmission(f) {
        const crits = ihkCriteria(f);
        let met = 0;

        crits.forEach(c => {
            const row = $ihk(c.id);
            if (!row) return;
            row.setAttribute('data-state', c.state);
            if (c.state === 'ok') met++;
            const val = $ihk(c.id + 'Val');
            if (val) val.innerHTML = ihkIcon(c.icon, 14) + '<span>' + ihkEsc(c.text) + '</span>';
        });

        const confirmWrap = $ihk('ihkCrit2aConfirm');
        if (confirmWrap) {
            const c = crits.find(x => x.id === 'ihkCrit2a');
            confirmWrap.hidden = !(c && c.confirm);
        }
        const boxZ = $ihk('ihkConfZpTeilgenommen');
        if (boxZ) boxZ.checked = f.cfg.zpTeilgenommen === true;
        const boxE = $ihk('ihkConfEingetragen');
        if (boxE) boxE.checked = f.cfg.eingetragen === true;

        const open = crits.length - met;
        ihkSetText('ihkAdmVerdict', open === 0
            ? ihkL('Alle vier Punkte sind erfüllt.', 'All four points are met.')
            : ihkL(met + ' von ' + crits.length + ' Punkten erfüllt · ' + open + ' offen',
                   met + ' of ' + crits.length + ' points met · ' + open + ' open'));

        // Luecken-Liste
        const toggle = $ihk('ihkGapsToggle');
        const list   = $ihk('ihkGapsList');
        if (toggle) toggle.hidden = f.gaps.length === 0;
        if (list) {
            if (f.gaps.length === 0) {
                list.hidden = true;
                if (toggle) toggle.setAttribute('aria-expanded', 'false');
            }
            list.innerHTML = f.gaps.slice(-40).map(g =>
                '<li>' + ihkEsc(g.label) + '</li>').join('');
        }
    }

    function ihkRenderAbsence(f) {
        const val = $ihk('ihkAbsPct');
        if (val) {
            val.textContent = f.ausbTage > 0 ? ihkNum(f.absPct, 1) + ' %' : '—';
            val.setAttribute('data-zone', f.absZone);
        }
        ihkSetText('ihkAbsBase', f.ausbTage > 0
            ? ihkL(ihkNum(f.sickDays) + (f.sickDays === 1 ? ' Krankheitstag' : ' Krankheitstage')
                   + ' auf ' + ihkNum(f.ausbTage) + ' Ausbildungstage seit Beginn.'
                   + ' Feiertage und Urlaub zählen nicht mit.',
                   ihkNum(f.sickDays) + (f.sickDays === 1 ? ' sick day' : ' sick days')
                   + ' across ' + ihkNum(f.ausbTage) + ' training days since the start.'
                   + ' Public holidays and leave are excluded.')
            : ihkL('Noch keine Ausbildungstage erfasst', 'No training days recorded yet'));

        const fill = $ihk('ihkAbsFill');
        if (fill) {
            // Die Spur laeuft bis 20 %, damit die 10 %-Marke mittig sitzt.
            fill.style.width = Math.min(100, (f.absPct / 20) * 100).toFixed(2) + '%';
            fill.setAttribute('data-zone', f.absZone);
        }
        const zones = $ihk('ihkZones');
        if (zones) {
            zones.querySelectorAll('li').forEach(li =>
                li.classList.toggle('is-active', li.dataset.zone === f.absZone));
        }
    }

    function ihkRenderSplit(f) {
        const list = $ihk('ihkSplitList');
        const total = f.byType.reduce((a, b) => a + b.hours, 0);

        ihkSetText('ihkSplitLede', total > 0
            ? ihkL(ihkNum(total) + ' Stunden seit Ausbildungsbeginn, nach Art des Tages.',
                   ihkNum(total) + ' hours since the start, by kind of day.')
            : ihkL('Noch keine Zeiten erfasst.', 'No time recorded yet.'));

        if (list) {
            list.innerHTML = f.byType.slice(0, 6).map(r => {
                const rgb   = (typeof getTypeRgb === 'function') ? getTypeRgb(r.type) : '148,163,184';
                const label = (typeof getTypeLabel === 'function') ? getTypeLabel(r.type) : r.type;
                const pct   = total > 0 ? (r.hours / total) * 100 : 0;
                return '<li class="ihk-split__row" style="--type-rgb:' + ihkEsc(rgb) + '">'
                     + '<span class="ihk-split__sw"></span>'
                     + '<span class="ihk-split__name">' + ihkEsc(label) + '</span>'
                     + '<span class="ihk-split__bar"><i style="width:' + pct.toFixed(1) + '%"></i></span>'
                     + '<span class="ihk-split__h">' + ihkNum(r.hours) + ' h</span>'
                     + '<span class="ihk-split__p">' + ihkNum(pct) + ' %</span>'
                     + '</li>';
            }).join('');
        }

        ihkSetText('ihkBalWorked', ihkNum(f.workedSum) + ' h');
        ihkSetText('ihkBalExpected', ihkNum(f.expectedSum) + ' h');
        const diffEl = $ihk('ihkBalDiff');
        if (diffEl) {
            const d = Math.round(f.diffSum * 10) / 10;
            diffEl.textContent = (d > 0 ? '+' : d < 0 ? '−' : '±') + ihkNum(Math.abs(d), 1) + ' h';
            diffEl.setAttribute('data-sign', d > 0.05 ? 'pos' : d < -0.05 ? 'neg' : 'zero');
        }
    }

    // 🔴 Farbe und Wort MUESSEN aus derselben Schwelle kommen. Uebernimmt man
    // die Stufen aus getSchoolNoteTone() (2,0 / 3,0), steht eine 2,3 in
    // Bernstein und direkt daneben das Wort "gut" — die beiden Angaben sitzen
    // vier Pixel auseinander und widersprechen sich. Massgeblich ist die
    // amtliche Notenstufe, die Farbe folgt ihr. Dass die Berufsschul-Ansicht
    // dieselbe Zahl anders einfaerbt, ist der kleinere Fehler: dort steht kein
    // Wort daneben, und niemand haelt die beiden Ansichten nebeneinander.
    var IHK_GRADE_BANDS = [
        { max: 1.5, tone: 'good', de: 'sehr gut',      en: 'very good' },
        { max: 2.5, tone: 'good', de: 'gut',           en: 'good' },
        { max: 3.5, tone: 'mid',  de: 'befriedigend',  en: 'satisfactory' },
        { max: 4.5, tone: 'mid',  de: 'ausreichend',   en: 'sufficient' },
        { max: 5.5, tone: 'bad',  de: 'mangelhaft',    en: 'poor' },
        { max: 6.1, tone: 'bad',  de: 'ungenügend',    en: 'insufficient' }
    ];

    function ihkGradeBand(n) {
        if (!isFinite(n) || n <= 0) return null;
        return IHK_GRADE_BANDS.find(b => n < b.max) || IHK_GRADE_BANDS[IHK_GRADE_BANDS.length - 1];
    }

    function ihkGradeTone(n) {
        const b = ihkGradeBand(n);
        return b ? b.tone : 'none';
    }

    function ihkGradeWord(n) {
        const b = ihkGradeBand(n);
        return b ? ihkL(b.de, b.en) : ihkL('noch offen', 'not yet');
    }

    function ihkRenderGrade(prefix, rawNote, date, upcomingRel) {
        const box  = $ihk('ihkGrade' + prefix);
        const n    = parseFloat(rawNote);
        const has  = !isNaN(n) && n >= 1 && n <= 6;
        const tone = has ? ihkGradeTone(n) : 'none';

        if (box) box.setAttribute('data-tone', tone);
        ihkSetText('ihkGrade' + prefix + 'Val', has ? ihkNum(n, 1) : '—');
        ihkSetText('ihkGrade' + prefix + 'Word', has ? ihkGradeWord(n)
                                                    : ihkL('noch offen', 'not yet'));
        ihkSetText('ihkGrade' + prefix + 'Date', date
            ? ihkFmtDate(date) + (upcomingRel ? ' · ' + upcomingRel : '')
            : ihkL('kein Termin', 'no date'));

        const pass = box && box.querySelector('.ihk-scale__pass');
        if (pass) pass.setAttribute('data-label', ihkNum(4, 1));

        const mark = $ihk('ihkGrade' + prefix + 'Mark');
        if (mark) {
            mark.hidden = !has;
            // Spur laeuft von 1 bis 6 zwischen den beiden Randziffern (je 1,1rem).
            if (has) mark.style.left = 'calc(1.1rem + (100% - 2.2rem) * ' + ((n - 1) / 5).toFixed(4) + ')';
        }
    }

    function ihkRenderGrades(f) {
        const zRel = f.examZ && f.examZ > f.today ? ihkRel(ihkDayDiff(f.today, f.examZ)) : '';
        const aRel = f.examA && f.examA > f.today ? ihkRel(ihkDayDiff(f.today, f.examA)) : '';
        ihkRenderGrade('Z', f.cfg.note_zwischen, f.examZ, zRel);
        ihkRenderGrade('A', f.cfg.note_abschluss, f.examA, aRel);

        const ref = $ihk('ihkSchoolRef');
        if (ref) {
            ref.hidden = f.schoolCount === 0;
            ihkSetText('ihkSchoolAvg', f.schoolCount ? ihkNum(f.schoolAvg, 2) : '—');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  FORMULAR
    // ═══════════════════════════════════════════════════════════════════
    function ihkFillConfigInputs(f) {
        const cfg = f.cfg;
        const set = (id, v) => { const el = $ihk(id); if (el) el.value = v || ''; };
        set('confIHKStart', cfg.start);
        set('confIHKEnd', cfg.end);
        set('confIHKExamZwischen', cfg.exam_zwischen);
        set('confIHKExamAbschluss', cfg.exam_abschluss || cfg.end);
        set('confIHKNoteZwischen', cfg.note_zwischen);
        set('confIHKNoteAbschluss', cfg.note_abschluss);
        set('confIHKAnmeldung', cfg.anmeldung);
        const probe = $ihk('confIHKProbe');
        if (probe) probe.value = String(f.probeM);
    }

    function saveIHKSettings() {
        const cfg = ihkSettings();
        if (!cfg) return;
        const v = id => { const el = $ihk(id); return el ? el.value : ''; };

        cfg.start          = v('confIHKStart');
        cfg.end            = v('confIHKEnd');
        cfg.exam_zwischen  = v('confIHKExamZwischen');
        cfg.exam_abschluss = v('confIHKExamAbschluss');
        cfg.note_zwischen  = v('confIHKNoteZwischen');
        cfg.note_abschluss = v('confIHKNoteAbschluss');
        cfg.anmeldung      = v('confIHKAnmeldung');
        cfg.probeMonths    = parseInt(v('confIHKProbe'), 10) || 4;

        if (typeof save === 'function') save();
        ihkSyncBerichtsheft(cfg);
        renderIHKView();

        if (typeof mwlEvent === 'function') {
            mwlEvent('ihk_daten_gespeichert', {
                hat_pruefungstermin: !!cfg.exam_abschluss,
                hat_zwischenpruefung: !!cfg.exam_zwischen,
                hat_anmeldeschluss: !!cfg.anmeldung
            });
        }

        const btn   = $ihk('ihkSaveBtn');
        const label = $ihk('ihkSaveBtnLabel');
        if (btn) {
            btn.classList.add('is-saved');
            btn.disabled = true;
            if (label) label.textContent = ihkL('Gespeichert', 'Saved');
            setTimeout(() => {
                btn.classList.remove('is-saved');
                btn.disabled = false;
                if (label) label.textContent = ihkL('Speichern', 'Save');
            }, 1800);
        }
    }

    // Das Deckblatt des Berichtshefts fuehrt Beginn und Ende in einem eigenen
    // Schluessel (`pdf_personal_cfg`). Ohne diese Bruecke stehen dieselben zwei
    // Daten an zwei Stellen und driften auseinander — die Ansicht hier ist die
    // Quelle, das Deckblatt zieht nach.
    function ihkSyncBerichtsheft(cfg) {
        if (!cfg.start && !cfg.end) return;
        try {
            const p = ihkPersonal();
            if (cfg.start) p.beginn = cfg.start;
            if (cfg.end)   p.ende   = cfg.end;
            localStorage.setItem('pdf_personal_cfg', JSON.stringify(p));
        } catch (e) { /* Speicher voll oder gesperrt — kein Grund, das Speichern zu verlieren */ }
    }

    function ihkSaveFlag(key, value) {
        const cfg = ihkSettings();
        if (!cfg) return;
        cfg[key] = !!value;
        if (typeof save === 'function') save();
        renderIHKView();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  BEDIENUNG — ueber addEventListener statt onclick-Attributen, damit
    //  kein weiterer globaler Name entsteht, den ein Tippfehler still
    //  verschwinden lassen kann (siehe uEvent/openQuickHelp in CLAUDE.md).
    // ═══════════════════════════════════════════════════════════════════
    function ihkTogglePanel(btn, targetId) {
        const el = document.getElementById(targetId);
        if (!el || !btn) return;
        const open = el.hidden;
        el.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
    }

    function ihkInitView() {
        const view = $ihk('view-ihk');
        if (!view || view.dataset.ihkWired === '1') return;
        view.dataset.ihkWired = '1';

        const wireSrc = (btnId, noteId) => {
            const b = $ihk(btnId);
            if (b) b.addEventListener('click', () => ihkTogglePanel(b, noteId));
        };
        wireSrc('ihkSrcBtn43', 'ihkSrcNote43');
        wireSrc('ihkSrcBtnQuota', 'ihkSrcNoteQuota');

        const gapBtn = $ihk('ihkGapsToggle');
        if (gapBtn) gapBtn.addEventListener('click', () => {
            ihkTogglePanel(gapBtn, 'ihkGapsList');
            gapBtn.textContent = $ihk('ihkGapsList').hidden
                ? ihkL('Wochen ohne Eintrag ansehen', 'Show weeks without an entry')
                : ihkL('Liste zuklappen', 'Hide list');
        });

        const conf   = $ihk('ihkConf');
        const cToggle = $ihk('ihkConfToggle');
        if (conf && cToggle) cToggle.addEventListener('click', () => {
            const open = conf.classList.toggle('is-open');
            cToggle.setAttribute('aria-expanded', String(open));
        });

        const boxZ = $ihk('ihkConfZpTeilgenommen');
        if (boxZ) boxZ.addEventListener('change', e => ihkSaveFlag('zpTeilgenommen', e.target.checked));
        const boxE = $ihk('ihkConfEingetragen');
        if (boxE) boxE.addEventListener('change', e => ihkSaveFlag('eingetragen', e.target.checked));

        const ref = $ihk('ihkSchoolRef');
        if (ref) ref.addEventListener('click', () => {
            if (typeof switchTab === 'function') switchTab('school');
        });

        // Icons erst hier setzen: `mwlIcon` steht als globale Funktion bereit,
        // sobald icons.js geladen ist — im Markup waeren es Textzeichen.
        const icon = $ihk('ihkConfIcon');
        if (icon) icon.innerHTML = ihkIcon('settings', 16);
        const chev = $ihk('ihkConfChev');
        if (chev) chev.innerHTML = ihkIcon('chevronRight', 16);
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', ihkInitView);
        } else {
            ihkInitView();
        }
    }
