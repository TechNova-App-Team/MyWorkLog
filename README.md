[![WICHTIG! Datenschutzrichtlinie lesen!](https://img.shields.io/badge/Datenschutz-WICHTIG-red?style=for-the-badge)](./PRIVACY.md)
App Version V1.1.2
Aktuell Version V1.2.4e
# ⏱ Time.Tracker.SingleFile

> **Eine moderne, hochperformante Zeiterfassungs- und Gleitzeitmanagement-Anwendung mit umfangreicher Analytics.**

---

## 🌟 Überblick

**Time.Tracker.SingleFile** ist eine webbasierte Echtzeit-Zeiterfassungslösung mit fortgeschrittener Gleitzeitverwaltung, Performance-Analytics und intelligenter Urlaubsverwaltung. Gebaut mit modernster Frontend-Technologie für maximale Benutzerfreundlichkeit.

### Kernfeatures

```
┌─────────────────────────────────────────────────┐
│   • Live-Timer mit visueller Segmentierung      │
│   • Intelligente Pausenabzüge                   │
│   • Feiertags-Management (deutschlandweit)      │
│   • Performance Analytics Dashboard             │
│   • Gleitzeitkonto mit Prognosen                │
│   • Responsive Dark Mode Interface              │
│   • Lokale Datenspeicherung (IndexedDB Ready)   │
│   • Import/Export Funktionalität                │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Visuelle Architektur

### Dashboard-Übersicht
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃            Time.Tracker.SingleFile            ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Woche: +2.5h  │  Monat: +8.2h  │ Gleitzeit: +15.7h ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                   Live-Timer                  ┃
┃  ▓▓▓▓▓░░░░ (2h 24m 15s)                       ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃  Letzte Aktivitäten  │  Trend-Analyse         ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 🚀 Funktionen im Detail

### 📊 Dashboard-Modul
- **KPI-Ringe**: Wöchentliche und monatliche Stundenfortschritt
- **Gleitzeit-Konto**: Echtzeit-Saldo mit Jahresprognose
- **Audit-Panel**: Letzte Speicherung, Feiertags-Status, Schichtwarnung
- **Trend-Chart**: 30-Tage Saldo-Entwicklung
- **Verteilungs-Donut**: Aufschlüsselung nach Tätigkeitstyp

### ⏱ Live-Timer System
```javascript
// Intelligente Timer-Logik
- Start/Pause/Stop Steuerung
- Automatische Pausenabzüge nach Schwellenwert
- Visuelles Segment-Logging
- Zeitstempel-basierte Verfolgung
```

### 📈 Performance Analytics
- **Soll-Erfüllungsgrad** (90 Tage)
- **Wöchentlicher Soll-Ist-Vergleich** mit Bar-Charts
- **Saldo-Entwicklung** pro Monat
- **Durchschnittliche monatliche Differenz**

### 🌴 Urlaubsverwaltung
- Jahresanspruch konfigurierbar
- Blockbuchung für Zeiträume
- Automatische Feiertags-Integration
- Verfügbare Tage Tracker
- Ferienblock-Verwaltung

### ⚙️ Intelligente Konfiguration
```
Arbeitszeiten (Mo-Fr):    8.75h | 8.75h | 8.75h | 8.75h | 4.5h
Pausenregel:              Automatisch nach 6h (30 Min)
Berufsschule:             Mi + Do (ungerade Woche)
Feiertag-Sync:            Automatisch (DE)
```

---

## 🛠 Technologie-Stack

### Frontend
```
┌─────────────────────────────┐
│  HTML5 + CSS3 + JavaScript  │
│  (Vanilla, keine Framework) │
└─────────────────────────────┘
       ↓
┌─────────────────────────────┐
│  Glassmorphism UI Design    │
│  Backdrop Filter Effekte    │
│  CSS Grid + Flexbox         │
└─────────────────────────────┘
       ↓
┌─────────────────────────────┐
│  LocalStorage API           │
│  RequestAnimationFrame      │
│  SVG Charts & Visualisierung│
└─────────────────────────────┘
```

### Design-System
- **Farben**: Purple (#a855f7), Blue, Cyan, Green, Orange
- **Font**: Inter + JetBrains Mono
- **Komponenten**: Glass-Cards, Progress-Rings, Bar-Charts
- **Animationen**: Fade-In, Slide-Out, Smooth Transitions

---

## 📋 Daten-Schema

### Entry-Objekt
```javascript
{
  id: 1234567890,                    // Eindeutige ID
  date: "2025-11-27",                // ISO-Format
  type: "work" | "school" | "vacation" | "sick" | "holiday",
  worked: 8.5,                       // Geleistete Stunden
  expected: 8.75,                    // Soll-Stunden
  diff: -0.25,                       // Differenz (Gleitzeit-Delta)
  info: "08:00 - 17:00 (Auto-Pause 30m)",
  breakMins: 30,                     // Automatisch abgezogene Pause
  shiftEnd: "17:30",                 // Endzeitpunkt mit Pause
  shiftWarning: false,               // Schicht > 10h?
  isPeriod: false                    // Blockbuchung?
}
```

### Settings-Struktur
```javascript
{
  name: "Max Mustermann",
  theme: "#a855f7",
  hours: [0, 8.75, 8.75, 8.75, 8.75, 4.5, 0],
  break: { thresh: 6, min: 30 },
  vacation: { total: 30, used: 5, usedManual: 0 }
}
```

---

## 💾 Datenpersistierung

```
localStorage Keys:
├── tg_pro_data           // Alle Einträge + Settings
├── tg_timer              // Aktueller Timer-Status
├── tg_timer_log          // Timer-Session Log
├── tg_last_save          // Timestamp d. letzten Speicherung
└── tg_last_holiday_check // Feiertags-Check Log
```

**Export/Import**:
- JSON-basiertes Backup
- Ein-Klick-Download
- Datei-Upload mit Validierung

---

## 🎯 Nutzungsszenarien

### Szenario 1: Tägliche Arbeitszeiterfassung
```
1. Morning: Timer starten (▶ Start)
2. Lunch: Timer pausieren (II Pause)
3. Back: Timer fortsetzen (▶ Start)
4. Evening: Timer stoppen (■ Stop) → Auto-Buchung
→ System zieht Pause ab, speichert Gleitzeit-Delta
```

### Szenario 2: Monatliche Performance-Analyse
```
Navigation: Performance Analyse Tab
→ Soll-Erfüllung: 97%
→ Wöchentlicher Vergleich: Bar-Chart Visualisierung
→ Saldo-Trend: +12.5h über 12 Monate
```

### Szenario 3: Urlaubsplanung
```
Einstellungen → Urlaubsverwaltung
→ Blockbuchung: 2025-12-20 bis 2025-12-31
→ Type: "Urlaub"
→ System: Bucht alle Werktage mit Soll-Stunden
→ Verfügbare Tage: -9 (Anspruch 30)
```

---

## 📱 Responsive Design

```
Desktop (1920px):        Vollständiges Layout, alle Charts
Tablet (1024px):         2-Spalten Modus, komprimierte KPIs
Mobile (375px):          Stack-Layout, Touch-optimiert
```

---

## 🔐 Datenschutz & Sicherheit

- ✅ Alle Daten lokal (Browser LocalStorage)
- ✅ Keine Server-Kommunikation
- ✅ Kein Tracking
- ✅ GDPR-konform
- ✅ Manueller Export erforderlich

---

## 🎨 Farb-Palett & Themes

### Primäre Farben
```
┌──────────────┬───────────────────┐
│ Purple       │ #a855f7         │
├──────────────┼───────────────────┤
│ Blue         │ #3b82f6         │         
├──────────────┼───────────────────┤
│ Cyan         │ #06b6d4         │
├──────────────┼───────────────────┤
│ Green        │ #10b981         │
├──────────────┼───────────────────┤
│ Amber        │ #f59e0b         │
├──────────────┼───────────────────┤
│ Rose         │ #ec4899         │
└──────────────┴───────────────────┘
```

### Typen-Farbcodierung
```
Work     → Purple (#a855f7)
School   → Blue (#3b82f6)
Vacation → Green (#10b981)
Sick     → Red (#ef4444)
Holiday  → Amber (#f59e0b)
```

---

## 🚀 Getting Started

### Installation
```bash
# 1. Repository klonen
git clone https://github.com/TechNova-App-Team/Time.Tracker.SingleFile.git

# 2. Datei öffnen
open Rechner.html
# oder: Rechner.html im Browser öffnen (Doppelklick)
```

### Erste Schritte
```
1. Einstellungen öffnen (⚙️)
2. Namen eingeben (z.B. "Max Mustermann")
3. Arbeitszeiten anpassen (Mo-Fr)
4. Jahresurlaub setzen (Default: 30 Tage)
5. Design-Farbe wählen (optional)
6. Speichern → Dashboard
```

---

## 📊 Beispiel-Workflow

```
├─ Dashboard Tab
│  ├─ KPI-Ringe: Wochenübersicht
│  ├─ Audit-Infos: Status-Check
│  ├─ Trend-Chart: 30-Tage Verlauf
│  ├─ Live-Timer: Echtzeit-Erfassung
│  └─ Letzte Aktivitäten (Top 5)
│
├─ Performance Tab
│  ├─ Soll-Erfüllung: 97%
│  ├─ Soll-Ist-Vergleich: 8-Wochen Bar-Chart
│  ├─ Monatlicher Saldo: 12-Monats Trend
│  └─ KPIs: Erwartete Stunden, Durchschnitt
│
├─ Historie Tab
│  ├─ Alle Einträge (sortiert nach Datum)
│  ├─ Bearbeitungsmöglichkeiten (✎)
│  ├─ Lösch-Funktion (×)
│  └─ Typ-Farbcodierung
│
└─ Admin-Funktionen
   ├─ Einstellungen: Profile, Zeiten, Urlaub
   ├─ Backup: JSON Export
   └─ Restore: JSON Import
```

---

## 🔧 API-Referenz

### Timer-Funktionen
```javascript
timerAction('start')          // Timer starten
timerAction('pause')          // Timer pausieren
timerAction('stop')           // Timer stoppen & buchen
logTimerAction('action', now) // Interner Logger
renderTimerLogBar()           // Visualisierung updaten
```

### Datenverwaltung
```javascript
handleEntry()                 // Neuen Eintrag speichern
editEntry(id)                 // Eintrag bearbeiten
delEntry(id)                  // Eintrag löschen
save()                        // Daten persistieren
exportData()                  // JSON Export
importData(event)             // JSON Import
```

### UI-Operationen
```javascript
switchTab(tabId)              // Tab wechseln (dashboard|performance|history)
openSettings()                // Einstellungen öffnen
saveSettings()                // Einstellungen speichern
applyTheme(hex)               // Theme ändern
```

### Analytics
```javascript
calculatePerformanceData()    // KPIs berechnen
renderPerformanceView(data)   // Performance rendern
updateUI()                    // Alle UI-Elemente aktualisieren
```

---

## 📈 Performance-Metriken

```
Load-Zeit:           ~50ms (Vanilla JS)
Speicher-Nutzung:    ~2-5 MB (200+ Einträge)
localStorage Limit:  5-10 MB (Browser-abhängig)
Animation FPS:       60 (RequestAnimationFrame)
Dateigröße:          ~85 KB (HTML+CSS+JS)
```

---

## 🐛 Troubleshooting

### Problem: Daten werden nicht gespeichert
**Lösung**: LocalStorage-Limit prüfen, alte Daten exportieren

### Problem: Timer-Log wird nicht angezeigt
**Lösung**: Browser-Konsole auf Fehler prüfen, Cache leeren (Ctrl+Shift+Del)

### Problem: Feiertage nicht automatisch gebucht
**Lösung**: Einstellungen öffnen → Speichern → Seite neuladen

### Problem: Performance Analytics zeigt keine Daten
**Lösung**: Mind. 2 verschiedene Monate mit Einträgen benötigt

---

## 🤝 Beitragen

```
1. Fork das Projekt
2. Feature-Branch erstellen: git checkout -b feature/neue-feature
3. Änderungen committen: git commit -m "Add: neue Feature"
4. Push zum Branch: git push origin feature/neue-feature
5. Pull Request öffnen
```

---

## 📄 Lizenz

```
MIT License - Siehe LICENSE.md für Details
Copyright © 2025 Time.Tracker.SingleFile Contributors
```

---

## 📞 Support & Kontakt

```
📧 Email:      support@timetracker-pro.local
🐛 Issues:     Bitte GitHub Issues verwenden
💬 Diskussion: GitHub Discussions
```

---

## 🎓 Lernressourcen

### Implementierte Konzepte
- LocalStorage API (Web Storage)
- RequestAnimationFrame (60fps Animationen)
- SVG Charts (Skalierbare Vektorgrafiken)
- CSS Glassmorphism (Moderne UI-Trends)
- Datum/Zeit-Arithmetik (JavaScript Date API)
- Event-Listeners & DOM-Manipulation

### Weiterführende Themen
- [ ] IndexedDB Migration
- [ ] Service Worker (Offline Support)
- [ ] Progressive Web App (PWA)
- [ ] Cloud Sync (Firebase/Supabase)
- [ ] Mobile Native App (React Native)

---

## 📊 Statistiken

```
├─ Code-Zeilen:          ~1700 (HTML/CSS/JS gemischt)
├─ Komponenten:          15+ (Cards, Charts, Modals)
├─ CSS-Variablen:        20+ (Theme System)
├─ JavaScript-Funktionen:30+
├─ SVG-Charts:           5 (Rings, Donut, Trend, Bars)
└─ Unterstützte Sprachen: Deutsch (de-DE)
```

---

## 🌍 Browser-Kompatibilität

```
┌─────────────┬──────────┐
│ Chrome      │ ✅ 90+   │
├─────────────┼──────────┤
│ Firefox     │ ✅ 88+   │
├─────────────┼──────────┤
│ Safari      │ ✅ 14+   │
├─────────────┼──────────┤
│ Edge        │ ✅ 90+   │
├─────────────┼──────────┤
│ IE 11       │ ❌ Nein  │
└─────────────┴──────────┘
```

---

## 🚀 Roadmap 2025

```
Q1 2025:
  ├─ Dark/Light Mode Toggle
  ├─ Mehrsprachigkeit (EN, FR, ES)
  └─ Mobile App (React Native)

Q2 2025:
  ├─ Cloud Sync Integration
  ├─ Team-Verwaltung
  └─ API-Schnittstelle

Q3 2025:
  ├─ KI-gestützte Prognosen
  ├─ Automatische Schicht-Optimierung
  └─ Integration mit Kalender-APIs

Q4 2025:
  ├─ Enterprise Features
  ├─ LDAP/SSO Support
  └─ Audit-Trail & Compliance
```

---

<div align="center">

### ⭐ Gefällt dir das Projekt?

**Gib uns einen Star! ⭐** → [GitHub](https://github.com)

---

**Made with ❤️ by the TimeTracker Team**

*Eine moderne Lösung für intelligente Zeiterfassung*

</div>

---

### 📝 Versionshistorie

```
v1.2.0 (2025-11-27)
├─ ✨ Live-Timer mit Segment-Logging
├─ 📊 Performance Analytics Dashboard
├─ 🌴 Intelligente Urlaubsverwaltung
├─ ⚙️ Erweiterte Einstellungen
└─ 🎨 Neue Glassmorphism UI

v1.1.0 (2025-11-20)
├─ 🔧 Feiertags-Auto-Integration
├─ 📈 Saldo-Trend Chart
└─ 🎯 KPI-Ring Visualisierungen

v1.0.0 (2025-11-15)
└─ 🎉 Initial Release
```

---

**Time.Tracker.SingleFile V1.2.0** | Gebaut mit modernstem Web-Standard | 🚀 Production Ready

