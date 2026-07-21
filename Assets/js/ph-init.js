// ═══ POSTHOG PAGEVIEW — Standalone-Seiten ═══
// Anonyme, cookiefreie Seitenerfassung. IDENTISCHE Config zur SPA (index.template.html):
// keine Personenprofile, kein Cookie, Autocapture aus, Web Vitals an.
//
// Warum diese Datei existiert: Ohne sie laedt NUR die SPA ('/') PostHog — jede
// Standalone-Seite (/rechte-checker/, /berichtsheft/, …) waere im Dashboard UND im
// Live-Ticker unsichtbar, obwohl sie besucht wird. Mit dieser Datei feuert jeder
// Aufruf einen anonymen $pageview (+ Web-Vitals fuer die Ladezeit).
//
// Auf Localhost bewusst deaktiviert (kein Dev-Rauschen in den Prod-Zahlen).
// Adblocker duerfen das blocken — in der DSGVO ausdruecklich zugesagt.
(function () {
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '' || location.protocol === 'file:') return;

    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    posthog.init('phc_yU64gT44sK6HkU4EvRote7oHGLiL9UhJgL6TXu2BRhUZ', {
        api_host: 'https://eu.i.posthog.com',
        person_profiles: 'never',
        autocapture: false,
        capture_pageview: true,
        capture_pageleave: true,
        capture_performance: true,   // Web Vitals (LCP/FCP/INP) — reine Messwerte, keine Personendaten
        persistence: 'localStorage',  // kein Cookie (Cookie-frei-Versprechen der Seite)
    });
})();
