// ═══ CORE: DASHBOARD-EXTRAS ═══
    window._clsBC = 'dashboard-extras.js-start';
    // ============================================
    // NEW FEATURES
    // ============================================

    // FEATURE 1: Daily Summary (Streak only)
    function updateDailySummary() {
        if (typeof updateStreakCounter === 'function') updateStreakCounter();
    }

    // FEATURE 2: Pomodoro Timer Mode
    let pomodoroState = {
        enabled: false,
        isWorkPhase: true,
        timeLeft: 25 * 60,
        intervalId: null
    };

    function togglePomodoroMode() {
        if (!pomodoroState.enabled) {
            pomodoroState.enabled = true;
            pomodoroState.timeLeft = 25 * 60;
            pomodoroState.isWorkPhase = true;
            startPomodoroTimer();
            showCustomMessage('🍅 Pomodoro', 'Arbeitsphase gestartet!', 'success');
        } else {
            stopPomodoroTimer();
            pomodoroState.enabled = false;
            showCustomMessage('🍅 Pomodoro', 'Beendet', 'info');
        }
    }

    function startPomodoroTimer() {
        if (pomodoroState.intervalId) clearInterval(pomodoroState.intervalId);
        
        pomodoroState.intervalId = setInterval(() => {
            pomodoroState.timeLeft--;
            
            const mins = Math.floor(pomodoroState.timeLeft / 60);
            const secs = pomodoroState.timeLeft % 60;
            const display = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            
            const card = document.getElementById('pomodoroCard');
            if (card) {
                const title = pomodoroState.isWorkPhase ? '🍅 Arbeitsphase' : '☕ Pausenphase';
                card.querySelector('h4').innerText = title + ` - ${display}`;
            }
            
            if (pomodoroState.timeLeft === 0) {
                pomodoroState.isWorkPhase = !pomodoroState.isWorkPhase;
                pomodoroState.timeLeft = pomodoroState.isWorkPhase ? 25 * 60 : 5 * 60;
                
                const sound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj==');
                sound.play().catch(() => {});
                
                showCustomMessage('🔔', pomodoroState.isWorkPhase ? 'Pause vorbei! Arbeitsphase!' : 'Arbeitszeit vorbei! Pause!', 'warning');
            }
        }, 1000);
    }

    function stopPomodoroTimer() {
        if (pomodoroState.intervalId) {
            clearInterval(pomodoroState.intervalId);
            pomodoroState.intervalId = null;
        }
    }

    // FEATURE 3: Weekly Goals Progress
    function updateWeeklyGoals() {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        
        let weekHours = 0, workDays = new Set();
        data.entries.forEach(e => {
            const d = new Date(e.date);
            if (d >= weekStart && d <= now) {
                weekHours += e.diff;
                if (e.type === 'work' || e.type === 'school') {
                    workDays.add(e.date);
                }
            }
        });

        const targetHours = 40;
        const targetDays = 5;
        const hoursPercent = Math.min((weekHours / 3600 / targetHours) * 100, 100);
        const daysPercent = Math.min((workDays.size / targetDays) * 100, 100);

        document.getElementById('weeklyHoursTarget').innerText = (weekHours / 3600).toFixed(1) + ' / ' + targetHours + 'h';
        document.getElementById('weeklyDaysTarget').innerText = workDays.size + ' / ' + targetDays + ' Tage';
        document.getElementById('weeklyHoursBar').style.width = hoursPercent + '%';
        document.getElementById('weeklyDaysBar').style.width = daysPercent + '%';
    }

    // FEATURE 4: Dark/Light Mode Theme
    function setTheme(theme) {
        if (theme === 'light') {
            document.documentElement.style.setProperty('--bg-deep', '#f5f5f7');
            document.documentElement.style.setProperty('--bg-glass', 'rgba(245, 245, 247, 0.8)');
            document.documentElement.style.setProperty('--text-main', '#1a1a1a');
            document.documentElement.style.setProperty('--text-muted', '#666666');
            document.documentElement.style.setProperty('--border', 'rgba(0, 0, 0, 0.1)');
            document.body.style.backgroundImage = 'radial-gradient(circle at 15% 15%, rgba(var(--primary-rgb), 0.05), transparent 40%), radial-gradient(circle at 85% 85%, rgba(var(--primary-rgb), 0.03), transparent 40%)';
            showCustomMessage('☀️ Light Mode', 'Aktiviert', 'info');
        } else {
            document.documentElement.style.setProperty('--bg-deep', '#030305');
            document.documentElement.style.setProperty('--bg-glass', 'rgba(22, 22, 26, 0.65)');
            document.documentElement.style.setProperty('--text-main', '#f8fafc');
            document.documentElement.style.setProperty('--text-muted', '#94a3b8');
            document.documentElement.style.setProperty('--border', 'rgba(255, 255, 255, 0.06)');
            document.body.style.backgroundImage = 'radial-gradient(circle at 15% 15%, rgba(var(--primary-rgb), 0.08), transparent 40%), radial-gradient(circle at 85% 85%, rgba(var(--primary-rgb), 0.05), transparent 40%)';
            showCustomMessage('🌙 Dark Mode', 'Aktiviert', 'info');
        }
        localStorage.setItem('tt_theme', theme);
    }

    // Load theme on init
    const savedTheme = localStorage.getItem('tt_theme') || 'dark';
    if (savedTheme === 'light') {
        setTheme('light');
    }
    function getLastWorkday(date) {
        const d = new Date(date);
        const dow = d.getDay();
        if (dow === 0) d.setDate(d.getDate() - 2); // Sonntag → Freitag
        else if (dow === 6) d.setDate(d.getDate() - 1); // Samstag → Freitag
        // Wenn heute ein Arbeitstag ist, dann ist der letzte Arbeitstag gestern (oder Freitag)
        else {
            d.setDate(d.getDate() - 1);
            if (d.getDay() === 0) d.setDate(d.getDate() - 2);
            else if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        }
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function isConsecutiveWorkDay(date1, date2) {
        // date1 = neueres Datum, date2 = älteres Datum (sorted desc)
        const oneDayMs = 1000 * 60 * 60 * 24;
        const diffDays = Math.round((date1 - date2) / oneDayMs);
        if (diffDays === 1) return true; // normaler aufeinanderfolgender Tag
        if (diffDays === 3 && date2.getDay() === 5) return true; // Freitag→Montag
        return false;
    }

    // ── BASIS: Streak-Länge ─────────────────────────────────────────────
    function getStreakEmoji(streak) {
      if (streak === 0)         return '❄️';   // Eingefroren
      if (streak === 1)         return '🌱';   // Keim
      if (streak === 2)         return '🕯️';   // Erste Flamme
      if (streak === 3)         return '⚡';   // Blitz
      if (streak === 4)         return '💧';   // Tropfen
      if (streak < 10)          return '🔥';   // Feuer
      if (streak < 15)          return '✨';   // Funken
      if (streak < 21)          return '💫';   // Wirbel
      if (streak < 30)          return '🌟';   // Stern
      if (streak < 50)          return '🏆';   // Pokal
      if (streak < 75)          return '💎';   // Diamant
      if (streak < 100)         return '🌊';   // Welle
      if (streak < 150)         return '🚀';   // Rakete
      if (streak < 200)         return '⚔️';   // Schwert
      if (streak < 365)         return '👑';   // Krone
      return '🌞';                              // Ein ganzes Jahr
    }

    // ── ZUFALLSVARIATION: Pool je Level ────────────────────────────────
    const emojiPools = {
      none:   ['❄️','🧊','☃️','🌨️','🥶'],
      start:  ['🌱','🐣','🌿','🌾','🍀'],
      fire:   ['🔥','🌶️','♨️','🧨','💥'],
      star:   ['🌟','⭐','✨','💫','🌠'],
      trophy: ['🏆','🥇','🎖️','👑','💎'],
      rocket: ['🚀','🛸','☄️','🌌','🌠'],
    };

        // Deterministic daily emoji from the pool for the current streak level.
        // This way the emoji changes each day (based on the date) but remains
        // stable during the same day until midnight.
        function getDailyEmoji(streak, date = new Date()) {
            let pool;
            if (streak === 0)      pool = emojiPools.none;
            else if (streak < 5)   pool = emojiPools.start;
            else if (streak < 30)  pool = emojiPools.fire;
            else if (streak < 75)  pool = emojiPools.star;
            else if (streak < 150) pool = emojiPools.trophy;
            else                   pool = emojiPools.rocket;

            // Use ISO date (YYYY-MM-DD) so the index changes once per day.
            const dayKey = date.toISOString().slice(0, 10);
            // simple string hash (32-bit) -> deterministic per day
            let h = 0;
            for (let i = 0; i < dayKey.length; i++) {
                h = ((h << 5) - h) + dayKey.charCodeAt(i);
                h |= 0;
            }
            const idx = Math.abs(h) % pool.length;
            return pool[idx];
        }

    function updateStreakCounter() {
        if (typeof calculateStreak !== 'function') return;
        const streak = calculateStreak();
        const elCount = document.getElementById('streakCount');
        const elBest = document.getElementById('streakBest');
        const elEmoji = document.getElementById('streakEmoji');

        if (elCount) {
            try { elCount.innerText = streak.current; } catch (e) { console.warn('updateStreakCounter: failed to set streakCount', e); }
        } else {
            console.warn('updateStreakCounter: #streakCount not found');
        }

        if (elBest) {
            try { elBest.innerText = `Best: ${streak.best} 🏆`; } catch (e) { console.warn('updateStreakCounter: failed to set streakBest', e); }
        } else {
            console.warn('updateStreakCounter: #streakBest not found');
        }

        // Emoji basiert auf aktueller Streak — wähle eine tägliche Variation
        let emoji = getDailyEmoji(streak.current);

        if (elEmoji) {
            try { 
                elEmoji.innerText = emoji; 
                // Add pulse animation when streak is active
                if (streak.current > 0) {
                    elEmoji.classList.add('streak-active');
                } else {
                    elEmoji.classList.remove('streak-active');
                }
            } catch (e) { console.warn('updateStreakCounter: failed to set streakEmoji', e); }
        } else {
            console.warn('updateStreakCounter: #streakEmoji not found');
        }

        // Trigger Notification bei neuer Best-Streak (EINMALIG PRO TAG)
        if (streak.current > 0 && streak.current === streak.best && streak.current > 1) {
            const today = new Date().toISOString().split('T')[0];
            const lastNotificationDate = localStorage.getItem('tt_last_streak_notification_date');
            const lastNotificationValue = localStorage.getItem('tt_last_streak_notification_value');
            
            // Nur anzeigen, wenn es heute noch nicht angezeigt wurde oder der Streak höher ist
            if (lastNotificationDate !== today || parseInt(lastNotificationValue || '0') < streak.best) {
                showSmartNotification('🔥 Neue Best-Streak!', `${streak.current} Tage in Folge mit Soll erfüllt!`, 'success');
                localStorage.setItem('tt_last_streak_notification_date', today);
                localStorage.setItem('tt_last_streak_notification_value', streak.best.toString());
            }
        }
    }


    // ============================================
    // FEATURE: AZUBI SKILL-CARD (Shareable Canvas)
    // ============================================

    function closeSkillCardModal() {
        const modal = document.getElementById('skillCardModal');
        modal.style.display = 'none';
        modal.classList.remove('active');
    }

    function getSkillCardData() {
        const streak = calculateStreak();
        const name = data.settings.name || 'Azubi';
        const ihk = data.settings.ihk || {};

        // Ausbildungsjahr berechnen
        let ausbildungsjahr = 1;
        if (ihk.start) {
            const startDate = new Date(ihk.start);
            const now = new Date();
            const diffYears = (now - startDate) / (1000 * 60 * 60 * 24 * 365.25);
            ausbildungsjahr = Math.max(1, Math.min(4, Math.ceil(diffYears)));
        }

        // Gesamtstunden & Tage berechnen
        let totalHours = 0, totalDays = 0, totalDiff = 0;
        (data.entries || []).forEach(e => {
            if (e.type === 'work' || e.type === 'school') {
                totalHours += e.worked || 0;
                totalDays++;
            }
            totalDiff += e.diff || 0;
        });

        // Notenschnitt berechnen
        let gradeAvg = 0;
        const grades = data.settings.school?.grades || {};
        const allGrades = Object.values(grades).flat().filter(n => !isNaN(parseFloat(n)) && n >= 1 && n <= 6).map(Number);
        if (allGrades.length > 0) {
            gradeAvg = allGrades.reduce((a, b) => a + b, 0) / allGrades.length;
        }

        // Titel bestimmen
        let title = 'Rookie';
        const s = streak.current;
        const d = totalDays;
        if (d >= 500 && s >= 20) title = 'Legende';
        else if (d >= 300 && s >= 15) title = 'Elite Worker';
        else if (d >= 200 && gradeAvg > 0 && gradeAvg <= 1.5) title = 'Streber-Maschine';
        else if (s >= 30) title = 'Streak-Monster';
        else if (d >= 200) title = 'Veteran';
        else if (s >= 10) title = 'Streak-König';
        else if (d >= 100 && gradeAvg > 0 && gradeAvg <= 2.0) title = 'Code-Ninja';
        else if (d >= 100) title = 'Pro Azubi';
        else if (d >= 50) title = 'Fleißig';
        else if (d >= 20) title = 'Aufsteiger';

        // OVR (Overall Rating) — 0-99 wie FIFA
        let ovr = 40; // Basis
        ovr += Math.min(d / 10, 20); // Max +20 für Tage
        ovr += Math.min(s * 0.8, 15); // Max +15 für Streak
        ovr += Math.min(totalHours / 100, 10); // Max +10 für Stunden
        if (gradeAvg > 0) ovr += Math.max(0, (4 - gradeAvg) * 5); // Max +15 für gute Noten
        ovr = Math.min(99, Math.round(ovr));

        return { name, title, ausbildungsjahr, streak, totalHours, totalDays, totalDiff, gradeAvg, ovr };
    }

    function renderSkillCard() {
        const canvas = document.getElementById('skillCardCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const d = getSkillCardData();
        const _prgb = getComputedStyle(document.documentElement).getPropertyValue('--primary-rgb').trim() || '168,85,247';
        const _phex = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#a855f7';

        // === BACKGROUND ===
        const bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#0c0c10');
        bgGrad.addColorStop(0.5, '#12101a');
        bgGrad.addColorStop(1, '#0a0a12');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        roundRect(ctx, 0, 0, W, H, 16);
        ctx.fill();

        // Subtle noise texture overlay
        for (let i = 0; i < 800; i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.012})`;
            ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
        }

        // Top gradient accent line
        const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, _phex);
        lineGrad.addColorStop(0.5, '#06b6d4');
        lineGrad.addColorStop(0.7, _phex);
        lineGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(0, 0, W, 2);

        // Faint glow top-left
        const glowGrad = ctx.createRadialGradient(60, 80, 0, 60, 80, 180);
        glowGrad.addColorStop(0, `rgba(${_prgb}, 0.08)`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, W, H);

        // === HEADER: OVR + Position ===
        ctx.fillStyle = _phex;
        ctx.font = '800 52px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(d.ovr.toString(), 28, 68);

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText('LJ ' + d.ausbildungsjahr, 30, 86);

        // === AVATAR AREA ===
        const avatarCx = W / 2, avatarCy = 170, avatarR = 52;
        // Ring
        ctx.beginPath();
        ctx.arc(avatarCx, avatarCy, avatarR + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${_prgb}, 0.3)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Circled initial
        const initGrad = ctx.createLinearGradient(avatarCx - avatarR, avatarCy - avatarR, avatarCx + avatarR, avatarCy + avatarR);
        initGrad.addColorStop(0, `rgba(${_prgb}, 0.15)`);
        initGrad.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
        ctx.beginPath();
        ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
        ctx.fillStyle = initGrad;
        ctx.fill();

        const initials = d.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        ctx.fillStyle = _phex;
        ctx.font = '700 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(initials, avatarCx, avatarCy + 13);

        // === NAME + TITLE ===
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.name, W / 2, 255);

        ctx.fillStyle = _phex;
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText(d.title.toUpperCase(), W / 2, 275);

        // === DIVIDER ===
        const divGrad = ctx.createLinearGradient(40, 0, W - 40, 0);
        divGrad.addColorStop(0, 'transparent');
        divGrad.addColorStop(0.5, `rgba(${_prgb}, 0.2)`);
        divGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divGrad;
        ctx.fillRect(40, 292, W - 80, 1);

        // === STAT BARS (FIFA-Style) ===
        const stats = [
            { label: 'STR', val: Math.min(99, d.streak.current * 3 + 20), desc: 'Streak' },
            { label: 'BST', val: Math.min(99, d.streak.best * 2 + 15), desc: 'Best Streak' },
            { label: 'HRS', val: Math.min(99, Math.round(d.totalHours / 20) + 20), desc: 'Stunden' },
            { label: 'DAY', val: Math.min(99, Math.round(d.totalDays / 5) + 15), desc: 'Tage' },
            { label: 'GRD', val: d.gradeAvg > 0 ? Math.min(99, Math.round((6 - d.gradeAvg) * 18)) : 0, desc: 'Noten' },
            { label: 'OVT', val: Math.min(99, Math.round(Math.abs(d.totalDiff) * 2) + 30), desc: 'Overtime' },
        ];

        const statStartY = 314;
        const statH = 28;
        const barX = 100, barW = 180, barH = 5;

        stats.forEach((s, i) => {
            const y = statStartY + i * statH;

            // Label
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(s.label, 30, y + 4);

            // Value
            ctx.fillStyle = s.val >= 80 ? '#10b981' : s.val >= 50 ? '#f8fafc' : 'rgba(255,255,255,0.5)';
            ctx.font = '700 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(s.val.toString(), 68, y + 4);

            // Bar bg
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.beginPath();
            roundRect(ctx, barX, y - 2, barW, barH, 2);
            ctx.fill();

            // Bar fill
            const fillW = (s.val / 99) * barW;
            const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
            if (s.val >= 80) {
                barGrad.addColorStop(0, '#10b981');
                barGrad.addColorStop(1, '#06b6d4');
            } else if (s.val >= 50) {
                barGrad.addColorStop(0, _phex);
                barGrad.addColorStop(1, '#06b6d4');
            } else {
                barGrad.addColorStop(0, `rgba(${_prgb},0.4)`);
                barGrad.addColorStop(1, `rgba(${_prgb},0.2)`);
            }
            ctx.fillStyle = barGrad;
            ctx.beginPath();
            roundRect(ctx, barX, y - 2, fillW, barH, 2);
            ctx.fill();

            // Stat description (right side)
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.font = '500 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(s.desc, W - 30, y + 4);
        });

        // === BOTTOM SECTION ===
        // Separator
        const div2Grad = ctx.createLinearGradient(40, 0, W - 40, 0);
        div2Grad.addColorStop(0, 'transparent');
        div2Grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
        div2Grad.addColorStop(1, 'transparent');
        ctx.fillStyle = div2Grad;
        ctx.fillRect(40, 488, W - 80, 1);

        // Branding
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '600 9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MyWorkLog  ·  myworklog.de', W / 2, 510);

        // Date stamp
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = '500 8px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(dateStr, W - 20, 510);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function downloadSkillCard() {
        const canvas = document.getElementById('skillCardCanvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'MyWorkLog-SkillCard.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showCustomMessage('📥 Gespeichert', 'Skill-Card als PNG heruntergeladen!', 'success');
    }

    async function shareSkillCard() {
        const canvas = document.getElementById('skillCardCanvas');
        if (!canvas || !navigator.share) return;
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], 'MyWorkLog-SkillCard.png', { type: 'image/png' });
            await navigator.share({
                title: '🃏 Meine Azubi Skill-Card',
                text: 'Check meine MyWorkLog Skill-Card! 💪',
                files: [file]
            });
        } catch (e) {
            if (e.name !== 'AbortError') {
                showCustomMessage('⚠️ Teilen fehlgeschlagen', 'Nutze den Download-Button stattdessen.', 'warning');
            }
        }
    }

