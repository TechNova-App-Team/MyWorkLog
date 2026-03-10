// ===== GLOBAL VERSION LOADER =====
let APP_CONFIG = {
    version: "3.3.3a",
    name: "MyWorkLog",
    status: "loading..."
};

// Load version from config/version.json
function loadAppVersion() {
    fetch('./config/version.json')
        .then(response => {
            if (!response.ok) throw new Error('Version config not found');
            return response.json();
        })
        .then(config => {
            APP_CONFIG = config;
            console.log(`✅ MyWorkLog v${APP_CONFIG.version} loaded`);
            updateVersionElements();
        })
        .catch(err => {
            console.warn('⚠️ Could not load version config, using fallback');
            // Fallback aus config/version.json wird oben gesetzt
            updateVersionElements();
        });
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

// Expose globally for debugging
window.getAppVersion = () => APP_CONFIG.version;
window.getAppConfig = () => APP_CONFIG;
