# MyWorkLog — Projekt-Kontext

Deutsche PWA für Azubi-Zeiterfassung. Vanilla HTML/CSS/JS, kein Framework/Bundler/Module. GitHub Pages → myworklog.de. v3.3.4b

## Architektur

Kein Build. Rohe Dateien via `<script src>` in index.html (Reihenfolge wichtig!). Alle JS-Funktionen global. package.json nur devDeps (jest/eslint).

**Struktur:** index.html=SPA(~5500Z), components/{name}/{css,html,js}, Assets/{css,js}, Pages/=Standalone, config/, AI-Bot/

**Script-Reihenfolge:** CDN-Libs → Utilities → AI-Bot → Component CSS/HTML → Component JS: core→dashboard→...→settings→sidebar→extra

## Konventionen

**JS:** Globale Fns (keine Klassen außer AIBotEnginePro). Header: `// ═══ {NAME} MODULE ═══`. getElementById() für IDs. safeHTML()/esc() für User-Input. uEvent() für Analytics. DE/EN-Mix in Vars.

**CSS:** :root Custom Props (Dark-Default). Light: `[data-theme="light"]`. Tokens: --primary:#a855f7, --bg-deep:#030305, --radius:20px. Inter+JetBrains Mono. Glassmorphism via --bg-glass+backdrop-filter.

**Storage:** localStorage `tg_pro_data`(JSON), Backup `tg_pro_data_backups`(10x), Timer `tg_timer`/`tg_timer_log`. save()=cleanup→backup→write→UI. Optional: Supabase Cloud-Sync.

## Aufgaben

**Neue Komponente:** components/{name}/ → {css,html,js}. index.html: CSS im head, HTML inline, JS vor </body>. Global, kein export.

**Standalone-Seite:** Pages/{name}.html + Assets/{css,js}/{name}/. Pfade: ../../Assets/...

**Tests:** `npm test` | `npm run test:watch` | `npm run test:coverage` | `npm run lint`

## Schlüsseldateien

core.js=save/load/Timer, settings.js=Theme/Export, dashboard.js=KPIs/Charts, version.json=Version, service-worker.js=Cache, aibot-engine-pro.js=NLP

## Sicherheit

IMMER safeHTML()/esc() für User-Input. Kein innerHTML mit ungefiltertem Content. CSP beachten. DOMPurify 3.2.4 eingebunden.

## Deploy

Push main → GitHub Actions (static.yml) → Pages. Browser: Chrome90+/FF88+/Safari14+/Edge90+
