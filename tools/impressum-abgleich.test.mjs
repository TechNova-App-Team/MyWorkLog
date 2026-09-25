// Impressum-Abgleich der Edge Function `impressum-pruefen`.
// Laedt das echte Modul (Node >= 22.18 streift die TypeScript-Typen selbst ab).
//
//   node tools/impressum-abgleich.test.mjs

import {
    namensKern, normalisieren, nameImImpressum, istImpressum,
    impressumLinks, istPrivateIp, entitaetenAufloesen,
} from '../supabase/functions/impressum-pruefen/abgleich.ts';

let bestanden = 0, fehler = 0;
function ok(bed, name) {
    if (bed) { bestanden++; }
    else { fehler++; console.log('  FEHL ' + name); }
}

// ── 1. Namenskern ───────────────────────────────────────────────────────
const kerne = [
    ['Zahn Pinsel GmbH', 'zahn pinsel'],
    ['Zahn Pinsel GmbH & Co. KG', 'zahn pinsel'],
    ['Müller Bau UG (haftungsbeschränkt)', 'mueller bau'],
    ['Schreinerei Weiß e.K.', 'schreinerei weiss'],
    ['Meier & Söhne OHG', 'meier und soehne'],
    ['Schmidt & Co. KG', 'schmidt'],
    ['Elektro Köhler', 'elektro koehler'],
    ['  bäckerei   KRÜGER gmbh ', 'baeckerei krueger'],
];
for (const [ein, soll] of kerne) ok(namensKern(ein) === soll, `Kern "${ein}" -> "${namensKern(ein)}" (soll "${soll}")`);

// ── 2. Normalisierung + Entitaeten ──────────────────────────────────────
ok(normalisieren('M&uuml;ller&nbsp;Bau&amp;Co') === 'mueller bau und co', 'Entitaeten + Umlaute');
ok(entitaetenAufloesen('&#252;&#xFC;') === 'üü', 'numerische Entitaeten');
ok(normalisieren('Weiß-Straße 5') === 'weiss strasse 5', 'Eszett + Bindestrich');

// ── 3. Der Fall aus der Anfrage: Name passt NICHT zur Domain ────────────
const impressumBrush = `<html><head><title>Impressum</title><style>.x{}</style></head><body>
  <nav><a href="/">Start</a></nav>
  <h1>Impressum</h1><p>Angaben gemäß § 5 DDG</p>
  <p><strong>Zahn&nbsp;Pinsel GmbH</strong><br>Musterweg 1<br>12345 Musterstadt</p>
  <p>Handelsregister: HRB 12345, Amtsgericht Musterstadt</p></body></html>`;
ok(nameImImpressum('Zahn Pinsel GmbH', impressumBrush).ok === true, 'Zahn Pinsel GmbH auf brush-zahn.com wird gefunden');
ok(nameImImpressum('Zahn Pinsel GmbH & Co. KG', impressumBrush).ok === true, 'andere Rechtsform desselben Namens passt');
ok(nameImImpressum('zahn pinsel', impressumBrush).ok === true, 'klein ohne Rechtsform passt');

// ── 4. Negativfaelle — jeder mit Gegenprobe oben (3.) ───────────────────
const r1 = nameImImpressum('Bosch GmbH', impressumBrush);
ok(r1.ok === false && r1.grund === 'name_fehlt', 'fremder Name: name_fehlt');
const r2 = nameImImpressum('Zahn Pinsel Bau GmbH', impressumBrush);
ok(r2.ok === false, 'laengerer Name passt nicht auf kuerzeren Eintrag');
const r3 = nameImImpressum('Pinsel', impressumBrush.replace('Zahn&nbsp;Pinsel', 'Zahnpinsel'));
ok(r3.ok === false, 'Wortteil ist kein Treffer (Pinsel in Zahnpinsel)');
const r4 = nameImImpressum('Bau GmbH', impressumBrush);
ok(r4.ok === false && r4.grund === 'name_zu_kurz', 'Kern unter 4 Zeichen: kein Urteil');
const startseite = '<html><body><h1>Willkommen bei Zahn Pinsel GmbH</h1><p>Wir putzen.</p></body></html>';
const r5 = nameImImpressum('Zahn Pinsel GmbH', startseite);
ok(r5.ok === false && r5.grund === 'kein_impressum', 'Name auf Startseite ohne Impressum-Merkmal zaehlt nicht');
const imKommentar = '<html><body><h1>Impressum</h1><!-- Zahn Pinsel GmbH --><p>Andere Firma AG</p></body></html>';
ok(nameImImpressum('Zahn Pinsel GmbH', imKommentar).ok === false, 'Name im HTML-Kommentar zaehlt nicht');
const imSkript = '<html><body><h1>Impressum</h1><script>var n="Zahn Pinsel GmbH"</script><p>Andere AG</p></body></html>';
ok(nameImImpressum('Zahn Pinsel GmbH', imSkript).ok === false, 'Name im Skript zaehlt nicht');
const imAttribut = '<html><body><h1>Impressum</h1><img alt="Zahn Pinsel GmbH"><p>Andere AG</p></body></html>';
ok(nameImImpressum('Zahn Pinsel GmbH', imAttribut).ok === false, 'Name nur im Attribut zaehlt nicht');
ok(istImpressum(seitenText_(impressumBrush)) && !istImpressum('Willkommen'), 'Impressum-Erkennung beidseitig');

function seitenText_(h) { return h.replace(/<[^>]*>/g, ' '); }

// ── 5. Links auf der Startseite ─────────────────────────────────────────
const erlaubt = (h) => h === 'brush-zahn.com' || h === 'www.brush-zahn.com';
const start = `<a href="/leistungen">Leistungen</a>
  <a href="/rechtliches/impressum.html">Impressum</a>
  <a href="https://www.brush-zahn.com/legal">Rechtliches</a>
  <a href="https://evil.example/impressum">Impressum</a>
  <a href="/ueber-uns">Über uns</a><a href="/kontakt"><span>Impressum</span></a>`;
const links = impressumLinks(start, 'https://brush-zahn.com/', erlaubt);
ok(links.includes('https://brush-zahn.com/rechtliches/impressum.html'), 'relativer Impressum-Link');
ok(links.includes('https://www.brush-zahn.com/legal'), 'www-Host erlaubt');
ok(!links.some((l) => l.includes('evil.example')), 'fremder Host ausgeschlossen');
ok(links.length > 0 && links.length <= 3, 'es gibt Treffer, hoechstens drei');

// ── 6. Keine Abfragen ins interne Netz ──────────────────────────────────
const privat = ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.5.5', '169.254.169.254', '0.0.0.0',
    '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', 'kaputt'];
const oeffentlich = ['93.184.216.34', '172.32.0.1', '8.8.8.8', '2606:4700::1111'];
for (const ip of privat) ok(istPrivateIp(ip) === true, 'privat: ' + ip);
for (const ip of oeffentlich) ok(istPrivateIp(ip) === false, 'oeffentlich: ' + ip);

console.log(`impressum-abgleich: ${bestanden} bestanden, ${fehler} fehlgeschlagen`);
if (bestanden === 0 || fehler) process.exit(1);
