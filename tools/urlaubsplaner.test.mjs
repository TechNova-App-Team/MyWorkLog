#!/usr/bin/env node
// ═══ TEST: Urlaubsplaner (Resturlaub-Budget & Überstunden-Kategorie) ═══
//
// Prueft:
// 1. Markup & CSS:
//    - Überstunden-Stat-Karte (#upStatOvertime) in up-stats vorhanden
//    - Überstunden-Legende (.up-legend__sw--overtime) in up-legend vorhanden
//    - CSS-Regeln fuer --up-overtime, .up-legend__sw--overtime und .up-d--overtime vorhanden
// 2. Budget-Logik (upBudget):
//    - Resturlaub / Vorjahresuebertrag (carriedOver) wird in totalBudget und remaining eingerechnet
//    - Ueberstunden-Saldo (overtimeHours) wird korrekt summiert
// 3. Typ-Erkennung & Tagesraster (upIsOvertimeEntry, upEntryMaps, upBuildDays):
//    - Gleittag / Ueberstundenabbau wird als overtime erkannt und vom Urlaub getrennt
//    - Overtime-Tage werden als free: true gewertet
//
// Aufruf: node tools/urlaubsplaner.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fehler = 0;
const ok = (b, txt) => { console.log(`  ${b ? 'OK  ' : 'FAIL'}   ${txt}`); if (!b) fehler++; };
const lies = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

console.log('\n── Markup & CSS ───────────────────────────────────────────────');
const planHtml = lies('components/urlaubsplaner/urlaubsplaner.html');
const planCss = lies('components/urlaubsplaner/urlaubsplaner.css');
const doc = new JSDOM(planHtml).window.document;

const otStat = doc.getElementById('upStatOvertime');
ok(!!otStat, '#upStatOvertime in urlaubsplaner.html vorhanden');

const otLegend = doc.querySelector('.up-legend__sw--overtime');
ok(!!otLegend, '.up-legend__sw--overtime in urlaubsplaner.html vorhanden');

ok(planCss.includes('--up-overtime:'), '--up-overtime in urlaubsplaner.css definiert');
ok(planCss.includes('.up-legend__sw--overtime'), '.up-legend__sw--overtime in urlaubsplaner.css gestylt');
ok(planCss.includes('.up-d--overtime'), '.up-d--overtime in urlaubsplaner.css gestylt');

console.log('\n── Urlaubsplaner-Logik (upBudget & Resturlaub) ──────────────────');
const planJs = lies('components/urlaubsplaner/urlaubsplaner.js');

// Test-Sandbox initialisieren
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const win = dom.window;
global.window = win;
global.document = win.document;
global.data = {
    settings: {
        vacation: {
            total: 240,
            carriedOver: 35.8,
            used: 176.8,
            mode: 'hours'
        },
        hours: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8 }
    },
    entries: [
        { id: 1, date: '2026-02-10', diff: 2.5, worked: 8, expected: 8, type: 'work' },
        { id: 2, date: '2026-02-11', diff: -1.0, worked: 7, expected: 8, type: 'work' },
        { id: 3, date: '2026-02-12', diff: 22.5, worked: 8, expected: 8, type: 'work' },
        { id: 4, date: '2026-03-01', diff: -8.0, worked: 0, expected: 8, type: 'gleittag', info: 'Gleittag (Überstundenabbau)' },
        { id: 5, date: '2026-04-01', diff: 0, worked: 8, expected: 8, type: 'vacation', info: 'Urlaub' }
    ]
};

// Modul-Code im Kontext ausfuehren
const fn = new Function('data', 'document', planJs + `
    return {
        upBudget: upBudget,
        upIsOvertimeEntry: upIsOvertimeEntry,
        upIsVacationEntry: upIsVacationEntry,
        upEntryMaps: upEntryMaps,
        upBuildDays: upBuildDays
    };
`);
const mod = fn(global.data, global.document);

const currentYear = new Date().getFullYear();
const budget = mod.upBudget(currentYear);

ok(budget.carriedOver === 35.8, 'carriedOver wird erkannt: ' + budget.carriedOver);
ok(budget.totalBudget === 275.8, 'totalBudget inkl. Resturlaub = 275.8 (240 + 35.8): ' + budget.totalBudget);
ok(Math.abs(budget.remaining - 99.0) < 1e-6, 'remaining = 99.0 Stunden (275.8 - 176.8): ' + budget.remaining);
ok(budget.remainingDays === 12, 'remainingDays = 12 Tage (99h / 8h): ' + budget.remainingDays);
ok(budget.overtimeHours === 16.0, 'overtimeHours summiert Saldo-Diffs (2.5 - 1.0 + 22.5 - 8.0 = 16.0): ' + budget.overtimeHours);

console.log('\n── Überstunden-Erkennung & Tagesraster ─────────────────────────');
ok(mod.upIsOvertimeEntry({ type: 'gleittag' }), 'gleittag als Überstunden erkannt');
ok(mod.upIsOvertimeEntry({ type: 'overtime' }), 'overtime als Überstunden erkannt');
ok(mod.upIsOvertimeEntry({ type: 'work', info: 'Gleittag (Überstundenabbau)' }), 'info mit Überstundenabbau als Überstunden erkannt');
ok(!mod.upIsOvertimeEntry({ type: 'vacation' }), 'vacation ist NICHT Überstunden');

ok(mod.upIsVacationEntry({ type: 'vacation' }), 'vacation als Urlaub erkannt');
ok(!mod.upIsVacationEntry({ type: 'gleittag' }), 'gleittag ist NICHT Urlaub');

const entryMaps = mod.upEntryMaps();
ok(entryMaps.vacation['2026-04-01'] === true, 'Urlaubstag 2026-04-01 in entryMaps.vacation');
ok(entryMaps.overtime['2026-03-01'] === true, 'Gleittag 2026-03-01 in entryMaps.overtime');
ok(!entryMaps.vacation['2026-03-01'], 'Gleittag ist nicht in entryMaps.vacation');

const days = mod.upBuildDays(2026, {}, entryMaps);
const dayOt = days.find(d => d.key === '2026-03-01');
const dayVac = days.find(d => d.key === '2026-04-01');

ok(dayOt && dayOt.overtime === true, 'Tag 2026-03-01 hat overtime: true');
ok(dayOt && dayOt.free === true, 'Tag 2026-03-01 hat free: true (spart Urlaubstag)');
ok(dayVac && dayVac.booked === true, 'Tag 2026-04-01 hat booked: true');
ok(dayVac && dayVac.free === true, 'Tag 2026-04-01 hat free: true');

console.log('\n── String-Diff Parsing & Pro-Rata-Konsistenz mit Dashboard ───────');
// Simuliere global vorhandenes calculateProRataVacation (z.B. aus vacation-holidays.js)
// und String-Diffs in den Einträgen (z.B. nach JSON-Import).
global.calculateProRataVacation = () => 180.0; // Prorated dummy value
const testDataWithStrings = {
    settings: {
        vacation: { total: '249.4', carriedOver: '0', used: '149.5', mode: 'hours' },
        hours: { 1: 7.9, 2: 7.9, 3: 7.9, 4: 7.9, 5: 7.9 }
    },
    entries: [
        { id: 10, date: '2026-01-10', diff: '24.27', type: 'work' },
        { id: 11, date: '2026-01-11', diff: 0, type: 'work' }
    ]
};
const mod2 = fn(testDataWithStrings, global.document);
const b2 = mod2.upBudget(currentYear);

ok(b2.totalBudget === 249.4, 'totalBudget wird NICHT durch calculateProRataVacation verkleinert (Dashboard-Konsistenz: 249.4h)');
ok(Math.abs(b2.remaining - 99.9) < 1e-4, 'remaining entspricht Dashboard (99.9h): ' + b2.remaining);
ok(b2.overtimeHours === 24.27, 'overtimeHours parst String-Diffs korrekt ("24.27" -> 24.27): ' + b2.overtimeHours);

console.log('\n' + (fehler === 0 ? `✓ Alle Tests bestanden (${fehler} Fehler)` : `✗ ${fehler} Fehler aufgetreten`));
process.exit(fehler === 0 ? 0 : 1);
