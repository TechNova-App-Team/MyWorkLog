// ═══ SUPPORT MODULE ═══

    function renderSupportStats() {
        const grid = document.getElementById('supportStatsGrid');
        if (!grid) return;

        const entries = data.entries || [];
        const totalEntries = entries.length;
        const workEntries = entries.filter(e => e.type === 'work');
        const totalHours = workEntries.reduce((s, e) => s + (e.worked || 0), 0);
        const firstEntry = entries.length > 0 ? entries.reduce((a, b) => a.date < b.date ? a : b) : null;
        const daysSinceFirst = firstEntry ? Math.floor((Date.now() - new Date(firstEntry.date).getTime()) / 86400000) : 0;
        const streakDays = calculateCurrentStreak();

        const stats = [
            { icon: '📝', label: 'Einträge', value: totalEntries, color: 'var(--primary)' },
            { icon: '⏱️', label: 'Stunden gesamt', value: totalHours.toFixed(0) + 'h', color: '#06b6d4' },
            { icon: '📆', label: 'Tage dabei', value: daysSinceFirst, color: 'var(--success)' },
            { icon: '🔥', label: 'Aktuelle Streak', value: streakDays + 'd', color: '#fbbf24' },
        ];

        grid.innerHTML = stats.map(s => `
            <div style="padding:1rem; background:rgba(255,255,255,0.02); border-radius:12px; border:1px solid rgba(255,255,255,0.05); text-align:center;">
                <div style="margin-bottom:4px; line-height:0;">${mwlIconFromEmoji(s.icon, 20)}</div>
                <div style="font-size:1.3rem; font-weight:800; color:${s.color}; font-family:var(--font-mono);">${s.value}</div>
                <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">${s.label}</div>
            </div>
        `).join('');
    }

