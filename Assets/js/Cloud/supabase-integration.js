/**
 * Supabase Cloud Sync Module
 * Verwaltet Authentifizierung, Daten-Upload/-Download und LocalStorage-Sync
 * 
 * @module supabase-integration
 * @author TechNova App Team
 * @version 1.0.0
 */

/* ══════════════════════════════════════════════════════════════════════════
   OPT-IN-DATEN
   Der Sync sammelt den KOMPLETTEN localStorage ein. Der Tresor des
   Schatten-Berichtshefts (`schatten_vault`) fuhr dadurch bisher ungefragt mit —
   Ende-zu-Ende verschluesselt zwar (AES-256-GCM, Schluessel wird aus dem
   Passwort abgeleitet und verlaesst das Geraet nie, hochgeladen ist also nur
   Geheimtext), aber "liegt auf einem fremden Server" ist eine Entscheidung,
   die dem Nutzer gehoert und nicht dem Sync.
   Solche Schluessel fahren deshalb nur mit, wenn ihr Freigabe-Flag gesetzt ist.
   Das Flag wird im Tresor selbst gesetzt (mit Passwort-Bestaetigung).
   ══════════════════════════════════════════════════════════════════════════ */
const CLOUD_OPT_IN_KEYS = {};

/* 🔴 Der Schatten-Tresor faehrt hier NICHT mehr mit — weder hoch noch runter.
   Er hat seit v6.5.4 einen eigenen Weg auf eine eigene Tabelle
   (Assets/js/berichtsheft/vault-cloud.js, Tabelle `schatten_vault`).

   Warum er hier RAUS muss und nicht einfach zusaetzlich mitfahren kann: dieser
   Sync laedt den KOMPLETTEN localStorage als einen Blob hoch, alle fuenf
   Minuten automatisch (AutoSyncManager) — und laedt nie von selbst herunter.
   Zwei angemeldete Geraete ueberschreiben sich damit gegenseitig. Liefe der
   Tresor auf beiden Wegen, wuerde der Blob den frisch abgeglichenen Stand des
   anderen Geraets beim naechsten Durchlauf wieder ueberbuegeln — zwei Wege auf
   denselben Zustand driften, und der langsamere gewinnt zufaellig.

   Der Eintrag steht als leere Liste da, weil das Freigabe-Verfahren selbst
   bleibt: `cloudKeyAllowed` ist weiterhin die Stelle, an der ein Schluessel
   vom Sync ausgenommen wird. */
const CLOUD_BLOCKED_KEYS = new Set(['schatten_vault']);

function cloudKeyAllowed(key) {
    if (CLOUD_BLOCKED_KEYS.has(key)) return false;
    const flagKey = CLOUD_OPT_IN_KEYS[key];
    if (!flagKey) return true;
    try {
        return localStorage.getItem(flagKey) === '1';
    } catch (e) {
        return false;   /* Im Zweifel NICHT hochladen. */
    }
}

class SupabaseCloudSync {
    constructor(supabaseUrl, anonKey) {
        this.supabaseUrl = supabaseUrl;
        this.anonKey = anonKey;
        this.session = null;
        this.user = null;
        
        // Supabase Client initialisieren
        this.initializeClient();
        
        // WICHTIG: Auth-Listener ZUERST, damit OAuth-Callbacks erkannt werden
        this.setupAuthListener();
        
        // OAuth Callback aus URL verarbeiten (Hash-Fragment oder PKCE Code)
        this.handleOAuthCallback();
        
        // Session bei Seitenladung wiederherstellen
        this.checkExistingSession();
    }

    /**
     * Initialisiert den Supabase Client über CDN
     * @private
     */
    initializeClient() {
        if (window.supabase && window.supabase.createClient) {
            // 🔴 `experimental.passkey` ist Pflicht, sonst gibt es die Methoden
            // GAR NICHT: ohne das Flag ist `auth.signInWithPasskey` schlicht
            // undefined, und ein Aufruf stirbt an "is not a function" — nicht an
            // einer Fehlermeldung, die auf die fehlende Einstellung hinweist.
            // Serverseitig sind Passkeys seit dem 04.09.2026 aktiv (RP-ID
            // myworklog.de). Die Bibliothek braucht dafuer mindestens 2.105.0;
            // der CDN-Verweis @supabase/supabase-js@2 liefert aktuell 2.115.0.
            //
            // Supabase nennt die API ausdruecklich experimentell. Deshalb wird
            // ihre Existenz vor jedem Aufruf geprueft (passkeySupported), statt
            // sich darauf zu verlassen.
            this.client = window.supabase.createClient(this.supabaseUrl, this.anonKey, {
                auth: { experimental: { passkey: true } }
            });
            console.log('[Supabase] Client erfolgreich initialisiert');
        } else {
            console.error('[Supabase] Supabase CDN nicht geladen. Bitte Supabase JS Library laden.');
        }
    }

    /**
     * Setzt einen AuthStateChange Listener auf
     * @private
     */
    setupAuthListener() {
        if (!this.client) return;

        this.client.auth.onAuthStateChange((event, session) => {
            this.session = session;
            this.user = session?.user || null;

            if (session) {
                console.log('[Auth] User eingeloggt:', this.user.email);
                this.onAuthStateChanged(true, this.user);
            } else {
                console.log('[Auth] User ausgeloggt');
                this.onAuthStateChanged(false, null);
            }
        });
    }

    /**
     * Verarbeitet OAuth-Callback aus der URL (Hash-Fragment oder PKCE Code)
     * @private
     */
    async handleOAuthCallback() {
        if (!this.client) return;

        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);

        // Check für Hash-Fragment (#access_token=...) oder PKCE (?code=...)
        const hasHashToken = hash && hash.includes('access_token');
        const hasPKCECode = params.has('code');

        if (hasHashToken || hasPKCECode) {
            try {
                // Supabase v2 verarbeitet dies automatisch via getSession()
                const { data: { session }, error } = await this.client.auth.getSession();
                
                if (error) {
                    console.error('[Auth] OAuth Callback Fehler:', error);
                    return;
                }

                if (session) {
                    this.session = session;
                    this.user = session.user;
                    this.onAuthStateChanged(true, this.user);
                    
                    // URL aufräumen — Token/Code aus der Adressleiste entfernen
                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                }
            } catch (err) {
                console.error('[Auth] OAuth Callback Verarbeitung fehlgeschlagen:', err);
            }
        }
    }

    /**
     * Versucht, bestehende Session aus sessionStorage zu laden
     * @private
     */
    async checkExistingSession() {
        if (!this.client) {
            console.warn('[Session] Supabase Client nicht verfügbar');
            return;
        }

        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            
            if (error) {
                console.error('[Session] Fehler beim Abrufen der Session:', error);
                return;
            }

            if (session) {
                this.session = session;
                this.user = session.user;
                console.log('[Session] Existierende Session gefunden:', this.user.email);
                // onAuthStateChange (INITIAL_SESSION) handles the UI update — no manual call needed
                console.log('[Cloud] Session aktiv — manueller Sync über Buttons möglich');
            }
        } catch (error) {
            console.error('[Session] Fehler:', error);
        }
    }

    /**
     * Login mit Magic Link (OTP)
     * @param {string} email - E-Mail-Adresse des Users
     * @returns {Promise<Object>} Resultat der signInWithOtp Operation
     */
    async loginWithEmail(email) {
        if (!this.client) {
            throw new Error('Supabase Client nicht verfügbar');
        }

        try {
            console.log('[Auth] Sende Magic Link zu:', email);
            
            const { data, error } = await this.client.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) {
                console.error('[Auth] Login Fehler:', error.message);
                throw error;
            }

            console.log('[Auth] Magic Link versendet! Bitte E-Mail überprüfen.');
            return { success: true, data };
        } catch (error) {
            console.error('[Auth] signInWithOtp Fehler:', error);
            throw error;
        }
    }

    /* ══════════════════════════════════════════════════════════════════════
       PASSKEYS (WebAuthn)

       Warum das der bequemste Weg ist: keine Mail, kein Passwort, kein fremder
       Anbieter. Der Nutzer bestaetigt mit Fingerabdruck, Gesicht oder PIN.
       Supabase benutzt "discoverable credentials" — die Anmeldung braucht
       deshalb KEINE Eingabe der Adresse, der Schluesselbund kennt das Konto.

       🔴 Ein Passkey ist kein Weg fuer die ERSTE Anmeldung. Anlegen kann ihn
       nur, wer schon ein bestaetigtes Konto hat und gerade angemeldet ist. Wer
       sich zum ersten Mal anmeldet, braucht weiter Magic Link oder OAuth. Die
       Oberflaeche muss das sagen, sonst sucht jemand einen Knopf, der fuer ihn
       noch gar nicht funktionieren kann.
       ══════════════════════════════════════════════════════════════════════ */

    /**
     * Kann dieses Geraet ueberhaupt Passkeys — und kennt die Bibliothek sie?
     * Beides pruefen: die API ist als experimentell gekennzeichnet und kann in
     * einer aelteren CDN-Fassung fehlen, und WebAuthn braucht einen sicheren
     * Kontext (HTTPS oder localhost).
     */
    passkeySupported() {
        if (typeof window.PublicKeyCredential === 'undefined') return false;
        if (!window.isSecureContext) return false;
        return !!(this.client && this.client.auth && typeof this.client.auth.signInWithPasskey === 'function');
    }

    /**
     * Anmelden mit einem bereits angelegten Passkey.
     * @returns {Promise<Object>} data mit session und user
     */
    async loginWithPasskey() {
        if (!this.client) throw new Error('Supabase Client nicht verfügbar');
        if (!this.passkeySupported()) throw new Error('Passkeys werden auf diesem Gerät nicht unterstützt');

        const { data, error } = await this.client.auth.signInWithPasskey();
        if (error) {
            console.error('[Auth] Passkey-Anmeldung fehlgeschlagen:', error.message);
            throw error;
        }
        console.log('[Auth] Mit Passkey angemeldet');
        return data;
    }

    /**
     * Legt fuer das ANGEMELDETE Konto einen Passkey auf diesem Geraet an.
     * @returns {Promise<Object>} Metadaten des neuen Passkeys
     */
    async registerPasskey() {
        if (!this.client) throw new Error('Supabase Client nicht verfügbar');
        if (!this.user) throw new Error('Zum Einrichten eines Passkeys musst du angemeldet sein');
        if (!this.passkeySupported()) throw new Error('Passkeys werden auf diesem Gerät nicht unterstützt');

        const { data, error } = await this.client.auth.registerPasskey();
        if (error) {
            console.error('[Auth] Passkey anlegen fehlgeschlagen:', error.message);
            throw error;
        }
        return data;
    }

    /** Die Passkeys des angemeldeten Kontos. Leere Liste, wenn es keine gibt. */
    async listPasskeys() {
        if (!this.client || !this.user) return [];
        const pk = this.client.auth.passkey;
        if (!pk || typeof pk.list !== 'function') return [];
        try {
            const { data, error } = await pk.list();
            if (error) return [];
            return Array.isArray(data) ? data : [];
        } catch (e) { return []; }
    }

    /** Entfernt einen Passkey. Der Schluessel auf dem Geraet bleibt dabei liegen
        und muss dort getrennt geloescht werden — das gehoert in den Hinweistext. */
    async deletePasskey(passkeyId) {
        if (!this.client || !this.user) throw new Error('Nicht angemeldet');
        const { error } = await this.client.auth.passkey.delete({ passkeyId });
        if (error) throw error;
        return true;
    }

    /**
     * Login mit Google OAuth
     * @returns {Promise<Object>} Resultat der signInWithOAuth Operation
     */
    async loginWithGoogle() {
        if (!this.client) {
            throw new Error('Supabase Client nicht verfügbar');
        }

        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('[Auth] Google OAuth Fehler:', error);
            throw error;
        }
    }

    /**
     * Login mit GitHub OAuth
     * @returns {Promise<Object>} Resultat der signInWithOAuth Operation
     */
    async loginWithGitHub() {
        if (!this.client) {
            throw new Error('Supabase Client nicht verfügbar');
        }

        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('[Auth] GitHub OAuth Fehler:', error);
            throw error;
        }
    }

    /**
     * Login mit Discord OAuth
     * @returns {Promise<Object>} Resultat der signInWithOAuth Operation
     */
    async loginWithDiscord() {
        if (!this.client) {
            throw new Error('Supabase Client nicht verfügbar');
        }

        try {
            const { data, error } = await this.client.auth.signInWithOAuth({
                provider: 'discord',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            console.error('[Auth] Discord OAuth Fehler:', error);
            throw error;
        }
    }

    /**
     * Logout - entfernt Session
     * @returns {Promise<void>}
     */
    async logout() {
        if (!this.client) {
            throw new Error('Supabase Client nicht verfügbar');
        }

        try {
            const { error } = await this.client.auth.signOut();
            
            if (error) {
                throw error;
            }

            this.session = null;
            this.user = null;
            console.log('[Auth] User erfolgreich ausgeloggt');
            
            this.onAuthStateChanged(false, null);
        } catch (error) {
            console.error('[Auth] Logout Fehler:', error);
            throw error;
        }
    }

    /**
     * Sammelt ALLE LocalStorage-Keys und speichert sie in Supabase
     * @returns {Promise<Object>} Speicher-Resultat
     */
    async uploadToCloud() {
        if (!this.user) {
            throw new Error('Kein User eingeloggt. Bitte zuerst anmelden.');
        }

        if (!this.client) {
            throw new Error('Supabase Client nicht verfügbar');
        }

        try {
            // Sammle alle LocalStorage-Daten (Auth-Tokens ausschließen)
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('sb-') || key.startsWith('supabase')) continue;
                if (!cloudKeyAllowed(key)) continue;   /* nicht freigegeben -> bleibt lokal */
                allData[key] = localStorage.getItem(key);
            }

            console.log('[Cloud] Hochladen von', Object.keys(allData).length, 'LocalStorage-Keys');

            // Upsert in Supabase (id = User ID, all_data = JSONB Objekt)
            const { data, error } = await this.client
                .from('users')
                .upsert(
                    {
                        id: this.user.id,
                        user_id: this.user.id,
                        all_data: allData,
                        updated_at: new Date().toISOString()
                    },
                    { onConflict: 'id' }
                )
                .select();

            if (error) {
                console.error('[Cloud] Upload Error Details:', {
                    message: error.message,
                    code: error.code,
                    status: error.status,
                    details: error.details
                });
                throw new Error(`Upload Fehler (${error.code}): ${error.message}`);
            }

            console.log('[Cloud] Daten erfolgreich hochgeladen!');

            // 🔴 Der Zeitstempel gehoert HIERHER, nicht an die Knoepfe.
            // Vorher schrieben ihn drei Klick-Handler (api-cloud-sync.js x2,
            // supabase-ui.js x1) je fuer sich. Der AutoSync ruft dieselbe
            // Funktion, aber keinen dieser Handler — er hat also jahrelang
            // erfolgreich hochgeladen, ohne dass es irgendwo vermerkt wurde.
            // Folge: die Backup-Erinnerung meldete taeglich "aelter als 7 Tage
            // (oder nicht vorhanden)", waehrend die Daten in Wahrheit alle paar
            // Minuten in der Cloud landeten. Wer sichert, muss das selbst
            // protokollieren — nicht der, der den Knopf gedrueckt hat.
            try {
                localStorage.setItem('mwl_last_export', new Date().toISOString());
                localStorage.setItem('mwl_last_backup_kind', 'cloud');
            } catch (e) { /* Speicher voll oder gesperrt - kein Grund, den Upload zu verlieren */ }

            return { success: true, data };
        } catch (error) {
            console.error('[Cloud] uploadToCloud Fehler:', error.message || error);
            throw error;
        }
    }

    /**
     * Holt Daten aus Supabase und füllt LocalStorage
     * @returns {Promise<Object>} Download-Resultat
     */
    async downloadFromCloud() {
        if (!this.user) {
            console.warn('[Cloud] Kein User eingeloggt - Download abgebrochen');
            return { success: false, reason: 'Not logged in' };
        }

        if (!this.client) {
            throw new Error('Supabase Client nicht verfügbar');
        }

        try {
            console.log('[Cloud] Lade Daten herunter für User:', this.user.id);

            // Hole Daten für den aktuellen User
            // Nutze maybeSingle statt single für bessere Error-Handling
            const { data, error } = await this.client
                .from('users')
                .select('all_data')
                .eq('id', this.user.id)
                .maybeSingle();

            if (error) {
                console.error('[Cloud] Query Error Details:', {
                    message: error.message,
                    code: error.code,
                    status: error.status,
                    details: error.details
                });
                // Werfe Error - nicht einfach ignorieren
                throw new Error(`Supabase Query Fehler (${error.code}): ${error.message}`);
            }

            if (data && data.all_data && typeof data.all_data === 'object') {
                console.log('[Cloud] Lade', Object.keys(data.all_data).length, 'Keys in LocalStorage');
                
                /* ZWEI Durchgaenge, und die Reihenfolge ist der ganze Punkt.
                   `cloudKeyAllowed` liest das Freigabe-Flag aus dem LOKALEN
                   localStorage. Das Flag reist selbst als ganz normaler Key mit —
                   wird es erst NACH dem freigabepflichtigen Key geschrieben, ist
                   die Freigabe zum Pruefzeitpunkt noch nicht da und der Key wird
                   verworfen. Auf einem frischen Geraet fiel der Schatten-Tresor
                   dadurch beim ersten Herunterladen lautlos hinten runter — und
                   weil localStorage seine Schluessel in Einfuege-Reihenfolge
                   ausgibt (nicht alphabetisch), haengt es davon ab, ob der Nutzer
                   die Freigabe vor oder nach dem Tresor angelegt hat.
                   Deshalb: erst alle ungeschuetzten Keys (darunter die Flags),
                   dann die freigabepflichtigen. */
                const entriesAll = Object.entries(data.all_data)
                    .filter(([key]) => !key.startsWith('sb-') && !key.startsWith('supabase'));
                const gated = [];

                for (const [key, value] of entriesAll) {
                    /* Gesperrte Schluessel auch beim Herunterladen ueberspringen.
                       In alten Cloud-Zeilen liegt noch ein `schatten_vault` aus
                       der Zeit vor dem eigenen Sync-Weg. Wuerde er hier
                       zurueckgeschrieben, koennte ein Monate alter Spiegel den
                       frischen Stand aus der Tabelle `schatten_vault` schlagen —
                       bootVault nimmt den neueren der beiden, und ein alter Blob
                       traegt einen alten Zeitstempel, aber der lokale Spiegel
                       waere dann eben auch alt. Nicht anfassen ist hier richtig. */
                    if (CLOUD_BLOCKED_KEYS.has(key)) continue;
                    if (CLOUD_OPT_IN_KEYS[key]) { gated.push([key, value]); continue; }
                    localStorage.setItem(key, value);
                }
                for (const [key, value] of gated) {
                    /* Ohne Freigabe auch NICHT zurueckschreiben: sonst koennte eine
                       aeltere Cloud-Kopie einen lokalen Tresor ueberschreiben, der
                       nie hochgeladen werden sollte. */
                    if (!cloudKeyAllowed(key)) continue;
                    localStorage.setItem(key, value);
                }

                console.log('[Cloud] Daten erfolgreich synchronisiert!');
                return { success: true, itemsLoaded: Object.keys(data.all_data).length };
            } else {
                console.log('[Cloud] Keine Daten für diesen User gefunden (erste Nutzung?)');
                return { success: true, itemsLoaded: 0 };
            }
        } catch (error) {
            console.error('[Cloud] downloadFromCloud Fehler:', error.message || error);
            throw error;
        }
    }

    /**
     * Callback wenn sich der Auth-Status ändert
     * Kann von der Anwendung überschrieben werden
     * @param {boolean} isLoggedIn 
     * @param {Object} user 
     */
    onAuthStateChanged(isLoggedIn, user) {
        // Wird von UI überschrieben
        console.log('[Event] Auth State Changed:', { isLoggedIn, user: user?.email });
    }

    /**
     * Gibt den aktuellen User zurück
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Prüft ob User eingeloggt ist
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!this.user;
    }

    /**
     * Gibt Session-Info zurück
     * @returns {Object|null}
     */
    getSession() {
        return this.session;
    }
}

// Export für Browser
window.SupabaseCloudSync = SupabaseCloudSync;
