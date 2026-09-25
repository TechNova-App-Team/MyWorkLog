// ═══ CORE: QUICK TEMPLATES ═══
// 1-Klick-Vorlagen fuer den heutigen Tag (Widget im Dashboard-Editor).
// Bis v7.5.4 hiess die Datei support-feedback.js und trug auch das
// Support-Formular; das liegt seit v7.5.5 in /Assets/js/support.js.
    function renderQuickTemplates() {
        const grid = document.getElementById('quickTemplatesGrid');
        if (!grid) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const dayIndex = now.getDay();
        const defaultHours = (data.settings && data.settings.hours) ? (data.settings.hours[dayIndex] || 8) : 8;

        // Check if today already has an entry
        const hasTodayEntry = (data.entries || []).some(e => e.date === todayStr);

        const templates = [
            { icon: '💼', label: 'Standard Tag', sub: `${defaultHours}h Arbeit`, type: 'work', hours: defaultHours },
            { icon: '📚', label: 'Schultag', sub: `${defaultHours}h Schule`, type: 'school', hours: defaultHours },
            { icon: '🌴', label: 'Urlaub', sub: `${defaultHours}h Urlaub`, type: 'vacation', hours: defaultHours },
            { icon: '💊', label: 'Krankentag', sub: `${defaultHours}h Krank`, type: 'sick', hours: defaultHours },
            { icon: '⏰', label: 'Halber Tag', sub: `${(defaultHours / 2).toFixed(1)}h`, type: 'work', hours: defaultHours / 2 },
            { icon: '🔄', label: 'Überstunden', sub: `${(defaultHours + 2)}h Arbeit`, type: 'work', hours: defaultHours + 2 }
        ];

        grid.innerHTML = templates.map((t, i) => `
            <button class="quick-tpl-btn" onclick="applyQuickTemplate(${i})" ${hasTodayEntry ? 'title="Heute ist bereits ein Eintrag vorhanden"' : ''}>
                <span class="quick-tpl-icon">${mwlIconFromEmoji(t.icon, 20)}</span>
                <span class="quick-tpl-label">${t.label}</span>
                <span class="quick-tpl-sub">${t.sub}</span>
            </button>
        `).join('');

        // Store templates for use
        window._quickTemplates = templates;
    }

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
