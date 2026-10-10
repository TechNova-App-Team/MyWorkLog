// ═══ CORE: CHARTS ═══
    // --- CHARTS & PERFORMANCE ---


    // Zielpunkt fuer alle "jetzt erfassen"-Aufforderungen der leeren
    // Zustaende. Scrollt zum Formular und setzt den Fokus auf das erste
    // Feld, damit die Tastatur-Reise dort weitergeht, wo der Klick war.
    function focusEntryForm() {
        // Seit dem neuen Dashboard liegt das Formular in einer Schublade (#dnDrawer).
        if (typeof dnOpenEntry === 'function') { dnOpenEntry(); return; }
        const form = document.querySelector('[data-item-id="entry-form"]') ||
                     document.querySelector('.entry-form');
        if (!form) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        const first = document.getElementById('inpDate');
        if (first) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) {} }, reduce ? 0 : 380);
    }


    // 🔴 `entry.info` ist KEIN Freitextfeld, sondern ein Pipe-String:
    // handleEntry() startet mit info = <Notiz des Nutzers> und stellt dann
    // je nach Zweig einen System-Zusatz VORNE davor ("07:30 - 17:00 (30m
    // Pause)", "Manuell (7.50h)", "Berufsschule - Mittwoch (…)", "Urlaubstag").
    // Nachtraege ("↪ Zusatzzeit") haengen hinten dran.
    // Die Karte hat diesen ganzen String frueher ZWEIMAL gezeigt — einmal als
    // Ueberschrift, einmal als Zitat darunter. Hier bleibt nur der Teil, den
    // der Nutzer selbst getippt hat: alles nach dem ersten Segment.
    function activityUserNote(e) {
        if (e.isPeriod) return String(e.info || '').trim();
        const parts = String(e.info || '').split('|').map(s => s.trim()).filter(Boolean);
        while (parts.length && parts[parts.length - 1].startsWith('↪')) parts.pop();
        return parts.length > 1 ? parts.slice(1).join(' · ') : '';
    }


    
    
    
    
    
    
    


    // ========== MEGA ADVANCED EFFECTS ENGINE ==========
    
    function createExplosion(x, y, color = 'var(--primary)') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('width', '100');
        svg.setAttribute('height', '100');
        svg.style.cssText = `
            position: fixed;
            left: ${x - 50}px;
            top: ${y - 50}px;
            pointer-events: none;
            z-index: 9999;
        `;
        
        const actualColor = color.includes('var') ? 'rgb(var(--primary-rgb))' : color;
        
        for (let i = 0; i < 12; i++) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '50');
            circle.setAttribute('cy', '50');
            circle.setAttribute('r', '3');
            circle.setAttribute('fill', actualColor);
            circle.style.animation = `expandPulse 0.8s ease-out ${i * 30}ms forwards`;
            svg.appendChild(circle);
        }
        
        document.body.appendChild(svg);
        setTimeout(() => svg.remove(), 1000);
    }
    
    // ========== END ADVANCED EFFECTS ENGINE ==========

    // NEU: Berechnung der Deep Performance Metriken
    function calculateDeepPerformanceMetrics(entries) {
        const workEntries = entries.filter(e => e.type === 'work' && e.worked > 0);
        let totalFocusHours = 0;
        let focusCount = 0;

        // 1. Ø Arbeitsbeginn — nur der FRÜHESTE Start je Arbeitstag (pro Job) zählt.
        // Sonst verfälschen Zusatzzeit-/Split-Shift-Einträge (z.B. 16:15-16:47 am selben
        // Tag) den Schnitt, obwohl sie kein neuer Arbeitsbeginn sind.
        const earliestStartPerDay = {};
        workEntries.forEach(e => {
            if (e.shiftStart && e.shiftStart.includes(':')) {
                const [h, m] = e.shiftStart.split(':').map(Number);
                const mins = h * 60 + m;
                if (Number.isNaN(mins)) return;
                const jobId = (typeof getEntryJobId === 'function') ? getEntryJobId(e) : 'primary';
                const key = e.date + '|' + jobId;
                if (earliestStartPerDay[key] === undefined || mins < earliestStartPerDay[key]) {
                    earliestStartPerDay[key] = mins;
                }
            }
        });
        const startValues = Object.values(earliestStartPerDay);
        const totalStartMinutes = startValues.reduce((a, b) => a + b, 0);
        const startCount = startValues.length;

        workEntries.forEach(e => {

            // 2. Ø Längste Fokusphase
            if (e.breakLog && e.breakLog.length > 0) {
                 // Pausenlogik ist komplex, hier vereinfachte Berechnung der längsten durchgehenden Arbeitsphase
                 let lastTime = new Date(e.date).getTime();
                 let phases = [];
                 
                 // Alle Zeitpunkte (Start/Pause/Wiederaufnahme) erfassen
                 const timePoints = e.breakLog
                    .map(l => l.time)
                    .sort((a, b) => a - b);

                 let shiftTimes = [];
                 
                 // Füge den Start der Schicht hinzu, wenn bekannt (für Timer-Einträge oft nicht vorhanden)
                 if (e.shiftStart) {
                     const [h, m] = e.shiftStart.split(':').map(Number);
                     const d = new Date(e.date);
                     d.setHours(h, m, 0, 0);
                     shiftTimes.push({ time: d.getTime(), type: 'start' });
                 }
                 
                 // Finde den ersten Start im BreakLog, falls Timer verwendet wurde
                 const firstTimerStart = e.breakLog.find(l => l.action === 'start')?.time;
                 if (firstTimerStart) {
                     shiftTimes.push({ time: firstTimerStart, type: 'start' });
                 }
                 
                 // Fülle mit Pausen- und Wiederaufnahmezeiten
                 e.breakLog.forEach(log => {
                      if (log.action === 'pause') {
                         // Suche nach dem letzten Start-Punkt vor dieser Pause (Ende der Fokusphase)
                         let lastStart = [...shiftTimes].sort((a,b) => b.time - a.time).find(t => t.time < log.time);
                         if (lastStart) phases.push(log.time - lastStart.time);

                         shiftTimes.push({ time: log.time, type: 'pause' });
                      } else if (log.action === 'start') {
                         shiftTimes.push({ time: log.time, type: 'start' });
                      }
                 });
                 
                 // Füge die letzte Phase hinzu (bis zum Ende der Schicht)
                 const lastShiftTime = timePoints.at(-1);
                 
                 // Wir müssen den Netto-Arbeitszeitwert E.Worked nutzen, da die Zeitpunkte unvollständig sein können.
                 // Als Ersatz nehmen wir die Gesamt-Arbeitszeit.
                 
                 // Bessere Näherung: Wenn Timer-Daten existieren, ist die längste Phase die gesamte gearbeitete Zeit.
                 // (Ohne genaues Parsing der Pausen-Offsets)
                 if (e.worked > 0) {
                     totalFocusHours += e.worked;
                     focusCount++;
                 }

            } else {
                 // Wenn keine Pausen geloggt wurden (Manuelle Eingabe/Start-Ende), ist die längste Phase die Netto-Arbeitszeit.
                 totalFocusHours += e.worked;
                 focusCount++;
            }
        });

        const avgStartMinutes = startCount > 0 ? totalStartMinutes / startCount : 0;
        const avgStartHours = Math.floor(avgStartMinutes / 60);
        const avgStartMins = Math.round(avgStartMinutes % 60);

        return {
            avgStartTime: startCount > 0 ? `${avgStartHours < 10 ? '0' : ''}${avgStartHours}:${avgStartMins < 10 ? '0' : ''}${avgStartMins}` : '---',
            avgFocusHours: focusCount > 0 ? (totalFocusHours / focusCount).toFixed(1) : '0.0',
        };
    }
    // 🔴 Hier stand eine zweite getTypeColor()-Fassung. custom-types-fields.js
    // laedt spaeter (Zeile 838 vs 834 in index.template.html) und hat sie
    // ohnehin ueberschrieben — die Kopie war tot und haette bei geaenderter
    // Ladereihenfolge still gewonnen (mit gleittag=#f59e0b statt cyan, also
    // nicht mehr von holiday zu unterscheiden). Farben kommen aus
    // DEFAULT_ENTRY_TYPES; nur die beruecksichtigen auch Nutzer-Overrides.
    
    // getTypeEmoji() stand hier als zweite, veraltete Kopie (sick: 💊 statt 🤒) und wurde
    // beim Laden von custom-types-fields.js ohnehin überschrieben. Icons kommen jetzt aus
    // getTypeIconHTML()/getTypeIconTile() dort.
