// ═══ WEIHNACHTEN SZENE MODULE ═══
// Winter hinter der ganzen App: feiner Schnee, der unten auf einer Schneekante liegen bleibt. Fassung 5
// (22.11.2026). Verworfen, nicht zurückbauen: Geschenk-Kacheln, Lichterkette, SVG-Schneewellen, gemalte
// Berg-Winternacht mit Baum + Adventskalender, zuletzt gezeichnete Eisblumen in den Ecken („seeeehr
// unrealistisch“). Der Schnee kam gut an; der Nutzer wählte dazu „Schnee bleibt liegen“.
//
// Aufbau:
// - Schnee: eine Leinwand HINTER dem Inhalt (Schnee über Text störte), 30 Bilder/s, steht in verdeckten Tabs,
//   bei „Deko aus“ und bei reduzierter Bewegung (dann ein ruhendes Bild). Flocken, die die Kante erreichen,
//   bleiben kurz liegen und vergehen — sie landen auf der Oberfläche der Kante, nicht am Bildschirmrand.
// - Kante: eine eigene Leinwand VOR dem Inhalt, nur wenige Pixel hoch und ohne Klicks. Am Desktop fest am
//   unteren Rand. Am Handy (≤ 767 px, dort gibt es die untere Navigation) liegt sie AUF der Navigation und
//   fährt mit ihr weg — fest am Rand hätte sie die Beschriftungen der Leiste verdeckt.
// - Fehler in der Schleife halten nur die Schleife an (handy.md: Fehler in Deko-Schleifen kippen sonst die App).
//
// Öffentlich: WeihnachtsSzene.start(), .stop()
(function () {
    'use strict';

    const RUHIG = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const HANDY = typeof matchMedia === 'function' ? matchMedia('(max-width: 767px)') : null;
    let st = null;

    function zufall(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    // Glattes 1D-Rauschen: Zufallswerte auf einem Gitter, kosinus-interpoliert
    function rauschen1d(seed, n) {
        const r = zufall(seed), w = [];
        for (let i = 0; i <= n + 1; i++) w.push(r());
        return function (x) {
            const i = Math.floor(x), f = x - i, s = (1 - Math.cos(f * Math.PI)) / 2;
            return w[i % (n + 1)] * (1 - s) + w[(i + 1) % (n + 1)] * s;
        };
    }

    // ── Kante ─────────────────────────────────────────────────────────
    // Profil = Höhe der Schneeoberfläche über der Unterkante, je Pixel. Drei Oktaven: lange flache Wellen,
    // mittlere Buckel, feine Unruhe. Realistisch wird es durch die Schattierung, nicht durch die Form:
    // helle Krone, bläulicher Körper, Kornstruktur, weicher Rand.
    function profilBauen(W, hoch) {
        const a = rauschen1d(71, 64), b = rauschen1d(233, 128), c = rauschen1d(907, 512);
        const p = new Float32Array(W + 1);
        // Fassung 1 (0,38 Sockel, Wellen 260/70 px) war ein flacher Streifen; Haufen brauchen Hub und Täler
        for (let x = 0; x <= W; x++) {
            const v = a(x / 190) * 0.6 + b(x / 48) * 0.28 + c(x / 11) * 0.12;
            p[x] = hoch * (0.18 + 0.82 * Math.pow(v, 1.3));
        }
        return p;
    }
    function maleKante(cv, W, H, DPR, dunkel, profil) {
        cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
        cv.style.height = H + 'px';
        const c = cv.getContext('2d');
        c.setTransform(DPR, 0, 0, DPR, 0, 0);
        c.clearRect(0, 0, W, H);
        const form = function () {
            c.beginPath(); c.moveTo(0, H);
            for (let x = 0; x <= W; x += 2) c.lineTo(x, H - profil[x]);
            c.lineTo(W, H); c.closePath();
        };
        // Weicher Schatten darunter/darum, damit die Kante auf jedem Grund steht (auf Weiß sonst unsichtbar)
        c.save();
        c.shadowColor = dunkel ? 'rgba(0, 0, 0, 0.45)' : 'rgba(50, 80, 120, 0.28)';
        c.shadowBlur = 6; c.shadowOffsetY = -1;
        form();
        const g = c.createLinearGradient(0, H - Math.max.apply(null, profil), 0, H);
        if (dunkel) { g.addColorStop(0, '#e6eefa'); g.addColorStop(0.35, '#c4d3ea'); g.addColorStop(1, '#8ea4c6'); }
        else        { g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#eaf1fa'); g.addColorStop(1, '#c9d8ea'); }
        c.fillStyle = g; c.fill();
        c.restore();
        c.save();
        form(); c.clip();
        // Hänge: Licht von oben links. Steigt die Oberfläche nach rechts, schaut der Hang zum Licht und wird
        // hell, fällt sie, liegt er im Schatten. Erst das macht aus der Fläche einen Haufen.
        for (let x = 0; x < W; x += 2) {
            const neig = (profil[Math.min(W, x + 3)] - profil[Math.max(0, x - 3)]) / 6;
            const y = H - profil[x];
            const tiefe = Math.min(profil[x], 12);
            const g2 = c.createLinearGradient(0, y, 0, y + tiefe);
            if (neig > 0) {
                const a = Math.min(0.55, neig * 1.4);
                g2.addColorStop(0, 'rgba(255,255,255,' + a.toFixed(3) + ')'); g2.addColorStop(1, 'rgba(255,255,255,0)');
            } else {
                const a = Math.min(dunkel ? 0.42 : 0.3, -neig * 1.3);
                g2.addColorStop(0, (dunkel ? 'rgba(40,62,100,' : 'rgba(110,140,180,') + a.toFixed(3) + ')'); g2.addColorStop(1, 'rgba(40,62,100,0)');
            }
            c.fillStyle = g2; c.fillRect(x, y, 2, tiefe);
        }
        // Krone: das Licht fällt von oben, die Oberkante glänzt
        c.lineWidth = 2.2;
        c.strokeStyle = dunkel ? 'rgba(250, 252, 255, 0.75)' : 'rgba(255, 255, 255, 1)';
        c.beginPath();
        for (let x = 0; x <= W; x += 2) { const y = H - profil[x] + 1; x ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
        // Korn: helle und bläuliche Pünktchen, sonst wirkt die Fläche wie Plastik
        const r = zufall(4242);
        const n = Math.round(W * 0.9);
        for (let i = 0; i < n; i++) {
            const x = r() * W, tief = r() * profil[Math.floor(x)];
            const y = H - tief;
            const hell = r() < 0.55;
            c.fillStyle = hell ? (dunkel ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.9)') : (dunkel ? 'rgba(90,115,155,0.28)' : 'rgba(120,150,190,0.22)');
            c.fillRect(x, y, r() < 0.15 ? 1.4 : 0.8, r() < 0.15 ? 1.4 : 0.8);
        }
        c.restore();
    }

    // Wo liegt die Kante gerade? Am Handy wandert sie mit der Navigation.
    function kanteOben() {
        if (!st.kanteAufNav) return st.H;
        const r = st.kante.getBoundingClientRect();
        return r.bottom;
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
                r: 0.6 + z * 1.5, v: 0.18 + z * 0.55, p: Math.random() * 6.28, a: 0.25 + z * 0.5, liegt: 0 });
        }
    }
    function bild() {
        const c = st.sctx, W = st.W, H = st.H;
        c.clearRect(0, 0, W, H);
        c.fillStyle = st.dunkel ? '#eef5ff' : '#7f9cc0';
        const boden = kanteOben();
        for (const q of st.flocken) {
            if (!RUHIG) {
                if (q.liegt) {
                    // Liegende Flocke: ~1,5 s sichtbar, dann neu oben
                    if (++q.liegt > 45) { q.liegt = 0; q.y = -4; q.x = Math.random() * W; }
                } else {
                    q.y += q.v; q.p += 0.012; q.x += Math.sin(q.p) * (0.12 + q.z * 0.28);
                    if (q.x < -4) q.x += W + 8; else if (q.x > W + 4) q.x -= W + 8;
                    // Nur nahe Flocken landen sichtbar; ferne fallen „hinter“ der Kante durch
                    const flaeche = boden - st.profil[Math.max(0, Math.min(W, Math.round(q.x)))] + 1;
                    if (q.z > 0.45 && q.y >= flaeche) { q.y = flaeche; q.liegt = 1; }
                    else if (q.y > H + 4) { q.y = -4; q.x = Math.random() * W; }
                }
            }
            c.globalAlpha = (st.dunkel ? q.a : q.a * 0.7) * (q.liegt ? 1 - q.liegt / 45 : 1);
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

    // Am Handy auf die Navigation, sonst fest an den Rand
    function kanteEinhaengen() {
        const nav = document.getElementById('mobNavInner');
        const aufNav = !!(HANDY && HANDY.matches && nav);
        st.kanteAufNav = aufNav;
        const ziel = aufNav ? nav : document.body;
        if (st.kante.parentNode !== ziel) ziel.appendChild(st.kante);
        st.kante.classList.toggle('is-nav', aufNav);
    }

    function neuMalen() {
        if (!st) return;
        const W = window.innerWidth, H = window.innerHeight;
        if (!W || !H) return;
        const dunkel = document.documentElement.getAttribute('data-theme') !== 'light';
        kanteEinhaengen();
        const key = [W, H, dunkel, st.kanteAufNav].join('|');
        if (key === st.key) return;
        const breiteNeu = W !== st.W;
        st.key = key; st.W = W; st.H = H; st.dunkel = dunkel;
        // Am Desktop liegt die Kante unter der Seitenleiste (z 140 < 200), deckt die Versionszeile also nicht zu.
        const hoch = st.kanteAufNav ? 14 : 24;
        st.profil = profilBauen(W, hoch);
        maleKante(st.kante, W, hoch + 6, Math.min(2, window.devicePixelRatio || 1), dunkel, st.profil);
        st.schnee.width = W; st.schnee.height = H;
        st.sctx = st.schnee.getContext('2d');
        // Nur die Höhe geändert (Adressleiste am Handy): Flocken behalten, sonst springt der Schnee beim Scrollen
        if (breiteNeu || !st.flocken) flockenBauen();
        st.root.classList.add('is-da');
        st.kante.classList.add('is-da');
        bild();
        schleife();
    }

    function start() {
        if (!st) {
            const root = document.createElement('div');
            root.className = 'wn-welt'; root.setAttribute('aria-hidden', 'true');
            root.innerHTML = '<canvas class="wn-welt-schnee"></canvas>';
            document.body.insertBefore(root, document.body.firstChild);
            const kante = document.createElement('canvas');
            kante.className = 'wn-kante'; kante.setAttribute('aria-hidden', 'true');
            st = { root: root, schnee: root.children[0], kante: kante, key: '', raf: 0, laeuft: false, letzte: 0, W: 0, H: 0, flocken: null, profil: null };
            let uhr = 0;
            window.addEventListener('resize', function () { clearTimeout(uhr); uhr = setTimeout(function () { if (st.laeuft) neuMalen(); }, 220); });
            new MutationObserver(function () { if (st.laeuft) neuMalen(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
            document.addEventListener('visibilitychange', function () { if (!document.hidden && st.laeuft) schleife(); });
        }
        st.laeuft = true;
        st.root.hidden = false; st.kante.hidden = false;
        // Erst im Leerlauf malen, der Start der App wartet nicht.
        const los = function () { if (!st.laeuft) return; try { neuMalen(); } catch (e) { console.warn('[WeihnachtsSzene]', e); } if (st.key) schleife(); };
        if ('requestIdleCallback' in window) requestIdleCallback(los, { timeout: 1200 }); else setTimeout(los, 300);
    }
    function stop() {
        if (!st) return;
        st.laeuft = false; cancelAnimationFrame(st.raf); st.raf = 0; st.root.hidden = true; st.kante.hidden = true;
    }

    window.WeihnachtsSzene = { start: start, stop: stop, _kante: function () { return st && st.kante; } };
})();
