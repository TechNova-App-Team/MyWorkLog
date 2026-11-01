// ═══ HALLOWEEN MODULE ═══
// Laternen-Karte vom 31.10. 0 Uhr bis 02.11. 7 Uhr (Fenster wie beim Geburtstag
// ueber die Nacht hinaus, sonst sieht es kaum jemand). Markup: dashboard.html
// (#hwCard), Klassen html.mwl-halloween / .mwl-halloween-karte setzt das
// Pre-Apply-Skript im <head>. Hier nur, was JS braucht: Spruch wechseln
// (Suesses), Fledermaeuse aus der Laterne fliegen lassen (Saures/Laterne),
// Karte ausblenden.
//
// Testen an einem anderen Tag: localStorage.mwl_halloween_test = '1', neu laden.
// Im Automations-Tab steht WAAPI still (document.hidden) — die Fledermaeuse
// dort nicht nach Standbild beurteilen, sondern headless (tools/halloween.test.mjs).
(function () {
    'use strict';

    const root = document.documentElement;
    if (!root.classList.contains('mwl-halloween')) return;

    const LS_STAND  = 'mwl_halloween_' + new Date().getFullYear();   // 'weg'
    const REDUZIERT = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Deutsche Strings; /en/ uebersetzt Assets/js/i18n-runtime.js (MAP).
    // Rechtsangaben gegengeprueft: §4 ArbZG (30 min ab 6 h), §11 JArbSchG
    // (unter 18: 30 min ab 4,5 h), §17 Abs. 7 BBiG (Mehrarbeit verguetet/ausgeglichen).
    const SUESSES = [
        'Geister machen keine Pause. Du schon: Ab sechs Stunden Arbeit stehen dir 30 Minuten zu, unter 18 schon ab viereinhalb.',
        'Untote arbeiten umsonst. Du nicht: Überstunden in der Ausbildung werden bezahlt oder mit Freizeit ausgeglichen.',
        'Wer heute Nacht vergisst auszustempeln, hat morgen eine 30-Stunden-Schicht. Die Stempeluhr spukt nicht, sie zählt nur weiter.',
        'Das Gruseligste an Halloween ist ein Berichtsheft, das drei Wochen hinterherhängt.',
        'Kürbis schnitzen zählt leider nicht als Arbeitszeit. Außer du lernst Gartenbau.'
    ];
    const SAURES = 'Ausgeflogen. Angefasst haben sie nichts, deine Einträge sind alle noch da.';

    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function ereignis(aktion) { if (typeof mwlEvent === 'function') mwlEvent('halloween', { aktion: aktion }); }

    // ── Fledermaeuse ────────────────────────────────────────────────────
    const FM_SVG =
        '<svg viewBox="0 0 40 20" aria-hidden="true" focusable="false">' +
        '<g class="hw-fm-fluegel" fill="currentColor">' +
        '<path d="M19 10.5C15.5 4 9.5 2.2 1 5.5c3.6.6 5.4 2.8 5.2 6.2 1.9-1.4 4.2-1.3 6 .3.9-1.3 2.2-1.9 3.8-1.6Z"/>' +
        '<path d="M21 10.5C24.5 4 30.5 2.2 39 5.5c-3.6.6-5.4 2.8-5.2 6.2-1.9-1.4-4.2-1.3-6 .3-.9-1.3-2.2-1.9-3.8-1.6Z"/>' +
        '</g>' +
        '<path fill="currentColor" d="M18.2 7.2 18.8 4.6 19.9 6.6h.2l1.1-2 .6 2.6c.9.8 1.4 2 1.4 3.4 0 2.6-1.4 5-3.2 5s-3.2-2.4-3.2-5c0-1.4.5-2.6 1.4-3.4Z"/>' +
        '</svg>';

    let fliegt = false;
    function fledermaeuse(von) {
        if (REDUZIERT || fliegt || typeof Element.prototype.animate !== 'function') return;
        fliegt = true;
        const r = von.getBoundingClientRect();
        const x0 = r.left + r.width / 2, y0 = r.top + r.height * 0.6;
        const W = window.innerWidth, H = window.innerHeight;
        const flug = document.createElement('div');
        flug.className = 'hw-flug';
        flug.setAttribute('aria-hidden', 'true');
        document.body.appendChild(flug);

        const ANZAHL = 7;
        let offen = ANZAHL;
        for (let i = 0; i < ANZAHL; i++) {
            const fm = document.createElement('div');
            fm.className = 'hw-fm';
            const groesse = 46 + Math.random() * 26;
            fm.style.width = groesse + 'px';
            fm.style.height = (groesse / 2) + 'px';
            fm.style.setProperty('--schlag', (110 + Math.random() * 70).toFixed(0) + 'ms');
            fm.innerHTML = FM_SVG;
            flug.appendChild(fm);

            // Die Karte steht ganz oben: ein Faecher nach oben waere nach wenigen
            // Pixeln aus dem Fenster (so passiert, 31.10.2026). Deshalb schwingt
            // jede Fledermaus erst durch die Seite (Zwischenpunkt im Dashboard)
            // und verschwindet dann ueber den rechten oder oberen Rand.
            const xm = W * (0.22 + 0.62 * (i / (ANZAHL - 1))) + (Math.random() * 80 - 40);
            const ym = H * (0.28 + Math.random() * 0.42);
            const nachOben = Math.random() < 0.45;
            const x1 = nachOben ? xm + (Math.random() * 0.5 - 0.1) * W : W + 80 + Math.random() * 120;
            const y1 = nachOben ? -80 - Math.random() * 100 : ym - H * (0.2 + Math.random() * 0.5);
            const winkel = Math.atan2(y1 - ym, x1 - xm);
            const kipp = Math.cos(winkel) * 25;
            const pos = (x, y) => 'translate(' + (x - groesse / 2).toFixed(1) + 'px,' + (y - groesse / 4).toFixed(1) + 'px)';

            const a = fm.animate([
                { transform: pos(x0, y0) + ' scale(0.35) rotate(0deg)', opacity: 0 },
                { transform: pos(x0, y0 - 6) + ' scale(0.6) rotate(0deg)', opacity: 1, offset: 0.08 },
                { transform: pos(xm, ym) + ' scale(1) rotate(' + (-kipp).toFixed(1) + 'deg)', opacity: 1, offset: 0.45 },
                { transform: pos(x1, y1) + ' scale(1.3) rotate(' + kipp.toFixed(1) + 'deg)', opacity: 1 }
            ], {
                duration: 1500 + Math.random() * 900,
                delay: i * 55 + Math.random() * 40,
                easing: 'cubic-bezier(0.45, 0, 0.75, 1)',   // Abflug: langsam los, dann weg
                fill: 'both'
            });
            a.onfinish = a.oncancel = function () {
                fm.remove();
                if (--offen === 0) { flug.remove(); fliegt = false; }
            };
        }
    }

    // ── Geisterhaus: Spuk ueber der ganzen App ──────────────────────────
    // Neue Strings als DE/EN-Paar statt ueber die MAP in i18n-runtime.js:
    // die Geister-Meldung traegt eine Zahl, die MAP kennt nur feste Saetze.
    const EN = function () { return root.lang === 'en'; };
    const T  = function (de, en) { return EN() ? en : de; };
    const LS_RUHE   = 'mwl_halloween_ruhe_' + new Date().getFullYear();   // '1' = Spuk aus
    const LS_GEFANGEN = 'mwl_halloween_geister_' + new Date().getFullYear();

    const GEIST_SVG =
        '<svg viewBox="0 0 54 64" aria-hidden="true" focusable="false">' +
        '<g class="hw-geist-saum"><path fill="currentColor" d="M27 2C13.7 2 4 12.4 4 26v34l6.5-5 6.4 5 6.6-5 6.5 5 6.6-5 6.4 5 6.5-5V26C50 12.4 40.3 2 27 2Z"/></g>' +
        '<g class="hw-geist-augen"><ellipse cx="19.5" cy="25" rx="3.6" ry="5"/><ellipse cx="34.5" cy="25" rx="3.6" ry="5"/><ellipse cx="27" cy="38" rx="3.4" ry="4.2"/></g>' +
        '</svg>';
    const NETZ_SVG =
        '<svg viewBox="0 0 150 150" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true" focusable="false">' +
        // Speichen vom Eckpunkt oben rechts
        '<path d="M150 0 0 0M150 0 18 62M150 0 52 106M150 0 98 140M150 0 150 150"/>' +
        // Fangfaeden: durchhaengende Boegen zwischen den Speichen
        '<path d="M126 0Q128 6 128 10Q133 14 133 21Q138 22 140 26Q145 28 150 26"/>' +
        '<path d="M96 0Q99 12 98 23Q108 30 110 44Q122 47 127 57Q140 58 150 60"/>' +
        '<path d="M64 0Q69 19 67 36Q83 47 86 70Q105 76 113 92Q132 92 150 95"/>' +
        '<path d="M30 0Q38 27 36 50Q58 66 62 96Q86 105 98 126Q124 125 150 130"/>' +
        '</svg>';

    let spuk = null;   // Ebene am <body>

    function ruhe() { return root.classList.contains('mwl-halloween-ruhe'); }
    function sichtbar() { return !document.hidden; }

    function spukEbene() {
        spuk = document.createElement('div');
        spuk.className = 'hw-spuk';
        spuk.innerHTML =
            '<div class="hw-nebel" aria-hidden="true"></div>' +
            '<div class="hw-netz" aria-hidden="true">' + NETZ_SVG + '</div>' +
            '<div class="hw-abseil" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"><path d="M9 11 4 7M9 13H3M9 15l-5 4M15 11l5-4M15 13h6M15 15l5 4"/></g><ellipse cx="12" cy="13" rx="3.4" ry="4.2"/><circle cx="12" cy="7.6" r="2.4"/></svg></div>' +
            '<div class="hw-augen" aria-hidden="true"><i></i><i></i></div>';
        document.body.appendChild(spuk);
    }

    // Augen tauchen im Nebel auf, schauen ein paar Sekunden, verschwinden
    function augen() {
        const a = spuk && spuk.querySelector('.hw-augen');
        if (!a) return;
        function zeigen() {
            if (!ruhe() && sichtbar()) {
                const W = window.innerWidth, H = window.innerHeight;
                const links = Math.random() < 0.5;
                a.style.left = (links ? 0.04 + Math.random() * 0.22 : 0.70 + Math.random() * 0.24) * W + 'px';
                a.style.top  = (H - 40 - Math.random() * H * 0.14) + 'px';
                a.classList.add('is-da');
                setTimeout(function () { a.classList.remove('is-da'); }, 5200 + Math.random() * 3000);
            }
            setTimeout(zeigen, 16000 + Math.random() * 14000);
        }
        setTimeout(zeigen, 6000);
    }

    // Geist schwebt quer durchs Bild; wer ihn antippt, faengt ihn
    function geist() {
        if (REDUZIERT || ruhe() || !sichtbar() || typeof Element.prototype.animate !== 'function') return;
        if (spuk.querySelector('.hw-geist')) return;
        const W = window.innerWidth, H = window.innerHeight;
        const g = document.createElement('button');
        g.type = 'button';
        g.className = 'hw-geist';
        g.setAttribute('aria-label', T('Geist fangen', 'Catch the ghost'));
        g.innerHTML = GEIST_SVG;
        spuk.appendChild(g);

        const vonLinks = Math.random() < 0.5;
        const x0 = vonLinks ? -70 : W + 20, x1 = vonLinks ? W + 20 : -70;
        const yBasis = H * (0.25 + Math.random() * 0.45);
        const spiegel = vonLinks ? '' : ' scaleX(-1)';
        const bild = [];
        const SCHRITTE = 8;
        for (let s = 0; s <= SCHRITTE; s++) {
            const t = s / SCHRITTE;
            const x = x0 + (x1 - x0) * t;
            const y = yBasis + Math.sin(t * Math.PI * 3) * 38;
            bild.push({
                transform: 'translate(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px)' + spiegel,
                opacity: s === 0 || s === SCHRITTE ? 0 : 0.88
            });
        }
        const flug = g.animate(bild, { duration: 13000 + Math.random() * 5000, easing: 'linear', fill: 'both' });
        flug.onfinish = function () { g.remove(); };

        g.addEventListener('click', function () {
            const r = g.getBoundingClientRect();
            flug.pause();
            const mitte = 'translate(' + r.left.toFixed(0) + 'px,' + r.top.toFixed(0) + 'px)' + spiegel;
            const weg = g.animate([
                { transform: mitte + ' scale(1)', opacity: 0.9, filter: 'blur(0)' },
                { transform: mitte + ' scale(1.5)', opacity: 0, filter: 'blur(6px)' }
            ], { duration: 360, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' });
            weg.onfinish = function () { flug.cancel(); g.remove(); };
            gefangen();
        }, { once: true });
    }

    function gefangen() {
        let n = parseInt(lsGet(LS_GEFANGEN), 10) || 0;
        lsSet(LS_GEFANGEN, String(++n));
        ereignis('geist');
        if (typeof showToast !== 'function') return;
        const text = n === 1
            ? T('Dein erster. Er wollte nur wissen, ob du heute schon ausgestempelt hast.', 'Your first one. It only wanted to know whether you clocked out today.')
            : T(n + ' Geister gefangen. Die Stempeluhr ist beeindruckt.', n + ' ghosts caught. The time clock is impressed.');
        showToast(T('Buh! Geist gefangen.', 'Boo! Ghost caught.'), text, 'info',
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>');
    }

    // Licht flackert: drei Einbrueche in unter einer Sekunde, alle paar Minuten
    function flackern() {
        if (REDUZIERT || ruhe() || !sichtbar() || typeof Element.prototype.animate !== 'function') return;
        const f = document.createElement('div');
        f.className = 'hw-flacker';
        f.setAttribute('aria-hidden', 'true');
        document.body.appendChild(f);
        const a = f.animate([
            { opacity: 0 }, { opacity: 0.55, offset: 0.08 }, { opacity: 0.05, offset: 0.18 },
            { opacity: 0.7, offset: 0.3 }, { opacity: 0.2, offset: 0.42 }, { opacity: 0.45, offset: 0.5 },
            { opacity: 0 }
        ], { duration: 900, easing: 'steps(1, end)' });
        a.onfinish = a.oncancel = function () { f.remove(); };
    }

    function takt(fn, erst, min, streu) {
        setTimeout(function los() { fn(); setTimeout(los, min + Math.random() * streu); }, erst);
    }

    // Begruessung im Dashboard (dashboard-neu.js, laedt vor diesem Skript).
    // dnRenderHero ist eine Funktions-Deklaration im klassischen Skript, also
    // eine globale Bindung — das Ersetzen ueber window greift auch fuer die
    // Aufrufe innerhalb von dashboard-neu.js.
    const GRUSS = [
        [6,  'Geisterstunde',       'Witching hour'],
        [11, 'Schaurigen Morgen',   'Eerie morning'],
        [17, 'Gespenstischen Tag',  'Ghostly afternoon'],
        [22, 'Gruseligen Abend',    'Spooky evening'],
        [24, 'Unheimliche Nacht',   'Haunted night']
    ];
    const ZITATE = [
        ['Wer nicht ausstempelt, spukt bis morgen früh durch die Stempeluhr.', 'Forget to clock out and you haunt the time clock until morning.'],
        ['Heute Nacht zählt jede Minute. Besonders die unbezahlten.', 'Tonight every minute counts. Especially the unpaid ones.'],
        ['Im Keller stapeln sich die Berichtshefte. Und sie flüstern.', 'The report books are piling up in the basement. And they whisper.']
    ];
    function gruss() {
        const gEl = document.getElementById('dnGreet'), nEl = document.getElementById('dnName');
        if (!gEl || !nEl) return;
        const h = new Date().getHours();
        const g = GRUSS.find(function (z) { return h < z[0]; });
        const wort = T(g[1], g[2]);
        const name = (typeof mwlAnzeigeName === 'function') ? mwlAnzeigeName() : '';
        if (name) gEl.textContent = wort + ',';
        else {
            gEl.textContent = T('Willkommen zurück,', 'Welcome back,');
            nEl.innerHTML = '';
            nEl.appendChild(document.createTextNode(wort));
            const p = document.createElement('span'); p.className = 'dn-dotmark'; p.textContent = '.';
            nEl.appendChild(p);
        }
        const q = document.getElementById('dnQuote');
        const z = ZITATE[new Date().getHours() % ZITATE.length];
        if (q) q.textContent = EN() ? '“' + z[1] + '”' : '„' + z[0] + '“';
    }
    if (typeof window.dnRenderHero === 'function') {
        const original = window.dnRenderHero;
        window.dnRenderHero = function () {
            const r = original.apply(this, arguments);
            try { gruss(); } catch (e) {}
            return r;
        };
    }

    function spukKnopf() {
        const b = document.getElementById('hwSpuk'), t = document.getElementById('hwSpukText');
        if (!b || !t) return;
        function zeigen() {
            const aus = ruhe();
            b.setAttribute('aria-pressed', aus ? 'false' : 'true');
            t.textContent = aus ? T('Spuk an', 'Spooks on') : T('Spuk aus', 'Spooks off');
        }
        zeigen();
        b.addEventListener('click', function () {
            const aus = !ruhe();
            root.classList.toggle('mwl-halloween-ruhe', aus);
            lsSet(LS_RUHE, aus ? '1' : '');
            const g = spuk && spuk.querySelector('.hw-geist');
            if (aus && g) g.remove();
            zeigen();
            ereignis(aus ? 'ruhe' : 'spuk');
        });
    }

    function spukStart() {
        spukEbene();
        gruss();
        spukKnopf();
        if (REDUZIERT) return;
        augen();
        takt(geist, 9000, 45000, 45000);
        takt(flackern, 75000, 150000, 120000);
    }

    // ── Karte ───────────────────────────────────────────────────────────
    function init() {
        spukStart();
        const card = document.getElementById('hwCard');
        if (!card || !root.classList.contains('mwl-halloween-karte')) return;
        const laterne = document.getElementById('hwLaterne');
        const lead    = document.getElementById('hwLead');

        function text(t) {
            lead.textContent = t;
            lead.classList.remove('is-neu');
            void lead.offsetWidth;   // Animation neu starten, auch beim gleichen Text
            lead.classList.add('is-neu');
        }
        function aufflackern() {
            card.classList.remove('is-flackert');
            void card.offsetWidth;
            card.classList.add('is-flackert');
        }
        card.addEventListener('animationend', function (e) {
            if (e.animationName === 'hwAufflammen') card.classList.remove('is-flackert');
        });

        // Ohne Wiederholung durch alle Sprueche, dann von vorn gemischt
        let stapel = [];
        let letzter = -1;
        function naechsterSpruch() {
            if (!stapel.length) {
                stapel = SUESSES.map(function (_, i) { return i; }).sort(function () { return Math.random() - 0.5; });
                if (stapel[stapel.length - 1] === letzter) stapel.unshift(stapel.pop());
            }
            letzter = stapel.pop();
            return SUESSES[letzter];
        }

        function saures(quelle) {
            aufflackern();
            fledermaeuse(laterne);
            text(SAURES);
            ereignis(quelle);
        }

        document.getElementById('hwSuess').addEventListener('click', function () {
            aufflackern();
            text(naechsterSpruch());
            ereignis('suesses');
        });
        document.getElementById('hwSauer').addEventListener('click', function () { saures('saures'); });
        laterne.addEventListener('click', function () { saures('laterne'); });

        document.getElementById('hwClose').addEventListener('click', function () {
            lsSet(LS_STAND, 'weg');
            root.classList.remove('mwl-halloween-karte');   // Marken bleiben orange
            ereignis('weg');
        });
    }

    if (lsGet(LS_STAND) === 'weg') root.classList.remove('mwl-halloween-karte');
    if (lsGet(LS_RUHE) === '1') root.classList.add('mwl-halloween-ruhe');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
