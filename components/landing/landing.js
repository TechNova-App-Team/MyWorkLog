// ═══ LANDING / INTRO MODULE ═══
// Rundgang fuer Erstbesucher (seit v8.1.3): eine Kamerafahrt von Tag in Nacht.
// Gebaut nach der Machart von noomoagency.com (Pastell-Himmel, Riesentypo HINTER
// den Objekten, 3D-Objekte auf Wuerfelsockeln, Scroll faehrt die Kamera einen
// Turm hinab) und jesperlandberg.com (schwarzer Raum, Gitterboden, gebogenes
// Karussell aus Bildern, das sich mit der Scroll-Geschwindigkeit biegt).
// Die Objekte zeigen ECHTE Aufnahmen der App: ein Handy mit Film vom
// Dashboard, ein Laptop mit Film vom PDF-Dialog, ein Stapel echter Blaetter,
// im Karussell Screenshots (alles aus tools/intro-aufnahmen.mjs bzw. den
// Aufnahme-Skripten der Unterseiten). Notizen + Fallen: .claude/notes/intro-video.md.
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
    var end=$('viEnd'), rail=$('viRail'), hint=$('viHint'), night=$('viNight');
    var bigWrap=$('viBig'), corner=$('viCorner'), cv=$('viGl'), loader=$('viLoad');
    var chEls=intro.querySelectorAll('.vi-ch');

    function clamp(v,a,b){return v<a?a:v>b?b:v;}
    function seg(p,a,b){return clamp((p-a)/(b-a),0,1);}
    function eOut(x){return 1-Math.pow(1-x,3);}
    function eIO(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}
    function sm(x){return x*x*(3-2*x);}
    function mix(a,b,t){return a+(b-a)*t;}

    /* ═══ ZEITACHSE ═══
       Abschnitte mit Gewicht (≈ Bildschirmhoehen Scrollweg): Hero, drei
       Tag-Stationen (je ein Objekt), Daemmerung (Abstieg in die Nacht), vier
       Karten im Karussell, Abschluss. Alles Weitere rechnet mit diesen Grenzen. */
    var N=chEls.length;
    var chapters=[];
    for(var i=0;i<N;i++) chapters.push({el:chEls[i], station:chEls[i].dataset.station, bild:chEls[i].dataset.src||''});
    var TAG=chapters.filter(function(c){return c.station!=='karte';}).length;   // 3
    var KARTEN=N-TAG;                                                          // 4
    var GEW={hero:1.3, tag:1.9, daemmerung:0.8, karte:1.15, ende:1.4};
    var SUMME=GEW.hero+TAG*GEW.tag+GEW.daemmerung+KARTEN*GEW.karte+GEW.ende;
    var P=0, B={};
    function ab(name,g){ B[name]=[P/SUMME,(P+g)/SUMME]; P+=g; }
    ab('hero',GEW.hero);
    for(i=0;i<TAG;i++){ ab('tag'+i,GEW.tag); chapters[i].s=B['tag'+i][0]; chapters[i].e=B['tag'+i][1]; }
    ab('daemmerung',GEW.daemmerung);
    ab('galerie',KARTEN*GEW.karte);
    for(i=0;i<KARTEN;i++){ var g0=B.galerie[0], gl0=(B.galerie[1]-g0)/KARTEN; chapters[TAG+i].s=g0+i*gl0; chapters[TAG+i].e=g0+(i+1)*gl0; }
    ab('ende',GEW.ende);
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

    /* — Riesenworte (nur Tag-Stationen) + Kapitel-Leiste aus den Eyebrows,
       auf /en/ also schon uebersetzt — */
    chapters.forEach(function(ch,idx){
      var eb=ch.el.querySelector('.vi-eyebrow'); if(!eb) return;
      ch.name=eb.textContent.trim();
      eb.setAttribute('data-n', String(idx+1));
      if(idx<TAG){
        var w=document.createElement('span'); w.className='vi-big-w'; w.textContent=ch.name;
        bigWrap.appendChild(w); ch.big=w;
      }
      var b=document.createElement('button');
      b.type='button'; b.className='vi-rail-btn'; b.setAttribute('aria-label',ch.name);
      var t=document.createElement('span'); t.textContent=ch.name;
      var bar=document.createElement('span'); bar.className='vi-rail-bar';
      var fill=document.createElement('span'); fill.className='vi-rail-fill';
      bar.appendChild(fill); b.appendChild(t); b.appendChild(bar);
      b.addEventListener('click',function(){ springeZu((ch.s+ch.e)/2); });
      rail.appendChild(b);
      ch.btn=b; ch.fill=fill;
    });

    /* — Masse — */
    var W,H,SCHMAL,scrollMax=1;
    function messen(){
      W=intro.clientWidth; H=intro.clientHeight; SCHMAL=W<=900;
      scrollMax=Math.max(1,intro.querySelector('.vi-scroll').offsetHeight-H);
      chapters.forEach(function(ch){ if(ch.big) ch.bigW=ch.big.offsetWidth; });
      lines.forEach(function(l){ l._w=l.offsetWidth; });
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
    var nachtWert=0;
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

      // Nacht: mit der Daemmerung auf, ab dann helle Schrift
      // Die Nacht muss VOR dem Gitterboden da sein: ein Gitter ueber Pastell
      // sah aus wie ein Fehler (gemessen in der Mitte der Daemmerung).
      var nacht=sm(seg(ps,B.daemmerung[0],mix(B.daemmerung[0],B.daemmerung[1],0.55)));
      night.style.opacity=nacht.toFixed(3);
      var dunkel=nacht>0.5;
      if(dunkel!==(nachtWert>0.5)) intro.classList.toggle('vi-dunkel',dunkel);
      nachtWert=nacht;

      var amEnde=ps>=B.ende[0];
      var ci=-1, t=0;
      for(var n=0;n<N;n++){
        var C=chapters[n];
        if(ps>=C.s && ps<C.e){ ci=n; t=(ps-C.s)/(C.e-C.s); }
      }
      for(n=0;n<N;n++){
        C=chapters[n];
        var tn=seg(ps,C.s,C.e);
        var on=(n===ci && (n<TAG ? (t>0.22 && t<0.9) : (t>0.15 && t<0.88)));
        C.el.classList.toggle('on',on);
        C.el.classList.toggle('up',!on && ps>=(C.s+C.e)/2);
        C.fill.style.setProperty('--f', tn.toFixed(3));
        C.btn.classList.toggle('on', n===ci);
        C.btn.classList.toggle('done', ps>=C.e);
        if(C.big){
          var op=(n===ci)?Math.min(eOut(seg(tn,0.06,0.3)),1-seg(tn,0.82,0.98)):0;
          C.big.style.opacity=op.toFixed(3);
          if(op>0){
            var x0=W*0.08, x1=W*0.92-C.bigW;
            if(x1>x0){ var m=(W-C.bigW)/2; x0=m+W*0.08; x1=m-W*0.08; }
            C.big.style.transform='translate3d('+mix(x0,x1,tn).toFixed(1)+'px,-50%,0) skewX('+clamp(-vel*30,-10,10).toFixed(2)+'deg)';
          }
        }
      }
      var imRundgang=ps>=B.hero[1]-0.004 && !amEnde;
      rail.classList.toggle('on', imRundgang);
      corner.classList.toggle('on', imRundgang);
      if(ci>=0) cNum.textContent=(ci+1<10?'0':'')+(ci+1)+' / '+(N<10?'0':'')+N+'   '+chapters[ci].name;
      hint.classList.toggle('on', lies()<0.006);
      end.classList.toggle('on', ps>=mix(B.ende[0],B.ende[1],0.3));
      return {ci:ci, t:t};
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

      var scene=new THREE.Scene();
      var cam=new THREE.PerspectiveCamera(34,1,0.5,420);

      // Umgebung fuer die Spiegelungen: ein Raum aus Leuchtflaechen, einmal
      // vorgerechnet (statt RoomEnvironment aus den Addons, das 'three' als
      // nackten Modulnamen importiert und ohne Import-Map nicht laedt).
      (function(){
        var raum=new THREE.Scene();
        var wand=new THREE.Mesh(new THREE.BoxGeometry(40,24,40), new THREE.MeshBasicMaterial({color:0x6b6880, side:THREE.BackSide}));
        raum.add(wand);
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
      var hemi=new THREE.HemisphereLight(0xffffff,0xb9b4dc,0.7); scene.add(hemi);
      var sonne=new THREE.DirectionalLight(0xffffff,1.6); sonne.position.set(-8,14,12); scene.add(sonne);

      var prim=new THREE.Color(0xa855f7);
      (function(){
        var rgb=getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').split(',').map(parseFloat);
        if(rgb.length===3 && !rgb.some(isNaN)) prim.setRGB(rgb[0]/255,rgb[1]/255,rgb[2]/255,THREE.SRGBColorSpace);
      })();
      var M={
        weiss:new THREE.MeshPhysicalMaterial({color:0xf3f2f8, roughness:0.5, clearcoat:0.35, clearcoatRoughness:0.4}),
        prim:new THREE.MeshPhysicalMaterial({color:prim, roughness:0.22, clearcoat:1, clearcoatRoughness:0.08, metalness:0.05}),
        graphit:new THREE.MeshPhysicalMaterial({color:0x22212b, roughness:0.32, metalness:0.55, clearcoat:0.6}),
        alu:new THREE.MeshPhysicalMaterial({color:0xd9d9e2, roughness:0.28, metalness:0.85}),
        schwarz:new THREE.MeshStandardMaterial({color:0x0b0b10, roughness:0.4})
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

      // Wuerfelgruppe als ein InstancedMesh: Liste [x,y,z,groesse]
      function wuerfel(liste,mat){
        var im=new THREE.InstancedMesh(wuerfelGeo,mat||M.weiss,liste.length), o=new THREE.Object3D();
        liste.forEach(function(q,i){ o.position.set(q[0],q[1],q[2]); o.rotation.set(0,0,0); o.scale.setScalar(q[3]||0.96); o.updateMatrix(); im.setMatrixAt(i,o.matrix); });
        return im;
      }
      // Sockel wie bei noomo: ein Plus aus Wuerfeln, die Mitte eine Stufe hoeher
      function sockel(){
        var l=[];
        for(var x=-3;x<=3;x++) for(var z=-3;z<=3;z++){
          var rand=Math.abs(x)===3&&Math.abs(z)>1 || Math.abs(z)===3&&Math.abs(x)>1;
          if(rand) continue;
          l.push([x,0,z,0.98]);
          if(Math.abs(x)<=1&&Math.abs(z)<=1) l.push([x,1,z,0.98]);
        }
        var g=wuerfel(l); g.scale.setScalar(0.95); return g;
      }
      // Lose Wuerfeltrauben, die um die Stationen schweben (noomos Pixelwolken)
      var trauben=[];
      function traube(x,y,z,seed){
        var r=function(){ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; };
        var l=[[0,0,0]], n=3+Math.floor(r()*5);
        for(var i=1;i<n;i++){ var b=l[Math.floor(r()*l.length)], a=Math.floor(r()*6), d=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]][a]; l.push([b[0]+d[0],b[1]+d[1],b[2]+d[2]]); }
        var g=wuerfel(l.map(function(q){return [q[0],q[1],q[2],0.96];}), r()>0.86?M.prim:M.weiss);
        g.position.set(x,y,z); g.rotation.set(r()*6,r()*6,r()*6); g.scale.setScalar(0.7+r()*0.8);
        g.userData={rx:(r()-0.5)*0.4, ry:(r()-0.5)*0.4, y0:y, ph:r()*6};
        scene.add(g); trauben.push(g);
      }

      // Film als Textur: stumm, Schleife, spielt nur, wenn die Station nah ist
      var filme=[];
      function film(src){
        var v=document.createElement('video');
        v.src=src+Q; v.muted=true; v.loop=true; v.playsInline=true; v.setAttribute('playsinline',''); v.preload='auto'; v.crossOrigin='anonymous';
        var t=new THREE.VideoTexture(v); t.colorSpace=THREE.SRGBColorSpace;
        filme.push(v); return {video:v, tex:t};
      }
      var loader=new THREE.TextureLoader();
      function bild(src,cb){
        return loader.load(src+(src.indexOf('?')<0?Q:''), function(t){ t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); if(cb) cb(t); });
      }

      /* — Hero: Stoppuhr in der Akzentfarbe, um sie Wuerfeltrauben — */
      var Y_HERO=0;
      var uhr=new THREE.Group();
      (function(){
        var koerper=new THREE.Mesh(new THREE.CylinderGeometry(4,4,1.5,96,1), M.prim); koerper.rotation.x=Math.PI/2; uhr.add(koerper);
        var ring=new THREE.Mesh(new THREE.TorusGeometry(4,0.5,32,128), M.prim); uhr.add(ring);
        var blatt=new THREE.Mesh(new THREE.CircleGeometry(3.55,96), new THREE.MeshPhysicalMaterial({color:0xfbfaff, roughness:0.35, clearcoat:1})); blatt.position.z=0.77; uhr.add(blatt);
        for(var i=0;i<12;i++){
          var s=new THREE.Mesh(new THREE.BoxGeometry(i%3?0.12:0.22, i%3?0.42:0.7, 0.06), M.graphit);
          var a=i/12*Math.PI*2; s.position.set(Math.sin(a)*3.0,Math.cos(a)*3.0,0.81); s.rotation.z=-a; uhr.add(s);
        }
        var zeiger=new THREE.Group(); var zg=new THREE.Mesh(new THREE.BoxGeometry(0.16,3.1,0.08), M.prim); zg.position.y=1.2; zeiger.add(zg); zeiger.position.z=0.86; uhr.add(zeiger);
        var kurz=new THREE.Group(); var kg=new THREE.Mesh(new THREE.BoxGeometry(0.24,1.9,0.08), M.graphit); kg.position.y=0.75; kurz.add(kg); kurz.position.z=0.84; uhr.add(kurz);
        var nabe=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.2,32), M.graphit); nabe.rotation.x=Math.PI/2; nabe.position.z=0.9; uhr.add(nabe);
        var krone=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.9,32), M.prim); krone.position.y=4.85; uhr.add(krone);
        var knopf=new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.4,32), M.prim); knopf.position.y=5.4; uhr.add(knopf);
        var ohr=new THREE.Mesh(new THREE.TorusGeometry(0.5,0.16,16,48), M.prim); ohr.position.set(3.3,3.3,0); ohr.rotation.z=-Math.PI/4; uhr.add(ohr);
        uhr.userData={zeiger:zeiger, kurz:kurz};
      })();
      uhr.position.set(8.5,Y_HERO+3.4,1); uhr.scale.setScalar(0.74); scene.add(uhr);
      [[-15,7,-6],[-11,-6,-2],[15,8,-8],[17,-5,-4],[-4,10,-10],[3,-8,-6],[-19,1,-12],[11,11,-14],[22,2,-16],[-8,-10,-12]].forEach(function(q,i){ traube(q[0],Y_HERO+q[1],q[2],11+i*97); });

      /* — Tag-Stationen: je ein Objekt auf einem Sockel — */
      var STATION_ABST=40;
      var stationen=[];
      function station(i){ return {y:-(i+1)*STATION_ABST, gruppe:new THREE.Group()}; }

      // 1 Handy: Film vom Dashboard am Handy
      var stH=station(0), fH=film('/Grafiken/intro/handy.mp4');
      (function(){
        var g=stH.gruppe;
        var gehaeuse=new THREE.Mesh(rundQuader(7.6,15.8,0.9,1.15,6), M.graphit); g.add(gehaeuse);
        var rahmen=new THREE.Mesh(rundQuader(7.75,15.95,0.6,1.2,6), M.alu); g.add(rahmen);
        var schirm=new THREE.Mesh(new THREE.PlaneGeometry(7.0,15.15), new THREE.MeshBasicMaterial({map:fH.tex, toneMapped:false}));
        schirm.position.z=0.46; g.add(schirm);
        // Bildschirm mit runden Ecken: Maske als Alpha aus einer Leinwand
        var mc=document.createElement('canvas'); mc.width=140; mc.height=303; var cx=mc.getContext('2d');
        cx.fillStyle='#000'; cx.fillRect(0,0,140,303); cx.fillStyle='#fff'; cx.beginPath(); if(cx.roundRect) cx.roundRect(0,0,140,303,18); else cx.rect(0,0,140,303); cx.fill();
        schirm.material.alphaMap=new THREE.CanvasTexture(mc); schirm.material.transparent=true;
        var insel=new THREE.Mesh(rundQuader(2.2,0.55,0.05,0.27,3), M.schwarz); insel.position.set(0,7.0,0.48); g.add(insel);
        g.position.y=8.5;
      })();
      // 2 Laptop: Film vom PDF-Dialog, der Deckel klappt beim Scrollen auf
      var stL=station(1), fL=film('/Grafiken/intro/vorlagen.mp4');
      (function(){
        var g=stL.gruppe;
        var unten=new THREE.Mesh(rundQuader(17,0.6,11.2,0.3,4), M.alu); unten.position.set(0,0,0); g.add(unten);
        var tasten=new THREE.Mesh(new THREE.PlaneGeometry(14.6,5.2), new THREE.MeshStandardMaterial({color:0x2a2a33, roughness:0.7}));
        tasten.rotation.x=-Math.PI/2; tasten.position.set(0,0.31,-1.4); g.add(tasten);
        var pad=new THREE.Mesh(new THREE.PlaneGeometry(5.6,3.4), new THREE.MeshStandardMaterial({color:0xbfbfc9, roughness:0.35, metalness:0.5}));
        pad.rotation.x=-Math.PI/2; pad.position.set(0,0.31,3.3); g.add(pad);
        var scharnier=new THREE.Group(); scharnier.position.set(0,0.3,-5.5); g.add(scharnier);
        var deckel=new THREE.Mesh(rundQuader(17,11,0.4,0.3,4), M.alu); deckel.position.set(0,5.5,0); scharnier.add(deckel);
        var rand=new THREE.Mesh(new THREE.PlaneGeometry(16.4,10.4), M.schwarz); rand.position.set(0,5.5,0.21); scharnier.add(rand);
        var schirm=new THREE.Mesh(new THREE.PlaneGeometry(15.6,9.75), new THREE.MeshBasicMaterial({map:fL.tex, toneMapped:false}));
        schirm.position.set(0,5.55,0.22); scharnier.add(schirm);
        g.userData.scharnier=scharnier; g.position.y=2.2;
      })();
      // 3 Papier: drei echte Blaetter (IHK-Vordruck, Klassisch, Klar) faechern auf
      var stP=station(2);
      (function(){
        var g=stP.gruppe, blaetter=[];
        ['form','klassisch','klar'].forEach(function(n,i){
          var geo=new THREE.PlaneGeometry(9.4,13.3,1,24);
          var mat=new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.9, side:THREE.DoubleSide});
          bild('/Grafiken/intro/blatt-'+n+'.webp',function(t){ mat.map=t; mat.needsUpdate=true; });
          var m=new THREE.Mesh(geo,mat);
          // Blatt leicht gewoelbt, wie Papier, das liegt
          var p=geo.attributes.position; for(var k=0;k<p.count;k++){ var y=p.getY(k); p.setZ(k,Math.pow(y/6.65,2)*0.35); } geo.computeVertexNormals();
          var halter=new THREE.Group(); halter.add(m); m.position.set(4.7,6.65,0);
          g.add(halter); blaetter.push(halter);
        });
        // ein Stempel in der Akzentfarbe: "abgezeichnet"
        var stempel=new THREE.Group();
        var griff=new THREE.Mesh(new THREE.CylinderGeometry(0.9,1.2,2.6,48), M.prim); griff.position.y=1.8; stempel.add(griff);
        var kugel=new THREE.Mesh(new THREE.SphereGeometry(1.15,48,24), M.prim); kugel.position.y=3.5; stempel.add(kugel);
        var fuss=new THREE.Mesh(rundQuader(3.4,0.7,2.2,0.25,3), M.graphit); fuss.position.y=0.35; stempel.add(fuss);
        g.add(stempel);
        g.userData.blaetter=blaetter; g.userData.stempel=stempel; g.position.y=8.6;
      })();

      [stH,stL,stP].forEach(function(st,i){
        var s=sockel(); s.position.set(0,st.y-6.4,0); scene.add(s); st.sockel=s;
        // Groesse je Objekt: gemessen an 1288x952 — Laptop und Papier fuellten
        // sonst den halben Bildschirm und liefen unten aus dem Bild.
        st.gruppe.scale.setScalar([1,0.72,0.8][i]);
        st.gruppe.position.y+=st.y-6; st.basisY=st.gruppe.position.y;
        scene.add(st.gruppe); stationen.push(st);
        [[-15,6],[14,-3],[-12,-8],[17,9]].forEach(function(q,k){ traube(q[0],st.y+q[1],-6-k*3,200+i*40+k*7); });
      });

      // Beim Abstieg in die Nacht ziehen Wuerfeltrauben dicht an der Kamera
      // vorbei — ohne sie war die Daemmerung eine leere graue Flaeche.
      [[-9,-138,22],[11,-146,16],[-14,-156,10],[8,-163,26],[-6,-171,6],[15,-178,12],[-12,-186,18],[6,-193,4],[-17,-198,-6],[13,-202,-10]].forEach(function(q,i){ traube(q[0],q[1],q[2],900+i*31); });

      /* — Nacht: Karussell (Jesper) — gebogene Karten auf einem Ring um die
         Kamera, Gitterboden, schwarzer Nebel. — */
      var Y_NACHT=-210, RING=34, KARTE_B=15, KARTE_H=9.4, SCHRITT=0.56;
      var nacht=new THREE.Group(); nacht.position.y=Y_NACHT; scene.add(nacht);
      var gitter=new THREE.GridHelper(420,84,0x3a3a46,0x24242e); gitter.position.y=-8.5;
      gitter.material.transparent=true; gitter.material.opacity=0.9; gitter.material.fog=true;
      nacht.add(gitter);
      scene.fog=new THREE.Fog(0x050507,1e5,1e5+1);   // aus, bis die Nacht kommt
      var kartenRing=new THREE.Group(); nacht.add(kartenRing);
      var kartenShader={
        uniforms:{uVel:{value:0}},
        vertexShader:'uniform float uVel; varying vec2 vUv; varying float vSh;\n'+
          'void main(){ vUv=uv; vec3 p=position;\n'+
          // auf den Ring gebogen (Karte liegt auf der Innenseite), dazu die
          // Durchbiegung mit der Geschwindigkeit wie bei Jesper
          '  float a=p.x/'+RING.toFixed(1)+'; float arc=sin(uv.x*3.14159);\n'+
          '  vec3 q=vec3(sin(a)*'+RING.toFixed(1)+', p.y+uVel*arc*2.2, -cos(a)*'+RING.toFixed(1)+');\n'+
          '  q.z+=abs(uVel)*arc*1.6; vSh=arc*abs(uVel);\n'+
          '  gl_Position=projectionMatrix*modelViewMatrix*vec4(q,1.0); }',
        fragmentShader:'uniform sampler2D map; uniform float uOp; varying vec2 vUv; varying float vSh;\n'+
          'float box(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }\n'+
          'void main(){ vec2 s=vec2('+(KARTE_B*40).toFixed(1)+','+(KARTE_H*40).toFixed(1)+');\n'+
          '  float d=box((vUv-0.5)*s, s*0.5, 22.0); if(d>0.0) discard;\n'+
          '  vec3 c=texture2D(map,vUv).rgb; c*=1.0-0.25*vSh;\n'+
          // feine helle Kante: die App ist dunkel, ohne Rand verschwand die Karte im Schwarz
          '  c=mix(c,vec3(1.0),0.28*smoothstep(-3.0,-1.0,d));\n'+
          '  float a=uOp*(1.0-smoothstep(-1.5,0.0,d));\n'+
          '  gl_FragColor=vec4(c,1.0)*a; }'
      };
      // Karten: die vier Kapitelbilder, dazwischen weitere echte Aufnahmen
      var extra=['/Grafiken/about/berichtsheft.webp','/Grafiken/ihk/import-wochen.webp','/Grafiken/ausbilder/woche.webp','/Grafiken/wechseln/einfuegen.webp','/Grafiken/wechseln/spalten.webp'];
      var karten=[], kapitelKarte={};
      for(var ki=0;ki<9;ki++){
        var ist=ki%2===1, kap=ist?TAG+(ki-1)/2:-1;
        var src=ist?chapters[kap].bild:extra[(ki/2)|0];
        var titel=ist?chapters[kap].name:'';
        var mat=new THREE.ShaderMaterial({uniforms:{map:{value:null}, uVel:kartenShader.uniforms.uVel, uOp:{value:1}}, vertexShader:kartenShader.vertexShader, fragmentShader:kartenShader.fragmentShader, transparent:true, side:THREE.DoubleSide, depthWrite:false});
        (function(mat,src,titel){
          var im=new Image(); im.decoding='async';
          im.onload=function(){
            // auf 1440 px herunter (neun 2880er-Texturen waeren ~180 MB) und
            // die Beschriftung unten links ins Bild, wie bei Jesper
            var c=document.createElement('canvas'); c.width=1440; c.height=900; var x=c.getContext('2d');
            x.drawImage(im,0,0,1440,900);
            if(titel){
              var gr=x.createLinearGradient(0,640,0,900); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,.72)'); x.fillStyle=gr; x.fillRect(0,600,1440,300);
              x.fillStyle='#fff'; x.font='600 54px Geist, system-ui, sans-serif'; x.fillText(titel,64,836);
              x.beginPath(); x.arc(1350,818,34,0,Math.PI*2); x.fillStyle='rgba(255,255,255,.95)'; x.fill();
              x.strokeStyle='#111'; x.lineWidth=5; x.beginPath(); x.moveTo(1336,818); x.lineTo(1366,818); x.moveTo(1354,805); x.lineTo(1367,818); x.lineTo(1354,831); x.stroke();
            }
            var t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
            mat.uniforms.map.value=t;
          };
          im.src=src+(src.indexOf('?')<0?Q:'');
        })(mat,src,titel);
        var kg=new THREE.PlaneGeometry(KARTE_B,KARTE_H,48,1);
        var karte=new THREE.Mesh(kg,mat); karte.frustumCulled=false;
        var halter=new THREE.Group(); halter.add(karte); halter.rotation.y=-ki*SCHRITT;
        kartenRing.add(halter); karten.push({halter:halter, mat:mat});
        if(ist) kapitelKarte[kap]=ki;
      }

      function groesse(){
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, SCHMAL?1.6:2));
        renderer.setSize(W,H,false);
        cam.aspect=W/H; cam.updateProjectionMatrix();
      }

      var blick=new THREE.Vector3();
      function zeichnen(T,lage){
        /* — Kamera: haelt an jeder Station, faehrt dazwischen; in der
           Daemmerung hinab in den Ring. — */
        var stopps=[[0,Y_HERO+1],[B.hero[1]-0.03,Y_HERO+1]];
        stationen.forEach(function(st,i){ var b=B['tag'+i], w=b[1]-b[0]; stopps.push([b[0]+w*0.28, st.y], [b[1]-w*0.22, st.y]); });
        var y=stopps[stopps.length-1][1];
        for(var i=0;i<stopps.length-1;i++){
          if(ps<=stopps[i+1][0]){ var a=stopps[i], b=stopps[i+1]; y=mix(a[1],b[1],sm(seg(ps,a[0],b[0]))); break; }
        }
        var tief=SCHMAL?(W<H?1.9:1.25):1;
        var abst=36*tief, cx=0, cy=y, cz=abst, ly=y;
        // Daemmerung: von der letzten Station hinab in den Ring
        var d=sm(seg(ps,B.daemmerung[0],B.galerie[0]+0.012));
        if(d>0){
          cy=mix(stationen[stationen.length-1].y, Y_NACHT+1.5, d);
          cz=mix(abst, 0, d);
          ly=mix(cy, Y_NACHT+0.8, d);
        }
        if(!REDUCE){ cx+=mx*1.8*(1-d*0.6); cy+=-my*1.2; }
        cam.position.set(cx,cy,cz);
        blick.set(cx*0.3, ly, d>0?mix(0,-20,d):0);
        cam.lookAt(blick);
        cam.rotation.z=REDUCE?0:clamp(-vel*0.6,-0.04,0.04);
        cam.fov=mix(34, SCHMAL?(W<H?70:52):46, d); cam.updateProjectionMatrix();

        // Nebel erst in der Nacht (Tagmaterialien wuerden sonst ins Schwarz blassen)
        scene.fog.near=mix(1e5,24,d); scene.fog.far=mix(1e5+1,95,d);
        gitter.material.opacity=0.9*seg(ps,mix(B.daemmerung[0],B.daemmerung[1],0.5),B.galerie[0]);
        hemi.intensity=mix(0.7,0.15,d);

        /* — Hero — */
        uhr.rotation.y=-0.45+mx*0.25+Math.sin(T*0.5)*0.08;
        uhr.rotation.x=0.12+my*0.15;
        // Schmal steht die Uhr zwischen Zeilen und Fuss, breit rechts neben den Zeilen
        uhr.position.set(SCHMAL?3:8.5, Y_HERO+(SCHMAL?3.2:3.4)+Math.sin(T*0.9)*0.35, 1);
        uhr.scale.setScalar(SCHMAL?0.9:0.74);
        uhr.userData.zeiger.rotation.z=-T*1.2;
        uhr.userData.kurz.rotation.z=-T*0.1;
        trauben.forEach(function(g){ var u=g.userData; if(REDUCE) return; g.rotation.x+=u.rx*0.01; g.rotation.y+=u.ry*0.01; g.position.y=u.y0+Math.sin(T*0.7+u.ph)*0.4; });

        /* — Stationen: Lage in der Station (0…1) treibt Drehung und Mechanik — */
        stationen.forEach(function(st,i){
          var b=B['tag'+i], t=seg(ps,b[0]-0.03,b[1]+0.02);
          var g=st.gruppe, schwebe=REDUCE?0:Math.sin(T*0.8+i)*0.3;
          g.position.y=st.basisY+schwebe;
          var dreh=mix(-0.6,0.6,t)+(REDUCE?0:mx*0.15);
          if(i===0){ g.rotation.set(0.05,dreh,mix(-0.12,0.06,t)); }
          // Laptop: zu = Deckel flach auf der Tastatur (+90 Grad), offen leicht nach hinten
          if(i===1){ g.rotation.set(0.32+my*0.05,dreh*0.7,0); g.userData.scharnier.rotation.x=mix(Math.PI*0.5, -0.18, eOut(seg(t,0.08,0.42))); }
          if(i===2){
            g.rotation.set(-0.15,dreh*0.6,0);
            var f=eOut(seg(t,0.1,0.5));
            g.userData.blaetter.forEach(function(h,k){
              h.position.set(-4.7+(k-1)*mix(0.1,3.6,f), -6.65, (k-1)*mix(0.04,0.9,f));
              h.rotation.set(0,0,(k-1)*mix(0.02,-0.2,f));
            });
            var s=g.userData.stempel, auf=eOut(seg(t,0.45,0.7));
            s.position.set(mix(10,5.2,auf), mix(9,-5.6,auf), mix(4,1.6,auf)); s.rotation.set(0,0.4,mix(-0.6,-0.15,auf));
          }
          // Film nur abspielen, wenn die Station zu sehen ist
          var v=i===0?fH.video:i===1?fL.video:null;
          if(v){ var nah=Math.abs(cam.position.y-st.y)<STATION_ABST*0.8 && !REDUCE; if(nah&&v.paused) v.play().catch(function(){}); else if(!nah&&!v.paused) v.pause(); }
        });

        /* — Karussell: Scrollweg dreht den Ring, Kapitelkarte vorn, wenn ihr
           Kapitel dran ist — */
        var gB=B.galerie, gp=seg(ps,gB[0],gB[1]);
        var idx=mix(0.2,8-0.2,gp)+(ps>=B.ende[0]?seg(ps,B.ende[0],B.ende[1])*1.4:0);
        kartenRing.rotation.y=idx*SCHRITT+(REDUCE?0:mx*0.05);
        kartenShader.uniforms.uVel.value=REDUCE?0:clamp(vel*40,-1.4,1.4);
        var fern=seg(ps,mix(B.ende[0],B.ende[1],0.15),mix(B.ende[0],B.ende[1],0.5));
        karten.forEach(function(k){ k.mat.uniforms.uOp.value=1-fern*0.75; });
        kartenRing.position.y=mix(0,-2.5,fern);

        renderer.render(scene,cam);
      }

      return {groesse:groesse, zeichnen:zeichnen, filme:filme, karten:karten};
    }

    /* ═══ SCHLEIFE ═══ */
    var rafId=null, laeuft=true, t0=0, last=0, rest=0;
    function tick(now){
      rafId=null;
      if(!laeuft) return;
      if(!t0) t0=now;
      rest+=Math.min(100, last?now-last:16); last=now;
      for(var n=0; rest>=16 && n<6; n++){ rest-=16; schritt(); }
      var lage=dom();
      if(G) G.zeichnen((now-t0)/1000, lage);
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
