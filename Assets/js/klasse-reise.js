// ═══ KLASSE-REISE MODULE ═══ /klasse/ — Kamerafahrt durch vier Stationen (Three.js)
// Bauweise wie /traum/ und das Intro: EINE feste Leinwand, der Scroll faehrt die
// Kamera, die Texte kleben in hohen Abschnitten darueber (Ebenen: Kopf von
// klasse.css, Abschnitt "Kamerafahrt"). Laeuft nur in html.kl-gl; in kl-flat
// zeigt die Seite dieselben Stationen als ruhige Abschnitte.
//
// Die Szene erzaehlt genau die vier Saetze der Seite, nichts dazu:
//   1 Wochenband, Schultage sind gestrichelte "offen"-Luecken
//   2 QR-Tafel, Handys steigen auf und richten sich ein
//   3 dieselben Luecken drehen sich um und werden "Schule"
//   4 Sitzplan 30 Plaetze, 23 leuchten (die eine Zahl, die die Lehrkraft sieht)
//
// Speicher (Lehre vom 14.10.2026, Wetterfenster/Berichtsheft): eine Leinwand,
// Texturen je ART geteilt statt je Kachel, Pixeldichte gedeckelt, gezeichnet wird
// nur, solange sich etwas bewegt; ausserhalb der Fahrt steht die Schleife.
(function () {
    'use strict';

    var root = document.documentElement;
    if (!root.classList.contains('kl-gl')) return;
    var cv = document.getElementById('klCanvas');
    var reise = document.getElementById('klReise');
    if (!cv || !reise) return;

    var EN = root.lang === 'en';
    function L(de, en) { return EN ? en : de; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    // b == a (noch nicht gemessen) gaebe NaN — und NaN vergiftet die weich nachgezogene Kamera dauerhaft
    function seg(p, a, b) { return b > a ? clamp((p - a) / (b - a), 0, 1) : (p >= b ? 1 : 0); }
    function mix(a, b, t) { return a + (b - a) * t; }
    function sm(x) { return x * x * (3 - 2 * x); }
    function sm2(x) { return x * x * x * (x * (x * 6 - 15) + 10); }

    var css = getComputedStyle(root);
    function farbe(name, notfall) { var v = css.getPropertyValue(name).trim(); return v || notfall; }

    // ── Bauplan der Woche: Di + Do Schule, Woche 5 ist ein Block ──
    var WOCHEN = 8, TAGE = 5;
    var TAG_DE = ['Mo', 'Di', 'Mi', 'Do', 'Fr'], TAG_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    // d ist 0-basiert (0 = Mo): Di + Do — dieselbe Beispielklasse wie DEMO in klasse.js (schultage [2, 4])
    function istSchule(w, d) { return w === 5 || d === 1 || d === 3; }
    var KW = 1.0, KH = 1.28, SPALT = 0.16, WOCHE_SPALT = 0.78;
    var WOCHE_BREIT = TAGE * (KW + SPALT) - SPALT + WOCHE_SPALT;
    var BAND = WOCHEN * WOCHE_BREIT - WOCHE_SPALT;
    function kachelX(w, d) { return -BAND / 2 + w * WOCHE_BREIT + d * (KW + SPALT) + KW / 2; }

    // ── Texturen (2D-Canvas), einmal je Art ──
    function leinwand(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    function rund(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    function kachelBild(art, tag, P) {
        var c = leinwand(256, 328), g = c.getContext('2d');
        var r = 34;
        if (art === 'arbeit') {
            rund(g, 4, 4, 248, 320, r); g.fillStyle = P.panel; g.fill();
            g.lineWidth = 3; g.strokeStyle = P.line; g.stroke();
        } else if (art === 'offen') {
            rund(g, 6, 6, 244, 316, r); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
            g.setLineDash([16, 12]); g.lineWidth = 5; g.strokeStyle = P.akzentHalb; g.stroke(); g.setLineDash([]);
        } else {
            rund(g, 4, 4, 248, 320, r); g.fillStyle = P.akzent; g.fill();
        }
        g.textBaseline = 'top';
        g.font = '500 40px "Geist Mono", ui-monospace, monospace';
        g.fillStyle = art === 'schule' ? 'rgba(255,255,255,0.86)' : P.muted;
        g.fillText(tag, 30, 30);
        g.font = '600 46px Geist, system-ui, sans-serif';
        if (art === 'arbeit') { g.fillStyle = P.text; g.fillText(EN ? '8.0 h' : '8,0 h', 30, 248); }
        else if (art === 'offen') { g.fillStyle = P.text; g.fillText(L('offen', 'open'), 30, 248); }
        else {
            g.fillStyle = '#fff'; g.fillText(L('Schule', 'School'), 30, 248);
            g.lineWidth = 8; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
            g.beginPath(); g.moveTo(170, 72); g.lineTo(190, 92); g.lineTo(226, 52); g.stroke();
        }
        return c;
    }

    function handyBild(fertig, P) {
        var c = leinwand(300, 600), g = c.getContext('2d');
        rund(g, 6, 6, 288, 588, 48); g.fillStyle = '#05060a'; g.fill();
        g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.16)'; g.stroke();
        rund(g, 20, 20, 260, 560, 36); g.fillStyle = fertig ? '#0e1018' : '#0a0b10'; g.fill();
        g.textBaseline = 'top';
        if (!fertig) {
            // Sucher
            g.strokeStyle = P.akzent; g.lineWidth = 6; g.lineCap = 'round';
            var x = 80, y = 200, s = 140, k = 34;
            [[x, y, 1, 1], [x + s, y, -1, 1], [x, y + s, 1, -1], [x + s, y + s, -1, -1]].forEach(function (e) {
                g.beginPath(); g.moveTo(e[0], e[1] + e[3] * k); g.lineTo(e[0], e[1]); g.lineTo(e[0] + e[2] * k, e[1]); g.stroke();
            });
            g.font = '500 24px Geist, system-ui, sans-serif'; g.fillStyle = P.muted; g.textAlign = 'center';
            g.fillText(L('Code scannen', 'Scan code'), 150, 380);
        } else {
            g.fillStyle = P.akzent; g.beginPath(); g.arc(150, 104, 34, 0, Math.PI * 2); g.fill();
            g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
            g.beginPath(); g.moveTo(134, 104); g.lineTo(146, 116); g.lineTo(168, 92); g.stroke();
            g.textAlign = 'center'; g.font = '700 30px Geist, system-ui, sans-serif'; g.fillStyle = P.text;
            g.fillText('FI 25a', 150, 156);
            g.textAlign = 'left';
            var zeilen = [[L('Berufsschule', 'School'), L('Di, Do', 'Tue, Thu')], [L('Block', 'Block'), L('KW 49–50', 'CW 49–50')], [L('Prüfung', 'Exam'), '02.03.2027']];
            zeilen.forEach(function (z, i) {
                var y = 222 + i * 92;
                rund(g, 36, y, 228, 76, 16); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fill();
                g.font = '500 19px Geist, system-ui, sans-serif'; g.fillStyle = P.muted; g.fillText(z[0], 54, y + 14);
                g.font = '600 23px Geist, system-ui, sans-serif'; g.fillStyle = P.text; g.fillText(z[1], 54, y + 40);
            });
        }
        return c;
    }

    function tafelBild(qrCanvas, P) {
        var c = leinwand(512, 620), g = c.getContext('2d');
        rund(g, 4, 4, 504, 612, 40); g.fillStyle = '#f3f1ea'; g.fill();
        if (qrCanvas) { g.imageSmoothingEnabled = false; g.drawImage(qrCanvas, 66, 60, 380, 380); }
        g.textAlign = 'center'; g.textBaseline = 'top';
        g.font = '600 48px "Geist Mono", ui-monospace, monospace'; g.fillStyle = '#15151b';
        g.fillText('K7QP-M2XD', 256, 470);
        g.font = '500 26px Geist, system-ui, sans-serif'; g.fillStyle = '#6b6a66';
        g.fillText(L('myworklog.de/klasse', 'myworklog.de/klasse'), 256, 540);
        return c;
    }

    function qrLeinwand() {
        if (typeof QRCode === 'undefined') return null;
        var box = document.createElement('div');
        new QRCode(box, { text: 'https://myworklog.de/klasse/#K7QPM2XD', width: 380, height: 380, colorDark: '#15151b', colorLight: '#f3f1ea', correctLevel: QRCode.CorrectLevel.M });
        return box.querySelector('canvas');
    }

    // ── Fortschritt aus dem Scroll: P = 0 (Kopf) … 4 (Station 4) ──
    var stationen = [].slice.call(reise.querySelectorAll('.kl-st'));
    var texte = stationen.map(function (s) { return s.querySelector('.kl-st__text'); });
    var anker = [0, 0, 0, 0, 0], ausAb = 0, ausBis = 1;
    function messen() {
        var y0 = window.scrollY;
        var vh = window.innerHeight;
        stationen.forEach(function (s, i) {
            var r = s.getBoundingClientRect();
            // Mitte der Station, wenn ihr klebender Text gerade steht
            anker[i + 1] = r.top + y0 + r.height * 0.42 - vh * 0.3;
        });
        var letzte = stationen[stationen.length - 1].getBoundingClientRect();
        ausAb = letzte.bottom + y0 - vh * 1.05;
        ausBis = letzte.bottom + y0 - vh * 0.45;
    }
    function fortschritt() {
        var y = window.scrollY;
        if (y <= anker[1]) return 1 * seg(y, 0, anker[1]);
        for (var i = 1; i < 4; i++) if (y <= anker[i + 1]) return i + seg(y, anker[i], anker[i + 1]);
        return 4 + seg(y, anker[4], anker[4] + window.innerHeight * 0.6) * 0.3;
    }

    function start(THREE) {
        var renderer;
        try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
        catch (e) { root.classList.replace('kl-gl', 'kl-flat'); return; }
        renderer.setClearColor(0x000000, 0);
        if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

        var P = {
            akzent: farbe('--primary', '#5578a8'),
            akzentHalb: 'rgba(' + farbe('--primary-rgb', '85, 120, 168') + ', 0.75)',
            panel: '#12141b', line: 'rgba(255,255,255,0.10)', text: '#f4f5f7', muted: '#9aa3b2',
        };

        var scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x030305, 18, 62);
        var cam = new THREE.PerspectiveCamera(38, 1, 0.5, 200);

        function tex(c) { var t = new THREE.CanvasTexture(c); if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
        function mat(c, extra) { return new THREE.MeshBasicMaterial(Object.assign({ map: tex(c), transparent: true, depthWrite: false }, extra || {})); }

        // ── Wochenband ──
        var tags = EN ? TAG_EN : TAG_DE;
        var M = { arbeit: [], offen: [], schule: [] };
        for (var d = 0; d < TAGE; d++) {
            M.arbeit.push(mat(kachelBild('arbeit', tags[d], P)));
            M.offen.push(mat(kachelBild('offen', tags[d], P)));
            M.schule.push(mat(kachelBild('schule', tags[d], P)));
        }
        var kGeo = new THREE.PlaneGeometry(KW, KH);
        var band = new THREE.Group();
        var dreher = [];   // Schulkacheln: Gruppe mit Vorder- (offen) und Rueckseite (Schule)
        for (var w = 0; w < WOCHEN; w++) {
            for (var t = 0; t < TAGE; t++) {
                var x = kachelX(w, t);
                if (istSchule(w, t)) {
                    var gr = new THREE.Group();
                    var vorn = new THREE.Mesh(kGeo, M.offen[t]);
                    var hinten = new THREE.Mesh(kGeo, M.schule[t]); hinten.rotation.y = Math.PI;
                    gr.add(vorn); gr.add(hinten);
                    gr.position.set(x, 0, 0);
                    band.add(gr);
                    dreher.push({ g: gr, xn: (x + BAND / 2) / BAND });
                } else {
                    var m = new THREE.Mesh(kGeo, M.arbeit[t]);
                    m.position.set(x, 0, 0);
                    band.add(m);
                }
            }
        }
        // Rueckseiten nur sichtbar, wenn gedreht — beidseitig zeichnen waere doppelte Flaeche
        Object.keys(M).forEach(function (k) { M[k].forEach(function (mm) { mm.side = THREE.FrontSide; }); });
        band.rotation.x = -0.08;
        scene.add(band);

        // ── QR-Tafel ──
        var tafel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.12), mat(tafelBild(qrLeinwand(), P)));
        tafel.position.set(0, 7.2, -3);
        scene.add(tafel);
        // Lichtkegel des Beamers: ein weicher Fleck hinter der Tafel
        var glanzC = leinwand(256, 256), gg = glanzC.getContext('2d');
        var grad = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255,250,235,0.20)'); grad.addColorStop(1, 'rgba(255,250,235,0)');
        gg.fillStyle = grad; gg.fillRect(0, 0, 256, 256);
        var glanz = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), mat(glanzC));
        glanz.position.set(0, 7.2, -3.2);
        scene.add(glanz);

        // ── Handys ──
        var hScan = mat(handyBild(false, P)), hFertig = mat(handyBild(true, P));
        var hGeo = new THREE.PlaneGeometry(1.5, 3.0);
        var HANDY_X = [-4.6, -2.3, 0, 2.3, 4.6], FOLGE = [2, 0, 3, 1, 4];
        var handys = HANDY_X.map(function (hx, i) {
            var h = new THREE.Mesh(hGeo, hScan);
            h.position.set(hx, -6, 2.4);
            h.rotation.z = (i - 2) * -0.05;
            scene.add(h);
            return h;
        });

        // ── Lichtpunkte vom Code zu den Handys ──
        var N = 48;
        var pGeo = new THREE.BufferGeometry();
        var pPos = new Float32Array(N * 3);
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        var pMat = new THREE.PointsMaterial({ color: new THREE.Color(P.akzent), size: 0.12, transparent: true, opacity: 0, depthWrite: false });
        var punkte = new THREE.Points(pGeo, pMat);
        scene.add(punkte);
        var pVersatz = []; for (var q = 0; q < N; q++) pVersatz.push(Math.random());

        // ── Sitzplan ──
        var SITZ_X = 6, SITZ_Y = 5, SITZE = SITZ_X * SITZ_Y, ZIEL = 23;
        var sitzAus = new THREE.MeshBasicMaterial({ color: 0x1c1f29, transparent: true, depthWrite: false });
        var sitzAn = new THREE.MeshBasicMaterial({ color: new THREE.Color(P.akzent), transparent: true, depthWrite: false });
        var sGeo = new THREE.CircleGeometry(0.42, 28);
        var sitze = new THREE.Group();
        // Reihenfolge des Aufleuchtens: vermischt, aber fest (gleiches Bild bei jedem Besuch)
        var reihe = []; for (var si = 0; si < SITZE; si++) reihe.push(si);
        reihe.sort(function (a, b) { return ((a * 7919) % 31) - ((b * 7919) % 31); });
        var sitzListe = [];
        for (var sy = 0; sy < SITZ_Y; sy++) for (var sx = 0; sx < SITZ_X; sx++) {
            var s = new THREE.Mesh(sGeo, sitzAus);
            s.position.set((sx - (SITZ_X - 1) / 2) * 1.2, (sy - (SITZ_Y - 1) / 2) * -1.2, 0);
            sitze.add(s); sitzListe.push(s);
        }
        sitze.position.set(0, 16.5, -8);
        scene.add(sitze);
        var zahlEl = document.getElementById('klZahl');

        // ── Kamera: Stationen als Schluesselbilder [Position, Blickziel] ──
        var K = [
            [[13, 6.5, 30], [3, 0.5, 0]],
            [[-9, 1.2, 9], [-3, 0.2, 0]],
            [[0, 5.2, 15], [0, 4.6, -1]],
            // Vierte Woche (x ~ 3, normale Woche, Di/Do) statt der Blockwoche (x ~ 9,6): die ist ganz Schule
            // und laesst "jeder Tag ist Schule" lesen.
            [[-1, 1.6, 9.5], [3, 0.2, 0]],
            [[0, 16.5, 9], [0, 16.5, -8]],
        ];
        // Breite Schirme: Text steht links, also schraeg von rechts vorn aufs Band —
        // die nahen Kaertchen stehen rechts gross, das Band laeuft nach links hinten in
        // den Nebel. Frontal (wie am Handy) lief es quer durch Ueberschrift und Text.
        var KB = [
            [[16, 5.5, 26], [-13, 5.2, 0]],
            [[6, 1.8, 7], [-8, 0.4, -1.5]],
            K[2],
            [[10, 1.8, 7], [-4, 0.4, -1.5]],
            K[4],
        ];
        var cPos = new THREE.Vector3(), cZiel = new THREE.Vector3(), ist = new THREE.Vector3(13, 6.5, 30), istZiel = new THREE.Vector3(3, 0.5, 0);
        function ziel(Pw) {
            var i = Math.min(3, Math.floor(Pw)), f = sm2(clamp(Pw - i, 0, 1));
            var KK = schmal ? K : KB;
            var a = KK[i], b = KK[Math.min(4, i + 1)];
            cPos.set(mix(a[0][0], b[0][0], f), mix(a[0][1], b[0][1], f), mix(a[0][2], b[0][2], f));
            cZiel.set(mix(a[1][0], b[1][0], f), mix(a[1][1], b[1][1], f), mix(a[1][2], b[1][2], f));
            // In Station 1 und 3 gleitet die Kamera am Band entlang statt still zu stehen
            var gleit1 = Math.max(0, 1 - Math.abs(Pw - 1) * 1.4), gleit3 = Math.max(0, 1 - Math.abs(Pw - 3) * 1.4);
            var gl = schmal ? 7 : 4;
            cPos.x += (Pw - 1) * gl * gleit1 + (Pw - 3) * gl * gleit3;
            cZiel.x += (Pw - 1) * gl * gleit1 + (Pw - 3) * gl * gleit3;
            // Am Handy steht der Kopftext ueber der ganzen Breite: Blick hoeher, damit das
            // Band UNTER Text und Knopf liegt statt quer durch die Einleitung
            if (schmal && Pw < 1) cZiel.y += (1 - Pw) * 5.5;
        }

        var breite = 0, hoehe = 0, schmal = false;
        function groesse() {
            var w = window.innerWidth, h = window.innerHeight;
            if (w === breite && h === hoehe) return;
            breite = w; hoehe = h; schmal = w < 768;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
            renderer.setSize(w, h, false);
            cam.aspect = w / h;
            cam.fov = schmal ? 52 : 38;
            // Text links (breit) bzw. oben (schmal): die Szene rueckt aus dem Weg
            if (schmal) cam.setViewOffset(w, h, 0, -h * 0.17, w, h);
            else cam.setViewOffset(w, h, -w * 0.17, 0, w, h);
            cam.updateProjectionMatrix();
            messen();
        }

        groesse();
        var rafId = 0, Pist = fortschritt(), T0 = performance.now();
        function zeichnen(jetzt) {
            rafId = 0;
            groesse();
            var Psoll = fortschritt();
            // Weich nachziehen: Scroll springt in Raeder-Schritten, die Kamera nicht
            Pist += (Psoll - Pist) * 0.12;
            if (Math.abs(Psoll - Pist) < 0.0005) Pist = Psoll;
            var Pw = Pist;

            ziel(Pw);
            ist.lerp(cPos, 0.16); istZiel.lerp(cZiel, 0.16);
            // Im Kopf atmet die Szene leicht (einziger Bewegungsanteil ohne Scroll)
            var atem = Pw < 0.9 ? (1 - Pw / 0.9) : 0, zeit = (jetzt - T0) / 1000;
            cam.position.set(ist.x + Math.sin(zeit * 0.35) * 0.5 * atem, ist.y + Math.sin(zeit * 0.5) * 0.25 * atem, ist.z);
            cam.lookAt(istZiel);

            // Station 3: Luecken drehen sich gestaffelt um (links zuerst)
            var dreh = seg(Pw, 2.35, 3.05);
            dreher.forEach(function (k) {
                var f = sm(clamp(dreh * 1.7 - k.xn * 0.7, 0, 1));
                k.g.rotation.y = f * Math.PI;
                k.g.position.z = Math.sin(f * Math.PI) * 0.6;
            });
            band.visible = Pw < 3.85;
            var bandAus = 1 - seg(Pw, 3.35, 3.8);
            Object.keys(M).forEach(function (k) { M[k].forEach(function (mm) { mm.opacity = bandAus; }); });

            // Station 2: Handys steigen auf, werden nacheinander "eingerichtet", gehen wieder
            var hoch = sm2(seg(Pw, 1.35, 1.95)), weg = seg(Pw, 2.45, 2.9);
            handys.forEach(function (h, i) {
                var bogen = Math.abs(i - 2);
                h.position.y = mix(-7, 2.6 - bogen * 0.35, hoch) - weg * 6;
                h.position.z = 2.4 + (1 - hoch) * 2;
                var fertigAb = 1.9 + FOLGE.indexOf(i) * 0.07;
                h.material = Pw >= fertigAb ? hFertig : hScan;
                // Wartend unter dem Bild nicht zeichnen — am Handy lugten sie im Kopf unten herein
                h.visible = hoch > 0.01 && weg < 1;
            });
            hScan.opacity = hFertig.opacity = 1 - weg;
            tafel.material.opacity = glanz.material.opacity = seg(Pw, 1.2, 1.7) * (1 - seg(Pw, 2.5, 2.95));
            tafel.visible = glanz.visible = tafel.material.opacity > 0.001;

            // Lichtpunkte nur, solange die Handys noch scannen
            var fluss = seg(Pw, 1.6, 1.85) * (1 - seg(Pw, 2.2, 2.4));
            pMat.opacity = fluss;
            if (fluss > 0) {
                for (var n = 0; n < N; n++) {
                    var u = (pVersatz[n] + zeit * 0.55) % 1, h = handys[n % 5];
                    var bx = mix(0, h.position.x, u), by = mix(5.6, h.position.y + 0.6, u) + Math.sin(u * Math.PI) * 1.2;
                    pPos[n * 3] = bx; pPos[n * 3 + 1] = by; pPos[n * 3 + 2] = mix(-2.8, h.position.z + 0.1, u);
                }
                pGeo.attributes.position.needsUpdate = true;
            }

            // Station 4: Sitzplan, 23 von 30 leuchten
            var sitzSicht = seg(Pw, 3.2, 3.7);
            sitzAus.opacity = sitzAn.opacity = sitzSicht;
            sitze.visible = sitzSicht > 0;
            var an = Math.round(ZIEL * sm(seg(Pw, 3.5, 4)));
            sitzListe.forEach(function (s, i) { s.material = reihe.indexOf(i) < an ? sitzAn : sitzAus; });
            if (zahlEl) zahlEl.textContent = String(an);

            // Texte: der zur Station passende ist voll da, die anderen treten zurueck
            texte.forEach(function (el, i) {
                if (!el) return;
                var d = Math.abs(Pw - (i + 1));
                el.style.setProperty('--kl-sicht', (1 - clamp(d * 1.8 - 0.55, 0, 1)).toFixed(3));
            });

            // Nach der Fahrt: Szene aus, Schleife steht
            var y = window.scrollY;
            var aus = seg(y, ausAb, ausBis);
            root.style.setProperty('--kl-szene', (1 - aus).toFixed(3));
            if (aus < 1) renderer.render(scene, cam);

            var bewegt = Math.abs(Psoll - Pist) > 0.0005 || ist.distanceTo(cPos) > 0.01 || fluss > 0 || atem > 0;
            if (bewegt && aus < 1 && !document.hidden) rafId = requestAnimationFrame(zeichnen);
        }
        function wecken() { if (!rafId) rafId = requestAnimationFrame(zeichnen); }

        window.addEventListener('scroll', wecken, { passive: true });
        window.addEventListener('resize', function () { breite = 0; messen(); wecken(); });
        document.addEventListener('visibilitychange', function () { if (!document.hidden) wecken(); });
        // Schriften fuer die Texturen: erst wenn Geist da ist, sonst stehen Systemschriften auf den Kacheln
        messen();
        wecken();
        // Test-Sichtfenster nur lokal (vgl. window.__klasse): wo landet welches Objekt (NDC -1..1)?
        if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__klReise = { P: function () { return Pist; }, zeichnen: wecken,
            wo: function () {
                var v = new THREE.Vector3(), o = {};
                [['band', band], ['tafel', tafel], ['handyMitte', handys[2]], ['sitze', sitze]].forEach(function (e) {
                    e[1].getWorldPosition(v); v.project(cam); o[e[0]] = [+v.x.toFixed(2), +v.y.toFixed(2)];
                });
                return o;
            } };
    }

    var fertig = function () {
        import('/Assets/js/vendor/three-0.186.1/three.module.js?v=3bc833fceb').then(start).catch(function () {
            root.classList.replace('kl-gl', 'kl-flat');
        });
    };
    // Texturen tragen Text in Geist: vorher die Schriften abwarten (hoechstens 1,5 s)
    var schriften = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]) : Promise.resolve();
    schriften.then(function () {
        if (typeof QRCode === 'undefined') { window.addEventListener('load', fertig, { once: true }); } else fertig();
    });
})();
