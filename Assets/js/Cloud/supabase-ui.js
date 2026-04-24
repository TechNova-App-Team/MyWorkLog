/**
 * Supabase Cloud Sync UI Manager
 * Verwaltet UI-Elemente für Login und Daten-Synchronisation
 * 
 * @module supabase-ui
 * @author TechNova App Team
 * @version 1.0.0
 */

class SupabaseCloudSyncUI {
    constructor(cloudSyncInstance) {
        this.sync = cloudSyncInstance;
        this.loginModal = null;
        this.syncContainer = null;
        
        // Warte bis der cloudSync initialisiert ist
        if (this.sync) {
            this.setupUI();
            this.bindAuthCallbacks();
        }
    }

    /**
     * DEPRECATED: UI-Elemente sind jetzt fest im Settings Modal
     * Diese Methode injiziert keine Elemente mehr ins DOM
     * @private
     */
    setupUI() {
        // UI-Elemente sind jetzt FEST im HTML (Settings Modal)
        // Keine dynamische Injektion mehr nötig
        
        // Cache DOM-Referenzen (aus dem Settings Modal)
        this.loginModal = document.getElementById('cloud-login-modal');
        this.syncContainer = null; // Nicht mehr verwendet
        this.loginForm = document.getElementById('cloud-login-form');
        this.emailInput = document.getElementById('cloud-email-input');
        this.loginMessage = document.getElementById('cloud-login-message');
        this.syncBtn = null; // Nicht mehr verwendet
        this.logoutBtn = null; // Nicht mehr verwendet
        this.userEmailSpan = null; // Nicht mehr verwendet
        
        if (!this.loginForm) {
            console.warn('[Cloud UI] Login Form nicht gefunden - Settings Modal nicht geladen?');
            return;
        }
        
        console.log('[Cloud UI] ✅ UI-Elemente aus Settings Modal gefunden');
        
        // Event Listener
        this.setupEventListeners();
    }

    /**
     * Richtet Event-Listener ein
     * @private
     */
    setupEventListeners() {
        // Login Form (aus Settings Modal)
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        }
        
        // Modal Close Button (aus Settings Modal)
        const modalClose = document.getElementById('cloud-modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeLoginModal());
        }
        
        // Overlay klicken = Modal schließen (aus Settings Modal)
        const overlay = document.getElementById('cloud-login-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeLoginModal());
        }

        // Discord OAuth Button
        const discordBtn = document.getElementById('cloud-login-discord');
        if (discordBtn) {
            discordBtn.addEventListener('click', () => this.handleDiscordLogin());
        }

        // GitHub OAuth Button
        const githubBtn = document.getElementById('cloud-login-github');
        if (githubBtn) {
            githubBtn.addEventListener('click', () => this.handleGitHubLogin());
        }

        // Google OAuth Button
        const googleBtn = document.getElementById('cloud-login-google');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleLogin());
        }
        
        // Sync Buttons sind jetzt in Settings Modal - keine Event Listener nötig hier
        // Sie werden über onclick Handler in index.html aufgerufen
        
        console.log('[Cloud UI] Event Listeners wurden eingerichtet');
    }

    /**
     * Injiziert CSS für Cloud Sync UI
     * @private
     */
    injectStyles() {
        // Styles sind jetzt im index.html (Settings Modal)
        // Keine dynamische Injektion mehr nötig
        console.log('[Cloud UI] Styles sind bereits im Settings Modal CSS definiert');
    }
    /**
     * Bindet die Auth Callbacks vom CloudSync
     * @private
     */
    bindAuthCallbacks() {
        const self = this;

        // Überschreibe den onAuthStateChanged Callback
        this.sync.onAuthStateChanged = function(isLoggedIn, user) {
            if (isLoggedIn) {
                self.showSyncContainer(user);
                self.closeLoginModal();

                const showCloudAfterOAuth = localStorage.getItem('_showCloudTabAfterOAuth');

                // Nach erfolgreichem Login: Navigiere zum Cloud-Tab
                setTimeout(() => {
                    // Wenn OAuth: Öffne Settings und navigiere zum Cloud-Tab
                    if (showCloudAfterOAuth) {
                        localStorage.removeItem('_showCloudTabAfterOAuth');
                        if (window.openSettings) window.openSettings();
                    }
                    // Navigiere zum Cloud-Tab
                    if (window.switchSettingsTab) {
                        window.switchSettingsTab('cloud');
                    }
                }, 100);
            } else {
                self.hideSyncContainer();
            }
        };
    }

    /**
     * Öffnet das Login-Modal
     */
    openLoginModal() {
        if (this.loginModal) {
            this.loginModal.style.display = 'flex';
            this.emailInput.focus();
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        }
    }

    /**
     * Schließt das Login-Modal
     */
    closeLoginModal() {
        if (this.loginModal) {
            this.loginModal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scrolling
            this.loginForm.reset();
            this.clearMessage();
        }
    }

    /**
     * DEPRECATED: Sync-Container ist jetzt im Settings Modal
     * Diese Methode ist nicht mehr nötig
     */
    showSyncContainer(user) {
        // Sync-Container ist jetzt im Settings Modal
        // UI wird via updateCloudSyncUI() in index.html aktualisiert
        console.log('[Cloud UI] User angemeldet:', user.email);
    }

    /**
     * DEPRECATED: Sync-Container ist jetzt im Settings Modal
     * Diese Methode ist nicht mehr nötig
     */
    hideSyncContainer() {
        // Sync-Container ist jetzt im Settings Modal
        // UI wird via updateCloudSyncUI() in index.html aktualisiert
        console.log('[Cloud UI] User abgemeldet');
    }

    /**
     * Handler für Login Form Submit
     * @param {Event} e 
     */
    async handleLoginSubmit(e) {
        e.preventDefault();

        const email = this.emailInput.value.trim();
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');
        const submitText = submitBtn.querySelector('.cloud-submit-text');
        const loadingSpan = submitBtn.querySelector('.cloud-loading');

        try {
            // UI Feedback
            submitBtn.disabled = true;
            submitText.style.display = 'none';
            loadingSpan.style.display = 'inline-block';

            // Login
            await this.sync.loginWithEmail(email);

            // Success Message
            this.showMessage(
                '✅ Magic Link versendet! Bitte überprüfe deine E-Mail und klicke auf den Link.',
                'success'
            );

            // Form clearnen
            this.emailInput.value = '';
        } catch (error) {
            // Error Message
            this.showMessage(
                `❌ Fehler: ${error.message}`,
                'error'
            );
            console.error('Login error:', error);
        } finally {
            // UI zurücksetzen
            submitBtn.disabled = false;
            submitText.style.display = 'inline';
            loadingSpan.style.display = 'none';
        }
    }

    /**
     * Handler für Discord OAuth Login
     */
    async handleDiscordLogin() {
        const discordBtn = document.getElementById('cloud-login-discord');
        const originalText = discordBtn.innerHTML;

        try {
            discordBtn.disabled = true;
            discordBtn.innerHTML = '⏳ Discord...';
            localStorage.setItem('_showCloudTabAfterOAuth', 'true');
            await this.sync.loginWithDiscord();
        } catch (error) {
            this.showMessage(`❌ Discord Login fehlgeschlagen: ${error.message}`, 'error');
            discordBtn.disabled = false;
            discordBtn.innerHTML = originalText;
            localStorage.removeItem('_showCloudTabAfterOAuth');
        }
    }

    /**
     * Handler für GitHub OAuth Login
     */
    async handleGitHubLogin() {
        const githubBtn = document.getElementById('cloud-login-github');
        const originalText = githubBtn.innerHTML;

        try {
            githubBtn.disabled = true;
            githubBtn.innerHTML = '⏳ GitHub...';
            localStorage.setItem('_showCloudTabAfterOAuth', 'true');
            await this.sync.loginWithGitHub();
        } catch (error) {
            this.showMessage(`❌ GitHub Login fehlgeschlagen: ${error.message}`, 'error');
            githubBtn.disabled = false;
            githubBtn.innerHTML = originalText;
            localStorage.removeItem('_showCloudTabAfterOAuth');
        }
    }

    /**
     * Handler für Google OAuth Login
     */
    async handleGoogleLogin() {
        const googleBtn = document.getElementById('cloud-login-google');
        const originalText = googleBtn.innerHTML;

        try {
            googleBtn.disabled = true;
            googleBtn.innerHTML = '⏳ Google...';
            localStorage.setItem('_showCloudTabAfterOAuth', 'true');
            await this.sync.loginWithGoogle();
        } catch (error) {
            this.showMessage(`❌ Google Login fehlgeschlagen: ${error.message}`, 'error');
            googleBtn.disabled = false;
            googleBtn.innerHTML = originalText;
            localStorage.removeItem('_showCloudTabAfterOAuth');
        }
    }

    /**
     * Handler für Sync Button Click
     */
    async handleSyncClick() {
        const syncBtn = this.syncBtn;
        const originalHTML = syncBtn.innerHTML;

        try {
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<span class="cloud-loading">⏳</span>';

            // Upload Daten
            await this.sync.uploadToCloud();

            // Success Feedback
            syncBtn.innerHTML = '✅';
            setTimeout(() => {
                syncBtn.innerHTML = originalHTML;
                syncBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Sync error:', error);
            syncBtn.innerHTML = '❌';
            setTimeout(() => {
                syncBtn.innerHTML = originalHTML;
                syncBtn.disabled = false;
            }, 2000);
        }
    }

    /**
     * Handler für Logout Button Click
     */
    async handleLogoutClick() {
        if (confirm('Wirklich abmelden?')) {
            try {
                await this.sync.logout();
                this.hideSyncContainer();
            } catch (error) {
                console.error('Logout error:', error);
                alert('Fehler beim Abmelden: ' + error.message);
            }
        }
    }

    /**
     * Zeigt Login-Nachricht
     * @param {string} message 
     * @param {string} type 'success' oder 'error'
     */
    showMessage(message, type = 'success') {
        this.loginMessage.textContent = message;
        this.loginMessage.className = `cloud-login-message ${type}`;
        this.loginMessage.style.display = 'block';
    }

    /**
     * Versteckt Nachricht
     */
    clearMessage() {
        this.loginMessage.style.display = 'none';
        this.loginMessage.textContent = '';
    }

    /**
     * Erstellt einen manuellen Login-Button für die App (optional)
     * @returns {HTMLElement}
     */
    createLoginButton() {
        const btn = document.createElement('button');
        btn.id = 'cloud-login-btn-main';
        btn.textContent = '☁️ Cloud Login';
        btn.style.cssText = `
            padding: 10px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        `;
        btn.addEventListener('click', () => this.openLoginModal());
        return btn;
    }
}

// Export
window.SupabaseCloudSyncUI = SupabaseCloudSyncUI;
