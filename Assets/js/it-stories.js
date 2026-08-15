// ═══ IT-STORIES MODULE ═══
// Gemeinsames Fundament fuer die Deep-Dive-Artikel unter /it-stories/<slug>/.
//
// Stellt bereit:
//   Story.stage(canvas)   Canvas mit DPR-Skalierung + Resize-Handling
//   Story.loop(el, fn)    rAF-Schleife, die NUR laeuft, solange el sichtbar ist
//   Story.nmToRGB(nm)     Wellenlaenge → sRGB (Bruton-Approximation)
//   Story.evToNm(eV)      Bandluecke → Wellenlaenge (λ = hc/E)
//   Story.token(name)     CSS-Custom-Property auslesen (Theme-Akzent!)
//
// Warum berechnete Farben: Die gesaettigten Farben der Figuren SIND der Inhalt
// (welche Bandluecke ergibt welche Farbe). Sie werden deshalb aus der Physik
// abgeleitet und nirgends als Hex-Wert hinterlegt.

(function () {
    'use strict';

    var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    function reduced() { return mqReduce.matches; }

    // ── Mathe-Helfer ──────────────────────────────────────────────────────────
    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    // ── Physik ────────────────────────────────────────────────────────────────
    // E [eV] · λ [nm] = 1239.84 eV·nm  (hc in praktischen Einheiten)
    var HC_EV_NM = 1239.84193;
    function evToNm(ev) { return HC_EV_NM / ev; }
    function nmToEv(nm) { return HC_EV_NM / nm; }

    // Sichtbare Wellenlaenge → sRGB. Ausserhalb 380–780 nm: neutrales Grau,
    // denn genau das sieht das Auge dort — nichts.
    function nmToRGB(nm) {
        var r = 0, g = 0, b = 0, f;
        if (nm < 380 || nm > 780) return [56, 61, 72];
        if (nm < 440) { r = -(nm - 440) / 60; g = 0; b = 1; }
        else if (nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; }
        else if (nm < 510) { r = 0; g = 1; b = -(nm - 510) / 20; }
        else if (nm < 580) { r = (nm - 510) / 70; g = 1; b = 0; }
        else if (nm < 645) { r = 1; g = -(nm - 645) / 65; b = 0; }
        else { r = 1; g = 0; b = 0; }

        if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40;
        else if (nm <= 700) f = 1;
        else f = 0.3 + 0.7 * (780 - nm) / 80;

        function ch(c) { return Math.round(255 * Math.pow(clamp(c, 0, 1) * f, 0.8)); }
        return [ch(r), ch(g), ch(b)];
    }
    function nmToCss(nm, alpha) {
        var c = nmToRGB(nm);
        return alpha === undefined
            ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
            : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
    }

    // ── Farbmetrik: ganzes Spektrum → Farbe ───────────────────────────────────
    // Fuer Mischlicht (blaue LED + Leuchtstoff) reicht die Naeherung oben nicht:
    // Blau + Gelb ergibt dort Graugruen statt Weiss. Hier deshalb der richtige
    // Weg ueber die CIE-1931-Normalspektralwertfunktionen (Mehrfach-Gauss-Fit
    // nach Wyman/Sloan/Shirley) und die sRGB-Matrix.
    function gauss(x, mu, s1, s2) {
        var t = (x - mu) * (x < mu ? 1 / s1 : 1 / s2);
        return Math.exp(-0.5 * t * t);
    }
    function cieX(l) { return 1.056 * gauss(l, 599.8, 37.9, 31.0) + 0.362 * gauss(l, 442.0, 16.0, 26.7) - 0.065 * gauss(l, 501.1, 20.4, 26.2); }
    function cieY(l) { return 0.821 * gauss(l, 568.8, 46.9, 40.5) + 0.286 * gauss(l, 530.9, 16.3, 31.1); }
    function cieZ(l) { return 1.217 * gauss(l, 437.0, 11.8, 36.0) + 0.681 * gauss(l, 459.0, 26.0, 13.8); }

    // sampler(nm) → spektrale Leistungsdichte. Liefert {rgb, x, y, cct}.
    function spectrumToRGB(sampler, from, to, step) {
        from = from || 380; to = to || 780; step = step || 4;
        var X = 0, Y = 0, Z = 0;
        for (var l = from; l <= to; l += step) {
            var p = sampler(l);
            if (!p) continue;
            X += p * cieX(l); Y += p * cieY(l); Z += p * cieZ(l);
        }
        var sum = X + Y + Z;
        if (sum <= 0) return { rgb: [56, 61, 72], x: 0, y: 0, cct: 0 };
        var cx = X / sum, cy = Y / sum;

        // XYZ → lineares sRGB, auf Y = 1 normiert (Helligkeit macht die UI)
        var s = 1 / Y;
        var r = 3.2406 * (X * s) - 1.5372 * (Y * s) - 0.4986 * (Z * s);
        var g = -0.9689 * (X * s) + 1.8758 * (Y * s) + 0.0415 * (Z * s);
        var b = 0.0557 * (X * s) - 0.2040 * (Y * s) + 1.0570 * (Z * s);

        // Ausserhalb des sRGB-Dreiecks (echtes Monochromat!) entstehen negative
        // Anteile — mit Weiss aufhellen statt hart abschneiden, sonst kippt der
        // Farbton. Danach auf den hellsten Kanal normieren.
        var min = Math.min(r, g, b);
        if (min < 0) { r -= min; g -= min; b -= min; }
        var max = Math.max(r, g, b, 1e-6);
        r /= max; g /= max; b /= max;

        function enc(c) {
            c = clamp(c, 0, 1);
            c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
            return Math.round(c * 255);
        }
        // Farbtemperatur nach McCamy — nur sinnvoll nahe der Planck-Kurve.
        var n = (cx - 0.3320) / (0.1858 - cy);
        var cct = 437 * n * n * n + 3601 * n * n + 6861 * n + 5517;

        return { rgb: [enc(r), enc(g), enc(b)], x: cx, y: cy, cct: cct };
    }

    // ── Theme-Tokens ──────────────────────────────────────────────────────────
    // Der Akzent kommt aus den App-Einstellungen (Theme-Sync unten) und kann sich
    // waehrend der Sitzung aendern — deshalb bei jedem Frame frisch gelesen, aber
    // gecached bis zur naechsten Aenderung.
    var tokenCache = {};
    function token(name) {
        if (tokenCache[name] === undefined) {
            tokenCache[name] = getComputedStyle(document.documentElement)
                .getPropertyValue('--' + name).trim();
        }
        return tokenCache[name];
    }
    function flushTokens() { tokenCache = {}; }

    function primaryRGB() {
        var raw = token('primary-rgb').split(',');
        return [parseInt(raw[0], 10) || 168, parseInt(raw[1], 10) || 85, parseInt(raw[2], 10) || 247];
    }
    function primary(alpha) {
        var c = primaryRGB();
        return alpha === undefined
            ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
            : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
    }

    // ── Canvas-Buehne ─────────────────────────────────────────────────────────
    // Zeichnen passiert in CSS-Pixeln; die DPR-Skalierung steckt im Transform.
    // Seitenverhaeltnis kommt aus data-ratio (Breite/Hoehe), Standard 2:1.
    function stage(canvas) {
        var ctx = canvas.getContext('2d');
        var ratio = parseFloat(canvas.getAttribute('data-ratio')) || 2;
        // Schmale Viewports brauchen ein hoeheres Bild, sonst wird eine
        // Zwei-Panel-Figur zum Briefschlitz.
        var ratioNarrow = parseFloat(canvas.getAttribute('data-ratio-narrow')) || ratio;
        var minH = parseFloat(canvas.getAttribute('data-min-h')) || 0;
        var api = { canvas: canvas, ctx: ctx, w: 0, h: 0, dpr: 1, narrow: false };

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = canvas.clientWidth || canvas.parentNode.clientWidth || 640;
            api.narrow = w < 560;
            var h = Math.max(Math.round(w / (api.narrow ? ratioNarrow : ratio)), minH);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            api.w = w; api.h = h; api.dpr = dpr;
            if (api.onResize) api.onResize(w, h);
        }

        api.clear = function () { ctx.clearRect(0, 0, api.w, api.h); };
        api.resize = resize;

        if (window.ResizeObserver) {
            var ro = new ResizeObserver(function () { resize(); });
            ro.observe(canvas.parentNode || canvas);
        } else {
            window.addEventListener('resize', resize);
        }
        resize();
        return api;
    }

    // ── Sichtbarkeits-gesteuerte Animationsschleife ────────────────────────────
    // Eine einzige rAF-Kette fuer alle Figuren. Was nicht im Viewport steht,
    // rechnet nicht — sonst laufen auf einer langen Seite sieben Simulationen
    // gleichzeitig und das Scrollen ruckelt.
    var runners = [];
    var ticking = false;
    var lastT = 0;

    function tick(now) {
        // Das Limit faengt den Zeitsprung ab, wenn der Tab lange im Hintergrund
        // war — deshalb muss kick() lastT nicht zuruecksetzen.
        var dt = Math.min((now - lastT) / 1000, 0.05);
        lastT = now;
        var any = false;
        for (var i = 0; i < runners.length; i++) {
            var r = runners[i];
            if (!r.visible) continue;
            any = true;
            r.t += dt;
            r.fn(dt, r.t);
        }
        if (any && !document.hidden) { requestAnimationFrame(tick); }
        else { ticking = false; }
    }
    function kick() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(tick);
    }

    function loop(el, fn) {
        var r = { fn: fn, visible: false, t: 0 };
        runners.push(r);
        var io = new IntersectionObserver(function (entries) {
            r.visible = entries[0].isIntersecting;
            if (r.visible) kick();
        }, { rootMargin: '120px 0px', threshold: 0 });
        io.observe(el);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
        return {
            stop: function () { r.visible = false; r.fn = function () {}; io.disconnect(); },
            reset: function () { r.t = 0; }
        };
    }

    // ── Kleine DOM-Helfer ─────────────────────────────────────────────────────
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function setText(sel, value, root) {
        var el = $(sel, root);
        if (el) el.textContent = value;   // textContent, nicht innerText — funktioniert auch in SVG
    }

    // ── Shell: Lesefortschritt, Kapitelschiene, Einblendungen ─────────────────
    function initShell() {
        // Lesebalken
        var bar = $('.readbar');
        if (bar) {
            var pending = false;
            var update = function () {
                pending = false;
                var doc = document.documentElement;
                var max = doc.scrollHeight - doc.clientHeight;
                var p = max > 0 ? clamp(doc.scrollTop / max, 0, 1) : 0;
                bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
            };
            window.addEventListener('scroll', function () {
                if (!pending) { pending = true; requestAnimationFrame(update); }
            }, { passive: true });
            update();
        }

        // Kapitelschiene: markiert das Kapitel, das gerade gelesen wird
        var links = $$('.rail a');
        if (links.length) {
            var byId = {};
            links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
            var seen = {};
            var railIO = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
                var active = null;
                links.forEach(function (a) {
                    var id = a.getAttribute('href').slice(1);
                    if (seen[id] && !active) active = id;
                });
                if (!active) return;
                links.forEach(function (a) {
                    a.classList.toggle('on', a.getAttribute('href').slice(1) === active);
                });
            }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 });
            Object.keys(byId).forEach(function (id) {
                var t = document.getElementById(id);
                if (t) railIO.observe(t);
            });
        }

        // Sanftes Einblenden beim Scrollen
        var rises = $$('.rise');
        if (rises.length) {
            if (reduced()) {
                rises.forEach(function (el) { el.classList.add('in'); });
            } else {
                var riseIO = new IntersectionObserver(function (entries) {
                    entries.forEach(function (e) {
                        if (e.isIntersecting) { e.target.classList.add('in'); riseIO.unobserve(e.target); }
                    });
                }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
                rises.forEach(function (el) { riseIO.observe(el); });
            }
        }
    }

    // ── Theme-Sync: Akzentfarbe aus den App-Einstellungen ─────────────────────
    function applyTheme(hex) {
        if (!hex || typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
        var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        var root = document.documentElement;
        root.style.setProperty('--primary', hex);
        root.style.setProperty('--primary-rgb', r + ',' + g + ',' + b);
        root.style.setProperty('--primary-dim', 'rgba(' + r + ',' + g + ',' + b + ',0.15)');
        flushTokens();
    }
    function syncTheme() {
        try {
            var raw = localStorage.getItem('tg_pro_data');
            if (!raw) return;
            var d = JSON.parse(raw);
            if (d && d.settings && d.settings.theme) applyTheme(d.settings.theme);
        } catch (e) { /* kaputter Storage darf die Seite nicht kippen */ }
    }

    // ── Gemeinsamer Footer ────────────────────────────────────────────────────
    function loadFooter() {
        var ph = document.getElementById('page-footer');
        if (!ph) return;
        fetch('/pages/footer/footer.html')
            .then(function (r) { return r.text(); })
            .then(function (html) {
                var tmpl = document.createElement('template');
                tmpl.innerHTML = html;
                ph.replaceWith(tmpl.content);
                if (typeof loadAppVersion === 'function') loadAppVersion();
            })
            .catch(function () { /* ohne Footer ist die Seite trotzdem lesbar */ });
    }

    // ── Start ─────────────────────────────────────────────────────────────────
    syncTheme();
    window.addEventListener('storage', function (e) { if (e.key === 'tg_pro_data') syncTheme(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) syncTheme(); });

    function boot() { initShell(); loadFooter(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    window.Story = {
        reduced: reduced, clamp: clamp, lerp: lerp, ease: ease,
        evToNm: evToNm, nmToEv: nmToEv, nmToRGB: nmToRGB, nmToCss: nmToCss,
        spectrumToRGB: spectrumToRGB,
        token: token, primary: primary, primaryRGB: primaryRGB,
        stage: stage, loop: loop, $: $, $$: $$, setText: setText
    };
})();
