// Web-Push fuer die Berichtsheft-Erinnerung (Wochentag + Stunde frei waehlbar) und fuer
// Erinnerungen des Ausbilders an fehlende Wochen (seit 14.11.2026, v9.7.1).
//
// Aufrufe (POST, JSON):
//   {aktion:'faellig'}            Header x-mwl-cron   → stuendlich vom Zeitplan (pg_cron + pg_net):
//                                                      alle Abos, deren Tag + Stunde (Europe/Berlin)
//                                                      jetzt dran ist und die heute noch nichts bekamen
//   {aktion:'test', endpoint}     Header x-mwl-cron   → eine Probe an genau dieses Abo
//   {aktion:'ausbilder', id}      Authorization: Bearer <Nutzer-JWT>
//                                                    → die Erinnerung <id> an alle Geraete des Azubis;
//                                                      nur der Ausbilder, der sie angelegt hat, genau einmal
//
// Das Geheimnis fuer x-mwl-cron entsteht in der Datenbank (private.cron_geheimnis) und wird
// nur ueber erinnerung_cron_pruefen() verglichen. Der VAPID-Schluessel ist DERSELBE wie bei
// klassen-push (klassen_push_schluessel_lesen) — ein eigenes Paar wuerde jedes Abo, das der
// Browser mit dem bestehenden oeffentlichen Schluessel angelegt hat, ungueltig machen.
//
// Die Krypto-Helfer sind aus klassen-push KOPIERT, nicht importiert: die beiden Funktionen
// werden einzeln per MCP deployt, ein _shared-Ordner muesste bei jeder Aenderung in beide.
// Aendert sich dort etwas an verschluesseln()/vapid(), hier mitziehen.
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
  const klar = verbinde(enc.encode(text), new Uint8Array([2]));
  const geheim = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, klar));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return verbinde(salt, rs, new Uint8Array([asPub.length]), asPub, geheim);
}
async function vapid(endpoint: string, privat: CryptoKey, oeffentlich: string) {
  const kopf = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const inhalt = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'https://myworklog.de/' })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privat, enc.encode(kopf + '.' + inhalt));
  return `vapid t=${kopf}.${inhalt}.${b64u(sig)}, k=${oeffentlich}`;
}

const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
type Abo = { id: string; endpoint: string; p256dh: string; auth: string; sprache: string };

// Zeit in Berlin, unabhaengig von der Zeitzone des Servers.
function berlin(d = new Date()) {
  const t = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(d).map((p) => [p.type, p.value]));
  const tag = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(t.weekday);
  return { datum: `${t.year}-${t.month}-${t.day}`, tag, stunde: Number(t.hour) };
}
function kw(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const u = new Date(Date.UTC(y, m - 1, d));
  u.setUTCDate(u.getUTCDate() + 4 - (u.getUTCDay() || 7));
  return Math.ceil(((u.getTime() - Date.UTC(u.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}
// Montag/Dienstag: es geht um die VERGANGENE Woche, sonst um die laufende.
function wochenText(jetzt: { datum: string; tag: number }, en: boolean) {
  let iso = jetzt.datum;
  const vorige = jetzt.tag === 1 || jetzt.tag === 2;
  if (vorige) {
    const [y, m, d] = iso.split('-').map(Number);
    const u = new Date(Date.UTC(y, m - 1, d - 7));
    iso = u.toISOString().slice(0, 10);
  }
  const n = kw(iso);
  return en
    ? { title: `Report book: week ${n}`, body: vorige ? 'Last week is not written yet? A few sentences are enough, the assistant does the rest.' : 'Time for your weekly report. A few sentences are enough, the assistant does the rest.' }
    : { title: `Berichtsheft: KW ${n}`, body: vorige ? 'Die letzte Woche fehlt noch? Ein paar Sätze reichen, den Rest macht der Assistent.' : 'Zeit für deinen Wochenbericht. Ein paar Sätze reichen, den Rest macht der Assistent.' };
}

async function senden(db: ReturnType<typeof sb>, abos: Abo[], inhalt: (a: Abo) => Record<string, string>) {
  const { data: s } = await db.rpc('klassen_push_schluessel_lesen');
  if (!s || !s.jwk) return { gesendet: 0, weg: 0, fehler: abos.length, ok: [] as string[] };
  const privat = await crypto.subtle.importKey('jwk', s.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  let gesendet = 0, weg = 0, fehler = 0;
  const veraltet: string[] = [], ok: string[] = [];
  // In Paketen zu 50: ein Freitag um 13 Uhr kann viele Abos auf einmal faellig machen.
  for (let i = 0; i < abos.length; i += 50) {
    await Promise.all(abos.slice(i, i + 50).map(async (a) => {
      try {
        const r = await fetch(a.endpoint, {
          method: 'POST',
          headers: { Authorization: await vapid(a.endpoint, privat, s.oeffentlich), 'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream', TTL: String(12 * 3600), Urgency: 'normal' },
          body: await verschluesseln(JSON.stringify(inhalt(a)), a.p256dh, a.auth),
        });
        if (r.status === 404 || r.status === 410) { weg++; veraltet.push(a.id); }
        else if (r.ok) { gesendet++; ok.push(a.id); }
        else { fehler++; console.log('push', r.status, (await r.text()).slice(0, 200)); }
      } catch (e) { fehler++; console.log('push fehler', String(e)); }
    }));
  }
  if (veraltet.length) await db.from('erinnerung_push').delete().in('id', veraltet);
  return { gesendet, weg, fehler, ok };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST' }, 405);
  let body: { aktion?: string; id?: string; endpoint?: string } = {};
  try { body = await req.json(); } catch (_) { return json({ fehler: 'kein JSON' }, 400); }
  const db = sb();

  if (body.aktion === 'faellig' || body.aktion === 'test') {
    const { data: erlaubt } = await db.rpc('erinnerung_cron_pruefen', { p: req.headers.get('x-mwl-cron') ?? '' });
    if (erlaubt !== true) return json({ fehler: 'nicht_erlaubt' }, 403);
    const jetzt = berlin();
    // 🔴 Erst BEANSPRUCHEN (gesendet_am setzen, UPDATE … RETURNING), dann senden. Bis zum
    // ersten Test (14.11.2026) lief es andersherum: zwei Ausloesungen kurz nacheinander
    // schickten beide, weil das Abhaken erst nach dem Versand kam. Ein gescheiterter Versand
    // wird dadurch an diesem Tag nicht wiederholt — besser als dieselbe Erinnerung doppelt.
    const spalten = 'id, endpoint, p256dh, auth, sprache';
    const { data: abos, error } = body.aktion === 'test'
      ? await db.from('erinnerung_push').select(spalten).eq('endpoint', String(body.endpoint ?? ''))
      : await db.from('erinnerung_push').update({ gesendet_am: jetzt.datum })
          .eq('wochen_aktiv', true).eq('tag', jetzt.tag).eq('stunde', jetzt.stunde)
          .or(`gesendet_am.is.null,gesendet_am.lt.${jetzt.datum}`).select(spalten);
    if (error) return json({ fehler: error.message }, 500);
    const r = await senden(db, (abos ?? []) as Abo[], (a) => ({
      ...wochenText(jetzt, a.sprache === 'en'),
      tag: 'mwl-woche', url: (a.sprache === 'en' ? '/en' : '') + '/berichtsheft/',
    }));
    return json({ gesendet: r.gesendet, weg: r.weg, fehler: r.fehler, abos: (abos ?? []).length, berlin: jetzt });
  }

  if (body.aktion === 'ausbilder') {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
    const { data: u } = await db.auth.getUser(token);
    if (!u?.user) return json({ fehler: 'nicht_angemeldet' }, 401);
    const id = String(body.id ?? '');
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ fehler: 'id_ungueltig' }, 400);
    const { data: e } = await db.from('b2b_erinnerungen').select('id, azubi_id, ausbilder_id, ausbilder_name, wochen, gepusht_at').eq('id', id).maybeSingle();
    if (!e) return json({ fehler: 'unbekannt' }, 404);
    if (e.ausbilder_id !== u.user.id) return json({ fehler: 'nicht_erlaubt' }, 403);
    const { data: frei } = await db.from('b2b_erinnerungen').update({ gepusht_at: new Date().toISOString() })
      .eq('id', id).is('gepusht_at', null).select('id');
    if (!frei || !frei.length) return json({ gesendet: 0, schon: true });
    const { data: abos } = await db.from('erinnerung_push').select('id, endpoint, p256dh, auth, sprache').eq('user_id', e.azubi_id);
    const n = Array.isArray(e.wochen) ? e.wochen.length : 0;
    const r = await senden(db, (abos ?? []) as Abo[], (a) => {
      const en = a.sprache === 'en';
      const wer = e.ausbilder_name || (en ? 'Your trainer' : 'Dein Ausbilder');
      return {
        title: (en ? 'Reminder from ' : 'Erinnerung von ') + wer,
        body: !n ? (en ? 'No week of your report book has reached the company yet.' : 'Beim Betrieb ist noch keine Woche deines Berichtshefts angekommen.')
          : en ? (n === 1 ? 'One week is missing from your report book.' : n + ' weeks are missing from your report book.')
          : (n === 1 ? 'Im Berichtsheft fehlt eine Woche.' : 'Im Berichtsheft fehlen ' + n + ' Wochen.'),
        tag: 'mwl-ausbilder-' + e.id, url: (en ? '/en' : '') + '/berichtsheft/',
      };
    });
    return json({ gesendet: r.gesendet, weg: r.weg, fehler: r.fehler, abos: (abos ?? []).length });
  }

  return json({ fehler: 'aktion_unbekannt' }, 400);
});
