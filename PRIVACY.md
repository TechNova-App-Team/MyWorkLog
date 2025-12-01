#################################################################
#                                                                 #
#                  PRIVACY POLICY (DATENSCHUTZERKLÄRUNG)          #
#                                                                 #
#################################################################

**Language / Sprache:** [GERMAN (Deutsch)](#deutsch) | [ENGLISH](#english)

---

<a id="deutsch"></a>

# DATENSCHUTZERKLÄRUNG Time.Tracker.SingleFile

**Version:** 1.0  
**Datum:** 2025-11-27  
**Gültig für:** Time.Tracker.SingleFile v1.2.0 und später

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Welche Daten wir verarbeiten](#welche-daten-wir-verarbeiten)
3. [Wie wir Daten speichern](#wie-wir-daten-speichern)
4. [Datenübertragung zu Servern](#datenübertragung-zu-servern)
5. [Cookies & Tracking](#cookies--tracking)
6. [Ihre Rechte (DSGVO)](#ihre-rechte-dsgvo)
7. [Datensicherheit](#datensicherheit)
8. [Export & Backup](#export--backup)
9. [Richtlinienänderungen](#richtlinienänderungen)
10. [Kontakt & Datenschutz](#kontakt--datenschutz)

---

## Übersicht

Time.Tracker.SingleFile ist eine **Client-seitige Webanwendung**. Das bedeutet:

```
✓ Alle Daten werden auf DEINEM Gerät gespeichert (Browser)
✓ Keine Server-Kommunikation (außer beim Laden der App)
✓ KEINE Datenübertragung zu Drittanbietern
✓ Du hast vollständige Kontrolle über deine Daten
✓ Keine Cloudverbindung erforderlich
```

---

## Welche Daten wir verarbeiten

### 1. Zeiterfassungsdaten (Hauptdaten)

```
Folgende Daten speichern wir in deinem LocalStorage:

Kategorie               Beispiel-Wert           Zweck
─────────────────────────────────────────────────────────────
Arbeitsdatum            2025-11-27              Zeit erfassen
Arbeitstyp              "work", "vacation"      Kategorisierung
Geleistete Stunden      8.5                     Saldo berechnen
Soll-Stunden            8.75                    Abweichung zeigen
Differenz (Saldo)       -0.25                   Gleitzeit-Tracking
Notizen/Info            "08:00-17:00"           Zusatz-Information
Pause-Minuten           30                      Pausen-Tracking
```

### 2. Konfigurationsdaten (Einstellungen)

```
Gespeichert in LocalStorage:

Kategorie              Wert                    Zweck
─────────────────────────────────────────────────────────────
Benutzername           "Max Mustermann"        Personalisierung
Design-Farbe           "#a855f7"               UI-Customization
Arbeitszeiten (Mo-Fr)  [8.75, 8.75, ...]       Regelwerk
Pausenregel            {thresh: 6, min: 30}    Auto-Pause
Jahresurlaub (Anspruch) 30                      Urlaubsverwaltung
Genutzter Urlaub        5                       Urlaubsverwaltung
```

### 3. Timer-Daten

```
Temporärer Storage (nur während aktiver Session):

Daten                  Zweck
─────────────────────────────────────────────────────────────
Start-Zeit             Timer-Berechnung
Pause-Zeit             Geleistete Zeit summieren
Status (running/paused) UI-Status
Timer-Log (Actions)    Visualisierung der Segmente
```

### 4. Browser-Metadaten (Auto-erfasst)

```
Automatisch durch Browser gesammelt (NICHT durch unseren Code):

Daten                  Quelle                  Zweck
─────────────────────────────────────────────────────────────
Zeitstempel Letzter Save localStorage          Audit-Infos
Browser-Typ            User-Agent (optional)   Kompatibilität
Viewport-Größe         Browser-Event (optional) Responsive-Check
Sprache                Browser-Setting         Lokalisierung
```

---

## Wie wir Daten speichern

### LocalStorage (Haupt-Speicher)

```
Speicherort:    Browser LocalStorage
Verschlüsselung: Nein (Standard HTML5 API)
Persistenz:     Bleibt nach Browser-Neustart
Zugriff:        Nur diese Webanwendung (Same-Origin Policy)
Limit:          ~5-10 MB pro Browser/Domain
Format:         JSON (strukturierte Text-Daten)
```

**Beispiel localStorage-Struktur:**

```javascript
localStorage.getItem('tg_pro_data')
// Returns:
{
  "entries": [
    {
      "id": 1234567890,
      "date": "2025-11-27",
      "type": "work",
      "worked": 8.5,
      "expected": 8.75,
      "diff": -0.25,
      "info": "08:00-17:00"
    }
  ],
  "settings": {
    "name": "Max Mustermann",
    "theme": "#a855f7",
    "vacation": { "total": 30, "used": 5 }
  }
}
```

### SessionStorage (Temporär)

```
Speicherort:    Browser SessionStorage
Persistenz:     Nur während Browser-Session
Beispiel:       Aktuelle Timer-Status, aktuelle Werte
Gelöscht:       Automatisch nach Tab-Schließung
```

### Memory (RAM)

```
Speicherort:    Browser Memory (JavaScript-Variablen)
Persistenz:     Nur während aktiver Nutzung
Beispiel:       Aktive Berechnungen, UI-State
Gelöscht:       Bei Seiten-Reload oder Browser-Neustart
```

---

## Datenübertragung zu Servern

### WICHTIG: Was wird NICHT übertragen?

```
❌ Keine Serververbindung für Datenspeicherung
❌ Keine Cloud-Sync
❌ Keine Telemetrie/Analytics
❌ Keine Werbung oder Tracking
❌ Keine API-Aufrufe mit deinen Daten
```

### Was könnte potenziell übertragen werden?

```
Szenario 1: HTML/CSS/JS Download
→ Beim ersten Besuch lädt der Browser die App
→ Daten: Deine IP, User-Agent (Browser-Info)
→ Dauer: Einmal beim Load
→ Rechtsbasis: Technisch notwendig für App-Funktion

Szenario 2: GitHub Pages Serving (falls dort gehostet)
→ GitHub kennt evtl. deine IP
→ Daten: IP-Adresse, Zugriffsdatum
→ Datenschutzerklärung: GitHub Privacy Policy
→ Link: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement

Szenario 3: Manueller Export (du bestimmst!)
→ Du exportierst JSON-Datei lokal
→ Daten gehen zu DIR (nicht zu uns)
→ Wo du diese teilst, bestimmst DU
```

---

## Cookies & Tracking

```
🍪 Cookies:
   ✓ Time.Tracker.SingleFile verwendet KEINE Cookies
   ✓ Nur LocalStorage für Persistierung

📊 Tracking/Analytics:
   ✗ KEIN Google Analytics
   ✗ KEIN Matomo
   ✗ KEIN Sentry Error Tracking
   ✗ KEINE Heatmaps
   ✗ KEINE Tracking-Pixel

🎯 Werbung:
   ✗ KEINE Werbung
   ✗ KEINE Daten-Broker-Integrationen
```

---

## Ihre Rechte (DSGVO)

Unter der **Datenschutz-Grundverordnung (DSGVO)** haben Sie folgende Rechte:

### 1. Recht auf Auskunft (Art. 15 DSGVO)

Du kannst anfordern, welche Daten wir über dich speichern.

```
Antwort: In deinem Fall:
→ Die Daten, die du in der App eingibst, sind NUR auf deinem Gerät
→ Wir speichern KEINE Daten über dich auf Servern
→ Es gibt nichts für uns zu offenbaren
```

### 2. Recht auf Berichtigung (Art. 16 DSGVO)

Du kannst falsche Daten korrigieren.

```
Lösung: Du kannst direkt in der App:
→ Einträge bearbeiten (Pencil-Icon)
→ Falschen Namen in Einstellungen korrigieren
→ Falsche Arbeitszeiten anpassen
```

### 3. Recht auf Löschung / "Right to be Forgotten" (Art. 17 DSGVO)

Du kannst deine Daten löschen.

```
Wie du das machst:
1. Browser → Settings → Cookies & Website-Daten
2. Suche: Time.Tracker.SingleFile URL (oder localhost)
3. Klick: Löschen
→ Alle deine Daten sind SOFORT weg!
→ Browser localStorage gelöscht

Alternative:
→ Einzelne Einträge in der App: × (Delete-Button)
→ Alle Einträge: Neue Installationen oder Browser wählen
```

### 4. Recht auf Datenportabilität (Art. 20 DSGVO)

Du kannst deine Daten in einem gängigen Format erhalten.

```
Wie du das machst:
1. Dashboard → ⚙️ Einstellungen
2. Klick: 💾 Backup
3. Download: time_pro_backup.json
→ Deine Daten im Standard-JSON-Format!
→ Exportiert auf deinen Computer
→ Du kannst damit andere Tools füttern oder archivieren
```

### 5. Recht auf Widerspruch (Art. 21 DSGVO)

Du kannst Verarbeitung widersprechen.

```
In unserem Fall: N/A
→ Wir haben keine Verarbeitung die du ablehnen könntest
→ Die App speichert nur das, was DU eingibst
→ Keine automatisierte Verarbeitung
```

### 6. Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)

Du kannst Verarbeitung einschränken.

```
Lösung: Du kannst:
→ Die App nicht mehr nutzen (= Verarbeitung gestoppt)
→ Daten exportieren & Browser-Daten löschen
→ Oder: Einfach in Private Window arbeiten (Daten temp)
```

---

## Datensicherheit

### Schutzmaßnahmen

```
Sicherheits-Ebene           Status      Details
───────────────────────────────────────────────────────
Verschlüsselung (Transit)   N/A         Nur Local Storage
                                        (no transmission)
Verschlüsselung (Storage)   ✗ Nein      HTML5 API Limitation
                                        (Standard: Klartext)
Zugriff-Kontrolle           ✓ Ja        Browser Same-Origin
                                        Policy
Input-Validierung           ✓ Ja        Daten-Typ Checks
                            
XSS-Prävention              ✓ Ja        Vanilla JS, no eval()
SQL-Injection               ✓ Ja        Kein Server/DB
CSRF                        ✓ Ja        Keine API-Calls
───────────────────────────────────────────────────────
```

### Empfehlungen für Nutzer

```
📌 Für maximale Sicherheit:

1. Gerätesicherheit
   → Windows/Mac/Linux up-to-date halten
   → Antivirus aktiv (Windows Defender, etc.)
   → Firewall aktiviert

2. Browser-Sicherheit
   → Neueste Browser-Version nutzen
   → Extensions mit Vorsicht installieren
   → Private Window für sensitive Daten

3. Backup & Verschlüsselung (OPTIONAL)
   → Export → JSON auf USB speichern
   → USB mit BitLocker/VeraCrypt verschlüsseln
   → An sicheren Ort lagern

4. Shared Computer
   → Private/Incognito Window nutzen
   → Nach Gebrauch Log-Out (nicht Browser-Close!)
   → Or: Daten vor Neustart löschen
```

---

## Export & Backup

### Wie man exportiert

```
Schritt 1: Dashboard → ⚙️ Settings
Schritt 2: Klick "💾 Backup" Button
Schritt 3: Datei wird heruntergeladen: time_pro_backup.json
Schritt 4: Speichern an sicheren Ort (Cloud, USB, etc.)
```

### Backup-Sicherheit

```
Export-Datei Sicherheit:

Datei-Format:       JSON (Klartext, lesbar)
Verschlüsselung:    ❌ NEIN (Standard-Export)
Empfehlung:         Lokal speichern, nicht per Email teilen
Weitere Sicherung:  Windows/Mac Encryption verwenden
                    (z.B. BitLocker auf USB)
```

### Wie man importiert

```
Schritt 1: Dashboard → ⚙️ Settings
Schritt 2: Klick "📂 Import"
Schritt 3: time_pro_backup.json auswählen
Schritt 4: Bestätigen → Daten werden geladen
⚠️ WARNUNG: Importieren überschreibt aktuelle Daten!
```

---

## Richtlinienänderungen

Wenn sich diese Datenschutzerklärung ändert:

```
Benachrichtigung:   Im README.md aktualisiert
Versioning:         Oben auf dieser Datei (Datum, Version)
Gültigkeitsdauer:   Aktuelle Version gilt immer
Archiv:             Alte Versionen im GitHub-History
```

**Aktuelle Version:** 1.0 (2025-11-27)

---

## Kontakt & Datenschutz

```
Datenschutz-Anfragen:  privacy@Time.Tracker.SingleFile.XXX
                       oder: support@Time.Tracker.SingleFile.XXX

Sicherheitsmeldungen:  security@Time.Tracker.SingleFile.XXX

GitHub Issues:         Nur technische/Feature-Anfragen
```

---

<a id="english"></a>

# PRIVACY POLICY Time.Tracker.SingleFile

**Version:** 1.0  
**Date:** 2025-11-27  
**Valid for:** Time.Tracker.SingleFile v1.2.0 and later

---

## 📋 Table of Contents

1. [Overview](#overview-en)
2. [What Data We Process](#what-data-we-process-en)
3. [How We Store Data](#how-we-store-data-en)
4. [Data Transmission to Servers](#data-transmission-to-servers-en)
5. [Cookies & Tracking](#cookies--tracking-en)
6. [Your Rights (GDPR)](#your-rights-gdpr-en)
7. [Data Security](#data-security-en)
8. [Export & Backup](#export--backup-en)
9. [Policy Changes](#policy-changes-en)
10. [Contact & Privacy](#contact--privacy-en)

---

<a id="overview-en"></a>

## Overview

Time.Tracker.SingleFile is a **client-side web application**. This means:

```
✓ All data is stored on YOUR device (browser)
✓ No server communication (except loading the app)
✓ NO data transmission to third parties
✓ You have complete control over your data
✓ No cloud connection required
```

---

<a id="what-data-we-process-en"></a>

## What Data We Process

### 1. Time Entry Data (Main Data)

```
We store the following data in your LocalStorage:

Category               Example Value           Purpose
─────────────────────────────────────────────────────────────
Work Date              2025-11-27              Track time
Work Type              "work", "vacation"      Categorization
Hours Worked           8.5                     Calculate balance
Expected Hours         8.75                    Show deviation
Difference (Balance)   -0.25                   Flextime tracking
Notes/Info             "08:00-17:00"           Additional info
Break Minutes          30                      Track breaks
```

### 2. Configuration Data (Settings)

```
Stored in LocalStorage:

Category              Value                    Purpose
─────────────────────────────────────────────────────────────
Username              "Max Mustermann"        Personalization
Design Color          "#a855f7"               UI customization
Working Hours (Mo-Fr) [8.75, 8.75, ...]      Rules
Break Rule            {thresh: 6, min: 30}    Auto-break
Annual Vacation       30                      Vacation management
Used Vacation         5                       Vacation tracking
```

### 3. Timer Data

```
Temporary Storage (only during active session):

Data                  Purpose
─────────────────────────────────────────────────────────────
Start Time            Timer calculation
Pause Time            Summarize work time
Status (running/paused) UI status
Timer Log (Actions)   Segment visualization
```

### 4. Browser Metadata (Auto-captured)

```
Automatically collected by browser (NOT by our code):

Data                  Source                  Purpose
─────────────────────────────────────────────────────────────
Last Save Timestamp   localStorage            Audit info
Browser Type          User-Agent (optional)   Compatibility
Viewport Size         Browser Event (optional) Responsive check
Language              Browser Setting         Localization
```

---

<a id="how-we-store-data-en"></a>

## How We Store Data

### LocalStorage (Main Storage)

```
Location:      Browser LocalStorage
Encryption:    No (standard HTML5 API)
Persistence:   Remains after browser restart
Access:        Only this web app (Same-Origin Policy)
Limit:         ~5-10 MB per browser/domain
Format:        JSON (structured text data)
```

**Example localStorage structure:**

```javascript
localStorage.getItem('tg_pro_data')
// Returns:
{
  "entries": [
    {
      "id": 1234567890,
      "date": "2025-11-27",
      "type": "work",
      "worked": 8.5,
      "expected": 8.75,
      "diff": -0.25,
      "info": "08:00-17:00"
    }
  ],
  "settings": {
    "name": "Max Mustermann",
    "theme": "#a855f7",
    "vacation": { "total": 30, "used": 5 }
  }
}
```

### SessionStorage (Temporary)

```
Location:      Browser SessionStorage
Persistence:   Only during browser session
Example:       Current timer status, current values
Deleted:       Automatically after tab close
```

### Memory (RAM)

```
Location:      Browser Memory (JavaScript variables)
Persistence:   Only during active use
Example:       Active calculations, UI state
Deleted:       On page reload or browser restart
```

---

<a id="data-transmission-to-servers-en"></a>

## Data Transmission to Servers

### IMPORTANT: What is NOT transmitted?

```
❌ No server connection for data storage
❌ No cloud sync
❌ No telemetry/analytics
❌ No ads or tracking
❌ No API calls with your data
```

### What could potentially be transmitted?

```
Scenario 1: HTML/CSS/JS Download
→ On first visit, browser loads the app
→ Data: Your IP, User-Agent (browser info)
→ Duration: Once at load
→ Legal basis: Technically necessary for app function

Scenario 2: GitHub Pages Serving (if hosted there)
→ GitHub may know your IP
→ Data: IP address, access date
→ Privacy Policy: GitHub Privacy Policy
→ Link: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement

Scenario 3: Manual Export (you decide!)
→ You export JSON file locally
→ Data goes to YOU (not us)
→ Where you share it is YOUR choice
```

---

<a id="cookies--tracking-en"></a>

## Cookies & Tracking

```
🍪 Cookies:
   ✓ Time.Tracker.SingleFile uses NO cookies
   ✓ Only LocalStorage for persistence

📊 Tracking/Analytics:
   ✗ NO Google Analytics
   ✗ NO Matomo
   ✗ NO Sentry error tracking
   ✗ NO heatmaps
   ✗ NO tracking pixels

🎯 Advertising:
   ✗ NO ads
   ✗ NO data broker integrations
```

---

<a id="your-rights-gdpr-en"></a>

## Your Rights (GDPR)

Under the **General Data Protection Regulation (GDPR)**, you have the following rights:

### 1. Right to Access (Art. 15 GDPR)

You can request what data we store about you.

```
Answer: In your case:
→ The data you enter in the app is ONLY on your device
→ We store NO data about you on servers
→ There is nothing for us to disclose
```

### 2. Right to Rectification (Art. 16 GDPR)

You can correct incorrect data.

```
Solution: You can directly in the app:
→ Edit entries (Pencil icon)
→ Correct wrong name in settings
→ Adjust incorrect working hours
```

### 3. Right to Erasure / "Right to be Forgotten" (Art. 17 GDPR)

You can delete your data.

```
How to do it:
1. Browser → Settings → Cookies & Website Data
2. Search: Time.Tracker.SingleFile URL (or localhost)
3. Click: Delete
→ All your data is IMMEDIATELY gone!
→ Browser localStorage deleted

Alternative:
→ Individual entries in app: × (delete button)
→ All entries: Fresh installation or new browser
```

### 4. Right to Data Portability (Art. 20 GDPR)

You can receive your data in a common format.

```
How to do it:
1. Dashboard → ⚙️ Settings
2. Click: 💾 Backup
3. Download: time_pro_backup.json
→ Your data in standard JSON format!
→ Exported to your computer
→ You can use it with other tools or archive it
```

### 5. Right to Object (Art. 21 GDPR)

You can object to processing.

```
In our case: N/A
→ We have no processing you could object to
→ The app only stores what YOU enter
→ No automated processing
```

### 6. Right to Restriction of Processing (Art. 18 GDPR)

You can restrict processing.

```
Solution: You can:
→ Stop using the app (= processing stopped)
→ Export data & delete browser data
→ Or: Simply use Private Window (temp data)
```

---

<a id="data-security-en"></a>

## Data Security

### Security Measures

```
Security Level               Status      Details
───────────────────────────────────────────────────────
Encryption (Transit)         N/A         Only local storage
                                         (no transmission)
Encryption (Storage)         ✗ No        HTML5 API limitation
                                         (default: plaintext)
Access Control               ✓ Yes       Browser Same-Origin
                                         Policy
Input Validation             ✓ Yes       Data-type checks
                            
XSS Prevention               ✓ Yes       Vanilla JS, no eval()
SQL Injection                ✓ Yes       No server/DB
CSRF                         ✓ Yes       No API calls
───────────────────────────────────────────────────────
```

### Recommendations for Users

```
📌 For maximum security:

1. Device Security
   → Keep Windows/Mac/Linux up-to-date
   → Keep antivirus active (Windows Defender, etc.)
   → Enable firewall

2. Browser Security
   → Use latest browser version
   → Install extensions carefully
   → Use private window for sensitive data

3. Backup & Encryption (OPTIONAL)
   → Export → JSON to USB
   → Encrypt USB with BitLocker/VeraCrypt
   → Store in safe location

4. Shared Computer
   → Use private/incognito window
   → Log out after use (not just browser close!)
   → Or: Delete data before restart
```

---

<a id="export--backup-en"></a>

## Export & Backup

### How to Export

```
Step 1: Dashboard → ⚙️ Settings
Step 2: Click "💾 Backup" button
Step 3: File downloaded: time_pro_backup.json
Step 4: Save to safe location (cloud, USB, etc.)
```

### Backup Security

```
Export File Security:

File Format:        JSON (plaintext, readable)
Encryption:         ❌ NO (standard export)
Recommendation:     Store locally, don't share via email
Additional Security: Use OS encryption
                    (e.g., BitLocker on USB)
```

### How to Import

```
Step 1: Dashboard → ⚙️ Settings
Step 2: Click "📂 Import"
Step 3: Select time_pro_backup.json
Step 4: Confirm → Data loads
⚠️ WARNING: Importing overwrites current data!
```

---

<a id="policy-changes-en"></a>

## Policy Changes

If this privacy policy changes:

```
Notification:   Updated in README.md
Versioning:     Date & version at top of this file
Validity:       Current version always applies
Archive:        Old versions in GitHub history
```

**Current Version:** 1.0 (2025-11-27)

---

<a id="contact--privacy-en"></a>

## Contact & Privacy

```
Privacy Inquiries:     privacy@Time.Tracker.SingleFile.XXX
                       or: support@Time.Tracker.SingleFile.XXX

Security Reports:      security@Time.Tracker.SingleFile.XXX

GitHub Issues:         Technical/feature requests only
```

---

<div align="center">

**Your privacy is our priority.**

*We believe in transparency and user control over personal data.*

</div>
