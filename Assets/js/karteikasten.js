// ═══ KARTEIKASTEN MODULE ═══
// /lernen/: Vorschau vom 20.10.2026. Lauffaehig ist nur der Kasten selbst
// (Faecher, Abstaende, Abfrage) mit dem Beispielstapel. Die KI-Anbindung fehlt
// bewusst — Bauplan, Kartenformat und Messplan: .claude/notes/karteikasten.md.
//
// 🔴 Was hier NICHT hingehoert, auch spaeter nicht: ein Freitextfeld, in das man
// der KI Fragen stellt. Die KI liefert nur Karten im festen Format (Plan, Abschnitt
// "Kartenformat"); alles, was der Nutzer sieht, rendert diese Datei. Genau das
// unterscheidet den Kasten von einem Chat — und haelt ihn dicht gegen Missbrauch.
//
// Speicher: mwl_karteikasten_v1 = { v:1, karten: { <id>: Karte }, zuletzt: 'YYYY-MM-DD' }
//   Karte = { id, typ:'wahl'|'aufdecken'|'reihe', frage, ..., quelle:{art,text},
//             fach:0..5, faellig:'YYYY-MM-DD', gesehen, richtig, gesperrt }
//   Die Kartentexte liegen MIT im Speicher (nicht nur die id), weil KI-Karten
//   spaeter keine feste Quelle im Code haben. Der Beispielstapel wird deshalb beim
//   Laden in der aktuellen Sprache hineinkopiert.
// Messung nur mit Kategorien/Zahlen (CLAUDE.md): karteikasten_* Ereignisse.
(function () {
    'use strict';

    var KEY = 'mwl_karteikasten_v1';
    var EN = document.documentElement.lang === 'en';
    var L = function (de, en) { return EN ? en : de; };

    // Tage bis zur naechsten Abfrage je Fach. Fach 0 = neu (sofort dran).
    // Leitner-Abstaende; "falsch" wirft immer zurueck in Fach 1 (= morgen).
    var ABSTAND = [0, 1, 3, 7, 14, 30];
    var MAX_JE_RUNDE = 12;
    var FACH_NAME = [L('Neu', 'New'), '1', '2', '3', '4', '5'];
    var FACH_TAKT = [
        L('neu', 'new'),
        L('1 Tag', '1 day'),
        L('3 Tage', '3 days'),
        L('1 Woche', '1 week'),
        L('2 Wochen', '2 weeks'),
        L('1 Monat', '1 month')
    ];

    var HAKEN = '<svg class="kk-marke-rot" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13l5 5L20 6"/></svg>';
    var KREUZ = '<svg class="kk-marke-rot" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    // ── Beispielstapel ────────────────────────────────────────────────
    // Aus den Standardberufsbildpositionen, die seit 2021 in JEDEM Ausbildungsrahmenplan
    // stehen — damit passt der Stapel zu jedem Beruf. Jede Antwort mit Fundstelle;
    // wer hier etwas aendert, prueft die Fundstelle mit (Rechtswerte, keine Faustregeln).
    var BEISPIEL = [
        {
            id: 'bsp-probezeit', typ: 'wahl',
            kurz: ['Probezeit', 'Probation period'],
            frage: ['Wie lang darf die Probezeit in der Ausbildung höchstens sein?', 'What is the maximum length of the probation period in German vocational training?'],
            wahlen: [['1 Monat', '1 month'], ['4 Monate', '4 months'], ['6 Monate', '6 months'], ['12 Monate', '12 months']],
            richtig: 1,
            erklaerung: ['Mindestens einen, höchstens vier Monate (§ 20 BBiG). In der Probezeit können beide Seiten ohne Grund und ohne Frist kündigen.', 'At least one, at most four months (§ 20 BBiG). During probation, both sides can terminate without notice and without giving a reason.'],
            quelle: ['Berufsbildung, Arbeits- und Tarifrecht', 'Vocational training, labour and collective agreement law']
        },
        {
            id: 'bsp-nachweis', typ: 'aufdecken',
            kurz: ['Ausbildungsnachweis', 'Training record'],
            frage: ['Was musst du während der Ausbildung schriftlich führen, und was hängt davon ab?', 'What do you have to keep in writing during your training, and what depends on it?'],
            antwort: ['Den Ausbildungsnachweis, also das Berichtsheft (§ 13 BBiG). Die Ausbilderin oder der Ausbilder sieht ihn regelmäßig durch und zeichnet ihn ab. Ohne ihn wirst du nicht zur Abschlussprüfung zugelassen (§ 43 BBiG).', 'The training record, i.e. the Berichtsheft (§ 13 BBiG). Your trainer reviews and signs it regularly. Without it you will not be admitted to the final exam (§ 43 BBiG).'],
            erklaerung: ['Er darf während der Arbeitszeit geführt werden. Das muss der Betrieb ermöglichen.', 'You may write it during working hours, and the company has to allow for that.'],
            quelle: ['Berufsbildung, Arbeits- und Tarifrecht', 'Vocational training, labour and collective agreement law']
        },
        {
            id: 'bsp-jarbschg', typ: 'wahl',
            kurz: ['Arbeitszeit unter 18', 'Working hours under 18'],
            frage: ['Du bist 17. Wie viele Stunden darfst du an einem Tag höchstens arbeiten?', 'You are 17. What is the maximum number of hours you may work in one day?'],
            wahlen: [['8 Stunden', '8 hours'], ['9 Stunden', '9 hours'], ['10 Stunden', '10 hours'], ['So lange wie die Erwachsenen', 'As long as the adults']],
            richtig: 0,
            erklaerung: ['Für Jugendliche gelten 8 Stunden am Tag und 40 in der Woche (§ 8 JArbSchG). Sind andere Tage derselben Woche kürzer, dürfen es an einzelnen Tagen 8,5 Stunden sein.', 'Young people may work 8 hours a day and 40 a week (§ 8 JArbSchG). If other days in the same week are shorter, single days may go up to 8.5 hours.'],
            quelle: ['Sicherheit und Gesundheit bei der Arbeit', 'Safety and health at work']
        },
        {
            id: 'bsp-weg', typ: 'reihe',
            kurz: ['Vom Vertrag zur Prüfung', 'From contract to exam'],
            frage: ['Bring den Weg durch die Ausbildung in die richtige Reihenfolge.', 'Put the path through your training in the right order.'],
            teile: [
                ['Ausbildungsvertrag unterschreiben', 'Sign the training contract'],
                ['Eintrag ins Verzeichnis der Kammer', 'Entry in the chamber’s register'],
                ['Probezeit', 'Probation period'],
                ['Zwischenprüfung oder Teil 1', 'Intermediate exam or part 1'],
                ['Zulassung zur Abschlussprüfung', 'Admission to the final exam']
            ],
            erklaerung: ['Die Kammer trägt den Vertrag ins Verzeichnis ein, bevor es losgeht. Die Probezeit beginnt mit dem ersten Ausbildungstag. Zur Abschlussprüfung wirst du nur zugelassen, wenn Zwischenprüfung oder Teil 1 abgelegt und der Ausbildungsnachweis geführt ist.', 'The chamber registers the contract before training starts. Probation begins on the first day. You are only admitted to the final exam once the intermediate exam or part 1 is done and your training record is complete.'],
            quelle: ['Berufsbildung, Arbeits- und Tarifrecht', 'Vocational training, labour and collective agreement law']
        },
        {
            id: 'bsp-auskunft', typ: 'wahl',
            kurz: ['Auskunft nach DSGVO', 'GDPR access request'],
            frage: ['Ein Kunde will wissen, welche Daten ihr über ihn gespeichert habt. Was steht ihm zu?', 'A customer wants to know what data you hold about him. What is he entitled to?'],
            wahlen: [['Nichts, das sind Firmendaten', 'Nothing, that is company data'], ['Auskunft, und zwar kostenlos', 'Access to it, free of charge'], ['Nur ein Brief per Einschreiben', 'Only a registered letter'], ['Die sofortige Löschung von allem', 'Immediate deletion of everything']],
            richtig: 1,
            erklaerung: ['Das Auskunftsrecht steht in Art. 15 DSGVO. Die erste Kopie ist kostenlos, beantwortet werden muss innerhalb eines Monats. Löschung ist ein eigenes Recht (Art. 17) und gilt nicht für alles.', 'The right of access is in Art. 15 GDPR. The first copy is free and must be provided within one month. Erasure is a separate right (Art. 17) and does not cover everything.'],
            quelle: ['Digitalisierte Arbeitswelt', 'Digitalised working world']
        },
        {
            id: 'bsp-zeichen', typ: 'aufdecken',
            kurz: ['Sicherheitszeichen', 'Safety signs'],
            frage: ['Was bedeuten die vier Farben auf Sicherheitszeichen: grün, rot, blau und gelb?', 'What do the four colours on safety signs mean: green, red, blue and yellow?'],
            antwort: ['Grün heißt Rettung, also Fluchtweg oder Erste Hilfe. Rot steht für Brandschutz oder ein Verbot. Blau ist ein Gebot, etwa Schutzbrille tragen. Gelb warnt vor einer Gefahr.', 'Green means rescue, such as escape routes or first aid. Red is fire protection or a prohibition. Blue is a mandatory action, such as wearing safety glasses. Yellow warns of a hazard.'],
            erklaerung: ['Geregelt in der ASR A1.3. Die Form gehört dazu: Verbote sind rund mit Balken, Warnungen dreieckig.', 'Set out in ASR A1.3. The shape matters too: prohibitions are round with a bar, warnings are triangular.'],
            quelle: ['Sicherheit und Gesundheit bei der Arbeit', 'Safety and health at work']
        },
        {
            id: 'bsp-akku', typ: 'wahl',
            kurz: ['Alte Akkus', 'Old batteries'],
            frage: ['Wohin gehören alte Akkus aus dem Betrieb?', 'Where do old batteries from the workplace go?'],
            wahlen: [['In den Restmüll', 'General waste'], ['In den Gelben Sack', 'The recycling bag'], ['In eine Sammelstelle oder zurück zum Händler', 'A collection point or back to the retailer'], ['In den Papiermüll, wenn sie klein sind', 'Paper waste, if they are small']],
            richtig: 2,
            erklaerung: ['Batterien und Akkus dürfen nie in den Hausmüll. Händler müssen sie zurücknehmen (Batteriegesetz). Lithium-Akkus können im Müllwagen Brände auslösen.', 'Batteries must never go into household waste. Retailers have to take them back (Batteriegesetz). Lithium batteries can start fires in refuse trucks.'],
            quelle: ['Umweltschutz und Nachhaltigkeit', 'Environmental protection and sustainability']
        },
        {
            id: 'bsp-wegeunfall', typ: 'wahl',
            kurz: ['Unfall auf dem Arbeitsweg', 'Accident on the way to work'],
            frage: ['Du stürzt morgens auf dem direkten Weg zur Arbeit mit dem Rad. Wer ist zuständig?', 'You fall off your bike on the direct way to work. Who covers it?'],
            wahlen: [['Deine Krankenkasse wie bei jedem Unfall', 'Your health insurance, like any accident'], ['Niemand, du warst ja noch nicht da', 'Nobody, you were not there yet'], ['Die gesetzliche Unfallversicherung des Betriebs', 'The company’s statutory accident insurance'], ['Deine private Haftpflicht', 'Your private liability insurance']],
            richtig: 2,
            erklaerung: ['Das ist ein Wegeunfall und versichert wie ein Arbeitsunfall (§ 8 SGB VII), über die Berufsgenossenschaft. Sag dem Betrieb Bescheid und dem Arzt, dass es auf dem Arbeitsweg passiert ist.', 'That is a commuting accident and is covered like a workplace accident (§ 8 SGB VII), via the employer’s liability insurance. Tell your company and tell the doctor it happened on your way to work.'],
            quelle: ['Sicherheit und Gesundheit bei der Arbeit', 'Safety and health at work']
        }
    ];

    // ── Datum ─────────────────────────────────────────────────────────
    function isoTag(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function heute() { return isoTag(new Date()); }
    function inTagen(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoTag(d); }
    function tageZwischen(a, b) {
        var x = new Date(a + 'T00:00:00'), y = new Date(b + 'T00:00:00');
        return Math.round((y - x) / 864e5);
    }
    function datumText(iso) {
        var n = tageZwischen(heute(), iso);
        if (n <= 0) return L('heute', 'today');
        if (n === 1) return L('morgen', 'tomorrow');
        return new Date(iso + 'T00:00:00').toLocaleDateString(EN ? 'en-GB' : 'de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    // ── Speicher ──────────────────────────────────────────────────────
    function leer() { return { v: 1, karten: {}, zuletzt: '' }; }
    function lesen() {
        try {
            var v = JSON.parse(localStorage.getItem(KEY) || 'null');
            if (v && v.v === 1 && v.karten && typeof v.karten === 'object') return v;
        } catch (e) {}
        return leer();
    }
    function schreiben() {
        try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch (e) {}
    }
    var stand = lesen();

    function ev(name, props) { if (typeof mwlEvent === 'function') mwlEvent(name, props || {}); }

    function alle() {
        return Object.keys(stand.karten).map(function (k) { return stand.karten[k]; })
            .filter(function (k) { return !k.gesperrt; });
    }
    function faellige() {
        var h = heute();
        return alle().filter(function (k) { return k.faellig <= h; })
            .sort(function (a, b) { return a.fach - b.fach || (a.faellig < b.faellig ? -1 : 1); });
    }

    // ── Elemente ──────────────────────────────────────────────────────
    function $(id) { return document.getElementById(id); }
    var el = {};

    // ── Kasten + Startansicht ─────────────────────────────────────────
    function renderKasten() {
        var karten = alle(), h = heute();
        var zahl = [0, 0, 0, 0, 0, 0], dran = [false, false, false, false, false, false];
        karten.forEach(function (k) {
            var f = Math.max(0, Math.min(5, k.fach | 0));
            zahl[f]++;
            if (k.faellig <= h) dran[f] = true;
        });

        var faecher = '', wand = '';
        for (var f = 0; f < 6; f++) {
            var sichtbar = Math.min(zahl[f], 8), stapel = '';
            for (var i = 0; i < sichtbar; i++) stapel += '<span class="kk-fach-karte" style="--i:' + (sichtbar - 1 - i) + '"></span>';
            var cls = 'kk-fach' + (zahl[f] ? '' : ' is-leer') + (dran[f] && zahl[f] ? ' is-faellig' : '');
            faecher += '<div class="' + cls + '"><div class="kk-fach-stapel">' + stapel +
                '<span class="kk-fach-reiter" style="--hoehe:' + Math.max(0, sichtbar - 1) + '">' + FACH_NAME[f] + '</span></div></div>';
            wand += '<div class="kk-wand-zahl"><b>' + zahl[f] + '</b><small>' + FACH_TAKT[f] + '</small></div>';
        }
        el.kastenInnen.innerHTML = faecher;
        var w = document.createElement('div');
        w.className = 'kk-wand';
        w.setAttribute('aria-hidden', 'true');
        w.innerHTML = wand;
        var alt = el.kasten.querySelector('.kk-wand');
        if (alt) alt.remove();
        el.kastenInnen.insertAdjacentElement('afterend', w);

        var gesamt = karten.length;
        if (!gesamt) {
            el.kastenCap.textContent = L('Leer. Lade den Beispielstapel, um es auszuprobieren.', 'Empty. Load the sample deck to try it out.');
        } else {
            var hinten = zahl[3] + zahl[4] + zahl[5];
            el.kastenCap.textContent = gesamt + ' ' + (gesamt === 1 ? L('Karte', 'card') : L('Karten', 'cards')) + L(' im Kasten, ', ' in the box, ') +
                hinten + L(' davon sitzen schon gut (Fach 3 bis 5).', ' of them already stick well (box 3 to 5).');
        }
        el.kasten.setAttribute('aria-label', el.kastenCap.textContent);
    }

    function renderHeute() {
        var dran = faellige().length, runde = Math.min(dran, MAX_JE_RUNDE);
        el.heuteZahl.textContent = String(dran);
        el.heuteText.textContent = dran === 1 ? L('Karte ist heute dran', 'card is due today') : L('Karten sind heute dran', 'cards are due today');
        el.los.disabled = dran === 0;
        el.los.textContent = dran > MAX_JE_RUNDE
            ? L(runde + ' Karten abfragen', 'Quiz ' + runde + ' cards')
            : L('Abfrage starten', 'Start quiz');
        el.beispiel.hidden = BEISPIEL.every(function (b) { return stand.karten[b.id]; });

        var naechste = alle().map(function (k) { return k.faellig; }).filter(function (d) { return d > heute(); }).sort()[0];
        if (!dran && naechste) {
            el.nachsatz.textContent = L('Für heute ist alles abgefragt. Die nächsten Karten kommen ', 'Everything is done for today. The next cards are due ') + datumText(naechste) + '.';
            el.nachsatz.hidden = false;
        } else if (dran > MAX_JE_RUNDE) {
            el.nachsatz.textContent = L('Eine Runde hat höchstens ' + MAX_JE_RUNDE + ' Karten. Der Rest kommt in der nächsten.', 'A round has at most ' + MAX_JE_RUNDE + ' cards. The rest come in the next one.');
            el.nachsatz.hidden = false;
        } else {
            el.nachsatz.hidden = true;
        }
    }

    // Quelle 1: was im Berichtsheft auf DIESEM Geraet liegt. Gezaehlt wird nur —
    // gelesen wird der Text erst, wenn die KI-Anbindung steht.
    function renderHeftStand() {
        var berichte = [];
        try { var v = JSON.parse(localStorage.getItem('berichtsheft_reports') || '[]'); if (Array.isArray(v)) berichte = v; } catch (e) {}
        var schule = berichte.filter(function (r) {
            if (r && typeof r.school === 'string' && r.school.trim()) return true;
            var d = r && r.dailySchool;
            if (!d || typeof d !== 'object') return false;
            return Object.keys(d).some(function (k) { return d[k]; });
        }).length;
        if (!berichte.length) {
            el.q1Stand.textContent = L('Auf diesem Gerät liegt noch keine Woche.', 'No weeks on this device yet.');
            el.q1Stand.classList.remove('is-da');
        } else {
            el.q1Stand.textContent = berichte.length + ' ' + (berichte.length === 1 ? L('Woche eingetragen', 'week written') : L('Wochen eingetragen', 'weeks written')) +
                L(', davon ', ', ') + schule + L(' mit Berufsschule. Karten daraus baut die KI-Anbindung.', ' with vocational school. Cards from them come with the AI connection.');
            el.q1Stand.classList.add('is-da');
        }
    }

    function renderStart() {
        renderKasten();
        renderHeute();
    }

    // ── Ansichten ─────────────────────────────────────────────────────
    function zeigeAnsicht(name) {
        el.start.hidden = name !== 'start';
        el.abfrage.hidden = name !== 'abfrage';
        el.ergebnis.hidden = name !== 'ergebnis';
        window.scrollTo(0, 0);
    }

    var toastUhr = 0;
    function toast(text) {
        el.toast.textContent = text;
        el.toast.hidden = false;
        clearTimeout(toastUhr);
        toastUhr = setTimeout(function () { el.toast.hidden = true; }, 3600);
    }

    // ── Beispielstapel ────────────────────────────────────────────────
    function sprache(paar) { return Array.isArray(paar) ? (EN ? paar[1] : paar[0]) : paar; }
    function beispielLaden() {
        var neu = 0;
        BEISPIEL.forEach(function (b) {
            if (stand.karten[b.id]) return;
            var k = {
                id: b.id, typ: b.typ, kurz: sprache(b.kurz), frage: sprache(b.frage),
                erklaerung: sprache(b.erklaerung),
                quelle: { art: 'beispiel', text: sprache(b.quelle) },
                fach: 0, faellig: heute(), gesehen: 0, richtig: 0
            };
            if (b.typ === 'wahl') { k.wahlen = b.wahlen.map(sprache); k.richtig_index = b.richtig; }
            if (b.typ === 'aufdecken') k.antwort = sprache(b.antwort);
            if (b.typ === 'reihe') k.teile = b.teile.map(sprache);
            stand.karten[b.id] = k;
            neu++;
        });
        schreiben();
        renderStart();
        ev('karteikasten_beispiel', { karten: neu });
        toast(neu + L(' Karten liegen jetzt im Fach Neu.', ' cards are now in the New box.'));
    }

    // ── Abfrage ───────────────────────────────────────────────────────
    var runde = [], pos = 0, ergebnis = [], reiheAuswahl = [];

    function mischen(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function starten() {
        runde = faellige().slice(0, MAX_JE_RUNDE);
        if (!runde.length) return;
        pos = 0;
        ergebnis = [];
        el.toast.hidden = true;
        zeigeAnsicht('abfrage');
        ev('karteikasten_start', { karten: runde.length });
        zeigeKarte();
    }

    function knopf(text, cls, fn) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'kk-knopf' + (cls ? ' ' + cls : '');
        b.textContent = text;
        b.addEventListener('click', fn);
        return b;
    }

    function zeigeKarte() {
        var k = runde[pos];
        el.karte.classList.remove('is-umgedreht');
        el.karteHinten.setAttribute('aria-hidden', 'true');
        el.aufloesung.hidden = true;
        el.melden.hidden = true;
        el.aktionen.innerHTML = '';
        el.karteArbeit.innerHTML = '';
        el.karteFach.textContent = k.fach ? L('Fach ', 'Box ') + k.fach : L('Neu', 'New');
        el.karteFrage.textContent = k.frage;
        el.fortText.textContent = L((pos + 1) + ' von ' + runde.length, (pos + 1) + ' of ' + runde.length);
        el.fortBalken.style.width = (pos / runde.length * 100) + '%';

        if (k.typ === 'wahl') baueWahl(k);
        else if (k.typ === 'reihe') baueReihe(k);
        else baueAufdecken(k);
        el.karteFrage.setAttribute('tabindex', '-1');
        el.karteFrage.focus({ preventScroll: true });
    }

    function baueWahl(k) {
        var ul = document.createElement('ul');
        ul.className = 'kk-wahlen';
        var reihenfolge = mischen(k.wahlen.map(function (_, i) { return i; }));
        reihenfolge.forEach(function (idx, n) {
            var li = document.createElement('li');
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'kk-wahl';
            b.dataset.idx = idx;
            b.innerHTML = '<span class="kk-wahl-buchstabe" aria-hidden="true">' + 'ABCD'.charAt(n) + '</span><span class="kk-wahl-text">' + esc(k.wahlen[idx]) + '</span>';
            b.addEventListener('click', function () {
                var richtig = idx === k.richtig_index;
                ul.querySelectorAll('.kk-wahl').forEach(function (w) {
                    w.disabled = true;
                    var i = +w.dataset.idx;
                    if (i === k.richtig_index) { w.classList.add('is-richtig'); w.insertAdjacentHTML('beforeend', HAKEN); }
                    else if (w === b) { w.classList.add('is-falsch'); w.insertAdjacentHTML('beforeend', KREUZ); }
                    else w.classList.add('is-andere');
                });
                bewerten(k, richtig);
            });
            li.appendChild(b);
            ul.appendChild(li);
        });
        el.karteArbeit.appendChild(ul);
    }

    function baueAufdecken(k) {
        el.karteAntwort.textContent = k.antwort;
        el.karteFrageHinten.textContent = k.frage;
        el.aktionen.appendChild(knopf(L('Antwort zeigen', 'Show answer'), 'is-haupt', function () {
            el.karte.classList.add('is-umgedreht');
            el.karteHinten.removeAttribute('aria-hidden');
            el.aktionen.innerHTML = '';
            var ja = knopf(L('Wusste ich', 'I knew it'), 'is-haupt', function () { bewerten(k, true); });
            el.aktionen.appendChild(ja);
            el.aktionen.appendChild(knopf(L('Wusste ich nicht', 'I didn’t know'), '', function () { bewerten(k, false); }));
            ja.focus({ preventScroll: true });
        }));
    }

    function baueReihe(k) {
        reiheAuswahl = [];
        var ziel = document.createElement('ol');
        ziel.className = 'kk-reihe-ziel';
        var teile = document.createElement('div');
        teile.className = 'kk-teile';
        var reset = document.createElement('button');
        reset.type = 'button';
        reset.className = 'kk-textknopf';
        reset.textContent = L('Neu anfangen', 'Start over');

        function malen() {
            ziel.innerHTML = '';
            for (var i = 0; i < k.teile.length; i++) {
                var li = document.createElement('li');
                if (i < reiheAuswahl.length) li.textContent = k.teile[reiheAuswahl[i]];
                else { li.textContent = L('antippen, was als Nächstes kommt', 'tap what comes next'); li.className = 'is-leer'; }
                if (i > reiheAuswahl.length) li.textContent = '';
                ziel.appendChild(li);
            }
            teile.innerHTML = '';
            mischReihe.forEach(function (idx) {
                if (reiheAuswahl.indexOf(idx) !== -1) return;
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'kk-teil';
                b.textContent = k.teile[idx];
                b.addEventListener('click', function () {
                    reiheAuswahl.push(idx);
                    malen();
                    var naechster = teile.querySelector('.kk-teil');
                    if (naechster) naechster.focus({ preventScroll: true });
                    else pruefKnopf.focus({ preventScroll: true });
                });
                teile.appendChild(b);
            });
            reset.hidden = !reiheAuswahl.length;
            pruefKnopf.disabled = reiheAuswahl.length !== k.teile.length;
        }
        var mischReihe = mischen(k.teile.map(function (_, i) { return i; }));
        // Nie die Loesung als Startreihenfolge anbieten
        if (mischReihe.every(function (v, i) { return v === i; })) mischReihe.reverse();

        var pruefKnopf = knopf(L('Prüfen', 'Check'), 'is-haupt', function () {
            var richtig = reiheAuswahl.every(function (v, i) { return v === i; });
            ziel.querySelectorAll('li').forEach(function (li, i) {
                if (reiheAuswahl[i] !== i) {
                    li.classList.add('is-falsch');
                    li.insertAdjacentHTML('beforeend', '<span class="kk-soll">' + L('gehört auf ', 'belongs at ') + (reiheAuswahl[i] + 1) + '</span>');
                }
            });
            teile.remove();
            reset.remove();
            bewerten(k, richtig);
        });
        reset.addEventListener('click', function () { reiheAuswahl = []; malen(); });

        el.karteArbeit.appendChild(ziel);
        el.karteArbeit.appendChild(teile);
        el.karteArbeit.appendChild(reset);
        el.aktionen.appendChild(pruefKnopf);
        malen();
    }

    function bewerten(k, richtig) {
        var vorher = k.fach;
        k.fach = richtig ? Math.min(5, k.fach + 1) : 1;
        k.faellig = inTagen(ABSTAND[k.fach]);
        k.gesehen = (k.gesehen || 0) + 1;
        // Tag der letzten ABFRAGE, nicht des letzten Aufrufs — sonst zaehlt blosses
        // Reinschauen als Wiederkehr.
        stand.zuletzt = heute();
        if (richtig) k.richtig = (k.richtig || 0) + 1;
        stand.karten[k.id] = k;
        schreiben();
        ergebnis.push({ kurz: k.kurz, richtig: richtig, fach: k.fach, faellig: k.faellig });
        ev('karteikasten_antwort', { typ: k.typ, richtig: richtig, fach_vorher: vorher, quelle: k.quelle && k.quelle.art });

        el.urteil.textContent = richtig ? L('Richtig.', 'Correct.') : L('Nicht ganz.', 'Not quite.');
        el.urteil.classList.toggle('is-gut', richtig);
        el.erklaerung.textContent = k.erklaerung || '';
        el.herkunft.textContent = herkunftText(k) + ' · ' + (richtig
            ? L('Kommt ' + datumText(k.faellig) + ' wieder, dann aus Fach ' + k.fach + '.', 'Back ' + datumText(k.faellig) + ', then from box ' + k.fach + '.')
            : L('Zurück in Fach 1, kommt morgen wieder.', 'Back to box 1, due again tomorrow.'));
        el.aufloesung.hidden = false;
        el.melden.hidden = false;
        el.melden.disabled = false;
        el.aktionen.innerHTML = '';
        var letzte = pos === runde.length - 1;
        var weiter = knopf(letzte ? L('Ergebnis ansehen', 'See result') : L('Nächste Karte', 'Next card'), 'is-haupt', function () {
            pos++;
            if (pos < runde.length) zeigeKarte(); else ende();
        });
        el.aktionen.appendChild(weiter);
        el.fortBalken.style.width = ((pos + 1) / runde.length * 100) + '%';
        weiter.focus({ preventScroll: true });
    }

    function herkunftText(k) {
        var q = k.quelle || {};
        if (q.art === 'heft') return L('Aus deinem Berichtsheft: ', 'From your Berichtsheft: ') + q.text;
        if (q.art === 'rahmenplan') return L('Lernziel ohne Eintrag: ', 'Learning goal without entry: ') + q.text;
        if (q.art === 'stoff') return L('Aus deinem Stoff: ', 'From your material: ') + q.text;
        return L('Beispielstapel, Rahmenplan: ', 'Sample deck, training framework: ') + q.text;
    }

    function melden() {
        var k = runde[pos];
        if (!k) return;
        k.gesperrt = true;
        stand.karten[k.id] = k;
        schreiben();
        el.melden.disabled = true;
        ev('karteikasten_stimmt_nicht', { typ: k.typ, quelle: k.quelle && k.quelle.art });
        toast(L('Danke. Die Karte kommt nicht mehr dran.', 'Thanks. This card won’t come up again.'));
    }

    function ende() {
        var gut = ergebnis.filter(function (e) { return e.richtig; }).length, n = ergebnis.length;
        var falsch = n - gut;
        el.ergebnisT.textContent = L(gut + ' von ' + n + ' gewusst.', gut + ' of ' + n + ' known.');
        el.ergebnisP.textContent = !gut
            ? L('Alle kommen morgen wieder. Das ist kein schlechtes Zeichen: genau dafür ist Fach 1 da.', 'All of them are due again tomorrow. That is what box 1 is for.')
            : falsch
            ? L(falsch + (falsch === 1 ? ' Karte kommt' : ' Karten kommen') + ' morgen wieder. Die anderen wandern weiter nach hinten.',
                falsch + (falsch === 1 ? ' card is' : ' cards are') + ' due again tomorrow. The others move further back.')
            : L('Alle wandern ein Fach weiter nach hinten.', 'All of them move one box further back.');
        el.ergebnisListe.innerHTML = ergebnis.map(function (e) {
            var rechts = e.richtig
                ? L('Fach ' + e.fach + ', ' + datumText(e.faellig), 'Box ' + e.fach + ', ' + datumText(e.faellig))
                : L('morgen wieder', 'again tomorrow');
            return '<li class="' + (e.richtig ? '' : 'is-falsch') + '"><span>' + esc(e.kurz) + '</span><span>' + esc(rechts) + '</span></li>';
        }).join('');
        ev('karteikasten_fertig', { gesamt: n, richtig: gut });
        zeigeAnsicht('ergebnis');
        el.ergebnisT.setAttribute('tabindex', '-1');
        el.ergebnisT.focus({ preventScroll: true });
    }

    function zurueck() {
        zeigeAnsicht('start');
        renderStart();
    }

    // ── Eigener Stoff (Vorschau: nichts wird verschickt) ──────────────
    function stoffLos() {
        var t = el.stoff.value.trim();
        el.stoffMeldung.hidden = false;
        if (t.length < 80) {
            el.stoffMeldung.textContent = L('Füg etwas mehr ein, mindestens ein paar Sätze. Aus einem Stichwort lassen sich keine guten Karten bauen.',
                'Add a bit more, at least a few sentences. A single keyword doesn’t make good cards.');
            return;
        }
        el.stoffMeldung.textContent = L('In der Vorschau baut noch keine KI Karten. Dein Text bleibt hier stehen und wird nirgends hingeschickt.',
            'In this preview no AI builds cards yet. Your text stays here and is not sent anywhere.');
        ev('karteikasten_stoff_versuch', { laenge: t.length > 2000 ? 'lang' : t.length > 500 ? 'mittel' : 'kurz' });
    }

    // Zweistufig statt confirm(): ein Browser-Dialog blockiert die Seite.
    var leerenScharf = 0;
    function leeren() {
        if (!leerenScharf) {
            el.leeren.textContent = L('Wirklich alles löschen? Nochmal tippen.', 'Really delete everything? Tap again.');
            leerenScharf = setTimeout(function () {
                leerenScharf = 0;
                el.leeren.textContent = L('Kasten auf diesem Gerät leeren', 'Empty the box on this device');
            }, 4000);
            return;
        }
        clearTimeout(leerenScharf);
        leerenScharf = 0;
        stand = leer();
        schreiben();
        el.leeren.textContent = L('Kasten auf diesem Gerät leeren', 'Empty the box on this device');
        renderStart();
        toast(L('Der Kasten ist leer.', 'The box is empty.'));
    }

    // ── Start ─────────────────────────────────────────────────────────
    function init() {
        [['start', 'kkStart'], ['abfrage', 'kkAbfrage'], ['ergebnis', 'kkErgebnis'],
         ['kasten', 'kkKasten'], ['kastenInnen', 'kkKastenInnen'], ['kastenCap', 'kkKastenCap'],
         ['heuteZahl', 'kkHeuteZahl'], ['heuteText', 'kkHeuteText'], ['los', 'kkLos'], ['beispiel', 'kkBeispiel'],
         ['nachsatz', 'kkNachsatz'], ['q1Stand', 'kkQ1Stand'], ['stoff', 'kkStoff'], ['stoffLos', 'kkStoffLos'],
         ['stoffMeldung', 'kkStoffMeldung'], ['leeren', 'kkLeeren'], ['abbrechen', 'kkAbbrechen'],
         ['fortText', 'kkFortschrittText'], ['fortBalken', 'kkFortschrittBalken'], ['karte', 'kkKarte'],
         ['karteFach', 'kkKarteFach'], ['karteFrage', 'kkKarteFrage'], ['karteArbeit', 'kkKarteArbeit'],
         ['karteHinten', 'kkKarteHinten'], ['karteFrageHinten', 'kkKarteFrageHinten'],['karteAntwort', 'kkKarteAntwort'], ['aufloesung', 'kkAufloesung'],
         ['urteil', 'kkUrteil'], ['erklaerung', 'kkErklaerung'], ['herkunft', 'kkHerkunft'],
         ['aktionen', 'kkAktionen'], ['melden', 'kkMelden'], ['ergebnisT', 'kkErgebnisT'],
         ['ergebnisP', 'kkErgebnisP'], ['ergebnisListe', 'kkErgebnisListe'], ['zurueckKnopf', 'kkZurueck'],
         ['toast', 'kkToast']].forEach(function (p) { el[p[0]] = $(p[1]); });
        if (!el.start) return;

        el.los.addEventListener('click', starten);
        el.beispiel.addEventListener('click', beispielLaden);
        el.stoffLos.addEventListener('click', stoffLos);
        el.leeren.addEventListener('click', leeren);
        el.abbrechen.addEventListener('click', zurueck);
        el.zurueckKnopf.addEventListener('click', zurueck);
        el.melden.addEventListener('click', melden);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !el.abfrage.hidden) zurueck();
        });

        renderHeftStand();
        renderStart();

        // Die eigentliche Messfrage des Plans: kommt jemand an einem SPAETEREN Tag
        // als seiner letzten Abfrage wieder? Nur Zahlen.
        var h = heute(), dran = faellige().length;
        if (stand.zuletzt && stand.zuletzt !== h && stand.gemeldet !== h) {
            ev('karteikasten_wiederkehr', { tage_seit: tageZwischen(stand.zuletzt, h), faellig: dran });
            stand.gemeldet = h;
            schreiben();
        }
        ev('karteikasten_geoeffnet', { karten: alle().length, faellig: dran });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
