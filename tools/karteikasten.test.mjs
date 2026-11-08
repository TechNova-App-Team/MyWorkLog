// ═══ KARTEIKASTEN TEST ═══
//
// /lernen/ (Assets/js/karteikasten.js) in jsdom: die echte Seite, das echte Skript,
// festes Datum, mwlEvent als Attrappe. Die Szene (Three.js) laedt hier nicht — ohne
// window.KKSzene startet die Abfrage sofort, genau wie in der ruhigen Fassung.
//
// Geprueft (Plan .claude/notes/karteikasten.md, Abschnitte 4, 8.1, 11):
//   1. Beispielstapel: 8 Karten, alle heute dran
//   2. Abstaende: richtig = ein Fach weiter mit ABSTAND[fach], falsch = Fach 1 / morgen
//   3. hoechstens 12 Karten je Runde
//   4. hoechstens 10 NEUE Karten je Tag (Fach 0), Zaehler laeuft beim Beantworten
//   5. Reihe wird nie in der Loesungsreihenfolge angeboten
//   6. Wiederkehr-Ereignis einmal je Tag, nicht beim ersten Besuch
//   7. „Stimmt nicht": erst Grund, dann gesperrt; Ereignis traegt nur die Kategorie
// Jede Grenze hat eine Gegenprobe (knapp darunter / andere Faecher).
//
// Lauf: node tools/karteikasten.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const eq = (n, a, b) => ok(n + '  (' + JSON.stringify(a) + ' = ' + JSON.stringify(b) + ')', a === b);
const lf = s => s.split('\r\n').join('\n');

const HTML = lf(readFileSync('pages/lernen/index.html', 'utf8')).replace(/<script\b[\s\S]*?<\/script>/g, '');
const JS = lf(readFileSync('Assets/js/karteikasten.js', 'utf8'));
const KEY = 'mwl_karteikasten_v1';

async function seite({ iso = '2026-11-09T10:00:00', speicher = null, zufall = null } = {}) {
    const dom = new JSDOM(HTML, { url: 'http://localhost:5001/lernen/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    const FEST = new w.Date(iso).getTime();
    const Echt = w.Date;
    w.Date = class extends Echt {
        constructor(...a) { if (a.length === 0) super(FEST); else super(...a); }
        static now() { return FEST; }
    };
    if (zufall) w.Math.random = zufall;
    const events = [];
    w.mwlEvent = (name, props) => events.push({ name, props });
    if (speicher) w.localStorage.setItem(KEY, JSON.stringify(speicher));
    w.eval(JS);
    // jsdom steht beim eval noch auf readyState 'loading' — init haengt an DOMContentLoaded
    if (w.document.readyState === 'loading') await new Promise(r => w.document.addEventListener('DOMContentLoaded', r));
    const $ = id => w.document.getElementById(id);
    const stand = () => JSON.parse(w.localStorage.getItem(KEY) || 'null');
    return { w, $, events, stand };
}

const karte = (id, fach, faellig, extra = {}) => Object.assign({
    id, typ: 'aufdecken', kurz: id, frage: 'Frage ' + id + '?', antwort: 'Antwort ' + id + ' mit genug Text.',
    erklaerung: 'Weil.', quelle: { art: 'beispiel', text: 'Test' }, fach, faellig, gesehen: 0, richtig: 0
}, extra);
const kasten = (karten, extra = {}) => Object.assign({ v: 1, karten: Object.fromEntries(karten.map(k => [k.id, k])), zuletzt: '' }, extra);
const viele = (n, fach, faellig, praefix = 'k') => Array.from({ length: n }, (_, i) => karte(praefix + i, fach, faellig));

// Aufdecken-Karte beantworten: „Antwort zeigen" → „Wusste ich (nicht)"
function aufdecken(s, wusste) {
    s.$('kkAktionen').querySelector('button').click();
    const [ja, nein] = s.$('kkAktionen').querySelectorAll('button');
    (wusste ? ja : nein).click();
}

console.log('1. Beispielstapel');
{
    const s = await seite();
    eq('leerer Kasten: 0 dran', s.$('kkHeuteZahl').textContent, '0');
    ok('Start-Knopf ist ohne Karten aus', s.$('kkLos').disabled);
    s.$('kkBeispiel').click();
    eq('8 Karten im Speicher', Object.keys(s.stand().karten).length, 8);
    eq('alle 8 heute dran', s.$('kkHeuteZahl').textContent, '8');
    ok('Ereignis karteikasten_beispiel mit 8', s.events.some(e => e.name === 'karteikasten_beispiel' && e.props.karten === 8));
    ok('Beispiel-Knopf verschwindet danach', s.$('kkBeispiel').hidden);
}

console.log('2. Abstaende');
{
    const s = await seite({ speicher: kasten([karte('a', 2, '2026-11-09')]) });
    s.$('kkLos').click();
    aufdecken(s, true);
    const k = s.stand().karten.a;
    eq('richtig aus Fach 2 → Fach 3', k.fach, 3);
    eq('Fach 3 kommt nach 7 Tagen', k.faellig, '2026-11-16');
}
{
    const s = await seite({ speicher: kasten([karte('a', 4, '2026-11-09')]) });
    s.$('kkLos').click();
    aufdecken(s, false);
    const k = s.stand().karten.a;
    eq('falsch aus Fach 4 → Fach 1', k.fach, 1);
    eq('Fach 1 = morgen', k.faellig, '2026-11-10');
}
{
    const s = await seite({ speicher: kasten([karte('a', 5, '2026-11-09')]) });
    s.$('kkLos').click();
    aufdecken(s, true);
    eq('richtig in Fach 5 bleibt Fach 5', s.stand().karten.a.fach, 5);
    eq('Fach 5 = 30 Tage', s.stand().karten.a.faellig, '2026-12-09');
}

console.log('3. Rundengroesse');
{
    const s = await seite({ speicher: kasten(viele(15, 1, '2026-11-09')) });
    eq('15 faellige Karten werden angezeigt', s.$('kkHeuteZahl').textContent, '15');
    s.$('kkLos').click();
    eq('Runde hat 12 Karten', s.$('kkFortschrittText').textContent, '1 von 12');
}
{
    const s = await seite({ speicher: kasten(viele(11, 1, '2026-11-09')) });
    s.$('kkLos').click();
    eq('Gegenprobe: 11 Karten = Runde mit 11', s.$('kkFortschrittText').textContent, '1 von 11');
}

console.log('4. Neue Karten je Tag');
{
    const s = await seite({ speicher: kasten(viele(15, 0, '2026-11-09')) });
    eq('15 neue → heute nur 10 dran', s.$('kkHeuteZahl').textContent, '10');
}
{
    const s = await seite({ speicher: kasten(viele(9, 0, '2026-11-09')) });
    eq('Gegenprobe: 9 neue → alle 9 dran', s.$('kkHeuteZahl').textContent, '9');
}
{
    const s = await seite({ speicher: kasten([...viele(15, 0, '2026-11-09', 'n'), ...viele(5, 2, '2026-11-09', 'a')]) });
    eq('Grenze gilt nur fuer Fach 0: 5 alte + 10 neue', s.$('kkHeuteZahl').textContent, '15');
}
{
    const s = await seite({ speicher: kasten(viele(15, 0, '2026-11-09'), { neuHeute: { datum: '2026-11-09', n: 7 } }) });
    eq('7 neue heute schon gesehen → noch 3', s.$('kkHeuteZahl').textContent, '3');
}
{
    const s = await seite({ speicher: kasten(viele(15, 0, '2026-11-09'), { neuHeute: { datum: '2026-11-08', n: 10 } }) });
    eq('Zaehler von gestern zaehlt nicht', s.$('kkHeuteZahl').textContent, '10');
}
{
    const s = await seite({ speicher: kasten([karte('n', 0, '2026-11-09'), karte('a', 2, '2026-11-09')]) });
    s.$('kkLos').click();
    aufdecken(s, true);   // erst Fach 0 (niedrigstes Fach zuerst)
    eq('Antwort auf neue Karte zaehlt hoch', JSON.stringify(s.stand().neuHeute), JSON.stringify({ datum: '2026-11-09', n: 1 }));
    s.$('kkAktionen').querySelector('button').click();
    aufdecken(s, true);   // dann Fach 2
    eq('Gegenprobe: alte Karte zaehlt nicht mit', s.stand().neuHeute.n, 1);
}

console.log('5. Reihe');
{
    const teile = ['eins', 'zwei', 'drei', 'vier'];
    // Math.random knapp unter 1 → Fisher-Yates tauscht nie → ohne Schutz kaeme die Loesung
    const s = await seite({ zufall: () => 0.9999, speicher: kasten([karte('r', 1, '2026-11-09', { typ: 'reihe', teile })]) });
    s.$('kkLos').click();
    const angeboten = [...s.$('kkKarteArbeit').querySelectorAll('.kk-teil')].map(b => b.textContent);
    eq('alle Teile angeboten', angeboten.length, 4);
    ok('nicht in Loesungsreihenfolge: ' + angeboten.join(','), angeboten.join() !== teile.join());
}
{
    const teile = ['eins', 'zwei', 'drei'];
    const s = await seite({ zufall: () => 0.9999, speicher: kasten([karte('r', 1, '2026-11-09', { typ: 'reihe', teile })]) });
    s.$('kkLos').click();
    teile.forEach(t => [...s.$('kkKarteArbeit').querySelectorAll('.kk-teil')].find(b => b.textContent === t).click());
    s.$('kkAktionen').querySelector('button').click();
    eq('richtige Reihenfolge zaehlt als richtig → Fach 2', s.stand().karten.r.fach, 2);
}

console.log('6. Wiederkehr');
{
    const s = await seite({ speicher: kasten([karte('a', 1, '2026-11-12')], { zuletzt: '2026-11-07' }) });
    const w = s.events.filter(e => e.name === 'karteikasten_wiederkehr');
    eq('ein Wiederkehr-Ereignis', w.length, 1);
    eq('tage_seit = 2', w[0] && w[0].props.tage_seit, 2);
    const s2 = await seite({ speicher: s.stand() });
    eq('zweiter Besuch am selben Tag: kein neues', s2.events.filter(e => e.name === 'karteikasten_wiederkehr').length, 0);
}
{
    const s = await seite({ speicher: kasten([karte('a', 1, '2026-11-12')], { zuletzt: '2026-11-09' }) });
    eq('Gegenprobe: letzte Abfrage heute → kein Ereignis', s.events.filter(e => e.name === 'karteikasten_wiederkehr').length, 0);
}
{
    const s = await seite();
    eq('Gegenprobe: erster Besuch ohne Abfrage → kein Ereignis', s.events.filter(e => e.name === 'karteikasten_wiederkehr').length, 0);
}

console.log('7. Stimmt nicht');
{
    const s = await seite({ speicher: kasten([karte('a', 1, '2026-11-09'), karte('b', 1, '2026-11-09')]) });
    s.$('kkLos').click();
    aufdecken(s, true);
    ok('Melden-Knopf erscheint nach der Antwort', !s.$('kkMelden').hidden);
    s.$('kkMelden').click();
    const gruende = s.$('kkGruende');
    ok('Gruende sichtbar', gruende && !gruende.hidden);
    eq('drei Gruende', gruende.querySelectorAll('button').length, 3);
    ok('Gegenprobe: vor der Wahl nichts gesperrt', !s.stand().karten.a.gesperrt);
    eq('Gegenprobe: vor der Wahl kein Ereignis', s.events.filter(e => e.name === 'karteikasten_stimmt_nicht').length, 0);
    gruende.querySelector('[data-grund="unklar"]').click();
    ok('Karte gesperrt', s.stand().karten.a.gesperrt === true);
    const e = s.events.find(x => x.name === 'karteikasten_stimmt_nicht');
    eq('Ereignis traegt den Grund', e && e.props.grund, 'unklar');
    ok('Ereignis traegt keinen Kartentext', e && !JSON.stringify(e.props).includes('Frage'));
    ok('Gruende wieder zu', gruende.hidden);
    s.$('kkAktionen').querySelector('button').click();
    ok('naechste Karte: Gruende zu, Melden zu', gruende.hidden && s.$('kkMelden').hidden);
    s.$('kkAbbrechen').click();   // erst die Startansicht zeichnet die Zahl neu
    eq('gesperrte Karte zaehlt nicht mehr (b ist noch offen)', s.$('kkHeuteZahl').textContent, '1');
}

console.log('8. Englisch');
ok('Gruende-Texte haben eine englische Fassung', JS.includes("'Has nothing to do with me'") && JS.includes("'What is wrong?'"));

console.log('\nkarteikasten: ' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
