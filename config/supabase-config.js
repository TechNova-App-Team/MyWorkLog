// Supabase Konfiguration
const SUPABASE_CONFIG = {
    URL: 'https://fouucibowmukxvweratn.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdXVjaWJvd211a3h2d2VyYXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2ODMyMDAsImV4cCI6MjA4MjI1OTIwMH0.NVvNRLvewzF0r3iWQwrWTB1Zt9GRj5RAnlzv8btrv_w'
};

// Initialisiere den Cloud Sync nach DOM-Load
document.addEventListener('DOMContentLoaded', () => {
    window.cloudSync = new SupabaseCloudSync(
        SUPABASE_CONFIG.URL,
        SUPABASE_CONFIG.ANON_KEY
    );
    
    console.log('[Init] Supabase Cloud Sync wurde initialisiert');
});
