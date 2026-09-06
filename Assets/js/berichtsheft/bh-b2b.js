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

    // Der Kern eines Berichts — genau die Felder, die in die Pruefsumme
    // eingehen. EINE Stelle, weil Azubi und Ausbilder identisch hashen
    // muessen: der Ausbilder aus der Server-Zeile, der Azubi aus seinem
    // lokalen Bericht ueber berichtInhalt(). Driftet das auseinander, meldet
    // jede abgezeichnete Woche faelschlich „geaendert".
    function berichtInhalt(report) {
        return {
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
        };
    }

    function berichtKern(report) {
        return {
            jahr: ganzzahl(report.year, 1, 5, 1),
            kw: ganzzahl(report.week, 1, 53, 1),
            datum_von: report.dateFrom || null,
            datum_bis: report.dateTo || null,
            inhalt: berichtInhalt(report)
        };
    }

    function berichtZuZeile(report, betriebId, azubiId) {
        const kern = berichtKern(report);
        return {
            betrieb_id: betriebId,
            azubi_id: azubiId,
            client_id: String(report.id),
            jahr: kern.jahr,
            kw: kern.kw,
            datum_von: kern.datum_von,
            datum_bis: kern.datum_bis,
            inhalt: kern.inhalt,
            status: STATUS_ERLAUBT.indexOf(report.status) !== -1 ? report.status : 'incomplete',
            quelle: QUELLE_ERLAUBT.indexOf(report.source) !== -1 ? report.source : 'local',
            ki_erzeugt: !!(report.aiGenerated || report.source === 'cloud')
            // created_at / updated_at setzt der Trigger berichte_serverzeit auf
            // Serverzeit — hier NICHTS mitschicken (ein kaputter Client-Wert
            // liesse sonst den ganzen Upsert an der Typpruefung scheitern).
        };
    }

    // Der von der Ausbilder-Seite signierte String: deckt Bericht (client_id),
    // Entscheidung und Inhalts-Pruefsumme ab. Beide Seiten bauen ihn identisch —
    // der Trenner U+001F kommt in keinem der Felder vor.
    function freigabeSignaturText(clientId, entscheidung, pruefsumme) {
        return ['mwl-freigabe-konto/1', String(clientId || ''),
            String(entscheidung || ''), String(pruefsumme || '')].join('\u001f');
    }

    // Eine Freigabe-Zeile in die `report.approval`-Form bringen, die der
    // Rest der Seite schon kennt (Badge, bhIsLocked, PDF-Unterschrift).
    // `trust: 'server'` grenzt sie vom Link-Weg ab ('first'/'known'/…).
    function zeileZuApproval(f, clientId) {
        if (!f) return null;
        return {
            state: f.entscheidung,               // 'approved' | 'rejected'
            by: f.ausbilder_name || '',
            at: f.erstellt_at || '',
            note: f.anmerkung || '',
            pruefsumme: f.pruefsumme || '',
            sig: (f.signatur && f.signatur.g) || '',
            pub: (f.signatur && f.signatur.k) || '',
            clientId: clientId || '',            // fuer die Signaturpruefung auf der Azubi-Seite
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

            // Den Token braucht nur der Ausbilder (er traegt ihn ins DNS ein).
            const spalten = row.rolle === 'ausbilder'
                ? 'name, domain, domain_token, domain_verifiziert_at'
                : 'name, domain, domain_verifiziert_at';
            let b = null;
            const bt = await sb.from('betriebe').select(spalten).eq('id', row.betrieb_id).maybeSingle();
            if (bt && bt.data) b = bt.data;

            const wert = {
                betriebId: row.betrieb_id,
                name: (b && b.name) || '',
                rolle: row.rolle,
                anzeigeName: row.anzeige_name || '',
                domain: (b && b.domain) || '',
                domainToken: (b && b.domain_token) || '',
                // Nur wahr, wenn der Server den Nachweis gesetzt hat — der
                // Client kann das Feld nicht schreiben (Trigger auf betriebe).
                domainOk: !!(b && b.domain && b.domain_verifiziert_at)
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
                if (clientId) out[clientId] = zeileZuApproval(f, clientId);
            });
            return out;
        } catch (e) {
            console.warn('[B2B] Freigaben:', e && e.message);
            return {};
        }
    }

    // ── Pruefsumme ueber einen Bericht ──────────────────────────────
    // Deckt den Inhalt zum Zeitpunkt der Freigabe ab. Muss reproduzierbar
    // sein — deshalb kanonisches JSON (Schluessel rekursiv sortiert), nicht
    // JSON.stringify. Schritt 2 (Ketten-Journal) baut darauf auf: eine
    // spaeter geaenderte Woche ergibt eine andere Summe als die, die in der
    // Freigabe steht.
    function kanonisch(v) {
        if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
        if (Array.isArray(v)) return '[' + v.map(kanonisch).join(',') + ']';
        return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + kanonisch(v[k])).join(',') + '}';
    }

    async function bhb2bPruefsumme(bericht) {
        const kern = {
            jahr: bericht.jahr != null ? Number(bericht.jahr) : null,
            kw: bericht.kw != null ? Number(bericht.kw) : null,
            datum_von: bericht.datum_von || null,
            datum_bis: bericht.datum_bis || null,
            inhalt: bericht.inhalt || {}
        };
        const bytes = new TextEncoder().encode(kanonisch(kern));
        const hash = await (crypto || window.crypto).subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Prueft die ECDSA-Signatur einer Server-Freigabe und die
    // Trust-on-first-use-Bindung an den gemerkten Ausbilder-Schluessel.
    // → { sig: 'gueltig'|'ungueltig'|'keine', trust: 'first'|'known'|'other-device'|'unsigniert' }
    // oder null, wenn keine Server-Freigabe vorliegt.
    // Der localStorage-Schluessel ist derselbe wie im Link-Weg (bh-freigabe.js):
    // ein Ausbilder, der beide Wege nutzt, hat EINEN Schluessel.
    const AUSBILDER_PUB_KEY = 'berichtsheft_ausbilder_pub';

    async function bhb2bFreigabePruefen(report) {
        const a = report && report.approval;
        if (!a || !a.server) return null;

        let sig = 'keine';
        if (a.sig && a.pub && window.MWLSign && MWLSign.verifyString) {
            const clientId = a.clientId || String(report.id);
            const txt = freigabeSignaturText(clientId, a.state, a.pruefsumme || '');
            try {
                sig = (await MWLSign.verifyString(txt, { k: a.pub, g: a.sig })) ? 'gueltig' : 'ungueltig';
            } catch (e) { sig = 'ungueltig'; }
        }

        let trust = 'unsigniert';
        if (a.pub) {
            let known = null;
            try { known = localStorage.getItem(AUSBILDER_PUB_KEY); } catch (e) { /* Privatmodus */ }
            if (!known) {
                try { localStorage.setItem(AUSBILDER_PUB_KEY, a.pub); } catch (e) { /* Privatmodus */ }
                trust = 'first';
            } else {
                trust = known === a.pub ? 'known' : 'other-device';
            }
        }
        return { sig: sig, trust: trust };
    }

    /**
     * Hat sich ein lokaler Bericht seit seiner Server-Freigabe geaendert?
     * Nur fuer einen Bericht mit `report.approval` (server, approved) sinnvoll.
     * Fehlt die gespeicherte Pruefsumme (Freigabe aus der Zeit vor v6.7.0),
     * → false: ohne Vergleich lieber keine falsche Warnung.
     */
    async function bhb2bBerichtVeraendert(report) {
        const a = report && report.approval;
        if (!a || a.state !== 'approved' || !a.pruefsumme) return false;
        try {
            return (await bhb2bPruefsumme(berichtKern(report))) !== a.pruefsumme;
        } catch (e) { return false; }
    }

    // Prueft die prev_pruefsumme-Kette einer nach erstellt_at sortierten
    // Freigabe-Liste EINES Berichts. Jede Freigabe verweist mit
    // `prev_pruefsumme` auf die `pruefsumme` der vorigen — die erste auf null.
    // Ergebnis: { ok, befund }. `freigaben` ist serverseitig append-only, ein
    // Bruch hier heisst also entweder ein Datenbank-Eingriff oder ein Fehler
    // in freigabeSchreiben().
    function ketteVerifizieren(liste) {
        for (let i = 0; i < liste.length; i++) {
            const erwartet = i === 0 ? null : (liste[i - 1].pruefsumme || null);
            const ist = liste[i].prev_pruefsumme || null;
            if (ist !== erwartet) return { ok: false, befund: 'kette-unterbrochen', bei: i };
        }
        return { ok: true, befund: 'ok' };
    }

    // ── Sammelansicht fuer den Ausbilder ────────────────────────────
    /**
     * Alle Azubis des Betriebs mit ihren Berichten, der jeweils neuesten
     * Freigabe (`freigabe`), dem vollen Verlauf (`verlauf`, aelteste zuerst)
     * und den Ketten- und Aenderungsbefunden (`ketteOk`, `veraendert`).
     * → { betrieb, azubis: [...] } oder null, wenn das Konto kein Ausbilder ist.
     */
    async function bhb2bAzubiBerichte() {
        const st = await bhb2bStatus();
        if (!st || st.rolle !== 'ausbilder') return null;
        try {
            const sb = await client();
            const [mitg, ber, fr] = await Promise.all([
                sb.from('betrieb_mitglieder').select('user_id, anzeige_name')
                    .eq('betrieb_id', st.betriebId).eq('rolle', 'azubi'),
                sb.from('berichte').select('*')
                    .eq('betrieb_id', st.betriebId)
                    .order('jahr', { ascending: true }).order('kw', { ascending: true }),
                sb.from('freigaben').select('bericht_id, entscheidung, anmerkung, ausbilder_name, pruefsumme, prev_pruefsumme, erstellt_at')
                    .eq('betrieb_id', st.betriebId)
                    .order('erstellt_at', { ascending: true })   // aelteste zuerst
            ]);
            if (mitg.error || ber.error || fr.error) {
                console.warn('[B2B] Sammelansicht:', (mitg.error || ber.error || fr.error).message);
                return null;
            }
            const verlauf = {};
            (fr.data || []).forEach(f => { (verlauf[f.bericht_id] = verlauf[f.bericht_id] || []).push(f); });

            const azubis = (mitg.data || []).map(m => ({
                userId: m.user_id,
                name: m.anzeige_name || '',
                berichte: (ber.data || [])
                    .filter(b => b.azubi_id === m.user_id)
                    .map(b => {
                        const v = verlauf[b.id] || [];
                        const kette = ketteVerifizieren(v);
                        return Object.assign({}, b, {
                            freigabe: v.length ? v[v.length - 1] : null,
                            verlauf: v,
                            ketteOk: kette.ok,
                            ketteBefund: kette.befund
                        });
                    })
            }));

            // „geaendert" = zuletzt bestaetigt, aber der Inhalt hasht heute
            // anders als in der Freigabe hinterlegt. DAS ist die
            // Revisionssicherheit: eine nachtraeglich geaenderte, bereits
            // abgezeichnete Woche faellt hier auf.
            for (const az of azubis) {
                for (const b of az.berichte) {
                    b.veraendert = false;
                    const f = b.freigabe;
                    if (f && f.entscheidung === 'approved' && f.pruefsumme) {
                        try { b.veraendert = (await bhb2bPruefsumme(b)) !== f.pruefsumme; }
                        catch (e) { /* ohne Vergleich lieber keine Warnung */ }
                    }
                }
            }
            return {
                betrieb: st.name, azubis: azubis, betriebId: st.betriebId,
                domain: st.domain, domainToken: st.domainToken, domainOk: st.domainOk
            };
        } catch (e) {
            console.warn('[B2B] Sammelansicht:', e && e.message);
            return null;
        }
    }

    /**
     * Voller Freigabe-Verlauf EINES Berichts (fuer die Azubi-Seite —
     * `azubiBerichte()` liefert ihn dem Ausbilder schon mit).
     * → { eintraege: [...], ketteOk, befund } oder null.
     */
    async function bhb2bFreigabeVerlauf(clientId) {
        const st = await bhb2bStatus();
        if (!st) return null;
        try {
            const sb = await client();
            const be = await sb.from('berichte').select('id')
                .eq('client_id', String(clientId)).limit(1);
            if (be.error || !be.data || !be.data[0]) return null;
            const fr = await sb.from('freigaben')
                .select('entscheidung, ausbilder_name, anmerkung, pruefsumme, prev_pruefsumme, erstellt_at')
                .eq('bericht_id', be.data[0].id)
                .order('erstellt_at', { ascending: true });
            if (fr.error) return null;
            const liste = fr.data || [];
            const kette = ketteVerifizieren(liste);
            return { eintraege: liste, ketteOk: kette.ok, befund: kette.befund };
        } catch (e) {
            console.warn('[B2B] Verlauf:', e && e.message);
            return null;
        }
    }

    // ── Freigabe schreiben (Ausbilder) ──────────────────────────────
    /**
     * Eine Entscheidung des Ausbilders in `freigaben` schreiben (append-only).
     * `bericht` ist die volle Zeile — daraus entstehen Pruefsumme und, aus
     * der letzten Freigabe desselben Berichts, `prev_pruefsumme` (Kettenkopf).
     *
     * Wenn mwl-sign.js da ist, wird die Entscheidung zusaetzlich mit dem
     * ECDSA-Schluessel des Geraets signiert (`signatur: {k, g}`). Das ist ein
     * TRAGBARER Beweis: er ueberlebt einen Export und laesst sich ohne Supabase
     * pruefen. Grenzen wie beim Link-Weg — Trust-on-first-use, keine
     * Identitaets-Bestaetigung (steht so in mwl-sign.js).
     */
    async function bhb2bFreigabeSchreiben(berichtId, entscheidung, anmerkung, bericht) {
        const st = await bhb2bStatus(true);
        if (!st || st.rolle !== 'ausbilder') throw new Error('Nur ein Ausbilder kann freigeben.');
        if (entscheidung !== 'approved' && entscheidung !== 'rejected') {
            throw new Error('Ungueltige Entscheidung.');
        }
        const sb = await client();
        const u = await benutzer(sb);

        let pruefsumme = '';
        if (bericht) { try { pruefsumme = await bhb2bPruefsumme(bericht); } catch (e) { /* ohne */ } }

        let prev = null;
        const vor = await sb.from('freigaben').select('pruefsumme')
            .eq('bericht_id', berichtId).order('erstellt_at', { ascending: false }).limit(1);
        if (vor && vor.data && vor.data[0]) prev = vor.data[0].pruefsumme || null;

        let signatur = null;
        const clientId = bericht && bericht.client_id;
        if (clientId && window.MWLSign && MWLSign.available() && MWLSign.signString) {
            try {
                signatur = await MWLSign.signString(
                    freigabeSignaturText(clientId, entscheidung, pruefsumme));
            } catch (e) { /* ohne Signatur bleibt die Freigabe gueltig */ }
        }

        const { error } = await sb.from('freigaben').insert({
            bericht_id: berichtId,
            betrieb_id: st.betriebId,
            ausbilder_id: u.id,
            ausbilder_name: st.anzeigeName || kontoName(u),
            entscheidung: entscheidung,
            anmerkung: anmerkung || '',
            pruefsumme: pruefsumme,
            prev_pruefsumme: prev,
            signatur: signatur
        });
        if (error) throw new Error(error.message);
        return true;
    }

    // ── Domain-Nachweis (Ausbilder) ─────────────────────────────────
    // Der Nachweis selbst entsteht NICHT hier, sondern in der Edge Function
    // `domain-pruefen`. Diese Datei traegt nur die Domain ein und stoesst die
    // Pruefung an — `domain_verifiziert_at` kann der Client nicht schreiben.

    /** Domain hinterlegen (setzt einen bestehenden Nachweis zurueck). */
    async function bhb2bDomainSetzen(domain) {
        const st = await bhb2bStatus(true);
        if (!st || st.rolle !== 'ausbilder') throw new Error('Nur ein Ausbilder kann das.');
        const sauber = String(domain || '').trim().toLowerCase()
            .replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
        if (sauber && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(sauber)) {
            throw new Error('Das sieht nicht nach einer Domain aus (z. B. musterfirma.de).');
        }
        const sb = await client();
        const { error } = await sb.from('betriebe')
            .update({ domain: sauber || null }).eq('id', st.betriebId);
        if (error) throw new Error(error.message);
        statusVergessen();
        return sauber;
    }

    /** Pruefung anstossen. → { ok, domain, geprueft, gefunden, fehler } */
    async function bhb2bDomainPruefen() {
        const st = await bhb2bStatus(true);
        if (!st || st.rolle !== 'ausbilder') throw new Error('Nur ein Ausbilder kann das.');
        const sb = await client();
        const { data, error } = await sb.functions.invoke('domain-pruefen', {
            body: { betrieb_id: st.betriebId }
        });
        if (error) throw new Error(error.message || 'Pruefung nicht erreichbar.');
        statusVergessen();
        return data;
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
        azubiBerichte: bhb2bAzubiBerichte,
        berichtHoch: bhb2bBerichtHoch,
        berichteHoch: bhb2bBerichteHoch,
        freigabenRunter: bhb2bFreigabenRunter,
        freigabeSchreiben: bhb2bFreigabeSchreiben,
        pruefsumme: bhb2bPruefsumme,
        berichtVeraendert: bhb2bBerichtVeraendert,
        freigabePruefen: bhb2bFreigabePruefen,
        freigabeVerlauf: bhb2bFreigabeVerlauf,
        domainSetzen: bhb2bDomainSetzen,
        domainPruefen: bhb2bDomainPruefen,
        austreten: bhb2bAustreten,
        // fuer Tests
        _intern: { berichtZuZeile, berichtKern, berichtInhalt, zeileZuApproval, neuerCode, ganzzahl, freundlich, kanonisch, ketteVerifizieren, freigabeSignaturText }
    };
})();
