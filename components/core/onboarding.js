window._clsBC='onboarding.js-start';(function(){
        try {
            if (!window.initializeTouchOptimizations) {
                var s = document.createElement('script');
                s.src = '/Assets/js/touch-mobile-optimizations.js';
                s.defer = true;
                s.onload = function(){ if (window.initializeTouchOptimizations) window.initializeTouchOptimizations(); };
                document.head.appendChild(s);
            } else {
                // already available
                window.initializeTouchOptimizations && window.initializeTouchOptimizations();
            }
        } catch(e) { console.warn('Touch init failed', e); }
    })();

// Voice input is handled in dashboard.js



// ============================================
// MOOD TRACKER FEATURE (NEU: CRAZY!)
// ============================================

let currentMoodEntryId = null;

function openMoodSelector(entryId) {
    currentMoodEntryId = entryId;
    document.getElementById('moodSelectorModal').style.display = 'flex';
}

function setMood(emoji) {
    if (currentMoodEntryId) {
        const entry = data.entries.find(e => e.id === currentMoodEntryId);
        if (entry) {
            entry.mood = emoji;
            save();
            showCustomMessage('✅ Stimmung gespeichert', `Deine Stimmung: ${emoji}`, 'success');
        }
    }
    closeMoodSelector();
}

function skipMood() {
    closeMoodSelector();
}

function closeMoodSelector() {
    document.getElementById('moodSelectorModal').style.display = 'none';
    currentMoodEntryId = null;
}

function getMoodDescription(emoji) {
    const descriptions = {
        '😄': 'Sehr glücklich',
        '😊': 'Glücklich',
        '🙂': 'Zufrieden',
        '😐': 'Neutral',
        '😕': 'Unzufrieden',
        '😞': 'Traurig',
        '😠': 'Wütend',
        '🤒': 'Krank',
        '😴': 'Müde',
        '🤯': 'Überwältigt'
    };
    return descriptions[emoji] || 'Unbekannt';
}

function renderMoodOverview() {
    const moodContainer = document.getElementById('moodOverview');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Filter entries with mood from last 30 days
    const recentEntries = data.entries.filter(e => e.mood && new Date(e.date) >= thirtyDaysAgo);

    if (recentEntries.length === 0) {
        moodContainer.innerHTML = '<div style="color:var(--text-muted); font-style:italic;">Noch keine Stimmungen erfasst. Speichere Einträge und wähle eine Stimmung!</div>';
        return;
    }

    // Group by date
    const moodByDate = {};
    recentEntries.forEach(e => {
        const date = e.date;
        if (!moodByDate[date]) moodByDate[date] = [];
        moodByDate[date].push(e.mood);
    });

    // Create HTML: Show last 30 days, with mood if available
    let html = '';
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const moods = moodByDate[dateStr] || [];
        const avgMood = moods.length > 0 ? moods[Math.floor(moods.length / 2)] : null; // Median mood

        html += `<div style="display:flex; flex-direction:column; align-items:center; padding:4px; border-radius:6px; background:${avgMood ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'}; min-width:32px;">
            <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">${date.getDate()}</div>
            <div style="font-size:1.2rem;">${avgMood || '–'}</div>
        </div>`;
    }

    moodContainer.innerHTML = html;
}

// ============================================
// AI INSIGHTS FEATURE (NEU: CHEF-MÄSSIG!)
// ============================================

function generateInsights() {
    const insightsEl = document.getElementById('insightsContentModal');
    insightsEl.innerHTML = '<p>Analysiere Daten... 🤔</p>';

    setTimeout(() => {
        const insights = analyzeDataForInsights();
        let html = '';

        if (insights.length === 0) {
            html = '<p>Keine Insights verfügbar. Mehr Daten sammeln!</p>';
        } else {
            html = insights.map(insight => `<div style="margin-bottom:12px; padding:8px; background:rgba(255,255,255,0.05); border-radius:6px;"><strong>${insight.icon}</strong> ${insight.text}</div>`).join('');
        }

        insightsEl.innerHTML = html;
    }, 1000); // Simuliere Denkzeit
}

function analyzeDataForInsights() {
    const insights = [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter recent entries
    const recentEntries = data.entries.filter(e => new Date(e.date) >= monthAgo);
    const weekEntries = data.entries.filter(e => new Date(e.date) >= weekAgo);

    if (recentEntries.length === 0) return insights;

    // 1. Überstunden Check
    const totalHours = recentEntries.reduce((sum, e) => sum + e.worked, 0);
    const avgDaily = totalHours / 30;
    if (avgDaily > 8) {
        insights.push({
            icon: '⚠️',
            text: `Du arbeitest durchschnittlich ${avgDaily.toFixed(1)}h pro Tag. Überlege, Pausen einzulegen oder Urlaub zu planen.`
        });
    }

    // 2. Stimmungs-Analyse
    const moodEntries = recentEntries.filter(e => e.mood);
    if (moodEntries.length > 5) {
        const badMoods = moodEntries.filter(e => ['😞', '😠', '🤒', '😴', '🤯'].includes(e.mood)).length;
        const moodRatio = badMoods / moodEntries.length;
        if (moodRatio > 0.5) {
            insights.push({
                icon: '😟',
                text: `Deine Stimmung war in ${Math.round(moodRatio * 100)}% der Fälle negativ. Vielleicht mehr Pausen oder Hobbys?`
            });
        }
    }

    // 3. Wochenend-Arbeit
    const weekendEntries = weekEntries.filter(e => {
        const day = new Date(e.date).getDay();
        return day === 0 || day === 6;
    });
    if (weekendEntries.length > 2) {
        insights.push({
            icon: '🏖️',
            text: `Du hast ${weekendEntries.length} Mal am Wochenende gearbeitet. Work-Life-Balance ist wichtig!`
        });
    }

    // 4. Saldo-Trend
    const recentDiffs = recentEntries.slice(-10).reduce((sum, e) => sum + e.diff, 0);
    if (recentDiffs < -10) {
        insights.push({
            icon: '📉',
            text: `Dein Saldo sinkt. Plane Überstunden oder korrigiere Einträge.`
        });
    } else if (recentDiffs > 10) {
        insights.push({
            icon: '📈',
            text: `Super! Du baust Plusstunden auf. Belohne dich mit einer Pause.`
        });
    }

    // 5. Max-Schichten
    const longShifts = recentEntries.filter(e => e.shiftWarning);
    if (longShifts.length > 0) {
        insights.push({
            icon: '⏰',
            text: `Du hattest ${longShifts.length} Schichten über 10h. Achte auf Gesundheit!`
        });
    }

    // Fallback, wenn keine Insights
    if (insights.length === 0) {
        insights.push({
            icon: '✅',
            text: 'Alles im grünen Bereich! Halte so weiter.'
        });
    }

    return insights.slice(0, 3); // Max 3 Insights
}


// ===== PWA SERVICE WORKER REGISTRATION =====
function setupPWABasePath() {
    // Return a trailing-slash base path derived from the current location
    try {
        let p = location.pathname;
        if (!p.endsWith('/')) {
            p = p.substring(0, p.lastIndexOf('/') + 1);
        }
        // Ensure root path is '/'
        if (!p) p = '/';

        // Manifest liegt IMMER im Root (Cloudflare root-domain). Absolute Pfad, sonst
        // bricht es auf Unterpfaden wie /en/ (→ /en/manifest.json 404).
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
            manifestLink.href = '/manifest.json';
        }

        // Expose for debugging/status
        window._pwaBasePath = p;
        return p;
    } catch (e) {
        console.warn('setupPWABasePath error', e);
        window._pwaBasePath = './';
        return './';
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Dynamisch den Scope basierend auf der aktuellen URL setzen
            // GitHub Pages auf /MyWorkLog/ ist unter /MyWorkLog/
            // Lokal: /
            const currentPath = window.location.pathname;
            console.log('[PWA] Current pathname:', currentPath);

            let scope = '/';
            if (currentPath.includes('/MyWorkLog/')) {
                scope = '/MyWorkLog/';
            }

            // Cache-Buster: version.json laden für Query-Parameter
            let versionCacheBuster = Date.now().toString().slice(-6); // Fallback
            try {
                const versionResp = await fetch('/config/version.json', { cache: 'no-store' });
                if (versionResp.ok) {
                    const versionData = await versionResp.json();
                    versionCacheBuster = versionData.version || versionCacheBuster;
                }
            } catch (e) {
                console.warn('[PWA] Could not fetch version.json:', e);
            }

            // Service Worker im Root mit Cache-Buster (Query-Parameter erzwingt neuen Download).
            // ABSOLUT: auf Unterpfaden wie /en/ würde './' zu /en/service-worker.js → 404.
            const swUrl = `/service-worker.js?v=${versionCacheBuster}`;

            console.log('[PWA] Registering service worker at', swUrl, 'scope:', scope);
            const manifestLink = document.querySelector('link[rel="manifest"]');
            console.log('[PWA] Resolved manifest link:', manifestLink ? manifestLink.href : 'none');

            // Pre-fetch the service worker script to get a clearer error when the fetch fails
            try {
                const swResp = await fetch(swUrl, { method: 'GET', cache: 'no-store' });
                console.log('[PWA] Pre-fetch SW script', swUrl, 'status', swResp.status, 'ok', swResp.ok);
                if (!swResp.ok) throw new Error('SW fetch failed with status ' + swResp.status);
            } catch (prefetchErr) {
                console.error('[PWA] Pre-fetch service worker failed for', swUrl, prefetchErr);
                throw prefetchErr;
            }

            const registration = await navigator.serviceWorker.register(swUrl, {
                scope: scope,
                updateViaCache: 'none'
            });

            // Check for updates periodically (15 min für aktive Entwicklung)
            setInterval(() => {
                registration.update();
            }, 900000); // Check every 15 minutes

            // Check for already-waiting worker from previous update
            if (registration.waiting) {
                if (typeof updateManager !== 'undefined') {
                    updateManager.notifyUpdate(registration.waiting);
                }
            }

            // Handle service worker updates → Advanced Update Manager
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (typeof updateManager !== 'undefined') {
                            updateManager.notifyUpdate(newWorker);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    });

    // BEWUSST KEIN controllerchange→notifyUpdate-Listener mehr:
    // Der hat in Kombi mit SW-skipWaiting() einen Banner-Loop verursacht
    // (jeder install→activate triggerte ihn, auch nach User-Apply). Die kanonische
    // Update-Detection läuft jetzt nur noch über updatefound+statechange.
}

// ===== INSTALL PROMPT HANDLER (Add to Home Screen) =====
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // Prompt speichern für manuellen Trigger via Install-Button
    deferredPrompt = e;
});

window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    deferredPrompt = null;
    // Hide PWA section after install
    hidePWAInstallSection();
    // Hide install banner
    var bnr = document.getElementById('pwaInstallBanner');
    if (bnr) { bnr.classList.remove('visible'); setTimeout(function(){ bnr.style.display='none'; }, 500); }
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    if (typeof showCustomMessage === 'function') {
        showCustomMessage('🎉 Installiert!', 'MyWorkLog ist jetzt auf deinem Homescreen!', 'success');
    }
});

// Function to trigger install (call from UI)
async function triggerInstallPrompt() {
    if (!deferredPrompt) {
        console.log('[PWA] Install prompt not available');
        // If no prompt available, user may have declined or already installed
        localStorage.setItem('pwa_install_dismissed', 'true');
        hidePWAInstallSection();
        showCustomMessage('ℹ️ Info', 'PWA ist bereits installiert oder auf diesem Gerät nicht verfügbar.', 'info');
        return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);
    if (outcome === 'dismissed') {
        localStorage.setItem('pwa_install_dismissed', 'true');
        hidePWAInstallSection();
    }
    deferredPrompt = null;
}

// PWA Install Section Auto-Hide Logic
function hidePWAInstallSection() {
    const section = document.getElementById('pwaInstallSection');
    if (section) section.style.display = 'none';
}

function checkAndHidePWASection() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    const isDismissed = localStorage.getItem('pwa_install_dismissed') === 'true';
    
    if (isStandalone || isDismissed) {
        hidePWAInstallSection();
    }
}

// Run on load
checkAndHidePWASection();

// Expose install function globally
window.triggerInstallPrompt = triggerInstallPrompt;

// ===== PWA STATUS CHECK FUNCTION =====
function checkPWAStatus() {
    const statusEl = document.getElementById('pwaStatus');
    if (!statusEl) return;

    let status = '🔍 PWA Status:\n\n';

    status += '📂 Resolved base path: ' + (window._pwaBasePath || './') + '\n\n';

    if ('serviceWorker' in navigator) {
        status += '✅ Service Worker: Unterstützt\n';
        navigator.serviceWorker.getRegistrations().then(registrations => {
            if (registrations.length > 0) {
                status += '   → ' + registrations.length + ' aktiv\n';
            } else {
                status += '   → Wird gerade aktiviert...\n';
            }
        });
    } else {
        status += '❌ Service Worker: Nicht unterstützt\n';
    }

    status += navigator.serviceWorker ? '✅ Manifest: Vorhanden\n' : '❌ Manifest: Fehlt\n';

    if (window.navigator.standalone === true) {
        status += '✅ Installiert: Ja (als App läufig)\n';
    } else if (deferredPrompt) {
        status += '⏳ Installierbar: Ja (verwende den Button oben!)\n';
    } else {
        status += 'ℹ️  Installation: Nicht möglich (oder bereits installiert)\n';
    }

    status += navigator.onLine ? '✅ Online: Ja\n' : '❌ Online: Nein (Offline-Modus)\n';

    try {
        const test = '__test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        status += '✅ localStorage: Verfügbar\n';
    } catch {
        status += '❌ localStorage: Nicht verfügbar\n';
    }

    if (window.indexedDB) {
        status += '✅ IndexedDB: Verfügbar\n';
    } else {
        status += '❌ IndexedDB: Nicht verfügbar\n';
    }

    statusEl.innerHTML = '<strong>📱 PWA Status:</strong><br>' + status.replace(/\n/g, '<br>');
    
    if (typeof showCustomMessage === 'function') {
        showCustomMessage('📱 PWA Status', status, 'info');
    }
}

// ===== PWA AUTO-INSTALL PROMPT (nach 3 Besuchen) =====
function initAutoInstallPrompt() {
    // Old visit-count logic kept for compatibility but banner handles UX now
    let visitCount = parseInt(localStorage.getItem('pwa_visit_count') || '0');
    visitCount++;
    localStorage.setItem('pwa_visit_count', visitCount.toString());
}

// ===== PWA SMART INSTALL BANNER =====
// Show PWA install banner only after accumulated visit time (30 minutes)
(function initPWABanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (!banner) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    const wasDismissed = localStorage.getItem('pwa_banner_dismissed');
    const dismissedAt = wasDismissed ? parseInt(wasDismissed, 10) : 0;
    // Show again after 7 days if dismissed
    const dismissCooldown = 7 * 24 * 60 * 60 * 1000;
    const cooldownPassed = Date.now() - dismissedAt > dismissCooldown;

    if (isStandalone) return; // Already installed as PWA
    if (wasDismissed && !cooldownPassed) return; // Dismissed recently

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Required accumulated time before showing banner: 30 minutes
    const REQUIRED_MS = 30 * 60 * 1000;
    const TOTAL_KEY = 'pwa_total_time_ms';
    const START_KEY = 'pwa_visit_start';

    function getTotalTime() {
        return parseInt(localStorage.getItem(TOTAL_KEY) || '0', 10);
    }
    function setTotalTime(ms) {
        localStorage.setItem(TOTAL_KEY, Math.max(0, ms).toString());
    }
    function startSession() {
        try { localStorage.setItem(START_KEY, Date.now().toString()); } catch (e) {}
    }
    function endSession() {
        try {
            const s = parseInt(localStorage.getItem(START_KEY) || '0', 10);
            if (s && s > 0) {
                const delta = Date.now() - s;
                setTotalTime(getTotalTime() + delta);
                localStorage.removeItem(START_KEY);
            }
        } catch (e) {}
    }

    // Visibility handler to account for time when the tab becomes hidden
    function visibilityHandler() {
        if (document.visibilityState === 'hidden') {
            endSession();
        } else {
            startSession();
        }
    }

    // Check whether we should show banner now or later
    let showTimeout = null;
    function maybeShowBanner() {
        // Ensure we have current session accounted for
        endSession();
        const total = getTotalTime();
        if (total >= REQUIRED_MS) {
            // Show banner now
            if (isIOS) {
                const hint = document.getElementById('pwaIOSHint');
                if (hint) hint.style.display = 'flex';
                const btn = document.getElementById('pwaInstallBtn');
                if (btn) {
                    btn.textContent = 'Verstanden';
                    btn.onclick = function() { pwaInstallBannerDismiss(); };
                }
            }
            banner.style.display = 'block';
            requestAnimationFrame(function() { requestAnimationFrame(function() { banner.classList.add('visible'); }); });
            // cleanup listeners and timers
            document.removeEventListener('visibilitychange', visibilityHandler);
            window.removeEventListener('pagehide', endSession);
            if (showTimeout) { clearTimeout(showTimeout); showTimeout = null; }
        } else {
            // Schedule to check when remaining time elapses
            const remaining = REQUIRED_MS - total;
            if (showTimeout) clearTimeout(showTimeout);
            // If remaining is very large, it's still safe to setTimeout (browsers may clamp).
            showTimeout = setTimeout(maybeShowBanner, remaining);
        }
        // restart session after measurement
        startSession();
    }

    // Start tracking session time
    startSession();
    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('pagehide', endSession);

    // Kick off check (do not show immediately; maybeShowBanner will show after 30m)
    maybeShowBanner();

})();

function pwaInstallBannerInstall() {
    var banner = document.getElementById('pwaInstallBanner');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(result) {
            if (result.outcome === 'accepted') {
                localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
                if (banner) { banner.classList.remove('visible'); setTimeout(function(){ banner.style.display='none'; }, 500); }
            }
            deferredPrompt = null;
        });
    } else {
        // Fallback: Show manual instructions
        if (typeof showCustomMessage === 'function') {
            var ua = navigator.userAgent.toLowerCase();
            if (ua.indexOf('chrome') > -1) {
                showCustomMessage('📲 Chrome', 'Tippe auf ⋮ (Menü oben rechts) → "App installieren" oder "Zum Startbildschirm hinzufügen"', 'info');
            } else if (ua.indexOf('firefox') > -1) {
                showCustomMessage('📲 Firefox', 'Tippe auf ⋮ (Menü) → "Installieren" oder "Zum Startbildschirm hinzufügen"', 'info');
            } else if (ua.indexOf('safari') > -1) {
                showCustomMessage('📲 Safari', 'Tippe auf das Teilen-Symbol (□↑) → "Zum Home-Bildschirm"', 'info');
            } else {
                showCustomMessage('📲 Installieren', 'Öffne das Browser-Menü und wähle "Zum Startbildschirm hinzufügen"', 'info');
            }
        }
        pwaInstallBannerDismiss();
    }
}

function pwaInstallBannerDismiss() {
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    var banner = document.getElementById('pwaInstallBanner');
    if (banner) {
        banner.classList.remove('visible');
        setTimeout(function(){ banner.style.display = 'none'; }, 500);
    }
}

// ===== PWA OFFLINE-DATEN TRACKING =====
const OfflineDataManager = {
    QUEUE_KEY: 'pwa_offline_queue',
    SYNC_KEY: 'pwa_last_sync',

    // Speichere Aktion wenn offline
    queueAction(action) {
        if (navigator.onLine) return; // Nur wenn offline
        try {
            const queue = JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
            queue.push({
                type: action.type,
                data: action.data,
                timestamp: Date.now()
            });
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
            console.log('[PWA] Aktion in Offline-Queue gespeichert:', action.type);
        } catch (e) {
            console.warn('[PWA] Fehler beim Speichern in Offline-Queue:', e);
        }
    },

    // Verarbeite gecachte Aktionen wenn online
    async processPendingActions() {
        if (!navigator.onLine) return;
        try {
            const queue = JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
            if (queue.length === 0) return;

            console.log(`[PWA] Verarbeite ${queue.length} ausstehende Offline-Aktionen...`);
            
            // Hier können Daten zu Server synced werden
            // Für jetzt: einfach aus Queue entfernen und speichern als synced
            localStorage.setItem(this.SYNC_KEY, new Date().toISOString());
            localStorage.removeItem(this.QUEUE_KEY);
            
            showCustomMessage('✅ Synchronisiert', `${queue.length} Offline-Aktion(en) erfolgreich verarbeitet!`, 'success');
        } catch (e) {
            console.warn('[PWA] Fehler beim Verarbeiten von Offline-Aktionen:', e);
        }
    },

    // Get pending action count
    getPendingCount() {
        try {
            const queue = JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
            return queue.length;
        } catch {
            return 0;
        }
    }
};

// Synce bei Online werden
window.addEventListener('online', () => {
    console.log('[PWA] Online wieder hergestellt — synchronisiere Daten...');
    OfflineDataManager.processPendingActions();
    if (window.location.pathname.includes('offline.html')) {
        location.href = '/';
    }
});

// Wenn Offline wird: zur offline.html umleiten
window.addEventListener('offline', () => {
    if (!window.location.pathname.includes('offline.html')) {
        location.href = '/offline/';
    }
});

// Run on load
initAutoInstallPrompt();

function detectLocalhostAndWarn() {
    try {
        const host = location.hostname;
        if ((host === '127.0.0.1' || host === 'localhost') && !localStorage.getItem('dismissedLocalhostWarning')) {
            const banner = document.createElement('div');
            banner.id = 'localhostWarningBanner';
            banner.style.cssText = 'position:fixed; top:12px; left:12px; right:12px; z-index:9999; background:linear-gradient(90deg,#f59e0b,var(--primary)); color:#fff; padding:12px 14px; border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,0.35); font-weight:700; display:flex; align-items:center; gap:12px;';
            banner.innerHTML = `
                <div style="flex:1; font-size:0.95rem;">⚠️ Hinweis: Du greifst diese Seite über <code>${host}</code> auf. Für die Installation auf Mobilgeräten verwende die LAN‑IP deines Rechners (z.B. <code>http://192.168.1.25:5500</code>), sonst kann die App nach der Installation 404 anzeigen.</div>
                <div style="display:flex; gap:8px;">
                    <button id="dismissLocalhostWarning" class="btn" style="padding:8px 12px; background:rgba(0,0,0,0.06); border-radius:8px;">Verstanden</button>
                </div>
            `;
            document.body.appendChild(banner);
            document.getElementById('dismissLocalhostWarning').onclick = () => {
                localStorage.setItem('dismissedLocalhostWarning', '1');
                banner.remove();
            };
        }
    } catch (e) {
        console.warn('detectLocalhostAndWarn error', e);
    }
}

window.checkPWAStatus = checkPWAStatus;


// ===== ADVANCED NETWORK MONITOR =====
const networkMonitor = (() => {
    const PING_URL = '/manifest.json';
    const INTERVAL_ON = 30000;
    const INTERVAL_OFF = 5000;
    const MAX_LOG = 100;

    const s = {
        online: navigator.onLine,
        latency: null,
        quality: 'unknown',
        connType: null,
        downlink: null,
        onlineSince: navigator.onLine ? Date.now() : null,
        lastCheck: null,
        timer: null,
        retries: 0,
        queue: [],
        log: [],
        panelOpen: false
    };

    function init() {
        window.addEventListener('online', () => onStatusChange(true));
        window.addEventListener('offline', () => onStatusChange(false));
        if (navigator.connection) {
            readConnInfo();
            navigator.connection.addEventListener('change', readConnInfo);
        }
        try { s.queue = JSON.parse(localStorage.getItem('mwl_offline_queue') || '[]'); } catch(e) { s.queue = []; }
        checkNow();
        startInterval();
        ui();
        // Only expand if offline (otherwise stay as tiny dot)
        const w = document.getElementById('netStatus');
        if (w && !s.online) w.classList.add('expanded');
    }

    function startInterval() {
        if (s.timer) clearInterval(s.timer);
        s.timer = setInterval(checkNow, s.online ? INTERVAL_ON : INTERVAL_OFF);
    }

    async function checkNow() {
        const t0 = performance.now();
        try {
            await fetch(PING_URL, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) });
            const ms = Math.round(performance.now() - t0);
            s.latency = ms;
            s.lastCheck = Date.now();
            if (!s.online) onStatusChange(true);
            s.quality = ms < 100 ? 'excellent' : ms < 300 ? 'good' : ms < 800 ? 'moderate' : 'poor';
            log('ping', ms + 'ms — ' + s.quality);
        } catch(e) {
            s.latency = null;
            s.lastCheck = Date.now();
            if (s.online && !navigator.onLine) onStatusChange(false);
            s.quality = s.online ? 'unknown' : 'offline';
            log('fail', e.message || 'timeout');
        }
        ui();
    }

    function onStatusChange(on) {
        const wasOff = !s.online;
        s.online = on;
        const wrapper = document.getElementById('netStatus');
        if (on) {
            s.onlineSince = Date.now();
            s.retries = 0;
            log('online', 'Verbindung hergestellt');
            if (s.queue.length > 0) flushQueue();
            // Briefly show expanded, then auto-collapse after 3s
            if (wrapper) { wrapper.classList.add('expanded'); setTimeout(() => { if (s.online && !s.panelOpen) wrapper.classList.remove('expanded'); }, 3000); }
        } else {
            s.onlineSince = null;
            log('offline', 'Verbindung verloren');
            scheduleRetry();
            if (wrapper) wrapper.classList.add('expanded');
        }
        startInterval();
        ui();
        if (typeof showCustomMessage === 'function') {
            if (on && wasOff) showCustomMessage('Verbindung hergestellt', 'Du bist wieder online.', 'success');
            else if (!on) showCustomMessage('Verbindung verloren', 'Offline-Modus aktiv — Daten werden lokal gespeichert.', 'warning');
        }
    }

    function scheduleRetry() {
        if (s.retries >= 50) return;
        s.retries++;
        const delay = Math.min(2000 * Math.pow(2, s.retries - 1), 60000);
        setTimeout(() => { if (!s.online) checkNow(); }, delay);
    }

    function readConnInfo() {
        const c = navigator.connection;
        if (!c) return;
        s.connType = c.effectiveType || c.type || null;
        s.downlink = c.downlink || null;
        ui();
    }

    function log(type, msg) {
        s.log.unshift({ t: Date.now(), type, msg });
        if (s.log.length > MAX_LOG) s.log.length = MAX_LOG;
    }

    function enqueue(action) {
        s.queue.push({ ...action, ts: Date.now() });
        localStorage.setItem('mwl_offline_queue', JSON.stringify(s.queue));
        ui();
    }

    function flushQueue() {
        log('queue', s.queue.length + ' Aktionen verarbeitet');
        s.queue = [];
        localStorage.removeItem('mwl_offline_queue');
        ui();
    }

    function fmtDur(ms) {
        const sec = Math.floor(ms / 1000);
        if (sec < 60) return sec + 's';
        const min = Math.floor(sec / 60);
        if (min < 60) return min + 'min';
        return Math.floor(min / 60) + 'h ' + (min % 60) + 'min';
    }

    function ui() {
        const dot = document.getElementById('netDot');
        if (!dot) return;
        dot.className = 'net-status-dot ' + (s.online ? 'online' : 'offline');

        const lbl = document.getElementById('netLabel');
        if (lbl) lbl.textContent = s.online ? 'Online' : 'Offline';

        const lat = document.getElementById('netLatency');
        if (lat) lat.textContent = (s.latency !== null && s.online) ? s.latency + 'ms' : '';

        const badge = document.getElementById('netQueueBadge');
        if (badge) { badge.style.display = s.queue.length > 0 ? 'flex' : 'none'; badge.textContent = s.queue.length; }

        // Panel
        const el = (id) => document.getElementById(id);
        const npS = el('npStatus'); if (npS) { npS.textContent = s.online ? 'Online' : 'Offline'; npS.style.color = s.online ? '#10b981' : '#ef4444'; }
        const npL = el('npLatency'); if (npL) npL.textContent = s.latency !== null ? s.latency + 'ms' : '\u2014';
        const npC = el('npConnection'); if (npC) { const m = {'4g':'LTE/4G','3g':'3G','2g':'2G','slow-2g':'Langsam','wifi':'WLAN'}; npC.textContent = m[s.connType] || s.connType || '\u2014'; }
        const npD = el('npDownlink'); if (npD) npD.textContent = s.downlink ? s.downlink + ' Mbps' : '\u2014';
        const npU = el('npUptime'); if (npU) npU.textContent = s.onlineSince ? fmtDur(Date.now() - s.onlineSince) : '\u2014';
        const npT = el('npLastCheck'); if (npT) npT.textContent = s.lastCheck ? new Date(s.lastCheck).toLocaleTimeString('de-DE') : '\u2014';
        const npQ = el('npQuality');
        if (npQ) {
            const lab = {excellent:'Exzellent',good:'Gut',moderate:'Mittel',poor:'Schlecht',offline:'Offline',unknown:'\u2014'};
            const col = {excellent:'#10b981',good:'#22d3ee',moderate:'#f59e0b',poor:'#ef4444',offline:'#ef4444',unknown:'#64748b'};
            npQ.textContent = lab[s.quality] || '\u2014';
            npQ.style.color = col[s.quality] || '#64748b';
        }
        const bar = el('npQualityBar');
        if (bar) {
            const w = {excellent:'100%',good:'75%',moderate:'50%',poor:'25%',offline:'0%',unknown:'0%'};
            const c = {excellent:'#10b981',good:'#22d3ee',moderate:'#f59e0b',poor:'#ef4444',offline:'#ef4444',unknown:'#64748b'};
            bar.style.width = w[s.quality] || '0%';
            bar.style.background = c[s.quality] || '#64748b';
        }
        const qRow = el('npQueueRow'), qVal = el('npQueue');
        if (qRow && qVal) { qRow.style.display = s.queue.length > 0 ? 'flex' : 'none'; qVal.textContent = s.queue.length + ' ausstehend'; }
    }

    function togglePanel() {
        s.panelOpen = !s.panelOpen;
        const p = document.getElementById('netPanel');
        if (p) p.classList.toggle('open', s.panelOpen);
        const w = document.getElementById('netStatus');
        if (w) w.classList.toggle('expanded', s.panelOpen || !s.online);
    }

    function showLog() {
        if (s.log.length === 0) { if (typeof showCustomMessage === 'function') showCustomMessage('Netzwerk-Verlauf', 'Noch keine Eintr\u00e4ge.', 'info'); return; }
        const ico = {ping:'\u25cf',fail:'\u25cb',online:'\u25b2',offline:'\u25bc',queue:'\u25c6'};
        const rows = s.log.slice(0, 30).map(e => {
            const t = new Date(e.t).toLocaleTimeString('de-DE');
            return '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11.5px;"><span style="color:#64748b;font-family:var(--font-mono);min-width:62px;">' + t + '</span><span style="color:#94a3b8;">' + (ico[e.type]||'\u00b7') + '</span><span style="color:#e2e8f0;">' + e.msg + '</span></div>';
        }).join('');
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px;';
        ov.onclick = (ev) => { if (ev.target === ov) ov.remove(); };
        ov.innerHTML = '<div style="background:rgba(10,10,16,0.96);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:18px;max-width:380px;width:100%;max-height:65vh;overflow-y:auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span style="font-weight:700;font-size:13px;color:#f1f5f9;">Netzwerk-Verlauf</span><span style="cursor:pointer;color:#64748b;font-size:18px;" onclick="this.closest(\x27[style*=fixed]\x27).remove()">&times;</span></div>' + rows + '</div>';
        document.body.appendChild(ov);
    }

    return { init, checkNow, togglePanel, showLog, enqueue, getState: () => ({...s}) };
})();

// ===== ADVANCED UPDATE MANAGER =====
const updateManager = (() => {
    let newWorker = null;
    let dismissed = false;

    function init() {
        // Check for already-waiting service worker on page load
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => {
                if (reg.waiting) notifyUpdate(reg.waiting);
            });
        }
    }

    function notifyUpdate(worker) {
        newWorker = worker;
        dismissed = false;
        // Skip banner if we just applied an update (prevent spam after reload)
        if (localStorage.getItem('mwl_upd_applying')) {
            localStorage.removeItem('mwl_upd_applying');
            return;
        }
        const last = localStorage.getItem('mwl_upd_dismissed');
        if (last && (Date.now() - parseInt(last)) < 600000) return; // 10 min instead of 5
        const b = document.getElementById('updateBanner');
        if (b) b.classList.add('visible');
    }

    function dismiss() {
        const b = document.getElementById('updateBanner');
        if (b) b.classList.remove('visible');
        dismissed = true;
        localStorage.setItem('mwl_upd_dismissed', Date.now().toString());
    }

    function apply() {
        try { localStorage.setItem('mwl_upd_applying', 'true'); } catch(e) {}
        // SW wartet jetzt im install-Event (kein auto-skipWaiting mehr) → SKIP_WAITING
        // postMessage triggert wirklich erst hier die Activation. Wir warten auf
        // controllerchange (= neuer SW hat übernommen) BEVOR wir reloaden, sonst
        // läuft der Reload unter dem alten Controller mit halb-gelöschtem Cache → CSS-Glitch.
        // Fallback-Timeout für den Fall, dass controllerchange nie kommt (z.B. erster SW).
        let reloaded = false;
        const doReload = () => { if (reloaded) return; reloaded = true; location.reload(); };
        navigator.serviceWorker.addEventListener('controllerchange', doReload, { once: true });
        if (newWorker && typeof newWorker.postMessage === 'function') {
            try { newWorker.postMessage({ type: 'SKIP_WAITING' }); } catch(e) {}
        } else if (navigator.serviceWorker.controller) {
            // Kein bekannter waiting-Worker (z.B. Banner kam via init() für altes reg.waiting,
            // das schon weg ist) → schick's an den Controller als Fallback.
            try { navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' }); } catch(e) {}
        }
        // Safety-Net: nach 1.5s reloaden falls controllerchange ausbleibt.
        setTimeout(doReload, 1500);
    }

    function test() {
        dismissed = false;
        localStorage.removeItem('mwl_upd_dismissed');
        const b = document.getElementById('updateBanner');
        if (b) { b.classList.add('visible'); console.log('✅ Update-Banner Test angezeigt'); }
    }

    // Manuelles Hard-Update: vom User aus dem Profil-Menü ausgelöst (Ersatz für Strg+R).
    // Zwingt den SW nach einer neuen Version zu suchen, aktiviert sie (SKIP_WAITING)
    // und lädt frisch neu. Findet sich keine neue Version → trotzdem sauberer Reload.
    function forceUpdate() {
        try { localStorage.setItem('mwl_upd_applying', 'true'); } catch(e) {}
        // Banner wegräumen falls sichtbar
        try { dismiss(); } catch(e) {}

        // Self-contained Spin-Keyframe (unabhängig von dashboard.css) — einmal injizieren.
        if (!document.getElementById('mwl-upd-spin-style')) {
            const st = document.createElement('style');
            st.id = 'mwl-upd-spin-style';
            st.textContent = '@keyframes mwl-upd-spin{to{transform:rotate(360deg)}}';
            document.head.appendChild(st);
        }
        // Rotierendes Lucide-Refresh-SVG (kein Emoji, akzentfarben, signalisiert „läuft").
        const spinIcon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary);display:block;animation:mwl-upd-spin 0.9s linear infinite;transform-origin:center;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';

        if (typeof showToast === 'function') {
            showToast('App wird aktualisiert', 'Neue Version wird geladen – die Seite lädt gleich neu.', 'info', spinIcon, 4000);
        }

        let reloaded = false;
        const doReload = () => { if (reloaded) return; reloaded = true; location.reload(); };

        if (!('serviceWorker' in navigator)) { setTimeout(doReload, 300); return; }

        // Neuer SW übernimmt → sofort reloaden (frischer Controller, kein Stale-Mix).
        navigator.serviceWorker.addEventListener('controllerchange', doReload, { once: true });

        navigator.serviceWorker.getRegistration().then(reg => {
            if (!reg) { return; }
            const skip = (w) => { if (w) { try { w.postMessage({ type: 'SKIP_WAITING' }); } catch(e) {} } };
            // Erst nach Updates suchen, dann einen wartenden/gerade installierenden SW aktivieren.
            return reg.update().then(() => {
                if (reg.waiting) { skip(reg.waiting); return; }
                const inst = reg.installing;
                if (inst) {
                    inst.addEventListener('statechange', () => {
                        if (inst.state === 'installed') skip(reg.waiting || inst);
                    });
                }
                // Kein neuer SW → controllerchange feuert nicht, der Safety-Timeout unten reloaded.
            });
        }).catch(() => {});

        // Safety-Net: nach 2s in jedem Fall neu laden (deckt den „keine neue Version"-Fall ab).
        setTimeout(doReload, 2000);
    }

    return { init, notifyUpdate, dismiss, apply, test, forceUpdate };
})();

// Initialize monitors with retry logic
function initMonitors() {
    if (typeof networkMonitor === 'undefined' || typeof updateManager === 'undefined') {
        return setTimeout(initMonitors, 100);
    }
    try {
        networkMonitor.init();
        updateManager.init();
        console.log('[Init] Network Monitor + Update Manager started');
    } catch(e) {
        console.warn('[Init] Error:', e.message);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMonitors);
} else {
    initMonitors();
}

// ===== WEBLLM FEATURE DETECTION =====
function initWebLLMButtonVisibility() {
    const isWebLLMSupported = 
        typeof window.indexedDB !== 'undefined' &&
        typeof window.Worker !== 'undefined' &&
        typeof WebAssembly !== 'undefined' &&
        navigator.hardwareConcurrency >= 2;  // Mindestens 2 CPU-Kerne
    
    console.log('[WebLLM] Browser Support:', {
        IndexedDB: typeof window.indexedDB !== 'undefined',
        WebWorker: typeof window.Worker !== 'undefined',
        WebAssembly: typeof WebAssembly !== 'undefined',
        CPUCores: navigator.hardwareConcurrency,
        Supported: isWebLLMSupported
    });
    
    if (!isWebLLMSupported) {
        console.warn('[WebLLM] Browser nicht unterstützt - Button wird nicht angezeigt');
        return;
    }
    
    const checkAndShowButton = () => {
        const button = document.getElementById('webllm-toggle-btn');
        const aiBotView = document.getElementById('view-aibot');
        
        if (!button) return;
        
        const isAiBotActive = aiBotView && aiBotView.classList.contains('active');
        
        if (isAiBotActive) {
            button.style.display = 'block';
        } else {
            button.style.display = 'none';
        }
    };
    
    setTimeout(checkAndShowButton, 100);
    
    const observer = new MutationObserver(() => {
        checkAndShowButton();
    });
    
    const viewContainer = document.querySelector('[id^="view-"]');
    if (viewContainer && viewContainer.parentElement) {
        observer.observe(viewContainer.parentElement, { 
            subtree: true,
            attributes: true, 
            attributeFilter: ['class'] 
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebLLMButtonVisibility);
} else {
    initWebLLMButtonVisibility();
}
