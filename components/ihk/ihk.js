// ═══ IHK MODULE ═══

    function renderIHKView() {
        const { start, end, exam_zwischen, note_zwischen, note_abschluss } = data.settings.ihk;
        const now = new Date().getTime();
        const circumference = 326.7; // 2 * π * 52

        // ── Sync config inputs ──
        document.getElementById('confIHKStart').value        = start        || '';
        document.getElementById('confIHKEnd').value          = end          || '';
        document.getElementById('confIHKExamAbschluss').value = end         || '';
        document.getElementById('confIHKExamZwischen').value  = exam_zwischen || '';
        document.getElementById('confIHKNoteZwischen').value  = note_zwischen || '';
        document.getElementById('confIHKNoteAbschluss').value = note_abschluss || '';

        // ── Grade formatting + grade bars ──
        const formatNote = (note) => {
            const n = parseFloat(note);
            if (isNaN(n) || n === 0) return '---';
            const color = n <= 2.0 ? 'var(--mc-green,#22c55e)'
                        : n <= 3.0 ? 'var(--mc-amber,#f59e0b)'
                        :            'var(--mc-red,#ef4444)';
            return `<span style="color:${color};">${n.toFixed(1)}</span>`;
        };

        document.getElementById('ihkDisplayNoteZwischen').innerHTML  = formatNote(note_zwischen);
        document.getElementById('ihkDisplayNoteAbschluss').innerHTML = formatNote(note_abschluss);

        // Grade progress bars (1.0 = best / 6.0 = worst → invert for fill)
        const gradeToBar = (note) => {
            const n = parseFloat(note);
            if (isNaN(n) || n === 0) return 0;
            return Math.max(0, Math.min(100, ((6.0 - n) / 5.0) * 100));
        };
        const gradeToColor = (note) => {
            const n = parseFloat(note);
            if (isNaN(n) || n === 0) return 'rgba(148,184,232,0.3)';
            return n <= 2.0 ? '#22c55e' : n <= 3.0 ? '#f59e0b' : '#ef4444';
        };
        const barZ = document.getElementById('mcGradeBarZwischen');
        const barA = document.getElementById('mcGradeBarAbschluss');
        if (barZ) { barZ.style.width = gradeToBar(note_zwischen) + '%'; barZ.style.background = gradeToColor(note_zwischen); }
        if (barA) { barA.style.width = gradeToBar(note_abschluss) + '%'; barA.style.background = gradeToColor(note_abschluss); }

        // ── Training progress ring + timeline fill ──
        const ringEl       = document.getElementById('ringIHKProgress');
        const progressEl   = document.getElementById('ihkProgress');
        const metaEl       = document.getElementById('ihkStartEndDates');
        const timelineFill = document.getElementById('mcTimelineFill');
        const timelineNow  = document.getElementById('mcTimelineNow');
        const tlStart      = document.getElementById('mcTimelineStart');
        const tlEnd        = document.getElementById('mcTimelineEnd');
        const markerZP     = document.getElementById('mcMarkerZwischen');

        const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

        if (tlStart) tlStart.textContent = fmt(start);
        if (tlEnd)   tlEnd.textContent   = fmt(end);

        if (start && end) {
            const startMs   = new Date(start).getTime();
            const endMs     = new Date(end).getTime();
            const totalMs   = endMs - startMs;
            const elapsedMs = now  - startMs;
            const daysIn    = Math.ceil(elapsedMs / 86400000);

            if (totalMs > 0 && elapsedMs >= 0) {
                const pct    = Math.min((elapsedMs / totalMs) * 100, 100);
                const offset = circumference - (pct / 100) * circumference;

                progressEl.textContent = pct.toFixed(0) + '%';
                ringEl.style.strokeDashoffset = offset;
                metaEl.textContent = `${daysIn} Tage absolviert`;

                if (timelineFill) timelineFill.style.width = pct + '%';
                if (timelineNow)  timelineNow.style.left   = pct + '%';

                // ZP marker position
                if (markerZP && exam_zwischen) {
                    const zpMs  = new Date(exam_zwischen).getTime();
                    const zpPct = Math.min(Math.max(((zpMs - startMs) / totalMs) * 100, 0), 100);
                    markerZP.style.left = zpPct + '%';
                }
            } else {
                progressEl.textContent            = '0%';
                ringEl.style.strokeDashoffset     = circumference;
                metaEl.textContent                = 'Ausbildung noch nicht begonnen';
                if (timelineFill) timelineFill.style.width = '0%';
                if (timelineNow)  timelineNow.style.left   = '0%';
            }
        } else {
            progressEl.textContent        = '0%';
            ringEl.style.strokeDashoffset = circumference;
            metaEl.textContent            = 'Daten fehlen';
            if (timelineFill) timelineFill.style.width = '0%';
            if (timelineNow)  timelineNow.style.left   = '0%';
        }

        // ── Soll-Stunden ──
        if (start && end) {
            let totalExpectedHours = 0;
            let cur = new Date(start);
            const endObj = new Date(end);
            const bookedDays = new Map();
            data.entries.forEach(e => bookedDays.set(e.date, e.type));
            while (cur <= endObj) {
                const dk  = toLocalISODate(cur);
                const di  = cur.getDay();
                const exp = data.settings.hours[di] || 0;
                if (exp > 0) {
                    const bt = bookedDays.get(dk);
                    if (bt !== 'vacation' && bt !== 'holiday' && bt !== 'sick' && bt !== 'gleittag') {
                        totalExpectedHours += exp;
                    }
                }
                cur.setDate(cur.getDate() + 1);
            }
            document.getElementById('ihkTotalExpectedHours').textContent = totalExpectedHours.toFixed(0) + 'h';
        } else {
            document.getElementById('ihkTotalExpectedHours').textContent = '0h';
        }

        // ── Fehlzeiten ──
        const sickDays   = data.entries.filter(e => e.type === 'sick'   && e.expected > 0).length;
        const schoolDays = data.entries.filter(e => e.type === 'school' && e.expected > 0).length;
        document.getElementById('ihkSickDays').textContent   = sickDays;
        document.getElementById('ihkSchoolDays').textContent = schoolDays;

        const totalDurDays    = (start && end) ? Math.ceil((new Date(end) - new Date(start)) / 86400000) : 0;
        const elapsedDurDays  = start ? Math.ceil((now - new Date(start).getTime()) / 86400000) : 0;
        const warningEl       = document.getElementById('ihkMissedTimeWarning');
        const quotaFill       = document.getElementById('mcQuotaFill');

        if (totalDurDays > 0 && elapsedDurDays > 0) {
            const missPct = (sickDays / elapsedDurDays) * 100;
            warningEl.textContent = missPct.toFixed(1) + '%';
            warningEl.style.color = missPct >= 10 ? 'var(--mc-red,#ef4444)'
                                  : missPct >= 5  ? 'var(--mc-amber,#f59e0b)'
                                  :                 'var(--mc-green,#22c55e)';
            if (quotaFill) {
                quotaFill.style.width      = Math.min(missPct, 100) + '%';
                quotaFill.style.background = missPct >= 10 ? '#ef4444'
                                           : missPct >= 5  ? '#f59e0b'
                                           :                 '#22c55e';
            }
        } else {
            warningEl.textContent = '0%';
            warningEl.style.color = 'var(--mc-green,#22c55e)';
        }

        // ── Abschlussprüfung Countdown ──
        const cntEndEl = document.getElementById('ihkCountdownEndAudit');
        const barEnd   = document.getElementById('mcBarEnd');
        if (end) {
            document.getElementById('ihkExamDateEnd').textContent = fmt(end);
            const examMs = new Date(end).getTime();
            const diffMs = examMs - now;
            if (diffMs > 0) {
                const dLeft = Math.ceil(diffMs / 86400000);
                const totalD = start ? Math.ceil((examMs - new Date(start).getTime()) / 86400000) : dLeft + 365;
                cntEndEl.textContent = dLeft;
                cntEndEl.style.color = '';
                if (barEnd) barEnd.style.width = Math.max(0, Math.min(100, (1 - dLeft / totalD) * 100)) + '%';
            } else {
                cntEndEl.textContent = '0';
                cntEndEl.style.color = 'var(--mc-green,#22c55e)';
                if (barEnd) barEnd.style.width = '100%';
            }
        } else {
            cntEndEl.textContent = '---';
            document.getElementById('ihkExamDateEnd').textContent = 'Datum fehlt';
        }

        // ── Zwischenprüfung Countdown ──
        const cntZwEl    = document.getElementById('ihkCountdownZwischen');
        const barZwisch  = document.getElementById('mcBarZwischen');
        document.getElementById('ihkExamDateZwischen').textContent = exam_zwischen ? fmt(exam_zwischen) : 'Datum fehlt';
        if (exam_zwischen) {
            const zpMs   = new Date(exam_zwischen).getTime();
            const diffMs = zpMs - now;
            if (diffMs > 0) {
                const dLeft  = Math.ceil(diffMs / 86400000);
                const totalD = start ? Math.ceil((zpMs - new Date(start).getTime()) / 86400000) : dLeft + 365;
                cntZwEl.textContent = dLeft;
                cntZwEl.style.color = '';
                if (barZwisch) barZwisch.style.width = Math.max(0, Math.min(100, (1 - dLeft / totalD) * 100)) + '%';
            } else {
                cntZwEl.textContent = '0';
                cntZwEl.style.color = 'var(--mc-green,#22c55e)';
                if (barZwisch) barZwisch.style.width = '100%';
            }
        } else {
            cntZwEl.textContent = '---';
        }
    }

