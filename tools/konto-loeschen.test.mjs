// Konto loeschen (seit 10/2026): prueft SupabaseCloudSync.prototype.kontoLoeschen
// gegen eine Supabase-Attrappe — Erfolg, Ausbilder-Sperre, Netzfehler — und dass
// der Knopf in der Gefahrenzone auf die richtige Funktion zeigt.
// Die Datenbank-Seite (RPC public.konto_loeschen) ist am 09.10.2026 in einer
// zurueckgerollten Transaktion gegen die echte Datenbank geprueft worden.
//   node tools/konto-loeschen.test.mjs
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  OK    ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const lies = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').split('\r\n').join('\n');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
const w = dom.window;
w.eval(lies('Assets/js/Cloud/supabase-integration.js'));
const loeschen = w.SupabaseCloudSync.prototype.kontoLoeschen;
ok(typeof loeschen === 'function', 'kontoLoeschen existiert am Prototyp');

function attrappe(rpcAntwort) {
  const spur = { rpc: [], signOut: 0, vergessen: [], zustand: [], events: [] };
  const self = {
    user: { id: 'u-1', email: 'a@b.de' }, session: {},
    client: {
      rpc: async (name) => { spur.rpc.push(name); return rpcAntwort; },
      auth: { signOut: async (o) => { spur.signOut++; spur.scope = o && o.scope; if (rpcAntwort.signOutWirft) throw new Error('403'); return {}; } },
    },
    onAuthStateChanged: (a, b) => spur.zustand.push([a, b]),
  };
  w.MWLE2E = { vergessen: async (uid) => spur.vergessen.push(uid) };
  w.mwlEvent = (n, p) => spur.events.push([n, p]);
  return { self, spur };
}

console.log('── Erfolg ──');
{
  const { self, spur } = attrappe({ error: null, signOutWirft: true });
  const r = await loeschen.call(self);
  ok(r.ok === true, 'liefert ok');
  ok(spur.rpc.join() === 'konto_loeschen', `ruft genau die RPC konto_loeschen: ${spur.rpc}`);
  ok(spur.vergessen.join() === 'u-1', 'vergisst den E2E-Schluessel dieses Kontos');
  ok(spur.signOut === 1 && spur.scope === 'local', 'meldet NUR lokal ab (scope local)');
  ok(self.user === null && self.session === null, 'Sitzung im Speicher geleert, obwohl signOut warf');
  ok(spur.zustand.length === 1 && spur.zustand[0][0] === false, 'meldet „abgemeldet“ an die Oberflaeche');
  ok(spur.events.some(([n, p]) => n === 'konto' && p.aktion === 'geloescht' && Object.keys(p).length === 1), 'Ereignis ohne Inhalte (nur aktion)');
}

console.log('── Ausbilder-Sperre ──');
{
  const { self, spur } = attrappe({ error: { message: 'ausbilder_freigaben', hint: 'per Mail' } });
  const r = await loeschen.call(self);
  ok(r.ok === false && r.grund === 'ausbilder' && r.hinweis === 'per Mail', `grund ausbilder: ${JSON.stringify(r)}`);
  ok(self.user !== null && spur.signOut === 0 && spur.vergessen.length === 0, 'bleibt angemeldet, Schluessel bleibt');
  const b = attrappe({ error: { message: 'betrieb_mit_mitgliedern' } });
  ok((await loeschen.call(b.self)).grund === 'ausbilder', 'Betrieb mit Mitgliedern → ebenfalls ausbilder');
}

console.log('── Fehler / abgemeldet ──');
{
  const { self } = attrappe({ error: { message: 'Failed to fetch' } });
  const r = await loeschen.call(self);
  ok(r.ok === false && r.grund === 'fehler' && self.user !== null, 'Netzfehler → fehler, bleibt angemeldet');
  const ab = attrappe({ error: null });
  ab.self.user = null;
  ok((await loeschen.call(ab.self)).grund === 'abgemeldet' && ab.spur.rpc.length === 0, 'ohne Anmeldung keine RPC');
}

console.log('── Knoepfe in der Gefahrenzone ──');
{
  // Kommentare raus: der Kopf der Gefahrenzone ERKLAERT den alten Namen.
  const html = lies('components/modals/modals.html').replace(/<!--[\s\S]*?-->/g, '');
  const zone = html.slice(html.indexOf('class="danger-zone"'), html.indexOf('danger-zone-footer'));
  ok(/id="btnDeleteAccount"[^>]*onclick="confirmAndDeleteAccount\(\)"/.test(zone), 'btnDeleteAccount → confirmAndDeleteAccount()');
  ok(/id="btnDeleteLocal"[^>]*onclick="confirmAndClearLocalData\(\)"/.test(zone), 'btnDeleteLocal → confirmAndClearLocalData()');
  ok(!zone.includes('Konto und Daten löschen'), 'keine Beschriftung mehr, die Konto verspricht und nur lokal loescht');
  ok(zone.length > 200, 'Gegenprobe: Gefahrenzone gefunden');
  ok(/function confirmAndDeleteAccount\(/.test(lies('components/core/settings-panel.js')), 'confirmAndDeleteAccount ist definiert');
}

console.log(`\nKonto loeschen: ${pass} ok, ${fail} fehlgeschlagen`);
if (pass < 10) { console.log('zu wenige Pruefungen gelaufen'); process.exit(1); }
process.exit(fail ? 1 : 0);
