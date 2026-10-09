// ═══ PLAY-TESTER MODULE ═══
// Aufruf fuer den geschlossenen Test bei Google Play (Oktober 2026). Google
// verlangt fuer neue Privatkonten 12 Tester ueber 14 Tage, bevor die App
// oeffentlich erscheinen darf. Beitritt laeuft ueber die Google Group
// myworklog-tester (Pflicht: nur Gruppenmitglieder sehen den Test).
//
// Gezeigt wird der Banner nur, wenn er helfen kann:
//   • auf Android (iPhone-Nutzer koennen nicht testen),
//   • nicht in der installierten App selbst (Trusted Web Activity) — dort ist
//     man schon Tester. Erkannt am Referrer android-app://de.myworklog.app oder
//     an der Start-URL ?utm_source=android, gemerkt in mwl_twa,
//   • bis TESTER_BIS — danach ist der Test vorbei und der Banner waere Muell.
//     Absicht des Nutzers: der Aufruf ist zeitlich begrenzt, nicht vergessen.
(function () {
    'use strict';

    const TESTER_BIS = '2026-11-30';
    const LS_NEIN = 'mwl_tester_nein';
    const LS_TWA = 'mwl_twa';

    function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function schreib(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

    function inDerApp() {
        if (lies(LS_TWA)) return true;
        const ref = String(document.referrer || '');
        const utm = /[?&]utm_source=android(&|$)/.test(location.search);
        if (ref.indexOf('android-app://de.myworklog.app') === 0 || utm) { schreib(LS_TWA, '1'); return true; }
        return false;
    }

    function heute() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function testerApplyBanner() {
        const b = document.getElementById('testerBanner');
        if (!b) return;
        const zeigen = /Android/i.test(navigator.userAgent || '') && !inDerApp() && !lies(LS_NEIN) && heute() <= TESTER_BIS;
        b.style.display = zeigen ? 'flex' : 'none';
    }

    function testerSchritt(schritt) {
        if (typeof mwlEvent === 'function') mwlEvent('play_tester', { schritt: schritt });
    }

    function testerAblehnen() {
        schreib(LS_NEIN, '1');
        testerApplyBanner();
        testerSchritt('nein');
    }

    window.testerApplyBanner = testerApplyBanner;
    window.testerSchritt = testerSchritt;
    window.testerAblehnen = testerAblehnen;

    // defer: DOM ist beim Ausfuehren schon geparst.
    testerApplyBanner();
})();
