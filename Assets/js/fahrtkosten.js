/**
 * Fahrtkosten — MyWorkLog
 * Routing (OSRM), Adresssuche (Nominatim), Verkehrsmittelwahl, ÖPNV-Links,
 * Spritkosten, CO₂-Vergleich, Pendlerpauschale.
 * Vanilla JS · LocalStorage · keine API-Keys.
 *
 * 🔴 Ausgabe-Regeln dieser Datei (beim Erweitern einhalten):
 * - Keine Emojis. Icons kommen aus ICON, alle Lucide-Originalpfade.
 * - Jede Kennzahl steht genau EINMAL auf der Seite. Wer eine Zahl an einer
 *   zweiten Stelle braucht, baut kein zweites Feld, sondern verschiebt sie.
 * - Zahlen laufen durch nf()/eur()/km(): das Format haengt an
 *   document.documentElement.lang, sonst steht "0,09" auf der /en/-Seite.
 * - Das Markup der Verbindungs-Liste steht NUR hier, nicht zusaetzlich im
 *   HTML. Zwei Fassungen driften auseinander, und beim ersten Routing
 *   ueberschreibt diese die andere.
 *
 * 🔴 Eigene Strecke (Wegpunkte): Der Nutzer zieht die Linie auf seinen Weg.
 * Was dabei entsteht, sind ZWISCHENPUNKTE fuer OSRM — keine freihaendig
 * gemalte Linie. Der Unterschied ist der ganze Punkt: eine Kette aus
 * Klickpunkten waere eine Summe von Luftlinien und wuerde die Strecke
 * unterschaetzen, waehrend sie wie ein gemessener Wert aussieht. Ueber
 * Wegpunkte bleibt die Zahl eine Strassenverbindung — nur eben die eigene
 * statt der kuerzesten.
 *
 * 🔴 Und daraus folgt eine Pflicht: § 9 Abs. 1 Satz 3 Nr. 4 EStG will die
 * KUERZESTE Strassenverbindung. Eine laengere zaehlt nur, wenn sie
 * offensichtlich verkehrsguenstiger ist und regelmaessig gefahren wird.
 * Sobald die eigene Strecke laenger ist als der Vorschlag, muss die Seite
 * beides nebeneinander zeigen (renderRouteBasis) — sonst behauptet die
 * Jahressumme oben einen Abzug, den es so nicht gibt.
 */

(function () {
    'use strict';

    // ===== KONSTANTEN =====
    const STORAGE_KEY    = 'mwl_commute_coords';
    const HISTORY_KEY    = 'mwl_commute_history';
    const SETTINGS_KEY   = 'mwl_commute_settings';
    const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

    /* 🔴 Ein eigener DIENST je Verkehrsmittel — nicht ein Profil-Parameter.
       Der OSRM-Demoserver (router.project-osrm.org) hat nur das Auto-Profil
       geladen: /cycling/ und /foot/ antworten mit code "Ok" und liefern
       dieselbe Autoroute zurueck. Unter "Fahrrad" kam damit nie ein Radweg
       vor, und ein eingezeichneter Punkt auf einem Radweg rutschte auf die
       naechste Autostrasse. Der Fehler ist unsichtbar, weil eine Autoroute
       auch mit dem Rad plausibel aussieht.

       Die FOSSGIS-Instanzen (dieselben, die openstreetmap.org selbst nutzt)
       fahren je Profil einen eigenen Host. Der Profilname im Pfad heisst bei
       allen dreien "driving" — entscheidend ist der Host, nicht der Pfad.

       Gemessen, Stuttgart → Ludwigsburg, dieselben Koordinaten:
         Auto    15,80 km /  22 min
         Rad     18,84 km /  59 min   (laenger, weil ueber Radwege)
         zu Fuss 15,85 km / 210 min
       Drei verschiedene Zahlen heisst: das Profil wirkt wirklich. Wer den
       Dienst wechselt, misst das bitte genauso nach. */
    const OSRM_HOSTS = {
        car:  'https://routing.openstreetmap.de/routed-car',
        bike: 'https://routing.openstreetmap.de/routed-bike',
        walk: 'https://routing.openstreetmap.de/routed-foot'
    };

    /* Pendlerpauschale § 9 EStG. Aendert der Gesetzgeber die Staffel, ist
       das hier EIN Eingriff — und der Satz im Kleingedruckten von
       pages/fahrtkosten/index.html muss mit. */
    const PAUSCHALE = { tier1Ct: 30, tier1Km: 20, tier2Ct: 38 };

    // CO₂ g/km, Durchschnitt Deutschland (Umweltbundesamt)
    const CO2 = { car: 154, ecar: 53, bus: 75, train: 29, bike: 0 };

    const DEFAULTS = { fuelPrice: 1.75, consumption: 7.0, days: 20, mode: 'car' };

    /* Die Markerfarben stehen als Token in fahrtkosten.css (--fk-home /
       --fk-work) und faerben dort auch die Punkte in Beschriftung und
       Legende. Hier lesen statt ein zweites Mal hinschreiben — sonst
       zeigen Karte und Legende irgendwann verschiedene Farben. */
    function token(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    // ===== ICONS (Lucide, unveraenderte Originalpfade) =====
    const ICON = {
        car:      '<circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>',
        bike:     '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
        walk:     '<circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/>',
        bus:      '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
        train:    '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/>',
        zap:      '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
        mapPin:   '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
        house:    '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>',
        school:   '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
        map:      '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>',
        users:    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        ticket:   '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 11v2"/><path d="M13 17v2"/>',
        trash:    '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
        arrowGo:  '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
        check:    '<path d="M20 6 9 17l-5-5"/>',
        undo:     '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>'
    };

    function svg(path, stroke) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' +
            (stroke || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            path + '</svg>';
    }

    // ===== ZAHLFORMAT =====
    /* Das Format haengt an der Dokumentsprache. Ein fest verdrahtetes
       toFixed() schreibt "12.34 €" auf die deutsche und "12,34 €" nirgends. */
    const EN = (document.documentElement.lang || 'de').toLowerCase().indexOf('en') === 0;
    const LOCALE = EN ? 'en-US' : 'de-DE';

    /* 🔴 Die statische i18n-Pipeline sieht nur, was IM HTML steht. Alles, was
       diese Datei zur Laufzeit baut — Befundsatz, Staffel-Erklaerung,
       CO₂-Vergleich, Verbindungsliste, Monatsnamen — landet sonst deutsch
       auf /en/. Assets/js/i18n-runtime.js hilft hier nicht: das laeuft nur in
       der App und ersetzt ganze Textknoten, waehrend hier Zahlen mitten im
       Satz stehen. Deshalb zweisprachig direkt an der Quelle. */
    function t(de, en) { return EN ? en : de; }

    function nf(v, d) {
        return Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function eur(v)      { return nf(v, 2) + ' €'; }
    function km(v, d)    { return nf(v, d == null ? 1 : d) + ' km'; }
    function grams(v)    { return nf(v, 0) + ' g'; }

    function formatDuration(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.round((seconds % 3600) / 60);
        if (h > 0) return h + ' h ' + m + ' min';
        return m + ' min';
    }

    // ===== ZUSTAND =====
    let map = null;
    let markers = { home: null, work: null };
    let coords  = { home: null, work: null };
    let addresses = { home: '', work: '' };
    let routeLayer = null;
    let currentRoute = null;   // { distance: km, duration: s, geometry, custom }
    let activeMode = DEFAULTS.mode;
    let searchTimeout = null;

    /* Eigene Strecke. waypoints steht in Fahrtreihenfolge zwischen Start und
       Ziel; wpMarkers ist die Marker-Liste dazu und wird immer komplett neu
       gebaut, damit Index und Marker nicht auseinanderlaufen. */
    let waypoints   = [];
    let wpMarkers   = [];
    let suggestedKm = null;    // kuerzeste Verbindung, nur fuer den Vergleich
    let ghostMarker = null;    // Greifpunkt, der beim Ueberfahren auf der Linie liegt
    let lineDrag    = null;    // { grab: [lng,lat] } waehrend eines Linienzugs
    let clickGuard  = 0;       // Zeitstempel: unterdrueckt den Klick nach einem Zug

    // ===== INIT =====
    function init() {
        loadCoords();
        loadSettings();
        checkOnlineStatus();

        window.addEventListener('online', checkOnlineStatus);
        window.addEventListener('offline', checkOnlineStatus);

        bindInput('fk-days', onSettingChange);
        bindInput('fk-fuel-price', onSettingChange);
        bindInput('fk-consumption', onSettingChange);
        bindInput('fk-offline-km', recalculate);

        setupSearch('fk-search-home', 'home');
        setupSearch('fk-search-work', 'work');

        document.querySelectorAll('.fk-seg__btn[data-mode]').forEach(function (tab) {
            tab.addEventListener('click', function () { setMode(this.dataset.mode); });
        });

        setMode(activeMode, true);
        renderHistory();
        renderTransportLinks();
        recalculate();
    }

    function bindInput(id, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', fn);
    }

    function onSettingChange() {
        saveSettings();
        recalculate();
    }

    function checkOnlineStatus() {
        var offline = !navigator.onLine;
        var fallback = document.getElementById('fk-offline-fallback');
        var section  = document.getElementById('fk-map-section');
        if (fallback) fallback.classList.toggle('visible', offline);
        if (section)  section.style.display = offline ? 'none' : '';
        if (!offline && !map) initMap();
        recalculate();
    }

    function setMode(mode, silent) {
        activeMode = mode;
        document.querySelectorAll('.fk-seg__btn[data-mode]').forEach(function (t) {
            t.classList.toggle('active', t.dataset.mode === mode);
        });
        /* Ohne Auto gibt es keinen Spritpreis. Die beiden Felder stehen zu
           lassen waere eine Annahme, die niemand trifft. */
        var fuelGrp = document.getElementById('fkAssumeFuel');
        if (fuelGrp) fuelGrp.classList.toggle('is-off', mode !== 'car');

        if (!silent) {
            saveSettings();
            /* 🔴 Jedes Profil hat seine EIGENE kuerzeste Verbindung (Rad
               18,84 km, wo das Auto 15,80 km faehrt). Bleibt der alte Wert
               stehen, vergleicht der Beleg unter der Karte die Radstrecke mit
               der Autostrecke und weist einen Unterschied aus, den es nicht
               gibt. Vor dem Umstieg auf echte Profile fiel das nicht auf, weil
               alle drei dieselbe Zahl lieferten. */
            suggestedKm = null;
            if (coords.home && coords.work) fetchRoute();
            else { recalculate(); renderTransportLinks(); }
        }
    }

    // ===== ADRESSSUCHE =====
    function setupSearch(inputId, type) {
        var input    = document.getElementById(inputId);
        var results  = document.getElementById(inputId + '-results');
        var clearBtn = document.getElementById(inputId + '-clear');
        if (!input || !results) return;

        if (addresses[type]) input.value = addresses[type];

        input.addEventListener('input', function () {
            var q = this.value.trim();
            clearTimeout(searchTimeout);
            if (q.length < 3) { results.classList.remove('visible'); return; }
            searchTimeout = setTimeout(function () { geocode(q, results, type); }, 400);
        });

        input.addEventListener('focus', function () {
            if (results.children.length > 0 && this.value.length >= 3) results.classList.add('visible');
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') results.classList.remove('visible');
        });

        document.addEventListener('click', function (e) {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.classList.remove('visible');
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                input.value = '';
                results.classList.remove('visible');
                addresses[type] = '';
                if (markers[type]) { markers[type].remove(); markers[type] = null; }
                coords[type] = null;
                /* Ohne einen der beiden Endpunkte hat der eingezeichnete Weg
                   keinen Bezug mehr. Beim blossen VERSCHIEBEN eines Markers
                   bleiben die Punkte dagegen stehen — dort ist die Strecke
                   dieselbe geblieben. */
                waypoints = [];
                suggestedKm = null;
                renderWaypoints();
                clearRoute();
                saveCoords();
                updateLegend();
                recalculate();
                renderTransportLinks();
            });
        }
    }

    function placeIcon(item) {
        var t = item.type || '';
        if (t === 'school' || t === 'university' || t === 'college') return ICON.school;
        if (t === 'house' || t === 'residential' || t === 'apartments') return ICON.house;
        if (t === 'industrial' || t === 'commercial' || t === 'office')  return ICON.building;
        if (t === 'station' || t === 'halt' || t === 'stop')             return ICON.train;
        return ICON.mapPin;
    }

    function geocode(query, resultsEl, type) {
        var url = NOMINATIM_BASE + '?format=json&addressdetails=1&limit=5&countrycodes=de&q=' +
            encodeURIComponent(query);

        fetch(url, { headers: { 'Accept-Language': EN ? 'en' : 'de' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!Array.isArray(data)) return;
            resultsEl.innerHTML = '';

            data.forEach(function (item) {
                var parts    = item.display_name.split(',');
                var mainText = parts.slice(0, 2).join(',').trim();
                var subText  = parts.slice(2, 4).join(',').trim();

                var div = document.createElement('div');
                div.className = 'fk-result';
                div.setAttribute('role', 'button');
                div.setAttribute('tabindex', '0');
                div.innerHTML =
                    '<span class="fk-result__icon">' + svg(placeIcon(item)) + '</span>' +
                    '<span class="fk-result__text">' + escapeHtml(mainText) +
                    '<span class="fk-result__sub">' + escapeHtml(subText) + '</span></span>';

                function pick() {
                    var lngLat = [parseFloat(item.lon), parseFloat(item.lat)];
                    var inputEl = document.getElementById('fk-search-' + type);
                    inputEl.value = item.display_name.split(',').slice(0, 3).join(',');
                    addresses[type] = inputEl.value;
                    resultsEl.classList.remove('visible');

                    setMarker(type, lngLat);

                    if (coords.home && coords.work) { fitMapToBoth(); fetchRoute(); }
                    else if (map) map.flyTo({ center: lngLat, zoom: 14, duration: 800 });
                }

                div.addEventListener('click', pick);
                div.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); }
                });

                resultsEl.appendChild(div);
            });

            resultsEl.classList.toggle('visible', data.length > 0);
        })
        .catch(function () { /* Netzfehler, still */ });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ===== KARTE =====
    function mapStyleUrl() {
        return document.documentElement.getAttribute('data-theme') === 'light'
            ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
            : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
    }

    function initMap() {
        if (!window.maplibregl || !document.getElementById('fk-map')) return;

        map = new maplibregl.Map({
            container: 'fk-map',
            style: mapStyleUrl(),
            center: [10.45, 51.16],
            zoom: 5.5,
            attributionControl: true
        });

        map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        map.addControl(new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false
        }), 'bottom-right');

        map.on('click', function (e) {
            if (Date.now() < clickGuard) return;
            var lngLat = [e.lngLat.lng, e.lngLat.lat];

            /* Ein Treffer auf der Route setzt einen Wegpunkt statt Start oder
               Ziel zu verschieben. Das ist zugleich der Weg fuer Touch: dort
               gibt es kein Ueberfahren, also auch keinen Greifpunkt — antippen
               legt den Punkt auf die Linie, danach zieht man ihn dorthin, wo
               man wirklich langfaehrt. */
            if (routeHit(e.point)) { insertWaypoint(lngLat, lngLat); return; }

            var type = !coords.home ? 'home' : (!coords.work ? 'work' : 'home');
            setMarker(type, lngLat);
            reverseGeocode(lngLat, type);
            if (coords.home && coords.work) fetchRoute();
        });

        bindLineDrag();

        if (coords.home) setMarker('home', coords.home, true);
        if (coords.work) setMarker('work', coords.work, true);
        renderWaypoints();

        if (coords.home && coords.work) { fitMapToBoth(); fetchRoute(); }
    }

    /* ─── Eigene Strecke: die Linie greifen ────────────────────────────
       Layer-gebundene Handler haengen an der Layer-ID, nicht am Layer-Objekt.
       Einmal binden reicht deshalb, auch wenn drawRoute() den Layer bei jedem
       Routing neu anlegt. */
    function bindLineDrag() {
        map.on('mouseenter', 'route-line', function () {
            if (!lineDrag) map.getCanvas().style.cursor = 'grab';
        });
        map.on('mouseleave', 'route-line', function () {
            if (lineDrag) return;
            map.getCanvas().style.cursor = '';
            hideGhost();
        });
        map.on('mousemove', 'route-line', function (e) {
            if (lineDrag) return;
            showGhost(nearestOnRoute([e.lngLat.lng, e.lngLat.lat]).point);
        });
        map.on('mousedown', 'route-line', startLineDrag);
    }

    function routeHit(point) {
        if (!map || !routeLayer || !map.getLayer('route-line')) return false;
        var box = [[point.x - 9, point.y - 9], [point.x + 9, point.y + 9]];
        try { return map.queryRenderedFeatures(box, { layers: ['route-line'] }).length > 0; }
        catch (e) { return false; }
    }

    function startLineDrag(e) {
        if (!currentRoute || !currentRoute.geometry) return;
        e.preventDefault();          // haelt die Karte fest, statt sie mitzuziehen

        var grab = nearestOnRoute([e.lngLat.lng, e.lngLat.lat]).point;
        lineDrag = { grab: grab };
        map.getCanvas().style.cursor = 'grabbing';
        showGhost(grab, true);

        function onMove(ev) { showGhost([ev.lngLat.lng, ev.lngLat.lat], true); }
        function onUp(ev) {
            map.off('mousemove', onMove);
            var grabbed = lineDrag.grab;
            lineDrag = null;
            map.getCanvas().style.cursor = '';
            hideGhost();
            clickGuard = Date.now() + 250;
            insertWaypoint([ev.lngLat.lng, ev.lngLat.lat], grabbed);
        }

        map.on('mousemove', onMove);
        map.once('mouseup', onUp);
    }

    /* Der Greifpunkt ist ein Marker, kein absolut gesetztes div: so bleibt er
       beim Verschieben und Zoomen der Karte auf seiner Koordinate. */
    function showGhost(lngLat, active) {
        if (!map) return;
        if (!ghostMarker) {
            var el = document.createElement('div');
            el.className = 'fk-wp-ghost';
            ghostMarker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
        } else {
            ghostMarker.setLngLat(lngLat);
        }
        ghostMarker.getElement().classList.toggle('is-active', !!active);
    }

    function hideGhost() {
        if (ghostMarker) { ghostMarker.remove(); ghostMarker = null; }
    }

    /* ─── Geometrie ────────────────────────────────────────────────────
       Naechster Punkt auf der Route, samt Segment-Index. Der Index sagt, WO
       auf der Fahrt ein Punkt liegt — daraus folgt, an welche Stelle der
       Wegpunkt-Liste ein neuer Punkt gehoert. Ohne ihn haenge man jeden
       neuen Punkt hinten an, und ein Umweg direkt hinter dem Start wuerde die
       Route erst ans Ziel und dann zurueck schicken.

       Gerechnet wird in einer lokal flachen Naeherung: Laengengrade werden mit
       cos(Breite) gestaucht. Auf Pendelstrecken ist der Fehler bedeutungslos,
       und es geht hier ohnehin nur um "welcher Punkt ist naeher". */
    function nearestOnRoute(p) {
        var g  = currentRoute && currentRoute.geometry;
        var cs = g && g.coordinates;
        if (!cs || cs.length < 2) return { point: p, seg: 0 };

        var kx = Math.cos(p[1] * Math.PI / 180);
        var best = { point: cs[0], seg: 0 }, bestD = Infinity;

        for (var i = 0; i < cs.length - 1; i++) {
            var a = cs[i], b = cs[i + 1];
            var abx = (b[0] - a[0]) * kx, aby = b[1] - a[1];
            var apx = (p[0] - a[0]) * kx, apy = p[1] - a[1];
            var len = abx * abx + aby * aby;
            var t   = len > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / len)) : 0;
            var q   = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
            var dx  = (p[0] - q[0]) * kx, dy = p[1] - q[1];
            var d   = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = { point: q, seg: i }; }
        }
        return best;
    }

    /* ─── Wegpunkte ────────────────────────────────────────────────────
       refLngLat ist die Stelle, an der GEGRIFFEN wurde, nicht die, an der
       losgelassen wurde. Nur sie liegt sicher auf der Linie und taugt damit
       zur Einsortierung; der Ablagepunkt kann weit daneben liegen. */
    function insertWaypoint(lngLat, refLngLat) {
        var at = waypoints.length;

        if (waypoints.length && currentRoute && currentRoute.geometry) {
            var refSeg = nearestOnRoute(refLngLat).seg;
            for (var i = 0; i < waypoints.length; i++) {
                if (nearestOnRoute(waypoints[i]).seg > refSeg) { at = i; break; }
            }
        }

        waypoints.splice(at, 0, lngLat);
        saveCoords();
        renderWaypoints();
        fetchRoute();
    }

    function removeWaypoint(index) {
        waypoints.splice(index, 1);
        saveCoords();
        renderWaypoints();
        fetchRoute();
    }

    function renderWaypoints() {
        wpMarkers.forEach(function (m) { m.remove(); });
        wpMarkers = [];
        if (!map) return;
        waypoints.forEach(function (c, i) { wpMarkers.push(makeWaypointMarker(c, i)); });
    }

    function makeWaypointMarker(lngLat, index) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'fk-wp';
        el.title = t('Ziehen verschiebt, Klicken entfernt', 'Drag to move, click to remove');

        var marker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat(lngLat)
            .addTo(map);

        /* 🔴 Erst NACH dem Marker beschriften. Der Konstruktor setzt auf jedes
           Element ein eigenes aria-label ("Map marker") und ueberschreibt damit
           alles, was vorher draufstand. */
        el.setAttribute('aria-label',
            t('Wegpunkt ' + (index + 1) + ' entfernen', 'Remove waypoint ' + (index + 1)));

        /* Ein Zug endet mit mouseup auf demselben Element und loest deshalb
           auch ein click aus. Ohne diese Sperre wuerde jeder Verschiebe-Vorgang
           den Punkt gleich wieder loeschen. Zeitstempel statt Merker-Variable:
           ein Merker, der nur im click zurueckgesetzt wird, bleibt haengen,
           wenn der click einmal ausbleibt. */
        var draggedAt = 0;
        marker.on('dragstart', function () { el.classList.add('is-dragging'); });
        marker.on('dragend', function () {
            el.classList.remove('is-dragging');
            draggedAt = Date.now();
            var p = marker.getLngLat();
            waypoints[index] = [p.lng, p.lat];
            saveCoords();
            fetchRoute();
        });

        el.addEventListener('click', function (e) {
            e.stopPropagation();
            if (Date.now() - draggedAt < 300) return;
            removeWaypoint(index);
        });

        return marker;
    }

    function resetToSuggestion() {
        if (!waypoints.length) return;
        waypoints = [];
        saveCoords();
        renderWaypoints();
        fetchRoute();
    }

    function reverseGeocode(lngLat, type) {
        var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' +
            lngLat[1] + '&lon=' + lngLat[0] + '&addressdetails=1';

        fetch(url, { headers: { 'Accept-Language': EN ? 'en' : 'de' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && data.display_name) {
                var short = data.display_name.split(',').slice(0, 3).join(',');
                addresses[type] = short;
                var el = document.getElementById('fk-search-' + type);
                if (el) el.value = short;
                saveCoords();
            }
        })
        .catch(function () { /* still */ });
    }

    // ===== MARKER =====
    function setMarker(type, lngLat, skipSave) {
        if (!map) return;
        if (markers[type]) markers[type].remove();

        var color = type === 'home' ? token('--fk-home', '#10b981') : token('--fk-work', '#3b82f6');
        var icon  = type === 'home' ? ICON.house : ICON.building;

        var el = document.createElement('div');
        el.style.cssText =
            'width:30px;height:30px;border-radius:50%;background:' + color + ';' +
            'border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.35);' +
            'display:flex;align-items:center;justify-content:center;color:#fff;cursor:grab;';
        el.innerHTML = svg(icon, 2).replace('<svg ', '<svg width="15" height="15" ');

        var marker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat(lngLat)
            .addTo(map);

        // Beschriftung erst nach dem Marker, siehe makeWaypointMarker().
        el.setAttribute('aria-label', type === 'home' ? t('Start', 'Start') : t('Ziel', 'Destination'));

        marker.on('dragend', function () {
            var pos = marker.getLngLat();
            coords[type] = [pos.lng, pos.lat];
            saveCoords();
            reverseGeocode(coords[type], type);
            updateLegend();
            if (coords.home && coords.work) fetchRoute();
        });

        /* Der Vergleichswert gehoert zu genau diesem Start-Ziel-Paar. Bleibt er
           stehen, vergleicht die Seite die neue Strecke mit einer alten.
           Auf die tatsaechliche Aenderung pruefen und nicht einfach immer
           verwerfen: der Theme-Wechsel setzt beide Marker mit denselben
           Koordinaten neu, und danach stuende der Vergleich ohne Grund leer. */
        var moved = !coords[type] || coords[type][0] !== lngLat[0] || coords[type][1] !== lngLat[1];
        if (moved) suggestedKm = null;

        markers[type] = marker;
        coords[type] = lngLat;

        if (!skipSave) saveCoords();
        updateLegend();
        recalculate();
        renderTransportLinks();
    }

    function fitMapToBoth() {
        if (!coords.home || !coords.work || !map) return;
        var bounds = new maplibregl.LngLatBounds();
        routeChain().forEach(function (c) { bounds.extend(c); });
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 });
    }

    // ===== ROUTING =====
    /* Start, eigene Zwischenpunkte, Ziel — in Fahrtreihenfolge. Ohne
       Wegpunkte sind das die zwei Punkte wie bisher. */
    function routeChain() {
        if (!coords.home || !coords.work) return [];
        return [coords.home].concat(waypoints, [coords.work]);
    }

    /* ÖPNV hat hier keine Linienfuehrung — dafuer stehen die Verbindungslinks
       weiter unten. Als Strecke dient die Strassenverbindung, und
       renderModeNote() sagt das auch dazu. */
    function osrmBase() {
        return (OSRM_HOSTS[activeMode] || OSRM_HOSTS.car) + '/route/v1/driving';
    }

    function osrmCoords(chain) {
        return chain.map(function (c) { return c[0] + ',' + c[1]; }).join(';');
    }

    function fetchRoute() {
        if (!coords.home || !coords.work) return;

        showLoading(true);
        clearRoute();

        var chain  = routeChain();
        var custom = waypoints.length > 0;
        var url = osrmBase() + '/' + osrmCoords(chain) +
            '?overview=full&geometries=geojson';

        fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            showLoading(false);
            if (data.code !== 'Ok' || !data.routes || !data.routes[0]) throw new Error('no route');

            var route = data.routes[0];
            currentRoute = {
                distance: route.distance / 1000,
                duration: route.duration,
                geometry: route.geometry,
                custom: custom
            };
            /* Ohne Wegpunkte IST die gefahrene Route der Vorschlag. Den Wert
               hier mitzunehmen spart die zweite Anfrage in dem Fall, der am
               haeufigsten vorkommt. */
            if (!custom) suggestedKm = currentRoute.distance;

            drawRoute(route.geometry);
            recalculate();
            renderTransportLinks();
            ensureSuggestion();
        })
        .catch(function () {
            showLoading(false);
            // Rueckfall: Luftlinie entlang der Kette. Wird im Befundsatz auch so benannt.
            currentRoute = {
                distance: chainHaversineKm(chain),
                duration: 0,
                geometry: null,
                custom: custom
            };
            recalculate();
            renderTransportLinks();
        });
    }

    /* Der Vergleichswert fehlt nach einem Neuladen mit gespeicherten
       Wegpunkten: dann war die erste Anfrage schon die eigene Strecke. Diese
       eine Zusatzanfrage holt ihn nach — ohne Geometrie, es geht nur um die
       Zahl. */
    function ensureSuggestion() {
        if (suggestedKm != null || !waypoints.length || !coords.home || !coords.work) return;

        var url = osrmBase() + '/' +
            osrmCoords([coords.home, coords.work]) + '?overview=false';

        fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.code !== 'Ok' || !data.routes || !data.routes[0]) return;
            suggestedKm = data.routes[0].distance / 1000;
            renderRouteBasis();
        })
        .catch(function () { /* ohne Vergleichswert bleibt der Vergleich weg */ });
    }

    function routeColor() { return token('--primary', '#5578a8'); }

    let drawRetry = null;
    let drawTries = 0;

    function drawRoute(geometry, _retry) {
        if (!map || !geometry) return;

        /* 🔴 Nicht auf 'style.load' warten, sondern pollen.
           Der Theme-Wechsel ruft drawRoute() AUS dem style.load-Handler
           heraus auf — dort meldet isStyleLoaded() noch false, und ein
           zweites once('style.load') feuert danach nie mehr. Ergebnis war
           eine Karte, die nach jedem Theme-Wechsel die Route verlor, ohne
           Fehler in der Konsole. */
        if (!map.isStyleLoaded()) {
            if (!_retry) drawTries = 0;
            if (drawTries++ > 40) return;              // ~5 s, dann aufgeben
            clearTimeout(drawRetry);
            drawRetry = setTimeout(function () { drawRoute(geometry, true); }, 120);
            return;
        }

        clearTimeout(drawRetry);
        clearRouteLayer();

        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: geometry } });

        map.addLayer({
            id: 'route-line-shadow', type: 'line', source: 'route',
            paint: { 'line-color': '#000000', 'line-width': 8, 'line-opacity': 0.15, 'line-blur': 4 }
        });
        map.addLayer({
            id: 'route-line', type: 'line', source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': routeColor(), 'line-width': 5, 'line-opacity': 0.9 }
        });

        routeLayer = true;
    }

    /* 🔴 Zwei getrennte Sachen, die sich leicht vermischen:
       clearRouteLayer() nimmt nur die Linie von der Karte,
       clearRoute() wirft zusaetzlich die gemessene Route weg.
       Beides in einer Funktion war ein stiller Fehler: drawRoute() raeumt
       vor dem Zeichnen auf und haette damit die Route geloescht, die
       fetchRoute() gerade gesetzt hat. Ergebnis war eine Seite, die
       dauerhaft Luftlinie und keine Fahrzeit zeigte, obwohl OSRM sauber
       geantwortet hat. */
    function clearRouteLayer() {
        if (map && routeLayer) {
            try {
                if (map.getLayer('route-line')) map.removeLayer('route-line');
                if (map.getLayer('route-line-shadow')) map.removeLayer('route-line-shadow');
                if (map.getSource('route')) map.removeSource('route');
            } catch (e) { /* still */ }
        }
        routeLayer = null;
    }

    function clearRoute() {
        clearRouteLayer();
        currentRoute = null;
    }

    function showLoading(show) {
        var el = document.getElementById('fk-route-loading');
        if (el) el.classList.toggle('visible', show);
    }

    function haversineKm(c1, c2) {
        var R = 6371;
        var toRad = function (d) { return d * Math.PI / 180; };
        var dLat = toRad(c2[1] - c1[1]);
        var dLon = toRad(c2[0] - c1[0]);
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(c1[1])) * Math.cos(toRad(c2[1])) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /* Luftlinie ueber die ganze Kette, nicht nur Start zu Ziel: sonst faellt
       im Fehlerfall der eingezeichnete Umweg still weg und die Seite zeigt
       eine kuerzere Strecke, als der Nutzer gerade gesetzt hat. */
    function chainHaversineKm(chain) {
        var sum = 0;
        for (var i = 0; i < chain.length - 1; i++) sum += haversineKm(chain[i], chain[i + 1]);
        return sum;
    }

    // ===== EINGANGSGROESSEN =====
    function num(id, fallback) {
        var el = document.getElementById(id);
        var v = el ? parseFloat(el.value) : NaN;
        return isNaN(v) ? fallback : v;
    }

    function getDistanceKm() {
        if (!navigator.onLine) return Math.max(0, num('fk-offline-km', 0));
        if (currentRoute) return currentRoute.distance;
        if (coords.home && coords.work) return haversineKm(coords.home, coords.work);
        return 0;
    }

    function getDays()  { return Math.max(0, Math.round(num('fk-days', DEFAULTS.days))); }
    function isCar()    { return activeMode === 'car'; }
    /* Auto, Rad und zu Fuss werden je von einem eigenen Dienst geroutet, ihre
       Dauer ist echt. Für ÖPNV gibt es keinen — siehe OSRM_HOSTS. */
    function hasTravelTime() { return !!OSRM_HOSTS[activeMode]; }

    /* Pauschale je Tag in Euro. Gilt fuer die EINFACHE Strecke. */
    function pauschalePerDay(distKm) {
        var ct = distKm <= PAUSCHALE.tier1Km
            ? distKm * PAUSCHALE.tier1Ct
            : PAUSCHALE.tier1Km * PAUSCHALE.tier1Ct +
              (distKm - PAUSCHALE.tier1Km) * PAUSCHALE.tier2Ct;
        return ct / 100;
    }

    // ===== RECHNEN + AUSGEBEN =====
    function recalculate() {
        var dist  = getDistanceKm();
        var days  = getDays();
        var dur   = currentRoute ? currentRoute.duration : 0;
        var totalKm = dist * days * 2;

        var fuelCost = isCar()
            ? (totalKm / 100) * num('fk-consumption', DEFAULTS.consumption) * num('fk-fuel-price', DEFAULTS.fuelPrice)
            : 0;

        var pDay   = pauschalePerDay(dist);
        var pMonth = pDay * days;
        var pYear  = pMonth * 12;

        // ── Befund
        setNum('fkYearValue', dist > 0 && days > 0 ? nf(pYear, 2) : null, '€');
        setText('fkFactDist',  dist > 0 ? km(dist) : '—');
        /* 🔴 Fahrzeit nur beim Auto.
           Der oeffentliche OSRM-Demoserver hat ausschliesslich das
           Auto-Profil geladen: /cycling/ und /foot/ antworten mit code "Ok"
           und liefern dieselbe Autoroute zurueck. Die Dauer als
           "Fahrzeit Fahrrad" auszugeben waere eine Autozeit mit falschem
           Etikett — und sie faellt nicht auf, weil sie plausibel aussieht.
           Nachpruefbar: die drei Profile fuer dieselben Koordinaten
           abfragen, alle drei geben denselben Wert. */
        /* Die Dauer gilt fuer Auto, Rad und zu Fuss — jedes hat seinen eigenen
           Routing-Dienst. Nur ÖPNV hat keinen: dort waere es eine Autozeit
           mit falschem Etikett. */
        setText('fkFactTime',  (hasTravelTime() && dur > 0) ? formatDuration(dur) : '—');
        renderTimeLabel();
        renderModeNote();
        renderRouteBasis();
        renderMapHint();
        setText('fkFactTrips', dist > 0 && days > 0 ? nf(days * 2, 0) : '—');
        setText('fkFactFuel',  isCar() && fuelCost > 0 ? eur(fuelCost) : '—');
        setText('fkVerdictSay', verdictSentence(dist, days, pYear));

        // ── Staffel
        renderTier(dist, pDay, pMonth, totalKm);

        // ── Karte
        var chip = document.getElementById('fk-map-route-chip');
        if (chip) {
            chip.textContent = dist > 0 ? km(dist) : '';
            chip.style.display = dist > 0 ? '' : 'none';
        }

        // ── CO₂
        renderCo2(dist);

        // ── Speichern-Knopf
        var canSave = dist > 0 && days > 0;
        var btn  = document.getElementById('fk-save-btn');
        var hint = document.getElementById('fkSaveHint');
        if (btn) btn.disabled = !canSave;
        if (hint) hint.textContent = canSave
            ? t('Legt ' + currentMonthLabel() + ' in der Liste unten ab.',
                'Files ' + currentMonthLabel() + ' in the list below.')
            : t('Braucht eine Strecke und mindestens einen Arbeitstag.',
                'Needs a distance and at least one working day.');
    }

    /* Zu Fuss ist keine Fahrt. Das Feld traegt sonst fuer ein Viertel der
       Verkehrsmittel das falsche Wort. */
    function renderTimeLabel() {
        var el = document.getElementById('fkFactTimeKey');
        if (!el) return;
        el.textContent = activeMode === 'walk'
            ? t('Gehzeit einfach', 'Walking time one way')
            : t('Fahrzeit einfach', 'Travel time one way');
    }

    function renderModeNote() {
        var el = document.getElementById('fkModeNote');
        if (!el) return;
        /* Auto, Rad und zu Fuss haben je einen eigenen Routing-Dienst, ihre
           Zahlen stehen fuer sich. Nur bei Bus und Bahn bleibt eine Luecke —
           und die wird benannt statt mit der Autostrecke ueberdeckt. */
        if (activeMode !== 'transit') { el.style.display = 'none'; return; }
        el.style.display = '';
        el.innerHTML = t(
            'Für Bus und Bahn gibt es hier keine Linienführung. Als Strecke steht die ' +
            '<strong>Straßenverbindung</strong>, eine Fahrzeit steht nicht dabei — die ' +
            'echte Verbindung findest du über die Links weiter unten.',
            'There is no line routing for buses and trains here. The distance shown is the ' +
            '<strong>road connection</strong> and no travel time comes with it — you will ' +
            'find the real connection through the links further down.'
        );
    }

    /* ─── Eigene Strecke: der Beleg dazu ───────────────────────────────
       Zwei Zahlen und ein Satz. Die eigene Strecke steht schon oben im Befund
       und auf der Karte — hier steht deshalb NUR der Vorschlag und die
       Differenz, sonst haette dieselbe Zahl drei Plaetze. */
    function renderRouteBasis() {
        var box = document.getElementById('fkRouteBasis');
        if (!box) return;

        if (!waypoints.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
        box.style.display = '';

        var n = waypoints.length;
        var own = currentRoute ? currentRoute.distance : 0;
        var head = t(
            n === 1 ? 'Über einen eigenen Zwischenpunkt' : 'Über ' + n + ' eigene Zwischenpunkte',
            n === 1 ? 'Via one waypoint of your own' : 'Via ' + n + ' waypoints of your own'
        );

        var cmp = '';
        var note;

        if (suggestedKm != null && own > 0) {
            var delta = own - suggestedKm;
            var longer = delta > 0.05;
            cmp = '<span class="fk-basis__cmp">' +
                    '<span class="fk-basis__k">' + t('Kürzeste Verbindung', 'Shortest route') + '</span>' +
                    '<span class="fk-basis__v">' + km(suggestedKm) + '</span>' +
                  '</span>' +
                  '<span class="fk-basis__cmp">' +
                    '<span class="fk-basis__k">' + t('Unterschied', 'Difference') + '</span>' +
                    '<span class="fk-basis__v' + (longer ? ' is-more' : '') + '">' +
                        (Math.abs(delta) < 0.05 ? t('keiner', 'none')
                            : (delta > 0 ? '+' : '−') + km(Math.abs(delta))) +
                    '</span>' +
                  '</span>';

            /* 🔴 Der Satz, ohne den die Jahressumme oben zu viel verspricht.
               § 9 Abs. 1 Satz 3 Nr. 4 EStG: Massstab ist die kuerzeste
               Strassenverbindung; eine laengere zaehlt nur unter einer
               Bedingung, und die kann diese Seite nicht pruefen. */
            note = longer
                ? t('Gerechnet wird ab hier mit deiner Strecke. Für die Pendlerpauschale gilt aber die kürzeste Straßenverbindung — eine längere zählt nur, wenn sie offensichtlich verkehrsgünstiger ist und du sie regelmäßig fährst (§ 9 Abs. 1 Satz 3 Nr. 4 EStG). Trifft das nicht zu, ist der Vorschlag der richtige Wert.',
                    'From here on the calculation uses your route. The commuter allowance, however, is based on the shortest road route — a longer one only counts if it is clearly quicker in practice and you use it regularly (§ 9 (1) sentence 3 no. 4 German Income Tax Act). If that does not apply, the shortest route is the figure to use.')
                : t('Gerechnet wird mit deiner Strecke. Sie ist nicht länger als die kürzeste Straßenverbindung, für die Pendlerpauschale ändert sich damit nichts.',
                    'The calculation uses your route. It is no longer than the shortest road route, so nothing changes for the commuter allowance.');
        } else {
            note = t('Gerechnet wird mit deiner Strecke. Der Vergleich mit der kürzesten Straßenverbindung steht hier, sobald sie vorliegt.',
                     'The calculation uses your route. The comparison with the shortest road route appears here as soon as it is available.');
        }

        box.innerHTML =
            '<div class="fk-basis__head">' +
                '<span class="fk-basis__tag">' + escapeHtml(head) + '</span>' +
                cmp +
                /* Nicht "Vorschlag" als blosses Substantiv, und im Englischen
                   nicht noch einmal "Shortest route": das steht zwei Spalten
                   weiter links schon als Beschriftung des Vergleichswerts. */
                '<button type="button" class="fk-ghost fk-basis__undo" onclick="fkResetRoute()">' +
                    svg(ICON.undo, 2) +
                    '<span>' + t('Zurück zum Vorschlag', 'Back to suggested') + '</span>' +
                '</button>' +
            '</div>' +
            '<p class="fk-basis__note">' + note + '</p>';
    }

    /* Der Hinweis auf der Karte sagt, was HIER und JETZT geht. Ohne Route ist
       das Punkte setzen, mit Route das Ziehen der Linie. */
    function renderMapHint() {
        var el = document.getElementById('fk-map-hint');
        if (!el) return;
        el.textContent = (currentRoute && currentRoute.geometry)
            ? t('Zieh die Linie auf deinen Weg. Einen gesetzten Punkt verschiebst du durch Ziehen, ein Klick darauf entfernt ihn.',
                'Drag the line onto the roads you take. Drag a point to move it, click it to remove it.')
            : t('In die Karte tippen setzt einen Punkt. Marker lassen sich ziehen.',
                'Tapping the map sets a point. Markers can be dragged.');
    }

    function verdictSentence(dist, days, pYear) {
        if (dist <= 0) {
            return navigator.onLine
                ? t('Setze Start und Ziel, dann steht hier, was die Pendlerpauschale über zwölf Monate ergibt.',
                    'Set a start and a destination, and this line will show what the commuter allowance adds up to over twelve months.')
                : t('Trag die einfache Strecke oben ein, dann rechnet die Seite weiter.',
                    'Enter the one-way distance above and the page will keep calculating.');
        }
        if (days <= 0) {
            return t('Ohne Arbeitstage gibt es nichts hochzurechnen. Trag oben ein, wie oft du im Monat fährst.',
                     'With no working days there is nothing to project. Enter above how often you commute per month.');
        }

        /* Nur wenn wirklich eine Route mit Geometrie vorliegt, ist die Zahl
           eine Strassenverbindung. Waehrend die OSRM-Anfrage laeuft und im
           Fehlerfall zeigt die Seite Luftlinie — dann muss sie das auch
           sagen, sonst behauptet der Satz eine Genauigkeit, die es nicht
           gibt. (§ 9 EStG will die kuerzeste Strassenverbindung.) */
        var road = !!(currentRoute && currentRoute.geometry);
        var own  = waypoints.length > 0;
        var basisDe = !road ? 'Luftlinie, solange keine Route vorliegt'
                    : own   ? 'deine eingezeichnete Strecke'
                            : 'kürzeste Straßenverbindung';
        var basisEn = !road ? 'straight-line distance, until a route is available'
                    : own   ? 'route you drew yourself'
                            : 'shortest road route';

        return t(
            nf(pYear, 2) + ' € bei ' + km(dist) + ' einfach und ' + days +
            ' Arbeitstagen im Monat, gerechnet über zwölf Monate. Grundlage: ' + basisDe + '.',

            nf(pYear, 2) + ' € for ' + km(dist) + ' one way and ' + days +
            ' working days a month, projected over twelve months. Based on the ' + basisEn + '.'
        );
    }

    /* Signature: die gesetzliche Staffel als Bild. Nenner ist die 20-km-Grenze
       aus § 9 EStG — eine echte Zahl, keine gegriffene Obergrenze. */
    function renderTier(dist, pDay, pMonth, totalKm) {
        var bar   = document.getElementById('fkTierBar');
        var empty = document.getElementById('fkTierEmpty');
        var s1    = document.getElementById('fkTier1');
        var s2    = document.getElementById('fkTier2');
        var c1    = document.getElementById('fkTier1Cap');
        var c2    = document.getElementById('fkTier2Cap');
        var mark  = document.getElementById('fkTierMark');
        var end   = document.getElementById('fkTierEnd');
        var note  = document.getElementById('fkTierNote');
        if (!bar || !s1 || !s2) return;

        var has = dist > 0;
        if (empty) empty.style.display = has ? 'none' : '';
        s1.style.display = has ? '' : 'none';
        s2.style.display = has ? '' : 'none';

        setText('fkPauschaleDay',   has ? eur(pDay) : '—');
        setText('fkPauschaleMonth', has && pMonth > 0 ? eur(pMonth) : '—');
        setText('fkTotalKm',        totalKm > 0 ? km(totalKm, 0) : '—');

        if (!has) {
            if (mark) mark.classList.add('is-off');
            if (end)  end.textContent = '—';
            if (note) note.textContent = t(
                'Die Pauschale ist ein Abzug vom zu versteuernden Einkommen, keine Auszahlung. Was am Ende zurückkommt, hängt vom Steuersatz ab.',
                'The allowance reduces taxable income, it is not a payout. What comes back depends on your tax rate.');
            return;
        }

        var km1 = Math.min(dist, PAUSCHALE.tier1Km);
        var km2 = Math.max(0, dist - PAUSCHALE.tier1Km);
        var eu1 = km1 * PAUSCHALE.tier1Ct / 100;
        var eu2 = km2 * PAUSCHALE.tier2Ct / 100;
        var p1  = (km1 / dist) * 100;
        var p2  = (km2 / dist) * 100;

        /* flex-basis, nicht width: die 2px-Fuge kommt zusaetzlich zu den
           Basen, und flex-shrink verteilt den Ueberlauf gewichtet. */
        s1.style.flexBasis = p1 + '%';
        s2.style.flexBasis = p2 + '%';
        s2.style.display   = km2 > 0 ? '' : 'none';

        // Unter ~18 % ist die Beschriftung nur noch ein abgeschnittener Rest.
        if (c1) c1.textContent = p1 >= 18 ? eur(eu1) : '';
        if (c2) c2.textContent = p2 >= 18 ? eur(eu2) : '';

        if (mark) {
            mark.classList.toggle('is-off', km2 <= 0);
            mark.style.left = p1 + '%';
        }
        if (end) end.textContent = km(dist);

        if (note) {
            note.innerHTML = km2 > 0
                ? t('Von ' + km(dist) + ' einfach fallen <strong>' + km(km1, 0) + ' zu ' + PAUSCHALE.tier1Ct +
                    ' ct</strong> und <strong>' + km(km2) + ' zu ' + PAUSCHALE.tier2Ct +
                    ' ct</strong>. Der Abzug mindert das zu versteuernde Einkommen, er wird nicht ausgezahlt.',
                    'Of ' + km(dist) + ' one way, <strong>' + km(km1, 0) + ' count at ' + PAUSCHALE.tier1Ct +
                    ' ¢</strong> and <strong>' + km(km2) + ' at ' + PAUSCHALE.tier2Ct +
                    ' ¢</strong>. The deduction reduces taxable income, it is not paid out.')
                : t('Deine Strecke bleibt unter ' + PAUSCHALE.tier1Km + ' km, es gilt durchgehend der Satz von <strong>' +
                    PAUSCHALE.tier1Ct + ' ct/km</strong>. Der Abzug mindert das zu versteuernde Einkommen, er wird nicht ausgezahlt.',
                    'Your commute stays under ' + PAUSCHALE.tier1Km + ' km, so the flat rate of <strong>' +
                    PAUSCHALE.tier1Ct + ' ¢/km</strong> applies throughout. The deduction reduces taxable income, it is not paid out.');
        }
    }

    /* CO₂: eine Groesse ueber fuenf Kategorien, absteigend sortiert. Laenge
       traegt die Menge; die Farbe traegt nichts (ausser der Null-Zeile).
       Der Wert steht NEBEN dem Balken — bei 0 g waere er darin unsichtbar. */
    const CO2_META = {
        car:   { label: t('Auto', 'Car'),      icon: ICON.car },
        ecar:  { label: t('E-Auto', 'EV'),     icon: ICON.zap },
        bus:   { label: t('Bus', 'Bus'),       icon: ICON.bus },
        train: { label: t('Zug', 'Train'),     icon: ICON.train },
        bike:  { label: t('Fahrrad', 'Bike'),  icon: ICON.bike }
    };

    function renderCo2(dist) {
        var list = document.getElementById('fkCo2List');
        var note = document.getElementById('fkCo2Note');
        if (!list) return;

        var rows = Object.keys(CO2).map(function (k) {
            return { key: k, g: CO2[k] * dist, perKm: CO2[k] };
        }).sort(function (a, b) { return b.perKm - a.perKm; });

        var max = rows[0].perKm * Math.max(dist, 1);

        list.innerHTML = rows.map(function (r) {
            var pct = max > 0 ? (r.g / max) * 100 : 0;
            var mine = (r.key === 'car'   && activeMode === 'car') ||
                       (r.key === 'bike'  && activeMode === 'bike') ||
                       (r.key === 'bus'   && activeMode === 'transit');
            return '<div class="fk-rank__row' + (mine ? ' is-mine' : '') + (r.perKm === 0 ? ' is-zero' : '') + '">' +
                '<span class="fk-rank__k">' + svg(CO2_META[r.key].icon) +
                    '<span>' + CO2_META[r.key].label + '</span></span>' +
                '<span class="fk-rank__track"><span class="fk-rank__fill" style="width:' +
                    (dist > 0 ? Math.max(pct, r.perKm > 0 ? 1.5 : 0) : 0) + '%"></span></span>' +
                '<span class="fk-rank__v">' + (dist > 0 ? grams(r.g) : '—') + '</span>' +
            '</div>';
        }).join('');

        if (!note) return;
        if (dist <= 0) {
            note.textContent = t('Sobald eine Strecke steht, stehen hier die Werte.',
                                 'The figures appear here as soon as a distance is set.');
            return;
        }
        var saved = (CO2.car - CO2.train) * dist;
        var trips = getDays() * 2;
        note.innerHTML = t(
            'Ein Arbeitsweg mit dem Zug statt dem Auto spart auf dieser Strecke <strong>' + grams(saved) +
            '</strong> je Fahrt, bei ' + trips + ' Fahrten im Monat rund <strong>' +
            nf(saved * trips / 1000, 1) + ' kg</strong>.',
            'Taking the train instead of the car saves <strong>' + grams(saved) +
            '</strong> per trip on this route, and about <strong>' +
            nf(saved * trips / 1000, 1) + ' kg</strong> over ' + trips + ' trips a month.'
        );
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /* Grosse Zahl + kleine Einheit als eigener Knoten. Ein textContent auf
       das <p> wuerde die Einheit mitloeschen. */
    function setNum(id, value, unit) {
        var el = document.getElementById(id);
        if (!el) return;
        if (value == null) { el.textContent = '—'; return; }
        el.textContent = value;
        if (unit) {
            var u = document.createElement('span');
            u.className = 'fk-u';
            u.textContent = unit;
            el.appendChild(u);
        }
    }

    // ===== KOORDINATEN-ANZEIGE =====
    function updateLegend() {
        [['home', 'fk-legend-home-coords'], ['work', 'fk-legend-work-coords']].forEach(function (p) {
            var el = document.getElementById(p[1]);
            if (!el) return;
            var c = coords[p[0]];
            el.textContent = c ? c[1].toFixed(4) + ', ' + c[0].toFixed(4) : t('nicht gesetzt', 'not set');
            el.classList.toggle('is-unset', !c);
        });
    }

    // ===== VERBINDUNGEN =====
    /* Einzige Quelle fuers Markup dieser Liste. Ohne Route stehen die
       allgemeinen Ziele da, mit Route die Direkt-Links. */
    function renderTransportLinks() {
        var container = document.getElementById('fk-transport-links');
        if (!container) return;

        var hasRoute = !!(coords.home && coords.work);
        var hLat = hasRoute ? coords.home[1] : 0, hLon = hasRoute ? coords.home[0] : 0;
        var wLat = hasRoute ? coords.work[1] : 0, wLon = hasRoute ? coords.work[0] : 0;

        var links = [
            {
                icon: ICON.train, name: 'Deutsche Bahn',
                desc: hasRoute ? t('Verbindung für deine Strecke', 'Connections for your route')
                               : t('Verbindung suchen', 'Search connections'),
                url: hasRoute
                    ? 'https://reiseauskunft.bahn.de/bin/query.exe/dn?S=' + hLat + ',' + hLon +
                      '&Z=' + wLat + ',' + wLon + '&start=1'
                    : 'https://www.bahn.de/'
            },
            {
                icon: ICON.map, name: 'Google Maps',
                /* Der Link nimmt die Wegpunkte mit: /dir/ kettet beliebig viele
                   Stationen. Sonst oeffnet sich dort wieder die kuerzeste
                   Route und widerspricht der Strecke auf dieser Seite. */
                desc: !hasRoute ? t('Alle Verkehrsmittel', 'All modes of transport')
                    : waypoints.length ? t('Deine Strecke mit allen Zwischenpunkten', 'Your route with every waypoint')
                                       : t('Route mit allen Verkehrsmitteln', 'Route across all modes'),
                url: hasRoute
                    ? 'https://www.google.com/maps/dir/' + routeChain().map(function (c) {
                          return c[1] + ',' + c[0];
                      }).join('/')
                    : 'https://www.google.com/maps'
            },
            {
                icon: ICON.bike, name: 'Komoot',
                desc: hasRoute ? t('Fahrradroute ab deinem Start', 'Cycling route from your start')
                               : t('Fahrradroute planen', 'Plan a cycling route'),
                url: hasRoute
                    ? 'https://www.komoot.com/plan/@' + hLat + ',' + hLon + ',14z'
                    : 'https://www.komoot.com/'
            },
            {
                icon: ICON.ticket, name: 'Deutschlandticket',
                desc: t('58 € im Monat, bundesweit im Nahverkehr', '58 € a month, local transport nationwide'),
                url: 'https://deutschlandticket.de/'
            },
            {
                icon: ICON.bus, name: 'FlixBus',
                desc: t('Fernbus-Verbindungen', 'Long-distance coaches'),
                url: 'https://www.flixbus.de/'
            },
            {
                icon: ICON.users, name: 'BlaBlaCar',
                desc: t('Mitfahrgelegenheiten', 'Ridesharing'),
                url: 'https://www.blablacar.de/'
            }
        ];

        container.innerHTML = links.map(function (l) {
            return '<a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer" class="fk-links__row">' +
                '<span class="fk-links__icon">' + svg(l.icon) + '</span>' +
                '<span><span class="fk-links__name">' + escapeHtml(l.name) + '</span>' +
                    '<span class="fk-links__desc">' + escapeHtml(l.desc) + '</span></span>' +
                '<span class="fk-links__go">' + svg(ICON.arrowGo, 2) + '</span>' +
            '</a>';
        }).join('');
    }

    // ===== SPEICHER =====
    function saveCoords() {
        var payload = { addresses: addresses };
        if (coords.home) payload.home = coords.home;
        if (coords.work) payload.work = coords.work;
        if (waypoints.length) payload.waypoints = waypoints;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
    }

    function loadCoords() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                var p = JSON.parse(raw);
                if (Array.isArray(p.home) && p.home.length === 2) coords.home = p.home;
                if (Array.isArray(p.work) && p.work.length === 2) coords.work = p.work;
                if (p.addresses) {
                    addresses.home = p.addresses.home || '';
                    addresses.work = p.addresses.work || '';
                }
                if (Array.isArray(p.waypoints)) {
                    waypoints = p.waypoints.filter(function (c) {
                        return Array.isArray(c) && c.length === 2 &&
                               isFinite(c[0]) && isFinite(c[1]);
                    });
                }
            }
        } catch (e) {}
        updateLegend();
    }

    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                mode:        activeMode,
                days:        getDays(),
                fuelPrice:   num('fk-fuel-price', DEFAULTS.fuelPrice),
                consumption: num('fk-consumption', DEFAULTS.consumption)
            }));
        } catch (e) {}
    }

    function loadSettings() {
        try {
            var raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return;
            var s = JSON.parse(raw);
            if (s.mode) activeMode = s.mode;
            setValue('fk-days', s.days);
            setValue('fk-fuel-price', s.fuelPrice);
            setValue('fk-consumption', s.consumption);
        } catch (e) {}
    }

    function setValue(id, v) {
        if (v === undefined || v === null || v === '') return;
        var el = document.getElementById(id);
        if (el) el.value = v;
    }

    // ===== ZURUECKSETZEN =====
    function resetMarkers() {
        ['home', 'work'].forEach(function (t) {
            if (markers[t]) { markers[t].remove(); markers[t] = null; }
            var el = document.getElementById('fk-search-' + t);
            if (el) el.value = '';
        });
        coords = { home: null, work: null };
        addresses = { home: '', work: '' };
        waypoints = [];
        suggestedKm = null;
        renderWaypoints();
        clearRoute();
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}

        updateLegend();
        recalculate();
        renderTransportLinks();
    }

    // ===== MONAT SPEICHERN =====
    /* Monatsnamen aus Intl statt aus einer Liste: die Sprache steckt schon in
       LOCALE, und eine zweite handgepflegte Liste waere die naechste Stelle,
       die auseinanderlaeuft. */
    const MONTH_LONG  = new Intl.DateTimeFormat(LOCALE, { month: 'long' });
    const MONTH_SHORT = new Intl.DateTimeFormat(LOCALE, { month: 'short' });

    function monthName(fmt, monthIndex) { return fmt.format(new Date(2000, monthIndex, 1)); }

    function currentMonthLabel() {
        var n = new Date();
        return monthName(MONTH_LONG, n.getMonth()) + ' ' + n.getFullYear();
    }

    function saveMonth() {
        var dist = getDistanceKm();
        var days = getDays();
        if (dist <= 0 || days <= 0) return;

        var now = new Date();
        var monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        var totalKm = dist * days * 2;
        var fuelCost = isCar()
            ? (totalKm / 100) * num('fk-consumption', DEFAULTS.consumption) * num('fk-fuel-price', DEFAULTS.fuelPrice)
            : 0;

        var entry = {
            month: monthKey,
            days: days,
            distanceKm: parseFloat(dist.toFixed(1)),
            totalKm: Math.round(totalKm),
            fuelCost: parseFloat(fuelCost.toFixed(2)),
            pauschale: parseFloat((pauschalePerDay(dist) * days).toFixed(2)),
            mode: activeMode,
            savedAt: now.toISOString()
        };

        var history = loadHistory();
        var idx = history.findIndex(function (h) { return h.month === monthKey; });
        if (idx >= 0) history[idx] = entry; else history.unshift(entry);

        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}

        saveSettings();
        renderHistory();
        flashSaved();
    }

    /* Rueckmeldung nur am Label-Knoten. Ein textContent auf den Knopf wuerde
       das SVG darin loeschen und es kaeme nie zurueck. */
    function flashSaved() {
        var label = document.getElementById('fkSaveLabel');
        var btn   = document.getElementById('fk-save-btn');
        if (!label || !btn) return;
        var orig = label.textContent;
        label.textContent = t('Gespeichert', 'Saved');
        btn.disabled = true;
        setTimeout(function () { label.textContent = orig; recalculate(); }, 1400);
    }

    function loadHistory() {
        try {
            var raw = localStorage.getItem(HISTORY_KEY);
            var v = raw ? JSON.parse(raw) : [];
            return Array.isArray(v) ? v : [];
        } catch (e) { return []; }
    }

    function deleteHistoryEntry(month) {
        var history = loadHistory().filter(function (h) { return h.month !== month; });
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
        renderHistory();
    }

    const MODE_META = {
        car:     { icon: ICON.car,  label: t('Auto', 'Car') },
        bike:    { icon: ICON.bike, label: t('Fahrrad', 'Bike') },
        walk:    { icon: ICON.walk, label: t('Zu Fuß', 'On foot') },
        transit: { icon: ICON.bus,  label: t('ÖPNV', 'Public transport') }
    };

    function renderHistory() {
        var tbody   = document.getElementById('fk-history-body');
        var empty   = document.getElementById('fk-history-empty');
        var summary = document.getElementById('fk-history-summary');
        if (!tbody) return;

        var history = loadHistory();

        if (history.length === 0) {
            tbody.innerHTML = '';
            if (empty) empty.style.display = '';
            if (summary) summary.style.display = 'none';
            return;
        }

        if (empty) empty.style.display = 'none';
        if (summary) summary.style.display = '';

        var totalPauschale = 0, totalFuel = 0;

        tbody.innerHTML = history.map(function (h) {
            var parts = h.month.split('-');
            var label = monthName(MONTH_SHORT, parseInt(parts[1], 10) - 1) + ' ' + parts[0];
            var meta  = MODE_META[h.mode] || MODE_META.car;
            totalPauschale += h.pauschale || 0;
            totalFuel      += h.fuelCost || 0;
            return '<tr>' +
                '<td>' + label + '</td>' +
                '<td><span class="fk-table__mode" title="' + meta.label + '">' + svg(meta.icon) + '</span></td>' +
                '<td class="num">' + h.days + '</td>' +
                '<td class="num">' + km(h.distanceKm) + '</td>' +
                '<td class="num">' + km(h.totalKm, 0) + '</td>' +
                '<td class="num">' + (h.fuelCost > 0 ? eur(h.fuelCost) : '—') + '</td>' +
                '<td class="num is-key">' + eur(h.pauschale || 0) + '</td>' +
                '<td><button type="button" class="fk-del" data-month="' + escapeHtml(h.month) +
                    '" aria-label="' + t(label + ' löschen', 'Delete ' + label) + '">' +
                    svg(ICON.trash, 2) + '</button></td>' +
            '</tr>';
        }).join('');

        if (summary) {
            summary.innerHTML =
                '<span>' + t('Sprit gesamt', 'Fuel total') + ' <strong>' + eur(totalFuel) + '</strong></span>' +
                '<span>' + t('Pauschale gesamt', 'Allowance total') + ' <strong>' + eur(totalPauschale) + '</strong></span>' +
                '<span>' + t('Monate', 'Months') + ' <strong>' + history.length + '</strong></span>';
        }

        tbody.querySelectorAll('.fk-del').forEach(function (btn) {
            btn.addEventListener('click', function () {
                deleteHistoryEntry(this.getAttribute('data-month'));
            });
        });
    }

    // ===== THEME =====
    /* Kein Zeichenwechsel im Knopf: welches der beiden SVG sichtbar ist,
       entscheidet CSS ueber [data-theme]. */
    function toggleTheme() {
        var html = document.documentElement;
        var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        try { localStorage.setItem('mwl_theme', next); } catch (e) {}

        if (map) {
            map.setStyle(mapStyleUrl());
            map.once('style.load', function () {
                if (coords.home) setMarker('home', coords.home, true);
                if (coords.work) setMarker('work', coords.work, true);
                if (currentRoute && currentRoute.geometry) drawRoute(currentRoute.geometry);
            });
        }
    }

    function restoreTheme() {
        try {
            var saved = localStorage.getItem('mwl_theme');
            if (saved) document.documentElement.setAttribute('data-theme', saved);
        } catch (e) {}
    }

    // ===== GLOBALS =====
    window.fkResetMarkers = resetMarkers;
    window.fkResetRoute   = resetToSuggestion;
    window.fkSaveMonth    = saveMonth;
    window.fkToggleTheme  = toggleTheme;

    // ===== BOOT =====
    restoreTheme();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
