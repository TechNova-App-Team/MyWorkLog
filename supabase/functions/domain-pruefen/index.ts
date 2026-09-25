// Prueft den Domain-Nachweis eines Betriebs.
//
// WARUM SERVERSEITIG: Der Client koennte eine DNS-Abfrage auch selbst machen —
// aber dann wuerde er dem Server nur BEHAUPTEN, sie sei gelungen. Das Ergebnis
// muss deshalb hier entstehen, mit service_role geschrieben; ein Trigger auf
// `betriebe` haelt jeden Client-Schreibversuch auf `domain_verifiziert_at` ab.
//
// Nachweis: TXT-Eintrag auf  _myworklog.<domain>  mit dem Token des Betriebs.
//
// 🔴 Die Preflight-Liste MUSS `apikey` und `x-client-info` enthalten — die
// schickt supabase-js bei functions.invoke() immer mit. Fehlen sie, scheitert
// schon der OPTIONS-Aufruf und der Browser meldet nur "Failed to fetch",
// ohne dass die Funktion je gelaufen waere.

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

// Deno kann direkt aufloesen. Faellt das aus (gesperrter Port, kein Resolver),
// bleibt DNS-over-HTTPS als zweiter Weg — sonst haengt der Nachweis an einer
// Laufzeit-Eigenheit statt an der Wahrheit im DNS.
async function txtEintraege(name: string): Promise<string[]> {
  try {
    const r = await Deno.resolveDns(name, 'TXT');
    return r.map((teile) => teile.join(''));
  } catch (_) { /* weiter mit DoH */ }
  try {
    const r = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
      { headers: { accept: 'application/dns-json' } },
    );
    if (!r.ok) return [];
    const j = await r.json();
    return (j.Answer ?? [])
      .filter((a: { type: number }) => a.type === 16)
      .map((a: { data: string }) => String(a.data).replace(/^"|"$/g, '').replace(/" "/g, ''));
  } catch (_) {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ fehler: 'Nicht angemeldet' }, 401);

  let betriebId = '';
  try {
    betriebId = String(((await req.json()) ?? {}).betrieb_id ?? '');
  } catch (_) { /* unten abgefangen */ }
  if (!/^[0-9a-f-]{36}$/i.test(betriebId)) return json({ fehler: 'betrieb_id fehlt' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Ist der Aufrufer wirklich Ausbilder DIESES Betriebs? Mit SEINEM Token,
  //    damit die RLS-Regeln greifen — nicht mit service_role.
  const alsNutzer = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: nutzer } = await alsNutzer.auth.getUser();
  if (!nutzer?.user) return json({ fehler: 'Nicht angemeldet' }, 401);

  const { data: mitglied } = await alsNutzer
    .from('betrieb_mitglieder')
    .select('rolle')
    .eq('betrieb_id', betriebId)
    .eq('user_id', nutzer.user.id)
    .maybeSingle();
  if (!mitglied || mitglied.rolle !== 'ausbilder') {
    return json({ fehler: 'Nur ein Ausbilder dieses Betriebs darf pruefen.' }, 403);
  }

  // 2. Domain + Token lesen und im DNS nachsehen.
  const alsServer = createClient(url, service);
  const { data: betrieb } = await alsServer
    .from('betriebe')
    .select('domain, domain_token, nachweis_art')
    .eq('id', betriebId)
    .maybeSingle();
  if (!betrieb?.domain) return json({ fehler: 'Für diesen Betrieb ist keine Domain hinterlegt.' }, 400);

  const name = `_myworklog.${betrieb.domain}`;
  const eintraege = await txtEintraege(name);
  const treffer = eintraege.some((e) => e.trim() === betrieb.domain_token);

  if (!treffer) {
    return json({
      ok: false,
      geprueft: name,
      gefunden: eintraege.slice(0, 5),
      fehler: 'Kein passender TXT-Eintrag gefunden.',
    });
  }

  // 3. Nur jetzt — und nur von hier — wird der Nachweis gesetzt. Eine
  //    manuelle Pruefung (Rueckruf) ist staerker und bleibt stehen.
  const { error } = await alsServer
    .from('betriebe')
    .update({
      domain_verifiziert_at: new Date().toISOString(),
      nachweis_art: betrieb.nachweis_art === 'manuell' ? 'manuell' : 'dns',
    })
    .eq('id', betriebId);
  if (error) return json({ ok: false, fehler: error.message }, 500);

  return json({ ok: true, domain: betrieb.domain, geprueft: name });
});
