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
    'Berufsschule Audit': 'Vocational school audit',
    'Ziele & Fokus': 'Goals & focus',
    'Jahresübersicht & Insights': 'Year overview & insights',
    'Monats-Vergleich & Detailanalyse': 'Month comparison & detail analysis',
    'Wochenansicht': 'Week view',
    'AI-Bot Assistent': 'AI bot assistant',
    'Aufgaben': 'Tasks',
    'Ziele': 'Goals',

    // ─── Geteilter Footer (wird per fetch nachgeladen → nie in der statischen Pipeline) ───
    'App öffnen': 'Open app',
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
    [/Berufsschule Audit/g, 'Vocational school audit'],
    [/Ziele & Fokus/g, 'Goals & focus'],
    [/AI-Bot Assistent/g, 'AI bot assistant'],
    [/Wochenansicht/g, 'Week view'],
    [/IHK \/ Karriere/g, 'IHK / career'],
    [/Übersicht/g, 'Overview'],
    // Insight-Titel
    [/Durchschnittliche Monatsleistung/g, 'Average monthly output'],
    [/Dein stärkster Monat/g, 'Your strongest month'],
    [/Jahres-Saldo Trend/g, 'Yearly balance trend'],
    [/Konsistenz-Score/g, 'Consistency score'],
    [/Deine produktivste Woche/g, 'Your most productive week'],
    [/Jahresende Prognose/g, 'Year-end forecast'],
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
    // klein geschrieben: taucht mitten im Satz auf ("12 days | +3.5h balance").
    // Alleinstehend als Label greift stattdessen der MAP-Eintrag „Saldo".
    [/\bSaldo\b/g, 'balance'],
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
    [/\bKW (\d+)\b/g, 'CW $1'],
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
    [/\b(\d+)\/(\d+) heute\b/g, '$1/$2 today']
  ];

  // ─── Einzelwort-Regeln: NUR fuer kurze Labels ──────────────────────────
  // Diese Woerter stehen auch mitten in langen deutschen Saetzen, die (noch)
  // keine Uebersetzung haben — z.B. im Rechte-Checker. Wuerde man sie dort
  // ersetzen, entstuende Denglisch ("Dein Vacation ist gestrichen!"), also
  // schlimmer als unuebersetzt. Deshalb greifen sie nur bei kurzen Labels
  // und Tooltips: hoechstens 6 Woerter, kein Satzzeichen am Ende.
  var WORD_RULES = [
    [/\bPause\b/g, 'break'],
    [/\bFeiertag\b/g, 'Holiday'],
    [/\bUrlaub\b/g, 'Vacation'],
    [/\bBerufsschule\b/g, 'Vocational school'],
    [/\bSchule\b/g, 'School'],
    [/\bArbeit\b/g, 'Work'],
    [/\bKrank\b/g, 'Sick'],
    [/\bStunden\b/g, 'hours'],
    [/\bTage\b/g, 'days'],
    [/\bSoll\b/g, 'Target'],
    [/\bMontag\b/g, 'Monday'], [/\bDienstag\b/g, 'Tuesday'], [/\bMittwoch\b/g, 'Wednesday'],
    [/\bDonnerstag\b/g, 'Thursday'], [/\bFreitag\b/g, 'Friday'],
    [/\bSamstag\b/g, 'Saturday'], [/\bSonntag\b/g, 'Sunday']
  ];
  function isShortLabel(s) {
    if (s.length > 60) return false;
    if (/[.!?]\s/.test(s)) return false;           // enthaelt einen Satzumbruch
    if (/[.!?]["'»]?$/.test(s)) return false;      // endet als Satz → kein Label
    return s.split(/\s+/).length <= 6;
  }

  // Billiger Vorfilter, damit nicht jeder Textknoten durch alle Regeln muss.
  // Bewusst AUS DEN REGELN ABGELEITET statt handgepflegt: eine handgepflegte
  // Stichwortliste vergisst garantiert einen Trigger, und die betroffene Regel
  // feuert dann nie — genau daran blieb document.title ("MyWorkLog | Daten-
  // Analyse & Historie") deutsch. So ist der Filter per Konstruktion korrekt.
  function buildTrigger(rules) {
    return new RegExp(rules.map(function (r) { return '(?:' + r[0].source + ')'; }).join('|'));
  }
  var RULE_TRIGGER = buildTrigger(RULES);
  var WORD_TRIGGER = null; // lazy, WORD_RULES ist unten definiert

  function applyRules(s) {
    if (WORD_TRIGGER === null) WORD_TRIGGER = buildTrigger(WORD_RULES);
    if (RULE_TRIGGER.test(s)) {
      for (var i = 0; i < RULES.length; i++) s = s.replace(RULES[i][0], RULES[i][1]);
    }
    if (isShortLabel(s) && WORD_TRIGGER.test(s)) {
      for (var j = 0; j < WORD_RULES.length; j++) s = s.replace(WORD_RULES[j][0], WORD_RULES[j][1]);
    }
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
