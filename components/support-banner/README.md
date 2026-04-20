# Support Banner Component

Eleganter, diskret-respektvoller Support/Donation-Banner für MyWorkLog.

## Features

✨ **Zwei Varianten:**
- **Modal** – Elegant, full-screen. Erscheint 3s nach dem Laden (1. Visit) oder nach 30 Tagen
- **Footer Banner** – Persistent, immer sichtbar am unteren Rand

🎨 **Design:**
- Glassmorphism mit Dark/Light Theme Support
- Smooth Animations (Fade, Slide)
- Mobile-optimiert
- Nicht-invasiv, nutzerfreundlich

🔒 **Smart Display:**
- localStorage-basiert
- Max. 1x pro 30 Tagen
- Nutzer können leicht dismissing

## Integration

### 1. HTML in `index.html` einfügen

Kopiere die HTML aus `components/support-banner/html.html` in deinen `<body>`:

```html
<!-- Vor </body> -->
<div id="supportModal" class="support-modal-overlay" style="display: none;">
  ... (siehe html.html)
</div>
<div id="supportBanner" class="support-banner" style="display: none;">
  ... (siehe html.html)
</div>
```

### 2. CSS in `index.html` einfügen

Im `<head>`:

```html
<link rel="stylesheet" href="components/support-banner/css.css">
```

Oder inline die CSS-Datei kopieren.

### 3. JS in `index.html` einfügen

Vor `</body>`, **nach** `core.js`:

```html
<script src="components/support-banner/js.js"></script>
```

### 4. Banner aktivieren

In deiner App (z.B. `core.js` oder `dashboard.js`), rufe auf:

```javascript
// Option 1: Modal beim Laden (3s Verzögerung, dann max. 1x/30d)
SupportBanner.showModalIfEligible();

// Option 2: Footer Banner immer sichtbar
SupportBanner.showBanner();
```

## Konfiguration

**Donate-URL anpassen:**

In `js.js`, Zeile ~6:

```javascript
donateUrl: 'https://buymeacoffee.com/myworklog', // Deine URL
```

**Intervall ändern (default 30 Tage):**

```javascript
showIntervalMs: 30 * 24 * 60 * 60 * 1000, // Millisekunden
```

**Verzögerung beim ersten Besuch:**

```javascript
setTimeout(() => this.show('modal'), 3000); // 3 Sekunden
```

## Styling Anpassen

Das Component nutzt deine existierenden CSS-Variablen:
- `--primary` (default: #a855f7)
- `--bg-glass`
- `--radius`

Weitere Tweaks direkt in `css.css`.

## Analytics

Die Component sendet Events via `uEvent()` (angenommen, es existiert):
- `support_banner_donate_click` – Nutzer klickt "Kaffee spendieren"
- `support_banner_modal_dismissed` – Modal geschlossen
- `support_banner_footer_click` – Footer-Banner angeklickt
- `support_banner_footer_dismissed` – Banner geschlossen

## Dark/Light Theme

CSS unterstützt beide Themes via `[data-theme="light"]`. Keine zusätzliche Konfiguration nötig.
