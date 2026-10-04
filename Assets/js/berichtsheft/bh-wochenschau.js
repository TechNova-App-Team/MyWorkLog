// ═══ BERICHTSHEFT: WOCHENSCHAU ═══
//
// Alle Wochen als Papierblaetter im Raum: das mittlere vorn, die Nachbarn
// kippen nach links und rechts weg. Wischen (Maus/Finger), Pfeiltasten,
// Klick auf das vordere Blatt oeffnet die Woche. Wunsch des Nutzers
// (Lokales/notes.txt, 04.10.2026).
//
// Bewusst CSS-3D statt Three.js: leicht, auf jedem Handy fluessig, keine
// Bibliothek. Die Blaetter kommen aus hfBlattInnen() (bh-uebersicht.js) —
// dasselbe Blatt wie im Stapel auf der Buehne.
// Gerendert wird nur ein Fenster um die aktuelle Woche (FENSTER), nicht alle
// 150 Wochen einer Ausbildung: jedes Blatt traegt ~40 Knoten.

window.BHWochenschau = (function () {
'use strict';

const FENSTER = 4;              // Blaetter links/rechts der Mitte im DOM
const SCHWELLE = 0.18;          // Anteil der Blattbreite, ab dem ein Wisch blaettert

let liste = [];                 // Berichte, aelteste zuerst
let idx = 0;                    // aktuelle Woche
let ziehen = null;              // { x0, dx, breite, id } waehrend eines Wischs
let zuletztFokus = null;

const $ = (id) => document.getElementById(id);
const bewegungAus = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function sortiert() {
    const alle = (typeof reports !== 'undefined' && Array.isArray(reports)) ? reports : [];
    return alle.filter(r => r && r.dateFrom)
        .slice()
        .sort((a, b) => String(a.dateFrom).localeCompare(String(b.dateFrom)));
}

function bauen() {
    let el = $('hfSchau');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'hfSchau';
    el.className = 'hf-schau';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'hfSchauTitel');
    el.innerHTML =
        '<div class="hf-schau-kopf">' +
        '<h2 class="hf-schau-titel" id="hfSchauTitel"></h2>' +
        '<button type="button" class="hf-schau-zu" id="hfSchauZu" aria-label="' + escapeHtml(L('Schließen', 'Close')) + '"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>' +
        '</div>' +
        '<div class="hf-schau-buehne" id="hfSchauBuehne"></div>' +
        '<div class="hf-schau-fuss">' +
        '<button type="button" class="hf-schau-pfeil" id="hfSchauZurueck" aria-label="' + escapeHtml(L('Vorherige Woche', 'Previous week')) + '"><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg></button>' +
        '<span class="hf-schau-hinweis" id="hfSchauHinweis"></span>' +
        '<button type="button" class="hf-schau-pfeil is-vor" id="hfSchauVor" aria-label="' + escapeHtml(L('Nächste Woche', 'Next week')) + '"><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg></button>' +
        '</div>';
    document.body.appendChild(el);

    $('hfSchauZu').onclick = schliessen;
    $('hfSchauZurueck').onclick = () => gehe(idx - 1);
    $('hfSchauVor').onclick = () => gehe(idx + 1);

    const buehne = $('hfSchauBuehne');
    buehne.addEventListener('pointerdown', start);
    buehne.addEventListener('pointermove', bewegen);
    buehne.addEventListener('pointerup', ende);
    buehne.addEventListener('pointercancel', ende);
    el.addEventListener('keydown', taste);
    return el;
}

// Lage eines Blatts relativ zur Mitte: d = 0 vorn, negativ links, positiv rechts.
// d darf gebrochen sein (waehrend des Ziehens).
function lage(d) {
    const a = Math.min(Math.abs(d), 3.2);
    const s = Math.sign(d);
    if (bewegungAus()) {
        return { t: `translateX(${d * 108}%)`, o: Math.abs(d) < 0.5 ? 1 : 0.35, z: 100 - Math.round(a * 10) };
    }
    const x = s * (a < 1 ? a * 62 : 62 + (a - 1) * 26);       // Prozent der Blattbreite
    const rot = -s * Math.min(a, 1) * 46;                      // Grad um die Hochachse
    const tiefe = -a * 170;                                    // px nach hinten
    // Papier ist undurchsichtig: nach hinten abdunkeln (f), ausgeblendet wird erst
    // ganz aussen (o) — halbdurchsichtige Blaetter liessen die Texte uebereinanderscheinen.
    return { t: `translateX(${x}%) translateZ(${tiefe}px) rotateY(${rot}deg)`, o: a > 2.6 ? Math.max(0, 1 - (a - 2.6) * 1.6) : 1, f: 1 - Math.min(a, 3) * 0.13, z: 100 - Math.round(a * 10) };
}

function zeichnen() {
    const buehne = $('hfSchauBuehne');
    if (!buehne) return;
    const von = Math.max(0, idx - FENSTER), bis = Math.min(liste.length - 1, idx + FENSTER);
    let html = '';
    for (let i = von; i <= bis; i++) {
        const r = liste[i];
        const mo = hfMontag(hfAusDatum(r.dateFrom));
        html += `<div class="hf-schau-blatt hf-blatt" data-i="${i}" aria-hidden="${i === idx ? 'false' : 'true'}">${hfBlattInnen(mo, r)}</div>`;
    }
    buehne.innerHTML = html;
    stellen(0);

    const r = liste[idx];
    const mo = hfMontag(hfAusDatum(r.dateFrom));
    $('hfSchauTitel').textContent = L(`KW ${r.week}`, `CW ${r.week}`) + ', ' + hfZeitraumText(mo);
    $('hfSchauHinweis').textContent = L(`${idx + 1} von ${liste.length}`, `${idx + 1} of ${liste.length}`);
    $('hfSchauZurueck').disabled = idx === 0;
    $('hfSchauVor').disabled = idx === liste.length - 1;
}

// versatz: gebrochener Zug in Blattbreiten (positiv = nach rechts gezogen)
function stellen(versatz, ohneUebergang) {
    const buehne = $('hfSchauBuehne');
    buehne.querySelectorAll('.hf-schau-blatt').forEach(b => {
        const d = Number(b.dataset.i) - idx + versatz;
        const l = lage(d);
        b.style.transition = ohneUebergang ? 'none' : '';
        b.style.transform = `translate(-50%, -50%) ${l.t}`;
        b.style.opacity = l.o;
        b.style.filter = l.f && l.f < 1 ? `brightness(${l.f})` : '';
        b.style.zIndex = l.z;
    });
}

function gehe(i) {
    const neu = Math.max(0, Math.min(liste.length - 1, i));
    if (neu === idx) { stellen(0); return; }
    idx = neu;
    zeichnen();
}

function start(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const blatt = $('hfSchauBuehne').querySelector('.hf-schau-blatt');
    ziehen = { x0: e.clientX, dx: 0, breite: (blatt && blatt.offsetWidth) || 420, id: e.pointerId };
    try { $('hfSchauBuehne').setPointerCapture(e.pointerId); } catch (er) { }
}
function bewegen(e) {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    ziehen.dx = e.clientX - ziehen.x0;
    // Rand: am Anfang/Ende nur ein Drittel des Zugs (Gummiband statt Leere)
    let v = ziehen.dx / ziehen.breite;
    if ((idx === 0 && v > 0) || (idx === liste.length - 1 && v < 0)) v /= 3;
    stellen(v, true);
}
function ende(e) {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    const v = ziehen.dx / ziehen.breite;
    const war = ziehen;
    ziehen = null;
    if (Math.abs(war.dx) < 6) {
        // Klick, kein Wisch: vorderes Blatt oeffnet die Woche, Nachbar holt sich nach vorn
        const ziel = document.elementFromPoint(e.clientX, e.clientY);
        const blatt = ziel && ziel.closest('.hf-schau-blatt');
        if (!blatt) { stellen(0); return; }
        const i = Number(blatt.dataset.i);
        if (i === idx) oeffneAktuelle(); else gehe(i);
        return;
    }
    if (Math.abs(v) < SCHWELLE) { stellen(0); return; }
    // Weiter Wisch = mehrere Wochen, wie man einen Stapel durchblaettert.
    const schritte = Math.max(1, Math.round(Math.abs(v)));
    gehe(idx + (v < 0 ? schritte : -schritte));
}

function taste(e) {
    if (e.key === 'Escape') { e.preventDefault(); schliessen(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); gehe(idx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); gehe(idx + 1); }
    else if (e.key === 'Home') { e.preventDefault(); gehe(0); }
    else if (e.key === 'End') { e.preventDefault(); gehe(liste.length - 1); }
    else if (e.key === 'Enter' && e.target.closest && !e.target.closest('button')) { e.preventDefault(); oeffneAktuelle(); }
}

function oeffneAktuelle() {
    const r = liste[idx];
    if (!r) return;
    schliessen();
    viewReport(r.id);
}

function oeffnen() {
    liste = sortiert();
    if (!liste.length) return;
    zuletztFokus = document.activeElement;
    const el = bauen();
    idx = liste.length - 1;          // juengste Woche vorn
    el.hidden = false;
    document.body.classList.add('hf-schau-offen');
    zeichnen();
    $('hfSchauHinweis').title = L('Wischen, ziehen oder Pfeiltasten', 'Swipe, drag or use the arrow keys');
    $('hfSchauZu').focus();
}

function schliessen() {
    const el = $('hfSchau');
    if (!el || el.hidden) return;
    el.hidden = true;
    document.body.classList.remove('hf-schau-offen');
    if (zuletztFokus && zuletztFokus.focus) zuletztFokus.focus();
}

return { oeffnen, schliessen, _intern: { lage, sortiert, gehe: (i) => gehe(i), idx: () => idx } };
})();
