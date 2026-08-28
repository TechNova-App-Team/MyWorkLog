# GitHub Actions in diesem Repo

Zwei Workflows. Der eine prueft den Quelltext, der andere die ausgelieferte Site.
Der zweite ist der wichtigere — er sieht Dinge, die lokal grundsaetzlich nicht
messbar sind.

## Warum ueberhaupt

Cloudflare Pages deployt, was ankommt. Es fuehrt keinen Test aus, es prueft keinen
Pfad, es meldet nichts. Die einzige Abnahme war bisher der lokale Pre-Commit-Hook —
und der greift nicht bei `git commit --no-verify`, nicht bei einem Commit ueber die
GitHub-Oberflaeche und nicht, wenn ein zweiter Agent im Arbeitsbaum committet.

Dazu kommt das eigentliche Problem: **das Routing dieser Site steht nicht
vollstaendig im Repo.** Eine Rewrite-Regel im Cloudflare-Dashboard laeuft am Edge
vor `_redirects` und kann jede Zeile darin ueberstimmen. Sie ist nirgends im Code
sichtbar. Aendert sie sich, bleibt lokal alles gruen und live faellt etwas aus.

Genau das ist passiert: `/archflow/archflow-data.js` lag auf 404, waehrend die
Regel in `_redirects` sich vollkommen richtig las. Die Architektur-Karte war leer,
und kein Test der Welt haette das gefunden — weil die Ursache ausserhalb des Repos
lag. Der Live-Check haette es am selben Tag gemeldet.

## Workflow 1 — `tests.yml`

Laeuft bei **jedem Push auf main und jedem Pull Request**.

| Schritt | Was er faengt |
|---|---|
| `npm ci` | Lockfile driftet von `package.json` weg |
| `npm run build:index` | fehlendes Fragment, falscher Include-Name in `index.template.html` |
| `npm run i18n:build` + Grep | eine neue deutsche Zeichenkette ohne englische Entsprechung |
| `npm run test:all` | alle `tools/*.test.mjs` — 15 auf dem Runner, siehe unten |

### Ein Test laeuft in CI bewusst nicht

`umfrage-worker.test.mjs` liest `workers/ai-proxy/worker.js` — und `workers/`
steht in `.gitignore` (Zeile 167), weil der Worker von Hand deployed wird. Auf
einem Runner gibt es die Datei also nie. Der erste CI-Lauf ist genau daran
gescheitert.

Der Test steigt jetzt mit **Exit 2 = uebersprungen** aus, wenn die Datei fehlt
**und** `CI` gesetzt ist. Fehlt sie lokal, bricht er mit Exit 1 ab — dort ist das
ein echter Befund, denn ohne die Datei gibt es vor dem naechsten manuellen
Worker-Deploy keine Absicherung.

`run-tests.mjs` zaehlt Uebersprungene getrennt und schreibt sie namentlich hin:
`15/15 gelaufene Tests gruen — 1 uebersprungen`. Ein uebersprungener Test darf
nie als gruen durchgehen, sonst meldet die Zeile am Ende eine Deckung, die es
nicht gibt.

Der i18n-Schritt greppt die Ausgabe nach `<n> fehlend` mit n > 0. Das ist noetig,
weil `i18n:build` selbst mit Exit 0 endet und die Luecke still mit Deutsch
auffuellt — „0 fehlend" ist die einzige Stelle, an der es sichtbar wird.

`build:index:check` laeuft hier bewusst **nicht**: `index.html` ist gitignored, in
einem frischen Clone gibt es sie nicht, der Vergleich liefe gegen `null` und waere
immer rot. Der `--check` ist ein rein lokales Werkzeug gegen Hand-Edits.

## Workflow 2 — `live-check.yml`

Laeuft **taeglich um 06:00 UTC**, nach einem Push auf `_redirects` / `_headers` /
`sitemap.xml` / `config/version.json`, und von Hand ueber „Run workflow".

`tools/live-check.mjs` prueft gegen `https://myworklog.de`:

1. **Jede `<loc>` aus `sitemap.xml`** muss DIREKT 200 liefern. Ein 301 oder 308
   ist hier ein Fehler — dann stimmt der Canonical nicht mehr.
2. **Dateien ohne `<loc>`**, die trotzdem erreichbar sein muessen: die
   ArchFlow-Daten, der Shared Footer, `version.json`, Service Worker, Manifest,
   Sitemap, robots.txt. Weiterleitung unterwegs ist erlaubt (Cloudflare strippt
   `.html` per 308), das Ergebnis muss aber 200 sein.
3. **Weiterleitungen, die halten muessen** — aktuell die URL aus dem
   Chrome-Web-Store-Eintrag. Auf die zeigt kein einziger Link im Repo; bricht sie,
   merkt es sonst niemand.
4. **Die Fehlerseite** muss auf einem erfundenen Pfad echten Status 404 liefern.
   Ein Soft-404 (Status 200) laesst Google Unsinn indexieren.
5. **Bekannt kaputte Adressen** — nur Hinweis, kein Fehler.

Nach einem Push wartet der Lauf 180 Sekunden, sonst misst er die vorige Fassung
und meldet Fehler, die schon behoben sind.

### Die Liste „bekannt kaputt"

Vier Adressen stehen als 301 in `_redirects` und funktionieren trotzdem nicht,
weil die Dashboard-Regel sie vorher frisst:

```
/archflow      308 → /pages/archflow/   statt /archflow/
/impressum     404                       wird oft abgetippt
/dsgvo         404                       wird oft abgetippt
/Weihnachten   404                       Altlast
```

Sie stehen bewusst NICHT als Fehler drin — ein dauerhaft roter Lauf wird nach der
zweiten Woche ignoriert, und dann faellt der echte Fehler auch nicht mehr auf.
Der Test dreht die Logik um: **faengt eine davon an zu funktionieren, sagt er
Bescheid.** Dann ist die Dashboard-Regel geaendert worden, und die Zeile gehoert
aus `BEKANNT_KAPUTT` nach `REDIRECTS`, damit sie ab da bewacht wird.

Reparieren laesst sich das nur im Cloudflare-Dashboard oder mit einem echten
Verzeichnis unter `pages/`. Mit `_redirects` nicht.

## Lokal

```bash
npm run test:all                              # alle tools/*.test.mjs
npm run check:pfade                           # tote JS/CSS-Verweise in pages/**
npm run check:live                            # gegen myworklog.de
node tools/live-check.mjs http://localhost:5001   # gegen Portman
```

## Was NICHT in CI gehoert

- **Bauen und Deployen** — macht Cloudflare Pages. Ein zweiter Build hier waere
  nur eine zweite Wahrheit.
- **Lighthouse / Performance** — auf Shared Runnern zu verrauscht fuer ein
  Rot/Gruen-Urteil.
- **`prune-deploy.js`** — laeuft ausschliesslich mit `CF_PAGES=1`. Auf einem
  Runner ohne diese Variable passiert nichts, und das soll auch so bleiben.

## Wenn ein Lauf rot ist

- **Live-Check rot, Tests gruen** → Ursache liegt fast immer ausserhalb des Repos.
  Zuerst den Aenderungsverlauf der Rewrite-Regel im Cloudflare-Dashboard ansehen,
  **bevor** jemand `_redirects` anfasst.
- **Tests rot nach einem i18n-Schritt** → eine neue deutsche Zeichenkette hat
  keinen Override. Nachtragen in `tools/i18n/dict/<seite>.en-overrides.json`.
- **`asset-pfade` rot** → ein `<script>`/`<link>` zeigt auf eine Datei, die es
  nicht gibt, oder ist relativ statt absolut ab Root. Beides ist im Browser stumm.
