// Verschluesseltes Backup: echter Code, echtes WebCrypto, jsdom fuer localStorage und Felder.
// Anlass 06.11.2026: restoreFullBackup loeschte erst alles und schrieb dann mit leerem catch.
// Aufruf: node tools/encrypted-backup.test.mjs
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';

const QUELLE = readFileSync(new URL('../components/core/encrypted-backup.js', import.meta.url), 'utf8').split('\r\n').join('\n');
const PW = 'Azubi-Heft-2026!';

let ok = 0, fehler = 0;
const pruefe = (b, n) => { if (b) { ok++; console.log('  OK    ' + n); } else { fehler++; console.log('  FAIL  ' + n); } };

function umgebung() {
  const dom = new JSDOM(`<!doctype html><body>
    <div id="importEncryptedBackupModal"></div>
    <div id="encryptedBackupModal"></div>
    <input id="importEncryptPasswordInput"><button id="importEncryptDecryptBtn">Los</button>
    <input id="encryptPasswordInput"><input id="encryptPasswordConfirmInput"><button id="encryptExportBtn">Los</button>
    </body>`, { url: 'http://localhost:5001/', runScripts: 'outside-only', virtualConsole: new VirtualConsole() });
  const w = dom.window;
  Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.Blob = Blob;
  w.meldungen = [];
  w.ereignisse = [];
  w.dateien = [];
  w.showCustomMessage = (titel, text, art) => w.meldungen.push({ titel, text, art });
  w.mwlEvent = (name, props) => w.ereignisse.push({ name, ...props });
  w.save = () => {};
  w.URL.createObjectURL = (b) => { w.dateien.push(b); return 'blob:x'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = () => {};
  w.eval('var data = { entries: [], settings: {} };');
  w.eval(QUELLE);
  return w;
}

const datei = (text) => ({ text: async () => text });
async function importiere(w, text, pw) {
  w.pendingEncryptedBackupFile = datei(text);
  w.document.getElementById('importEncryptPasswordInput').value = pw;
  await w.finalizeImportEncryptedBackup();
  return w.meldungen[w.meldungen.length - 1];
}
const backupV2 = (speicher) => JSON.stringify({ _backupVersion: 2, _keyCount: Object.keys(speicher).length, _localStorage: speicher });
async function wirft(fn) { try { await fn(); return null; } catch (e) { return e; } }

// ── Verschluesseln und Entschluesseln ──
{
  const w = umgebung();
  const klar = JSON.stringify({ text: 'Prüfung übermorgen, Größe 5 €' });
  const verschl = await w.encryptBackupData(klar, PW);
  pruefe(!verschl.includes('Prüfung'), 'die Datei enthält keinen Klartext');
  pruefe(await w.decryptBackupData(verschl, PW) === klar, 'Hin und zurück mit Umlauten');

  const gross = 'ä'.repeat(3 * 1024 * 1024);
  pruefe(await w.decryptBackupData(await w.encryptBackupData(gross, PW), PW) === gross, 'großes Backup (6 MB) ohne Stack-Überlauf');

  pruefe((await wirft(() => w.decryptBackupData(verschl, PW + 'x')))?.grund === 'passwort', 'falsches Passwort wird als solches erkannt');
  pruefe((await wirft(() => w.decryptBackupData('{"entries":[]}', PW)))?.grund === 'keine_datei', 'normales Backup wird als falsche Datei erkannt');
  pruefe((await wirft(() => w.decryptBackupData('kein json', PW)))?.grund === 'keine_datei', 'kaputte Datei wird als falsche Datei erkannt');

  const o = JSON.parse(verschl);
  const kaputt = JSON.stringify({ ...o, data: o.data.startsWith('A') ? 'B' + o.data.slice(1) : 'A' + o.data.slice(1) });
  pruefe(!!(await wirft(() => w.decryptBackupData(kaputt, PW))), 'veränderte Datei wird abgelehnt');

  const fremd = await wirft(() => w.decryptBackupData(JSON.stringify({ ...o, v: 99 }), PW));
  pruefe(fremd && !fremd.grund, 'unbekannte Version ist kein Passwortfehler');
}

// ── Der ganze Weg: Export-Knopf, dann Import-Knopf ──
{
  const w = umgebung();
  w.localStorage.setItem('tg_pro_data', JSON.stringify({ entries: [{ d: 1 }], settings: { a: 1 } }));
  w.localStorage.setItem('mwl_tasks_states', '{"x":true}');
  w.localStorage.setItem('p2p_deviceId', 'geraet-a');
  w.document.getElementById('encryptPasswordInput').value = PW;
  w.document.getElementById('encryptPasswordConfirmInput').value = PW;
  await w.exportEncryptedBackup();
  pruefe(w.dateien.length === 1, 'Export erzeugt genau eine Datei');
  const text = await w.dateien[0].text();

  w.localStorage.clear();
  w.localStorage.setItem('tg_pro_data', JSON.stringify({ entries: [], settings: { neu: 1 } }));
  w.ereignisse.length = 0;

  const falsch = await importiere(w, text, 'Falsch-Falsch-1');
  pruefe(falsch.titel.includes('Falsches Passwort'), 'Import mit falschem Passwort sagt das');
  pruefe(w.ereignisse.some(e => e.grund === 'entschluesseln'), 'und zählt es als Passwortfehler');
  pruefe(JSON.parse(w.localStorage.getItem('tg_pro_data')).settings.neu === 1, 'falsches Passwort lässt die Daten stehen');

  const richtig = await importiere(w, text, PW);
  pruefe(richtig.art === 'success', 'Import mit richtigem Passwort gelingt');
  pruefe(JSON.parse(w.localStorage.getItem('tg_pro_data')).settings.a === 1, 'tg_pro_data ist wiederhergestellt');
  pruefe(w.localStorage.getItem('mwl_tasks_states') === '{"x":true}', 'andere Schlüssel sind wiederhergestellt');
  pruefe(w.eval('data').settings.a === 1, 'data im Speicher zeigt den neuen Stand');
  pruefe(w.localStorage.getItem('p2p_deviceId') === null, 'Geräte-Kennung wandert nicht mit');
}

// ── Scheitert das Einspielen, bleibt alles wie vorher ──
{
  const w = umgebung();
  w.localStorage.setItem('tg_pro_data', JSON.stringify({ entries: [{ alt: 1 }], settings: {} }));
  w.localStorage.setItem('alter_schluessel', 'bleibt');
  const voll = await w.encryptBackupData(backupV2({ tg_pro_data: '{"entries":[],"settings":{"neu":1}}', zu_gross: 'x' }), PW);

  const echt = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function (k, v) {
    if (k === 'zu_gross') throw new w.DOMException('voll', 'QuotaExceededError');
    return echt.call(this, k, v);
  };
  const m = await importiere(w, voll, PW);
  w.Storage.prototype.setItem = echt;
  pruefe(m.art === 'error', 'Speicher voll: keine Erfolgsmeldung');
  pruefe(JSON.parse(w.localStorage.getItem('tg_pro_data')).entries[0]?.alt === 1, 'Speicher voll: alte Daten sind noch da');
  pruefe(w.localStorage.getItem('alter_schluessel') === 'bleibt', 'Speicher voll: alte Nebenschlüssel sind noch da');
  pruefe(w.localStorage.getItem('zu_gross') === null, 'Speicher voll: nichts halb Eingespieltes bleibt liegen');
}
{
  const w = umgebung();
  w.localStorage.setItem('tg_pro_data', JSON.stringify({ entries: [{ alt: 1 }], settings: {} }));
  w.localStorage.setItem('alter_schluessel', 'bleibt');
  const m = await importiere(w, await w.encryptBackupData(backupV2({ tg_pro_data: '{kaputt', sonst: '1' }), PW), PW);
  pruefe(m.art === 'error', 'kaputtes tg_pro_data im Backup: keine Erfolgsmeldung');
  pruefe(JSON.parse(w.localStorage.getItem('tg_pro_data')).entries[0]?.alt === 1, 'kaputtes tg_pro_data im Backup: alte Daten sind noch da');
  pruefe(w.localStorage.getItem('alter_schluessel') === 'bleibt', 'kaputtes tg_pro_data im Backup: alte Nebenschlüssel sind noch da');
}

pruefe(!QUELLE.includes('[DEBUG]'), 'keine Debug-Ausgaben rund um das Passwort');
pruefe(QUELLE.includes('function exportEncryptedBackup'), 'Gegenprobe: die geprüfte Quelle ist die richtige');

console.log('\n' + ok + ' ok, ' + fehler + ' fehlgeschlagen');
process.exit(fehler ? 1 : 0);
