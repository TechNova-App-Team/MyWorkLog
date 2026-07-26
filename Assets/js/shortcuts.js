// ============================================
// SHORTCUTS CONFIGURATION SYSTEM
// ============================================

// ─────────────────────────────────────────────────────────────
// EINE Quelle der Wahrheit für ALLE globalen keydown-Handler.
// Default ist AUS — nur ein explizites `true` schaltet Kürzel ein.
// Jeder globale Handler im Projekt MUSS das hier abfragen:
//   ShortcutManager (hier) · S/P/E + Ctrl+Enter (app-startup.js)
//   Ctrl+K (navbar-sidebar.js) · Ctrl+B (sidebar.js) · Ctrl+Shift+K (extra.js)
// `data` ist ein globales `let` aus state-config.js (nicht auf window),
// deshalb try/catch: vor dessen Initialisierung wirft schon der Zugriff (TDZ).
// ─────────────────────────────────────────────────────────────
function shortcutsEnabled() {
    try {
        return !!(data && data.settings && data.settings.shortcutsEnabled === true);
    } catch (e) {
        return false; // noch nicht geladen → im Zweifel aus
    }
}
window.shortcutsEnabled = shortcutsEnabled;

// Fallback für Shortcuts aus localStorage, die noch kein `allowInInput`-Flag tragen
const DEFAULT_ALLOW_IN_INPUT = ['data.save', 'search.open', 'ghost.toggle'];

const defaultShortcuts = {
    // TIMER CONTROL
    'timer.toggle': {
        name: 'Timer starten/pausieren',
        category: 'Timer',
        keys: ['ctrl', 'space'],
        action: 'toggleTimer'
    },
    'timer.stop': {
        name: 'Timer stoppen & speichern',
        category: 'Timer',
        keys: ['ctrl', 'shift', 'space'],
        action: 'stopTimerAndSave'
    },
    'timer.reset': {
        name: 'Timer zurücksetzen',
        category: 'Timer',
        keys: ['ctrl', 'r'],
        action: 'resetTimer'
    },
    
    // ENTRY MANAGEMENT
    'entry.add': {
        name: 'Neuer Eintrag',
        category: 'Einträge',
        keys: ['ctrl', 'n'],
        action: 'addNewEntry'
    },
    'entry.delete': {
        name: 'Aktuellen Eintrag löschen',
        category: 'Einträge',
        keys: ['delete'],
        action: 'deleteCurrentEntry'
    },
    'entry.edit': {
        name: 'Eintrag bearbeiten',
        category: 'Einträge',
        keys: ['ctrl', 'e'],
        action: 'editCurrentEntry'
    },
    
    // NAVIGATION
    'nav.dashboard': {
        name: 'Zum Dashboard',
        category: 'Navigation',
        keys: ['ctrl', '1'],
        action: 'switchTab',
        args: ['dashboard']
    },
    'nav.timer': {
        name: 'Zum Timer',
        category: 'Navigation',
        keys: ['ctrl', '2'],
        action: 'switchTab',
        args: ['timer']
    },
    'nav.history': {
        name: 'Zur Chronik',
        category: 'Navigation',
        keys: ['ctrl', '3'],
        action: 'switchTab',
        args: ['history']
    },
    'nav.analytics': {
        name: 'Zu Analysen',
        category: 'Navigation',
        keys: ['ctrl', '4'],
        action: 'switchTab',
        args: ['analytics']
    },
    'nav.settings': {
        name: 'Zu Einstellungen',
        category: 'Navigation',
        keys: ['ctrl', '5'],
        action: 'switchTab',
        args: ['settings']
    },
    'nav.toggle-sidebar': {
        name: 'Sidebar umschalten',
        category: 'Navigation',
        keys: ['alt', 's'],
        action: 'toggleSidebar'
    },
    
    // DATA MANAGEMENT
    'data.save': {
        name: 'Speichern',
        category: 'Daten',
        keys: ['ctrl', 's'],
        action: 'save',
        allowInInput: true
    },
    'data.export': {
        name: 'Daten exportieren (JSON)',
        category: 'Daten',
        keys: ['ctrl', 'alt', 'e'],
        action: 'exportData',
        args: ['json']
    },
    'data.import': {
        name: 'Daten importieren',
        category: 'Daten',
        keys: ['ctrl', 'alt', 'i'],
        action: 'importData'
    },
    
    // SEARCH / FILTER
    'search.open': {
        name: 'Suche öffnen',
        category: 'Suche',
        keys: ['ctrl', 'f'],
        action: 'openSearch',
        allowInInput: true
    },

    // GHOST MODE
    'ghost.toggle': {
        name: 'Ghost Mode',
        category: 'Stealth',
        keys: ['ctrl', 'shift', 'k'],
        action: 'toggleGhostMode',
        allowInInput: true
    }
};

class ShortcutManager {
    constructor() {
        this.shortcuts = this.loadShortcuts();
        this.enabled = true;
        this.conflictWarnings = [];
        this.setupEventListeners();
    }

    loadShortcuts() {
        const saved = localStorage.getItem('tg_shortcuts');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Fehler beim Laden der Shortcuts:', e);
            }
        }
        return JSON.parse(JSON.stringify(defaultShortcuts));
    }

    saveShortcuts() {
        localStorage.setItem('tg_shortcuts', JSON.stringify(this.shortcuts));
    }

    resetToDefaults() {
        this.shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
        this.saveShortcuts();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    handleKeyPress(event) {
        if (!this.enabled) return;
        // Master-Schalter aus den Settings. Ohne das feuerte hier JEDER Ctrl-Shortcut
        // (Ctrl+R, Ctrl+F, Ctrl+S, Ctrl+1…5, Delete) weiter, obwohl der Toggle aus war.
        if (!shortcutsEnabled()) return;

        // Finde den passenden Shortcut
        const match = Object.entries(this.shortcuts).find(([_, sc]) =>
            Array.isArray(sc.keys) && this.keysMatch(event, sc.keys)
        );
        if (!match) return;

        const [id, shortcut] = match;

        // In Eingabefeldern nur, was ausdrücklich freigegeben ist. Explizite
        // User-Wahl schlägt die Default-Liste (Checkbox im Shortcut-Editor).
        const tag = (event.target && event.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') {
            const allowed = (typeof shortcut.allowInInput === 'boolean')
                ? shortcut.allowInInput
                : DEFAULT_ALLOW_IN_INPUT.includes(id);
            if (!allowed) return;
        }

        event.preventDefault();
        this.executeAction(id, shortcut);
    }

    keysMatch(event, keys) {
        const pressedKeys = [];
        
        if (event.ctrlKey) pressedKeys.push('ctrl');
        if (event.altKey) pressedKeys.push('alt');
        if (event.shiftKey) pressedKeys.push('shift');
        
        // Spezielle Tasten
        const specialKeys = {
            ' ': 'space',
            'Delete': 'delete',
            'Enter': 'enter',
            'Escape': 'escape',
            'Tab': 'tab'
        };
        
        const lastKey = specialKeys[event.key] || event.key.toLowerCase();
        if (lastKey !== 'ctrl' && lastKey !== 'alt' && lastKey !== 'shift') {
            pressedKeys.push(lastKey);
        }

        // Vergleiche
        return pressedKeys.length === keys.length && 
               pressedKeys.every(k => keys.includes(k)) && 
               keys.every(k => pressedKeys.includes(k));
    }

    executeAction(id, shortcut) {
        try {
            const action = window[shortcut.action];
            if (typeof action === 'function') {
                if (shortcut.args) {
                    action(...shortcut.args);
                } else {
                    action();
                }
                this.showFeedback(shortcut.name);
            } else {
                console.warn(`Action "${shortcut.action}" nicht gefunden`);
            }
        } catch (e) {
            console.error(`Fehler beim Ausführen von "${shortcut.action}":`, e);
        }
    }

    showFeedback(name) {
        // Optional: Kurze visuelle Rückmeldung
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(var(--primary-rgb), 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 9999;
            pointer-events: none;
            animation: fadeOut 1s ease-out forwards;
            animation-delay: 0.5s;
        `;
        feedback.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M10 14h4"/></svg><span></span>';
        feedback.querySelector('span').textContent = name;
        document.body.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 1500);
    }

    getShortcutDisplay(keys) {
        return keys.map(k => {
            const keyMap = {
                'ctrl': 'Ctrl',
                'alt': 'Alt',
                'shift': 'Shift',
                'space': 'Space',
                'delete': 'Del',
                'enter': 'Enter',
                'escape': 'Esc'
            };
            return keyMap[k] || k.toUpperCase();
        }).join(' + ');
    }

    checkConflicts() {
        const conflicts = [];
        const keyMap = {};

        for (const [id, shortcut] of Object.entries(this.shortcuts)) {
            const keyStr = shortcut.keys.sort().join('+');
            if (keyMap[keyStr]) {
                conflicts.push({
                    key: keyStr,
                    shortcuts: [keyMap[keyStr], id]
                });
            }
            keyMap[keyStr] = id;
        }

        return conflicts;
    }

    updateShortcut(id, newKeys) {
        if (!this.shortcuts[id]) return false;
        
        this.shortcuts[id].keys = newKeys;
        
        // Prüfe auf Konflikte
        const conflicts = this.checkConflicts();
        if (conflicts.length > 0) {
            console.warn('Shortcut-Konflikte erkannt:', conflicts);
            return { success: true, conflicts };
        }
        
        this.saveShortcuts();
        return { success: true };
    }

    disable() {
        this.enabled = false;
    }

    enable() {
        this.enabled = true;
    }
}

// Globale Instanz
let shortcutManager = null;

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    shortcutManager = new ShortcutManager();
});

// ============================================
// HILFSFUNKTIONEN FÜR SHORTCUTS
// ============================================

function toggleTimer() {
    // Rufe die Start-Action auf (wechselt zwischen Start und Pause)
    timerAction('start');
}

function stopTimerAndSave() {
    // Rufe die Stop-Action auf
    timerAction('stop');
}

function resetTimer() {
    if (confirm('Timer wirklich zurücksetzen?')) {
        if (window.timer) {
            timer.running = false;
            timer.paused = 0;
            timer.start = 0;
            timer.log = [];
            timer.breakTime = 0;
            saveTimerState();
            updateUI();
        }
    }
}

function addNewEntry() {
    // Wechsle zum Timer-Tab und fokus auf Datumsfeld
    switchTab('timer');
    setTimeout(() => {
        const dateInput = document.getElementById('inpDate');
        if (dateInput) dateInput.focus();
    }, 100);
}

function deleteCurrentEntry() {
    // Markiere den letzten Eintrag zum Löschen
    const entries = document.querySelectorAll('.entry-row');
    if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        const deleteBtn = lastEntry.querySelector('[onclick*="delEntry"]');
        if (deleteBtn) deleteBtn.click();
    }
}

function editCurrentEntry() {
    // Markiere den letzten Eintrag zum Bearbeiten
    const entries = document.querySelectorAll('.entry-row');
    if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        const editBtn = lastEntry.querySelector('[onclick*="editEntry"]');
        if (editBtn) editBtn.click();
    }
}

function openSearch() {
    // Placeholder für Suchfunktion
    const searchEl = document.getElementById('searchInput');
    if (searchEl) {
        searchEl.focus();
    } else {
        console.log('Suchfeld nicht verfügbar');
    }
}

// Styling für die Shortcut-Rückmeldung
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
        }
    }
`;
document.head.appendChild(style);
