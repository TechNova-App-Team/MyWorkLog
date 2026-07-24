// ═══ DATA-NOTICE MODULE ═══
// Der Hinweis "Deine Daten liegen nur auf diesem Gerät" steht an vier Stellen
// im DOM: Dashboard-Fuss, Settings/Profil, Settings/Cloud und Recovery Center.
// "Nicht mehr anzeigen" blendet ALLE gleichzeitig aus — egal, an welcher Stelle
// geklickt wurde. Zustand haengt an data.settings.hideDataNotice und ist ueber
// den Schalter in Settings/Profil jederzeit zurueckholbar.
    window._clsBC = 'data-notice.js-start';

    function isDataNoticeHidden() {
        try { return !!(data && data.settings && data.settings.hideDataNotice); }
        catch(e) { return false; }
    }

    // Muss nach JEDER Zustandsaenderung laufen — display wird inline gesetzt,
    // eine CSS-Klasse allein wuerde ein bestehendes Inline-Attribut nicht schlagen.
    function applyDataNoticeVisibility() {
        const hidden = isDataNoticeHidden();
        const notes = document.querySelectorAll('.data-note');
        for (let i = 0; i < notes.length; i++) {
            notes[i].style.display = hidden ? 'none' : 'grid';
        }
        const toggle = document.getElementById('confDataNotice');
        if (toggle) toggle.checked = !hidden;
    }

    function setDataNoticeVisible(visible) {
        if (!data.settings) data.settings = {};
        data.settings.hideDataNotice = !visible;
        save();
        applyDataNoticeVisibility();
    }

    // Handler der "Nicht mehr anzeigen"-Buttons in allen vier Hinweisen
    function dismissDataNotice() {
        setDataNoticeVisible(false);
        if (typeof showToast === 'function') {
            showToast(
                'Hinweis ausgeblendet',
                'Du findest ihn in den Einstellungen unter Profil wieder — deine Daten liegen weiterhin nur auf diesem Gerät.',
                'info'
            );
        }
    }

    window.isDataNoticeHidden = isDataNoticeHidden;
    window.applyDataNoticeVisibility = applyDataNoticeVisibility;
    window.setDataNoticeVisible = setDataNoticeVisible;
    window.dismissDataNotice = dismissDataNotice;
