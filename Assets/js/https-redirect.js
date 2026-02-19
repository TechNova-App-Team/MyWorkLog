/**
 * HTTPS Redirect Guard
 * Erzwingt HTTPS für sichere PWA-Operationen
 * Service Worker, Encryption & Sicherheit benötigen HTTPS
 */

(function() {
    'use strict';

    // Nur wenn nicht bereits HTTPS
    if (location.protocol !== 'https:') {
        // Redirect zu HTTPS-Version des gleichen URLs
        const httpsUrl = `https:${location.href.substring(location.protocol.length)}`;
        console.warn('🔒 HTTP erkannt. Redirect zu HTTPS:', httpsUrl);
        location.replace(httpsUrl);
    }
})();
