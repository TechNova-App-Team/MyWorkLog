/* ═══ AUFGABEN ════════════════════════════════════════════════════════
 *
 * Arbeitsplatz mit vier Ansichten (Heute, Geplant, Alle, Erledigt) und den
 * Listen des Nutzers. Eine Aufgabe ist ausgewaehlt oder nicht; das Detail
 * rechts zeigt die Auswahl und speichert jede Aenderung sofort.
 *
 * 🔴 Was bleibt und was neu ist — fuer den naechsten Umbau:
 *
 * 1. Speicherformat bleibt: `mwl_tasks_cats` (Listen mit Aufgaben) und
 *    `mwl_tasks_states` (id → true). Das Berichtsheft liest die Listen
 *    (Assets/js/berichtsheft/ais-studio.js, `_loadAufgabenForWeek`) und
 *    verlaesst sich auf `cat.days`, `task.days` und `task.name`.
 *
 * 2. Neu je Aufgabe: `doneAt` (ISO-Zeitpunkt). Ohne ihn gab es kein
 *    Logbuch und keine Wiederholung: `recurring` war bis v7.1.1 ein
 *    Etikett ohne Wirkung. `rollRecurring()` oeffnet erledigte Aufgaben
 *    zu Beginn der naechsten Periode wieder und schiebt ein Datum weiter.
 *
 * 3. Heute = ueberfaellig + heute faellig + ohne Datum an den eingestellten
 *    Tagen (`days` an Liste oder Aufgabe). Das ist dieselbe Tageslogik wie
 *    frueher (`onDay`), nur dass ein Datum jetzt Vorrang hat. Fuer andere
 *    Tage gibt es weiterhin keinen Erledigt-Zustand (CLAUDE.md) — deshalb
 *    zeigt Geplant nur DATIERTE Aufgaben mit Haken und Routinen als Zahl.
 *
 * 4. Ohne Liste geht es trotzdem: die erste Aufgabe legt „Eingang" an.
 *    Die alte Fassung verlangte erst eine Kategorie.
 *
 * 5. Symbole sind Lucide-Namen; Alt-Emojis aus den Daten werden beim
 *    Zeichnen uebersetzt (`agIcon`), nie migriert.
 *
 * Test: node tools/aufgaben.test.mjs
 */
(function () {
    'use strict';

    /* ─── Sprache ──────────────────────────────────────────────────────
       Die statische /en/-Pipeline sieht nur das HTML. Alles, was hier
       erzeugt wird, braucht ein eigenes Woerterbuch.                    */
    var EN = (document.documentElement.lang || 'de').toLowerCase().indexOf('en') === 0;
    var LOCALE = EN ? 'en-GB' : 'de-DE';

    var T = EN ? {
        dayShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dayLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', later: 'Later', earlier: 'Earlier',
        vToday: 'Today', vUpcoming: 'Upcoming', vAll: 'All', vDone: 'Done',
        subUpcoming: 'The next days', subAll: 'Every list', subDone: 'Log',
        secOverdue: 'Overdue', secToday: 'Today', secOpen: 'Open', secDone: 'Done', secDoneToday: 'Done today',
        secNoDate: 'No date',
        routines: '{n} routines', routine: '1 routine',
        inbox: 'Inbox', everyDay: 'Every day', onDays: 'On {d}',
        reopens: { daily: 'reopens daily', weekly: 'reopens weekly', monthly: 'reopens monthly' },
        recur: { daily: 'Daily', weekdays: 'Mon to Fri', weekly: 'Weekly', monthly: 'Monthly' },
        prio: { high: 'High', medium: 'Medium', low: 'Low' },
        open: 'open', task: 'task', tasks: 'tasks', of: 'of', done: 'done', total: 'in total',
        due: 'Due', list: 'List', noList: 'No list called "{n}"',
        emptyNothing: 'Nothing on the list.', emptyNothingS: 'Type what needs doing above. "tomorrow", "!!" and "#list" are picked up while you type.',
        emptyFree: 'Free for today.', emptyFreeS: 'Everything is done or nothing is scheduled. Upcoming shows what comes next.',
        emptyUpcoming: 'Nothing dated yet.', emptyUpcomingS: 'Give a task a date, for example "Report Fri" or "Docs 24.09.".',
        emptyDone: 'Nothing done yet.', emptyDoneS: 'Checked-off tasks land here with their date.',
        emptyList: 'This list is empty.', emptyListS: 'Type a task above.',
        kindTask: 'Task', kindList: 'List',
        created: 'Created {d}', doneOn: 'Done {d}', tasksInList: '{n} tasks in this list',
        deleted: 'Task deleted', listDeleted: 'List deleted', undo: 'Undo',
        askDelListT: 'Delete list?', askDelListM: '"{n}" and its {c} will be deleted.',
        askResetT: 'Reset today?', askResetM: 'Every task done today is marked open again. Lists and settings stay.',
        askWipeT: 'Delete everything?', askWipeM: 'All lists, tasks and the log are deleted for good. This cannot be undone.',
        askImportT: 'Confirm import', askImportM: '{n} lists will be loaded. Your current data is replaced.',
        badFileT: 'Unusable file', badFileM: 'This is not a task export. Expected a JSON file holding a "categories" array.',
        askNotifT: 'Turn on reminders?', askNotifM: 'MyWorkLog can send a browser notification when a task is due. You can turn it off again in your browser settings.',
        yesNotif: 'Turn on', notNow: 'Not now',
        cancel: 'Cancel', del: 'Delete', reset: 'Reset', importIt: 'Import', ok: 'OK',
        exported: 'Exported', imported: 'Imported', resetDone: 'Today is open again', wiped: 'All data deleted',
        stillOpen: 'Still open: ', noteLbl: 'Note', doneLbl: 'Done: '
    } : {
        dayShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
        dayLong: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        today: 'Heute', tomorrow: 'Morgen', yesterday: 'Gestern', later: 'Später', earlier: 'Früher',
        vToday: 'Heute', vUpcoming: 'Geplant', vAll: 'Alle', vDone: 'Erledigt',
        subUpcoming: 'Die nächsten Tage', subAll: 'Alle Listen', subDone: 'Logbuch',
        secOverdue: 'Überfällig', secToday: 'Heute', secOpen: 'Offen', secDone: 'Erledigt', secDoneToday: 'Heute erledigt',
        secNoDate: 'Ohne Datum',
        routines: '{n} Routinen', routine: '1 Routine',
        inbox: 'Eingang', everyDay: 'Jeden Tag', onDays: 'Am {d}',
        reopens: { daily: 'öffnet sich täglich neu', weekly: 'öffnet sich wöchentlich neu', monthly: 'öffnet sich monatlich neu' },
        recur: { daily: 'Täglich', weekdays: 'Mo bis Fr', weekly: 'Wöchentlich', monthly: 'Monatlich' },
        prio: { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' },
        open: 'offen', task: 'Aufgabe', tasks: 'Aufgaben', of: 'von', done: 'erledigt', total: 'insgesamt',
        due: 'Fällig', list: 'Liste', noList: 'Keine Liste „{n}“',
        emptyNothing: 'Nichts steht an.', emptyNothingS: 'Schreib oben, was ansteht. „morgen“, „!!“ und „#Liste“ werden beim Tippen erkannt.',
        emptyFree: 'Frei für heute.', emptyFreeS: 'Alles erledigt oder nichts geplant. Unter Geplant siehst du, was als Nächstes kommt.',
        emptyUpcoming: 'Nichts mit Datum geplant.', emptyUpcomingS: 'Gib einer Aufgabe ein Datum, zum Beispiel „Bericht Fr“ oder „Doku 24.09.“.',
        emptyDone: 'Noch nichts erledigt.', emptyDoneS: 'Abgehakte Aufgaben landen hier mit Datum.',
        emptyList: 'Diese Liste ist leer.', emptyListS: 'Oben eine Aufgabe eintippen.',
        kindTask: 'Aufgabe', kindList: 'Liste',
        created: 'Angelegt {d}', doneOn: 'Erledigt {d}', tasksInList: '{n} Aufgaben in dieser Liste',
        deleted: 'Aufgabe gelöscht', listDeleted: 'Liste gelöscht', undo: 'Rückgängig',
        askDelListT: 'Liste löschen?', askDelListM: '„{n}“ wird gelöscht, inklusive {c}.',
        askResetT: 'Heute zurücksetzen?', askResetM: 'Alles, was heute abgehakt wurde, steht wieder offen da. Listen und Einstellungen bleiben.',
        askWipeT: 'Wirklich alles löschen?', askWipeM: 'Alle Listen, Aufgaben und das Logbuch werden unwiderruflich gelöscht.',
        askImportT: 'Import bestätigen', askImportM: '{n} Listen werden geladen. Deine aktuellen Daten werden dabei ersetzt.',
        badFileT: 'Datei nicht lesbar', badFileM: 'Das ist kein Aufgaben-Export. Erwartet wird eine JSON-Datei mit einem „categories“-Array.',
        askNotifT: 'Erinnerungen einschalten?', askNotifM: 'MyWorkLog kann dich per Browser-Benachrichtigung erinnern, wenn eine Aufgabe fällig ist. Du kannst das in den Browser-Einstellungen wieder abschalten.',
        yesNotif: 'Einschalten', notNow: 'Nicht jetzt',
        cancel: 'Abbrechen', del: 'Löschen', reset: 'Zurücksetzen', importIt: 'Importieren', ok: 'OK',
        exported: 'Exportiert', imported: 'Importiert', resetDone: 'Heute ist wieder offen', wiped: 'Alle Daten gelöscht',
        stillOpen: 'Noch offen: ', noteLbl: 'Notiz', doneLbl: 'Erledigt: '
    };

    function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
    function plural(n) { return n === 1 ? T.task : T.tasks; }


    /* ─── Symbole ──────────────────────────────────────────────────────
       Unveraenderte Lucide-Pfade. 🔴 Nie von Hand kuerzen oder
       nachzeichnen: ein <svg> hat overflow:hidden, alles ausserhalb von
       0..24 faellt still weg (CLAUDE.md).                               */
    var P = {
        check:        '<polyline points="20 6 9 17 4 12"/>',
        chevronDown:  '<path d="m6 9 6 6 6-6"/>',
        plus:         '<path d="M5 12h14"/><path d="M12 5v14"/>',
        x:            '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        alert:        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        info:         '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        checkCircle:  '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>',
        calendar:     '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
        clock:        '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        repeat:       '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
        flag:         '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/>',
        bell:         '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
        inbox:        '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
        listChecks:   '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
        note:         '<path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M8 13h8"/><path d="M8 17h8"/>',
        /* Listen-Symbole */
        clipboardList:'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
        wrench:       '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        lightbulb:    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
        bookOpen:     '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
        activity:     '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
        sunrise:      '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
        moon:         '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
        briefcase:    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
        utensils:     '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
        coffee:       '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
        target:       '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        zap:          '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
        flame:        '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        dumbbell:     '<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/>',
        palette:      '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
        penLine:      '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
        folder:       '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
        rocket:       '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
        star:         '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
        award:        '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
        home:         '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        sparkles:     '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
        smartphone:   '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
        monitor:      '<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
        gamepad:      '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
        pill:         '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
        cart:         '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
        phone:        '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
        plane:        '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'
    };

    var PICKABLE = ['inbox', 'folder', 'clipboardList', 'checkCircle', 'wrench', 'lightbulb', 'bookOpen', 'activity',
        'sunrise', 'moon', 'briefcase', 'utensils', 'coffee', 'target', 'zap', 'flame', 'dumbbell',
        'palette', 'penLine', 'rocket', 'star', 'award', 'home', 'sparkles', 'smartphone',
        'monitor', 'gamepad', 'pill', 'cart', 'phone', 'plane'];

    /* 🔴 Bruecke fuer den Altbestand: `cat.icon` haelt bei bestehenden
       Nutzern ein Emoji-ZEICHEN. Es wird nicht migriert, sondern beim
       Zeichnen uebersetzt.                                               */
    var FROM_EMOJI = {
        '📋': 'clipboardList', '✅': 'checkCircle', '🔧': 'wrench', '💡': 'lightbulb',
        '📚': 'bookOpen', '🏃': 'activity', '🌅': 'sunrise', '🌙': 'moon', '💼': 'briefcase',
        '🍎': 'utensils', '🎯': 'target', '⚡': 'zap', '🔥': 'flame', '💪': 'dumbbell',
        '🎨': 'palette', '📝': 'penLine', '🗂️': 'folder', '🗂': 'folder', '🚀': 'rocket',
        '⭐': 'star', '🏆': 'award', '🏠': 'home', '🧹': 'sparkles', '📱': 'smartphone',
        '💻': 'monitor', '🎮': 'gamepad', '🍳': 'coffee', '💊': 'pill', '🛒': 'cart',
        '📞': 'phone', '✈️': 'plane', '✈': 'plane'
    };

    function svg(name, cls) {
        var d = P[name] || P.clipboardList;
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
            (cls ? ' class="' + cls + '"' : '') + '>' + d + '</svg>';
    }
    function agIcon(v) {
        if (!v) return svg('folder');
        if (P[v]) return svg(v);
        if (FROM_EMOJI[v]) return svg(FROM_EMOJI[v]);
        return svg('folder');
    }


    /* ─── Speicher ─────────────────────────────────────────────────── */
    var SK = {
        cats:    'mwl_tasks_cats',
        states:  'mwl_tasks_states',
        streak:  'mwl_tasks_streak',
        theme:   'mwl_tasks_theme',
        reset:   'mwl_tasks_lastReset',
        history: 'mwl_tasks_history',
        stats:   'mwl_tasks_stats',
        ui:      'mwl_tasks_ui'
    };

    var cats = [], streak = {}, history = {}, stats = {}, ui = {};
    var st = {};                      /* id → true, die Erledigt-Flags */
    var view = 'today', viewList = null, sel = null, detailMode = null;

    function jget(k, fb) {
        try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; }
        catch (e) { return fb; }
    }
    function load() {
        cats    = jget(SK.cats, []);
        streak  = jget(SK.streak, { streak: 0, lastDate: null, best: 0 });
        history = jget(SK.history, {});
        stats   = jget(SK.stats, { done: 0 });
        ui      = jget(SK.ui, {});
        st      = jget(SK.states, {}) || {};
        if (!Array.isArray(cats)) cats = [];
        if (typeof stats.done !== 'number') stats.done = 0;
        cats.forEach(function (c) { if (!Array.isArray(c.tasks)) c.tasks = []; });
        migrateDoneAt();
    }
    function save() {
        localStorage.setItem(SK.cats, JSON.stringify(cats));
        localStorage.setItem(SK.states, JSON.stringify(st));
        localStorage.setItem(SK.streak, JSON.stringify(streak));
        localStorage.setItem(SK.history, JSON.stringify(history));
        localStorage.setItem(SK.stats, JSON.stringify(stats));
    }
    function saveUi() {
        ui.view = view; ui.list = viewList;
        localStorage.setItem(SK.ui, JSON.stringify(ui));
    }

    /* Bestandsdaten haben Flags ohne Zeitpunkt. Einmalig bekommt jedes
       gesetzte Flag den Tag des letzten Besuchs — die beste Naeherung, die
       es gibt. Danach schreibt jeder Haken seinen eigenen Zeitpunkt.     */
    function migrateDoneAt() {
        var last = localStorage.getItem(SK.reset);
        var d = last ? new Date(last) : new Date();
        if (isNaN(d)) d = new Date();
        var stamp = iso(d);   /* nur der Tag — eine Uhrzeit waere erfunden */
        var touched = false;
        cats.forEach(function (c) {
            c.tasks.forEach(function (t) {
                if (st[t.id] && !t.doneAt) { t.doneAt = stamp; touched = true; }
                if (!st[t.id] && t.doneAt) { delete t.doneAt; touched = true; }
            });
        });
        if (touched) localStorage.setItem(SK.cats, JSON.stringify(cats));
    }


    /* ─── Helfer ───────────────────────────────────────────────────── */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function $(id) { return document.getElementById(id); }
    function iso(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    function todayIso() { return iso(today()); }
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function fromIso(s) { return s ? new Date(s.slice(0, 10) + 'T00:00:00') : null; }
    function isoDays(a, b) { return Math.round((fromIso(a) - fromIso(b)) / 86400000); }

    /* "Heute", "Morgen", "Gestern", sonst "Mi, 16. Sept." */
    function fmtRel(isoDate) {
        var diff = isoDays(isoDate, todayIso());
        if (diff === 0) return T.today;
        if (diff === 1) return T.tomorrow;
        if (diff === -1) return T.yesterday;
        var d = fromIso(isoDate);
        var opts = { weekday: 'short', day: 'numeric', month: 'short' };
        if (d.getFullYear() !== today().getFullYear()) opts.year = 'numeric';
        return d.toLocaleDateString(LOCALE, opts);
    }
    function fmtLong(isoDate) {
        return fromIso(isoDate).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
    }
    function daysText(days) {
        return days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); })
            .map(function (d) { return T.dayShort[d]; }).join(', ');
    }
    function prioWeight(p) { return p === 'high' ? 3 : p === 'medium' ? 2 : p === 'low' ? 1 : 0; }


    /* ─── Modell ───────────────────────────────────────────────────── */
    function listById(id) {
        for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i];
        return null;
    }
    function listOf(task) {
        for (var i = 0; i < cats.length; i++) if (cats[i].tasks.indexOf(task) !== -1) return cats[i];
        return null;
    }
    function taskById(id) {
        for (var i = 0; i < cats.length; i++) {
            var ts = cats[i].tasks;
            for (var j = 0; j < ts.length; j++) if (ts[j].id === id) return ts[j];
        }
        return null;
    }
    function allTasks() {
        var out = [];
        cats.forEach(function (c) { c.tasks.forEach(function (t) { out.push(t); }); });
        return out;
    }
    function isDone(t) { return !!st[t.id]; }
    function doneDay(t) { return t.doneAt ? String(t.doneAt).slice(0, 10) : ''; }

    /* Ohne Liste geht es trotzdem: „Eingang" entsteht bei der ersten
       Aufgabe, die keine Liste bekommt. */
    function ensureInbox() {
        var c = listById('cat_inbox');
        if (c) return c;
        c = { id: 'cat_inbox', name: T.inbox, icon: 'inbox', tasks: [], defaultPriority: '', days: [], autoReset: '' };
        cats.unshift(c);
        return c;
    }

    /* Die Tageslogik der alten Fassung: eine Aufgabe ohne Datum ist an den
       Tagen dran, die Liste UND Aufgabe zulassen (leer = jeden Tag). */
    function onDay(x, dow) { return !x.days || !x.days.length || x.days.indexOf(dow) !== -1; }
    function scheduledOn(t, c, dow) { return onDay(c, dow) && onDay(t, dow); }

    function sortOpen(a, b) {
        var pa = prioWeight(a.priority), pb = prioWeight(b.priority);
        if (pa !== pb) return pb - pa;
        if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
        if (a.due && !b.due) return -1;
        if (!a.due && b.due) return 1;
        return 0;
    }
    function sortDue(a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : sortOpen(a, b); }
    function stable(arr, cmp) {
        return arr.map(function (x, i) { return { x: x, i: i }; })
            .sort(function (a, b) { return cmp(a.x, b.x) || a.i - b.i; })
            .map(function (o) { return o.x; });
    }


    /* ─── Wiederholung und Auto-Reset ──────────────────────────────────
       Zu Beginn der naechsten Periode steht eine erledigte, wiederholte
       Aufgabe wieder offen da; ein Datum wandert auf die naechste
       Faelligkeit. Der Auto-Reset je Liste (Altbestand) bleibt daneben. */
    function periodStart(rec, now) {
        var d = new Date(now); d.setHours(0, 0, 0, 0);
        if (rec === 'weekly') d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        else if (rec === 'monthly') d.setDate(1);
        return d;
    }
    function nextDue(rec, due, now) {
        var d = fromIso(due) || new Date(now);
        var guard = 0;
        do {
            if (rec === 'daily') d.setDate(d.getDate() + 1);
            else if (rec === 'weekdays') { d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); }
            else if (rec === 'weekly') d.setDate(d.getDate() + 7);
            else if (rec === 'monthly') d.setMonth(d.getMonth() + 1);
            else break;
        } while (d < now && ++guard < 400);
        return iso(d);
    }
    function rollRecurring() {
        var now = today(), touched = false, dow = now.getDay();
        allTasks().forEach(function (t) {
            var rec = t.recurring;
            if (!rec || rec === 'none' || !st[t.id]) return;
            if (rec === 'weekdays' && (dow === 0 || dow === 6)) return;
            var since = t.doneAt ? new Date(t.doneAt) : null;
            if (!since || isNaN(since)) return;
            if (since >= periodStart(rec, now)) return;
            delete st[t.id];
            delete t.doneAt;
            (t.subtasks || []).forEach(function (s) { s.done = false; });
            if (t.due) t.due = nextDue(rec, t.due, now);
            touched = true;
        });
        return touched;
    }
    function autoReset() {
        var key = today().toDateString();
        if (localStorage.getItem(SK.reset) === key) return false;
        var now = new Date(), dow = now.getDay(), dom = now.getDate(), touched = false;
        cats.forEach(function (c) {
            if (!c.autoReset) return;
            var due = c.autoReset === 'daily' || (c.autoReset === 'weekly' && dow === 1) || (c.autoReset === 'monthly' && dom === 1);
            if (!due) return;
            c.tasks.forEach(function (t) {
                if (st[t.id]) { delete st[t.id]; delete t.doneAt; touched = true; }
                (t.subtasks || []).forEach(function (s) { s.done = false; });
            });
        });
        localStorage.setItem(SK.reset, key);
        return touched;
    }


    /* ─── Verlauf ──────────────────────────────────────────────────────
       Nur HEUTE wird geschrieben; Tage ohne Aufzeichnung bleiben leer.  */
    function todayView() {
        var t = todayIso(), dow = today().getDay();
        var over = [], due = [], done = [];
        cats.forEach(function (c) {
            c.tasks.forEach(function (x) {
                if (isDone(x)) { if (doneDay(x) === t) done.push(x); return; }
                if (x.due) { if (x.due < t) over.push(x); else if (x.due === t) due.push(x); return; }
                if (scheduledOn(x, c, dow)) due.push(x);
            });
        });
        return { over: stable(over, sortDue), due: stable(due, sortOpen), done: done, total: over.length + due.length + done.length };
    }
    function recordToday() {
        var v = todayView();
        if (!v.total) return;
        history[todayIso()] = { d: v.done.length, t: v.total };
        var keys = Object.keys(history).sort();
        while (keys.length > 400) delete history[keys.shift()];
    }
    function bumpStreak() {
        var v = todayView();
        if (!v.total || v.done.length !== v.total) return;
        var key = today().toDateString();
        if (streak.lastDate === key) return;
        var yst = addDays(today(), -1).toDateString();
        streak.streak = (streak.lastDate === yst) ? (streak.streak || 0) + 1 : 1;
        streak.lastDate = key;
        streak.best = Math.max(streak.best || 0, streak.streak);
    }

    function commit() {
        bumpStreak();
        recordToday();
        save();
        render();
    }


    /* ─── Ansichten ────────────────────────────────────────────────────
       compute() liefert das Bild einer Ansicht; render() malt es. Jede
       Zahl der Seite kommt hier heraus, es gibt keinen zweiten Weg.     */
    function compute() {
        var t = todayIso(), out = { sections: [], progress: null, empty: null, title: '', sub: '' };
        var nothingAtAll = allTasks().length === 0;

        if (view === 'today') {
            var v = todayView();
            out.title = T.vToday;
            out.sub = fmtLong(t);
            out.progress = { done: v.done.length, total: v.total };
            if (v.over.length) out.sections.push({ key: 'over', title: T.secOverdue, cls: 'is-over', tasks: v.over });
            if (v.due.length) out.sections.push({ key: 'today', title: T.secToday, tasks: v.due });
            if (v.done.length) out.sections.push({ key: 'done', title: T.secDoneToday, tasks: v.done, fold: true });
            if (!v.total) out.empty = nothingAtAll ? [T.emptyNothing, T.emptyNothingS] : [T.emptyFree, T.emptyFreeS];
        }

        else if (view === 'upcoming') {
            out.title = T.vUpcoming;
            out.sub = T.subUpcoming;
            var dated = allTasks().filter(function (x) { return !isDone(x) && x.due && x.due > t; });
            dated = stable(dated, sortDue);
            var byDay = {};
            for (var i = 1; i <= 7; i++) {
                var d = addDays(today(), i), k = iso(d), dow = d.getDay();
                var rows = dated.filter(function (x) { return x.due === k; });
                var routines = 0;
                cats.forEach(function (c) { c.tasks.forEach(function (x) { if (!isDone(x) && !x.due && scheduledOn(x, c, dow)) routines++; }); });
                if (rows.length || routines) {
                    var title = i === 1 ? T.tomorrow + ' · ' + d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }) : fmtRel(k);
                    out.sections.push({ key: k, title: title, tasks: rows, routines: routines, hideZero: true });
                }
                byDay[k] = true;
            }
            var later = dated.filter(function (x) { return !byDay[x.due]; });
            if (later.length) out.sections.push({ key: 'later', title: T.later, tasks: later, showDate: true });
            if (!dated.length && !out.sections.length) out.empty = [T.emptyUpcoming, T.emptyUpcomingS];
        }

        else if (view === 'all') {
            out.title = T.vAll;
            out.sub = T.subAll;
            var doneAll = [];
            cats.forEach(function (c) {
                var open = c.tasks.filter(function (x) { return !isDone(x); });
                c.tasks.forEach(function (x) { if (isDone(x)) doneAll.push(x); });
                if (open.length) out.sections.push({ key: c.id, title: c.name, icon: c.icon, tasks: stable(open, sortOpen), showDate: true });
            });
            if (doneAll.length) out.sections.push({ key: 'done', title: T.secDone, tasks: stable(doneAll, function (a, b) { return (b.doneAt || '') < (a.doneAt || '') ? -1 : 1; }), fold: true, showDate: true });
            if (!out.sections.length) out.empty = [T.emptyNothing, T.emptyNothingS];
        }

        else if (view === 'done') {
            out.title = T.vDone;
            out.sub = T.subDone;
            out.log = true;
            var done = allTasks().filter(isDone);
            done = stable(done, function (a, b) { return (b.doneAt || '') < (a.doneAt || '') ? -1 : (b.doneAt || '') > (a.doneAt || '') ? 1 : 0; });
            var groups = {}, order = [];
            done.slice(0, 300).forEach(function (x) {
                var k = doneDay(x) || 'unknown';
                if (!groups[k]) { groups[k] = []; order.push(k); }
                groups[k].push(x);
            });
            order.forEach(function (k) {
                out.sections.push({ key: 'd' + k, title: k === 'unknown' ? T.earlier : fmtRel(k), tasks: groups[k], muted: true });
            });
            if (!done.length) out.empty = [T.emptyDone, T.emptyDoneS];
        }

        else if (view === 'list') {
            var c = listById(viewList);
            if (!c) { view = 'today'; return compute(); }
            out.title = c.name;
            var meta = [c.days && c.days.length ? fill(T.onDays, { d: daysText(c.days) }) : T.everyDay];
            if (c.autoReset && T.reopens[c.autoReset]) meta.push(T.reopens[c.autoReset]);
            out.sub = meta.join(' · ');
            var openL = c.tasks.filter(function (x) { return !isDone(x); });
            var overL = openL.filter(function (x) { return x.due && x.due < t; });
            var restL = openL.filter(function (x) { return !(x.due && x.due < t); });
            var doneL = c.tasks.filter(isDone);
            out.progress = { done: doneL.length, total: c.tasks.length };
            if (overL.length) out.sections.push({ key: 'over', title: T.secOverdue, cls: 'is-over', tasks: stable(overL, sortDue) });
            if (restL.length) out.sections.push({ key: 'open', title: T.secOpen, tasks: stable(restL, sortOpen), showDate: true });
            if (doneL.length) out.sections.push({ key: 'done', title: T.secDone, tasks: stable(doneL, function (a, b) { return (b.doneAt || '') < (a.doneAt || '') ? -1 : 1; }), fold: true, showDate: true });
            if (!c.tasks.length) out.empty = [T.emptyList, T.emptyListS];
        }
        return out;
    }

    function counts() {
        var t = todayIso(), dow = today().getDay();
        var n = { today: 0, upcoming: 0, all: 0, done: 0, lists: {} };
        cats.forEach(function (c) {
            n.lists[c.id] = 0;
            c.tasks.forEach(function (x) {
                if (isDone(x)) { n.done++; return; }
                n.all++; n.lists[c.id]++;
                if (x.due) { if (x.due <= t) n.today++; else n.upcoming++; }
                else if (scheduledOn(x, c, dow)) n.today++;
            });
        });
        return n;
    }


    /* ─── Zeichnen ─────────────────────────────────────────────────── */
    function render() {
        renderSide();
        renderMain();
        renderDetail();
    }

    function renderSide() {
        var n = counts();
        $('tkNToday').textContent = n.today || '';
        $('tkNUpcoming').textContent = n.upcoming || '';
        $('tkNAll').textContent = n.all || '';
        $('tkNDone').textContent = n.done || '';
        document.querySelectorAll('.tk-nav > .tk-nav__it').forEach(function (b) {
            var on = view === b.dataset.view;
            b.classList.toggle('is-on', on);
            if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
        $('tkLists').innerHTML = cats.map(function (c) {
            var on = view === 'list' && viewList === c.id;
            return '<button type="button" class="tk-nav__it' + (on ? ' is-on' : '') + '" data-a="view" data-view="list" data-list="' + esc(c.id) + '"'
                + (on ? ' aria-current="page"' : '') + '>'
                + agIcon(c.icon) + '<span>' + esc(c.name) + '</span>'
                + '<b class="tk-nav__n">' + (n.lists[c.id] || '') + '</b></button>';
        }).join('');
        $('tkStreak').textContent = streak.streak || 0;
        $('tkStreakBox').classList.toggle('is-zero', !(streak.streak > 0));
    }

    function renderMain() {
        var m = compute();
        $('tkTitle').textContent = m.title;
        $('tkSub').textContent = m.sub;
        $('tkListCfg').hidden = view !== 'list';
        $('tkAddBox').hidden = view === 'done';

        var prog = $('tkProg');
        if (m.progress && m.progress.total) {
            prog.hidden = false;
            var pct = Math.round(m.progress.done / m.progress.total * 100);
            $('tkProgFill').style.width = pct + '%';
            $('tkProgDone').textContent = m.progress.done;
            $('tkProgTotal').textContent = m.progress.total;
            $('tkProgOf').textContent = T.of;
            prog.classList.toggle('is-clear', m.progress.done === m.progress.total);
        } else {
            prog.hidden = true;
        }

        var html = '';
        if (m.log) html += logHTML();
        m.sections.forEach(function (s) {
            var folded = s.fold && ui['fold_' + s.key] !== false && (ui['fold_' + s.key] === true || s.fold === true && view !== 'today');
            /* Heute erledigt bleibt offen, solange der Nutzer es nicht zuklappt —
               man will sehen, was man geschafft hat. Sonst beginnt Erledigt zu. */
            if (s.fold && view === 'today') folded = ui['fold_' + s.key] === true;
            html += '<h2 class="tk-sec' + (s.cls ? ' ' + s.cls : '') + (s.muted ? ' tk-sec--muted' : '') + '">'
                + (s.fold
                    ? '<button type="button" class="tk-sec__btn" data-a="fold" data-k="' + esc(s.key) + '" aria-expanded="' + !folded + '">' + svg('chevronDown') + '<span>' + esc(s.title) + '</span></button>'
                    : (s.icon ? '<span class="tk-sec__ico">' + agIcon(s.icon) + '</span>' : '') + '<span>' + esc(s.title) + '</span>')
                + (s.hideZero && !s.tasks.length ? '' : '<b>' + s.tasks.length + '</b>')
                + (s.routines ? '<b>' + esc(s.routines === 1 ? T.routine : fill(T.routines, { n: s.routines })) + '</b>' : '')
                + '</h2>';
            if (!folded) html += s.tasks.map(function (x) { return rowHTML(x, s); }).join('');
        });
        $('tkList').innerHTML = html;

        var empty = $('tkEmpty');
        if (m.empty) { $('tkEmptyT').textContent = m.empty[0]; $('tkEmptyS').textContent = m.empty[1]; empty.hidden = false; }
        else empty.hidden = true;

        if (sel && !document.querySelector('.tk-row[data-id="' + cssEsc(sel) + '"]') && !taskById(sel)) sel = null;
    }

    function cssEsc(s) { return String(s).replace(/["\\]/g, '\\$&'); }

    function meta(cls, icon, text) {
        return '<span class="tk-meta' + (cls ? ' ' + cls : '') + '">' + (icon ? svg(icon) : '') + '<span>' + esc(text) + '</span></span>';
    }

    function rowHTML(t, s) {
        var done = isDone(t), c = listOf(t), tt = todayIso();
        var m = [];
        if (t.due) {
            var cls = !done && t.due < tt ? 'is-over' : !done && t.due === tt ? 'is-today' : '';
            if (s.showDate || cls || view === 'upcoming' && s.key === 'later') m.push(meta(cls, 'calendar', fmtRel(t.due)));
        }
        if (c && view !== 'list' && !(view === 'all' && s.key === c.id)) m.push(meta('', '', c.name));
        if (t.recurring && t.recurring !== 'none') m.push(meta('', 'repeat', T.recur[t.recurring] || t.recurring));
        if (t.days && t.days.length && !t.due) m.push(meta('', 'clock', daysText(t.days)));
        if (t.reminder) m.push(meta('', 'bell', t.reminder));
        var subs = t.subtasks || [];
        if (subs.length) m.push(meta('', 'listChecks', subs.filter(function (x) { return x.done; }).length + '/' + subs.length));
        if (t.note) m.push('<span class="tk-meta tk-meta--note">' + svg('note') + '<span>' + esc(t.note) + '</span></span>');
        if (done && view === 'done' && t.doneAt && /T\d\d:\d\d/.test(t.doneAt)) m.push(meta('', 'clock', String(t.doneAt).slice(11, 16)));

        return '<div class="tk-row' + (done ? ' is-done' : '') + (sel === t.id ? ' is-sel' : '') + '"'
            + ' data-id="' + esc(t.id) + '" data-a="open" data-prio="' + esc(t.priority || '') + '" role="button" tabindex="0" aria-selected="' + (sel === t.id) + '">'
            + '<button type="button" class="tk-check" data-a="check" data-id="' + esc(t.id) + '" aria-pressed="' + done + '" aria-label="' + esc(T.doneLbl + t.name) + '">' + svg('check') + '</button>'
            + '<div class="tk-row__main">'
                + '<span class="tk-row__name">' + esc(t.name) + '</span>'
                + '<span class="tk-row__meta">' + m.join('') + '</span>'
            + '</div>'
        + '</div>';
    }

    /* Logbuch-Kopf: 30 Felder, ein Feld je Tag — drei Zustaende, drei
       Farben, eine Aussage (CLAUDE.md, Heatmap). */
    function logHTML() {
        var out = [], tt = todayIso();
        for (var i = 29; i >= 0; i--) {
            var k = iso(addDays(today(), -i)), rec = history[k];
            var cls = 'tk-log__d', title = fmtRel(k);
            if (rec && rec.t) { cls += rec.d >= rec.t ? ' is-full' : ' is-part'; title += ' · ' + rec.d + '/' + rec.t; }
            if (k === tt) cls += ' is-today';
            out.push('<span class="' + cls + '" title="' + esc(title) + '"></span>');
        }
        return '<div class="tk-log">'
            + '<span class="tk-log__days">' + out.join('') + '</span>'
            + '<span class="tk-log__k"><b>' + (stats.done || 0) + '</b><span>' + esc(T.total) + '</span></span>'
            + '<span class="tk-log__k"><b>' + (streak.best || 0) + '</b><span>' + esc(EN ? 'best streak' : 'längste Serie') + '</span></span>'
            + '</div>';
    }


    /* ─── Detail ───────────────────────────────────────────────────── */
    var detailEl, fTask, fCat, nameTimer, noteTimer;

    function openDetail(mode) {
        detailMode = mode;
        detailEl.classList.add('is-open');
        detailEl.setAttribute('aria-hidden', 'false');
        var narrow = window.matchMedia('(max-width: 1099px)').matches;
        $('tkScrim').hidden = !narrow;
        renderDetail();
    }
    function closeDetail() {
        var wasTask = detailMode === 'task' && sel;
        detailMode = null;
        detailEl.classList.remove('is-open');
        detailEl.setAttribute('aria-hidden', 'true');
        if (!$('tkSide').classList.contains('is-open')) $('tkScrim').hidden = true;
        if (wasTask) {
            var row = document.querySelector('.tk-row[data-id="' + cssEsc(sel) + '"]');
            if (row) row.focus();
        }
    }

    function renderDetail() {
        var t = detailMode === 'task' ? taskById(sel) : null;
        var c = detailMode === 'list' ? listById(viewList) : null;
        if (detailMode === 'task' && !t) { closeDetail(); return; }
        if (detailMode === 'list' && !c) { closeDetail(); return; }
        fTask.hidden = !t;
        fCat.hidden = !c;
        $('tkDetailKind').textContent = t ? T.kindTask : c ? T.kindList : '';
        if (t) fillTask(t);
        if (c) fillList(c);
    }

    function fillTask(t) {
        var done = isDone(t);
        fTask.classList.toggle('is-done', done);
        fTask.dataset.prio = t.priority || '';
        $('tkFCheck').setAttribute('aria-pressed', String(done));
        var nm = $('tkFName');
        if (document.activeElement !== nm) { nm.value = t.name; autosize(nm); }
        var sel$ = $('tkFList');
        sel$.innerHTML = cats.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
        var c = listOf(t);
        sel$.value = c ? c.id : '';
        $('tkFDue').value = t.due || '';
        document.querySelectorAll('#tkFPrio .tk-seg__btn').forEach(function (b) { b.setAttribute('aria-pressed', String((t.priority || '') === b.dataset.p)); });
        $('tkFRepeat').value = t.recurring || 'none';
        document.querySelectorAll('#tkFDays .tk-chip').forEach(function (b) { b.setAttribute('aria-pressed', String((t.days || []).indexOf(parseInt(b.dataset.day, 10)) !== -1)); });
        $('tkFRemind').value = t.reminder || '';
        var nt = $('tkFNote');
        if (document.activeElement !== nt) nt.value = t.note || '';
        $('tkFSubs').innerHTML = (t.subtasks || []).map(function (s, i) {
            return '<div class="tk-subrow' + (s.done ? ' is-done' : '') + '">'
                + '<button type="button" class="tk-check" data-a="subcheck" data-i="' + i + '" aria-pressed="' + !!s.done + '" aria-label="' + esc(T.doneLbl + s.name) + '">' + svg('check') + '</button>'
                + '<span class="tk-sub__l">' + esc(s.name) + '</span>'
                + '<button type="button" class="tk-ib tk-ib--sm tk-ib--danger tk-sub__x" data-a="subdel" data-i="' + i + '" aria-label="' + esc(T.del) + '">' + svg('x') + '</button>'
            + '</div>';
        }).join('');
        var m = [];
        if (t.createdAt) m.push(fill(T.created, { d: fmtRel(String(t.createdAt).slice(0, 10)) }));
        if (done && t.doneAt) m.push(fill(T.doneOn, { d: fmtRel(doneDay(t)) + (/T\d\d:\d\d/.test(t.doneAt) ? ', ' + String(t.doneAt).slice(11, 16) : '') }));
        $('tkFMeta').textContent = m.join(' · ');
    }

    function fillList(c) {
        var nm = $('tkFCatName');
        if (document.activeElement !== nm) nm.value = c.name;
        $('tkFCatIcon').innerHTML = PICKABLE.map(function (n) {
            var cur = P[c.icon] ? c.icon : (FROM_EMOJI[c.icon] || 'folder');
            return '<button type="button" class="tk-ico-pick" data-a="pickicon" data-ico="' + n + '" aria-pressed="' + (cur === n) + '" aria-label="' + n + '">' + svg(n) + '</button>';
        }).join('');
        $('tkFCatPrio').value = c.defaultPriority || '';
        document.querySelectorAll('#tkFCatDays .tk-chip').forEach(function (b) { b.setAttribute('aria-pressed', String((c.days || []).indexOf(parseInt(b.dataset.day, 10)) !== -1)); });
        $('tkFCatReset').value = c.autoReset || '';
        $('tkFCatMeta').textContent = fill(T.tasksInList, { n: c.tasks.length });
    }

    function autosize(el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }

    /* Aenderungen im Formular sofort schreiben. Name und Notiz gebremst,
       damit die Liste nicht bei jedem Zeichen neu gezeichnet wird. */
    function writeTask(patch, quiet) {
        var t = taskById(sel);
        if (!t) return;
        Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
        save();
        if (!quiet) { renderSide(); renderMain(); }
    }
    function writeList(patch) {
        var c = listById(viewList);
        if (!c) return;
        Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
        save();
        renderSide(); renderMain();
    }


    /* ─── Schnelleingabe ───────────────────────────────────────────────
       „Bericht Fr !!" → Name „Bericht", faellig Freitag, Prioritaet mittel.
       Erkannt werden nur eigenstaendige Woerter; Wochentags-Kuerzel nur
       gross geschrieben (Mo, Di …), sonst wuerde „so" zum Sonntag.      */
    var DAY_WORDS = EN
        ? { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 }
        : { montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6, sonntag: 0 };
    var DAY_ABBR = EN
        ? { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }
        : { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6, So: 0 };
    var WORD_TODAY = EN ? ['today'] : ['heute'];
    var WORD_TOMORROW = EN ? ['tomorrow'] : ['morgen'];
    var WORD_AFTER = EN ? [] : ['übermorgen', 'uebermorgen'];
    var WORD_NEXTWEEK = EN ? ['next week'] : ['nächste woche', 'naechste woche'];

    function nextDow(dow) {
        var d = today(), diff = (dow - d.getDay() + 7) % 7;
        return iso(addDays(d, diff));
    }
    function parseQuick(text) {
        var r = { name: '', due: null, prio: null, list: null, listMiss: null, hints: [] };
        var lower = text.toLowerCase();
        WORD_NEXTWEEK.forEach(function (w) {
            var i = lower.indexOf(w);
            if (i !== -1 && (i === 0 || /\s/.test(lower[i - 1])) && (i + w.length === lower.length || /\s/.test(lower[i + w.length]))) {
                r.due = iso(addDays(today(), 7));
                text = text.slice(0, i) + text.slice(i + w.length);
                lower = text.toLowerCase();
            }
        });
        var keep = [];
        text.split(/\s+/).forEach(function (tok) {
            if (!tok) return;
            var low = tok.toLowerCase(), m;
            if (/^!{1,3}$/.test(tok)) { r.prio = tok.length === 3 ? 'high' : tok.length === 2 ? 'medium' : 'low'; return; }
            if (tok.length > 1 && tok[0] === '#') {
                var q = low.slice(1);
                var hit = cats.filter(function (c) { return c.name.toLowerCase().indexOf(q) === 0; })[0]
                    || cats.filter(function (c) { return c.name.toLowerCase().indexOf(q) !== -1; })[0];
                if (hit) { r.list = hit; return; }
                r.listMiss = tok.slice(1); return;
            }
            if (WORD_TODAY.indexOf(low) !== -1) { r.due = todayIso(); return; }
            if (WORD_TOMORROW.indexOf(low) !== -1) { r.due = iso(addDays(today(), 1)); return; }
            if (WORD_AFTER.indexOf(low) !== -1) { r.due = iso(addDays(today(), 2)); return; }
            if (DAY_WORDS[low] != null) { r.due = nextDow(DAY_WORDS[low]); return; }
            if (DAY_ABBR[tok] != null) { r.due = nextDow(DAY_ABBR[tok]); return; }
            if ((m = /^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?$/.exec(tok))) {
                var y = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : today().getFullYear();
                var d = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
                if (!isNaN(d) && d.getMonth() === parseInt(m[2], 10) - 1) {
                    if (!m[3] && d < today()) d.setFullYear(d.getFullYear() + 1);
                    r.due = iso(d); return;
                }
            }
            if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tok)) && !isNaN(fromIso(tok))) { r.due = tok; return; }
            keep.push(tok);
        });
        r.name = keep.join(' ').trim();
        if (r.due) r.hints.push({ cls: '', icon: 'calendar', text: T.due + ': ' + fmtRel(r.due) });
        if (r.prio) r.hints.push({ cls: 'is-' + r.prio, icon: 'flag', text: T.prio[r.prio] });
        if (r.list) r.hints.push({ cls: '', icon: r.list.icon && P[r.list.icon] ? r.list.icon : 'folder', text: T.list + ': ' + r.list.name });
        if (r.listMiss) r.hints.push({ cls: 'is-muted', icon: '', text: fill(T.noList, { n: r.listMiss }) });
        return r;
    }
    function renderHints() {
        var v = $('tkAdd').value.trim();
        var box = $('tkAddHints');
        if (!v) { box.innerHTML = ''; return; }
        var r = parseQuick(v);
        box.innerHTML = r.hints.map(function (h) {
            return '<span class="tk-hint' + (h.cls ? ' ' + h.cls : '') + '">' + (h.icon ? svg(h.icon) : '') + '<span>' + esc(h.text) + '</span></span>';
        }).join('');
    }
    function quickAdd() {
        var inp = $('tkAdd'), raw = inp.value.trim();
        if (!raw) return;
        var r = parseQuick(raw);
        var name = r.name || raw;
        var c = r.list || (view === 'list' ? listById(viewList) : null) || ensureInbox();
        var due = r.due;
        if (!due && view === 'today') due = todayIso();
        if (!due && view === 'upcoming') due = iso(addDays(today(), 1));
        var t = {
            id: 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: name,
            priority: r.prio || c.defaultPriority || '',
            days: [], due: due || '', recurring: 'none', reminder: '', note: '', subtasks: [],
            createdAt: new Date().toISOString()
        };
        c.tasks.push(t);
        inp.value = '';
        renderHints();
        if (typeof mwlEvent === 'function') mwlEvent('feature_genutzt', { feature: 'aufgaben', aktion: 'neu', datum: !!due, prio: !!r.prio, liste: !!r.list });
        commit();
    }


    /* ─── Handlungen ───────────────────────────────────────────────── */
    var checkTimer = null;
    function toggle(id) {
        var t = taskById(id);
        if (!t) return;
        var next = !st[id];
        if (next) {
            st[id] = true;
            t.doneAt = new Date().toISOString();
            stats.done = (stats.done || 0) + 1;
            (t.subtasks || []).forEach(function (s) { s.done = true; });
        } else {
            delete st[id];
            delete t.doneAt;
            (t.subtasks || []).forEach(function (s) { s.done = false; });
        }
        /* Erst das Haken-Feedback zeigen, dann umsortieren — sonst frisst
           das Neuzeichnen die 160 ms des Hakens. */
        document.querySelectorAll('.tk-check[data-id="' + cssEsc(id) + '"]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(next));
            var row = b.closest('.tk-row'); if (row) row.classList.toggle('is-done', next);
        });
        if (detailMode === 'task' && sel === id) { $('tkFCheck').setAttribute('aria-pressed', String(next)); fTask.classList.toggle('is-done', next); }
        bumpStreak(); recordToday(); save();
        clearTimeout(checkTimer);
        checkTimer = setTimeout(render, 380);
        if (next && typeof mwlEvent === 'function') mwlEvent('feature_genutzt', { feature: 'aufgaben', aktion: 'erledigt' });
    }

    var undo = null;
    function deleteTask(id) {
        var t = taskById(id), c = listOf(t);
        if (!t || !c) return;
        var idx = c.tasks.indexOf(t);
        undo = { task: t, cat: c, idx: idx, done: !!st[id] };
        c.tasks.splice(idx, 1);
        delete st[id];
        if (sel === id) { sel = null; if (detailMode === 'task') closeDetail(); }
        commit();
        toast(T.deleted, function () {
            if (!undo) return;
            var back = undo; undo = null;
            if (cats.indexOf(back.cat) === -1) cats.push(back.cat);
            back.cat.tasks.splice(Math.min(back.idx, back.cat.tasks.length), 0, back.task);
            if (back.done) st[back.task.id] = true;
            commit();
        });
    }
    function deleteList(id) {
        var c = listById(id);
        if (!c) return;
        var n = c.tasks.length;
        ask({ title: T.askDelListT, message: fill(T.askDelListM, { n: c.name, c: n + ' ' + plural(n) }), variant: 'danger', confirm: T.del })
            .then(function (ok) {
                if (!ok) return;
                c.tasks.forEach(function (t) { delete st[t.id]; });
                cats.splice(cats.indexOf(c), 1);
                if (detailMode === 'list') closeDetail();
                view = 'today'; viewList = null; saveUi();
                commit();
                toast(T.listDeleted);
            });
    }

    function select(id, open) {
        sel = id;
        document.querySelectorAll('.tk-row').forEach(function (r) {
            var on = r.dataset.id === id;
            r.classList.toggle('is-sel', on);
            r.setAttribute('aria-selected', String(on));
        });
        if (open) openDetail('task');
        else if (detailMode === 'task') renderDetail();
    }
    function moveSel(dir) {
        var rows = Array.prototype.slice.call(document.querySelectorAll('.tk-row'));
        if (!rows.length) return;
        var i = rows.findIndex(function (r) { return r.dataset.id === sel; });
        var next = i === -1 ? (dir > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, i + dir));
        select(rows[next].dataset.id, false);
        rows[next].focus();
        rows[next].scrollIntoView({ block: 'nearest' });
    }

    function setView(v, listId) {
        view = v; viewList = listId || null;
        if (detailMode === 'list') closeDetail();
        saveUi();
        render();
        if (window.matchMedia('(max-width: 767px)').matches) closeSide();
    }
    function openSide() { $('tkSide').classList.add('is-open'); $('tkScrim').hidden = false; }
    function closeSide() {
        $('tkSide').classList.remove('is-open');
        if (!detailEl.classList.contains('is-open') || !window.matchMedia('(max-width: 1099px)').matches) $('tkScrim').hidden = true;
    }

    function newList() {
        var box = $('tkNewList'), inp = $('tkNewListName');
        box.hidden = false;
        inp.value = '';
        inp.focus();
    }
    function createList() {
        var inp = $('tkNewListName'), name = inp.value.trim();
        $('tkNewList').hidden = true;
        if (!name) return;
        var c = { id: 'cat_' + Date.now(), name: name, icon: 'folder', tasks: [], defaultPriority: '', days: [], autoReset: '' };
        cats.push(c);
        save();
        setView('list', c.id);
    }


    /* ─── Dialoge, Toast, Menue ────────────────────────────────────── */
    function ask(o) {
        return new Promise(function (resolve) {
            var danger = o.variant === 'danger';
            var ov = document.createElement('div');
            ov.className = 'tk-ov';
            ov.innerHTML = '<div class="tk-modal" role="alertdialog" aria-modal="true" aria-labelledby="tkAskT">'
                + '<span class="tk-modal__ico ' + (danger ? 't-danger' : 't-primary') + '">' + svg(danger ? 'alert' : 'info') + '</span>'
                + '<p class="tk-modal__t" id="tkAskT">' + esc(o.title) + '</p>'
                + (o.message ? '<p class="tk-modal__m">' + esc(o.message) + '</p>' : '')
                + '<div class="tk-modal__foot">'
                    + (o.cancel === null ? '' : '<button type="button" class="tk-btn" data-r="0">' + esc(o.cancel || T.cancel) + '</button>')
                    + '<button type="button" class="tk-btn ' + (danger ? 'tk-btn--danger' : 'tk-btn--go') + '" data-r="1">' + esc(o.confirm || T.ok) + '</button>'
                + '</div></div>';
            var settled = false;
            function close(v) {
                if (settled) return;
                settled = true;
                document.removeEventListener('keydown', key, true);
                ov.remove();
                resolve(v);
            }
            function key(e) {
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
                else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(true); }
            }
            ov.addEventListener('click', function (e) {
                var b = e.target.closest('[data-r]');
                if (b) return close(b.dataset.r === '1');
                if (e.target === ov) close(false);
            });
            document.addEventListener('keydown', key, true);
            document.body.appendChild(ov);
            setTimeout(function () { var b = ov.querySelector('[data-r="1"]'); if (b) b.focus(); }, 40);
        });
    }
    function tell(o) { o.cancel = null; return ask(o); }

    var toastTimer;
    function toast(text, onUndo) {
        var old = document.querySelector('.tk-toast');
        if (old) old.remove();
        clearTimeout(toastTimer);
        var el = document.createElement('div');
        el.className = 'tk-toast';
        el.setAttribute('role', 'status');
        el.innerHTML = svg('checkCircle') + '<span>' + esc(text) + '</span>'
            + (onUndo ? '<button type="button" class="tk-toast__undo">' + esc(T.undo) + '</button>' : '');
        if (onUndo) el.querySelector('.tk-toast__undo').addEventListener('click', function () { onUndo(); el.remove(); });
        document.body.appendChild(el);
        toastTimer = setTimeout(function () {
            el.classList.add('is-leaving');
            setTimeout(function () { el.remove(); }, 220);
        }, onUndo ? 6000 : 2600);
    }

    function toggleMenu(force) {
        var m = $('tkMenu'), b = document.querySelector('[data-a="menu"]');
        var open = force != null ? force : m.hidden;
        m.hidden = !open;
        b.setAttribute('aria-expanded', String(open));
    }


    /* ─── Daten ────────────────────────────────────────────────────── */
    function resetToday() {
        ask({ title: T.askResetT, message: T.askResetM, variant: 'danger', confirm: T.reset }).then(function (ok) {
            if (!ok) return;
            var t = todayIso();
            allTasks().forEach(function (x) {
                if (st[x.id] && doneDay(x) === t) { delete st[x.id]; delete x.doneAt; (x.subtasks || []).forEach(function (s) { s.done = false; }); }
            });
            recordToday(); save(); render();
            toast(T.resetDone);
        });
    }
    function wipe() {
        ask({ title: T.askWipeT, message: T.askWipeM, variant: 'danger', confirm: T.del }).then(function (ok) {
            if (!ok) return;
            cats = []; history = {}; stats = { done: 0 }; st = {};
            streak = { streak: 0, lastDate: null, best: 0 };
            sel = null; view = 'today'; viewList = null; saveUi();
            if (detailMode) closeDetail();
            save(); render();
            toast(T.wiped);
        });
    }
    function exportAll() {
        var blob = new Blob([JSON.stringify({
            categories: cats, states: st, streakData: streak, history: history, stats: stats,
            exportDate: new Date().toISOString()
        }, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url;
        a.download = 'myworklog-aufgaben-' + todayIso() + '.json';
        a.click();
        URL.revokeObjectURL(url);
        toast(T.exported);
    }
    function importAll() {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = function (e) {
            var f = e.target.files[0];
            if (!f) return;
            var r = new FileReader();
            r.onload = function (ev) {
                var d;
                try {
                    d = JSON.parse(ev.target.result);
                    if (!d.categories || !Array.isArray(d.categories)) throw new Error('shape');
                } catch (err) {
                    tell({ title: T.badFileT, message: T.badFileM, variant: 'danger' });
                    return;
                }
                ask({ title: T.askImportT, message: fill(T.askImportM, { n: d.categories.length }), confirm: T.importIt }).then(function (ok) {
                    if (!ok) return;
                    cats = d.categories;
                    cats.forEach(function (c) { if (!Array.isArray(c.tasks)) c.tasks = []; });
                    st = d.states || {};
                    streak = d.streakData || { streak: 0, lastDate: null, best: 0 };
                    history = d.history || {};
                    stats = d.stats || { done: 0 };
                    migrateDoneAt();
                    sel = null; if (detailMode) closeDetail();
                    save(); render();
                    toast(T.imported);
                });
            };
            r.readAsText(f);
        };
        inp.click();
    }


    /* ─── Erinnerungen ─────────────────────────────────────────────────
       🔴 Kein `new Notification()` aus einer Seite, wenn es anders geht:
       auf Android wirft der Konstruktor. Der Service Worker der App ist
       auf / registriert und deckt diese Seite mit ab.                   */
    var remindTimer = null;
    function startReminders() {
        if (remindTimer) clearInterval(remindTimer);
        remindTimer = setInterval(checkReminders, 30000);
        checkReminders();
    }
    function notify(body) {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
            navigator.serviceWorker.getRegistration().then(function (reg) {
                if (reg && reg.showNotification) return reg.showNotification('MyWorkLog', { body: body });
                try { new Notification('MyWorkLog', { body: body }); } catch (e) {}
            }).catch(function () {});
            return;
        }
        try { new Notification('MyWorkLog', { body: body }); } catch (e) {}
    }
    var remindedAt = {};
    function checkReminders() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        var now = new Date();
        var hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        var v = todayView();
        v.over.concat(v.due).forEach(function (t) {
            var key = t.id + '@' + todayIso();
            if (t.reminder === hm && !remindedAt[key]) { remindedAt[key] = true; notify(T.stillOpen + t.name); }
        });
    }
    function askNotify() {
        if (!('Notification' in window) || Notification.permission !== 'default') return;
        ask({ title: T.askNotifT, message: T.askNotifM, confirm: T.yesNotif, cancel: T.notNow })
            .then(function (ok) { if (ok) Notification.requestPermission(); });
    }


    /* ─── Verdrahtung ──────────────────────────────────────────────── */
    document.addEventListener('click', function (e) {
        var el = e.target.closest('[data-a]');
        if (!el) {
            if (!e.target.closest('#tkMenu')) toggleMenu(false);
            return;
        }
        var a = el.dataset.a;
        if (a !== 'menu' && !el.closest('#tkMenu')) toggleMenu(false);

        if (a === 'view')         setView(el.dataset.view, el.dataset.list);
        else if (a === 'check')   { e.stopPropagation(); toggle(el.dataset.id); }
        else if (a === 'open')    select(el.dataset.id, true);
        else if (a === 'fold')    { ui['fold_' + el.dataset.k] = el.getAttribute('aria-expanded') === 'true'; saveUi(); renderMain(); }
        else if (a === 'closedetail') closeDetail();
        else if (a === 'deldetail') { if (detailMode === 'task' && sel) deleteTask(sel); else if (detailMode === 'list') deleteList(viewList); }
        else if (a === 'fcheck')  { if (sel) toggle(sel); }
        else if (a === 'due')     { var v = el.dataset.due; writeTask({ due: v === 'today' ? todayIso() : v === 'tomorrow' ? iso(addDays(today(), 1)) : v === 'nextweek' ? iso(addDays(today(), 7)) : '' }); renderDetail(); }
        else if (a === 'prio')    { writeTask({ priority: el.dataset.p }); renderDetail(); }
        else if (a === 'fday')    { var t = taskById(sel); if (t) { var d = parseInt(el.dataset.day, 10), ds = (t.days || []).slice(); var i = ds.indexOf(d); i === -1 ? ds.push(d) : ds.splice(i, 1); writeTask({ days: ds }); renderDetail(); } }
        else if (a === 'subcheck'){ var tt = taskById(sel); if (tt) { var s = tt.subtasks[parseInt(el.dataset.i, 10)]; s.done = !s.done; if (tt.subtasks.every(function (x) { return x.done; }) && !st[tt.id]) toggle(tt.id); else save(); renderDetail(); renderMain(); } }
        else if (a === 'subdel')  { var t2 = taskById(sel); if (t2) { t2.subtasks.splice(parseInt(el.dataset.i, 10), 1); save(); renderDetail(); renderMain(); } }
        else if (a === 'listcfg') { if (view === 'list') openDetail('list'); }
        else if (a === 'pickicon'){ writeList({ icon: el.dataset.ico }); renderDetail(); }
        else if (a === 'cday')    { var c = listById(viewList); if (c) { var dd = parseInt(el.dataset.day, 10), cs = (c.days || []).slice(); var j = cs.indexOf(dd); j === -1 ? cs.push(dd) : cs.splice(j, 1); writeList({ days: cs }); renderDetail(); } }
        else if (a === 'newlist') newList();
        else if (a === 'side')    { $('tkSide').classList.contains('is-open') ? closeSide() : openSide(); }
        else if (a === 'menu')    toggleMenu();
        else if (a === 'theme')   flipTheme();
        else if (a === 'export')  { toggleMenu(false); exportAll(); }
        else if (a === 'import')  { toggleMenu(false); importAll(); }
        else if (a === 'resettoday') { toggleMenu(false); resetToday(); }
        else if (a === 'wipe')    { toggleMenu(false); wipe(); }
    });

    $('tkScrim').addEventListener('click', function () { closeSide(); if (detailMode) closeDetail(); $('tkScrim').hidden = true; });

    document.addEventListener('input', function (e) {
        var id = e.target.id;
        if (id === 'tkAdd') renderHints();
        else if (id === 'tkFName') { autosize(e.target); clearTimeout(nameTimer); nameTimer = setTimeout(function () { writeTask({ name: $('tkFName').value.trim() || taskById(sel).name }); }, 250); }
        else if (id === 'tkFNote') { clearTimeout(noteTimer); noteTimer = setTimeout(function () { writeTask({ note: $('tkFNote').value.trim() }); }, 250); }
        else if (id === 'tkFCatName') { var v = e.target.value.trim(); if (v) writeList({ name: v }); }
    });
    document.addEventListener('change', function (e) {
        var id = e.target.id;
        if (id === 'tkFList') {
            var t = taskById(sel), from = listOf(t), to = listById(e.target.value);
            if (t && from && to && from !== to) { from.tasks.splice(from.tasks.indexOf(t), 1); to.tasks.push(t); save(); renderSide(); renderMain(); }
        }
        else if (id === 'tkFDue')    writeTask({ due: e.target.value });
        else if (id === 'tkFRepeat') writeTask({ recurring: e.target.value });
        else if (id === 'tkFRemind') { writeTask({ reminder: e.target.value }); if (e.target.value) { startReminders(); askNotify(); } }
        else if (id === 'tkFCatPrio')  writeList({ defaultPriority: e.target.value });
        else if (id === 'tkFCatReset') writeList({ autoReset: e.target.value });
    });

    document.addEventListener('keydown', function (e) {
        var tgt = e.target, id = tgt.id;
        var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tgt.tagName) || tgt.isContentEditable;

        if (id === 'tkAdd') {
            if (e.key === 'Enter') { e.preventDefault(); quickAdd(); }
            else if (e.key === 'Escape') { tgt.value = ''; renderHints(); tgt.blur(); }
            return;
        }
        if (id === 'tkNewListName') {
            if (e.key === 'Enter') { e.preventDefault(); createList(); }
            else if (e.key === 'Escape') { $('tkNewList').hidden = true; }
            return;
        }
        if (id === 'tkFSubAdd') {
            if (e.key === 'Enter') {
                e.preventDefault();
                var name = tgt.value.trim(), t = taskById(sel);
                if (name && t) { (t.subtasks = t.subtasks || []).push({ name: name, done: false }); tgt.value = ''; save(); renderDetail(); renderMain(); tgt.focus(); }
            }
            return;
        }
        if (id === 'tkFName' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tgt.blur(); return; }
        if (e.key === 'Escape') {
            if (!$('tkMenu').hidden) { toggleMenu(false); return; }
            if (typing) { tgt.blur(); return; }
            if (detailMode) { closeDetail(); return; }
            if ($('tkSide').classList.contains('is-open')) { closeSide(); return; }
            if (sel) { sel = null; renderMain(); }
            return;
        }
        if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); $('tkAdd').focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
        else if ((e.key === ' ' || e.key === 'x') && sel) { e.preventDefault(); toggle(sel); }
        else if (e.key === 'Enter' && sel) { e.preventDefault(); select(sel, true); setTimeout(function () { $('tkFName').focus(); }, 30); }
        else if ((e.key === 'Delete' || e.key === 'Backspace') && sel && tgt.closest && tgt.closest('.tk-row')) { e.preventDefault(); deleteTask(sel); }
    });

    /* Fokus auf einer Zeile (Tab) waehlt sie aus, ohne das Detail zu oeffnen. */
    document.addEventListener('focusin', function (e) {
        var row = e.target.classList && e.target.classList.contains('tk-row') ? e.target : null;
        if (row && row.dataset.id !== sel) select(row.dataset.id, false);
    });
    $('tkNewListName').addEventListener('blur', function () { if (!this.value.trim()) $('tkNewList').hidden = true; });


    /* ─── Theme ────────────────────────────────────────────────────── */
    function initTheme() {
        document.documentElement.setAttribute('data-theme', localStorage.getItem(SK.theme) || 'dark');
    }
    function flipTheme() {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(SK.theme, next);
    }


    /* ─── Start ────────────────────────────────────────────────────── */
    detailEl = $('tkDetail'); fTask = $('tkFTask'); fCat = $('tkFCat');
    initTheme();
    load();
    if (ui.view && ui.view !== 'list') view = ui.view;
    if (ui.view === 'list' && listById(ui.list)) { view = 'list'; viewList = ui.list; }
    autoReset();
    rollRecurring();
    bumpStreak();
    recordToday();
    save();
    render();
    startReminders();

    /* Ein anderer Tab hat die Daten geaendert: nachziehen statt driften. */
    window.addEventListener('storage', function (e) {
        if (e.key && e.key.indexOf('mwl_tasks_') === 0 && e.key !== SK.ui) { load(); render(); }
    });
    /* Ueber Mitternacht offen gelassen: Wiederholungen und Auto-Reset
       laufen dann ohne Neuladen. */
    var bootDay = todayIso();
    setInterval(function () {
        if (todayIso() === bootDay) return;
        bootDay = todayIso();
        autoReset(); rollRecurring(); save(); render();
    }, 60000);
})();
