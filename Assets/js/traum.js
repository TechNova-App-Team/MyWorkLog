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
        function zeige(z) { box.setAttribute('data-state', z); }
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
                senden(antwort).then(function () {
                    schreib(KEY_ANTWORT, antwort);
                    zeige(antwort);
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
    var sky = $('trSky'), cv = $('trGl');
    var stEls = reise.querySelectorAll('.tr-st'), giants = reise.querySelectorAll('.tr-giant');
    var railLinks = reise.querySelectorAll('.tr-rail a'), rail = $('trRail'), reiseIntro = $('trReiseIntro');
    var mqTrack = $('trMarqueeTrack'), mqSet = mqTrack && mqTrack.querySelector('.tr-marquee__set');
    var planTrack = $('trPlanTrack'), stops = plan.querySelectorAll('.tr-stop'), stopList = plan.querySelector('.tr-stops');
    var N = stEls.length;

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
        pTop = plan.offsetTop; pLen = Math.max(1, plan.offsetHeight - H);
        travel = Math.max(0, planTrack.scrollWidth - W);
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
    var sicht = { hero: true, reise: false, plan: false, marquee: false };
    var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { sicht[e.target.getAttribute('data-sicht')] = e.isIntersecting; });
    }, { rootMargin: '10% 0px 10% 0px' });
    [[hero, 'hero'], [reise, 'reise'], [plan, 'plan'], [marquee, 'marquee']].forEach(function (p) {
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
        }
        // Reise
        var p = reiseP();
        if (sicht.reise) {
            reiseIntro.classList.toggle('is-weg', p > 0.025);
            rail.classList.toggle('is-weg', p < 0.02 || p > 0.995);
            rail.style.setProperty('--fahrt', p.toFixed(4));
            var a = ys < rTop - 10 ? -1 : stationAktiv(p);
            if (a !== aktiv) {
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
        // Plan: waagerechter Schwenk, Route zeichnet sich, Stempel landen
        if (sicht.plan) {
            var pp = clamp((ys - pTop) / pLen, 0, 1);
            planTrack.style.transform = 'translate3d(' + (-pp * travel).toFixed(1) + 'px,0,0)';
            planTrack.style.setProperty('--route', pp.toFixed(4));
            planTrack.style.setProperty('--plane-x', (pp * routeW).toFixed(1) + 'px');
            stops.forEach(function (s) {
                if (s.classList.contains('is-stamped')) return;
                var r = s.getBoundingClientRect();
                if (r.left + r.width * 0.5 < W * 0.82) s.classList.add('is-stamped');
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

        var lader = new THREE.TextureLoader(), cache = {};
        function tex(src) {
            if (cache[src]) return cache[src];
            var t = lader.load(src);
            t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO;
            t.minFilter = THREE.LinearMipmapLinearFilter;
            return (cache[src] = t);
        }

        // Foto als Flaeche: runde Ecken per Abstandsfeld, Biegung aus der
        // Scrollgeschwindigkeit, Dunst nach hinten (laeuft in den Himmel aus)
        // und Ausblenden ganz nah vor der Kamera (man fliegt hindurch).
        var VS = 'uniform float uBend; uniform vec2 uSize; varying vec2 vUv; varying float vDepth;\n' +
            'void main(){ vUv=uv; vec3 p=position; float nx=p.x/(uSize.x*0.5); float ny=p.y/(uSize.y*0.5);\n' +
            '  p.z -= uBend*(nx*nx*uSize.x*0.22 + ny*ny*uSize.y*0.06);\n' +
            '  vec4 mv=modelViewMatrix*vec4(p,1.0); vDepth=-mv.z; gl_Position=projectionMatrix*mv; }';
        var FS = 'uniform sampler2D map; uniform vec2 uSize; uniform float uR; uniform float uAlpha; uniform float uFar; uniform vec3 uHaze;\n' +
            'varying vec2 vUv; varying float vDepth;\n' +
            'float box(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }\n' +
            'void main(){ vec2 px=(vUv-0.5)*uSize; float d=box(px,uSize*0.5,uR); float aa=fwidth(d);\n' +
            '  float a=1.0-smoothstep(-aa,aa,d); if(a<=0.0) discard;\n' +
            '  float fern=smoothstep(uFar*0.35,uFar,vDepth);\n' +
            '  a*= (1.0-fern) * smoothstep(1.0,7.0,vDepth) * uAlpha; if(a<=0.002) discard;\n' +
            '  vec4 c=texture2D(map,vUv); c.rgb=mix(c.rgb,uHaze,fern*0.3);\n' +
            '  gl_FragColor=vec4(c.rgb,a);\n' +
            '  #include <colorspace_fragment>\n}';
        var bilder = [];
        function foto(src, w, aspekt) {
            var h = w / aspekt;
            var mat = new THREE.ShaderMaterial({
                uniforms: {
                    map: { value: tex(src) }, uSize: { value: new THREE.Vector2(w, h) }, uR: { value: Math.min(w, h) * 0.06 },
                    uBend: { value: 0 }, uAlpha: { value: 1 }, uFar: { value: 170 }, uHaze: { value: new THREE.Color(0xe9e6f6) },
                },
                vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
            });
            var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 24, 6), mat);
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
            m.userData = { x: q[1], y: q[2], ph: i * 1.7, ry: (q[1] > 0 ? -1 : 1) * 0.18 };
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
                m.userData = { x: b[0] * sp, y: b[1], ph: i * 2 + k };
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
                if (p <= KEYS[i + 1][0]) return mix(KEYS[i][1], KEYS[i + 1][1], sm(seg(p, KEYS[i][0], KEYS[i + 1][0])));
            }
            return KEYS[KEYS.length - 1][1];
        }

        function groesse() {
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SCHMAL ? 1.6 : 2));
            renderer.setSize(W, H, false);
            cam.aspect = W / H; cam.updateProjectionMatrix();
        }

        var blick = new THREE.Vector3();
        function zeichnen(T) {
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

            wolke.forEach(function (m) {
                var u = m.userData;
                // Hochformat: Wolke nach oben ziehen, sonst liegt sie auf Einleitung und Knoepfen
                m.position.y = (SCHMAL ? u.y * 0.55 + 5 : u.y) + Math.sin(T * 0.6 + u.ph) * 0.45;
                m.position.x = u.x * (SCHMAL ? 0.55 : 1);
                m.rotation.y = u.ry + Math.sin(T * 0.4 + u.ph) * 0.05;
                m.material.uniforms.uBend.value = bend;
            });
            stationen.forEach(function (s, i) {
                var nah = Math.abs(cam.position.z - s.z) < 150;
                s.g.visible = nah;
                if (!nah) return;
                s.main.position.set(SCHMAL ? 0 : 3.6, SCHMAL ? 0.6 : 0.8, 0);
                s.main.scale.setScalar(mScale);
                s.main.rotation.y = -0.1 * s.sp + Math.sin(T * 0.35 + i) * 0.03;
                s.main.rotation.x = Math.sin(T * 0.3 + i) * 0.02;
                s.main.material.uniforms.uBend.value = bend;
                s.begleiter.forEach(function (m) {
                    var u = m.userData;
                    m.position.y = u.y + Math.sin(T * 0.7 + u.ph) * 0.35;
                    m.position.x = u.x * (SCHMAL ? 0.7 : 1);
                    m.material.uniforms.uBend.value = bend;
                });
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
