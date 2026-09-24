// ═══ SUPPORT MODULE ═══

    // "Dein Stand" liegt als Karte vor der Aufnahme im Kopf der Support-Seite.
    // Zeilen statt Kacheln, keine Farben je Zahl: die Werte sind Zustand, keine
    // Wertung. JS-Text erfasst die statische i18n-Pipeline nicht, daher spL().
    function renderSupportStats() {
        const grid = document.getElementById('supportStatsGrid');
        if (!grid) return;
        const isEN = document.documentElement.lang === 'en';
        const spL = (de, en) => isEN ? en : de;

        const entries = (typeof data !== 'undefined' && data && data.entries) || [];
        if (!entries.length) {
            grid.innerHTML = `<p class="sp-mine-empty">${spL(
                'Noch keine Einträge. Sobald du den ersten Tag erfasst, steht hier dein Stand.',
                'No entries yet. Once you log your first day, your numbers show up here.')}</p>`;
            return;
        }
        const totalHours = entries.filter(e => e.type === 'work').reduce((s, e) => s + (e.worked || 0), 0);
        const firstDate = entries.reduce((a, b) => a.date < b.date ? a : b).date;
        const p = String(firstDate).split('-');
        const daysSinceFirst = Math.max(0, Math.floor((Date.now() - new Date(+p[0], +p[1] - 1, +p[2]).getTime()) / 86400000));
        const streak = typeof calculateCurrentStreak === 'function' ? calculateCurrentStreak() : 0;
        const nf = new Intl.NumberFormat(isEN ? 'en-GB' : 'de-DE');

        const rows = [
            [spL('Einträge', 'Entries'), nf.format(entries.length)],
            [spL('Stunden gearbeitet', 'Hours worked'), nf.format(Math.round(totalHours)) + ' h'],
            [spL('Tage seit dem ersten Eintrag', 'Days since first entry'), nf.format(daysSinceFirst)],
            [spL('Aktuelle Serie', 'Current streak'), nf.format(streak) + ' ' + spL(streak === 1 ? 'Tag' : 'Tage', streak === 1 ? 'day' : 'days')],
        ];
        grid.innerHTML = rows.map(([k, v]) =>
            `<div class="sp-mine-row"><span class="sp-mine-key">${k}</span><span class="sp-mine-val">${v}</span></div>`
        ).join('');
    }

    // Die gewaehlte Bewertung bleibt sichtbar markiert (data.supportRating
    // schreibt supportRate() in support-feedback.js).
    function supportMarkRating() {
        const r = (typeof data !== 'undefined' && data) ? data.supportRating : null;
        document.querySelectorAll('#view-support .sp-rate-btn').forEach(btn => {
            const m = (btn.getAttribute('onclick') || '').match(/supportRate\((\d)\)/);
            const on = !!m && +m[1] === r;
            btn.classList.toggle('is-picked', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }
