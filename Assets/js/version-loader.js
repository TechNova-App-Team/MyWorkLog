// ===== GLOBAL VERSION LOADER =====
let APP_CONFIG = {
    version: "3.3.4b",
    name: "MyWorkLog",
    status: "loading..."
};

// Load version from config/version.json (try root path first to avoid 404 from nested pages)
function loadAppVersion() {
    const cb = Date.now();
    const candidates = [
        `${window.location.origin}/config/version.json?cb=${cb}`,
        `/config/version.json?cb=${cb}`,
        `./config/version.json?cb=${cb}`
    ];

    // Try candidates sequentially until one succeeds
    (function tryNext(i) {
        if (i >= candidates.length) {
            console.warn('⚠️ Could not load version config from any path, using fallback');
            updateVersionElements();
            return;
        }

        const url = candidates[i];
        fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
            .then(response => {
                if (!response.ok) throw new Error('Version config not found: ' + url);
                return response.json();
            })
            .then(config => {
                APP_CONFIG = config;
                console.log(`✅ MyWorkLog v${APP_CONFIG.version} loaded from ${url}`);
                try { handleVersionChange(APP_CONFIG.version); } catch (e) { console.warn('Update handler failed', e); }
                updateVersionElements();
            })
            .catch(() => {
                // try next candidate
                tryNext(i + 1);
            });
    })(0);
}

// Update all elements with [data-version] attribute
function updateVersionElements() {
    // Update version display elements
    document.querySelectorAll('[data-version]').forEach(el => {
        el.textContent = APP_CONFIG.version;
    });
    
    // Update version in footer/about sections
    document.querySelectorAll('[data-app-version]').forEach(el => {
        el.textContent = `v${APP_CONFIG.version}`;
    });
    
    // Update title if it contains VERSION placeholder
    const titleEl = document.querySelector('title');
    if (titleEl && titleEl.innerHTML.includes('VERSION')) {
        titleEl.innerHTML = titleEl.innerHTML.replace('VERSION', APP_CONFIG.version);
    }
    
    // Log to console
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('📦 App Configuration:', APP_CONFIG);
    }
}

// Auto-load on DOM ready
document.addEventListener('DOMContentLoaded', loadAppVersion);
// Also try on window load as backup
window.addEventListener('load', () => {
    if (APP_CONFIG.status === 'loading...') loadAppVersion();
});

// Handle version changes: notify SW and reload clients so users get newest production build
function handleVersionChange(newVersion) {
    try {
        const last = localStorage.getItem('lastSeenVersion');
        // First time visit: just store
        if (!last) {
            localStorage.setItem('lastSeenVersion', newVersion);
            return;
        }

        if (last === newVersion) return;

        // New version detected — attempt a seamless update
        console.log(`[update] version changed: ${last} → ${newVersion}`);

        // Listen for controller change to reload when new SW takes control
        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener('controllerchange', function() {
                window.location.reload();
            });

            // Ask waiting worker to activate, or tell active controller to skip waiting
            if (navigator.serviceWorker.getRegistration) {
                navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg && reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    } else if (navigator.serviceWorker.controller) {
                        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                    }
                }).catch(() => {
                    if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                });
            } else if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            }
        }

        // Also try clearing caches programmatically (best-effort)
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(n => caches.delete(n))).catch(() => {});
        }

        // Persist new version so we don't loop
        localStorage.setItem('lastSeenVersion', newVersion);
    } catch (err) {
        console.warn('handleVersionChange err', err);
    }
}

// Expose globally for debugging
window.getAppVersion = () => APP_CONFIG.version;
window.getAppConfig = () => APP_CONFIG;
