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
        localStorage.setItem('mwl_theme', theme);
    }

    // Load theme on init
    const savedTheme = localStorage.getItem('mwl_theme') || 'dark';
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
            const lastNotificationDate = localStorage.getItem('mwl_last_streak_notification_date');
            const lastNotificationValue = localStorage.getItem('mwl_last_streak_notification_value');
            
            // Nur anzeigen, wenn es heute noch nicht angezeigt wurde oder der Streak höher ist
            if (lastNotificationDate !== today || parseInt(lastNotificationValue || '0') < streak.best) {
                showSmartNotification('🔥 Neue Best-Streak!', `${streak.current} Tage in Folge mit Soll erfüllt!`, 'success');
                localStorage.setItem('mwl_last_streak_notification_date', today);
                localStorage.setItem('mwl_last_streak_notification_value', streak.best.toString());
            }
        }
    }



