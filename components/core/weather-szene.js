// ═══ CORE: WETTER-SZENE ═══
// Himmel, Licht und Landschaft im Wetterfenster (#weatherModal .weather-live). Ersetzt seit
// v8.5.16 die alten ~40 animierten DOM-Ebenen (Sonne, Mond, 5 Wolken, Regen-Spans, Blitze,
// Flugzeug, Tornado). Figur, Kennzahlen und Vorhersage malt weiter weather.js darueber.
//
// Warum so gebaut (GPU-Lehre 09.10.2026: am Handy verwarf Chrome Kacheln, weil zu viele
// Ebenen gleichzeitig animiert waren — auch unsichtbare):
// - Die Szene (Himmel, Sonne/Mond, Berge, Boden) wird EINMAL je Lage auf eine Leinwand gemalt.
//   Neu gemalt wird nur, wenn sich Lage, 10-Minuten-Fenster oder Groesse aendern.
// - Wolken und Wolkenschatten sind vorberechnete Texturen, die per CSS-Animation NUR
//   verschoben werden (Compositor, kein Neuzeichnen). Aufloesung bewusst DPR 1 — weich genug.
// - Alles Bewegte (Regen, Schnee, Spritzer, Vogelschwarm, Sternschnuppe, Blitz) teilt sich
//   EINE Leinwand. Deren rAF-Schleife laeuft nur, solange etwas faellt oder fliegt.
// - Geschlossenes Fenster (is-paused) und verdeckter Tab: Schleife und Zeitgeber stehen.
//
// Oeffentlich: WetterSzene.zeichne(widget, {cond, minute, sunrise, sunset, wind}),
//              WetterSzene.pause(widget), WetterSzene.weiter(widget).
(function () {
    'use strict';

    // ── Werkzeuge ───────────────────────────────────────────────
    function zufall(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    function mix(a, b, t) { const A = typeof a === 'string' ? hex(a) : a, B = typeof b === 'string' ? hex(b) : b; return A.map((v, i) => Math.round(v + (B[i] - v) * t)); }
    function mix3(a, b, t) { return [0, 1, 2].map(i => mix(a[i], b[i], t)); }
    function rgb(c, a) { return a === undefined ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')'; }
    function klemm(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function glatt(a, b, x) { const t = klemm((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

    // Wertrauschen, waagerecht periodisch — Wolkentexturen laufen nahtlos endlos durch.
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

    // Bergkamm per Mittelpunktverschiebung — zerklueftet wie echt statt Sinuswelle.
    const _kammCache = {};
    function kamm(punkte, rauheit, seed) {
        const key = punkte + ':' + rauheit + ':' + seed;
        if (_kammCache[key]) return _kammCache[key];
        const r = zufall(seed), h = new Float32Array(punkte + 1);
        h[0] = r(); h[punkte] = r();
        for (let schritt = punkte, amp = 1; schritt > 1; schritt >>= 1, amp *= rauheit) {
            for (let i = schritt >> 1; i < punkte; i += schritt) h[i] = (h[i - (schritt >> 1)] + h[i + (schritt >> 1)]) / 2 + (r() - 0.5) * amp;
        }
        let min = Infinity, max = -Infinity; h.forEach(v => { min = Math.min(min, v); max = Math.max(max, v); });
        return (_kammCache[key] = Array.from(h, v => (v - min) / (max - min)));
    }

    // ── Farben ──────────────────────────────────────────────────
    // Himmel als [Zenit, Mitte, Horizont]. Klar am Tag stufenlos zwischen GOLD (Sonne tief)
    // und MITTAG; nach Sonnenuntergang ueber DAEMMER in NACHT.
    const H_MITTAG = ['#2a64b8', '#5a93d8', '#c4dcf0'];
    const H_GOLD = ['#24346a', '#b0707a', '#ffb26a'];
    const H_DAEMMER = ['#141a3a', '#4a3a6a', '#d27a6a'];
    const H_NACHT = ['#040816', '#0b152d', '#1e2b47'];

    // Je Wetterlage: Bedeckung, wie grau der Himmel wird (tags/nachts), Dunst, Niederschlag.
    const LAGE = {
        'clear-day':    { cover: 0.12, grau: 0 },
        'clear-night':  { cover: 0.12, grau: 0 },
        'partly-day':   { cover: 0.45, grau: 0.08 },
        'partly-night': { cover: 0.42, grau: 0.08 },
        'cloudy': { cover: 0.84, grau: 0.78, dunst: 0.15, tag: ['#6c7785', '#8b95a2', '#b8bfc7'], nacht: ['#0e1118', '#151a24', '#222a38'] },
        'rain':   { cover: 0.95, grau: 0.9, dunst: 0.25, nass: true, regen: 1, tag: ['#38414c', '#535d69', '#7c8692'], nacht: ['#0a0d14', '#121722', '#1e2532'] },
        'storm':  { cover: 0.98, grau: 0.96, dunst: 0.3, nass: true, regen: 1.5, blitz: true, tag: ['#1f252e', '#2c333d', '#454d58'], nacht: ['#06080d', '#0c1018', '#161c27'] },
        'snow':   { cover: 0.9, grau: 0.82, dunst: 0.3, schnee: true, tag: ['#8a95a4', '#a9b2be', '#cfd5dd'], nacht: ['#151a26', '#222a3a', '#3a4558'] },
        'fog':    { cover: 0.6, grau: 0.86, dunst: 0.85, nebel: true, tag: ['#9aa3ad', '#b6bdc5', '#d2d7dc'], nacht: ['#151820', '#20242c', '#33373f'] }
    };

    // Aus Minute + Sonnenzeiten + Wetterlage die komplette Bildbeschreibung.
    function lageAus(p) {
        const B = LAGE[p.cond] || LAGE.cloudy;
        const R = p.sunrise, S = p.sunset, m = p.minute;
        // f > 0: Minuten seit Aufgang bzw. bis Untergang (Tag); f < 0: Minuten unter dem Horizont.
        const f = (m >= R && m <= S) ? Math.min(m - R, S - m) : -Math.min(((R - m) + 1440) % 1440, ((m - S) + 1440) % 1440);
        const morgens = m < (R + S) / 2;
        const tagAnteil = klemm((m - R) / (S - R), 0, 1);
        const hoehe = f >= 0 ? Math.sin(Math.PI * tagAnteil) : 0;                    // 0 am Horizont, 1 mittags
        const nacht = f >= 0 ? 0 : glatt(10, 80, -f);                                  // 0 Tag … 1 tiefe Nacht
        const tief = f >= 0 ? 1 - glatt(0.04, 0.32, hoehe) : 0;                         // Sonne tief → goldenes Licht

        let himmel;
        if (f >= 0) himmel = mix3(H_GOLD, H_MITTAG, glatt(0.04, 0.42, hoehe));
        else if (-f < 25) himmel = mix3(H_GOLD, H_DAEMMER, -f / 25);
        else himmel = mix3(H_DAEMMER, H_NACHT, glatt(25, 80, -f));
        if (B.grau > 0 && B.tag) himmel = mix3(himmel, mix3(B.tag, B.nacht, nacht), B.grau);
        else if (B.grau > 0) himmel = mix3(himmel, mix3(['#7d8a9c', '#9aa6b5', '#c3cbd5'], ['#0e1118', '#151a24', '#222a38'], nacht), B.grau);

        const sonnig = !B.tag;                                                          // klar oder heiter
        // Bahn bewusst nur durch die rechte Haelfte und nie unter y 0.50: links oben steht die
        // grosse Temperatur, ab ~0.53 die Kennzahl-Leiste. Eine echte Bahn bis zum Horizont
        // versteckte die Abendsonne hinter der Leiste (gemessen im Hochformat 720 x 880).
        const sonne = {
            x: 0.42 + 0.46 * tagAnteil, y: 0.50 - hoehe * 0.38,
            r: 9 + tief * 4, sichtbar: f > -4 && sonnig,
            // Nach Untergang kein Schein mehr (das uebernimmt glut) — sonst leuchtete nachts der Bildrand.
            schein: mix([255, 246, 220], [255, 160, 80], tief),
            stark: f < -4 ? 0 : (sonnig ? 0.55 + tief * 0.3 : 0.12 + (1 - nacht) * 0.15),
            // Daemmerung: Sonne knapp unter dem Horizont, nur noch Schein ueber dem Kamm.
            glut: f < 0 && f > -50 && sonnig ? (1 + f / 50) * 0.55 : 0,
            seite: morgens ? -1 : 1
        };
        if (!sonnig) { sonne.x = 0.68; sonne.y = 0.2; }
        const nachtFortschritt = f < 0 ? (((m - S) + 1440) % 1440) / (((R - S) + 1440) % 1440 || 1) : 0;
        const mond = { x: 0.48 + 0.4 * nachtFortschritt, y: 0.16 + Math.abs(nachtFortschritt - 0.5) * 0.28, r: 22,
            deck: nacht * (p.cond === 'storm' ? 0 : p.cond === 'fog' ? 0.25 : (1 - B.cover * 0.75)) };

        const abend = tief * (sonnig ? 1 : 0) * (1 - nacht);
        let land = B.schnee ? '#dde3ea' : '#3f5d39', boden = B.schnee ? ['#eef2f6', '#c3cdd9'] : ['#4c6d3d', '#26391f'];
        if (abend > 0) { land = mix(land, '#3a2f45', abend); boden = [mix(boden[0], '#2f2733', abend), mix(boden[1], '#140f18', abend)]; }
        if (B.nass) boden = [mix(boden[0], '#1c2420', 0.45), mix(boden[1], '#0c100e', 0.4)];
        if (B.tag && !B.schnee) land = mix(land, '#4a5548', 0.4);
        const nachtLand = B.schnee ? '#3a4558' : '#0c1221', nachtBoden = B.schnee ? ['#4a5670', '#2a3244'] : ['#0b111c', '#04070c'];
        land = mix(land, nachtLand, nacht); boden = [mix(boden[0], nachtBoden[0], nacht), mix(boden[1], nachtBoden[1], nacht)];

        // Wolkenfarben: Lichtseite nimmt das Sonnenlicht an, Schattenseite den Himmel.
        let licht = mix('#ffffff', '#ffc58e', abend), schatten = mix('#9fb0c6', '#5d4a6c', abend);
        if (B.tag) { licht = mix(licht, mix(B.tag[2], '#ffffff', 0.45), B.grau); schatten = mix(schatten, mix(B.tag[0], '#000000', 0.08), B.grau); }
        licht = mix(licht, '#3c4868', nacht * 0.9); schatten = mix(schatten, '#121a2c', nacht * 0.9);
        const wind = Math.max(0, p.wind || 0);

        return {
            cond: p.cond, himmel, sonne, mond, nacht, abend, land, boden,
            dunst: B.dunst || 0, nass: !!B.nass, schnee: !!B.schnee, nebel: !!B.nebel,
            wolken: { cover: B.cover, licht, schatten, alpha: B.nebel ? 0.6 : (nacht > 0.5 ? 0.6 + B.grau * 0.35 : 0.92),
                dauer: klemm(150 - wind * 2.2, 40, 150) },
            schatten: sonne.sichtbar && sonnig && f > 30 && B.cover > 0.2,
            regen: B.regen || 0, blitz: !!B.blitz, flocken: !!B.schnee, wind,
            voegel: sonnig && f > 20 && wind < 35, sternschnuppe: sonnig && nacht > 0.8,
            sterne: nacht * (1 - B.cover * 0.85) * (B.nebel ? 0 : 1)
        };
    }

    // ── Szene ───────────────────────────────────────────────────
    function maleSzene(st, L, fernTex) {
        const { W, H } = st, ctx = st.szene.getContext('2d');
        st.szene.width = Math.round(W * st.DPR); st.szene.height = Math.round(H * st.DPR);
        ctx.setTransform(st.DPR, 0, 0, st.DPR, 0, 0);
        const hy = H * 0.70, [zenit, mitte, horizont] = L.himmel;

        // Himmel: dunkler Zenit, heller Horizont (Streulicht) — nie ein Einheitsblau.
        let g = ctx.createLinearGradient(0, 0, 0, hy);
        g.addColorStop(0, rgb(zenit)); g.addColorStop(0.55, rgb(mitte)); g.addColorStop(1, rgb(horizont));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        if (L.sterne > 0.02) maleSterne(ctx, W, hy, L.sterne);
        if (L.mond.deck > 0.02) maleMond(ctx, W, H, L.mond);
        maleSonne(ctx, W, H, L.sonne);
        if (!L.nebel) maleFerneWolken(ctx, st, L, fernTex);

        // Berge: vier Ketten, Farbe = Landfarbe gemischt mit der Horizontfarbe nach Entfernung
        // (Luftperspektive) — so faerbt die Abendsonne die fernen Ketten automatisch mit.
        const ketten = [
            { basis: 0.60, hoehe: 0.16, nah: 0.18, rauh: 0.58, seed: 11 },
            { basis: 0.66, hoehe: 0.12, nah: 0.42, rauh: 0.55, seed: 23 },
            { basis: 0.73, hoehe: 0.09, nah: 0.68, rauh: 0.52, seed: 37, baeume: 0.45 },
            { basis: 0.80, hoehe: 0.07, nah: 0.92, rauh: 0.48, seed: 51, baeume: 0.9 }
        ];
        const dunst = mix(horizont, '#ffffff', 0.08 * (1 - L.nacht));
        ketten.forEach((k, i) => {
            const h = kamm(256, k.rauh, k.seed);
            let farbe = mix(dunst, L.land, Math.pow(k.nah, 1.1) * (1 - L.dunst * (1 - k.nah) * 0.9));
            if (!L.schnee) farbe = mix(farbe, '#000000', k.nah * 0.25 * (1 - L.nacht));
            const pfad = new Path2D();
            pfad.moveTo(0, H);
            for (let j = 0; j <= 256; j++) pfad.lineTo(j / 256 * W, H * (k.basis - h[j] * k.hoehe));
            pfad.lineTo(W, H); pfad.closePath();
            const kg = ctx.createLinearGradient(0, H * (k.basis - k.hoehe), 0, H * k.basis + 40);
            const saum = L.abend > 0.3 ? mix(farbe, '#ff9a5a', 0.35 * L.abend * (1 - k.nah * 0.6)) : mix(farbe, '#ffffff', (L.schnee ? 0.2 : 0.06) * (1 - L.nacht));
            kg.addColorStop(0, rgb(saum)); kg.addColorStop(1, rgb(farbe));
            ctx.fillStyle = kg; ctx.fill(pfad);
            if (L.nacht < 0.9) maleRelief(ctx, st, L, k, pfad);
            if (k.baeume) maleBaeume(ctx, W, H, h, k, mix(farbe, '#000000', L.schnee ? 0.45 : 0.2), k.seed);
            // Dunstschleier ueber jeder Kette — kraeftig bei Nebel.
            if (L.dunst > 0 && i < 3) {
                const dg = ctx.createLinearGradient(0, H * (k.basis - 0.02), 0, H * (k.basis + 0.08));
                dg.addColorStop(0, rgb(dunst, 0)); dg.addColorStop(1, rgb(dunst, L.dunst * 0.55));
                ctx.fillStyle = dg; ctx.fillRect(0, H * (k.basis - 0.02), W, H * 0.1);
            }
        });

        if (L.nebel) maleFerneWolken(ctx, st, L, fernTex);

        // Boden: sanfter Vordergrund-Huegel statt Rechteck mit harter Kante.
        const by = H * 0.80, bh = kamm(64, 0.35, 71);
        const boden = new Path2D();
        boden.moveTo(0, H);
        for (let j = 0; j <= 64; j++) boden.lineTo(j / 64 * W, H * (0.835 - bh[j] * 0.035));
        boden.lineTo(W, H); boden.closePath();
        g = ctx.createLinearGradient(0, by, 0, H);
        g.addColorStop(0, rgb(L.boden[0])); g.addColorStop(1, rgb(L.boden[1]));
        ctx.fillStyle = g; ctx.fill(boden);
        if (!L.schnee && !L.nass && L.nacht < 0.8) maleGras(ctx, W, H, by, boden);
        if (L.nass) maleNass(ctx, W, H, by, L, boden);
        if (L.dunst > 0.5) {
            const ng = ctx.createLinearGradient(0, H * 0.55, 0, H);
            ng.addColorStop(0, rgb(dunst, 0)); ng.addColorStop(0.5, rgb(dunst, 0.5)); ng.addColorStop(1, rgb(dunst, 0.22));
            ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
        }
        maleSchatten(ctx, st, L);
        if (L.abend > 0.2) { ctx.fillStyle = 'rgba(255,140,60,' + (0.06 * L.abend).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    function maleSonne(ctx, W, H, s) {
        const R = Math.max(W, H);
        if (s.glut > 0) { // Sonne unter dem Horizont: nur noch Gluehen ueber dem Kamm
            const x = W * (s.seite < 0 ? 0.42 : 0.88), y = H * 0.55;
            const g = ctx.createRadialGradient(x, y, 0, x, y, R * 0.6);
            g.addColorStop(0, rgb([255, 150, 90], s.glut)); g.addColorStop(1, rgb([255, 150, 90], 0));
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }
        if (s.stark <= 0.01) return;
        const x = W * s.x, y = H * s.y;
        let g = ctx.createRadialGradient(x, y, 0, x, y, R * (s.sichtbar ? 0.75 : 0.5));
        g.addColorStop(0, rgb(s.schein, s.stark)); g.addColorStop(0.25, rgb(s.schein, s.stark * 0.35)); g.addColorStop(1, rgb(s.schein, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (!s.sichtbar) return;
        g = ctx.createRadialGradient(x, y, 0, x, y, s.r * 6);
        g.addColorStop(0, rgb(s.schein, 0.9)); g.addColorStop(0.2, rgb(s.schein, 0.45)); g.addColorStop(1, rgb(s.schein, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s.r * 6, 0, Math.PI * 2); ctx.fill();
        g = ctx.createRadialGradient(x, y, 0, x, y, s.r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, rgb(mix([255, 255, 255], s.schein, 0.25))); g.addColorStop(1, rgb(s.schein, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    function maleSterne(ctx, W, hy, staerke) {
        const r = zufall(7), n = rauschen(64, 99);
        for (let i = 0; i < 2200; i++) {   // Milchstrasse: schraeges, wolkiges Band, sehr leise
            const t = r(), x = t * W, y = hy * (0.75 - t * 0.55) + (r() - 0.5) * hy * 0.22;
            const d = fbm(n, x / 40, y / 40, 4);
            if (d < 0.5) continue;
            ctx.fillStyle = 'rgba(200,210,255,' + ((d - 0.5) * 0.12 * staerke).toFixed(3) + ')';
            ctx.fillRect(x, y, 1.2, 1.2);
        }
        for (let i = 0; i < 380; i++) {
            const x = r() * W, y = Math.pow(r(), 1.3) * hy * 0.95, m = Math.pow(r(), 3);
            const a = (0.25 + m * 0.75 * (1 - y / hy * 0.6)) * staerke;
            ctx.fillStyle = 'rgba(' + (m > 0.6 ? '255,240,220' : '220,230,255') + ',' + a.toFixed(2) + ')';
            ctx.beginPath(); ctx.arc(x, y, 0.4 + m * 1.2, 0, Math.PI * 2); ctx.fill();
        }
    }

    function maleMond(ctx, W, H, m) {
        const x = W * m.x, y = H * m.y;
        ctx.save(); ctx.globalAlpha = m.deck;
        let g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 9);
        g.addColorStop(0, 'rgba(190,205,240,0.35)'); g.addColorStop(1, 'rgba(190,205,240,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m.r * 9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, m.r, 0, Math.PI * 2); ctx.clip();
        g = ctx.createRadialGradient(x - m.r * 0.3, y - m.r * 0.3, 0, x, y, m.r);
        g.addColorStop(0, '#f6f4ee'); g.addColorStop(1, '#c9c6bd'); ctx.fillStyle = g; ctx.fillRect(x - m.r, y - m.r, m.r * 2, m.r * 2);
        const mn = rauschen(16, 5);   // Maria = dunklere Flecken
        for (let yy = -m.r; yy < m.r; yy += 1) for (let xx = -m.r; xx < m.r; xx += 1) {
            const d = fbm(mn, (xx + 40) / 9, (yy + 40) / 9, 3);
            if (d > 0.55) { ctx.fillStyle = 'rgba(120,118,112,' + ((d - 0.55) * 1.4).toFixed(2) + ')'; ctx.fillRect(x + xx, y + yy, 1, 1); }
        }
        ctx.restore();
    }

    // Hangrelief: Grat-Rauschen, beleuchtet nach seiner Neigung zur Sonne. Erster Anlauf im
    // Entwurf (Schatten je Spalte senkrecht vom Kamm) sah aus wie ein Vorhang — echte Rinnen
    // laufen schraeg. Ferne Ketten bekommen fast keins: der Dunst schluckt das Detail.
    function maleRelief(ctx, st, L, k, pfad) {
        const { W, H } = st, sdx = L.sonne.seite;
        const staerke = (L.sonne.sichtbar ? 1 : 0.4) * Math.pow(k.nah, 1.6) * (1 - L.nacht);
        if (staerke < 0.02) return;
        const y0 = H * (k.basis - k.hoehe), y1 = H * k.basis + 40;
        const sw = 360, sh = Math.max(8, Math.round(sw * (y1 - y0) / W));
        const tex = document.createElement('canvas'); tex.width = sw; tex.height = sh;
        const tc = tex.getContext('2d'), im = tc.createImageData(sw, sh), px = im.data;
        const rn = rauschen(64, k.seed + 100), skal = 26 * (1.2 - k.nah * 0.5) * (sw / 420);
        const grat = (x, y) => { const v = fbm(rn, x / skal, y / (skal * 0.7), 5); return 1 - Math.abs(v * 2 - 1); };
        const hell = L.abend > 0.3 ? [255, 175, 120] : (L.schnee ? [255, 255, 255] : [255, 252, 235]);
        const dunkel = L.abend > 0.3 ? [45, 22, 60] : (L.schnee ? [90, 110, 140] : [12, 22, 28]);
        for (let r = 0; r < sh; r++) for (let x = 0; x < sw; x++) {
            const gx = grat(x + 1, r) - grat(x - 1, r), gy = grat(x, r + 1) - grat(x, r - 1);
            const licht = klemm((gx * -sdx + gy * -0.6) * 4.5, -1, 1) * staerke;
            const i = (r * sw + x) * 4, c = licht > 0 ? hell : dunkel;
            px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
            px[i + 3] = Math.round(Math.abs(licht) * (licht > 0 ? 0.3 : 0.38) * (1 - r / sh * 0.6) * 255);
        }
        tc.putImageData(im, 0, 0);
        ctx.save(); ctx.clip(pfad); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tex, 0, y0, W, y1 - y0);
        ctx.restore();
    }

    function maleBaeume(ctx, W, H, h, k, farbe, seed) {
        const r = zufall(seed * 3);
        ctx.fillStyle = rgb(farbe);
        for (let j = 0; j < 256; j++) {
            if (r() > k.baeume * 0.5) continue;
            const x = j / 256 * W, y = H * (k.basis - h[j] * k.hoehe) + 1;
            const hb = (4 + r() * 9) * (0.5 + k.nah * 0.7), b = hb * 0.32;
            ctx.beginPath(); ctx.moveTo(x - b, y + 1); ctx.lineTo(x, y - hb); ctx.lineTo(x + b, y + 1); ctx.closePath(); ctx.fill();
        }
    }

    function maleGras(ctx, W, H, by, boden) {
        const r = zufall(13); ctx.save(); ctx.clip(boden);
        for (let i = 0; i < 900; i++) {
            const x = r() * W, y = by + r() * (H - by), t = (y - by) / (H - by);
            ctx.strokeStyle = 'rgba(' + (r() > 0.5 ? '255,255,230' : '0,0,0') + ',' + (0.03 + t * 0.05).toFixed(3) + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y - 2 - t * 5); ctx.stroke();
        }
        ctx.restore();
    }

    // Nasser Boden: dunkler und mit leichtem Glanz am oberen Rand, dazu wenige flache Pfuetzen.
    // Erste Fassung spiegelte den Horizont ueber die ganze Flaeche — sah aus wie ein See
    // (Rueckmeldung des Nutzers 17.10.2026).
    function maleNass(ctx, W, H, by, L, boden) {
        const hor = L.himmel[2];
        ctx.save(); ctx.clip(boden);
        let g = ctx.createLinearGradient(0, by, 0, by + (H - by) * 0.4);
        g.addColorStop(0, rgb(hor, 0.12)); g.addColorStop(1, rgb(hor, 0));
        ctx.fillStyle = g; ctx.fillRect(0, by, W, H - by);
        const r = zufall(77);
        for (let i = 0; i < 5; i++) {
            const x = r() * W, y = by + 22 + r() * (H - by - 30), rx = 14 + r() * 26;
            ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.12);
            g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
            g.addColorStop(0, rgb(hor, 0.22)); g.addColorStop(0.8, rgb(hor, 0.1)); g.addColorStop(1, rgb(hor, 0));
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
        ctx.restore();
    }

    // ── Wolken und Wolkenschatten: einmal rechnen ──
    // Ferne Wolken werden FEST in die Szene gemalt, nur die nahen ziehen als eigene Ebene.
    // Zwei ziehende Ebenen (je doppelt so breit wie das Fenster) liessen am Handy mit
    // 96 MB Grafikspeicher die Leinwaende wegfallen: Himmel grauweiss, Platzhalter-Symbol
    // (Emulator, 17.10.2026). Textur: zwei Kacheln nebeneinander, nahtlos.
    function wolkenTextur(st, L, fern) {
        const w = L.wolken, { W, H } = st;
        if (w.cover < 0.05) return null;
        // Nebel: wenige Gitterzellen quer, viele hoch → lange, waagerechte Baenke. Mit dem
        // Wolken-Verhaeltnis (8 quer, 0.25 hoch) entstanden senkrechte Streifen.
        const lw = 300, lh = Math.max(40, Math.round(lw * H / W)), periode = L.nebel ? 3 : 8;
        const tex = document.createElement('canvas'); tex.width = lw * 2; tex.height = lh;
        const tctx = tex.getContext('2d'), img = tctx.createImageData(lw * 2, lh), d = img.data;
        const n = rauschen(periode, fern ? 3 : 4);
        const L1 = w.licht, S = w.schatten, sdx = L.sonne.seite;
        const schwelle = 1 - w.cover;
        // Nebel: Baenke tief ueber dem Land statt Wolken oben.
        const band = L.nebel ? (fern ? [0.35, 0.8] : [0.45, 0.98]) : (fern ? [0.05, 0.55] : [0.0, 0.62]);
        const dichte = (x, y) => {
            const v = fbm(n, x / lw * periode, y / lh * (L.nebel ? 7 : periode * 0.55) + (fern ? 20 : 0), 6);
            const yy = y / lh;
            const maske = L.nebel ? glatt(band[0], band[0] + 0.15, yy) * glatt(band[1] + 0.1, band[1] - 0.1, yy)
                : glatt(band[1], band[0] + 0.15, yy) * glatt(-0.05, 0.1, yy);
            return klemm((v - schwelle) / (1 - schwelle + 0.0001) * 1.8, 0, 1) * maske;
        };
        for (let y = 0; y < lh; y++) for (let x = 0; x < lw * 2; x++) {
            const dd = dichte(x, y), i = (y * lw * 2 + x) * 4;
            if (dd <= 0.002) { d[i + 3] = 0; continue; }
            // Licht: wie viel Wolke liegt zwischen diesem Punkt und der Sonne?
            const davor = dichte(x + sdx * 3, y - 3);
            const c = mix(S, L1, klemm(1 - davor * 0.85 + (1 - dd) * 0.25, 0.15, 1));
            d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
            d[i + 3] = Math.round(Math.pow(dd, 0.75) * 255 * w.alpha * (fern ? 0.75 : 1));
        }
        tctx.putImageData(img, 0, 0);
        return tex;
    }

    // Ferne Wolken: erste Kachel fest in die Szene (Nebel: vor die Berge, sonst dahinter).
    function maleFerneWolken(ctx, st, L, tex) {
        if (!tex) return;
        ctx.save(); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tex, 0, 0, tex.width / 2, tex.height, 0, 0, st.W, st.H * (L.nebel ? 1 : 0.62));
        ctx.restore();
    }

    // Nahe Wolken: die einzige ziehende Wolkenebene. Nur so hoch wie noetig (72 %, Nebel ganz),
    // Aufloesung DPR 1 — Wolken sind weich, und jede Ebene kostet Grafikspeicher.
    function maleNaheWolken(st, L) {
        const canvas = st.nah, wrap = canvas.parentElement, tex = wolkenTextur(st, L, false);
        wrap.hidden = !tex;
        if (!tex) return;
        const anteil = L.nebel ? 1 : 0.72;
        wrap.style.bottom = ((1 - anteil) * 100).toFixed(0) + '%';
        canvas.width = Math.round(st.W * 2); canvas.height = Math.round(st.H * anteil);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tex, 0, 0, canvas.width, canvas.height);
        canvas.style.animationDuration = (L.wolken.dauer * (L.nebel ? 2 : 1)).toFixed(0) + 's';
    }

    // Wolkenschatten auf den Huegeln — FEST in die Szene gemalt. Als eigene, ziehende Ebene
    // (untere Haelfte, transform) liess sie in Chrome fuer Android das ganze Fenster grauweiss
    // werden, samt Platzhalter-Symbol; ohne die Ebene war alles korrekt (Emulator, 17.10.2026).
    function maleSchatten(ctx, st, L) {
        if (!L.schatten) return;
        const { W, H } = st, lw = 160, lh = Math.max(20, Math.round(lw * H / W));
        const tex = document.createElement('canvas'); tex.width = lw; tex.height = lh;
        const tctx = tex.getContext('2d'), img = tctx.createImageData(lw, lh), d = img.data;
        const n = rauschen(6, 9);
        for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
            const yy = y / lh, land = glatt(0.5, 0.66, yy);
            const v = fbm(n, x / lw * 6, yy * 3, 4), a = klemm((v - 0.52) * 3.2, 0, 1) * land;
            const i = (y * lw + x) * 4;
            d[i] = 8; d[i + 1] = 14; d[i + 2] = 24; d[i + 3] = Math.round(a * 0.3 * 255);
        }
        tctx.putImageData(img, 0, 0);
        ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(tex, 0, 0, W, H); ctx.restore();
    }

    // ── Bewegtes auf EINER Leinwand ─────────────────────────────
    const RUHIG = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function lebenStarten(st) {
        const L = st.L;
        lebenStoppen(st);
        const nd = Math.min(st.DPR, 1.5), { W, H } = st;
        st.leben.width = Math.round(W * nd); st.leben.height = Math.round(H * nd);
        st.lctx = st.leben.getContext('2d'); st.lctx.setTransform(nd, 0, 0, nd, 0, 0);
        st.lctx.clearRect(0, 0, W, H);
        const r = zufall(5);
        st.tropfen = []; st.spritzer = []; st.flug = null; st.blitzBild = null;
        if (L.regen) st.tropfen = Array.from({ length: Math.round(260 * L.regen) }, () => ({ x: r() * W * 1.2, y: r() * H, z: 0.25 + r() * 0.75 }));
        if (L.flocken) st.tropfen = Array.from({ length: 220 }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, p: r() * 6.28 }));
        st.leben.style.display = st.tropfen.length ? '' : 'none';
        if (st.pausiert || RUHIG) { if (st.tropfen.length) bild(st, performance.now(), 0); return; }
        if (st.tropfen.length) schleife(st);
        ereignisPlanen(st);
    }

    function lebenStoppen(st) {
        cancelAnimationFrame(st.raf); st.raf = 0;
        clearTimeout(st.ereignisUhr); st.ereignisUhr = 0;
    }

    function schleife(st) {
        if (st.raf) return;
        st.letzte = performance.now();
        const schritt = (t) => {
            st.raf = 0;
            if (st.pausiert || document.hidden) return;
            const dt = Math.max(0, Math.min(50, t - st.letzte)) / 16.7; st.letzte = t;
            // Deko darf die App nie kippen: ein Fehler hier landete als "Etwas ist schief
            // gelaufen" auf dem ganzen Bildschirm. Dann lieber still anhalten.
            let weiter = false;
            try { weiter = bild(st, t, dt); } catch (e) { console.warn('[WetterSzene]', e); return; }
            if (weiter) st.raf = requestAnimationFrame(schritt);
            else if (!st.tropfen.length) st.leben.style.display = 'none';
        };
        st.raf = requestAnimationFrame(schritt);
    }

    // Ein Bild malen; true = es bewegt sich noch etwas.
    function bild(st, t, dt) {
        const ctx = st.lctx, L = st.L, { W, H } = st;
        ctx.clearRect(0, 0, W, H);
        let aktiv = false;
        // Boeen: der Wind schwankt, der Regen kippt mal mehr, mal weniger.
        const boe = 1 + Math.sin(t / 1900) * 0.35 + Math.sin(t / 730) * 0.15;
        const schraeg = (0.08 + Math.min(L.wind, 60) / 60 * 0.45) * boe;
        if (L.regen) {
            aktiv = true;
            ctx.lineCap = 'round';
            for (const q of st.tropfen) {
                const v = (9 + q.z * 13) * dt, len = 10 + q.z * 18, boden = H * (0.8 + q.z * 0.17);
                q.y += v; q.x -= v * schraeg;
                if (q.y > boden) {
                    if (q.z > 0.45 && st.spritzer.length < 40) st.spritzer.push({ x: q.x, y: boden, z: q.z, t });
                    q.y = -len - Math.random() * 40; q.x = Math.random() * W * 1.3;
                }
                ctx.strokeStyle = 'rgba(205,215,228,' + (0.07 + q.z * 0.2).toFixed(2) + ')';
                ctx.lineWidth = 0.6 + q.z * 0.8;
                ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + len * schraeg, q.y - len); ctx.stroke();
            }
            // Spritzer: kleiner, flacher Ring, der in 260 ms aufgeht und verblasst.
            // rAF-Zeitstempel liegen oft ein paar ms VOR performance.now() (mit dem der erste
            // Aufruf laeuft) — ungeklemmt wurde der Radius negativ und ellipse() warf (Handy, 17.10.).
            st.spritzer = st.spritzer.filter(s => t - s.t < 260);
            for (const s of st.spritzer) {
                const a = klemm((t - s.t) / 260, 0, 1), rad = (2 + s.z * 5) * a;
                ctx.strokeStyle = 'rgba(215,225,236,' + ((1 - a) * 0.45 * s.z).toFixed(2) + ')';
                ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.ellipse(s.x, s.y, rad, rad * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
            }
        } else if (L.flocken) {
            aktiv = true;
            for (const q of st.tropfen) {
                q.y += (0.5 + q.z * 1.3) * dt; q.p += 0.02 * dt;
                q.x += (Math.sin(q.p) * 0.4 - schraeg * 1.2) * q.z * dt;
                if (q.y > H) { q.y = -4; q.x = Math.random() * W * 1.2; }
                if (q.x < -10) q.x += W + 20;
                ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + q.z * 0.55).toFixed(2) + ')';
                ctx.beginPath(); ctx.arc(q.x, q.y, 0.8 + q.z * 2, 0, Math.PI * 2); ctx.fill();
            }
        }
        if (st.flug) aktiv = flugMalen(st, ctx, t) || aktiv;
        if (st.blitzBild) aktiv = blitzMalen(st, ctx, t) || aktiv;
        return aktiv;
    }

    // Seltene Ereignisse: Vogelschwarm (klarer Tag), Sternschnuppe (klare Nacht), Blitz (Gewitter).
    function ereignisPlanen(st) {
        const L = st.L;
        let warte = 0, los = null;
        if (L.blitz) { warte = 3500 + Math.random() * 6000; los = blitzStart; }
        else if (L.voegel) { warte = 6000 + Math.random() * 16000; los = vogelStart; }
        else if (L.sternschnuppe) { warte = 5000 + Math.random() * 14000; los = schnuppeStart; }
        if (!los) return;
        st.ereignisUhr = setTimeout(() => {
            if (st.pausiert || document.hidden) return;
            try { los(st); } catch (e) { console.warn('[WetterSzene]', e); return; }
            st.leben.style.display = '';
            schleife(st); ereignisPlanen(st);
        }, warte);
    }

    function vogelStart(st) {
        const r = Math.random, links = r() < 0.5, n = 3 + Math.floor(r() * 4);
        st.flug = { art: 'voegel', t0: performance.now(), dauer: 9000 + r() * 5000, links, y: 0.18 + r() * 0.2,
            voegel: Array.from({ length: n }, (_, i) => ({ dx: i * 16 + r() * 10, dy: (i % 2 ? 1 : -1) * i * 5 + r() * 6, ph: r() * 6, gr: 0.8 + r() * 0.5 })) };
    }
    function schnuppeStart(st) {
        const r = Math.random;
        st.flug = { art: 'schnuppe', t0: performance.now(), dauer: 900, x: 0.2 + r() * 0.6, y: 0.06 + r() * 0.2, w: (r() < 0.5 ? -1 : 1) };
    }
    function flugMalen(st, ctx, t) {
        const f = st.flug, a = (t - f.t0) / f.dauer, { W, H } = st;
        if (a >= 1) { st.flug = null; return false; }
        if (f.art === 'voegel') {
            const farbe = st.L.abend > 0.3 ? 'rgba(30,20,35,0.75)' : 'rgba(25,32,40,0.6)';
            ctx.strokeStyle = farbe; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const x0 = f.links ? -60 + a * (W + 120) : W + 60 - a * (W + 120);
            for (const v of f.voegel) {
                const x = x0 + (f.links ? -v.dx : v.dx), y = H * f.y + v.dy + Math.sin(a * 6 + v.ph) * 4;
                const schlag = Math.sin(t / 110 + v.ph) * 3.2 * v.gr, b = 5 * v.gr;
                ctx.beginPath(); ctx.moveTo(x - b, y - schlag); ctx.quadraticCurveTo(x - b * 0.4, y - 1, x, y);
                ctx.quadraticCurveTo(x + b * 0.4, y - 1, x + b, y - schlag); ctx.stroke();
            }
        } else {
            const x = W * f.x + f.w * a * W * 0.28, y = H * f.y + a * H * 0.12, len = 70;
            const g = ctx.createLinearGradient(x, y, x - f.w * len, y - len * 0.43);
            const al = Math.sin(a * Math.PI);
            g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * al).toFixed(2) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.strokeStyle = g; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - f.w * len, y - len * 0.43); ctx.stroke();
        }
        return true;
    }

    // Blitz: gezackter Pfad mit Aesten, 240 ms sichtbar; dazu ein heller Schlag ueber das Bild.
    function blitzStart(st) {
        const r = Math.random, { W, H } = st;
        const ast = (x, y, laenge, tiefe) => {
            const p = [[x, y]];
            for (let i = 0; i < laenge; i++) { x += (r() - 0.5) * 26; y += 10 + r() * 16; p.push([x, y]); }
            const kinder = [];
            if (tiefe > 0) for (let i = 2; i < p.length - 2; i++) if (r() < 0.18) kinder.push(ast(p[i][0], p[i][1], 3 + Math.floor(r() * 4), tiefe - 1));
            return { p, kinder };
        };
        const start = W * (0.25 + r() * 0.5);
        st.blitzBild = { t0: performance.now(), baum: ast(start, H * 0.08, Math.round(H * 0.62 / 18), 2) };
        if (st.blitz && st.blitz.animate) st.blitz.animate([{ opacity: 0 }, { opacity: 0.55 }, { opacity: 0.08 }, { opacity: 0.4 }, { opacity: 0 }],
            { duration: 520, easing: 'ease-out' });
    }
    function blitzMalen(st, ctx, t) {
        const a = (t - st.blitzBild.t0) / 240;
        if (a >= 1) { st.blitzBild = null; return false; }
        const al = a < 0.15 ? 1 : 1 - (a - 0.15) / 0.85;
        const zeichne = (z, breite) => {
            ctx.beginPath(); z.p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
            z.kinder.forEach(k => { ctx.lineWidth = breite * 0.55; zeichne(k, breite * 0.55); });
        };
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(190,210,255,' + (0.35 * al).toFixed(2) + ')'; ctx.lineWidth = 6; zeichne(st.blitzBild.baum, 6);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * al).toFixed(2) + ')'; ctx.lineWidth = 1.6; zeichne(st.blitzBild.baum, 1.6);
        return true;
    }

    // ── Zusammenbau ─────────────────────────────────────────────
    function einbauen(widget) {
        if (widget._ws && widget._ws.root.isConnected) return widget._ws;
        const root = document.createElement('div');
        root.className = 'ws'; root.setAttribute('aria-hidden', 'true');
        root.innerHTML = '<canvas class="ws-ebene ws-szene"></canvas>' +
            '<div class="ws-zug"><canvas class="ws-wolke"></canvas></div>' +
            '<canvas class="ws-ebene ws-leben"></canvas><div class="ws-blitz"></div>';
        widget.insertBefore(root, widget.firstChild);
        const st = widget._ws = {
            root, szene: root.querySelector('.ws-szene'),
            nah: root.querySelector('.ws-wolke'),
            leben: root.querySelector('.ws-leben'), blitz: root.querySelector('.ws-blitz'),
            W: 0, H: 0, DPR: 1, key: '', L: null, raf: 0, ereignisUhr: 0, pausiert: widget.classList.contains('is-paused')
        };
        if (typeof ResizeObserver === 'function') {
            let uhr = 0;
            st.ro = new ResizeObserver(() => { clearTimeout(uhr); uhr = setTimeout(() => { if (st.p) zeichne(widget, st.p); }, 160); });
            st.ro.observe(widget);
        }
        return st;
    }

    function zeichne(widget, p) {
        if (!widget) return;
        const st = einbauen(widget);
        st.p = p;
        // offsetWidth statt getBoundingClientRect: das Fenster skaliert beim Oeffnen per transform.
        const W = widget.offsetWidth, H = widget.offsetHeight;
        if (!W || !H) return;   // geschlossen/ungemessen — beim naechsten Aufruf
        const DPR = Math.min(2, window.devicePixelRatio || 1);
        const key = [p.cond, Math.round(p.minute / 10), Math.round((p.wind || 0) / 10), W, H, DPR, p.sunrise, p.sunset].join('|');
        if (key === st.key) return;
        st.key = key; st.W = W; st.H = H; st.DPR = DPR;
        try {
            st.L = lageAus(p);
            maleSzene(st, st.L, wolkenTextur(st, st.L, true));
            maleNaheWolken(st, st.L);
            st.blitz.hidden = !st.L.blitz;
            // Figur im selben Licht: nachts dunkler, bei Bedeckung matter, abends waermer.
            const L = st.L, w = st.root.parentElement, grau = (LAGE[p.cond] || LAGE.cloudy).grau;
            w.style.setProperty('--figur-hell', (1 - L.nacht * 0.55 - grau * 0.12).toFixed(3));
            w.style.setProperty('--figur-satt', (1 - L.nacht * 0.45 - grau * 0.2).toFixed(3));
            w.style.setProperty('--figur-warm', (L.abend * 0.3).toFixed(3));
            lebenStarten(st);
        } catch (e) { console.warn('[WetterSzene]', e); }
    }

    function pause(widget) {
        const st = widget && widget._ws; if (!st) return;
        st.pausiert = true; lebenStoppen(st);
    }
    function weiter(widget) {
        const st = widget && widget._ws; if (!st) return;
        st.pausiert = false;
        if (!st.L || RUHIG) return;
        if (st.tropfen && st.tropfen.length) schleife(st);
        if (!st.ereignisUhr) ereignisPlanen(st);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) return;
        document.querySelectorAll('.weather-live').forEach(w => { if (w._ws && !w._ws.pausiert) weiter(w); });
    });

    window.WetterSzene = { zeichne, pause, weiter, _lageAus: lageAus };
})();
