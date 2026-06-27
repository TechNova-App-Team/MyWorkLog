// ═══ CORE: WEATHER ═══
    // --- DASHBOARD HELPER FUNCTIONS (Premium Enhancements) ---
    
    // Smooth value animation for dashboard numbers
    function animateDashboardValue(el, newText) {
        if (!el) return;
        if (el.textContent === newText) return;
        el.style.opacity = '0.5';
        el.style.transform = 'translateY(-2px)';
        setTimeout(() => {
            el.textContent = newText;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 150);
    }
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

    async function fetchWeather(lat, lon) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Europe%2FBerlin&forecast_days=6`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Weather API Fehler');
            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Weather fetch error:', err);
            return null;
        }
    }

    async function getLocationAndWeather() {
        // Check cache first
        const cached = localStorage.getItem('myworklog_weather');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < WEATHER_CACHE_DURATION) {
                weatherData = parsed.data;
                weatherLastFetch = parsed.timestamp;
                updateWeatherUI();
                updateGreetingWeather();
                return;
            }
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
                updateWeatherUI();
                updateGreetingWeather();
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

    // ═══ PARTICLE BUILDERS — high-density layered atmospheric effects ═══

    // Multi-size rain. Three depth tiers (back/mid/front) for proper parallax.
    function buildRainDrops(intensity) {
        // intensity: 'light' | 'normal' | 'heavy' | 'storm'
        const counts = { light: 28, normal: 50, heavy: 75, storm: 90 };
        const count = counts[intensity] || 50;
        let html = '';
        for (let i = 0; i < count; i++) {
            const tier  = i < count * 0.35 ? 'back' : (i < count * 0.75 ? 'mid' : 'front');
            const x     = (Math.random() * 100).toFixed(1);
            const d     = (Math.random() * 1.6).toFixed(2);
            const dur   = (tier === 'back' ? 1.1 + Math.random() * 0.5 :
                           tier === 'mid'  ? 0.75 + Math.random() * 0.35 :
                                             0.45 + Math.random() * 0.25).toFixed(2);
            const h     = tier === 'back' ? 12 + Math.random() * 6 :
                          tier === 'mid'  ? 18 + Math.random() * 8 :
                                            24 + Math.random() * 10;
            const op    = tier === 'back' ? 0.35 + Math.random() * 0.15 :
                          tier === 'mid'  ? 0.55 + Math.random() * 0.2 :
                                            0.75 + Math.random() * 0.2;
            const w     = tier === 'front' ? 1.5 : (tier === 'mid' ? 1.1 : 0.8);
            html += `<span class="drop drop--${tier}" style="--x:${x}%;--d:${d}s;--dur:${dur}s;--h:${h.toFixed(0)}px;--op:${op.toFixed(2)};--w:${w}px"></span>`;
        }
        return html;
    }

    // Ground splash circles — expand and fade at the bottom of the view.
    function buildSplashes(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            const x   = (Math.random() * 100).toFixed(1);
            const d   = (Math.random() * 4).toFixed(2);
            const dur = (1.6 + Math.random() * 1.4).toFixed(2);
            html += `<span class="splash" style="--x:${x}%;--d:${d}s;--dur:${dur}s"></span>`;
        }
        return html;
    }

    // Multi-tier snow: tiny/small/medium with figure-8 paths.
    function buildSnowflakes(intensity) {
        const counts = { light: 30, normal: 55, heavy: 80 };
        const count = counts[intensity] || 55;
        let html = '';
        for (let i = 0; i < count; i++) {
            const tier  = i < count * 0.4 ? 'back' : (i < count * 0.75 ? 'mid' : 'front');
            const x     = (Math.random() * 100).toFixed(1);
            const d     = -(Math.random() * 12).toFixed(2);
            const dur   = (tier === 'back' ? 14 + Math.random() * 8 :
                           tier === 'mid'  ? 9 + Math.random() * 6 :
                                             5 + Math.random() * 4).toFixed(2);
            const s     = (tier === 'back' ? 2 + Math.random() * 1.5 :
                           tier === 'mid'  ? 3 + Math.random() * 2 :
                                             5 + Math.random() * 3).toFixed(1);
            const op    = tier === 'back' ? 0.4 : tier === 'mid' ? 0.7 : 0.95;
            const swayDur = (3 + Math.random() * 3).toFixed(2);
            const swayAmp = (8 + Math.random() * 18).toFixed(0);
            html += `<span class="flake flake--${tier}" style="--x:${x}%;--d:${d}s;--dur:${dur}s;--s:${s}px;--op:${op};--sway-dur:${swayDur}s;--sway-amp:${swayAmp}px"></span>`;
        }
        return html;
    }

    // Three star layers with parallax depth. Restricted to the sky area (top 45%)
    // so they don't show through the landscape.
    function buildStars(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            const tier = i < count * 0.45 ? 'back' : (i < count * 0.85 ? 'mid' : 'front');
            const x    = (Math.random() * 98).toFixed(1);
            const y    = (Math.random() * 45).toFixed(1);
            const dur  = (1.8 + Math.random() * 3.5).toFixed(2);
            const d    = (Math.random() * 5).toFixed(2);
            const s    = tier === 'back' ? 1.3 : tier === 'mid' ? 2.2 : 4.5;
            html += `<span class="star star--${tier}" style="left:${x}%;top:${y}%;--dur:${dur}s;--d:${d}s;--s:${s}px"></span>`;
        }
        return html;
    }

    // Shooting stars — fire periodically across the upper sky.
    function buildShootingStars(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            const y    = (Math.random() * 35).toFixed(1);
            const d    = (Math.random() * 40 + i * 8).toFixed(1);
            const dur  = (1.6 + Math.random() * 0.6).toFixed(2);
            const rot  = (15 + Math.random() * 20).toFixed(1);
            html += `<span class="shooting" style="top:${y}%;--d:${d}s;--dur:${dur}s;--rot:${rot}deg"></span>`;
        }
        return html;
    }

    // Lightning bolts (SVG jagged paths) — appear, flash, vanish. 3 designs in rotation.
    function buildLightning(count) {
        const paths = [
            'M 55 5 L 48 35 L 58 38 L 42 70 L 56 65 L 38 100',
            'M 50 5 L 38 32 L 54 35 L 36 60 L 52 58 L 30 95',
            'M 60 5 L 46 28 L 60 30 L 40 55 L 58 52 L 35 88 L 50 85 L 28 100'
        ];
        let html = '';
        for (let i = 0; i < count; i++) {
            const left = (15 + Math.random() * 65).toFixed(0);
            const top  = (5 + Math.random() * 15).toFixed(0);
            const d    = (3 + i * 4 + Math.random() * 5).toFixed(1);
            const scale = (0.8 + Math.random() * 0.5).toFixed(2);
            const path = paths[i % paths.length];
            html += `
                <svg class="bolt" style="left:${left}%;top:${top}%;--d:${d}s;--sc:${scale}" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d="${path}" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"
                          filter="url(#boltGlow)"/>
                </svg>`;
        }
        return html;
    }

    // Volumetric sun rays — radial beams that sweep slowly.
    function buildSunRays() {
        let html = '';
        for (let i = 0; i < 12; i++) {
            const angle = i * 30;
            const d     = (i * 0.6).toFixed(1);
            html += `<span class="sun-ray" style="--angle:${angle}deg;--d:${d}s"></span>`;
        }
        return html;
    }

    // Drifting dust motes (clear day atmosphere). Subtle floating particles.
    function buildDustMotes(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            const x   = (Math.random() * 100).toFixed(1);
            const y   = (40 + Math.random() * 50).toFixed(1);
            const dur = (12 + Math.random() * 12).toFixed(1);
            const d   = (Math.random() * 8).toFixed(1);
            const s   = (1 + Math.random() * 1.5).toFixed(1);
            const op  = (0.3 + Math.random() * 0.4).toFixed(2);
            html += `<span class="mote" style="left:${x}%;top:${y}%;--dur:${dur}s;--d:${d}s;--s:${s}px;--op:${op}"></span>`;
        }
        return html;
    }

    // Lazy-build particles only when the condition needs them — cached by condition string.
    const _particleCache = {};
    function getParticles(condition) {
        if (_particleCache[condition]) return _particleCache[condition];
        let html = '';
        if (condition === 'rain')                    html = buildRainDrops('normal');
        else if (condition === 'rain-heavy')         html = buildRainDrops('heavy');
        else if (condition === 'storm')              html = buildRainDrops('storm');
        else if (condition === 'snow')               html = buildSnowflakes('normal');
        else if (condition === 'snow-heavy')         html = buildSnowflakes('heavy');
        else if (condition === 'splashes')           html = buildSplashes(12);
        else if (condition === 'splashes-heavy')     html = buildSplashes(18);
        else if (condition === 'stars')              html = buildStars(140);
        else if (condition === 'shooting')           html = buildShootingStars(5);
        else if (condition === 'lightning')          html = buildLightning(3);
        else if (condition === 'sunrays')            html = buildSunRays();
        else if (condition === 'motes')              html = buildDustMotes(18);
        _particleCache[condition] = html;
        return html;
    }

    // Populate every particle host based on condition. Stars stay across nights + dusk; sun rays
    // attach only on clear-day. Lightning bolts only on storm. Splashes follow rain density.
    function _populateParticles(widget, cond) {
        const rainHost      = widget.querySelector('.weather-rain');
        const splashHost    = widget.querySelector('.weather-splashes');
        const snowHost      = widget.querySelector('.weather-snow');
        const starHost      = widget.querySelector('.weather-stars');
        const shootHost     = widget.querySelector('.weather-shooting');
        const boltHost      = widget.querySelector('.weather-lightning-bolts');
        const rayHost       = widget.querySelector('.sun-rays-container');
        const moteHost      = widget.querySelector('.weather-motes');

        // Rain
        let rainKey = '';
        if      (cond === 'rain')   rainKey = 'rain';
        else if (cond === 'storm')  rainKey = 'storm';
        if (rainHost) rainHost.innerHTML = rainKey ? getParticles(rainKey) : '';

        // Splashes follow rain (ground-level circles).
        let splashKey = '';
        if      (cond === 'rain')   splashKey = 'splashes';
        else if (cond === 'storm')  splashKey = 'splashes-heavy';
        if (splashHost) splashHost.innerHTML = splashKey ? getParticles(splashKey) : '';

        // Snow
        if (snowHost) snowHost.innerHTML = (cond === 'snow') ? getParticles('snow') : '';

        // Stars — visible across all conditions where the sky shows. JS opacity (--moon-op) controls visibility.
        const showStars = cond !== 'fog'; // fog occludes everything
        if (starHost) starHost.innerHTML = showStars ? getParticles('stars') : '';

        // Shooting stars — clear nights only.
        const showShoot = (cond === 'clear-night' || cond === 'partly-night' || cond === 'ambient');
        if (shootHost) shootHost.innerHTML = showShoot ? getParticles('shooting') : '';

        // Lightning bolts — only on storm.
        if (boltHost) boltHost.innerHTML = (cond === 'storm') ? getParticles('lightning') : '';

        // Sun rays — clear-day + partly-day.
        const showRays = (cond === 'clear-day' || cond === 'partly-day');
        if (rayHost) rayHost.innerHTML = showRays ? getParticles('sunrays') : '';

        // Dust motes — clear-day for atmospheric depth.
        if (moteHost) moteHost.innerHTML = (cond === 'clear-day') ? getParticles('motes') : '';
    }

    // Rich 5-layer SVG landscape (parallax depth: distant mountains → mid range → hills with cottage → tree line → foreground)
    // + properly illustrated flat-design character with skin, hair, face, clothes.
    function buildLandscape() {
        return `
            <div class="weather-landscape" aria-hidden="true">
                <svg class="landscape-svg" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice">
                    <defs>
                        <!-- Foreground clip — wet-ground tint only shows where there's actual ground -->
                        <clipPath id="foregroundClip">
                            <path d="M 0 210 Q 200 188 400 205 T 800 210 L 800 260 L 0 260 Z" />
                        </clipPath>
                        <!-- Realistic dirt path gradient: lighter sand in middle of the path -->
                        <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stop-color="rgb(155,118,75)"  stop-opacity="0.6" />
                            <stop offset="50%"  stop-color="rgb(210,178,135)" stop-opacity="0.92" />
                            <stop offset="100%" stop-color="rgb(180,148,105)" stop-opacity="0.85" />
                        </linearGradient>
                    </defs>
                    <!-- LAYER 1: Distant mountains (lightest, smallest peaks) -->
                    <path class="ls-mountains-far" d="M 0 120 L 60 90 L 120 110 L 200 75 L 290 100 L 370 80 L 460 95 L 540 78 L 620 100 L 700 85 L 770 105 L 800 95 L 800 260 L 0 260 Z" />

                    <!-- LAYER 2: Mid mountain range with snow caps -->
                    <path class="ls-mountains" d="M 0 135 L 80 80 L 165 115 L 250 60 L 340 95 L 440 70 L 550 100 L 640 75 L 740 95 L 800 110 L 800 260 L 0 260 Z" />
                    <path class="ls-snowcaps" d="M 245 65 L 250 60 L 256 67 L 250 70 Z
                                                  M 435 75 L 440 70 L 446 77 L 441 79 Z
                                                  M 635 80 L 640 75 L 647 82 L 641 84 Z
                                                  M 75 86 L 80 80 L 88 86 L 81 88 Z" />

                    <!-- LAYER 3: Rolling hills with cottage at distance -->
                    <path class="ls-hills" d="M 0 165 Q 100 140 200 155 T 400 162 T 600 148 T 800 158 L 800 260 L 0 260 Z" />

                    <!-- Cottage in mid-distance. transform tilts -3.7° around the bottom-center (16,22)
                         so the foundation matches the hill slope (left side drops, right side rises).
                         translate y=130 anchors the cottage flush on the hill curve at x=530..562. -->
                    <g class="ls-cottage" transform="translate(530,130) rotate(-3.7 16 22)">
                        <!-- chimney smoke (animated) -->
                        <g class="cottage-smoke">
                            <ellipse cx="16" cy="-10" rx="3.5" ry="2.5" />
                            <ellipse cx="18" cy="-17" rx="4" ry="3" />
                            <ellipse cx="14" cy="-25" rx="5" ry="3.5" />
                        </g>
                        <!-- house body -->
                        <rect x="0" y="0" width="32" height="22" />
                        <!-- roof -->
                        <path d="M -3 0 L 16 -12 L 35 0 Z" />
                        <!-- chimney -->
                        <rect x="14" y="-8" width="5" height="8" />
                        <!-- door -->
                        <rect class="cottage-door" x="13" y="11" width="6" height="11" />
                        <!-- doorway warm glow (only at night) -->
                        <rect class="cottage-door-glow" x="13" y="11" width="6" height="11" />
                        <!-- windows: 2 ground floor + 1 attic -->
                        <rect class="cottage-window" x="3" y="5" width="6" height="5" />
                        <rect class="cottage-window" x="23" y="5" width="6" height="5" />
                        <rect class="cottage-window cottage-window--attic" x="14" y="-5" width="4" height="4" />
                        <!-- window cross-frames -->
                        <line class="cottage-window-frame" x1="6" y1="5" x2="6" y2="10" />
                        <line class="cottage-window-frame" x1="3" y1="7.5" x2="9" y2="7.5" />
                        <line class="cottage-window-frame" x1="26" y1="5" x2="26" y2="10" />
                        <line class="cottage-window-frame" x1="23" y1="7.5" x2="29" y2="7.5" />
                    </g>

                    <!-- Birds (V-shapes), visible on clear days -->
                    <g class="ls-birds">
                        <path class="bird bird-1" d="M 0 0 q 4 -4 8 0 q 4 -4 8 0" transform="translate(180, 50)" />
                        <path class="bird bird-2" d="M 0 0 q 3 -3 6 0 q 3 -3 6 0" transform="translate(280, 65)" />
                        <path class="bird bird-3" d="M 0 0 q 3.5 -3.5 7 0 q 3.5 -3.5 7 0" transform="translate(220, 72)" />
                    </g>

                    <!-- LAYER 4: Tree line — wind-swayable.
                         Each tree uses nested groups: outer <g transform="translate"> positions the tree,
                         inner <g class="tree-pivot"> rotates around its bbox bottom-center (the trunk base)
                         via CSS transform-box:fill-box + transform-origin:50% 100%. -->
                    <g class="ls-trees">
                        <g transform="translate(60,162)">
                            <g class="tree-pivot" style="--sway-dur:3.2s;--sway-d:0s">
                                <path class="ls-tree-spruce" d="M -6 0 L 6 0 L 0 -22 Z M -1 0 L 1 0 L 1 4 L -1 4 Z" />
                            </g>
                        </g>
                        <g transform="translate(82,164)">
                            <g class="tree-pivot" style="--sway-dur:2.8s;--sway-d:-0.6s">
                                <path class="ls-tree-spruce" d="M -5 0 L 5 0 L 0 -16 Z M -0.8 0 L 0.8 0 L 0.8 3.5 L -0.8 3.5 Z" />
                            </g>
                        </g>
                        <g transform="translate(160,159)">
                            <g class="tree-pivot" style="--sway-dur:3.6s;--sway-d:-1.2s">
                                <g class="ls-tree-leafy">
                                    <ellipse cx="0" cy="-12" rx="11" ry="9" />
                                    <rect x="-1.5" y="-4" width="3" height="6" />
                                </g>
                            </g>
                        </g>
                        <g transform="translate(250,158)">
                            <g class="tree-pivot" style="--sway-dur:3.4s;--sway-d:-0.3s">
                                <path class="ls-tree-spruce" d="M -7 0 L 7 0 L 0 -25 Z M -1 0 L 1 0 L 1 4 L -1 4 Z" />
                            </g>
                        </g>
                        <g transform="translate(290,161)">
                            <g class="tree-pivot" style="--sway-dur:2.6s;--sway-d:-0.9s">
                                <path class="ls-tree-spruce" d="M -4.5 0 L 4.5 0 L 0 -14 Z M -0.8 0 L 0.8 0 L 0.8 3 L -0.8 3 Z" />
                            </g>
                        </g>
                        <g transform="translate(380,162)">
                            <g class="tree-pivot" style="--sway-dur:4s;--sway-d:-1.8s">
                                <g class="ls-tree-leafy">
                                    <ellipse cx="0" cy="-15" rx="13" ry="11" />
                                    <rect x="-2" y="-6" width="4" height="8" />
                                </g>
                            </g>
                        </g>
                        <ellipse class="ls-bush" cx="430" cy="161" rx="9" ry="5" />
                        <ellipse class="ls-bush" cx="448" cy="162" rx="7" ry="4" />
                        <g transform="translate(620,158)">
                            <g class="tree-pivot" style="--sway-dur:3.1s;--sway-d:-0.4s">
                                <path class="ls-tree-spruce" d="M -6.5 0 L 6.5 0 L 0 -20 Z M -1 0 L 1 0 L 1 4 L -1 4 Z" />
                            </g>
                        </g>
                        <g transform="translate(660,162)">
                            <g class="tree-pivot" style="--sway-dur:2.9s;--sway-d:-1.5s">
                                <path class="ls-tree-spruce" d="M -5 0 L 5 0 L 0 -15 Z M -0.8 0 L 0.8 0 L 0.8 4 L -0.8 4 Z" />
                            </g>
                        </g>
                        <g transform="translate(710,160)">
                            <g class="tree-pivot" style="--sway-dur:3.8s;--sway-d:-2.1s">
                                <path class="ls-tree-spruce" d="M -8 0 L 8 0 L 0 -28 Z M -1.5 0 L 1.5 0 L 1.5 5 L -1.5 5 Z" />
                            </g>
                        </g>
                        <ellipse class="ls-bush" cx="745" cy="163" rx="8" ry="4.5" />
                    </g>


                    <!-- Fireflies floating in foreground (night only) -->
                    <g class="ls-fireflies">
                        <circle class="firefly firefly-1" cx="150" cy="200" r="1.6" />
                        <circle class="firefly firefly-2" cx="280" cy="215" r="1.4" />
                        <circle class="firefly firefly-3" cx="420" cy="195" r="1.8" />
                        <circle class="firefly firefly-4" cx="560" cy="210" r="1.5" />
                        <circle class="firefly firefly-5" cx="680" cy="200" r="1.6" />
                        <circle class="firefly firefly-6" cx="350" cy="225" r="1.3" />
                    </g>

                    <!-- LAYER 5: Foreground hill (character standing zone) -->
                    <path class="ls-foreground" d="M 0 210 Q 200 188 400 205 T 800 210 L 800 260 L 0 260 Z" />

                    <!-- Realistic dirt path: tapered closed shape with perspective + soft shadow.
                         Curves up from the foreground toward the cottage in the distance. -->
                    <path class="ls-path-shadow" d="
                        M 268 263
                        Q 340 232 430 198
                        Q 490 175 522 152
                        L 528 154
                        Q 498 178 438 202
                        Q 348 235 274 264
                        Z" />
                    <path class="ls-path" d="
                        M 280 262
                        Q 348 234 432 200
                        Q 488 178 518 156
                        L 522 158
                        Q 494 180 436 204
                        Q 352 236 286 263
                        Z" />
                    <!-- A few footstep-darker speckles down the centre of the path -->
                    <g class="ls-path-speckles">
                        <ellipse cx="300" cy="252" rx="3" ry="1.4" />
                        <ellipse cx="345" cy="238" rx="2.6" ry="1.2" />
                        <ellipse cx="392" cy="222" rx="2.4" ry="1.1" />
                        <ellipse cx="438" cy="206" rx="2.2" ry="1" />
                        <ellipse cx="478" cy="190" rx="1.8" ry="0.9" />
                    </g>

                    <!-- Small rocks scattered on foreground -->
                    <g class="ls-rocks">
                        <ellipse cx="120" cy="220" rx="6" ry="3" />
                        <ellipse cx="200" cy="225" rx="4" ry="2" />
                        <ellipse cx="640" cy="222" rx="7" ry="3" />
                        <ellipse cx="680" cy="226" rx="3" ry="1.5" />
                    </g>

                    <!-- Snow accumulation overlay on foreground & hills -->
                    <path class="ls-snow-ground" d="M 0 210 Q 200 188 400 205 T 800 210 L 800 222 Q 600 207 400 215 T 0 220 Z" />
                    <path class="ls-snow-hills"  d="M 0 165 Q 100 140 200 155 T 400 162 T 600 148 T 800 158 L 800 170 Q 600 156 400 168 T 0 173 Z" />

                    <!-- Wet ground reflection (rain only) — CLIPPED to foreground shape so the rect edges
                         don't pop out as a visible rectangle during lightning flashes. -->
                    <rect class="ls-wet" x="0" y="208" width="800" height="55" clip-path="url(#foregroundClip)" />

                    <!-- Fog haze occluding distant layers -->
                    <rect class="ls-fog-veil" x="0" y="60" width="800" height="120" />
                </svg>

                <div class="weather-character" data-umbrella="0" data-sunglasses="0" data-sunscreen="0" data-scarf="0" data-hat="0" data-sunhat="0" data-coat="0" data-shiver="0">
                    <svg viewBox="0 0 200 320" class="char-svg" preserveAspectRatio="xMidYMax meet">
                        <!-- Drop shadow on ground -->
                        <ellipse class="char-shadow" cx="100" cy="305" rx="40" ry="5" />

                        <!-- BODY (silhouette base + colored fills) -->
                        <g class="char-body">
                            <!-- Legs (pants) -->
                            <path class="char-pants char-pants--left"  d="M 80 215 Q 78 240 76 270 L 75 290 L 88 290 L 90 270 Q 92 240 92 215 Z" />
                            <path class="char-pants char-pants--right" d="M 108 215 Q 108 240 110 270 L 112 290 L 125 290 L 124 270 Q 122 240 120 215 Z" />

                            <!-- Shoes -->
                            <ellipse class="char-shoe" cx="82" cy="293" rx="9" ry="4" />
                            <ellipse class="char-shoe" cx="118" cy="293" rx="9" ry="4" />

                            <!-- Torso / shirt -->
                            <path class="char-shirt" d="M 70 130 Q 65 138 65 150 L 70 215 Q 75 222 100 222 Q 125 222 130 215 L 135 150 Q 135 138 130 130 Q 122 124 100 124 Q 78 124 70 130 Z" />

                            <!-- Shirt collar detail -->
                            <path class="char-shirt-collar" d="M 88 124 Q 100 132 112 124 L 110 130 Q 100 138 90 130 Z" />

                            <!-- Left arm (shoulder + arm) -->
                            <g class="char-arm-left">
                                <path class="char-shirt-sleeve" d="M 70 130 Q 60 138 56 158 L 62 170 Q 68 152 75 142 Z" />
                                <path class="char-skin char-forearm-left" d="M 56 158 Q 52 172 50 195 L 60 198 Q 62 182 62 170 Z" />
                                <circle class="char-skin char-hand-left" cx="56" cy="200" r="6" />
                            </g>

                            <!-- Right arm -->
                            <g class="char-arm-right">
                                <path class="char-shirt-sleeve" d="M 130 130 Q 140 138 144 158 L 138 170 Q 132 152 125 142 Z" />
                                <path class="char-skin char-forearm-right" d="M 144 158 Q 148 172 150 195 L 140 198 Q 138 182 138 170 Z" />
                                <circle class="char-skin char-hand-right" cx="144" cy="200" r="6" />
                            </g>

                            <!-- Neck -->
                            <path class="char-skin" d="M 92 110 L 92 126 Q 100 130 108 126 L 108 110 Z" />

                            <!-- HEAD GROUP: head + hair + all face features.
                                 Animated via CSS to gently turn / look around. Pivot at chin via fill-box + 50% 95%. -->
                            <g class="char-head-group">
                                <ellipse class="char-skin char-head" cx="100" cy="78" rx="32" ry="36" />
                                <path class="char-hair" d="M 68 75 Q 65 50 90 40 Q 110 35 125 45 Q 135 55 134 75 Q 132 70 122 72 Q 110 70 100 73 Q 88 70 78 73 Q 72 75 68 75 Z" />
                                <path class="char-hair-shadow" d="M 70 70 Q 100 80 132 72 L 132 78 Q 100 84 70 78 Z" />
                                <g class="char-eyes">
                                    <ellipse cx="88" cy="80" rx="2.5" ry="3" />
                                    <ellipse cx="112" cy="80" rx="2.5" ry="3" />
                                </g>
                                <g class="char-eyebrows">
                                    <path d="M 82 73 Q 88 70 94 73" />
                                    <path d="M 106 73 Q 112 70 118 73" />
                                </g>
                                <path class="char-mouth" d="M 92 95 Q 100 100 108 95" />
                                <circle class="char-cheek" cx="80" cy="92" r="4" />
                                <circle class="char-cheek" cx="120" cy="92" r="4" />
                            </g>
                        </g>

                        <!-- COAT overlay (worn over shirt when cold) -->
                        <g class="char-coat">
                            <path class="char-coat-body" d="M 65 130 Q 58 138 58 152 L 64 220 Q 75 226 100 226 Q 125 226 136 220 L 142 152 Q 142 138 135 130 Q 122 122 100 122 Q 78 122 65 130 Z" />
                            <path class="char-coat-button" d="M 100 145 L 100 148" />
                            <path class="char-coat-button" d="M 100 165 L 100 168" />
                            <path class="char-coat-button" d="M 100 185 L 100 188" />
                            <path class="char-coat-button" d="M 100 205 L 100 208" />
                        </g>

                        <!-- SCARF (knit, wraps around neck with tail) -->
                        <g class="char-scarf">
                            <path class="char-scarf-wrap" d="M 75 118 Q 100 130 125 118 L 128 135 Q 100 142 72 135 Z" />
                            <path class="char-scarf-tail" d="M 86 132 L 80 165 L 92 167 L 96 134 Z" />
                            <!-- Stripes on scarf -->
                            <path class="char-scarf-stripe" d="M 78 125 Q 100 132 122 125 L 122 128 Q 100 135 78 128 Z" />
                        </g>

                        <!-- SUNGLASSES -->
                        <g class="char-sunglasses">
                            <ellipse cx="86" cy="80" rx="10" ry="6" />
                            <ellipse cx="114" cy="80" rx="10" ry="6" />
                            <line x1="96" y1="80" x2="104" y2="80" stroke-width="2" />
                            <!-- Lens highlight -->
                            <ellipse class="lens-highlight" cx="82" cy="77" rx="3" ry="1.5" />
                            <ellipse class="lens-highlight" cx="110" cy="77" rx="3" ry="1.5" />
                        </g>

                        <!-- WINTER HAT (beanie with cuff + pompom) -->
                        <g class="char-hat">
                            <path class="char-hat-crown" d="M 64 60 Q 65 28 100 25 Q 135 28 136 60 L 130 58 Q 100 52 70 58 Z" />
                            <path class="char-hat-cuff"  d="M 64 56 Q 100 62 136 56 L 136 65 Q 100 71 64 65 Z" />
                            <circle class="char-hat-pompom" cx="100" cy="22" r="7" />
                            <!-- pompom detail dots -->
                            <circle class="char-hat-pompom-dot" cx="97" cy="20" r="0.8" />
                            <circle class="char-hat-pompom-dot" cx="102" cy="19" r="0.8" />
                            <circle class="char-hat-pompom-dot" cx="100" cy="24" r="0.8" />
                        </g>

                        <!-- SUN HAT (wide brim) -->
                        <g class="char-sunhat">
                            <ellipse class="char-sunhat-brim" cx="100" cy="55" rx="58" ry="9" />
                            <path class="char-sunhat-crown" d="M 76 55 Q 76 32 100 30 Q 124 32 124 55 Z" />
                            <ellipse class="char-sunhat-band" cx="100" cy="50" rx="24" ry="3" />
                        </g>

                        <!-- UMBRELLA: realistic proportions (130w × 45h, ratio 0.35) — bezier control points
                             tuned so the actual canopy peak is at y=-12, ribs end EXACTLY on the underside curve,
                             tip sits at the visible peak (no floating dot) -->
                        <g class="char-umbrella">
                            <!-- Canopy: top dome + slight underside curve -->
                            <path class="umbrella-canopy" d="M 35 33 Q 100 -57 165 33 Q 100 25 35 33 Z" />
                            <!-- Ribs curve along the dome and land on the canopy bottom edge -->
                            <path class="umbrella-rib" d="M 100 -12 Q 78 5 35 33" />
                            <path class="umbrella-rib" d="M 100 -12 Q 89 0 67 30" />
                            <path class="umbrella-rib" d="M 100 -12 L 100 29" />
                            <path class="umbrella-rib" d="M 100 -12 Q 111 0 133 30" />
                            <path class="umbrella-rib" d="M 100 -12 Q 122 5 165 33" />
                            <!-- Tip at the actual visible canopy peak -->
                            <circle class="umbrella-tip" cx="100" cy="-12" r="3" />
                            <!-- Pole from canopy underside center to the right hand -->
                            <line class="umbrella-pole" x1="100" y1="29" x2="138" y2="196" stroke-width="3" stroke-linecap="round" />
                            <!-- J-shaped handle -->
                            <path class="umbrella-handle"
                                d="M 138 196 Q 152 199 152 211 Q 152 222 140 222 Q 130 220 131 213"
                                fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                        </g>

                        <!-- SUNSCREEN sparkles -->
                        <g class="char-sunscreen-spark">
                            <path d="M 70 85 L 78 85 M 74 81 L 74 89" stroke-width="1.8" />
                            <path d="M 122 92 L 130 92 M 126 88 L 126 96" stroke-width="1.8" />
                            <path d="M 90 105 L 96 105 M 93 102 L 93 108" stroke-width="1.4" />
                        </g>
                    </svg>
                </div>
            </div>
        `;
    }

    // Static scaffold. All layers stay in DOM; visibility/density driven by data-condition + CSS vars.
    function buildWidgetScaffold() {
        return `
            <!-- SVG filter for lightning glow -->
            <svg width="0" height="0" style="position:absolute" aria-hidden="true">
                <defs>
                    <filter id="boltGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="moonShadow">
                        <feGaussianBlur stdDeviation="0.5"/>
                    </filter>
                </defs>
            </svg>
            <div class="weather-sky" aria-hidden="true"></div>
            <div class="weather-aurora" aria-hidden="true">
                <span class="aurora-band aurora-band--1"></span>
                <span class="aurora-band aurora-band--2"></span>
            </div>
            <div class="weather-sun" aria-hidden="true">
                <div class="sun-core"></div>
                <div class="sun-corona"></div>
                <div class="sun-rays-container"></div>
            </div>
            <div class="weather-moon" aria-hidden="true">
                <div class="moon-surface"></div>
                <div class="moon-glow"></div>
            </div>
            <div class="weather-stars" aria-hidden="true"></div>
            <div class="weather-shooting" aria-hidden="true"></div>
            <div class="weather-heat" aria-hidden="true"></div>
            <div class="weather-motes" aria-hidden="true"></div>
            <div class="weather-clouds" aria-hidden="true">
                <span class="cloud cloud--a"></span>
                <span class="cloud cloud--b"></span>
                <span class="cloud cloud--c"></span>
                <span class="cloud cloud--d"></span>
                <span class="cloud cloud--e"></span>
            </div>
            <div class="weather-storm-clouds" aria-hidden="true">
                <span class="storm-cloud storm-cloud--a"></span>
                <span class="storm-cloud storm-cloud--b"></span>
                <span class="storm-cloud storm-cloud--c"></span>
            </div>
            <div class="weather-rain" aria-hidden="true"></div>
            <div class="weather-splashes" aria-hidden="true"></div>
            <div class="weather-snow" aria-hidden="true"></div>
            <div class="weather-fog" aria-hidden="true">
                <span class="mist mist--1"></span>
                <span class="mist mist--2"></span>
                <span class="mist mist--3"></span>
                <span class="mist mist--4"></span>
            </div>
            <div class="weather-lightning-bolts" aria-hidden="true"></div>
            <div class="weather-lightning" aria-hidden="true"></div>
            <!-- Plane that crosses the sky on clear days. Side-view commercial jet with
                 cockpit windows, swept wing, horizontal stabilizer, vertical tail fin, and engine. -->
            <div class="weather-plane" aria-hidden="true">
                <div class="plane-wrap">
                    <svg class="plane-svg" viewBox="0 -4 90 32">
                        <!-- Vertical tail fin (sticking up from the back of the fuselage) -->
                        <path class="plane-tail-fin"  d="M 70 9 L 80 -3 L 84 9 Z" />
                        <!-- Fuselage: tapered nose, cylindrical body, slim tail -->
                        <path class="plane-body"      d="M 2 14 Q 6 8 16 8 L 70 9 Q 80 10 86 13 L 88 14 L 86 15 Q 80 18 70 19 L 16 20 Q 6 20 2 14 Z" />
                        <!-- Cockpit windshield -->
                        <path class="plane-windows"   d="M 8 12 L 18 12 L 18 14.5 L 8 14.5 Z" />
                        <!-- Passenger windows row -->
                        <circle class="plane-window-dot" cx="26" cy="13.5" r="0.8" />
                        <circle class="plane-window-dot" cx="33" cy="13.5" r="0.8" />
                        <circle class="plane-window-dot" cx="40" cy="13.5" r="0.8" />
                        <circle class="plane-window-dot" cx="47" cy="13.5" r="0.8" />
                        <circle class="plane-window-dot" cx="54" cy="13.5" r="0.8" />
                        <circle class="plane-window-dot" cx="61" cy="13.5" r="0.8" />
                        <!-- Main swept wing (large, under fuselage) -->
                        <path class="plane-wing"      d="M 30 16 L 24 28 L 52 28 L 46 16 Z" />
                        <!-- Engine pod under the wing -->
                        <ellipse class="plane-engine" cx="36" cy="22" rx="5" ry="2" />
                        <!-- Horizontal tail stabilizer -->
                        <path class="plane-stab"      d="M 74 14 L 70 8 L 84 8 L 80 14 Z" />
                    </svg>
                    <span class="plane-contrail"></span>
                </div>
            </div>
            <!-- Tornado funnel (storm only, fires intermittently) -->
            <div class="weather-tornado" aria-hidden="true">
                <svg class="tornado-svg" viewBox="-40 0 80 200">
                    <path class="tornado-body" d="M -28 0 Q -10 10 -8 50 Q -4 100 -3 150 Q -2 180 0 195 L 4 195 Q 2 180 3 150 Q 4 100 8 50 Q 10 10 28 0 Z" />
                    <path class="tornado-swirl" d="M -22 18 Q 0 28 22 18" />
                    <path class="tornado-swirl" d="M -16 55 Q 0 65 16 55" />
                    <path class="tornado-swirl" d="M -12 95 Q 0 102 12 95" />
                    <path class="tornado-swirl" d="M -8  140 Q 0 145 8 140" />
                </svg>
            </div>
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
        if (widget.dataset.condition !== cond) {
            widget.dataset.condition = cond;
            _populateParticles(widget, cond);
        }

        // Continuous time-of-day color shift + wind dynamics.
        _applyDynamicSky(widget, cond, wind);

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
                        <div class="weather-forecast-day-icon">${dw.icon}</div>
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
                        renderWeatherWidget();
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
                renderWeatherWidget();
            });
        }
    }

    function renderWeatherWidgetEmpty(widget) {
        widget.dataset.condition = 'ambient';
        _populateParticles(widget, 'ambient');
        // No wind data → calm baseline. Still shift colors with time-of-day.
        _applyDynamicSky(widget, 'ambient', 0);
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
                renderWeatherWidget();
                updateGreetingWeather();
                startWeatherAutoRefresh();
            }
        } catch (e) {
            console.error('Widget city search failed:', e);
            showCustomMessage('❌ Fehler', 'Stadt-Suche fehlgeschlagen.', 'error');
        }
    }

    // ═══ SKY ENGINE — continuous time-of-day color shift + wind dynamics ═══
    // Linear color math (rgb-space — perceptually rough but visually fine for sky gradients).
    function _hex2rgb(h)  { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
    function _rgb2hex(r,g,b) {
        const n = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2,'0');
        return '#' + n(r) + n(g) + n(b);
    }
    function _lerp(a, b, t) { return a + (b - a) * t; }
    function _smoothstep(e0, e1, x) { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
    function _lerpHex(c1, c2, t) {
        const a = _hex2rgb(c1), b = _hex2rgb(c2);
        return _rgb2hex(_lerp(a[0],b[0],t), _lerp(a[1],b[1],t), _lerp(a[2],b[2],t));
    }
    function _lerpRgba(c1, c2, t) {
        const m1 = /rgba?\(([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\)/.exec(c1);
        const m2 = /rgba?\(([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\)/.exec(c2);
        if (!m1 || !m2) return c1;
        const a1 = m1[4] !== undefined ? +m1[4] : 1;
        const a2 = m2[4] !== undefined ? +m2[4] : 1;
        return `rgba(${Math.round(_lerp(+m1[1],+m2[1],t))},${Math.round(_lerp(+m1[2],+m2[2],t))},${Math.round(_lerp(+m1[3],+m2[3],t))},${_lerp(a1,a2,t).toFixed(3)})`;
    }
    function _blendPalette(p1, p2, t) {
        return { sky1: _lerpHex(p1.sky1, p2.sky1, t), sky2: _lerpHex(p1.sky2, p2.sky2, t), sky3: _lerpHex(p1.sky3, p2.sky3, t), tint: _lerpRgba(p1.tint, p2.tint, t) };
    }

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

    // Palette presets — anchored to named moments. Tuned for cinematic but readable.
    const _P = (s1, s2, s3, t) => ({ sky1: s1, sky2: s2, sky3: s3, tint: t });
    const PAL = {
        deepNight:    _P('#050614', '#0c0e26', '#1a1535', 'rgba(168,85,247,0.10)'),
        preDawn:      _P('#1a1d3d', '#3a2f5e', '#5e3d6e', 'rgba(255,170,140,0.15)'),
        sunrise:      _P('#2e2855', '#9a5870', '#e89870', 'rgba(255,180,100,0.32)'),
        morningGlow:  _P('#3a5a90', '#7a9bcc', '#f0c890', 'rgba(255,200,140,0.22)'),
        morning:      _P('#2a5a9a', '#5e9bd6', '#b8d8f0', 'rgba(255,200,100,0.16)'),
        midday:       _P('#1d558e', '#4a90d4', '#a8c8e4', 'rgba(255,210,120,0.12)'),
        afternoon:    _P('#2a5a9a', '#6094c8', '#c0d4e8', 'rgba(255,190,110,0.16)'),
        goldenHour:   _P('#3a4a80', '#a06e5e', '#f0b070', 'rgba(255,160,80,0.28)'),
        sunset:       _P('#2a2050', '#8a4660', '#e87060', 'rgba(255,130,80,0.35)'),
        dusk:         _P('#160e30', '#4a2660', '#7a4080', 'rgba(200,100,180,0.22)'),
        earlyEvening: _P('#0a0c24', '#1c1a44', '#2e2056', 'rgba(150,120,200,0.15)'),
        cloudyDay:    _P('#353d4e', '#525b70', '#6e7892', 'rgba(180,180,200,0.08)'),
        cloudyNight:  _P('#1a1d28', '#252a38', '#3a4054', 'rgba(180,180,200,0.06)'),
        rainDay:      _P('#1c2230', '#2d3548', '#424d65', 'rgba(120,150,200,0.10)'),
        rainNight:    _P('#0a0e1a', '#161c2a', '#2a3548', 'rgba(120,150,200,0.08)'),
        rainTwilight: _P('#251e3e', '#3d2e48', '#553e58', 'rgba(180,120,150,0.14)'),
        stormDay:     _P('#0a0d18', '#1a2030', '#2a3248', 'rgba(120,130,200,0.10)'),
        stormNight:   _P('#06080e', '#0e1322', '#1a2238', 'rgba(120,130,200,0.06)'),
        snowDay:      _P('#3a4258', '#566078', '#8090a8', 'rgba(220,230,245,0.10)'),
        snowNight:    _P('#1a2030', '#2a3548', '#445870', 'rgba(220,230,245,0.06)'),
        snowDawn:     _P('#3a3548', '#6a5670', '#a08090', 'rgba(255,200,180,0.18)'),
        fogDay:       _P('#353a48', '#4c525e', '#6a7080', 'rgba(180,190,210,0.10)'),
        fogNight:     _P('#1a1d24', '#252a32', '#3a3e48', 'rgba(180,190,210,0.06)'),
        ambientNight: _P('#0a0c1c', '#1a1d35', '#2d2547', 'rgba(168,85,247,0.18)'),
        ambientDay:   _P('#2a3050', '#4a4870', '#6a5890', 'rgba(168,85,247,0.12)'),
        ambientDusk:  _P('#1a1830', '#3a2850', '#5a3060', 'rgba(220,120,200,0.20)')
    };

    // Anchor schedule per condition — list of {t (minutes-of-day), p (palette)}.
    function _conditionAnchors(condition) {
        const { sunrise: R, sunset: S, noon: N } = _sunTimes();
        const c = condition || 'ambient';
        // Clear and partly-cloudy get the dramatic full cycle. Particles handle "partly" feel via clouds.
        if (c === 'clear-day' || c === 'clear-night' || c === 'partly-day' || c === 'partly-night') {
            return [
                { t: 0,         p: PAL.deepNight },
                { t: R - 70,    p: PAL.deepNight },
                { t: R - 30,    p: PAL.preDawn },
                { t: R,         p: PAL.sunrise },
                { t: R + 45,    p: PAL.morningGlow },
                { t: R + 120,   p: PAL.morning },
                { t: N - 60,    p: PAL.midday },
                { t: N + 60,    p: PAL.midday },
                { t: S - 90,    p: PAL.afternoon },
                { t: S - 25,    p: PAL.goldenHour },
                { t: S + 5,     p: PAL.sunset },
                { t: S + 40,    p: PAL.dusk },
                { t: S + 100,   p: PAL.earlyEvening },
                { t: 24 * 60,   p: PAL.deepNight }
            ];
        }
        if (c === 'cloudy') return [
            { t: 0, p: PAL.cloudyNight }, { t: R - 30, p: PAL.cloudyNight },
            { t: R + 90, p: PAL.cloudyDay }, { t: S - 90, p: PAL.cloudyDay },
            { t: S + 30, p: PAL.cloudyNight }, { t: 24*60, p: PAL.cloudyNight }
        ];
        if (c === 'rain') return [
            { t: 0, p: PAL.rainNight }, { t: R - 30, p: PAL.rainNight },
            { t: R + 30, p: PAL.rainTwilight }, { t: R + 120, p: PAL.rainDay },
            { t: S - 120, p: PAL.rainDay }, { t: S - 30, p: PAL.rainTwilight },
            { t: S + 60, p: PAL.rainNight }, { t: 24*60, p: PAL.rainNight }
        ];
        if (c === 'storm') return [
            { t: 0, p: PAL.stormNight }, { t: R + 60, p: PAL.stormDay },
            { t: S - 60, p: PAL.stormDay }, { t: S + 60, p: PAL.stormNight },
            { t: 24*60, p: PAL.stormNight }
        ];
        if (c === 'snow') return [
            { t: 0, p: PAL.snowNight }, { t: R - 30, p: PAL.snowNight },
            { t: R + 30, p: PAL.snowDawn }, { t: R + 120, p: PAL.snowDay },
            { t: S - 120, p: PAL.snowDay }, { t: S - 30, p: PAL.snowDawn },
            { t: S + 60, p: PAL.snowNight }, { t: 24*60, p: PAL.snowNight }
        ];
        if (c === 'fog') return [
            { t: 0, p: PAL.fogNight }, { t: R + 60, p: PAL.fogDay },
            { t: S - 60, p: PAL.fogDay }, { t: S + 60, p: PAL.fogNight },
            { t: 24*60, p: PAL.fogNight }
        ];
        // ambient
        return [
            { t: 0, p: PAL.ambientNight }, { t: R - 30, p: PAL.ambientNight },
            { t: R + 60, p: PAL.ambientDay }, { t: S - 60, p: PAL.ambientDay },
            { t: S + 30, p: PAL.ambientDusk }, { t: S + 120, p: PAL.ambientNight },
            { t: 24*60, p: PAL.ambientNight }
        ];
    }

    function _getSkyPalette(condition) {
        const minute = _nowMinutes();
        const anchors = _conditionAnchors(condition);
        let prev = anchors[0], next = anchors[anchors.length - 1];
        for (let i = 0; i < anchors.length - 1; i++) {
            if (minute >= anchors[i].t && minute <= anchors[i + 1].t) { prev = anchors[i]; next = anchors[i + 1]; break; }
        }
        const span = Math.max(1, next.t - prev.t);
        const t = _smoothstep(0, 1, (minute - prev.t) / span);
        return _blendPalette(prev.p, next.p, t);
    }

    // Sun and moon opacity — fade across sunrise/sunset windows, capped per condition visibility.
    // Even on cloudy/rain/snow nights the moon and stars stay visible (clouds drift in front);
    // they only fully hide under heavy storm / dense fog. Sun stays mostly hidden in bad weather.
    function _getSunMoonOpacity(condition) {
        const { sunrise: R, sunset: S } = _sunTimes();
        const m = _nowMinutes();
        const sunRaw  = _smoothstep(R - 25, R + 25, m) * (1 - _smoothstep(S - 25, S + 25, m));
        let moonRaw   = _smoothstep(S - 40, S + 30, m) + (1 - _smoothstep(R - 30, R + 20, m));
        moonRaw = Math.min(1, moonRaw);
        let sunCap = 0, moonCap = 0;
        if (condition === 'clear-day' || condition === 'clear-night') { sunCap = 1;    moonCap = 1; }
        else if (condition === 'partly-day' || condition === 'partly-night') { sunCap = 0.75; moonCap = 0.9; }
        else if (condition === 'cloudy')  { sunCap = 0.30; moonCap = 0.85; }
        else if (condition === 'rain')    { sunCap = 0.15; moonCap = 0.60; }
        else if (condition === 'storm')   { sunCap = 0;    moonCap = 0.40; }
        else if (condition === 'snow')    { sunCap = 0.30; moonCap = 0.75; }
        else if (condition === 'fog')     { sunCap = 0.35; moonCap = 0.55; }
        else if (condition === 'ambient') { sunCap = 0;    moonCap = 0.70; }
        return { sun: +(sunRaw * sunCap).toFixed(3), moon: +(moonRaw * moonCap).toFixed(3) };
    }

    // Pure time-of-day "is it night" opacity. Independent of weather condition —
    // used for things that should glow at night regardless of clouds (cottage lights, fireflies).
    function _getNightOpacity() {
        const { sunrise: R, sunset: S } = _sunTimes();
        const m = _nowMinutes();
        const night = _smoothstep(S - 60, S + 20, m) + (1 - _smoothstep(R - 20, R + 60, m));
        return +Math.min(1, night).toFixed(3);
    }

    // Wind → cloud drift duration. Calm = slow drift, gale = sprint.
    function _windToCloudDurs(windKmh) {
        const w = Math.max(0, Math.min(80, windKmh || 0));
        const base = Math.max(15, 120 - w * 1.6);   // 120s at 0 km/h → 15s clamp at ≥66 km/h
        return { a: base.toFixed(0) + 's', b: (base * 1.35).toFixed(0) + 's', c: (base * 0.72).toFixed(0) + 's' };
    }
    function _windToRainSkew(windKmh) {
        const w = Math.max(0, windKmh || 0);
        return Math.max(-38, Math.min(-6, -6 - w * 0.55)).toFixed(1) + 'deg';
    }
    function _windToRainDrift(windKmh) {
        const w = Math.max(0, windKmh || 0);
        return Math.max(-90, Math.min(-6, -6 - w * 1.4)).toFixed(0) + 'px';
    }
    // No wind = no sway (trees stay still). Above ~5 km/h, ramp up to 7° at gale-strength wind.
    function _windToTreeSway(windKmh) {
        const w = Math.max(0, Math.min(60, windKmh || 0));
        if (w < 5) return '0deg';
        return (((w - 5) / 55) * 7).toFixed(2) + 'deg';
    }

    // Apply all dynamic CSS variables. Called on data refresh AND on the 5-min sky-tick.
    function _applyDynamicSky(widget, condition, windKmh) {
        const palette = _getSkyPalette(condition);
        const opac    = _getSunMoonOpacity(condition);
        const dur     = _windToCloudDurs(windKmh);
        widget.style.setProperty('--sky-1', palette.sky1);
        widget.style.setProperty('--sky-2', palette.sky2);
        widget.style.setProperty('--sky-3', palette.sky3);
        widget.style.setProperty('--tint',  palette.tint);
        widget.style.setProperty('--sun-op', opac.sun);
        widget.style.setProperty('--moon-op', opac.moon);
        widget.style.setProperty('--night-op', _getNightOpacity());
        widget.style.setProperty('--cloud-dur-a', dur.a);
        widget.style.setProperty('--cloud-dur-b', dur.b);
        widget.style.setProperty('--cloud-dur-c', dur.c);
        widget.style.setProperty('--rain-skew', _windToRainSkew(windKmh));
        widget.style.setProperty('--rain-drift', _windToRainDrift(windKmh));
        widget.style.setProperty('--tree-sway', _windToTreeSway(windKmh));
        // Tornado only when it's actually stormy AND properly windy (≥40 km/h).
        // Below that threshold a tornado is physically wrong even during a thunderstorm.
        const tornadoActive = (condition === 'storm' && (windKmh || 0) >= 40) ? '1' : '0';
        widget.dataset.tornado = tornadoActive;
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
        storm:     () => _demoApply('storm',       18, 16, 1080,  'Gewitter (Lightning, kein Tornado)'),
        tornado:   () => _demoApply('storm',       55, 16, 1080,  'TORNADO! (Storm + 55 km/h Wind)'),
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
                '  weatherDemo.storm()       Gewitter mit Lightning\n' +
                '  weatherDemo.tornado()     ⚠️ TORNADO (Storm + 55 km/h)\n' +
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
            _applyDynamicSky(widget, cond, wind);
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
    function updateWeatherUI()            { renderWeatherWidget(); }
    function updateWeatherUINoLocation()  { renderWeatherWidget(); }
    function weatherShowCityInput()       { openWeatherModal(); /* widget empty-state has the input */ }

    // Legacy global — kept as a thin wrapper. The widget's own input/button calls `_widgetSearchCity` directly.
    async function weatherSearchCity() {
        const input = document.querySelector('#weatherModal [data-act="city-input"]');
        if (input && input.value) return _widgetSearchCity(input.value);
    }

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
                    <span class="weather-icon">${weatherIcon}</span>
                    ${weatherTemp ? `<span class="weather-temp">${weatherTemp}</span>` : ''}
                </span>
                ${greetText}, ${esc(data.settings.name)}
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
        if (widget) widget.classList.remove('is-paused');
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
        if (widget) widget.classList.add('is-paused');
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
