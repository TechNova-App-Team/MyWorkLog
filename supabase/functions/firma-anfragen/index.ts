// Schickt die Bitte um Bestaetigung an eine Adresse aus dem IMPRESSUM des
// Betriebs (Stufe 2 des Nachweises beim E-Mail-Weg).
//
// Warum ueberhaupt: eine Anmelde-Adresse @walder.com belegt nur ein Postfach.
// Ein Azubi mit eigener Firmenadresse kann sich damit als "Ausbilder" anlegen.
// Das Impressum-Postfach (info@ …) liest dagegen das Buero — dort sagt die
// FIRMA ja oder nein. Die Adresse waehlt der Ausbilder aus der Liste, die
// impressum-pruefen gefunden hat; eintippen kann er keine (die RPC prueft das).
//
// Versand ueber Brevo (Domain myworklog.de ist dort per DKIM authentifiziert).
// Secret: BREVO_API_KEY. Fehlt es, meldet die Funktion `versand_fehlt`, BEVOR
// eine Anfrage angelegt wird — sonst zaehlte ein Versuch ohne Mail gegen die
// Mengenbremse.
//
// 🔴 Die Preflight-Liste MUSS `apikey` und `x-client-info` enthalten (wie bei
// domain-pruefen) — sonst "Failed to fetch" ohne Log.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { anfrageMail } from './mail.ts';

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

function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '');
}

async function sha256Hex(s: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ fehler: 'Nicht angemeldet' }, 401);

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch (_) { /* unten */ }
  const betriebId = String(body.betrieb_id ?? '');
  const an = String(body.an ?? '').trim().toLowerCase();
  const en = body.sprache === 'en';
  if (!/^[0-9a-f-]{36}$/i.test(betriebId)) return json({ fehler: 'betrieb_id fehlt' }, 400);
  if (!an) return json({ ok: false, grund: 'adresse_fremd' }, 400);

  const brevo = Deno.env.get('BREVO_API_KEY') ?? '';
  if (!brevo) return json({ ok: false, grund: 'versand_fehlt' }, 503);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const alsNutzer = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: nutzer } = await alsNutzer.auth.getUser();
  if (!nutzer?.user) return json({ fehler: 'Nicht angemeldet' }, 401);

  // Der Token geht NUR in die Mail. In der Datenbank liegt sein Hash — wer
  // die Tabelle liest, kann damit nichts bestaetigen.
  const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await sha256Hex(token);

  const alsServer = createClient(url, service);
  const { data: anfrage, error } = await alsServer.rpc('firma_anfrage_anlegen', {
    p_betrieb: betriebId, p_user: nutzer.user.id, p_an: an, p_token_hash: hash,
  });
  if (error) return json({ ok: false, fehler: error.message }, 500);
  if (!anfrage?.ok) return json(anfrage ?? { ok: false }, anfrage?.grund === 'keine_rolle' ? 403 : 400);

  const seite = (Deno.env.get('SEITE_URL') ?? 'https://myworklog.de').replace(/[/]+$/, '');
  const link = seite + (en ? '/en/ausbilder/' : '/ausbilder/') + '#firma=' + token;
  const mail = anfrageMail({
    betrieb: anfrage.betrieb, domain: anfrage.domain,
    ausbilderName: anfrage.ausbilder_name ?? '', ausbilderEmail: anfrage.ausbilder_email ?? '',
    link, en,
  });

  let versandFehler = '';
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevo, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'MyWorkLog', email: Deno.env.get('MAIL_ABSENDER') ?? 'noreply@myworklog.de' },
        replyTo: { email: 'info@myworklog.de', name: 'MyWorkLog' },
        to: [{ email: anfrage.an }],
        subject: mail.betreff,
        textContent: mail.text,
        htmlContent: mail.html,
        tags: ['firma-bestaetigung'],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) versandFehler = 'Brevo ' + r.status + ': ' + (await r.text()).slice(0, 200);
  } catch (e) {
    versandFehler = String((e as Error)?.message ?? e);
  }

  if (versandFehler) {
    await alsServer.rpc('firma_anfrage_verwerfen', { p_token_hash: hash });
    console.error('[firma-anfragen] Versand:', versandFehler);
    return json({ ok: false, grund: 'versand_gescheitert' }, 502);
  }
  return json({ ok: true, an: anfrage.an });
});
