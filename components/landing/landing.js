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
    document.body.style.overflow='hidden';

    var sections=intro.querySelectorAll('.vi-s');
    var stage=document.getElementById('viStage');
    var progBar=document.getElementById('viProgBar');
    var vid=document.getElementById('viBgVid');
    var vidReady=false;
    var vidTarget=0, vidCurrent=0;
    var vidRafId=null, vidLastTs=0;
    // Cap video seeks to ~30fps to avoid heavy decode on 120/144Hz displays
    var VID_INTERVAL=33;

    // Render first frame immediately
    // vidReady haengt NICHT mehr an einem einzelnen Ereignis. landing.js laeuft
    // mit defer, das <video> laedt schon vorher — liegt die Datei im Cache, ist
    // 'loadedmetadata' laengst durch, bevor dieses Skript zuhoert. Dann blieb
    // vidReady fuer immer false, vidLoop stieg in Zeile 1 aus und currentTime
    // blieb auf 0. Sichtbar wurde das erst, als Bild 0 des Films schwarz war;
    // vorher sah man einfach dauerhaft dasselbe erste Bild.
    function markReady(){
      if(vidReady) return;
      if(!vid.duration || isNaN(vid.duration)) return;  // ohne Dauer waere p*duration NaN
      vidReady=true;
      vidCurrent=0;
      try{ vid.currentTime=0; }catch(e){}
      update();   // sofort auf die aktuelle Scrollposition ziehen
    }
    ['loadedmetadata','loadeddata','canplay','durationchange'].forEach(function(ev){
      vid.addEventListener(ev, markReady);
    });
    // Zustand zusaetzlich direkt abfragen — fuer den Fall, dass alle Ereignisse
    // schon gefeuert haben, als hier noch niemand zuhoerte.
    if(vid.readyState>=1) markReady();

    // Ensure video loads
    vid.load();

    // Den Film einmal komplett in den Speicher holen und von dort scrubben.
    //
    // Ohne das haengt jeder Sprung ausserhalb des gepufferten Bereichs am Netz.
    // Auf dem Geraet gemessen: buffered war [0, 2.4] von 22,9 s, readyState 4,
    // error null — und currentTime blieb trotzdem auf 0. Genau das Muster:
    // die Seeks kamen nie an. Auf localhost faellt es nicht auf, weil dort
    // jede Teilanfrage sofort beantwortet wird.
    (function(){
      var q = vid.querySelector('source');
      var url = q && q.getAttribute('src');
      if(!url || !window.fetch || !window.URL || !URL.createObjectURL) return;
      fetch(url).then(function(r){ return r.ok ? r.blob() : null; }).then(function(b){
        if(!b) return;
        var stelle = vidCurrent;
        var objUrl = URL.createObjectURL(b);

        // Scheitert das Laden aus dem Speicher, MUSS es zurueck auf die Netz-Adresse.
        // Sonst ist der Film ganz weg statt nur langsam: vid.duration wird null,
        // vidLoop steigt in Zeile 1 aus, das Bild steht fuer immer. Genau das war live
        // der Fall, solange media-src in der CSP kein blob: erlaubte — Chrome meldet
        // das nur am Element (vid.error.code 4), nicht als Konsolenzeile.
        function zurueck(){
          vid.removeEventListener('error', zurueck);
          vid.removeEventListener('loadedmetadata', einmal);
          try{ URL.revokeObjectURL(objUrl); }catch(e){}
          vidReady=false;
          vid.removeAttribute('src');   // ohne src-Attribut gilt wieder <source>
          vid.load();                   // markReady haengt noch dran und schaltet neu scharf
        }
        function einmal(){
          vid.removeEventListener('loadedmetadata', einmal);
          vid.removeEventListener('error', zurueck);
          vidCurrent = stelle;
          try{ vid.currentTime = stelle; }catch(e){}
          update();
        }
        vid.addEventListener('error', zurueck);
        vid.addEventListener('loadedmetadata', einmal);
        vid.src = objUrl;   // src schlaegt <source>
        vid.load();
      }).catch(function(){});   // schlaegt es fehl, laeuft es wie bisher weiter
    })();
    var ticking=false;

    /* — Smooth Video Scrub Loop — stops when settled, rate-limited to ~30fps — */
    function vidLoop(ts){
      if(!vidReady||!vid.duration){vidRafId=null;return;}
      // Jede Zuweisung an currentTime ist ein Seek. Solange einer laeuft,
      // bricht die naechste Zuweisung ihn ab — bei ~30 Zuweisungen pro Sekunde
      // wird nie einer fertig und das Bild bleibt stehen. Also warten.
      if(vid.seeking){vidRafId=requestAnimationFrame(vidLoop);return;}
      var diff=vidTarget-vidCurrent;
      if(Math.abs(diff)>0.001){
        if(ts-vidLastTs>=VID_INTERVAL){
          // Nachlauf abhaengig vom Abstand. Mit festem 0.18 braucht die
          // Schleife rund 0,4 s, um 90 % einer Luecke zu schliessen — beim
          // schnellen Scrollen laeuft das Video dadurch um mehr als eine
          // halbe Szene hinterher, und dann steht der neue Text schon da,
          // waehrend noch die vorige Szene im Bild ist. Nah dran bleibt es
          // weich, weit weg holt es auf, sehr weit weg springt es.
          var ad=Math.abs(diff);
          if(ad>2.5) vidCurrent=vidTarget;
          else vidCurrent+=diff*(ad>0.9?0.55:0.26);
          vid.currentTime=vidCurrent;
          vidLastTs=ts;
        }
        vidRafId=requestAnimationFrame(vidLoop);
      } else {
        // Snap to target and stop loop — no idle RAF
        vidCurrent=vidTarget;
        vid.currentTime=vidCurrent;
        vidRafId=null;
      }
    }
    function startVidLoop(){
      if(!vidRafId) vidRafId=requestAnimationFrame(vidLoop);
    }

    /* — S1 Typewriter — */
    var typedEl=document.getElementById('viTyped');
    var typedText='Zeiterfassung neu definiert.';
    var typedIdx=0,typedDone=false,typedTimer=null;
    function startTyped(){
      if(typedDone||typedTimer) return;
      typedTimer=setInterval(function(){
        if(typedIdx<typedText.length){
          typedEl.textContent+=typedText[typedIdx++];
        } else { clearInterval(typedTimer);typedDone=true; }
      },55);
    }

    /* — Scroll Engine — cache offsetHeight to avoid reflow per scroll event — */
    var scrollMax=0;
    function cacheScrollMax(){
      var el=intro.querySelector('.vi-scroll');
      scrollMax=el?Math.max(1,el.offsetHeight-intro.clientHeight):1;
    }
    window.addEventListener('resize',cacheScrollMax,{passive:true});
    window.addEventListener('load',function(){cacheScrollMax();update();});

    function getP(){
      // Wenn scrollMax kleiner als ein Viewport ist, hat das Layout noch nicht gegriffen
      // (z.B. CSS noch nicht da) → neu rechnen, sonst mappt jeder Wisch auf p=1 (Bug am Handy).
      if(scrollMax<intro.clientHeight){cacheScrollMax();}
      return Math.min(1,Math.max(0,intro.scrollTop/scrollMax));
    }

    function update(){
      ticking=false;
      var p=getP();
      progBar.style.width=(p*100)+'%';
      if(vidReady&&vid.duration){vidTarget=p*vid.duration;startVidLoop();}
      var mode=null;   // null = kein Abschnitt aktiv (Blende) -> Stellung halten
      for(var i=0;i<sections.length;i++){
        var s=parseFloat(sections[i].dataset.s);
        var e=parseFloat(sections[i].dataset.e);
        var on=p>=s&&p<=e;
        sections[i].classList.toggle('on',on);
        if(on){
          // Die Stellung des Bildschirms haengt am aktiven Abschnitt, nicht
          // an einer zweiten Schwellen-Tabelle im Skript.
          mode=sections[i].dataset.modeOf||'split';
          if(i===0) startTyped();
        }
      }
      if(stage&&mode&&stage.dataset.mode!==mode) stage.dataset.mode=mode;
    }

    intro.addEventListener('scroll',function(){
      if(!ticking){requestAnimationFrame(update);ticking=true}
    },{passive:true});

    // Defer layout-dependent init to after first paint
    requestAnimationFrame(function(){
      cacheScrollMax();
      update();
    });

    /* — Finish — */
    window.finishIntro=function(){
      localStorage.setItem('pro_intro_seen','true');
      intro.style.animation='viFadeOut .4s ease forwards';
            setTimeout(function(){
                intro.style.display='none';
                document.body.style.overflow='';
                // Show ghost button immediately (banner remains delayed)
                if (window._showGhostButton) window._showGhostButton();
            },400);
    };

    document.addEventListener('keydown',function(e){
      if(intro.style.display==='none') return;
      if(e.key==='Escape') finishIntro();
    });
  })();