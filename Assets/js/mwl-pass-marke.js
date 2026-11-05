// ═══ MWL-PASS-MARKE MODULE ═══
// „Du hast Pass“ app-weit sichtbar — so leise wie „Pro“ neben dem Namen bei Claude
// oder ChatGPT. 🔴 Bewusst NUR ein graues Text-Etikett: die erste Fassung (Gold,
// Siegel, Glanz, Goldring um Avatar und Menueknopf) war dem Nutzer „schrecklich,
// zu aufdringlich" (31.10.2026). Nicht wieder aufhuebschen.
//
// Steht neben dem Namen im Profil-Menue und in Einstellungen → Profil — nirgends sonst. Nicht unten im Sidebar-Fuss: dort
// lief die Versionszeile („v9.4.8 · SW v9.4.8“) in das Etikett, und der Fuss war dem
// Nutzer „viel zu voll“ (31.10.2026). Oben neben „MyWorkLog“ ist auch kein Platz
// (Kopfzeile 220 px).
// Klick fuehrt zur Pass-Karte im Berichtsheft (Pass-Paket liest ?pass=karte).
//
// Welche Stufe jemand hat, entscheidet NUR stufe(). Heute: Freischaltung vom Server (mwl-pass.js) → 'pass'.
// Spaeter liefert die Konto-Berechtigung 'pass' oder 'plus'; Aufrufer bleiben gleich.

window.MWLPassMarke = (function () {
    'use strict';

    const STUFEN = {
        pass: { de: 'Pass', en: 'Pass' },
        plus: { de: 'Plus', en: 'Plus' },
    };
    const en = () => document.documentElement.lang === 'en';

    function stufe() {
        return (window.MWLPass && MWLPass.frei()) ? 'pass' : null;
    }

    function marke(wo) {
        const s = STUFEN[stufe()];
        const a = document.createElement('a');
        a.className = 'mwl-pass-marke is-' + wo;
        a.href = (en() ? '/en' : '') + '/berichtsheft/?pass=karte';
        a.title = en() ? 'Your pass' : 'Dein Pass';
        a.textContent = en() ? s.en : s.de;
        // Menue und Einstellungen reagieren selbst auf Klicks — die Marke soll nur navigieren
        a.addEventListener('click', (e) => e.stopPropagation());
        return a;
    }

    // Werbeflächen der App für alle OHNE Pass, gegenläufig zur Marke. Bewusst hier: dieselben
    // Ereignisse schalten beide um. Ein neu gekaufter Pass nimmt die Werbung sofort weg.
    const HINWEIS_WEG = 'mwl_pass_hinweis_weg';
    function werbung() {
        const werben = typeof window.mwlPassWerben === 'function' && window.mwlPassWerben();
        const nav = document.getElementById('nav-pass');
        if (nav) nav.style.display = werben ? '' : 'none';
        const intro = document.getElementById('viPass');
        if (intro) intro.hidden = !werben;
        const banner = document.getElementById('passBanner');
        if (!banner) return;
        let weg = true;
        try { weg = !!localStorage.getItem(HINWEIS_WEG); } catch (e) {}
        const genug = typeof data !== 'undefined' && data && Array.isArray(data.entries) && data.entries.length >= 3;
        banner.style.display = werben && !weg && genug ? 'flex' : 'none';
    }
    function hinweisWeg() {
        try { localStorage.setItem(HINWEIS_WEG, new Date().toISOString().slice(0, 10)); } catch (e) {}
        werbung();
        if (typeof mwlEvent === 'function') mwlEvent('pass_werbung_weg', { ort: 'dashboard' });
    }

    // Idempotent: entfernt alte Marken und setzt sie neu (oder gar nicht, wenn gesperrt).
    function einsetzen() {
        werbung();
        document.querySelectorAll('.mwl-pass-marke').forEach(m => m.remove());
        if (!stufe()) return;
        const nutzer = document.querySelector('#profilePopover .profile-popover-user');
        if (nutzer) nutzer.after(marke('menue'));
        const zeile = document.querySelector('.profile-card .st-hero-zeile');
        if (zeile) zeile.append(marke('profil'));
    }

    document.addEventListener('DOMContentLoaded', einsetzen);
    window.addEventListener('mwl-pass-frei', einsetzen);
    window.addEventListener('mwl-pass-weg', einsetzen);
    // Freigeschaltet/entfernt in einem anderen Tab (z. B. im Berichtsheft)
    window.addEventListener('storage', (e) => { if (e.key === 'mwl_pass') einsetzen(); });

    return { stufe, einsetzen, hinweisWeg, STUFEN };
})();
