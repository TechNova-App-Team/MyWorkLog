// Nimmt die Antwort der FIRMA entgegen (Link aus der Mail von firma-anfragen,
// geoeffnet auf /ausbilder/#firma=<token>).
//
// Ohne Anmeldung (verify_jwt: false): die Person im Buero hat kein Konto, der
// Token IST die Berechtigung — 32 Zufallsbytes, in der Datenbank nur als Hash.
//
// Zwei Schritte statt einem Klick-Link: 'lesen' zeigt die Anfrage, erst 'ja'
// oder 'nein' entscheidet. Mail-Scanner (Outlook Safe Links & Co.) oeffnen
// jeden Link vorab — ein GET, der bestaetigt, waere von ihnen bestaetigt.
// Deshalb gibt es hier nur POST, und die Seite ruft 'ja' erst auf Klick.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, content-type, apikey, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function sha256Hex(s: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST' }, 405);

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch (_) { /* unten */ }
  const token = String(body.token ?? '');
  const aktion = String(body.aktion ?? 'lesen');
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) return json({ ok: false, zustand: 'unbekannt' }, 400);
  if (!['lesen', 'ja', 'nein'].includes(aktion)) return json({ fehler: 'aktion' }, 400);

  const alsServer = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const hash = await sha256Hex(token);
  const { data, error } = aktion === 'lesen'
    ? await alsServer.rpc('firma_anfrage_lesen', { p_token_hash: hash })
    : await alsServer.rpc('firma_anfrage_entscheiden', { p_token_hash: hash, p_ja: aktion === 'ja' });
  if (error) return json({ ok: false, fehler: error.message }, 500);
  return json(data ?? { ok: false, zustand: 'unbekannt' });
});
