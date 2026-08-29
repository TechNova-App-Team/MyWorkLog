/* ═══ SKILL-BAUM — Abnahme ═══════════════════════════════════════════
 *
 *   node tools/skill-tree.test.mjs
 *
 * Die Seite hat sich mit v6.4.7 vom Anzeigebrett zur Lernstrecke geaendert.
 * Geprueft werden die Zusagen, die dabei gemacht wurden — vor allem die,
 * die man im Screenshot NICHT sieht:
 *
 *  1. XP laesst sich nicht mehr selbst vergeben. Es gibt keinen Weg im
 *     Code, der ohne richtige Antwort oder Berichtsheft-Beleg XP schreibt.
 *  2. Der Katalog steht genau EINMAL — im Markup. Namen, Farben und
 *     Symbole werden daraus gelesen, nicht im Skript zweitgefuehrt.
 *  3. Jede Karte hat Fragen, jede Frage hat eine Karte, jede Frage hat
 *     vier verschiedene Antworten, einen gueltigen Index und eine
 *     Erklaerung — in BEIDEN Sprachen.
 *  4. Der Abstand waechst nur bei richtigen Antworten und faellt bei
 *     falschen auf heute zurueck. reps (Freischaltung) faellt dabei NICHT,
 *     sonst wuerde ein Fehler eine offene Stufe wieder zusperren.
 *  5. Stufe 2 oeffnet erst, wenn Stufe 1 sitzt.
 *  6. Wiederholung bringt weniger XP als der erste Treffer, falsch bringt
 *     null — sonst waere XP wieder eine Klickzahl.
 *  7. Die Berichtsheft-Auswertung ist gedeckelt: ein Stichwort war frueher
 *     bis zu 50 XP wert, mehr als die schwerste Frage im Baum.
 *  8. Datumsrechnung lokal, nicht ueber toISOString — das rechnet nach UTC
 *     und verschiebt in Mitteleuropa jedes Datum um einen Tag.
 *  9. Die sichtbaren Beispielfragen und die JSON-LD-Auszeichnung sagen
 *     dasselbe. Google verlangt das, und auseinanderlaufen wuerde es
 *     lautlos.
 * 10. Statischer Text ist vorhanden — eine Seite, deren Inhalt erst JS
 *     erzeugt, hat fuer einen Crawler keinen.
 *
 * 🔴 Falle aus CLAUDE.md: ein Test, der die Quelle nach dem greppt, was
 * ENTFERNT wurde, prueft sonst die Kommentare — die Dateikoepfe hier
 * NENNEN die alte Selbstvergabe. Vor jeder Negativ-Behauptung deshalb
 * beide Kommentarsorten strippen.
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const HTML = readFileSync(new URL('../pages/skill-tree/index.html', import.meta.url), 'utf8');
const DATA = readFileSync(new URL('../Assets/js/skill-tree-data.js', import.meta.url), 'utf8');

const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const noHtmlComments = s => s.replace(/<!--[\s\S]*?-->/g, '');

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.error('  ✗ ' + msg); } };
const section = t => console.log('\n' + t);

/* ── Umgebung: Seite laden, Fragen bereitstellen, Skript ausfuehren ── */
const dom = new JSDOM(HTML, { url: 'https://myworklog.de/skill-tree/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
const store = {};
Object.defineProperty(window, 'localStorage', { value: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
} });
window.eval(DATA);

/* Nur das Hauptskript — die Nachbarn (Theme, Beacon, Footer) brauchen Netz. */
const inline = [...HTML.matchAll(/<script(?![^>]*(?:src=|ld\+json))[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const main = inline.find(s => s.includes('function captureCatalog'));
if (!main) { console.error('Hauptskript nicht gefunden'); process.exit(1); }
window.eval(main);

section('1 · Selbstvergabe ist wirklich weg');
{
    const js = noComments(main), html = noHtmlComments(HTML);
    ok(!/function\s+submitManualXp/.test(js), 'submitManualXp existiert noch');
    ok(!/function\s+openManualAdd/.test(js), 'openManualAdd existiert noch');
    ok(!/id="manual/.test(html), 'Markup traegt noch ein Manual-Feld');
    // Der einzige Schreibweg auf XP ist addXp — und der wird nur aus der
    // Antwortpruefung und aus der Berichtsheft-Auswertung gerufen.
    const callers = [...js.matchAll(/^[^\n]*\baddXp\(/gm)].map(m => m[0].trim())
        .filter(l => !l.startsWith('function addXp'));
    ok(callers.length === 2, `addXp hat ${callers.length} Aufrufer, erwartet 2 (Antwort, Auswertung)`);
}

section('2 · Katalog steht nur im Markup');
{
    window.captureCatalog();
    const branches = window.BRANCHES;
    ok(branches.length === 6, `${branches.length} Gebiete gelesen, erwartet 6`);
    ok(Object.keys(window.SKILL_INDEX).length === 30, 'nicht 30 Themen im Index');
    ok(branches.every(b => b.name && b.color && b.icon), 'ein Gebiet ohne Name, Farbe oder Symbol');
    ok(branches.every(b => b.skills.length === 5), 'ein Gebiet hat nicht 5 Themen');
    // Kein zweites Namensregister im Skript
    const js = noComments(main);
    ok(!/SKILL_BRANCHES\s*=/.test(js), 'Skript fuehrt wieder eine eigene Gebietsliste');
    ok(!/ICON_PATHS\s*=\s*\{[\s\S]{400,}/.test(js), 'Skript fuehrt wieder eine grosse Symbol-Tabelle');
}

section('3 · Fragenbank ist vollstaendig und in beiden Sprachen');
{
    const Q = window.SKILL_QUIZ;
    const cardIds = [...HTML.matchAll(/data-skill="([a-z_]+)"/g)].map(m => m[1]);
    ok(cardIds.length === 30, `${cardIds.length} Karten, erwartet 30`);
    ok(cardIds.every(id => Q[id] && Q[id].length), 'eine Karte ohne Fragen');
    ok(Object.keys(Q).every(id => cardIds.includes(id)), 'Fragen zu einem Thema ohne Karte');
    let n = 0, bad = [];
    for (const id of Object.keys(Q)) for (const [i, q] of Q[id].entries()) {
        n++;
        for (const lang of ['de', 'en']) {
            const l = q[lang];
            if (!l) { bad.push(`${id}#${i} ohne ${lang}`); continue; }
            if (!l.q || !l.e) bad.push(`${id}#${i} ${lang}: Frage oder Erklaerung fehlt`);
            if (!Array.isArray(l.o) || l.o.length !== 4) bad.push(`${id}#${i} ${lang}: nicht 4 Antworten`);
            else if (new Set(l.o).size !== 4) bad.push(`${id}#${i} ${lang}: doppelte Antwort`);
        }
        if (!(q.c >= 0 && q.c <= 3)) bad.push(`${id}#${i}: Antwortindex ${q.c}`);
        if (![1, 2, 3].includes(q.t)) bad.push(`${id}#${i}: Stufe ${q.t}`);
        // Der Index zeigt in BEIDEN Sprachen auf dieselbe Aussage — das
        // laesst sich nicht automatisch pruefen, wohl aber, dass beide
        // Listen gleich lang sind (oben) und der Index in beide passt.
    }
    ok(n === 150, `${n} Fragen, erwartet 150`);
    ok(bad.length === 0, 'Fragen fehlerhaft:\n      ' + bad.slice(0, 8).join('\n      '));
    const tiers = { 1: 0, 2: 0, 3: 0 };
    for (const id of Object.keys(Q)) for (const q of Q[id]) tiers[q.t]++;
    ok(tiers[1] === 60 && tiers[2] === 60 && tiers[3] === 30, `Stufenverteilung ${JSON.stringify(tiers)}`);
}

section('4 · Abstand waechst nur bei richtigen Antworten');
{
    const { schedule, today } = window;
    let s = schedule(null, true);
    ok(s.iv === 1 && s.reps === 1 && s.st === 1, 'erste richtige Antwort ergibt nicht +1 Tag');
    s = schedule(s, true); ok(s.iv === 3, 'zweite richtige Antwort ergibt nicht +3 Tage');
    s = schedule(s, true); ok(s.iv === 7, 'dritte richtige Antwort ergibt nicht +7 Tage');
    const before = s.iv;
    s = schedule(s, true); ok(s.iv > before, 'vierte richtige Antwort verlaengert den Abstand nicht');
    const reps = s.reps;
    s = schedule(s, false);
    ok(s.iv === 0 && s.due === today(), 'falsche Antwort setzt nicht auf heute zurueck');
    ok(s.st === 0, 'falsche Antwort setzt die Serie nicht zurueck');
    ok(s.reps === reps, '🔴 falsche Antwort senkt reps — damit wuerde eine offene Stufe wieder zusperren');
    // Der Abstand ist gedeckelt, sonst rutscht eine Frage ins Jahr 2400
    let long = { iv: 170, ea: 2.8, reps: 9, st: 9, lapses: 0, due: today() };
    for (let i = 0; i < 5; i++) long = schedule(long, true);
    ok(long.iv <= 180, `Abstand laeuft auf ${long.iv} Tage davon`);
    ok(s.ea >= 1.5, 'Leichtigkeitsfaktor faellt unter 1,5');
}

section('5 · Stufen schalten sich der Reihe nach frei');
{
    const d = window.loadData();
    ok(window.tierUnlocked(d, 'docker', 1), 'Stufe 1 ist nicht offen');
    ok(!window.tierUnlocked(d, 'docker', 2), 'Stufe 2 ist ohne Vorleistung offen');
    // Beide Grundlagenfragen richtig → Stufe 2 auf
    window.SKILL_QUIZ.docker.forEach((q, i) => {
        if (q.t === 1) d.srs[window.srsKey('docker', i)] = window.schedule(null, true);
    });
    ok(window.tierUnlocked(d, 'docker', 2), 'Stufe 2 oeffnet nicht, obwohl Stufe 1 sitzt');
    ok(!window.tierUnlocked(d, 'docker', 3), 'Stufe 3 ist zu frueh offen');
    ok(window.maxTier(d, 'docker') === 2, 'maxTier meldet die falsche Stufe');
    // Eine Runde bietet nie eine gesperrte Frage an
    const q = window.buildQueue(d, 'docker');
    ok(q.every(it => window.SKILL_QUIZ.docker[it.i].t <= 2), '🔴 Runde enthaelt eine gesperrte Frage');
    ok(q.length > 0, 'Runde fuer ein einzelnes Thema ist leer');
}

section('6 · XP nur fuer richtige Antworten, Wiederholung zaehlt weniger');
{
    const X = window.TIER_XP;
    ok(X[1] < X[2] && X[2] < X[3], 'schwerere Stufen bringen nicht mehr XP');
    ok(Math.round(X[3] * 0.5) < X[3], 'Wiederholung bringt genauso viel wie der erste Treffer');
    // Der Code vergibt nur im correct-Zweig
    const body = noComments(main).match(/function confirmAnswer\(\)[\s\S]*?\n\}/)[0];
    const gainLine = body.match(/gain\s*=\s*wasNew[^\n;]*/);
    ok(!!gainLine, 'XP-Berechnung in confirmAnswer nicht gefunden');
    ok(/if \(correct\) \{[\s\S]*?gain =/.test(body), 'XP wird nicht im correct-Zweig vergeben');
    ok(/if \(!item\.retry\)/.test(body), 'ein Wiederholungsversuch koennte XP schreiben');
}

section('7 · Berichtsheft-Auswertung ist gedeckelt');
{
    ok(window.SCAN_SCALE < 1, 'Auswertung ist nicht gedaempft');
    ok(window.SCAN_CAP <= window.TIER_XP[3], `Deckel ${window.SCAN_CAP} liegt ueber der schwersten Frage (${window.TIER_XP[3]})`);
    const hits = window.scanText('Heute Docker-Container gebaut, Kubernetes-Cluster geprueft und Backup wiederhergestellt.');
    ok(Object.keys(hits).length > 0, 'Auswertung erkennt gar nichts');
    ok(Object.values(hits).every(v => v <= window.SCAN_CAP), 'ein Treffer sprengt den Deckel');
    // Kein Stichwort zeigt auf ein Thema, das es nicht gibt
    const unknown = new Set();
    for (const kw of Object.keys(window.KEYWORD_MAP))
        for (const sid of Object.keys(window.KEYWORD_MAP[kw]))
            if (!window.SKILL_INDEX[sid]) unknown.add(sid);
    ok(unknown.size === 0, 'Stichwortliste zeigt auf unbekannte Themen: ' + [...unknown]);
}

section('8 · Datumsrechnung bleibt lokal');
{
    ok(!/toISOString/.test(noComments(main)), '🔴 toISOString im Skript — das rechnet nach UTC und verschiebt Tage');
    const t = window.today();
    ok(/^\d{4}-\d{2}-\d{2}$/.test(t), 'today() liefert kein ISO-Datum');
    ok(window.daysBetween(t, window.dayPlus(7)) === 7, 'daysBetween rechnet falsch');
    ok(window.daysBetween(window.dayPlus(-1), t) === 1, 'daysBetween rechnet rueckwaerts falsch');
    // Jahreswechsel — hier faellt eine naive Rechnung auf
    ok(window.daysBetween('2025-12-31', '2026-01-01') === 1, 'Jahreswechsel falsch gerechnet');
    ok(window.daysBetween('2024-02-28', '2024-03-01') === 2, 'Schaltjahr falsch gerechnet');
}

section('9 · Beispielfragen und Auszeichnung sagen dasselbe');
{
    const doc = dom.window.document;
    const visible = [...doc.querySelectorAll('#beispielfragen .sample')].map(el => ({
        q: el.querySelector('h3').textContent.trim(),
        right: el.querySelector('li.right').textContent.trim(),
        opts: [...el.querySelectorAll('ol li')].map(li => li.textContent.trim())
    }));
    ok(visible.length === 6, `${visible.length} Beispielfragen sichtbar, erwartet 6`);
    const ldBlocks = [...HTML.matchAll(/<script type="application\/ld\+json" data-ld-id="([a-z]+)">([\s\S]*?)<\/script>/g)];
    const ldOf = id => JSON.parse(ldBlocks.find(m => m[1] === id)[2]);
    const quiz = ldOf('quiz');
    ok(quiz.hasPart.length === visible.length, 'Auszeichnung und Sichtbares zaehlen verschieden');
    visible.forEach((v, i) => {
        const p = quiz.hasPart[i];
        ok(p && p.name === v.q, `Frage ${i + 1}: Auszeichnung und Ueberschrift weichen ab`);
        ok(p && p.acceptedAnswer.text === v.right, `Frage ${i + 1}: markierte Antwort weicht ab`);
        const all = [p.acceptedAnswer.text, ...p.suggestedAnswer.map(a => a.text)].sort();
        ok(JSON.stringify(all) === JSON.stringify([...v.opts].sort()), `Frage ${i + 1}: Antwortliste weicht ab`);
    });
    // Und beide gegen die echte Fragenbank
    const bank = new Map();
    for (const id of Object.keys(window.SKILL_QUIZ)) for (const q of window.SKILL_QUIZ[id]) bank.set(q.de.q, q);
    visible.forEach((v, i) => {
        const q = bank.get(v.q);
        ok(!!q, `Beispielfrage ${i + 1} steht so nicht in der Fragenbank`);
        if (q) ok(q.de.o[q.c] === v.right, `Beispielfrage ${i + 1}: andere Loesung als in der Fragenbank`);
    });
    const faq = ldOf('faq');
    const faqVisible = [...doc.querySelectorAll('#faq details summary')].map(s => s.textContent.trim());
    ok(faq.mainEntity.length === faqVisible.length, 'FAQ-Auszeichnung und sichtbare Fragen zaehlen verschieden');
    ok(faq.mainEntity.every((e, i) => e.name === faqVisible[i] || faqVisible.includes(e.name)),
       'eine ausgezeichnete FAQ-Frage steht nicht sichtbar auf der Seite');
}

section('10 · Die Seite hat Inhalt ohne JavaScript');
{
    const doc = dom.window.document;
    const text = doc.body.textContent.replace(/\s+/g, ' ').trim();
    const words = text.split(' ').length;
    ok(words > 900, `nur ${words} Woerter statisch im Markup — zu wenig fuer eine Inhaltsseite`);
    ok(doc.querySelectorAll('h1').length === 1, 'nicht genau eine H1');
    ok(doc.querySelectorAll('h2').length >= 10, 'zu wenige H2 — die Gliederung fehlt');
    ok([...doc.querySelectorAll('.sc-desc')].length === 30, 'nicht jede Karte hat eine Beschreibung');
    ok([...doc.querySelectorAll('.sc-desc')].every(e => e.textContent.trim().length > 60), 'eine Kartenbeschreibung ist zu kurz');
    ok(doc.querySelector('link[rel="canonical"]').href === 'https://myworklog.de/skill-tree/', 'Canonical falsch');
    ok(doc.querySelectorAll('link[rel="canonical"]').length === 1, 'mehr als ein Canonical — Google verwirft dann beide');
    ok(!!doc.querySelector('meta[property="og:title"]'), 'kein Open-Graph-Titel');
    const desc = doc.querySelector('meta[name="description"]').content;
    ok(desc.length > 80 && desc.length < 200, `Meta-Beschreibung ${desc.length} Zeichen — sinnvoll sind 80 bis 200`);
    // Interne Verweise
    const links = [...doc.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href'));
    ok(links.length >= 5, 'zu wenige interne Verweise');
    ok(links.every(h => h.startsWith('/')), 'relativer Pfad gefunden — bricht bei Cloudflare-Rewrites');
}

section('11 · Eine ganze Runde laeuft durch');
{
    // Frischer Speicher, dann zehn Fragen richtig beantworten und pruefen,
    // dass XP, Abstand und Level mitwandern.
    for (const k in store) delete store[k];
    const d0 = window.loadData();
    const queue = window.buildQueue(d0, null);
    ok(queue.length === 10, `Runde hat ${queue.length} Fragen, erwartet 10`);
    ok(new Set(queue.map(q => q.skill)).size >= 5, 'Runde verteilt sich nicht ueber die Themen');
    ok(queue.every(q => q.fresh), 'erste Runde enthaelt eine Wiederholung');

    let d = window.loadData(), xp = 0;
    for (const it of queue) {
        const q = window.SKILL_QUIZ[it.skill][it.i];
        d.srs[window.srsKey(it.skill, it.i)] = window.schedule(null, true);
        window.addXp(d, it.skill, window.TIER_XP[q.t], q.de.q.slice(0, 90), window.today());
        xp += window.TIER_XP[q.t];
    }
    window.saveData(d);
    const back = window.loadData();
    let sum = 0; for (const k in back.skills) sum += back.skills[k].xp;
    ok(sum === xp, `XP nach Neuladen ${sum}, erwartet ${xp}`);
    ok(window.answeredTotal(back) === 10, 'beantwortete Fragen werden nicht mitgezaehlt');
    ok(window.dueList(back).length === 0, 'gerade beantwortete Fragen sind sofort wieder faellig');
    ok(window.levelFromXp(sum).level >= 2, `Level bleibt bei ${window.levelFromXp(sum).level} trotz ${sum} XP`);
    // Serie
    window.bumpStreak(back);
    ok(back.streak.days === 1, 'Serie startet nicht bei 1');
    back.streak.last = window.dayPlus(-1);
    window.bumpStreak(back);
    ok(back.streak.days === 2, 'Serie zaehlt am Folgetag nicht hoch');
    back.streak.last = window.dayPlus(-3);
    window.bumpStreak(back);
    ok(back.streak.days === 1, 'Serie setzt nach einer Luecke nicht zurueck');
}

section('12 · Altbestand aus der alten Fassung ueberlebt');
{
    // Wer die Seite vor v6.4.7 benutzt hat, hat XP ohne srs/streak liegen.
    for (const k in store) delete store[k];
    store['mwl_skill_tree'] = JSON.stringify({ skills: { docker: { xp: 240, history: [{ xp: 30, source: 'alt', date: '2026-01-05' }] } }, history: [], lastScan: null });
    const d = window.loadData();
    ok(d.skills.docker.xp === 240, 'alter XP-Stand ist verloren');
    ok(typeof d.srs === 'object' && d.srs !== null, 'srs fehlt nach der Uebernahme');
    ok(d.streak && d.streak.days === 0, 'Serie fehlt nach der Uebernahme');
    ok(window.maxTier(d, 'docker') === 1, 'alter XP-Stand schaltet Stufen frei, ohne dass etwas beantwortet wurde');
    ok(window.buildQueue(d, 'docker').length > 0, 'Altnutzer bekommt keine Fragen');
    // Kaputter Speicher darf die Seite nicht mitreissen
    store['mwl_skill_tree'] = '{das ist kein json';
    const d2 = window.loadData();
    ok(d2 && d2.skills && d2.srs, 'kaputter Speicher wird nicht aufgefangen');
}

console.log('\n' + (fails ? `✗ ${fails} von ${checks} Pruefungen fehlgeschlagen` : `✓ alle ${checks} Pruefungen bestanden`));
process.exit(fails ? 1 : 0);
