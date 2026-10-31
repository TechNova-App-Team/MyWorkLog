// ═══ HALLOWEEN MODULE ═══
// Laternen-Karte vom 31.10. 0 Uhr bis 01.11. 13 Uhr (Fenster wie beim Geburtstag
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

    // ── Karte ───────────────────────────────────────────────────────────
    function init() {
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
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
