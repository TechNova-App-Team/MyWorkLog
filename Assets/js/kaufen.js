// ═══ KAUFEN MODULE ═══
// Wegwerf-Demo der Kaufstrecke (/kaufen/), siehe Kopf von pages/kaufen/index.html.
(function () {
    'use strict';
    const $ = (id) => document.getElementById(id);

    // Akzent der App nachziehen (Pflicht fuer Standalone-Seiten)
    try {
        const d = JSON.parse(localStorage.getItem('tg_pro_data') || 'null');
        const hex = d && d.settings && d.settings.theme;
        if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) document.documentElement.style.setProperty('--primary', hex);
    } catch (e) {}

    // Nur eigene Pfade als Ruecksprung — kein offener Redirect ueber ?zurueck=//fremd.de
    const roh = new URLSearchParams(location.search).get('zurueck') || '';
    const zurueck = /^\/(?!\/)[\w\-/]*$/.test(roh) ? roh : '/berichtsheft/';

    function zeigen(nr) {
        document.querySelectorAll('[data-schritt]').forEach(s => { s.hidden = s.dataset.schritt !== String(nr); });
        document.querySelectorAll('[data-schritt-marke]').forEach(m => {
            const n = +m.dataset.schrittMarke;
            m.classList.toggle('is-jetzt', String(n) === String(nr));
            m.classList.toggle('is-fertig', nr === 'fertig' || n < +nr);
        });
        const h = document.querySelector('[data-schritt="' + nr + '"] h2');
        if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    }

    function summe() {
        const r = document.querySelector('input[name="dauer"]:checked');
        if (!r) return;
        $('kfDauer').textContent = 'bis ' + r.value + ' Jahre';
        $('kfPreis').textContent = r.dataset.preis + ' €';
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('kfZurueck').href = zurueck;
        summe();
        document.addEventListener('change', (e) => { if (e.target.name === 'dauer') summe(); });
        document.addEventListener('click', (e) => {
            const w = e.target.closest('[data-weiter]');
            if (w) zeigen(w.dataset.weiter);
        });

        const knopf = $('kfKaufen');
        const lokal = window.MWLVorschau && MWLVorschau.lokal();
        if (!lokal) {
            knopf.disabled = true;
            $('kfMeldung').textContent = 'Der Pass ist noch nicht kaufbar. Die Demo läuft nur auf dem Entwicklungsrechner.';
        }
        knopf.addEventListener('click', () => {
            if (!MWLVorschau.demoFreischalten()) {
                $('kfMeldung').textContent = 'Freischalten hat nicht geklappt (nur auf localhost möglich).';
                return;
            }
            zeigen('fertig');
            const ziel = new URL(zurueck, location.origin);
            ziel.searchParams.set('pass', 'neu');
            setTimeout(() => location.assign(ziel.pathname + ziel.search), 1200);
        });
    });
})();
