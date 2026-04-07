// ═══ GOALS MODULE ═══

    function renderGoalsView() {
        const goalsListEl = document.getElementById('goalsList');
        const totalWorked = calculateGoalValue('TOTAL_WORKED_HOURS');
        const totalDiff = calculateGoalValue('TOTAL_DIFF_HOURS');
        const positiveWeeks = calculateGoalValue('POSITIVE_WEEKS');

        // 1. KPI Übersicht rendern
        document.getElementById('goalKpiTotalDiff').innerText = (totalDiff >= 0 ? '+' : '') + totalDiff.toFixed(1) + 'h';
        document.getElementById('goalKpiTotalDiff').style.color = totalDiff >= 0 ? 'var(--success)' : 'var(--danger)';
        document.getElementById('goalKpiTotalWorked').innerText = totalWorked.toFixed(1) + 'h';
        document.getElementById('goalKpiPositiveWeeks').innerText = positiveWeeks;


        // 2. Ziel-Karten rendern
        let html = '';
        
        data.settings.goals.forEach(goal => {
            const current = calculateGoalValue(goal.type);
            const progress = Math.min((current / goal.target) * 100, 100);
            const achieved = progress >= 100;
            const color = getGoalColor(goal.type);
            const unit = getGoalUnit(goal.type);
            
            // Formatierung für Stunden/Saldo-Ziele
            let currentDisplay = current.toFixed(1);
            if (goal.type === 'TOTAL_DIFF_HOURS') {
                 currentDisplay = (current >= 0 ? '+' : '') + current.toFixed(1);
            }
            
            // Progress Ring Berechnung (Umfang 251.2 -> r=40, stroke 4)
            const circumference = 251.2;
            const radius = 40;
            const dashOffset = circumference - (progress / 100) * circumference;
            const offsetAchieved = achieved ? 0 : dashOffset;

            
            html += `
                <div class="goal-card ${achieved ? 'achieved' : ''}" style="border-left-color: ${color}; opacity: ${achieved ? 1 : 0.85};">
                    <button class="goal-delete-btn" onclick="deleteCustomGoal(${goal.id})">×</button>
                    
                    <div class="progress-ring-goal" style="position:relative;">
                         <svg width="60" height="60" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.05)"></circle>
                            <circle class="ring-val" cx="50" cy="50" r="${radius}" 
                                stroke="${color}" stroke-dasharray="${circumference}" 
                                stroke-dashoffset="${offsetAchieved}">
                            </circle>
                         </svg>
                         <div class="ring-center" style="transform: translate(-50%, -50%); position: absolute; top: 50%; left: 50%;">
                            <div style="font-size: 1rem; font-weight: 700; color: ${color};">${progress.toFixed(0)}%</div>
                         </div>
                    </div>

                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-status">
                        ${currentDisplay}${unit} / ${goal.target.toFixed(1)}${unit}
                    </div>
                    <div class="goal-status" style="color: ${achieved ? 'var(--success)' : color}; margin-top: 10px; font-weight: 600;">
                        ${achieved ? '✅ Ziel erreicht!' : 'Aktiv'}
                    </div>
                </div>
            `;
        });
        
        goalsListEl.innerHTML = html;
    }

    function getGoalColor(type) {
         switch (type) {
            case 'TOTAL_WORKED_HOURS': return 'var(--goal-work)';
            case 'TOTAL_DIFF_HOURS': return 'var(--goal-saldo)';
            case 'POSITIVE_WEEKS': return 'var(--goal-weeks)';
            case 'PERFECT_SHIFTS': return 'var(--goal-perfect)';
            default: return 'var(--primary)';
        }
    }

    function calculateGoalValue(type) {
        switch (type) {
            case 'TOTAL_WORKED_HOURS':
                return data.entries.reduce((sum, e) => sum + e.worked, 0);
            case 'TOTAL_DIFF_HOURS':
                 return data.entries.reduce((sum, e) => sum + e.diff, 0);
            case 'POSITIVE_WEEKS':
                 return calculatePositiveWeeks();
            case 'PERFECT_SHIFTS':
                 return data.entries.filter(e => e.type === 'work' && Math.abs(e.diff) < 0.1).length;
            default:
                return 0;
        }
    }

