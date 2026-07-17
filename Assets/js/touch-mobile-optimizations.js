/**
 * Touch & Mobile Optimizations — MyWorkLog
 * ────────────────────────────────────────────────────────────────────────────
 * Verbessert die Touch-Bedienung auf Handy/Tablet, OHNE Zoom oder Scroll zu
 * blockieren — die Seite erlaubt bewusst `user-scalable=yes` (Barrierefreiheit).
 *
 * Enthält:
 *   1. Touch-/Plattform-Klassen an <html> (is-touch / is-ios / is-standalone …)
 *   2. Basis-CSS: Tap-Delay weg (touch-action), Scroll-Ketten begrenzen, Safe-Area
 *   3. Robuste Viewport-Metriken als CSS-Vars: --vh, --viewport-height,
 *      --keyboard-inset (Overlap der Bildschirm-Tastatur) + .is-keyboard-open
 *   4. Delegiertes Druck-Feedback (funktioniert auch für später eingefügte
 *      Elemente; klemmt nie dank pointercancel/touchcancel/scroll/blur)
 *   5. Tastatur-bewusstes Fokus-Scrollen für Eingabefelder
 *   6. Optionales Haptik-Feedback ([data-haptic] + window.tmoHaptic())
 *
 * Idempotent: mehrfacher Aufruf bindet nicht doppelt. Alle Listener passive.
 */
(function () {
    'use strict';

    // ── Basis-CSS (einmalig injiziert) ─────────────────────────────────────
    function injectBaseCSS() {
        if (document.getElementById('tmo-style')) return;
        var css = [
            // Tap-Highlight & 300 ms-Doppeltipp-Verzögerung weg — pinch-zoom bleibt erlaubt
            'a,button,[role="button"],.btn,input,select,textarea,label,summary{touch-action:manipulation;-webkit-tap-highlight-color:transparent;}',
            // Scroll-Ketten in Overlays/Listen begrenzen (kein versehentliches Weiterscrollen der Seite darunter)
            '.modal,[role="dialog"],.sheet,.table-scroll,.city-grid,.chip-rail,.map-side-table{overscroll-behavior:contain;}',
            // Safe-Area-Variablen für Notch-/Rundecken-Geräte bereitstellen
            ':root{--safe-top:env(safe-area-inset-top,0px);--safe-bottom:env(safe-area-inset-bottom,0px);--safe-left:env(safe-area-inset-left,0px);--safe-right:env(safe-area-inset-right,0px);}',
            // Sanftes Druck-Feedback — nur auf Touch, klemmt nie (Klasse per JS delegiert)
            '.is-touch .tmo-pressed{opacity:.62;transition:opacity .06s ease,transform .06s ease;}',
            '@media (prefers-reduced-motion:no-preference){.is-touch .tmo-pressed:not(.no-tap-scale){transform:scale(.97);}}'
        ].join('\n');
        var s = document.createElement('style');
        s.id = 'tmo-style';
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
    }

    // ── Robuste Viewport-Metriken → CSS-Variablen ──────────────────────────
    // Nutzt visualViewport (kennt die Bildschirm-Tastatur), fällt sonst auf
    // innerHeight zurück. Löst das klassische „100vh ist auf iOS zu hoch"-Problem
    // und liefert --keyboard-inset, damit fixe Leisten über der Tastatur bleiben.
    function setupViewportMetrics(root) {
        var vv = window.visualViewport;
        var raf = 0;
        function apply() {
            raf = 0;
            var h = vv ? vv.height : window.innerHeight;
            root.style.setProperty('--viewport-height', Math.round(h) + 'px');
            root.style.setProperty('--vh', (h / 100) + 'px');
            var kb = vv ? Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) : 0;
            root.style.setProperty('--keyboard-inset', kb + 'px');
            root.classList.toggle('is-keyboard-open', kb > 120);
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
    function setupPressFeedback() {
        var SEL = 'button, .btn, [role="button"], a.back-btn, .nav-item, .geo-chip,' +
                  ' .time-btn, .map-switch-btn, .tab-btn, .refresh-btn, [data-touch-press]';
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

    // ── Haptik (opt-in) ────────────────────────────────────────────────────
    // window.tmoHaptic(ms) für gezielte Vibration; automatisch auf Elementen
    // mit [data-haptic] (Wert = Millisekunden, Default 8). Nie aufdringlich.
    function setupHaptics(isTouch) {
        window.tmoHaptic = function (ms) {
            try { if (isTouch && navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) { /* noop */ }
        };
        if (!isTouch || !navigator.vibrate) return;
        document.addEventListener('pointerdown', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-haptic]') : null;
            if (el) { try { navigator.vibrate(parseInt(el.getAttribute('data-haptic'), 10) || 8); } catch (err) { /* noop */ } }
        }, { passive: true });
    }

    // ── Init (idempotent) ──────────────────────────────────────────────────
    function init() {
        if (window.__tmoInitialized) return;
        window.__tmoInitialized = true;

        var root = document.documentElement;
        var ua = navigator.userAgent || '';
        var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
        var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        var isAndroid = /Android/.test(ua);
        var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
                           window.navigator.standalone === true;

        root.classList.add(isTouch ? 'is-touch' : 'is-no-touch');
        if (isIOS) root.classList.add('is-ios');
        if (isAndroid) root.classList.add('is-android');
        if (isStandalone) root.classList.add('is-standalone');

        injectBaseCSS();
        setupViewportMetrics(root);
        if (isTouch) {
            setupPressFeedback();
            setupKeyboardAwareFocus();
        }
        setupHaptics(isTouch);
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
