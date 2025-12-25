/**
 * Supabase Cloud Sync - Advanced Usage Beispiele
 * 
 * Dieses Dokument zeigt fortgeschrittene Implementierungen und Custom-Logik
 */

// ============================================================================
// 1. CUSTOM SYNCHRONISIERUNGS-LOGIK
// ============================================================================

/**
 * Selective Sync - Synchronisiere nur bestimmte Keys
 */
class SelectiveSyncManager {
    constructor(cloudSync) {
        this.sync = cloudSync;
        this.allowedKeys = ['settings', 'user_profile', 'preferences'];
    }

    async uploadSelected() {
        if (!this.sync.isLoggedIn()) {
            throw new Error('User nicht eingeloggt');
        }

        const dataToUpload = {};
        
        // Sammle nur erlaubte Keys
        this.allowedKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                dataToUpload[key] = value;
            }
        });

        // Speichere in Supabase
        const { error } = await this.sync.client
            .from('Users')
            .upsert({
                case: this.sync.user.id,
                all_data: dataToUpload,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;
        console.log('[Selective] Nur erlaubte Keys hochgeladen');
    }

    async downloadSelected() {
        if (!this.sync.isLoggedIn()) {
            throw new Error('User nicht eingeloggt');
        }

        const { data, error } = await this.sync.client
            .from('Users')
            .select('all_data')
            .eq('case', this.sync.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.all_data) {
            // Lade nur erlaubte Keys
            this.allowedKeys.forEach(key => {
                if (data.all_data[key]) {
                    localStorage.setItem(key, data.all_data[key]);
                }
            });
            
            console.log('[Selective] Nur erlaubte Keys heruntergeladen');
        }
    }

    addAllowedKey(key) {
        if (!this.allowedKeys.includes(key)) {
            this.allowedKeys.push(key);
        }
    }

    removeAllowedKey(key) {
        this.allowedKeys = this.allowedKeys.filter(k => k !== key);
    }
}

// ============================================================================
// 2. AUTO-SYNC MIT INTERVALLEN
// ============================================================================

class AutoSyncManager {
    constructor(cloudSync, intervalMs = 5 * 60 * 1000) {
        this.sync = cloudSync;
        this.intervalMs = intervalMs;
        this.syncInterval = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        
        console.log('[AutoSync] Gestartet mit Intervall:', this.intervalMs / 1000, 'Sekunden');
        
        this.syncInterval = setInterval(async () => {
            if (!this.sync.isLoggedIn()) {
                console.log('[AutoSync] User nicht eingeloggt, überspringe Sync');
                return;
            }

            try {
                await this.sync.uploadToCloud();
                console.log('[AutoSync] ✅ Automatische Synchronisation erfolgreich');
            } catch (error) {
                console.error('[AutoSync] ❌ Fehler:', error.message);
            }
        }, this.intervalMs);

        this.isRunning = true;
    }

    stop() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            this.isRunning = false;
            console.log('[AutoSync] Gestoppt');
        }
    }

    setInterval(ms) {
        this.intervalMs = ms;
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }
}

// ============================================================================
// 3. SYNC MIT KONFLIKT-AUFLÖSUNG
// ============================================================================

class ConflictResolvingSyncManager {
    constructor(cloudSync) {
        this.sync = cloudSync;
    }

    /**
     * Merge Strategy: Cloud-Daten gewinnen (overwrite lokal)
     */
    async downloadWithCloudWins() {
        const result = await this.sync.downloadFromCloud();
        console.log('[Conflict] Cloud-Daten haben Vorrang (lokal überschrieben)');
        return result;
    }

    /**
     * Merge Strategy: Lokale Daten gewinnen (cloud wird überschrieben)
     */
    async uploadWithLocalWins() {
        const result = await this.sync.uploadToCloud();
        console.log('[Conflict] Lokale Daten haben Vorrang (Cloud überschrieben)');
        return result;
    }

    /**
     * Smart Merge: Zusammenführen von beiden Seiten
     * Ältere Einträge werden gelöscht, neue Keys hinzugefügt
     */
    async smartMerge() {
        if (!this.sync.isLoggedIn()) {
            throw new Error('User nicht eingeloggt');
        }

        try {
            // Hole Cloud-Daten
            const { data, error } = await this.sync.client
                .from('Users')
                .select('all_data, updated_at')
                .eq('case', this.sync.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            // Merge Logik
            const cloudData = data?.all_data || {};
            const mergedData = {};

            // Behalte ALLE lokalen Keys
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                mergedData[key] = localStorage.getItem(key);
            }

            // Füge neue Cloud-Keys hinzu (falls nicht lokal vorhanden)
            Object.entries(cloudData).forEach(([key, value]) => {
                if (!mergedData[key]) {
                    mergedData[key] = value;
                }
            });

            // Speichere merged Data
            const { error: updateError } = await this.sync.client
                .from('Users')
                .upsert({
                    case: this.sync.user.id,
                    all_data: mergedData,
                    updated_at: new Date().toISOString()
                })
                .select();

            if (updateError) throw updateError;

            console.log('[Conflict] Smart Merge erfolgreich durchgeführt');
            return { success: true, merged: Object.keys(mergedData).length };
        } catch (error) {
            console.error('[Conflict] Merge Fehler:', error);
            throw error;
        }
    }
}

// ============================================================================
// 4. VERSCHLÜSSELTE SYNCHRONISATION (Advanced)
// ============================================================================

class EncryptedSyncManager {
    constructor(cloudSync) {
        this.sync = cloudSync;
        // Hinweis: Das ist ein Placeholder - für echte Verschlüsselung:
        // nutze TweetNaCl.js oder TweakTweet oder crypto-js
    }

    /**
     * Beispiel: Base64 Encoding (NICHT sicher! Nur zur Demo!)
     * Für echte Sicherheit: Verwende AES-256 oder ähnliches
     */
    async uploadEncrypted() {
        const localData = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            // Encoding (NOT SECURE!)
            localData[key] = btoa(value);
        }

        const { error } = await this.sync.client
            .from('Users')
            .upsert({
                case: this.sync.user.id,
                all_data: localData,
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;
        console.log('[Encrypted] Daten hochgeladen (Base64 encoded)');
    }

    async downloadEncrypted() {
        const { data, error } = await this.sync.client
            .from('Users')
            .select('all_data')
            .eq('case', this.sync.user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data && data.all_data) {
            Object.entries(data.all_data).forEach(([key, encryptedValue]) => {
                try {
                    // Decode (NOT SECURE!)
                    const decodedValue = atob(encryptedValue);
                    localStorage.setItem(key, decodedValue);
                } catch (e) {
                    console.warn(`[Encrypted] Fehler beim Dekodieren von ${key}`);
                }
            });
            console.log('[Encrypted] Daten heruntergeladen und dekodiert');
        }
    }
}

// ============================================================================
// 5. BACKUP & RESTORE
// ============================================================================

class BackupRestoreManager {
    constructor(cloudSync) {
        this.sync = cloudSync;
        this.backups = [];
    }

    /**
     * Erstelle einen lokalen Backup
     */
    createLocalBackup(name = null) {
        const backupName = name || `backup_${new Date().toISOString()}`;
        const backupData = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            backupData[key] = localStorage.getItem(key);
        }

        const backup = {
            name: backupName,
            timestamp: Date.now(),
            size: JSON.stringify(backupData).length,
            data: backupData
        };

        this.backups.push(backup);
        localStorage.setItem(
            `__backup_${backupName}`,
            JSON.stringify(backup)
        );

        console.log('[Backup] Backup erstellt:', backupName);
        return backup;
    }

    /**
     * Stelle einen Backup wieder her
     */
    restoreLocalBackup(backupName) {
        const backupJson = localStorage.getItem(`__backup_${backupName}`);
        
        if (!backupJson) {
            throw new Error(`Backup nicht gefunden: ${backupName}`);
        }

        const backup = JSON.parse(backupJson);
        
        // Stelle alle Keys wieder her
        Object.entries(backup.data).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });

        console.log('[Backup] Backup wiederhergestellt:', backupName);
        return backup;
    }

    /**
     * Liste alle lokalen Backups auf
     */
    listLocalBackups() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('__backup_')) {
                const backup = JSON.parse(localStorage.getItem(key));
                backups.push({
                    name: backup.name,
                    timestamp: backup.timestamp,
                    size: backup.size,
                    date: new Date(backup.timestamp).toLocaleString('de-DE')
                });
            }
        }

        return backups;
    }

    /**
     * Speichere aktuellen State als Cloud-Backup
     */
    async createCloudBackup(name = null) {
        if (!this.sync.isLoggedIn()) {
            throw new Error('User nicht eingeloggt');
        }

        const backupName = name || `cloud_backup_${Date.now()}`;
        const backupData = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            backupData[key] = localStorage.getItem(key);
        }

        // Speichere als separate Tabelle/Record
        const { error } = await this.sync.client
            .from('Users')
            .upsert({
                case: this.sync.user.id,
                all_data: {
                    [backupName]: JSON.stringify(backupData)
                },
                updated_at: new Date().toISOString()
            })
            .select();

        if (error) throw error;
        console.log('[Backup] Cloud-Backup erstellt:', backupName);
    }
}

// ============================================================================
// 6. STATISTIK & MONITORING
// ============================================================================

class SyncStatisticsManager {
    constructor(cloudSync) {
        this.sync = cloudSync;
        this.stats = {
            totalUploads: 0,
            totalDownloads: 0,
            totalErrors: 0,
            lastUploadTime: null,
            lastDownloadTime: null,
            lastErrorTime: null,
            uploadedBytes: 0,
            downloadedBytes: 0
        };

        this.loadStatsFromStorage();
    }

    loadStatsFromStorage() {
        const stored = localStorage.getItem('__sync_stats');
        if (stored) {
            try {
                this.stats = JSON.parse(stored);
            } catch (e) {
                console.error('Fehler beim Laden der Statistiken');
            }
        }
    }

    saveStatsToStorage() {
        localStorage.setItem('__sync_stats', JSON.stringify(this.stats));
    }

    recordUpload(byteSize) {
        this.stats.totalUploads++;
        this.stats.lastUploadTime = new Date().toISOString();
        this.stats.uploadedBytes += byteSize;
        this.saveStatsToStorage();
    }

    recordDownload(byteSize) {
        this.stats.totalDownloads++;
        this.stats.lastDownloadTime = new Date().toISOString();
        this.stats.downloadedBytes += byteSize;
        this.saveStatsToStorage();
    }

    recordError() {
        this.stats.totalErrors++;
        this.stats.lastErrorTime = new Date().toISOString();
        this.saveStatsToStorage();
    }

    getStatistics() {
        return {
            ...this.stats,
            averageUploadSize: this.stats.totalUploads > 0 
                ? Math.round(this.stats.uploadedBytes / this.stats.totalUploads)
                : 0,
            averageDownloadSize: this.stats.totalDownloads > 0
                ? Math.round(this.stats.downloadedBytes / this.stats.totalDownloads)
                : 0,
            successRate: (this.stats.totalUploads + this.stats.totalDownloads) > 0
                ? Math.round(((this.stats.totalUploads + this.stats.totalDownloads - this.stats.totalErrors) / 
                   (this.stats.totalUploads + this.stats.totalDownloads)) * 100)
                : 0
        };
    }

    printStatistics() {
        const stats = this.getStatistics();
        console.table(stats);
    }

    resetStatistics() {
        this.stats = {
            totalUploads: 0,
            totalDownloads: 0,
            totalErrors: 0,
            lastUploadTime: null,
            lastDownloadTime: null,
            lastErrorTime: null,
            uploadedBytes: 0,
            downloadedBytes: 0
        };
        this.saveStatsToStorage();
        console.log('[Stats] Statistiken zurückgesetzt');
    }
}

// ============================================================================
// 7. USAGE BEISPIELE
// ============================================================================

/*
// Selective Sync
const selectiveSync = new SelectiveSyncManager(window.cloudSync);
selectiveSync.addAllowedKey('my_important_data');
await selectiveSync.uploadSelected();

// Auto Sync (alle 5 Minuten)
const autoSync = new AutoSyncManager(window.cloudSync, 5 * 60 * 1000);
autoSync.start();

// Smart Merge
const conflictManager = new ConflictResolvingSyncManager(window.cloudSync);
await conflictManager.smartMerge();

// Backup & Restore
const backupManager = new BackupRestoreManager(window.cloudSync);
backupManager.createLocalBackup('before_update');
// ... später ...
backupManager.restoreLocalBackup('before_update');

// Statistiken
const statsManager = new SyncStatisticsManager(window.cloudSync);
statsManager.printStatistics();
*/

// Export für Browser
window.SelectiveSyncManager = SelectiveSyncManager;
window.AutoSyncManager = AutoSyncManager;
window.ConflictResolvingSyncManager = ConflictResolvingSyncManager;
window.EncryptedSyncManager = EncryptedSyncManager;
window.BackupRestoreManager = BackupRestoreManager;
window.SyncStatisticsManager = SyncStatisticsManager;
