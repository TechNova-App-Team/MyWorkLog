// ═══ WEIHNACHTEN SEITE MODULE ═══
// Bringt den Winter (Schnee + Schneekante, Frostglas) auf die eigenständigen Seiten (Berichtsheft, Aufgaben, Rechte-Checker …). Steht
// als normales Skript vor </head>, damit die Farben vor dem ersten Zeichnen stimmen; die übrigen elf
// Monate endet es in der ersten Zeile, Stil und Szene werden nur im Fenster nachgeladen.
//
// Bewusst NICHT eingebunden (tools/weihnachten.test.mjs hält beide Listen): Rechtstexte und Kasse (sollen
// ernst und eindeutig bleiben), Schatten-Berichtsheft und Fallseiten des Rechte-Checkers (dort geht es um
// echte Probleme im Betrieb), Ausbilder und Klasse (Arbeitsansichten für Dritte, Beamer), Karteikasten
// und /traum/ (eigene 3D-Bühne, die Szene läge unsichtbar dahinter und kostete nur Akku).
//
// Gleiche Speicherschlüssel wie die Karte im Dashboard: „Deko aus“ und „Ausblenden“ gelten überall.
(function () {
    'use strict';
    try {
        const d = new Date(), M = d.getMonth(), T = d.getDate(), J = d.getFullYear();
        const imFenster = (M === 11 && (T < 27 || (T === 27 && d.getHours() < 7))) || localStorage.getItem('mwl_weihnachten_test') === '1';
        if (!imFenster) return;
        if (localStorage.getItem('mwl_weihnachten_' + J) === 'weg' || localStorage.getItem('mwl_weihnachten_ruhe_' + J) === '1') return;

        const root = document.documentElement;
        root.classList.add('mwl-weihnachten', 'mwl-weihnachten-deko', 'mwl-weihnachten-seite');
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '/components/weihnachten/weihnachten-seite.css?v=70d7f781d5';
        document.head.appendChild(css);

        const start = function () {
            const s = document.createElement('script');
            s.src = '/components/weihnachten/weihnachten-szene.js?v=b25639dfc7';
            s.onload = function () { if (window.WeihnachtsSzene) window.WeihnachtsSzene.start(); };
            document.head.appendChild(s);

            // Ohne die Karte aus dem Dashboard braucht jede Seite ihren eigenen Ausschalter.
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wn-seite-aus';
            b.textContent = root.lang === 'en' ? 'Decorations off' : 'Deko aus';
            b.addEventListener('click', function () {
                try { localStorage.setItem('mwl_weihnachten_ruhe_' + J, '1'); } catch (e) {}
                root.classList.remove('mwl-weihnachten-deko', 'mwl-weihnachten-seite');
                if (window.WeihnachtsSzene) window.WeihnachtsSzene.stop();
                b.remove();
                if (typeof mwlEvent === 'function') mwlEvent('weihnachten', { aktion: 'deko_aus' });
            });
            document.body.appendChild(b);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
        else start();
    } catch (e) {}
})();
