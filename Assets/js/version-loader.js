// ===== GLOBAL VERSION LOADER =====
let APP_CONFIG = {
    version: "3.5.3",
    name: "MyWorkLog",
    status: "loading..."
};

// Load version from config/version.json (try root path first to avoid 404 from nested pages)
function loadAppVersion() {
    const cb = Date.now();
    const candidates = [
        `${window.location.origin}/config/version.json?cb=${cb}`,
        `/config/version.json?cb=${cb}`,
        `/config/version.json?cb=${cb}`
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

// "2026-07-21" -> "21. Juli 2026" bzw. "21 July 2026" auf /en/.
// Der Footer wird per fetch nachgeladen und laeuft damit an der statischen
// i18n-Pipeline vorbei; die Beschriftungen uebersetzt i18n-runtime.js, das
// Datum entsteht aber erst hier und muss die Sprache selbst beruecksichtigen.
const GERMAN_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const ENGLISH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatGermanDate(iso) {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (isNaN(day) || monthIdx < 0 || monthIdx > 11) return iso;
    const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    return isEn
        ? `${day} ${ENGLISH_MONTHS[monthIdx]} ${parts[0]}`
        : `${day}. ${GERMAN_MONTHS[monthIdx]} ${parts[0]}`;
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

    // Update release date in footer ("Zuletzt aktualisiert: ...")
    document.querySelectorAll('[data-release-date]').forEach(el => {
        el.textContent = formatGermanDate(APP_CONFIG.releaseDate);
    });

    // Aktive Service-Worker-Version daneben anzeigen (Update-Diagnose)
    updateSwVersionDisplay();

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

// ===== Service-Worker-Version im Footer (Update-Diagnose) =====
// Fragt den aktiven SW nach seiner Version (GET_VERSION → VERSION_INFO). Weil der SW
// mit `service-worker.js?v=<version.json>` registriert wird und seine Version aus dem
// Query liest, MUSS SW-Version == App-Version sein, sobald das Update vollständig aktiv ist.
// Grün ✓ = synchron/geladen. Amber ⟳ = neuer SW noch nicht aktiv (kurz warten / Reload).
function normVer(v) { return String(v == null ? '' : v).replace(/^v/i, '').trim(); }

function queryServiceWorkerVersion() {
    return new Promise(function (resolve) {
        try {
            if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { resolve(null); return; }
            let done = false;
            function handler(e) {
                if (e.data && e.data.type === 'VERSION_INFO') {
                    done = true;
                    navigator.serviceWorker.removeEventListener('message', handler);
                    resolve(e.data.version);
                }
            }
            navigator.serviceWorker.addEventListener('message', handler);
            navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
            setTimeout(function () {
                if (!done) { navigator.serviceWorker.removeEventListener('message', handler); resolve(null); }
            }, 1500);
        } catch (e) { resolve(null); }
    });
}

function updateSwVersionDisplay() {
    const badges = document.querySelectorAll('.sw-version-badge');
    if (!badges.length) return;
    const appV = normVer(APP_CONFIG && APP_CONFIG.version);
    queryServiceWorkerVersion().then(function (swVersion) {
        badges.forEach(function (b) {
            if (!swVersion) {
                b.textContent = '· SW –';
                b.className = 'sw-version-badge sw-unknown';
                b.title = 'Kein aktiver Service Worker (z.B. erster Besuch, SW installiert noch).';
                return;
            }
            const sw = normVer(swVersion);
            const match = sw === appV;
            b.textContent = '· SW v' + sw + (match ? ' ✓' : ' ⟳');
            b.className = 'sw-version-badge ' + (match ? 'sw-ok' : 'sw-pending');
            b.title = match
                ? 'Service Worker aktuell (v' + sw + ') — Update vollständig geladen.'
                : 'Update lädt noch: App v' + appV + ', aktiver SW v' + sw + '. Nach kurzem Warten oder Reload gleichen sie sich an.';
        });
    });
}

// Neu abfragen, sobald ein SW die Kontrolle übernimmt / bereit ist
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', function () { setTimeout(updateSwVersionDisplay, 300); });
    if (navigator.serviceWorker.ready && typeof navigator.serviceWorker.ready.then === 'function') {
        navigator.serviceWorker.ready.then(function () { setTimeout(updateSwVersionDisplay, 300); });
    }
}

// ===== SPRACHUMSCHALTER IM GETEILTEN FOOTER =====
// Warum hier: der Footer wird per fetch nachgeladen, sein Markup laeuft damit
// an der statischen i18n-Pipeline vorbei UND ein <script> darin wuerde nie
// laufen (per innerHTML eingefuegte Skripte fuehrt der Browser nicht aus).
// version-loader.js ist die einzige Datei, die JEDE Seite mit geteiltem Footer
// laedt (gezaehlt: 15 von 15) und die schon heute Footer-Elemente nachtraegt
// (data-app-version, data-release-date).
//
// 🔴 Die Ziele kommen aus den hreflang-Angaben DIESER Seite, nicht aus einer
// Pfad-Rechnung: `/en` + Pfad waere fuer /umfrage-ergebnis/, /repo-report/ und
// /legal/* ein Link in einen 404 — die haben keinen englischen Zwilling. Kein
// hreflang-Paar => der Schalter bleibt weg.
function wireFooterLangSwitch() {
    const box = document.getElementById('footerLang');
    if (!box || box.dataset.wired) return true;

    const linkDe = document.querySelector('link[rel="alternate"][hreflang="de"]');
    const linkEn = document.querySelector('link[rel="alternate"][hreflang="en"]');
    if (!linkDe || !linkEn) return true;   // kein Zwilling deklariert -> nichts anzeigen, aber fertig

    const toPath = (l) => { try { return new URL(l.href, location.origin).pathname; } catch (e) { return null; } };
    const pathDe = toPath(linkDe), pathEn = toPath(linkEn);
    if (!pathDe || !pathEn) return true;

    const aDe = document.getElementById('footerLangDe');
    const aEn = document.getElementById('footerLangEn');
    if (!aDe || !aEn) return true;

    const isEn = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    aDe.href = pathDe;
    aEn.href = pathEn;
    const active = isEn ? aEn : aDe;
    active.classList.add('is-on');
    active.setAttribute('aria-current', 'true');
    box.setAttribute('aria-label', isEn ? 'Language' : 'Sprache');
    box.dataset.wired = '1';
    box.hidden = false;
    return true;
}

// Der Footer trifft asynchron ein — einmal sofort versuchen, sonst auf sein
// Erscheinen warten und danach abschalten.
(function watchForFooter() {
    if (document.getElementById('footerLang')) { wireFooterLangSwitch(); return; }
    if (typeof MutationObserver !== 'function') return;
    const obs = new MutationObserver(() => {
        if (!document.getElementById('footerLang')) return;
        wireFooterLangSwitch();
        obs.disconnect();
    });
    const start = () => obs.observe(document.body, { childList: true, subtree: true });
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
    // Nach 20 s kommt kein Footer mehr — Beobachter nicht ewig laufen lassen.
    setTimeout(() => obs.disconnect(), 20000);
})();

// Auto-load on DOM ready
document.addEventListener('DOMContentLoaded', loadAppVersion);
// Also try on window load as backup
window.addEventListener('load', () => {
    if (APP_CONFIG.status === 'loading...') loadAppVersion();
});

// Handle version changes: nur lastSeenVersion tracken — KEIN Auto-SKIP_WAITING mehr.
// Begründung: Der Banner-Flow in onboarding.js (updateManager) ist die einzige Source-of-Truth
// für SW-Updates. Wenn hier parallel SKIP_WAITING + reload getriggert wird, gibt's einen
// Race mit dem Banner (Doppelt-Reload, halb-gecachte Assets, CSS-Glitch). Der SW selbst
// triggert updatefound → Banner zeigt sich → User klickt Apply → sauberer Reload.
function handleVersionChange(newVersion) {
    try {
        const last = localStorage.getItem('lastSeenVersion');
        if (!last || last !== newVersion) {
            if (last) console.log(`[update] version changed: ${last} → ${newVersion} (Banner uebernimmt)`);
            localStorage.setItem('lastSeenVersion', newVersion);
        }
    } catch (err) {
        console.warn('handleVersionChange err', err);
    }
}

// Expose globally for debugging
window.getAppVersion = () => APP_CONFIG.version;
window.getAppConfig = () => APP_CONFIG;
