// ═══ MWL-PASS-MARKE MODULE ═══
// „Du hast Pass“ app-weit sichtbar, wie „Plus“ neben dem Namen bei ChatGPT/Gemini
// (Wunsch des Nutzers 31.10.2026). Steht in der App unten in der Sidebar am Avatar
// (goldener Ring). Am Handy ist die Sidebar eine Schublade — dort traegt der Menue-
// knopf denselben Ring, die Marke selbst steht in der Schublade. Neben dem Knopf ist
// kein Platz (Dashboard-Werkzeugleiste, dashboard-neu.css), und .header ist dort aus.
// Klick fuehrt zur Pass-Karte im Berichtsheft (bh-pass.js liest ?pass=karte).
//
// Welche Stufe jemand hat, entscheidet NUR stufe(). Heute: Vorschau-Code → 'pass'.
// Spaeter liefert die Konto-Berechtigung 'pass' oder 'plus'; Aufrufer bleiben gleich.
// Oben neben „MyWorkLog“ war kein Platz (Kopfzeile 220 px, Suche + Einklappen
// liefen schon ueber, gemessen 31.10.2026) — deshalb am Avatar unten, wo ChatGPT
// und Gemini den Plan auch zeigen.
// Das Berichtsheft hat sein eigenes, groesseres Abzeichen (bh-pass.js) — diese Marke
// ist die kleine Schwester fuer alle anderen Seiten.

window.MWLPassMarke = (function () {
    'use strict';

    const STUFEN = {
        pass: { de: 'Pass', en: 'Pass' },
        plus: { de: 'Plus', en: 'Plus' },
    };
    const en = () => document.documentElement.lang === 'en';
    const SIEGEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 12 2 2 4-4"/><path d="M12 2.5l2.4 1.7 2.9-.1.9 2.8 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-.9 2.8-2.9-.1L12 21.5l-2.4-1.7-2.9.1-.9-2.8-2.3-1.8.9-2.8-.9-2.8 2.3-1.8.9-2.8 2.9.1z"/></svg>';

    function stufe() {
        return (window.MWLVorschau && MWLVorschau.frei()) ? 'pass' : null;
    }

    function marke(wo) {
        const s = STUFEN[stufe()];
        const a = document.createElement('a');
        a.className = 'mwl-pass-marke is-' + wo;
        a.href = (en() ? '/en' : '') + '/berichtsheft/?pass=karte';
        a.setAttribute('aria-label', en() ? 'You have ' + s.en + ': open your pass card' : 'Du hast ' + s.de + ': Pass-Karte öffnen');
        a.innerHTML = SIEGEL + '<span>' + (en() ? s.en : s.de) + '</span>';
        return a;
    }

    // Idempotent: entfernt alte Marken und setzt sie neu (oder gar nicht, wenn gesperrt).
    function einsetzen() {
        document.querySelectorAll('.mwl-pass-marke').forEach(m => m.remove());
        const avatar = document.getElementById('sidebarAvatar');
        if (avatar) avatar.classList.toggle('is-pass', !!stufe());
        const knopf = document.getElementById('mobileMenuToggle');
        if (knopf) knopf.classList.toggle('is-pass', !!stufe());
        if (!stufe()) return;
        const info = document.querySelector('#sidebarFooter .sidebar-footer-info');
        if (info) {
            const m = marke('sidebar');
            // Der Fuss oeffnet per Klick das Profil-Menue — die Marke soll nur navigieren
            m.addEventListener('click', (e) => e.stopPropagation());
            info.after(m);
        }
    }

    document.addEventListener('DOMContentLoaded', einsetzen);
    window.addEventListener('mwl-pass-frei', einsetzen);
    // Freigeschaltet/entfernt in einem anderen Tab (z. B. im Berichtsheft)
    window.addEventListener('storage', (e) => { if (e.key === 'mwl_vorschau') einsetzen(); });

    return { stufe, einsetzen, STUFEN };
})();
