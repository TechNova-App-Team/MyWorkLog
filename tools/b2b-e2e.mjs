// End-to-End-Durchlauf des B2B-Berichtshefts gegen die ECHTE Supabase.
//
// Bewusst KEIN *.test.mjs — laeuft nicht in run-tests.mjs / der CI (braucht Netz
// und zwei bestaetigte Konten). Zweck: vor einem Deploy, der an RLS, RPCs oder
// den Query-Formen etwas aendert, einmal gegen den echten Server pruefen.
//
//   npm run b2b:e2e
//
// Die vier Zugangsdaten stehen in einer Umgebungsvariable. Die zwei Testkonten
// (e2e-trainer@b2b-test.invalid / e2e-azubi@b2b-test.invalid) liegen dauerhaft
// im Auth-System; die Passwoerter stehen in .claude/notes/berichtsheft-b2b.md.
//
// Der Lauf raeumt sich selbst auf: der Testbetrieb wird per Cascade geloescht
// (Mitglieder, Einladungen, Berichte, Freigaben gehen mit). Die zwei Konten
// bleiben stehen.

import { readFileSync } from 'node:fs';

const cfg = readFileSync(new URL('../config/supabase-config.js', import.meta.url), 'utf8');
const BASE = cfg.match(/URL:\s*'([^']+)'/)[1];
const ANON = cfg.match(/ANON_KEY:\s*'([^']+)'/)[1];

const V = {
    trainerEmail: process.env.B2B_E2E_TRAINER_EMAIL || 'e2e-trainer@b2b-test.invalid',
    azubiEmail: process.env.B2B_E2E_AZUBI_EMAIL || 'e2e-azubi@b2b-test.invalid',
    trainerPw: process.env.B2B_E2E_TRAINER_PW,
    azubiPw: process.env.B2B_E2E_AZUBI_PW,
};
if (!V.trainerPw || !V.azubiPw) {
    console.log('uebersprungen — B2B_E2E_TRAINER_PW und/oder B2B_E2E_AZUBI_PW nicht gesetzt.');
    console.log('Passwoerter stehen in .claude/notes/berichtsheft-b2b.md.');
    process.exit(2);
}

let ok_ = 0, fehl = 0;
function ok(bed, name) {
    if (bed) { ok_++; console.log('  ok   ' + name); }
    else { fehl++; console.log('  FEHL ' + name); }
}

async function login(email, pw) {
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw }),
    });
    const j = await r.json();
    if (!j.access_token) throw new Error(`Login ${email}: ${j.error_description || j.msg || r.status}`);
    return j.access_token;
}
const uid = (tok) => JSON.parse(Buffer.from(tok.split('.')[1], 'base64url')).sub;

function rest(tok) {
    return async (path, opts = {}) => {
        const r = await fetch(`${BASE}/rest/v1/${path}`, {
            method: opts.method || 'GET',
            headers: {
                apikey: ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json',
                Prefer: opts.prefer || 'return=representation',
            },
            body: opts.body,
        });
        const t = await r.text();
        let body; try { body = t ? JSON.parse(t) : null; } catch { body = t; }
        return { status: r.status, body };
    };
}
async function rpc(tok, name, args) {
    const r = await fetch(`${BASE}/rest/v1/rpc/${name}`, {
        method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
    });
    const b = await r.json().catch(() => null);
    return { status: r.status, body: b };
}

console.log('B2B End-to-End gegen ' + BASE + '\n');

const trTok = await login(V.trainerEmail, V.trainerPw);
const azTok = await login(V.azubiEmail, V.azubiPw);
const tr = rest(trTok), az = rest(azTok);
const trId = uid(trTok), azId = uid(azTok);
ok(true, 'Login Ausbilder + Azubi');

const g = await rpc(trTok, 'betrieb_gruenden', { p_name: '__E2E__ ' + Date.now(), p_anzeige_name: 'E2E Ausbilder' });
ok(g.status === 200 && typeof g.body === 'string', 'betrieb_gruenden liefert eine betrieb_id');
const betriebId = g.body;

try {
    const st = await tr(`betrieb_mitglieder?user_id=eq.${trId}&betrieb_id=eq.${betriebId}&select=rolle`);
    ok(st.body?.[0]?.rolle === 'ausbilder', 'Gruender ist Ausbilder des Betriebs');

    const code = 'E2E-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const inv = await tr('einladungen', {
        method: 'POST', body: JSON.stringify({
            code, betrieb_id: betriebId, rolle: 'azubi', erstellt_von: trId,
            laeuft_ab: new Date(Date.now() + 864e5).toISOString(),
        }),
    });
    ok(inv.status === 201, 'Ausbilder legt einen Einladungscode an');

    const j = await rpc(azTok, 'einladung_einloesen', { p_code: code, p_anzeige_name: 'E2E Azubi' });
    ok(j.status === 200 && j.body === betriebId, 'einladung_einloesen verbindet den Azubi');

    const rp = await az('berichte', {
        method: 'POST', body: JSON.stringify({
            betrieb_id: betriebId, azubi_id: azId, client_id: 'e2e-1', jahr: 1, kw: 20,
            datum_von: '2026-05-11', datum_bis: '2026-05-15',
            inhalt: { activities: 'E2E Woche' }, status: 'complete', quelle: 'local',
        }),
    });
    ok(rp.status === 201, 'Azubi legt einen Bericht an');
    const berichtId = rp.body?.[0]?.id;

    const fake = await az('freigaben', {
        method: 'POST', body: JSON.stringify({
            bericht_id: berichtId, betrieb_id: betriebId, ausbilder_id: azId,
            entscheidung: 'approved', pruefsumme: 'x',
        }),
    });
    ok(fake.status >= 400, 'Azubi kann KEINE Freigabe schreiben (RLS)');

    const seen = await tr(`berichte?betrieb_id=eq.${betriebId}&select=id,client_id`);
    ok(Array.isArray(seen.body) && seen.body.some(b => b.client_id === 'e2e-1'),
        'Ausbilder sieht den Azubi-Bericht');

    const ap = await tr('freigaben', {
        method: 'POST', body: JSON.stringify({
            bericht_id: berichtId, betrieb_id: betriebId, ausbilder_id: trId,
            entscheidung: 'approved', anmerkung: 'E2E ok', pruefsumme: 'ps-1',
        }),
    });
    ok(ap.status === 201, 'Ausbilder schreibt eine Freigabe');
    const at = ap.body?.[0]?.erstellt_at;
    ok(at && Math.abs(Date.now() - new Date(at).getTime()) < 120000,
        'erstellt_at kommt vom Server-Trigger, nicht vom Client');

    await tr(`freigaben?bericht_id=eq.${berichtId}`, { method: 'PATCH', body: JSON.stringify({ anmerkung: 'HACK' }) });
    await tr(`freigaben?bericht_id=eq.${berichtId}`, { method: 'DELETE' });
    const still = await tr(`freigaben?bericht_id=eq.${berichtId}&select=anmerkung`);
    ok(still.body?.[0]?.anmerkung === 'E2E ok', 'Freigabe uebersteht UPDATE + DELETE (append-only)');

    const azSees = await az(`freigaben?bericht_id=eq.${berichtId}&select=entscheidung,pruefsumme`);
    ok(azSees.body?.[0]?.entscheidung === 'approved' && azSees.body?.[0]?.pruefsumme === 'ps-1',
        'Azubi sieht die Freigabe mit Pruefsumme');

    const fremd = await az(`betriebe?select=id`);
    ok(Array.isArray(fremd.body) && fremd.body.every(b => b.id === betriebId),
        'Azubi sieht ausschliesslich den eigenen Betrieb');
} finally {
    const rm = await tr(`betriebe?id=eq.${betriebId}`, { method: 'DELETE', prefer: 'return=minimal' });
    ok(rm.status === 204 || rm.status === 200, 'Aufraeumen: Testbetrieb geloescht (Cascade)');
}

console.log(`\nB2B-E2E: ${ok_} ok, ${fehl} fehlgeschlagen`);
process.exit(fehl ? 1 : 0);
