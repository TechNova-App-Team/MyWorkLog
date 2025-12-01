#################################################################
#                                                                 #
#                    THIRD PARTY NOTICES & ATTRIBUTIONS           #
#                                                                 #
#################################################################

**Language / Sprache:** [GERMAN (Deutsch)](#deutsch) | [ENGLISH](#english)

---

<a id="deutsch"></a>

# DRITTANBIETER-LIZENZEN & QUELLENANGABEN

## Übersicht

Time.Tracker.SingleFile ist eine **Vanilla-Anwendung** ohne externe Abhängigkeiten
(kein npm, keine externe Libraries). Dieser Abschnitt dokumentiert sämtliche
Ressourcen, Inspirationen und Quellenangaben.

---

## 📚 Software & Code-Ressourcen

### 1. Basis-Framework & Technologien

```
┌────────────────────┬───────────────┬─────────────────────┐
│ Komponente         │ Version       │ Lizenz              │
├────────────────────┼───────────────┼─────────────────────┤
│ HTML5              │ Standard      │ W3C (öffentlich)    │
│ CSS3               │ Standard      │ W3C (öffentlich)    │
│ JavaScript (ES6+)  │ Standard      │ ECMA (öffentlich)   │
│ Browser APIs       │ Standard      │ W3C (öffentlich)    │
│ LocalStorage       │ HTML5 Standard│ W3C (öffentlich)    │
│ SVG                │ 1.1           │ W3C (öffentlich)    │
└────────────────────┴───────────────┴─────────────────────┘

Keine Lizenzen erforderlich — alle sind Open/Public Standards.
```

### 2. Font-Familie & Typographie

```
Inter (UI Font)
┌─────────────────────────────────────────────────┐
│ Quelle: https://rsms.me/inter/                  │
│ Lizenz: OFL (Open Font License) 1.1             │
│ Fallback: -apple-system, BlinkMacSystemFont     │
│ Verwendung: UI-Text, Headlines, Labels          │
│ Status: Lizenzkonform ✓                         │
└─────────────────────────────────────────────────┘

JetBrains Mono (Monospace Font)
┌─────────────────────────────────────────────────┐
│ Quelle: https://www.jetbrains.com/lp/mono/      │
│ Lizenz: OFL (Open Font License) 1.1             │
│ Fallback: Roboto Mono, monospace                │
│ Verwendung: Zahlen, Timer, Code-Display        │
│ Status: Lizenzkonform ✓                         │
│ Hinweis: Fallback vorhanden, auch ohne Download │
└─────────────────────────────────────────────────┘
```

### 3. Design & UI-Patterns

```
Glassmorphism / Glass UI
┌─────────────────────────────────────────────────┐
│ Inspiriert durch: Apple macOS, Microsoft Fluent │
│ Quelle: Open-Source Design Community           │
│ Lizenz: Public Domain / CC0                     │
│ Implementierung: Vanilla CSS + Backdrop-Filter │
│ Browser-Support: Chrome 76+, Firefox 103+     │
└─────────────────────────────────────────────────┘

Dark Mode / Theme System
┌─────────────────────────────────────────────────┐
│ Inspiriert durch: Modern Web Standards          │
│ Farben: Custom Color Palette (Eigenentwicklung)│
│ CSS-Variablen: --primary, --bg-deep, etc.      │
│ Lizenz: Eigenwerk (MIT License)                │
└─────────────────────────────────────────────────┘

SVG Charts & Visualisierungen
┌─────────────────────────────────────────────────┐
│ Implementierung: Vanilla JavaScript + SVG       │
│ Libraries: KEINE (handgeschriebene Mathematik) │
│ Referenzen: W3C SVG Spezifikation              │
│ Lizenz: Eigenwerk (MIT License)                │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Icons & Visuelle Elemente

### 1. Unicode/ASCII Icons

```
Verwendete Unicode-Zeichen:

Symbol  │ Name              │ Verwendung        │ Quelle
────────┼───────────────────┼───────────────────┼─────────────
📊      │ Chart            │ Dashboard Icon    │ Unicode 9.0
📈      │ Chart Increasing │ Analytics Icon    │ Unicode 9.0
📅      │ Calendar         │ History Icon      │ Unicode 9.0
⚙️      │ Gear             │ Settings Icon     │ Unicode 8.0
💾      │ Floppy Disk      │ Backup Icon       │ Unicode 8.0
📂      │ Folder           │ Import Icon       │ Unicode 6.0
×       │ Multiplication   │ Close/Delete      │ ASCII
▶       │ Play             │ Start Button      │ Unicode 5.1
II      │ Pause            │ Pause Button      │ ASCII
■       │ Square           │ Stop Button       │ ASCII

Alle Unicode-Zeichen sind lizenzfrei (öffentlich).
Einige emoji werden durch System-Fonts gerendert (Apple, Windows, etc.)
```

### 2. Farbschema

```
Eigenentwickelte Farbpalette:

Farben-Name         │ Hex-Code  │ Verwendung          │ Status
────────────────────┼───────────┼─────────────────────┼─────────
Primary (Purple)    │ #a855f7   │ Hauptfeature, Accent│ Original
Blue                │ #3b82f6   │ Berufsschule        │ Original
Cyan                │ #06b6d4   │ Theme Option        │ Original
Green (Success)     │ #10b981   │ Urlaub, Positive    │ Original
Amber (Warning)     │ #f59e0b   │ Warnungen           │ Original
Red (Danger)        │ #ef4444   │ Fehler, Krank       │ Original
Rose                │ #ec4899   │ Theme Option        │ Original

Alle Farben sind Eigenentwicklung (keine Lizenzabhängigkeit).
Farben basieren auf modernen Palette-Standards (Tailwind-inspiriert).
```

---

## 📄 Open-Source Referenzen & Inspirationen

### 1. Code-Muster & Algorithmen

```
Timer-Logik & RequestAnimationFrame
┌──────────────────────────────────────────┐
│ Quelle: MDN Web Docs, W3C Spec           │
│ URL: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
│ Lizenz: Creative Commons CC0 (Public Domain)
│ Verwendung: Smooth 60FPS Animationen     │
│ Attribution: Nicht erforderlich           │
└──────────────────────────────────────────┘

LocalStorage API
┌──────────────────────────────────────────┐
│ Quelle: WHATWG, MDN Web Docs             │
│ Lizenz: Public Domain                    │
│ Verwendung: Datenpersistierung           │
│ Attribution: Nicht erforderlich           │
└──────────────────────────────────────────┘

SVG Math & Geometrie
┌──────────────────────────────────────────┐
│ Quelle: Eigenentwicklung                 │
│ Referenzen: MDN, W3C SVG Spec            │
│ Formeln: Trigonometrie (öffentlich)      │
│ Lizenzen: MIT (dieses Projekt)           │
└──────────────────────────────────────────┘

Date/Time Arithmetik
┌──────────────────────────────────────────┐
│ Quelle: JavaScript Date API (ECMA)       │
│ Lizenz: Public Domain                    │
│ Verwendung: Zeitberechnungen             │
│ Attribution: Nicht erforderlich           │
└──────────────────────────────────────────┘
```

### 2. Dokumentation & Standards

```
Contributor Covenant
┌──────────────────────────────────────────┐
│ Quelle: https://www.contributor-covenant.org
│ Version: 1.4                              │
│ Lizenz: CC BY 4.0                        │
│ Verwendung: CODE_OF_CONDUCT.md           │
│ Attribution: ✓ Im Dokument erwähnt        │
└──────────────────────────────────────────┘

Conventional Commits
┌──────────────────────────────────────────┐
│ Quelle: https://www.conventionalcommits.org
│ Lizenz: CC BY 3.0                        │
│ Verwendung: Git Commit Message Format    │
│ Attribution: Nicht erforderlich           │
└──────────────────────────────────────────┘

Semantic Versioning
┌──────────────────────────────────────────┐
│ Quelle: https://semver.org               │
│ Lizenz: CC BY 3.0                        │
│ Verwendung: Version Numbers              │
│ Attribution: Nicht erforderlich           │
└──────────────────────────────────────────┘
```

---

## 🏛️ Lizenz-Übersicht

### Dieses Projekt

```
Time.Tracker.SingleFile
┌────────────────────────────────────────────────────┐
│ Lizenz: MIT License                                │
│ Copyright: (c) 2025 Time.Tracker.SingleFile Contributors   │
│ Datei: LICENSE.md oder LICENSE                     │
│ Gültig: Alle Quellcode-Dateien                     │
└────────────────────────────────────────────────────┘

Was ist erlaubt?
✓ Kommerzielle Nutzung
✓ Modifikation
✓ Distribution
✓ Private Nutzung
✓ Sublizenzierung

Was ist erforderlich?
✓ Lizenz & Copyright-Hinweis beifügen
✓ Keine Haftung des Autors

Weitere Infos: https://opensource.org/licenses/MIT
```

### Abhängige Lizenzen

```
Inter Font       │ OFL 1.1     │ ✓ Kompatibel mit MIT
JetBrains Mono   │ OFL 1.1     │ ✓ Kompatibel mit MIT
Contributor Conv.│ CC BY 4.0   │ ✓ Kompatibel (Attribution)
Conventional Com.│ CC BY 3.0   │ ✓ Kompatibel
W3C Standards    │ Public Dom. │ ✓ Kompatibel
```

---

## 🙏 Dankbarkeitsübersicht

```
Wir danken folgenden Organisationen & Communities:

┌─────────────────────────────────────────────────┐
│ W3C (World Wide Web Consortium)                 │
│ → HTML5, CSS3, SVG, JavaScript Standards       │
│ → Öffentliche Standards, lizenzfrei             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ECMA International                              │
│ → ECMAScript / JavaScript Spezifikation        │
│ → Standard für modernes JavaScript              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Contributor Covenant Community                  │
│ → Code of Conduct Standard                      │
│ → Best Practices für offene Communities         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ MDN Web Docs (Mozilla)                          │
│ → Technische Dokumentation                      │
│ → Open-Source-Ressourcen                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ GitHub Community                                │
│ → Open-Source Platform                          │
│ → Collaboration & Versionskontrolle              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Open Source Initiative (OSI)                    │
│ → MIT License Definition                        │
│ → Open Source Standards & Lizenzen              │
└─────────────────────────────────────────────────┘
```

---

## 📋 Lizenziertes Material

### Vollständige Lizenzauszüge

```
1. OFL 1.1 (Open Font License)
   Quelle: https://scripts.sil.org/OFL
   Verwendung: Inter, JetBrains Mono
   
2. MIT License (Dieses Projekt)
   Quelle: https://opensource.org/licenses/MIT
   Volltext: LICENSE.md
   
3. Creative Commons Lizenzen
   CC0 (Public Domain): W3C Dokumentation
   CC BY 3.0: Conventional Commits, SemVer
   CC BY 4.0: Contributor Covenant
```

---

## ✅ Compliance Checklist

```
Lizenz-Compliance für Time.Tracker.SingleFile:

Punkt                                Status  Details
─────────────────────────────────────────────────────────
Eigenem MIT License                  ✓      LICENSE.md vorhanden
OFL 1.1 Fonts korrekt verlinkt        ✓      Fallback vorhanden
Externe Libraries kreditiert          ✓      Keine Abhängigkeiten
Code-Muster attribuiert              ✓      Standards dokumentiert
Standards-Referenzen vorhanden        ✓      W3C, ECMA, etc.
NOTICE/Third-Party File              ✓      Diese Datei
Kein Code ohne Lizenz übernommen      ✓      Alle original oder standard
Contributing Guidelines              ✓      CONTRIBUTING.md
─────────────────────────────────────────────────────────

Gesamtstatus: ✓ COMPLIANT
```

---

<a id="english"></a>

# THIRD PARTY NOTICES & ATTRIBUTIONS

## Overview

Time.Tracker.SingleFile is a **Vanilla application** with no external dependencies
(no npm, no external libraries). This section documents all resources,
inspirations, and attributions.

---

## 📚 Software & Code Resources

### 1. Base Framework & Technologies

```
┌────────────────────┬───────────────┬─────────────────────┐
│ Component          │ Version       │ License             │
├────────────────────┼───────────────┼─────────────────────┤
│ HTML5              │ Standard      │ W3C (public)        │
│ CSS3               │ Standard      │ W3C (public)        │
│ JavaScript (ES6+)  │ Standard      │ ECMA (public)       │
│ Browser APIs       │ Standard      │ W3C (public)        │
│ LocalStorage       │ HTML5 Std.    │ W3C (public)        │
│ SVG                │ 1.1           │ W3C (public)        │
└────────────────────┴───────────────┴─────────────────────┘

No licenses required — all are open/public standards.
```

### 2. Font Families & Typography

```
Inter (UI Font)
┌─────────────────────────────────────────────────┐
│ Source: https://rsms.me/inter/                  │
│ License: OFL (Open Font License) 1.1            │
│ Fallback: -apple-system, BlinkMacSystemFont     │
│ Usage: UI text, headlines, labels               │
│ Status: License compliant ✓                     │
└─────────────────────────────────────────────────┘

JetBrains Mono (Monospace Font)
┌─────────────────────────────────────────────────┐
│ Source: https://www.jetbrains.com/lp/mono/      │
│ License: OFL (Open Font License) 1.1            │
│ Fallback: Roboto Mono, monospace                │
│ Usage: Numbers, timer, code display             │
│ Status: License compliant ✓                     │
│ Note: Fallback available, works without download│
└─────────────────────────────────────────────────┘
```

### 3. Design & UI Patterns

```
Glassmorphism / Glass UI
┌─────────────────────────────────────────────────┐
│ Inspired by: Apple macOS, Microsoft Fluent      │
│ Source: Open-Source Design Community            │
│ License: Public Domain / CC0                    │
│ Implementation: Vanilla CSS + Backdrop-Filter  │
│ Browser Support: Chrome 76+, Firefox 103+      │
└─────────────────────────────────────────────────┘

Dark Mode / Theme System
┌─────────────────────────────────────────────────┐
│ Inspired by: Modern Web Standards               │
│ Colors: Custom Color Palette (original work)    │
│ CSS Variables: --primary, --bg-deep, etc.       │
│ License: Original work (MIT License)            │
└─────────────────────────────────────────────────┘

SVG Charts & Visualizations
┌─────────────────────────────────────────────────┐
│ Implementation: Vanilla JavaScript + SVG        │
│ Libraries: NONE (handwritten mathematics)       │
│ References: W3C SVG Specification               │
│ License: Original work (MIT License)            │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Icons & Visual Elements

### 1. Unicode/ASCII Icons

```
Used Unicode Characters:

Symbol  │ Name              │ Usage             │ Source
────────┼───────────────────┼───────────────────┼─────────────
📊      │ Chart            │ Dashboard Icon    │ Unicode 9.0
📈      │ Chart Increasing │ Analytics Icon    │ Unicode 9.0
📅      │ Calendar         │ History Icon      │ Unicode 9.0
⚙️      │ Gear             │ Settings Icon     │ Unicode 8.0
💾      │ Floppy Disk      │ Backup Icon       │ Unicode 8.0
📂      │ Folder           │ Import Icon       │ Unicode 6.0
×       │ Multiplication   │ Close/Delete      │ ASCII
▶       │ Play             │ Start Button      │ Unicode 5.1
II      │ Pause            │ Pause Button      │ ASCII
■       │ Square           │ Stop Button       │ ASCII

All Unicode characters are license-free (public).
Some emoji rendered by system fonts (Apple, Windows, etc.)
```

### 2. Color Scheme

```
Custom Developed Color Palette:

Color Name              │ Hex-Code  │ Usage               │ Status
────────────────────────┼───────────┼─────────────────────┼─────────
Primary (Purple)        │ #a855f7   │ Main feature, accent│ Original
Blue                    │ #3b82f6   │ School              │ Original
Cyan                    │ #06b6d4   │ Theme option        │ Original
Green (Success)         │ #10b981   │ Vacation, positive  │ Original
Amber (Warning)         │ #f59e0b   │ Warnings            │ Original
Red (Danger)            │ #ef4444   │ Errors, sick leave  │ Original
Rose                    │ #ec4899   │ Theme option        │ Original

All colors are original work (no license dependency).
Colors based on modern palette standards (Tailwind-inspired).
```

---

## 📄 Open Source References & Inspirations

### 1. Code Patterns & Algorithms

```
Timer Logic & RequestAnimationFrame
┌──────────────────────────────────────────┐
│ Source: MDN Web Docs, W3C Spec           │
│ URL: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
│ License: Creative Commons CC0 (Public Domain)
│ Usage: Smooth 60FPS animations           │
│ Attribution: Not required                 │
└──────────────────────────────────────────┘

LocalStorage API
┌──────────────────────────────────────────┐
│ Source: WHATWG, MDN Web Docs             │
│ License: Public Domain                   │
│ Usage: Data persistence                  │
│ Attribution: Not required                 │
└──────────────────────────────────────────┘

SVG Math & Geometry
┌──────────────────────────────────────────┐
│ Source: Original work                    │
│ References: MDN, W3C SVG Spec            │
│ Formulas: Trigonometry (public domain)   │
│ License: MIT (this project)              │
└──────────────────────────────────────────┘

Date/Time Arithmetic
┌──────────────────────────────────────────┐
│ Source: JavaScript Date API (ECMA)       │
│ License: Public Domain                   │
│ Usage: Time calculations                 │
│ Attribution: Not required                 │
└──────────────────────────────────────────┘
```

### 2. Documentation & Standards

```
Contributor Covenant
┌──────────────────────────────────────────┐
│ Source: https://www.contributor-covenant.org
│ Version: 1.4                              │
│ License: CC BY 4.0                       │
│ Usage: CODE_OF_CONDUCT.md                │
│ Attribution: ✓ Mentioned in document     │
└──────────────────────────────────────────┘

Conventional Commits
┌──────────────────────────────────────────┐
│ Source: https://www.conventionalcommits.org
│ License: CC BY 3.0                       │
│ Usage: Git commit message format         │
│ Attribution: Not required                 │
└──────────────────────────────────────────┘

Semantic Versioning
┌──────────────────────────────────────────┐
│ Source: https://semver.org               │
│ License: CC BY 3.0                       │
│ Usage: Version numbers                   │
│ Attribution: Not required                 │
└──────────────────────────────────────────┘
```

---

## 🏛️ License Overview

### This Project

```
Time.Tracker.SingleFile
┌────────────────────────────────────────────────────┐
│ License: MIT License                               │
│ Copyright: (c) 2025 Time.Tracker.SingleFile Contributors   │
│ File: LICENSE.md or LICENSE                        │
│ Valid for: All source code files                   │
└────────────────────────────────────────────────────┘

What is permitted?
✓ Commercial use
✓ Modification
✓ Distribution
✓ Private use
✓ Sublicensing

What is required?
✓ Include license & copyright notice
✓ No liability of author

More info: https://opensource.org/licenses/MIT
```

### Dependent Licenses

```
Inter Font       │ OFL 1.1     │ ✓ Compatible with MIT
JetBrains Mono   │ OFL 1.1     │ ✓ Compatible with MIT
Contributor Conv.│ CC BY 4.0   │ ✓ Compatible (Attribution)
Conventional Com.│ CC BY 3.0   │ ✓ Compatible
W3C Standards    │ Public Dom. │ ✓ Compatible
```

---

## 🙏 Acknowledgments

```
We thank the following organizations & communities:

┌─────────────────────────────────────────────────┐
│ W3C (World Wide Web Consortium)                 │
│ → HTML5, CSS3, SVG, JavaScript standards        │
│ → Public standards, license-free                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ECMA International                              │
│ → ECMAScript / JavaScript specification         │
│ → Standard for modern JavaScript                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Contributor Covenant Community                  │
│ → Code of Conduct standard                      │
│ → Best practices for open communities           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ MDN Web Docs (Mozilla)                          │
│ → Technical documentation                       │
│ → Open-source resources                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ GitHub Community                                │
│ → Open-source platform                          │
│ → Collaboration & version control               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Open Source Initiative (OSI)                    │
│ → MIT License definition                        │
│ → Open source standards & licenses              │
└─────────────────────────────────────────────────┘
```

---

## 📋 Licensed Material

### Full License Excerpts

```
1. OFL 1.1 (Open Font License)
   Source: https://scripts.sil.org/OFL
   Usage: Inter, JetBrains Mono
   
2. MIT License (This Project)
   Source: https://opensource.org/licenses/MIT
   Full text: LICENSE.md
   
3. Creative Commons Licenses
   CC0 (Public Domain): W3C documentation
   CC BY 3.0: Conventional Commits, SemVer
   CC BY 4.0: Contributor Covenant
```

---

## ✅ Compliance Checklist

```
License Compliance for Time.Tracker.SingleFile:

Item                                   Status  Details
─────────────────────────────────────────────────────────
Own MIT License                        ✓      LICENSE.md present
OFL 1.1 Fonts correctly linked         ✓      Fallback available
External libraries credited            ✓      No dependencies
Code patterns attributed               ✓      Standards documented
Standards references available         ✓      W3C, ECMA, etc.
NOTICE/Third-Party File               ✓      This file
No code taken without license          ✓      All original or standard
Contributing guidelines               ✓      CONTRIBUTING.md
─────────────────────────────────────────────────────────

Overall Status: ✓ COMPLIANT
```

---

<div align="center">

**Open Source & Transparent.**

*Time.Tracker.SingleFile respects and follows open source principles and licenses.*

</div>
