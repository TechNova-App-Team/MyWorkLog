(function createRealisticFireworks() {
    // Realistischere Feuerwerk-Symbole
    const sparkles = ['●', '◉', '◎', '○', '⬤', '◐', '◑', '◒', '◓', '★', '✦', '✧', '⭐', '✨', '💫'];
    const colors = ['particle-red', 'particle-gold', 'particle-blue', 'particle-purple', 'particle-white', 'particle-green', 'particle-orange'];
    const sizes = ['small', 'medium', 'large'];
    
    // Feuerwerk-Typen für Variation
    const fireworkTypes = ['burst', 'willow', 'palm', 'chrysanthemum', 'ring', 'crossette'];
    
    // Adaptive Performance-Einstellungen
    const isMobile = window.innerWidth < 768;
    const isLowPerformance = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let fireworkCount = 20;
    let creationInterval = 1800;
    
    if (isMobile) {
        fireworkCount = isLowPerformance ? 6 : 10;
        creationInterval = 2500;
    } else if (window.innerWidth > 1920) {
        fireworkCount = 20;
        creationInterval = 1400;
    }
    
    // TIME.PRO Explosions-Wahrscheinlichkeit (reduziert für bessere Performance)
    let timeProChance = 0.03; // 3% statt 15% - viel weniger oft
    
    let activeFireworks = 0;
    const maxFireworks = fireworkCount;
    let lastTimeProExplosion = 0;
    const minTimeProInterval = 8000; // Mindestens 8 Sekunden zwischen TIME.PRO
    
    function createFirework() {
        if (activeFireworks >= maxFireworks) return;
        
        const now = Date.now();
        const isTimePro = Math.random() < timeProChance && (now - lastTimeProExplosion) > minTimeProInterval;
        
        if (isTimePro) {
            lastTimeProExplosion = now;
            createTimeProExplosion();
        } else {
            const type = fireworkTypes[Math.floor(Math.random() * fireworkTypes.length)];
            createNormalFirework(type);
        }
    }
    
    function createNormalFirework(type = 'burst') {
        activeFireworks++;
        
        // Zufällige Position im Himmel
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight * (0.2 + Math.random() * 0.4);
        
        // Raketen-Trail
        const rocket = document.createElement('div');
        rocket.className = 'firework';
        rocket.style.left = startX + 'px';
        rocket.style.top = window.innerHeight + 'px';
        
        const rocketTrail = document.createElement('div');
        rocketTrail.textContent = '🔥';
        rocketTrail.style.fontSize = isMobile ? '1.2em' : '1.8em';
        rocketTrail.style.animation = 'rocket 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
        rocket.appendChild(rocketTrail);
        
        document.body.appendChild(rocket);
        
        // Explosion nach Rakete
        setTimeout(() => {
            if (rocket.parentElement) rocket.remove();
            
            // Typ-spezifische Explosionen
            switch (type) {
                case 'burst':
                    createBurstExplosion(startX, startY);
                    break;
                case 'willow':
                    createWillowExplosion(startX, startY);
                    break;
                case 'palm':
                    createPalmExplosion(startX, startY);
                    break;
                case 'chrysanthemum':
                    createChrysanthemumExplosion(startX, startY);
                    break;
                case 'ring':
                    createRingExplosion(startX, startY);
                    break;
                case 'crossette':
                    createCrossetteExplosion(startX, startY);
                    break;
            }
        }, 1000);
    }
    
    // Standard Burst - symmetrische Explosion
    function createBurstExplosion(x, y) {
        const particleCount = isMobile ? 25 : 40;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < particleCount; i++) {
            createParticle(x, y, i, particleCount, color, 'burst');
        }
    }
    
    // Willow - hängende Äste
    function createWillowExplosion(x, y) {
        const particleCount = isMobile ? 20 : 35;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < particleCount; i++) {
            createParticle(x, y, i, particleCount, color, 'willow');
        }
    }
    
    // Palm - Palmen-Form
    function createPalmExplosion(x, y) {
        const particleCount = isMobile ? 18 : 30;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < particleCount; i++) {
            createParticle(x, y, i, particleCount, color, 'palm');
        }
    }
    
    // Chrysanthemum - Blumen-Form
    function createChrysanthemumExplosion(x, y) {
        const particleCount = isMobile ? 28 : 50;
        const colors1 = colors[Math.floor(Math.random() * colors.length)];
        const colors2 = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < particleCount; i++) {
            const color = i % 2 === 0 ? colors1 : colors2;
            createParticle(x, y, i, particleCount, color, 'chrysanthemum');
        }
    }
    
    // Ring - Kreisförmig
    function createRingExplosion(x, y) {
        const particleCount = isMobile ? 20 : 35;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < particleCount; i++) {
            createParticle(x, y, i, particleCount, color, 'ring');
        }
    }
    
    // Crossette - Mehrfach-Explosionen
    function createCrossetteExplosion(x, y) {
        const mainCount = isMobile ? 8 : 12;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < mainCount; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 * i) / mainCount;
                const distance = isMobile ? 120 : 180;
                const newX = x + Math.cos(angle) * distance;
                const newY = y + Math.sin(angle) * distance;
                
                for (let j = 0; j < 8; j++) {
                    createParticle(newX, newY, j, 8, color, 'burst');
                }
            }, i * 100);
        }
    }
    
    function createParticle(x, y, index, total, colorClass, type) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        particle.classList.add(colorClass);
        
        // Zufällige Größe
        const sizeClass = sizes[Math.floor(Math.random() * sizes.length)];
        particle.classList.add(sizeClass);
        
        // Verschiedene Symbole für Variation
        particle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        
        // Typ-spezifische Bewegung
        let angle, distance, burstX, burstY;
        
        switch (type) {
            case 'willow':
                angle = (Math.PI * 2 * index) / total + (Math.random() - 0.5) * 0.4;
                distance = Math.random() * (isMobile ? 200 : 350) + 100;
                burstX = Math.cos(angle) * distance;
                burstY = Math.sin(angle) * distance + Math.abs(Math.sin(angle)) * (isMobile ? 150 : 250); // Hängender Effekt
                break;
            
            case 'palm':
                angle = (Math.PI * 2 * index) / total + (Math.random() - 0.5) * 0.3;
                distance = Math.random() * (isMobile ? 180 : 300) + 120;
                const palmCurve = Math.pow(Math.abs(Math.sin(angle)), 1.5);
                burstX = Math.cos(angle) * distance * palmCurve;
                burstY = Math.sin(angle) * distance + palmCurve * (isMobile ? 100 : 180);
                break;
            
            case 'chrysanthemum':
                angle = (Math.PI * 2 * index) / total;
                const layer = Math.floor(index / (total / 3));
                distance = (isMobile ? 80 : 150) + layer * (isMobile ? 60 : 100);
                burstX = Math.cos(angle) * distance;
                burstY = Math.sin(angle) * distance;
                break;
            
            case 'ring':
                angle = (Math.PI * 2 * index) / total;
                distance = isMobile ? 180 : 280;
                burstX = Math.cos(angle) * distance;
                burstY = Math.sin(angle) * distance;
                break;
            
            default: // burst
                angle = (Math.PI * 2 * index) / total + (Math.random() - 0.5) * 0.3;
                distance = Math.random() * (isMobile ? 200 : 350) + 150;
                burstX = Math.cos(angle) * distance;
                burstY = Math.sin(angle) * distance;
        }
        
        particle.style.setProperty('--burst-x', burstX + 'px');
        particle.style.setProperty('--burst-y', burstY + 'px');
        
        // Realistische Animationsdauer
        const duration = Math.random() * 0.6 + (isMobile ? 1.2 : 1.5);
        particle.style.animationDuration = duration + 's';
        
        const delay = Math.random() * 0.15;
        particle.style.animationDelay = delay + 's';
        
        document.body.appendChild(particle);
        
        // Schweif-Effekt für größere Partikel (nur Desktop, nicht auf Mobile)
        if (!isMobile && sizeClass === 'large' && Math.random() > 0.7) {
            createTrail(x, y, burstX, burstY, colorClass, duration);
        }
        
        // Cleanup
        const totalTime = (duration + delay + 0.3) * 1000;
        setTimeout(() => {
            if (particle.parentElement) particle.remove();
            activeFireworks = Math.max(0, activeFireworks - 1);
        }, totalTime);
    }
    
    function createTrail(x, y, burstX, burstY, colorClass, duration) {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const trail = document.createElement('div');
                trail.className = 'trail-particle';
                trail.classList.add(colorClass);
                trail.textContent = '·';
                trail.style.left = x + 'px';
                trail.style.top = y + 'px';
                trail.style.setProperty('--burst-x', burstX + 'px');
                trail.style.setProperty('--burst-y', burstY + 'px');
                trail.style.animationDuration = (duration * 0.6) + 's';
                
                document.body.appendChild(trail);
                
                setTimeout(() => {
                    if (trail.parentElement) trail.remove();
                }, duration * 600);
            }, i * 50);
        }
    }
    
    function createTimeProExplosion() {
        const explosionX = window.innerWidth / 2;
        const explosionY = window.innerHeight / 2;
        
        activeFireworks++;
        
        // Bildschirm-Flash für dramatischen Effekt
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
        
        // TIME.PRO Hauptexplosion
        const explosion = document.createElement('div');
        explosion.className = 'time-pro-explosion';
        explosion.style.left = explosionX + 'px';
        explosion.style.top = explosionY + 'px';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'time-pro-text';
        textSpan.textContent = 'TIME.PRO';
        explosion.appendChild(textSpan);
        
        // Mehrere Halo-Ringe
        for (let i = 0; i < 3; i++) {
            const halo = document.createElement('div');
            halo.className = 'time-pro-halo';
            halo.style.left = explosionX + 'px';
            halo.style.top = explosionY + 'px';
            explosion.appendChild(halo);
        }
        
        // Shockwave
        const shockwave = document.createElement('div');
        shockwave.className = 'time-pro-shockwave';
        shockwave.style.left = explosionX + 'px';
        shockwave.style.top = explosionY + 'px';
        explosion.appendChild(shockwave);
        
        document.body.appendChild(explosion);
        
        // STARK reduzierte Partikel: 12-18 statt 15-25 (Performance!)
        const sparkCount = isMobile ? 10 : 18;
        for (let i = 0; i < sparkCount; i++) {
            setTimeout(() => {
                const spark = document.createElement('div');
                spark.className = 'time-pro-spark';
                
                const sparkColors = ['spark-yellow', 'spark-red', 'spark-blue'];
                spark.classList.add(sparkColors[Math.floor(Math.random() * sparkColors.length)]);
                
                const sparkSymbols = ['●', '◉', '★', '✦', '✧'];
                spark.textContent = sparkSymbols[Math.floor(Math.random() * sparkSymbols.length)];
                
                spark.style.left = explosionX + 'px';
                spark.style.top = explosionY + 'px';
                
                const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
                const distance = Math.random() * (isMobile ? 250 : 400) + (isMobile ? 150 : 250);
                const sparkX = Math.cos(angle) * distance;
                const sparkY = Math.sin(angle) * distance;
                
                spark.style.setProperty('--spark-x', sparkX + 'px');
                spark.style.setProperty('--spark-y', sparkY + 'px');
                
                const duration = Math.random() * 0.6 + 1.5;
                spark.style.animationDuration = duration + 's';
                
                const delay = Math.random() * 0.1;
                spark.style.animationDelay = delay + 's';
                
                document.body.appendChild(spark);
                
                setTimeout(() => {
                    if (spark.parentElement) spark.remove();
                }, (duration + delay + 0.3) * 1000);
            }, i * 12);
        }
        
        // NUR 1 Ring-Explosion statt 3 (Performance!)
        setTimeout(() => {
            createRingExplosion(explosionX, explosionY);
        }, 600);
        
        // Cleanup
        setTimeout(() => {
            if (explosion.parentElement) explosion.remove();
            activeFireworks = Math.max(0, activeFireworks - 1);
        }, 3500);
        
        playExplosionSound();
    }
    
    function playExplosionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const now = audioContext.currentTime;
            
            // Bass-Explosion
            const bassOsc = audioContext.createOscillator();
            const bassGain = audioContext.createGain();
            bassOsc.connect(bassGain);
            bassGain.connect(audioContext.destination);
            bassOsc.frequency.setValueAtTime(80, now);
            bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
            bassGain.gain.setValueAtTime(0.4, now);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            bassOsc.start(now);
            bassOsc.stop(now + 0.3);
            
            // Knall-Sound
            const crackleOsc = audioContext.createOscillator();
            const crackleGain = audioContext.createGain();
            crackleOsc.connect(crackleGain);
            crackleGain.connect(audioContext.destination);
            crackleOsc.frequency.setValueAtTime(200, now + 0.05);
            crackleOsc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
            crackleGain.gain.setValueAtTime(0.3, now + 0.05);
            crackleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            crackleOsc.start(now + 0.05);
            crackleOsc.stop(now + 0.2);
        } catch (e) {
            // Audio nicht verfügbar
        }
    }
    
    // Kontinuierliche Feuerwerk-Erzeugung
    const creationTimerId = setInterval(() => {
        if (activeFireworks < maxFireworks * 0.6) {
            createFirework();
        }
    }, creationInterval);
    
    // Burst von mehreren Feuerwerken manchmal
    setInterval(() => {
        if (Math.random() > 0.8 && activeFireworks < maxFireworks * 0.4) {
            const burstCount = isMobile ? 1 : 2;
            for (let i = 0; i < burstCount; i++) {
                setTimeout(() => createFirework(), i * 400);
            }
        }
    }, creationInterval * 4);
    
    // Cleanup bei inaktivem Tab
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(creationTimerId);
            document.querySelectorAll('.firework, .firework-particle, .trail-particle, .time-pro-explosion, .time-pro-spark, .screen-flash').forEach(el => el.remove());
            activeFireworks = 0;
        }
    });
    
})();