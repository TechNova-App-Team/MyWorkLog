// ═══ AIS-SPRACHE ═══
// Alles, was aus Wortmaterial einen deutschen Satz macht: Konjugation, Genus-
// Lexikon, Artikel, die Satzmuster je Schreibform, der Fliesstext-Absatz und der
// Wochenplan-Leser. Haengt an NICHTS ausserhalb dieser Datei — deshalb laesst sie
// sich einzeln in einem vm-Kontext pruefen (siehe tools/berichtsheft-formen.test.mjs).
//
// Der Rueckgabeblock unten fuehrt bewusst auch Bausteine, die ais-studio.js nicht
// braucht (OBJ_GENUS, mitArtikel, wurde, FLIESS_*): die Tests greifen einzeln
// darauf zu, und ein Genus-Lexikon ohne Zugriff koennte man nicht pruefen.
// Herausgeloest aus pages/berichtsheft/index.html.

window.AIS_SPRACHE = (function () {
'use strict';

// ═══════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════

function pickRandom(arr, exclude = []) {
    if (!arr || arr.length === 0) return '';
    const filtered = arr.filter(item => !exclude.includes(item));
    if (filtered.length === 0) return arr[Math.floor(Math.random() * arr.length)];
    return filtered[Math.floor(Math.random() * filtered.length)];
}

function pickMultipleUnique(arr, count, exclude = []) {
    const available = arr.filter(item => !exclude.includes(item));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function conjugateVerb(verb) {
    // Partizip II Generierung (vereinfacht)
    const irregulars = {
        'entwickeln': 'entwickelt', 'implementieren': 'implementiert', 'testen': 'getestet',
        'debuggen': 'gedebugged', 'deployen': 'deployed', 'refactoren': 'refactored',
        'dokumentieren': 'dokumentiert', 'reviewen': 'reviewt', 'optimieren': 'optimiert',
        'automatisieren': 'automatisiert', 'migrieren': 'migriert', 'analysieren': 'analysiert',
        'konzipieren': 'konzipiert', 'programmieren': 'programmiert', 'integrieren': 'integriert',
        'konfigurieren': 'konfiguriert', 'installieren': 'installiert', 'warten': 'gewartet',
        'überwachen': 'überwacht', 'administrieren': 'administriert', 'sichern': 'gesichert',
        'patchen': 'gepatcht', 'troubleshooten': 'getroubleshooted', 'provisionieren': 'provisioniert',
        'bearbeiten': 'bearbeitet', 'prüfen': 'geprüft', 'verbuchen': 'verbucht',
        'erstellen': 'erstellt', 'pflegen': 'gepflegt', 'koordinieren': 'koordiniert',
        'kalkulieren': 'kalkuliert', 'archivieren': 'archiviert', 'abgleichen': 'abgeglichen',
        'kommunizieren': 'kommuniziert', 'auswerten': 'ausgewertet', 'recherchieren': 'recherchiert',
        'verdrahten': 'verdrahtet', 'messen': 'gemessen', 'inbetriebnehmen': 'in Betrieb genommen',
        'planen': 'geplant', 'verlegen': 'verlegt', 'anschließen': 'angeschlossen',
        'dimensionieren': 'dimensioniert', 'parametrieren': 'parametriert',
        'diagnostizieren': 'diagnostiziert', 'reparieren': 'repariert', 'austauschen': 'ausgetauscht',
        'einstellen': 'eingestellt', 'montieren': 'montiert', 'auslesen': 'ausgelesen',
        'lackieren': 'lackiert', 'schweißen': 'geschweißt', 'vermessen': 'vermessen',
        'instandsetzen': 'instandgesetzt', 'kalibrieren': 'kalibriert', 'befüllen': 'befüllt',
        'zubereiten': 'zubereitet', 'kochen': 'gekocht', 'backen': 'gebacken',
        'anrichten': 'angerichtet', 'dekorieren': 'dekoriert', 'portionieren': 'portioniert',
        'einlagern': 'eingelagert', 'kontrollieren': 'kontrolliert', 'reinigen': 'gereinigt',
        'bestellen': 'bestellt', 'servieren': 'serviert', 'beraten': 'beraten',
        'marinieren': 'mariniert', 'filetieren': 'filetiert',
        'pflegen': 'gepflegt', 'betreuen': 'betreut', 'assistieren': 'assistiert',
        'mobilisieren': 'mobilisiert', 'verabreichen': 'verabreicht', 'begleiten': 'begleitet',
        'anleiten': 'angeleitet', 'versorgen': 'versorgt', 'lagern': 'gelagert',
        'unterstützen': 'unterstützt', 'evaluieren': 'evaluiert',
        'schneiden': 'geschnitten', 'färben': 'gefärbt', 'föhnen': 'geföhnt',
        'waschen': 'gewaschen', 'stylen': 'gestylt', 'hochstecken': 'hochgesteckt',
        'rasieren': 'rasiert', 'tönen': 'getönt', 'blondieren': 'blondiert',
        'verkaufen': 'verkauft', 'kassieren': 'kassiert', 'einräumen': 'eingeräumt',
        'inventurisieren': 'inventarisiert', 'umtauschen': 'umgetauscht',
        'etikettieren': 'etikettiert', 'disponieren': 'disponiert',
        'kommissionieren': 'kommissioniert', 'auslagern': 'ausgelagert',
        'verpacken': 'verpackt', 'verladen': 'verladen', 'scannen': 'gescannt',
        'sortieren': 'sortiert', 'buchen': 'gebucht', 'palettieren': 'palettiert',
        'gestalten': 'gestaltet', 'entwerfen': 'entworfen', 'layouten': 'gelayoutet',
        'animieren': 'animiert', 'retouchieren': 'retouchiert', 'exportieren': 'exportiert',
        'drucken': 'gedruckt', 'präsentieren': 'präsentiert', 'illustrieren': 'illustriert',
        'rendern': 'gerendert', 'prototypen': 'prototyped',
        'drehen': 'gedreht', 'fräsen': 'gefräst', 'bohren': 'gebohrt',
        'schleifen': 'geschliffen', 'biegen': 'gebogen', 'stanzen': 'gestanzt',
        'entgraten': 'entgratet', 'härten': 'gehärtet', 'justieren': 'justiert',
        'zerspanen': 'zerspant', 'polieren': 'poliert',
        'pflanzen': 'gepflanzt', 'mähen': 'gemäht', 'bewässern': 'bewässert',
        'mulchen': 'gemulcht', 'düngen': 'gedüngt', 'jäten': 'gejätet',
        'pflastern': 'gepflastert', 'ausheben': 'ausgehoben', 'roden': 'gerodet',
        'säen': 'gesät', 'pikieren': 'pikiert',
        'mischen': 'gemischt', 'destillieren': 'destilliert', 'filtrieren': 'filtriert',
        'titrieren': 'titriert', 'synthetisieren': 'synthetisiert',
        'extrahieren': 'extrahiert', 'zentrifugieren': 'zentrifugiert',
        'wiegen': 'gewogen', 'protokollieren': 'protokolliert',
        'chromatographieren': 'chromatographiert',
        'sägen': 'gesägt', 'hobeln': 'gehobelt', 'leimen': 'geleimt',
        'furnieren': 'furniert', 'zeichnen': 'gezeichnet', 'zusammenbauen': 'zusammengebaut',
        'profilieren': 'profiliert', 'dübeln': 'gedübelt', 'verleimen': 'verleimt',
        'mauern': 'gemauert', 'betonieren': 'betoniert', 'verputzen': 'verputzt',
        'abdichten': 'abgedichtet', 'verschalen': 'verschalt', 'fundamentieren': 'fundamentiert',
        'armieren': 'armiert', 'schütten': 'geschüttet', 'stampfen': 'gestampft',
        'verfugen': 'verfugt',
        'empfangen': 'empfangen', 'reservieren': 'reserviert', 'eindecken': 'eingedeckt',
        'abrechnen': 'abgerechnet', 'desinfizieren': 'desinfiziert',
        'sterilisieren': 'sterilisiert', 'aufklären': 'aufgeklärt',
        'anmelden': 'angemeldet', 'untersuchen': 'untersucht',
        'eindecken': 'eingedeckt', 'dämmen': 'gedämmt', 'kleben': 'geklebt',
        'schrauben': 'geschraubt', 'löten': 'gelötet',
        'pressen': 'gepresst', 'spülen': 'gespült', 'entlüften': 'entlüftet',
        'konstruieren': 'konstruiert', 'organisieren': 'organisiert',
        'vorbereiten': 'vorbereitet', 'nachbereiten': 'nachbereitet',
        'überprüfen': 'überprüft', 'fertigstellen': 'fertiggestellt',
        'durchführen': 'durchgeführt', 'erledigen': 'erledigt',
        'besprechen': 'besprochen', 'härten': 'gehärtet',
        'stornieren': 'storniert', 'platzieren': 'platziert',
        'frisieren': 'frisiert', 'modellieren': 'modelliert',
        'ondulieren': 'onduliert',
    };

    if (irregulars[verb]) return irregulars[verb];

    // Fallback-Regeln
    if (verb.endsWith('ieren')) return verb.slice(0, -2) + 't';
    if (verb.endsWith('en')) return 'ge' + verb.slice(0, -2) + 't';
    return verb;
}

// ═══════════════════════════════════════
// ADVANCED SENTENCE GENERATION ENGINE
// ═══════════════════════════════════════

const SENTENCE_PATTERNS = [
    // Pattern: Simple action
    (v, o, t) => `${o} ${conjugateVerb(v)}`,
    // Pattern: With tool
    (v, o, t) => `${o} mit ${t} ${conjugateVerb(v)}`,
    // Pattern: Action-first
    (v, o, t) => `${conjugateVerb(v).charAt(0).toUpperCase() + conjugateVerb(v).slice(1)}: ${o}`,
    // Pattern: Detailed action
    (v, o, t) => `${o} fachgerecht ${conjugateVerb(v)} und dokumentiert`,
    // Pattern: Team action
    (v, o, t) => `Gemeinsam im Team: ${o} ${conjugateVerb(v)}`,
    // Pattern: Independent action
    (v, o, t) => `Selbstständig ${o} ${conjugateVerb(v)}`,
    // Pattern: Instruction-based
    (v, o, t) => `Nach Anleitung ${o} ${conjugateVerb(v)}`,
    // Pattern: With tool detailed
    (v, o, t) => `${o} mithilfe von ${t} ${conjugateVerb(v)} und überprüft`,
    // Pattern: Process
    (v, o, t) => `${o} vorbereitet, ${conjugateVerb(v)} und Ergebnis kontrolliert`,
    // Pattern: Learning
    (v, o, t) => `Neues Verfahren: ${o} ${conjugateVerb(v)} (${t})`,
    // Pattern: Problem-solving
    (v, o, t) => `Fehler bei ${o} identifiziert und behoben`,
    // Pattern: Documentation
    (v, o, t) => `${o} ${conjugateVerb(v)} — Arbeitsschritte dokumentiert`,
    // Pattern: Guided
    (v, o, t) => `Unter Aufsicht: ${o} ${conjugateVerb(v)}`,
    // Pattern: Quality check
    (v, o, t) => `Qualitätskontrolle: ${o} geprüft und ${conjugateVerb(v)}`,
    // Pattern: Project-based
    (v, o, t) => `Im Rahmen des aktuellen Projekts: ${o} ${conjugateVerb(v)}`,
];

const UNIVERSAL_ACTIVITIES_EXTENDED = [
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
    'Arbeitszeiterfassung und Stundenzettel ausgefüllt',
    'Material- und Werkzeugbestand kontrolliert',
    'Unterweisungsgespräch mit Ausbilder durchgeführt',
    'Standardarbeitsanweisung (SOP) studiert',
    'Ergonomie am Arbeitsplatz beachtet und umgesetzt',
    'Arbeitsschutzmaßnahmen überprüft',
    'Projektfortschritt besprochen und geplant',
    'Fehler im Arbeitsprozess erkannt und gemeldet',
    'Abteilungsübergreifende Zusammenarbeit',
    'Prozessoptimierung vorgeschlagen und besprochen',
];

// ═══════════════════════════════════════
// SCHREIBFORMEN — Genus, Artikel, Satzmuster
// ═══════════════════════════════════════
// Warum ein Genus-Lexikon: "Ich habe Bremsanlage geprueft" ist falsch, die
// Satzformen brauchen den Artikel. Deutsches Genus ist nicht ableitbar
// (der Server, die Firewall, das Netzwerk enden alle anders), also steht es
// hier als Datum. m/f/n = der/die/das, p = Plural.
// Vollstaendigkeit sichert tools/berichtsheft-formen.test.mjs: jedes Objekt
// aus PROFESSIONS MUSS hier stehen, sonst faellt der Test durch.
const OBJ_GENUS = (() => {
    const g = {};
    const put = (genus, list) => list.split('|').forEach(o => {
        const k = o.trim(); if (k) g[k] = genus;
    });

    put('m', `Backend-Service|Microservice|Algorithmus|Docker-Container|GraphQL-Endpoint|
                    Websocket-Handler|Caching-Layer|Auth-Service|Batch-Prozess|Server|VPN-Tunnel|
                    DHCP/DNS-Dienst|Virtualisierungs-Cluster|Mail-Server|Load-Balancer|Proxy-Server|
                    Monatsbericht|Newsletter|Schaltschrank|Elektroverteiler|Sicherungskasten|
                    Potentialausgleich|Frequenzumrichter|Schaltplan|Ölwechsel|Keilriemen|Kupplungssatz|
                    Stoßdämpfer|Buffet-Aufbau|Vorratsbestand|Ernährungsplan|Verbandswechsel|Wareneingang|
                    Lagerbestand|Umtauschvorgang|Estrichboden|Bewehrungskorb|Innenputz|Stützpfeiler|
                    Ringbalken|Sockelbereich|Dachsparren|Türrahmen|Fensterrahmen|Dachstuhl|Innenausbau|
                    Beschlag|Damenhaarschnitt|Herrenhaarschnitt|Kinderhaarschnitt|Warenausgang|
                    Kommissionierauftrag|Lagerplatz|Ladungsträger|Frachtbrief|Video-Clip|Flyer|
                    Druckauftrag|Blechzuschnitt|Metallrahmen|Prototyp|Hydraulik-Zylinder|Baumbestand|
                    Pflasterweg|Rollrasen|Reinheitsgrad|Produktionsbatch|Hygieneplan|Check-in/Check-out|
                    Wäscheservice|Flachdachaufbau|Firstziegel|Heizkörper|Speicher`);

    put('f', `Webanwendung|REST-API|Frontend-Komponente|Schnittstelle|CI/CD-Pipeline|
                    Serverless-Funktion|Middleware|Webhook-Integration|Firewall|WLAN-Infrastruktur|
                    Druckerumgebung|Zertifikats-Infrastruktur|Kostenrechnung|Präsentation|
                    Beleuchtungsanlage|SPS-Steuerung|Kabeltrasse|Brandmeldeanlage|Sprechanlage|
                    Photovoltaikanlage|Ladestation|KNX-Bustechnologie|Netzersatzanlage|Blitzschutzanlage|
                    Antriebstechnik|Erdungsanlage|Bremsanlage|Motorsteuerung|Klimaanlage|Abgasanlage|
                    Inspektion|AU/HU-Vorbereitung|Batterie/Akku|Menüfolge|Salatkreation|Garnitur|
                    Patisserie|Wundversorgung|Pflegeplanung|Körperpflege|Mobilisation|
                    Inkontinenzversorgung|Lagerungshilfe|Pflegedokumentation|Infusionstherapie|
                    Sondenernährung|Sturzprophylaxe|Dekubitusprophylaxe|Biografie-Arbeit|
                    Schaufensterdekoration|Kassenabrechnung|Kundenberatung|Reklamation|Warenbestellung|
                    Preisauszeichnung|Produktpräsentation|Inventurliste|Sonderaktion|Regalbestückung|
                    Warenbeschaffung|Kundenbindungsaktion|Backsteinmauer|Deckenplatte|Treppenanlage|
                    Fassade|Außenwand|Bodenplatte|Sturzschalung|Trennwand|Tischplatte|Holztreppe|
                    Einbauküche|Regalwand|Holzverbindung|Schubladenführung|Furnierarbeit|
                    Massivholzplatte|Arbeitsplatte|Schiebetür|Coloration|Balayage|Dauerwelle|
                    Hochsteckfrisur|Bartpflege|Haarpflegebehandlung|Strähnen-Technik|Brautfrisur|
                    Typberatung|Kopfhautbehandlung|Farbberatung|Lieferung|Palette|Sendung|
                    Retourenbearbeitung|Bestandsliste|Gefahrgut-Ladung|Tourenplanung|Social-Media-Grafik|
                    Banner-Animation|Broschüre|Bildbearbeitung|Infografik|Präsentationsvorlage|
                    Schweißkonstruktion|Gewindebohrung|Passbohrung|Rohrkonstruktion|Pneumatik-Baugruppe|
                    Vorrichtung|Rasenfläche|Hecke|Teichanlage|Grabpflege|Natursteinmauer|Probe|Lösung|
                    Versuchsreihe|Kalibrierlösung|Standardlösung|Umweltprobe|Qualitätsprobe|Titration|
                    Patientenaufnahme|Blutentnahme|EKG-Ableitung|Impfassistenz|Abrechnung (KV)|
                    Sprechstundenplanung|Medikamentenausgabe|Laborprobe|Sterilisation|Patientenakte|
                    Zimmerreinigung|Veranstaltung|Bankettplanung|Housekeeping-Kontrolle|
                    Minibar-Abrechnung|Gästebetreuung|Nachtschicht-Übergabe|Dacheindeckung|Dachdämmung|
                    Dachrinne|Unterspannbahn|Abdichtungsbahn|Schornsteineinfassung|Solaranlage|Dachgaube|
                    Fassadenbekleidung|Heizungsanlage|Sanitärinstallation|Trinkwasserleitung|
                    Abwasserleitung|Wärmepumpe|Solarthermieanlage|Badezimmer-Ausstattung|
                    Fußbodenheizung|Lüftungsanlage|Gasleitung|Zirkulation|Regelungstechnik`);

    put('n', `Datenbankmodul|UI-Feature|Login-System|Dashboard-Widget|ORM-Modell|
                    Responsive Layout|PWA-Feature|Netzwerk|Active Directory|Backup-System|Storage-System|
                    Monitoring-System|Ticketsystem|Patch-Management|Gesprächsprotokoll|Energiemessgerät|
                    Fahrwerk|Getriebe|Beleuchtungssystem|Karosserie-Teil|Steuergerät|Achslager|
                    Kraftstoffsystem|Mise en Place|Tagesmenü|Fleischgericht|Fischgericht|Mittagsmenü|
                    Schmerzmanagement|Beschäftigungsangebot|Fundament|Schalungssystem|Drainagesystem|
                    Mauerwerk|Möbelstück|Schranksystem|Werkstück|Printlayout|Webdesign-Mockup|Firmenlogo|
                    Corporate-Design-Manual|E-Mail-Template|Plakat|Verpackungsdesign|UI/UX-Design|
                    CNC-Drehteil|Fräsbauteil|Edelstahlgehäuse|Serienbauteil|Getriebebauteil|Beet|
                    Gewächshaus|Blumen-Arrangement|Staudenbeet|Pflanzgefäß|Bewässerungssystem|
                    Reaktionsgemisch|Analyseergebnis|Prüfprotokoll|Stoffgemisch|Reagenz|Recall-System|
                    Terminmanagement|Frühstücksbuffet|Tischgedeck|Reservierungssystem|
                    Beschwerdemanagement|Konferenzraum-Setup|Dachfenster|Schneefanggitter|
                    Thermostatventil`);

    put('p', `Unit-Tests|Client-PCs|Group Policies|Rechnungen|Aufträge|Kundenanfragen|Angebote|
                    Buchhaltungsbelege|Personalakten|Lieferscheine|Stammdaten|Bestellungen|Mahnungen|
                    Gutschriften|Reisekostenabrechnungen|Statistiken|Verträge|Inventurlisten|
                    Steckdosen/Schalter|Reifen/Räder|Zündkerzen|Vorspeisen|Hauptgerichte|Desserts|
                    Beilagen|Saucen|Fonds|Suppen|Vitalzeichen|Medikamente|Prophylaxen|Fensterbänke|
                    Extensions|Versandpapiere|Zollpapiere|Sträucher`);

    return g;
})();

// Sonderfaelle, bei denen der Artikel das Wort selbst veraendert:
// schwache Deklination (der Patient → den Patienten) und vorangestellte
// Adjektive, die mit Artikel ihre Endung wechseln (ein vegetarisches
// Gericht → das vegetarische Gericht).
const OBJ_SONDERFORM = {
    'Patient/in': { nom: 'die Patientin', akk: 'die Patientin' },
    'Vegetarisches Gericht': { nom: 'das vegetarische Gericht', akk: 'das vegetarische Gericht' },
    'Kalte Platte': { nom: 'die kalte Platte', akk: 'die kalte Platte' },
    'Batterie/Akku': { nom: 'die Batterie', akk: 'die Batterie' },
};

const ART_NOM = { m: 'der', f: 'die', n: 'das', p: 'die' };
const ART_AKK = { m: 'den', f: 'die', n: 'das', p: 'die' };

// Objekt mit bestimmtem Artikel. kasus: 'nom' | 'akk'.
// Unbekanntes Objekt → ohne Artikel zurueckgeben statt zu raten; ein falscher
// Artikel faellt dem Leser staerker auf als ein fehlender.
function mitArtikel(obj, kasus) {
    const sonder = OBJ_SONDERFORM[obj];
    if (sonder) return sonder[kasus] || sonder.nom;
    const g = OBJ_GENUS[obj];
    if (!g) return obj;
    return (kasus === 'akk' ? ART_AKK : ART_NOM)[g] + ' ' + obj;
}

// Verb-Kongruenz im Passiv: Plural-Objekte brauchen "wurden".
function wurde(obj) {
    return OBJ_GENUS[obj] === 'p' ? 'wurden' : 'wurde';
}

// Satzmuster je Schreibform. Jede Funktion bekommt (verb, objekt, werkzeug)
// und liefert einen fertigen Eintrag OHNE Aufzaehlungszeichen.
// 'stichpunkte' ist die alte SENTENCE_PATTERNS-Liste und bleibt wortgleich —
// die Vorgabe darf sich durch den Umbau nicht aendern.
const FORM_PATTERNS = {
    stichpunkte: SENTENCE_PATTERNS,

    saetze: [
        (v, o, t) => `${cap(mitArtikel(o, 'nom'))} ${wurde(o)} ${conjugateVerb(v)}.`,
        (v, o, t) => `${cap(mitArtikel(o, 'nom'))} ${wurde(o)} ${conjugateVerb(v)} (${t}).`,
        (v, o, t) => `${cap(mitArtikel(o, 'nom'))} ${wurde(o)} fachgerecht ${conjugateVerb(v)} und dokumentiert.`,
        (v, o, t) => `Im Team ${wurde(o)} ${mitArtikel(o, 'nom')} ${conjugateVerb(v)}.`,
        (v, o, t) => `${cap(mitArtikel(o, 'nom'))} ${wurde(o)} selbstständig ${conjugateVerb(v)}.`,
        (v, o, t) => `Nach Anleitung ${wurde(o)} ${mitArtikel(o, 'nom')} ${conjugateVerb(v)}.`,
        (v, o, t) => `${cap(mitArtikel(o, 'nom'))} ${wurde(o)} ${conjugateVerb(v)} und anschließend geprüft (${t}).`,
        (v, o, t) => `${cap(mitArtikel(o, 'nom'))} ${wurde(o)} vorbereitet, ${conjugateVerb(v)} und kontrolliert.`,
        (v, o, t) => `Unter Aufsicht ${wurde(o)} ${mitArtikel(o, 'nom')} ${conjugateVerb(v)}.`,
    ],

    ichform: [
        (v, o, t) => `Ich habe ${mitArtikel(o, 'akk')} ${conjugateVerb(v)}.`,
        (v, o, t) => `Ich habe ${mitArtikel(o, 'akk')} ${conjugateVerb(v)} (${t}).`,
        (v, o, t) => `Ich habe ${mitArtikel(o, 'akk')} selbstständig ${conjugateVerb(v)} und dokumentiert.`,
        (v, o, t) => `Gemeinsam mit einem Kollegen habe ich ${mitArtikel(o, 'akk')} ${conjugateVerb(v)}.`,
        (v, o, t) => `Nach einer kurzen Einweisung habe ich ${mitArtikel(o, 'akk')} ${conjugateVerb(v)}.`,
        (v, o, t) => `Ich habe ${mitArtikel(o, 'akk')} vorbereitet und anschließend ${conjugateVerb(v)}.`,
        (v, o, t) => `Auf Anweisung meines Ausbilders habe ich ${mitArtikel(o, 'akk')} ${conjugateVerb(v)}.`,
        (v, o, t) => `Ich habe ${mitArtikel(o, 'akk')} ${conjugateVerb(v)} und das Ergebnis geprüft (${t}).`,
        (v, o, t) => `Im Team habe ich ${mitArtikel(o, 'akk')} ${conjugateVerb(v)}.`,
    ],
};
// Fliesstext nutzt dieselben Ich-Form-Kerne und verbindet sie zu einem Absatz,
// siehe alsFliesstext().
FORM_PATTERNS.fliesstext = FORM_PATTERNS.ichform;

function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Etliche Muster enthalten ein festes Partizip ("… und dokumentiert",
// "… und anschließend geprüft"). Trifft das zufaellig gewaehlte Verb
// genau darauf, steht dasselbe Wort zweimal im Satz — "Das Getriebe
// wurde geprüft und anschließend geprüft." Solche Treffer werden
// verworfen und ein anderes Muster gezogen.
function partizipDoppelt(satz, partizip) {
    if (!partizip) return false;
    const treffer = satz.toLowerCase().split(partizip.toLowerCase()).length - 1;
    return treffer > 1;
}

// Bindewoerter fuer den Fliesstext. Reihenfolge ist die Erzaehlreihenfolge des
// Tages, deshalb feste Positionen statt Zufall — "zum Abschluss" darf nicht
// vor "zunaechst" stehen.
// Alle Bindewoerter enden auf "habe ich " und halten damit Hauptsatzstellung.
// Ein Nebensatz ("Der Montag begann damit, dass ich …") braeuchte das Hilfsverb
// am Satzende ("… repariert habe") — die Kerne liefern es aber vorn.
const FLIESS_ANFANG = ['Am {tag} habe ich zunächst ', 'Am {tag} habe ich als Erstes ', 'Zu Beginn des {tag}s habe ich '];
const FLIESS_MITTE = ['Anschließend habe ich ', 'Danach habe ich ', 'Im weiteren Verlauf habe ich ', 'Außerdem habe ich '];
const FLIESS_ENDE = ['Zum Abschluss habe ich ', 'Am Ende des Tages habe ich '];

// Baut aus Ich-Form-Saetzen EINEN Absatz. Erwartet Saetze der Form
// "Ich habe X gemacht." und schneidet das fuehrende "Ich habe " ab, damit
// das Bindewort davor passt.
function alsFliesstext(saetze, tagName) {
    const kerne = saetze
        .map(s => s.replace(/^Ich habe /, '').replace(/\.$/, '').trim())
        .filter(Boolean);
    if (kerne.length === 0) return [];
    const teile = [];
    kerne.forEach((kern, i) => {
        let bind;
        if (i === 0) bind = pickRandom(FLIESS_ANFANG).replace(/\{tag\}/g, tagName);
        else if (i === kerne.length - 1 && kerne.length > 2) bind = pickRandom(FLIESS_ENDE);
        else bind = pickRandom(FLIESS_MITTE);
        teile.push(bind + kern + '.');
    });
    return [teile.join(' ')];
}

// Eigene Berufe (Freitext im Profil) haben keine Objektliste. Damit auch sie
// Saetze statt nur Stichpunkte bekommen, gibt es diesen berufsneutralen Satz —
// mit Genus, wie alle anderen auch.
const UNIVERSAL_OBJEKTE = ['Arbeitsauftrag', 'Arbeitsplatz', 'Dokumentation', 'Materialliste',
    'Werkzeug', 'Arbeitsbericht', 'Kundenanfrage', 'Bestellung', 'Qualitätskontrolle',
    'Arbeitsablauf', 'Übergabe', 'Checkliste', 'Terminplan', 'Protokoll', 'Arbeitsschritt'];
OBJ_GENUS['Arbeitsauftrag'] = 'm'; OBJ_GENUS['Arbeitsplatz'] = 'm';
OBJ_GENUS['Dokumentation'] = 'f'; OBJ_GENUS['Materialliste'] = 'f';
OBJ_GENUS['Werkzeug'] = 'n'; OBJ_GENUS['Arbeitsbericht'] = 'm';
OBJ_GENUS['Kundenanfrage'] = 'f'; OBJ_GENUS['Bestellung'] = 'f';
OBJ_GENUS['Qualitätskontrolle'] = 'f'; OBJ_GENUS['Arbeitsablauf'] = 'm';
OBJ_GENUS['Übergabe'] = 'f'; OBJ_GENUS['Checkliste'] = 'f';
OBJ_GENUS['Terminplan'] = 'm'; OBJ_GENUS['Protokoll'] = 'n';
OBJ_GENUS['Arbeitsschritt'] = 'm';

// Nutzer-eigene Angaben (Zeiterfassung, Wochenplanung) werden NIE umformuliert —
// die lokale Engine kann das nicht, und der Originalwortlaut ist ehrlicher als
// eine generierte Floskel. Damit sie trotzdem in jede Form passen, bekommen sie
// einen Rahmen, der mit beliebigem Text grammatisch bleibt.
const FAKT_RAHMEN = {
    stichpunkte: t => t,
    saetze: t => `Bearbeitet wurde: ${t}.`,
    ichform: t => `Ich habe an folgender Aufgabe gearbeitet: ${t}.`,
};
FAKT_RAHMEN.fliesstext = FAKT_RAHMEN.ichform;

// Berufsschule je Form. Das Thema ist ein blosser Fachbegriff ("Netzwerktechnik"),
// steht also artikellos richtig — hier braucht es kein Genus.
const SCHUL_FORMATE = {
    stichpunkte: t => [
        `Berufsschule: ${t} — Unterrichtsinhalte nachbereitet`,
        `Berufsschulunterricht: ${t}. Aufgaben bearbeitet und Zusammenfassung erstellt`,
        `Berufsschultag: Thema "${t}" behandelt. Übungen durchgeführt und Notizen gemacht`,
        `${t} im Berufsschulunterricht. Lernstoff zusammengefasst und Übungsaufgaben gelöst`,
        `Berufsschule: Klassenarbeitsvorbereitung zum Thema ${t}`,
        `Berufsschultag: ${t} — Gruppenarbeit und Präsentation vorbereitet`,
    ],
    saetze: t => [
        `Im Berufsschulunterricht wurde das Thema ${t} behandelt.`,
        `In der Berufsschule wurde ${t} durchgenommen und der Lernstoff zusammengefasst.`,
        `Der Berufsschultag behandelte ${t}; dazu wurden Übungsaufgaben gelöst.`,
        `Zum Thema ${t} wurde im Unterricht eine Gruppenarbeit durchgeführt.`,
    ],
    ichform: t => [
        `In der Berufsschule habe ich das Thema ${t} behandelt.`,
        `Ich habe im Berufsschulunterricht ${t} durchgenommen und den Lernstoff zusammengefasst.`,
        `Am Berufsschultag habe ich zu ${t} Übungsaufgaben gelöst.`,
        `Ich habe zum Thema ${t} eine Gruppenarbeit vorbereitet.`,
    ],
};
SCHUL_FORMATE.fliesstext = SCHUL_FORMATE.ichform;

const LERN_AKTIVITAETEN = {
    stichpunkte: [
        'Berufsschulheft nachgeführt und Lernstoff zusammengefasst',
        'Übungsaufgaben aus dem Unterricht bearbeitet',
        'Mit Mitschülern Gruppenarbeit durchgeführt',
        'Hausaufgaben für nächsten Berufsschultag erledigt',
        'Lernmaterial für bevorstehende Prüfung organisiert',
        'Fachbegriffe und Definitionen wiederholt',
        'Online-Lernplattform genutzt und Aufgaben bearbeitet',
    ],
    saetze: [
        'Das Berufsschulheft wurde nachgeführt und der Lernstoff zusammengefasst.',
        'Übungsaufgaben aus dem Unterricht wurden bearbeitet.',
        'Mit Mitschülern wurde eine Gruppenarbeit durchgeführt.',
        'Die Hausaufgaben für den nächsten Berufsschultag wurden erledigt.',
        'Fachbegriffe und Definitionen wurden wiederholt.',
    ],
    ichform: [
        'Ich habe mein Berufsschulheft nachgeführt und den Lernstoff zusammengefasst.',
        'Ich habe Übungsaufgaben aus dem Unterricht bearbeitet.',
        'Ich habe mit Mitschülern eine Gruppenarbeit durchgeführt.',
        'Ich habe die Hausaufgaben für den nächsten Berufsschultag erledigt.',
        'Ich habe Fachbegriffe und Definitionen wiederholt.',
    ],
};
LERN_AKTIVITAETEN.fliesstext = LERN_AKTIVITAETEN.ichform;

// Umfang → Anzahl Eintraege pro Tag. Frueher hiess das "complexity" und
// bediente zwei Bedeutungen gleichzeitig (Menge UND Anspruch); der Anspruch
// haengt jetzt allein am Lehrjahr.
const UMFANG_COUNT = {
    kurz: { min: 3, max: 3 },
    mittel: { min: 4, max: 5 },
    ausfuehrlich: { min: 6, max: 7 },
};

// ═══════════════════════════════════════
// WOCHENPLAN AUS DEM FREITEXT
// ═══════════════════════════════════════
// 🔴 Der Freitext ist die beste Quelle, die es gibt — er beschreibt echte
// Arbeit. Bis v6.4.16 hat ihn nur der Cloud-Prompt gelesen; die lokale
// Engine schickte ihn durch eine Stichwortliste mit zwoelf Buero-Begriffen
// (Rechnung, Lieferschein, Lager, Kunde …) und VERWARF alles andere. Ein
// Fachinformatiker, der "Mo: alte PCs abgebaut, 3 neue aufgebaut" schrieb,
// bekam davon null Eintraege, ohne jeden Hinweis — gemessen: 8 Fragmente
// rein, 0 raus. Eine laengere Liste waere dieselbe Falle fuer den naechsten
// Beruf, deshalb gibt es gar keine mehr: was der Nutzer schreibt, steht im
// Bericht (vgl. "Nutzerangaben werden nie umformuliert" in der Notiz).

// Lange Formen zuerst, sonst schluckt "mo" den Anfang von "montag".
// Bewusst NUR die zweibuchstabigen deutschen Kuerzel: "mit", "die", "don"
// und "fre" waeren als Marke katastrophal — "Die Server wurden geprueft"
// ist kein Dienstag. Die Wortgrenze haelt "Montage" von "Montag" fern,
// dieselbe Falle wie beim Foto-Import.
const PLAN_MARKE = /(^|[\n\r;,.!?]\s*)(montag|monday|dienstag|tuesday|mittwoch|wednesday|donnerstag|thursday|freitag|friday|mon|tue|wed|thu|fri|mo|di|mi|do|fr)\b\s*[:.\-–—]?\s*/gi;

const PLAN_TAG_INDEX = {
    montag: 0, monday: 0, mon: 0, mo: 0,
    dienstag: 1, tuesday: 1, tue: 1, di: 1,
    mittwoch: 2, wednesday: 2, wed: 2, mi: 2,
    donnerstag: 3, thursday: 3, thu: 3, do: 3,
    freitag: 4, friday: 4, fri: 4, fr: 4,
};

// "Schulung" enthaelt kein "schule" — faellt hier also nicht hinein.
// Die englischen Formen braucht /en/; "vocational school" steht vor
// "school", damit beim Fach-Ausschneiden nicht "vocational" stehenbleibt.
const PLAN_SCHULE = /\b(berufs?schul(e|tag)|blockunterricht|schultag|schule|vocational\s+school|school)\b/i;

function _parseWochenplan(text) {
    const perDay = {};
    const schoolDays = [];
    const rest = [];
    if (!text || typeof text !== 'string') return { perDay, schoolDays, rest };

    // Eine Tagesmarke zaehlt nur am Anfang oder direkt hinter einem
    // Trenner. "Deployment am Freitag" macht deshalb keinen neuen Tag auf,
    // sondern bleibt beim vorigen — raten waere hier schlechter als lassen.
    const treffer = [];
    PLAN_MARKE.lastIndex = 0;
    let m;
    while ((m = PLAN_MARKE.exec(text)) !== null) {
        treffer.push({
            tag: PLAN_TAG_INDEX[m[2].toLowerCase()],
            markeAb: m.index + m[1].length,
            textAb: m.index + m[0].length,
        });
        if (m.index === PLAN_MARKE.lastIndex) PLAN_MARKE.lastIndex++;
    }

    const vorErsterMarke = treffer.length > 0 ? text.slice(0, treffer[0].markeAb) : text;
    _planStuecke(vorErsterMarke).forEach(t => rest.push(t));

    treffer.forEach((tr, i) => {
        const bis = i + 1 < treffer.length ? treffer[i + 1].markeAb : text.length;
        let abschnitt = text.slice(tr.textAb, bis);

        if (PLAN_SCHULE.test(abschnitt)) {
            if (!schoolDays.includes(tr.tag)) schoolDays.push(tr.tag);
            // Das Fach steht im Rest des Abschnitts ("Berufsschule, Thema
            // Subnetting und VLAN" → "Subnetting und VLAN"). Ein gewuerfeltes
            // Fach waere schlechter als das, was der Nutzer selbst nennt.
            abschnitt = abschnitt
                .replace(PLAN_SCHULE, ' ')
                .replace(/^[\s,;:.\-–—]+/, '')
                .replace(/^thema\s*:?\s*/i, '');
        }

        const stuecke = _planStuecke(abschnitt);
        if (stuecke.length === 0) return;
        perDay[tr.tag] = (perDay[tr.tag] || []).concat(stuecke);
    });

    schoolDays.sort((a, b) => a - b);
    return { perDay, schoolDays, rest };
}

// Zerlegt an Kommas und Zeilenumbruechen, NICHT an "und": "eingerichtet und
// getestet" gehoert zusammen, sonst steht "getestet" als eigener Eintrag im
// Berichtsheft. Genau daran ist die alte Stichwort-Zerlegung gescheitert.
function _planStuecke(abschnitt) {
    return String(abschnitt || '')
        .split(/[,;\n\r]|\s+•\s*|\s+-\s+/)
        .map(t => t.replace(/^[\s.\-–—:]+/, '').replace(/[\s.]+$/, '').trim())
        .filter(t => t.length > 2)
        .slice(0, 6);
}

// Der Stichpunkt kommt woertlich in den Bericht; nur der erste Buchstabe
// wird gross, weil "• alte pcs abgebaut" im IHK-Heft nach Versehen
// aussieht. Kein Umformulieren — die Engine koennte es nicht, und der
// Originalwortlaut ist ohnehin ehrlicher als eine generierte Floskel.
function _planEintrag(text, form, rahmen) {
    const t = String(text || '').trim();
    if (!t) return '';
    if (form === 'stichpunkte') return t.charAt(0).toUpperCase() + t.slice(1);
    return rahmen(t);
}

return {
    pickRandom, pickMultipleUnique, shuffleArray, conjugateVerb,
    SENTENCE_PATTERNS, UNIVERSAL_ACTIVITIES_EXTENDED,
    OBJ_GENUS, OBJ_SONDERFORM, ART_NOM, ART_AKK, mitArtikel, wurde,
    FORM_PATTERNS, cap, partizipDoppelt,
    FLIESS_ANFANG, FLIESS_MITTE, FLIESS_ENDE, alsFliesstext,
    UNIVERSAL_OBJEKTE, FAKT_RAHMEN, SCHUL_FORMATE, LERN_AKTIVITAETEN, UMFANG_COUNT,
    PLAN_MARKE, PLAN_TAG_INDEX, PLAN_SCHULE, _parseWochenplan, _planStuecke, _planEintrag,
};
})();
