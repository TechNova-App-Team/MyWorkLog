// ═══ TRAUM MODULE ═══ /traum/ — Kamerafahrt durch sechs Stationen (Three.js), Frage, Plan
// Bauweise wie das Intro (components/landing/landing.js): EINE feste Leinwand,
// die Scrollposition faehrt die Kamera, Riesenschrift liegt HINTER den Fotos.
// Ebenen und Modi stehen im Kopf von traum.css. Ohne WebGL oder mit
// "Bewegung reduzieren" (html.tr-flat) laeuft hier nur die Frage.
(function () {
    'use strict';

    var ENDPOINT = 'https://ai-proxy.myworklog.de/traum';
    var KEY_ID = 'mwl_traum_id';
    var KEY_ANTWORT = 'mwl_traum_antwort';
    var root = document.documentElement;
    var GL = root.classList.contains('tr-gl');
    var FEIN = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);

    function $(id) { return document.getElementById(id); }
    function lies(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function schreib(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* privater Modus: zaehlt dann eben neu */ } }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function mix(a, b, t) { return a + (b - a) * t; }
    function sm(x) { return x * x * (3 - 2 * x); }
    // weichere Kurve fuer die Kamerafahrt: Anfahren und Abbremsen ohne Ruck (auch die Beschleunigung startet bei 0)
    function sm2(x) { return x * x * x * (x * (x * 6 - 15) + 10); }

    /* ═══ TON ═══ zum Einschalten (Schalter in der Leiste), alles synthetisch per
       WebAudio — keine Dateien. Wusch beim Stationswechsel, ein Zupfen in der
       japanischen In-Tonleiter beim Ankommen, ein dumpfer Schlag beim Stempel.
       Browser erlauben Ton erst nach einer Geste, deshalb entsteht der Kontext
       erst beim Klick; die Vorliebe merkt sich localStorage. */
    var Ton = (function () {
        var ctx = null, an = false, knopf = $('trTon');
        var EN = root.lang === 'en';
        function kontext() {
            if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }
        function setze(v) {
            an = v; schreib('mwl_traum_ton', v ? 'an' : 'aus');
            if (knopf) {
                knopf.setAttribute('aria-pressed', v ? 'true' : 'false');
                var t = v ? (EN ? 'Mute sound' : 'Ton ausschalten') : (EN ? 'Turn sound on' : 'Ton einschalten');
                knopf.setAttribute('aria-label', t); knopf.title = t;
            }
        }
        if (knopf) knopf.addEventListener('click', function () { setze(!an); if (an && kontext()) zupfen([0, 2, 4], 0); });
        // Wer den Ton anhatte, hat ihn beim naechsten Besuch wieder — sobald er irgendwo hintippt
        if (lies('mwl_traum_ton') === 'an') {
            setze(true);
            window.addEventListener('pointerdown', function einmal() { kontext(); window.removeEventListener('pointerdown', einmal); });
        }
        function bereit() { return an && ctx && ctx.state === 'running'; }
        // In-Tonleiter auf A: A, B, D, E, F (+ Oktaven)
        var LEITER = [220, 233.08, 293.66, 329.63, 349.23, 440, 466.16, 587.33, 659.25, 698.46];
        function ton(freq, wann, dauer, laut) {
            var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
            o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = freq; o2.frequency.value = freq * 2.003;
            f.type = 'lowpass'; f.frequency.value = 2400;
            g.gain.setValueAtTime(0.0001, wann);
            g.gain.exponentialRampToValueAtTime(laut, wann + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, wann + dauer);
            o.connect(f); o2.connect(f); f.connect(g); g.connect(ctx.destination);
            o.start(wann); o2.start(wann); o.stop(wann + dauer + 0.05); o2.stop(wann + dauer + 0.05);
        }
        function zupfen(stufen, versatz) {
            if (!bereit()) return;
            var t = ctx.currentTime + 0.02;
            stufen.forEach(function (st, i) { ton(LEITER[(st + versatz) % LEITER.length], t + i * 0.11, 1.4, 0.07); });
        }
        function rauschen(dauer) {
            var b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dauer), ctx.sampleRate), d = b.getChannelData(0);
            for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            var q = ctx.createBufferSource(); q.buffer = b; return q;
        }
        return {
            wusch: function () {
                if (!bereit()) return;
                var t = ctx.currentTime, q = rauschen(0.9), f = ctx.createBiquadFilter(), g = ctx.createGain();
                f.type = 'bandpass'; f.Q.value = 0.9;
                f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.45); f.frequency.exponentialRampToValueAtTime(500, t + 0.85);
                g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.88);
                q.connect(f); f.connect(g); g.connect(ctx.destination); q.start(t); q.stop(t + 0.9);
            },
            station: function (i) { zupfen([0, 2, 4], i); },
            stempel: function () {
                if (!bereit()) return;
                var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.22);
                g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
                o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.32);
                var q = rauschen(0.06), gq = ctx.createGain(); gq.gain.value = 0.12;
                q.connect(gq); gq.connect(ctx.destination); q.start(t);
                zupfen([0, 2, 4, 5], 3);
            },
        };
    })();

    /* ═══ KILOMETER ═══ Grosskreis-Entfernung aus den Koordinaten der Stationen
       (data-geo), Start und Ende Frankfurt. Keine erfundene Zahl, sondern Geometrie. */
    var FRA = [50.0379, 8.5622];
    function kmZwischen(a, b) {
        var R = 6371, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * R * Math.asin(Math.sqrt(h));
    }
    var orte = [].map.call(document.querySelectorAll('.tr-st[data-geo]'), function (st) { return st.getAttribute('data-geo').split(',').map(Number); });
    var KM_BIS = [];   // Kilometer bis zur Ankunft an Station i
    orte.forEach(function (o, i) { KM_BIS.push((i ? KM_BIS[i - 1] : 0) + kmZwischen(i ? orte[i - 1] : FRA, o)); });
    var KM_GESAMT = orte.length ? KM_BIS[KM_BIS.length - 1] + kmZwischen(orte[orte.length - 1], FRA) : 0;
    function kmText(n) { return Math.round(n).toLocaleString(root.lang === 'en' ? 'en-GB' : 'de-DE'); }
    (function () { var el = $('trPlanKm'); if (el && KM_GESAMT) el.textContent = kmText(Math.round(KM_GESAMT / 100) * 100); })();

    /* ═══ TEILEN ═══ Web Share, sonst Link kopieren */
    document.querySelectorAll('[data-teilen]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var url = location.origin + location.pathname;
            var ok = btn.parentNode.querySelector('[data-teilen-ok]');
            var daten = { title: document.title, text: (document.querySelector('meta[property="og:description"]') || {}).content || '', url: url };
            function gemeldet(weg) { if (typeof mwlEvent === 'function') mwlEvent('traum_teilen', { weg: weg }); }
            if (navigator.share) {
                navigator.share(daten).then(function () { gemeldet('share'); }).catch(function () { /* abgebrochen */ });
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function () {
                    gemeldet('kopie');
                    if (ok) { ok.classList.add('is-an'); setTimeout(function () { ok.classList.remove('is-an'); }, 2200); }
                });
            }
        });
    });

    /* ═══ DIE FRAGE ═══ laeuft in beiden Modi */
    (function frage() {
        var box = $('trAsk');
        if (!box) return;
        function geraeteId() {
            var id = lies(KEY_ID);
            if (id && /^[a-zA-Z0-9-]{8,64}$/.test(id)) return id;
            id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
                : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
            schreib(KEY_ID, id);
            return id;
        }
        var ende = $('trEnde');
        function zeige(z) {
            box.setAttribute('data-state', z);
            if (ende && z !== 'fehler') ende.setAttribute('data-state', z === 'ja' ? 'ja' : 'frage');
        }
        // Der Ja-Moment: der Block bebt, wenn der Hanko aufschlaegt (CSS-Stempel landet
        // nach ~330 ms), und die sechs Ortsstempel fliegen aus ihm heraus. Nur Deko,
        // deshalb aria-hidden und bei "Bewegung reduzieren" ganz weg.
        var ORTE = [['東京', 'ja'], ['京都', 'ja'], ['富士', 'ja'], ['北京', 'zh'], ['张家界', 'zh'], ['上海', 'zh']];
        function feuer() {
            if (!Element.prototype.animate || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
            var hanko = box.querySelector('.tr-hanko');
            var flaeche = box.closest('.tr-ask');
            setTimeout(function () {
                if (flaeche) flaeche.animate([
                    { transform: 'translate(0,0)' }, { transform: 'translate(-6px,4px)' }, { transform: 'translate(5px,-3px)' },
                    { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }
                ], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' });
                if (!hanko) return;
                var r = hanko.getBoundingClientRect(), b = box.getBoundingClientRect();
                ORTE.forEach(function (o, i) {
                    var s = document.createElement('span');
                    s.className = 'tr-burst'; s.setAttribute('aria-hidden', 'true'); s.lang = o[1]; s.textContent = o[0];
                    s.style.left = (r.left - b.left + r.width / 2) + 'px'; s.style.top = (r.top - b.top + r.height / 2) + 'px';
                    box.appendChild(s);
                    var w = (i / ORTE.length) * Math.PI * 2 - Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                    var weit = 150 + Math.random() * 110, dreh = (Math.random() - 0.5) * 70;
                    // Kurven je Abschnitt, Gesamtzeit linear: eine Kurve auf der ganzen Animation
                    // staucht die Zeit, das Ausblenden stand dann schon nach einem Drittel (gemessen).
                    s.animate([
                        { transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)', opacity: 0, easing: 'cubic-bezier(.2,1.4,.4,1)' },
                        { transform: 'translate(-50%,-50%) scale(1.15) rotate(' + dreh * 0.3 + 'deg)', opacity: 1, offset: 0.14, easing: 'cubic-bezier(.16,1,.3,1)' },
                        { opacity: 1, offset: 0.72 },
                        { transform: 'translate(calc(-50% + ' + Math.cos(w) * weit + 'px), calc(-50% + ' + (Math.sin(w) * weit + 40) + 'px)) scale(1) rotate(' + dreh + 'deg)', opacity: 0 }
                    ], { duration: 1500 + i * 60, easing: 'linear', fill: 'forwards' })
                     .onfinish = function () { s.remove(); };
                });
            }, 330);
        }
        // Lokal nicht zaehlen: der Zaehler im Worker ist der echte, Testklicks von
        // localhost wuerden ihn verfaelschen. Mit ?echt=1 laesst es sich trotzdem pruefen.
        var lokal = /^(localhost|127\.0\.0\.1|::1|)$/.test(location.hostname) && !/[?&]echt=1/.test(location.search);
        function senden(antwort) {
            if (lokal) return Promise.resolve();
            return fetch(ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: geraeteId(), antwort: antwort, lang: root.lang === 'en' ? 'en' : 'de' }),
            }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
        }
        var picks = box.querySelectorAll('.tr-pick');
        picks.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var antwort = btn.getAttribute('data-antwort');
                picks.forEach(function (b) { b.disabled = true; });
                var warJa = lies(KEY_ANTWORT) === 'ja';
                senden(antwort).then(function () {
                    if (antwort === 'ja' && !warJa) zahlPlus(1);
                    if (antwort !== 'ja' && warJa) zahlPlus(-1);
                    if (antwort === 'ja') setTimeout(Ton.stempel, 330);
                    schreib(KEY_ANTWORT, antwort);
                    zeige(antwort);
                    if (antwort === 'ja') feuer();
                    if (typeof mwlEvent === 'function') mwlEvent('traum_antwort', { antwort: antwort });
                }).catch(function () { zeige('fehler'); })
                  .then(function () { picks.forEach(function (b) { b.disabled = false; }); });
            });
        });
        var aendern = $('trAendern');
        if (aendern) aendern.addEventListener('click', function () {
            zeige('frage');
            var erster = box.querySelector('.tr-pick');
            if (erster) erster.focus();
        });
        var gemerkt = lies(KEY_ANTWORT);
        if (gemerkt === 'ja' || gemerkt === 'nein') zeige(gemerkt);

        // Sozialer Beweis — nur die echte Zahl vom Worker, erst ab MIN_ZAHL sichtbar
        // (eine "1" wirkt wie eine leere Party). Keine Schaetzung, kein Aufrunden.
        var MIN_ZAHL = 3, zahl = null, proof = $('trProof');
        function zeigeZahl() {
            if (!proof || zahl === null) return;
            var txt = zahl.toLocaleString(root.lang === 'en' ? 'en-GB' : 'de-DE');
            proof.classList.toggle('is-an', zahl >= MIN_ZAHL);
            $('trProofN').textContent = txt;
            var hp = $('trHeroProof');   // dieselbe Zahl schon im Einstieg
            if (hp) { hp.classList.toggle('is-an', zahl >= MIN_ZAHL); $('trHeroProofN').textContent = txt; }
            var dots = proof.querySelector('.tr-proof__dots');
            if (dots && !dots.children.length) {
                for (var i = 0; i < 4; i++) { var d = document.createElement('i'); d.style.setProperty('--r', (i % 2 ? 7 : -9) + 'deg'); dots.appendChild(d); }
            }
        }
        function zahlPlus(n) { if (zahl !== null && !lokal) { zahl = Math.max(0, zahl + n); zeigeZahl(); } }
        if (window.fetch) fetch(ENDPOINT + '?zahl=1').then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { if (d && typeof d.ja === 'number') { zahl = d.ja; zeigeZahl(); } }).catch(function () {});
    })();

    // "Zur Frage" in der Leiste ausblenden, solange die Frage im Bild ist
    var nav = $('trNav'), frageEl = $('frage');
    if (nav && frageEl && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { nav.classList.toggle('is-frage', e[0].isIntersecting); },
            { threshold: 0.45 }).observe(frageEl);
    }

    if (!GL) return;

    /* ═══ DOM-Teile der Fahrt ═══ */
    var hero = $('trHero'), reise = $('reise'), plan = $('plan'), marquee = $('trMarquee');
    var lines = hero.querySelectorAll('.tr-line');
    // Titel in Buchstaben zerlegen: sie weichen dem Mauszeiger aus und federn
    // zurueck (nur feiner Zeiger). Text bleibt im h1, nur in Spans gefasst.
    var buchstaben = [];
    setTimeout(function () { hero.classList.add('is-frei'); }, 1700);   // Aufstieg (1,2 s + 0,2 s Versatz) ist durch
    if (FEIN) hero.querySelectorAll('.tr-mask > span').forEach(function (sp) {
        var t = sp.textContent; sp.textContent = '';
        t.split('').forEach(function (ch) {
            if (ch === ' ') { sp.appendChild(document.createTextNode(' ')); return; }
            var b = document.createElement('span'); b.className = 'tr-bu'; b.textContent = ch;
            sp.appendChild(b); buchstaben.push({ el: b, x: 0, y: 0, r: 0 });
        });
    });
    var sky = $('trSky'), cv = $('trGl');
    var stEls = reise.querySelectorAll('.tr-st'), giants = reise.querySelectorAll('.tr-giant');
    var railLinks = reise.querySelectorAll('.tr-rail a'), rail = $('trRail'), reiseIntro = $('trReiseIntro');
    var mqTrack = $('trMarqueeTrack'), mqSet = mqTrack && mqTrack.querySelector('.tr-marquee__set');
    var planTrack = $('trPlanTrack'), stops = plan.querySelectorAll('.tr-stop'), stopList = plan.querySelector('.tr-stops');
    var N = stEls.length;
    var kmEl = $('trKm'), kmAlt = -1;
    var brief = $('brief'), woerter = [];

    // Brief in Woerter zerlegen (nur hier, in der Fahrt) — sie leuchten beim Scrollen auf
    if (brief) $('trBriefText').querySelectorAll('p').forEach(function (p) {
        var teile = p.textContent.split(/(\s+)/);
        p.textContent = '';
        teile.forEach(function (t) {
            if (!t.trim()) { p.appendChild(document.createTextNode(t)); return; }
            var w = document.createElement('span'); w.className = 'tr-wort'; w.textContent = t;
            p.appendChild(w); woerter.push(w);
        });
    });
    var briefAn = -1;

    // Kilometer bis zum Fortschritt p der Reise (Ankunft an Station i bei (i+0.3)/N)
    function kmBei(p) {
        var f = p * N - 0.3;
        if (f <= -0.3) return 0;
        if (f < 0) return KM_BIS[0] * sm((f + 0.3) / 0.3);
        var i = Math.floor(f);
        if (i >= N - 1) return KM_BIS[N - 1];
        return mix(KM_BIS[i], KM_BIS[i + 1], sm(f - i));
    }

    // Riesenworte in Buchstaben teilen (sie steigen einzeln auf)
    giants.forEach(function (g) {
        var w = g.querySelector('.tr-giant__w');
        var t = w.textContent;
        w.textContent = '';
        t.split('').forEach(function (ch, i) {
            var s = document.createElement('span');
            s.className = 'tr-ch'; s.style.setProperty('--i', i); s.textContent = ch;
            w.appendChild(s);
        });
        w.style.setProperty('--len', t.length);
    });

    // Himmelsfarbe je Station (data-sky="oben,unten"), Station -1 = Einstieg
    function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
    var HIMMEL = [[hex('#c6cdee'), hex('#ecdfee')]];
    stEls.forEach(function (st) { var c = (st.getAttribute('data-sky') || '#c6cdee,#ecdfee').split(','); HIMMEL.push([hex(c[0]), hex(c[1])]); });
    function farbe(a, b, t) { return 'rgb(' + Math.round(mix(a[0], b[0], t)) + ',' + Math.round(mix(a[1], b[1], t)) + ',' + Math.round(mix(a[2], b[2], t)) + ')'; }

    /* ═══ Masse ═══ */
    var W, H, heroH, rTop, rLen, pTop, pLen, travel, routeW, mqHalf, SCHMAL;
    function messen() {
        W = window.innerWidth; H = window.innerHeight; SCHMAL = W / H < 1;
        heroH = hero.offsetHeight;
        rTop = reise.offsetTop; rLen = Math.max(1, reise.offsetHeight - H);
        travel = Math.max(0, planTrack.scrollWidth - W);
        // Scrollweg = Schiebeweg (+ etwas Ruhe an den Enden). Eine feste Hoehe in CSS
        // war auf breiten Schirmen tot: bei 2560 px passten alle Karten nebeneinander,
        // 5 px Weg auf 4900 px Scrollen (gemessen 05.10.) — "da macht es nix".
        plan.style.height = Math.round(H + travel * 1.1 + H * 0.35) + 'px';
        pTop = plan.offsetTop; pLen = Math.max(1, plan.offsetHeight - H);
        routeW = stopList.offsetWidth;
        planTrack.style.setProperty('--route-w', routeW + 'px');
        mqHalf = mqSet ? mqSet.offsetWidth : 1;
        if (G) G.groesse();
    }

    /* ═══ Geglaettete Scrollposition ═══ Traegheit wie im Intro: feste 16-ms-
       Schritte, nie dt als Faktor (sonst schaukelt es sich bei langsamen Bildern auf) */
    var ys = -1, vel = 0, richtung = 1;
    var mx = 0, my = 0, tmx = 0, tmy = 0;
    if (FEIN) window.addEventListener('pointermove', function (e) { tmx = e.clientX / W * 2 - 1; tmy = e.clientY / H * 2 - 1; }, { passive: true });
    function schritt() {
        var y = window.scrollY;
        if (ys < 0) ys = y;
        var alt = ys;
        ys += (y - ys) * 0.12;
        if (Math.abs(y - ys) < 0.05) ys = y;
        var d = (ys - alt) / H;
        vel = mix(vel, d, 0.25);
        if (Math.abs(d) > 0.0005) richtung = d > 0 ? 1 : -1;
        mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    }

    /* ═══ Was ist im Bild ═══ nur das rechnen */
    var sicht = { hero: true, reise: false, plan: false, marquee: false, brief: false };
    var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { sicht[e.target.getAttribute('data-sicht')] = e.isIntersecting; });
    }, { rootMargin: '10% 0px 10% 0px' });
    [[hero, 'hero'], [reise, 'reise'], [plan, 'plan'], [marquee, 'marquee'], [brief, 'brief']].forEach(function (p) {
        p[0].setAttribute('data-sicht', p[1]); io.observe(p[0]);
    });

    /* ═══ Fahrt: Fortschritt → Station ═══ */
    function reiseP() { return clamp((ys - rTop) / rLen, 0, 1); }
    // Kamera haelt an jeder Station (zwischen 0.3 und 0.7 ihres Abschnitts)
    function stationAktiv(p) {
        var f = p * N, i = Math.floor(f), t = f - i;
        if (i >= N) return N - 1;
        return (t > 0.14 && t < 0.92) || (i === N - 1 && t >= 0.92) ? i : -1;
    }

    var aktiv = -2, himmelAlt = '';
    function dom() {
        // Einstieg: Zeilen laufen gegeneinander aus dem Bild
        if (sicht.hero) {
            var pH = clamp(ys / heroH, 0, 1.2);
            lines.forEach(function (l) { l.style.transform = 'translate3d(' + (Number(l.getAttribute('data-dir')) * pH * 22).toFixed(3) + 'vw,0,0)'; });
            if (buchstaben.length) {
                // erst alle lesen, dann schreiben; Ziel = weg vom Zeiger, Feder zieht zurueck
                var px = (tmx + 1) / 2 * W, py = (tmy + 1) / 2 * H, R = Math.min(190, W * 0.14);
                var mitte = buchstaben.map(function (b) { var r = b.el.getBoundingClientRect(); return [r.left + r.width / 2 - b.x, r.top + r.height / 2 - b.y]; });
                buchstaben.forEach(function (b, i) {
                    var dx = mitte[i][0] - px, dy = mitte[i][1] - py, d = Math.sqrt(dx * dx + dy * dy) || 1;
                    var k = d < R ? Math.pow(1 - d / R, 2) : 0;
                    var zx = dx / d * k * 34, zy = dy / d * k * 26, zr = (dx > 0 ? 1 : -1) * k * 9;
                    b.x += (zx - b.x) * 0.16; b.y += (zy - b.y) * 0.16; b.r += (zr - b.r) * 0.16;
                    if (Math.abs(b.x) + Math.abs(b.y) > 0.05 || k) b.el.style.transform = 'translate3d(' + b.x.toFixed(2) + 'px,' + b.y.toFixed(2) + 'px,0) rotate(' + b.r.toFixed(2) + 'deg)';
                    else if (b.el.style.transform) b.el.style.transform = '';
                });
            }
        }
        // Reise
        var p = reiseP();
        if (sicht.reise) {
            reiseIntro.classList.toggle('is-weg', p > 0.025);
            rail.classList.toggle('is-weg', p < 0.02 || p > 0.995);
            rail.style.setProperty('--fahrt', p.toFixed(4));
            var km = Math.round(kmBei(p) / 10) * 10;
            if (kmEl && km !== kmAlt) { kmAlt = km; kmEl.textContent = kmText(km); }
            var a = ys < rTop - 10 ? -1 : stationAktiv(p);
            if (a !== aktiv) {
                if (a >= 0) { Ton.wusch(); setTimeout(function () { Ton.station(a); }, 380); }
                aktiv = a;
                stEls.forEach(function (s, i) { s.classList.toggle('is-on', i === a); });
                giants.forEach(function (g, i) { g.classList.toggle('is-on', i === a); });
                railLinks.forEach(function (l, i) { l.classList.toggle('is-on', i === a); });
            }
        }
        // Himmel: Einstieg → Stationen, weich ueberblendet
        var f = ys < rTop ? 0 : clamp(p * N + 0.5, 0, N);
        var i0 = Math.floor(f), t = sm(f - i0), i1 = Math.min(N, i0 + 1);
        var h = farbe(HIMMEL[i0][0], HIMMEL[i1][0], t) + '|' + farbe(HIMMEL[i0][1], HIMMEL[i1][1], t);
        if (h !== himmelAlt) {
            himmelAlt = h; var hh = h.split('|');
            sky.style.setProperty('--sky-a', hh[0]); sky.style.setProperty('--sky-b', hh[1]);
        }
        // Laufband: Tempo aus der Scrollgeschwindigkeit, Richtung kippt mit der Scrollrichtung
        if (sicht.marquee && mqTrack) {
            mqOff += richtung * (1.1 + Math.min(18, Math.abs(vel) * 900));
            mqOff = ((mqOff % mqHalf) + mqHalf) % mqHalf;
            mqTrack.style.transform = 'translate3d(' + (-mqOff).toFixed(1) + 'px,0,0)';
        }
        // Brief: Woerter leuchten der Reihe nach auf, waehrend er durchs Bild zieht
        if (sicht.brief && woerter.length) {
            var bt = brief.offsetTop, bh = brief.offsetHeight;
            var pb = clamp((ys + H * 0.72 - bt) / (bh * 0.75), 0, 1);
            var bis = Math.round(pb * woerter.length);
            if (bis !== briefAn) { briefAn = bis; woerter.forEach(function (w, i) { w.classList.toggle('is-an', i < bis); }); }
        }
        // Plan: waagerechter Schwenk, Route zeichnet sich, Stempel landen
        if (sicht.plan) {
            var pp = clamp((ys - pTop) / pLen, 0, 1);
            planTrack.style.transform = 'translate3d(' + (-pp * travel).toFixed(1) + 'px,0,0)';
            planTrack.style.setProperty('--route', pp.toFixed(4));
            planTrack.style.setProperty('--plane-x', (pp * routeW).toFixed(1) + 'px');
            // erst alle messen, dann schreiben (kein Layout-Wechselspiel je Karte).
            // Stempel-Schwelle 0.88: die letzte Karte kommt am Ende nur bis ~0.8 W (gemessen 1920 px)
            var mitten = [];
            stops.forEach(function (s) { var r = s.getBoundingClientRect(); mitten.push(r.left + r.width * 0.5); });
            stops.forEach(function (s, i) {
                // Karte hebt sich, waehrend sie durch die Bildmitte laeuft
                var nah = 1 - Math.min(1, Math.abs(mitten[i] - W * 0.5) / (W * 0.6));
                s.style.transform = 'translate3d(0,' + (-sm(nah) * 26).toFixed(1) + 'px,0)';
                if (!s.classList.contains('is-stamped') && mitten[i] < W * 0.88) s.classList.add('is-stamped');
            });
        }
    }
    var mqOff = 0;

    // Rail: zur Station springen (Mitte ihres Abschnitts)
    railLinks.forEach(function (l) {
        l.addEventListener('click', function (e) {
            e.preventDefault();
            var i = Number(l.getAttribute('data-go'));
            window.scrollTo({ top: rTop + (i + 0.5) / N * rLen, behavior: 'smooth' });
        });
    });

    /* ═══ SZENE ═══ */
    var G = null;
    function szeneBauen(THREE) {
        var renderer;
        try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
        catch (e) { console.warn('[traum] WebGL aus:', e); return null; }
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        var ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        var scene = new THREE.Scene();
        var cam = new THREE.PerspectiveCamera(40, 1, 0.5, 400);

        // Texturen erst laden, wenn die Kamera in die Naehe kommt (laden()) — vorher
        // gingen beim Seitenaufruf alle 36 Bilder raus, 3,4 MB (gemessen 05.10.).
        // Bis dahin traegt die Flaeche einen 1x1-Platzhalter und uBereit = 0.
        var lader = new THREE.TextureLoader(), cache = {};
        var LEER = new THREE.DataTexture(new Uint8Array([233, 230, 246, 255]), 1, 1); LEER.needsUpdate = true;
        function tex(src, fertig) {
            var c = cache[src];
            if (!c) {
                c = cache[src] = { t: null, warten: [] };
                lader.load(src, function (t) {
                    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; t.minFilter = THREE.LinearMipmapLinearFilter;
                    c.t = t; c.warten.forEach(function (f) { f(t); }); c.warten = [];
                });
            }
            if (c.t) fertig(c.t); else c.warten.push(fertig);
        }
        function laden(m) {
            var u = m.userData;
            if (u.angefragt) return;
            u.angefragt = true;
            tex(u.src, function (t) { m.material.uniforms.map.value = t; u.da = true; });
        }

        // Foto als Flaeche: runde Ecken per Abstandsfeld, Biegung aus der
        // Scrollgeschwindigkeit, Dunst nach hinten (laeuft in den Himmel aus)
        // und Ausblenden ganz nah vor der Kamera (man fliegt hindurch).
        // Tempo wird sichtbar: bei schnellem Scrollen streckt sich das Bild in
        // Fahrtrichtung und die Farbkanaele laufen auseinander (uBend kommt aus der
        // Scrollgeschwindigkeit). uHov: Zeiger liegt auf dem Bild → Dunst weg, heller.
        var VS = 'uniform float uBend; uniform vec2 uSize; varying vec2 vUv; varying float vDepth;\n' +
            'void main(){ vUv=uv; vec3 p=position; float nx=p.x/(uSize.x*0.5); float ny=p.y/(uSize.y*0.5);\n' +
            '  p.z -= uBend*(nx*nx*uSize.x*0.22 + ny*ny*uSize.y*0.06);\n' +
            '  p.y *= 1.0 + abs(uBend)*0.18;\n' +
            '  vec4 mv=modelViewMatrix*vec4(p,1.0); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }';
        var FS = 'uniform sampler2D map; uniform vec2 uSize; uniform float uR; uniform float uAlpha; uniform float uFar; uniform vec3 uHaze; uniform float uBend; uniform float uHov; uniform float uBereit;\n' +
            'varying vec2 vUv; varying float vDepth;\n' +
            'float box(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }\n' +
            'void main(){ vec2 px=(vUv-0.5)*uSize; float d=box(px,uSize*0.5,uR); float aa=fwidth(d);\n' +
            '  float a=1.0-smoothstep(-aa,aa,d); if(a<=0.0) discard;\n' +
            '  float fern=smoothstep(uFar*0.35,uFar,vDepth)*(1.0-uHov);\n' +
            '  a*= (1.0-fern) * smoothstep(3.0,11.0,vDepth) * uAlpha * uBereit; if(a<=0.002) discard;\n' +
            '  vec2 rgb=vec2(0.0, uBend*0.035);\n' +
            '  vec4 c=texture2D(map,vUv); c.r=texture2D(map,vUv+rgb).r; c.b=texture2D(map,vUv-rgb).b;\n' +
            '  c.rgb=mix(c.rgb,uHaze,fern*0.3); c.rgb*=1.0+uHov*0.08;\n' +
            '  gl_FragColor=vec4(c.rgb,a);\n' +
            '  #include <colorspace_fragment>\n}';
        var bilder = [];
        function foto(src, w, aspekt) {
            var h = w / aspekt;
            var mat = new THREE.ShaderMaterial({
                uniforms: {
                    map: { value: LEER }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: Math.min(w, h) * 0.06 },
                    uBend: { value: 0 }, uAlpha: { value: 1 }, uFar: { value: 170 }, uHaze: { value: new THREE.Color(0xe9e6f6) }, uHov: { value: 0 }, uBereit: { value: 0 },
                },
                vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
            });
            var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 24, 6), mat);
            m.userData.src = src;
            bilder.push(m);
            return m;
        }
        function aspektVon(img) { var w = Number(img.getAttribute('width')), h = Number(img.getAttribute('height')); return w && h ? w / h : 1.5; }

        /* — Wolke um den Einstieg: rahmt die Riesenschrift, liegt davor — */
        var WOLKE = [
            ['tokio-shinjuku', -21, 9, -24, 9], ['kyoto-yasaka', 19, 9.5, -14, 7.5], ['miyajima', 24, -6, -36, 10],
            ['chahan', -25, 2.5, -6, 6], ['kirschbluete', 4, 13, -46, 9], ['mauer-badaling', 34, 4, -62, 11],
            ['fuji-abend', -34, -1, -58, 12], ['shanghai-ufer', 9, -12, -30, 8], ['kyoto-bambus', -6, -15, -52, 9],
            ['osaka-dotonbori', 30, 13, -40, 6.5],
        ];
        var wolke = WOLKE.map(function (q, i) {
            var asp = q[0] === 'osaka-dotonbori' ? 900 / 1101 : 1.5;
            var m = foto('/Grafiken/traum/' + q[0] + '-900.webp', q[4], asp);
            m.position.set(q[1], q[2], q[3]);
            Object.assign(m.userData, { x: q[1], y: q[2], z: q[3], ph: i * 1.7, ry: (q[1] > 0 ? -1 : 1) * 0.18 });
            scene.add(m);
            return m;
        });

        /* — Stationen: Hauptbild + drei Begleiter, in der Tiefe gestaffelt — */
        var ABST = 78, Z0 = -70;
        var BEGLEIT = [[-13.5, 5.8, -14, 8.2, 0.32], [14.5, -5.2, -27, 9, -0.28], [-11, -7.4, -40, 7.2, 0.22]];
        var gross = W > 1100 && (window.devicePixelRatio || 1) >= 1;
        var stationen = [];
        stEls.forEach(function (st, i) {
            var g = new THREE.Group(), z = Z0 - i * ABST, sp = i % 2 ? -1 : 1;
            var imgs = st.querySelectorAll('.tr-st__pics img');
            var haupt = imgs[0];
            var src = (gross && haupt.getAttribute('data-hd')) || haupt.getAttribute('src');
            var main = foto(src, 14.5, aspektVon(haupt));
            g.add(main);
            var begleiter = [];
            for (var k = 1; k < imgs.length && k <= 3; k++) {
                var b = BEGLEIT[k - 1];
                var m = foto(imgs[k].getAttribute('src'), b[3], aspektVon(imgs[k]));
                m.position.set(b[0] * sp, b[1], b[2]);
                m.rotation.y = b[4] * sp;
                Object.assign(m.userData, { x: b[0] * sp, y: b[1], ph: i * 2 + k });
                g.add(m); begleiter.push(m);
            }
            g.position.z = z;
            scene.add(g);
            stationen.push({ g: g, main: main, begleiter: begleiter, z: z, sp: sp });
        });

        // Kamerahaltepunkte ueber dem Reise-Fortschritt
        var KEYS = [[0, 16]];
        stationen.forEach(function (s, i) { KEYS.push([(i + 0.3) / N, s.z + 29], [(i + 0.72) / N, s.z + 23]); });
        KEYS.push([1, stationen[N - 1].z + 6]);
        function kameraZ(p) {
            for (var i = 0; i < KEYS.length - 1; i++) {
                if (p <= KEYS[i + 1][0]) return mix(KEYS[i][1], KEYS[i + 1][1], sm2(seg(p, KEYS[i][0], KEYS[i + 1][0])));
            }
            return KEYS[KEYS.length - 1][1];
        }

        function groesse() {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SCHMAL ? 1.6 : 2));
            renderer.setSize(W, H, false);
            cam.aspect = W / H; cam.updateProjectionMatrix();
        }

        var blick = new THREE.Vector3();
        var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), T0 = -1;
        function zeichnen(T) {
            if (T0 < 0) T0 = T;   // Warp-Auftakt zaehlt ab dem ersten Bild der Szene, nicht ab Seitenstart
            var asp = W / H;
            var z;
            if (ys < rTop) z = 30 - clamp(ys / heroH, 0, 1) * 14;
            else z = kameraZ(reiseP());
            var cx = mx * 2.2, cy = -my * 1.4;
            cam.position.set(cx, cy, z);
            blick.set(cx * 0.35, cy * 0.35, z - 30);
            cam.lookAt(blick);
            cam.rotation.z = clamp(-vel * 3, -0.06, 0.06);

            var bend = clamp(vel * 7, -0.9, 0.9);
            // Schmal (Hochformat): Hauptbild kleiner und ueber die Textkarte
            var mScale = SCHMAL ? clamp(asp * 1.35, 0.5, 1) : 1;

            // Vorhang statt Aufprall: was die Kamera gleich passiert, weicht zur Seite aus,
            // dreht sich weg und blendet aus, BEVOR es den Bildschirm fuellt (Nutzer 05.10.:
            // "damit das Bild ned so in die Fresse knallt"). k: 0 ab 18 Einheiten Abstand, 1 bei 5.
            function weichen(abstand) { return sm(seg(18 - abstand, 0, 13)); }
            function ausblenden(m, k) { m.material.uniforms.uAlpha.value = 1 - sm(seg(k, 0.25, 0.95)); }

            // Geladene Bilder blenden weich ein statt aufzuploppen
            bilder.forEach(function (m) {
                var u = m.userData;
                if (u.da && u.bereit !== 1) { u.bereit = Math.min(1, (u.bereit || 0) + 0.04); m.material.uniforms.uBereit.value = u.bereit; }
            });
            wolke.forEach(function (m, i) {
                laden(m);
                var u = m.userData;
                // Warp: die Wolke schiesst beim Laden gestaffelt aus 240 Einheiten Tiefe an
                // ihren Platz, gebogen wie bei Lichtgeschwindigkeit — der erste Eindruck.
                var e = sm2(clamp((T - T0 - 0.15 - i * 0.09) / 1.7, 0, 1));
                m.position.z = u.z - (1 - e) * 240;
                var k = weichen(cam.position.z - m.position.z);
                // Hochformat: Wolke in die freie Mitte zwischen Titel und Einleitung stauchen —
                // oben verdeckt sie den Titel, unten Einleitung und Knoepfe (beides gemessen)
                m.position.y = (SCHMAL ? u.y * 0.35 + 0.5 : u.y) + Math.sin(T * 0.6 + u.ph) * 0.45;
                m.position.x = u.x * (SCHMAL ? 0.55 : 1) * (1 + k * 1.4);
                m.rotation.y = u.ry + Math.sin(T * 0.4 + u.ph) * 0.05 + (u.x > 0 ? -1 : 1) * k * 0.8;
                ausblenden(m, k);
                m.material.uniforms.uAlpha.value *= Math.min(1, e * 2.5);
                m.material.uniforms.uBend.value = bend + (1 - e) * 0.8;
                u.basis = 1;
            });
            stationen.forEach(function (s, i) {
                // Vorausladen: eine Station vor der Kamera (Abstand 78) plus Reserve
                if (Math.abs(cam.position.z - s.z) < 175) { laden(s.main); s.begleiter.forEach(laden); }
                var nah = Math.abs(cam.position.z - s.z) < 150;
                s.g.visible = nah;
                if (!nah) return;
                var k = weichen(cam.position.z - s.z);
                s.main.position.set((SCHMAL ? 0 : 3.6) + s.sp * k * 20, (SCHMAL ? 0.6 : 0.8) + k * 1.5, 0);
                s.main.userData.basis = mScale;
                s.main.rotation.y = -0.1 * s.sp + Math.sin(T * 0.35 + i) * 0.03 + s.sp * k * 0.9;
                ausblenden(s.main, k);
                s.main.rotation.x = Math.sin(T * 0.3 + i) * 0.02;
                s.main.material.uniforms.uBend.value = bend;
                s.begleiter.forEach(function (m) {
                    var u = m.userData;
                    m.position.y = u.y + Math.sin(T * 0.7 + u.ph) * 0.35;
                    var kb = weichen(cam.position.z - (s.z + m.position.z));
                    m.position.x = u.x * (SCHMAL ? 0.7 : 1) * (1 + kb * 1.6);
                    ausblenden(m, kb);
                    m.material.uniforms.uBend.value = bend;
                    if (u.ry0 === undefined) u.ry0 = m.rotation.y;
                    m.rotation.y = u.ry0;
                    u.basis = 1;
                });
            });

            // Zeiger (nur Maus): das Bild darunter kommt nach vorn, neigt sich zum
            // Zeiger und verliert den Dunst. Raycaster prueft "visible" nicht selbst.
            var treffer = null;
            if (FEIN) {
                ndc.set(tmx, -tmy); ray.setFromCamera(ndc, cam);
                var kandidaten = bilder.filter(function (m) { return m.parent && m.parent.visible && m.material.uniforms.uAlpha.value > 0.5; });
                var hit = ray.intersectObjects(kandidaten, false);
                treffer = hit.length ? hit[0].object : null;
            }
            bilder.forEach(function (m) {
                var u = m.userData;
                u.h = mix(u.h || 0, m === treffer ? 1 : 0, 0.1);
                m.scale.setScalar((u.basis || 1) * (1 + u.h * 0.07));
                m.rotation.y += u.h * tmx * 0.22;
                m.rotation.x = (m.rotation.x * (1 - u.h)) + u.h * tmy * 0.16;
                m.material.uniforms.uHov.value = u.h;
            });
            renderer.render(scene, cam);
        }
        return { groesse: groesse, zeichnen: zeichnen };
    }

    /* ═══ SCHLEIFE ═══ */
    var rafId = null, t0 = 0, last = 0, rest = 0;
    function tick(now) {
        rafId = null;
        if (document.hidden) return;
        if (!t0) t0 = now;
        rest += Math.min(100, last ? now - last : 16); last = now;
        for (var n = 0; rest >= 16 && n < 6; n++) { rest -= 16; schritt(); }
        dom();
        if (G && (sicht.hero || sicht.reise)) G.zeichnen((now - t0) / 1000);
        rafId = requestAnimationFrame(tick);
    }
    function wecken() { if (!rafId) rafId = requestAnimationFrame(tick); }

    window.addEventListener('resize', messen, { passive: true });
    window.addEventListener('load', messen);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { last = 0; wecken(); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(messen);
    messen(); schritt(); wecken();

    import('/Assets/js/vendor/three-0.186.1/three.module.js?v=3bc833fceb').then(function (THREE) {
        G = szeneBauen(THREE);
        if (G) { messen(); root.classList.add('tr-gl-an'); }
    }).catch(function (e) { console.warn('[traum] Three.js nicht geladen:', e); });
})();
