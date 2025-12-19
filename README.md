[![Datenschutz: DSGVO lesen](https://img.shields.io/badge/DSGVO-Wichtig-red?style=for-the-badge)](./DSGVO.html) [![Impressum](https://img.shields.io/badge/Impressum-Info-blue?style=for-the-badge)](./Impressum.html) [![Lizenz: MIT](https://img.shields.io/badge/License-MIT-green.svg)](Rechtliches/LICENSE.md)

# ⏱ MyWorkLog

> Eine moderne, lokal laufende Single-File Zeiterfassungs-App — aktuell, minimal, performant.
https://technova-app-team.github.io/MyWorkLog/

---

**Grafische Kurzansicht**

[![Timer Badge](https://img.shields.io/badge/Timer-live-yellow?style=for-the-badge)](#) [![Backup](https://img.shields.io/badge/Backup-JSON-orange?style=for-the-badge)](#)

 **Web App:** `v2.4.0`  •  **Build:** `local`  •  **Stand:** 2025-12-19
 
 **Release:** `v2.4.0`  •  **Stand:** Dezember 2025

---

## 🛡️ Rechtliches & wichtige Dateien (Schnellzugriff)

- `DSGVO.html` — [DSGVO anzeigen](./DSGVO.html)
- `Impressum.html` — [Impressum anzeigen](./Impressum.html)
- `Rechtliches/` (alle Markdown-Dateien):
  - [Rechtliches/CODE_OF_CONDUCT.md](Rechtliches/CODE_OF_CONDUCT.md)
  - [Rechtliches/CONTRIBUTING.md](Rechtliches/CONTRIBUTING.md)
  - [Rechtliches/LICENSE.md](Rechtliches/LICENSE.md)
  - [Rechtliches/NOTICE.md](Rechtliches/NOTICE.md)
  - [Rechtliches/PRIVACY.md](Rechtliches/PRIVACY.md)
  - [Rechtliches/SECURITY.md](Rechtliches/SECURITY.md)

> Alle rechtlichen Dateien liegen im Ordner `Rechtliches/` — die obigen Links öffnen die lokal vorhandenen Markdown-Dateien.


## 🌟 Kurzüberblick

`TimeTracker-Ausbildung-Arbeit` ist eine einfache, aber mächtige Browser-Anwendung zur lokalen Zeiterfassung (kein Server). Sie speichert Daten ausschließlich lokal und eignet sich für Mitarbeiter, Auszubildende oder Einzelpersonen, die ein schnelles, datenschutzfreundliches Tool suchen.

## 🎯 Aktueller Projektstand (Stand: 2025-12-19)
- **Fertig / stabil:** Kernfunktionen (Timer, Buchen, Export/Import, Gleitzeit, AI-Bot) funktionieren lokal.
- **In Arbeit:** Weitere Analytics-Features, UI-Polish, optionale Synchronisation (ausstehend).
- **Datenhaltung:** Alle Daten in `localStorage` / JSON-Export möglich. AI-Bot speichert Conversations lokal.

---

## 📸 Grafische Darstellung (Quick-Preview)

```
┌───────────────────────────────────────────────┐
│  ╔═ Dashboard ═══════════╗  ╔═ Live-Timer ══╗  │
│  ║ KPI Ringe  ░░▒▓▓  72% ║  ║ ▶ 02:24:15     ║  │
│  ║ Trend +12.5h          ║  ║ Pause: II      ║  │
│  ╚═══════════════════════╝  ╚════════════════╝  │
└───────────────────────────────────────────────┘
```

## ✨ Features (kurz)
- Live-Timer mit Start/Pause/Stop
- Automatische Pausenregel (konfigurierbar)
- Gleitzeit-Konto und Monatsprognose
- JSON Export/Import (Backup/Restore)
- Farblich codierte Einträge (Work / School / Vacation / Sick / Holiday)

### Neu & wichtig (Dez 2025)
- **🤖 AI-Bot Assistent** — Intelligente Conversation mit Echtzeit-Datenanalyse! Der Bot:
  - Analysiert deine Zeitdaten in Echtzeit
  - Erkennt Fragen automatisch mit Pattern Recognition
  - Gibt intelligente Empfehlungen basierend auf Produktivitäts-Patterns
  - Speichert Conversation History lokal
  - 100% im Browser — keine Cloud, kein Server, DSGVO-konform! 🔒
  - Unterstützt: Weekly-Stats, Monthly-Forecast, Produktivitäts-Analysen, Pause-Analysen, Smart Recommendations
- **🗓️ iCalendar Export (RFC 5545)** — Exportiere Zeiteinträge direkt zu Google Calendar, Outlook, Apple Calendar
- **🔒 Verschlüsseltes Backup (AES-256-GCM)** — Enterprise-grade Encryption mit PBKDF2 Key-Derivation
- **📱 Progressive Web App (PWA)** — Installierbar auf Smartphone, Tablet, Desktop mit Offline-Support
- OpenGraph & Twitter Meta Tags für bessere Social-Shares (`index.html`)
- Jest Unit- & Integrationstests (Konfig in `jest.config.js`, `tests/`)
- GitHub Actions CI/CD Pipeline (Lint, Test, Coverage, Lighthouse)
- Multi-Profile / Team-Mode (Profile erstellen, Wechseln, Import/Export)

Diese Änderungen verbessern Testing, Sharing, Datensicherheit, und Team-Workflows.

---

## 🧭 Schnellstart
1. Dateien lokal öffnen: Doppelklick auf `index.html` oder `index.html` im Browser öffnen.
2. Einstellungen → Name, Arbeitszeiten, Urlaub setzen.
3. Timer starten (▶) – Stop → Eintrag gespeichert.
4. Backup → `Export` für JSON herunterladen.

---

## 🛠 Entwicklung & Beitrag
- Fork → Branch → PR
- Bitte `Rechtliches/CONTRIBUTING.md` lesen bevor du Änderungen vorschlägst: [Contributing](Rechtliches/CONTRIBUTING.md)

### Tests & CI
- Lokale Tests: `npm test` (Jest + jsdom)
- Coverage: `npm run test:coverage`
- CI: GitHub Actions führt Lint, Tests, Coverage-Upload, Lighthouse und Security-Checks aus.

### Developer Quick-Ref
```bash
# Setup
npm install

# Tests
npm test
npm run test:watch
npm run test:coverage

# Lint
npm run lint
npm run lint --fix

# Build/Dev
npm run build
npm run dev
```

---

## 📌 Nächste Schritte (empfohlen)
- UI-Feinschliff & Accessibility-Checks
- Optional: Automatisches Test-Backup (download on interval)

---

## 📂 Dateien die du jetzt prüfen solltest
- `index.html` — Hauptdatei der App
- `AI-Bot/` — Neue AI-Bot Engine mit intelligenter Datenanalyse:
  - `AI-Bot/data-analyzer.js` — Intelligente Datenanalyse & Pattern Recognition
  - `AI-Bot/aibot-engine.js` — AI-Bot Conversation Engine mit Intent Detection
- `DSGVO.html`, `Impressum.html` — rechtliche Seiten (HTML)
- `Rechtliches/` — Markdown mit Lizenz & Richtlinien
 - `FEATURES.md` — Aktuelle Liste neuer Features & Roadmap
 - `jest.config.js`, `tests/` — Test-Suite & Helpers
 - `.github/workflows/ci-cd.yml` — CI/CD Pipeline

---

## Kontakt
- Bei Fragen: `XXX` oder GitHub Issues

Vielen Dank — wenn du noch mehr grafische Elemente (Screenshots, GIFs, echte SVGs) möchtest, füge kurz ein, ob ich die Dateien anlegen oder nur die README-Markdown-Referenzen erstellen soll.

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
├─ Code-Zeilen:          ~10K (HTML/CSS/JS gemischt)
├─ Komponenten:          15+ (Cards, Charts, Modals)
├─ CSS-Variablen:        20+ (Theme System)
├─ JavaScript-Funktionen:30+
├─ SVG-Charts:           5 (Rings, Donut, Trend, Bars)
└─ Unterstützte Sprachen: Deutsch (de-DE)
```

**Test-Statistiken:** 4 Test-Dateien, ~73 Test-Cases, Coverage-Threshold 60%+

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

<div align="center">

### ⭐ Gefällt dir das Projekt?

**Gib uns einen Star! ⭐** → [GitHub](https://github.com)

---

**Made with ❤️ by the TechNova App Team**

*Eine moderne Lösung für intelligente Zeiterfassung*

</div>

---

**TimeTracker-Ausbildung-Arbeit V2.4.0** | Gebaut mit modernstem Web-Standard | 🤖 AI-Bot powered | 🚀 Production Ready