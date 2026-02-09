// Supabase Konfiguration
const SUPABASE_CONFIG = {
    URL: 'https://fouucibowmukxvweratn.supabase.co',
    ANON_KEY: 'sb_publishable_DH-ZZ_4dTOqfi1H3zrxfKA_ASFhLQPa'
};

// Initialisiere den Cloud Sync nach DOM-Load
document.addEventListener('DOMContentLoaded', () => {
    window.cloudSync = new SupabaseCloudSync(
        SUPABASE_CONFIG.URL,
        SUPABASE_CONFIG.ANON_KEY
    );
    
    console.log('[Init] Supabase Cloud Sync wurde initialisiert');
});
