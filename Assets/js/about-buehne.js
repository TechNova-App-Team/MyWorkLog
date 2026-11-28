// ═══ ABOUT-BUEHNE MODULE ═══
// 3D-Auftakt der /about/-Seite: Laptop, Handy und Berichtsheft-Blaetter
// schweben vor der Riesentypo; Scrollen loest die Gruppe auf und holt das
// Handy frontal nach vorn — dort uebernimmt der Film (#film) mit demselben
// Bild (f01.webp), deshalb steht das Handy am Ende genau so gross wie
// .fi-phone (72 % der Fensterhoehe, Seitenverhaeltnis 4,2 : 8,754).
// Geladen NUR per import() aus about-erlebnis.js, und nur mit WebGL und ohne
// prefers-reduced-motion. Three.js wie im Landing-Intro als Vendor
// (Gruende: .claude/notes/intro-video.md).

var THREE_URL = '/Assets/js/vendor/three-0.186.1/three.module.js';

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
function eIO(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
function eOut(x) { return 1 - Math.pow(1 - x, 3); }
function mix(a, b, t) { return a + (b - a) * t; }

export async function start(sec, opt) {
    var THREE = await import(THREE_URL + (opt.q || ''));
    var cv = sec.querySelector('canvas');
    var stick = sec.querySelector('.bu-stick');
    var typo = sec.querySelector('.bu-typo');
    var foot = sec.querySelector('.bu-foot');

    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { return false; }
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    var ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    var scene = new THREE.Scene();
    var FOV = 32;
    var cam = new THREE.PerspectiveCamera(FOV, 1, 0.5, 300);

    // Spiegelraum aus Leuchtflaechen statt RoomEnvironment (das Addon
    // importiert 'three' als nackten Modulnamen und laedt ohne Import-Map nicht).
    (function () {
        var raum = new THREE.Scene();
        raum.add(new THREE.Mesh(new THREE.BoxGeometry(40, 24, 40), new THREE.MeshBasicMaterial({ color: 0x24222e, side: THREE.BackSide })));
        function licht(w, h, x, y, z, ry, rx, s, f) {
            var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(f).multiplyScalar(s), side: THREE.DoubleSide }));
            m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); raum.add(m);
        }
        licht(30, 5, 0, 11.5, 0, 0, Math.PI / 2, 4, 0xffffff);
        licht(8, 14, -19.5, 2, 0, Math.PI / 2, 0, 3, 0xffffff);
        licht(8, 14, 19.5, 2, -6, -Math.PI / 2, 0, 1.6, 0xdfe6ff);
        var pm = new THREE.PMREMGenerator(renderer);
        scene.environment = pm.fromScene(raum, 0.04).texture;
        pm.dispose();
    })();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1824, 0.55));
    var sonne = new THREE.DirectionalLight(0xffffff, 1.4); sonne.position.set(-10, 14, 14); scene.add(sonne);
    // Gegenlicht in der Theme-Farbe: zeichnet die Kanten nach, faerbt nichts ein
    var akz = new THREE.Color(0x5578a8);
    var rgb = getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').split(',').map(parseFloat);
    if (rgb.length === 3 && !rgb.some(isNaN)) akz.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
    var rand = new THREE.DirectionalLight(akz, 2.2); rand.position.set(12, 4, -14); scene.add(rand);

    var M = {
        alu: new THREE.MeshPhysicalMaterial({ color: 0x8e8f99, roughness: 0.38, metalness: 0.9, clearcoat: 0.3 }),
        dunkel: new THREE.MeshPhysicalMaterial({ color: 0x2b2a33, roughness: 0.3, metalness: 0.85, clearcoat: 0.6 }),
        schwarz: new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.35 }),
        tasten: new THREE.MeshStandardMaterial({ color: 0x15141b, roughness: 0.6 }),
        papier: new THREE.MeshLambertMaterial({ color: 0xd9d8e0, toneMapped: false })
    };

    function rundRechteck(w, h, r) {
        var s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2);
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
        s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
        s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
        s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
        return s;
    }
    // Flache Gehaeuse NIE als gerundeter Quader (kappt den Eckradius auf die
    // halbe Dicke) — extrudierte Rechteckform mit Fase, wie im Intro.
    function platte(w, h, d, r, b) {
        var g = new THREE.ExtrudeGeometry(rundRechteck(w - 2 * b, h - 2 * b, Math.max(0.02, r - b)),
            { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 28 });
        g.translate(0, 0, -(d - 2 * b) / 2);
        return g;
    }
    function flaeche(w, h, r) { return new THREE.ShapeGeometry(rundRechteck(w, h, r), 28); }
    var lader = new THREE.TextureLoader();
    var warten = [];
    function bild(src) {
        var t; warten.push(new Promise(function (ok) { t = lader.load(src, ok, undefined, ok); }));
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t;
    }
    // Bildschirm: runde Ecken per Abstandsfeld; colorspace_fragment am Ende,
    // sonst sind die Aufnahmen zu dunkel (Intro-Notiz).
    function schirm(tex, w, h, r) {
        var mat = new THREE.ShaderMaterial({
            uniforms: { map: { value: tex }, uG: { value: new THREE.Vector2(w, h) }, uR: { value: r }, uHell: { value: 1 } },
            vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
            fragmentShader: 'uniform sampler2D map; uniform vec2 uG; uniform float uR; uniform float uHell; varying vec2 vUv;\n' +
                'float box(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }\n' +
                'void main(){ vec2 px=(vUv-0.5)*uG; float d=box(px,uG*0.5,uR); float aa=fwidth(d);\n' +
                '  float a=1.0-smoothstep(-aa,aa,d); if(a<=0.0) discard;\n' +
                '  vec4 c=texture2D(map,vUv); gl_FragColor=vec4(c.rgb*uHell,1.0)*a;\n' +
                '  #include <colorspace_fragment>\n}',
            transparent: true
        });
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    }
    function glas(w, h, r) {
        return new THREE.Mesh(flaeche(w, h, r), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0.9, transparent: true, opacity: 0.18, depthWrite: false }));
    }

    var B = opt.bilder;

    /* ── Laptop: Deckel klappt beim Start auf (der eine inszenierte Moment) ── */
    var laptop = new THREE.Group();
    var LW = 16, LH = 10.4;
    var deckel = new THREE.Group();
    (function () {
        var gh = new THREE.Mesh(platte(LW, LH, 0.36, 0.55, 0.1), M.alu); gh.position.set(0, LH / 2, -0.18); deckel.add(gh);
        var rahmen = new THREE.Mesh(flaeche(LW - 0.1, LH - 0.1, 0.5), M.schwarz); rahmen.position.set(0, LH / 2, 0.005); deckel.add(rahmen);
        var s = schirm(bild(B.laptop), LW - 0.9, (LW - 0.9) * 0.625, 0.22); s.position.set(0, LH / 2 + 0.12, 0.012); deckel.add(s);
        var g = glas(LW - 0.1, LH - 0.1, 0.5); g.position.set(0, LH / 2, 0.02); deckel.add(g);
        deckel.userData.schirm = s;
    })();
    laptop.add(deckel);
    var unterteil = new THREE.Mesh(platte(LW + 0.3, 11, 0.42, 0.6, 0.12), M.alu);
    unterteil.rotation.x = -Math.PI / 2; unterteil.position.set(0, -0.21, 5.5); laptop.add(unterteil);
    // Tastatur als Einzeltasten (eine Flaeche sah aus wie ein schwarzes Loch)
    (function () {
        var REIHEN = 5, SPALTEN = 14, KW = (LW - 2.8) / SPALTEN, KT = 4.4 / REIHEN;
        var im = new THREE.InstancedMesh(platte(KW * 0.86, KT * 0.84, 0.08, 0.1, 0.03), M.tasten, REIHEN * SPALTEN);
        var o = new THREE.Object3D(), k = 0;
        for (var r = 0; r < REIHEN; r++) for (var s = 0; s < SPALTEN; s++) {
            o.position.set(-(LW - 2.8) / 2 + KW * (s + 0.5), 0.02, 1.25 + KT * (r + 0.5));
            o.rotation.set(-Math.PI / 2, 0, 0); o.updateMatrix(); im.setMatrixAt(k++, o.matrix);
        }
        laptop.add(im);
    })();
    var pad = new THREE.Mesh(flaeche(5.6, 3.2, 0.3), M.dunkel); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.005, 8.4); laptop.add(pad);
    scene.add(laptop);

    /* ── Handy: dieselben Masse wie .fi-phone im Film (4,2 x 9) ── */
    // Bildschirm 3,9 x 8,454 = Seitenverhaeltnis der Filmbilder (584 x 1266)
    var PW = 4.2, PH = 8.754, PD = 0.36, PR = 0.72, PRAND = 0.15;
    var handy = new THREE.Group();
    (function () {
        handy.add(new THREE.Mesh(platte(PW, PH, PD, PR, 0.1), M.dunkel));
        var front = new THREE.Mesh(flaeche(PW - 0.06, PH - 0.06, PR - 0.03), M.schwarz); front.position.z = PD / 2 + 0.002; handy.add(front);
        var s = schirm(bild(B.handy), PW - 2 * PRAND, PH - 2 * PRAND, PR - PRAND); s.position.z = PD / 2 + 0.006; handy.add(s);
        var g = glas(PW - 0.06, PH - 0.06, PR - 0.03); g.position.z = PD / 2 + 0.01; handy.add(g);
        var insel = new THREE.Mesh(flaeche(1.1, 0.32, 0.16), M.schwarz); insel.position.set(0, PH / 2 - 0.42, PD / 2 + 0.012); handy.add(insel);
        handy.userData.schirm = s;
    })();
    scene.add(handy);

    /* ── Berichtsheft-Blaetter: leicht gewoelbt, gefaechert ── */
    var heft = new THREE.Group();
    var BW = 6, BH = 6 * 1901 / 1344;
    B.blaetter.forEach(function (src, i) {
        var geo = new THREE.PlaneGeometry(BW, BH, 1, 16), p = geo.attributes.position;
        for (var k = 0; k < p.count; k++) { var y = p.getY(k); p.setZ(k, Math.pow(y / (BH / 2), 2) * 0.3); }
        geo.computeVertexNormals();
        var mat = new THREE.MeshLambertMaterial({ map: bild(src), toneMapped: false, side: THREE.DoubleSide });
        var m = new THREE.Mesh(geo, mat);
        m.userData.i = i; m.position.z = -i * 0.08;
        heft.add(m);
    });
    scene.add(heft);

    /* ── Zeitachse ──
       los: 0→1 in den ersten 1,8 s (Deckel auf, Handy steigt, Blaetter faechern)
       p:   Scrollanteil der Buehne. 0–0,45 die Gruppe loest sich auf,
            0,45–1 das Handy kommt frontal nach vorn. */
    var p = 0, pZiel = 0, mx = 0, my = 0, mxZ = 0, myZ = 0, los = 0, t0 = performance.now();
    var breite = true;

    function groesse() {
        var w = stick.clientWidth, h = stick.clientHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setSize(w, h, false);
        cam.aspect = w / h; cam.updateProjectionMatrix();
        breite = w / h > 1.05;
    }
    groesse();
    window.addEventListener('resize', groesse);

    function lies() {
        var r = sec.getBoundingClientRect();
        var spiel = r.height - window.innerHeight;
        pZiel = spiel > 0 ? clamp(-r.top / spiel, 0, 1) : 0;
    }
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        window.addEventListener('pointermove', function (e) {
            mxZ = e.clientX / window.innerWidth * 2 - 1;
            myZ = e.clientY / window.innerHeight * 2 - 1;
        }, { passive: true });
    }

    var CAMZ = 40;
    var tanH = Math.tan(FOV / 2 * Math.PI / 180);
    function zeichnen(now) {
        los = eOut(clamp((now - t0) / 1800, 0, 1));
        var a = eIO(seg(p, 0, 0.5)), b = eIO(seg(p, 0.42, 1));
        var schwebe = Math.sin(now / 1600);

        cam.position.set(mx * 1.4 * (1 - b), 0.8 - my * 0.9 * (1 - b), CAMZ);
        cam.lookAt(0, 0.4, 0);

        // Anordnung: breit stehen die Geraete ueber dem Text (unten links);
        // hochkant fuellt der Text die untere Haelfte (gemessen 390x844),
        // dort ruecken alle Teile kleiner ins obere Drittel.
        var K = breite
            ? { lx: -0.5, ly: -1.6, ls: 0.82, bx: -12.6, by: 3.2, bs: 1, hx: 9.6, hy: 1.4, hs: 0.84, weg: 46 }
            : { lx: 0, ly: 5.2, ls: 0.5, bx: -4.8, by: 9.2, bs: 0.42, hx: 3.9, hy: 4.4, hs: 0.5, weg: 30 };
        // Laptop: hinten Mitte, oeffnet sich, zieht dann nach links hinten ab
        deckel.rotation.x = mix(-Math.PI / 2 + 0.08, -0.22, los);
        laptop.position.set(mix(K.lx, -K.weg, a * 0.3 + b * 0.7), mix(K.ly, K.ly - 2.4, a) + schwebe * 0.15, mix(-13, -32, b));
        laptop.rotation.set(0.24 + a * 0.15, mix(0.34, 0.9, a), 0);
        laptop.scale.setScalar(K.ls);

        // Blaetter: links oben, faechern auf, fliegen nach oben links weg
        heft.position.set(mix(K.bx, K.bx - 10, b), mix(K.by + (1 - los) * -6, K.by + 3.8, a) + mix(0, 14, b) + schwebe * 0.22, mix(0, 3, a));
        heft.rotation.set(mix(-0.25, -0.5, a), mix(0.55, 0.9, a), mix(0.18, -0.12, a));
        heft.children.forEach(function (m) {
            var i = m.userData.i, f = los * (1 + a * 1.4);
            m.position.x = i * 0.55 * f; m.position.y = -i * 0.25 * f; m.rotation.z = -i * 0.07 * f;
        });
        heft.scale.setScalar(K.bs);

        // Handy: rechts vorn, steigt beim Start, faehrt am Ende frontal vor die
        // Kamera — Groesse so, dass es 72 % der Hoehe fuellt wie .fi-phone.
        var dist = PH / (0.72 * 2 * tanH);
        var hx = mix(K.hx, 0, b), hy = mix(K.hy - (1 - los) * 8, 0.4, b) + schwebe * 0.3 * (1 - b);
        var hz = mix(3, CAMZ - dist, b);
        handy.position.set(hx, hy, hz);
        handy.rotation.set(mix(0.12 - my * 0.08, 0, b), mix(-0.42 + mx * 0.12, 0, b) + mix(0, -0.35, a) * (1 - b), mix(0.06, 0, b));
        handy.scale.setScalar(mix(K.hs, 1, b));

        // Riesentypo: liegt im DOM HINTER dem Canvas, wandert mit der Kamera
        if (typo) {
            typo.style.transform = 'translate3d(' + (-mx * 14) + 'px,' + (-a * 18 - my * 8) + 'vh,0) scale(' + (1 + a * 0.12) + ')';
            typo.style.opacity = String(1 - seg(p, 0.25, 0.6));
        }
        if (foot) foot.style.opacity = String(1 - seg(p, 0.05, 0.3));
        renderer.render(scene, cam);
    }

    // Glaettung in festen 16-ms-Schritten (bei 64-ms-Bildern schaukelt sich
    // eine dt-gewichtete Glaettung sonst auf — Intro-Falle 3).
    var last = 0, raf = 0, sichtbar = true;
    function tick(now) {
        raf = 0;
        if (!sichtbar || document.hidden) return;
        lies();
        var n = last ? Math.min(8, Math.round((now - last) / 16)) : 1; last = now;
        for (var i = 0; i < Math.max(1, n); i++) {
            p += (pZiel - p) * 0.12;
            mx += (mxZ - mx) * 0.06; my += (myZ - my) * 0.06;
        }
        zeichnen(now);
        raf = requestAnimationFrame(tick);
    }
    function wecken() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }
    new IntersectionObserver(function (es) { sichtbar = es[0].isIntersecting; if (sichtbar) wecken(); }, { rootMargin: '100px 0px' }).observe(sec);
    document.addEventListener('visibilitychange', wecken);

    await Promise.all(warten);
    t0 = performance.now();
    sec.classList.add('bu-3d');
    wecken();
    return true;
}
