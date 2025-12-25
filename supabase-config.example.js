/**
 * SUPABASE KONFIGURATION
 * 
 * WICHTIG: Diese Datei enthält sensible Credentials!
 * 
 * Schritte:
 * 1. Kopiere diese Datei in den Namen "supabase-config.js" (ohne .example)
 * 2. Ersetze DEINE_ANON_KEY mit deinem echten Anon Key von Supabase
 * 3. Füge supabase-config.js zu .gitignore hinzu (nicht in GitHub hochladen!)
 * 4. Lade die Datei NACH dem Supabase CDN Script: <script src="supabase-config.js"></script>
 */

// Supabase Konfiguration
const SUPABASE_CONFIG = {
    URL: 'https://fouucibowmukxvweratn.supabase.co',
    ANON_KEY: 'sb_secret_Rwhav0zGXT2yZB2P2E5sLg_kALF6O68sb_publishable_IFPpCwVcb9qW1qgYpQcs2w_sabK6Nyb' // Ersetze mit deinem echten Key
};

// Initialisiere den Cloud Sync nach DOM-Load
document.addEventListener('DOMContentLoaded', () => {
    window.cloudSync = new SupabaseCloudSync(
        SUPABASE_CONFIG.URL,
        SUPABASE_CONFIG.ANON_KEY
    );
    
    console.log('[Init] Supabase Cloud Sync wurde initialisiert');
});
