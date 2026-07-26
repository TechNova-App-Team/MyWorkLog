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

    // ── STREAK-ICONS ────────────────────────────────────────────────────
    // Lucide-Style SVG statt Emojis: ein Emoji folgt nicht dem User-Akzent
    // (applyTheme aendert nur die CSS-Variablen) und bricht optisch gegen die
    // SVG-Waage direkt daneben. Nur die Pfade in der Map, Huelle einmal in
    // streakIconSVG() — kein Inline-Duplikat pro Icon.
    // Schluessel = Lucide-Iconname, damit nachvollziehbar bleibt, was hier steht.
    var STREAK_ICON_PATHS = {
        'snowflake':  '<line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
        'cloud-snow': '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/>',
        'wind':       '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
        'sprout':     '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
        'leaf':       '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
        'droplet':    '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
        'flame':      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        'zap':        '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
        'sun':        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
        'star':       '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>',
        'sparkles':   '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
        'moon-star':  '<path d="M18 5h4"/><path d="M20 3v4"/><path d="M20.98 12.79A9 9 0 1 1 11.21 3.02 7 7 0 0 0 20.98 12.79z"/>',
        'trophy':     '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
        'award':      '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
        'gem':        '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
        'rocket':     '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
        'crown':      '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.51.3l4.28-3.67a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.27 3.67a1 1 0 0 0 1.52-.3z"/><path d="M5 21h14"/>',
        'orbit':      '<path d="M20.34 6.48A10 10 0 0 1 10.27 21.85"/><path d="M3.66 17.52A10 10 0 0 1 13.74 2.15"/><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/>'
    };

    function streakIconSVG(name) {
        var d = STREAK_ICON_PATHS[name] || STREAK_ICON_PATHS.flame;
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"'
             + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    }

    // ── ZUFALLSVARIATION: Pool je Level ────────────────────────────────
    // Je hoeher die Serie, desto "wertiger" die Stufe. Innerhalb der Stufe
    // wechselt das Icon taeglich (siehe getDailyStreakIcon).
    var STREAK_ICON_POOLS = {
        none:   ['snowflake', 'cloud-snow', 'wind'],
        start:  ['sprout', 'leaf', 'droplet'],
        fire:   ['flame', 'zap', 'sun'],
        star:   ['star', 'sparkles', 'moon-star'],
        trophy: ['trophy', 'award', 'gem'],
        rocket: ['rocket', 'crown', 'orbit']
    };

    // Deterministisches Tages-Icon aus dem Pool der aktuellen Streak-Stufe:
    // wechselt einmal pro Tag, bleibt innerhalb des Tages stabil.
    // Tagesschluessel bewusst aus den LOKALEN Datumsteilen — toISOString()
    // waere auf einem lokal-mitternaechtlichen Date in MESZ der Vortag, das
    // Icon wuerde also schon um 22 Uhr umspringen statt um Mitternacht.
    function getDailyStreakIcon(streak, date) {
        var d = date || new Date();
        var pool;
        if (streak === 0)      pool = STREAK_ICON_POOLS.none;
        else if (streak < 5)   pool = STREAK_ICON_POOLS.start;
        else if (streak < 30)  pool = STREAK_ICON_POOLS.fire;
        else if (streak < 75)  pool = STREAK_ICON_POOLS.star;
        else if (streak < 150) pool = STREAK_ICON_POOLS.trophy;
        else                   pool = STREAK_ICON_POOLS.rocket;

        var dayKey = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        var h = 0;
        for (var i = 0; i < dayKey.length; i++) {
            h = ((h << 5) - h) + dayKey.charCodeAt(i);
            h |= 0;
        }
        return pool[Math.abs(h) % pool.length];
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
            // Nur die Zahl — das Label "Best" steht schon im Markup darueber,
            // und das Pokal-Icon sitzt jetzt links in der Kachel.
            try { elBest.innerText = streak.best; } catch (e) { console.warn('updateStreakCounter: failed to set streakBest', e); }
        } else {
            console.warn('updateStreakCounter: #streakBest not found');
        }

        // Icon basiert auf aktueller Streak — wähle eine tägliche Variation
        var iconName = getDailyStreakIcon(streak.current);

        if (elEmoji) {
            try {
                elEmoji.innerHTML = streakIconSVG(iconName);
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



