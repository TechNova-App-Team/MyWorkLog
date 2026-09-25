<div align="center">

<br>

<img src="Grafiken/icon-512.png" alt="MyWorkLog" width="112" height="112">

<br>

# MyWorkLog

### Zeiterfassung und digitales Berichtsheft für Auszubildende

Lokal zuerst · offline nutzbar · ohne Konto · kostenlos · quelloffen

<br>

[![Live](https://img.shields.io/badge/myworklog.de-online-a855f7?style=for-the-badge&logo=googlechrome&logoColor=white&labelColor=0a0a12)](https://myworklog.de/)
[![Version](https://img.shields.io/badge/version-7.5.7-7c3aed?style=for-the-badge&logo=git&logoColor=white&labelColor=0a0a12)](#versionierung)
[![PWA](https://img.shields.io/badge/PWA-installierbar-10b981?style=for-the-badge&logo=pwa&logoColor=white&labelColor=0a0a12)](https://myworklog.de/)
[![License](https://img.shields.io/badge/Lizenz-MIT-eab308?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=0a0a12)](Rechtliches/LICENSE.md)

[![Tests](https://github.com/TechNova-App-Team/MyWorkLog/actions/workflows/tests.yml/badge.svg)](https://github.com/TechNova-App-Team/MyWorkLog/actions/workflows/tests.yml)
[![Live-Check](https://github.com/TechNova-App-Team/MyWorkLog/actions/workflows/live-check.yml/badge.svg)](https://github.com/TechNova-App-Team/MyWorkLog/actions/workflows/live-check.yml)

<br>

[App öffnen](https://myworklog.de/) · [Berichtsheft](https://myworklog.de/berichtsheft/) · [Aufgaben](https://myworklog.de/aufgaben/) · [Rechte-Checker](https://myworklog.de/rechte-checker/) · [Für Ausbilder](https://myworklog.de/ausbilder/) · [English](https://myworklog.de/en/)

<br>

</div>

---

## Was ist MyWorkLog?

MyWorkLog ist eine **Progressive Web App** für Auszubildende in Deutschland: Arbeitszeit erfassen, Gleitzeitkonto führen, das Berichtsheft schreiben und als amtlichen IHK-Vordruck ausgeben — **ohne Konto, ohne Werbe-Tracking, ohne Cloud-Zwang.**

Die App ist reines HTML, CSS und JavaScript und läuft vollständig im Browser. Die Daten liegen im `localStorage` des Geräts. Wer mehrere Geräte abgleichen oder das Berichtsheft vom Ausbilder freigeben lassen will, meldet sich freiwillig an — alles andere funktioniert auch ohne.

| Grundsatz | Was das konkret heißt |
|---|---|
| **Lokal zuerst** | Daten bleiben auf dem Gerät; zehn Sicherungskopien im Hintergrund, verschlüsselter Export auf Wunsch |
| **Offline nutzbar** | Service Worker mit drei Cache-Strategien — die App startet auch ohne Netz |
| **Ohne Werbe-Tracking** | keine Cookies, keine Profile; Nutzungszahlen nur anonym (PostHog EU, cookiefrei) |
| **Für die Ausbildung gebaut** | IHK-Berichtsheft, Prüfungszulassung, BBiG-Rechte, Berufsschule, Untis, Fahrtkosten |
| **KI optional** | Berichtsheft-Vorschläge aus der Cloud (über einen Proxy, kein eigener Schlüssel) oder aus einer lokalen Engine ohne Netz |

---

## Funktionen

<table>
<tr>
<td width="50%" valign="top">

### Zeiterfassung
- Live-Timer mit Pausen, Live-Verdienst-Zähler
- Eintragstypen: Arbeit · Berufsschule · Urlaub · Gleittag · Krankheit · Feiertag · Korrektur — plus eigene Typen und Felder
- Mehrere Jobs mit eigenem Soll, eigener Pause und getrenntem Saldo
- Geteilte Schichten am selben Tag
- Wochen-, Monats- und Jahresansicht, Monatsvergleich
- Verlauf mit Zeitband, Suche mit Operatoren (`>8`, `<6`, `#Projekt`)
- Import aus Excel, CSV und Zwischenablage — Wechsel von anderen Apps ohne Datenverlust

### Auswertung
- KPI-Dashboard mit Ringen, frei anordenbare Widgets
- Trends nach Woche · Monat · Jahr, Heatmap
- ArbZG-Prüfung: Höchstarbeitszeit (§ 3), Ruhepausen (§ 4), Ruhezeit (§ 5)
- Ziele mit Fortschritt
- Export: JSON · CSV · iCal (RFC 5545) · HTML-Bericht mit Diagrammen · verschlüsseltes Backup

### Berichtsheft
- Tages- und Wochenberichte, Kalender, Vorlagen
- Amtliche IHK-Vordrucke als PDF (DIHK-Muster, Neufassung, IHK München)
- Vorschläge aus Zeiterfassung und Aufgaben; KI aus der Cloud oder lokal
- Foto vom Papierheft → Text (OCR lokal im Browser)
- IHK-PDF-Import bestehender Hefte
- **Betrieb & Ausbilder:** Freigabe, Prüfverlauf, Vertretung, signierte Freigaben (ECDSA), § 14-Frist
- Schatten-Berichtsheft: ein zweites, verschlüsseltes Heft für Notizen, die niemand sieht

</td>
<td width="50%" valign="top">

### Azubi-Werkzeuge
- **Aufgaben** — Heute / Geplant / Alle / Erledigt, Schnelleingabe („morgen", „!!", „#Liste"), Wiederholungen, Notizen
- **Rechte-Checker** — BBiG, JArbSchG und ArbZG interaktiv prüfen
- **IHK-Ansicht** — Prüfungszulassung, Fehlquote, Nachweis-Lücken
- **Berufsschule** — Noten je Lehrjahr, Stundenplan aus WebUntis
- **Urlaubsplaner** — Brückentage nach Bundesland, Ausbeute-Ranking, Ein-Klick-Buchung
- **Vertrags-Manager** — Gehalt, Benefits, Zuschläge
- **Fahrtkosten** — Routing je Verkehrsmittel, eigene Strecke einzeichnen, Pendlerpauschale
- **Skill-Baum** — IT-Wissen der Ausbildung üben, Fragenbank mit Wiederholung
- **IT-Deep-Dives** — bedienbare Diagramme zu LED, SSD, Arbeitsspeicher, Qubit

### Sicherheit & Datenschutz
- AES-256-GCM für Backups, Schatten-Heft und P2P-Übertragung
- DOMPurify für alle Nutzereingaben, strenge CSP
- Cloud nur nach Anmeldung; Row-Level Security in der Datenbank
- Anmeldung per Magic-Link, Google, GitHub, Discord oder Passkey

### PWA
- Installierbar auf iOS, Android und Desktop
- Startmenü-Verknüpfungen (Timer, neuer Eintrag, Berichtsheft, Aufgaben)
- Web Share Target
- P2P-Abgleich zwischen zwei Geräten per WebRTC, ohne Server-Speicher
- NFC-Chip als Stempeluhr (Android, Chrome)

</td>
</tr>
</table>

---

## Seiten

Die App unter `/` ist eine Single-Page-App aus Komponenten. Daneben gibt es eigenständige Seiten — jede auch auf Englisch unter `/en/`.

| Seite | Was dort passiert |
|---|---|
| [/berichtsheft/](https://myworklog.de/berichtsheft/) | Berichtsheft schreiben, IHK-Vordrucke, KI-Vorschläge, Foto-Import |
| [/ausbilder/](https://myworklog.de/ausbilder/) | Cockpit für Ausbilder: Hefte prüfen, freigeben, Fristen |
| [/schatten-berichtsheft/](https://myworklog.de/schatten-berichtsheft/) | Das verschlüsselte zweite Heft, erklärt |
| [/aufgaben/](https://myworklog.de/aufgaben/) | Aufgaben mit Wiederholungen und Notizen |
| [/rechte-checker/](https://myworklog.de/rechte-checker/) | Ausbildungsrechte interaktiv prüfen |
| [/vertrags-manager/](https://myworklog.de/vertrags-manager/) | Vertrag, Gehalt, Zuschläge |
| [/fahrtkosten/](https://myworklog.de/fahrtkosten/) | Fahrtkosten mit echter Route und Karte |
| [/skill-tree/](https://myworklog.de/skill-tree/) | Lernstrecke mit Fragenbank |
| [/it-landing/](https://myworklog.de/it-landing/) | Einstieg zu Skill-Baum und Deep-Dives |
| [/it-stories/…](https://myworklog.de/it-landing/) | Deep-Dives: blaue LED, SSD, Arbeitsspeicher, Qubit |
| [/wechseln/](https://myworklog.de/wechseln/) | Umzug aus anderen Zeiterfassungen |
| [/vergleich/](https://myworklog.de/vergleich/) | MyWorkLog neben Zubido, Azubiheft und BLok |
| [/archflow/](https://myworklog.de/archflow/) | Der Quellcode als Karte |
| [/about/](https://myworklog.de/about/) · [/Impressum/](https://myworklog.de/Impressum/) · [/DSGVO/](https://myworklog.de/DSGVO/) | Über uns, Impressum, Datenschutz |

---

## Lokal starten

```bash
git clone https://github.com/TechNova-App-Team/MyWorkLog.git
cd MyWorkLog
npm install            # nur Build-Werkzeuge und Tests, die App selbst hat keine Abhängigkeiten
npm run build:index    # baut index.html aus index.template.html + components/**
npx serve .            # oder jeder andere statische Server
```

Dann `http://localhost:3000/` öffnen. Die eigenständigen Seiten liegen lokal unter `/pages/<name>/` — die kurzen Adressen (`/berichtsheft/`) kommen erst auf Cloudflare aus `_redirects` und einer Rewrite-Regel.

```bash
npm test               # alle Tests aus tools/*.test.mjs
npm run i18n:build     # englische Seiten nach pages/en/ rendern
npm run lint
```

**Kein Bundler, kein Framework.** Alle Skripte werden per `<script src>` geladen. Ein kleiner Node-Build setzt nur die Teile zusammen: `index.html` aus dem Template, `/en/` aus Übersetzungs-Wörterbüchern, `?v=`-Stempel für den Cache. `index.html` und `pages/en/` sind deshalb nicht im Repo — Cloudflare baut sie beim Deploy.

---

## Aufbau

```
MyWorkLog/
├─ index.template.html      Kopf und Gerüst der App; wird zu index.html gebaut
├─ service-worker.js        Offline-Cache (Network-First, Cache-First, Stale-While-Revalidate)
├─ manifest.json            PWA: Verknüpfungen, Share Target, Icons
│
├─ components/              Die App, eine Komponente je Ordner: {name}.html + .css + .js
│  ├─ core/                 Speicher, Timer, Diagramme, Export, Cloud-Abgleich, P2P, Icons
│  ├─ dashboard/            KPI-Ringe, Eintrag erfassen, Widgets
│  ├─ history/ weekview/ yearview/ monthcompare/   Auswertungen
│  ├─ ihk/ school/ untis/ jobs/ goals/             Ausbildung, Schule, Jobs, Ziele
│  ├─ import/ urlaubsplaner/ bbig-scanner/         Wechsel-Brücke, Urlaub, Rechte
│  └─ …                     eine Komponente je Ansicht, Dialog und Werkzeug
│
├─ pages/                   Eigenständige Seiten, je pages/<name>/index.html
│  ├─ berichtsheft/         Markup — die Logik liegt in Assets/js/berichtsheft/
│  ├─ ausbilder/ aufgaben/ rechte-checker/ fahrtkosten/ skill-tree/ …
│  └─ it-stories/<slug>/    Deep-Dives mit bedienbaren Diagrammen
│
├─ Assets/
│  ├─ js/berichtsheft/      Berichtsheft-Engine, IHK-Vordrucke, Freigabe, Tresor, OCR
│  ├─ js/Cloud/             Supabase: Anmeldung und Abgleich
│  ├─ css/ · js/ · icons/   Seiten-Stile, Seiten-Skripte, Icons
│  └─ i18n/                 Gerenderte Übersetzungs-Wörterbücher (Build-Zwischenstand)
│
├─ tools/                   Build-Kette, i18n-Pipeline, Tests (*.test.mjs), Mess-Skripte
├─ config/                  version.json (Version + Changelog), maintenance.json, Supabase-Konfiguration
├─ Grafiken/                Icons, Intro-Video
├─ Rechtliches/             LICENSE, PRIVACY, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT
├─ .github/workflows/       Tests bei jedem Push; täglicher Live-Check der ausgelieferten Site
│
├─ _headers                 CSP und Cache-Header für Cloudflare Pages
└─ _redirects               Weiterleitungen und Sperren; kurze Adressen für pages/
```

**Build-Kette** (`npm run build`, läuft auf Cloudflare): `build-index` → `stamp-assets` → `i18n:build` → `stamp-assets` → `repo-report` → `strip-comments` → `prune-deploy`. Die letzten beiden greifen nur im Deploy: Kommentare raus, Quellen und Werkzeuge aus dem Ausgabeordner löschen.

---

## Technik

| Ebene | Was |
|---|---|
| **Frontend** | HTML, CSS, JavaScript — kein Framework, kein Bundler, keine Module |
| **Speicher** | `localStorage` (JSON) mit zehn rotierenden Sicherungen; Berichtsheft-Tresor in IndexedDB |
| **Cloud** (optional) | Supabase — Auth, Postgres, Row-Level Security; Anmeldung per Magic-Link, OAuth oder Passkey |
| **KI-Proxy** | Cloudflare Worker `ai-proxy.myworklog.de` → OpenRouter; API-Schlüssel bleiben im Worker |
| **PWA** | Service Worker mit drei Cache-Strategien, Web App Manifest |
| **Sicherheit** | DOMPurify 3.2.4, AES-256-GCM (Web Crypto), ECDSA-Signaturen für Freigaben, strenge CSP |
| **P2P** | WebRTC über simple-peer, STUN/TURN |
| **Bibliotheken bei Bedarf** | jsPDF (Vordrucke), Tesseract.js (OCR), MapLibre GL (Karte), Chart.js, three.js / 3d-force-graph (ArchFlow) — alle erst geladen, wenn die Seite sie braucht |
| **Hosting** | Cloudflare Pages → myworklog.de |
| **Tests** | Node-Tests unter `tools/` (jsdom, gegen die echten Quelldateien), GitHub Actions bei jedem Push, täglicher Live-Check der Site |
| **Sprachen** | Deutsch als Quelle; Englisch unter `/en/` als echte, statisch gerenderte Seiten |

---

## Cloud-Abgleich (optional)

Ohne Anmeldung bleibt alles lokal. Wer sich anmeldet, bekommt:

- Abgleich der Zeiterfassung zwischen Geräten
- Berichtsheft-Freigabe durch den Ausbilder (Betrieb verbinden, Einladungscode, Rollen)
- Verschlüsselter Berichtsheft-Tresor in der Cloud — der Schlüssel bleibt beim Nutzer

**Warum der `anon key` im Frontend stehen darf:** Er ist öffentlich gedacht. Was ein Konto sehen und schreiben darf, entscheidet Row-Level Security in der Datenbank, nie der Client. Der `service_role`-Schlüssel und die KI-API-Schlüssel liegen ausschließlich in Cloudflare-Secrets.

**Eigener Fork mit eigener Cloud:** Der Client spricht mit dem Supabase-Projekt aus `config/supabase-config.js`. Ein Fork braucht ein eigenes Projekt samt Tabellen, RLS-Policies und RPC-Funktionen — das Datenbankschema liegt nicht in diesem Repository.

---

## Browser

| Browser | ab Version |
|---|---|
| Chrome / Edge | 90 |
| Firefox | 88 |
| Safari | 14 |

Die Mindestversionen stehen in `config/version.json` (`minBrowser`). NFC-Stempeluhr nur in Chrome auf Android; Passkeys überall dort, wo der Browser WebAuthn kann.

---

## Versionierung

Eine Version je Änderung, Schema `X.Y.Z` mit Überlauf bei `Z = 19` und `Y = 9`. Der vollständige Changelog steht in `config/version.json` und in der App unter **Support → Releases**.

<!-- Der Block bis changelog:end wird beim Version-Bump von tools/stamp-assets.js neu geschrieben — nicht von Hand pflegen. -->
<!-- changelog:start -->

Aktuelle Version: **v7.5.7** · 2026-09-25

| Version | Datum | Was ist anders |
|---|---|---|
| **7.5.7** | 2026-09-25 | Die Zahlen auf der Support-Seite und im Feedback-Bericht stimmen mit der App überein |
| 7.5.6 | 2026-09-25 | Die Support-Seite zeigt dieselbe Serie wie das Dashboard |
| 7.5.5 | 2026-09-25 | Support ist jetzt eine eigene Seite unter /support/ |
| 7.5.4 | 2026-09-25 | Die Support-Seite zeigt die App in echten Aufnahmen |
| 7.5.3 | 2026-09-24 | Mehr Schutz für den Betriebs-Weg und die Geräte-Kopplung |

<!-- changelog:end -->

---

## Mitmachen

Pull Requests sind willkommen. Für größere Änderungen bitte zuerst ein Issue öffnen.

- **Fehler gefunden?** → [Issues](https://github.com/TechNova-App-Team/MyWorkLog/issues)
- **Idee?** → [Issues](https://github.com/TechNova-App-Team/MyWorkLog/issues) mit Label `enhancement`
- **Code beisteuern?** → [CONTRIBUTING.md](Rechtliches/CONTRIBUTING.md)
- **Sicherheitslücke?** → [SECURITY.md](Rechtliches/SECURITY.md) — bitte nicht als öffentliches Issue
- **Verhalten?** → [CODE_OF_CONDUCT.md](Rechtliches/CODE_OF_CONDUCT.md)

Vor dem Pull Request: `npm test` — derselbe Lauf wie in der GitHub Action.

---

## Lizenz

[MIT](Rechtliches/LICENSE.md) © 2025–2026 Sven Kunz · TechNova App Team

Nutzen, verändern, weitergeben, auch kommerziell — der Lizenzhinweis bleibt drin. Lizenzen der eingebundenen Bibliotheken: [NOTICE.md](Rechtliches/NOTICE.md).

---

<div align="center">

<sub>Gebaut ohne Framework, mit Kaffee und der Überzeugung, dass Zeiterfassung nicht kompliziert sein muss.</sub>

<br>

[Website](https://myworklog.de/) · [Impressum](https://myworklog.de/Impressum/) · [Datenschutz](https://myworklog.de/DSGVO/) · [Datenschutz der App](Rechtliches/PRIVACY.md) · [Security](Rechtliches/SECURITY.md)

</div>
