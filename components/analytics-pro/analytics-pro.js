// ═══ ANALYTICS-PRO MODULE ═══

    function apIcon(name) {
        const paths = {
            chart: '<path d="M4 19h16"/><path d="M8 15v4M12 11v8M16 7v12"/>',
            mood: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
            galaxy: '<ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-25 12 12)"/><circle cx="12" cy="12" r="1.5"/><path d="m18 5 .6-1.6L20 3l-1.4-.4L18 1l-.6 1.6L16 3l1.4.4L18 5Z"/>',
            building: '<path d="M4 21V5l8-2v18M12 21h8V9l-8-2"/><path d="M8 7v1M8 11v1M8 15v1M16 12v1M16 16v1"/>',
            rotate: '<path d="M20 11a8 8 0 0 0-14.8-4L3 10"/><path d="M3 5v5h5M4 13a8 8 0 0 0 14.8 4L21 14"/><path d="M21 19v-5h-5"/>'
        };
        return '<svg class="ap-inline-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.chart) + '</svg>';
    }

    function renderAnalyticsPro() {
        _loadChartJS(function() { apRenderOverview(); });
    }

    function apSwitchTab(tabId) {
        document.querySelectorAll('.ap-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ap-panel').forEach(p => p.classList.remove('active'));
        const tab = document.querySelector('.ap-tab[data-ap-tab="' + tabId + '"]');
        const panel = document.getElementById('apPanel-' + tabId);
        if (tab) {
            tab.classList.add('active');
            tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        if (panel) panel.classList.add('active');
        apRenderPanel(tabId);
    }
