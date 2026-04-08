// ═══ CORE: PROGNOSE ═══
    function updatePrognoseStats(plan, startSaldo, endSaldo) {
        const statsEl = document.getElementById('prognoseStats');
        let vacationDays = 0;
        let sickDays = 0;
        let schoolDays = 0;
        let workDays = 0;
        let gleittagDays = 0;

        for (const date in plan) {
            if (plan[date] === 'vacation') vacationDays++;
            else if (plan[date] === 'gleittag') gleittagDays++;
            else if (plan[date] === 'sick') sickDays++;
            else if (plan[date] === 'school') schoolDays++;
            else if (plan[date] === 'work') workDays++;
        }

        const html = `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--primary);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Arbeitstage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#fff; margin-top:4px;">${workDays}</div>
                </div>
                <div style="font-size:1.5rem;">💼</div>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--success);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Urlaubstage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--success); margin-top:4px;">${vacationDays}</div>
                </div>
                <div style="font-size:1.5rem;">🌴</div>
            </div>
            ${gleittagDays > 0 ? `<div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid #f59e0b;">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Gleittage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:#f59e0b; margin-top:4px;">${gleittagDays}</div>
                </div>
                <div style="font-size:1.5rem;">⚡</div>
            </div>` : ''}
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--danger);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Kranktage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--danger); margin-top:4px;">${sickDays}</div>
                </div>
                <div style="font-size:1.5rem;">💊</div>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:rgba(255,255,255,0.03); border-radius:10px; border-left:4px solid var(--school);">
                <div>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Geplante Schultage</div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--school); margin-top:4px;">${schoolDays}</div>
                </div>
                <div style="font-size:1.5rem;">📚</div>
            </div>
        `;
        statsEl.innerHTML = html;
    }
    
    function highlightSelectAction() {
        const select = document.getElementById('prognosePlanSelect');
        if (select.value) {
            select.style.background = getTypeColor(select.value) + '33';
            select.style.borderColor = getTypeColor(select.value);
        }
    }
    
    function resetPrognosePlan() {
        showCustomConfirm(
            '↺ Planung zurücksetzen?',
            'Alle Änderungen im Planungs-Kalender werden verworfen.',
            () => {
                data.settings.prognosePlan = {};
                document.getElementById('prognosePlanSelect').value = '';
                renderPrognoseView();
            },
            null
        );
    }

    // Funktion zum Aktualisieren eines Tages im Prognose-Plan
    function updatePrognoseDay(dateKey) {
        const planType = document.getElementById('prognosePlanSelect').value;
        
        if (!planType || planType === 'reset') {
            delete data.settings.prognosePlan[dateKey];
        } else {
            data.settings.prognosePlan[dateKey] = planType;
        }

        renderPrognoseView();
    }
    
    // Plan auf die tatsächlichen Entries anwenden
    function applyPrognosePlan() {
        uEvent('prognose-plan-apply');
        const planCount = Object.keys(data.settings.prognosePlan).length;
        
        if (planCount === 0) {
            return showCustomMessage('ℹ️ Kein Plan', 'Du hast noch keine Änderungen im Planungs-Kalender vorgenommen. Klicke auf Tage, um sie zu planen.', 'info');
        }
        
        showCustomConfirm(
            '🔮 Prognose-Plan anwenden?',
            `${planCount} Tage aus deinem Plan werden als echte Einträge gebucht:\n\n⚠️ Bestehende Einträge in diesem Zeitraum werden überschrieben.\n\n💡 Arbeitstage werden NICHT gebucht (nur Urlaub/Krank/Schule).`,
            () => {
                let bookedCount = 0;
                let overwriteCount = 0;
                const now = new Date();
                now.setHours(0, 0, 0, 0);

                for (const dateKey in data.settings.prognosePlan) {
                    const planType = data.settings.prognosePlan[dateKey];
                    const dateObj = new Date(dateKey);

                    // Nur für zukünftige Tage anwenden
                    if (dateObj.getTime() >= now.getTime()) {
                        
                        // Nur Freistellungs-Typen buchen
                        if (planType !== 'work' && planType !== 'reset') {
                            
                            const dayIndex = dateObj.getDay();
                            const expected = data.settings.hours[dayIndex] || 0;
                            
                            // Bestehenden Eintrag löschen, wenn vorhanden
                            const existingIndex = data.entries.findIndex(e => e.date === dateKey);
                            if (existingIndex >= 0) {
                                data.entries.splice(existingIndex, 1);
                                overwriteCount++;
                            }

                            if (expected > 0) {
                                data.entries.push({
                                    id: Date.now() + Math.random(),
                                    date: dateKey,
                                    type: planType,
                                    worked: expected,
                                    expected: expected,
                                    diff: 0,
                                    info: `📅 Prognose-Plan: ${planType.charAt(0).toUpperCase() + planType.slice(1)}`,
                                    isPeriod: true,
                                    breakMins: 0, shiftEnd: '', shiftWarning: false, project: '', breakLog: []
                                });
                                bookedCount++;
                            }
                        }
                    }
                }

                data.settings.prognosePlan = {}; // Plan zurücksetzen
                recalculateVacationUsed();
                data.entries.sort((a,b) => new Date(b.date) - new Date(a.date));
                save();
                
                showCustomMessage(
                    '✅ Plan gebucht!', 
                    `${bookedCount} Tage wurden als Einträge gebucht${overwriteCount > 0 ? ` (${overwriteCount} bestehende Einträge überschrieben)` : ''}.\n\nDein Saldo und die Statistiken wurden aktualisiert.`,
                    'success'
                );
                
                renderPrognoseView();
                updateUI();
                
                if (document.getElementById('view-history').classList.contains('active')) {
                    renderHistoryView();
                }
            },
            null
        );
    }
    
    function downloadPrognoseReport() {
        const startSaldo = data.entries.reduce((sum, e) => sum + e.diff, 0);
        let reportContent = `PROGNOSE-BERICHT
=====================================
Erstellt: ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}

AKTUELLER STATUS:
- Saldo heute: ${(startSaldo >= 0 ? '+' : '')}${startSaldo.toFixed(2)}h

GEPLANTE ÄNDERUNGEN:
`;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let vacationDays = 0, sickDays = 0, schoolDays = 0, workDays = 0;

        for (const date in data.settings.prognosePlan) {
            if (new Date(date) >= today) {
                const type = data.settings.prognosePlan[date];
                const typeLabel = {
                    'work': 'Arbeit',
                    'vacation': 'Urlaub',
                    'gleittag': 'Gleittag',
                    'sick': 'Krank',
                    'school': 'Schule',
                    'holiday': 'Feiertag'
                }[type] || 'Unbekannt';
                
                reportContent += `  ${date} (${new Date(date).toLocaleDateString('de-DE', {weekday:'short'})}): ${typeLabel}\n`;
                
                if (type === 'vacation') vacationDays++;
                else if (type === 'gleittag') { /* Gleittag: kein Urlaubstag */ }
                else if (type === 'sick') sickDays++;
                else if (type === 'school') schoolDays++;
                else if (type === 'work') workDays++;
            }
        }

        reportContent += `\nZUSAMMENFASSUNG:
- Geplante Arbeitstage: ${workDays}
- Geplante Urlaubstage: ${vacationDays}
- Geplante Kranktage: ${sickDays}
- Geplante Schultage: ${schoolDays}

HINWEIS:
Der Plan wird durch \"Plan anwenden\" als echte Einträge gebucht.
`;

        const blob = new Blob([reportContent], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `prognose_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        
        showCustomMessage('✅ Export gestartet', 'Prognose-Bericht wird heruntergeladen...', 'success');
    }
    
    function showPrognoseHelp() {
        showCustomMessage(
            '🔮 Prognose-Planer Hilfe',
            `ÜBERSICHT:
Mit dem Prognose-Planer kannst du deine Arbeitszeit für die nächsten 4 Wochen planen und die Auswirkung auf dein Gleitzeitkonto sehen.

VERWENDUNG:
1. Wähle einen Typ aus dem Dropdown (Arbeit, Urlaub, Krank, Schule)
2. Klicke auf die Tage, die du planen möchtest
3. Die Prognose aktualisiert sich automatisch
4. Klicke \"Plan anwenden\", um die Einträge zu buchen

FARBEN:
💼 Blau = Arbeit
🌴 Grün = Urlaub  
💊 Rot = Krank
📚 Orange = Berufsschule
🏖️ Gelb = Feiertag

TIPPS:
✓ Der Plan beeinflusst nicht deinen aktuellen Saldo
✓ Nur zukünftige Tage können geplant werden
✓ \"Zurücksetzen\" entfernt die Planung für einen Tag
✓ Die Statistiken zeigen deine geplanten Tage`,
            'info'
        );
    }
    
