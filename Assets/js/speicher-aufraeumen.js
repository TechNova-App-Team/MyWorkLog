// ═══ SPEICHER-AUFRAEUMEN MODULE ═══
// Loescht localStorage-Schluessel, die kein Code mehr liest — Altbestand entfernter Funktionen.
// Laeuft einmal je STAND im Leerlauf nach dem Start (App, Berichtsheft, Aufgaben teilen sich den Ursprung).
//
// Regeln, damit hier nie echte Daten verschwinden:
// - NUR exakte Namen, kein Muster. Einzige Ausnahme sind Saison-Schluessel mit Jahreszahl, und die nur
//   fuer VERGANGENE Jahre (das laufende liest die Saison-Karte noch).
// - Ein Name kommt erst auf die Liste, wenn ihn kein Quelltext mehr erwaehnt.
//   tools/speicher-aufraeumen.test.mjs schlaegt an, sobald einer davon wieder irgendwo auftaucht.
// - Fremde Schluessel (Supabase sb-*, PostHog ph_*, loglevel, last-purchase-url, ongoing-checkout-events,
//   Hash-Namen von Erweiterungen) stehen bewusst NICHT drauf: die gehoeren nicht uns.
// - mwl_fachgespraech_v1 bleibt vorerst: Pass-Nutzertext ohne Uebernahme nach v2 (Stand 22.11.2026).
// Neue Namen dazu → STAND hochzaehlen, sonst laeuft es bei Leuten, die schon aufgeraeumt haben, nie wieder.
(function () {
    'use strict';

    var STAND = '1';
    var MERKER = 'mwl_speicher_aufgeraeumt';

    // Gemessen 22.11.2026 an einem echten Langzeit-Browser: 164 Eintraege, davon diese ohne Leser.
    var TOT = [
        // Aufgaben-Vorgaenger, alte Aufgaben-Felder
        'WORKLOG_TASKS_V1', 'mwl_tasks_achievements', 'mwl_tasks_viewMode', 'mwl_tasks_weekAssignments',
        // KI-Bot vor dem Assistenten, alter Berichtsheft-Generator
        'aiBotHistoryPro', 'aiBotModalDismissed', 'webllm_state',
        'ais_cloud_v2_announcement_dismissed', 'ais_training_year', 'bh_preise_hinweis_v1',
        // Ghost Mode (entfernt v7.5.4)
        'ghost_countdown_mode', 'ghost_total_time_ms', 'ghost_visit_start', 'tg_ghost_announced',
        // Ausbildungshilfe / Lern-Dashboard / Skill-Baum / Reiseplaner
        'fia_last', 'fia_mods', 'fia_ph', 'fia_quiz', 'fia_streak', 'fia_summary',
        'lastVisit', 'studyDays', 'mwl_skill_scanned', 'mwl_skill_tree', 'tdf4',
        // Alte Dashboard-, Banner- und Hinweis-Zustaende
        'isPinned', 'mwl_dn_arrived', 'mwl_update_banner_v1', 'mwl_projectstatus_dismissed_v1',
        'mwl_lang_promo_dismissed', 'tg_support_banner_dismissed_until', 'tg_support_banner_last_shown',
        'tg_galaxy_settings', 'tg_last_holiday_check', 'tg_last_save', 'bug-theme',
        // Pendel-Rechner, alter Vertrags-Speicher (Inhalt lebt in contract_manager_v2)
        'mwl_commute_coords', 'mwl_commute_settings', 'contract_manager_data',
        // Alte Meldungs-Ablagen
        'timetracker_maintenance', 'timetracker_updates'
    ];

    var SAISON = /^mwl_(halloween|geburtstag|weihnachten)(_[a-z]+)?_(\d{4})$/;

    function aufraeumen() {
        var ls;
        try { ls = window.localStorage; if (ls.getItem(MERKER) === STAND) return; } catch (e) { return; }
        var jahr = new Date().getFullYear(), weg = 0;
        try {
            TOT.forEach(function (k) { if (ls.getItem(k) !== null) { ls.removeItem(k); weg++; } });
            // Rueckwaerts, weil removeItem die Indizes verschiebt
            for (var i = ls.length - 1; i >= 0; i--) {
                var k = ls.key(i), m = k && SAISON.exec(k);
                if (m && +m[3] < jahr) { ls.removeItem(k); weg++; }
            }
            ls.setItem(MERKER, STAND);
        } catch (e) { /* voller oder gesperrter Speicher: naechster Start versucht es wieder */ }
        if (weg && typeof mwlEvent === 'function') mwlEvent('speicher_aufgeraeumt', { anzahl: weg });
    }

    window.mwlSpeicherAufraeumen = aufraeumen;   // fuer den Test und zum Nachholen von Hand
    if ('requestIdleCallback' in window) requestIdleCallback(aufraeumen, { timeout: 10000 });
    else setTimeout(aufraeumen, 4000);
})();
