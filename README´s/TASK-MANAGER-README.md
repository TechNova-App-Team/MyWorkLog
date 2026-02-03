# 📋 Task Manager Pro - Dokumentation

## Überblick
Ein modernes, vollständig funktionales Task-Management-System für dein Dashboard. Mit **localStorage-Speicherung**, **Kategorien**, **Prioritäten**, **Fälligkeitsdaten** und **Subtasks**.

## Features

### ✨ Hauptfunktionen
- ✅ **Task-Verwaltung**: Erstelle, bearbeite und lösche Tasks
- 📁 **Kategorien**: General, Arbeit, Lernen, Projekt, Persönlich
- 🎯 **Prioritäten**: Niedrig, Mittel, Hoch (mit visuellen Indikatoren)
- 📅 **Fälligkeitsdaten**: Mit Überfällig-Warnung & Heute-Hervorhebung
- ✔️ **Subtasks**: Erstelle Unter-Tasks für komplexe Aufgaben
- 🔍 **Filter**: Nach Status (Alle, Aktiv, Erledigt), Kategorie
- 💾 **Persistenz**: Automatische Speicherung in localStorage
- 🎨 **Modern UI**: Glasmorphismus-Design mit Dark Mode

### 🎯 Benutzerinterface
- Intuitive Task-Erstellungsform mit allen Optionen
- Live-Task-Liste mit Status, Priorität, Kategorie
- Schnelle Completion-Checkboxes
- Visuelle Hervorhebung von überfälligen Tasks
- Responsive Grid-Layout

## Installation

### 1. Datei hinzufügen
Die Datei `task-manager.js` wurde bereits im Verzeichnis erstellt:
```
Assets/js/task-manager.js
```

### 2. In index.html eingebunden
Das Script wurde bereits vor dem Cloudflare Analytics geladen:
```html
<script defer src="./Assets/js/task-manager.js"></script>
```

### 3. Button in "Mehr Aktionen" hinzugefügt
Im "Mehr Aktionen" Modal wurde der folgende Button hinzugefügt:
```html
<button class="btn btn-ghost" onclick="taskManager.openModal(); closeMoreActionsModal()">📋 Tasks</button>
```

## Verwendung

### Task öffnen
1. Klick auf Dashboard → "⋯ Mehr Aktionen" Button
2. Wähle "📋 Tasks"
3. Das Task Manager Modal öffnet sich

### Neue Task erstellen
1. Füll die **Task-Felder** aus:
   - **Titel** (erforderlich)
   - **Kategorie** (Standard: General)
   - **Priorität** (Standard: Mittel)
   - **Beschreibung** (optional)
   - **Fälligkeitsdatum** (optional)
2. Klick "➕ Task hinzufügen"

### Tasks filtern
Klick auf eine der Filter-Buttons:
- 📊 **Alle** - Zeige alle Tasks
- 📍 **Aktiv** - Nur unvollendete Tasks
- ✅ **Erledigt** - Nur abgeschlossene Tasks
- 💼 **Arbeit** - Nur Arbeits-Tasks
- 📚 **Lernen** - Nur Lern-Tasks

### Task vervollständigen
- Klick die **Checkbox** neben einer Task an/aus
- Die Task wird visuell durchgestrichen, wenn erledigt

### Subtasks verwalten
1. Klick "+ Sub" Button auf einer Task
2. Gib die Subtask ein und bestätige
3. Subtasks werden mit Fortschritt angezeigt (z.B. "2/5")
4. Toggle Subtasks einzeln oder lösche sie

### Task löschen
- Klick den "🗑️" Button auf einer Task

## Technische Details

### Speicherung
```javascript
localStorage Key: 'WORKLOG_TASKS_V1'
```

Alle Tasks werden automatisch in localStorage gespeichert. Die Daten bleiben erhalten, auch nach Browser-Neustart.

### Task-Struktur
```javascript
{
  id: "task_1234567890_abc123",
  title: "Task Name",
  description: "Beschreibung",
  category: "work",           // general|work|learning|project|personal
  priority: "medium",         // low|medium|high
  dueDate: "2026-02-10",
  completed: false,
  createdAt: "2026-02-03T...",
  updatedAt: "2026-02-03T...",
  subtasks: [
    {
      id: "sub_1234567890",
      title: "Subtask Name",
      completed: false
    }
  ]
}
```

### Wichtige Klassen & Methoden

| Methode | Beschreibung |
|---------|-------------|
| `createTask(data)` | Erstelle neue Task |
| `updateTask(taskId, updates)` | Update Task-Daten |
| `deleteTask(taskId)` | Lösche Task |
| `toggleTaskCompletion(taskId)` | Toggle Completion |
| `addSubtask(taskId, title)` | Subtask hinzufügen |
| `toggleSubtask(taskId, subId)` | Subtask Toggle |
| `openModal()` | Öffne Task Manager |
| `closeModal()` | Schließe Task Manager |
| `setFilter(filter)` | Setze aktiven Filter |

## Datenschutz & Speicherung

✅ **100% Lokal** - Keine Cloud, keine Server
✅ **Datenschutz** - Keine Übertragung von Daten
✅ **Offline-Ready** - Funktioniert komplett offline
✅ **Persistent** - Daten bleiben nach Browser-Neustart

## Browser-Kompatibilität

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Mobile Browser (iOS/Android)

## Keyboard Shortcuts (geplant für v1.1)
- `Ctrl/Cmd + K` - Task Manager öffnen
- `Ctrl/Cmd + N` - Neue Task
- `Escape` - Modal schließen

## Zukünftige Features (Roadmap)

- [ ] Drag & Drop zum Sortieren
- [ ] Tags/Labels
- [ ] Recurring Tasks
- [ ] Task-Notizen/Anhänge
- [ ] Export als PDF/CSV
- [ ] Cloud-Sync (optional)
- [ ] Keyboard Shortcuts
- [ ] Dark Mode (Auto-detect)
- [ ] Task-Statistiken Dashboard

## Troubleshooting

### Tasks werden nicht gespeichert
**Problem**: localStorage ist voll oder deaktiviert
**Lösung**: 
- Überprüfe Browser-Einstellungen
- Leere Cache und versuche erneut

### Modal öffnet sich nicht
**Problem**: Script nicht geladen
**Lösung**:
- Überprüfe Browser Console (F12 > Console)
- Stelle sicher, dass `task-manager.js` geladen wurde
- Hard-Refresh der Seite (Ctrl+Shift+R)

### Alte Tasks sind weg
**Problem**: localStorage wurde gelöscht
**Lösung**:
- Leider nicht rückgängig zu machen
- Nutze Backup & Restore Funktion des Dashboards

## Support

Für Fehler oder Feature-Requests, nutze bitte die Support-Sektion des Dashboards oder kontaktiere das Team.

---

**Version**: 1.0.0  
**Erstellt**: 3. Februar 2026  
**Letztes Update**: 3. Februar 2026
