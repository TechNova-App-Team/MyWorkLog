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
            '<label class="azr-f"><span class="azr-f-l">' + (EN ? 'Start' : 'Beginn') + '</span><input type="time" class="azr-von" step="60"></label>' +
            '<label class="azr-f"><span class="azr-f-l">' + (EN ? 'End' : 'Ende') + '</span><input type="time" class="azr-bis" step="60"></label>' +
            '<label class="azr-f azr-f-pause"><span class="azr-f-l">' + (EN ? 'Break (min)' : 'Pause (min)') + '</span><input type="number" class="azr-pause" min="0" max="600" step="5" inputmode="numeric"></label>' +
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
        if (typeof mwlEvent === 'function') mwlEvent('arbeitszeitrechner', { aktion: 'zur_app' }, { transport: 'sendBeacon' });
    });
    rechnen();
})();
