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
/* mwlEvent(name, props) — Zwilling der Fassung in index.template.html (dort inline,
   weil sie vor den defer-Skripten stehen muss; die App laedt diese Datei nicht).
   Aendert sich eine der beiden, die andere nachziehen.
   Regeln: nur Zaehl-Events, NIE Inhalte (keine Zeiten, Notizen, Namen, Betraege).
   Steht bewusst VOR dem Localhost-Ausstieg unten: die Funktion existiert dann immer,
   und ohne posthog faellt sie still durch — sonst muesste jede Aufrufstelle raten. */
window.mwlEvent = function (name, props) {
    try {
        if (typeof posthog === 'undefined' || !posthog.capture) return;
        posthog.capture(name, props || {});
    } catch (e) { /* Tracking darf die Seite nie kippen */ }
};

/* Unbehandelte Fehler zaehlen — Zwilling der Fassung in index.template.html, Gruende dort.
   Kurz: keine Fehlermeldung (kann Nutzerdaten zitieren), nur Typ/Datei/Zeile, max. 5. */
(function () {
    var n = 0;
    function melde(art, err, datei, zeile) {
        if (n >= 5 || typeof window.mwlEvent !== 'function') return;
        n++;
        window.mwlEvent('problem_js_fehler', {
            art: art,
            typ: (err && err.name) || 'unbekannt',
            datei: String(datei || '').split('?')[0].split('/').pop() || 'inline',
            zeile: zeile || 0
        });
    }
    window.addEventListener('error', function (e) {
        if (!e || (e.target && e.target !== window && e.target.tagName)) return;   // Ladefehler von <img>/<script>, kein JS-Fehler
        var m = String(e.message || '');
        if (m === 'Script error.' || m.indexOf('ResizeObserver') !== -1) return;
        melde('fehler', e.error, e.filename, e.lineno);
    });
    window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        // Erste Stack-Zeile mit Adresse: "…(https://host/pfad.js?v=1:120:7)" → Datei + Zeile.
        var st = r && r.stack ? String(r.stack) : '', i = st.indexOf('http'), datei = '', zeile = 0;
        if (i !== -1) {
            var teile = st.slice(i).split(')')[0].split(' ')[0].split(String.fromCharCode(10))[0].split(':');
            zeile = +teile[teile.length - 2] || 0;
            datei = teile.slice(0, -2).join(':');
        }
        melde('promise', r, datei, zeile);
    });
})();

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
