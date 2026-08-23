// ═══ SCHOOL MODULE ═══

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
        alert:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'
    };

    // JS-generierte Texte uebersetzen sich lokal, NICHT ueber das globale MAP in
    // i18n-runtime.js: Kurzlabels wie 'Gut'/'Sehr gut' kommen auch in
    // year-month-stats.js vor und wuerden dort halb uebersetzt landen.
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

    // Notenskala: eine Stufe pro Bereich, benutzt ueberall dieselben Klassen.
    function getSchoolNoteTone(note) {
        const n = parseFloat(note);
        if (isNaN(n) || n === 0) return 'neutral';
        if (n <= 2.0) return 'good';
        if (n <= 3.0) return 'mid';
        return 'bad';
    }

    function renderSchoolView() {
        const kpis = calculateSchoolKPIs();
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
        const subjectCount = Object.keys(data.settings.school?.grades || {}).length;
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
        const oldBody = document.getElementById('schoolSubjectsBody');
        if (oldBody && kpis.gradeRowsHTML) {
            const tbody = document.createElement('tbody');
            tbody.id = 'schoolSubjectsBody';
            tbody.innerHTML = kpis.gradeRowsHTML;
            oldBody.parentNode.replaceChild(tbody, oldBody);
        }
    }

    function renderSchoolGradesInputs() {
        const inputGrid = document.getElementById('schoolSubjectsInputGrid');
        if (!inputGrid) return;

        const subjects = Object.keys(data.settings.school?.grades || {});
        let html = '';

        if (subjects.length === 0) {
            html = '<div class="sc-subjects-empty">' + scL('Noch keine Fächer angelegt.', 'No subjects yet.') + '</div>';
        }

        subjects.forEach(subject => {
            const grades = data.settings.school.grades[subject] || [];
            const validGrades = grades.filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6);
            const avg = validGrades.length > 0
                ? validGrades.reduce((a, b) => a + parseFloat(b), 0) / validGrades.length
                : 0;
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

            html += `
                <div class="sc-subject-card">
                    <div class="sc-subject-top">
                        <h5 class="sc-subject-name" title="${subjectEsc}">${subjectEsc}</h5>
                        ${avgBadge}
                        <div class="sc-subject-actions">
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
                <button class="btn btn-ghost" onclick="this.parentElement.remove();">✕</button>
            `;
            container.appendChild(el);
            const sel = el.querySelector('.bi-weekday'); if(sel) sel.value = String(r.weekday||0);
        });
    }

    function calculateSchoolKPIs() {
        const grades = data.settings.school?.grades || {};
        let allGrades = [];
        let gradesBySubject = {};
        let bestNote = 6.0, bestSubject = '—';
        let worstNote = 1.0, worstSubject = '—';

        for (const subject in grades) {
            const validGrades = (grades[subject] || []).filter(n => {
                const num = parseFloat(n);
                return !isNaN(num) && num >= 1 && num <= 6;
            }).map(parseFloat);

            if (validGrades.length > 0) {
                const avg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
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

        const overallAvg = allGrades.length > 0
            ? allGrades.reduce((a, b) => a + b, 0) / allGrades.length
            : 0;

        // Tabellenzeilen
        let gradeRowsHTML = '';
        for (const subject in gradesBySubject) {
            const avg = gradesBySubject[subject];
            const count = (grades[subject] || []).filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6).length;
            const trend = calculateTrend(grades[subject] || []);
            const tone = getSchoolNoteTone(avg);

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
        const validGrades = (grades || []).filter(n => {
            const num = parseFloat(n);
            return !isNaN(num) && num >= 1 && num <= 6;
        }).map(parseFloat);

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

    function addSchoolGrade(subject) {
        data.settings.school.grades[subject].push('');
        renderSchoolGradesInputs();
        // Fokus auf das neue, leere Feld
        const fields = document.querySelectorAll(`.school-grade-input[data-subject="${CSS.escape(subject)}"]`);
        if (fields.length) fields[fields.length - 1].focus();
    }

    function addNewSchoolSubject() {
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

        if (!data.settings.school) data.settings.school = { grades: {} };
        if (!data.settings.school.grades[name]) {
            data.settings.school.grades[name] = [];
        }

        data.settings.school.grades[name].push(grade.toString());
        nameEl.value = '';
        gradeEl.value = '';

        renderSchoolGradesInputs();
        saveSchoolGrades();
    }

    function saveSchoolGrades() {
        if (!data.settings.school) data.settings.school = { grades: {} };

        const inputs = document.querySelectorAll('.school-grade-input');
        const updatedGrades = {};

        inputs.forEach(input => {
            const subject = input.dataset.subject;
            const index = parseInt(input.dataset.index);
            const value = parseFloat(input.value);

            if (!updatedGrades[subject]) updatedGrades[subject] = [];
            updatedGrades[subject][index] = isNaN(value) ? '' : value.toString();
        });

        // Faecher ohne sichtbare Eingabefelder unveraendert uebernehmen
        for (const subject in data.settings.school.grades) {
            if (!updatedGrades[subject]) {
                updatedGrades[subject] = data.settings.school.grades[subject];
            }
        }

        data.settings.school.grades = updatedGrades;
        save();
        renderSchoolView();
    }

    function deleteSchoolSubject(subject) {
        const question = scL(`Fach "${subject}" wirklich löschen?`, `Really delete the subject "${subject}"?`);
        if (confirm(question)) {
            delete data.settings.school.grades[subject];
            save();
            renderSchoolGradesInputs();
        }
    }

    function renameSchoolSubject(oldName) {
        const label = scL(`Neuer Name für "${oldName}":`, `New name for "${oldName}":`);
        const newName = prompt(label, oldName);
        if (newName && newName.trim() && newName !== oldName) {
            data.settings.school.grades[newName.trim()] = data.settings.school.grades[oldName];
            delete data.settings.school.grades[oldName];
            save();
            renderSchoolGradesInputs();
        }
    }
