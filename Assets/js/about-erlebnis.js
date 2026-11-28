// ═══ ABOUT-ERLEBNIS MODULE ═══
// Die drei Akte oben auf /about/: 3D-Buehne (#buehne, Modul about-buehne.js),
// Film (#film, Bildfolge per Scroll) und Mitmach-Demos (#demos).
// Alle sichtbaren Woerter stehen im Markup — JS schreibt nur Zahlen und
// Uhrzeiten (sprachneutral), sonst saehe die i18n-Extraktion sie nicht.
(function () {
    'use strict';
    var Q = (function () {
        var s = document.currentScript && document.currentScript.src || '';
        var i = s.indexOf('?'); return i < 0 ? '' : s.slice(i);
    })();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function two(n) { return (n < 10 ? '0' : '') + n; }
    function uhr(min) { min = Math.round(min); return two(Math.floor(min / 60) % 24) + ':' + two(min % 60); }
    function dauer(min) {
        var neg = min < 0; min = Math.abs(Math.round(min));
        return (neg ? '−' : '') + Math.floor(min / 60) + ':' + two(min % 60) + ' h';
    }
    function saldo(min) { return (min > 0 ? '+' : '') + dauer(min); }
    function ev(name, props) { if (typeof mwlEvent === 'function') mwlEvent(name, props || {}); }

    /* ══ 1. BUEHNE ══════════════════════════════════════════════════════ */
    var bu = document.getElementById('buehne');
    function flach() { if (bu) bu.classList.add('bu-flach'); }
    (function () {
        if (!bu) return;
        if (reduce) return flach();
        var probe = document.createElement('canvas');
        var gl = null;
        try { gl = probe.getContext('webgl2') || probe.getContext('webgl'); } catch (e) { }
        if (!gl) return flach();
        var link = document.querySelector('link[rel="modulepreload"][href*="about-buehne"]');
        if (!link) return flach();
        var href = link.getAttribute('href');
        // Das Handy zeigt das erste Filmbild: am Ende der Buehne steht es dort,
        // wo .fi-phone beginnt, und der Wechsel faellt nicht auf.
        var film = document.getElementById('film');
        var laptop = bu.querySelector('img[data-rolle="laptop"]');
        var bilder = {
            laptop: laptop && laptop.getAttribute('src'),
            handy: (film ? film.getAttribute('data-frames') : '/Grafiken/about/film-1/') + 'f01.webp',
            blaetter: Array.prototype.map.call(bu.querySelectorAll('img[data-rolle="blatt"]'), function (i) { return i.getAttribute('data-src'); })
        };
        import(href).then(function (m) { return m.start(bu, { q: Q, bilder: bilder }); })
            .then(function (ok) { if (!ok) flach(); })
            .catch(function (e) { console.warn('[about] 3D aus:', e); flach(); });
    })();

    /* ══ 2. FILM ════════════════════════════════════════════════════════
       Bildfolge statt <video>: Scrubben per currentTime ruckelt an jedem
       Nicht-Schluesselbild, und im Automations-Tab laedt ein Video gar nicht.
       Die Bilder liegen unter /Grafiken/about/film-N/ (immutable gecacht —
       neue Aufnahme = neuer Ordner N+1, nie unter altem Namen ersetzen). */
    var fi = document.getElementById('film');
    (function () {
        if (!fi) return;
        var cv = fi.querySelector('canvas'), ctx = cv.getContext('2d');
        var pfad = fi.getAttribute('data-frames'), n = +fi.getAttribute('data-count');
        var caps = Array.prototype.slice.call(fi.querySelectorAll('.fi-cap'));
        var bar = fi.querySelector('.fi-bar i');
        var imgs = new Array(n), geladen = 0, angefangen = false;
        function src(i) { return pfad + 'f' + two(i + 1) + '.webp'; }
        function laden() {
            if (angefangen) return; angefangen = true;
            // erst jedes 4. Bild (grobe Vorschau), dann die Luecken
            var ord = [];
            for (var i = 0; i < n; i += 4) ord.push(i);
            for (var j = 0; j < n; j++) if (j % 4) ord.push(j);
            ord.forEach(function (k) {
                var im = new Image(); im.decoding = 'async';
                im.onload = function () { imgs[k] = im; geladen++; if (k === 0 || geladen === n) male(true); };
                im.src = src(k);
            });
        }
        new IntersectionObserver(function (es) { if (es[0].isIntersecting) laden(); }, { rootMargin: '150% 0px' }).observe(fi);

        function groesse() {
            var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
            cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
            male(true);
        }
        function naechstes(i) {
            if (imgs[i]) return imgs[i];
            for (var d = 1; d < n; d++) { if (imgs[i - d]) return imgs[i - d]; if (imgs[i + d]) return imgs[i + d]; }
            return null;
        }
        function cover(im) {
            var cw = cv.width, ch = cv.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
            var w = im.naturalWidth * s, h = im.naturalHeight * s;
            ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
        }
        var f = 0, fZiel = 0, gemalt = -1, capAn = -1, raf = 0;
        function lies() {
            var r = fi.getBoundingClientRect(), spiel = r.height - window.innerHeight;
            // Breit liegt der Film ueber dem Buehnenende (CSS). Bis er klebt,
            // bleibt er durchsichtig — sonst schoebe er sich von unten ueber
            // die laufende Buehne. Ab dem Kleben deckt er sie ab.
            fi.classList.toggle('an', r.top <= 1);
            return spiel > 0 ? clamp(-r.top / spiel, 0, 1) : 0;
        }
        function male(zwang) {
            var i = clamp(Math.round(f), 0, n - 1);
            if (i === gemalt && !zwang) return;
            var a = naechstes(i);
            if (!a) return;
            // gemalt nur setzen, wenn das ECHTE Bild da war — sonst malt der
            // naechste Lauf nach, sobald es geladen ist
            gemalt = imgs[i] ? i : -1;
            cover(a);   // kein Ueberblenden: zwei Bilder uebereinander gaben Doppelbilder
        }
        function tick() {
            raf = 0;
            var p = lies();
            fZiel = p * (n - 1);
            f += (fZiel - f) * (reduce ? 1 : 0.18);
            if (Math.abs(fZiel - f) < 0.01) f = fZiel;
            male(false);
            if (bar) bar.style.transform = 'scaleY(' + p.toFixed(4) + ')';
            fi.style.setProperty('--ein', clamp((p - 0.01) / 0.07, 0, 1).toFixed(3));
            // Kapitel: data-von = erstes Bild (1-basiert, wie die Dateinamen)
            var nr = Math.round(f) + 1, an = 0;
            caps.forEach(function (c, k) { if (nr >= +c.getAttribute('data-von')) an = k; });
            if (an !== capAn) {
                capAn = an;
                caps.forEach(function (c, k) { c.classList.toggle('on', k === an); });
            }
            if (Math.abs(fZiel - f) > 0.001) raf = requestAnimationFrame(tick);
        }
        function wecken() { if (!raf) raf = requestAnimationFrame(tick); }
        window.addEventListener('scroll', wecken, { passive: true });
        window.addEventListener('resize', groesse);
        groesse(); wecken();
    })();

    /* ══ 3. DEMOS ═══════════════════════════════════════════════════════ */
    // Reveal fuer die Demo-Karten selbst laeuft ueber [data-reveal] der Seite.

    /* 3a. Stempeluhr — 1 echte Sekunde = 24 Minuten Arbeitstag */
    (function () {
        var el = document.getElementById('deUhr');
        if (!el) return;
        var zeit = el.querySelector('.du-zeit'), track = el.querySelector('.du-track');
        var vArbeit = el.querySelector('[data-v="arbeit"]'), vSaldo = el.querySelector('[data-v="saldo"]'), vPause = el.querySelector('[data-v="pause"]');
        var bK = el.querySelector('[data-a="kommen"]'), bP = el.querySelector('[data-a="pause"]'), bG = el.querySelector('[data-a="gehen"]'), bN = el.querySelector('[data-a="neu"]');
        var START = 7 * 60 + 30, ENDE = 19 * 60, SOLL = 8 * 60, TEMPO = 24;   // Minuten je Sekunde
        var SPANNE = ENDE - START;
        var st, raf = 0, genutzt = false;
        function neu() {
            st = { z: 'aus', jetzt: START, t: 0, seit: 0, segs: [] };
            track.innerHTML = '';
            male();
        }
        function seg(typ) {
            var d = document.createElement('i'); d.className = 'du-seg du-' + typ;
            d.style.left = ((st.jetzt - START) / SPANNE * 100) + '%';
            track.appendChild(d);
            st.segs.push({ typ: typ, von: st.jetzt, bis: st.jetzt, el: d });
        }
        function summe(typ) { return st.segs.reduce(function (s, x) { return s + (x.typ === typ ? x.bis - x.von : 0); }, 0); }
        function male() {
            zeit.textContent = uhr(st.jetzt);
            el.setAttribute('data-z', st.z);
            var arbeit = summe('arbeit'), pause = summe('pause');
            vArbeit.textContent = dauer(arbeit);
            vPause.textContent = dauer(pause);
            vSaldo.textContent = st.z === 'aus' ? dauer(0) : saldo(arbeit - SOLL);
            vSaldo.classList.toggle('plus', arbeit - SOLL > 0 && st.z === 'fertig');
            vSaldo.classList.toggle('minus', arbeit - SOLL < 0 && st.z === 'fertig');
            // ArbZG § 4: ueber 6 h Arbeit brauchen 30 min Pause — die App meldet es
            el.classList.toggle('du-warn', arbeit > 360 && pause < 30);
            st.segs.forEach(function (x) { x.el.style.width = ((x.bis - x.von) / SPANNE * 100) + '%'; });
            bK.disabled = st.z !== 'aus';
            bP.disabled = st.z !== 'an' && st.z !== 'pause';
            bG.disabled = st.z !== 'an' && st.z !== 'pause';
        }
        function lauf(now) {
            raf = 0;
            if (st.z !== 'an' && st.z !== 'pause') return;
            if (st.t) st.jetzt = Math.min(ENDE, st.jetzt + (now - st.t) / 1000 * TEMPO);
            st.t = now;
            st.segs[st.segs.length - 1].bis = st.jetzt;
            if (st.jetzt >= ENDE) { st.z = 'fertig'; }
            male();
            if (st.z !== 'fertig') raf = requestAnimationFrame(lauf);
        }
        function los() { st.t = 0; if (!raf) raf = requestAnimationFrame(lauf); }
        bK.addEventListener('click', function () {
            if (!genutzt) { genutzt = true; ev('about_demo', { demo: 'stempeluhr' }); }
            st.z = 'an'; seg('arbeit'); los();
        });
        bP.addEventListener('click', function () {
            if (st.z === 'an') { st.z = 'pause'; seg('pause'); }
            else if (st.z === 'pause') { st.z = 'an'; seg('arbeit'); }
            male();
        });
        bG.addEventListener('click', function () { st.z = 'fertig'; male(); });
        bN.addEventListener('click', neu);
        neu();
    })();

    /* 3b. Woche — Feierabend je Tag ziehen, Saldo rechnet mit */
    (function () {
        var el = document.getElementById('deWoche');
        if (!el) return;
        var VON = 6 * 60, BIS = 20 * 60, SOLL = 8 * 60;
        var reihen = Array.prototype.slice.call(el.querySelectorAll('.dw-tag'));
        var vSumme = el.querySelector('[data-v="summe"]'), vSaldo = el.querySelector('[data-v="saldo"]');
        var genutzt = false;
        function pct(m) { return (m - VON) / (BIS - VON) * 100; }
        function rechne() {
            var summe = 0, soll = 0;
            reihen.forEach(function (r) {
                var schule = r.hasAttribute('data-schule');
                var a = +r.getAttribute('data-a'), e = +r.getAttribute('data-e'), p = +r.getAttribute('data-p');
                // Schultag zaehlt das volle Tagessoll, Saldo 0 — so rechnet die App
                var netto = schule ? SOLL : Math.max(0, e - a - p);
                summe += netto; soll += SOLL;
                var bar = r.querySelector('.dw-bar');
                bar.style.left = pct(a) + '%'; bar.style.width = (pct(e) - pct(a)) + '%';
                r.querySelector('.dw-wert').textContent = dauer(netto);
                var h = r.querySelector('.dw-griff');
                if (h) {
                    h.style.left = pct(e) + '%';
                    h.setAttribute('aria-valuenow', String(e));
                    h.setAttribute('aria-valuetext', uhr(e));
                    r.querySelector('.dw-ende').textContent = uhr(e);
                }
                r.classList.toggle('ueber', !schule && netto > SOLL);
                r.classList.toggle('unter', !schule && netto < SOLL);
            });
            vSumme.textContent = dauer(summe);
            vSaldo.textContent = saldo(summe - soll);
            vSaldo.classList.toggle('plus', summe > soll);
            vSaldo.classList.toggle('minus', summe < soll);
        }
        reihen.forEach(function (r) {
            var h = r.querySelector('.dw-griff');
            if (!h) return;
            var spur = r.querySelector('.dw-spur');
            function setze(m) {
                var a = +r.getAttribute('data-a') + +r.getAttribute('data-p') + 30;
                m = clamp(Math.round(m / 15) * 15, a, BIS);
                r.setAttribute('data-e', String(m));
                if (!genutzt) { genutzt = true; ev('about_demo', { demo: 'woche' }); }
                rechne();
            }
            function ausZeiger(e) {
                var b = spur.getBoundingClientRect();
                setze(VON + clamp((e.clientX - b.left) / b.width, 0, 1) * (BIS - VON));
            }
            h.addEventListener('pointerdown', function (e) {
                e.preventDefault(); h.setPointerCapture(e.pointerId); r.classList.add('zieht');
                function mv(e2) { ausZeiger(e2); }
                function up() { r.classList.remove('zieht'); h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); }
                h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
            });
            spur.addEventListener('click', function (e) { if (e.target !== h) ausZeiger(e); });
            h.addEventListener('keydown', function (e) {
                var m = +r.getAttribute('data-e');
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setze(m + 15); e.preventDefault(); }
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setze(m - 15); e.preventDefault(); }
            });
        });
        rechne();
    })();

    /* 3c. Berichtsheft — Zeilen schreiben sich, danach der Stempel */
    (function () {
        var el = document.getElementById('deHeft');
        if (!el) return;
        var knoepfe = Array.prototype.slice.call(el.querySelectorAll('[data-form]'));
        var genutzt = false;
        function zeige(form, still) {
            el.setAttribute('data-form-an', form);
            knoepfe.forEach(function (k) { k.setAttribute('aria-pressed', k.getAttribute('data-form') === form ? 'true' : 'false'); });
            var blatt = el.querySelector('.dh-text[data-form-text="' + form + '"]');
            el.querySelectorAll('.dh-text').forEach(function (t) { t.hidden = t !== blatt; });
            el.classList.remove('schreibt', 'fertig');
            if (still || reduce) { el.classList.add('fertig'); return; }
            // Zeilen schreiben nacheinander; jede bekommt ihre Dauer aus der Laenge
            var t = 0;
            blatt.querySelectorAll('.dh-z').forEach(function (z) {
                var d = Math.max(420, Math.min(1600, z.textContent.length * 26));
                z.style.setProperty('--d', d + 'ms'); z.style.setProperty('--w', t + 'ms');
                t += d + 90;
            });
            el.style.setProperty('--stempel', (t + 200) + 'ms');
            void el.offsetWidth;   // Neustart der Uebergaenge erzwingen
            el.classList.add('schreibt');
        }
        knoepfe.forEach(function (k) {
            k.addEventListener('click', function () {
                if (!genutzt) { genutzt = true; ev('about_demo', { demo: 'heft' }); }
                zeige(k.getAttribute('data-form'));
            });
        });
        var erst = true;
        new IntersectionObserver(function (es) {
            if (es[0].isIntersecting && erst) { erst = false; zeige('stich'); }
        }, { threshold: 0.45 }).observe(el);
        zeige('stich', true);
        el.classList.remove('fertig');
    })();
})();
