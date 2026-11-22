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
    rahmenplan: {
        titel: ['Rahmenplan', 'Training framework'],
        satz: ['Was laut Verordnung dran war und noch fehlt.', 'What the regulation says was due, and what is missing.'],
        punkte: [['Der Ausbildungsrahmenplan deines Berufs, für jeden dualen Beruf', 'The training framework of your occupation, for every dual apprenticeship'],
                 ['Abgleich mit deinem Heft, Woche für Woche', 'Compared with your record book, week by week'],
                 ['Was bis jetzt fehlt, als Liste fürs Gespräch mit dem Ausbilder', 'What is missing so far, as a list for your trainer']],
    },
    thinking: {
        titel: ['Kestrel 3.1 Thinking', 'Kestrel 3.1 Thinking'],
        satz: ['Denkt erst nach, dann schreibt es.', 'Thinks first, then writes.'],
        punkte: [['Stärkere Modelle für ganze Wochen und wirre Notizen', 'Stronger models for whole weeks and messy notes'],
                 ['Bleibt näher an dem, was du erzählt hast', 'Stays closer to what you actually said'],
                 ['Ohne Pass: eine Antwort pro Monat zum Ausprobieren', 'Without a pass: one answer a month to try it']],
    },
    fachgespraech: {
        plus: true,
        titel: ['Fachgespräch üben', 'Practise the expert interview'],
        // Seit Fassung 2 (01.11.2026) fragt es nach Prüfungsaufgabe und Beruf, nicht nach dem Heft
        satz: ['Der Prüfer fragt nach deiner Prüfungsaufgabe und deinem Beruf.', 'The examiner asks about your exam task and your occupation.'],
        punkte: [['Fragen wie im echten Fachgespräch, zu deinem Projekt oder Report und zu den Aufgaben deines Berufs', 'Questions like in the real interview, about your project or report and the tasks of your occupation'],
                 ['Rückmeldung zu jeder Antwort: was überzeugt, was fehlt', 'Feedback on every answer: what convinces, what is missing'],
                 ['Die Nachfrage, die ein Prüfer jetzt stellen würde', 'The follow-up an examiner would ask next']],
    },
    projektdoku: {
        plus: true,
        titel: ['Projektdoku', 'Project documentation'],
        satz: ['Du schreibst, der Ausschuss liest vorher mit.', 'You write, the board reads along first.'],
        punkte: [['Gliederung mit den Fragen, die jedes Kapitel beantworten muss', 'An outline with the questions each chapter has to answer'],
                 ['Prüfung deines Entwurfs: was fehlt, was unbegründet bleibt, ob der Zeitplan aufgeht', 'A review of your draft: what is missing, what lacks reasons, whether the time plan adds up'],
                 ['Schreibt keinen Text für dich, denn die Doku musst du selbst verfassen', 'Writes no text for you, because you must write the documentation yourself']],
    },
    wochenvorschlag: {
        titel: ['Woche vorschlagen', 'Suggest the week'],
        satz: ['Dein Kalender weiß, was diese Woche war.', 'Your calendar knows what happened this week.'],
        punkte: [['Termine aus Outlook oder Google, als Datei eingelesen', 'Events from Outlook or Google, imported as a file'],
                 ['Zusammen mit Zeiterfassung und Stundenplan, Tag für Tag', 'Together with time tracking and timetable, day by day'],
                 ['Du hakst ab, der Assistent schreibt daraus die Woche', 'You tick, the assistant writes the week from it']],
    },
};
const FEHLER = {
    falsch: ['Der Code stimmt nicht. Groß- und Kleinschreibung zählt.', 'That code is not right. Upper and lower case matter.'],
    netz: ['Keine Verbindung zum Server. Bist du online?', 'No connection to the server. Are you online?'],
    paket: ['Freigeschaltet, aber die Funktionen kamen nicht an. Lade die Seite neu.', 'Unlocked, but the features did not arrive. Reload the page.'],
    server: ['Der Server konnte gerade nicht freischalten. Versuch es gleich noch einmal.', 'The server could not unlock right now. Try again in a moment.'],
};
// Probedurchgang „Mehrere Wochen" (MWLPass.probeStarten). 'netz' = Grenze je Netz erreicht.
const PROBE_FEHLER = {
    anmelden: ['Melde dich zuerst mit deinem Konto an.', 'Sign in with your account first.'],
    genutzt: ['Deinen kostenlosen Durchgang hast du schon genutzt.', 'You have already used your free run.'],
    netz: ['Hier wurde der Probedurchgang diesen Monat schon genutzt. Versuch es später noch einmal.', 'The free run has already been used here this month. Try again later.'],
    pass: ['Du hast den Pass schon. Lade die Seite neu.', 'You already have the pass. Reload the page.'],
    offline: FEHLER.netz,
};
// Seit 19.11.2026 (Entscheidung des Nutzers): „Mehrere Wochen" einmal je Konto kostenlos,
// bis 3 Wochen. 48 Leute sahen dieses Blatt in 30 Tagen, 5 klickten weiter — wer es einmal
// selbst gesehen hat, kauft eher. Den Pruefungs-Check gibt es bewusst NICHT zur Probe.
function probeMoeglich(name) {
    return name === 'mehrwochen' && !!(window.MWLPass && MWLPass.probeGenutzt) && !MWLPass.frei() && !MWLPass.probeGenutzt();
}

// Fehlende Wochen zaehlt schon der kostenlose Teil (bh-uebersicht.js). Keine geschaetzten Stunden:
// der kostenlose Assistent schreibt eine Woche auch in Sekunden, die Arbeit ist das Erzaehlen.
function luecken() {
    try { return typeof hfLuecken === 'function' ? hfLuecken().length : 0; } catch (e) { return 0; }
}
function lage(name) {
    const n = luecken();
    if (n < 2) return null;
    if (name === 'mehrwochen') return {
        satz: L('Dir fehlen ' + n + ' Wochen. Ein Durchgang, und sie stehen.', 'You are missing ' + n + ' weeks. One pass and they are done.'),
        zusatz: L('Einzeln heißt: ' + n + '-mal erzählen und prüfen. So erzählst du einmal und liest danach alle.', 'One by one means telling and checking ' + n + ' times. This way you tell once, then read them all.'),
    };
    if (name === 'pruefcheck') return {
        zusatz: L('Dir fehlen gerade ' + n + ' Wochen. Der Check zeigt dir, was sonst noch auffällt.', 'You are missing ' + n + ' weeks right now. The check shows what else stands out.'),
    };
    return null;
}
let offen = null, vorFokus = null;
function zeigen(name, opt) {
    const t = TEXTE[name];
    if (!t) return;
    schliessen();
    vorFokus = document.activeElement;
    const ist = lage(name);
    const en = document.documentElement.lang === 'en';
    const probe = probeMoeglich(name);
    const kaufHref = (en ? '/en/kaufen/' : '/kaufen/') + '?zurueck=' + encodeURIComponent(location.pathname);
    const el = document.createElement('div');
    el.className = 'bs-ebene';
    el.innerHTML =
        '<div class="bs-blatt" role="dialog" aria-modal="true" aria-labelledby="bsTitel">' +
            '<button type="button" class="bs-zu" data-bs-zu aria-label="' + esc(L('Schließen', 'Close')) + '">×</button>' +
            '<p class="bs-marke">' + SCHLOSS + '<span>' + esc(L(t.titel[0], t.titel[1])) + '</span></p>' +
            '<h2 class="bs-satz" id="bsTitel">' + esc(ist && ist.satz ? ist.satz : L(t.satz[0], t.satz[1])) + '</h2>' +
            (ist && ist.zusatz ? '<p class="bs-lage">' + esc(ist.zusatz) + '</p>' : '') +
            '<ul class="bs-punkte">' + t.punkte.map(p => '<li>' + esc(L(p[0], p[1])) + '</li>').join('') + '</ul>' +
            '<p class="bs-hinweis">' + esc(t.plus ? L('Gehört zu Plus. Das ist noch nicht erhältlich.', 'Part of Plus, which is not available yet.') : L('Gehört zum Ausbildungs-Pass: einmal zahlen ab 9,99 € für zwei Jahre, rechnerisch 42 Cent im Monat, kein Abo. Er finanziert die KI und die Weiterentwicklung, ohne Werbung und ohne Datenverkauf.', 'Part of the training pass: pay once from €9.99 for two years, about 42 cents a month, no subscription. It funds the AI and further development, with no ads and no selling of data.')) + '</p>' +
            '<div class="bs-aktion">' +
                // Plus ist nicht kaeuflich, der Kauf-Knopf wuerde dort den falschen Tarif verkaufen
                (t.plus
                    ? '<a class="bs-knopf" href="' + (document.documentElement.lang === 'en' ? '/en/preise/' : '/preise/') + '#hefte">' + esc(L('Plus vormerken', 'Count me in for Plus')) + '</a>'
                    : (probe
                        ? (MWLPass.angemeldet()
                            ? '<button type="button" class="bs-knopf" data-bs-probe>' + esc(L('Kostenlos ausprobieren', 'Try it for free')) + '</button>'
                            : '<a class="bs-knopf" data-bs-probe-anmelden href="/?cloud=login&amp;back=berichtsheft">' + esc(L('Anmelden und kostenlos ausprobieren', 'Sign in and try it for free')) + '</a>') +
                          '<a class="bs-knopf is-leise bs-zweit" data-bs-kauf href="' + kaufHref + '">' + esc(L('Pass holen, ab 9,99 €', 'Get the pass, from €9.99')) + '</a>' +
                          '<p class="bs-probe-satz">' + esc(L('Einmal pro Konto: bis zu drei Wochen in einem Durchgang. Danach gehört „Mehrere Wochen“ zum Pass.', 'Once per account: up to three weeks in one run. After that, “Several weeks” is part of the pass.')) + '</p>' +
                          '<p class="bs-meldung" id="bsProbeMeldung" role="status"></p>'
                        : '<a class="bs-knopf" data-bs-kauf href="' + kaufHref + '">' + esc(L('Pass holen, ab 9,99 €', 'Get the pass, from €9.99')) + '</a>') +
                      // Beim Probedurchgang stehen schon zwei Knoepfe; der dritte Weg wuerde nur verwirren
                      (probe ? '' : '<a class="bs-mehr" data-bs-kauf href="' + (en ? '/en/preise/' : '/preise/') + '#pass">' + esc(L('Alles im Pass ansehen', 'See everything in the pass')) + '</a>') +
                      // Der Pass hängt am Konto: wer gekauft hat und hier abgemeldet ist, muss nur sich anmelden
                      ((window.MWLPass && MWLPass.angemeldet()) ? '' : '<p class="bs-hinweis">' + esc(L('Schon gekauft? ', 'Already bought? ')) + '<a href="/?cloud=login&amp;back=berichtsheft">' + esc(L('Mit deinem Konto anmelden', 'Sign in with your account')) + '</a></p>')) +
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
        if (e.target.closest && e.target.closest('[data-bs-kauf]') && typeof window.bhMess === 'function') { try { window.bhMess('pass_siegel_weiter', { wo: name }); } catch (x) {} }
        if (e.target === el || e.target.closest('[data-bs-zu]')) schliessen();
        if (e.target.closest && e.target.closest('[data-bs-probe-anmelden]') && typeof window.bhMess === 'function') { try { window.bhMess('pass_probe', { schritt: 'anmelden' }); } catch (x) {} }
        const pk = e.target.closest && e.target.closest('[data-bs-probe]');
        if (pk) probeStarten(pk, name, opt);
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
    if (typeof window.bhMess === 'function') { try { window.bhMess('pass_siegel', { wo: name, luecken: luecken() >= 2 }); } catch (x) {} }
    setTimeout(() => { const zu = el.querySelector('.bs-knopf'); if (zu) zu.focus({ preventScroll: true }); }, 30);
}
async function probeStarten(knopf, name, opt) {
    const meld = offen && offen.querySelector('#bsProbeMeldung');
    knopf.disabled = true;
    if (meld) meld.textContent = L('Wird vorbereitet …', 'Getting it ready …');
    const r = await MWLPass.probeStarten();
    if (typeof window.bhMess === 'function') { try { window.bhMess('pass_probe', { schritt: r.ok ? 'ok' : r.fehler }); } catch (x) {} }
    if (r.ok) { schliessen(); MWLPass.oeffnen(name, opt); return; }
    const f = PROBE_FEHLER[r.fehler] || FEHLER.server;
    if (meld) meld.textContent = L(f[0], f[1]);
    // Endgueltig: Knopf weg, der Kauf bleibt
    if (r.fehler === 'genutzt' || r.fehler === 'netz' || r.fehler === 'pass') knopf.remove();
    else knopf.disabled = false;
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
