<div align="center">

<br>

<img src="Grafiken/icon-512.png" alt="MyWorkLog" width="120" height="120">

<br>

# MyWorkLog

### Die offene Zeiterfassung für Auszubildende

Lokal-first · Offline-fähig · DSGVO-konform · 100% kostenlos

<br>

[![Live](https://img.shields.io/badge/myworklog.de-online-a855f7?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0a0a12)](https://myworklog.de/)
[![Version](https://img.shields.io/badge/version-6.3.14-7c3aed?style=for-the-badge&logo=git&logoColor=white&labelColor=0a0a12)](https://github.com/TechNova-App-Team/MyWorkLog/releases)
[![PWA](https://img.shields.io/badge/PWA-Ready-10b981?style=for-the-badge&logo=pwa&logoColor=white&labelColor=0a0a12)](https://myworklog.de/)
[![License](https://img.shields.io/badge/License-MIT-eab308?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0a0a12)](Rechtliches/LICENSE.md)

<br>

[Live](https://myworklog.de/) · [Berichtsheft](https://myworklog.de/berichtsheft/) · [Aufgaben](https://myworklog.de/aufgaben/) · [Rechte-Checker](https://myworklog.de/rechte-checker/) · [Architektur](https://myworklog.de/archflow/)

<br>

</div>

---

## Was ist MyWorkLog?

MyWorkLog ist eine **Progressive Web App** für deutsche Auszubildende, Mitarbeiter und Freelancer, die ihre Arbeitszeit professionell erfassen wollen — **ohne Account-Zwang, ohne Tracker, ohne Cloud-Pflicht.**

Die App läuft als Vanilla-HTML/CSS/JS-PWA komplett im Browser. Daten liegen lokal in deinem `localStorage`. Wer will, kann optional auf eine eigene Supabase-Instanz syncen — der Source-Code ist offen, du behältst die Kontrolle.

```
   Lokal-first    →   Daten bleiben auf deinem Gerät
   Offline-ready  →   PWA mit Service Worker, läuft ohne Internet
   DSGVO-clean    →   Kein Tracking, keine Dritt-Anbieter-Calls per Default
   Azubi-DNA      →   Berichtsheft (IHK), BBiG-Rechte, Untis, Fahrtkosten
   AI-optional    →   Cloud-KI (OpenRouter-Proxy) oder lokales WebLLM
```

---

## Features

<table>
<tr>
<td width="50%" valign="top">

### Zeiterfassung
- Live-Timer mit Pause-Automatik
- Kategorien: Arbeit · Schule · Urlaub · Krank · Feiertag
- §4 ArbZG-konforme Pausenregel
- Kalender- und Wochenansicht
- Custom Entry Types & Fields

### Analytics
- KPI-Dashboard mit Ringen
- Trends nach Woche · Monat · Jahr
- SVG-Charts (Area · Bar · Line · Heatmap)
- 8+ Analytics-Tabs in `/analytics/`
- Export: PDF · Excel · CSV · iCal (RFC 5545)

### AI
- Cloud-KI via OpenRouter-Proxy (kein eigener Key nötig)
- Spracheingabe für Timer & Chat
- Pattern Recognition & Smart Insights

</td>
<td width="50%" valign="top">

### Azubi-Tools
- **Berichtsheft** — IHK-konforme Ausbildungsnachweise mit AI-Generierung
- **Rechte-Checker** — BBiG / JArbSchG / ArbZG interaktiv prüfen
- **Vertrags-Manager** — Gehalt, Urlaub, Lohnzuschläge
- **Fahrtkosten** — Routing, ÖPNV, Spritkosten, Pendlerpauschale
- **Untis-Sync** — Stundenplan automatisch oder manuell
- **Skill-Tree** — RPG-Gamification für Ausbildungsfortschritt

### Sicherheit
- AES-256-GCM verschlüsselte Backups
- DOMPurify Input-Sanitization
- Row-Level Security (Supabase)
- Optionaler Cloud-Sync — kein Default-Tracking
- DSGVO-konform (keine Cookies, kein Server-Logging)

### PWA
- Service Worker (Cache-First Assets, Network-First Daten)
- Installierbar auf iOS · Android · Desktop
- PWA-Quick-Actions (Long-Press-Menü)
- Web Share Target API
- P2P-Sync via WebRTC (SimplePeer + TURN)

</td>
</tr>
</table>

---

## Quick Start

```bash
# Repo clonen
git clone https://github.com/TechNova-App-Team/MyWorkLog.git
cd MyWorkLog

# Lokal servieren (egal wie)
python -m http.server 8000
# oder: npx serve .
# oder: index.html direkt im Browser öffnen

# Tests + Linting
npm install
npm test
npm run lint
```

**Kein Build-Step.** Vanilla JS/HTML/CSS, alle Scripts werden direkt via `<script src>` geladen. PWA-Manifest und Service Worker sind ohne Konfiguration einsatzbereit.

---

## Projekt-Architektur

```
MyWorkLog/
├─ index.template.html     index.html builder
├─ service-worker.js       Offline-Cache, Push-Notifications
├─ manifest.json           PWA-Metadata, Shortcuts, Icons
│
├─ components/             Modulare Komponenten ({css,html,js} pro Modul)
│  ├─ core/                Timer · Storage · Save · Utils
│  ├─ dashboard/           KPI-Ringe, Charts
│  ├─ analytics-pro/       Erweiterte Analytics
│  ├─ goals/               Ziel-Tracking
│  ├─ school/              Schultag-Verwaltung
│  ├─ untis/               Stundenplan-Sync
│  └─ ...                  20+ weitere Module
│
├─ pages/                  Standalone-Pages (Clean URLs via _redirects)
│  ├─ berichtsheft/        IHK-Ausbildungsnachweise + AI-Generator
│  ├─ aufgaben/            Task-Manager
│  ├─ rechte-checker/      Azubi-Rechte interaktiv prüfen
│  ├─ vertrags-manager/    Gehalt, Urlaub
│  ├─ fahrtkosten/         Pendlerpauschale, Routing
│  ├─ skill-tree/          RPG-Gamification
│  ├─ analytics/           Advanced Analytics
│  ├─ archflow/            Architektur-Visualisierung
│  ├─ en/                  Englische Version
│  └─ ...
│
├─ Assets/                 Statische Ressourcen (css, js, icons)
│  └─ js/Cloud/            Supabase-Integration (Auth + Sync)
│
├─ config/                 supabase-config.js (anon key, public-safe)
├─ Grafiken/               Icons + Intro-Video
├─ Rechtliches/            LICENSE, PRIVACY, SECURITY, CODE_OF_CONDUCT
│
├─ _headers                Cloudflare Pages Headers (CSP, Security)
└─ _redirects              Clean URLs (/berichtsheft → /pages/berichtsheft.html)
```

**Convention:** Components heißen `{name}.{css,html,js}` und werden in `index.html` per `<script src>` geladen — Reihenfolge wichtig (core → dashboard → ... → extras).

---

## Tech Stack

| Layer | Technologie |
|---|---|
| **Frontend** | Vanilla HTML/CSS/JavaScript (kein Framework, kein Bundler) |
| **Storage** | `localStorage` mit JSON-Schema + Backup-Rotation (10×) |
| **Cloud-Sync** (optional) | Supabase (Auth + Postgres + RLS) |
| **AI-Proxy** | Cloudflare Worker → OpenRouter (Free Tier) |
| **PWA** | Service Worker + Web App Manifest |
| **Sicherheit** | DOMPurify 3.2.4, AES-256-GCM Backup-Encryption |
| **P2P** | WebRTC via SimplePeer + TURN |
| **Hosting** | Cloudflare Pages → `myworklog.de` |
| **Build** | Kein Build — Roh-Files direkt deployed |
| **Tests** | Jest + ESLint |

---

## Cloud-Sync (optional)

Daten bleiben **per Default lokal**. Wer Sync zwischen Geräten will:

1. Account auf [supabase.com](https://supabase.com) anlegen (free tier reicht)
2. Project-URL und **anon key** in `config/supabase-config.js` eintragen
3. RLS-Policies aus `DB/rls-policies.sql` einspielen
4. In der App via Magic-Link einloggen → Auto-Sync läuft

**Warum sicher:**
- `anon key` ist **public-by-design** (steht im Frontend, das ist okay)
- Sicherheit hängt an Row-Level-Security — User sehen nur eigene Rows
- `service_role`-Key ist nur Backend (niemals client-side)
- API-Keys für AI laufen über Cloudflare-Worker (`ai-proxy.myworklog.de`), nie im Frontend

---

## Browser-Support

| Browser | Min-Version |
|---|---|
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |

PWA-Install funktioniert auf allen Modern-Browsers. WebGPU für On-Device-LLM nur Chromium-basiert (Chrome / Edge / Arc).

---

## Versionierung

Aktuelle Version: **v3.5.4** (Release 2026-05-31)

```
4.1.7   Der komplette IT-Lernbereich wurde von Grund auf neu gestaltet
4.1.6   Der NFC-Bereich (Chip-Scanner) hat ein großes optisches Upgrade bekommen
4.1.5   Im Verlauf ließen sich auf Handy und Tablet keine Einträge bearbeiten, ansehen oder löschen
4.1.4   Die kleinen Hilfe-Fenster hinter den „?“-Knöpfen wurden überarbeitet
...
```

Vollständige Liste in `config/version.json` oder auf https://myworklog.de/ -> Support.

---

## Mitmachen

Pull Requests willkommen. Für größere Änderungen erst Issue öffnen.

- **Bug?** → [Issues](https://github.com/TechNova-App-Team/MyWorkLog/issues)
- **Feature-Idee?** → [Issues](https://github.com/TechNova-App-Team/MyWorkLog/issues) (mit Label `enhancement`)
- **Code beisteuern?** → [CONTRIBUTING.md](Rechtliches/CONTRIBUTING.md)
- **Security-Lücke?** → [SECURITY.md](Rechtliches/SECURITY.md) (Disclosure-Process)
- **Verhalten?** → [CODE_OF_CONDUCT.md](Rechtliches/CODE_OF_CONDUCT.md)

---

## Lizenz

[MIT](Rechtliches/LICENSE.md) © TechNova App Team

Forks, Fork-and-Sell, kommerzielle Nutzung, alles erlaubt — Hauptsache der Copyright-Hinweis bleibt.

---

<div align="center">

<sub>Gebaut mit Vanilla-JS, Kaffee und der Überzeugung, dass Zeiterfassung nicht kompliziert sein muss.</sub>

<br>

[Website](https://myworklog.de/) · [Impressum](https://myworklog.de/Impressum/) · [Datenschutz](https://myworklog.de/DSGVO/) · [Security](Rechtliches/SECURITY.md)

</div>
