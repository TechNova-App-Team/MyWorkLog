// ═══ CORE: ONBOARDING-TOUR ═══
    // === PROFESSIONAL STEP-BY-STEP TOUR ===
    
    let onboardingStep = 0;
    let onboardingActive = false;
    let tourTouchStart = null;
    let _tourRenderNr = 0;
    let _tourResizeHandler = null;

    function _isMobile() { return window.innerWidth < 1024; }

    // Helper to resolve icon to SVG if mwlIcon is available
    function _renderTourIcon(icon) {
        if (!icon) return '';
        if (typeof icon === 'string' && icon.indexOf('<svg') !== -1) return icon;
        if (typeof mwlIcon === 'function') return mwlIcon(icon, 22);
        return icon;
    }

    // Jeder Schritt traegt seine englische Fassung selbst (en: [Titel, Text]):
    // die Tour wird per innerHTML gebaut, das statische i18n sieht sie nie, und
    // ganze Saetze im MAP von i18n-runtime.js brechen bei jedem Umformulieren.
    // Bis v8.3.1 lief die Tour auf /en/ komplett deutsch.
    // Texte beschreiben nur, was die Ansicht WIRKLICH zeigt — die alten versprachen
    // Gruen/Rot-Heatmap, KI-Insights, Badges und einen Compliance-Check, die es
    // dort laengst nicht mehr gab.
    const desktopSteps = [
        {
            icon: 'sparkles',
            title: 'Willkommen bei MyWorkLog',
            text: 'Diese Tour führt dich Schritt für Schritt durch die App. Du lernst alle wichtigen Bereiche und Funktionen kennen.',
            en: ['Welcome to MyWorkLog', 'This tour walks you through the app step by step. You will get to know all the important areas and features.'],
            target: null,
            tab: null,
            position: 'center'
        },
        {
            icon: 'barChart',
            title: 'Dein Dashboard',
            text: 'Oben stehen deine Woche mit Ist und Soll und die Gleitzeit mit ihrem Verlauf. Über das Regler-Symbol oben rechts sortierst du die Module, stellst ihre Breite ein oder blendest sie aus.',
            en: ['Your dashboard', 'At the top you see your week with actual and target hours, and your flexitime with its trend. The sliders icon at the top right lets you reorder modules, set their width or hide them.'],
            target: '.dn-hero',
            tab: 'dashboard',
            position: 'bottom'
        },
        {
            icon: 'trendingUp',
            title: 'Deine Woche',
            text: 'Jeder Tag ist ein Punkt auf der Linie, darunter steht, was du eingetragen hast. Fehlt ein Tag, siehst du es hier zuerst.',
            en: ['Your week', 'Each day is a point on the line, with what you logged underneath. If a day is missing, this is where you notice it first.'],
            target: '.dn-week',
            tab: 'dashboard',
            position: 'top'
        },
        {
            icon: 'filePen',
            title: 'Eintrag erfassen',
            text: '„Eintrag schreiben“ öffnet das Formular mit allen Feldern, die Stempeluhr startet hier mit einem Klick. Entwürfe werden automatisch gespeichert.',
            en: ['Log an entry', '“Write entry” opens the form with all fields, and the time clock starts here with one click. Drafts are saved automatically.'],
            target: '.dn-today',
            tab: 'dashboard',
            position: 'top'
        },
        {
            icon: 'gauge',
            title: 'Bilanz',
            text: 'Was in einem Zeitraum herauskam: Saldo, Soll und Ist, dein Arbeitsrhythmus, Urlaub und die Prüfung nach Arbeitszeitgesetz. Heatmaps und Projekte stehen unter „Diagramme“.',
            en: ['Summary', 'What a period added up to: balance, target and actual hours, your work rhythm, vacation and the check against the German Working Hours Act. Heatmaps and projects are under “Charts”.'],
            target: '#view-performance',
            tab: 'performance',
            position: 'bottom'
        },
        {
            icon: 'calendarDays',
            title: 'Jahresübersicht',
            text: 'Das ganze Jahr auf einen Blick: jeder Tag ein Feld, darunter die zwölf Monate, dein Jahreskonto und was aus den Zahlen hervorsticht.',
            en: ['Year overview', 'The whole year at a glance: one square per day, then the twelve months, your yearly account and what stands out in the numbers.'],
            target: '#view-yearview',
            tab: 'yearview',
            position: 'bottom'
        },
        {
            icon: 'graduationCap',
            title: 'IHK & Ausbildung',
            text: 'Deine Ausbildung im Überblick: Verlauf, Prüfungszulassung, Fehlzeiten, Zeitverteilung und Prüfungsnoten.',
            en: ['Chamber & training', 'Your apprenticeship at a glance: progress, exam admission, absences, time split and exam grades.'],
            target: '#view-ihk',
            tab: 'ihk',
            position: 'bottom'
        },
        {
            icon: 'award',
            title: 'Ziele',
            text: 'Setze dir eigene Ziele, zum Beispiel ein Stundenpolster. Darunter siehst du, welche Meilensteine du schon erreicht hast.',
            en: ['Goals', 'Set your own goals, for example a buffer of extra hours. Below you see which milestones you have already reached.'],
            target: '#view-goals',
            tab: 'goals',
            position: 'bottom'
        },
        {
            icon: 'history',
            title: 'Daten & Historie',
            text: 'Alle deine Einträge — filterbar nach Zeitraum und Typ. Exportiere als CSV oder JSON für Excel, Audits oder Backups.',
            en: ['Data & history', 'All your entries, filterable by period and type. Export as CSV or JSON for Excel, audits or backups.'],
            target: '#view-history',
            tab: 'history',
            position: 'bottom'
        },
        {
            icon: 'settings',
            title: 'Sidebar — Dein Menü',
            text: 'Über die Sidebar erreichst du alle Bereiche, Einstellungen, Export, Backup und externe Tools wie Berichtsheft.',
            en: ['Sidebar — your menu', 'The sidebar takes you to every area, settings, export, backup and external tools such as the report book.'],
            target: '#sidebar',
            tab: null,
            position: 'right'
        },
        {
            icon: 'partyPopper',
            title: 'Du bist startklar!',
            text: 'Du kennst jetzt alle wichtigen Bereiche. Starte mit dem Dashboard und erfasse deinen ersten Eintrag. Viel Erfolg!',
            en: ['You are all set!', 'You now know all the important areas. Start on the dashboard and log your first entry. Good luck!'],
            target: null,
            tab: 'dashboard',
            position: 'center'
        }
    ];

    // Mobile steps — optimiert für Handy-Layout.
    // Jahresansicht und Ziele liegen im Mehr-Blatt; ihre mobNav-Ids sind unsichtbare
    // Platzhalter (mob-nav-hidden-sync). Ein Schritt zeigt deshalb auf #mobNav-more,
    // sonst markiert die Tour eine Stelle, an der nichts zu sehen ist.
    const mobileSteps = [
        {
            icon: 'sparkles',
            title: 'Willkommen!',
            text: 'Wische nach links oder rechts oder tippe auf „Weiter“, um durch die Tour zu gehen. Du lernst alle wichtigen Bereiche deiner App kennen.',
            en: ['Welcome!', 'Swipe left or right, or tap “Next”, to go through the tour. You will get to know all the important areas of your app.'],
            target: null,
            tab: null,
            position: 'center'
        },
        {
            icon: 'barChart',
            title: 'Dashboard — Deine Übersicht',
            text: 'Hier siehst du deine Woche, die Gleitzeit und den heutigen Tag. Darunter folgen Statistik, Urlaub, Kalender und Arbeitsverteilung.',
            en: ['Dashboard — your overview', 'Here you see your week, your flexitime and today. Below come statistics, vacation, calendar and work distribution.'],
            target: '.dn-hero',
            tab: 'dashboard',
            position: 'bottom-sheet'
        },
        {
            icon: 'filePen',
            title: 'Eintrag erfassen',
            text: 'Tippe auf „Eintrag schreiben“, das Formular kommt von unten. Die „Jetzt“-Knöpfe setzen die aktuelle Uhrzeit.',
            en: ['Log an entry', 'Tap “Write entry” and the form slides up from below. The “Now” buttons fill in the current time.'],
            target: '.dn-today',
            tab: 'dashboard',
            position: 'bottom-sheet'
        },
        {
            icon: 'gauge',
            title: 'Bilanz',
            text: 'Tippe in der unteren Leiste auf „Bilanz“: Saldo, Soll und Ist, Urlaub und die Prüfung nach Arbeitszeitgesetz für einen Zeitraum.',
            en: ['Summary', 'Tap “Summary” in the bottom bar: balance, target and actual hours, vacation and the Working Hours Act check for a period.'],
            target: '#mobNav-performance',
            tab: 'performance',
            position: 'above-nav'
        },
        {
            icon: 'history',
            title: 'Historie',
            text: 'Alle deine Einträge — filterbar nach Zeitraum und Typ. Hier kannst du auch einzelne Einträge bearbeiten oder löschen.',
            en: ['History', 'All your entries, filterable by period and type. You can also edit or delete individual entries here.'],
            target: '#mobNav-history',
            tab: 'history',
            position: 'above-nav'
        },
        {
            icon: 'calendarDays',
            title: 'Jahresübersicht',
            text: 'Unter „Mehr“: das ganze Jahr auf einen Blick, jeder Tag ein Feld, dazu dein Jahreskonto und was aus den Zahlen hervorsticht.',
            en: ['Year overview', 'Under “More”: the whole year at a glance, one square per day, plus your yearly account and what stands out in the numbers.'],
            target: '#mobNav-more',
            tab: 'yearview',
            position: 'above-nav'
        },
        {
            icon: 'target',
            title: 'Ziele',
            text: 'Ebenfalls unter „Mehr“: setze dir eigene Ziele und sieh, welche Meilensteine du schon erreicht hast.',
            en: ['Goals', 'Also under “More”: set your own goals and see which milestones you have already reached.'],
            target: '#mobNav-more',
            tab: 'goals',
            position: 'above-nav'
        },
        {
            icon: 'menu',
            title: 'Menü & Einstellungen',
            text: 'Tippe oben links auf das Menü-Icon für weitere Bereiche: IHK, Berichtsheft, Export, Backup und Einstellungen.',
            en: ['Menu & settings', 'Tap the menu icon at the top left for more areas: chamber, report book, export, backup and settings.'],
            target: null,
            tab: 'dashboard',
            position: 'center',
            action: 'show-menu-hint'
        },
        {
            icon: 'partyPopper',
            title: 'Du bist startklar!',
            text: 'Du kennst jetzt alle Bereiche! Starte auf dem Dashboard und erfasse deinen ersten Eintrag. Viel Erfolg!',
            en: ['You are all set!', 'You now know all the areas! Start on the dashboard and log your first entry. Good luck!'],
            target: null,
            tab: 'dashboard',
            position: 'center'
        }
    ];

    function _tourEN() { return document.documentElement.lang === 'en'; }
    function _tourT(de, en) { return _tourEN() ? en : de; }
    function _stepTitle(s) { return _tourEN() && s.en ? s.en[0] : s.title; }
    function _stepText(s) { return _tourEN() && s.en ? s.en[1] : s.text; }

    function _getSteps() { return _isMobile() ? mobileSteps : desktopSteps; }
    // Keep old name for compat
    const onboardingSteps = desktopSteps;

    // --- Tour Keyboard ---
    function tourKeyHandler(e) {
        if (!onboardingActive) return;
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextOnboardingStep(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); previousOnboardingStep(); }
        else if (e.key === 'Escape') { e.preventDefault(); endOnboardingTour(); }
    }

    // --- Tour Touch/Swipe ---
    function tourTouchStartHandler(e) { tourTouchStart = e.touches[0].clientX; }
    function tourTouchEndHandler(e) {
        if (tourTouchStart === null || !onboardingActive) return;
        const diff = tourTouchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? nextOnboardingStep() : previousOnboardingStep(); }
        tourTouchStart = null;
    }

    // --- Confetti ---
    function launchTourConfetti() {
        const c = document.getElementById('tourConfetti');
        if (!c) return;
        const colors = ['var(--primary)','var(--school)','var(--success)','var(--holiday)','var(--danger)','#ec4899','#fff'];
        const shapes = ['■','●','▲','★','♦','◆'];
        for (let i = 0; i < 120; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.cssText = 'left:' + (Math.random()*100) + '%;color:' + colors[Math.floor(Math.random()*colors.length)] + ';font-size:' + (Math.random()*14+6) + 'px;--fall-dur:' + (Math.random()*2.5+2) + 's;--fall-del:' + (Math.random()*.8) + 's;';
            p.textContent = shapes[Math.floor(Math.random()*shapes.length)];
            c.appendChild(p);
        }
        setTimeout(() => { c.innerHTML = ''; }, 5500);
    }
    function renderOnboardingStep() {
        const steps = _getSteps();
        const step = steps[onboardingStep];
        const total = steps.length;
        const isMob = _isMobile();

        // Navigate to correct tab
        if (step.tab) {
            if (isMob && typeof mobNavSwitch === 'function') {
                mobNavSwitch(step.tab);
            } else if (typeof switchTab === 'function') {
                switchTab(step.tab);
            }
        }

        // Show sidebar for sidebar step (desktop only)
        if (step.target === '#sidebar' && !isMob) {
            // Sidebar already visible on desktop
        } else if (step.target === '#sidebar' && isMob) {
            const sb = document.querySelector('.sidebar');
            if (sb) sb.classList.add('active');
        }

        // Remove old elements
        const oldOverlay = document.getElementById('tourSpotlightOverlay');
        const oldTooltip = document.getElementById('tourTooltip');
        if (oldOverlay) oldOverlay.remove();
        if (oldTooltip) oldTooltip.remove();

        // Scroll target into view
        let targetEl = step.target ? document.querySelector(step.target) : null;
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Small delay for scroll to settle.
        // Nur der juengste Aufruf zeichnet: schnelles "Weiter" (oder Beenden) innerhalb
        // der 350 ms liess sonst jeden ausstehenden Timer eine eigene Blase anlegen —
        // gemessen 4 Blasen uebereinander, alle deckend (v8.3.1).
        const renderNr = ++_tourRenderNr;
        setTimeout(() => {
            if (renderNr !== _tourRenderNr || !onboardingActive) return;
            targetEl = step.target ? document.querySelector(step.target) : null;
            const rect = targetEl ? targetEl.getBoundingClientRect() : null;

            // --- Spotlight Overlay with cutout ---
            const overlay = document.createElement('div');
            overlay.id = 'tourSpotlightOverlay';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;transition:opacity .3s;';

            if (rect && step.position !== 'center') {
                const pad = 12;
                const r = 16;
                const x = rect.left - pad, y = rect.top - pad, w = rect.width + pad*2, h = rect.height + pad*2;
                const svgNS = 'http://www.w3.org/2000/svg';
                const svg = document.createElementNS(svgNS, 'svg');
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                svg.style.cssText = 'position:absolute;inset:0;';

                const defs = document.createElementNS(svgNS, 'defs');
                const mask = document.createElementNS(svgNS, 'mask');
                mask.id = 'tourCutout';
                const maskBg = document.createElementNS(svgNS, 'rect');
                maskBg.setAttribute('width', '100%'); maskBg.setAttribute('height', '100%'); maskBg.setAttribute('fill', 'white');
                const maskHole = document.createElementNS(svgNS, 'rect');
                maskHole.setAttribute('x', x); maskHole.setAttribute('y', y);
                maskHole.setAttribute('width', Math.max(0, w)); maskHole.setAttribute('height', Math.max(0, h));
                maskHole.setAttribute('rx', r); maskHole.setAttribute('fill', 'black');
                mask.appendChild(maskBg); mask.appendChild(maskHole);
                defs.appendChild(mask); svg.appendChild(defs);

                const bgRect = document.createElementNS(svgNS, 'rect');
                bgRect.setAttribute('width', '100%'); bgRect.setAttribute('height', '100%');
                bgRect.setAttribute('fill', 'rgba(0,0,0,0.65)'); bgRect.setAttribute('mask', 'url(#tourCutout)');
                svg.appendChild(bgRect);

                // Glow ring around cutout
                const glowRect = document.createElementNS(svgNS, 'rect');
                glowRect.setAttribute('x', x-1); glowRect.setAttribute('y', y-1);
                glowRect.setAttribute('width', Math.max(0, w+2)); glowRect.setAttribute('height', Math.max(0, h+2));
                glowRect.setAttribute('rx', r+1); glowRect.setAttribute('fill', 'none');
                glowRect.setAttribute('stroke', 'rgba(var(--primary-rgb),0.5)'); glowRect.setAttribute('stroke-width', '2');
                svg.appendChild(glowRect);

                overlay.appendChild(svg);
            } else {
                overlay.style.background = 'rgba(0,0,0,0.75)';
            }

            overlay.onclick = (e) => { if (e.target === overlay || e.target.tagName === 'svg' || e.target.tagName === 'rect') nextOnboardingStep(); };
            document.body.appendChild(overlay);

            // --- Tooltip ---
            const tooltip = document.createElement('div');
            tooltip.id = 'tourTooltip';
            const isBSheet = isMob && (step.position === 'bottom-sheet' || step.position === 'above-nav');
            tooltip.style.cssText = `
                position:fixed;z-index:10001;
                width:${isBSheet ? '100vw' : '380px'};max-width:${isBSheet ? '100vw' : '90vw'};
                background:linear-gradient(var(--bg-sidebar), var(--bg-sidebar)), var(--bg-deep);
                backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
                border:1px solid var(--border);border-radius:${isBSheet ? '18px 18px 0 0' : '16px'};
                box-shadow:0 24px 60px rgba(0,0,0,0.5),0 0 40px rgba(var(--primary-rgb),0.08);
                padding:0;overflow:hidden;opacity:0;transition:opacity .3s,transform .3s;
                transform:translateY(${isBSheet ? '20px' : '10px'});font-family:inherit;color:var(--text-main);
            `;

            // Progress bar
            const progressPerc = ((onboardingStep + 1) / total * 100);
            const progressBar = '<div style="height:3px;background:var(--border);"><div style="height:100%;width:' + progressPerc + '%;background:linear-gradient(90deg,var(--primary),rgba(var(--primary-rgb),0.7));border-radius:0 3px 3px 0;transition:width .5s;"></div></div>';

            // Dots
            let dots = '';
            for (let i = 0; i < total; i++) {
                const cls = i === onboardingStep ? 'background:var(--primary);box-shadow:0 0 8px var(--primary);transform:scale(1.3);' : (i < onboardingStep ? 'background:var(--success);' : 'background:var(--border);');
                dots += '<button onclick="jumpToStep(' + i + ')" style="width:7px;height:7px;border-radius:50%;border:none;cursor:pointer;padding:0;transition:all .3s;' + cls + '"></button>';
            }

            // Back button
            const backIcon = typeof mwlIcon === 'function' ? mwlIcon('chevronLeft', 16) : '←';
            const backBtn = onboardingStep > 0 ? '<button onclick="previousOnboardingStep()" aria-label="' + _tourT('Zurück', 'Back') + '" style="padding:8px 16px;border-radius:10px;background:rgba(var(--primary-rgb),0.08);border:1px solid var(--border);color:var(--text-main);font-size:.85rem;font-weight:600;cursor:pointer;transition:.2s;font-family:inherit;display:inline-flex;align-items:center;justify-content:center;" onmouseover="this.style.background=\'rgba(var(--primary-rgb),.16)\';this.style.borderColor=\'var(--primary)\'" onmouseout="this.style.background=\'rgba(var(--primary-rgb),.08)\';this.style.borderColor=\'var(--border)\'">' + backIcon + '</button>' : '';

            // Next/Finish button
            const nextArrow = typeof mwlIcon === 'function' ? mwlIcon('arrowRight', 16) : '→';
            const checkIcon = typeof mwlIcon === 'function' ? mwlIcon('check', 16) : '✓';
            const nextBtn = onboardingStep < total - 1 ?
                '<button onclick="nextOnboardingStep()" style="padding:8px 20px;border-radius:10px;background:var(--primary);border:none;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit;box-shadow:0 4px 15px rgba(var(--primary-rgb),0.3);display:inline-flex;align-items:center;gap:6px;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.filter=\'brightness(1.08)\'" onmouseout="this.style.transform=\'none\';this.style.filter=\'none\'"><span>' + _tourT('Weiter', 'Next') + '</span>' + nextArrow + '</button>' :
                '<button onclick="endOnboardingTour()" style="padding:8px 20px;border-radius:10px;background:var(--success);border:none;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit;box-shadow:0 4px 15px rgba(16,185,129,0.3);display:inline-flex;align-items:center;gap:6px;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.filter=\'brightness(1.08)\'" onmouseout="this.style.transform=\'none\';this.style.filter=\'none\'">' + checkIcon + '<span>' + _tourT('Fertig!', 'Done!') + '</span></button>';

            tooltip.innerHTML = progressBar +
                '<div style="padding:1.5rem 1.5rem 1.25rem;">' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:.75rem;">' +
                        '<div style="width:44px;height:44px;border-radius:12px;background:rgba(var(--primary-rgb),0.12);border:1px solid rgba(var(--primary-rgb),0.28);color:var(--primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + _renderTourIcon(step.icon) + '</div>' +
                        '<div>' +
                            '<h3 style="margin:0;font-size:1.05rem;font-weight:700;color:var(--text-main);">' + _stepTitle(step) + '</h3>' +
                            '<span style="font-size:.75rem;color:var(--text-muted);opacity:0.8;">' + _tourT('Schritt ', 'Step ') + (onboardingStep + 1) + _tourT(' von ', ' of ') + total + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<p style="margin:0 0 1.25rem;font-size:.9rem;line-height:1.65;color:var(--text-muted);">' + _stepText(step) + '</p>' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
                        '<div style="display:flex;gap:5px;align-items:center;">' + dots + '</div>' +
                        '<div style="display:flex;gap:8px;">' + backBtn + nextBtn + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="padding:0 1.5rem .75rem;display:flex;justify-content:space-between;align-items:center;">' +
                    '<span style="font-size:.72rem;color:var(--text-muted);opacity:0.7;">' + (isMob ? _tourT('Wischen zum Blättern', 'Swipe to browse') : _tourT('Pfeiltasten links/rechts · Esc zum Beenden', 'Arrow keys left/right · Esc to close')) + '</span>' +
                    '<button onclick="endOnboardingTour()" style="background:none;border:none;color:var(--text-muted);font-size:.72rem;cursor:pointer;font-family:inherit;padding:2px 4px;opacity:0.85;" onmouseover="this.style.color=\'var(--text-main)\';this.style.opacity=\'1\'" onmouseout="this.style.color=\'var(--text-muted)\';this.style.opacity=\'0.85\'">' + _tourT('Überspringen', 'Skip') + '</button>' +
                '</div>';

            document.body.appendChild(tooltip);

            // Position the tooltip
            positionTourTooltip(tooltip, rect, step.position);

            // Animate in
            requestAnimationFrame(() => {
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(0)';
            });
        }, 350);
    }

    function positionTourTooltip(tooltip, rect, position) {
        const gap = 16;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // --- Mobile bottom-sheet: full-width sheet pinned above bottom nav ---
        if (position === 'bottom-sheet') {
            const navH = 64; // mobile bottom nav height
            tooltip.style.left = '0';
            tooltip.style.bottom = navH + 'px';
            tooltip.style.top = 'auto';
            tooltip.style.transform = 'none';
            tooltip.style.width = '100vw';
            tooltip.style.maxWidth = '100vw';
            return;
        }

        // --- Mobile above-nav: tooltip floating just above mobile bottom nav ---
        if (position === 'above-nav') {
            const navH = 64;
            tooltip.style.left = '50%';
            tooltip.style.bottom = (navH + gap) + 'px';
            tooltip.style.top = 'auto';
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.style.width = 'calc(100vw - 24px)';
            tooltip.style.maxWidth = '420px';
            return;
        }

        if (!rect || position === 'center') {
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        const tw = Math.min(380, vw * 0.9);
        const th = tooltip.offsetHeight || 220;

        let left, top;
        const cx = rect.left + rect.width / 2;

        if (position === 'bottom') {
            top = rect.bottom + gap;
            left = cx - tw / 2;
        } else if (position === 'top') {
            top = rect.top - th - gap;
            left = cx - tw / 2;
        } else if (position === 'right') {
            left = rect.right + gap;
            top = rect.top + rect.height / 2 - th / 2;
        } else if (position === 'left') {
            left = rect.left - tw - gap;
            top = rect.top + rect.height / 2 - th / 2;
        }

        // Clamp to viewport
        if (left < 10) left = 10;
        if (left + tw > vw - 10) left = vw - tw - 10;
        if (top < 10) top = 10;
        if (top + th > vh - 10) {
            // Flip to top if we're below viewport
            if (position === 'bottom' && rect.top - th - gap > 10) {
                top = rect.top - th - gap;
            } else {
                top = vh - th - 10;
            }
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.transform = 'none';
    }

    function nextOnboardingStep() {
        if (onboardingStep < _getSteps().length - 1) {
            onboardingStep++;
            renderOnboardingStep();
        } else {
            endOnboardingTour();
        }
    }

    function previousOnboardingStep() {
        if (onboardingStep > 0) {
            onboardingStep--;
            renderOnboardingStep();
        }
    }

    function jumpToStep(step) {
        onboardingStep = step;
        renderOnboardingStep();
    }

    function endOnboardingTour() {
        onboardingActive = false;
        document.removeEventListener('keydown', tourKeyHandler);
        document.removeEventListener('touchstart', tourTouchStartHandler);
        document.removeEventListener('touchend', tourTouchEndHandler);
        if (_tourResizeHandler) { window.removeEventListener('resize', _tourResizeHandler); _tourResizeHandler = null; }
        const overlay = document.getElementById('tourSpotlightOverlay');
        const tooltip = document.getElementById('tourTooltip');
        if (overlay) overlay.remove();
        if (tooltip) tooltip.remove();
        // Close sidebar on mobile if open
        if (window.innerWidth < 1024) {
            const sb = document.querySelector('.sidebar');
            if (sb) sb.classList.remove('active');
        }
        // Switch back to dashboard
        if (typeof switchTab === 'function') switchTab('dashboard');
        if (onboardingStep >= _getSteps().length - 1) launchTourConfetti();
        showCustomMessage(_tourT('Tour abgeschlossen', 'Tour complete'), _tourT('Du kennst jetzt alle Bereiche. Viel Erfolg!', 'You now know all the areas. Good luck!'), 'success');
    }

    function closeQuickHelp() {
        const modal = document.getElementById('quickHelpModal');
        if (modal) modal.classList.remove('active');
    }
    