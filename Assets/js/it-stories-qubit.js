// ═══ QUBIT MODULE ═══
// Figuren fuer /it-stories/qubit/.
//
// Grundsatz wie in den uebrigen Deep Dives: Jede angezeigte Zahl wird gerechnet,
// nicht gesetzt. Hier heisst das echte Lineare Algebra auf Zustandsvektoren —
// es gibt keine Animationskurve, die ein Ergebnis nachstellt.
//   Abb. 1  Stochastische Matrix gegen Hadamard, beide auf denselben Startwert
//   Abb. 2  Bloch-Vektor; Gatter sind echte Drehungen, α/β folgen aus θ und φ
//   Abb. 3  Zwei komplexe Zeiger, addiert und DANN quadriert (Mach-Zehnder)
//   Abb. 4  Echte Zufallsentscheidungen gegen cos²(θ/2) + Standardfehler
//   Abb. 5  Zwei-Qubit-Zustandsvektor, Verschraenkungsentropie aus der
//           reduzierten Dichtematrix, Trennbarkeit aus der Determinante
//   Abb. 6  CHSH-Groesse S aus den Korrelationen E = cos(2Δ)
//   Abb. 7  Grover: Orakel + Spiegelung am Mittelwert, Amplituden exakt
//
// Auf der Leinwand stehen nur Zahlen, Einheiten und Formelzeichen (|0⟩, θ, φ, S).
// Jedes erklaerende Wort gehoert ins HTML daneben — Canvas-Text ist fuer i18n,
// Suche und Screenreader unsichtbar.
(function () {
    'use strict';
    var S = window.Story;
    if (!S) return;

    // ── Farben ────────────────────────────────────────────────────────────────
    // Positiv/negativ ist hier eine DIVERGIERENDE Skala, keine Kategorie: das
    // Vorzeichen der Amplitude ist der Inhalt (Grover markiert damit). Deshalb
    // zwei Toene um eine Nulllinie, nicht zwei beliebige Farben.
    var GRID = 'rgba(255,255,255,0.075)';
    var AXIS = 'rgba(255,255,255,0.16)';
    var DIM = 'rgba(148,163,184,0.82)';
    var MUTE = 'rgba(100,116,139,0.92)';
    var TEXT = 'rgba(248,250,252,0.96)';
    var NEG = 'rgba(245,158,11,';   // negative Amplitude (amber)
    var OK = 'rgba(16,185,129,';    // --success
    var BAD = 'rgba(239,68,68,';    // --danger
    var STEEL = 'rgba(226,232,240,';

    var F = 'Inter, system-ui, -apple-system, sans-serif';
    var FM = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

    // ── DOM ───────────────────────────────────────────────────────────────────
    function el(id) { return document.getElementById(id); }
    function on(node, ev, fn) { if (node) node.addEventListener(ev, fn); }
    // Die Einheit steckt in einem eigenen <small>; ein blosses textContent wuerde
    // sie loeschen und ueberall nackte Zahlen hinterlassen.
    function put(id, value, unit, cls) {
        var node = el(id); if (!node) return;
        node.textContent = value;
        if (unit) {
            node.appendChild(document.createTextNode(' '));
            var s = document.createElement('small'); s.textContent = unit; node.appendChild(s);
        }
        if (cls !== undefined) node.className = cls || '';
    }
    // Umschalter mit aria-pressed (Muster .seg aus it-stories.css)
    function seg(root, attr, fn) {
        var btns = S.$$('.seg button', root);
        btns.forEach(function (b) {
            on(b, 'click', function () {
                btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
                fn(b.getAttribute(attr));
            });
        });
    }

    // ── Zahlen ────────────────────────────────────────────────────────────────
    // Trennzeichen nach Seitensprache: /en/ sind eigene statische Dateien mit
    // lang="en" — "0,707" waere dort schlicht falsch.
    var LOC = document.documentElement.lang === 'en' ? 'en-US' : 'de-DE';
    function de(n, d) {
        var s = (Math.abs(n) < 5e-13 ? 0 : n).toFixed(d === undefined ? 3 : d);
        return LOC === 'de-DE' ? s.replace('.', ',') : s;
    }
    function sign(n, d) { return (n >= 0 ? '+' : '−') + de(Math.abs(n), d); }

    // ── Komplexe Zahlen ───────────────────────────────────────────────────────
    // Nur Abb. 2 und 3 brauchen sie wirklich; die uebrigen Zustaende bleiben
    // reell, weil H, X und CNOT keine Imaginaerteile erzeugen.
    function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
    function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
    function cScale(a, k) { return { re: a.re * k, im: a.im * k }; }
    function cAbs(a) { return Math.hypot(a.re, a.im); }
    function cAbs2(a) { return a.re * a.re + a.im * a.im; }
    function cPhase(phi) { return { re: Math.cos(phi), im: Math.sin(phi) }; }

    // ── Zeichen-Helfer ────────────────────────────────────────────────────────
    function roundRect(c, x, y, w, h, r) {
        r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        c.beginPath();
        if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }
    function label(c, txt, x, y, col, size, align, mono) {
        c.fillStyle = col; c.textAlign = align || 'center'; c.textBaseline = 'middle';
        c.font = (mono ? '500 ' : '600 ') + (size || 11) + 'px ' + (mono ? FM : F);
        c.fillText(txt, x, y);
    }
    function dashLine(c, x1, y1, x2, y2, col, dash) {
        c.save(); c.setLineDash(dash || [4, 4]); c.strokeStyle = col; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore();
    }
    function arrow(c, x1, y1, x2, y2, col, w) {
        var a = Math.atan2(y2 - y1, x2 - x1), h = 7;
        c.strokeStyle = col; c.fillStyle = col; c.lineWidth = w || 2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2 - Math.cos(a) * h * 0.6, y2 - Math.sin(a) * h * 0.6); c.stroke();
        c.beginPath();
        c.moveTo(x2, y2);
        c.lineTo(x2 - Math.cos(a - 0.4) * h, y2 - Math.sin(a - 0.4) * h);
        c.lineTo(x2 - Math.cos(a + 0.4) * h, y2 - Math.sin(a + 0.4) * h);
        c.closePath(); c.fill();
    }
    // Balken mit gerundetem Datenende an der Nulllinie (Vorgabe aus dataviz:
    // 4px Radius, 2px Fuge zwischen Nachbarn).
    function bar(c, x, w, zeroY, value, pxPerUnit, fill, stroke) {
        var h = value * pxPerUnit;
        if (Math.abs(h) < 0.6) h = value === 0 ? 0 : (h < 0 ? -0.6 : 0.6);
        if (h === 0) return;
        var y = h >= 0 ? zeroY - h : zeroY;
        roundRect(c, x, y, w, Math.abs(h), 4);
        c.fillStyle = fill; c.fill();
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
    }
    function ampColor(v, alpha) {
        return v >= 0 ? S.primary(alpha) : (NEG + alpha + ')');
    }

    // Ein deterministischer Zufall waere hier falsch — die Statistik in Abb. 4
    // soll echt sein. Math.random reicht dafuer vollkommen.
    function pick(p) { return Math.random() < p ? 0 : 1; }

    var SQ = Math.SQRT1_2;

    // ══════════════════════════════════════════════════════════════════════════
    // Abbildung 1 — Muenze gegen Qubit
    // Links eine Wahrscheinlichkeitsverteilung unter ½·[[1,1],[1,1]],
    // rechts ein Amplitudenvektor unter dem Hadamard-Gatter. Der einzige
    // Unterschied ist das Minuszeichen — und nach zwei Schritten sieht man ihn.
    // ══════════════════════════════════════════════════════════════════════════
    (function () {
        var fig = el('fig-coin'); if (!fig) return;
        var st = S.stage(S.$('canvas', fig));
        var c = st.ctx;

        var n = 0;
        var cls = [1, 0];            // klassische Wahrscheinlichkeiten
        var qm = [1, 0];             // Amplituden (reell)
        var from = { cls: [1, 0], qm: [1, 0] };
        var anim = 1;

        function step() {
            from = { cls: cls.slice(), qm: qm.slice() };
            var m = 0.5 * (cls[0] + cls[1]);
            cls = [m, m];
            qm = [(qm[0] + qm[1]) * SQ, (qm[0] - qm[1]) * SQ];
            n++; anim = 0; sync();
        }
        function reset() {
            from = { cls: cls.slice(), qm: qm.slice() };
            cls = [1, 0]; qm = [1, 0]; n = 0; anim = 0; sync();
        }
        function sync() {
            put('coinN', String(n));
            put('coinCP', de(cls[0] * 100, 1), '%', cls[0] > 0.99 ? 'ok' : '');
            var p0 = qm[0] * qm[0];
            put('coinQP', de(p0 * 100, 1), '%', p0 > 0.99 ? 'ok' : (p0 < 0.01 ? 'no' : 'hi'));
            put('coinAmp', de(qm[0]) + ' / ' + de(qm[1]));
        }

        function lerpArr(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

        function draw() {
            st.clear();
            var w = st.w, h = st.h, pad = 14;
            var t = S.ease(Math.min(anim, 1));
            var pc = lerpArr(from.cls, cls, t);
            var pq = lerpArr(from.qm, qm, t);

            // Zwei Tafeln: schmal untereinander, sonst nebeneinander
            var pw, ph, px = [], py = [];
            if (st.narrow) {
                pw = w - pad * 2; ph = (h - pad * 3) / 2;
                px = [pad, pad]; py = [pad, pad * 2 + ph];
            } else {
                pw = (w - pad * 3) / 2; ph = h - pad * 2;
                px = [pad, pad * 2 + pw]; py = [pad, pad];
            }

            panel(px[0], py[0], pw, ph, 'P', pc, false);
            panel(px[1], py[1], pw, ph, 'ψ', pq, true);
        }

        function panel(x, y, w, h, title, vals, isQ) {
            c.save();
            roundRect(c, x, y, w, h, 12);
            c.fillStyle = 'rgba(255,255,255,0.02)'; c.fill();
            c.strokeStyle = GRID; c.lineWidth = 1; c.stroke();

            label(c, title, x + 14, y + 16, isQ ? S.primary(0.95) : DIM, 13, 'left', true);

            var innerX = x + 18, innerW = w - 36;
            var top = y + 34, bot = y + h - 30;
            var zeroY = isQ ? (top + bot) / 2 : bot;      // Amplituden brauchen eine Nulllinie
            var unit = isQ ? (bot - zeroY) / 1.15 : (bot - top) / 1.15;

            // Nulllinie / Grundlinie
            c.strokeStyle = AXIS; c.lineWidth = 1;
            c.beginPath(); c.moveTo(innerX, zeroY + 0.5); c.lineTo(innerX + innerW, zeroY + 0.5); c.stroke();
            if (isQ) {
                dashLine(c, innerX, zeroY - unit, innerX + innerW, zeroY - unit, GRID);
                dashLine(c, innerX, zeroY + unit, innerX + innerW, zeroY + unit, GRID);
                label(c, '+1', innerX - 6, zeroY - unit, MUTE, 9, 'right', true);
                label(c, '−1', innerX - 6, zeroY + unit, MUTE, 9, 'right', true);
                label(c, '0', innerX - 6, zeroY, MUTE, 9, 'right', true);
            } else {
                dashLine(c, innerX, zeroY - unit, innerX + innerW, zeroY - unit, GRID);
                label(c, '1', innerX - 6, zeroY - unit, MUTE, 9, 'right', true);
                label(c, '0', innerX - 6, zeroY, MUTE, 9, 'right', true);
            }

            var slot = innerW / 2, bw = Math.min(slot * 0.42, 52);
            for (var i = 0; i < 2; i++) {
                var cxp = innerX + slot * (i + 0.5);
                var v = vals[i];
                if (isQ) {
                    // Geisterbalken = Wahrscheinlichkeit (v²), gedeckt dahinter
                    bar(c, cxp - bw / 2 - 2 - bw * 0.34, bw * 0.34, zeroY, -(v * v), unit, STEEL + '0.16)');
                    bar(c, cxp - bw / 2, bw, zeroY, v, unit, ampColor(v, 0.9));
                } else {
                    bar(c, cxp - bw / 2, bw, zeroY, v, unit, S.primary(0.55));
                }
                var val = isQ ? de(v) : de(v, 3);
                label(c, val, cxp, isQ ? (v >= 0 ? zeroY - Math.abs(v) * unit - 12 : zeroY + Math.abs(v) * unit + 12)
                                       : zeroY - v * unit - 12, TEXT, 11, 'center', true);
                label(c, i === 0 ? '|0⟩' : '|1⟩', cxp, y + h - 14, DIM, 12, 'center', true);
            }
            c.restore();
        }

        on(el('coinStep'), 'click', step);
        on(el('coinReset'), 'click', reset);
        sync();
        S.loop(fig, function (dt) { if (anim < 1) anim = Math.min(anim + dt * 2.6, 1); draw(); });
    })();

    // ══════════════════════════════════════════════════════════════════════════
    // Abbildung 2 — Bloch-Kugel
    // Der Zustand ist ein Punkt: x = sinθ cosφ, y = sinθ sinφ, z = cosθ.
    // Gatter sind Drehungen dieses Vektors, nicht Neubelegungen.
    // ══════════════════════════════════════════════════════════════════════════
    (function () {
        var fig = el('fig-bloch'); if (!fig) return;
        var st = S.stage(S.$('canvas', fig));
        var c = st.ctx;
        var rT = el('blochTheta'), rP = el('blochPhi');

        var theta = 0, phi = 0;          // Ziel
        var aT = 0, aP = 0;              // animiert
        var quiet = false;               // verhindert Ruecklauf Regler → Zustand

        function vec(th, ph) {
            return [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
        }
        function fromVec(v) {
            var len = Math.hypot(v[0], v[1], v[2]) || 1;
            var z = S.clamp(v[2] / len, -1, 1);
            theta = Math.acos(z);
            phi = Math.atan2(v[1], v[0]);
            if (phi < 0) phi += Math.PI * 2;
            syncSliders(); sync();
        }
        function syncSliders() {
            quiet = true;
            if (rT) rT.value = String(Math.round(theta * 180 / Math.PI));
            if (rP) rP.value = String(Math.round(phi * 180 / Math.PI) % 360);
            quiet = false;
        }
        function gate(g) {
            var v = vec(theta, phi), x = v[0], y = v[1], z = v[2], k;
            if (g === 'X') { v = [x, -y, -z]; }
            else if (g === 'Z') { v = [-x, -y, z]; }
            else if (g === 'H') { v = [z, -y, x]; }          // Drehung um (x+z)/√2
            else if (g === 'S') { v = [-y, x, z]; }          // 90° um z
            else if (g === 'T') { k = SQ; v = [x * k - y * k, x * k + y * k, z]; }
            fromVec(v);
        }
        function sync() {
            var a = Math.cos(theta / 2), b = Math.sin(theta / 2);
            var p0 = a * a;
            put('blochA', de(a), '', p0 > 0.999 ? 'hi' : '');
            put('blochB', de(b));
            put('blochP0', de(p0 * 100, 1), '%', p0 > 0.99 ? 'ok' : (p0 < 0.01 ? 'no' : (Math.abs(p0 - 0.5) < 0.02 ? 'warn' : '')));
            // Ohne β gibt es keine Phase — das darf nicht als "0°" dastehen.
            put('blochPhase', b < 1e-6 ? '—' : String(Math.round(phi * 180 / Math.PI) % 360), b < 1e-6 ? '' : '°', b < 1e-6 ? 'no' : '');
        }

        // Projektion: erst um z drehen (Blickazimut), dann kippen.
        var AZ = -0.55, TILT = 0.34;
        function proj(v, cx, cy, R) {
            var x1 = v[0] * Math.cos(AZ) - v[1] * Math.sin(AZ);
            var y1 = v[0] * Math.sin(AZ) + v[1] * Math.cos(AZ);
            var z1 = v[2];
            return {
                x: cx + x1 * R,
                y: cy - (z1 * Math.cos(TILT) - y1 * Math.sin(TILT)) * R,
                d: y1 * Math.cos(TILT) + z1 * Math.sin(TILT)   // Tiefe: >0 = vorne
            };
        }
        function ring(axis, cx, cy, R, col, width) {
            c.strokeStyle = col; c.lineWidth = width || 1;
            c.beginPath();
            for (var i = 0; i <= 72; i++) {
                var a = i / 72 * Math.PI * 2, v;
                if (axis === 'z') v = [Math.cos(a), Math.sin(a), 0];
                else if (axis === 'x') v = [0, Math.cos(a), Math.sin(a)];
                else v = [Math.cos(a), 0, Math.sin(a)];
                var p = proj(v, cx, cy, R);
                if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
            }
            c.closePath(); c.stroke();
        }

        function draw() {
            st.clear();
            var w = st.w, h = st.h;
            var sphereH = st.narrow ? h * 0.68 : h;
            var R = Math.min(w * (st.narrow ? 0.34 : 0.30), sphereH * 0.40);
            var cx = st.narrow ? w / 2 : w * 0.40, cy = sphereH / 2 + 6;

            // Kugelkoerper
            var grad = c.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
            grad.addColorStop(0, 'rgba(255,255,255,0.045)');
            grad.addColorStop(1, 'rgba(255,255,255,0.012)');
            c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fillStyle = grad; c.fill();
            c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 1; c.stroke();

            ring('z', cx, cy, R, GRID, 1);       // Aequator
            ring('y', cx, cy, R, GRID, 1);       // Meridian

            // Achsen
            [['z', [0, 0, 1], '|0⟩'], ['z-', [0, 0, -1], '|1⟩'],
             ['x', [1, 0, 0], 'x'], ['y', [0, 1, 0], 'y']].forEach(function (ax) {
                var p = proj(ax[1], cx, cy, R * 1.14);
                var o = proj([0, 0, 0], cx, cy, R);
                dashLine(c, o.x, o.y, p.x, p.y, 'rgba(255,255,255,0.18)', [3, 3]);
                label(c, ax[2], p.x, p.y + (ax[1][2] > 0 ? -9 : (ax[1][2] < 0 ? 9 : -8)), MUTE, 11, 'center', true);
            });

            // Zustandsvektor
            var v = vec(aT, aP);
            var p = proj(v, cx, cy, R);
            var o = { x: cx, y: cy };
            // Fusspunkt auf dem Aequator: zeigt φ
            var pe = proj([v[0], v[1], 0], cx, cy, R);
            dashLine(c, p.x, p.y, pe.x, pe.y, S.primary(0.35), [3, 3]);
            dashLine(c, o.x, o.y, pe.x, pe.y, S.primary(0.28), [3, 3]);

            arrow(c, o.x, o.y, p.x, p.y, S.primary(p.d > 0 ? 0.98 : 0.5), 2.4);
            c.beginPath(); c.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
            c.fillStyle = S.primary(1); c.fill();
            c.strokeStyle = 'rgba(15,18,26,0.9)'; c.lineWidth = 2; c.stroke();

            // θ-Bogen an der z-Achse
            c.strokeStyle = S.primary(0.5); c.lineWidth = 1.5;
            c.beginPath();
            for (var i = 0; i <= 24; i++) {
                var a = aT * i / 24;
                var q = proj(vec(a, aP), cx, cy, R * 0.30);
                if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y);
            }
            c.stroke();
            var mid = proj(vec(aT / 2, aP), cx, cy, R * 0.42);
            label(c, 'θ', mid.x, mid.y, S.primary(0.95), 11, 'center', true);

            // Messachse: Wahrscheinlichkeitsbalken rechts (bzw. unten)
            var bx, by, bw2, bh;
            if (st.narrow) { bx = w * 0.18; by = sphereH + 12; bw2 = w * 0.64; bh = h - by - 30; }
            else { bx = w * 0.74; by = 30; bw2 = w * 0.20; bh = h - 60; }
            probBars(bx, by, bw2, bh, Math.cos(aT / 2) * Math.cos(aT / 2));

            // Phasenzeiger fuer β
            var b = Math.sin(aT / 2);
            var phx = st.narrow ? w * 0.5 : w * 0.40, phy = st.narrow ? sphereH + 4 : h - 26;
            if (!st.narrow) {
                var pr = 20;
                c.strokeStyle = GRID; c.lineWidth = 1;
                c.beginPath(); c.arc(phx, phy, pr, 0, Math.PI * 2); c.stroke();
                dashLine(c, phx - pr, phy, phx + pr, phy, GRID);
                dashLine(c, phx, phy - pr, phx, phy + pr, GRID);
                if (b > 1e-6) {
                    arrow(c, phx, phy, phx + Math.cos(aP) * pr * b, phy - Math.sin(aP) * pr * b, NEG + '0.95)', 2);
                }
                label(c, 'β', phx + pr + 12, phy, MUTE, 11, 'left', true);
            }
        }

        function probBars(x, y, w, h, p0) {
            var slotH = (h - 16) / 2;
            [[p0, '|0⟩'], [1 - p0, '|1⟩']].forEach(function (row, i) {
                var yy = y + i * (slotH + 16);
                roundRect(c, x, yy, w, slotH * 0.5, 4);
                c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill();
                if (row[0] > 0.001) {
                    roundRect(c, x, yy, Math.max(w * row[0], 3), slotH * 0.5, 4);
                    c.fillStyle = S.primary(0.85); c.fill();
                }
                label(c, row[1], x, yy - 9, DIM, 11, 'left', true);
                label(c, de(row[0] * 100, 1) + ' %', x + w, yy - 9, TEXT, 11, 'right', true);
            });
        }

        on(rT, 'input', function () { if (quiet) return; theta = (+rT.value) * Math.PI / 180; sync(); });
        on(rP, 'input', function () { if (quiet) return; phi = (+rP.value) * Math.PI / 180; sync(); });
        S.$$('.fig-ctrl .btn[data-gate]', fig).forEach(function (b) {
            on(b, 'click', function () { gate(b.getAttribute('data-gate')); });
        });

        sync();
        S.loop(fig, function (dt) {
            // Winkel weich nachziehen; φ ueber den kuerzesten Weg, sonst dreht der
            // Punkt bei 359° → 1° einmal komplett rueckwaerts um die Kugel.
            var k = Math.min(dt * 9, 1);
            aT += (theta - aT) * k;
            var d = phi - aP;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            aP += d * k;
            draw();
        });
    })();

    // ══════════════════════════════════════════════════════════════════════════
    // Abbildung 3 — Mach-Zehnder
    // D₀ = (1 + e^{iφ})/2, D₁ = (1 − e^{iφ})/2. Erst addieren, dann quadrieren —
    // in genau dieser Reihenfolge steckt der ganze Effekt.
    // ══════════════════════════════════════════════════════════════════════════
    (function () {
        var fig = el('fig-mz'); if (!fig) return;
        var st = S.stage(S.$('canvas', fig));
        var c = st.ctx;
        var rPhi = el('mzPhi');

        var phi = 0, watch = false, aPhi = 0, flow = 0;

        function amps() {
            var A = { re: 0.5, im: 0 };                       // Weg A → D₀
            var B = cScale(cPhase(phi), 0.5);                 // Weg B → D₀ (mit Phase)
            return { A: A, B: B, d0: cAdd(A, B), d1: cSub(A, B) };
        }
        function sync() {
            var a = amps();
            var p0 = watch ? 0.5 : cAbs2(a.d0);
            var p1 = watch ? 0.5 : cAbs2(a.d1);
            put('mzD0', de(p0 * 100, 1), '%', p0 > 0.99 ? 'ok' : (p0 < 0.01 ? 'no' : (watch ? 'warn' : '')));
            put('mzD1', de(p1 * 100, 1), '%', p1 > 0.99 ? 'ok' : (p1 < 0.01 ? 'no' : (watch ? 'warn' : '')));
            put('mzSum', watch ? '—' : de(cAbs(a.d0)), '', watch ? 'no' : 'hi');
            put('mzVis', watch ? '0' : '100', '%', watch ? 'no' : 'ok');
        }

        function draw() {
            st.clear();
            var w = st.w, h = st.h;
            var a = amps();
            var p0 = watch ? 0.5 : cAbs2(a.d0);

            var schemeW = st.narrow ? w : w * 0.60;
            var schemeH = st.narrow ? h * 0.56 : h;
            scheme(0, 0, schemeW, schemeH, p0);
            if (st.narrow) phasors(0, schemeH, w, h - schemeH, a, p0);
            else phasors(schemeW, 0, w - schemeW, h, a, p0);
        }

        function scheme(x, y, w, h, p0) {
            var m = 26;
            var x0 = x + m, x1 = x + w - m * 1.9;
            var yTop = y + h * 0.30, yBot = y + h * 0.66;
            var bs1x = x0 + (x1 - x0) * 0.16, bs2x = x0 + (x1 - x0) * 0.76;
            var psx = x0 + (x1 - x0) * 0.46;

            // Wege
            c.lineWidth = 2; c.lineCap = 'round';
            c.strokeStyle = 'rgba(255,255,255,0.14)';
            c.beginPath();
            c.moveTo(x0, yTop); c.lineTo(x1, yTop);
            c.moveTo(bs1x, yTop); c.lineTo(bs1x, yBot); c.lineTo(bs2x, yBot); c.lineTo(bs2x, yTop);
            c.stroke();

            // Strahlteiler
            [bs1x, bs2x].forEach(function (bx) {
                c.strokeStyle = STEEL + '0.72)'; c.lineWidth = 3;
                c.beginPath(); c.moveTo(bx - 9, yTop + 9); c.lineTo(bx + 9, yTop - 9); c.stroke();
            });
            // Spiegel-Ecken
            c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 2.5;
            c.beginPath(); c.moveTo(bs1x - 8, yBot + 8); c.lineTo(bs1x + 8, yBot - 8);
            c.moveTo(bs2x - 8, yBot - 8); c.lineTo(bs2x + 8, yBot + 8); c.stroke();

            // Phasenschieber im unteren Weg
            roundRect(c, psx - 16, yBot - 11, 32, 22, 5);
            c.fillStyle = NEG + '0.16)'; c.fill();
            c.strokeStyle = NEG + '0.6)'; c.lineWidth = 1.2; c.stroke();
            label(c, 'φ', psx, yBot, NEG + '0.98)', 12, 'center', true);
            label(c, Math.round(aPhi * 180 / Math.PI) + '°', psx, yBot + 22, MUTE, 10, 'center', true);

            // Beobachter im oberen Weg
            if (watch) {
                var wx = bs1x + (bs2x - bs1x) * 0.5;
                c.beginPath(); c.arc(wx, yTop, 9, 0, Math.PI * 2);
                c.fillStyle = BAD + '0.18)'; c.fill();
                c.strokeStyle = BAD + '0.75)'; c.lineWidth = 1.4; c.stroke();
                c.beginPath(); c.arc(wx, yTop, 3, 0, Math.PI * 2); c.fillStyle = BAD + '0.95)'; c.fill();
            }

            // Laufendes Teilchen auf beiden Wegen
            var tt = flow % 1;
            var puck = function (px, py, col) {
                c.beginPath(); c.arc(px, py, 3.4, 0, Math.PI * 2); c.fillStyle = col; c.fill();
            };
            var segTop = x0 + (x1 - x0) * tt;
            puck(segTop, yTop, S.primary(0.9));
            if (segTop > bs1x) {
                var tb = (segTop - bs1x) / (x1 - bs1x);
                puck(bs1x + (bs2x - bs1x) * Math.min(tb * 1.25, 1), yBot, NEG + '0.9)');
            }

            // Detektoren
            var dx = x1 + 12;
            [[yTop, p0, '0'], [yBot, 1 - p0, '1']].forEach(function (d) {
                var lit = d[1];
                roundRect(c, dx, d[0] - 13, 26, 26, 6);
                c.fillStyle = 'rgba(255,255,255,0.04)'; c.fill();
                c.strokeStyle = GRID; c.lineWidth = 1; c.stroke();
                if (lit > 0.002) {
                    roundRect(c, dx + 3, d[0] - 10, 20, 20, 4);
                    c.fillStyle = S.primary(0.15 + lit * 0.8); c.fill();
                }
                label(c, 'D' + (d[2] === '0' ? '₀' : '₁'), dx + 13, d[0] + 24, DIM, 10, 'center', true);
                label(c, de(lit * 100, 0) + '%', dx + 13, d[0] - 24, lit > 0.5 ? TEXT : MUTE, 10, 'center', true);
            });
            // D₁ liegt am unteren Ausgang des zweiten Strahlteilers
            c.strokeStyle = 'rgba(255,255,255,0.14)'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(bs2x, yBot); c.lineTo(dx, yBot); c.stroke();
        }

        function phasors(x, y, w, h, a, p0) {
            var cx = x + w / 2, cy = y + h * 0.44;
            var R = Math.min(w, h) * 0.30;

            c.strokeStyle = GRID; c.lineWidth = 1;
            c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
            dashLine(c, cx - R * 1.2, cy, cx + R * 1.2, cy, GRID);
            dashLine(c, cx, cy - R * 1.2, cx, cy + R * 1.2, GRID);

            if (watch) {
                label(c, '?', cx, cy, BAD + '0.7)', 26, 'center', true);
            } else {
                var sc = R / 0.5;
                // Zeiger A vom Ursprung, Zeiger B daran angehaengt: die Summe ist
                // sichtbar die Spitze der Kette, nicht eine dritte Groesse.
                var ax = cx + a.A.re * sc, ay = cy - a.A.im * sc;
                var sx = cx + a.d0.re * sc, sy = cy - a.d0.im * sc;
                arrow(c, cx, cy, ax, ay, S.primary(0.85), 2);
                arrow(c, ax, ay, sx, sy, NEG + '0.85)', 2);
                c.strokeStyle = STEEL + '0.5)'; c.lineWidth = 2; c.setLineDash([]);
                c.beginPath(); c.moveTo(cx, cy); c.lineTo(sx, sy); c.stroke();
                c.beginPath(); c.arc(sx, sy, 4, 0, Math.PI * 2); c.fillStyle = STEEL + '0.95)'; c.fill();
                label(c, de(cAbs(a.d0), 2), sx + 10, sy - 10, TEXT, 11, 'left', true);
            }
            label(c, 'Σ', cx, y + h - 16, MUTE, 12, 'center', true);
        }

        on(rPhi, 'input', function () { phi = (+rPhi.value) * Math.PI / 180; sync(); });
        seg(fig, 'data-watch', function (v) { watch = v === '1'; sync(); });
        sync();
        S.loop(fig, function (dt) {
            var d = phi - aPhi;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            aPhi += d * Math.min(dt * 10, 1);
            flow += dt * 0.45;
            draw();
        });
    })();

    // ══════════════════════════════════════════════════════════════════════════
    // Abbildung 4 — Messung
    // Echte Zufallsentscheidungen gegen cos²(θ/2), plus Standardfehler.
    // ══════════════════════════════════════════════════════════════════════════
    (function () {
        var fig = el('fig-meas'); if (!fig) return;
        var st = S.stage(S.$('canvas', fig));
        var c = st.ctx;
        var rTh = el('measTheta');

        var theta = 60 * Math.PI / 180;
        var n0 = 0, n1 = 0, pending = 0;
        var recent = [];                 // letzte Einzelergebnisse fuer den Streifen

        function p0() { var a = Math.cos(theta / 2); return a * a; }
        function shoot(k) { pending += k; }
        function drain(max) {
            var did = 0;
            while (pending > 0 && did < max) {
                var r = pick(p0());
                if (r === 0) n0++; else n1++;
                recent.push(r); if (recent.length > 140) recent.shift();
                pending--; did++;
            }
            if (did) sync();
        }
        function reset() { n0 = 0; n1 = 0; pending = 0; recent = []; sync(); }
        function sync() {
            var N = n0 + n1, p = p0();
            put('measN', N.toLocaleString(LOC));
            put('measExp', de(p * 100, 1), '%', 'hi');
            if (!N) { put('measGot', '—', '%', ''); put('measErr', '—', '', ''); return; }
            var got = n0 / N;
            put('measGot', de(got * 100, 1), '%', '');
            var sd = Math.sqrt(Math.max(p * (1 - p), 1e-12) / N);
            var z = (got - p) / sd;
            // Ueber 3σ ist bei echtem Zufall selten, aber nicht falsch — deshalb
            // "warn" statt "no": es ist ein Hinweis, kein Fehler.
            put('measErr', sign(z, 1) + ' σ', '', Math.abs(z) > 3 ? 'warn' : 'ok');
        }

        function draw() {
            st.clear();
            var w = st.w, h = st.h, pad = 16;
            var N = n0 + n1, p = p0();

            var stripH = 46;
            var top = pad + 14, bot = h - pad - stripH - 22;
            var innerX = pad + 26, innerW = w - innerX - pad;

            // Raster + erwartete Linie
            for (var g = 0; g <= 4; g++) {
                var gy = bot - (bot - top) * g / 4;
                dashLine(c, innerX, gy, innerX + innerW, gy, GRID);
                label(c, (g * 25) + '%', innerX - 8, gy, MUTE, 9, 'right', true);
            }
            var ey = bot - (bot - top) * p;
            c.strokeStyle = STEEL + '0.55)'; c.lineWidth = 1.5;
            c.setLineDash([6, 4]);
            c.beginPath(); c.moveTo(innerX, ey); c.lineTo(innerX + innerW, ey); c.stroke();
            c.setLineDash([]);
            label(c, de(p * 100, 1) + '%', innerX + innerW, ey - 10, STEEL + '0.9)', 10, 'right', true);

            // Balken
            var slot = innerW / 2, bw = Math.min(slot * 0.5, 84);
            [[n0, '|0⟩', p], [n1, '|1⟩', 1 - p]].forEach(function (row, i) {
                var cx = innerX + slot * (i + 0.5);
                var frac = N ? row[0] / N : 0;
                var bh = (bot - top) * frac;
                roundRect(c, cx - bw / 2, top, bw, bot - top, 4);
                c.fillStyle = 'rgba(255,255,255,0.035)'; c.fill();
                if (bh > 0.5) {
                    roundRect(c, cx - bw / 2, bot - bh, bw, bh, 4);
                    c.fillStyle = S.primary(0.85); c.fill();
                }
                // Sollmarke je Balken
                var my = bot - (bot - top) * row[2];
                c.strokeStyle = STEEL + '0.75)'; c.lineWidth = 2;
                c.beginPath(); c.moveTo(cx - bw / 2 - 4, my); c.lineTo(cx + bw / 2 + 4, my); c.stroke();

                label(c, N ? de(frac * 100, 1) + '%' : '—', cx, top - 10, TEXT, 12, 'center', true);
                label(c, row[1], cx, bot + 14, DIM, 12, 'center', true);
                label(c, N ? row[0].toLocaleString(LOC) : '0', cx, bot + 30, MUTE, 10, 'center', true);
            });

            // Streifen der letzten Einzelergebnisse
            var sy = h - pad - stripH;
            label(c, '↓', innerX - 8, sy + stripH / 2, MUTE, 10, 'right', true);
            var tickW = Math.max(innerW / 140, 1.5);
            for (var i = 0; i < recent.length; i++) {
                var tx = innerX + i * (innerW / 140);
                var up = recent[i] === 0;
                c.fillStyle = up ? S.primary(0.75) : NEG + '0.7)';
                var thh = stripH * 0.42;
                c.fillRect(tx, up ? sy : sy + stripH - thh, Math.max(tickW - 1, 1), thh);
            }
            dashLine(c, innerX, sy + stripH / 2, innerX + innerW, sy + stripH / 2, GRID);
            label(c, '|0⟩', innerX + innerW + 2, sy + stripH * 0.22, MUTE, 9, 'left', true);
            label(c, '|1⟩', innerX + innerW + 2, sy + stripH * 0.78, MUTE, 9, 'left', true);
        }

        on(rTh, 'input', function () { theta = (+rTh.value) * Math.PI / 180; sync(); });
        on(el('meas1'), 'click', function () { shoot(1); });
        on(el('meas100'), 'click', function () { shoot(100); });
        on(el('meas1000'), 'click', function () { shoot(1000); });
        on(el('measReset'), 'click', reset);
        sync();
        // Portionsweise abarbeiten: so sieht man die Verteilung entstehen,
        // statt dass 1000 Shots in einem Frame verschwinden.
        S.loop(fig, function () { drain(24); draw(); });
    })();

    // ══════════════════════════════════════════════════════════════════════════
    // Abbildung 5 — Bell-Zustand
    // Zustandsvektor ueber |00⟩,|01⟩,|10⟩,|11⟩ (Index = q₀·2 + q₁).
    // Verschraenkungsentropie aus der reduzierten Dichtematrix von q₀.
    // ══════════════════════════════════════════════════════════════════════════
    (function () {
        var fig = el('fig-bell'); if (!fig) return;
        var st = S.stage(S.$('canvas', fig));
        var c = st.ctx;

        var KET = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
        var psi = [1, 0, 0, 0], shown = [1, 0, 0, 0];
        var ops = [], same = 0, diff = 0, last = null, collapsed = false;

        function apply(op) {
            var p = psi.slice();
            if (op === 'H0') {
                psi[0] = (p[0] + p[2]) * SQ; psi[2] = (p[0] - p[2]) * SQ;
                psi[1] = (p[1] + p[3]) * SQ; psi[3] = (p[1] - p[3]) * SQ;
            } else if (op === 'CNOT') {
                psi[2] = p[3]; psi[3] = p[2];
            } else if (op === 'X1') {
                psi[0] = p[1]; psi[1] = p[0]; psi[2] = p[3]; psi[3] = p[2];
            }
            ops.push(op); if (ops.length > 6) ops.shift();
            collapsed = false; sync();
        }
        function measure() {
            var r = Math.random(), acc = 0, idx = 3;
            for (var i = 0; i < 4; i++) { acc += psi[i] * psi[i]; if (r < acc) { idx = i; break; } }
            psi = [0, 0, 0, 0]; psi[idx] = 1;
            last = idx; collapsed = true;
            if (idx === 0 || idx === 3) same++; else diff++;
            sync();
        }
        function reset() { psi = [1, 0, 0, 0]; ops = []; same = 0; diff = 0; last = null; collapsed = false; sync(); }

        // Reduzierte Dichtematrix von q₀ (reelle Amplituden):
        //   ρ00 = a00²+a01² , ρ11 = a10²+a11² , ρ01 = a00·a10 + a01·a11
        function entropy() {
            var r00 = psi[0] * psi[0] + psi[1] * psi[1];
            var r11 = psi[2] * psi[2] + psi[3] * psi[3];
            var r01 = psi[0] * psi[2] + psi[1] * psi[3];
            var det = r00 * r11 - r01 * r01;
            var root = Math.sqrt(Math.max(0.25 - det, 0));
            var l1 = 0.5 + root, l2 = 0.5 - root;
            function term(l) { return l > 1e-12 ? -l * Math.log(l) / Math.LN2 : 0; }
            return term(l1) + term(l2);
        }
        // Produktzustand ⟺ a00·a11 − a01·a10 = 0
        function separable() { return Math.abs(psi[0] * psi[3] - psi[1] * psi[2]) < 1e-9; }

        function sync() {
            var e = entropy();
            put('bellEnt', de(e, 2), '', e > 0.99 ? 'ok' : (e > 0.01 ? 'warn' : 'no'));
            put('bellLast', last === null ? '—' : KET[last], '', last === null ? '' : 'hi');
            put('bellCorr', same + ' / ' + diff);
            var sep = separable();
            put('bellSep', sep ? '✓' : '✗', '', sep ? 'ok' : 'no');
        }

        function draw() {
            st.clear();
            var w = st.w, h = st.h, pad = 16;
            var opH = 34;
            var top = pad + opH + 16, bot = h - pad - 26;
            var innerX = pad + 30, innerW = w - innerX - pad;
            var zeroY = (top + bot) / 2;
            var unit = (bot - zeroY) / 1.12;

            // Gatterfolge oben
            var gx = innerX;
            for (var i = 0; i < ops.length; i++) {
                var sym = ops[i] === 'H0' ? 'H' : (ops[i] === 'CNOT' ? '⊕' : 'X');
                roundRect(c, gx, pad, 30, opH - 6, 6);
                c.fillStyle = S.primary(0.14); c.fill();
                c.strokeStyle = S.primary(0.4); c.lineWidth = 1; c.stroke();
                label(c, sym, gx + 15, pad + (opH - 6) / 2, S.primary(0.98), 13, 'center', true);
                gx += 36;
            }
            if (collapsed) {
                roundRect(c, gx, pad, 30, opH - 6, 6);
                c.fillStyle = OK + '0.14)'; c.fill();
                c.strokeStyle = OK + '0.45)'; c.lineWidth = 1; c.stroke();
                label(c, '⏱', gx + 15, pad + (opH - 6) / 2, OK + '0.95)', 12, 'center', true);
            }

            // Achse
            c.strokeStyle = AXIS; c.lineWidth = 1;
            c.beginPath(); c.moveTo(innerX, zeroY + 0.5); c.lineTo(innerX + innerW, zeroY + 0.5); c.stroke();
            [[1, '+1'], [-1, '−1']].forEach(function (t) {
                dashLine(c, innerX, zeroY - t[0] * unit, innerX + innerW, zeroY - t[0] * unit, GRID);
                label(c, t[1], innerX - 8, zeroY - t[0] * unit, MUTE, 9, 'right', true);
            });
            label(c, '0', innerX - 8, zeroY, MUTE, 9, 'right', true);

            var slot = innerW / 4, bw = Math.min(slot * 0.46, 58);
            for (var k = 0; k < 4; k++) {
                var cx = innerX + slot * (k + 0.5);
                var v = shown[k];
                bar(c, cx - bw / 2 - 2 - bw * 0.32, bw * 0.32, zeroY, -(v * v), unit, STEEL + '0.16)');
                bar(c, cx - bw / 2, bw, zeroY, v, unit, ampColor(v, 0.9),
                    last === k ? OK + '0.9)' : null);
                if (Math.abs(v) > 0.004) {
                    label(c, de(v, 3), cx, v >= 0 ? zeroY - Math.abs(v) * unit - 12 : zeroY + Math.abs(v) * unit + 12,
                        TEXT, 11, 'center', true);
                }
                label(c, KET[k], cx, bot + 16, last === k ? OK + '0.95)' : DIM, 12, 'center', true);
            }
        }

        S.$$('.fig-ctrl .btn[data-op]', fig).forEach(function (b) {
            on(b, 'click', function () { apply(b.getAttribute('data-op')); });
        });
        on(el('bellMeasure'), 'click', measure);
        on(el('bellReset'), 'click', reset);
        sync();
        S.loop(fig, function (dt) {
            var k = Math.min(dt * 7, 1);
            for (var i = 0; i < 4; i++) shown[i] += (psi[i] - shown[i]) * k;
            draw();
        });
    })();

    // ══════════════════════════════════════════════════════════════════════════
    // Abbildung 6 — CHSH
    // S = |E(a,b) − E(a,b′) + E(a′,b) + E(a′,b′)| mit E(x,y) = cos(2(x−y)).
    // Bei gleichmaessigem Abstand Δ ergibt das S(Δ) = 3cos(2Δ) − cos(6Δ).
    // ══════════════════════════════════════════════════════════════════════════
    (function () {
        var fig = el('fig-chsh'); if (!fig) return;
        var st = S.stage(S.$('canvas', fig));
        var c = st.ctx;
        var rA = el('chshAngle');

        var delta = 45 * Math.PI / 180, aDelta = delta;
        var TSIRELSON = 2 * Math.SQRT2;

        function sOf(d) { return Math.abs(3 * Math.cos(2 * d) - Math.cos(6 * d)); }
        function sync() {
            var s = sOf(delta);
            put('chshQ', de(s, 3), '', s > 2.0001 ? 'ok' : 'no');
            put('chshC', de(2, 3));
            var v = (s - 2) / 2 * 100;
            put('chshV', (v > 0 ? '+' : '') + de(v, 1), '%', v > 0 ? 'hi' : 'no');
            put('chshOk', s > 2.0001 ? '✓' : '✗', '', s > 2.0001 ? 'ok' : 'no');
        }

        function draw() {
            st.clear();
            var w = st.w, h = st.h, pad = 16;
            var plotW = st.narrow ? w - pad * 2 : w * 0.62;
            var px = pad + 30, py = pad + 12;
            var pw = plotW - 40, ph = (st.narrow ? h * 0.62 : h) - py - 34;

            var yMin = 0, yMax = 3;
            function Y(v) { return py + ph - (v - yMin) / (yMax - yMin) * ph; }
            function X(d) { return px + d / (Math.PI / 2) * pw; }

            // Raster
            for (var g = 0; g <= 3; g++) {
                dashLine(c, px, Y(g), px + pw, Y(g), GRID);
                label(c, de(g, 0), px - 8, Y(g), MUTE, 9, 'right', true);
            }
            for (var t = 0; t <= 90; t += 22.5) {
                var xx = X(t * Math.PI / 180);
                dashLine(c, xx, py, xx, py + ph, GRID);
                label(c, de(t, t % 45 === 0 ? 0 : 1) + '°', xx, py + ph + 14, MUTE, 9, 'center', true);
            }

            // Verbotene Zone oberhalb der klassischen Grenze
            c.save();
            c.beginPath(); c.rect(px, Y(TSIRELSON) - 2, pw, Y(2) - Y(TSIRELSON) + 2); c.clip();
            c.fillStyle = OK + '0.05)'; c.fillRect(px, py, pw, ph);
            c.restore();

            // Kurve
            c.strokeStyle = S.primary(0.95); c.lineWidth = 2; c.lineJoin = 'round';
            c.beginPath();
            for (var i = 0; i <= 180; i++) {
                var d = i / 180 * Math.PI / 2;
                var xx2 = X(d), yy = Y(sOf(d));
                if (i === 0) c.moveTo(xx2, yy); else c.lineTo(xx2, yy);
            }
            c.stroke();

            // Grenzen
            c.strokeStyle = NEG + '0.85)'; c.lineWidth = 2; c.setLineDash([6, 4]);
            c.beginPath(); c.moveTo(px, Y(2)); c.lineTo(px + pw, Y(2)); c.stroke();
            c.setLineDash([2, 4]); c.strokeStyle = OK + '0.7)';
            c.beginPath(); c.moveTo(px, Y(TSIRELSON)); c.lineTo(px + pw, Y(TSIRELSON)); c.stroke();
            c.setLineDash([]);
            label(c, '2', px + pw + 4, Y(2), NEG + '0.95)', 10, 'left', true);
            label(c, '2√2', px + pw + 4, Y(TSIRELSON) - 9, OK + '0.9)', 10, 'left', true);

            // Aktueller Punkt
            var sv = sOf(aDelta), cxp = X(aDelta), cyp = Y(sv);
            dashLine(c, cxp, py + ph, cxp, cyp, S.primary(0.4));
            c.beginPath(); c.arc(cxp, cyp, 5.5, 0, Math.PI * 2);
            c.fillStyle = sv > 2 ? OK + '0.98)' : NEG + '0.95)'; c.fill();
            c.strokeStyle = 'rgba(15,18,26,0.9)'; c.lineWidth = 2; c.stroke();
            label(c, de(sv, 3), cxp, cyp - 15, TEXT, 12, 'center', true);
            label(c, 'S', px - 8, py - 4, MUTE, 11, 'right', true);
            label(c, 'Δ', px + pw + 6, py + ph + 14, MUTE, 11, 'left', true);

            // Messrichtungen als Winkelscheibe
            var dx, dy, R;
            if (st.narrow) { dx = w / 2; dy = py + ph + 34 + (h - (py + ph + 34)) / 2; R = Math.min(w * 0.16, (h - py - ph - 40) * 0.42); }
            else { dx = px + pw + 40 + (w - px - pw - 40) / 2; dy = h / 2; R = Math.min((w - px - pw - 56) * 0.42, h * 0.30); }
            dial(dx, dy, R);
        }

        function dial(cx, cy, R) {
            c.strokeStyle = GRID; c.lineWidth = 1;
            c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
            // a = 0, a′ = 2Δ (Seite A) · b = Δ, b′ = 3Δ (Seite B)
            var dirs = [
                [0, S.primary(0.95), 'a'],
                [2 * aDelta, S.primary(0.45), "a′"],
                [aDelta, NEG + '0.95)', 'b'],
                [3 * aDelta, NEG + '0.45)', "b′"]
            ];
            dirs.forEach(function (d) {
                var ang = -d[0];
                var ex = cx + Math.cos(ang) * R, ey = cy + Math.sin(ang) * R;
                arrow(c, cx, cy, ex, ey, d[1], 2);
                label(c, d[2], cx + Math.cos(ang) * (R + 13), cy + Math.sin(ang) * (R + 13), d[1], 10, 'center', true);
            });
            c.beginPath(); c.arc(cx, cy, 3, 0, Math.PI * 2); c.fillStyle = MUTE; c.fill();
        }

        on(rA, 'input', function () { delta = (+rA.value) * Math.PI / 180; sync(); });
        on(el('chshOpt'), 'click', function () {
            // 22,5° ist das Maximum von S(Δ) — deshalb hat der Regler
            // Schrittweite 0,5 und nicht 1.
            if (rA) rA.value = '22.5';
            delta = 22.5 * Math.PI / 180;
            sync();
        });
        sync();
        S.loop(fig, function (dt) { aDelta += (delta - aDelta) * Math.min(dt * 9, 1); draw(); });
    })();

    // ══════════════════════════════════════════════════════════════════════════
    // Abbildung 7 — Grover
    // Orakel dreht das Vorzeichen des Treffers, Diffusion spiegelt am Mittelwert.
    // Beides exakt gerechnet; die Kurve daneben ist sin²((2k+1)·asin(1/√N)).
    // ══════════════════════════════════════════════════════════════════════════
    (function () {
        var fig = el('fig-grover'); if (!fig) return;
        var st = S.stage(S.$('canvas', fig));
        var c = st.ctx;
        var rN = el('grovN');

        var nq = 4, N = 16, target = 6;
        var amp = [], shown = [], iter = 0, half = false;

        function build() {
            N = Math.pow(2, nq);
            target = Math.floor(N * 0.375);
            amp = []; shown = [];
            for (var i = 0; i < N; i++) { amp.push(1 / Math.sqrt(N)); shown.push(1 / Math.sqrt(N)); }
            iter = 0; half = false; sync();
        }
        function oracle() { amp[target] = -amp[target]; half = true; sync(); }
        function diffusion() {
            var m = 0, i;
            for (i = 0; i < N; i++) m += amp[i];
            m /= N;
            for (i = 0; i < N; i++) amp[i] = 2 * m - amp[i];
            if (half) { iter++; half = false; }
            sync();
        }
        function optimal() { return Math.max(Math.floor(Math.PI / 4 * Math.sqrt(N)), 1); }
        function sync() {
            var p = amp[target] * amp[target];
            put('grovNum', String(N));
            put('grovIt', String(iter));
            put('grovP', de(p * 100, 1), '%', p > 0.8 ? 'ok' : (p > 0.3 ? 'warn' : 'no'));
            put('grovOpt', String(optimal()), '', 'hi');
        }
        // Theoretischer Verlauf: nach k Iterationen ist die Trefferamplitude
        // sin((2k+1)·θ) mit sinθ = 1/√N.
        function pAfter(k) {
            var th = Math.asin(1 / Math.sqrt(N));
            var s = Math.sin((2 * k + 1) * th);
            return s * s;
        }

        function draw() {
            st.clear();
            var w = st.w, h = st.h, pad = 16;
            var curveH = st.narrow ? h * 0.30 : h * 0.32;
            var barsH = h - curveH - pad;

            bars(pad, pad, w - pad * 2, barsH - pad);
            curve(pad, barsH, w - pad * 2, curveH - 6);
        }

        function bars(x, y, w, h) {
            var innerX = x + 26, innerW = w - 26;
            var top = y, bot = y + h - 18;
            var zeroY = (top + bot) / 2;
            // Skala folgt dem groessten Balken, mit Boden bei 0,75 —
            // sonst zappelt die Achse bei jeder Iteration.
            var unit = (bot - zeroY) / Math.max(0.75, maxAbs() * 1.12);

            c.strokeStyle = AXIS; c.lineWidth = 1;
            c.beginPath(); c.moveTo(innerX, zeroY + 0.5); c.lineTo(innerX + innerW, zeroY + 0.5); c.stroke();
            label(c, '0', innerX - 8, zeroY, MUTE, 9, 'right', true);

            // Mittelwert — die Linie, an der die Diffusion spiegelt
            var m = 0;
            for (var i = 0; i < N; i++) m += shown[i];
            m /= N;
            var my = zeroY - m * unit;
            c.strokeStyle = STEEL + '0.6)'; c.lineWidth = 1.5; c.setLineDash([5, 4]);
            c.beginPath(); c.moveTo(innerX, my); c.lineTo(innerX + innerW, my); c.stroke();
            c.setLineDash([]);
            label(c, de(m, 3), innerX + innerW, my - 9, STEEL + '0.85)', 10, 'right', true);

            var slot = innerW / N;
            var bw = Math.max(slot - 2, 2);           // 2px Fuge zwischen Nachbarn
            for (i = 0; i < N; i++) {
                var cx = innerX + slot * i + slot / 2;
                var v = shown[i];
                bar(c, cx - bw / 2, bw, zeroY, v, unit, ampColor(v, i === target ? 0.95 : 0.42),
                    i === target ? STEEL + '0.85)' : null);
            }
            // Marke unter dem Treffer statt Text auf der Leinwand
            var tx = innerX + slot * target + slot / 2;
            c.fillStyle = STEEL + '0.9)';
            c.beginPath(); c.moveTo(tx, bot + 4); c.lineTo(tx - 4, bot + 11); c.lineTo(tx + 4, bot + 11);
            c.closePath(); c.fill();
        }
        function maxAbs() {
            var m = 0;
            for (var i = 0; i < N; i++) m = Math.max(m, Math.abs(shown[i]));
            return m || 0.5;
        }

        function curve(x, y, w, h) {
            var px = x + 26, pw = w - 26, py = y + 8, ph = h - 24;
            var kMax = Math.max(optimal() * 3, 8);

            dashLine(c, px, py, px + pw, py, GRID);
            dashLine(c, px, py + ph, px + pw, py + ph, GRID);
            label(c, '1', px - 8, py, MUTE, 9, 'right', true);
            label(c, '0', px - 8, py + ph, MUTE, 9, 'right', true);
            label(c, 'P', px - 8, py + ph / 2, MUTE, 10, 'right', true);

            c.strokeStyle = S.primary(0.75); c.lineWidth = 2; c.lineJoin = 'round';
            c.beginPath();
            for (var i = 0; i <= 160; i++) {
                var k = i / 160 * kMax;
                var xx = px + k / kMax * pw, yy = py + ph - pAfter(k) * ph;
                if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
            }
            c.stroke();

            // Optimum
            var ox = px + optimal() / kMax * pw;
            dashLine(c, ox, py, ox, py + ph, OK + '0.5)', [4, 3]);
            label(c, String(optimal()), ox, py + ph + 12, OK + '0.9)', 10, 'center', true);

            // Ist-Stand
            var ix = px + Math.min(iter, kMax) / kMax * pw;
            var iy = py + ph - pAfter(iter) * ph;
            c.beginPath(); c.arc(ix, iy, 4.5, 0, Math.PI * 2);
            c.fillStyle = S.primary(1); c.fill();
            c.strokeStyle = 'rgba(15,18,26,0.9)'; c.lineWidth = 2; c.stroke();
            label(c, String(iter), ix, py + ph + 12, TEXT, 10, 'center', true);
        }

        on(el('grovOracle'), 'click', oracle);
        on(el('grovDiff'), 'click', diffusion);
        on(el('grovIter'), 'click', function () { oracle(); diffusion(); });
        on(el('grovReset'), 'click', build);
        on(rN, 'input', function () { nq = +rN.value; build(); });
        build();
        S.loop(fig, function (dt) {
            var k = Math.min(dt * 6, 1);
            for (var i = 0; i < N; i++) shown[i] += (amp[i] - shown[i]) * k;
            draw();
        });
    })();
})();
