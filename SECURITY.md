#################################################################
#                                                                 #
#                    SECURITY POLICY (SICHERHEIT)                 #
#                                                                 #
#################################################################

**Language / Sprache:** [GERMAN (Deutsch)](#deutsch) | [ENGLISH](#english)

---

<a id="deutsch"></a>

# SICHERHEITSPOLITIK & RESPONSIBLE DISCLOSURE

## Überblick

Die Sicherheit von Time.Tracker.SingleFile und seinen Nutzern ist uns sehr wichtig.
Dieses Dokument erklärt wie wir mit Sicherheitsmeldungen umgehen und wie du
Schwachstellen verantwortungsvoll melden kannst.

---

## 🚨 Sicherheitslücke gefunden?

Bitte **NICHT** direkt ein öffentliches GitHub-Issue öffnen, da dies die
Sicherheit aller Nutzer gefährden könnte.

### Schritt 1: Sichere Benachrichtigung

Sende eine vertrauliche E-Mail an:

```
📧 security@Time.Tracker.SingleFile.XX
   (Oder: support@Time.Tracker.SingleFile.XXX mit Subject: [SECURITY])
```

**Bitte folgende Informationen senden:**

```
Subject: [SECURITY] Vulnerability Report: <SHORT TITLE>

Body:
─────────────────────────────────────────────────────────────
1. Beschreibung der Sicherheitslücke
   (Kurz, was ist das Problem?)

2. Auswirkungen
   - Schweregrad: CRITICAL / HIGH / MEDIUM / LOW
   - Betroffen: Alle Nutzer? Nur unter bestimmten Bedingungen?

3. Reproduktion / Proof of Concept
   Schritte zur Reproduktion:
   - Schritt 1...
   - Schritt 2...
   - Schritt 3...

4. Mögliche Behebung
   (Optional, aber hilfreich!)

5. Kontaktinformation
   - Name / GitHub Benutzername
   - E-Mail
   - PGP-Schlüssel (falls verfügbar)
─────────────────────────────────────────────────────────────
```

### Schritt 2: Bestätigung & Timeline

```
Erwartete Zeiträume:

Innerhalb von 24h:   → Bestätigung des Empfangs
                       "Wir haben deine Meldung erhalten"

Innerhalb von 7 Tagen: → Bewertung & Zeitplan
                         "High/Medium/Low Severity"
                         "Patch target: X days"

Innerhalb von 90 Tagen: → Fix oder Patch
                          (Abhängig von Komplexität)

Nach Release:         → Credits (Optional)
                        "Danke an [Name] für Sicherheitsbericht"
```

---

## Sicherheitsstufen & Priorität

```
┌──────────┬────────────────────────────────────────┐
│ Level    │ Beschreibung & Beispiele                │
├──────────┼────────────────────────────────────────┤
│ CRITICAL │ • Datenverlust, unbefugter Zugriff     │
│          │ • Remote Code Execution (RCE)          │
│          │ • Alle Nutzer betroffen                │
│          │ Timeline: 24h Patch                     │
├──────────┼────────────────────────────────────────┤
│ HIGH     │ • Informationsleck (sensitive data)    │
│          │ • XSS, Injection-Lücken                │
│          │ • Viele Nutzer betroffen               │
│          │ Timeline: 7 Tage Patch                 │
├──────────┼────────────────────────────────────────┤
│ MEDIUM   │ • Lokale Privilege Escalation          │
│          │ • Fehlende Eingabevalidation           │
│          │ • Spezifische Szenarien nötig          │
│          │ Timeline: 30 Tage Patch                │
├──────────┼────────────────────────────────────────┤
│ LOW      │ • UI/UX Sicherheitsprobleme            │
│          │ • DoS nur unter bestimmten Bedingungen │
│          │ • Minimale Auswirkung                  │
│          │ Timeline: 60 Tage oder mit nächstem Rel. │
└──────────┴────────────────────────────────────────┘
```

---

## Bekannte Sicherheitsaspekte & Mitigationen

### LocalStorage-Sicherheit

```
Problem: Daten im Browser-LocalStorage nicht verschlüsselt
Mitigation:
├─ Nutzer speichern nur auf ihrem lokalen Gerät
├─ Kein Datentransfer zu Servern
├─ Nur "vertrauenswürdige" Geräte verwenden
└─ Bei shared Computer: Private Window nutzen

Empfehlung für Nutzer:
→ Keine hochsensiblen Daten eingeben
→ Browser-Verlauf/Cache regelmäßig löschen
→ Import-Backups sicher speichern (z.B. verschlüsselter USB)
```

### XSS (Cross-Site Scripting)

```
Status: ✓ Mitigated (nur Vanilla JS, keine DOM-Injection)

Schutzmaßnahmen:
├─ innerHTML nicht mit User-Input
├─ textContent für Benutzernamen
├─ Keine eval() oder dynamische Skripte
└─ Input Sanitization vor localStorage Speicherung

Wenn du XSS findest:
→ Melde es sofort (kritisch!)
```

### Input Validation

```
Durchgeführt für:
├─ Datumeingaben: ISO-Format, Past/Future-Checks
├─ Zahleneingaben: min/max Values, parseFloat Safety
├─ Zeitauswahlformat: HH:MM Validation
└─ Periodische Eingaben: Start < End

Fehler melden: Wenn ein Input zu Crash oder Datenverlust führt
```

---

## Aktuelle Versionsunterstützung

```
Version      │ Status              │ Support bis
─────────────┼─────────────────────┼─────────────────
2.0.0 (aktuell) │ ✓ Supported       │ Mindestens 1 Jahr
1.5.0        │ ✓ Limited Support   │ 6 Monate
1.0.0        │ ✗ End of Life       │ Kein Support
```

**Empfehlung:** Bitte upgrade auf die neuste Version für Sicherheits-Patches.

---

## Sicherheits-Best-Practices für Nutzer

```
1. Regelmäßige Backups
   → Export → JSON → Sicher speichern (USB, Cloud)

2. Gerätesicherheit
   → Windows Defender aktiv
   → Browser & OS up-to-date
   → Firewall aktiviert

3. Daten-Hygiene
   → Import nur von vertrauenswürdigen Quellen
   → Backup-Dateien verschlüsseln (z.B. VeraCrypt)
   → Alte Backups nach einiger Zeit löschen

4. Nutzungssicherheit
   → Kein Teilen des Exports mit anderen
   → Private Fenster bei shared Computer
   → Passwort-Manager für Login-Daten verwenden (falls future auth)
```

---

## Security Vulnerability Scan

```
Durchgeführte Checks:

□ Dependency Scanning (Libraries)
  Status: N/A (Vanilla JS, keine npm Dependencies)
  
□ Code Quality & Security Linting
  Status: Manual review
  Tools empfohlen: ESLint, SonarQube (optional)

□ OWASP Top 10 Checks
  Status: Manual audit
  ├─ Injection: ✓ (kein Server-Code)
  ├─ XSS: ✓ (textContent, keine innerHTML)
  ├─ Authentication: ✓ (Client-only, keine Auth nötig)
  ├─ Sensitive Data: ✓ (LocalStorage, encrypted optional)
  ├─ XML Entities: ✓ (n/a)
  ├─ Broken Access: ✓ (n/a)
  ├─ CSRF: ✓ (n/a, no server)
  ├─ Deserialization: ✓ (JSON.parse nur auf trusted data)
  ├─ Components: ✓ (manuelle audit)
  └─ Logging: ✓ (Browser DevTools)

□ Browser Compatibility
  Status: Tested on Chrome, Firefox, Safari, Edge
  IE 11: ✗ (nicht unterstützt)
```

---

## Meldung von Sicherheits-Updates

Wenn ein Sicherheits-Patch veröffentlicht wird, teilen wir folgende Info:

```
Beispiel Sicherheits-Advisory:

ADVISORY: Time.Tracker.SingleFile Security Patch v1.0.1

Type: XSS Vulnerability Fix
Severity: MEDIUM
CVE: N/A (kein CVE für Client-Only App)
Affected Versions: 2.0.0
Fixed in: 2.0.1
Release Date: YYYY-MM-DD

Description:
Ein Sicherheitsforschter hat eine potenzielle XSS-Lücke gemeldet...

Action Required:
→ Update auf v2.0.1 (einfach Seite neuladen)
→ Browser-Cache leeren (Ctrl+Shift+Del)

Credits:
→ Dank an [Name/Researcher] für die Meldung
```

---

## Datenschutz & Anonymität

```
Deine Meldung ist sicher:

✓ Vertrauliche Behandlung während der Behebung
✓ Du kannst anonym bleiben (optional)
✓ Keine Veröffentlichung von Details vor Patch
✓ Credits nur mit deiner Zustimmung
✓ Wir teilen deine Kontaktdaten nicht mit Dritten
```

---

## Kontakt & Support

```
Sicherheit:        security@Time.Tracker.SingleFile.XXX
Allgemeiner Support: support@Time.Tracker.SingleFile.XXX
GitHub Issues:      Bitte nur Non-Security Issues
```

---

<a id="english"></a>

# SECURITY POLICY & RESPONSIBLE DISCLOSURE

## Overview

The security of Time.Tracker.SingleFile and its users is very important to us.
This document explains how we handle security reports and how you can
responsibly disclose vulnerabilities.

---

## 🚨 Found a Security Vulnerability?

Please **DO NOT** open a public GitHub issue, as this could endanger
the security of all users.

### Step 1: Secure Notification

Send a confidential email to:

```
📧 security@Time.Tracker.SingleFile.XXX
   (Or: support@Time.Tracker.SingleFile.XXX with Subject: [SECURITY])
```

**Please include the following information:**

```
Subject: [SECURITY] Vulnerability Report: <SHORT TITLE>

Body:
─────────────────────────────────────────────────────────────
1. Description of Security Vulnerability
   (Brief, what is the problem?)

2. Impact
   - Severity: CRITICAL / HIGH / MEDIUM / LOW
   - Affected: All users? Only under specific conditions?

3. Reproduction / Proof of Concept
   Steps to reproduce:
   - Step 1...
   - Step 2...
   - Step 3...

4. Possible Fix
   (Optional, but helpful!)

5. Contact Information
   - Name / GitHub username
   - Email
   - PGP key (if available)
─────────────────────────────────────────────────────────────
```

### Step 2: Acknowledgment & Timeline

```
Expected timelines:

Within 24h:   → Acknowledgment of receipt
               "We received your report"

Within 7 days: → Assessment & schedule
               "High/Medium/Low Severity"
               "Patch target: X days"

Within 90 days: → Fix or Patch
                 (Depending on complexity)

After release: → Credits (Optional)
               "Thanks to [Name] for security report"
```

---

## Security Levels & Priority

```
┌──────────┬────────────────────────────────────────┐
│ Level    │ Description & Examples                  │
├──────────┼────────────────────────────────────────┤
│ CRITICAL │ • Data loss, unauthorized access       │
│          │ • Remote Code Execution (RCE)          │
│          │ • All users affected                   │
│          │ Timeline: 24h Patch                    │
├──────────┼────────────────────────────────────────┤
│ HIGH     │ • Information disclosure (sensitive)   │
│          │ • XSS, Injection vulnerabilities       │
│          │ • Many users affected                  │
│          │ Timeline: 7 days Patch                 │
├──────────┼────────────────────────────────────────┤
│ MEDIUM   │ • Local Privilege Escalation           │
│          │ • Missing Input Validation             │
│          │ • Specific scenarios required          │
│          │ Timeline: 30 days Patch                │
├──────────┼────────────────────────────────────────┤
│ LOW      │ • UI/UX Security Issues                │
│          │ • DoS only under specific conditions   │
│          │ • Minimal impact                       │
│          │ Timeline: 60 days or next release      │
└──────────┴────────────────────────────────────────┘
```

---

## Known Security Aspects & Mitigations

### LocalStorage Security

```
Issue: Data in browser LocalStorage not encrypted
Mitigation:
├─ Users store only on their local device
├─ No data transfer to servers
├─ Use only on "trusted" devices
└─ On shared computer: Use private window

Recommendation for users:
→ Don't enter highly sensitive data
→ Clear browser history/cache regularly
→ Store import backups securely (e.g., encrypted USB)
```

### XSS (Cross-Site Scripting)

```
Status: ✓ Mitigated (Vanilla JS only, no DOM injection)

Protections:
├─ No innerHTML with user input
├─ textContent for usernames
├─ No eval() or dynamic scripts
└─ Input sanitization before localStorage storage

If you find XSS:
→ Report it immediately (critical!)
```

### Input Validation

```
Implemented for:
├─ Date input: ISO format, past/future checks
├─ Number input: min/max values, parseFloat safety
├─ Time format: HH:MM validation
└─ Period input: Start < End validation

Report if: An input causes crash or data loss
```

---

## Current Version Support

```
Version      │ Status              │ Support until
─────────────┼─────────────────────┼─────────────────
2.0.0 (latest) │ ✓ Supported       │ At least 1 year
1.5.0        │ ✓ Limited Support   │ 6 months
1.0.0        │ ✗ End of Life       │ No support
```

**Recommendation:** Please upgrade to the latest version for security patches.

---

## Security Best Practices for Users

```
1. Regular Backups
   → Export → JSON → Store securely (USB, Cloud)

2. Device Security
   → Windows Defender active
   → Browser & OS up-to-date
   → Firewall enabled

3. Data Hygiene
   → Import only from trusted sources
   → Encrypt backup files (e.g., VeraCrypt)
   → Delete old backups after some time

4. Usage Security
   → Don't share exports with others
   → Use private window on shared computer
   → Use password manager for login data (if future auth)
```

---

## Security Vulnerability Scanning

```
Performed Checks:

□ Dependency Scanning (Libraries)
  Status: N/A (Vanilla JS, no npm dependencies)
  
□ Code Quality & Security Linting
  Status: Manual review
  Tools recommended: ESLint, SonarQube (optional)

□ OWASP Top 10 Checks
  Status: Manual audit
  ├─ Injection: ✓ (no server-side code)
  ├─ XSS: ✓ (textContent, no innerHTML)
  ├─ Authentication: ✓ (client-only, no auth needed)
  ├─ Sensitive Data: ✓ (LocalStorage, encrypted optional)
  ├─ XML Entities: ✓ (n/a)
  ├─ Broken Access: ✓ (n/a)
  ├─ CSRF: ✓ (n/a, no server)
  ├─ Deserialization: ✓ (JSON.parse only on trusted data)
  ├─ Components: ✓ (manual audit)
  └─ Logging: ✓ (Browser DevTools)

□ Browser Compatibility
  Status: Tested on Chrome, Firefox, Safari, Edge
  IE 11: ✗ (not supported)
```

---

## Security Update Announcements

When a security patch is released, we share this information:

```
Example Security Advisory:

ADVISORY: Time.Tracker.SingleFile Security Patch v1.0.1

Type: XSS Vulnerability Fix
Severity: MEDIUM
CVE: N/A (no CVE for client-only app)
Affected Versions: 2.0.0
Fixed in: 2.0.1
Release Date: YYYY-MM-DD

Description:
A security researcher reported a potential XSS vulnerability...

Action Required:
→ Update to v2.0.1 (simply reload page)
→ Clear browser cache (Ctrl+Shift+Del)

Credits:
→ Thanks to [Name/Researcher] for the report
```

---

## Privacy & Anonymity

```
Your report is safe:

✓ Confidential handling during fix
✓ You can remain anonymous (optional)
✓ No detail publication before patch
✓ Credits only with your consent
✓ We do not share your contact with third parties
```

---

## Contact & Support

```
Security:       security@Time.Tracker.SingleFile.XXX
General Support: support@Time.Tracker.SingleFile.XXX
GitHub Issues:  Please only non-security issues
```

---

<div align="center">

**Thank you for helping us keep Time.Tracker.SingleFile secure.**

*Your responsible disclosure makes our community safer.*

</div>
