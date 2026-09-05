// ═══════════════════════════════════════════════════════════════════
//  BH-B2B MODULE — Betrieb, Rollen, serverseitige Freigabe
// ═══════════════════════════════════════════════════════════════════
//
//  WARUM ES DIESE DATEI GIBT
//  Der Link/QR-Weg (bh-freigabe.js) traegt die Freigabe von Hand zwischen
//  zwei Geraeten. Fuer einen Ausbildungsbetrieb mit mehr als einem Azubi
//  ist das unbedienbar, und §14 BBiG verlangt monatliche Pruefung. Die
//  vier B2B-Luecken (Rolle, Zustellung, Revisionssicherheit, sichtbare
//  Unterschrift) haengen alle an einem Server mit Mandanten-Datenmodell.
//
//  Der liegt seit der Migration `b2b_berichtsheft_datenmodell` in Supabase:
//    betriebe · betrieb_mitglieder · einladungen · berichte · freigaben
//  Zwei Rollen je Betrieb: 'ausbilder' | 'azubi'. Durchgesetzt in RLS,
//  nicht hier — dieser Client zeigt nur an, was der Server ohnehin erzwingt.
//  `freigaben` ist serverseitig append-only (kein UPDATE/DELETE) — das ist
//  die zweite Instanz, an der Revisionssicherheit haengt.
//
//  ABGRENZUNG
//  - Solo-Nutzer merken nichts: ohne Betriebs-Mitgliedschaft macht dieses
//    Modul gar nichts, der Blob-Sync der Hauptapp bleibt unberuehrt.
//  - Der Link/QR-Weg bleibt als Fallback (Ausbilder ohne Konto, Firmen-
//    Firewall). Beide Wege schreiben am Ende dasselbe `report.approval`.
//  - Keine Kryptographie hier. Die optionale ECDSA-Signatur kommt aus
//    mwl-sign.js und wird nur durchgereicht.
//
//  Die Sitzung stammt aus der Hauptapp (gleiche Origin, gleicher
//  localStorage-Schluessel `sb-<ref>-auth-token`). Ohne Sitzung wird die
//  Supabase-Bibliothek nicht einmal geladen — dieselbe Zurueckhaltung wie
//  in vault-cloud.js.

(function () {
    'use strict';

    const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

    let clientPromise = null;
    let statusCache = null;      // { at, wert }  — kurzlebiger Cache fuer bhb2bStatus()
    const STATUS_TTL = 30000;

    // ── Sitzung / Client ──────────────────────────────────────────────

    function config() {
        return (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG) ? SUPABASE_CONFIG : null;
    }

    // Projekt-Ref steckt in der URL und im Namen des Session-Schluessels.
    // Aus der Konfiguration ableiten statt ihn ein zweites Mal hinzuschreiben.
    function projektRef() {
        const c = config();
        if (!c) return null;
        try { return new URL(c.URL).hostname.split('.')[0]; } catch (e) { return null; }
    }

    function hatSitzung() {
        const ref = projektRef();
        if (!ref) return false;
        try { return !!localStorage.getItem('sb-' + ref + '-auth-token'); }
        catch (e) { return false; }
    }

    function ladeBibliothek() {
        if (window.supabase && window.supabase.createClient) return Promise.resolve();
        return new Promise((fertig, fehler) => {
            const s = document.createElement('script');
            s.src = CDN;
            s.onload = () => fertig();
            s.onerror = () => fehler(new Error('Supabase-CDN nicht erreichbar'));
            document.head.appendChild(s);
        });
    }

    function client() {
        if (clientPromise) return clientPromise;
        const c = config();
        if (!c) return Promise.reject(new Error('Keine Supabase-Konfiguration'));
        clientPromise = ladeBibliothek()
            .then(() => window.supabase.createClient(c.URL, c.ANON_KEY))
            .catch(e => { clientPromise = null; throw e; });
        return clientPromise;
    }

    async function benutzer(sb) {
        const { data, error } = await sb.auth.getUser();
        if (error || !data || !data.user) return null;
        return data.user;
    }

    // Anzeigename des angemeldeten Kontos, wenn im Profil hinterlegt.
    function kontoName(user) {
        const m = (user && user.user_metadata) || {};
        return m.full_name || m.name || m.user_name || '';
    }

    // ── Abbildung Bericht <-> Zeile (an EINER Stelle) ─────────────────
    // Zwei Kopien dieser Zuordnung waeren dieselbe Falle wie zwei Regler
    // auf einen Zustand — sie driften.

    function ganzzahl(v, min, max, fallback) {
        const n = parseInt(v, 10);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    const STATUS_ERLAUBT = ['incomplete', 'complete', 'signed'];
    const QUELLE_ERLAUBT = ['local', 'cloud', 'status-only'];

    function berichtZuZeile(report, betriebId, azubiId) {
        return {
            betrieb_id: betriebId,
            azubi_id: azubiId,
            client_id: String(report.id),
            jahr: ganzzahl(report.year, 1, 5, 1),
            kw: ganzzahl(report.week, 1, 53, 1),
            datum_von: report.dateFrom || null,
            datum_bis: report.dateTo || null,
            inhalt: {
                activities: report.activities || '',
                mode: report.mode || 'weekly',
                dailyActivities: report.dailyActivities || null,
                dailyHours: report.dailyHours || null,
                dailySchool: report.dailySchool || null,
                instruction: report.instruction || '',
                school: report.school || '',
                department: report.department || '',
                hours: report.hours || 0,
                form: report.form || null,
                umfang: report.umfang || null
            },
            status: STATUS_ERLAUBT.indexOf(report.status) !== -1 ? report.status : 'incomplete',
            quelle: QUELLE_ERLAUBT.indexOf(report.source) !== -1 ? report.source : 'local',
            ki_erzeugt: !!(report.aiGenerated || report.source === 'cloud'),
            updated_at: report.updatedAt || new Date().toISOString()
        };
    }

    // Eine Freigabe-Zeile in die `report.approval`-Form bringen, die der
    // Rest der Seite schon kennt (Badge, bhIsLocked, PDF-Unterschrift).
    // `trust: 'server'` grenzt sie vom Link-Weg ab ('first'/'known'/…).
    function zeileZuApproval(f) {
        if (!f) return null;
        return {
            state: f.entscheidung,               // 'approved' | 'rejected'
            by: f.ausbilder_name || '',
            at: f.erstellt_at || '',
            note: f.anmerkung || '',
            pruefsumme: f.pruefsumme || '',
            sig: (f.signatur && f.signatur.g) || '',
            pub: (f.signatur && f.signatur.k) || '',
            trust: 'server',
            server: true
        };
    }

    // ── Status ────────────────────────────────────────────────────────

    /** Billig, ohne Netz: liegt ueberhaupt eine Sitzung vor? */
    function bhb2bAngemeldet() { return hatSitzung(); }

    /**
     * Mitgliedschaft des angemeldeten Kontos.
     * → { betriebId, name, rolle, anzeigeName } oder null.
     * Erste (und bewusst einzige) Mitgliedschaft — ein Konto gehoert in
     * diesem Produkt zu genau einem Betrieb.
     */
    async function bhb2bStatus(frisch) {
        if (!hatSitzung()) return null;
        if (!frisch && statusCache && (Date.now() - statusCache.at) < STATUS_TTL) {
            return statusCache.wert;
        }
        try {
            const sb = await client();
            const u = await benutzer(sb);
            if (!u) return null;
            const { data, error } = await sb
                .from('betrieb_mitglieder')
                .select('betrieb_id, rolle, anzeige_name')
                .eq('user_id', u.id)
                .order('angelegt_at', { ascending: true })
                .limit(1);
            if (error) { console.warn('[B2B] Status:', error.message); return null; }
            const row = data && data[0];
            if (!row) { statusCache = { at: Date.now(), wert: null }; return null; }

            let name = '';
            const bt = await sb.from('betriebe').select('name').eq('id', row.betrieb_id).maybeSingle();
            if (bt && bt.data) name = bt.data.name || '';

            const wert = {
                betriebId: row.betrieb_id,
                name: name,
                rolle: row.rolle,
                anzeigeName: row.anzeige_name || ''
            };
            statusCache = { at: Date.now(), wert: wert };
            return wert;
        } catch (e) {
            console.warn('[B2B] Status:', e && e.message);
            return null;
        }
    }

    function statusVergessen() { statusCache = null; }

    // ── Onboarding ────────────────────────────────────────────────────

    /** Betrieb gruenden — das Konto wird dessen erster Ausbilder. */
    async function bhb2bBetriebGruenden(name, anzeigeName) {
        const sb = await client();
        const { data, error } = await sb.rpc('betrieb_gruenden', {
            p_name: (name || '').trim(),
            p_anzeige_name: (anzeigeName || '').trim()
        });
        if (error) throw new Error(error.message);
        statusVergessen();
        return data;   // betriebId
    }

    /** Einladungscode einloesen — das Konto tritt als Azubi bei. */
    async function bhb2bEinladungEinloesen(code, anzeigeName) {
        const sb = await client();
        const { data, error } = await sb.rpc('einladung_einloesen', {
            p_code: (code || '').trim(),
            p_anzeige_name: (anzeigeName || '').trim()
        });
        if (error) throw new Error(freundlich(error.message));
        statusVergessen();
        return data;   // betriebId
    }

    // Die RPC wirft Klartext ('Einladungscode ist abgelaufen'), aber ein
    // roher PostgREST-Fehler kann auch technisch klingen — hier abfangen.
    function freundlich(msg) {
        if (/abgelaufen/i.test(msg)) return 'Der Einladungscode ist abgelaufen.';
        if (/bereits benutzt/i.test(msg)) return 'Dieser Einladungscode wurde schon verwendet.';
        if (/unbekannt/i.test(msg)) return 'Diesen Einladungscode gibt es nicht.';
        return msg;
    }

    // ── Einladungen (nur Ausbilder) ──────────────────────────────────

    // Codes sind gut lesbar (kein 0/O/1/I/l) und kurz genug fuers Diktat.
    function neuerCode() {
        const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const roh = new Uint8Array(9);
        (crypto || window.crypto).getRandomValues(roh);
        let s = '';
        for (let i = 0; i < roh.length; i++) {
            s += alpha[roh[i] % alpha.length];
            if (i === 2 || i === 5) s += '-';   // XXX-XXX-XXX
        }
        return s;
    }

    /** Neuen Einladungscode anlegen. `tage` = Gueltigkeit, Vorgabe 14. */
    async function bhb2bEinladungErstellen(tage) {
        const st = await bhb2bStatus(true);
        if (!st || st.rolle !== 'ausbilder') throw new Error('Nur ein Ausbilder kann einladen.');
        const sb = await client();
        const u = await benutzer(sb);
        const code = neuerCode();
        const laeuftAb = new Date(Date.now() + (Number(tage) > 0 ? Number(tage) : 14) * 86400000);
        const { error } = await sb.from('einladungen').insert({
            code: code,
            betrieb_id: st.betriebId,
            rolle: 'azubi',
            erstellt_von: u.id,
            laeuft_ab: laeuftAb.toISOString()
        });
        if (error) throw new Error(error.message);
        return code;
    }

    /** Offene und benutzte Einladungen des Betriebs. */
    async function bhb2bEinladungenListe() {
        const st = await bhb2bStatus();
        if (!st || st.rolle !== 'ausbilder') return [];
        const sb = await client();
        const { data, error } = await sb.from('einladungen')
            .select('code, laeuft_ab, benutzt_von, benutzt_at, created_at')
            .eq('betrieb_id', st.betriebId)
            .order('created_at', { ascending: false });
        if (error) { console.warn('[B2B] Einladungen:', error.message); return []; }
        return (data || []).map(r => ({
            code: r.code,
            laeuftAb: r.laeuft_ab,
            benutzt: !!r.benutzt_von,
            benutztAt: r.benutzt_at,
            abgelaufen: new Date(r.laeuft_ab) < new Date()
        }));
    }

    /** Azubis des Betriebs (nur Ausbilder). */
    async function bhb2bAzubiListe() {
        const st = await bhb2bStatus();
        if (!st || st.rolle !== 'ausbilder') return [];
        const sb = await client();
        const { data, error } = await sb.from('betrieb_mitglieder')
            .select('user_id, anzeige_name, angelegt_at')
            .eq('betrieb_id', st.betriebId)
            .eq('rolle', 'azubi')
            .order('anzeige_name', { ascending: true });
        if (error) { console.warn('[B2B] Azubis:', error.message); return []; }
        return data || [];
    }

    // ── Berichte hochladen (Azubi) ───────────────────────────────────

    /**
     * Einen Bericht in `berichte` spiegeln. Wirft nie — ein misslungener
     * Upload darf das lokale Speichern nicht kippen, das Geraet ist die
     * Wahrheit. → true/false.
     * Kein Hochladen, wenn die Woche serverseitig schon freigegeben ist
     * (RLS-Update greift zwar, aber ein stiller Overwrite einer
     * abgezeichneten Woche ist genau das, was Revisionssicherheit
     * verhindern soll).
     */
    async function bhb2bBerichtHoch(report) {
        const st = await bhb2bStatus();
        if (!st || st.rolle !== 'azubi' || !report) return false;
        try {
            const sb = await client();
            const u = await benutzer(sb);
            if (!u) return false;
            const zeile = berichtZuZeile(report, st.betriebId, u.id);
            const { error } = await sb.from('berichte')
                .upsert(zeile, { onConflict: 'azubi_id,jahr,kw' });
            if (error) { console.warn('[B2B] Bericht hoch:', error.message); return false; }
            return true;
        } catch (e) {
            console.warn('[B2B] Bericht hoch:', e && e.message);
            return false;
        }
    }

    /** Mehrere Berichte. → { ok, fehler }. */
    async function bhb2bBerichteHoch(reports) {
        let ok = 0, fehler = 0;
        for (const r of (reports || [])) {
            if (await bhb2bBerichtHoch(r)) ok++; else fehler++;
        }
        return { ok, fehler };
    }

    // ── Freigaben herunterladen (Azubi) ──────────────────────────────

    /**
     * Neueste Freigabe je Bericht. → { [clientId]: approval }.
     * Der Aufrufer traegt das in `report.approval` ein — von dort holen es
     * Badge, bhIsLocked() und der PDF-Renderer.
     *
     * Bewusst ZWEI schlichte Abfragen statt eines PostgREST-Embeds: die RLS
     * gibt dem Azubi ohnehin nur die eigenen Zeilen, und zwei `.select('*')`
     * sind robuster als eine Embed-Syntax, die bei einer FK-Umbenennung
     * stillschweigend kippt.
     */
    async function bhb2bFreigabenRunter() {
        const st = await bhb2bStatus();
        if (!st) return {};
        try {
            const sb = await client();
            const u = await benutzer(sb);
            if (!u) return {};

            const [{ data: fr, error: e1 }, { data: be, error: e2 }] = await Promise.all([
                sb.from('freigaben')
                    .select('bericht_id, entscheidung, ausbilder_name, anmerkung, pruefsumme, signatur, erstellt_at')
                    .order('erstellt_at', { ascending: true }),   // aeltere zuerst → neuere gewinnt
                sb.from('berichte')
                    .select('id, client_id')
                    .eq('azubi_id', u.id)
            ]);
            if (e1 || e2) { console.warn('[B2B] Freigaben:', (e1 || e2).message); return {}; }

            const idZuClient = {};
            (be || []).forEach(b => { if (b.client_id) idZuClient[b.id] = b.client_id; });

            const out = {};
            (fr || []).forEach(f => {
                const clientId = idZuClient[f.bericht_id];
                if (clientId) out[clientId] = zeileZuApproval(f);
            });
            return out;
        } catch (e) {
            console.warn('[B2B] Freigaben:', e && e.message);
            return {};
        }
    }

    // ── Freigabe schreiben (Ausbilder) ──────────────────────────────
    // Wird vom kontobasierten Ausbilder-Weg gebraucht (Schritt 3). Die
    // Pruefsumme deckt den Berichtsinhalt zum Zeitpunkt der Freigabe ab;
    // die Ketten-Verkettung (prev_pruefsumme) kommt in Schritt 2 dazu.

    async function bhb2bFreigabeSchreiben(berichtId, entscheidung, anmerkung, pruefsumme, signatur) {
        const st = await bhb2bStatus(true);
        if (!st || st.rolle !== 'ausbilder') throw new Error('Nur ein Ausbilder kann freigeben.');
        if (entscheidung !== 'approved' && entscheidung !== 'rejected') {
            throw new Error('Ungueltige Entscheidung.');
        }
        const sb = await client();
        const u = await benutzer(sb);
        const { error } = await sb.from('freigaben').insert({
            bericht_id: berichtId,
            betrieb_id: st.betriebId,
            ausbilder_id: u.id,
            ausbilder_name: st.anzeigeName || kontoName(u),
            entscheidung: entscheidung,
            anmerkung: anmerkung || '',
            pruefsumme: pruefsumme || '',
            signatur: signatur || null
        });
        if (error) throw new Error(error.message);
        return true;
    }

    // ── Austritt ─────────────────────────────────────────────────────
    async function bhb2bAustreten() {
        const st = await bhb2bStatus(true);
        if (!st) return true;
        const sb = await client();
        const u = await benutzer(sb);
        const { error } = await sb.from('betrieb_mitglieder')
            .delete().eq('betrieb_id', st.betriebId).eq('user_id', u.id);
        if (error) throw new Error(error.message);
        statusVergessen();
        return true;
    }

    // ── Export ───────────────────────────────────────────────────────
    window.BHB2B = {
        angemeldet: bhb2bAngemeldet,
        status: bhb2bStatus,
        statusVergessen: statusVergessen,
        betriebGruenden: bhb2bBetriebGruenden,
        einladungEinloesen: bhb2bEinladungEinloesen,
        einladungErstellen: bhb2bEinladungErstellen,
        einladungenListe: bhb2bEinladungenListe,
        azubiListe: bhb2bAzubiListe,
        berichtHoch: bhb2bBerichtHoch,
        berichteHoch: bhb2bBerichteHoch,
        freigabenRunter: bhb2bFreigabenRunter,
        freigabeSchreiben: bhb2bFreigabeSchreiben,
        austreten: bhb2bAustreten,
        // fuer Tests
        _intern: { berichtZuZeile, zeileZuApproval, neuerCode, ganzzahl, freundlich }
    };
})();
