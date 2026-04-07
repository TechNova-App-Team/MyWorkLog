(function initAutoCamouflage() {
        const camoDisguises = [
            { title: 'Stack Overflow - How to center a div vertically', icon: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico' },
            { title: 'Jira - PROJ-9482 Backend Migration', icon: 'https://jira.atlassian.com/favicon.ico' },
            { title: 'GitHub - Pull Request #347 Review', icon: 'https://github.githubassets.com/favicons/favicon-dark.png' },
            { title: 'Outlook - Posteingang (3)', icon: 'https://res.cdn.office.net/assets/mail/pwa/v1/pngs/favicon.ico' },
            { title: 'Microsoft Teams', icon: 'https://statics.teams.cdn.office.net/hasheddeployments/favicon/favicon-teams.ico' },
            { title: 'Confluence - Dokumentation Projekt X', icon: 'https://wac-cdn.atlassian.com/assets/img/favicons/confluence/favicon.png' },
        ];

        let realTitle = '';
        let realIcons = [];
        let camoActive = false;
        let currentDisguise = null;

        function isCamoEnabled() {
            try {
                const d = JSON.parse(localStorage.getItem('tg_pro_data') || '{}');
                return !!(d.settings && d.settings.tabCamo);
            } catch(e) { return false; }
        }

        function saveOriginalIcons() {
            realIcons = [];
            document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => {
                realIcons.push({ rel: el.rel, type: el.type, href: el.href, sizes: el.sizes?.value || '' });
            });
        }

        function setFavicon(url) {
            // Remove ALL existing icon links
            document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove());
            // Create a single fresh link element
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = url;
            document.head.appendChild(link);
        }

        function restoreOriginalIcons() {
            document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(el => el.remove());
            realIcons.forEach(ico => {
                const link = document.createElement('link');
                link.rel = ico.rel;
                if (ico.type) link.type = ico.type;
                link.href = ico.href;
                if (ico.sizes) link.sizes = ico.sizes;
                document.head.appendChild(link);
            });
        }

        function activateCamo() {
            if (camoActive) return;
            if (!isCamoEnabled()) return;
            // Don't camouflage during ghost mode — it already has its own title
            const ghostExcel = document.getElementById('ghostModeOverlay');
            const ghostVSC = document.getElementById('ghostModeVSCode');
            if ((ghostExcel && ghostExcel.classList.contains('active')) ||
                (ghostVSC && ghostVSC.classList.contains('active'))) return;

            realTitle = document.title;
            saveOriginalIcons();
            currentDisguise = camoDisguises[Math.floor(Math.random() * camoDisguises.length)];
            document.title = currentDisguise.title;
            setFavicon(currentDisguise.icon);
            camoActive = true;
        }

        function deactivateCamo() {
            if (!camoActive) return;
            document.title = realTitle;
            restoreOriginalIcons();
            camoActive = false;
            currentDisguise = null;
        }

        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                activateCamo();
            } else {
                deactivateCamo();
            }
        });

        // Expose for settings toggle
        window.updateCamoState = function() {
            // If disabled while active, revert immediately
            if (!isCamoEnabled() && camoActive) deactivateCamo();
        };
    })();