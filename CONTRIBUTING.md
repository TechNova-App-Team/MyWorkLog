#################################################################
#                                                                 #
#                     CONTRIBUTING GUIDELINES                     #
#                                                                 #
#################################################################

**Language / Sprache:** [GERMAN (Deutsch)](#deutsch) | [ENGLISH](#english)

---

<a id="deutsch"></a>

# BEITRÄGE ZU Time.Tracker.SingleFile

Danke, dass du Time.Tracker.SingleFile unterstützen möchtest! 🙏

Dieses Dokument erklärt wie du effektiv einen Beitrag leisten kannst — ob Bug-Fix, Feature, Dokumentation oder Test.

---

## 📋 Inhaltsverzeichnis (Deutsch)

1. [Verhaltenscodex](#verhaltenscodex)
2. [Typen von Beiträgen](#typen-von-beiträgen)
3. [Pull-Request Prozess](#pull-request-prozess)
4. [Commit-Richtlinien](#commit-richtlinien)
5. [Branching-Strategie](#branching-strategie)
6. [Code-Standards](#code-standards)
7. [Testing](#testing)
8. [Dokumentation](#dokumentation)
9. [Fragen & Support](#fragen--support)

---

## Verhaltenscodex

Wir nutzen den **Contributor Covenant** (siehe `CODE_OF_CONDUCT.md`). Kurz:

```
✓ Seien Sie respektvoll und konstruktiv
✓ Inklusive Sprache und Gedanken
✓ Akzeptieren Sie Kritik offen
✗ Keine Belästigung, Mobbing oder Diskriminierung
```

Verstöße melden an: `support@Time.Tracker.SingleFile.XXX` (oder GitHub Issues mit 🚨 Flag).

---

## Typen von Beiträgen

### 1. Bug-Fixes 🐛

**Du hast einen Fehler gefunden?**

```
Schritte:
1. Issue öffnen mit Label 'bug' und Reproduzierungsschritte
2. Branch erstellen: git checkout -b fix/issue-xyz
3. Fehler beheben, Tests schreiben
4. PR öffnen mit Link zum Issue (#xyz)
5. Review & Merge
```

**Beispiel-Titel:** `fix: timer not saving on page reload`

### 2. Features & Verbesserungen ✨

**Neue Funktionalität?**

```
Schritte:
1. Diskussion öffnen oder Issue erstellen (nicht direkt PR!)
   → Label: 'enhancement' oder 'feature-request'
   → Beschreibung: Was, Warum, Akzeptanzkriterien
2. Warten auf Feedback (Maintainer)
3. Bei Genehmigung: Feature-Branch erstellen
4. Implementieren, testen, dokumentieren
5. PR öffnen
6. Review & Merge
```

**Beispiel-Titel:** `feat: add monthly performance export to PDF`

### 3. Dokumentation 📚

**Fehler in README, Typo, oder fehlende Erklärung?**

```
Schritte:
1. Branch: git checkout -b docs/update-xyz
2. Änderungen vornehmen
3. Lokal testen (Markdown rendern)
4. PR öffnen mit Label 'documentation'
5. Merge bei Genehmigung
```

**Schnelle Typo-Fixes:** Direkt PR ohne Issue — einfach!

### 4. Tests & QA 🧪

**Test-Coverage verbessern?**

```
Schritte:
1. Branch: git checkout -b test/add-xyz-tests
2. Test-Suite erweitern (→ siehe Testing Sektion)
3. PR mit Label 'test' oder 'qa'
4. Review & Merge
```

### 5. Performance & Refactoring ⚡

**Code optimieren oder umstrukturieren?**

```
Schritte:
1. Messungen zeigen (z.B. Benchmark-Ergebnisse)
2. Branch: git checkout -b perf/optimize-xyz
3. Refactor mit Tests
4. Performance-Vergleich in PR-Beschreibung
5. Review & Merge
```

---

## Pull-Request Prozess

### Schritt 1: Repository forken & klonen

```bash
# 1. Fork on GitHub UI
# 2. Lokal klonen
git clone https://github.com/YOUR_USERNAME/Time.Tracker.SingleFile.git
cd Time.Tracker.SingleFile

# 3. Upstream hinzufügen (für Sync)
git remote add upstream https://github.com/original/Time.Tracker.SingleFile.git
```

### Schritt 2: Feature-Branch erstellen

```bash
# Branching-Konvention: <type>/<short-description>
git checkout -b feature/add-dark-mode
# oder
git checkout -b fix/timer-not-saving
# oder
git checkout -b docs/update-readme
```

### Schritt 3: Änderungen vornehmen

```bash
# Editiere Dateien...
git add .
git commit -m "feat: add dark mode toggle to settings"
# (Siehe Commit-Richtlinien unten)
```

### Schritt 4: Upstream synchronisieren (falls nötig)

```bash
# Falls Upstream hat neue Commits
git fetch upstream
git rebase upstream/main
# oder
git merge upstream/main
```

### Schritt 5: Push & PR öffnen

```bash
git push origin feature/add-dark-mode
# → GitHub zeigt "Compare & pull request" Button
```

**PR-Template (bitte ausfüllen):**

```markdown
## Beschreibung
Kurze Übersicht: Was ändert sich?

## Issue Link
Fixes #123 (wenn zutreffend)

## Typ der Änderung
- [ ] Bug-Fix
- [ ] Neue Feature
- [ ] Breaking Change
- [ ] Dokumentation

## Wie wurde das getestet?
Beschreibe Testszenarios:
- [ ] Lokal getestet auf Chrome
- [ ] Lokal getestet auf Firefox
- [ ] Tests geschrieben/erweitert

## Screenshots (optional)
Bild oder GIF bei UI-Änderungen

## Checklist
- [ ] Code folgt den Style-Guidelines
- [ ] Ich habe relevante Dokumentation aktualisiert
- [ ] Keine neuen Warnungen beim Build
- [ ] Tests bestanden
- [ ] Commit-Messages folgen dem Format
```

### Schritt 6: Review & Feedback

```
Expectation:
├─ Mindestens 1 Maintainer-Review
├─ Alle Comments adressiert
├─ Requested changes: Änderungen committen
└─ Approved → Merge durch Maintainer
```

**Bei Konflikten:**

```bash
# Rebase interaktiv
git rebase -i upstream/main
# Konflikte lösen, dann:
git add .
git rebase --continue
git push origin feature/xyz --force-with-lease
```

---

## Commit-Richtlinien

### Format: Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

```
feat:     Neue Feature
fix:      Bug-Fix
docs:     Dokumentation
style:    Formatierung, Whitespace (kein Code-Change)
refactor: Code-Umstrukturierung ohne Feature-Änderung
perf:     Performance-Verbesserung
test:     Tests hinzufügen/ändern
chore:    Build, Dependencies, CI/CD
ci:       GitHub Actions, CI-Konfiguration
```

### Beispiele

```bash
# Feature
git commit -m "feat(timer): add pause/resume functionality"

# Bug-Fix
git commit -m "fix(ui): corrected ring calculation for month view"

# Docs
git commit -m "docs: update README with installation steps"

# Refactor
git commit -m "refactor(charts): simplify trend rendering logic"

# Mit Body (für komplexe Changes)
git commit -m "feat(export): add PDF export for monthly reports

- Added pdfkit library dependency
- Implemented export-to-pdf functionality
- Added export button to dashboard
- Tested on Windows, Mac, Linux

Fixes #456"
```

---

## Branching-Strategie

```
main (Production)
├── feature/dark-mode (Feature-Branch)
├── fix/timer-bug (Bugfix-Branch)
├── docs/update-readme (Docs-Branch)
└── release/v2.1.0 (Release-Vorbereitung, falls nötig)
```

**Regeln:**

- `main` ist immer produktiv-ready
- Branches für jeden PR (kein direkter Push zu main)
- Branch-Naming: `<type>/<description>` (Lowercase, Hyphens)
- Nach Merge: Branch löschen

---

## Code-Standards

### Stil-Guides

#### JavaScript/HTML/CSS
```
- Indentation: 4 Spaces (konsistent mit bestehendem Code)
- Zeilenlänge: max 100 Characters (flexibel für Lesbarkeit)
- Variablennamen: camelCase (timeTracker, ringValue)
- Funktionen: Kurz, fokussiert, Well-Commented
- CSS: Nutze CSS-Variablen (--primary, --bg-deep, etc.)
```

#### Kommentare
```javascript
// ✓ GOOD: Klare, kurze Kommentare
function calculateSaldo(entries) {
  // Sum all diff values to get current balance
  return entries.reduce((sum, e) => sum + e.diff, 0);
}

// ✗ AVOID: Redundante oder zu viele Kommentare
function calculateSaldo(entries) {
  // Loop durch alle Einträge
  // Addiere diff value
  // Return das Ergebnis
  return entries.reduce((sum, e) => sum + e.diff, 0);
}
```

#### Funktionen
```javascript
// ✓ GOOD: Einzige Verantwortung
function timerAction(action) {
  if (action === 'start') startTimer();
  else if (action === 'pause') pauseTimer();
  else if (action === 'stop') stopTimer();
}

// ✗ AVOID: Zu viele Aufgaben
function timerAction(action) {
  // Startet Timer, speichert, rendet UI, maillt Benachrichtigung...
}
```

### ESLint / Prettier (optional)

Falls du Linting hinzufügen möchtest:
```bash
npm install --save-dev eslint prettier
npx eslint . --fix
npx prettier --write "**/*.{js,html,css}"
```

---

## Testing

### Wo testen?

```
Browser DevTools (F12):
├─ Console: Fehler/Warnungen prüfen
├─ Application → LocalStorage: Daten persistent?
└─ Performance: Animationen smooth (60 FPS)?
```

### Test-Checklist

```
Vor PR-Submit, bitte testen:

□ Feature funktioniert wie erwartet
□ Keine Console-Fehler (F12)
□ Keine JavaScript-Crashes
□ Responsive Design (Desktop, Tablet, Mobile)
□ Dark Mode funktioniert (falls Feature)
□ LocalStorage wird korrekt gespeichert
□ Export/Import funktioniert
□ Performance: > 50 FPS
□ Browser-Kompatibilität (Chrome, Firefox, Safari, Edge)
```

### Manuelle Testszenarios

#### Timer Feature
```
1. Öffne Dashboard
2. Klick "Start" → Timer läuft
3. Klick "Pause" → Timer stoppt
4. Klick "Stop" → Modal mit Speichern
5. Bestätige → Eintrag erscheint in Liste
6. Reload Seite → Daten persistieren
```

#### Settings / Urlaub
```
1. Öffne Einstellungen
2. Ändere Name → Speichern
3. Ändere Arbeitszeiten → Speichern
4. Reload → Änderungen bleiben
5. Starte Blockbuchung Urlaub (z.B. 20-31 Dez)
6. Prüfe: Alle Werktage sind als "Urlaub" eingetragen
```

#### Performance Analytics
```
1. Dashboard → Performance Tab
2. Chart sollte laden (mind. 2 Monate Daten nötig)
3. KPIs berechnet und angezeigt
4. Keine visuellen Lags
```

---

## Dokumentation

### Wenn du eine Feature hinzufügst, bitte auch:

1. **README.md aktualisieren**
   - Feature in Features-Sektion
   - Beispiel-Workflow hinzufügen
   - Ggf. Screenshot/GIF

2. **Inline-Code-Kommentare**
   - Komplexe Logik erklären
   - Magic Numbers erläutern (z.B. warum 276 bei SVG?)

3. **JSDoc (optional, aber nice)**
   ```javascript
   /**
    * Calculates the working time difference for a day
    * @param {Object} entry - The time entry object
    * @param {number} entry.worked - Hours worked
    * @param {number} entry.expected - Expected hours
    * @returns {number} Difference (worked - expected)
    */
   function calculateDiff(entry) {
     return entry.worked - entry.expected;
   }
   ```

### Issue-Dokumentation

Wenn du ein Issue öffnest, bitte folgende Info-Box ausfüllen:

```markdown
## Bug Report

**Describe the bug:**
(Kurze Beschreibung)

**Steps to reproduce:**
1. ...
2. ...
3. ...

**Expected behavior:**
(Was sollte passieren?)

**Actual behavior:**
(Was passiert stattdessen?)

**Environment:**
- Browser: Chrome/Firefox/Safari
- OS: Windows/Mac/Linux
- Zeitstempel: ...

**Screenshots / Logs:**
(F12 Console-Output, falls relevant)
```

---

## Fragen & Support

- GitHub Issues: Bugs, Features, Diskussionen
- Discussions Tab: Allgemeine Fragen
- Email: support@Time.Tracker.SingleFile.XXX (für sensible Themen)
- Security Vulns: Siehe `SECURITY.md`

---

<a id="english"></a>

# CONTRIBUTING TO Time.Tracker.SingleFile

Thank you for wanting to support Time.Tracker.SingleFile! 🙏

This document explains how to make effective contributions — whether bug fixes, features, documentation, or tests.

---

## 📋 Table of Contents (English)

1. [Code of Conduct](#code-of-conduct-en)
2. [Types of Contributions](#types-of-contributions-en)
3. [Pull Request Process](#pull-request-process-en)
4. [Commit Guidelines](#commit-guidelines-en)
5. [Branching Strategy](#branching-strategy-en)
6. [Code Standards](#code-standards-en)
7. [Testing](#testing-en)
8. [Documentation](#documentation-en)
9. [Questions & Support](#questions--support-en)

---

<a id="code-of-conduct-en"></a>

## Code of Conduct

We use the **Contributor Covenant** (see `CODE_OF_CONDUCT.md`). In short:

```
✓ Be respectful and constructive
✓ Use inclusive language
✓ Accept criticism openly
✗ No harassment, bullying, or discrimination
```

Report violations to: `support@Time.Tracker.SingleFile.XXX` (or GitHub Issues with 🚨 flag).

---

<a id="types-of-contributions-en"></a>

## Types of Contributions

### 1. Bug Fixes 🐛

**Found a bug?**

```
Steps:
1. Open issue with label 'bug' + reproduction steps
2. Create branch: git checkout -b fix/issue-xyz
3. Fix bug, write tests
4. Open PR with link to issue (#xyz)
5. Review & Merge
```

**Example title:** `fix: timer not saving on page reload`

### 2. Features & Improvements ✨

**New functionality?**

```
Steps:
1. Open discussion or issue first (not direct PR!)
   → Label: 'enhancement' or 'feature-request'
   → Description: What, Why, Acceptance Criteria
2. Wait for feedback (Maintainers)
3. If approved: Create feature branch
4. Implement, test, document
5. Open PR
6. Review & Merge
```

**Example title:** `feat: add monthly performance export to PDF`

### 3. Documentation 📚

**Error in README, typo, or missing explanation?**

```
Steps:
1. Branch: git checkout -b docs/update-xyz
2. Make changes
3. Test locally (render markdown)
4. Open PR with label 'documentation'
5. Merge on approval
```

**Quick typo fixes:** Direct PR without issue — go!

### 4. Tests & QA 🧪

**Improve test coverage?**

```
Steps:
1. Branch: git checkout -b test/add-xyz-tests
2. Extend test suite (→ see Testing section)
3. PR with label 'test' or 'qa'
4. Review & Merge
```

### 5. Performance & Refactoring ⚡

**Optimize code or restructure?**

```
Steps:
1. Show measurements (e.g., benchmark results)
2. Branch: git checkout -b perf/optimize-xyz
3. Refactor with tests
4. Performance comparison in PR description
5. Review & Merge
```

---

<a id="pull-request-process-en"></a>

## Pull Request Process

### Step 1: Fork & Clone Repository

```bash
# 1. Fork on GitHub UI
# 2. Clone locally
git clone https://github.com/YOUR_USERNAME/Time.Tracker.SingleFile.git
cd Time.Tracker.SingleFile

# 3. Add upstream (for sync)
git remote add upstream https://github.com/original/Time.Tracker.SingleFile.git
```

### Step 2: Create Feature Branch

```bash
# Branching convention: <type>/<short-description>
git checkout -b feature/add-dark-mode
# or
git checkout -b fix/timer-not-saving
# or
git checkout -b docs/update-readme
```

### Step 3: Make Changes

```bash
# Edit files...
git add .
git commit -m "feat: add dark mode toggle to settings"
# (See Commit Guidelines below)
```

### Step 4: Sync with Upstream (if needed)

```bash
# If upstream has new commits
git fetch upstream
git rebase upstream/main
# or
git merge upstream/main
```

### Step 5: Push & Open PR

```bash
git push origin feature/add-dark-mode
# → GitHub shows "Compare & pull request" button
```

**PR Template (please fill out):**

```markdown
## Description
Brief overview: What changes?

## Issue Link
Fixes #123 (if applicable)

## Type of Change
- [ ] Bug Fix
- [ ] New Feature
- [ ] Breaking Change
- [ ] Documentation

## How Has This Been Tested?
Describe test scenarios:
- [ ] Tested locally on Chrome
- [ ] Tested locally on Firefox
- [ ] Tests written/extended

## Screenshots (optional)
Image or GIF for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] I updated relevant documentation
- [ ] No new warnings on build
- [ ] Tests passed
- [ ] Commit messages follow format
```

### Step 6: Review & Feedback

```
Expectation:
├─ At least 1 maintainer review
├─ All comments addressed
├─ Requested changes: commit changes
└─ Approved → Merge by maintainer
```

**On conflicts:**

```bash
# Interactive rebase
git rebase -i upstream/main
# Resolve conflicts, then:
git add .
git rebase --continue
git push origin feature/xyz --force-with-lease
```

---

<a id="commit-guidelines-en"></a>

## Commit Guidelines

### Format: Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

```
feat:     New feature
fix:      Bug fix
docs:     Documentation
style:    Formatting, whitespace (no code change)
refactor: Code restructure without feature change
perf:     Performance improvement
test:     Tests added/changed
chore:    Build, dependencies, CI/CD
ci:       GitHub Actions, CI configuration
```

### Examples

```bash
# Feature
git commit -m "feat(timer): add pause/resume functionality"

# Bug Fix
git commit -m "fix(ui): corrected ring calculation for month view"

# Docs
git commit -m "docs: update README with installation steps"

# Refactor
git commit -m "refactor(charts): simplify trend rendering logic"

# With body (for complex changes)
git commit -m "feat(export): add PDF export for monthly reports

- Added pdfkit library dependency
- Implemented export-to-pdf functionality
- Added export button to dashboard
- Tested on Windows, Mac, Linux

Fixes #456"
```

---

<a id="branching-strategy-en"></a>

## Branching Strategy

```
main (Production)
├── feature/dark-mode (Feature Branch)
├── fix/timer-bug (Bugfix Branch)
├── docs/update-readme (Docs Branch)
└── release/v2.1.0 (Release prep, if needed)
```

**Rules:**

- `main` is always production-ready
- Branches for each PR (no direct push to main)
- Branch naming: `<type>/<description>` (lowercase, hyphens)
- After merge: delete branch

---

<a id="code-standards-en"></a>

## Code Standards

### Style Guides

#### JavaScript/HTML/CSS
```
- Indentation: 4 spaces (consistent with existing code)
- Line length: max 100 characters (flexible for readability)
- Variable names: camelCase (timeTracker, ringValue)
- Functions: Short, focused, well-commented
- CSS: Use CSS variables (--primary, --bg-deep, etc.)
```

#### Comments
```javascript
// ✓ GOOD: Clear, concise comments
function calculateSaldo(entries) {
  // Sum all diff values to get current balance
  return entries.reduce((sum, e) => sum + e.diff, 0);
}

// ✗ AVOID: Redundant or excessive comments
function calculateSaldo(entries) {
  // Loop through all entries
  // Add diff value
  // Return result
  return entries.reduce((sum, e) => sum + e.diff, 0);
}
```

#### Functions
```javascript
// ✓ GOOD: Single responsibility
function timerAction(action) {
  if (action === 'start') startTimer();
  else if (action === 'pause') pauseTimer();
  else if (action === 'stop') stopTimer();
}

// ✗ AVOID: Too many responsibilities
function timerAction(action) {
  // Starts timer, saves, renders UI, sends notifications...
}
```

### ESLint / Prettier (optional)

If you want to add linting:
```bash
npm install --save-dev eslint prettier
npx eslint . --fix
npx prettier --write "**/*.{js,html,css}"
```

---

<a id="testing-en"></a>

## Testing

### Where to Test?

```
Browser DevTools (F12):
├─ Console: Check errors/warnings
├─ Application → LocalStorage: Data persistent?
└─ Performance: Smooth animations (60 FPS)?
```

### Test Checklist

```
Before submitting PR, please test:

□ Feature works as expected
□ No console errors (F12)
□ No JavaScript crashes
□ Responsive design (desktop, tablet, mobile)
□ Dark mode works (if applicable)
□ LocalStorage saves correctly
□ Export/import works
□ Performance: > 50 FPS
□ Browser compatibility (Chrome, Firefox, Safari, Edge)
```

### Manual Test Scenarios

#### Timer Feature
```
1. Open Dashboard
2. Click "Start" → Timer runs
3. Click "Pause" → Timer stops
4. Click "Stop" → Modal appears with save option
5. Confirm → Entry appears in list
6. Reload page → Data persists
```

#### Settings / Vacation
```
1. Open Settings
2. Change name → Save
3. Change working hours → Save
4. Reload → Changes remain
5. Start vacation block (e.g., Dec 20-31)
6. Check: All working days marked as "Vacation"
```

#### Performance Analytics
```
1. Dashboard → Performance Tab
2. Chart should load (requires min. 2 months data)
3. KPIs calculated and displayed
4. No visual lags
```

---

<a id="documentation-en"></a>

## Documentation

### When Adding a Feature, Also:

1. **Update README.md**
   - Add feature to Features section
   - Include example workflow
   - Add screenshot/GIF if UI-related

2. **Inline Code Comments**
   - Explain complex logic
   - Clarify magic numbers (e.g., why 276 on SVG?)

3. **JSDoc (optional, but nice)**
   ```javascript
   /**
    * Calculates the working time difference for a day
    * @param {Object} entry - The time entry object
    * @param {number} entry.worked - Hours worked
    * @param {number} entry.expected - Expected hours
    * @returns {number} Difference (worked - expected)
    */
   function calculateDiff(entry) {
     return entry.worked - entry.expected;
   }
   ```

### Issue Documentation

When opening an issue, please fill out this info box:

```markdown
## Bug Report

**Describe the bug:**
(Brief description)

**Steps to reproduce:**
1. ...
2. ...
3. ...

**Expected behavior:**
(What should happen?)

**Actual behavior:**
(What happens instead?)

**Environment:**
- Browser: Chrome/Firefox/Safari
- OS: Windows/Mac/Linux
- Timestamp: ...

**Screenshots / Logs:**
(F12 Console output, if relevant)
```

---

<a id="questions--support-en"></a>

## Questions & Support

- GitHub Issues: Bugs, features, discussions
- Discussions Tab: General questions
- Email: support@Time.Tracker.SingleFile.XXX (for sensitive topics)
- Security Vulns: See `SECURITY.md`

---

<div align="center">

**Thank you for contributing to Time.Tracker.SingleFile!**

*Together we build a better time tracking experience.*

</div>
