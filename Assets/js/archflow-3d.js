// ═══ ARCHFLOW 3D MODULE ═══
// /archflow/ Ansicht „3D“: der Quellcode als Stadt. Gruppe = Viertel (Platte),
// Datei = Turm, Hoehe = Verbindungen (ein + aus, Wurzel-Skala), Farbe = Dateiart
// (dieselbe TC-Tabelle wie die 2D-Karte), Verbindung = Bogen ueber den Daechern.
//
// Haengt an den Globals des Hauptskripts der Seite (NODES, EDGES, GROUPS, RAW, sel,
// hov, filterType, searchQ, TC, selectNode, closeDetail, showTT, hideTT). Das
// Hauptskript ruft window.AF3D nur, solange layout === '3d'.
//
// 🔴 Gemalt wird nur bei Bedarf (_dirty / laufende Animation) — keine Dauerschleife.
// Beim Laden laeuft genau EINE Bewegung: die Tuerme wachsen gestaffelt aus dem
// Boden. Kein Bloom, keine Partikel, keine Auto-Rotation (Wunsch: eine Stufe ruhiger).
(function () {
    'use strict';

    var canvas = document.getElementById('cvs3');
    if (!canvas) return;
    var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function webglDa() {
        try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
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
        // start() liefert ein Promise; scheitert es, schaltet die Seite auf 2D zurueck.
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
        var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;

        var scene = new THREE.Scene();
        var BG = new THREE.Color('#030305');
        scene.fog = new THREE.Fog(BG, 60, 190);
        var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);

        scene.add(new THREE.HemisphereLight(new THREE.Color('#cfd6ee'), new THREE.Color('#06060a'), 0.95));
        var key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(30, 60, 25); scene.add(key);
        var saum = new THREE.DirectionalLight(new THREE.Color('#8fa6d8'), 0.8); saum.position.set(-40, 20, -35); scene.add(saum);

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
                var r = 0.45 * Math.sqrt(s) * 3, a = s * 2.39996;
                var x = Math.cos(a) * r, z = Math.sin(a) * r;
                if (frei(x, z, b)) { b.x = x; b.z = z; platziert.push({ x: x, z: z, b: b }); return; }
            }
        });

        var pos = {}, hoehe = {}, gruppeVon = {}, liste = [];
        gruppen.forEach(function (b, gi) {
            b.files.forEach(function (fid, fi) {
                var n = RAW.nodes[fid];
                var c = fi % b.k, r = Math.floor(fi / b.k);
                var x = b.x - b.w / 2 + RAND + (c + 0.5) * ZELLE;
                var z = b.z - b.d / 2 + RAND + (r + 0.5) * ZELLE;
                var h = 0.35 + Math.sqrt((n.inDegree || 0) + (n.outDegree || 0)) * 0.62;
                pos[fid] = new THREE.Vector3(x, 0, z); hoehe[fid] = h; gruppeVon[fid] = gi;
                liste.push(fid);
            });
        });
        var radius = 1;
        gruppen.forEach(function (b) { radius = Math.max(radius, Math.hypot(Math.abs(b.x) + b.w / 2, Math.abs(b.z) + b.d / 2)); });

        // ── Viertel: dunkle Platte mit feiner Kante ────────────────────
        var platteMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#0d0d14'), roughness: 0.92, metalness: 0 });
        var kanteMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09 });
        gruppen.forEach(function (b) {
            var m = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.12, b.d), platteMat);
            m.position.set(b.x, -0.06, b.z); scene.add(m);
            var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(b.w, 0.12, b.d)), kanteMat);
            e.position.copy(m.position); scene.add(e);
        });

        // Bodenraster: nur Orientierung, kaum sichtbar
        var grid = new THREE.GridHelper(Math.ceil(radius * 2.6 / 4) * 4, Math.ceil(radius * 2.6 / 4), 0x1a1a24, 0x101018);
        grid.position.y = -0.13; scene.add(grid);

        // ── Tuerme: ein InstancedMesh, Dach als zweites (hell = Leuchten) ──
        var geoTurm = new THREE.BoxGeometry(FUSS, 1, FUSS); geoTurm.translate(0, 0.5, 0);
        var geoDach = new THREE.PlaneGeometry(FUSS * 0.92, FUSS * 0.92); geoDach.rotateX(-Math.PI / 2);
        var turmMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.08 });
        var dachMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
        var tuerme = new THREE.InstancedMesh(geoTurm, turmMat, liste.length);
        var daecher = new THREE.InstancedMesh(geoDach, dachMat, liste.length);
        scene.add(tuerme); scene.add(daecher);

        var grund = liste.map(function (fid) { return new THREE.Color(TC[RAW.nodes[fid].type] || TC.other); });
        var tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), WEISS = new THREE.Color(1, 1, 1);
        var wuchs = liste.map(function () { return RM ? 1 : 0; });

        function setzeMatrizen() {
            for (var i = 0; i < liste.length; i++) {
                var fid = liste[i], p = pos[fid], h = Math.max(0.001, hoehe[fid] * wuchs[i]);
                tmpM.makeScale(1, h, 1); tmpM.setPosition(p.x, 0, p.z); tuerme.setMatrixAt(i, tmpM);
                tmpM.makeTranslation(p.x, h + 0.005, p.z); daecher.setMatrixAt(i, tmpM);
            }
            tuerme.instanceMatrix.needsUpdate = true; daecher.instanceMatrix.needsUpdate = true;
            tuerme.computeBoundingSphere(); daecher.computeBoundingSphere();
        }

        function passt(n) {
            if (filterType !== 'all' && n.type !== filterType) return false;
            if (searchQ && n.name.toLowerCase().indexOf(searchQ) < 0 && n.path.toLowerCase().indexOf(searchQ) < 0) return false;
            return true;
        }
        function setzeFarben() {
            var nb = sel ? nachbarn(sel).set : null;
            var gefiltert = filterType !== 'all' || !!searchQ;
            for (var i = 0; i < liste.length; i++) {
                var fid = liste[i], n = RAW.nodes[fid];
                tmpC.copy(grund[i]);
                var dunkel = 0;
                if (nb) dunkel = nb.has(fid) ? 0 : 0.86;
                else if (gefiltert) dunkel = passt(n) ? 0 : 0.8;
                if (fid === sel) tmpC.lerp(WEISS, 0.35);
                else if (fid === hov) tmpC.lerp(WEISS, 0.22);
                tmpC.lerp(BG, dunkel);
                tuerme.setColorAt(i, tmpC.clone().multiplyScalar(0.62));
                daecher.setColorAt(i, tmpC.clone().lerp(WEISS, dunkel ? 0 : 0.18));
            }
            tuerme.instanceColor.needsUpdate = true; daecher.instanceColor.needsUpdate = true;
        }

        // ── Boegen: alle Kanten in EINER Geometrie, Auswahl in einer zweiten ──
        var SEG = 18;
        function bogen(e, out, col, i0) {
            var a = pos[e.from], b = pos[e.to];
            var ha = hoehe[e.from] * 1, hb = hoehe[e.to] * 1;
            var dist = a.distanceTo(b);
            var hub = Math.max(ha, hb) + 0.6 + dist * 0.28;
            var p0 = new THREE.Vector3(a.x, ha, a.z), p2 = new THREE.Vector3(b.x, hb, b.z);
            var p1 = new THREE.Vector3((a.x + b.x) / 2, hub, (a.z + b.z) / 2);
            var vorher = null, j = i0;
            for (var s = 0; s <= SEG; s++) {
                var t = s / SEG, u = 1 - t;
                var x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
                var y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
                var z = u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z;
                if (vorher) {
                    out.pos.set(vorher, j * 3); out.pos.set([x, y, z], j * 3 + 3);
                    // Verlauf: am Ziel voll, an der Quelle schwach — die Richtung ohne Pfeil
                    var k0 = 0.25 + 0.75 * ((s - 1) / SEG), k1 = 0.25 + 0.75 * t;
                    out.col.set([col.r * k0, col.g * k0, col.b * k0, col.r * k1, col.g * k1, col.b * k1], j * 3);
                    j += 2;
                }
                vorher = [x, y, z];
            }
            return j;
        }
        var kanten = EDGES.filter(function (e) { return pos[e.from] && pos[e.to] && e.from !== e.to; });
        function baueLinien(menge, mat) {
            var n = menge.length * SEG * 2;
            var out = { pos: new Float32Array(n * 3), col: new Float32Array(n * 3) };
            var j = 0;
            menge.forEach(function (e) {
                var c = new THREE.Color(TC[RAW.nodes[e.to].type] || TC.other);
                j = bogen(e, out, c, j);
            });
            var g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(out.pos, 3));
            g.setAttribute('color', new THREE.BufferAttribute(out.col, 3));
            return new THREE.LineSegments(g, mat);
        }
        var alleMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
        var wahlMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending });
        var alleLinien = null, wahlLinien = null;

        function linienFuer(wachsend) {
            // Die Boegen erscheinen erst, wenn die Tuerme stehen (sonst haengen sie in der Luft).
            if (alleLinien || wachsend) return;
            alleLinien = baueLinien(kanten, alleMat); scene.add(alleLinien);
        }
        var wahlFuer = undefined;
        function setzeAuswahl() {
            var id = sel || hov || null;
            if (alleLinien) alleMat.opacity = sel ? 0.04 : (hov || filterType !== 'all' || searchQ) ? 0.07 : 0.16;
            if (wahlFuer === id) return;
            wahlFuer = id;
            if (wahlLinien) { scene.remove(wahlLinien); wahlLinien.geometry.dispose(); wahlLinien = null; }
            if (!id || !alleLinien) return;
            var eigene = kanten.filter(function (e) { return e.from === id || e.to === id; });
            if (!eigene.length) return;
            wahlLinien = baueLinien(eigene, wahlMat); scene.add(wahlLinien);
        }

        // Auswahl-Ring am Boden: Form, nicht Farbe (der Akzent ist frei waehlbar)
        var ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.66, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false }));
        ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);

        // ── Beschriftung der Viertel (ab 4 Dateien; kleinere zeigt der Tooltip) ──
        var schilder = [];
        function schild(text, zahl) {
            var fs = 44, pad = 18;
            var c = document.createElement('canvas'), g = c.getContext('2d');
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif';
            var tw = g.measureText(text).width;
            g.font = '500 ' + (fs * 0.72) + 'px "JetBrains Mono", monospace';
            var zw = g.measureText(String(zahl)).width;
            c.width = Math.ceil(tw + zw + pad * 3); c.height = fs + pad * 2;
            g.fillStyle = 'rgba(8,8,12,0.78)';
            var r = 14; g.beginPath(); g.moveTo(r, 0); g.arcTo(c.width, 0, c.width, c.height, r); g.arcTo(c.width, c.height, 0, c.height, r);
            g.arcTo(0, c.height, 0, 0, r); g.arcTo(0, 0, c.width, 0, r); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.stroke();
            g.font = '600 ' + fs + 'px Inter, system-ui, sans-serif'; g.fillStyle = '#e9e9ef'; g.textBaseline = 'middle';
            g.fillText(text, pad, c.height / 2 + 2);
            g.font = '500 ' + (fs * 0.72) + 'px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(233,233,239,0.45)';
            g.fillText(String(zahl), pad * 2 + tw, c.height / 2 + 2);
            var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
            // sizeAttenuation:false = feste Bildschirmgroesse. Mit Weltgroesse wurde ein
            // Schild beim Heranfliegen bildschirmfuellend und verdeckte den gewaehlten Turm.
            var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, sizeAttenuation: false }));
            s.userData.verh = c.width / c.height;
            return s;
        }
        function schilderBauen() {
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
        }

        // ── Kamera: Kugelkoordinaten um ein Ziel, gedaempft ───────────
        var ziel = new THREE.Vector3(), zielSoll = new THREE.Vector3();
        var theta = -0.65, thetaSoll = theta, phi = 0.92, phiSoll = phi;
        var dist = 1, distSoll = 1, heimDist = 1;
        var flug = null;

        function heimWerte() {
            var asp = Math.max(0.6, (wrap.clientWidth || 1) / (wrap.clientHeight || 1));
            heimDist = radius * (asp < 1 ? 3.6 : 2.75);
            return heimDist;
        }
        function kameraSetzen() {
            var sp = Math.sin(phi);
            camera.position.set(ziel.x + dist * sp * Math.sin(theta), ziel.y + dist * Math.cos(phi), ziel.z + dist * sp * Math.cos(theta));
            camera.lookAt(ziel);
            var zl = document.getElementById('zLvl');
            if (zl) zl.textContent = Math.round(heimDist / dist * 100) + '%';
        }

        // ── Malen nur bei Bedarf ──────────────────────────────────────
        var aktiv = false, raf = 0, wachsStart = 0;
        function bitte() { if (aktiv && !raf) raf = requestAnimationFrame(bild); }
        function bild(jetzt) {
            raf = 0;
            var weiter = false;

            if (wachsStart) {
                var fertig = true;
                for (var i = 0; i < liste.length; i++) {
                    var verz = gruppeVon[liste[i]] * 28 + (i % 7) * 18;
                    var t = clamp((jetzt - wachsStart - verz) / 900, 0, 1);
                    wuchs[i] = easeOut(t);
                    if (t < 1) fertig = false;
                }
                setzeMatrizen();
                if (fertig) { wachsStart = 0; linienFuer(false); setzeAuswahl(); } else weiter = true;
            }

            if (flug) {
                var f = clamp((jetzt - flug.t0) / flug.dauer, 0, 1), k = easeInOut(f);
                zielSoll.lerpVectors(flug.vonZiel, flug.nachZiel, k);
                distSoll = flug.vonDist + (flug.nachDist - flug.vonDist) * k;
                ziel.copy(zielSoll); dist = distSoll;
                if (f >= 1) flug = null; else weiter = true;
            } else {
                var d = 0.2;
                ziel.lerp(zielSoll, d);
                theta += (thetaSoll - theta) * d; phi += (phiSoll - phi) * d; dist += (distSoll - dist) * d;
                if (ziel.distanceTo(zielSoll) > 0.002 || Math.abs(thetaSoll - theta) > 0.0005 || Math.abs(phiSoll - phi) > 0.0005 || Math.abs(distSoll - dist) > 0.002) weiter = true;
            }

            kameraSetzen();
            if (ring.visible) ring.position.y = 0.02;
            renderer.render(scene, camera);
            if (weiter) bitte();
        }

        function groesse() {
            var w = wrap.clientWidth, h = wrap.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h; camera.updateProjectionMatrix();
            heimWerte(); bitte();
        }

        function heim() {
            flug = null;
            zielSoll.set(0, 0, 0); thetaSoll = -0.65; phiSoll = 0.92; distSoll = heimWerte();
            bitte();
        }
        function zoom(f) { distSoll = clamp(distSoll / f, 4, heimDist * 2.5); bitte(); }
        function flieg(id) {
            var p = pos[id]; if (!p) return;
            var nach = new THREE.Vector3(p.x, hoehe[id] * 0.5, p.z);
            // Abstand so, dass Turm UND Nachbarn ins Bild passen — sonst zeigen die Boegen ins Leere
            var weit = 4;
            nachbarn(id).set.forEach(function (o) { if (pos[o]) weit = Math.max(weit, pos[o].distanceTo(p)); });
            var nachDist = clamp(weit * 2.1, 12, heimDist);
            if (RM) { zielSoll.copy(nach); ziel.copy(nach); distSoll = dist = nachDist; bitte(); return; }
            flug = { t0: performance.now(), dauer: 700, vonZiel: ziel.clone(), nachZiel: nach, vonDist: dist, nachDist: nachDist };
            bitte();
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
            flug = null;
        });
        canvas.addEventListener('pointermove', function (e) {
            var alt = zeiger.get(e.pointerId);
            if (!alt) {
                if (e.pointerType === 'mouse') {
                    var id = treffer(e.clientX, e.clientY);
                    if (id !== hov) { hov = id; setzeFarben(); setzeAuswahl(); bitte(); }
                    if (id) showTT(e, RAW.nodes[id]); else hideTT();
                    canvas.style.cursor = id ? 'pointer' : 'grab';
                }
                return;
            }
            var dx = e.clientX - alt.x, dy = e.clientY - alt.y;
            zeiger.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) bewegt = true;
            if (zeiger.size === 2) {
                var a = Array.from(zeiger.values());
                var nd = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
                if (pinch) zoom(nd / pinch);
                pinch = nd; return;
            }
            if (!bewegt) return;
            hideTT();
            if (start && (start.knopf === 2 || start.shift)) {
                // Verschieben in der Bodenebene, Tempo mit dem Abstand
                var s = dist * 0.0016;
                var vx = Math.cos(theta), vz = -Math.sin(theta);
                zielSoll.x -= (dx * vx + dy * Math.sin(theta)) * s;
                zielSoll.z -= (dx * vz + dy * Math.cos(theta)) * s;
            } else {
                thetaSoll -= dx * 0.0055;
                phiSoll = clamp(phiSoll - dy * 0.0045, 0.18, 1.45);
            }
            canvas.style.cursor = 'grabbing';
            bitte();
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
        canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && hov) { hov = null; hideTT(); setzeFarben(); setzeAuswahl(); bitte(); } });
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        canvas.addEventListener('wheel', function (e) {
            e.preventDefault();
            zoom(e.deltaY > 0 ? 0.88 : 1.14);
        }, { passive: false });

        // ── Schnittstelle zur Seite ───────────────────────────────────
        function sync() {
            setzeFarben(); setzeAuswahl();
            schilder.forEach(function (s) { s.material.opacity = sel ? 0.18 : 1; });
            if (sel && pos[sel]) { ring.visible = true; ring.position.set(pos[sel].x, 0.02, pos[sel].z); }
            else ring.visible = false;
            bitte();
        }

        setzeMatrizen(); setzeFarben();
        schilderBauen();
        var ersterStart = true;

        return {
            an: function () {
                aktiv = true; canvas.classList.add('on'); groesse();
                if (ersterStart) {
                    ersterStart = false; heim();
                    ziel.copy(zielSoll); dist = distSoll * 1.12; theta = thetaSoll; phi = phiSoll;
                    if (RM) { linienFuer(false); } else wachsStart = performance.now();
                }
                sync();
            },
            aus: function () { aktiv = false; canvas.classList.remove('on'); if (raf) { cancelAnimationFrame(raf); raf = 0; } },
            sync: sync, groesse: groesse, heim: heim, zoom: zoom, flieg: flieg,
            png: function () { renderer.render(scene, camera); return canvas.toDataURL('image/png'); }
        };
    }
})();
