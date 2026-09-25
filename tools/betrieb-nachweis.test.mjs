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
    // Stufe 1 + 2 (v7.6.1): beim E-Mail-Weg reicht die Domain NICHT — ein
    // Azubi mit eigener Firmenadresse haette sie auch.
    [{ nachweis_art: 'email', domain: 'brush-zahn.com', domain_verifiziert_at: jetzt }, false, 'E-Mail nur mit Domain reicht nicht mehr'],
    [{ nachweis_art: 'email', domain: 'brush-zahn.com', domain_verifiziert_at: jetzt, impressum_geprueft_at: jetzt }, false, 'E-Mail + Impressum, aber Firma hat nicht zugestimmt'],
    [{ nachweis_art: 'email', domain: 'brush-zahn.com', domain_verifiziert_at: jetzt, firma_bestaetigt_at: jetzt }, false, 'E-Mail + Firma, aber kein Impressum-Treffer'],
    [{ nachweis_art: 'email', domain: 'brush-zahn.com', domain_verifiziert_at: jetzt, impressum_geprueft_at: jetzt, firma_bestaetigt_at: jetzt }, true, 'E-Mail + Impressum + Zustimmung der Firma'],
    [{ nachweis_art: 'dns', domain: 'brush-zahn.com', domain_verifiziert_at: jetzt, impressum_geprueft_at: null }, true, 'DNS braucht weder Impressum noch Firma'],
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
function holeBlock(anfang, ende) {
    const a = SEITE.indexOf('        ' + anfang);
    if (a === -1) throw new Error('Block nicht gefunden: ' + anfang);
    return SEITE.slice(a, SEITE.indexOf('\n' + ende + '\n', a) + ende.length + 1);
}
const escQuelle = hole('esc');
function lade(lang, kontoDaten) {
    const quelle = [
        "var document = { documentElement: { lang: '" + lang + "' } };",
        'var kontoDaten = ' + JSON.stringify(kontoDaten) + ';',
        hole('abL'), escQuelle, holeVar('SUPPORT_MAIL'), holeVar('HAKEN'),
        hole('nachweisZeile'), hole('wegFirmenadresse'), hole('wegManuell'),
        hole('freischaltText'), hole('freischaltMailto'),
        // Stufen beim E-Mail-Weg. domainPanel und abLocale sind hier nur
        // Attrappen — geprueft wird der Text der Stufen, nicht das DNS-Panel.
        'function domainPanel() { return "<div>DNS</div>"; }',
        'function abLocale() { return "de-DE"; }',
        'var firmaStand = ' + JSON.stringify((kontoDaten && kontoDaten.__stand) || null) + ';',
        'var firmaMeldung = ' + JSON.stringify((kontoDaten && kontoDaten.__meldung) || '') + ';',
        hole('stufe'), hole('stufenInhalt'), hole('fmtTag'), holeBlock('var FIRMA_GRUND = {', '        };'), hole('firmaInhalt'),
        'return { nachweisZeile, wegFirmenadresse, wegManuell, freischaltText, freischaltMailto, stufenInhalt, firmaInhalt };',
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
const zf = z({ nachgewiesen: true, nachweisArt: 'email', domain: 'brush-zahn.com', impressumUrl: 'https://brush-zahn.com/impressum', firmaEmail: 'info@brush-zahn.com' });
ok(zf.includes('Firma hat zugestimmt') && zf.includes('info@brush-zahn.com'), 'E-Mail-Weg: Kopfzeile nennt die Zustimmung und die Adresse');
ok(!z({ nachgewiesen: true, nachweisArt: 'dns', domain: 'x.de' }).includes('Firma hat zugestimmt'), 'Gegenprobe: ohne Zustimmung keine solche Marke');

gruppe('Stufen beim E-Mail-Weg');
const EM = { betrieb: 'Walder GmbH', domain: 'walder.com', nachweisArt: 'email', nachgewiesen: false,
    impressumUrl: '', impressumEmails: [], betriebId: 'x', kontoEmail: 'azubi@walder.com' };
const s1 = lade('de', EM).stufenInhalt(EM);
ok(s1.includes('id="abkImpBtn"') && s1.includes('id="abkImpErgebnis"'), 'ohne Impressum: Knopf + Ergebnisfeld in Schritt 2');
ok(s1.includes('is-spaeter') && !s1.includes('id="abkFirma"'), 'Schritt 3 wartet, solange das Impressum fehlt');
ok((s1.match(/class="abk-stufe /g) || []).length === 3, 'genau drei Schritte');
ok(!s1.includes('So ein Postfach kann jeder anlegen') && !s1.includes('Sie haben eine Firmenadresse?'),
    'Rueckfall-Weg ohne die Saetze fuer Freemail-Konten');
ok(s1.includes('abkMailKopieren'), 'Rueckfall-Weg (Freischaltung per Mail) ist erreichbar');
const EM2 = Object.assign({}, EM, { impressumUrl: 'https://walder.com/impressum', impressumEmails: ['info@walder.com'] });
const s2 = lade('de', EM2).stufenInhalt(EM2);
ok(s2.includes('id="abkFirma"') && !s2.includes('id="abkImpBtn"'), 'mit Impressum: Schritt 3 aktiv, kein Impressum-Knopf mehr');
ok((s2.match(/abk-stufe is-ok/g) || []).length === 2, 'zwei Schritte erledigt');
const boeseS = Object.assign({}, EM, { betrieb: '<img src=x onerror=1>', domain: '"><b>' });
const s3 = lade('de', boeseS).stufenInhalt(boeseS);
ok(!s3.includes('<img') && !s3.includes('"><b>'), 'Betriebsname und Domain escaped');
ok(s3.includes('&lt;img'), 'Gegenprobe: der Name kam ueberhaupt an');

gruppe('Zustimmung der Firma — Schritt 3');
const fi = (d) => lade('de', d).firmaInhalt(d);
const eine = fi(EM2);
ok(eine.includes('Anfrage an info@walder.com senden') && !eine.includes('type="radio"'), 'eine Adresse: direkter Knopf, keine Auswahl');
const zwei = fi(Object.assign({}, EM2, { impressumEmails: ['info@walder.com', 'buero@walder.com'] }));
ok((zwei.match(/type="radio"/g) || []).length === 2 && (zwei.match(/ checked/g) || []).length === 1, 'zwei Adressen: Auswahl, erste vorgewaehlt');
ok(fi(Object.assign({}, EM2, { impressumEmails: [] })).includes('keine E-Mail-Adresse gefunden'), 'keine Adresse: Hinweis auf den manuellen Weg');
const offen = fi(Object.assign({}, EM2, { __stand: { zustand: 'offen', an: 'info@walder.com', erstellt_at: '2026-09-25T10:00:00Z', laeuft_ab_at: '2026-10-02T10:00:00Z' } }));
ok(offen.includes('<b>info@walder.com</b>') && offen.includes('Erneut senden') && offen.includes('Stand prüfen'), 'offene Anfrage: Adresse, Stand pruefen, erneut senden');
ok(fi(Object.assign({}, EM2, { __stand: { zustand: 'abgelehnt', an: 'info@walder.com', entschieden_at: '2026-09-25T10:00:00Z' } })).includes('abgelehnt'), 'Ablehnung wird genannt');
ok(fi(Object.assign({}, EM2, { __stand: { zustand: 'abgelaufen', an: 'info@walder.com' } })).includes('abgelaufen') , 'abgelaufene Anfrage: neu senden moeglich');
ok(fi(Object.assign({}, EM2, { __meldung: 'zu_oft' })).includes('drei Anfragen'), 'Mengenbremse wird erklaert');
const xa = fi(Object.assign({}, EM2, { impressumEmails: ['a"><img src=x>@x.de', 'b@x.de'] }));
ok(!xa.includes('<img'), 'Adresse aus dem Impressum escaped (kommt von einer fremden Website)');

gruppe('Link fuer die Firma: erst lesen, dann auf Klick entscheiden');
const bf = SEITE.slice(SEITE.indexOf('        async function bootFirma('), SEITE.indexOf('        window.abfEntscheiden'));
ok(bf.length > 200, 'bootFirma gefunden');
ok(bf.includes("firmaAntwort(token, 'lesen')") && !/'ja'|'nein'/.test(bf), 'beim Oeffnen nur lesen — ein Mail-Scanner bestaetigt nichts');
const ent = SEITE.slice(SEITE.indexOf('        window.abfEntscheiden'), SEITE.indexOf('        // ── Start'));
ok(ent.includes("ja ? 'ja' : 'nein'") && ent.includes('replaceState'), 'Entscheidung erst im Klick-Handler, danach Token aus der Adresszeile');
const bootQ = SEITE.slice(SEITE.indexOf('        async function boot()'));
ok(bootQ.indexOf('firma=') > -1 && bootQ.indexOf('firma=') < bootQ.indexOf('[#&]w='), '#firma= wird vor #w= und vor dem Konto-Weg ausgewertet');
ok(B2B.slice(B2B.indexOf('async function bhb2bFirmaAntwort'), B2B.indexOf('/** Pruefung anstossen')).includes('fetch(') &&
   !B2B.slice(B2B.indexOf('async function bhb2bFirmaAntwort'), B2B.indexOf('/** Pruefung anstossen')).includes('client()'),
   'die Firma laedt keine Supabase-Bibliothek, nur ein fetch');

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
ok(dz.includes('st.firmaEmail'), 'domainZeile nennt die Zustimmung der Firma');


console.log(`\nbetrieb-nachweis: ${bestanden} ok, ${fehler} fehlgeschlagen`);
if (bestanden < 20 || fehler) process.exit(1);
