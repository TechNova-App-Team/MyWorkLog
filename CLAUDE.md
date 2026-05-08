# MyWorkLog — Projekt-Kontext

Deutsche PWA für Azubi-Zeiterfassung. Vanilla HTML/CSS/JS, kein Framework/Bundler/Module. Cloudflare Pages → myworklog.de. v3.5.3

## Architektur

Kein Build. Rohe Dateien via `<script src>` in index.html (Reihenfolge wichtig!). Alle JS-Funktionen global. package.json nur devDeps (jest/eslint).

**Struktur:** index.html=SPA(~5500Z), components/{name}/{css,html,js}, Assets/{css,js}, pages/{name}/index.html=Standalone Clean URLs, config/, AI-Bot/

**Script-Reihenfolge:** CDN-Libs → Utilities → AI-Bot → Component CSS/HTML → Component JS: core→dashboard→...→settings→sidebar→extra

**Clean URLs:** Standalone Pages nutzen `/pages/{name}/` statt `/Pages/{name}.html` für besseres SEO & Cloudflare Pages Kompatibilität

## Konventionen

**JS:** Globale Fns (keine Klassen außer AIBotEnginePro). Header: `// ═══ {NAME} MODULE ═══`. getElementById() für IDs. safeHTML()/esc() für User-Input. uEvent() für Analytics. DE/EN-Mix in Vars.

**CSS:** :root Custom Props (Dark-Default). Light: `[data-theme="light"]`. Tokens: --primary:#a855f7, --bg-deep:#030305, --radius:20px. Inter+JetBrains Mono. Glassmorphism via --bg-glass+backdrop-filter.

**Storage:** localStorage `tg_pro_data`(JSON), Backup `tg_pro_data_backups`(10x), Timer `tg_timer`/`tg_timer_log`. save()=cleanup→backup→write→UI. Optional: Supabase Cloud-Sync.

## Aufgaben

**Neue Komponente:** components/{name}/ → {css,html,js}. index.html: CSS im head, HTML inline, JS vor </body>. Global, kein export.

**Standalone-Seite:** Pages/{name}.html + Assets/{css,js}/{name}/. Pfade: ../../Assets/...

**Tests:** `npm test` | `npm run test:watch` | `npm run test:coverage` | `npm run lint`

**UI** Nutze Sehr hochmodernen Style der Firmen Vibe ist, nutzte für Ui immer das plugin /frontend-design. Das design soll auch für handys optimiert sein und dark theme.

## Schlüsseldateien

core.js=save/load/Timer, settings.js=Theme/Export, dashboard.js=KPIs/Charts, version.json=Version, service-worker.js=Cache, aibot-engine-pro.js=NLP

## Sicherheit

IMMER safeHTML()/esc() für User-Input. Kein innerHTML mit ungefiltertem Content. CSP beachten. DOMPurify 3.2.4 eingebunden.

## Deployment & Pfad-Architektur (CRITICAL!)

**Host:** Cloudflare Pages (myworklog.pages.dev / myworklog.de). KEIN GitHub Pages mehr.
- Cloudflare Pages versteckt `/pages/` Ordner und `.html` Endungen via `_redirects`
- Alle Asset-Links MÜSSEN absolute Root-Pfade sein (`/Assets/...`, `/components/...`, `/Grafiken/...`, `/config/...`)
- Relative Pfade (`./` oder `../`) brechen sofort, wenn URL umgeleitet wird (z.B. `/aufgaben/` wird intern zu `/pages/aufgaben/`, relative Pfade suchen dort nach Assets → 404)
- **Richtig:** `<link rel="stylesheet" href="/Assets/css/core.css">` — Slash = von Domain-Root aus
- **Falsch:** `<link rel="stylesheet" href="./Assets/css/core.css">` — wird zu `/pages/aufgaben/Assets/...` → 404

**Page-Links verwenden Clean URLs:** `/impressum/` statt `/impressum.html` oder `/pages/impressum.html`

**Bei 404-Fehlern auf Live:** Erst Cloudflare Cache löschen ("Purge Everything"), dann prüfen ob Pfade mit `/` anfangen.

## Gemini Proxy (Backend)

**Worker:** `gemini-proxy` auf `gemini-proxy.myworklog.workers.dev`
- Gemini API-Key liegt AUSSCHLIESSLICH in Cloudflare Worker Secrets (`GEMINI_API_KEY`) — nie im Frontend
- Frontend ruft direkt die Worker-URL auf (NICHT `/api/gemini`), um Routing-Konflikte zwischen Cloudflare Pages und Workers auf derselben Domain zu vermeiden
- **Fetch-URL im Frontend:** `https://gemini-proxy.myworklog.workers.dev`
- CORS erlaubt: `localhost`, `127.0.0.1`, `myworklog.de`
- Rate Limiting: Cloudflare WAF Regel — 30 Requests / 10 Minuten pro IP (kein KV, kein Write-Limit)
- Localhost-Dev: eigener API-Key nötig (direkt an Google API), kein Proxy
