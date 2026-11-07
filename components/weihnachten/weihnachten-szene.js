// ═══ WEIHNACHTEN SZENE MODULE ═══
// Gemalte Winternacht hinter der ganzen App, gleiche Bauart wie components/core/weather-szene.js
// (Rauschen, fraktale Kämme, Luftperspektive, Hanglicht). Wunsch des Nutzers 07.11.2026: „wie das Wetter,
// super realistisch, nicht nur Klötze und paar Wellen“. SVG-Formen und CSS-Wellen waren zweimal durchgefallen.
//
// Aufbau: EIN fest gemaltes Bild plus EINE Leinwand für alles Bewegte (Schnee, Rauch, Lichter). Das Bild
// wird nur bei Größen- oder Themawechsel neu gemalt. Bewegtes läuft mit 30 Bildern/s und steht in verdeckten
// Tabs, bei „Deko aus“ und bei reduzierter Bewegung (handy.md: jede Ebene kostet, Fehler in Deko-Schleifen
// kippen die App, darum try/catch). Beide Leinwände liegen HINTER dem Inhalt: Schnee über Text störte.
//
// Die Helfer sind eine Kopie aus weather-szene.js: Die liegt in einem IIFE ohne Export, und das Wetter
// soll nicht von einem Saison-Modul abhängen.
//
// Öffentlich: WeihnachtsSzene.start(), .stop(), .lichter(anzahl)
(function () {
    'use strict';

    function zufall(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    function mix(a, b, t) { const A = typeof a === 'string' ? hex(a) : a, B = typeof b === 'string' ? hex(b) : b; return A.map((v, i) => Math.round(v + (B[i] - v) * t)); }
    function rgb(c, a) { const f = typeof c === 'string' ? hex(c) : c; return a === undefined ? 'rgb(' + f.join(',') + ')' : 'rgba(' + f.join(',') + ',' + a + ')'; }
    function klemm(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function glatt(a, b, x) { const t = klemm((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
    function rauschen(periode, seed) {
        const r = zufall(seed), N = 256, werte = new Float32Array(periode * N);
        for (let i = 0; i < werte.length; i++) werte[i] = r();
        const v = (x, y) => werte[(((y % N) + N) % N) * periode + (((x % periode) + periode) % periode)];
        return function (x, y) {
            const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
            const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
            const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
            return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
        };
    }
    function fbm(n, x, y, okt) { let s = 0, amp = 0.5, f = 1, norm = 0; for (let i = 0; i < okt; i++) { s += n(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; } return s / norm; }
    function kamm(punkte, rauheit, seed) {
        const r = zufall(seed), h = new Float32Array(punkte + 1);
        h[0] = r(); h[punkte] = r();
        for (let schritt = punkte, amp = 1; schritt > 1; schritt >>= 1, amp *= rauheit) {
            for (let i = schritt >> 1; i < punkte; i += schritt) h[i] = (h[i - (schritt >> 1)] + h[i + (schritt >> 1)]) / 2 + (r() - 0.5) * amp;
        }
        let min = Infinity, max = -Infinity; h.forEach(v => { min = Math.min(min, v); max = Math.max(max, v); });
        return Array.from(h, v => (v - min) / (max - min));
    }

    // ── Farben: Mondnacht (dunkel) und klarer Wintermorgen (helles Thema) ──
    const NACHT = {
        zenit: '#030817', mitte: '#0c1c40', horizont: '#3a5582', dunst: '#5a76a3', mond: true,
        schneeLicht: '#d9e6f8', schneeSchatten: '#4a6390', fels: '#141d2e', tanne: '#0a1a1d', tanneLicht: '#2a4750',
        tanneSchnee: '#c3d6f0', holz: '#2b1c14', holzLicht: '#54382a', schein: 1, korn: 0.05
    };
    const MORGEN = {
        zenit: '#5e93cf', mitte: '#a4c8ea', horizont: '#f8e4d4', dunst: '#f2ece8', mond: false,
        schneeLicht: '#ffffff', schneeSchatten: '#b0c6e0', fels: '#55606f', tanne: '#20443a', tanneLicht: '#4a7464',
        tanneSchnee: '#ffffff', holz: '#5b3b27', holzLicht: '#8d6243', schein: 0.42, korn: 0.025
    };

    let st = null;
    const RUHIG = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Himmel ─────────────────────────────────────────────
    function maleHimmel(ctx, W, H, hy, P) {
        const g = ctx.createLinearGradient(0, 0, 0, hy * 1.08);
        g.addColorStop(0, P.zenit); g.addColorStop(0.5, P.mitte); g.addColorStop(0.86, P.horizont); g.addColorStop(1, P.dunst);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (P.mond) {
            const r = zufall(7), n = rauschen(64, 99);
            for (let i = 0; i < 4200; i++) {   // Milchstraße: schräges, wolkiges Band
                const t = r(), x = t * W, y = hy * (0.72 - t * 0.6) + (r() - 0.5) * hy * 0.3;
                const d = fbm(n, x / 44, y / 44, 4);
                if (d < 0.47) continue;
                ctx.fillStyle = 'rgba(205,215,255,' + ((d - 0.47) * 0.32).toFixed(3) + ')';
                ctx.fillRect(x, y, 1.5, 1.5);
            }
            for (let i = 0; i < 620; i++) {
                const x = r() * W, y = Math.pow(r(), 1.35) * hy * 0.94, m = Math.pow(r(), 3.4);
                ctx.fillStyle = 'rgba(' + (m > 0.55 ? '255,238,214' : '214,226,255') + ',' + ((0.22 + m * 0.78) * (1 - y / hy * 0.72)).toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(x, y, 0.35 + m * 1.25, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    function maleMond(ctx, x, y, R, P) {
        const hof = R * (P.mond ? 11 : 15);
        let g = ctx.createRadialGradient(x, y, 0, x, y, hof);
        const farbe = P.mond ? '190,208,244' : '255,244,226';
        g.addColorStop(0, 'rgba(' + farbe + ',' + (P.mond ? 0.42 : 0.8) + ')'); g.addColorStop(0.2, 'rgba(' + farbe + ',' + (P.mond ? 0.13 : 0.32) + ')'); g.addColorStop(1, 'rgba(' + farbe + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, hof, 0, Math.PI * 2); ctx.fill();
        if (!P.mond) return;
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
        g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, 0, x, y, R);
        g.addColorStop(0, '#fbf8f0'); g.addColorStop(1, '#cfccc3'); ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        const mn = rauschen(16, 5);
        for (let yy = -R; yy < R; yy += 1) for (let xx = -R; xx < R; xx += 1) {
            const d = fbm(mn, (xx + 40) / (R * 0.42), (yy + 40) / (R * 0.42), 3);
            if (d > 0.53) { ctx.fillStyle = 'rgba(112,110,106,' + ((d - 0.53) * 1.5).toFixed(2) + ')'; ctx.fillRect(x + xx, y + yy, 1, 1); }
        }
        ctx.restore();
    }

    // Dünne Wolkenschleier, vom Mond her beleuchtet.
    function maleSchleier(ctx, W, hy, mx, my, P) {
        const lw = 320, lh = Math.max(40, Math.round(lw * hy / W));
        const tex = document.createElement('canvas'); tex.width = lw; tex.height = lh;
        const t = tex.getContext('2d'), im = t.createImageData(lw, lh), d = im.data, n = rauschen(8, 31);
        const hell = P.mond ? [150, 172, 214] : [255, 255, 255];
        for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
            const v = fbm(n, x / lw * 8, y / lh * 8 * 0.32 + 3, 5);
            const a = klemm((v - 0.53) * 3.2, 0, 1) * glatt(1, 0.45, y / lh);
            const ab = Math.hypot(x / lw * W - mx, y / lh * hy - my) / W;
            const i = (y * lw + x) * 4;
            d[i] = hell[0]; d[i + 1] = hell[1]; d[i + 2] = hell[2];
            d[i + 3] = Math.round(a * (P.mond ? 0.1 + 0.34 * glatt(0.5, 0, ab) : 0.62) * 255);
        }
        t.putImageData(im, 0, 0);
        ctx.imageSmoothingQuality = 'high'; ctx.drawImage(tex, 0, 0, W, hy);
    }

    // ── Berge mit Schnee: Licht je Pixel nach der Neigung zum Mond, steile Flanken bleiben Fels ──
    function maleBerg(ctx, W, H, K, P, hy, mondSeite) {
        const h = kamm(512, K.rauh, K.seed), o = hy - K.hoehe * H, sw = 340;
        const sh = Math.max(10, Math.round(sw * (hy + 8 - o) / W));
        const pfad = new Path2D(); pfad.moveTo(0, hy + 8);
        for (let j = 0; j <= 512; j++) pfad.lineTo(j / 512 * W, hy + 8 - (K.sockel + h[j] * (1 - K.sockel)) * K.hoehe * H);
        pfad.lineTo(W, hy + 8); pfad.closePath();
        const tex = document.createElement('canvas'); tex.width = sw; tex.height = sh;
        const t = tex.getContext('2d'), im = t.createImageData(sw, sh), d = im.data;
        // Grobe Rinnen plus wenig Feines: Fünf gleich starke Oktaven sahen aus wie zerknülltes Papier.
        const n = rauschen(32, K.seed + 7), skal = 31;
        const grat = (x, y) => { const v = fbm(n, x / skal, y / (skal * 0.62), 5); return 1 - Math.abs(v * 2 - 1); };
        const hell = mix(P.dunst, P.schneeLicht, K.nah), dunkel = mix(P.dunst, P.schneeSchatten, K.nah), fels = mix(P.dunst, P.fels, K.nah);
        for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
            const gx = grat(x + 1, y) - grat(x - 1, y), gy = grat(x, y + 1) - grat(x, y - 1);
            const licht = klemm(0.52 + (gx * -mondSeite + gy * -0.5) * 6.5, 0, 1);
            const steil = klemm((Math.hypot(gx, gy) - 0.082) * 11, 0, 1) * glatt(1, 0.38, y / sh);
            let c = mix(dunkel, hell, licht); c = mix(c, fels, steil * 0.82 * (1 - licht * 0.5));
            c = mix(c, P.dunst, glatt(0.5, 1, y / sh) * (1 - K.nah * 0.55));
            const i = (y * sw + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
        t.putImageData(im, 0, 0);
        ctx.save(); ctx.clip(pfad); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(tex, 0, o, W, hy + 8 - o); ctx.restore();
    }

    // ── Bäume: viele kleine hängende Äste statt eines Dreiecks ──
    function kleineTanne(ctx, x, y, h, r, farbe, licht, schnee, seite) {
        const stufen = Math.max(5, Math.round(h / 5));
        ctx.fillStyle = rgb(farbe);
        ctx.beginPath(); ctx.moveTo(x, y - h);
        for (let i = 1; i <= stufen; i++) { const t = i / stufen, b = h * 0.21 * Math.pow(t, 0.88) * (0.86 + r() * 0.32), yy = y - h + h * t; ctx.lineTo(x + b, yy + h * 0.024); ctx.lineTo(x + b * 0.56, yy - h * 0.012); }
        for (let i = stufen; i >= 1; i--) { const t = i / stufen, b = h * 0.21 * Math.pow(t, 0.88) * (0.86 + r() * 0.32), yy = y - h + h * t; ctx.lineTo(x - b * 0.56, yy - h * 0.012); ctx.lineTo(x - b, yy + h * 0.024); }
        ctx.closePath(); ctx.fill();
        if (h < 14) return;
        // Schnee liegt auf den Astspitzen, auf der Mondseite stärker.
        ctx.strokeStyle = rgb(schnee); ctx.lineCap = 'round';
        for (let i = 1; i <= stufen; i++) {
            const t = i / stufen, b = h * 0.2 * Math.pow(t, 0.88), yy = y - h + h * t;
            if (r() > 0.82) continue;
            ctx.globalAlpha = 0.55 + r() * 0.4; ctx.lineWidth = Math.max(0.8, h * 0.017);
            const a = r();
            ctx.beginPath(); ctx.moveTo(x + seite * b * a * 0.2, yy - h * 0.035); ctx.lineTo(x + seite * b * (0.6 + a * 0.4), yy + h * 0.004); ctx.stroke();
            if (r() < 0.55) { ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.moveTo(x - seite * b * 0.15, yy - h * 0.03); ctx.lineTo(x - seite * b * 0.72, yy); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
    }

    function maleWaldReihe(ctx, W, H, R, P, hy, s, mondSeite, U) {
        const k = kamm(128, 0.42, R.seed), r = zufall(R.seed * 5);
        const y0 = (j) => hy + R.tief * U - k[j] * R.welle * U;
        const farbe = mix(P.dunst, P.tanne, R.nah), licht = mix(P.dunst, P.tanneLicht, R.nah), schnee = mix(P.dunst, P.tanneSchnee, R.nah);
        const hang = new Path2D(); hang.moveTo(0, H);
        for (let j = 0; j <= 128; j++) hang.lineTo(j / 128 * W, y0(j));
        hang.lineTo(W, H); hang.closePath();
        const g = ctx.createLinearGradient(0, hy + R.tief * U - R.welle * U, 0, hy + R.tief * U + 0.1 * U);
        g.addColorStop(0, rgb(mix(P.dunst, P.schneeLicht, R.nah))); g.addColorStop(1, rgb(mix(P.dunst, P.schneeSchatten, R.nah)));
        ctx.fillStyle = g; ctx.fill(hang);
        const liste = [], n = Math.round(W / (R.baum * s * 0.34));
        for (let i = 0; i < n; i++) {
            const t = r(), x = t * W, h = R.baum * s * (0.58 + r() * 0.72);
            if (R.lichtung && Math.abs(x - R.lichtung[0]) < R.lichtung[1]) continue;
            liste.push([x, y0(Math.round(t * 128)) + r() * 5 * s, h]);
        }
        liste.sort((a, b) => a[1] - b[1]).forEach(b => kleineTanne(ctx, b[0], b[1], b[2], r, farbe, licht, schnee, mondSeite));
        const nb = ctx.createLinearGradient(0, hy + R.tief * U - 0.015 * U, 0, hy + R.tief * U + 0.055 * U);
        nb.addColorStop(0, rgb(hex(P.dunst), 0)); nb.addColorStop(1, rgb(hex(P.dunst), R.nebel));
        ctx.fillStyle = nb; ctx.fillRect(0, hy + R.tief * U - 0.015 * U, W, 0.07 * U);
    }

    // Schneefläche mit Verwehungen: Licht je Pixel, keine gezeichneten Wellen.
    function maleBoden(ctx, W, H, oben, P, mondSeite, s) {
        const lw = 420, lh = Math.max(20, Math.round(lw * (H - oben) / W));
        const tex = document.createElement('canvas'); tex.width = lw; tex.height = lh;
        const t = tex.getContext('2d'), im = t.createImageData(lw, lh), d = im.data, n = rauschen(32, 77);
        // Perspektive: u wird nach vorn größer, v staucht zum Horizont hin. Ein festes y/x-Verhältnis
        // zog senkrechte Schlieren wie ein Wasserfall (Bild vom 07.11.2026).
        const hoehe = (x, y) => { const tf = 22 + y * 0.9; return fbm(n, (x - lw / 2) / tf + 64, Math.log(1 + y / 7) * 3.6, 5); };
        for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
            const gx = hoehe(x + 1, y) - hoehe(x - 1, y), gy = hoehe(x, y + 1) - hoehe(x, y - 1);
            const groesse = 22 + y * 0.9;
            // Weich halten: Der volle Lichtausschlag ergab Tarnflecken (Bild vom 07.11.2026).
            const l = klemm(0.6 + (gx * -mondSeite + gy * 0.8) * groesse * 0.085, 0, 1), tief = y / lh;
            const c = mix(mix(P.dunst, P.schneeSchatten, klemm(0.46 + tief * 0.4, 0, 1)), P.schneeLicht, l * (0.97 - tief * 0.32));
            const i = (y * lw + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.round(glatt(0, 0.035, tief) * 255);
        }
        t.putImageData(im, 0, 0);
        ctx.imageSmoothingQuality = 'high'; ctx.drawImage(tex, 0, oben, W, H - oben);
        // Eiskristalle funkeln im Licht.
        const r = zufall(41);
        for (let i = 0; i < 700; i++) {
            const y = oben + Math.pow(r(), 0.8) * (H - oben), a = 0.2 + r() * 0.7;
            ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
            ctx.fillRect(r() * W, y, 0.7 + r() * s, 0.7 + r() * s);
        }
    }

    // ── Hütte in Dreiviertelansicht ──
    function maleHuette(ctx, x, y, k, P, st2) {
        const r = zufall(19), bF = 118 * k, bS = 176 * k, hW = 70 * k, sk = 0.2, first = 62 * k;
        const FR = x + bF, BR = x + bF + bS, Yb = y - bS * sk;
        // Seitenwand: Rundhölzer, nach hinten dunkler
        const balken = (ax, ay, bx, by, h, n, hell, dunkel) => {
            for (let i = 0; i < n; i++) {
                const t = i / n, t2 = (i + 1) / n;
                const g = ctx.createLinearGradient(0, ay - h * t2, 0, ay - h * t);
                g.addColorStop(0, rgb(hell)); g.addColorStop(0.55, rgb(mix(hell, dunkel, 0.5))); g.addColorStop(1, rgb(dunkel));
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.moveTo(ax, ay - h * t); ctx.lineTo(bx, by - h * t); ctx.lineTo(bx, by - h * t2); ctx.lineTo(ax, ay - h * t2); ctx.closePath(); ctx.fill();
            }
        };
        balken(FR, y, BR, Yb, hW, 11, mix(P.holzLicht, P.holz, 0.65), mix(P.holz, '#000000', 0.55));
        balken(x, y, FR, y, hW, 11, mix(P.holzLicht, P.holz, 0.3), mix(P.holz, '#000000', 0.3));
        // Giebel über der Vorderwand
        ctx.save(); ctx.beginPath(); ctx.moveTo(x - 2, y - hW); ctx.lineTo(x + bF / 2, y - hW - first); ctx.lineTo(FR + 2, y - hW); ctx.closePath(); ctx.clip();
        for (let i = 0; i < 9; i++) { ctx.fillStyle = rgb(mix(P.holzLicht, P.holz, (i % 2) * 0.5 + 0.25)); ctx.fillRect(x, y - hW - first + i * first / 9, bF, first / 9 + 1); }
        ctx.restore();
        // Fenster: warm von innen, mit Sprossen, Vorhangkante und Eisrand
        const fenster = (fx, fy, fw, fh, schief) => {
            ctx.save(); ctx.translate(fx, fy); if (schief) ctx.transform(1, -sk, 0, 1, 0, 0);
            ctx.fillStyle = '#1b100a'; ctx.fillRect(-2.5 * k, -2.5 * k, fw + 5 * k, fh + 5 * k);
            const g = ctx.createRadialGradient(fw / 2, fh * 0.6, 1, fw / 2, fh * 0.6, fw * 0.95);
            g.addColorStop(0, '#fff0b0'); g.addColorStop(0.5, '#ffbe58'); g.addColorStop(1, '#c76b22');
            ctx.fillStyle = g; ctx.fillRect(0, 0, fw, fh);
            ctx.fillStyle = 'rgba(120,50,20,0.55)'; ctx.fillRect(0, 0, fw * 0.17, fh); ctx.fillRect(fw * 0.83, 0, fw * 0.17, fh);
            ctx.fillStyle = '#2a170d'; ctx.fillRect(fw / 2 - 0.9 * k, 0, 1.8 * k, fh); ctx.fillRect(0, fh * 0.46, fw, 1.6 * k);
            ctx.fillStyle = 'rgba(232,242,255,0.85)'; ctx.fillRect(-3 * k, fh + 2 * k, fw + 6 * k, 3 * k);
            ctx.restore();
            st2.fenster.push([fx + fw / 2, fy + fh / 2 - (schief ? fw * sk / 2 : 0), fw]);
        };
        fenster(x + bF * 0.13, y - hW * 0.76, 26 * k, 30 * k, false);
        fenster(x + bF * 0.65, y - hW * 0.76, 26 * k, 30 * k, false);
        fenster(FR + bS * 0.16, y - bS * 0.16 * sk - hW * 0.76, 30 * k, 28 * k, true);
        fenster(FR + bS * 0.62, y - bS * 0.62 * sk - hW * 0.76, 30 * k, 28 * k, true);
        // Tür
        ctx.fillStyle = '#21140c'; ctx.fillRect(x + bF * 0.4, y - hW * 0.72, bF * 0.2, hW * 0.72);
        ctx.fillStyle = '#d7b26a'; ctx.beginPath(); ctx.arc(x + bF * 0.56, y - hW * 0.36, 1.2 * k, 0, Math.PI * 2); ctx.fill();
        // Schornstein
        const cx = FR + bS * 0.6, cy = y - bS * 0.6 * sk - hW - first * 0.55;
        ctx.fillStyle = '#2a2a30'; ctx.fillRect(cx, cy - 34 * k, 18 * k, 50 * k);
        for (let i = 0; i < 36; i++) { ctx.fillStyle = 'rgba(' + (r() > 0.5 ? '255,255,255,0.06' : '0,0,0,0.25') + ')'; ctx.fillRect(cx + r() * 16 * k, cy - 34 * k + r() * 48 * k, 5 * k, 3 * k); }
        ctx.fillStyle = rgb(hex(P.schneeLicht)); ctx.beginPath(); ctx.ellipse(cx + 9 * k, cy - 35 * k, 12.5 * k, 4.8 * k, 0, 0, Math.PI * 2); ctx.fill();
        st2.rauch = [cx + 9 * k, cy - 38 * k, k];
        // Dach: Seitenfläche und Giebelkante, dick verschneit, Kante unregelmäßig
        const dachL = x + bF / 2, dachY = y - hW - first;
        const n = rauschen(16, 3);
        const flaeche = new Path2D();
        flaeche.moveTo(dachL, dachY - 3 * k);
        flaeche.lineTo(dachL + bS + 8 * k, dachY - bS * sk - 3 * k);
        for (let i = 0; i <= 40; i++) { const t = 1 - i / 40; flaeche.lineTo(FR + 14 * k + (bS + 2 * k) * t, y - hW + 7 * k - (bS + 2 * k) * t * sk + (fbm(n, i / 3, 1, 3) - 0.5) * 11 * k); }
        flaeche.closePath();
        let g = ctx.createLinearGradient(dachL, dachY, FR + 16 * k, y - hW + 8 * k);
        g.addColorStop(0, rgb(hex(P.schneeLicht))); g.addColorStop(0.65, rgb(mix(P.schneeLicht, P.schneeSchatten, 0.34))); g.addColorStop(1, rgb(hex(P.schneeSchatten)));
        ctx.fillStyle = g; ctx.fill(flaeche);
        // Giebelkante vorn, von Schnee gesäumt
        ctx.lineCap = 'round'; ctx.strokeStyle = rgb(mix(P.schneeLicht, P.schneeSchatten, 0.12)); ctx.lineWidth = 7.5 * k;
        ctx.beginPath(); ctx.moveTo(x - 12 * k, y - hW + 9 * k); ctx.lineTo(dachL, dachY - 2 * k); ctx.lineTo(FR + 12 * k, y - hW + 9 * k); ctx.stroke();
        // Schneebank an der Hauswand: Ohne sie schwebte die Hütte auf dem Schnee.
        const bank = new Path2D(), nb = rauschen(16, 22);
        bank.moveTo(x - 14 * k, y + 12 * k);
        for (let i = 0; i <= 40; i++) { const t = i / 40, wx = x - 14 * k + (bF + bS + 28 * k) * t, wy = wx < FR ? y : y - (wx - FR) * sk; bank.lineTo(wx, wy - (3 + fbm(nb, i / 3, 3, 3) * 15) * k); }
        bank.lineTo(BR + 14 * k, Yb + 14 * k); bank.lineTo(FR, y + 15 * k); bank.closePath();
        const bg = ctx.createLinearGradient(0, y - 18 * k, 0, y + 14 * k);
        bg.addColorStop(0, rgb(mix(P.schneeLicht, P.schneeSchatten, 0.12))); bg.addColorStop(0.7, rgb(mix(P.schneeLicht, P.schneeSchatten, 0.36))); bg.addColorStop(1, rgb(mix(P.schneeLicht, P.schneeSchatten, 0.5), 0));
        ctx.fillStyle = bg; ctx.fill(bank);
        // Eiszapfen an der Traufe
        ctx.fillStyle = 'rgba(214,232,255,0.78)';
        for (let i = 0; i < 22; i++) {
            const t = r(), ix = FR + 14 * k + bS * t, iy = y - hW + 11 * k - bS * t * sk, l = (3 + r() * 11) * k;
            ctx.beginPath(); ctx.moveTo(ix - 1.1 * k, iy); ctx.lineTo(ix + 1.1 * k, iy); ctx.lineTo(ix, iy + l); ctx.closePath(); ctx.fill();
        }
    }

    // Warmes Licht strahlt durch die Luft und fällt auf den Schnee. „lighter“ addiert, wie echtes Licht.
    function maleLichtschein(ctx, s2, P, k, bodenY) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        s2.fenster.forEach(f => {
            let g = ctx.createRadialGradient(f[0], f[1], 0, f[0], f[1], f[2] * 3);
            g.addColorStop(0, 'rgba(255,190,100,' + (0.42 * P.schein) + ')'); g.addColorStop(1, 'rgba(255,150,60,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f[0], f[1], f[2] * 3, 0, Math.PI * 2); ctx.fill();
            ctx.save(); ctx.translate(f[0], bodenY + 26 * k); ctx.scale(1, 0.26);
            g = ctx.createRadialGradient(0, 0, 0, 0, 0, f[2] * 3.5);
            g.addColorStop(0, 'rgba(255,170,84,' + (0.5 * P.schein) + ')'); g.addColorStop(1, 'rgba(255,130,50,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, f[2] * 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        });
        ctx.restore();
    }

    // ── Der große Baum: Hunderte hängende Zweige mit Nadeln, Schnee auf den Oberseiten ──
    function maleBaum(ctx, x, y, h, P, s2, mondSeite) {
        const r = zufall(61), b = h * 0.3, schichten = 46;
        // Schlagschatten und Stamm
        ctx.save(); ctx.translate(x - mondSeite * h * 0.24, y + 3); ctx.scale(1, 0.13);
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.5);
        sg.addColorStop(0, rgb(hex(P.schneeSchatten), 0.85)); sg.addColorStop(1, rgb(hex(P.schneeSchatten), 0));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, h * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.fillStyle = '#20150e'; ctx.fillRect(x - h * 0.016, y - h * 0.09, h * 0.032, h * 0.08);
        const spitze = y - h, dunkel = mix(P.tanne, '#000000', 0.4), mittel = hex(P.tanne), hell = hex(P.tanneLicht);
        // Zweige setzen über die ganze Vorderseite an, nicht nur am Stamm: Sonst stand der Stamm als
        // Strich im Baum und die untersten Äste standen als Rock ab (Bild vom 07.11.2026).
        const zweig = (t, dir, tief) => {
            const voll = b * Math.pow(t, 0.92), ansatz = tief ? 0 : Math.pow(r(), 0.8) * voll * 0.76;
            const breite = klemm(voll * (0.3 + r() * 0.34), h * 0.024, voll * 1.02 - ansatz + h * 0.012), wy = spitze + h * 0.03 + t * h * 0.84 + (r() - 0.5) * 2;
            const sx = x + dir * (h * 0.006 + ansatz), ex = sx + dir * breite, ey = wy + breite * (0.2 + r() * 0.2) + h * 0.01, mx = sx + dir * breite * 0.55, my = wy + breite * 0.03;
            const seitenLicht = dir === mondSeite ? 0.8 : 0.1, f = mix(tief ? dunkel : mittel, hell, seitenLicht * (tief ? 0 : 0.6) * r());
            ctx.strokeStyle = rgb(f); ctx.lineWidth = Math.max(0.8, h * 0.0034);
            ctx.beginPath(); ctx.moveTo(sx, wy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
            const nadeln = Math.round(5 + breite / (h * 0.0078));
            ctx.lineWidth = Math.max(0.55, h * 0.0021);
            for (let i = 0; i < nadeln; i++) {
                const a = i / nadeln, q = 1 - a, px = q * q * sx + 2 * q * a * mx + a * a * ex, py = q * q * wy + 2 * q * a * my + a * a * ey;
                const l = h * (0.018 + r() * 0.017);
                ctx.strokeStyle = rgb(mix(f, r() > 0.6 ? hell : dunkel, 0.3 * r()));
                ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dir * l * 0.4 * (r() + 0.25), py + l * (r() > 0.5 ? 1 : -0.34)); ctx.stroke();
            }
            return { sx, wy, mx, my, ex, ey };
        };
        ctx.lineCap = 'round';
        // Innen dunkel, damit der Baum Tiefe bekommt
        ctx.fillStyle = rgb(dunkel);
        ctx.beginPath(); ctx.moveTo(x, spitze + h * 0.03);
        ctx.lineTo(x + b * 0.86, y - h * 0.105); ctx.quadraticCurveTo(x, y - h * 0.065, x - b * 0.86, y - h * 0.105); ctx.closePath(); ctx.fill();
        for (let i = 0; i < schichten * 3; i++) zweig(Math.pow(r(), 0.72), r() < 0.5 ? -1 : 1, true);
        const aussen = [];
        for (let i = 0; i < schichten; i++) {
            const t = 0.015 + (i / schichten) * 0.985;
            for (let j = 0; j < 5 + Math.round(t * 15); j++) aussen.push([t + (r() - 0.5) * 0.03, r() < 0.5 ? -1 : 1]);
        }
        aussen.forEach(a => {
            const z = zweig(klemm(a[0], 0.015, 1), a[1], false);
            // Schneelast: weiche Klumpen auf der Oberseite des Zweigs
            if (r() < 0.75) {
                const kl = 3 + Math.round(r() * 5);
                ctx.fillStyle = rgb(hex(P.tanneSchnee));
                for (let i = 0; i < kl; i++) {
                    const q = 0.25 + (i / kl) * 0.78, w = 1 - q, px = w * w * z.sx + 2 * w * q * z.mx + q * q * z.ex, py = w * w * z.wy + 2 * w * q * z.my + q * q * z.ey;
                    ctx.globalAlpha = (a[1] === mondSeite ? 0.92 : 0.52) * (0.65 + r() * 0.35);
                    ctx.beginPath(); ctx.ellipse(px, py - h * 0.0045, h * (0.008 + r() * 0.01), h * (0.0035 + r() * 0.003), 0, 0, Math.PI * 2); ctx.fill();
                }
                ctx.globalAlpha = 1;
            }
        });
        // Plätze der 24 Lichter: außen am Baum, gleichmäßig verteilt
        const rl = zufall(903);
        s2.lichter = [];
        for (let i = 0; i < 24; i++) {
            // Goldener Schnitt verteilt die Seite gleichmäßig; Zufall ballte die Lichter in der Mitte.
            const t = 0.13 + ((i * 7) % 24) / 24 * 0.8, seite = ((i * 0.618034) % 1) * 2 - 1;
            s2.lichter.push({ x: x + seite * b * Math.pow(t, 0.92) * 0.8, y: spitze + h * 0.05 + t * h * 0.8 + (rl() - 0.5) * h * 0.012, f: ['#ffb347', '#ff5f4f', '#ffd98a', '#8fd1ff'][i % 4], p: rl() * 6.28 });
        }
        s2.stern = [x, spitze + h * 0.002, h];
        // Stern aus Metall, leuchtet erst nach allen 24 Türchen
        ctx.fillStyle = '#6d5a2c'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const w = -Math.PI / 2 + i * Math.PI / 5, ra = (i % 2 ? 0.45 : 1) * h * 0.024; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(w) * ra, spitze + Math.sin(w) * ra); }
        ctx.closePath(); ctx.fill();
    }

    function maleVordergrund(ctx, W, H, P, s) {
        const r = zufall(87);
        [[-0.012, H * 1.02, 330], [0.05, H * 1.04, 240], [1.012, H * 1.02, 380], [0.96, H * 1.05, 270]].forEach(b => {
            kleineTanne(ctx, b[0] * W, b[1], b[2] * s, r, mix(P.tanne, '#000000', 0.52), P.tanne, mix(P.tanneSchnee, P.schneeSchatten, 0.55), 1);
        });
    }

    function maleSzene(c, W, H, DPR, P) {
        const ctx = c.getContext('2d');
        c.width = Math.round(W * DPR); c.height = Math.round(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        // Die Szene ist die Bühne, darum hängt alles an festen Maßen von oben rechts statt an der Fensterhöhe:
        // Am Desktop stehen Hütte und Baum neben dem Kalender, am Handy im freien Fenster über ihm. Mittig im
        // Bild verschwanden sie hinter den Karten (Bild vom 07.11.2026). Gleiche Maße: --wn-buehne im CSS.
        const hoch = H > W, s = hoch ? klemm(W / 400, 0.85, 1.4) : klemm(W / 1440, 0.72, 1.45), U = 560 * s;
        const hy = hoch ? 150 * s : Math.min(H * 0.34, 252 * s), ms = 1;
        const tx = hoch ? W * 0.8 : W - 122 * s, th = (hoch ? 190 : 288) * s, k = (hoch ? 0.56 : 0.82) * s;
        const fx = hoch ? W * 0.1 : tx - 112 * s - 294 * k;
        const mx = hoch ? W * 0.46 : tx - 200 * s, my = (hoch ? 54 : 58) * s, moR = (hoch ? 20 : 25) * s;
        maleHimmel(ctx, W, H, hy, P);
        if (P.mond) maleMond(ctx, mx, my, moR, P); else maleMond(ctx, mx, my, moR * 1.4, P);
        maleSchleier(ctx, W, hy, mx, my, P);
        maleBerg(ctx, W, H, { hoehe: hy * 0.8 / H, sockel: 0.26, nah: 0.5, rauh: 0.64, seed: 12 }, P, hy, ms);
        maleBerg(ctx, W, H, { hoehe: hy * 0.54 / H, sockel: 0.2, nah: 0.82, rauh: 0.62, seed: 34 }, P, hy, ms);
        maleWaldReihe(ctx, W, H, { tief: -0.012, welle: 0.05, baum: 18, nah: 0.5, seed: 21, nebel: 0.58 }, P, hy, s, ms, U);
        maleWaldReihe(ctx, W, H, { tief: 0.016, welle: 0.042, baum: 32, nah: 0.76, seed: 35, nebel: 0.36 }, P, hy, s, ms, U);
        maleWaldReihe(ctx, W, H, { tief: 0.046, welle: 0.03, baum: 54, nah: 0.95, seed: 58, nebel: 0, lichtung: [fx + 150 * k, 190 * k] }, P, hy, s, ms, U);

        const boden = hy + 0.062 * U;
        maleBoden(ctx, W, H, boden, P, ms, s);
        const s2 = { fenster: [], lichter: [], rauch: null, stern: null };
        const hx = fx, hyy = boden + 0.052 * U;
        ctx.save(); ctx.translate(hx + 150 * k, hyy + 8 * k); ctx.scale(1, 0.12);   // Schatten der Hütte
        const sg = ctx.createRadialGradient(-40 * k, 0, 0, -40 * k, 0, 320 * k);
        sg.addColorStop(0, rgb(hex(P.schneeSchatten), 0.8)); sg.addColorStop(1, rgb(hex(P.schneeSchatten), 0));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(-40 * k, 0, 320 * k, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        maleHuette(ctx, hx, hyy, k, P, s2);
        // Spur im Schnee zur Tür
        const pr = zufall(9); ctx.fillStyle = rgb(hex(P.schneeSchatten), 0.55);
        for (let i = 0; i < 28; i++) {
            const t = i / 28, px = hx + 59 * k + Math.sin(t * 3) * 34 * k * t, py = hyy + t * t * U * 0.5 + 2;
            ctx.beginPath(); ctx.ellipse(px + (i % 2 ? 8 : -8) * (0.5 + t) * k, py, (2.4 + t * 7) * k, (1 + t * 3) * k, 0, 0, Math.PI * 2); ctx.fill();
            if (pr() > 2) break;
        }
        maleLichtschein(ctx, s2, P, k, hyy);
                maleBaum(ctx, tx, hyy + 0.05 * U, th, P, s2, ms);
        // Schneehügel um den Stamm: Sonst steht der Baum wie auf einem Stock.
        ctx.save(); ctx.translate(tx, hyy + 0.05 * U + 2); ctx.scale(1, 0.16);
        const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, th * 0.27);
        hg.addColorStop(0, rgb(P.schneeLicht)); hg.addColorStop(0.72, rgb(mix(P.schneeLicht, P.schneeSchatten, 0.45), 0.95)); hg.addColorStop(1, rgb(P.schneeSchatten, 0));
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, th * 0.27, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        maleVordergrund(ctx, W, H, P, s);
        // Licht fällt zum Rand ab, feines Korn nimmt dem Bild die Computerglätte.
        const v = ctx.createRadialGradient(tx - 100 * s, hy, Math.min(W, H) * 0.3, tx - 100 * s, hy, Math.max(W, H) * 0.95);
        v.addColorStop(0, 'rgba(0,4,16,0)'); v.addColorStop(1, 'rgba(0,4,16,' + (P.mond ? 0.5 : 0.08) + ')');
        ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
        const kt = document.createElement('canvas'); kt.width = kt.height = 128;
        const ktc = kt.getContext('2d'), im = ktc.createImageData(128, 128), kr = zufall(15);
        for (let i = 0; i < im.data.length; i += 4) { const w = kr() > 0.5 ? 255 : 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = w; im.data[i + 3] = Math.round(kr() * 255 * P.korn); }
        ktc.putImageData(im, 0, 0);
        ctx.fillStyle = ctx.createPattern(kt, 'repeat'); ctx.fillRect(0, 0, W, H);
        return s2;
    }

    // ── Bewegtes: Schnee in drei Tiefen, Rauch, Lichter ──
    function flockenSprite(r, a) {
        const c = document.createElement('canvas'), d = Math.ceil(r * 2.4); c.width = c.height = d * 2;
        const x = c.getContext('2d'), g = x.createRadialGradient(d, d, 0, d, d, d);
        g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(0.42, 'rgba(255,255,255,' + a * 0.7 + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, d * 2, d * 2); return c;
    }

    function lebenBauen() {
        const { W, H } = st, r = zufall(11), n = Math.round(Math.min(240, W * H / 8000));
        st.flocken = Array.from({ length: n }, () => {
            const z = Math.pow(r(), 1.8);
            return { x: r() * W, y: r() * H, z, p: r() * 6.28, v: 0.35 + z * 1.5 };
        });
        st.sprites = [flockenSprite(1.1, st.P.mond ? 0.78 : 0.95), flockenSprite(2.1, st.P.mond ? 0.85 : 0.98), flockenSprite(5.2, 0.55)];
        const rs = document.createElement('canvas'); rs.width = rs.height = 96;
        const rc = rs.getContext('2d'), rg = rc.createRadialGradient(48, 48, 2, 48, 48, 48);
        rg.addColorStop(0, st.P.mond ? 'rgba(190,204,232,1)' : 'rgba(255,255,255,1)'); rg.addColorStop(0.5, st.P.mond ? 'rgba(170,186,220,0.42)' : 'rgba(255,255,255,0.42)'); rg.addColorStop(1, 'rgba(170,186,220,0)');
        rc.fillStyle = rg; rc.fillRect(0, 0, 96, 96); st.rauchSprite = rs;
        st.puffs = Array.from({ length: 16 }, (_, i) => ({ t: i / 16, p: r() * 6.28 }));
    }

    function bild(t) {
        const ctx = st.lctx, { W, H, s2 } = st;
        ctx.clearRect(0, 0, W, H);
        const boe = Math.sin(t / 3100) * 0.55 + Math.sin(t / 1270) * 0.25;
        // Rauch: weiche Scheiben steigen auf, werden breit und blass
        if (s2.rauch) {
            const [rx, ry, k] = s2.rauch;
            for (const q of st.puffs) {
                const a = (q.t + t / 15000) % 1, gr = (9 + a * 66) * k;
                // Weiche Scheibe als Vorlage: Vollflächige Kreise waren einzeln als Ringe zu sehen.
                ctx.globalAlpha = Math.sin(a * Math.PI) * (1 - a * 0.7) * 0.2;
                ctx.drawImage(st.rauchSprite, rx + Math.sin(a * 6 + q.p) * 11 * k * a + a * a * 84 * k * (1 + boe * 0.45) - gr / 2, ry - a * 130 * k - gr / 2, gr, gr);
            }
            ctx.globalAlpha = 1;
        }
        // Fenster atmen leicht, wie Feuerschein drinnen
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const flack = 0.6 + Math.sin(t / 310) * 0.1 + Math.sin(t / 137) * 0.07 + Math.sin(t / 811) * 0.1;
        for (const f of s2.fenster) {
            const g = ctx.createRadialGradient(f[0], f[1], 0, f[0], f[1], f[2] * 1.3);
            g.addColorStop(0, 'rgba(255,190,100,' + (0.3 * flack * st.P.schein).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,150,70,0)');
            ctx.fillStyle = g; ctx.fillRect(f[0] - f[2] * 1.3, f[1] - f[2] * 1.3, f[2] * 2.6, f[2] * 2.6);
        }
        // Lichter am Baum: jedes geöffnete Türchen macht eines an
        const anz = st.anzahl, gr = s2.stern ? s2.stern[2] * 0.03 : 8;
        for (let i = 0; i < Math.min(anz, s2.lichter.length); i++) {
            const l = s2.lichter[i], fl = 0.76 + Math.sin(t / 620 + l.p) * 0.24, g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, gr * 2.2);
            g.addColorStop(0, '#fff8e6'); g.addColorStop(0.1, l.f); g.addColorStop(0.32, rgb(hex(l.f), 0.32 * fl)); g.addColorStop(1, rgb(hex(l.f), 0));
            ctx.globalAlpha = fl; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, gr * 2.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (anz >= 24 && s2.stern) {
            const [x, y, h] = s2.stern, R = h * 0.11, g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, 'rgba(255,240,190,0.95)'); g.addColorStop(0.08, 'rgba(255,210,120,0.7)'); g.addColorStop(1, 'rgba(255,190,80,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        // Schnee
        for (const q of st.flocken) {
            q.y += q.v; q.p += 0.016; q.x += Math.sin(q.p) * (0.14 + q.z * 0.5) + boe * q.z * 1.1;
            if (q.y > H + 12) { q.y = -12; q.x = Math.random() * W; }
            if (q.x < -14) q.x += W + 28; else if (q.x > W + 14) q.x -= W + 28;
            const sp = st.sprites[q.z > 0.86 ? 2 : q.z > 0.3 ? 1 : 0];
            ctx.globalAlpha = q.z > 0.86 ? 0.52 : 1;
            ctx.drawImage(sp, q.x - sp.width / 2, q.y - sp.height / 2);
        }
        ctx.globalAlpha = 1;
    }

    function schleife() {
        if (st.raf || !st.laeuft || RUHIG) return;
        const schritt = (t) => {
            st.raf = 0;
            if (!st.laeuft || document.hidden) return;
            st.raf = requestAnimationFrame(schritt);
            if (t - st.letzte < 32) return;   // 30 Bilder/s genügen für Schnee und sparen Akku
            st.letzte = t;
            try { bild(t); } catch (e) { console.warn('[WeihnachtsSzene]', e); cancelAnimationFrame(st.raf); st.raf = 0; st.laeuft = false; }
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
        st.key = key; st.W = W; st.H = H; st.P = dunkel ? NACHT : MORGEN;
        const DPR = Math.min(1.5, window.devicePixelRatio || 1);
        st.s2 = maleSzene(st.bild, W, H, DPR, st.P);
        st.leben.width = W; st.leben.height = H;
        st.lctx = st.leben.getContext('2d');
        lebenBauen();
        st.root.classList.add('is-da');
        if (RUHIG) { try { bild(0); } catch (e) {} } else schleife();
    }

    function start() {
        if (!st) {
            const root = document.createElement('div');
            root.className = 'wn-welt'; root.setAttribute('aria-hidden', 'true');
            root.innerHTML = '<canvas class="wn-welt-bild"></canvas><canvas class="wn-welt-leben"></canvas>';
            document.body.insertBefore(root, document.body.firstChild);
            st = { root, bild: root.children[0], leben: root.children[1], key: '', raf: 0, laeuft: false, letzte: 0, anzahl: 0 };
            let uhr = 0;
            window.addEventListener('resize', () => { clearTimeout(uhr); uhr = setTimeout(() => { if (st.laeuft) neuMalen(); }, 220); });
            new MutationObserver(() => { if (st.laeuft) neuMalen(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
            document.addEventListener('visibilitychange', () => { if (!document.hidden && st.laeuft) schleife(); });
        }
        st.laeuft = true;
        st.root.hidden = false;
        // Malen kostet auf dem Handy spürbar: erst im Leerlauf, damit der Start der App nicht wartet.
        const los = () => { if (!st.laeuft) return; try { neuMalen(); } catch (e) { console.warn('[WeihnachtsSzene]', e); } if (st.key) schleife(); };
        if ('requestIdleCallback' in window) requestIdleCallback(los, { timeout: 1200 }); else setTimeout(los, 300);
    }
    function stop() {
        if (!st) return;
        st.laeuft = false; cancelAnimationFrame(st.raf); st.raf = 0; st.root.hidden = true;
    }
    function lichter(anzahl) {
        if (st) st.anzahl = anzahl; else window.__wnLichter = anzahl;
    }
    function startMitLichtern(n) { start(); st.anzahl = n; }

    window.WeihnachtsSzene = { start: startMitLichtern, stop, lichter, _bild: () => st && st.bild };
})();
