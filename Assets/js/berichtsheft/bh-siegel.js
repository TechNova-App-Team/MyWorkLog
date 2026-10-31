// ═══ BH-SIEGEL MODULE ═══
// Was man ohne Pass sieht, wenn man „Pruefungs-Check" oder „Mehrere Wochen" anklickt:
// ein Blatt mit einem Satz, was die Funktion tut, und dem Feld fuer den Pass-Code.
// Oeffentlich — die Funktionen selbst kommen erst nach der Freischaltung vom Server
// (mwl-pass.js). Hier steht deshalb nur Beschreibung, keine Logik der Funktionen.

window.BHSiegel = (function () {
'use strict';

const L = (de, en) => document.documentElement.lang === 'en' ? en : de;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SCHLOSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

const TEXTE = {
    pruefcheck: {
        titel: ['Prüfungs-Check', 'Exam check'],
        satz: ['Liest dein Heft, bevor es die Kammer tut.', 'Reads your record book before the chamber does.'],
        punkte: [['Fehlende Wochen seit Ausbildungsbeginn', 'Missing weeks since the start of training'],
                 ['Offene Unterschriften und Freigaben', 'Missing signatures and approvals'],
                 ['Leere, knappe und kopierte Tage', 'Empty, brief and copied days'],
                 ['Abgleich mit deiner Zeiterfassung', 'Comparison with your time tracking']],
    },
    mehrwochen: {
        titel: ['Mehrere Wochen auf einmal', 'Several weeks at once'],
        satz: ['Ein Monat Rückstand, ein Durchgang.', 'A month behind, one pass.'],
        punkte: [['Fehlende Wochen in einem Durchgang schreiben', 'Write missing weeks in one go'],
                 ['Aus Zeiterfassung, Stichworten und deinem Stil', 'From time tracking, keywords and your style'],
                 ['Du liest jede Woche, bevor sie ins Heft kommt', 'You read every week before it goes into the book']],
    },
};
const FEHLER = {
    falsch: ['Der Code stimmt nicht. Groß- und Kleinschreibung zählt.', 'That code is not right. Upper and lower case matter.'],
    netz: ['Keine Verbindung zum Server. Bist du online?', 'No connection to the server. Are you online?'],
    paket: ['Freigeschaltet, aber die Funktionen kamen nicht an. Lade die Seite neu.', 'Unlocked, but the features did not arrive. Reload the page.'],
    server: ['Der Server konnte gerade nicht freischalten. Versuch es gleich noch einmal.', 'The server could not unlock right now. Try again in a moment.'],
};

let offen = null, vorFokus = null;
function zeigen(name, opt) {
    const t = TEXTE[name];
    if (!t) return;
    schliessen();
    vorFokus = document.activeElement;
    const lokal = window.MWLPass && MWLPass.lokal();
    const el = document.createElement('div');
    el.className = 'bs-ebene';
    el.innerHTML =
        '<div class="bs-blatt" role="dialog" aria-modal="true" aria-labelledby="bsTitel">' +
            '<button type="button" class="bs-zu" data-bs-zu aria-label="' + esc(L('Schließen', 'Close')) + '">×</button>' +
            '<p class="bs-marke">' + SCHLOSS + '<span>' + esc(L(t.titel[0], t.titel[1])) + '</span></p>' +
            '<h2 class="bs-satz" id="bsTitel">' + esc(L(t.satz[0], t.satz[1])) + '</h2>' +
            '<ul class="bs-punkte">' + t.punkte.map(p => '<li>' + esc(L(p[0], p[1])) + '</li>').join('') + '</ul>' +
            '<p class="bs-hinweis">' + esc(L('Gehört zum Ausbildungs-Pass. Der ist noch nicht erhältlich.', 'Part of the training pass, which is not available yet.')) + '</p>' +
            '<div class="bs-aktion">' +
                (lokal
                    ? '<a class="bs-knopf" href="/kaufen/?zurueck=' + encodeURIComponent(location.pathname) + '">' + esc(L('Pass holen (Demo-Kasse)', 'Get the pass (demo checkout)')) + '</a>'
                    : '<a class="bs-knopf" href="' + (document.documentElement.lang === 'en' ? '/en/preise/' : '/preise/') + '">' + esc(L('Pass vormerken', 'Register interest')) + '</a>') +
            '</div>' +
            '<details class="bs-code">' +
                '<summary>' + esc(L('Ich habe einen Pass-Code', 'I have a pass code')) + '</summary>' +
                '<form class="bs-code-form" novalidate>' +
                    '<label class="bs-vh" for="bsCode">' + esc(L('Pass-Code', 'Pass code')) + '</label>' +
                    '<input type="text" id="bsCode" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="MWL-XXXX-XXXX-XXXX" aria-describedby="bsMeldung">' +
                    '<button type="submit" class="bs-knopf is-leise">' + esc(L('Freischalten', 'Unlock')) + '</button>' +
                '</form>' +
                '<p class="bs-meldung" id="bsMeldung" role="status"></p>' +
            '</details>' +
        '</div>';
    el.addEventListener('click', (e) => {
        if (e.target === el || e.target.closest('[data-bs-zu]')) schliessen();
    });
    el.querySelector('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const inp = el.querySelector('#bsCode'), knopf = el.querySelector('form button'), meld = el.querySelector('#bsMeldung');
        knopf.disabled = true;
        meld.textContent = L('Wird geprüft …', 'Checking …');
        const r = await MWLPass.einloesen(inp.value);
        knopf.disabled = false;
        if (typeof window.bhMess === 'function') { try { window.bhMess('pass_code', { gut: r.ok, wo: name }); } catch (x) {} }
        if (!r.ok) { const f = FEHLER[r.fehler] || FEHLER.server; meld.textContent = L(f[0], f[1]); inp.select(); return; }
        schliessen();
        MWLPass.oeffnen(name, opt);
    });
    document.body.appendChild(el);
    offen = el;
    if (typeof window.bhMess === 'function') { try { window.bhMess('pass_siegel', { wo: name }); } catch (x) {} }
    setTimeout(() => { const zu = el.querySelector('.bs-knopf'); if (zu) zu.focus({ preventScroll: true }); }, 30);
}
function schliessen() {
    if (!offen) return;
    offen.remove();
    offen = null;
    if (vorFokus && vorFokus.focus) vorFokus.focus({ preventScroll: true });
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && offen) { e.stopPropagation(); schliessen(); } }, true);

return { zeigen, schliessen };
})();
