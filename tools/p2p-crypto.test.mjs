// ═══ P2P-KRYPTO TEST ═══
// Warum es diesen Test gibt: Bis v6.2.7 stand im Verbindungsdialog ein Haken
// "Ende-zu-Ende verschlüsseln", der nur sich selbst setzte. Gelesen hat ihn nie
// jemand wieder, `crypto.subtle` kam in p2p-sync.js kein einziges Mal vor —
// die Zusage war schlicht unwahr, und nichts im Code hat das gemeldet.
//
// Geprueft wird deshalb beides: dass die Ableitung wirklich rechnet (zwei
// unabhaengige Geraete, gleicher Schluessel, gleiche Pruefziffer, Dritter
// bekommt eine andere), und dass an der Verschluesselung niemand vorbeisenden
// kann — ein zweites `peer.send` an anderer Stelle wuerde sie still aushebeln.
//
// Lauf: node tools/p2p-crypto.test.mjs
import { readFileSync } from 'node:fs';

let pass = 0, fail = 0;
const ok = (n, c) => { c ? (pass++, console.log('  ok    ' + n)) : (fail++, console.log('  FEHLT ' + n)); };

const SRC = readFileSync('components/core/p2p-sync.js', 'utf8');

// ── Krypto-Block aus der Quelle schneiden ────────────────────────────────────
// Bewusst aus der echten Datei statt nachgebaut: ein Test gegen eine Kopie
// prueft die Kopie.
const START = '// === ENDE-ZU-ENDE-VERSCHLUESSELUNG ===';
const END = '// Zeigt den WAHREN Zustand';
const from = SRC.indexOf(START), to = SRC.indexOf(END);
if (from < 0 || to < 0) { console.error('Krypto-Block nicht gefunden — Marker geaendert?'); process.exit(1); }
const CRYPTO_SRC = SRC.slice(from, to);

// Ein "Geraet" = eigener p2pSync-Zustand, dieselben Funktionen aus der Quelle.
function makeDevice() {
  const p2pSync = { crypto: { keyPair: null, pub: null, key: null, sas: null, active: false } };
  const build = new Function('p2pSync', 'console', CRYPTO_SRC + `
    return { p2pCryptoInit, p2pCryptoDerive, p2pEncrypt, p2pDecrypt, p2pCryptoReset, p2pCryptoAvailable };
  `);
  const api = build(p2pSync, { log() {}, warn() {} });
  return { ...api, state: p2pSync };
}

console.log('\nSchluesselaustausch');

const host = makeDevice();
const client = makeDevice();

ok('crypto.subtle ist verfuegbar', host.p2pCryptoAvailable());

const hostPub = await host.p2pCryptoInit();
const clientPub = await client.p2pCryptoInit();

// Der oeffentliche Schluessel muss exportierbar sein, obwohl generateKey mit
// extractable=false aufgerufen wird. Die WebCrypto-Spec garantiert das nur fuer
// den oeffentlichen Teil — waere es anders, gaebe es gar keinen Code zum Senden.
ok('Host exportiert oeffentlichen Schluessel', typeof hostPub === 'string' && hostPub.length > 80);
ok('Client exportiert oeffentlichen Schluessel', typeof clientPub === 'string');
ok('beide Schluessel sind verschieden', hostPub !== clientPub);
ok('privater Schluessel ist nicht exportierbar', host.state.crypto.keyPair.privateKey.extractable === false);

ok('Host leitet ab', await host.p2pCryptoDerive(clientPub));
ok('Client leitet ab', await client.p2pCryptoDerive(hostPub));

// Das Salz enthaelt beide oeffentlichen Schluessel SORTIERT. Ohne die Sortierung
// rechnen Host und Client verschiedene Salze — die Ableitung liefe fehlerfrei
// durch, nur passte hinterher kein einziges Paket mehr auf.
ok('gleiche Pruefziffer auf beiden Seiten', host.state.crypto.sas === client.state.crypto.sas);
ok('Pruefziffer ist sechsstellig', /^\d{6}$/.test(host.state.crypto.sas || ''));
ok('Zustand ist aktiv', host.state.crypto.active && client.state.crypto.active);

console.log('\nUebertragung');

const msg = { type: 'sync-chunk', chunkIndex: 0, totalChunks: 1, entries: [{ id: 'e1', worked: 7.5, info: 'Notiz' }] };
const env = await host.p2pEncrypt(msg);

ok('Umschlag ist als verschluesselt markiert', env.e === 1 && typeof env.i === 'string' && typeof env.c === 'string');
ok('Klartext steht nicht im Umschlag', !JSON.stringify(env).includes('sync-chunk') && !JSON.stringify(env).includes('Notiz'));
ok('Client entschluesselt korrekt', JSON.stringify(await client.p2pDecrypt(env)) === JSON.stringify(msg));

// Zwei gleiche Nachrichten duerfen nicht denselben Geheimtext ergeben, sonst
// waere der IV wiederverwendet — bei AES-GCM ist das der Totalschaden.
const env2 = await host.p2pEncrypt(msg);
ok('jede Nachricht bekommt einen eigenen IV', env.i !== env2.i && env.c !== env2.c);

console.log('\nAngreifer in der Mitte');

// Ein Dritter faengt den Kopplungscode ab und schiebt seinen eigenen
// oeffentlichen Schluessel unter. Technisch klappt seine Verbindung — die
// Pruefziffer verraet ihn trotzdem, und genau dafuer steht sie im Dialog.
const mitm = makeDevice();
const mitmPub = await mitm.p2pCryptoInit();
const victim = makeDevice();
await victim.p2pCryptoInit();
await mitm.p2pCryptoDerive(victim.state.crypto.pub);
await victim.p2pCryptoDerive(mitmPub);

ok('Angreifer und Opfer verstehen sich technisch', victim.state.crypto.sas === mitm.state.crypto.sas);
ok('aber die Pruefziffer weicht vom echten Partner ab', victim.state.crypto.sas !== host.state.crypto.sas);

let broke = false;
try { await mitm.p2pDecrypt(env); } catch (e) { broke = true; }
ok('fremder Schluessel entschluesselt nicht', broke);

// Manipulierter Geheimtext muss auffliegen (GCM-Tag).
const tampered = { ...env, c: env.c.slice(0, -4) + (env.c.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA') };
let tamperFailed = false;
try { await client.p2pDecrypt(tampered); } catch (e) { tamperFailed = true; }
ok('veraenderter Geheimtext wird abgelehnt', tamperFailed);

console.log('\nZuruecksetzen');

host.p2pCryptoReset();
ok('Reset loescht Schluessel und Pruefziffer',
  host.state.crypto.active === false && host.state.crypto.key === null && host.state.crypto.sas === null);

console.log('\nKein Weg an der Verschluesselung vorbei');

// Das ist der eigentliche Regressionsschutz. Ein zweites `peer.send` irgendwo
// im Modul wuerde die Verschluesselung still umgehen — genau so ist der
// Heartbeat frueher am Krypto-Pfad vorbeigelaufen. Erlaubt ist GENAU eine
// Sendestelle, und die liegt in p2pSendMessage.
const sendCalls = [...SRC.matchAll(/^\s*(?:await\s+)?p2pSync\.peer\.send\(/gm)];
ok('genau eine Stelle ruft peer.send auf', sendCalls.length === 1);

const sendFn = SRC.slice(SRC.indexOf('function p2pSendMessage('), SRC.indexOf('// === MESSAGE HANDLER ==='));
ok('die Stelle liegt in p2pSendMessage', sendFn.includes('p2pSync.peer.send('));
ok('sie verschluesselt vorher', sendFn.includes('p2pEncrypt(msg)'));
ok('Heartbeat laeuft ueber p2pSendMessage', /heartbeatInterval[\s\S]{0,400}p2pSendMessage\(\{ type: 'heartbeat'/.test(SRC));

// Empfangsseite: bei aktiver Verschluesselung darf Klartext nicht durchrutschen.
ok('Empfang lehnt Klartext bei aktivem Schluessel ab',
  /crypto\.active[\s\S]{0,300}wire\.e !== 1[\s\S]{0,300}return;/.test(SRC));

// Und der tote Haken darf nicht zurueckkommen.
ok('kein p2pEncryption-Haken mehr im JS', !SRC.includes('p2pEncryption'));
const HTML = readFileSync('components/modals/modals.html', 'utf8');
ok('kein p2pEncryption-Haken mehr im Markup', !HTML.includes('p2pEncryption'));
ok('Pruefziffer steht im Assistenten', HTML.includes('id="p2pSasCode"'));

console.log(`\n${pass} ok, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
