// ═══ SSD-SPEICHER MODULE ═══
// Figuren fuer /it-stories/ssd-speicher/.
//
// Grundsatz: Jede angezeigte Zahl wird gerechnet, nicht gesetzt.
//   Abb. 1  Elektronenzahl aus der Schwellenverschiebung (Q = C · ΔVTH)
//   Abb. 2  Seiten-/Blockzustand aus dem echten Programmier-Modell
//           (programmieren nur in freie Seiten, loeschen nur blockweise)
//   Abb. 3  Write Amplification aus dem Fuellstand — WA = 1/(1-u)
//   Abb. 4  Zugriffszeit der HDD aus Drehzahl, Suchweg und Transferrate,
//           Zugriffszeit der SSD aus FTL + tR + Transfer
//   Abb. 5  Rohbitfehlerrate aus dem Ueberlapp benachbarter Gauss-Verteilungen
//
// Auf der Leinwand stehen nur Zahlen, Einheiten und Formelzeichen. Jedes
// erklaerende Wort gehoert ins HTML daneben (i18n, Suche, Screenreader) —
// und jeder Messwert, den JS ins .readout schreibt, ist deshalb sprachfrei.
(function () {
    'use strict';
    var S = window.Story;
    if (!S) return;

    var GRID = 'rgba(255,255,255,0.075)';
    var DIM = 'rgba(148,163,184,0.82)';
    var MUTE = 'rgba(100,116,139,0.92)';
    var TEXT = 'rgba(248,250,252,0.96)';
    var OK = 'rgba(16,185,129,';    // --success
    var WARN = 'rgba(245,158,11,';  // --amber
    var BAD = 'rgba(239,68,68,';    // --danger
    var STEEL = 'rgba(226,232,240,';

    // ── DOM ───────────────────────────────────────────────────────────────────
    function el(id) { return document.getElementById(id); }
    function on(node, ev, fn) { if (node) node.addEventListener(ev, fn); }
    // Die Einheit steckt in einem eigenen <small> — textContent allein wuerde
    // das Markup aus dem HTML ueberschreiben und die Einheit verschwinden lassen.
    function put(id, value, unit, cls) {
        var node = el(id); if (!node) return;
        node.textContent = value;
        if (unit) {
            node.appendChild(document.createTextNode(' '));
            var s = document.createElement('small'); s.textContent = unit; node.appendChild(s);
        }
        if (cls !== undefined) node.className = cls || '';
    }

    // ── Zahlen ────────────────────────────────────────────────────────────────
    // Trennzeichen richten sich nach der Seitensprache: die /en/-Seiten sind
    // eigene statische Dateien mit lang="en", dort waere "0,09" schlicht falsch.
    var LOC = document.documentElement.lang === 'en' ? 'en-US' : 'de-DE';
    function de(n, d) { var s = n.toFixed(d); return LOC === 'de-DE' ? s.replace('.', ',') : s; }
    function thou(n) { return Math.round(n).toLocaleString(LOC); }
    var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    function sup(n) { return String(n).split('').map(function (ch) { return SUP[ch] || ch; }).join(''); }
    function expo(v) {
        if (!(v > 0)) return '0';
        var e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
        if (m >= 9.95) { m = 1; e += 1; }
        return de(m, 1) + ' · 10' + sup(e);
    }
    // Komplementaere Fehlerfunktion nach Numerical Recipes (erfcc):
    // relativer Fehler < 1,2 · 10⁻⁷, also auch weit in der Flanke brauchbar.
    function erfc(x) {
        var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
        var a = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
            t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
                t * (-0.82215223 + t * 0.17087277)))))))));
        return x >= 0 ? a : 2 - a;
    }
    function qTail(x) { return 0.5 * erfc(x / Math.SQRT2); }
    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
    function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

    // ── Zeichnen ──────────────────────────────────────────────────────────────
    function txt(c, value, x, y, size, color, align) {
        c.font = size + 'px "JetBrains Mono", ui-monospace, monospace';
        c.fillStyle = color || TEXT; c.textAlign = align || 'left'; c.textBaseline = 'middle';
        c.fillText(value, x, y);
    }
    function rr(c, x, y, w, h, r, fill, stroke, width) {
        c.beginPath();
        if (c.roundRect) c.roundRect(x, y, w, h, r);
        else { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); }
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 1; c.stroke(); }
    }
    function line(c, x1, y1, x2, y2, color, width, dash) {
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
        c.strokeStyle = color || GRID; c.lineWidth = width || 1;
        c.setLineDash(dash || []); c.stroke(); c.setLineDash([]);
    }
    function dot(c, x, y, r, color) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
    function ring(c, x, y, r, color, width, from, to) {
        c.beginPath(); c.arc(x, y, r, from === undefined ? 0 : from, to === undefined ? Math.PI * 2 : to);
        c.strokeStyle = color; c.lineWidth = width || 1; c.stroke();
    }
    function glow(c, x, y, r, color) {
        var g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color); g.addColorStop(1, color.replace(/,[^,]+\)$/, ',0)'));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    function arrow(c, x1, y1, x2, y2, color, width) {
        line(c, x1, y1, x2, y2, color, width || 1.4);
        var a = Math.atan2(y2 - y1, x2 - x1), l = 7;
        line(c, x2, y2, x2 - Math.cos(a - 0.5) * l, y2 - Math.sin(a - 0.5) * l, color, width || 1.4);
        line(c, x2, y2, x2 - Math.cos(a + 0.5) * l, y2 - Math.sin(a + 0.5) * l, color, width || 1.4);
    }
    // Gauss-Glocke ueber einer Werteachse. map(v) → x, base = y der Nulllinie.
    function bell(c, map, mu, sigma, base, amp, stroke, fill, width) {
        var q, first = true;
        c.beginPath();
        for (q = -3.4; q <= 3.4001; q += 0.07) {
            var x = map(mu + q * sigma), y = base - amp * Math.exp(-q * q / 2);
            if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y);
        }
        if (fill) {
            c.save(); c.lineTo(map(mu + 3.4 * sigma), base); c.lineTo(map(mu - 3.4 * sigma), base); c.closePath();
            c.fillStyle = fill; c.fill(); c.restore();
        }
        c.strokeStyle = stroke; c.lineWidth = width || 1.5; c.stroke();
    }

    // ══ Abbildung 1 · Floating-Gate-Zelle ═════════════════════════════════════
    function cellFigure() {
        var f = el('fig-cell'); if (!f) return;
        var st = S.stage(f.querySelector('canvas')), range = f.querySelector('#cellRange');

        // Gemessene Fenstermitten einer MLC-Zelle. Der geloeschte Zustand liegt
        // unter 0 V — die Zelle leitet dann schon ohne Spannung am Gate.
        var VTH = [-1.8, 0.4, 1.8, 3.2];
        // Gray-Code: benachbarte Pegel unterscheiden sich in genau einem Bit,
        // ein verlesener Nachbar kostet deshalb hoechstens ein Bit. 11 = geloescht.
        var CODE = ['11', '10', '00', '01'];
        var E_PER_V = 120;                    // Elektronen je Volt: Q = C · ΔVTH
        var VLO = -3.4, VHI = 4.6, SIGMA = 0.24;
        var state = 2, prev = 2, tr = 1;

        function electrons(i) { return Math.round((VTH[i] - VTH[0]) * E_PER_V); }
        function sync() {
            put('cellElectrons', thou(electrons(state)), 'e⁻', state ? 'warn' : '');
            put('cellThreshold', de(VTH[state], 1), 'V', 'hi');
            put('cellState', CODE[state], null, 'hi');
        }

        function drawCell(c, x, y, w, h) {
            var pad = h * 0.05, u = h * 0.90;
            var cgY = y + pad, cgH = u * 0.15;
            var ipdY = cgY + cgH, ipdH = u * 0.07;
            var fgY = ipdY + ipdH, fgH = u * 0.20;
            var toxY = fgY + fgH, toxH = u * 0.09;
            var chY = toxY + toxH, chH = u * 0.17;
            var subY = chY + chH, subH = u * 0.32;
            var ix = x + 10, iw = w - 20;

            rr(c, x, y, w, h, 12, 'rgba(255,255,255,.016)', 'rgba(255,255,255,.13)');
            // Substrat, darin Source und Drain
            c.fillStyle = 'rgba(100,116,139,.13)'; c.fillRect(ix, subY, iw, subH);
            var sdW = iw * 0.18, sdH = chH + subH * 0.42;
            c.fillStyle = OK + '.30)'; c.fillRect(ix, chY, sdW, sdH);
            c.fillStyle = OK + '.30)'; c.fillRect(ix + iw - sdW, chY, sdW, sdH);
            c.strokeStyle = OK + '.5)'; c.lineWidth = 1;
            c.strokeRect(ix + 0.5, chY + 0.5, sdW, sdH); c.strokeRect(ix + iw - sdW + 0.5, chY + 0.5, sdW, sdH);
            // Kanal zwischen Source und Drain
            c.fillStyle = OK + '.10)'; c.fillRect(ix + sdW, chY, iw - 2 * sdW, chH);
            // Tunneloxid und Zwischendielektrikum — die beiden Isolatoren
            c.fillStyle = 'rgba(148,163,184,.34)'; c.fillRect(ix, toxY, iw, toxH);
            c.fillStyle = 'rgba(148,163,184,.22)'; c.fillRect(ix, ipdY, iw, ipdH);
            // Floating Gate und Steuergate
            rr(c, ix, fgY, iw, fgH, 3, 'rgba(216,180,254,.16)', 'rgba(216,180,254,.55)');
            rr(c, ix, cgY, iw, cgH, 3, S.primary(.22), S.primary(.65));

            txt(c, 'CG', x + w / 2, cgY + cgH / 2, 10, TEXT, 'center');
            txt(c, 'FG', ix + 14, fgY + fgH / 2, 10, 'rgba(216,180,254,.95)');
            txt(c, 'SiO₂', x + w / 2, toxY + toxH / 2, Math.min(9, toxH - 2), 'rgba(203,213,225,.9)', 'center');
            txt(c, 'S · n⁺', ix + sdW / 2, chY + chH / 2, 9, 'rgba(167,243,208,.9)', 'center');
            txt(c, 'D · n⁺', ix + iw - sdW / 2, chY + chH / 2, 9, 'rgba(167,243,208,.9)', 'center');
            txt(c, 'CH', x + w / 2, chY + chH / 2, 9.5, DIM, 'center');
            txt(c, 'p-Si', x + w / 2, subY + subH * 0.72, 9, MUTE, 'center');

            // Elektronen SITZEN AUF DEM FG — nicht im Oxid darunter.
            var n = state * 8, cols = 12, i, ex, ey;
            var rowY = [fgY + fgH * 0.34, fgY + fgH * 0.70];
            var stepX = (iw - 58) / (cols - 1);
            for (i = 0; i < n; i++) {
                ex = ix + 36 + (i % cols) * stepX;
                ey = rowY[Math.floor(i / cols)];
                dot(c, ex, ey, 2.6, WARN + '.95)');
            }
            // Wandernde Elektronen: durch das Tunneloxid, in der Richtung der Aenderung
            if (tr < 1 && state !== prev) {
                var up = state > prev, m = smooth(tr), k;
                for (k = 0; k < 5; k++) {
                    var qx = ix + iw * (0.22 + k * 0.14);
                    var yFrom = up ? chY + chH * 0.35 : fgY + fgH * 0.6;
                    var yTo = up ? fgY + fgH * 0.6 : chY + chH * 0.35;
                    var qy = yFrom + (yTo - yFrom) * clamp(m * 1.25 - k * 0.05, 0, 1);
                    glow(c, qx, qy, 13, WARN + '.22)');
                    dot(c, qx, qy, 2.6, 'rgba(253,186,116,.98)');
                }
                arrow(c, ix + iw * 0.5, up ? chY : fgY + fgH, ix + iw * 0.5, up ? fgY + fgH : chY, WARN + '.5)', 1.2);
            }
        }

        function drawAxis(c, x, y, w, top) {
            var map = function (v) { return x + (v - VLO) / (VHI - VLO) * w; };
            var amp = y - top - 16, i;
            line(c, x, y, x + w, y, 'rgba(255,255,255,.24)', 1.2);
            for (i = -3; i <= 4; i++) {
                var tx = map(i);
                line(c, tx, y, tx, y + (i % 2 ? 3 : 6), GRID, 1);
                if (i % 2 === 0) txt(c, String(i), tx, y + 16, 9, MUTE, 'center');
            }
            txt(c, 'VTH / V', x + w, y + 32, 9, DIM, 'right');
            // Leseschwellen liegen zwischen den Fenstern
            for (i = 0; i < 3; i++) {
                var vr = (VTH[i] + VTH[i + 1]) / 2;
                line(c, map(vr), top - 4, map(vr), y, 'rgba(255,255,255,.17)', 1, [3, 4]);
            }
            for (i = 0; i < 4; i++) {
                var live = i === state;
                bell(c, map, VTH[i], SIGMA, y, amp, live ? S.primary(.95) : 'rgba(255,255,255,.26)',
                    live ? S.primary(.20) : null, live ? 1.9 : 1.2);
                txt(c, CODE[i], map(VTH[i]), top - 14, 10, live ? TEXT : MUTE, 'center');
            }
            // Marker auf der aktuellen Schwelle
            var mx = map(VTH[state]);
            c.beginPath(); c.moveTo(mx, y + 1); c.lineTo(mx - 5, y + 9); c.lineTo(mx + 5, y + 9); c.closePath();
            c.fillStyle = S.primary(1); c.fill();
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow;
            c.clearRect(0, 0, w, h);
            if (narrow) {
                drawCell(c, w * 0.10, 14, w * 0.80, h * 0.50);
                drawAxis(c, 26, h * 0.92, w - 46, h * 0.66);
            } else {
                drawCell(c, w * 0.05, h * 0.10, w * 0.40, h * 0.80);
                drawAxis(c, w * 0.55, h * 0.80, w * 0.41, h * 0.22);
            }
        }

        on(range, 'input', function () {
            var next = parseInt(range.value, 10);
            if (next !== state) { prev = state; state = next; tr = 0; sync(); }
        });
        sync();
        S.loop(st.canvas, function (dt) { tr = Math.min(1, tr + dt * 1.6); draw(); });
    }

    // ══ Abbildung 2 · Seiten und Bloecke ══════════════════════════════════════
    function nandFigure() {
        var f = el('fig-nand'); if (!f) return;
        var st = S.stage(f.querySelector('canvas'));
        var N = 8;
        // Groessenordnungen aus NAND-Datenblaettern (TLC): lesen ist billig,
        // programmieren kostet das Siebenfache, loeschen noch einmal das Achtfache.
        var T_R = 0.06, T_PROG = 0.45, T_ERS = 3.5;
        var pages = [], order = [], erases = 0;
        var anim = { kind: '', from: -1, to: -1, t: 1 };

        function clear() { pages = []; order = []; for (var i = 0; i < N; i++) pages.push(0); }
        clear(); pages[0] = 1; pages[1] = 1; order.push(0); order.push(1);

        function firstFree() { for (var i = 0; i < N; i++) if (pages[i] === 0) return i; return -1; }
        function counts() {
            var q = { v: 0, x: 0, f: 0 }, i;
            for (i = 0; i < N; i++) { if (pages[i] === 1) q.v++; else if (pages[i] === 2) q.x++; else q.f++; }
            return q;
        }
        function sync() {
            var q = counts();
            put('nandValid', q.v + ' / ' + N, null, q.v ? 'ok' : '');
            put('nandInvalid', String(q.x), null, q.x ? 'no' : '');
            put('nandFree', String(q.f), null, q.f ? '' : 'warn');
            put('nandErases', String(erases), null, '');
        }

        function write() {
            var i = firstFree();
            if (i < 0) { anim = { kind: 'full', from: -1, to: -1, t: 0 }; return; }
            pages[i] = 1; order.push(i);
            anim = { kind: 'write', from: -1, to: i, t: 0 }; sync();
        }
        // Ueberschreiben gibt es im Flash nicht: neue Kopie in eine freie Seite,
        // alte Seite wird nur als ungueltig markiert.
        function rewrite() {
            if (!order.length) { write(); return; }
            var free = firstFree();
            if (free < 0) { anim = { kind: 'full', from: -1, to: -1, t: 0 }; return; }
            var old = order.shift();
            pages[old] = 2; pages[free] = 1; order.push(free);
            anim = { kind: 'move', from: old, to: free, t: 0 }; sync();
        }
        function erase() { clear(); erases++; anim = { kind: 'erase', from: -1, to: -1, t: 0 }; sync(); }

        function tile(c, i, x, y, w, h, pulse) {
            var s = pages[i];
            var fill = s === 1 ? OK + '.14)' : s === 2 ? BAD + '.12)' : 'rgba(255,255,255,.022)';
            var edge = s === 1 ? OK + '.62)' : s === 2 ? BAD + '.52)' : 'rgba(255,255,255,.13)';
            if (anim.kind === 'full' && anim.t < 1) edge = BAD + (0.4 + 0.5 * Math.abs(Math.sin(anim.t * 9))) + ')';
            rr(c, x, y, w, h, 8, fill, edge, pulse ? 2 : 1);
            txt(c, 'P' + String(i + 1).padStart(2, '0'), x + 9, y + 14, 9.5,
                s === 1 ? 'rgba(110,231,183,.95)' : s === 2 ? 'rgba(252,165,165,.9)' : MUTE);
            var bits = s === 1 ? 4 : s === 2 ? 2 : 0, k;
            for (k = 0; k < bits; k++) dot(c, x + 12 + k * 8, y + h - 12, 2.6, s === 1 ? OK + '.9)' : BAD + '.75)');
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow, i;
            c.clearRect(0, 0, w, h);
            var gx, gy, gw, gh, bx, by, bw;
            var rowH = narrow ? 22 : 30;
            if (narrow) { gx = w * 0.08; gw = w * 0.84; gy = 14; gh = h * 0.52; bx = w * 0.12; bw = w * 0.76; by = h * 0.74; }
            else { gx = w * 0.05; gw = w * 0.44; gy = h * 0.11; gh = h * 0.78; bx = w * 0.60; bw = w * 0.34; by = h / 2 - rowH; }

            var cols = narrow ? 2 : 4, rows = N / cols, gap = 9;
            var cw = (gw - gap * (cols - 1)) / cols, ch = (gh - gap * (rows - 1)) / rows;
            for (i = 0; i < N; i++) {
                var cx = gx + (i % cols) * (cw + gap), cy = gy + Math.floor(i / cols) * (ch + gap);
                var hot = anim.t < 1 && (i === anim.to || i === anim.from);
                tile(c, i, cx, cy, cw, ch, hot);
                if (anim.t < 1 && i === anim.to && anim.kind !== 'erase') {
                    var p = 1 - smooth(anim.t);
                    arrow(c, cx + cw / 2, cy + ch + 10, cx + cw / 2, cy + ch - p * ch * 0.5, WARN + '.9)', 1.7);
                }
            }
            if (anim.kind === 'erase' && anim.t < 1) {
                var sweep = gy + smooth(anim.t) * gh;
                line(c, gx - 6, sweep, gx + gw + 6, sweep, BAD + '.85)', 2);
            }

            // Zeitbudget der drei Operationen, gemeinsame Skala
            var ops = [
                { s: 'tR', v: T_R, col: OK, live: anim.kind === '' },
                { s: 'tPROG', v: T_PROG, col: WARN, live: anim.kind === 'write' || anim.kind === 'move' },
                { s: 'tERS', v: T_ERS, col: BAD, live: anim.kind === 'erase' }
            ];
            var lab = 46, barW = bw - lab - 62;
            for (i = 0; i < 3; i++) {
                var yy = by + i * rowH, o = ops[i];
                var live = o.live && anim.t < 1;
                txt(c, o.s, bx, yy, 10, live ? TEXT : DIM);
                rr(c, bx + lab, yy - 5, barW, 10, 5, 'rgba(255,255,255,.05)', null);
                rr(c, bx + lab, yy - 5, Math.max(3, barW * (o.v / T_ERS)), 10, 5, o.col + (live ? '.95)' : '.45)'), null);
                txt(c, de(o.v, 2) + ' ms', bx + bw, yy, 10, live ? TEXT : MUTE, 'right');
            }
            txt(c, 'Σ ' + N + ' P', bx, by - rowH, 10, DIM);
        }

        on(f.querySelector('#nandWrite'), 'click', write);
        on(f.querySelector('#nandRewrite'), 'click', rewrite);
        on(f.querySelector('#nandErase'), 'click', erase);
        sync();
        S.loop(st.canvas, function (dt) { anim.t = Math.min(1, anim.t + dt * 1.8); draw(); });
    }

    // ══ Abbildung 3 · Flash Translation Layer ═════════════════════════════════
    function ftlFigure() {
        var f = el('fig-ftl'); if (!f) return;
        var st = S.stage(f.querySelector('canvas')), range = f.querySelector('#ftlRange');
        var B = 4, P = 8, NP = B * P, LBA = 42;
        var fill = 42, cur = 2 * P + 6, cells = [], move = { from: -1, t: 1 }, t = 0;
        // Zwei Nachbaradressen liegen fest, damit die Tabelle nicht auf Seiten
        // zeigt, die der Fuellstandsregler gerade freigeraeumt hat.
        var PINNED = [1, 11];

        for (var z = 0; z < NP; z++) cells.push(0);
        cells[cur] = 3;

        function applyFill() {
            var budget = Math.round(fill / 100 * NP), i;
            for (i = 0; i < NP; i++) {
                if (i === cur || cells[i] === 2) { budget--; continue; }
                if (PINNED.indexOf(i) >= 0) { cells[i] = 1; budget--; continue; }
                if (budget > 0) { cells[i] = 1; budget--; } else cells[i] = 0;
            }
        }
        function freePct() {
            var n = 0, i; for (i = 0; i < NP; i++) if (cells[i] === 0) n++;
            return n / NP * 100;
        }
        function pba(i) { return 'B' + (Math.floor(i / P) + 1) + ' · P' + String(i % P + 1).padStart(2, '0'); }
        // Vereinfachtes GC-Modell: jeder freigeraeumte Block enthaelt im Mittel
        // den Anteil u an gueltigen Seiten, die mitkopiert werden muessen.
        function wa() { return 1 / (1 - clamp(fill / 100, 0, 0.95)); }

        function sync() {
            var a = wa(), fr = freePct();
            put('ftlLba', String(LBA), null, '');
            put('ftlPba', pba(cur), null, 'hi');
            put('ftlWa', de(a, 2) + '×', null, a >= 5 ? 'no' : a >= 2.5 ? 'warn' : 'ok');
            put('ftlFree', de(fr, 0), '%', fr <= 15 ? 'no' : fr <= 30 ? 'warn' : '');
        }

        // Wear-Leveling: die neue Kopie landet bevorzugt in einem anderen Block.
        function rewrite() {
            var free = [], i;
            for (i = 0; i < NP; i++) if (cells[i] === 0) free.push(i);
            if (!free.length) return;
            var other = free.filter(function (x) { return Math.floor(x / P) !== Math.floor(cur / P); });
            var pool = other.length ? other : free;
            var pick = pool[Math.floor(Math.random() * pool.length)];
            cells[cur] = 2; move = { from: cur, t: 0 };
            cur = pick; cells[cur] = 3;
            sync();
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow, i;
            c.clearRect(0, 0, w, h);
            var lx, ly, lw, mx, my, mw, mh, gx, gy, gw, gh;
            if (narrow) {
                lx = w * 0.06; lw = w * 0.40; ly = 16;
                mx = w * 0.54; mw = w * 0.40; my = 16; mh = 78;
                gx = w * 0.06; gy = 118; gw = w * 0.88; gh = h - 138;
            } else {
                lx = w * 0.04; lw = w * 0.14; ly = h * 0.42;
                mx = w * 0.23; mw = w * 0.24; my = h * 0.24; mh = h * 0.52;
                gx = w * 0.55; gy = h * 0.10; gw = w * 0.41; gh = h * 0.80;
            }

            // Logische Adresse — bleibt, was sie ist
            rr(c, lx, ly, lw, 52, 9, 'rgba(255,255,255,.025)', 'rgba(255,255,255,.16)');
            txt(c, 'LBA', lx + lw / 2, ly + 17, 9.5, DIM, 'center');
            txt(c, String(LBA), lx + lw / 2, ly + 35, 15, TEXT, 'center');

            // Mapping-Tabelle
            rr(c, mx, my, mw, mh, 10, S.primary(.10), S.primary(.55));
            txt(c, 'MAP', mx + 12, my + 16, 9.5, 'rgba(216,180,254,.95)');
            var rows = [{ l: 18, p: pba(PINNED[0]) }, { l: LBA, p: pba(cur) }, { l: 77, p: pba(PINNED[1]) }];
            var rh = (mh - 34) / 3;
            for (i = 0; i < 3; i++) {
                var ry = my + 28 + i * rh, live = rows[i].l === LBA;
                if (live) rr(c, mx + 7, ry, mw - 14, rh - 5, 5, S.primary(.18), S.primary(.5));
                txt(c, String(rows[i].l), mx + 16, ry + rh / 2 - 3, 10.5, live ? TEXT : MUTE);
                txt(c, '→', mx + mw * 0.40, ry + rh / 2 - 3, 10, live ? DIM : MUTE, 'center');
                txt(c, rows[i].p, mx + mw - 14, ry + rh / 2 - 3, 10, live ? 'rgba(216,180,254,.95)' : MUTE, 'right');
            }
            var flow = (t * 0.4) % 1, a0x = lx + lw + 8, a0y = ly + 26, a1x = mx - 8, a1y = my + mh / 2;
            arrow(c, a0x, a0y, a1x, a1y, S.primary(.5), 1.5);
            dot(c, a0x + (a1x - a0x) * flow, a0y + (a1y - a0y) * flow, 3.5, S.primary(1));

            // Physische Bloecke
            rr(c, gx, gy, gw, gh, 10, 'rgba(255,255,255,.015)', 'rgba(255,255,255,.12)');
            var pad = 10, colW = (gw - pad * 2) / B, cellH = (gh - 28) / P, curX = 0, curY = 0;
            for (i = 0; i < NP; i++) {
                var bi = Math.floor(i / P), pi = i % P;
                var cx = gx + pad + bi * colW + 3, cy = gy + 20 + pi * cellH;
                var cwid = colW - 6, chei = cellH - 3, s = cells[i];
                var fillC = s === 3 ? OK + '.55)' : s === 2 ? BAD + '.30)' : s === 1 ? S.primary(.42) : 'rgba(255,255,255,.035)';
                var edgeC = s === 3 ? OK + '.95)' : s === 2 ? BAD + '.55)' : s === 1 ? S.primary(.75) : 'rgba(255,255,255,.09)';
                rr(c, cx, cy, cwid, chei, 2.5, fillC, edgeC, s === 3 ? 1.4 : 1);
                if (s === 3) { curX = cx + cwid / 2; curY = cy + chei / 2; glow(c, curX, curY, 16, OK + '.35)'); }
                if (s === 2 && move.from === i && move.t < 1) rr(c, cx, cy, cwid, chei, 2.5, null, BAD + '.9)', 1.5);
            }
            for (i = 0; i < B; i++) txt(c, 'B' + (i + 1), gx + pad + i * colW + colW / 2, gy + 11, 9, DIM, 'center');

            // Verbindung Mapping-Zeile → physische Seite
            if (!narrow) {
                var srcX = mx + mw, srcY = my + 28 + rh + rh / 2 - 3;
                line(c, srcX, srcY, srcX + 14, srcY, OK + '.5)', 1.4);
                line(c, srcX + 14, srcY, curX, curY, OK + '.5)', 1.4, [4, 4]);
            }
            if (move.t < 1 && move.from >= 0) {
                var mp = smooth(move.t);
                txt(c, '↻', gx + gw - 14, gy + 11, 12, BAD + (1 - mp) + ')', 'right');
            }
        }

        on(range, 'input', function () { fill = parseInt(range.value, 10); applyFill(); sync(); });
        on(f.querySelector('#ftlWrite'), 'click', rewrite);
        applyFill(); sync();
        S.loop(st.canvas, function (dt) { t += dt; move.t = Math.min(1, move.t + dt * 1.4); draw(); });
    }

    // ══ Abbildung 4 · Ein Zugriff, zwei Laufwerke ═════════════════════════════
    // Beide Laufwerke bekommen denselben Auftrag. Die HDD-Zeit entsteht aus
    // Suchweg, Drehzahl und Transferrate, die SSD-Zeit aus FTL-Lookup, tR und
    // Transfer. Nichts davon ist gesetzt — deshalb kippt der Vergleich, sobald
    // man von 4 KiB zufaellig auf 1 MiB am Stueck umschaltet.
    function compareFigure() {
        var f = el('fig-compare'); if (!f) return;
        var st = S.stage(f.querySelector('canvas'));

        var RPM = 7200, REV = 60000 / RPM;      // 8,33 ms je Umdrehung
        var HDD_MBS = 200, SSD_MBS = 550;       // beide SATA-Klasse
        var SETTLE = 0.8, SEEK_K = 13.0;        // t = SETTLE + K · √d
        var SSD_FTL = 0.020, SSD_TR = 0.060;    // ms
        var TRACKS = 12;
        var SIM_PER_SEC = 4.0;                  // Zeitlupe: ms Simulation je Sekunde

        var PAT = { rand: { bytes: 4096, seek: true }, seq: { bytes: 1048576, seek: false } };
        var mode = 'rand', round = null, hold = 0, platter = 0;

        function xfer(bytes, mbs) { return bytes / (mbs * 1e6) * 1000; }
        function ssdOne() { return SSD_FTL + SSD_TR + xfer(PAT[mode].bytes, SSD_MBS); }
        function trackR(i, rIn, rOut) { return rIn + (rOut - rIn) * (i / (TRACKS - 1)); }

        function newRound() {
            var p = PAT[mode];
            var from = round ? round.to : 4;
            var to = p.seek ? Math.floor(Math.random() * TRACKS) : from;
            var d = Math.abs(to - from) / (TRACKS - 1);
            var tSeek = p.seek ? (d > 0 ? SETTLE + SEEK_K * Math.sqrt(d) : SETTLE * 0.4) : 0;
            var sector = p.seek ? Math.random() : 0;
            round = {
                from: from, to: to,
                tSeek: tSeek, tLat: sector * REV, tX: xfer(p.bytes, HDD_MBS),
                sim: 0, one: ssdOne(), ssdDone: 0
            };
            round.total = round.tSeek + round.tLat + round.tX;
            if (S.reduced()) { round.sim = round.total; round.ssdDone = Math.floor(round.total / round.one); }
            sync();
        }

        function sync() {
            var one = ssdOne(), tot = round ? Math.min(round.sim, round.total) : 0;
            var full = round ? round.total : 0;
            put('cmpSsd', de(one, 2), 'ms', 'ok');
            put('cmpHdd', de(round && round.sim >= round.total ? full : tot, 2), 'ms', 'warn');
            put('cmpFactor', full / one >= 10 ? thou(full / one) + '×' : de(full / one, 1) + '×', null, 'hi');
            put('cmpCount', thou(round ? round.ssdDone : 0), null, 'ok');
        }

        // ── SSD-Bahn ──────────────────────────────────────────────────────────
        function drawSsd(c, x, y, w, h, phase) {
            rr(c, x, y, w, h, 11, OK + '.06)', OK + '.42)');
            var px = x + 12, py = y + 24, pw = w - 24, ph = h - 42;
            rr(c, px, py, pw, ph, 7, 'rgba(5,45,38,.55)', OK + '.25)');
            txt(c, 'SSD', x + 12, y + 14, 10, TEXT);

            var ctrlW = pw * 0.24, ctrlH = ph * 0.52;
            var ctrlX = px + 10, ctrlY = py + ph / 2 - ctrlH / 2;
            var dieW = (pw - ctrlW - 40) / 2 - 8, dieH = (ph - 30) / 2;
            var i, dx, dy;
            for (i = 0; i < 4; i++) {
                dx = px + ctrlW + 28 + (i % 2) * (dieW + 10);
                dy = py + 10 + Math.floor(i / 2) * (dieH + 10);
                var target = i === 1;
                var lit = target && phase >= 1;
                rr(c, dx, dy, dieW, dieH, 4, lit ? OK + '.30)' : 'rgba(10,28,28,.9)', lit ? OK + '.95)' : OK + '.4)', lit ? 1.6 : 1);
                txt(c, 'D' + (i + 1), dx + dieW / 2, dy + dieH / 2, 9, lit ? TEXT : 'rgba(167,243,208,.6)', 'center');
            }
            rr(c, ctrlX, ctrlY, ctrlW, ctrlH, 5, phase >= 0 ? S.primary(.30) : 'rgba(18,36,48,.9)',
                phase === 0 ? S.primary(1) : S.primary(.5), phase === 0 ? 1.7 : 1);
            txt(c, 'FTL', ctrlX + ctrlW / 2, ctrlY + ctrlH / 2, 9.5, TEXT, 'center');
            // Datenweg Controller ↔ Die
            var ty = py + 10 + dieH / 2, tx0 = ctrlX + ctrlW, tx1 = px + ctrlW + 28 + dieW + 10;
            line(c, tx0, ty, tx1, ty, OK + '.22)', 1.5);
            if (phase >= 0) {
                var p = clamp(phase === 0 ? 0.15 : phase === 1 ? 0.55 : 1, 0, 1);
                var hx = tx0 + (tx1 - tx0) * (phase === 2 ? 1 - p * 0.85 : p);
                glow(c, hx, ty, 13, OK + '.35)'); dot(c, hx, ty, 3.2, 'rgba(167,243,208,.98)');
            }
        }

        // ── HDD-Bahn: Pivot ausserhalb der Scheibe, Arm schwenkt auf einer Bahn ──
        function hddGeom(x, y, w, h) {
            var R = Math.min(w * 0.36, h * 0.40);
            var g = { cx: x + w * 0.40, cy: y + h * 0.54, R: R, D: R * 1.34, L: R * 1.02, base: -Math.PI * 0.28 };
            g.px = g.cx + Math.cos(g.base) * g.D;
            g.py = g.cy + Math.sin(g.base) * g.D;
            g.rIn = R * 0.32; g.rOut = R * 0.88;
            return g;
        }
        // Armwinkel aus dem Kosinussatz: r² = D² + L² - 2·D·L·cos θ
        function armAngle(g, r) {
            return Math.acos(clamp((g.D * g.D + g.L * g.L - r * r) / (2 * g.D * g.L), -1, 1));
        }
        function headAt(g, r) {
            var a = g.base + Math.PI + armAngle(g, r);
            return { x: g.px + Math.cos(a) * g.L, y: g.py + Math.sin(a) * g.L, a: a };
        }

        function drawHdd(c, x, y, w, h, r, phase) {
            rr(c, x, y, w, h, 11, WARN + '.05)', WARN + '.40)');
            txt(c, 'HDD', x + 12, y + 14, 10, TEXT);
            var g = hddGeom(x, y, w, h), i;

            // Scheibe
            c.beginPath(); c.arc(g.cx, g.cy, g.R, 0, Math.PI * 2);
            c.fillStyle = 'rgba(120,80,20,.10)'; c.fill();
            ring(c, g.cx, g.cy, g.R, WARN + '.75)', 2);
            for (i = 0; i < TRACKS; i++) ring(c, g.cx, g.cy, trackR(i, g.rIn, g.rOut), WARN + (i === round.to ? '.5)' : '.12)'), i === round.to ? 1.4 : 1);
            // Indexmarke: macht die Drehung ueberhaupt erst sichtbar
            line(c, g.cx + Math.cos(platter) * g.R * 0.15, g.cy + Math.sin(platter) * g.R * 0.15,
                g.cx + Math.cos(platter) * g.R * 0.97, g.cy + Math.sin(platter) * g.R * 0.97, WARN + '.22)', 1.2);
            ring(c, g.cx, g.cy, g.R * 0.13, WARN + '.6)', 1.4);
            dot(c, g.cx, g.cy, 3, WARN + '.9)');

            // Der Zielsektor erreicht den Kopf exakt dann, wenn die Wartezeit
            // abgelaufen ist — die Grafik ist damit an dieselbe Uhr gebunden
            // wie die Zahl im Messfeld.
            var rt = trackR(round.to, g.rIn, g.rOut);
            var hTo = headAt(g, rt);
            var hAng = Math.atan2(hTo.y - g.cy, hTo.x - g.cx);
            var abs = hAng + (round.sim - round.tSeek - round.tLat) / REV * Math.PI * 2;
            var arcLen = phase === 2 ? (round.sim - round.tSeek - round.tLat) / REV * Math.PI * 2 : 0;
            c.beginPath();
            c.arc(g.cx, g.cy, rt, abs - Math.max(0.2, arcLen), abs);
            c.strokeStyle = phase === 2 ? OK + '.95)' : BAD + '.9)';
            c.lineWidth = 5; c.stroke();
            glow(c, g.cx + Math.cos(abs) * rt, g.cy + Math.sin(abs) * rt, 12, (phase === 2 ? OK : BAD) + '.30)');

            // Aktuator: Pivot, Arm, Kopf
            var head = headAt(g, r);
            var perp = head.a + Math.PI / 2;
            c.beginPath();
            c.moveTo(g.px + Math.cos(perp) * 5.5, g.py + Math.sin(perp) * 5.5);
            c.lineTo(head.x + Math.cos(perp) * 1.8, head.y + Math.sin(perp) * 1.8);
            c.lineTo(head.x - Math.cos(perp) * 1.8, head.y - Math.sin(perp) * 1.8);
            c.lineTo(g.px - Math.cos(perp) * 5.5, g.py - Math.sin(perp) * 5.5);
            c.closePath();
            c.fillStyle = STEEL + (phase === 0 ? '.42)' : '.24)'); c.fill();
            c.strokeStyle = STEEL + '.5)'; c.lineWidth = 1; c.stroke();
            // Schwingspule hinter dem Drehpunkt. Bewusst nicht rot — Rot steht in
            // dieser Figur fuer die Wartezeit auf den Sektor.
            var vc = g.base + 0.55;
            c.beginPath(); c.arc(g.px, g.py, g.L * 0.26, vc - 0.85, vc + 0.85);
            c.strokeStyle = STEEL + (phase === 0 ? '.55)' : '.22)'); c.lineWidth = 6; c.stroke();
            dot(c, g.px, g.py, 4, STEEL + '.7)');
            // Kopf/Slider — der helle Punkt in der Figur
            if (phase === 2) glow(c, head.x, head.y, 15, OK + '.4)');
            c.save(); c.translate(head.x, head.y); c.rotate(head.a);
            rr(c, -5.5, -3.5, 11, 7, 2, phase === 2 ? 'rgba(167,243,208,.98)' : STEEL + '.96)', null);
            c.restore();
        }

        // ── Zeitachse unten ───────────────────────────────────────────────────
        function drawTimeline(c, x, y, w) {
            var scale = round.total || 1, i;
            var segs = [
                { v: round.tSeek, col: WARN },
                { v: round.tLat, col: BAD },
                { v: round.tX, col: OK }
            ];
            line(c, x, y - 20, x + w, y - 20, 'rgba(255,255,255,.14)', 1);
            txt(c, '0', x, y - 32, 9, MUTE, 'center');
            txt(c, de(scale, 1) + ' ms', x + w, y - 32, 9, MUTE, 'right');

            // SSD: ein Strich je fertigem Zugriff
            var tickW = Math.max(1, w * (round.one / scale));
            txt(c, 'SSD', x - 10, y - 6, 9.5, DIM, 'right');
            rr(c, x, y - 12, w, 11, 3, 'rgba(255,255,255,.04)', null);
            var done = Math.min(round.ssdDone, Math.ceil(scale / round.one));
            for (i = 0; i < done; i++) {
                var tx = x + i * tickW;
                if (tx > x + w) break;
                rr(c, tx, y - 12, Math.max(0.9, tickW - 0.9), 11, tickW > 4 ? 2 : 0, OK + '.85)', null);
            }

            // HDD: Phasen nacheinander
            txt(c, 'HDD', x - 10, y + 15, 9.5, DIM, 'right');
            rr(c, x, y + 9, w, 12, 3, 'rgba(255,255,255,.04)', null);
            var acc = 0, cursor = x;
            for (i = 0; i < segs.length; i++) {
                var shown = clamp(round.sim - acc, 0, segs[i].v);
                var sw = w * (shown / scale);
                // Der 4-KiB-Transfer ist 0,02 ms lang — ohne Mindestbreite waere
                // er auf der Achse gar nicht da, obwohl er stattfindet.
                if (shown > 0) rr(c, cursor, y + 9, Math.max(2, sw), 12, 0, segs[i].col + '.85)', null);
                if (segs[i].v / scale > 0.14 && shown > 0) {
                    txt(c, de(segs[i].v, segs[i].v < 1 ? 2 : 1), cursor + w * (segs[i].v / scale) / 2, y + 15, 9, 'rgba(15,23,42,.92)', 'center');
                }
                cursor += w * (segs[i].v / scale);
                acc += segs[i].v;
            }
        }

        function frame(dt) {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow;
            c.clearRect(0, 0, w, h);
            if (!round) newRound();

            if (!S.reduced()) {
                if (round.sim < round.total) {
                    round.sim = Math.min(round.total, round.sim + dt * SIM_PER_SEC);
                    round.ssdDone = Math.floor(round.sim / round.one);
                    platter += dt * SIM_PER_SEC / REV * Math.PI * 2;
                    sync();
                } else {
                    platter += dt * SIM_PER_SEC / REV * Math.PI * 2;
                    hold += dt;
                    if (hold > 1.4) { hold = 0; newRound(); }
                }
            }

            // Phase: 0 Suchen, 1 Warten, 2 Uebertragen
            var phase = round.sim < round.tSeek ? 0 : round.sim < round.tSeek + round.tLat ? 1 : 2;
            if (!PAT[mode].seek) phase = 2;

            // Kopfradius: waehrend des Suchens weich zwischen den Spuren
            var seekP = round.tSeek > 0 ? smooth(round.sim / round.tSeek) : 1;
            var trkIdx = round.from + (round.to - round.from) * seekP;

            // Auftragskopf
            var head = PAT[mode].bytes >= 1048576 ? '1 MiB' : '4 KiB';
            txt(c, head + ' · LBA ' + thou(1048576), w / 2, 16, 10.5, DIM, 'center');
            txt(c, 't = ' + de(Math.min(round.sim, round.total), 2) + ' ms', w / 2, 33, 12, TEXT, 'center');

            var dw, dh, ax, ay, bx2, by2, tlY, tlX, tlW;
            if (narrow) {
                dw = w * 0.86; dh = (h - 150) / 2 - 8; ax = w * 0.07; ay = 46; bx2 = ax; by2 = ay + dh + 12;
                tlX = 44; tlW = w - 62; tlY = h - 30;
            } else {
                dw = w * 0.42; dh = h - 128; ax = w * 0.04; ay = 44; bx2 = w * 0.54; by2 = ay;
                tlX = w * 0.11; tlW = w * 0.83; tlY = h - 30;
            }

            var within = round.one > 0 ? (round.sim % round.one) : 0;
            var ssdPhase = within < SSD_FTL ? 0 : within < SSD_FTL + SSD_TR ? 1 : 2;
            drawSsd(c, ax, ay, dw, dh, ssdPhase);
            var gg = hddGeom(bx2, by2, dw, dh);
            drawHdd(c, bx2, by2, dw, dh, trackR(trkIdx, gg.rIn, gg.rOut), phase);

            // Zaehler an der SSD-Bahn
            txt(c, '× ' + thou(round.ssdDone), ax + dw - 12, ay + dh - 12, 12, OK + '.95)', 'right');
            drawTimeline(c, tlX, tlY, tlW);
        }

        f.querySelectorAll('[data-mode]').forEach(function (b) {
            on(b, 'click', function () {
                mode = b.getAttribute('data-mode');
                f.querySelectorAll('[data-mode]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
                round = null; hold = 0; newRound();
            });
        });
        newRound();
        S.loop(st.canvas, frame);
    }

    // ══ Abbildung 5 · Mehr Bits, weniger Abstand ══════════════════════════════
    // Das Spannungsfenster der Zelle ist fest. Wer mehr Pegel hineinlegt,
    // verkleinert den Abstand — und das Programmierrauschen bleibt.
    function wearFigure() {
        var f = el('fig-wear'); if (!f) return;
        var st = S.stage(f.querySelector('canvas')), range = f.querySelector('#wearRange');
        var VLO = -2.0, VHI = 4.0, W = VHI - VLO;
        var TYPES = {
            SLC: { bits: 1, cycles: 100000 },
            MLC: { bits: 2, cycles: 10000 },
            TLC: { bits: 3, cycles: 3000 },
            QLC: { bits: 4, cycles: 1000 }
        };
        var type = 'TLC', wear = 0, t = 0;

        function levels() { return Math.pow(2, TYPES[type].bits); }
        function gap() { return W / levels(); }
        // Streuung: ein fester Anteil aus Rauschen und Retention plus der Teil,
        // den das Programmieren selbst uebriglaesst (feinere Pegel → feinere Stufen).
        function sigma() {
            var s0 = 0.045 + 0.055 * gap();
            return s0 * (1 + 0.75 * Math.pow(wear / 100, 1.3));
        }
        // Rohbitfehlerrate: Ueberlapp benachbarter Verteilungen.
        // Randpegel haben nur einen Nachbarn — daher der Faktor 2(n-1)/n.
        function rber() {
            var n = levels();
            return 2 * (n - 1) / n * qTail(gap() / (2 * sigma()));
        }

        function sync() {
            var d = TYPES[type], r = rber();
            put('wearBits', String(d.bits), null, 'hi');
            put('wearGap', thou(gap() * 1000), 'mV', gap() * 1000 < 500 ? 'warn' : '');
            put('wearCycles', thou(d.cycles * wear / 100) + ' / ' + thou(d.cycles), null, wear >= 90 ? 'warn' : '');
            put('wearRber', r < 1e-9 ? '< 10⁻⁹' : expo(r), null, r < 1e-4 ? 'ok' : r < 1e-2 ? 'warn' : 'no');
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow, i;
            c.clearRect(0, 0, w, h);
            var x = narrow ? 26 : 54, aw = (narrow ? w - 44 : w - 96);
            var base = narrow ? h * 0.74 : h * 0.78, top = narrow ? 52 : 44;
            var map = function (v) { return x + (v - VLO) / W * aw; };
            var n = levels(), d = gap(), s = sigma(), amp = base - top - 10;

            // Fenstergrenzen — sie aendern sich nie, egal wie viele Pegel drin liegen
            rr(c, map(VLO), top - 6, aw, base - top + 6, 6, 'rgba(255,255,255,.014)', 'rgba(255,255,255,.09)');
            line(c, x, base, x + aw, base, 'rgba(255,255,255,.24)', 1.2);
            for (i = Math.ceil(VLO); i <= VHI; i++) {
                line(c, map(i), base, map(i), base + (i % 2 ? 3 : 6), GRID, 1);
                if (i % 2 === 0) txt(c, String(i), map(i), base + 16, 9, MUTE, 'center');
            }
            txt(c, 'VTH / V', x + aw, base + 32, 9, DIM, 'right');

            // Pegelverteilungen + Ueberlapp
            var col = n <= 2 ? OK : n <= 4 ? 'rgba(125,211,252,' : n <= 8 ? 'rgba(216,180,254,' : WARN;
            for (i = 0; i < n; i++) {
                var mu = VLO + d * (i + 0.5);
                bell(c, map, mu, s, base, amp, col + '.85)', col + '.10)', 1.5);
                if (i < n - 1) line(c, map(mu + d / 2), top - 2, map(mu + d / 2), base, 'rgba(255,255,255,.13)', 1, [3, 4]);
            }
            // Ueberlapp der beiden mittleren Pegel rot ausfuellen
            var mid = Math.floor(n / 2), muA = VLO + d * (mid - 0.5), muB = VLO + d * (mid + 0.5), cut = (muA + muB) / 2;
            c.save(); c.beginPath();
            c.rect(map(cut), top - 10, map(VHI) - map(cut), base - top + 10); c.clip();
            bell(c, map, muA, s, base, amp, 'rgba(0,0,0,0)', BAD + '.42)', 0.01);
            c.restore();
            c.save(); c.beginPath();
            c.rect(map(VLO), top - 10, map(cut) - map(VLO), base - top + 10); c.clip();
            bell(c, map, muB, s, base, amp, 'rgba(0,0,0,0)', BAD + '.42)', 0.01);
            c.restore();

            // Messschieber fuer den Pegelabstand
            var ay2 = top - 20;
            line(c, map(muA), ay2, map(muB), ay2, DIM, 1.2);
            line(c, map(muA), ay2 - 4, map(muA), ay2 + 4, DIM, 1.2);
            line(c, map(muB), ay2 - 4, map(muB), ay2 + 4, DIM, 1.2);
            txt(c, thou(d * 1000) + ' mV', (map(muA) + map(muB)) / 2, ay2 - 11, 9.5, TEXT, 'center');
            txt(c, 'σ ' + thou(s * 1000) + ' mV', x, ay2 - 11, 9.5, MUTE);
            txt(c, n + ' × ' + TYPES[type].bits + ' bit', x + aw, ay2 - 11, 9.5, MUTE, 'right');
        }

        f.querySelectorAll('[data-type]').forEach(function (b) {
            on(b, 'click', function () {
                type = b.getAttribute('data-type');
                f.querySelectorAll('[data-type]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
                sync();
            });
        });
        on(range, 'input', function () { wear = parseInt(range.value, 10); sync(); });
        sync();
        S.loop(st.canvas, function (dt) { t += dt; draw(); });
    }

    function init() { cellFigure(); nandFigure(); ftlFigure(); compareFigure(); wearFigure(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
