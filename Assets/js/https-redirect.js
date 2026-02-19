/**
 * HTTPS Redirect Guard
 * Erzwingt HTTPS für sichere PWA-Operationen
 * Service Worker, Encryption & Sicherheit benötigen HTTPS
 * 
 * ACHTUNG: robots.txt und sitemap.xml NICHT umleiten (SEO/Google-Bots)
 */

(function() {
    'use strict';

    // SEO Dateien die NICHT umgeleitet werden dürfen
    const seoFiles = [
        '/robots.txt',
        '/sitemap.xml',
        '/.well-known/'
    ];

    // Check ob aktuelle URL eine SEO-Datei ist
    const isSeoDocs = seoFiles.some(file => location.pathname.includes(file));

    // Nur wenn nicht bereits HTTPS und nicht SEO-Datei
    if (location.protocol !== 'https:' && !isSeoDocs) {
        // Redirect zu HTTPS-Version des gleichen URLs
        const httpsUrl = `https:${location.href.substring(location.protocol.length)}`;
        console.warn('🔒 HTTP erkannt. Redirect zu HTTPS:', httpsUrl);
        location.replace(httpsUrl);
    } else if (isSeoDocs) {
        console.log('📡 SEO-Datei erkannt — kein HTTPS-Redirect (Google-Bot Kompatibilität)');
    }
})();
