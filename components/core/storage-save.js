// ═══ CORE: STORAGE-SAVE ═══
    function cleanupLocalStorage() {
        // Einmalige Migration tt_ → mwl_ Keys
        if (!localStorage.getItem('mwl_last_export') && localStorage.getItem('tt_last_export')) {
            localStorage.setItem('mwl_last_export', localStorage.getItem('tt_last_export'));
            localStorage.removeItem('tt_last_export');
        }

        // Lösche alte mwl_export_reminder_shown_* Keys - behalte nur den heutigen
        const today = new Date().toISOString().split('T')[0];
        const currentKey = 'mwl_export_reminder_shown_' + today;

        let deletedCount = 0;
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('mwl_export_reminder_shown_') || key.startsWith('tt_export_reminder_shown_')) && key !== currentKey) {
                localStorage.removeItem(key);
                deletedCount++;
            }
        }
        
        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} alte Export-Reminder Keys`);
        }
    }

    // Bittet den Browser, den Speicher dieser Seite nicht selbst zu räumen.
    // Ohne das ist er „best effort": Chrome/Firefox löschen ihn unter
    // Speicherdruck, und zwar localStorage UND IndexedDB gemeinsam — ein Umzug
    // nach IndexedDB hätte davor NICHT geschützt (geprüft 2026-09-28). Chrome
    // entscheidet still nach Nutzung/Installation, Firefox fragt einmal nach.
    // Die 7-Tage-Frist von Safari hebt das nicht auf; dagegen hilft nur die
    // Installation auf dem Home-Bildschirm (steht im Datenhinweis).
    // Erst nach dem ersten Speichern: dann hat der Nutzer wirklich Daten hier.
    var persistRequested = false;
    function requestPersistentStorage() {
        if (persistRequested) return;
        persistRequested = true;
        try {
            if (!navigator.storage || !navigator.storage.persist) return;
            navigator.storage.persisted().then(function (already) {
                if (!already) return navigator.storage.persist();
            }).catch(function () { /* Browser ohne Unterstützung: nichts zu tun */ });
        } catch (e) { /* dito */ }
    }

    function save() {
        // Cleanup alte LocalStorage Keys
        try {
            cleanupLocalStorage();
        } catch (e) {
            console.warn('⚠️ LocalStorage Cleanup fehlgeschlagen:', e);
        }

        try {
            // Backup snapshot (keep last 10) - lightweight safety net for debugging
            const backupsStr = localStorage.getItem('tg_pro_data_backups');
            const backups = backupsStr ? JSON.parse(backupsStr) : [];
            const snapshot = { ts: Date.now(), data: JSON.parse(JSON.stringify(data)) };
            backups.push(snapshot);
            while (backups.length > 10) backups.shift();
            localStorage.setItem('tg_pro_data_backups', JSON.stringify(backups));
        } catch (e) {
            console.warn('⚠️ Backup snapshot failed:', e);
        }

        // Haupt-Write muss robust sein: ein uncaught Throw hier (z.B. QuotaExceededError)
        // ließe die neueste Änderung verloren gehen und riss früher den Aufrufer mit.
        try {
            localStorage.setItem('tg_pro_data', JSON.stringify(data));
            requestPersistentStorage();
        } catch (e) {
            console.error('❌ Speichern fehlgeschlagen (localStorage voll?):', e);
            // Platz schaffen: die 10 Voll-Backups sind der größte Speicherfresser → eindampfen
            try {
                const trimmed = JSON.parse(localStorage.getItem('tg_pro_data_backups') || '[]').slice(-3);
                localStorage.setItem('tg_pro_data_backups', JSON.stringify(trimmed));
            } catch (_) {
                try { localStorage.removeItem('tg_pro_data_backups'); } catch (__) {}
            }
            try {
                localStorage.setItem('tg_pro_data', JSON.stringify(data));
            } catch (e2) {
                console.error('❌ Speichern endgültig fehlgeschlagen:', e2);
                if (typeof mwlEvent === 'function') mwlEvent('problem_speicher_voll', {});
                if (typeof showCustomMessage === 'function') {
                    showCustomMessage('⚠️ Speicher voll', 'Deine Änderung konnte nicht gespeichert werden — der lokale Speicher ist voll. Bitte exportiere ein Backup und leere den Papierkorb.', 'error');
                }
            }
        }
        // Der Nachlauf darf den Aufrufer nicht mitreissen. Wer save() ruft,
        // hat danach noch zu tun (neu zeichnen, Reiter wechseln) — bis v7.0.3
        // lief hier ein eigener Ueberstunden-Check, der bei JEDEM Speichern
        // einen Toast warf und auf dem Handy mit `new Notification()` sogar
        // eine Ausnahme (Android: "Illegal constructor"); der Aufrufer sah dann
        // eine Aenderung, die gespeichert war, aber nicht gezeichnet wurde.
        // Die Wochenstunden-Warnung sitzt jetzt in checkAlertsThresholds()
        // (Schalter, einmal je Woche).
        try { checkAlertsThresholds(); } catch (e) { console.warn('Alerts-Pruefung nach save():', e); }
        try { updateUI(); } catch (e) { console.warn('updateUI nach save():', e); }
    }
