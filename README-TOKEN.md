**Updates-Manager — Token & Binding (Deutsch)

Kurz: So erlaubst du nur dir den Zugriff auf die online gehostete `Updates-Manager.html` (GitHub Pages / statische Site).

1) Token erzeugen (auf einem sicheren, privaten Gerät)
   - Öffne die Seite lokal oder die gehostete Seite auf deinem privaten Gerät.
   - Klicke **Admin einrichten (Konsole)**. Es wird ein JavaScript-Snippet in der Konsole geloggt.
   - Füge das Snippet in die Browser-Konsole ein und führe es aus. Die Konsole gibt aus:
     - `DB/admin_token.json` (JSON mit `{ "salt": "...", "hash": "..." }`)
     - optional `DB/admin_binding.json` (JSON mit `{ "salt": "...", "binding": "..." }`) — bindet Token an dieses Gerät.

2) Dateien zum Repo hinzufügen (GitHub Web oder lokal)
   - Lokal (Git):
     - Lege die Datei `DB/admin_token.json` mit dem Token‑JSON an.
     - Optional: Lege `DB/admin_binding.json` mit dem Binding‑JSON an.
     - Commit & push:
       ```bash
       git add DB/admin_token.json DB/admin_binding.json
       git commit -m "Add admin token and binding"
       git push
       ```
   - Oder per GitHub Web UI: `Add file` → `Create new file` → setze Pfad `DB/admin_token.json` → paste JSON → Commit/Pull Request.

3) Entsperren auf der Live-Seite
   - Lade die gehostete `Updates-Manager.html` (GitHub Pages) neu.
   - Klicke **Entsperren** und füge das originale Token (nicht das JSON — das Output-Token im Klartext, das du beim Generieren gesehen hast) ein.
   - Wenn `DB/admin_binding.json` vorhanden ist: Nur das gebundene Gerät (Fingerprint) kann sich entsperren.

4) Änderungen veröffentlichen (sicher)
   - Nutze die **Export JSON**-Funktion, um `updates.json` lokal zu speichern.
   - Klicke **Propose PR (GitHub)** im UI oder erstelle manuell eine neue Datei/PR im Repo mit den Änderungen (z. B. `DB/updates.json` oder direkte Änderung von `Aktuelles.html`).
   - Verwende Branch-Protection / Reviews, damit nur berechtigte Personen mergen können.

5) Token / Binding widerrufen oder rotieren
   - Widerruf Token: Entferne `DB/admin_token.json` aus dem Repo und committe (oder ersetze durch neues Token JSON). Alte Token funktionieren dann nicht mehr.
   - Widerruf Binding: Entferne oder ersetze `DB/admin_binding.json` aus dem Repo; das Gerät verliert Zugriff bis neues Binding erstellt wird.

Wichtiges Sicherheits‑Reminder
 - Das Token in Klartext darf nie öffentlich geteilt werden. `DB/admin_token.json` enthält nur Salt+Hash (veröffentlicht werden kann), der Klartexttoken bleibt geheim.
 - Device‑Binding erhöht Sicherheit (Token nur auf gebundenem Gerät nutzbar), aber Browser-/Hardware-Änderungen können Fingerprint verändern -> behalte ein Backup des Tokens.
 - Für maximale Sicherheit verwende PR-/Review‑Workflows und GitHub-Schutzregeln; client‑only Lösungen haben Grenzen.

Wenn du möchtest, schreibe ich diese Anleitung noch als kurze Checkliste ins Haupt-`README.md` oder erkläre dir die Schritte fürs Erzeugen des Tokens Schritt-für-Schritt live.