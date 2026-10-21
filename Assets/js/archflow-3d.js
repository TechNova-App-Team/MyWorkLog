// ═══ ARCHFLOW 3D MODULE ═══
// /archflow/ Ansicht „3D“: der Quellcode als Stadt bei Nacht, durch die die
// Ladebeziehungen als Lichtpakete fliessen. Gruppe = Viertel (Glasplatte),
// Datei = Turm (Hoehe = sqrt(ein+aus), Fenster brennen nach Aktivitaet), Farbe =
// Dateiart (TC der Seite), Verbindung = Bogen mit wanderndem Lichtpaket vom
// Lader zur geladenen Datei.
//
// Haengt an den Globals des Hauptskripts der Seite (NODES, EDGES, GROUPS, RAW, sel,
// hov, filterType, searchQ, TC, selectNode, closeDetail, showTT, hideTT, nachbarn).
// Das Hauptskript ruft window.AF3D nur, solange layout === '3d'.
//
// Wunsch des Nutzers (21.10.2026): „so krass, dass mir die Spucke wegbleibt“ — die
// erste ruhige Fassung war ihm „Standard-Three.js“. Deshalb hier bewusst mehr als die
// sonstige Ein-Effekt-Regel: Bloom, Fluss, Spiegelung, Kamerafahrt. Bei
// prefers-reduced-motion steht alles still (kein Flug, kein Fluss, kein Drehen).
//
// Bloom ist selbst gebaut (Helligkeitsfilter + drei Unschaerfe-Stufen), weil im Repo
// nur three.module.js liegt, keine examples/jsm-Zusaetze.
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

    function baue(THREE) {
        var wrap = canvas.parentElement;
        var schmal = window.innerWidth < 768;
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, schmal ? 1.5 : 1.75));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.setClearColor(0x020203, 1);

        var scene = new THREE.Scene();
        var BG = new THREE.Color('#030306');
        scene.fog = new THREE.Fog(BG, 70, 230);
        var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 900);

        var akzent = new THREE.Color((getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#5578a8').trim() || '#5578a8');

        scene.add(new THREE.HemisphereLight(new THREE.Color('#9fb0d8'), new THREE.Color('#05050a'), 0.6));
        var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(30, 60, 25); scene.add(key);

        var uZeit = { value: 0 }, uIntro = { value: 0 }, uFluss = { value: RM ? 1 : 0 };

        // ── Himmel: Verlauf mit leichtem Akzent-Schimmer am Horizont ───
        var himmel = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), new THREE.ShaderMaterial({
            side: THREE.BackSide, depthWrite: false, fog: false,
            uniforms: { uAkz: { value: akzent } },
            vertexShader: `
                varying vec3 vDir;
                void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `
                uniform vec3 uAkz;
                varying vec3 vDir;
                void main() {
                    float h = vDir.y;
                    vec3 oben = vec3(0.004, 0.005, 0.012);
                    vec3 horiz = vec3(0.012, 0.014, 0.028) + uAkz * 0.05;
                    vec3 c = mix(horiz, oben, smoothstep(0.0, 0.55, h));
                    c = mix(vec3(0.006, 0.006, 0.01), c, smoothstep(-0.12, 0.02, h));
                    gl_FragColor = vec4(c, 1.0);
                }`
        }));
        himmel.renderOrder = -10; scene.add(himmel);

        // ── Layout: Viertel spiralfoermig gepackt, groesste innen ──────
        var ZELLE = 1.05, FUSS = 0.62, RAND = 0.7, LUECKE = 1.6;
        var gruppen = GROUPS.map(function (g) {
            var files = g.files.filter(function (f) { return RAW.nodes[f]; });
            var k = Math.max(1, Math.ceil(Math.sqrt(files.length)));
            var reihen = Math.ceil(files.length / k);
            return { g: g, files: files, k: k, w: k * ZELLE + RAND * 2, d: reihen * ZELLE + RAND * 2 };
        }).filter(function (b) { return b.files.length; }).sort(function (a, b) { return b.files.length - a.files.length; });

        var platziert = [];
        function frei(x, z, b) {
            for (var i = 0; i < platziert.length; i++) {
                var p = platziert[i];
                if (Math.abs(x - p.x) < (b.w + p.b.w) / 2 + LUECKE && Math.abs(z - p.z) < (b.d + p.b.d) / 2 + LUECKE) return false;
            }
            return true;
        }
        gruppen.forEach(function (b, i) {
            if (!i) { platziert.push({ x: 0, z: 0, b: b }); b.x = 0; b.z = 0; return; }
            for (var s = 1; s < 20000; s++) {
                var r = 1.35 * Math.sqrt(s), a = s * 2.39996;
                var x = Math.cos(a) * r, z = Math.sin(a) * r;
                if (frei(x, z, b)) { b.x = x; b.z = z; platziert.push({ x: x, z: z, b: b }); return; }
            }
        });

        var pos = {}, hoehe = {}, liste = [], index = {};
        var maxGrad = 1;
        NODES.forEach(function (n) { maxGrad = Math.max(maxGrad, (n.inDegree || 0) + (n.outDegree || 0)); });
        gruppen.forEach(function (b) {
            b.files.forEach(function (fid, fi) {
                var n = RAW.nodes[fid];
                var c = fi % b.k, r = Math.floor(fi / b.k);
                var x = b.x - b.w / 2 + RAND + (c + 0.5) * ZELLE;
                var z = b.z - b.d / 2 + RAND + (r + 0.5) * ZELLE;
                pos[fid] = new THREE.Vector3(x, 0, z);
                hoehe[fid] = 0.35 + Math.sqrt((n.inDegree || 0) + (n.outDegree || 0)) * 0.62;
                index[fid] = liste.length; liste.push(fid);
            });
        });
        var radius = 1;
        gruppen.forEach(function (b) { radius = Math.max(radius, Math.hypot(Math.abs(b.x) + b.w / 2, Math.abs(b.z) + b.d / 2)); });

        // ── Viertel: dunkle Glasplatten (durchscheinend, darunter liegt die Spiegelung) ──
        var platteMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#0a0b12'), roughness: 0.35, metalness: 0.6, transparent: true, opacity: 0.8 });
        var kanteMat = new THREE.LineBasicMaterial({ color: akzent.clone().lerp(new THREE.Color(1, 1, 1), 0.4), transparent: true, opacity: 0.16 });
        gruppen.forEach(function (b) {
            var geo = new THREE.BoxGeometry(b.w, 0.1, b.d);
            var m = new THREE.Mesh(geo, platteMat); m.position.set(b.x, -0.05, b.z); m.renderOrder = 1; scene.add(m);
            var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), kanteMat); e.position.copy(m.position); scene.add(e);
        });
        var grid = new THREE.GridHelper(Math.ceil(radius * 3 / 4) * 4, Math.ceil(radius * 3 / 4), 0x12131c, 0x0b0b12);
        grid.position.y = -0.12; scene.add(grid);

        // ── Tuerme: ein Shader fuer Glas, Fenster, Dach, Auswahl und Spiegelung ──
        var geoTurm = new THREE.BoxGeometry(FUSS, 1, FUSS); geoTurm.translate(0, 0.5, 0);
        var N = liste.length;
        var aSeed = new Float32Array(N), aDelay = new Float32Array(N), aAkt = new Float32Array(N);
        var aDim = new Float32Array(N), aHi = new Float32Array(N);
        liste.forEach(function (fid, i) {
            var n = RAW.nodes[fid], p = pos[fid];
            aSeed[i] = (i * 0.61803) % 1 * 97.0 + 3.0;
            // Wachsen von der Mitte nach aussen
            aDelay[i] = Math.hypot(p.x, p.z) / radius * 1.5 + ((i * 7) % 11) * 0.025;
            aAkt[i] = Math.sqrt(((n.inDegree || 0) + (n.outDegree || 0)) / maxGrad);
        });
        geoTurm.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
        geoTurm.setAttribute('aDelay', new THREE.InstancedBufferAttribute(aDelay, 1));
        geoTurm.setAttribute('aAkt', new THREE.InstancedBufferAttribute(aAkt, 1));
        var attrDim = new THREE.InstancedBufferAttribute(aDim, 1); attrDim.setUsage(THREE.DynamicDrawUsage);
        var attrHi = new THREE.InstancedBufferAttribute(aHi, 1); attrHi.setUsage(THREE.DynamicDrawUsage);
        geoTurm.setAttribute('aDim', attrDim); geoTurm.setAttribute('aHi', attrHi);

        var turmVS = `
            attribute float aSeed; attribute float aDelay; attribute float aAkt; attribute float aDim; attribute float aHi;
            uniform float uIntro; uniform float uSpiegel;
            varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vCol;
            varying float vY; varying float vSeed; varying float vAkt; varying float vDim; varying float vHi; varying float vLicht;
            void main() {
                float t = clamp((uIntro - aDelay) / 0.9, 0.0, 1.0);
                float wachs = 1.0 - pow(1.0 - t, 3.0);
                vec3 p = position; p.y *= max(wachs, 0.0005);
                vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
                if (uSpiegel > 0.5) w.y = -w.y;
                float hs = length(instanceMatrix[1].xyz);
                vY = p.y * hs;
                vN = normalize(mat3(instanceMatrix) * normal);
                vW = w.xyz; vL = position; vCol = instanceColor;
                vSeed = aSeed; vAkt = aAkt; vDim = aDim; vHi = aHi;
                vLicht = clamp((uIntro - aDelay - 0.7) / 0.6, 0.0, 1.0);
                gl_Position = projectionMatrix * viewMatrix * w;
            }`;
        var turmFS = `
            uniform float uZeit; uniform float uSpiegel; uniform vec3 uBg; uniform float uNebelN; uniform float uNebelF;
            varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vCol;
            varying float vY; varying float vSeed; varying float vAkt; varying float vDim; varying float vHi; varying float vLicht;
            float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
            void main() {
                vec3 n = normalize(vN);
                vec3 v = normalize(cameraPosition - vW);
                vec3 L = normalize(vec3(0.45, 0.8, 0.35));
                vec3 c = vCol * 0.035 + vCol * 0.10 * max(dot(n, L), 0.0);
                float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
                c += vCol * rim * 0.35;
                if (n.y > 0.5) {
                    // Dach: leuchtet in der Farbe der Dateiart
                    vec2 q = abs(vL.xz) / 0.31;
                    float kante = smoothstep(0.78, 0.98, max(q.x, q.y));
                    c = vCol * (0.9 + kante * 1.6) * (0.35 + 0.65 * vLicht);
                } else if (n.y > -0.5) {
                    // Fenster: drei Spalten je Seite, Stockwerke je 0.2 Welteinheiten
                    float u = abs(n.x) > 0.5 ? vL.z : vL.x;
                    float seite = abs(n.x) > 0.5 ? (n.x > 0.0 ? 1.0 : 2.0) : (n.z > 0.0 ? 3.0 : 4.0);
                    float sx = (u + 0.31) / 0.62 * 3.0;
                    float sy = vY / 0.2;
                    float spalte = floor(sx), stock = floor(sy);
                    vec2 f = fract(vec2(sx, sy));
                    float fenster = step(0.2, f.x) * step(f.x, 0.8) * step(0.28, f.y) * step(f.y, 0.72) * step(0.8, sy);
                    // Ab und zu geht ein Licht an oder aus — die Stadt lebt
                    float takt = floor(uZeit * 0.12 + hash(vec3(vSeed, stock, spalte)) * 8.0);
                    float an = step(hash(vec3(vSeed + seite * 13.0, stock * 1.7 + takt * 0.37, spalte)), 0.12 + 0.62 * vAkt);
                    vec3 warm = mix(vCol, vec3(1.0, 0.93, 0.8), 0.45);
                    c += warm * fenster * an * (1.6 + vHi * 1.4) * vLicht;
                    c += vCol * fenster * 0.05;
                }
                c += vec3(1.0) * vHi * 0.12;
                c = mix(c, uBg, vDim);
                float a = 1.0;
                if (uSpiegel > 0.5) { a = 0.32 * (1.0 - smoothstep(0.0, 2.6, -vW.y)); c *= 0.8; }
                float d = length(vW - cameraPosition);
                c = mix(c, uBg, smoothstep(uNebelN, uNebelF, d));
                gl_FragColor = vec4(c, a);
            }`;
        function turmMaterial(spiegel) {
            return new THREE.ShaderMaterial({
                vertexShader: turmVS, fragmentShader: turmFS,
                transparent: spiegel, depthWrite: !spiegel,
                uniforms: { uZeit: uZeit, uIntro: uIntro, uSpiegel: { value: spiegel ? 1 : 0 }, uBg: { value: BG },
                    uNebelN: { value: 70 }, uNebelF: { value: 230 } }
            });
        }
        var tuerme = new THREE.InstancedMesh(geoTurm, turmMaterial(false), N);
        var spiegel = new THREE.InstancedMesh(geoTurm, turmMaterial(true), N);
        var grund = liste.map(function (fid) { return new THREE.Color(TC[RAW.nodes[fid].type] || TC.other); });
        var tmpM = new THREE.Matrix4();
        liste.forEach(function (fid, i) {
            tmpM.makeScale(1, hoehe[fid], 1); tmpM.setPosition(pos[fid].x, 0, pos[fid].z);
            tuerme.setMatrixAt(i, tmpM); tuerme.setColorAt(i, grund[i]);
        });
        spiegel.instanceMatrix = tuerme.instanceMatrix; spiegel.instanceColor = tuerme.instanceColor;
        spiegel.renderOrder = 0; tuerme.renderOrder = 2;
        spiegel.frustumCulled = false;
        scene.add(spiegel); scene.add(tuerme);

        // ── Boegen: Geometrie gemeinsam fuer Gleise (Linien) und Lichtpakete ──
        var kanten = EDGES.filter(function (e) { return pos[e.from] && pos[e.to] && e.from !== e.to; });
        var bez = kanten.map(function (e) {
            var a = pos[e.from], b = pos[e.to];
            var ha = hoehe[e.from], hb = hoehe[e.to];
            var dist = a.distanceTo(b);
            return {
                e: e, len: dist,
                p0: new THREE.Vector3(a.x, ha, a.z), p2: new THREE.Vector3(b.x, hb, b.z),
                p1: new THREE.Vector3((a.x + b.x) / 2, Math.max(ha, hb) + 0.6 + dist * 0.3, (a.z + b.z) / 2),
                col: new THREE.Color(TC[RAW.nodes[e.to].type] || TC.other)
            };
        });

        var SEG = 20;
        function linien(menge, mat) {
            var n = menge.length * SEG * 2, P = new Float32Array(n * 3), C = new Float32Array(n * 3), j = 0;
            var v = new THREE.Vector3(), w = new THREE.Vector3();
            menge.forEach(function (k) {
                for (var s = 0; s < SEG; s++) {
                    var t0 = s / SEG, t1 = (s + 1) / SEG;
                    punkt(k, t0, v); punkt(k, t1, w);
                    P.set([v.x, v.y, v.z, w.x, w.y, w.z], j * 3);
                    var k0 = 0.2 + 0.8 * t0, k1 = 0.2 + 0.8 * t1;
                    C.set([k.col.r * k0, k.col.g * k0, k.col.b * k0, k.col.r * k1, k.col.g * k1, k.col.b * k1], j * 3);
                    j += 2;
                }
            });
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(P, 3));
            g.setAttribute('color', new THREE.BufferAttribute(C, 3));
            return new THREE.LineSegments(g, mat);
        }
        function punkt(k, t, out) {
            var u = 1 - t;
            out.set(u * u * k.p0.x + 2 * u * t * k.p1.x + t * t * k.p2.x,
                u * u * k.p0.y + 2 * u * t * k.p1.y + t * t * k.p2.y,
                u * u * k.p0.z + 2 * u * t * k.p1.z + t * t * k.p2.z);
            return out;
        }
        var gleisMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
        var gleise = linien(bez, gleisMat); gleise.renderOrder = 3; scene.add(gleise);
        var wahlMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
        var wahlLinien = null, wahlFuer;

        // Lichtpakete: je Bogen zwei Pakete, jedes mit fuenf Schweifpunkten. Ganz auf der GPU.
        var PAKETE = 2, SCHWEIF = 5;
        var nP = bez.length * PAKETE * SCHWEIF;
        var A0 = new Float32Array(nP * 3), A1 = new Float32Array(nP * 3), A2 = new Float32Array(nP * 3);
        var APh = new Float32Array(nP), ASp = new Float32Array(nP), ATr = new Float32Array(nP), ACo = new Float32Array(nP * 3);
        var AZu = new Float32Array(nP), dummy = new Float32Array(nP * 3);
        var kantePunkte = [];
        var j = 0;
        bez.forEach(function (k, ki) {
            var start = j;
            for (var p = 0; p < PAKETE; p++) {
                var ph = ((ki * 0.37) % 1 + p / PAKETE) % 1;
                var sp = 0.55 / (k.len * 0.55 + 2.2);
                for (var s = 0; s < SCHWEIF; s++) {
                    A0.set([k.p0.x, k.p0.y, k.p0.z], j * 3); A1.set([k.p1.x, k.p1.y, k.p1.z], j * 3); A2.set([k.p2.x, k.p2.y, k.p2.z], j * 3);
                    APh[j] = ph; ASp[j] = sp; ATr[j] = s; ACo.set([k.col.r, k.col.g, k.col.b], j * 3);
                    j++;
                }
            }
            kantePunkte.push([start, j]);
        });
        var gP = new THREE.BufferGeometry();
        gP.setAttribute('position', new THREE.BufferAttribute(dummy, 3));
        gP.setAttribute('aP0', new THREE.BufferAttribute(A0, 3));
        gP.setAttribute('aP1', new THREE.BufferAttribute(A1, 3));
        gP.setAttribute('aP2', new THREE.BufferAttribute(A2, 3));
        gP.setAttribute('aPh', new THREE.BufferAttribute(APh, 1));
        gP.setAttribute('aSp', new THREE.BufferAttribute(ASp, 1));
        gP.setAttribute('aTr', new THREE.BufferAttribute(ATr, 1));
        gP.setAttribute('aCo', new THREE.BufferAttribute(ACo, 3));
        var attrZu = new THREE.BufferAttribute(AZu, 1); attrZu.setUsage(THREE.DynamicDrawUsage);
        gP.setAttribute('aZu', attrZu);
        var uPx = { value: renderer.getPixelRatio() };
        var pakete = new THREE.Points(gP, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            uniforms: { uZeit: uZeit, uFluss: uFluss, uPx: uPx, uRuhe: { value: RM ? 1 : 0 } },
            vertexShader: `
                attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aCo;
                attribute float aPh; attribute float aSp; attribute float aTr; attribute float aZu;
                uniform float uZeit; uniform float uFluss; uniform float uPx; uniform float uRuhe;
                varying vec3 vC; varying float vA;
                void main() {
                    float t = fract(aPh + (uRuhe > 0.5 ? 0.0 : uZeit * aSp)) - aTr * 0.011;
                    float ok = step(0.0, t);
                    t = clamp(t, 0.0, 1.0);
                    float u = 1.0 - t;
                    vec3 p = u * u * aP0 + 2.0 * u * t * aP1 + t * t * aP2;
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    // aZu: 0 normal, 1 hervorgehoben, 2 abgedunkelt
                    float hi = step(0.5, aZu) * step(aZu, 1.5);
                    float aus = step(1.5, aZu);
                    float g = (1.0 - aTr * 0.17) * (1.0 + hi * 0.7);
                    gl_PointSize = max(1.0, 7.0 * g * uPx * 26.0 / -mv.z);
                    vA = ok * (1.0 - aTr * 0.2) * uFluss * smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.93, t) * (1.0 - aus * 0.93) * (1.0 + hi);
                    vC = mix(aCo, vec3(1.0), 0.25 + hi * 0.25) * 2.6;
                    gl_Position = projectionMatrix * mv;
                }`,
            fragmentShader: `
                varying vec3 vC; varying float vA;
                void main() {
                    float d = length(gl_PointCoord - 0.5);
                    float a = smoothstep(0.5, 0.0, d);
                    gl_FragColor = vec4(vC * a * a * vA, 1.0);
                }`
        }));
        pakete.frustumCulled = false; pakete.renderOrder = 4; scene.add(pakete);

        // ── Auswahl: Ring, Lichtstrahl in den Himmel, Druckwelle am Boden ──
        var weissM = function (op) { return new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }); };
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.64, 64), weissM(0.9));
        ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
        var welle = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), weissM(0));
        welle.rotation.x = -Math.PI / 2; welle.visible = false; scene.add(welle);
        var strahlGeo = new THREE.CylinderGeometry(0.09, 0.09, 60, 16, 1, true); strahlGeo.translate(0, 30, 0);
        var strahlFarbe = { value: new THREE.Color(1, 1, 1) }, strahlA = { value: 0 };
        var strahl = new THREE.Mesh(strahlGeo, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            uniforms: { uF: strahlFarbe, uA: strahlA },
            vertexShader: `varying float vH; void main() { vH = position.y / 60.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform vec3 uF; uniform float uA; varying float vH;
                void main() { float a = pow(1.0 - vH, 2.2) * uA; gl_FragColor = vec4(uF * 2.2 * a, 1.0); }`
        }));
        strahl.visible = false; strahl.renderOrder = 5; scene.add(strahl);
        var wahlZeit = 0;

        // ── Beschriftung der Viertel (feste Bildschirmgroesse) ─────────
        var schilder = [];
        function schild(text, zahl) {
            var fs = 44, pad = 18;
            var c = document.createElement('canvas'), g = c.getContext('2d');
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif';
            var tw = g.measureText(text).width;
            g.font = '500 ' + (fs * 0.72) + 'px "JetBrains Mono", monospace';
            var zw = g.measureText(String(zahl)).width;
            c.width = Math.ceil(tw + zw + pad * 3); c.height = fs + pad * 2;
            g.fillStyle = 'rgba(6,6,10,0.72)';
            var r = c.height / 2; g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r);
            g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 2; g.stroke();
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif'; g.fillStyle = '#e9e9ef'; g.textBaseline = 'middle';
            g.fillText(text, pad, c.height / 2 + 2);
            g.font = '500 ' + (fs * 0.72) + 'px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(233,233,239,0.45)';
            g.fillText(String(zahl), pad * 2 + tw, c.height / 2 + 2);
            var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
            // sizeAttenuation:false = feste Bildschirmgroesse. Mit Weltgroesse wurde ein
            // Schild beim Heranfliegen bildschirmfuellend und verdeckte den gewaehlten Turm.
            var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, sizeAttenuation: false, fog: false, opacity: 0 }));
            s.userData.verh = c.width / c.height;
            return s;
        }
        gruppen.forEach(function (b) {
            if (b.files.length < 4) return;
            var hmax = 0; b.files.forEach(function (f) { hmax = Math.max(hmax, hoehe[f]); });
            var s = schild(b.g.label, b.files.length);
            var hw = b.files.length >= 20 ? 0.024 : 0.019;
            s.scale.set(hw * s.userData.verh, hw, 1);
            s.center.set(0.5, 0);
            s.position.set(b.x, hmax + 0.5, b.z - b.d / 2);
            s.renderOrder = 10; scene.add(s); schilder.push(s);
        });

        // ── Nachbearbeitung: Szene in HDR, Bloom in drei Stufen, Komposit ──
        var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
        var quadSzene = new THREE.Scene(); quadSzene.add(quad);
        function rt(w, h, samples) {
            return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: samples || 0, depthBuffer: !!samples });
        }
        var rtSzene = rt(2, 2, 4), rtHell = rt(2, 2), stufen = [], hilf = [];
        for (var si = 0; si < 3; si++) { stufen.push(rt(2, 2)); hilf.push(rt(2, 2)); }
        var vsQuad = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
        var matHell = new THREE.ShaderMaterial({
            uniforms: { tSzene: { value: null }, uSchwelle: { value: 0.75 } }, vertexShader: vsQuad, depthTest: false,
            fragmentShader: `uniform sampler2D tSzene; uniform float uSchwelle; varying vec2 vUv;
                void main() { vec3 c = texture2D(tSzene, vUv).rgb; float l = max(c.r, max(c.g, c.b));
                    gl_FragColor = vec4(c * smoothstep(uSchwelle, uSchwelle + 0.8, l), 1.0); }`
        });
        var matBlur = new THREE.ShaderMaterial({
            uniforms: { tQ: { value: null }, uRicht: { value: new THREE.Vector2() } }, vertexShader: vsQuad, depthTest: false,
            fragmentShader: `uniform sampler2D tQ; uniform vec2 uRicht; varying vec2 vUv;
                void main() {
                    vec3 c = texture2D(tQ, vUv).rgb * 0.227027;
                    c += (texture2D(tQ, vUv + uRicht * 1.3846).rgb + texture2D(tQ, vUv - uRicht * 1.3846).rgb) * 0.3162162;
                    c += (texture2D(tQ, vUv + uRicht * 3.2308).rgb + texture2D(tQ, vUv - uRicht * 3.2308).rgb) * 0.0702703;
                    gl_FragColor = vec4(c, 1.0);
                }`
        });
        var matKomp = new THREE.ShaderMaterial({
            uniforms: { tSzene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, uStaerke: { value: 1.15 } },
            vertexShader: vsQuad, depthTest: false,
            fragmentShader: `uniform sampler2D tSzene; uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform float uStaerke; varying vec2 vUv;
                void main() {
                    vec3 c = texture2D(tSzene, vUv).rgb;
                    vec3 b = texture2D(tB0, vUv).rgb * 0.9 + texture2D(tB1, vUv).rgb * 0.8 + texture2D(tB2, vUv).rgb * 0.75;
                    c += b * uStaerke;
                    float vig = smoothstep(1.25, 0.35, length(vUv - 0.5) * 1.6);
                    c *= mix(0.55, 1.0, vig);
                    gl_FragColor = vec4(c, 1.0);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }`
        });
        function pass(mat, ziel) { quad.material = mat; renderer.setRenderTarget(ziel); renderer.render(quadSzene, quadCam); }
        function zeichnen() {
            renderer.setRenderTarget(rtSzene); renderer.render(scene, camera);
            matHell.uniforms.tSzene.value = rtSzene.texture; pass(matHell, rtHell);
            var quelle = rtHell;
            for (var i = 0; i < 3; i++) {
                var s = stufen[i], h = hilf[i];
                matBlur.uniforms.tQ.value = quelle.texture; matBlur.uniforms.uRicht.value.set(1 / s.width, 0); pass(matBlur, h);
                matBlur.uniforms.tQ.value = h.texture; matBlur.uniforms.uRicht.value.set(0, 1 / s.height); pass(matBlur, s);
                quelle = s;
            }
            matKomp.uniforms.tSzene.value = rtSzene.texture;
            matKomp.uniforms.tB0.value = stufen[0].texture; matKomp.uniforms.tB1.value = stufen[1].texture; matKomp.uniforms.tB2.value = stufen[2].texture;
            pass(matKomp, null);
        }

        // ── Zustand (Auswahl, Hover, Filter) in die Puffer schreiben ──
        function passt(n) {
            if (filterType !== 'all' && n.type !== filterType) return false;
            if (searchQ && n.name.toLowerCase().indexOf(searchQ) < 0 && n.path.toLowerCase().indexOf(searchQ) < 0) return false;
            return true;
        }
        var gleisZiel = 0.11;
        function setzeZustand() {
            var nb = sel ? nachbarn(sel).set : null;
            var gefiltert = filterType !== 'all' || !!searchQ;
            for (var i = 0; i < N; i++) {
                var fid = liste[i];
                aDim[i] = nb ? (nb.has(fid) ? 0 : 0.88) : (gefiltert && !passt(RAW.nodes[fid]) ? 0.82 : 0);
                aHi[i] = fid === sel ? 1 : fid === hov ? 0.6 : 0;
            }
            attrDim.needsUpdate = true; attrHi.needsUpdate = true;
            var id = sel || hov || null;
            for (var k = 0; k < bez.length; k++) {
                var e = bez[k].e, z = 0;
                if (id) z = (e.from === id || e.to === id) ? 1 : (sel ? 2 : 0);
                else if (gefiltert) z = (passt(RAW.nodes[e.from]) || passt(RAW.nodes[e.to])) ? 0 : 2;
                for (var q = kantePunkte[k][0]; q < kantePunkte[k][1]; q++) AZu[q] = z;
            }
            attrZu.needsUpdate = true;
            if (wahlFuer !== id) {
                wahlFuer = id;
                if (wahlLinien) { scene.remove(wahlLinien); wahlLinien.geometry.dispose(); wahlLinien = null; }
                if (id) {
                    var eigene = bez.filter(function (b) { return b.e.from === id || b.e.to === id; });
                    if (eigene.length) { wahlLinien = linien(eigene, wahlMat); wahlLinien.renderOrder = 3; scene.add(wahlLinien); }
                }
            }
            gleisZiel = sel ? 0.03 : (hov || gefiltert) ? 0.06 : 0.11;
            schilder.forEach(function (s) { s.userData.ziel = sel ? 0.2 : 1; });
        }

        // ── Kamera: Kugelkoordinaten um ein Ziel, gedaempft ───────────
        var ziel = new THREE.Vector3(), zielSoll = new THREE.Vector3();
        var HEIM_T = -0.65, HEIM_P = 0.98;
        var theta = HEIM_T, thetaSoll = theta, phi = HEIM_P, phiSoll = phi;
        var dist = 1, distSoll = 1, heimDist = 1;
        var flug = null, letzteEingabe = 0, intro = null;

        function heimWerte() {
            var asp = Math.max(0.6, (wrap.clientWidth || 1) / (wrap.clientHeight || 1));
            heimDist = radius * (asp < 1 ? 3.7 : 2.6);
            return heimDist;
        }
        function kameraSetzen() {
            var sp = Math.sin(phi);
            camera.position.set(ziel.x + dist * sp * Math.sin(theta), ziel.y + dist * Math.cos(phi), ziel.z + dist * sp * Math.cos(theta));
            camera.lookAt(ziel);
            var zl = document.getElementById('zLvl');
            if (zl) zl.textContent = Math.round(heimDist / dist * 100) + '%';
        }

        function introStarten() {
            heimWerte();
            intro = { t0: performance.now(), dauer: 3600 };
            ziel.set(0, 0, 0); zielSoll.set(0, 0, 0);
            theta = HEIM_T + 2.4; phi = 0.06; dist = heimDist * 2.3;
            thetaSoll = HEIM_T; phiSoll = HEIM_P; distSoll = heimDist;
        }
        function introBeenden() {
            if (!intro) return;
            intro = null; uIntro.value = 99; uFluss.value = 1;
            theta = thetaSoll; phi = phiSoll; dist = distSoll;
        }

        // ── Bildschleife: laeuft, solange die Ansicht offen ist ──────
        var aktiv = false, raf = 0, letzt = 0;
        function bild(jetzt) {
            raf = 0;
            if (!aktiv) return;
            var dt = letzt ? Math.min(0.05, (jetzt - letzt) / 1000) : 0.016; letzt = jetzt;
            uZeit.value += dt;

            if (intro) {
                var f = clamp((jetzt - intro.t0) / intro.dauer, 0, 1), k = easeInOut(f);
                theta = (HEIM_T + 2.4) + (thetaSoll - (HEIM_T + 2.4)) * k;
                phi = 0.06 + (phiSoll - 0.06) * k;
                dist = heimDist * 2.3 + (distSoll - heimDist * 2.3) * k;
                uIntro.value = (jetzt - intro.t0) / 1000;
                uFluss.value = clamp((f - 0.72) / 0.28, 0, 1);
                if (f >= 1) { intro = null; uIntro.value = 99; uFluss.value = 1; }
            } else if (flug) {
                var g = clamp((jetzt - flug.t0) / flug.dauer, 0, 1), kk = easeInOut(g);
                zielSoll.lerpVectors(flug.vonZiel, flug.nachZiel, kk);
                distSoll = flug.vonDist + (flug.nachDist - flug.vonDist) * kk;
                ziel.copy(zielSoll); dist = distSoll;
                theta += (thetaSoll - theta) * 0.12; phi += (phiSoll - phi) * 0.12;
                if (g >= 1) flug = null;
            } else {
                // Leerlauf: nach 8 s ohne Eingabe dreht die Stadt langsam
                if (!RM && !sel && jetzt - letzteEingabe > 8000) thetaSoll += dt * 0.035;
                var d = 1 - Math.pow(0.0001, dt);
                ziel.lerp(zielSoll, d);
                theta += (thetaSoll - theta) * d; phi += (phiSoll - phi) * d; dist += (distSoll - dist) * d;
            }

            gleisMat.opacity += ((intro ? 0 : gleisZiel) - gleisMat.opacity) * 0.08;
            schilder.forEach(function (s) {
                var z = intro ? 0 : (s.userData.ziel == null ? 1 : s.userData.ziel);
                s.material.opacity += (z - s.material.opacity) * 0.1;
            });

            if (sel && pos[sel] && wahlZeit) {
                var w = clamp((jetzt - wahlZeit) / 1100, 0, 1);
                welle.visible = w < 1;
                welle.scale.setScalar(1 + easeOut(w) * 9);
                welle.material.opacity = (1 - w) * 0.7;
                strahlA.value = (RM ? 0.5 : (0.35 + 0.65 * Math.exp(-w * 3))) * (0.85 + 0.15 * Math.sin(uZeit.value * 2.2));
            }

            kameraSetzen();
            zeichnen();
            raf = requestAnimationFrame(bild);
        }
        function bitte() { if (aktiv && !raf) { letzt = 0; raf = requestAnimationFrame(bild); } }

        function groesse() {
            var w = wrap.clientWidth, h = wrap.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            var pr = renderer.getPixelRatio(), W = Math.floor(w * pr), H = Math.floor(h * pr);
            rtSzene.setSize(W, H); rtHell.setSize(W >> 1, H >> 1);
            for (var i = 0; i < 3; i++) { var f = 1 << (i + 1); stufen[i].setSize(Math.max(1, W / f | 0), Math.max(1, H / f | 0)); hilf[i].setSize(Math.max(1, W / f | 0), Math.max(1, H / f | 0)); }
            uPx.value = pr;
            camera.aspect = w / h; camera.updateProjectionMatrix();
            heimWerte(); bitte();
        }

        function heim() {
            flug = null; introBeenden();
            zielSoll.set(0, 0, 0); thetaSoll = HEIM_T; phiSoll = HEIM_P; distSoll = heimWerte();
        }
        function zoom(f) { introBeenden(); distSoll = clamp(distSoll / f, 4, heimDist * 2.6); letzteEingabe = performance.now(); }
        function flieg(id) {
            var p = pos[id]; if (!p) return;
            introBeenden();
            var nach = new THREE.Vector3(p.x, hoehe[id] * 0.5, p.z);
            // Abstand so, dass Turm UND Nachbarn ins Bild passen — sonst zeigen die Boegen ins Leere
            var weit = 4;
            nachbarn(id).set.forEach(function (o) { if (pos[o]) weit = Math.max(weit, pos[o].distanceTo(p)); });
            var nachDist = clamp(weit * 3.2, 14, heimDist * 1.1);   // 3.2 ~ 1 / tan(halbe Sichthoehe 19 Grad), plus Rand
            phiSoll = Math.min(phiSoll, 1.05);
            letzteEingabe = performance.now();
            if (RM) { zielSoll.copy(nach); ziel.copy(nach); distSoll = dist = nachDist; return; }
            flug = { t0: performance.now(), dauer: 1100, vonZiel: ziel.clone(), nachZiel: nach, vonDist: dist, nachDist: nachDist };
        }

        // ── Zeiger: drehen, verschieben, zoomen, waehlen ──────────────
        var ray = new THREE.Raycaster(), maus = new THREE.Vector2();
        function treffer(cx, cy) {
            var r = canvas.getBoundingClientRect();
            maus.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
            ray.setFromCamera(maus, camera);
            var t = ray.intersectObject(tuerme, false);
            return t.length ? liste[t[0].instanceId] : null;
        }

        var zeiger = new Map(), start = null, bewegt = false, pinch = 0;
        canvas.addEventListener('pointerdown', function (e) {
            canvas.setPointerCapture(e.pointerId);
            zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (zeiger.size === 1) { start = { x: e.clientX, y: e.clientY, knopf: e.button, shift: e.shiftKey || e.ctrlKey || e.metaKey }; bewegt = false; }
            if (zeiger.size === 2) { var a = Array.from(zeiger.values()); pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
            letzteEingabe = performance.now();
            if (intro) introBeenden();
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
                var a = Array.from(zeiger.values());
                var nd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
                if (pinch) zoom(nd / pinch);
                pinch = nd; return;
            }
            if (!bewegt) return;
            hideTT(); flug = null;
            if (start && (start.knopf === 2 || start.shift)) {
                var s = dist * 0.0016;
                zielSoll.x -= (dx * Math.cos(theta) + dy * Math.sin(theta)) * s;
                zielSoll.z -= (dx * -Math.sin(theta) + dy * Math.cos(theta)) * s;
            } else {
                thetaSoll -= dx * 0.0055;
                phiSoll = clamp(phiSoll - dy * 0.0045, 0.18, 1.42);
            }
            canvas.style.cursor = 'grabbing';
        });
        function los(e) {
            var warEiner = zeiger.size === 1;
            zeiger.delete(e.pointerId);
            if (zeiger.size < 2) pinch = 0;
            if (warEiner && start && !bewegt) {
                var id = treffer(e.clientX, e.clientY);
                if (id) { selectNode(id); flieg(id); }
                else if (sel) closeDetail();
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
            if (sel && pos[sel]) {
                var p = pos[sel];
                ring.visible = true; ring.position.set(p.x, 0.03, p.z);
                strahl.visible = true; strahl.position.set(p.x, hoehe[sel], p.z);
                strahlFarbe.value.copy(grund[index[sel]]).lerp(new THREE.Color(1, 1, 1), 0.5);
                welle.position.set(p.x, 0.04, p.z);
                if (letzteWahl !== sel) { wahlZeit = performance.now(); letzteWahl = sel; }
            } else {
                ring.visible = false; strahl.visible = false; welle.visible = false; letzteWahl = null; wahlZeit = 0;
            }
        }

        setzeZustand();
        var ersterStart = true;
        return {
            an: function () {
                aktiv = true; canvas.classList.add('on'); groesse();
                if (ersterStart) {
                    ersterStart = false;
                    if (RM) { heim(); uIntro.value = 99; uFluss.value = 1; ziel.copy(zielSoll); theta = thetaSoll; phi = phiSoll; dist = distSoll; }
                    else introStarten();
                }
                letzteEingabe = performance.now();
                sync(); bitte();
            },
            aus: function () { aktiv = false; canvas.classList.remove('on'); if (raf) { cancelAnimationFrame(raf); raf = 0; } },
            sync: sync, groesse: groesse, heim: heim, zoom: zoom, flieg: flieg,
            png: function () { kameraSetzen(); zeichnen(); return canvas.toDataURL('image/png'); }
        };
    }
})();
