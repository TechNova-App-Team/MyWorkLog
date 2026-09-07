// ═══════════════════════════════════════════════════════
//  VAULT-CLOUD MODULE — eigener Sync-Weg fuer den Schatten-Tresor
// ═══════════════════════════════════════════════════════
//
//  WARUM ES DIESE DATEI GIBT
//  Der Tresor hing bis v6.5.3 am allgemeinen Cloud-Sync der App
//  (Assets/js/Cloud/supabase-integration.js). Der laedt den KOMPLETTEN
//  localStorage als einen JSONB-Blob in die Zeile `users.all_data`, macht das
//  alle fuenf Minuten von selbst — und laedt NIE von selbst herunter.
//
//  Damit ueberschreiben sich zwei angemeldete Geraete gegenseitig: Geraet B
//  schiebt seinen aelteren Blob ueber den Upload von Geraet A, und weil es nie
//  herunterlaedt, bekommt B den Stand von A auch nie zu sehen. Ein spaeterer
//  Druck auf "Herunterladen" holt dann B's eigenen alten Stand zurueck. Genau
//  daran ist der Abgleich gescheitert, obwohl die Freigabe auf BEIDEN Geraeten
//  eingeschaltet war — der Fehler sass nie im Tresor.
//
//  Dazu kam: die Schatten-Seite laedt ueberhaupt keinen Cloud-Client. Ihr
//  Schalter setzte nur ein localStorage-Flag; transportiert hat immer nur das
//  Dashboard, und zwar den Blob.
//
//  Deshalb hier ein eigener, schmaler Weg auf eine eigene Tabelle
//  (`schatten_vault`, eine Zeile je Konto) mit Herunterladen BEIM LADEN und
//  Hochladen NACH JEDEM SPEICHERN.
//
//  WAS DER SERVER SIEHT
//  Nur Geheimtext. `entries` und `categories` sind AES-GCM-Bloecke; der
//  Hauptschluessel liegt als `wrapped_key` daneben, verpackt mit einem
//  Schluessel, der aus dem Passwort abgeleitet wird und das Geraet nie
//  verlaesst. Der Server kann den Tresor nicht oeffnen, und wir auch nicht.
//
//  🔴 Anhaenge fahren NICHT mit. Beweisfotos liegen als Bytes in IndexedDB und
//  wuerden jede Zeile sprengen; `files_local_only` bleibt damit die Wahrheit.
//  Wer sie auf ein zweites Geraet holen will, exportiert ein Backup.
//
//  Diese Datei kennt KEINE Kryptographie. Sie bekommt den fertigen Spiegel und
//  schiebt ihn hin und her — Schluesselableitung und AES-GCM bleiben in
//  schatten-berichtsheft.js.

(function () {
    'use strict';

    const TABELLE = 'schatten_vault';
    const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

    let clientPromise = null;

    // Der Projekt-Ref steckt in der URL und im Namen des Session-Schluessels.
    // Aus der Konfiguration ableiten statt ihn ein zweites Mal hinzuschreiben:
    // zwei Stellen fuer dieselbe Angabe driften.
    function projektRef() {
        try {
            return new URL(SUPABASE_CONFIG.URL).hostname.split('.')[0];
        } catch (e) { return null; }
    }

    // Ohne Sitzung gar nichts tun — insbesondere die CDN-Bibliothek nicht laden.
    // Die Schatten-Seite soll fuer alle, die den Tresor rein lokal nutzen,
    // keinen einzigen fremden Request ausloesen.
    function hatSitzung() {
        const ref = projektRef();
        if (!ref) return false;
        try { return !!localStorage.getItem('sb-' + ref + '-auth-token'); }
        catch (e) { return false; }
    }

    function ladeBibliothek() {
        if (window.supabase && window.supabase.createClient) return Promise.resolve();
        return new Promise((fertig, fehler) => {
            // Laeuft der Lazy-Loader der App auf derselben Seite, ist das Skript
            // vielleicht schon unterwegs. Ein zweites <script> auf dieselbe URL
            // ist billig (Browser- und SW-Cache) und spart die Absprache.
            const s = document.createElement('script');
            s.src = CDN;
            s.onload = () => fertig();
            s.onerror = () => fehler(new Error('Supabase-CDN nicht erreichbar'));
            document.head.appendChild(s);
        });
    }

    function client() {
        if (clientPromise) return clientPromise;
        clientPromise = ladeBibliothek().then(() =>
            window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY)
        ).catch(e => { clientPromise = null; throw e; });
        return clientPromise;
    }

    async function benutzer(c) {
        const { data, error } = await c.auth.getUser();
        if (error || !data || !data.user) return null;
        return data.user;
    }

    // ── Abbildung Zeile <-> Spiegel ────────────────────────────────────────
    // Die Spalten heissen snake_case (Postgres-Konvention), der Spiegel im JS
    // camelCase. Die Umrechnung steht bewusst an EINER Stelle: zwei Kopien
    // dieser Zuordnung waeren dieselbe Falle wie zwei Regler auf einen Zustand.
    function zeileZuSpiegel(r) {
        if (!r || !r.salt || !r.entries) return null;
        return {
            v: r.v, caseId: r.case_id, salt: r.salt,
            pwHash: r.pw_hash, wrappedKey: r.wrapped_key,
            updatedAt: r.updated_at,
            timeBasis: r.time_basis || null,
            entries: r.entries, categories: r.categories || null,
            filesLocalOnly: true
        };
    }

    function spiegelZuZeile(m, userId) {
        return {
            user_id: userId,
            v: m.v || 2,
            case_id: m.caseId || null,
            salt: m.salt,
            pw_hash: m.pwHash || null,
            wrapped_key: m.wrappedKey || null,
            entries: m.entries || null,
            categories: m.categories || null,
            time_basis: m.timeBasis || null,
            updated_at: m.updatedAt || new Date().toISOString()
        };
    }

    // ── Oeffentlich ────────────────────────────────────────────────────────

    /** Liegt eine Sitzung vor? Billig, ohne Netz und ohne CDN. */
    function vcAngemeldet() { return hatSitzung(); }

    /**
     * Holt den Stand aus der Cloud. Gibt den Spiegel zurueck oder null —
     * null heisst "nichts da oder nicht erreichbar", NIE "loesche was du hast".
     */
    async function vcPull() {
        if (!hatSitzung()) return null;
        try {
            const c = await client();
            const u = await benutzer(c);
            if (!u) return null;
            const { data, error } = await c.from(TABELLE)
                .select('*').eq('user_id', u.id).maybeSingle();
            if (error) { console.warn('[Tresor-Cloud] Laden fehlgeschlagen:', error.message); return null; }
            return zeileZuSpiegel(data);
        } catch (e) {
            console.warn('[Tresor-Cloud] Laden fehlgeschlagen:', e && e.message);
            return null;
        }
    }

    /**
     * Schreibt den Spiegel in die Cloud. Gibt true/false zurueck.
     * Wirft nie — ein misslungener Upload darf das Speichern nicht kippen,
     * der Tresor auf dem Geraet ist die Wahrheit.
     */
    async function vcPush(spiegel) {
        if (!hatSitzung() || !spiegel || !spiegel.salt || !spiegel.entries) return false;
        try {
            const c = await client();
            const u = await benutzer(c);
            if (!u) return false;
            const { error } = await c.from(TABELLE)
                .upsert(spiegelZuZeile(spiegel, u.id), { onConflict: 'user_id' });
            if (error) { console.warn('[Tresor-Cloud] Hochladen fehlgeschlagen:', error.message); return false; }
            return true;
        } catch (e) {
            console.warn('[Tresor-Cloud] Hochladen fehlgeschlagen:', e && e.message);
            return false;
        }
    }

    window.vcAngemeldet = vcAngemeldet;
    window.vcPull = vcPull;
    window.vcPush = vcPush;
})();
