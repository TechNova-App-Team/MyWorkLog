// ═══ BLAUE-LED FIGUREN MODULE ═══
// Die sieben interaktiven Diagramme von /it-stories/blaue-led/.
//
// Grundsatz: Auf der Leinwand steht nur, was sprachneutral ist — Formelzeichen,
// Einheiten, Summenformeln. Jedes erklaerende Wort lebt im HTML daneben. Das
// haelt die Figuren uebersetzbar, durchsuchbar und fuer Screenreader nutzbar.
//
// Figuren:
//   Abb. 1  Bandluecke → Wellenlaenge → Farbe          (#fig-gap)
//   Abb. 2  Direkter vs. indirekter Uebergang          (#fig-band)
//   Abb. 3  Kristallwachstum mit/ohne Pufferschicht    (#fig-buffer)
//   Abb. 4  Mg-H-Passivierung und Tempern              (#fig-ptype)
//   Abb. 5  Die fertige LED im Betrieb                 (#fig-led)
//   Abb. 6  Lokalisierung trotz Versetzungen           (#fig-loc)
//   Abb. 7  Blau wird weiss (Leuchtstoff)              (#fig-white)

(function () {
    'use strict';

    var S = window.Story;
    if (!S) return;

    var MONO = "'JetBrains Mono', ui-monospace, monospace";
    var SANS = "'Inter', system-ui, sans-serif";

    // ── Formatierung (deutsche Schreibweise) ─────────────────────────────────
    var SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    function sup(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }
    function de(v, digits) { return v.toFixed(digits === undefined ? 1 : digits).replace('.', ','); }
    function sci(v, digits) {
        if (!isFinite(v) || v <= 0) return '0';
        var e = Math.floor(Math.log10(v));
        var m = v / Math.pow(10, e);
        return de(m, digits === undefined ? 1 : digits) + '·' + '10' + sup(e);
    }

    // ── Zeichen-Helfer ───────────────────────────────────────────────────────
    function txt(c, s, x, y, opt) {
        opt = opt || {};
        c.save();
        c.font = (opt.weight || '500') + ' ' + (opt.size || 11) + 'px ' + (opt.sans ? SANS : MONO);
        c.fillStyle = opt.color || 'rgba(148,163,184,0.85)';
        c.textAlign = opt.align || 'left';
        c.textBaseline = opt.baseline || 'alphabetic';
        if (opt.tracking) c.letterSpacing = opt.tracking;
        c.fillText(s, x, y);
        c.restore();
    }
    function line(c, x1, y1, x2, y2, color, width, dash) {
        c.save();
        c.strokeStyle = color; c.lineWidth = width || 1;
        if (dash) c.setLineDash(dash);
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        c.restore();
    }
    function dot(c, x, y, r, color) {
        c.fillStyle = color;
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    }
    function glow(c, x, y, r, color) {
        var g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color); g.addColorStop(1, 'transparent');
        c.fillStyle = g;
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    }
    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        if (c.roundRect) { c.roundRect(x, y, w, h, r); return; }
        c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    var GRID = 'rgba(255,255,255,0.07)';
    var DIM = 'rgba(100,116,139,0.9)';
    var MUTE = 'rgba(148,163,184,0.9)';
    var TEXT = 'rgba(248,250,252,0.95)';
    var HEAT = 'rgba(245,158,11,';
    var BAD = 'rgba(239,68,68,';

    function fig(id) { return document.getElementById(id); }
    function ctrl(root, sel) { return root.querySelector(sel); }
    function put(root, sel, value) {
        var el = root.querySelector(sel);
        if (el) el.textContent = value;
    }
    // Zustandsfarbe. Die CSS-Regeln haengen am <dd>, der Wert steckt aber in
    // einem <span> darin (wegen der Einheit daneben) — also nach oben laufen.
    function mark(root, sel, cls) {
        var el = root.querySelector(sel);
        if (!el) return;
        var dd = el.closest ? el.closest('dd') : null;
        (dd || el).className = cls;
    }
    // Segment-Umschalter: gibt den gewaehlten data-value zurueck
    function segment(root, sel, onChange) {
        var wrap = root.querySelector(sel);
        if (!wrap) return function () { return null; };
        var btns = Array.prototype.slice.call(wrap.querySelectorAll('button'));
        btns.forEach(function (b) {
            b.addEventListener('click', function () {
                btns.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
                onChange(b.getAttribute('data-value'));
            });
        });
        return function () {
            var on = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
            return on ? on.getAttribute('data-value') : null;
        };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Abb. 1 — Bandluecke bestimmt die Farbe
    // ═════════════════════════════════════════════════════════════════════════
    (function () {
        var root = fig('fig-gap');
        if (!root) return;
        var st = S.stage(root.querySelector('canvas'));
        var range = ctrl(root, '#gapRange');
        var swatch = ctrl(root, '#gapSwatch');

        var MATS = [
            { n: 'GaAs', e: 1.42 }, { n: 'GaAsP', e: 1.90 }, { n: 'GaP', e: 2.26 },
            { n: 'InGaN', e: 2.75 }, { n: 'SiC', e: 3.02 }, { n: 'GaN', e: 3.42 }
        ];
        var E_MIN = 1.2, E_MAX = 3.6;
        var target = parseFloat(range.value), shown = E_MIN;
        var swept = S.reduced();
        if (swept) shown = target;

        function draw() {
            var c = st.ctx, w = st.w, h = st.h;
            st.clear();
            var L = 40, R = 40, T = 26;
            // Von unten gerechnet: unter dem Band brauchen Achse und Material-
            // marken zusammen rund 92 px, der Rest gehoert dem Farbband.
            var bandH = Math.max(46, h - T - 92);
            var axisY = T + bandH + 1;
            var x = function (e) { return L + (e - E_MIN) / (E_MAX - E_MIN) * (w - L - R); };

            // Farbband: jede Spalte ist die Farbe, die diese Bandluecke abgibt
            for (var px = L; px <= w - R; px += 2) {
                var e = E_MIN + (px - L) / (w - L - R) * (E_MAX - E_MIN);
                c.fillStyle = S.nmToCss(S.evToNm(e));
                c.fillRect(px, T, 2.4, bandH);
            }
            // Kante zeichnen, damit das Band als Objekt liest
            c.save();
            roundRect(c, L, T, w - L - R, bandH, 6);
            c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; c.stroke();
            c.restore();

            // Grenzen des sichtbaren Bereichs
            [[S.nmToEv(780), '780 nm'], [S.nmToEv(380), '380 nm']].forEach(function (m) {
                var mx = x(m[0]);
                line(c, mx, T - 8, mx, T + bandH + 6, 'rgba(255,255,255,0.35)', 1, [3, 3]);
                txt(c, m[1], mx, T - 12, { size: 9.5, color: MUTE, align: 'center' });
            });

            // Energieachse
            line(c, L, axisY + 10, w - R, axisY + 10, GRID, 1);
            for (var e2 = 1.5; e2 <= 3.5; e2 += 0.5) {
                var tx = x(e2);
                line(c, tx, axisY + 10, tx, axisY + 15, GRID, 1);
                txt(c, de(e2, 1), tx, axisY + 27, { size: 10, color: DIM, align: 'center' });
            }
            txt(c, 'eV', w - R + 6, axisY + 27, { size: 10, color: DIM });

            // Materialmarken
            MATS.forEach(function (m, i) {
                var mx = x(m.e);
                if (mx < L || mx > w - R) return;
                var my = axisY + (i % 2 ? 54 : 42);
                line(c, mx, axisY + 15, mx, my - 9, 'rgba(255,255,255,0.13)', 1);
                txt(c, m.n, mx, my, { size: 10.5, color: MUTE, align: 'center' });
            });

            // Marker
            var mkx = x(shown);
            var nm = S.evToNm(shown);
            var col = S.nmToCss(nm);
            glow(c, mkx, T + bandH / 2, bandH * 1.1, S.nmToCss(nm, 0.5));
            line(c, mkx, T - 4, mkx, axisY + 15, 'rgba(255,255,255,0.9)', 2);
            c.save();
            c.shadowColor = col; c.shadowBlur = 14;
            dot(c, mkx, T - 9, 5, '#fff');
            c.restore();
            // Wert ins Band legen, nicht unter die Achse — dort kollidiert er
            // sonst je nach Reglerstellung mit einer eV-Beschriftung.
            var lbl = Math.round(nm) + ' nm';
            c.save();
            c.font = '600 11px ' + MONO;
            var tw = c.measureText(lbl).width;
            roundRect(c, mkx - tw / 2 - 7, T + bandH - 24, tw + 14, 18, 5);
            c.fillStyle = 'rgba(3,3,5,0.78)'; c.fill();
            c.restore();
            txt(c, lbl, mkx, T + bandH - 11, { size: 11, color: TEXT, align: 'center', weight: '600' });
        }

        function sync() {
            var nm = S.evToNm(shown);
            put(root, '#gapEv', de(shown, 2));
            put(root, '#gapNm', String(Math.round(nm)));
            var near = MATS.reduce(function (a, b) {
                return Math.abs(b.e - shown) < Math.abs(a.e - shown) ? b : a;
            });
            put(root, '#gapMat', Math.abs(near.e - shown) < 0.14 ? near.n : '—');
            if (swatch) {
                swatch.style.background = S.nmToCss(nm);
                swatch.style.boxShadow = (nm >= 380 && nm <= 780)
                    ? '0 0 22px ' + S.nmToCss(nm, 0.45) : 'none';
            }
            draw();
        }

        range.addEventListener('input', function () {
            target = parseFloat(range.value);
            shown = target; swept = true;
            sync();
        });

        st.onResize = draw;
        S.loop(root, function (dt) {
            if (!swept) {
                // Einmaliger Anlauf: der Regler faehrt das Spektrum ab, damit man
                // sofort sieht, worum es geht — Blau liegt ganz aussen rechts.
                shown = Math.min(target, shown + dt * (E_MAX - E_MIN) / 1.5);
                if (shown >= target - 0.001) { shown = target; swept = true; }
                sync();
            }
        });
        sync();
    })();

    // ═════════════════════════════════════════════════════════════════════════
    // Abb. 2 — Direkter vs. indirekter Uebergang
    // ═════════════════════════════════════════════════════════════════════════
    (function () {
        var root = fig('fig-band');
        if (!root) return;
        var st = S.stage(root.querySelector('canvas'));
        var playBtn = ctrl(root, '#bandPlay');
        var playing = !S.reduced();

        // Anteil strahlender Uebergaenge. Schematisch: real trennen SiC und GaN
        // Groessenordnungen, hier reicht 1 von 18, damit man ueberhaupt was sieht.
        var P_INDIRECT = 1 / 18;

        function Panel(direct) {
            return { direct: direct, timer: 0.35, evts: [], photons: 0, heat: 0, e: null };
        }
        var panels = [Panel(true), Panel(false)];

        function rectOf(i) {
            if (st.narrow) {
                var ph = st.h / 2;
                return { x: 10, y: i * ph, w: st.w - 20, h: ph };
            }
            var pw = st.w / 2;
            return { x: i * pw + 10, y: 0, w: pw - 20, h: st.h };
        }

        function geo(r) {
            var pad = 26;
            return {
                cx: r.x + r.w / 2,
                ks: (r.w - pad * 2) * 0.45,
                yC: r.y + r.h * 0.44,   // Leitungsband-Minimum
                yV: r.y + r.h * 0.78,   // Valenzband-Maximum
                aC: r.h * 0.16,
                aV: r.h * 0.17
            };
        }
        // Auf dem Schirm zeigt kleineres y nach oben. Das Leitungsband hat ein
        // MINIMUM (Energie steigt nach aussen → y wird kleiner), das Valenzband
        // ein MAXIMUM (Energie faellt nach aussen → y wird groesser).
        function conY(g, k, k0) { return g.yC - g.aC * (k - k0) * (k - k0); }
        function valY(g, k) { return g.yV + g.aV * k * k; }

        function drawPanel(c, r, p) {
            var g = geo(r);
            var k0 = p.direct ? 0 : 0.62;

            // Rahmen
            c.save();
            roundRect(c, r.x, r.y + 6, r.w, r.h - 12, 10);
            c.fillStyle = 'rgba(255,255,255,0.014)'; c.fill();
            c.strokeStyle = GRID; c.lineWidth = 1; c.stroke();
            c.restore();

            // Achsen
            line(c, g.cx, r.y + 20, g.cx, r.y + r.h - 26, GRID, 1, [2, 4]);
            txt(c, 'E', r.x + 12, r.y + 26, { size: 11, color: DIM, weight: '600' });
            txt(c, 'k', r.x + r.w - 14, r.y + r.h - 16, { size: 11, color: DIM, weight: '600', align: 'right' });

            // Baender. Im indirekten Fall wird der Ast links des Minimums
            // verkuerzt gezeichnet, sonst schiesst die Parabel aus dem Bild.
            function curve(fn, k0v, from, to, color, wdt) {
                c.save(); c.strokeStyle = color; c.lineWidth = wdt; c.beginPath();
                var first = true;
                for (var k = from; k <= to + 0.001; k += 0.04) {
                    var xx = g.cx + k * g.ks, yy = fn(g, k, k0v);
                    if (first) { c.moveTo(xx, yy); first = false; } else c.lineTo(xx, yy);
                }
                c.stroke(); c.restore();
            }
            curve(conY, k0, p.direct ? -1 : -0.42, 1, S.primary(0.85), 2);
            curve(function (gg, k) { return valY(gg, k); }, 0, -1, 1, 'rgba(148,163,184,0.75)', 2);

            // Minimum/Maximum markieren
            var xC = g.cx + k0 * g.ks;
            dot(c, xC, g.yC, 3, S.primary(0.9));
            dot(c, g.cx, g.yV, 3, 'rgba(148,163,184,0.9)');

            // Ereignisse
            for (var i = 0; i < p.evts.length; i++) {
                var ev = p.evts[i];
                var t = ev.t;
                if (ev.kind === 'shift') {
                    var tt = S.clamp(t / 0.30, 0, 1);
                    var kk = k0 + (0 - k0) * tt;
                    dot(c, g.cx + kk * g.ks, conY(g, kk, k0), 3.4, S.primary(1));
                    line(c, xC, g.yC - 14, g.cx, g.yC - 14, 'rgba(148,163,184,0.6)', 1, [3, 3]);
                    // Phonon: gewellte Linie unter dem Pfeil
                    c.save(); c.strokeStyle = HEAT + '0.8)'; c.lineWidth = 1.4; c.beginPath();
                    for (var q = 0; q <= 14; q++) {
                        var qx = xC + (g.cx - xC) * (q / 14);
                        var qy = g.yC - 22 + Math.sin(q * 1.1 + t * 8) * 3;
                        q === 0 ? c.moveTo(qx, qy) : c.lineTo(qx, qy);
                    }
                    c.stroke(); c.restore();
                } else if (ev.kind === 'fall') {
                    var tf = S.clamp(t / 0.28, 0, 1);
                    var fx = ev.x0 + (g.cx - ev.x0) * tf;
                    var fy = g.yC + (g.yV - g.yC) * S.ease(tf);
                    dot(c, fx, fy, 3.4, ev.radiative ? S.primary(1) : HEAT + '0.95)');
                } else if (ev.kind === 'photon') {
                    var tp = S.clamp(t / 0.75, 0, 1);
                    var rad = 6 + tp * 46;
                    c.save();
                    c.strokeStyle = S.nmToCss(460, (1 - tp) * 0.85); c.lineWidth = 2;
                    c.beginPath(); c.arc(g.cx, g.yV, rad, 0, 6.2832); c.stroke();
                    c.restore();
                    glow(c, g.cx, g.yV, 26 * (1 - tp) + 8, S.nmToCss(460, 0.55 * (1 - tp)));
                    // Lichtstrahl nach oben rechts
                    var bl = tp * 70;
                    line(c, g.cx + 6, g.yV - 6, g.cx + 6 + bl * 0.7, g.yV - 6 - bl * 0.7,
                        S.nmToCss(460, (1 - tp) * 0.9), 2.2);
                } else if (ev.kind === 'heat') {
                    var th = S.clamp(t / 0.6, 0, 1);
                    c.save();
                    c.strokeStyle = HEAT + (0.85 * (1 - th)) + ')'; c.lineWidth = 1.6;
                    for (var s2 = 0; s2 < 3; s2++) {
                        c.beginPath();
                        var bx = g.cx - 14 + s2 * 14;
                        for (var v = 0; v <= 10; v++) {
                            var vy = g.yV + 4 - v * 3 - th * 22;
                            var vx = bx + Math.sin(v * 0.9 + s2) * 3.2;
                            v === 0 ? c.moveTo(vx, vy) : c.lineTo(vx, vy);
                        }
                        c.stroke();
                    }
                    c.restore();
                }
            }

            // Ruhendes Elektron am Leitungsband-Minimum
            if (!p.evts.length) {
                dot(c, xC, g.yC - 1, 3.6, S.primary(1));
                glow(c, xC, g.yC - 1, 13, S.primary(0.35));
            }

            // Bandluecken-Pfeil
            c.save();
            c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1; c.setLineDash([2, 3]);
            c.beginPath(); c.moveTo(xC, g.yC); c.lineTo(g.cx, g.yV); c.stroke();
            c.restore();
            if (!p.direct) {
                txt(c, 'Δk', (xC + g.cx) / 2, g.yC - 30, { size: 10.5, color: HEAT + '0.95)', align: 'center', weight: '600' });
            }
        }

        function step(p, dt, r) {
            var g = geo(r), k0 = p.direct ? 0 : 0.62;
            var xMin = g.cx + k0 * g.ks;   // Ort des Leitungsband-Minimums

            p.timer -= dt;
            if (p.timer <= 0) {
                p.timer = 0.62 + Math.random() * 0.22;
                var radiative = p.direct ? true : (Math.random() < P_INDIRECT);
                if (!p.direct && radiative) {
                    // Phonon holt den Impulsunterschied, danach faellt das Elektron
                    p.evts.push({ kind: 'shift', t: 0, life: 0.30 });
                } else {
                    p.evts.push({ kind: 'fall', t: 0, life: 0.28, radiative: radiative, x0: xMin });
                }
            }

            for (var i = p.evts.length - 1; i >= 0; i--) {
                var ev = p.evts[i];
                ev.t += dt;
                if (ev.t < ev.life) continue;
                p.evts.splice(i, 1);
                if (ev.kind === 'shift') {
                    p.evts.push({ kind: 'fall', t: 0, life: 0.28, radiative: true, x0: g.cx });
                } else if (ev.kind === 'fall') {
                    if (ev.radiative) { p.evts.push({ kind: 'photon', t: 0, life: 0.75 }); p.photons++; }
                    else { p.evts.push({ kind: 'heat', t: 0, life: 0.6 }); p.heat++; }
                }
            }
        }

        function sync() {
            var d = panels[0], n = panels[1];
            put(root, '#bandPhoD', String(d.photons));
            put(root, '#bandHeaD', String(d.heat));
            put(root, '#bandPhoI', String(n.photons));
            put(root, '#bandHeaI', String(n.heat));
        }

        function render() {
            st.clear();
            for (var i = 0; i < 2; i++) drawPanel(st.ctx, rectOf(i), panels[i]);
        }

        // Beide Beschriftungen stehen im HTML, damit die i18n-Pipeline sie findet.
        function syncPlayLabel() {
            playBtn.setAttribute('aria-pressed', String(playing));
            ctrl(root, '#bandLblPause').hidden = !playing;
            ctrl(root, '#bandLblPlay').hidden = playing;
        }
        playBtn.addEventListener('click', function () { playing = !playing; syncPlayLabel(); });
        ctrl(root, '#bandReset').addEventListener('click', function () {
            panels = [Panel(true), Panel(false)];
            sync(); render();
        });
        syncPlayLabel();

        st.onResize = render;
        S.loop(root, function (dt) {
            if (playing) { for (var i = 0; i < 2; i++) step(panels[i], dt, rectOf(i)); sync(); }
            render();
        });
        render();
    })();

    // ═════════════════════════════════════════════════════════════════════════
    // Abb. 3 — Kristallwachstum mit und ohne Pufferschicht
    // ═════════════════════════════════════════════════════════════════════════
    (function () {
        var root = fig('fig-buffer');
        if (!root) return;
        var st = S.stage(root.querySelector('canvas'));

        var mode = 'buffer';
        var t = 0, seeds = [], dislocs = [], temp = 300, done = false;

        function reset() {
            t = 0; seeds = []; dislocs = []; temp = 300; done = false;
            // Mit Puffer: viele kleine, nahezu gleich ausgerichtete Keime.
            // Ohne Puffer: wenige grosse Inseln in beliebiger Orientierung.
            var n = mode === 'buffer' ? 24 : 7;
            var spread = mode === 'buffer' ? 0.16 : 1.0;
            for (var i = 0; i < n; i++) {
                seeds.push({
                    u: (i + 0.5) / n + (Math.random() - 0.5) * (0.7 / n),
                    o: (Math.random() - 0.5) * 2 * spread,
                    delay: mode === 'buffer' ? Math.random() * 0.15 : Math.random() * 0.5,
                    // Ohne Puffer wachsen die Inseln unterschiedlich schnell hoch,
                    // das ergibt das Relief, das die frühen Filme rau machte.
                    hgt: mode === 'buffer' ? 1 : 0.55 + Math.random() * 0.45
                });
            }
            seeds.sort(function (a, b) { return a.u - b.u; });
        }

        // Zeitplan in Sekunden
        var T_HEAT1 = 1.0;   // Aufheizen (Puffer: auf 500 °C)
        var T_HEAT2 = 1.9;   // Rampe auf Wachstumstemperatur
        var T_GROW = 5.4;    // Ende des Inselwachstums
        var T_FLAT = 7.2;    // Film ist eingeebnet

        function schedule() {
            var growStart = mode === 'buffer' ? T_HEAT2 : T_HEAT1;
            if (mode === 'buffer') {
                temp = t < T_HEAT1 ? S.lerp(300, 500, t / T_HEAT1)
                    : t < T_HEAT2 ? S.lerp(500, 1040, (t - T_HEAT1) / (T_HEAT2 - T_HEAT1))
                        : 1040;
            } else {
                temp = t < T_HEAT1 ? S.lerp(300, 1040, t / T_HEAT1) : 1040;
            }
            return growStart;
        }

        function radiusOf(seed, growStart) {
            var g = (t - growStart - seed.delay);
            if (g <= 0) return 0;
            return Math.min(g / (T_GROW - growStart), 1);
        }

        function profile(w, growStart) {
            // Hoehenprofil: jede Insel ist eine Kuppel, benachbarte wachsen zusammen
            var cols = Math.max(60, Math.floor(w / 3));
            var hs = new Float32Array(cols);
            var own = new Int16Array(cols);
            var flat = S.clamp((t - T_GROW) / (T_FLAT - T_GROW), 0, 1);
            for (var i = 0; i < cols; i++) {
                var u = i / (cols - 1), best = 0, bi = -1, nearest = Infinity;
                for (var s = 0; s < seeds.length; s++) {
                    var r = radiusOf(seeds[s], growStart) * 0.95;
                    if (r <= 0) continue;
                    var d = Math.abs(u - seeds[s].u);
                    // Hoehe: Huellkurve aller Kuppeln.
                    var v = r * r - (d * 2.2) * (d * 2.2);
                    if (v > 0) { v = Math.sqrt(v) * seeds[s].hgt; if (v > best) best = v; }
                    // Kornzugehoerigkeit: naechstgelegener Keim. Ueber die Hoehe
                    // zu entscheiden waere falsch — ein hoher Nachbar wuerde ein
                    // ganzes Korn verschlucken und seine Korngrenze verschwinden
                    // lassen, obwohl sie im Kristall sehr wohl da ist.
                    if (d < nearest) { nearest = d; bi = s; }
                }
                hs[i] = Math.min(best, 1);   // sonst waechst der Film aus dem Bild
                own[i] = best > 0 ? bi : -1;
            }
            // Einebnung: Richtung Mittelwert ziehen. Mit Puffer wachsen die
            // Inseln sauber zusammen und der Film wird glatt; ohne Puffer
            // bleiben die Stossstellen als Relief stehen.
            if (flat > 0) {
                var sum = 0, cnt = 0;
                for (var j = 0; j < cols; j++) if (hs[j] > 0) { sum += hs[j]; cnt++; }
                var avg = cnt ? sum / cnt : 0;
                var strength = mode === 'buffer' ? 0.96 : 0.22;
                for (var k = 0; k < cols; k++) hs[k] = S.lerp(hs[k], avg, flat * strength);
            }
            return { hs: hs, own: own, cols: cols };
        }

        function findDislocations(p) {
            // Erst auswerten, wenn alle Inseln zusammengewachsen sind — vorher
            // gibt es noch gar nicht alle Stossstellen.
            if (dislocs.length || t < T_GROW) return;
            for (var i = 1; i < p.cols; i++) {
                if (p.own[i] < 0 || p.own[i - 1] < 0) continue;
                if (p.own[i] === p.own[i - 1]) continue;
                // Je staerker zwei Inseln gegeneinander verkippt sind, desto mehr
                // Versetzungen braucht die Stossstelle, um den Winkel abzubauen
                // (Read-Shockley: Dichte waechst mit dem Kippwinkel). Eine kaum
                // verkippte Grenze kommt ganz ohne aus.
                var d = Math.abs(seeds[p.own[i]].o - seeds[p.own[i - 1]].o);
                var n = Math.min(14, Math.round(Math.max(0, d - 0.20) * 14));
                for (var k = 0; k < n; k++) {
                    dislocs.push({
                        u: S.clamp(i / (p.cols - 1) + (k - (n - 1) / 2) * 0.006, 0.01, 0.99),
                        o: d, jit: Math.random() * 6.28
                    });
                }
            }
            done = true;
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h;
            st.clear();
            var growStart = schedule();
            var subH = Math.max(26, h * 0.17);
            var subY = h - subH - 14;
            var bufH = mode === 'buffer' && t > T_HEAT1 * 0.75 ? 7 : 0;
            var baseY = subY - bufH;
            var maxFilm = baseY - 24;

            // Substrat
            c.save();
            roundRect(c, 0, subY, w, subH, 0);
            c.fillStyle = 'rgba(255,255,255,0.045)'; c.fill();
            c.restore();
            for (var gx = 6; gx < w; gx += 11) {
                for (var gy = subY + 8; gy < subY + subH; gy += 9) dot(c, gx, gy, 1.1, 'rgba(148,163,184,0.35)');
            }
            line(c, 0, subY, w, subY, 'rgba(255,255,255,0.16)', 1);
            txt(c, 'Al₂O₃', 12, subY + subH - 8, { size: 10.5, color: MUTE });

            // Pufferschicht
            if (bufH) {
                c.fillStyle = S.primary(0.18);
                c.fillRect(0, baseY, w, bufH);
                for (var bx = 3; bx < w; bx += 5) {
                    dot(c, bx + Math.sin(bx) * 1.2, baseY + 2 + (bx % 3), 0.9, S.primary(0.7));
                }
                line(c, 0, baseY, w, baseY, S.primary(0.45), 1);
            }

            var p = profile(w, growStart);
            findDislocations(p);

            // GaN-Film
            var scale = maxFilm * 0.86;
            c.save();
            c.beginPath();
            c.moveTo(0, baseY);
            for (var i = 0; i < p.cols; i++) {
                var x = i / (p.cols - 1) * w;
                c.lineTo(x, baseY - p.hs[i] * scale);
            }
            c.lineTo(w, baseY);
            c.closePath();
            var grad = c.createLinearGradient(0, baseY - scale, 0, baseY);
            grad.addColorStop(0, S.primary(0.30));
            grad.addColorStop(1, S.primary(0.10));
            c.fillStyle = grad; c.fill();
            c.strokeStyle = S.primary(0.85); c.lineWidth = 1.6; c.stroke();
            c.restore();

            // Korngrenzen als feine senkrechte Linien
            for (var q = 1; q < p.cols; q++) {
                if (p.own[q] >= 0 && p.own[q - 1] >= 0 && p.own[q] !== p.own[q - 1] && p.hs[q] > 0.02) {
                    var qx = q / (p.cols - 1) * w;
                    line(c, qx, baseY, qx, baseY - p.hs[q] * scale, 'rgba(255,255,255,0.14)', 1);
                }
            }

            // Versetzungen
            dislocs.forEach(function (d) {
                var dx = d.u * w;
                c.save();
                c.strokeStyle = BAD + '0.75)'; c.lineWidth = 1.4;
                c.beginPath();
                for (var y = baseY; y > baseY - scale * 1.05; y -= 5) {
                    c.lineTo(dx + Math.sin((baseY - y) * 0.14 + d.jit) * 2.2, y);
                }
                c.stroke(); c.restore();
            });

            // Oberflaechenlinie hervorheben, wenn fertig
            if (t > T_FLAT) {
                c.save();
                c.strokeStyle = mode === 'buffer' ? 'rgba(16,185,129,0.8)' : BAD + '0.6)';
                c.lineWidth = 2; c.beginPath();
                for (var m = 0; m < p.cols; m++) {
                    var mx = m / (p.cols - 1) * w, my = baseY - p.hs[m] * scale;
                    m === 0 ? c.moveTo(mx, my) : c.lineTo(mx, my);
                }
                c.stroke(); c.restore();
            }

            txt(c, 'GaN', w - 12, 22, { size: 11, color: S.primary(0.95), align: 'right', weight: '600' });

            // Messwerte
            put(root, '#bufTemp', String(Math.round(temp)));
            put(root, '#bufDis', done ? String(dislocs.length) : '—');
            // Rauheit als Streuung der Schichtdicke, in Prozent der Dicke —
            // dann braucht die Zahl keine erfundene Laengeneinheit.
            var rough = 0, mean = 0, n = 0;
            for (var r1 = 0; r1 < p.cols; r1++) { mean += p.hs[r1]; n++; }
            mean /= n || 1;
            for (var r2 = 0; r2 < p.cols; r2++) rough += (p.hs[r2] - mean) * (p.hs[r2] - mean);
            rough = mean > 0.001 ? Math.sqrt(rough / (n || 1)) / mean * 100 : 0;
            put(root, '#bufRough', t > T_GROW ? de(rough, rough < 1 ? 2 : 1) : '—');
            mark(root, '#bufRough', t > T_GROW ? (rough < 2 ? 'ok' : 'warn') : '');
        }

        segment(root, '#bufMode', function (v) { mode = v; reset(); });
        ctrl(root, '#bufReplay').addEventListener('click', reset);

        reset();
        st.onResize = draw;
        S.loop(root, function (dt) {
            if (t < T_FLAT + 1.2) t += dt;
            draw();
        });
        draw();
    })();

    // ═════════════════════════════════════════════════════════════════════════
    // Abb. 4 — Mg-H-Passivierung: warum GaN nicht p-leitend werden wollte
    // ═════════════════════════════════════════════════════════════════════════
    (function () {
        var root = fig('fig-ptype');
        if (!root) return;
        var st = S.stage(root.querySelector('canvas'));
        var range = ctrl(root, '#pRange');

        var temp = 300, atmo = 'N2';
        var mg = [], freeH = [], holes = [];

        function reset() {
            mg = []; freeH = []; holes = [];
            for (var i = 0; i < 14; i++) {
                mg.push({
                    u: 0.07 + (i % 7) * 0.135 + (Math.random() - 0.5) * 0.05,
                    v: i < 7 ? 0.34 + Math.random() * 0.12 : 0.64 + Math.random() * 0.12,
                    bound: true, ph: Math.random() * 6.28, act: 0
                });
            }
        }
        reset();

        function step(dt) {
            var above = atmo === 'N2' ? 700 : 600;
            mg.forEach(function (m) {
                m.ph += dt * 1.6;
                if (atmo === 'N2' && m.bound && temp > above) {
                    // Ausheilrate steigt steil mit der Temperatur (Arrhenius-artig)
                    var rate = Math.pow((temp - above) / 340, 1.8) * 1.5;
                    if (Math.random() < rate * dt) {
                        m.bound = false;
                        freeH.push({ x: m.u, y: m.v, vy: -0.22 - Math.random() * 0.12, vx: (Math.random() - 0.5) * 0.06 });
                    }
                } else if (atmo === 'NH3' && !m.bound && temp > above) {
                    var rate2 = Math.pow((temp - above) / 400, 1.8) * 1.4;
                    if (Math.random() < rate2 * dt) {
                        m.bound = true;
                        freeH.push({ x: m.u + (Math.random() - 0.5) * 0.1, y: -0.05, vy: 0, vx: 0, to: m });
                    }
                }
                var want = m.bound ? 0 : 1;
                m.act += (want - m.act) * Math.min(1, dt * 4);
            });

            for (var i = freeH.length - 1; i >= 0; i--) {
                var f = freeH[i];
                if (f.to) {
                    f.y += (f.to.v - f.y) * Math.min(1, dt * 3.5);
                    f.x += (f.to.u - f.x) * Math.min(1, dt * 3.5);
                    if (Math.abs(f.y - f.to.v) < 0.01) freeH.splice(i, 1);
                } else {
                    f.y += f.vy * dt; f.x += f.vx * dt;
                    if (f.y < -0.08) freeH.splice(i, 1);
                }
            }

            // Loecher: eines je aktivem Mg, driftet traege umher
            var activeCount = mg.filter(function (m) { return !m.bound; }).length;
            while (holes.length < activeCount) holes.push({ x: Math.random(), y: 0.3 + Math.random() * 0.45, a: Math.random() * 6.28 });
            while (holes.length > activeCount) holes.pop();
            holes.forEach(function (hl) {
                hl.a += (Math.random() - 0.5) * dt * 6;
                hl.x += Math.cos(hl.a) * dt * 0.07;
                hl.y += Math.sin(hl.a) * dt * 0.04;
                if (hl.x < 0.04) hl.x = 0.04; if (hl.x > 0.96) hl.x = 0.96;
                if (hl.y < 0.22) hl.y = 0.22; if (hl.y > 0.86) hl.y = 0.86;
            });
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h;
            st.clear();
            var top = 18, bot = h - 14;
            var X = function (u) { return 14 + u * (w - 28); };
            var Y = function (v) { return top + v * (bot - top); };

            // Kristallgitter
            c.save();
            roundRect(c, 10, top, w - 20, bot - top, 10);
            c.fillStyle = 'rgba(255,255,255,0.016)'; c.fill();
            c.strokeStyle = GRID; c.stroke();
            c.clip();
            for (var gx = 18; gx < w - 10; gx += 17) {
                for (var gy = top + 12; gy < bot; gy += 15) dot(c, gx, gy, 1.15, 'rgba(148,163,184,0.22)');
            }
            c.restore();
            txt(c, 'GaN', w - 18, top + 16, { size: 10.5, color: MUTE, align: 'right' });

            // Waermeschimmer ab der Aktivierungsschwelle
            if (temp > 600) {
                var warm = S.clamp((temp - 600) / 400, 0, 1);
                c.save();
                roundRect(c, 10, top, w - 20, bot - top, 10);
                c.fillStyle = HEAT + (warm * 0.07) + ')'; c.fill();
                c.restore();
            }

            holes.forEach(function (hl) {
                var hx = X(hl.x), hy = Y(hl.y);
                glow(c, hx, hy, 11, S.primary(0.35));
                dot(c, hx, hy, 3.6, S.primary(0.95));
                txt(c, '+', hx, hy + 3.5, { size: 9, color: '#fff', align: 'center', weight: '700' });
            });

            mg.forEach(function (m) {
                var mx = X(m.u), my = Y(m.v);
                if (m.act > 0.05) glow(c, mx, my, 20 * m.act, S.primary(0.30 * m.act));
                dot(c, mx, my, 8, m.bound ? 'rgba(100,116,139,0.85)' : S.primary(0.95));
                txt(c, 'Mg', mx, my + 3, { size: 8.5, color: m.bound ? 'rgba(226,232,240,0.9)' : '#fff', align: 'center', weight: '700' });
                if (m.bound) {
                    var hx2 = mx + Math.cos(m.ph) * 13, hy2 = my + Math.sin(m.ph) * 9;
                    line(c, mx, my, hx2, hy2, 'rgba(148,163,184,0.5)', 1);
                    dot(c, hx2, hy2, 4, 'rgba(203,213,225,0.9)');
                    txt(c, 'H', hx2, hy2 + 2.6, { size: 7.5, color: '#0b0b10', align: 'center', weight: '700' });
                }
            });

            freeH.forEach(function (f) {
                var fx = X(f.x), fy = Y(f.y);
                dot(c, fx, fy, 4, 'rgba(203,213,225,0.8)');
                txt(c, 'H', fx, fy + 2.6, { size: 7.5, color: '#0b0b10', align: 'center', weight: '700' });
            });

            // Messwerte
            var frac = mg.filter(function (m) { return !m.bound; }).length / mg.length;
            put(root, '#pT', String(Math.round(temp)));
            put(root, '#pAct', String(Math.round(frac * 100)));
            var rho = Math.pow(10, 6 + frac * (Math.log10(2) - 6));
            put(root, '#pRho', rho >= 1000 ? sci(rho) : de(rho, 1));
            put(root, '#pHoles', frac < 0.02 ? '0' : sci(frac * 3e17));
            mark(root, '#pRho', frac > 0.8 ? 'ok' : (frac > 0.2 ? 'warn' : 'no'));
        }

        range.addEventListener('input', function () { temp = parseFloat(range.value); });
        segment(root, '#pAtmo', function (v) { atmo = v; });
        ctrl(root, '#pReset').addEventListener('click', function () {
            reset(); temp = 300; range.value = 300; draw();
        });

        st.onResize = draw;
        S.loop(root, function (dt) { step(dt); draw(); });
        draw();
    })();

    // ═════════════════════════════════════════════════════════════════════════
    // Abb. 5 — Die fertige LED im Betrieb (ABC-Modell)
    // ═════════════════════════════════════════════════════════════════════════
    (function () {
        var root = fig('fig-led');
        if (!root) return;
        var st = S.stage(root.querySelector('canvas'));
        var range = ctrl(root, '#ledRange');

        // ABC-Modell: R(n) = A·n + B·n² + C·n³
        //   A  Shockley-Read-Hall (Defekte, nichtstrahlend)
        //   B  strahlende Rekombination  → das Licht
        //   C  Auger (nichtstrahlend)    → die Effizienz-Delle bei hohem Strom
        var A = 1e7, B = 1e-11, C = 1e-30;
        var Q = 1.602e-19;
        var VOL = 9e-4 * 9e-7;   // 300 µm Chip × 3 Quantentoepfe à 3 nm, in cm³
        var EXTR = 0.80;         // Auskoppel-Wirkungsgrad moderner Chips
        var LAMBDA = 450;

        function carrierDensity(I) {
            if (I <= 0) return 0;
            var Rtot = I / (Q * VOL);
            var lo = 1e12, hi = 1e21;
            for (var i = 0; i < 60; i++) {
                var m = Math.sqrt(lo * hi);
                (A * m + B * m * m + C * m * m * m < Rtot) ? lo = m : hi = m;
            }
            return Math.sqrt(lo * hi);
        }
        function iqe(I) {
            var n = carrierDensity(I);
            if (n <= 0) return 0;
            var rad = B * n * n;
            return rad / (A * n + rad + C * n * n * n);
        }

        var current = parseFloat(range.value) / 1000; // A
        var carriers = [], photons = [], emit = 0;

        function layers(h) {
            var top = 8, bot = h - 8, H = bot - top;
            var f = [
                { k: 'air', r: 0.22 },
                { k: 'p', r: 0.17, n: 'p-GaN' },
                { k: 'ebl', r: 0.04, n: 'AlGaN' },
                { k: 'qw', r: 0.06, n: 'InGaN' },
                { k: 'n', r: 0.28, n: 'n-GaN' },
                { k: 'buf', r: 0.025 },
                { k: 'sub', r: 0.185, n: 'Al₂O₃' }
            ];
            var y = top, out = {};
            f.forEach(function (l) { l.y0 = y; l.y1 = y + l.r * H; y = l.y1; out[l.k] = l; });
            out.list = f;
            return out;
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h;
            st.clear();
            var L = layers(h);
            var padL = 10, padR = 10, ww = w - padL - padR;
            var stepX = padL + ww * 0.20;   // Aetzstufe zum n-Kontakt

            // Schichten
            L.list.forEach(function (l) {
                if (l.k === 'air') return;
                var x0 = padL, wid = ww;
                if (l.k === 'p' || l.k === 'ebl' || l.k === 'qw') { x0 = stepX; wid = ww - (stepX - padL); }
                c.save();
                var fill = {
                    p: S.primary(0.14), ebl: 'rgba(148,163,184,0.20)', qw: S.primary(0.30),
                    n: S.primary(0.09), buf: S.primary(0.16), sub: 'rgba(255,255,255,0.045)'
                }[l.k];
                c.fillStyle = fill;
                c.fillRect(x0, l.y0, wid, l.y1 - l.y0);
                c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
                c.strokeRect(x0 + 0.5, l.y0 + 0.5, wid - 1, l.y1 - l.y0 - 1);
                c.restore();
                if (l.n && l.y1 - l.y0 > 9) {
                    txt(c, l.n, x0 + wid - 8, (l.y0 + l.y1) / 2 + 3.5,
                        { size: 9.5, color: 'rgba(226,232,240,0.75)', align: 'right' });
                }
            });

            // Quantentoepfe andeuten
            var qw = L.qw;
            for (var q = 0; q < 3; q++) {
                var qy = qw.y0 + (qw.y1 - qw.y0) * (0.18 + q * 0.3);
                line(c, stepX, qy, w - padR, qy, S.primary(0.75), 1.2);
            }

            // Kontakte
            c.fillStyle = 'rgba(226,232,240,0.55)';
            c.fillRect(padL + 6, L.n.y0 - 7, ww * 0.13, 7);                       // n-Kontakt auf der Stufe
            c.fillRect(w - padR - ww * 0.16, L.p.y0 - 7, ww * 0.16 - 6, 7);       // p-Kontakt oben
            txt(c, 'n', padL + 10, L.n.y0 - 11, { size: 10, color: MUTE });
            txt(c, 'p', w - padR - 12, L.p.y0 - 11, { size: 10, color: MUTE, align: 'right' });

            // Ladungstraeger. Feste Farben statt des Theme-Akzents: Elektronen
            // und Loecher muessen sich unterscheiden lassen, egal welche
            // Akzentfarbe der Nutzer in der App eingestellt hat.
            carriers.forEach(function (p) {
                dot(c, p.x, p.y, 2.6, p.type === 'e' ? 'rgba(125,211,252,0.95)' : 'rgba(251,191,36,0.95)');
            });
            // Photonen
            photons.forEach(function (p) {
                var a = S.clamp(1 - p.t / p.life, 0, 1);
                line(c, p.x, p.y, p.x + p.vx * 9, p.y + p.vy * 9, S.nmToCss(LAMBDA, a * 0.9), 2);
                glow(c, p.x, p.y, 7, S.nmToCss(LAMBDA, a * 0.4));
            });

            // Kennlinie Wirkungsgrad über Strom
            var pw = Math.min(150, w * 0.30), ph = Math.min(64, h * 0.30);
            var px = w - padR - pw - 8, py = 12;
            c.save();
            roundRect(c, px, py, pw, ph, 6);
            c.fillStyle = 'rgba(3,3,5,0.72)'; c.fill();
            c.strokeStyle = GRID; c.stroke();
            c.clip();
            c.beginPath();
            for (var i = 0; i <= 60; i++) {
                var I = (i / 60) * 0.15;
                var yv = py + ph - 6 - iqe(I) * (ph - 14);
                var xv = px + 6 + (i / 60) * (pw - 12);
                i === 0 ? c.moveTo(xv, yv) : c.lineTo(xv, yv);
            }
            c.strokeStyle = S.primary(0.9); c.lineWidth = 1.6; c.stroke();
            var cx = px + 6 + (current / 0.15) * (pw - 12);
            var cy = py + ph - 6 - iqe(current) * (ph - 14);
            dot(c, cx, cy, 3.2, '#fff');
            c.restore();
            txt(c, 'η / I', px + 6, py + 12, { size: 9, color: DIM });

            // Messwerte
            var e = iqe(current);
            put(root, '#ledI', String(Math.round(current * 1000)));
            put(root, '#ledEta', String(Math.round(e * 100)));
            put(root, '#ledP', de(EXTR * e * current * 1000 * (1239.84 / LAMBDA), 1));
            var sw = root.querySelector('#ledSwatch');
            if (sw) {
                sw.style.background = S.nmToCss(LAMBDA);
                sw.style.boxShadow = '0 0 22px ' + S.nmToCss(LAMBDA, S.clamp(current / 0.05, 0, 1) * 0.6);
            }
            mark(root, '#ledEta', e > 0.5 ? 'ok' : (e > 0.25 ? 'warn' : 'no'));
        }

        function step(dt) {
            var L = layers(st.h);
            var padL = 10, padR = 10, ww = st.w - padL - padR;
            var stepX = padL + ww * 0.20;
            var qwY = (L.qw.y0 + L.qw.y1) / 2;
            var e = iqe(current);

            emit += dt * (current * 1000) * 2.2;
            while (emit >= 1 && carriers.length < 160) {
                emit -= 1;
                var tx = stepX + 20 + Math.random() * (ww * 0.66);
                carriers.push({
                    type: 'e', x: padL + 12 + Math.random() * ww * 0.08,
                    y: (L.n.y0 + L.n.y1) / 2 + (Math.random() - 0.5) * 10,
                    tx: tx, ty: qwY, phase: 0,
                    // Der Anteil, der die aktive Zone verfehlt, ist genau der,
                    // der im ABC-Modell nicht strahlend rekombiniert.
                    over: Math.random() > e
                });
                carriers.push({
                    type: 'h', x: st.w - padR - 12 - Math.random() * ww * 0.10,
                    y: L.p.y0 + 4, tx: tx + (Math.random() - 0.5) * 30, ty: qwY, phase: 1, over: false
                });
            }

            var sp = 70 + (current * 1000) * 0.9;
            for (var i = carriers.length - 1; i >= 0; i--) {
                var p = carriers[i];
                if (p.phase === 0) {                       // Elektron laeuft erst waagerecht
                    p.x += (p.tx > p.x ? 1 : -1) * sp * dt;
                    if (Math.abs(p.x - p.tx) < 6) p.phase = 1;
                    continue;
                }
                var dx = p.tx - p.x, dy = p.ty - p.y;
                var d = Math.hypot(dx, dy) || 1;
                p.x += dx / d * sp * dt; p.y += dy / d * sp * dt;
                if (d > 5) continue;

                if (p.phase === 1) {
                    if (p.type === 'e' && p.over) {
                        p.phase = 2; p.ty = L.p.y0 - 6;    // Ueberlauf ueber die Sperrschicht
                        continue;
                    }
                    carriers.splice(i, 1);
                    if (p.type === 'e') {
                        var ang = -1.5708 + (Math.random() - 0.5) * 1.6;
                        photons.push({ x: p.x, y: qwY, vx: Math.cos(ang), vy: Math.sin(ang), t: 0, life: 0.55 });
                    }
                } else {
                    carriers.splice(i, 1);
                }
            }

            for (var j = photons.length - 1; j >= 0; j--) {
                var ph2 = photons[j];
                ph2.t += dt;
                ph2.x += ph2.vx * 190 * dt; ph2.y += ph2.vy * 190 * dt;
                if (ph2.t > ph2.life) photons.splice(j, 1);
            }
        }

        range.addEventListener('input', function () { current = parseFloat(range.value) / 1000; draw(); });
        st.onResize = draw;
        S.loop(root, function (dt) { step(dt); draw(); });
        draw();
    })();

    // ═════════════════════════════════════════════════════════════════════════
    // Abb. 6 — Warum Versetzungen die InGaN-Schicht nicht umbringen
    // ═════════════════════════════════════════════════════════════════════════
    (function () {
        var root = fig('fig-loc');
        if (!root) return;
        var st = S.stage(root.querySelector('canvas'));

        var localize = true;
        var defects = [], puddles = [], carriers = [];
        var rad = 0, non = 0;

        function reset() {
            defects = []; puddles = []; carriers = []; rad = 0; non = 0;
            for (var i = 0; i < 13; i++) defects.push({ u: Math.random(), v: Math.random() });
            for (var j = 0; j < 26; j++) puddles.push({ u: Math.random(), v: Math.random(), r: 0.035 + Math.random() * 0.03 });
            for (var k = 0; k < 46; k++) spawn();
        }
        function spawn() {
            carriers.push({ u: Math.random(), v: Math.random(), a: Math.random() * 6.28, life: 0, trap: null });
        }
        reset();

        function step(dt) {
            for (var i = carriers.length - 1; i >= 0; i--) {
                var p = carriers[i];
                p.life += dt;

                if (localize && !p.trap) {
                    for (var q = 0; q < puddles.length; q++) {
                        var pu = puddles[q];
                        if (Math.hypot(p.u - pu.u, (p.v - pu.v) * 0.5) < pu.r) { p.trap = pu; p.life = 0; break; }
                    }
                }

                if (p.trap) {
                    // gefangen: kleine Zitterbewegung, dann strahlende Rekombination
                    p.a += (Math.random() - 0.5) * dt * 14;
                    p.u += Math.cos(p.a) * dt * 0.012;
                    p.v += Math.sin(p.a) * dt * 0.02;
                    var d = Math.hypot(p.u - p.trap.u, (p.v - p.trap.v) * 0.5);
                    if (d > p.trap.r * 0.8) {
                        p.u += (p.trap.u - p.u) * dt * 6;
                        p.v += (p.trap.v - p.v) * dt * 6;
                    }
                    if (p.life > 0.5 + Math.random() * 0.5) {
                        rad++;
                        flashes.push({ u: p.u, v: p.v, t: 0, kind: 'rad' });
                        carriers.splice(i, 1); spawn();
                    }
                    continue;
                }

                p.a += (Math.random() - 0.5) * dt * 9;
                p.u += Math.cos(p.a) * dt * 0.16;
                p.v += Math.sin(p.a) * dt * 0.26;
                if (p.u < 0.02 || p.u > 0.98) p.a = Math.PI - p.a;
                if (p.v < 0.03 || p.v > 0.97) p.a = -p.a;
                p.u = S.clamp(p.u, 0.02, 0.98); p.v = S.clamp(p.v, 0.03, 0.97);

                for (var d2 = 0; d2 < defects.length; d2++) {
                    if (Math.hypot(p.u - defects[d2].u, (p.v - defects[d2].v) * 0.5) < 0.028) {
                        non++;
                        flashes.push({ u: defects[d2].u, v: defects[d2].v, t: 0, kind: 'non' });
                        carriers.splice(i, 1); spawn();
                        break;
                    }
                }
                // ohne Fangstellen leben die Traeger nicht ewig
                if (!localize && p.life > 6) { non++; carriers.splice(i, 1); spawn(); }
            }
            for (var f = flashes.length - 1; f >= 0; f--) {
                flashes[f].t += dt;
                if (flashes[f].t > 0.5) flashes.splice(f, 1);
            }
        }
        var flashes = [];

        function draw() {
            var c = st.ctx, w = st.w, h = st.h;
            st.clear();
            var X = function (u) { return 8 + u * (w - 16); };
            var Y = function (v) { return 8 + v * (h - 16); };

            c.save();
            roundRect(c, 6, 6, w - 12, h - 12, 10);
            c.fillStyle = 'rgba(255,255,255,0.014)'; c.fill();
            c.strokeStyle = GRID; c.stroke();
            c.clip();

            if (localize) {
                puddles.forEach(function (p) {
                    var r = p.r * (w - 16);
                    glow(c, X(p.u), Y(p.v), r * 1.6, S.primary(0.22));
                    c.save();
                    c.strokeStyle = S.primary(0.16); c.lineWidth = 1;
                    c.beginPath(); c.arc(X(p.u), Y(p.v), r, 0, 6.2832); c.stroke();
                    c.restore();
                });
            }

            defects.forEach(function (d) {
                var dx = X(d.u), dy = Y(d.v);
                c.save();
                c.strokeStyle = BAD + '0.30)'; c.lineWidth = 1; c.setLineDash([2, 3]);
                c.beginPath(); c.arc(dx, dy, 0.028 * (w - 16), 0, 6.2832); c.stroke();
                c.restore();
                dot(c, dx, dy, 3.4, BAD + '0.9)');
            });

            carriers.forEach(function (p) {
                var px = X(p.u), py = Y(p.v);
                if (p.trap) glow(c, px, py, 9, S.primary(0.4));
                dot(c, px, py, 2.4, p.trap ? S.primary(1) : 'rgba(203,213,225,0.85)');
            });

            flashes.forEach(function (f) {
                var t = f.t / 0.5, a = 1 - t;
                var fx = X(f.u), fy = Y(f.v);
                if (f.kind === 'rad') {
                    c.save();
                    c.strokeStyle = S.nmToCss(460, a * 0.9); c.lineWidth = 1.6;
                    c.beginPath(); c.arc(fx, fy, 4 + t * 22, 0, 6.2832); c.stroke();
                    c.restore();
                    glow(c, fx, fy, 18 * a + 4, S.nmToCss(460, a * 0.5));
                } else {
                    c.save();
                    c.strokeStyle = HEAT + (a * 0.8) + ')'; c.lineWidth = 1.4;
                    for (var s = 0; s < 3; s++) {
                        c.beginPath();
                        for (var v = 0; v <= 8; v++) {
                            var vy = fy - v * 2.6 - t * 16;
                            var vx = fx - 8 + s * 8 + Math.sin(v + s) * 2.4;
                            v === 0 ? c.moveTo(vx, vy) : c.lineTo(vx, vy);
                        }
                        c.stroke();
                    }
                    c.restore();
                }
            });
            c.restore();

            var total = rad + non;
            put(root, '#locRad', total < 5 ? '—' : String(Math.round(rad / total * 100)));
            put(root, '#locTot', String(total));
            mark(root, '#locRad', total < 5 ? '' : (rad / total > 0.6 ? 'ok' : 'no'));
        }

        segment(root, '#locMode', function (v) {
            localize = v === 'on';
            carriers.forEach(function (p) { p.trap = null; });
            rad = 0; non = 0;
        });

        st.onResize = draw;
        S.loop(root, function (dt) { step(dt); draw(); });
        draw();
    })();

    // ═════════════════════════════════════════════════════════════════════════
    // Abb. 7 — Aus Blau wird Weiss
    // ═════════════════════════════════════════════════════════════════════════
    (function () {
        var root = fig('fig-white');
        if (!root) return;
        var st = S.stage(root.querySelector('canvas'));
        var range = ctrl(root, '#whRange');
        var swatch = ctrl(root, '#whSwatch');

        var BLUE = 450, B_SIG = 9;
        // YAG:Ce strahlt nicht symmetrisch: die Bande faellt zum Roten hin viel
        // flacher ab als zum Gruenen. Genau dieser rote Auslaeufer zieht die
        // Mischfarbe auf die Planck-Kurve — mit einer symmetrischen Glocke
        // landet man bei jeder Dosis im Gruenstich.
        var PHOS = 555, P_LEFT = 45, P_RIGHT = 70;
        var P_NORM = (P_LEFT + P_RIGHT) / 2 * 2.5066;
        var conv = parseFloat(range.value) / 100;

        function gaussN(l, mu, sig) {
            return Math.exp(-0.5 * Math.pow((l - mu) / sig, 2)) / (sig * 2.5066);
        }
        function phosN(l) {
            var s = l < PHOS ? P_LEFT : P_RIGHT;
            return Math.exp(-0.5 * Math.pow((l - PHOS) / s, 2)) / P_NORM;
        }
        function spec(l) {
            // Stokes-Verschiebung: ein blaues Photon wird zu einem gelben, die
            // Photonenzahl bleibt, die Strahlungsleistung sinkt um λ_blau/λ_gelb.
            return (1 - conv) * gaussN(l, BLUE, B_SIG)
                + conv * (BLUE / PHOS) * phosN(l);
        }

        function draw() {
            var c = st.ctx, w = st.w, h = st.h;
            st.clear();
            var L = 40, R = 16, T = 18, B = 44;
            var X = function (nm) { return L + (nm - 380) / 400 * (w - L - R); };
            var plotH = h - T - B;

            var peak = 0;
            for (var l0 = 380; l0 <= 780; l0 += 2) peak = Math.max(peak, spec(l0));
            peak = Math.max(peak, 0.001);
            var Y = function (p) { return T + plotH - (p / peak) * plotH * 0.92; };

            // Gitter
            line(c, L, T + plotH, w - R, T + plotH, 'rgba(255,255,255,0.14)', 1);
            for (var g = 400; g <= 750; g += 50) {
                line(c, X(g), T, X(g), T + plotH, GRID, 1);
                txt(c, String(g), X(g), T + plotH + 30, { size: 9.5, color: DIM, align: 'center' });
            }
            txt(c, 'nm', w - R, T + plotH + 30, { size: 9.5, color: DIM, align: 'right' });

            // Spektralstreifen unter der Achse
            for (var px = L; px < w - R; px += 2) {
                var nm = 380 + (px - L) / (w - L - R) * 400;
                c.fillStyle = S.nmToCss(nm, 0.85);
                c.fillRect(px, T + plotH + 4, 2.4, 8);
            }

            // Flaeche unter der Kurve
            c.save();
            c.beginPath();
            c.moveTo(L, T + plotH);
            for (var l = 380; l <= 780; l += 2) c.lineTo(X(l), Y(spec(l)));
            c.lineTo(w - R, T + plotH); c.closePath();
            var grad = c.createLinearGradient(L, 0, w - R, 0);
            for (var s = 0; s <= 10; s++) grad.addColorStop(s / 10, S.nmToCss(380 + s * 40, 0.32));
            c.fillStyle = grad; c.fill();
            c.restore();

            // Kurve
            c.save();
            c.beginPath();
            for (var l2 = 380; l2 <= 780; l2 += 2) {
                var xx = X(l2), yy = Y(spec(l2));
                l2 === 380 ? c.moveTo(xx, yy) : c.lineTo(xx, yy);
            }
            c.strokeStyle = 'rgba(248,250,252,0.9)'; c.lineWidth = 1.8; c.stroke();
            c.restore();

            // Beschriftung der beiden Anteile
            if (conv < 0.97) txt(c, '450 nm', X(BLUE), Math.max(T + 12, Y((1 - conv) * gaussN(BLUE, BLUE, B_SIG)) - 8), { size: 10, color: S.nmToCss(450), align: 'center', weight: '600' });
            if (conv > 0.08) txt(c, 'YAG:Ce', X(PHOS), Math.max(T + 12, Y(conv * (BLUE / PHOS) * phosN(PHOS)) - 8), { size: 10, color: S.nmToCss(565), align: 'center', weight: '600' });

            // Farbe des Mischlichts
            var res = S.spectrumToRGB(spec);
            var css = 'rgb(' + res.rgb.join(',') + ')';
            if (swatch) {
                swatch.style.background = css;
                swatch.style.boxShadow = '0 0 26px rgba(' + res.rgb.join(',') + ',0.45)';
            }
            put(root, '#whConv', String(Math.round(conv * 100)));
            // Farbtemperatur nur zeigen, solange die Mischfarbe ueberhaupt in
            // der Naehe der Planck-Kurve liegt. Bei wenig Leuchtstoff ist das
            // Licht schlicht blau und hat keine sinnvolle Kelvin-Zahl.
            var showCct = conv > 0.6 && res.cct > 1800 && res.cct < 14000;
            put(root, '#whCct', showCct ? String(Math.round(res.cct / 10) * 10) : '—');
            put(root, '#whLoss', String(Math.round(conv * (1 - BLUE / PHOS) * 100)));
        }

        // Diese Figur ist statisch: Sie zeichnet nur bei Eingabe oder Groessen-
        // aenderung neu und braucht deshalb keine laufende Animationsschleife.
        range.addEventListener('input', function () { conv = parseFloat(range.value) / 100; draw(); });
        st.onResize = draw;
        draw();
    })();
})();
