
    async function applyQuickTemplate(index) {
        const t = window._quickTemplates[index];
        if (!t) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Check for duplicate
        const existing = (data.entries || []).find(e => e.date === todayStr && e.type === t.type);
        if (existing) {
            const weiter = await appConfirm('Eintrag doppelt anlegen?',
                `Für heute gibt es bereits einen Eintrag vom Typ „${t.type}". Ein zweiter wird zusätzlich gezählt.`,
                { confirmText: 'Trotzdem anlegen' });
            if (!weiter) return;
        }

        const expected = (data.settings && data.settings.hours) ? (data.settings.hours[now.getDay()] || 8) : 8;
        const entry = {
            id: Date.now(),
            date: todayStr,
            type: t.type,
            worked: t.hours,
            diff: t.hours - expected,
            info: `Schnelleintrag: ${t.label}`,
            start: '',
            end: '',
            project: '',
            notes: `Per 1-Klick Vorlage erstellt`
        };

        data.entries.unshift(entry);
        if (t.type === 'vacation') {
            recalculateVacationUsed();
        }

        showSmartNotification('⚡ Schnelleintrag', `${t.icon} ${t.label} (${t.hours}h) für heute gebucht!`, 'success');
        save();
    }
