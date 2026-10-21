// ═══ ARCHFLOW 3D MODULE ═══
// /archflow/ Ansicht „3D“: der Quellcode als neuronales Netz im Raum. Gruppe =
// Hirnareal (kugeliger Cluster mit Nebelschimmer), Datei = Neuron (Kern + Dendriten,
// Groesse = Verbindungen), Farbe = Dateiart (TC der Seite), Verbindung = gebuendelte
// Nervenbahn mit Lichtimpuls vom Lader zur geladenen Datei.
//
// Haengt an den Globals des Hauptskripts der Seite (NODES, EDGES, GROUPS, RAW, sel,
// hov, filterType, searchQ, TC, selectNode, closeDetail, showTT, hideTT, nachbarn).
// Das Hauptskript ruft window.AF3D nur, solange layout === '3d'.
//
// Werdegang 21.10.2026 (ein Abend, sechs Fassungen): ruhige Stadt -> Nachtstadt ->
// Planet mit Glastuermen -> Planet mit Boden -> Datenwald -> dieses Netz. Der Nutzer
// wollte ausdruecklich „3D, nichts Flaches“ und keine Haeuser/Baeume. Nicht zu einer
// der Vorfassungen zurueckbauen. Bewusst viel Effekt (Bloom, Impulse, Nebel, Staub);
// prefers-reduced-motion: kein Anflug, keine Impulse, kein Drehen, kein Flackern.
//
// Bloom ist selbst gebaut, weil im Repo nur three.module.js liegt (keine examples/jsm).
(function () {
    'use strict';

    var canvas = document.getElementById('cvs3');
    if (!canvas) return;
    var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function webglDa() {
        try { var c = document.createElement('canvas'); return !!c.getContext('webgl2'); }
        catch (e) { return false; }
    }

    var modul = null, laden = null, wartend = false;
    function holen() {
        if (!laden) {
            laden = import('/Assets/js/vendor/three-0.186.1/three.module.js?v=3bc833fceb')
                .then(function (THREE) { modul = baue(THREE); return modul; });
        }
        return laden;
    }

    window.AF3D = {
        verfuegbar: webglDa(),
        start: function () { wartend = true; return holen().then(function (m) { if (wartend) m.an(); return m; }); },
        pause: function () { wartend = false; if (modul) modul.aus(); },
        sync: function () { if (modul) modul.sync(); },
        resize: function () { if (modul) modul.groesse(); },
        home: function () { if (modul) modul.heim(); },
        zoom: function (f) { if (modul) modul.zoom(f); },
        fly: function (id) { if (modul) modul.flieg(id); },
        png: function () { return modul ? modul.png() : null; }
    };

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    // Deterministischer Zufall: dieselbe Datei sieht bei jedem Laden gleich aus
    function zufall(s) { var x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

    function baue(THREE) {
        var V = THREE.Vector3;
        var wrap = canvas.parentElement;
        var schmal = window.innerWidth < 768;
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, schmal ? 1.5 : 1.75));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.setClearColor(0x010103, 1);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 3000);
        var akzent = new THREE.Color((getComputedStyle(document.documentElement).getPropertyValue('--primary') || '').trim() || '#5578a8');
        var akzentHell = akzent.clone().lerp(new THREE.Color('#bcd2ff'), 0.55);
        var uZeit = { value: 0 }, uIntro = { value: RM ? 99 : 0 }, uFluss = { value: RM ? 1 : 0 }, uRuhe = { value: RM ? 1 : 0 };
        var uPx = { value: renderer.getPixelRatio() };

        // ── Layout: Areale auf einer 3D-Spirale, grosse innen; Neuronen als Fibonacci-Ball ──
        var gruppen = GROUPS.map(function (g) {
            var files = g.files.filter(function (f) { return RAW.nodes[f]; });
            return { g: g, files: files, rc: 1.6 + Math.cbrt(files.length) * 2.15 };
        }).filter(function (b) { return b.files.length; }).sort(function (a, b) { return b.files.length - a.files.length; });
        var NG = gruppen.length, gold = Math.PI * (3 - Math.sqrt(5));
        gruppen.forEach(function (b, i) {
            var y = 1 - (i + 0.5) / NG * 2, q = Math.sqrt(1 - y * y), a = i * gold;
            var r = 6 + 52 * Math.sqrt((i + 0.5) / NG);
            b.c = new V(Math.cos(a) * q * r, y * r * 0.62, Math.sin(a) * q * r);
        });
        // Entzerren: Areale duerfen sich nicht durchdringen
        for (var it = 0; it < 80; it++) {
            for (var i = 0; i < NG; i++) for (var k = i + 1; k < NG; k++) {
                var A = gruppen[i], B = gruppen[k], d = A.c.distanceTo(B.c), soll = A.rc + B.rc + 3.5;
                if (d < soll) {
                    var schub = new V().subVectors(B.c, A.c).normalize().multiplyScalar((soll - d) * 0.5);
                    if (!isFinite(schub.x)) schub.set(0.1, 0, 0);
                    A.c.sub(schub); B.c.add(schub);
                }
            }
        }
        var pos = {}, gross = {}, liste = [], index = {}, gruppeVon = {}, maxGrad = 1, weltR = 1;
        NODES.forEach(function (n) { maxGrad = Math.max(maxGrad, (n.inDegree || 0) + (n.outDegree || 0)); });
        gruppen.forEach(function (b, gi) {
            var n = b.files.length;
            // Die meistvernetzten Dateien in die Mitte des Areals
            var sortiert = b.files.slice().sort(function (x, y) {
                var nx = RAW.nodes[x], ny = RAW.nodes[y];
                return ((ny.inDegree || 0) + (ny.outDegree || 0)) - ((nx.inDegree || 0) + (nx.outDegree || 0));
            });
            sortiert.forEach(function (fid, fi) {
                var yy = 1 - (fi + 0.5) / n * 2, qq = Math.sqrt(1 - yy * yy), aa = fi * gold;
                var rr = n === 1 ? 0 : b.rc * Math.cbrt((fi + 0.5) / n);
                var p = new V(Math.cos(aa) * qq * rr, yy * rr, Math.sin(aa) * qq * rr).add(b.c);
                var nd = RAW.nodes[fid], grad = (nd.inDegree || 0) + (nd.outDegree || 0);
                pos[fid] = p; gross[fid] = 0.55 + Math.sqrt(grad) * 0.42;
                gruppeVon[fid] = gi; index[fid] = liste.length; liste.push(fid);
                weltR = Math.max(weltR, p.length());
            });
            var m = 0; b.files.forEach(function (f) { m = Math.max(m, pos[f].distanceTo(b.c)); }); b.ausdehnung = m;
        });
        var N = liste.length;
        var grund = liste.map(function (fid) { return new THREE.Color(TC[RAW.nodes[fid].type] || TC.other); });

        function kreisTextur(malen) {
            var c = document.createElement('canvas'); c.width = c.height = 128;
            var g = c.getContext('2d'); malen(g, 64);
            var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
        }

        // ── Raum: Sterne fern, Staub nah (Tiefe beim Fliegen) ──────────
        function punktwolke(n, rMin, rMax, groesse, farbe, staerke) {
            var P = new Float32Array(n * 3), S = new Float32Array(n), K = new Float32Array(n);
            for (var i = 0; i < n; i++) {
                var u = zufall(i * 3.1 + rMin) * 2 - 1, a = zufall(i * 7.3 + rMax) * Math.PI * 2, q = Math.sqrt(1 - u * u);
                var rr = rMin + (rMax - rMin) * Math.cbrt(zufall(i * 1.7 + 9));
                P.set([q * Math.cos(a) * rr, u * rr, q * Math.sin(a) * rr], i * 3);
                S[i] = groesse * (0.4 + Math.pow(zufall(i * 5.9), 5) * 2.4); K[i] = zufall(i * 2.3) * 100;
            }
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(P, 3));
            g.setAttribute('aS', new THREE.BufferAttribute(S, 1)); g.setAttribute('aK', new THREE.BufferAttribute(K, 1));
            var p = new THREE.Points(g, new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                uniforms: { uZeit: uZeit, uRuhe: uRuhe, uPx: uPx, uF: { value: farbe }, uSt: { value: staerke } },
                vertexShader: `attribute float aS; attribute float aK; uniform float uZeit; uniform float uRuhe; uniform float uPx; varying float vA;
                    void main() { vA = uRuhe > 0.5 ? 1.0 : 0.55 + 0.45 * sin(uZeit * (0.5 + fract(aK) * 1.3) + aK);
                        vec4 mv = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = clamp(aS * uPx * 60.0 / -mv.z, 1.0, 6.0 * uPx); gl_Position = projectionMatrix * mv; }`,
                fragmentShader: `uniform vec3 uF; uniform float uSt; varying float vA;
                    void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uF * a * a * vA * uSt, 1.0); }`
            }));
            p.frustumCulled = false; scene.add(p); return p;
        }
        punktwolke(schmal ? 1800 : 3500, 700, 1300, 22, new THREE.Color(0.75, 0.82, 1.0), 1.3);
        punktwolke(schmal ? 1500 : 3000, weltR * 0.2, weltR * 2.2, 0.35, akzentHell.clone().lerp(new THREE.Color(1, 1, 1), 0.3), 0.55);

        // ── Areale: Nebel aus weichen Billboards in der Hauptfarbe ─────
        var nebelTex = kreisTextur(function (g, r) {
            var v = g.createRadialGradient(r, r, 0, r, r, r);
            v.addColorStop(0, 'rgba(255,255,255,0.9)'); v.addColorStop(0.35, 'rgba(255,255,255,0.28)'); v.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = v; g.fillRect(0, 0, 2 * r, 2 * r);
        });
        var nebel = [];
        gruppen.forEach(function (b, gi) {
            var zaehl = {}; b.files.forEach(function (f) { var t = RAW.nodes[f].type; zaehl[t] = (zaehl[t] || 0) + 1; });
            var top = Object.keys(zaehl).sort(function (x, y) { return zaehl[y] - zaehl[x]; })[0];
            b.farbe = new THREE.Color(TC[top] || TC.other);
            // Drei versetzte Schichten, damit der Nebel beim Drehen nicht wie eine Scheibe wirkt
            for (var s = 0; s < 3; s++) {
                var m = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebelTex, color: b.farbe, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
                var w = (b.ausdehnung + 2.5) * (2.6 + s * 0.7);
                m.scale.set(w, w, 1);
                m.position.copy(b.c).add(new V(zufall(gi * 9 + s) - 0.5, zufall(gi * 4 + s * 3) - 0.5, zufall(gi * 2 + s * 7) - 0.5).multiplyScalar(b.ausdehnung * 0.6));
                m.userData = { gi: gi, basis: 0.055 - s * 0.012 }; m.renderOrder = 0;
                scene.add(m); nebel.push(m);
            }
        });

        // ── Dendriten: je Neuron einige kurze, leicht gekruemmte Faeden ──
        (function () {
            var P = [], C = [], D = [];
            liste.forEach(function (fid, i) {
                var p = pos[fid], col = grund[i], g = gross[fid], arme = 3 + Math.floor(zufall(i * 3.3) * 4);
                var verz = p.length() / weltR * 2.0 + 0.4;
                for (var a = 0; a < arme; a++) {
                    var dir = new V(zufall(i * 11 + a) - 0.5, zufall(i * 13 + a * 2) - 0.5, zufall(i * 17 + a * 5) - 0.5).normalize();
                    var knick = new V(zufall(i * 19 + a) - 0.5, zufall(i * 23 + a) - 0.5, zufall(i * 29 + a) - 0.5).multiplyScalar(0.8);
                    var len = g * (1.4 + zufall(i * 31 + a) * 1.6), vor = p.clone();
                    for (var s = 1; s <= 5; s++) {
                        var t = s / 5;
                        var nach = p.clone().addScaledVector(dir, len * t).addScaledVector(knick, len * t * t);
                        P.push(vor.x, vor.y, vor.z, nach.x, nach.y, nach.z);
                        var k0 = 0.9 * (1 - (s - 1) / 5), k1 = 0.9 * (1 - t);
                        C.push(col.r * k0, col.g * k0, col.b * k0, col.r * k1, col.g * k1, col.b * k1);
                        D.push(verz, verz);
                        vor = nach;
                    }
                }
            });
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
            g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
            g.setAttribute('aD', new THREE.Float32BufferAttribute(D, 1));
            var l = new THREE.LineSegments(g, new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
                uniforms: { uIntro: uIntro, uDim: { value: 1 } },
                vertexShader: `attribute float aD; uniform float uIntro; varying vec3 vC; varying float vA;
                    void main() { vC = color; vA = smoothstep(aD, aD + 0.8, uIntro); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `uniform float uDim; varying vec3 vC; varying float vA; void main() { gl_FragColor = vec4(vC * 0.55 * vA * uDim, 1.0); }`
            }));
            l.renderOrder = 2; scene.add(l); dendritMat = l.material;
        })();
        var dendritMat;

        // ── Neuronen: heller Kern + weicher Hof, als Punkte (immer rund, nie Kanten) ──
        var aDim = new Float32Array(N), aHi = new Float32Array(N);
        var attrDim = new THREE.BufferAttribute(aDim, 1); attrDim.setUsage(THREE.DynamicDrawUsage);
        var attrHi = new THREE.BufferAttribute(aHi, 1); attrHi.setUsage(THREE.DynamicDrawUsage);
        (function () {
            var P = new Float32Array(N * 3), C = new Float32Array(N * 3), G = new Float32Array(N), Dl = new Float32Array(N), Sd = new Float32Array(N), Ak = new Float32Array(N);
            liste.forEach(function (fid, i) {
                var p = pos[fid], n = RAW.nodes[fid];
                P.set([p.x, p.y, p.z], i * 3); C.set([grund[i].r, grund[i].g, grund[i].b], i * 3);
                G[i] = gross[fid]; Dl[i] = p.length() / weltR * 2.0 + 0.2; Sd[i] = zufall(i * 1.37) * 100;
                Ak[i] = Math.sqrt(((n.inDegree || 0) + (n.outDegree || 0)) / maxGrad);
            });
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(P, 3));
            g.setAttribute('aC', new THREE.BufferAttribute(C, 3)); g.setAttribute('aG', new THREE.BufferAttribute(G, 1));
            g.setAttribute('aDl', new THREE.BufferAttribute(Dl, 1)); g.setAttribute('aSd', new THREE.BufferAttribute(Sd, 1)); g.setAttribute('aAk', new THREE.BufferAttribute(Ak, 1));
            g.setAttribute('aDim', attrDim); g.setAttribute('aHi', attrHi);
            var p = new THREE.Points(g, new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                uniforms: { uZeit: uZeit, uIntro: uIntro, uPx: uPx, uRuhe: uRuhe },
                vertexShader: `attribute vec3 aC; attribute float aG; attribute float aDl; attribute float aSd; attribute float aAk; attribute float aDim; attribute float aHi;
                    uniform float uZeit; uniform float uIntro; uniform float uPx; uniform float uRuhe;
                    varying vec3 vC; varying float vA; varying float vHi; varying float vK;
                    void main() {
                        vec4 mv = modelViewMatrix * vec4(position, 1.0);
                        float an = smoothstep(aDl, aDl + 0.6, uIntro);
                        // Feuern: kurze Helligkeitsspitzen, haeufiger bei stark vernetzten Dateien
                        float f = uRuhe > 0.5 ? 0.0 : pow(max(0.0, sin(uZeit * (0.7 + aAk * 2.2) + aSd)), 24.0);
                        vC = aC; vHi = aHi; vK = f;
                        vA = an * (1.0 - aDim * 0.9);
                        float s = aG * (1.0 + aHi * 0.9 + f * 0.35) * (0.6 + 0.4 * an);
                        gl_PointSize = clamp(s * 16.0 * uPx * 18.0 / -mv.z, 2.0 * uPx, 140.0 * uPx);
                        gl_Position = projectionMatrix * mv;
                    }`,
                fragmentShader: `varying vec3 vC; varying float vA; varying float vHi; varying float vK;
                    void main() {
                        vec2 q = gl_PointCoord - 0.5; float d = length(q);
                        if (d > 0.5) discard;
                        float kern = smoothstep(0.11, 0.0, d);
                        float hof = exp(-d * d * 38.0);
                        float ring = smoothstep(0.02, 0.0, abs(d - 0.2)) * 0.35;
                        vec3 c = mix(vC, vec3(1.0), 0.65) * kern * 3.4 + vC * hof * (1.1 + vK * 2.5) + vC * ring;
                        c *= (1.0 + vHi * 1.3);
                        gl_FragColor = vec4(c * vA, 1.0);
                    }`
            }));
            p.frustumCulled = false; p.renderOrder = 5; scene.add(p);
        })();

        // Unsichtbare Kugeln nur fuer den Treffer-Test (Punkte lassen sich schlecht genau treffen)
        var trefferKugeln = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), N);
        (function () {
            var m = new THREE.Matrix4();
            liste.forEach(function (fid, i) { var r = gross[fid] * 0.9 + 0.35; m.makeScale(r, r, r); m.setPosition(pos[fid]); trefferKugeln.setMatrixAt(i, m); });
            trefferKugeln.computeBoundingSphere(); scene.add(trefferKugeln);
        })();

        // ── Nervenbahnen: kubische Bezier ueber die Mittelpunkte der Areale (Buendelung) ──
        var kanten = EDGES.filter(function (e) { return pos[e.from] && pos[e.to] && e.from !== e.to; });
        var bahnen = kanten.map(function (e) {
            var a = pos[e.from], b = pos[e.to], ga = gruppen[gruppeVon[e.from]], gb = gruppen[gruppeVon[e.to]];
            var c1, c2;
            if (ga === gb) {
                var mitte = a.clone().add(b).multiplyScalar(0.5), weg = mitte.clone().sub(ga.c);
                if (weg.lengthSq() < 0.01) weg.set(0, 1, 0);
                weg.normalize().multiplyScalar(ga.rc * 0.6);
                c1 = a.clone().add(weg); c2 = b.clone().add(weg);
            } else {
                // Am eigenen Arealkern vorbei: so laufen alle Bahnen zweier Areale als Strang
                c1 = ga.c.clone().lerp(a, 0.35); c2 = gb.c.clone().lerp(b, 0.35);
            }
            return { e: e, p0: a, p1: c1, p2: c2, p3: b, col: new THREE.Color(TC[RAW.nodes[e.to].type] || TC.other), len: a.distanceTo(b) };
        });
        function bez(k, t, out) {
            var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
            return out.set(a * k.p0.x + b * k.p1.x + c * k.p2.x + d * k.p3.x, a * k.p0.y + b * k.p1.y + c * k.p2.y + d * k.p3.y, a * k.p0.z + b * k.p1.z + c * k.p2.z + d * k.p3.z);
        }
        var SEG = 32;
        function linien(menge, mat) {
            var n = menge.length * SEG * 2, P = new Float32Array(n * 3), C = new Float32Array(n * 3), j = 0, v = new V(), w = new V();
            menge.forEach(function (k) {
                for (var s = 0; s < SEG; s++) {
                    var t0 = s / SEG, t1 = (s + 1) / SEG;
                    bez(k, t0, v); bez(k, t1, w);
                    P.set([v.x, v.y, v.z, w.x, w.y, w.z], j * 3);
                    var k0 = 0.12 + 0.88 * t0, k1 = 0.12 + 0.88 * t1;
                    C.set([k.col.r * k0, k.col.g * k0, k.col.b * k0, k.col.r * k1, k.col.g * k1, k.col.b * k1], j * 3);
                    j += 2;
                }
            });
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
            return new THREE.LineSegments(g, mat);
        }
        var bahnMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        var bahnLinien = linien(bahnen, bahnMat); bahnLinien.renderOrder = 3; scene.add(bahnLinien);
        var wahlMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
        var wahlLinien = null, wahlFuer;

        // Lichtimpulse: je Bahn zwei, mit langem Schweif. Dieselbe Bezier wie oben, im Shader.
        var IMP = 2, SCHWEIF = 10, nP = bahnen.length * IMP * SCHWEIF;
        var A0 = new Float32Array(nP * 3), A1 = new Float32Array(nP * 3), A2 = new Float32Array(nP * 3), A3 = new Float32Array(nP * 3);
        var APh = new Float32Array(nP), ASp = new Float32Array(nP), ATr = new Float32Array(nP), ACo = new Float32Array(nP * 3), AZu = new Float32Array(nP);
        var kantePunkte = [], j = 0;
        bahnen.forEach(function (k, ki) {
            var start = j, sp = 0.7 / (k.len * 0.12 + 2.4);
            for (var p = 0; p < IMP; p++) {
                var ph = (zufall(ki * 3.7) + p / IMP) % 1;
                for (var s = 0; s < SCHWEIF; s++) {
                    A0.set([k.p0.x, k.p0.y, k.p0.z], j * 3); A1.set([k.p1.x, k.p1.y, k.p1.z], j * 3);
                    A2.set([k.p2.x, k.p2.y, k.p2.z], j * 3); A3.set([k.p3.x, k.p3.y, k.p3.z], j * 3);
                    APh[j] = ph; ASp[j] = sp; ATr[j] = s; ACo.set([k.col.r, k.col.g, k.col.b], j * 3); j++;
                }
            }
            kantePunkte.push([start, j]);
        });
        var gP = new THREE.BufferGeometry();
        gP.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nP * 3), 3));
        [['a0', A0, 3], ['a1', A1, 3], ['a2', A2, 3], ['a3', A3, 3], ['aPh', APh, 1], ['aSp', ASp, 1], ['aTr', ATr, 1], ['aCo', ACo, 3]].forEach(function (x) {
            gP.setAttribute(x[0], new THREE.BufferAttribute(x[1], x[2]));
        });
        var attrZu = new THREE.BufferAttribute(AZu, 1); attrZu.setUsage(THREE.DynamicDrawUsage); gP.setAttribute('aZu', attrZu);
        var impulse = new THREE.Points(gP, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            uniforms: { uZeit: uZeit, uFluss: uFluss, uPx: uPx, uRuhe: uRuhe, uTempo: { value: 1 } },
            vertexShader: `
                attribute vec3 a0; attribute vec3 a1; attribute vec3 a2; attribute vec3 a3; attribute vec3 aCo;
                attribute float aPh; attribute float aSp; attribute float aTr; attribute float aZu;
                uniform float uZeit; uniform float uFluss; uniform float uPx; uniform float uRuhe;
                varying vec3 vC; varying float vA;
                void main() {
                    float hi = step(0.5, aZu) * step(aZu, 1.5), aus = step(1.5, aZu);
                    float tempo = 1.0 + hi * 1.6;
                    float t = fract(aPh + (uRuhe > 0.5 ? 0.0 : uZeit * aSp * tempo)) - aTr * 0.007;
                    float ok = step(0.0, t); t = clamp(t, 0.0, 1.0);
                    float u = 1.0 - t;
                    vec3 p = u * u * u * a0 + 3.0 * u * u * t * a1 + 3.0 * u * t * t * a2 + t * t * t * a3;
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    float kopf = 1.0 - aTr / 10.0;
                    gl_PointSize = clamp((1.5 + 6.0 * kopf * kopf) * (1.0 + hi * 0.7) * uPx * 22.0 / -mv.z, 1.0, 40.0 * uPx);
                    vA = ok * kopf * kopf * uFluss * smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.94, t) * (1.0 - aus * 0.95) * (1.0 + hi * 1.3);
                    vC = mix(aCo, vec3(1.0), 0.15 + kopf * 0.4) * 2.8;
                    gl_Position = projectionMatrix * mv;
                }`,
            fragmentShader: `varying vec3 vC; varying float vA;
                void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * a * vA, 1.0); }`
        }));
        impulse.frustumCulled = false; impulse.renderOrder = 4; scene.add(impulse);

        // ── Auswahl: zwei Ringe, die sich zur Kamera drehen; Schockwelle ──
        var ringTex = kreisTextur(function (g, r) {
            g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 5; g.beginPath(); g.arc(r, r, r - 8, 0, Math.PI * 2); g.stroke();
        });
        function ringSprite() { return new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending })); }
        var ring = ringSprite(), welle = ringSprite(); ring.renderOrder = 8; welle.renderOrder = 8;
        ring.visible = welle.visible = false; scene.add(ring); scene.add(welle);
        var wahlZeit = 0;

        // ── Beschriftung der Areale (feste Bildschirmgroesse) ──────────
        var schilder = [];
        function schild(text, zahl) {
            var fs = 40, pad = 16, c = document.createElement('canvas'), g = c.getContext('2d');
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif'; var tw = g.measureText(text).width;
            g.font = '500 ' + (fs * 0.7) + 'px "JetBrains Mono", monospace'; var zw = g.measureText(String(zahl)).width;
            c.width = Math.ceil(tw + zw + pad * 3); c.height = fs + pad * 2;
            g.fillStyle = 'rgba(4,5,10,0.55)';
            var r = c.height / 2; g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r);
            g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(190,210,255,0.2)'; g.lineWidth = 2; g.stroke();
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif'; g.fillStyle = '#eef1ff'; g.textBaseline = 'middle'; g.fillText(text, pad, c.height / 2 + 2);
            g.font = '500 ' + (fs * 0.7) + 'px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(200,210,240,0.5)'; g.fillText(String(zahl), pad * 2 + tw, c.height / 2 + 2);
            var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
            // sizeAttenuation:false = feste Bildschirmgroesse; mit Weltgroesse fuellte ein Schild beim Heranfliegen das Bild.
            var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false, opacity: 0 }));
            s.userData.verh = c.width / c.height; return s;
        }
        gruppen.forEach(function (b) {
            if (b.files.length < 5) return;
            var s = schild(b.g.label, b.files.length), hw = b.files.length >= 30 ? 0.022 : 0.017;
            s.scale.set(hw * s.userData.verh, hw, 1); s.center.set(0.5, 0);
            s.position.copy(b.c).add(new V(0, b.ausdehnung + 1.6, 0));
            s.renderOrder = 20; scene.add(s); schilder.push(s);
        });

        // ── Nachbearbeitung: HDR-Szene, Bloom (4 Stufen), leichter Farbsaum, Korn, Vignette ──
        var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), quadSzene = new THREE.Scene(); quadSzene.add(quad);
        function rt(samples) { return new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: samples || 0, depthBuffer: !!samples }); }
        var rtSzene = rt(4), rtHell = rt(), stufen = [rt(), rt(), rt(), rt()], hilf = [rt(), rt(), rt(), rt()];
        var vsQuad = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
        // NaN-Sperre: ein einziges NaN-Pixel verschmiert der Bloom sonst zu schwarzen Bloecken (gemessen 21.10.)
        var matHell = new THREE.ShaderMaterial({ uniforms: { tS: { value: null } }, vertexShader: vsQuad, depthTest: false,
            fragmentShader: `uniform sampler2D tS; varying vec2 vUv;
                void main() { vec3 c = texture2D(tS, vUv).rgb; if (!(c.r == c.r && c.g == c.g && c.b == c.b)) c = vec3(0.0); c = clamp(c, 0.0, 60.0);
                    float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.55, 1.4, l), 1.0); }` });
        var matBlur = new THREE.ShaderMaterial({ uniforms: { tQ: { value: null }, uRicht: { value: new THREE.Vector2() } }, vertexShader: vsQuad, depthTest: false,
            fragmentShader: `uniform sampler2D tQ; uniform vec2 uRicht; varying vec2 vUv;
                void main() { vec3 c = texture2D(tQ, vUv).rgb * 0.227027;
                    c += (texture2D(tQ, vUv + uRicht * 1.3846).rgb + texture2D(tQ, vUv - uRicht * 1.3846).rgb) * 0.3162162;
                    c += (texture2D(tQ, vUv + uRicht * 3.2308).rgb + texture2D(tQ, vUv - uRicht * 3.2308).rgb) * 0.0702703;
                    gl_FragColor = vec4(c, 1.0); }` });
        var matKomp = new THREE.ShaderMaterial({
            uniforms: { tS: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, uZeit: uZeit, uRuhe: uRuhe },
            vertexShader: vsQuad, depthTest: false,
            fragmentShader: `uniform sampler2D tS; uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform float uZeit; uniform float uRuhe; varying vec2 vUv;
                float rausch(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
                void main() {
                    vec2 m = vUv - 0.5; float r2 = dot(m, m);
                    vec2 off = m * r2 * 0.012;
                    vec3 c = vec3(texture2D(tS, vUv + off).r, texture2D(tS, vUv).g, texture2D(tS, vUv - off).b);
                    if (!(c.r == c.r && c.g == c.g && c.b == c.b)) c = vec3(0.0);
                    vec3 b = texture2D(tB0, vUv).rgb * 0.8 + texture2D(tB1, vUv).rgb * 0.9 + texture2D(tB2, vUv).rgb * 1.0 + texture2D(tB3, vUv).rgb * 1.1;
                    c += b * 0.85;
                    c *= mix(0.4, 1.0, smoothstep(0.62, 0.08, r2 * 1.9));
                    float k = rausch(vUv * vec2(1931.0, 1129.0) + (uRuhe > 0.5 ? 0.0 : fract(uZeit * 7.0) * 91.0));
                    c += (k - 0.5) * 0.024;
                    gl_FragColor = vec4(max(c, 0.0), 1.0);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }`
        });
        function pass(mat, ziel) { quad.material = mat; renderer.setRenderTarget(ziel); renderer.render(quadSzene, quadCam); }
        function zeichnen() {
            renderer.setRenderTarget(rtSzene); renderer.render(scene, camera);
            matHell.uniforms.tS.value = rtSzene.texture; pass(matHell, rtHell);
            var q = rtHell;
            for (var i = 0; i < 4; i++) {
                var s = stufen[i], h = hilf[i];
                matBlur.uniforms.tQ.value = q.texture; matBlur.uniforms.uRicht.value.set(1 / s.width, 0); pass(matBlur, h);
                matBlur.uniforms.tQ.value = h.texture; matBlur.uniforms.uRicht.value.set(0, 1 / s.height); pass(matBlur, s);
                q = s;
            }
            var u = matKomp.uniforms; u.tS.value = rtSzene.texture;
            u.tB0.value = stufen[0].texture; u.tB1.value = stufen[1].texture; u.tB2.value = stufen[2].texture; u.tB3.value = stufen[3].texture;
            pass(matKomp, null);
        }

        // ── Zustand (Auswahl, Hover, Filter) in die Puffer ─────────────
        function passt(n) {
            if (filterType !== 'all' && n.type !== filterType) return false;
            if (searchQ && n.name.toLowerCase().indexOf(searchQ) < 0 && n.path.toLowerCase().indexOf(searchQ) < 0) return false;
            return true;
        }
        var bahnZiel = 0.08, aktivGruppe = -1;
        function setzeZustand() {
            var nb = sel ? nachbarn(sel).set : null, gefiltert = filterType !== 'all' || !!searchQ;
            for (var i = 0; i < N; i++) {
                var fid = liste[i];
                aDim[i] = nb ? (nb.has(fid) ? 0 : 0.92) : (gefiltert && !passt(RAW.nodes[fid]) ? 0.88 : 0);
                aHi[i] = fid === sel ? 1 : fid === hov ? 0.6 : 0;
            }
            attrDim.needsUpdate = true; attrHi.needsUpdate = true;
            var id = sel || hov || null;
            for (var k = 0; k < bahnen.length; k++) {
                var e = bahnen[k].e, z = 0;
                if (id) z = (e.from === id || e.to === id) ? 1 : (sel ? 2 : 0);
                else if (gefiltert) z = (passt(RAW.nodes[e.from]) || passt(RAW.nodes[e.to])) ? 0 : 2;
                for (var q = kantePunkte[k][0]; q < kantePunkte[k][1]; q++) AZu[q] = z;
            }
            attrZu.needsUpdate = true;
            if (wahlFuer !== id) {
                wahlFuer = id;
                if (wahlLinien) { scene.remove(wahlLinien); wahlLinien.geometry.dispose(); wahlLinien = null; }
                if (id) {
                    var eigene = bahnen.filter(function (b) { return b.e.from === id || b.e.to === id; });
                    if (eigene.length) { wahlLinien = linien(eigene, wahlMat); wahlLinien.renderOrder = 3; scene.add(wahlLinien); }
                }
            }
            aktivGruppe = sel ? gruppeVon[sel] : -1;
            bahnZiel = sel ? 0.015 : (hov || gefiltert) ? 0.035 : 0.08;
            if (dendritMat) dendritMat.uniforms.uDim.value = sel || gefiltert ? 0.25 : 1;
        }

        // ── Kamera: frei um ein Ziel im Raum (Ziel wandert zum gewaehlten Neuron) ──
        var HEIM_T = 0.7, HEIM_P = 1.15;
        var ziel = new V(), zielSoll = new V(), theta = HEIM_T, thetaSoll = HEIM_T, phi = HEIM_P, phiSoll = HEIM_P;
        var dist = 1, distSoll = 1, heimDist = 1, flug = null, letzteEingabe = 0, intro = null, tmpA = new V(), tmpB = new V();
        function heimWerte() {
            var asp = Math.max(0.5, (wrap.clientWidth || 1) / (wrap.clientHeight || 1));
            heimDist = weltR * (asp < 1 ? 3.4 : 2.2); return heimDist;
        }
        function kameraSetzen() {
            var sp = Math.sin(phi);
            camera.position.set(ziel.x + dist * sp * Math.sin(theta), ziel.y + dist * Math.cos(phi), ziel.z + dist * sp * Math.cos(theta));
            camera.lookAt(ziel);
            var zl = document.getElementById('zLvl'); if (zl) zl.textContent = Math.round(heimDist / dist * 100) + '%';
        }
        function introStarten() {
            heimWerte(); intro = { t0: performance.now(), dauer: 4800 };
            zielSoll.set(0, 0, 0); thetaSoll = HEIM_T; phiSoll = HEIM_P; distSoll = heimDist;
        }
        function introBeenden() {
            if (!intro) return; intro = null; uIntro.value = 99; uFluss.value = 1;
            ziel.copy(zielSoll); theta = thetaSoll; phi = phiSoll; dist = distSoll;
        }

        // ── Bildschleife ───────────────────────────────────────────────
        var aktiv = false, raf = 0, letzt = 0;
        function bild(jetzt) {
            raf = 0; if (!aktiv) return;
            var dt = letzt ? Math.min(0.05, (jetzt - letzt) / 1000) : 0.016; letzt = jetzt;
            uZeit.value += dt;
            if (intro) {
                // Anflug: aus der Ferne durch den Staub, dabei eine halbe Drehung
                var f = clamp((jetzt - intro.t0) / intro.dauer, 0, 1), k = easeInOut(f);
                theta = HEIM_T - (1 - k) * 2.6; phi = HEIM_P + (1 - k) * 0.25;
                dist = heimDist * (1 + (1 - easeOut(f)) * 4.5);
                uIntro.value = (jetzt - intro.t0) / 1000 * 0.95;
                uFluss.value = clamp((f - 0.6) / 0.4, 0, 1);
                if (f >= 1) introBeenden();
            } else if (flug) {
                var g = clamp((jetzt - flug.t0) / flug.dauer, 0, 1), kk = easeInOut(g);
                ziel.lerpVectors(flug.z0, flug.z1, kk); zielSoll.copy(ziel);
                dist = flug.d0 + (flug.d1 - flug.d0) * kk; distSoll = flug.d1;
                theta += (thetaSoll - theta) * 0.06; phi += (phiSoll - phi) * 0.06;
                if (g >= 1) flug = null;
            } else {
                if (!RM && !sel && jetzt - letzteEingabe > 6000) thetaSoll += dt * 0.045;
                var d = 1 - Math.pow(0.00006, dt);
                ziel.lerp(zielSoll, d); theta += (thetaSoll - theta) * d; phi += (phiSoll - phi) * d; dist += (distSoll - dist) * d;
            }
            bahnMat.opacity += ((intro ? uFluss.value * 0.08 : bahnZiel) - bahnMat.opacity) * 0.08;
            kameraSetzen();

            nebel.forEach(function (m) {
                var z = (intro ? clamp(uIntro.value - 0.3, 0, 1) : 1) * m.userData.basis * (aktivGruppe < 0 ? 1 : (m.userData.gi === aktivGruppe ? 2.2 : 0.35));
                m.material.opacity += (z - m.material.opacity) * 0.08;
            });
            schilder.forEach(function (s) {
                // Schilder blenden aus, wenn die Kamera mitten im Areal steckt
                var ab = s.position.distanceTo(camera.position);
                var z = intro ? 0 : (sel ? 0.25 : 1) * clamp((ab - 6) / 10, 0, 1);
                s.material.opacity += (z - s.material.opacity) * 0.12; s.visible = s.material.opacity > 0.01;
            });
            if (sel && pos[sel]) {
                var p = pos[sel], gr = gross[sel];
                ring.visible = true; ring.position.copy(p); ring.material.opacity = 0.85;
                var rs = gr * 2.6 * (1 + 0.06 * Math.sin(uZeit.value * 3)); ring.scale.set(rs, rs, 1);
                var w = wahlZeit ? clamp((jetzt - wahlZeit) / 1200, 0, 1) : 1;
                welle.visible = w < 1; welle.position.copy(p);
                var ws = gr * (2.5 + easeOut(w) * 22); welle.scale.set(ws, ws, 1); welle.material.opacity = (1 - w) * 0.9;
            } else { ring.visible = false; welle.visible = false; }

            zeichnen();
            raf = requestAnimationFrame(bild);
        }
        function bitte() { if (aktiv && !raf) { letzt = 0; raf = requestAnimationFrame(bild); } }

        function groesse() {
            var w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return;
            renderer.setSize(w, h, false);
            var pr = renderer.getPixelRatio(), W = Math.floor(w * pr), H = Math.floor(h * pr);
            rtSzene.setSize(W, H); rtHell.setSize(W >> 1, H >> 1);
            for (var i = 0; i < 4; i++) { var f = 2 << i; stufen[i].setSize(Math.max(1, W / f | 0), Math.max(1, H / f | 0)); hilf[i].setSize(Math.max(1, W / f | 0), Math.max(1, H / f | 0)); }
            uPx.value = pr; camera.aspect = w / h; camera.updateProjectionMatrix(); heimWerte(); bitte();
        }
        function heim() {
            flug = null; introBeenden();
            zielSoll.set(0, 0, 0); phiSoll = HEIM_P; distSoll = heimWerte(); letzteEingabe = performance.now();
        }
        function zoom(f) { introBeenden(); flug = null; distSoll = clamp(distSoll / f, 2.5, heimDist * 3); letzteEingabe = performance.now(); }
        function flieg(id) {
            var p = pos[id]; if (!p) return;
            introBeenden();
            var weit = 6;
            nachbarn(id).set.forEach(function (o) { if (pos[o]) weit = Math.max(weit, pos[o].distanceTo(p)); });
            // Abstand nach der Streuung der Nachbarn, damit die feuernden Bahnen im Bild sind
            var d1 = clamp(weit * 1.35, 10, heimDist * 0.9);
            letzteEingabe = performance.now();
            if (RM) { ziel.copy(p); zielSoll.copy(p); dist = distSoll = d1; return; }
            flug = { t0: performance.now(), dauer: 1200 + Math.min(ziel.distanceTo(p) * 12, 900), z0: ziel.clone(), z1: p.clone(), d0: dist, d1: d1 };
        }

        // ── Zeiger: links drehen, rechts/Umschalt verschieben, Rad/zwei Finger zoomen ──
        var ray = new THREE.Raycaster(), maus = new THREE.Vector2();
        function treffer(cx, cy) {
            var r = canvas.getBoundingClientRect();
            maus.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
            ray.setFromCamera(maus, camera);
            var t = ray.intersectObject(trefferKugeln, false);
            return t.length ? liste[t[0].instanceId] : null;
        }
        function verschieben(dx, dy) {
            var s = dist * 0.0013;
            tmpA.setFromMatrixColumn(camera.matrixWorld, 0); tmpB.setFromMatrixColumn(camera.matrixWorld, 1);
            zielSoll.addScaledVector(tmpA, -dx * s).addScaledVector(tmpB, dy * s);
        }
        var zeiger = new Map(), start = null, bewegt = false, pinch = 0, mitteX = 0, mitteY = 0;
        function mitte() { var a = Array.from(zeiger.values()); return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; }
        canvas.addEventListener('pointerdown', function (e) {
            canvas.setPointerCapture(e.pointerId);
            zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (zeiger.size === 1) { start = { x: e.clientX, y: e.clientY, schieb: e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey }; bewegt = false; }
            if (zeiger.size === 2) { var m = mitte(); pinch = m.d; mitteX = m.x; mitteY = m.y; bewegt = true; }
            letzteEingabe = performance.now(); flug = null; if (intro) introBeenden();
        });
        canvas.addEventListener('pointermove', function (e) {
            var alt = zeiger.get(e.pointerId);
            if (!alt) {
                if (e.pointerType === 'mouse' && !intro) {
                    var id = treffer(e.clientX, e.clientY);
                    if (id !== hov) { hov = id; setzeZustand(); }
                    if (id) showTT(e, RAW.nodes[id]); else hideTT();
                    canvas.style.cursor = id ? 'pointer' : 'grab';
                }
                return;
            }
            var dx = e.clientX - alt.x, dy = e.clientY - alt.y;
            zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
            letzteEingabe = performance.now();
            if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) bewegt = true;
            if (zeiger.size === 2) {
                var m = mitte();
                if (pinch) zoom(m.d / pinch);
                verschieben(m.x - mitteX, m.y - mitteY);
                pinch = m.d; mitteX = m.x; mitteY = m.y; return;
            }
            if (!bewegt) return;
            hideTT();
            if (start && start.schieb) verschieben(dx, dy);
            else { thetaSoll -= dx * 0.005; phiSoll = clamp(phiSoll - dy * 0.005, 0.12, Math.PI - 0.12); }
            canvas.style.cursor = 'grabbing';
        });
        function los(e) {
            var warEiner = zeiger.size === 1;
            zeiger.delete(e.pointerId); if (zeiger.size < 2) pinch = 0;
            if (warEiner && start && !bewegt) {
                var id = treffer(e.clientX, e.clientY);
                if (id) { selectNode(id); flieg(id); } else if (sel) closeDetail();
            }
            if (!zeiger.size) { start = null; canvas.style.cursor = 'grab'; }
        }
        canvas.addEventListener('pointerup', los);
        canvas.addEventListener('pointercancel', los);
        canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && hov) { hov = null; hideTT(); setzeZustand(); } });
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        canvas.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY > 0 ? 0.88 : 1.14); }, { passive: false });
        document.addEventListener('keydown', function () { if (intro) introBeenden(); letzteEingabe = performance.now(); });

        // ── Schnittstelle zur Seite ───────────────────────────────────
        var letzteWahl = null;
        function sync() {
            setzeZustand();
            if (sel && pos[sel]) { if (letzteWahl !== sel) { wahlZeit = performance.now(); letzteWahl = sel; } }
            else { letzteWahl = null; wahlZeit = 0; }
        }

        setzeZustand();
        var ersterStart = true;
        return {
            an: function () {
                aktiv = true; canvas.classList.add('on'); groesse();
                if (ersterStart) {
                    ersterStart = false;
                    if (RM) { heim(); ziel.copy(zielSoll); theta = thetaSoll; phi = phiSoll; dist = distSoll; }
                    else introStarten();
                }
                letzteEingabe = performance.now(); sync(); bitte();
            },
            aus: function () { aktiv = false; canvas.classList.remove('on'); if (raf) { cancelAnimationFrame(raf); raf = 0; } },
            sync: sync, groesse: groesse, heim: heim, zoom: zoom, flieg: flieg,
            png: function () { kameraSetzen(); zeichnen(); return canvas.toDataURL('image/png'); }
        };
    }
})();
