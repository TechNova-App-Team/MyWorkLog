// ═══ BERICHTSHEFT STAPEL MODULE ═══
// Der Papierstapel der Startseite als 3D-Objekt (schreibtisch.css):
//   Maus (Desktop) oder Lagesensor (Handy) neigen ihn, ein Glanzstreifen
//   wandert mit, Zeigen und Scrollen faechern die Blaetter auf.
// Werte gehen als Custom Properties an #hfStapel selbst, nicht an <html> —
// sonst rechnet jede Mausbewegung die Styles der ganzen Seite neu.
// Die Schleife laeuft nur, solange sich etwas bewegt und der Stapel sichtbar ist.
(function () {
    'use strict';
    if (!window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let el = null, sichtbar = true, laeuft = false;
    const ist = { rx: 0, ry: 0, fan: 0 }, ziel = { rx: 0, ry: 0, fan: 0 };
    let zeigen = 0, scrollFan = 0, scrollKipp = 0, neigX = 0, neigY = 0;

    function zielRechnen() {
        ziel.rx = neigX + scrollKipp;
        ziel.ry = neigY;
        ziel.fan = Math.max(zeigen, scrollFan);
        if (!laeuft && sichtbar && el) { laeuft = true; requestAnimationFrame(schritt); }
    }
    // Feste Daempfung je Bild; Ende, sobald alles angekommen ist.
    function schritt() {
        let weiter = false;
        for (const k of ['rx', 'ry', 'fan']) {
            const d = ziel[k] - ist[k];
            ist[k] += d * (k === 'fan' ? 0.1 : 0.08);
            if (Math.abs(d) > (k === 'fan' ? 0.002 : 0.02)) weiter = true;
        }
        el.style.setProperty('--rx', ist.rx.toFixed(2) + 'deg');
        el.style.setProperty('--ry', ist.ry.toFixed(2) + 'deg');
        el.style.setProperty('--fan', ist.fan.toFixed(3));
        el.style.setProperty('--gx', (50 + ist.ry * 4 - ist.rx * 2).toFixed(1) + '%');
        if (weiter && sichtbar) requestAnimationFrame(schritt); else laeuft = false;
    }

    function anbinden() {
        el = document.getElementById('hfStapel');
        if (!el) return;

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(e => { sichtbar = e[0].isIntersecting; if (sichtbar) zielRechnen(); })
                .observe(el);
        }

        // Desktop: Neigung zur Maus, relativ zur Stapelmitte, begrenzt.
        if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
            window.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth;
                const dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
                // Nach rechts weniger als nach links: rechts liegt die Kante von .page-wrap.
                neigY = Math.max(-1, Math.min(1, dx * 1.6)) * (dx > 0 ? 6 : 10);
                neigX = Math.max(-1, Math.min(1, dy * 1.6)) * -8;
                zielRechnen();
            }, { passive: true });
            el.addEventListener('pointerenter', () => { zeigen = 1; zielRechnen(); });
            el.addEventListener('pointerleave', () => { zeigen = 0; zielRechnen(); });
        } else if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
            // Handy (Android: ohne Rueckfrage). iOS braucht eine Erlaubnis per
            // Klick — fuer einen Zier-Effekt fragen wir dort nicht.
            let basisBeta = null;
            window.addEventListener('deviceorientation', e => {
                if (e.gamma == null || e.beta == null) return;
                if (basisBeta === null) basisBeta = e.beta;
                neigY = Math.max(-20, Math.min(20, e.gamma)) * 0.4;
                neigX = Math.max(-20, Math.min(20, e.beta - basisBeta)) * -0.3;
                zielRechnen();
            }, { passive: true });
        }

        // Scrollen: der Stapel kippt nach hinten und faechert auf, bis er aus dem Bild ist.
        window.addEventListener('scroll', () => {
            const p = Math.max(0, Math.min(1, scrollY / 520));
            scrollFan = p * 0.8;
            scrollKipp = p * 14;
            zielRechnen();
        }, { passive: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', anbinden);
    else anbinden();
})();
