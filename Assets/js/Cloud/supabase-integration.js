/**
 * Supabase Cloud Sync Module
 * Verwaltet Authentifizierung, Daten-Upload/-Download und LocalStorage-Sync
 * 
 * @module supabase-integration
 * @author TechNova App Team
 * @version 1.0.0
 */

class SupabaseCloudSync {
    constructor(supabaseUrl, anonKey) {
        this.supabaseUrl = supabaseUrl;
        this.anonKey = anonKey;
        this.session = null;
        this.user = null;
        
        // Supabase Client initialisieren
        this.initializeClient();
        
        // Session bei Seitenladung wiederherstellen
        this.checkExistingSession();
        
        // Event Listener für Authentifizierung
        this.setupAuthListener();
    }

    /**
     * Initialisiert den Supabase Client über CDN
     * @private
     */
    initializeClient() {
        if (window.supabase && window.supabase.createClient) {
            this.client = window.supabase.createClient(this.supabaseUrl, this.anonKey);
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
                
                // Trigger UI Update
                this.onAuthStateChanged(true, this.user);
                
                // Automatisch vom Server synchronisieren (nicht-blocking)
                this.downloadFromCloud().catch(err => {
                    console.warn('[Cloud] Auto-Download beim Login fehlgeschlagen:', err);
                });
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
            // Sammle alle LocalStorage-Daten
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
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
                
                // Leere nicht alte Keys - nur neue hinzufügen
                Object.entries(data.all_data).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });

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
