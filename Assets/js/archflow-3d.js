// ═══ ARCHFLOW 3D MODULE ═══
// /archflow/ Ansicht „3D“: der Quellcode als Planet. Gruppe = leuchtender Kontinent
// aus Lichtpunkten, Datei = Glasturm, der aus der Kugel ragt (Hoehe = sqrt(ein+aus),
// Fenster brennen nach Aktivitaet), Farbe = Dateiart (TC der Seite), Verbindung =
// Flugroute ueber die Kugel mit wanderndem Lichtpaket vom Lader zur geladenen Datei.
//
// Haengt an den Globals des Hauptskripts der Seite (NODES, EDGES, GROUPS, RAW, sel,
// hov, filterType, searchQ, TC, selectNode, closeDetail, showTT, hideTT, nachbarn).
// Das Hauptskript ruft window.AF3D nur, solange layout === '3d'.
//
// Werdegang (21.10.2026, alles an einem Abend): ruhige Stadt -> „Standard-Three.js“;
// Nachtstadt mit Fensterklotzen -> „Shader so naja, viel krasser, absurder“. Dies ist
// Fassung drei; Fassung vier bekam Boden (Meer, Gradnetz, Kontinente) und eine
// Globus-Kamera (seitlicher Blick moeglich). Bewusst VIEL Effekt (Bloom, Fluss, Atmosphaere, Sterne, Korn,
// Farbsaum) — Wunsch des Nutzers, hier gilt die sonstige Ein-Effekt-Regel nicht.
// prefers-reduced-motion: kein Anflug, kein Fluss, kein Drehen, kein Funkeln.
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
        var camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2000);
        var akzent = new THREE.Color((getComputedStyle(document.documentElement).getPropertyValue('--primary') || '').trim() || '#5578a8');
        var akzentHell = akzent.clone().lerp(new THREE.Color('#bcd2ff'), 0.55);

        var uZeit = { value: 0 }, uIntro = { value: RM ? 99 : 0 }, uFluss = { value: RM ? 1 : 0 };
        var uRuhe = { value: RM ? 1 : 0 };

        // ── Layout: Viertel erst flach packen (wie die 2D-Karte), dann auf die Kugel legen ──
        var ZELLE = 1.05, FUSS = 0.58, RAND = 0.6, LUECKE = 2.4;
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
            for (var s = 1; s < 30000; s++) {
                var r = 1.35 * Math.sqrt(s), a = s * 2.39996;
                var x = Math.cos(a) * r, z = Math.sin(a) * r;
                if (frei(x, z, b)) { b.x = x; b.z = z; platziert.push({ x: x, z: z, b: b }); return; }
            }
        });
        var flach = {}, rMax = 1;
        gruppen.forEach(function (b, gi) {
            b.files.forEach(function (fid, fi) {
                var c = fi % b.k, r = Math.floor(fi / b.k);
                var x = b.x - b.w / 2 + RAND + (c + 0.5) * ZELLE, z = b.z - b.d / 2 + RAND + (r + 0.5) * ZELLE;
                flach[fid] = { x: x, z: z, g: gi };
                rMax = Math.max(rMax, Math.hypot(x, z));
            });
        });
        // Flaechentreue Azimutalprojektion (Lambert): der Mittelpunkt wird der Nordpol,
        // aussen reicht die Stadt bis ~112 Grad. Flaechentreu, damit die vielen kleinen
        // Viertel am Rand nicht zusammengequetscht werden.
        var MAXW = Math.PI * 0.62;
        var R = (rMax + 1.5) / (2 * Math.sin(MAXW / 2));
        function aufKugel(x, z) {
            var r = Math.hypot(x, z), w = 2 * Math.asin(clamp(r / (2 * R), 0, 1)), az = Math.atan2(z, x);
            return new V(Math.sin(w) * Math.cos(az), Math.cos(w), Math.sin(w) * Math.sin(az));
        }

        var richt = {}, hoehe = {}, liste = [], index = {}, maxGrad = 1;
        NODES.forEach(function (n) { maxGrad = Math.max(maxGrad, (n.inDegree || 0) + (n.outDegree || 0)); });
        gruppen.forEach(function (b) {
            b.files.forEach(function (fid) {
                var n = RAW.nodes[fid], f = flach[fid];
                richt[fid] = aufKugel(f.x, f.z);
                hoehe[fid] = 0.3 + Math.sqrt((n.inDegree || 0) + (n.outDegree || 0)) * 0.55;
                index[fid] = liste.length; liste.push(fid);
            });
            var m = new V(); b.files.forEach(function (f) { m.add(richt[f]); }); b.mitte = m.normalize();
            var wMax = 0; b.files.forEach(function (f) { wMax = Math.max(wMax, b.mitte.angleTo(richt[f])); });
            b.winkel = wMax + 0.55 / R + 0.02;
            var hmax = 0; b.files.forEach(function (f) { hmax = Math.max(hmax, hoehe[f]); }); b.hmax = hmax;
        });
        function spitze(fid) { return richt[fid].clone().multiplyScalar(R + hoehe[fid]); }

        // ── Sterne: zwei Schichten, funkeln leise ──────────────────────
        (function () {
            var n = schmal ? 1800 : 3600, P = new Float32Array(n * 3), S = new Float32Array(n), K = new Float32Array(n);
            for (var i = 0; i < n; i++) {
                var u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, rr = 420 + Math.random() * 380, q = Math.sqrt(1 - u * u);
                P.set([q * Math.cos(a) * rr, u * rr, q * Math.sin(a) * rr], i * 3);
                S[i] = Math.pow(Math.random(), 6) * 2.6 + 0.6; K[i] = Math.random() * 100;
            }
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(P, 3));
            g.setAttribute('aS', new THREE.BufferAttribute(S, 1)); g.setAttribute('aK', new THREE.BufferAttribute(K, 1));
            var sterne = new THREE.Points(g, new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                uniforms: { uZeit: uZeit, uRuhe: uRuhe, uPx: { value: renderer.getPixelRatio() } },
                vertexShader: `attribute float aS; attribute float aK; uniform float uZeit; uniform float uRuhe; uniform float uPx; varying float vA;
                    void main() { vA = 0.45 + 0.55 * (uRuhe > 0.5 ? 1.0 : 0.5 + 0.5 * sin(uZeit * (0.6 + fract(aK) * 1.4) + aK));
                        gl_PointSize = aS * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
                fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
                    gl_FragColor = vec4(vec3(0.75, 0.82, 1.0) * a * a * vA * 1.4, 1.0); }`
            }));
            sterne.frustumCulled = false; scene.add(sterne);
        })();

        var uGrp = { value: -1 };
        // ── Planetenboden: Meer, Gradnetz, Kontinente mit Umriss, Tag- und Nachtseite ──
        // Ohne Boden sah der Planet aus der Naehe „nicht fertig“ aus (Meldung des Nutzers):
        // Kaesten ueber schwarzem Nichts. Erst Meer + Gradnetz + Kuestenlinie lesen sich als Welt.
        var NK = gruppen.length;
        var kontRicht = [], kontFarbe = [];
        gruppen.forEach(function (b) {
            var zaehl = {}; b.files.forEach(function (f) { var t = RAW.nodes[f].type; zaehl[t] = (zaehl[t] || 0) + 1; });
            var top = Object.keys(zaehl).sort(function (x, y) { return zaehl[y] - zaehl[x]; })[0];
            kontRicht.push(new THREE.Vector4(b.mitte.x, b.mitte.y, b.mitte.z, b.winkel));
            kontFarbe.push(new THREE.Color(TC[top] || TC.other));
        });
        var uSonne = { value: new V(0.55, 0.6, 0.58).normalize() };
        var kern = new THREE.Mesh(new THREE.SphereGeometry(R - 0.03, 160, 120), new THREE.ShaderMaterial({
            defines: { NK: NK },
            uniforms: { uAkz: { value: akzentHell }, uK: { value: kontRicht }, uKF: { value: kontFarbe }, uSonne: uSonne, uIntro: uIntro, uGrp: uGrp },
            vertexShader: `varying vec3 vP; varying vec3 vN;
                void main() { vP = normalize(position); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform vec3 uAkz; uniform vec4 uK[NK]; uniform vec3 uKF[NK]; uniform vec3 uSonne; uniform float uIntro; uniform float uGrp;
                varying vec3 vP; varying vec3 vN;
                float linie(float x, float breite) { float w = fwidth(x) * breite; float f = abs(fract(x + 0.5) - 0.5); return 1.0 - smoothstep(0.0, w, f); }
                void main() {
                    vec3 d = normalize(vP);
                    float tag = smoothstep(-0.35, 0.6, dot(d, uSonne));
                    // Meer: tiefes Blau, auf der Tagseite heller
                    vec3 c = mix(vec3(0.006, 0.009, 0.02), vec3(0.016, 0.026, 0.06), tag);
                    // Gradnetz alle 10 Grad, zum Pol hin ausgeduennt
                    float lat = asin(clamp(d.y, -1.0, 1.0)), lon = atan(d.z, d.x);
                    float netz = max(linie(lat * 18.0 / 3.14159265, 1.2), linie(lon * 18.0 / 3.14159265, 1.2) * smoothstep(0.995, 0.9, abs(d.y)));
                    c += uAkz * netz * (0.035 + 0.04 * tag);
                    float sicht = smoothstep(acos(clamp(d.y, -1.0, 1.0)) * 0.75, acos(clamp(d.y, -1.0, 1.0)) * 0.75 + 0.6, uIntro);
                    for (int k = 0; k < NK; k++) {
                        float cw = dot(d, uK[k].xyz);
                        float w = uK[k].w;
                        if (cw < cos(w + 0.04)) continue;
                        float ang = acos(clamp(cw, -1.0, 1.0));
                        float aa = fwidth(ang) * 1.2;
                        float innen = 1.0 - smoothstep(w - aa, w + aa, ang);
                        float kueste = 1.0 - smoothstep(0.0, aa * 1.8 + 0.0015, abs(ang - w));
                        float hell = (uGrp > -0.5 && abs(float(k) - uGrp) < 0.5) ? 1.8 : 1.0;
                        vec3 land = mix(vec3(0.028, 0.032, 0.05), uKF[k] * 0.11, 0.5) * (0.55 + 0.45 * tag);
                        // Innenleben: feines Strassenraster wie eine Leiterplatte
                        float raster = max(linie(lat * 260.0 / 3.14159265, 0.9), linie(lon * 260.0 / 3.14159265, 0.9)) * 0.5;
                        land += uKF[k] * raster * 0.06;
                        c = mix(c, land * hell, innen * sicht);
                        c += uKF[k] * kueste * 1.1 * hell * sicht;
                    }
                    // Randlicht der Kugel
                    float f = pow(1.0 - max(dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0), 2.6);
                    c += uAkz * f * 0.22;
                    gl_FragColor = vec4(c, 1.0);
                }`
        }));
        scene.add(kern);
        // Atmosphaere: Ruecklicht um die Kugel
        var atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 96, 64), new THREE.ShaderMaterial({
            side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            uniforms: { uAkz: { value: akzentHell } },
            vertexShader: `varying vec3 vN; void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform vec3 uAkz; varying vec3 vN;
                void main() { float i = pow(clamp(0.68 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 4.0); gl_FragColor = vec4(uAkz * i * 0.34, 1.0); }`
        }));
        scene.add(atmo);

        // ── Oberflaeche: Fibonacci-Lichtpunkte, Kontinente = Viertel ───
        (function () {
            var n = schmal ? 26000 : 52000, P = new Float32Array(n * 3), IN = new Float32Array(n), G = new Float32Array(n), D = new Float32Array(n);
            var gold = Math.PI * (3 - Math.sqrt(5)), d = new V(), m = 0;
            for (var i = 0; i < n; i++) {
                var y = 1 - (i / (n - 1)) * 2, q = Math.sqrt(1 - y * y), a = i * gold;
                d.set(Math.cos(a) * q, y, Math.sin(a) * q);
                var gi = -1, best = 0;
                for (var k = 0; k < gruppen.length; k++) {
                    var b = gruppen[k], ang = b.mitte.angleTo(d);
                    if (ang < b.winkel) { var s = 1 - ang / b.winkel; if (s > best) { best = s; gi = k; } }
                }
                if (gi < 0) continue;
                P.set([d.x * R, d.y * R, d.z * R], m * 3);
                IN[m] = Math.min(1, 0.35 + best * 1.6); G[m] = gi; D[m] = Math.acos(clamp(d.y, -1, 1)) * 0.75; m++;
            }
            P = P.subarray(0, m * 3); IN = IN.subarray(0, m); G = G.subarray(0, m); D = D.subarray(0, m);
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(P, 3));
            g.setAttribute('aIn', new THREE.BufferAttribute(IN, 1)); g.setAttribute('aG', new THREE.BufferAttribute(G, 1)); g.setAttribute('aD', new THREE.BufferAttribute(D, 1));
            var punkte = new THREE.Points(g, new THREE.ShaderMaterial({
                transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                uniforms: { uZeit: uZeit, uIntro: uIntro, uPx: { value: renderer.getPixelRatio() }, uAkz: { value: akzentHell }, uGrp: uGrp, uR: { value: R } },
                vertexShader: `attribute float aIn; attribute float aG; attribute float aD;
                    uniform float uIntro; uniform float uPx; uniform float uGrp; uniform float uR;
                    varying float vIn; varying float vA; varying float vSel; varying float vFace;
                    void main() {
                        vec4 mv = modelViewMatrix * vec4(position, 1.0);
                        vec3 nV = normalize(normalMatrix * normalize(position));
                        vFace = dot(nV, normalize(-mv.xyz));
                        vIn = aIn; vSel = (uGrp >= 0.0 && abs(aG - uGrp) < 0.5) ? 1.0 : 0.0;
                        vA = smoothstep(aD, aD + 0.5, uIntro);
                        float s = 1.8;
                        gl_PointSize = min(s * uPx * (uR * 2.6) / -mv.z, 2.6 * uPx);   // gedeckelt: aus der Naehe wurde die Oberflaeche ein grobes Raster
                        gl_Position = projectionMatrix * mv;
                    }`,
                fragmentShader: `uniform vec3 uAkz; varying float vIn; varying float vA; varying float vSel; varying float vFace;
                    void main() {
                        float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
                        float a = smoothstep(0.5, 0.15, d) * vA * smoothstep(-0.05, 0.25, vFace);
                        vec3 aus = vec3(0.10, 0.12, 0.2) * 0.55;
                        vec3 an = mix(vec3(0.85, 0.9, 1.0), uAkz, 0.35) * (0.55 + vIn * 0.55);
                        vec3 c = mix(aus, an, step(0.01, vIn)) * (1.0 + vSel * 0.5);
                        gl_FragColor = vec4(c * a, 1.0);
                    }`
            }));
            punkte.frustumCulled = false; punkte.renderOrder = 1; scene.add(punkte);
        })();

        // ── Tuerme: Glasprismen mit feinem Fensterraster und Neonkanten ──
        var geoTurm = new THREE.BoxGeometry(FUSS, 1, FUSS); geoTurm.translate(0, 0.5, 0);
        var N = liste.length;
        var aSeed = new Float32Array(N), aDelay = new Float32Array(N), aAkt = new Float32Array(N), aDim = new Float32Array(N), aHi = new Float32Array(N);
        liste.forEach(function (fid, i) {
            var n = RAW.nodes[fid];
            aSeed[i] = (i * 0.61803) % 1 * 97 + 3;
            aDelay[i] = Math.acos(clamp(richt[fid].y, -1, 1)) * 0.75 + 0.35 + ((i * 7) % 11) * 0.02;
            aAkt[i] = Math.sqrt(((n.inDegree || 0) + (n.outDegree || 0)) / maxGrad);
        });
        geoTurm.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
        geoTurm.setAttribute('aDelay', new THREE.InstancedBufferAttribute(aDelay, 1));
        geoTurm.setAttribute('aAkt', new THREE.InstancedBufferAttribute(aAkt, 1));
        var attrDim = new THREE.InstancedBufferAttribute(aDim, 1); attrDim.setUsage(THREE.DynamicDrawUsage);
        var attrHi = new THREE.InstancedBufferAttribute(aHi, 1); attrHi.setUsage(THREE.DynamicDrawUsage);
        geoTurm.setAttribute('aDim', attrDim); geoTurm.setAttribute('aHi', attrHi);

        var turmMat = new THREE.ShaderMaterial({
            uniforms: { uZeit: uZeit, uIntro: uIntro, uAkz: { value: akzentHell }, uFuss: { value: FUSS } },
            vertexShader: `
                attribute float aSeed; attribute float aDelay; attribute float aAkt; attribute float aDim; attribute float aHi;
                uniform float uIntro;
                varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vLN; varying vec3 vCol;
                varying float vY; varying float vH; varying float vSeed; varying float vAkt; varying float vDim; varying float vHi; varying float vLicht;
                void main() {
                    float t = clamp((uIntro - aDelay) / 0.9, 0.0, 1.0);
                    float wachs = 1.0 - pow(1.0 - t, 4.0);
                    vec3 p = position; p.y *= max(wachs, 0.0005);
                    vec4 w = modelMatrix * instanceMatrix * vec4(p, 1.0);
                    float hs = length(instanceMatrix[1].xyz);
                    vY = p.y * hs; vH = hs * wachs;
                    vN = normalize(mat3(instanceMatrix) * normal); vLN = normal;
                    vW = w.xyz; vL = position; vCol = instanceColor;
                    vSeed = aSeed; vAkt = aAkt; vDim = aDim; vHi = aHi;
                    vLicht = clamp((uIntro - aDelay - 0.6) / 0.7, 0.0, 1.0);
                    gl_Position = projectionMatrix * viewMatrix * w;
                }`,
            fragmentShader: `
                uniform float uZeit; uniform vec3 uAkz; uniform float uFuss;
                varying vec3 vN; varying vec3 vW; varying vec3 vL; varying vec3 vLN; varying vec3 vCol;
                varying float vY; varying float vH; varying float vSeed; varying float vAkt; varying float vDim; varying float vHi; varying float vLicht;
                float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
                float kasten(float x, float a, float b) { float w = fwidth(x) * 0.75; return smoothstep(a - w, a + w, x) * (1.0 - smoothstep(b - w, b + w, x)); }
                void main() {
                    vec3 n = normalize(vN), v = normalize(cameraPosition - vW);
                    float fres = pow(1.0 - clamp(abs(dot(n, v)), 0.0, 1.0), 2.5);
                    float halb = uFuss * 0.5;
                    vec3 c;
                    if (vLN.y > 0.5) {
                        // Dach: dunkles Glas, Lichtrahmen in Dateifarbe
                        vec2 q = abs(vL.xz) / halb;
                        float rahmen = smoothstep(0.80, 0.94, max(q.x, q.y));
                        c = vCol * (0.12 + rahmen * 3.2) * (0.25 + 0.75 * vLicht);
                    } else if (vLN.y < -0.5) {
                        c = vec3(0.0);
                    } else {
                        float u = abs(vLN.x) > 0.5 ? vL.z : vL.x;
                        float seite = abs(vLN.x) > 0.5 ? (vLN.x > 0.0 ? 1.0 : 2.0) : (vLN.z > 0.0 ? 3.0 : 4.0);
                        // Glas: tiefdunkel, spiegelt den Akzenthimmel am Rand, wird nach oben heller
                        float hoch = clamp(vY / max(vH, 0.001), 0.0, 1.0);
                        c = vCol * 0.04 + uAkz * fres * 0.08 + vCol * 0.10 * hoch * hoch;
                        // Fensterraster: 5 Spalten, Stockwerk 0.11 — fein genug, um als Glasfassade zu lesen
                        float sx = (u / uFuss + 0.5) * 5.0, sy = vY / 0.11;
                        float spalte = floor(sx), stock = floor(sy);
                        float fenster = kasten(fract(sx), 0.16, 0.84) * kasten(fract(sy), 0.24, 0.76) * step(1.0, sy) * step(sy, vH / 0.11 - 0.6);
                        float takt = floor(uZeit * 0.09 + hash(vec3(vSeed, stock, spalte)) * 9.0);
                        float zufall = hash(vec3(vSeed + seite * 13.0, stock * 1.7 + takt * 0.37, spalte));
                        float an = step(zufall, 0.10 + 0.70 * vAkt);
                        float glanz = 0.55 + 0.45 * hash(vec3(spalte, stock, vSeed + 7.0));
                        vec3 licht = mix(vec3(1.0, 0.94, 0.86), vCol, 0.38);
                        c += licht * fenster * an * glanz * (1.9 + vHi * 1.6) * vLicht;
                        // Neonkanten: senkrechte Gratlinien und ein Kranz unter dem Dach
                        float grat = 1.0 - smoothstep(0.0, fwidth(u) * 1.6 + 0.004, halb - abs(u));
                        float kranz = kasten(vH - vY, 0.03, 0.075);
                        c += vCol * (grat * 0.55 + kranz * 1.8) * vLicht;
                        // Abtaststrahl: ein Lichtband laeuft langsam an den Tuermen hoch
                        float band = exp(-pow((fract(uZeit * 0.07 + vSeed * 0.013) * (vH + 3.0) - vY) * 3.0, 2.0));
                        c += vCol * band * 0.6 * vLicht * (0.4 + vAkt);
                    }
                    c += vec3(0.9, 0.95, 1.0) * vHi * 0.10;
                    c = mix(c, vec3(0.002, 0.002, 0.006), vDim);
                    gl_FragColor = vec4(c, 1.0);
                }`
        });
        var tuerme = new THREE.InstancedMesh(geoTurm, turmMat, N);
        var grund = liste.map(function (fid) { return new THREE.Color(TC[RAW.nodes[fid].type] || TC.other); });
        var tmpM = new THREE.Matrix4(), OBEN = new V(0, 1, 0), XA = new V(1, 0, 0);
        function rahmen(nv, ost, nord) {
            ost.crossVectors(OBEN, nv); if (ost.lengthSq() < 1e-6) ost.copy(XA); ost.normalize();
            nord.crossVectors(nv, ost).normalize();
        }
        (function () {
            var ost = new V(), nord = new V(), s = new V();
            liste.forEach(function (fid, i) {
                var nv = richt[fid]; rahmen(nv, ost, nord);
                tmpM.makeBasis(ost, nv, nord); tmpM.scale(s.set(1, hoehe[fid], 1));
                tmpM.setPosition(nv.x * R, nv.y * R, nv.z * R);
                tuerme.setMatrixAt(i, tmpM); tuerme.setColorAt(i, grund[i]);
            });
        })();
        tuerme.renderOrder = 2; scene.add(tuerme);

        // ── Flugrouten: Grosskreis + Hoehenbuckel, CPU (Linien) und GPU (Pakete) gleich ──
        var kanten = EDGES.filter(function (e) { return richt[e.from] && richt[e.to] && e.from !== e.to; });
        var bez = kanten.map(function (e) {
            var a = richt[e.from], b = richt[e.to], om = a.angleTo(b);
            return { e: e, a: a, b: b, ha: hoehe[e.from], hb: hoehe[e.to], buckel: 0.4 + om * R * 0.27, om: om,
                col: new THREE.Color(TC[RAW.nodes[e.to].type] || TC.other) };
        });
        function routenPunkt(k, t, out) {
            var om = k.om, s = Math.sin(om), wa, wb;
            if (s < 1e-4) { wa = 1 - t; wb = t; } else { wa = Math.sin((1 - t) * om) / s; wb = Math.sin(t * om) / s; }
            out.set(k.a.x * wa + k.b.x * wb, k.a.y * wa + k.b.y * wb, k.a.z * wa + k.b.z * wb).normalize();
            return out.multiplyScalar(R + k.ha + (k.hb - k.ha) * t + k.buckel * Math.sin(Math.PI * t));
        }
        var SEG = 28;
        function linien(menge, mat) {
            var n = menge.length * SEG * 2, P = new Float32Array(n * 3), C = new Float32Array(n * 3), j = 0, v = new V(), w = new V();
            menge.forEach(function (k) {
                for (var s = 0; s < SEG; s++) {
                    var t0 = s / SEG, t1 = (s + 1) / SEG;
                    routenPunkt(k, t0, v); routenPunkt(k, t1, w);
                    P.set([v.x, v.y, v.z, w.x, w.y, w.z], j * 3);
                    var k0 = 0.15 + 0.85 * t0, k1 = 0.15 + 0.85 * t1;
                    C.set([k.col.r * k0, k.col.g * k0, k.col.b * k0, k.col.r * k1, k.col.g * k1, k.col.b * k1], j * 3);
                    j += 2;
                }
            });
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3));
            return new THREE.LineSegments(g, mat);
        }
        var gleisMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        var gleise = linien(bez, gleisMat); gleise.renderOrder = 3; scene.add(gleise);
        var wahlMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
        var wahlLinien = null, wahlFuer;

        // Lichtpakete: je Route zwei, jedes mit langem Schweif (8 Punkte)
        var PAKETE = 2, SCHWEIF = 8, nP = bez.length * PAKETE * SCHWEIF;
        var AA = new Float32Array(nP * 3), AB = new Float32Array(nP * 3), AH = new Float32Array(nP * 3), AW = new Float32Array(nP);
        var APh = new Float32Array(nP), ASp = new Float32Array(nP), ATr = new Float32Array(nP), ACo = new Float32Array(nP * 3), AZu = new Float32Array(nP);
        var kantePunkte = [], j = 0;
        bez.forEach(function (k, ki) {
            var start = j, sp = 0.5 / (k.om * R * 0.6 + 2.5);
            for (var p = 0; p < PAKETE; p++) {
                var ph = ((ki * 0.37) % 1 + p / PAKETE) % 1;
                for (var s = 0; s < SCHWEIF; s++) {
                    AA.set([k.a.x, k.a.y, k.a.z], j * 3); AB.set([k.b.x, k.b.y, k.b.z], j * 3); AH.set([k.ha, k.hb, k.buckel], j * 3);
                    AW[j] = k.om; APh[j] = ph; ASp[j] = sp; ATr[j] = s; ACo.set([k.col.r, k.col.g, k.col.b], j * 3); j++;
                }
            }
            kantePunkte.push([start, j]);
        });
        var gP = new THREE.BufferGeometry();
        gP.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nP * 3), 3));
        [['aA', AA, 3], ['aB', AB, 3], ['aH', AH, 3], ['aW', AW, 1], ['aPh', APh, 1], ['aSp', ASp, 1], ['aTr', ATr, 1], ['aCo', ACo, 3]].forEach(function (x) {
            gP.setAttribute(x[0], new THREE.BufferAttribute(x[1], x[2]));
        });
        var attrZu = new THREE.BufferAttribute(AZu, 1); attrZu.setUsage(THREE.DynamicDrawUsage); gP.setAttribute('aZu', attrZu);
        var uPx = { value: renderer.getPixelRatio() };
        var pakete = new THREE.Points(gP, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            uniforms: { uZeit: uZeit, uFluss: uFluss, uPx: uPx, uRuhe: uRuhe, uR: { value: R } },
            vertexShader: `
                attribute vec3 aA; attribute vec3 aB; attribute vec3 aH; attribute vec3 aCo;
                attribute float aW; attribute float aPh; attribute float aSp; attribute float aTr; attribute float aZu;
                uniform float uZeit; uniform float uFluss; uniform float uPx; uniform float uRuhe; uniform float uR;
                varying vec3 vC; varying float vA;
                void main() {
                    float t = fract(aPh + (uRuhe > 0.5 ? 0.0 : uZeit * aSp)) - aTr * 0.0065;
                    float ok = step(0.0, t); t = clamp(t, 0.0, 1.0);
                    float s = sin(aW); float wa = 1.0 - t, wb = t;
                    if (s > 0.0001) { wa = sin((1.0 - t) * aW) / s; wb = sin(t * aW) / s; }
                    vec3 d = normalize(aA * wa + aB * wb);
                    vec3 p = d * (uR + mix(aH.x, aH.y, t) + aH.z * sin(3.14159265 * t));
                    vec4 mv = modelViewMatrix * vec4(p, 1.0);
                    float hi = step(0.5, aZu) * step(aZu, 1.5), aus = step(1.5, aZu);
                    float kopf = 1.0 - aTr / 8.0;
                    gl_PointSize = max(1.0, (2.0 + 5.5 * kopf * kopf) * (1.0 + hi * 0.6) * uPx * 24.0 / -mv.z);
                    vA = ok * kopf * kopf * uFluss * smoothstep(0.0, 0.04, t) * smoothstep(1.0, 0.95, t) * (1.0 - aus * 0.94) * (1.0 + hi * 1.2);
                    vC = mix(aCo, vec3(1.0), 0.2 + (1.0 - aTr / 8.0) * 0.35) * 3.0;
                    gl_Position = projectionMatrix * mv;
                }`,
            fragmentShader: `varying vec3 vC; varying float vA;
                void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * a * vA, 1.0); }`
        }));
        pakete.frustumCulled = false; pakete.renderOrder = 4; scene.add(pakete);

        // ── Auswahl: Ring + Druckwelle auf der Oberflaeche, Strahl ins All ──
        function weissM() { return new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); }
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 64), weissM()); ring.visible = false; scene.add(ring);
        var welle = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 128), weissM()); welle.visible = false; scene.add(welle);
        var strahlGeo = new THREE.CylinderGeometry(0.07, 0.07, 90, 16, 1, true); strahlGeo.translate(0, 45, 0);
        var strahlFarbe = { value: new THREE.Color(1, 1, 1) }, strahlA = { value: 0 };
        var strahl = new THREE.Mesh(strahlGeo, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
            uniforms: { uF: strahlFarbe, uA: strahlA },
            vertexShader: `varying float vH; void main() { vH = position.y / 90.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform vec3 uF; uniform float uA; varying float vH; void main() { gl_FragColor = vec4(uF * 2.6 * pow(1.0 - vH, 2.6) * uA, 1.0); }`
        }));
        strahl.visible = false; strahl.renderOrder = 5; scene.add(strahl);
        var wahlZeit = 0, ZA = new V(0, 0, 1);

        // ── Beschriftung der Kontinente (feste Bildschirmgroesse, Rueckseite blendet aus) ──
        var schilder = [];
        function schild(text, zahl) {
            var fs = 40, pad = 16, c = document.createElement('canvas'), g = c.getContext('2d');
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif'; var tw = g.measureText(text).width;
            g.font = '500 ' + (fs * 0.7) + 'px "JetBrains Mono", monospace'; var zw = g.measureText(String(zahl)).width;
            c.width = Math.ceil(tw + zw + pad * 3); c.height = fs + pad * 2;
            g.fillStyle = 'rgba(4,5,10,0.62)';
            var r = c.height / 2; g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r);
            g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(190,210,255,0.22)'; g.lineWidth = 2; g.stroke();
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif'; g.fillStyle = '#eef1ff'; g.textBaseline = 'middle'; g.fillText(text, pad, c.height / 2 + 2);
            g.font = '500 ' + (fs * 0.7) + 'px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(200,210,240,0.5)'; g.fillText(String(zahl), pad * 2 + tw, c.height / 2 + 2);
            var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
            // sizeAttenuation:false = feste Bildschirmgroesse; mit Weltgroesse fuellte ein Schild beim Heranfliegen das Bild.
            var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false, opacity: 0 }));
            s.userData.verh = c.width / c.height; return s;
        }
        gruppen.forEach(function (b) {
            if (b.files.length < 6) return;
            var s = schild(b.g.label, b.files.length), hw = b.files.length >= 30 ? 0.022 : 0.017;
            s.scale.set(hw * s.userData.verh, hw, 1); s.center.set(0.5, 0);
            s.position.copy(b.mitte).multiplyScalar(R + b.hmax + 0.7);
            s.userData.richt = b.mitte; s.renderOrder = 20; scene.add(s); schilder.push(s);
        });

        // ── Nachbearbeitung: HDR-Szene, Bloom (3 Stufen), Farbsaum, Korn, Vignette ──
        var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), quadSzene = new THREE.Scene(); quadSzene.add(quad);
        function rt(samples) { return new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: samples || 0, depthBuffer: !!samples }); }
        var rtSzene = rt(4), rtHell = rt(), stufen = [rt(), rt(), rt(), rt()], hilf = [rt(), rt(), rt(), rt()];
        var vsQuad = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
        var matHell = new THREE.ShaderMaterial({ uniforms: { tS: { value: null } }, vertexShader: vsQuad, depthTest: false,
            fragmentShader: `uniform sampler2D tS; varying vec2 vUv; void main() { vec3 c = texture2D(tS, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.62, 1.5, l), 1.0); }` });
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
                    // Farbsaum: nur zum Rand hin, in der Mitte bleibt das Bild scharf
                    vec2 off = m * r2 * 0.012;
                    vec3 c = vec3(texture2D(tS, vUv + off).r, texture2D(tS, vUv).g, texture2D(tS, vUv - off).b);
                    vec3 b = texture2D(tB0, vUv).rgb * 0.8 + texture2D(tB1, vUv).rgb * 0.9 + texture2D(tB2, vUv).rgb * 1.0 + texture2D(tB3, vUv).rgb * 1.1;
                    c += b * 0.9;
                    c *= mix(0.42, 1.0, smoothstep(0.62, 0.08, r2 * 1.9));
                    float k = rausch(vUv * vec2(1931.0, 1129.0) + (uRuhe > 0.5 ? 0.0 : fract(uZeit * 7.0) * 91.0));
                    c += (k - 0.5) * 0.028;
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
        var gleisZiel = 0.09;
        function setzeZustand() {
            var nb = sel ? nachbarn(sel).set : null, gefiltert = filterType !== 'all' || !!searchQ;
            for (var i = 0; i < N; i++) {
                var fid = liste[i];
                aDim[i] = nb ? (nb.has(fid) ? 0 : 0.9) : (gefiltert && !passt(RAW.nodes[fid]) ? 0.85 : 0);
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
            uGrp.value = sel && flach[sel] ? flach[sel].g : -1;
            gleisZiel = sel ? 0.02 : (hov || gefiltert) ? 0.045 : 0.09;
        }

        // ── Kamera wie in einem Globus-Programm: Blickpunkt auf der Oberflaeche, Abstand,
        // Neigung, Blickrichtung. Bis 21.10. zielte sie immer auf den Kugelmittelpunkt —
        // dann kann man nie seitlich auf die Tuerme schauen (Meldung des Nutzers).
        // Zoomen neigt den Blick automatisch Richtung Horizont; rechte Maustaste/Umschalt
        // kippt und dreht von Hand, zwei Finger verschieben senkrecht = kippen.
        var HEIM_F = new V(0.33, 0.9, 0.28).normalize(), YA = new V(0, 1, 0);
        var fokus = HEIM_F.clone(), fokusSoll = HEIM_F.clone(), vorn = new V();
        var abst = 1, abstSoll = 1, heimAbst = 1, neigX = 0, neigXSoll = 0;
        var flug = null, letzteEingabe = 0, intro = null, qTmp = new THREE.Quaternion(), tmpA = new V(), tmpB = new V();
        function tangente(f, v) {
            v.addScaledVector(f, -v.dot(f));
            if (v.lengthSq() < 1e-8) v.set(1, 0, 0).addScaledVector(f, -f.x);
            return v.normalize();
        }
        function slerp(a, b, t, out) {
            var om = a.angleTo(b);
            if (om < 1e-5) return out.copy(b);
            var s = Math.sin(om);
            return out.copy(a).multiplyScalar(Math.sin((1 - t) * om) / s).addScaledVector(b, Math.sin(t * om) / s).normalize();
        }
        tangente(fokus, vorn.copy(YA));
        function heimWerte() {
            var asp = Math.max(0.5, (wrap.clientWidth || 1) / (wrap.clientHeight || 1));
            heimAbst = R * (asp < 1 ? 6.2 : 3.7); return heimAbst;
        }
        function autoNeig(a) { var t = clamp((R * 2.4 - a) / (R * 2.15), 0, 1); return 0.1 + (1 - Math.pow(1 - t, 2)) * 1.08; }
        function kameraSetzen() {
            var ne = clamp(autoNeig(abst) + neigX, 0, 1.4), c = Math.cos(ne), s = Math.sin(ne);
            tmpA.copy(fokus).multiplyScalar(R);
            camera.position.copy(tmpA).addScaledVector(fokus, c * abst).addScaledVector(vorn, -s * abst);
            camera.up.copy(vorn).multiplyScalar(c).addScaledVector(fokus, s);
            camera.lookAt(tmpA);
            var zl = document.getElementById('zLvl'); if (zl) zl.textContent = Math.round(heimAbst / abst * 100) + '%';
        }
        function introStarten() {
            heimWerte(); intro = { t0: performance.now(), dauer: 4600 };
            fokusSoll.copy(HEIM_F); abstSoll = heimAbst; neigXSoll = neigX = 0;
        }
        function introBeenden() {
            if (!intro) return; intro = null; uIntro.value = 99; uFluss.value = 1;
            fokus.copy(fokusSoll); tangente(fokus, vorn.copy(YA)); abst = abstSoll;
        }
        function drehUmY(w) { qTmp.setFromAxisAngle(YA, w); fokusSoll.applyQuaternion(qTmp); fokus.applyQuaternion(qTmp); vorn.applyQuaternion(qTmp); }

        // ── Bildschleife ───────────────────────────────────────────────
        var aktiv = false, raf = 0, letzt = 0, kamRicht = new V();
        function bild(jetzt) {
            raf = 0; if (!aktiv) return;
            var dt = letzt ? Math.min(0.05, (jetzt - letzt) / 1000) : 0.016; letzt = jetzt;
            uZeit.value += dt;
            if (intro) {
                var f = clamp((jetzt - intro.t0) / intro.dauer, 0, 1), k = easeInOut(f);
                qTmp.setFromAxisAngle(YA, -(1 - k) * 2.2);
                fokus.copy(fokusSoll).applyQuaternion(qTmp); tangente(fokus, vorn.copy(YA));
                abst = heimAbst * 5 + (heimAbst - heimAbst * 5) * (1 - Math.pow(1 - f, 3));
                uIntro.value = (jetzt - intro.t0) / 1000 * 1.05;
                uFluss.value = clamp((f - 0.7) / 0.3, 0, 1);
                if (f >= 1) introBeenden();
            } else if (flug) {
                var g = clamp((jetzt - flug.t0) / flug.dauer, 0, 1), kk = easeInOut(g);
                slerp(flug.f0, flug.f1, kk, fokus); tangente(fokus, vorn);
                // Beim Flug ueber die Kugel kurz Hoehe gewinnen, sonst schrammt die Kamera durch die Tuerme
                abst = flug.a0 + (flug.a1 - flug.a0) * kk + Math.sin(Math.PI * g) * flug.hub;
                fokusSoll.copy(fokus); abstSoll = flug.a1;
                if (g >= 1) flug = null;
            } else {
                if (!RM && !sel && jetzt - letzteEingabe > 6000) drehUmY(dt * 0.05);
                var d = 1 - Math.pow(0.00008, dt);
                fokus.lerp(fokusSoll, d).normalize(); tangente(fokus, vorn);
                abst += (abstSoll - abst) * d; neigX += (neigXSoll - neigX) * d;
            }
            gleisMat.opacity += ((intro ? 0 : gleisZiel) - gleisMat.opacity) * 0.08;

            kameraSetzen();
            kamRicht.copy(camera.position).normalize();
            schilder.forEach(function (s) {
                var blick = s.userData.richt.dot(kamRicht);
                var z = intro ? 0 : (sel ? 0.22 : 1) * clamp((blick - 0.15) / 0.3, 0, 1);
                s.material.opacity += (z - s.material.opacity) * 0.12;
                s.visible = s.material.opacity > 0.01;
            });

            if (sel && richt[sel] && wahlZeit) {
                var w = clamp((jetzt - wahlZeit) / 1300, 0, 1);
                welle.visible = w < 1; welle.scale.setScalar(1 + easeOut(w) * 11); welle.material.opacity = (1 - w) * 0.85;
                ring.material.opacity = 0.9;
                strahlA.value = (RM ? 0.5 : (0.4 + 0.6 * Math.exp(-w * 3))) * (0.85 + 0.15 * Math.sin(uZeit.value * 2.4));
            }

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
            fokusSoll.copy(HEIM_F); abstSoll = heimWerte(); neigXSoll = 0; letzteEingabe = performance.now();
        }
        function zoom(f) { introBeenden(); flug = null; abstSoll = clamp(abstSoll / f, R * 0.2, heimAbst * 2.6); letzteEingabe = performance.now(); }
        function flieg(id) {
            var nv = richt[id]; if (!nv) return;
            introBeenden();
            var weit = 0;
            nachbarn(id).set.forEach(function (o) { if (richt[o]) weit = Math.max(weit, richt[o].angleTo(nv)); });
            // Abstand nach der Streuung der Nachbarn: liegen sie weit weg, muss die Kamera hoeher
            var a1 = clamp(R * (0.32 + weit * 1.5), R * 0.3, heimAbst * 0.95);
            neigXSoll = 0; letzteEingabe = performance.now();
            if (RM) { fokus.copy(nv); fokusSoll.copy(nv); tangente(fokus, vorn); abst = abstSoll = a1; return; }
            var weg = fokus.angleTo(nv);
            flug = { t0: performance.now(), dauer: 1100 + weg * 650, f0: fokus.clone(), f1: nv.clone(), a0: abst, a1: a1, hub: Math.min(weg, 1.6) * R * 0.85 };
        }

        // ── Zeiger ─────────────────────────────────────────────────────
        var ray = new THREE.Raycaster(), maus = new THREE.Vector2();
        function treffer(cx, cy) {
            var r = canvas.getBoundingClientRect();
            maus.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
            ray.setFromCamera(maus, camera);
            var t = ray.intersectObject(tuerme, false);
            return t.length ? liste[t[0].instanceId] : null;
        }
        function schieben(dx, dy) {
            // Karte folgt dem Finger: nach rechts ziehen = Blickpunkt wandert nach links
            var k = 0.0021 * clamp(abst / R, 0.12, 4);
            tmpB.crossVectors(vorn, fokus);
            fokusSoll.addScaledVector(tmpB, -dx * k).addScaledVector(vorn, dy * k).normalize();
        }
        function kippen(dx, dy) {
            qTmp.setFromAxisAngle(fokus, -dx * 0.006); vorn.applyQuaternion(qTmp);
            neigXSoll = clamp(neigXSoll + dy * 0.005, -0.6, 1.0);
        }
        var zeiger = new Map(), start = null, bewegt = false, pinch = 0, mitteY = 0, mitteX = 0;
        function mitte() { var a = Array.from(zeiger.values()); return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; }
        canvas.addEventListener('pointerdown', function (e) {
            canvas.setPointerCapture(e.pointerId);
            zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (zeiger.size === 1) { start = { x: e.clientX, y: e.clientY, kipp: e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey }; bewegt = false; }
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
                kippen(0, (m.y - mitteY) * 0.6);
                pinch = m.d; mitteX = m.x; mitteY = m.y; return;
            }
            if (!bewegt) return;
            hideTT();
            if (start && start.kipp) kippen(dx, dy); else schieben(dx, dy);
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
        function ausrichten(m, nv, hoch) { m.quaternion.setFromUnitVectors(ZA, nv); m.position.copy(nv).multiplyScalar(R + hoch); }
        function sync() {
            setzeZustand();
            if (sel && richt[sel]) {
                var nv = richt[sel];
                ausrichten(ring, nv, 0.03); ausrichten(welle, nv, 0.05); ring.visible = true;
                strahl.quaternion.setFromUnitVectors(OBEN, nv); strahl.position.copy(nv).multiplyScalar(R + hoehe[sel]); strahl.visible = true;
                strahlFarbe.value.copy(grund[index[sel]]).lerp(new THREE.Color(1, 1, 1), 0.5);
                if (letzteWahl !== sel) { wahlZeit = performance.now(); letzteWahl = sel; }
            } else { ring.visible = false; strahl.visible = false; welle.visible = false; letzteWahl = null; wahlZeit = 0; }
        }

        setzeZustand();
        var ersterStart = true;
        return {
            an: function () {
                aktiv = true; canvas.classList.add('on'); groesse();
                if (ersterStart) {
                    ersterStart = false;
                    if (RM) { heim(); fokus.copy(fokusSoll); tangente(fokus, vorn.copy(YA)); abst = abstSoll; }
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
