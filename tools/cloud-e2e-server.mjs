// Ende-zu-Ende-Sync gegen die ECHTE Supabase pruefen — mit dem E2E-Testkonto
// (dasselbe wie npm run b2b:e2e). Kein *.test.mjs: braucht Netz und Passwort.
//
//   B2B_E2E_AZUBI_PW=… node tools/cloud-e2e-server.mjs
//
// Prueft, was die Unit-Tests nicht koennen: dass PostgREST die JSON-Pfad-Abfrage
// aus cloudZustand() versteht, dass RLS die Zeile durchlaesst, und dass auf dem
// Server wirklich nur Geheimtext liegt. Raeumt die Zeile am Ende wieder weg.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const cfg = readFileSync(new URL('../config/supabase-config.js', import.meta.url), 'utf8');
const BASE = cfg.match(/URL:\s*'([^']+)'/)[1];
const ANON = cfg.match(/ANON_KEY:\s*'([^']+)'/)[1];
const EMAIL = process.env.B2B_E2E_AZUBI_EMAIL || 'e2e-azubi@b2b-test.invalid';
const PW = process.env.B2B_E2E_AZUBI_PW;
if (!PW) { console.log('uebersprungen — B2B_E2E_AZUBI_PW nicht gesetzt (steht in .claude/notes/berichtsheft-b2b.md).'); process.exit(2); }

let ok_ = 0, fehl = 0;
const ok = (b, n) => { if (b) { ok_++; console.log('  ok   ' + n); } else { fehl++; console.log('  FEHL ' + n); } };

const ctx = { window: {}, document: { documentElement: { lang: 'de' } }, crypto: globalThis.crypto,
  TextEncoder, TextDecoder, btoa, atob, Blob, Response, CompressionStream, DecompressionStream, console };
vm.createContext(ctx);
vm.runInContext(readFileSync('Assets/js/Cloud/cloud-e2e.js', 'utf8'), ctx);
const E = ctx.window.MWLE2E;

const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PW }) });
const tok = (await r.json()).access_token;
if (!tok) { console.log('Login fehlgeschlagen'); process.exit(1); }
const uid = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url')).sub;
async function rest(path, opts = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { method: opts.method || 'GET',
    headers: { apikey: ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation' }, body: opts.body });
  const t = await res.text();
  return { status: res.status, body: t ? JSON.parse(t) : null };
}
// Genau die Spaltenliste aus supabase-integration.js#cloudZustand
const ZUSTAND = encodeURIComponent('id,encv:all_data->__mwl_e2e->>v,encs:all_data->__mwl_e2e->>salt');

const vorher = await rest(`users?id=eq.${uid}&select=id`);
if (vorher.body && vorher.body.length) { console.log('Testkonto hat schon eine users-Zeile — Abbruch, um nichts zu ueberschreiben.'); process.exit(1); }

try {
  console.log('\n▶ Klartext (wie vor v8.1.0)');
  await rest('users', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ id: uid, user_id: uid, all_data: { tg_pro_data: '{"x":1}' } }) });
  let z = await rest(`users?id=eq.${uid}&select=${ZUSTAND}`);
  ok(z.status === 200, 'JSON-Pfad-Abfrage wird angenommen (' + z.status + ')');
  ok(z.body[0] && z.body[0].encv === null, 'Klartext-Zeile: encv ist null → "klartext"');

  console.log('\n▶ Verschluesselt');
  const code = E._codeErzeugen();
  const s = await E._schluesselAusCode(code, null);
  const daten = { tg_pro_data: JSON.stringify({ entries: [{ info: 'Servertest Geheimnis' }] }) };
  const u = await E.verschluesseln(daten, s);
  const up = await rest('users', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({ id: uid, user_id: uid, all_data: { __mwl_e2e: u } }) });
  ok([200, 201, 204].includes(up.status), 'Upsert des Umschlags (' + up.status + ')');
  z = await rest(`users?id=eq.${uid}&select=${ZUSTAND}`);
  ok(z.body[0].encv === '1' && z.body[0].encs === u.salt, 'Zustand liefert Version und Salt, ohne den Geheimtext');
  const voll = await rest(`users?id=eq.${uid}&select=all_data`);
  const roh = JSON.stringify(voll.body[0].all_data);
  ok(!roh.includes('Geheimnis') && !roh.includes('tg_pro_data'), 'auf dem Server steht nur Geheimtext');
  const s2 = await E._schluesselAusCode(E._codeNormalisieren(E._codeAnzeigen(code).toLowerCase()), voll.body[0].all_data.__mwl_e2e.salt);
  const zurueck = await E.entschluesseln(voll.body[0].all_data.__mwl_e2e, s2.key);
  ok(JSON.stringify(zurueck) === JSON.stringify(daten), 'vom Server geholt und mit dem abgetippten Code entschluesselt');
} finally {
  const del = await rest(`users?id=eq.${uid}`, { method: 'DELETE', prefer: 'return=minimal' });
  const weg = await rest(`users?id=eq.${uid}&select=id`);
  ok(del.status === 204 && weg.body.length === 0, 'Testzeile wieder geloescht');
}
console.log(`\ncloud-e2e-server: ${ok_} ok, ${fehl} fehlgeschlagen`);
process.exit(fehl || ok_ < 6 ? 1 : 0);
