// ═══ I18N-RUNTIME (EN) MODULE ═══
// Übersetzt LAUFZEIT-generierten deutschen Text auf den /en/-Seiten.
// Die statische Pipeline (tools/i18n) übersetzt nur Text, der IM HTML steht.
// Alles was JS erst zur Laufzeit einfügt (Eintrag-Typen im <select>, Chart-
// Labels, History-Pills, Toasts …) bleibt sonst deutsch. Dieses Script fängt
// genau das ab — NUR wenn <html lang="en">. Auf der deutschen Seite passiert
// NICHTS (kein Overhead, kein Risiko).
//
// Neuer deutscher JS-String sichtbar auf /en/? → hier ins MAP eintragen. Fertig.
(function () {
  'use strict';
  if (document.documentElement.lang !== 'en') return; // nur englische Seiten

  // Deutsch → Englisch. Nur ANZEIGE-Strings (App-Logik keyt auf IDs, nicht Labels).
  var MAP = {
    // ── P2P Geräte-Sync (p2p-sync.js baut das komplett in JS) ──
    // Geprüft: 'Verbunden'/'Nicht verbunden' kommen NUR in p2p-sync.js vor,
    // 'Offline' ist in beiden Sprachen gleich. Keine Kollision mit anderen Modals.
    'Verbunden': 'Connected',
    'Nicht verbunden': 'Not connected',
    'Rolle wählen': 'Pick a role',
    'Sendet · Code weitergeben': 'Sending · pass the code on',
    'Empfängt · Code eingeben': 'Receiving · enter the code',
    'Verbindung herstellen': 'Connect',
    'Erneut versuchen': 'Try again',
    'Code verarbeiten': 'Use this code',
    'Verarbeite …': 'Working …',
    'Verbinde …': 'Connecting …',
    'Antwort-Code erzeugt': 'Reply code created',
    '1 Gerät': '1 device',
    'keine Netzwerkwege': 'no network routes',
    // ICE-Zustände NICHT hier: p2pIceLabel() liefert sie über p2pL() direkt
    // englisch, weil sie in längere Strings eingesetzt werden ("Netzwerk: …")
    // und ein MAP-Eintrag immer den ganzen Textknoten braucht.
    // Log- und Meldungstexte
    'Verbindung hergestellt': 'Connection established',
    'Verbindung getrennt': 'Connection closed',
    'Kein Relay verfügbar': 'No relay available',
    'Starte Übertragung …': 'Starting transfer …',
    'Führe Einträge zusammen …': 'Merging entries …',
    'Synchronisation abgeschlossen': 'Transfer complete',
    'Alle Daten gesendet, warte auf Bestätigung …': 'All data sent, waiting for confirmation …',
    'Keine Einträge vorhanden': 'No entries yet',
    'Abbruch: keine Netzwerkwege gefunden': 'Stopped: no network routes found',
    'Teste Relay-Server …': 'Testing relay servers …',
    'Getrennt': 'Disconnected',
    'Kopiert': 'Copied',
    'Code fehlt': 'Code missing',
    'Code ungültig': 'Invalid code',
    'Code fehlgeschlagen': 'Could not create code',
    'Schon verarbeitet': 'Already used',
    'Keine Verbindung möglich': 'Cannot connect',
    'Verbindung fehlgeschlagen': 'Connection failed',
    'Synchronisiert': 'Synced',
    'Übertragung bestätigt': 'Transfer confirmed',
    'Direkte Verbindung steht. Daten werden übertragen.': 'Direct connection is up. Data is being transferred.',
    'Die Verbindung wurde beendet.': 'The connection was closed.',
    'Einladungscode liegt in der Zwischenablage.': 'The invite code is on your clipboard.',
    'Antwort-Code liegt in der Zwischenablage.': 'The reply code is on your clipboard.',
    'Füge den Einladungscode vom anderen Gerät ein.': 'Paste the invite code from the other device.',
    'Füge den Antwort-Code vom anderen Gerät ein.': 'Paste the reply code from the other device.',
    'Stelle zuerst eine Verbindung zu einem Gerät her.': 'Connect to a device first.',
    // Eintrag-Typen (custom-types-fields.js DEFAULT_ENTRY_TYPES + typeLabels-Maps)
    'Arbeit': 'Work',
    'Schule': 'School',
    'Berufsschule': 'Vocational school',
    'Urlaub': 'Vacation',
    'Gleittag': 'Flex day',
    'Krank': 'Sick',
    'Krankheit': 'Sickness',
    'Feiertag': 'Holiday',
    'Korrektur': 'Correction',
    // Typ-Beschreibungen
    'Normale Arbeitszeit': 'Regular working time',
    'Berufsschule / Noten': 'Vocational school / grades',
    'Urlaubstage': 'Vacation days',
    'Gleittag (Überstundenabbau)': 'Flex day (overtime reduction)',
    'Krankheitstage': 'Sick days',
    'Offizielle Feiertage': 'Official public holidays',
    'Manuelle Saldo-Korrektur (z.B. Angleichung ans Firmen-System)': 'Manual balance correction (e.g. aligning with the company system)',
    // Häufige dynamische Kurz-Labels
    'Projekt': 'Project',
    'Notiz': 'Note',
    'Gesamt': 'Total',
    'Stunden': 'Hours',
    'Heute': 'Today',
    'Woche': 'Week',
    'Monat': 'Month',
    'Jahr': 'Year',
    'Keine Daten': 'No data',
    'Keine Einträge': 'No entries',
    'Wird geladen…': 'Loading…',
    'Wird geladen...': 'Loading...',
    'Soll': 'Target',
    'Ist': 'Actual',
    'Differenz': 'Difference',
    'Saldo': 'Balance',
    // Manuelles App-Update (updateManager.forceUpdate → showToast)
    'App wird aktualisiert': 'Updating app',
    'Neue Version wird geladen – die Seite lädt gleich neu.': 'Loading the new version – the page will reload shortly.',
    // Wochentage (Chart-Achsen, Tages-Labels, JS-generiert)
    'Montag': 'Monday', 'Dienstag': 'Tuesday', 'Mittwoch': 'Wednesday',
    'Donnerstag': 'Thursday', 'Freitag': 'Friday', 'Samstag': 'Saturday', 'Sonntag': 'Sunday',
    'Mo': 'Mon', 'Di': 'Tue', 'Mi': 'Wed', 'Do': 'Thu', 'Fr': 'Fri', 'Sa': 'Sat', 'So': 'Sun',
    // Monate (Charts, Datums-Labels)
    'Januar': 'January', 'Februar': 'February', 'März': 'March', 'April': 'April',
    'Mai': 'May', 'Juni': 'June', 'Juli': 'July', 'August': 'August',
    'September': 'September', 'Oktober': 'October', 'November': 'November', 'Dezember': 'December',
    // Kurzformen: stehen in 21 hartcodierten Arrays quer durch die Komponenten
    // (['Jan','Feb','Mär',…]). Nur diese vier unterscheiden sich vom Englischen.
    'Mär': 'Mar', 'Mrz': 'Mar', 'Okt': 'Oct', 'Dez': 'Dec',
    // Motivations-Hinweise (mobile-nav-extras.js showSmartNotification)
    '✨ Schönes Wochenende!': '✨ Have a great weekend.',
    'Dein Tag ist voll! Genieß die Freizeit! 🏖️': 'Your day is complete — enjoy the time off. 🏖️',
    // Motivations-Zeilen der Aufgaben-Seite (MOTS in pages/aufgaben/index.html)
    'Heute kann dein bester Tag werden.': 'Today can be your best day yet.',
    'Der erste Schritt zählt.': 'The first step is the one that counts.',
    'Du bist am Laufen — bleib dran.': "You're rolling — keep at it.",
    'Momentum aufgebaut.': 'Momentum built.',
    'Guter Start. Du bist auf Kurs.': 'Good start. You are on track.',
    'Ein Viertel geschafft.': 'A quarter done.',
    'Halbzeit. Du schaffst das.': 'Halfway there. You have got this.',
    'Die zweite Hälfte gehört dir.': 'The second half is yours.',
    'Fast geschafft — noch ein Push.': 'Almost there — one more push.',
    '75% durch — Endspurt.': '75% through — final stretch.',
    'Nur noch ein paar — fokussiert bleiben.': 'Just a few left — stay focused.',
    'So nah am Ziel.': 'So close to the finish.',
    'Perfekter Tag.': 'Perfect day.',
    'Alles erledigt.': 'All done.',

    // ─── Saldo-Korrektur-Dialog (dashboard.js, komplett JS-gebaut) ───
    'Saldo anpassen': 'Adjust balance',
    'Manuelle Korrektur, z.B. Angleichung ans Firmen-System':
      'Manual correction, e.g. to match the company system',
    'Aktueller Saldo': 'Current balance',
    'Methode': 'Method',
    'Ziel-Saldo': 'Target balance',
    '− Abziehen': '− Subtract',
    '+ Hinzufügen': '+ Add',
    'Minuten': 'Minutes',
    'Neuer Soll-Saldo (Stunden)': 'New target balance (hours)',
    'Korrektur-Buchung': 'Correction entry',
    'Neuer Saldo': 'New balance',
    'Grund': 'Reason',
    'Angleichung Firmen-System': 'Aligned with company system',
    'Buchen': 'Book',
    'Datum': 'Date',

    // ─── Fahrtkosten-Seite (JS-gerendert) ───
    'Kurze Pendelstrecke ✓': 'Short commute ✓',
    'Mittlere Pendelstrecke': 'Medium commute',
    'Lange Pendelstrecke': 'Long commute',
    'KM / TAG': 'KM / DAY',
    'Startadresse (Zuhause)': 'Start address (home)',
    'Zieladresse (Betrieb / Berufsschule)': 'Destination (workplace / vocational school)',
    'Zugverbindung suchen': 'Find a train connection',
    'Fernbus-Verbindung': 'Long-distance coach',
    'Mitfahrgelegenheit finden': 'Find a rideshare',
    'Fahrrad-Route planen': 'Plan a cycling route',
    '49€ Monatsticket Info': 'About the €49 monthly ticket',
    'Auto': 'Car',
    'Fahrrad': 'Bicycle',
    'Zu Fuß': 'On foot',
    'Öffentlich': 'Public transport',

    // ─── Sidebar- und Command-Palette-Labels ───
    // Die Sidebar wird aus data.settings.nav gerendert, die Labels liegen also
    // in den NUTZERDATEN und nicht im HTML — die statische Pipeline kann sie
    // gar nicht sehen. Deshalb hier.
    'Verlauf': 'History',
    'Fahrtkosten': 'Commuting costs',
    'Jahresansicht': 'Year view',
    'Monatsansicht': 'Month view',
    'Monatvergleich': 'Month comparison',
    'Neu': 'New',
    'Anleitung / Tour': 'Guide / tour',
    'Untis Import': 'Untis import',
    'Aufgaben Manager': 'Task manager',
    'Skill-Baum': 'Skill tree',
    'Rechte-Checker': 'Rights checker',
    'Vertrags-Manager': 'Contract manager',
    'Repo-Analyse': 'Repo analysis',
    'Backup / Export': 'Backup / export',
    'Schatten-Berichtsheft': 'Shadow logbook',
    'FI Academy': 'FI Academy',
    'IT Professional Hub': 'IT professional hub',
    'IHK': 'IHK',
    'Ghost Mode': 'Ghost mode',

    // ─── Saldo-Trend-Karte (charts.js renderTrend: Richtung + Volatilitaet) ───
    'Steigend': 'Rising', 'Fallend': 'Falling', 'Stabil': 'Stable',
    'Leicht ↑': 'Slightly ↑', 'Leicht ↓': 'Slightly ↓',
    'Positiv': 'Positive', 'Negativ': 'Negative',
    'Niedrig': 'Low', 'Mittel': 'Medium', 'Hoch': 'High',
    // ─── Urlaubs-KPI (dashboard-ui.js) ───
    'Urlaubsstunden': 'Vacation hours',
    // ─── Settings: Typ-/Feld-Manager und Cloud-Tab (JS-gerendert) ───
    'Noch keine abgeschlossenen Jahre vorhanden.': 'No completed years yet.',
    'Deine Typen': 'Your types',
    'Noch keine eigenen Typen': 'No custom types yet',
    'Erstelle z.B. „Fitness", „Coaching" oder „Pendeln" für genauere Tracking-Kategorien.':
      'Create types like "fitness", "coaching" or "commuting" for more precise tracking categories.',
    'Neuer Eintrag-Typ': 'New entry type',
    'Deine Felder': 'Your fields',
    'Noch keine Custom Fields': 'No custom fields yet',
    'Erweitere Einträge um eigene Felder wie „Client", „Billable" oder „Projekt-Code".':
      'Extend entries with your own fields such as "client", "billable" or "project code".',
    'Vor 1 Stunde': '1 hour ago', 'Vor 24h': '24h ago',
    'Vor 7 Tagen': '7 days ago', 'Vor 30 Tagen': '30 days ago',
    'Nutze die Buttons um manuell hoch- oder runterzuladen.': 'Use the buttons to upload or download manually.',
    'Alle Systeme operational': 'All systems operational',

    // ─── Aufgaben-Seite ───
    'Einstellungen': 'Settings',
    'Ein-/Ausklappen': 'Expand / collapse',
    'Aufgabe hinzufügen…': 'Add task…',
    'Kategorie': 'Category',
    'Erinnerung': 'Reminder',

    // ─── Fahrtkosten ───
    'Route mit allen Verkehrsmitteln': 'Route with all modes of transport',

    // ─── Vertrags-Manager ───
    'Läuft': 'Active',
    'Gehalt / Monat': 'Salary / month',
    '1. Jahr': 'Year 1', '2. Jahr': 'Year 2', '3. Jahr': 'Year 3', '4. Jahr': 'Year 4',
    'Busvergütung': 'Bus allowance',
    'Position': 'Position',

    // ─── Berichtsheft ───
    '💡 Gib eine Abteilung ein (z.B. "Bäckerei", "Maurer", "IT") — die AI denkt mit.':
      '💡 Enter a department (e.g. "bakery", "bricklaying", "IT") — the AI takes it from there.',
    // Häufige Toast-/Status-Wörter (JS-generiert quer über Tool-Seiten)
    'Gespeichert': 'Saved', 'Gespeichert!': 'Saved!', 'Gelöscht': 'Deleted', 'Kopiert': 'Copied',
    'Kopiert!': 'Copied!', 'Fehler': 'Error', 'Erfolg': 'Success', 'Fertig': 'Done',
    'Abgebrochen': 'Cancelled', 'Rückgängig': 'Undo', 'Vollständig': 'Complete',
    'Unvollständig': 'Incomplete', 'Unterschrieben': 'Signed', 'In Bearbeitung': 'In progress',
    'Offen': 'Open', 'Erledigt': 'Done', 'Alle': 'All',
    'Mehr': 'More', 'Weniger': 'Less', 'Aktiv': 'Active', 'Inaktiv': 'Inactive',
    'Keine': 'None', 'Ja': 'Yes', 'Nein': 'No', 'Speichern': 'Save', 'Abbrechen': 'Cancel',
    'Zurück': 'Back', 'Weiter': 'Next', 'Öffnen': 'Open',
    'Hinzufügen': 'Add', 'Entfernen': 'Remove',
    'Suchen': 'Search', 'Filtern': 'Filter', 'Sortieren': 'Sort',
    // Analytics-Karte „Herkunft" (insights.js: Tooltip, Zoom-Steuerung, Hinweis)
    'Besucher': 'Visitors',
    'Vergrößern': 'Zoom in',
    'Verkleinern': 'Zoom out',
    'Zurücksetzen': 'Reset',
    'Zum Zoomen scrollen · Ziehen zum Verschieben': 'Scroll to zoom · drag to pan',
    // Feature-Nutzung / Custom-Events (insights.js EVENT_LABELS + eventLabel())
    'Eintrag erstellt': 'Entry created',
    'Eintrag bearbeitet': 'Entry edited',
    'Timer benutzt': 'Timer used',
    'Daten exportiert': 'Data exported',
    'App installiert': 'App installed',
    'Ansicht: Übersicht': 'View: Overview',
    'Ansicht: Historie': 'View: History',
    'Ansicht: Performance': 'View: Performance',
    'Ansicht: IHK / Karriere': 'View: IHK / Career',
    'Ansicht: Berufsschule': 'View: Vocational school',
    'Ansicht: Ziele': 'View: Goals',
    'Ansicht: Jahresübersicht': 'View: Year overview',
    'Ansicht: Monats-Vergleich': 'View: Month comparison',
    'Ansicht: Wochenansicht': 'View: Week view',
    'Ansicht: AI-Bot': 'View: AI bot',
    'Ansicht: Support': 'View: Support',
    'Ansicht: Analytics Pro': 'View: Analytics Pro',
    'Ansicht: Aufgaben': 'View: Tasks',
    'Noch keine Events — die Feature-Erfassung läuft erst seit dem letzten Update.': 'No events yet — feature tracking only started with the latest update.',
    // Auto-Recovery / Speicher-Toasts (state-config.js loadPersistedData, storage-save.js save).
    // Titel sind emoji-frei, weil showCustomMessage das Leading-Emoji strippt (cleanTitle).
    // Der „aus Backup wiederhergestellt"-Body interpoliert einen Zeitstempel → nicht exakt
    // matchbar → bleibt auf /en/ deutsch (seltener Recovery-Fall, Titel übersetzt trotzdem).
    'Daten wiederhergestellt': 'Data recovered',
    'Daten beschädigt': 'Data corrupted',
    'Deine lokal gespeicherten Daten konnten nicht gelesen werden und es war kein lokales Backup verfügbar. Lade deine Daten aus der Cloud, um sie wiederherzustellen.': 'Your locally stored data could not be read and no local backup was available. Load your data from the cloud to restore it.',
    'Speicher voll': 'Storage full',
    'Deine Änderung konnte nicht gespeichert werden — der lokale Speicher ist voll. Bitte exportiere ein Backup und leere den Papierkorb.': 'Your change could not be saved — local storage is full. Please export a backup and empty the trash.',

    // ─── View-Titel (tab-navigation.js `titles` → .page-title + document.title) ───
    'Übersicht': 'Overview',
    'Daten-Analyse & Historie': 'Data analysis & history',
    'Performance Analyse': 'Performance analysis',
    'IHK / Karriere': 'IHK / career',
    'Berufsschule & Noten': 'Vocational school & grades',
    'Ziele & Fokus': 'Goals & focus',
    'Jahresübersicht & Insights': 'Year overview & insights',
    'Monats-Vergleich & Detailanalyse': 'Month comparison & detail analysis',
    'Wochenansicht': 'Week view',
    // Sidebar-Label + Command-Palette + Seitentitel. Steht in
    // data.settings.nav bzw. wird von tab-navigation.js erzeugt — die
    // statische Pipeline sieht davon nichts.
    'Urlaubsplaner': 'Vacation planner',
    'AI-Bot Assistent': 'AI bot assistant',
    'Aufgaben': 'Tasks',
    'Ziele': 'Goals',

    // ─── Geteilter Footer (wird per fetch nachgeladen → nie in der statischen Pipeline) ───
    'App öffnen': 'Open app',
    'Daten übernehmen': 'Import your data',
    'Über uns': 'About us',
    'Datenschutz': 'Privacy',
    'Impressum': 'Legal notice',
    'Navigation': 'Navigation',
    'Kontakt': 'Contact',
    'Die kostenlose Zeiterfassung für Auszubildende. Open Source, DSGVO-konform & offline-first.':
      'The free time tracker for apprentices. Open source, GDPR-compliant and offline-first.',

    // ─── Wetter-Karte (weather.js) ───
    'Klar': 'Clear', 'Überwiegend klar': 'Mostly clear', 'Bewölkt': 'Cloudy',
    'Teilweise bewölkt': 'Partly cloudy', 'Bedeckt': 'Overcast', 'Nebel': 'Fog',
    'Nieselregen': 'Drizzle', 'Regen': 'Rain', 'Leichter Regen': 'Light rain',
    'Starker Regen': 'Heavy rain', 'Schneefall': 'Snow', 'Schnee': 'Snow',
    'Gewitter': 'Thunderstorm', 'Schauer': 'Showers', 'Wind': 'Wind',
    'Stadt ändern': 'Change city', 'Schließen': 'Close',

    // ─── Kurz-Labels aus Karten/Charts/Tooltips ───
    'Kein Eintrag': 'No entry',
    'Keine Alerts – alles läuft perfekt!': 'No alerts — everything is running perfectly.',
    'Alle ausblenden': 'Hide all',
    'Alle einblenden': 'Show all',
    'Intervall (Wochen)': 'Interval (weeks)',
    'Über/Unterstunden': 'Over/under time',
    'Überstunden': 'Overtime',
    'Ø pro Tag': 'Avg. per day',
    'Stunden gesamt': 'Total hours',
    'Tage dabei': 'Days on board',
    'Einträge': 'Entries',
    'Bearbeiten': 'Edit',
    'Löschen': 'Delete',
    'Tracking': 'Tracking',
    'Sehr sparsam': 'Very economical',
    'Sehr gut!': 'Very good.',
    'Könnte besser sein': 'Could be better',
    'Neutral': 'Neutral',

    // ─── Saldo-Trend Diagramm-Einstellungen (openChartStyleModal, dashboard.js) ───
    // Komplett JS-gebaut (Template-Strings), deshalb hier und nicht im Dict.
    'Saldo Trend': 'Balance trend',
    'Diagramm-Stil, Effekte & Animation anpassen': 'Adjust chart style, effects and animation',
    'Diagramm-Typ': 'Chart type',
    'Linie': 'Line',
    'Fläche': 'Area',
    'Balken': 'Bars',
    'Farbe': 'Color',
    'Website-Farbe': 'Website color',
    'Nutzt deinen Akzent aus den Einstellungen': 'Uses your accent color from Settings',

    // Ghost-Mode-Skin: Hinweiszeile unter der Auswahl (settings, JS-generiert)
    'Der Panic-Button zeigt immer eine Tabellenkalkulation.': 'The panic button always shows a spreadsheet.',
    'Der Panic-Button zeigt immer einen Code-Editor.': 'The panic button always shows a code editor.',
    'Richtet sich nach deinem Beruf — aktuell: Tabelle.': 'Follows your occupation — currently: Spreadsheet.',
    'Richtet sich nach deinem Beruf — aktuell: Code-Editor.': 'Follows your occupation — currently: Code editor.',
    'Linienstärke': 'Line width',
    'Linienstil': 'Line style',
    'Voll': 'Solid',
    'Gestrichelt': 'Dashed',
    'Gepunktet': 'Dotted',
    'Datenpunkte': 'Data points',
    'Punkt an jedem Messwert': 'Dot at every data point',
    'Aktueller-Wert-Puls': 'Current-value pulse',
    'Pulsierender Punkt am letzten Wert': 'Pulsing dot on the latest value',
    'Effekte': 'Effects',
    'Flächen-Gradient': 'Area gradient',
    'Farbverlauf unter der Linie (Fläche/Smooth)': 'Color gradient below the line (area/smooth)',
    'Glow / Neon': 'Glow / neon',
    'Leuchtender Schein um die Linie': 'Glowing halo around the line',
    'Glow-Intensität': 'Glow intensity',
    'Regenbogen': 'Rainbow',
    'Animierter Farbverlauf auf der Linie': 'Animated color gradient on the line',
    'Weichzeichnen': 'Soft blur',
    'Verträumte, weiche Flächenfüllung': 'Dreamy, soft area fill',
    'Raster & Achsen': 'Grid & axes',
    'Gitternetz': 'Grid',
    'Nulllinie': 'Zero line',
    'Linie/Balken beim Laden aufbauen': 'Draw the line/bars on load',
    'Tempo': 'Speed',

    // ─── Arbeitszeit-Verteilung Balken-Einstellungen (openDonutStyleModal, dashboard.js) ───
    // Teilt sich Animation/Tempo/Fusszeile mit dem Trend-Modal oben.
    'Arbeitszeit-Verteilung': 'Working time distribution',
    'Darstellung des Balkendiagramms anpassen': 'Adjust the bar chart appearance',
    'Vorschau': 'Preview',
    'Abspielen': 'Play',
    'Darstellung': 'Appearance',
    'Balkenhöhe': 'Bar height',
    'Eckenradius': 'Corner radius',
    'Segment-Abstand': 'Segment gap',
    'Optionen': 'Options',
    'Prozente im Balken': 'Percentages inside the bar',
    'Zahl direkt im Segment anzeigen': 'Show the number inside the segment',
    'Sanfte Animation': 'Smooth animation',
    'Balken füllen sich beim Laden': 'Bars fill up on load',
    'Glow-Effekt': 'Glow effect',
    'Leuchtender Schein um die Segmente': 'Glowing halo around the segments',

    // ─── Deutsche Feiertage (vacation-holidays.js) ───
    'Neujahr': "New Year's Day",
    'Heilige Drei Könige': 'Epiphany',
    'Karfreitag': 'Good Friday',
    'Ostersonntag': 'Easter Sunday',
    'Ostermontag': 'Easter Monday',
    'Tag der Arbeit': 'Labour Day',
    'Christi Himmelfahrt': 'Ascension Day',
    'Pfingstsonntag': 'Whit Sunday',
    'Pfingstmontag': 'Whit Monday',
    'Fronleichnam': 'Corpus Christi',
    'Mariä Himmelfahrt': 'Assumption Day',
    'Tag der Deutschen Einheit': 'German Unity Day',
    'Reformationstag': 'Reformation Day',
    'Allerheiligen': "All Saints' Day",
    'Buß- und Bettag': 'Day of Repentance and Prayer',
    'Heiligabend': 'Christmas Eve',
    '1. Weihnachtsfeiertag': 'Christmas Day',
    '2. Weihnachtsfeiertag': 'Boxing Day',
    'Silvester': "New Year's Eve",
    'Weltkindertag': "World Children's Day",
    'Internationaler Frauentag': "International Women's Day"
  };

  // ─── Muster für Text mit eingesetzten Werten ───────────────────────────
  // Exakte Treffer deckt MAP ab. Alles, wo JS Zahlen/Daten hineinschreibt
  // ("vor 2d", "Ø Saldo: +1.5h"), braucht ein Muster. Reihenfolge zählt:
  // spezifische Regeln vor allgemeinen, sonst frisst die allgemeine zuerst.
  var RULES = [
    // ── P2P Geräte-Sync: Texte mit eingesetzten Zahlen (können nicht ins MAP) ──
    // 🔴 Jede Zeile aus p2pLog() traegt ein Zeitstempel-Praefix "[HH:MM:SS] ".
    // Ein reines ^-Anker-Muster trifft deshalb NIE — die Gruppe (TS)? faengt es
    // ab und gibt es unveraendert zurueck. Gilt fuer jede neue Log-Regel hier.
    [/^(\[\d\d:\d\d:\d\d\] )?Verbindung hergestellt$/g, '$1Connection established'],
    [/^(\[\d\d:\d\d:\d\d\] )?Verbindung getrennt$/g, '$1Connection closed'],
    [/^(\[\d\d:\d\d:\d\d\] )?Starte Übertragung …$/g, '$1Starting transfer …'],
    [/^(\[\d\d:\d\d:\d\d\] )?Führe Einträge zusammen …$/g, '$1Merging entries …'],
    [/^(\[\d\d:\d\d:\d\d\] )?Synchronisation abgeschlossen$/g, '$1Transfer complete'],
    [/^(\[\d\d:\d\d:\d\d\] )?Alle Daten gesendet, warte auf Bestätigung …$/g,
      '$1All data sent, waiting for confirmation …'],
    [/^(\[\d\d:\d\d:\d\d\] )?Keine Einträge vorhanden$/g, '$1No entries yet'],
    [/^(\[\d\d:\d\d:\d\d\] )?Kein Relay verfügbar$/g, '$1No relay available'],
    [/^(\[\d\d:\d\d:\d\d\] )?Teste Relay-Server …$/g, '$1Testing relay servers …'],
    [/^(\[\d\d:\d\d:\d\d\] )?Abbruch: keine Netzwerkwege gefunden$/g,
      '$1Stopped: no network routes found'],
    [/^(\[\d\d:\d\d:\d\d\] )?Abbruch: Zeitüberschreitung nach (\d+)s$/g,
      '$1Stopped: timed out after $2s'],
    [/^(\[\d\d:\d\d:\d\d\] )?Gathering abgekürzt nach (\d+)s$/g,
      '$1Route search cut short after $2s'],
    [/^(\[\d\d:\d\d:\d\d\] )?Paket (\d+)\/(\d+) gesendet \((\d+) Einträge\)$/g,
      '$1Packet $2/$3 sent ($4 entries)'],
    [/^(\[\d\d:\d\d:\d\d\] )?Paket (\d+)\/(\d+) empfangen$/g, '$1Packet $2/$3 received'],
    [/^(\[\d\d:\d\d:\d\d\] )?Gegenstelle "(.+)" meldet (\d+) Einträge$/g,
      '$1Peer "$2" reports $3 entries'],
    [/^(\[\d\d:\d\d:\d\d\] )?Zusammengeführt: (\d+) neu, (\d+) aktualisiert, (\d+) unverändert$/g,
      '$1Merged: $2 new, $3 updated, $4 unchanged'],
    [/^(\[\d\d:\d\d:\d\d\] )?Gegenstelle bestätigt: (\d+) empfangen, (\d+) übernommen$/g,
      '$1Peer confirmed: $2 received, $3 applied'],
    [/^(\[\d\d:\d\d:\d\d\] )?(\d+) Relay-Weg\(e\) verfügbar$/g, '$1$2 relay route(s) available'],
    [/^(\[\d\d:\d\d:\d\d\] )?Kein Relay — Verbindung nur direkt oder im selben Netz$/g,
      '$1No relay — direct connection or same network only'],
    [/^(\[\d\d:\d\d:\d\d\] )?Relay OK: (\d+) Relay, (\d+) STUN, (\d+) lokal$/g,
      '$1Relay OK: $2 relay, $3 STUN, $4 local'],
    [/^(\[\d\d:\d\d:\d\d\] )?Kein Relay: (\d+) STUN, (\d+) lokal$/g,
      '$1No relay: $2 STUN, $3 local'],
    [/^(\[\d\d:\d\d:\d\d\] )?Netzwerk: (.+)$/g, '$1Network: $2'],
    [/^(\[\d\d:\d\d:\d\d\] )?Fehler: (.+)$/g, '$1Error: $2'],
    [/^(\[\d\d:\d\d:\d\d\] )?Relay-Test fehlgeschlagen: (.+)$/g, '$1Relay test failed: $2'],
    // Statuszeilen ausserhalb des Logs (kein Zeitstempel)
    [/^Suche Netzwerkwege …\s+([\d.,]+)s$/g, 'Looking for network routes …  $1s'],
    [/^Netzwerkwege gefunden: (\d+)\s+·\s+([\d.,]+)s$/g, 'Network routes found: $1  ·  $2s'],
    [/(\d+)× lokal/g, '$1× local'],
    [/(\d+)× über STUN/g, '$1× via STUN'],
    [/(\d+)× über Relay/g, '$1× via relay'],
    [/^Gegenstelle: (.+)$/g, 'Peer: $1'],
    [/^Letzte Übertragung:$/g, 'Last transfer:'],

    // ── Ganze Saetze zuerst ── sonst zerlegt eine Wort-Regel weiter unten den
    // Satz ("Saldo" → "balance") und das Satz-Muster trifft nicht mehr.
    [/Du arbeitest durchschnittlich ([\d.,]+) Stunden pro Monat\./g,
      'You work an average of $1 hours per month.'],
    [/Du arbeitest durchschnittlich ([\d.,]+)h pro Tag\. Überlege, Pausen einzulegen oder Urlaub zu planen\./g,
      'You work an average of $1h per day. Consider taking breaks or planning some time off.'],
    [/Dein Jahres-Saldo ist positiv\. Solltest du mehr arbeiten, um auszugleichen\?/g,
      'Your yearly balance is positive. Should you work more to even it out?'],
    [/Dein Jahres-Saldo ist negativ\. Solltest du mehr arbeiten, um auszugleichen\?/g,
      'Your yearly balance is negative. Should you work more to even it out?'],
    [/Dein Jahres-Saldo ist ausgeglichen\. Solltest du mehr arbeiten, um auszugleichen\?/g,
      'Your yearly balance is even. Should you work more to even it out?'],
    [/Du warst Sehr gut dabei\./g, 'You kept it up very well.'],
    [/Du warst Gut dabei\./g, 'You kept it up well.'],
    [/Du warst Könnte besser sein dabei\./g, 'Your consistency could be better.'],
    [/Versuche, regelmäßiger zu arbeiten!/g, 'Try to work more regularly.'],
    [/Großartig!/g, 'Great work.'],
    [/([\d.,]+)h Saldo in dieser Woche\. Das war ein Spitzenwert!/g,
      '$1h balance that week — your best result.'],
    [/Basierend auf deinem aktuellen Tempo wirst du mit einem Saldo von ([\d.,+-]+)h das Jahr beenden\./g,
      'At your current pace you will finish the year with a balance of $1h.'],
    [/([\d.,]+)h Arbeit, (\d+) Arbeitstage\./g, '$1h worked across $2 working days.'],
    [/Service Worker aktuell \((v[\d.]+)\) — Update vollständig geladen\./g,
      'Service worker up to date ($1) — update fully loaded.'],
    [/Du liegst aktuell extrem weit im unteren grünen Spektrum/g,
      'You are currently far down in the green range'],
    [/Überdurchschnittlich, aber IHK-technisch noch sicher/g,
      'Above average, but still safe for IHK purposes'],
    [/Keine Berufsschule \(Regulär\)/g, 'No vocational school (regular)'],
    [/Zuletzt geprüft:/g, 'Last checked:'],
    [/Zuletzt aktualisiert:/g, 'Last updated:'],
    [/Aktualisiert (\d{2}:\d{2})/g, 'Updated $1'],
    [/Erstellt am:/g, 'Created:'],
    // View-Titel auch innerhalb von document.title ("MyWorkLog | Übersicht")
    [/Daten-Analyse & Historie/g, 'Data analysis & history'],
    [/Monats-Vergleich & Detailanalyse/g, 'Month comparison & detail analysis'],
    [/Jahresübersicht & Insights/g, 'Year overview & insights'],
    [/Performance Analyse/g, 'Performance analysis'],
    [/Berufsschule & Noten/g, 'Vocational school & grades'],
    [/Ziele & Fokus/g, 'Goals & focus'],
    [/AI-Bot Assistent/g, 'AI bot assistant'],
    [/Wochenansicht/g, 'Week view'],
    [/Urlaubsplaner/g, 'Vacation planner'],
    [/IHK \/ Karriere/g, 'IHK / career'],
    [/Übersicht/g, 'Overview'],
    // Insight-Titel
    [/Durchschnittliche Monatsleistung/g, 'Average monthly output'],
    [/Dein stärkster Monat/g, 'Your strongest month'],
    [/Jahres-Saldo Trend/g, 'Yearly balance trend'],
    [/Konsistenz-Score/g, 'Consistency score'],
    [/Deine produktivste Woche/g, 'Your most productive week'],
    [/Jahresende Prognose/g, 'Year-end forecast'],
    // Begruessung im Dashboard-Kopf (weather.js updateGreetingWeather).
    // Muss eine Regel sein, kein MAP-Eintrag: der Nutzername haengt im selben
    // Textknoten ("Guten Abend, Sven") und darf natuerlich nicht angefasst werden.
    [/\bGuten Morgen\b/g, 'Good morning'],
    [/\bGuten Vormittag\b/g, 'Good morning'],
    [/\bGuten Nachmittag\b/g, 'Good afternoon'],
    [/\bGuten Abend\b/g, 'Good evening'],
    [/\bGute Nacht\b/g, 'Good night'],
    [/\bWetter anzeigen\b/g, 'Show weather'],
    // Eintragstypen NUR verankert ersetzen — hinter dem Typ-Emoji oder als
    // Segment zwischen Trennzeichen. Freistehend waeren sie zu gefaehrlich
    // (siehe Kommentar bei den geloeschten WORD_RULES).
    [/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*)Berufsschule\b/gu, '$1Vocational school'],
    [/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*)Feiertag\b/gu, '$1Holiday'],
    [/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*)Urlaub\b/gu, '$1Vacation'],
    [/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*)Arbeit\b/gu, '$1Work'],
    [/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*)Schule\b/gu, '$1School'],
    [/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?\s*)Krank\b/gu, '$1Sick'],
    [/([+\-][\d.,]+h) Saldo\b/g, '$1 balance'],
    // Wetter-Karte (weather.js)
    [/\bGefühlt ([\d.,-]+)°/g, 'Feels like $1°'],
    [/\bGefühlt\b/g, 'Feels like'],
    [/\bFeuchte\b/g, 'Humidity'],
    // Cloud-Buttons (api-cloud-sync.js)
    [/\bWiederherstellen…/g, 'Restoring…'],
    [/\bWiederherstellen\b/g, 'Restore'],
    // Export-Meldung (history-export.js)
    [/\bExport gestartet\b/g, 'Export started'],
    [/Export von (\d+) gefilterten Einträgen als (\w+) wird vorbereitet/g,
      'Preparing an export of $1 filtered entries as $2'],
    // Eintrag-Info-Texte: von der App erzeugt und im Eintrag gespeichert
    // (e.info), tauchen in Historie, Tooltips und Detail-Ansicht auf.
    [/\bManuell \(/g, 'Manual ('],
    [/\bKrankmeldung\b/g, 'Sick note'],
    [/\bKrankheit\b/g, 'Sickness'],
    [/\bUrlaubstag\b/g, 'Vacation day'],
    [/\bBerufsschule - /g, 'Vocational school – '],
    [/([\d.,]+)h Unterricht → ([\d.,]+)h angerechnet/g, '$1h of lessons → $2h credited'],
    [/\bUngerade\b/g, 'odd week'],
    [/\bGerade\b/g, 'even week'],
    [/inkl\. ([\d.,]+) Übertrag aus Vorjahr/g, 'incl. $1 carried over from last year'],
    [/([\d.,]+h) ungenutzt/g, '$1 unused'],
    [/Ø ([\d.,]+)h gearbeitet um/g, 'avg. $1h worked at'],
    [/\bHoch: /g, 'High: '],
    [/\bTief: /g, 'Low: '],
    [/\(Vormonat\)/g, '(previous month)'],
    [/\(Aktuell\)/g, '(current)'],
    [/\bAktuelle Streak\b/g, 'Current streak'],
    [/\bGearbeitet\b/g, 'Worked'],
    [/\bArbeitstage\b/g, 'Working days'],
    [/\bFortschritt\b/g, 'Progress'],
    [/\bWochenende\b/g, 'Weekend'],
    [/\bSupport & Community\b/g, 'Support & community'],
    [/\bAktualisieren\b/g, 'Refresh'],
    [/(\w{2}): Eingetragen/g, '$1: logged'],
    [/⚠️ Leicht negativ/g, '⚠️ Slightly negative'],
    [/\bLeicht positiv\b/g, 'Slightly positive'],
    [/\bSehr positiv\b/g, 'Very positive'],
    [/\bUnbekannt\b/g, 'Unknown'],
    // Wochentage und Monate auch INNERHALB laengerer Texte ("Berufsschule -
    // Mittwoch (…)", "Juni (Vormonat)"). Eindeutig deutsch, koennen also nicht
    // versehentlich englischen Text treffen — deshalb hier statt in WORD_RULES.
    [/\bMontag\b/g, 'Monday'], [/\bDienstag\b/g, 'Tuesday'], [/\bMittwoch\b/g, 'Wednesday'],
    [/\bDonnerstag\b/g, 'Thursday'], [/\bFreitag\b/g, 'Friday'],
    [/\bSamstag\b/g, 'Saturday'], [/\bSonntag\b/g, 'Sunday'],
    [/\bJanuar\b/g, 'January'], [/\bFebruar\b/g, 'February'], [/\bMärz\b/g, 'March'],
    [/\bJuni\b/g, 'June'], [/\bJuli\b/g, 'July'], [/\bOktober\b/g, 'October'],
    [/\bDezember\b/g, 'December'],
    // Relative Zeitangaben (utils.js formatRelativeTime & Co.)
    [/\bvor (\d+) Sekunden?\b/g, '$1s ago'],
    [/\bvor (\d+) Min\.?\b/g, '$1 min ago'],
    [/\bvor (\d+) Minuten?\b/g, '$1 min ago'],
    [/\bvor (\d+) Stunden?\b/g, '$1 h ago'],
    [/\bvor (\d+) Tagen?\b/g, '$1 d ago'],
    [/\bvor (\d+) Wochen?\b/g, '$1 w ago'],
    [/\bvor (\d+)([dhwm])\b/g, '$1$2 ago'],
    [/\bgerade eben\b/gi, 'just now'],
    // Eintrag-Info: "07:00 - 16:30 (30m Pause)"
    [/\((\d+)m Pause\)/g, '($1 min break)'],
    [/\((\d+) Min\.? Pause\)/g, '($1 min break)'],
    // Wochentags-Platzhalter im Berichtsheft
    [/\bMontag: Tätigkeiten beschreiben/g, 'Monday: describe your activities'],
    [/\bDienstag: Tätigkeiten beschreiben/g, 'Tuesday: describe your activities'],
    [/\bMittwoch: Tätigkeiten beschreiben/g, 'Wednesday: describe your activities'],
    [/\bDonnerstag: Tätigkeiten beschreiben/g, 'Thursday: describe your activities'],
    [/\bFreitag: Tätigkeiten beschreiben/g, 'Friday: describe your activities'],
    [/\bSamstag: Tätigkeiten beschreiben/g, 'Saturday: describe your activities'],
    // Saldo-/Kennzahl-Tooltips
    [/Ø Saldo:/g, 'Avg. balance:'],
    [/\bSaldo:/g, 'Balance:'],
    [/\bKein Eintrag\b/g, 'No entry'],
    [/\bvon ([\d.,]+)h Soll\b/g, 'of $1h target'],
    [/\b(\d+) Schule · (\d+) Krank\b/g, '$1 school · $2 sick'],
    [/\bin (\d+) Fächern\b/g, 'across $1 subjects'],
    [/\b(\d+) Tage absolviert\b/g, '$1 days completed'],
    [/\b(\d+) Arbeitstage?\b/g, '$1 working days'],
    [/\b(\d+) Tage Datenbasis\b/g, '$1 days of data'],
    [/\bØ ([+\-]?\d+) min\/Tag\b/g, 'avg. $1 min/day'],
    [/\bGenauigkeit: Hoch\b/g, 'Accuracy: high'],
    [/\bGenauigkeit: Mittel\b/g, 'Accuracy: medium'],
    [/\bGenauigkeit: Niedrig\b/g, 'Accuracy: low'],
    [/\bPrognose bis\b/g, 'Forecast to'],
    [/\bReferenz ([\d.,]+)h\/Tag\b/g, 'reference $1h/day'],
    [/\b(\d+) Requests — alles OK\b/g, '$1 requests — all OK'],
    [/\bKlick: Jetzt syncen — letzter Upload\b/g, 'Click: sync now — last upload'],
    [/\bKlick: Bei Cloud anmelden\b/g, 'Click: sign in to the cloud'],
    [/\bKlick: Erstes Mal in die Cloud hochladen\b/g, 'Click: upload to the cloud for the first time'],
    [/\bUpdate lädt noch: App (v[\d.]+), aktiver SW (v[\d.]+)\. Nach kurzem Warten oder Reload gleichen sie sich an\./g,
      'Update still loading: app $1, active SW $2. They line up after a short wait or a reload.'],
    // Wochen-/Monats-Labels
    [/\bWoche (\d+)\b/g, 'Week $1'],
    [/\bKW ?(\d+)\b/g, 'CW $1'],
    [/● Aktiv\b/g, '● Active'],
    [/\b1\. Weihnachtstag\b/g, 'Christmas Day'],
    [/\b2\. Weihnachtstag\b/g, 'Boxing Day'],
    [/\b(\d+) Krankheitstage?\b/g, '$1 sick days'],
    [/\b(\d+) Urlaubstage?\b/g, '$1 vacation days'],
    [/\b(\d+) Feiertage?\b/g, '$1 public holidays'],
    [/\b(\d+) Monate aktiv\b/g, '$1 months active'],
    [/\b(\d+) Monate\b/g, '$1 months'],
    [/\bGesamt \((\d+) J\.\)/g, 'Total ($1 yrs)'],
    [/\bVergünstigung\b/g, 'Discount'],
    [/\bLive aus Dashboard (\d+)\b/g, 'Live from dashboard $1'],
    [/\bhours-Modus\b/g, 'hours mode'],
    [/\bStunden-Modus\b/g, 'hours mode'],
    [/\bTage-Modus\b/g, 'days mode'],
    // Restliche Einheiten
    [/\/Tag\b/g, '/day'],
    [/\/Woche\b/g, '/week'],
    [/\/Monat\b/g, '/month'],
    [/\/Jahr\b/g, '/year'],
    [/\bpro Tag\b/g, 'per day'],
    [/\bpro Woche\b/g, 'per week'],
    [/\bpro Monat\b/g, 'per month'],
    [/\b(\d+) Tage\b/g, '$1 days'],
    [/\b(\d+) Einträge\b/g, '$1 entries'],
    [/\b(\d+) Aufgaben\b/g, '$1 tasks'],
    [/\b(\d+) Stunden\b/g, '$1 hours'],
    [/\b(\d+) von (\d+) Wochen dokumentiert\b/g, '$1 of $2 weeks documented'],
    [/\b(\d+)\/(\d+) heute\b/g, '$1/$2 today'],
    // Tempo-Label im Diagramm-Modal (speedLabel() in dashboard.js): "Schnell · 800ms".
    // Verankert an " · <n>ms", damit das nackte Wort nirgends sonst getroffen wird.
    // "Normal" braucht keine Regel — im Englischen identisch.
    [/\bSchnell · (\d+)ms/g, 'Fast · $1ms'],
    [/\bLangsam · (\d+)ms/g, 'Slow · $1ms']
  ];

  // ─── Einzelwort-Regeln: NUR fuer kurze Labels ──────────────────────────
  // Diese Woerter stehen auch mitten in langen deutschen Saetzen, die (noch)
  // keine Uebersetzung haben — z.B. im Rechte-Checker. Wuerde man sie dort
  // ersetzen, entstuende Denglisch ("Dein Vacation ist gestrichen!"), also
  // schlimmer als unuebersetzt. Deshalb greifen sie nur bei kurzen Labels
  // und Tooltips: hoechstens 6 Woerter, kein Satzzeichen am Ende.
  // ─── Frueher: WORD_RULES (freie Einzelwoerter, begrenzt auf kurze Labels) ───
  // Ersatzlos gestrichen. Die Laengenheuristik war nicht zu retten: "Saldo
  // anpassen" und "Zieladresse (Betrieb / Berufsschule)" sind kurze Labels und
  // wurden zu "balance anpassen" bzw. "Zieladresse (Betrieb / Vocational
  // school)" — halb uebersetzt ist schlechter als gar nicht. Ein Einzelwort
  // ohne Kontext laesst sich nicht sicher ersetzen; jeder Fall, der es
  // wirklich braucht, steht jetzt als VERANKERTE Regel in RULES (Emoji davor,
  // Trennzeichen, Zahl daneben). Was dort nicht steht, bleibt deutsch — das
  // ist die ehrlichere Anzeige und faellt beim DE/EN-Vergleich sofort auf.

  // Billiger Vorfilter, damit nicht jeder Textknoten durch alle Regeln muss.
  // Bewusst AUS DEN REGELN ABGELEITET statt handgepflegt: eine handgepflegte
  // Stichwortliste vergisst garantiert einen Trigger, und die betroffene Regel
  // feuert dann nie — genau daran blieb document.title ("MyWorkLog | Daten-
  // Analyse & Historie") deutsch. So ist der Filter per Konstruktion korrekt.
  // Achtung: Regeln mit \u{…}-Escapes brauchen das u-Flag. Ohne das Flag ist
  // \u{1F300} ein ungueltiger Quantifier — new RegExp wirft, und weil das auf
  // Modul-Ebene passiert, stirbt der komplette Uebersetzer lautlos (kein
  // Console-Fehler in der Seite, nur: nichts wird mehr uebersetzt).
  // Deshalb: erst mit u versuchen, dann ohne, im Zweifel Filter abschalten.
  var ALWAYS = { test: function () { return true; } };
  function buildTrigger(rules) {
    var src = rules.map(function (r) { return '(?:' + r[0].source + ')'; }).join('|');
    try { return new RegExp(src, 'u'); } catch (e) { /* weiter unten */ }
    try { return new RegExp(src); } catch (e) { return ALWAYS; }
  }
  var RULE_TRIGGER = buildTrigger(RULES);

  function applyRules(s) {
    if (!RULE_TRIGGER.test(s)) return s;
    for (var i = 0; i < RULES.length; i++) s = s.replace(RULES[i][0], RULES[i][1]);
    return s;
  }

  // Attribute, die ebenfalls Nutzertext tragen können
  var ATTRS = ['title', 'placeholder', 'aria-label'];
  var SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, TEXTAREA: 1 };

  function translate(str) {
    var key = str.trim();
    if (!key) return null;
    if (MAP.hasOwnProperty(key)) return MAP[key];
    var ruled = applyRules(key);
    return ruled === key ? null : ruled;
  }

  function translateTextNode(node) {
    var v = node.nodeValue;
    if (!v) return;
    var out = translate(v);
    if (out === null) return;
    node.nodeValue = v.match(/^\s*/)[0] + out + v.match(/\s*$/)[0];
  }

  function translateEl(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (el.hasAttribute && el.hasAttribute(a)) {
        var val = el.getAttribute(a);
        if (!val) continue;
        var out = translate(val);
        if (out !== null) el.setAttribute(a, out);
      }
    }
  }

  // ── Interne Links auf die englischen Seiten ziehen ──────────────────────
  // Links, die IM HTML stehen, biegt schon die statische Pipeline um. Was per
  // fetch nachkommt — vor allem der geteilte Footer — braucht denselben Griff
  // hier, sonst faellt man aus /en/ mit einem Klick zurueck ins Deutsche.
  // Die Zuordnung kommt aus dem vom Renderer eingebetteten JSON-Block, damit
  // es keine zweite, driftende Liste gibt.
  var LINKS = (function () {
    try {
      var el = document.getElementById('i18nLinkMap');
      return el ? JSON.parse(el.textContent) : null;
    } catch (e) { return null; }
  })();

  function localizeLink(el) {
    if (!LINKS || el.tagName !== 'A') return;
    var href = el.getAttribute('href');
    if (!href || href.charAt(0) !== '/' || href.charAt(1) === '/') return;
    if (href.slice(0, 4) === '/en/') return;
    if (el.hasAttribute('hreflang')) return;   // bewusster Sprachwechsel
    var cut = href.search(/[?#]/);
    var pathOnly = cut < 0 ? href : href.slice(0, cut);
    var target = LINKS[pathOnly];
    if (target) el.setAttribute('href', target + (cut < 0 ? '' : href.slice(cut)));
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    // TEXTAREA steht in SKIP, damit der vom Nutzer getippte INHALT unangetastet
    // bleibt. Das Attribut placeholder ist aber UI-Text und muss trotzdem
    // uebersetzt werden — sonst bleibt jedes Eingabefeld deutsch beschriftet.
    if (SKIP[root.tagName]) {
      if (root.tagName === 'TEXTAREA') translateEl(root);
      return;
    }
    translateEl(root);
    localizeLink(root);
    for (var n = root.firstChild; n; n = n.nextSibling) walk(n);
  }

  // rAF-gedrosselter Observer: fängt spät nachgeladene/aktualisierte Labels
  var queued = false;
  var pending = [];
  var pendingAttrs = [];
  function flush() {
    queued = false;
    var nodes = pending, attrs = pendingAttrs;
    pending = []; pendingAttrs = [];
    for (var i = 0; i < nodes.length; i++) walk(nodes[i]);
    // Attribut-Aenderungen brauchen nur das Element selbst, kein Subtree-Walk —
    // sonst kostet ein title-Update auf einem Container den ganzen Baum.
    for (var j = 0; j < attrs.length; j++) translateEl(attrs[j]);
  }
  // In einem versteckten Tab feuert requestAnimationFrame NICHT — die Queue
  // bliebe liegen und beim Zurueckwechseln stuende dort deutscher Text.
  // Deshalb im Hintergrund auf setTimeout ausweichen.
  function nextTick(fn) {
    if (document.hidden || typeof requestAnimationFrame !== 'function') setTimeout(fn, 16);
    else requestAnimationFrame(fn);
  }
  function enqueue() {
    if (!queued) { queued = true; nextTick(flush); }
  }
  function schedule(node) { pending.push(node); enqueue(); }
  function scheduleAttr(el) { pendingAttrs.push(el); enqueue(); }

  // document.title liegt ausserhalb von <body> und wird von switchTab() bei
  // jedem View-Wechsel neu gesetzt — der Body-Observer sieht das nie.
  var lastTitle = '';
  function translateDocTitle() {
    if (document.title === lastTitle) return;
    var out = translate(document.title);
    if (out !== null) document.title = out;
    // Auch der uebersetzte Wert wird gemerkt, sonst laeuft die Pruefung endlos.
    lastTitle = document.title;
  }

  function start() {
    walk(document.body);
    translateDocTitle();
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { schedule(m.target); continue; }
        // Attribut in place geaendert (el.title = …): kein childList-Event,
        // deshalb muss der Knoten selbst nochmal durch translateEl.
        if (m.type === 'attributes') { scheduleAttr(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) schedule(m.addedNodes[j]);
      }
    });
    obs.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    // <title> separat beobachten
    var t = document.querySelector('title');
    if (t) new MutationObserver(translateDocTitle).observe(t, { childList: true, characterData: true, subtree: true });
    // Nachzügler (App-Init füllt Selects/Charts leicht verzögert)
    setTimeout(function () { walk(document.body); translateDocTitle(); }, 400);
    setTimeout(function () { walk(document.body); translateDocTitle(); }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
