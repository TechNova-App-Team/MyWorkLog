================================================================================
  📊 ADVANCED ANALYTICS DASHBOARD - MyWorkLog
================================================================================
  Status: ✅ VOLLSTÄNDIG IMPLEMENTIERT
  Datum: 05. Februar 2026
  Umami API: cloud.umami.is
  Website ID: d1d5fc46-7a02-44a0-9016-7806d95dd51f
================================================================================


🎯 ÜBERSICHT
─────────────────────────────────────────────────────────────────────────────

Die neue Advanced Analytics-Seite bietet ein umfassendes Echtzeit-Dashboard zur
Überwachung des MyWorkLog-Traffic. Mit allen verfügbaren Umami API-Endpoints
werden detaillierte Statistiken zu Besuchern, Seitenaufrufen, Quellen,
Geographie und Technologie angezeigt.

Speicherort: Pages/Info/analytics.html
Erreichbar über: Navbar → "Tools & Werkzeuge" → "📊 Analytics"
Design: Dark Theme, responsive, optimiert für Mobile


================================================================================
  📊 UMAMI API-ENDPOINTS - DETAILLÜBERSICHT
================================================================================

┌─────────────────────────────────────────────────────────────────────────────┐
│ ENDPOINT                        │ DATEN                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ GET /active                     │ Echtzeit aktive Besucher (Live)         │
│                                 │ • Auto-Refresh alle 30 Sekunden         │
│                                 │ • Pulsierendes Live-Indicator           │
│                                 │                                         │
│ GET /stats                      │ KPI-Übersicht (Hauptmetriken)          │
│                                 │ • Seitenaufrufe (pageviews)            │
│                                 │ • Unique Visitors (visitors)            │
│                                 │ • Sessions/Visits                       │
│                                 │ • Bounce Rate                           │
│                                 │ • Durchschnittliche Verweildauer       │
│                                 │ • Vergleich mit Vorperiode (Trends)    │
│                                 │                                         │
│ GET /pageviews                  │ Zeitverlauf-Charts                     │
│                                 │ • Dual-Bar-Chart: Pageviews + Sessions │
│                                 │ • Visitor-Bar-Chart                     │
│                                 │ • Stündlich (24h), täglich, monatlich  │
│                                 │ • Timezone: Europe/Berlin               │
│                                 │                                         │
│ GET /metrics/expanded (path)    │ Top Seiten - Erweiterte Metriken       │
│                                 │ • Seitenaufrufe                         │
│                                 │ • Unique Visitors pro Seite            │
│                                 │ • Bounce Rate pro Seite                │
│                                 │ • Durchschnittliche Verweildauer       │
│                                 │ • Prozentanteile mit Progress Bar      │
│                                 │ • Limit: Top 20 Seiten                 │
│                                 │                                         │
│ GET /metrics (entry)            │ Entry Pages - Einstiegsseiten         │
│                                 │ • Erste Seite des Besuchers            │
│                                 │ • Besucherzahl                          │
│                                 │ • Limit: Top 15 Entry Pages            │
│                                 │                                         │
│ GET /metrics (exit)             │ Exit Pages - Ausstiegsseiten          │
│                                 │ • Letzte Seite des Besuchers           │
│                                 │ • Besucherzahl                          │
│                                 │ • Limit: Top 15 Exit Pages             │
│                                 │                                         │
│ GET /metrics (referrer)         │ Traffic-Quellen / Referrer             │
│                                 │ • Externe Links (Domain referrer)      │
│                                 │ • Direkt-Traffic fallback               │
│                                 │ • Besucherzahl pro Quelle              │
│                                 │ • Limit: Top 15 Referrer               │
│                                 │                                         │
│ GET /metrics (channel)          │ Traffic Channels                       │
│                                 │ • Organic Search                        │
│                                 │ • Direct                                │
│                                 │ • Social Media                          │
│                                 │ • Referral                              │
│                                 │ • Limit: Top 10 Channels               │
│                                 │ • Fallback wenn nicht verfügbar        │
│                                 │                                         │
│ GET /metrics (browser)          │ Browser-Verteilung                     │
│                                 │ • Chrome, Firefox, Safari, Edge, etc.  │
│                                 │ • Besucherzahl pro Browser             │
│                                 │ • Prozentanteile                       │
│                                 │ • Limit: Top 10 Browser                │
│                                 │                                         │
│ GET /metrics (os)               │ Betriebssysteme                        │
│                                 │ • Windows, macOS, Linux, iOS, Android │
│                                 │ • Besucherzahl pro OS                  │
│                                 │ • Limit: Top 10 OS                     │
│                                 │                                         │
│ GET /metrics (device)           │ Geräte-Typen - mit Donut-Chart        │
│                                 │ • Desktop 🖥️                          │
│                                 │ • Mobile 📱                            │
│                                 │ • Tablet 📱                            │
│                                 │ • Laptop 💻                            │
│                                 │ • Conic-Gradient Donut Visualization  │
│                                 │ • Limit: Top 5 Devices                 │
│                                 │                                         │
│ GET /metrics (country)          │ Länder-Verteilung                      │
│                                 │ • Länder-Codes (DE, US, FR, etc.)     │
│                                 │ • Land-Namen via Intl.DisplayNames    │
│                                 │ • Emoji-Flags (🇩🇪 Deutschland)       │
│                                 │ • Fallback auf Code wenn Name fehlt    │
│                                 │ • Limit: Top 15 Länder                 │
│                                 │                                         │
│ GET /metrics (city)             │ Städte-Verteilung                      │
│                                 │ • Stadt-Namen                          │
│                                 │ • Besucherzahl pro Stadt               │
│                                 │ • Limit: Top 15 Städte                 │
│                                 │                                         │
│ GET /metrics (language)         │ Sprachen                               │
│                                 │ • ISO-639-1 Language Codes            │
│                                 │ • Sprachen-Namen via Intl.DisplayNames│
│                                 │ • Beispiel: 🗣️ Deutsch (de)           │
│                                 │ • Limit: Top 10 Sprachen               │
│                                 │                                         │
│ GET /metrics (screen)           │ Bildschirmauflösungen                  │
│                                 │ • Auflösungen (1920x1080, etc.)       │
│                                 │ • Besucherzahl pro Auflösung          │
│                                 │ • Limit: Top 10 Auflösungen           │
│                                 │                                         │
│ GET /metrics (event)            │ Custom Events                          │
│                                 │ • Benutzerdefinierte Event-Namen      │
│                                 │ • Anzahl der Ereignisse                │
│                                 │ • Fallback wenn nicht verfügbar       │
│                                 │ • Limit: Top 15 Events                 │
│                                 │                                         │
│ GET /metrics (title)            │ Seitentitel                            │
│                                 │ • <title> HTML-Tags                    │
│                                 │ • Seitenaufrufe pro Titel              │
│                                 │ • Limit: Top 15 Titel                  │
│                                 │                                         │
└─────────────────────────────────────────────────────────────────────────────┘

================================================================================
  ✨ NEUE FEATURES & VERBESSERUNGEN
================================================================================

🆕 ZEITRAUM-WÄHLER (Time Range Selector)
────────────────────────────────────────────────────────────────────────────
  24h      → Letzte 24 Stunden (stündliches Granular)
  7 Tage   → Letzte 7 Tage (täglich) - STANDARD
  30 Tage  → Letzte 30 Tage (täglich)
  90 Tage  → Letzte 90 Tage (täglich)
  1 Jahr   → Letzte 365 Tage (monatlich)

  Automatische Anpassung von:
    • Zeitformatierung in Charts
    • API-Unit Parameter (hour/day/month)
    • Vergleichsperiode für Trends


🔴 LIVE-BADGE & AKTIVE BESUCHER
────────────────────────────────────────────────────────────────────────────
  • Pulsierendes Indicator-Icon
  • Echtzeit-Zähler (aktuelle Besucher in letzten 5 Minuten)
  • Auto-Refresh alle 30 Sekunden
  • Ausgabe: "👤 5 aktiv" (Beispiel)


📈 TREND-VERGLEICHE (Periode-zu-Periode)
────────────────────────────────────────────────────────────────────────────
  Jede KPI zeigt Vergleich zur Vorperiode:
    ↑ +15.3%  → Anstieg (grün)
    ↓ -8.2%   → Rückgang (rot)
    → 0%      → Keine Änderung (grau)
    ↑ neu     → Neu in dieser Periode (grün)

  Betroffene KPIs:
    • Seitenaufrufe
    • Besucher
    • Sessions
    • Bounce Rate


📊 ERWEITERTE METRIKEN (Top Seiten)
────────────────────────────────────────────────────────────────────────────
  Tabelle mit 7 Spalten:
    1. Ranking (#)
    2. Seite (gekürzt auf 45 Zeichen, mit Tooltip)
    3. Seitenaufrufe
    4. Unique Visitors
    5. Bounce Rate (%)
    6. Durchschnittliche Verweildauer (hh:mm:ss)
    7. Prozentanteil (mit farbiger Progress Bar)

  Berechnet aus: /metrics/expanded (path)


🎨 DONUT-CHART (Geräte-Verteilung)
────────────────────────────────────────────────────────────────────────────
  Visuelle Darstellung:
    • Conic Gradient basiert auf Prozentanteilen
    • Farben pro Gerätetyp:
      🖥️ Desktop   → Purple (#a855f7)
      📱 Mobile    → Green (#10b981)
      📱 Tablet    → Yellow (#f59e0b)
      💻 Laptop    → Cyan (#06b6d4)
    • Center-Circle mit Gesamt-Besucherzahl
    • Legende mit genauen Werten und %


📑 TABS (Tabbednavigation)
────────────────────────────────────────────────────────────────────────────
  🔥 Top Seiten       → Seiten mit erweiterten Metriken
  🚪 Entry Pages      → Einstiegsseiten
  🚶 Exit Pages       → Ausstiegsseiten
  🔗 Referrers        → Traffic-Quellen
  📢 Channels         → Traffic-Kanäle (Organic, Direct, etc.)
  📄 Seitentitel      → HTML-Titel


🌍 GEO-DATEN
────────────────────────────────────────────────────────────────────────────
  Länder:
    • Emoji-Flags automatisch generiert (🇩🇪 Deutschland)
    • 50+ Länder unterstützt mit Fallback
    • Sortiert nach Besucherzahl
    • Top 15 angezeigt

  Städte:
    • Stadt-Namen
    • Top 15 Städte
    • Prozentanteile


🗣️ SPRACHEN & TECH
────────────────────────────────────────────────────────────────────────────
  Sprachen:
    • Automatische Sprachnamen-Generierung
    • Beispiel: "🗣️ Deutsch (de)" statt nur "de"
    • 10 Top-Sprachen

  Bildschirmauflösungen:
    • Format: "1920x1080"
    • Top 10 Auflösungen
    • Identifizierung von Mobile vs. Desktop


🔄 AUTO-REFRESH
────────────────────────────────────────────────────────────────────────────
  • Aktive Besucher: Alle 30 Sekunden
  • Alle Daten: Alle 5 Minuten (vollständiges Reload)


🎛️ STEUERELEMENTE
────────────────────────────────────────────────────────────────────────────
  Zeit-Selector:
    • 5 Buttons für verschiedene Zeiträume
    • Aktive Button hervorgehoben (Purple)
    • Instant-Update beim Klick

  Refresh-Button:
    • Manuelles Laden aller Daten
    • Disabled während des Ladens
    • Spinner-Animation (🔄 → ⏳ → 🔄)
    • Timestamp "Zuletzt aktualisiert"


⚙️ KONFIGURATION & API-AUTHENTIFIZIERUNG
────────────────────────────────────────────────────────────────────────────
  Automatische Erkennung:
    1. Prüfe localStorage für 'umami_api_token'
    2. Fallback auf Hardcoded Token (Warnung für Deployment!)
    3. Zeige Konfigurations-Notice falls leer

  Token-Management:
    • Eingabefield für API-Token
    • Speichern in localStorage
    • Auto-Laden nach Speicherung
    • Sichere Anzeige (password-field)


📱 RESPONSIVE DESIGN
────────────────────────────────────────────────────────────────────────────
  Desktop (> 1200px):
    • Grid-Layout 2-3 Spalten
    • Volle Tabellen mit allen Spalten
    • Große Charts und Donuts

  Tablet (768px - 1200px):
    • 2-spaltig für KPIs
    • Single-Column für größere Cards
    • Angepasste Schrift

  Mobile (< 480px):
    • 1-2 spaltig für KPIs
    • Single-Column für alles
    • Horizontal scrollbare Tabs


🎨 DESIGN-SYSTEM
────────────────────────────────────────────────────────────────────────────
  CSS-Variablen:
    --bg-deep       #030305    (Haupthintergrund)
    --bg-card       #161a1a    (Karten-Hintergrund)
    --primary       #a855f7    (Purple - Hauptfarbe)
    --success       #10b981    (Green - Positiv)
    --danger        #ef4444    (Red - Negativ)
    --warning       #f59e0b    (Yellow - Warnung)
    --info          #06b6d4    (Cyan - Info)
    --text-main     #f8fafc    (Weiß - Text)
    --text-muted    #94a3b8    (Grau - Sekundär)

  Farbschema pro Card-Typ:
    • Purple KPI   → Seitenaufrufe, Bounce
    • Green KPI    → Besucher
    • Cyan KPI     → Sessions
    • Yellow KPI   → Verweildauer
    • Red KPI      → Bounce Rate


💻 TECHNISCHE IMPLEMENTIERUNG
────────────────────────────────────────────────────────────────────────────
  Sprache: HTML + CSS + Vanilla JavaScript (ES5 kompatibel)
  Dependencies: Keine externe Bibliotheken!

  Async API Handling:
    • Promise.all() für parallele API-Aufrufe
    • Error Handling mit Fallbacks
    • Graceful Degradation bei fehlenden Endpoints

  Performance-Optimierungen:
    • Paralleles Laden aller 17 API-Requests
    • Effiziente DOM-Manipulation
    • Minimal-CSS ohne Frameworks

  Browser-Kompatibilität:
    • Modern Browsers (Chrome, Firefox, Safari, Edge)
    • Mobile Browsers
    • Intl.DisplayNames für Länder/Sprachen


================================================================================
  🔒 SICHERHEIT & DATENSCHUTZ
================================================================================

API-Token-Handling:
  ⚠️  Hardcoded Fallback-Token nur für Demo-Zwecke
  ✅  Token speichern in localStorage (clientseitig)
  ✅  Token wird NICHT an externe Services gesendet
  ✅  Nur an api.umami.is (offizieller Umami-Server)

DSGVO-Konformität:
  ✅  Keine Speicherung personenbezogener Daten
  ✅  Nur aggregierte, anonyme Statistiken
  ✅  Umami ist DSGVO-konform & selbstgehostet möglich
  ✅  Keine Cookies von Third-Parties


================================================================================
  📋 VERWENDUNG
================================================================================

Zugriff:
  1. Öffne die MyWorkLog-App (index.html)
  2. Navbar → "Tools & Werkzeuge" → "📊 Analytics"
  3. Dashboard lädt automatisch mit 7-Tage-Standard

Erste Konfiguration (falls Token nicht gespeichert):
  1. Gehe zu: https://cloud.umami.is
  2. Login mit Umami-Account
  3. Gehe zu "Settings" → "API"
  4. Erstelle einen neuen API Key
  5. Kopiere den Schlüssel
  6. Füge ihn im Analytics-Dashboard ein
  7. Klicke "💾 Speichern & Laden"
  8. Dashboard aktualisiert automatisch


================================================================================
  🐛 FEHLERBEHANDLUNG
================================================================================

Fehler während des Ladens:
  • Automatische Error-Boundary mit try/catch
  • Nutzerfreundliche Fehlermeldungen
  • Spezifische Meldungen für:
    - 401/403 Unauthorized (Token-Fehler)
    - 404 Not Found (Website-ID-Fehler)
    - Netzwerk-Fehler

Fallback-Mechanismen:
  • /metrics/expanded → fallback auf /metrics
  • /channel → optional (kann leer sein)
  • /event → optional (kann leer sein)
  • Direkte Traffic → fallback auf "(Direkt)"


================================================================================
  📊 BEISPIEL-DATEN
================================================================================

Typische KPI-Card-Ausgabe:
  ┌─────────────────────┐
  │      👁️             │
  │  SEITENAUFRUFE      │
  │     1.2K            │
  │  ↑ +15.3%           │
  └─────────────────────┘

Typische Tabellen-Zeile (Top Seiten):
  # │ Seite              │ Aufrufe │ Besucher │ Bounce │ Ø Zeit  │ Anteil
  1 │ /index.html        │   342   │   210    │  32%   │ 2m 15s  │ 28.5%

Typische Donut-Legend:
  🖥️ Desktop      542 (54.2%)
  📱 Mobile       420 (42.1%)
  📱 Tablet        38 (3.8%)


================================================================================
  📝 NOTIZEN & TIPPS
================================================================================

Best Practices:
  ✓ Regelmäßig die Analytics überprüfen (mindestens 1x/Woche)
  ✓ Auf Traffic-Spitzen und Anomalien achten
  ✓ Entry-/Exit-Page-Analyse nutzen zur Optimierung
  ✓ Browser/Device-Daten für Kompatibilität nutzen

Optimierungsmöglichkeiten:
  • Custom Events implementieren für User-Flows
  • Goals/Conversion-Tracking einrichten (in Umami)
  • Saisonale Unterschiede beobachten
  • Mobile vs. Desktop Performance vergleichen

Umami Cloud Features:
  • Realtime Dashboard auch direkt auf cloud.umami.is verfügbar
  • Diese Seite ist eine ergänzende, customisierte Version
  • Kann beliebig erweitert werden mit neuen Metriken


================================================================================
  📅 VERSIONSVERLAUF
================================================================================

v1.0 - 05.02.2026 - ADVANCED VERSION
  ✅ Alle 17 Umami API-Endpoints implementiert
  ✅ Live-Aktiv-Besucher Anzeige
  ✅ Trend-Vergleiche zwischen Perioden
  ✅ Erweiterte Top-Seiten Metriken
  ✅ Donut-Chart für Geräte
  ✅ Intl.DisplayNames für Länder/Sprachen
  ✅ Responsive Design für Mobile
  ✅ Dark Theme matching MyWorkLog App
  ✅ Auto-Refresh Funktionalität
  ✅ Fehlerbehandlung & Fallbacks


================================================================================
End of Document
================================================================================
Erstellt: 05. Februar 2026
Autor: AI Assistant
Status: Produktionsreif ✅
================================================================================
