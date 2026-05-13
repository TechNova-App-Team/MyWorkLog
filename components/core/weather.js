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
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBerlin&forecast_days=6`;
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

    function updateWeatherUI() {
        if (!weatherData || !weatherData.current) return;

        const hour = new Date().getHours();
        const isNight = hour < 6 || hour >= 21;
        const currentWeather = getWeatherIcon(weatherData.current.weather_code, isNight);
        
        // Update modal header
        document.getElementById('weatherHeaderIcon').textContent = currentWeather.icon;
        document.getElementById('weatherLocation').textContent = weatherData.cityName || 'Dein Standort';
        document.getElementById('weatherDate').textContent = new Date().toLocaleDateString('de-DE', { 
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        });

        // Build weather content
        const temp = Math.round(weatherData.current.temperature_2m);
        const feelsLike = Math.round(weatherData.current.apparent_temperature);
        const humidity = weatherData.current.relative_humidity_2m;
        const windSpeed = Math.round(weatherData.current.wind_speed_10m);

        // Build forecast HTML
        const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        let forecastHtml = '';
        for (let i = 1; i <= 5 && i < weatherData.daily.time.length; i++) {
            const date = new Date(weatherData.daily.time[i]);
            const dayName = dayNames[date.getDay()];
            const dayWeather = getWeatherIcon(weatherData.daily.weather_code[i]);
            const maxTemp = Math.round(weatherData.daily.temperature_2m_max[i]);
            const minTemp = Math.round(weatherData.daily.temperature_2m_min[i]);
            
            forecastHtml += `
                <div class="weather-forecast-day">
                    <div class="weather-forecast-day-name">${dayName}</div>
                    <div class="weather-forecast-day-icon">${dayWeather.icon}</div>
                    <div class="weather-forecast-day-temp">${maxTemp}°</div>
                    <div class="weather-forecast-day-low">${minTemp}°</div>
                </div>
            `;
        }

        document.getElementById('weatherContent').innerHTML = `
            <div class="weather-current">
                <div class="weather-current-icon">${currentWeather.icon}</div>
                <div class="weather-current-temp">${temp}°C</div>
                <div class="weather-current-desc">${currentWeather.desc}</div>
            </div>
            <div class="weather-details">
                <div class="weather-detail-item">
                    <div class="weather-detail-icon">🌡️</div>
                    <div class="weather-detail-value">${feelsLike}°C</div>
                    <div class="weather-detail-label">Gefühlt</div>
                </div>
                <div class="weather-detail-item">
                    <div class="weather-detail-icon">💧</div>
                    <div class="weather-detail-value">${humidity}%</div>
                    <div class="weather-detail-label">Luftfeuchtigkeit</div>
                </div>
                <div class="weather-detail-item">
                    <div class="weather-detail-icon">💨</div>
                    <div class="weather-detail-value">${windSpeed} km/h</div>
                    <div class="weather-detail-label">Wind</div>
                </div>
            </div>
            <div class="weather-forecast">
                <div class="weather-forecast-title">5-Tage Vorhersage</div>
                <div class="weather-forecast-grid">
                    ${forecastHtml}
                </div>
            </div>
            <div style="margin-top:20px; text-align:center;">
                <button onclick="weatherShowCityInput('Wähle eine andere Stadt:')" style="padding:10px 16px; background:linear-gradient(135deg,#8b5cf6,#7c3aed); border:none; color:#fff; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.85rem; white-space:nowrap;">
                    📍 Stadt ändern
                </button>
            </div>
        `;
    }

    function updateWeatherUINoLocation() {
        document.getElementById('weatherContent').innerHTML = `
            <div class="weather-location-setup">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📍</div>
                <h3 style="color: var(--text-main); margin: 0 0 0.5rem 0;">Standort benötigt</h3>
                <p style="color: var(--text-muted); margin: 0 0 1rem 0; font-size: 0.9rem;">
                    Um das aktuelle Wetter anzuzeigen, benötigen wir deinen Standort.
                    Deine Daten werden nur lokal gespeichert.
                </p>
                <button class="weather-location-btn" onclick="requestLocationPermission()">
                    📍 Standort freigeben
                </button>
                <div style="margin-top: 0.75rem; display:flex; align-items:center; gap:8px; color:var(--text-muted); font-size:0.78rem;">
                    <span>──────</span><span>oder</span><span>──────</span>
                </div>
                <div style="margin-top: 0.75rem; display:flex; gap:8px;">
                    <input id="weatherCityInput" type="text" placeholder="z.B. Berlin, München, Wien..." 
                        style="flex:1; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:var(--text-main); font-size:0.85rem; outline:none;" 
                        onkeydown="if(event.key==='Enter') weatherSearchCity()" />
                    <button onclick="weatherSearchCity()" style="padding:10px 16px; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; color:#fff; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.85rem; white-space:nowrap;">🔍 Suchen</button>
                </div>
            </div>
        `;
    }

    // === MANUELLER STADT-FALLBACK ===
    function weatherShowCityInput(message) {
        document.getElementById('weatherContent').innerHTML = `
            <div class="weather-location-setup">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🏙️</div>
                <h3 style="color: var(--text-main); margin: 0 0 0.5rem 0;">Stadt eingeben</h3>
                <p style="color: var(--text-muted); margin: 0 0 1rem 0; font-size: 0.85rem;">${message || 'Gib deine Stadt ein um das Wetter zu sehen:'}</p>
                <div style="display:flex; gap:8px;">
                    <input id="weatherCityInput" type="text" placeholder="z.B. Berlin, München, Wien..." 
                        style="flex:1; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:var(--text-main); font-size:0.85rem; outline:none;" 
                        onkeydown="if(event.key==='Enter') weatherSearchCity()" autofocus />
                    <button onclick="weatherSearchCity()" style="padding:10px 16px; background:linear-gradient(135deg,#3b82f6,#2563eb); border:none; color:#fff; border-radius:10px; font-weight:600; cursor:pointer; font-size:0.85rem; white-space:nowrap;">🔍 Suchen</button>
                </div>
                <button onclick="requestLocationPermission()" style="margin-top:0.75rem; width:100%; padding:8px; background:transparent; border:1px solid rgba(255,255,255,0.1); color:var(--text-muted); border-radius:10px; cursor:pointer; font-size:0.8rem;">📍 Nochmal automatisch versuchen</button>
            </div>
        `;
        setTimeout(() => document.getElementById('weatherCityInput')?.focus(), 100);
    }

    async function weatherSearchCity() {
        const input = document.getElementById('weatherCityInput');
        if (!input) return;
        const city = input.value.trim();
        if (!city) {
            showCustomMessage('⚠️ Bitte Stadt eingeben', 'Gib eine Stadt ein, z.B. "Berlin" oder "München"', 'warning');
            return;
        }

        input.disabled = true;
        input.style.opacity = '0.5';

        try {
            // Nominatim Geocoding: Stadt → Koordinaten
            const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=de`;
            const geoRes = await fetch(geoUrl);
            const geoData = await geoRes.json();

            if (!geoData || geoData.length === 0) {
                showCustomMessage('❌ Stadt nicht gefunden', `"${city}" konnte nicht gefunden werden. Prüfe die Schreibweise.`, 'error');
                input.disabled = false;
                input.style.opacity = '1';
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
                startWeatherAutoRefresh(); // Starte Auto-Refresh für neue Stadt
                showCustomMessage('✅ Wetter aktiviert', `Standort: ${cityName}`, 'success');
            }
        } catch (e) {
            console.error('Stadt-Suche fehlgeschlagen:', e);
            showCustomMessage('❌ Fehler', 'Stadt-Suche fehlgeschlagen. Prüfe deine Internetverbindung.', 'error');
            input.disabled = false;
            input.style.opacity = '1';
        }
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
        document.getElementById('weatherModal').classList.add('active');
        if (!weatherData) {
            updateWeatherUINoLocation();
        } else {
            updateWeatherUI();
        }
    }

    function closeWeatherModal() {
        document.getElementById('weatherModal').classList.remove('active');
    }

    // Initialize weather on load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            getLocationAndWeather();
            startWeatherAutoRefresh(); // Starte Auto-Refresh alle 30 Min
        }, 1000); // Delayed to prioritize UI loading
    });
