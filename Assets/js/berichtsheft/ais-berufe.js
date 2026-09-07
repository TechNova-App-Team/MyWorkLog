// ═══ AIS-BERUFE ═══
// Nachschlagewerk des Generators: 20 Berufe mit Verben, Objekten, Werkzeugen und
// Schulfaechern, dazu Jahreszeiten und Themen-Pools. Reine Daten, kein Zustand.
//
// Wer einen Beruf ergaenzt, muss JEDES neue Objekt in OBJ_GENUS (ais-sprache.js)
// eintragen — sonst steht der Satz ohne Artikel da ("Ich habe Bremsanlage
// geprueft"). tools/berichtsheft-formen.test.mjs faellt genau darueber durch.
// Herausgeloest aus pages/berichtsheft/index.html.

window.AIS_BERUFE = (function () {
'use strict';

// ═══════════════════════════════════════
// PROFESSION DATABASE — 20+ Berufe mit Deep Knowledge
// ═══════════════════════════════════════

const PROFESSIONS = {
    software: {
        id: 'software', icon: '<svg class="icon"><use href="#i-code"/></svg>', name: 'Fachinformatiker AE',
        category: 'IT',
        verbs: ['entwickeln', 'implementieren', 'testen', 'debuggen', 'deployen', 'refactoren', 'dokumentieren', 'reviewen', 'optimieren', 'automatisieren', 'migrieren', 'analysieren', 'konzipieren', 'programmieren', 'integrieren'],
        objects: ['Webanwendung', 'REST-API', 'Datenbankmodul', 'Frontend-Komponente', 'Backend-Service', 'Unit-Tests', 'Microservice', 'UI-Feature', 'Schnittstelle', 'Algorithmus', 'Login-System', 'Dashboard-Widget', 'CI/CD-Pipeline', 'Docker-Container', 'Serverless-Funktion', 'GraphQL-Endpoint', 'Websocket-Handler', 'Caching-Layer', 'ORM-Modell', 'Middleware', 'Auth-Service', 'Webhook-Integration', 'Batch-Prozess', 'Responsive Layout', 'PWA-Feature'],
        tools: ['Git', 'VS Code', 'Docker', 'Jira', 'Jenkins', 'React', 'Node.js', 'Python', 'TypeScript', 'SQL', 'MongoDB', 'Kubernetes', 'Postman', 'Figma', 'GitHub Actions', 'Webpack', 'ESLint', 'Jest', 'PostgreSQL', 'Redis'],
        departments: ['Softwareentwicklung', 'Web-Entwicklung', 'App-Entwicklung', 'Backend-Team', 'Frontend-Team', 'DevOps', 'QA-Abteilung'],
        yearTasks: {
            1: ['Grundlagen der Programmierung erlernt', 'Einfache Skripte geschrieben', 'Versionskontrolle mit Git gelernt', 'HTML/CSS-Layouts erstellt', 'Entwicklungsumgebung eingerichtet', 'Erste Unit-Tests geschrieben', 'Code-Conventions studiert', 'Datenbanken Grundlagen erarbeitet'],
            2: ['Feature-Branches eigenständig verwaltet', 'REST-APIs entwickelt und getestet', 'Code Reviews durchgeführt', 'Server-Konfiguration vorgenommen', 'Automatisierte Tests implementiert', 'Performance-Optimierung durchgeführt', 'Technische Dokumentation erstellt', 'Sprint-Planungen mitgestaltet'],
            3: ['Architekturentscheidungen getroffen', 'Junior-Entwickler eingearbeitet', 'Produktions-Deployments durchgeführt', 'Monitoring und Alerting eingerichtet', 'Technische Schulungen gehalten', 'Komplexe Refactorings geplant und umgesetzt', 'Release-Prozesse optimiert', 'Sicherheitsaudits durchgeführt']
        },
        schoolTopics: ['Datenbanken und SQL', 'Objektorientierte Programmierung', 'Netzwerktechnik', 'IT-Sicherheit', 'Projektmanagement', 'Wirtschaft und Sozialkunde', 'Softwareengineering', 'UML-Diagramme', 'Algorithmik und Datenstrukturen', 'Betriebssysteme']
    },

    sysadmin: {
        id: 'sysadmin', icon: '<svg class="icon"><use href="#i-server"/></svg>', name: 'Fachinformatiker SI',
        category: 'IT',
        verbs: ['konfigurieren', 'installieren', 'warten', 'überwachen', 'administrieren', 'sichern', 'patchen', 'troubleshooten', 'migrieren', 'automatisieren', 'provisionieren', 'härten', 'dokumentieren', 'skalieren', 'replizieren'],
        objects: ['Server', 'Netzwerk', 'Firewall', 'Active Directory', 'Backup-System', 'VPN-Tunnel', 'DHCP/DNS-Dienst', 'Virtualisierungs-Cluster', 'Storage-System', 'Mail-Server', 'Monitoring-System', 'WLAN-Infrastruktur', 'Client-PCs', 'Druckerumgebung', 'Load-Balancer', 'Proxy-Server', 'Zertifikats-Infrastruktur', 'Ticketsystem', 'Patch-Management', 'Group Policies'],
        tools: ['PowerShell', 'Bash', 'VMware', 'Hyper-V', 'Azure', 'AWS', 'Nagios', 'Zabbix', 'Windows Server', 'Linux', 'pfSense', 'Ansible', 'Terraform', 'SCCM', 'WSUS', 'WireShark', 'PuTTY', 'Remote Desktop'],
        departments: ['IT-Infrastruktur', 'Systemadministration', 'Netzwerkadministration', 'IT-Support', 'Rechenzentrum', 'Helpdesk'],
        yearTasks: {
            1: ['Arbeitsplatz-PCs eingerichtet', 'Betriebssysteme installiert und konfiguriert', 'Netzwerkkabel konfektioniert', 'Benutzerkonten angelegt', 'Drucker eingerichtet', 'Grundlagen Netzwerktechnik erlernt', 'Support-Tickets bearbeitet', 'Hardware-Inventarisierung durchgeführt'],
            2: ['Server-Wartung eigenständig durchgeführt', 'Netzwerk-Segmentierung konfiguriert', 'Backup-Konzepte implementiert', 'Firewall-Regeln erstellt', 'Virtual Machines provisioniert', 'Monitoring-Alerts konfiguriert', 'Patch-Management durchgeführt', 'VPN-Zugänge eingerichtet'],
            3: ['Server-Migrationen geplant und durchgeführt', 'Hochverfügbarkeits-Cluster aufgesetzt', 'IT-Sicherheitskonzept erarbeitet', 'Automatisierungsskripte für Routineaufgaben erstellt', 'Disaster-Recovery-Tests durchgeführt', 'Neue Mitarbeiter eingewiesen', 'Infrastruktur-Dokumentation aktualisiert']
        },
        schoolTopics: ['Netzwerktechnik und Protokolle', 'Betriebssysteme', 'IT-Sicherheit', 'Server-Dienste', 'Virtualisierung', 'Cloud-Computing', 'Projektmanagement', 'Wirtschaft und Sozialkunde']
    },

    kaufmann: {
        id: 'kaufmann', icon: '<svg class="icon"><use href="#i-chart"/></svg>', name: 'Kaufmann/-frau',
        category: 'Büro',
        verbs: ['bearbeiten', 'prüfen', 'verbuchen', 'erstellen', 'pflegen', 'koordinieren', 'kalkulieren', 'archivieren', 'abgleichen', 'kommunizieren', 'auswerten', 'organisieren', 'vorbereiten', 'recherchieren', 'kontrollieren'],
        objects: ['Rechnungen', 'Aufträge', 'Kundenanfragen', 'Angebote', 'Buchhaltungsbelege', 'Personalakten', 'Lieferscheine', 'Stammdaten', 'Monatsbericht', 'Kostenrechnung', 'Bestellungen', 'Gesprächsprotokoll', 'Präsentation', 'Mahnungen', 'Gutschriften', 'Reisekostenabrechnungen', 'Statistiken', 'Verträge', 'Inventurlisten', 'Newsletter'],
        tools: ['SAP', 'DATEV', 'Lexware', 'Excel', 'ERP-System', 'CRM-System', 'Outlook', 'Word', 'Teams', 'SharePoint', 'PowerPoint', 'Access', 'Power BI'],
        departments: ['Buchhaltung', 'Einkauf', 'Vertrieb', 'Personalwesen', 'Controlling', 'Marketing', 'Sachbearbeitung'],
        yearTasks: {
            1: ['Eingangspost sortiert und verteilt', 'Einfache Dateneingabe in ERP-System', 'Telefonische Kundenanfragen angenommen', 'Ablage und Archivierung durchgeführt', 'Besprechungsräume vorbereitet', 'Büromaterial bestellt', 'Einfache Korrespondenz verfasst'],
            2: ['Angebote eigenständig erstellt', 'Rechnungsprüfung durchgeführt', 'Kundenreklamationen bearbeitet', 'Materialbedarfsplanung unterstützt', 'Statistiken und Auswertungen erstellt', 'Zahlungseingänge kontrolliert', 'Projekte mitkoordiniert'],
            3: ['Monatsabschlüsse vorbereitet', 'Vertragsverhandlungen begleitet', 'Budgetplanung unterstützt', 'Prozessoptimierungen vorgeschlagen', 'Neue Mitarbeiter eingearbeitet', 'Eigenständige Kundenkommunikation', 'Geschäftsbriefe und Reports erstellt']
        },
        schoolTopics: ['Rechnungswesen', 'Wirtschaftslehre', 'Geschäftsprozesse', 'Bürokommunikation', 'Personalwirtschaft', 'Marketing', 'Wirtschaft und Sozialkunde', 'Steuerrecht Grundlagen']
    },

    elektro: {
        id: 'elektro', icon: '<svg class="icon"><use href="#i-zap"/></svg>', name: 'Elektroniker/in',
        category: 'Handwerk',
        verbs: ['installieren', 'verdrahten', 'prüfen', 'messen', 'programmieren', 'inbetriebnehmen', 'warten', 'reparieren', 'konfigurieren', 'dokumentieren', 'planen', 'verlegen', 'anschließen', 'dimensionieren', 'parametrieren'],
        objects: ['Schaltschrank', 'Elektroverteiler', 'Beleuchtungsanlage', 'Steckdosen/Schalter', 'SPS-Steuerung', 'Kabeltrasse', 'Sicherungskasten', 'Brandmeldeanlage', 'Sprechanlage', 'Photovoltaikanlage', 'Ladestation', 'KNX-Bustechnologie', 'Netzersatzanlage', 'Potentialausgleich', 'Blitzschutzanlage', 'Antriebstechnik', 'Frequenzumrichter', 'Schaltplan', 'Erdungsanlage', 'Energiemessgerät'],
        tools: ['Multimeter', 'Oszilloskop', 'Installationstester', 'SPS-Software (TIA Portal)', 'EPLAN', 'CAD', 'ETS-Software', 'Crimpzange', 'Abisolierwerkzeug', 'Duspol', 'Wärmebildkamera', 'Isolationsmessgerät', 'Leitungssucher'],
        departments: ['Elektroinstallation', 'Industrieautomation', 'Gebäudetechnik', 'Wartung', 'Kundendienst'],
        yearTasks: {
            1: ['Leitungen zugeschnitten und abisoliert', 'Einfache Schaltungen aufgebaut', 'VDE-Vorschriften studiert', 'Werkzeugkunde durchgeführt', 'Kabelkanäle montiert', 'Grundlagen Elektrotechnik erlernt', 'Erste Messungen durchgeführt', 'Schutzmaßnahmen gelernt'],
            2: ['Unterverteilungen eigenständig verdrahtet', 'SPS-Programme erstellt', 'Fehlersuche an Anlagen durchgeführt', 'Installationen nach Schaltplan', 'Prüfprotokolle erstellt', 'Kundenanlagen gewartet', 'Motorsteuerungen aufgebaut'],
            3: ['Anlagen eigenständig in Betrieb genommen', 'Komplexe Fehleranalysen durchgeführt', 'Lehrlinge angeleitet', 'Kundengespräche geführt', 'Anlagenprojektierung unterstützt', 'Abnahmeprüfungen durchgeführt', 'Dokumentation der Anlage erstellt']
        },
        schoolTopics: ['Elektrotechnik Grundlagen', 'Installationstechnik', 'Steuerungstechnik', 'Schaltungstechnik', 'Messtechnik', 'Automatisierung', 'Energieversorgung', 'Sicherheitstechnik']
    },

    kfz: {
        id: 'kfz', icon: '<svg class="icon"><use href="#i-car"/></svg>', name: 'KFZ-Mechatroniker/in',
        category: 'Handwerk',
        verbs: ['diagnostizieren', 'reparieren', 'warten', 'prüfen', 'austauschen', 'einstellen', 'montieren', 'programmieren', 'auslesen', 'lackieren', 'schweißen', 'vermessen', 'instandsetzen', 'kalibrieren', 'befüllen'],
        objects: ['Bremsanlage', 'Motorsteuerung', 'Fahrwerk', 'Klimaanlage', 'Getriebe', 'Abgasanlage', 'Beleuchtungssystem', 'Reifen/Räder', 'Ölwechsel', 'Inspektion', 'AU/HU-Vorbereitung', 'Karosserie-Teil', 'Steuergerät', 'Batterie/Akku', 'Keilriemen', 'Kupplungssatz', 'Achslager', 'Stoßdämpfer', 'Zündkerzen', 'Kraftstoffsystem'],
        tools: ['OBD-Diagnosetester', 'Hebebühne', 'Drehmomentschlüssel', 'Achsvermessungsgerät', 'Schaltplan', 'Oszilloskop', 'Schweißgerät', 'Lackierkabine', 'Bremsenprüfstand', 'Druckluft-Werkzeug', 'Klimaservicegerät', 'Abgastester'],
        departments: ['Werkstatt', 'Karosserie/Lack', 'Service-Annahme', 'Teile-Lager', 'Kundendienst'],
        yearTasks: {
            1: ['Ölwechsel und Filterwechsel durchgeführt', 'Reifenwechsel und Auswuchten gelernt', 'Werkzeugkunde absolviert', 'Einfache Inspektionsarbeiten', 'Fahrzeuge auf Hebebühne positioniert', 'Arbeitsplatz eingerichtet und gesäubert', 'Bremsbeläge gewechselt'],
            2: ['Fehlerdiagnose mit OBD durchgeführt', 'Fahrwerk-Komponenten getauscht', 'Klimaanlage gewartet und befüllt', 'Abgasuntersuchung vorbereitet', 'Steuergeräte ausgelesen und parametriert', 'Service-Inspektionen eigenständig durchgeführt', 'Elektrik-Fehlersuche betrieben'],
            3: ['Komplexe Motordiagnosen gestellt', 'Kundenberatung und Auftragsannahme', 'Garantie-Arbeiten dokumentiert', 'Lehrlinge eingewiesen', 'Getriebe- und Kupplungsarbeiten', 'Kalibrierung von Fahrerassistenzsystemen', 'Qualitätskontrolle der Werkstattarbeit']
        },
        schoolTopics: ['Fahrzeugtechnik', 'Motorentechnik', 'Elektrik/Elektronik', 'Fahrwerktechnik', 'Diagnosetechnik', 'Kundenorientierung', 'Wirtschaft und Sozialkunde']
    },

    gastronomie: {
        id: 'gastronomie', icon: '<svg class="icon"><use href="#i-chefhat"/></svg>', name: 'Koch/Köchin',
        category: 'Gastronomie',
        verbs: ['zubereiten', 'kochen', 'backen', 'anrichten', 'dekorieren', 'portionieren', 'einlagern', 'kontrollieren', 'reinigen', 'bestellen', 'servieren', 'beraten', 'kalkulieren', 'marinieren', 'filetieren'],
        objects: ['Vorspeisen', 'Hauptgerichte', 'Desserts', 'Beilagen', 'Saucen', 'Fonds', 'Suppen', 'Menüfolge', 'Buffet-Aufbau', 'Mise en Place', 'Vorratsbestand', 'Tagesmenü', 'Salatkreation', 'Fleischgericht', 'Fischgericht', 'Vegetarisches Gericht', 'Garnitur', 'Patisserie', 'Kalte Platte', 'Mittagsmenü'],
        tools: ['Konvektomat', 'Thermometer', 'Waage', 'Backofen', 'Salamander', 'Vakuumierer', 'Friteuse', 'Pürierstab', 'Küchenmaschine', 'Mandoline', 'Grillstation', 'Bratstation'],
        departments: ['Küche', 'Patisserie', 'Kalte Küche', 'Service', 'Lager/Einkauf'],
        yearTasks: {
            1: ['Mise en Place für das Tagesmenü vorbereitet', 'Grundschnitte (Brunoise, Julienne) geübt', 'Lebensmittelhygiene (HACCP) beachtet', 'Salate und kalte Vorspeisen zubereitet', 'Arbeitsplatz nach Hygienevorschriften gereinigt', 'Warenlieferungen kontrolliert und eingelagert'],
            2: ['Hauptgerichte selbstständig gekocht', 'Saucen und Fonds angesetzt', 'Speisekarte mitgestaltet', 'Warenkalkulation durchgeführt', 'Fleisch und Fisch fachgerecht verarbeitet', 'Desserts kreiert und angerichtet'],
            3: ['Tagesmenü eigenverantwortlich geplant und gekocht', 'Auszubildende angeleitet', 'Bankettvorbereitungen koordiniert', 'Neue Rezepte entwickelt', 'Kundenwünsche umgesetzt (Allergien, Diäten)', 'Warenbestellung und Kostenüberwachung']
        },
        schoolTopics: ['Ernährungslehre', 'Warenkunde', 'Kochtechniken', 'HACCP/Hygiene', 'Kalkulation', 'Menügestaltung', 'Wirtschaft und Sozialkunde']
    },

    pflege: {
        id: 'pflege', icon: '<svg class="icon"><use href="#i-pulse"/></svg>', name: 'Pflegefachkraft',
        category: 'Gesundheit',
        verbs: ['pflegen', 'betreuen', 'dokumentieren', 'assistieren', 'mobilisieren', 'messen', 'verabreichen', 'beraten', 'begleiten', 'überwachen', 'anleiten', 'versorgen', 'lagern', 'unterstützen', 'evaluieren'],
        objects: ['Patient/in', 'Vitalzeichen', 'Wundversorgung', 'Medikamente', 'Pflegeplanung', 'Körperpflege', 'Mobilisation', 'Ernährungsplan', 'Inkontinenzversorgung', 'Verbandswechsel', 'Lagerungshilfe', 'Pflegedokumentation', 'Infusionstherapie', 'Sondenernährung', 'Prophylaxen', 'Sturzprophylaxe', 'Dekubitusprophylaxe', 'Schmerzmanagement', 'Biografie-Arbeit', 'Beschäftigungsangebot'],
        tools: ['Blutdruckmessgerät', 'Blutzuckermessgerät', 'Rollator', 'Pflegebett', 'Dokumentationssoftware', 'Desinfektionsmittel', 'Pulsoximeter', 'Stethoskop', 'Infusionspumpe', 'Absauggerät', 'Lift/Transfer-Hilfe'],
        departments: ['Station', 'Ambulanter Dienst', 'Intensivstation', 'Geriatrie', 'Tagespflege', 'OP-Bereich'],
        yearTasks: {
            1: ['Grundpflege unter Anleitung durchgeführt', 'Vitalzeichen gemessen und dokumentiert', 'Patienten bei Mahlzeiten unterstützt', 'Bettenmachen und Wäschewechsel', 'Hygienemaßnahmen beachtet', 'Pflegeplanung kennengelernt', 'Kommunikation mit Patienten geübt'],
            2: ['Behandlungspflege eigenständig übernommen', 'Wundversorgung durchgeführt', 'Medikamente nach Anordnung verabreicht', 'Pflegeplanungen erstellt und angepasst', 'Prophylaxen durchgeführt', 'Angehörige beraten und begleitet', 'Notfallsituationen geübt'],
            3: ['Schichtleitung übernommen', 'Komplexe Pflegesituationen gelöst', 'Auszubildende angeleitet', 'Qualitätsmanagement mitgestaltet', 'Fallbesprechungen moderiert', 'Entlassmanagement durchgeführt', 'Pflegevisite durchgeführt und dokumentiert']
        },
        schoolTopics: ['Anatomie/Physiologie', 'Krankheitslehre', 'Pflegetheorie', 'Arzneimittellehre', 'Hygiene', 'Recht in der Pflege', 'Kommunikation', 'Ethik']
    },

    einzelhandel: {
        id: 'einzelhandel', icon: '<svg class="icon"><use href="#i-cart"/></svg>', name: 'Einzelhandelskaufmann/-frau',
        category: 'Handel',
        verbs: ['beraten', 'verkaufen', 'kassieren', 'einräumen', 'dekorieren', 'bestellen', 'kontrollieren', 'präsentieren', 'inventurisieren', 'umtauschen', 'etikettieren', 'kommissionieren', 'platzieren', 'disponieren', 'stornieren'],
        objects: ['Wareneingang', 'Schaufensterdekoration', 'Kassenabrechnung', 'Kundenberatung', 'Reklamation', 'Warenbestellung', 'Lagerbestand', 'Preisauszeichnung', 'Produktpräsentation', 'Inventurliste', 'Sonderaktion', 'Umtauschvorgang', 'Regalbestückung', 'Warenbeschaffung', 'Kundenbindungsaktion'],
        tools: ['Kassensystem', 'Warenwirtschaftssystem', 'Scanner', 'Preisauszeichner', 'POS-Terminal', 'MDE-Gerät', 'Etikettendrucker'],
        departments: ['Verkauf', 'Lager', 'Einkauf', 'Dekoration', 'Kasse', 'Kundenservice'],
        yearTasks: {
            1: ['Waren eingeräumt und nach Planogramm platziert', 'Kassensystem bedient und Abrechnungen erstellt', 'Kunden zu Produkten beraten', 'Wareneingang kontrolliert und erfasst', 'Preisauszeichnungen angebracht', 'Filiale auf Sauberkeit kontrolliert'],
            2: ['Schaufensterdekoration eigenständig gestaltet', 'Bestellvorschläge erstellt', 'Reklamationen bearbeitet und Lösungen gefunden', 'Inventurarbeiten durchgeführt', 'Umsatzauswertungen miterstellt', 'Warenpräsentationen zum Thema erstellt'],
            3: ['Bestellwesen eigenverantwortlich geführt', 'Verkaufsaktionen geplant und umgesetzt', 'Mitarbeiter im Verkauf angeleitet', 'Kennzahlenauswertungen erstellt', 'Lieferantenverhandlungen begleitet', 'Qualitätsmanagement mitgestaltet']
        },
        schoolTopics: ['Warenkunde', 'Verkaufsstrategie', 'Rechnungswesen', 'Kundenorientierung', 'Wirtschaftslehre', 'Warenwirtschaft', 'Marketing']
    },

    handwerk_bau: {
        id: 'handwerk_bau', icon: '<svg class="icon"><use href="#i-wall"/></svg>', name: 'Maurer/in / Bau',
        category: 'Handwerk',
        verbs: ['mauern', 'betonieren', 'verputzen', 'verlegen', 'montieren', 'messen', 'schneiden', 'schleifen', 'abdichten', 'verschalen', 'fundamentieren', 'armieren', 'schütten', 'stampfen', 'verfugen'],
        objects: ['Backsteinmauer', 'Fundament', 'Deckenplatte', 'Estrichboden', 'Treppenanlage', 'Schalungssystem', 'Bewehrungskorb', 'Drainagesystem', 'Mauerwerk', 'Fassade', 'Innenputz', 'Außenwand', 'Stützpfeiler', 'Fensterbänke', 'Bodenplatte', 'Ringbalken', 'Sturzschalung', 'Sockelbereich', 'Dachsparren', 'Trennwand'],
        tools: ['Wasserwaage', 'Kelle', 'Mischmaschine', 'Rüttler', 'Nivelliergerät', 'Betonmischer', 'Kreissäge', 'Flex', 'Bohrmaschine', 'Bauplan', 'Schnurgerüst', 'Fluchtstab', 'Richtlatte'],
        departments: ['Baustelle', 'Rohbau', 'Ausbau', 'Tiefbau', 'Werkstatt'],
        yearTasks: {
            1: ['Baustelle eingerichtet und gesichert', 'Baustoffe transportiert und bereitgestellt', 'Einfaches Mauerwerk erstellt', 'Werkzeugpflege durchgeführt', 'Baugrube ausgehoben', 'Schalung aufgebaut', 'Grundkenntnisse Vermessung erlernt'],
            2: ['Mauerwerk nach Plan erstellt', 'Betonarbeiten eigenständig durchgeführt', 'Putzarbeiten innen und außen', 'Estrich verlegt', 'Abdichtungsarbeiten durchgeführt', 'Bewehrung verlegt und fixiert'],
            3: ['Komplexe Mauerwerksverbände erstellt', 'Lehrlinge angeleitet', 'Bauabschnitte eigenständig geplant', 'Materialbestellungen veranlasst', 'Aufmaß erstellt', 'Qualitätskontrolle durchgeführt']
        },
        schoolTopics: ['Bautechnik', 'Baustoffkunde', 'Bauzeichnen', 'Vermessung', 'Arbeitssicherheit', 'Statik Grundlagen', 'Wirtschaft und Sozialkunde']
    },

    handwerk_holz: {
        id: 'handwerk_holz', icon: '<svg class="icon"><use href="#i-hammer"/></svg>', name: 'Tischler/Schreiner',
        category: 'Handwerk',
        verbs: ['sägen', 'hobeln', 'fräsen', 'schleifen', 'leimen', 'montieren', 'konstruieren', 'furnieren', 'lackieren', 'messen', 'zeichnen', 'zusammenbauen', 'profilieren', 'dübeln', 'verleimen'],
        objects: ['Möbelstück', 'Türrahmen', 'Fensterrahmen', 'Schranksystem', 'Tischplatte', 'Holztreppe', 'Einbauküche', 'Regalwand', 'Werkstück', 'Dachstuhl', 'Holzverbindung', 'Innenausbau', 'Schubladenführung', 'Beschlag', 'Furnierarbeit', 'Massivholzplatte', 'Arbeitsplatte', 'Schiebetür'],
        tools: ['Kreissäge', 'Oberfräse', 'Bandschleifer', 'CNC-Fräse', 'Hobelmaschine', 'Stechbeitel', 'Winkelschleifer', 'CAD-Software', 'Abrichte', 'Dickenhobel', 'Langlochbohrer', 'Kantenfräse'],
        departments: ['Werkstatt', 'Montage', 'Oberflächenbehandlung', 'Konstruktion', 'Kundendienst'],
        yearTasks: {
            1: ['Holzarten bestimmt und sortiert', 'Einfache Werkstücke nach Zeichnung gefertigt', 'Handwerkzeuge sachgerecht eingesetzt', 'Holzverbindungen geübt (Zinken, Dübel)', 'Werkstattmaschinen unter Aufsicht bedient', 'Oberflächen geschliffen'],
            2: ['Möbelstücke eigenständig gefertigt', 'CNC-Programme erstellt und ausgeführt', 'Furnierarbeiten durchgeführt', 'Kundenmontagen begleitet', 'Maße aufgenommen und übertragen', 'Oberflächen behandelt und lackiert'],
            3: ['Komplexe Möbel konstruiert und gefertigt', 'Kundengespräche geführt', 'Lehrlinge angeleitet', 'Materialkalkulationen erstellt', 'Montageleitung übernommen', 'CAD-Zeichnungen erstellt']
        },
        schoolTopics: ['Holztechnik', 'Werkstoffkunde', 'Technisches Zeichnen', 'Maschinenarbeit', 'Konstruktion', 'Oberflächentechnik', 'Wirtschaft und Sozialkunde']
    },

    friseur: {
        id: 'friseur', icon: '<svg class="icon"><use href="#i-scissors"/></svg>', name: 'Friseur/in',
        category: 'Handwerk',
        verbs: ['schneiden', 'färben', 'föhnen', 'beraten', 'waschen', 'stylen', 'pflegen', 'hochstecken', 'ondulieren', 'rasieren', 'tönen', 'blondieren', 'strähnchen setzen', 'modellieren', 'frisieren'],
        objects: ['Damenhaarschnitt', 'Herrenhaarschnitt', 'Coloration', 'Balayage', 'Dauerwelle', 'Hochsteckfrisur', 'Bartpflege', 'Haarpflegebehandlung', 'Strähnen-Technik', 'Kinderhaarschnitt', 'Brautfrisur', 'Typberatung', 'Kopfhautbehandlung', 'Extensions', 'Farbberatung'],
        tools: ['Schere', 'Effilierschere', 'Föhn', 'Glätteisen', 'Lockenstab', 'Farbtabelle', 'Alufolie', 'Papilloten', 'Haarschneidemaschine', 'Rasierer', 'Clips', 'Kamm-Set'],
        departments: ['Salon', 'Herren-Abteilung', 'Damen-Abteilung', 'Empfang'],
        yearTasks: {
            1: ['Haare gewaschen und Kopfhautmassage durchgeführt', 'Wickler eingedreht', 'Arbeitsmittel vorbereitet und gereinigt', 'Farbe angemischt unter Anleitung', 'Einfache Föhntechniken geübt', 'Kunden empfangen und beraten'],
            2: ['Damenschnitte eigenständig geschnitten', 'Colorationstechniken angewendet', 'Strähnen in Folientechnik gesetzt', 'Styling-Looks kreiert', 'Produktberatung durchgeführt', 'Kundenwünsche umgesetzt'],
            3: ['Kreaive Farbkonzepte entwickelt', 'Komplexe Hochsteckfrisuren gestaltet', 'Auszubildende angeleitet', 'Kundenberatung eigenverantwortlich', 'Salonmanagement unterstützt', 'Trends analysiert und umgesetzt']
        },
        schoolTopics: ['Frisurtechnik', 'Farb- und Formenlehre', 'Chemie der Haarpflege', 'Kundenberatung', 'Salonmanagement', 'Hautpflege', 'Wirtschaft und Sozialkunde']
    },

    lager: {
        id: 'lager', icon: '<svg class="icon"><use href="#i-package"/></svg>', name: 'Fachkraft für Lagerlogistik',
        category: 'Logistik',
        verbs: ['kommissionieren', 'einlagern', 'auslagern', 'verpacken', 'verladen', 'scannen', 'kontrollieren', 'inventarisieren', 'transportieren', 'sortieren', 'buchen', 'etikettieren', 'disponieren', 'palettieren', 'optimieren'],
        objects: ['Wareneingang', 'Warenausgang', 'Lieferung', 'Palette', 'Sendung', 'Kommissionierauftrag', 'Retourenbearbeitung', 'Bestandsliste', 'Versandpapiere', 'Gefahrgut-Ladung', 'Tourenplanung', 'Lagerplatz', 'Ladungsträger', 'Frachtbrief', 'Zollpapiere'],
        tools: ['Gabelstapler', 'Ameise (Hubwagen)', 'Handscanner', 'SAP WMS', 'Lagerverwaltungssystem', 'Verpackungsmaschine', 'Etikettendrucker', 'E-Stapler', 'Regalbediengerät'],
        departments: ['Wareneingang', 'Warenausgang', 'Kommissionierung', 'Verpackung', 'Versand', 'Gefahrgutlager'],
        yearTasks: {
            1: ['Warenannahme und Eingangskontrolle durchgeführt', 'Waren im Regal eingelagert', 'Lieferscheine kontrolliert und abgezeichnet', 'Stapler-Führerschein erworben', 'Lagerbereiche aufgeräumt', 'Einfache Kommissionieraufträge bearbeitet'],
            2: ['Selbstständig kommissioniert und versandfertig gemacht', 'Bestandskorrekturen im WMS gebucht', 'Retouren bearbeitet und eingelagert', 'Inventurvorbereitungen getroffen', 'Ladungssicherung durchgeführt', 'Gefahrgutvorschriften angewendet'],
            3: ['Tourenplanung mitgestaltet', 'Lagerkennzahlen ausgewertet', 'Lagerplatzoptimierung vorgeschlagen', 'Azubis eingewiesen', 'Reklamationen bei Lieferanten veranlasst', 'Zolldokumente bearbeitet']
        },
        schoolTopics: ['Lagerwirtschaft', 'Logistikprozesse', 'Güterverkehr', 'Gefahrgut', 'Warenwirtschaft', 'Wirtschaft und Sozialkunde', 'Ladungssicherung']
    },

    medien: {
        id: 'medien', icon: '<svg class="icon"><use href="#i-palette"/></svg>', name: 'Mediengestalter/in',
        category: 'Kreativ',
        verbs: ['gestalten', 'entwerfen', 'layouten', 'bearbeiten', 'animieren', 'schneiden', 'retouchieren', 'exportieren', 'drucken', 'präsentieren', 'konzipieren', 'illustrieren', 'rendern', 'prototypen', 'optimieren'],
        objects: ['Printlayout', 'Social-Media-Grafik', 'Webdesign-Mockup', 'Video-Clip', 'Banner-Animation', 'Firmenlogo', 'Broschüre', 'Flyer', 'Corporate-Design-Manual', 'Druckauftrag', 'E-Mail-Template', 'Bildbearbeitung', 'Infografik', 'Plakat', 'Verpackungsdesign', 'UI/UX-Design', 'Präsentationsvorlage'],
        tools: ['Photoshop', 'InDesign', 'Illustrator', 'Figma', 'Premiere Pro', 'After Effects', 'Canva', 'Blender', 'Sketch', 'XD', 'Lightroom', 'Cinema 4D'],
        departments: ['Grafikabteilung', 'Marketing', 'Druckvorstufe', 'Webdesign', 'Social Media', 'Video/Film'],
        yearTasks: {
            1: ['Einfache Grafiken nach Vorlage erstellt', 'Bilder freigestellt und bearbeitet', 'Druckdaten vorbereitet', 'Farbprofile eingestellt', 'Gestaltungsgrundlagen erlernt', 'Social-Media-Posts gestaltet'],
            2: ['Layouts eigenständig konzipiert und umgesetzt', 'Videos geschnitten und exportiert', 'Kundenprojekte bearbeitet', 'Animationen erstellt', 'Druckfreigaben vorbereitet', 'Webgrafiken optimiert'],
            3: ['Gesamte Broschüren/Kataloge gestaltet', 'Kreativkonzepte präsentiert', 'Lehrlinge angeleitet', 'Kundenbriefings geführt', 'Corporate-Design-Richtlinien erstellt', 'Qualitätssicherung im Druck']
        },
        schoolTopics: ['Gestaltungsgrundlagen', 'Typografie', 'Farblehre', 'Drucktechnik', 'Webdesign', 'AV-Produktion', 'Medienproduktion', 'Wirtschaft und Sozialkunde']
    },

    metall: {
        id: 'metall', icon: '<svg class="icon"><use href="#i-gear"/></svg>', name: 'Industriemechaniker/in',
        category: 'Industrie',
        verbs: ['drehen', 'fräsen', 'bohren', 'schweißen', 'schleifen', 'biegen', 'stanzen', 'programmieren', 'messen', 'montieren', 'entgraten', 'härten', 'justieren', 'zerspanen', 'polieren'],
        objects: ['Werkstück', 'CNC-Drehteil', 'Fräsbauteil', 'Schweißkonstruktion', 'Blechzuschnitt', 'Gewindebohrung', 'Passbohrung', 'Metallrahmen', 'Edelstahlgehäuse', 'Rohrkonstruktion', 'Prototyp', 'Serienbauteil', 'Pneumatik-Baugruppe', 'Hydraulik-Zylinder', 'Getriebebauteil', 'Vorrichtung'],
        tools: ['CNC-Drehmaschine', 'CNC-Fräse', 'Schweißgerät (MAG/WIG)', 'Messschieber', 'Bügelmessschraube', 'Höhenreißer', 'Abkantpresse', 'Bandsäge', 'CAD/CAM-Software', 'Koordinatenmessgerät', 'Rundschleifmaschine'],
        departments: ['Werkstatt', 'CNC-Fertigung', 'Montage', 'Qualitätssicherung', 'Instandhaltung', 'Konstruktion'],
        yearTasks: {
            1: ['Grundlagen Feilen, Sägen, Bohren geübt', 'Technische Zeichnungen lesen gelernt', 'Werkzeugkunde absolviert', 'Messmittel eingesetzt', 'Erste Werkstücke nach Plan gefertigt', 'Sicherheitsunterweisung Werkstatt'],
            2: ['CNC-Programme erstellt und gefahren', 'Schweißnähte (MAG) gefertigt', 'Baugruppen montiert', 'Qualitätsprüfung durchgeführt', 'Instandhaltungsarbeiten', 'Pneumatik-Schaltungen aufgebaut'],
            3: ['Komplexe CNC-Programme optimiert', 'Vorrichtungen konstruiert und gefertigt', 'Azubis angeleitet', 'Fertigungsplanung unterstützt', 'Fehleranalyse an Maschinen', 'Programmier- und Rüstprotokolle erstellt']
        },
        schoolTopics: ['Fertigungstechnik', 'Werkstoffkunde', 'Technisches Zeichnen', 'CNC-Technik', 'Steuerungstechnik', 'Qualitätsmanagement', 'Wirtschaft und Sozialkunde']
    },

    garten: {
        id: 'garten', icon: '<svg class="icon"><use href="#i-leaf"/></svg>', name: 'Gärtner/in',
        category: 'Handwerk',
        verbs: ['pflanzen', 'schneiden', 'mähen', 'pflegen', 'gestalten', 'bewässern', 'mulchen', 'düngen', 'jäten', 'vermessen', 'pflastern', 'ausheben', 'roden', 'säen', 'pikieren'],
        objects: ['Rasenfläche', 'Hecke', 'Beet', 'Baumbestand', 'Pflasterweg', 'Teichanlage', 'Gewächshaus', 'Blumen-Arrangement', 'Grabpflege', 'Sträucher', 'Staudenbeet', 'Rollrasen', 'Natursteinmauer', 'Pflanzgefäß', 'Bewässerungssystem'],
        tools: ['Motorsäge', 'Heckenschere', 'Rasenmäher', 'Freischneider', 'Minibagger', 'Rüttelplatte', 'Gießwagen', 'Pflanzentransporter', 'Astschere', 'Spaten', 'Baumschere'],
        departments: ['Garten- und Landschaftsbau', 'Zierpflanzenbau', 'Baumschule', 'Friedhofsgärtnerei', 'Gemüsebau'],
        yearTasks: {
            1: ['Pflanzen bestimmt und gepflegt', 'Beete angelegt und bepflanzt', 'Rasen gemäht und vertikutiert', 'Werkzeuge gewartet', 'Einfache Pflasterarbeiten durchgeführt', 'Bewässerung kontrolliert'],
            2: ['Hecken formgerecht geschnitten', 'Natursteinarbeiten durchgeführt', 'Pflanzpläne umgesetzt', 'Bäume fachgerecht geschnitten', 'Pflanzenschutzmaßnahmen ergriffen', 'Kundengärten gepflegt'],
            3: ['Gartenanlagen geplant und umgesetzt', 'Kundengespräche geführt', 'Azubis angeleitet', 'Materialkalkulationen erstellt', 'Spezialschnitte durchgeführt', 'Teichanlagen gebaut']
        },
        schoolTopics: ['Pflanzenkunde', 'Bodenkunde', 'Pflanzenschutz', 'Gestaltungslehre', 'Bautechnik', 'Maschinenkunde', 'Wirtschaft und Sozialkunde']
    },

    chemie: {
        id: 'chemie', icon: '<svg class="icon"><use href="#i-flask"/></svg>', name: 'Chemielaborant/in',
        category: 'Industrie',
        verbs: ['analysieren', 'mischen', 'prüfen', 'messen', 'destillieren', 'filtrieren', 'dokumentieren', 'kalibrieren', 'titrieren', 'synthetisieren', 'extrahieren', 'zentrifugieren', 'wiegen', 'protokollieren', 'chromatographieren'],
        objects: ['Probe', 'Lösung', 'Reaktionsgemisch', 'Analyseergebnis', 'Versuchsreihe', 'Prüfprotokoll', 'Reinheitsgrad', 'Produktionsbatch', 'Stoffgemisch', 'Kalibrierlösung', 'Reagenz', 'Standardlösung', 'Umweltprobe', 'Qualitätsprobe', 'Titration'],
        tools: ['Photometer', 'pH-Meter', 'Analysenwaage', 'Gaschromatograph', 'HPLC', 'Titriergerät', 'Laborjob-Software', 'Pipette', 'Autoklav', 'Rotationsverdampfer', 'Spektrometer', 'Bunsenbrenner'],
        departments: ['Analytik-Labor', 'Synthese-Labor', 'Qualitätskontrolle', 'F&E', 'Produktionslabor'],
        yearTasks: {
            1: ['Laborgeräte kennen gelernt und gereinigt', 'Einfache Lösungen angesetzt', 'Wägen und Volumenmessung geübt', 'Sicherheitsregeln im Labor gelernt', 'Laborjournal geführt', 'pH-Werte gemessen'],
            2: ['Titrationen eigenständig durchgeführt', 'Chromatographische Analysen', 'Qualitätsprüfungen durchgeführt', 'Versuchsreihen geplant und dokumentiert', 'Geräte kalibriert', 'Analyseergebnisse ausgewertet'],
            3: ['Komplexe Synthesen durchgeführt', 'Methodenentwicklung unterstützt', 'Azubis angeleitet', 'Prüfberichte erstellt', 'Validierungen begleitet', 'Gerätewartung eigenständig']
        },
        schoolTopics: ['Allgemeine Chemie', 'Analytische Chemie', 'Organische Chemie', 'Physikalische Chemie', 'Laborsicherheit', 'Qualitätsmanagement', 'Wirtschaft und Sozialkunde']
    },

    mfa: {
        id: 'mfa', icon: '<svg class="icon"><use href="#i-heartpulse"/></svg>', name: 'Med. Fachangestellte/r',
        category: 'Gesundheit',
        verbs: ['assistieren', 'vorbereiten', 'dokumentieren', 'messen', 'desinfizieren', 'sterilisieren', 'beraten', 'koordinieren', 'abrechnen', 'aufklären', 'kontrollieren', 'durchführen', 'anmelden', 'organisieren', 'untersuchen'],
        objects: ['Patientenaufnahme', 'Blutentnahme', 'EKG-Ableitung', 'Wundversorgung', 'Impfassistenz', 'Abrechnung (KV)', 'Sprechstundenplanung', 'Medikamentenausgabe', 'Hygieneplan', 'Laborprobe', 'Verbandswechsel', 'Sterilisation', 'Patientenakte', 'Recall-System', 'Terminmanagement'],
        tools: ['Blutdruckmessgerät', 'EKG-Gerät', 'Praxis-Software', 'Sterilisator', 'Spirometer', 'Blutzuckermessgerät', 'Otoskop', 'Dermatoskop', 'Inhalationsgerät', 'Centrifuge'],
        departments: ['Anmeldung/Empfang', 'Behandlungsraum', 'Labor', 'Verwaltung', 'OP-Assistenz'],
        yearTasks: {
            1: ['Patienten empfangen und Daten aufgenommen', 'Einfache Vitalwerte gemessen', 'Behandlungsräume vorbereitet', 'Instrumente sterilisiert', 'Terminvergabe durchgeführt', 'Laborproben beschriftet'],
            2: ['Blutentnahmen eigenständig durchgeführt', 'EKGs geschrieben und vorbereitet', 'Abrechnungen erstellt', 'Wunden versorgt', 'Impfassistenz geleistet', 'Arzneimittel-Verwaltung übernommen'],
            3: ['Praxis-Abläufe eigenständig organisiert', 'Auszubildende angeleitet', 'Notfallmanagement', 'KV-Abrechnungen erstellt', 'QM-Maßnahmen mitgestaltet', 'Patientenschulungen durchgeführt']
        },
        schoolTopics: ['Medizinische Terminologie', 'Anatomie/Physiologie', 'Arzneimittellehre', 'Abrechnung', 'Hygiene', 'Labordiagnostik', 'Wirtschaft und Sozialkunde']
    },

    hotel: {
        id: 'hotel', icon: '<svg class="icon"><use href="#i-hotel"/></svg>', name: 'Hotelfachmann/-frau',
        category: 'Gastronomie',
        verbs: ['empfangen', 'beraten', 'servieren', 'organisieren', 'reservieren', 'dekorieren', 'kontrollieren', 'koordinieren', 'kommunizieren', 'kalkulieren', 'eindecken', 'abrechnen', 'pflegen', 'reinigen', 'planen'],
        objects: ['Check-in/Check-out', 'Zimmerreinigung', 'Frühstücksbuffet', 'Tischgedeck', 'Reservierungssystem', 'Veranstaltung', 'Bankettplanung', 'Beschwerdemanagement', 'Housekeeping-Kontrolle', 'Minibar-Abrechnung', 'Wäscheservice', 'Gästebetreuung', 'Konferenzraum-Setup', 'Nachtschicht-Übergabe'],
        tools: ['PMS (Property Management System)', 'Kassensystem', 'Buchungssystem', 'Channel-Manager', 'Housekeeping-App', 'POS-Terminal', 'Reservierungssoftware'],
        departments: ['Empfang/Front Office', 'Housekeeping', 'F&B (Restaurant)', 'Bankett', 'Reservierung', 'Nachtdienst'],
        yearTasks: {
            1: ['Gäste begrüßt und eingecheckt', 'Zimmer auf Standard kontrolliert', 'Frühstücksservice durchgeführt', 'Tische eingedeckt', 'Telefonanfragen bearbeitet', 'Housekeeping unterstützt'],
            2: ['Check-in/Check-out eigenständig durchgeführt', 'Reservierungen verwaltet', 'Beschwerden bearbeitet', 'Bar-Service übernommen', 'Veranstaltungen vorbereitet', 'Rechnungen erstellt'],
            3: ['Schichtleitung übernommen', 'Revenue Management unterstützt', 'Events koordiniert', 'Azubis angeleitet', 'VIP-Gästebetreuung', 'Umsatzanalysen erstellt']
        },
        schoolTopics: ['Hotelorganisation', 'Service', 'Housekeeping', 'Marketing', 'F&B-Management', 'Buchführung', 'Wirtschaft und Sozialkunde']
    },

    dachdecker: {
        id: 'dachdecker', icon: '<svg class="icon"><use href="#i-home"/></svg>', name: 'Dachdecker/in',
        category: 'Handwerk',
        verbs: ['eindecken', 'abdichten', 'dämmen', 'verlegen', 'montieren', 'reparieren', 'aufbauen', 'sichern', 'messen', 'schneiden', 'kleben', 'schrauben', 'löten', 'schweißen', 'gestalten'],
        objects: ['Dacheindeckung', 'Flachdachaufbau', 'Dachdämmung', 'Dachrinne', 'Dachfenster', 'Firstziegel', 'Unterspannbahn', 'Abdichtungsbahn', 'Schornsteineinfassung', 'Solaranlage', 'Dachgaube', 'Fassadenbekleidung', 'Blitzschutzanlage', 'Schneefanggitter'],
        tools: ['Dachziegelschneider', 'Gasbrenner', 'Falzzange', 'Blechschere', 'Schieferhammer', 'Abrissgerät', 'Sicherungsseil', 'Gerüst', 'Dachleiter', 'Lötkolben'],
        departments: ['Steildach', 'Flachdach', 'Klempnerarbeiten', 'Abdichtung', 'Dachsanierung'],
        yearTasks: {
            1: ['Materialtransport auf das Dach', 'Dachlatten angebracht', 'Einfache Ziegel verlegt', 'Sicherheitseinrichtungen aufgebaut', 'Werkzeugpflege durchgeführt', 'Unterspannbahn verlegt'],
            2: ['Dacheindeckungen eigenständig', 'Dachrinnen montiert', 'Abdichtungsarbeiten Flachdach', 'Dachfenster eingebaut', 'Schornsteineinfassungen hergestellt', 'Wärmedämmung eingebaut'],
            3: ['Komplexe Dachgeometrien bearbeitet', 'Aufmaß und Kalkulation', 'Azubis angeleitet', 'Kundengespräche geführt', 'Solarmodule montiert', 'Qualitätskontrolle']
        },
        schoolTopics: ['Dachtechnik', 'Abdichtungstechnik', 'Wärmeschutz', 'Baustoffkunde', 'Bauzeichnen', 'Arbeitssicherheit', 'Wirtschaft und Sozialkunde']
    },

    sanitaer: {
        id: 'sanitaer', icon: '<svg class="icon"><use href="#i-wrench"/></svg>', name: 'Anlagenmechaniker SHK',
        category: 'Handwerk',
        verbs: ['installieren', 'montieren', 'verlegen', 'löten', 'schweißen', 'pressen', 'dämmen', 'prüfen', 'reparieren', 'warten', 'einstellen', 'inbetriebnehmen', 'spülen', 'entlüften', 'messen'],
        objects: ['Heizungsanlage', 'Sanitärinstallation', 'Trinkwasserleitung', 'Abwasserleitung', 'Wärmepumpe', 'Solarthermieanlage', 'Badezimmer-Ausstattung', 'Fußbodenheizung', 'Heizkörper', 'Lüftungsanlage', 'Gasleitung', 'Thermostatventil', 'Zirkulation', 'Speicher', 'Regelungstechnik'],
        tools: ['Rohrschneider', 'Presszange', 'Lötlampe', 'Rohrzange', 'Gewindeschneider', 'Manometer', 'Wasserwaage', 'Abdrückpumpe', 'Schlitzmaschine', 'Kernbohrgerät'],
        departments: ['Sanitär', 'Heizung', 'Kundendienst', 'Neubau', 'Wartung'],
        yearTasks: {
            1: ['Rohre zugeschnitten und verbunden', 'Einfache Sanitärmontage', 'Werkzeugkunde absolviert', 'Lötverbindungen geübt', 'Baustellenvorbereitung', 'Materialberechnung erlernt'],
            2: ['Bäder eigenständig installiert', 'Heizungsrohre verlegt und gepresst', 'Wandheizkörper montiert', 'Abwasserleitungen verlegt', 'Dichtheitsprüfungen durchgeführt', 'Kundendienst-Aufträge bearbeitet'],
            3: ['Heizungsanlagen in Betrieb genommen', 'Wärmepumpen installiert', 'Regelungstechnik eingestellt', 'Azubis angeleitet', 'Aufmaß und Abrechnung', 'Komplexe Sanierungen geplant']
        },
        schoolTopics: ['Sanitärtechnik', 'Heizungstechnik', 'Lüftungstechnik', 'Werkstoffkunde', 'Bauphysik', 'Regelungstechnik', 'Wirtschaft und Sozialkunde']
    }
};

// ═══════════════════════════════════════
// SEASON & CALENDAR AWARENESS
// ═══════════════════════════════════════

const SEASONS = {
    winter: { months: [12, 1, 2], label: 'Winter', weather: ['kalt', 'frostig', 'winterlich'] },
    spring: { months: [3, 4, 5], label: 'Frühling', weather: ['mild', 'frühlingshaft', 'wechselhaft'] },
    summer: { months: [6, 7, 8], label: 'Sommer', weather: ['warm', 'sommerlich', 'heiß'] },
    autumn: { months: [9, 10, 11], label: 'Herbst', weather: ['kühl', 'herbstlich', 'regnerisch'] }
};

function getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    return Object.entries(SEASONS).find(([_, s]) => s.months.includes(month))?.[0] || 'spring';
}

const SEASONAL_ACTIVITIES = {
    garten: {
        winter: ['Gehölzschnitt bei Frost durchgeführt', 'Pflanzen winterfest gemacht', 'Werkzeugwartung in der Werkstatt', 'Schneelast von Sträuchern entfernt'],
        spring: ['Beete für Frühjahrspflanzung vorbereitet', 'Frühblüher gesetzt', 'Rasen vertikutiert und nachgesät', 'Hecken formiert nach dem Winter'],
        summer: ['Bewässerung bei Hitze sichergestellt', 'Rasen regelmäßig gemäht', 'Sommerblumen gepflegt', 'Staudenbeet gejätet und gedüngt'],
        autumn: ['Laub zusammengeharkt und kompostiert', 'Herbstpflanzungen durchgeführt', 'Gartenteich winterfest gemacht', 'Rosen zurückgeschnitten']
    },
    handwerk_bau: {
        winter: ['Innenausbauarbeiten bei Frost durchgeführt', 'Frostschutzmaßnahmen am Bau getroffen', 'Mauerwerk bei Kälte geschützt', 'Innenputz aufgetragen'],
        spring: ['Außenarbeiten nach Frostperiode aufgenommen', 'Fundamente bei trockener Witterung gegossen', 'Frühjahrs-Baustelle eingerichtet', 'Fassadenarbeiten begonnen'],
        summer: ['Betonarbeiten bei optimaler Temperatur', 'Dacharbeiten bei gutem Wetter', 'Außenputz aufgebracht', 'Pflasterarbeiten im Außenbereich'],
        autumn: ['Baustelle winterfest gemacht', 'Abdichtungsarbeiten vor Frost abgeschlossen', 'Letzte Außenarbeiten vor dem Winter', 'Heizestrich eingebracht']
    },
    dachdecker: {
        winter: ['Dachboden-Dämmarbeiten durchgeführt', 'Sturmschäden kontrolliert und repariert', 'Schneelasten kontrolliert', 'Innenarbeiten an Dachausbau'],
        spring: ['Dachinspektionen nach dem Winter', 'Winterschäden repariert', 'Neue Dachprojekte begonnen', 'Regenrinnen gereinigt und geprüft'],
        summer: ['Dacheindeckungen bei gutem Wetter', 'Solaranlagen montiert', 'Flachdachsanierung', 'Dachfenster eingebaut'],
        autumn: ['Sturmschutz-Maßnahmen getroffen', 'Dachrinnen gereinigt', 'Letzte Abdichtungen vor dem Winter', 'Schneefanggitter montiert']
    }
};

// ═══════════════════════════════════════
// SCHOOL TOPIC DATABASE
// ═══════════════════════════════════════

// Eigene Berufe (Freitext im Profil) stehen nicht in PROFESSIONS und haben
// deshalb keine Faecherliste. Ohne Rueckfallebene gab generateSchoolEntry dort
// null zurueck — der Schultag verlor sein Fach und der Tag fiel auf den
// generischen Zweig zurueck, also auf Betriebs-Floskeln. Diese Faecher stehen
// in JEDEM Rahmenlehrplan, sind also fuer einen unbekannten Beruf keine
// Erfindung, sondern die ehrliche Untermenge.
const UNIVERSAL_SCHULFAECHER = [
    'Wirtschafts- und Sozialkunde', 'Fachtheorie', 'Fachrechnen',
    'Deutsch und Kommunikation', 'Politik und Gesellschaftslehre',
    'Arbeits- und Tarifrecht', 'Arbeitssicherheit und Gesundheitsschutz',
    'Qualitätsmanagement', 'Datenschutz und Datensicherheit', 'Englisch im Beruf',
];

// Theme-specific activity pools for thematic generation
const THEME_ACTIVITIES = {
    projekt: [
        'Sprint-Ziele besprochen und Aufgaben im Team aufgeteilt',
        'Projekt-Status im Daily Stand-up präsentiert',
        'Technische Konzeption für neues Feature erarbeitet',
        'Aufwandsschätzung für anstehende Aufgaben erstellt',
        'Retrospektive durchgeführt und Verbesserungspotenzial identifiziert',
        'Projekt-Dokumentation aktualisiert und strukturiert',
        'Feature-Branch erstellt und erste Implementierung begonnen',
        'Review-Meeting mit Ausbilder zu Projektfortschritt abgehalten',
    ],
    kunde: [
        'Kundengespräch vorbereitet und Präsentation erstellt',
        'Anforderungen des Kunden aufgenommen und dokumentiert',
        'Kundenmeeting durchgeführt und Protokoll verfasst',
        'Feedback des Kunden ausgewertet und in Maßnahmen überführt',
        'Angebotserstellung für Kundenauftrag unterstützt',
        'Rückfragen des Kunden schriftlich beantwortet',
        'Kundendaten im CRM-System aktualisiert',
        'Auftragsbestätigung geprüft und weiterverarbeitet',
    ],
    einarbeitung: [
        'Neue Technologie studiert und erste Beispiele umgesetzt',
        'Onboarding-Unterlagen durchgearbeitet und Fragen notiert',
        'Einführungsgespräch mit Teamkollegen geführt',
        'Interne Prozesse und Abläufe kennengelernt',
        'Dokumentation zum Themenbereich durchgelesen',
        'Tutorial absolviert und Erkenntnisse festgehalten',
        'Fragen aus der Einarbeitung mit Ausbilder geklärt',
        'Eigene Notizen und Lernpfad erstellt',
    ],
    messe: [
        'Messestand vorbereitet und Präsentationsmaterial zusammengestellt',
        'Produktvorstellung geübt und Argumentation erarbeitet',
        'Fachgespräche auf der Messe geführt und Kontakte geknüpft',
        'Impressionen und Erkenntnisse von der Messe dokumentiert',
        'Nachbereitungsmail an Messekontakte verfasst',
        'Mitbewerber-Angebote auf der Messe beobachtet und analysiert',
        'Team-Briefing nach Messetag durchgeführt',
        'Messebericht für das Management erstellt',
    ],
    pruefung: [
        'Prüfungsrelevante Themen wiederholt und Lücken identifiziert',
        'Karteikarten zu wichtigen Fachbegriffen erstellt',
        'Übungsaufgaben aus vergangenen Prüfungen bearbeitet',
        'Lerngruppe organisiert und gemeinsam geübt',
        'Prüfungsstoff mit Ausbilder besprochen und Fragen geklärt',
        'Zusammenfassung zu komplexem Thema angefertigt',
        'Zeitplan für Prüfungsvorbereitung erstellt',
        'Mündliche Prüfungsszenarien geübt',
    ],
    wartung: [
        'Routinecheck durchgeführt und Ergebnisse protokolliert',
        'Wartungsplan abgearbeitet und Abweichungen dokumentiert',
        'Support-Ticket bearbeitet und Problem gelöst',
        'Systeme auf Aktualität überprüft und Updates eingespielt',
        'Fehleranalyse durchgeführt und Ursache identifiziert',
        'Präventivmaßnahmen umgesetzt um Ausfälle zu vermeiden',
        'Wartungsprotokoll erstellt und archiviert',
        'Kollegen bei dringendem Problem unterstützt',
    ],
    schule: [
        'Berufsschulunterricht aufmerksam verfolgt und Mitschriften erstellt',
        'Gruppenarbeit im Unterricht aktiv mitgestaltet',
        'Fachaufgaben selbstständig bearbeitet und abgegeben',
        'Unterrichtsstoff mit eigenem Vorwissen verknüpft',
        'Nach dem Unterricht Lernmaterial organisiert',
        'Prüfungsvorbereitung für nächste Berufsschule begonnen',
    ],
};

return { PROFESSIONS, SEASONS, getCurrentSeason, SEASONAL_ACTIVITIES, UNIVERSAL_SCHULFAECHER, THEME_ACTIVITIES };
})();
