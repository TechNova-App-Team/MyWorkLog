// ═══ ICONS MODULE ═══
//
// Eine Quelle fuer alle Icons, die JS zur Laufzeit erzeugt. Vorher trugen
// mindestens fuenf Dateien ihre eigene kleine Pfad-Sammlung (`apIcon` in
// analytics-pro.js, `INSIGHT_ICONS` in insights.js, weitere in settings-panel.js,
// support-feedback.js, ghost.js) — und der Rest der App behalf sich mit Emojis.
//
// 🔴 Emojis sind hier keine Option: sie faerben sich nicht mit dem Theme, werden
// auf jedem Betriebssystem anders gezeichnet und in einer anderen Schrift als der
// Rest der Oberflaeche. Siehe Skill `no-emojis` und CLAUDE.md.
//
// Alle Pfade sind unveraenderte Originale aus dem Lucide-Satz (lucide.dev).
// 🔴 Nie von Hand kuerzen oder nachzeichnen — ein Pfad, der ueber 0..24 hinaus
// laeuft, wird vom `<svg>` still abgeschnitten (`overflow: hidden` ist die
// Voreinstellung). Pruefen laesst sich das nur gemessen, nicht per Screenshot:
//
//   const b = svg.getBBox(), h = (parseFloat(getComputedStyle(svg).strokeWidth)||1.8)/2;
//   [b.x-h, b.y-h, b.x+b.width+h, b.y+b.height+h]   // muss in 0..24 liegen
//
// Test: node tools/icons.test.mjs

    var MWL_ICON_PATHS = {
        // ── Zustand & Meldung ───────────────────────────────────────────
        alert:        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        info:         '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        check:        '<path d="M20 6 9 17l-5-5"/>',
        checkCircle:  '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
        x:            '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        xCircle:      '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
        ban:          '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
        helpCircle:   '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        dot:          '<circle cx="12" cy="12" r="6"/>',

        // ── Zeit & Kalender ─────────────────────────────────────────────
        clock:        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        calendar:     '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
        calendarDays: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
        calendarCheck:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>',
        hourglass:    '<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
        history:      '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
        repeat:       '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
        refresh:      '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',

        // ── Daten & Diagramme ───────────────────────────────────────────
        barChart:     '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
        trendingUp:   '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
        trendingDown: '<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',
        target:       '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        gauge:        '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
        ruler:        '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
        scale:        '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',

        // ── Dateien & Speicher ──────────────────────────────────────────
        save:         '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
        download:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        upload:       '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
        fileText:     '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
        filePen:      '<path d="M12.5 22H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v9.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M13.378 15.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
        clipboard:    '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
        package:      '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
        book:         '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
        database:     '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',

        // ── Sicherheit ──────────────────────────────────────────────────
        lock:         '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        unlock:       '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
        keyRound:     '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>',
        shield:       '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
        shieldCheck:  '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
        eyeOff:       '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',

        // ── Geraete & Netz ──────────────────────────────────────────────
        smartphone:   '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
        monitor:      '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
        laptop:       '<path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z"/><path d="M20.054 15.987H3.946"/>',
        wifi:         '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
        satellite:    '<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
        cloud:        '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
        mail:         '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
        bell:         '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',

        // ── Wetter & Tageszeit ──────────────────────────────────────────
        sun:          '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
        moon:         '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
        cloudSun:     '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
        palmtree:     '<path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.06-.35 7.01l4.24-4.24.7-.7.71-.71 2.12-2.12c-1.95-1.96-4.86-1.8-7.02.35"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14"/>',
        umbrella:     '<path d="M12 2v20"/><path d="M22 12a10.06 10.06 1 0 0-20 0Z"/><path d="M12 22a2 2 0 0 1-2-2"/>',
        thermometer:  '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
        flame:        '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5"/>',
        zap:          '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
        coffee:       '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',

        // ── Orte, Personen, Bildung ─────────────────────────────────────
        mapPin:       '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
        globe:        '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
        building:     '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
        school:       '<path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10"/><path d="M18 5v17"/><path d="m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
        graduationCap:'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
        briefcase:    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
        userSearch:   '<circle cx="10" cy="7" r="4"/><path d="M10.3 15H7a4 4 0 0 0-4 4v2"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.9-1.9"/>',
        award:        '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
        star:         '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
        partyPopper:  '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>',
        rocket:       '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',

        // ── Werkzeuge & Steuerung ───────────────────────────────────────
        settings:     '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        wrench:       '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        search:       '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        trash:        '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
        palette:      '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
        flask:        '<path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/>',
        mic:          '<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>',
        tag:          '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
        menu:         '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
        hand:         '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
        lightbulb:    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',

        // ── Stimmung (Lucide-Gesichter) ─────────────────────────────────
        laugh:        '<circle cx="12" cy="12" r="10"/><path d="M18 13a6 6 0 0 1-6 5 6 6 0 0 1-6-5h12Z"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
        smile:        '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
        meh:          '<circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="15" y2="15"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
        frown:        '<circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
        angry:        '<circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><path d="M7.5 8 10 9"/><path d="m14 9 2.5-1"/><path d="M9 10h.01"/><path d="M15 10h.01"/>',
        annoyed:      '<circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><path d="M8 9h2"/><path d="M14 9h2"/>',
        // ── Wetter (Ergaenzung) ─────────────────────────────────────────
        cloudRain:    '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>',
        cloudSnow:    '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 15h.01"/><path d="M8 19h.01"/><path d="M12 17h.01"/><path d="M12 21h.01"/><path d="M16 15h.01"/><path d="M16 19h.01"/>',
        cloudLightning:'<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
        cloudFog:     '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7"/><path d="M17 21H9"/>',
        snowflake:    '<path d="m10 20-1.25-2.5L6 18"/><path d="M10 4 8.75 6.5 6 6"/><path d="m14 20 1.25-2.5L18 18"/><path d="m14 4 1.25 2.5L18 6"/><path d="m17 21-3-6h-4"/><path d="m17 3-3 6 1.5 3"/><path d="M2 12h6.5L10 9"/><path d="m20 10-1.5 2 1.5 2"/><path d="M22 12h-6.5L14 15"/><path d="m4 10 1.5 2L4 14"/><path d="m7 21 3-6-1.5-3"/><path d="m7 3 3 6h4"/>',
        sunrise:      '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
        sunset:       '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
        wind:         '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
        sparkles:     '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
        home:         '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        video:        '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
        wallet:       '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
        paperclip:    '<path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"/>',
        megaphone:    '<path d="M16 9v6"/><path d="M3 10a2 2 0 0 1 2-2h2.5L14 4v16l-6.5-4H5a2 2 0 0 1-2-2z"/><path d="M20 9v6"/>',
        plus:         '<path d="M5 12h14"/><path d="M12 5v14"/>',
        crown:        '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
        medal:        '<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>',
        arrowRight:   '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
        broom:        '<path d="m13 11 9-9"/><path d="M14.6 12.6c.8.8.9 2.1.2 3L10 22l-8-8 6.4-4.8c.9-.7 2.2-.6 3 .2z"/><path d="m6.8 10.4 6.8 6.8"/><path d="m5 17 1.4-1.4"/>',
        dizzy:        '<circle cx="12" cy="12" r="10"/><path d="M15.5 8.5 18 11"/><path d="m18 8.5-2.5 2.5"/><path d="M6 8.5 8.5 11"/><path d="M8.5 8.5 6 11"/><path d="M8 16s1.5-2 4-2 4 2 4 2"/>'
    };

    // Groesse per Attribut, damit ein SVG als Flex-Kind nicht schrumpft — width/height
    // sind nur die Basisgroesse, das `flex-shrink: 0` muss zusaetzlich im CSS stehen.
    function mwlIcon(name, size, cls) {
        var d = MWL_ICON_PATHS[name];
        if (!d) { console.warn('[icons] unbekanntes Icon:', name); d = MWL_ICON_PATHS.helpCircle; }
        var s = size || 16;
        return '<svg class="mwl-icon' + (cls ? ' ' + cls : '') + '" width="' + s + '" height="' + s +
               '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
               'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    }

    // Stimmung wird als Emoji-Zeichen im Eintrag GESPEICHERT (entry.mood) — das ist
    // gewachsener Nutzerdatenbestand und wird nicht angefasst. Nur die Anzeige
    // uebersetzt den gespeicherten Wert in ein Icon.
    var MWL_MOOD_ICONS = {
        '😄': 'laugh',    '😊': 'smile',   '🙂': 'smile',
        '😐': 'meh',      '😕': 'annoyed', '😞': 'frown',
        '😠': 'angry',    '🤒': 'thermometer', '😴': 'moon',
        '🤯': 'dizzy',    '😰': 'dizzy'
    };
    // Bruecke fuer Altbestand: viele Render-Funktionen reichen seit Jahren ein
    // Emoji-Zeichen als "Icon" durch (`showToast(t, m, type, '⚠️')`, `alert.icon`,
    // Vorlagen-Listen). Statt jede dieser Stellen einzeln umzubauen — und dabei
    // Aufrufer zu uebersehen, die aus gespeicherten Daten kommen — uebersetzt
    // diese Tabelle das Zeichen an der AUSGABE.
    // 🔴 Alles, was schon `<svg` ist, geht unveraendert durch: sonst wuerde ein
    //    bereits umgestellter Aufrufer sein Icon verlieren.
    var MWL_EMOJI_ICONS = {
        '⚠': 'alert', '✅': 'checkCircle', '❌': 'xCircle', 'ℹ': 'info',
        '✓': 'check', '✔': 'check', '✕': 'x', '✖': 'x', '✗': 'x', '✘': 'x',
        '📊': 'barChart', '📈': 'trendingUp', '📉': 'trendingDown',
        '📅': 'calendar', '📆': 'calendarDays', '🗓': 'calendarDays',
        '🕓': 'clock', '🕐': 'clock', '⏱': 'clock', '⌚': 'clock', '⏳': 'hourglass',
        '💡': 'lightbulb', '⚡': 'zap', '🔥': 'flame', '🚀': 'rocket',
        '🎯': 'target', '🏆': 'award', '⭐': 'star', '🎉': 'partyPopper',
        '🔒': 'lock', '🔓': 'unlock', '🔐': 'keyRound', '🛡': 'shield',
        '💾': 'save', '📥': 'download', '⬇': 'download', '📤': 'upload',
        '📦': 'package', '📋': 'clipboard', '📄': 'fileText', '📝': 'filePen',
        '📚': 'book', '🗑': 'trash', '🔍': 'search', '⚙': 'settings',
        '🔧': 'wrench', '🎨': 'palette', '🧪': 'flask', '🎤': 'mic',
        '📍': 'mapPin', '🌍': 'globe', '🌎': 'globe', '🌏': 'globe', '🌐': 'globe',
        '🏫': 'school', '🎓': 'graduationCap', '💼': 'briefcase',
        '📱': 'smartphone', '📲': 'smartphone', '🖥': 'monitor', '💻': 'laptop',
        '📡': 'satellite', '📶': 'wifi', '📨': 'mail', '📩': 'mail',
        '🔔': 'bell', '🏷': 'tag', '🔄': 'refresh', '🔁': 'repeat',
        '☀': 'sun', '🌙': 'moon', '🌤': 'cloudSun', '☁': 'cloud',
        '🌴': 'palmtree', '🏖': 'umbrella', '🤒': 'thermometer', '💊': 'thermometer',
        '☕': 'coffee', '⚖': 'scale', '📐': 'ruler', '💬': 'mail',
        '👤': 'userSearch', '🕵': 'userSearch', '👋': 'hand', '👆': 'hand',
        '🔴': 'dot', '🟢': 'dot', '🟡': 'dot', '⚪': 'dot',
        '😄': 'laugh', '😊': 'smile', '🙂': 'smile', '🤩': 'laugh',
        '😐': 'meh', '😕': 'annoyed', '😞': 'frown', '😠': 'angry',
        '😴': 'moon', '🤯': 'dizzy', '😰': 'dizzy', '✈': 'rocket',
        // Wetter
        '🌧': 'cloudRain', '🌨': 'cloudSnow', '⛈': 'cloudLightning',
        '🌫': 'cloudFog', '🌦': 'cloudRain', '⛅': 'cloudSun',
        '❄': 'snowflake', '🧊': 'snowflake', '🌡': 'thermometer',
        '🌅': 'sunrise', '🌇': 'sunset', '🌬': 'wind', '🌀': 'wind',
        '☔': 'cloudRain', '💧': 'cloudRain', '🌞': 'sun', '🌜': 'moon',
        // Weitere Oberflaeche
        '✨': 'sparkles', '🌟': 'sparkles', '🎆': 'sparkles', '🎊': 'partyPopper',
        '✍': 'filePen', '✏': 'filePen', '✒': 'filePen', '📌': 'mapPin',
        '☰': 'menu', '🧹': 'broom', '🍅': 'clock', '🏠': 'home',
        '🎬': 'video', '🚫': 'ban', '💰': 'wallet', '💸': 'wallet',
        '📎': 'paperclip', '💢': 'alert', '🤔': 'helpCircle',
        '😟': 'frown', '➕': 'plus', '📣': 'megaphone', '🚨': 'alert',
        '🏥': 'thermometer', '🩺': 'thermometer', '⛑': 'shield',
        '🏅': 'award', '🏋': 'award', '📔': 'book', '📘': 'book',
        '📁': 'package', '📂': 'package', '🧘': 'smile',
        '🏦': 'building', '📞': 'smartphone', '☎': 'smartphone', '📧': 'mail',
        '👑': 'crown', '🏅': 'medal', '➡': 'arrowRight', '⮕': 'arrowRight',
        '🔮': 'sparkles', '🏆': 'award'
    };
    function mwlIconFromEmoji(v, size) {
        if (v == null || v === '') return '';
        var str = String(v);
        if (str.indexOf('<svg') !== -1) return str;          // schon umgestellt
        // Variantenselektor und Hautton wegwerfen, dann das erste Zeichen nachschlagen
        var key = str.replace(/[︎️‍]/g, '').trim();
        var name = MWL_EMOJI_ICONS[key] || MWL_EMOJI_ICONS[Array.from(key)[0]];
        if (name) return mwlIcon(name, size);
        // 🔴 Nicht zugeordnet: der Wert kann aus Nutzerdaten stammen (eigene
        // Presets, gespeicherte Alerts). Er landet per innerHTML in der Seite,
        // also hier maskieren — sonst waere die Bruecke ein XSS-Weg.
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function mwlMoodIcon(mood, size) {
        return mwlIcon(MWL_MOOD_ICONS[mood] || 'smile', size || 16);
    }

    if (typeof window !== 'undefined') {
        window.mwlIcon = mwlIcon;
        window.mwlMoodIcon = mwlMoodIcon;
        window.mwlIconFromEmoji = mwlIconFromEmoji;
        window.MWL_EMOJI_ICONS = MWL_EMOJI_ICONS;
        window.MWL_ICON_PATHS = MWL_ICON_PATHS;
        window.MWL_MOOD_ICONS = MWL_MOOD_ICONS;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { mwlIcon: mwlIcon, mwlMoodIcon: mwlMoodIcon, mwlIconFromEmoji: mwlIconFromEmoji, MWL_EMOJI_ICONS: MWL_EMOJI_ICONS, MWL_ICON_PATHS: MWL_ICON_PATHS, MWL_MOOD_ICONS: MWL_MOOD_ICONS };
    }
