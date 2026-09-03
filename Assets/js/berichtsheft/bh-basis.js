// ═══ BH-BASIS ═══
// Sprach-Helfer L(), Speicher-Schluessel, gemeinsamer Zustand,
// Wortlisten der lokalen Vorschlags-Engine (AI_BRAIN) und die Vorlagen.
// Muss ZUERST laden: reports/editingId/currentMode sind let-Bindungen im
// Skript-Scope, die alle folgenden Dateien lesen.
// Herausgeloest aus pages/berichtsheft/index.html.

/* ═══════════════════════════════════════════════════════════
           BERICHTSHEFT ENGINE v2.0 — Premium JavaScript
           ═══════════════════════════════════════════════════════════ */

// Sprach-Helper für JS-generierten Text. Die statische i18n-Pipeline erfasst nur
// Text, der im HTML steht — zur Laufzeit gebaute Sätze (mit Zahlen drin) muss der
// Code selbst umschalten. i18n-runtime.js matcht nur exakte, feste Strings.
function L(de, en) { return document.documentElement.lang === 'en' ? en : de; }

// ===== CONSTANTS & STATE =====
const STORAGE_KEY = 'berichtsheft_reports';
const THEME_KEY = 'berichtsheft_theme';
const AUTOSAVE_KEY = 'berichtsheft_draft';
const MODE_KEY = 'berichtsheft_mode';
let reports = [];
let editingId = null;
let bulkMode = false;
let selectedIds = new Set();
let autoSaveTimer = null;
let currentMode = localStorage.getItem(MODE_KEY) || 'daily'; // IHK default
let activeDailyField = null; // currently focused daily textarea
let aiUsedChips = new Set();

// ===== AI BRAIN — Generative Local Intelligence =====
// Keine API, keine Tokens. Echtes kombinatorisches Denken.
// Erkennt JEDEN Beruf, generiert dynamische Sätze, lernt aus History.

const AI_BRAIN = {
    // === PROFESSION DETECTION: Keywords → Berufskategorie ===
    professions: {
        'software': { verbs: ['entwickeln', 'implementieren', 'testen', 'debuggen', 'deployen', 'refactoren', 'dokumentieren', 'reviewen', 'optimieren', 'automatisieren'], objects: ['Webanwendung', 'REST-API', 'Datenbank-Modul', 'Frontend-Komponente', 'Backend-Service', 'Unit-Tests', 'Microservice', 'UI-Feature', 'Schnittstelle', 'Algorithmus', 'Login-System', 'Dashboard', 'CI/CD-Pipeline', 'Docker-Container', 'Serverless-Funktion'], tools: ['Git', 'VS Code', 'Docker', 'Jira', 'Jenkins', 'React', 'Node.js', 'Python', 'TypeScript', 'SQL', 'MongoDB', 'Kubernetes', 'Postman', 'Figma'], keywords: ['it', 'entwickl', 'programm', 'software', 'web', 'dev', 'coder', 'fullstack', 'frontend', 'backend', 'app', 'fachinformatik', 'anwendung'] },

        'sysadmin': { verbs: ['konfigurieren', 'installieren', 'warten', 'überwachen', 'administrieren', 'sichern', 'patchen', 'troubleshooten', 'migrieren', 'automatisieren'], objects: ['Server', 'Netzwerk', 'Firewall', 'Active Directory', 'Backup-System', 'VPN-Tunnel', 'DHCP/DNS-Dienst', 'Virtualisierungs-Cluster', 'Storage-System', 'Mail-Server', 'Monitoring-System', 'WLAN-Infrastruktur', 'Client-PCs', 'Druckerumgebung'], tools: ['PowerShell', 'Bash', 'VMware', 'Hyper-V', 'Azure', 'AWS', 'Nagios', 'Zabbix', 'Windows Server', 'Linux', 'pfSense', 'Ansible'], keywords: ['system', 'admin', 'netzwerk', 'infrastruktur', 'server', 'support', 'helpdesk', 'systemintegr'] },

        'kaufmann': { verbs: ['bearbeiten', 'prüfen', 'verbuchen', 'erstellen', 'pflegen', 'koordinieren', 'kalkulieren', 'archivieren', 'abgleichen', 'kommunizieren'], objects: ['Rechnungen', 'Aufträge', 'Kundenanfragen', 'Angebote', 'Buchhaltungsbelege', 'Personalakten', 'Lieferscheine', 'Stammdaten', 'Monatsbericht', 'Kostenrechnung', 'Bestellungen', 'Gesprächsprotokoll', 'Präsentation'], tools: ['SAP', 'DATEV', 'Lexware', 'Excel', 'ERP-System', 'CRM-System', 'Outlook', 'Word', 'Teams', 'SharePoint'], keywords: ['kaufm', 'buch', 'büro', 'verwalt', 'office', 'personal', 'handel', 'bank', 'versicher', 'finanz', 'steuer', 'industrie', 'logistik', 'einkauf', 'vertrieb', 'lager', 'spedition'] },

        'handwerk_bau': { verbs: ['mauern', 'betonieren', 'verputzen', 'verlegen', 'montieren', 'messen', 'schneiden', 'schleifen', 'abdichten', 'verschalen', 'transportieren', 'einrichten', 'sichern', 'abreißen', 'fundamentieren'], objects: ['Backsteinmauer', 'Fundament', 'Deckenplatte', 'Estrichboden', 'Treppenanlage', 'Schalungssystem', 'Bewehrungskorb', 'Drainageystem', 'Mauerwerk', 'Fassade', 'Innenputz', 'Außenwand', 'Stützpfeiler', 'Fensterbänke', 'Bodenplatte'], tools: ['Wasserwaage', 'Kelle', 'Mischmaschine', 'Rüttler', 'Nivelliergerät', 'Betonmischer', 'Kreissäge', 'Flex', 'Bohrmaschine', 'Bauplan'], keywords: ['mauer', 'bau', 'beton', 'hochbau', 'tiefbau', 'zimmerer', 'zimmermann', 'dachdecker', 'gerüstbau', 'straßenbau', 'pflaster', 'fliesenleger', 'fliesen', 'estrich', 'trockenbau', 'stuckateur'] },

        'handwerk_holz': { verbs: ['sägen', 'hobeln', 'fräsen', 'schleifen', 'leimen', 'montieren', 'konstruieren', 'furnieren', 'lackieren', 'messen', 'zeichnen', 'zusammenbauen'], objects: ['Möbelstück', 'Türrahmen', 'Fensterrahmen', 'Schranksystem', 'Tischplatte', 'Holztreppe', 'Einbauküche', 'Regalwand', 'Werkstück', 'Dachstuhl', 'Holzverbindung', 'Innenausbau'], tools: ['Kreissäge', 'Oberfräse', 'Bandschleifer', 'CNC-Fräse', 'Hobelmaschine', 'Stechbeitel', 'Winkelschleifer', 'CAD-Software'], keywords: ['tischler', 'schreiner', 'holz', 'möbel', 'zimmerei'] },

        'elektro': { verbs: ['installieren', 'verdrahten', 'prüfen', 'messen', 'programmieren', 'inbetriebnehmen', 'warten', 'reparieren', 'konfigurieren', 'dokumentieren', 'planen'], objects: ['Schaltschrank', 'Elektroverteiler', 'Beleuchtungsanlage', 'Steckdosen/Schalter', 'SPS-Steuerung', 'Kabeltrasse', 'Sicherungskasten', 'Brandmeldeanlage', 'Sprechanlage', 'Photovoltaikanlage', 'Ladestation', 'Bustechnologie (KNX)'], tools: ['Multimeter', 'Oszilloskop', 'Installationstester', 'SPS (Siemens)', 'EPLAN', 'CAD', 'ETS-Software', 'Crimpzange', 'Abisolierwerkzeug'], keywords: ['elektr', 'elektronik', 'mechatronik', 'strom', 'energie', 'anlagenmechanik'] },

        'gastronomie': { verbs: ['zubereiten', 'kochen', 'backen', 'anrichten', 'dekorieren', 'portionieren', 'einlagern', 'kontrollieren', 'reinigen', 'bestellen', 'servieren', 'beraten', 'kalkulieren'], objects: ['Vorspeisen', 'Hauptgerichte', 'Desserts', 'Brotteig', 'Feingebäck', 'Tortenkreation', 'Sauerteig', 'Brötchensortiment', 'Pralinenserie', 'Konditorei-Spezialität', 'Menüfolge', 'Buffet-Aufbau', 'Mise en Place', 'Saucen-Fond', 'Vorratsbestand'], tools: ['Konvektomat', 'Teigknetmaschine', 'Rührmaschine', 'Gärschrank', 'Friteuse', 'Thermometer', 'Waage', 'Spritzbeutel', 'Backofen', 'Salamander', 'Vakuumierer'], keywords: ['koch', 'bäck', 'konditor', 'gastro', 'küche', 'restaurant', 'hotel', 'catering', 'fleisch', 'metzger', 'fachverkäufer'] },

        'pflege': { verbs: ['pflegen', 'betreuen', 'dokumentieren', 'assistieren', 'mobilisieren', 'messen', 'verabreichen', 'beraten', 'begleiten', 'überwachen', 'anleiten', 'versorgen', 'lagern'], objects: ['Patient/in', 'Vitalzeichen', 'Wundversorgung', 'Medikamente', 'Pflegeplanung', 'Körperpflege', 'Mobilisation', 'Ernährungsplan', 'Inkontinenzversorgung', 'Verbandswechsel', 'Lagerungshilfe', 'Pflegedokumentation'], tools: ['Blutdruckmessgerät', 'Blutzuckermessgerät', 'Rollator', 'Pflegebett', 'Dokumentationssoftware', 'Desinfektionsmittel', 'Pulsoximeter', 'Stethoskop'], keywords: ['pflege', 'kranken', 'alten', 'gesundheit', 'arzthelf', 'medizin', 'mfa', 'zahnmedizin', 'zfa', 'labor', 'pharma', 'apothek', 'therapeut', 'ergo', 'physio'] },

        'kfz': { verbs: ['diagnostizieren', 'reparieren', 'warten', 'prüfen', 'austauschen', 'einstellen', 'montieren', 'programmieren', 'auslesen', 'lackieren', 'schweißen', 'vermessen'], objects: ['Bremsanlage', 'Motorsteuerung', 'Fahrwerk', 'Klimaanlage', 'Getriebe', 'Abgasanlage', 'Beleuchtungssystem', 'Reifen/Räder', 'Ölwechsel', 'Inspektion', 'AU/HU-Vorbereitung', 'Karosserie-Teil', 'Steuergerät', 'Batterie/Akku'], tools: ['OBD-Diagnosetester', 'Hebebühne', 'Drehmomentschlüssel', 'Achsvermessungsgerät', 'Schaltplan', 'Oszilloskop', 'Schweißgerät', 'Lackierkabine'], keywords: ['kfz', 'auto', 'fahrzeug', 'werkstatt', 'mechatronik', 'karosserie', 'lackier', 'zweirad', 'motorrad'] },

        'friseur': { verbs: ['schneiden', 'färben', 'föhnen', 'beraten', 'waschen', 'stylen', 'pflegen', 'hochstecken', 'ondulieren', 'rasieren', 'tönen', 'blondieren'], objects: ['Damenhaarschnitt', 'Herrenhaarschnitt', 'Colorations-Technik', 'Balayage', 'Dauerwelle', 'Hochsteckfrisur', 'Bartpflege', 'Haarpflege-Behandlung', 'Strähnen-Technik', 'Kinderhaarschnitt', 'Brautfrisur'], tools: ['Haarschneidemaschine', 'Schere', 'Effilier-Schere', 'Föhn', 'Glätteisen', 'Lockenstab', 'Farbtabelle', 'Alufolie', 'Papilloten'], keywords: ['friseur', 'frisör', 'hair', 'salon', 'kosmetik', 'beauty', 'coiffeur'] },

        'einzelhandel': { verbs: ['beraten', 'verkaufen', 'kassieren', 'einräumen', 'dekorieren', 'bestellen', 'kontrollieren', 'präsentieren', 'inventurisieren', 'reklamieren', 'etikettieren', 'umtauschen'], objects: ['Wareneingang', 'Schaufensterdekoration', 'Kassenabrechnung', 'Kundenberatung', 'Reklamation', 'Warenbestellung', 'Lagerbestand', 'Preisauszeichnung', 'Produktpräsentation', 'Inventurliste', 'Sonderaktion'], tools: ['Kassensystem', 'Warenwirtschaftssystem', 'Scanner', 'Preisauszeichner', 'POS-Terminal'], keywords: ['einzelhandel', 'verkauf', 'drogist', 'buchhändl', 'florist', 'augenoptik', 'uhrmacher', 'juwelier', 'textil', 'schuh', 'sport', 'lebensmittel', 'discounter'] },

        'lager': { verbs: ['kommissionieren', 'einlagern', 'auslagern', 'verpacken', 'verladen', 'scannen', 'kontrollieren', 'inventarisieren', 'transportieren', 'sortieren', 'buchen'], objects: ['Wareneingang', 'Warenausgang', 'Lieferung', 'Palette', 'Sendung', 'Kommissionierauftrag', 'Retourenbearbeitung', 'Bestandsliste', 'Versandpapiere', 'Gefahrgut-Ladung'], tools: ['Gabelstapler', 'Ameise', 'Handscanner', 'SAP WMS', 'Lagerverwaltungssystem', 'Verpackungsmaschine', 'Etikettendrucker'], keywords: ['lager', 'fachlager', 'logistik', 'spedition', 'kommission', 'versand', 'fachkraft lager'] },

        'medien': { verbs: ['gestalten', 'entwerfen', 'layouten', 'bearbeiten', 'animieren', 'schneiden', 'retouchieren', 'exportieren', 'drucken', 'präsentieren', 'konzipieren'], objects: ['Printlayout', 'Social-Media-Grafik', 'Webdesign-Mockup', 'Video-Clip', 'Banner-Animation', 'Firmenlogo', 'Broschüre', 'Flyer', 'Corporate-Design-Manual', 'Druckauftrag', 'E-Mail-Template', 'Bildbearbeitung'], tools: ['Photoshop', 'InDesign', 'Illustrator', 'Figma', 'Premiere Pro', 'After Effects', 'Canva', 'Blender', 'Sketch'], keywords: ['medien', 'design', 'grafik', 'kreativ', 'druck', 'foto', 'video', 'film', 'veranstaltungstechnik'] },

        'garten': { verbs: ['pflanzen', 'schneiden', 'mähen', 'pflegen', 'gestalten', 'bewässern', 'mulchen', 'düngen', 'jäten', 'vermessen', 'pflastern', 'ausheben', 'roden'], objects: ['Rasenfläche', 'Hecke', 'Beet', 'Baumbestand', 'Pflasterweg', 'Teichanlage', 'Gewächshaus', 'Blumen-Arrangement', 'Grabpflege', 'Sträucher', 'Staudenbeet', 'Rollrasen'], tools: ['Motorsäge', 'Heckenschere', 'Rasenmäher', 'Freischneider', 'Minibagger', 'Rüttelplatte', 'Gießwagen', 'Pflanzentransporter'], keywords: ['garten', 'gärtner', 'landschaft', 'grünpflege', 'friedhof', 'florist', 'blumen', 'baumschul'] },

        'metall': { verbs: ['drehen', 'fräsen', 'bohren', 'schweißen', 'schleifen', 'biegen', 'stanzen', 'programmieren', 'messen', 'montieren', 'entgraten', 'härten'], objects: ['Werkstück', 'CNC-Drehteil', 'Fräsbauteil', 'Schweißkonstruktion', 'Blechzuschnitt', 'Gewindebohrung', 'Passbohrung', 'Metallrahmen', 'Edelstahlgehäuse', 'Rohrkonstruktion', 'Prototyp', 'Serienbauteil'], tools: ['CNC-Drehmaschine', 'CNC-Fräse', 'Schweißgerät (MAG/WIG)', 'Messschieber', 'Bügelmessschraube', 'Höhenreißer', 'Abkantpresse', 'Bandsäge', 'CAD/CAM-Software'], keywords: ['metall', 'industrie mechanik', 'zerspanung', 'werkzeugmech', 'konstruktion', 'schlosser', 'stahlbau', 'maschinen', 'cnc', 'dreh'] },

        'chemie': { verbs: ['analysieren', 'mischen', 'prüfen', 'messen', 'destillieren', 'filtrieren', 'dokumentieren', 'kalibrieren', 'titrieren', 'synthetisieren'], objects: ['Probe', 'Lösung', 'Reaktionsgemisch', 'Analyseergebnis', 'Versuchsreihe', 'Prüfprotokoll', 'Reinheitsgrad', 'Produktionsbatch', 'Stoffgemisch', 'Kalibrierlösung'], tools: ['Photometer', 'pH-Meter', 'Analysenwaage', 'Gaschromatograph', 'HPLC', 'Titriergerät', 'Laborjob-Software', 'Pipette', 'Autoklav'], keywords: ['chemie', 'labor', 'chemikant', 'pharmakant', 'lack', 'farbe', 'verfahrensmech', 'kunststoff', 'biologie'] },
    },

    // === UNIVERSAL VERBS (work for any profession) ===
    universalVerbs: ['durchführen', 'erledigen', 'bearbeiten', 'vorbereiten', 'nachbereiten', 'organisieren', 'kontrollieren', 'dokumentieren', 'besprechen', 'unterstützen', 'überprüfen', 'koordinieren', 'planen', 'fertigstellen', 'optimieren'],

    // === UNIVERSAL CONTEXTS (added to any profession) ===
    universalActivities: [
        'Arbeitsplatz eingerichtet und Materialien vorbereitet',
        'Werkzeug und Arbeitsmittel auf Funktion geprüft',
        'Arbeitsauftrag vom Ausbilder entgegengenommen und besprochen',
        'Sicherheitsunterweisung durchgeführt/teilgenommen',
        'Arbeitsmaterialien bestellt bzw. nachgefüllt',
        'Arbeitsbereich aufgeräumt und gereinigt',
        'Dokumentation der heutigen Tätigkeiten angefertigt',
        'Feedback-Gespräch mit Ausbilder/in geführt',
        'Kolleg/innen bei Aufgaben unterstützt',
        'Neues Themengebiet selbstständig eingearbeitet',
        'An Team-Besprechung / Meeting teilgenommen',
        'Qualitätskontrolle durchgeführt',
        'Kundenkontakt: Anfrage bearbeitet/beraten',
        'Berufsschulstoff nachbereitet und zusammengefasst',
        'Prüfungsvorbereitung: Übungsaufgaben bearbeitet',
    ],

    // === SENTENCE TEMPLATES (slots: {V}=verb, {O}=object, {T}=tool, {D}=detail) ===
    templates: [
        '• {O} {V} und dokumentiert',
        '• {V}: {O} für aktuelles Projekt',
        '• {O} mithilfe von {T} {V}',
        '• Anleitung erhalten: {O} fachgerecht {V}',
        '• Selbstständig {O} {V}',
        '• {O} — Ergebnis mit Ausbilder besprochen',
        '• Im Team: {O} {V} und geprüft',
        '• {V} von {O} nach Arbeitsanweisung',
        '• Qualitätskontrolle: {O} überprüft und nachgebessert',
        '• Neues gelernt: {O} {V} (Erstanwendung)',
        '• Fehler bei {O} identifiziert und behoben',
        '• {O} nach Zeichnung/Plan {V}',
        '• {T} eingesetzt um {O} zu {V}',
    ],

    // === DETAIL/QUALIFIER POOLS ===
    details: [
        'nach Vorgabe', 'selbstständig', 'unter Anleitung', 'im Team', 'nach DIN-Norm',
        'nach Kundenwunsch', 'nach Arbeitsanweisung', 'gemeinsam mit Kollegen', 'termingerecht', 'fachgerecht',
        'nach Sicherheitsvorschriften', 'nach technischer Zeichnung', 'nach Hygienevorschriften',
    ],
};

// ===== TEMPLATES =====
const templates = [
    {
        id: 'it-dev',
        name: 'IT-Entwicklung',
        icon: '<svg class="icon"><use href="#i-wrench" /></svg>',
        description: 'Für Fachinformatiker Anwendungsentwicklung',
        content: `• Entwicklung und Implementierung von Software-Komponenten
• Code-Review und Qualitätssicherung
• Debugging und Fehlerbehebung
• Dokumentation der Entwicklungsprozesse
• Teilnahme an Team-Meetings und Planungen
• Unit-Tests erstellt und durchgeführt`
    },
    {
        id: 'it-admin',
        name: 'IT-Systemadministration',
        icon: '<svg class="icon"><use href="#i-gear" /></svg>',
        description: 'Für Fachinformatiker Systemintegration',
        content: `• Wartung und Administration von IT-Systemen
• Benutzer- und Rechteverwaltung
• Installation und Konfiguration von Software
• Netzwerk-Monitoring und Troubleshooting
• Erstellung von technischen Dokumentationen
• Backup-Systeme überprüft und gewartet`
    },
    {
        id: 'business',
        name: 'Kaufmännisch',
        icon: '<svg class="icon"><use href="#i-chart" /></svg>',
        description: 'Für kaufmännische Berufe',
        content: `• Bearbeitung von Geschäftsvorfällen
• Kundenkommunikation und -betreuung
• Erstellung von Angeboten und Rechnungen
• Büroorganisation und Verwaltung
• Mitarbeit an Projekten und Präsentationen
• Datenerfassung und Pflege im ERP-System`
    },
    {
        id: 'design',
        name: 'Mediengestaltung',
        icon: '<svg class="icon"><use href="#i-pen" /></svg>',
        description: 'Für Mediengestalter',
        content: `• Konzeption und Gestaltung von Medienprodukten
• Bildbearbeitung und Layout-Erstellung
• Abstimmung mit Kunden und Kollegen
• Qualitätsprüfung und Korrekturschleifen
• Recherche und Trend-Analyse
• Reinzeichnung und Druckvorbereitung`
    },
    {
        id: 'data',
        name: 'Daten & KI',
        icon: '<svg class="icon"><use href="#i-sparkles" /></svg>',
        description: 'Für Fachinformatiker Daten & Prozesse',
        content: `• Analyse und Aufbereitung von Datensätzen
• Entwicklung und Training von ML-Modellen
• Datenbankabfragen und -optimierung
• Prozessanalyse und Automatisierung
• Erstellung von Dashboards und Reportings
• Qualitätssicherung der Datenbestände`
    }
];
