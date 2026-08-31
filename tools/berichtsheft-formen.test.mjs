// Schreibformen des Berichtsheft-Generators.
//
// Prueft drei Dinge, die im Browser alle STUMM falsch waeren:
//   1. Jedes Objekt aus PROFESSIONS hat ein Genus. Fehlt eines, liefert mitArtikel()
//      das Wort ohne Artikel zurueck — "Ich habe Bremsanlage geprueft" faellt nur
//      einem deutschen Leser auf, keinem Test und keiner Konsole.
//   2. Die erzeugten Saetze haben die Form, die der Nutzer gewaehlt hat. Ein
//      Stichpunkt im Ich-Form-Modus sieht im Screenshot aus wie Absicht.
//   3. Kein Satz enthaelt einen doppelten oder falsch kongruenten Artikel
//      ("die die Palette", "Die Rechnungen wurde ...").
//
// Laeuft ohne Browser: die relevanten Bloecke werden aus der HTML-Datei
// herausgeschnitten und in einem vm-Kontext ausgewertet.

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

// Zeilenenden vereinheitlichen: git liefert die Datei je nach autocrlf mit CRLF
// aus, und die mehrzeiligen Marker unten wuerden dann keinen Treffer finden —
// der Test faellt aus, ohne dass am Code etwas falsch ist.
const HTML = readFileSync(new URL('../pages/berichtsheft/index.html', import.meta.url), 'utf8')
    .split('\r\n').join('\n');

let bestanden = 0, fehlgeschlagen = 0;
const gruppe = (t) => console.log('\n▶ ' + t);
function ok(bed, name, detail) {
    if (bed) { bestanden++; console.log('  ok    ' + name); }
    else { fehlgeschlagen++; console.log('  FEHL  ' + name + (detail ? '\n        ' + detail : '')); }
}

// ── Quelltext-Ausschnitte holen ─────────────────────────────────────────
function schnitt(startMarker, endMarker) {
    const i = HTML.indexOf(startMarker);
    if (i < 0) throw new Error('Marker nicht gefunden: ' + startMarker);
    const j = HTML.indexOf(endMarker, i);
    if (j < 0) throw new Error('Endmarker nicht gefunden: ' + endMarker);
    return HTML.slice(i, j);
}

const src = [
    schnitt('const PROFESSIONS = {', 'const SEASONAL_ACTIVITIES'),
    schnitt('function conjugateVerb(', '// ═══════════════════════════════════════\n            // ADVANCED SENTENCE GENERATION ENGINE'),
    schnitt('const SENTENCE_PATTERNS = [', 'const UNIVERSAL_ACTIVITIES_EXTENDED'),
    schnitt('// SCHREIBFORMEN — Genus, Artikel, Satzmuster', '// ═══════════════════════════════════════\n            // FULL WEEK GENERATION'),
].join('\n');

const ctx = createContext({ console });
runInContext(
    'function pickRandom(arr, exclude) { return Array.isArray(arr) ? arr[0] : arr; }\n' + src +
    '\n;globalThis.__x = { PROFESSIONS, OBJ_GENUS, OBJ_SONDERFORM, FORM_PATTERNS, UNIVERSAL_OBJEKTE, FLIESS_ANFANG, FLIESS_MITTE, FLIESS_ENDE, mitArtikel, wurde, alsFliesstext, conjugateVerb, partizipDoppelt, UMFANG_COUNT };',
    ctx
);
const X = ctx.__x;

// ── 1. Genus-Abdeckung ──────────────────────────────────────────────────
gruppe('Genus-Lexikon deckt jedes Objekt ab');
const alleObjekte = [];
for (const [id, prof] of Object.entries(X.PROFESSIONS)) {
    for (const o of prof.objects || []) alleObjekte.push([id, o]);
}
const uniq = [...new Set(alleObjekte.map(([, o]) => o))];
const fehlend = uniq.filter(o => !X.OBJ_GENUS[o] && !X.OBJ_SONDERFORM[o]);
ok(fehlend.length === 0,
    `alle ${uniq.length} Objekte haben ein Genus`,
    fehlend.length ? 'OHNE GENUS (' + fehlend.length + '): ' + fehlend.join(', ') : '');

const erlaubt = new Set(['m', 'f', 'n', 'p']);
const falschesGenus = Object.entries(X.OBJ_GENUS).filter(([, g]) => !erlaubt.has(g));
ok(falschesGenus.length === 0, 'nur m/f/n/p als Genus',
    falschesGenus.map(([k, v]) => k + '=' + v).join(', '));

// UNIVERSAL_OBJEKTE stehen absichtlich im Lexikon, ohne in PROFESSIONS vorzukommen —
// sie bedienen eigene Berufe (Freitext im Profil), die keine Objektliste haben.
const bekannt = new Set([...uniq, ...(X.UNIVERSAL_OBJEKTE || [])]);
const verwaist = Object.keys(X.OBJ_GENUS).filter(o => !bekannt.has(o));
ok(verwaist.length === 0, 'kein Genus-Eintrag ohne Objekt',
    verwaist.length ? 'UEBERZAEHLIG: ' + verwaist.join(', ') : '');

ok((X.UNIVERSAL_OBJEKTE || []).every(o => X.OBJ_GENUS[o]),
    'auch die Universal-Objekte haben ein Genus',
    (X.UNIVERSAL_OBJEKTE || []).filter(o => !X.OBJ_GENUS[o]).join(', '));

// ── 2. Artikel korrekt ──────────────────────────────────────────────────
gruppe('Artikel');
ok(X.mitArtikel('Bremsanlage', 'akk') === 'die Bremsanlage', 'Femininum Akkusativ: die Bremsanlage');
ok(X.mitArtikel('Server', 'akk') === 'den Server', 'Maskulinum Akkusativ: den Server');
ok(X.mitArtikel('Server', 'nom') === 'der Server', 'Maskulinum Nominativ: der Server');
ok(X.mitArtikel('Netzwerk', 'akk') === 'das Netzwerk', 'Neutrum: das Netzwerk');
ok(X.mitArtikel('Rechnungen', 'akk') === 'die Rechnungen', 'Plural: die Rechnungen');
ok(X.mitArtikel('Patient/in', 'akk') === 'die Patientin', 'Sonderform statt schwacher Deklination');
ok(X.mitArtikel('Vegetarisches Gericht', 'nom') === 'das vegetarische Gericht', 'Adjektiv-Endung mit Artikel');
ok(X.mitArtikel('Gibtsnicht', 'akk') === 'Gibtsnicht', 'unbekanntes Objekt bleibt ohne Artikel (kein Raten)');
ok(X.wurde('Rechnungen') === 'wurden' && X.wurde('Server') === 'wurde', 'Passiv-Kongruenz Singular/Plural');

// ── 3. Erzeugte Saetze ──────────────────────────────────────────────────
gruppe('Satzmuster je Form');
const V = 'konfigurieren', T = 'Git';

function alleSaetze(form) {
    const out = [];
    for (const [, o] of alleObjekte) {
        for (const p of X.FORM_PATTERNS[form]) out.push(p(V, o, T));
    }
    return out;
}

ok(X.FORM_PATTERNS.stichpunkte.length > 0 && X.FORM_PATTERNS.saetze.length > 0
    && X.FORM_PATTERNS.ichform.length > 0 && X.FORM_PATTERNS.fliesstext.length > 0,
    'alle vier Formen haben Muster');

const ich = alleSaetze('ichform');
ok(ich.every(s => /\bich\b/i.test(s)), 'Ich-Form enthaelt immer "ich"',
    ich.find(s => !/\bich\b/i.test(s)));
ok(ich.every(s => s.endsWith('.')), 'Ich-Form endet auf Punkt',
    ich.find(s => !s.endsWith('.')));

const sae = alleSaetze('saetze');
ok(sae.every(s => !/\bich\b/i.test(s)), 'Ganze Saetze ohne Ich-Form',
    sae.find(s => /\bich\b/i.test(s)));
ok(sae.every(s => /\bwurden?\b/.test(s)), 'Ganze Saetze im Passiv',
    sae.find(s => !/\bwurden?\b/.test(s)));
ok(sae.every(s => s.endsWith('.')), 'Ganze Saetze enden auf Punkt');

const stich = alleSaetze('stichpunkte');
ok(stich.every(s => !s.endsWith('.')), 'Stichpunkte ohne Schlusspunkt',
    stich.find(s => s.endsWith('.')));
ok(stich.every(s => !/^Ich habe /.test(s)), 'Stichpunkte ohne Ich-Form');

// ── 4. Keine kaputten Artikel ───────────────────────────────────────────
gruppe('Keine doppelten oder inkongruenten Artikel');
const verdaechtig = [...ich, ...sae].filter(s =>
    /\b(der|die|das|den)\s+(der|die|das|den)\b/i.test(s));
ok(verdaechtig.length === 0, 'kein doppelter Artikel', verdaechtig.slice(0, 3).join(' / '));

const plObj = alleObjekte.filter(([, o]) => X.OBJ_GENUS[o] === 'p').map(([, o]) => o);
const kongruenz = [];
for (const o of plObj) {
    for (const p of X.FORM_PATTERNS.saetze) {
        const t = p(V, o, T);
        if (/\bwurde\b/.test(t)) kongruenz.push(t);
    }
}
ok(kongruenz.length === 0, 'Plural-Objekte bekommen "wurden", nie "wurde"',
    kongruenz.slice(0, 3).join(' / '));

const grossKlein = [...sae].filter(s => /^[a-zäöü]/.test(s));
ok(grossKlein.length === 0, 'jeder Satz beginnt gross', grossKlein.slice(0, 3).join(' / '));

// ── 4b. Grammatik-Fallen, die in der Browser-Probe wirklich auftraten ───
gruppe('Grammatik-Fallen aus der Praxis');

// "mit Hebebuehne" / "mithilfe von Hebebuehne" — Werkzeuge sind teils Eigennamen
// (Git, SAP: ohne Artikel richtig), teils Gattungsnamen (die Hebebuehne: Artikel
// noetig). Beides zusammen geht nur, wenn das Werkzeug in Klammern steht.
// Bewusst ohne Regex: hier stand schon einmal ein zerschossenes Muster, das nie
// treffen konnte und die Pruefung damit dauerhaft gruen faerbte.
const werkzeugPraep = [...ich, ...sae].filter(t =>
    t.includes('mit Git') || t.includes('mithilfe von Git'));
ok(werkzeugPraep.length === 0,
    'Werkzeug steht in Klammern, nicht hinter "mit"/"mithilfe von"',
    werkzeugPraep.slice(0, 3).join(' / '));
ok([...ich, ...sae].some(t => t.includes('(Git)')),
    'das Werkzeug taucht ueberhaupt auf (sonst prueft die Zeile darueber nichts)');

// Ein Nebensatz-Bindewort verlangt das Hilfsverb am Satzende ("… repariert habe").
// Die Kerne liefern Hauptsatzstellung, also darf kein Bindewort einen Nebensatz oeffnen.
const alleBinder = [...X.FLIESS_ANFANG, ...X.FLIESS_MITTE, ...X.FLIESS_ENDE];
const NEBENSATZ_WOERTER = ['dass', 'weil', 'damit', 'nachdem', 'während', 'sodass', 'indem'];
const nebensatz = alleBinder.filter(b => NEBENSATZ_WOERTER.some(w => b.includes(w + ' ')));
ok(nebensatz.length === 0,
    'kein Bindewort oeffnet einen Nebensatz (Verbletztstellung)',
    nebensatz.join(' / '));
ok(alleBinder.length >= 3, 'es gibt ueberhaupt Bindewoerter zu pruefen');
ok(alleBinder.every(b => b.includes('habe ich')),
    'jedes Bindewort traegt "habe ich" und haelt damit Hauptsatzstellung',
    alleBinder.filter(b => !b.includes('habe ich')).join(' / '));

// ── 4c. Doppeltes Partizip ──────────────────────────────────────────────
gruppe('Doppeltes Partizip');

// Mehrere Muster tragen ein festes Partizip ("… und dokumentiert", "… und
// anschliessend geprueft"). Faellt das Verb darauf, steht dasselbe Wort zweimal:
// "Das Getriebe wurde geprueft und anschliessend geprueft." Die Engine verwirft
// solche Treffer und zieht ein anderes Muster — dafuer MUSS es je Verb mindestens
// ein kollisionsfreies Muster geben, sonst laeuft der Rueckfall ins Leere.
const alleVerben = [...new Set(Object.values(X.PROFESSIONS).flatMap(p => p.verbs || []))];
const ohneAusweg = [];
for (const form of ['stichpunkte', 'saetze', 'ichform']) {
    for (const v of alleVerben) {
        const part = X.conjugateVerb(v).toLowerCase();
        const frei = X.FORM_PATTERNS[form].filter(p => {
            const t = p(v, 'Testobjekt', 'Testwerkzeug').toLowerCase();
            return t.split(part).length - 1 <= 1;
        });
        if (frei.length === 0) ohneAusweg.push(form + '/' + v);
    }
}
ok(ohneAusweg.length === 0,
    `jedes der ${alleVerben.length} Verben hat je Form ein kollisionsfreies Muster`,
    ohneAusweg.slice(0, 6).join(', '));

// Gegenprobe: der Fall existiert ueberhaupt, sonst prueft die Zeile darueber nichts
const gibtKollision = ['stichpunkte', 'saetze', 'ichform'].some(form =>
    alleVerben.some(v => {
        const part = X.conjugateVerb(v).toLowerCase();
        return X.FORM_PATTERNS[form].some(p =>
            p(v, 'Testobjekt', 'Testwerkzeug').toLowerCase().split(part).length - 1 > 1);
    }));
ok(gibtKollision, 'es gibt ueberhaupt kollidierende Muster (sonst ist die Pruefung leer)');

ok(X.partizipDoppelt('Das Getriebe wurde geprüft und anschließend geprüft.', 'geprüft'),
    'partizipDoppelt erkennt den Fall');
ok(!X.partizipDoppelt('Das Getriebe wurde repariert und anschließend geprüft.', 'repariert'),
    'partizipDoppelt meldet keinen Fehlalarm');

// ── 5. Fliesstext ───────────────────────────────────────────────────────
gruppe('Fliesstext');
const roh = ['Ich habe den Server konfiguriert.', 'Ich habe die Firewall geprüft.', 'Ich habe das Netzwerk dokumentiert.'];
const abs = X.alsFliesstext(roh, 'Montag');
ok(abs.length === 1, 'ergibt genau EINEN Absatz, nicht mehrere Eintraege');
ok(!/Ich habe den Server konfiguriert\. Ich habe/.test(abs[0]),
    '"Ich habe" wird nicht stumpf aneinandergereiht', abs[0]);
ok(/Montag/.test(abs[0]), 'Tagesname kommt vor', abs[0]);
ok(!abs[0].includes('dass ich '), 'kein Nebensatz im Absatz', abs[0]);
ok((abs[0].match(/\./g) || []).length === roh.length, 'ein Satzzeichen je Kern', abs[0]);
ok(X.alsFliesstext([], 'Montag').length === 0, 'leere Eingabe ergibt leeren Absatz');

// ── 6. Umfang ───────────────────────────────────────────────────────────
gruppe('Umfang');
const u = X.UMFANG_COUNT;
ok(u.kurz.max < u.mittel.min || u.kurz.max <= u.mittel.min, 'kurz < mittel');
ok(u.mittel.max < u.ausfuehrlich.min, 'mittel < ausfuehrlich');
ok(Object.values(u).every(x => x.min <= x.max && x.min >= 1), 'jede Stufe hat sinnvolle Grenzen');

console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen\n`);
process.exit(fehlgeschlagen ? 1 : 0);
