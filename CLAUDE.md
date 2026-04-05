# MyWorkLog - Project Context & Rules

## 🎯 Projekt-Übersicht
MyWorkLog ist eine Progressive Web App (PWA) zur Zeiterfassung und zum Schreiben von Berichtsheften für Auszubildende (Fokus: IHK). 
Die absolute Kern-Philosophie lautet: **Local-First & Privacy by Default.** ## 🏗 Architektur & Philosophie
- **Kein Account-Zwang:** Die App muss zu 100 % ohne Login nutzbar sein.
- **LocalStorage First:** Alle primären Daten (Zeiten, Berichte, Settings) werden im `localStorage` (oder IndexedDB) des Browsers gespeichert.
- **Opt-In Cloud:** Supabase wird NUR genutzt, wenn der User explizit Cloud-Sync oder Backups aktiviert. 
- **Verschlüsselung:** Cloud-Backups werden clientseitig mit AES-256 verschlüsselt, bevor sie an Supabase gesendet werden. Das Backend darf niemals Klartext-Daten lesen können.
- **Performance:** Die App muss instant laden. Jede Interaktion (Kommen/Gehen) muss reibungslos und ohne Server-Latenz funktionieren (1-Sekunden-Sessions sind das Ziel).

## 🛠 Tech Stack
- **Frontend:** Progressive Web App (PWA)
- **Backend/Sync:** Supabase (optional)
- **Analytics:** Umami (Privacy-friendly, Custom Events für Button-Clicks)
- **Hardware-Features:** Web NFC API (`NDEFReader`) für "Tap-to-Work". Fokus liegt auf Android, da Apple Web NFC in iOS Safari blockiert.

## 📝 Spezifische Features & Fachbegriffe
- **Burn Book / Schatten-Berichtsheft:** Ein Feature für die ungeschönte Wahrheit der Ausbildung (AES-verschlüsselt).
- **Tab-Tarnung (Boss-Key):** Ändert `document.title` und das Favicon beim Verlassen des Tabs.
- **NFC Tap-to-Work:** Ermöglicht das Einstechen/Ausstechen über vorprogrammierte NFC-Tags (NTAG215).

## 💻 Coding Standards
1. **Code-Style:** Schreibe sauberen, modularen JavaScript/TypeScript-Code. Keine unnötigen Dependencies, halte den Build lean.
2. **Fehlerbehandlung (WICHTIG):** Rechne immer mit iOS-Usern. APIs wie `NDEFReader` müssen in `try/catch`-Blöcke oder Feature-Detection (`if ('NDEFReader' in window)`) gepackt werden, damit die App auf iPhones nicht crasht.
3. **UI/UX:** Halte das Design dunkel, clean und "Premium". Vermeide billig wirkende CSS-Transitions.
4. **Sprache:** UI-Texte sind auf Deutsch (Zielgruppe: DACH-Raum). Code, Variablen und Commits sind auf Englisch.
## ⚠️ Nie anfassen
- localStorage-Keys nicht umbenennen (Breaking Change für User-Daten)
- Supabase darf NIEMALS ohne expliziten User-Opt-In aufgerufen werden