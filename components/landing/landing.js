// ═══ LANDING / INTRO MODULE ═══
// Rundgang fuer Erstbesucher (seit v7.5.0 ohne Film): ein Bildschirm mit echten
// App-Aufnahmen, der je Kapitel an einen Brennpunkt heranfaehrt. ALLES Bewegte
// ist eine Funktion der Scrollposition p (0…1) — render(p) schreibt nur
// transform/opacity, nie Layout. Einzige Ausnahme: der Zeiger kippt im Hero den
// Bildschirm ein paar Grad (gedaempft), das laeuft ueber dieselbe Schleife.
(function(){
    if(localStorage.getItem('pro_intro_seen')==='true') return;
    // Wer per QR-Code hier landet (#p2p=<code>), oeffnet die App auf dem ZWEITEN Geraet
    // meist zum allerersten Mal — genau der Fall, in dem das Intro sonst laeuft. Es liegt
    // auf z-index 99999 und sperrt body-Scroll, der P2P-Wizard nur auf 200: der Wizard
    // waere unsichtbar dahinter, Eingaben unmoeglich, die Seite wirkt eingefroren.
    // Deshalb Intro ueberspringen — und 'pro_intro_seen' bewusst NICHT setzen, damit es
    // beim naechsten normalen Aufruf ganz normal kommt.
    if(/[#&]p2p=/.test(location.hash||'')){ window._introSkipped=true; return; }
    var intro=document.getElementById('pro-intro');
    intro.style.display='block';

    // Schrift NUR fuer das Intro, und erst hier: Wiederkehrer (pro_intro_seen)
    // steigen oben aus und laden sie nie. Nicht blockierend (display=swap).
    (function(){
      if(document.getElementById('viFonts')) return;
      var l=document.createElement('link');
      l.id='viFonts'; l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Geist:wght@400;500;600&display=swap';
      document.head.appendChild(l);
    })();
    var EN=document.documentElement.lang==='en';
    var REDUCE=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var FEIN=!!(window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    document.body.style.overflow='hidden';

    var $=function(id){return document.getElementById(id);};
    var screen=$('viScreen'), view=$('viView'), ring=$('viRing'), phone=$('viPhone');
    var hero=$('viHero'), wall=$('viWall'), wallIn=$('viWallIn'), end=$('viEnd');
    var rail=$('viRail'), hint=$('viHint');
    var shots=view.querySelectorAll('.vi-shot');
    var chEls=intro.querySelectorAll('.vi-ch');

    /* — Zeitachse. Hero bis H_END, dann die Kapitel gleich lang bis C_END,
       danach der Abschluss. Kapitel-Innenleben (t = 0…1 im Kapitel):
       0–.22 neue Aufnahme wischt von unten herein, .22–.55 Kamera faehrt an den
       Brennpunkt, haelt bis .78, faehrt bis 1 wieder heraus. — */
    var H_END=0.10, C_END=0.865, F_ON=0.90;
    var N=chEls.length, CL=(C_END-H_END)/N;

    var chapters=[], letzteAufnahme=0;
    for(var i=0;i<N;i++){
      var el=chEls[i];
      var f=(el.dataset.f||'').split(',').map(parseFloat);
      if(el.dataset.shot!=null) letzteAufnahme=parseInt(el.dataset.shot,10);
      chapters.push({
        el:el, s:H_END+i*CL, e:H_END+(i+1)*CL,
        shot:letzteAufnahme, neu:el.dataset.shot!=null,
        phone:el.dataset.phone==='1',
        f:f.length===4?f:null
      });
      var eb=el.querySelector('.vi-eyebrow'); if(eb) eb.setAttribute('data-n', String(i+1));
    }

    function clamp(v,a,b){return v<a?a:v>b?b:v;}
    function seg(p,a,b){return clamp((p-a)/(b-a),0,1);}
    // stark auslaufend fuer Einblenden, weich beidseitig fuer Kamerafahrten
    function eOut(x){return 1-Math.pow(1-x,3);}
    function eIO(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}

    /* — Titel: Buchstaben einzeln (Aufsteigen macht die CSS). Das h1 behaelt
       seinen Text als aria-label; Crawler lesen das statische Markup. — */
    (function(){
      var h=$('viLogo'); if(!h) return;
      var txt=h.textContent.trim(); h.setAttribute('aria-label',txt); h.textContent='';
      for(var k=0;k<txt.length;k++){
        var s=document.createElement('span'); s.className='vi-l'; s.setAttribute('aria-hidden','true');
        s.style.setProperty('--i',k); s.textContent=txt[k]; h.appendChild(s);
      }
    })();

    /* — Zeile unter dem Titel — */
    var typedEl=$('viTyped');
    var typedText=EN?'For apprentices. Built by one.':'Für Azubis. Von einem Azubi.';
    setTimeout(function(){
      if(REDUCE){ typedEl.textContent=typedText; return; }
      var n=0, t=setInterval(function(){
        if(n<typedText.length) typedEl.textContent+=typedText[n++]; else clearInterval(t);
      },48);
    },700);

    /* — Nachladen: erst die erste Aufnahme, dann der Rest (sonst laden sieben
       2880er-Bilder gleichzeitig mit dem Hero um die Leitung). — */
    function losLaden(){
      if(view.classList.contains('vi-go')) return;
      view.classList.add('vi-go');
      // Wand fuer den Abschluss aus denselben Adressen (liegen dann im Cache)
      var quellen=[];
      for(var q=0;q<shots.length;q++) quellen.push(shots[q].getAttribute('src'));
      for(var w=0;w<12;w++){
        var im=document.createElement('img');
        im.src=quellen[(w*5)%quellen.length]; im.alt=''; im.loading='lazy'; im.decoding='async';
        wallIn.appendChild(im);
      }
    }
    if(shots[0].complete) setTimeout(losLaden,300);
    else { shots[0].addEventListener('load',function(){setTimeout(losLaden,300);}); setTimeout(losLaden,2500); }

    /* — Kapitel-Leiste aus den Eyebrows (auf /en/ schon uebersetzt) — */
    chapters.forEach(function(ch){
      var eb=ch.el.querySelector('.vi-eyebrow'); if(!eb) return;
      var b=document.createElement('button');
      b.type='button'; b.className='vi-rail-btn';
      var t=document.createElement('span'); t.textContent=eb.textContent.trim();
      var bar=document.createElement('span'); bar.className='vi-rail-bar';
      var fill=document.createElement('span'); fill.className='vi-rail-fill';
      bar.appendChild(fill); b.appendChild(t); b.appendChild(bar);
      b.setAttribute('aria-label', eb.textContent.trim());
      // Mitte des Kapitels: dort steht die Kamera am Brennpunkt
      b.addEventListener('click',function(){ springeZu(ch.s+CL*0.6); });
      rail.appendChild(b);
      ch.btn=b; ch.fill=fill;
    });

    /* — Masse. Neu bei resize; alles Weitere rechnet mit diesen Zahlen. — */
    var W,H,SW,SH,SWI,SHI,PW,PH,SCHMAL,scrollMax=1;
    function messen(){
      W=intro.clientWidth; H=intro.clientHeight;
      SCHMAL=W<=900;
      SW=screen.offsetWidth; SH=screen.offsetHeight;
      var inn=screen.firstElementChild; SWI=inn.clientWidth; SHI=inn.clientHeight;
      PW=phone.offsetWidth; PH=phone.offsetHeight;
      var sc=intro.querySelector('.vi-scroll');
      scrollMax=Math.max(1,sc.offsetHeight-H);
    }

    // Stellungen des Bildschirms: Mittelpunkt, Groesse, Kippung
    function heroStellung(){
      if(SCHMAL) return {x:W/2, y:H*0.64+SH*0.5, s:1.04, rx:REDUCE?0:24};
      var s=Math.min(1.22,(W*0.74)/SW);
      return {x:W/2, y:H*0.62+SH*s*0.5, s:s, rx:REDUCE?0:30};
    }
    function tourStellung(){
      if(SCHMAL) return {x:W/2, y:Math.max(92+SH/2, H*0.37), s:1, rx:0};
      return {x:W*0.635, y:H*0.5, s:1, rx:0};
    }

    /* — Zeiger (nur Hero, nur Maus): Zielwert springt, der gezeigte laeuft nach. — */
    var mx=0,my=0,tmx=0,tmy=0;
    if(FEIN && !REDUCE){
      intro.addEventListener('pointermove',function(e){
        tmx=(e.clientX/W)*2-1; tmy=(e.clientY/H)*2-1; wecken();
      },{passive:true});
    }

    function lies(){ return clamp(intro.scrollTop/scrollMax,0,1); }

    function render(){
      var p=lies();
      var k=eIO(seg(p,0.008,H_END));                 // Hero -> Rundgang
      var fin=eIO(seg(p,C_END+0.002,C_END+0.07));    // Rundgang -> Abschluss

      // aktives Kapitel
      var ci=-1, t=0;
      for(var i=0;i<N;i++){ if(p>=chapters[i].s && p<chapters[i].e){ ci=i; t=(p-chapters[i].s)/CL; break; } }
      if(p>=C_END){ ci=N-1; t=1; }
      var ch=ci>=0?chapters[ci]:null;

      /* Bildschirm */
      var a=heroStellung(), b=tourStellung();
      var cx=a.x+(b.x-a.x)*k, cy=a.y+(b.y-a.y)*k, s=a.s+(b.s-a.s)*k, rx=a.rx*(1-k);
      var ry=mx*5*(1-k), rxm=-my*3*(1-k);
      var ph=0;
      if(ch && ch.phone) ph=Math.min(eOut(seg(t,0,0.22)), 1-eIO(seg(t,0.8,1)));
      s*=(1-0.1*ph)*(1-0.22*fin);
      screen.style.transform='translate3d('+(cx-SW/2).toFixed(1)+'px,'+(cy-SH/2).toFixed(1)+'px,0) perspective(1800px) rotateX('+(rx+rxm).toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg) scale('+s.toFixed(4)+')';
      screen.style.opacity=((1-0.72*ph)*(1-fin)).toFixed(3);

      /* Aufnahmen: die des Kapitels wischt von unten ueber die vorige */
      var aktiv=ch?ch.shot:0, wisch=1;
      if(ch && ch.neu && ci>0) wisch=eOut(seg(t,0,0.22));
      for(var j=0;j<shots.length;j++){
        if(j<aktiv || (j===aktiv && wisch>=1)){ shots[j].style.clipPath='none'; shots[j].style.transform=''; }
        else if(j===aktiv){
          shots[j].style.clipPath='inset('+((1-wisch)*100).toFixed(2)+'% 0 0 0)';
          shots[j].style.transform='scale('+(1+0.06*(1-wisch)).toFixed(4)+')';
        }
        else shots[j].style.clipPath='inset(100% 0 0 0)';
      }

      /* Kamera an den Brennpunkt */
      var c=0;
      if(ch && ch.f && !ch.phone) c=Math.min(eIO(seg(t,0.22,0.55)), 1-eIO(seg(t,0.78,1)));
      var Z=1, TX=0, TY=0;
      if(c>0){
        var F=ch.f;
        var z=clamp(Math.min(0.86/F[2],0.86/F[3]),1,2.2);
        Z=1+(z-1)*c;
        var mxF=F[0]+F[2]/2, myF=F[1]+F[3]/2;
        TX=clamp(SWI/2-mxF*SWI*Z, SWI-SWI*Z, 0);
        TY=clamp(SHI/2-myF*SHI*Z, SHI-SHI*Z, 0);
        var pad=6;
        ring.style.width=(F[2]*SWI*Z+pad*2).toFixed(1)+'px';
        ring.style.height=(F[3]*SHI*Z+pad*2).toFixed(1)+'px';
        ring.style.transform='translate3d('+(TX+F[0]*SWI*Z-pad).toFixed(1)+'px,'+(TY+F[1]*SHI*Z-pad).toFixed(1)+'px,0)';
      }
      ring.style.opacity=seg(c,0.55,1).toFixed(3);
      view.style.transform='translate3d('+TX.toFixed(1)+'px,'+TY.toFixed(1)+'px,0) scale('+Z.toFixed(4)+')';

      /* Handy: im Hero vorn rechts am Bildschirm, faehrt beim Aufrichten hinaus;
         im Kapitel „Unterwegs“ kommt es allein zurueck. */
      var pOp, pT;
      if(ph>0){
        var px=b.x, py=SCHMAL?Math.max(PH/2+84,H*0.38):H*0.5;
        pOp=ph;
        pT='translate3d('+(px-PW/2).toFixed(1)+'px,'+(py-PH/2+(1-ph)*H*0.25).toFixed(1)+'px,0) rotate('+((1-ph)*6).toFixed(2)+'deg)';
      } else {
        var hs=SCHMAL?0.5:0.64;
        var hx=a.x+SW*a.s*0.43, hy=a.y-SH*a.s*0.08;
        pOp=SCHMAL?0:(1-k);
        pT='translate3d('+(hx-PW/2+k*W*0.3).toFixed(1)+'px,'+(hy-PH/2-k*H*0.1).toFixed(1)+'px,0) perspective(1400px) rotateY('+(-16+ry*1.4).toFixed(2)+'deg) rotateX('+(rxm*1.4).toFixed(2)+'deg) rotateZ(4deg) scale('+hs+')';
      }
      phone.style.opacity=pOp.toFixed(3);
      phone.style.transform=pT;

      /* Hero-Text weicht nach oben */
      hero.style.opacity=clamp(1-k*1.7,0,1).toFixed(3);
      hero.style.transform='translate3d(0,'+(-k*H*0.14).toFixed(1)+'px,0)';
      hero.style.visibility=k>0.6?'hidden':'';

      /* Kapiteltexte */
      for(var n=0;n<N;n++){
        var C=chapters[n];
        var on=(n===ci && p<C_END && t>0.04 && t<0.96);
        C.el.classList.toggle('on',on);
        C.el.classList.toggle('up',!on && p>=C.s+CL*0.5);
        if(C.fill){
          C.fill.style.setProperty('--f', seg(p,C.s,C.e).toFixed(3));
          C.btn.classList.toggle('on', n===ci && p<C_END);
          C.btn.classList.toggle('done', p>=C.e);
        }
      }
      rail.classList.toggle('on', p>=H_END-0.005 && p<C_END);
      hint.classList.toggle('on', p<0.006);

      /* Abschluss: die Wand aller Aufnahmen treibt schraeg dahinter */
      wall.style.opacity=fin.toFixed(3);
      if(fin>0){
        var drift=(p-C_END)*H*2.2;
        wallIn.style.transform='translate(-50%,-50%) rotateX(52deg) rotateZ(-26deg) translate3d(0,'+(-drift).toFixed(1)+'px,0)';
      }
      end.classList.toggle('on', p>=F_ON);
    }

    /* — Eine Schleife: laeuft, solange der Zeiger nachzieht, sonst steht sie. — */
    var rafId=null;
    function tick(){
      rafId=null;
      mx+=(tmx-mx)*0.08; my+=(tmy-my)*0.08;
      render();
      if(Math.abs(tmx-mx)>0.002||Math.abs(tmy-my)>0.002) wecken();
    }
    function wecken(){ if(!rafId) rafId=requestAnimationFrame(tick); }

    intro.addEventListener('scroll',wecken,{passive:true});
    window.addEventListener('resize',function(){ messen(); wecken(); },{passive:true});
    window.addEventListener('load',function(){ messen(); wecken(); });
    requestAnimationFrame(function(){ messen(); render(); });

    function springeZu(p){
      messen();
      intro.scrollTo({top:p*scrollMax, behavior:REDUCE?'auto':'smooth'});
    }
    // Rundgang aus dem Hero: erstes Kapitel, Text steht schon da.
    window.viTour=function(){ springeZu(chapters[0].s+CL*0.12); };

    /* — Ausgang — */
    window.finishIntro=function(){
      localStorage.setItem('pro_intro_seen','true');
      intro.style.animation=REDUCE?'viFade .3s ease reverse forwards':'viExit .55s cubic-bezier(.32,.72,0,1) forwards';
      setTimeout(function(){
        intro.style.display='none';
        document.body.style.overflow='';
        // Ghost-Knopf sofort zeigen (das Banner bleibt verzoegert)
        if (window._showGhostButton) window._showGhostButton();
      },REDUCE?300:520);
    };

    document.addEventListener('keydown',function(e){
      if(intro.style.display==='none') return;
      if(e.key==='Escape') finishIntro();
    });
  })();
