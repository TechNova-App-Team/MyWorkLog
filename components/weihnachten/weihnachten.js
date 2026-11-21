// ═══ WEIHNACHTEN MODULE ═══
// Winterliche App vom 01.12. 0 Uhr bis 27.12. 7 Uhr: Frost und Schnee hinter allem (weihnachten-szene.js),
// Frostglas-Flächen (weihnachten.css) und eine Grußzeile oben im Dashboard. Klassen setzt das Pre-Apply-Skript
// im <head> (Schritt 8). Testen an einem anderen Tag: localStorage.mwl_weihnachten_test = '1', neu laden;
// außerhalb des Dezembers rechnet die Zeile dann mit dem 7. Dezember.
//
// Den Adventskalender (24 Rechte-Türchen) gab es bis 22.11.2026; der Nutzer fand ihn „unfassbar unnötig“.
// Nicht zurückbauen. Gewählt hat er stattdessen: kleiner Gruß mit Aus-Knopf.
//
// Die Zeile baut sich hier auf (DE/EN direkt im Code), weil der i18n-Walk nur festes Markup sieht.
// „Ausblenden“ nimmt die Deko mit: Der Schalter dafür sitzt in der Zeile, ohne sie gäbe es ihn nicht mehr.
(function () {
    'use strict';

    const root = document.documentElement;
    if (!root.classList.contains('mwl-weihnachten')) return;

    const JETZT = new Date();
    const JAHR = JETZT.getFullYear();
    const TAG = JETZT.getMonth() === 11 ? JETZT.getDate() : 7;
    const LS_STAND = 'mwl_weihnachten_' + JAHR;          // 'weg'
    const LS_RUHE = 'mwl_weihnachten_ruhe_' + JAHR;      // '1' = Deko aus

    const EN = root.lang === 'en';
    const T = function (de, en) { return EN ? en : de; };

    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
    function ereignis(aktion) {
        if (typeof mwlEvent === 'function') { try { mwlEvent('weihnachten', { aktion: aktion }); } catch (e) { } }
    }
    function el(tag, klasse, text) {
        const e = document.createElement(tag);
        if (klasse) e.className = klasse;
        if (text) e.textContent = text;
        return e;
    }
    function icon(pfad) {
        const s = document.createElement('span');
        s.className = 'wn-ico';
        s.setAttribute('aria-hidden', 'true');
        s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="' + pfad + '"/></svg>';
        return s;
    }
    const ICON_FLOCKE = 'M12 2v20M4 7l16 10M20 7 4 17M12 6 9.5 3.5M12 6l2.5-2.5M12 18l-2.5 2.5M12 18l2.5 2.5';
    const ICON_X = 'M18 6 6 18M6 6l12 12';

    const szene = function () { return typeof WeihnachtsSzene !== 'undefined' ? WeihnachtsSzene : null; };

    // Die Zeile sagt, wie weit es noch ist, und wann der Winter von selbst geht
    function zeile() {
        if (TAG < 23) return [T('Noch ' + (24 - TAG) + ' Tage bis Heiligabend', (24 - TAG) + ' days until Christmas Eve'),
            T('Die App bleibt bis zum 27. Dezember winterlich.', 'The app stays wintry until 27 December.')];
        if (TAG === 23) return [T('Morgen ist Heiligabend', 'Christmas Eve is tomorrow'),
            T('Die App bleibt bis zum 27. Dezember winterlich.', 'The app stays wintry until 27 December.')];
        if (TAG === 24) return [T('Heute ist Heiligabend', 'It is Christmas Eve'),
            T('Frohe Weihnachten. Der Winter verschwindet am 27. Dezember von selbst.', 'Merry Christmas. The winter look leaves on its own on 27 December.')];
        return [T('Frohe Weihnachten', 'Merry Christmas'),
            T('Schöne Feiertage. Der Winter verschwindet am 27. Dezember von selbst.', 'Happy holidays. The winter look leaves on its own on 27 December.')];
    }

    // ── Begrüßung im Dashboard, gleicher Weg wie halloween.js: dnRenderHero ist eine globale Bindung ──
    const GRUSS = [
        [6,  'Stille Nacht',            'Silent night'],
        [11, 'Guten Morgen im Advent',  'Good Advent morning'],
        [17, 'Schönen Adventstag',      'Happy Advent day'],
        [22, 'Gemütlichen Abend',       'Cosy evening'],
        [24, 'Stille Nacht',            'Silent night']
    ];
    const ZITATE = [
        ['Der Weihnachtsmann führt auch Buch. Dein Berichtsheft schreibt er trotzdem nicht.', 'Santa keeps records too. He still won’t write your training log.'],
        ['Alle Jahre wieder: das Berichtsheft vom Dezember.', 'Every year again: the December training log.'],
        ['Plätzchen backen zählt leider nicht als Arbeitszeit. Außer du lernst Konditorei.', 'Baking cookies does not count as working time. Unless you are training as a pastry chef.']
    ];
    const heroOriginal = typeof window.dnRenderHero === 'function' ? window.dnRenderHero : null;
    function gruss() {
        if (!root.classList.contains('mwl-weihnachten-deko')) return;
        const gEl = document.getElementById('dnGreet'), nEl = document.getElementById('dnName');
        if (!gEl || !nEl) return;
        const h = new Date().getHours();
        const g = GRUSS.find(function (z) { return h < z[0]; });
        const wort = T(g[1], g[2]);
        const name = (typeof mwlAnzeigeName === 'function') ? mwlAnzeigeName() : '';
        if (name) gEl.textContent = wort + ',';
        else {
            gEl.textContent = T('Willkommen zurück,', 'Welcome back,');
            nEl.innerHTML = '';
            nEl.appendChild(document.createTextNode(wort));
            const p = el('span', 'dn-dotmark', '.');
            nEl.appendChild(p);
        }
        const q = document.getElementById('dnQuote');
        const z = ZITATE[h % ZITATE.length];
        if (q) q.textContent = EN ? '“' + z[1] + '”' : '„' + z[0] + '“';
    }
    if (heroOriginal) {
        window.dnRenderHero = function () {
            const r = heroOriginal.apply(this, arguments);
            try { gruss(); } catch (e) {}
            return r;
        };
    }
    function heroNeu() {
        if (heroOriginal) { try { window.dnRenderHero(); } catch (e) {} }
    }

    // ── Grußzeile ───────────────────────────────────────────────────────
    function init() {
        if (root.classList.contains('mwl-weihnachten-deko') && szene()) szene().start();
        gruss();
        const karte = document.getElementById('wnCard');
        if (!karte || !root.classList.contains('mwl-weihnachten-karte')) return;

        const [titelText, untenText] = zeile();
        const marke = el('span', 'wn-marke');
        marke.appendChild(icon(ICON_FLOCKE));
        const text = el('div', 'wn-text');
        const titel = el('p', 'wn-title', titelText);
        titel.id = 'wnTitle';
        text.append(titel, el('p', 'wn-lead', untenText));

        const deko = el('button', 'wn-btn');
        deko.type = 'button';
        function dekoZeigen() {
            const an = root.classList.contains('mwl-weihnachten-deko');
            deko.textContent = an ? T('Deko aus', 'Decorations off') : T('Deko an', 'Decorations on');
            deko.setAttribute('aria-pressed', an ? 'true' : 'false');
        }
        deko.addEventListener('click', function () {
            const an = !root.classList.contains('mwl-weihnachten-deko');
            root.classList.toggle('mwl-weihnachten-deko', an);
            if (szene()) { if (an) szene().start(); else szene().stop(); }
            lsSet(LS_RUHE, an ? '' : '1');
            dekoZeigen();
            heroNeu();
            ereignis(an ? 'deko_an' : 'deko_aus');
        });
        dekoZeigen();

        const zu = el('button', 'wn-close');
        zu.type = 'button';
        zu.appendChild(icon(ICON_X));
        const zuText = T('Gruß und Deko ausblenden', 'Hide greeting and decorations');
        zu.setAttribute('aria-label', zuText);
        zu.title = zuText;
        zu.addEventListener('click', function () {
            lsSet(LS_STAND, 'weg');
            root.classList.remove('mwl-weihnachten-karte', 'mwl-weihnachten-deko');
            if (szene()) szene().stop();
            heroNeu();
            ereignis('weg');
        });

        karte.setAttribute('aria-labelledby', 'wnTitle');
        karte.append(marke, text, deko, zu);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
