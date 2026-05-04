// ═══ ANALYTICS-PRO MODULE ═══

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

