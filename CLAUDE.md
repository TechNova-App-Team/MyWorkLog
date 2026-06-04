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

**Footer (PFLICHT):** Jede Standalone-Seite MUSS den geteilten Footer verwenden — KEIN eigener Footer-HTML:
```html
<div id="page-footer"></div>
<script>
  fetch('/pages/footer/footer.html')
    .then(function(r){return r.text();})
    .then(function(html){
      var ph=document.getElementById('page-footer');
      if(!ph)return;
      var t=document.createElement('template');
      t.innerHTML=html;
      ph.replaceWith(t.content);
    });
</script>
```

**Farben (PFLICHT):** Standalone-Seiten nutzen IMMER die Tokens aus `components/core/core.css` — keine eigenen Farbwerte erfinden:
- `--primary:#a855f7` (Purple, Haupt-Akzent)
- `--bg-deep:#030305` (Hintergrund)
- `--text-main:#f8fafc` / `--text-muted:#94a3b8`
- `--success:#10b981` (Grün), `--danger:#ef4444` (Rot)
- `--border:rgba(255,255,255,0.06)`
- Fonts: `--font-main:'Inter'` / `--font-mono:'JetBrains Mono'`

**Tests:** `npm test` | `npm run test:watch` | `npm run test:coverage` | `npm run lint`

**UI** Nutze sehr hochmodernen Clean-SaaS-Style (SAP Fiori / Linear / Vercel Vibe). Nutze für UI immer das plugin /frontend-design. Design muss für Handys optimiert und Dark-Theme sein.

**Design-Vibe: Clean Enterprise SaaS (Dark)**
- Klare Hierarchie, großzügiges Whitespace, subtile Borders (`rgba(255,255,255,0.08)`)
- `border-radius: 12–16px` auf Karten, `8px` auf Inputs/Buttons
- Keine Clip-Path-Polygone oder Corner-Brackets — wirkt billig
- Farben: `--primary:#a855f7` als Akzent, sparsam einsetzen. Backgrounds: gestaffelte Dunkelheit (`#0a0a12`, `#111118`, `#18181f`)
- Icons: immer SVG (Stroke, 1.5px, Lucide-Style), keine Emojis
- Buttons: Solid-Primary (Purple) oder Ghost (transparenter Hintergrund, Border). Klare Hover-States mit `background` + leichtem `box-shadow`
- Inputs: saubere Border, deutlicher Fokus-Ring via `box-shadow: 0 0 0 3px rgba(168,85,247,0.2)`
- Typografie: `Inter` für alles, kein forced Mono außer bei Code/Timestamps
- Micro-Animations: `transition: all 0.2s ease`, kein Overengineering

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

## Cloud-KI Proxy (Backend)

**Worker:** `ai-proxy` auf Custom Domain `ai-proxy.myworklog.de`
- API-Keys liegen AUSSCHLIESSLICH in Cloudflare Worker Secrets — nie im Frontend
- Backend nutzt **OpenRouter** (free tier, 1000 Credits/Tag geteilt) — Gemini wird NICHT mehr verwendet
- Frontend ruft direkt die Custom-Domain-URL auf (NICHT `/api/...`), um Routing-Konflikte mit Pages zu vermeiden
- **Fetch-URL im Frontend:** `https://ai-proxy.myworklog.de` (Konstante `CLOUD_PROXY` in `pages/berichtsheft/index.html`)
- CORS erlaubt: `localhost`, `127.0.0.1`, `myworklog.de`, `*.myworklog.pages.dev`
- Rate Limiting: Cloudflare WAF (Zone myworklog.de) — Burst 30/10min + Tageslimit 20/24h pro IP, beide mit `Retry-After`-Header
- Localhost-Dev: läuft über denselben Proxy (kein eigener Key nötig)
