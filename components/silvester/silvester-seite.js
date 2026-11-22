// ═══ SILVESTER SEITE MODULE ═══
// Bringt das Feuerwerk auf die eigenständigen Seiten. Steht als normales Skript vor </head>, gleich neben
// weihnachten-seite.js und auf denselben Seiten (tools/silvester.test.mjs hält die Liste gleich); die
// übrigen Tage des Jahres endet es in der ersten Zeile, Stil und Szene lädt es nur im Fenster nach.
// Begründung, welche Seiten bewusst OHNE Deko bleiben: Kopf von weihnachten-seite.js.
//
// Gleiche Speicherschlüssel wie die Karte im Dashboard: „Feuerwerk aus“ und „Ausblenden“ gelten überall.
(function () {
    'use strict';
    try {
        const d = new Date(), M = d.getMonth(), T = d.getDate();
        const test = localStorage.getItem('mwl_silvester_test');
        const imFenster = (M === 11 && T >= 30) || (M === 0 && (T === 1 || (T === 2 && d.getHours() < 7))) || test === '1' || test === 'finale';
        if (!imFenster) return;
        // Schlüssel tragen das NEUE Jahr (siehe silvester.js)
        const NEU = M === 0 ? d.getFullYear() : d.getFullYear() + 1;
        if (localStorage.getItem('mwl_silvester_' + NEU) === 'weg' || localStorage.getItem('mwl_silvester_ruhe_' + NEU) === '1') return;

        const root = document.documentElement;
        root.classList.add('mwl-silvester', 'mwl-silvester-deko', 'mwl-silvester-seite');
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '/components/silvester/silvester-seite.css?v=dd050f67a5';
        document.head.appendChild(css);

        const start = function () {
            const s = document.createElement('script');
            s.src = '/components/silvester/silvester-szene.js?v=1d606426c3';
            s.onload = function () { if (window.SilvesterSzene) window.SilvesterSzene.start(); };
            document.head.appendChild(s);

            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'sv-seite-aus';
            b.textContent = root.lang === 'en' ? 'Fireworks off' : 'Feuerwerk aus';
            b.addEventListener('click', function () {
                try { localStorage.setItem('mwl_silvester_ruhe_' + NEU, '1'); } catch (e) {}
                root.classList.remove('mwl-silvester-deko', 'mwl-silvester-seite');
                if (window.SilvesterSzene) window.SilvesterSzene.stop();
                b.remove();
                if (typeof mwlEvent === 'function') mwlEvent('silvester', { aktion: 'deko_aus' });
            });
            document.body.appendChild(b);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
        else start();
    } catch (e) {}
})();
