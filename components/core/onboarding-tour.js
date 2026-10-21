// ═══ CORE: ONBOARDING-TOUR ═══
    // Seit v8.5.1 eine durchgehende Ebene statt je Schritt neu gebauter Overlays:
    // Spot und Sprechblase GLEITEN von Ziel zu Ziel (rAF, folgen auch dem Scrollen),
    // vor jedem Bereichswechsel faehrt der Spot erst auf den Menuepunkt und tippt ihn
    // an, und kleine Marken benennen die einzelnen Elemente im Ausschnitt. Anlass:
    // bei der Vorstellung am 13.10.2026 war die alte Tour zu ungenau (ganze Ansichten
    // markiert, Bereichswechsel als harter Schnitt ohne Hinweis, wo man jetzt ist).

    let onboardingStep = 0;
    let onboardingActive = false;
    let tourTouchStart = null;
    let _tourRenderNr = 0;
    let _tourResizeHandler = null;
    let _tourDir = 1;
    const _tour = { layer: null, spot: null, tip: null, marks: null, tap: null,
        cur: null, want: null, tipCur: null, tipWant: null, raf: 0, last: 0,
        targetEls: [], markEls: [], phase: 'idle' };

    function _isMobile() { return window.innerWidth < 1024; }
    function _tourEN() { return document.documentElement.lang === 'en'; }
    function _tourT(de, en) { return _tourEN() ? en : de; }
    function _tourReduced() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
    function _tourWait(ms) { return new Promise(r => setTimeout(r, ms)); }

    function _renderTourIcon(icon, size) {
        if (!icon) return '';
        if (typeof icon === 'string' && icon.indexOf('<svg') !== -1) return icon;
        if (typeof mwlIcon === 'function') return mwlIcon(icon, size || 18);
        return '';
    }

    // Schrittaufbau: target = Selektor oder Liste (der Spot umschliesst ALLE sichtbaren
    // Treffer), marks = Beschriftungen an Teilelementen, optional = Schritt faellt weg,
    // wenn das Ziel fehlt (Modul ausgeblendet, keine Daten). Jeder Text traegt seine
    // englische Fassung selbst: die Tour entsteht per innerHTML, das statische i18n
    // sieht sie nie. Texte beschreiben nur, was die Ansicht WIRKLICH zeigt — die
    // Fassung vor v8.3.1 versprach Heatmaps, KI-Insights und Badges, die es nicht gab.
    const tourSteps = [
        { icon: 'sparkles', tab: null, target: null,
          de: ['Willkommen bei MyWorkLog', 'Die Tour zeigt dir Bereich für Bereich, wo was steht. Der Rahmen markiert immer genau die Stelle, um die es gerade geht.'],
          en: ['Welcome to MyWorkLog', 'This tour shows you, area by area, where everything is. The frame always marks exactly the spot being explained.'] },

        { icon: 'barChart', tab: 'dashboard', target: '.dn-hero__cards',
          de: ['Woche und Gleitzeit', 'Ganz oben: wie viele Stunden diese Woche schon drin sind und wie dein Gleitzeitkonto steht. Ein Klick auf die Woche öffnet die Wochenansicht.'],
          en: ['Week and flexitime', 'At the very top: how many hours this week already has and where your flexitime account stands. Clicking the week opens the week view.'],
          marks: [['#dnKwVal', 'Ist / Soll der Woche', 'Week actual / target'],
                  ['#dnFlexVal', 'Gleitzeit-Saldo', 'Flexitime balance'],
                  ['#dnSaldoBtn', 'Saldo korrigieren', 'Adjust balance']] },

        { icon: 'settings', tab: 'dashboard', target: '#dnEditBtn',
          de: ['Dashboard anpassen', 'Über dieses Symbol sortierst du die Module, stellst ihre Breite ein oder blendest sie aus. Jedes Modul hat zusätzlich ein eigenes Menü (die drei Punkte).'],
          en: ['Customise the dashboard', 'This icon lets you reorder modules, set their width or hide them. Every module also has its own menu (the three dots).'] },

        { icon: 'trendingUp', tab: 'dashboard', target: '.dn-week', optional: true,
          de: ['Deine Woche', 'Jeder Tag ist ein Punkt auf der Linie. Oben wählst du den Tag, rechts schaltest du auf Analysen um: Saldo-Verlauf, Verteilung, Wochentage.'],
          en: ['Your week', 'Each day is a point on the line. Pick the day at the top, and switch to analyses on the right: balance trend, distribution, weekdays.'],
          marks: [['#dnDays', 'Tage der Woche', 'Days of the week'],
                  ['#dnViewSeg', 'Woche / Analysen', 'Week / analyses'],
                  ['#dnGoal', 'Tagesziel', 'Daily goal']] },

        { icon: 'filePen', tab: 'dashboard', target: '.dn-today', optional: true,
          de: ['Heute eintragen', '„Eintrag schreiben“ öffnet das Formular, die Stempeluhr startet mit einem Klick. Der Ring zeigt, wie viel vom Tagessoll schon geschafft ist.'],
          en: ['Log today', '“Write entry” opens the form, the time clock starts with one click. The ring shows how much of today’s target is done.'],
          marks: [['#dnTimer', 'Stempeluhr', 'Time clock'],
                  ['#dnTodayRing', 'Tagessoll', 'Daily target'],
                  ['.dn-today .dn-cta', 'Eintrag schreiben', 'Write entry']] },

        { icon: 'palmtree', tab: 'dashboard', target: '.dn-vac', optional: true,
          de: ['Urlaub', 'Wie viele Urlaubstage noch übrig sind und welche schon verplant sind. „Planen“ öffnet den Urlaubsplaner.'],
          en: ['Vacation', 'How many vacation days are left and which are already planned. “Plan” opens the vacation planner.'],
          marks: [['#dnVacBig', 'Resttage', 'Days left'],
                  ['.dn-vac [data-dn="vacplan"]', 'Urlaubsplaner', 'Vacation planner']] },

        { icon: 'calendarDays', tab: 'dashboard', target: '.dn-cal', optional: true,
          de: ['Kalender', 'Der Monat auf einen Blick. Ein Klick auf einen Tag zeigt daneben, was an dem Tag eingetragen ist.'],
          en: ['Calendar', 'The month at a glance. Clicking a day shows what was logged on it, right next to the grid.'],
          marks: [['#dnCalGrid', 'Tag anklicken', 'Click a day'],
                  ['#dnCalDay', 'Details zum Tag', 'Day details']] },

        { icon: 'gauge', tab: 'performance', target: ['.pf-range', '.pf-verdict'], optional: true,
          de: ['Bilanz: das Ergebnis', 'Was in einem Zeitraum herauskam — Saldo, Soll und Ist. Den Zeitraum wählst du oben rechts.'],
          en: ['Summary: the result', 'What a period added up to — balance, target and actual hours. Pick the period at the top right.'],
          marks: [['.pf-range', 'Zeitraum wählen', 'Choose period']] },

        { icon: 'clock', tab: 'performance', target: ['.pf-act:has(#pfBalance)', '.pf-act:has(#pfRhythm)'], optional: true,
          de: ['Bilanz: dein Rhythmus', 'Darunter Soll und Ist nebeneinander und wann du tatsächlich arbeitest. Weiter unten folgen Urlaub und die Prüfung nach Arbeitszeitgesetz.'],
          en: ['Summary: your rhythm', 'Below: target and actual side by side, and when you actually work. Further down come vacation and the Working Hours Act check.'],
          marks: [['#pfBalance', 'Soll und Ist', 'Target vs. actual'],
                  ['#pfRhythm', 'Wann du arbeitest', 'When you work']] },

        { icon: 'calendarDays', tab: 'yearview', target: ['.yv-verdict', '#yvMap'], optional: true,
          de: ['Jahresübersicht', 'Oben das Jahreskonto, darunter jeder Tag als Feld. Mit den Pfeilen oben wechselst du das Jahr.'],
          en: ['Year overview', 'At the top your yearly account, below it every day as a square. The arrows at the top switch the year.'],
          marks: [['.yv-nav', 'Jahr wechseln', 'Switch year'],
                  ['#yvMapGrid', 'Jeder Tag ein Feld', 'One square per day']] },

        { icon: 'graduationCap', tab: 'ihk', target: '.ihk-panel--wide', optional: true,
          de: ['IHK & Ausbildung', 'Wo du in deiner Ausbildung stehst: der Verlauf von Beginn bis Vertragsende, darunter Prüfungszulassung, Fehlzeiten und Noten.'],
          en: ['Chamber & training', 'Where you are in your apprenticeship: progress from start to contract end, then exam admission, absences and grades.'],
          marks: [['.ihk-band__now', 'Heute', 'Today']] },

        { icon: 'settings', tab: 'ihk', target: '#ihkConfToggle', optional: true,
          de: ['Ausbildungsdaten eintragen', 'Hier trägst du Beginn, Vertragsende und Prüfungstermine ein. Erst damit kann die Ansicht rechnen.'],
          en: ['Enter training data', 'Enter start, contract end and exam dates here. The view can only calculate once they are in.'] },

        { icon: 'award', tab: 'goals', target: ['#glComposer', '.gl-goals'], optional: true,
          de: ['Ziele', 'Oben legst du ein eigenes Ziel an, zum Beispiel ein Stundenpolster. Darunter stehen deine Ziele mit Fortschritt.'],
          en: ['Goals', 'Create your own goal at the top, for example a buffer of extra hours. Your goals and their progress are listed below.'],
          marks: [['#glComposer', 'Neues Ziel', 'New goal'],
                  ['#goalsList', 'Deine Ziele', 'Your goals']] },

        { icon: 'history', tab: 'history', target: ['.hl-band', '#hlToolbar'], optional: true,
          de: ['Verlauf: Zeitraum und Filter', 'Das Band zeigt jeden Tag als Balken. Zieh darauf einen Bereich auf oder nimm eine feste Spanne; darunter grenzt du nach Typ ein.'],
          en: ['History: period and filters', 'The band shows every day as a bar. Drag across it to select a range or pick a preset; below that you filter by type.'],
          marks: [['#hlBandPlot', 'Bereich aufziehen', 'Drag to select'],
                  ['.hl-ranges', 'Feste Spannen', 'Presets'],
                  ['#hlTypeChips', 'Nach Typ filtern', 'Filter by type']] },

        { icon: 'download', tab: 'history', target: '#view-history .view-header-actions', optional: true,
          de: ['Exportieren', 'Deine Einträge als CSV (für Excel) oder JSON. Daneben liegt der Papierkorb mit gelöschten Einträgen.'],
          en: ['Export', 'Your entries as CSV (for Excel) or JSON. Next to it is the trash with deleted entries.'] },

        { icon: 'menu', tab: 'dashboard', target: '#sidebar', mobileTarget: '#mobileMenuToggle',
          de: ['Das Menü', 'Hier erreichst du alle Bereiche, die Einstellungen, Import, Export, Backup und Werkzeuge wie das Berichtsheft.'],
          en: ['The menu', 'This takes you to every area, the settings, import, export, backup and tools such as the report book.'],
          mobileText: ['Das Menü', 'Oben links öffnest du das Menü: alle Bereiche, Einstellungen, Import, Export, Backup und das Berichtsheft.',
                       'The menu', 'The top left opens the menu: every area, settings, import, export, backup and the report book.'],
          marks: [['#sidebarNavList', 'Alle Bereiche', 'All areas']] },

        { icon: 'partyPopper', tab: 'dashboard', target: null,
          de: ['Du bist startklar', 'Fang mit „Eintrag schreiben“ auf dem Dashboard an. Die Tour findest du jederzeit wieder im Menü.'],
          en: ['You are all set', 'Start with “Write entry” on the dashboard. You can restart the tour from the menu at any time.'] }
    ];

    const TOUR_AREA = {
        dashboard: ['Dashboard', 'Dashboard'], performance: ['Bilanz', 'Summary'],
        yearview: ['Jahresübersicht', 'Year overview'], ihk: ['IHK', 'Chamber'],
        goals: ['Ziele', 'Goals'], history: ['Verlauf', 'History']
    };

    function _stepTitle(s) {
        if (_isMobile() && s.mobileText) return _tourEN() ? s.mobileText[2] : s.mobileText[0];
        return _tourEN() ? s.en[0] : s.de[0];
    }
    function _stepText(s) {
        if (_isMobile() && s.mobileText) return _tourEN() ? s.mobileText[3] : s.mobileText[1];
        return _tourEN() ? s.en[1] : s.de[1];
    }
    function _getSteps() { return tourSteps; }
    const onboardingSteps = tourSteps;

    function _activeTab() {
        const v = document.querySelector('.view-section.active');
        return v ? v.id.replace(/^view-/, '') : null;
    }

    function _visible(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        const cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none';
    }

    function _q(sel) { try { return document.querySelector(sel); } catch (e) { return null; } }

    function _stepTargets(step) {
        let t = (_isMobile() && step.mobileTarget) ? step.mobileTarget : step.target;
        if (!t) return [];
        return (Array.isArray(t) ? t : [t]).map(_q).filter(_visible);
    }

    // Menuepunkt, ueber den man in den Bereich kommt. Am Handy liegen Jahr und Ziele
    // im Mehr-Blatt; ihre mobNav-Ids sind unsichtbare Platzhalter.
    function _navFor(tab) {
        if (_isMobile()) {
            const b = document.getElementById('mobNav-' + tab);
            if (_visible(b)) return b;
            const more = document.getElementById('mobNav-more');
            return _visible(more) ? more : null;
        }
        const sb = document.getElementById('sidebar');
        if (!sb || sb.classList.contains('hidden')) return null;
        const el = _q('#sidebar .nav-item[data-nav-id="' + tab + '"]');
        return _visible(el) ? el : null;
    }

    function _areaName(tab) {
        const nav = _q('#sidebar .nav-item[data-nav-id="' + tab + '"] .nav-label');
        const t = nav && nav.textContent.trim();
        if (t) return t;
        const a = TOUR_AREA[tab];
        return a ? (_tourEN() ? a[1] : a[0]) : '';
    }

    function _unionRect(els) {
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        els.forEach(el => {
            const q = el.getBoundingClientRect();
            l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
        });
        return l === Infinity ? null : { x: l, y: t, w: r - l, h: b - t };
    }

    // Bereich, in dem der Spot liegen darf: am Handy zwischen oberem Rand und
    // Sprechblase, sonst der ganze Bildschirm.
    function _safeArea() {
        const vh = window.innerHeight, vw = window.innerWidth;
        let bottom = vh - 8;
        if (_isMobile() && _tour.tip) bottom = Math.min(bottom, _tour.tip.getBoundingClientRect().top - 10);
        return { top: 8, left: 6, right: vw - 6, bottom };
    }

    function _wantRect() {
        const els = _tour.targetEls.filter(el => el.isConnected);
        const u = _unionRect(els);
        if (!u) return { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 0, h: 0, r: 24 };
        const pad = (u.w < 80 && u.h < 80) ? 8 : 10;
        const a = _safeArea();
        let x = u.x - pad, y = u.y - pad, w = u.w + pad * 2, h = u.h + pad * 2;
        // Ragt das Ziel aus dem sichtbaren Bereich, wird der Ausschnitt gekappt
        // statt den Rahmen ausserhalb des Bildschirms zu zeichnen.
        const x2 = Math.min(x + w, a.right), y2 = Math.min(y + h, a.bottom);
        x = Math.max(x, a.left); y = Math.max(y, a.top);
        return { x, y, w: Math.max(0, x2 - x), h: Math.max(0, y2 - y), r: Math.min(16, 6 + Math.min(w, h) / 6) };
    }

    // --- Ebene ---
    function _tourBuild() {
        if (_tour.layer && _tour.layer.isConnected) return;
        const L = document.createElement('div');
        L.id = 'tourLayer';
        L.className = 'tour-layer';
        L.innerHTML = '<div class="tour-spot" aria-hidden="true"></div>' +
            '<div class="tour-marks" aria-hidden="true"></div>' +
            '<div class="tour-tap" aria-hidden="true"></div>' +
            '<div class="tour-tip" id="tourTooltip" role="dialog" aria-live="polite"></div>';
        // Text auf dem Akzent: dieselbe Wahl wie auf dem Dashboard (dnSetInk).
        const v = document.getElementById('view-dashboard');
        const ink = v ? v.style.getPropertyValue('--dn-on-primary') : '';
        if (ink) L.style.setProperty('--tour-ink', ink);
        L.addEventListener('click', e => {
            if (e.target.closest('.tour-tip')) return;
            nextOnboardingStep();
        });
        document.body.appendChild(L);
        _tour.layer = L;
        _tour.spot = L.querySelector('.tour-spot');
        _tour.marks = L.querySelector('.tour-marks');
        _tour.tap = L.querySelector('.tour-tap');
        _tour.tip = L.querySelector('.tour-tip');
        _tour.cur = { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 0, h: 0, r: 24 };
        _tour.tipCur = null;
        _tour.last = 0;
        requestAnimationFrame(() => L.classList.add('is-on'));
        _tourLoop();
    }

    // Ein Takt je Bild: Ziel neu messen (Scrollen, Nachladen der Ansicht), Spot und
    // Sprechblase federnd hinterherziehen, Marken direkt an ihre Elemente haengen.
    function _tourLoop() {
        cancelAnimationFrame(_tour.raf);
        const tick = (now) => {
            if (!onboardingActive || !_tour.layer) return;
            const dt = _tour.last ? Math.min(64, now - _tour.last) : 16;
            _tour.last = now;
            const k = _tourReduced() ? 1 : 1 - Math.exp(-dt / 95);
            const want = _tour.phase === 'nav' && _tour.want ? _tour.want : _wantRect();
            const c = _tour.cur;
            ['x', 'y', 'w', 'h', 'r'].forEach(p => { c[p] += (want[p] - c[p]) * k; if (Math.abs(want[p] - c[p]) < 0.3) c[p] = want[p]; });
            const s = _tour.spot.style;
            s.transform = 'translate(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px)';
            s.width = c.w.toFixed(1) + 'px';
            s.height = c.h.toFixed(1) + 'px';
            s.borderRadius = c.r.toFixed(1) + 'px';
            _tourPlaceTip(c, k);
            _tourPlaceMarks();
            _tour.raf = requestAnimationFrame(tick);
        };
        _tour.raf = requestAnimationFrame(tick);
    }

    function _tourPlaceTip(spot, k) {
        const tip = _tour.tip;
        if (!tip) return;
        const vw = window.innerWidth, vh = window.innerHeight;
        if (_isMobile()) {
            tip.classList.add('is-sheet');
            const nav = document.getElementById('mobNav-more');
            const bar = nav ? nav.parentElement : null;
            const navTop = (bar && _visible(bar)) ? bar.getBoundingClientRect().top : vh;
            tip.style.transform = 'translate(0px,' + Math.round(navTop - tip.offsetHeight - 10) + 'px)';
            return;
        }
        tip.classList.remove('is-sheet');
        const tw = tip.offsetWidth, th = tip.offsetHeight, gap = 18;
        let x, y;
        if (spot.w < 1) {
            x = (vw - tw) / 2; y = (vh - th) / 2;
        } else {
            const below = vh - (spot.y + spot.h), above = spot.y, right = vw - (spot.x + spot.w), left = spot.x;
            if (below >= th + gap + 8) { y = spot.y + spot.h + gap; x = spot.x + spot.w / 2 - tw / 2; }
            else if (above >= th + gap + 8) { y = spot.y - th - gap; x = spot.x + spot.w / 2 - tw / 2; }
            else if (right >= tw + gap + 8) { x = spot.x + spot.w + gap; y = spot.y + spot.h / 2 - th / 2; }
            else if (left >= tw + gap + 8) { x = spot.x - tw - gap; y = spot.y + spot.h / 2 - th / 2; }
            else { x = spot.x + spot.w - tw - 16; y = spot.y + spot.h - th - 16; }
        }
        x = Math.max(12, Math.min(x, vw - tw - 12));
        y = Math.max(12, Math.min(y, vh - th - 12));
        const t = _tour.tipCur || (_tour.tipCur = { x, y });
        t.x += (x - t.x) * k; t.y += (y - t.y) * k;
        tip.style.transform = 'translate(' + t.x.toFixed(1) + 'px,' + t.y.toFixed(1) + 'px)';
    }

    // Marke ueber die Mitte ihres Elements; ist oben kein Platz, rutscht sie ins
    // Element. Zwei Marken, die sich decken wuerden, weichen nach unten aus.
    function _tourPlaceMarks() {
        const a = _safeArea(), vw = window.innerWidth, placed = [];
        _tour.markEls.forEach(m => {
            const r = m.el.isConnected ? m.el.getBoundingClientRect() : null;
            const ok = r && r.width > 1 && r.bottom >= a.top + 10 && r.top <= a.bottom - 20;
            m.node.classList.toggle('is-off', !ok);
            if (!ok) return;
            const w = m.node.offsetWidth, h = m.node.offsetHeight;
            let x = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8));
            let y = r.top - h - 6;
            if (y < a.top) y = Math.max(a.top, r.top + 4);
            for (let n = 0; n < 4; n++) {
                const hit = placed.find(p => x < p.x + p.w + 6 && x + w + 6 > p.x && y < p.y + p.h + 4 && y + h + 4 > p.y);
                if (!hit) break;
                y = hit.y + hit.h + 4;
            }
            placed.push({ x, y, w, h });
            m.node.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
        });
    }

    function _tourSetMarks(step) {
        _tour.marks.innerHTML = '';
        _tour.markEls = [];
        if (!step || !step.marks) return;
        step.marks.forEach((m, i) => {
            const el = _q(m[0]);
            if (!_visible(el)) return;
            const n = document.createElement('span');
            n.className = 'tour-mark is-off';
            n.style.setProperty('--d', (120 + i * 90) + 'ms');
            n.textContent = _tourEN() ? m[2] : m[1];
            _tour.marks.appendChild(n);
            _tour.markEls.push({ el, node: n });
        });
        requestAnimationFrame(() => _tour.marks.classList.add('is-in'));
    }

    function _tourLand() {
        const s = _tour.spot;
        if (!s) return;
        s.classList.remove('is-land');
        void s.offsetWidth;
        s.classList.add('is-land');
    }

    // Sprechblase: Inhalt mit kurzer Ueberblendung tauschen (das alte und das neue
    // Wort sollen nicht gleichzeitig dastehen).
    async function _tourFillTip(step, area, navNote) {
        const tip = _tour.tip, steps = _getSteps(), total = steps.length, i = onboardingStep;
        const last = i === total - 1;
        const html =
            '<div class="tour-tip__bar"><i style="width:' + ((i + 1) / total * 100).toFixed(1) + '%"></i></div>' +
            '<div class="tour-tip__body">' +
                (area ? '<div class="tour-tip__where' + (navNote ? ' is-going' : '') + '">' + _renderTourIcon(step.icon, 14) +
                    '<span>' + (navNote ? _tourT('Wechsel zu ', 'Going to ') : _tourT('Du bist in ', 'You are in ')) + '<b>' + area + '</b></span></div>' : '') +
                '<h3 class="tour-tip__t">' + _stepTitle(step) + '</h3>' +
                '<p class="tour-tip__p">' + _stepText(step) + '</p>' +
                '<div class="tour-tip__foot">' +
                    '<span class="tour-tip__n">' + (i + 1) + ' / ' + total + '</span>' +
                    '<span class="tour-tip__btns">' +
                        (i > 0 ? '<button type="button" class="tour-btn tour-btn--ghost" onclick="previousOnboardingStep()" aria-label="' + _tourT('Zurück', 'Back') + '">' + _renderTourIcon('chevronLeft', 16) + '</button>' : '') +
                        (last
                            ? '<button type="button" class="tour-btn tour-btn--main" onclick="endOnboardingTour()">' + _renderTourIcon('check', 16) + '<span>' + _tourT('Fertig', 'Done') + '</span></button>'
                            : '<button type="button" class="tour-btn tour-btn--main" onclick="nextOnboardingStep()"><span>' + _tourT('Weiter', 'Next') + '</span>' + _renderTourIcon('arrowRight', 16) + '</button>') +
                    '</span>' +
                '</div>' +
            '</div>' +
            '<div class="tour-tip__hint"><span>' + (_isMobile() ? _tourT('Wischen zum Blättern', 'Swipe to browse') : _tourT('Pfeiltasten · Esc beendet', 'Arrow keys · Esc to close')) + '</span>' +
                '<button type="button" class="tour-skip" onclick="endOnboardingTour()">' + _tourT('Überspringen', 'Skip') + '</button></div>';
        if (tip.innerHTML && !_tourReduced()) {
            tip.classList.add('is-swap');
            await _tourWait(130);
        }
        tip.innerHTML = html;
        tip.classList.remove('is-swap');
    }

    // Wartet, bis eine nachgeladene Ansicht ihr Ziel gezeichnet hat (sieben Ansichten
    // laden ihr JS erst beim ersten Oeffnen, VIEW_SCRIPTS in tab-navigation.js).
    async function _tourWaitTargets(step, nr) {
        const until = Date.now() + 1600;
        let els = _stepTargets(step);
        while (!els.length && Date.now() < until) {
            await _tourWait(80);
            if (nr !== _tourRenderNr) return null;
            els = _stepTargets(step);
        }
        return els;
    }

    function _tourScrollTo(els) {
        const el = els[0];
        if (!el) return;
        const u = _unionRect(els);
        const vh = window.innerHeight;
        const room = _isMobile() ? vh * 0.55 : vh - 40;
        const inView = u.y >= 12 && u.y + Math.min(u.h, room) <= (_isMobile() ? room : vh - 12);
        if (inView) return;
        // Platz ueber dem Ziel fuer die Marken (die sitzen ueber ihrem Element).
        el.style.scrollMarginTop = '64px';
        setTimeout(() => { el.style.scrollMarginTop = ''; }, 1200);
        el.scrollIntoView({ behavior: _tourReduced() ? 'auto' : 'smooth', block: (_isMobile() || u.h > room) ? 'start' : 'center' });
    }

    async function renderOnboardingStep() {
        const nr = ++_tourRenderNr;
        _tourBuild();
        const steps = _getSteps();
        let step = steps[onboardingStep];
        const isMob = _isMobile();

        if (step.target === '#sidebar' && isMob) {
            const sb = document.getElementById('sidebar');
            if (sb) sb.classList.remove('active');
        }

        // 1) Bereichswechsel sichtbar machen: Spot auf den Menuepunkt, antippen, wechseln.
        const needSwitch = step.tab && _activeTab() !== step.tab;
        const nav = needSwitch ? _navFor(step.tab) : null;
        const area = step.tab ? _areaName(step.tab) : '';
        _tourSetMarks(null);
        if (needSwitch && nav) {
            _tour.phase = 'nav';
            const r = nav.getBoundingClientRect();
            _tour.want = { x: r.left - 4, y: r.top - 4, w: r.width + 8, h: r.height + 8, r: 10 };
            await _tourFillTip(step, area, true);
            if (nr !== _tourRenderNr) return;
            await _tourWait(_tourReduced() ? 150 : 520);
            if (nr !== _tourRenderNr) return;
            const tap = _tour.tap;
            tap.style.transform = 'translate(' + Math.round(r.left + r.width / 2) + 'px,' + Math.round(r.top + r.height / 2) + 'px)';
            tap.classList.remove('is-go'); void tap.offsetWidth; tap.classList.add('is-go');
            await _tourWait(_tourReduced() ? 50 : 220);
            if (nr !== _tourRenderNr) return;
        }
        if (needSwitch) {
            if (isMob && typeof mobNavSwitch === 'function') mobNavSwitch(step.tab);
            else if (typeof switchTab === 'function') switchTab(step.tab);
        }

        // 2) Ziel abwarten; fehlt es bei einem optionalen Schritt, in Laufrichtung weiter.
        _tour.targetEls = [];
        const els = step.target ? await _tourWaitTargets(step, nr) : [];
        if (els === null || nr !== _tourRenderNr) return;
        if (step.target && !els.length && step.optional) {
            const n = onboardingStep + _tourDir;
            if (n > 0 && n < steps.length) { onboardingStep = n; renderOnboardingStep(); return; }
        }
        _tourScrollTo(els);
        _tour.targetEls = els;
        _tour.phase = 'step';
        _tour.want = null;
        await _tourFillTip(step, area, false);
        if (nr !== _tourRenderNr) return;
        await _tourWait(_tourReduced() ? 0 : 380);
        if (nr !== _tourRenderNr) return;
        _tourLand();
        _tourSetMarks(step);
        const btn = _tour.tip.querySelector('.tour-btn--main');
        if (btn && !isMob) { try { btn.focus({ preventScroll: true }); } catch (e) {} }
    }

    function startOnboardingTour() {
        onboardingStep = 0;
        _tourDir = 1;
        onboardingActive = true;
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && _isMobile()) sidebar.classList.remove('active');
        document.addEventListener('keydown', tourKeyHandler);
        document.addEventListener('touchstart', tourTouchStartHandler, { passive: true });
        document.addEventListener('touchend', tourTouchEndHandler);
        _tourResizeHandler = () => { _tour.tipCur = null; };
        window.addEventListener('resize', _tourResizeHandler);
        if (typeof mwlEvent === 'function') mwlEvent('feature_genutzt', { feature: 'tour' });
        renderOnboardingStep();
    }

    // --- Tastatur ---
    function tourKeyHandler(e) {
        if (!onboardingActive) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); nextOnboardingStep(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); previousOnboardingStep(); }
        else if (e.key === 'Escape') { e.preventDefault(); endOnboardingTour(); }
    }

    // --- Wischen ---
    function tourTouchStartHandler(e) { tourTouchStart = e.touches[0].clientX; }
    function tourTouchEndHandler(e) {
        if (tourTouchStart === null || !onboardingActive) return;
        const diff = tourTouchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) { diff > 0 ? nextOnboardingStep() : previousOnboardingStep(); }
        tourTouchStart = null;
    }

    function launchTourConfetti() {
        const c = document.getElementById('tourConfetti');
        if (!c || _tourReduced()) return;
        const colors = ['var(--primary)', 'var(--school)', 'var(--success)', 'var(--holiday)', 'var(--text-main)'];
        for (let i = 0; i < 90; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.cssText = 'left:' + (Math.random() * 100) + '%;color:' + colors[i % colors.length] + ';font-size:' + (Math.random() * 10 + 6) + 'px;--fall-dur:' + (Math.random() * 2.5 + 2) + 's;--fall-del:' + (Math.random() * .8) + 's;';
            p.textContent = '■';
            c.appendChild(p);
        }
        setTimeout(() => { c.innerHTML = ''; }, 5500);
    }

    function nextOnboardingStep() {
        if (onboardingStep < _getSteps().length - 1) {
            _tourDir = 1;
            onboardingStep++;
            renderOnboardingStep();
        } else {
            endOnboardingTour();
        }
    }

    function previousOnboardingStep() {
        if (onboardingStep > 0) {
            _tourDir = -1;
            onboardingStep--;
            renderOnboardingStep();
        }
    }

    function jumpToStep(step) {
        _tourDir = step >= onboardingStep ? 1 : -1;
        onboardingStep = step;
        renderOnboardingStep();
    }

    function endOnboardingTour() {
        const finished = onboardingStep >= _getSteps().length - 1;
        onboardingActive = false;
        _tourRenderNr++;
        cancelAnimationFrame(_tour.raf);
        document.removeEventListener('keydown', tourKeyHandler);
        document.removeEventListener('touchstart', tourTouchStartHandler);
        document.removeEventListener('touchend', tourTouchEndHandler);
        if (_tourResizeHandler) { window.removeEventListener('resize', _tourResizeHandler); _tourResizeHandler = null; }
        const L = _tour.layer;
        _tour.layer = null;
        if (L) {
            L.classList.remove('is-on');
            setTimeout(() => L.remove(), _tourReduced() ? 0 : 220);
        }
        if (window.innerWidth < 1024) {
            const sb = document.querySelector('.sidebar');
            if (sb) sb.classList.remove('active');
        }
        if (typeof switchTab === 'function' && _activeTab() !== 'dashboard') switchTab('dashboard');
        if (finished) {
            launchTourConfetti();
            if (typeof showCustomMessage === 'function') showCustomMessage(_tourT('Tour abgeschlossen', 'Tour complete'), _tourT('Viel Erfolg mit deinem ersten Eintrag!', 'Good luck with your first entry!'), 'success');
        }
    }

    function closeQuickHelp() {
        const modal = document.getElementById('quickHelpModal');
        if (modal) modal.classList.remove('active');
    }
