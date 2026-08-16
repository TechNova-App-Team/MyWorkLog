// ═══ ARBEITSSPEICHER MODULE ═══
// Figuren fuer /it-stories/arbeitsspeicher/.
//
// Grundsatz wie in den anderen Deep Dives: jede angezeigte Zahl wird gerechnet.
//   Abb. 1  Ladung aus Q = C · U, Leckkurve exponentiell, Retention halbiert
//           sich je 10 K — daher der doppelte Refresh-Takt ueber 85 °C
//   Abb. 2  Bitleitungssignal aus der Ladungsteilung C_Zelle/(C_Zelle+C_BL)
//   Abb. 3  Latenz aus tCL/tRCD/tRP eines DDR4-3200 CL22, Trefferquote aus
//           dem tatsaechlich abgespielten Zugriffsmuster ueber 16 Baenke
//   Abb. 4  Echter Hamming-SECDED ueber 72 Bit (Syndrom = XOR der Positionen)
//   Abb. 5  Rowhammer: 47 ns je Aktivierung, Stoerung je Nachbarschaft,
//           TRR als Zaehlertabelle mit vier Plaetzen
//
// Auf der Leinwand stehen nur Zahlen, Einheiten und Formelzeichen. Jeder Wert,
// den JS ins .readout schreibt, ist ebenfalls sprachfrei — die /en/-Seiten sind
// statische Kopien, dort wuerde ein deutsches Wort aus JS nie uebersetzt.
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
    // Die Einheit steckt in einem eigenen <small>. Ein blosses textContent wuerde
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
    function seg(fig, attr, fn) {
        fig.querySelectorAll('[' + attr + ']').forEach(function (b) {
            on(b, 'click', function () {
                fig.querySelectorAll('[' + attr + ']').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
                fn(b.getAttribute(attr));
            });
        });
    }

    // ── Zahlen ────────────────────────────────────────────────────────────────
    // Trennzeichen nach Seitensprache: auf /en/ waere "0,09" schlicht falsch.
    var LOC = document.documentElement.lang === 'en' ? 'en-US' : 'de-DE';
    function de(n, d) { var s = n.toFixed(d); return LOC === 'de-DE' ? s.replace('.', ',') : s; }
    function thou(n) { return Math.round(n).toLocaleString(LOC); }
    function hex2(n) { return '0x' + n.toString(16).toUpperCase().padStart(2, '0'); }
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
    function glow(c, x, y, r, color) {
        var g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color); g.addColorStop(1, color.replace(/,[^,]+\)$/, ',0)'));
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    function arrow(c, x1, y1, x2, y2, color, width) {
        line(c, x1, y1, x2, y2, color, width || 1.4);
        var a = Math.atan2(y2 - y1, x2 - x1), l = 6;
        line(c, x2, y2, x2 - Math.cos(a - 0.5) * l, y2 - Math.sin(a - 0.5) * l, color, width || 1.4);
        line(c, x2, y2, x2 - Math.cos(a + 0.5) * l, y2 - Math.sin(a + 0.5) * l, color, width || 1.4);
    }

    // ══ Abbildung 1 · Die Zelle verliert ihre Ladung ══════════════════════════
    function cellFigure() {
        var f = el('fig-cell'); if (!f) return;
        var st = S.stage(f.querySelector('canvas')), range = f.querySelector('#ramTemp');

        var VDD = 1.2, VREF = 0.6, C_CELL = 10e-15, Q_E = 1.602176634e-19;
        var OFFSET = 0.015, SHARE = 0.10;          // Leseverstaerker-Offset, C_c/(C_c+C_BL)
        var V_MIN = VREF + OFFSET / SHARE;         // 0,75 V — darunter nicht mehr sicher lesbar
        var TAU85 = 46.2;                          // ms; so wird die Retention bei 85 °C zu 64 ms
        var LOG_LO = 0, LOG_HI = 5;                // Zeitachse 1 ms … 100 s, dekadisch
        var SWEEP = (LOG_HI - LOG_LO) / 8;         // Dekaden je Sekunde — konstante Bildgeschwindigkeit

        var temp = 45, refresh = 64, logT = LOG_LO;

        function tau(t) { return TAU85 * Math.pow(2, (85 - t) / 10); }          // ms
        function retention(t) { return tau(t) * Math.LN2 * 2; }                  // ln(4) · tau
        function volts(ms) { return VREF + (VDD - VREF) * Math.exp(-ms / tau(temp)); }
        function charge(v) { return C_CELL * v / Q_E; }
        function ms() { return Math.pow(10, logT); }
        function fmtT(v) { return v >= 1000 ? de(v / 1000, 2) + '|s' : de(v, v < 10 ? 2 : 0) + '|ms'; }

        function sync() {
            var v = volts(ms()), r = retention(temp), a = fmtT(r).split('|'), b = fmtT(ms()).split('|');
            put('cellCharge', thou(charge(v)), 'e⁻', v >= V_MIN ? 'ok' : 'no');
            put('cellFloor', thou(charge(V_MIN)), 'e⁻', '');
            put('cellRetention', a[0], a[1], r < 64 ? 'no' : r < 200 ? 'warn' : '');
            put('cellSince', b[0], b[1], '');
        }

        function drawCell(c, x, y, w, h) {
            rr(c, x, y, w, h, 12, 'rgba(255,255,255,.016)', 'rgba(255,255,255,.13)');
            var v = volts(ms()), fill = clamp((v - VREF) / (VDD - VREF), 0, 1);
            var alive = v >= V_MIN;
            var blx = x + w * 0.72, wly = y + h * 0.30, capY = y + h * 0.56;
            // Bitleitung senkrecht, Wortleitung waagerecht
            line(c, blx, y + 16, blx, y + h - 16, STEEL + '.35)', 1.6);
            txt(c, 'BL', blx + 8, y + 22, 9.5, DIM);
            line(c, x + 14, wly, blx + 30, wly, S.primary(.7), 1.6);
            txt(c, 'WL', x + 16, wly - 12, 9.5, 'rgba(216,180,254,.95)');
            // Auswahltransistor
            var tx = x + w * 0.40;
            line(c, tx, wly, tx, wly + 16, S.primary(.7), 1.4);
            rr(c, tx - 13, wly + 16, 26, 16, 3, S.primary(.18), S.primary(.6));
            line(c, tx + 13, wly + 24, blx, wly + 24, STEEL + '.35)', 1.4);
            txt(c, 'T', tx, wly + 24, 9.5, TEXT, 'center');
            // Kondensator: zwei Platten, dazwischen die Fuellung
            var cw = w * 0.30, cx = tx - cw / 2;
            line(c, tx, wly + 32, tx, capY, STEEL + '.35)', 1.4);
            line(c, cx, capY, cx + cw, capY, STEEL + '.75)', 2.5);
            line(c, cx, capY + 22, cx + cw, capY + 22, STEEL + '.5)', 2.5);
            var col = alive ? OK : BAD;
            c.fillStyle = col + (0.15 + 0.55 * fill) + ')';
            c.fillRect(cx + 2, capY + 3, (cw - 4) * fill, 17);
            txt(c, 'C', cx - 10, capY + 11, 9.5, DIM, 'right');
            line(c, tx, capY + 22, tx, capY + 34, STEEL + '.35)', 1.4);
            line(c, tx - 9, capY + 34, tx + 9, capY + 34, STEEL + '.5)', 2);
            line(c, tx - 5, capY + 38, tx + 5, capY + 38, STEEL + '.4)', 1.6);
            if (alive) glow(c, cx + cw * fill, capY + 11, 14, col + '.22)');
            txt(c, de(v, 2) + ' V', x + w / 2, y + h - 18, 11, alive ? TEXT : BAD + '.95)', 'center');
        }

        function drawPlot(c, x, y, w, h) {
            var mapX = function (lg) { return x + (lg - LOG_LO) / (LOG_HI - LOG_LO) * w; };
            var mapY = function (v) { return y + h - (v - VREF) / (VDD - VREF) * h; };
            var i, lg;
            rr(c, x, y - 8, w, h + 8, 8, 'rgba(255,255,255,.012)', 'rgba(255,255,255,.09)');
            // Dekadenraster
            for (i = LOG_LO; i <= LOG_HI; i++) {
                line(c, mapX(i), y - 8, mapX(i), y + h, GRID, 1);
                txt(c, i < 3 ? Math.pow(10, i) + '' : Math.pow(10, i - 3) + '', mapX(i), y + h + 14, 9, MUTE, 'center');
                txt(c, i < 3 ? 'ms' : 's', mapX(i), y + h + 25, 8, MUTE, 'center');
            }
            // Leseschwelle
            line(c, x, mapY(V_MIN), x + w, mapY(V_MIN), BAD + '.55)', 1.2, [4, 4]);
            txt(c, 'Umin', x + 6, mapY(V_MIN) - 9, 9, 'rgba(252,165,165,.9)');
            // Kurven: typische Zelle (100× laenger) und schwaechste Zelle
            [{ k: 100, col: 'rgba(255,255,255,.26)', wid: 1.2 }, { k: 1, col: WARN + '.9)', wid: 1.9 }].forEach(function (curve) {
                c.beginPath();
                for (lg = LOG_LO; lg <= LOG_HI + 0.001; lg += 0.04) {
                    var v = VREF + (VDD - VREF) * Math.exp(-Math.pow(10, lg) / (tau(temp) * curve.k));
                    if (lg === LOG_LO) c.moveTo(mapX(lg), mapY(v)); else c.lineTo(mapX(lg), mapY(v));
                }
                c.strokeStyle = curve.col; c.lineWidth = curve.wid; c.stroke();
            });
            // Refresh-Marken
            [64, 32].forEach(function (r) {
                var lx = mapX(Math.log(r) / Math.LN10), live = refresh === r;
                line(c, lx, y - 8, lx, y + h, live ? OK + '.8)' : 'rgba(255,255,255,.14)', live ? 1.6 : 1, [3, 3]);
                txt(c, r + '', lx, y - 16, 9, live ? OK + '.95)' : MUTE, 'center');
            });
            // Aktueller Punkt
            var v0 = volts(ms()), px = mapX(logT), py = mapY(v0);
            var col = v0 >= V_MIN ? OK : BAD;
            glow(c, px, py, 15, col + '.30)');
            dot(c, px, py, 4, col + '1)');
            txt(c, 'U', x - 8, y + 4, 9.5, DIM, 'right');
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow;
            c.clearRect(0, 0, w, h);
            txt(c, temp + ' °C', w / 2, 16, 11, TEXT, 'center');
            if (narrow) {
                drawCell(c, w * 0.14, 30, w * 0.72, h * 0.40);
                drawPlot(c, 30, h * 0.56, w - 52, h * 0.30);
            } else {
                drawCell(c, w * 0.04, h * 0.10, w * 0.30, h * 0.80);
                drawPlot(c, w * 0.42, h * 0.20, w * 0.53, h * 0.58);
            }
        }

        on(range, 'input', function () { temp = parseInt(range.value, 10); logT = LOG_LO; sync(); });
        seg(f, 'data-refresh', function (v) { refresh = parseInt(v, 10); logT = LOG_LO; sync(); });
        sync();
        S.loop(st.canvas, function (dt) {
            logT += dt * SWEEP;
            if (refresh > 0 && ms() >= refresh) logT = LOG_LO;
            if (logT > LOG_HI) logT = LOG_LO;
            sync(); draw();
        });
    }

    // ══ Abbildung 2 · Aus einer Zelle werden vierzig Millivolt ════════════════
    function senseFigure() {
        var f = el('fig-sense'); if (!f) return;
        var st = S.stage(f.querySelector('canvas')), range = f.querySelector('#senseRange');

        var VDD = 1.2, VREF = 0.6, C_CELL = 10, C_PER_CELL = 0.15, OFFSET = 15;   // fF, mV
        var T_RCD = 13.75, T_RAS = 32, T_RP = 13.75, T_SHARE = 2, T_TOTAL = T_RAS + T_RP;
        var cells = 512, bit = 1, t = 0;

        function cbl() { return cells * C_PER_CELL; }
        function dv() { return (VDD - VREF) * 1000 * C_CELL / (C_CELL + cbl()); }

        function sync() {
            var d = dv(), m = d - OFFSET;
            put('senseDv', de(d, 0), 'mV', m > 25 ? 'ok' : m > 0 ? 'warn' : 'no');
            put('senseCbl', de(cbl(), 0), 'fF', '');
            put('senseMargin', de(m, 0), 'mV', m > 25 ? 'ok' : m > 0 ? 'warn' : 'no');
            put('senseCells', String(cells), '', '');
        }

        // Spannungsverlauf der beiden Bitleitungen ueber einen vollen Zyklus
        function blVolt(ns, sign) {
            var d = dv() / 1000 * sign * (bit ? 1 : -1);
            if (ns < T_SHARE) return VREF + d * (ns / T_SHARE);
            if (ns < T_RCD) {
                var p = smooth((ns - T_SHARE) / (T_RCD - T_SHARE));
                var full = (d > 0 ? VDD : 0);
                return (VREF + d) + (full - (VREF + d)) * p;
            }
            if (ns < T_RAS) return d > 0 ? VDD : 0;
            var q = smooth((ns - T_RAS) / T_RP);
            return (d > 0 ? VDD : 0) + (VREF - (d > 0 ? VDD : 0)) * q;
        }

        function drawSchematic(c, x, y, w, h, ns) {
            rr(c, x, y, w, h, 12, 'rgba(255,255,255,.016)', 'rgba(255,255,255,.13)');
            var blx = x + w * 0.46, bbx = x + w * 0.78, top = y + 30, bot = y + h - 24;
            var open = ns < T_RAS, active = ns >= T_SHARE && ns < T_RAS;
            var sy = y + h * 0.74;
            // Leseverstaerker zuerst, damit die Bitleitungen sichtbar hindurchlaufen
            rr(c, blx - 18, sy - 17, bbx - blx + 36, 34, 6,
                active ? OK + '.16)' : 'rgba(255,255,255,.03)', active ? OK + '.85)' : 'rgba(255,255,255,.18)', active ? 1.6 : 1);
            // Bitleitungspaar
            line(c, blx, top, blx, bot, STEEL + (open ? '.6)' : '.3)'), 1.8);
            line(c, bbx, top, bbx, bot, STEEL + '.3)', 1.8);
            txt(c, 'BL', blx, top - 12, 9.5, DIM, 'center');
            txt(c, 'BL', bbx, top - 12, 9.5, MUTE, 'center');
            line(c, bbx - 7, top - 19, bbx + 7, top - 19, MUTE, 1);
            txt(c, 'SA', (blx + bbx) / 2, sy, 10, active ? TEXT : DIM, 'center');
            if (active) glow(c, (blx + bbx) / 2, sy, 26, OK + '.18)');

            // 1T1C-Zelle: Kondensator → Transistor → Bitleitung, Wortleitung ans Gate
            var cx = x + w * 0.15, ty = y + h * 0.40, nodeY = y + h * 0.22, capY = y + h * 0.60;
            line(c, x + 12, ty, cx - 13, ty, S.primary(open ? .9 : .4), 1.6);
            txt(c, 'WL', x + 12, ty - 12, 9, 'rgba(216,180,254,.95)');
            rr(c, cx - 13, ty - 10, 26, 20, 3, S.primary(open ? .32 : .12), S.primary(.65), open ? 1.5 : 1);
            txt(c, 'T', cx, ty, 9.5, open ? TEXT : DIM, 'center');
            line(c, cx, ty - 10, cx, nodeY, STEEL + '.4)', 1.4);
            line(c, cx, nodeY, blx, nodeY, STEEL + (open ? '.6)' : '.3)'), 1.4);
            line(c, cx, ty + 10, cx, capY, STEEL + '.4)', 1.4);
            line(c, cx - 15, capY, cx + 15, capY, STEEL + '.75)', 2.4);
            line(c, cx - 15, capY + 9, cx + 15, capY + 9, STEEL + '.5)', 2.4);
            c.fillStyle = (bit ? OK : 'rgba(100,116,139,') + (open ? '.6)' : '.32)');
            c.fillRect(cx - 13, capY + 1.5, 26, 7);
            txt(c, 'C', cx - 22, capY + 5, 9.5, DIM, 'right');
            line(c, cx, capY + 9, cx, capY + 19, STEEL + '.4)', 1.3);
            line(c, cx - 9, capY + 19, cx + 9, capY + 19, STEEL + '.5)', 2);
            line(c, cx - 5, capY + 23, cx + 5, capY + 23, STEEL + '.4)', 1.6);
            txt(c, bit ? '1' : '0', cx, capY + 36, 11, bit ? OK + '.95)' : MUTE, 'center');
        }

        function drawTrace(c, x, y, w, h, ns) {
            var mapX = function (n) { return x + n / T_TOTAL * w; };
            var mapY = function (v) { return y + h - v / VDD * h; };
            var n, i;
            rr(c, x, y, w, h, 8, 'rgba(255,255,255,.012)', 'rgba(255,255,255,.09)');
            line(c, x, mapY(VREF), x + w, mapY(VREF), 'rgba(255,255,255,.18)', 1, [4, 4]);
            txt(c, 'U/2', x - 6, mapY(VREF), 9, MUTE, 'right');
            txt(c, 'U', x - 6, mapY(VDD) + 5, 9, MUTE, 'right');
            txt(c, '0', x - 6, mapY(0) - 5, 9, MUTE, 'right');
            // Phasengrenzen — Beschriftung unter die Achse, sonst liegt sie auf der Kurve
            [[T_SHARE, 'tSH'], [T_RCD, 'tRCD'], [T_RAS, 'tRAS'], [T_TOTAL, 'tRP']].forEach(function (p) {
                line(c, mapX(p[0]), y, mapX(p[0]), y + h, 'rgba(255,255,255,.13)', 1);
                txt(c, p[1], mapX(p[0]) - 3, y + h + 13, 8.5, MUTE, 'right');
            });
            [1, -1].forEach(function (sign) {
                c.beginPath();
                for (i = 0; i <= 120; i++) {
                    n = i / 120 * T_TOTAL;
                    if (i === 0) c.moveTo(mapX(n), mapY(blVolt(n, sign))); else c.lineTo(mapX(n), mapY(blVolt(n, sign)));
                }
                c.strokeStyle = sign > 0 ? OK + '.9)' : WARN + '.75)';
                c.lineWidth = 1.7; c.stroke();
            });
            // Der eigentliche Punkt der Figur: wie klein das Signal am Anfang ist
            var yA = mapY(blVolt(T_SHARE, 1)), yB = mapY(blVolt(T_SHARE, -1)), mx = mapX(T_SHARE) + 14;
            line(c, mx, yA, mx, yB, 'rgba(252,165,165,.95)', 1.4);
            line(c, mx - 4, yA, mx + 4, yA, 'rgba(252,165,165,.95)', 1.4);
            line(c, mx - 4, yB, mx + 4, yB, 'rgba(252,165,165,.95)', 1.4);
            txt(c, de(dv(), 0) + ' mV', mx + 8, (yA + yB) / 2, 10, 'rgba(252,165,165,.95)');
            // Laufender Zeitpunkt
            var cx2 = mapX(ns);
            line(c, cx2, y, cx2, y + h, S.primary(.5), 1.2);
            dot(c, cx2, mapY(blVolt(ns, 1)), 3.4, OK + '1)');
            dot(c, cx2, mapY(blVolt(ns, -1)), 3.4, WARN + '1)');
            txt(c, de(ns, 1) + ' ns', x + w, y + h + 28, 9.5, TEXT, 'right');
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow;
            c.clearRect(0, 0, w, h);
            var ns = (t * 14) % T_TOTAL;
            if (narrow) {
                drawSchematic(c, w * 0.16, 14, w * 0.68, h * 0.42);
                drawTrace(c, 34, h * 0.60, w - 52, h * 0.30, ns);
            } else {
                drawSchematic(c, w * 0.04, h * 0.10, w * 0.32, h * 0.80);
                drawTrace(c, w * 0.46, h * 0.18, w * 0.49, h * 0.60, ns);
            }
        }

        on(range, 'input', function () { cells = parseInt(range.value, 10); sync(); });
        seg(f, 'data-bit', function (v) { bit = parseInt(v, 10); });
        sync();
        S.loop(st.canvas, function (dt) { t += dt; draw(); });
    }

    // ══ Abbildung 3 · Zeilentreffer gegen Zeilenkonflikt ══════════════════════
    function bankFigure() {
        var f = el('fig-bank'); if (!f) return;
        var st = S.stage(f.querySelector('canvas'));

        var BANKS = 16, ROWS = 12, T_CL = 13.75, T_RCD = 13.75, T_RP = 13.75;
        var pat = 'seq', seqIdx = 0, acc = 0, wait = 0;
        var openRow = [], stat = { n: 0, hit: 0, sum: 0, kind: [0, 0, 0] };
        var last = { bank: 0, row: 0, col: 0, kind: 0, ns: 0 };   // kind 0 Treffer, 1 Oeffnen, 2 Konflikt

        function reset() {
            openRow = []; for (var i = 0; i < BANKS; i++) openRow.push(-1);
            seqIdx = 0; stat = { n: 0, hit: 0, sum: 0, kind: [0, 0, 0] };
            last = { bank: 0, row: 0, col: 0, kind: 1, ns: 0 };
            sync();
        }
        function sync() {
            put('bankCount', thou(stat.n), '', '');
            var hp = stat.n ? stat.hit / stat.n * 100 : 0;
            put('bankHit', de(hp, 0), '%', hp > 80 ? 'ok' : hp > 30 ? 'warn' : 'no');
            put('bankAvg', de(stat.n ? stat.sum / stat.n : 0, 2), 'ns', '');
            put('bankLast', de(last.ns, 2), 'ns', last.kind === 0 ? 'ok' : last.kind === 1 ? 'warn' : 'no');
        }
        function step() {
            var bank, row, col;
            if (pat === 'seq') {
                col = seqIdx % 16; bank = Math.floor(seqIdx / 16) % BANKS; row = Math.floor(seqIdx / (16 * BANKS));
                seqIdx++;
            } else {
                col = Math.floor(Math.random() * 16); bank = Math.floor(Math.random() * BANKS);
                row = Math.floor(Math.random() * 512);
            }
            var kind, ns;
            if (openRow[bank] === row) { kind = 0; ns = T_CL; stat.hit++; }
            else if (openRow[bank] < 0) { kind = 1; ns = T_RCD + T_CL; }
            else { kind = 2; ns = T_RP + T_RCD + T_CL; }
            openRow[bank] = row;
            stat.n++; stat.sum += ns; stat.kind[kind]++;
            last = { bank: bank, row: row, col: col, kind: kind, ns: ns };
            sync();
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow, i;
            c.clearRect(0, 0, w, h);
            var col = last.kind === 0 ? OK : last.kind === 1 ? WARN : BAD;
            txt(c, 'B ' + String(last.bank).padStart(2, '0') + ' · R ' + last.row + ' · C ' + String(last.col).padStart(2, '0'),
                w / 2, 15, 10.5, DIM, 'center');

            var gx, gy, gw, gh, sx, sy, sw;
            if (narrow) { gx = w * 0.08; gw = w * 0.84; gy = 34; gh = h * 0.42; sx = w * 0.08; sw = w * 0.84; sy = h * 0.62; }
            else { gx = w * 0.05; gw = w * 0.44; gy = 34; gh = h - 74; sx = w * 0.56; sw = w * 0.38; sy = h * 0.24; }

            // Baenke: welche hat gerade eine Zeile offen?
            var bw = (gw - 15 * 3) / BANKS;
            for (i = 0; i < BANKS; i++) {
                var bx = gx + i * (bw + 3), live = i === last.bank;
                rr(c, bx, gy, bw, 12, 2, openRow[i] >= 0 ? S.primary(live ? .95 : .5) : 'rgba(255,255,255,.06)',
                    live ? col + '.95)' : openRow[i] >= 0 ? S.primary(.7) : null, 1.3);
            }
            txt(c, BANKS + ' × B', gx, gy - 10, 9, MUTE);

            // Zeilenraster der aktiven Bank + Zeilenpuffer
            var ry = gy + 26, rh = (gh - 60) / ROWS;
            var openIdx = openRow[last.bank] >= 0 ? openRow[last.bank] % ROWS : -1;
            for (i = 0; i < ROWS; i++) {
                var yy = ry + i * rh, isOpen = i === openIdx;
                rr(c, gx, yy, gw, rh - 2.5, 2, isOpen ? S.primary(.55) : 'rgba(255,255,255,.035)',
                    isOpen ? S.primary(1) : 'rgba(255,255,255,.08)', isOpen ? 1.6 : 1);
                if (isOpen) txt(c, 'R ' + last.row, gx + gw - 8, yy + (rh - 2.5) / 2, Math.min(9.5, rh * 0.55), TEXT, 'right');
            }
            // Zeilenpuffer darunter, mit der angeforderten Spalte
            var byy = ry + ROWS * rh + 6;
            rr(c, gx, byy, gw, 18, 3, 'rgba(255,255,255,.05)', STEEL + '.35)', 1.2);
            for (i = 0; i < 16; i++) {
                var cwd = (gw - 8) / 16, cxx = gx + 4 + i * cwd;
                rr(c, cxx + 1, byy + 4, cwd - 2, 10, 1.5, i === last.col ? col + '.9)' : 'rgba(255,255,255,.10)', null);
            }
            txt(c, '1 KiB', gx, byy + 30, 9, MUTE);
            txt(c, '16 × 64 B', gx + gw, byy + 30, 9, MUTE, 'right');

            // Latenz des letzten Zugriffs, in ihre Bestandteile zerlegt
            var segs = last.kind === 2 ? [[T_RP, BAD], [T_RCD, WARN], [T_CL, OK]]
                : last.kind === 1 ? [[T_RCD, WARN], [T_CL, OK]] : [[T_CL, OK]];
            var full = T_RP + T_RCD + T_CL, cur = sx, i2;
            txt(c, 'tACC', sx, sy - 14, 9.5, DIM);
            rr(c, sx, sy, sw, 22, 4, 'rgba(255,255,255,.04)', null);
            for (i2 = 0; i2 < segs.length; i2++) {
                var sgw = sw * (segs[i2][0] / full);
                rr(c, cur, sy, sgw, 22, 0, segs[i2][1] + '.85)', null);
                if (sgw > 30) txt(c, de(segs[i2][0], 2), cur + sgw / 2, sy + 11, 9, 'rgba(15,23,42,.92)', 'center');
                cur += sgw;
            }
            txt(c, de(last.ns, 2) + ' ns', sx + sw, sy + 38, 12, col + '.95)', 'right');

            // Verteilung der bisherigen Zugriffe auf die drei Faelle
            var hy = sy + 62;
            txt(c, 'Σ ' + thou(stat.n), sx, hy - 12, 9.5, DIM);
            var kinds = [[stat.kind[0], OK], [stat.kind[1], WARN], [stat.kind[2], BAD]];
            var cur2 = sx;
            rr(c, sx, hy, sw, 14, 3, 'rgba(255,255,255,.04)', null);
            for (i2 = 0; i2 < 3; i2++) {
                var kwd = stat.n ? sw * (kinds[i2][0] / stat.n) : 0;
                if (kwd > 0.5) rr(c, cur2, hy, kwd, 14, 0, kinds[i2][1] + '.85)', null);
                cur2 += kwd;
            }
            for (i2 = 0; i2 < 3; i2++) {
                var ky = hy + 34 + i2 * 20;
                rr(c, sx, ky - 5, 9, 9, 2, kinds[i2][1] + '.9)', null);
                txt(c, thou(kinds[i2][0]), sx + 18, ky, 10, TEXT);
                txt(c, de(stat.n ? kinds[i2][0] / stat.n * 100 : 0, 0) + ' %', sx + sw, ky, 10, MUTE, 'right');
            }
            txt(c, 'Ø ' + de(stat.n ? stat.sum / stat.n : 0, 1) + ' ns', sx, hy + 34 + 3 * 20 + 8, 11.5, TEXT);
        }

        seg(f, 'data-pat', function (v) { pat = v; reset(); });
        on(f.querySelector('#bankReset'), 'click', reset);
        reset();
        S.loop(st.canvas, function (dt) {
            wait += dt; acc += dt;
            if (wait > 0.22) { wait = 0; step(); }
            draw();
        });
    }

    // ══ Abbildung 4 · Hamming-SECDED ueber 72 Bit ═════════════════════════════
    // Bit 0 traegt die Gesamtparitaet, die Bits 1…71 bilden den Hamming-Code:
    // Pruefbits auf den Zweierpotenzen, Syndrom = XOR der Positionen aller
    // gesetzten Bits. Damit zeigt das Syndrom direkt auf die kaputte Stelle.
    function eccFigure() {
        var f = el('fig-ecc'); if (!f) return;
        var st = S.stage(f.querySelector('canvas'));
        var N = 72, PAR = [1, 2, 4, 8, 16, 32, 64];
        var word = [], flips = [], layout = [];

        function isParity(i) { return i === 0 || PAR.indexOf(i) >= 0; }
        function build() {
            var i;
            word = []; flips = [];
            for (i = 0; i < N; i++) { word.push(0); flips.push(false); }
            // Deterministisches Datenmuster, damit die Figur reproduzierbar ist
            for (i = 1; i < N; i++) if (!isParity(i)) word[i] = ((i * 37 + 11) >> 2) & 1;
            // Pruefbits so setzen, dass das Syndrom null wird
            PAR.forEach(function (p) {
                var x = 0;
                for (i = 1; i < N; i++) if (i !== p && word[i] && (i & p)) x ^= 1;
                word[p] = x;
            });
            var tot = 0;
            for (i = 1; i < N; i++) tot ^= word[i];
            word[0] = tot;
        }
        function syndrome() {
            var s = 0, i;
            for (i = 1; i < N; i++) if (word[i] ^ (flips[i] ? 1 : 0)) s ^= i;
            return s;
        }
        function overall() {
            var o = 0, i;
            for (i = 0; i < N; i++) o ^= (word[i] ^ (flips[i] ? 1 : 0));
            return o;
        }
        function nFlips() { var n = 0, i; for (i = 0; i < N; i++) if (flips[i]) n++; return n; }
        // Was der Decoder tut, haengt nur an Syndrom und Gesamtparitaet — er kennt
        // die Wahrheit nicht. Die Figur kennt sie und vergleicht:
        // 0 sauber · 1 korrigiert · 2 erkannt, nicht reparabel · 3 still verfaelscht
        function verdict() {
            var s = syndrome(), o = overall(), n = nFlips();
            if (o === 0) {
                // Gerade Anzahl Fehler. Heben sie sich im Syndrom auf, meldet der
                // Code "alles in Ordnung" — der schlimmste Fall von allen.
                return s === 0 ? { code: n ? 3 : 0, pos: -1 } : { code: 2, pos: -1 };
            }
            // Ungerade Anzahl: der Decoder kippt die Stelle s zurueck. Das Syndrom
            // ist 8 Bit breit, das Codewort nur 72 lang — zeigt es daneben, gibt es
            // die Stelle nicht und die Hardware weiss wenigstens, dass etwas faul ist.
            if (s >= N) return { code: 2, pos: -1 };
            // Trifft er das einzige gekippte Bit, ist alles gut. Sonst kippt er ein
            // unschuldiges dazu, und danach stimmt das Wort nicht mehr.
            return { code: (n === 1 && flips[s]) ? 1 : 3, pos: s };
        }

        function sync() {
            var v = verdict(), n = nFlips();
            var cls = v.code === 0 ? 'ok' : v.code === 1 ? 'ok' : v.code === 2 ? 'warn' : 'no';
            put('eccFlips', String(n), '', v.code === 3 ? 'no' : v.code === 2 ? 'warn' : 'ok');
            put('eccSyndrome', hex2(syndrome()), '', '');
            put('eccPos', v.pos < 0 ? '—' : String(v.pos), '', cls);
        }

        function place() {
            var w = st.w, h = st.h, narrow = st.narrow;
            var cols = narrow ? 8 : 12, rows = Math.ceil(N / cols), gap = narrow ? 4 : 5;
            var mw = narrow ? w - 28 : w - 80;
            var cw = Math.min((mw - gap * (cols - 1)) / cols, narrow ? 40 : 52);
            var ch = Math.min(cw * 0.78, (h - 78) / rows - gap);
            var ox = (w - (cw * cols + gap * (cols - 1))) / 2, oy = 44;
            layout = [];
            for (var i = 0; i < N; i++) {
                layout.push({
                    x: ox + (i % cols) * (cw + gap), y: oy + Math.floor(i / cols) * (ch + gap),
                    w: cw, h: ch
                });
            }
            return { cw: cw, ch: ch, oy: oy, rows: rows, gap: gap };
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, i;
            c.clearRect(0, 0, w, h);
            var L = place(), v = verdict();
            txt(c, '64 + 8 bit', w / 2, 17, 10.5, DIM, 'center');
            for (i = 0; i < N; i++) {
                var r = layout[i], p = isParity(i), on_ = word[i] ^ (flips[i] ? 1 : 0);
                var fill = flips[i] ? BAD + '.30)' : p ? S.primary(.34) : 'rgba(255,255,255,.045)';
                var edge = flips[i] ? BAD + '.95)' : p ? S.primary(.85) : 'rgba(255,255,255,.13)';
                rr(c, r.x, r.y, r.w, r.h, 3, fill, edge, flips[i] ? 1.6 : 1);
                txt(c, on_ ? '1' : '0', r.x + r.w / 2, r.y + r.h / 2 - 3, Math.min(11, r.h * 0.42),
                    flips[i] ? 'rgba(252,165,165,.98)' : on_ ? TEXT : MUTE, 'center');
                txt(c, String(i), r.x + r.w / 2, r.y + r.h - 7, Math.min(8, r.h * 0.28), MUTE, 'center');
            }
            // Die Stelle, auf die das Syndrom zeigt
            if (v.pos >= 0 && layout[v.pos]) {
                var t = layout[v.pos];
                var ok = v.code === 1;
                rr(c, t.x - 3, t.y - 3, t.w + 6, t.h + 6, 5, null, (ok ? OK : BAD) + '.95)', 2);
                glow(c, t.x + t.w / 2, t.y + t.h / 2, t.w, (ok ? OK : BAD) + '.20)');
            }
            var msgCol = v.code === 0 ? MUTE : v.code === 1 ? OK + '.95)' : v.code === 2 ? WARN + '.95)' : BAD + '.95)';
            var bar = L.oy + L.rows * (L.ch + L.gap) + 10;
            rr(c, w * 0.5 - 60, bar, 120, 5, 2.5, msgCol, null);
        }

        function hit(e) {
            var r = st.canvas.getBoundingClientRect();
            var x = (e.clientX - r.left) * st.w / r.width, y = (e.clientY - r.top) * st.h / r.height;
            for (var i = 0; i < layout.length; i++) {
                var b = layout[i];
                if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { flips[i] = !flips[i]; sync(); return; }
            }
        }

        build(); sync();
        st.canvas.style.cursor = 'pointer';
        on(st.canvas, 'click', hit);
        on(f.querySelector('#eccFlip'), 'click', function () {
            var free = [], i;
            for (i = 0; i < N; i++) if (!flips[i]) free.push(i);
            if (!free.length) return;
            flips[free[Math.floor(Math.random() * free.length)]] = true;
            sync();
        });
        on(f.querySelector('#eccReset'), 'click', function () { build(); sync(); });
        S.loop(st.canvas, function () { draw(); });
    }

    // ══ Abbildung 5 · Rowhammer ═══════════════════════════════════════════════
    function hammerFigure() {
        var f = el('fig-hammer'); if (!f) return;
        var st = S.stage(f.querySelector('canvas'));

        var ROWS = 22, T_RC = 47e-6;              // ms je Zeilenaktivierung
        var WINDOW = 64;                          // ms Refresh-Fenster
        var T_REFI = 7.8e-3 * 17;                 // ms zwischen zwei TRR-Eingriffen
        var HC = 30000;                           // Stoerungen bis zum Kippen, einseitig
        var TRR_SLOTS = 4;
        var ACT_PER_SEC = 20000;

        var PATTERNS = { single: [11], double: [10, 12], many: [3, 5, 7, 9, 13, 15, 17, 19] };
        var pat = 'double', trrOn = true;
        var loss = [], flipped = [], aggr = [], acts = 0, first = -1, idx = 0, nextTrr = T_REFI, pulse = [];
        var trrTable = [];

        function neighbours(r) { return [r - 1, r + 1].filter(function (x) { return x >= 0 && x < ROWS; }); }
        function reset() {
            loss = []; flipped = []; pulse = [];
            for (var i = 0; i < ROWS; i++) { loss.push(0); flipped.push(false); pulse.push(0); }
            aggr = PATTERNS[pat]; acts = 0; first = -1; idx = 0; nextTrr = T_REFI; trrTable = [];
            sync();
        }
        function sync() {
            var n = 0, i;
            for (i = 0; i < ROWS; i++) if (flipped[i]) n++;
            put('hamActs', thou(acts), '', '');
            put('hamTime', de(acts * T_RC, 2), 'ms', acts * T_RC > WINDOW ? 'warn' : '');
            put('hamFlips', String(n), '', n ? 'no' : 'ok');
            put('hamFirst', first < 0 ? '—' : thou(first), first < 0 ? '' : 'ACT', first < 0 ? 'ok' : 'no');
        }

        // Eine Aktivierung: Nachbarn verlieren Ladung, TRR zaehlt mit.
        function activate(row) {
            acts++;
            var ns = neighbours(row), i;
            for (i = 0; i < ns.length; i++) {
                var v = ns[i];
                // Zwischen zwei Angreifern ist die Stoerung mehr als die Summe
                var both = aggr.indexOf(v - 1) >= 0 && aggr.indexOf(v + 1) >= 0;
                loss[v] += (1 / HC) * (both ? 1.5 : 1);
                if (loss[v] >= 1 && !flipped[v]) {
                    flipped[v] = true; pulse[v] = 1;
                    if (first < 0) first = acts;
                }
            }
            if (!trrOn) return;
            var e = null;
            for (i = 0; i < trrTable.length; i++) if (trrTable[i].row === row) { e = trrTable[i]; break; }
            if (e) e.n++;
            else if (trrTable.length < TRR_SLOTS) trrTable.push({ row: row, n: 1 });
        }
        // TRR frischt die Nachbarn der auffaelligsten verfolgten Zeile vorzeitig auf.
        // Die Tabelle behaelt ihre Eintraege — genau daran scheitert sie: Wer mehr
        // Zeilen haemmert, als Plaetze da sind, wird ab dem fuenften nie verfolgt.
        function runTrr() {
            if (!trrTable.length) return;
            var best = 0, i;
            for (i = 1; i < trrTable.length; i++) if (trrTable[i].n > trrTable[best].n) best = i;
            neighbours(trrTable[best].row).forEach(function (v) { loss[v] = 0; pulse[v] = -1; });
            trrTable[best].n = 0;
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h, narrow = st.narrow, i;
            c.clearRect(0, 0, w, h);
            var gx, gy, gw, gh, px, py, pw;
            if (narrow) { gx = w * 0.06; gw = w * 0.88; gy = 30; gh = h * 0.52; px = w * 0.06; pw = w * 0.88; py = h * 0.64; }
            else { gx = w * 0.05; gw = w * 0.56; gy = 26; gh = h - 46; px = w * 0.66; pw = w * 0.29; py = 44; }
            // Schmal: die vier TRR-Plaetze nebeneinander, sonst reisst die
            // senkrechte Liste den Rest der Figur unten aus dem Bild.
            var slotW = narrow ? (pw - 3 * 6) / TRR_SLOTS : pw, slotStep = narrow ? 0 : 24;

            var rh = gh / ROWS;
            for (i = 0; i < ROWS; i++) {
                var yy = gy + i * rh, isA = aggr.indexOf(i) >= 0, dmg = clamp(loss[i], 0, 1);
                var fill = flipped[i] ? BAD + '.32)' : isA ? WARN + '.22)' : dmg > 0.02 ? BAD + (0.06 + dmg * 0.20) + ')' : 'rgba(255,255,255,.035)';
                var edge = flipped[i] ? BAD + '.95)' : isA ? WARN + '.75)' : 'rgba(255,255,255,.10)';
                rr(c, gx + 26, yy, gw - 26, rh - 2, 2, fill, edge, flipped[i] || isA ? 1.3 : 1);
                txt(c, String(i).padStart(2, '0'), gx + 20, yy + rh / 2 - 1, 8.5, isA ? WARN + '.9)' : MUTE, 'right');
                // Angreifer bekommen einen Aktivierungsimpuls
                if (isA && idx % aggr.length === aggr.indexOf(i)) {
                    arrow(c, gx + 2, yy + rh / 2 - 1, gx + 22, yy + rh / 2 - 1, WARN + '.95)', 1.4);
                }
                // Ladungsverlust der Opferzeilen
                if (!isA && dmg > 0.01) {
                    rr(c, gx + 30, yy + 1.5, (gw - 34) * dmg, rh - 5, 1.5, flipped[i] ? BAD + '.55)' : BAD + '.32)', null);
                }
                if (flipped[i]) txt(c, '1 → 0', gx + gw - 8, yy + rh / 2 - 1, Math.min(9, rh * 0.6), 'rgba(252,165,165,.98)', 'right');
                // TRR-Eingriffe pulsen am linken Rand der Zeile — mittig ergaeben
                // die vielen gleichzeitigen Pulse einen Schleier ueber der Figur.
                if (pulse[i] !== 0) {
                    glow(c, gx + 34, yy + rh / 2, 16, (pulse[i] > 0 ? BAD : OK) + Math.abs(pulse[i]) * 0.45 + ')');
                }
            }
            txt(c, ROWS + ' × R', gx, gy - 12, 9, MUTE);

            // Rechte Spalte: TRR-Tabelle und Fortschritt im Refresh-Fenster
            txt(c, 'TRR ' + (trrOn ? TRR_SLOTS : 0), px, py - 14, 9.5, trrOn ? DIM : MUTE);
            for (i = 0; i < TRR_SLOTS; i++) {
                var e = trrTable[i];
                var sx2 = narrow ? px + i * (slotW + 6) : px, sy = narrow ? py : py + i * slotStep;
                rr(c, sx2, sy, slotW, 19, 3, e ? OK + '.16)' : 'rgba(255,255,255,.03)',
                    e ? OK + '.6)' : 'rgba(255,255,255,.10)', 1);
                if (e) {
                    txt(c, 'R ' + String(e.row).padStart(2, '0'), sx2 + 6, sy + 10, 9, TEXT);
                    txt(c, thou(e.n), sx2 + slotW - 6, sy + 10, 9, OK + '.9)', 'right');
                } else txt(c, '—', sx2 + slotW / 2, sy + 10, 9.5, MUTE, 'center');
            }
            var wy = narrow ? py + 45 : py + TRR_SLOTS * slotStep + 26, prog = clamp(acts * T_RC / WINDOW, 0, 1);
            txt(c, 'tREF', px, wy - 12, 9.5, DIM);
            rr(c, px, wy, pw, 12, 3, 'rgba(255,255,255,.05)', null);
            rr(c, px, wy, pw * prog, 12, 3, S.primary(.85), null);
            txt(c, de(acts * T_RC, 2) + ' / ' + WINDOW + ' ms', px, wy + 26, 9.5, MUTE);
            txt(c, thou(acts) + ' ACT', px, wy + 44, 11, TEXT);
        }

        seg(f, 'data-hpat', function (v) { pat = v; reset(); });
        seg(f, 'data-trr', function (v) { trrOn = v === '1'; reset(); });
        reset();
        S.loop(st.canvas, function (dt) {
            var todo = Math.min(4000, Math.round(dt * ACT_PER_SEC)), i;
            for (i = 0; i < todo; i++) {
                activate(aggr[idx % aggr.length]); idx++;
                if (trrOn && acts * T_RC >= nextTrr) { runTrr(); nextTrr += T_REFI; }
                if (acts * T_RC >= WINDOW) {
                    // Refresh-Fenster vorbei: Ladung wieder voll — gekippte Bits bleiben gekippt
                    for (var k = 0; k < ROWS; k++) loss[k] = 0;
                    acts = 0; nextTrr = T_REFI; trrTable = [];
                }
            }
            for (i = 0; i < ROWS; i++) if (pulse[i] !== 0) pulse[i] *= (pulse[i] > 0 ? 0.94 : 0.88);
            for (i = 0; i < ROWS; i++) if (Math.abs(pulse[i]) < 0.02) pulse[i] = 0;
            sync(); draw();
        });
    }

    function init() { cellFigure(); senseFigure(); bankFigure(); eccFigure(); hammerFigure(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
