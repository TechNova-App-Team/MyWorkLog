/* ═══ AUFGABEN ════════════════════════════════════════════════════════
 *
 * Ein Tag ist der Zustand dieser Seite. Es gibt genau EINEN Regler dafuer
 * (die Tagesleiste), und jede Zahl darunter gehorcht ihm.
 *
 * 🔴 Was die alte Fassung falsch machte, und was daraus folgt:
 *
 * 1. `updateKPIs()` filterte immer mit `isCatVisibleToday()` — auch wenn
 *    die Wochenansicht gerade Samstag zeigte. Kopfzeile und Liste meinten
 *    verschiedene Tage, und nichts im Bild sagte das. Hier laeuft ALLES
 *    ueber `dayView(dow)`; es gibt keinen zweiten Weg zu den Zahlen.
 *
 * 2. Es gab zwei Regler fuer denselben Zustand: `viewMode` (auto/manual)
 *    und `currentWeekDayIndex`. Derselbe Fehler wie `monthCompareSelect`
 *    neben `miniCalNav` in der Monatsansicht (CLAUDE.md). Der Modus ist
 *    ersatzlos weg.
 *
 * 3. Der Erledigt-Zustand steht in `mwl_tasks_states` als flache Abbildung
 *    id → true. Er ist NICHT nach Datum gefuehrt. Ein Haken auf dem Reiter
 *    "Samstag" hat deshalb am Montag denselben Task abgehakt. Ein Tag, der
 *    nicht heute ist, ist hier folglich ein PLAN: er zeigt, was ansteht,
 *    und sagt dazu, dass er keinen Erledigt-Zustand fuehrt. Lieber eine
 *    Luecke benennen als sie plausibel fuellen.
 *
 * 4. Der Meilenstein "50 Aufgaben insgesamt erledigen" prüfte `dc >= 50`,
 *    also 50 GLEICHZEITIG abgehakte. Label und Wert meinten Verschiedenes.
 *    `mwl_tasks_stats.done` zaehlt jetzt wirklich mit.
 *
 * 5. Kategorie-Symbole waren Emojis und liegen als Zeichen in den Daten
 *    (wie `entry.mood` in der App). Der gespeicherte Wert bleibt, wie er
 *    ist — uebersetzt wird an der AUSGABE, `agIcon()`.
 *
 * Test: node tools/aufgaben.test.mjs
 */
(function () {
    'use strict';

    /* ─── Sprache ──────────────────────────────────────────────────────
       Die statische /en/-Pipeline sieht nur, was im HTML steht. Alles,
       was hier erzeugt wird, braucht deshalb ein eigenes Woerterbuch —
       sonst steht auf /en/ Deutsch (CLAUDE.md, Deep-Dive-Regel).       */
    var EN = (document.documentElement.lang || 'de').toLowerCase().indexOf('en') === 0;
    var LOCALE = EN ? 'en-GB' : 'de-DE';

    var T = EN ? {
        dayShort:  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        dayLong:   ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        open: 'open', planned: 'planned', ofDone: 'of {t} done', done: 'done',
        today: 'Today', task: 'task', tasks: 'tasks',
        allClear: 'Everything scheduled for today is done.',
        someLeft: 'Check them off as you go. The day is done when the bar is full.',
        nothingToday: 'Nothing scheduled for {d}.',
        planNote: 'Completion is only tracked for today, so this day shows the plan. You can still add, edit and remove tasks.',
        noMatch: 'No task matches the filter.',
        noCatDay: 'No category is scheduled for {d}.',
        prioHigh: 'High', prioMid: 'Medium', prioLow: 'Low',
        recur: { daily: 'Daily', weekdays: 'Mon to Fri', weekly: 'Weekly', monthly: 'Monthly' },
        catNew: 'New category', catEdit: 'Edit category',
        every: 'every day', resetD: 'daily', resetW: 'weekly', resetM: 'monthly',
        autoReset: 'resets {r}',
        savedTasks: 'Saved', exported: 'Exported', imported: 'Imported',
        resetDone: 'Reset', deletedAll: 'All data deleted',
        catsLoaded: '{n} categories loaded',
        fileJson: 'JSON file saved',
        dayReset: 'Today is open again',
        askDelCatT: 'Delete category?',
        askDelCatM: '"{n}" will be deleted, including {c}.',
        askResetT: 'Reset today?',
        askResetM: 'Every task scheduled for today is marked open again. Categories and settings stay.',
        askWipeT: 'Delete everything?',
        askWipeM: 'All categories, tasks, milestones and history are deleted for good. This cannot be undone.',
        askImportT: 'Confirm import',
        askImportM: '{n} categories will be loaded. Your current data is replaced.',
        badFileT: 'Unusable file',
        badFileM: 'This is not a task export. Expected a JSON file holding a "categories" array.',
        askNotifT: 'Turn on reminders?',
        askNotifM: 'MyWorkLog can send a browser notification when a task is due. You can turn it off again in your browser settings.',
        yesNotif: 'Turn on', notNow: 'Not now',
        cancel: 'Cancel', del: 'Delete', reset: 'Reset', importIt: 'Import', ok: 'OK',
        stillOpen: 'Still open: ',
        goalNames: ['First task', 'Perfect day', 'Three day streak', 'Seven day streak', 'Organiser', 'Subtask pro', 'Fifty done'],
        goalReqs: ['Check off one task', 'Finish everything scheduled for one day', 'Finish three days in a row', 'Finish seven days in a row', 'Create five categories', 'Check off ten subtasks', 'Check off fifty tasks in total'],
        reached: 'reached'
    } : {
        dayShort:  ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
        dayLong:   ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        open: 'offen', planned: 'geplant', ofDone: 'von {t} erledigt', done: 'erledigt',
        today: 'Heute', task: 'Aufgabe', tasks: 'Aufgaben',
        allClear: 'Alles erledigt, was für heute anstand.',
        someLeft: 'Hak ab, was du schaffst. Der Tag ist fertig, wenn der Balken voll ist.',
        nothingToday: 'Für {d} ist nichts geplant.',
        planNote: 'Der Erledigt-Zustand wird nur für heute geführt, deshalb zeigt dieser Tag den Plan. Aufgaben lassen sich trotzdem anlegen, ändern und löschen.',
        noMatch: 'Keine Aufgabe passt zum Filter.',
        noCatDay: 'Für {d} ist keine Kategorie eingeplant.',
        prioHigh: 'Hoch', prioMid: 'Mittel', prioLow: 'Niedrig',
        recur: { daily: 'Täglich', weekdays: 'Mo bis Fr', weekly: 'Wöchentlich', monthly: 'Monatlich' },
        catNew: 'Neue Kategorie', catEdit: 'Kategorie bearbeiten',
        every: 'jeden Tag', resetD: 'täglich', resetW: 'wöchentlich', resetM: 'monatlich',
        autoReset: 'setzt sich {r} zurück',
        savedTasks: 'Gespeichert', exported: 'Exportiert', imported: 'Importiert',
        resetDone: 'Zurückgesetzt', deletedAll: 'Alle Daten gelöscht',
        catsLoaded: '{n} Kategorien geladen',
        fileJson: 'JSON-Datei gespeichert',
        dayReset: 'Heute ist wieder offen',
        askDelCatT: 'Kategorie löschen?',
        askDelCatM: '"{n}" wird gelöscht, inklusive {c}.',
        askResetT: 'Heute zurücksetzen?',
        askResetM: 'Alle für heute geplanten Aufgaben werden wieder als offen markiert. Kategorien und Einstellungen bleiben.',
        askWipeT: 'Wirklich alles löschen?',
        askWipeM: 'Alle Kategorien, Aufgaben, Meilensteine und der Verlauf werden unwiderruflich gelöscht. Das lässt sich nicht rückgängig machen.',
        askImportT: 'Import bestätigen',
        askImportM: '{n} Kategorien werden geladen. Deine aktuellen Daten werden dabei ersetzt.',
        badFileT: 'Datei nicht lesbar',
        badFileM: 'Das ist kein Aufgaben-Export. Erwartet wird eine JSON-Datei mit einem "categories"-Array.',
        askNotifT: 'Erinnerungen einschalten?',
        askNotifM: 'MyWorkLog kann dich per Browser-Benachrichtigung erinnern, wenn eine Aufgabe fällig ist. Du kannst das in den Browser-Einstellungen wieder abschalten.',
        yesNotif: 'Einschalten', notNow: 'Nicht jetzt',
        cancel: 'Abbrechen', del: 'Löschen', reset: 'Zurücksetzen', importIt: 'Importieren', ok: 'OK',
        stillOpen: 'Noch offen: ',
        goalNames: ['Erste Aufgabe', 'Perfekter Tag', 'Serie über 3 Tage', 'Serie über 7 Tage', 'Organisator', 'Unteraufgaben-Profi', 'Fünfzig abgehakt'],
        goalReqs: ['Eine Aufgabe abhaken', 'Alles erledigen, was an einem Tag ansteht', 'Drei Tage hintereinander alles schaffen', 'Sieben Tage hintereinander alles schaffen', 'Fünf Kategorien anlegen', 'Zehn Unteraufgaben abhaken', 'Insgesamt fünfzig Aufgaben abhaken'],
        reached: 'erreicht'
    };

    function fill(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
    function plural(n) { return n === 1 ? T.task : T.tasks; }


    /* ─── Symbole ──────────────────────────────────────────────────────
       Unveraenderte Lucide-Pfade. 🔴 Nie von Hand kuerzen oder
       nachzeichnen: ein <svg> hat overflow:hidden, alles ausserhalb von
       0..24 faellt still weg (CLAUDE.md, Datenschutz-Fenster).          */
    var P = {
        check:        '<polyline points="20 6 9 17 4 12"/>',
        chevronLeft:  '<path d="m15 18-6-6 6-6"/>',
        chevronDown:  '<path d="m6 9 6 6 6-6"/>',
        arrowLeft:    '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
        plus:         '<path d="M5 12h14"/><path d="M12 5v14"/>',
        x:            '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        search:       '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        pencil:       '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
        trash:        '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
        sliders:      '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
        sun:          '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
        moon:         '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
        download:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
        upload:       '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
        rotate:       '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
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
        /* Kategorie-Symbole */
        clipboardList:'<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
        wrench:       '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        lightbulb:    '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
        bookOpen:     '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
        activity:     '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
        sunrise:      '<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
        briefcase:    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
        utensils:     '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
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
        plane:        '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
        coffee:       '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'
    };

    /* Die Reihe, aus der der Nutzer waehlt. Der gespeicherte Wert ist der
       NAME, nicht das Zeichen — Symbole lassen sich damit spaeter tauschen,
       ohne Nutzerdaten anzufassen. */
    var PICKABLE = ['clipboardList', 'checkCircle', 'wrench', 'lightbulb', 'bookOpen', 'activity',
        'sunrise', 'moon', 'briefcase', 'utensils', 'coffee', 'target', 'zap', 'flame', 'dumbbell',
        'palette', 'penLine', 'folder', 'rocket', 'star', 'award', 'home', 'sparkles', 'smartphone',
        'monitor', 'gamepad', 'pill', 'cart', 'phone', 'plane'];

    /* 🔴 Bruecke fuer den Altbestand: `cat.icon` haelt bei bestehenden
       Nutzern ein Emoji-ZEICHEN. Es wird nicht migriert (dieselbe Regel
       wie bei `entry.mood`), sondern beim Zeichnen uebersetzt.          */
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
        var d = P[name];
        if (!d) d = P.clipboardList;
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
            (cls ? ' class="' + cls + '"' : '') + '>' + d + '</svg>';
    }
    /* Uebersetzt einen gespeicherten Wert (Name ODER Alt-Emoji) in ein SVG. */
    function agIcon(v) {
        if (!v) return svg('clipboardList');
        if (P[v]) return svg(v);
        if (FROM_EMOJI[v]) return svg(FROM_EMOJI[v]);
        return svg('clipboardList');
    }


    /* ─── Speicher ─────────────────────────────────────────────────────
       Schluessel bleiben, wie sie waren — ein Redesign darf niemandem
       seine Daten wegnehmen. Zwei sind neu:
       `history` traegt den Verlauf je Datum, `stats` zaehlt kumuliert.  */
    var SK = {
        cats:    'mwl_tasks_cats',
        states:  'mwl_tasks_states',
        achiev:  'mwl_tasks_achievements',
        streak:  'mwl_tasks_streak',
        theme:   'mwl_tasks_theme',
        reset:   'mwl_tasks_lastReset',
        history: 'mwl_tasks_history',
        stats:   'mwl_tasks_stats'
    };

    var cats = [], achiev = {}, streak = {}, history = {}, stats = {};
    var filter = 'all', query = '', selDow = new Date().getDay();
    var editTask = null, editCat = null, pickedIcon = PICKABLE[0], folded = {};

    function jget(k, fb) {
        try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; }
        catch (e) { return fb; }
    }
    function load() {
        cats    = jget(SK.cats, []);
        achiev  = jget(SK.achiev, {});
        streak  = jget(SK.streak, { streak: 0, lastDate: null, best: 0 });
        history = jget(SK.history, {});
        stats   = jget(SK.stats, { done: 0 });
        if (!Array.isArray(cats)) cats = [];
        if (typeof stats.done !== 'number') stats.done = 0;
    }
    function save() {
        localStorage.setItem(SK.cats, JSON.stringify(cats));
        localStorage.setItem(SK.achiev, JSON.stringify(achiev));
        localStorage.setItem(SK.streak, JSON.stringify(streak));
        localStorage.setItem(SK.history, JSON.stringify(history));
        localStorage.setItem(SK.stats, JSON.stringify(stats));
    }
    function states() { return jget(SK.states, {}) || {}; }
    function setStates(s) { localStorage.setItem(SK.states, JSON.stringify(s)); }

    /* 🔴 Die alte Fassung maskierte ueber textContent → innerHTML. Das
       deckt & < > ab, aber NICHT das Anfuehrungszeichen — und genau dort
       landete der Kategoriename: value="…", title="…", aria-label="…".
       Ein Name mit " brach das Attribut auf. Deshalb hier vollstaendig. */
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function $(id) { return document.getElementById(id); }
    function iso(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }


    /* ─── Theme ────────────────────────────────────────────────────── */
    function initTheme() {
        document.documentElement.setAttribute('data-theme', localStorage.getItem(SK.theme) || 'dark');
    }
    function flipTheme() {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(SK.theme, next);
    }


    /* ─── Auto-Reset ───────────────────────────────────────────────── */
    function autoReset() {
        var today = new Date().toDateString();
        if (localStorage.getItem(SK.reset) === today) return;
        var st = states(), now = new Date(), dow = now.getDay(), dom = now.getDate();
        cats.forEach(function (c) {
            if (!c.autoReset) return;
            var due = c.autoReset === 'daily'
                || (c.autoReset === 'weekly' && dow === 1)
                || (c.autoReset === 'monthly' && dom === 1);
            if (due) (c.tasks || []).forEach(function (t) { delete st[t.id]; });
        });
        setStates(st);
        localStorage.setItem(SK.reset, today);
    }


    /* ─── Der Tag: die einzige Quelle fuer alle Zahlen ─────────────────
       Jede Kennzahl der Seite kommt hier heraus. Es gibt keinen zweiten
       Weg — genau das war der Fehler der alten Fassung.                */
    function onDay(list, dow) {
        return (list || []).filter(function (x) {
            return !x.days || !x.days.length || x.days.indexOf(dow) !== -1;
        });
    }
    function dayView(dow) {
        var st = states(), out = { cats: [], total: 0, done: 0 };
        onDay(cats, dow).forEach(function (c) {
            var all = onDay(c.tasks, dow);
            var d = all.filter(function (t) { return st[t.id]; }).length;
            out.total += all.length;
            out.done  += d;
            out.cats.push({ cat: c, ci: cats.indexOf(c), all: all, done: d });
        });
        return out;
    }
    function isToday(dow) { return dow === new Date().getDay(); }


    /* ─── Verlauf ──────────────────────────────────────────────────────
       Nur HEUTE wird geschrieben. Tage ohne Aufzeichnung bleiben leer
       und werden als Umriss gezeichnet — sie als sauber zu werten waere
       derselbe Fehler wie das feste "OK" im alten Compliance-Audit.    */
    function recordToday() {
        var v = dayView(new Date().getDay());
        if (!v.total) return;
        history[iso(new Date())] = { d: v.done, t: v.total };
        var keys = Object.keys(history).sort();
        while (keys.length > 400) delete history[keys.shift()];
    }
    function bumpStreak() {
        var v = dayView(new Date().getDay());
        if (!v.total || v.done !== v.total) return;
        var today = new Date().toDateString();
        if (streak.lastDate === today) return;
        var yst = new Date(Date.now() - 86400000).toDateString();
        streak.streak = (streak.lastDate === yst) ? (streak.streak || 0) + 1 : 1;
        streak.lastDate = today;
        streak.best = Math.max(streak.best || 0, streak.streak);
    }


    /* ─── Zeichnen ─────────────────────────────────────────────────── */
    function render() {
        renderWeek();
        renderVerdict();
        renderCats();
        renderHistory();
        renderGoals();
    }

    /* Die Tagesleiste. Die Saeule misst die geplante Last gegen den
       staerksten Tag der Woche — ein echter Nenner, kein erfundener. */
    function renderWeek() {
        var host = $('agWeek');
        var today = new Date(), tDow = today.getDay();
        /* Montag dieser Woche. getDay() liefert 0 fuer Sonntag, deshalb
           die Korrektur — sonst beginnt die Woche am Sonntag. */
        var mon = new Date(today);
        mon.setDate(today.getDate() - ((tDow + 6) % 7));

        var week = [], max = 0;
        for (var i = 0; i < 7; i++) {
            var d = new Date(mon);
            d.setDate(mon.getDate() + i);
            var dow = d.getDay();
            var n = 0;
            onDay(cats, dow).forEach(function (c) { n += onDay(c.tasks, dow).length; });
            if (n > max) max = n;
            week.push({ date: d, dow: dow, n: n });
        }

        host.innerHTML = week.map(function (w) {
            var cls = 'ag-day'
                + (w.dow === selDow ? ' is-sel' : '')
                + (w.dow === tDow ? ' is-today' : '')
                + (w.n === 0 ? ' is-empty' : '');
            var pct = max ? Math.round(w.n / max * 100) : 0;
            var label = T.dayLong[w.dow] + ', ' + w.date.getDate() + '. '
                + w.date.toLocaleDateString(LOCALE, { month: 'long' })
                + ' — ' + w.n + ' ' + plural(w.n);
            return '<button type="button" class="' + cls + '" data-a="day" data-dow="' + w.dow + '"'
                + ' aria-pressed="' + (w.dow === selDow) + '" title="' + esc(label) + '">'
                + '<span class="ag-day__name">' + T.dayShort[w.dow] + '</span>'
                + '<span class="ag-day__num">' + w.date.getDate() + '</span>'
                + '<span class="ag-day__load"><i style="width:' + pct + '%"></i></span>'
                + '</button>';
        }).join('');
    }

    function renderVerdict() {
        var v = dayView(selDow), here = isToday(selDow);
        var box = $('agVerdict'), meter = $('agMeter');
        var open = v.total - v.done;

        box.classList.toggle('is-clear', here && v.total > 0 && open === 0);
        meter.classList.toggle('is-plan', !here);

        $('agDayName').textContent = here ? T.today : T.dayLong[selDow];
        $('agKicker').textContent = here ? T.open : T.planned;
        $('agNum').firstChild.nodeValue = String(here ? open : v.total);
        $('agUnit').textContent = ' ' + plural(here ? open : v.total);

        if (!v.total) {
            $('agSay').textContent = fill(T.nothingToday, { d: here ? T.today.toLowerCase() : T.dayLong[selDow] });
        } else if (here && open === 0) {
            $('agSay').textContent = T.allClear;
        } else if (here) {
            $('agSay').textContent = T.someLeft;
        } else {
            $('agSay').textContent = '';
        }

        var pct = v.total ? Math.round(v.done / v.total * 100) : 0;
        $('agFill').style.width = pct + '%';
        $('agDone').textContent = v.done;
        $('agTotal').textContent = v.total;
        $('agNote').textContent = T.planNote;

        /* Offen/Erledigt sind an einem Plantag ohne Deckung — dann sind
           sie abgeschaltet statt still falsch zu filtern. */
        ['open', 'done'].forEach(function (f) {
            var b = document.querySelector('.ag-seg__btn[data-f="' + f + '"]');
            if (b) b.disabled = !here;
        });
        if (!here && (filter === 'open' || filter === 'done')) setFilter('all', true);
    }

    function matches(t, st, here) {
        if (query && String(t.name || '').toLowerCase().indexOf(query) === -1) return false;
        if (filter === 'high') return t.priority === 'high';
        if (!here) return true;
        if (filter === 'open') return !st[t.id];
        if (filter === 'done') return !!st[t.id];
        return true;
    }

    function renderCats() {
        var host = $('agList'), v = dayView(selDow), here = isToday(selDow), st = states();

        if (!cats.length) { host.innerHTML = ''; $('agEmpty').style.display = 'block'; return; }
        $('agEmpty').style.display = 'none';

        if (!v.cats.length) {
            host.innerHTML = '<p class="ag-note">' + esc(fill(T.noCatDay, { d: T.dayLong[selDow] })) + '</p>';
            return;
        }

        var shown = 0;
        var html = v.cats.map(function (g) {
            var rows = g.all.filter(function (t) { return matches(t, st, here); });
            shown += rows.length;
            var pct = g.all.length ? Math.round(g.done / g.all.length * 100) : 0;
            var clear = g.all.length > 0 && g.done === g.all.length;
            var isFolded = !!folded[g.cat.id];

            var meta = [];
            if (g.cat.days && g.cat.days.length) {
                meta.push(g.cat.days.slice().sort().map(function (d) { return T.dayShort[d]; }).join(', '));
            } else {
                meta.push(T.every);
            }
            if (g.cat.autoReset) {
                meta.push(fill(T.autoReset, {
                    r: g.cat.autoReset === 'daily' ? T.resetD : g.cat.autoReset === 'weekly' ? T.resetW : T.resetM
                }));
            }

            return '<section class="ag-cat">'
                + '<div class="ag-cat__head">'
                    + '<span class="ag-cat__ico">' + agIcon(g.cat.icon) + '</span>'
                    + '<span class="ag-cat__id">'
                        + '<input class="ag-cat__name" value="' + esc(g.cat.name) + '" data-a="rename" data-c="' + g.ci + '" aria-label="' + esc(g.cat.name) + '">'
                        + '<span class="ag-cat__meta">' + esc(meta.join(' · ')) + '</span>'
                    + '</span>'
                    + '<span class="ag-cat__stand">'
                        + (here
                            ? '<span class="ag-cat__cnt' + (clear ? ' is-clear' : '') + '">' + g.done + '/' + g.all.length + '</span>'
                              + '<span class="ag-cat__bar' + (clear ? ' is-clear' : '') + '"><i style="width:' + pct + '%"></i></span>'
                            : '<span class="ag-cat__cnt">' + g.all.length + '</span>')
                        + '<button type="button" class="ag-ib" data-a="catcfg" data-c="' + g.ci + '" aria-label="' + esc(T.catEdit) + '">' + svg('sliders') + '</button>'
                        + '<button type="button" class="ag-ib' + (isFolded ? ' is-folded' : '') + '" data-a="fold" data-cid="' + esc(g.cat.id) + '" aria-expanded="' + !isFolded + '">' + svg('chevronDown', 'ag-chev') + '</button>'
                    + '</span>'
                + '</div>'
                + '<div class="ag-cat__body' + (isFolded ? ' is-folded' : '') + '">'
                    + rows.map(function (t) { return taskHTML(t, g.cat, g.ci, st, here); }).join('')
                    + '<div class="ag-add">'
                        + '<span class="ag-add__ico">' + svg('plus') + '</span>'
                        + '<input type="text" autocomplete="off" data-a="addtask" data-c="' + g.ci + '" placeholder="' + esc(EN ? 'Add a task' : 'Aufgabe hinzufügen') + '">'
                    + '</div>'
                + '</div>'
            + '</section>';
        }).join('');

        if (!shown && (query || filter !== 'all')) {
            html += '<p class="ag-note">' + esc(T.noMatch) + '</p>';
        }
        host.innerHTML = html;
    }

    function tag(cls, icon, text) {
        return '<span class="ag-tag' + (cls ? ' ' + cls : '') + '">'
            + (icon ? svg(icon) : '') + '<span class="ag-tag__n">' + esc(text) + '</span></span>';
    }

    function taskHTML(t, cat, ci, st, here) {
        var ti = (cat.tasks || []).indexOf(t);
        var done = here && !!st[t.id];
        var tags = [];

        if (t.priority === 'high')        tags.push(tag('ag-tag--high', 'flag', T.prioHigh));
        else if (t.priority === 'medium') tags.push(tag('ag-tag--mid', 'flag', T.prioMid));
        else if (t.priority === 'low')    tags.push(tag('ag-tag--low', 'flag', T.prioLow));

        if (t.due) {
            var dd = new Date(t.due + 'T00:00:00');
            var td = new Date(); td.setHours(0, 0, 0, 0);
            var over = dd < td && !done;
            tags.push(tag(over ? 'ag-tag--over' : '', 'calendar',
                dd.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })));
        }
        if (t.reminder) tags.push(tag('', 'bell', t.reminder));
        if (t.recurring && t.recurring !== 'none') tags.push(tag('', 'repeat', T.recur[t.recurring] || t.recurring));
        if (t.days && t.days.length) {
            tags.push(tag('', 'clock', t.days.slice().sort().map(function (d) { return T.dayShort[d]; }).join(', ')));
        }

        var subs = t.subtasks || [];
        var subHTML = subs.map(function (s, si) {
            return '<div class="ag-sub' + (s.done ? ' is-done' : '') + '">'
                + '<button type="button" class="ag-sub__cb" data-a="sub" data-c="' + ci + '" data-t="' + ti + '" data-s="' + si + '" aria-pressed="' + !!s.done + '" aria-label="' + esc(s.name) + '">' + svg('check') + '</button>'
                + '<span class="ag-sub__lbl">' + esc(s.name) + '</span>'
                + '<button type="button" class="ag-ib ag-sub__del ag-ib--danger" data-a="subdel" data-c="' + ci + '" data-t="' + ti + '" data-s="' + si + '" aria-label="' + esc(T.del) + '">' + svg('x') + '</button>'
            + '</div>';
        }).join('');

        return '<div class="ag-task">'
            + '<div class="ag-row' + (done ? ' is-done' : '') + '">'
                + '<button type="button" class="ag-cb" data-a="check" data-id="' + esc(t.id) + '" data-c="' + ci + '"'
                    + (here ? '' : ' disabled') + ' aria-pressed="' + done + '" aria-label="' + esc(t.name) + '">' + svg('check') + '</button>'
                + '<span class="ag-row__id">'
                    + '<span class="ag-row__txt">' + esc(t.name) + '</span>'
                    + (t.note ? '<span class="ag-row__note">' + esc(t.note) + '</span>' : '')
                    + (tags.length ? '<span class="ag-tags">' + tags.join('') + '</span>' : '')
                + '</span>'
                + '<span class="ag-row__acts">'
                    + '<button type="button" class="ag-ib" data-a="edit" data-c="' + ci + '" data-t="' + ti + '" aria-label="' + esc(EN ? 'Edit' : 'Bearbeiten') + '">' + svg('pencil') + '</button>'
                    + '<button type="button" class="ag-ib ag-ib--danger" data-a="deltask" data-c="' + ci + '" data-t="' + ti + '" aria-label="' + esc(T.del) + '">' + svg('trash') + '</button>'
                + '</span>'
            + '</div>'
            + (subs.length ? '<div class="ag-subs">' + subHTML + '</div>' : '')
            + '<div class="ag-add ag-add--sub">'
                + '<span class="ag-add__ico">' + svg('plus') + '</span>'
                + '<input type="text" autocomplete="off" data-a="addsub" data-c="' + ci + '" data-t="' + ti + '" placeholder="' + esc(EN ? 'Add a subtask' : 'Unteraufgabe hinzufügen') + '">'
            + '</div>'
        + '</div>';
    }

    /* 30 Tage Verlauf. Drei Zustaende, drei Farben, eine Aussage —
       nicht Art UND Hoehe in derselben Farbe (CLAUDE.md, Heatmap). */
    function renderHistory() {
        var host = $('agHist'), out = [], todayIso = iso(new Date());
        for (var i = 29; i >= 0; i--) {
            var d = new Date(); d.setDate(d.getDate() - i);
            var key = iso(d), rec = history[key];
            var cls = 'ag-hist__d', title = d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
            if (!rec || !rec.t) {
                cls += ' is-none';
                title += ' · ' + (EN ? 'no record' : 'kein Eintrag');
            } else if (rec.d >= rec.t) {
                cls += ' is-full';
                title += ' · ' + rec.d + '/' + rec.t;
            } else {
                cls += ' is-part';
                title += ' · ' + rec.d + '/' + rec.t;
            }
            if (key === todayIso) cls += ' is-today';
            out.push('<span class="' + cls + '" title="' + esc(title) + '"></span>');
        }
        host.innerHTML = out.join('');

        $('agStreak').textContent = streak.streak || 0;
        $('agBest').textContent = streak.best || 0;
        $('agTotalDone').textContent = stats.done || 0;
    }

    /* Meilensteine mit gemessenem Fortschritt. Ein `achiev`-Flag heisst
       "einmal erreicht" und bleibt stehen; die Zahl daneben ist live. */
    function goalState() {
        var subs = 0, dcNow = 0, st = states();
        cats.forEach(function (c) {
            (c.tasks || []).forEach(function (t) {
                if (st[t.id]) dcNow++;
                (t.subtasks || []).forEach(function (s) { if (s.done) subs++; });
            });
        });
        return [
            { k: 'first',  n: Math.min(stats.done, 1),        m: 1,  icon: 'star' },
            { k: 'allDay', n: achiev.allDay ? 1 : 0,          m: 1,  icon: 'target' },
            { k: 's3',     n: Math.min(streak.best || 0, 3),  m: 3,  icon: 'flame' },
            { k: 's7',     n: Math.min(streak.best || 0, 7),  m: 7,  icon: 'award' },
            { k: 'org',    n: Math.min(cats.length, 5),       m: 5,  icon: 'folder' },
            { k: 'sub',    n: Math.min(subs, 10),             m: 10, icon: 'listChecks' },
            { k: 't50',    n: Math.min(stats.done, 50),       m: 50, icon: 'rocket' }
        ].map(function (g, i) {
            g.hit = achiev[g.k] || g.n >= g.m;
            g.name = T.goalNames[i];
            g.req = T.goalReqs[i];
            return g;
        });
    }
    function renderGoals() {
        $('agGoals').innerHTML = goalState().map(function (g) {
            return '<div class="ag-goal' + (g.hit ? ' is-done' : '') + '">'
                + '<span class="ag-goal__ico">' + svg(g.icon) + '</span>'
                + '<span class="ag-goal__id">'
                    + '<span class="ag-goal__n">' + esc(g.name) + '</span>'
                    + '<span class="ag-goal__r">' + esc(g.req) + '</span>'
                + '</span>'
                + '<span class="ag-goal__p">' + (g.hit ? esc(T.reached) : g.n + ' / ' + g.m) + '</span>'
            + '</div>';
        }).join('');
    }

    function checkGoals() {
        var v = dayView(new Date().getDay());
        var subs = 0;
        cats.forEach(function (c) {
            (c.tasks || []).forEach(function (t) { (t.subtasks || []).forEach(function (s) { if (s.done) subs++; }); });
        });
        var hit = null;
        function mark(k, cond, i) { if (cond && !achiev[k]) { achiev[k] = true; hit = T.goalNames[i]; } }
        mark('first',  stats.done >= 1, 0);
        mark('allDay', v.total > 0 && v.done === v.total, 1);
        mark('s3',     (streak.streak || 0) >= 3, 2);
        mark('s7',     (streak.streak || 0) >= 7, 3);
        mark('org',    cats.length >= 5, 4);
        mark('sub',    subs >= 10, 5);
        mark('t50',    stats.done >= 50, 6);
        if (hit) toast(hit, T.reached);
    }

    /* Ein Durchgang: Zustand fortschreiben, speichern, zeichnen. Genau
       eine Stelle — Zeichnen darf nirgends sonst Zustand veraendern. */
    function commit() {
        bumpStreak();
        recordToday();
        checkGoals();
        save();
        render();
    }


    /* ─── Bedienung ────────────────────────────────────────────────── */
    function setFilter(f, quiet) {
        filter = f;
        document.querySelectorAll('.ag-seg__btn').forEach(function (b) {
            b.classList.toggle('is-on', b.dataset.f === f);
            b.setAttribute('aria-pressed', String(b.dataset.f === f));
        });
        if (!quiet) renderCats();
    }

    function toggleCheck(id, ci) {
        var st = states(), next = !st[id];
        st[id] = next;
        if (!next) delete st[id];
        if (next) stats.done = (stats.done || 0) + 1;
        var task = (cats[ci] && cats[ci].tasks || []).filter(function (t) { return t.id === id; })[0];
        if (task && task.subtasks && task.subtasks.length) {
            task.subtasks.forEach(function (s) { s.done = next; });
        }
        setStates(st);
        commit();
    }

    function addTask(ci, el) {
        var name = el.value.trim();
        if (!name) return;
        if (!cats[ci].tasks) cats[ci].tasks = [];
        cats[ci].tasks.push({
            id: 'tk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: name,
            priority: cats[ci].defaultPriority || '',
            days: [], due: '', recurring: 'none', reminder: '', note: '', subtasks: []
        });
        el.value = '';
        save();
        render();
        focusAdd('[data-a="addtask"][data-c="' + ci + '"]');
    }
    function addSub(ci, ti, el) {
        var name = el.value.trim();
        if (!name) return;
        var t = cats[ci].tasks[ti];
        if (!t.subtasks) t.subtasks = [];
        t.subtasks.push({ name: name, done: false });
        el.value = '';
        save();
        render();
        focusAdd('[data-a="addsub"][data-c="' + ci + '"][data-t="' + ti + '"]');
    }
    /* Nach dem Neuzeichnen ist das alte Feld weg — der Fokus muss auf das
       neue, sonst reisst jede Eingabe die Tastatur ab. */
    function focusAdd(sel) {
        var el = document.querySelector(sel);
        if (el) el.focus();
    }

    function toggleSub(ci, ti, si) {
        var t = cats[ci].tasks[ti], subs = t.subtasks || [];
        subs[si].done = !subs[si].done;
        var st = states();
        if (subs.length && subs.every(function (s) { return s.done; })) {
            if (!st[t.id]) { st[t.id] = true; stats.done = (stats.done || 0) + 1; setStates(st); }
        } else if (st[t.id]) {
            delete st[t.id];
            setStates(st);
        }
        commit();
    }


    /* ─── Dialoge ──────────────────────────────────────────────────── */
    function open(id) { $(id).classList.add('is-open'); }
    function shut(id) { $(id).classList.remove('is-open'); }

    function ask(o) {
        return new Promise(function (resolve) {
            var danger = o.variant === 'danger';
            var ov = document.createElement('div');
            ov.className = 'ag-ov ag-ov--ask is-open';
            ov.innerHTML = '<div class="ag-modal ag-ask" role="alertdialog" aria-modal="true">'
                + '<div class="ag-ask__body">'
                    + '<span class="ag-ask__ico ' + (danger ? 't-danger' : 't-primary') + '">' + svg(danger ? 'alert' : 'info') + '</span>'
                    + '<p class="ag-ask__t">' + esc(o.title) + '</p>'
                    + (o.message ? '<p class="ag-ask__m">' + esc(o.message) + '</p>' : '')
                + '</div>'
                + '<div class="ag-modal__foot ag-ask__foot">'
                    + (o.cancel === null ? '' : '<button type="button" class="ag-link" data-r="0">' + esc(o.cancel || T.cancel) + '</button>')
                    + '<button type="button" class="ag-link ' + (danger ? 'ag-link--solid-danger' : 'ag-link--go') + '" data-r="1">' + esc(o.confirm || T.ok) + '</button>'
                + '</div>'
            + '</div>';

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
            setTimeout(function () { var b = ov.querySelector('[data-r="1"]'); if (b) b.focus(); }, 50);
        });
    }
    function tell(o) { o.cancel = null; return ask(o); }

    var toastTimer;
    function toast(title, sub) {
        var old = document.querySelector('.ag-toast');
        if (old) old.remove();
        clearTimeout(toastTimer);
        var el = document.createElement('div');
        el.className = 'ag-toast';
        el.setAttribute('role', 'status');
        el.innerHTML = svg('checkCircle') + '<span><b>' + esc(title) + '</b>' + (sub ? ' <span>' + esc(sub) + '</span>' : '') + '</span>';
        document.body.appendChild(el);
        toastTimer = setTimeout(function () { el.remove(); }, 3200);
    }

    function pickDays(id) {
        var out = [];
        document.querySelectorAll('#' + id + ' .ag-chip.is-on').forEach(function (c) { out.push(parseInt(c.dataset.day, 10)); });
        return out;
    }
    function setDays(id, days) {
        document.querySelectorAll('#' + id + ' .ag-chip').forEach(function (c) {
            c.classList.toggle('is-on', (days || []).indexOf(parseInt(c.dataset.day, 10)) !== -1);
        });
    }

    /* Kategorie anlegen */
    function newCat() {
        pickedIcon = PICKABLE[0];
        $('agCatName').value = '';
        $('agCatPrio').value = '';
        setDays('agCatDays', []);
        $('agIcons').innerHTML = PICKABLE.map(function (n, i) {
            return '<button type="button" class="ag-ico-pick' + (i === 0 ? ' is-on' : '') + '" data-a="pickicon" data-ico="' + n + '" aria-label="' + n + '">' + svg(n) + '</button>';
        }).join('');
        open('agModalCat');
        setTimeout(function () { $('agCatName').focus(); }, 60);
    }
    function saveCat() {
        var name = $('agCatName').value.trim();
        if (!name) { $('agCatName').focus(); return; }
        cats.push({
            id: 'cat_' + Date.now(),
            name: name,
            icon: pickedIcon,
            tasks: [],
            defaultPriority: $('agCatPrio').value,
            days: pickDays('agCatDays'),
            autoReset: ''
        });
        shut('agModalCat');
        commit();
    }

    /* Kategorie bearbeiten */
    function openCatCfg(ci) {
        editCat = ci;
        var c = cats[ci];
        $('agCatEditSub').textContent = c.name;
        $('agCatEditName').value = c.name;
        $('agCatEditPrio').value = c.defaultPriority || '';
        $('agCatEditReset').value = c.autoReset || '';
        setDays('agCatEditDays', c.days);
        open('agModalCatEdit');
    }
    function saveCatCfg() {
        if (editCat === null) return;
        var c = cats[editCat];
        c.name = $('agCatEditName').value.trim() || c.name;
        c.defaultPriority = $('agCatEditPrio').value;
        c.autoReset = $('agCatEditReset').value;
        c.days = pickDays('agCatEditDays');
        shut('agModalCatEdit');
        commit();
    }
    function delCat() {
        if (editCat === null) return;
        var ci = editCat, c = cats[ci], n = (c.tasks || []).length;
        ask({
            title: T.askDelCatT,
            message: fill(T.askDelCatM, { n: c.name, c: n + ' ' + plural(n) }),
            variant: 'danger',
            confirm: T.del
        }).then(function (ok) {
            if (!ok) return;
            cats.splice(ci, 1);
            shut('agModalCatEdit');
            commit();
        });
    }

    /* Aufgabe bearbeiten */
    function openTask(ci, ti) {
        editTask = { ci: ci, ti: ti };
        var t = cats[ci].tasks[ti];
        $('agTaskSub').textContent = cats[ci].name;
        $('agTaskName').value = t.name;
        $('agTaskPrio').value = t.priority || '';
        $('agTaskDue').value = t.due || '';
        $('agTaskRemind').value = t.reminder || '';
        $('agTaskNote').value = t.note || '';
        setDays('agTaskDays', t.days);
        document.querySelectorAll('#agTaskRepeat .ag-chip').forEach(function (c) {
            c.classList.toggle('is-on', c.dataset.rep === (t.recurring || 'none'));
        });
        open('agModalTask');
        setTimeout(function () { $('agTaskName').focus(); }, 60);
    }
    function saveTask() {
        if (!editTask) return;
        var t = cats[editTask.ci].tasks[editTask.ti];
        t.name = $('agTaskName').value.trim() || t.name;
        t.priority = $('agTaskPrio').value;
        t.due = $('agTaskDue').value;
        t.reminder = $('agTaskRemind').value;
        t.note = $('agTaskNote').value.trim();
        t.days = pickDays('agTaskDays');
        var r = document.querySelector('#agTaskRepeat .ag-chip.is-on');
        t.recurring = r ? r.dataset.rep : 'none';
        shut('agModalTask');
        commit();
        if (t.reminder) { startReminders(); askNotify(); }
    }
    function delTaskFromModal() {
        if (!editTask) return;
        cats[editTask.ci].tasks.splice(editTask.ti, 1);
        shut('agModalTask');
        commit();
    }


    /* ─── Daten ────────────────────────────────────────────────────── */
    function resetToday() {
        ask({ title: T.askResetT, message: T.askResetM, variant: 'danger', confirm: T.reset }).then(function (ok) {
            if (!ok) return;
            var st = states(), dow = new Date().getDay();
            onDay(cats, dow).forEach(function (c) {
                onDay(c.tasks, dow).forEach(function (t) {
                    delete st[t.id];
                    (t.subtasks || []).forEach(function (s) { s.done = false; });
                });
            });
            setStates(st);
            recordToday();
            save();
            render();
            toast(T.resetDone, T.dayReset);
        });
    }
    function wipe() {
        ask({ title: T.askWipeT, message: T.askWipeM, variant: 'danger', confirm: T.del }).then(function (ok) {
            if (!ok) return;
            cats = []; achiev = {}; history = {}; stats = { done: 0 };
            streak = { streak: 0, lastDate: null, best: 0 };
            setStates({});
            save();
            render();
            toast(T.resetDone, T.deletedAll);
        });
    }
    function exportAll() {
        var blob = new Blob([JSON.stringify({
            categories: cats, achievements: achiev, streakData: streak,
            states: states(), history: history, stats: stats,
            exportDate: new Date().toISOString()
        }, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url;
        a.download = 'myworklog-aufgaben-' + iso(new Date()) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        toast(T.exported, T.fileJson);
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
                ask({
                    title: T.askImportT,
                    message: fill(T.askImportM, { n: d.categories.length }),
                    confirm: T.importIt
                }).then(function (ok) {
                    if (!ok) return;
                    cats = d.categories;
                    achiev = d.achievements || {};
                    streak = d.streakData || { streak: 0, lastDate: null, best: 0 };
                    history = d.history || {};
                    stats = d.stats || { done: 0 };
                    if (d.states) setStates(d.states);
                    save();
                    render();
                    toast(T.imported, fill(T.catsLoaded, { n: cats.length }));
                });
            };
            r.readAsText(f);
        };
        inp.click();
    }


    /* ─── Erinnerungen ─────────────────────────────────────────────── */
    var remindTimer = null;
    function startReminders() {
        if (remindTimer) clearInterval(remindTimer);
        remindTimer = setInterval(checkReminders, 30000);
        checkReminders();
    }
    function checkReminders() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        var now = new Date();
        var hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        var st = states(), dow = now.getDay();
        onDay(cats, dow).forEach(function (c) {
            onDay(c.tasks, dow).forEach(function (t) {
                if (t.reminder === hm && !st[t.id]) {
                    new Notification('MyWorkLog', { body: T.stillOpen + t.name });
                }
            });
        });
    }
    function askNotify() {
        if (!('Notification' in window) || Notification.permission !== 'default') return;
        ask({ title: T.askNotifT, message: T.askNotifM, confirm: T.yesNotif, cancel: T.notNow })
            .then(function (ok) { if (ok) Notification.requestPermission(); });
    }


    /* ─── Verdrahtung ──────────────────────────────────────────────────
       Eine Delegation statt hunderter onclick-Zeichenketten im innerHTML.
       Nebenbei loest das die Zitat-Falle beim Einbauen von Namen und
       macht die Aufrufe fuer Werkzeuge sichtbar (CLAUDE.md, Graph).    */
    document.addEventListener('click', function (e) {
        var el = e.target.closest('[data-a]');
        if (!el) return;
        var a = el.dataset.a;
        var ci = el.dataset.c != null ? parseInt(el.dataset.c, 10) : null;
        var ti = el.dataset.t != null ? parseInt(el.dataset.t, 10) : null;

        if (a === 'day')      { selDow = parseInt(el.dataset.dow, 10); render(); }
        else if (a === 'filter')  setFilter(el.dataset.f);
        else if (a === 'check')   { if (!el.disabled) toggleCheck(el.dataset.id, ci); }
        else if (a === 'sub')     toggleSub(ci, ti, parseInt(el.dataset.s, 10));
        else if (a === 'subdel')  { cats[ci].tasks[ti].subtasks.splice(parseInt(el.dataset.s, 10), 1); save(); render(); }
        else if (a === 'edit')    openTask(ci, ti);
        else if (a === 'deltask') { cats[ci].tasks.splice(ti, 1); save(); render(); }
        else if (a === 'catcfg')  openCatCfg(ci);
        else if (a === 'fold')    { var id = el.dataset.cid; folded[id] = !folded[id]; renderCats(); }
        else if (a === 'newcat')  newCat();
        else if (a === 'savecat') saveCat();
        else if (a === 'savecatcfg') saveCatCfg();
        else if (a === 'delcat')  delCat();
        else if (a === 'savetask')saveTask();
        else if (a === 'deltaskm')delTaskFromModal();
        else if (a === 'pickicon'){
            pickedIcon = el.dataset.ico;
            document.querySelectorAll('.ag-ico-pick').forEach(function (b) { b.classList.toggle('is-on', b === el); });
        }
        else if (a === 'day-chip'){ el.classList.toggle('is-on'); }
        else if (a === 'rep')     { el.parentElement.querySelectorAll('.ag-chip').forEach(function (c) { c.classList.toggle('is-on', c === el); }); }
        else if (a === 'shut')    shut(el.dataset.m);
        else if (a === 'theme')   flipTheme();
        else if (a === 'resettoday') resetToday();
        else if (a === 'wipe')    wipe();
        else if (a === 'export')  exportAll();
        else if (a === 'import')  importAll();
    });

    document.addEventListener('keydown', function (e) {
        var el = e.target.closest('[data-a]');
        if (el && e.key === 'Enter') {
            var a = el.dataset.a;
            if (a === 'addtask') { e.preventDefault(); addTask(parseInt(el.dataset.c, 10), el); return; }
            if (a === 'addsub')  { e.preventDefault(); addSub(parseInt(el.dataset.c, 10), parseInt(el.dataset.t, 10), el); return; }
            if (a === 'rename')  { e.preventDefault(); el.blur(); return; }
            if (a === 'catname') { e.preventDefault(); saveCat(); return; }
        }
        if (e.key !== 'Escape') return;
        var openOne = document.querySelector('.ag-ov.is-open:not(.ag-ov--ask)');
        if (openOne) { e.preventDefault(); openOne.classList.remove('is-open'); }
    });

    document.addEventListener('change', function (e) {
        var el = e.target.closest('[data-a="rename"]');
        if (!el) return;
        var v = el.value.trim();
        if (v) { cats[parseInt(el.dataset.c, 10)].name = v; save(); }
        render();
    });

    document.addEventListener('input', function (e) {
        if (e.target.id !== 'agSearch') return;
        query = e.target.value.trim().toLowerCase();
        renderCats();
    });

    /* Klick auf den dunklen Grund schliesst den Dialog. */
    document.addEventListener('mousedown', function (e) {
        if (e.target.classList && e.target.classList.contains('ag-ov') && !e.target.classList.contains('ag-ov--ask')) {
            e.target.classList.remove('is-open');
        }
    });


    /* ─── Start ────────────────────────────────────────────────────── */
    initTheme();
    load();
    autoReset();

    document.querySelectorAll('.ag-chip[data-day]').forEach(function (c) { c.dataset.a = 'day-chip'; });
    document.querySelectorAll('#agTaskRepeat .ag-chip').forEach(function (c) { c.dataset.a = 'rep'; });
    $('agCatName').dataset.a = 'catname';

    $('agToday').textContent = new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

    bumpStreak();
    recordToday();
    save();
    render();
    startReminders();

    /* Ein anderer Tab hat die Daten geaendert: nachziehen statt driften. */
    window.addEventListener('storage', function (e) {
        if (e.key && e.key.indexOf('mwl_tasks_') === 0) { load(); render(); }
    });
})();
