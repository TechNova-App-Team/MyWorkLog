// ═══ SILVESTER SZENE MODULE ═══
// Feuerwerk HINTER der ganzen App, 30.12. 0 Uhr bis 02.01. 7 Uhr. Wunsch des Nutzers 22.11.2026: „steigert
// sich“ — tagsüber selten eine ferne Rakete, abends dichter, um 0 Uhr ein Finale über eine Viertelstunde,
// danach klingt es aus. Die Dichte hängt nur an der Uhrzeit (rate()), nicht an Zufall pro Gerät: zwei Leute
// um 23:58 sehen denselben Takt.
//
// Lehren aus Weihnachten (components/weihnachten/, fünf Fassungen): gezeichnete Formen wirken billig,
// Realismus kommt aus Licht. Darum gerechnete Teilchen mit Luftwiderstand und Schwerkraft, Bewegungs-
// Leuchtspuren aus den letzten Positionen jedes Sterns, additives Mischen (Licht addiert sich), heißer
// weißer Kern frischer Sterne, kurzer Himmelsblitz beim Zerplatzen. Kein altes Emoji-Feuerwerk (Assets/js/Event/New_Year, gelöscht).
//
// Akku: Ohne Teilchen in der Luft läuft KEINE Bildschleife, nur ein Zeitgeber bis zur nächsten Rakete.
// Steht in verdeckten Tabs, bei „Deko aus“ und bei reduzierter Bewegung ganz. Fehler halten nur die
// Schleife an (handy.md: Fehler in Deko-Schleifen kippen sonst die App).
//
// Öffentlich: SilvesterSzene.start(), .stop(), .jetzt(), .rate(date)
(function () {
    'use strict';

    const RUHIG = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let st = null;

    // Test an anderen Tagen: mwl_silvester_test = '1' → heutige Uhrzeit, aber am 31.12.;
    // 'finale' → 00:02 Uhr Neujahr. Dieselbe Regel steht in silvester.js.
    function imFenster(d) {
        const m = d.getMonth(), t = d.getDate();
        return (m === 11 && t >= 30) || (m === 0 && (t === 1 || (t === 2 && d.getHours() < 7)));
    }
    function jetzt() {
        const d = new Date();
        let test = null;
        try { test = localStorage.getItem('mwl_silvester_test'); } catch (e) { }
        if (test === 'finale') return new Date(d.getFullYear() + 1, 0, 1, 0, 2, d.getSeconds());
        if (test === '1' && !imFenster(d)) return new Date(d.getFullYear(), 11, 31, d.getHours(), d.getMinutes(), d.getSeconds());
        return d;
    }
    // Raketen je Minute
    function rate(d) {
        const m = d.getMonth(), t = d.getDate(), h = d.getHours() + d.getMinutes() / 60;
        if (m === 11 && t === 30) return 0.4;
        if (m === 11 && t === 31) return h < 12 ? 0.6 : h < 18 ? 1.2 : h < 21 ? 3 : h < 23 ? 5 : h < 23 + 50 / 60 ? 8 : 14;
        if (m === 0 && t === 1) return h < 0.25 ? 70 : h < 0.5 ? 40 : h < 1 ? 16 : h < 2 ? 8 : h < 4 ? 4 : h < 12 ? 0.8 : 0.6;
        if (m === 0 && t === 2) return 0.3;
        return 3;
    }

    // Echte Effektfarben, leicht gedämpft: grelles Neon wirkt auf dunklem Glas wie Werbung
    const FARBEN = [
        [255, 206, 122], [255, 244, 224], [255, 96, 82], [118, 255, 160],
        [110, 180, 255], [200, 146, 255], [255, 160, 80]
    ];
    const ARTEN = ['kugel', 'kugel', 'kugel', 'weide', 'ring', 'knister'];

    function zufallAus(a) { return a[Math.floor(Math.random() * a.length)]; }

    function rakete() {
        const W = st.W, H = st.H;
        const z = Math.pow(Math.random(), 0.8);                // 0 = fern, 1 = nah
        const s = 0.42 + 0.58 * z;
        const x = W * (0.08 + Math.random() * 0.84);
        const zielY = H * (0.1 + Math.random() * 0.32) + (1 - z) * H * 0.12;
        const g = 230 * s;
        const vy = -Math.sqrt(2 * g * (H + 10 - zielY));
        st.raketen.push({ x: x, y: H + 10, vx: (Math.random() - 0.5) * 30 * s, vy: vy, g: g, s: s, z: z,
            art: zufallAus(ARTEN), farbe: zufallAus(FARBEN), farbe2: Math.random() < 0.3 ? zufallAus(FARBEN) : null });
    }

    function zerplatzen(r) {
        const s = r.s, art = r.art;
        // Fassung 1 (R 110–230, 90 Sterne) sah aus wie Streusel (Bild 22.11.2026): größer und dichter
        const R = (150 + Math.random() * 150) * s * (st.handy ? 0.7 : 1);
        let n = Math.round((art === 'weide' ? 120 : art === 'ring' ? 46 : 170) * s * (st.handy ? 0.6 : 1));
        if (st.teile.length > st.max) n = Math.round(n * 0.4);
        const neigung = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) {
            let w, v;
            if (art === 'ring') {
                w = (i / n) * Math.PI * 2; v = R * 1.6;
            } else {
                // Gleichverteilt auf der Kugel, von der Seite gesehen: innen dichter, wie echt
                w = Math.random() * Math.PI * 2;
                v = R * 1.6 * Math.sqrt(1 - Math.pow(Math.random() * 2 - 1, 2)) * (0.85 + Math.random() * 0.15);
            }
            let vx = Math.cos(w) * v, vy = Math.sin(w) * v;
            if (art === 'ring') { vy *= 0.45; const c = Math.cos(neigung), sn = Math.sin(neigung); const ax = vx * c - vy * sn, ay = vx * sn + vy * c; vx = ax; vy = ay; }
            const weide = art === 'weide';
            st.teile.push({
                x: r.x, y: r.y, vx: vx, vy: vy,
                f: weide ? [255, 196, 110] : (r.farbe2 && i % 2 ? r.farbe2 : r.farbe),
                zug: weide ? 0.9 : 1.7,                   // Luftwiderstand je Sekunde
                g: weide ? 95 : 70,
                leben: 0, dauer: (weide ? 2.8 : 1.5) + Math.random() * (weide ? 1.2 : 0.9),
                breite: (weide ? 1.4 : 1.9) * s, hell: 0.7 + 0.3 * r.z,
                knister: art === 'knister' && Math.random() < 0.6
            });
        }
        st.blitze.push({ x: r.x, y: r.y, r: R * 1.8, f: r.farbe, leben: 0, hell: 0.5 * (0.4 + 0.6 * r.z) });
    }

    // Spur = die Positionen der letzten `dauer` Sekunden; gezeichnet als Linie, die nach hinten ausläuft
    function spurMerken(o, dauer) {
        if (!o.spur) o.spur = [];
        o.spur.push(o.x, o.y, st.zeit);
        while (o.spur.length > 6 && st.zeit - o.spur[2] > dauer) o.spur.splice(0, 3);
    }
    function spurZeichnen(c, o, f, a, breite) {
        const s = o.spur, n = s.length / 3;
        if (n < 2 || a <= 0.01) return;
        c.lineWidth = breite;
        // Vier Abschnitte mit steigender Deckkraft genügen fürs Auslaufen — je Segment ein Strich wäre zu teuer
        const stufen = Math.min(4, n - 1);
        for (let k = 0; k < stufen; k++) {
            const von = Math.floor(k * (n - 1) / stufen), bis = Math.floor((k + 1) * (n - 1) / stufen);
            c.strokeStyle = 'rgba(' + f[0] + ',' + f[1] + ',' + f[2] + ',' + (a * Math.pow((k + 1) / stufen, 1.6)).toFixed(3) + ')';
            c.beginPath(); c.moveTo(s[von * 3], s[von * 3 + 1]);
            for (let j = von + 1; j <= bis; j++) c.lineTo(s[j * 3], s[j * 3 + 1]);
            c.stroke();
        }
    }

    function schritt(dt) {
        const c = st.ctx, W = st.W, H = st.H, dunkel = st.dunkel;
        // Jedes Bild frisch. Die Leuchtspuren zeichnet jeder Stern selbst aus seinen letzten Positionen
        // (spur). Fassung 2 blendete stattdessen das alte Bild per destination-out aus: das hinterließ
        // Geister, weil schwache Pixel im 8-Bit-Alpha beim Abschwächen wieder auf denselben Wert runden
        // (x·(1−a) rundet zu x, solange x < 0,5/a) — blasse Raketenstriche und ein Schleier, die nie gingen.
        c.globalCompositeOperation = 'source-over';
        c.clearRect(0, 0, W, H);
        st.zeit += dt;

        c.globalCompositeOperation = dunkel ? 'lighter' : 'source-over';
        c.lineCap = 'round';

        // Himmelsblitz beim Zerplatzen: 0,3 s
        for (let i = st.blitze.length - 1; i >= 0; i--) {
            const b = st.blitze[i];
            b.leben += dt;
            if (b.leben > 0.3) { st.blitze.splice(i, 1); continue; }
            if (!dunkel) continue;
            const a = b.hell * (1 - b.leben / 0.3);
            const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
            // 0,12 bei Radius 1,8·R: bei 0,35 und 2,6·R lag ein farbiger Schleier über dem halben Bild
            g.addColorStop(0, 'rgba(' + b.f.join(',') + ',' + (a * 0.12).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(' + b.f.join(',') + ',0)');
            c.fillStyle = g; c.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
        }

        // Raketen: steigen, ziehen einen Funkenschweif, platzen am Scheitel
        for (let i = st.raketen.length - 1; i >= 0; i--) {
            const r = st.raketen[i];
            r.vy += r.g * dt; r.x += r.vx * dt; r.y += r.vy * dt;
            spurMerken(r, 0.18);
            spurZeichnen(c, r, dunkel ? [255, 214, 160] : [150, 100, 40], 0.75, 1.3 * r.s);
            if (Math.random() < 0.35) st.funken.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 30, leben: 0, dauer: 0.2 + Math.random() * 0.25, s: r.s });
            if (r.vy >= -20) { zerplatzen(r); st.raketen.splice(i, 1); }
        }
        for (let i = st.funken.length - 1; i >= 0; i--) {
            const f = st.funken[i];
            f.leben += dt; if (f.leben > f.dauer) { st.funken.splice(i, 1); continue; }
            f.x += f.vx * dt; f.y += f.vy * dt;
            const a = (1 - f.leben / f.dauer) * 0.7;
            c.fillStyle = dunkel ? 'rgba(255,190,110,' + (a * 0.6).toFixed(3) + ')' : 'rgba(170,110,40,' + (a * 0.8).toFixed(3) + ')';
            c.fillRect(f.x, f.y, 1.2 * f.s, 1.2 * f.s);
        }

        // Sterne: Luftwiderstand, Schwerkraft, Schliere in Flugrichtung, Verglühen
        for (let i = st.teile.length - 1; i >= 0; i--) {
            const p = st.teile[i];
            p.leben += dt;
            if (p.leben > p.dauer) {
                if (p.knister) for (let k = 0; k < 3; k++) st.funken.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, leben: 0, dauer: 0.12 + Math.random() * 0.12, s: 1.4 });
                st.teile.splice(i, 1); continue;
            }
            const zug = Math.exp(-p.zug * dt);
            p.vx *= zug; p.vy = p.vy * zug + p.g * dt;
            p.x += p.vx * dt; p.y += p.vy * dt;
            const rest = 1 - p.leben / p.dauer;
            // Spur wird mit dem Abkühlen kürzer: frisch 0,3 s, am Ende 0,08 s
            spurMerken(p, 0.08 + 0.22 * rest);
            // Zum Ende flackern Sterne, bevor sie ausgehen
            const flacker = rest < 0.25 ? 0.55 + 0.45 * Math.random() : 1;
            const a = Math.pow(rest, 1.1) * p.hell * flacker;
            spurZeichnen(c, p, dunkel ? p.f : p.f.map(function (v) { return Math.round(v * 0.62); }), dunkel ? a : a * 0.85, p.breite);
            // Heißer Kern: frische Sterne sind fast weiß, erst beim Abkühlen zeigt sich die Farbe
            if (dunkel && rest > 0.8) {
                const k = (rest - 0.8) / 0.2;
                c.fillStyle = 'rgba(255,248,235,' + (k * 0.45 * p.hell).toFixed(3) + ')';
                c.beginPath(); c.arc(p.x, p.y, p.breite * 0.7, 0, 6.2832); c.fill();
            }
        }
        c.globalCompositeOperation = 'source-over';
    }

    function etwasInDerLuft() { return st.raketen.length || st.teile.length || st.funken.length || st.blitze.length; }

    function naechsteRakete(abJetzt) {
        const proSek = Math.max(0.005, rate(jetzt()) / 60);
        st.naechste = abJetzt + (-Math.log(1 - Math.random()) / proSek) * 1000;
    }

    function takt(t) {
        st.raf = 0;
        if (!st.laeuft || document.hidden) return;
        const dt = st.letzte ? Math.min(0.05, (t - st.letzte) / 1000) : 0.016;
        st.letzte = t;
        const jetztMs = Date.now();
        // Finale (ab 30 Raketen/min, 0:00–0:30): das Feuerwerk kommt VOR die App. Dahinter blieb es bei vollem
        // Dashboard eine Randerscheinung (Bild headless 1400 px, 22.11.2026). Nur dunkles Theme, siehe CSS.
        const vorne = rate(jetzt()) >= 30;
        if (vorne !== st.vorne) { st.vorne = vorne; st.root.classList.toggle('is-vorne', vorne); }
        if (jetztMs >= st.naechste) {
            rakete();
            // Im Finale kommen Raketen oft als Salve
            if (rate(jetzt()) >= 30 && Math.random() < 0.35) { rakete(); if (Math.random() < 0.5) rakete(); }
            naechsteRakete(jetztMs);
        }
        try { schritt(dt); } catch (e) { console.warn('[SilvesterSzene]', e); st.laeuft = false; return; }
        // Nach dem letzten Stern noch eine Sekunde ausblenden lassen, dann leeren und schlafen
        st.nach = etwasInDerLuft() ? 1 : st.nach - dt;
        if (st.nach > 0) st.raf = requestAnimationFrame(takt);
        else { st.ctx.clearRect(0, 0, st.W, st.H); warten(); }
    }
    // Nichts in der Luft: schlafen bis zur nächsten Rakete statt 60-mal je Sekunde ein leeres Bild zu malen
    function warten() {
        clearTimeout(st.uhr);
        if (!st.laeuft || RUHIG || document.hidden) return;
        // Höchstens 30 s am Stück, dann neu rechnen: die Dichte ändert sich mit der Uhrzeit
        const ms = Math.max(0, Math.min(30000, st.naechste - Date.now()));
        st.uhr = setTimeout(function () {
            if (!st.laeuft) return;
            if (Date.now() < st.naechste) { if (ms >= 30000) naechsteRakete(Date.now()); warten(); return; }
            st.letzte = 0;
            st.raf = requestAnimationFrame(takt);
        }, ms);
    }

    function groesse() {
        if (!st) return;
        const W = window.innerWidth, H = window.innerHeight;
        if (!W || !H) return;
        st.W = W; st.H = H;
        st.dunkel = document.documentElement.getAttribute('data-theme') !== 'light';
        st.handy = W < 768;
        st.max = st.handy ? 700 : 1600;
        const DPR = Math.min(st.handy ? 1.5 : 2, window.devicePixelRatio || 1);
        st.cv.width = Math.round(W * DPR); st.cv.height = Math.round(H * DPR);
        st.ctx = st.cv.getContext('2d');
        st.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        st.root.classList.add('is-da');
    }

    function start() {
        if (!st) {
            const root = document.createElement('div');
            root.className = 'sv-welt'; root.setAttribute('aria-hidden', 'true');
            root.innerHTML = '<canvas></canvas>';
            document.body.insertBefore(root, document.body.firstChild);
            st = { root: root, cv: root.firstChild, raketen: [], teile: [], funken: [], blitze: [], nach: 0, zeit: 0,
                raf: 0, uhr: 0, laeuft: false, letzte: 0, naechste: 0 };
            let u = 0;
            window.addEventListener('resize', function () { clearTimeout(u); u = setTimeout(function () { if (st.laeuft) groesse(); }, 220); });
            new MutationObserver(function () { if (st.laeuft) groesse(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
            document.addEventListener('visibilitychange', function () {
                if (document.hidden || !st.laeuft) return;
                // Zurück im Tab: kein Nachholen verpasster Raketen, einfach weiter im aktuellen Takt
                naechsteRakete(Date.now()); warten();
            });
        }
        st.laeuft = true;
        st.root.hidden = false;
        if (RUHIG) return;
        const los = function () {
            if (!st.laeuft) return;
            try { groesse(); } catch (e) { console.warn('[SilvesterSzene]', e); return; }
            // Gleich zum Start eine Rakete, sonst sieht man tagsüber minutenlang nichts und hält es für kaputt
            st.naechste = Date.now() + 600;
            warten();
        };
        if ('requestIdleCallback' in window) requestIdleCallback(los, { timeout: 1200 }); else setTimeout(los, 300);
    }
    function stop() {
        if (!st) return;
        st.laeuft = false; cancelAnimationFrame(st.raf); st.raf = 0; clearTimeout(st.uhr);
        st.raketen.length = st.teile.length = st.funken.length = st.blitze.length = 0;
        if (st.ctx) st.ctx.clearRect(0, 0, st.W, st.H);
        st.root.hidden = true;
    }

    // _stand: fuer Tests und Bildpruefung (headless), zaehlt nur
    window.SilvesterSzene = { start: start, stop: stop, jetzt: jetzt, rate: rate,
        _stand: function () { return st ? { raketen: st.raketen.length, teile: st.teile.length, funken: st.funken.length, laeuft: st.laeuft, W: st.W, H: st.H } : null; } };
})();
