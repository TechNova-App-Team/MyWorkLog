// Prueft die amtlichen Ausbildungsnachweis-Vordrucke aus
// Assets/js/berichtsheft/ihk-formulare.js — ohne Browser, ohne jsPDF.
//
// Warum ueberhaupt Tests: Der ganze Sinn des Features ist, dass die
// Feldbeschriftungen WOERTLICH denen des amtlichen Vordrucks entsprechen. Ein
// Tippfehler faellt beim Draufschauen nicht auf ("Ausbildungsbereich" vs.
// "Ausbildungsbereiche"), macht das Blatt aber angreifbar. Die Erwartungen
// unten sind aus den Original-PDFs gezogen (DIHK Anlage 2a/3a, IHK Koeln,
// IHK Frankfurt, IHK Muenchen).
//
// jsPDF liegt nur als CDN-Skript vor, laesst sich hier also nicht laden.
// Stattdessen eine Attrappe, die jeden text()-Aufruf mitschreibt — damit ist
// pruefbar, ob Papier und Vorschau dieselben Beschriftungen zeigen und ob der
// Seitenumbruch terminiert, statt endlos Seiten zu erzeugen.
//
// Aufruf:  node tools/ihk-formulare.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const src = fs.readFileSync(path.join(ROOT, 'Assets/js/berichtsheft/ihk-formulare.js'), 'utf8');

const dom = new JSDOM('<!doctype html><body>', { runScripts: 'outside-only' });
const { window } = dom;
window.eval(src);

let fails = 0;
function check(name, ok, detail = '') {
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   → ' + detail : ''}`);
}

// ── jsPDF-Attrappe: schreibt Text, Kaesten und Seitenwechsel mit ────────────
function pdfStub() {
    const rec = { texts: [], pages: 1, rects: 0, lines: 0 };
    const api = {
        internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
        addPage() { rec.pages++; if (rec.pages > 40) throw new Error('Seitenzahl laeuft davon — Umbruch terminiert nicht'); },
        text(s, x, y) { rec.texts.push(String(s)); },
        rect() { rec.rects++; },
        line() { rec.lines++; },
        setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setFillColor() {}, setLineWidth() {},
        getTextWidth: (s) => String(s).length * 1.8,
        // grobe, aber monotone Umbruchsimulation: ~2,1 mm pro Zeichen
        splitTextToSize(text, w) {
            const per = Math.max(4, Math.floor(w / 1.8));
            const out = [];
            String(text).split('\n').forEach((line) => {
                if (!line) { out.push(''); return; }
                for (let i = 0; i < line.length; i += per) out.push(line.slice(i, i + per));
            });
            return out.length ? out : [''];
        },
    };
    return { api, rec };
}

const ctx = {
    name: 'Max Mustermann', jahr: '2', bereich: 'IT-Entwicklung',
    von: '03.08.2026', bis: '07.08.2026', nr: '32',
    activities: 'Testumgebung aufgesetzt\nDatenbank migriert',
    instruction: 'Unterweisung Arbeitssicherheit',
    school: 'IT-Systeme: Netzwerktopologien',
    days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
        .map((d, i) => ({ label: d, text: i < 5 ? d + '-Arbeit erledigt' : '', hours: i < 5 ? '8' : '' })),
    gesamtStunden: '40',
    adresse: 'Musterweg 1, 90402 Nürnberg', beruf: 'Fachinformatiker/in',
    fachrichtung: 'Anwendungsentwicklung', betrieb: 'Musterfirma GmbH',
    ausbilder: 'Maria Musterfrau', heftNr: '2',
    beginn: '01.09.2024', ende: '31.08.2027',
};

// Beides zusammen: was im PDF steht UND was in der Vorschau steht.
function render(formId, over = {}) {
    const model = window.buildIhkFormModel(formId, { ...ctx, ...over });
    const { api, rec } = pdfStub();
    window.ihkFormToPdf(api, model);
    return { model, pdf: rec.texts.join('\n'), html: window.ihkFormToHtml(model), rec };
}

// ═══ 1. Woertliche Beschriftungen ═══════════════════════════════════════════
// Erwartungen 1:1 aus den amtlichen PDFs.
const ERWARTET = {
    'dihk-w': [
        'Ausbildungsnachweis (wöchentlich)', 'Name des/der Auszubildenden:', 'Ausbildungsjahr:',
        'Ausbildungsbereich:', 'Ausbildungswoche vom:', 'bis:',
        'Betriebliche Tätigkeiten*', 'Themen des Berufsschulunterrichts', 'Stunden',
        '*  Wie lange wurde welche Tätigkeit ausgeübt?',
        'Datum, Unterschrift Auszubildende/r',
        'Datum, Unterschrift Ausbildende/r oder Ausbilder/in',
        'Datum, Unterschrift gesetzliche/r Vertreter/in',
        'Datum, weitere Sichtvermerke (z. B. Lehrer/in)',
    ],
    'dihk-t': [
        'Ausbildungsnachweis (täglich)', 'Ausbildungsbereich:',
        'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag',
        'Datum, Unterschrift gesetzliche/r Vertreter/in',
    ],
    'neu-w': [
        'Ggf. ausbildende Abteilung:', 'Betriebliche Tätigkeiten',
        'Durch die nachfolgende Unterschrift wird die Richtigkeit und Vollständigkeit der obigen Angaben bestätigt.',
    ],
    'neu-t-arp': [
        'Ausgeführte Arbeiten, Unterricht usw.', 'Gesamtstunden', 'Ggf. ausbildende Abteilung:',
    ],
    'muc-w': [
        'Ausbildungsnachweis', 'Ausbildungsabteilung:', 'Berufsschule (Unterrichtsthemen)',
        'Unterweisungen, Lehrgespräche, betrieblicher Unterricht, sonstige Schulungen',
        'Auszubildende/-r', 'Ausbilder/-in', 'Gesetzliche/-r Vertreter/-in',
        'Durch die nachfolgenden Unterschriften wird die Richtigkeit und Vollständigkeit der obigen Angaben bestätigt.',
    ],
};

// Lange Saetze zerlegt jsPDF selbst in mehrere text()-Aufrufe. Fuer den
// Wortlaut-Vergleich zaehlt deshalb nur die Zeichenfolge ohne Leerraum.
const flat = (s) => s.replace(/\s+/g, '');

console.log('\nWoertliche Uebernahme aus den amtlichen Vordrucken');
for (const [formId, labels] of Object.entries(ERWARTET)) {
    const { pdf, html } = render(formId);
    const fehltPdf = labels.filter((l) => !flat(pdf).includes(flat(l)));
    const fehltHtml = labels.filter((l) => !flat(html).includes(flat(l.replace(/&/g, '&amp;'))));
    check(`${formId}: alle Beschriftungen im PDF`, fehltPdf.length === 0, fehltPdf.join(' | '));
    check(`${formId}: dieselben in der Vorschau`, fehltHtml.length === 0, fehltHtml.join(' | '));
}

// ═══ 2. Unterschiede zwischen den Familien sind echt ════════════════════════
console.log('\nDie Familien unterscheiden sich tatsaechlich');
const w = render('dihk-w'), n = render('neu-w'), m = render('muc-w');
check('DIHK hat vier Unterschriftsfelder', w.model.signatures.length === 4, String(w.model.signatures.length));
check('Neufassung hat zwei', n.model.signatures.length === 2, String(n.model.signatures.length));
check('Muenchen hat drei, datiert', m.model.signatures.length === 3 && m.model.sigStyle === 'dated', m.model.sigStyle);
check('Muenchen ohne Stunden-Spalte', m.model.hoursCol === false && !m.pdf.includes('\nStunden'), String(m.model.hoursCol));
check('Neufassung ohne DIHK-Fussnote', !n.pdf.includes('Wie lange wurde welche'), '');
check('DIHK ohne Bestaetigungssatz', !w.pdf.includes('Durch die nachfolgende'), '');

// ═══ 3. Daten landen im Formular ════════════════════════════════════════════
console.log('\nInhalte kommen an');
check('Name im Kopf', w.pdf.includes('Max Mustermann'), '');
check('Zeitraum im Kopf', w.pdf.includes('03.08.2026') && w.pdf.includes('07.08.2026'), '');
check('Berufsschul-Text im dritten Block', w.pdf.includes('IT-Systeme'), '');
check('Unterweisungen im zweiten Block', w.pdf.includes('Unterweisung Arbeitssicherheit'), '');
check('Gesamtstunden am Taetigkeits-Block', w.pdf.includes('40'), '');
const t = render('dihk-t');
check('Tagesmodus: Text pro Tag', t.pdf.includes('Montag') && t.pdf.includes('-Arbeit erledigt'), '');
check('Tagesmodus: Stunden pro Tag', t.pdf.split('\n').filter((s) => s === '8').length >= 5, '');

// Die ARP-Variante hat keine Stunden-Spalte, sondern "Einzelstunden" als
// Zusatzspalte. Sie stand einmal in der Vorschau, aber nicht im PDF — genau
// diese Abweichung faengt der naechste Check ab.
const arp = render('neu-t-arp', { days: ctx.days.map((d, i) => i === 0 ? { ...d, hours: '7,25' } : { ...d, hours: '' }) });
check('ARP: Einzelstunden im PDF', arp.pdf.includes('7,25'), '');
check('ARP: Einzelstunden in der Vorschau', arp.html.includes('7,25'), '');
check('ARP: Gesamtstunden-Summe im PDF', arp.pdf.includes('40'), '');

// Keine erfundenen Stunden in Bloecken, fuer die es keine Zahl gibt.
check('nur der erste Block traegt eine Stundenzahl',
    w.model.sections.filter((s) => s.hours).length === 1,
    w.model.sections.map((s) => s.hours || '–').join(' / '));

// ═══ 3b. Eine Woche = ein Blatt ═════════════════════════════════════════════
// Der amtliche Vordruck ist einseitig. Rutscht der letzte Block auf Seite 2,
// bleibt darunter eine halbe leere Seite — genau das war der erste Entwurf.
console.log('\nEine normale Woche passt auf ein Blatt');
for (const formId of ['dihk-w', 'neu-w', 'muc-w', 'dihk-t', 'neu-t', 'neu-t-arp']) {
    const r = render(formId, { heftNr: '', adresse: '' });
    const ohneDeckblatt = r.rec.pages - (r.model.cover ? 1 : 0);
    check(`${formId}: eine Seite`, ohneDeckblatt === 1, `${ohneDeckblatt} Seiten`);
}

// ═══ 4. Kein stiller Textverlust bei langen Berichten ═══════════════════════
console.log('\nLange Berichte laufen weiter, statt abgeschnitten zu werden');
const lang = Array.from({ length: 120 }, (_, i) => `Zeile ${i + 1}: Arbeitsschritt ausgefuehrt und dokumentiert`).join('\n');
const langW = render('dihk-w', { activities: lang });
check('letzte Zeile ist im PDF', langW.pdf.includes('Zeile 120'), `Seiten: ${langW.rec.pages}`);
check('dafuer wurden Seiten angelegt', langW.rec.pages > 1, String(langW.rec.pages));
check('Fortsetzung ist als solche beschriftet', langW.pdf.includes('(Fortsetzung)'), '');
check('Raum fuer zusaetzliche Berichte im Kopf', langW.pdf.includes('Raum für zusätzliche Berichte'), '');

const langT = render('dihk-t', { days: ctx.days.map((d, i) => i === 0 ? { ...d, text: lang } : d) });
check('Tagesmodus: letzte Zeile ebenfalls da', langT.pdf.includes('Zeile 120'), `Seiten: ${langT.rec.pages}`);
check('Tagesmodus: Samstag steht trotzdem noch drauf', langT.pdf.includes('Samstag'), '');
// Ein Blatt ist das Deckblatt, die uebrigen tragen die Tabelle — und jedes
// davon braucht seinen eigenen Spaltenkopf.
const koepfe = langT.pdf.split('\n').filter((s) => s === 'Stunden').length;
check('Tagesmodus: Spaltenkopf auf jeder Tabellenseite',
    koepfe === langT.rec.pages - 1,
    `${koepfe} Koepfe / ${langT.rec.pages} Seiten (davon 1 Deckblatt)`);

// ═══ 5. Deckblatt ═══════════════════════════════════════════════════════════
console.log('\nDeckblatt');
const cov = render('dihk-w');
check('Deckblatt-Felder woertlich', ['Heft-Nr.:', 'Name, Vorname:', 'Fachrichtung/Schwerpunkt:',
    'Verantwortliche/r Ausbilder/in:', 'Beginn der Ausbildung:', 'Ende der Ausbildung:']
    .every((l) => cov.pdf.includes(l)), '');
check('Deckblatt liegt vor dem Formular', cov.rec.pages >= 2, String(cov.rec.pages));
check('BBiG-Hinweis steht drauf', cov.pdf.includes('§ 43 Abs. 1 Nr. 2 BBiG'), '');
check('Muenchen fuehrt kein DIHK-Deckblatt', m.model.cover === null, '');

// ═══ 6. Kammer-Zuordnung ════════════════════════════════════════════════════
console.log('\nKammern');
const kammern = window.IHK_KAMMERN;
check('jede Kammer verweist auf existierende Vordrucke',
    kammern.every((k) => k.forms.length && k.forms.every((f) => window.IHK_FORMS[f])),
    kammern.filter((k) => !k.forms.every((f) => window.IHK_FORMS[f])).map((k) => k.id).join());
check('Muenchen bekommt den Muenchner Vordruck', window.getIhkKammer('muenchen').forms[0] === 'muc-w', '');
check('Koeln bekommt die Neufassung', window.getIhkKammer('koeln').forms[0] === 'neu-w', '');
check('Nuernberg bekommt das DIHK-Muster', window.getIhkKammer('nuernberg').forms[0] === 'dihk-w', '');
check('ungeprüfte Kammern sind als solche markiert',
    window.getIhkKammer('nuernberg').verified === false && window.getIhkKammer('koeln').verified === true, '');
check('unbekannte Kammer faellt aufs DIHK-Muster zurueck', window.getIhkKammer('gibtsnicht').id === 'dihk', '');

// ═══ 7. Vorschau ist maskiert ═══════════════════════════════════════════════
console.log('\nVorschau');
const boese = render('dihk-w', { activities: '<img src=x onerror=alert(1)>', name: '<script>x</script>' });
check('HTML aus Nutzertext wird maskiert',
    !boese.html.includes('<img src=x') && !boese.html.includes('<script>x'), '');
check('Vorschau enthaelt die Kastenstruktur',
    boese.html.includes('fm-block-head') && boese.html.includes('fm-sig-line'), '');

console.log(fails ? `\n${fails} Pruefung(en) fehlgeschlagen\n` : '\nAlle Pruefungen bestanden\n');
process.exit(fails ? 1 : 0);
