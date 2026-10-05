// ═══ BERICHTSHEFT: WOCHENSCHAU ═══
//
// Alle Wochen als Papierblaetter auf einer Trommel im Raum: die aktuelle vorn,
// die Nachbarn drehen sich auf dem Zylinder weg. Wunsch des Nutzers: erst
// "Wochen durchwischen" (04.10.2026), dann "Animationen und Darstellung wie im
// Intro oder auf /traum/, richtig krass" (05.10.2026).
//
// Bewegung als PHYSIK statt CSS-Uebergang: eine gebrochene Position `pos`
// (in Wochen) folgt dem Finger 1:1, beim Loslassen wird der Schwung nach
// Apples Projektion (decel 0.998) auf eine Woche hochgerechnet und eine Feder
// zieht dorthin. Unterbrechbar zu jedem Zeitpunkt — die Feder startet immer am
// aktuellen Wert. Mausrad/Trackpad drehen schrittweise. Schnelles Drehen neigt
// die Blaetter mit (wie die Fotos auf /traum/).
//
// Bewusst CSS-3D statt Three.js: das Blatt ist echter Text (scharf, waehlbar,
// uebersetzbar), Blattinhalt aus hfBlattInnen() wie im Stapel auf der Buehne.
// Im DOM liegt nur ein Fenster um die Mitte (FENSTER), nicht alle ~150 Wochen
// einer Ausbildung: jedes Blatt traegt ~40 Knoten.
// Ohne Bewegung ("Bewegung reduzieren"): flache Reihe, harte Wechsel.

window.BHWochenschau = (function () {
'use strict';

const FENSTER = 6;              // Blaetter links/rechts der Mitte im DOM
const WINKEL = 30;              // Grad zwischen zwei Blaettern auf der Trommel
const FEDER = 140, DAEMPF = 2 * Math.sqrt(140) * 0.86;   // leicht unterdaempft: ein Hauch Nachschwingen
const SCHRITT = 1 / 60;         // feste Schritte (dt als Faktor schaukelt sich auf, Lehre aus dem Intro)
const RAD_SCHWELLE = 70;        // px Mausrad/Trackpad je Woche

let liste = [];                 // Berichte, aelteste zuerst
let pos = 0, ziel = 0, tempo = 0;   // in Wochen bzw. Wochen/s
let ziehen = null;              // laufender Zug
let laeuft = false, rafId = 0, zuletzt = 0, rest = 0;
let mitte = -1;                 // gerundete Mitte des gerenderten Fensters
let blaetter = new Map();       // Index → Element
let radSumme = 0, radUhr = 0;
let auftakt = 0;                // Zeitpunkt des Oeffnens (Einflug)
let breite = 460, radius = 900;
let zuletztFokus = null;

const $ = (id) => document.getElementById(id);
const bewegungAus = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const klemm = (v, a, b) => v < a ? a : v > b ? b : v;

function sortiert() {
    const alle = (typeof reports !== 'undefined' && Array.isArray(reports)) ? reports : [];
    return alle.filter(r => r && r.dateFrom)
        .slice()
        .sort((a, b) => String(a.dateFrom).localeCompare(String(b.dateFrom)));
}

// Zustand in derselben Formsprache wie die Stempelkarte (Form statt Theme-Farbe)
function zustand(r) {
    const a = r && r.approval;
    if (a && a.state === 'rejected') return 'rueck';
    if ((a && a.state === 'approved' && !a.stale) || r.status === 'signed') return 'stempel';
    if (r.status === 'complete') return 'haken';
    return 'entwurf';
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
        '<div class="hf-schau-riesen" id="hfSchauRiesen" aria-hidden="true"></div>' +
        '<div class="hf-schau-kopf">' +
        '<h2 class="hf-schau-titel" id="hfSchauTitel"></h2>' +
        '<button type="button" class="hf-schau-zu" id="hfSchauZu" aria-label="' + escapeHtml(L('Schließen', 'Close')) + '"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>' +
        '</div>' +
        '<div class="hf-schau-buehne" id="hfSchauBuehne"><div class="hf-schau-boden" aria-hidden="true"></div></div>' +
        '<div class="hf-schau-fuss">' +
        '<button type="button" class="hf-schau-pfeil" id="hfSchauZurueck" aria-label="' + escapeHtml(L('Vorherige Woche', 'Previous week')) + '"><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg></button>' +
        '<div class="hf-schau-strahl" id="hfSchauStrahl" aria-hidden="true"><div class="hf-schau-striche" id="hfSchauStriche"></div><span class="hf-schau-marke" id="hfSchauMarke"></span></div>' +
        '<button type="button" class="hf-schau-pfeil is-vor" id="hfSchauVor" aria-label="' + escapeHtml(L('Nächste Woche', 'Next week')) + '"><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg></button>' +
        '<span class="hf-schau-hinweis" id="hfSchauHinweis"></span>' +
        '</div>';
    document.body.appendChild(el);

    $('hfSchauZu').onclick = schliessen;
    $('hfSchauZurueck').onclick = () => gehe(Math.round(ziel) - 1);
    $('hfSchauVor').onclick = () => gehe(Math.round(ziel) + 1);

    const buehne = $('hfSchauBuehne');
    buehne.addEventListener('pointerdown', start);
    buehne.addEventListener('pointermove', bewegen);
    buehne.addEventListener('pointerup', ende);
    buehne.addEventListener('pointercancel', ende);
    buehne.addEventListener('wheel', rad, { passive: false });
    const strahl = $('hfSchauStrahl');
    strahl.addEventListener('pointerdown', strahlStart);
    strahl.addEventListener('pointermove', strahlZiehen);
    strahl.addEventListener('pointerup', strahlEnde);
    strahl.addEventListener('pointercancel', strahlEnde);
    el.addEventListener('keydown', taste);
    window.addEventListener('resize', () => { if (!el.hidden) { messen(); stellen(); } });
    return el;
}

function messen() {
    const b = $('hfSchauBuehne').querySelector('.hf-schau-blatt');
    breite = (b && b.offsetWidth) || Math.min(460, window.innerWidth * 0.78);
    // Radius so, dass zwei Nachbarn bei WINKEL Grad gerade nicht ineinanderlaufen
    radius = (breite / 2) / Math.tan((WINKEL / 2) * Math.PI / 180) * 1.06;
}

// ── Fenster: Blaetter um die Mitte anlegen/entfernen (nur bei Wechsel der Mitte)
function fenster() {
    const c = klemm(Math.round(pos), 0, liste.length - 1);
    if (c === mitte) return;
    mitte = c;
    const buehne = $('hfSchauBuehne');
    const von = Math.max(0, c - FENSTER), bis = Math.min(liste.length - 1, c + FENSTER);
    blaetter.forEach((el, i) => { if (i < von || i > bis) { el.remove(); blaetter.delete(i); } });
    for (let i = von; i <= bis; i++) {
        if (blaetter.has(i)) continue;
        const r = liste[i];
        const mo = hfMontag(hfAusDatum(r.dateFrom));
        const el = document.createElement('div');
        el.className = 'hf-schau-blatt hf-blatt';
        el.dataset.i = i;
        el.innerHTML = hfBlattInnen(mo, r);
        buehne.appendChild(el);
        blaetter.set(i, el);
    }
    kopf(c);
}

// ── Kopf, Riesen-KW, Strahl-Marke: was zur Woche vorn gehoert
let kopfAlt = -1;
function kopf(c) {
    if (c === kopfAlt) return;
    const vorher = kopfAlt;
    kopfAlt = c;
    const r = liste[c];
    const mo = hfMontag(hfAusDatum(r.dateFrom));
    $('hfSchauTitel').textContent = L(`KW ${r.week}`, `CW ${r.week}`) + ', ' + hfZeitraumText(mo);
    $('hfSchauHinweis').textContent = L(`${c + 1} von ${liste.length}`, `${c + 1} of ${liste.length}`);
    $('hfSchauZurueck').disabled = c === 0;
    $('hfSchauVor').disabled = c === liste.length - 1;
    blaetter.forEach((el, i) => el.setAttribute('aria-hidden', i === c ? 'false' : 'true'));
    // Riesen-KW: Ziffern steigen einzeln auf, Richtung folgt der Drehrichtung
    const ri = $('hfSchauRiesen');
    const runter = vorher > c;
    ri.innerHTML = String(r.week).split('').map((z, k) =>
        `<span style="--k:${k}" class="${runter ? 'is-runter' : ''}">${z}</span>`).join('');
    document.querySelectorAll('#hfSchauStriche .hf-strich').forEach((s, i) => s.classList.toggle('is-jetzt', i === c));
}

// ── Lage eines Blatts: d = i - pos (gebrochen), Trommel um die Hochachse
function lage(d, alter) {
    if (bewegungAus()) {
        return { t: `translateX(${d * 108}%)`, o: Math.abs(d) < 0.5 ? 1 : 0.35, f: 1, z: 100 - Math.round(Math.min(Math.abs(d), 9) * 10) };
    }
    const a = Math.abs(d);
    const winkel = d * WINKEL;
    // Neigung aus dem Tempo: schnelles Drehen kippt die Blaetter leicht nach hinten
    const kipp = klemm(-tempo * 2.2, -14, 14);
    const heben = Math.max(0, 1 - a);                          // vorderes Blatt kommt ein Stueck heraus
    // Einflug beim Oeffnen: gestaffelt aus der Tiefe
    const e = alter === undefined ? 1 : alter;
    const tiefe = (1 - e) * -1600;
    const t = `translateZ(${(-radius + tiefe).toFixed(1)}px) rotateY(${winkel.toFixed(2)}deg) translateZ(${radius.toFixed(1)}px)` +
        ` translateZ(${(heben * 40).toFixed(1)}px) rotateX(${kipp.toFixed(2)}deg)`;
    // Papier ist undurchsichtig: nach hinten abdunkeln, ausgeblendet wird erst
    // jenseits der Seitenansicht (halbdurchsichtige Blaetter liessen Texte durchscheinen)
    const o = (a > 2.9 ? Math.max(0, 1 - (a - 2.9) * 1.4) : 1) * Math.min(1, e * 1.6);
    return { t, o, f: 1 - Math.min(a, 3) * 0.17, z: 100 - Math.round(Math.min(a, 9) * 10) };
}

function stellen() {
    const jetzt = performance.now();
    blaetter.forEach((el, i) => {
        const d = i - pos;
        // Einflug: jedes Blatt startet 60 ms nach dem naeheren, 900 ms Flug
        let e;
        if (auftakt) {
            const t = (jetzt - auftakt - Math.abs(i - Math.round(pos)) * 60) / 900;
            const x = klemm(t, 0, 1);
            e = 1 - Math.pow(1 - x, 4);
        }
        const l = lage(d, e);
        el.style.transform = `translate(-50%, -50%) ${l.t}`;
        el.style.opacity = l.o;
        el.style.filter = l.f < 0.999 ? `brightness(${l.f.toFixed(3)})` : '';
        el.style.zIndex = l.z;
        el.style.visibility = l.o <= 0.01 ? 'hidden' : '';
    });
    const marke = $('hfSchauMarke');
    if (marke && liste.length > 1) marke.style.left = (klemm(pos, 0, liste.length - 1) / (liste.length - 1) * 100).toFixed(3) + '%';
    if (auftakt && jetzt - auftakt > 900 + FENSTER * 60) auftakt = 0;
}

// ── Physik-Schleife
function schritt() {
    if (ziehen) return;
    const kraft = FEDER * (ziel - pos) - DAEMPF * tempo;
    tempo += kraft * SCHRITT;
    pos += tempo * SCHRITT;
}
function tick(jetzt) {
    rafId = 0;
    const dt = Math.min(0.1, zuletzt ? (jetzt - zuletzt) / 1000 : SCHRITT);
    zuletzt = jetzt;
    rest += dt;
    if (bewegungAus()) { pos = ziel; tempo = 0; rest = 0; }
    for (let n = 0; rest >= SCHRITT && n < 8; n++) { rest -= SCHRITT; schritt(); }
    fenster();
    stellen();
    const ruhig = !ziehen && !auftakt && Math.abs(ziel - pos) < 0.0008 && Math.abs(tempo) < 0.002;
    if (ruhig) {
        pos = ziel; tempo = 0; stellen();
        laeuft = false; zuletzt = 0; rest = 0;
        angekommen();
        return;
    }
    rafId = requestAnimationFrame(tick);
}
function wecken() { if (!laeuft) { laeuft = true; zuletzt = 0; rafId = requestAnimationFrame(tick); } }

// Gelandet: Stempel des vorderen Blatts schlaegt auf (nur bei echter Freigabe/Unterschrift)
let gelandetAuf = -1;
function angekommen() {
    const c = Math.round(pos);
    if (c === gelandetAuf) return;
    gelandetAuf = c;
    blaetter.forEach((el, i) => el.classList.toggle('is-angekommen', i === c));
}

function gehe(i) {
    ziel = klemm(Math.round(i), 0, liste.length - 1);
    if (Math.round(pos) !== ziel) gelandetAuf = -1;
    wecken();
}

// ── Wischen: 1:1 am Finger, Schwung beim Loslassen
function start(e) {
    if (e.button !== undefined && e.button !== 0) return;
    ziehen = { x0: e.clientX, p0: pos, dx: 0, id: e.pointerId, spur: [[performance.now(), pos]] };
    tempo = 0;
    gelandetAuf = -1;
    try { $('hfSchauBuehne').setPointerCapture(e.pointerId); } catch (er) { }
    wecken();
}
function bewegen(e) {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    ziehen.dx = e.clientX - ziehen.x0;
    let p = ziehen.p0 - ziehen.dx / breite;
    // Gummiband am Rand: je weiter drueber, desto weniger folgt das Blatt
    const max = liste.length - 1;
    if (p < 0) p = -gummi(-p);
    else if (p > max) p = max + gummi(p - max);
    pos = p;
    const jetzt = performance.now();
    ziehen.spur.push([jetzt, pos]);
    while (ziehen.spur.length > 2 && jetzt - ziehen.spur[0][0] > 100) ziehen.spur.shift();
}
function gummi(x) { return (x * 0.55) / (1 + 0.55 * x); }
function ende(e) {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    const z = ziehen;
    ziehen = null;
    if (Math.abs(z.dx) < 6) {
        // Klick, kein Wisch: vorderes Blatt oeffnet die Woche, ein Nachbar holt sich nach vorn
        const treffer = document.elementFromPoint(e.clientX, e.clientY);
        const blatt = treffer && treffer.closest('.hf-schau-blatt');
        if (blatt) {
            const i = Number(blatt.dataset.i);
            if (i === Math.round(pos)) { oeffneAktuelle(blatt); return; }
            gehe(i); return;
        }
        gehe(pos); return;
    }
    // Tempo aus den letzten ~100 ms, dann Apples Projektion: Weg = v * d/(1-d), d = 0.998 je ms
    const a = z.spur[0], b = z.spur[z.spur.length - 1];
    const v = (b[0] - a[0]) > 0 ? (b[1] - a[1]) / ((b[0] - a[0]) / 1000) : 0;
    tempo = v;
    const projektion = (v / 1000) * 0.998 / (1 - 0.998);
    gehe(pos + projektion);
}

// ── Mausrad / Trackpad: schrittweise, ein Trackpad-Wisch blaettert mehrere Wochen
function rad(e) {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!d) return;
    e.preventDefault();
    const jetzt = performance.now();
    if (jetzt - radUhr > 260) radSumme = 0;
    radUhr = jetzt;
    radSumme += d * (e.deltaMode === 1 ? 30 : 1);
    while (Math.abs(radSumme) >= RAD_SCHWELLE) {
        const s = Math.sign(radSumme);
        radSumme -= s * RAD_SCHWELLE;
        gehe(Math.round(ziel) + s);
    }
}

// ── Zeitstrahl: ein Strich je Woche, Ziehen springt quer durch die Ausbildung
function strahlBauen() {
    const box = $('hfSchauStriche');
    let monatAlt = -1;
    const MON = L('Jan Feb Mär Apr Mai Jun Jul Aug Sep Okt Nov Dez', 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec').split(' ');
    const wenige = liste.length <= 40;
    box.innerHTML = liste.map((r, i) => {
        const m = Number(String(r.dateFrom).slice(5, 7)) - 1;
        let marke = '';
        if (m !== monatAlt) {
            monatAlt = m;
            // Bei langen Ausbildungen nur Quartalsanfaenge beschriften, sonst wird es Brei
            if (wenige || m % 3 === 0) marke = `<i>${m === 0 ? String(r.dateFrom).slice(0, 4) : MON[m]}</i>`;
        }
        return `<span class="hf-strich is-${zustand(r)}">${marke}</span>`;
    }).join('');
}
function strahlIndex(x) {
    const r = $('hfSchauStriche').getBoundingClientRect();
    return Math.round(klemm((x - r.left) / r.width, 0, 1) * (liste.length - 1));
}
let strahlZug = null;
function strahlStart(e) {
    strahlZug = e.pointerId;
    try { $('hfSchauStrahl').setPointerCapture(e.pointerId); } catch (er) { }
    gehe(strahlIndex(e.clientX));
}
function strahlZiehen(e) { if (strahlZug === e.pointerId) gehe(strahlIndex(e.clientX)); }
function strahlEnde(e) { if (strahlZug === e.pointerId) strahlZug = null; }

function taste(e) {
    if (e.key === 'Escape') { e.preventDefault(); schliessen(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); gehe(Math.round(ziel) - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); gehe(Math.round(ziel) + 1); }
    else if (e.key === 'Home') { e.preventDefault(); gehe(0); }
    else if (e.key === 'End') { e.preventDefault(); gehe(liste.length - 1); }
    else if (e.key === 'Enter' && e.target.closest && !e.target.closest('button')) { e.preventDefault(); oeffneAktuelle(); }
}

// Woche oeffnen: das vordere Blatt fliegt einem entgegen, dann der Bericht
function oeffneAktuelle(blatt) {
    const r = liste[Math.round(pos)];
    if (!r) return;
    const el = blatt || blaetter.get(Math.round(pos));
    const fertig = () => { schliessen(); viewReport(r.id); };
    if (!el || bewegungAus() || !el.animate) { fertig(); return; }
    const schau = $('hfSchau');
    el.animate([
        { transform: el.style.transform },
        { transform: 'translate(-50%, -50%) translateZ(520px) scale(1.05)', opacity: 0.0 }
    ], { duration: 420, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    schau.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, delay: 120, easing: 'ease-in', fill: 'forwards' })
        .onfinish = () => { schau.getAnimations().forEach(a => a.cancel()); el.getAnimations().forEach(a => a.cancel()); fertig(); };
}

function oeffnen() {
    liste = sortiert();
    if (!liste.length) return;
    zuletztFokus = document.activeElement;
    const el = bauen();
    blaetter.forEach(b => b.remove());
    blaetter = new Map();
    mitte = -1; kopfAlt = -1; gelandetAuf = -1;
    pos = ziel = liste.length - 1;      // juengste Woche vorn
    tempo = 0;
    el.hidden = false;
    document.body.classList.add('hf-schau-offen');
    strahlBauen();
    fenster();
    messen();
    auftakt = bewegungAus() ? 0 : performance.now();
    stellen();
    wecken();
    $('hfSchauHinweis').title = L('Wischen, ziehen, scrollen oder Pfeiltasten', 'Swipe, drag, scroll or use the arrow keys');
    $('hfSchauZu').focus();
}

function schliessen() {
    const el = $('hfSchau');
    if (!el || el.hidden) return;
    el.hidden = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0; laeuft = false; ziehen = null; auftakt = 0;
    document.body.classList.remove('hf-schau-offen');
    if (zuletztFokus && zuletztFokus.focus) zuletztFokus.focus();
}

return {
    oeffnen, schliessen,
    _intern: { lage, sortiert, zustand, gehe: (i) => gehe(i), idx: () => Math.round(ziel), pos: () => pos },
};
})();
