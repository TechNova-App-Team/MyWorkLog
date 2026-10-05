// ═══ ANALYTICS MODULE ═══
// Standalone-Seite /analytics/ (DE) und /en/analytics/ (EN). Kein utils.js,
// keine Module — alles, was die Seite braucht, steht hier.
// Datenquelle ist EIN Abruf am eigenen Worker (PostHog + Cloudflare), dazu der
// leichte ?feed-Endpunkt fuer "Gerade eben".
// Texte aus JS laufen ueber T(de, en) statt ueber i18n-runtime: die Runtime
// kennt nur feste Saetze, hier stehen fast ueberall Zahlen drin.

var EN = document.documentElement.lang === 'en';
function T(de, en) { return EN ? en : de; }
var mwlLocale = window.mwlLocale || function () { return EN ? 'en-GB' : 'de-DE'; };

const CF_PROXY = 'https://analytics-proxy.myworklog.workers.dev';
let currentRange = 7;

var view = {
    data: null,
    metric: 'visitors',
    tabs: { pages: 'top', sources: 'referrers', geo: 'countries', tech: 'devices', events: 'actions' },
    expanded: {}
};

// ─── Formatierung ────────────────────────────────────────────
// Pflicht — Laender-, Stadt-, Pfad- und Event-Namen kommen von aussen und landen in innerHTML.
function esc(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmtInt(n) { return (Number(n) || 0).toLocaleString(mwlLocale()); }

// Ab 10.000 kompakt ("12,4 Tsd."), darunter die volle Zahl — eine Kachel mit
// "1.5K" fuer 1.542 verschenkt Genauigkeit, die hier niemand kuerzen muss.
function fmtNum(n) {
    n = Number(n) || 0;
    if (Math.abs(n) < 10000) return fmtInt(n);
    try {
        return new Intl.NumberFormat(mwlLocale(), { notation: 'compact', maximumFractionDigits: 1 }).format(n);
    } catch (e) { return fmtInt(n); }
}

function fmtDec(n, digits) {
    return (Number(n) || 0).toLocaleString(mwlLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(ratio, digits) {
    ratio = Number(ratio) || 0;
    digits = digits == null ? 0 : digits;
    // Ein Besucher von 350 ist nicht "0 %".
    if (ratio > 0 && ratio * 100 < Math.pow(10, -digits) / 2) return '< ' + fmtDec(Math.pow(10, -digits), digits) + ' %';
    return fmtDec(ratio * 100, digits) + ' %';
}

function fmtDuration(seconds) {
    var s = Math.max(0, Math.round(Number(seconds) || 0));
    if (s < 60) return s + ' s';
    var m = Math.floor(s / 60), r = s % 60;
    if (m < 60) return m + ' min ' + r + ' s';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}

function fmtBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return fmtDec(bytes / Math.pow(1024, i), i === 0 ? 0 : 1) + ' ' + units[i];
}

// 'YYYY-MM-DD' als LOKALES Datum lesen. new Date('2026-09-01') waere UTC-Mitternacht
// und rutscht westlich von Greenwich auf den Vortag.
function parseDay(ts) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ts || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(ts);
}

// Laenderkuerzel als Kaestchen statt Flaggen-Emoji: Windows hat keine
// Flaggen-Glyphen und zeigt dort nur zwei nackte Buchstaben.
function ccBadge(code) {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
    return '<span class="cc">' + esc(code.toUpperCase()) + '</span>';
}

function countryName(code, fallback) {
    try { return new Intl.DisplayNames([EN ? 'en' : 'de'], { type: 'region' }).of(code) || fallback || code; }
    catch (e) { return fallback || code; }
}

function langName(code) {
    try {
        var base = String(code).split('-')[0];
        return new Intl.DisplayNames([EN ? 'en' : 'de'], { type: 'language' }).of(base) + ' (' + code + ')';
    } catch (e) { return code; }
}

var ICONS = {
    up: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>',
    down: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
    desktop: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
    mobile: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    tablet: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    good: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>',
    mid: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v6"/><path d="M12 17h.01"/></svg>',
    bad: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
};

// ─── Bots ────────────────────────────────────────────────────
// Browser- und Systemnamen, die nach Crawler, Scanner oder Skript aussehen.
// Wirkt nur auf die Technik-Listen; die Summen oben rechnet PostHog.
var BOT_PATTERNS = [
    /googlebot|google-/i, /bingbot|bingpreview/i, /slurp|yahoobot/i,
    /duckduck|qwant|baidu|yandexbot|sogou|exabot/i, /teoma|msnbot|ccbot|naverbot|yona/i,
    /facebookexternal|fbbot|twitterbot|pinterest|linkedin|whatsapp|telegram/i,
    /slack|discord|viber|skype|wechat|kakao/i, /reddit|redditbot|snapchat/i,
    /nessus|openvas|nmap|masscan|zmap|sqlmap|havij|commix|xsstrike|nikto|dirbuster|burp|acunetix/i,
    /netsparker|mandiant|coreimpact|metasploit/i,
    /monitoring-bot|uptime|healthcheck|pingdom|statuspage|uptimerobot|monitis|nagios|zabbix|datadog|dynatrace|newrelic/i,
    /scrapy|selenium|puppeteer|watir|phantomjs|headless/i, /webdriver|apify|diffbot|scraperapi|scrapinghub/i,
    /ahrefs|semrush|majestic|mj12bot/i, /feedburner|superfeedr|feedpress|ifeedbot/i,
    /curl|wget|python|java\b|node-fetch|http-client|postman|insomnia|httpie/i,
    /archive\.org|ia_archiver|wayback/i, /spider|crawler|scraper|robot|\bbot\b/i
];
function isKnownBot(name) {
    if (!name) return false;
    return BOT_PATTERNS.some(function (p) { return p.test(name); });
}

// ─── Pfade ───────────────────────────────────────────────────
// Adressen mit Anmelde-Fragmenten (#access_token=…) nie anzeigen — sie kommen
// aus dem OAuth-Ruecksprung und gehoeren nicht auf eine oeffentliche Seite.
function isIrrelevantPage(path) {
    if (!path) return true;
    if (/#(access_token|token|code|state|session|error|id_token)[\s=]/i.test(path)) return true;
    var h = path.indexOf('#');
    return h !== -1 && path.substring(h).length > 40;
}

function normalizePath(path) {
    if (!path) return '/';
    var h = path.indexOf('#'); if (h !== -1) path = path.substring(0, h);
    var q = path.indexOf('?'); if (q !== -1) path = path.substring(0, q);
    path = path.replace(/\/index\.html$/i, '/');
    // Legacy-Basepath aus der GitHub-Pages-Zeit einsammeln
    path = path.replace(/^\/MyWorkLog(\/|$)/i, '/');
    if (path === '') path = '/';
    if (path[0] !== '/') path = '/' + path;
    return path;
}

// Gleiche Pfade nach dem Normalisieren zusammenlegen ("/index.html" und "/").
function mergePaths(rows, key) {
    var merged = {};
    (rows || []).forEach(function (r) {
        if (isIrrelevantPage(r.path)) return;
        var p = normalizePath(r.path);
        merged[p] = (merged[p] || 0) + (Number(r[key]) || 0);
    });
    return Object.keys(merged).map(function (p) { return { label: p, value: merged[p], href: p, path: true }; })
        .sort(function (a, b) { return b.value - a.value; });
}

// ─── Beschriftungen ──────────────────────────────────────────
var CHANNEL_LABELS = {
    'Direct': ['Direkt', 'Direct'],
    'Organic Search': ['Suchmaschinen', 'Search engines'],
    'Paid Search': ['Bezahlte Suche', 'Paid search'],
    'Referral': ['Verweise', 'Referrals'],
    'AI': ['KI-Assistenten', 'AI assistants'],
    'Organic Social': ['Soziale Netzwerke', 'Social networks'],
    'Paid Social': ['Bezahlte Social Ads', 'Paid social'],
    'Email': ['E-Mail', 'Email'],
    'Organic Video': ['Video', 'Video'],
    'Unknown': ['Unbekannt', 'Unknown']
};
function channelLabel(c) { var l = CHANNEL_LABELS[c]; return l ? T(l[0], l[1]) : c; }

function sourceLabel(s) {
    if (!s || s === '$direct') return T('Direkt oder Lesezeichen', 'Direct or bookmark');
    if (s === 'com.google.android.googlequicksearchbox') return T('Google-App (Android)', 'Google app (Android)');
    return s.replace(/^www\./, '');
}

var DEVICE_LABELS = { 'Mobile': ['Smartphone', 'Phone'], 'Desktop': ['Computer', 'Computer'], 'Tablet': ['Tablet', 'Tablet'] };

var EVENT_LABELS = {
    'entry_created':    ['Eintrag erstellt', 'Entry created'],
    'entry_updated':    ['Eintrag bearbeitet', 'Entry edited'],
    'eintrag_geloescht': ['Eintrag gelöscht', 'Entry deleted'],
    'eintrag_wiederhergestellt': ['Löschen rückgängig gemacht', 'Delete undone'],
    'timer_action':     ['Timer', 'Timer'],
    'data_exported':    ['Daten exportiert', 'Data exported'],
    'pwa_installiert':  ['App installiert', 'App installed'],
    'installbanner':    ['Installations-Hinweis', 'Install prompt'],
    'data_imported':    ['Daten importiert', 'Data imported'],
    'woche_gewechselt': ['Woche gewechselt', 'Week switched'],
    'monat_gewechselt': ['Monat gewechselt', 'Month switched'],
    'jahr_gewechselt':  ['Jahr gewechselt', 'Year switched'],
    'jahresraster_modus': ['Jahresraster umgeschaltet', 'Year grid mode switched'],
    'performance_zeitraum': ['Performance: Zeitraum gewechselt', 'Performance: period switched'],
    'ihk_daten_gespeichert': ['IHK-Daten gespeichert', 'IHK data saved'],
    'ziel_angelegt':    ['Ziel angelegt', 'Goal created'],
    'umfrage_geoeffnet': ['Umfrage geöffnet', 'Survey opened'],
    'umfrage_gesendet': ['Umfrage abgeschickt', 'Survey submitted'],
    'umfrage_abgelehnt': ['Umfrage abgelehnt', 'Survey declined'],
    'feedback_gesendet': ['Feedback gesendet', 'Feedback sent'],
    'foto_import_opened': ['Foto-Import geöffnet', 'Photo import opened'],
    'foto_import_applied': ['Foto-Import übernommen', 'Photo import applied'],
    'import_wizard_opened': ['Import geöffnet', 'Import opened'],
    'schnellsuche_geoeffnet': ['Schnellsuche geöffnet', 'Command palette opened'],
    'einstellungen_gespeichert': ['Einstellungen gespeichert', 'Settings saved'],
    'theme_gewechselt': ['Erscheinungsbild', 'Appearance'],
    'stimmung':         ['Stimmung', 'Mood'],
    'jobs':             ['Mehrere Jobs', 'Multiple jobs'],
    'widget':           ['Dashboard-Widget', 'Dashboard widget'],
    'berufsschule':     ['Berufsschule', 'Vocational school'],
    'backup':           ['Backup', 'Backup'],
    'konto':            ['Konto', 'Account'],
    'cloud_sync':       ['Cloud-Sync', 'Cloud sync'],
    'p2p_sync':         ['Geräte-Sync', 'Device sync'],
    'berichtsheft':     ['Berichtsheft', 'Report book'],
    'berichtsheft_ki':  ['Berichtsheft-KI', 'Report book AI'],
    'fahrtkosten':      ['Fahrtkosten', 'Travel costs'],
    'vertrags_manager': ['Vertrags-Manager', 'Contract manager'],
    'rechte_checker':   ['Rechte-Checker', 'Rights checker'],
    'deep_dive':        ['Deep Dive', 'Deep dive'],
    'b2b_freischaltung_angefragt': ['Betrieb: Freischaltung angefragt', 'Company: verification requested'],
    'b2b_firma_angefragt': ['Betrieb: Firma angefragt', 'Company: requested'],
    'b2b_betrieb_bestaetigt': ['Betrieb bestätigt', 'Company verified'],
    'b2b_firma_entschieden': ['Betrieb: Anfrage entschieden', 'Company: request decided'],
    'ausbilder_einladung': ['Ausbilder-Einladung', 'Trainer invitation'],
    'skill_uebung_gestartet': ['Skill-Baum: Übung gestartet', 'Skill tree: exercise started'],
    'skill_uebung_beendet': ['Skill-Baum: Übung beendet', 'Skill tree: exercise finished'],
    'skill_berichtsheft_ausgewertet': ['Skill-Baum: Berichtsheft ausgewertet', 'Skill tree: report book analysed'],
    'geburtstag_kerze': ['Geburtstag: Kerze ausgepustet', 'Birthday: candle blown out'],
    'geburtstag_wunsch': ['Geburtstag: Wunsch geschickt', 'Birthday: wish sent'],
    'traum_antwort':    ['Reisetraum: Frage beantwortet', 'Travel dream: question answered'],
    'traum_teilen':     ['Reisetraum: Seite geteilt', 'Travel dream: page shared'],
    'ghost_mode_on':    ['Ghost Mode (seit v7.5.4 entfernt)', 'Ghost mode (removed in v7.5.4)'],
    // Probleme — alles mit 'problem_' landet im eigenen Reiter.
    'problem_js_fehler':      ['Skriptfehler', 'Script error'],
    'problem_ansicht_laden':  ['Ansicht lädt nicht', 'View failed to load'],
    'problem_speicher_voll':  ['Speicher voll, nicht gespeichert', 'Storage full, not saved'],
    'problem_anmeldung':      ['Anmeldung gescheitert', 'Sign-in failed'],
    'problem_cloud_sync':     ['Cloud-Sync gescheitert', 'Cloud sync failed'],
    'problem_backup':         ['Backup gescheitert', 'Backup failed'],
    'problem_p2p':            ['Geräte-Sync ohne Verbindung', 'Device sync could not connect'],
    'problem_ki':             ['KI nicht verfügbar', 'AI unavailable'],
    'problem_route':          ['Route nicht berechnet', 'Route not calculated'],
    'problem_suche_ohne_treffer': ['Suche ohne Treffer', 'Search without results']
};
// Unterart (Property 'aktion'/'grund', vom Worker als '<event>::<unterart>' angehaengt).
// Erst '<event>::<unterart>', dann die Unterart allein; sonst wird der Schluessel lesbar gemacht.
var SUB_LABELS = {
    'timer_action::start': ['gestartet', 'started'], 'timer_action::pause': ['pausiert', 'paused'],
    'timer_action::stop': ['gestoppt', 'stopped'], 'timer_action::resume': ['fortgesetzt', 'resumed'],
    'theme_gewechselt::light': ['hell', 'light'], 'theme_gewechselt::dark': ['dunkel', 'dark'],
    'theme_gewechselt::system': ['automatisch', 'automatic'],
    'ausbilder_einladung::erzeugt': ['Code erzeugt', 'code created'],
    'ausbilder_einladung::eingeloest': ['Code eingelöst', 'code redeemed'],
    'aufgaben::neu': ['Aufgabe angelegt', 'task created'], 'aufgaben::erledigt': ['Aufgabe erledigt', 'task completed'],
    'aufgaben::notiz': ['Notiz angelegt', 'note created'], 'aufgaben::zur_notiz': ['zur Notiz gemacht', 'turned into note'],
    'aufgaben::zur_aufgabe': ['zur Aufgabe gemacht', 'turned into task'],
    'gesetzt': ['gesetzt', 'set'], 'uebersprungen': ['übersprungen', 'skipped'],
    'angelegt': ['angelegt', 'created'], 'entfernt': ['entfernt', 'removed'], 'hinzugefuegt': ['hinzugefügt', 'added'],
    'angezeigt': ['angezeigt', 'shown'], 'installieren_geklickt': ['„Installieren" geklickt', '"Install" clicked'],
    'dialog_angenommen': ['Dialog angenommen', 'dialog accepted'], 'dialog_abgelehnt': ['Dialog abgelehnt', 'dialog declined'],
    'spaeter': ['„Später"', '"Later"'], 'nie_wieder': ['„Nicht mehr anzeigen"', '"Don’t show again"'],
    'fach_angelegt': ['Fach angelegt', 'subject created'], 'noten_gespeichert': ['Noten gespeichert', 'grades saved'],
    'verschluesselt_exportiert': ['verschlüsselt exportiert', 'encrypted export'],
    'verschluesselt_importiert': ['verschlüsselt eingespielt', 'encrypted restore'],
    'lokal_wiederhergestellt': ['lokale Sicherung zurückgeholt', 'local snapshot restored'],
    'lokal_zusammengefuehrt': ['lokale Sicherung zusammengeführt', 'local snapshot merged'],
    'datei_importiert': ['Datei eingespielt', 'file restored'],
    'magic_link_angefordert': ['Anmeldelink angefordert', 'sign-in link requested'],
    'link_anmeldung': ['per Link angemeldet', 'signed in via link'], 'oauth_anmeldung': ['per Google/GitHub angemeldet', 'signed in via OAuth'],
    'passkey_anmeldung': ['per Passkey angemeldet', 'signed in with passkey'], 'passkey_angelegt': ['Passkey angelegt', 'passkey created'],
    'abgemeldet': ['abgemeldet', 'signed out'],
    'heruntergeladen': ['Daten geholt', 'data downloaded'], 'cloud_geloescht': ['Cloud-Daten gelöscht', 'cloud data deleted'],
    'verbunden': ['verbunden', 'connected'], 'synchronisiert': ['synchronisiert', 'synced'],
    'bericht_erstellt': ['Bericht erstellt', 'report created'], 'bericht_bearbeitet': ['Bericht bearbeitet', 'report edited'],
    'pdf_einzeln': ['PDF einer Woche', 'PDF of one week'], 'pdf_sammel': ['Sammel-PDF', 'combined PDF'],
    'cloud_generiert': ['mit Cloud-KI geschrieben', 'written with cloud AI'], 'lokal_generiert': ['lokal geschrieben', 'written locally'],
    'route_berechnet': ['Route berechnet', 'route calculated'], 'monat_gespeichert': ['Monat gespeichert', 'month saved'],
    'steuerklasse_gewechselt': ['Steuerklasse gewechselt', 'tax class changed'],
    'gehaltszettel_gedruckt': ['Gehaltszettel gedruckt', 'payslip printed'], 'vertrag_angelegt': ['Vertrag angelegt', 'contract created'],
    'zusatzleistung_gespeichert': ['Zusatzleistung gespeichert', 'benefit saved'],
    'gesucht': ['gesucht', 'searched'], 'fall_geoeffnet': ['Fall geöffnet', 'case opened'], 'mustermail_kopiert': ['Mustermail kopiert', 'template email copied'],
    'zur_haelfte': ['bis zur Hälfte gelesen', 'read halfway'], 'zu_ende': ['zu Ende gelesen', 'read to the end'],
    // Gruende der Probleme
    'magic_link': ['Anmeldelink', 'sign-in link'], 'passkey': ['Passkey', 'passkey'], 'passkey_anlegen': ['Passkey anlegen', 'creating passkey'],
    'google': ['Google', 'Google'], 'github': ['GitHub', 'GitHub'], 'discord': ['Discord', 'Discord'],
    'rueckkehr': ['Rückkehr vom Anbieter', 'return from provider'],
    'hochladen': ['Hochladen', 'upload'], 'herunterladen': ['Herunterladen', 'download'],
    'verschluesseln': ['Verschlüsseln', 'encrypting'], 'entschluesseln': ['Entschlüsseln (Passwort?)', 'decrypting (password?)'],
    'datei_import': ['Datei einspielen', 'file restore'],
    'abbruch': ['Gegenstelle nicht erreicht', 'peer not reached'], 'keine_kandidaten': ['WebRTC blockiert', 'WebRTC blocked'],
    'ice_fehlgeschlagen': ['Netzwerkweg gescheitert', 'network path failed'],
    'tageslimit': ['Tageslimit', 'daily limit'], 'burst_limit': ['Kurzzeit-Limit', 'burst limit'],
    'proxy_offline': ['Proxy nicht erreichbar', 'proxy unreachable'], 'generierung_fehlgeschlagen': ['Erzeugung abgebrochen', 'generation failed'],
    'sonstiges': ['sonstiges', 'other'], 'routing_dienst': ['Routing-Dienst', 'routing service'],
    'rechte_checker': ['Rechte-Checker', 'rights checker']
};
// 'feature_genutzt' liefert der Worker als 'feature_genutzt::<view>' (und mit
// Unteraktion als 'feature_genutzt::<view>::<aktion>').
var FEATURE_LABELS = {
    'dashboard':     ['Übersicht', 'Overview'],
    'history':       ['Historie', 'History'],
    'performance':   ['Bilanz', 'Summary'],
    'ihk':           ['IHK / Karriere', 'IHK / career'],
    'school':        ['Berufsschule', 'Vocational school'],
    'goals':         ['Ziele', 'Goals'],
    'yearview':      ['Jahresübersicht', 'Year overview'],
    'monthcompare':  ['Monats-Vergleich', 'Month comparison'],
    'weekview':      ['Wochenansicht', 'Week view'],
    'aibot':         ['AI-Bot', 'AI bot'],
    'support':       ['Support', 'Support'],
    'analytics-pro': ['Diagramme', 'Charts'],
    'aufgaben':      ['Aufgaben', 'Tasks'],
    'aufgaben-tab':  ['Aufgaben', 'Tasks'],
    'urlaubsplaner': ['Urlaubsplaner', 'Vacation planner']
};
function humanize(s) {
    s = String(s || '').replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function subLabel(base, sub) {
    var l = SUB_LABELS[base + '::' + sub] || SUB_LABELS[sub];
    if (l) return T(l[0], l[1]);
    return sub.slice(-3) === '.js' ? sub : humanize(sub).toLowerCase();   // Dateinamen bleiben, wie sie sind
}
// Reiter einer Zeile: 'views' (reine Ansicht), 'problems' (problem_*), sonst 'actions'.
function eventGroup(name) {
    var p = String(name || '').split('::');
    if (p[0].indexOf('problem_') === 0) return 'problems';
    if (p[0] === 'feature_genutzt' && p.length === 2) return 'views';
    return 'actions';
}
function eventLabel(name) {
    var p = String(name || '').split('::');
    if (p[0] === 'feature_genutzt') {
        var f = FEATURE_LABELS[p[1]];
        var view = f ? T(f[0], f[1]) : humanize(p[1]);
        return p[2] ? view + ': ' + subLabel(p[1], p[2]) : view;
    }
    var l = EVENT_LABELS[p[0]];
    var base = l ? T(l[0], l[1]) : humanize(p[0]);
    return p[1] ? base + ': ' + subLabel(p[0], p[1]) : base;
}

// "< 10s", "1-3 Min", "10+ Min" → Sekunden, damit die Verteilung in echter Reihenfolge steht.
function durationBucketSeconds(label) {
    var m = String(label).match(/(\d+)/);
    if (!m) return 0;
    var n = parseInt(m[1], 10);
    if (/min/i.test(label)) n *= 60;
    if (/</.test(label)) n -= 0.5;
    return n;
}
function durationBucketLabel(label) {
    return String(label).replace(/(\d)-(\d)/, '$1–$2').replace(/Min/, 'min').replace(/(\d)s$/, '$1 s');
}
function firstNumber(label) { var m = String(label).match(/\d+/); return m ? +m[0] : 0; }
function pagesBucketLabel(label) {
    var s = String(label).replace(/(\d)-(\d)/, '$1–$2');
    return EN ? s.replace(/Seiten?/, function (w) { return w === 'Seite' ? 'page' : 'pages'; }) : s;
}

// ─── Kennzahlen ──────────────────────────────────────────────
// Liegt keine Vergleichszahl vor, bleibt die Zeile leer. Ein "+100 %" aus
// einem Vorzeitraum von 0 waere eine Zahl ohne Nenner.
function setDelta(id, cur, prev, lowerIsBetter) {
    var el = document.getElementById(id);
    if (!el) return;
    cur = Number(cur) || 0; prev = Number(prev) || 0;
    if (!prev) { el.className = 'metric-delta'; el.textContent = ''; return; }
    var pct = (cur - prev) / prev * 100;
    var rounded = Math.round(pct);
    if (rounded === 0) {
        el.className = 'metric-delta';
        el.textContent = T('unverändert', 'unchanged');
        return;
    }
    var good = lowerIsBetter ? pct < 0 : pct > 0;
    el.className = 'metric-delta ' + (good ? 'is-good' : 'is-bad');
    el.innerHTML = (pct > 0 ? ICONS.up : ICONS.down) + '<span>' + fmtInt(Math.abs(rounded)) + ' %</span>';
    el.title = T('Vorzeitraum: ', 'Previous period: ') + (id === 'dBounce' ? fmtPct(prev, 1) : id === 'dDuration' ? fmtDuration(prev) : fmtInt(prev));
}

function renderMetrics(sum) {
    document.getElementById('kVisitors').textContent = fmtNum(sum.visitors);
    document.getElementById('kPageviews').textContent = fmtNum(sum.pageviews);
    document.getElementById('kSessions').textContent = fmtNum(sum.sessions);
    document.getElementById('kBounce').textContent = sum.sessions ? fmtPct(sum.bounceRate, 0) : '—';
    document.getElementById('kDuration').textContent = sum.sessions ? fmtDuration(sum.avgSessionDuration) : '—';

    setDelta('dVisitors', sum.visitors, sum.visitorsPrev);
    setDelta('dPageviews', sum.pageviews, sum.pageviewsPrev);
    setDelta('dSessions', sum.sessions, sum.sessionsPrev);
    setDelta('dBounce', sum.bounceRate, sum.bounceRatePrev, true);
    setDelta('dDuration', sum.avgSessionDuration, sum.avgSessionDurationPrev);
}

// ─── Hauptdiagramm ───────────────────────────────────────────
var METRIC_NAMES = {
    visitors: ['Besucher', 'Visitors'],
    pageviews: ['Seitenaufrufe', 'Page views'],
    sessions: ['Sitzungen', 'Sessions']
};

// Ganzzahlige Rasterschritte — Besucher gibt es nicht in Vierteln ("1,25").
function niceStep(raw) {
    if (raw <= 1) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(raw)));
    var steps = [1, 2, 5, 10];
    for (var i = 0; i < steps.length; i++) {
        if (steps[i] * exp >= raw) return steps[i] * exp;
    }
    return 10 * exp;
}

// Bis 7 Tage liefert der Worker Stunden ('…T14:00:00Z', UTC), darueber Tage.
function isHourly(series) { return !!(series.length && String(series[0].ts).indexOf('T') !== -1); }

// Der Worker schickt nur Zeitpunkte MIT Aufrufen. Ohne Auffuellen verbindet die
// Linie zwei belebte Stunden quer ueber eine leere Nacht, als waere dazwischen
// etwas los gewesen. Aufgefuellt wird ab dem ersten gelieferten Punkt, nicht ab
// Zeitraumbeginn: davor wurde womoeglich noch gar nicht erfasst, und eine 0
// behauptete dann eine Messung, die es nie gab.
function fillSeries(series) {
    if (!series.length) return series;
    var hourly = isHourly(series);
    var byKey = {};
    series.forEach(function (s) { byKey[hourly ? new Date(s.ts).getTime() : s.ts] = s; });
    var out = [];
    if (hourly) {
        var H = 3600000;
        var t0 = new Date(series[0].ts).getTime();
        var tEnd = Math.max(new Date(series[series.length - 1].ts).getTime(), Math.floor(Date.now() / H) * H);
        for (var t = t0; t <= tEnd && out.length < 2000; t += H) {
            out.push(byKey[t] || { ts: new Date(t).toISOString().replace('.000Z', 'Z'), pageviews: 0, visitors: 0, sessions: 0 });
        }
    } else {
        var d = parseDay(series[0].ts), last = parseDay(series[series.length - 1].ts), today = new Date();
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (today > last) last = today;
        while (d <= last && out.length < 2000) {
            var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            out.push(byKey[k] || { ts: k, pageviews: 0, visitors: 0, sessions: 0 });
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        }
    }
    return out;
}

function pointLabel(ts, long, hourly) {
    var d = hourly ? new Date(ts) : parseDay(ts);
    var time = d.toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit' }) + (EN ? '' : ' Uhr');
    if (hourly && currentRange <= 1) return long ? d.toLocaleDateString(mwlLocale(), { weekday: 'short' }) + ', ' + time : time.replace(' Uhr', '');
    var date = d.toLocaleDateString(mwlLocale(), long
        ? { weekday: 'short', day: 'numeric', month: 'long', year: currentRange > 90 ? 'numeric' : undefined }
        : { day: 'numeric', month: 'short' });
    return long && hourly ? date + ', ' + time : date;
}

function renderMainChart() {
    var el = document.getElementById('mainChart');
    if (!el || !view.data) return;
    var series = fillSeries(view.data.series || []);
    var hourly = isHourly(series);
    var key = view.metric;
    var foot = document.getElementById('chartFoot');
    if (foot) {
        var span = { 1: T('den 24 Stunden', 'the 24 hours'), 365: T('dem Jahr', 'the year') }[currentRange] ||
                (EN ? 'the ' + currentRange + ' days' : 'den ' + currentRange + ' Tagen');
        var text = T('Pfeile vergleichen mit ', 'Arrows compare with ') + span + T(' davor.', ' before.');
        // Beginnt die Reihe spuerbar nach dem Zeitraumbeginn, lag davor keine
        // Erfassung — das sagen, statt die Luecke stumm zu lassen.
        if (series.length && !hourly) {
            var first = parseDay(series[0].ts);
            var rangeStart = new Date(Date.now() - currentRange * 86400000);
            if (first - rangeStart > 2 * 86400000) {
                text += ' ' + T('Erfasst wird seit ', 'Tracking started on ') +
                    first.toLocaleDateString(mwlLocale(), { day: 'numeric', month: 'long', year: 'numeric' }) + '.';
            }
        }
        foot.textContent = text;
    }

    var W = el.clientWidth, H = el.clientHeight;
    if (!series.length || W < 50) {
        el.innerHTML = '<div class="chart-empty">' + T('Keine Daten im Zeitraum.', 'No data in this period.') + '</div>';
        return;
    }

    var vals = series.map(function (s) { return Number(s[key]) || 0; });
    var step = niceStep(Math.max.apply(null, vals) / 4);
    var max = step * 4;
    var cs = getComputedStyle(el);
    var padT = parseFloat(cs.paddingTop) || 0, padB = parseFloat(cs.paddingBottom) || 0, padR = parseFloat(cs.paddingRight) || 0;
    W -= padR; H -= padT + padB;
    var L = 48, R = 8, TOP = 6, B = 26;
    var iw = Math.max(10, W - L - R), ih = Math.max(10, H - TOP - B);
    var n = vals.length;
    var x = function (i) { return L + (n === 1 ? iw / 2 : i * iw / (n - 1)); };
    var y = function (v) { return TOP + ih - (v / max) * ih; };

    var out = '<defs><linearGradient id="anAreaGrad" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="var(--primary)" stop-opacity="0.28"/>' +
        '<stop offset="100%" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>';

    for (var g = 0; g <= 4; g++) {
        var gv = max * g / 4, gy = y(gv).toFixed(1);
        out += '<line class="grid-line" x1="' + L + '" x2="' + (L + iw) + '" y1="' + gy + '" y2="' + gy + '"/>';
        out += '<text class="axis-text" x="' + (L - 10) + '" y="' + gy + '" dy="0.32em" text-anchor="end">' + esc(fmtNum(gv)) + '</text>';
    }

    // Bei Stundenwerten ueber mehrere Tage stehen die Marken an Mitternacht
    // (Ortszeit) — sonst tragen zwei Marken denselben Tag.
    var tickIdx = [];
    if (hourly && currentRange > 1) {
        series.forEach(function (s, i) { if (new Date(s.ts).getHours() === 0) tickIdx.push(i); });
        var every = Math.max(1, Math.ceil(tickIdx.length / Math.max(2, Math.floor(iw / 80))));
        tickIdx = tickIdx.filter(function (_, i) { return i % every === 0; });
    } else {
        var ticks = Math.min(n, Math.max(2, Math.floor(iw / 90)));
        for (var t = 0; t < ticks; t++) {
            var ti = ticks === 1 ? 0 : Math.round(t * (n - 1) / (ticks - 1));
            if (tickIdx.indexOf(ti) === -1) tickIdx.push(ti);
        }
    }
    tickIdx.forEach(function (idx) {
        var tx = x(idx);
        var anchor = tx - L < 30 ? 'start' : L + iw - tx < 30 ? 'end' : 'middle';
        out += '<text class="axis-text" x="' + tx.toFixed(1) + '" y="' + (TOP + ih + 18) + '" text-anchor="' + anchor + '">' + esc(pointLabel(series[idx].ts, false, hourly)) + '</text>';
    });

    var line = vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join('');
    if (n > 1) {
        out += '<path class="area" d="' + line + 'L' + x(n - 1).toFixed(1) + ' ' + (TOP + ih) + 'L' + x(0).toFixed(1) + ' ' + (TOP + ih) + 'Z"/>';
        out += '<path class="line" d="' + line + '"/>';
    }
    out += '<line class="cross" id="chartCross" y1="' + TOP + '" y2="' + (TOP + ih) + '" x1="-10" x2="-10" visibility="hidden"/>';
    out += '<circle class="dot" id="chartDot" r="4.5" cx="' + x(0) + '" cy="' + y(vals[0]) + '"' + (n > 1 ? ' visibility="hidden"' : '') + '/>';
    out += '<rect id="chartHit" x="' + L + '" y="0" width="' + iw + '" height="' + (TOP + ih) + '" fill="transparent"/>';

    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' +
        esc(T(METRIC_NAMES[key][0], METRIC_NAMES[key][1])) + '">' + out + '</svg><div class="chart-tip" id="chartTip"></div>';

    var svg = el.querySelector('svg'), cross = el.querySelector('#chartCross'), dot = el.querySelector('#chartDot'), tip = el.querySelector('#chartTip');
    function at(clientX) {
        var r = svg.getBoundingClientRect();
        var px = (clientX - r.left) * (W / r.width);
        var i = n === 1 ? 0 : Math.round((px - L) / iw * (n - 1));
        i = Math.max(0, Math.min(n - 1, i));
        var cx = x(i);
        cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', cx); dot.setAttribute('cy', y(vals[i])); dot.setAttribute('visibility', 'visible');
        tip.innerHTML = '<b>' + esc(fmtInt(vals[i])) + ' ' + esc(T(METRIC_NAMES[key][0], METRIC_NAMES[key][1])) + '</b><span>' + esc(pointLabel(series[i].ts, true, hourly)) + '</span>';
        var left = cx / W * r.width;
        var half = tip.offsetWidth / 2;
        tip.style.left = Math.max(half, Math.min(r.width - half, left)) + 'px';
        tip.classList.add('is-on');
    }
    function off() {
        cross.setAttribute('visibility', 'hidden');
        if (n > 1) dot.setAttribute('visibility', 'hidden');
        tip.classList.remove('is-on');
    }
    svg.addEventListener('pointermove', function (e) { at(e.clientX); });
    svg.addEventListener('pointerdown', function (e) { at(e.clientX); });
    svg.addEventListener('pointerleave', off);
}

function setMetric(key) {
    view.metric = key;
    document.querySelectorAll('.metric[data-metric]').forEach(function (b) {
        var on = b.dataset.metric === key;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderMainChart();
}

// ─── Listen ──────────────────────────────────────────────────
var LIST_LIMIT = 8;

function renderList(id, rows, opts) {
    var el = document.getElementById(id);
    if (!el) return;
    opts = opts || {};
    rows = (rows || []).filter(function (r) { return r.value > 0; });
    if (!rows.length) {
        el.innerHTML = '<p class="list-empty">' + esc(opts.empty || T('Keine Daten im Zeitraum.', 'No data in this period.')) + '</p>';
        return;
    }
    var key = opts.key || id;
    var open = !!view.expanded[key];
    var limit = opts.limit || LIST_LIMIT;
    var shown = open ? rows : rows.slice(0, limit);
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0);
    var total = opts.total || rows.reduce(function (s, r) { return s + r.value; }, 0);

    var html = shown.map(function (r) {
        var w = max ? (r.value / max * 100) : 0;
        var lead = r.icon ? '<span class="row-icon">' + r.icon + '</span>' : r.flag ? r.flag : '';
        var text = r.href
            ? '<a href="' + esc(r.href) + '"><span>' + esc(r.label) + '</span></a>'
            : '<span>' + esc(r.label) + '</span>';
        return '<div class="row"' + (r.title ? ' title="' + esc(r.title) + '"' : '') + '>' +
            '<span class="row-bar" style="width:' + w.toFixed(2) + '%"></span>' +
            '<span class="row-label' + (r.path ? ' is-path' : '') + '">' + lead + text + '</span>' +
            '<span class="row-value">' + esc(fmtInt(r.value)) + '</span>' +
            (opts.noShare ? '' : '<span class="row-share">' + esc(fmtPct(total ? r.value / total : 0, 0)) + '</span>') +
            '</div>';
    }).join('');

    if (rows.length > limit) {
        html += '<button type="button" class="list-more" data-expand="' + esc(key) + '" aria-expanded="' + open + '">' +
            esc(open ? T('Weniger anzeigen', 'Show less') : T('Alle ' + rows.length + ' anzeigen', 'Show all ' + rows.length)) + '</button>';
    }
    el.innerHTML = html;
}

function setColumnLabels(labelId, label, valueId, value) {
    var a = document.getElementById(labelId); if (a) a.textContent = label;
    var b = valueId && document.getElementById(valueId); if (b) b.textContent = value;
}

function renderPages() {
    var d = view.data; if (!d) return;
    var tab = view.tabs.pages, rows, val;
    if (tab === 'entry') { rows = mergePaths(d.entryPages, 'entries'); val = T('Einstiege', 'Entries'); }
    else if (tab === 'exit') { rows = mergePaths(d.exitPages, 'exits'); val = T('Ausstiege', 'Exits'); }
    else { rows = mergePaths(d.topPages, 'visitors'); val = T('Besucher', 'Visitors'); }
    setColumnLabels('pagesColLabel', T('Pfad', 'Path'), 'pagesColValue', val);
    renderList('pagesList', rows, { key: 'pages-' + tab });
}

function renderSources() {
    var d = view.data; if (!d) return;
    var tab = view.tabs.sources, rows, label = T('Quelle', 'Source'), empty;
    if (tab === 'channels') {
        rows = (d.channels || []).map(function (c) { return { label: channelLabel(c.channel), value: c.visitors }; });
        label = T('Kanal', 'Channel');
    } else if (tab === 'utm') {
        rows = ((d.utm && d.utm.sources) || []).filter(function (u) { return u.value && u.value !== '(keine)'; })
            .map(function (u) { return { label: u.value, value: u.visitors }; });
        label = 'utm_source';
        empty = T('Im Zeitraum kam niemand über einen Link mit Kampagnen-Kennung.', 'Nobody arrived via a link with a campaign tag in this period.');
    } else {
        // "www.bing.com" und "bing.com" kommen getrennt — nach dem Kuerzen sind es
        // zwei gleichlautende Zeilen. Zusammenlegen (Besucher koennen dabei doppelt
        // zaehlen, wenn jemand ueber beide kam; bei Verweisen vernachlaessigbar).
        var byLabel = {};
        (d.referrers || []).forEach(function (r) {
            var l = sourceLabel(r.source);
            byLabel[l] = (byLabel[l] || 0) + (Number(r.visitors) || 0);
        });
        rows = Object.keys(byLabel).map(function (l) { return { label: l, value: byLabel[l] }; })
            .sort(function (a, b) { return b.value - a.value; });
    }
    setColumnLabels('sourcesColLabel', label, 'sourcesColValue', T('Besucher', 'Visitors'));
    // UTM zaehlt nur die Besucher MIT Kennung — der Anteil soll sich auf alle beziehen.
    renderList('sourcesList', rows, { key: 'sources-' + tab, empty: empty, total: tab === 'utm' ? (d.summary && d.summary.visitors) : 0 });
}

function deRegionLabels() {
    var labels = {};
    var geo = window.__GEO_DE__;
    if (!EN && geo && geo.paths) geo.paths.forEach(function (p) { if (p.name) labels[p.id] = p.name; });
    return labels;
}

function renderGeo() {
    var d = view.data; if (!d) return;
    var tab = view.tabs.geo, rows;
    if (tab === 'regions') {
        var names = deRegionLabels();
        rows = (d.regions || []).filter(function (r) { return /^DE-/.test(r.id || ''); })
            .map(function (r) { return { label: names[r.id] || r.region, value: r.visitors }; });
        setColumnLabels('geoColLabel', T('Bundesland', 'State'));
    } else if (tab === 'cities') {
        rows = (d.cities || []).map(function (c) { return { label: c.city, value: c.visitors, flag: ccBadge(c.code) }; });
        setColumnLabels('geoColLabel', T('Stadt', 'City'));
    } else {
        rows = (d.countries || []).map(function (c) { return { label: countryName(c.code, c.country), value: c.visitors, flag: ccBadge(c.code) }; });
        setColumnLabels('geoColLabel', T('Land', 'Country'));
    }
    // Anteil gegen alle Besucher, nicht gegen die Liste: die Staedte decken nur
    // die ersten 30 ab, die Summe der Zeilen waere ein erfundener Nenner.
    renderList('geoList', rows, { key: 'geo-' + tab, limit: 9, total: d.summary && d.summary.visitors });
    showMap(tab === 'regions' ? 'de' : 'world');
    // Punkte nur bei "Staedte": auf dem Laender-Reiter deckte der Berlin-Cluster
    // Deutschland — das Land mit 90 % der Besucher — vollstaendig zu.
    var stage = document.getElementById('mapStage');
    if (stage) stage.classList.toggle('show-cities', tab === 'cities');
}

function renderTech() {
    var d = view.data; if (!d) return;
    var tab = view.tabs.tech, rows, label;
    if (tab === 'browsers') {
        rows = (d.browsers || []).filter(function (b) { return !isKnownBot(b.browser); }).map(function (b) { return { label: b.browser, value: b.visitors }; });
        label = 'Browser';
    } else if (tab === 'os') {
        rows = (d.os || []).filter(function (o) { return !isKnownBot(o.os); }).map(function (o) { return { label: o.os, value: o.visitors }; });
        label = T('Betriebssystem', 'Operating system');
    } else if (tab === 'screens') {
        rows = (d.resolutions || []).map(function (r) { return { label: r.res, value: r.visitors }; });
        label = T('Bildschirm', 'Screen');
    } else if (tab === 'langs') {
        rows = (d.languages || []).map(function (l) { return { label: langName(l.lang), value: l.visitors }; });
        label = T('Sprache', 'Language');
    } else {
        rows = (d.devices || []).map(function (x) {
            var l = DEVICE_LABELS[x.device];
            return { label: l ? T(l[0], l[1]) : x.device, value: x.visitors, icon: ICONS[String(x.device).toLowerCase()] || ICONS.desktop };
        });
        label = T('Gerät', 'Device');
    }
    setColumnLabels('techColLabel', label);
    renderList('techList', rows, { key: 'tech-' + tab, total: d.summary && d.summary.visitors });
}

// ─── Ladezeit (LCP) ──────────────────────────────────────────
function renderVitals(lcp) {
    var el = document.getElementById('vitals');
    if (!el) return;
    if (!lcp || !lcp.length) {
        el.innerHTML = '<p class="list-empty">' + T('Noch keine Messwerte im Zeitraum.', 'No measurements in this period yet.') + '</p>';
        return;
    }
    var classes = [
        { k: 'good', test: /good/i, name: T('Schnell', 'Fast'), range: T('unter 2,5 s', 'under 2.5 s') },
        { k: 'mid', test: /needs/i, name: T('Geht so', 'Needs work'), range: T('2,5 bis 4 s', '2.5 to 4 s') },
        { k: 'bad', test: /poor/i, name: T('Langsam', 'Slow'), range: T('über 4 s', 'over 4 s') }
    ];
    var total = lcp.reduce(function (s, l) { return s + (l.sessions || 0); }, 0);
    var rows = classes.map(function (c) {
        var hit = lcp.find(function (l) { return c.test.test(l.rating || ''); }) || { sessions: 0, avgMs: 0 };
        return { c: c, n: hit.sessions || 0, avg: hit.avgMs || 0 };
    });
    var bar = rows.filter(function (r) { return r.n > 0; }).map(function (r) {
        return '<i class="bg-' + r.c.k + '" style="flex:' + r.n + '" title="' + esc(r.c.name + ': ' + fmtPct(r.n / total, 0)) + '"></i>';
    }).join('');
    var list = rows.map(function (r) {
        return '<div class="vital">' +
            '<span class="vital-icon v-' + r.c.k + '">' + ICONS[r.c.k] + '</span>' +
            '<span class="vital-label">' + esc(r.c.name) + '<small>' + esc(r.c.range) + ' · ' + esc(fmtInt(r.n)) + ' ' + T('Sitzungen', 'sessions') + '</small></span>' +
            '<span class="vital-avg">' + (r.avg ? 'Ø ' + esc(fmtDec(r.avg / 1000, 2)) + ' s' : '') + '</span>' +
            '<span class="vital-share">' + esc(fmtPct(total ? r.n / total : 0, 0)) + '</span>' +
            '</div>';
    }).join('');
    el.innerHTML = '<div class="vitals-bar" role="img" aria-label="' + esc(T('Anteile schnell, mittel, langsam', 'Share fast, medium, slow')) + '">' + bar + '</div><div class="vitals-rows">' + list + '</div>';
}

// ─── Nutzungszeiten ──────────────────────────────────────────
// PostHog liefert Wochentag (1 = Montag … 7 = Sonntag) und Stunde in UTC —
// gemessen am 2026-09-29: toHour() und die Z-Stempel der 24-h-Reihe decken
// sich Stunde fuer Stunde. Umgerechnet wird auf die Uhr des Betrachters.
function renderHeatmap(activity) {
    var el = document.getElementById('heatmap');
    if (!el) return;
    var note = document.getElementById('heatNote');
    var peakEl = document.getElementById('heatPeak');
    var grid = [];
    for (var d0 = 0; d0 < 7; d0++) { grid.push(new Array(24).fill(0)); }
    var shift = -Math.round(new Date().getTimezoneOffset() / 60);
    (activity || []).forEach(function (a) {
        var dow = (Number(a.dow) || 1) - 1, h = (Number(a.hour) || 0) + shift;
        while (h >= 24) { h -= 24; dow = (dow + 1) % 7; }
        while (h < 0) { h += 24; dow = (dow + 6) % 7; }
        grid[dow][h] += Number(a.pageviews) || 0;
    });
    var max = 0, peak = null;
    grid.forEach(function (row, di) { row.forEach(function (v, hi) { if (v > max) { max = v; peak = [di, hi]; } }); });

    var days = EN ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    var daysLong = EN ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                      : ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    if (!max) {
        el.innerHTML = '<p class="list-empty">' + T('Keine Daten im Zeitraum.', 'No data in this period.') + '</p>';
        if (peakEl) peakEl.textContent = '';
        return;
    }
    function lvl(v) { return v <= 0 ? '' : ' h' + Math.min(5, Math.ceil(v / max * 5)); }
    function hh(h) { return (h < 10 ? '0' : '') + h; }
    // "14–15 Uhr" / "14:00–15:00"
    function span(h) { var b = (h + 1) % 24; return EN ? hh(h) + ':00–' + hh(b) + ':00' : hh(h) + '–' + hh(b) + ' Uhr'; }

    var html = '<div class="heat-grid"><span></span>';
    for (var h = 0; h < 24; h++) html += '<span class="heat-hour">' + (h % 6 === 0 ? hh(h) : '') + '</span>';
    grid.forEach(function (row, di) {
        html += '<span class="heat-day">' + days[di] + '</span>';
        row.forEach(function (v, hi) {
            html += '<span class="heat-cell' + lvl(v) + '" data-tip="' + esc(daysLong[di] + ', ' + span(hi) + ': ' + fmtInt(v) + ' ' + T('Aufrufe', 'views')) + '"></span>';
        });
    });
    html += '</div><div class="heat-legend"><span>' + T('weniger', 'less') + '</span>' +
        ['', ' h1', ' h2', ' h3', ' h4', ' h5'].map(function (c) { return '<i class="heat-cell' + c + '"></i>'; }).join('') +
        '<span>' + T('mehr', 'more') + '</span></div>';
    el.innerHTML = html;

    if (peakEl && peak) {
        peakEl.textContent = T('Am meisten los: ', 'Busiest: ') + days[peak[0]] + ' ' + span(peak[1]);
    }
    // HogQL kappt ohne LIMIT bei 100 Zeilen (7 x 24 = 168). Solange der Worker
    // das nicht mitschickt, fehlen die hinteren Wochentage — das sagen statt es
    // als "ruhiger Sonntag" auszugeben.
    if (note) {
        var cut = (activity || []).length === 100;
        note.hidden = !cut;
        note.textContent = cut ? T('Der Statistik-Server hat nur 100 von 168 Feldern geliefert, die letzten Wochentage fehlen deshalb.',
                                   'The statistics server only returned 100 of 168 cells, so the last weekdays are missing.') : '';
    }
}

// ─── Verhalten ───────────────────────────────────────────────
function renderHist(id, rows) {
    var el = document.getElementById(id);
    if (!el) return;
    var total = rows.reduce(function (s, r) { return s + r.value; }, 0);
    if (!total) { el.innerHTML = '<p class="list-empty">' + T('Keine Daten.', 'No data.') + '</p>'; return; }
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }));
    el.innerHTML = rows.map(function (r) {
        return '<div class="hist-row" title="' + esc(fmtInt(r.value) + ' ' + T('Sitzungen', 'sessions')) + '">' +
            '<span class="hist-label">' + esc(r.label) + '</span>' +
            '<span class="hist-track"><span class="hist-fill" style="width:' + (r.value / max * 100).toFixed(1) + '%"></span></span>' +
            '<span class="hist-val">' + esc(fmtPct(r.value / total, 0)) + '</span></div>';
    }).join('');
}

function renderBehaviour(d) {
    renderHist('durHist', (d.sessionDurationBuckets || []).slice()
        .sort(function (a, b) { return durationBucketSeconds(a.bucket) - durationBucketSeconds(b.bucket); })
        .map(function (b) { return { label: durationBucketLabel(b.bucket), value: b.sessions || 0 }; }));
    renderHist('ppsHist', (d.pageviewsPerSession || []).slice()
        .sort(function (a, b) { return firstNumber(a.bucket) - firstNumber(b.bucket); })
        .map(function (b) { return { label: pagesBucketLabel(b.bucket), value: b.sessions || 0 }; }));

    // Die Formel steht in engagement.js, weil /about/ dieselbe Zahl zeigt. Kein
    // Inline-Ersatz: fehlt die Datei, bleibt das Feld leer und das faellt auf.
    var sum = d.summary || {};
    var valEl = document.getElementById('kpiEngagement'), subEl = document.getElementById('kpiEngagementSub');
    if (!window.mwlEngagement) { valEl.textContent = '—'; subEl.textContent = T('nicht berechnet', 'not calculated'); return; }
    var p = window.mwlEngagement.parts({ pageviews: sum.pageviews, sessions: sum.sessions, bounceRate: sum.bounceRate });
    if (!p.hasData) { valEl.textContent = '—'; subEl.textContent = T('Keine Sitzungen im Zeitraum.', 'No sessions in this period.'); return; }
    valEl.textContent = window.mwlEngagement.score({ pageviews: sum.pageviews, sessions: sum.sessions, bounceRate: sum.bounceRate }) + ' / 100';
    subEl.textContent = fmtPct(1 - p.bounceRate, 0) + T(' sehen mehr als eine Seite, im Schnitt ', ' see more than one page, on average ') +
        fmtDec(p.pagesPerSession, 1) + T(' Seiten je Sitzung.', ' pages per session.');
}

// ─── Funktionen ──────────────────────────────────────────────
var EVENT_EMPTY = {
    views: ['Im Zeitraum wurde keine Ansicht geöffnet.', 'No view was opened in this period.'],
    actions: ['Im Zeitraum wurde keine Aktion gezählt.', 'No actions were counted in this period.'],
    problems: ['Im Zeitraum ist nichts schiefgegangen.', 'Nothing went wrong in this period.']
};
function renderEvents(events) {
    var meta = document.getElementById('eventsMeta');
    var tab = view.tabs.events;
    var counts = { views: 0, actions: 0, problems: 0 };
    var rows = [];
    (events || []).forEach(function (e) {
        var g = eventGroup(e.name), n = e.count || 0;
        counts[g] += n;
        if (g !== tab) return;
        // Bei Problemen ist "wie viele Leute" wichtiger als "wie oft" — eine Schleife
        // bei EINEM Nutzer sieht sonst aus wie ein Flaechenbrand.
        rows.push({ label: eventLabel(e.name), value: n,
                    title: fmtInt(e.visitors || 0) + ' ' + T('verschiedene Besucher', 'distinct visitors') });
    });
    rows.sort(function (a, b) { return b.value - a.value; });
    document.querySelectorAll('[data-group="events"] [data-count]').forEach(function (c) {
        var v = counts[c.getAttribute('data-count')];
        c.textContent = v ? fmtInt(v) : '';
    });
    var total = counts.views + counts.actions + counts.problems;
    if (meta) meta.textContent = total ? fmtInt(total) + ' ' + T('Ereignisse', 'events') : '';
    var empty = EVENT_EMPTY[tab] || EVENT_EMPTY.actions;
    renderList('eventsList', rows, { key: 'events-' + tab, limit: 12, noShare: true, empty: T(empty[0], empty[1]) });
}

// ─── Cloudflare ──────────────────────────────────────────────
function renderCloudflare(cf) {
    var days = document.getElementById('cfDays');
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    if (!cf || !cf.available || !cf.totals) {
        ['cfRequests', 'cfBytes', 'cfCache', 'cfThreats'].forEach(function (id) { set(id, '—'); });
        if (days) days.innerHTML = '<p class="list-empty">' + T('Keine Edge-Daten verfügbar.', 'No edge data available.') + '</p>';
        return;
    }
    var t = cf.totals;
    var req = t.requests || 0, cached = t.cachedRequests || 0, bytes = t.bytes || 0, cbytes = t.cachedBytes || 0;
    set('cfWindow', EN ? 'Last ' + (cf.days || 3) + ' days' : 'Letzte ' + (cf.days || 3) + ' Tage');
    set('cfRequests', fmtNum(req));
    set('cfRequestsSub', fmtInt(Math.round(req / (cf.days || 3))) + T(' pro Tag', ' per day'));
    set('cfBytes', fmtBytes(bytes));
    set('cfBytesSub', fmtBytes(cbytes) + T(' davon aus dem Cache', ' of it from cache'));
    set('cfCache', fmtPct(req ? cached / req : 0, 0));
    set('cfCacheSub', T('der Anfragen', 'of requests'));
    set('cfThreats', fmtInt(t.threats || 0));
    set('cfThreatsSub', T('Anfragen als Angriff erkannt', 'requests flagged as attacks'));

    if (!days) return;
    var hist = Array.isArray(cf.history) ? cf.history : [];
    if (!hist.length) { days.innerHTML = ''; return; }
    days.innerHTML = '<div class="cf-day is-head"><span>' + T('Tag', 'Day') + '</span><span class="cf-split">' + T('Cache / Server', 'Cache / origin') +
        '</span><span>' + T('Anfragen', 'Requests') + '</span><span>Cache</span><span>' + T('Daten', 'Data') + '</span></div>' +
        hist.map(function (r) {
            var hit = r.requests ? r.cachedRequests / r.requests : 0;
            return '<div class="cf-day"><span>' + esc(parseDay(r.date).toLocaleDateString(mwlLocale(), { weekday: 'short', day: 'numeric', month: 'short' })) + '</span>' +
                '<span class="cf-split"><span class="cf-track"><i class="cached" style="flex:' + (r.cachedRequests || 0) + '"></i><i class="origin" style="flex:' + Math.max(0, (r.requests || 0) - (r.cachedRequests || 0)) + '"></i></span></span>' +
                '<span>' + esc(fmtInt(r.requests)) + '</span><span>' + esc(fmtPct(hit, 0)) + '</span><span>' + esc(fmtBytes(r.bytes)) + '</span></div>';
        }).join('');
}

// ─── Karten ──────────────────────────────────────────────────
// geo-maps.js ist GENERIERT (tools/geo/build-maps.js) und bringt
// __GEO_WORLD__ und __GEO_DE__ mit. Fuenf gleich breite Stufen, und Karte und
// Legende benutzen dieselbe Funktion — sonst luegt die Legende.
var _mapData = { countries: [], regions: [], cities: [] };

// Logarithmisch: Deutschland stellt rund 90 % der Besucher. Linear fiele jedes
// andere Land in die unterste Stufe, und 1 Besucher saehe aus wie 30.
function _mapBucket(v, max) {
    if (!v || v <= 0 || max <= 0) return -1;
    if (max <= 1) return 4;
    return Math.max(0, Math.min(4, Math.ceil(Math.log(v) / Math.log(max) * 5) - 1));
}
function _mapBucketBounds(b, max) {
    if (max <= 1) return [1, 1];
    var lo = b === 0 ? 1 : Math.floor(Math.pow(max, b / 5)) + 1;
    var hi = Math.floor(Math.pow(max, (b + 1) / 5));
    return [lo, Math.max(lo, hi)];
}

function _graticule(project, ext, scale) {
    var out = '', lon, lat, d;
    function pt(lo, la) {
        var p = project(lo, la);
        return ((p[0] - ext.minX) * scale).toFixed(1) + ' ' + ((p[1] - ext.minY) * scale).toFixed(1);
    }
    for (lon = -150; lon <= 150; lon += 30) {
        d = ''; for (lat = -90; lat <= 90; lat += 5) d += (d ? 'L' : 'M') + pt(lon, lat);
        out += '<path d="' + d + '" class="map-grat"/>';
    }
    for (lat = -60; lat <= 80; lat += 30) {
        d = ''; for (lon = -180; lon <= 180; lon += 5) d += (d ? 'L' : 'M') + pt(lon, lat);
        out += '<path d="' + d + '" class="map-grat"/>';
    }
    return '<g>' + out + '</g>';
}

function _renderMapSvg(containerId, geo, valueByKey, labelByKey, cities, graticule) {
    var el = document.getElementById(containerId);
    if (!el) return;
    if (!geo || !geo.paths) { el.innerHTML = '<p class="map-empty">' + T('Kartendaten nicht geladen.', 'Map data not loaded.') + '</p>'; return; }
    var max = 0;
    Object.keys(valueByKey).forEach(function (k) { if (valueByKey[k] > max) max = valueByKey[k]; });
    var vb = geo.viewBox.split(' ').map(Number);
    var shapes = geo.paths.map(function (p) {
        var v = valueByKey[p.id] || 0, b = _mapBucket(v, max);
        return '<path d="' + p.d + '" class="map-shape' + (b >= 0 ? ' b' + b : '') + '" data-label="' +
            esc(labelByKey[p.id] || p.name || p.id) + '" data-value="' + v + '"></path>';
    }).join('');
    el._mapState = { k: 1, x: 0, y: 0, W: vb[2], H: vb[3], cities: cities || [], citiesRAF: 0 };
    el.innerHTML = '<svg viewBox="' + geo.viewBox + '" preserveAspectRatio="xMidYMid meet" class="map-svg" role="img" aria-label="' +
        esc(T('Karte der Besucher', 'Visitor map')) + '"><g class="map-zoom">' + (graticule || '') +
        '<g class="map-shapes">' + shapes + '</g><g class="map-cities"></g></g></svg>' +
        '<div class="map-controls">' +
        '<button type="button" class="map-ctrl" data-zoom="in" aria-label="' + T('Vergrößern', 'Zoom in') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 6v12M6 12h12"/></svg></button>' +
        '<button type="button" class="map-ctrl" data-zoom="out" aria-label="' + T('Verkleinern', 'Zoom out') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 12h12"/></svg></button>' +
        '<button type="button" class="map-ctrl" data-zoom="reset" aria-label="' + T('Zurücksetzen', 'Reset') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>' +
        '</div>';
    _bindMapTooltip(el);
    _renderCities(el);
    _attachMapZoom(el);
}

// Staerkste Stadt zuerst, sie zieht alle Nachbarn innerhalb von "thresh"
// (viewBox-Einheiten) an sich. thresh schrumpft beim Zoom → Ballungen brechen auf.
function _clusterCities(cities, thresh) {
    var sorted = cities.slice().sort(function (a, b) { return b.visitors - a.visitors; });
    var used = [], out = [], t2 = thresh * thresh;
    for (var i = 0; i < sorted.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        var seed = sorted[i], members = [seed], total = seed.visitors;
        for (var j = i + 1; j < sorted.length; j++) {
            if (used[j]) continue;
            var dx = sorted[j].x - seed.x, dy = sorted[j].y - seed.y;
            if (dx * dx + dy * dy <= t2) { used[j] = true; members.push(sorted[j]); total += sorted[j].visitors; }
        }
        out.push({ x: seed.x, y: seed.y, total: total, count: members.length, members: members });
    }
    return out;
}

// Radien per /k gegengerechnet: Punkte bleiben in jeder Zoomstufe gleich gross.
function _renderCities(el) {
    var st = el && el._mapState, g = el && el.querySelector('.map-cities');
    if (!st || !g) return;
    var k = st.k;
    g.innerHTML = _clusterCities(st.cities, 26 / k).map(function (cl) {
        var many = cl.count > 1;
        var scr = many ? 3 + Math.min(6, Math.sqrt(cl.total) * 0.8) : 2.6 + Math.min(4, Math.sqrt(cl.total) * 0.7);
        var cx = cl.x.toFixed(2), cy = cl.y.toFixed(2);
        return (many ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((scr + 2.8) / k).toFixed(2) + '" class="map-cluster-ring"></circle>' : '') +
            '<circle cx="' + cx + '" cy="' + cy + '" r="' + (scr / k).toFixed(2) + '" class="map-city' + (many ? ' is-cluster' : '') +
            '" data-city="' + esc(cl.members[0].city || '') + '" data-more="' + (cl.count - 1) + '" data-value="' + cl.total + '"></circle>';
    }).join('');
}

// Rad = Zoom auf den Zeiger, Ziehen = Verschieben, zwei Finger = Pinch.
function _attachMapZoom(el) {
    var st = el && el._mapState, svg = el.querySelector('svg'), zg = el.querySelector('.map-zoom');
    if (!st || !svg || !zg) return;
    var MINK = 1, MAXK = 10;   // darueber liefert der 110m-Datensatz kein echtes Konturdetail mehr
    function clamp() {
        st.k = Math.max(MINK, Math.min(MAXK, st.k));
        st.x = Math.min(0, Math.max(st.W * (1 - st.k), st.x));
        st.y = Math.min(0, Math.max(st.H * (1 - st.k), st.y));
    }
    function apply() {
        clamp();
        zg.setAttribute('transform', 'translate(' + st.x.toFixed(2) + ' ' + st.y.toFixed(2) + ') scale(' + st.k.toFixed(4) + ')');
        el.classList.toggle('is-zoomed', st.k > 1.001);
    }
    function cities() {
        if (st.citiesRAF) return;
        st.citiesRAF = requestAnimationFrame(function () { st.citiesRAF = 0; _renderCities(el); });
    }
    function toUser(cx, cy) {
        var m = svg.getScreenCTM(); if (!m) return null;
        var p = svg.createSVGPoint(); p.x = cx; p.y = cy;
        return p.matrixTransform(m.inverse());
    }
    function zoomAt(cx, cy, f) {
        var u = toUser(cx, cy); if (!u) return;
        var px = (u.x - st.x) / st.k, py = (u.y - st.y) / st.k;
        st.k = Math.max(MINK, Math.min(MAXK, st.k * f));
        st.x = u.x - st.k * px; st.y = u.y - st.k * py;
        apply(); cities();
    }
    function centerZoom(f) { var r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }

    svg.addEventListener('wheel', function (e) {
        // Erst ab einer Zoomstufe > 1 oder mit Strg das Rad abfangen — sonst
        // bleibt beim Scrollen durch die Seite der Zeiger an der Karte haengen.
        if (st.k <= 1.001 && !e.ctrlKey && e.deltaY > 0) return;
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });

    var pointers = {}, count = 0, lastDist = 0;
    svg.addEventListener('pointerdown', function (e) {
        if (!pointers[e.pointerId]) count++;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        lastDist = 0;
        if (st.k > 1.001 || count > 1) { try { svg.setPointerCapture(e.pointerId); } catch (_) {} }
    });
    svg.addEventListener('pointermove', function (e) {
        var prev = pointers[e.pointerId]; if (!prev) return;
        pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (count >= 2) {
            var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]];
            var dist = Math.hypot(a.x - b.x, a.y - b.y);
            if (lastDist) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / lastDist);
            lastDist = dist;
        } else if (count === 1 && st.k > 1.001) {
            var m = svg.getScreenCTM(); if (!m) return;
            st.x += (e.clientX - prev.x) / m.a; st.y += (e.clientY - prev.y) / m.d;
            apply();
        }
    });
    function end(e) {
        if (pointers[e.pointerId]) { delete pointers[e.pointerId]; count--; }
        if (count < 2) lastDist = 0;
        if (count < 0) count = 0;
    }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('dblclick', function (e) { e.preventDefault(); zoomAt(e.clientX, e.clientY, 1.6); });

    el.querySelector('.map-controls').addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-zoom]'); if (!b) return;
        var z = b.getAttribute('data-zoom');
        if (z === 'in') centerZoom(1.5);
        else if (z === 'out') centerZoom(1 / 1.5);
        else { st.k = 1; st.x = 0; st.y = 0; apply(); cities(); }
    });
    apply();
}

// Delegation am Container: die Staedte-Ebene wird beim Zoomen neu gezeichnet,
// ein einmal gebundener Handler faengt Laender UND Cluster ohne Leck.
function _bindMapTooltip(el) {
    var tip = document.getElementById('mapTooltip'), stage = document.getElementById('mapStage');
    if (!tip || el._tipBound) return;
    el._tipBound = true;
    var hot = null;
    function show(node, e) {
        var svg = el.querySelector('svg');
        var city = node.getAttribute('data-city'), head;
        if (city !== null) {
            var more = +node.getAttribute('data-more') || 0;
            head = esc(city) + (more > 0 ? ' <span class="mt-more">+' + more + '</span>' : '');
        } else {
            head = esc(node.getAttribute('data-label') || '');
        }
        tip.innerHTML = '<strong>' + head + '</strong><span>' + esc(fmtInt(+node.getAttribute('data-value') || 0)) + ' ' + T('Besucher', 'visitors') + '</span>';
        tip.classList.add('show');
        if (svg) svg.classList.add('is-focused');
        if (hot && hot !== node) hot.classList.remove('is-hot');
        node.classList.add('is-hot'); hot = node;
        move(e);
    }
    function hide() {
        var svg = el.querySelector('svg');
        tip.classList.remove('show');
        if (svg) svg.classList.remove('is-focused');
        if (hot) { hot.classList.remove('is-hot'); hot = null; }
    }
    function move(e) {
        var r = stage.getBoundingClientRect();
        tip.style.left = (e.clientX - r.left) + 'px';
        tip.style.top = (e.clientY - r.top) + 'px';
    }
    el.addEventListener('pointerover', function (e) {
        var n = e.target.closest && e.target.closest('.map-shape, .map-city');
        if (n) show(n, e);
    });
    el.addEventListener('pointermove', function (e) { if (tip.classList.contains('show')) move(e); });
    el.addEventListener('pointerout', function (e) {
        var n = e.target.closest && e.target.closest('.map-shape, .map-city');
        if (!n) return;
        var to = e.relatedTarget;
        if (to && to.closest && to.closest('.map-shape, .map-city')) return;
        hide();
    });
}

// Equal-Earth — MUSS identisch zu tools/geo/build-maps.js sein, sonst landen
// die Staedte neben der Karte.
function _projectEqualEarth(lon, lat) {
    var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796;
    var l = lon * Math.PI / 180, p = lat * Math.PI / 180;
    var th = Math.asin((Math.sqrt(3) / 2) * Math.sin(p));
    var th2 = th * th, th6 = th2 * th2 * th2;
    var den = 3 * (9 * A4 * th6 * th2 + 7 * A3 * th6 + 3 * A2 * th2 + A1);
    return [2 * Math.sqrt(3) * l * Math.cos(th) / den, -(A4 * th6 * th2 * th + A3 * th6 * th + A2 * th2 * th + A1 * th)];
}

var _worldBounds = null;
function _worldExtent() {
    if (_worldBounds) return _worldBounds;
    var b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (var lon = -180; lon <= 180; lon += 2) {
        for (var lat = -90; lat <= 90; lat += 2) {
            var p = _projectEqualEarth(lon, lat);
            b.minX = Math.min(b.minX, p[0]); b.maxX = Math.max(b.maxX, p[0]);
            b.minY = Math.min(b.minY, p[1]); b.maxY = Math.max(b.maxY, p[1]);
        }
    }
    return (_worldBounds = b);
}

function renderMaps(countries, regions, cities) {
    _mapData = { countries: countries || [], regions: regions || [], cities: cities || [] };
    var world = window.__GEO_WORLD__;

    var cVals = {}, cLabels = {};
    _mapData.countries.forEach(function (c) {
        if (!c.code) return;
        cVals[c.code] = c.visitors || 0;
        cLabels[c.code] = countryName(c.code, c.country);
    });

    // Die Marker MUESSEN mit der Box normiert werden, mit der die Karte gebaut
    // wurde (world.bounds, Landmasse ohne Antarktis). _worldExtent() ist nur
    // Rueckfall fuer alte geo-Dateien und schiebt die Marker sonst nach rechts.
    var markers = [], grat = '';
    if (world) {
        var vb = world.viewBox.split(' ').map(Number);
        var ext = world.bounds || _worldExtent();
        var scale = vb[2] / (ext.maxX - ext.minX);
        _mapData.cities.forEach(function (c) {
            if (c.lat == null || c.lon == null) return;
            var p = _projectEqualEarth(c.lon, c.lat);
            var x = (p[0] - ext.minX) * scale, y = (p[1] - ext.minY) * scale;
            if (x < 0 || x > vb[2] || y < 0 || y > vb[3]) return;
            markers.push({ x: x, y: y, city: c.city, visitors: +c.visitors || 0 });
        });
        grat = _graticule(_projectEqualEarth, ext, scale);
    }
    _renderMapSvg('mapWorld', world, cVals, cLabels, markers, grat);

    var rVals = {}, rLabels = deRegionLabels();
    _mapData.regions.forEach(function (r) {
        if (!r.id) return;
        rVals[r.id] = r.visitors || 0;
        if (!rLabels[r.id]) rLabels[r.id] = r.region || r.id;
    });
    _renderMapSvg('mapDE', window.__GEO_DE__, rVals, rLabels, null);
}

function showMap(which) {
    var w = document.getElementById('mapWorld'), d = document.getElementById('mapDE');
    if (w) w.classList.toggle('is-active', which === 'world');
    if (d) d.classList.toggle('is-active', which === 'de');
    var vals = which === 'de'
        ? _mapData.regions.filter(function (r) { return /^DE-/.test(r.id || ''); }).map(function (r) { return r.visitors || 0; })
        : _mapData.countries.map(function (c) { return c.visitors || 0; });
    renderMapLegend(Math.max.apply(null, [0].concat(vals)));
}

function renderMapLegend(max) {
    var el = document.getElementById('mapLegend');
    if (!el) return;
    if (!max) { el.innerHTML = ''; return; }
    var steps = [0, 1, 2, 3, 4].map(function (b) {
        var lh = _mapBucketBounds(b, max), lo = lh[0], hi = lh[1];
        return '<i class="lv' + b + '" title="' + esc(lo + (hi > lo ? '–' + hi : '') + ' ' + T('Besucher', 'visitors')) + '"></i>';
    }).join('');
    el.innerHTML = '<span>1</span>' + steps + '<span>' + esc(fmtInt(max)) + '</span>';
}

// ─── Status ──────────────────────────────────────────────────
function setLiveStatus(status) {
    var dot = document.getElementById('liveDot'), label = document.getElementById('liveLabel');
    var map = {
        connecting: ['is-connecting', T('Lädt…', 'Loading…')],
        live: ['is-live', T('Aktuell', 'Up to date')],
        stale: ['is-stale', T('Zwischenstand', 'Cached')],
        error: ['is-error', T('Keine Verbindung', 'No connection')]
    };
    var s = map[status] || map.connecting;
    if (dot) dot.className = 'status-dot ' + s[0];
    if (label) label.textContent = s[1];
}

function showNotice(title, text, detail) {
    var el = document.getElementById('notice');
    if (!el) return;
    document.getElementById('noticeTitle').textContent = title;
    document.getElementById('noticeText').textContent = text;
    var det = document.getElementById('noticeDetail');
    det.hidden = !detail;
    det.textContent = detail || '';
    el.hidden = false;
}
function hideNotice() { var el = document.getElementById('notice'); if (el) el.hidden = true; }

// ─── Laden ───────────────────────────────────────────────────
// Der Proxy feuert je Abruf rund 30 PostHog-Abfragen; PostHog drosselt sie im
// Burst. Statt eine leere Seite zu zeigen, bleibt die letzte gute Antwort je
// Zeitraum im sessionStorage und wird bei Drosselung mit Countdown gezeigt.
var _analyticsLoading = false;
var _analyticsRetryTimer = null;
var _analyticsCountdownTimer = null;

function analyticsCacheKey() { return 'mwl_an_cache_' + currentRange; }
function saveAnalyticsCache(d) {
    try { sessionStorage.setItem(analyticsCacheKey(), JSON.stringify({ ts: Date.now(), data: d })); } catch (e) { /* voll oder gesperrt */ }
}
function loadAnalyticsCache() {
    try { var raw = sessionStorage.getItem(analyticsCacheKey()); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function payloadHasData(d) {
    if (!d) return false;
    var s = d.summary || {};
    return !!(s.pageviews || s.visitors || s.sessions) || (Array.isArray(d.series) && d.series.length > 0);
}
function errorsAreThrottle(errs) {
    if (!errs) return false;
    return Object.keys(errs).some(function (k) { return /\b429\b|throttl/i.test(String(errs[k])); });
}
function parseRetrySeconds(errs) {
    var max = 0;
    Object.keys(errs || {}).forEach(function (k) {
        var m = String(errs[k]).match(/in\s+(\d+)\s+second/i);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return Math.min(Math.max(max || 120, 15), 900);
}
function clearAnalyticsRetry() {
    if (_analyticsRetryTimer) { clearTimeout(_analyticsRetryTimer); _analyticsRetryTimer = null; }
    if (_analyticsCountdownTimer) { clearInterval(_analyticsCountdownTimer); _analyticsCountdownTimer = null; }
}
function enterBackendBusy(secs, staleTs) {
    clearAnalyticsRetry();
    var left = secs;
    var text = T('Der Statistik-Server bremst gerade die Anfragen.', 'The statistics server is rate-limiting requests right now.') +
        (staleTs ? ' ' + T('Angezeigt wird der Stand von ', 'Showing data from ') + new Date(staleTs).toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit' }) + '.' : '');
    function tick() {
        showNotice(T('Statistik-Server ausgelastet', 'Statistics server busy'), text,
            T('Neuer Versuch in ', 'Retrying in ') + Math.max(0, left) + ' s');
        left--;
    }
    tick();
    _analyticsCountdownTimer = setInterval(tick, 1000);
    _analyticsRetryTimer = setTimeout(function () { loadAll(); }, (secs + 2) * 1000);
}

function renderAll(d) {
    view.data = d;
    renderMetrics(d.summary || {});
    renderMainChart();
    renderPages();
    renderSources();
    renderMaps(d.countries, d.regions, d.cities);
    renderGeo();
    renderTech();
    renderVitals(d.webVitals && d.webVitals.lcp);
    renderHeatmap(d.activity);
    renderBehaviour(d);
    renderEvents(d.customEvents);
    renderCloudflare(d.cloudflare);
}

async function loadAll() {
    if (_analyticsLoading) return;   // kein ueberlappender 30-Abfragen-Burst (verschaerft die Drosselung)
    _analyticsLoading = true;
    clearAnalyticsRetry();
    var btn = document.getElementById('refreshBtn');
    if (btn) btn.disabled = true;
    setLiveStatus('connecting');
    document.body.classList.add('is-loading');

    // Ohne Timeout haengt ein stiller Proxy-Stall die Seite dauerhaft im Ladezustand.
    var ctrl = new AbortController();
    var timeoutId = setTimeout(function () { ctrl.abort(); }, 30000);

    try {
        var res;
        try {
            res = await fetch(CF_PROXY + '?range=' + currentRange, { cache: 'no-store', signal: ctrl.signal });
        } catch (netErr) {
            if (netErr.name === 'AbortError') throw new Error(T('Zeitüberschreitung nach 30 s.', 'Timed out after 30 s.'));
            throw new Error(T('Netzwerkfehler: ', 'Network error: ') + netErr.message);
        } finally {
            clearTimeout(timeoutId);
        }
        if (!res.ok) {
            var errTxt = await res.text().catch(function () { return ''; });
            var errMsg = errTxt;
            try { errMsg = JSON.parse(errTxt).error || errTxt; } catch (e) { /* Rohtext */ }
            throw new Error('HTTP ' + res.status + ' — ' + String(errMsg).slice(0, 300));
        }
        var d = await res.json();
        if (d.error) throw new Error(d.error);
        if (d._errors) console.warn('Analytics: Teil-Abfragen fehlgeschlagen:', d._errors);

        var stale = false;
        if (!payloadHasData(d)) {
            if (errorsAreThrottle(d._errors)) {
                var secs = parseRetrySeconds(d._errors), cache = loadAnalyticsCache();
                if (cache && payloadHasData(cache.data)) {
                    enterBackendBusy(secs, cache.ts);
                    d = cache.data;
                    stale = true;
                } else {
                    enterBackendBusy(secs, null);
                    setLiveStatus('error');
                    return;
                }
            }
            // nicht gedrosselt + leer = echt (noch) keine Daten → normal rendern
        } else {
            saveAnalyticsCache(d);
            hideNotice();
        }

        renderAll(d);
        var lu = document.getElementById('lastUpdated');
        if (lu) lu.textContent = T('Stand ', 'Updated ') + new Date().toLocaleTimeString(mwlLocale(), { hour: '2-digit', minute: '2-digit' }) + (EN ? '' : ' Uhr');
        setLiveStatus(stale ? 'stale' : 'live');
    } catch (err) {
        console.error('Analytics Error:', err);
        clearAnalyticsRetry();
        setLiveStatus('error');
        showNotice(T('Statistik-Server nicht erreichbar', 'Statistics server not reachable'),
            T('Die Verbindung konnte nicht hergestellt werden. Internetverbindung prüfen und neu laden.',
              'The connection could not be established. Check your internet connection and reload.'),
            err.message || String(err));
    } finally {
        _analyticsLoading = false;
        if (btn) btn.disabled = false;
        document.body.classList.remove('is-loading');
    }
}

function setTimeRange(days) {
    currentRange = days;
    document.querySelectorAll('.range-btn').forEach(function (b) {
        var on = parseInt(b.dataset.range, 10) === days;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    view.expanded = {};
    loadAll();
}

// ─── Gerade eben (Live-Feed) ─────────────────────────────────
// Eigener leichter Endpunkt (?feed), unabhaengig vom grossen Abruf. Pollt alle
// 20 s und pausiert im Hintergrund-Tab (spart Worker-Kontingent).
var _liveFeedSeen = {};
var _liveFeedTimer = null;
var _liveFeedFirstLoad = true;

function fmtRelTime(unixSec) {
    var diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSec);
    if (diff < 10) return T('gerade eben', 'just now');
    if (diff < 60) return EN ? diff + ' s ago' : 'vor ' + diff + ' s';
    var m = Math.floor(diff / 60);
    if (m < 60) return EN ? m + ' min ago' : 'vor ' + m + ' min';
    var h = Math.floor(m / 60);
    if (h < 24) return EN ? h + ' h ago' : 'vor ' + h + ' h';
    var dd = Math.floor(h / 24);
    return EN ? dd + ' d ago' : 'vor ' + dd + (dd === 1 ? ' Tag' : ' Tagen');
}
function latencyClass(ms) { return ms < 1000 ? 'fast' : ms < 2500 ? 'mid' : 'slow'; }
function fmtLatency(ms) { return ms >= 1000 ? fmtDec(ms / 1000, 1) + ' s' : Math.round(ms) + ' ms'; }

function renderLiveFeed(events) {
    var ul = document.getElementById('liveFeed');
    if (!ul) return;
    if (!events || !events.length) {
        if (_liveFeedFirstLoad) ul.innerHTML = '<li class="empty">' + T('Noch keine Aufrufe.', 'No page views yet.') + '</li>';
        return;
    }
    var shown = events.slice(0, 10);
    ul.innerHTML = shown.map(function (e) {
        var isNew = !_liveFeedFirstLoad && !_liveFeedSeen[e.ts + '|' + e.path];
        var dev = DEVICE_LABELS[e.device];
        var lat = (e.latencyMs != null && e.latencyMs > 0)
            ? '<span class="feed-lat ' + latencyClass(e.latencyMs) + '" title="' + esc(T('Ladezeit', 'Load time')) + '">' + esc(fmtLatency(e.latencyMs)) + '</span>'
            : '<span></span>';
        return '<li' + (isNew ? ' class="is-new"' : '') + '>' +
            '<span class="feed-flag" aria-hidden="true">' + ccBadge(e.cc) + '</span>' +
            '<span class="feed-path">' + esc(e.path) + '</span>' +
            '<span class="feed-time">' + esc(fmtRelTime(e.ts)) + '</span>' +
            '<span class="feed-meta">' + esc(e.cc ? countryName(e.cc) : '') + (e.device ? '<span>' + esc(dev ? T(dev[0], dev[1]) : e.device) + '</span>' : '') + '</span>' +
            lat + '</li>';
    }).join('');
    _liveFeedSeen = {};
    shown.forEach(function (e) { _liveFeedSeen[e.ts + '|' + e.path] = true; });
    _liveFeedFirstLoad = false;
}

// Der gruene Punkt behauptet, die Liste sei von jetzt. Er haengt deshalb am
// tatsaechlichen Abruf, sonst leuchtet er auch nach Minuten ohne Antwort.
function setLiveFeedStatus(ok) {
    var el = document.getElementById('liveFeedStatus');
    if (!el) return;
    el.classList.toggle('is-stale', !ok);
    var label = el.querySelector('.lf-status-text');
    if (label) label.textContent = ok ? T('Live', 'Live') : T('Nicht erreichbar', 'No connection');
}

async function loadLiveFeed() {
    if (document.hidden || !document.getElementById('liveFeed')) return;
    try {
        var res = await fetch(CF_PROXY + '?feed=1', { cache: 'no-store' });
        if (!res.ok) { setLiveFeedStatus(false); return; }
        var d = await res.json();
        if (d && Array.isArray(d.events)) {
            setLiveFeedStatus(true);
            renderLiveFeed(d.events);
        } else if (d && d.summary) {
            // Ein Worker ohne ?feed liefert die volle Analyse zurueck. Dann NICHT
            // alle 20 s den schweren Endpunkt haemmern — Feed still abschalten.
            if (_liveFeedTimer) { clearInterval(_liveFeedTimer); _liveFeedTimer = null; }
            setLiveFeedStatus(false);
        }
    } catch (e) {
        // Netzfehler/Adblock: der Feed ist Beiwerk und darf die Seite nie stoeren.
        setLiveFeedStatus(false);
    }
}

function startLiveFeed() {
    loadLiveFeed();
    if (_liveFeedTimer) clearInterval(_liveFeedTimer);
    _liveFeedTimer = setInterval(loadLiveFeed, 20000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loadLiveFeed(); });
}

// ─── Schwebender Hinweis fuer Heatmap-Zellen ─────────────────
// Ein title-Attribut erscheint am Handy nie — deshalb ein eigener Hinweis,
// der auch auf Antippen reagiert.
function bindFloatTip() {
    var tip = document.createElement('div');
    tip.className = 'float-tip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
    function show(e) {
        var t = e.target.closest && e.target.closest('[data-tip]');
        if (!t) { tip.classList.remove('is-on'); return; }
        tip.textContent = t.getAttribute('data-tip');
        var r = t.getBoundingClientRect();
        tip.classList.add('is-on');
        var half = tip.offsetWidth / 2;
        tip.style.left = Math.max(8 + half, Math.min(window.innerWidth - 8 - half, r.left + r.width / 2)) + 'px';
        tip.style.top = (r.top - 8) + 'px';
    }
    document.addEventListener('pointerover', show);
    document.addEventListener('pointerdown', show);
    document.addEventListener('scroll', function () { tip.classList.remove('is-on'); }, { passive: true });
}

// ─── Bereichsnavigation ──────────────────────────────────────
function bindSectionNav() {
    var links = [].slice.call(document.querySelectorAll('.section-nav a'));
    if (!('IntersectionObserver' in window) || !links.length) return;
    var current = null;
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            current = en.target.id;
            links.forEach(function (a) {
                var on = a.getAttribute('href') === '#' + current;
                a.classList.toggle('is-current', on);
                if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-35% 0px -60% 0px' });
    links.forEach(function (a) {
        var s = document.querySelector(a.getAttribute('href'));
        if (s) io.observe(s);
    });
}

// ─── Start ───────────────────────────────────────────────────
var RENDER_TAB = { pages: renderPages, sources: renderSources, geo: renderGeo, tech: renderTech,
                  events: function () { renderEvents(view.data && view.data.customEvents); } };

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.range-btn').forEach(function (b) {
        b.addEventListener('click', function () { setTimeRange(parseInt(b.dataset.range, 10)); });
    });
    document.getElementById('refreshBtn').addEventListener('click', function () { loadAll(); });
    document.querySelectorAll('.metric[data-metric]').forEach(function (b) {
        b.addEventListener('click', function () { setMetric(b.dataset.metric); });
    });
    document.querySelectorAll('.seg[data-group]').forEach(function (seg) {
        seg.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-tab]');
            if (!b) return;
            var group = seg.dataset.group;
            view.tabs[group] = b.dataset.tab;
            seg.querySelectorAll('button').forEach(function (x) {
                var on = x === b;
                x.classList.toggle('is-active', on);
                x.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            if (RENDER_TAB[group]) RENDER_TAB[group]();
        });
    });
    document.addEventListener('click', function (e) {
        var more = e.target.closest && e.target.closest('.list-more[data-expand]');
        if (!more) return;
        var key = more.getAttribute('data-expand');
        view.expanded[key] = !view.expanded[key];
        var list = more.closest('.list');
        if (!list) return;
        if (list.id === 'eventsList') renderEvents(view.data && view.data.customEvents);
        else {
            var group = { pagesList: 'pages', sourcesList: 'sources', geoList: 'geo', techList: 'tech' }[list.id];
            if (RENDER_TAB[group]) RENDER_TAB[group]();
        }
    });

    var chart = document.getElementById('mainChart');
    if (chart && 'ResizeObserver' in window) {
        var raf = 0, lastW = 0;
        new ResizeObserver(function () {
            if (chart.clientWidth === lastW) return;
            lastW = chart.clientWidth;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(renderMainChart);
        }).observe(chart);
    }

    bindFloatTip();
    bindSectionNav();
    loadAll();
    startLiveFeed();
    setInterval(function () { if (!document.hidden) loadAll(); }, 300000);
});
