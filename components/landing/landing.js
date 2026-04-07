(function(){
    if(localStorage.getItem('pro_intro_seen')==='true') return;
    var intro=document.getElementById('pro-intro');
    intro.style.display='block';

    var sections=intro.querySelectorAll('.vi-s');
    var progBar=document.getElementById('viProgBar');
    var vid=document.getElementById('viBgVid');
    var vidReady=false;
    var vidTarget=0, vidCurrent=0;
    
    // Render first frame immediately
    vid.addEventListener('loadedmetadata',function(){
      vidReady=true;
      vid.currentTime=0;
      vidCurrent=0;
      vidLoop();
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

    /* — Smooth Video Scrub Loop — */
    function vidLoop(){
      if(!vidReady||!vid.duration) return;
      var diff=vidTarget-vidCurrent;
      if(Math.abs(diff)>0.01){
        vidCurrent+= diff*0.12;
        vid.currentTime=vidCurrent;
      }
      requestAnimationFrame(vidLoop);
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

    /* — S3 Counter Animation — */
    var countersRan=false;
    function runCounters(){
      if(countersRan) return; countersRan=true;
      intro.querySelectorAll('.vi-stat-num[data-target]').forEach(function(el){
        var target=parseInt(el.dataset.target),dur=1100,start=null;
        function tick(ts){
          if(!start) start=ts;
          var p=Math.min((ts-start)/dur,1);
          var ease=1-Math.pow(1-p,3);
          el.textContent=Math.floor(ease*target).toLocaleString('de-DE');
          if(p<1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }

    /* — Scroll Engine — */
    function getP(){
      var st=intro.scrollTop;
      var mx=intro.querySelector('.vi-scroll').offsetHeight-intro.clientHeight;
      return mx<=0?0:Math.min(1,Math.max(0,st/mx));
    }

    function update(){
      ticking=false;
      var p=getP();
      progBar.style.width=(p*100)+'%';
      if(vidReady&&vid.duration){vidTarget=p*vid.duration;}
      for(var i=0;i<sections.length;i++){
        var s=parseFloat(sections[i].dataset.s);
        var e=parseFloat(sections[i].dataset.e);
        var on=p>=s&&p<=e;
        sections[i].classList.toggle('on',on);
        if(on){
          if(i===0) startTyped();
          if(i===2) runCounters();
        }
      }
    }

    intro.addEventListener('scroll',function(){
      if(!ticking){requestAnimationFrame(update);ticking=true}
    },{passive:true});
    
    // Initialize immediately and on next frame
    update();
    requestAnimationFrame(update);

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