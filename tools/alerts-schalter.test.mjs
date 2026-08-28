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

console.log('\n' + pass + ' ok, ' + fail + ' fehlend\n');
process.exit(fail ? 1 : 0);
