// ═══ CORE: STATE-CONFIG ═══
    // --- STATE & CONFIG ---
    let data = { 
        entries: [], 
        trash: [],
        customEntryTypes: [],  // NEW: User-defined entry types
        customFields: [],       // NEW: User-defined fields per type
        workflowRules: [],      // NEW: Conditional rules & automation
        untis: null,            // NEW: Untis integration data
        settings: { 
            name:'User', 
            theme:'#5578a8',
            themeMode: 'dark',
            hours:[0,8.75,8.75,8.75,8.75,4.5,0], 
            break:{thresh:6, min:[0, 15, 30, 30, 30, 30, 0]},
            vacation:{total:30, used:0, usedManual:0, carriedOver:0, mode:'days', carryOverMax:null, lastRolloverYear:null, yearHistory:{}},
            ihk: {
                start: '',
                end: '',
                exam_zwischen: '',
                note_zwischen: '',
                note_abschluss: ''
            },
            school: {
                grades: {
                    'Kernprozesse': [],
                    'Wirtschaftslehre': [],
                    'IT-Systeme': [],
                    'Deutsch/Kommunikation': [],
                }
            },
            goals: []
        } 
    };
    // Resilienter Loader: parst tg_pro_data und heilt bei Korruption automatisch aus dem
    // letzten gültigen Backup. Verhindert, dass ein einziger kaputter localStorage-Key die
    // gesamte App-Initialisierung wirft — Symptom war: App lädt Daten nicht, Hard-Reload
    // hilft nicht, nur Cloud-Reload/Neuanlage. Rückgabe: geparstes Objekt oder null (→ Default).
    function loadPersistedData() {
        const raw = localStorage.getItem('tg_pro_data');
        if (!raw) return null; // frischer Start — Default-data bleibt bestehen

        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('❌ tg_pro_data ist beschädigt — versuche Auto-Recovery aus Backup:', e);
        }

        // Korruption: neuestes gültiges Backup suchen (Array chronologisch, neuestes zuletzt)
        try {
            const backups = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]');
            for (let i = backups.length - 1; i >= 0; i--) {
                const snap = backups[i];
                if (snap && snap.data && Array.isArray(snap.data.entries)) {
                    // Kaputten Key mit dem Backup heilen, damit der nächste Reload wieder sauber lädt
                    try { localStorage.setItem('tg_pro_data', JSON.stringify(snap.data)); } catch (_) {}
                    window._mwlRecoveredFromBackup = snap.ts ? new Date(snap.ts).toLocaleString(mwlLocale()) : 'unbekannt';
                    console.warn('✅ Daten aus lokalem Backup wiederhergestellt (Stand: ' + window._mwlRecoveredFromBackup + ')');
                    return snap.data;
                }
            }
        } catch (e2) {
            console.error('❌ Backup-Recovery fehlgeschlagen:', e2);
        }

        // Nichts wiederherstellbar: kaputten Key NICHT überschreiben (User kann noch aus der
        // Cloud laden), aber App startet mit Default statt zu crashen.
        window._mwlDataCorrupted = true;
        return null;
    }

    let timer = { id:null, start:0, paused:0, running:false, log:[], breakTime: 0 };
    let editId = null;
    let isSidebarOpen = true;
    let selectedYearForView = new Date().getFullYear(); // Jahr für Jahresansicht

    let customModalCallback = null;