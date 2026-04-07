# CLAUDE.md — MyWorkLog Project Intelligence

## Projekt-Übersicht
MyWorkLog ist eine **deutsche PWA** (Progressive Web App) für Azubis zur Zeiterfassung & Ausbildungs-Fortschrittsverfolgung.  
**Tech:** Vanilla HTML/CSS/JS — KEIN Framework, KEIN Bundler, KEINE Module.  
**Hosting:** GitHub Pages → myworklog.de  
**Version:** 3.3.4b

## Architektur (KRITISCH — lies das zuerst!)

### Kein Build-System
- Kein Webpack/Vite/Rollup. Kein npm build. Alles sind **rohe Dateien**.
- `<script src="...">` Tags in index.html laden alles. Reihenfolge ist wichtig!
- Alle JS-Funktionen sind **global scoped** (kein `export`/`import`).
- `package.json` hat nur devDependencies (jest, eslint).

### SPA-Struktur
```
index.html          ← Haupt-SPA (~5500 Zeilen HTML)
components/{name}/  ← Jede Komponente hat: {name}.css, {name}.html, {name}.js
Assets/css/         ← Globale & Feature-CSS
Assets/js/          ← Globale & Feature-JS
Pages/              ← Standalone-Seiten (nicht Teil der SPA)
config/             ← version.json, supabase-config.js
AI-Bot/             ← KI-Engine (NLP + WebLLM)
```

### Script-Ladereihenfolge in index.html
1. CDN-Libs (SimplePeer, Chart.js 3.9, Three.js 0.145, jsPDF, DOMPurify 3.2.4, Supabase v2, EmailJS)
2. Utility-Scripts (version-loader, shortcuts, touch-mobile-optimizations)
3. AI-Bot Scripts
4. Component CSS & HTML (inline)
5. Component JS (bottom): core.js → dashboard.js → ... → settings.js → sidebar.js → extra.js

## Code-Konventionen

### JavaScript
- **Globale Funktionen** — keine Klassen (Ausnahme: `AIBotEnginePro`)
- Modul-Header: `// ═══ {NAME} MODULE ═══`
- DOM-Zugriff: `document.getElementById()`, nie querySelector für IDs
- HTML-Templates: Template-Literals in JS-Funktionen
- Sanitization: `safeHTML()` (nutzt DOMPurify), `esc()` für User-Content
- Analytics: `uEvent('event_name')` für Umami-Tracking
- **Mischung DE/EN** in Variablennamen (z.B. `breakMinutes`, `Pausenzeit`)

### CSS
- Custom Properties in `:root` (Dark-Default)
- Light-Theme: `[data-theme="light"]` auf `<html>`
- Design-Tokens: `--primary: #a855f7`, `--bg-deep: #030305`, `--radius: 20px`
- Fonts: Inter (UI), JetBrains Mono (Code/Zahlen)
- Glassmorphism: `--bg-glass: rgba(22, 22, 26, 0.65)` + `backdrop-filter: blur()`

### Datenspeicherung
- **Primär:** `localStorage` Key `tg_pro_data` (JSON)
- **Backup:** `tg_pro_data_backups` (letzte 10 Snapshots)
- **Timer:** `tg_timer`, `tg_timer_log`
- **Feature-Flags:** diverse localStorage-Keys
- **`save()`-Funktion:** cleanup → backup → write → UI-Update
- **Optional:** Supabase Cloud-Sync

## Häufige Aufgaben

### Neue Komponente erstellen
1. Ordner `components/{name}/` anlegen
2. `{name}.css`, `{name}.html`, `{name}.js` erstellen
3. In `index.html`: CSS-Link im `<head>`, HTML inline, JS-Script vor `</body>`
4. Funktionen global deklarieren (kein export)

### Standalone-Seite (Pages/)
- Eigene HTML-Datei mit eigenem `<head>`
- CSS/JS entweder inline oder in `Assets/css/{feature}/` und `Assets/js/{feature}/`
- Relative Pfade: `../../Assets/...` oder `../../index.html`

### Tests
```bash
npm test              # Jest ausführen
npm run test:watch    # Watch-Mode
npm run test:coverage # Coverage
npm run lint          # ESLint
```

## Wichtige Dateien (lies diese bei Bedarf)
| Datei | Inhalt |
|---|---|
| `components/core/core.js` | Kern-Logik: save(), load(), Timer, Datenverwaltung |
| `components/settings/settings.js` | App-Einstellungen, Theme, Export/Import |
| `components/dashboard/dashboard.js` | Hauptansicht, KPIs, Charts |
| `config/version.json` | Version & Changelog |
| `config/supabase-config.js` | Cloud-Sync Setup |
| `service-worker.js` | PWA-Caching (Cache v1.12) |
| `AI-Bot/aibot-engine-pro.js` | NLP-Engine für den KI-Assistenten |

## Sicherheitsregeln
- IMMER `safeHTML()` oder `esc()` für User-Input nutzen
- Keine `innerHTML` mit ungefiltertem Content
- CSP-Header in index.html beachten bei neuen CDN-Quellen
- API-Keys gehören NICHT in den Code (Supabase-Anon-Key ist OK, ist client-side)
- DOMPurify 3.2.4 ist bereits eingebunden

## Browser-Support
Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Deployment
Push zu `main` → GitHub Actions (`static.yml`) → GitHub Pages → myworklog.de
