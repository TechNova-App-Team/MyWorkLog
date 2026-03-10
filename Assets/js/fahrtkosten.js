/**
 * Fahrtkosten-Tracker MEGA — MyWorkLog
 * Echtes Routing (OSRM), Adresssuche (Nominatim), Verkehrsmittelwahl,
 * ÖPNV-Links, Spritkosten, CO₂-Vergleich, Pendlerpauschale
 * Vanilla JS · LocalStorage · Keine API-Keys nötig
 */

(function () {
    'use strict';

    // ===== CONSTANTS =====
    const STORAGE_KEY      = 'mwl_commute_coords';
    const HISTORY_KEY      = 'mwl_commute_history';
    const SETTINGS_KEY     = 'mwl_commute_settings';
    const PAUSCHALE_30     = 30;  // ct/km für 0-20 km
    const PAUSCHALE_38     = 38;  // ct/km ab 21. km
    const OSRM_BASE        = 'https://router.project-osrm.org/route/v1';
    const NOMINATIM_BASE   = 'https://nominatim.openstreetmap.org/search';

    // CO₂ g/km (Durchschnittswerte Deutschland)
    const CO2 = { car: 154, ecar: 53, bus: 75, train: 29, bike: 0 };

    // Sprit-Defaults
    const DEFAULTS = { fuelPrice: 1.75, consumption: 7.0, mode: 'car' };

    // ===== STATE =====
    let map = null;
    let markers = { home: null, work: null };
    let coords  = { home: null, work: null };
    let addresses = { home: '', work: '' };
    let routeLayer = null;
    let currentRoute = null;   // { distance: km, duration: seconds, geometry: geojson }
    let activeMode = 'car';
    let searchTimeout = null;

    // ===== INIT =====
    function init() {
        loadCoords();
        loadSettings();
        checkOnlineStatus();

        window.addEventListener('online', checkOnlineStatus);
        window.addEventListener('offline', checkOnlineStatus);

        // Inputs
        bindInput('fk-days', recalculate);
        bindInput('fk-fuel-price', recalculate);
        bindInput('fk-consumption', recalculate);
        bindInput('fk-offline-km', recalculate);

        // Search fields
        setupSearch('fk-search-home', 'home');
        setupSearch('fk-search-work', 'work');

        // Mode tabs
        document.querySelectorAll('.mode-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                setMode(this.dataset.mode);
            });
        });

        renderHistory();
        updateModeUI();
    }

    function bindInput(id, fn) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', fn);
    }

    // ===== TRANSPORT MODE =====
    function setMode(mode) {
        activeMode = mode;
        updateModeUI();
        saveSettings();
        if (coords.home && coords.work) {
            fetchRoute();
        }
    }

    function updateModeUI() {
        document.querySelectorAll('.mode-tab').forEach(function (t) {
            t.classList.toggle('active', t.dataset.mode === activeMode);
        });
    }

    // ===== ONLINE / OFFLINE =====
    function checkOnlineStatus() {
        var mapSection = document.getElementById('fk-map-section');
        var offlineFallback = document.getElementById('fk-offline-fallback');

        if (navigator.onLine) {
            mapSection.style.display = '';
            offlineFallback.style.display = 'none';
            if (!map) initMap();
        } else {
            mapSection.style.display = 'none';
            offlineFallback.style.display = 'block';
        }
        recalculate();
    }

    // ===== NOMINATIM GEOCODING =====
    function setupSearch(inputId, type) {
        var input = document.getElementById(inputId);
        var results = document.getElementById(inputId + '-results');
        var clearBtn = document.getElementById(inputId + '-clear');
        if (!input || !results) return;

        // Restore saved address
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

        // Click outside to close
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
                clearRoute();
                saveCoords();
                recalculate();
                updateLegend();
            });
        }
    }

    function geocode(query, resultsEl, type) {
        var url = NOMINATIM_BASE + '?format=json&addressdetails=1&limit=5&countrycodes=de&q=' + encodeURIComponent(query);

        fetch(url, {
            headers: { 'Accept-Language': 'de' }
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!Array.isArray(data)) return;
            resultsEl.innerHTML = '';

            data.forEach(function (item) {
                var div = document.createElement('div');
                div.className = 'search-result-item';

                var icon = '📍';
                if (item.type === 'school' || item.type === 'university') icon = '🏫';
                else if (item.type === 'house' || item.type === 'residential') icon = '🏠';
                else if (item.type === 'industrial' || item.type === 'commercial') icon = '🏢';
                else if (item.type === 'station' || item.type === 'halt') icon = '🚉';

                var displayParts = item.display_name.split(',');
                var mainText = displayParts.slice(0, 2).join(',');
                var subText = displayParts.slice(2, 4).join(',');

                div.innerHTML = '<span class="sri-icon">' + icon + '</span>' +
                    '<span class="sri-text">' + escapeHtml(mainText) +
                    '<span class="sri-sub">' + escapeHtml(subText) + '</span></span>';

                div.addEventListener('click', function () {
                    var lngLat = [parseFloat(item.lon), parseFloat(item.lat)];
                    var inputEl = document.getElementById(type === 'home' ? 'fk-search-home' : 'fk-search-work');
                    inputEl.value = item.display_name.split(',').slice(0, 3).join(',');
                    addresses[type] = inputEl.value;
                    resultsEl.classList.remove('visible');

                    setMarker(type, lngLat);

                    if (coords.home && coords.work) {
                        fitMapToBoth();
                        fetchRoute();
                    } else {
                        map.flyTo({ center: lngLat, zoom: 14, duration: 800 });
                    }
                });

                resultsEl.appendChild(div);
            });

            if (data.length > 0) resultsEl.classList.add('visible');
            else resultsEl.classList.remove('visible');
        })
        .catch(function () { /* network error, ignore */ });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ===== MAP =====
    function initMap() {
        var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        var tileUrl = isDark
            ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
            : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

        map = new maplibregl.Map({
            container: 'fk-map',
            style: tileUrl,
            center: [10.45, 51.16],
            zoom: 5.5,
            attributionControl: true
        });

        map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        map.addControl(new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false
        }), 'bottom-right');

        // Click on map to set marker
        map.on('click', function (e) {
            var lngLat = [e.lngLat.lng, e.lngLat.lat];
            var type = !coords.home ? 'home' : (!coords.work ? 'work' : 'home');
            setMarker(type, lngLat);

            // Reverse geocode the clicked location
            reverseGeocode(lngLat, type);

            if (coords.home && coords.work) {
                fetchRoute();
            }
        });

        // Restore markers
        if (coords.home) setMarker('home', coords.home, true);
        if (coords.work) setMarker('work', coords.work, true);

        if (coords.home && coords.work) {
            fitMapToBoth();
            fetchRoute();
        }
    }

    function reverseGeocode(lngLat, type) {
        var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' +
            lngLat[1] + '&lon=' + lngLat[0] + '&addressdetails=1';

        fetch(url, { headers: { 'Accept-Language': 'de' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data && data.display_name) {
                var short = data.display_name.split(',').slice(0, 3).join(',');
                addresses[type] = short;
                var inputId = type === 'home' ? 'fk-search-home' : 'fk-search-work';
                var el = document.getElementById(inputId);
                if (el) el.value = short;
                saveCoords();
            }
        })
        .catch(function () { /* ignore */ });
    }

    // ===== MARKERS =====
    function setMarker(type, lngLat, skipSave) {
        if (markers[type]) markers[type].remove();

        var color = type === 'home' ? '#10b981' : '#3b82f6';
        var label = type === 'home' ? '🏠' : '🏢';

        var el = document.createElement('div');
        el.style.cssText =
            'width:38px;height:38px;display:flex;align-items:center;justify-content:center;' +
            'font-size:20px;background:' + color + ';border-radius:50%;' +
            'border:3px solid rgba(255,255,255,0.9);' +
            'box-shadow:0 2px 12px rgba(0,0,0,0.4),0 0 20px ' + color + '44;cursor:grab;';
        el.textContent = label;

        var marker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat(lngLat)
            .addTo(map);

        marker.on('dragend', function () {
            var pos = marker.getLngLat();
            coords[type] = [pos.lng, pos.lat];
            saveCoords();
            reverseGeocode(coords[type], type);
            updateLegend();
            if (coords.home && coords.work) fetchRoute();
        });

        markers[type] = marker;
        coords[type] = lngLat;

        if (!skipSave) saveCoords();
        updateLegend();
        recalculate();
    }

    function fitMapToBoth() {
        if (!coords.home || !coords.work || !map) return;
        var bounds = new maplibregl.LngLatBounds();
        bounds.extend(coords.home);
        bounds.extend(coords.work);
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 });
    }

    // ===== OSRM ROUTING =====
    function fetchRoute() {
        if (!coords.home || !coords.work) return;

        showLoading(true);
        clearRoute();

        var profile = 'driving';
        if (activeMode === 'bike') profile = 'cycling';
        else if (activeMode === 'walk') profile = 'foot';

        var url = OSRM_BASE + '/' + profile + '/' +
            coords.home[0] + ',' + coords.home[1] + ';' +
            coords.work[0] + ',' + coords.work[1] +
            '?overview=full&geometries=geojson&steps=true';

        fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            showLoading(false);
            if (data.code !== 'Ok' || !data.routes || !data.routes[0]) return;

            var route = data.routes[0];
            currentRoute = {
                distance: route.distance / 1000,   // meters → km
                duration: route.duration,            // seconds
                geometry: route.geometry
            };

            drawRoute(route.geometry);
            updateRouteChip();
            recalculate();
            updateCO2();
            updateTransportLinks();
        })
        .catch(function () {
            showLoading(false);
            // Fallback: Haversine
            currentRoute = {
                distance: haversineKm(coords.home, coords.work),
                duration: 0,
                geometry: null
            };
            recalculate();
            updateCO2();
            updateTransportLinks();
        });
    }

    function drawRoute(geometry) {
        if (!map) return;
        clearRoute();

        // Wait for style to be loaded
        if (!map.isStyleLoaded()) {
            map.once('style.load', function () { drawRoute(geometry); });
            return;
        }

        map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: geometry }
        });

        map.addLayer({
            id: 'route-line-shadow',
            type: 'line',
            source: 'route',
            paint: {
                'line-color': '#000000',
                'line-width': 8,
                'line-opacity': 0.15,
                'line-blur': 4
            }
        });

        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#a855f7',
                'line-width': 5,
                'line-opacity': 0.85
            }
        });

        routeLayer = true;
    }

    function clearRoute() {
        if (!map || !routeLayer) return;
        try {
            if (map.getLayer('route-line')) map.removeLayer('route-line');
            if (map.getLayer('route-line-shadow')) map.removeLayer('route-line-shadow');
            if (map.getSource('route')) map.removeSource('route');
        } catch (e) { /* ignore */ }
        routeLayer = null;
        currentRoute = null;
    }

    function showLoading(show) {
        var el = document.getElementById('fk-route-loading');
        if (el) el.classList.toggle('visible', show);
    }

    // ===== HAVERSINE FALLBACK =====
    function haversineKm(c1, c2) {
        var R = 6371;
        var toRad = function (d) { return d * Math.PI / 180; };
        var dLat = toRad(c2[1] - c1[1]);
        var dLon = toRad(c2[0] - c1[0]);
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(c1[1])) * Math.cos(toRad(c2[1])) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ===== CALCULATE =====
    function getDistanceKm() {
        if (!navigator.onLine) {
            var val = parseFloat(document.getElementById('fk-offline-km')?.value);
            return isNaN(val) ? 0 : val;
        }
        if (currentRoute) return currentRoute.distance;
        if (coords.home && coords.work) return haversineKm(coords.home, coords.work);
        return 0;
    }

    function getDuration() {
        return currentRoute ? currentRoute.duration : 0;
    }

    function recalculate() {
        var distKm = getDistanceKm();
        var days = parseInt(document.getElementById('fk-days')?.value) || 0;
        var fuelPrice = parseFloat(document.getElementById('fk-fuel-price')?.value) || DEFAULTS.fuelPrice;
        var consumption = parseFloat(document.getElementById('fk-consumption')?.value) || DEFAULTS.consumption;
        var totalKm = distKm * days * 2;
        var duration = getDuration();

        // Spritkosten (einfach * 2 * Tage)
        var fuelCostMonth = (totalKm / 100) * consumption * fuelPrice;

        // Pendlerpauschale (einfache Strecke!)
        var pauschalePerDay = 0;
        if (distKm <= 20) {
            pauschalePerDay = distKm * PAUSCHALE_30;
        } else {
            pauschalePerDay = 20 * PAUSCHALE_30 + (distKm - 20) * PAUSCHALE_38;
        }
        var pauschaleMonth = (pauschalePerDay * days) / 100;
        var pauschaleYear  = pauschaleMonth * 12;

        // Route stats
        setText('fk-rs-distance', distKm > 0 ? distKm.toFixed(1) + ' km' : '—');
        setText('fk-rs-duration', duration > 0 ? formatDuration(duration) : '—');
        setText('fk-rs-total', totalKm > 0 ? totalKm.toFixed(0) + ' km' : '—');
        setText('fk-rs-fuel', fuelCostMonth > 0 ? fuelCostMonth.toFixed(2) + ' €' : '—');

        // Result cards
        setText('fk-total-km', totalKm > 0 ? totalKm.toFixed(0) + ' km' : '—');
        setText('fk-total-trips', days > 0 ? (days * 2) + '' : '—');
        setText('fk-fuel-cost', fuelCostMonth > 0 ? fuelCostMonth.toFixed(2) + ' €' : '—');
        setText('fk-pauschale', pauschaleMonth > 0 ? pauschaleMonth.toFixed(2) + ' €' : '—');

        updateRouteChip();
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function formatDuration(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.round((seconds % 3600) / 60);
        if (h > 0) return h + 'h ' + m + 'min';
        return m + ' min';
    }

    // ===== ROUTE CHIP ON MAP =====
    function updateRouteChip() {
        var el = document.getElementById('fk-map-route-chip');
        if (!el) return;
        var dist = getDistanceKm();
        var dur = getDuration();
        if (dist > 0) {
            var text = dist.toFixed(1) + ' km';
            if (dur > 0) text += ' · ' + formatDuration(dur);
            el.textContent = text;
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    }

    // ===== CO₂ COMPARISON =====
    function updateCO2() {
        var dist = getDistanceKm();
        if (dist <= 0) return;

        var maxGrams = CO2.car * dist; // car is highest

        setCO2Bar('car',   dist, maxGrams);
        setCO2Bar('ecar',  dist, maxGrams);
        setCO2Bar('bus',   dist, maxGrams);
        setCO2Bar('train', dist, maxGrams);
        setCO2Bar('bike',  dist, maxGrams);
    }

    function setCO2Bar(mode, distKm, maxGrams) {
        var el = document.getElementById('fk-co2-' + mode);
        if (!el) return;
        var grams = CO2[mode] * distKm;
        var pct = maxGrams > 0 ? (grams / maxGrams) * 100 : 0;
        el.style.width = Math.max(pct, 2) + '%';
        el.textContent = grams > 0 ? Math.round(grams) + ' g' : '0 g';
    }

    // ===== TRANSPORT LINKS =====
    function updateTransportLinks() {
        var container = document.getElementById('fk-transport-links');
        if (!container || !coords.home || !coords.work) return;

        var homeLat = coords.home[1], homeLon = coords.home[0];
        var workLat = coords.work[1], workLon = coords.work[0];

        var links = [
            {
                icon: '🚂',
                name: 'Deutsche Bahn',
                desc: 'Zugverbindung suchen',
                url: 'https://reiseauskunft.bahn.de/bin/query.exe/dn?S=' + homeLat + ',' + homeLon + '&Z=' + workLat + ',' + workLon + '&start=1'
            },
            {
                icon: '🗺️',
                name: 'Google Maps',
                desc: 'Route mit allen Verkehrsmitteln',
                url: 'https://www.google.com/maps/dir/' + homeLat + ',' + homeLon + '/' + workLat + ',' + workLon
            },
            {
                icon: '🚌',
                name: 'FlixBus',
                desc: 'Fernbus-Verbindung',
                url: 'https://www.flixbus.de/'
            },
            {
                icon: '🚗',
                name: 'BlaBlaCar',
                desc: 'Mitfahrgelegenheit finden',
                url: 'https://www.blablacar.de/'
            },
            {
                icon: '🚲',
                name: 'Komoot',
                desc: 'Fahrrad-Route planen',
                url: 'https://www.komoot.com/plan/@' + homeLat + ',' + homeLon + ',14z'
            },
            {
                icon: '🎫',
                name: 'Deutschlandticket',
                desc: '49€ Monatsticket Info',
                url: 'https://deutschlandticket.de/'
            }
        ];

        container.innerHTML = links.map(function (l) {
            return '<a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer" class="transport-card">' +
                '<span class="tc-icon">' + l.icon + '</span>' +
                '<div class="tc-info">' +
                    '<div class="tc-name">' + escapeHtml(l.name) + '</div>' +
                    '<div class="tc-desc">' + escapeHtml(l.desc) + '</div>' +
                '</div>' +
                '<span class="tc-arrow">→</span>' +
            '</a>';
        }).join('');
    }

    // ===== LEGEND =====
    function updateLegend() {
        var homeEl = document.getElementById('fk-legend-home-coords');
        var workEl = document.getElementById('fk-legend-work-coords');

        if (homeEl) {
            homeEl.textContent = coords.home
                ? coords.home[1].toFixed(4) + ', ' + coords.home[0].toFixed(4)
                : 'nicht gesetzt';
        }
        if (workEl) {
            workEl.textContent = coords.work
                ? coords.work[1].toFixed(4) + ', ' + coords.work[0].toFixed(4)
                : 'nicht gesetzt';
        }
    }

    // ===== LOCAL STORAGE =====
    function saveCoords() {
        var payload = { addresses: addresses };
        if (coords.home) payload.home = coords.home;
        if (coords.work) payload.work = coords.work;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) {}
    }

    function loadCoords() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            var parsed = JSON.parse(raw);
            if (parsed.home && Array.isArray(parsed.home) && parsed.home.length === 2) coords.home = parsed.home;
            if (parsed.work && Array.isArray(parsed.work) && parsed.work.length === 2) coords.work = parsed.work;
            if (parsed.addresses) {
                addresses.home = parsed.addresses.home || '';
                addresses.work = parsed.addresses.work || '';
            }
        } catch (e) {}
        updateLegend();
    }

    function saveSettings() {
        var fuelPrice = parseFloat(document.getElementById('fk-fuel-price')?.value) || DEFAULTS.fuelPrice;
        var consumption = parseFloat(document.getElementById('fk-consumption')?.value) || DEFAULTS.consumption;
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify({
                mode: activeMode,
                fuelPrice: fuelPrice,
                consumption: consumption
            }));
        } catch (e) {}
    }

    function loadSettings() {
        try {
            var raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return;
            var s = JSON.parse(raw);
            if (s.mode) activeMode = s.mode;
            if (s.fuelPrice) {
                var el = document.getElementById('fk-fuel-price');
                if (el) el.value = s.fuelPrice;
            }
            if (s.consumption) {
                var el2 = document.getElementById('fk-consumption');
                if (el2) el2.value = s.consumption;
            }
        } catch (e) {}
    }

    // ===== RESET =====
    function resetMarkers() {
        if (markers.home) { markers.home.remove(); markers.home = null; }
        if (markers.work) { markers.work.remove(); markers.work = null; }
        coords = { home: null, work: null };
        addresses = { home: '', work: '' };
        clearRoute();
        localStorage.removeItem(STORAGE_KEY);

        var homeInput = document.getElementById('fk-search-home');
        var workInput = document.getElementById('fk-search-work');
        if (homeInput) homeInput.value = '';
        if (workInput) workInput.value = '';

        currentRoute = null;
        updateLegend();
        recalculate();
        updateRouteChip();
    }

    // ===== SAVE MONTH =====
    function saveMonth() {
        var distKm = getDistanceKm();
        var days = parseInt(document.getElementById('fk-days')?.value) || 0;
        if (distKm <= 0 || days <= 0) return;

        var now = new Date();
        var monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        var totalKm = distKm * days * 2;
        var fuelPrice = parseFloat(document.getElementById('fk-fuel-price')?.value) || DEFAULTS.fuelPrice;
        var consumption = parseFloat(document.getElementById('fk-consumption')?.value) || DEFAULTS.consumption;
        var fuelCost = (totalKm / 100) * consumption * fuelPrice;

        var pauschalePerDay = 0;
        if (distKm <= 20) {
            pauschalePerDay = distKm * PAUSCHALE_30;
        } else {
            pauschalePerDay = 20 * PAUSCHALE_30 + (distKm - 20) * PAUSCHALE_38;
        }
        var pauschaleMonth = (pauschalePerDay * days) / 100;

        var entry = {
            month: monthKey,
            days: days,
            distanceKm: parseFloat(distKm.toFixed(1)),
            totalKm: parseFloat(totalKm.toFixed(0)),
            fuelCost: parseFloat(fuelCost.toFixed(2)),
            pauschale: parseFloat(pauschaleMonth.toFixed(2)),
            mode: activeMode,
            savedAt: now.toISOString()
        };

        var history = loadHistory();
        var idx = history.findIndex(function (h) { return h.month === monthKey; });
        if (idx >= 0) history[idx] = entry;
        else history.unshift(entry);

        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}

        saveSettings();
        renderHistory();

        // Feedback
        var btn = document.getElementById('fk-save-btn');
        if (btn) {
            var orig = btn.textContent;
            btn.textContent = '✅ Gespeichert!';
            btn.style.pointerEvents = 'none';
            setTimeout(function () { btn.textContent = orig; btn.style.pointerEvents = ''; }, 1500);
        }
    }

    function loadHistory() {
        try {
            var raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) { return []; }
    }

    function deleteHistoryEntry(month) {
        var history = loadHistory().filter(function (h) { return h.month !== month; });
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
        renderHistory();
    }

    function renderHistory() {
        var tbody = document.getElementById('fk-history-body');
        var emptyState = document.getElementById('fk-history-empty');
        var summaryEl = document.getElementById('fk-history-summary');
        if (!tbody) return;

        var history = loadHistory();

        if (history.length === 0) {
            tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = '';
            if (summaryEl) summaryEl.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (summaryEl) summaryEl.style.display = '';

        var monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
        var modeIcons = { car: '🚗', bike: '🚲', walk: '🚶', transit: '🚌' };

        var totalPauschale = 0;
        var totalFuel = 0;

        tbody.innerHTML = history.map(function (h) {
            var parts = h.month.split('-');
            var label = monthNames[parseInt(parts[1]) - 1] + ' ' + parts[0];
            totalPauschale += h.pauschale || 0;
            totalFuel += h.fuelCost || 0;
            return '<tr>' +
                '<td>' + label + '</td>' +
                '<td>' + (modeIcons[h.mode] || '🚗') + '</td>' +
                '<td class="mono">' + h.days + '</td>' +
                '<td class="mono">' + h.distanceKm + ' km</td>' +
                '<td class="mono">' + h.totalKm + ' km</td>' +
                '<td class="mono">' + (h.fuelCost || 0).toFixed(2) + ' €</td>' +
                '<td class="mono" style="color:var(--primary);font-weight:700;">' + h.pauschale.toFixed(2) + ' €</td>' +
                '<td><button class="history-del" title="Löschen" data-month="' + h.month + '">🗑️</button></td>' +
                '</tr>';
        }).join('');

        // Summary
        if (summaryEl) {
            summaryEl.innerHTML =
                '<span>Gesamt Sprit: <strong>' + totalFuel.toFixed(2) + ' €</strong></span>' +
                '<span>Gesamt Pauschale: <strong>' + totalPauschale.toFixed(2) + ' €</strong></span>';
        }

        // Delete listeners
        tbody.querySelectorAll('.history-del').forEach(function (btn) {
            btn.addEventListener('click', function () {
                deleteHistoryEntry(this.getAttribute('data-month'));
            });
        });
    }

    // ===== THEME TOGGLE =====
    function toggleTheme() {
        var html = document.documentElement;
        var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);

        var btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
        try { localStorage.setItem('mwl_theme', next); } catch (e) {}

        if (map) {
            var tileUrl = next === 'light'
                ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
                : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
            map.setStyle(tileUrl);
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
            if (saved) {
                document.documentElement.setAttribute('data-theme', saved);
                var btn = document.getElementById('themeToggle');
                if (btn) btn.textContent = saved === 'light' ? '☀️' : '🌙';
            }
        } catch (e) {}
    }

    // ===== GLOBALS =====
    window.fkResetMarkers = resetMarkers;
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
