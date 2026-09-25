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
import { randomBytes, createHash } from 'node:crypto';

const cfg = readFileSync(new URL('../config/supabase-config.js', import.meta.url), 'utf8');
const BASE = cfg.match(/URL:\s*'([^']+)'/)[1];
const ANON = cfg.match(/ANON_KEY:\s*'([^']+)'/)[1];

const V = {
    trainerEmail: process.env.B2B_E2E_TRAINER_EMAIL || 'e2e-trainer@b2b-test.invalid',
    azubiEmail: process.env.B2B_E2E_AZUBI_EMAIL || 'e2e-azubi@b2b-test.invalid',
    trainerPw: process.env.B2B_E2E_TRAINER_PW,
    azubiPw: process.env.B2B_E2E_AZUBI_PW,
};
// Optional: nur damit laesst sich der Betrieb im Lauf ueber den Link der Firma
// freischalten (Stufe 2). Ohne ihn endet der Lauf nach den Sperr-Pruefungen.
const SERVICE_KEY = process.env.B2B_E2E_SERVICE_KEY || '';
class Ueberspringen extends Error {}
let uebersprungen = false;

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

    // ── Einladungscodes wegraeumen (Policy einl_delete) ──────────────────
    // Ein versehentlich erzeugter Code muss weg koennen. Ein EINGELOESTER
    // nicht: er belegt, auf welchem Weg der Azubi in den Betrieb kam.
    const wegCode = 'E2E-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    await tr('einladungen', {
        method: 'POST', body: JSON.stringify({
            code: wegCode, betrieb_id: betriebId, rolle: 'azubi', erstellt_von: trId,
            laeuft_ab: new Date(Date.now() + 864e5).toISOString(),
        }),
    });
    const codeWeg = await tr(`einladungen?code=eq.${wegCode}&benutzt_von=is.null`, { method: 'DELETE' });
    ok(Array.isArray(codeWeg.body) && codeWeg.body.length === 1, 'Ausbilder loescht einen unbenutzten Code');
    const wegNach = await tr(`einladungen?code=eq.${wegCode}&select=code`);
    ok((wegNach.body || []).length === 0, 'und er ist danach wirklich weg');

    // Der oben eingeloeste `code` darf NICHT verschwinden. PostgREST meldet
    // ein von RLS verworfenes DELETE nicht als Fehler, sondern als 0 Zeilen —
    // deshalb wird hier BEIDES geprueft.
    const benutztWeg = await tr(`einladungen?code=eq.${code}`, { method: 'DELETE' });
    ok(Array.isArray(benutztWeg.body) && benutztWeg.body.length === 0,
        'DELETE auf einen eingeloesten Code loescht nichts (Policy)');
    const nochDa = await tr(`einladungen?code=eq.${code}&select=code,benutzt_von`);
    ok((nochDa.body || []).length === 1 && nochDa.body[0].benutzt_von,
        'der eingeloeste Code steht weiterhin als Nachweis da');

    // Gegenprobe: der Azubi darf ueberhaupt keine Codes anfassen.
    const azWeg = await az(`einladungen?code=eq.${code}`, { method: 'DELETE' });
    ok(!Array.isArray(azWeg.body) || azWeg.body.length === 0,
        'Azubi kann keinen Code loeschen');

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

    // ── Betriebs-Nachweis: ohne ihn kein Abzeichnen ───────────────────────
    const ohne = await tr('freigaben', {
        method: 'POST', body: JSON.stringify({
            bericht_id: berichtId, betrieb_id: betriebId, ausbilder_id: trId,
            entscheidung: 'approved', pruefsumme: 'ps-0',
        }),
    });
    ok(ohne.status >= 400, 'Abzeichnen OHNE Betriebs-Nachweis wird abgelehnt (Policy)');

    await tr(`betriebe?id=eq.${betriebId}`, {
        method: 'PATCH', body: JSON.stringify({
            nachweis_art: 'manuell', nachweis_notiz: 'selbst', domain_verifiziert_at: new Date().toISOString(),
        }),
    });
    const nachFaelschung = await tr(`betriebe?id=eq.${betriebId}&select=nachweis_art,domain_verifiziert_at`);
    ok(nachFaelschung.status === 200 && nachFaelschung.body?.[0] &&
        nachFaelschung.body[0].nachweis_art === null && nachFaelschung.body[0].domain_verifiziert_at === null,
        'Client kann sich den Nachweis nicht selbst schreiben (Trigger)');

    const azRpc = await rpc(azTok, 'betrieb_domain_aus_email', { p_betrieb: betriebId });
    ok(azRpc.status >= 400, 'Azubi kann den Betrieb nicht per E-Mail bestaetigen');

    const kd = await rpc(trTok, 'konto_email_domain', {});
    const trDomain = V.trainerEmail.split('@')[1].toLowerCase();
    ok(kd.status === 200 && kd.body?.domain === trDomain && kd.body?.freemail === false,
        'konto_email_domain nennt die Domain der Anmelde-Adresse (' + trDomain + ')');

    const em = await rpc(trTok, 'betrieb_domain_aus_email', { p_betrieb: betriebId });
    ok(em.status === 200 && em.body?.ok === true && em.body?.domain === trDomain,
        'Ausbilder bestaetigt den Betrieb ueber die Firmenadresse');
    const nachEm = await tr(`betriebe?id=eq.${betriebId}&select=nachweis_art,domain,domain_verifiziert_at`);
    ok(nachEm.body?.[0]?.nachweis_art === 'email' && nachEm.body?.[0]?.domain === trDomain && !!nachEm.body?.[0]?.domain_verifiziert_at,
        'Nachweis steht mit Art, Domain und Zeitpunkt');

    // Impressum-Abgleich: die Test-Domain (.invalid) ist nie erreichbar — der
    // Lauf prueft Anmeldung, Rechte und dass NICHTS gesetzt wird.
    const imp = await fetch(`${BASE}/functions/v1/impressum-pruefen`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + trTok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ betrieb_id: betriebId }),
    }).then(r => r.json()).catch(() => null);
    ok(imp && imp.ok === false && imp.grund === 'nicht_erreichbar',
        'impressum-pruefen laeuft und meldet die unerreichbare Test-Domain ehrlich');
    const impAz = await fetch(`${BASE}/functions/v1/impressum-pruefen`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + azTok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ betrieb_id: betriebId }),
    });
    ok(impAz.status === 403, 'impressum-pruefen verweigert dem Azubi den Aufruf');

    // ── Stufe 1 + 2 (v7.6.1): die Firmenadresse ALLEIN reicht nicht ──────
    // Ein Azubi mit eigener Adresse @firma.de haette sie auch. Dazu gehoeren
    // der Name im Impressum und die Zustimmung der Firma ueber eine Adresse
    // aus dem Impressum.
    const nurEmail = await tr('freigaben', {
        method: 'POST', body: JSON.stringify({
            bericht_id: berichtId, betrieb_id: betriebId, ausbilder_id: trId,
            entscheidung: 'approved', pruefsumme: 'ps-e',
        }),
    });
    ok(nurEmail.status >= 400, 'Abzeichnen mit Firmenadresse allein wird abgelehnt (Impressum + Firma fehlen)');

    await tr(`betriebe?id=eq.${betriebId}`, {
        method: 'PATCH', body: JSON.stringify({
            impressum_url: 'https://x', impressum_geprueft_at: new Date().toISOString(),
            impressum_emails: ['ich@selbst.de'], firma_email: 'ich@selbst.de', firma_bestaetigt_at: new Date().toISOString(),
        }),
    });
    const nachFirmaFake = await tr(`betriebe?id=eq.${betriebId}&select=impressum_geprueft_at,impressum_emails,firma_bestaetigt_at`);
    ok(nachFirmaFake.status === 200 && nachFirmaFake.body?.[0] && nachFirmaFake.body[0].firma_bestaetigt_at === null &&
        nachFirmaFake.body[0].impressum_emails === null && nachFirmaFake.body[0].impressum_geprueft_at === null,
        'Client kann sich Impressum-Treffer und Zustimmung der Firma nicht selbst schreiben (Trigger)');

    const fsTr = await rpc(trTok, 'firma_anfrage_stand', { p_betrieb: betriebId });
    ok(fsTr.status === 200, 'Ausbilder liest den Stand der Anfrage an die Firma');
    const fsAz = await rpc(azTok, 'firma_anfrage_stand', { p_betrieb: betriebId });
    ok(fsAz.status >= 400, 'Azubi sieht den Stand der Anfrage nicht');
    const lesenDirekt = await rpc(trTok, 'firma_anfrage_lesen', { p_token_hash: 'x' });
    const entDirekt = await rpc(trTok, 'firma_anfrage_entscheiden', { p_token_hash: 'x', p_ja: true });
    const anlDirekt = await rpc(trTok, 'firma_anfrage_anlegen', { p_betrieb: betriebId, p_user: trId, p_an: 'a@b.de', p_token_hash: 'x' });
    ok(lesenDirekt.status >= 400 && entDirekt.status >= 400 && anlDirekt.status >= 400,
        'die Anfrage-RPCs sind fuer Clients gesperrt (nur die Edge Functions)');
    const fbUnbekannt = await fetch(`${BASE}/functions/v1/firma-bestaetigen`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'A'.repeat(43), aktion: 'ja' }),
    }).then(r => r.json()).catch(() => null);
    ok(fbUnbekannt && fbUnbekannt.ok === false && fbUnbekannt.zustand === 'unbekannt',
        'firma-bestaetigen: ein erfundener Token bestaetigt nichts');
    const faAz = await fetch(`${BASE}/functions/v1/firma-anfragen`, {
        method: 'POST',
        headers: { apikey: ANON, Authorization: 'Bearer ' + azTok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ betrieb_id: betriebId, an: 'info@b2b-test.invalid' }),
    }).then(r => r.json()).catch(() => null);
    ok(faAz && faAz.ok !== true, 'firma-anfragen verschickt nichts im Auftrag des Azubis (' + (faAz && faAz.grund) + ')');

    // Freischalten fuer den Rest des Laufs — ueber den ECHTEN Link der Firma.
    // Den Token kennt sonst nur das Postfach im Impressum; die Test-Domain
    // (.invalid) hat keins. Deshalb legt der Lauf die Anfrage mit dem
    // Service-Schluessel an und kennt so den Token.
    if (!SERVICE_KEY) throw new Ueberspringen();
    const svc = async (path, opts = {}) => {
        const r = await fetch(`${BASE}/rest/v1/${path}`, {
            method: opts.method || 'POST',
            headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY, 'Content-Type': 'application/json',
                Prefer: 'return=representation' },
            body: opts.body,
        });
        const t = await r.text();
        let body; try { body = t ? JSON.parse(t) : null; } catch { body = t; }
        return { status: r.status, body };
    };
    await svc(`betriebe?id=eq.${betriebId}`, {
        method: 'PATCH', body: JSON.stringify({
            impressum_url: 'https://b2b-test.invalid/impressum', impressum_geprueft_at: new Date().toISOString(),
            impressum_emails: ['info@b2b-test.invalid'],
        }),
    });
    const token = randomBytes(32).toString('base64url');
    const anl = await svc('rpc/firma_anfrage_anlegen', {
        body: JSON.stringify({ p_betrieb: betriebId, p_user: trId, p_an: 'info@b2b-test.invalid',
            p_token_hash: createHash('sha256').update(token).digest('hex') }),
    });
    ok(anl.status === 200 && anl.body?.ok === true, 'Anfrage an die Impressum-Adresse angelegt');
    const fb = (aktion) => fetch(`${BASE}/functions/v1/firma-bestaetigen`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, aktion }),
    }).then(r => r.json()).catch(() => null);
    const gelesen = await fb('lesen');
    ok(gelesen?.zustand === 'offen' && gelesen?.ausbilder_email === V.trainerEmail.toLowerCase(),
        'Firma sieht die offene Anfrage mit der Adresse des Ausbilders');
    const nachLesen = await tr(`betriebe?id=eq.${betriebId}&select=firma_bestaetigt_at`);
    ok(nachLesen.body?.[0]?.firma_bestaetigt_at === null, 'Lesen allein bestaetigt nichts (Mail-Scanner-Fall)');
    const ja = await fb('ja');
    ok(ja?.ok === true && ja?.zustand === 'bestaetigt', 'Firma bestaetigt ueber den Link');
    const nachJa = await tr(`betriebe?id=eq.${betriebId}&select=firma_email,firma_bestaetigt_at`);
    ok(nachJa.body?.[0]?.firma_email === 'info@b2b-test.invalid' && !!nachJa.body?.[0]?.firma_bestaetigt_at,
        'Betrieb traegt die Zustimmung der Firma');
    const nochmal = await fb('nein');
    ok(nochmal?.ok === false && nochmal?.zustand === 'bestaetigt', 'derselbe Link entscheidet kein zweites Mal');

    const ap = await tr('freigaben', {
        method: 'POST', body: JSON.stringify({
            bericht_id: berichtId, betrieb_id: betriebId, ausbilder_id: trId,
            entscheidung: 'approved', anmerkung: 'E2E ok', pruefsumme: 'ps-1',
            ausbilder_email: 'gefaelscht@example.com',
            betrieb_nachweis: { art: 'manuell' },
        }),
    });
    ok(ap.status === 201, 'Ausbilder schreibt eine Freigabe');
    const stempel = ap.body?.[0]?.betrieb_nachweis;
    ok(stempel && stempel.art === 'email' && stempel.impressum === true && stempel.firma === 'info@b2b-test.invalid',
        'Nachweis an der Freigabe stempelt der Server, nicht der Client: ' + JSON.stringify(stempel));
    ok(ap.body?.[0]?.ausbilder_email === V.trainerEmail.toLowerCase() || ap.body?.[0]?.ausbilder_email === V.trainerEmail,
        'Adresse des Abzeichnenden stempelt der Server, nicht der Client');
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

    // ── Momentaufnahme an der Freigabe (Grundlage des Aenderungsvergleichs) ──
    const snap = await tr(`freigaben?bericht_id=eq.${berichtId}&select=inhalt`);
    ok(snap.status === 200, 'Spalte freigaben.inhalt existiert und ist lesbar');

    const zweite = await tr('freigaben', {
        method: 'POST', body: JSON.stringify({
            bericht_id: berichtId, betrieb_id: betriebId, ausbilder_id: trId,
            entscheidung: 'rejected', anmerkung: 'E2E bitte KW-Angabe ergaenzen',
            pruefsumme: 'ps-2', prev_pruefsumme: 'ps-1',
            inhalt: { activities: 'E2E Woche' },
        }),
    });
    ok(zweite.status === 201 && zweite.body?.[0]?.inhalt?.activities === 'E2E Woche',
        'Entscheidung speichert den gesehenen Stand mit');

    // Der Azubi bessert nach — das ist der Fall, den der Vergleich zeigen soll.
    await az(`berichte?id=eq.${berichtId}`, {
        method: 'PATCH', body: JSON.stringify({ inhalt: { activities: 'E2E Woche, KW 20 ergaenzt' } }),
    });
    const nachher = await tr(`berichte?id=eq.${berichtId}&select=inhalt`);
    ok(nachher.body?.[0]?.inhalt?.activities === 'E2E Woche, KW 20 ergaenzt',
        'Ausbilder sieht den nachgebesserten Stand');
    ok(nachher.body[0].inhalt.activities !== zweite.body[0].inhalt.activities,
        'Vorher- und Nachher-Stand unterscheiden sich wirklich (sonst prueft der Vergleich nichts)');

    // ── Loeschen: Grabstein statt Hard-Delete, solange Freigaben haengen ──
    const grab = await az(`berichte?id=eq.${berichtId}`, {
        method: 'PATCH', body: JSON.stringify({ geloescht_at: '2001-01-01T00:00:00Z' }),
    });
    ok(grab.status === 200, 'Azubi darf seinen Bericht als geloescht markieren');
    const gz = grab.body?.[0]?.geloescht_at;
    ok(gz && Math.abs(Date.now() - new Date(gz).getTime()) < 120000,
        'geloescht_at kommt vom Server-Trigger, nicht vom Client (2001 wurde verworfen)');

    const nachGrab = await tr(`berichte?betrieb_id=eq.${betriebId}&geloescht_at=is.null&select=id`);
    ok(Array.isArray(nachGrab.body) && !nachGrab.body.some(b => b.id === berichtId),
        'Der Filter des Cockpits blendet den Grabstein aus');
    const freigabenDa = await tr(`freigaben?bericht_id=eq.${berichtId}&select=id`);
    ok((freigabenDa.body || []).length === 2,
        'Die Freigaben ueberleben den Grabstein (Nachweiskette des Ausbilders)');

    // Neu angelegt heisst wieder sichtbar — der Upsert muss den Grabstein loesen.
    await az(`berichte?id=eq.${berichtId}`, {
        method: 'PATCH', body: JSON.stringify({ geloescht_at: null }),
    });
    const wieder = await tr(`berichte?betrieb_id=eq.${betriebId}&geloescht_at=is.null&select=id`);
    ok((wieder.body || []).some(b => b.id === berichtId),
        'geloescht_at zuruecksetzen macht die Woche wieder sichtbar');

    // Ohne Freigaben faellt die Zeile ganz weg — der zweite Loeschweg.
    const frei = await az('berichte', {
        method: 'POST', body: JSON.stringify({
            betrieb_id: betriebId, azubi_id: azId, client_id: 'e2e-2', jahr: 1, kw: 21,
            datum_von: '2026-05-18', datum_bis: '2026-05-22',
            inhalt: { activities: 'ohne Freigabe' }, status: 'complete', quelle: 'local',
        }),
    });
    const freiId = frei.body?.[0]?.id;
    const hart = await az(`berichte?id=eq.${freiId}`, { method: 'DELETE', prefer: 'return=minimal' });
    ok(hart.status === 204 || hart.status === 200, 'Bericht ohne Freigabe wird hart geloescht');
    const weg = await tr(`berichte?id=eq.${freiId}&select=id`);
    ok((weg.body || []).length === 0, 'und ist danach auch fuer den Ausbilder weg');

    // ── Meldungen: was der Azubi loescht, sieht der Ausbilder ────────────
    // Geschrieben wird `bericht_ereignisse` NUR vom Trigger. Deshalb wird hier
    // nicht geprueft, ob ein Client die Zeile anlegt, sondern ob sie nach den
    // Loeschungen weiter oben von allein da ist.
    const ereig = await tr(`bericht_ereignisse?betrieb_id=eq.${betriebId}&select=id,art,kw,war_freigegeben&order=erstellt_at`);
    const arten = (ereig.body || []).map(e => e.art);
    ok(arten.includes('geloescht'), 'Soft-Delete erzeugt eine Meldung');
    ok(arten.includes('wiederhergestellt'), 'Wiederherstellen erzeugt eine Meldung');
    ok(arten.includes('endgueltig_geloescht'), 'Hard-Delete erzeugt eine Meldung');
    const warFrei = (ereig.body || []).find(e => e.art === 'geloescht');
    ok(warFrei && warFrei.war_freigegeben === true,
        'die geloeschte Woche wird als "war abgezeichnet" gemeldet');
    const hartMeldung = (ereig.body || []).find(e => e.art === 'endgueltig_geloescht');
    ok(hartMeldung && hartMeldung.kw === 21 && hartMeldung.war_freigegeben === false,
        'die Meldung traegt die KW der Woche, die es nicht mehr gibt');

    // Der Azubi sieht seine eigenen Meldungen, kann sie aber nicht anfassen.
    const azSieht = await az(`bericht_ereignisse?select=id`);
    ok((azSieht.body || []).length >= 3, 'Azubi sieht die Meldungen ueber seine eigenen Wochen');
    const azErfindet = await az('bericht_ereignisse', {
        method: 'POST', body: JSON.stringify({
            betrieb_id: betriebId, azubi_id: azId, art: 'wiederhergestellt',
        }),
    });
    ok(azErfindet.status >= 400, 'Azubi kann keine Meldung erfinden (kein INSERT)');
    const azLoescht = await az(`bericht_ereignisse?betrieb_id=eq.${betriebId}`, { method: 'DELETE' });
    ok(azLoescht.status >= 400 || (Array.isArray(azLoescht.body) && azLoescht.body.length === 0),
        'Azubi kann keine Meldung wegraeumen (kein DELETE)');
    const nochAlle = await tr(`bericht_ereignisse?betrieb_id=eq.${betriebId}&select=id`);
    ok((nochAlle.body || []).length === (ereig.body || []).length,
        'und es sind danach noch genauso viele da');

    // Quittieren: je Ausbilder eigener Lesestand.
    const ersteId = ereig.body[0].id;
    ok(typeof ersteId === 'string' && ersteId.length === 36,
        'die Meldungs-id kommt mit (sonst quittiert der Test ins Leere)');
    const quitt = await tr('ereignis_gesehen', {
        method: 'POST', body: JSON.stringify({ ereignis_id: ersteId, user_id: trId }),
    });
    ok(quitt.status === 201, 'Ausbilder quittiert eine Meldung');
    const azQuitt = await az('ereignis_gesehen', {
        method: 'POST', body: JSON.stringify({ ereignis_id: ersteId, user_id: azId }),
    });
    ok(azQuitt.status >= 400, 'Azubi kann nicht quittieren (nur Ausbilder)');

    // ── Urlaubsvertretung: zweiter Ausbilder ────────────────────────────
    const vertCode = 'E2E-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const vertInv = await tr('einladungen', {
        method: 'POST', body: JSON.stringify({
            code: vertCode, betrieb_id: betriebId, rolle: 'ausbilder', erstellt_von: trId,
            laeuft_ab: new Date(Date.now() + 864e5).toISOString(),
        }),
    });
    ok(vertInv.status === 201 && vertInv.body?.[0]?.rolle === 'ausbilder',
        'Ausbilder legt einen Vertretungscode an');

    // 🔴 Der teuerste Fall: ein Azubi, der an einen Vertretungscode kommt,
    // duerfte danach seine EIGENEN Wochen abzeichnen.
    const selbst = await rpc(azTok, 'einladung_einloesen', { p_code: vertCode, p_anzeige_name: 'E2E Azubi' });
    ok(selbst.status >= 400, 'Azubi kann sich mit einem Vertretungscode nicht selbst befoerdern');
    const rolleNoch = await tr(`betrieb_mitglieder?user_id=eq.${azId}&betrieb_id=eq.${betriebId}&select=rolle`);
    ok(rolleNoch.body?.[0]?.rolle === 'azubi', 'und er ist danach immer noch Azubi');

    // ── Bindungen aus dem Audit 2026-09-24 ───────────────────────────────
    // Jede Pruefung verlangt den RICHTIGEN Ablehnungsgrund: eine zufaellige
    // uuid scheitert sonst schon am Fremdschluessel, und der Test waere gruen,
    // ohne die Policy je erreicht zu haben.
    const fremdeId = crypto.randomUUID();

    // Freigabe fuer einen Bericht, der nicht zum Betrieb gehoert → RLS (42501),
    // nicht erst der Fremdschluessel (23503).
    const fremdFrei = await tr('freigaben', {
        method: 'POST', body: JSON.stringify({
            bericht_id: fremdeId, betrieb_id: betriebId, ausbilder_id: trId,
            entscheidung: 'approved', pruefsumme: 'x',
        }),
    });
    ok(fremdFrei.status >= 400 && fremdFrei.body?.code === '42501',
        'Freigabe nur fuer Berichte des eigenen Betriebs (RLS, nicht Fremdschluessel)');

    // Bericht in einen Betrieb schieben, in dem der Azubi nicht Mitglied ist.
    const schieb = await az(`berichte?id=eq.${berichtId}`, {
        method: 'PATCH', body: JSON.stringify({ betrieb_id: fremdeId }),
    });
    ok(schieb.status >= 400 && /verschoben/.test(schieb.body?.message || ''),
        'Azubi kann einen Bericht nicht in einen fremden Betrieb schieben (Trigger)');
    const nochHier = await tr(`berichte?id=eq.${berichtId}&select=betrieb_id`);
    ok(nochHier.body?.[0]?.betrieb_id === betriebId, 'und der Bericht steht weiter im Betrieb');

    // Mitglieder entstehen nur ueber die RPCs; direkt aendern kann der Ausbilder nichts.
    const befoerdern = await tr(`betrieb_mitglieder?betrieb_id=eq.${betriebId}&user_id=eq.${azId}`, {
        method: 'PATCH', body: JSON.stringify({ rolle: 'ausbilder' }),
    });
    ok(Array.isArray(befoerdern.body) && befoerdern.body.length === 0,
        'Ausbilder kann Mitgliedschaften nicht direkt umschreiben (keine UPDATE-Policy)');
    const rolleDanach = await tr(`betrieb_mitglieder?user_id=eq.${azId}&betrieb_id=eq.${betriebId}&select=rolle`);
    ok(rolleDanach.body?.[0]?.rolle === 'azubi', 'Gegenprobe: die Zeile ist sichtbar und unveraendert');

    // Der letzte Ausbilder darf nicht gehen, solange Azubis da sind.
    const raus = await tr(`betrieb_mitglieder?betrieb_id=eq.${betriebId}&user_id=eq.${trId}`, { method: 'DELETE' });
    ok(raus.status >= 400, 'der letzte Ausbilder kann den Betrieb nicht verlassen');
    const nochMitglied = await tr(`betrieb_mitglieder?user_id=eq.${trId}&betrieb_id=eq.${betriebId}&select=rolle`);
    ok(nochMitglied.body?.[0]?.rolle === 'ausbilder', 'und ist danach noch Ausbilder');
} catch (e) {
    if (!(e instanceof Ueberspringen)) throw e;
    uebersprungen = true;
} finally {
    const rm = await tr(`betriebe?id=eq.${betriebId}`, { method: 'DELETE', prefer: 'return=minimal' });
    ok(rm.status === 204 || rm.status === 200, 'Aufraeumen: Testbetrieb geloescht (Cascade)');
}

if (uebersprungen) {
    console.log('\nRest UEBERSPRUNGEN: ohne B2B_E2E_SERVICE_KEY laesst sich der Betrieb nicht ueber den');
    console.log('Link der Firma freischalten (der Token steht nur in der Mail). Schluessel: Supabase-');
    console.log('Dashboard → Project Settings → API → service_role. Nie committen.');
}
console.log(`\nB2B-E2E: ${ok_} ok, ${fehl} fehlgeschlagen${uebersprungen ? ', Rest uebersprungen' : ''}`);
process.exit(fehl ? 1 : uebersprungen ? 2 : 0);
