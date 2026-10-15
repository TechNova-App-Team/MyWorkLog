// Verschickt eine Klassen-Mitteilung als Web-Push an alle Geraete der Klasse.
//
// WARUM: Bis v8.5.8 holte die App Mitteilungen nur, solange sie offen war (beim
// Oeffnen, hoechstens alle 10 min). Gemeldet 15.10.2026: "die Benachrichtigungen
// kommen nie bei Nutzern an". Jetzt ruft das Cockpit nach dem Senden diese Funktion.
//
// Aufrufe (POST, JSON):
//   {aktion:'schluessel'}            → {oeffentlich}  legt beim ersten Mal das VAPID-Paar an
//   {mitteilung_id:'<uuid>'}          → {gesendet, weg, fehler}  nur die Besitzerin der Klasse
//
// Ohne Bibliothek: Verschluesselung nach RFC 8291 (aes128gcm) und VAPID nach RFC 8292
// mit WebCrypto. Der private Schluessel liegt in private.push_schluessel und verlaesst
// diese Funktion nie.
//
// 🔴 Die Preflight-Liste MUSS `apikey` und `x-client-info` enthalten (siehe domain-pruefen).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = ''; for (const x of u) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64u = (s: string) => {
  const p = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(p), (c) => c.charCodeAt(0));
};
const verbinde = (...teile: Uint8Array[]) => {
  const out = new Uint8Array(teile.reduce((n, t) => n + t.length, 0));
  let o = 0; for (const t of teile) { out.set(t, o); o += t.length; }
  return out;
};
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, laenge: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, laenge * 8));
}

// RFC 8291: Inhalt fuer EIN Abo verschluesseln
async function verschluesseln(text: string, p256dh: string, authGeheim: string) {
  const ua = unb64u(p256dh), auth = unb64u(authGeheim);
  const eigen = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eigen.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const geteilt = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eigen.privateKey, 256));
  const ikm = await hkdf(auth, geteilt, verbinde(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const klar = verbinde(enc.encode(text), new Uint8Array([2]));   // 0x02 = letzter Datensatz
  const geheim = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, klar));
  const rs = new Uint8Array([0, 0, 16, 0]);                        // Datensatzgroesse 4096
  return verbinde(salt, rs, new Uint8Array([asPub.length]), asPub, geheim);
}

// RFC 8292: VAPID-JWT je Push-Dienst (aud = Ursprung des Endpunkts)
async function vapid(endpoint: string, privat: CryptoKey, oeffentlich: string) {
  const kopf = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const inhalt = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://myworklog.de/klasse/' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privat, enc.encode(kopf + '.' + inhalt));
  return `vapid t=${kopf}.${inhalt}.${b64u(sig)}, k=${oeffentlich}`;
}

const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

async function schluessel(db: ReturnType<typeof sb>) {
  const { data } = await db.rpc('klassen_push_schluessel_lesen');
  if (data && data.jwk) return data as { jwk: JsonWebKey; oeffentlich: string };
  const paar = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey('jwk', paar.privateKey);
  const oeffentlich = b64u(await crypto.subtle.exportKey('raw', paar.publicKey));
  await db.rpc('klassen_push_schluessel_setzen', { p_jwk: jwk, p_oeffentlich: oeffentlich });
  // Neu lesen: lief ein zweiter Aufruf gleichzeitig, gilt das Paar, das zuerst stand.
  const { data: d2 } = await db.rpc('klassen_push_schluessel_lesen');
  return d2 as { jwk: JsonWebKey; oeffentlich: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST' }, 405);
  let body: { aktion?: string; mitteilung_id?: string } = {};
  try { body = await req.json(); } catch (_) { return json({ fehler: 'kein JSON' }, 400); }
  const db = sb();

  if (body.aktion === 'schluessel') {
    const s = await schluessel(db);
    return json({ oeffentlich: s.oeffentlich });
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
  const { data: u } = await db.auth.getUser(token);
  if (!u?.user) return json({ fehler: 'nicht_angemeldet' }, 401);
  const id = String(body.mitteilung_id ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ fehler: 'mitteilung_ungueltig' }, 400);

  const { data: m } = await db.from('klassen_mitteilungen').select('id, klasse_id, text, gepusht_at').eq('id', id).maybeSingle();
  if (!m) return json({ fehler: 'mitteilung_unbekannt' }, 404);
  const { data: k } = await db.from('klassen').select('id, name, besitzer').eq('id', m.klasse_id).maybeSingle();
  if (!k || k.besitzer !== u.user.id) return json({ fehler: 'nicht_erlaubt' }, 403);
  // Genau einmal je Mitteilung: wer zuerst den Stempel setzt, verschickt.
  const { data: frei } = await db.from('klassen_mitteilungen').update({ gepusht_at: new Date().toISOString() })
    .eq('id', id).is('gepusht_at', null).select('id');
  if (!frei || !frei.length) return json({ gesendet: 0, schon: true });

  const s = await schluessel(db);
  const privat = await crypto.subtle.importKey('jwk', s.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const { data: abos } = await db.from('klassen_push').select('id, endpoint, p256dh, auth, sprache').eq('klasse_id', k.id);

  let gesendet = 0, weg = 0, fehler = 0;
  const veraltet: string[] = [];
  await Promise.all((abos ?? []).map(async (a) => {
    const en = a.sprache === 'en';
    const nutz = JSON.stringify({
      title: (en ? 'Message from ' : 'Mitteilung von ') + k.name,
      body: String(m.text).slice(0, 300),
      tag: 'klasse-' + m.id,
      url: (en ? '/en/' : '/') + '?klasse=mitteilung',
    });
    try {
      const r = await fetch(a.endpoint, {
        method: 'POST',
        headers: { Authorization: await vapid(a.endpoint, privat, s.oeffentlich), 'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream', TTL: String(3 * 24 * 3600), Urgency: 'normal' },
        body: await verschluesseln(nutz, a.p256dh, a.auth),
      });
      if (r.status === 404 || r.status === 410) { weg++; veraltet.push(a.id); }
      else if (r.ok) gesendet++;
      else { fehler++; console.log('push', r.status, (await r.text()).slice(0, 200)); }
    } catch (e) { fehler++; console.log('push fehler', String(e)); }
  }));
  if (veraltet.length) await db.from('klassen_push').delete().in('id', veraltet);
  return json({ gesendet, weg, fehler, abos: (abos ?? []).length });
});
