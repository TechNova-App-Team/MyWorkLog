// Betriebs-Nachweis (E-Mail / DNS / manuell + Impressum) — Client-Seite.
//
// Die SPERRE selbst sitzt in der Datenbank (Policy freigaben_insert,
// private.betrieb_nachgewiesen) und ist im E2E-Lauf gegen den echten Server
// geprueft (npm run b2b:e2e). Hier geht es um das, was der Server nicht
// sieht: dass die Anzeige dieselbe Regel spiegelt, dass der Freischalt-Weg
// fuer GMX-Konten wirklich null Aufwand ist und dass nichts davon HTML aus
// Nutzerdaten ungefiltert rendert.
//
//   node tools/betrieb-nachweis.test.mjs

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

let bestanden = 0, fehler = 0;
const gruppe = (t) => console.log('\n▶ ' + t);
function ok(bed, name) {
    if (bed) { bestanden++; console.log('  ok    ' + name); }
    else { fehler++; console.log('  FEHL  ' + name); }
}

// ── 1. bh-b2b.js: nachweisGilt spiegelt private.betrieb_nachgewiesen ──────
const B2B = readFileSync(new URL('../Assets/js/berichtsheft/bh-b2b.js', import.meta.url), 'utf8')
    .split('\r\n').join('\n');
const sb = {
    console, SUPABASE_CONFIG: { URL: 'https://x.supabase.co', ANON_KEY: 'x' },
    crypto: { getRandomValues: (a) => a, subtle: {} }, TextEncoder,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    document: { createElement: () => ({}), head: { appendChild: () => {} } },
};
sb.window = sb; sb.globalThis = sb;
createContext(sb);
runInContext(B2B, sb, { filename: 'bh-b2b.js' });
const gilt = sb.BHB2B._intern.nachweisGilt;

gruppe('nachweisGilt — dieselbe Matrix wie die SQL-Funktion');
const jetzt = '2026-09-25T10:00:00Z';
const faelle = [
    [null, false, 'kein Betrieb'],
    [{}, false, 'keine Art'],
    [{ nachweis_art: 'manuell' }, true, 'manuell braucht keine Domain (GMX-Betrieb)'],
    [{ nachweis_art: 'email', domain: 'brush-zahn.com', domain_verifiziert_at: jetzt }, true, 'E-Mail mit Domain + Zeitpunkt'],
    [{ nachweis_art: 'dns', domain: 'brush-zahn.com', domain_verifiziert_at: jetzt }, true, 'DNS mit Domain + Zeitpunkt'],
    [{ nachweis_art: 'email', domain: 'brush-zahn.com', domain_verifiziert_at: null }, false, 'E-Mail ohne Zeitpunkt'],
    [{ nachweis_art: 'dns', domain: null, domain_verifiziert_at: jetzt }, false, 'DNS ohne Domain'],
    [{ nachweis_art: null, domain: 'x.de', domain_verifiziert_at: jetzt }, false, 'Zeitpunkt ohne Art (Altbestand vor der Migration)'],
    [{ nachweis_art: 'erfunden', domain: 'x.de', domain_verifiziert_at: jetzt }, false, 'unbekannte Art'],
];
for (const [b, soll, name] of faelle) ok(gilt(b) === soll, name);

// Die SQL-Funktion muss dieselben drei Arten kennen — sonst zeigt die Seite
// einen Knopf, den der Server ablehnt. Gegen die Migration gehalten, die als
// Notiz neben dem Schema liegt, ist das nicht moeglich (gitignored); deshalb
// gegen den Kommentar in bh-b2b.js, der die Funktion benennt.
ok(B2B.includes('private.betrieb_nachgewiesen()'), 'nachweisGilt nennt die SQL-Funktion, die es spiegelt');

// ── 2. Ausbilder-Cockpit: einzelne Funktionen aus der Seite holen ─────────
const SEITE = readFileSync('pages/ausbilder/index.html', 'utf8').split('\r\n').join('\n');
function hole(name) {
    const start = SEITE.indexOf('        function ' + name + '(');
    if (start === -1) throw new Error('Funktion nicht gefunden: ' + name);
    const ende = SEITE.indexOf('\n        }\n', start);
    return SEITE.slice(start, ende + '\n        }'.length);
}
function holeVar(name) {
    const m = SEITE.match(new RegExp('        var ' + name + ' = [^\\n]*\\n'));
    if (!m) throw new Error('var nicht gefunden: ' + name);
    return m[0];
}
const escQuelle = hole('esc');
function lade(lang, kontoDaten) {
    const quelle = [
        "var document = { documentElement: { lang: '" + lang + "' } };",
        'var kontoDaten = ' + JSON.stringify(kontoDaten) + ';',
        hole('abL'), escQuelle, holeVar('SUPPORT_MAIL'), holeVar('HAKEN'),
        hole('nachweisZeile'), hole('wegFirmenadresse'), hole('wegManuell'),
        hole('freischaltText'), hole('freischaltMailto'),
        'return { nachweisZeile, wegFirmenadresse, wegManuell, freischaltText, freischaltMailto };',
    ].join('\n');
    return new Function(quelle)();
}

const GMX = {
    betrieb: 'Müller & Söhne #1', betriebId: 'e74a8522-88c3-4c5d-a0f6-36aabfac5a1f',
    kontoEmail: 'chef.mueller@gmx.de', nachgewiesen: false,
};

gruppe('Freischalt-Mail: fertig ausgefuellt, nichts zu tippen');
const f = lade('de', GMX);
const mailto = f.freischaltMailto();
ok(mailto.startsWith('mailto:info@myworklog.de?subject='), 'geht an info@myworklog.de');
const q = new URLSearchParams(mailto.slice(mailto.indexOf('?') + 1));
ok(q.get('subject') === 'Betrieb freischalten: Müller & Söhne #1', 'Betreff enthaelt den Namen, & und # ueberleben das Kodieren');
const body = q.get('body') || '';
ok(body.includes('Betriebs-ID: e74a8522-88c3-4c5d-a0f6-36aabfac5a1f'), 'Betriebs-ID steht drin — Zuordnung ohne Rueckfrage');
ok(body.includes('Angemeldet als: chef.mueller@gmx.de'), 'Konto-Adresse steht drin');
ok(body.includes('Betrieb: Müller & Söhne #1'), 'Betriebsname steht drin');
ok(mailto.includes('%0D%0A') && !/[\r\n]/.test(mailto), 'Zeilenumbrueche als %0D%0A, keine rohen');
ok([...mailto.matchAll(/&/g)].length === 1, 'genau EIN & als Trenner — das & im Namen ist kodiert');
ok(body.length > 100 && body.length < 1500, 'Text hat Inhalt und bleibt unter der mailto-Laenge, die Outlook schafft');

const en = lade('en', GMX).freischaltMailto();
ok(new URLSearchParams(en.slice(en.indexOf('?') + 1)).get('subject').startsWith('Activate company: '), 'englische Fassung');

gruppe('Weg fuer Freemail: Knopf UND Rueckfallebene');
const html = f.wegManuell('gmx.de');
ok(html.includes('href="mailto:info@myworklog.de?subject='), 'fetter Knopf ist ein mailto-Link');
ok(html.includes('abkMailKopieren'), '„Text kopieren" daneben — mailto tut ohne Mailprogramm NICHTS');
ok(/>info@myworklog\.de</.test(html), 'Adresse steht lesbar da, nicht nur im href');
ok(html.includes('<b>gmx.de</b>'), 'nennt den Grund: die Domain der Anmelde-Adresse');

gruppe('Kein HTML aus Nutzerdaten');
const boese = lade('de', Object.assign({}, GMX, { betrieb: '"><img src=x onerror=alert(1)>' }));
const bhtml = boese.wegManuell('gmx.de" onmouseover="x');
ok(!bhtml.includes('<img'), 'Betriebsname landet nicht als Tag im href');
ok(!bhtml.includes('onmouseover="x'), 'Domain wird escaped');
ok(bhtml.includes('&quot;') || bhtml.includes('%22'), 'Gegenprobe: das Anfuehrungszeichen ist ueberhaupt angekommen');

gruppe('Kopfzeile nennt, WIE bestaetigt wurde');
const z = (d) => lade('de', d).nachweisZeile(d);
ok(z({ nachgewiesen: false }).includes('Abzeichnen ist gesperrt'), 'ohne Nachweis: gesperrt');
const zm = z({ nachgewiesen: true, nachweisArt: 'manuell' });
ok(zm.includes('Von MyWorkLog geprüft') && !zm.includes('abkImpressum'), 'manuell: kein Impressum-Knopf');
const ze = z({ nachgewiesen: true, nachweisArt: 'email', domain: 'brush-zahn.com', impressumUrl: '' });
ok(ze.includes('@brush-zahn.com') && ze.includes('abkImpressum'), 'E-Mail: Domain + Knopf zum Impressum-Abgleich');
const zi = z({ nachgewiesen: true, nachweisArt: 'dns', domain: 'brush-zahn.com', impressumUrl: 'https://brush-zahn.com/impressum' });
ok(zi.includes('Name steht im Impressum') && !zi.includes('abkImpressum()'), 'Impressum gefunden: Aussage statt Knopf');
ok(z({ nachgewiesen: true, nachweisArt: 'email', domain: '<b>x' }).includes('&lt;b&gt;x'), 'Domain escaped');

gruppe('Abzeichnen-Knopf erklaert die Sperre, statt still zu scheitern');
const zweig = SEITE.slice(SEITE.indexOf("if (k === 'approve') {"), SEITE.indexOf("if (k === 'zur-bestaetigung')"));
ok(zweig.length > 0, 'der approve-Zweig ist gefunden');
ok(zweig.indexOf('nachgewiesen') > -1 && zweig.indexOf('nachgewiesen') < zweig.indexOf("kontoEntscheiden(bid, 'approved'"),
    'Pruefung auf den Nachweis steht VOR dem Schreiben');

gruppe('Azubi-Seite');
const UI = readFileSync('Assets/js/berichtsheft/bh-b2b-ui.js', 'utf8').split('\r\n').join('\n');
const dz = UI.slice(UI.indexOf('    function domainZeile('), UI.indexOf('    function zeigeBestaetigen('));
ok(dz.includes('st.nachgewiesen') && dz.includes("st.nachweisArt === 'manuell'"), 'domainZeile unterscheidet die Arten');
ok(!/st\.domainOk/.test(dz), 'haengt nicht mehr am alten domainOk (DNS-only)');
ok((UI.match(/domainZeile\(st\)/g) || []).length >= 2, 'steht beim Beitreten UND im Panel „Verbunden"');
ok(UI.includes('f.ausbilder_email'), 'Verlauf zeigt die Adresse des Abzeichnenden');

console.log(`\nbetrieb-nachweis: ${bestanden} ok, ${fehler} fehlgeschlagen`);
if (bestanden < 20 || fehler) process.exit(1);
