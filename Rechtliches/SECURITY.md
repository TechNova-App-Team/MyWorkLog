# SECURITY POLICY

**MyWorkLog** — Deutsche PWA für Azubi-Zeiterfassung
**Aktuelle Version:** 3.9.2 · **Release:** 2026-06-19 · **Host:** myworklog.de (Cloudflare Pages)

**Language / Sprache:** [Deutsch](#deutsch) · [English](#english)

---

<a id="deutsch"></a>

## Sicherheitslücke gefunden?

**Bitte NICHT** über ein öffentliches GitHub-Issue melden.

Vertrauliche E-Mail an: **security@myworklog.de**
Alternativ: `info@myworklog.de` mit Betreff `[SECURITY] <Kurztitel>`.

### Was in die Meldung gehört

- **Beschreibung** — Was ist das Problem? Welche Komponente/Route (`/`, `/pages/berichtsheft/`, `ai-proxy.myworklog.de`, Supabase-Sync, …)?
- **Auswirkung** — Wer ist betroffen (alle Nutzer, nur mit Cloud-Sync, nur bei bestimmten Browsern)? Datenverlust möglich?
- **Reproduktion** — Schritte, ggf. Payload, betroffene Version aus `config/version.json`.
- **Vorschlag zur Behebung** — optional, aber hilfreich.
- **Kontakt** — Name/Handle + E-Mail, falls Credits gewünscht sind.

### Reaktionszeiten (Zielwerte, Einzelperson/Hobby-Projekt)

| Schritt | Ziel |
|---|---|
| Eingangsbestätigung | ≤ 72 h |
| Erste Bewertung + Schweregrad | ≤ 14 Tage |
| Fix bzw. Advisory | ≤ 90 Tage (abhängig vom Schweregrad) |

---

## Schweregrade

| Level | Beispiele | Ziel-Timeline |
|---|---|---|
| **CRITICAL** | RCE im Worker, unautorisierter Fremd-Zugriff auf Supabase-Daten anderer Nutzer, Account-Übernahme | Hotfix asap |
| **HIGH** | XSS mit Datenexfiltration, Cloud-Sync-Auth-Bypass, Schlüssel-Leak in Worker-Response, Bypass der WAF-Rate-Limits | 7 Tage |
| **MEDIUM** | XSS in isoliertem Kontext ohne sensible Daten, fehlende Input-Validierung mit begrenzter Wirkung, Denial-of-UI | 30 Tage |
| **LOW** | Kosmetische Auffälligkeiten, DoS nur unter Edge-Bedingungen, veraltete Third-Party-Version ohne bekannte Ausnutzung | Nächster Feature-Release |

---

## Scope

### Im Scope

- `myworklog.de` und `*.myworklog.pages.dev` (SPA + alle `/pages/*/`)
- Cloudflare Worker `ai-proxy.myworklog.de` (Berichtsheft-KI-Proxy)
- Supabase-Cloud-Sync-Integration (Client-seitiger Code + genutzte Endpunkte)
- Auslieferungs-Konfiguration: `_headers`, `_redirects`, `service-worker.js`, `manifest.json`
- Verschlüsselter Backup-Export (`components/core/encrypted-backup.js`)

### Außer Scope

- Angriffe gegen Cloudflare-Infrastruktur selbst (bitte an Cloudflare)
- Angriffe gegen Supabase-Infrastruktur (bitte an Supabase)
- Social Engineering, physischer Zugriff
- Fehlende Security-Header, die reine „Best Practice"-Empfehlungen ohne konkreten Angriffsvektor sind, ohne Proof-of-Concept
- Selbst-XSS ohne Multiplikator (User klebt eigenen Code in DevTools)
- Rate-Limit-Findings ohne Bypass (WAF ist bewusst 30/10min + 20/24h pro IP)

---

## Datenfluss & Angriffsflächen

### Daten liegen primär beim Nutzer

- `localStorage`: `tg_pro_data` (Haupt-JSON), `tg_pro_data_backups` (10 Rolling-Backups), `tg_timer`/`tg_timer_log`
- Kein Backend für die Kernfunktion — Zeiterfassung läuft komplett clientseitig
- PWA + Service-Worker (`service-worker.js`) für Offline-Nutzung; Cache-Strategie `cache: 'reload'`, `max-age=0, must-revalidate` in `_headers`

### Optionaler Cloud-Sync (Supabase)

- Nutzerspezifisch, opt-in in den Einstellungen (Tab „Cloud")
- Client authentifiziert sich per Supabase Auth; alle Requests laufen über TLS
- Row Level Security auf Supabase-Seite trennt Nutzerdaten
- Meldenswert: alles, was RLS aushebelt oder Fremdzeilen sichtbar/schreibbar macht

### KI-Proxy (`ai-proxy.myworklog.de`)

- Cloudflare Worker, spricht mit OpenRouter (free tier)
- **API-Keys ausschließlich in Cloudflare-Worker-Secrets** — nie im Frontend
- CORS auf `localhost`, `127.0.0.1`, `myworklog.de`, `*.myworklog.pages.dev` beschränkt
- Rate Limiting: Cloudflare WAF (Zone `myworklog.de`) — Burst 30/10min + Tageslimit 20/24h pro IP, mit `Retry-After`
- Meldenswert: Key-Leak in Antworten, CORS-Bypass, Auth-Bypass, Prompt-Injection mit realem Impact über den KI-Output hinaus

### Verschlüsselte Backups

- `components/core/encrypted-backup.js` — Nutzer-Passphrase → WebCrypto (AES-GCM), Salt/IV pro Backup
- Meldenswert: Fehler in KDF/IV-Handling, Downgrade, Möglichkeit zur Passphrase-Extraktion

---

## Implementierte Schutzmaßnahmen

- **DOMPurify 3.2.4** eingebunden für HTML-Sanitisierung
- **`safeHTML()` / `esc()`** als Konvention für User-Input, statt roher `innerHTML`-Zuweisung (`CLAUDE.md → Sicherheit`)
- **CSP** via `_headers` (bitte im Repo-Zustand prüfen, wird kontinuierlich verschärft)
- **Kein `eval()`**, keine dynamische Code-Ausführung im Frontend
- **`_headers`** setzt `Cache-Control: max-age=0, must-revalidate` auf HTML/CSS/JS ohne Fingerprinting (siehe `CLAUDE.md → Lessons Learned`)
- **Service-Worker** nutzt `cache: 'reload'` — ignoriert den HTTP-Cache und liefert kein Stale-JS aus, wenn ein Sicherheits-Fix ausgerollt wird
- **Cloud-Sync-Locks** — `lockSettingsClose()` verhindert Race-Conditions, die frisch geholte Cloud-Daten mit veraltetem Form-State überschreiben könnten
- **WAF-Rate-Limiting** auf `ai-proxy.myworklog.de` (Burst + Tageskontingent)

---

## Version-Support

| Version | Status | Support |
|---|---|---|
| 3.9.x (aktuell) | ✅ Supported | Aktiv gepatcht |
| 3.7.x – 3.8.x | ⚠️ Nur kritische Fixes | Bis nächster Major |
| < 3.7 | ❌ End of Life | Kein Support |

**Empfehlung:** Da MyWorkLog eine PWA ist, holt sich der Browser Updates automatisch. Wenn ein „Update verfügbar"-Banner erscheint: einmal klicken, reload — fertig.

Vollständige Versionshistorie: `config/version.json`.

---

## Advisory-Format (Beispiel)

```
MWL-ADVISORY-YYYY-NN
Type:      z. B. XSS / Auth-Bypass / Info-Disclosure
Severity:  CRITICAL / HIGH / MEDIUM / LOW
Affected:  Versionen X.Y.Z – X.Y.Z
Fixed in:  X.Y.Z (Release YYYY-MM-DD)
Reporter:  <Name oder anonym>

Beschreibung:
  Kurzbeschreibung ohne ausnutzbare Details, bis Fix ausgerollt.

Empfohlene Aktion:
  → App neu laden (holt via Service-Worker die neue Version)
  → Optional: Browser-Cache leeren
```

Veröffentlichung erfolgt nach Rollout des Fixes, um andere Nutzer nicht zu gefährden.

---

## Datenschutz der Meldung

- Meldungen werden vertraulich behandelt
- Details werden vor dem Fix nicht veröffentlicht
- Credits nur mit ausdrücklicher Zustimmung des Reporters
- Anonyme Meldungen sind willkommen
- Keine Weitergabe von Kontaktdaten an Dritte

---

## Safe Harbor

Wer sich an diese Policy hält (kein Datenklau, keine Störung des Betriebs, keine Nutzung/Weitergabe fremder Daten), wird nicht rechtlich verfolgt. Der Betrieb der App ist ein Einzelprojekt — bitte fair testen, keine automatisierten Scans mit hoher Last gegen die Live-Domain.

---

## Kontakt

- **Security:** `security@myworklog.de`
- **Allgemein:** `info@myworklog.de`
- **GitHub-Issues:** ausschließlich für Non-Security-Themen

---

<a id="english"></a>

## Found a Vulnerability?

**Please DO NOT** open a public GitHub issue.

Confidential email to: **security@myworklog.de**
Or: `info@myworklog.de` with subject `[SECURITY] <short title>`.

### What to include

- **Description** — Which component/route (`/`, `/pages/berichtsheft/`, `ai-proxy.myworklog.de`, Supabase sync, …)?
- **Impact** — Who is affected? Data loss possible?
- **Reproduction** — Steps, payload, affected version from `config/version.json`.
- **Suggested fix** — optional but appreciated.
- **Contact** — name/handle + email, if credits are wanted.

### Response times (targets, solo/hobby project)

| Step | Target |
|---|---|
| Acknowledgment | ≤ 72 h |
| Initial assessment + severity | ≤ 14 days |
| Fix or advisory | ≤ 90 days (depends on severity) |

---

## Severity levels

| Level | Examples | Target timeline |
|---|---|---|
| **CRITICAL** | RCE in the Worker, unauthorized cross-user access to Supabase data, account takeover | Hotfix asap |
| **HIGH** | XSS with data exfiltration, cloud-sync auth bypass, secret leak in Worker response, WAF rate-limit bypass | 7 days |
| **MEDIUM** | XSS in isolated context without sensitive data, missing input validation with limited impact, denial-of-UI | 30 days |
| **LOW** | Cosmetic issues, edge-case DoS, outdated third-party version without known exploit | Next feature release |

---

## Scope

### In scope

- `myworklog.de` and `*.myworklog.pages.dev` (SPA + all `/pages/*/`)
- Cloudflare Worker `ai-proxy.myworklog.de` (Berichtsheft AI proxy)
- Supabase cloud-sync integration (client-side code + used endpoints)
- Delivery configuration: `_headers`, `_redirects`, `service-worker.js`, `manifest.json`
- Encrypted backup export (`components/core/encrypted-backup.js`)

### Out of scope

- Attacks against Cloudflare's own infrastructure (please report to Cloudflare)
- Attacks against Supabase's own infrastructure (please report to Supabase)
- Social engineering, physical access
- Missing security headers as pure "best practice" without a concrete attack vector or proof-of-concept
- Self-XSS with no multiplier (user pastes their own code in DevTools)
- Rate-limit findings without an actual bypass (WAF is intentionally 30/10min + 20/24h per IP)

---

## Data flow & attack surface

### Data primarily stays with the user

- `localStorage`: `tg_pro_data` (main JSON), `tg_pro_data_backups` (10 rolling backups), `tg_timer` / `tg_timer_log`
- No backend for core functionality — time tracking runs entirely client-side
- PWA + service worker (`service-worker.js`) for offline use; cache strategy `cache: 'reload'`, `max-age=0, must-revalidate` in `_headers`

### Optional cloud sync (Supabase)

- Per-user, opt-in in settings (tab "Cloud")
- Client authenticates via Supabase Auth; requests over TLS
- Row Level Security on the Supabase side isolates user data
- Report anything that bypasses RLS or makes other users' rows visible/writable

### AI proxy (`ai-proxy.myworklog.de`)

- Cloudflare Worker, talks to OpenRouter (free tier)
- **API keys exclusively in Cloudflare Worker secrets** — never in the frontend
- CORS restricted to `localhost`, `127.0.0.1`, `myworklog.de`, `*.myworklog.pages.dev`
- Rate limiting: Cloudflare WAF (zone `myworklog.de`) — burst 30/10min + 20/24h per IP, with `Retry-After`
- Report: key leaks in responses, CORS bypass, auth bypass, prompt injection with real impact beyond the AI output itself

### Encrypted backups

- `components/core/encrypted-backup.js` — user passphrase → WebCrypto (AES-GCM), salt/IV per backup
- Report: KDF/IV mistakes, downgrade, passphrase extraction paths

---

## Implemented mitigations

- **DOMPurify 3.2.4** for HTML sanitization
- **`safeHTML()` / `esc()`** as project convention for user input, instead of raw `innerHTML` (see `CLAUDE.md → Sicherheit`)
- **CSP** via `_headers` (continuously tightened; check repo state)
- **No `eval()`**, no dynamic code execution in the frontend
- **`_headers`** sets `Cache-Control: max-age=0, must-revalidate` on non-fingerprinted HTML/CSS/JS (see `CLAUDE.md → Lessons Learned`)
- **Service worker** uses `cache: 'reload'` — bypasses the HTTP cache, ensuring security fixes are actually picked up
- **Cloud-sync locks** — `lockSettingsClose()` prevents races that would overwrite freshly downloaded cloud data with stale form state
- **WAF rate limiting** on `ai-proxy.myworklog.de` (burst + daily quota)

---

## Version support

| Version | Status | Support |
|---|---|---|
| 3.9.x (current) | ✅ Supported | Actively patched |
| 3.7.x – 3.8.x | ⚠️ Critical fixes only | Until next major |
| < 3.7 | ❌ End of Life | No support |

**Recommendation:** Because MyWorkLog is a PWA, the browser picks up updates automatically. When an "Update available" banner appears: click once, reload — done.

Full version history: `config/version.json`.

---

## Advisory format (example)

```
MWL-ADVISORY-YYYY-NN
Type:      e.g. XSS / auth bypass / info disclosure
Severity:  CRITICAL / HIGH / MEDIUM / LOW
Affected:  versions X.Y.Z – X.Y.Z
Fixed in:  X.Y.Z (release YYYY-MM-DD)
Reporter:  <name or anonymous>

Description:
  Short description without exploitable details until the fix is rolled out.

Recommended action:
  → Reload the app (service worker fetches the new version)
  → Optional: clear browser cache
```

Published only after the fix is deployed, to avoid exposing other users.

---

## Report privacy

- Reports are handled confidentially
- Details are not published before the fix
- Credits only with explicit consent
- Anonymous reports welcome
- Contact info is not shared with third parties

---

## Safe harbor

If you follow this policy (no data theft, no disruption, no use/redistribution of other users' data), no legal action will be taken. The project is run by a single person — please test fairly and don't blast automated scans at the live domain.

---

## Contact

- **Security:** `security@myworklog.de`
- **General:** `info@myworklog.de`
- **GitHub issues:** non-security topics only

---

<div align="center">

**Thank you for helping keep MyWorkLog secure.**

</div>
