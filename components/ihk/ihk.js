// ═══ IHK MODULE ═══

    function renderIHKView() {
        const { start, end, exam_zwischen, note_zwischen, note_abschluss } = data.settings.ihk;
        const now = new Date().getTime();
        const circumference = 276.46; // (2 * 44 * PI)

        
        // **IHK FIX: Daten aus dem LocalStorage ins UI laden**
        document.getElementById('confIHKStart').value = start;
        document.getElementById('confIHKEnd').value = end;
        // Abschlussprüfungsdatum wird vom End-Datum übernommen
        document.getElementById('confIHKExamAbschluss').value = end; 

        document.getElementById('confIHKExamZwischen').value = exam_zwischen;
        document.getElementById('confIHKNoteZwischen').value = note_zwischen;
        document.getElementById('confIHKNoteAbschluss').value = note_abschluss;


        // Hilfsfunktion zur Formatierung der Note
        const formatNote = (note) => {
             const n = parseFloat(note);
             if (isNaN(n) || n === 0) return '---';
             const color = n <= 2.0 ? 'var(--note-good)' : (n <= 3.0 ? 'var(--note-mid)' : 'var(--note-bad)');
             return `<span style="color:${color};">${n.toFixed(1)}</span>`;
        };
        
        // Anzeigen der Noten im Audit-Bereich
        document.getElementById('ihkDisplayNoteZwischen').innerHTML = formatNote(note_zwischen);
        document.getElementById('ihkDisplayNoteAbschluss').innerHTML = formatNote(note_abschluss);
        
        // 1. Ausbildungsfortschritt (Radial-Ring)
        if (start && end) {
            const startDate = new Date(start).getTime();
            const endDate = new Date(end).getTime();
            
            const totalDuration = endDate - startDate;
            const elapsedDuration = now - startDate;
            const daysInTraining = Math.ceil(elapsedDuration / (1000 * 60 * 60 * 24));
            
            if (totalDuration > 0 && elapsedDuration >= 0) {
                const progressPct = Math.min((elapsedDuration / totalDuration) * 100, 100);
                const offset = circumference - (progressPct / 100) * circumference;

                document.getElementById('ihkProgress').innerText = `${progressPct.toFixed(0)}%`;
                document.getElementById('ringIHKProgress').style.strokeDashoffset = offset;
                
                document.getElementById('ihkStartEndDates').innerText = `${daysInTraining} Tage absolviert.`;
            } else {
                document.getElementById('ihkProgress').innerText = '0%';
                document.getElementById('ringIHKProgress').style.strokeDashoffset = circumference;
                document.getElementById('ihkStartEndDates').innerText = `Daten fehlen/Ungültig.`;
            }
        } else {
             document.getElementById('ihkProgress').innerText = '0%';
             document.getElementById('ringIHKProgress').style.strokeDashoffset = circumference;
             document.getElementById('ihkStartEndDates').innerText = `Daten fehlen/Ungültig.`;
        }
        
        // 2. Gesamt Soll-Stunden Audit - (Logik beibehalten)
        if (start && end) {
            let totalExpectedHours = 0;
            let currentDate = new Date(start);
            const endDateObj = new Date(end);
            
            // Map gebuchter Tage für schnelles Nachschlagen
            const bookedDays = new Map(); // Map<dateString, type>
            data.entries.forEach(e => {
                bookedDays.set(e.date, e.type);
            });
            
            while (currentDate <= endDateObj) {
                const dateKey = toLocalISODate(currentDate);
                const dayIndex = currentDate.getDay(); // 0=So, 6=Sa
                const expected = data.settings.hours[dayIndex] || 0;
                
                if (expected > 0) {
                    const bookedType = bookedDays.get(dateKey);
                    
                    if (bookedType !== 'vacation' && bookedType !== 'holiday' && bookedType !== 'sick' && bookedType !== 'gleittag') {
                        totalExpectedHours += expected;
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
            document.getElementById('ihkTotalExpectedHours').innerText = `${totalExpectedHours.toFixed(0)}h`;
        } else {
             document.getElementById('ihkTotalExpectedHours').innerText = '0h';
        }

        // 3. Fehlzeiten Protokoll (NEU)
        const sickDays = data.entries.filter(e => e.type === 'sick' && e.expected > 0).length;
        const schoolDays = data.entries.filter(e => e.type === 'school' && e.expected > 0).length; // Zählt Schultage, die Sollzeit hatten

        document.getElementById('ihkSickDays').innerText = sickDays;
        document.getElementById('ihkSchoolDays').innerText = schoolDays;
        
        const totalDurationDays = start && end ? Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const elapsedDurationDays = start ? Math.ceil((now - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        const totalMissedDays = sickDays; 
        
        const warningEl = document.getElementById('ihkMissedTimeWarning');
        
        if (totalDurationDays > 0) {
            const currentMissedPct = (totalMissedDays / elapsedDurationDays) * 100;
            
            if (elapsedDurationDays > 0) {
                 warningEl.innerText = `${currentMissedPct.toFixed(1)}%`;
            } else {
                 warningEl.innerText = '0%';
            }

            if (currentMissedPct >= 10.0) {
                warningEl.style.color = 'var(--danger)';
            } else if (currentMissedPct >= 5.0) {
                warningEl.style.color = 'var(--audit-warn)';
            } else {
                warningEl.style.color = 'var(--success)';
            }

        } else {
            warningEl.innerText = 'Daten fehlen';
            warningEl.style.color = 'var(--text-muted)';
        }

        // 4. Abschlussprüfung Countdown (Audit-Anzeige)
        const countdownEndAuditEl = document.getElementById('ihkCountdownEndAudit');
        
        if (end) {
            const examDate = new Date(end).getTime();
            const diffMs = examDate - now;
            
            document.getElementById('ihkExamDateEnd').innerText = new Date(end).toLocaleDateString('de-DE');

            if (diffMs > 0) {
                const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                countdownEndAuditEl.innerText = daysLeft;
                countdownEndAuditEl.style.color = daysLeft < 90 ? 'var(--danger)' : 'var(--ihk)';
            } else {
                countdownEndAuditEl.innerText = '0';
                countdownEndAuditEl.style.color = 'var(--success)';
            }
        } else {
            countdownEndAuditEl.innerText = '---';
            document.getElementById('ihkExamDateEnd').innerText = 'Datum fehlt';
        }
        
        // 5. Zwischenprüfung Countdown (Audit-Anzeige)
        const countdownZwischenEl = document.getElementById('ihkCountdownZwischen');
        document.getElementById('ihkExamDateZwischen').innerText = exam_zwischen ? new Date(exam_zwischen).toLocaleDateString('de-DE') : 'Datum fehlt';
        
        if (exam_zwischen) {
            const examDate = new Date(exam_zwischen).getTime();
            const diffMs = examDate - now;

            if (diffMs > 0) {
                const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                countdownZwischenEl.innerText = daysLeft;
                countdownZwischenEl.style.color = daysLeft < 60 ? 'var(--danger)' : 'var(--ihk)';
            } else {
                countdownZwischenEl.innerText = '0';
                countdownZwischenEl.style.color = 'var(--success)';
            }
        } else {
            countdownZwischenEl.innerText = '---';
        }
    }

