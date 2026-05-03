// Supabase Konfiguration
const SUPABASE_CONFIG = {
    URL: 'https://fouucibowmukxvweratn.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdXVjaWJvd211a3h2d2VyYXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODMyMDAsImV4cCI6MjA4MjI1OTIwMH0.NVvNRLvewzF0r3iWQwrWTB1Zt9GRj5RAnlzv8btrv_w'
};

var _supabaseLoading = false;
var _supabaseCallbacks = [];

// Load Supabase CDN and initialize cloudSync — call this before any Supabase operation
function loadSupabase(callback) {
    if (window.cloudSync) { if (callback) callback(); return; }
    if (typeof callback === 'function') _supabaseCallbacks.push(callback);
    if (_supabaseLoading) return;

    if (window.supabase) {
        _flushSupabase();
        return;
    }

    _supabaseLoading = true;
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = _flushSupabase;
    s.onerror = function() { console.error('[Supabase] CDN konnte nicht geladen werden'); _supabaseLoading = false; };
    document.head.appendChild(s);
}

function _flushSupabase() {
    _supabaseLoading = false;
    if (!window.cloudSync && typeof SupabaseCloudSync !== 'undefined') {
        window.cloudSync = new SupabaseCloudSync(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
        // Initialize the UI layer that mobile-nav-extras.js normally sets up via polling
        if (!window.cloudSyncUI && typeof SupabaseCloudSyncUI !== 'undefined') {
            try {
                window.cloudSyncUI = new SupabaseCloudSyncUI(window.cloudSync);
                if (typeof setupCloudSyncIntegration === 'function') setupCloudSyncIntegration();
                if (typeof updateCloudSyncUI === 'function') {
                    var loggedIn = window.cloudSync.isLoggedIn && window.cloudSync.isLoggedIn();
                    var user = window.cloudSync.getCurrentUser && window.cloudSync.getCurrentUser();
                    updateCloudSyncUI(loggedIn, user);
                }
            } catch(e) { console.warn('[Supabase] UI init error:', e); }
        }
    }
    var cbs = _supabaseCallbacks.splice(0);
    cbs.forEach(function(cb) { try { cb(); } catch(e) {} });
}

document.addEventListener('DOMContentLoaded', function() {
    var hasSession = localStorage.getItem('sb-fouucibowmukxvweratn-auth-token');
    var hasOAuth   = location.hash.includes('access_token') || location.search.includes('code=');

    if (hasSession || hasOAuth) {
        loadSupabase();
    } else {
        // No session → show "not logged in" state right away instead of "Wird geladen..."
        if (typeof updateCloudSyncUI === 'function') updateCloudSyncUI(false, null);
    }

    // Patch openCloudLoginModal so Supabase loads on first login attempt
    var _origLogin = window.openCloudLoginModal;
    if (typeof _origLogin === 'function') {
        window.openCloudLoginModal = function() {
            loadSupabase(function() {
                if (typeof _origLogin === 'function') _origLogin();
            });
        };
    }
});
