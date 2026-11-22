// ═══ SILVESTER MODULE ═══
// 30.12. 0 Uhr bis 02.01. 7 Uhr: Feuerwerk hinter der App (silvester-szene.js), dunkles Glas
// (silvester.css), oben im Dashboard Countdown + Jahresrückblick. Klassen setzt das Pre-Apply-Skript im
// <head> (Schritt 9). Testen: localStorage.mwl_silvester_test = '1' (heutige Uhrzeit am 31.12.) oder
// 'finale' (00:02 Uhr Neujahr), neu laden.
//
// Speicherschlüssel tragen das NEUE Jahr (mwl_silvester_2027 gilt vom 30.12.2026 bis 02.01.2027), damit
// ein „Ausblenden“ am 31.12. nicht am 1.1. wieder aufgeht.
//
// Rückblick: nur Zahlen, die in den Daten stehen (.claude/notes/auswertungen.md, „erfundene Nenner“).
// Berichtsheft-Wochen zählen nach dem Kalenderjahr von dateFrom — report.year ist das AUSBILDUNGSjahr.
// Eine Kennzahl mit 0 wird weggelassen; ist alles 0, entfällt der Rückblick.
(function () {
    'use strict';

    const root = document.documentElement;
    if (!root.classList.contains('mwl-silvester')) return;

    const EN = root.lang === 'en';
    const T = function (de, en) { return EN ? en : de; };
    const zahl = function (n) { return Number(n).toLocaleString(EN ? 'en-GB' : 'de-DE'); };

    function imFenster(d) {
        const m = d.getMonth(), t = d.getDate();
        return (m === 11 && t >= 30) || (m === 0 && (t === 1 || (t === 2 && d.getHours() < 7)));
    }
    // Gleiche Regel wie SilvesterSzene.jetzt(); hier eigenständig, weil die Szene später lädt
    function jetzt() {
        const d = new Date();
        let test = null;
        try { test = localStorage.getItem('mwl_silvester_test'); } catch (e) { }
        if (test === 'finale') return new Date(d.getFullYear() + 1, 0, 1, 0, 2, d.getSeconds());
        if (test === '1' && !imFenster(d)) return new Date(d.getFullYear(), 11, 31, d.getHours(), d.getMinutes(), d.getSeconds());
        return d;
    }
    const START = jetzt();
    const NEU = START.getMonth() === 0 ? START.getFullYear() : START.getFullYear() + 1;
    const ALT = NEU - 1;
    const LS_STAND = 'mwl_silvester_' + NEU;          // 'weg'
    const LS_RUHE = 'mwl_silvester_ruhe_' + NEU;      // '1' = Deko aus

    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
    function ereignis(aktion) {
        if (typeof mwlEvent === 'function') { try { mwlEvent('silvester', { aktion: aktion }); } catch (e) { } }
    }
    function el(tag, klasse, text) {
        const e = document.createElement(tag);
        if (klasse) e.className = klasse;
        if (text !== undefined && text !== null) e.textContent = text;
        return e;
    }
    const ICON_X = 'M18 6 6 18M6 6l12 12';
    const ICON_FUNKE = 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8';
    function icon(pfad) {
        const s = document.createElement('span');
        s.className = 'sv-ico';
        s.setAttribute('aria-hidden', 'true');
        s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="' + pfad + '"/></svg>';
        return s;
    }
    const szene = function () { return typeof SilvesterSzene !== 'undefined' ? SilvesterSzene : null; };

    // ── Countdown ───────────────────────────────────────────────────────
    function zeile(d) {
        const ziel = new Date(NEU, 0, 1, 0, 0, 0);
        const ms = ziel - d;
        if (ms <= 0) return [T('Frohes neues Jahr', 'Happy New Year'),
            T('Willkommen in ' + NEU + '. Das Feuerwerk klingt bis zum 2. Januar aus.', 'Welcome to ' + NEU + '. The fireworks fade out by 2 January.')];
        if (d.getMonth() === 11 && d.getDate() === 30) return [T('Morgen ist Silvester', 'New Year’s Eve is tomorrow'),
            T('Ab morgen Abend wird der Himmel voller, um Mitternacht kommt das große Feuerwerk.', 'From tomorrow evening the sky fills up, with the big show at midnight.')];
        const unten = d.getHours() < 18
            ? T('Ab heute Abend wird der Himmel voller.', 'The sky fills up from this evening.')
            : T('Um Mitternacht kommt das große Feuerwerk.', 'The big show starts at midnight.');
        const s = Math.ceil(ms / 1000);
        if (s <= 60) return [T('Noch ' + s + (s === 1 ? ' Sekunde' : ' Sekunden') + ' bis ' + NEU, s + (s === 1 ? ' second' : ' seconds') + ' to ' + NEU), unten];
        const min = Math.floor(s / 60) % 60, std = Math.floor(s / 3600);
        if (!std) return [T('Noch ' + (min + 1) + ' Minuten bis ' + NEU, (min + 1) + ' minutes to ' + NEU), unten];
        const stdText = T(std + (std === 1 ? ' Stunde' : ' Stunden'), std + (std === 1 ? ' hour' : ' hours'));
        const minText = min ? T(' und ' + min + ' Minuten', ' and ' + min + ' minutes') : '';
        return [T('Noch ' + stdText + minText + ' bis ' + NEU, stdText + minText + ' to ' + NEU), unten];
    }

    // ── Rückblick ───────────────────────────────────────────────────────
    function rueckblick() {
        const jahr = String(ALT);
        const eintraege = (typeof data !== 'undefined' && data && Array.isArray(data.entries)) ? data.entries : [];
        let stunden = 0;
        const schule = new Set(), urlaub = new Set(), erfasst = new Set();
        eintraege.forEach(function (e) {
            if (!e || typeof e.date !== 'string' || e.date.slice(0, 4) !== jahr || e.isPeriod) return;
            erfasst.add(e.date);
            if (e.type === 'work') stunden += Number(e.worked) || 0;
            else if (e.type === 'school') schule.add(e.date);
            else if (e.type === 'vacation') urlaub.add(e.date);
        });
        let wochen = 0;
        try {
            const r = JSON.parse(localStorage.getItem('berichtsheft_reports') || '[]');
            if (Array.isArray(r)) wochen = r.filter(function (w) { return w && typeof w.dateFrom === 'string' && w.dateFrom.slice(0, 4) === jahr; }).length;
        } catch (e) { }
        return [
            [Math.round(stunden), T('Stunden gearbeitet', 'hours worked')],
            [erfasst.size, T('Tage erfasst', 'days logged')],
            [wochen, T('Wochen im Berichtsheft', 'weeks in your training log')],
            [schule.size, T('Tage Berufsschule', 'days at vocational school')],
            [urlaub.size, T('Tage Urlaub', 'days of holiday')]
        ].filter(function (z) { return z[0] > 0; });
    }

    // ── Begrüßung im Dashboard, gleicher Weg wie weihnachten.js ──
    const heroOriginal = typeof window.dnRenderHero === 'function' ? window.dnRenderHero : null;
    function gruss() {
        if (!root.classList.contains('mwl-silvester-deko')) return;
        const gEl = document.getElementById('dnGreet'), nEl = document.getElementById('dnName');
        if (!gEl || !nEl) return;
        const vorher = jetzt() < new Date(NEU, 0, 1);
        const wort = vorher ? T('Guten Rutsch', 'Happy New Year’s Eve') : T('Frohes Neues', 'Happy New Year');
        const name = (typeof mwlAnzeigeName === 'function') ? mwlAnzeigeName() : '';
        if (name) gEl.textContent = wort + ',';
        else {
            gEl.textContent = T('Willkommen zurück,', 'Welcome back,');
            nEl.innerHTML = '';
            nEl.appendChild(document.createTextNode(wort));
            nEl.appendChild(el('span', 'dn-dotmark', '.'));
        }
    }
    if (heroOriginal) {
        window.dnRenderHero = function () {
            const r = heroOriginal.apply(this, arguments);
            try { gruss(); } catch (e) {}
            return r;
        };
    }
    function heroNeu() { if (heroOriginal) { try { window.dnRenderHero(); } catch (e) {} } }

    // ── Karte ───────────────────────────────────────────────────────────
    function init() {
        if (root.classList.contains('mwl-silvester-deko') && szene()) szene().start();
        gruss();
        const karte = document.getElementById('svCard');
        if (!karte || !root.classList.contains('mwl-silvester-karte')) return;

        const kopf = el('div', 'sv-kopf');
        const marke = el('span', 'sv-marke');
        marke.appendChild(icon(ICON_FUNKE));
        const text = el('div', 'sv-text');
        const titel = el('p', 'sv-title'); titel.id = 'svTitle';
        const unten = el('p', 'sv-lead');
        text.append(titel, unten);
        let warNeu = null;
        function stellen() {
            const d = jetzt();
            const [a, b] = zeile(d);
            if (titel.textContent !== a) titel.textContent = a;
            if (unten.textContent !== b) unten.textContent = b;
            const neu = d >= new Date(NEU, 0, 1);
            if (warNeu === false && neu) { heroNeu(); ereignis('mitternacht'); }
            warNeu = neu;
        }
        stellen();
        // Ein Textwechsel je Sekunde kostet nichts; im verdeckten Tab bremst der Browser den Zeitgeber selbst
        const uhr = setInterval(stellen, 1000);

        const deko = el('button', 'sv-btn');
        deko.type = 'button';
        function dekoZeigen() {
            const an = root.classList.contains('mwl-silvester-deko');
            deko.textContent = an ? T('Feuerwerk aus', 'Fireworks off') : T('Feuerwerk an', 'Fireworks on');
            deko.setAttribute('aria-pressed', an ? 'true' : 'false');
        }
        deko.addEventListener('click', function () {
            const an = !root.classList.contains('mwl-silvester-deko');
            root.classList.toggle('mwl-silvester-deko', an);
            if (szene()) { if (an) szene().start(); else szene().stop(); }
            lsSet(LS_RUHE, an ? '' : '1');
            dekoZeigen();
            heroNeu();
            ereignis(an ? 'deko_an' : 'deko_aus');
        });
        dekoZeigen();

        const zu = el('button', 'sv-close');
        zu.type = 'button';
        zu.appendChild(icon(ICON_X));
        const zuText = T('Countdown und Feuerwerk ausblenden', 'Hide countdown and fireworks');
        zu.setAttribute('aria-label', zuText);
        zu.title = zuText;
        zu.addEventListener('click', function () {
            lsSet(LS_STAND, 'weg');
            clearInterval(uhr);
            root.classList.remove('mwl-silvester-karte', 'mwl-silvester-deko');
            if (szene()) szene().stop();
            heroNeu();
            ereignis('weg');
        });
        kopf.append(marke, text, deko, zu);
        karte.setAttribute('aria-labelledby', 'svTitle');
        karte.appendChild(kopf);

        const werte = rueckblick();
        if (werte.length) {
            const rb = el('div', 'sv-rueckblick');
            rb.appendChild(el('p', 'sv-rb-titel', T('Dein ' + ALT, 'Your ' + ALT)));
            const liste = el('dl', 'sv-rb-liste');
            werte.forEach(function (z) {
                const zeileEl = el('div', 'sv-rb-wert');
                zeileEl.append(el('dt', null, z[1]), el('dd', null, zahl(z[0])));
                liste.appendChild(zeileEl);
            });
            rb.appendChild(liste);
            karte.appendChild(rb);
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
