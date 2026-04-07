// ═══ PROGNOSE MODULE ═══

    function renderPrognoseView() {
        const calendarEl = document.getElementById('prognoseCalendar');
        const startSaldoEl = document.getElementById('prognoseStartSaldo');
        const endSaldoEl = document.getElementById('prognoseEndSaldo');
        const deltaEl = document.getElementById('prognoseDelta');
        
        // 1. Aktuellen Saldo bestimmen
        const currentTotalSaldo = data.entries.reduce((sum, e) => sum + e.diff, 0);
        startSaldoEl.innerText = (currentTotalSaldo >= 0 ? '+' : '') + currentTotalSaldo.toFixed(2) + 'h';
        startSaldoEl.style.color = currentTotalSaldo >= 0 ? '#06b6d4' : 'var(--danger)';
        
        // 2. Kalender-Daten für die nächsten 4 Wochen generieren
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let currentDay = new Date(today);
        let calendarHTML = '';
        
        let simulationPlan = JSON.parse(JSON.stringify(data.settings.prognosePlan));
        const DAYS_TO_PLAN = 28;
        let cumulativeSaldo = currentTotalSaldo;
        const saldoHistory = {};
        
        // Wochenheader
        const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        const weekColors = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#64748b'];
        
        calendarHTML += '<div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:10px; margin-bottom:20px; padding-bottom:15px; border-bottom: 2px solid var(--border);">';
        weekDays.forEach((day, i) => {
            calendarHTML += `<div style="text-align:center; font-weight:700; color:${weekColors[i]}; font-size:0.9rem; text-transform:uppercase; letter-spacing:0.5px;">${day}</div>`;
        });
        calendarHTML += '</div>';
        
        let dayCounter = 0;
        let weekCounter = 0;

        for (let i = 0; i < DAYS_TO_PLAN; i++) {
            const dateKey = toLocalISODate(currentDay);
            const dayIndex = currentDay.getDay(); // 0=So, 1=Mo
            const isToday = currentDay.toDateString() === today.toDateString();
            const dayOfWeek = dayIndex === 0 ? 6 : dayIndex - 1; // 0=Mo, 6=So
            
            // Soll-Stunden und Planungstyp
            const expectedHours = data.settings.hours[dayIndex] || 0;
            const planType = simulationPlan[dateKey] || (expectedHours > 0 ? 'work' : 'holiday');

            cumulativeSaldo += 0; // Saldo ändert sich nicht in der Prognose
            saldoHistory[dateKey] = cumulativeSaldo;

            const typeClass = `type-${planType}`;
            const todayClass = isToday ? 'today' : '';
            const saldoColor = cumulativeSaldo >= 0 ? 'var(--success)' : 'var(--danger)';
            const dayNumber = currentDay.getDate();
            const dayName = weekDays[dayOfWeek];
            const dayLetter = dayName[0];

            // Modern Card Design mit Hover-Effekt
            calendarHTML += `
                <div class="prognose-day ${typeClass} ${todayClass}" 
                     data-date="${dateKey}" 
                     onclick="updatePrognoseDay('${dateKey}')"
                     style="position:relative; background:linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); border:2px solid rgba(255,255,255,0.1); border-radius:14px; padding:16px; cursor:pointer; transition:all 0.3s ease; min-height:100px; display:flex; flex-direction:column; justify-content:space-between; ${isToday ? 'border-color: var(--primary); background: linear-gradient(135deg, rgba(var(--primary-rgb),0.2) 0%, rgba(var(--primary-rgb),0.05) 100%);' : ''}"
                     onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 24px rgba(0,0,0,0.3)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-size:2rem; font-weight:800; color:${weekColors[dayOfWeek]}; line-height:1;">${dayNumber}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-top:2px;">${dayName}</div>
                        </div>
                        <div style="background:${getTypeColor(planType)}; padding:6px 12px; border-radius:8px; font-size:0.7rem; font-weight:700; text-transform:uppercase; color:#fff; letter-spacing:0.5px;">${getTypeEmoji(planType)}</div>
                    </div>
                    
                    <div style="margin-top:auto;">
                        <div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:6px;">
                            Soll: <span style="color:#fff; font-weight:600;">${expectedHours > 0 ? expectedHours.toFixed(1) : '0.0'}h</span>
                        </div>
                        <div style="font-size:1.1rem; font-weight:700; color:${saldoColor};">
                            ${cumulativeSaldo >= 0 ? '+' : ''}${cumulativeSaldo.toFixed(1)}h
                        </div>
                    </div>
                    
                    ${isToday ? '<div style="position:absolute; top:8px; right:8px; width:12px; height:12px; background:var(--primary); border-radius:50%; box-shadow:0 0 8px var(--primary);"></div>' : ''}
                </div>
            `;
            
            currentDay.setDate(currentDay.getDate() + 1);
        }

        calendarEl.innerHTML = calendarHTML;
        
        // 3. End-Saldo und Delta anzeigen
        endSaldoEl.innerText = (cumulativeSaldo >= 0 ? '+' : '') + cumulativeSaldo.toFixed(2) + 'h';
        endSaldoEl.style.color = cumulativeSaldo >= 0 ? 'var(--success)' : 'var(--danger)';
        
        const delta = cumulativeSaldo - currentTotalSaldo;
        deltaEl.innerText = (delta >= 0 ? '+' : '') + delta.toFixed(2) + 'h';
        deltaEl.style.color = delta >= 0 ? 'var(--success)' : 'var(--danger)';
        
        // 4. Statistiken rendern
        updatePrognoseStats(simulationPlan, currentTotalSaldo, cumulativeSaldo);

        // 5. Mood Overview rendern
        renderMoodOverview();
    }

