// ═══ CORE: STORAGE-SAVE ═══
    function cleanupLocalStorage() {
        // Lösche alte tt_export_reminder_shown_* Keys - behalte nur den heutigen
        const today = new Date().toISOString().split('T')[0];
        const currentKey = 'tt_export_reminder_shown_' + today;
        
        let deletedCount = 0;
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tt_export_reminder_shown_') && key !== currentKey) {
                localStorage.removeItem(key);
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} alte Export-Reminder Keys`);
        }
    }

    function save() { 
        // Cleanup alte LocalStorage Keys
        try {
            cleanupLocalStorage();
        } catch (e) {
            console.warn('⚠️ LocalStorage Cleanup fehlgeschlagen:', e);
        }

        try {
            // Backup snapshot (keep last 10) - lightweight safety net for debugging
            const backupsStr = localStorage.getItem('tg_pro_data_backups');
            const backups = backupsStr ? JSON.parse(backupsStr) : [];
            const snapshot = { ts: Date.now(), data: JSON.parse(JSON.stringify(data)) };
            backups.push(snapshot);
            while (backups.length > 10) backups.shift();
            localStorage.setItem('tg_pro_data_backups', JSON.stringify(backups));
        } catch (e) {
            console.warn('⚠️ Backup snapshot failed:', e);
        }

        localStorage.setItem('tg_pro_data', JSON.stringify(data)); 
        localStorage.setItem('tg_last_save', Date.now());
        checkAlertsThresholds();
        checkOvertimeAlert();
        updateUI(); 
    }

    function checkOvertimeAlert() {
        const workEntries = data.entries.filter(e => e.type === 'work' && e.worked > 0);
        const thisWeek = workEntries.filter(e => {
            const entryDate = new Date(e.date);
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
            return entryDate >= weekStart;
        });
        const totalHours = thisWeek.reduce((sum, e) => sum + e.worked, 0);
        const overtimeThreshold = data.settings.overtimeAlert || 40; // Default 40h

        if (totalHours >= overtimeThreshold) {
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('⚠️ Überstunden-Alarm', {
                    body: `Du hast diese Woche bereits ${totalHours.toFixed(1)}h gearbeitet. Überstunden-Threshold: ${overtimeThreshold}h`,
                    icon: '/favicon.ico'
                });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('⚠️ Überstunden-Alarm', {
                            body: `Du hast diese Woche bereits ${totalHours.toFixed(1)}h gearbeitet. Überstunden-Threshold: ${overtimeThreshold}h`,
                            icon: '/favicon.ico'
                        });
                    }
                });
            }
            // Fallback: In-App Message
            showCustomMessage('⚠️ Überstunden', `Diese Woche: ${totalHours.toFixed(1)}h (Threshold: ${overtimeThreshold}h)`, 'warning');
        }
    }

    function checkAchievements() {
        const workEntries = data.entries.filter(e => e.type === 'work' && e.worked > 0);
        const totalHours = workEntries.reduce((sum, e) => sum + e.worked, 0);
        const achievements = data.achievements || [];

        const milestones = [10, 50, 100, 500, 1000];
        milestones.forEach(milestone => {
            if (totalHours >= milestone && !achievements.includes(`total_${milestone}`)) {
                achievements.push(`total_${milestone}`);
                showCustomMessage('🏆 Achievement!', `Du hast ${milestone} Arbeitsstunden erreicht!`, 'success');
            }
        });

        // Wöchentliche Meilensteine
        const thisWeek = workEntries.filter(e => {
            const entryDate = new Date(e.date);
            const now = new Date();
            const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
            return entryDate >= weekStart;
        });
        const weekHours = thisWeek.reduce((sum, e) => sum + e.worked, 0);
        if (weekHours >= 40 && !achievements.includes('week_40')) {
            achievements.push('week_40');
            showCustomMessage('🏆 Wöchentliches Achievement!', '40h in einer Woche gearbeitet!', 'success');
        }

    }
    