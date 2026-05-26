// ═══ CORE: SCHOOL-GRADES ═══
    // --- SCHOOL LOGIC (NEU GESTALTET) ---
    
    const getNoteColor = (note) => {
         const n = parseFloat(note);
         if (isNaN(n) || n === 0) return 'var(--text-muted)';
         if (n <= 2.0) return 'var(--note-good)';
         if (n <= 3.0) return 'var(--note-mid)';
         return 'var(--note-bad)';
    };
    
    // Hilfsfunktion zur Umrechnung der Schulnote in einen Radial-Wert (0% bis 100%)
    function mapNoteToRadial(note) {
         const n = parseFloat(note);
         if (isNaN(n) || n <= 0) return 0;
         
         // Note 1.0 = 100% (bestes Ergebnis), Note 6.0 = 0% (schlechtestes Ergebnis)
         const maxNote = 6.0;
         const minNote = 1.0;
         
         // Lineare Interpolation: (max - n) / (max - min) * 100
         const progress = ((maxNote - n) / (maxNote - minNote)) * 100;
         
         return Math.max(0, Math.min(100, progress));
    }
    function addSchoolSubjectInput() {
        const subject = prompt('Fachname eingeben (z.B. "Mathematik", "Englisch"):');
        if (subject && subject.trim()) {
            const cleanSubject = subject.trim();
            if (!data.settings.school.grades[cleanSubject]) {
                data.settings.school.grades[cleanSubject] = [''];
                renderSchoolGradesInputs();
                showCustomMessage('✅ Fach hinzugefügt', `Das Fach "${cleanSubject}" wurde hinzugefügt. Gib jetzt Noten ein!`, 'success');
            } else {
                showCustomMessage('⚠️ Fach existiert', `Das Fach "${cleanSubject}" existiert bereits!`, 'warning');
            }
        }
    }

    function deleteSchoolSubject(subject) {
        if (confirm(`Möchtest du das Fach "${subject}" wirklich löschen? Alle Noten in diesem Fach werden gelöscht.`)) {
            delete data.settings.school.grades[subject];
            save();
            renderSchoolGradesInputs();
            showCustomMessage('✅ Fach gelöscht', `Das Fach "${subject}" wurde gelöscht.`, 'success');
        }
    }

    function renameSchoolSubject(oldSubject) {
        const newSubject = prompt(`Neuer Name für "${oldSubject}":`, oldSubject);
        if (newSubject && newSubject.trim()) {
            const cleanNewSubject = newSubject.trim();
            if (cleanNewSubject === oldSubject) {
                return; // Keine Änderung
            }
            if (data.settings.school.grades[cleanNewSubject]) {
                showCustomMessage('⚠️ Fach existiert bereits', `Das Fach "${cleanNewSubject}" existiert bereits!`, 'warning');
                return;
            }
            // Alte Grades zu neue Subject kopieren
            data.settings.school.grades[cleanNewSubject] = data.settings.school.grades[oldSubject];
            delete data.settings.school.grades[oldSubject];
            save();
            renderSchoolGradesInputs();
            showCustomMessage('✅ Fach umbenannt', `"${oldSubject}" wurde in "${cleanNewSubject}" umbenannt.`, 'success');
        }
    }
    
    function saveSchoolGrades() {
        const inputs = document.querySelectorAll('.school-grade-input');
        const newGrades = {};
        
        for (const subject in data.settings.school.grades) {
            newGrades[subject] = [];
        }

        inputs.forEach(input => {
            const subject = input.getAttribute('data-subject');
            const grade = parseFloat(input.value);

            if (!isNaN(grade) && grade >= 1.0 && grade <= 6.0) {
                 newGrades[subject].push(grade);
            }
            // Leere oder ungültige Einträge werden nicht gespeichert, aber der Subject-Array bleibt bestehen.
        });
        
        data.settings.school.grades = newGrades;
        save();
        renderSchoolGradesInputs(); 
        showCustomMessage('✅ Erfolg', 'Berufsschulnoten erfolgreich gespeichert!', 'success');
    }
    
    function calculateSchoolKPIs() {
        let totalSum = 0;
        let totalCount = 0;
        let bestNote = 6.1; 
        let worstNote = 0.9; 
        let bestSubject = '---';
        let worstSubject = '---';
        
        let gradeListHTML = '';
        
        for (const subject in data.settings.school.grades) {
            const grades = data.settings.school.grades[subject];
            
            if (grades.length > 0) {
                let subjectSum = 0;
                grades.forEach(grade => {
                    const n = parseFloat(grade);
                    if (!isNaN(n) && n >= 1.0 && n <= 6.0) {
                        totalSum += n;
                        totalCount++;
                        subjectSum += n;

                        if (n < bestNote) {
                            bestNote = n;
                            bestSubject = subject;
                        }
                        if (n > worstNote) {
                            worstNote = n;
                            worstSubject = subject;
                        }
                    }
                });
                
                if (grades.filter(n => !isNaN(parseFloat(n))).length > 0) {
                    const validCount = grades.filter(n => !isNaN(parseFloat(n))).length;
                    const subjectAvg = subjectSum / validCount;
                    const avgColor = getNoteColor(subjectAvg);
                    const pct = mapNoteToRadial(subjectAvg);
                    const emoji = subjectAvg <= 1.5 ? '🌟' : subjectAvg <= 2.5 ? '✅' : subjectAvg <= 3.5 ? '📘' : subjectAvg <= 4.5 ? '⚠️' : '🔴';

                    // Premium Fächerkarte
                    gradeListHTML += `
                        <div class="school-subject-card">
                            <div class="subject-bar" style="background:linear-gradient(90deg,${avgColor},${avgColor}80);"></div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                                <span style="font-size:1.4rem;">${emoji}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:700;color:#fff;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${subject}</div>
                                    <div style="font-size:.72rem;color:rgba(255,255,255,0.35);">${validCount} Note${validCount > 1 ? 'n' : ''} erfasst</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:1.6rem;font-weight:800;color:${avgColor};font-family:var(--font-mono);line-height:1;">${subjectAvg.toFixed(1)}</div>
                                </div>
                            </div>
                            <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${avgColor},${avgColor}aa);border-radius:4px;transition:width 1s cubic-bezier(.4,0,.2,1);"></div>
                            </div>
                            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:.72rem;color:rgba(255,255,255,0.3);">
                                <span>Einzelnoten: ${grades.filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6).map(n => parseFloat(n).toFixed(1)).join(', ')}</span>
                                <span>${pct.toFixed(0)}%</span>
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        const overallAvg = totalCount > 0 ? totalSum / totalCount : 0;
        
        // Anpassung falls keine Noten existieren
        if (totalCount === 0) {
            bestNote = 0;
            worstNote = 0;
        } else if (bestNote === 6.1) {
             bestNote = worstNote;
             bestSubject = worstSubject;
        } else if (worstNote === 0.9) {
             worstNote = bestNote;
             worstSubject = bestSubject;
        }
        
        return {
            overallAvg: overallAvg,
            bestNote: bestNote, 
            worstNote: worstNote, 
            bestSubject,
            worstSubject,
            gradeListHTML
        };
    }
    function saveIHKSettings() {
        // **IHK FIX: Sicherstellung, dass alle Daten ins data-Objekt gespeichert werden**
        data.settings.ihk.start = document.getElementById('confIHKStart').value;
        data.settings.ihk.end = document.getElementById('confIHKEnd').value;
        data.settings.ihk.exam_zwischen = document.getElementById('confIHKExamZwischen').value;
        data.settings.ihk.note_zwischen = document.getElementById('confIHKNoteZwischen').value;
        data.settings.ihk.note_abschluss = document.getElementById('confIHKNoteAbschluss').value;
        
        save();
        renderIHKView();
        const btn   = document.getElementById('ihkSaveBtn');
        const icon  = document.getElementById('ihkSaveBtnIcon');
        const label = document.getElementById('ihkSaveBtnLabel');
        if (btn) {
            btn.classList.add('is-saved');
            btn.disabled = true;
            if (icon)  icon.textContent  = '✓';
            if (label) label.textContent = 'Gespeichert!';
            setTimeout(() => {
                btn.classList.remove('is-saved');
                btn.disabled = false;
                if (icon)  icon.textContent  = '▶';
                if (label) label.textContent = 'Speichern & Berechnen';
            }, 2500);
        }
    }

