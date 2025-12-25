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
     * Erstellt die UI-Elemente und injiziert sie ins DOM
     * @private
     */
    setupUI() {
        // HTML für Login-Modal und Sync-Container erstellen
        const uiHTML = `
            <!-- Cloud Sync Button Container (oben rechts) -->
            <div id="cloud-sync-container" class="cloud-sync-container" style="display: none;">
                <div class="cloud-sync-status">
                    <span id="cloud-user-email" class="cloud-user-email"></span>
                </div>
                <button id="cloud-sync-btn" class="cloud-sync-btn cloud-sync-primary" title="Daten in die Cloud hochladen">
                    <svg class="cloud-sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M7 18c-1.26 0-2.4-.756-2.82-1.844m0 0A3 3 0 0 1 6 9a4 4 0 0 1 4-4 4.001 4.001 0 0 1 8 0 3.999 3.999 0 0 1 2 3.5c0 1.073-.382 2.06-1.009 2.844"></path>
                        <path d="M12 13v6m-3-3l3 3 3-3"></path>
                    </svg>
                    <span class="cloud-sync-text">Synchronisieren</span>
                </button>
                <button id="cloud-logout-btn" class="cloud-sync-btn cloud-sync-logout" title="Abmelden">
                    <svg class="cloud-sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9"></path>
                    </svg>
                    <span class="cloud-sync-text">Abmelden</span>
                </button>
            </div>

            <!-- Cloud Login Modal -->
            <div id="cloud-login-modal" class="cloud-login-modal" style="display: none;">
                <div class="cloud-login-overlay" id="cloud-login-overlay"></div>
                <div class="cloud-login-box">
                    <button id="cloud-modal-close" class="cloud-modal-close" title="Schließen">&times;</button>
                    
                    <h2 class="cloud-login-title">Cloud Sync</h2>
                    <p class="cloud-login-description">Melde dich an, um deine Daten zu synchronisieren</p>

                    <form id="cloud-login-form" class="cloud-login-form">
                        <div class="cloud-form-group">
                            <label for="cloud-email-input" class="cloud-form-label">E-Mail-Adresse</label>
                            <input 
                                type="email" 
                                id="cloud-email-input" 
                                class="cloud-form-input" 
                                placeholder="deine@email.de" 
                                required
                            >
                        </div>

                        <button type="submit" id="cloud-login-submit" class="cloud-submit-btn">
                            <span class="cloud-submit-text">Magic Link senden</span>
                            <span class="cloud-loading" style="display: none;">⏳</span>
                        </button>

                        <div id="cloud-login-message" class="cloud-login-message" style="display: none;"></div>
                    </form>

                    <div class="cloud-login-info">
                        <p class="cloud-info-text">
                            📧 Ein Magic Link wird dir per E-Mail zugesendet.
                            <br>
                            Klicke auf den Link um dich anzumelden.
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Injiziere HTML ins DOM (vor </body>)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = uiHTML;
        document.body.appendChild(tempDiv);

        // Cache DOM-Referenzen
        this.loginModal = document.getElementById('cloud-login-modal');
        this.syncContainer = document.getElementById('cloud-sync-container');
        this.loginForm = document.getElementById('cloud-login-form');
        this.emailInput = document.getElementById('cloud-email-input');
        this.loginMessage = document.getElementById('cloud-login-message');
        this.syncBtn = document.getElementById('cloud-sync-btn');
        this.logoutBtn = document.getElementById('cloud-logout-btn');
        this.userEmailSpan = document.getElementById('cloud-user-email');

        // Event Listener
        this.setupEventListeners();
        
        // Styles einfügen
        this.injectStyles();
    }

    /**
     * Richtet Event-Listener ein
     * @private
     */
    setupEventListeners() {
        // Login Form
        this.loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        
        // Modal schließen Button
        document.getElementById('cloud-modal-close').addEventListener('click', () => this.closeLoginModal());
        
        // Overlay klicken = Modal schließen
        document.getElementById('cloud-login-overlay').addEventListener('click', () => this.closeLoginModal());
        
        // Sync Button
        this.syncBtn.addEventListener('click', () => this.handleSyncClick());
        
        // Logout Button
        this.logoutBtn.addEventListener('click', () => this.handleLogoutClick());

        // Login Button hinzufügen (wird in der App sein)
        const loginBtn = document.getElementById('cloud-login-btn-main');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.openLoginModal());
        }
    }

    /**
     * Injiziert CSS für Cloud Sync UI
     * @private
     */
    injectStyles() {
        const styles = `
            /* Cloud Sync Container */
            .cloud-sync-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: flex-end;
            }

            .cloud-sync-status {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            .cloud-user-email {
                display: block;
                word-break: break-all;
                max-width: 200px;
            }

            .cloud-sync-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px 16px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                color: white;
            }

            .cloud-sync-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }

            .cloud-sync-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .cloud-sync-primary:active {
                transform: translateY(0);
            }

            .cloud-sync-logout {
                background: #ef4444;
                font-size: 13px;
                padding: 8px 12px;
            }

            .cloud-sync-logout:hover {
                background: #dc2626;
                transform: translateY(-1px);
            }

            .cloud-sync-icon {
                width: 18px;
                height: 18px;
                flex-shrink: 0;
            }

            .cloud-sync-text {
                display: none;
            }

            /* Responsive: Show text on larger screens */
            @media (min-width: 768px) {
                .cloud-sync-text {
                    display: inline;
                }
            }

            /* Login Modal */
            .cloud-login-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .cloud-login-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }

            .cloud-login-box {
                position: relative;
                background: white;
                border-radius: 12px;
                padding: 40px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .cloud-modal-close {
                position: absolute;
                top: 15px;
                right: 15px;
                width: 32px;
                height: 32px;
                border: none;
                background: #f3f4f6;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .cloud-modal-close:hover {
                background: #e5e7eb;
            }

            .cloud-login-title {
                margin: 0 0 8px 0;
                font-size: 24px;
                font-weight: 700;
                color: #111827;
            }

            .cloud-login-description {
                margin: 0 0 24px 0;
                font-size: 14px;
                color: #6b7280;
            }

            .cloud-login-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .cloud-form-group {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .cloud-form-label {
                font-size: 13px;
                font-weight: 600;
                color: #374151;
            }

            .cloud-form-input {
                padding: 10px 14px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                transition: border-color 0.2s;
                font-family: inherit;
            }

            .cloud-form-input:focus {
                outline: none;
                border-color: #667eea;
                background: #f0f4ff;
            }

            .cloud-submit-btn {
                padding: 12px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }

            .cloud-submit-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .cloud-submit-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .cloud-loading {
                display: inline-block;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .cloud-login-message {
                padding: 12px;
                border-radius: 8px;
                font-size: 14px;
                text-align: center;
            }

            .cloud-login-message.success {
                background: #d1fae5;
                color: #065f46;
                border: 1px solid #a7f3d0;
            }

            .cloud-login-message.error {
                background: #fee2e2;
                color: #991b1b;
                border: 1px solid #fecaca;
            }

            .cloud-login-info {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
            }

            .cloud-info-text {
                margin: 0;
                font-size: 13px;
                color: #6b7280;
                line-height: 1.6;
            }

            /* Mobile Responsive */
            @media (max-width: 640px) {
                .cloud-sync-container {
                    top: 10px;
                    right: 10px;
                    gap: 8px;
                }

                .cloud-sync-btn {
                    padding: 8px 12px;
                    font-size: 13px;
                }

                .cloud-login-box {
                    padding: 24px;
                }

                .cloud-login-title {
                    font-size: 20px;
                }

                .cloud-user-email {
                    max-width: 150px;
                    font-size: 12px;
                }
            }
        `;

        const styleTag = document.createElement('style');
        styleTag.textContent = styles;
        document.head.appendChild(styleTag);
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
            } else {
                self.hideSyncContainer();
            }
        };
    }

    /**
     * Öffnet das Login-Modal
     */
    openLoginModal() {
        this.loginModal.style.display = 'flex';
        this.emailInput.focus();
    }

    /**
     * Schließt das Login-Modal
     */
    closeLoginModal() {
        this.loginModal.style.display = 'none';
        this.loginForm.reset();
        this.clearMessage();
    }

    /**
     * Zeigt den Sync-Container mit Benutzer-Info
     * @param {Object} user 
     */
    showSyncContainer(user) {
        this.syncContainer.style.display = 'flex';
        this.userEmailSpan.textContent = `👤 ${user.email}`;
    }

    /**
     * Versteckt den Sync-Container
     */
    hideSyncContainer() {
        this.syncContainer.style.display = 'none';
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
