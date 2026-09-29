/**
 * Touch & Mobile Optimizations — MyWorkLog
 * ────────────────────────────────────────────────────────────────────────────
 * Verbessert die Touch-Bedienung auf Handy/Tablet, OHNE Zoom oder Scroll zu
 * blockieren — die Seite erlaubt bewusst `user-scalable=yes` (Barrierefreiheit).
 * Kein einziges preventDefault(), alle Listener passive: diese Datei kann keine
 * Geste abfangen. `touch-action: manipulation` erlaubt Scrollen UND Pinch-Zoom
 * und nimmt nur den Doppeltipp-Zoom (= die 300 ms Tippverzoegerung).
 *
 * Bis 2026-09-29 standen hier zusaetzlich --vh / --viewport-height /
 * --keyboard-inset, is-ios / is-android / is-standalone / is-no-touch, --safe-*
 * und tmoHaptic / [data-haptic]. NIEMAND hat sie gelesen (grep ueber components,
 * Assets, pages). Die drei Variablen wurden trotzdem bei jedem visualViewport-
 * Scroll an <html> geschrieben und liessen den ganzen Baum neu rechnen. Wer so
 * etwas wieder braucht: erst den Leser bauen, dann den Schreiber.
 *
 * Idempotent: mehrfacher Aufruf bindet nicht doppelt.
 */
(function () {
    'use strict';

    // ── Basis-CSS (einmalig injiziert) ─────────────────────────────────────
    function injectBaseCSS() {
        if (document.getElementById('tmo-style')) return;
        var css = [
            // Tap-Highlight & 300 ms-Doppeltipp-Verzögerung weg — pinch-zoom bleibt erlaubt
            'a,button,[role="button"],.btn,input,select,textarea,label,summary{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
            // Scroll-Ketten in Overlays begrenzen (kein versehentliches Weiterscrollen der Seite darunter)
            '.modal,[role="dialog"],.sheet{overscroll-behavior:contain;}',
            // Sanftes Druck-Feedback — nur auf Touch, klemmt nie (Klasse per JS delegiert)
            '.is-touch .tmo-pressed{opacity:.62;transition:opacity .06s ease,transform .06s ease;}',
            '@media (prefers-reduced-motion:no-preference){.is-touch .tmo-pressed{transform:scale(.97);}}'
        ].join('\n');
        var s = document.createElement('style');
        s.id = 'tmo-style';
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
    }

    // ── Tastatur offen? → .is-keyboard-open an <html> ──────────────────────
    // Leser: mobile-nav.css blendet die untere Leiste aus, solange die
    // Bildschirm-Tastatur steht. visualViewport kennt die Tastatur, innerHeight nicht.
    function setupKeyboardClass(root) {
        var vv = window.visualViewport;
        var raf = 0;
        var open = null;
        function apply() {
            raf = 0;
            // Erst lesen, dann schreiben — und nur bei einem Wechsel. Jede
            // Aenderung am <html> macht den ganzen Baum (~10.000 Elemente)
            // schmutzig, und dieser Handler laeuft bei jedem visualViewport-Scroll.
            var innerH = window.innerHeight;
            var kb = vv ? Math.max(0, Math.round(innerH - vv.height - vv.offsetTop)) : 0;
            var now = kb > 120;
            if (now !== open) {
                open = now;
                root.classList.toggle('is-keyboard-open', now);
            }
        }
        function schedule() { if (!raf) raf = requestAnimationFrame(apply); }
        apply();
        window.addEventListener('resize', schedule, { passive: true });
        window.addEventListener('orientationchange', schedule, { passive: true });
        if (vv) {
            vv.addEventListener('resize', schedule, { passive: true });
            vv.addEventListener('scroll', schedule, { passive: true });
        }
    }

    // ── Delegiertes Druck-Feedback ─────────────────────────────────────────
    // Ein Satz Listener am document deckt ALLE (auch dynamisch eingefügte)
    // Tappables ab. Wird über pointer/touch-cancel, scroll und blur garantiert
    // wieder entfernt → kein „hängender" gedrückter Button mehr.
    // `button` deckt jeden Knopf ab; eigene Klassen stehen hier nur fuer
    // Nicht-Knoepfe (Links, divs).
    function setupPressFeedback() {
        var SEL = 'button, .btn, [role="button"], a.back-btn, .nav-item';
        var current = null;
        function press(e) {
            var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
            if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
            current = el;
            el.classList.add('tmo-pressed');
        }
        function release() {
            if (current) { current.classList.remove('tmo-pressed'); current = null; }
        }
        document.addEventListener('pointerdown', press, { passive: true });
        document.addEventListener('pointerup', release, { passive: true });
        document.addEventListener('pointercancel', release, { passive: true });
        document.addEventListener('touchend', release, { passive: true });
        document.addEventListener('touchcancel', release, { passive: true });
        window.addEventListener('scroll', release, { passive: true, capture: true });
        window.addEventListener('blur', release);
    }

    // ── Tastatur-bewusstes Fokus-Scrollen ──────────────────────────────────
    // Fokussiert man auf dem Handy ein Textfeld, verdeckt die Tastatur es oft.
    // Nach dem Öffnen wird das Feld in die sichtbare Mitte gescrollt.
    function setupKeyboardAwareFocus() {
        document.addEventListener('focusin', function (e) {
            var el = e.target;
            if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
            if (/^(checkbox|radio|button|submit|range|color)$/.test(el.type || '')) return;
            setTimeout(function () {
                try {
                    if (typeof el.scrollIntoView === 'function' && document.activeElement === el) {
                        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    }
                } catch (err) { /* noop */ }
            }, 300);
        });
    }

    // ── Init (idempotent) ──────────────────────────────────────────────────
    function init() {
        if (window.__tmoInitialized) return;
        window.__tmoInitialized = true;

        var root = document.documentElement;
        var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

        // Viewport-Masse VOR Klasse und Stylesheet lesen: als defer-Skript
        // laeuft init() direkt nach dem Parser auf einem sauberen Baum, die
        // Lesung kostet dann nichts. Erst eine Klasse am <html> oder ein neues
        // <style> davor erzwingt einen kompletten Style-Durchlauf (gemessen
        // 2 x 12 ms Desktop, vor dem ersten Paint).
        setupKeyboardClass(root);

        injectBaseCSS();
        if (isTouch) {
            root.classList.add('is-touch');
            setupPressFeedback();
            setupKeyboardAwareFocus();
        }
    }

    // Für den expliziten Aufruf aus onboarding.js exportieren …
    if (typeof window !== 'undefined') {
        window.initializeTouchOptimizations = init;
    }
    // … und zusätzlich selbst starten (greift auf Standalone-Seiten, die die
    // Funktion sonst nie aufrufen). Der Idempotenz-Guard verhindert Doppel-Init.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
