// ═══ ARBEITSZEITRECHNER MODULE ═══
// Rechner auf /arbeitszeitrechner/. Pausenregel wie die App (mobile-nav-extras.js):
// mehr als 6 h Anwesenheit → 30 min, mehr als 9 h → 45 min (§ 4 ArbZG). Unter 18
// gilt § 11 JArbSchG: mehr als 4,5 h → 30 min, mehr als 6 h → 60 min.
// Gerechnet wird auf der Anwesenheit, genau wie die Warnung in der App — eine
// "Henne-Ei"-Rechnung (Pause senkt die Arbeitszeit unter 6 h) macht hier niemand.
// Speicher nur als Bequemlichkeit (localStorage, jeder Zugriff in try/catch).
// Überstunden-Auszahlung bewusst nur BRUTTO: eine Netto-Rechnung bräuchte Steuerklasse,
// Kirchensteuer, Sozialabgaben — ohne die wäre jede Zahl geraten.

(function () {
    'use strict';
    var EN = document.documentElement.lang === 'en';
    var SPEICHER = 'mwl_arbeitszeitrechner';
    var MAX_TAGE = 7;
    var T = EN ? {
        tag: function (n) { return 'Day ' + n; },
        weg: 'Remove day', auto: 'auto', std: 'hrs',
        pauseHinweis: function (m) { return 'legal minimum ' + m + ' min'; },
        ueber: 'Overtime', minus: 'Short', genau: 'Exactly on target',
        brutto: 'gross', nacht: 'across midnight'
    } : {
        tag: function (n) { return 'Tag ' + n; },
        weg: 'Tag entfernen', auto: 'auto', std: 'Std.',
        pauseHinweis: function (m) { return 'gesetzlich mind. ' + m + ' min'; },
        ueber: 'Überstunden', minus: 'Minusstunden', genau: 'Genau im Soll',
        brutto: 'brutto', nacht: 'über Mitternacht'
    };

    var $ = function (id) { return document.getElementById(id); };
    var liste = $('azrTage');
    if (!liste) return;

    function minuten(s) {
        var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
        if (!m) return null;
        var h = +m[1], mi = +m[2];
        if (h > 23 || mi > 59) return null;
        return h * 60 + mi;
    }
    function hm(min) {
        var neg = min < 0; min = Math.abs(Math.round(min));
        return (neg ? '−' : '') + Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');
    }
    function dezimal(min) {
        var z = (min / 60).toFixed(2);
        return EN ? z : z.replace('.', ',');
    }
    function zahl(s) {
        var n = parseFloat(String(s || '').replace(',', '.'));
        return isFinite(n) ? n : null;
    }
    function geld(n) {
        return n.toLocaleString(EN ? 'en-GB' : 'de-DE', { style: 'currency', currency: 'EUR' });
    }

    function pflichtPause(anwesend, jung) {
        if (jung) return anwesend > 360 ? 60 : anwesend > 270 ? 30 : 0;
        return anwesend > 540 ? 45 : anwesend > 360 ? 30 : 0;
    }

    function zeileBauen(werte, i) {
        var li = document.createElement('li');
        li.className = 'azr-tag';
        li.innerHTML =
            '<span class="azr-tag-name"></span>' +
            '<label class="azr-f"><span class="azr-f-l">' + (EN ? 'Start' : 'Beginn') + '</span><input type="time" class="azr-von glass-input" step="60"></label>' +
            '<label class="azr-f"><span class="azr-f-l">' + (EN ? 'End' : 'Ende') + '</span><input type="time" class="azr-bis glass-input" step="60"></label>' +
            '<label class="azr-f azr-f-pause"><span class="azr-f-l">' + (EN ? 'Break (min)' : 'Pause (min)') + '</span><input type="number" class="azr-pause glass-input" min="0" max="600" step="5" inputmode="numeric"></label>' +
            '<output class="azr-erg" aria-live="polite"></output>' +
            '<button type="button" class="azr-weg" aria-label="' + T.weg + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
            '<div class="azr-band" aria-hidden="true"><i class="azr-band-zeit"></i><i class="azr-band-zeit2"></i></div>' +
            '<p class="azr-tag-hinweis"></p>';
        li.querySelector('.azr-von').value = werte.von || '';
        li.querySelector('.azr-bis').value = werte.bis || '';
        li.querySelector('.azr-pause').value = werte.pause == null ? '' : werte.pause;
        li.querySelector('.azr-weg').addEventListener('click', function () {
            li.remove(); rechnen(); speichern();
        });
        return li;
    }

    function zeilen() { return Array.prototype.slice.call(liste.children); }

    function rechnen() {
        var jung = $('azrJung').checked;
        var summe = 0, tage = 0;
        zeilen().forEach(function (li, i) {
            li.querySelector('.azr-tag-name').textContent = T.tag(i + 1);
            li.querySelector('.azr-weg').hidden = zeilen().length === 1;
            var von = minuten(li.querySelector('.azr-von').value);
            var bis = minuten(li.querySelector('.azr-bis').value);
            var pIn = li.querySelector('.azr-pause');
            var erg = li.querySelector('.azr-erg');
            var hin = li.querySelector('.azr-tag-hinweis');
            var b1 = li.querySelector('.azr-band-zeit'), b2 = li.querySelector('.azr-band-zeit2');
            if (von == null || bis == null) {
                erg.textContent = '–'; hin.textContent = ''; b1.style.width = '0'; b2.style.width = '0';
                pIn.placeholder = T.auto;
                return;
            }
            var anwesend = bis - von;
            var nacht = anwesend <= 0;
            if (nacht) anwesend += 1440;
            var pflicht = pflichtPause(anwesend, jung);
            pIn.placeholder = T.auto + ' ' + pflicht;
            var eigene = zahl(pIn.value);
            var pause = eigene == null ? pflicht : Math.max(0, Math.min(eigene, anwesend));
            var netto = anwesend - pause;
            summe += netto; tage++;
            erg.innerHTML = '<b>' + hm(netto) + '</b> <span>' + dezimal(netto) + ' ' + T.std + '</span>';
            var teile = [];
            if (nacht) teile.push(T.nacht);
            if (eigene != null && eigene < pflicht) teile.push(T.pauseHinweis(pflicht));
            hin.textContent = teile.join(' · ');
            li.classList.toggle('is-warn', eigene != null && eigene < pflicht);
            // Tagesband: 24-h-Skala, Schicht über Mitternacht in zwei Stücke geteilt
            var ende = von + anwesend;
            b1.style.left = (von / 14.4) + '%';
            b1.style.width = (Math.min(ende, 1440) - von) / 14.4 + '%';
            b2.style.left = '0';
            b2.style.width = ende > 1440 ? (ende - 1440) / 14.4 + '%' : '0';
        });

        $('azrSumme').textContent = hm(summe);
        $('azrSummeDez').textContent = dezimal(summe) + ' ' + T.std;
        $('azrTageZahl').textContent = tage;
        $('azrTageL').textContent = EN ? (tage === 1 ? 'day' : 'days') : (tage === 1 ? 'Tag' : 'Tage');

        var soll = zahl($('azrSoll').value);
        var saldoBox = $('azrSaldo');
        var lohnBox = $('azrLohnErg');
        if (soll == null || soll <= 0 || !tage) {
            saldoBox.hidden = true; lohnBox.hidden = true;
        } else {
            var diff = summe - soll * 60;
            saldoBox.hidden = false;
            $('azrSaldoL').textContent = diff > 0 ? T.ueber : diff < 0 ? T.minus : T.genau;
            $('azrSaldoW').textContent = diff === 0 ? '0:00' : (diff > 0 ? '+' : '') + hm(diff);
            saldoBox.classList.toggle('is-plus', diff > 0);
            saldoBox.classList.toggle('is-minus', diff < 0);
            var lohn = zahl($('azrLohn').value);
            var zuschlag = zahl($('azrZuschlag').value) || 0;
            if (lohn != null && lohn > 0 && diff > 0) {
                lohnBox.hidden = false;
                $('azrLohnW').textContent = geld(diff / 60 * lohn * (1 + zuschlag / 100)) + ' ' + T.brutto;
            } else {
                lohnBox.hidden = true;
            }
        }
        $('azrPlus').disabled = zeilen().length >= MAX_TAGE;
    }

    function speichern() {
        try {
            localStorage.setItem(SPEICHER, JSON.stringify({
                tage: zeilen().map(function (li) {
                    var p = li.querySelector('.azr-pause').value;
                    return { von: li.querySelector('.azr-von').value, bis: li.querySelector('.azr-bis').value, pause: p === '' ? null : p };
                }),
                soll: $('azrSoll').value, lohn: $('azrLohn').value, zuschlag: $('azrZuschlag').value,
                jung: $('azrJung').checked
            }));
        } catch (e) {}
    }

    var stand = null;
    try { stand = JSON.parse(localStorage.getItem(SPEICHER) || 'null'); } catch (e) {}
    var tage = stand && Array.isArray(stand.tage) && stand.tage.length ? stand.tage.slice(0, MAX_TAGE) : [{ von: '08:00', bis: '16:30', pause: null }];
    tage.forEach(function (w, i) { liste.appendChild(zeileBauen(w, i)); });
    if (stand) {
        $('azrSoll').value = stand.soll || '';
        $('azrLohn').value = stand.lohn || '';
        $('azrZuschlag').value = stand.zuschlag || '';
        $('azrJung').checked = !!stand.jung;
    }

    // Die Dezimal-Tabelle steht deutsch im Markup (Zahlen extrahiert die i18n-Pipeline nicht)
    if (EN) Array.prototype.forEach.call(document.querySelectorAll('#azrDezTab td'), function (td) {
        td.textContent = td.textContent.replace(',', '.');
    });

    var genutzt = false;
    document.getElementById('azrRechner').addEventListener('input', function () {
        rechnen(); speichern();
        if (!genutzt) {
            genutzt = true;
            if (typeof mwlEvent === 'function') mwlEvent('arbeitszeitrechner', { aktion: 'genutzt' });
        }
    });
    $('azrPlus').addEventListener('click', function () {
        var letzte = zeilen().slice(-1)[0];
        var w = letzte ? {
            von: letzte.querySelector('.azr-von').value,
            bis: letzte.querySelector('.azr-bis').value,
            pause: letzte.querySelector('.azr-pause').value || null
        } : {};
        var li = zeileBauen(w, zeilen().length);
        liste.appendChild(li);
        rechnen(); speichern();
        li.querySelector('.azr-von').focus();
        if (typeof mwlEvent === 'function') mwlEvent('arbeitszeitrechner', { aktion: 'tag_dazu', tage: zeilen().length });
    });
    var weiter = $('azrWeiter');
    if (weiter) weiter.addEventListener('click', function () {
        // Erste Zeile an die App uebergeben; dashboard.js fuellt damit das Eintragsfenster
        var erste = zeilen()[0];
        if (erste) try {
            localStorage.setItem('mwl_azr_uebergabe', JSON.stringify({
                von: erste.querySelector('.azr-von').value,
                bis: erste.querySelector('.azr-bis').value,
                pause: erste.querySelector('.azr-pause').value,
                t: Date.now()
            }));
        } catch (e) {}
        if (typeof mwlEvent === 'function') mwlEvent('arbeitszeitrechner', { aktion: 'zur_app' }, { transport: 'sendBeacon' });
    });
    rechnen();
})();

// ═══ STUNDENZETTEL-VORLAGE (PDF) ═══
// Leerer Monats-Stundenzettel zum Ausdrucken (Keyword-Planer: "stundenzettel vorlage
// kostenlos", "zum ausdrucken", je ~500/Monat). jsPDF erst beim Klick (~360 KB).
// 🔴 jsPDF-Standardschrift kann nur WinAnsi: keine Zeichen ueber U+00FF in die Texte
// (kein "→", kein "✓"); Umlaute und "–" gehen.
(function () {
    'use strict';
    var EN = document.documentElement.lang === 'en';
    var JSPDF_URL = '/Assets/js/vendor/jspdf-2.5.1.umd.min.js?v=98ccf17aa1';
    var knopf = document.getElementById('szLaden');
    if (!knopf) return;
    var monat = document.getElementById('szMonat');
    var heute = new Date();
    if (!monat.value) monat.value = heute.getFullYear() + '-' + String(heute.getMonth() + 1).padStart(2, '0');

    function laden() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
        return new Promise(function (ok, fehler) {
            var s = document.createElement('script');
            s.src = JSPDF_URL;
            s.onload = function () { window.jspdf ? ok() : fehler(new Error('jspdf')); };
            s.onerror = fehler;
            document.head.appendChild(s);
        });
    }

    var TAGE = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    var MONATE = EN
        ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        : ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    var K = EN ? {
        titel: 'Timesheet', name: 'Name', firma: 'Company', datum: 'Date', tag: 'Day', von: 'Start', bis: 'End',
        pause: 'Break', std: 'Hours', bem: 'Notes', summe: 'Total hours', soll: 'Target', saldo: 'Overtime / short',
        u1: 'Date, signature employee', u2: 'Date, signature supervisor', fuss: 'Template: myworklog.de/arbeitszeitrechner'
    } : {
        titel: 'Stundenzettel', name: 'Name', firma: 'Firma', datum: 'Datum', tag: 'Tag', von: 'Beginn', bis: 'Ende',
        pause: 'Pause', std: 'Stunden', bem: 'Bemerkung', summe: 'Summe Stunden', soll: 'Soll', saldo: 'Über-/Minusstunden',
        u1: 'Datum, Unterschrift Mitarbeiter/in', u2: 'Datum, Unterschrift Vorgesetzte/r', fuss: 'Vorlage: myworklog.de/arbeitszeitrechner'
    };

    function pdf() {
        var teile = (monat.value || '').split('-');
        var j = +teile[0], m = +teile[1] - 1;
        if (!j || m < 0) return;
        var name = (document.getElementById('szName').value || '').trim();
        var firma = (document.getElementById('szFirma').value || '').trim();
        var d = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
        var L = 14, R = 196, B = R - L;
        d.setFont('helvetica', 'bold'); d.setFontSize(18);
        d.text(K.titel + ' ' + MONATE[m] + ' ' + j, L, 20);
        d.setFont('helvetica', 'normal'); d.setFontSize(10);
        d.text(K.name + ':', L, 30); d.text(K.firma + ':', 110, 30);
        d.setDrawColor(150); d.line(L + 13, 31, 104, 31); d.line(124, 31, R, 31);
        if (name) d.text(name, L + 14, 30);
        if (firma) d.text(firma, 125, 30);

        // Spalten: Datum, Tag, Beginn, Ende, Pause, Stunden, Bemerkung
        var sp = [L, L + 24, L + 36, L + 56, L + 76, L + 94, L + 114, R];
        var kopf = [K.datum, K.tag, K.von, K.bis, K.pause, K.std, K.bem];
        var tage = new Date(j, m + 1, 0).getDate();
        var y = 38, zh = Math.min(7, (262 - y - 8) / (tage + 1));
        d.setFillColor(235, 235, 240); d.rect(L, y, B, zh, 'F');
        d.setFont('helvetica', 'bold'); d.setFontSize(9);
        kopf.forEach(function (t, i) { d.text(t, sp[i] + 1.5, y + zh - 2.2); });
        d.setFont('helvetica', 'normal');
        for (var t = 1; t <= tage; t++) {
            var dt = new Date(j, m, t), wt = dt.getDay();
            var yy = y + zh * t;
            if (wt === 0 || wt === 6) { d.setFillColor(246, 246, 248); d.rect(L, yy, B, zh, 'F'); }
            var datum = EN ? (String(t).padStart(2, '0') + '/' + String(m + 1).padStart(2, '0') + '/' + j)
                           : (String(t).padStart(2, '0') + '.' + String(m + 1).padStart(2, '0') + '.' + j);
            d.text(datum, sp[0] + 1.5, yy + zh - 2.2);
            d.text(TAGE[wt], sp[1] + 1.5, yy + zh - 2.2);
        }
        var ende = y + zh * (tage + 1);
        d.setDrawColor(170); d.setLineWidth(0.2);
        for (var r = 0; r <= tage + 1; r++) d.line(L, y + zh * r, R, y + zh * r);
        sp.forEach(function (x) { d.line(x, y, x, ende); });

        // Summenblock
        var sy = ende + 6;
        d.setFont('helvetica', 'bold');
        [K.summe, K.soll, K.saldo].forEach(function (t, i) {
            d.text(t + ':', L, sy + i * 7);
            d.line(L + 42, sy + i * 7 + 1, L + 80, sy + i * 7 + 1);
        });
        d.setFont('helvetica', 'normal'); d.setFontSize(8);
        var uy = 283;
        d.line(L, uy - 5, L + 80, uy - 5); d.line(R - 80, uy - 5, R, uy - 5);
        d.text(K.u1, L, uy - 1); d.text(K.u2, R - 80, uy - 1);
        d.setTextColor(150); d.text(K.fuss, R, 292, { align: 'right' });
        d.save((EN ? 'timesheet-' : 'stundenzettel-') + j + '-' + String(m + 1).padStart(2, '0') + '.pdf');
    }

    knopf.addEventListener('click', function () {
        var status = document.getElementById('szStatus');
        knopf.disabled = true;
        status.textContent = EN ? 'Creating PDF …' : 'PDF wird erstellt …';
        laden().then(function () {
            pdf();
            status.textContent = '';
            if (typeof mwlEvent === 'function') mwlEvent('arbeitszeitrechner', { aktion: 'stundenzettel' });
        }).catch(function () {
            status.textContent = EN ? 'The PDF could not be created. Please reload the page and try again.' : 'Das PDF ließ sich nicht erstellen. Lade die Seite neu und versuch es noch einmal.';
        }).then(function () { knopf.disabled = false; });
    });
})();
