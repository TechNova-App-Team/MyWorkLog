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
    vid.addEventListener('loadedmetadata',function(){
      vidReady=true;
      vid.currentTime=0;
      vidCurrent=0;
    });
    vid.addEventListener('loadeddata',function(){
      if(!vidReady){
        vid.currentTime=0;
        vidCurrent=0;
      }
    });

    // Ensure video loads
    vid.load();
    var ticking=false;

    /* — Smooth Video Scrub Loop — stops when settled, rate-limited to ~30fps — */
    function vidLoop(ts){
      if(!vidReady||!vid.duration){vidRafId=null;return;}
      var diff=vidTarget-vidCurrent;
      if(Math.abs(diff)>0.001){
        if(ts-vidLastTs>=VID_INTERVAL){
          vidCurrent+=diff*0.18;
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