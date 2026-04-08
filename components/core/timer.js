// ═══ CORE: TIMER ═══
    // --- LOGIC (handleEntry remains unchanged for core functionality) ---
    function calculateProjectDistribution() {
        const projectHours = {};
        let totalWorkHours = 0;

        data.entries.forEach(e => {
            if (e.type === 'work' && e.worked > 0) {
                const projectName = e.project || 'Unbekannt'; 
                
                if (projectName !== 'Manuell' && projectName !== '') {
                     projectHours[projectName] = (projectHours[projectName] || 0) + e.worked;
                     totalWorkHours += e.worked;
                }
            }
        });

        // Sortieren und Top 5 behalten (Rest als 'Sonstige')
        const sortedProjects = Object.entries(projectHours)
            .sort(([, a], [, b]) => b - a);

        let topProjects = sortedProjects.slice(0, 5);
        let otherHours = sortedProjects.slice(5).reduce((sum, [, hours]) => sum + hours, 0);

        const distribution = topProjects.map(([name, hours]) => ({ name, hours }));

        if (otherHours > 0) {
            distribution.push({ name: 'Sonstige Projekte', hours: otherHours });
        }
        
        return { distribution, totalWorkHours };
    }
    // --- TIMER LOGIC (Mit Korrektur) ---
    
    function logTimerAction(action, time = Date.now()) {
        const lastAction = timer.log.at(-1);
        
        const today = new Date().toISOString().split('T')[0];
        
        // Pausenzeit messen
        if (action === 'start' && lastAction && lastAction.action === 'pause') {
            // Pause beendet: Zeit seit letzter Pause-Aktion messen
            timer.breakTime += time - lastAction.time;
        }

        if (action === 'start') {
            if (timer.running && lastAction && lastAction.action === 'start') return;
            timer.log.push({ action: 'start', time, date: today });
        } else if (action === 'pause') {
            // Pausen-Aktion speichert nur den Startpunkt der Pause
            timer.log.push({ action: 'pause', time, date: today });
        } else if (action === 'stop') {
            // Wenn gestoppt wird, während der Timer läuft, muss die Zeit bis jetzt noch zu paused addiert werden
            if (timer.running) {
                timer.paused += time - timer.start;
            }
            
            // Wenn gestoppt wird, während Pause aktiv ist, muss die Pausenzeit noch gemessen werden
            if (lastAction && lastAction.action === 'pause') {
                timer.breakTime += time - lastAction.time;
            }

            timer.log.push({ action: 'stop', time, date: today });
            timer.log = []; // Log leeren nach Stop
        }
        
        saveTimerState();
        renderTimerLogBar();
    }
    function timerRun() {
        if (!timer.running) return;
        requestAnimationFrame(timerRun);
        
        const now = Date.now();
        const rawRunningTimeMs = now - timer.start;
        const totalWorkedMs_raw = rawRunningTimeMs + timer.paused;
        
        // Netto-Arbeitszeit anzeigen
        const totalWorkedMs_netto = totalWorkedMs_raw - timer.breakTime;
        
        displayTimerTime(totalWorkedMs_netto);
        renderTimerLogBar();
    }
    
    function displayTimerTime(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        document.getElementById('timerDisplay').innerText = `${h<10?'0'+h:h}:${m<10?'0'+m:m}:${s<10?'0'+s:s}`;
    }
    
    function renderTimerLogBar() {
        const logBar = document.getElementById('timerLogBar');
        const statusEl = document.getElementById('timerStatus');
        logBar.innerHTML = '';
        
        // Sicherheitscheck: Falls timer.log undefined ist
        if (!timer.log) {
            statusEl.innerText = 'STOP';
            statusEl.classList.remove('running', 'paused', 'max');
            return;
        }
        
        // Filtere Log, um nur Start/Pause zu behalten (Stop ist der Endpunkt)
        const relevantLog = timer.log.filter(l => l.action !== 'stop');
        
        if (relevantLog.length === 0 && !timer.running) {
            statusEl.innerText = 'STOP';
            statusEl.classList.remove('running', 'paused', 'max');
            return;
        }

        const firstStart = relevantLog.find(l => l.action === 'start')?.time || timer.start || Date.now();
        const totalTimeMs = (timer.running ? Date.now() : relevantLog.at(-1)?.time || firstStart) - firstStart;
        
        if (totalTimeMs <= 0) return;

        let cumulativeTime = 0;
        let lastTime = firstStart;
        let breakMsTotal = 0;
        
        // Status-Anzeige (Berücksichtigt die Gesamt-Pause)
        const totalWorkedHours = (timer.paused + (timer.running ? Date.now() - timer.start : 0)) / 3.6e6;
        const minBreakRequired = data.settings.break.min / 60;
        const netTimeAfterBreak = totalWorkedHours - (timer.breakTime / 3.6e6);
        const requiredBreak = totalWorkedHours >= data.settings.break.thresh ? minBreakRequired : 0;
        const breakDeficit = Math.max(0, requiredBreak - (timer.breakTime / 3.6e6));

        if (timer.running) {
             statusEl.innerText = 'LÄUFT';
             statusEl.classList.add('running');
             statusEl.classList.remove('paused');
             if (breakDeficit > 0.1) statusEl.innerText = `LÄUFT (PAUSEN-DEFIZIT)`;
        } else {
             statusEl.innerText = 'PAUSIERT';
             statusEl.classList.add('paused');
             statusEl.classList.remove('running');
        }

        for (let i = 0; i < relevantLog.length; i++) {
            const logEntry = relevantLog[i];
            const nextEntry = relevantLog[i + 1];

            if (logEntry.action === 'start') {
                const segmentEnd = nextEntry ? nextEntry.time : (timer.running ? Date.now() : logEntry.time);
                const segmentDuration = segmentEnd - lastTime;
                
                if (segmentDuration > 0) {
                    const widthPercent = (segmentDuration / totalTimeMs) * 100;
                    const leftPercent = (cumulativeTime / totalTimeMs) * 100;
                    
                    const runningSegment = document.createElement('div');
                    runningSegment.className = 'timer-log-segment';
                    runningSegment.style.background = 'var(--primary)';
                    runningSegment.style.width = `${widthPercent}%`;
                    runningSegment.style.left = `${leftPercent}%`;
                    logBar.appendChild(runningSegment);
                    
                    cumulativeTime += segmentDuration;
                }
                lastTime = segmentEnd;

            } else if (logEntry.action === 'pause') {
                const segmentEnd = nextEntry ? nextEntry.time : (timer.running ? Date.now() : logEntry.time); // Bis zum nächsten Start oder jetzt
                const segmentDuration = segmentEnd - logEntry.time; // Dauer der Pause selbst
                
                if (segmentDuration > 0) {
                    const widthPercent = (segmentDuration / totalTimeMs) * 100;
                    const leftPercent = (logEntry.time - firstStart) / totalTimeMs * 100; // Startpunkt der Pause
                    
                    const pauseSegment = document.createElement('div');
                    pauseSegment.className = 'timer-log-segment';
                    pauseSegment.style.background = 'var(--audit-warn)';
                    pauseSegment.style.width = `${widthPercent}%`;
                    pauseSegment.style.left = `${leftPercent}%`;
                    logBar.appendChild(pauseSegment);
                    
                    cumulativeTime += segmentDuration;
                }
                lastTime = segmentEnd;
            }
        }
    }

