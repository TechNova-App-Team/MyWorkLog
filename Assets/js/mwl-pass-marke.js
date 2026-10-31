// ═══ MWL-PASS-MARKE MODULE ═══
// „Du hast Pass“ app-weit sichtbar — so leise wie „Pro“ neben dem Namen bei Claude
// oder ChatGPT. 🔴 Bewusst NUR ein graues Text-Etikett: die erste Fassung (Gold,
// Siegel, Glanz, Goldring um Avatar und Menueknopf) war dem Nutzer „schrecklich,
// zu aufdringlich" (31.10.2026). Nicht wieder aufhuebschen.
//
// Steht unten in der Sidebar neben der Version und im Profil-Menue neben dem Namen.
// Oben neben „MyWorkLog“ ist kein Platz (Kopfzeile 220 px, gemessen 31.10.2026).
// Am Handy ist die Sidebar eine Schublade — die Marke steht dann eben dort.
// Klick fuehrt zur Pass-Karte im Berichtsheft (bh-pass.js liest ?pass=karte).
//
// Welche Stufe jemand hat, entscheidet NUR stufe(). Heute: Vorschau-Code → 'pass'.
// Spaeter liefert die Konto-Berechtigung 'pass' oder 'plus'; Aufrufer bleiben gleich.

window.MWLPassMarke = (function () {
    'use strict';

    const STUFEN = {
        pass: { de: 'Pass', en: 'Pass' },
        plus: { de: 'Plus', en: 'Plus' },
    };
    const en = () => document.documentElement.lang === 'en';

    function stufe() {
        return (window.MWLVorschau && MWLVorschau.frei()) ? 'pass' : null;
    }

    function marke(wo) {
        const s = STUFEN[stufe()];
        const a = document.createElement('a');
        a.className = 'mwl-pass-marke is-' + wo;
        a.href = (en() ? '/en' : '') + '/berichtsheft/?pass=karte';
        a.title = en() ? 'Your pass' : 'Dein Pass';
        a.textContent = en() ? s.en : s.de;
        // Fuss und Menue reagieren selbst auf Klicks — die Marke soll nur navigieren
        a.addEventListener('click', (e) => e.stopPropagation());
        return a;
    }

    // Idempotent: entfernt alte Marken und setzt sie neu (oder gar nicht, wenn gesperrt).
    function einsetzen() {
        document.querySelectorAll('.mwl-pass-marke').forEach(m => m.remove());
        if (!stufe()) return;
        const info = document.querySelector('#sidebarFooter .sidebar-footer-info');
        if (info) info.after(marke('fuss'));
        const nutzer = document.querySelector('#profilePopover .profile-popover-user');
        if (nutzer) nutzer.after(marke('menue'));
    }

    document.addEventListener('DOMContentLoaded', einsetzen);
    window.addEventListener('mwl-pass-frei', einsetzen);
    // Freigeschaltet/entfernt in einem anderen Tab (z. B. im Berichtsheft)
    window.addEventListener('storage', (e) => { if (e.key === 'mwl_vorschau') einsetzen(); });

    return { stufe, einsetzen, STUFEN };
})();
