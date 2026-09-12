// ═══ ALERTS-SCHALTER TEST ═══
//
// Warum es diesen Test gibt:
//
// 1. NEUN VON ZEHN AUTOMATISCHEN MELDUNGEN HATTEN KEINEN SCHALTER. Im
//    Alerts-Panel standen fuenf Haken; abgefragt wurde davon genau einer
//    (`exportReminder`). Nachmittags-Check, Feierabend, Freitags-Meldung,
//    Wochenplan und die beiden Meilenstein-Meldungen feuerten unabhaengig von
//    jeder Einstellung und waren nirgends abzustellen. Das faellt niemandem
//    beim Bauen auf, weil ein Haken, den keiner ausliest, sich genau so
//    verhaelt wie einer, der wirkt.
//
// 2. DIE BACKUP-ERINNERUNG WAR SCHLICHT FALSCH. `mwl_last_export` wurde von
//    drei Klick-Handlern geschrieben, nicht von `uploadToCloud()` selbst. Der
//    AutoSync ruft die Funktion, aber keinen der Handler — er hat also
//    erfolgreich hochgeladen, ohne dass es vermerkt wurde. Ergebnis: taeglich
//    "Dein letztes Backup ist aelter als 7 Tage", waehrend die Daten alle paar
//    Minuten in der Cloud landeten. Wer die Arbeit tut, protokolliert sie.
//
// Lauf: node tools/alerts-schalter.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + a + ' = ' + b + ')', a === b);

const ALERTS  = readFileSync('components/core/alerts-toasts.js', 'utf8');
const NAV     = readFileSync('components/core/mobile-nav-extras.js', 'utf8');
const CLOUD   = readFileSync('Assets/js/Cloud/supabase-integration.js', 'utf8');
const CLOUDUI = readFileSync('components/core/api-cloud-sync.js', 'utf8');
const SUPAUI  = readFileSync('Assets/js/Cloud/supabase-ui.js', 'utf8');
const MODALS  = readFileSync('components/modals/modals.html', 'utf8');

// Kommentare strippen, bevor ueber die Quelle geurteilt wird: die Dateikoepfe
// ERKLAEREN hier, was frueher falsch war, und wuerden sonst als Fund zaehlen.
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const NAV_C = strip(NAV);
const ALERTS_C = strip(ALERTS);

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nJede automatische Meldung haengt an einem Schalter');

{
    // Jede Zeile mit showSmartNotification(...) muss in einem `if` stehen, das
    // mwlAlertsOn(...) abfragt — entweder direkt oder im umgebenden Block.
    const zeilen = NAV_C.split(/\r?\n/);
    const treffer = [];
    zeilen.forEach((z, i) => {
        if (!/showSmartNotification\(/.test(z)) return;
        if (/function showSmartNotification/.test(z)) return;
        // Rueckwaerts bis zur naechsten oeffnenden Bedingung suchen
        let geschuetzt = false;
        for (let k = i; k >= 0 && k > i - 25; k--) {
            if (/mwlAlertsOn\(/.test(zeilen[k])) { geschuetzt = true; break; }
        }
        treffer.push([z.trim().slice(0, 46), geschuetzt]);
    });
    ok('Meldungen gefunden (' + treffer.length + ')', treffer.length >= 10);
    treffer.forEach(([z, g]) => ok('geschützt: ' + z, g));
}

{
    ok('showSmartNotification hat selbst den Hauptschalter',
       /function showSmartNotification[\s\S]{0,220}mwlAlertsOn\(\)/.test(NAV_C));
    const SAVE = strip(readFileSync('components/core/storage-save.js', 'utf8'));
    ok('save() ruft keine eigene Ueberstunden-Pruefung mehr', !/checkOvertimeAlert|Threshold:/.test(SAVE));
    ok('save() faengt den Nachlauf ab (Alerts, updateUI), damit ein Toast nie den Aufrufer stoppt',
       /try \{ checkAlertsThresholds\(\); \} catch/.test(SAVE) && /try \{ updateUI\(\); \} catch/.test(SAVE));
    ok('checkAlertsThresholds steigt bei ausgeschaltetem Hauptschalter sofort aus',
       /function checkAlertsThresholds\(\)\s*\{\s*if \(!mwlAlertsOn\(\)\) return;/.test(ALERTS_C));
    ok('auch die Cloud-Aufforderung liegt unter dem Hauptschalter',
       /function showCloudSyncPrompt[\s\S]{0,300}mwlAlertsOn\(\)/.test(strip(CLOUDUI)));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nSchalter und Bedienelemente decken sich in BEIDE Richtungen');

{
    const liste = (ALERTS_C.match(/\{\s*key:\s*'([a-zA-Z]+)',\s*id:\s*'([a-zA-Z]+)'\s*\}/g) || [])
        .map(m => m.match(/'([a-zA-Z]+)',\s*id:\s*'([a-zA-Z]+)'/).slice(1, 3));
    ok('ALERT_TOGGLES gelesen (' + liste.length + ')', liste.length >= 8);

    const dom = new JSDOM('<!doctype html><body>' + MODALS + '</body>');
    const imMarkup = [...dom.window.document.querySelectorAll('#alertsPanel input[type="checkbox"]')].map(e => e.id);

    liste.forEach(([key, id]) => {
        ok('Schalter ' + key + ' hat ein Bedienelement (#' + id + ')', imMarkup.includes(id));
    });
    // Gegenrichtung: ein Haken im Panel, den die Liste nicht kennt, wird beim
    // Speichern verschluckt und wirkt trotzdem bedienbar.
    const verwaist = imMarkup.filter(id => !liste.some(([, i]) => i === id));
    eq('kein Haken ohne Eintrag in ALERT_TOGGLES', verwaist.join(', ') || '(keiner)', '(keiner)');

    // Und jeder Schluessel muss auch wirklich abgefragt werden.
    const alleQuellen = NAV_C + ALERTS_C;
    liste.filter(([k]) => k !== 'master').forEach(([key]) => {
        ok('Schalter ' + key + ' wird irgendwo abgefragt',
           new RegExp("mwlAlertsOn\\('" + key + "'\\)|alertSettings\\." + key + "\\b").test(alleQuellen));
    });
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nHauptschalter wirkt (gemessen, nicht gegrept)');

{
    // Das Abzeichen und die Liste haengen im App-Rahmen, nicht in modals.html —
    // ohne sie wirft initializeAlerts() beim Aktualisieren des Zaehlers.
    const dom = new JSDOM('<!doctype html><body><span id="alertBadge"></span>' + MODALS + '</body>',
        { pretendToBeVisual: true });
    const doc = dom.window.document;
    const store = new Map();
    const localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k)
    };
    const build = new Function('document', 'window', 'localStorage', 'data', 'mwlLocale',
        'mwlIcon', 'mwlIconFromEmoji', 'parseTime', 'showCustomMessage', 'console',
        ALERTS + '\nreturn { mwlAlertsOn, saveAlertSettings, initializeAlerts, alertSettingsRef: () => alertSettings, syncAlertMasterUi };');
    const api = build(doc, dom.window, localStorage,
        { entries: [], saldo: 0, vacationUsed: 0, vacationMax: 30, settings: {} },
        () => 'de-DE', () => '<svg></svg>', () => '<svg></svg>', () => 0, () => {},
        { log() {}, warn() {}, error() {} });

    api.initializeAlerts();
    ok('Vorgabe: alles an', api.mwlAlertsOn() && api.mwlAlertsOn('dailyReminders'));

    doc.getElementById('alertMaster').checked = false;
    api.saveAlertSettings();
    ok('Hauptschalter aus → Torwächter schweigt', !api.mwlAlertsOn());
    ok('… auch für jede Kategorie', !api.mwlAlertsOn('dailyReminders') && !api.mwlAlertsOn('milestones'));
    ok('… die Kategorie-Haken werden gesperrt',
       [...doc.querySelectorAll('#alertCategoryGroup input')].every(i => i.disabled));
    ok('… und die Gruppe wird als inaktiv gekennzeichnet',
       doc.getElementById('alertCategoryGroup').classList.contains('is-muted'));
    ok('… der Zustand wird gespeichert',
       JSON.parse(store.get('timetracker_alert_settings_v2')).master === false);

    doc.getElementById('alertMaster').checked = true;
    doc.getElementById('alertDailyReminders').checked = false;
    api.saveAlertSettings();
    ok('einzelne Kategorie aus, Rest an',
       api.mwlAlertsOn() && !api.mwlAlertsOn('dailyReminders') && api.mwlAlertsOn('milestones'));
    ok('… Haken wieder bedienbar',
       [...doc.querySelectorAll('#alertCategoryGroup input')].every(i => !i.disabled));

    // Neu geladen muss dieselbe Einstellung wieder herauskommen.
    const api2 = build(doc, dom.window, localStorage,
        { entries: [], saldo: 0, vacationUsed: 0, vacationMax: 30, settings: {} },
        () => 'de-DE', () => '<svg></svg>', () => '<svg></svg>', () => 0, () => {},
        { log() {}, warn() {}, error() {} });
    api2.initializeAlerts();
    ok('Einstellung überlebt den Neustart',
       api2.mwlAlertsOn() && !api2.mwlAlertsOn('dailyReminders'));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nWochenstunden-Warnung: einmal je Woche, nicht bei jedem Speichern');

{
    // Bis v7.0.3 stand der Check in save() ohne Schluessel: "Diese Woche: 40.1h
    // (Threshold: 40h)" kam bei JEDEM Speichern — beim Anlegen einer Note, beim
    // Umbenennen eines Fachs, beim Wechsel eines Lehrjahrs. Hier wird gezaehlt.
    const dom = new JSDOM('<!doctype html><body><span id="alertBadge"></span>' + MODALS + '</body>',
        { pretendToBeVisual: true });
    const doc = dom.window.document;
    const store = new Map();
    const localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k)
    };
    // Woche mit 40,1 h: Mo–Fr dieser Woche, lokal formatiert (kein toISOString).
    const now = new Date(); const dow = (now.getDay() + 6) % 7;
    const mon = new Date(now); mon.setDate(now.getDate() - dow);
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const entries = [];
    for (let i = 0; i < 5; i++) { const d = new Date(mon); d.setDate(mon.getDate() + i); entries.push({ date: iso(d), type: 'work', worked: i === 4 ? 8.1 : 8 }); }
    // Eine Woche davor mit 45 h darf NICHT zaehlen — nur die laufende Woche.
    for (let i = 7; i < 12; i++) { const d = new Date(mon); d.setDate(mon.getDate() - i); entries.push({ date: iso(d), type: 'work', worked: 9 }); }

    // Gezaehlt wird ueber die Alert-Historie und die persistierte Dedup-Tabelle,
    // nicht ueber den DOM. showToast() braucht requestAnimationFrame fuer den
    // Fortschrittsbalken — in Node gibt es das Global nicht, hier eine Attrappe.
    const build = new Function('document', 'window', 'localStorage', 'data', 'mwlLocale',
        'mwlIcon', 'mwlIconFromEmoji', 'parseTime', 'showCustomMessage', 'console', 'requestAnimationFrame',
        ALERTS + '\nreturn { checkAlertsThresholds, initializeAlerts, alertsRef: () => alertsHistory };');
    const stub = [() => 'de-DE', () => '<svg></svg>', () => '<svg></svg>', () => 0, () => {},
        { log() {}, warn() {}, error() {} }, () => 0];
    const data = { entries, saldo: 0, vacationUsed: 0, vacationMax: 30, settings: {} };
    const api = build(doc, dom.window, localStorage, data, ...stub);
    api.initializeAlerts();

    const anzahl = () => api.alertsRef().filter(a => /Woche über 40 h/.test(a.title)).length;
    api.checkAlertsThresholds();
    eq('erster Lauf: genau eine Meldung', anzahl(), 1);
    api.checkAlertsThresholds(); api.checkAlertsThresholds(); api.checkAlertsThresholds();
    eq('drei weitere Laeufe (= drei Speichervorgaenge): keine weitere', anzahl(), 1);
    const gemerkt = JSON.parse(store.get('timetracker_alert_check') || '{}');
    ok('Dedup-Schluessel ist der Montag der Woche', gemerkt['weeklyOvertime_' + iso(mon)] === true);
    ok('Text nennt die Stunden mit Komma', /40,1 h/.test(api.alertsRef().find(a => /Woche über 40 h/.test(a.title)).message));

    // Neustart in derselben Woche: der Schluessel ueberlebt, die Meldung kommt nicht nochmal.
    const api2 = build(doc, dom.window, localStorage, data, ...stub);
    api2.initializeAlerts();
    const vorher = api2.alertsRef().length;
    api2.checkAlertsThresholds();
    eq('nach Neustart in derselben Woche: keine neue Meldung', api2.alertsRef().length, vorher);
    eq('… die Wochen-Meldung steht genau einmal in der Historie', api2.alertsRef().filter(a => /Woche über 40 h/.test(a.title)).length, 1);

    // Gegenprobe: unter 40 h gibt es gar nichts zu melden.
    const store2 = new Map();
    const ls2 = { getItem: k => (store2.has(k) ? store2.get(k) : null), setItem: (k, v) => store2.set(k, String(v)), removeItem: k => store2.delete(k) };
    const api3 = build(doc, dom.window, ls2, { entries: entries.map(e => Object.assign({}, e, { worked: 7 })), saldo: 0, vacationUsed: 0, vacationMax: 30, settings: {} }, ...stub);
    api3.initializeAlerts(); api3.checkAlertsThresholds();
    eq('35 h: keine Meldung', api3.alertsRef().filter(a => /Woche über 40 h/.test(a.title)).length, 0);
    ok('… und die Pruefung hat ueberhaupt Eintraege gesehen', entries.length === 10);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nSicherung wird dort vermerkt, wo sie passiert');

{
    ok('uploadToCloud() schreibt den Zeitstempel selbst',
       /async uploadToCloud\(\)[\s\S]*?mwl_last_export/.test(strip(CLOUD)));
    ok('… und haelt fest, wohin gesichert wurde',
       /mwl_last_backup_kind[\s\S]{0,40}'cloud'/.test(strip(CLOUD)));

    // Kein Klick-Handler darf den Zeitstempel mehr selbst setzen: sonst gibt es
    // wieder Pfade, die sichern ohne zu protokollieren.
    const schreiber = (src) => (strip(src).match(/setItem\(\s*'mwl_last_export'/g) || []).length;
    eq('api-cloud-sync.js schreibt ihn nicht mehr', schreiber(CLOUDUI), 0);
    eq('supabase-ui.js schreibt ihn nicht mehr', schreiber(SUPAUI), 0);
    eq('genau ein Schreiber in der Cloud-Kette', schreiber(CLOUD), 1);

    // Datei-Exporte bleiben eigene, legitime Schreiber.
    const exp = readFileSync('components/core/export-advanced.js', 'utf8');
    ok('Datei-Export vermerkt weiterhin eine Sicherung', schreiber(exp) >= 1);
}

{
    // Die Meldung darf nicht mehr behaupten, man muesse EXPORTIEREN, wenn die
    // Sicherung genauso gut in der Cloud liegen kann.
    ok('Meldungstext nennt nicht mehr nur den Datei-Export',
       !/Bitte exportiere deine Daten/.test(NAV_C));
    ok('… und benennt beide Wege', /weder in der Cloud noch als Datei/.test(NAV_C));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\nAltlasten');

{
    ok('Schicht-Warnung vergleicht ein ISO-Datum, kein "28.8.2026"',
       /const todayIso[\s\S]{0,300}e\.date === todayIso/.test(ALERTS_C));
    ok('Akzentfarbe der Haken ist kein fester Hexwert mehr',
       !/accent-color:\s*#818cf8/.test(readFileSync('components/core/alerts.css', 'utf8')));
    ok('Alert-Symbol wird als SVG uebergeben, nicht als Name',
       !/createAlert\([^)]*'warning',\s*'save'\)/.test(NAV_C));
}

// ===========================================================================
console.log('\nEin echter Upload vermerkt die Sicherung selbst');

{
    // Der starke Beweis: die ECHTE Klasse mit Attrappen laufen lassen. Ein
    // grep haette nur gezeigt, dass die Zeile irgendwo in der Datei steht -
    // nicht, dass sie beim erfolgreichen Upload auch erreicht wird.
    const store = new Map();
    store.set('tg_pro_data', '{"entries":[]}');
    const ls = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k),
        get length() { return store.size; },
        key: i => [...store.keys()][i]
    };
    const build = new Function('localStorage', 'window', 'console',
        CLOUD + '\nreturn SupabaseCloudSync;');
    const Cls = build(ls, {}, { log() {}, warn() {}, error() {} });

    const o = Object.create(Cls.prototype);
    o.user = { id: 'u1' };
    o.client = { from: () => ({ upsert: () => ({ select: async () => ({ data: [{}], error: null }) }) }) };
    const r = await o.uploadToCloud();

    ok('Upload meldet Erfolg', r && r.success === true);
    ok('… und vermerkt die Sicherung ohne Zutun eines Knopfes', !!store.get('mwl_last_export'));
    eq('… mit der richtigen Art', store.get('mwl_last_backup_kind'), 'cloud');

    // Gegenprobe: ein fehlgeschlagener Upload darf NICHTS vermerken, sonst
    // schweigt die Erinnerung genau dann, wenn sie noetig waere.
    store.delete('mwl_last_export');
    const f = Object.create(Cls.prototype);
    f.user = { id: 'u1' };
    f.client = { from: () => ({ upsert: () => ({ select: async () => ({ data: null, error: { message: 'kaputt', code: '500' } }) }) }) };
    let warf = false;
    try { await f.uploadToCloud(); } catch (e) { warf = true; }
    ok('fehlgeschlagener Upload wirft', warf);
    ok('… und vermerkt KEINE Sicherung', !store.get('mwl_last_export'));
}

// ===========================================================================
console.log('\nProtokoll — Aufbau, Gruppierung, Maskierung');

{
    const CSS = readFileSync('components/core/alerts.css', 'utf8');
    const cssNoComments = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const panel = MODALS.slice(MODALS.indexOf('id="alertsPanel"'), MODALS.indexOf('id="alertsOverlay"'));

    // Das Panel war 30 Inline-Styles lang und damit weder theme- noch
    // wartbar. Styling gehoert ins Stylesheet.
    const inline = (panel.match(/ style="/g) || []).length;
    eq('keine Inline-Styles mehr im Panel', inline, 0);
    ok('kein Emoji im Panel', !/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(panel));

    // Eine Zeile entsteht an EINER Stelle. Vorher stand dasselbe Markup in
    // renderAlertsList UND filterAlerts und war bereits auseinandergelaufen.
    eq('Zeilen-Markup existiert genau einmal',
       (ALERTS_C.match(/class="ap-entry"/g) || []).length, 1);
    ok('filterAlerts ist entfernt', !/function filterAlerts/.test(ALERTS_C));
    ok('… und wird nirgends mehr aufgerufen', !/filterAlerts\(/.test(strip(MODALS)) && !/filterAlerts\(/.test(ALERTS_C));

    ok('kein backdrop-filter auf dem Panel', !/backdrop-filter/.test(cssNoComments));
    ok('keine feste Akzentfarbe mehr', !/#818cf8/.test(cssNoComments));
    ok('helles Theme wird bedient', /\[data-theme="light"\][^{]*\.alerts-panel/.test(cssNoComments));
    ok('Toasts haengen an Tokens statt an Zinc-Werten',
       !/#18181b|#a1a1aa|#52525b/.test(cssNoComments));
    ok('Beruehrung bekommt das Kreuz dauerhaft (kein :hover-only)',
       /@media \(hover: none\)[\s\S]{0,90}ap-entry__x/.test(cssNoComments));
    ok('Bewegung wird auf Wunsch abgeschaltet', /prefers-reduced-motion/.test(cssNoComments));
    ok('kein `transition: all`', !/transition:\s*all/.test(cssNoComments));
}

{
    const dom = new JSDOM('<!doctype html><body><span id="alertBadge"></span>' + MODALS + '</body>',
        { pretendToBeVisual: true });
    const doc = dom.window.document;
    const store = new Map();
    const ls = { getItem: k => (store.has(k) ? store.get(k) : null),
                 setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

    // 🔴 Zeitanker auf die Tagesmitte, nicht auf Date.now(). Mit "jetzt"
    // fallen "vor 1 Stunde" und "vor 2 Stunden" zwischen 00:00 und 03:00 auf
    // GESTERN — der Test sah dann 2 Gruppen statt 3 und keine namens "Heute".
    // Gemessen am 2026-08-30 um 00:49: genau dieser Fehlschlag, ohne dass am
    // Code etwas dran war. (CLAUDE.md: `new Date()` in einem Test gehoert
    // gestellt, sonst wird jede Fristenrechnung irgendwann von allein rot.)
    const tag = 86400000;
    const anker = new Date(); anker.setHours(12, 0, 0, 0);
    const jetzt = anker.getTime();
    const mk = (t, m, ty, ts, gelesen) => ({ id: ts, title: t, message: m, type: ty, icon: '',
        date: '', time: '', timestamp: ts, isRead: gelesen });
    store.set('timetracker_alerts_v2', JSON.stringify([
        mk('Heute A', 'x', 'warning', jetzt - 3600000, false),
        mk('Heute B', 'x', 'danger',  jetzt - 7200000, false),
        mk('Gestern', 'x', 'success', jetzt - tag,     true),
        mk('<img src=x onerror=alert(1)>', '<b>fett</b>', 'info', jetzt - tag * 3, true)
    ]));

    const build = new Function('document', 'window', 'localStorage', 'data', 'mwlLocale',
        'mwlIcon', 'mwlIconFromEmoji', 'parseTime', 'showCustomMessage', 'showCustomConfirm', 'console',
        ALERTS + '\nreturn { initializeAlerts, renderAlertsList, dismissAlert, toggleAlertsPanel, alertsRef: () => alertsHistory };');
    const api = build(doc, dom.window, ls,
        { entries: [], saldo: 0, vacationUsed: 0, vacationMax: 30, settings: {} },
        () => 'de-DE', () => '<svg></svg>', () => '<svg></svg>', () => 0, () => {}, () => {},
        { log() {}, warn() {}, error() {} });
    api.initializeAlerts();

    const gruppen = [...doc.querySelectorAll('.ap-daygroup')];
    ok('nach Tagen gruppiert (' + gruppen.length + ' Gruppen)', gruppen.length === 3);
    // 🔴 Je Gruppe ein eigener Kasten: `position: sticky` haelt ein Element in
    // seinem ELTERNkasten. Laegen alle Zeilen in einer Liste, stapelten sich
    // die Tagesueberschriften beim Scrollen uebereinander.
    ok('jede Gruppe traegt genau eine Ueberschrift',
       gruppen.every(g => g.querySelectorAll('.ap-day').length === 1));
    ok('erste Gruppe heisst "Heute"', doc.querySelector('.ap-day').textContent === 'Heute');
    eq('alle Zeilen gerendert', doc.querySelectorAll('.ap-entry').length, 4);
    ok('neueste zuerst', doc.querySelector('.ap-entry .ap-entry__title').textContent === 'Heute A');

    ok('ungelesene Zeilen sind als solche gekennzeichnet',
       doc.querySelectorAll('.ap-entry[data-unread="1"]').length === 2);
    ok('jede Zeile traegt ihren Schweregrad',
       [...doc.querySelectorAll('.ap-entry')].every(e => ['info','warning','danger','success'].indexOf(e.dataset.type) > -1));

    // Fremder Text landet per innerHTML in der Seite und muss maskiert sein.
    ok('Titel wird maskiert', !doc.querySelector('.ap-log img'));
    ok('… und die Nachricht ebenfalls', !doc.querySelector('.ap-log b'));

    // Die Id kommt als ZEICHENKETTE aus dem Attribut, gespeichert ist sie als
    // Zahl — ein strikter Vergleich haette nie getroffen.
    const id = doc.querySelector('.ap-entry__x').getAttribute('data-dismiss');
    api.dismissAlert(id);
    eq('Entfernen wirkt trotz Zeichenketten-Id', doc.querySelectorAll('.ap-entry').length, 3);

    // Leerzustand ohne Emoji, mit Erklaerung der sieben Tage.
    api.alertsRef().length = 0;
    api.renderAlertsList();
    ok('Leerzustand vorhanden', !!doc.querySelector('.ap-empty'));
    ok('… ohne Emoji', !/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(doc.querySelector('.ap-empty').textContent));
    ok('… und nennt die Aufbewahrungsfrist', /sieben Tage/.test(doc.querySelector('.ap-empty').textContent));
}

{
    // 🔴 Erst zeichnen, dann als gelesen markieren. Andersherum sind beim
    // Zeichnen schon alle gelesen und die Hervorhebung des Neuen war nie zu
    // sehen — der gefuellte Punkt haette keinen Moment lang existiert.
    const i = ALERTS_C.indexOf('function toggleAlertsPanel');
    const block = ALERTS_C.slice(i, i + 1200);
    ok('renderAlertsList() steht vor markAllAlertsAsRead()',
       block.indexOf('renderAlertsList()') > -1
       && block.indexOf('renderAlertsList()') < block.indexOf('markAllAlertsAsRead()'));
    ok('Systemdialog confirm() ist ersetzt', !/[^a-zA-Z.]confirm\(/.test(ALERTS_C));
    // Der Fortschrittsbalken DARF rAF benutzen (dauernde Bewegung, und im
    // Hintergrundtab sieht den Toast ohnehin niemand). Das EINBLENDEN darf
    // es nicht: bei `document.hidden` bliebe der Toast unsichtbar
    // ausserhalb des Bildes stehen.
    ok('Einblenden erzwingt ein Layout statt auf rAF zu warten',
       /void toast\.offsetWidth;\s*toast\.classList\.add\('is-in'\)/.test(ALERTS_C));
    ok('… und steht in keinem rAF-Rumpf',
       !/requestAnimationFrame\([\s\S]{0,120}is-in/.test(ALERTS_C));
}

console.log('\n' + pass + ' ok, ' + fail + ' fehlend\n');
process.exit(fail ? 1 : 0);
