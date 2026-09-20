#!/usr/bin/env node
// ═══ DIE VIER AUFNAHMEN AUF /about/ NEU MACHEN ═══
//
// Erzeugt Beispieldaten (ein erfundener Azubi, 18 Wochen Eintraege bis zum
// letzten Freitag vor heute) und nimmt damit die vier Bilder unter
// /Grafiken/about/ auf: Dashboard am Rechner, Recovery Center, Dashboard am
// Handy, Berichtsheft-Uebersicht. 2x aufgeloest, WebP. Braucht den lokalen Server (Portman, 5001).
//
//   node tools/about-screenshots.mjs            → Grafiken/about/*.webp
//   node tools/about-screenshots.mjs --nur-seed → schreibt nur die Seed-Datei
//
// Warum ein Skript und keine Handarbeit: die Bilder werden bei jeder Aenderung
// der Oberflaeche unter GLEICHEM Namen ersetzt (der Ordner ist immutable
// gecacht, deshalb tragen die <img> ein ?v= — stamp-assets.js kennt .webp).
// Wer sie von Hand mit eigenen Daten aufnimmt, hat echte Arbeitszeiten und
// Notizen auf einer oeffentlichen Seite. Die Zahlen hier sind erfunden und so
// gewaehlt, dass sie plausibel aussehen: Soll 8,75 h Mo–Do und 4,5 h Fr (die
// Vorgabe der App), Berufsschule dienstags, eine Urlaubswoche im August, ein
// Kranktag, Gleitzeit im niedrigen einstelligen Bereich.
//
// Was vor dem Bild weggeraeumt wird, weil es beim ersten Besuch sonst darueber
// liegt: Datenschutz-Dialog (privacy_acknowledged), Umfrage, Streak-Toast,
// Sprach-Hinweis, Export-Erinnerung, und der localhost-Banner, der nur lokal
// existiert.

import { writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const URL_APP = 'http://localhost:5001/';
const OUT = join(ROOT, 'Grafiken', 'about');
const SEED = join(HERE, 'about-screenshots.seed.json');

// ── Beispieldaten ────────────────────────────────────────────────────────
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hours = [0, 8.75, 8.75, 8.75, 8.75, 4.5, 0];
// Fester Zufall, damit zwei Laeufe dasselbe Bild ergeben.
const rnd = (() => { let s = 42; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();

const heute = new Date(); heute.setHours(0, 0, 0, 0);
const ende = new Date(heute); while (ende.getDay() !== 5) ende.setDate(ende.getDate() - 1);   // letzter Freitag
const start = new Date(ende); start.setDate(start.getDate() - 7 * 18 + 4);                        // 18 Wochen davor, ein Montag
const urlaubStart = new Date(ende); urlaubStart.setDate(urlaubStart.getDate() - 7 * 5 - 4);        // eine Woche, fuenf Wochen zurueck
const urlaub = new Set([0, 1, 2, 3, 4].map((i) => { const d = new Date(urlaubStart); d.setDate(d.getDate() + i); return iso(d); }));
const krankTag = new Date(ende); krankTag.setDate(krankTag.getDate() - 7 * 11 - 1); const krank = iso(krankTag);
const projekte = ['Ticketsystem', 'Netzwerk', 'Backup-Konzept', 'Doku', 'Kundentermin', ''];

const entries = [];
let id = 1700000000000;
for (let d = new Date(start); d <= ende; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const date = iso(d);
    const expected = hours[dow];
    const base = { id: id++, date, isPeriod: false, jobId: 'primary', timestamp: id, mood: '', customFieldValues: {}, breakLog: [] };
    if (urlaub.has(date)) { entries.push({ ...base, type: 'vacation', worked: expected, expected, diff: 0, info: 'Urlaubstag', breakMins: 0, start: '', end: '' }); continue; }
    if (date === krank) { entries.push({ ...base, type: 'sick', worked: expected, expected, diff: 0, info: 'Krank', breakMins: 0, start: '', end: '' }); continue; }
    if (dow === 2) { entries.push({ ...base, type: 'school', worked: expected, expected, diff: 0, info: 'Berufsschule - Dienstag (Datenbanken, Wirtschaft)', breakMins: 0, start: '07:45', end: '14:30' }); continue; }
    const sh = 7, sm = 20 + Math.floor(rnd() * 50);
    const workedH = expected - 0.3 + rnd() * 0.7;   // um das Soll herum, Freitag hat 4,5 h
    const breakMins = 30;
    const endMin = sh * 60 + sm + Math.round(workedH * 60) + breakMins;
    const worked = Math.round(workedH * 100) / 100;
    const s = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
    const e = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    entries.push({ ...base, type: 'work', worked, expected, diff: Math.round((worked - expected) * 100) / 100, info: `${s} - ${e} (30m Pause)`, breakMins, shiftStart: s, shiftEnd: e, start: s, end: e, endIsRaw: true, project: projekte[Math.floor(rnd() * projekte.length)] });
}

const data = {
    entries, trash: [], customEntryTypes: [], customFields: [], workflowRules: [], untis: null,
    settings: {
        name: 'Anna', avatarInitials: 'AB', theme: '#a855f7', themeMode: 'dark',
        hours, break: { thresh: 6, min: [0, 30, 30, 30, 30, 30, 0] },
        vacation: { total: 30, used: 5, usedManual: 0, carriedOver: 2, mode: 'days', carryOverMax: null, lastRolloverYear: heute.getFullYear(), yearHistory: {} },
        ihk: { start: `${heute.getFullYear() - 2}-08-01`, end: `${heute.getFullYear() + 1}-07-31`, exam_zwischen: `${heute.getFullYear()}-03-12`, note_zwischen: '2', note_abschluss: '' },
        school: { years: {} }, goals: []
    }
};
const now = Date.now();
const backups = [3, 2, 1].map((n) => ({ ts: now - n * 86400000 * 2, data: { ...data, entries: entries.slice(0, entries.length - n * 3) } }));

// ── Berichtsheft: eine Woche je Kalenderwoche der Eintraege, Tagesmodus ──
// Aeltere Wochen sind unterschrieben, die letzten drei fertig, die juengste
// ein Entwurf — so zeigt die Wochen-Uebersicht alle Farben der Legende.
const TAGE = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TAGNAME = { monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag' };
const TEXTE = {
    betrieb: [
        'Tickets im Helpdesk bearbeitet: Druckerfreigabe, VPN-Zugang, Passwort-Rücksetzungen',
        'Neuen Arbeitsplatz-PC aufgesetzt (Image, Domänenbeitritt, Software-Paket)',
        'Patchfeld im Serverraum dokumentiert und Beschriftung erneuert',
        'Backup-Lauf geprüft und Fehlerprotokoll mit dem Ausbilder besprochen',
        'Switch-Konfiguration gesichert, VLAN für die Buchhaltung angelegt',
        'Kundentermin begleitet: Netzwerkdosen geprüft, Messprotokoll erstellt',
        'Monitoring-Alarme ausgewertet und zwei Schwellwerte angepasst',
        'Dokumentation der Wiederanlauf-Reihenfolge im Wiki ergänzt',
    ],
    schule: ['Datenbanken: Normalformen und Joins', 'Wirtschaft: Kaufvertrag und AGB', 'Englisch: technische Dokumentation', 'Netzwerktechnik: Subnetting'],
    unterweisung: ['Sicherheitsunterweisung Elektro', 'Umgang mit Kundendaten (DSGVO)', 'Ticket-Priorisierung nach SLA', ''],
};
const kw = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil((((t - y0) / 86400000) + 1) / 7); };
const wochen = new Map();
for (const e of entries) {
    const d = new Date(e.date + 'T00:00:00');
    const montag = new Date(d); montag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const key = iso(montag);
    if (!wochen.has(key)) wochen.set(key, { montag, tage: {} });
    wochen.get(key).tage[TAGE[(d.getDay() + 6) % 7]] = e;
}
const reports = [];
let wi = 0;
const wochenListe = [...wochen.values()].sort((a, b) => a.montag - b.montag);
for (const w of wochenListe) {
    const freitag = new Date(w.montag); freitag.setDate(freitag.getDate() + 4);
    const dailyActivities = {}, dailyHours = {}, dailySchool = {};
    let stunden = 0;
    for (const t of TAGE) {
        const e = w.tage[t];
        dailyActivities[t] = ''; dailyHours[t] = ''; dailySchool[t] = false;
        if (!e) continue;
        if (e.type === 'school') { dailySchool[t] = true; dailyActivities[t] = '• ' + TEXTE.schule[wi % 4] + '\n• ' + TEXTE.schule[(wi + 1) % 4]; }
        else if (e.type === 'vacation') { dailyActivities[t] = '• Urlaub'; }
        else if (e.type === 'sick') { dailyActivities[t] = '• Krank'; }
        else { const a = TEXTE.betrieb[(wi * 2 + TAGE.indexOf(t)) % 8], b = TEXTE.betrieb[(wi * 3 + TAGE.indexOf(t) + 5) % 8]; dailyActivities[t] = '• ' + a + '\n• ' + b; }
        dailyHours[t] = e.worked; stunden += e.worked;
    }
    const abstand = wochenListe.length - 1 - wi;   // 0 = juengste Woche
    const status = abstand === 0 ? 'incomplete' : abstand <= 3 ? 'complete' : 'signed';
    const von = iso(w.montag), bis = iso(freitag);
    reports.push({
        id: 'demo_' + von, year: w.montag >= new Date(heute.getFullYear(), 7, 1) ? 3 : 2, week: kw(w.montag),
        dateFrom: von, dateTo: bis, department: 'IT-Support', mode: 'daily',
        activities: TAGE.filter((t) => dailyActivities[t]).map((t) => `${TAGNAME[t] || t}:\n${dailyActivities[t]}`).join('\n\n'),
        dailyActivities, dailyHours, dailySchool,
        instruction: TEXTE.unterweisung[wi % 4], school: '', hours: Math.round(stunden * 100) / 100, status,
        createdAt: new Date(freitag).toISOString(), updatedAt: new Date(freitag).toISOString(),
    });
    wi++;
}

const seed = {
    tg_pro_data: data, tg_pro_data_backups: backups,
    berichtsheft_reports: reports,
    pdf_personal_cfg: { name: 'Anna Beispiel', beruf: 'Fachinformatikerin für Systemintegration', betrieb: 'Musterwerk GmbH', beginn: `01.08.${heute.getFullYear() - 2}`, ende: `31.07.${heute.getFullYear() + 1}`, ausbilder: 'M. Weber' },
    ais_cloud_v2_announcement_dismissed: '1',
    pro_intro_seen: 'true', privacy_acknowledged: '1',
    mwl_last_export: new Date(now - 86400000).toISOString(), mwl_last_backup_kind: 'full',
    mwl_setup_hint_dismissed: '1', mwl_lang_promo_dismissed: '1', tg_school_dismissed: '1',
    mwl_umfrage_id: 'demo', mwl_umfrage_dismissed: '1',
    mwl_last_streak_notification_date: iso(heute), mwl_last_streak_notification_value: '90',
};
writeFileSync(SEED, JSON.stringify(seed));
console.log(`Seed: ${entries.length} Eintraege (${iso(start)} – ${iso(ende)}), Saldo ${entries.reduce((a, x) => a + x.diff, 0).toFixed(2)} h, ${reports.length} Berichtsheft-Wochen`);
if (process.argv.includes('--nur-seed')) process.exit(0);

// ── Aufnahmen ────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const CLEAN = "var b=document.getElementById('localhostWarningBanner');if(b)b.remove();document.querySelectorAll('.toast,.smart-notification').forEach(e=>e.remove());";
const shots = [
    ['dashboard.webp', ['--w', '1440', '--h', '900'], `(function(){${CLEAN}return 'ok'})()`],
    ['recovery.webp', ['--w', '1440', '--h', '900'], `(function(){${CLEAN}openRecoveryModal();return new Promise(r=>setTimeout(()=>r('modal='+document.getElementById('recoveryModal').classList.contains('active')),600))})()`],
    ['handy.webp', ['--w', '390', '--h', '844'], `(function(){${CLEAN}return 'ok'})()`],
    // Berichtsheft: Kopf abgeschnitten (Statistik, Wochen-Uebersicht, Liste), der
    // B2B-Teaser raus — er ist fuer Nicht-Mitglieder ein Hinweis, kein Inhalt.
    ['berichtsheft.webp', ['--w', '1440', '--h', '900'], `(function(){return new Promise(r=>setTimeout(function(){var c=document.getElementById('b2bCard');if(c)c.remove();window.scrollTo(0,215);setTimeout(function(){r('ok')},400)},600))})()`, 'http://localhost:5001/berichtsheft/'],
];
let fehler = 0;
for (const [datei, masse, js, url] of shots) {
    const r = spawnSync(process.execPath, [join(HERE, 'screenshot.mjs'), url || URL_APP, join(OUT, datei), ...masse, '--dpr', '2', '--quality', '88', '--seed', SEED, '--wait', '3500', '--js', js], { cwd: ROOT, encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr);
    if (r.status !== 0) fehler++;
}
console.log(fehler ? `${fehler} Aufnahme(n) fehlgeschlagen` : 'Vier Aufnahmen unter Grafiken/about/ — danach bumpen, damit die ?v= wechseln.');
process.exit(fehler ? 1 : 0);
