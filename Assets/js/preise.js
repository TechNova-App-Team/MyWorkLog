// ═══ PREISE MODULE ═══
// /preise/ (Entwurf 16.10.2026): Stapel auffaechern + "Vormerken".
// Vormerken misst die Nachfrage je Tarif OHNE Personendaten: ein mwlEvent mit
// der Tarif-Kategorie, sonst nichts (Regel aus CLAUDE.md: nur Kategorien). Der
// Merker im localStorage verhindert nur, dass dasselbe Geraet doppelt zaehlt.
(function () {
    'use strict';
    var MERK = 'mwl_preise_vorgemerkt';
    var EN = document.documentElement.lang === 'en';
    var L = function (de, en) { return EN ? en : de; };
    var HAKEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

    function ev(name, props) { if (typeof mwlEvent === 'function') mwlEvent(name, props || {}); }
    function gemerkt() {
        try { var v = JSON.parse(localStorage.getItem(MERK) || '[]'); return Array.isArray(v) ? v : []; }
        catch (e) { return []; }
    }
    function zeige(b) {
        b.classList.add('is-gemerkt');
        b.setAttribute('aria-pressed', 'true');
        b.innerHTML = HAKEN + '<span>' + L('Vorgemerkt', 'Noted') + '</span>';
    }

    function stapel() {
        var s = document.getElementById('prStapel');
        if (!s) return;
        var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Zwei Bilder warten, damit der Grundzustand (aufeinander) einmal gemalt ist —
        // sonst springt das Blatt ohne Uebergang in die Endlage.
        if (ruhig) s.classList.add('is-auf');
        else requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(function () { s.classList.add('is-auf'); }, 250); }); });
    }

    function vormerken() {
        var schon = gemerkt();
        document.querySelectorAll('.pr-vormerken').forEach(function (b) {
            var t = b.getAttribute('data-tarif');
            b.setAttribute('aria-pressed', 'false');
            if (schon.indexOf(t) >= 0) zeige(b);
            b.addEventListener('click', function () {
                if (b.classList.contains('is-gemerkt')) return;
                var liste = gemerkt();
                if (liste.indexOf(t) < 0) liste.push(t);
                try { localStorage.setItem(MERK, JSON.stringify(liste)); } catch (e) { }
                ev('preise_vormerken', { tarif: t === 'plus' ? 'plus' : 'pass' });
                zeige(b);
            });
        });
    }

    function start() {
        stapel();
        vormerken();
        ev('preise_geoeffnet', { vorgemerkt: gemerkt().length });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
