// ═══ TESTER-SEITE MODULE ═══
// /tester/ — Aktionsseite fuer den geschlossenen Play-Store-Test (Oktober 2026).
// Zeigt ausserhalb von Android einen Hinweis und zaehlt die zwei Klicks; mehr
// nicht. Derselbe Ereignisname wie der Dashboard-Banner (play-tester.js), damit
// beide Wege in /analytics/ in einer Zeile stehen.
(function () {
    'use strict';
    var android = /Android/i.test(navigator.userAgent || '');
    var hinweis = document.getElementById('tsNurAndroid');
    if (hinweis) hinweis.hidden = android;

    function zaehle(schritt) {
        if (typeof mwlEvent === 'function') mwlEvent('play_tester', { schritt: schritt, quelle: 'seite' });
    }
    var g = document.getElementById('tsGruppe');
    var p = document.getElementById('tsPlay');
    if (g) g.addEventListener('click', function () { zaehle('gruppe'); });
    if (p) p.addEventListener('click', function () { zaehle('play'); });
})();
