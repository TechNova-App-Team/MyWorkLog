// ═══ CORE: ONBOARDING-TOUR ═══
    // === PROFESSIONAL STEP-BY-STEP TOUR ===
    
    let onboardingStep = 0;
    let onboardingActive = false;
    let tourTouchStart = null;
    let _tourResizeHandler = null;

    function _isMobile() { return window.innerWidth < 1024; }

    // Desktop steps (original — unchanged)
    const desktopSteps = [
        {
            icon: '👋',
            title: 'Willkommen bei MyWorkLog',
            text: 'Diese Tour führt dich Schritt für Schritt durch die App. Du lernst alle wichtigen Bereiche und Funktionen kennen.',
            target: null,
            tab: null,
            position: 'center'
        },
        {
            icon: '📊',
            title: 'Dein Dashboard',
            text: 'Hier siehst du deine wichtigsten Kennzahlen auf einen Blick — Wochensaldo, Monatssaldo, Gleitzeitkonto und Tagesdurchschnitt.',
            target: '#dashboardGrid',
            tab: 'dashboard',
            position: 'bottom'
        },
        {
            icon: '📈',
            title: 'Trend & Verteilung',
            text: 'Der Wochenverlauf zeigt dir, wie sich dein Saldo entwickelt. Das Donut-Diagramm zeigt die Verteilung deiner Eintragstypen.',
            target: '[data-item-id="charts"]',
            tab: 'dashboard',
            position: 'top'
        },
        {
            icon: '✍️',
            title: 'Eintrag erfassen',
            text: 'Wähle Datum, Typ und gib Start/Ende oder Stunden ein. Die „Jetzt"-Buttons setzen die aktuelle Uhrzeit. Entwürfe werden automatisch gespeichert.',
            target: '[data-item-id="entry-form"]',
            tab: 'dashboard',
            position: 'top'
        },
        {
            icon: '📈',
            title: 'Performance Analyse',
            text: 'Hier findest du detaillierte Auswertungen: Soll-Ist-Vergleich, Projektverteilung, Wochentag-Analyse und Produktivitäts-Heatmap.',
            target: '#view-performance',
            tab: 'performance',
            position: 'bottom'
        },
        {
            icon: '🔮',
            title: 'Prognose & Planung',
            text: 'Plane die nächsten 4 Wochen. Klicke auf einen Tag, um ihn als Urlaub, Schule oder Krank zu markieren — der Saldo aktualisiert sich live.',
            target: '#view-prognose',
            tab: 'prognose',
            position: 'bottom'
        },
        {
            icon: '📆',
            title: 'Jahresübersicht',
            text: 'Die Heatmap zeigt dir das ganze Jahr. Grün = produktive Tage, Rot = weniger produktive Tage. Dazu gibt es KI-Insights über deine Muster.',
            target: '#view-yearview',
            tab: 'yearview',
            position: 'bottom'
        },
        {
            icon: '🎓',
            title: 'IHK & Ausbildung',
            text: 'Verwalte deine Ausbildungsdaten, Prüfungstermine und Noten. Der Compliance-Check prüft Ruhezeiten und Arbeitszeitgrenzen.',
            target: '#view-ihk',
            tab: 'ihk',
            position: 'bottom'
        },
        {
            icon: '🏆',
            title: 'Ziele & Fokus',
            text: 'Setze persönliche Ziele wie „100h Überstunden" oder „50 positive Wochen". Jedes erreichte Ziel bringt dir ein Achievement-Badge.',
            target: '#view-goals',
            tab: 'goals',
            position: 'bottom'
        },
        {
            icon: '🔍',
            title: 'Daten & Historie',
            text: 'Alle deine Einträge — filterbar nach Datum, Typ und Projekt. Exportiere als CSV oder JSON für Excel, Audits oder Backups.',
            target: '#view-history',
            tab: 'history',
            position: 'bottom'
        },
        {
            icon: '⚙️',
            title: 'Sidebar — Dein Menü',
            text: 'Über die Sidebar erreichst du alle Bereiche, Einstellungen, Export, Backup und externe Tools wie Berichtsheft.',
            target: '#sidebar',
            tab: null,
            position: 'right'
        },
        {
            icon: '🎉',
            title: 'Du bist startklar!',
            text: 'Du kennst jetzt alle wichtigen Bereiche. Starte mit dem Dashboard und erfasse deinen ersten Eintrag. Viel Erfolg!',
            target: null,
            tab: 'dashboard',
            position: 'center'
        }
    ];

    // Mobile steps — optimiert für Handy-Layout
    const mobileSteps = [
        {
            icon: '👋',
            title: 'Willkommen!',
            text: 'Swipe links/rechts oder tippe auf "Weiter" um durch die Tour zu gehen. Du lernst alle wichtigen Bereiche deiner App kennen.',
            target: null,
            tab: null,
            position: 'center'
        },
        {
            icon: '📊',
            title: 'Dashboard — Deine Übersicht',
            text: 'Hier siehst du Wochensaldo, Monatssaldo, Gleitzeitkonto und mehr. Scrolle runter für Diagramme und das Eintragsformular.',
            target: '#dashboardGrid',
            tab: 'dashboard',
            position: 'bottom-sheet'
        },
        {
            icon: '✍️',
            title: 'Eintrag erfassen',
            text: 'Scrolle im Dashboard runter zum Formular. Wähle Datum & Typ, gib Start- und Endzeit ein. Die „Jetzt"-Buttons setzen die aktuelle Uhrzeit.',
            target: '[data-item-id="entry-form"]',
            tab: 'dashboard',
            position: 'bottom-sheet'
        },
        {
            icon: '📈',
            title: 'Analyse',
            text: 'Tippe in der unteren Leiste auf „Analyse" für Soll-Ist-Vergleiche, Projektverteilung und Produktivitäts-Heatmap.',
            target: '#mobNav-performance',
            tab: 'performance',
            position: 'above-nav'
        },
        {
            icon: '📋',
            title: 'Historie',
            text: 'Alle deine Einträge — filterbar nach Datum, Typ und Projekt. Hier kannst du auch einzelne Einträge bearbeiten oder löschen.',
            target: '#mobNav-history',
            tab: 'history',
            position: 'above-nav'
        },
        {
            icon: '📆',
            title: 'Jahresübersicht',
            text: 'Die Heatmap zeigt dir das ganze Jahr auf einen Blick. Grün = produktive Tage, Rot = weniger. Dazu KI-Insights.',
            target: '#mobNav-yearview',
            tab: 'yearview',
            position: 'above-nav'
        },
        {
            icon: '🎯',
            title: 'Ziele & Achievements',
            text: 'Setze persönliche Ziele wie „100h Überstunden". Jedes erreichte Ziel bringt dir ein Badge!',
            target: '#mobNav-goals',
            tab: 'goals',
            position: 'above-nav'
        },
        {
            icon: '☰',
            title: 'Menü & Einstellungen',
            text: 'Tippe oben links auf das Menü-Icon (☰) für weitere Bereiche: Prognose, IHK, Berichtsheft, Export, Backup und Einstellungen.',
            target: null,
            tab: 'dashboard',
            position: 'center',
            action: 'show-menu-hint'
        },
        {
            icon: '🎉',
            title: 'Du bist startklar!',
            text: 'Du kennst jetzt alle Bereiche! Starte auf dem Dashboard und erfasse deinen ersten Eintrag. Viel Erfolg! 🚀',
            target: null,
            tab: 'dashboard',
            position: 'center'
        }
    ];

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
        const colors = ['#a855f7','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#fff'];
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

        // Small delay for scroll to settle
        setTimeout(() => {
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
                overlay.style.background = 'rgba(0,0,0,0.7)';
                overlay.style.backdropFilter = 'blur(4px)';
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
                background:rgba(15,15,25,0.95);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
                border:1px solid rgba(255,255,255,0.1);border-radius:${isBSheet ? '18px 18px 0 0' : '16px'};
                box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 40px rgba(var(--primary-rgb),0.08);
                padding:0;overflow:hidden;opacity:0;transition:opacity .3s,transform .3s;
                transform:translateY(${isBSheet ? '20px' : '10px'});font-family:inherit;
            `;

            // Progress bar
            const progressPerc = ((onboardingStep + 1) / total * 100);
            const progressBar = '<div style="height:3px;background:rgba(255,255,255,0.05);"><div style="height:100%;width:' + progressPerc + '%;background:linear-gradient(90deg,var(--primary),#06b6d4);border-radius:0 3px 3px 0;transition:width .5s;"></div></div>';

            // Dots
            let dots = '';
            for (let i = 0; i < total; i++) {
                const cls = i === onboardingStep ? 'background:var(--primary);box-shadow:0 0 8px var(--primary);transform:scale(1.3);' : (i < onboardingStep ? 'background:#10b981;' : 'background:rgba(255,255,255,0.15);');
                dots += '<button onclick="jumpToStep(' + i + ')" style="width:7px;height:7px;border-radius:50%;border:none;cursor:pointer;padding:0;transition:all .3s;' + cls + '"></button>';
            }

            // Back button
            const backBtn = onboardingStep > 0 ? '<button onclick="previousOnboardingStep()" style="padding:8px 16px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:.85rem;font-weight:600;cursor:pointer;transition:.2s;font-family:inherit;" onmouseover="this.style.background=\'rgba(255,255,255,.12)\'" onmouseout="this.style.background=\'rgba(255,255,255,.06)\'">←</button>' : '';

            // Next/Finish button
            const nextBtn = onboardingStep < total - 1 ?
                '<button onclick="nextOnboardingStep()" style="padding:8px 20px;border-radius:10px;background:linear-gradient(135deg,var(--primary),#06b6d4);border:none;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit;box-shadow:0 4px 15px rgba(var(--primary-rgb),0.3);" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">Weiter →</button>' :
                '<button onclick="endOnboardingTour()" style="padding:8px 20px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;font-size:.85rem;font-weight:700;cursor:pointer;transition:.2s;font-family:inherit;box-shadow:0 4px 15px rgba(16,185,129,0.3);" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'none\'">✓ Fertig!</button>';

            tooltip.innerHTML = progressBar +
                '<div style="padding:1.5rem 1.5rem 1.25rem;">' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:.75rem;">' +
                        '<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(var(--primary-rgb),0.15),rgba(6,182,212,0.15));border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">' + step.icon + '</div>' +
                        '<div>' +
                            '<h3 style="margin:0;font-size:1.05rem;font-weight:700;color:#fff;">' + step.title + '</h3>' +
                            '<span style="font-size:.75rem;color:rgba(255,255,255,0.35);">Schritt ' + (onboardingStep + 1) + ' von ' + total + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<p style="margin:0 0 1.25rem;font-size:.9rem;line-height:1.65;color:rgba(255,255,255,0.6);">' + step.text + '</p>' +
                    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
                        '<div style="display:flex;gap:5px;align-items:center;">' + dots + '</div>' +
                        '<div style="display:flex;gap:8px;">' + backBtn + nextBtn + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="padding:0 1.5rem .75rem;display:flex;justify-content:space-between;align-items:center;">' +
                    '<span style="font-size:.72rem;color:rgba(255,255,255,0.2);">' + (isMob ? '← Swipe → · Tippe zum Überspringen' : '← → Pfeiltasten · Esc zum Beenden') + '</span>' +
                    '<button onclick="endOnboardingTour()" style="background:none;border:none;color:rgba(255,255,255,0.25);font-size:.72rem;cursor:pointer;font-family:inherit;padding:2px 4px;" onmouseover="this.style.color=\'rgba(255,255,255,.5)\'" onmouseout="this.style.color=\'rgba(255,255,255,.25)\'">Überspringen</button>' +
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
        showCustomMessage('✅ Tour abgeschlossen', 'Du kennst jetzt alle Features! Viel Erfolg beim Tracken! 🚀', 'success');
    }

    function highlightElement(selector) {
        // Legacy - handled by renderOnboardingStep now
    }
    function closeQuickHelp() {
        const modal = document.getElementById('quickHelpModal');
        if (modal) modal.classList.remove('active');
    }
    
    