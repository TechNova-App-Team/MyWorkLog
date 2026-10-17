// ═══ CORE: WEATHER ═══
    // --- DASHBOARD HELPER FUNCTIONS (Premium Enhancements) ---
    
    // Smooth value animation for dashboard numbers
    // --- WEATHER INTEGRATION (Open-Meteo API - Free, No API Key) ---
    let weatherData = null;
    let weatherLastFetch = 0;
    let weatherAutoRefreshInterval = null;
    const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 Minuten Cache
    const WEATHER_REFRESH_INTERVAL = 30 * 60 * 1000; // Aktualisiere Wetter alle 30 Min

    // Weather Code Mapping (WMO Standard)
    const weatherCodeMap = {
        0: { icon: '☀️', desc: 'Klar' },
        1: { icon: '🌤️', desc: 'Überwiegend klar' },
        2: { icon: '⛅', desc: 'Teilweise bewölkt' },
        3: { icon: '☁️', desc: 'Bewölkt' },
        45: { icon: '🌫️', desc: 'Nebel' },
        48: { icon: '🌫️', desc: 'Reifnebel' },
        51: { icon: '🌧️', desc: 'Leichter Nieselregen' },
        53: { icon: '🌧️', desc: 'Nieselregen' },
        55: { icon: '🌧️', desc: 'Starker Nieselregen' },
        56: { icon: '🌨️', desc: 'Gefrierender Nieselregen' },
        57: { icon: '🌨️', desc: 'Starker gefrierender Nieselregen' },
        61: { icon: '🌧️', desc: 'Leichter Regen' },
        63: { icon: '🌧️', desc: 'Regen' },
        65: { icon: '🌧️', desc: 'Starker Regen' },
        66: { icon: '🌨️', desc: 'Gefrierender Regen' },
        67: { icon: '🌨️', desc: 'Starker gefrierender Regen' },
        71: { icon: '❄️', desc: 'Leichter Schneefall' },
        73: { icon: '❄️', desc: 'Schneefall' },
        75: { icon: '❄️', desc: 'Starker Schneefall' },
        77: { icon: '🌨️', desc: 'Schneekörner' },
        80: { icon: '🌦️', desc: 'Leichte Regenschauer' },
        81: { icon: '🌦️', desc: 'Regenschauer' },
        82: { icon: '⛈️', desc: 'Starke Regenschauer' },
        85: { icon: '🌨️', desc: 'Leichte Schneeschauer' },
        86: { icon: '🌨️', desc: 'Schneeschauer' },
        95: { icon: '⛈️', desc: 'Gewitter' },
        96: { icon: '⛈️', desc: 'Gewitter mit leichtem Hagel' },
        99: { icon: '⛈️', desc: 'Gewitter mit Hagel' }
    };

    function getWeatherIcon(code, isNight = false) {
        const weather = weatherCodeMap[code] || { icon: '🌡️', desc: 'Unbekannt' };
        // Nacht-Varianten für klare Tage
        if (isNight && (code === 0 || code === 1)) {
            return { icon: '🌙', desc: weather.desc };
        }
        return weather;
    }

    // Ohne Zeitlimit haengt der Abruf in einem WLAN mit Vorschaltseite (Messe,
    // Schule, Hotel) beliebig lange, und das Wetter bleibt leer.
    async function fetchWeather(lat, lon) {
        try {
            // hourly = dieselben Felder wie current, stundenweise fuer 6 Tage (~10 KB).
            // Daraus lebt _ausVorhersage(), wenn der letzte Abruf alt ist.
            const felder = 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m';
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${felder}&hourly=${felder}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Europe%2FBerlin&forecast_days=6`;
            const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
            const timer = ctrl ? setTimeout(() => ctrl.abort(), 10000) : null;
            let response;
            try { response = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined); }
            finally { if (timer) clearTimeout(timer); }
            if (!response.ok) throw new Error('Weather API Fehler');
            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Weather fetch error:', err);
            return null;
        }
    }

    // Bis v8.5.0 zeigte ein einziger fehlgeschlagener Abruf bei abgelaufenem Cache
    // GAR KEIN Wetter, bis zum naechsten 30-min-Takt — auf allen Geraeten zugleich,
    // sobald Open-Meteo oder das Netz kurz hakte (gemeldet 13.10.2026). Jetzt: der
    // alte Wert bleibt bis WEATHER_STALE_MAX stehen, und es wird nach 1/3/10 min
    // erneut versucht (plus beim online-Ereignis).
    //
    // 🔴 Das reichte am Handy nicht (gemeldet 14.10.2026, „mal da, mal weg“,
    // im Emulator nachgestellt): App morgens oeffnen, letzter Abruf vom Vorabend
    // (> 6 h), Netz hakt in dem Moment → Chip weg. Drei Versuche, dann Ruhe bis
    // zum 30-min-Takt — und das `online`-Ereignis kommt am Handy bei kurzem
    // Abbruch oft gar nicht. Deshalb jetzt:
    //  - Ist der Cache alt, gilt die STUNDENVORHERSAGE fuer jetzt (hourly, bis
    //    6 Tage) — ein Wert fuer diese Stunde statt einer Temperatur von gestern
    //    Abend. Aeltere Cache-Eintraege ohne hourly fallen auf WEATHER_STALE_MAX.
    //  - Versuche hoeren nicht auf (danach alle 10 min), solange kein frischer
    //    Abruf gelang, und die Rueckkehr in die App (visibilitychange) fragt neu.
    const WEATHER_STALE_MAX = 6 * 60 * 60 * 1000;
    const WEATHER_RETRY_MS = [60 * 1000, 3 * 60 * 1000, 10 * 60 * 1000];
    let _weatherRetryNr = 0;
    let _weatherRetryTimer = null;

    function _weatherRetry() {
        if (_weatherRetryTimer) return;
        const ms = WEATHER_RETRY_MS[Math.min(_weatherRetryNr, WEATHER_RETRY_MS.length - 1)];
        _weatherRetryTimer = setTimeout(() => {
            _weatherRetryTimer = null;
            _weatherRetryNr++;
            getLocationAndWeather();
        }, ms);
    }
    function _weatherNachholen() {
        if (weatherLastFetch && Date.now() - weatherLastFetch < WEATHER_CACHE_DURATION) return;
        _weatherRetryNr = 0;
        getLocationAndWeather();
    }
    window.addEventListener('online', _weatherNachholen);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') _weatherNachholen(); });

    // Werte der laufenden Stunde aus der Vorhersage, als waeren sie `current`.
    // Die Zeiten liefert Open-Meteo in Europe/Berlin (timezone= im Abruf), also
    // wird "jetzt" auch dort gerechnet, nicht in der Zone des Geraets.
    function _ausVorhersage(d) {
        const h = d && d.hourly;
        if (!h || !Array.isArray(h.time)) return null;
        let jetzt;
        try {
            jetzt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
                .format(new Date()).replace(' ', 'T') + ':00';
        } catch (e) { return null; }
        const i = h.time.indexOf(jetzt);
        if (i < 0 || h.temperature_2m[i] == null || h.weather_code[i] == null) return null;
        const current = { ...(d.current || {}), time: jetzt };
        ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'weather_code', 'wind_speed_10m']
            .forEach((k) => { if (Array.isArray(h[k]) && h[k][i] != null) current[k] = h[k][i]; });
        return { ...d, current, ausVorhersage: true };
    }

    async function getLocationAndWeather() {
        let parsed = null;
        try { parsed = JSON.parse(localStorage.getItem('myworklog_weather') || 'null'); } catch (e) { parsed = null; }
        if (parsed && parsed.data && parsed.timestamp) {
            const age = Date.now() - parsed.timestamp;
            const vorhersage = age >= WEATHER_CACHE_DURATION ? _ausVorhersage(parsed.data) : null;
            if (age < WEATHER_CACHE_DURATION || vorhersage || (!weatherData && age < WEATHER_STALE_MAX)) {
                weatherData = vorhersage || parsed.data;
                weatherLastFetch = parsed.timestamp;
                updateWeatherUI();
                updateGreetingWeather();
            }
            if (age < WEATHER_CACHE_DURATION) return;
        }

        // Check if we have saved coordinates
        const savedLat = localStorage.getItem('myworklog_weather_lat');
        const savedLon = localStorage.getItem('myworklog_weather_lon');
        const savedCity = localStorage.getItem('myworklog_weather_city');

        if (savedLat && savedLon) {
            const data = await fetchWeather(savedLat, savedLon);
            if (data) {
                weatherData = { ...data, cityName: savedCity || 'Standort' };
                localStorage.setItem('myworklog_weather', JSON.stringify({
                    data: weatherData,
                    timestamp: Date.now()
                }));
                weatherLastFetch = Date.now();
                _weatherRetryNr = 0;
                updateWeatherUI();
                updateGreetingWeather();
            } else {
                _weatherRetry();
            }
        } else {
            // Show location setup prompt in modal
            updateWeatherUINoLocation();
        }
    }

    function startWeatherAutoRefresh() {
        // Stoppe existierendes Interval wenn vorhanden
        if (weatherAutoRefreshInterval) {
            clearInterval(weatherAutoRefreshInterval);
        }
        
        // Starte neues Interval: Wetter alle 30 Minuten aktualisieren
        weatherAutoRefreshInterval = setInterval(async () => {
            const savedLat = localStorage.getItem('myworklog_weather_lat');
            const savedLon = localStorage.getItem('myworklog_weather_lon');
            const savedCity = localStorage.getItem('myworklog_weather_city');

            if (savedLat && savedLon) {
                console.log('🔄 Auto-Aktualisiere Wetter für:', savedCity);
                // Force refresh (ignoriere Cache)
                const data = await fetchWeather(savedLat, savedLon);
                if (data) {
                    weatherData = { ...data, cityName: savedCity };
                    localStorage.setItem('myworklog_weather', JSON.stringify({
                        data: weatherData,
                        timestamp: Date.now()
                    }));
                    weatherLastFetch = Date.now();
                    updateWeatherUI();
                    updateGreetingWeather();
                    console.log('✅ Wetter aktualisiert');
                }
            }
        }, WEATHER_REFRESH_INTERVAL);
        
        console.log('⏰ Wetter Auto-Refresh gestartet (alle 30 Min)');
    }

    function requestLocationPermission() {
        if (!navigator.geolocation) {
            showCustomMessage('❌ Fehler', 'Geolocation wird nicht unterstützt.', 'error');
            return;
        }

        showCustomMessage('📍 Standort wird ermittelt...', 'Bitte warten...', 'info');

        // Erst schnell mit niedrigerer Genauigkeit versuchen, dann ggf. mit GPS
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                localStorage.setItem('myworklog_weather_lat', latitude);
                localStorage.setItem('myworklog_weather_lon', longitude);
                
                // Try to get city name via reverse geocoding
                try {
                    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                    const geoRes = await fetch(geoUrl);
                    const geoData = await geoRes.json();
                    const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Dein Standort';
                    localStorage.setItem('myworklog_weather_city', cityName);
                } catch (e) {
                    localStorage.setItem('myworklog_weather_city', 'Dein Standort');
                }

                // Fetch weather
                const data = await fetchWeather(latitude, longitude);
                if (data) {
                    const cityName = localStorage.getItem('myworklog_weather_city') || 'Dein Standort';
                    weatherData = { ...data, cityName };
                    localStorage.setItem('myworklog_weather', JSON.stringify({
                        data: weatherData,
                        timestamp: Date.now()
                    }));
                    weatherLastFetch = Date.now();
                    updateWeatherUI();
                    updateGreetingWeather();
                    startWeatherAutoRefresh(); // Auto-Refresh für GPS-Standort
                    showCustomMessage('✅ Wetter aktiviert', `Standort: ${cityName}`, 'success');
                }
            },
            (error) => {
                console.warn('Geolocation Versuch 1 (schnell) fehlgeschlagen:', error.code, error.message);
                // Fallback: Zweiter Versuch mit enableHighAccuracy: false und längerem Timeout
                if (error.code === 3 /* TIMEOUT */ || error.code === 2 /* POSITION_UNAVAILABLE */) {
                    console.log('🔄 Zweiter Versuch mit niedrigerer Genauigkeit...');
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            const { latitude, longitude } = position.coords;
                            localStorage.setItem('myworklog_weather_lat', latitude);
                            localStorage.setItem('myworklog_weather_lon', longitude);
                            try {
                                const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                                const geoRes = await fetch(geoUrl);
                                const geoData = await geoRes.json();
                                const cityName = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Dein Standort';
                                localStorage.setItem('myworklog_weather_city', cityName);
                            } catch (e) {
                                localStorage.setItem('myworklog_weather_city', 'Dein Standort');
                            }
                            const data = await fetchWeather(latitude, longitude);
                            if (data) {
                                const cityName = localStorage.getItem('myworklog_weather_city') || 'Dein Standort';
                                weatherData = { ...data, cityName };
                                localStorage.setItem('myworklog_weather', JSON.stringify({ data: weatherData, timestamp: Date.now() }));
                                weatherLastFetch = Date.now();
                                updateWeatherUI();
                                updateGreetingWeather();
                                startWeatherAutoRefresh(); // Auto-Refresh für GPS-Fallback
                                showCustomMessage('✅ Wetter aktiviert', `Standort: ${cityName}`, 'success');
                            }
                        },
                        (error2) => {
                            console.error('Geolocation Versuch 2 ebenfalls fehlgeschlagen:', error2);
                            weatherShowCityInput('Automatische Standort-Erkennung fehlgeschlagen. Gib deine Stadt manuell ein:');
                        },
                        { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 }
                    );
                } else {
                    // Fehlercode 1 = PERMISSION_DENIED
                    showCustomMessage('❌ Standort-Zugriff verweigert', 
                        'Bitte erlaube den Standortzugriff in deinem Browser:\n\n' +
                        '• Klicke auf das 🔒 Symbol in der Adressleiste\n' +
                        '• Setze "Standort" auf "Erlauben"\n' +
                        '• Seite neu laden', 'error');
                }
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        );
    }

    // ═══ LIVE WIDGET — Atmospheric Diorama ═══

    // Map WMO weather code → CSS condition class.
    // Conditions: clear-day, clear-night, partly-day, partly-night, cloudy, rain, storm, snow, fog
    function getWeatherCondition(code, isNight) {
        if (code === 0)               return isNight ? 'clear-night' : 'clear-day';
        if (code === 1)               return isNight ? 'clear-night' : 'clear-day';
        if (code === 2)               return isNight ? 'partly-night' : 'partly-day';
        if (code === 3)               return 'cloudy';
        if (code === 45 || code === 48) return 'fog';
        if (code >= 51 && code <= 67) return 'rain';
        if (code >= 71 && code <= 77) return 'snow';
        if (code >= 80 && code <= 82) return 'rain';
        if (code >= 85 && code <= 86) return 'snow';
        if (code >= 95 && code <= 99) return 'storm';
        return 'cloudy';
    }

    // ── Ruhende Ebenen (v8.2.4) ──
    // Seit v8.5.16 malt weather-szene.js die Szene auf wenige Leinwaende; hier bleiben nur noch
    // die Animationen der Figur (Schirm, Zittern, …). Der Text darunter ist die Vorgeschichte.
    // Die Szene traegt ALLE Wetterlagen gleichzeitig im DOM (Sonne, Polarlicht,
    // Gewitterwolken, Nebel, Tornado, Flugzeug …) und blendet per Deckkraft um.
    // Deren Animationen liefen aber weiter: bei "bewoelkt, nachts" drehten sich
    // drei Gewitterwolken mit 34 px Blur und vier Nebelbaenke 724x235 mit Blur,
    // alle unsichtbar. Am Handy reicht der GPU-Kachelspeicher dafuer nicht,
    // Chrome verwirft Kacheln und malt neu — das gemeldete Flackern (09.10.2026,
    // S25 Ultra; am PC unsichtbar). Hier bekommt jedes animierte Element, dessen
    // Vorfahren auf Deckkraft 0 stehen, `wl-ruht` (animation: none → keine
    // Ebene). 1,6 s Verzug, damit Ueberblendungen beim Wetterwechsel fertig sind.
    // 🔴 Anhalten reicht nicht: eine Himmelsebene mit opacity 0 bleibt als eigene
    // Compositing-Ebene angelegt und belegt Grafikspeicher (gemessen bei
    // „bewoelkt, nachts“: Sonne, Polarlicht, Gewitterwolken, Regen, Blitze je
    // 7–10 MB, zusammen ~44 MB fuer nichts). Am Handy reichte der Speicher dann
    // nicht mehr fuer das Sichtbare — Mond, Werte und Vorhersage verschwanden,
    // Kacheln sprangen (14.10.2026, im Emulator mit begrenztem GPU-Budget
    // nachgestellt). Deshalb bekommen ganz ausgeblendete Ebenen zusaetzlich
    // `wl-aus` (visibility: hidden) — Chrome zeichnet sie dann nicht. Bei jedem
    // Lagewechsel faellt die Klasse SOFORT, damit das Einblenden sichtbar bleibt.
    function _ruhendeEbenen(widget) {
        widget.querySelectorAll('.wl-ruht').forEach(e => e.classList.remove('wl-ruht'));
        widget.querySelectorAll(':scope > .wl-aus').forEach(e => e.classList.remove('wl-aus'));
        clearTimeout(widget._ruheUhr);
        widget._ruheUhr = setTimeout(() => {
            if (!widget.isConnected || !widget.getAnimations) return;
            widget.querySelectorAll(':scope > [aria-hidden="true"]').forEach(e => {
                if (parseFloat(getComputedStyle(e).opacity) === 0) e.classList.add('wl-aus');
            });
            const ruhen = new Set();
            widget.getAnimations({ subtree: true }).forEach(a => {
                const el = a.effect && a.effect.target;
                if (!el || !(el instanceof Element)) return;
                // Die eigene Deckkraft zaehlt nur, wenn keine Animation sie bewegt
                // (ein funkelnder Stern ist zwischendurch fast 0, aber sichtbar).
                const eigeneBewegt = el.getAnimations().some(x => x.effect.getKeyframes().some(k => 'opacity' in k));
                for (let p = eigeneBewegt ? el.parentElement : el; p && p !== widget; p = p.parentElement) {
                    const c = getComputedStyle(p);
                    if (c.display === 'none' || parseFloat(c.opacity) === 0) { ruhen.add(el); break; }
                }
            });
            ruhen.forEach(el => el.classList.add('wl-ruht'));
        }, 1600);
    }

    // Nur noch die Figur — Berge, Boden und Himmel malt weather-szene.js darunter.
    function buildLandscape() {
        return `
            <div class="weather-landscape" aria-hidden="true">

                <!-- Rueckenfigur (seit v8.5.16): schaut in die Landschaft wie die Szene darunter
                     gemalt ist. Klassen char-* und data-* bleiben — _applyCharacterReactions
                     schaltet daran Schirm, Muetze, Hut, Schal, Mantel, Sonnenbrille, Zittern. -->
                <div class="weather-character" data-umbrella="0" data-sunglasses="0" data-sunscreen="0" data-scarf="0" data-hat="0" data-sunhat="0" data-coat="0" data-shiver="0">
                    <svg viewBox="0 0 200 320" class="char-svg" preserveAspectRatio="xMidYMax meet">
                        <defs>
                            <linearGradient id="wf-hoodie" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stop-color="#5b7787"/><stop offset="1" stop-color="#3c5462"/>
                            </linearGradient>
                            <linearGradient id="wf-jeans" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stop-color="#34495f"/><stop offset="1" stop-color="#26364a"/>
                            </linearGradient>
                            <linearGradient id="wf-haar" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stop-color="#4a3528"/><stop offset="1" stop-color="#2b1e17"/>
                            </linearGradient>
                            <linearGradient id="wf-mantel" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stop-color="#3b4250"/><stop offset="1" stop-color="#272c36"/>
                            </linearGradient>
                            <linearGradient id="wf-schirm" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stop-color="#34507e"/><stop offset="1" stop-color="#1f3254"/>
                            </linearGradient>
                            <radialGradient id="wf-schatten" cx="0.5" cy="0.5" r="0.5">
                                <stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
                            </radialGradient>
                        </defs>

                        <ellipse class="char-shadow" cx="100" cy="300" rx="34" ry="5" fill="url(#wf-schatten)" />

                        <g class="char-body">
                            <!-- Beine (Jeans) und Schuhe von hinten -->
                            <path class="wf-jeans" d="M 82 184 L 99 184 Q 98 214 97 240 L 95 291 L 85 291 L 84 240 Q 82 214 82 184 Z" />
                            <path class="wf-jeans" d="M 101 184 L 118 184 Q 118 214 116 240 L 115 291 L 105 291 L 103 240 Q 102 214 101 184 Z" />
                            <path class="wf-volumen" d="M 92 186 L 99 184 Q 98 214 97 240 L 95 291 L 91 291 Q 92 240 92 186 Z" />
                            <path class="wf-volumen" d="M 112 186 L 118 184 Q 118 214 116 240 L 115 291 L 111 291 Q 112 240 112 186 Z" />
                            <path class="wf-schuh" d="M 83 288 Q 90 285 97 288 L 97 297 Q 90 300 83 297 Z" />
                            <path class="wf-schuh" d="M 103 288 Q 110 285 117 288 L 117 297 Q 110 300 103 297 Z" />
                            <path class="wf-sohle" d="M 83 296 Q 90 299 97 296 L 97 299 Q 90 302 83 299 Z" />
                            <path class="wf-sohle" d="M 103 296 Q 110 299 117 296 L 117 299 Q 110 302 103 299 Z" />

                            <!-- Linker Arm (haengt) -->
                            <path class="wf-aermel" d="M 74 110 Q 67 116 66 140 L 65 170 L 73 171 L 75 142 Q 77 124 80 116 Z" />
                            <ellipse class="wf-haut" cx="69" cy="176" rx="4.2" ry="6" />
                            <!-- Rechter Arm: haengend, oder gehoben, wenn der Schirm offen ist -->
                            <g class="wf-arm-haengt">
                                <path class="wf-aermel" d="M 126 110 Q 133 116 134 140 L 135 170 L 127 171 L 125 142 Q 123 124 120 116 Z" />
                                <ellipse class="wf-haut" cx="131" cy="176" rx="4.2" ry="6" />
                            </g>
                            <g class="wf-arm-hoch">
                                <path class="wf-aermel" d="M 124 108 Q 137 112 141 128 L 145 148 L 137 151 L 133 133 Q 130 122 120 117 Z" />
                                <path class="wf-aermel" d="M 137 150 L 147 122 L 154 125 L 145 152 Z" />
                                <ellipse class="wf-haut" cx="151" cy="119" rx="4.6" ry="5.4" />
                            </g>

                            <!-- Kapuzenpulli von hinten: Rumpf, Kapuze, Saum, Schattenseite -->
                            <path class="wf-hoodie" d="M 72 110 Q 76 104 92 102 L 108 102 Q 124 104 128 110 L 126 150 Q 124 172 121 189 L 79 189 Q 76 172 74 150 Z" />
                            <path class="wf-volumen" d="M 111 104 Q 124 105 128 110 L 126 150 Q 124 172 121 189 L 110 189 Q 114 150 111 104 Z" />
                            <path class="wf-saum" d="M 79 183 L 121 183 L 121 189 L 79 189 Z" />
                            <path class="wf-kapuze" d="M 85 100 Q 100 95 115 100 Q 119 113 110 125 Q 100 131 90 125 Q 81 113 85 100 Z" />
                            <path class="wf-kapuze-innen" d="M 90 103 Q 100 100 110 103 Q 112 112 106 119 Q 100 122 94 119 Q 88 112 90 103 Z" />

                            <!-- Kopf von hinten: Nacken, Ohren, Haar -->
                            <g class="char-head-group">
                                <rect class="wf-haut" x="95" y="88" width="10" height="14" rx="3" />
                                <ellipse class="wf-haut" cx="86.6" cy="80" rx="2.3" ry="4.2" />
                                <ellipse class="wf-haut" cx="113.4" cy="80" rx="2.3" ry="4.2" />
                                <path class="wf-haar" d="M 86 77 Q 85 60 100 59 Q 115 60 114 77 Q 114 89 108 94 Q 100 97 92 94 Q 86 89 86 77 Z" />
                                <path class="wf-haar-licht" d="M 90 66 Q 100 61 110 66 Q 106 64 100 64 Q 94 64 90 66 Z" />
                            </g>
                        </g>

                        <!-- MANTEL: lang, ueber Pulli und Oberschenkel; Aermel faerbt das CSS mit -->
                        <g class="char-coat">
                            <path class="wf-mantel" d="M 70 108 Q 76 101 92 99 L 108 99 Q 124 101 130 108 L 132 150 Q 133 200 136 250 L 64 250 Q 67 200 68 150 Z" />
                            <path class="wf-volumen" d="M 112 101 Q 124 102 130 108 L 132 150 Q 133 200 136 250 L 114 250 Q 116 170 112 101 Z" />
                            <path class="wf-mantel-naht" d="M 100 206 L 100 250" />
                            <path class="wf-mantel-guertel" d="M 69 168 L 131 168 L 131 175 L 69 175 Z" />
                        </g>

                        <!-- SCHAL: um den Hals, ein Ende haengt ueber den Ruecken -->
                        <g class="char-scarf">
                            <path class="wf-schal" d="M 87 97 Q 100 103 113 97 L 114 106 Q 100 112 86 106 Z" />
                            <path class="wf-schal" d="M 103 104 L 110 104 L 112 140 L 104 141 Z" />
                            <path class="wf-schal-rippe" d="M 104 115 L 111 115 M 104 124 L 111 124 M 104 133 L 112 133" />
                            <path class="wf-schal-fransen" d="M 105 141 L 105 146 M 108 141 L 108 146 M 111 140 L 111 145" />
                        </g>

                        <!-- SONNENBRILLE: hochgeschoben auf dem Kopf (von hinten nur der Rahmen) -->
                        <g class="char-sunglasses">
                            <path class="wf-brille" d="M 88 67 Q 100 61 112 67 L 112 70.5 Q 100 64.5 88 70.5 Z" />
                            <path class="wf-brille-buegel" d="M 88 69 Q 86.5 74 87 78 M 112 69 Q 113.5 74 113 78" />
                        </g>

                        <!-- STRICKMUETZE mit Bommel -->
                        <g class="char-hat">
                            <path class="wf-muetze" d="M 85 75 Q 84 56 100 54 Q 116 56 115 75 Q 100 71 85 75 Z" />
                            <path class="wf-muetze-rand" d="M 85 70 Q 100 66 115 70 L 115.5 78 Q 100 74 84.5 78 Z" />
                            <path class="wf-muetze-rippe" d="M 92 58 L 91 70 M 100 55 L 100 68 M 108 58 L 109 70" />
                            <circle class="wf-bommel" cx="100" cy="51" r="5.5" />
                        </g>

                        <!-- STROHHUT, leicht von oben gesehen -->
                        <g class="char-sunhat">
                            <ellipse class="wf-strohhut" cx="100" cy="69" rx="30" ry="7.5" />
                            <path class="wf-strohhut" d="M 87 69 Q 87 54 100 53 Q 113 54 113 69 Z" />
                            <path class="wf-hutband" d="M 87.5 64 Q 100 61 112.5 64 L 112.8 68 Q 100 65 87.2 68 Z" />
                        </g>

                        <!-- SCHIRM: in der gehobenen rechten Hand, Bahnen abwechselnd heller -->
                        <g class="char-umbrella">
                            <line class="wf-schirm-stock" x1="151" y1="122" x2="128" y2="42" />
                            <path class="wf-schirm" d="M 60 44 Q 128 -30 196 44 Q 179 50 162 44 Q 145 50 128 44 Q 111 50 94 44 Q 77 50 60 44 Z" />
                            <path class="wf-schirm-bahn" d="M 128 7 L 94 44 Q 111 50 128 44 Z" />
                            <path class="wf-schirm-bahn" d="M 128 7 L 162 44 Q 179 50 196 44 Z" />
                            <path class="wf-schirm-rippe" d="M 128 7 L 60 44 M 128 7 L 94 44 M 128 7 L 128 44 M 128 7 L 162 44 M 128 7 L 196 44" />
                            <circle class="wf-schirm-spitze" cx="128" cy="6" r="2.4" />
                        </g>

                        <!-- SONNENCREME: Glitzern an Nacken und Schultern -->
                        <g class="char-sunscreen-spark">
                            <path d="M 80 104 L 86 104 M 83 101 L 83 107" stroke-width="1.6" />
                            <path d="M 116 106 L 122 106 M 119 103 L 119 109" stroke-width="1.6" />
                            <path d="M 97 92 L 102 92 M 99.5 89.5 L 99.5 94.5" stroke-width="1.3" />
                        </g>
                    </svg>
                </div>
            </div>
        `;
    }

    function buildWidgetScaffold() {
        return `
            ${buildLandscape()}
            <div class="weather-vignette" aria-hidden="true"></div>
            <div class="weather-content"></div>
        `;
    }

    function ensureWidgetScaffold(widget) {
        if (widget.dataset.scaffolded === '1') return;
        widget.innerHTML = buildWidgetScaffold();
        widget.dataset.scaffolded = '1';
        // Start paused — gets unpaused when the modal opens.
        widget.classList.add('is-paused');
    }

    // SVG icon helper for stat icons (Lucide-style stroke 1.5).
    function _wIcon(path) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }

    // Himmel, Licht, Landschaft und alles Bewegte malt weather-szene.js (seit v8.5.16).
    // Neu gemalt wird dort nur, wenn sich Lage, 10-Minuten-Fenster oder Groesse aendern.
    function _szene(widget, cond, wind) {
        if (typeof WetterSzene === 'undefined') return;
        const { sunrise, sunset } = _sunTimes();
        WetterSzene.zeichne(widget, { cond, minute: _nowMinutes(), sunrise, sunset, wind });
    }

    function renderWeatherWidgetContent(widget) {
        const content = widget.querySelector('.weather-content');
        if (!content) return;
        if (!weatherData || !weatherData.current) return;

        // Real values from weatherData…
        const minute  = _nowMinutes();   // honours demo time override
        const hour    = Math.floor(minute / 60);
        const isNight = hour < 6 || hour >= 21;
        const code    = weatherData.current.weather_code;
        let cond      = getWeatherCondition(code, isNight);
        let meta      = getWeatherIcon(code, isNight);
        let temp      = Math.round(weatherData.current.temperature_2m);
        let wind      = Math.round(weatherData.current.wind_speed_10m);
        const feels   = Math.round(weatherData.current.apparent_temperature);
        const hum     = Math.round(weatherData.current.relative_humidity_2m);
        let city      = weatherData.cityName || 'Dein Standort';

        // …optionally overridden by demo mode (set via window.weatherDemo.*).
        if (_demoState && _demoState.cond) {
            cond = _demoState.cond;
            const demoCode = _DEMO_CODE_MAP[cond] || 0;
            meta = getWeatherIcon(demoCode, isNight);
            city = '🎬 Demo · ' + (_demoState.label || cond);
        }
        if (_demoState && _demoState.wind != null) wind = _demoState.wind;
        if (_demoState && _demoState.temp != null) temp = _demoState.temp;

        // Slot in particles per condition. All layer hosts get refreshed on condition change.
        widget.dataset.condition = cond;
        _szene(widget, cond, wind);

        _ruhendeEbenen(widget);

        // Character reactions to weather (umbrella, sunscreen, scarf, shiver, etc).
        _applyCharacterReactions(widget, cond, temp);

        // 5-day forecast strip
        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        let fcHtml = '';
        if (weatherData.daily && weatherData.daily.time) {
            const days = Math.min(5, weatherData.daily.time.length - 1);
            for (let i = 1; i <= days; i++) {
                const d   = new Date(weatherData.daily.time[i]);
                const dn  = dayNames[d.getDay()];
                const dw  = getWeatherIcon(weatherData.daily.weather_code[i]);
                const mx  = Math.round(weatherData.daily.temperature_2m_max[i]);
                const mn  = Math.round(weatherData.daily.temperature_2m_min[i]);
                fcHtml += `
                    <div class="weather-forecast-day" title="${esc(dw.desc)}">
                        <div class="weather-forecast-day-name">${dn}</div>
                        <div class="weather-forecast-day-icon">${mwlIconFromEmoji(dw.icon, 22)}</div>
                        <div class="weather-forecast-day-temps">
                            <span class="weather-forecast-day-max">${mx}°</span>
                            <span class="weather-forecast-day-min">${mn}°</span>
                        </div>
                    </div>
                `;
            }
        }

        content.innerHTML = `
            <div class="weather-header">
                <div class="weather-city">
                    ${_wIcon('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>')}
                    <span>${esc(city)}</span>
                </div>
                <div class="weather-actions">
                    <button class="weather-action-btn" title="Stadt ändern" data-act="change-city">
                        ${_wIcon('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>')}
                    </button>
                    <button class="weather-action-btn" title="Aktualisieren" data-act="refresh">
                        ${_wIcon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>')}
                    </button>
                    <button class="weather-action-btn weather-action-btn--close" title="Schließen" data-act="close">
                        ${_wIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')}
                    </button>
                </div>
            </div>
            <div class="weather-main">
                <div class="weather-temp">
                    <span>${temp}</span><span class="weather-temp-deg">°</span>
                </div>
                <div class="weather-condition">${esc(meta.desc)}</div>
                <div class="weather-feels">Gefühlt ${feels}° · ${meta.icon}</div>
            </div>
            <div class="weather-stats">
                <div class="weather-stat">
                    ${_wIcon('<path d="M12 2v6"/><path d="M5 9c0 4 3 7 7 7s7-3 7-7"/><path d="M12 16c-3 0-5 2-5 4h10c0-2-2-4-5-4Z"/>')}
                    <div class="weather-stat-content">
                        <div class="weather-stat-value">${hum}%</div>
                        <div class="weather-stat-label">Feuchte</div>
                    </div>
                </div>
                <div class="weather-stat">
                    ${_wIcon('<path d="M14 14a5 5 0 1 0-5-5"/><path d="M3 12h12"/><path d="M9 18a5 5 0 1 0 5-5"/>')}
                    <div class="weather-stat-content">
                        <div class="weather-stat-value">${wind} km/h</div>
                        <div class="weather-stat-label">Wind</div>
                    </div>
                </div>
                <div class="weather-stat">
                    ${_wIcon('<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/>')}
                    <div class="weather-stat-content">
                        <div class="weather-stat-value">${feels}°</div>
                        <div class="weather-stat-label">Gefühlt</div>
                    </div>
                </div>
            </div>
            ${fcHtml ? `<div class="weather-forecast-strip">${fcHtml}</div>` : ''}
        `;

        // Wire actions
        const btnRefresh   = content.querySelector('[data-act="refresh"]');
        const btnClose     = content.querySelector('[data-act="close"]');
        const btnChangeCity = content.querySelector('[data-act="change-city"]');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', async (e) => {
                e.stopPropagation();
                btnRefresh.classList.add('is-spinning');
                const lat = localStorage.getItem('myworklog_weather_lat');
                const lon = localStorage.getItem('myworklog_weather_lon');
                if (lat && lon) {
                    const data = await fetchWeather(lat, lon);
                    if (data) {
                        weatherData = { ...data, cityName: weatherData.cityName };
                        localStorage.setItem('myworklog_weather', JSON.stringify({ data: weatherData, timestamp: Date.now() }));
                        weatherLastFetch = Date.now();
                        updateWeatherUI();
                        updateGreetingWeather();
                    }
                }
                setTimeout(() => btnRefresh.classList.remove('is-spinning'), 600);
            });
        }
        if (btnClose) btnClose.addEventListener('click', (e) => { e.stopPropagation(); closeWeatherModal(); });
        if (btnChangeCity) {
            btnChangeCity.addEventListener('click', (e) => {
                e.stopPropagation();
                // Drop into empty-state to allow re-pick.
                widget.dataset.condition = '';
                weatherData = null;
                localStorage.removeItem('myworklog_weather');
                updateWeatherUI();
            });
        }
    }

    function renderWeatherWidgetEmpty(widget) {
        widget.dataset.condition = 'ambient';
        _szene(widget, 'partly-day', 8);
        _ruhendeEbenen(widget);
        const content = widget.querySelector('.weather-content');
        if (!content) return;
        content.innerHTML = `
            <div class="weather-empty">
                <svg class="weather-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <div class="weather-empty-title">Wo bist du gerade?</div>
                <div class="weather-empty-desc">Setze deinen Standort, damit das Wetter direkt auf deinem Dashboard lebt.</div>
                <div class="weather-empty-actions">
                    <button class="weather-empty-btn weather-empty-btn--primary" data-act="locate">
                        ${_wIcon('<circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>')}
                        <span>Standort automatisch erkennen</span>
                    </button>
                    <div class="weather-empty-input-row">
                        <input type="text" class="weather-empty-input" placeholder="z.B. Berlin, München, Wien..." data-act="city-input" />
                        <button class="weather-empty-btn" data-act="city-submit">
                            ${_wIcon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>')}
                        </button>
                    </div>
                </div>
            </div>
        `;
        const locateBtn = content.querySelector('[data-act="locate"]');
        const cityIn    = content.querySelector('[data-act="city-input"]');
        const citySub   = content.querySelector('[data-act="city-submit"]');
        if (locateBtn) locateBtn.addEventListener('click', (e) => { e.stopPropagation(); requestLocationPermission(); });
        if (citySub) citySub.addEventListener('click', async (e) => {
            e.stopPropagation();
            await _widgetSearchCity(cityIn.value);
        });
        if (cityIn) cityIn.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') { e.stopPropagation(); await _widgetSearchCity(cityIn.value); }
        });
    }

    async function _widgetSearchCity(city) {
        if (!city || !city.trim()) return;
        try {
            const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city.trim())}&format=json&limit=1&accept-language=de`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();
            if (!geoData || !geoData.length) {
                showCustomMessage('❌ Stadt nicht gefunden', `"${city}" konnte nicht gefunden werden.`, 'error');
                return;
            }
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            const cityName = geoData[0].display_name.split(',')[0];
            localStorage.setItem('myworklog_weather_lat', lat);
            localStorage.setItem('myworklog_weather_lon', lon);
            localStorage.setItem('myworklog_weather_city', cityName);
            const data = await fetchWeather(lat, lon);
            if (data) {
                weatherData = { ...data, cityName };
                localStorage.setItem('myworklog_weather', JSON.stringify({ data: weatherData, timestamp: Date.now() }));
                weatherLastFetch = Date.now();
                updateWeatherUI();
                updateGreetingWeather();
                startWeatherAutoRefresh();
            }
        } catch (e) {
            console.error('Widget city search failed:', e);
            showCustomMessage('❌ Fehler', 'Stadt-Suche fehlgeschlagen.', 'error');
        }
    }

    // ═══ TAGESZEIT — Sonnenzeiten und Minute (auch fuer den Demo-Modus) ═══
    function _toMinutes(s) {
        if (!s) return null;
        const iso = /T(\d{1,2}):(\d{2})/.exec(s);
        if (iso) return (+iso[1]) * 60 + (+iso[2]);
        const hm = /^(\d{1,2}):(\d{2})/.exec(s);
        if (hm) return (+hm[1]) * 60 + (+hm[2]);
        return null;
    }
    function _nowMinutes() {
        if (_demoState && _demoState.minute != null) return _demoState.minute;
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
    }

    // Sunrise/Sunset for today (from API, with seasonal fallback for cached/cold-start state).
    function _sunTimes() {
        try {
            if (weatherData && weatherData.daily && weatherData.daily.sunrise && weatherData.daily.sunset) {
                const r = _toMinutes(weatherData.daily.sunrise[0]);
                const s = _toMinutes(weatherData.daily.sunset[0]);
                if (r != null && s != null && s > r) return { sunrise: r, sunset: s, noon: (r + s) / 2 };
            }
        } catch (e) {}
        const m = new Date().getMonth();
        const winter = m < 2 || m > 9;
        const r = winter ? 7 * 60 + 30 : 5 * 60 + 30;
        const s = winter ? 17 * 60 + 0  : 21 * 60 + 0;
        return { sunrise: r, sunset: s, noon: (r + s) / 2 };
    }

    // Character reaction logic. Items show/hide based on condition + temperature.
    // Combines: snow+freezing → scarf + hat + coat + shiver. Items stack as outfit.
    function _applyCharacterReactions(widget, condition, tempC) {
        const char = widget.querySelector('.weather-character');
        if (!char) return;
        const reset = { umbrella: '0', sunglasses: '0', sunscreen: '0', scarf: '0', hat: '0', sunhat: '0', coat: '0', shiver: '0' };

        // Rain/Storm → umbrella opens
        if (condition === 'rain' || condition === 'storm') reset.umbrella = '1';

        // Snow → full winter outfit
        if (condition === 'snow') {
            reset.scarf = '1';
            reset.hat   = '1';
            reset.coat  = '1';
            if (tempC !== undefined && tempC <= -3) reset.shiver = '1';
        }

        // Sunny + warm → sunglasses; very hot → sunscreen + sun hat (no glasses needed under big hat)
        if ((condition === 'clear-day' || condition === 'partly-day') && tempC !== undefined) {
            if (tempC >= 28) {
                reset.sunscreen = '1';
                reset.sunhat    = '1';
            } else if (tempC >= 20) {
                reset.sunglasses = '1';
            }
        }

        // Generic cold (any condition not already snow):
        // - ≤ 8°C → coat
        // - ≤ 5°C → also scarf
        // - ≤ -5°C → shivering
        if (tempC !== undefined && condition !== 'snow') {
            if (tempC <= 8 && reset.umbrella === '0')  reset.coat  = '1';
            if (tempC <= 5 && reset.scarf === '0')     reset.scarf = '1';
            if (tempC <= -5)                           reset.shiver = '1';
        }

        Object.entries(reset).forEach(([k, v]) => char.dataset[k] = v);
    }

    // ═══ DEMO MODE — console-triggerable for showing off ═══
    // Type `weatherDemo.help()` in DevTools console to see all commands.
    const _demoState = { cond: null, wind: null, temp: null, minute: null, label: null };
    const _DEMO_CODE_MAP = {
        'clear-day': 0, 'clear-night': 0, 'partly-day': 2, 'partly-night': 2,
        'cloudy': 3, 'fog': 45, 'rain': 61, 'storm': 95, 'snow': 73
    };

    // Mock data used only if the user hasn't set up a location yet — lets demo work cold.
    function _demoMockData() {
        const d = new Date();
        const days = Array.from({ length: 6 }, (_, i) => {
            const dd = new Date(d); dd.setDate(d.getDate() + i);
            return dd.toISOString().slice(0, 10);
        });
        return {
            current: { temperature_2m: 20, apparent_temperature: 20, relative_humidity_2m: 60, weather_code: 0, wind_speed_10m: 5 },
            daily: {
                time: days,
                weather_code: [0, 1, 2, 3, 61, 0],
                temperature_2m_max: [22, 23, 21, 19, 18, 20],
                temperature_2m_min: [12, 14, 13, 11, 10, 12],
                sunrise: days.map(d => d + 'T05:42'),
                sunset:  days.map(d => d + 'T21:30')
            },
            cityName: 'Demo'
        };
    }

    function _demoApply(cond, wind, temp, minute, label) {
        if (!weatherData) weatherData = _demoMockData();
        _demoState.cond   = cond;
        _demoState.wind   = wind;
        _demoState.temp   = temp;
        _demoState.minute = minute;
        _demoState.label  = label;
        const modal = document.getElementById('weatherModal');
        if (modal && !modal.classList.contains('active')) {
            openWeatherModal();
        } else {
            renderWeatherWidget();
        }
        // eslint-disable-next-line no-console
        console.log('%c🎬 ' + label, 'background:#a855f7;color:#fff;padding:4px 10px;border-radius:6px;font-weight:600;font-size:13px');
    }

    window.weatherDemo = {
        // ── Wetter-Conditions ──
        sunny:     () => _demoApply('clear-day',    5, 22,  720,  'Sonnig'),
        hot:       () => _demoApply('clear-day',    3, 34,  720,  'Heiß (Sonnenhut + Sonnencreme)'),
        cool:      () => _demoApply('clear-day',    8, 18,  720,  'Mild (Sonnenbrille)'),
        partly:    () => _demoApply('partly-day',   8, 22,  720,  'Heiter bis wolkig'),
        cloudy:    () => _demoApply('cloudy',      15, 16,  720,  'Bewölkt'),
        fog:       () => _demoApply('fog',          3, 10,  720,  'Nebel'),
        rain:      () => _demoApply('rain',        12, 14,  720,  'Regen (Regenschirm)'),
        heavyRain: () => _demoApply('rain',        32, 12,  720,  'Starkregen + Wind'),
        storm:     () => _demoApply('storm',       18, 16, 1080,  'Gewitter mit Blitzen'),
        tornado:   () => _demoApply('storm',       55, 16, 1080,  'Gewittersturm (55 km/h Wind)'),
        snow:      () => _demoApply('snow',         8, -2,  720,  'Schnee (Wintermütze + Schal + Mantel)'),
        winter:    () => _demoApply('snow',        25, -8,  720,  'Polarwinter (+ Shiver-Animation)'),

        // ── Tageszeit ──
        sunrise:   () => _demoApply('clear-day',    4, 14,  360,  'Sonnenaufgang'),
        dawn:      () => _demoApply('clear-day',    3, 12,  330,  'Morgendämmerung'),
        noon:      () => _demoApply('clear-day',    5, 26,  720,  'Mittag'),
        sunset:    () => _demoApply('clear-day',    6, 21, 1230,  'Sonnenuntergang (golden hour)'),
        dusk:      () => _demoApply('clear-day',    5, 18, 1290,  'Abenddämmerung'),
        night:     () => _demoApply('clear-night',  3, 16, 1380,  'Sternenklare Nacht (Mond + Sterne)'),
        midnight:  () => _demoApply('clear-night',  2, 14,    0,  'Mitternacht'),

        // ── Reset ──
        reset: () => {
            _demoState.cond = _demoState.wind = _demoState.temp = _demoState.minute = _demoState.label = null;
            try { getLocationAndWeather(); } catch (e) {}
            renderWeatherWidget();
            // eslint-disable-next-line no-console
            console.log('%c✅ Demo OFF — echte Wetterdaten', 'background:#10b981;color:#fff;padding:4px 10px;border-radius:6px;font-weight:600;font-size:13px');
        },

        // ── Help ──
        help: () => {
            // eslint-disable-next-line no-console
            console.log(
                '%c🌤️ Weather Demo Commands\n\n' +
                '%cWETTER:\n' +
                '  weatherDemo.sunny()       Sonnig\n' +
                '  weatherDemo.hot()         Heiß (≥28° → Sonnenhut + Sunscreen-Sparkles)\n' +
                '  weatherDemo.cool()        Mild (≥20° → Sonnenbrille)\n' +
                '  weatherDemo.partly()      Heiter bis wolkig\n' +
                '  weatherDemo.cloudy()      Bewölkt\n' +
                '  weatherDemo.fog()         Nebel\n' +
                '  weatherDemo.rain()        Regen + Regenschirm\n' +
                '  weatherDemo.heavyRain()   Starkregen mit Wind-Skew\n' +
                '  weatherDemo.storm()       Gewitter mit Blitzen\n' +
                '  weatherDemo.tornado()     Gewittersturm (55 km/h)\n' +
                '  weatherDemo.snow()        Schnee + Wintermütze + Schal\n' +
                '  weatherDemo.winter()      Polarwinter + Shivering\n\n' +
                'TAGESZEIT:\n' +
                '  weatherDemo.sunrise()     Sonnenaufgang\n' +
                '  weatherDemo.dawn()        Morgendämmerung\n' +
                '  weatherDemo.noon()        Mittag\n' +
                '  weatherDemo.sunset()      Sonnenuntergang (golden hour)\n' +
                '  weatherDemo.dusk()        Abenddämmerung\n' +
                '  weatherDemo.night()       Sternenklare Nacht\n' +
                '  weatherDemo.midnight()    Mitternacht\n\n' +
                'RESET:\n' +
                '  weatherDemo.reset()       Zurück zu echten Wetterdaten\n',
                'font-size:16px;font-weight:bold;color:#a855f7',
                'font-family:monospace;line-height:1.7;color:#1e293b'
            );
        }
    };

    // Console hint on first load
    setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(
            '%c🌤️ Weather Demo bereit %c· tippe %cweatherDemo.help()%c für alle Befehle',
            'background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;padding:4px 10px;border-radius:6px;font-weight:600',
            'color:#94a3b8;font-size:12px',
            'background:#1e293b;color:#fff;padding:2px 6px;border-radius:4px;font-family:monospace',
            'color:#94a3b8;font-size:12px'
        );
    }, 2000);

    // 5-minute tick so the sky shifts even when no new weather data arrived.
    let _skyTimeInterval = null;
    function startSkyTimeRefresh() {
        if (_skyTimeInterval) return;
        _skyTimeInterval = setInterval(() => {
            const widget = document.querySelector('#weatherModal .weather-live');
            if (!widget) return;
            const cond = widget.dataset.condition || 'ambient';
            const wind = (weatherData && weatherData.current) ? weatherData.current.wind_speed_10m : 0;
            _szene(widget, cond === 'ambient' ? 'partly-day' : cond, wind);
            _ruhendeEbenen(widget);
        }, 5 * 60 * 1000);
    }

    // Public entry point — called from updateUI / on data refresh.
    // Targets the modal's `.weather-live--modal` element (greeting button opens this).
    function renderWeatherWidget() {
        const widget = document.querySelector('#weatherModal .weather-live');
        if (!widget) return;
        ensureWidgetScaffold(widget);
        if (weatherData && weatherData.current) {
            renderWeatherWidgetContent(widget);
        } else {
            renderWeatherWidgetEmpty(widget);
        }
    }

    // All UI render now flows through renderWeatherWidget() — these stubs keep legacy callers working.
    // Der Wetter-Chip im Dashboard-Kopf (dnRenderTop) zeichnet nur, wenn weatherData
    // schon da ist. Kommt es erst aus dem Netz (Cache abgelaufen, z. B. morgens), lief
    // das Dashboard vorher — ohne diesen Nachruf blieb der Chip bis zum Neuladen weg.
    function updateWeatherUI() {
        renderWeatherWidget();
        if (typeof dnRenderTop === 'function') { try { dnRenderTop(); } catch (e) { /* Dashboard noch nicht gebaut */ } }
    }
    function updateWeatherUINoLocation()  { renderWeatherWidget(); }
    function weatherShowCityInput()       { openWeatherModal(); /* widget empty-state has the input */ }

    function updateGreetingWeather() {
        const greetEl = document.getElementById('userGreeting');
        if (!greetEl) return;

        const greetHour = new Date().getHours();
        let greetText;
        if (greetHour < 6) { greetText = 'Gute Nacht'; }
        else if (greetHour < 10) { greetText = 'Guten Morgen'; }
        else if (greetHour < 13) { greetText = 'Guten Vormittag'; }
        else if (greetHour < 17) { greetText = 'Guten Nachmittag'; }
        else if (greetHour < 21) { greetText = 'Guten Abend'; }
        else { greetText = 'Gute Nacht'; }

        // Ohne eingetragenen Namen kein "…, User" (mwlAnzeigeName, app-startup.js)
        const greetName = (typeof mwlAnzeigeName === 'function') ? mwlAnzeigeName() : (data.settings.name || '');

        let weatherIcon = '🌡️';
        let weatherTemp = '';
        
        if (weatherData && weatherData.current) {
            const isNight = greetHour < 6 || greetHour >= 21;
            const weather = getWeatherIcon(weatherData.current.weather_code, isNight);
            weatherIcon = weather.icon;
            weatherTemp = Math.round(weatherData.current.temperature_2m) + '°';
        } else {
            // Fallback to time-based emoji if no weather data
            if (greetHour < 6) { weatherIcon = '🌙'; }
            else if (greetHour < 10) { weatherIcon = '☀️'; }
            else if (greetHour < 13) { weatherIcon = '🌤️'; }
            else if (greetHour < 17) { weatherIcon = '⛅'; }
            else if (greetHour < 21) { weatherIcon = '🌅'; }
            else { weatherIcon = '🌙'; }
        }

        greetEl.innerHTML = `
            <span class="greeting-enhanced">
                <span class="weather-trigger" onclick="openWeatherModal()" title="Wetter anzeigen">
                    <span class="weather-icon">${mwlIconFromEmoji(weatherIcon, 26)}</span>
                    ${weatherTemp ? `<span class="weather-temp">${weatherTemp}</span>` : ''}
                </span>
                ${greetText}${greetName ? ', ' + esc(greetName) : ''}
            </span>
        `;
    }

    function openWeatherModal() {
        const modal = document.getElementById('weatherModal');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        renderWeatherWidget();
        // Unpause animations when visible.
        const widget = modal.querySelector('.weather-live');
        if (widget) { widget.classList.remove('is-paused'); if (typeof WetterSzene !== 'undefined') WetterSzene.weiter(widget); }
        // Close on Escape
        if (!modal._escHandler) {
            modal._escHandler = (e) => { if (e.key === 'Escape') closeWeatherModal(); };
            document.addEventListener('keydown', modal._escHandler);
        }
    }

    function closeWeatherModal() {
        const modal = document.getElementById('weatherModal');
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Pause heavy animations while hidden — saves CPU.
        const widget = modal.querySelector('.weather-live');
        if (widget) { widget.classList.add('is-paused'); if (typeof WetterSzene !== 'undefined') WetterSzene.pause(widget); }
        if (modal._escHandler) {
            document.removeEventListener('keydown', modal._escHandler);
            modal._escHandler = null;
        }
    }

    // Initialize weather on load
    document.addEventListener('DOMContentLoaded', () => {
        // Render widget immediately (empty-state) so the dashboard slot doesn't pop in later.
        try { renderWeatherWidget(); } catch (e) { /* widget may not exist yet — re-tried below */ }
        startSkyTimeRefresh(); // 5-min sky color tick (works even without API data via seasonal fallback)
        setTimeout(() => {
            try { renderWeatherWidget(); } catch (e) {}
            getLocationAndWeather();
            startWeatherAutoRefresh(); // Starte Auto-Refresh alle 30 Min
        }, 1000); // Delayed to prioritize UI loading
    });
