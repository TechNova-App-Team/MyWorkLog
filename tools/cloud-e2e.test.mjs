// Ende-zu-Ende-Verschluesselung des Cloud-Syncs (Assets/js/Cloud/cloud-e2e.js).
//
//   node tools/cloud-e2e.test.mjs
//
// Prueft die Krypto und den Code ohne Browser (Node 22 bringt WebCrypto und
// CompressionStream mit) und statisch, dass der Upload keinen Klartext mehr
// schreibt. Die Dialoge laufen hier nicht — die stehen im Browser.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let ok = 0, fehler = 0;
function ist(b, name) { if (b) { ok++; console.log('  ok    ' + name); } else { fehler++; console.log('  FEHLT ' + name); } }

const QUELLE = readFileSync('Assets/js/Cloud/cloud-e2e.js', 'utf8');
const ctx = { window: {}, document: { documentElement: { lang: 'de' } }, crypto: globalThis.crypto,
  TextEncoder, TextDecoder, btoa, atob, Blob, Response, CompressionStream, DecompressionStream, console };
vm.createContext(ctx);
vm.runInContext(QUELLE, ctx);
const E = ctx.window.MWLE2E;

console.log('\n▶ Code');
const codes = Array.from({ length: 300 }, () => E._codeErzeugen());
ist(codes.every(c => c.length === 24), 'jeder Code hat 24 Zeichen');
ist(codes.every(c => /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]+$/.test(c)), 'nur Crockford-Zeichen (kein I, L, O, U)');
ist(new Set(codes).size === codes.length, '300 Codes, keiner doppelt');
const zeichen = new Set(codes.join(''));
ist(zeichen.size === 32, 'alle 32 Zeichen kommen vor (kein abgeschnittenes Alphabet)');

console.log('\n▶ Abtippen wird verziehen');
const c = codes[0];
const anzeige = E._codeAnzeigen(c);
ist(anzeige.split('-').length === 6, 'Anzeige in 6 Vierergruppen');
ist(E._codeNormalisieren(anzeige) === c, 'mit Bindestrichen');
ist(E._codeNormalisieren(' ' + anzeige.toLowerCase().replace(/-/g, ' ') + ' ') === c, 'klein und mit Leerzeichen');
const mitNull = c.replace(/0/g, 'O');
ist(c.indexOf('0') < 0 || E._codeNormalisieren(mitNull) === c, 'O statt 0');
const mitEins = c.replace(/1/g, 'l');
ist(c.indexOf('1') < 0 || E._codeNormalisieren(mitEins) === c, 'l statt 1');
ist(E._codeNormalisieren(c.slice(0, 23)) === null, 'zu kurz → null');
ist(E._codeNormalisieren('U' + c.slice(1)) === null, 'U ist ein echter Tippfehler → null');
ist(E._codeNormalisieren('') === null && E._codeNormalisieren(null) === null, 'leer → null');

console.log('\n▶ Verschluesseln und zurueck');
const daten = { tg_pro_data: JSON.stringify({ entries: [{ date: '2026-10-02', info: 'Geheimnis Überstunden' }] }), mwl_x: 'ä ö ü ß' };
const s = await E._schluesselAusCode(c, null);
const u = await E.verschluesseln(daten, s);
ist(u.v === 1 && u.kdf === 'PBKDF2-SHA256' && u.it >= 100000, 'Umschlag traegt Version und KDF');
ist(typeof u.salt === 'string' && typeof u.iv === 'string' && typeof u.ct === 'string', 'Salt, IV, Geheimtext als Base64');
ist(u.z === 1, 'komprimiert');
const roh = Buffer.from(u.ct, 'base64').toString('latin1');
ist(!roh.includes('Geheimnis') && !JSON.stringify(u).includes('Geheimnis'), 'Inhalt steht nirgends im Klartext');
ist(JSON.stringify(u).includes('tg_pro_data') === false, 'auch die Schluesselnamen nicht');
const zurueck = await E.entschluesseln(u, s.key);
ist(JSON.stringify(zurueck) === JSON.stringify(daten), 'Rundweg ergibt exakt dieselben Daten (mit Umlauten)');

const u2 = await E.verschluesseln(daten, s);
ist(u2.iv !== u.iv && u2.ct !== u.ct, 'jeder Upload mit frischem IV');
ist(u2.salt === u.salt, 'derselbe Code behaelt seinen Salt');

console.log('\n▶ Falscher Code wird erkannt');
const s2 = await E._schluesselAusCode(codes[1], u.salt);
let wirft = false;
try { await E.entschluesseln(u, s2.key); } catch (e) { wirft = true; }
ist(wirft, 'anderer Code → Entschluesseln wirft (GCM-Pruefsumme)');
const s3 = await E._schluesselAusCode(c, u.salt);
ist(JSON.stringify(await E.entschluesseln(u, s3.key)) === JSON.stringify(daten), 'derselbe Code auf einem anderen Geraet (Salt aus der Cloud) → passt');
const kaputt = Object.assign({}, u, { ct: u.ct.slice(0, -8) + 'AAAAAAA=' });
let wirft2 = false;
try { await E.entschluesseln(kaputt, s.key); } catch (e) { wirft2 = true; }
ist(wirft2, 'veraenderter Geheimtext → wirft statt Muell zu liefern');

console.log('\n▶ Klartext von vor v8.1.0 wird erkannt');
ist(E.istUmschlag({ [E.UMSCHLAG]: u }) === true, 'Umschlag erkannt');
ist(E.istUmschlag({ tg_pro_data: '{}' }) === false, 'alter Klartext ist kein Umschlag');
ist(E.istUmschlag(null) === false, 'null ist kein Umschlag');

console.log('\n▶ Upload schreibt keinen Klartext mehr (statisch)');
const SI = readFileSync('Assets/js/Cloud/supabase-integration.js', 'utf8').split('\r\n').join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(z => z.replace(/^\s*\/\/.*$/, '')).join('\n');
const up = SI.slice(SI.indexOf('async uploadToCloud()'), SI.indexOf('async cloudZustand()'));
ist(up.length > 500, 'Gegenprobe: uploadToCloud gefunden');
ist(!/all_data:\s*allData/.test(up), 'kein "all_data: allData" mehr');
ist(/all_data:\s*\{\s*\[window\.MWLE2E\.UMSCHLAG\]:\s*umschlag\s*\}/.test(up), 'all_data ist nur der Umschlag');
ist(up.indexOf('schluesselFuerUpload') > -1 && up.indexOf('schluesselFuerUpload') < up.indexOf('.upsert('), 'Schluessel wird VOR dem Upsert geholt (ohne Schluessel kein Upload)');
const down = SI.slice(SI.indexOf('async downloadFromCloud()'), SI.indexOf('async deleteCloudData()'));
ist(down.indexOf('entschluesseln') > -1 && down.indexOf('entschluesseln') < down.indexOf('localStorage.setItem'), 'Download entschluesselt, bevor er schreibt');
ist(/vergessen\(this\.user\.id\)/.test(SI), 'Abmelden nimmt den Schluessel vom Geraet');

const T = readFileSync('index.template.html', 'utf8');
const iE = T.indexOf('/Assets/js/Cloud/cloud-e2e.js'), iS = T.indexOf('/Assets/js/Cloud/supabase-integration.js');
ist(iE > -1 && iE < iS, 'cloud-e2e.js wird vor supabase-integration.js geladen');

console.log(`\ncloud-e2e: ${ok} ok, ${fehler} fehlgeschlagen`);
if (ok < 20) process.exit(1);
process.exit(fehler ? 1 : 0);
