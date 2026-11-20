// ═══ AUSBILDER-DEMO TEST ═══
// Warum: /ausbilder/?demo laeuft LIVE fuer fremde Betriebe. Die Demo ist nur
// sicher, solange sie JEDE BHB2B-Funktion ersetzt (sonst erreicht ein Klick die
// produktive Supabase oder eine echte Stripe-Kasse) und solange Demo-Klicks
// nicht als echte Freigaben/Kaeufe gemessen werden (Kaufrate).
//
// Lauf: node tools/ausbilder-demo.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };
const DEMO = readFileSync('Assets/js/ausbilder-demo.js', 'utf8');
const SEITE = readFileSync('pages/ausbilder/index.html', 'utf8').split('\r\n').join('\n');

const dom = new JSDOM(
    '<!doctype html><html lang="de"><body><section id="abIntro"><div class="abi-start">' +
    '<a class="ab-cta" href="/?cloud=login&amp;back=ausbilder">x</a></div></section>' +
    '<main><section id="abKonto"></section></main></body></html>',
    { url: 'https://myworklog.de/ausbilder/?demo', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;

// Attrappe des echten Moduls: jede Funktion merkt sich, ob sie gerufen wurde.
const echtGerufen = [];
const attrappe = {};
['angemeldet', 'status', 'azubiBerichte', 'freigabeSchreiben', 'einladungErstellen', 'einladungLoeschen',
 'lizenzen', 'lizenzKasse', 'lizenzKaufAbholen', 'lizenzEntziehen', 'domainSetzen', 'abmelden',
 'mitgliedEntfernen', 'erinnerungPushen', 'eineKuenftigeNeueFunktion', 'fehlendeWochen', 'inhaltDiff'
].forEach(k => { attrappe[k] = function () { echtGerufen.push(k); return 'ECHT'; }; });
const original = Object.assign({}, attrappe);

const events = [];
w.mwlEvent = function (name, props) { events.push([name, props]); };

w.eval(DEMO);
ok('Demo stellt MWLAusbilderDemo bereit', typeof w.MWLAusbilderDemo === 'function');
w.MWLAusbilderDemo(attrappe);

// ── 1. Kein Weg zum echten Modul ─────────────────────────────────────
const ECHT = ['fehlendeWochen', 'inhaltDiff'];
const kandidaten = Object.keys(original).filter(k => ECHT.indexOf(k) === -1);
const nochEcht = kandidaten.filter(k => attrappe[k] === original[k]);
ok('jede Netz-Funktion ist ersetzt (' + kandidaten.length + ' geprueft)', nochEcht.length === 0);
ok('Gegenprobe: es gab ueberhaupt etwas zu ersetzen', kandidaten.length > 10);
ok('reine Rechenfunktionen bleiben echt', ECHT.every(k => attrappe[k] === original[k]));

let wirft = false;
try { attrappe.eineKuenftigeNeueFunktion(); } catch (e) { wirft = /Demo/.test(e.message); }
ok('unbekannte (auch kuenftige) Funktion wirft „in der Demo nicht möglich“', wirft);
wirft = false;
try { attrappe.einladungErstellen(); } catch (e) { wirft = true; }
ok('Einladen geht in der Demo nicht', wirft);

// ── 2. Daten und Kauf-Ablauf ohne Server ─────────────────────────────
const konto = await attrappe.azubiBerichte();
ok('drei erfundene Azubis mit Wochen', konto.azubis.length === 3 && konto.azubis.every(a => a.berichte.length > 0));
ok('es gibt offene Wochen zum Pruefen', konto.azubis.some(a => a.berichte.some(b => !b.freigabe && b.status === 'complete')));
const liz = await attrappe.lizenzen();
const zustaende = liz.lizenzen.map(l => l.zustand).sort().join(',');
ok('Paesse: aktiv, verlassen und frei sind zu sehen', zustaende === 'aktiv,frei,verlassen');
ok('mitPass enthaelt nur aktive', liz.mitPass.length === 1 && liz.mitPass[0] === 'demo-a1');
const kasse = await attrappe.lizenzKasse(['demo-a2'], 3);
ok('Kasse fuehrt NICHT zu Stripe, sondern zurueck auf die Demo', kasse.ok && kasse.url.indexOf('?demo&betriebkauf=') !== -1 && !/stripe/i.test(kasse.url));
const ab = await attrappe.lizenzKaufAbholen('cs_test_x');
const liz2 = await attrappe.lizenzen();
ok('nach dem Demo-Kauf hat Jonas einen Pass', ab.ok && liz2.mitPass.indexOf('demo-a2') !== -1);
ok('kein echter Aufruf ist passiert', echtGerufen.length === 0);

// ── 3. Messung ───────────────────────────────────────────────────────
ok('Demo-Start wird gemessen', events.some(e => e[0] === 'ausbilder_demo' && e[1].schritt === 'start'));
const vorher = events.length;
w.mwlEvent('firmenpass', { schritt: 'kasse' });
w.mwlEvent('b2b_freigabe', {});
ok('echte Ereignisse (Firmenpass, Freigabe) werden in der Demo verschluckt', events.length === vorher);
w.mwlEvent('ausbilder_demo', { schritt: 'x' });
ok('Gegenprobe: das Demo-Ereignis kommt durch', events.length === vorher + 1);

// ── 4. Band ──────────────────────────────────────────────────────────
const los = w.document.querySelector('.ab-demo-band .ab-demo-los');
ok('Band mit „Eigenen Betrieb einrichten“ steht vor dem Cockpit', !!los && w.document.querySelector('.ab-demo-band').nextElementSibling.id === 'abKonto');
ok('„Eigenen Betrieb einrichten“ fuehrt zum echten Anlegen', los && los.getAttribute('href') === '/?cloud=login&back=ausbilder');

// ── 5. Seite: Demo greift VOR jedem echten Weg ───────────────────────
const boot = SEITE.slice(SEITE.indexOf('        async function boot() {'), SEITE.indexOf('var nutzlast;'));
const iDemo = boot.indexOf('if (demoErlaubt()) { await demoStarten(); return; }');
ok('boot() startet die Demo', iDemo !== -1);
ok('… bevor der angemeldete Weg (echtes Konto) laufen kann', iDemo !== -1 && iDemo < boot.indexOf('BHB2B.angemeldet()'));
const iStart = SEITE.indexOf('function demoStarten()');
const starten = SEITE.slice(iStart, SEITE.indexOf('\n        }\n', iStart));
ok('demoStarten ersetzt BHB2B, BEVOR bootKonto laeuft',
   starten.indexOf('window.MWLAusbilderDemo(BHB2B)') !== -1 && starten.indexOf('window.MWLAusbilderDemo(BHB2B)') < starten.indexOf('await bootKonto()'));
ok('Einstieg hat den Knopf „Demo ansehen“', /<a class="abi-demo" href="\/ausbilder\/\?demo"/.test(SEITE));
// Die Adresse muss einen Inhalts-Hash tragen (SW liefert ?v= Cache-First);
// gestempelt wird nur ein src=" im HTML, deshalb steht sie im <template>.
ok('Demo-Adresse steht gestempelt im <template>', /<template id="abDemoSkript"><script src="\/Assets\/js\/ausbilder-demo\.js\?v=[0-9a-f]{6,}"><\/script><\/template>/.test(SEITE));
ok('demoStarten liest die Adresse aus dem <template>', starten.includes("getElementById('abDemoSkript')"));

console.log('\nausbilder-demo: ' + pass + ' ok, ' + fail + ' fehlgeschlagen');
process.exit(fail ? 1 : 0);
