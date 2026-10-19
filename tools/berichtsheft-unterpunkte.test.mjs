// Prueft die Gliederung in Ober- und Unterpunkte (v8.6.3, Wunsch des Nutzers:
// "wie im IHK-Portal", z. B. "ELO betreut" mit "Rechnungen erfasst" darunter).
//
//   node tools/berichtsheft-unterpunkte.test.mjs
//
// Festgehalten wird:
//  - entries bleiben ein flaches String-Array; ein Unterpunkt ist ein Eintrag mit
//    "- " davor (der Worker verwirft alles, was kein String ist).
//  - Setzt das Modell vor JEDEN Eintrag einen Spiegelstrich, ist das eine flache
//    Liste, keine Gliederung — sonst haengt alles unter dem ersten Eintrag.
//  - Der Chat hat bis v8.6.2 jeden Spiegelstrich weggeschnitten; damit kam keine
//    Gliederung je an. Beide Wege (Studio und Chat) werden hier echt gefahren.
import { readFileSync } from 'node:fs';
import { runInContext } from 'node:vm';
import { ladeEngine, pruefrahmen } from './berichtsheft-laden.mjs';

const t = pruefrahmen();

let fetchAntwort = null;
const E = ladeEngine({
    fetchImpl: async () => ({
        ok: true, status: 200, headers: { get: () => null },
        json: async () => fetchAntwort,
        text: async () => JSON.stringify(fetchAntwort),
    }),
});
const S = E.sandbox;
runInContext(readFileSync(new URL('../Assets/js/berichtsheft/ais-chat.js', import.meta.url), 'utf8'), S, { filename: 'ais-chat.js' });
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── 1. bhGliederung ────────────────────────────────────────────────────────
t.gruppe('Gliederung normalisieren');
const ELO = ['Dokumentenmanagement in ELO betreut', '- Eingangsrechnungen erfasst', '– Lieferscheine zugeordnet', 'Ablage geprüft'];
let g = S.bhGliederung(ELO);
t.ok(gleich(g, ['Dokumentenmanagement in ELO betreut', '- Eingangsrechnungen erfasst', '- Lieferscheine zugeordnet', 'Ablage geprüft']),
    'Oberpunkt bleibt, "- " und "– " werden zu "- "', JSON.stringify(g));
g = S.bhGliederung(['- A erledigt', '- B erledigt', '- C erledigt']);
t.ok(gleich(g, ['A erledigt', 'B erledigt', 'C erledigt']), 'nur Spiegelstriche = flache Liste, Marker fallen weg', JSON.stringify(g));
g = S.bhGliederung(['- Waise erledigt', 'Oberpunkt', '- Kind']);
t.ok(gleich(g, ['Waise erledigt', 'Oberpunkt', '- Kind']), 'Unterpunkt ohne Oberpunkt darueber wird normaler Eintrag', JSON.stringify(g));
t.ok(gleich(S.bhGliederung(['Bindestrich-Wort geprüft', 'E-Mail beantwortet']), ['Bindestrich-Wort geprüft', 'E-Mail beantwortet']),
    'Bindestrich IM Wort ist kein Marker');
t.ok(S.bhEntriesAlsText(['Ober', '- Kind', 'Solo']) === 'Ober\n   - Kind\nSolo', 'Tagesfeld: Unterpunkt eingerueckt');

// ── 2. Prompt ──────────────────────────────────────────────────────────────
t.gruppe('Prompt');
const F = E.CLOUD.CLOUD_FORM;
const stil = F.stichpunkte.stil.join('\n');
t.ok(stil.includes('GLIEDERUNG') && stil.includes('"- "'), 'Stichpunkte erklaeren die Gliederung mit "- "');
const bsp = JSON.parse(F.stichpunkte.beispiel);
t.ok(bsp.some(e => S.bhIstUnterpunkt(e)) && bsp.some(e => !S.bhIstUnterpunkt(e)),
    'Beispiel zeigt Ober- UND Unterpunkte (das Beispiel wiegt schwerer als die Regel)');
t.ok(gleich(S.bhGliederung(bsp), bsp), 'Beispiel ist schon in Normalform');
t.ok(!F.fliesstext.stil.join('\n').includes('GLIEDERUNG'), 'Fliesstext bekommt keine Gliederung');

// ── 3. Studio: generateWithCloud ───────────────────────────────────────────
t.gruppe('Studio (Cloud-Antwort)');
const TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
fetchAntwort = { candidates: [{ content: { parts: [{ text: JSON.stringify(TAGE.map(day => ({
    day, entries: [...ELO], hours: 8, isSchoolDay: false, schoolTopic: null,
}))) }] } }] };
const opt = { yearNum: 2, umfang: 'mittel', form: 'stichpunkte', selectedDays: [0, 1, 2, 3, 4], schoolDayIndices: [],
    department: '', calendarWeek: 35, customPrompt: '', dayStatus: {} };
let woche = await E.CLOUD.generateWithCloud('sysadmin', { ...opt });
const mo = woche.days.find(d => d.index === 0);
t.ok(mo && mo.entries.filter(e => S.bhIstUnterpunkt(e)).length === 2, 'Unterpunkte kommen in der Woche an', JSON.stringify(mo && mo.entries));
woche = await E.CLOUD.generateWithCloud('sysadmin', { ...opt, form: 'fliesstext' });
const moF = woche.days.find(d => d.index === 0);
t.ok(moF && moF.entries.length === 1 && !/(^|\s)- /.test(moF.entries[0]), 'Fliesstext: ein Absatz ohne Spiegelstriche', JSON.stringify(moF && moF.entries));

// ── 4. Chat: entwurfZusammenfuehren ────────────────────────────────────────
t.gruppe('Chat (Entwurf)');
const I = S.AISChat._intern;
const z = I.entwurfZusammenfuehren(I.leererEntwurf(), [{ day: 'Montag', entries: ['* Ober', ...ELO.slice(1, 3)] }], 'stichpunkte');
t.ok(gleich(z.entwurf.tage[0].entries, ['Ober', '- Eingangsrechnungen erfasst', '- Lieferscheine zugeordnet']),
    'Chat behaelt Unterpunkte, "*" faellt weg', JSON.stringify(z.entwurf.tage[0].entries));
const zF = I.entwurfZusammenfuehren(I.leererEntwurf(), [{ day: 'Montag', entries: ELO }], 'fliesstext');
t.ok(zF.entwurf.tage[0].entries.length === 1 && !zF.entwurf.tage[0].entries[0].includes('- '), 'Chat-Fliesstext ohne Spiegelstriche');

t.abschluss('Unterpunkte');
