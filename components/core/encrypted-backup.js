// ═══ CORE: ENCRYPTED-BACKUP ═══
    // ===== ENCRYPTED BACKUP SYSTEM (KRASS SICHER!) =====
    // AES-256-GCM mit PBKDF2 Key-Derivation, Salts, IVs, Authentifizierung
    
    const ENCRYPTION_VERSION = 1;
    const PBKDF2_ITERATIONS = 600000; // Modern standard (OWASP 2023)
    const AES_KEY_LENGTH = 256;
    const GCM_TAG_LENGTH = 128;
    const SALT_LENGTH = 32;
    const IV_LENGTH = 12;
    
    // Hilfsfunktion: String -> Uint8Array
    function stringToUint8Array(str) {
        return new TextEncoder().encode(str);
    }
    
    // Hilfsfunktion: Uint8Array -> Base64
    function uint8ArrayToBase64(arr) {
        return btoa(String.fromCharCode.apply(null, arr));
    }
    
    // Hilfsfunktion: Base64 -> Uint8Array
    function base64ToUint8Array(b64) {
        const bstr = atob(b64);
        const arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
            arr[i] = bstr.charCodeAt(i);
        }
        return arr;
    }
    
    // Derive Encryption Key from Password using PBKDF2
    async function deriveKeyFromPassword(password, salt) {
        const key = await crypto.subtle.importKey(
            'raw',
            stringToUint8Array(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );
        
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            key,
            AES_KEY_LENGTH
        );
        
        return crypto.subtle.importKey(
            'raw',
            derivedBits,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
    }
    
    // Encrypt Backup Data
    async function encryptBackupData(jsonData, password) {
        try {
            const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
            const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
            
            const key = await deriveKeyFromPassword(password, salt);
            
            const plaintext = stringToUint8Array(jsonData);
            
            const ciphertext = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: GCM_TAG_LENGTH
                },
                key,
                plaintext
            );
            
            // Struktur: version(1) + salt(32) + iv(12) + ciphertext + tag
            const encryptedData = {
                v: ENCRYPTION_VERSION,
                salt: uint8ArrayToBase64(salt),
                iv: uint8ArrayToBase64(iv),
                data: uint8ArrayToBase64(new Uint8Array(ciphertext))
            };
            
            return JSON.stringify(encryptedData);
        } catch (e) {
            console.error('Encryption Error:', e);
            throw new Error('Verschlüsselung fehlgeschlagen: ' + e.message);
        }
    }
    
    // Decrypt Backup Data
    async function decryptBackupData(encryptedJson, password) {
        try {
            const encryptedData = JSON.parse(encryptedJson);
            
            if (encryptedData.v !== ENCRYPTION_VERSION) {
                throw new Error('Unbekannte Verschlüsselungsversion');
            }
            
            const salt = base64ToUint8Array(encryptedData.salt);
            const iv = base64ToUint8Array(encryptedData.iv);
            const ciphertext = base64ToUint8Array(encryptedData.data);
            
            const key = await deriveKeyFromPassword(password, salt);
            
            const plaintext = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    tagLength: GCM_TAG_LENGTH
                },
                key,
                ciphertext
            );
            
            return new TextDecoder().decode(plaintext);
        } catch (e) {
            console.error('Decryption Error:', e);
            if (e.message.includes('Decryption failed')) {
                throw new Error('Falsches Passwort oder beschädigte Datei!');
            }
            throw new Error('Entschlüsselung fehlgeschlagen: ' + e.message);
        }
    }
    
    // Export mit Verschlüsselung
    async function exportEncryptedBackup() {
        console.log('[DEBUG] exportEncryptedBackup called');
        
        const modal = document.getElementById('encryptedBackupModal');
        if (!modal) {
            console.error('[ERROR] Modal nicht gefunden');
            showCustomMessage('❌ Fehler', 'Modal nicht gefunden', 'error');
            return;
        }
        
        const passwordInput = document.getElementById('encryptPasswordInput');
        const confirmInput = document.getElementById('encryptPasswordConfirmInput');
        
        if (!passwordInput || !confirmInput) {
            console.error('[ERROR] Password inputs nicht gefunden');
            showCustomMessage('❌ Fehler', 'Passwort-Felder nicht gefunden', 'error');
            return;
        }
        
        const password = passwordInput.value.trim();
        const confirmPassword = confirmInput.value.trim();
        
        console.log('[DEBUG] Password validation:', { hasPassword: !!password, match: password === confirmPassword, length: password.length });
        
        // Validierungen
        if (!password) {
            showCustomMessage('⚠️ Passwort erforderlich', 'Bitte ein Passwort eingeben', 'warning');
            return;
        }
        
        if (password !== confirmPassword) {
            showCustomMessage('⚠️ Passwörter stimmen nicht überein', 'Passwort-Bestätigung prüfen', 'warning');
            return;
        }
        
        if (password.length < 8) {
            showCustomMessage('⚠️ Passwort zu kurz', 'Mindestens 8 Zeichen erforderlich', 'warning');
            return;
        }
        
        // Passwort-Stärke prüfen
        const strength = calculatePasswordStrength(password);
        console.log('[DEBUG] Password strength:', strength);
        
        if (strength < 2) {
            showCustomMessage('⚠️ Schwaches Passwort', 'Bitte Großbuchstaben, Zahlen & Symbole verwenden', 'warning');
            return;
        }
        
        // Loading-State
        const exportBtn = document.getElementById('encryptExportBtn');
        const originalText = exportBtn.textContent;
        exportBtn.disabled = true;
        exportBtn.textContent = '🔒 Verschlüssele...';
        
        try {
            console.log('[DEBUG] Starting encryption...');
            console.log('[DEBUG] Data object size:', JSON.stringify(data).length, 'bytes');
            
            const jsonData = JSON.stringify(collectFullBackup());
            const encryptedData = await encryptBackupData(jsonData, password);
            
            console.log('[DEBUG] Encryption successful, encrypted size:', encryptedData.length, 'bytes');
            
            // Download
            const a = document.createElement('a');
            const blob = new Blob([encryptedData], {type:'application/json'});
            a.href = URL.createObjectURL(blob);
            a.download = 'time_pro_encrypted_backup_' + new Date().toISOString().split('T')[0] + '.encrypted.json';
            
            console.log('[DEBUG] Triggering download:', a.download);
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            
            console.log('[DEBUG] Download triggered successfully');
            
            // Cleanup
            passwordInput.value = '';
            confirmInput.value = '';
            modal.classList.remove('active');
            
            showCustomMessage('✅ Sicher verschlüsselt', 'Backup wurde mit AES-256-GCM verschlüsselt & heruntergeladen', 'success');
            try { localStorage.setItem('mwl_last_export', new Date().toISOString()); } catch(e) {}
        } catch (e) {
            console.error('[ERROR] Export failed:', e);
            showCustomMessage('❌ Verschlüsselung fehlgeschlagen', e.message, 'error');
        } finally {
            exportBtn.disabled = false;
            exportBtn.textContent = originalText;
        }
    }
    
    // Import & Decrypt
    async function importEncryptedBackup(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const modal = document.getElementById('importEncryptedBackupModal');
        if (!modal) return;
        
        modal.classList.add('active');
        document.getElementById('importEncryptedFileName').textContent = file.name;
        document.getElementById('importEncryptedFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
        
        // Speichere Datei für später
        window.pendingEncryptedBackupFile = file;
    }
    
    // Finalize Import mit Passwort
    async function finalizeImportEncryptedBackup() {
        const file = window.pendingEncryptedBackupFile;
        if (!file) {
            showCustomMessage('❌ Fehler', 'Keine Datei ausgewählt', 'error');
            return;
        }
        
        const passwordInput = document.getElementById('importEncryptPasswordInput');
        const password = passwordInput.value.trim();
        
        if (!password) {
            showCustomMessage('⚠️ Passwort erforderlich', 'Bitte Passwort eingeben', 'warning');
            return;
        }
        
        const modal = document.getElementById('importEncryptedBackupModal');
        const decryptBtn = document.getElementById('importEncryptDecryptBtn');
        const originalText = decryptBtn.textContent;
        decryptBtn.disabled = true;
        decryptBtn.textContent = '🔓 Entschlüssele...';
        
        try {
            const encryptedJson = await file.text();
            const plainJson = await decryptBackupData(encryptedJson, password);
            const parsed = JSON.parse(plainJson);
            
            // Unterstützt v2 (full) und v1 (legacy)
            restoreFullBackup(parsed);
            
            passwordInput.value = '';
            modal.classList.remove('active');
            window.pendingEncryptedBackupFile = null;
            
            showCustomMessage('✅ Daten wiederhergestellt', 
                parsed._backupVersion === 2 
                    ? `Vollständiges verschlüsseltes Backup (${parsed._keyCount || '?'} Keys) wiederhergestellt. Seite wird aktualisiert...`
                    : 'Legacy-Backup entschlüsselt & importiert. Seite wird aktualisiert...', 
                'success');
            setTimeout(() => location.reload(), 1500);
        } catch (e) {
            showCustomMessage('❌ Import fehlgeschlagen', e.message, 'error');
        } finally {
            decryptBtn.disabled = false;
            decryptBtn.textContent = originalText;
        }
    }
    
    // Passwort-Stärke berechnen
    function calculatePasswordStrength(password) {
        let strength = 0;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        if (password.length >= 12) strength++;
        return strength;
    }
    
    // Passwort-Stärke-Indikator
    function updatePasswordStrengthIndicator(inputId, indicatorId) {
        const input = document.getElementById(inputId);
        const indicator = document.getElementById(indicatorId);
        if (!input || !indicator) return;
        
        const strength = calculatePasswordStrength(input.value);
        const strengthLevels = [
            { label: 'Sehr schwach', color: '#ef4444', width: '20%' },
            { label: 'Schwach', color: '#f97316', width: '40%' },
            { label: 'Mittel', color: '#f59e0b', width: '60%' },
            { label: 'Stark', color: '#10b981', width: '80%' },
            { label: 'Sehr stark', color: '#06b6d4', width: '100%' }
        ];
        
        const level = strengthLevels[Math.min(strength, strengthLevels.length - 1)];
        indicator.style.width = level.width;
        indicator.style.backgroundColor = level.color;
        
        const labelEl = document.getElementById(indicatorId + 'Label');
        if (labelEl) labelEl.textContent = level.label;
    }
    
    // ========== FULL LOCALSTORAGE BACKUP HELPERS ==========
    // Sammelt ALLE relevanten localStorage-Schlüssel für ein vollständiges Backup
    function collectFullBackup() {
        const snapshot = {};
        const skipPrefixes = ['p2p_deviceId', 'p2p_lastSync'];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // P2P-Signaling ist transient → nicht sichern
            if (skipPrefixes.some(p => key.startsWith(p))) continue;
            try { snapshot[key] = localStorage.getItem(key); } catch(e) {}
        }
        return {
            _backupVersion: 2,
            _created: new Date().toISOString(),
            _appName: 'MyWorkLog',
            _keyCount: Object.keys(snapshot).length,
            _localStorage: snapshot
        };
    }

    // Stellt ein Backup wieder her – unterstützt v2 (full) und v1 (legacy data-only)
    function restoreFullBackup(parsed) {
        if (parsed._backupVersion === 2 && parsed._localStorage) {
            // V2: Komplettes localStorage-Backup
            // Alle bestehenden App-Keys entfernen
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) keysToRemove.push(localStorage.key(i));
            keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch(e){} });
            // Alle gesicherten Keys wiederherstellen
            for (const [key, value] of Object.entries(parsed._localStorage)) {
                try { localStorage.setItem(key, value); } catch(e) {}
            }
            // Aktuelles data-Objekt aus wiederhergestelltem Storage laden
            const restored = localStorage.getItem('tg_pro_data');
            if (restored) data = JSON.parse(restored);
        } else if (parsed.entries && parsed.settings) {
            // V1 Legacy: nur data-Objekt
            data = parsed;
            save();
        } else {
            throw new Error('Ungültige Backup-Datei: weder v2-Format noch gültiges Legacy-Format erkannt.');
        }
        // Import = gültiges Backup vorhanden → Reminder zurücksetzen
        try {
            localStorage.setItem('mwl_last_export', new Date().toISOString());
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem('mwl_export_reminder_shown_' + today, '1');
        } catch(e) {}
    }
    function updateShortcutsPanelVisibility() {
        const panel = document.getElementById('shortcutsPanel');
        const isEnabled = data.settings.shortcutsEnabled !== false;
        
        if (panel) {
            if (isEnabled) {
                panel.style.display = 'block';
                panel.style.opacity = '1';
                panel.style.pointerEvents = 'auto';
                // Render shortcuts wenn Panel sichtbar wird
                renderShortcutsPanel();
            } else {
                panel.style.display = 'none';
                panel.style.opacity = '0';
                panel.style.pointerEvents = 'none';
            }
        }
    }
    