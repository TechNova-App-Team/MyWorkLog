// ═══ SCHOOL MODULE ═══

    function renderSchoolView() {
        const kpis = calculateSchoolKPIs();
        const overallAvg = kpis.overallAvg;

        // Ring & averages
        const avgEl = document.getElementById('schoolOverallAvg');
        const ringEl = document.getElementById('ringSchoolAvg');
        const badgeEl = document.getElementById('schoolGradeBadge');

        if (overallAvg > 0) {
            avgEl.innerText = overallAvg.toFixed(2);
            const avgColor = getSchoolNoteColor(overallAvg);
            avgEl.style.color = avgColor;

            const circumference = 326.7;
            const pct = mapNoteToRadial(overallAvg);
            const offset = circumference - (pct / 100) * circumference;
            ringEl.style.strokeDashoffset = offset;
            ringEl.style.stroke = avgColor;
            ringEl.style.filter = `drop-shadow(0 0 12px ${avgColor})`;

            // Grade badge
            if (badgeEl) {
                if (overallAvg <= 1.5) badgeEl.textContent = '🌟 Exzellent';
                else if (overallAvg <= 2.5) badgeEl.textContent = '✅ Gut';
                else if (overallAvg <= 3.5) badgeEl.textContent = '📘 Befriedigend';
                else if (overallAvg <= 4.5) badgeEl.textContent = '⚠️ Ausreichend';
                else badgeEl.textContent = '🔴 Mangelhaft';
            }
        } else {
            avgEl.innerText = '---';
            ringEl.style.strokeDashoffset = 326.7;
            if (badgeEl) badgeEl.textContent = 'Keine Daten';
        }

        // Metrics
        const bestNoteEl = document.getElementById('schoolBestNote');
        const bestSubjectEl = document.getElementById('schoolBestSubject');
        const worstNoteEl = document.getElementById('schoolWorstNote');
        const worstSubjectEl = document.getElementById('schoolWorstSubject');
        const subjectCountEl = document.getElementById('schoolSubjectCount');
        const subjectTotalEl = document.getElementById('schoolSubjectTotal');

        if (kpis.bestNote > 0) {
            bestNoteEl.innerText = kpis.bestNote.toFixed(1);
            bestNoteEl.style.color = getSchoolNoteColor(kpis.bestNote);
            bestSubjectEl.innerText = kpis.bestSubject;
        } else {
            bestNoteEl.innerText = '---';
            bestSubjectEl.innerText = '—';
        }

        if (kpis.worstNote > 0) {
            worstNoteEl.innerText = kpis.worstNote.toFixed(1);
            worstNoteEl.style.color = getSchoolNoteColor(kpis.worstNote);
            worstSubjectEl.innerText = kpis.worstSubject;
        } else {
            worstNoteEl.innerText = '---';
            worstSubjectEl.innerText = '—';
        }

        const totalCount = kpis.allGrades.length;
        const subjectCount = Object.keys(data.settings.school?.grades || {}).length;
        subjectCountEl.innerText = totalCount;
        subjectTotalEl.innerText = `in ${subjectCount} Fächern`;

        // Trend indicator
        const trendIndicator = document.getElementById('schoolTrendIndicator');
        const trendArrow = document.getElementById('schoolTrendArrow');
        const trendText = document.getElementById('schoolTrendText');
        const trendValue = document.getElementById('schoolTrendValue');
        const volatility = document.getElementById('schoolVolatility');

        if (trendIndicator) {
            if (overallAvg < 2.0) {
                trendArrow.innerText = '📈';
                trendText.innerText = 'Sehr gut!';
            } else if (overallAvg < 3.5) {
                trendArrow.innerText = '→';
                trendText.innerText = 'Im Plan';
            } else {
                trendArrow.innerText = '📉';
                trendText.innerText = 'Verbesserung nötig';
            }
        }

        if (trendValue) trendValue.innerText = overallAvg.toFixed(2);
        if (volatility) {
            const vol = calculateVolatility(kpis.allGrades);
            volatility.innerText = vol.toFixed(2);
        }

        // Distribution
        const dist = kpis.distribution;
        document.getElementById('distGood').style.width = dist.good + '%';
        document.getElementById('distOk').style.width = dist.ok + '%';
        document.getElementById('distMedium').style.width = dist.medium + '%';
        document.getElementById('distPoor').style.width = dist.poor + '%';

        document.getElementById('countGood').innerText = dist.goodCount;
        document.getElementById('countOk').innerText = dist.okCount;
        document.getElementById('countMedium').innerText = dist.mediumCount;
        document.getElementById('countPoor').innerText = dist.poorCount;

        // Timeline fill
        const timelineGood = document.getElementById('scTimelineGood');
        const timelineOk = document.getElementById('scTimelineOk');
        const timelinePoor = document.getElementById('scTimelinePoor');

        if (timelineGood) timelineGood.style.width = dist.good + '%';
        if (timelineOk) timelineOk.style.width = dist.ok + '%';
        if (timelinePoor) timelinePoor.style.width = dist.poor + '%';

        // Subjects table
        const tableBody = document.getElementById('schoolSubjectsBody');
        if (kpis.gradeListHTML) {
            const tbody = document.createElement('tbody');
            tbody.id = 'schoolSubjectsBody';
            tbody.innerHTML = kpis.gradeListHTML;
            const oldBody = document.getElementById('schoolSubjectsBody');
            if (oldBody) oldBody.parentNode.replaceChild(tbody, oldBody);
        }
    }

    function renderSchoolGradesInputs() {
        const inputGrid = document.getElementById('schoolSubjectsInputGrid');
        let html = '';

        for (const subject in data.settings.school.grades) {
            const grades = data.settings.school.grades[subject];
            const validGrades = grades.filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6);
            const avg = validGrades.length > 0 ? validGrades.reduce((a,b) => a + parseFloat(b), 0) / validGrades.length : 0;
            const avgColor = avg > 0 ? getSchoolNoteColor(avg) : 'var(--primary)';

            const subjectEsc = esc(subject);
            html += `
                <div style="background:rgba(255,255,255,0.03);padding:1.25rem;border-radius:16px;border:1px solid rgba(255,255,255,0.06);position:relative;overflow:hidden;">
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${avgColor};border-radius:3px 3px 0 0;"></div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                        <div style="display:flex;align-items:center;gap:8px;flex:1;">
                            <h5 style="color:#fff;margin:0;font-size:1rem;font-weight:700;">${subjectEsc}</h5>
                            ${avg > 0 ? '<span style="font-size:.75rem;padding:3px 10px;border-radius:8px;background:' + avgColor + '20;color:' + avgColor + ';font-weight:600;">Ø ' + avg.toFixed(1) + '</span>' : ''}
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button type="button" data-subject="${subjectEsc}" style="background:rgba(168,85,247,0.15);color:var(--primary);border:none;padding:4px 8px;border-radius:6px;font-size:.9rem;cursor:pointer;transition:all 0.2s;font-weight:600;" title="Fach umbenennen" class="school-action-btn school-rename-btn">✏️</button>
                            <button type="button" data-subject="${subjectEsc}" style="background:rgba(239,68,68,0.2);color:#ef4444;border:none;padding:4px 8px;border-radius:6px;font-size:.9rem;cursor:pointer;transition:all 0.2s;font-weight:600;" title="Fach löschen" class="school-action-btn school-delete-btn">🗑️</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${grades.map((grade, index) => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:10px;">
                                <label style="font-size:.8rem;color:rgba(255,255,255,0.4);font-weight:500;">Note ${index + 1}</label>
                                <input type="number" step="0.1" min="1.0" max="6.0"
                                    class="glass-input school-grade-input" data-subject="${subjectEsc}" data-index="${index}" value="${esc(grade)}"
                                    style="width:80px;padding:8px;text-align:center;font-family:var(--font-mono);border-radius:10px;">
                            </div>
                        `).join('')}

                        <button type="button" class="btn btn-ghost school-addgrade-btn" data-subject="${subjectEsc}" style="background:transparent;border:1px dashed rgba(168,85,247,0.3);color:var(--primary);padding:10px;border-radius:12px;font-size:.85rem;">+ Note hinzufügen</button>
                    </div>
                </div>
            `;
        }

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
        const buttons = document.querySelectorAll('.school-action-btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', function() { this.style.background = this.style.background.includes('#ef4444') ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'; });
            btn.addEventListener('mouseleave', function() { this.style.background = this.style.background.includes('#ef4444') ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'; });
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

        // Build grades list HTML
        let gradeListHTML = '';
        if (Object.keys(gradesBySubject).length > 0) {
            gradeListHTML = '<tbody id="schoolSubjectsBody">';
            for (const subject in gradesBySubject) {
                const avg = gradesBySubject[subject];
                const count = (grades[subject] || []).filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6).length;
                const trend = calculateTrend(grades[subject] || []);
                const trendText = trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '→';
                const statusColor = avg <= 2 ? '#22c55e' : avg <= 3 ? '#f59e0b' : '#ef4444';
                const statusBg = avg <= 2 ? 'rgba(34,197,94,0.2)' : avg <= 3 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)';

                gradeListHTML += `
                    <tr>
                        <td class="sc-col-subject">${esc(subject)}</td>
                        <td class="sc-col-grade"><span style="color:${statusColor};font-weight:700;">${avg.toFixed(1)}</span></td>
                        <td class="sc-col-trend">${trendText} ${trend.change > 0 ? '+' : ''}${trend.change.toFixed(2)}</td>
                        <td class="sc-col-count">${count}</td>
                        <td class="sc-col-status"><span style="background:${statusBg};color:${statusColor};padding:4px 12px;border-radius:20px;font-size:0.85rem;font-weight:600;">${avg <= 2 ? 'Sehr gut' : avg <= 3 ? 'Gut' : 'Verbesserung'}</span></td>
                    </tr>
                `;
            }
            gradeListHTML += '</tbody>';
        }

        // Calculate distribution
        const distribution = calculateGradeDistribution(allGrades);

        return {
            overallAvg,
            bestNote: bestNote === 6.0 ? 0 : bestNote,
            bestSubject,
            worstNote: worstNote === 1.0 ? 0 : worstNote,
            worstSubject,
            allGrades,
            gradeListHTML,
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

        const change = olderAvg - recentAvg; // Positive = improvement (notes went down)
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

    function getSchoolNoteColor(note) {
        const n = parseFloat(note);
        if (isNaN(n) || n === 0) return 'var(--primary)';
        if (n <= 2.0) return '#22c55e';
        if (n <= 3.0) return '#f59e0b';
        return '#ef4444';
    }

    function mapNoteToRadial(note) {
        const n = parseFloat(note);
        if (isNaN(n) || n === 0) return 0;
        // Map 1.0 (best) to 100%, 6.0 (worst) to 0%
        return Math.max(0, Math.min(100, ((6.0 - n) / 5.0) * 100));
    }

    function addSchoolGrade(subject) {
        data.settings.school.grades[subject].push('');
        renderSchoolGradesInputs();
    }

    function addNewSchoolSubject() {
        const nameEl = document.getElementById('newSubjectName');
        const gradeEl = document.getElementById('newSubjectGrade');

        const name = (nameEl?.value || '').trim();
        const grade = parseFloat(gradeEl?.value || '');

        if (!name) {
            alert('Bitte gib einen Fachnamen ein!');
            return;
        }

        if (isNaN(grade) || grade < 1.0 || grade > 6.0) {
            alert('Bitte gib eine gültige Note ein (1.0 – 6.0)!');
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
        // Collect all grade inputs
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

        // Merge with existing (in case some subjects haven't been modified)
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
        if (confirm(`Fach "${subject}" wirklich löschen?`)) {
            delete data.settings.school.grades[subject];
            save();
            renderSchoolGradesInputs();
        }
    }

    function renameSchoolSubject(oldName) {
        const newName = prompt(`Neuer Name für "${oldName}":`, oldName);
        if (newName && newName.trim() && newName !== oldName) {
            data.settings.school.grades[newName.trim()] = data.settings.school.grades[oldName];
            delete data.settings.school.grades[oldName];
            save();
            renderSchoolGradesInputs();
        }
    }
