// ═══ KARTEIKASTEN SZENE MODULE ═══
// /lernen/ im Fahrt-Modus (html.kk-gl): EIN Three.js-Kasten auf fester Leinwand, die
// Scrollposition faehrt die Kamera durch vier Stationen (Bauweise /traum/ + Intro).
// Ebenen und Modi stehen im Kopf von karteikasten.css.
//
// 🔴 Der Kasten zeigt den ECHTEN Stand: je Fach so viele Karten, wie karteikasten.js
// meldet (Ereignis kk:stand). Keine Deko-Fuellung — ein leerer Kasten ist leer, nur
// die Trennkarten stehen (Bauplan, Abschnitt 10, letzte Regel).
//
// Stationen: 0 Titel · 1 Woher (drei Quellenkarten steigen auf) · 2 Wiederkommen
// (eine Karte wandert Fach 1 → 5, eine falsche faellt zurueck) · 3 Heute (faellige
// Karten heben sich). Bewegung entsteht nur durch Scrollen, Zeiger und Klicks —
// beim Laden laeuft ausser einem sanften Schweben nichts von selbst.
(function () {
    'use strict';

    var root = document.documentElement;
    if (!root.classList.contains('kk-gl')) return;

    var canvas = document.getElementById('kkCanvas');
    var fahrt = document.getElementById('kkFahrt');
    if (!canvas || !fahrt) return;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function mix(a, b, t) { return a + (b - a) * t; }
    function sm2(x) { return x * x * x * (x * (x * 6 - 15) + 10); }
    function rueck(x) { var c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }   // easeOutBack

    var stationen = [].slice.call(document.querySelectorAll('.kk-station')).map(function (s) {
        return { riesig: s.querySelector('.kk-riesig'), vorn: s.querySelector('.kk-vorn') };
    });

    function css(name, rueckfall) {
        var v = getComputedStyle(root).getPropertyValue(name).trim();
        return v || rueckfall;
    }
    function text(id) { var e = document.getElementById(id); return e ? e.textContent.trim() : ''; }

    // ── Masse (Welt-Einheiten) ────────────────────────────────────────
    var W = 6, D = 2.6, H = 1.5, T = 0.07;
    var FAECHER = 6, CW = W / FAECHER;
    var KARTE_B = CW * 0.84, KARTE_H = 1.22, KARTE_D = 0.014;
    var VORNE_H = H * 0.56;                 // vordere Wand niedriger, damit die Karten herausschauen
    var MAX_SICHTBAR = 22, ABSTAND_Z = 0.092;

    var zielStand = { zahl: [0, 0, 0, 0, 0, 0], faellig: [0, 0, 0, 0, 0, 0] };
    var neuEingelegt = 0;

    document.addEventListener('kk:stand', function (e) {
        zielStand = e.detail;
        if (szene) szene.stand(zielStand, neuEingelegt);
        neuEingelegt = 0;
    });
    document.addEventListener('kk:eingelegt', function (e) { neuEingelegt = e.detail.anzahl || 0; });

    var szene = null;

    function fontsBereit() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        var warten = Promise.all([
            document.fonts.load('700 64px "Bricolage Grotesque"'),
            document.fonts.load('500 32px "Geist"'),
            document.fonts.load('600 32px "Geist"'),
            document.fonts.load('700 48px "Caveat"')
        ]).catch(function () {});
        return Promise.race([warten, new Promise(function (r) { setTimeout(r, 1800); })]);
    }

    Promise.all([
        import('/Assets/js/vendor/three-0.186.1/three.module.js?v=3bc833fceb'),
        fontsBereit()
    ]).then(function (r) { szene = baue(r[0]); }).catch(function () {
        // Ohne Leinwand bleibt die Seite benutzbar: ruhige Fassung einschalten
        root.classList.remove('kk-gl'); root.classList.add('kk-flat');
    });

    // ═══ AUFBAU ═══════════════════════════════════════════════════════
    function baue(THREE) {
        var EN = root.lang === 'en';
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.setClearColor(0x000000, 0);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

        var cPrimary = new THREE.Color(css('--primary', '#6d7fd1'));
        var cPapier = new THREE.Color('#ecebf4');
        var cPapier3 = new THREE.Color('#cfccdf');
        // Graphit statt Koenigsblau: mit 0.16 Akzentanteil und Akzent-Himmelslicht leuchtete
        // die Pappe sattblau und schlug die Papierkarten. Der Akzent gehoert ins Saumlicht.
        var cPappe = new THREE.Color('#1c1c2b').lerp(cPrimary, 0.07);

        // Licht: Kopflicht von vorn oben, Akzent-Saum von hinten
        scene.add(new THREE.HemisphereLight(new THREE.Color('#d9dcf0'), new THREE.Color('#0b0c1a'), 0.7));
        var key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(4, 9, 7); scene.add(key);
        var saum = new THREE.DirectionalLight(cPrimary, 2.2); saum.position.set(-7, 3, -6); scene.add(saum);
        var fuell = new THREE.DirectionalLight(0xffd9cf, 0.35); fuell.position.set(-5, 1, 6); scene.add(fuell);

        // ── Texturen aus 2D-Leinwaenden ──────────────────────────────
        function leinwand(w, h, malen) {
            var c = document.createElement('canvas'); c.width = w; c.height = h;
            var g = c.getContext('2d'); malen(g, w, h);
            var t = new THREE.CanvasTexture(c);
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            return t;
        }
        function papierGrund(g, w, h, rot, linien) {
            g.fillStyle = '#ecebf4'; g.fillRect(0, 0, w, h);
            var y0 = h * rot;
            g.fillStyle = 'rgba(200,70,60,0.8)'; g.fillRect(0, y0, w, Math.max(2, h * 0.006));
            g.fillStyle = 'rgba(109,127,209,0.24)';
            for (var y = y0 + linien; y < h - linien * 0.4; y += linien) g.fillRect(0, y, w, Math.max(1, h * 0.003));
        }
        function umbruch(g, s, maxB) {
            var woerter = s.split(' '), zeilen = [], z = '';
            woerter.forEach(function (w) {
                var t = z ? z + ' ' + w : w;
                if (g.measureText(t).width > maxB && z) { zeilen.push(z); z = w; } else z = t;
            });
            if (z) zeilen.push(z);
            return zeilen;
        }

        var texKarte = leinwand(256, 384, function (g, w, h) { papierGrund(g, w, h, 0.13, 30); });
        var texKarte2 = leinwand(256, 384, function (g, w, h) {
            papierGrund(g, w, h, 0.13, 30);
            g.fillStyle = 'rgba(21,19,29,0.06)'; g.fillRect(0, 0, w, h);
        });

        // Frage-Karte fuer die Wanderung in Station 2
        function frageTextur(frage, marke) {
            return leinwand(512, 768, function (g, w, h) {
                papierGrund(g, w, h, 0.13, 46);
                g.fillStyle = '#15131d';
                g.font = '700 46px "Bricolage Grotesque", sans-serif';
                umbruch(g, frage, w - 70).forEach(function (z, i) { g.fillText(z, 34, 170 + i * 54); });
                if (marke) {
                    g.strokeStyle = '#c8463c'; g.lineWidth = 9; g.lineCap = 'round';
                    if (marke === 'haken') { g.beginPath(); g.moveTo(150, 560); g.lineTo(230, 640); g.lineTo(380, 470); g.stroke(); }
                    else { g.beginPath(); g.moveTo(170, 480); g.lineTo(340, 650); g.moveTo(340, 480); g.lineTo(170, 650); g.stroke(); }
                }
            });
        }

        // Quellenkarte (Station 1): grosse Karteikarte quer
        function quelleTextur(titel, satz, zeichen) {
            return leinwand(1024, 680, function (g, w, h) {
                papierGrund(g, w, h, 0.17, 54);
                g.fillStyle = 'rgba(21,19,29,0.55)';
                g.font = '500 30px "Martian Mono", monospace';
                g.fillText(zeichen, 48, 78);
                g.fillStyle = '#15131d';
                g.font = '700 76px "Bricolage Grotesque", sans-serif';
                umbruch(g, titel, w - 96).forEach(function (z, i) { g.fillText(z, 48, 230 + i * 80); });
                g.fillStyle = '#3c4aa0';
                g.font = '500 38px "Geist", sans-serif';
                var start = 230 + (umbruch(g, titel, w - 96).length) * 80 + 40;
                umbruch(g, satz, w - 96).slice(0, 4).forEach(function (z, i) { g.fillText(z, 48, start + i * 54); });
            });
        }

        // Reiter der Trennkarten: Fachname
        var FACH_NAME = [EN ? 'New' : 'Neu', '1', '2', '3', '4', '5'];
        function reiterTextur(name, faellig) {
            return leinwand(192, 96, function (g, w, h) {
                g.fillStyle = faellig ? '#ecebf4' : '#cfccdf'; g.fillRect(0, 0, w, h);
                if (faellig) { g.fillStyle = '#c8463c'; g.fillRect(0, h - 8, w, 8); }
                g.fillStyle = '#15131d';
                g.font = '700 52px "Bricolage Grotesque", sans-serif';
                g.textAlign = 'center'; g.textBaseline = 'middle';
                g.fillText(name, w / 2, h / 2 + 2);
            });
        }

        // Vorderwand: je Fach die Zahl und der Takt — der Kasten IST die Anzeige
        var TAKT = EN ? ['new', '1 day', '3 days', '1 week', '2 weeks', '1 month'] : ['neu', '1 Tag', '3 Tage', '1 Woche', '2 Wochen', '1 Monat'];
        var wandLein = document.createElement('canvas'); wandLein.width = 2048; wandLein.height = Math.round(2048 * VORNE_H / (W + 2 * T));
        var texWand = new THREE.CanvasTexture(wandLein); texWand.colorSpace = THREE.SRGBColorSpace;
        texWand.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        function wandMalen(zahl, faellig) {
            var g = wandLein.getContext('2d'), w = wandLein.width, h = wandLein.height;
            g.clearRect(0, 0, w, h);
            var grad = g.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#' + cPappe.clone().lerp(new THREE.Color('#ffffff'), 0.1).getHexString());
            grad.addColorStop(0.08, '#' + cPappe.getHexString());
            grad.addColorStop(1, '#' + cPappe.clone().multiplyScalar(0.72).getHexString());
            g.fillStyle = grad; g.fillRect(0, 0, w, h);
            var spalte = w / FAECHER;
            g.textAlign = 'center';
            for (var f = 0; f < FAECHER; f++) {
                var x = spalte * (f + 0.5);
                g.fillStyle = zahl[f] ? '#ecebf4' : 'rgba(236,235,244,0.35)';
                g.font = '700 ' + Math.round(h * 0.42) + 'px "Bricolage Grotesque", sans-serif';
                g.fillText(String(zahl[f]), x, h * 0.56);
                g.fillStyle = 'rgba(185,182,203,0.85)';
                g.font = '500 ' + Math.round(h * 0.14) + 'px "Geist", sans-serif';
                g.fillText(TAKT[f], x, h * 0.82);
                if (faellig[f]) { g.fillStyle = '#c8463c'; g.fillRect(x - spalte * 0.18, h * 0.9, spalte * 0.36, h * 0.025); }
                if (f) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(spalte * f - 1, h * 0.16, 2, h * 0.7); }
            }
            texWand.needsUpdate = true;
        }

        // ── Der Kasten ──────────────────────────────────────────────
        var kasten = new THREE.Group();
        scene.add(kasten);
        var matPappe = new THREE.MeshStandardMaterial({ color: cPappe, roughness: 0.82, metalness: 0.05 });
        var matPappeInnen = new THREE.MeshStandardMaterial({ color: cPappe.clone().multiplyScalar(0.62), roughness: 0.9 });
        var matKante = new THREE.MeshStandardMaterial({ color: cPappe.clone().lerp(new THREE.Color('#ffffff'), 0.18), roughness: 0.6 });
        function quader(b, h, t, mat, x, y, z) {
            var m = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), mat);
            m.position.set(x, y, z); kasten.add(m); return m;
        }
        quader(W + 2 * T, T, D + 2 * T, matPappe, 0, -T / 2, 0);                                   // Boden
        quader(W + 2 * T, H, T, matPappe, 0, H / 2, -D / 2 - T / 2);                                // Rueckwand
        quader(T, H, D, matPappe, -W / 2 - T / 2, H / 2, 0);                                        // links
        quader(T, H, D, matPappe, W / 2 + T / 2, H / 2, 0);                                         // rechts
        var vorne = quader(W + 2 * T, VORNE_H, T, [matPappe, matPappe, matKante, matPappe,
            new THREE.MeshStandardMaterial({ map: texWand, roughness: 0.78 }), matPappe], 0, VORNE_H / 2, D / 2 + T / 2);
        quader(W + 2 * T, 0.02, T + 0.004, matKante, 0, H + 0.01, -D / 2 - T / 2);                  // Kanten hell
        quader(T + 0.004, 0.02, D, matKante, -W / 2 - T / 2, H + 0.01, 0);
        quader(T + 0.004, 0.02, D, matKante, W / 2 + T / 2, H + 0.01, 0);
        var innenBoden = quader(W, 0.004, D, matPappeInnen, 0, 0.002, 0);
        for (var i = 1; i < FAECHER; i++) quader(0.03, H * 0.62, D, matPappeInnen, -W / 2 + CW * i, H * 0.31, 0);   // Faecher

        // weicher Schatten unter dem Kasten
        var texSchatten = leinwand(256, 256, function (g, w, h) {
            var r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
            r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(0.55, 'rgba(0,0,0,0.35)'); r.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = r; g.fillRect(0, 0, w, h);
        });
        var schatten = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.7, D * 2.6), new THREE.MeshBasicMaterial({ map: texSchatten, transparent: true, depthWrite: false }));
        schatten.rotation.x = -Math.PI / 2; schatten.position.y = -T - 0.01; kasten.add(schatten);

        // Trennkarten mit Reiter, eine je Fach, hinten
        var geoKarte = new THREE.BoxGeometry(KARTE_B, KARTE_H, KARTE_D);
        var matKarte = new THREE.MeshStandardMaterial({ map: texKarte, roughness: 0.88 });
        var matKarte2 = new THREE.MeshStandardMaterial({ map: texKarte2, roughness: 0.9 });
        var matTrenn = new THREE.MeshStandardMaterial({ color: cPapier3, roughness: 0.85 });
        var reiter = [];
        for (var f = 0; f < FAECHER; f++) {
            var x = -W / 2 + CW * (f + 0.5);
            var trenn = new THREE.Mesh(new THREE.BoxGeometry(KARTE_B, KARTE_H + 0.06, 0.02), matTrenn);
            trenn.position.set(x, (KARTE_H + 0.06) / 2, -D / 2 + 0.1); trenn.rotation.x = -0.08; kasten.add(trenn);
            var rm = new THREE.MeshStandardMaterial({ map: reiterTextur(FACH_NAME[f], false), roughness: 0.8 });
            var tab = new THREE.Mesh(new THREE.BoxGeometry(KARTE_B * 0.46, 0.2, 0.02), [matTrenn, matTrenn, matTrenn, matTrenn, rm, rm]);
            tab.position.set(x + (f % 2 ? 0.12 : -0.12), KARTE_H + 0.06 + 0.1, -D / 2 + 0.1 + 0.01); tab.rotation.x = -0.08;
            kasten.add(tab);
            reiter.push({ mesh: tab, mat: rm, faellig: false });
        }

        // ── Karten je Fach (der echte Stand) ────────────────────────
        var karten = [];   // { mesh, f, i, basisY, basisZ, kipp, lift, drop }
        var jetzt = 0;
        function kartenBauen(stand, neu) {
            karten.forEach(function (k) { kasten.remove(k.mesh); });
            karten = [];
            for (var f = 0; f < FAECHER; f++) {
                var n = Math.min(stand.zahl[f] || 0, MAX_SICHTBAR);
                var x = -W / 2 + CW * (f + 0.5);
                for (var i = 0; i < n; i++) {
                    var m = new THREE.Mesh(geoKarte, i % 2 ? matKarte2 : matKarte);
                    // vorderste Karte = i 0, steht vorn; nach hinten gestaffelt
                    var z = D / 2 - 0.14 - i * ABSTAND_Z;
                    var zufall = Math.sin((f + 1) * 12.9898 + i * 78.233) * 43758.5453; zufall -= Math.floor(zufall);
                    var k = {
                        mesh: m, f: f, i: i, basisX: x + (zufall - 0.5) * 0.03, basisY: KARTE_H / 2 + 0.01, basisZ: z,
                        kipp: -0.16 - zufall * 0.06, dreh: (zufall - 0.5) * 0.05,
                        faellig: i < (stand.faellig[f] || 0), drop: null
                    };
                    // performance.now() statt der Bildzeit: der Aufruf kommt aus einem Ereignis,
                    // nicht aus der Schleife — vor dem ersten Bild waere die Bildzeit 0 und der Fall sofort vorbei
                    if (f === 0 && neu && i < neu) k.drop = { t0: performance.now(), verz: (neu - 1 - i) * 70 };
                    m.position.set(k.basisX, k.basisY, k.basisZ);
                    kasten.add(m); karten.push(k);
                }
                var r = reiter[f], dran = (stand.faellig[f] || 0) > 0;
                if (r.faellig !== dran) { r.mat.map.dispose(); r.mat.map = reiterTextur(FACH_NAME[f], dran); r.mat.needsUpdate = true; r.faellig = dran; }
            }
            wandMalen(stand.zahl, stand.faellig);
        }

        // ── Quellenkarten (Station 1) ───────────────────────────────
        var geoGross = new THREE.BoxGeometry(2.1, 1.4, 0.02);
        var quellen = [
            { t: text('kkQ1T'), s: text('kkQ1P'), z: '01 · ' + (EN ? 'first' : 'zuerst'), x: -2.45, y: 2.55, rz: 0.06, ry: 0.28 },
            { t: text('kkQ2T'), s: text('kkQ2P'), z: '02 · ' + (EN ? 'then' : 'dann'), x: 0, y: 2.95, rz: -0.02, ry: 0 },
            { t: text('kkQ3T'), s: text('kkQ3P'), z: '03 · ' + (EN ? 'also' : 'auch'), x: 2.45, y: 2.55, rz: -0.06, ry: -0.28 }
        ].map(function (q, n) {
            var mat = new THREE.MeshStandardMaterial({ map: quelleTextur(q.t, q.s, q.z), roughness: 0.85 });
            var m = new THREE.Mesh(geoGross, [matKarte, matKarte, matKarte, matKarte, mat, matKarte]);
            m.visible = false; kasten.add(m);
            q.mesh = m; q.n = n; q.startX = -W / 2 + CW * (n * 2 + 0.75);
            return q;
        });

        // ── Wanderkarten (Station 2) ────────────────────────────────
        var geoWander = new THREE.BoxGeometry(KARTE_B * 1.05, KARTE_H * 1.05, 0.018);
        function wanderKarte(frage, marke) {
            var mat = new THREE.MeshStandardMaterial({ map: frageTextur(frage, marke), roughness: 0.85, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.06 });
            var m = new THREE.Mesh(geoWander, [matKarte, matKarte, matKarte, matKarte, mat, matKarte]);
            m.visible = false; kasten.add(m); return m;
        }
        var wanderGut = wanderKarte(EN ? 'How long can probation last?' : 'Wie lang darf die Probezeit sein?', 'haken');
        var wanderFalsch = wanderKarte(EN ? 'Who covers a commuting accident?' : 'Wer zahlt beim Wegeunfall?', 'kreuz');

        // Abflug zur Abfrage
        var flug = null;

        // ── Kamera-Stationen ────────────────────────────────────────
        var V = THREE.Vector3;
        function stationen3D(aspekt) {
            var breit = aspekt > 1.15, weit = aspekt < 0.85 ? 1.95 : aspekt < 1.15 ? 1.35 : 1;
            // Gemessen an 1600x900: mit Faktor 1 war der Kasten in Station 0 und 2 rechts bzw.
            // links angeschnitten. Die Abstaende hier zeigen ihn ganz.
            return [
                { cam: new V(-1.2, 4.0, 11.2).multiplyScalar(weit), ziel: new V(breit ? -0.9 : 0, breit ? 0.95 : -0.5, 0), kx: breit ? 1.5 : 0, ky: breit ? -1.0 : -0.9, rot: -0.48 },
                { cam: new V(0, 3.6, 10.4).multiplyScalar(weit), ziel: new V(0, breit ? 1.5 : 0.9, 0), kx: 0, ky: -1.3, rot: -0.12 },
                { cam: new V(-0.6, 8.4, 9.6).multiplyScalar(weit), ziel: new V(breit ? 1.25 : 0, 0.5, 0.3), kx: breit ? -0.3 : 0, ky: breit ? -0.4 : -1.2, rot: 0.14 },
                { cam: new V(0, 11.4, 7.4).multiplyScalar(weit), ziel: new V(0, -1.5, 0.2), kx: 0, ky: 0, rot: 0 }
            ];
        }
        var ST = stationen3D(1.6);

        // ── Zustand ─────────────────────────────────────────────────
        var p = 0, pZiel = 0, pVor = 0, tempo = 0;
        var zeigerX = 0, zeigerY = 0, zx = 0, zy = 0;
        var ebeneOffen = false, laeuft = false, ersteBild = false, schmal = false;   // schmal: Hochformat, Quellenkarten enger
        var tmpCam = new V(), tmpZiel = new V();

        function messen() {
            var w = window.innerWidth, h = window.innerHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.fov = w / h < 0.85 ? 38 : 30;
            camera.updateProjectionMatrix();
            ST = stationen3D(w / h);
            schmal = w / h < 0.85;
        }
        function fortschritt() {
            var gesamt = fahrt.offsetHeight - window.innerHeight;
            return gesamt > 0 ? clamp(window.scrollY / gesamt, 0, 1) * (ST.length - 1) : 0;
        }

        function texteSetzen(pp) {
            var st = Math.round(pp);
            if (root.dataset.st !== String(st)) root.dataset.st = String(st);
            stationen.forEach(function (s, i) {
                var a = 1 - clamp(Math.abs(pp - i) * 2.4, 0, 1);
                a = sm2(a);
                var dy = (pp - i) * -40;
                [s.riesig, s.vorn].forEach(function (e, j) {
                    if (!e) return;
                    var sichtbar = a > 0.004;
                    e.style.visibility = sichtbar ? 'visible' : 'hidden';
                    e.style.opacity = a.toFixed(3);
                    if (j === 1) {
                        // Station 3 ist horizontal zentriert (translateX in CSS) — dort nur vertikal schieben
                        e.style.translate = '0 ' + (dy * 0.6).toFixed(1) + 'px';
                        e.inert = a < 0.5;
                    } else if (i === 0) {
                        e.style.translate = '0 ' + (dy * 1.2).toFixed(1) + 'px';
                    } else {
                        e.style.scale = (1 + (1 - a) * 0.08).toFixed(3);
                    }
                });
            });
        }

        function zeichnen(zeit) {
            jetzt = zeit;
            pZiel = fortschritt();
            p += (pZiel - p) * 0.11;
            if (Math.abs(pZiel - p) < 0.0005) p = pZiel;
            var v = p - pVor; pVor = p;
            tempo += (clamp(v * 22, -1, 1) - tempo) * 0.12;
            zx += (zeigerX - zx) * 0.06; zy += (zeigerY - zy) * 0.06;

            // Kamera zwischen zwei Stationen, mit Halt an jeder Station
            var a = Math.min(Math.floor(p), ST.length - 2), fr = p - a;
            var e = sm2(clamp((fr - 0.18) / 0.64, 0, 1));
            var A = ST[a], B = ST[a + 1];
            tmpCam.lerpVectors(A.cam, B.cam, e);
            tmpZiel.lerpVectors(A.ziel, B.ziel, e);
            camera.position.copy(tmpCam);
            camera.position.x += zx * 0.35; camera.position.y += -zy * 0.2;
            camera.lookAt(tmpZiel);

            var schweben = Math.sin(zeit * 0.0009) * 0.035;
            kasten.position.set(mix(A.kx, B.kx, e), mix(A.ky, B.ky, e) + schweben, 0);
            kasten.rotation.y = mix(A.rot, B.rot, e) + zx * 0.08;
            kasten.rotation.x = zy * 0.03;

            // Karten: flattern beim schnellen Scrollen, faellige heben sich in Station 3
            var heben = sm2(seg(p, 2.45, 2.95));
            karten.forEach(function (k) {
                var m = k.mesh;
                var y = k.basisY, z = k.basisZ;
                if (k.drop) {
                    var t = clamp((zeit - k.drop.t0 - k.drop.verz) / 650, 0, 1);
                    y += (1 - rueck(t)) * 2.6;
                    if (t >= 1) k.drop = null;
                }
                if (k.faellig) y += heben * (0.34 + (k.i % 3) * 0.04);
                if (flug && flug.k === k) return;
                m.position.set(k.basisX, y, z);
                m.rotation.set(k.kipp + tempo * (0.5 + (k.i % 4) * 0.12), 0, k.dreh);
            });

            // Station 1: Quellenkarten steigen aus dem Kasten auf
            quellen.forEach(function (q) {
                var auf = sm2(seg(p, 0.42 + q.n * 0.07, 0.92 + q.n * 0.05)) * (1 - sm2(seg(p, 1.42, 1.82 - q.n * 0.04)));
                q.mesh.visible = auf > 0.002;
                if (!q.mesh.visible) return;
                q.mesh.position.set(mix(q.startX, schmal ? q.x * 0.62 : q.x, auf), mix(0.4, schmal && q.n === 1 ? q.y + 1.15 : q.y, auf) + Math.sin(zeit * 0.0011 + q.n) * 0.03 * auf, mix(0, 0.55, auf));
                q.mesh.rotation.set(mix(-0.2, -0.06, auf) + tempo * 0.3, mix(0, q.ry, auf), mix(0, q.rz, auf));
                var s = mix(0.45, 1, auf); q.mesh.scale.set(s, s, s);
            });

            // Station 2: richtige Karte wandert Fach 1 → 5, falsche faellt von 3 zurueck auf 1
            var t2 = seg(p, 1.62, 2.38);
            // Je Fachwechsel ein Bogen; zwischen den Spruengen steht die Karte im Fach
            function wandern(m, pos, hoch, sichtbar) {
                m.visible = sichtbar;
                if (!sichtbar) return;
                var schritt = pos - Math.floor(pos);
                m.position.set(-W / 2 + CW * (pos + 0.5), KARTE_H / 2 + 0.36 + Math.sin(Math.PI * schritt) * hoch, D / 2 - 0.05);
                m.rotation.set(-0.22 + tempo * 0.4, 0, Math.sin(Math.PI * 2 * schritt) * 0.05);
            }
            var drin = t2 > 0 && t2 < 1;
            wandern(wanderGut, 1 + 4 * sm2(seg(t2, 0, 0.72)), 0.65, drin);
            wandern(wanderFalsch, 3 - 2 * sm2(seg(t2, 0.5, 0.98)), 0.9, drin);

            // Abflug: vorderste Karte auf die Kamera zu
            if (flug) {
                var ft = clamp((zeit - flug.t0) / 720, 0, 1), fe = sm2(ft);
                var wohin = new V(); camera.getWorldDirection(wohin);
                var ziel = camera.position.clone().add(wohin.multiplyScalar(1.6));
                kasten.worldToLocal(ziel);
                flug.k.mesh.position.lerpVectors(flug.von, ziel, fe);
                flug.k.mesh.rotation.set(mix(flug.k.kipp, 0, fe), mix(0, -kasten.rotation.y, fe), mix(flug.k.dreh, 0, fe));
                if (ft >= 1 && !flug.fertig) { flug.fertig = true; var cb = flug.cb; setTimeout(function () { flug = null; cb(); }, 30); }
            }

            texteSetzen(p);
            renderer.render(scene, camera);
            if (!ersteBild) { ersteBild = true; canvas.classList.add('is-bereit'); }
        }

        function schleife(zeit) {
            if (!laeuft) return;
            zeichnen(zeit);
            requestAnimationFrame(schleife);
        }
        // Rendern nur, wenn man die Leinwand sieht: nicht hinter dem Boden, nicht unter der Abfrage
        function sichtbar() {
            return !ebeneOffen && !document.hidden && window.scrollY < fahrt.offsetHeight + 40;
        }
        function wecken() {
            if (laeuft || !sichtbar()) return;
            laeuft = true; requestAnimationFrame(schleife);
        }
        function pruefen() { if (!sichtbar() && !flug) laeuft = false; else wecken(); }

        window.addEventListener('scroll', pruefen, { passive: true });
        window.addEventListener('resize', function () { messen(); wecken(); });
        document.addEventListener('visibilitychange', pruefen);
        document.addEventListener('kk:ebene', function (e) { ebeneOffen = e.detail.offen; pruefen(); });
        if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
            window.addEventListener('pointermove', function (e) {
                zeigerX = (e.clientX / window.innerWidth - 0.5) * 2;
                zeigerY = (e.clientY / window.innerHeight - 0.5) * 2;
            }, { passive: true });
        }

        messen();
        // Erst den Stand holen, dann bauen: der Ereignis-Handler sieht `szene` hier noch
        // als null (baue() ist noch nicht zurueck) und baut deshalb selbst nicht.
        if (window.KK && window.KK.stand) window.KK.stand();
        kartenBauen(zielStand, 0);
        p = pVor = fortschritt();
        wecken();

        return {
            stand: function (stand, neu) { kartenBauen(stand, neu); wecken(); },
            abflug: function (fach, cb) {
                var k = karten.filter(function (x) { return x.f === fach && x.i === 0; })[0];
                if (!k || !sichtbar() || flug) { cb(); return; }
                flug = { k: k, von: k.mesh.position.clone(), t0: performance.now(), cb: cb };
                wecken();
            }
        };
    }

    window.KKSzene = {
        abflug: function (fach, cb) { if (szene) szene.abflug(fach, cb); else cb(); }
    };
})();
