// ═══ WEIHNACHTEN SZENE MODULE ═══
// Winter hinter der ganzen App: Eisblumen in den Bildschirmecken (einmal gemalt, stehen still) und feiner
// Schnee. Fassung 4 (22.11.2026). Vorher verworfen: Geschenk-Kacheln, Lichterkette, Schneewellen als SVG,
// zuletzt eine gemalte Berg-Winternacht mit Baum und Adventskalender („unfassbar unnötig“). Wunsch jetzt:
// die App selbst wird winterlich, ruhig, EIN Effekt-Element (feedback_design_restraint) — das sind die
// Eisblumen. Kein Baum, keine Lichter, keine Berge, kein eigener Akzent: --primary bleibt die Nutzerfarbe.
//
// Aufbau: Leinwand 1 = Frost, nur bei Größen- oder Themawechsel neu gemalt. Leinwand 2 = Schnee, 30 Bilder/s,
// steht in verdeckten Tabs, bei „Deko aus“ und bei reduzierter Bewegung (dann ein ruhendes Bild). Beide
// liegen HINTER dem Inhalt: Schnee über Text störte. Fehler in der Schleife halten nur die Schleife an
// (handy.md: Fehler in Deko-Schleifen kippen sonst die App).
//
// Öffentlich: WeihnachtsSzene.start(), .stop()
(function () {
    'use strict';

    const RUHIG = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let st = null;

    // Fester Zufall: dieselben Eisblumen bei jedem Neuladen, nur die Fenstergröße verändert sie.
    function zufall(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ── Eisblumen ─────────────────────────────────────────────────────
    // Wachstum wie echter Fensterfrost: Hauptarme aus der Ecke, an jedem Arm Seitentriebe im 60°-Winkel
    // (Eis kristallisiert hexagonal), die wieder Triebe tragen. Deckkraft fällt mit dem Abstand zur Ecke,
    // damit der Frost in der Fläche verschwindet und nie unter Text steht.
    function maleFrost(cv, W, H, DPR, dunkel) {
        cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
        const c = cv.getContext('2d');
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        c.clearRect(0, 0, W, H);
        c.lineCap = 'round';
        const farbe = dunkel ? '214, 232, 255' : '74, 112, 160';
        const staerke = dunkel ? 1 : 0.85;
        // Gemessen: unter 600 px Breite fraß eine Reichweite von 30 % die Kopfzeile; dort kleiner.
        const reich = Math.min(W, H) * (W < 600 ? 0.24 : 0.3);

        const ecken = [[0, 0, 0], [W, 0, Math.PI / 2], [W, H, Math.PI], [0, H, Math.PI * 1.5]];
        ecken.forEach(function (e, i) {
            const r = zufall(1201 + i * 97);
            const [ex, ey, basis] = e;

            // Hauch: weicher Beschlag in der Ecke, trägt die Kristalle optisch
            const g = c.createRadialGradient(ex, ey, 0, ex, ey, reich * 0.95);
            g.addColorStop(0, 'rgba(' + farbe + ',' + (0.075 * staerke).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(' + farbe + ',0)');
            c.fillStyle = g;
            c.fillRect(ex - reich, ey - reich, reich * 2, reich * 2);

            // Federform: ein leicht gebogener Arm, an dem kurze Triebe dicht und parallel stehen, nach außen
            // kürzer werdend. Fassung 1 verzweigte rekursiv in alle Richtungen und sah aus wie ein Drahtnetz
            // (Bild 22.11.2026) — darum höchstens zwei Ebenen und feste Winkel je Arm.
            function trieb(x, y, w, len, tiefe) {
                if (len < 2.5) return;
                const schritt = tiefe === 0 ? 5 : 3.5;
                const schritte = Math.max(2, Math.round(len / schritt));
                const biegung = (r() - 0.5) * (tiefe === 0 ? 0.014 : 0.03);
                let px = x, py = y, wi = w;
                for (let s = 1; s <= schritte; s++) {
                    wi += biegung;
                    const nx = px + Math.cos(wi) * len / schritte;
                    const ny = py + Math.sin(wi) * len / schritte;
                    const d = Math.hypot(nx - ex, ny - ey) / reich;
                    if (d > 1) return;
                    const a = Math.pow(1 - d, 1.35) * (tiefe === 0 ? 0.5 : tiefe === 1 ? 0.34 : 0.22) * staerke;
                    c.strokeStyle = 'rgba(' + farbe + ',' + a.toFixed(3) + ')';
                    c.lineWidth = tiefe === 0 ? 1.1 : tiefe === 1 ? 0.75 : 0.5;
                    c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke();
                    if (tiefe < 2 && s > 1) {
                        const aussen = 1 - s / schritte;
                        const l2 = len * (tiefe === 0 ? 0.2 : 0.32) * (0.35 + 0.65 * Math.pow(aussen, 0.7)) * (0.75 + r() * 0.5);
                        if (r() < 0.9) trieb(nx, ny, wi + Math.PI / 3, l2, tiefe + 1);
                        if (r() < 0.9) trieb(nx, ny, wi - Math.PI / 3, l2 * (0.8 + r() * 0.3), tiefe + 1);
                    }
                    px = nx; py = ny;
                }
            }

            const arme = 3 + Math.floor(r() * 2);
            for (let k = 0; k < arme; k++) {
                // Fächer in die Fläche hinein (Ecke → 90°-Bereich), Ränder etwas dichter: Frost kriecht an Kanten
                const t = (k + 0.5 + (r() - 0.5) * 0.6) / arme;
                const w = basis + t * Math.PI / 2;
                const versatz = r() * reich * 0.12;
                const sx = ex + Math.cos(basis + (r() < 0.5 ? 0 : Math.PI / 2)) * versatz;
                const sy = ey + Math.sin(basis + (r() < 0.5 ? 0 : Math.PI / 2)) * versatz;
                trieb(sx, sy, w, reich * (0.55 + r() * 0.45), 0);
            }
        });
    }

    // ── Schnee ────────────────────────────────────────────────────────
    function flockenBauen() {
        const W = st.W, H = st.H;
        // Bewusst wenig: ~1 Flocke je 14.000 px² (1920×1080 ≈ 150). Mehr wirkte wie Rauschen.
        const n = Math.round(Math.min(170, W * H / 14000));
        st.flocken = [];
        for (let i = 0; i < n; i++) {
            const z = Math.random();   // 0 = fern, 1 = nah
            st.flocken.push({ x: Math.random() * W, y: Math.random() * H, z: z,
                r: 0.6 + z * 1.5, v: 0.18 + z * 0.55, p: Math.random() * 6.28, a: 0.25 + z * 0.5 });
        }
    }
    function bild() {
        const c = st.sctx, W = st.W, H = st.H;
        c.clearRect(0, 0, W, H);
        c.fillStyle = st.dunkel ? '#eef5ff' : '#7f9cc0';
        for (const q of st.flocken) {
            if (!RUHIG) {
                q.y += q.v; q.p += 0.012; q.x += Math.sin(q.p) * (0.12 + q.z * 0.28);
                if (q.y > H + 4) { q.y = -4; q.x = Math.random() * W; }
                if (q.x < -4) q.x += W + 8; else if (q.x > W + 4) q.x -= W + 8;
            }
            c.globalAlpha = st.dunkel ? q.a : q.a * 0.7;
            c.beginPath(); c.arc(q.x, q.y, q.r, 0, 6.2832); c.fill();
        }
        c.globalAlpha = 1;
    }
    function schleife() {
        if (st.raf || !st.laeuft || RUHIG) return;
        const schritt = function (t) {
            st.raf = 0;
            if (!st.laeuft || document.hidden) return;
            st.raf = requestAnimationFrame(schritt);
            if (t - st.letzte < 32) return;   // 30 Bilder/s genügen für Schnee und sparen Akku
            st.letzte = t;
            try { bild(); } catch (e) { console.warn('[WeihnachtsSzene]', e); cancelAnimationFrame(st.raf); st.raf = 0; st.laeuft = false; }
        };
        st.raf = requestAnimationFrame(schritt);
    }

    function neuMalen() {
        if (!st) return;
        const W = window.innerWidth, H = window.innerHeight;
        if (!W || !H) return;
        const dunkel = document.documentElement.getAttribute('data-theme') !== 'light';
        const key = [W, H, dunkel].join('|');
        if (key === st.key) return;
        const breiteNeu = W !== st.W;
        st.key = key; st.W = W; st.H = H; st.dunkel = dunkel;
        maleFrost(st.frost, W, H, Math.min(2, window.devicePixelRatio || 1), dunkel);
        st.schnee.width = W; st.schnee.height = H;
        st.sctx = st.schnee.getContext('2d');
        // Nur die Höhe geändert (Adressleiste am Handy): Flocken behalten, sonst springt der Schnee beim Scrollen
        if (breiteNeu || !st.flocken) flockenBauen();
        st.root.classList.add('is-da');
        bild();
        schleife();
    }

    function start() {
        if (!st) {
            const root = document.createElement('div');
            root.className = 'wn-welt'; root.setAttribute('aria-hidden', 'true');
            root.innerHTML = '<canvas class="wn-welt-frost"></canvas><canvas class="wn-welt-schnee"></canvas>';
            document.body.insertBefore(root, document.body.firstChild);
            st = { root: root, frost: root.children[0], schnee: root.children[1], key: '', raf: 0, laeuft: false, letzte: 0, W: 0, H: 0, flocken: null };
            let uhr = 0;
            window.addEventListener('resize', function () { clearTimeout(uhr); uhr = setTimeout(function () { if (st.laeuft) neuMalen(); }, 220); });
            new MutationObserver(function () { if (st.laeuft) neuMalen(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
            document.addEventListener('visibilitychange', function () { if (!document.hidden && st.laeuft) schleife(); });
        }
        st.laeuft = true;
        st.root.hidden = false;
        // Frost malen kostet am Handy ein paar Millisekunden: erst im Leerlauf, der Start der App wartet nicht.
        const los = function () { if (!st.laeuft) return; try { neuMalen(); } catch (e) { console.warn('[WeihnachtsSzene]', e); } if (st.key) schleife(); };
        if ('requestIdleCallback' in window) requestIdleCallback(los, { timeout: 1200 }); else setTimeout(los, 300);
    }
    function stop() {
        if (!st) return;
        st.laeuft = false; cancelAnimationFrame(st.raf); st.raf = 0; st.root.hidden = true;
    }

    window.WeihnachtsSzene = { start: start, stop: stop, _frost: function () { return st && st.frost; } };
})();
