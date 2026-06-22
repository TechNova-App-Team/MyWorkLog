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
            vacation:{total:30, used:0, usedManual:0, carriedOver:0, mode:'days'},
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
    let timer = { id:null, start:0, paused:0, running:false, log:[], breakTime: 0 };
    let editId = null;
    let isSidebarOpen = true;
    let selectedYearForView = new Date().getFullYear(); // Jahr für Jahresansicht

    let customModalCallback = null;