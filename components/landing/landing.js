// ═══ LANDING / INTRO MODULE ═══
// Rundgang fuer Erstbesucher (seit v8.1.3): eine Kamerafahrt einen Turm aus
// sieben Stationen hinab, gebaut nach der Machart von noomoagency.com:
// Pastell-Himmel, Riesentypo HINTER den Objekten, 3D-Objekte auf
// Wuerfelsockeln, lose Wuerfeltrauben, die Scrollposition faehrt die Kamera.
// Die Objekte zeigen ECHTE Aufnahmen der App — ein Handy mit Film vom
// Dashboard, ein Laptop mit Film vom PDF-Dialog, Blaetter der drei Vorlagen,
// Tablet und Monitor mit Screenshots (tools/intro-aufnahmen.mjs und die
// Aufnahme-Skripte der Unterseiten). Notizen + Fallen: .claude/notes/intro-video.md.
//
// Three.js liegt als Vendor-Datei unter /Assets/js/vendor/three-0.186.1/ und
// wird NUR hier per import() geladen — Wiederkehrer laden nichts davon. Ohne
// WebGL bleibt die Leinwand leer; Texte, Leiste und Abschluss laufen trotzdem.
(function(){
    // Vor dem ersten Ausstieg lesen: currentScript gibt es nur waehrend des Laufs.
    var VQ=((document.currentScript&&document.currentScript.src)||'').split('?')[1]||'';
    var Q=VQ?'?'+VQ:'';
    if(localStorage.getItem('pro_intro_seen')==='true') return;
    // Wer per QR-Code hier landet (#p2p=<code>), oeffnet die App auf dem ZWEITEN Geraet
    // meist zum allerersten Mal — genau der Fall, in dem das Intro sonst laeuft. Es liegt
    // auf z-index 99999 und sperrt body-Scroll, der P2P-Wizard nur auf 200: der Wizard
    // waere unsichtbar dahinter, Eingaben unmoeglich, die Seite wirkt eingefroren.
    // Deshalb Intro ueberspringen — und 'pro_intro_seen' bewusst NICHT setzen, damit es
    // beim naechsten normalen Aufruf ganz normal kommt.
    if(/[#&]p2p=/.test(location.hash||'')){ return; }
    var intro=document.getElementById('pro-intro');
    intro.style.display='block';

    // Schriften NUR fuer das Intro, und erst hier. Martian Mono traegt die
    // Riesentypo (breite Mono-Grotesk wie bei noomo), Bricolage/Geist den Rest.
    (function(){
      if(document.getElementById('viFonts')) return;
      var l=document.createElement('link');
      l.id='viFonts'; l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Martian+Mono:wdth,wght@112.5,300..500&family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Geist:wght@400;500;600&display=swap';
      document.head.appendChild(l);
    })();
    var EN=document.documentElement.lang==='en';
    var REDUCE=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var FEIN=!!(window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    document.body.style.overflow='hidden';

    var $=function(id){return document.getElementById(id);};
    var heroLogo=$('viLogo'), lines=intro.querySelectorAll('.vi-line'), heroFuss=$('viHeroFoot');
    var end=$('viEnd'), rail=$('viRail'), hint=$('viHint');
    var bigWrap=$('viBig'), corner=$('viCorner'), cv=$('viGl');
    var chEls=intro.querySelectorAll('.vi-ch');

    function clamp(v,a,b){return v<a?a:v>b?b:v;}
    function seg(p,a,b){return clamp((p-a)/(b-a),0,1);}
    function eOut(x){return 1-Math.pow(1-x,3);}
    function eIO(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}
    function sm(x){return x*x*(3-2*x);}
    function mix(a,b,t){return a+(b-a)*t;}

    /* ═══ ZEITACHSE ═══
       Abschnitte mit Gewicht (≈ Bildschirmhoehen Scrollweg): Hero, je Kapitel
       eine Station, Abschluss. Die Scrollhoehe ergibt sich daraus. */
    var N=chEls.length;
    var chapters=[];
    for(var i=0;i<N;i++) chapters.push({el:chEls[i], station:chEls[i].dataset.station, bild:chEls[i].dataset.src||''});
    var GEW={hero:1.3, station:1.75, ende:1.5};
    var SUMME=GEW.hero+N*GEW.station+GEW.ende;
    var B={hero:[0,GEW.hero/SUMME]};
    for(i=0;i<N;i++){ chapters[i].s=(GEW.hero+i*GEW.station)/SUMME; chapters[i].e=(GEW.hero+(i+1)*GEW.station)/SUMME; }
    B.ende=[(SUMME-GEW.ende)/SUMME,1];
    intro.querySelector('.vi-scroll').style.height=Math.round((SUMME+1)*100)+'vh';

    /* — Titel: Buchstaben einzeln (Aufsteigen macht die CSS). Das h1 behaelt
       seinen Text als aria-label; Crawler lesen das statische Markup. — */
    (function(){
      var txt=heroLogo.textContent.trim(); heroLogo.setAttribute('aria-label',txt); heroLogo.textContent='';
      for(var k=0;k<txt.length;k++){
        var s=document.createElement('span'); s.className='vi-l'; s.setAttribute('aria-hidden','true');
        s.style.setProperty('--i',k); s.textContent=txt[k]; heroLogo.appendChild(s);
      }
    })();

    var typedEl=$('viTyped');
    var typedText=EN?'For apprentices. Built by one.':'Für Azubis. Von einem Azubi.';
    var typedStart=null;
    function tippen(){
      if(typedStart) return; typedStart=1;
      if(REDUCE){ typedEl.textContent=typedText; return; }
      var n=0, t=setInterval(function(){ if(n<typedText.length) typedEl.textContent+=typedText[n++]; else clearInterval(t); },48);
    }

    /* — Eckbeschriftung oben links: Marke + Kapitelzaehler (der Rundgang IST
       eine Folge). Kein neuer Text fuer i18n. — */
    var cMarke=document.createElement('span'); cMarke.className='vi-corner-m'; cMarke.textContent='MyWorkLog';
    var cNum=document.createElement('span'); cNum.className='vi-corner-n';
    corner.appendChild(cMarke); corner.appendChild(cNum);

    /* — Riesenworte + Kapitel-Leiste aus den Eyebrows (auf /en/ uebersetzt) — */
    chapters.forEach(function(ch,idx){
      var eb=ch.el.querySelector('.vi-eyebrow'); if(!eb) return;
      ch.name=eb.textContent.trim();
      eb.setAttribute('data-n', String(idx+1));
      var w=document.createElement('span'); w.className='vi-big-w'; w.textContent=ch.name;
      bigWrap.appendChild(w); ch.big=w;
      var b=document.createElement('button');
      b.type='button'; b.className='vi-rail-btn'; b.setAttribute('aria-label',ch.name);
      var t=document.createElement('span'); t.textContent=ch.name;
      var bar=document.createElement('span'); bar.className='vi-rail-bar';
      var fill=document.createElement('span'); fill.className='vi-rail-fill';
      bar.appendChild(fill); b.appendChild(t); b.appendChild(bar);
      b.addEventListener('click',function(){ springeZu(mix(ch.s,ch.e,0.55)); });
      rail.appendChild(b);
      ch.btn=b; ch.fill=fill;
    });

    /* — Masse — */
    var W,H,SCHMAL,scrollMax=1;
    function messen(){
      W=intro.clientWidth; H=intro.clientHeight; SCHMAL=W<=900;
      scrollMax=Math.max(1,intro.querySelector('.vi-scroll').offsetHeight-H);
      chapters.forEach(function(ch){ if(ch.big) ch.bigW=ch.big.offsetWidth; });
      if(G) G.groesse();
    }

    /* — Zeiger (nur Maus): Zielwert springt, der gezeigte laeuft nach — */
    var mx=0,my=0,tmx=0,tmy=0;
    if(FEIN && !REDUCE){
      intro.addEventListener('pointermove',function(e){ tmx=(e.clientX/W)*2-1; tmy=(e.clientY/H)*2-1; },{passive:true});
    }

    /* — Geglaettete Scrollposition (Traegheit wie Lenis, ohne Lenis) und die
       Geschwindigkeit daraus, in festen 16-ms-Schritten gerechnet: mit dt als
       Faktor wird jede Glaettung bei langsamen Bildern instabil (gemessen im
       ersten Entwurf: eine Feder schaukelte sich bei 64-ms-Bildern auf). — */
    var ps=-1, vel=0;
    function lies(){ return clamp(intro.scrollTop/scrollMax,0,1); }
    function schritt(){
      var p=lies();
      if(ps<0) ps=p;
      var alt=ps;
      ps+= REDUCE ? (p-ps) : (p-ps)*0.1;
      if(Math.abs(p-ps)<0.00002) ps=p;
      vel=mix(vel,(ps-alt)*60,0.2);
      mx+=(tmx-mx)*0.06; my+=(tmy-my)*0.06;
    }

    /* ═══ DOM je Bild ═══ */
    function dom(){
      var k=eIO(seg(ps,B.hero[0]+0.004,B.hero[1]));
      // Hero: Titel weicht nach oben, die Zeilen laufen gegeneinander (noomo)
      heroLogo.style.opacity=(1-k).toFixed(3);
      heroLogo.style.transform='translate3d(0,'+(-k*H*0.25).toFixed(1)+'px,0)';
      var drift=REDUCE?0:(ps*H*1.6);
      lines.forEach(function(l,ix){
        var r=ix%2?1:-1, basis=ix===1?W*0.18:0;
        l.style.transform='translate3d('+(basis+r*drift).toFixed(1)+'px,'+(-k*H*0.35).toFixed(1)+'px,0)';
        l.style.opacity=(1-k*1.2).toFixed(3);
      });
      heroFuss.style.opacity=clamp(1-k*2,0,1).toFixed(3);
      heroFuss.style.visibility=k>0.5?'hidden':'';
      heroFuss.style.transform='translate3d(0,'+(-k*H*0.1).toFixed(1)+'px,0)';

      var amEnde=ps>=B.ende[0];
      var ci=-1, t=0;
      for(var n=0;n<N;n++){
        var C=chapters[n];
        if(ps>=C.s && ps<C.e){ ci=n; t=(ps-C.s)/(C.e-C.s); }
      }
      for(n=0;n<N;n++){
        C=chapters[n];
        var tn=seg(ps,C.s,C.e);
        var on=(n===ci && t>0.22 && t<0.9);
        C.el.classList.toggle('on',on);
        C.el.classList.toggle('up',!on && ps>=(C.s+C.e)/2);
        C.fill.style.setProperty('--f', tn.toFixed(3));
        C.btn.classList.toggle('on', n===ci);
        C.btn.classList.toggle('done', ps>=C.e);
        var op=(n===ci)?Math.min(eOut(seg(tn,0.06,0.3)),1-seg(tn,0.82,0.98)):0;
        C.big.style.opacity=op.toFixed(3);
        if(op>0){
          var x0=W*0.08, x1=W*0.92-C.bigW;
          if(x1>x0){ var m=(W-C.bigW)/2; x0=m+W*0.08; x1=m-W*0.08; }
          C.big.style.transform='translate3d('+mix(x0,x1,tn).toFixed(1)+'px,-50%,0) skewX('+clamp(-vel*30,-10,10).toFixed(2)+'deg)';
        }
      }
      var imRundgang=ps>=B.hero[1]-0.004 && !amEnde;
      rail.classList.toggle('on', imRundgang);
      corner.classList.toggle('on', imRundgang);
      if(ci>=0) cNum.textContent=(ci+1<10?'0':'')+(ci+1)+' / '+(N<10?'0':'')+N+'   '+chapters[ci].name;
      hint.classList.toggle('on', lies()<0.006);
      end.classList.toggle('on', ps>=mix(B.ende[0],B.ende[1],0.3));
    }

    /* ═══ 3D ═══ */
    var G=null;   // die Szene, sobald Three.js da ist

    function szeneBauen(THREE){
      var renderer;
      try { renderer=new THREE.WebGLRenderer({canvas:cv, antialias:true, alpha:true, powerPreference:'high-performance'}); }
      catch(e){ console.warn('[intro] WebGL aus:', e); return null; }
      renderer.setClearColor(0x000000,0);
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.05;
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      var ANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy());

      var scene=new THREE.Scene();
      var cam=new THREE.PerspectiveCamera(34,1,0.5,300);

      // Umgebung fuer die Spiegelungen: ein Raum aus Leuchtflaechen, einmal
      // vorgerechnet (statt RoomEnvironment aus den Addons, das 'three' als
      // nackten Modulnamen importiert und ohne Import-Map nicht laedt).
      (function(){
        var raum=new THREE.Scene();
        raum.add(new THREE.Mesh(new THREE.BoxGeometry(40,24,40), new THREE.MeshBasicMaterial({color:0x6b6880, side:THREE.BackSide})));
        function licht(w,h,x,y,z,ry,rx,staerke,farbe){
          var m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({color:new THREE.Color(farbe).multiplyScalar(staerke), side:THREE.DoubleSide}));
          m.position.set(x,y,z); m.rotation.set(rx||0,ry||0,0); raum.add(m);
        }
        licht(30,6,0,11.5,0,0,Math.PI/2,6,0xffffff);
        licht(10,14,-19.5,2,0,Math.PI/2,0,3.5,0xffffff);
        licht(10,14,19.5,2,-6,-Math.PI/2,0,2.2,0xffe9dd);
        licht(16,8,0,3,-19.5,0,0,2.4,0xe4e0ff);
        var pm=new THREE.PMREMGenerator(renderer);
        scene.environment=pm.fromScene(raum,0.035).texture;
        pm.dispose();
      })();
      scene.add(new THREE.HemisphereLight(0xffffff,0xb9b4dc,0.7));
      var sonne=new THREE.DirectionalLight(0xffffff,1.6); sonne.position.set(-8,14,12); scene.add(sonne);

      // Akzent GEDAEMPFT: die Theme-Farbe mit stark reduzierter Saettigung,
      // aufgehellt — wie Keramik. Der Nutzer fand die volle Theme-Farbe an
      // Stoppuhr und Stempel zu laut ("nicht grau, aber schlichter").
      var akzent=new THREE.Color(0xa855f7);
      (function(){
        var rgb=getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').split(',').map(parseFloat);
        if(rgb.length===3 && !rgb.some(isNaN)) akzent.setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,THREE.SRGBColorSpace);
        var hsl={}; akzent.getHSL(hsl); akzent.setHSL(hsl.h, Math.min(hsl.s,1)*0.55, 0.5);   // heller als 0,5 macht das Tone-Mapping es fast weiss (gemessen: Schloss und Uhr grau)
      })();
      var gruen=new THREE.Color().setHSL(0.43,0.32,0.56);
      var M={
        weiss:new THREE.MeshPhysicalMaterial({color:0xf3f2f8, roughness:0.5, clearcoat:0.35, clearcoatRoughness:0.4}),
        akzent:new THREE.MeshPhysicalMaterial({color:akzent, roughness:0.32, clearcoat:1, clearcoatRoughness:0.12}),
        gruen:new THREE.MeshPhysicalMaterial({color:gruen, roughness:0.32, clearcoat:1, clearcoatRoughness:0.12}),
        rahmen:new THREE.MeshPhysicalMaterial({color:0x4a4a55, roughness:0.28, metalness:0.85, clearcoat:0.5}),
        alu:new THREE.MeshPhysicalMaterial({color:0xdcdce4, roughness:0.3, metalness:0.85}),
        glas:new THREE.MeshPhysicalMaterial({color:0x0a0a0e, roughness:0.08, metalness:0.2, clearcoat:1, clearcoatRoughness:0.03}),
        schwarz:new THREE.MeshStandardMaterial({color:0x0b0b10, roughness:0.4}),
        holz:new THREE.MeshPhysicalMaterial({color:0xb88a5c, roughness:0.48, clearcoat:0.55, clearcoatRoughness:0.25}),
        gummi:new THREE.MeshStandardMaterial({color:0x2c2833, roughness:0.85})
      };

      // Abgerundeter Quader: jeder Punkt eines unterteilten Wuerfels auf den
      // inneren Kern geklemmt und um r nach aussen geschoben.
      function rundQuader(w,h,d,r,s){
        s=s||4; r=Math.min(r,w/2,h/2,d/2);
        var g=new THREE.BoxGeometry(w,h,d,s*2,s*2,s*2), p=g.attributes.position, nn=g.attributes.normal;
        var v=new THREE.Vector3(), k=new THREE.Vector3(), hw=w/2-r, hh=h/2-r, hd=d/2-r;
        for(var i=0;i<p.count;i++){
          v.fromBufferAttribute(p,i);
          k.set(clamp(v.x,-hw,hw),clamp(v.y,-hh,hh),clamp(v.z,-hd,hd));
          var n=v.clone().sub(k); if(n.lengthSq()<1e-9) n.fromBufferAttribute(nn,i); n.normalize();
          p.setXYZ(i,k.x+n.x*r,k.y+n.y*r,k.z+n.z*r); nn.setXYZ(i,n.x,n.y,n.z);
        }
        return g;
      }
      var wuerfelGeo=rundQuader(1,1,1,0.17,3);
      // Flache Gehaeuse (Handy, Tablet, Monitor, Icon): rundQuader taugt dafuer
      // NICHT — er kappt den Eckradius auf die halbe Dicke, ein 0,78 dickes
      // Handy bekam 0,35 statt 1,25 Radius, und Gehaeuse und Bildschirm hatten
      // verschiedene Ecken (graue Kloetze, gemeldet 04.10.2026). Deshalb hier
      // eine gerundete Rechteckform, extrudiert, mit feiner Fase an der Kante.
      function rundRechteck(w,h,r){
        var s=new THREE.Shape(), x=-w/2, y=-h/2; r=Math.min(r,w/2,h/2);
        s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.absarc(x+w-r,y+r,r,-Math.PI/2,0,false);
        s.lineTo(x+w,y+h-r); s.absarc(x+w-r,y+h-r,r,0,Math.PI/2,false);
        s.lineTo(x+r,y+h); s.absarc(x+r,y+h-r,r,Math.PI/2,Math.PI,false);
        s.lineTo(x,y+r); s.absarc(x+r,y+r,r,Math.PI,Math.PI*1.5,false);
        return s;
      }
      function platte(w,h,d,r,b){
        var g=new THREE.ExtrudeGeometry(rundRechteck(w-2*b,h-2*b,Math.max(0.02,r-b)),
          {depth:d-2*b, bevelEnabled:true, bevelThickness:b, bevelSize:b, bevelSegments:6, curveSegments:32});
        g.translate(0,0,-(d-2*b)/2);
        return g;
      }
      function flaeche(w,h,r){ return new THREE.ShapeGeometry(rundRechteck(w,h,r),32); }
      function wuerfel(liste,mat){
        var im=new THREE.InstancedMesh(wuerfelGeo,mat||M.weiss,liste.length), o=new THREE.Object3D();
        liste.forEach(function(q,i){ o.position.set(q[0],q[1],q[2]); o.scale.setScalar(q[3]||0.96); o.updateMatrix(); im.setMatrixAt(i,o.matrix); });
        return im;
      }
      // Sockel wie bei noomo: ein Plus aus Wuerfeln, die Mitte eine Stufe hoeher
      function sockel(){
        var l=[];
        for(var x=-3;x<=3;x++) for(var z=-3;z<=3;z++){
          if(Math.abs(x)===3&&Math.abs(z)>1 || Math.abs(z)===3&&Math.abs(x)>1) continue;
          l.push([x,0,z,0.98]);
          if(Math.abs(x)<=1&&Math.abs(z)<=1) l.push([x,1,z,0.98]);
        }
        var g=wuerfel(l); g.scale.setScalar(0.95); return g;
      }
      // Lose Wuerfeltrauben (noomos Pixelwolken)
      var trauben=[];
      function traube(x,y,z,seed){
        var r=function(){ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
        var l=[[0,0,0]], n=3+Math.floor(r()*5);
        for(var i=1;i<n;i++){ var b=l[Math.floor(r()*l.length)], d=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]][Math.floor(r()*6)]; l.push([b[0]+d[0],b[1]+d[1],b[2]+d[2]]); }
        var g=wuerfel(l.map(function(q){return [q[0],q[1],q[2],0.96];}), r()>0.86?M.akzent:M.weiss);
        g.position.set(x,y,z); g.rotation.set(r()*6,r()*6,r()*6); g.scale.setScalar(0.7+r()*0.8);
        g.userData={rx:(r()-0.5)*0.4, ry:(r()-0.5)*0.4, y0:y, ph:r()*6};
        scene.add(g); trauben.push(g);
      }

      // Bildschirm-Material: Bild oder Film, runde Ecken per Abstandsfeld im
      // Shader (schaerfer als eine Alpha-Maske), Farbraum korrekt zurueck nach sRGB.
      function schirm(tex,w,h,radius,statusbar){
        var mat=new THREE.ShaderMaterial({
          uniforms:{map:{value:tex}, bar:{value:statusbar||null}, uGroesse:{value:new THREE.Vector2(w,h)}, uR:{value:radius},
            uBarH:{value:statusbar?0.62:0}, uCover:{value:new THREE.Vector2(1,1)}},
          vertexShader:'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
          fragmentShader:'uniform sampler2D map; uniform sampler2D bar; uniform vec2 uGroesse; uniform float uR; uniform float uBarH; uniform vec2 uCover; varying vec2 vUv;\n'+
            'float box(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }\n'+
            'void main(){ vec2 px=(vUv-0.5)*uGroesse; float d=box(px,uGroesse*0.5,uR); float aa=fwidth(d);\n'+
            '  float a=1.0-smoothstep(-aa,aa,d); if(a<=0.0) discard;\n'+
            '  float yb=1.0-uBarH/uGroesse.y; vec4 c;\n'+
            '  if(uBarH>0.0 && vUv.y>yb){ c=texture2D(bar, vec2(vUv.x,(vUv.y-yb)/(1.0-yb))); }\n'+
            '  else { vec2 u=vec2(vUv.x, uBarH>0.0 ? vUv.y/yb : vUv.y); u=(u-0.5)*uCover+0.5; u.y+= (1.0-uCover.y)*0.5; c=texture2D(map,u); }\n'+
            '  gl_FragColor=vec4(c.rgb,1.0)*a;\n'+
            '  #include <colorspace_fragment>\n}',
          transparent:true
        });
        return new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);
      }
      // Glas ueber jedem Bildschirm: spiegelt die Umgebung schwach
      function glas(w,h,r){
        return new THREE.Mesh(flaeche(w,h,r), new THREE.MeshPhysicalMaterial({color:0x000000, roughness:0.05, metalness:0.9, transparent:true, opacity:0.16, depthWrite:false}));
      }

      var filme=[];
      function film(src){
        var v=document.createElement('video');
        v.src=src+Q; v.muted=true; v.loop=true; v.playsInline=true; v.setAttribute('playsinline',''); v.preload='auto'; v.crossOrigin='anonymous';
        var t=new THREE.VideoTexture(v); t.colorSpace=THREE.SRGBColorSpace;
        filme.push(v); return {video:v, tex:t};
      }
      var ladeBild=new THREE.TextureLoader();
      function bild(src){
        var t=ladeBild.load(src+(src.indexOf('?')<0?Q:'')); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=ANISO; return t;
      }

      /* ═══ HERO: Stoppuhr in gedaempftem Akzent, um sie Wuerfeltrauben ═══ */
      var Y_HERO=0;
      var uhr=new THREE.Group();
      (function(){
        var koerper=new THREE.Mesh(new THREE.CylinderGeometry(4,4,1.5,96,1), M.akzent); koerper.rotation.x=Math.PI/2; uhr.add(koerper);
        uhr.add(new THREE.Mesh(new THREE.TorusGeometry(4,0.5,32,128), M.akzent));
        var blatt=new THREE.Mesh(new THREE.CircleGeometry(3.55,96), new THREE.MeshPhysicalMaterial({color:0xfbfaff, roughness:0.35, clearcoat:1})); blatt.position.z=0.77; uhr.add(blatt);
        for(var i=0;i<12;i++){
          var s=new THREE.Mesh(new THREE.BoxGeometry(i%3?0.12:0.22, i%3?0.42:0.7, 0.06), M.rahmen);
          var a=i/12*Math.PI*2; s.position.set(Math.sin(a)*3.0,Math.cos(a)*3.0,0.81); s.rotation.z=-a; uhr.add(s);
        }
        var zeiger=new THREE.Group(); var zg=new THREE.Mesh(new THREE.BoxGeometry(0.14,3.1,0.08), M.akzent); zg.position.y=1.2; zeiger.add(zg); zeiger.position.z=0.86; uhr.add(zeiger);
        var kurz=new THREE.Group(); var kg=new THREE.Mesh(new THREE.BoxGeometry(0.24,1.9,0.08), M.rahmen); kg.position.y=0.75; kurz.add(kg); kurz.position.z=0.84; uhr.add(kurz);
        var nabe=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.2,32), M.rahmen); nabe.rotation.x=Math.PI/2; nabe.position.z=0.9; uhr.add(nabe);
        var krone=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.9,32), M.alu); krone.position.y=4.85; uhr.add(krone);
        var knopf=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.4,32), M.alu); knopf.position.y=5.4; uhr.add(knopf);
        var ohr=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.16,16,48), M.alu); ohr.position.set(3.3,3.3,0); ohr.rotation.z=-Math.PI/4; uhr.add(ohr);
        uhr.userData={zeiger:zeiger, kurz:kurz};
      })();
      scene.add(uhr);
      [[-15,7,-6],[15,8,-8],[-4,-9,-9],[-19,1,-12],[22,2,-16],[3,-9,-6],[11,11,-14],[-8,-11,-12]].forEach(function(q,i){ traube(q[0],Y_HERO+q[1],q[2],11+i*97); });

      /* ═══ STATIONEN ═══ Jede liefert {gruppe, dazu(t,T)}. t = Lage in der
         Station (0…1), dazu() treibt Drehung und Mechanik. Die Gruppe sitzt
         mit ihrem Ursprung in der Bildmitte der Station. */
      var BAU={
        // Handy: duenner schwarzer Rand, Statusleiste mit Insel, Seitentasten,
        // Glas. Erste Fassung (dicker Silberrahmen, Insel mitten im App-Kopf)
        // fand der Nutzer "naja".
        handy:function(ch){
          var g=new THREE.Group(), f=film('/Grafiken/intro/handy.mp4');
          // Masse eines heutigen Handys: 0,26 Rand rundum, Bildschirmecken =
          // Gehaeuseecken minus Rand, damit die Linien parallel laufen.
          var W2=7.5, H2=15.6, D2=0.66, R2=1.3, RAND=0.26, Z=D2/2;
          g.add(new THREE.Mesh(platte(W2,H2,D2,R2,0.16), M.rahmen));
          var front=new THREE.Mesh(flaeche(W2-0.12,H2-0.12,R2-0.06), M.glas); front.position.z=Z+0.002; g.add(front);
          // Statusleiste: Uhrzeit links, Empfang + Akku rechts, App-Hintergrund
          var sc=document.createElement('canvas'); sc.width=700; sc.height=62; var x=sc.getContext('2d');
          x.fillStyle='#0b0a10'; x.fillRect(0,0,700,62); x.fillStyle='#fff'; x.font='600 30px Geist, system-ui, sans-serif'; x.fillText('9:41',70,43);
          for(var b=0;b<4;b++) x.fillRect(538+b*11,40-b*6,7,8+b*6);
          x.strokeStyle='#fff'; x.lineWidth=2.5; x.strokeRect(592,24,42,20); x.fillRect(596,28,30,12); x.fillRect(636,30,3,8);
          var barTex=new THREE.CanvasTexture(sc); barTex.colorSpace=THREE.SRGBColorSpace;
          var SW=W2-2*RAND, SH=H2-2*RAND;
          var s=schirm(f.tex,SW,SH,R2-RAND,barTex); s.position.z=Z+0.006; g.add(s);
          // Film (390x844) fuellt die Flaeche unter der Leiste: oben/unten minimal beschnitten
          var flH=SH-0.62, soll=(844/390), ist=flH/SW;
          s.material.uniforms.uCover.value.set(1, Math.min(1,ist/soll));
          var insel=new THREE.Mesh(flaeche(2.0,0.52,0.26), M.schwarz); insel.position.set(0,SH/2-0.34,Z+0.01); g.add(insel);
          var gl1=glas(SW,SH,R2-RAND); gl1.position.z=Z+0.014; g.add(gl1);
          // Tasten: links Aktion + Lautstaerke, rechts Seitentaste — flach anliegend
          [[-1,5.0,0.8],[-1,3.6,1.5],[-1,1.8,1.5],[1,3.9,2.4]].forEach(function(q){
            var t=new THREE.Mesh(rundQuader(0.12,q[2],0.3,0.06,2), M.rahmen); t.position.set(q[0]*(W2/2+0.02),q[1],0); g.add(t);
          });
          g.scale.setScalar(0.9); g.position.y=3.2;
          return {gruppe:g, film:f.video, dazu:function(t,T){ g.rotation.set(0.05, mix(-0.55,0.55,t)+mx*0.15, mix(-0.1,0.05,t)); }};
        },
        // Laptop: Film vom PDF-Dialog, der Deckel klappt beim Scrollen auf.
        // Gehaeuse als platte() (rundQuader kappte die Ecken, wie beim Handy),
        // echte Einzeltasten in einer Mulde, Trackpad, Notch, Scharnierrolle.
        laptop:function(){
          var g=new THREE.Group(), f=film('/Grafiken/intro/vorlagen.mp4');
          var B=17, T=11.4, D=0.55, OBEN=D/2;
          var unten=new THREE.Mesh(platte(B,T,D,0.85,0.18).rotateX(-Math.PI/2), M.alu); g.add(unten);
          function liegend(geo){ return geo.rotateX(-Math.PI/2); }
          // Tastenmulde + Tasten (Reihen in Tastenbreiten, auf 14,6 Einheiten verteilt)
          var mulde=new THREE.Mesh(liegend(flaeche(15.3,6.35,0.35)), new THREE.MeshStandardMaterial({color:0x1d1d24, roughness:0.8}));
          mulde.position.set(0,OBEN+0.004,-1.7); g.add(mulde);
          var reihen=[
            {h:0.5, b:[1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
            {h:0.92,b:[1,1,1,1,1,1,1,1,1,1,1,1,1,1.5]},
            {h:0.92,b:[1.5,1,1,1,1,1,1,1,1,1,1,1,1,1]},
            {h:0.92,b:[1.8,1,1,1,1,1,1,1,1,1,1,1,1.75]},
            {h:0.92,b:[2.3,1,1,1,1,1,1,1,1,1,1,2.3]},
            {h:0.92,b:[1,1,1,1.3,5.6,1.3,1,1,1]}
          ];
          var tastenGeo=rundQuader(1,0.16,1,0.07,2), liste=[], LUECKE=0.13, BREITE=14.6;
          var zPos=-1.7-6.35/2+0.42;
          reihen.forEach(function(r){
            var summe=r.b.reduce(function(a,x){return a+x;},0), einheit=(BREITE-LUECKE*(r.b.length-1))/summe, x=-BREITE/2;
            r.b.forEach(function(w){ var bw=w*einheit; liste.push([x+bw/2, zPos+r.h/2, bw, r.h]); x+=bw+LUECKE; });
            zPos+=r.h+LUECKE;
          });
          var tasten=new THREE.InstancedMesh(tastenGeo, new THREE.MeshPhysicalMaterial({color:0x26252d, roughness:0.55, clearcoat:0.2}), liste.length), o=new THREE.Object3D();
          liste.forEach(function(q,i){ o.position.set(q[0],OBEN+0.09,q[1]); o.scale.set(q[2],1,q[3]); o.updateMatrix(); tasten.setMatrixAt(i,o.matrix); });
          g.add(tasten);
          var pad=new THREE.Mesh(liegend(flaeche(6.4,3.9,0.38)), new THREE.MeshPhysicalMaterial({color:0xcfd0d8, roughness:0.32, metalness:0.55, clearcoat:0.4}));
          pad.position.set(0,OBEN+0.004,3.55); g.add(pad);
          // Deckel: Drehpunkt an der Hinterkante, knapp ueber den Tasten, damit
          // der zugeklappte Deckel nicht durch die Tastatur schneidet
          var scharnier=new THREE.Group(); scharnier.position.set(0,OBEN+0.32,-T/2+0.32); g.add(scharnier);
          var rolle=new THREE.Mesh(new THREE.CylinderGeometry(0.24,0.24,14.6,24), M.rahmen); rolle.rotation.z=Math.PI/2; scharnier.add(rolle);
          var DH=11.2, DD=0.3;
          var deckel=new THREE.Mesh(platte(B,DH,DD,0.85,0.1), M.alu); deckel.position.set(0,DH/2,0); scharnier.add(deckel);
          var front=new THREE.Mesh(flaeche(B-0.16,DH-0.16,0.78), M.glas); front.position.set(0,DH/2,DD/2+0.003); scharnier.add(front);
          // Bildschirm 16:10 mit duennem Rand, unten etwas breiter wie beim Vorbild
          var SB=16.3, SH=SB/1.6, sy=DH/2+0.22;
          var s=schirm(f.tex,SB,SH,0.42); s.position.set(0,sy,DD/2+0.008); scharnier.add(s);
          var notch=new THREE.Mesh(flaeche(1.7,0.36,0.14), M.schwarz); notch.position.set(0,sy+SH/2-0.16,DD/2+0.012); scharnier.add(notch);
          var gl1=glas(SB,SH,0.42); gl1.position.set(0,sy,DD/2+0.016); scharnier.add(gl1);
          g.scale.setScalar(0.66); g.position.y=-2.6;
          return {gruppe:g, film:f.video, dazu:function(t){
            g.rotation.set(0.32+my*0.05, mix(-0.45,0.45,t)+mx*0.1, 0);
            // zu = Deckel flach auf der Tastatur (+90 Grad), offen leicht nach hinten
            scharnier.rotation.x=mix(Math.PI*0.5,-0.18,eOut(seg(t,0.06,0.4)));
          }};
        },
        // Papier: drei echte Blaetter (IHK-Vordruck, Klassisch, Klar) faechern
        // auf, ein Holzstempel landet und hinterlaesst einen Abdruck.
        papier:function(){
          var g=new THREE.Group(), blaetter=[];
          ['form','klassisch','klar'].forEach(function(n){
            var geo=new THREE.PlaneGeometry(9.4,13.3,1,24);
            var p=geo.attributes.position; for(var k=0;k<p.count;k++){ var y=p.getY(k); p.setZ(k,Math.pow(y/6.65,2)*0.35); } geo.computeVertexNormals();
            // Lambert ohne Tone-Mapping: ACES + Sonne trieben das Papier in die
            // Saettigung und frassen den grauen Vordruck-Text (gemeldet 04.10.2026)
            var m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:0xd9d8e0, side:THREE.DoubleSide, toneMapped:false, map:bild('/Grafiken/intro/blatt-'+n+'.webp')}));
            var halter=new THREE.Group(); halter.add(m); m.position.set(4.7,6.65,0);
            g.add(halter); blaetter.push(halter);
          });
          // Abdruck: Ring mit Haken in gedaempftem Akzent, liegt auf dem obersten Blatt
          var ac=document.createElement('canvas'); ac.width=256; ac.height=256; var x=ac.getContext('2d');
          x.strokeStyle='#'+akzent.clone().multiplyScalar(0.72).getHexString(); x.lineWidth=14; x.lineCap='round'; x.lineJoin='round';
          x.globalAlpha=0.85; x.beginPath(); x.arc(128,128,104,0,Math.PI*2); x.stroke(); x.lineWidth=5; x.beginPath(); x.arc(128,128,84,0,Math.PI*2); x.stroke();
          x.lineWidth=18; x.beginPath(); x.moveTo(84,132); x.lineTo(116,164); x.lineTo(176,94); x.stroke();
          var aTex=new THREE.CanvasTexture(ac); aTex.colorSpace=THREE.SRGBColorSpace;
          // Das Blatt ist gewoelbt (z = (y/6,65)^2 * 0,35). Eine flache Ebene
          // tauchte mit der unteren Haelfte ins Papier, der Haken war
          // abgeschnitten (gemeldet 04.10.2026) — also dieselbe Woelbung + 0,03.
          var aGeo=new THREE.PlaneGeometry(3.2,3.2,1,16), ap=aGeo.attributes.position;
          for(var k=0;k<ap.count;k++){ var yy=ap.getY(k)-3.6; ap.setZ(k,Math.pow(yy/6.65,2)*0.35+0.03); }
          var abdruck=new THREE.Mesh(aGeo, new THREE.MeshBasicMaterial({map:aTex, transparent:true, opacity:0, depthWrite:false, toneMapped:false, side:THREE.DoubleSide}));
          abdruck.position.set(2.3,-3.6,0); abdruck.renderOrder=2; blaetter[2].children[0].add(abdruck);
          // Stempel: gedrechselter Holzgriff, Metallring, Platte, Gummi
          var stempel=new THREE.Group();
          var profil=[[0,0],[0.62,0],[0.66,0.12],[0.5,0.42],[0.4,1.25],[0.44,1.75],[0.78,2.15],[1.0,2.62],[0.95,3.08],[0.66,3.38],[0.3,3.5],[0,3.52]].map(function(q){return new THREE.Vector2(q[0],q[1]);});
          var griff=new THREE.Mesh(new THREE.LatheGeometry(profil,64), M.holz); griff.position.y=0.95; stempel.add(griff);
          var ring=new THREE.Mesh(new THREE.CylinderGeometry(0.72,0.72,0.22,48), M.alu); ring.position.y=0.95; stempel.add(ring);
          var platte=new THREE.Mesh(rundQuader(3.4,0.55,2.2,0.18,3), M.rahmen); platte.position.y=0.55; stempel.add(platte);
          var gummi=new THREE.Mesh(rundQuader(3.2,0.2,2.0,0.06,2), M.gummi); gummi.position.y=0.18; stempel.add(gummi);
          g.add(stempel);
          g.scale.setScalar(0.8); g.position.y=3.6;
          return {gruppe:g, dazu:function(t){
            // Vor dem Stempeln legt sich der Stapel nach hinten wie auf einen Tisch:
            // stehen die Blaetter zur Kamera, zeigt der Stempel genau auf sie und ist
            // nur eine Kugel auf einem Kasten (so im ersten Entwurf gemessen).
            var lege=eIO(seg(t,0.26,0.42));
            g.rotation.set(mix(-0.15,-1.0,lege), mix(-0.35,0.35,t)*(1-lege*0.6)+mx*0.1, 0);
            g.position.y+=-4.2*lege; g.scale.setScalar(mix(0.8,0.92,lege));
            var f=eOut(seg(t,0.06,0.42));
            blaetter.forEach(function(h,k){
              h.position.set(-4.7+(k-1)*mix(0.1,3.6,f), -6.65, (k-1)*mix(0.04,0.9,f));
              h.rotation.set(0,0,(k-1)*mix(0.02,-0.2,f));
            });
            // Die Blaetter stehen zur Kamera, also kommt der Stempel von vorn: Achse
            // um +90 Grad um x gekippt (Gummi zeigt nach -z), etwas zum Betrachter
            // geneigt. Kontaktstelle = Lage des Abdrucks auf dem obersten Blatt,
            // aus Faecherung (x -1,1 / z 0,9 / Drehung -0,2) nachgerechnet.
            // Runter, kurz halten, wieder hoch und zur Seite — der Abdruck bleibt.
            var runter=eIO(seg(t,0.4,0.56)), hoch=eIO(seg(t,0.64,0.82));
            stempel.position.set(mix(mix(9,5.4,runter),8.6,hoch), mix(mix(2,-5.0,runter),-1.5,hoch), mix(mix(8,1.05,runter),5.5,hoch));
            stempel.rotation.set(Math.PI/2-mix(mix(0.7,0.12,runter),0.55,hoch), 0, mix(mix(-0.4,-0.2,runter),-0.45,hoch));
            abdruck.material.opacity=seg(t,0.55,0.6)*0.95;
          }};
        },
        // Umzug: Tablet mit der echten Import-Vorschau, Tabellenzeilen fliegen hinein
        tablet:function(ch){
          var g=new THREE.Group();
          g.add(new THREE.Mesh(platte(15.6,10.4,0.55,0.9,0.12), M.rahmen));
          var fr=new THREE.Mesh(flaeche(15.48,10.28,0.84), M.glas); fr.position.z=0.277; g.add(fr);
          var s=schirm(bild(ch.bild),14.6,9.125,0.5); s.position.z=0.295; g.add(s);
          var gl1=glas(14.6,9.125,0.5); gl1.position.z=0.31; g.add(gl1);
          // die alte Tabelle links: ein Gitter weisser Zellen, Kopfzeile gruen
          var tab=new THREE.Group(), zellen=[];
          for(var r=0;r<6;r++) for(var c=0;c<3;c++) zellen.push([c*1.25,-r*0.62,0,1]);
          var zm=new THREE.InstancedMesh(rundQuader(1.15,0.5,0.25,0.1,2),M.weiss,zellen.length), o=new THREE.Object3D();
          zellen.forEach(function(q,i){ o.position.set(q[0],q[1],q[2]); o.updateMatrix(); zm.setMatrixAt(i,o.matrix); });
          tab.add(zm);
          var kopf=new THREE.Mesh(rundQuader(3.65,0.5,0.3,0.1,2), M.gruen); kopf.position.set(1.25,0.65,0); tab.add(kopf);
          tab.position.set(-13.5,2.2,2); tab.rotation.y=0.45; g.add(tab);
          var zeilen=[];
          for(var z=0;z<5;z++){ var m=new THREE.Mesh(rundQuader(3.6,0.5,0.25,0.1,2), M.weiss); g.add(m); zeilen.push(m); }
          g.position.y=1.6;
          return {gruppe:g, dazu:function(t,T){
            g.rotation.set(0.08, mix(-0.4,0.25,t)+mx*0.1, 0);
            zeilen.forEach(function(m,k){
              var u=seg(t,0.15+k*0.08,0.4+k*0.08), b=Math.sin(u*Math.PI);
              m.visible=u>0&&u<1;
              m.position.set(mix(-11.5,-2+k*0.4,eIO(u)), mix(1.2-k*0.62,2.5-k*1.2,u)+b*3, mix(2.4,1.2,u)+b*2.5);
              m.rotation.set(b*0.6,b*0.8,0);
            });
          }};
        },
        // Unterwegs: das App-Icon als Objekt — "installierbar wie eine App"
        icon:function(ch){
          var g=new THREE.Group();
          var kachel=new THREE.Mesh(platte(8,8,1.4,1.9,0.3), M.glas); g.add(kachel);
          var s=schirm(bild(ch.bild),7.7,7.7,1.75); s.position.z=0.71; g.add(s);
          var gl1=glas(7.7,7.7,1.75); gl1.position.z=0.72; g.add(gl1);
          // drei kleine Wuerfel kreisen darum: offline, Handy, Rechner — ohne Worte
          var satelliten=[M.weiss,M.akzent,M.weiss].map(function(mat){ var m=new THREE.Mesh(wuerfelGeo,mat); m.scale.setScalar(1.1); g.add(m); return m; });
          g.position.y=1.5;
          return {gruppe:g, dazu:function(t,T){
            var dreh=REDUCE?0:(1-eOut(seg(t,0.02,0.38)))*Math.PI*2;
            g.rotation.set(0.12+my*0.05, mix(-0.35,0.35,t)+mx*0.12-dreh, 0);
            satelliten.forEach(function(m,k){
              var a=T*0.6+k*2.1;
              m.position.set(Math.cos(a)*7.2, Math.sin(a*1.3)*2.5, Math.sin(a)*3);
              m.rotation.set(T*0.7+k,T*0.5,0);
            });
          }};
        },
        // Sicherheit: Vorhaengeschloss auf gestapelten Sicherungen, der Buegel rastet ein
        schloss:function(){
          var g=new THREE.Group();
          for(var k=0;k<3;k++){ var p=new THREE.Mesh(rundQuader(9,0.55,6.4,0.25,3), k===2?M.weiss:M.weiss); p.position.set(-k*0.9+0.9,-4.6+k*0.8,-k*0.9+0.9); g.add(p); }
          var koerper=new THREE.Mesh(rundQuader(6,4.8,2.2,0.7,5), M.akzent); koerper.position.y=-1.2; g.add(koerper);
          var buegel=new THREE.Group();
          var bogen=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.42,24,64,Math.PI), M.alu); bogen.position.y=2.2; buegel.add(bogen);
          [-1.8,1.8].forEach(function(x){ var b=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,2.2,32), M.alu); b.position.set(x,1.1,0); buegel.add(b); });
          buegel.position.y=0.4; g.add(buegel);
          var loch=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.1,32), M.schwarz); loch.rotation.x=Math.PI/2; loch.position.set(0,-0.8,1.12); g.add(loch);
          var schlitz=new THREE.Mesh(new THREE.BoxGeometry(0.28,1.0,0.1), M.schwarz); schlitz.position.set(0,-1.35,1.12); g.add(schlitz);
          g.position.y=1.6;
          return {gruppe:g, dazu:function(t){
            g.rotation.set(0.1+my*0.05, mix(-0.5,0.5,t)+mx*0.12, 0);
            var zu=eIO(seg(t,0.2,0.42));
            buegel.position.y=mix(2.0,0.4,zu);
            buegel.rotation.y=mix(Math.PI*0.6,0,eIO(seg(t,0.08,0.24)));
          }};
        },
        // Ausbilder: Monitor mit dem echten Cockpit, ein Freigabe-Haken springt heraus
        monitor:function(ch){
          var g=new THREE.Group();
          g.add(new THREE.Mesh(platte(17,10.8,0.55,0.45,0.12), M.alu));
          var fm=new THREE.Mesh(flaeche(16.9,10.7,0.4), M.glas); fm.position.z=0.277; g.add(fm);
          var s=schirm(bild(ch.bild),16.2,10.125,0.12); s.position.z=0.3; g.add(s);
          // Fuss aus EINEM Stueck wie beim Studio Display: schraeges Blech von
          // der Rueckseite nach hinten unten auf einen flachen Teller.
          // Vorher Klotz + Platte ohne Verbindung (gemeldet 04.10.2026).
          var arm=new THREE.Mesh(platte(4.6,8.4,0.34,0.3,0.1), M.alu);
          arm.position.set(0,-4.75,-2.0); arm.rotation.x=0.33; g.add(arm);
          var teller=new THREE.Mesh(platte(4.6,5.2,0.3,0.3,0.1).rotateX(-Math.PI/2), M.alu);
          teller.position.set(0,-8.9,-0.9); g.add(teller);
          var gelenk=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.34,4.2,32), M.rahmen);
          gelenk.rotation.z=Math.PI/2; gelenk.position.set(0,-0.95,-0.62); g.add(gelenk);
          // Freigabe-Abzeichen: Scheibe mit einem Haken als EIN Rohr (zwei
          // Quader stiessen sichtbar mit Kante aneinander)
          var abzeichen=new THREE.Group();
          var scheibe=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,0.5,64), M.gruen); scheibe.rotation.x=Math.PI/2; abzeichen.add(scheibe);
          var hakenPfad=new THREE.CurvePath();
          hakenPfad.add(new THREE.LineCurve3(new THREE.Vector3(-0.78,0.05,0.34), new THREE.Vector3(-0.2,-0.55,0.34)));
          hakenPfad.add(new THREE.LineCurve3(new THREE.Vector3(-0.2,-0.55,0.34), new THREE.Vector3(0.82,0.62,0.34)));
          abzeichen.add(new THREE.Mesh(new THREE.TubeGeometry(hakenPfad,48,0.2,16,false), M.weiss));
          [[-0.78,0.05],[-0.2,-0.55],[0.82,0.62]].forEach(function(q){ var k=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12), M.weiss); k.position.set(q[0],q[1],0.34); abzeichen.add(k); });
          abzeichen.position.set(7.6,4.6,1.6); g.add(abzeichen);
          g.scale.setScalar(0.78); g.position.y=3.6;
          return {gruppe:g, dazu:function(t,T){
            g.rotation.set(0.05+my*0.04, mix(-0.4,0.4,t)+mx*0.1, 0);
            var pop=seg(t,0.3,0.5), w=pop<1?eOut(pop)*(1+Math.sin(pop*Math.PI)*0.25):1;
            abzeichen.scale.setScalar(Math.max(0.001,w));
            abzeichen.rotation.y=REDUCE?0:Math.sin(T*1.2)*0.25;
          }};
        }
      };

      // Weicher Schatten oben auf dem Sockel: ohne ihn schwebt jedes Objekt
      // beziehungslos ueber seinen Wuerfeln (gemeldet 04.10.2026, "naja").
      var schattenGeo=(function(){
        var c=document.createElement('canvas'); c.width=c.height=128; var x=c.getContext('2d');
        var gr=x.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(40,30,80,0.55)'); gr.addColorStop(0.55,'rgba(40,30,80,0.18)'); gr.addColorStop(1,'rgba(40,30,80,0)');
        x.fillStyle=gr; x.fillRect(0,0,128,128);
        var t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
        schattenMat=new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false, toneMapped:false});
        return new THREE.PlaneGeometry(4.6,4.6).rotateX(-Math.PI/2);
      })(), schattenMat;
      var ABST=40, stationen=[];
      chapters.forEach(function(ch,i){
        var y=-(i+1)*ABST;
        var st=(BAU[ch.station]||BAU.icon)(ch);
        st.y=y;
        var s=sockel(); s.position.set(0,y-6.4,0); scene.add(s);
        var sch=new THREE.Mesh(schattenGeo,schattenMat); sch.position.set(0,y-6.4+1.43,0); scene.add(sch);
        st.basisY=st.gruppe.position.y+y-1;
        st.gruppe.position.y=st.basisY;
        scene.add(st.gruppe); stationen.push(st);
        [[-15,6],[17,-4],[-12,-8]].forEach(function(q,k){ traube(q[0],y+q[1],-6-k*3,200+i*40+k*7); });
      });
      var Y_ENDE=-(N+1)*ABST;
      // Abschluss: eine dichte Wolke Wuerfeltrauben um "Bereit?"
      [[-16,6,-4],[-11,-7,-1],[14,7,-6],[18,-4,-3],[-21,0,-10],[9,12,-12],[22,1,-14],[-9,-12,-8],[0,13,-14],[4,-11,-5]].forEach(function(q,i){ traube(q[0],Y_ENDE+q[1],q[2],5000+i*53); });

      function groesse(){
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, SCHMAL?1.6:2));
        renderer.setSize(W,H,false);
        cam.aspect=W/H; cam.updateProjectionMatrix();
      }

      var blick=new THREE.Vector3();
      function zeichnen(T){
        /* — Kamera: haelt an jeder Station, faehrt dazwischen — */
        var stopps=[[0,Y_HERO+1],[B.hero[1]-0.03,Y_HERO+1]];
        chapters.forEach(function(ch,i){ var w=ch.e-ch.s; stopps.push([ch.s+w*0.28, stationen[i].y],[ch.e-w*0.22, stationen[i].y]); });
        stopps.push([B.ende[0]+(B.ende[1]-B.ende[0])*0.35, Y_ENDE]);
        var y=stopps[stopps.length-1][1];
        for(var i=0;i<stopps.length-1;i++){
          if(ps<=stopps[i+1][0]){ var a=stopps[i], b=stopps[i+1]; y=mix(a[1],b[1],sm(seg(ps,a[0],b[0]))); break; }
        }
        var tief=SCHMAL?(W<H?1.9:1.25):1;
        // Breit ruecken die Objekte etwas nach links, weg vom Kapiteltext rechts unten
        var amRand=SCHMAL?0:seg(ps,B.hero[1]-0.03,B.hero[1])*(1-seg(ps,B.ende[0],B.ende[0]+0.03));
        var cx=(REDUCE?0:mx*1.8)+amRand*3.2, cy=y+(REDUCE?0:-my*1.2);
        cam.position.set(cx,cy,36*tief);
        blick.set(amRand*3.2+(cx-amRand*3.2)*0.3,y,0);
        cam.lookAt(blick);
        cam.rotation.z=REDUCE?0:clamp(-vel*0.6,-0.04,0.04);

        /* — Hero — */
        uhr.position.set(SCHMAL?3:8.5, Y_HERO+(SCHMAL?3.2:3.4)+(REDUCE?0:Math.sin(T*0.9)*0.35), 1);
        uhr.scale.setScalar(SCHMAL?0.9:0.74);
        uhr.rotation.y=-0.45+mx*0.25+(REDUCE?0:Math.sin(T*0.5)*0.08);
        uhr.rotation.x=0.12+my*0.15;
        uhr.userData.zeiger.rotation.z=REDUCE?0:-T*1.2;
        uhr.userData.kurz.rotation.z=REDUCE?0:-T*0.1;
        if(!REDUCE) trauben.forEach(function(g){ var u=g.userData; g.rotation.x+=u.rx*0.01; g.rotation.y+=u.ry*0.01; g.position.y=u.y0+Math.sin(T*0.7+u.ph)*0.4; });

        /* — Stationen — nur die nahen rechnen, Filme nur dort abspielen — */
        stationen.forEach(function(st,i){
          var ch=chapters[i], nah=Math.abs(cam.position.y-st.y)<ABST*0.9;
          st.gruppe.visible=nah;
          if(nah){
            var t=seg(ps,ch.s-0.02,ch.e+0.02);
            st.gruppe.position.y=st.basisY+(REDUCE?0:Math.sin(T*0.8+i)*0.3);
            st.dazu(t,T);
            if(!REDUCE) st.gruppe.rotation.x+=clamp(vel*4,-0.15,0.15);
          }
          if(st.film){ var spielen=nah&&!REDUCE; if(spielen&&st.film.paused) st.film.play().catch(function(){}); else if(!spielen&&!st.film.paused) st.film.pause(); }
        });

        renderer.render(scene,cam);
      }

      return {groesse:groesse, zeichnen:zeichnen, filme:filme};
    }

    /* ═══ SCHLEIFE ═══ */
    var rafId=null, laeuft=true, t0=0, last=0, rest=0;
    function tick(now){
      rafId=null;
      if(!laeuft) return;
      if(!t0) t0=now;
      rest+=Math.min(100, last?now-last:16); last=now;
      for(var n=0; rest>=16 && n<6; n++){ rest-=16; schritt(); }
      dom();
      if(G) G.zeichnen((now-t0)/1000);
      rafId=requestAnimationFrame(tick);
    }
    function wecken(){ if(!rafId && laeuft) rafId=requestAnimationFrame(tick); }

    window.addEventListener('resize',messen,{passive:true});
    document.addEventListener('visibilitychange',function(){ if(!document.hidden){ last=0; wecken(); } });
    messen(); schritt(); wecken();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(messen);

    /* — Lader: drei Striche, bis Three.js da ist (hoechstens 4 s), dann
       steigt der Titel auf. Ohne WebGL / bei Fehler geht es ohne Szene weiter. — */
    function fertig(){
      if(intro.classList.contains('vi-bereit')) return;
      intro.classList.add('vi-bereit');
      setTimeout(tippen,700);
    }
    setTimeout(fertig,4000);
    var probe=document.createElement('canvas');
    var kannGL=!!(probe.getContext('webgl2')||probe.getContext('webgl'));
    if(kannGL){
      import('/Assets/js/vendor/three-0.186.1/three.module.js'+Q).then(function(THREE){
        if(!laeuft) return;
        G=szeneBauen(THREE);
        if(G){ intro.classList.add('vi-gl-an'); messen(); }
        fertig();
      }).catch(function(e){ console.warn('[intro] Three.js nicht geladen:', e); fertig(); });
    } else fertig();

    function springeZu(p){
      messen();
      intro.scrollTo({top:p*scrollMax, behavior:REDUCE?'auto':'smooth'});
    }
    // Rundgang aus dem Hero: erste Station, Objekt steht schon.
    window.viTour=function(){ springeZu(mix(chapters[0].s,chapters[0].e,0.4)); };

    /* — Ausgang — */
    window.finishIntro=function(){
      localStorage.setItem('pro_intro_seen','true');
      intro.style.animation=REDUCE?'viFade .3s ease reverse forwards':'viExit .55s cubic-bezier(.32,.72,0,1) forwards';
      setTimeout(function(){
        laeuft=false;
        if(G) G.filme.forEach(function(v){ v.pause(); v.removeAttribute('src'); v.load(); });
        intro.style.display='none';
        document.body.style.overflow='';
      },REDUCE?300:520);
    };

    document.addEventListener('keydown',function(e){
      if(intro.style.display==='none') return;
      if(e.key==='Escape') finishIntro();
    });
  })();
