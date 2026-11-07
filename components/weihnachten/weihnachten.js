// ═══ WEIHNACHTEN MODULE ═══
// Adventskalender und gemalte Winternacht hinter der ganzen App (weihnachten-szene.js), 01.12. 0 Uhr bis 27.12. 7 Uhr. Klassen setzt das
// Pre-Apply-Skript im <head> (Schritt 8). Testen an einem anderen Tag: localStorage.mwl_weihnachten_test
// = '1', neu laden; der Kalender steht dann auf Türchen 7.
//
// Die Karte baut sich komplett hier auf (DE/EN direkt im Code), weil der i18n-Walk nur festes Markup
// sieht. „Ausblenden“ nimmt auch die Deko mit: Der Schalter dafür sitzt auf der Karte, ohne sie gäbe es
// ihn nicht mehr.
//
// Die Sätze sind Kurzfassungen aus Assets/js/rechte-checker/faelle.js, id = Fallseite. Ändert sich dort
// ein Rechtswert, gehört er auch hierher. tools/weihnachten.test.mjs prüft nur, dass es die Fälle gibt.
(function () {
    'use strict';

    const root = document.documentElement;
    if (!root.classList.contains('mwl-weihnachten')) return;

    const JETZT = new Date();
    const JAHR = JETZT.getFullYear();
    const HEUTE = JETZT.getMonth() === 11 ? Math.min(24, JETZT.getDate()) : 7;
    const LS_STAND = 'mwl_weihnachten_' + JAHR;          // 'weg'
    const LS_RUHE = 'mwl_weihnachten_ruhe_' + JAHR;      // '1' = Deko aus
    const LS_TUEREN = 'mwl_weihnachten_tueren_' + JAHR;  // [1, 2, …]

    const EN = root.lang === 'en';
    const T = function (de, en) { return EN ? en : de; };

    const TUEREN = [
        { id: 'weihnachtsgeld-azubi', de: "Weihnachtsgeld schreibt kein Gesetz vor. Tarifvertrag, Ausbildungsvertrag oder eine jahrelange Zahlung im Betrieb können dir trotzdem einen Anspruch geben.", en: "No law requires a Christmas bonus. A collective agreement, your contract or years of regular payments at your company can still give you a claim." },
        { id: 'ueberstunden-verguetung', de: "Überstunden in der Ausbildung müssen bezahlt oder mit Freizeit ausgeglichen werden. Eine Klausel, die alles mit der Vergütung abgilt, ist unzulässig.", en: "Overtime during training must be paid or made up with time off. A clause that declares it all covered by your pay is not allowed." },
        { id: 'pause', de: "Volljährige bekommen bei 6 bis 9 Stunden Arbeit mindestens 30 Minuten Pause, darüber 45. Minderjährige ab 4,5 Stunden 30 Minuten, über 6 Stunden 60.", en: "Adults get at least 30 minutes of break for 6 to 9 hours of work, 45 above that. Minors get 30 minutes from 4.5 hours and 60 above 6 hours." },
        { id: 'berichtsheft-zuhause', de: "Das Berichtsheft ist Ausbildungszeit. Dein Betrieb muss dir Gelegenheit geben, es am Arbeitsplatz zu führen, und darf dich nicht auf den Feierabend verweisen.", en: "Your training log counts as training time. Your company must let you keep it at work and cannot push it into your free time." },
        { id: 'krankmeldung-ab-tag-eins', de: "Krank melden musst du dich sofort. Ein Attest verlangt das Gesetz erst ab dem vierten Kalendertag, dein Betrieb darf es aber früher fordern.", en: "You must report sick right away. The law requires a doctor's note only from the fourth calendar day, but your company may ask for it sooner." },
        { id: 'privatbesorgungen', de: "Nikolaus hin oder her: Das Auto vom Chef waschen oder private Besorgungen machen gehört nicht zu deiner Ausbildung.", en: "St Nicholas or not: washing your boss's car or running private errands is not part of your training." },
        { id: 'krank-kein-geld', de: "Bist du länger als vier Wochen im Betrieb und meldest dich richtig krank, läuft deine Vergütung bis zu sechs Wochen weiter.", en: "If you have been with the company for more than four weeks and report sick correctly, your pay continues for up to six weeks." },
        { id: 'schule-nicht-angerechnet', de: "Berufsschule zählt als Ausbildungszeit, für alle Azubis, samt Pausen und nötiger Wege zwischen Schule und Betrieb.", en: "Vocational school counts as training time for every trainee, including breaks and necessary travel between school and company." },
        { id: 'arbeitsmaterial', de: "Werkzeug, Material und vorgeschriebene Arbeitskleidung für die Ausbildung muss dir der Betrieb kostenlos stellen.", en: "Your company must provide tools, materials and required work clothes for your training free of charge." },
        { id: 'diagnose-chef', de: "Deine Diagnose geht den Betrieb in aller Regel nichts an. Mitteilen musst du nur, dass du krank bist und wie lange voraussichtlich.", en: "Your diagnosis is normally none of your company's business. You only have to say that you are sick and for how long." },
        { id: 'ruhezeit-zwischen-schichten', de: "Zwischen zwei Arbeitstagen liegen mindestens 11 Stunden Ruhezeit, bei Jugendlichen 12. Das gilt auch nach Überstunden.", en: "At least 11 hours of rest must lie between two working days, 12 for minors. That applies after overtime too." },
        { id: 'pruefungsfreistellung', de: "Für Prüfungen musst du keinen Urlaub nehmen. Der Betrieb stellt dich bezahlt frei, und am Arbeitstag vor der schriftlichen Abschlussprüfung hast du frei.", en: "You do not need to take holiday for exams. Your company gives you paid leave, and the working day before the written final exam is off." },
        { id: 'verguetung-zu-spaet', de: "Deine Vergütung muss spätestens am letzten Arbeitstag des Monats da sein. „Mitte nächsten Monats“ ist für Azubis nicht zulässig.", en: "Your pay must arrive by the last working day of the month at the latest. \"Mid next month\" is not allowed for trainees." },
        { id: 'putzen', de: "Den eigenen Arbeitsplatz aufräumen ist in Ordnung. Regelmäßig die ganze Firma putzen hat mit deiner Ausbildung nichts zu tun.", en: "Tidying your own workplace is fine. Regularly cleaning the whole company has nothing to do with your training." },
        { id: 'krankheit-im-urlaub', de: "Mit Attest zählen Krankheitstage im Urlaub nicht als Urlaub. Melde dich sofort krank, dann stehen dir die Tage später noch einmal zu.", en: "With a doctor's note, sick days during holiday do not count as holiday. Report sick right away and you get those days back later." },
        { id: 'pruefungsgebuehr', de: "Die Prüfungsgebühren der Kammer für Zwischen- und Abschlussprüfung trägt dein Ausbildungsbetrieb.", en: "Your training company pays the chamber's fees for the intermediate and final exams." },
        { id: 'jaehrliche-steigerung', de: "Deine Ausbildungsvergütung muss mit fortschreitender Ausbildung mindestens einmal im Jahr steigen. Das ist Pflicht, keine Kulanz.", en: "Your training pay must rise at least once a year as your training progresses. That is required, not a favour." },
        { id: 'berichtsheft-unterschrift', de: "Dein Ausbilder muss deine Nachweise regelmäßig durchsehen. Lässt er das liegen, ist das seine Pflichtverletzung, kann aber vor der Zulassung zum Problem werden.", en: "Your trainer must review your records regularly. If they let that slide, it is their breach of duty, but it can still cause trouble before exam admission." },
        { id: 'schaden-bezahlen', de: "Bei einem Schaden aus leichter Fahrlässigkeit, der jedem passieren kann, zahlst du bei der Arbeit nichts.", en: "If you cause damage at work through slight negligence, the kind of slip anyone can make, you pay nothing." },
        { id: 'kuendigung-whatsapp', de: "Eine Kündigung per WhatsApp, E-Mail oder mündlich ist unwirksam. Sie muss auf Papier stehen und eigenhändig unterschrieben sein.", en: "A termination by WhatsApp, email or word of mouth is invalid. It must be on paper with a handwritten signature." },
        { id: 'resturlaub-verfaellt', de: "Resturlaub verfällt nicht automatisch. Dein Betrieb muss dich vorher auffordern, ihn zu nehmen, und klar warnen, dass er sonst verfällt.", en: "Leftover holiday does not expire automatically. Your company must first ask you to take it and clearly warn you that it would otherwise expire." },
        { id: 'urlaub-bestimmen', de: "Betriebsurlaub an Weihnachten ist zulässig, darf aber nicht deinen ganzen Urlaub aufbrauchen. Einen Teil musst du frei planen können.", en: "A company shutdown over Christmas is allowed but cannot use up all your holiday. You must be able to plan part of it freely." },
        { id: 'umkleidezeit', de: "Musst du vorgeschriebene Kleidung im Betrieb anziehen, ist das Umziehen samt Weg zur Umkleide Arbeitszeit.", en: "If you have to put on required clothing at the company, changing and walking to the changing room count as working time." },
        { id: 'feiertagsarbeit', de: "An gesetzlichen Feiertagen ist Arbeit grundsätzlich verboten, Ausnahmen gelten nur für bestimmte Branchen. Frohe Weihnachten!", en: "Work on public holidays is generally banned, with exceptions only for certain industries. Merry Christmas!" }
    ];

    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function ereignis(aktion) { if (typeof mwlEvent === 'function') mwlEvent('weihnachten', { aktion: aktion }); }

    function geoeffnet() {
        try {
            const liste = JSON.parse(lsGet(LS_TUEREN) || '[]');
            return Array.isArray(liste) ? liste : [];
        } catch (e) { return []; }
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

    // ── Karte ───────────────────────────────────────────────────────────
    function init() {
        const auf = new Set(geoeffnet());
        if (root.classList.contains('mwl-weihnachten-deko') && szene()) szene().start(auf.size);
        gruss();
        const karte = document.getElementById('wnCard');
        if (!karte || !root.classList.contains('mwl-weihnachten-karte')) return;

        const zaehler = el('p', 'wn-zaehler');
        function stand() {
            zaehler.textContent = T(auf.size + ' von 24 Lichtern brennen am Baum', auf.size + ' of 24 lights on the tree');
            if (szene()) szene().lichter(auf.size);
        }
        const titel = el('h3', 'wn-title');
        titel.id = 'wnTitle';
        const lead = el('p', 'wn-lead');
        lead.id = 'wnLead';
        lead.setAttribute('aria-live', 'polite');
        const link = el('a', 'wn-link', T('Ganzen Fall lesen', 'Read the full case'));
        link.hidden = true;
        const knoepfe = {};

        function zeigeTuer(n) {
            const t = TUEREN[n - 1];
            titel.textContent = T('Türchen ', 'Door ') + n;
            lead.textContent = T(t.de, t.en);
            link.href = (EN ? '/en' : '') + '/rechte-checker/' + t.id + '/';
            link.hidden = false;
            lead.classList.remove('is-neu');
            void lead.offsetWidth;   // Animation neu starten, auch beim Wechsel zwischen zwei Türchen
            lead.classList.add('is-neu');
        }

        function oeffne(n) {
            if (n > HEUTE) {
                titel.textContent = T('Türchen ', 'Door ') + n;
                lead.textContent = T('Noch zu. Es öffnet am ' + n + '. Dezember.', 'Still closed. It opens on ' + n + ' December.');
                link.hidden = true;
                return;
            }
            const neu = !auf.has(n);
            if (neu) {
                auf.add(n);
                lsSet(LS_TUEREN, JSON.stringify([...auf]));
                ereignis('tuer');
                stand();
            }
            knoepfe[n].classList.add('is-auf');
            knoepfe[n].classList.remove('is-heute');
            knoepfe[n].setAttribute('aria-label', T('Türchen ' + n + ', geöffnet', 'Door ' + n + ', opened'));
            zeigeTuer(n);
            heuteKnopf.hidden = auf.has(HEUTE);
        }

        const raster = el('div', 'wn-raster');
        raster.setAttribute('role', 'group');
        raster.setAttribute('aria-label', T('Adventskalender', 'Advent calendar'));
        for (let n = 1; n <= 24; n++) {
            const b = el('button', 'wn-tuer', String(n));
            b.type = 'button';
            if (auf.has(n)) b.classList.add('is-auf');
            if (n === HEUTE && !auf.has(n)) b.classList.add('is-heute');
            if (n > HEUTE) b.classList.add('is-zu');
            b.setAttribute('aria-label', auf.has(n)
                ? T('Türchen ' + n + ', geöffnet', 'Door ' + n + ', opened')
                : n > HEUTE ? T('Türchen ' + n + ', noch zu', 'Door ' + n + ', still closed') : T('Türchen ' + n + ' öffnen', 'Open door ' + n));
            b.addEventListener('click', function () { oeffne(n); });
            knoepfe[n] = b;
            raster.appendChild(b);
        }

        const heuteKnopf = el('button', 'wn-btn wn-btn--primary', T('Türchen ' + HEUTE + ' öffnen', 'Open door ' + HEUTE));
        heuteKnopf.type = 'button';
        heuteKnopf.hidden = auf.has(HEUTE);
        heuteKnopf.addEventListener('click', function () { oeffne(HEUTE); });

        // Heutiges Türchen schon offen: Die Karte bleibt eine Zeile (Klasse aus dem Pre-Apply), das
        // Dashboard ist für viele das tägliche Werkzeug und soll nicht 26 Tage lang nach unten rutschen.
        const alle = el('button', 'wn-btn wn-btn--alle', T('Alle Türchen', 'All doors'));
        alle.type = 'button';
        alle.addEventListener('click', function () {
            root.classList.remove('mwl-weihnachten-klein');
            ereignis('alle');
        });

        const deko = el('button', 'wn-btn wn-btn--leise');
        deko.type = 'button';
        deko.appendChild(icon(ICON_FLOCKE));
        const dekoText = el('span');
        deko.appendChild(dekoText);
        function dekoZeigen() {
            const an = root.classList.contains('mwl-weihnachten-deko');
            dekoText.textContent = an ? T('Deko aus', 'Decorations off') : T('Deko an', 'Decorations on');
            deko.setAttribute('aria-pressed', an ? 'true' : 'false');
        }
        function heroNeu() {
            if (heroOriginal) { try { window.dnRenderHero(); } catch (e) {} }
        }
        deko.addEventListener('click', function () {
            const an = !root.classList.contains('mwl-weihnachten-deko');
            root.classList.toggle('mwl-weihnachten-deko', an);
            if (szene()) { if (an) szene().start(auf.size); else szene().stop(); }
            lsSet(LS_RUHE, an ? '' : '1');
            dekoZeigen();
            heroNeu();
            ereignis(an ? 'deko_an' : 'deko_aus');
        });
        dekoZeigen();

        const zu = el('button', 'wn-close');
        zu.type = 'button';
        zu.appendChild(icon(ICON_X));
        const zuText = T('Kalender und Deko ausblenden', 'Hide calendar and decorations');
        zu.setAttribute('aria-label', zuText);
        zu.title = zuText;
        zu.addEventListener('click', function () {
            lsSet(LS_STAND, 'weg');
            root.classList.remove('mwl-weihnachten-karte', 'mwl-weihnachten-deko', 'mwl-weihnachten-klein');
            if (szene()) szene().stop();
            heroNeu();
            ereignis('weg');
        });

        titel.textContent = T('Adventskalender', 'Advent calendar');
        lead.textContent = HEUTE === 24
            ? T('Letztes Türchen: ein Recht, dann Feierabend. Frohe Weihnachten!', 'Last door: one right, then time off. Merry Christmas!')
            : T('Jeden Tag ein Recht, das du in der Ausbildung hast. Heute ist Türchen ' + HEUTE + ' dran.', 'One right you have in training, every day. Today it is door ' + HEUTE + '.');

        const text = el('div', 'wn-text');
        const aktionen = el('div', 'wn-actions');
        aktionen.append(heuteKnopf, link, alle, deko);
        stand();
        text.append(titel, lead, zaehler, aktionen);
        karte.setAttribute('aria-labelledby', 'wnTitle');
        karte.append(raster, text, zu);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
