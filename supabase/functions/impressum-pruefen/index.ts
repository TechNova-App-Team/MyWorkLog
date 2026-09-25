// Prueft, ob der Betriebsname im Impressum der NACHGEWIESENEN Domain steht.
//
// Voraussetzung ist ein Domain-Nachweis (E-Mail oder DNS): nur dann ist klar,
// dass die Seite zu dieser Person gehoert. Das Impressum verbindet die Domain
// dann mit dem Namen — `brush-zahn.com` mit "Zahn Pinsel GmbH".
//
// Was es NICHT beweist: dass die Firma echt ist. Wer sich `zahn-pinsel.de`
// kauft und ein Impressum hineinschreibt, besteht diese Pruefung. Dagegen hilft
// nur die manuelle Freischaltung (Rueckruf an die oeffentliche Nummer).
//
// Abfragen ins Netz sind eine Angriffsflaeche (SSRF): nur http/https, nur die
// Domain selbst und www., Weiterleitungen einzeln geprueft, jede Zieladresse
// vorher aufgeloest und gegen private Netze gehalten, Groessen- und Zeitlimit.
//
// 🔴 Die Preflight-Liste MUSS `apikey` und `x-client-info` enthalten (wie bei
// domain-pruefen) — sonst "Failed to fetch" ohne Log.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { nameImImpressum, impressumLinks, istPrivateIp } from './abgleich.ts';

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

const MAX_BYTES = 1_500_000;
const MAX_ABRUFE = 8;
const ZEIT_MS = 6000;

async function adressen(host: string): Promise<string[]> {
  const aus: string[] = [];
  for (const typ of ['A', 'AAAA'] as const) {
    try { aus.push(...(await Deno.resolveDns(host, typ))); } catch (_) { /* weiter */ }
  }
  if (aus.length) return aus;
  // DoH als Rueckfall — wie in domain-pruefen.
  for (const typ of ['A', 'AAAA']) {
    try {
      const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${typ}`,
        { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(3000) });
      if (!r.ok) continue;
      const j = await r.json();
      for (const a of j.Answer ?? []) if (a.type === 1 || a.type === 28) aus.push(String(a.data));
    } catch (_) { /* weiter */ }
  }
  return aus;
}

async function hostSicher(host: string): Promise<boolean> {
  const ips = await adressen(host);
  return ips.length > 0 && ips.every((ip) => !istPrivateIp(ip));
}

type Seite = { url: string; html: string };

/** Holt eine Seite; folgt Weiterleitungen nur innerhalb der erlaubten Hosts. */
async function holen(start: string, erlaubt: (h: string) => boolean, zaehler: { n: number }): Promise<Seite | null> {
  let url = start;
  for (let sprung = 0; sprung < 4; sprung++) {
    if (zaehler.n >= MAX_ABRUFE) return null;
    let u: URL;
    try { u = new URL(url); } catch (_) { return null; }
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !erlaubt(u.hostname)) return null;
    if (u.port && u.port !== '443' && u.port !== '80') return null;
    if (!(await hostSicher(u.hostname))) return null;
    zaehler.n++;
    let r: Response;
    try {
      r = await fetch(u.href, {
        redirect: 'manual',
        signal: AbortSignal.timeout(ZEIT_MS),
        headers: { 'user-agent': 'MyWorkLog-Impressumpruefung/1.0 (+https://myworklog.de/ausbilder/)', accept: 'text/html' },
      });
    } catch (_) { return null; }
    if (r.status >= 300 && r.status < 400) {
      const ziel = r.headers.get('location');
      await r.body?.cancel();
      if (!ziel) return null;
      url = new URL(ziel, u.href).href;
      continue;
    }
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('html')) { await r.body?.cancel(); return null; }
    const leser = r.body?.getReader();
    if (!leser) return null;
    const teile: Uint8Array[] = [];
    let groesse = 0;
    while (true) {
      const { done, value } = await leser.read();
      if (done) break;
      groesse += value.length;
      if (groesse > MAX_BYTES) { await leser.cancel(); break; }
      teile.push(value);
    }
    const alles = new Uint8Array(Math.min(groesse, MAX_BYTES));
    let pos = 0;
    for (const t of teile) { alles.set(t.subarray(0, alles.length - pos), pos); pos += t.length; if (pos >= alles.length) break; }
    return { url: u.href, html: new TextDecoder('utf-8', { fatal: false }).decode(alles) };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ fehler: 'Nur POST' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return json({ fehler: 'Nicht angemeldet' }, 401);

  let betriebId = '';
  try { betriebId = String(((await req.json()) ?? {}).betrieb_id ?? ''); } catch (_) { /* unten */ }
  if (!/^[0-9a-f-]{36}$/i.test(betriebId)) return json({ fehler: 'betrieb_id fehlt' }, 400);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Ausbilder DIESES Betriebs? Mit seinem Token, damit RLS greift.
  const alsNutzer = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: nutzer } = await alsNutzer.auth.getUser();
  if (!nutzer?.user) return json({ fehler: 'Nicht angemeldet' }, 401);
  const { data: mitglied } = await alsNutzer.from('betrieb_mitglieder').select('rolle')
    .eq('betrieb_id', betriebId).eq('user_id', nutzer.user.id).maybeSingle();
  if (!mitglied || mitglied.rolle !== 'ausbilder') {
    return json({ fehler: 'Nur ein Ausbilder dieses Betriebs darf prüfen.' }, 403);
  }

  // 2. Nur eine NACHGEWIESENE Domain wird abgefragt.
  const alsServer = createClient(url, service);
  const { data: b } = await alsServer.from('betriebe')
    .select('name, domain, domain_verifiziert_at, nachweis_art').eq('id', betriebId).maybeSingle();
  if (!b?.domain || !b.domain_verifiziert_at) {
    return json({ ok: false, grund: 'keine_domain', fehler: 'Erst die Domain nachweisen, dann das Impressum.' }, 400);
  }
  const dom = String(b.domain).toLowerCase();
  const erlaubt = (h: string) => { const x = h.toLowerCase(); return x === dom || x === 'www.' + dom; };

  // 3. Feste Pfade zuerst, dann die Impressum-Links der Startseite.
  const zaehler = { n: 0 };
  const geprueft: string[] = [];
  let letzterGrund = 'nicht_erreichbar';
  const kandidaten = [`https://${dom}/impressum`, `https://www.${dom}/impressum`, `https://${dom}/impressum.html`];
  const versuchen = async (adresse: string) => {
    const s = await holen(adresse, erlaubt, zaehler);
    if (!s) return null;
    geprueft.push(s.url);
    const a = nameImImpressum(b.name, s.html);
    if (a.ok) return s.url;
    letzterGrund = a.grund;
    return null;
  };

  let treffer: string | null = null;
  for (const k of kandidaten) { treffer = await versuchen(k); if (treffer) break; }
  if (!treffer) {
    for (const startUrl of [`https://${dom}/`, `https://www.${dom}/`, `http://${dom}/`]) {
      const s = await holen(startUrl, erlaubt, zaehler);
      if (!s) continue;
      for (const l of impressumLinks(s.html, s.url, erlaubt)) {
        if (geprueft.includes(l)) continue;
        treffer = await versuchen(l);
        if (treffer) break;
      }
      break;
    }
  }

  if (!treffer) {
    return json({ ok: false, grund: letzterGrund, geprueft: geprueft.slice(0, 6), name: b.name, domain: dom });
  }

  // 4. Nur von hier wird der Treffer geschrieben (Trigger sperrt Clients).
  const { error } = await alsServer.from('betriebe')
    .update({ impressum_url: treffer.slice(0, 300), impressum_geprueft_at: new Date().toISOString() })
    .eq('id', betriebId);
  if (error) return json({ ok: false, fehler: error.message }, 500);
  return json({ ok: true, url: treffer, domain: dom });
});
