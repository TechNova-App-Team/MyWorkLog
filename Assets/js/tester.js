// ═══ TESTER-SEITE MODULE ═══
// /tester/ — Aktionsseite fuer den geschlossenen Play-Store-Test (Oktober 2026).
// Zeigt ausserhalb von Android einen Hinweis, startet den einen Lade-Moment
// (Zeilen + Plaetze, CSS in tester.css) und zaehlt die zwei Klicks. Derselbe
// Ereignisname wie der Dashboard-Banner (play-tester.js), damit beide Wege in
// /analytics/ in einer Zeile stehen.
(function () {
    'use strict';
    var android = /Android/i.test(navigator.userAgent || '');
    var hinweis = document.getElementById('tsNurAndroid');
    if (hinweis) hinweis.hidden = android;

    // .js setzt der Kopf der Seite (inline, vor dem ersten Bild) samt Sicherung.
    var hero = document.getElementById('tsHero');
    if (hero) {
        var los = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('bereit'); }); }); };
        // Auf die Schrift warten, sonst faehrt die Zeile in der Ersatzschrift hoch und springt.
        if (document.fonts && document.fonts.ready) {
            var fertig = false;
            document.fonts.ready.then(function () { if (!fertig) { fertig = true; los(); } });
            setTimeout(function () { if (!fertig) { fertig = true; los(); } }, 900);
        } else { los(); }
    }

    function zaehle(schritt) {
        if (typeof mwlEvent === 'function') mwlEvent('play_tester', { schritt: schritt, quelle: 'seite' });
    }
    var g = document.getElementById('tsGruppe');
    var p = document.getElementById('tsPlay');
    if (g) g.addEventListener('click', function () { zaehle('gruppe'); });
    if (p) p.addEventListener('click', function () { zaehle('play'); });
})();
