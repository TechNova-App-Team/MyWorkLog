// ═══ SCHOOL MODULE ═══

    function renderSchoolView() {
        const kpis = calculateSchoolKPIs();
        
        const avgEl = document.getElementById('schoolOverallAvg');
        const bestNoteEl = document.getElementById('schoolBestNote');
        const bestSubjectEl = document.getElementById('schoolBestSubject');
        const worstNoteEl = document.getElementById('schoolWorstNote');
        const worstSubjectEl = document.getElementById('schoolWorstSubject');
        const subjectCountEl = document.getElementById('schoolSubjectCount');
        const trendIconEl = document.getElementById('schoolTrendIcon');
        const trendTextEl = document.getElementById('schoolTrendText');
        const badgeEl = document.getElementById('schoolGradeBadge');
        const subjectTotalEl = document.getElementById('schoolSubjectTotal');

        const overallAvg = kpis.overallAvg;
        const avgColor = getNoteColor(overallAvg);
        const circumference = 276.46;
        
        const progressPct = mapNoteToRadial(overallAvg);
        const offset = circumference - (progressPct / 100) * circumference;
        const ringEl = document.getElementById('ringSchoolAvg');

        const subjectCount = Object.keys(data.settings.school.grades).length;
        const totalNotes = Object.values(data.settings.school.grades).flat().filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6).length;

        if (overallAvg > 0) {
            avgEl.innerText = overallAvg.toFixed(2);
            avgEl.style.color = avgColor;
            ringEl.style.strokeDashoffset = offset;
            ringEl.style.stroke = avgColor;
            ringEl.style.filter = `drop-shadow(0 0 12px ${avgColor})`;

            // Badge
            if (badgeEl) {
                if (overallAvg <= 1.5) { badgeEl.textContent = '🌟 Exzellent'; badgeEl.style.background = 'rgba(16,185,129,0.15)'; badgeEl.style.color = '#10b981'; badgeEl.style.borderColor = 'rgba(16,185,129,0.3)'; }
                else if (overallAvg <= 2.5) { badgeEl.textContent = '✅ Gut'; badgeEl.style.background = 'rgba(16,185,129,0.1)'; badgeEl.style.color = '#10b981'; badgeEl.style.borderColor = 'rgba(16,185,129,0.2)'; }
                else if (overallAvg <= 3.5) { badgeEl.textContent = '📘 Befriedigend'; badgeEl.style.background = 'rgba(59,130,246,0.12)'; badgeEl.style.color = '#3b82f6'; badgeEl.style.borderColor = 'rgba(59,130,246,0.25)'; }
                else if (overallAvg <= 4.5) { badgeEl.textContent = '⚠️ Ausreichend'; badgeEl.style.background = 'rgba(245,158,11,0.12)'; badgeEl.style.color = '#f59e0b'; badgeEl.style.borderColor = 'rgba(245,158,11,0.25)'; }
                else { badgeEl.textContent = '🔴 Mangelhaft'; badgeEl.style.background = 'rgba(239,68,68,0.12)'; badgeEl.style.color = '#ef4444'; badgeEl.style.borderColor = 'rgba(239,68,68,0.25)'; }
            }

            bestNoteEl.innerText = kpis.bestNote > 0 ? kpis.bestNote.toFixed(1) : '---';
            bestNoteEl.style.color = getNoteColor(kpis.bestNote);
            bestSubjectEl.innerText = kpis.bestSubject;
            
            worstNoteEl.innerText = kpis.worstNote > 0 ? kpis.worstNote.toFixed(1) : '---';
            worstNoteEl.style.color = getNoteColor(kpis.worstNote);
            worstSubjectEl.innerText = kpis.worstSubject;

            if (subjectCountEl) subjectCountEl.innerText = totalNotes;
            if (subjectTotalEl) subjectTotalEl.innerText = `in ${subjectCount} Fächern`;
            
            if (trendIconEl && trendTextEl) {
                if (overallAvg < 2.0) { trendIconEl.innerText = '📈'; trendTextEl.innerText = 'Sehr gut!'; }
                else if (overallAvg < 3.5) { trendIconEl.innerText = '➜'; trendTextEl.innerText = 'Im Plan'; }
                else { trendIconEl.innerText = '📉'; trendTextEl.innerText = 'Verbesserung nötig'; }
            }

        } else {
            avgEl.innerText = '---';
            avgEl.style.color = 'var(--school)';
            ringEl.style.strokeDashoffset = circumference;
            ringEl.style.stroke = 'var(--school)';
            ringEl.style.filter = `drop-shadow(0 0 10px var(--school))`;
            
            bestNoteEl.innerText = '---';
            worstNoteEl.innerText = '---';
            bestSubjectEl.innerText = '';
            worstSubjectEl.innerText = '';
            if (badgeEl) { badgeEl.textContent = 'Keine Daten'; badgeEl.style.background = 'rgba(59,130,246,0.12)'; badgeEl.style.color = 'var(--school)'; badgeEl.style.borderColor = 'rgba(59,130,246,0.25)'; }
            if (subjectCountEl) subjectCountEl.innerText = '0';
            if (subjectTotalEl) subjectTotalEl.innerText = 'in 0 Fächern';
            if (trendIconEl) trendIconEl.innerText = '➜';
            if (trendTextEl) trendTextEl.innerText = 'Keine Daten';
        }
        
        document.getElementById('schoolGradesList').innerHTML = kpis.gradeListHTML || `
            <div class="school-empty-state">
                <div style="font-size:3rem;margin-bottom:1rem;opacity:0.3;">📚</div>
                <div style="font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:.5rem;">Noch keine Noten vorhanden</div>
                <div style="font-size:.85rem;color:rgba(255,255,255,0.3);">Füge oben ein Fach hinzu und trage deine ersten Noten ein!</div>
            </div>
        `;
    }

    function renderSchoolGradesInputs() {
        const inputGrid = document.getElementById('schoolGradesInputGrid');
        let html = '';
        
        for (const subject in data.settings.school.grades) {
             const grades = data.settings.school.grades[subject];
             const validGrades = grades.filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6);
             const avg = validGrades.length > 0 ? validGrades.reduce((a,b) => a + parseFloat(b), 0) / validGrades.length : 0;
             const avgColor = avg > 0 ? getNoteColor(avg) : 'var(--school)';
             
             html += `
                <div style="background:rgba(255,255,255,0.03);padding:1.25rem;border-radius:16px;border:1px solid rgba(255,255,255,0.06);position:relative;overflow:hidden;">
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${avgColor};border-radius:3px 3px 0 0;"></div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                        <div style="display:flex;align-items:center;gap:8px;flex:1;">
                            <h5 style="color:#fff;margin:0;font-size:1rem;font-weight:700;">${subject}</h5>
                            ${avg > 0 ? '<span style="font-size:.75rem;padding:3px 10px;border-radius:8px;background:' + avgColor + '20;color:' + avgColor + ';font-weight:600;">Ø ' + avg.toFixed(1) + '</span>' : ''}
                        </div>
                        <div style="display:flex;gap:6px;">
                            <button onclick="renameSchoolSubject('${subject.replace(/'/g, "\\'")}')" style="background:rgba(59,130,246,0.2);color:var(--school);border:none;padding:4px 8px;border-radius:6px;font-size:.9rem;cursor:pointer;transition:all 0.2s;font-weight:600;" title="Fach umbenennen" class="school-action-btn">✏️</button>
                            <button onclick="deleteSchoolSubject('${subject.replace(/'/g, "\\'")}')" style="background:rgba(239,68,68,0.2);color:#ef4444;border:none;padding:4px 8px;border-radius:6px;font-size:.9rem;cursor:pointer;transition:all 0.2s;font-weight:600;" title="Fach löschen" class="school-action-btn">🗑️</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${grades.map((grade, index) => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:10px;">
                                <label style="font-size:.8rem;color:rgba(255,255,255,0.4);font-weight:500;">Note ${index + 1}</label>
                                <input type="number" step="0.1" min="1.0" max="6.0" 
                                    class="glass-input school-grade-input" data-subject="${subject}" data-index="${index}" value="${grade}"
                                    style="width:80px;padding:8px;text-align:center;font-family:var(--font-mono);border-radius:10px;">
                            </div>
                        `).join('')}
                        
                        <button class="btn btn-ghost" onclick="addSchoolGrade('${subject}')" style="background:transparent;border:1px dashed rgba(59,130,246,0.3);color:var(--school);padding:10px;border-radius:12px;font-size:.85rem;">+ Note hinzufügen</button>
                    </div>
                </div>
             `;
        }
        
        inputGrid.innerHTML = html;
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

    function addSchoolGrade(subject) {
         // Fügt eine leere Note ('') hinzu, die beim Speichern ignoriert wird, aber ein Input-Feld erzeugt
         data.settings.school.grades[subject].push(''); 
         renderSchoolGradesInputs();
    }

